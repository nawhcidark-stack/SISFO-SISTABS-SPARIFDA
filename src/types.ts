export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  email: string;
  phone: string;
  savingsBalance: number;
  status?: string; // e.g. "Aktif" | "Lulus" | "Keluar" | "Mutasi"
  password?: string;
  gender?: string;
  mutationDate?: string;
  mutationReason?: string;
  mutationDestination?: string;
  
  // Data Siswa Tambahan (Buku Induk)
  nisn?: string;
  nickname?: string;
  nik?: string;
  birthPlace?: string;
  birthDate?: string;
  kkNumber?: string;
  birthCertNumber?: string;
  livingWith?: string;
  childOrder?: string | number;
  siblingsCount?: string | number;
  stepSiblingsCount?: string | number;
  address?: string;
  photoUrl?: string;
  parentName?: string;
  googleDriveLink?: string;
  schoolOrigin?: string;

  // Data Orang Tua - Ayah
  fatherName?: string;
  fatherNik?: string;
  fatherBirthPlace?: string;
  fatherBirthDate?: string;
  fatherEducation?: string;
  fatherOccupation?: string;
  fatherIncome?: string;
  fatherAddress?: string;
  fatherPhone?: string;
  fatherStatus?: string; // Hidup / Meninggal

  // Data Orang Tua - Ibu
  motherName?: string;
  motherNik?: string;
  motherBirthPlace?: string;
  motherBirthDate?: string;
  motherEducation?: string;
  motherOccupation?: string;
  motherIncome?: string;
  motherAddress?: string;
  motherPhone?: string;
  motherStatus?: string; // Hidup / Meninggal

  // Data Orang Tua - Wali
  guardianName?: string;
  guardianNik?: string;
  guardianBirthPlace?: string;
  guardianBirthDate?: string;
  guardianEducation?: string;
  guardianOccupation?: string;
  guardianIncome?: string;
  guardianAddress?: string;
  guardianPhone?: string;
  guardianStatus?: string; // Hidup / Meninggal
  guardianIsSameAsFather?: boolean;
  
  // Status Bebas SPP Diluar Prestasi / Beasiswa
  isSppExempt?: boolean;
  sppExemptionReason?: string;
  sppExemptionType?: 'akademik' | 'non-akademik' | 'non-prestasi' | 'kebijakan';

  // Nominal Khusus SPP Siswa (jika ada besaran khusus diluar tarif standar tingkat)
  customSppRate?: number;
}

export interface SppBill {
  id: string;
  studentId: string;
  month: string; // e.g., "Januari", "Februari"
  year: number;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending' | 'waived';
  paidAt?: string;
  paymentMethod?: string;
  orderId?: string;
  transactionId?: string;
  achievementType?: 'akademik' | 'non-akademik' | 'non-prestasi' | 'kebijakan';
  achievementDetail?: string;
}

export interface SavingsTransaction {
  id: string;
  studentId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  paymentMethod?: string;
  orderId?: string;
  transactionId?: string;
  notes?: string;
}

export interface MiscBill {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending';
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  orderId?: string;
  transactionId?: string;
  isMonthly?: boolean;
  month?: string;
}

export interface RealtimeNotification {
  id: string;
  studentId?: string; // all if undefined
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'payment';
  category?: 'kbm' | 'pembayaran' | 'bk' | 'admin' | string;
  createdAt: string;
}

export interface MidtransConfig {
  merchantId: string;
  clientKey: string;
  serverKey: string;
  isProduction: boolean;
  isDisabled?: boolean;
  adminFee?: number;
  systemMaintenanceFee?: number;
  chargeFeesToUser?: boolean;
  pin?: string;
}

