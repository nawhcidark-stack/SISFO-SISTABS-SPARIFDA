import { Student, MerdekaAssessment, CurriculumSubject, SchoolIdentity, CurriculumTpDescription, SharedLearningObjective } from '../types';
import { isSameSubject } from './subjectMatcher';

export interface RaporExtracurricularItem {
  no: number;
  name: string;
  predicate: string;
  description: string;
}

export interface RaporStudentRecord {
  studentId: string;
  nis?: string;
  semester?: string;
  academicYear?: string;
  note?: string;
  extracurriculars?: RaporExtracurricularItem[];
  attendanceOverride?: {
    sakit?: number | null;
    izin?: number | null;
    alpa?: number | null;
  };
  customDescriptions?: Record<string, string>;
  updatedAt?: string;
}

export interface RaporSemesterDataConfig {
  settings: {
    place: string;
    midtermDate: string;
    finalDate: string;
    schoolName: string;
    schoolAddress: string;
    principalName: string;
    fase: string;
    showHomeroomNameInSig?: boolean;
  };
  studentRecords: Record<string, RaporStudentRecord>;
}

export interface RaporSubjectRow {
  id: string;
  orderNo: number;
  subject: string;
  displayName: string;
  code: string;
  category: string;
  kktp: number;
  avgTp: number;
  koku: number;
  pts: number;
  pas: number;
  naPts: number;
  naAkhir: number;
  descPts: string;
  descAkhir: string;
  highestTpText?: string;
  highestTpScore?: number;
  lowestTpText?: string;
  lowestTpScore?: number;
  hasAssessment: boolean;
}

export const DEFAULT_EXTRACURRICULARS: RaporExtracurricularItem[] = [
  {
    no: 1,
    name: '-',
    predicate: '-',
    description: '-'
  },
  {
    no: 2,
    name: '-',
    predicate: '-',
    description: '-'
  },
  {
    no: 3,
    name: '-',
    predicate: '-',
    description: '-'
  }
];

export function isDummyTpDescription(raw?: string): boolean {
  if (!raw) return true;
  const s = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!s || s === '-') return true;
  const dummyPatterns = [
    'memahami konsep dasar dan penerapannya',
    'menganalisis materi dan studi kasus',
    'praktik dan refleksi pembiasaan',
    'evaluasi & pengerjaan proyek',
    'evaluasi dan pengerjaan proyek',
    'bahasa indonesia 2',
    'telah menunjukkan kompetensi sesuai kriteria',
    'mengidentifikasi elemen kompetensi dasar materi pembelajaran',
    'menyelesaikan tugas analisis praktis secara mandiri berfikir',
    'menyajikan hasil evaluasi materi dalam bentuk simpulan logis',
    'merefleksikan hasil pencapaian belajar demi perbaikan berkelanjutan'
  ];
  return dummyPatterns.some(d => s === d || s === `${d}.` || s.startsWith('memahami konsep dasar dan penerapannya '));
}

export function cleanTpPhrase(raw?: string): string {
  if (!raw || isDummyTpDescription(raw)) return '';
  let s = raw
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\[[^\]]+\]\s*/, '') // hapus [TP-8.1] jika ada
    .replace(/^(TP[\s-]*\d+[\s.:;-]*)/i, '') // hapus TP 1: jika ada
    .replace(/^(peserta didik\s+(mampu|dapat)\s+)/i, '')
    .replace(/^(peserta didik\s+)/i, '')
    .replace(/^(siswa\s+(mampu|dapat)\s+)/i, '')
    .replace(/^(mampu|dapat)\s+/i, '')
    .replace(/\s+(dengan\s+(sangat\s+baik|baik|cukup\s+baik))\.?$/i, '')
    .replace(/\.+$/, '')
    .trim();

  if (s.length > 1) {
    const firstWord = s.split(/\s+/)[0] || '';
    if (
      firstWord !== firstWord.toUpperCase() &&
      !firstWord.startsWith('Al') &&
      !firstWord.startsWith('Pancasila') &&
      !firstWord.startsWith('Indonesia') &&
      !firstWord.startsWith('Allah')
    ) {
      s = s.charAt(0).toLowerCase() + s.slice(1);
    }
  }
  return s;
}

/**
 * Huruf Pertama dan setelah Titik otomatis besar.
 */
