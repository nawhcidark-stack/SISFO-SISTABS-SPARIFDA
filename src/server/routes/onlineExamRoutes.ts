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
  saveOnlineExamSubmissionDirectToMysql
} from '../mysqlService';

export interface OnlineExamRouterContext {
  getStudents: () => Student[];
  getAttendanceLogs: () => AttendanceLog[];
  getMerdekaAssessments: () => MerdekaAssessment[];
  upsertMerdekaAssessmentInMemory: (assessment: MerdekaAssessment) => void;
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
          // Give full weight if answered and no specific keyword key is set, or teacher can adjust
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
  scheduleId: string
): OnlineExamQuestion[] {
  const sanitized = (questions || []).map((q, idx) => ({
    ...q,
    id: q.id || `q-idx-${idx + 1}`,
    correctOptionId: undefined,
    correctOptionIds: undefined,
    answerKeyText: undefined,
    trueFalseItems: Array.isArray(q.trueFalseItems)
      ? q.trueFalseItems.map(item => ({ id: item.id, statement: item.statement, isTrue: false }))
      : undefined
  }));

  if (sanitized.length <= 1) {
    return sanitized.map((q, idx) => ({ ...q, number: idx + 1 }));
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


export function createOnlineExamRouter(ctx: OnlineExamRouterContext): Router {
  const router = Router();

  // 1. GET /api/online-exams/packets
  // Supports ?summary=1 (excludes heavy questions_json for ultra-fast Bank Soal listing)
  router.get('/packets', async (req: Request, res: Response) => {
    try {
      const includeQuestions = req.query.summary !== '1' && req.query.summary !== 'true';
      let packets = await getOnlineExamPacketsFromMysql(includeQuestions);

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
      const packet = await getOnlineExamPacketByIdFromMysql(req.params.id);
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
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan paket soal.' });
    }
  });

  // 4. DELETE /api/online-exams/packets/:id
  router.delete('/packets/:id', async (req: Request, res: Response) => {
    try {
      const result = await deleteOnlineExamPacketFromMysql(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus paket soal.' });
    }
  });

  // 5. GET /api/online-exams/schedules
  router.get('/schedules', async (req: Request, res: Response) => {
    try {
      let schedules = await getOnlineExamSchedulesFromMysql();
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

        // Check existing teacher_uh schedules for the same subject + semester + academicYear + class + TP slot
        const existingSchedules = await getOnlineExamSchedulesFromMysql();
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

        // If the teacher creates a schedule on an already-scheduled UH TP slot without passing its ID, update that slot's schedule ID
        if (duplicateSlot && !body.id) {
          body.id = duplicateSlot.id;
        }
      }

      const result = await saveOnlineExamScheduleToMysql(body);
      if (!result.success) {
        return res.status(500).json(result);
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
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus jadwal ujian.' });
    }
  });

  // 8. GET /api/online-exams/student-available/:studentId
  // Lightweight endpoint for Student Exam Portal
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

      const [schedules, submissions] = await Promise.all([
        getOnlineExamSchedulesFromMysql(),
        getOnlineExamSubmissionsFromMysql({ studentId })
      ]);

      const subByScheduleId = new Map<string, OnlineExamSubmission>();
      for (const sub of submissions) {
        subByScheduleId.set(sub.scheduleId, sub);
      }

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
          const existingSub = subByScheduleId.get(s.id) || null;
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
        currentWib: getCurrentWibDateTime()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal memuat daftar ujian siswa.'
      });
    }
  });

  // 9. POST /api/online-exams/verify-gps-and-start
  // Verifies WIB schedule & GPS radius (regular school radius or sick student home radius), starts/resumes exam in MySQL
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

      const schedules = await getOnlineExamSchedulesFromMysql();
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

      const packet = await getOnlineExamPacketByIdFromMysql(schedule.packetId);
      if (!packet) {
        return res.status(404).json({
          success: false,
          message: 'Paket soal di Bank Soal tidak ditemukan.'
        });
      }

      const existingSubs = await getOnlineExamSubmissionsFromMysql({ scheduleId, studentId });
      let submission = existingSubs[0];

      if (!submission) {
        const now = new Date().toISOString();
        const newSub: OnlineExamSubmission = {
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
        const saved = await saveOnlineExamSubmissionDirectToMysql(newSub, { autoSyncToSas: false });
        if (saved.submission) {
          submission = saved.submission;
        } else {
          submission = newSub;
        }
      }

      res.json({
        success: true,
        schedule,
        packet: {
          ...packet,
          questions: prepareRandomizedQuestionsForStudent(packet.questions, String(studentId), String(schedule.id))
        },
        submission,
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
  // Lightweight direct MySQL answer sync (no localStorage)
  router.post('/save-progress', async (req: Request, res: Response) => {
    try {
      const { scheduleId, studentId, answers, latitude, longitude } = req.body || {};
      if (!scheduleId || !studentId) {
        return res.status(400).json({ success: false, message: 'scheduleId dan studentId wajib diisi.' });
      }
      const existingSubs = await getOnlineExamSubmissionsFromMysql({ scheduleId, studentId });
      const current = existingSubs[0];
      if (!current) {
        return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan di MySQL.' });
      }
      if (current.status !== 'in_progress') {
        return res.json({
          success: true,
          submission: current,
          message: 'Ujian sudah dikumpulkan sebelumnya.'
        });
      }

      const updated: OnlineExamSubmission = {
        ...current,
        answers: answers && typeof answers === 'object' ? answers : current.answers,
        gpsLatitude: latitude !== undefined ? Number(latitude) : current.gpsLatitude,
        gpsLongitude: longitude !== undefined ? Number(longitude) : current.gpsLongitude,
        updatedAt: new Date().toISOString()
      };

      const saved = await saveOnlineExamSubmissionDirectToMysql(updated, { autoSyncToSas: false });
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal menyimpan progres jawaban ke MySQL.'
      });
    }
  });

  // 11. POST /api/online-exams/submit
  // Grades exam immediately, saves directly to MySQL online_exam_submissions AND merdeka_assessments (nilaiPas & nilaiSAS)
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

      const schedules = await getOnlineExamSchedulesFromMysql();
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        return res.status(404).json({ success: false, message: 'Jadwal ujian tidak ditemukan.' });
      }

      const packet = await getOnlineExamPacketByIdFromMysql(schedule.packetId);
      if (!packet) {
        return res.status(404).json({ success: false, message: 'Paket soal tidak ditemukan.' });
      }

      const existingSubs = await getOnlineExamSubmissionsFromMysql({ scheduleId, studentId });
      const current = existingSubs[0];

      const gpsEval = evaluateStudentSickStatusAndGps({
        schedule,
        studentId,
        studentNis: studentNis || current?.studentNis,
        studentName: studentName || current?.studentName,
        attendanceLogs: ctx.getAttendanceLogs(),
        studentLat: latitude !== undefined ? Number(latitude) : current?.gpsLatitude,
        studentLng: longitude !== undefined ? Number(longitude) : current?.gpsLongitude
      });

      const finalAnswers =
        answers && typeof answers === 'object' ? answers : current?.answers || {};

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

      const saved = await saveOnlineExamSubmissionDirectToMysql(submissionToSave, {
        autoSyncToSas: true,
        scoreTargetMode: targetMode,
        teacherName: schedule.creatorName || undefined
      });

      if (saved.syncedMerdekaAssessment) {
        ctx.upsertMerdekaAssessmentInMemory(saved.syncedMerdekaAssessment);
      }

      res.json(saved);
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
      const submissions = await getOnlineExamSubmissionsFromMysql({ scheduleId, studentId, packetId });
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
      const subs = await getOnlineExamSubmissionsFromMysql({ scheduleId, studentId });
      const target = subs.find(s => (submissionId ? s.id === submissionId : true));
      if (!target) {
        return res.status(404).json({ success: false, message: 'Data jawaban siswa tidak ditemukan.' });
      }

      const schedules = await getOnlineExamSchedulesFromMysql();
      const schedule = schedules.find(s => s.id === target.scheduleId);
      const packet = await getOnlineExamPacketByIdFromMysql(target.packetId);
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

      const saved = await saveOnlineExamSubmissionDirectToMysql(updated, {
        autoSyncToSas: true,
        scoreTargetMode: targetMode,
        teacherName: schedule.creatorName || undefined
      });
      if (saved.syncedMerdekaAssessment) {
        ctx.upsertMerdekaAssessmentInMemory(saved.syncedMerdekaAssessment);
      }

      res.json(saved);
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

      const schedules = await getOnlineExamSchedulesFromMysql();
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        await saveOnlineExamScheduleToMysql({
          ...schedule,
          scoreTargetMode,
          scoringConfig: {
            ...schedule.scoringConfig,
            scoreTargetMode,
            autoSyncToSas: true
          }
        });
      }

      const subs = await getOnlineExamSubmissionsFromMysql({ scheduleId });
      const gradedSubs = subs.filter(s => s.status !== 'in_progress');
      let syncedCount = 0;

      for (const sub of gradedSubs) {
        const saved = await saveOnlineExamSubmissionDirectToMysql(
          {
            ...sub,
            status: 'graded',
            syncedToSas: true,
            scoreTargetMode
          },
          {
            autoSyncToSas: true,
            scoreTargetMode,
            teacherName: teacherName || schedule?.creatorName || undefined
          }
        );
        if (saved.syncedMerdekaAssessment) {
          ctx.upsertMerdekaAssessmentInMemory(saved.syncedMerdekaAssessment);
          syncedCount++;
        }
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

  return router;
}
