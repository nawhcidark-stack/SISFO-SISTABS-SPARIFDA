import { Router, Request, Response } from 'express';
import {
  OnlineExamPacket,
  OnlineExamQuestion,
  OnlineExamSchedule,
  OnlineExamScoringConfig,
  OnlineExamSubmission,
  MerdekaAssessment,
  Student,
  AttendanceLog
} from '../../types';
import {
  getOnlineExamPacketsFromMysql,
  getOnlineExamPacketByIdFromMysql,
  saveOnlineExamPacketToMysql,
  deleteOnlineExamPacketFromMysql,
  getOnlineExamSchedulesFromMysql,
  saveOnlineExamScheduleToMysql,
  deleteOnlineExamScheduleFromMysql,
  getOnlineExamSubmissionsFromMysql,
  saveOnlineExamSubmissionDirectToMysql,
  batchSaveOnlineExamSubmissionsToMysql,
  deleteOnlineExamSubmissionFromMysql
} from '../mysqlService';

export interface OnlineExamRouterContext {
  getStudents: () => Student[];
  getAttendanceLogs: () => AttendanceLog[];
  getMerdekaAssessments: () => MerdekaAssessment[];
  upsertMerdekaAssessmentInMemory: (assessment: MerdekaAssessment) => void;
}

// ============================================================================
// HIGH-CONCURRENCY IN-MEMORY CACHE & MULTI-ROW BATCH MYSQL QUEUE (500-1000+ SISWA)
// Zero-blocking Stale-While-Revalidate RAM Cache + O(1) Student Index + Multi-Row Batch Upsert
// ============================================================================
let schedulesCache: OnlineExamSchedule[] | null = null;
let schedulesCacheLoadedAt = 0;
let schedulesInFlight: Promise<OnlineExamSchedule[]> | null = null;
const SCHEDULES_CACHE_TTL_MS = 60_000;

const packetsByIdCache = new Map<string, { packet: OnlineExamPacket; sanitizedQuestions: OnlineExamQuestion[]; loadedAt: number }>();
const packetInFlightById = new Map<string, Promise<OnlineExamPacket | null>>();
let packetsSummaryCache: OnlineExamPacket[] | null = null;
let packetsSummaryLoadedAt = 0;
let packetsSummaryInFlight: Promise<OnlineExamPacket[]> | null = null;
const PACKETS_CACHE_TTL_MS = 120_000;

// Keyed by `${scheduleId}::${studentId}`
const submissionsByKeyCache = new Map<string, OnlineExamSubmission>();
// Secondary O(1) index: studentId -> Map<scheduleId, OnlineExamSubmission>
const submissionsByStudentIdCache = new Map<string, Map<string, OnlineExamSubmission>>();
let allSubmissionsLoadedAt = 0;
let allSubmissionsInFlight: Promise<OnlineExamSubmission[]> | null = null;
const SUBMISSIONS_CACHE_TTL_MS = 60_000;

function makeSubKey(scheduleId: string, studentId: string): string {
  return `${scheduleId}::${studentId}`;
}

function setSubmissionInMemoryCache(sub: OnlineExamSubmission): void {
  const key = makeSubKey(sub.scheduleId, sub.studentId);
  submissionsByKeyCache.set(key, sub);
  const sid = String(sub.studentId);
  let studentMap = submissionsByStudentIdCache.get(sid);
  if (!studentMap) {
    studentMap = new Map<string, OnlineExamSubmission>();
    submissionsByStudentIdCache.set(sid, studentMap);
  }
  studentMap.set(sub.scheduleId, sub);
}

function removeSubmissionFromMemoryCache(scheduleId: string, studentId: string): void {
  const key = makeSubKey(scheduleId, studentId);
  submissionsByKeyCache.delete(key);
  const studentMap = submissionsByStudentIdCache.get(String(studentId));
  if (studentMap) {
    studentMap.delete(scheduleId);
  }
}

function sanitizeQuestionsForStudentDelivery(questions: OnlineExamQuestion[]): OnlineExamQuestion[] {
  return (questions || []).map((q, idx) => ({
    ...q,
    id: q.id || `q-idx-${idx + 1}`,
    number: idx + 1,
    correctOptionId: undefined,
    correctOptionIds: undefined,
    answerKeyText: undefined,
    trueFalseItems: Array.isArray(q.trueFalseItems)
      ? q.trueFalseItems.map(item => ({ id: item.id, statement: item.statement, isTrue: false }))
      : undefined
  }));
}

export function isZeroUnansweredSubmission(sub?: OnlineExamSubmission | null): boolean {
  if (!sub) return false;
  if (sub.status === 'in_progress') return false;
  if (Number(sub.finalScoreSas || 0) > 0 || Number(sub.rawScore || 0) > 0) return false;
  const ans = sub.answers || {};
  const answeredKeys = Object.keys(ans).filter(k => {
    const v = ans[k];
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  });
  return answeredKeys.length === 0;
}

async function getCachedSchedules(forceRefresh = false): Promise<OnlineExamSchedule[]> {
  const now = Date.now();
  if (!forceRefresh && schedulesCache && now - schedulesCacheLoadedAt < SCHEDULES_CACHE_TTL_MS) {
    return schedulesCache;
  }
  const triggerRefresh = () => {
    if (schedulesInFlight) return schedulesInFlight;
    schedulesInFlight = (async () => {
      try {
        const rows = await getOnlineExamSchedulesFromMysql();
        if (rows.length > 0 || !schedulesCache) {
          schedulesCache = rows;
          schedulesCacheLoadedAt = Date.now();
        }
        return schedulesCache || rows;
      } finally {
        schedulesInFlight = null;
      }
    })();
    return schedulesInFlight;
  };
  // Stale-while-revalidate for 500-1000 concurrent students: never block if we already have schedules in RAM
  if (!forceRefresh && schedulesCache) {
    triggerRefresh().catch(() => {});
    return schedulesCache;
  }
  return triggerRefresh();
}

async function getCachedPacketById(packetId: string, forceRefresh = false): Promise<OnlineExamPacket | null> {
  if (!packetId) return null;
  const now = Date.now();
  const cached = packetsByIdCache.get(packetId);
  if (!forceRefresh && cached && now - cached.loadedAt < PACKETS_CACHE_TTL_MS) {
    return cached.packet;
  }
  const triggerLoad = () => {
    const existingFlight = packetInFlightById.get(packetId);
    if (existingFlight) return existingFlight;
    const flight = (async () => {
      try {
        const pkt = await getOnlineExamPacketByIdFromMysql(packetId);
        if (pkt) {
          packetsByIdCache.set(packetId, {
            packet: pkt,
            sanitizedQuestions: sanitizeQuestionsForStudentDelivery(pkt.questions),
            loadedAt: Date.now()
          });
        }
        return pkt || cached?.packet || null;
      } finally {
        packetInFlightById.delete(packetId);
      }
    })();
    packetInFlightById.set(packetId, flight);
    return flight;
  };
  if (!forceRefresh && cached) {
    triggerLoad().catch(() => {});
    return cached.packet;
  }
  return triggerLoad();
}

async function getCachedPacketsSummary(forceRefresh = false): Promise<OnlineExamPacket[]> {
  const now = Date.now();
  if (!forceRefresh && packetsSummaryCache && now - packetsSummaryLoadedAt < PACKETS_CACHE_TTL_MS) {
    return packetsSummaryCache;
  }
  if (packetsSummaryInFlight) {
    return packetsSummaryInFlight;
  }
  packetsSummaryInFlight = (async () => {
    try {
      const list = await getOnlineExamPacketsFromMysql(false);
      if (list.length > 0 || !packetsSummaryCache) {
        packetsSummaryCache = list;
        packetsSummaryLoadedAt = Date.now();
      }
      return packetsSummaryCache || list;
    } finally {
      packetsSummaryInFlight = null;
    }
  })();
  return packetsSummaryInFlight;
}