export interface MidtransTransactionRecord {
  id: string;
  orderId: string;
  transactionId?: string;
  studentId?: string;
  studentName?: string;
  studentNis?: string;
  nisn?: string;
  billType: 'spp' | 'misc' | 'cart' | 'savings' | 'spmb_token' | 'spmb_reregistration' | 'other';
  description: string;
  grossAmount: number;
  paymentType: string;
  transactionStatus: 'settlement' | 'capture' | 'pending' | 'expire' | 'cancel' | 'deny' | 'refund' | 'failure';
  fraudStatus?: string;
  settlementTime?: string;
  transactionTime?: string;
  createdAt: string;
  updatedAt: string;
  snapToken?: string;
  rawResponse?: any;
}

export interface SchoolIdentity {
  name: string;
  subheading: string;
  accreditation: string;
  address: string;
  phone: string;
  email?: string;
  npsn?: string;
  principal: string;
  principalSignature?: string;
  treasurer: string;
  logo: string;
  logo2?: string;
  letterhead?: string;
  treasurerSignature?: string;
  schoolStamp?: string;
  apkUrl?: string;
  iosUrl?: string;
  treasurerSkUrl?: string;
  sarprasSkUrl?: string;
  paymentCardTemplate?: string;
  favicon?: string;
  activeAcademicYear?: string;
  activeSemester?: string;
  sppRates?: {
    grade7: number;
    grade8: number;
    grade9: number;
  };
}

export interface WhatsappConfig {
  token: string;
  sender: string;
  provider: string;
  baseUrl: string;
  enabled: boolean;
  notifyOnBilling: boolean;
  notifyOnPayment: boolean;
  notifyOnSavings: boolean;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName?: string;
  className?: string;
  date: string; // "YYYY-MM-DD"
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
  notes?: string;
  subjectNotes?: {
    subject: string;
    teacherName: string;
    status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
    notes: string;
  }[];
}

export interface HomeroomTeacher {
  id: string;
  username: string;
  name: string;
  className: string; // e.g., "7-A", "7-B", "8-A", "9-C"
  password?: string;
  skUrl?: string;
}

export interface SubjectTeacher {
  id: string;
  username: string;
  name: string;
  subject: string; // e.g., "Matematika", "Bahasa Inggris", "IPA", etc.
  className?: string; // e.g., "7-A" or "SEMUA KELAS"
  password?: string;
  skUrl?: string;
}

export interface SubjectAttendanceEntry {
  studentId: string;
  studentName: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
  notes?: string;
}

export interface TreasurerTransaction {
  id: string;
  type: 'incoming' | 'outgoing';
  category: string; // 'SPP', 'Tabungan', 'Operasional', 'Gaji Guru', 'Pembangunan', 'Ujan', 'Utama'
  amount: number;
  description: string;
  date: string; // "YYYY-MM-DD"
  source?: 'spp' | 'savings' | 'custom';
  studentName?: string;
  studentId?: string;
  nis?: string;
  createdBy?: string;
  recipientName?: string;
  fundingSource?: string;
  paymentMethod?: string;
  kodeRekening?: string;
  noBukti?: string;
  orderId?: string;
  transactionId?: string;
}


export interface ClassSchedule {
  id: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  jamKe: string; // e.g. "1-2", "3-4", "5"
  startTime?: string; // e.g. "07:00"
  endTime?: string; // e.g. "08:20"
  alokasiWaktu?: string; // e.g. "2 JP"
  academicYear?: string;
  semester?: string;
  createdAt?: string;
}

export interface TeachingJournal {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherType?: 'homeroom' | 'subject_teacher';
  subject: string;
  className: string;
  date: string;
  topic: string; // Materi Pembelajaran
  attendance: SubjectAttendanceEntry[];
  notes?: string; // Catatan KBM
  fase?: string;
  semester?: string;
  alokasiWaktu?: string; // JP
  jamKe?: string;
  pertemuanKe?: string;
  tujuanPembelajaran?: string;
  pencapaianKktp?: string;
  createdAt: string;
}

export interface StudentDevelopmentLog {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string; // "YYYY-MM-DD"
  category: 'Akademik' | 'Sikap' | 'Prestasi' | 'Minat' | 'Catatan Khusus';
  notes: string;
  createdAt: string;
}