export function formatCapaianCapitalization(rawText: string): string {
  if (!rawText) return '-';
  let s = rawText.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s === '-') return '-';

  // Pastikan diakhiri titik
  if (!/[.!?]$/.test(s)) {
    s += '.';
  }

  // Huruf pertama kalimat utama otomatis besar
  s = s.replace(/^([a-zà-ÿ])/i, (m) => m.toUpperCase());

  // Setiap huruf pertama setelah titik (.) otomatis besar, dan pastikan spasi rapi setelah titik
  s = s.replace(/\.\s*([a-zà-ÿ])/gi, (_, ch: string) => `. ${ch.toUpperCase()}`);

  return s;
}

function resolveTpLevelSubject(td: CurriculumTpDescription): string {
  if (td.subject && td.subject.trim()) return td.subject.trim();
  if (td.id) {
    const m = String(td.id).match(/^tpl-\d+-(.+?)-(ganjil|genap)-/i);
    if (m && m[1]) {
      return m[1].replace(/_/g, ' ').trim();
    }
  }
  return '';
}

export function cleanSubjectDisplayName(name: string, _isMulokSection: boolean = false): string {
  if (!name) return '';
  return name.trim();
}

function calcSingleTpScore(tugas?: any, uh?: any, fallbackGrade?: any): number | null {
  const t = tugas !== undefined && tugas !== null && tugas !== '' && !isNaN(Number(tugas)) ? Number(tugas) : null;
  const u = uh !== undefined && uh !== null && uh !== '' && !isNaN(Number(uh)) ? Number(uh) : null;
  if (t !== null && u !== null) return Math.round((t * 0.7) + (u * 0.3));
  if (t !== null) return Math.round(t);
  if (u !== null) return Math.round(u);
  if (fallbackGrade !== undefined && fallbackGrade !== null && fallbackGrade !== '' && !isNaN(Number(fallbackGrade)) && Number(fallbackGrade) > 0) {
    return Math.round(Number(fallbackGrade));
  }
  return null;
}

