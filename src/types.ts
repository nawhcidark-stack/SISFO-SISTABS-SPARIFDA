export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  email: string;
  phone: string;
  savingsBalance: number;
  password?: string;
  gender?: string;
  mutationDate?: string;
  mutationReason?: string;
  mutationDestination?: string;
}

export interface SppBill {
  id: string;
  studentId: string;
  month: string; // e.g., "Januari", "Februari"
  year: number;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending';
  paidAt?: string;
  paymentMethod?: string;
  orderId?: string;
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
}

export interface SchoolIdentity {
  name: string;
  subheading: string;
  accreditation: string;
  address: string;
  phone: string;
  principal: string;
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
  source: 'spp' | 'savings' | 'custom';
  studentName?: string;
  nis?: string;
  createdBy?: string;
  recipientName?: string;
}


export interface TeachingJournal {
  id: string;
  teacherId: string;
  teacherName: string;
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
  tp1Name: string;
  tp1Grade: number;
  tp2Name?: string;
  tp2Grade?: number;
  tp3Name?: string;
  tp3Grade?: number;
  nilaiFormatif: number; // calculated as avg of available TPs
  nilaiSumatifLM: number; // Sumatif Lingkup Materi
  nilaiSAS: number; // Sumatif Akhir Semester
  nilaiRapor: number; // calculated as e.g., (nilaiFormatif + nilaiSumatifLM + nilaiSAS) / 3 or customized weights
  deskripsiCapaian: string;
  createdAt: string;
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




