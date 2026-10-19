// Utility for canonical subject and class matching across the application

export const MASTER_SUBJECTS_LIST: string[] = [
  'Pendidikan Agama Islam',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'Informatika',
  'Muatan Lokal: Bahasa Daerah',
  'Bahasa Arab',
  'Ke-NU-an / Aswaja'
];

export const normalizeSubject = (subj?: string): string => {
  if (!subj) return '';
  const s = subj.trim().toLowerCase();
  if (s === 'pai' || s.includes('agama islam')) return 'Pendidikan Agama Islam';
  if (s.includes('pancasila') || s === 'pkn' || s === 'ppkn') return 'Pendidikan Pancasila';
  if (s === 'b. indonesia' || s === 'bahasa indonesia' || s === 'bindo' || s.includes('indonesia')) return 'Bahasa Indonesia';
  if (s === 'mtk' || s === 'mat' || s.includes('matematika')) return 'Matematika';
  if (s === 'ipa' || s.includes('pengetahuan alam')) return 'Ilmu Pengetahuan Alam (IPA)';
  if (s === 'ips' || s.includes('pengetahuan sosial')) return 'Ilmu Pengetahuan Sosial (IPS)';
  if (s === 'b. inggris' || s === 'bahasa inggris' || s === 'bing' || s.includes('inggris')) return 'Bahasa Inggris';
  if (s.includes('seni') || s.includes('budaya') || s === 'sbk') return 'Seni Budaya';
  if (s === 'pjok' || s.includes('jasmani') || s.includes('olahraga') || s.includes('penjas')) return 'Pendidikan Jasmani, Olahraga, dan Kesehatan';
  if (s.includes('informatika') || s.includes('komputer') || s === 'infor' || s === 'tik') return 'Informatika';
  if (s === 'b. daerah' || s === 'bahasa daerah' || s.includes('jawa') || s.includes('muatan lokal') || s === 'mulok' || s === 'bjawa') return 'Muatan Lokal: Bahasa Daerah';
  if (s.includes('prakarya')) return 'Prakarya';
  if (s.includes('aswaja') || s.includes('ke-nu-an')) return 'Ke-NU-an / Aswaja';
  if (s.includes('arab')) return 'Bahasa Arab';
  if (s.includes('konseling') || s === 'bk') return 'Bimbingan Konseling';
  if (s.includes('kokurikuler') || s.includes('p5')) return 'Kokurikuler';
  return subj.trim();
};

export const toMasterSubjectName = (subj?: string, customMasterList?: Array<{ name: string; code?: string }>): string => {
  if (!subj) return '';
  const trimmed = subj.trim();
  if (!trimmed) return '';

  if (customMasterList && customMasterList.length > 0) {
    const found = customMasterList.find(m => 
      m.name.toLowerCase().trim() === trimmed.toLowerCase() ||
      (m.code && m.code.toLowerCase().trim() === trimmed.toLowerCase()) ||
      isSameSubject(m.name, trimmed) ||
      (m.code && isSameSubject(m.code, trimmed))
    );
    if (found) return found.name;
  }

  const matchMaster = MASTER_SUBJECTS_LIST.find(m => isSameSubject(m, trimmed));
  if (matchMaster) return matchMaster;

  return normalizeSubject(trimmed);
};

export const isSameSubject = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  const sA = a.toLowerCase().trim();
  const sB = b.toLowerCase().trim();
  if (sA === sB) return true;
  return normalizeSubject(a).toLowerCase() === normalizeSubject(b).toLowerCase();
};

export const normClass = (cls?: string): string => {
  return (cls || '').replace(/[\s-]/g, '').toUpperCase();
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