export function buildCapaianTujuanPembelajaran(params: {
  assessment?: MerdekaAssessment;
  allAssessmentsForSubject?: MerdekaAssessment[];
  tpDescriptions?: CurriculumTpDescription[];
  sharedTps?: SharedLearningObjective[];
  subjectName: string;
  subjectCode?: string;
  gradeLevel: string;
  semester: string;
  academicYear: string;
  kktp: number;
  naAkhir: number;
  customDescription?: string;
}): {
  descAkhir: string;
  highestTpText?: string;
  highestTpScore?: number;
  lowestTpText?: string;
  lowestTpScore?: number;
} {
  const {
    assessment,
    allAssessmentsForSubject = [],
    tpDescriptions = [],
    sharedTps = [],
    subjectName,
    subjectCode,
    gradeLevel,
    semester,
    kktp,
    naAkhir,
    customDescription
  } = params;

  if (customDescription && customDescription.trim().length > 0) {
    return { descAkhir: customDescription.trim() };
  }

  // 1. Ambil Deskripsi TP yang diinputkan di penilaian:
  // Prioritas: Deskripsi TP pada penilaian siswa -> Deskripsi TP tingkat/mapel -> Deskripsi TP siswa sekelas pada mapel sama -> Bank TP Bersama
  const matchedLevelDesc = tpDescriptions.find(td => {
    const tdSubj = resolveTpLevelSubject(td);
    return (
      String(td.gradeLevel || '').trim() === gradeLevel &&
      (isSameSubject(tdSubj, subjectName) || (subjectCode && isSameSubject(tdSubj, subjectCode))) &&
      (!semester || !td.semester || td.semester.toLowerCase() === semester.toLowerCase())
    );
  }) || tpDescriptions.find(td => {
    const tdSubj = resolveTpLevelSubject(td);
    return (
      String(td.gradeLevel || '').trim() === gradeLevel &&
      (isSameSubject(tdSubj, subjectName) || (subjectCode && isSameSubject(tdSubj, subjectCode)))
    );
  });

  const getValidPeerTp = (slot: 1 | 2 | 3 | 4): string => {
    const key = `tp${slot}Name` as const;
    const sameGradePeer = allAssessmentsForSubject.find(a =>
      (!gradeLevel || (a.className || '').includes(gradeLevel)) &&
      a[key] &&
      !isDummyTpDescription(a[key])
    );
    if (sameGradePeer && sameGradePeer[key]) return sameGradePeer[key] || '';
    const anyPeer = allAssessmentsForSubject.find(a => a[key] && !isDummyTpDescription(a[key]));
    return anyPeer?.[key] || '';
  };

  const getSharedTpTitle = (tpNum: number): string => {
    const tpIdKey = `tp${tpNum}Id` as 'tp1Id' | 'tp2Id' | 'tp3Id' | 'tp4Id';
    const linkedId = assessment?.[tpIdKey];
    if (linkedId) {
      const byId = sharedTps.find(st => st.id === linkedId && !isDummyTpDescription(st.title));
      if (byId?.title) return byId.title;
    }
    const found = sharedTps.find(st =>
      String(st.gradeLevel || '').trim() === gradeLevel &&
      (isSameSubject(st.subjectName, subjectName) || (subjectCode && isSameSubject(st.subjectId, subjectCode))) &&
      (!semester || !st.semester || st.semester.toLowerCase() === semester.toLowerCase()) &&
      Number(st.tpNumber) === tpNum &&
      !isDummyTpDescription(st.title)
    );
    return found?.title || '';
  };

  const pickRealTpName = (slot: 1 | 2 | 3 | 4): string => {
    const key = `tp${slot}Name` as 'tp1Name' | 'tp2Name' | 'tp3Name' | 'tp4Name';
    const candidates = [
      assessment?.[key],
      matchedLevelDesc?.[key],
      getValidPeerTp(slot),
      getSharedTpTitle(slot)
    ];
    for (const c of candidates) {
      const cleaned = cleanTpPhrase(c);
      if (cleaned) return cleaned;
    }
    return '';
  };

  const tpNames: Record<number, string> = {
    1: pickRealTpName(1),
    2: pickRealTpName(2),
    3: pickRealTpName(3),
    4: pickRealTpName(4)
  };

  const tpScores: Record<number, number | null> = {
    1: assessment ? (assessment.nilaiTp1 !== undefined && assessment.nilaiTp1 !== null ? Number(assessment.nilaiTp1) : calcSingleTpScore(assessment.tp1Tugas1, assessment.tp1Uh, assessment.tp1Grade)) : null,
    2: assessment ? (assessment.nilaiTp2 !== undefined && assessment.nilaiTp2 !== null ? Number(assessment.nilaiTp2) : calcSingleTpScore(assessment.tp2Tugas1, assessment.tp2Uh, assessment.tp2Grade)) : null,
    3: assessment ? (assessment.nilaiTp3 !== undefined && assessment.nilaiTp3 !== null ? Number(assessment.nilaiTp3) : calcSingleTpScore(assessment.tp3Tugas1, assessment.tp3Uh, assessment.tp3Grade)) : null,
    4: assessment ? (assessment.nilaiTp4 !== undefined && assessment.nilaiTp4 !== null ? Number(assessment.nilaiTp4) : calcSingleTpScore(assessment.tp4Tugas1, assessment.tp4Uh, assessment.tp4Grade)) : null
  };

  // Hanya gunakan TP yang memiliki nilai > 0 DAN memiliki Deskripsi TP asli dari penilaian (tanpa dummy)
  const validTps: Array<{ num: number; score: number; name: string }> = [];
  for (let i = 1; i <= 4; i++) {
    const sc = tpScores[i];
    const tpText = tpNames[i];
    if (sc !== null && !isNaN(sc) && sc > 0 && tpText) {
      validTps.push({
        num: i,
        score: sc,
        name: tpText
      });
    }
  }

  if (validTps.length > 0) {
    // 1. Kompetensi Tertinggi (Kelebihan): Materi/TP yang paling dikuasai (Nilai >= KKTP)
    const aboveKktp = validTps
      .filter(t => t.score >= kktp)
      .sort((a, b) => b.score - a.score);

    // 2. Kompetensi Terendah (Perlu Bimbingan/Peningkatan): Materi/TP yang belum sepenuhnya dikuasai (Nilai < KKTP)
    const belowKktp = validTps
      .filter(t => t.score < kktp)
      .sort((a, b) => a.score - b.score);

    const highestTp = aboveKktp[0];
    const lowestTp = belowKktp[0];

    if (highestTp && lowestTp) {
      return {
        descAkhir: formatCapaianCapitalization(
          `Peserta didik menunjukkan penguasaan yang sangat baik dalam ${highestTp.name}. Perlu meningkatkan pemahaman dalam ${lowestTp.name}.`
        ),
        highestTpText: highestTp.name,
        highestTpScore: highestTp.score,
        lowestTpText: lowestTp.name,
        lowestTpScore: lowestTp.score
      };
    }

    if (highestTp) {
      return {
        descAkhir: formatCapaianCapitalization(
          `Peserta didik menunjukkan penguasaan yang sangat baik dalam ${highestTp.name}.`
        ),
        highestTpText: highestTp.name,
        highestTpScore: highestTp.score
      };
    }

    if (lowestTp) {
      return {
        descAkhir: formatCapaianCapitalization(
          `Peserta didik perlu meningkatkan pemahaman dalam ${lowestTp.name}.`
        ),
        lowestTpText: lowestTp.name,
        lowestTpScore: lowestTp.score
      };
    }
  }

  // Jika nilai per-TP belum dirinci tetapi Nilai Akhir ada dan Deskripsi TP telah diinput di penilaian:
  const firstRealTpText = tpNames[1] || tpNames[2] || tpNames[3] || tpNames[4];
  if (naAkhir > 0 && firstRealTpText) {
    if (naAkhir >= kktp) {
      return {
        descAkhir: formatCapaianCapitalization(
          `Peserta didik menunjukkan penguasaan yang sangat baik dalam ${firstRealTpText}.`
        ),
        highestTpText: firstRealTpText,
        highestTpScore: naAkhir
      };
    } else {
      return {
        descAkhir: formatCapaianCapitalization(
          `Peserta didik perlu meningkatkan pemahaman dalam ${firstRealTpText}.`
        ),
        lowestTpText: firstRealTpText,
        lowestTpScore: naAkhir
      };
    }
  }

  // Jika guru mengisi deskripsiCapaian secara spesifik (bukan teks default sistem)
  if (
    naAkhir > 0 &&
    assessment?.deskripsiCapaian &&
    !isDummyTpDescription(assessment.deskripsiCapaian)
  ) {
    return {
      descAkhir: formatCapaianCapitalization(assessment.deskripsiCapaian)
    };
  }

  return { descAkhir: '-' };
}

