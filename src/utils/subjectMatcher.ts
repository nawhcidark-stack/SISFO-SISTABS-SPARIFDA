// Utility for canonical subject and class matching across the application

export const MASTER_SUBJECTS_LIST: string[] = [
  'Pendidikan Agama Islam',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'Informatika',
  'Seni Budaya',
  'Muatan Lokal: Bahasa Daerah',
  "Baca Tulis Al Qur'an"
];

const normalizeSubjectCache = new Map<string, string>();

export const normalizeSubject = (subj?: string): string => {
  if (!subj) return '';
  const cached = normalizeSubjectCache.get(subj);
  if (cached !== undefined) return cached;

  const s = subj.trim().toLowerCase().replace(/\s+/g, ' ');
  let res = subj.trim();
  if (s === 'btq' || s === 'bta' || s.includes('baca tulis') || s.includes('al qur') || s.includes('alqur')) res = "Baca Tulis Al Qur'an";
  else if (s === 'pai' || s.includes('agama islam')) res = 'Pendidikan Agama Islam';
  else if (s.includes('pancasila') || s === 'pkn' || s === 'ppkn') res = 'Pendidikan Pancasila';
  else if (s === 'b. indonesia' || s === 'bahasa indonesia' || s === 'bindo' || s.includes('indonesia')) res = 'Bahasa Indonesia';
  else if (s === 'mtk' || s === 'mat' || s.includes('matematika')) res = 'Matematika';
  else if (s === 'ipa' || s.includes('pengetahuan alam') || s === 'ilmu pengetahuan alam' || s === 'ilmu pengetahuan alam (ipa)' || s === 'ilmu pengetahuan alam(ipa)') res = 'Ilmu Pengetahuan Alam (IPA)';
  else if (s === 'ips' || s.includes('pengetahuan sosial') || s === 'ilmu pengetahuan sosial' || s === 'ilmu pengetahuan sosial (ips)' || s === 'ilmu pengetahuan sosial(ips)') res = 'Ilmu Pengetahuan Sosial (IPS)';
  else if (s === 'b. inggris' || s === 'bahasa inggris' || s === 'bing' || s.includes('inggris')) res = 'Bahasa Inggris';
  else if (s.includes('seni') || s.includes('budaya') || s === 'sbk') res = 'Seni Budaya';
  else if (s === 'pjok' || s.includes('jasmani') || s.includes('olahraga') || s.includes('penjas')) res = 'Pendidikan Jasmani, Olahraga, dan Kesehatan';
  else if (s.includes('informatika') || s.includes('komputer') || s === 'infor' || s === 'tik') res = 'Informatika';
  else if (s === 'b. daerah' || s === 'bahasa daerah' || s.includes('jawa') || s.includes('muatan lokal') || s === 'mulok' || s === 'bjawa') res = 'Muatan Lokal: Bahasa Daerah';
  else if (s.includes('prakarya')) res = 'Prakarya';
  else if (s.includes('aswaja') || s.includes('ke-nu-an')) res = 'Ke-NU-an / Aswaja';
  else if (s.includes('arab')) res = 'Bahasa Arab';
  else if (s.includes('konseling') || s === 'bk') res = 'Bimbingan Konseling';
  else if (s.includes('kokurikuler') || s.includes('p5')) res = 'Kokurikuler';

  normalizeSubjectCache.set(subj, res);
  return res;
};

export const toMasterSubjectName = (subj?: string, customMasterList?: Array<{ name: string; code?: string }>): string => {
  if (!subj) return '';
  const trimmed = subj.trim();
  if (!trimmed) return '';

  if (customMasterList && customMasterList.length > 0) {
    const normInput = normalizeSubject(trimmed).toLowerCase();
    const cleanInput = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact match on name or code
    const exact = customMasterList.find(m => 
      m.name.toLowerCase().trim() === trimmed.toLowerCase() ||
      (m.code && m.code.toLowerCase().trim() === trimmed.toLowerCase())
    );
    if (exact) return exact.name;

    // 2. Normalized subject equality
    const normMatch = customMasterList.find(m => {
      const normM = normalizeSubject(m.name).toLowerCase();
      const normCode = m.code ? normalizeSubject(m.code).toLowerCase() : '';
      return normM === normInput || (normCode && normCode === normInput);
    });
    if (normMatch) return normMatch.name;

    // 3. Clean string equality (ignoring punctuation and spaces, e.g. "ilmupengetahuanalamipa")
    const cleanMatch = customMasterList.find(m => {
      const cleanM = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanCode = (m.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanM === cleanInput || (cleanCode && cleanCode === cleanInput);
    });
    if (cleanMatch) return cleanMatch.name;

    // 4. isSameSubject check
    const sameCheck = customMasterList.find(m => isSameSubject(m.name, trimmed) || (m.code && isSameSubject(m.code, trimmed)));
    if (sameCheck) return sameCheck.name;
  }

  const matchMaster = MASTER_SUBJECTS_LIST.find(m => isSameSubject(m, trimmed));
  if (matchMaster) return matchMaster;

  return normalizeSubject(trimmed);
};

export const isSameSubject = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  const nA = normalizeSubject(a);
  const nB = normalizeSubject(b);
  return nA === nB || nA.toLowerCase() === nB.toLowerCase();
};

const normClassCache = new Map<string, string>();

export const normClass = (cls?: string): string => {
  if (!cls) return '';
  const cached = normClassCache.get(cls);
  if (cached !== undefined) return cached;
  const res = cls.replace(/[\s-]/g, '').toUpperCase();
  normClassCache.set(cls, res);
  return res;
};

export const isSameClass = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  return normClass(a) === normClass(b);
};

export const isSameSemester = (a?: string, b?: string): boolean => {
  if (!a || !b) return true; // If one is empty, treat as matching
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

export const isSameAcademicYear = (a?: string, b?: string): boolean => {
  if (!a || !b) return true;
  const cleanA = a.replace(/[\s-]/g, '/').toLowerCase();
  const cleanB = b.replace(/[\s-]/g, '/').toLowerCase();
  return cleanA === cleanB;
};