export interface StudentInfractionLog {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM" e.g., "08:15"
  location: string;
  infractionType: string; // Jenis pelanggaran
  actionTaken: string; // Tindah lanjut / sanksi / pembinaan
  resolutionStatus: 'Belum Selesai' | 'Dalam Proses' | 'Selesai';
  points?: number;
  createdAt: string;
}

export interface InfractionRule {
  id: string;
  name: string;
  points: number;
  category: string; // "Ringan", "Sedang", "Berat"
}

export interface StudentCounselingLog {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string; // "YYYY-MM-DD"
  topic: string; // Topik / permasalahan
  actionPlan: string; // Tindakan / solusi
  result: string; // Hasil dan tindak lanjut
  bkFeedback?: string;
  bkFeedbackAt?: string;
  createdAt: string;
}

export interface ClassAnnouncement {
  id: string;
  className: string;
  title: string;
  content: string;
  date: string; // "YYYY-MM-DD"
  targetRecipient: string; // "Siswa", "Orang Tua", "Semua"
  confirmationStatus: 'Belum Dibaca' | 'Sebagian Terbaca' | 'Telah Dikonfirmasi';
  createdAt: string;
}

export interface ClassMeetingLog {
  id: string;
  className: string;
  meetingType: string; // "Rapat Orang Tua", "Rapat Dewan Guru", "Koordinasi Komite", "Lainnya"
  date: string; // "YYYY-MM-DD"
  attendees: string; // Peserta
  agenda: string; // Agenda & hasil keputusan
  followUp: string; // Tindak lanjut
  createdAt: string;
}

export interface MerdekaAssessment {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  teacherName: string;
  semester: string; // "Ganjil" | "Genap"
  academicYear: string; // e.g. "2025/2026"

  // TP 1
  tp1Name?: string;
  tp1Tugas1?: number | string;
  tp1Tugas2?: number | string;
  tp1Uh?: number | string;
  nilaiTp1?: number; // (Rata2 Tugas * 0.6) + (UH * 0.4)

  // TP 2
  tp2Name?: string;
  tp2Tugas1?: number | string;
  tp2Tugas2?: number | string;
  tp2Uh?: number | string;
  nilaiTp2?: number;

  // TP 3
  tp3Name?: string;
  tp3Tugas1?: number | string;
  tp3Tugas2?: number | string;
  tp3Uh?: number | string;
  nilaiTp3?: number;

  // TP 4
  tp4Name?: string;
  tp4Tugas1?: number | string;
  tp4Tugas2?: number | string;
  tp4Uh?: number | string;
  nilaiTp4?: number;

  // Aggregates & Scores
  nilaiRataTp?: number; // Rata-rata dari nilai TP1..4 yang valid
  nilaiKokurikuler?: number; // Khusus Wali Kelas, terhubung ke Guru Mapel
  nilaiPts?: number; // Input Waka Kurikulum
  nilaiPas?: number; // Input Waka Kurikulum
  nilaiAkhirMapel?: number; // ((Nilai Rata2 TP * 2) + Kokurikuler + PTS + PAS) / 5

  // Legacy/Fallback compatibility
  tp1Grade?: number;
  tp2Grade?: number;
  tp3Grade?: number;
  tp4Grade?: number;
  nilaiFormatif?: number;
  nilaiSumatifLM?: number;
  nilaiSAS?: number;
  nilaiRapor?: number;
  deskripsiCapaian?: string;

  createdAt: string;
  updatedAt?: string;
}

export interface PrincipalWorkProgram {
  id: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  status: 'planned' | 'active' | 'completed';
  syncWithStaff: boolean; // if true, visible to teachers
  createdAt: string;
}

export interface TeacherEvaluation {
  id: string;
  teacherType: 'homeroom' | 'subject_teacher';
  teacherId: string;
  teacherName: string;
  evaluatorName: string;
  date: string; // YYYY-MM-DD
  academicYear: string;
  pedagogicScore: number; // 1-100
  professionalScore: number; // 1-100
  personalScore: number; // 1-100
  socialScore: number; // 1-100
  notes: string; // Catatan khusus dan rekomendasi
  createdAt: string;
}