export function splitSubjectsForTwoPageRapor(rows: RaporSubjectRow[]): {
  page1Subjects: RaporSubjectRow[];
  page2IntraSubjects: RaporSubjectRow[];
  page2MulokSubjects: RaporSubjectRow[];
} {
  // Sesuai ketentuan:
  // Halaman 1: Mapel No 1 - 9
  // Halaman 2: Mapel No 10, serta Muatan Lokal No urut 11 - 12 (dst)
  const page1Subjects = rows.slice(0, 9).map((r, idx) => ({
    ...r,
    orderNo: idx + 1,
    displayName: cleanSubjectDisplayName(r.subject, false)
  }));

  const remaining = rows.slice(9);
  const page2IntraSubjects: RaporSubjectRow[] = [];
  const page2MulokSubjects: RaporSubjectRow[] = [];

  remaining.forEach((r, idx) => {
    const orderNo = 10 + idx;
    const isMulok =
      (r.category || '').toLowerCase().includes('lokal') ||
      (r.subject || '').toLowerCase().includes('muatan lokal') ||
      (r.subject || '').toLowerCase().includes('bahasa daerah') ||
      (r.subject || '').toLowerCase().includes('baca tulis') ||
      (r.code || '').toUpperCase() === 'MULOK' ||
      (r.code || '').toUpperCase() === 'BTQ' ||
      orderNo >= 11;

    if (isMulok && page2IntraSubjects.length >= 1) {
      page2MulokSubjects.push({
        ...r,
        orderNo,
        displayName: cleanSubjectDisplayName(r.subject, true)
      });
    } else if (!isMulok || page2IntraSubjects.length === 0) {
      page2IntraSubjects.push({
        ...r,
        orderNo,
        displayName: cleanSubjectDisplayName(r.subject, false)
      });
    } else {
      page2MulokSubjects.push({
        ...r,
        orderNo,
        displayName: cleanSubjectDisplayName(r.subject, true)
      });
    }
  });

  return {
    page1Subjects,
    page2IntraSubjects,
    page2MulokSubjects
  };
}

export function formatClassLabelForRapor(cls?: string): string {
  if (!cls) return '-';
  return cls.trim();
}