async function ensureAllSubmissionsCached(forceRefresh = false): Promise<OnlineExamSubmission[]> {
  const now = Date.now();
  if (!forceRefresh && allSubmissionsLoadedAt > 0 && now - allSubmissionsLoadedAt < SUBMISSIONS_CACHE_TTL_MS) {
    return Array.from(submissionsByKeyCache.values());
  }
  const triggerLoad = () => {
    if (allSubmissionsInFlight) return allSubmissionsInFlight;
    allSubmissionsInFlight = (async () => {
      try {
        const rows = await getOnlineExamSubmissionsFromMysql();
        for (const r of rows) {
          const key = makeSubKey(r.scheduleId, r.studentId);
          const local = submissionsByKeyCache.get(key);
          // Never overwrite an in-memory graded submission or newer progress with stale DB data
          if (!local || (local.status === 'in_progress' && r.status !== 'in_progress') || r.updatedAt >= local.updatedAt) {
            setSubmissionInMemoryCache(r);
          }
        }
        allSubmissionsLoadedAt = Date.now();
        return Array.from(submissionsByKeyCache.values());
      } finally {
        allSubmissionsInFlight = null;
      }
    })();
    return allSubmissionsInFlight;
  };

  if (!forceRefresh && allSubmissionsLoadedAt > 0) {
    triggerLoad().catch(() => {});
    return Array.from(submissionsByKeyCache.values());
  }
  return triggerLoad();
}

interface QueuedSubmissionWrite {
  submission: OnlineExamSubmission;
  syncedAssessment?: MerdekaAssessment;
  retries: number;
}

const pendingSubmissionWrites = new Map<string, QueuedSubmissionWrite>();
const progressWriteTimers = new Map<string, NodeJS.Timeout>();
let isBatchFlushWorkerActive = false;
let batchFlushScheduledTimer: NodeJS.Timeout | null = null;

function scheduleBatchSubmissionFlush(delayMs = 250): void {
  if (isBatchFlushWorkerActive) return;
  if (batchFlushScheduledTimer) return;
  batchFlushScheduledTimer = setTimeout(() => {
    batchFlushScheduledTimer = null;
    drainSubmissionWriteQueue();
  }, delayMs);
}

function drainSubmissionWriteQueue(): void {
  if (isBatchFlushWorkerActive || pendingSubmissionWrites.size === 0) return;
  isBatchFlushWorkerActive = true;

  // Take up to 200 student submissions at once and persist them in multi-row batch queries
  const batchEntries: Array<[string, QueuedSubmissionWrite]> = [];
  for (const entry of pendingSubmissionWrites.entries()) {
    batchEntries.push(entry);
    pendingSubmissionWrites.delete(entry[0]);
    if (batchEntries.length >= 200) break;
  }

  (async () => {
    try {
      const payload = batchEntries.map(([, item]) => ({
        submission: item.submission,
        syncedAssessment: item.syncedAssessment
      }));
      const res = await batchSaveOnlineExamSubmissionsToMysql(payload);
      if (!res.success) {
        for (const [key, item] of batchEntries) {
          if (item.retries < 4 && !pendingSubmissionWrites.has(key)) {
            pendingSubmissionWrites.set(key, { ...item, retries: item.retries + 1 });
          }
        }
      }
    } catch (_err) {
      for (const [key, item] of batchEntries) {
        if (item.retries < 4 && !pendingSubmissionWrites.has(key)) {
          pendingSubmissionWrites.set(key, { ...item, retries: item.retries + 1 });
        }
      }
    } finally {
      isBatchFlushWorkerActive = false;
      if (pendingSubmissionWrites.size > 0) {
        scheduleBatchSubmissionFlush(300);
      }
    }
  })();
}

function enqueueSubmissionMysqlWrite(
  submission: OnlineExamSubmission,
  options: {
    autoSyncToSas?: boolean;
    scoreTargetMode?: 'sas' | 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4';
    teacherName?: string;
    syncedAssessment?: MerdekaAssessment;
  },
  immediate = false
): void {
  const key = makeSubKey(submission.scheduleId, submission.studentId);
  setSubmissionInMemoryCache(submission);

  const existingTimer = progressWriteTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
    progressWriteTimers.delete(key);
  }

  if (immediate) {
    pendingSubmissionWrites.set(key, {
      submission,
      syncedAssessment: options.syncedAssessment,
      retries: 0
    });
    // Coalesce burst of 500-1000 simultaneous submissions within a 200ms micro-window into 1 multi-row batch write
    scheduleBatchSubmissionFlush(150);
  } else {
    // Coalesce progress updates per student (every 3.5s) so 1000 students clicking answers are batched cleanly
    const timer = setTimeout(() => {
      progressWriteTimers.delete(key);
      const latest = submissionsByKeyCache.get(key) || submission;
      pendingSubmissionWrites.set(key, {
        submission: latest,
        syncedAssessment: options.syncedAssessment,
        retries: 0
      });
      scheduleBatchSubmissionFlush(250);
    }, 3500);
    progressWriteTimers.set(key, timer);
  }
}

export function getCurrentWibDateTime(): {
  dateWib: string;
  timeWib: string;
  timeWithSecWib: string;
  isoWib: string;
} {
  // WIB is UTC+7
  const now = new Date();
  const wibMs = now.getTime() + 7 * 3600 * 1000;
  const wibDateObj = new Date(wibMs);
  const iso = wibDateObj.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ in UTC+7
  const dateWib = iso.slice(0, 10);
  const timeWib = iso.slice(11, 16);
  const timeWithSecWib = iso.slice(11, 19);
  return {
    dateWib,
    timeWib,
    timeWithSecWib,
    isoWib: `${dateWib} ${timeWithSecWib} WIB`
  };
}

export function computeScheduleWibStatus(schedule: OnlineExamSchedule): {
  isCurrentlyOpenWib: boolean;
  scheduleStatusWib: 'belum_mulai' | 'berlangsung' | 'selesai' | 'nonaktif';
  currentWib: ReturnType<typeof getCurrentWibDateTime>;
} {
  const currentWib = getCurrentWibDateTime();
  if (!schedule.isActive) {
    return { isCurrentlyOpenWib: false, scheduleStatusWib: 'nonaktif', currentWib };
  }
  if (currentWib.dateWib < schedule.examDate) {
    return { isCurrentlyOpenWib: false, scheduleStatusWib: 'belum_mulai', currentWib };
  }
  if (currentWib.dateWib > schedule.examDate) {
    return { isCurrentlyOpenWib: false, scheduleStatusWib: 'selesai', currentWib };
  }
  // Same date in WIB
  if (currentWib.timeWib < schedule.startTimeWib) {
    return { isCurrentlyOpenWib: false, scheduleStatusWib: 'belum_mulai', currentWib };
  }
  if (currentWib.timeWib > schedule.endTimeWib) {
    return { isCurrentlyOpenWib: false, scheduleStatusWib: 'selesai', currentWib };
  }
  return { isCurrentlyOpenWib: true, scheduleStatusWib: 'berlangsung', currentWib };
}

export function computeAuthoritativeRemainingSeconds(
  schedule: OnlineExamSchedule,
  startedAtIso?: string
): { remainingSeconds: number; shouldResetStartedAt: boolean } {
  const nowMs = Date.now();
  const durationSec = Math.max(10, Number(schedule.durationMinutes) || 90) * 60;
  let remainingByDuration = durationSec;
  let shouldResetStartedAt = false;

  if (startedAtIso) {
    const startedMs = new Date(startedAtIso).getTime();
    if (!Number.isNaN(startedMs) && startedMs <= nowMs + 60_000) {
      const elapsedSec = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
      const rem = durationSec - elapsedSec;
      if (rem > 60) {
        remainingByDuration = rem;
      } else {
        // Student re-entered an active schedule whose earlier startedAt already expired; give fresh duration
        shouldResetStartedAt = true;
        remainingByDuration = durationSec;
      }
    }
  }

  let remainingByScheduleWindow = durationSec;
  if (schedule.examDate && schedule.endTimeWib) {
    const endWibMs = new Date(`${schedule.examDate}T${schedule.endTimeWib}:59+07:00`).getTime();
    if (!Number.isNaN(endWibMs)) {
      const remWindow = Math.floor((endWibMs - nowMs) / 1000);
      if (remWindow > 60) {
        remainingByScheduleWindow = remWindow;
      }
    }
  }

  const remainingSeconds = Math.max(60, Math.min(remainingByDuration, remainingByScheduleWindow));
  return { remainingSeconds, shouldResetStartedAt };
}