export interface SarprasItem {
  id: string;
  name: string;
  code: string;
  category: string;
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  location: string;
  totalQty: number;
  availableQty: number;
  price?: number;
  purchaseYear?: string;
}

export interface SarprasProposal {
  id: string;
  itemName: string;
  qty: number;
  estimatedPrice: number;
  totalPrice: number;
  proposedBy: string; // e.g. "Waka Sarpras"
  date: string; // YYYY-MM-DD
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface SarprasLoan {
  id: string;
  itemId: string;
  itemName: string;
  borrowerId: string; // references SubjectTeacher.id or HomeroomTeacher.id
  borrowerName: string;
  qty: number;
  loanDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD or empty
  status: 'dipinjam' | 'kembali';
  notes?: string;
}

export interface TeacherSalary {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherType: 'homeroom' | 'subject_teacher';
  month: string; // e.g. "2026-06"
  baseSalary: number;
  homeroomAllowance: number; // Tunjangan Jabatan Wali Kelas
  journalCount: number;
  journalRate: number;
  tunjanganMasaKerja: number; // Tunjangan masa kerja
  vakasi: number; // Vakasi / insentif mengajar jam jilid
  potonganDanaSosial: number; // Potongan Dana Sosial
  potonganAbsen: number; // Potongan Ketidakhadiran
  potonganLain: number; // Potongan Lain-lain
  otherAllowance: number;
  deductions: number;
  totalAmount: number;
  status: 'paid' | 'unpaid';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
}

export interface SalaryConfig {
  baseSalaryHomeroom: number;
  baseSalarySubject: number;
  homeroomAllowanceRate: number;
  journalRate: number;
  defaultTunjanganMasaKerja: number;
  defaultPotonganDanaSosial: number;
}

export function isSppBillOverdue(bill: { status: string; month: string; year: number }, today: Date = new Date()): boolean {
  if (bill.status !== 'unpaid') {
    return false;
  }

  const MONTHS_MAP: { [key: string]: number } = {
    "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
    "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
  };

  const billMonthIndex = MONTHS_MAP[bill.month];
  if (billMonthIndex === undefined) {
    return true; // fallback for non-standard month names if they are unpaid
  }

  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth(); // 0-11
  const currentDate = today.getDate(); // 1-31

  if (bill.year > currentYear) {
    return false;
  }

  if (bill.year < currentYear) {
    return true;
  }

  // Same year:
  if (billMonthIndex < currentMonthIndex) {
    return true;
  }

  if (billMonthIndex === currentMonthIndex) {
    // "melebihi tanggal 10" -> date > 10
    return currentDate > 10;
  }

  return false;
}

export function getSppMonthIndex(monthName: string): number {
  if (!monthName) return 0;
  const clean = monthName.trim().toLowerCase();
  const monthMap: Record<string, number> = {
    "januari": 1, "jan": 1, "january": 1,
    "februari": 2, "feb": 2, "february": 2,
    "maret": 3, "mar": 3, "march": 3,
    "april": 4, "apr": 4,
    "mei": 5, "may": 5,
    "juni": 6, "jun": 6, "june": 6,
    "juli": 7, "jul": 7, "july": 7,
    "agustus": 8, "agu": 8, "agust": 8, "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "oktober": 10, "okt": 10, "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "desember": 12, "des": 12, "december": 12, "dec": 12
  };
  return monthMap[clean] || 0;
}

export function sortSppBills<T extends { month: string; year?: number }>(bills: T[]): T[] {
  if (!bills || !Array.isArray(bills)) return [];
  return [...bills].sort((a, b) => {
    const yA = Number(a?.year) || 0;
    const yB = Number(b?.year) || 0;
    const mA = getSppMonthIndex(a?.month || '');
    const mB = getSppMonthIndex(b?.month || '');
    const scoreA = yA * 12 + mA;
    const scoreB = yB * 12 + mB;
    return scoreA - scoreB;
  });
}// ==========================================
// SPMB (SISTEM PENERIMAAN MURID BARU) 2027/2028
// ==========================================

export interface SpmbSession {
  id: string; // 'inden' | 'gelombang-1' | 'gelombang-2'
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  quota: number;
  description: string;
  discountPercent?: number; // Diskon Uang Gedung dalam persen (%) misal: 50% untuk Inden, 25% Gelombang 1
  discountAmount?: number; // Nilai potongan rupiah (opsional / fallback)
}

export interface SpmbUniformItem {
  id: string;
  name: string; // seragam olahraga, bedge, hasduk, jilbab, topi, kaos kaki, baju batik, ikat pinggang
  price: number;
  gender: 'male' | 'female' | 'both' | 'L' | 'P' | 'all';
  required: boolean;
  description?: string;
}

export interface SpmbConfig {
  academicYear: string; // "2027/2028"
  isOpen: boolean;
  registrationTokenFee: number; // e.g. 50000 (Biaya Formulir / Token Pendaftaran)
  buildingFee: number; // Uang Gedung / Infaq Pembangunan e.g. 1500000
  julySppFee: number; // SPP Bulan Juli 2027 e.g. 200000
  reRegistrationBaseFee?: number; // Biaya Administrasi Tambahan (opsional)
  sessions: SpmbSession[];
  uniformItems: SpmbUniformItem[];
  contactPhone: string;
  bankAccountInfo?: string;
  instructions?: string;

