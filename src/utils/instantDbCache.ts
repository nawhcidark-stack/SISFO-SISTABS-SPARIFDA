import {
  Student,
  SppBill,
  SavingsTransaction,
  RealtimeNotification,
  SchoolIdentity,
  HomeroomTeacher,
  AttendanceLog,
  SubjectTeacher,
  TeachingJournal,
  MiscBill,
  MerdekaAssessment,
  ClassSchedule
} from '../types';

const BOOT_STORAGE_KEY = 'smp_instant_boot_v1';
const IDB_NAME = 'smp_maarif_instant_db_v1';
const IDB_STORE = 'collections';
const IDB_VERSION = 1;

export interface InstantBootSnapshot {
  schoolIdentity?: SchoolIdentity;
  students?: Student[];
  homerooms?: HomeroomTeacher[];
  subjectTeachers?: SubjectTeacher[];
  schedules?: ClassSchedule[];
  sysStatus?: any;
  notifications?: RealtimeNotification[];
  recentAttendance?: AttendanceLog[];
  recentJournals?: TeachingJournal[];
  updatedAt?: number;
}

let memoryBootCache: InstantBootSnapshot | null = null;
let bootCacheLoaded = false;

function scheduleIdleWrite(fn: () => void, delayMs: number = 300) {
  if (typeof window === 'undefined') return;
  const win = window as any;
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(() => {
      try {
        fn();
      } catch {}
    }, { timeout: 1500 });
  } else {
    setTimeout(() => {
      try {
        fn();
      } catch {}
    }, delayMs);
  }
}

export function getInstantBootSnapshot(): InstantBootSnapshot {
  if (bootCacheLoaded && memoryBootCache) {
    return memoryBootCache;
  }
  bootCacheLoaded = true;
  if (typeof window === 'undefined') {
    memoryBootCache = {};
    return memoryBootCache;
  }
  try {
    const raw = localStorage.getItem(BOOT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryBootCache = parsed;
        return memoryBootCache!;
      }
    }
  } catch {
    // Ignore corrupted cache
  }
  memoryBootCache = {};
  return memoryBootCache;
}

const pendingBootUpdates: Partial<InstantBootSnapshot> = {};
let bootSaveTimer: ReturnType<typeof setTimeout> | null = null;

function stripLargeBase64FromIdentity(identity?: SchoolIdentity): SchoolIdentity | undefined {
  if (!identity) return undefined;
  const clone: any = { ...identity };
  const largeKeys = [
    'letterhead',
    'principalSignature',
    'treasurerSignature',
    'schoolStamp',
    'paymentCardTemplate',
    'treasurerSkUrl',
    'sarprasSkUrl'
  ];
  for (const k of largeKeys) {
    if (typeof clone[k] === 'string' && clone[k].length > 35000) {
      delete clone[k];
    }
  }
  if (typeof clone.logo === 'string' && clone.logo.length > 80000) {
    delete clone.logo;
  }
  if (typeof clone.logo2 === 'string' && clone.logo2.length > 80000) {
    delete clone.logo2;
  }
  return clone;
}

export function updateInstantBootSnapshot(partial: Partial<InstantBootSnapshot>): void {
  const current = getInstantBootSnapshot();
  Object.assign(current, partial);
  Object.assign(pendingBootUpdates, partial);

  if (bootSaveTimer) {
    clearTimeout(bootSaveTimer);
  }
  bootSaveTimer = setTimeout(() => {
    bootSaveTimer = null;
    scheduleIdleWrite(() => {
      try {
        const snapshotToSave: InstantBootSnapshot = {
          schoolIdentity: stripLargeBase64FromIdentity(current.schoolIdentity),
          students: Array.isArray(current.students) ? current.students : undefined,
          homerooms: Array.isArray(current.homerooms) ? current.homerooms : undefined,
          subjectTeachers: Array.isArray(current.subjectTeachers) ? current.subjectTeachers : undefined,
          schedules: Array.isArray(current.schedules) ? current.schedules : undefined,
          sysStatus: current.sysStatus,
          notifications: Array.isArray(current.notifications) ? current.notifications.slice(0, 40) : undefined,
          recentAttendance: Array.isArray(current.recentAttendance) ? current.recentAttendance : undefined,
          recentJournals: Array.isArray(current.recentJournals) ? current.recentJournals : undefined,
          updatedAt: Date.now()
        };
        localStorage.setItem(BOOT_STORAGE_KEY, JSON.stringify(snapshotToSave));
      } catch {
        // Fallback: if localStorage quota is tight, save without recentAttendance/recentJournals
        try {
          const minimalSnapshot: InstantBootSnapshot = {
            schoolIdentity: stripLargeBase64FromIdentity(current.schoolIdentity),
            students: Array.isArray(current.students) ? current.students : undefined,
            homerooms: Array.isArray(current.homerooms) ? current.homerooms : undefined,
            subjectTeachers: Array.isArray(current.subjectTeachers) ? current.subjectTeachers : undefined,
            schedules: Array.isArray(current.schedules) ? current.schedules : undefined,
            sysStatus: current.sysStatus,
            updatedAt: Date.now()
          };
          localStorage.setItem(BOOT_STORAGE_KEY, JSON.stringify(minimalSnapshot));
        } catch {}
      }
    });
  }, 250);
}

export function extractCompactRecentAttendance(logs: AttendanceLog[]): AttendanceLog[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];
  // Sort or pick logs with subjectNotes and most recent dates (max 1200 logs)
  const withSubjectNotes: AttendanceLog[] = [];
  const recentPlain: AttendanceLog[] = [];
  for (let i = logs.length - 1; i >= 0; i--) {
    const l = logs[i];
    if (!l) continue;
    if (Array.isArray(l.subjectNotes) && l.subjectNotes.length > 0) {
      if (withSubjectNotes.length < 900) withSubjectNotes.push(l);
    } else if (recentPlain.length < 300) {
      recentPlain.push(l);
    }
    if (withSubjectNotes.length >= 900 && recentPlain.length >= 300) break;
  }
  return [...withSubjectNotes, ...recentPlain];
}

export function extractCompactRecentJournals(journals: TeachingJournal[]): TeachingJournal[] {
  if (!Array.isArray(journals) || journals.length === 0) return [];
  return journals
    .filter(j => j && !String(j.id || '').startsWith('tj-absent-'))
    .slice(0, 250);
}

// --- Tier 2: Non-Blocking IndexedDB Cache for Full Collections ---
let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise(resolve => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function getIdbCollection<T = any>(key: string): Promise<T | null> {
  const db = await getIdb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

const idbWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function setIdbCollection<T = any>(key: string, value: T): void {
  const prevTimer = idbWriteTimers.get(key);
  if (prevTimer) clearTimeout(prevTimer);

  const timer = setTimeout(() => {
    idbWriteTimers.delete(key);
    scheduleIdleWrite(async () => {
      const db = await getIdb();
      if (!db) return;
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
      } catch {}
    });
  }, 350);

  idbWriteTimers.set(key, timer);
}

export type CachedDatasetMap = {
  schoolIdentity: SchoolIdentity;
  students: Student[];
  bills: SppBill[];
  miscBills: MiscBill[];
  transactions: SavingsTransaction[];
  attendance: AttendanceLog[];
  homerooms: HomeroomTeacher[];
  subjectTeachers: SubjectTeacher[];
  schedules: ClassSchedule[];
  merdekaAssessments: MerdekaAssessment[];
  teachingJournals: TeachingJournal[];
};
