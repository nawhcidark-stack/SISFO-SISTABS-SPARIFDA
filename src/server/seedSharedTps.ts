import { SharedLearningObjective, CurriculumSubject, CurriculumTpDescription } from '../types';

// Sesuai arahan: Contoh/dummy TP dihapus total dari Bank TP Bersama.
// Bank TP Bersama hanya menyisakan TP guru yang memang sudah dibuat oleh admin di panel admin utama, guru mapel, atau wali kelas.
export const DEFAULT_SHARED_TPS: Array<Omit<SharedLearningObjective, 'id' | 'createdAt' | 'updatedAt'>> = [];

export function generateSeedSharedTps(
  subjects: CurriculumSubject[] = [],
  tpDescriptions: CurriculumTpDescription[] = []
): SharedLearningObjective[] {
  const list: SharedLearningObjective[] = [];
  const now = new Date().toISOString();

  // Hanya ambil TP yang benar-benar dibuat oleh admin, guru mapel, atau wali kelas
  tpDescriptions.forEach(desc => {
    if (!desc.gradeLevel) return;
    const gLevel = String(desc.gradeLevel).trim();
    const sem = desc.semester || 'Ganjil';
    const yr = desc.academicYear || '2026/2027';

    // Ekstrak nama mata pelajaran jika belum ada secara eksplisit
    let subRaw = desc.subject || '';
    if (!subRaw && desc.id) {
      const m = desc.id.match(/^tpl-\d+-([a-z0-9_]+)-(ganjil|genap)/i);
      if (m) {
        subRaw = m[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Cari subjek yang sesuai di daftar mata pelajaran kurikulum
    let matchedSub = subjects.find(s => {
      const sName = s.name.toLowerCase();
      const raw = subRaw.toLowerCase();
      return sName === raw || s.id === desc.subjectId || sName.includes(raw) || raw.includes(sName);
    });

    const subId = matchedSub ? matchedSub.id : (desc.subjectId || `mapel-${subRaw.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    const subName = matchedSub ? matchedSub.name : (subRaw || 'Mata Pelajaran');
    const subCode = matchedSub ? matchedSub.code : (subName.slice(0, 4).toUpperCase());

    ([1, 2, 3, 4] as const).forEach(num => {
      const field = `tp${num}Name` as keyof CurriculumTpDescription;
      const text = desc[field];
      if (typeof text === 'string' && text.trim().length > 3) {
        const id = `tp-${subId}-${gLevel}-${sem.toLowerCase()}-${num}`;
        const exists = list.find(item => 
          item.id === id || 
          (item.subjectId === subId && item.gradeLevel === gLevel && item.tpNumber === num && item.semester.toLowerCase() === sem.toLowerCase())
        );

        if (!exists) {
          list.push({
            id,
            code: `TP-${subCode}-${gLevel}.${num}`,
            subjectId: subId,
            subjectName: subName,
            gradeLevel: gLevel,
            semester: sem,
            academicYear: yr,
            tpNumber: num,
            title: text.trim().replace(/\n+/g, ' '),
            creatorName: desc.filledBy || 'Admin Kurikulum',
            creatorRole: desc.filledByRole || 'Admin / Guru Pengampu',
            status: 'Disetujui',
            createdAt: desc.filledAt || now,
            updatedAt: desc.updatedAt || now
          });
        }
      }
    });
  });

  return list;
}