  // Pengaturan Khusus SD MAARIF JOGOSARI
  maarifSchoolName?: string; // Default: "SD MAARIF JOGOSARI"
  maarifBuildingDiscountType?: 'percent' | 'amount'; // 'percent' atau 'amount' (nominal rupiah)
  maarifBuildingDiscount?: number; // Nilai diskon Uang Gedung khusus SD Maarif (misal: Rp 250.000 atau 20%)
  maarifUniformDiscountType?: 'percent' | 'amount'; // 'percent' atau 'amount' (nominal rupiah)
  maarifUniformDiscount?: number; // Nilai diskon Perlengkapan / Seragam khusus SD Maarif (misal: Rp 100.000 atau 15%)

  // Pengaturan Pendaftaran Kolektif Langsung di Sekolah
  collectiveRegistrationEnabled?: boolean; // Aktifkan jalur pendaftaran kolektif / langsung di sekolah
  collectiveTokenFree?: boolean; // Gratis biaya token formulir pendaftaran (Rp 0) untuk pendaftaran kolektif

  // Pengaturan Otomatisasi Pengalihan Jalur / Gelombang jika Belum Daftar Ulang
  autoTransferExpiredSessions?: boolean; // Default: true (Otomatis alihkan jika batas akhir gelombang terlampaui dan belum lunas daftar ulang)
}

export interface SpmbCandidate {
  id: string;
  registrationNo: string; // Nomor pendaftaran (biasanya sama dengan NISN)
  nisn: string;
  nik: string;
  fullName: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  phone: string; // WhatsApp
  schoolOriginType?: 'maarif_jogosari' | 'other'; // 'maarif_jogosari' | 'other'
  schoolOrigin: string; // "SD MAARIF JOGOSARI" atau nama manual
  registrationType?: 'online_individual' | 'school_collective'; // Jalur pendaftaran mandiri vs kolektif di sekolah
  sessionId: string; // 'inden' | 'gelombang-1' | 'gelombang-2'
  createdAt: string;

