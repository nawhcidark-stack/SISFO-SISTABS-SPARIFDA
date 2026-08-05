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
  googleDriveLink?: string;

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
  achievementType?: 'akademik' | 'non-akademik';
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
}

export interface RealtimeNotification {
  id: string;
  studentId?: string; // all if undefined
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'payment';
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

export interface SchoolIdentity {
  name: string;
  subheading: string;
  accreditation: string;
  address: string;
  phone: string;
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
}







