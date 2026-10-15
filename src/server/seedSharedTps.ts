import { SharedLearningObjective, CurriculumSubject, CurriculumTpDescription } from '../types';

export const DEFAULT_SHARED_TPS: Array<Omit<SharedLearningObjective, 'id' | 'createdAt' | 'updatedAt'>> = [
  // --- MATEMATIKA (mapel-mtk) ---
  // Kelas 7
  {
    code: 'TP-MAT-7.1',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Memahami konsep bilangan bulat dan rasional serta operasinya dalam pemecahan masalah sehari-hari.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-7.2',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menganalisis sifat-sifat bangun datar dan hubungan sudut dalam konteks geometri.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-7.3',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menggunakan konsep aljabar linear satu variabel dalam menyelesaikan persoalan nyata.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-7.4',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Mengumpulkan, mengorganisasi, dan menyajikan data statistik secara visual dan diagram.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  // Kelas 8
  {
    code: 'TP-MAT-8.1',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Menerapkan konsep teorema Pythagoras dalam pemecahan masalah geometri dua dimensi.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-8.2',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menganalisis sistem persamaan linear dua variabel (SPLDV) dalam pemodelan masalah nyata.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-8.3',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menghitung luas permukaan dan volume bangun ruang sisi datar (kubus, balok, prisma, limas).',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-8.4',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menentukan peluang empirik dan teoritik suatu kejadian sederhana dalam pengambilan sampel.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  // Kelas 9
  {
    code: 'TP-MAT-9.1',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Menganalisis sifat-sifat bilangan berpangkat dan bentuk akar serta operasinya.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-9.2',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menentukan akar-akar persamaan kuadrat dan karakteristik grafik fungsi kuadrat.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-9.3',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menerapkan konsep transformasi geometri (translasi, refleksi, rotasi, dilatasi) pada koordinat Cartesius.',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },
  {
    code: 'TP-MAT-9.4',
    subjectId: 'mapel-mtk',
    subjectName: 'Matematika',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menghitung luas permukaan dan volume bangun ruang sisi lengkung (tabung, kerucut, bola).',
    creatorName: 'Drs. Heru Setyawan, M.Pd',
    creatorRole: 'Guru Matematika',
    status: 'Disetujui'
  },

  // --- ILMU PENGETAHUAN ALAM (mapel-ipa) ---
  // Kelas 7
  {
    code: 'TP-IPA-7.1',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Menerapkan pengukuran terhadap aspek fisis dalam penyelidikan ilmiah dan keselamatan kerja laboratorium.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-7.2',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menganalisis klasifikasi zat, unsur, senyawa, campuran dan pemisahan campuran sederhana.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-7.3',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menganalisis konsep suhu, kalor, perpindahan kalor, dan penerapannya dalam mekanisme termoregulasi.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-7.4',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menjelaskan interaksi antarmakhluk hidup dan lingkungannya dalam jaring-jaring makanan dan rantai ekosistem.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  // Kelas 8
  {
    code: 'TP-IPA-8.1',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Memahami hubungan usaha dan energi serta prinsip kerja pesawat sederhana dalam kehidupan sehari-hari.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-8.2',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Mengidentifikasi struktur dan fungsi sistem pencernaan, peredaran darah, dan pernapasan manusia.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-8.3',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menganalisis konsep getaran, gelombang, bunyi, dan cahaya serta penerapannya pada indra penglihatan.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-8.4',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menjelaskan struktur lapisan bumi, gempa bumi, dan tindakan mitigasi bencana alam secara tanggap.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  // Kelas 9
  {
    code: 'TP-IPA-9.1',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Menerapkan konsep tekanan pada zat cair, gas, dan bejana berhubungan dalam kehidupan.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-9.2',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menganalisis prinsip kelistrikan statis dan dinamis serta pemanfaatan energi listrik hemat.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-9.3',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menjelaskan pewarisan sifat pada makhluk hidup dan pemanfaatan bioteknologi ramah lingkungan.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },
  {
    code: 'TP-IPA-9.4',
    subjectId: 'mapel-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menganalisis isu lingkungan global, pemanasan global, dan teknologi ramah lingkungan terbarukan.',
    creatorName: 'Drs. Husnan',
    creatorRole: 'Guru IPA',
    status: 'Disetujui'
  },

  // --- BAHASA INDONESIA (mapel-bindo) ---
  // Kelas 7
  {
    code: 'TP-BINDO-7.1',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Mengidentifikasi informasi penting dari teks nonsastra dan deskripsi yang didengarkan.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-7.2',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menulis teks prosedur runtut dengan kaidah kebahasaan dan ejaan yang tepat.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-7.3',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menelaah unsur-unsur pembangun cerita fantasi dan menyajikan kembali secara ekspresif.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-7.4',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menemukan ide pokok dan informasi pendukung dalam teks berita faktual.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  // Kelas 8
  {
    code: 'TP-BINDO-8.1',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Menjelaskan gagasan utama dari teks ulasan dan artikel ilmiah populer.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-8.2',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menyusun teks eksposisi dan teks persuasi dengan argumen yang logis dan persuasif.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-8.3',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menelaah unsur intrinsik dan batin puisi serta menampilkan pembacaan puisi berirama.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-8.4',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menganalisis struktur dan kaidah kebahasaan teks drama atau cerita inspiratif.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  // Kelas 9
  {
    code: 'TP-BINDO-9.1',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Membandingkan berbagai pandangan dalam teks diskusi dan merumuskan simpulan kritis.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-9.2',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Menyusun teks pidato persuasif yang menggugah dengan struktur dan retorika berbobot.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-9.3',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menulis teks cerpen berdasarkan pengalaman pribadi dengan penokohan dan alur dinamis.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },
  {
    code: 'TP-BINDO-9.4',
    subjectId: 'mapel-bindo',
    subjectName: 'Bahasa Indonesia',
    gradeLevel: '9',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Mengevaluasi laporan hasil percobaan ilmiah dengan kaidah bahasa baku dan objektif.',
    creatorName: 'Ahmad Fauzan, S.S',
    creatorRole: 'Guru Bahasa Indonesia',
    status: 'Disetujui'
  },

  // --- PENDIDIKAN AGAMA ISLAM (mapel-pai) ---
  // Kelas 7
  {
    code: 'TP-PAI-7.1',
    subjectId: 'mapel-pai',
    subjectName: 'Pendidikan Agama Islam',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Membaca, menghafal, dan memahami kandungan ayat-ayat Al-Qur\'an tentang pentingnya menuntut ilmu.',
    creatorName: 'KH. M. Syukron, S.Pd.I',
    creatorRole: 'Guru PAI',
    status: 'Disetujui'
  },
  {
    code: 'TP-PAI-7.2',
    subjectId: 'mapel-pai',
    subjectName: 'Pendidikan Agama Islam',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Meneladani sifat-sifat mulia Asmaul Husna (Al-\'Alim, Al-Khabir, As-Sami\', Al-Bashir) dalam keseharian.',
    creatorName: 'KH. M. Syukron, S.Pd.I',
    creatorRole: 'Guru PAI',
    status: 'Disetujui'
  },
  {
    code: 'TP-PAI-7.3',
    subjectId: 'mapel-pai',
    subjectName: 'Pendidikan Agama Islam',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menjelaskan ketentuan shalat berjamaah, sujud sahwi, sujud tilawah, dan sujud syukur secara tertib.',
    creatorName: 'KH. M. Syukron, S.Pd.I',
    creatorRole: 'Guru PAI',
    status: 'Disetujui'
  },
  {
    code: 'TP-PAI-7.4',
    subjectId: 'mapel-pai',
    subjectName: 'Pendidikan Agama Islam',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Meneladani perjuangan Nabi Muhammad SAW pada periode Makkah dan Madinah dalam membangun masyarakat beradab.',
    creatorName: 'KH. M. Syukron, S.Pd.I',
    creatorRole: 'Guru PAI',
    status: 'Disetujui'
  },

  // --- BAHASA INGGRIS (mapel-bing) ---
  // Kelas 7
  {
    code: 'TP-BING-7.1',
    subjectId: 'mapel-bing',
    subjectName: 'Bahasa Inggris',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Mengidentifikasi fungsi sosial, struktur teks, dan unsur kebahasaan teks interaksi interpersonal lisan dan tulis.',
    creatorName: 'Ibu Lindawati, S.Pd',
    creatorRole: 'Guru Bahasa Inggris',
    status: 'Disetujui'
  },
  {
    code: 'TP-BING-7.2',
    subjectId: 'mapel-bing',
    subjectName: 'Bahasa Inggris',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Mendeskripsikan orang, hewan, dan benda di lingkungan sekitar menggunakan descriptive text komunikatif.',
    creatorName: 'Ibu Lindawati, S.Pd',
    creatorRole: 'Guru Bahasa Inggris',
    status: 'Disetujui'
  },
  {
    code: 'TP-BING-7.3',
    subjectId: 'mapel-bing',
    subjectName: 'Bahasa Inggris',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Memberi dan meminta informasi terkait petunjuk arah dan kegiatan rutin menggunakan simple present tense.',
    creatorName: 'Ibu Lindawati, S.Pd',
    creatorRole: 'Guru Bahasa Inggris',
    status: 'Disetujui'
  },
  {
    code: 'TP-BING-7.4',
    subjectId: 'mapel-bing',
    subjectName: 'Bahasa Inggris',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Menyusun kalimat sederhana untuk mengungkapkan instruksi dan larangan pendek di lingkungan sekolah.',
    creatorName: 'Ibu Lindawati, S.Pd',
    creatorRole: 'Guru Bahasa Inggris',
    status: 'Disetujui'
  },

  // --- INFORMATIKA (mapel-infor) ---
  // Kelas 8
  {
    code: 'TP-INFOR-8.1',
    subjectId: 'mapel-infor',
    subjectName: 'Informatika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Mampu merefleksikan materi Informatika dan berpikir komputasional dalam menyelesaikan persoalan terstruktur.',
    creatorName: 'Waka Kurikulum',
    creatorRole: 'Waka Kurikulum',
    status: 'Disetujui'
  },
  {
    code: 'TP-INFOR-8.2',
    subjectId: 'mapel-infor',
    subjectName: 'Informatika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Mengembangkan algoritma langkah demi langkah menggunakan konsep percabangan dan perulangan logika.',
    creatorName: 'Waka Kurikulum',
    creatorRole: 'Waka Kurikulum',
    status: 'Disetujui'
  },
  {
    code: 'TP-INFOR-8.3',
    subjectId: 'mapel-infor',
    subjectName: 'Informatika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Memahami cara kerja jaringan komputer lokal, internet, dan enkripsi data sederhana.',
    creatorName: 'Waka Kurikulum',
    creatorRole: 'Waka Kurikulum',
    status: 'Disetujui'
  },
  {
    code: 'TP-INFOR-8.4',
    subjectId: 'mapel-infor',
    subjectName: 'Informatika',
    gradeLevel: '8',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Membuat program visual interaktif dan menguji kebenaran eksekusi kodenya secara mandiri.',
    creatorName: 'Waka Kurikulum',
    creatorRole: 'Waka Kurikulum',
    status: 'Disetujui'
  },

  // --- PJOK (mapel-pjok) ---
  // Kelas 7
  {
    code: 'TP-PJOK-7.1',
    subjectId: 'mapel-pjok',
    subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 1,
    title: 'Mempraktikkan Keterampilan Gerak spesifik permainan bola besar dan bola kecil.',
    creatorName: 'Eko Prasetyo, S.Pd',
    creatorRole: 'Guru PJOK',
    status: 'Disetujui'
  },
  {
    code: 'TP-PJOK-7.2',
    subjectId: 'mapel-pjok',
    subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 2,
    title: 'Mempraktikkan gerak dasar atletik lari jarak pendek, lompat, dan tolak peluru dengan teknik benar.',
    creatorName: 'Eko Prasetyo, S.Pd',
    creatorRole: 'Guru PJOK',
    status: 'Disetujui'
  },
  {
    code: 'TP-PJOK-7.3',
    subjectId: 'mapel-pjok',
    subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 3,
    title: 'Menerapkan konsep latihan kebugaran jasmani untuk peningkatan daya tahan kardiovaskular dan kelenturan.',
    creatorName: 'Eko Prasetyo, S.Pd',
    creatorRole: 'Guru PJOK',
    status: 'Disetujui'
  },
  {
    code: 'TP-PJOK-7.4',
    subjectId: 'mapel-pjok',
    subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    tpNumber: 4,
    title: 'Memahami pola makan sehat, bergizi, seimbang, dan pencegahan cedera saat berolahraga.',
    creatorName: 'Eko Prasetyo, S.Pd',
    creatorRole: 'Guru PJOK',
    status: 'Disetujui'
  }
];

export function generateSeedSharedTps(
  subjects: CurriculumSubject[] = [],
  tpDescriptions: CurriculumTpDescription[] = []
): SharedLearningObjective[] {
  const list: SharedLearningObjective[] = [];
  const now = new Date().toISOString();

  // 1. Add base seeded default TPs
  DEFAULT_SHARED_TPS.forEach((def, idx) => {
    list.push({
      ...def,
      id: `tp-${def.subjectId}-${def.gradeLevel}-${def.tpNumber || (idx + 1)}`,
      createdAt: now,
      updatedAt: now
    });
  });

  // 2. Also import any existing curriculumTpDescriptions that have real custom text
  tpDescriptions.forEach(desc => {
    if (!desc.gradeLevel) return;
    const gLevel = String(desc.gradeLevel).trim();
    const sem = desc.semester || 'Ganjil';
    const yr = desc.academicYear || '2026/2027';
    
    // Find matching subject
    let matchedSub = subjects.find(s => 
      s.name.toLowerCase() === (desc.subject || '').toLowerCase() ||
      s.id === desc.subjectId
    );
    const subId = matchedSub ? matchedSub.id : (desc.subjectId || `mapel-${(desc.subject || 'gen').toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    const subName = matchedSub ? matchedSub.name : (desc.subject || 'Mata Pelajaran');
    const subCode = matchedSub ? matchedSub.code : 'TP';

    [1, 2, 3, 4].forEach(num => {
      const field = `tp${num}Name` as keyof CurriculumTpDescription;
      const text = desc[field];
      if (typeof text === 'string' && text.trim().length > 3) {
        const id = `tp-${subId}-${gLevel}-${sem.toLowerCase()}-${num}`;
        // Check if already in list
        const exists = list.find(item => item.id === id || (item.subjectId === subId && item.gradeLevel === gLevel && item.tpNumber === num && item.semester.toLowerCase() === sem.toLowerCase()));
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
            title: text.trim(),
            creatorName: desc.filledBy || 'Waka Kurikulum',
            creatorRole: desc.filledByRole || 'Waka Kurikulum',
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