  // Pengalihan Jalur / Gelombang Otomatis & Pembatalan
  originalSessionId?: string; // Jalur pertama kali mendaftar
  previousSessionId?: string; // Jalur sebelum dialihkan
  isTransferredSession?: boolean; // True jika dialihkan karena melewati batas akhir daftar ulang
  transferredAt?: string; // Waktu pengalihan
  transferReason?: string; // Keterangan penyebab pengalihan
  transferHistory?: Array<{
    action: 'transfer' | 'revert' | 'manual_change';
    fromSessionId: string;
    toSessionId: string;
    timestamp: string;
    reason?: string;
    operator?: string;
  }>;

  // 1. Pembayaran Token Pendaftaran (Rp. 50.000)
  tokenPaymentStatus: 'unpaid' | 'paid' | 'waived';
  tokenPaymentOrderId?: string;
  tokenPaidAt?: string;
  tokenPaymentMethod?: string;
  tokenAmount?: number;

  // 1b. Pengembalian Uang Token Tunai / Cash (Khusus Jalur Kolektif yang membayar via online)
  collectiveRefundStatus?: 'none' | 'pending' | 'refunded';
  collectiveRefundAmount?: number; // e.g. 50000
  collectiveRefundedAt?: string;
  collectiveRefundedBy?: string; // Nama Admin / Petugas Panitia
  collectiveRefundRecipient?: string; // Nama Penerima (Wali Murid / Siswa / Koordinator SD)
  collectiveRefundNote?: string;
  collectiveRefundReceiptNo?: string;

  // 2. Data Lengkap Format Buku Induk
  isFormCompleted: boolean;
  formCompletedAt?: string;
  nickname?: string;
  kkNumber?: string;
  birthCertNumber?: string;
  religion?: string;
  address?: string;
  dusun?: string;
  rt?: string;
  rw?: string;
  village?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  livingWith?: string;
  childOrder?: string | number;
  siblingsCount?: string | number;
  stepSiblingsCount?: string | number;
  transportation?: string;
  specialNeeds?: string;
  height?: number;
  weight?: number;
  distanceToSchool?: string;
  travelTime?: string;

  // Data Orang Tua / Wali
  fatherName?: string;
  fatherNik?: string;
  fatherBirthPlace?: string;
  fatherBirthDate?: string;
  fatherEducation?: string;
  fatherOccupation?: string;
  fatherIncome?: string;
  fatherPhone?: string;
  fatherStatus?: string;
  fatherAddress?: string;

  motherName?: string;
  motherNik?: string;
  motherBirthPlace?: string;
  motherBirthDate?: string;
  motherEducation?: string;
  motherOccupation?: string;
  motherIncome?: string;
  motherPhone?: string;
  motherStatus?: string;
  motherAddress?: string;

  guardianName?: string;
  guardianNik?: string;
  guardianBirthPlace?: string;
  guardianBirthDate?: string;
  guardianEducation?: string;
  guardianOccupation?: string;
  guardianIncome?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  guardianAddress?: string;

  // 3. Pembayaran Daftar Ulang & Perlengkapan (Midtrans)
  reRegistrationStatus: 'unpaid' | 'pending' | 'paid';
  reRegistrationAmount?: number;
  reRegistrationOrderId?: string;
  reRegistrationPaidAt?: string;
  reRegistrationPaymentMethod?: string;
  selectedUniformSize?: string; // e.g. "S", "M", "L", "XL", "XXL", "Jumbo"
  customUniformNote?: string;

  // 4. Berkas Upload (Akte Kelahiran, Kartu Keluarga, KTP Ayah, KTP Ibu, Foto Siswa)
  documents?: {
    aktaPhoto?: string;
    kkPhoto?: string;
    ktpAyahPhoto?: string;
    ktpIbuPhoto?: string;
    pasPhoto?: string;
    sklPhoto?: string;
    kipPhoto?: string;
  };
  documentsUploadedAt?: string;

  // 5. Status Penerimaan
  status: 'registered' | 'form_submitted' | 're_registered' | 'documents_verified' | 'accepted' | 'rejected';
  verificationNotes?: string;
  isPromotedToStudent?: boolean;
  promotedAt?: string;
  assignedClass?: string;
  [key: string]: any;
}