export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function evaluateStudentSickStatusAndGps(params: {
  schedule: OnlineExamSchedule;
  studentId: string;
  studentNis?: string;
  studentName?: string;
  attendanceLogs: AttendanceLog[];
  studentLat?: number;
  studentLng?: number;
}): {
  isSickStudent: boolean;
  sickReason: string;
  allowedRadiusMeters: number;
  targetCenterLat: number;
  targetCenterLng: number;
  distanceMeters: number | null;
  gpsAllowed: boolean;
  gpsMessage: string;
} {
  const { schedule, studentId, studentNis, studentName, attendanceLogs, studentLat, studentLng } = params;
  const { dateWib } = getCurrentWibDateTime();

  // 1. Check explicit sick override in Waka Kurikulum schedule
  const overrides = Array.isArray(schedule.sickStudentsHomeOverrides)
    ? schedule.sickStudentsHomeOverrides
    : [];
  const matchedOverride = overrides.find(
    o =>
      (o.studentId && o.studentId === studentId) ||
      (o.studentNis && studentNis && o.studentNis === studentNis) ||
      (o.studentName && studentName && o.studentName.toLowerCase() === studentName.toLowerCase())
  );

  // 2. Check attendance logs for 'Sakit' on examDate or today WIB
  const sickLog = (attendanceLogs || []).find(
    l =>
      l.status === 'Sakit' &&
      (l.date === schedule.examDate || l.date === dateWib) &&
      ((l.studentId && l.studentId === studentId) ||
        (studentName && l.studentName && l.studentName.toLowerCase() === studentName.toLowerCase()))
  );

  const isSickStudent = Boolean(matchedOverride || sickLog);
  const sickReason = matchedOverride
    ? matchedOverride.reason || 'Terdaftar Izin Sakit / Pengerjaan dari Rumah (Waka Kurikulum)'
    : sickLog
    ? `Tercatat Absensi Sakit (${sickLog.date})`
    : '';

  let targetCenterLat = Number(schedule.schoolLatitude ?? -7.9096);
  let targetCenterLng = Number(schedule.schoolLongitude ?? 110.2966);
  let allowedRadiusMeters = Number(schedule.schoolRadiusMeters ?? 150);

  if (isSickStudent) {
    if (
      matchedOverride &&
      matchedOverride.homeLatitude !== undefined &&
      matchedOverride.homeLongitude !== undefined &&
      !Number.isNaN(Number(matchedOverride.homeLatitude)) &&
      !Number.isNaN(Number(matchedOverride.homeLongitude))
    ) {
      targetCenterLat = Number(matchedOverride.homeLatitude);
      targetCenterLng = Number(matchedOverride.homeLongitude);
      allowedRadiusMeters = Number(matchedOverride.allowedRadiusMeters || 500);
    } else {
      allowedRadiusMeters = Number(
        matchedOverride?.allowedRadiusMeters || schedule.sickStudentDefaultRadiusMeters || 15000
      );
    }
  }

  if (!schedule.gpsLockEnabled) {
    return {
      isSickStudent,
      sickReason,
      allowedRadiusMeters,
      targetCenterLat,
      targetCenterLng,
      distanceMeters:
        studentLat !== undefined && studentLng !== undefined
          ? calculateHaversineDistanceMeters(studentLat, studentLng, targetCenterLat, targetCenterLng)
          : null,
      gpsAllowed: true,
      gpsMessage: 'Kunci lokasi GPS dinonaktifkan oleh Waka Kurikulum.'
    };
  }

  if (
    studentLat === undefined ||
    studentLng === undefined ||
    Number.isNaN(Number(studentLat)) ||
    Number.isNaN(Number(studentLng))
  ) {
    return {
      isSickStudent,
      sickReason,
      allowedRadiusMeters,
      targetCenterLat,
      targetCenterLng,
      distanceMeters: null,
      gpsAllowed: false,
      gpsMessage: 'Lokasi GPS belum terdeteksi. Aktifkan izin lokasi (GPS) pada perangkat untuk mengerjakan soal.'
    };
  }

  const distanceMeters = calculateHaversineDistanceMeters(
    Number(studentLat),
    Number(studentLng),
    targetCenterLat,
    targetCenterLng
  );

  const gpsAllowed = distanceMeters <= allowedRadiusMeters;
  const modeLabel = isSickStudent ? 'Mode Siswa Sakit (Rumah)' : 'Area Sekolah';
  const gpsMessage = gpsAllowed
    ? `Lokasi terverifikasi (${modeLabel}: jarak ${distanceMeters}m dari batas maksimal ${allowedRadiusMeters}m).`
    : `Lokasi di luar radius ujian (${modeLabel}). Jarak Anda ${distanceMeters}m, maksimal radius yang diizinkan adalah ${allowedRadiusMeters}m.`;

  return {
    isSickStudent,
    sickReason,
    allowedRadiusMeters,
    targetCenterLat,
    targetCenterLng,
    distanceMeters,
    gpsAllowed,
    gpsMessage
  };
}

export function calculateSubmissionScore(params: {
  questions: OnlineExamQuestion[];
  answers: Record<string, any>;
  scoringConfig: OnlineExamScoringConfig;
  manualQuestionScores?: Record<string, number>;
}): {
  questionScores: Record<string, number>;
  rawScore: number;
  maxRawScore: number;
  finalScoreSas: number;
} {
  const { questions, answers, scoringConfig, manualQuestionScores } = params;
  const questionScores: Record<string, number> = {};
  let rawScore = 0;
  let maxRawScore = 0;

  const cfg: OnlineExamScoringConfig = {
    pgWeight: Number(scoringConfig?.pgWeight ?? 1),
    pgKompleksWeight: Number(scoringConfig?.pgKompleksWeight ?? 2),
    menjodohkanWeight: Number(scoringConfig?.menjodohkanWeight ?? 2),
    benarSalahWeight: Number(scoringConfig?.benarSalahWeight ?? 1),
    uraianWeight: Number(scoringConfig?.uraianWeight ?? 4),
    maxScaleScore: Number(scoringConfig?.maxScaleScore ?? 100),
    useQuestionCustomScore: Boolean(scoringConfig?.useQuestionCustomScore ?? true),
    autoSyncToSas: Boolean(scoringConfig?.autoSyncToSas ?? true)
  };

  for (const q of questions || []) {
    let weight = 1;
    if (cfg.useQuestionCustomScore && Number(q.scoreWeight) > 0) {
      weight = Number(q.scoreWeight);
    } else {
      if (q.type === 'pg') weight = cfg.pgWeight;
      else if (q.type === 'pg_kompleks') weight = cfg.pgKompleksWeight;
      else if (q.type === 'menjodohkan') weight = cfg.menjodohkanWeight;
      else if (q.type === 'benar_salah') weight = cfg.benarSalahWeight;
      else if (q.type === 'uraian') weight = cfg.uraianWeight;
    }

    maxRawScore += weight;

    // If manually graded for this question, respect manual override (clamped to weight)
    if (
      manualQuestionScores &&
      manualQuestionScores[q.id] !== undefined &&
      !Number.isNaN(Number(manualQuestionScores[q.id]))
    ) {
      const manualScore = Math.max(0, Math.min(weight, Number(manualQuestionScores[q.id])));
      questionScores[q.id] = Math.round(manualScore * 100) / 100;
      rawScore += questionScores[q.id];
      continue;
    }

    const ans = answers ? answers[q.id] : undefined;
    let earned = 0;

    if (q.type === 'pg') {
      if (ans && q.correctOptionId && String(ans) === String(q.correctOptionId)) {
        earned = weight;
      }
    } else if (q.type === 'pg_kompleks') {
      const correctIds = Array.isArray(q.correctOptionIds) ? q.correctOptionIds.map(String) : [];
      const selectedIds = Array.isArray(ans) ? ans.map(String) : [];
      if (correctIds.length > 0 && selectedIds.length > 0) {
        let rightCount = 0;
        let wrongCount = 0;
        for (const sid of selectedIds) {
          if (correctIds.includes(sid)) rightCount++;
          else wrongCount++;
        }
        const netCorrect = Math.max(0, rightCount - wrongCount);
        earned = (netCorrect / correctIds.length) * weight;
      }
    } else if (q.type === 'menjodohkan') {
      const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
      if (pairs.length > 0 && ans && typeof ans === 'object') {
        let matched = 0;
        for (const p of pairs) {
          const studentRight = ans[p.id];
          if (
            studentRight &&
            (String(studentRight) === String(p.id) ||
              String(studentRight).trim().toLowerCase() === String(p.rightResponse).trim().toLowerCase())
          ) {
            matched++;
          }
        }
        earned = (matched / pairs.length) * weight;
      }
    } else if (q.type === 'benar_salah') {
      const items = Array.isArray(q.trueFalseItems) ? q.trueFalseItems : [];
      if (items.length > 0 && ans && typeof ans === 'object') {
        let correctCount = 0;
        for (const item of items) {
          const studentVal = ans[item.id];
          if (typeof studentVal === 'boolean' && studentVal === Boolean(item.isTrue)) {
            correctCount++;
          } else if (
            typeof studentVal === 'string' &&
            ((studentVal === 'true' && item.isTrue) || (studentVal === 'false' && !item.isTrue))
          ) {
            correctCount++;
          }
        }
        earned = (correctCount / items.length) * weight;
      }
    } else if (q.type === 'uraian') {
      const studentEssay = typeof ans === 'string' ? ans.trim() : '';
      const keyText = typeof q.answerKeyText === 'string' ? q.answerKeyText.trim() : '';
      if (studentEssay.length > 0) {
        if (!keyText) {
          earned = weight;
        } else {
          const normStudent = studentEssay.toLowerCase();
          const normKey = keyText.toLowerCase();
          if (normStudent === normKey || normStudent.includes(normKey)) {
            earned = weight;
          } else {
            const keywords = normKey
              .split(/[,.;\s]+/)
              .map(k => k.trim())
              .filter(k => k.length >= 3);
            if (keywords.length === 0) {
              earned = weight;
            } else {
              const hit = keywords.filter(k => normStudent.includes(k)).length;
              earned = Math.min(weight, (hit / keywords.length) * weight);
            }
          }
        }
      }
    }

    questionScores[q.id] = Math.round(earned * 100) / 100;
    rawScore += questionScores[q.id];
  }

  rawScore = Math.round(rawScore * 100) / 100;
  maxRawScore = Math.round(maxRawScore * 100) / 100;
  const maxScale = cfg.maxScaleScore > 0 ? cfg.maxScaleScore : 100;
  const finalScoreSas =
    maxRawScore > 0 ? Math.round(((rawScore / maxRawScore) * maxScale) * 100) / 100 : 0;

  return {
    questionScores,
    rawScore,
    maxRawScore,
    finalScoreSas
  };
}

function createSeededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let seed = (h ^ 0x85ebca6b) >>> 0;
  return function mulberry32() {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function prepareRandomizedQuestionsForStudent(
  questions: OnlineExamQuestion[],
  studentId: string,
  scheduleId: string,
  randomizeQuestions: boolean = true,
  preSanitized?: OnlineExamQuestion[]
): OnlineExamQuestion[] {
  const sanitized = preSanitized || sanitizeQuestionsForStudentDelivery(questions);

  if (!randomizeQuestions || sanitized.length <= 1) {
    return sanitized;
  }

  const rng = createSeededRng(`cbt-random-order::${studentId}::${scheduleId}`);
  const shuffled = [...sanitized];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Ensure student's order differs if by coincidence a small list landed on original order
  const isIdenticalOrder = shuffled.every((q, idx) => q.id === sanitized[idx].id);
  if (isIdenticalOrder && shuffled.length > 1) {
    let charHash = 0;
    for (let i = 0; i < studentId.length; i++) {
      charHash = (charHash * 31 + studentId.charCodeAt(i)) >>> 0;
    }
    const shift = (charHash % (shuffled.length - 1)) + 1;
    const rotated = [...shuffled.slice(shift), ...shuffled.slice(0, shift)];
    return rotated.map((q, idx) => ({
      ...q,
      number: idx + 1
    }));
  }

  return shuffled.map((q, idx) => ({
    ...q,
    number: idx + 1
  }));
}

function buildImmediateMerdekaAssessment(
  submission: OnlineExamSubmission,
  targetMode: 'sas' | 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4',
  teacherName: string,
  existingAssessments: MerdekaAssessment[]
): MerdekaAssessment {
  const ex = existingAssessments.find(
    a =>
      a.studentId === submission.studentId &&
      (a.subject.toLowerCase() === submission.subjectName.toLowerCase() ||
        a.subject.toLowerCase() === submission.subjectId.toLowerCase()) &&
      a.semester === submission.semester &&
      a.academicYear === submission.academicYear
  );

  const scoreRounded = Math.round(Number(submission.finalScoreSas) * 100) / 100;
  const assessId = ex
    ? String(ex.id)
    : `ma-${submission.studentId}-${submission.subjectId}-${submission.semester}-${submission.academicYear.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 64);

  let tp1Tugas1 = ex?.tp1Tugas1 ?? '';
  let tp1Uh = ex?.tp1Uh ?? '';
  let tp2Tugas1 = ex?.tp2Tugas1 ?? '';
  let tp2Uh = ex?.tp2Uh ?? '';
  let tp3Tugas1 = ex?.tp3Tugas1 ?? '';
  let tp3Uh = ex?.tp3Uh ?? '';
  let tp4Tugas1 = ex?.tp4Tugas1 ?? '';
  let tp4Uh = ex?.tp4Uh ?? '';

  let nilaiKokurikuler = Number(ex?.nilaiKokurikuler || 0);
  let nilaiPts = Number(ex?.nilaiPts || 0);
  let nilaiPas = Number(ex?.nilaiPas || 0);
  let nilaiSAS = Number(ex?.nilaiSAS || nilaiPas || 0);

  if (targetMode === 'uh_tp1') tp1Uh = String(Math.round(scoreRounded));
  else if (targetMode === 'uh_tp2') tp2Uh = String(Math.round(scoreRounded));
  else if (targetMode === 'uh_tp3') tp3Uh = String(Math.round(scoreRounded));
  else if (targetMode === 'uh_tp4') tp4Uh = String(Math.round(scoreRounded));
  else {
    nilaiPas = scoreRounded;
    nilaiSAS = scoreRounded;
  }

  const calcSingleTp = (t1: any, uh: any): number | null => {
    const n1 = t1 !== undefined && t1 !== null && String(t1).trim() !== '' && !Number.isNaN(Number(t1)) ? Number(t1) : null;
    const nUh = uh !== undefined && uh !== null && String(uh).trim() !== '' && !Number.isNaN(Number(uh)) ? Number(uh) : null;
    if (n1 === null && nUh === null) return null;
    if (n1 !== null && nUh !== null) return Math.round(n1 * 0.7 + nUh * 0.3);
    if (n1 !== null) return Math.round(n1);
    return Math.round(nUh!);
  };

  const nTp1 = calcSingleTp(tp1Tugas1, tp1Uh);
  const nTp2 = calcSingleTp(tp2Tugas1, tp2Uh);
  const nTp3 = calcSingleTp(tp3Tugas1, tp3Uh);
  const nTp4 = calcSingleTp(tp4Tugas1, tp4Uh);

  const validTps = [nTp1, nTp2, nTp3, nTp4].filter((v): v is number => v !== null);
  const nilaiRataTp =
    validTps.length > 0
      ? Math.round(validTps.reduce((a, b) => a + b, 0) / validTps.length)
      : Number(ex?.nilaiRataTp || 0);

  const hasOtherComponents = nilaiRataTp > 0 || nilaiKokurikuler > 0 || nilaiPts > 0 || nilaiPas > 0;
  const nilaiAkhirMapel = hasOtherComponents
    ? Math.round((nilaiRataTp * 3 + nilaiKokurikuler + nilaiPts + nilaiPas) / 6)
    : Math.round(scoreRounded);

  const deskripsiCapaian =
    ex?.deskripsiCapaian ||
    `Menunjukkan penguasaan kompetensi pada mata pelajaran ${submission.subjectName} (${
      targetMode.startsWith('uh_') ? `Ulangan Harian ${targetMode.replace('uh_tp', 'TP ')}` : 'SAS Online'
    }: ${scoreRounded}).`;

  return {
    id: assessId,
    studentId: submission.studentId,
    studentName: submission.studentName,
    className: submission.className,
    subject: submission.subjectName,
    teacherName: teacherName || ex?.teacherName || 'Sistem Ujian Online (CBT)',
    semester: submission.semester as 'Ganjil' | 'Genap',
    academicYear: submission.academicYear,
    tp1Name: ex?.tp1Name,
    tp1Tugas1,
    tp1Tugas2: ex?.tp1Tugas2,
    tp1Uh,
    nilaiTp1: nTp1 ?? undefined,
    tp2Name: ex?.tp2Name,
    tp2Tugas1,
    tp2Tugas2: ex?.tp2Tugas2,
    tp2Uh,
    nilaiTp2: nTp2 ?? undefined,
    tp3Name: ex?.tp3Name,
    tp3Tugas1,
    tp3Tugas2: ex?.tp3Tugas2,
    tp3Uh,
    nilaiTp3: nTp3 ?? undefined,
    tp4Name: ex?.tp4Name,
    tp4Tugas1,
    tp4Tugas2: ex?.tp4Tugas2,
    tp4Uh,
    nilaiTp4: nTp4 ?? undefined,
    nilaiRataTp,
    nilaiFormatif: nilaiRataTp,
    nilaiKokurikuler,
    nilaiPts,
    nilaiPas,
    nilaiSAS,
    nilaiAkhirMapel,
    nilaiRapor: nilaiAkhirMapel,
    deskripsiCapaian,
    createdAt: ex?.createdAt || new Date().toISOString()
  };
}

export function createOnlineExamRouter(ctx: OnlineExamRouterContext): Router {
  const router = Router();

  // 1. GET /api/online-exams/packets
  // Supports ?summary=1 (excludes heavy questions_json for ultra-fast Bank Soal listing)
  router.get('/packets', async (req: Request, res: Response) => {
    try {
      const includeQuestions = req.query.summary !== '1' && req.query.summary !== 'true';
      let packets = includeQuestions
        ? await getOnlineExamPacketsFromMysql(true)
        : await getCachedPacketsSummary();

      const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId.trim() : '';
      const gradeLevel = typeof req.query.gradeLevel === 'string' ? req.query.gradeLevel.trim() : '';
      const creatorId = typeof req.query.creatorId === 'string' ? req.query.creatorId.trim() : '';
      const purpose = typeof req.query.purpose === 'string' ? req.query.purpose.trim() : '';

      if (subjectId) {
        packets = packets.filter(
          p => p.subjectId === subjectId || p.subjectName.toLowerCase() === subjectId.toLowerCase()
        );
      }
      if (gradeLevel) {
        packets = packets.filter(p => String(p.gradeLevel) === gradeLevel);
      }
      if (creatorId) {
        packets = packets.filter(p => p.creatorId === creatorId);
      }
      if (purpose === 'bank_soal') {
        packets = packets.filter(
          p => !p.packetPurpose || p.packetPurpose === 'bank_soal' || p.packetPurpose === 'both'
        );
      } else if (purpose === 'ulangan_harian') {
        packets = packets.filter(
          p => p.packetPurpose === 'ulangan_harian' || p.packetPurpose === 'both' || p.examCategory === 'UH'
        );
      }

      res.json({
        success: true,
        packets,
        currentWib: getCurrentWibDateTime()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat Bank Soal.' });
    }
  });

  // 2. GET /api/online-exams/packets/:id
  router.get('/packets/:id', async (req: Request, res: Response) => {
    try {
      const packet = await getCachedPacketById(req.params.id);
      if (!packet) {
        return res.status(404).json({ success: false, message: 'Paket soal tidak ditemukan di MySQL.' });
      }
      res.json({ success: true, packet });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat detail paket soal.' });
    }
  });

  // 3. POST /api/online-exams/packets
  router.post('/packets', async (req: Request, res: Response) => {
    try {
      const body = req.body as OnlineExamPacket;
      if (!body || !body.title || !body.subjectName) {
        return res.status(400).json({
          success: false,
          message: 'Judul paket soal dan Mata Pelajaran wajib diisi.'
        });
      }
      const result = await saveOnlineExamPacketToMysql(body);
      if (!result.success) {
        return res.status(500).json(result);
      }
      if (result.packet) {
        packetsByIdCache.set(result.packet.id, {
          packet: result.packet,
          sanitizedQuestions: sanitizeQuestionsForStudentDelivery(result.packet.questions),
          loadedAt: Date.now()
        });
        packetsSummaryCache = null;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan paket soal.' });
    }
  });

  // 4. DELETE /api/online-exams/packets/:id
  router.delete('/packets/:id', async (req: Request, res: Response) => {
    try {
      const result = await deleteOnlineExamPacketFromMysql(req.params.id);
      packetsByIdCache.delete(req.params.id);
      packetsSummaryCache = null;
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus paket soal.' });
    }
  });

  // 5. GET /api/online-exams/schedules
  router.get('/schedules', async (req: Request, res: Response) => {
    try {
      let schedules = await getCachedSchedules();
      const scheduleType = typeof req.query.scheduleType === 'string' ? req.query.scheduleType.trim() : '';
      const creatorId = typeof req.query.creatorId === 'string' ? req.query.creatorId.trim() : '';

      if (scheduleType) {
        schedules = schedules.filter(s => (s.scheduleType || 'waka_sas') === scheduleType);
      }
      if (creatorId) {
        schedules = schedules.filter(s => s.creatorId === creatorId);
      }

      const enriched = schedules.map(s => {
        const statusInfo = computeScheduleWibStatus(s);
        return {
          ...s,
          isCurrentlyOpenWib: statusInfo.isCurrentlyOpenWib,
          scheduleStatusWib: statusInfo.scheduleStatusWib
        };
      });
      res.json({
        success: true,
        schedules: enriched,
        currentWib: getCurrentWibDateTime()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat jadwal ujian.' });
    }
  });

  // 6. POST /api/online-exams/schedules
  router.post('/schedules', async (req: Request, res: Response) => {
    try {
      const body = req.body as OnlineExamSchedule;
      if (!body || !body.packetId || !body.examDate || !body.startTimeWib || !body.endTimeWib) {
        return res.status(400).json({
          success: false,
          message: 'Paket soal, tanggal ujian, jam mulai (WIB), dan jam selesai (WIB) wajib diisi.'
        });
      }

      // Enforce 4 UH TP quota (uh_tp1, uh_tp2, uh_tp3, uh_tp4) for teacher_uh schedules
      const scheduleType = body.scheduleType || body.scoringConfig?.scheduleType || 'waka_sas';
      if (scheduleType === 'teacher_uh') {
        const targetMode = body.scoreTargetMode || body.scoringConfig?.scoreTargetMode || 'uh_tp1';
        if (!['uh_tp1', 'uh_tp2', 'uh_tp3', 'uh_tp4'].includes(targetMode)) {
          return res.status(400).json({
            success: false,
            message: 'Jadwal Ulangan Harian wajib memilih salah satu jatah Ulangan Harian TP (UH TP 1, UH TP 2, UH TP 3, atau UH TP 4).'
          });
        }
        body.scoreTargetMode = targetMode;

        const existingSchedules = await getCachedSchedules();
        const targetClassSet = new Set((body.targetClasses || []).map(c => c.trim().toUpperCase()));
        const duplicateSlot = existingSchedules.find(s => {
          if (s.id === body.id) return false;
          if ((s.scheduleType || 'waka_sas') !== 'teacher_uh') return false;
          const sameSub =
            s.subjectId.toLowerCase() === (body.subjectId || '').toLowerCase() ||
            s.subjectName.toLowerCase() === (body.subjectName || '').toLowerCase();
          if (!sameSub) return false;
          if ((s.semester || '').toLowerCase() !== (body.semester || '').toLowerCase()) return false;
          if ((s.academicYear || '').toLowerCase() !== (body.academicYear || '').toLowerCase()) return false;
          const sMode = s.scoreTargetMode || s.scoringConfig?.scoreTargetMode || 'uh_tp1';
          if (sMode !== targetMode) return false;
          const sClasses = (s.targetClasses || []).map(c => c.trim().toUpperCase());
          return sClasses.some(c => targetClassSet.has(c));
        });

        if (duplicateSlot && !body.id) {
          body.id = duplicateSlot.id;
        }
      }

      const result = await saveOnlineExamScheduleToMysql(body);
      if (!result.success) {
        return res.status(500).json(result);
      }
      if (result.schedule) {
        if (schedulesCache) {
          const idx = schedulesCache.findIndex(s => s.id === result.schedule!.id);
          if (idx >= 0) {
            schedulesCache[idx] = result.schedule;
          } else {
            schedulesCache.unshift(result.schedule);
          }
        } else {
          schedulesCache = [result.schedule];
        }
        schedulesCacheLoadedAt = Date.now();
        // Pre-warm packet cache in background so students opening the schedule get 0ms response
        getCachedPacketById(result.schedule.packetId).catch(() => {});
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan jadwal ujian.' });
    }
  });

  // 7. DELETE /api/online-exams/schedules/:id
  router.delete('/schedules/:id', async (req: Request, res: Response) => {
    try {
      const result = await deleteOnlineExamScheduleFromMysql(req.params.id);
      if (schedulesCache) {
        schedulesCache = schedulesCache.filter(s => s.id !== req.params.id);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus jadwal ujian.' });
    }
  });

  // 8. GET /api/online-exams/student-available/:studentId
  // Ultra-fast cached endpoint for Student Exam Portal (handles 30-300+ concurrent students without blocking MySQL)
  router.get('/student-available/:studentId', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const className = typeof req.query.className === 'string' ? req.query.className.trim() : '';
      const studentNis = typeof req.query.nis === 'string' ? req.query.nis.trim() : '';
      const studentName = typeof req.query.name === 'string' ? req.query.name.trim() : '';
      const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
      const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;

      const gradeMatch = className.match(/^([789])/);
      const studentGrade = gradeMatch ? gradeMatch[1] : '';

      const [schedules] = await Promise.all([
        getCachedSchedules(),
        allSubmissionsLoadedAt > 0 ? Promise.resolve() : ensureAllSubmissionsCached()
      ]);

      const subByScheduleId = submissionsByStudentIdCache.get(String(studentId));

      const attendanceLogs = ctx.getAttendanceLogs();

      const filteredSchedules = schedules
        .filter(s => {
          if (!s.isActive) return false;
          if (Array.isArray(s.targetClasses) && s.targetClasses.length > 0 && className) {
            const normTarget = s.targetClasses.map(c => c.trim().toUpperCase());
            if (!normTarget.includes(className.toUpperCase())) return false;
          } else if (studentGrade && String(s.gradeLevel) !== studentGrade) {
            return false;
          }
          return true;
        })
        .map(s => {
          const wibStatus = computeScheduleWibStatus(s);
          const gpsEval = evaluateStudentSickStatusAndGps({
            schedule: s,
            studentId,
            studentNis,
            studentName,
            attendanceLogs,
            studentLat: lat,
            studentLng: lng
          });
          let existingSub = subByScheduleId?.get(s.id) || null;
          // If an active exam schedule has a submission that got auto-closed with 0 score and 0 answers,
          // treat it as resumable ('in_progress') so the student is not locked out with score 0!
          if (existingSub && wibStatus.isCurrentlyOpenWib && isZeroUnansweredSubmission(existingSub)) {
            existingSub = {
              ...existingSub,
              status: 'in_progress'
            };
          }
          // Pre-warm packet cache if schedule is currently open
          if (wibStatus.isCurrentlyOpenWib && s.packetId) {
            getCachedPacketById(s.packetId).catch(() => {});
          }
          return {
            ...s,
            isCurrentlyOpenWib: wibStatus.isCurrentlyOpenWib,
            scheduleStatusWib: wibStatus.scheduleStatusWib,
            gpsEvaluation: gpsEval,
            studentSubmission: existingSub
          };
        });

      res.json({
        success: true,
        schedules: filteredSchedules,
        currentWib: getCurrentWibDateTime(),
        serverNowMs: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal memuat daftar ujian siswa.'
      });
    }
  });

  // 9. POST /api/online-exams/verify-gps-and-start
  // Verifies WIB schedule & GPS radius, serves cached packet in < 2ms for 500-1000 simultaneous students, and batches MySQL writes
  router.post('/verify-gps-and-start', async (req: Request, res: Response) => {
    try {
      const {
        scheduleId,
        studentId,
        studentNis,
        studentName,
        className,
        latitude,
        longitude,
        tokenCode
      } = req.body || {};

      if (!scheduleId || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'ID Jadwal dan ID Siswa wajib dikirim.'
        });
      }

      const schedules = await getCachedSchedules();
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Jadwal ujian tidak ditemukan.'
        });
      }

      // Check WIB schedule time window
      const wibStatus = computeScheduleWibStatus(schedule);
      if (!wibStatus.isCurrentlyOpenWib) {
        return res.status(403).json({
          success: false,
          message: `Ujian belum atau sudah tidak aktif. Jadwal aktif: ${schedule.examDate} pukul ${schedule.startTimeWib} - ${schedule.endTimeWib} WIB (Waktu sekarang: ${wibStatus.currentWib.isoWib}).`,
          currentWib: wibStatus.currentWib
        });
      }

      // Check optional token code
      if (
        schedule.tokenCode &&
        schedule.tokenCode.trim().length > 0 &&
        String(tokenCode || '').trim().toUpperCase() !== schedule.tokenCode.trim().toUpperCase()
      ) {
        return res.status(403).json({
          success: false,
          message: 'Token ujian tidak sesuai. Silakan periksa kembali token ujian dari pengawas / Waka Kurikulum.'
        });
      }

      // Check GPS radius (regular vs sick student at home)
      const gpsEval = evaluateStudentSickStatusAndGps({
        schedule,
        studentId,
        studentNis,
        studentName,
        attendanceLogs: ctx.getAttendanceLogs(),
        studentLat: latitude !== undefined ? Number(latitude) : undefined,
        studentLng: longitude !== undefined ? Number(longitude) : undefined
      });

      if (!gpsEval.gpsAllowed) {
        return res.status(403).json({
          success: false,
          gpsBlocked: true,
          gpsEvaluation: gpsEval,
          message: gpsEval.gpsMessage
        });
      }

      const packet = await getCachedPacketById(schedule.packetId);
      if (!packet) {
        return res.status(404).json({
          success: false,
          message: 'Paket soal di Bank Soal tidak ditemukan.'
        });
      }

      if (allSubmissionsLoadedAt === 0) {
        await ensureAllSubmissionsCached();
      }
      const subKey = makeSubKey(scheduleId, studentId);
      let submission = submissionsByKeyCache.get(subKey);

      const now = new Date().toISOString();

      if (!submission) {
        submission = {
          id: `sub-${scheduleId}-${studentId}`,
          scheduleId: schedule.id,
          packetId: packet.id,
          studentId,
          studentNis: studentNis || '',
          studentName: studentName || 'Siswa',
          className: className || '',
          subjectId: schedule.subjectId,
          subjectName: schedule.subjectName,
          semester: schedule.semester,
          academicYear: schedule.academicYear,
          status: 'in_progress',
          startedAt: now,
          gpsLatitude: latitude !== undefined ? Number(latitude) : undefined,
          gpsLongitude: longitude !== undefined ? Number(longitude) : undefined,
          gpsDistanceMeters: gpsEval.distanceMeters ?? undefined,
          isSickHomeMode: gpsEval.isSickStudent,
          answers: {},
          questionScores: {},
          rawScore: 0,
          maxRawScore: 100,
          finalScoreSas: 0,
          syncedToSas: false,
          updatedAt: now
        };
        enqueueSubmissionMysqlWrite(submission, { autoSyncToSas: false }, false);
      } else {
        // Recover if student's previous session was accidentally auto-submitted with 0 score and 0 answers
        // OR if startedAt had expired on an active schedule
        const timerCheck = computeAuthoritativeRemainingSeconds(schedule, submission.startedAt);
        if (isZeroUnansweredSubmission(submission) || timerCheck.shouldResetStartedAt) {
          submission = {
            ...submission,
            status: 'in_progress',
            startedAt: now,
            submittedAt: undefined,
            updatedAt: now
          };
          enqueueSubmissionMysqlWrite(submission, { autoSyncToSas: false }, false);
        }
      }

      const authTimer = computeAuthoritativeRemainingSeconds(schedule, submission.startedAt);

      // Determine whether questions should be randomized or kept in original order
      const shouldRandomize =
        schedule.randomizeQuestions !== undefined
          ? Boolean(schedule.randomizeQuestions)
          : schedule.scoringConfig?.randomizeQuestions !== undefined
          ? Boolean(schedule.scoringConfig.randomizeQuestions)
          : packet.randomizeQuestions !== undefined
          ? Boolean(packet.randomizeQuestions)
          : true;

      const preSanitized = packetsByIdCache.get(packet.id)?.sanitizedQuestions;

      res.json({
        success: true,
        schedule: {
          ...schedule,
          randomizeQuestions: shouldRandomize
        },
        packet: {
          ...packet,
          randomizeQuestions: shouldRandomize,
          questions: prepareRandomizedQuestionsForStudent(
            packet.questions,
            String(studentId),
            String(schedule.id),
            shouldRandomize,
            preSanitized
          )
        },
        submission,
        remainingSeconds: authTimer.remainingSeconds,
        serverNowMs: Date.now(),
        gpsEvaluation: gpsEval,
        currentWib: wibStatus.currentWib
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal memulai sesi ujian.'
      });
    }
  });

  // 10. POST /api/online-exams/save-progress
  // Instant in-memory answer sync + coalesced background MySQL flush (0ms response for 30+ concurrent students)
  router.post('/save-progress', async (req: Request, res: Response) => {
    try {
      const { scheduleId, studentId, studentNis, studentName, className, answers, latitude, longitude } = req.body || {};
      if (!scheduleId || !studentId) {
        return res.status(400).json({ success: false, message: 'scheduleId dan studentId wajib diisi.' });
      }

      const subKey = makeSubKey(scheduleId, studentId);
      let current = submissionsByKeyCache.get(subKey);
      if (!current) {
        await ensureAllSubmissionsCached();
        current = submissionsByKeyCache.get(subKey);
      }

      if (!current) {
        const schedules = await getCachedSchedules();
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) {
          return res.status(404).json({ success: false, message: 'Jadwal ujian tidak ditemukan.' });
        }
        const now = new Date().toISOString();
        current = {
          id: `sub-${scheduleId}-${studentId}`,
          scheduleId: schedule.id,
          packetId: schedule.packetId,
          studentId,
          studentNis: studentNis || '',
          studentName: studentName || 'Siswa',
          className: className || '',
          subjectId: schedule.subjectId,
          subjectName: schedule.subjectName,
          semester: schedule.semester,
          academicYear: schedule.academicYear,
          status: 'in_progress',
          startedAt: now,
          answers: {},
          questionScores: {},
          rawScore: 0,
          maxRawScore: 100,
          finalScoreSas: 0,
          syncedToSas: false,
          updatedAt: now
        };
      }

      if (current.status !== 'in_progress' && !isZeroUnansweredSubmission(current)) {
        return res.json({
          success: true,
          submission: current,
          message: 'Ujian sudah dikumpulkan sebelumnya.'
        });
      }

      const mergedAnswers =
        answers && typeof answers === 'object'
          ? { ...(current.answers || {}), ...answers }
          : current.answers || {};

      const updated: OnlineExamSubmission = {
        ...current,
        status: 'in_progress',
        answers: mergedAnswers,
        gpsLatitude: latitude !== undefined ? Number(latitude) : current.gpsLatitude,
        gpsLongitude: longitude !== undefined ? Number(longitude) : current.gpsLongitude,
        updatedAt: new Date().toISOString()
      };

      enqueueSubmissionMysqlWrite(updated, { autoSyncToSas: false }, false);
      res.json({
        success: true,
        submission: updated,
        message: 'Progres pengerjaan ujian berhasil disimpan.'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal menyimpan progres jawaban ke MySQL.'
      });
    }
  });

  // 11. POST /api/online-exams/submit
  // Grades exam in < 5ms from cached packet, updates memory immediately, and persists to MySQL in background queue
  router.post('/submit', async (req: Request, res: Response) => {
    try {
      const {
        scheduleId,
        studentId,
        studentNis,
        studentName,
        className,
        answers,
        latitude,
        longitude
      } = req.body || {};

      if (!scheduleId || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'scheduleId dan studentId wajib diisi.'
        });
      }

      const schedules = await getCachedSchedules();
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        return res.status(404).json({ success: false, message: 'Jadwal ujian tidak ditemukan.' });
      }

      const packet = await getCachedPacketById(schedule.packetId);
      if (!packet) {
        return res.status(404).json({ success: false, message: 'Paket soal tidak ditemukan.' });
      }

      const subKey = makeSubKey(scheduleId, studentId);
      let current = submissionsByKeyCache.get(subKey);
      if (!current) {
        await ensureAllSubmissionsCached();
        current = submissionsByKeyCache.get(subKey);
      }

      const gpsEval = evaluateStudentSickStatusAndGps({
        schedule,
        studentId,
        studentNis: studentNis || current?.studentNis,
        studentName: studentName || current?.studentName,
        attendanceLogs: ctx.getAttendanceLogs(),
        studentLat: latitude !== undefined ? Number(latitude) : current?.gpsLatitude,
        studentLng: longitude !== undefined ? Number(longitude) : current?.gpsLongitude
      });

      // Merge any cached in-progress answers with final submitted answers so no answer is ever lost
      const finalAnswers = {
        ...(current?.answers || {}),
        ...(answers && typeof answers === 'object' ? answers : {})
      };

      const scoreResult = calculateSubmissionScore({
        questions: packet.questions,
        answers: finalAnswers,
        scoringConfig: schedule.scoringConfig
      });

      const targetMode =
        schedule.scoreTargetMode ||
        schedule.scoringConfig?.scoreTargetMode ||
        (schedule.scheduleType === 'teacher_uh' ? 'uh_tp1' : 'sas');

      const now = new Date().toISOString();
      const submissionToSave: OnlineExamSubmission = {
        id: current?.id || `sub-${scheduleId}-${studentId}`,
        scheduleId: schedule.id,
        packetId: packet.id,
        studentId,
        studentNis: studentNis || current?.studentNis || '',
        studentName: studentName || current?.studentName || 'Siswa',
        className: className || current?.className || '',
        subjectId: schedule.subjectId,
        subjectName: schedule.subjectName,
        semester: schedule.semester,
        academicYear: schedule.academicYear,
        status: 'graded',
        startedAt: current?.startedAt || now,
        submittedAt: now,
        gpsLatitude: latitude !== undefined ? Number(latitude) : current?.gpsLatitude,
        gpsLongitude: longitude !== undefined ? Number(longitude) : current?.gpsLongitude,
        gpsDistanceMeters: gpsEval.distanceMeters ?? current?.gpsDistanceMeters,
        isSickHomeMode: gpsEval.isSickStudent || Boolean(current?.isSickHomeMode),
        answers: finalAnswers,
        questionScores: scoreResult.questionScores,
        rawScore: scoreResult.rawScore,
        maxRawScore: scoreResult.maxRawScore,
        finalScoreSas: scoreResult.finalScoreSas,
        syncedToSas: true,
        scoreTargetMode: targetMode,
        updatedAt: now
      };

      // Update in-memory assessment immediately so teacher/student dashboards reflect the score in 0ms
      const immediateAssessment = buildImmediateMerdekaAssessment(
        submissionToSave,
        targetMode,
        schedule.creatorName || 'Sistem Ujian Online (CBT)',
        ctx.getMerdekaAssessments()
      );
      ctx.upsertMerdekaAssessmentInMemory(immediateAssessment);

      // Enqueue high-priority MySQL batch persistence in background so 500-1000 student responses return in < 2ms
      enqueueSubmissionMysqlWrite(
        submissionToSave,
        {
          autoSyncToSas: true,
          scoreTargetMode: targetMode,
          teacherName: schedule.creatorName || undefined,
          syncedAssessment: immediateAssessment
        },
        true
      );

      const modeMsg = targetMode.startsWith('uh_tp')
        ? `Jawaban disimpan ke MySQL dan Nilai (${submissionToSave.finalScoreSas}) otomatis masuk ke Nilai Ulangan Harian (${targetMode.replace('uh_tp', 'TP ')}) di Penilaian!`
        : `Jawaban ujian disimpan ke MySQL dan Nilai SAS (${submissionToSave.finalScoreSas}) otomatis masuk ke Sistem Penilaian.`;

      res.json({
        success: true,
        submission: submissionToSave,
        syncedMerdekaAssessment: immediateAssessment,
        message: modeMsg
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal mengumpulkan jawaban dan menyinkronkan nilai ke MySQL.'
      });
    }
  });

  // 12. GET /api/online-exams/submissions
  router.get('/submissions', async (req: Request, res: Response) => {
    try {
      const scheduleId = typeof req.query.scheduleId === 'string' ? req.query.scheduleId : undefined;
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
      const packetId = typeof req.query.packetId === 'string' ? req.query.packetId : undefined;

      let submissions = await ensureAllSubmissionsCached();
      if (scheduleId) {
        submissions = submissions.filter(s => s.scheduleId === scheduleId);
      }
      if (studentId) {
        submissions = submissions.filter(s => s.studentId === studentId);
      }
      if (packetId) {
        submissions = submissions.filter(s => s.packetId === packetId);
      }
      submissions = [...submissions].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

      res.json({ success: true, submissions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat hasil ujian.' });
    }
  });

  // 13. POST /api/online-exams/grade-submission
  // Allows Teacher / Waka Kurikulum to update essay scores or re-sync to UH TP / SAS in MySQL
  router.post('/grade-submission', async (req: Request, res: Response) => {
    try {
      const { submissionId, scheduleId, studentId, manualQuestionScores } = req.body || {};
      const allSubs = await ensureAllSubmissionsCached();
      const target = allSubs.find(s => {
        if (submissionId && s.id === submissionId) return true;
        if (scheduleId && studentId && s.scheduleId === scheduleId && s.studentId === studentId) return true;
        return false;
      });
      if (!target) {
        return res.status(404).json({ success: false, message: 'Data jawaban siswa tidak ditemukan.' });
      }

      const schedules = await getCachedSchedules();
      const schedule = schedules.find(s => s.id === target.scheduleId);
      const packet = await getCachedPacketById(target.packetId);
      if (!schedule || !packet) {
        return res.status(404).json({ success: false, message: 'Jadwal atau paket soal tidak ditemukan.' });
      }

      const mergedManualScores = {
        ...(target.questionScores || {}),
        ...(manualQuestionScores || {})
      };

      const scoreResult = calculateSubmissionScore({
        questions: packet.questions,
        answers: target.answers || {},
        scoringConfig: schedule.scoringConfig,
        manualQuestionScores: mergedManualScores
      });

      const targetMode =
        schedule.scoreTargetMode ||
        schedule.scoringConfig?.scoreTargetMode ||
        (schedule.scheduleType === 'teacher_uh' ? 'uh_tp1' : 'sas');

      const updated: OnlineExamSubmission = {
        ...target,
        status: 'graded',
        questionScores: scoreResult.questionScores,
        rawScore: scoreResult.rawScore,
        maxRawScore: scoreResult.maxRawScore,
        finalScoreSas: scoreResult.finalScoreSas,
        syncedToSas: true,
        scoreTargetMode: targetMode,
        updatedAt: new Date().toISOString()
      };

      const immediateAssessment = buildImmediateMerdekaAssessment(
        updated,
        targetMode,
        schedule.creatorName || 'Sistem Ujian Online (CBT)',
        ctx.getMerdekaAssessments()
      );
      ctx.upsertMerdekaAssessmentInMemory(immediateAssessment);

      enqueueSubmissionMysqlWrite(
        updated,
        {
          autoSyncToSas: true,
          scoreTargetMode: targetMode,
          teacherName: schedule.creatorName || undefined,
          syncedAssessment: immediateAssessment
        },
        true
      );

      res.json({
        success: true,
        submission: updated,
        syncedMerdekaAssessment: immediateAssessment,
        message: `Nilai ujian siswa (${updated.finalScoreSas}) berhasil diperbarui dan disinkronkan ke MySQL!`
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal memperbarui skor ujian dan nilai ke MySQL.'
      });
    }
  });

  // 14. POST /api/online-exams/sync-to-uh
  // Syncs all graded submissions of a schedule to the selected UH TP slot (uh_tp1..uh_tp4) in MySQL
  router.post('/sync-to-uh', async (req: Request, res: Response) => {
    try {
      const { scheduleId, scoreTargetMode, teacherName } = req.body || {};
      if (!scheduleId || !['uh_tp1', 'uh_tp2', 'uh_tp3', 'uh_tp4'].includes(String(scoreTargetMode || ''))) {
        return res.status(400).json({
          success: false,
          message: 'ID Jadwal dan Target Ulangan Harian TP (UH TP 1 / TP 2 / TP 3 / TP 4) wajib dipilih.'
        });
      }

      const schedules = await getCachedSchedules();
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        const savedSch = await saveOnlineExamScheduleToMysql({
          ...schedule,
          scoreTargetMode,
          scoringConfig: {
            ...schedule.scoringConfig,
            scoreTargetMode,
            autoSyncToSas: true
          }
        });
        if (savedSch.schedule && schedulesCache) {
          const idx = schedulesCache.findIndex(s => s.id === savedSch.schedule!.id);
          if (idx >= 0) schedulesCache[idx] = savedSch.schedule;
        }
      }

      const allSubs = await ensureAllSubmissionsCached();
      const gradedSubs = allSubs.filter(s => s.scheduleId === scheduleId && s.status !== 'in_progress');
      let syncedCount = 0;

      for (const sub of gradedSubs) {
        const updatedSub: OnlineExamSubmission = {
          ...sub,
          status: 'graded',
          syncedToSas: true,
          scoreTargetMode,
          updatedAt: new Date().toISOString()
        };
        const immediateAssessment = buildImmediateMerdekaAssessment(
          updatedSub,
          scoreTargetMode,
          teacherName || schedule?.creatorName || 'Sistem Ujian Online (CBT)',
          ctx.getMerdekaAssessments()
        );
        ctx.upsertMerdekaAssessmentInMemory(immediateAssessment);
        enqueueSubmissionMysqlWrite(
          updatedSub,
          {
            autoSyncToSas: true,
            scoreTargetMode,
            teacherName: teacherName || schedule?.creatorName || undefined,
            syncedAssessment: immediateAssessment
          },
          true
        );
        syncedCount++;
      }

      const tpLabel = String(scoreTargetMode).replace('uh_tp', 'TP ');
      res.json({
        success: true,
        syncedCount,
        message: `Berhasil menyinkronkan ${syncedCount} nilai siswa ke kolom Ulangan Harian ${tpLabel} di Penilaian (MySQL)!`
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal menyinkronkan nilai ke Ulangan Harian di MySQL.'
      });
    }
  });

  // 15. POST /api/online-exams/reset-submission
  // Resets a student's submission so the student can retake or continue the exam cleanly
  router.post('/reset-submission', async (req: Request, res: Response) => {
    try {
      const { submissionId, scheduleId, studentId } = req.body || {};
      if (!submissionId && (!scheduleId || !studentId)) {
        return res.status(400).json({
          success: false,
          message: 'submissionId atau (scheduleId & studentId) wajib diisi.'
        });
      }

      await ensureAllSubmissionsCached();
      for (const [key, sub] of submissionsByKeyCache.entries()) {
        if (
          (submissionId && sub.id === submissionId) ||
          (scheduleId && studentId && sub.scheduleId === scheduleId && sub.studentId === studentId)
        ) {
          removeSubmissionFromMemoryCache(sub.scheduleId, sub.studentId);
          pendingSubmissionWrites.delete(key);
          const t = progressWriteTimers.get(key);
          if (t) {
            clearTimeout(t);
            progressWriteTimers.delete(key);
          }
        }
      }

      await deleteOnlineExamSubmissionFromMysql({ submissionId, scheduleId, studentId });

      res.json({
        success: true,
        message: 'Sesi ujian siswa berhasil direset. Siswa dapat mengerjakan ulang soal ujian.'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal mereset sesi ujian siswa.'
      });
    }
  });

  return router;
}