export function printRaporAkhirSemesterF4(params: {
  studentsToPrint: Student[];
  getStudentSubjectRows: (st: Student) => RaporSubjectRow[];
  getStudentAttendance: (st: Student) => { Sakit: number; Izin: number; Alpa: number };
  getStudentRaporRecord: (st: Student) => RaporStudentRecord | undefined;
  getHomeroomTeacherName: (st: Student) => string;
  raporSettings: RaporSemesterDataConfig['settings'];
  semester: string;
  academicYear: string;
  schoolIdentity?: SchoolIdentity;
  formattedDateStr: string;
}) {
  const {
    studentsToPrint,
    getStudentSubjectRows,
    getStudentAttendance,
    getStudentRaporRecord,
    getHomeroomTeacherName,
    raporSettings,
    semester,
    academicYear,
    schoolIdentity,
    formattedDateStr
  } = params;

  if (!studentsToPrint || studentsToPrint.length === 0) {
    alert('Tidak ada siswa yang dipilih untuk dicetak rapornya.');
    return;
  }

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan pada browser Anda.');
    return;
  }

  const schoolName = (schoolIdentity?.name || raporSettings.schoolName || "SMP MA'ARIF NU PANDAAN").toUpperCase();
  const schoolAddress = schoolIdentity?.address || (raporSettings.schoolAddress && raporSettings.schoolAddress !== 'Jl. Raya A. Yani No. 92' ? raporSettings.schoolAddress : '') || 'Pandaan, Pasuruan';
  const place = raporSettings.place || 'Pandaan';
  const principalName = (raporSettings.principalName && raporSettings.principalName !== 'H. Lasudi, S.Pd.' ? raporSettings.principalName : '') || schoolIdentity?.principal || 'Kepala Sekolah';
  const fase = raporSettings.fase || 'D';

  const renderIdentityHeaderHtml = (st: Student) => {
    const classDisplay = formatClassLabelForRapor(st.class);
    const nis = (st.nis || '-').trim();
    const nisn = (st.nisn || '-').trim();
    return `
      <div class="identity-box">
        <table class="identity-table">
          <tr>
            <td class="id-label-left">Nama Peserta Didik</td>
            <td class="id-colon">:</td>
            <td class="id-val-left">${(st.name || '').toUpperCase()}</td>
            <td class="id-label-right">Kelas</td>
            <td class="id-colon">:</td>
            <td class="id-val-right">${classDisplay}</td>
          </tr>
          <tr>
            <td class="id-label-left">NIS / NISN</td>
            <td class="id-colon">:</td>
            <td class="id-val-left">${nis} / ${nisn}</td>
            <td class="id-label-right">Fase</td>
            <td class="id-colon">:</td>
            <td class="id-val-right">${fase}</td>
          </tr>
          <tr>
            <td class="id-label-left">Sekolah</td>
            <td class="id-colon">:</td>
            <td class="id-val-left">${schoolName}</td>
            <td class="id-label-right">Semester</td>
            <td class="id-colon">:</td>
            <td class="id-val-right">${semester}</td>
          </tr>
          <tr>
            <td class="id-label-left">Alamat</td>
            <td class="id-colon">:</td>
            <td class="id-val-left">${schoolAddress}</td>
            <td class="id-label-right">Tahun Pelajaran</td>
            <td class="id-colon">:</td>
            <td class="id-val-right">${academicYear}</td>
          </tr>
        </table>
      </div>
    `;
  };

  const renderFooterHtml = (st: Student, pageNum: number) => {
    const classDisplay = formatClassLabelForRapor(st.class);
    return `
      <div class="page-footer">
        <div class="footer-left">${classDisplay} | ${(st.name || '').toUpperCase()} | ${st.nis || '-'}</div>
        <div class="footer-right">Halaman | ${pageNum}</div>
      </div>
    `;
  };

  const allPagesHtml = studentsToPrint.map((st) => {
    const rows = getStudentSubjectRows(st);
    const { page1Subjects, page2IntraSubjects, page2MulokSubjects } = splitSubjectsForTwoPageRapor(rows);
    const record = getStudentRaporRecord(st);
    const rawAtt = getStudentAttendance(st);

    // Ketidakhadiran otomatis dari sistem absensi
    const sakitVal = rawAtt.Sakit;
    const izinVal = rawAtt.Izin;
    const alpaVal = rawAtt.Alpa;

    const ekskulList: RaporExtracurricularItem[] =
      record?.extracurriculars && record.extracurriculars.length > 0
        ? record.extracurriculars
        : DEFAULT_EXTRACURRICULARS;

    // Ensure at least 3 rows for Ekstrakurikuler table as in the reference PDF
    const normalizedEkskul: RaporExtracurricularItem[] = [1, 2, 3].map((num, idx) => {
      const item = ekskulList[idx];
      if (!item) {
        return { no: num, name: '-', predicate: '-', description: '-' };
      }
      return {
        no: num,
        name: item.name?.trim() || '-',
        predicate: item.predicate?.trim() || '-',
        description: item.description?.trim() || '-'
      };
    });

    const homeroomName = getHomeroomTeacherName(st);

    const page1RowsHtml = page1Subjects.map((s) => {
      const val = s.naAkhir > 0 ? s.naAkhir : (s.naPts > 0 ? s.naPts : '-');
      return `
        <tr class="subject-row-p1">
          <td class="col-no">${s.orderNo}</td>
          <td class="col-mapel">${s.displayName}</td>
          <td class="col-nilai">${val}</td>
          <td class="col-capaian">${s.descAkhir || '-'}</td>
        </tr>
      `;
    }).join('');

    const page2IntraHtml = page2IntraSubjects.map((s) => {
      const val = s.naAkhir > 0 ? s.naAkhir : (s.naPts > 0 ? s.naPts : '-');
      return `
        <tr class="subject-row-p2">
          <td class="col-no">${s.orderNo}</td>
          <td class="col-mapel">${s.displayName}</td>
          <td class="col-nilai">${val}</td>
          <td class="col-capaian">${s.descAkhir || '-'}</td>
        </tr>
      `;
    }).join('');

    const page2MulokHtml = page2MulokSubjects.map((s) => {
      const val = s.naAkhir > 0 ? s.naAkhir : (s.naPts > 0 ? s.naPts : '-');
      return `
        <tr class="subject-row-p2">
          <td class="col-no">${s.orderNo}</td>
          <td class="col-mapel">${s.displayName}</td>
          <td class="col-nilai">${val}</td>
          <td class="col-capaian">${s.descAkhir || '-'}</td>
        </tr>
      `;
    }).join('');

    const ekskulRowsHtml = normalizedEkskul.map((ek) => `
      <tr>
        <td class="ek-no">${ek.no}</td>
        <td class="ek-name">${ek.name}</td>
        <td class="ek-pred">${ek.predicate}</td>
        <td class="ek-desc">${ek.description}</td>
      </tr>
    `).join('');

    return `
      <!-- HALAMAN 1 -->
      <div class="rapor-f4-page rapor-f4-page-p1">
        <div class="page-body page-body-p1">
          ${renderIdentityHeaderHtml(st)}

          <div class="report-main-title">LAPORAN HASIL BELAJAR</div>
          <div class="section-heading">A. &nbsp;INTRAKURIKULER</div>

          <div class="table-p1-wrap">
            <table class="rapor-table rapor-table-p1">
              <thead>
                <tr>
                  <th class="th-no">No</th>
                  <th class="th-mapel">Muatan Pelajaran</th>
                  <th class="th-nilai">Nilai<br/>Akhir</th>
                  <th class="th-capaian">Capaian Tujuan Pembelajaran</th>
                </tr>
              </thead>
              <tbody>
                ${page1RowsHtml}
              </tbody>
            </table>
          </div>
        </div>
        ${renderFooterHtml(st, 1)}
      </div>

      <!-- HALAMAN 2 -->
      <div class="rapor-f4-page rapor-f4-page-p2">
        <div class="page-body">
          ${renderIdentityHeaderHtml(st)}

          <table class="rapor-table" style="margin-top: 6px;">
            <thead>
              <tr>
                <th class="th-no">No</th>
                <th class="th-mapel">Muatan Pelajaran</th>
                <th class="th-nilai">Nilai<br/>Akhir</th>
                <th class="th-capaian">Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody>
              ${page2IntraHtml}
              <tr class="mulok-divider-row">
                <td colspan="4" class="mulok-divider-cell">MUATAN LOKAL</td>
              </tr>
              ${page2MulokHtml}
            </tbody>
          </table>

          <div class="section-heading" style="margin-top: 10px;">B. &nbsp;EKSTRAKURIKULER</div>
          <table class="rapor-table ekskul-table">
            <thead>
              <tr>
                <th class="th-no">No</th>
                <th style="width: 28%; text-align: center;">Ekstrakurikuler</th>
                <th style="width: 14%; text-align: center;">Predikat</th>
                <th style="width: 52%; text-align: center;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${ekskulRowsHtml}
            </tbody>
          </table>

          <div class="section-heading" style="margin-top: 10px;">C. &nbsp;KETIDAKHADIRAN</div>
          <table class="rapor-table attendance-table">
            <thead>
              <tr>
                <th colspan="2" style="text-align: center; padding: 3px 8px;">Ketidakhadiran</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="width: 68%; padding: 3px 8px;">Sakit</td>
                <td style="width: 32%; padding: 3px 8px;">
                  <span style="display: inline-block; width: 24px; text-align: center;">${sakitVal > 0 ? sakitVal : '-'}</span> hari
                </td>
              </tr>
              <tr>
                <td style="padding: 3px 8px;">Izin</td>
                <td style="padding: 3px 8px;">
                  <span style="display: inline-block; width: 24px; text-align: center;">${izinVal > 0 ? izinVal : '-'}</span> hari
                </td>
              </tr>
              <tr>
                <td style="padding: 3px 8px;">Tanpa Keterangan</td>
                <td style="padding: 3px 8px;">
                  <span style="display: inline-block; width: 24px; text-align: center;">${alpaVal > 0 ? alpaVal : '-'}</span> hari
                </td>
              </tr>
            </tbody>
          </table>

          <!-- TANDA TANGAN RAPOR (Sama dengan Format Rapor Tengah Semester) -->
          <table class="signature-table">
            <tr>
              <td style="width: 33%; text-align: center; vertical-align: top;">
                Mengetahui,<br/>
                Orang Tua / Wali Murid
                <div style="height: 52px;"></div>
                ( ........................................ )
              </td>
              <td style="width: 34%; text-align: center; vertical-align: top;">
                ${place}, ${formattedDateStr}<br/>
                Wali Kelas ${formatClassLabelForRapor(st.class)}
                <div style="height: 52px;"></div>
                ${homeroomName && homeroomName !== 'Wali Kelas' ? `<u><strong>${homeroomName}</strong></u>` : '( ........................................ )'}
              </td>
              <td style="width: 33%; text-align: center; vertical-align: top;">
                Mengetahui,<br/>
                Kepala Sekolah
                <div style="height: 52px; display: flex; align-items: center; justify-content: center; position: relative;">
                  ${schoolIdentity?.principalSignature ? `<img src="${schoolIdentity.principalSignature}" style="max-height: 46px; max-width: 130px; object-fit: contain; display: block; margin: 0 auto;" alt="TTD" />` : ''}
                </div>
                <u><strong>${principalName}</strong></u>
              </td>
            </tr>
          </table>
        </div>
        ${renderFooterHtml(st, 2)}
      </div>
    `;
  }).join('');

  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Rapor Akhir Semester - F4 (21,59 cm x 32,04 cm)</title>
      <style>
        /* Kertas F4 Custom: Lebar 21,59 cm x Panjang 32,04 cm */
        /* Margin: Atas 3,96 cm, Kanan 1,58 cm, Kiri 1,71 cm, Bawah sampai Tabel 2,22 cm, Bawah sampai batas Footer 1,26 cm */
        @page {
          size: 215.9mm 320.4mm;
          margin: 0mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11pt;
          color: #000;
          background: #fff;
        }
        .rapor-f4-page {
          width: 215.9mm;
          height: 320.4mm;
          padding-top: 39.6mm;
          padding-left: 17.1mm;
          padding-right: 15.8mm;
          padding-bottom: 12.6mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          break-after: page;
          position: relative;
          background: #fff;
          overflow: hidden;
        }
        .rapor-f4-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        /* Margin bawah sampai Tabel = 2,22 cm (22.2mm).
           Karena padding-bottom halaman = 1,26 cm (12.6mm) dan tinggi footer = 4.0mm,
           maka jarak (margin-bottom) dari batas bawah Tabel/page-body ke atas Footer = 22.2mm - 12.6mm - 4.0mm = 5.6mm.
           Tinggi bersih area konten/page-body = 320.4mm - 39.6mm - 22.2mm = 258.6mm. */
        .page-body {
          flex: 1 1 0%;
          height: 258.6mm;
          max-height: 258.6mm;
          margin-bottom: 5.6mm;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .page-body-p1 {
          flex: 1 1 0%;
          height: 258.6mm;
          max-height: 258.6mm;
          margin-bottom: 5.6mm;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .table-p1-wrap {
          flex: 1 1 0%;
          min-height: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .identity-box {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 1.5px 0;
          margin-bottom: 3.5px;
          flex-shrink: 0;
        }
        .identity-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11pt;
          line-height: 1.15;
        }
        .identity-table td {
          padding: 0.5px 0;
          vertical-align: top;
        }
        .id-label-left {
          width: 20%;
        }
        .id-colon {
          width: 2%;
          text-align: center;
        }
        .id-val-left {
          width: 44%;
        }
        .id-label-right {
          width: 17%;
        }
        .id-val-right {
          width: 15%;
        }
        .report-main-title {
          text-align: center;
          font-size: 11pt;
          font-weight: bold;
          margin: 2.5px 0;
          letter-spacing: 0.2px;
          line-height: 1.15;
          flex-shrink: 0;
        }
        .section-heading {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 2.5px;
          line-height: 1.15;
          flex-shrink: 0;
        }
        .rapor-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000;
          font-size: 11pt;
        }
        .rapor-table-p1 {
          width: 100%;
          height: 100%;
          margin-bottom: 0;
        }
        .rapor-table th, .rapor-table td {
          border: 1px solid #000;
        }
        .rapor-table thead th {
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
          padding: 3px 5px;
          font-size: 11pt;
          line-height: 1.12;
        }
        .th-no, .col-no {
          width: 5%;
          text-align: center;
          vertical-align: middle;
          font-size: 11pt;
        }
        .th-mapel {
          width: 24%;
        }
        .col-mapel {
          width: 24%;
          padding: 2.5px 6px;
          vertical-align: middle;
          font-size: 11pt;
          line-height: 1.14;
        }
        .th-nilai, .col-nilai {
          width: 9%;
          text-align: center;
          vertical-align: middle;
          font-size: 11pt;
        }
        .th-capaian {
          width: 62%;
        }
        .col-capaian {
          width: 62%;
          padding: 2.5px 6px;
          vertical-align: middle;
          line-height: 1.14;
          font-size: 11pt;
          text-align: justify;
        }
        .subject-row-p1 td {
          padding-top: 2.5px;
          padding-bottom: 2.5px;
        }
        .subject-row-p2 td {
          padding-top: 3px;
          padding-bottom: 3px;
        }
        .mulok-divider-cell {
          font-weight: bold;
          padding: 3px 8px;
          font-size: 11pt;
          text-transform: uppercase;
        }
        .ekskul-table td {
          padding: 2.5px 6px;
          vertical-align: middle;
          font-size: 11pt;
          line-height: 1.14;
        }
        .ek-no {
          text-align: center;
          width: 5%;
        }
        .ek-name {
          width: 28%;
        }
        .ek-pred {
          text-align: center;
          width: 14%;
        }
        .ek-desc {
          width: 53%;
        }
        .attendance-table {
          width: 48%;
          font-size: 11pt;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 11pt;
          line-height: 1.18;
        }
        .page-footer {
          height: 4.0mm;
          border-top: 0.75px solid #444;
          padding-top: 2px;
          margin-top: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: "Courier New", Courier, monospace;
          font-size: 8.5pt;
          line-height: 1;
          color: #222;
          flex-shrink: 0;
          background: #fff;
          position: relative;
          z-index: 2;
        }
        @media screen {
          body {
            background: #cbd5e1;
            padding: 20px 0;
          }
          .rapor-f4-page {
            margin: 0 auto 24px auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          }
        }
      </style>
    </head>
    <body>
      ${allPagesHtml}
      <script>
        function fitPage1TablesBeforeFooter() {
          var wraps = document.querySelectorAll('.table-p1-wrap');
          for (var i = 0; i < wraps.length; i++) {
            var wrap = wraps[i];
            var table = wrap.querySelector('.rapor-table-p1');
            if (!table) continue;
            var maxH = wrap.clientHeight;
            if (maxH <= 0) continue;

            // Jika tinggi alami tabel melebihi batas wrap (2,22 cm dari bawah kertas),
            // rapatkan line-height dan padding secara bertahap agar tabel pas 100% di dalam wrap dan tidak pernah menyentuh footer.
            var cells = table.querySelectorAll('td, th');
            if (table.offsetHeight > maxH) {
              for (var c = 0; c < cells.length; c++) {
                cells[c].style.paddingTop = '1.5px';
                cells[c].style.paddingBottom = '1.5px';
                cells[c].style.lineHeight = '1.05';
              }
            }
            var fontPt = 11;
            while (table.offsetHeight > maxH && fontPt > 9.5) {
              fontPt -= 0.25;
              for (var k = 0; k < cells.length; k++) {
                cells[k].style.fontSize = fontPt + 'pt';
              }
            }
          }
        }
        window.onload = function() {
          fitPage1TablesBeforeFooter();
          setTimeout(function() {
            fitPage1TablesBeforeFooter();
            window.focus();
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}
