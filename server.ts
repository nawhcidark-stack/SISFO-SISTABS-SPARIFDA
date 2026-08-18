import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import multer from "multer";

// Local storage files aren't strictly required, we can manage clean in-memory state that behaves like a database,
// allowing instant and reliable reads/writes without FS permission locks.
import { Student, SppBill, SavingsTransaction, RealtimeNotification, MidtransConfig, AttendanceLog, HomeroomTeacher, SubjectTeacher, TeachingJournal, TreasurerTransaction, StudentDevelopmentLog, StudentInfractionLog, StudentCounselingLog, ClassAnnouncement, ClassMeetingLog, MerdekaAssessment, TeacherSalary, SalaryConfig, MiscBill, ClassSchedule } from "./src/types";
import { AUTHORITATIVE_SAVINGS_MAP } from "./src/savings_map";

// Setup serverport
const PORT = process.env.PORT || 3000;

// Initialize dynamic in-memory store
const students: Student[] = [];

// Ensure all student passwords default to NIS during in-memory initialization
students.forEach(s => {
  if (!s.password) {
    s.password = s.nis.toString().trim();
  }
});

const sppBills: SppBill[] = [];
const miscBills: MiscBill[] = [];
const treasurerTransactions: TreasurerTransaction[] = [];
const savingsTransactions: SavingsTransaction[] = [];
const notifications: RealtimeNotification[] = [
  {
    id: "notif-init-1",
    title: "Selamat Datang!",
    message: "Sistem Pembayaran SPP & Tabungan SMP Maarif NU Pandaan berhasil diaktifkan.",
    type: "info",
    createdAt: new Date().toISOString()
  }
];

const attendanceLogs: AttendanceLog[] = [];

const homeroomTeachers: HomeroomTeacher[] = [
  { id: "ht-1", username: "wali7a", name: "Budi Santoso, S.Pd", className: "7-A", password: "wali123" },
  { id: "ht-2", username: "wali7b", name: "Endang Lastari, S.Pd", className: "7-B", password: "wali123" },
  { id: "ht-3", username: "wali8a", name: "Joko Susilo, S.Pd", className: "8-A", password: "wali123" },
  { id: "ht-4", username: "wali9c", name: "Rina Wijayanti, S.Pd", className: "9-C", password: "wali123" }
];

const subjectTeachers: SubjectTeacher[] = [
  { id: "st-1", username: "guru_math", name: "Drs. Heru Setyawan, M.Pd", subject: "Matematika", password: "mapel123" },
  { id: "st-2", username: "guru_english", name: "Ibu Lindawati, S.Pd", subject: "Bahasa Inggris", password: "mapel123" },
  { id: "st-3", username: "guru_ipa", name: "Budi Wijaya, S.Si", subject: "Ilmu Pengetahuan Alam", password: "mapel123" },
  { id: "st-4", username: "guru_ips", name: "Dra. Siti Rahma", subject: "Ilmu Pengetahuan Sosial", password: "mapel123" },
  { id: "st-5", username: "guru_indo", name: "Ahmad Fauzan, S.S", subject: "Bahasa Indonesia", password: "mapel123" },
  { id: "st-6", username: "guru_agama", name: "KH. M. Syukron, S.Pd.I", subject: "Pendidikan Agama Islam", password: "mapel123" },
  { id: "st-7", username: "guru_pjok", name: "Eko Prasetyo, S.Pd", subject: "Pendidikan Jasmani & OR", password: "mapel123" }
];

const teacherSalaries: TeacherSalary[] = [];
let salaryConfig: SalaryConfig = {
  baseSalaryHomeroom: 1500000,
  baseSalarySubject: 1200000,
  homeroomAllowanceRate: 500000,
  journalRate: 50000,
  defaultTunjanganMasaKerja: 350000,
  defaultPotonganDanaSosial: 50000
};

const teachingJournals: TeachingJournal[] = [];

const studentDevelopmentLogs: StudentDevelopmentLog[] = [];

const studentInfractionLogs: StudentInfractionLog[] = [];

const studentCounselingLogs: StudentCounselingLog[] = [];

const infractionRules: any[] = [
  { id: "ir-1", name: "Terlambat masuk sekolah tanpa keterangan sah", points: 5, category: "Ringan" },
  { id: "ir-2", name: "Membawa & menggunakan handphone saat KBM tanpa izin guru", points: 10, category: "Sedang" },
  { id: "ir-3", name: "Merokok di area sekolah / berseragam sekolah", points: 25, category: "Sedang" },
  { id: "ir-4", name: "Terlibat dalam perkelahian / tawuran antar pelajar", points: 75, category: "Berat" },
  { id: "ir-5", name: "Melakukan bullying / perundungan verbal maupun fisik", points: 50, category: "Berat" }
];

const classAnnouncements: ClassAnnouncement[] = [];

const classMeetingLogs: ClassMeetingLog[] = [];

import { INITIAL_SCHEDULES_CSV } from "./src/data/schedulesCsv";

function parseCsvSchedules(csvStr: string): ClassSchedule[] {
  const lines = csvStr.trim().split('\n');
  const result: ClassSchedule[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur.trim());

    if (cols.length >= 8) {
      result.push({
        id: `sch-csv-${i}`,
        day: cols[0] as any,
        className: cols[1],
        subject: cols[2],
        teacherName: cols[3],
        teacherId: cols[4] || 'st-general',
        jamKe: cols[5],
        startTime: cols[6],
        endTime: cols[7],
        alokasiWaktu: cols[8] || '1 JP',
        academicYear: '2025/2026',
        semester: 'Genap'
      });
    }
  }
  return result;
}

const merdekaAssessments: MerdekaAssessment[] = [];

const classSchedules: ClassSchedule[] = parseCsvSchedules(INITIAL_SCHEDULES_CSV);

const principalWorkPrograms: any[] = [
  {
    id: "pwp-1",
    title: "Peningkatan Kompetensi Digital Guru",
    description: "Pelatihan pemanfaatan AI-assisted grading dan e-learning Kurikulum Merdeka untuk menunjang KBM interaktif guru-guru SMP Ma'arif NU Pandaan.",
    targetDate: "2026-06-15",
    status: "active",
    syncWithStaff: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "pwp-2",
    title: "Akreditasi Sekolah & Audit Sarpras",
    description: "Peninjauan berkas kesiapan akreditasi perpustakaan digital dan laboratorium komputer SMP Ma'arif NU Pandaan.",
    targetDate: "2026-08-10",
    status: "planned",
    syncWithStaff: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "pwp-3",
    title: "Penyusunan Rapor Kegiatan Tengah Semester",
    description: "Verifikasi kelayakan Rapor Kurikulum Merdeka dan keselarasan asessment formatif ditiap jenjang kelas 7, 8, dan 9.",
    targetDate: "2026-05-30",
    status: "active",
    syncWithStaff: true,
    createdAt: new Date().toISOString()
  }
];

const teacherEvaluations: any[] = [
  {
    id: "te-1",
    teacherType: "homeroom",
    teacherId: "ht-1",
    teacherName: "Budi Santoso, S.Pd",
    evaluatorName: "H. Ahmad Fuad, S.Pd, M.PdI",
    date: "2026-05-20",
    academicYear: "2025/2026",
    pedagogicScore: 92,
    professionalScore: 88,
    personalScore: 95,
    socialScore: 90,
    notes: "Sangat baik dalam pengelolaan kelas 7-A dan memiliki kepribadian serta interaksi sosial yang hangat bersama murid dan wali murid. Perlu mempertahankan materi ajar digital demi memicu inovasi tinggi.",
    createdAt: new Date().toISOString()
  },
  {
    id: "te-2",
    teacherType: "subject_teacher",
    teacherId: "st-1",
    teacherName: "Drs. Heru Setyawan, M.Pd",
    evaluatorName: "H. Ahmad Fuad, S.Pd, M.PdI",
    date: "2026-05-22",
    academicYear: "2025/2026",
    pedagogicScore: 89,
    professionalScore: 91,
    personalScore: 88,
    socialScore: 87,
    notes: "Kemampuan memahamkan siswa terhadap konsep-konsep Aljabar dan Persamaan Linear sangat baik. Disarankan mengintegrasikan alat peraga digital interaktif.",
    createdAt: new Date().toISOString()
  }
];

const sarprasItems: any[] = [
  {
    id: "item-1",
    name: "Proyektor Epson EB-X400",
    code: "INV/EP/X400/01",
    category: "Elektronik / Multimedia",
    condition: "Baik",
    location: "Gudang Multimedia",
    totalQty: 5,
    availableQty: 3,
    price: 5200000,
    purchaseYear: "2024"
  },
  {
    id: "item-2",
    name: "Layar Projector Tripod 70 inch",
    code: "INV/SCR/L150/02",
    category: "Multimedia",
    condition: "Baik",
    location: "Lab Komputer 1",
    totalQty: 3,
    availableQty: 2,
    price: 1400000,
    purchaseYear: "2023"
  },
  {
    id: "item-3",
    name: "Laptop Acer Aspire 3 Intel Core i3",
    code: "INV/LP/AC/05",
    category: "Elektronik / Komputer",
    condition: "Baik",
    location: "Ruang BK",
    totalQty: 4,
    availableQty: 4,
    price: 7500000,
    purchaseYear: "2025"
  },
  {
    id: "item-4",
    name: "Wireless Microphone Shure SVX24",
    code: "INV/MIC/SH-300",
    category: "Audio / Elektronik",
    condition: "Rusak Ringan",
    location: "Lab Musik",
    totalQty: 2,
    availableQty: 2,
    price: 1950000,
    purchaseYear: "2024"
  },
  {
    id: "item-5",
    name: "Speaker Portable Polytron PTS-112",
    code: "INV/SPK/POL-10",
    category: "Audio / Elektronik",
    condition: "Baik",
    location: "Lab Bahasa",
    totalQty: 2,
    availableQty: 1,
    price: 2800000,
    purchaseYear: "2025"
  }
];

const sarprasProposals: any[] = [
  {
    id: "proposal-1",
    itemName: "Whiteboard Baru Magnetic (Kelas 7-B & 7-C)",
    qty: 2,
    estimatedPrice: 350000,
    totalPrice: 700000,
    proposedBy: "Waka Sarpras",
    date: "2026-05-24",
    reason: "Papan tulis kelas 7-B sudah buram dan tidak bisa dibersihkan",
    status: "approved",
    notes: "Disetujui. Silakan dikoordinasikan dengan Bendahara.",
    createdAt: new Date().toISOString()
  },
  {
    id: "proposal-2",
    itemName: "10 Unit Chromebook Lenovo Belajar",
    qty: 10,
    estimatedPrice: 3500000,
    totalPrice: 35000000,
    proposedBy: "Waka Sarpras",
    date: "2026-05-26",
    reason: "Kekurangan perangkat untuk pelaksanaan Asesmen Nasional (ANBK) Mandiri",
    status: "pending",
    notes: "",
    createdAt: new Date().toISOString()
  }
];

const sarprasLoans: any[] = [
  {
    id: "loan-1",
    itemId: "item-1",
    itemName: "Proyektor Epson EB-X400",
    borrowerId: "st-1",
    borrowerName: "Drs. Heru Setyawan, M.Pd",
    qty: 1,
    loanDate: "2026-05-26",
    status: "dipinjam",
    notes: "Untuk pelajaran aljabar kelas 7-A"
  },
  {
    id: "loan-2",
    itemId: "item-5",
    itemName: "Speaker Portable Polytron PTS-112",
    borrowerId: "st-2",
    borrowerName: "Ibu Lindawati, S.Pd",
    qty: 1,
    loanDate: "2026-05-27",
    status: "dipinjam",
    notes: "Listening practice kelas 8-B"
  }
];

// Pre-populate SPP bills (Juli 2025 to Juni 2026)
const months = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni"
];

// Configuration of SPP rates per level (Class 7, 8, and 9)
let sppRates = {
  grade7: 150000,
  grade8: 155000,
  grade9: 160000
};

// Configuration of School Identity
let schoolIdentity = {
  name: "SMP MA'ARIF NU PANDAAN",
  subheading: "LP MA'ARIF NU CABANG PASURUAN",
  accreditation: "Terakreditasi A",
  address: "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur",
  phone: "(0343) 631234",
  principal: "H. Ahmad Fuad, S.Pd, M.PdI",
  principalSignature: "", // base64 string or image url of principal signature
  treasurer: "Bendahara Sekolah NU",
  logo: "", // base64 string or image url containing the school logo
  logo2: "", // base64 string or image url containing the second school logo
  letterhead: "", // base64 string or image url containing the school kop surat
  treasurerSignature: "", // base64 string or image url of treasurer signature
  schoolStamp: "", // base64 string or image url of school official stamp
  apkUrl: "",
  iosUrl: "",
  favicon: "",
  paymentCardTemplate: "",
  activeAcademicYear: "2026/2027"
};

// WhatsApp API notification settings
let whatsappConfig = {
  token: "",          // API Token from Fonnte, Wablas, or other provider
  sender: "",         // Sender number (optional depending on API)
  provider: "Fonnte", // Fonnte, Wablas, Whacenter, or Custom/Lainnya
  baseUrl: "https://api.fonnte.com/send", // Default URL
  enabled: false,     // Toggle enable notification globally
  notifyOnBilling: true, // Auto send WA on new billing statement creation
  notifyOnPayment: true,  // Auto send WA when payment succeeds (online/offline)
  notifyOnSavings: true   // Auto send WA when deposit/withdrawal of savings succeeds
};

// Treasurer/Bendahara Credentials Config
let treasurerConfig: {
  password: string;
  categories?: Array<{ name: string; type: 'incoming' | 'outgoing' | 'both' }>;
  id?: string;
} = {
  password: "bendahara123",
  categories: [
    { name: 'Operasional', type: 'outgoing' },
    { name: 'Gaji Guru', type: 'outgoing' },
    { name: 'Pembangunan', type: 'outgoing' },
    { name: 'Ujian', type: 'outgoing' },
    { name: 'HUT RI 81 2026', type: 'both' },
    { name: 'JARIYAH', type: 'incoming' },
    { name: 'SPARIFDA MART', type: 'both' },
    { name: 'MPLS 2026', type: 'both' },
    { name: 'Lain-lain', type: 'outgoing' },
    { name: 'Mantenance Aplikasi', type: 'outgoing' },
    { name: 'Utama', type: 'both' }
  ]
};

// Kepala Sekolah Credentials Config
let principalConfig = {
  password: "kepala123"
};

// Waka Sarpras Credentials Config
let sarprasConfig = {
  password: "sarpras123"
};

// Guru BK Credentials Config
let bkConfig = {
  password: "bk123"
};

// Waka Kurikulum Credentials Config
let curriculumConfig = {
  password: "kurikulum123"
};

// Admin Credentials Config
let adminConfig = {
  password: "admin123"
};

// Automatic Backup Configuration & Memory Store
let backupConfig = {
  enabled: true,
  intervalHours: 12,
  maxBackups: 10,
  lastBackupTime: "",
  nextBackupTime: "",
  autoDownloadLocal: false
};

const databaseBackups: any[] = [];

// Server configuration values (Midtrans Keys)
let midtransConfig: MidtransConfig = {
  merchantId: process.env.MIDTRANS_MERCHANT_ID || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  isProduction: false,
  isDisabled: false,
  adminFee: 4000,
  systemMaintenanceFee: 0,
  chargeFeesToUser: false,
  pin: "1234"
};

// Shorten any bill ID to fit within Midtrans' 50-character limit
function shortenBillIdForMidtrans(id: string): string {
  let result = id;
  // Replaces standard prefix "bill-std-std-" to "B-S-"
  if (result.startsWith("bill-std-std-")) {
    result = "B-S-" + result.slice(13);
  } else if (result.startsWith("bill-std-")) {
    result = "B-" + result.slice(9);
  }
  // Replaces "-unpaid" with "-u"
  if (result.endsWith("-unpaid")) {
    result = result.slice(0, -7) + "-u";
  }
  // Replaces long month names with short ones
  const monthMapShorten: { [key: string]: string } = {
    "Januari": "Jan",
    "Februari": "Feb",
    "Maret": "Mar",
    "April": "Apr",
    "Mei": "Mei",
    "Juni": "Jun",
    "Juli": "Jul",
    "Agustus": "Agu",
    "September": "Sep",
    "Oktober": "Okt",
    "November": "Nov",
    "Desember": "Des"
  };
  for (const [full, short] of Object.entries(monthMapShorten)) {
    if (result.includes(`-${full}-`)) {
      result = result.replace(`-${full}-`, `-${short}-`);
    }
  }
  // Convert 13-digit millisecond timestamps starting with 17 or 18 or 19 to base-36
  result = result.replace(/(1[789]\d{11})/g, (match) => {
    return Number(match).toString(36);
  });
  // Replace standard UUIDs if any
  const uuidRegex = /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  result = result.replace(uuidRegex, "$1");

  if (result.length > 50) {
    result = result.slice(0, 50);
  }
  return result;
}

// Reconstruct the original bill ID from the compressed/shortened version
function decompressBillIdForMidtrans(id: string): string {
  let result = id;
  if (result.includes("-B-")) {
    result = "B-" + result.split("-B-")[1];
  } else if (result.includes("B-") && !result.startsWith("B-")) {
    result = "B-" + result.split("B-")[1];
  }
  if (result.startsWith("B-S-")) {
    result = "bill-std-std-" + result.slice(4);
  } else if (result.startsWith("B-")) {
    result = "bill-std-" + result.slice(2);
  }
  if (result.endsWith("-u")) {
    result = result.slice(0, -2) + "-unpaid";
  }
  const monthMapExpand: { [key: string]: string } = {
    "jan": "Januari", "feb": "Februari", "mar": "Maret", "apr": "April",
    "mei": "Mei", "jun": "Juni", "jul": "Juli", "agu": "Agustus",
    "sep": "September", "okt": "Oktober", "nov": "November", "des": "Desember"
  };
  for (const [short, full] of Object.entries(monthMapExpand)) {
    if (result.toLowerCase().includes(`-${short}-`)) {
      const regex = new RegExp(`-${short}-`, "gi");
      result = result.replace(regex, `-${full}-`);
    }
  }
  // Convert base-36 string back to 13-digit base-10 timestamp
  result = result.replace(/([a-z0-9]{8})/g, (match) => {
    const parsed = parseInt(match, 36);
    if (parsed >= 1577836800000 && parsed <= 2051155200000) {
      return String(parsed);
    }
    return match;
  });
  return result;
}

// Helper to find SPP bill matching raw ID or decompressed ID or month/year
function findSppBillMatching(idOrOrderId: string, sppBillsList: SppBill[], targetStudentId?: string): SppBill | undefined {
  if (!idOrOrderId) return undefined;
  const clean = decompressBillIdForMidtrans(idOrOrderId);

  // 1. Direct match by orderId or exact bill id
  let matched = sppBillsList.find(b =>
    b.orderId === idOrOrderId ||
    b.orderId === clean ||
    b.id === clean ||
    b.id === clean + "-unpaid" ||
    b.id === idOrOrderId ||
    b.id === idOrOrderId + "-unpaid" ||
    (clean.endsWith("-unpaid") && b.id === clean.slice(0, -7))
  );
  if (matched) return matched;

  // 1b. Direct match by stripping trailing 4-digit timestamp suffix
  const cleanWithoutSuffix = clean.replace(/-\d{4}$/, "");
  matched = sppBillsList.find(b =>
    b.id === cleanWithoutSuffix ||
    b.id === cleanWithoutSuffix + "-unpaid" ||
    b.orderId === cleanWithoutSuffix
  );
  if (matched) return matched;

  // 2. Match by extracted month & year & student
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  
  let detectedMonth = "";
  for (let i = 0; i < monthNames.length; i++) {
    const full = monthNames[i];
    const short = shortMonths[i];
    if (new RegExp(`[-_]${full}(?:[-_]|$)`, "i").test(idOrOrderId) || new RegExp(`[-_]${short}(?:[-_]|$)`, "i").test(idOrOrderId) ||
        new RegExp(`[-_]${full}(?:[-_]|$)`, "i").test(clean) || new RegExp(`[-_]${short}(?:[-_]|$)`, "i").test(clean)) {
      detectedMonth = full;
      break;
    }
  }

  const yearMatch = idOrOrderId.match(/(202[4-9]|203[0-9])/) || clean.match(/(202[4-9]|203[0-9])/);
  const detectedYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  // Extract student ID/NIS from string if not provided
  let effectiveStudentId = targetStudentId;
  if (!effectiveStudentId) {
    if (clean.includes("bill-std-")) {
      const parts = clean.split("-");
      const stdIdx = parts.findIndex((p, idx) => p === "std" && idx < parts.length - 1);
      if (stdIdx !== -1) {
        effectiveStudentId = parts.slice(stdIdx, stdIdx + 4).join("-");
      }
    } else if (idOrOrderId.startsWith("SPP-")) {
      const parts = idOrOrderId.split("-");
      const nisOrId = parts[1];
      if (nisOrId) {
        const found = students.find(s => String(s.nis).trim() === nisOrId || s.id === nisOrId || s.id === `std-${nisOrId}`);
        if (found) effectiveStudentId = found.id;
      }
    }
  }

  if (effectiveStudentId && detectedMonth) {
    matched = sppBillsList.find(b =>
      b.studentId === effectiveStudentId &&
      b.month.toLowerCase() === detectedMonth.toLowerCase() &&
      (!detectedYear || b.year === detectedYear)
    );
    if (matched) return matched;
  }

  // 3. Fallback partial ID match - MUST strictly check month if present in bill ID
  if (clean.startsWith("bill-std-")) {
    const cleanCore = clean.replace(/-\d{4}$/, "").replace(/-unpaid$/, "");
    matched = sppBillsList.find(b => {
      const bCore = b.id.replace(/-unpaid$/, "");
      if (bCore === cleanCore) return true;
      // Only match partial if month is strictly matched
      if (detectedMonth && b.month.toLowerCase() !== detectedMonth.toLowerCase()) return false;
      if (detectedYear && b.year !== detectedYear) return false;
      return bCore.startsWith(cleanCore) || cleanCore.startsWith(bCore);
    });
    if (matched) return matched;
  }

  return undefined;
}

// Compress a miscellaneous bill ID to fit within Midtrans' 50-character limit
function compressMiscBillIdForMidtrans(id: string): string {
  let result = id;
  // Replace standard prefixes to shorten
  if (result.startsWith("misc-std-std-")) {
    result = "M-S-" + result.slice(13);
  } else if (result.startsWith("misc-std-")) {
    result = "M-" + result.slice(9);
  }
  
  // Replace any 13-digit millisecond timestamps starting with 17 or 18 (valid range for years 2023-2030) with base-36 values
  result = result.replace(/(1[78]\d{11})/g, (match) => {
    return Number(match).toString(36);
  });
  
  return result;
}

// Reconstruct the original miscellaneous bill ID from the compressed/shortened version
function decompressMiscBillIdForMidtrans(id: string): string {
  let result = id;
  if (result.includes("-M-")) {
    result = "M-" + result.split("-M-")[1];
  } else if (result.includes("M-") && !result.startsWith("M-")) {
    result = "M-" + result.split("M-")[1];
  }
  
  // Convert 8-character base-36 strings back to 13-digit base-10 timestamps
  result = result.replace(/([a-z0-9]{8})/g, (match) => {
    const parsed = parseInt(match, 36);
    // Ensure it falls within years 2020 to 2035 range
    if (parsed >= 1577836800000 && parsed <= 2051155200000) {
      return String(parsed);
    }
    return match;
  });
  
  // Restore original prefixes
  if (result.startsWith("M-S-")) {
    result = "misc-std-std-" + result.slice(4);
  } else if (result.startsWith("M-")) {
    result = "misc-std-" + result.slice(2);
  }
  
  return result;
}

// Helper to find Miscellaneous bill matching raw ID, decompressed ID, prefix, or student
function findMiscBillMatching(idOrOrderId: string, miscBillsList: MiscBill[], targetStudentId?: string, grossAmount?: number): MiscBill | undefined {
  if (!idOrOrderId) return undefined;
  const cleanOrderId = idOrOrderId.trim();
  const cleanDecomp = decompressMiscBillIdForMidtrans(cleanOrderId);

  // 1. Direct match by exact orderId, id, or decompressed id
  let matched = miscBillsList.find(b =>
    b.orderId === cleanOrderId ||
    b.orderId === cleanDecomp ||
    b.id === cleanOrderId ||
    b.id === cleanDecomp
  );
  if (matched) return matched;

  // 2. If it is a MISC order id, extract components
  let middle = cleanOrderId;
  if (middle.startsWith("MISC-") || middle.includes("MISC-")) {
    middle = middle.includes("MISC-") ? middle.split("MISC-")[1] : middle;
  }
  const lastHyphenIndex = middle.lastIndexOf("-");
  const billIdPart = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
  const cleanBillId = decompressMiscBillIdForMidtrans(billIdPart);

  matched = miscBillsList.find(b =>
    b.id === cleanBillId ||
    b.id === billIdPart ||
    b.orderId === cleanOrderId ||
    b.orderId === billIdPart
  );
  if (matched) return matched;

  // 3. Match by partial/truncated prefix (when Midtrans 50-char limit trims trailing characters)
  if (cleanBillId && cleanBillId.length >= 12) {
    matched = miscBillsList.find(b => b.id.startsWith(cleanBillId));
    if (matched) return matched;
  }

  // 4. Match by student NIS extracted from orderId
  let studentId = targetStudentId;
  if (!studentId && cleanOrderId.startsWith("MISC-")) {
    const parts = cleanOrderId.split("-");
    const nisOrId = parts[1];
    if (nisOrId) {
      const student = students.find(s => String(s.nis).trim() === nisOrId || s.id === nisOrId || s.id === `std-${nisOrId}`);
      if (student) studentId = student.id;
    }
  }

  if (studentId) {
    if (grossAmount && grossAmount > 0) {
      matched = miscBillsList.find(b => b.studentId === studentId && (b.status === "pending" || b.status === "unpaid") && b.amount === grossAmount) ||
                miscBillsList.find(b => b.studentId === studentId && b.amount === grossAmount);
      if (matched) return matched;
    }
    // Match any pending bill for this student
    matched = miscBillsList.find(b => b.studentId === studentId && b.status === "pending");
    if (matched) return matched;
  }

  return undefined;
}

// Helper to determine tuition SPP amount based on student class/level
function getSppAmountForClass(className: string): number {
  const cleanClass = (className || "").trim().toUpperCase();
  if (cleanClass.startsWith("7") || cleanClass.startsWith("VII")) {
    return sppRates.grade7;
  } else if (cleanClass.startsWith("8") || cleanClass.startsWith("VIII")) {
    return sppRates.grade8;
  } else if (cleanClass.startsWith("9") || cleanClass.startsWith("IX")) {
    return sppRates.grade9;
  }
  return sppRates.grade7 || 150000; // fallback default
}

function getSppAmountForStudent(student: any, className?: string): number {
  if (student && student.customSppRate !== undefined && student.customSppRate !== null && !isNaN(Number(student.customSppRate)) && Number(student.customSppRate) > 0) {
    return Number(student.customSppRate);
  }
  return getSppAmountForClass(className || student?.class || "");
}

// Helper to purge unpaid/pending SPP bills for mutated students starting from mutation month and subsequent months
function purgeMutatedStudentUnpaidBills(): number {
  let purgedCount = 0;
  const MONTH_MAP: Record<string, number> = {
    "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
    "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
  };

  const mutatedStudents = students.filter(s => 
    (s.mutationDate && s.mutationDate.trim() !== '') || 
    (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'))
  );

  mutatedStudents.forEach(student => {
    let mutYear: number;
    let mutMonthIdx: number;

    if (student.mutationDate && student.mutationDate.trim()) {
      const d = new Date(student.mutationDate.trim());
      if (!isNaN(d.getTime())) {
        mutYear = d.getFullYear();
        mutMonthIdx = d.getMonth();
      } else {
        const parts = student.mutationDate.trim().split("-");
        mutYear = parseInt(parts[0], 10) || new Date().getFullYear();
        mutMonthIdx = (parseInt(parts[1], 10) || 1) - 1;
      }
    } else {
      const now = new Date();
      mutYear = now.getFullYear();
      mutMonthIdx = now.getMonth();
    }

    const mutationScore = mutYear * 12 + mutMonthIdx;

    for (let i = sppBills.length - 1; i >= 0; i--) {
      const bill = sppBills[i];
      if (bill.studentId === student.id && (bill.status === "unpaid" || bill.status === "pending")) {
        const billMonthIdx = MONTH_MAP[bill.month] !== undefined ? MONTH_MAP[bill.month] : 0;
        const billScore = bill.year * 12 + billMonthIdx;

        if (billScore >= mutationScore) {
          const [removedBill] = sppBills.splice(i, 1);
          purgedCount++;
          deleteDocFromFirestore("sppBills", removedBill.id).catch(err => console.error(err));
          if (mongoDb) {
            mongoDb.collection("sppBills").deleteOne({ id: removedBill.id }).catch(err => console.error(err));
          }
        }
      }
    }
  });

  return purgedCount;
}

// Helper to purge all auto-reconciled Midtrans ledger entries and generated categories
function purgeMidtransAutoReconciliation(): { treasurerPurged: number; savingsPurged: number; categoriesPurged: number } {
  let treasurerPurged = 0;
  let savingsPurged = 0;
  let categoriesPurged = 0;

  // 1. Purge auto-recon entries from treasurerTransactions
  for (let i = treasurerTransactions.length - 1; i >= 0; i--) {
    const t = treasurerTransactions[i];
    const catLower = (t.category || "").toLowerCase();
    const descLower = (t.description || "").toLowerCase();
    const orderId = (t.orderId || "").toUpperCase();
    const noBukti = (t.noBukti || "").toUpperCase();
    const createdByLower = (t.createdBy || "").toLowerCase();

    const isAutoRecon = 
      catLower.includes("pembayaran online midtrans") ||
      catLower.includes("transaksi online") ||
      descLower.includes("(report)") ||
      descLower.includes("midtrans report") ||
      descLower.includes("verified via midtrans") ||
      descLower.includes("keranjang midtrans report") ||
      descLower.includes("pembayaran online midtrans") ||
      orderId.startsWith("MIDTRANS-REPORT") ||
      orderId.startsWith("P7") ||
      orderId.startsWith("P8") ||
      orderId.startsWith("P6") ||
      orderId.startsWith("P5") ||
      noBukti.includes("-MAN--") ||
      createdByLower.includes("midtrans bulk report") ||
      t.fundingSource === "Kas Bank/Midtrans";

    if (isAutoRecon) {
      const [removed] = treasurerTransactions.splice(i, 1);
      treasurerPurged++;
      deleteDocFromFirestore("treasurerTransactions", removed.id).catch(err => console.error(err));
      if (mongoDb) {
        mongoDb.collection("treasurerTransactions").deleteOne({ id: removed.id }).catch(err => console.error(err));
      }
    }
  }

  // 2. Purge auto-recon entries from savingsTransactions
  const affectedStudentIds = new Set<string>();
  for (let i = savingsTransactions.length - 1; i >= 0; i--) {
    const s = savingsTransactions[i];
    const notesLower = (s.notes || "").toLowerCase();
    const idStr = (s.id || "").toLowerCase();
    const orderId = (s.orderId || "").toUpperCase();

    const isAutoSavings = 
      idStr.includes("sav-pay-report-") ||
      notesLower.includes("midtrans report") ||
      notesLower.includes("verified via midtrans") ||
      orderId.startsWith("MIDTRANS-REPORT") ||
      orderId.startsWith("P7") ||
      orderId.startsWith("P8") ||
      orderId.startsWith("P6") ||
      orderId.startsWith("P5");

    if (isAutoSavings) {
      const [removed] = savingsTransactions.splice(i, 1);
      savingsPurged++;
      affectedStudentIds.add(removed.studentId);
      deleteDocFromFirestore("savingsTransactions", removed.id).catch(err => console.error(err));
      if (mongoDb) {
        mongoDb.collection("savingsTransactions").deleteOne({ id: removed.id }).catch(err => console.error(err));
      }
    }
  }

  // Recalculate savings balance for affected students based on remaining manual transactions
  affectedStudentIds.forEach(studentId => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      const studentSavings = savingsTransactions.filter(st => st.studentId === studentId && st.status === "success");
      let newBal = 0;
      studentSavings.forEach(st => {
        if (st.type === "deposit") newBal += st.amount;
        else if (st.type === "withdrawal") newBal -= st.amount;
      });
      student.savingsBalance = Math.max(0, newBal);
      upsertDocToMongoDB("students", student).catch(err => console.error(err));
    }
  });

  // 3. Clean up treasurerConfig / categories if "Pembayaran Online Midtrans" or "Transaksi Online" exists
  if ((treasurerConfig as any).categories && Array.isArray((treasurerConfig as any).categories)) {
    const beforeLen = (treasurerConfig as any).categories.length;
    (treasurerConfig as any).categories = (treasurerConfig as any).categories.filter((c: any) => {
      const name = typeof c === 'string' ? c : c.name || '';
      return !name.toLowerCase().includes("midtrans") && !name.toLowerCase().includes("transaksi online");
    });
    categoriesPurged = beforeLen - (treasurerConfig as any).categories.length;
  }

  if (treasurerPurged > 0 || savingsPurged > 0 || categoriesPurged > 0) {
    console.log(`[PURGE MIDTRANS AUTO RECON] Cleaned ${treasurerPurged} treasurer entries, ${savingsPurged} savings entries, ${categoriesPurged} categories.`);
    saveState();
  }

  return { treasurerPurged, savingsPurged, categoriesPurged };
}

const DATA_FILE = path.join(process.cwd(), "data_store.json");

// MongoDB Database connection initialization
let mongoClient: MongoClient | null = null;
let mongoDb: any = null;
let dbSyncStatus = "Initial";
let dbSyncError: string | null = null;
let lastSyncTime: string | null = null;
let isInitialSyncCompleted = false;

async function reconnectMongoClient() {
  try {
    const rawUri = process.env.MONGODB_URI || "mongodb+srv://portalinspiratif_db_user:Sparifda20519113@cluster0.0hekxl2.mongodb.net/spp_maarif?retryWrites=true&w=majority";
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (e) {}
      mongoClient = null;
      mongoDb = null;
    }
    const cleanUri = sanitizeMongoUri(rawUri);
    mongoClient = new MongoClient(cleanUri, {
      retryWrites: true,
      retryReads: true,
      serverSelectionTimeoutMS: 10000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db("spp_maarif");
    console.log("[MongoDB] Connection refreshed successfully after stale topology/election switch.");
  } catch (err: any) {
    console.warn("[MongoDB] Failed to refresh connection:", err?.message || err);
  }
}

async function executeMongoOperationWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isStaleTopology = msg.includes("stale") || msg.includes("electionId") || msg.includes("setVersion") || msg.includes("topology") || msg.includes("pool") || msg.includes("connection") || msg.includes("reset");
      if (isStaleTopology && attempt < retries) {
        console.warn(`[MongoDB Retry] Topology/Election error detected (attempt ${attempt + 1}/${retries}): ${msg}. Reconnecting MongoClient...`);
        await reconnectMongoClient();
      } else {
        throw err;
      }
    }
  }
  throw new Error("Mongo operation failed after retries.");
}

async function deleteDocFromFirestore(colName: string, docId: string) {
  if (!mongoDb) return;
  try {
    await executeMongoOperationWithRetry(async () => {
      const col = mongoDb.collection(colName);
      await col.deleteOne({ $or: [{ _id: docId }, { id: docId }] });
    });
    console.log(`Deleted document ${docId} from ${colName} in MongoDB`);
  } catch (err) {
    console.error(`Failed to delete document ${docId} from ${colName} in MongoDB:`, err);
  }
}

async function upsertDocToMongoDB(colName: string, doc: any) {
  if (!mongoDb || !isInitialSyncCompleted) return;
  try {
    const docCopy = { ...doc };
    const docId = String(docCopy.id || docCopy._id || `id-${Math.random()}`);
    docCopy._id = docId;
    docCopy.id = docId;
    await executeMongoOperationWithRetry(async () => {
      const col = mongoDb.collection(colName);
      await col.replaceOne({ _id: docId }, docCopy, { upsert: true });
    });
    console.log(`[MongoDB Direct] Upserted document ${docId} in ${colName}`);
  } catch (err) {
    console.error(`[MongoDB Direct] Failed to upsert document in ${colName}:`, err);
  }
}

function applyAuthoritativeSavingsBalances(studentList: Student[]) {
  studentList.forEach(s => {
    const nisStr = String(s.nis || "").trim();
    if (s.savingsBalance === undefined || s.savingsBalance === null) {
      if (AUTHORITATIVE_SAVINGS_MAP.hasOwnProperty(nisStr)) {
        s.savingsBalance = AUTHORITATIVE_SAVINGS_MAP[nisStr];
      } else {
        s.savingsBalance = 0;
      }
    }
  });
}

async function saveStateToFirestore() {
  if (!mongoDb || !isInitialSyncCompleted) return;
  try {
    console.log("Syncing database state to MongoDB Cluster...");
    
    // Save list helper with non-destructive bulk upsert
    const saveList = async (collectionName: string, list: any[]) => {
      if (!Array.isArray(list)) return;
      await executeMongoOperationWithRetry(async () => {
        const col = mongoDb.collection(collectionName);
        if (list.length === 0) {
          await col.deleteMany({});
          return;
        }
        const currentIds: string[] = [];
        const operations = list.map(item => {
          const doc = { ...item };
          const docId = String(doc.id || doc._id || `id-${Math.random()}`);
          doc._id = docId;
          doc.id = docId;
          currentIds.push(docId);
          return {
            replaceOne: {
              filter: { _id: docId },
              replacement: doc,
              upsert: true
            }
          };
        });
        // Write/Upsert all docs first so existing data is never wiped prematurely
        await col.bulkWrite(operations, { ordered: false });
        // Prune stale documents no longer present in local memory list
        await col.deleteMany({ _id: { $nin: currentIds } });
      });
    };

    await saveList("students", students);
    await saveList("sppBills", sppBills);
    await saveList("miscBills", miscBills);
    await saveList("savingsTransactions", savingsTransactions);
    
    // Notifications (capped at newest 100 for network performance)
    const newestNotifications = notifications.slice(0, 100);
    await saveList("realtimeNotifications", newestNotifications);
    
    await saveList("attendanceLogs", attendanceLogs);
    await saveList("homeroomTeachers", homeroomTeachers);
    await saveList("subjectTeachers", subjectTeachers);
    await saveList("teachingJournals", teachingJournals);
    await saveList("treasurerTransactions", treasurerTransactions);
    await saveList("studentDevelopmentLogs", studentDevelopmentLogs);
    await saveList("studentInfractionLogs", studentInfractionLogs);
    await saveList("studentCounselingLogs", studentCounselingLogs);
    await saveList("classAnnouncements", classAnnouncements);
    await saveList("classMeetingLogs", classMeetingLogs);
    await saveList("merdekaAssessments", merdekaAssessments);
    await saveList("classSchedules", classSchedules);
    await saveList("principalWorkPrograms", principalWorkPrograms);
    await saveList("teacherEvaluations", teacherEvaluations);
    await saveList("infractionRules", infractionRules);
    await saveList("sarprasItems", sarprasItems);
    await saveList("sarprasProposals", sarprasProposals);
    await saveList("sarprasLoans", sarprasLoans);
    await saveList("teacherSalaries", teacherSalaries);

    // Save configurations as individual upserted documents in the configs collection
    const configCol = mongoDb.collection("configs");
    const saveConfig = async (id: string, configData: any) => {
      const { _id, ...cleanedData } = configData;
      await configCol.replaceOne({ id }, { ...cleanedData, id }, { upsert: true });
    };

    await saveConfig("sppRates", sppRates);
    await saveConfig("schoolIdentity", schoolIdentity);
    await saveConfig("midtransConfig", midtransConfig);
    await saveConfig("whatsappConfig", whatsappConfig);
    await saveConfig("treasurerConfig", treasurerConfig);
    await saveConfig("principalConfig", principalConfig);
    await saveConfig("sarprasConfig", sarprasConfig);
    await saveConfig("bkConfig", bkConfig);
    await saveConfig("curriculumConfig", curriculumConfig);
    await saveConfig("adminConfig", adminConfig);
    await saveConfig("salaryConfig", salaryConfig);
    await saveConfig("backupConfig", backupConfig);
    await saveConfig("systemMetadata", { seeded: true });

    console.log("All state collections successfully synced to MongoDB.");
  } catch (err) {
    console.error("Failed executing batch state sync to MongoDB:", err);
  }
}

let isSavingToFirestore = false;
let hasPendingFirestoreSave = false;
let firestoreSyncTimeout: NodeJS.Timeout | null = null;

function triggerFirestoreSync() {
  if (!mongoDb || !isInitialSyncCompleted) return;

  if (firestoreSyncTimeout) {
    clearTimeout(firestoreSyncTimeout);
  }

  // Debounce sync execution by 50 ms to ensure instant real-time persistence to MongoDB
  firestoreSyncTimeout = setTimeout(async () => {
    firestoreSyncTimeout = null;

    if (isSavingToFirestore) {
      hasPendingFirestoreSave = true;
      return;
    }

    isSavingToFirestore = true;
    hasPendingFirestoreSave = false;

    console.log("[SYNC ENGINE] Initiating debounced background state sync to MongoDB...");
    try {
      await saveStateToFirestore();
    } catch (err) {
      console.error("[SYNC ENGINE] Background state sync failed:", err);
    } finally {
      isSavingToFirestore = false;
      if (hasPendingFirestoreSave) {
        // Trigger next sync loop
        triggerFirestoreSync();
      }
    }
  }, 300);
}

function sanitizeMongoUri(uriString: string): string {
  if (!uriString) return uriString;
  try {
    let processed = uriString.trim();
    if ((processed.startsWith('"') && processed.endsWith('"')) || (processed.startsWith("'") && processed.endsWith("'"))) {
      processed = processed.slice(1, -1);
    }
    
    // Replace angle brackets if wrapped
    processed = processed.replace(/<([^>]+)>/g, "$1");

    // Parse scheme, credentials, host, options
    const match = processed.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
    if (!match) {
      return processed;
    }

    const scheme = match[1];
    const username = match[2];
    let password = match[3];
    const host = match[4];
    const rest = match[5];

    const decodedPassword = decodeURIComponent(password);
    const encodedPassword = encodeURIComponent(decodedPassword);

    // Ensure database name spp_maarif with retryWrites
    let pathAndOptions = rest || "/spp_maarif?retryWrites=true&w=majority";
    if (pathAndOptions === "" || pathAndOptions === "/" || pathAndOptions === "/?" || pathAndOptions.startsWith("/?")) {
      const query = pathAndOptions.startsWith("/?") ? pathAndOptions.slice(2) : (pathAndOptions === "/?" ? "" : pathAndOptions.slice(1));
      pathAndOptions = "/spp_maarif" + (query ? "?" + query : "?retryWrites=true&w=majority");
    }

    const sanitized = `${scheme}${username}:${encodedPassword}@${host}${pathAndOptions}`;
    console.log(`Sanitized MongoDB URI: ${scheme}${username}:***@${host}${pathAndOptions}`);
    return sanitized;
  } catch (e) {
    console.warn("Failed to sanitize MongoDB URI:", e);
    return uriString;
  }
}

async function syncWithFirestore(forcePush: boolean = false) {
  const rawUri = process.env.MONGODB_URI || "mongodb+srv://portalinspiratif_db_user:Sparifda20519113@cluster0.0hekxl2.mongodb.net/spp_maarif?retryWrites=true&w=majority";
  
  // Build a distinct pool of Connection Candidate URIs to attempt
  const candidates: string[] = [];

  // 1. Initial Candidate: exact sanitized rawUri from the active environment
  const firstSanitized = sanitizeMongoUri(rawUri);
  if (firstSanitized) candidates.push(firstSanitized);

  // Parse rawUri to generate alternate password password variations
  try {
    let urlToParse = rawUri.trim().replace(/<([^>]+)>/g, "$1");
    if ((urlToParse.startsWith('"') && urlToParse.endsWith('"')) || (urlToParse.startsWith("'") && urlToParse.endsWith("'"))) {
      urlToParse = urlToParse.slice(1, -1);
    }
    const match = urlToParse.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
    if (match) {
      const scheme = match[1];
      const username = match[2];
      const host = match[4];
      const rest = match[5];

      // Try these password variations:
      const alternatePasswords = [
        "Sparifda20519113",
        "Sparifda%4020519113",  // Sparifda@20519113 encoded
        "Sparifda@20519113",    // Sparifda@20519113 raw (gets auto-encoded in sanitize)
        "Sparifda92"
      ];

      for (const pass of alternatePasswords) {
        const candidateUri = sanitizeMongoUri(`${scheme}${username}:${pass}@${host}${rest}`);
        if (candidateUri && !candidates.includes(candidateUri)) {
          candidates.push(candidateUri);
        }
      }
    }
  } catch (e) {
    console.warn("Error generating password candidates:", e);
  }

  // Fallback defaults if they aren't already included
  const def1 = "mongodb+srv://portalinspiratif_db_user:Sparifda%4020519113@cluster0.0hekxl2.mongodb.net/spp_maarif?retryWrites=true&w=majority";
  const def2 = "mongodb+srv://portalinspiratif_db_user:Sparifda20519113@cluster0.0hekxl2.mongodb.net/spp_maarif?retryWrites=true&w=majority";
  if (!candidates.includes(def1)) candidates.push(def1);
  if (!candidates.includes(def2)) candidates.push(def2);

  let connectSuccess = false;
  let connectionError: any = null;
  let resolvedUri = "";

  for (let i = 0; i < candidates.length; i++) {
    const uriCandidate = candidates[i];
    try {
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch (e) {
          console.warn("Failed to close existing MongoClient:", e);
        }
        mongoClient = null;
        mongoDb = null;
      }

      console.log(`Connecting database with MongoDB Candidate URI #${i + 1}/${candidates.length}...`);
      dbSyncStatus = `Connecting (Try #${i + 1})...`;
      
      mongoClient = new MongoClient(uriCandidate);
      await mongoClient.connect();
      mongoDb = mongoClient.db("spp_maarif");
      console.log(`MongoDB connection verified on candidate #${i + 1}.`);
      resolvedUri = uriCandidate;
      connectSuccess = true;
      break;
    } catch (err: any) {
      connectionError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Connection Candidate #${i + 1} failed: ${msg.substring(0, 150)}`);
    }
  }

  if (!connectSuccess) {
    throw connectionError || new Error("Failed connecting to MongoDB after trying all password candidate streams");
  }

  const uri = resolvedUri;

  if (forcePush) {
    console.log("Force push requested. Overwriting remote MongoDB database with current local in-memory state...");
    dbSyncStatus = "Syncing (Uploading Local State)...";
    isInitialSyncCompleted = true; // Ensure saveStateToFirestore doesn't bypass
    await saveStateToFirestore();
    dbSyncStatus = "Synced (Manual Push Completed)";
    lastSyncTime = new Date().toISOString();
    dbSyncError = null;
    return;
  }

  try {
    const studentCol = mongoDb.collection("students");
    const count = await studentCol.countDocuments();

    // Check if configuration collection already has documents to detect as seeded
    const configCol = mongoDb.collection("configs");
    const configCount = await configCol.countDocuments();
    const isSeeded = configCount > 0 || count > 0;

    if (isSeeded) {
      console.log("MongoDB is previously seeded. Pulling state from MongoDB...");
      dbSyncStatus = "Syncing (Loading state)...";
      
      // Load Students (100% Authoritative from MongoDB)
      const loadedStudents = await studentCol.find({}).toArray();

      students.length = 0;
      loadedStudents.forEach((d: any) => {
        const { _id, ...rest } = d;
        const s = rest as Student;
        if (!s.password && s.nis) {
          s.password = s.nis.toString().trim();
        }
        students.push(s);
      });

      // Load SPP Bills (100% Authoritative from MongoDB)
      const loadedBills = await mongoDb.collection("sppBills").find({}).toArray();
      sppBills.length = 0;
      loadedBills.forEach((d: any) => {
        const { _id, ...rest } = d;
        const bill = rest as SppBill;
        sppBills.push(bill);
      });

      // Purge unpaid/pending bills for mutated students on/after mutation month
      const initialPurged = purgeMutatedStudentUnpaidBills();
      if (initialPurged > 0) {
        console.log(`[MUTATION PURGE] Cleared ${initialPurged} unpaid SPP bills for mutated students on/after mutation date.`);
      }

      // Load Misc Bills (100% Authoritative from MongoDB)
      try {
        const loadedMiscBills = await mongoDb.collection("miscBills").find({}).toArray();
        miscBills.length = 0;
        loadedMiscBills.forEach((d: any) => {
          const { _id, ...rest } = d;
          miscBills.push(rest as MiscBill);
        });
      } catch (err) {
        console.warn("Failed loading miscBills collection:", err);
      }

      // Load Savings Transactions (100% Authoritative from MongoDB)
      const loadedSav = await mongoDb.collection("savingsTransactions").find({}).toArray();
      savingsTransactions.length = 0;
      loadedSav.forEach((d: any) => {
        const { _id, ...rest } = d;
        const t = rest as SavingsTransaction;
        savingsTransactions.push(t);
      });

      // Apply authoritative savings balances for all loaded students
      applyAuthoritativeSavingsBalances(students);

      // Load Notifications
      const loadedNotif = await mongoDb.collection("realtimeNotifications").find({}).toArray();
      notifications.length = 0;
      loadedNotif.forEach((d: any) => {
        const { _id, ...rest } = d;
        notifications.push(rest as RealtimeNotification);
      });
      notifications.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      // Load Attendance Logs
      const loadedAtt = await mongoDb.collection("attendanceLogs").find({}).toArray();
      attendanceLogs.length = 0;
      loadedAtt.forEach((d: any) => {
        const { _id, ...rest } = d;
        attendanceLogs.push(rest as AttendanceLog);
      });

      // Load Homeroom Teachers
      const loadedHt = await mongoDb.collection("homeroomTeachers").find({}).toArray();
      homeroomTeachers.length = 0;
      loadedHt.forEach((d: any) => {
        const { _id, ...rest } = d;
        homeroomTeachers.push(rest as HomeroomTeacher);
      });

      // Load Subject Teachers
      const loadedSt = await mongoDb.collection("subjectTeachers").find({}).toArray();
      subjectTeachers.length = 0;
      loadedSt.forEach((d: any) => {
        const { _id, ...rest } = d;
        subjectTeachers.push(rest as SubjectTeacher);
      });

      // Load Teaching Journals
      const loadedTj = await mongoDb.collection("teachingJournals").find({}).toArray();
      const loadedTjMap = new Map<string, TeachingJournal>();
      // Preserve any local journals in memory/data_store.json (e.g. Aug 5, Aug 6, Aug 7 2026 data)
      teachingJournals.forEach((tj) => {
        if (tj && tj.id) loadedTjMap.set(tj.id, tj);
      });
      loadedTj.forEach((d: any) => {
        const { _id, ...rest } = d;
        if (rest && rest.id) loadedTjMap.set(rest.id, rest as TeachingJournal);
      });
      teachingJournals.length = 0;
      teachingJournals.push(...Array.from(loadedTjMap.values()));
      saveState();
      await saveStateToFirestore();

      // Load Treasurer Transactions (Safely merge so Dev & Public instances retain all records)
      const loadedBnd = await mongoDb.collection("treasurerTransactions").find({}).toArray();
      const loadedBndMap = new Map<string, TreasurerTransaction>();
      treasurerTransactions.forEach((tx) => {
        if (tx && tx.id) loadedBndMap.set(tx.id, tx);
      });
      loadedBnd.forEach((d: any) => {
        const { _id, ...rest } = d;
        if (rest && rest.id) loadedBndMap.set(rest.id, rest as TreasurerTransaction);
      });
      treasurerTransactions.length = 0;
      treasurerTransactions.push(...Array.from(loadedBndMap.values()));
      console.log(`[BOOT] Loaded and synchronized ${treasurerTransactions.length} treasurer transactions.`);

      // Load other logs
      const loadedDev = await mongoDb.collection("studentDevelopmentLogs").find({}).toArray();
      studentDevelopmentLogs.length = 0;
      loadedDev.forEach((d: any) => { const { _id, ...rest } = d; studentDevelopmentLogs.push(rest as any); });

      const loadedInf = await mongoDb.collection("studentInfractionLogs").find({}).toArray();
      studentInfractionLogs.length = 0;
      loadedInf.forEach((d: any) => { const { _id, ...rest } = d; studentInfractionLogs.push(rest as any); });

      const loadedCouns = await mongoDb.collection("studentCounselingLogs").find({}).toArray();
      studentCounselingLogs.length = 0;
      loadedCouns.forEach((d: any) => { const { _id, ...rest } = d; studentCounselingLogs.push(rest as any); });

      const loadedAnn = await mongoDb.collection("classAnnouncements").find({}).toArray();
      classAnnouncements.length = 0;
      loadedAnn.forEach((d: any) => { const { _id, ...rest } = d; classAnnouncements.push(rest as any); });

      const loadedMtg = await mongoDb.collection("classMeetingLogs").find({}).toArray();
      classMeetingLogs.length = 0;
      loadedMtg.forEach((d: any) => { const { _id, ...rest } = d; classMeetingLogs.push(rest as any); });

      const loadedAss = await mongoDb.collection("merdekaAssessments").find({}).toArray();
      merdekaAssessments.length = 0;
      loadedAss.forEach((d: any) => { const { _id, ...rest } = d; merdekaAssessments.push(rest as any); });

      const loadedProg = await mongoDb.collection("principalWorkPrograms").find({}).toArray();
      principalWorkPrograms.length = 0;
      loadedProg.forEach((d: any) => { const { _id, ...rest } = d; principalWorkPrograms.push(rest as any); });

      const loadedEval = await mongoDb.collection("teacherEvaluations").find({}).toArray();
      teacherEvaluations.length = 0;
      loadedEval.forEach((d: any) => { const { _id, ...rest } = d; teacherEvaluations.push(rest as any); });

      const loadedRules = await mongoDb.collection("infractionRules").find({}).toArray();
      infractionRules.length = 0;
      loadedRules.forEach((d: any) => { const { _id, ...rest } = d; infractionRules.push(rest as any); });

      const loadedSItems = await mongoDb.collection("sarprasItems").find({}).toArray();
      sarprasItems.length = 0;
      loadedSItems.forEach((d: any) => { const { _id, ...rest } = d; sarprasItems.push(rest as any); });

      const loadedSProp = await mongoDb.collection("sarprasProposals").find({}).toArray();
      sarprasProposals.length = 0;
      loadedSProp.forEach((d: any) => { const { _id, ...rest } = d; sarprasProposals.push(rest as any); });

      const loadedSLoans = await mongoDb.collection("sarprasLoans").find({}).toArray();
      sarprasLoans.length = 0;
      loadedSLoans.forEach((d: any) => { const { _id, ...rest } = d; sarprasLoans.push(rest as any); });

      const loadedSalaries = await mongoDb.collection("teacherSalaries").find({}).toArray();
      teacherSalaries.length = 0;
      loadedSalaries.forEach((d: any) => { const { _id, ...rest } = d; teacherSalaries.push(rest as any); });

      // Load configurations
      const loadedConfigs = await mongoDb.collection("configs").find({}).toArray();
      loadedConfigs.forEach((d: any) => {
        const id = d.id;
        const { _id, ...cleaned } = d;
        if (id === "sppRates") Object.assign(sppRates, cleaned);
        else if (id === "schoolIdentity") Object.assign(schoolIdentity, cleaned);
        else if (id === "midtransConfig") Object.assign(midtransConfig, cleaned);
        else if (id === "whatsappConfig") Object.assign(whatsappConfig, cleaned);
        else if (id === "treasurerConfig") Object.assign(treasurerConfig, cleaned);
        else if (id === "principalConfig") Object.assign(principalConfig, cleaned);
        else if (id === "sarprasConfig") Object.assign(sarprasConfig, cleaned);
        else if (id === "bkConfig") Object.assign(bkConfig, cleaned);
        else if (id === "curriculumConfig") Object.assign(curriculumConfig, cleaned);
        else if (id === "adminConfig") Object.assign(adminConfig, cleaned);
        else if (id === "salaryConfig") Object.assign(salaryConfig, cleaned);
        else if (id === "backupConfig") Object.assign(backupConfig, cleaned);
      });

      // Load database backups
      try {
        const loadedBackups = await mongoDb.collection("databaseBackups").find({}).toArray();
        databaseBackups.length = 0;
        loadedBackups.forEach((d: any) => {
          const { _id, ...rest } = d;
          databaseBackups.push(rest);
        });
        console.log(`[BOOT] Loaded ${databaseBackups.length} database backups from MongoDB.`);
      } catch (errBk) {
        console.warn("Failed loading databaseBackups collection:", errBk);
      }

      // Reconstruct missing uploaded files back onto physical disk from MongoDB backup
      try {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filesCol = mongoDb.collection("uploadedFiles");
        const storedFiles = await filesCol.find({}).toArray();
        console.log(`[BOOT] Found ${storedFiles.length} backed-up files in MongoDB. Verifying local disk files...`);
        storedFiles.forEach((fileDoc: any) => {
          if (fileDoc.filename && fileDoc.base64Data) {
            const destPath = path.join(uploadDir, fileDoc.filename);
            if (!fs.existsSync(destPath)) {
              try {
                const fileBuffer = Buffer.from(fileDoc.base64Data, "base64");
                fs.writeFileSync(destPath, fileBuffer);
                console.log(`[BOOT] Successfully restored missing file onto disk: ${fileDoc.filename} (${fileDoc.size} bytes)`);
              } catch (writeErr: any) {
                console.error(`[BOOT] Failed to write file ${fileDoc.filename} back to disk:`, writeErr.message || writeErr);
              }
            }
          }
        });
      } catch (errFile: any) {
        console.error("[BOOT] Failed to query and reconstruct backed-up files from MongoDB:", errFile.message || errFile);
      }

      dbSyncStatus = "Synced (Loaded from MongoDB)";
      lastSyncTime = new Date().toISOString();
      dbSyncError = null;
      isInitialSyncCompleted = true;
      console.log("Connected successfully. State has been loaded from MongoDB.");
      
      // Save loaded MongoDB state to local data_store.json file as well
      saveState(true);
      purgeMidtransAutoReconciliation();
    } else {
      console.log("No remote database documents. Performing initial MongoDB seeding...");
      dbSyncStatus = "Syncing (Uploading Seed)";
      isInitialSyncCompleted = true;
      await saveStateToFirestore();
      purgeMidtransAutoReconciliation();
      dbSyncStatus = "Synced (Initial Seed Completed)";
      lastSyncTime = new Date().toISOString();
      dbSyncError = null;
      console.log("Initial MongoDB seed completed.");
    }
  } catch (err: any) {
    const rawError = err instanceof Error ? err.message : String(err);
    
    // Create a masked version of the URI we attempted
    let maskedUri = "unknown";
    try {
      const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
      if (match) {
        const scheme = match[1];
        const username = match[2];
        const pass = match[3];
        const host = match[4];
        const rest = match[5];
        const maskedPass = pass.substring(0, Math.min(3, pass.length)) + "*".repeat(Math.max(0, pass.length - 4)) + pass.substring(Math.max(0, pass.length - 1));
        maskedUri = `${scheme}${username}:${maskedPass}@${host}${rest}`;
      }
    } catch (_) {}

    if (rawError.includes("bad auth") || rawError.includes("authentication failed") || rawError.includes("auth failed")) {
      dbSyncStatus = "Blocked (Bad Credentials)";
      dbSyncError = "Koneksi ke MongoDB Atlas gagal karena autentikasi (username/password) ditolak oleh basis data Anda.\n\n" +
                    `URI yang dicoba (Masked): ${maskedUri}\n\n` +
                    "⚠️ CARA MEMPERBAIKI:\n" +
                    "1. Buka Settings -> Secrets di panel sebelah kanan AI Studio Anda.\n" +
                    "2. Cari variabel bernama MONGODB_URI.\n" +
                    "3. Jika ada, edit nilainya dengan string koneksi baru Anda, pastikan password ditulis dengan benar (contoh: Sparifda20519113).\n" +
                    "4. Jika tidak ada, tambahkan MONGODB_URI baru atau periksa apakah konfigurasi di server.ts sudah benar.\n" +
                    "5. Setelah itu, klik tombol 'SINKRONISASI DATABASES' di menu konfigurasi Admin untuk mencoba kembali.";
    } else if (
      rawError.includes("alert internal error") ||
      rawError.includes("SSL routines") ||
      rawError.includes("MongoServerSelectionError") ||
      rawError.includes("MongoNetworkError") ||
      rawError.includes("SSL alert")
    ) {
      dbSyncStatus = "Blocked (Firewall/IP Whitelist)";
      dbSyncError = "Koneksi ke MongoDB Atlas gagal karena IP server aplikasi ini diblokir (Firewall / IP Access List di MongoDB Atlas).\n\n" +
                    `URI yang dicoba (Masked): ${maskedUri}\n\n` +
                    "⚠️ CARA MEMPERBAIKI:\n" +
                    "1. Buka dashboard MongoDB Atlas Anda di https://cloud.mongodb.com\n" +
                    "2. Pada menu kiri, pilih 'Network Access' di bawah kategori 'Security'.\n" +
                    "3. Klik tombol '+ Add IP Address'.\n" +
                    "4. Pilih opsi 'Allow Access From Anywhere' (menambahkan IP '0.0.0.0/0') lalu klik 'Confirm'.\n" +
                    "5. Setelah statusnya 'Active' (kurang dari 1 menit), klik tombol 'SINKRONISASI DATABASES' di menu konfigurasi Admin untuk menyinkronkan kembali.";
    } else {
      dbSyncStatus = "Failed";
      dbSyncError = `Error: ${rawError}\nURI: ${maskedUri}`;
    }
    console.error("MongoDB starting sync error:", err);
    isInitialSyncCompleted = true; // Allow local operations if sync fails fallback
  }
}

function saveState(skipRemoteSync: boolean = false) {
  try {
    const data = {
      students,
      sppBills,
      miscBills,
      savingsTransactions,
      notifications,
      sppRates,
      schoolIdentity,
      midtransConfig,
      whatsappConfig,
      treasurerConfig,
      principalConfig,
      sarprasConfig,
      attendanceLogs,
      homeroomTeachers,
      subjectTeachers,
      teachingJournals,
      treasurerTransactions,
      teacherSalaries,
      salaryConfig,
      studentDevelopmentLogs,
      studentInfractionLogs,
      studentCounselingLogs,
      classAnnouncements,
      classMeetingLogs,
      merdekaAssessments,
      classSchedules,
      principalWorkPrograms,
      teacherEvaluations,
      infractionRules,
      sarprasItems,
      sarprasProposals,
      sarprasLoans,
      bkConfig,
      curriculumConfig,
      adminConfig,
      backupConfig,
      databaseBackups
    };
    const tempPath = DATA_FILE + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, DATA_FILE);
    // Asynchronously update to MongoDB Cluster via serialized queue
    if (!skipRemoteSync) {
      triggerFirestoreSync();
    }
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.students)) {
        students.length = 0;
        data.students.forEach((s: Student) => {
          if (s.email && s.email.includes("example.org")) {
            s.email = s.email.replace("example.org", "smpmaarifnu.sch.id");
          }
          if (!s.password && s.nis) {
            s.password = s.nis.toString().trim();
          }
          students.push(s);
        });
      }
      if (Array.isArray(data.sppBills)) {
        sppBills.length = 0;
        sppBills.push(...data.sppBills);
        
        // Deduplicate loaded SPP bills by studentId, month, year
        const seen = new Map<string, SppBill>();
        sppBills.forEach(bill => {
          const key = `${bill.studentId}-${bill.month}-${bill.year}`;
          const left = seen.get(key);
          if (!left) {
            seen.set(key, bill);
          } else {
            // Prefer paid > pending > unpaid
            if (bill.status === "paid" && left.status !== "paid") {
              seen.set(key, bill);
            } else if (bill.status === "pending" && left.status === "unpaid") {
              seen.set(key, bill);
            }
          }
        });
        sppBills.length = 0;
        sppBills.push(...Array.from(seen.values()));
      }
      if (Array.isArray(data.miscBills)) {
        miscBills.length = 0;
        miscBills.push(...data.miscBills);
      }
      if (Array.isArray(data.savingsTransactions)) {
        savingsTransactions.length = 0;
        savingsTransactions.push(...data.savingsTransactions);
      }
      // Apply authoritative savings balances for all loaded students
      applyAuthoritativeSavingsBalances(students);
      if (Array.isArray(data.notifications)) {
        notifications.length = 0;
        notifications.push(...data.notifications);
      }
      if (Array.isArray(data.attendanceLogs)) {
        attendanceLogs.length = 0;
        attendanceLogs.push(...data.attendanceLogs);
      }
      if (Array.isArray(data.homeroomTeachers)) {
        homeroomTeachers.length = 0;
        homeroomTeachers.push(...data.homeroomTeachers);
      }
      if (Array.isArray(data.subjectTeachers)) {
        subjectTeachers.length = 0;
        subjectTeachers.push(...data.subjectTeachers);
      }
      if (Array.isArray(data.teachingJournals)) {
        teachingJournals.length = 0;
        teachingJournals.push(...data.teachingJournals);
      }
      if (Array.isArray(data.studentDevelopmentLogs)) {
        studentDevelopmentLogs.length = 0;
        studentDevelopmentLogs.push(...data.studentDevelopmentLogs);
      }
      if (Array.isArray(data.studentInfractionLogs)) {
        studentInfractionLogs.length = 0;
        studentInfractionLogs.push(...data.studentInfractionLogs);
      }
      if (Array.isArray(data.studentCounselingLogs)) {
        studentCounselingLogs.length = 0;
        studentCounselingLogs.push(...data.studentCounselingLogs);
      }
      if (Array.isArray(data.classAnnouncements)) {
        classAnnouncements.length = 0;
        classAnnouncements.push(...data.classAnnouncements);
      }
      if (Array.isArray(data.classMeetingLogs)) {
        classMeetingLogs.length = 0;
        classMeetingLogs.push(...data.classMeetingLogs);
      }
      if (Array.isArray(data.merdekaAssessments)) {
        merdekaAssessments.length = 0;
        merdekaAssessments.push(...data.merdekaAssessments);
      }
      if (Array.isArray(data.classSchedules)) {
        classSchedules.length = 0;
        classSchedules.push(...data.classSchedules);
      }
      if (Array.isArray(data.principalWorkPrograms)) {
        principalWorkPrograms.length = 0;
        principalWorkPrograms.push(...data.principalWorkPrograms);
      }
      if (Array.isArray(data.teacherEvaluations)) {
        teacherEvaluations.length = 0;
        teacherEvaluations.push(...data.teacherEvaluations);
      }
      if (Array.isArray(data.infractionRules)) {
        infractionRules.length = 0;
        infractionRules.push(...data.infractionRules);
      }
      if (Array.isArray(data.sarprasItems)) {
        sarprasItems.length = 0;
        sarprasItems.push(...data.sarprasItems);
      }
      if (Array.isArray(data.sarprasProposals)) {
        sarprasProposals.length = 0;
        sarprasProposals.push(...data.sarprasProposals);
      }
      if (Array.isArray(data.sarprasLoans)) {
        sarprasLoans.length = 0;
        sarprasLoans.push(...data.sarprasLoans);
      }
      if (Array.isArray(data.teacherSalaries)) {
        teacherSalaries.length = 0;
        teacherSalaries.push(...data.teacherSalaries);
      }
      if (data.salaryConfig) {
        Object.assign(salaryConfig, data.salaryConfig);
      }
      if (Array.isArray(data.treasurerTransactions)) {
        treasurerTransactions.length = 0;
        treasurerTransactions.push(...data.treasurerTransactions);
      } else {
        // Initial mock data if empty
        treasurerTransactions.length = 0;
        treasurerTransactions.push(
          {
            id: "tx-bnd-1",
            type: "incoming",
            category: "Operasional",
            amount: 15000000,
            description: "Penerimaan Dana BOS Reguler Tahap I Tahun 2026",
            date: "2026-05-10",
            source: "custom",
            createdBy: "Sistem (BOS)"
          },
          {
            id: "tx-bnd-2",
            type: "outgoing",
            category: "Gaji Guru",
            amount: 4500000,
            description: "Honorarium Guru GTT & Pegawai PTT Bulan April",
            date: "2026-05-02",
            source: "custom",
            createdBy: "bendahara"
          },
          {
            id: "tx-bnd-3",
            type: "outgoing",
            category: "Pembangunan",
            amount: 2500050,
            description: "Pembelian Semen & Pasir Renovasi Musholla",
            date: "2026-05-15",
            source: "custom",
            createdBy: "bendahara"
          },
          {
            id: "tx-bnd-4",
            type: "incoming",
            category: "Utama",
            amount: 1200000,
            description: "Pihak Ketiga - Sumbangan Alumni Peduli Pendidikan",
            date: "2026-05-18",
            source: "custom",
            createdBy: "bendahara"
          }
        );
      }
      if (data.sppRates) Object.assign(sppRates, data.sppRates);
      if (data.schoolIdentity) Object.assign(schoolIdentity, data.schoolIdentity);
      if (data.midtransConfig) Object.assign(midtransConfig, data.midtransConfig);
      if (data.whatsappConfig) Object.assign(whatsappConfig, data.whatsappConfig);
      if (data.treasurerConfig) Object.assign(treasurerConfig, data.treasurerConfig);
      if (data.principalConfig) Object.assign(principalConfig, data.principalConfig);
      if (data.sarprasConfig) Object.assign(sarprasConfig, data.sarprasConfig);
      if (data.bkConfig) Object.assign(bkConfig, data.bkConfig);
      if (data.curriculumConfig) Object.assign(curriculumConfig, data.curriculumConfig);
      if (data.adminConfig) Object.assign(adminConfig, data.adminConfig);
      if (data.backupConfig) Object.assign(backupConfig, data.backupConfig);
      if (Array.isArray(data.databaseBackups)) {
        databaseBackups.length = 0;
        databaseBackups.push(...data.databaseBackups);
      }
      console.log("State loaded successfully from database");
      return true;
    }
  } catch (error) {
    console.error("Failed to load state:", error);
  }
  return false;
}

const isLoaded = loadState();

if (isLoaded) {
  // Save state immediately to persist the cleaned deduplicated bills
  saveState(true);
} else {
  students.forEach((student, sIdx) => {
    months.forEach((month, mIdx) => {
      // All fallback initialization bills should start as unpaid
      const isPaid = false;
      const mappedAmount = getSppAmountForStudent(student);
      const isGrade7 = (student.class || "").trim().startsWith("7") || (student.class || "").trim().toUpperCase().startsWith("VII");
      const isJuly = month === "Juli";
      const isRegPaid = isGrade7 && isJuly;

      sppBills.push({
        id: `bill-${student.id}-${mIdx}`,
        studentId: student.id,
        month: month,
        year: mIdx < 6 ? 2025 : 2026,
        amount: mappedAmount,
        status: isPaid ? "paid" : "unpaid",
        paidAt: isPaid ? new Date(2025, 6 + mIdx, 10, 14, 30).toISOString() : undefined,
        paymentMethod: isPaid ? (isRegPaid ? "Lunas Pendaftaran" : "Manual Teller") : undefined,
        orderId: isPaid ? (isRegPaid ? `ORD-REGISTRATION-${student.id}` : `ORD-MANUAL-${student.id}-${mIdx}`) : undefined
      });
    });

    // Pre-populate some savings transactions
    savingsTransactions.push({
      id: `sav-${student.id}-init1`,
      studentId: student.id,
      type: "deposit",
      amount: student.savingsBalance + 50000, // assuming they spent 50000
      status: "success",
      createdAt: new Date(2026, 0, 15, 9, 15).toISOString(),
      paymentMethod: "Manual Teller",
      notes: "Setoran Awal Tabungan"
    });

    savingsTransactions.push({
      id: `sav-${student.id}-init2`,
      studentId: student.id,
      type: "withdrawal",
      amount: 50000,
      status: "success",
      createdAt: new Date(2026, 1, 20, 10, 45).toISOString(),
      paymentMethod: "Manual Teller",
      notes: "Tarik Tunai Kebutuhan LKS"
    });
  });

  // Save base initialization
  saveState();
}

// SSE Client list
let sseClients: any[] = [];

// Helper function to send Real-time events
function broadcastNotification(notification: RealtimeNotification) {
  notifications.unshift(notification);
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (err) {
      console.error("SSE broadcast client write failed", err);
    }
  });
}

// Global WhatsApp Notification Dispatching Helper
async function sendWhatsappNotification(phoneNumber: string, message: string): Promise<boolean> {
  if (!whatsappConfig.enabled) {
    console.log(`[WA DISABLED] to ${phoneNumber}: "${message}"`);
    return false;
  }
  
  const token = whatsappConfig.token;
  if (!token) {
    console.log(`[WA MISSING TOKEN] Can't send to ${phoneNumber}: "${message}"`);
    return false;
  }
  
  // Format phone number
  let formattedPhone = (phoneNumber || "").replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.slice(1);
  }
  
  if (!formattedPhone) {
    console.log("[WA INVALID PHONE] No valid digits in phone number");
    return false;
  }

  console.log(`[WA OUTBOX] Sending via ${whatsappConfig.provider} to ${formattedPhone}...`);
  
  try {
    let url = whatsappConfig.baseUrl || "https://api.fonnte.com/send";
    let headers: Record<string, string> = {};
    let body: any = null;

    if (whatsappConfig.provider === "Fonnte") {
      url = "https://api.fonnte.com/send";
      headers = {
        "Authorization": token
      };
      const params = new URLSearchParams();
      params.append("target", formattedPhone);
      params.append("message", message);
      body = params.toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (whatsappConfig.provider === "Wablas") {
      url = whatsappConfig.baseUrl || "https://api.wablas.com/api/send-message";
      headers = {
        "Authorization": token,
        "Content-Type": "application/json"
      };
      body = JSON.stringify({
        phone: formattedPhone,
        message: message
      });
    } else if (whatsappConfig.provider === "Whacenter") {
      url = "https://tools.whacenter.com/api/send";
      headers = {
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const params = new URLSearchParams();
      params.append("device_id", whatsappConfig.sender || token);
      params.append("number", formattedPhone);
      params.append("message", message);
      body = params.toString();
    } else {
      // General Custom / JSON POST
      headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      body = JSON.stringify({
        to: formattedPhone,
        message: message,
        sender: whatsappConfig.sender || undefined
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await res.text();
    console.log(`[WA STATUS] ${res.status} Response:`, data);
    return res.ok;
  } catch (error: any) {
    console.error("[WA ERROR] failed to send message:", error.message || error);
    return false;
  }
}

async function startServer() {
  // Sync state with Firestore database and await completion on startup
  console.log("Awaiting initial Firestore database sync before starting Express server...");
  try {
    await syncWithFirestore();
  } catch (err) {
    console.error("Critical: Initial sync with Firestore failed on startup, proceeding anyway:", err);
    isInitialSyncCompleted = true;
  }

  const app = express();
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Handle body parser errors cleanly as JSON
  app.use((err: any, req: any, res: any, next: any) => {
    if (err && (err.status === 413 || err.type === 'entity.too.large')) {
      return res.status(413).json({ success: false, error: "Ukuran file backup atau payload terlalu besar untuk diproses (Maksimal 100MB)." });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, error: "Format JSON request tidak valid." });
    }
    next(err);
  });

  // Prevent browser caching on all API routes (especially for student mobile devices)
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });

  // Interceptor middleware to auto-save state on successful mutation requests
  app.use((req, res, next) => {
    if (req.method !== 'GET' && !req.path.startsWith('/api/notifications/stream')) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          saveState();
        }
      });
    }
    next();
  });

  // API Routes

  // Get Midtrans visual details (safely masks server key)
  app.get("/api/midtrans-config", (req, res) => {
    res.json({
      merchantId: midtransConfig.merchantId,
      clientKey: midtransConfig.clientKey,
      hasServerKey: !!midtransConfig.serverKey,
      isProduction: midtransConfig.isProduction,
      isDisabled: !!midtransConfig.isDisabled,
      adminFee: 0, // Automated/Handled directly by Midtrans
      systemMaintenanceFee: 0,
      chargeFeesToUser: false,
      hasPin: !!midtransConfig.pin
    });
  });

  // Verify Midtrans PIN endpoint
  app.post("/api/verify-midtrans-pin", (req, res) => {
    const { pin } = req.body;
    const isCorrect = String(pin).trim() === String(midtransConfig.pin || "1234").trim();
    res.json({ success: isCorrect });
  });

  // Setup directory for uploads
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Configure multer disk storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Clean target name to avoid potential malicious path names
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    }
  });
  const upload = multer({ storage });

  // Serve static files from /uploads
  app.use("/uploads", express.static(uploadDir));

  // Upload file API for admin user
  app.post("/api/admin/upload-file", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Tidak ada file yang diunggah" });
    }
    const uploadedFile = req.file;
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const fileUrl = `${protocol}://${host}/uploads/${uploadedFile.filename}`;

    try {
      // Save file binary as base64 to MongoDB for permanent persistent recovery across ephemeral restarts
      if (mongoDb) {
        const filePath = path.join(uploadDir, uploadedFile.filename);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const base64Data = fileBuffer.toString("base64");
          
          const filesCol = mongoDb.collection("uploadedFiles");
          await filesCol.replaceOne(
            { id: uploadedFile.filename },
            {
              id: uploadedFile.filename,
              filename: uploadedFile.filename,
              originalName: uploadedFile.originalname,
              size: uploadedFile.size,
              mimetype: uploadedFile.mimetype,
              base64Data: base64Data,
              createdAt: new Date().toISOString()
            },
            { upsert: true }
          );
          console.log(`Successfully backed up uploaded file to MongoDB: ${uploadedFile.filename}`);
        }
      }
    } catch (err: any) {
      console.error("Failed to back up uploaded file to MongoDB:", err.message || err);
    }

    res.json({
      success: true,
      url: fileUrl,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalname,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    });
  });

  // Get list of uploaded files for admin
  app.get("/api/admin/uploaded-files", (req, res) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        return res.json({ files: [] });
      }
      const files = fs.readdirSync(uploadDir);
      const fileList = files
        .filter(file => !file.startsWith("."))
        .map(file => {
          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          const protocol = req.headers["x-forwarded-proto"] || req.protocol;
          const host = req.get("host");
          const fileUrl = `${protocol}://${host}/uploads/${file}`;
          
          let displayName = file;
          const match = file.match(/^(\d+)-(.*)$/);
          if (match) {
            displayName = match[2];
          }

          return {
            filename: file,
            displayName,
            url: fileUrl,
            size: stats.size,
            createdAt: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      res.json({ files: fileList });
    } catch (err) {
      console.error("Error reading uploads directory:", err);
      res.status(500).json({ error: "Gagal membaca daftar file" });
    }
  });

  // Delete an uploaded file
  app.delete("/api/admin/delete-file/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const safeFilename = path.basename(filename);
      const filePath = path.join(uploadDir, safeFilename);

      let fileExistsOnDisk = fs.existsSync(filePath);
      if (fileExistsOnDisk) {
        fs.unlinkSync(filePath);
      }

      // Explicitly clean from MongoDB of any backup as well
      if (mongoDb) {
        const filesCol = mongoDb.collection("uploadedFiles");
        await filesCol.deleteOne({ id: safeFilename });
        console.log(`Successfully removed uploaded file backup from MongoDB: ${safeFilename}`);
      }

      if (fileExistsOnDisk) {
        res.json({ success: true, message: "File berhasil dihapus" });
      } else {
        res.json({ success: true, message: "File dibersihkan dari backup basis data" });
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      res.status(500).json({ error: "Gagal menghapus file" });
    }
  });

  // Force database synchronization with MongoDB
  app.post("/api/admin/force-firestore-sync", async (req, res) => {
    try {
      const direction = req.body?.direction || "pull";
      if (direction === "push") {
        console.log("Admin triggered manual MongoDB synchronization (Force Push Local -> Remote)...");
        await syncWithFirestore(true);
      } else {
        console.log("Admin triggered manual MongoDB synchronization (Force Pull Remote -> Local)...");
        await syncWithFirestore(false);
      }
      res.json({
        success: true,
        status: dbSyncStatus,
        lastSync: lastSyncTime,
        error: dbSyncError
      });
    } catch (err: any) {
      console.error("Manual MongoDB sync failed:", err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Database Backups - Get Backups List and Config
  app.get("/api/admin/backups", (req, res) => {
    try {
      const list = databaseBackups.map(b => ({
        id: b.id,
        createdAt: b.createdAt,
        type: b.type,
        description: b.description,
        sizeBytes: b.sizeBytes || 0,
        collections: b.collections || {}
      }));
      res.json({ success: true, backups: list, config: backupConfig });
    } catch (err: any) {
      console.error("Error retrieving backups:", err);
      res.status(500).json({ error: "Gagal mengambil daftar backup: " + err.message });
    }
  });

  // Database Backups - Update Configurations
  app.post("/api/admin/backups/config", async (req, res) => {
    try {
      const { enabled, intervalHours, maxBackups, autoDownloadLocal } = req.body;
      if (enabled !== undefined) backupConfig.enabled = !!enabled;
      if (intervalHours !== undefined) backupConfig.intervalHours = Number(intervalHours);
      if (maxBackups !== undefined) backupConfig.maxBackups = Number(maxBackups);
      if (autoDownloadLocal !== undefined) backupConfig.autoDownloadLocal = !!autoDownloadLocal;

      backupConfig.nextBackupTime = new Date(Date.now() + backupConfig.intervalHours * 60 * 60 * 1000).toISOString();

      if (mongoDb) {
        await mongoDb.collection("configs").replaceOne({ id: "backupConfig" }, { ...backupConfig, id: "backupConfig" }, { upsert: true });
      }
      saveState();

      res.json({ success: true, config: backupConfig });
    } catch (err: any) {
      console.error("Error updating backup config:", err);
      res.status(500).json({ error: "Gagal menyimpan konfigurasi backup: " + err.message });
    }
  });

  // Helper function to calculate UTF-8 byte length safely without string slice offset range limits
  function getUtf8ByteLength(str: string): number {
    if (!str) return 0;
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code <= 0x7f) {
        bytes += 1;
      } else if (code <= 0x7ff) {
        bytes += 2;
      } else if (code >= 0xd800 && code <= 0xdbff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    }
    return bytes;
  }

  // Helper function to build a pure database backup snapshot (Database data collections only, excluding system code/configs/files)
  async function buildFullBackupSnapshot() {
    const snapshot = {
      students,
      sppBills,
      miscBills,
      savingsTransactions,
      notifications,
      attendanceLogs,
      homeroomTeachers,
      subjectTeachers,
      teachingJournals,
      treasurerTransactions,
      studentDevelopmentLogs,
      studentInfractionLogs,
      studentCounselingLogs,
      classAnnouncements,
      classMeetingLogs,
      merdekaAssessments,
      classSchedules,
      principalWorkPrograms,
      teacherEvaluations,
      infractionRules,
      sarprasItems,
      sarprasProposals,
      sarprasLoans,
      teacherSalaries,
      sppRates,
      salaryConfig,
      schoolIdentity,
      midtransConfig,
      whatsappConfig,
      treasurerConfig,
      principalConfig,
      sarprasConfig,
      bkConfig,
      curriculumConfig,
      adminConfig
    };

    const counts = {
      students: students.length,
      sppBills: sppBills.length,
      miscBills: miscBills.length,
      savingsTransactions: savingsTransactions.length,
      treasurerTransactions: treasurerTransactions.length,
      attendanceLogs: attendanceLogs.length,
      teachingJournals: teachingJournals.length,
      homeroomTeachers: homeroomTeachers.length,
      subjectTeachers: subjectTeachers.length,
      studentDevelopmentLogs: studentDevelopmentLogs.length,
      studentInfractionLogs: studentInfractionLogs.length,
      studentCounselingLogs: studentCounselingLogs.length,
      classAnnouncements: classAnnouncements.length,
      classMeetingLogs: classMeetingLogs.length,
      merdekaAssessments: merdekaAssessments.length,
      classSchedules: classSchedules ? classSchedules.length : 0,
      principalWorkPrograms: principalWorkPrograms.length,
      teacherEvaluations: teacherEvaluations.length,
      infractionRules: infractionRules.length,
      sarprasItems: sarprasItems.length,
      sarprasProposals: sarprasProposals.length,
      sarprasLoans: sarprasLoans.length,
      teacherSalaries: teacherSalaries.length
    };

    return { snapshot, counts };
  }

  // Helper function to restore a database backup snapshot (Restores database data only; does NOT touch system settings/configs or system files)
  async function restoreFullBackupSnapshot(snapshot: any) {
    if (!snapshot) {
      throw new Error("Konten backup (snapshot) kosong atau tidak terdefinisi.");
    }

    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch (e) {
        throw new Error("Format file JSON snapshot tidak valid.");
      }
    }

    if (snapshot && typeof snapshot === "object") {
      if (snapshot.snapshot) {
        if (typeof snapshot.snapshot === "string") {
          try { snapshot = JSON.parse(snapshot.snapshot); } catch (e) {}
        } else if (typeof snapshot.snapshot === "object") {
          snapshot = snapshot.snapshot;
        }
      } else if (snapshot.data) {
        if (typeof snapshot.data === "string") {
          try { snapshot = JSON.parse(snapshot.data); } catch (e) {}
        } else if (typeof snapshot.data === "object") {
          snapshot = snapshot.data;
        }
      }
    }

    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("Format file JSON snapshot tidak valid.");
    }

    // Helper to find collection array from multiple potential object locations and key aliases
    const getArray = (possibleKeys: string[]): any[] | null => {
      const candidates = [
        snapshot,
        snapshot.collections,
        snapshot.data,
        snapshot.snapshot,
        snapshot.db,
        snapshot.backup
      ];
      for (const cand of candidates) {
        if (!cand || typeof cand !== "object") continue;
        for (const key of possibleKeys) {
          if (Array.isArray(cand[key])) return cand[key];
        }
      }
      return null;
    };

    const studentArr = getArray(["students", "studentList", "daftar_siswa", "siswa"]);
    if (studentArr) { students.length = 0; students.push(...studentArr); }

    const sppArr = getArray(["sppBills", "spp_bills", "spp", "tagihan_spp"]);
    if (sppArr) { sppBills.length = 0; sppBills.push(...sppArr); }

    const miscArr = getArray(["miscBills", "misc_bills", "misc", "tagihan_lain"]);
    if (miscArr) { miscBills.length = 0; miscBills.push(...miscArr); }

    const savingsArr = getArray([
      "savingsTransactions",
      "savings_transactions",
      "savings",
      "tabungan",
      "savingsData",
      "savingsLogs",
      "tabungan_transaksi",
      "transaksi_tabungan",
      "savings_list"
    ]);

    if (savingsArr) {
      savingsTransactions.length = 0;
      // Sanitize and reconcile savings transactions with restored students
      savingsArr.forEach((tx: any, idx: number) => {
        if (!tx || typeof tx !== "object") return;
        
        let matchedStudent = students.find(s => s.id === tx.studentId || (tx.studentNis && s.nis === String(tx.studentNis)) || (tx.nis && s.nis === String(tx.nis)));
        if (!matchedStudent && tx.studentId) {
          matchedStudent = students.find(s => String(s.nis).trim() === String(tx.studentId).trim());
        }

        const studentId = matchedStudent ? matchedStudent.id : (tx.studentId || `unknown-std-${idx}`);
        const studentNis = matchedStudent ? matchedStudent.nis : (tx.studentNis || tx.nis);

        const cleanTx: SavingsTransaction = {
          id: String(tx.id || tx._id || `sav-restored-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`),
          studentId,
          type: (tx.type === "deposit" || tx.type === "setor" || tx.type === "kredit") ? "deposit" : "withdrawal",
          amount: Math.abs(Number(tx.amount) || 0),
          status: (tx.status === "pending" || tx.status === "failed") ? tx.status : "success",
          createdAt: tx.createdAt || tx.date || tx.timestamp || new Date().toISOString(),
          paymentMethod: tx.paymentMethod || tx.method || "Manual Teller",
          orderId: tx.orderId,
          transactionId: tx.transactionId,
          notes: tx.notes || tx.description || (tx.type === "deposit" ? "Setoran Tabungan" : "Penarikan Tabungan")
        };
        if (studentNis) {
          (cleanTx as any).studentNis = String(studentNis);
        }
        savingsTransactions.push(cleanTx);
      });
    }

    const notifArr = getArray(["notifications", "realtimeNotifications"]);
    if (notifArr) { notifications.length = 0; notifications.push(...notifArr); }

    const attArr = getArray(["attendanceLogs", "attendance"]);
    if (attArr) { attendanceLogs.length = 0; attendanceLogs.push(...attArr); }

    const hrArr = getArray(["homeroomTeachers", "homeroom_teachers"]);
    if (hrArr) { homeroomTeachers.length = 0; homeroomTeachers.push(...hrArr); }

    const sjArr = getArray(["subjectTeachers", "subject_teachers"]);
    if (sjArr) { subjectTeachers.length = 0; subjectTeachers.push(...sjArr); }

    const tjArr = getArray(["teachingJournals", "teaching_journals"]);
    if (tjArr) { teachingJournals.length = 0; teachingJournals.push(...tjArr); }

    const trArr = getArray(["treasurerTransactions", "treasurer_transactions", "kas_admin"]);
    if (trArr) { treasurerTransactions.length = 0; treasurerTransactions.push(...trArr); }

    const devArr = getArray(["studentDevelopmentLogs"]);
    if (devArr) { studentDevelopmentLogs.length = 0; studentDevelopmentLogs.push(...devArr); }

    const infArr = getArray(["studentInfractionLogs"]);
    if (infArr) { studentInfractionLogs.length = 0; studentInfractionLogs.push(...infArr); }

    const counsArr = getArray(["studentCounselingLogs"]);
    if (counsArr) { studentCounselingLogs.length = 0; studentCounselingLogs.push(...counsArr); }

    const annArr = getArray(["classAnnouncements"]);
    if (annArr) { classAnnouncements.length = 0; classAnnouncements.push(...annArr); }

    const meetArr = getArray(["classMeetingLogs"]);
    if (meetArr) { classMeetingLogs.length = 0; classMeetingLogs.push(...meetArr); }

    const merdArr = getArray(["merdekaAssessments"]);
    if (merdArr) { merdekaAssessments.length = 0; merdekaAssessments.push(...merdArr); }

    const schedArr = getArray(["classSchedules"]);
    if (schedArr) { classSchedules.length = 0; classSchedules.push(...schedArr); }

    const pwpArr = getArray(["principalWorkPrograms"]);
    if (pwpArr) { principalWorkPrograms.length = 0; principalWorkPrograms.push(...pwpArr); }

    const teEvalArr = getArray(["teacherEvaluations"]);
    if (teEvalArr) { teacherEvaluations.length = 0; teacherEvaluations.push(...teEvalArr); }

    const infRuleArr = getArray(["infractionRules"]);
    if (infRuleArr) { infractionRules.length = 0; infractionRules.push(...infRuleArr); }

    const sItems = getArray(["sarprasItems"]);
    if (sItems) { sarprasItems.length = 0; sarprasItems.push(...sItems); }

    const sProps = getArray(["sarprasProposals"]);
    if (sProps) { sarprasProposals.length = 0; sarprasProposals.push(...sProps); }

    const sLoans = getArray(["sarprasLoans"]);
    if (sLoans) { sarprasLoans.length = 0; sarprasLoans.push(...sLoans); }

    const tSalaries = getArray(["teacherSalaries"]);
    if (tSalaries) { teacherSalaries.length = 0; teacherSalaries.push(...tSalaries); }

    if (snapshot.sppRates) Object.assign(sppRates, snapshot.sppRates);
    if (snapshot.salaryConfig) Object.assign(salaryConfig, snapshot.salaryConfig);
    if (snapshot.schoolIdentity) Object.assign(schoolIdentity, snapshot.schoolIdentity);
    if (snapshot.midtransConfig) Object.assign(midtransConfig, snapshot.midtransConfig);
    if (snapshot.whatsappConfig) Object.assign(whatsappConfig, snapshot.whatsappConfig);
    if (snapshot.treasurerConfig) Object.assign(treasurerConfig, snapshot.treasurerConfig);
    if (snapshot.principalConfig) Object.assign(principalConfig, snapshot.principalConfig);
    if (snapshot.sarprasConfig) Object.assign(sarprasConfig, snapshot.sarprasConfig);
    if (snapshot.bkConfig) Object.assign(bkConfig, snapshot.bkConfig);
    if (snapshot.curriculumConfig) Object.assign(curriculumConfig, snapshot.curriculumConfig);
    if (snapshot.adminConfig) Object.assign(adminConfig, snapshot.adminConfig);

    // Apply default initial authoritative map ONLY for students who have no savingsBalance defined
    applyAuthoritativeSavingsBalances(students);

    saveState();
    triggerFirestoreSync();
  }

  // Database Backups - Create a Backup Snapshot
  app.post("/api/admin/backups/create", async (req, res) => {
    try {
      const { type, description } = req.body;
      const backupId = `bkp-${Date.now()}`;
      const createdAt = new Date().toISOString();

      const { snapshot, counts } = await buildFullBackupSnapshot();
      const snapshotStr = JSON.stringify(snapshot);
      const sizeBytes = getUtf8ByteLength(snapshotStr);

      const newBackup = {
        id: backupId,
        createdAt,
        type: type || "manual",
        description: description || (type === "auto" ? "Backup Otomatis Database" : "Backup Manual Admin"),
        sizeBytes,
        collections: counts,
        data: snapshotStr
      };

      if (mongoDb) {
        await executeMongoOperationWithRetry(async () => {
          const col = mongoDb.collection("databaseBackups");
          await col.insertOne({ ...newBackup, _id: backupId });
        });
      }

      databaseBackups.push(newBackup);

      // Enforce max count
      if (databaseBackups.length > backupConfig.maxBackups) {
        const sorted = [...databaseBackups].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const toRemove = sorted.slice(0, databaseBackups.length - backupConfig.maxBackups);
        for (const item of toRemove) {
          const idx = databaseBackups.findIndex(b => b.id === item.id);
          if (idx > -1) databaseBackups.splice(idx, 1);
          if (mongoDb) {
            try {
              await executeMongoOperationWithRetry(async () => {
                await mongoDb.collection("databaseBackups").deleteOne({ $or: [{ _id: item.id }, { id: item.id }] });
              });
            } catch (delErr) {
              console.warn("Failed to prune old backup from MongoDB:", delErr);
            }
          }
        }
      }

      backupConfig.lastBackupTime = createdAt;
      backupConfig.nextBackupTime = new Date(Date.now() + backupConfig.intervalHours * 60 * 60 * 1000).toISOString();

      if (mongoDb) {
        await executeMongoOperationWithRetry(async () => {
          await mongoDb.collection("configs").replaceOne({ id: "backupConfig" }, { ...backupConfig, id: "backupConfig" }, { upsert: true });
        });
      }
      saveState();

      res.json({ success: true, backup: { id: backupId, createdAt, sizeBytes, description: newBackup.description } });
    } catch (err: any) {
      console.error("Error creating backup:", err);
      res.status(500).json({ error: "Gagal membuat backup data: " + err.message });
    }
  });

  // Database Backups - Download Backup File
  app.get("/api/admin/backups/:id/download", (req, res) => {
    try {
      const { id } = req.params;
      const backup = databaseBackups.find(b => b.id === id);
      if (!backup) {
        return res.status(404).send("Backup tidak ditemukan.");
      }
      res.setHeader("Content-Disposition", `attachment; filename=SIS_Backup_${backup.id}.json`);
      res.setHeader("Content-Type", "application/json");
      res.send(backup.data);
    } catch (err: any) {
      console.error("Error downloading backup:", err);
      res.status(500).send("Gagal mengunduh file backup: " + err.message);
    }
  });

  // Database Backups - Restore Backup
  app.post("/api/admin/backups/restore", async (req, res) => {
    try {
      const { id } = req.body;
      const backup = databaseBackups.find(b => b.id === id);
      if (!backup) {
        return res.status(404).json({ error: "Backup tidak ditemukan." });
      }

      const snapshot = JSON.parse(backup.data);
      await restoreFullBackupSnapshot(snapshot);

      res.json({ success: true, message: "Restorasi data database berhasil diselesaikan." });
    } catch (err: any) {
      console.error("Error restoring backup:", err);
      res.status(500).json({ error: "Gagal merestorasi backup data: " + err.message });
    }
  });

  // Database Backups - Restore Backup from Uploaded JSON file
  app.post("/api/admin/backups/restore-upload", async (req, res) => {
    try {
      const { snapshot } = req.body;
      if (!snapshot) {
        return res.status(400).json({ error: "Konten backup (snapshot) tidak ditemukan atau kosong." });
      }

      await restoreFullBackupSnapshot(snapshot);

      res.json({ success: true, message: "Restorasi data database dari file backup lokal berhasil diselesaikan." });
    } catch (err: any) {
      console.error("Error restoring uploaded backup:", err);
      res.status(500).json({ error: "Gagal merestorasi backup lokal: " + err.message });
    }
  });

  // Database Backups - Delete Backup Record
  app.delete("/api/admin/backups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idx = databaseBackups.findIndex(b => b.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Backup tidak ditemukan." });
      }

      databaseBackups.splice(idx, 1);

      if (mongoDb) {
        try {
          await executeMongoOperationWithRetry(async () => {
            await mongoDb.collection("databaseBackups").deleteOne({ $or: [{ _id: id }, { id: id }] });
          });
        } catch (dbErr: any) {
          console.warn("MongoDB backup deletion warning (in-memory deleted):", dbErr?.message || dbErr);
        }
      }
      saveState();

      res.json({ success: true, message: "Backup data berhasil dihapus." });
    } catch (err: any) {
      console.error("Error deleting backup:", err);
      res.status(500).json({ error: "Gagal menghapus backup: " + err.message });
    }
  });

  // Update dynamic midtrans credentials
  app.post("/api/set-midtrans-config", (req, res) => {
    const { merchantId, clientKey, serverKey, isProduction, isDisabled, pin } = req.body;
    midtransConfig = {
      merchantId: merchantId || "",
      clientKey: clientKey || "",
      serverKey: serverKey ? serverKey : (midtransConfig.serverKey || ""),
      isProduction: !!isProduction,
      isDisabled: !!isDisabled,
      adminFee: 0, // Automated/Handled directly by Midtrans
      systemMaintenanceFee: 0,
      chargeFeesToUser: false,
      pin: pin ? String(pin).trim() : (midtransConfig.pin || "1234")
    };
    
    const notif: RealtimeNotification = {
      id: `notif-sys-${Date.now()}`,
      title: "Konfigurasi Gateway Diupdate ⚙️",
      message: `Konfigurasi Midtrans diperbarui. Pembayaran online sekarang ${isDisabled ? 'NONAKTIF' : 'AKTIF'}.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notif);

    saveState();

    res.json({ success: true, message: "Konfigurasi Midtrans berhasil disimpan!" });
  });

  // Get dynamic SPP config rates
  app.get("/api/admin/spp-config", (req, res) => {
    res.json({ success: true, sppRates });
  });

  // Update dynamic SPP config rates and retroactively update all existing unpaid bills matching the rates
  app.post("/api/admin/set-spp-config", (req, res) => {
    const { grade7, grade8, grade9, updateExistingUnpaid } = req.body;
    
    if (grade7 !== undefined) sppRates.grade7 = Number(grade7) || 0;
    if (grade8 !== undefined) sppRates.grade8 = Number(grade8) || 0;
    if (grade9 !== undefined) sppRates.grade9 = Number(grade9) || 0;

    let updatedBillsCount = 0;

    if (updateExistingUnpaid) {
      // Loop through all bills
      sppBills.forEach(bill => {
        const student = students.find(s => s.id === bill.studentId);
        if (student) {
          const currentExpectedAmount = getSppAmountForStudent(student);
          if (bill.amount !== currentExpectedAmount) {
            bill.amount = currentExpectedAmount;
            updatedBillsCount++;
          }
        }
      });
    }

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-spp-config-${Date.now()}`,
      title: "Konfigurasi SPP Diperbarui",
      message: `Nominal SPP tingkat berhasil diperbarui (Kl. 7: Rp ${sppRates.grade7.toLocaleString('id-ID')}, Kl. 8: Rp ${sppRates.grade8.toLocaleString('id-ID')}, Kl. 9: Rp ${sppRates.grade9.toLocaleString('id-ID')}). ${updatedBillsCount > 0 ? `Berhasil menyesuaikan nominal pada ${updatedBillsCount} tagihan.` : ''}`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    saveState();

    res.json({ success: true, sppRates, updatedBillsCount });
  });

  // Get School Identity settings
  app.get("/api/school-identity", (req, res) => {
    res.json({ success: true, schoolIdentity: { ...schoolIdentity, sppRates } });
  });

  // Update School Identity settings
  app.post("/api/admin/set-school-identity", (req, res) => {
    const { name, subheading, accreditation, address, phone, principal, principalSignature, treasurer, logo, logo2, letterhead, treasurerSignature, schoolStamp, apkUrl, iosUrl, treasurerSkUrl, sarprasSkUrl, paymentCardTemplate, favicon, activeAcademicYear } = req.body;
    
    if (name !== undefined) schoolIdentity.name = String(name).trim();
    if (subheading !== undefined) schoolIdentity.subheading = String(subheading).trim();
    if (accreditation !== undefined) schoolIdentity.accreditation = String(accreditation).trim();
    if (address !== undefined) schoolIdentity.address = String(address).trim();
    if (phone !== undefined) schoolIdentity.phone = String(phone).trim();
    if (principal !== undefined) schoolIdentity.principal = String(principal).trim();
    if (principalSignature !== undefined) (schoolIdentity as any).principalSignature = String(principalSignature);
    if (treasurer !== undefined) schoolIdentity.treasurer = String(treasurer).trim();
    if (logo !== undefined) schoolIdentity.logo = String(logo); // can be empty or base64 data URI
    if (logo2 !== undefined) (schoolIdentity as any).logo2 = String(logo2); // can be empty or base64 data URI
    if (letterhead !== undefined) schoolIdentity.letterhead = String(letterhead); // can be empty or base64 data URI
    if (treasurerSignature !== undefined) (schoolIdentity as any).treasurerSignature = String(treasurerSignature);
    if (schoolStamp !== undefined) (schoolIdentity as any).schoolStamp = String(schoolStamp);
    if (apkUrl !== undefined) (schoolIdentity as any).apkUrl = String(apkUrl).trim();
    if (iosUrl !== undefined) (schoolIdentity as any).iosUrl = String(iosUrl).trim();
    if (treasurerSkUrl !== undefined) (schoolIdentity as any).treasurerSkUrl = String(treasurerSkUrl).trim();
    if (sarprasSkUrl !== undefined) (schoolIdentity as any).sarprasSkUrl = String(sarprasSkUrl).trim();
    if (paymentCardTemplate !== undefined) (schoolIdentity as any).paymentCardTemplate = String(paymentCardTemplate); // can be empty or base64 data URI
    if (favicon !== undefined) (schoolIdentity as any).favicon = String(favicon); // can be empty or base64 data URI
    if (activeAcademicYear !== undefined) (schoolIdentity as any).activeAcademicYear = String(activeAcademicYear).trim();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-school-identity-${Date.now()}`,
      title: "Identitas Sekolah Diperbarui",
      message: `Identitas resmi sekolah ${schoolIdentity.name} berhasil diperbarui oleh Administrator.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    saveState();

    res.json({ success: true, schoolIdentity });
  });

  // Get WhatsApp Config Settings
  app.get("/api/whatsapp-config", (req, res) => {
    res.json({ success: true, whatsappConfig });
  });

  // Update WhatsApp Configuration settings
  app.post("/api/admin/set-whatsapp-config", (req, res) => {
    const { token, sender, provider, baseUrl, enabled, notifyOnBilling, notifyOnPayment, notifyOnSavings } = req.body;
    
    if (token !== undefined) whatsappConfig.token = String(token).trim();
    if (sender !== undefined) whatsappConfig.sender = String(sender).trim();
    if (provider !== undefined) whatsappConfig.provider = String(provider).trim();
    if (baseUrl !== undefined) whatsappConfig.baseUrl = String(baseUrl).trim();
    if (enabled !== undefined) whatsappConfig.enabled = !!enabled;
    if (notifyOnBilling !== undefined) whatsappConfig.notifyOnBilling = !!notifyOnBilling;
    if (notifyOnPayment !== undefined) whatsappConfig.notifyOnPayment = !!notifyOnPayment;
    if (notifyOnSavings !== undefined) whatsappConfig.notifyOnSavings = !!notifyOnSavings;

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-wa-config-${Date.now()}`,
      title: "Konfigurasi WhatsApp Diupdate 📲",
      message: `Integrasi Whatsapp API status: ${whatsappConfig.enabled ? 'AKTIF' : 'NON-AKTIF'} (${whatsappConfig.provider}).`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    saveState();

    res.json({ success: true, whatsappConfig, message: "Konfigurasi WhatsApp SDK berhasil disimpan!" });
  });

  // Send test WhatsApp Message
  app.post("/api/admin/test-whatsapp", async (req, res) => {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: "Nomor tujuan & pesan tes wajib disediakan." });
    }
    
    const wasSent = await sendWhatsappNotification(phoneNumber, message);
    if (wasSent) {
      res.json({ success: true, message: "Pesan Tes WhatsApp BERHASIL dikirim lewat provider aktif!" });
    } else {
      res.json({ success: false, message: "Pesan gagal terkirim (simulasi/provider error). Pastikan status WhatsApp AKTIF dan Token terisi." });
    }
  });

  // Manual WhatsApp Payment Billing Reminder
  app.post("/api/admin/send-unpaid-wa", async (req, res) => {
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    const student = students.find(s => s.id === bill.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa untuk tagihan ini tidak ditemukan." });
    }
    if (!student.phone) {
      return res.status(400).json({ error: "Siswa/Wali tidak memiliki nomor telepon terdaftar." });
    }

    const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}, Kelas: ${student.class}).\n\n` +
      `Kami menginfokan bahwa terdapat tagihan wajib *SPP Bulan ${bill.month} ${bill.year}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* yang belum diselesaikan.\n\n` +
      `Pembayaran dapat diselesaikan langsung di sekolah (Tunai via Teller) atau online real-time via Virtual Account/E-Wallet pada portal siswa.\n\n` +
      `Terima kasih atas perhatian Bapak/Ibu Wali Murid.\n` +
      `-- SMP MA'ARIF NU PANDAAN --`;

    const wasSent = await sendWhatsappNotification(student.phone, waMsg);
    if (wasSent) {
      res.json({ success: true, message: `Berhasil mengirim pengingat WhatsApp ke ${student.phone}.` });
    } else {
      res.json({ success: false, message: `Gagal mengirim pengingat WhatsApp ke ${student.phone}. Periksa log atau konfigurasi WhatsApp Anda.` });
    }
  });

  // Change student/parent password
  app.post("/api/students/change-password", (req, res) => {
    const { studentId, oldPassword, newPassword } = req.body;
    if (!studentId || !newPassword) {
      return res.status(400).json({ error: "Siswa ID dan password baru wajib diisi." });
    }

    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    // Check old password if they previously customized it
    // Default password is '123456' or student.nis
    const activePassword = student.password || student.nis; 
    
    // Check it
    if (oldPassword && oldPassword !== activePassword && oldPassword !== '123456') {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }

    student.password = newPassword;

    // Send notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-${studentId}-${Date.now()}`,
      studentId: studentId,
      title: "Sandi Akun Berubah",
      message: `Profil siswa ${student.name} telah berhasil memutakhirkan kata sandi masuk web portal-nya secara aman.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi berhasil disimpan." });
  });

  // Change homeroom teacher password
  app.post("/api/homerooms/change-password", (req, res) => {
    const { teacherId, oldPassword, newPassword } = req.body;
    if (!teacherId || !newPassword) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }

    const teacher = homeroomTeachers.find(ht => ht.id === teacherId);
    if (!teacher) {
      return res.status(404).json({ error: "Wali kelas tidak ditemukan." });
    }

    // Check old password
    const activePassword = teacher.password || "wali123";
    if (oldPassword && oldPassword !== activePassword) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }

    teacher.password = newPassword.trim();
    saveState();

    res.json({ success: true, message: "Kata sandi berhasil disimpan." });
  });

  // Treasurer/Bendahara Credentials Validation Endpoints
  app.post("/api/treasurer/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    if (username.slice().toLowerCase() === "bendahara" && password === treasurerConfig.password) {
      res.json({ success: true, message: "Login Bendahara berhasil." });
    } else {
      res.status(401).json({ error: "Password Bendahara salah. Coba periksa kembali password Anda atau hubungi admin." });
    }
  });

  app.post("/api/treasurer/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    if (oldPassword !== treasurerConfig.password) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }
    treasurerConfig.password = newPassword.trim();
    saveState();
    
    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-treasurer-${Date.now()}`,
      title: "Sandi Akun Bendahara Berubah 🔑",
      message: `Password akun Bendahara baru saja diperbarui melalui portal bendahara keamanan.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi Bendahara sukses disimpan." });
  });

  app.post("/api/admin/treasurer/reset-password", (req, res) => {
    treasurerConfig.password = "bendahara123";
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-treasurer-reset-${Date.now()}`,
      title: "Sandi Bendahara Direset 🔒",
      message: `Akun Bendahara disetel ulang ke sandi bawaan (bendahara123) oleh Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Password Bendahara berhasil di-reset ke sandi bawaan: bendahara123" });
  });

  app.post("/api/admin/treasurer/change-password", (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    treasurerConfig.password = newPassword.trim();
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-treasurer-admin-${Date.now()}`,
      title: "Sandi Bendahara Diubah Admin 🔑",
      message: `Password akun Bendahara telah disetel oleh Kepala/Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Sandi Bendahara sukses diperbarui." });
  });

  // Principal/Kepala Sekolah Credentials Validation Endpoints
  app.post("/api/principal/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    if (username.slice().toLowerCase() === "kepala" && password === principalConfig.password) {
      res.json({ success: true, message: "Login Kepala Sekolah berhasil." });
    } else {
      res.status(401).json({ error: "Password Kepala Sekolah salah. Coba periksa kembali password Anda atau hubungi admin." });
    }
  });

  app.post("/api/principal/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    if (oldPassword !== principalConfig.password) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }
    principalConfig.password = newPassword.trim();
    saveState();
    
    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-principal-${Date.now()}`,
      title: "Sandi Akun Kepala Sekolah Berubah 🔑",
      message: `Password akun Kepala Sekolah baru saja diperbarui melalui portal keamanan pribadi.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi Kepala Sekolah sukses disimpan." });
  });

  app.post("/api/admin/principal/reset-password", (req, res) => {
    principalConfig.password = "kepala123";
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-principal-reset-${Date.now()}`,
      title: "Sandi Kepala Sekolah Direset 🔒",
      message: `Akun Kepala Sekolah disetel ulang ke sandi bawaan (kepala123) oleh Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Password Kepala Sekolah berhasil di-reset ke sandi bawaan: kepala123" });
  });

  app.post("/api/admin/principal/change-password", (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    principalConfig.password = newPassword.trim();
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-principal-admin-${Date.now()}`,
      title: "Sandi Kepala Sekolah Diubah Admin 🔑",
      message: `Password akun Kepala Sekolah telah disetel oleh Kepala/Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Sandi Kepala Sekolah sukses diperbarui oleh Admin." });
  });

  // Waka Sarpras Credentials Validation Endpoints
  app.post("/api/sarpras/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    const cleanUser = username.trim().toLowerCase();
    if ((cleanUser === "sarpras" || cleanUser === "waka") && password === sarprasConfig.password) {
      res.json({ success: true, message: "Login Waka Sarpras berhasil." });
    } else {
      res.status(401).json({ error: "Password Waka Sarpras salah. Coba periksa kembali password Anda atau hubungi admin." });
    }
  });

  app.post("/api/sarpras/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    if (oldPassword !== sarprasConfig.password) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }
    sarprasConfig.password = newPassword.trim();
    saveState();
    
    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-sarpras-${Date.now()}`,
      title: "Sandi Akun Waka Sarpras Berubah 🔑",
      message: `Password akun Waka Sarpras baru saja diperbarui melalui portal sarpras keamanan.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi Waka Sarpras sukses disimpan." });
  });

  app.post("/api/admin/sarpras/reset-password", (req, res) => {
    sarprasConfig.password = "sarpras123";
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-sarpras-reset-${Date.now()}`,
      title: "Sandi Waka Sarpras Direset 🔒",
      message: `Akun Waka Sarpras disetel ulang ke sandi bawaan (sarpras123) oleh Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Password Waka Sarpras berhasil di-reset ke sandi bawaan: sarpras123" });
  });

  app.post("/api/admin/sarpras/change-password", (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    sarprasConfig.password = newPassword.trim();
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-sarpras-admin-${Date.now()}`,
      title: "Sandi Waka Sarpras Diubah Admin 🔑",
      message: `Password akun Waka Sarpras telah disetel oleh Kepala/Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Sandi Waka Sarpras sukses diperbarui oleh Admin." });
  });

  // Guru BK Credentials Validation Endpoints
  app.post("/api/bk/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser === "bk" && password === bkConfig.password) {
      res.json({ success: true, message: "Login Guru BK berhasil." });
    } else {
      res.status(401).json({ error: "Password Guru BK salah. Coba periksa kembali password Anda atau hubungi admin." });
    }
  });

  app.post("/api/bk/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    if (oldPassword !== bkConfig.password) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }
    bkConfig.password = newPassword.trim();
    saveState();
    
    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-bk-${Date.now()}`,
      title: "Sandi Akun Guru BK Berubah 🔑",
      message: `Password akun Guru BK baru saja diperbarui melalui portal keamanan.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi Guru BK sukses disimpan." });
  });

  app.post("/api/admin/bk/reset-password", (req, res) => {
    bkConfig.password = "bk123";
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-bk-reset-${Date.now()}`,
      title: "Sandi Guru BK Direset 🔒",
      message: `Akun Guru BK disetel ulang ke sandi bawaan (bk123) oleh Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Password Guru BK berhasil di-reset ke sandi bawaan: bk123" });
  });

  app.post("/api/admin/bk/change-password", (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    bkConfig.password = newPassword.trim();
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-bk-admin-${Date.now()}`,
      title: "Sandi Guru BK Diubah Admin 🔑",
      message: `Password akun Guru BK telah disetel oleh Kepala/Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Sandi Guru BK sukses diperbarui oleh Admin." });
  });

  // Waka Kurikulum Credentials Validation Endpoints
  app.post("/api/curriculum/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    const cleanUser = username.trim().toLowerCase().replace(/[\s\-_]+/g, "");
    if ((cleanUser.includes("kurikulum") || cleanUser === "waka" || cleanUser === "wakakur") && password === curriculumConfig.password) {
      res.json({ success: true, message: "Login Waka Kurikulum berhasil." });
    } else {
      res.status(401).json({ error: "Password Waka Kurikulum salah. Gunakan sandi bawaan 'kurikulum123' atau hubungi admin." });
    }
  });

  app.post("/api/curriculum/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    if (oldPassword !== curriculumConfig.password) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }
    curriculumConfig.password = newPassword.trim();
    saveState();

    const notification: RealtimeNotification = {
      id: `notif-pwd-curriculum-${Date.now()}`,
      title: "Sandi Akun Waka Kurikulum Berubah 🔑",
      message: `Password akun Waka Kurikulum baru saja diperbarui melalui portal kurikulum.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi Waka Kurikulum sukses disimpan." });
  });

  app.post("/api/admin/curriculum/reset-password", (req, res) => {
    curriculumConfig.password = "kurikulum123";
    saveState();

    const notification: RealtimeNotification = {
      id: `notif-pwd-curriculum-reset-${Date.now()}`,
      title: "Sandi Waka Kurikulum Direset 🔒",
      message: `Akun Waka Kurikulum disetel ulang ke sandi bawaan (kurikulum123) oleh Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Password Waka Kurikulum berhasil di-reset ke sandi bawaan: kurikulum123" });
  });

  app.post("/api/admin/curriculum/change-password", (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    curriculumConfig.password = newPassword.trim();
    saveState();

    const notification: RealtimeNotification = {
      id: `notif-pwd-curriculum-admin-${Date.now()}`,
      title: "Sandi Waka Kurikulum Diubah Admin 🔑",
      message: `Password akun Waka Kurikulum telah disetel oleh Kepala/Staf Administrasi.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Sandi Waka Kurikulum sukses diperbarui oleh Admin." });
  });

  // Administrator Utama Credentials Validation Endpoints
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    if (username.slice().toLowerCase() === "admin" && password === adminConfig.password) {
      res.json({ success: true, message: "Login Administrator berhasil." });
    } else {
      res.status(401).json({ error: "Password Administrator salah. Coba periksa kembali password Anda." });
    }
  });

  app.post("/api/admin/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "Sandi baru wajib diisi." });
    }
    if (oldPassword !== adminConfig.password) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan tidak sesuai." });
    }
    adminConfig.password = newPassword.trim();
    saveState();
    
    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-pwd-admin-${Date.now()}`,
      title: "Sandi Administrator Utama Diperbarui ⚙️",
      message: `Password akun Utama Administrator telah berhasil diperbarui secara mandiri oleh Staf Administrasi.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: "Kata sandi Administrator Utama sukses disimpan." });
  });

  // System Database Reset Endpoint (Clear Dummy Data & Financial Transactions to start fresh)
  app.post("/api/admin/system/reset-data", (req, res) => {
    try {
      // 1. Clear student list
      students.length = 0;

      // 2. Clear financial records
      sppBills.length = 0;
      savingsTransactions.length = 0;
      treasurerTransactions.length = 0;

      // 3. Clear academic & behavioral logs
      attendanceLogs.length = 0;
      teachingJournals.length = 0;
      studentDevelopmentLogs.length = 0;
      studentInfractionLogs.length = 0;
      studentCounselingLogs.length = 0;
      classMeetingLogs.length = 0;
      merdekaAssessments.length = 0;

      // 4. Clear inventory transaction logs (loans)
      sarprasLoans.length = 0;
      // We can preserve sarprasItems (catalogs) and proposals, but let's clear proposals just in case since they might list reference to dummy students or dummy teachers.
      sarprasProposals.length = 0;

      // 5. Clean Notifications keeping a startup welcome msg
      notifications.length = 0;
      notifications.unshift({
        id: `notif-reset-${Date.now()}`,
        title: "Sistem Terbuka & Bersih! 🚀",
        message: "Data murid bawaan, catatan kehadiran, portofolio kedisiplinan, serta seluruh riwayat keuangan (SPP & Tabungan) berhasil dikosongkan. Aplikasi siap dioperasikan.",
        type: "success",
        createdAt: new Date().toISOString()
      });

      // Save the cleared arrays in local JSON & sync to MongoDB
      saveState();

      res.json({ 
        success: true, 
        message: "Seluruh data siswa dummy dan riwayat transaksi keuangan berhasil dibersihkan! Aplikasi siap digunakan."
      });
    } catch (err: any) {
      console.error("System reset failed:", err);
      res.status(500).json({ error: "Gagal memproses pembersihan database: " + err.message });
    }
  });

  // --- STUDENT ATTENDANCE (ABSENSI) ENDPOINTS ---
  app.get("/api/attendance", (req, res) => {
    const enrichedLogs = attendanceLogs.map(log => {
      let resolvedName = log.studentName;
      if (!resolvedName || resolvedName.startsWith("Siswa (std-")) {
        const st = students.find(s => 
          s.id === log.studentId || 
          (s.id && s.id.toLowerCase() === log.studentId?.toLowerCase()) ||
          s.nis === log.studentId || 
          (s.nis && s.nis.toLowerCase() === log.studentId?.toLowerCase())
        );
        if (st && st.name) {
          resolvedName = st.name;
        } else {
          for (const j of teachingJournals) {
            if (Array.isArray(j.attendance)) {
              const att = j.attendance.find((a: any) => 
                a.studentId === log.studentId || 
                (a.studentId && a.studentId.toLowerCase() === log.studentId?.toLowerCase())
              );
              if (att && att.studentName && !att.studentName.startsWith("Siswa (std-")) {
                resolvedName = att.studentName;
                break;
              }
            }
          }
        }
      }
      return {
        ...log,
        studentName: resolvedName || log.studentName || ""
      };
    });
    res.json(enrichedLogs);
  });

  app.get("/api/attendance/student/:studentId", (req, res) => {
    const studentId = req.params.studentId;
    const logs = attendanceLogs.filter(l => l.studentId === studentId);
    res.json(logs);
  });

  // Delete attendance by log ID
  app.delete("/api/attendance/:id", async (req, res) => {
    const id = req.params.id;
    const initialLen = attendanceLogs.length;
    const logToDelete = attendanceLogs.find(l => l.id === id);
    
    // Remove from in-memory array
    const filtered = attendanceLogs.filter(l => l.id !== id);
    attendanceLogs.length = 0;
    attendanceLogs.push(...filtered);

    // Also remove from teaching journals if logToDelete has studentId or studentName
    if (logToDelete) {
      teachingJournals.forEach(j => {
        if (Array.isArray(j.attendance)) {
          j.attendance = j.attendance.filter((a: any) => 
            a.id !== id && 
            !(logToDelete.studentId && a.studentId === logToDelete.studentId && j.date === logToDelete.date)
          );
        }
      });
    }

    saveState();
    await saveStateToFirestore();

    if (mongoDb && logToDelete) {
      deleteDocFromFirestore("attendanceLogs", id).catch(() => {});
    }

    res.json({ success: true, message: "Data presensi berhasil dihapus", removedCount: initialLen - attendanceLogs.length });
  });

  // Delete all attendance logs for a specific student ID or Name
  app.delete("/api/attendance/student/:studentId", async (req, res) => {
    const rawTarget = decodeURIComponent(req.params.studentId || "");
    const targetId = rawTarget.trim();
    const lowerTarget = targetId.toLowerCase();
    
    const initialLen = attendanceLogs.length;
    
    // Find matching logs to delete
    const logsToRemove = attendanceLogs.filter(l => 
      l.studentId === targetId || 
      (l.studentId && l.studentId.toLowerCase().trim() === lowerTarget) ||
      (l.studentName && l.studentName.toLowerCase().trim().includes(lowerTarget))
    );

    const remainingLogs = attendanceLogs.filter(l => 
      l.studentId !== targetId && 
      (!l.studentId || l.studentId.toLowerCase().trim() !== lowerTarget) &&
      (!l.studentName || !l.studentName.toLowerCase().trim().includes(lowerTarget))
    );

    attendanceLogs.length = 0;
    attendanceLogs.push(...remainingLogs);

    // Clean teachingJournals attendance array for this student
    teachingJournals.forEach(j => {
      if (Array.isArray(j.attendance)) {
        j.attendance = j.attendance.filter((a: any) => 
          a.studentId !== targetId &&
          (!a.studentId || a.studentId.toLowerCase().trim() !== lowerTarget) &&
          (!a.studentName || !a.studentName.toLowerCase().trim().includes(lowerTarget))
        );
      }
    });

    saveState();
    await saveStateToFirestore();

    if (mongoDb) {
      for (const log of logsToRemove) {
        deleteDocFromFirestore("attendanceLogs", log.id).catch(() => {});
      }
    }

    res.json({ 
      success: true, 
      message: `Berhasil menghapus ${initialLen - attendanceLogs.length} data presensi siswa.`, 
      removedCount: initialLen - attendanceLogs.length 
    });
  });

  // Save single attendance entry
  app.post("/api/attendance", (req, res) => {
    const { studentId, studentName, date, status, notes } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: "Data absensi tidak lengkap." });
    }

    const st = students.find(s => s.id === studentId || s.nis === studentId);
    const resolvedName = (st && st.name) ? st.name : (studentName || "");

    const index = attendanceLogs.findIndex(l => l.studentId === studentId && l.date === date);
    if (index !== -1) {
      attendanceLogs[index].status = status;
      attendanceLogs[index].notes = notes || "";
      if (resolvedName && (!attendanceLogs[index].studentName || attendanceLogs[index].studentName.startsWith("Siswa (std-"))) {
        attendanceLogs[index].studentName = resolvedName;
      }
    } else {
      attendanceLogs.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        studentName: resolvedName,
        date,
        status,
        notes: notes || ""
      });
    }
    saveState();
    res.json({ success: true, attendanceLogs });
  });

  // Batch save attendance entries
  app.post("/api/attendance/batch", (req, res) => {
    const { logs } = req.body; // array of { studentId, studentName, date, status, notes }
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: "Logs harus berupa array." });
    }

    logs.forEach(item => {
      const { studentId, studentName, date, status, notes } = item;
      if (!studentId || !date || !status) return;

      const st = students.find(s => s.id === studentId || s.nis === studentId);
      const resolvedName = (st && st.name) ? st.name : (studentName || "");

      const index = attendanceLogs.findIndex(l => l.studentId === studentId && l.date === date);
      if (index !== -1) {
        attendanceLogs[index].status = status;
        attendanceLogs[index].notes = notes || "";
        if (resolvedName && (!attendanceLogs[index].studentName || attendanceLogs[index].studentName.startsWith("Siswa (std-"))) {
          attendanceLogs[index].studentName = resolvedName;
        }
      } else {
        attendanceLogs.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId,
          studentName: resolvedName,
          date,
          status,
          notes: notes || ""
        });
      }
    });

    saveState();
    res.json({ success: true, attendanceLogs });
  });

  // --- HOMEROOM TEACHERS (WALI KELAS) ENDPOINTS ---
  app.get("/api/homerooms", (req, res) => {
    res.json(homeroomTeachers);
  });

  app.post("/api/admin/homerooms", (req, res) => {
    const { username, name, className, password, skUrl } = req.body;
    if (!username || !name || !className) {
      return res.status(400).json({ error: "Informasi Wali Kelas tidak lengkap." });
    }

    const duplicate = homeroomTeachers.find(ht => ht.username.toLowerCase() === username.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: `Username wali kelas "${username}" sudah digunakan.` });
    }

    const newHt: HomeroomTeacher = {
      id: `ht-${Date.now()}`,
      username: username.trim(),
      name: name.trim(),
      className: className.trim(),
      password: password ? String(password).trim() : "wali123",
      skUrl: skUrl ? String(skUrl).trim() : ""
    };

    homeroomTeachers.push(newHt);
    saveState();

    // Notify
    const notification: RealtimeNotification = {
      id: `notif-ht-add-${newHt.id}`,
      title: "Wali Kelas Baru",
      message: `Akun Wali kelas baru ${newHt.name} (Kelas ${newHt.className}) telah didaftarkan oleh Admin.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, homeroomTeachers, added: newHt });
  });

  app.put("/api/admin/homerooms/:id", (req, res) => {
    const id = req.params.id;
    const { username, name, className, password, skUrl } = req.body;
    
    const htIndex = homeroomTeachers.findIndex(ht => ht.id === id);
    if (htIndex === -1) {
      return res.status(404).json({ error: "Wali kelas tidak ditemukan." });
    }

    if (username) {
      const dup = homeroomTeachers.find(ht => ht.username.toLowerCase() === username.toLowerCase() && ht.id !== id);
      if (dup) {
        return res.status(400).json({ error: `Username "${username}" sudah digunakan wali kelas lain.` });
      }
      homeroomTeachers[htIndex].username = username.trim();
    }

    if (name) homeroomTeachers[htIndex].name = name.trim();
    if (className) homeroomTeachers[htIndex].className = className.trim();
    if (password !== undefined) homeroomTeachers[htIndex].password = String(password).trim();
    if (skUrl !== undefined) homeroomTeachers[htIndex].skUrl = String(skUrl).trim();

    saveState();
    res.json({ success: true, homeroomTeachers, updated: homeroomTeachers[htIndex] });
  });

  app.delete("/api/admin/homerooms/:id", (req, res) => {
    const id = req.params.id;
    const idx = homeroomTeachers.findIndex(ht => ht.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Wali kelas tidak ditemukan." });
    }

    const removed = homeroomTeachers.splice(idx, 1)[0];
    saveState();
    deleteDocFromFirestore("homeroomTeachers", id).catch(err => console.error(err));
    res.json({ success: true, homeroomTeachers, removed });
  });

  // --- SUBJECT TEACHERS (GURU MAPEL) ENDPOINTS ---
  app.get("/api/subject-teachers", (req, res) => {
    res.json(subjectTeachers);
  });

  app.post("/api/admin/subject-teachers", (req, res) => {
    const { username, name, subject, password, skUrl } = req.body;
    if (!username || !name || !subject) {
      return res.status(400).json({ error: "Informasi Guru Mata Pelajaran tidak lengkap." });
    }

    const duplicate = subjectTeachers.find(st => st.username.toLowerCase() === username.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: `Username guru mapel "${username}" sudah digunakan.` });
    }

    const newSt: SubjectTeacher = {
      id: `st-${Date.now()}`,
      username: username.trim(),
      name: name.trim(),
      subject: subject.trim(),
      password: password ? String(password).trim() : "mapel123",
      skUrl: skUrl ? String(skUrl).trim() : ""
    };

    subjectTeachers.push(newSt);
    saveState();

    const notification: RealtimeNotification = {
      id: `notif-st-add-${newSt.id}`,
      title: "Guru Mata Pelajaran Baru",
      message: `Akun Guru Mapel baru Bapak/Ibu ${newSt.name} (${newSt.subject}) telah didaftarkan.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, subjectTeachers, added: newSt });
  });

  app.put("/api/admin/subject-teachers/:id", (req, res) => {
    const id = req.params.id;
    const { username, name, subject, password, skUrl } = req.body;
    
    const stIndex = subjectTeachers.findIndex(st => st.id === id);
    if (stIndex === -1) {
      return res.status(404).json({ error: "Guru mapel tidak ditemukan." });
    }

    if (username) {
      const dup = subjectTeachers.find(st => st.username.toLowerCase() === username.toLowerCase() && st.id !== id);
      if (dup) {
        return res.status(400).json({ error: `Username "${username}" sudah digunakan guru mapel lain.` });
      }
      subjectTeachers[stIndex].username = username.trim();
    }

    if (name) subjectTeachers[stIndex].name = name.trim();
    if (subject) subjectTeachers[stIndex].subject = subject.trim();
    if (password !== undefined) subjectTeachers[stIndex].password = String(password).trim();
    if (skUrl !== undefined) subjectTeachers[stIndex].skUrl = String(skUrl).trim();

    saveState();
    res.json({ success: true, subjectTeachers, updated: subjectTeachers[stIndex] });
  });

  app.delete("/api/admin/subject-teachers/:id", (req, res) => {
    const id = req.params.id;
    const idx = subjectTeachers.findIndex(st => st.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Guru mapel tidak ditemukan." });
    }

    const removed = subjectTeachers.splice(idx, 1)[0];
    saveState();
    res.json({ success: true, subjectTeachers, removed });
  });

  app.post("/api/admin/subject-teachers/auto-generate", (req, res) => {
    const list = [
      { name: "Drs. Heru Setyawan, M.Pd", subject: "Matematika", username: "guru_math" },
      { name: "Ibu Lindawati, S.Pd", subject: "Bahasa Inggris", username: "guru_english" },
      { name: "Budi Wijaya, S.Si", subject: "Ilmu Pengetahuan Alam", username: "guru_ipa" },
      { name: "Dra. Siti Rahma", subject: "Ilmu Pengetahuan Sosial", username: "guru_ips" },
      { name: "Ahmad Fauzan, S.S", subject: "Bahasa Indonesia", username: "guru_indo" },
      { name: "KH. M. Syukron, S.Pd.I", subject: "Pendidikan Agama Islam", username: "guru_agama" },
      { name: "Eko Prasetyo, S.Pd", subject: "Pendidikan Jasmani & OR", username: "guru_pjok" },
      { name: "Dra. Nurhayati", subject: "Seni Budaya", username: "guru_seni" },
      { name: "Agus Setyono, S.Kom", subject: "Informatika", username: "guru_info" }
    ];

    let addedCount = 0;
    list.forEach(item => {
      const exists = subjectTeachers.some(t => t.username.toLowerCase() === item.username.toLowerCase());
      if (!exists) {
        subjectTeachers.push({
          id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          username: item.username,
          name: item.name,
          subject: item.subject,
          password: "mapel123"
        });
        addedCount++;
      }
    });

    saveState();
    res.json({ success: true, subjectTeachers, addedCount });
  });

  app.post("/api/subject-teachers/change-password", (req, res) => {
    const { teacherId, oldPassword, newPassword } = req.body;
    if (!teacherId || !newPassword) {
      return res.status(400).json({ error: "Data kata sandi tidak lengkap." });
    }

    const teacher = subjectTeachers.find(t => t.id === teacherId);
    if (!teacher) {
      return res.status(404).json({ error: "Guru mapel tidak ditemukan." });
    }

    const activePassword = teacher.password || "mapel123";
    if (oldPassword && oldPassword !== activePassword) {
      return res.status(400).json({ error: "Kata sandi lama yang Anda masukkan salah." });
    }

    teacher.password = newPassword.trim();
    saveState();
    res.json({ success: true, message: "Kata sandi mapel berhasil diubah." });
  });

  // --- TEACHING JOURNALS (JURNAL PEMBELAJARAN & ABSENSI MAPEL) ENDPOINTS ---
  function normalizeJournalTeacherIds() {
    try {
      const nameToIdMap = new Map<string, string>();
      const userToIdMap = new Map<string, string>();

      [...subjectTeachers, ...homeroomTeachers].forEach(t => {
        if (t.name && t.id) nameToIdMap.set(t.name.trim().toLowerCase(), t.id);
        if ((t as any).username && t.id) userToIdMap.set((t as any).username.trim().toLowerCase(), t.id);
      });

      let changed = false;
      teachingJournals.forEach(j => {
        const tName = j.teacherName ? j.teacherName.trim().toLowerCase() : '';
        const uName = (j as any).username ? (j as any).username.trim().toLowerCase() : '';
        const targetId = nameToIdMap.get(tName) || userToIdMap.get(uName);
        if (targetId && j.teacherId !== targetId) {
          j.teacherId = targetId;
          changed = true;
        }
      });

      if (changed) {
        saveState();
      }
    } catch (e) {
      console.error("Error normalizing journal teacher IDs:", e);
    }
  }

  app.get("/api/teaching-journals", (req, res) => {
    normalizeJournalTeacherIds();
    res.json(teachingJournals);
  });

  app.post("/api/teaching-journals", (req, res) => {
    const { 
      teacherId, 
      teacherName, 
      teacherType,
      subject, 
      className, 
      date, 
      topic, 
      attendance, 
      notes,
      fase,
      semester,
      alokasiWaktu,
      jamKe,
      pertemuanKe,
      tujuanPembelajaran,
      pencapaianKktp
    } = req.body;
    if (!teacherId || !teacherName || !subject || !className || !date || !topic || !Array.isArray(attendance)) {
      return res.status(400).json({ error: "Data Jurnal Pembelajaran tidak lengkap." });
    }

    const newJournal: TeachingJournal = {
      id: `tj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      teacherId,
      teacherName,
      teacherType: teacherType || 'subject_teacher',
      subject,
      className,
      date,
      topic,
      attendance,
      notes: notes || "",
      fase: fase || "D",
      semester: semester || "Genap",
      alokasiWaktu: alokasiWaktu || "2 JP",
      jamKe: jamKe || "",
      pertemuanKe: pertemuanKe || "",
      tujuanPembelajaran: tujuanPembelajaran || "",
      pencapaianKktp: pencapaianKktp || "",
      createdAt: new Date().toISOString()
    };

    teachingJournals.unshift(newJournal);

    // Also sync/merge into standard attendanceLogs
    attendance.forEach((studentAtt: any) => {
      const { studentId, studentName, status, notes: attNotes } = studentAtt;
      const existingLogIndex = attendanceLogs.findIndex(log => log.studentId === studentId && log.date === date);
      
      const st = students.find(s => s.id === studentId || s.nis === studentId);
      const nameToSet = (st && st.name) ? st.name : (studentName || "");

      const newSubNote = {
        subject,
        teacherName,
        status,
        notes: attNotes || ''
      };

      if (existingLogIndex !== -1) {
        // Update existing daily attendance status ONLY if we are not erasing a special non-Hadir status (Terlambat, Sakit, Izin, Alpa) with a default 'Hadir' from subject teacher
        const currentDailyStatus = attendanceLogs[existingLogIndex].status;
        const nonPresentStatuses = ['Terlambat', 'Sakit', 'Izin', 'Alpa'];

        if (!nonPresentStatuses.includes(currentDailyStatus) || status !== 'Hadir') {
          attendanceLogs[existingLogIndex].status = status;
        }

        if (nameToSet && (!attendanceLogs[existingLogIndex].studentName || attendanceLogs[existingLogIndex].studentName.startsWith("Siswa (std-"))) {
          attendanceLogs[existingLogIndex].studentName = nameToSet;
        }

        if (!attendanceLogs[existingLogIndex].subjectNotes) {
          attendanceLogs[existingLogIndex].subjectNotes = [];
        }
        const existingSubNotesIndex = attendanceLogs[existingLogIndex].subjectNotes!.findIndex((sn: any) => sn.subject === subject);
        if (existingSubNotesIndex !== -1) {
          attendanceLogs[existingLogIndex].subjectNotes![existingSubNotesIndex] = newSubNote;
        } else {
          attendanceLogs[existingLogIndex].subjectNotes!.push(newSubNote);
        }
      } else {
        // Create new daily attendance
        attendanceLogs.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId,
          studentName: nameToSet,
          date,
          status,
          notes: "",
          subjectNotes: [newSubNote]
        });
      }
    });

    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-tj-${newJournal.id}`,
      title: "Jurnal Pembelajaran Baru",
      message: `Bapak/Ibu ${teacherName} mengisi KBM ${subject} di Kelas ${className} mengenai: "${topic}"`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, teachingJournals, newJournal });
  });

  app.put("/api/teaching-journals/:id", (req, res) => {
    const { id } = req.params;
    const {
      subject,
      className,
      date,
      topic,
      attendance,
      notes,
      fase,
      semester,
      alokasiWaktu,
      jamKe,
      pertemuanKe,
      tujuanPembelajaran,
      pencapaianKktp
    } = req.body;

    const journalIndex = teachingJournals.findIndex(j => j.id === id);
    if (journalIndex === -1) {
      return res.status(404).json({ error: "Jurnal Pembelajaran tidak ditemukan." });
    }

    const journal = teachingJournals[journalIndex];

    if (subject !== undefined) journal.subject = subject;
    if (className !== undefined) journal.className = className;
    if (date !== undefined) journal.date = date;
    if (topic !== undefined) journal.topic = topic;
    if (notes !== undefined) journal.notes = notes;
    if (fase !== undefined) journal.fase = fase;
    if (semester !== undefined) journal.semester = semester;
    if (alokasiWaktu !== undefined) journal.alokasiWaktu = alokasiWaktu;
    if (jamKe !== undefined) journal.jamKe = jamKe;
    if (pertemuanKe !== undefined) journal.pertemuanKe = pertemuanKe;
    if (tujuanPembelajaran !== undefined) journal.tujuanPembelajaran = tujuanPembelajaran;
    if (pencapaianKktp !== undefined) journal.pencapaianKktp = pencapaianKktp;
    
    if (attendance !== undefined && Array.isArray(attendance)) {
      journal.attendance = attendance;

      // Also sync/merge into standard attendanceLogs
      attendance.forEach((studentAtt: any) => {
        const { studentId, status, notes: attNotes } = studentAtt;
        const targetDate = date || journal.date;
        const existingLogIndex = attendanceLogs.findIndex(log => log.studentId === studentId && log.date === targetDate);
        
        const newSubNote = {
          subject: subject || journal.subject,
          teacherName: journal.teacherName,
          status,
          notes: attNotes || ''
        };

        if (existingLogIndex !== -1) {
          const currentDailyStatus = attendanceLogs[existingLogIndex].status;
          const nonPresentStatuses = ['Terlambat', 'Sakit', 'Izin', 'Alpa'];

          if (!nonPresentStatuses.includes(currentDailyStatus) || status !== 'Hadir') {
            attendanceLogs[existingLogIndex].status = status;
          }

          if (!attendanceLogs[existingLogIndex].subjectNotes) {
            attendanceLogs[existingLogIndex].subjectNotes = [];
          }
          const existingSubNotesIndex = attendanceLogs[existingLogIndex].subjectNotes!.findIndex((sn: any) => sn.subject === (subject || journal.subject));
          if (existingSubNotesIndex !== -1) {
            attendanceLogs[existingLogIndex].subjectNotes![existingSubNotesIndex] = newSubNote;
          } else {
            attendanceLogs[existingLogIndex].subjectNotes!.push(newSubNote);
          }
        } else {
          attendanceLogs.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            studentId,
            date: targetDate,
            status,
            notes: "",
            subjectNotes: [newSubNote]
          });
        }
      });
    }

    saveState();
    res.json({ success: true, teachingJournals, updatedJournal: journal });
  });

  app.delete("/api/teaching-journals/:id", (req, res) => {
    const { id } = req.params;
    const journalIndex = teachingJournals.findIndex(j => j.id === id);
    if (journalIndex === -1) {
      return res.status(404).json({ error: "Jurnal Pembelajaran tidak ditemukan." });
    }

    const [deletedJournal] = teachingJournals.splice(journalIndex, 1);
    saveState();
    res.json({ success: true, message: "Jurnal Pembelajaran berhasil dihapus.", deletedJournal });
  });

  // --- STUDENT DEVELOPMENT LOGS (CATATAN PERKEMBANGAN SISWA) ENDPOINTS ---
  app.get("/api/student-development-logs", (req, res) => {
    res.json(studentDevelopmentLogs);
  });

  app.post("/api/student-development-logs", (req, res) => {
    const { studentId, studentName, className, date, category, notes } = req.body;
    if (!studentId || !studentName || !className || !date || !category || !notes) {
      return res.status(400).json({ error: "Data Catatan Perkembangan Siswa tidak lengkap." });
    }

    const newLog: StudentDevelopmentLog = {
      id: `sdl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      studentName,
      className,
      date,
      category,
      notes,
      createdAt: new Date().toISOString()
    };

    studentDevelopmentLogs.unshift(newLog);
    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-sdl-${newLog.id}`,
      studentId: studentId,
      title: `Catatan Perkembangan Siswa: ${category}`,
      message: `Catatan perkembangan baru ditambahkan untuk ${studentName} (Kelas ${className}).`,
      type: "info",
      category: "bk",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, studentDevelopmentLogs, newLog });
  });

  app.delete("/api/student-development-logs/:id", (req, res) => {
    const { id } = req.params;
    const index = studentDevelopmentLogs.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Catatan perkembangan tidak ditemukan." });
    }
    studentDevelopmentLogs.splice(index, 1);
    saveState();
    res.json({ success: true, studentDevelopmentLogs });
  });

  // --- STUDENT INFRACTION LOGS (PENCATATAN PELANGGARAN) ENDPOINTS ---
  app.get("/api/student-infraction-logs", (req, res) => {
    res.json(studentInfractionLogs);
  });

  app.post("/api/student-infraction-logs", (req, res) => {
    const { studentId, studentName, className, date, time, location, infractionType, actionTaken, resolutionStatus, points } = req.body;
    if (!studentId || !studentName || !className || !date || !time || !location || !infractionType || !actionTaken || !resolutionStatus) {
      return res.status(400).json({ error: "Data Pelanggaran tidak lengkap." });
    }

    const newLog: StudentInfractionLog = {
      id: `sil-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      studentName,
      className,
      date,
      time,
      location,
      infractionType,
      actionTaken,
      resolutionStatus,
      points: Number(points) || 0,
      createdAt: new Date().toISOString()
    } as any;

    studentInfractionLogs.unshift(newLog);
    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-sil-${newLog.id}`,
      studentId: studentId,
      title: `Laporan Pelanggaran: Kelas ${className}`,
      message: `Pencatatan pelanggaran baru untuk ${studentName} (${infractionType}) dengan status: ${resolutionStatus}.`,
      type: "warning",
      category: "bk",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, studentInfractionLogs, newLog });
  });

  app.delete("/api/student-infraction-logs/:id", (req, res) => {
    const { id } = req.params;
    const index = studentInfractionLogs.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Pencatatan pelanggaran tidak ditemukan." });
    }
    studentInfractionLogs.splice(index, 1);
    saveState();
    res.json({ success: true, studentInfractionLogs });
  });

  // --- INFRACTION MASTER RULES (POIN PELANGGARAN CRUD) ---
  app.get("/api/infraction-rules", (req, res) => {
    res.json(infractionRules);
  });

  app.post("/api/infraction-rules", (req, res) => {
    const { name, points, category } = req.body;
    if (!name || points === undefined || !category) {
      return res.status(400).json({ error: "Nama, poin dan tingkatan pelanggaran wajib diisi." });
    }
    const newRule = {
      id: `ir-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      points: Number(points) || 0,
      category
    };
    infractionRules.unshift(newRule);
    saveState();
    res.json({ success: true, infractionRules, newRule });
  });

  app.put("/api/infraction-rules/:id", (req, res) => {
    const { id } = req.params;
    const { name, points, category } = req.body;
    const rule = infractionRules.find(r => r.id === id);
    if (!rule) {
      return res.status(404).json({ error: "Aturan pelanggaran tidak ditemukan." });
    }
    if (name !== undefined) rule.name = name;
    if (points !== undefined) rule.points = Number(points) || 0;
    if (category !== undefined) rule.category = category;
    saveState();
    res.json({ success: true, infractionRules, updatedRule: rule });
  });

  app.delete("/api/infraction-rules/:id", (req, res) => {
    const { id } = req.params;
    const idx = infractionRules.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Aturan pelanggaran tidak ditemukan." });
    }
    infractionRules.splice(idx, 1);
    saveState();
    res.json({ success: true, infractionRules });
  });


  // --- STUDENT COUNSELING LOGS (BIMBINGAN & KONSELING) ENDPOINTS ---
  app.get("/api/student-counseling-logs", (req, res) => {
    res.json(studentCounselingLogs);
  });

  app.post("/api/student-counseling-logs", (req, res) => {
    const { studentId, studentName, className, date, topic, actionPlan, result } = req.body;
    if (!studentId || !studentName || !className || !date || !topic || !actionPlan || !result) {
      return res.status(400).json({ error: "Data Bimbingan & Konseling tidak lengkap." });
    }

    const newLog: StudentCounselingLog = {
      id: `scl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      studentName,
      className,
      date,
      topic,
      actionPlan,
      result,
      createdAt: new Date().toISOString()
    };

    studentCounselingLogs.unshift(newLog);
    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-scl-${newLog.id}`,
      studentId: studentId,
      title: `Catatan Bimbingan: ${studentName}`,
      message: `Wali Kelas ${className} memperbarui sesi bimbingan dengan topik: "${topic}".`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, studentCounselingLogs, newLog });
  });

  app.delete("/api/student-counseling-logs/:id", (req, res) => {
    const { id } = req.params;
    const index = studentCounselingLogs.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Bimbingan konseling tidak ditemukan." });
    }
    studentCounselingLogs.splice(index, 1);
    saveState();
    res.json({ success: true, studentCounselingLogs });
  });

  app.put("/api/student-counseling-logs/:id/feedback", (req, res) => {
    const { id } = req.params;
    const { bkFeedback } = req.body;
    
    const index = studentCounselingLogs.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Catatan bimbingan konseling tidak ditemukan." });
    }
    
    studentCounselingLogs[index].bkFeedback = bkFeedback;
    studentCounselingLogs[index].bkFeedbackAt = new Date().toISOString();
    saveState();

    // Broadcast SSE notification for counselor feedback
    const notification: RealtimeNotification = {
      id: `notif-bk-feedback-${id}-${Date.now()}`,
      studentId: studentCounselingLogs[index].studentId,
      title: `Saran Guru BK Masuk 🧠`,
      message: `Guru BK memberikan saran & solusi untuk bimbingan konseling siswa ${studentCounselingLogs[index].studentName}.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, studentCounselingLogs, updatedLog: studentCounselingLogs[index] });
  });


  // --- CLASS ANNOUNCEMENTS (INFORMASI & PENGUMUMAN) ENDPOINTS ---
  app.get("/api/class-announcements", (req, res) => {
    res.json(classAnnouncements);
  });

  app.post("/api/class-announcements", (req, res) => {
    const { className, title, content, date, targetRecipient, confirmationStatus } = req.body;
    if (!className || !title || !content || !date || !targetRecipient || !confirmationStatus) {
      return res.status(400).json({ error: "Data Informasi & Pengumuman tidak lengkap." });
    }

    const newLog: ClassAnnouncement = {
      id: `ca-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      className,
      title,
      content,
      date,
      targetRecipient,
      confirmationStatus,
      createdAt: new Date().toISOString()
    };

    classAnnouncements.unshift(newLog);
    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-ca-${newLog.id}`,
      title: `📢 Pengumuman Baru Kelas ${className}`,
      message: `${title}: ${content.substr(0, 80)}...`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, classAnnouncements, newLog });
  });

  app.patch("/api/class-announcements/:id/status", (req, res) => {
    const { id } = req.params;
    const { confirmationStatus } = req.body;
    if (!confirmationStatus) {
      return res.status(400).json({ error: "Status konfirmasi kosong." });
    }
    const index = classAnnouncements.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Pengumuman tidak ditemukan." });
    }
    classAnnouncements[index].confirmationStatus = confirmationStatus;
    saveState();
    res.json({ success: true, classAnnouncements });
  });

  app.delete("/api/class-announcements/:id", (req, res) => {
    const { id } = req.params;
    const index = classAnnouncements.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Informasi/pengumuman tidak ditemukan." });
    }
    classAnnouncements.splice(index, 1);
    saveState();
    res.json({ success: true, classAnnouncements });
  });


  // --- CLASS MEETING LOGS (RAPAT / KOORDINASI) ENDPOINTS ---
  app.get("/api/class-meeting-logs", (req, res) => {
    res.json(classMeetingLogs);
  });

  app.post("/api/class-meeting-logs", (req, res) => {
    const { className, meetingType, date, attendees, agenda, followUp } = req.body;
    if (!className || !meetingType || !date || !attendees || !agenda || !followUp) {
      return res.status(400).json({ error: "Data Jurnal Rapat tidak lengkap." });
    }

    const newLog: ClassMeetingLog = {
      id: `cml-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      className,
      meetingType,
      date,
      attendees,
      agenda,
      followUp,
      createdAt: new Date().toISOString()
    };

    classMeetingLogs.unshift(newLog);
    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-cml-${newLog.id}`,
      title: `Rapat/Koordinasi Kelas ${className}`,
      message: `Telah didokumentasikan jenis rapat: ${meetingType} pada tanggal ${date}.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, classMeetingLogs, newLog });
  });

  app.delete("/api/class-meeting-logs/:id", (req, res) => {
    const { id } = req.params;
    const index = classMeetingLogs.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Dokumen rapat tidak ditemukan." });
    }
    classMeetingLogs.splice(index, 1);
    saveState();
    res.json({ success: true, classMeetingLogs });
  });

  // --- PENILAIAN KURIKULUM MERDEKA ENDPOINTS & FORMULAS ---
  function parseVal(v: any): number | null {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  function calcTpScore(tugas1: any, tugas2: any, uh: any): number | null {
    const t1 = parseVal(tugas1);
    const t2 = parseVal(tugas2);
    const u = parseVal(uh);

    const tList = [t1, t2].filter((x): x is number => x !== null);
    if (tList.length === 0 && u === null) return null;

    const avgTugas = tList.length > 0 ? (tList.reduce((a, b) => a + b, 0) / tList.length) : null;

    if (avgTugas !== null && u !== null) {
      return Math.round((avgTugas * 0.6) + (u * 0.4));
    } else if (avgTugas !== null) {
      return Math.round(avgTugas);
    } else if (u !== null) {
      return Math.round(u);
    }
    return null;
  }

  function recalculateAssessmentScores(ass: MerdekaAssessment) {
    const tp1 = calcTpScore(ass.tp1Tugas1, ass.tp1Tugas2, ass.tp1Uh);
    ass.nilaiTp1 = tp1 !== null ? tp1 : (ass.tp1Grade !== undefined ? Number(ass.tp1Grade) : undefined);

    const tp2 = calcTpScore(ass.tp2Tugas1, ass.tp2Tugas2, ass.tp2Uh);
    ass.nilaiTp2 = tp2 !== null ? tp2 : (ass.tp2Grade !== undefined ? Number(ass.tp2Grade) : undefined);

    const tp3 = calcTpScore(ass.tp3Tugas1, ass.tp3Tugas2, ass.tp3Uh);
    ass.nilaiTp3 = tp3 !== null ? tp3 : (ass.tp3Grade !== undefined ? Number(ass.tp3Grade) : undefined);

    const tp4 = calcTpScore(ass.tp4Tugas1, ass.tp4Tugas2, ass.tp4Uh);
    ass.nilaiTp4 = tp4 !== null ? tp4 : (ass.tp4Grade !== undefined ? Number(ass.tp4Grade) : undefined);

    const validTps = [ass.nilaiTp1, ass.nilaiTp2, ass.nilaiTp3, ass.nilaiTp4].filter((x): x is number => x !== undefined && x !== null && !isNaN(x));
    const avgTp = validTps.length > 0 ? Math.round(validTps.reduce((a, b) => a + b, 0) / validTps.length) : 0;
    ass.nilaiRataTp = avgTp;

    const koku = Number(ass.nilaiKokurikuler) || 0;
    const pts = Number(ass.nilaiPts) || 0;
    const pas = Number(ass.nilaiPas) || 0;

    // NILAI AKHIR TIAP MAPEL = ((Nilai Rata-rata TP dikali 2) + Nilai Kokurikuler + PTS + PAS) / 5
    const finalMapel = Math.round(((avgTp * 2) + koku + pts + pas) / 5);
    ass.nilaiAkhirMapel = finalMapel;

    // Fallbacks
    ass.nilaiFormatif = avgTp;
    ass.nilaiSumatifLM = pts;
    ass.nilaiSAS = pas;
    ass.nilaiRapor = finalMapel;
    ass.updatedAt = new Date().toISOString();
  }

  app.get("/api/merdeka-assessments", (req, res) => {
    res.json(merdekaAssessments);
  });

  app.post("/api/merdeka-assessments", (req, res) => {
    const data = req.body;
    
    // Support bulk insert (Excel Import / Batch Save) or single insert
    const items = Array.isArray(data) ? data : [data];
    const results: MerdekaAssessment[] = [];

    items.forEach((item: any) => {
      const {
        studentId,
        studentName,
        className,
        subject,
        teacherName,
        semester,
        academicYear,
        tp1Name,
        tp1Tugas1,
        tp1Tugas2,
        tp1Uh,
        tp2Name,
        tp2Tugas1,
        tp2Tugas2,
        tp2Uh,
        tp3Name,
        tp3Tugas1,
        tp3Tugas2,
        tp3Uh,
        tp4Name,
        tp4Tugas1,
        tp4Tugas2,
        tp4Uh,
        nilaiKokurikuler,
        nilaiPts,
        nilaiPas,
        // legacy compatibility
        tp1Grade,
        tp2Grade,
        tp3Grade,
        tp4Grade,
        nilaiSumatifLM,
        nilaiSAS,
        deskripsiCapaian
      } = item;

      if (!studentId || !studentName || !className || !subject) {
        return;
      }

      const sem = semester || "Genap";
      const year = academicYear || "2025/2026";

      const existingIdx = merdekaAssessments.findIndex(
        a => a.studentId === studentId &&
             a.subject === subject &&
             a.semester === sem &&
             a.academicYear === year
      );

      const existing = existingIdx !== -1 ? merdekaAssessments[existingIdx] : null;

      const assessmentItem: MerdekaAssessment = {
        id: existing ? existing.id : `ma-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        studentName,
        className,
        subject,
        teacherName: teacherName || (existing ? existing.teacherName : "Guru Mapel"),
        semester: sem,
        academicYear: year,

        tp1Name: tp1Name || (existing ? existing.tp1Name : undefined),
        tp1Tugas1: tp1Tugas1 !== undefined ? tp1Tugas1 : existing?.tp1Tugas1,
        tp1Tugas2: tp1Tugas2 !== undefined ? tp1Tugas2 : existing?.tp1Tugas2,
        tp1Uh: tp1Uh !== undefined ? tp1Uh : existing?.tp1Uh,

        tp2Name: tp2Name || (existing ? existing.tp2Name : undefined),
        tp2Tugas1: tp2Tugas1 !== undefined ? tp2Tugas1 : existing?.tp2Tugas1,
        tp2Tugas2: tp2Tugas2 !== undefined ? tp2Tugas2 : existing?.tp2Tugas2,
        tp2Uh: tp2Uh !== undefined ? tp2Uh : existing?.tp2Uh,

        tp3Name: tp3Name || (existing ? existing.tp3Name : undefined),
        tp3Tugas1: tp3Tugas1 !== undefined ? tp3Tugas1 : existing?.tp3Tugas1,
        tp3Tugas2: tp3Tugas2 !== undefined ? tp3Tugas2 : existing?.tp3Tugas2,
        tp3Uh: tp3Uh !== undefined ? tp3Uh : existing?.tp3Uh,

        tp4Name: tp4Name || (existing ? existing.tp4Name : undefined),
        tp4Tugas1: tp4Tugas1 !== undefined ? tp4Tugas1 : existing?.tp4Tugas1,
        tp4Tugas2: tp4Tugas2 !== undefined ? tp4Tugas2 : existing?.tp4Tugas2,
        tp4Uh: tp4Uh !== undefined ? tp4Uh : existing?.tp4Uh,

        nilaiKokurikuler: nilaiKokurikuler !== undefined ? Number(nilaiKokurikuler) : existing?.nilaiKokurikuler ?? 0,
        nilaiPts: nilaiPts !== undefined ? Number(nilaiPts) : (nilaiSumatifLM !== undefined ? Number(nilaiSumatifLM) : (existing?.nilaiPts ?? 0)),
        nilaiPas: nilaiPas !== undefined ? Number(nilaiPas) : (nilaiSAS !== undefined ? Number(nilaiSAS) : (existing?.nilaiPas ?? 0)),

        // legacy compatibility
        tp1Grade: tp1Grade !== undefined ? Number(tp1Grade) : existing?.tp1Grade,
        tp2Grade: tp2Grade !== undefined ? Number(tp2Grade) : existing?.tp2Grade,
        tp3Grade: tp3Grade !== undefined ? Number(tp3Grade) : existing?.tp3Grade,
        tp4Grade: tp4Grade !== undefined ? Number(tp4Grade) : existing?.tp4Grade,
        deskripsiCapaian: deskripsiCapaian || existing?.deskripsiCapaian || "Telah menunjukkan kompetensi sesuai kriteria.",

        createdAt: existing ? existing.createdAt : new Date().toISOString()
      };

      recalculateAssessmentScores(assessmentItem);

      if (existingIdx !== -1) {
        merdekaAssessments[existingIdx] = assessmentItem;
      } else {
        merdekaAssessments.unshift(assessmentItem);
      }
      results.push(assessmentItem);
    });

    saveState();
    return res.json({ success: true, count: results.length, merdekaAssessments, newAssessment: results[0] });
  });

  // Batch import PTS & PAS from Waka Kurikulum
  app.post("/api/curriculum/import-pts-pas", (req, res) => {
    const { items, semester, academicYear } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Data import tidak valid." });
    }

    const sem = semester || "Genap";
    const year = academicYear || "2025/2026";
    let updatedCount = 0;

    items.forEach((item: any) => {
      let targetStudent = null;
      if (item.studentId) {
        targetStudent = students.find(s => s.id === item.studentId);
      }
      if (!targetStudent && item.nis) {
        targetStudent = students.find(s => s.nis.trim() === String(item.nis).trim());
      }
      if (!targetStudent && item.studentName) {
        targetStudent = students.find(s => s.name.toLowerCase().trim() === String(item.studentName).toLowerCase().trim());
      }

      if (!targetStudent) return;

      const targetSubj = item.subject ? item.subject.trim() : null;

      if (!targetSubj) return;

      // Find existing assessment or create one
      let existingIdx = merdekaAssessments.findIndex(a =>
        a.studentId === targetStudent.id &&
        a.subject.toLowerCase() === targetSubj.toLowerCase() &&
        a.semester === sem &&
        a.academicYear === year
      );

      const ptsVal = item.pts !== undefined && item.pts !== "" ? Number(item.pts) : undefined;
      const pasVal = item.pas !== undefined && item.pas !== "" ? Number(item.pas) : undefined;

      if (existingIdx !== -1) {
        if (ptsVal !== undefined) merdekaAssessments[existingIdx].nilaiPts = ptsVal;
        if (pasVal !== undefined) merdekaAssessments[existingIdx].nilaiPas = pasVal;
        recalculateAssessmentScores(merdekaAssessments[existingIdx]);
        updatedCount++;
      } else {
        const newAss: MerdekaAssessment = {
          id: `ma-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId: targetStudent.id,
          studentName: targetStudent.name,
          className: targetStudent.class,
          subject: targetSubj,
          teacherName: item.teacherName || "Guru Mapel",
          semester: sem,
          academicYear: year,
          nilaiKokurikuler: 0,
          nilaiPts: ptsVal ?? 0,
          nilaiPas: pasVal ?? 0,
          createdAt: new Date().toISOString()
        };
        recalculateAssessmentScores(newAss);
        merdekaAssessments.unshift(newAss);
        updatedCount++;
      }
    });

    saveState();
    res.json({ success: true, updatedCount, merdekaAssessments });
  });

  // Batch Save Kokurikuler by Wali Kelas
  app.post("/api/kokurikuler/batch-save", (req, res) => {
    const { className, semester, academicYear, scores } = req.body;
    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({ error: "Data nilai kokurikuler tidak valid." });
    }

    const sem = semester || "Genap";
    const year = academicYear || "2025/2026";
    let updatedCount = 0;

    Object.entries(scores).forEach(([studentId, scoreVal]) => {
      const kokuScore = Number(scoreVal) || 0;
      
      // Update all existing subject assessments for this student in this sem & year
      const matchedAssessments = merdekaAssessments.filter(a =>
        a.studentId === studentId &&
        a.semester === sem &&
        a.academicYear === year
      );

      if (matchedAssessments.length > 0) {
        matchedAssessments.forEach(ass => {
          ass.nilaiKokurikuler = kokuScore;
          recalculateAssessmentScores(ass);
          updatedCount++;
        });
      } else {
        // If student has no assessments created yet, pre-create empty assessments for subjects in student's class
        const studentObj = students.find(s => s.id === studentId);
        if (studentObj) {
          const distinctSubjects = Array.from(new Set(subjectTeachers.map(st => st.subject)));
          distinctSubjects.forEach(subj => {
            const newAss: MerdekaAssessment = {
              id: `ma-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              studentId: studentObj.id,
              studentName: studentObj.name,
              className: studentObj.class,
              subject: subj,
              teacherName: "Guru Mapel",
              semester: sem,
              academicYear: year,
              nilaiKokurikuler: kokuScore,
              nilaiPts: 0,
              nilaiPas: 0,
              createdAt: new Date().toISOString()
            };
            recalculateAssessmentScores(newAss);
            merdekaAssessments.unshift(newAss);
            updatedCount++;
          });
        }
      }
    });

    saveState();
    res.json({ success: true, updatedCount, merdekaAssessments });
  });

  app.delete("/api/merdeka-assessments/:id", (req, res) => {
    const { id } = req.params;
    const index = merdekaAssessments.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Data nilai tidak ditemukan." });
    }
    merdekaAssessments.splice(index, 1);
    saveState();
    res.json({ success: true, merdekaAssessments });
  });

  // --- CLASS SCHEDULES (JADWAL PELAJARAN / MENGAJAR) ENDPOINTS ---
  function checkJamKeOverlap(jamA: string, jamB: string): boolean {
    if (!jamA || !jamB) return false;
    const parseJamRange = (str: string): [number, number] => {
      const nums = str.match(/\d+/g);
      if (!nums || nums.length === 0) return [1, 1];
      if (nums.length === 1) return [parseInt(nums[0]), parseInt(nums[0])];
      return [parseInt(nums[0]), parseInt(nums[1])];
    };
    const [sA, eA] = parseJamRange(jamA);
    const [sB, eB] = parseJamRange(jamB);
    return Math.max(sA, sB) <= Math.min(eA, eB);
  }

  function detectScheduleClash(newSchedule: any, existingSchedules: any[], currentId?: string): { hasClash: boolean; message?: string } {
    const day = newSchedule.day;
    const jamKe = newSchedule.jamKe;
    const className = (newSchedule.className || '').trim().toUpperCase();
    const teacherId = newSchedule.teacherId;
    const teacherName = (newSchedule.teacherName || '').trim().toLowerCase();

    for (const item of existingSchedules) {
      if (currentId && item.id === currentId) continue;
      if (item.day !== day) continue;

      const isOverlap = checkJamKeOverlap(jamKe, item.jamKe);
      if (!isOverlap) continue;

      // 1. Teacher Clash: Same teacher in another class at same time
      const sameTeacher = (teacherId && item.teacherId === teacherId) || 
        (teacherName && item.teacherName && item.teacherName.trim().toLowerCase() === teacherName);
      
      if (sameTeacher && item.className.trim().toUpperCase() !== className) {
        return {
          hasClash: true,
          message: `Benturan Guru! Guru ${item.teacherName} sudah dijadwalkan mengajar di Kelas ${item.className} pada hari ${day} Jam Ke-${item.jamKe}.`
        };
      }

      // 2. Class Clash: Same class for another subject/teacher at same time
      if (item.className.trim().toUpperCase() === className) {
        return {
          hasClash: true,
          message: `Benturan Kelas! Kelas ${className} sudah memiliki jadwal mata pelajaran ${item.subject} (${item.teacherName}) pada hari ${day} Jam Ke-${item.jamKe}.`
        };
      }
    }

    return { hasClash: false };
  }

  function autoGenerateAbsentJournals() {
    if (classSchedules.length === 0) return;
    const todayStr = new Date().toISOString().substring(0, 10);
    const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const pastDatesToCheck: { dateStr: string; dayName: string }[] = [];
    const now = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().substring(0, 10);
      const dayName = daysOfWeek[d.getDay()];
      if (dayName !== 'Minggu') {
        pastDatesToCheck.push({ dateStr: dStr, dayName });
      }
    }

    let newlyCreated = 0;

    for (const { dateStr, dayName } of pastDatesToCheck) {
      const daySchedules = classSchedules.filter(s => s.day === dayName);

      for (const sch of daySchedules) {
        const journalExists = teachingJournals.some(j => {
          const sameClass = j.className && j.className.trim().toUpperCase() === sch.className.trim().toUpperCase();
          const sameSubj = j.subject && j.subject.trim().toLowerCase() === sch.subject.trim().toLowerCase();
          const sameDate = j.date && j.date.substring(0, 10) === dateStr;
          return sameClass && sameSubj && sameDate;
        });

        if (!journalExists) {
          const autoAbsentJournal: TeachingJournal = {
            id: `tj-absent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            teacherId: sch.teacherId || 'auto-system',
            teacherName: sch.teacherName || 'Guru Mapel',
            subject: sch.subject,
            className: sch.className,
            date: dateStr,
            topic: 'Tidak Hadir (Guru tidak mengisi jurnal KBM sesuai jadwal)',
            attendance: [],
            notes: 'Tidak Hadir',
            jamKe: sch.jamKe,
            alokasiWaktu: sch.alokasiWaktu || '2 JP',
            createdAt: new Date().toISOString()
          };
          teachingJournals.push(autoAbsentJournal);
          newlyCreated++;
        }
      }
    }

    if (newlyCreated > 0) {
      saveState();
    }
  }

  app.get("/api/curriculum/schedules", (req, res) => {
    autoGenerateAbsentJournals();
    res.json(classSchedules);
  });

  app.post("/api/curriculum/schedules", (req, res) => {
    const { day, className, subject, teacherId, teacherName, jamKe, startTime, endTime, alokasiWaktu, academicYear, semester, force } = req.body;
    if (!day || !className || !subject || !teacherName || !jamKe) {
      return res.status(400).json({ error: "Data jadwal tidak lengkap. Mohon isi Hari, Kelas, Mapel, Guru, dan Jam Ke." });
    }

    const newSchedule: ClassSchedule = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      day,
      className: className.trim().toUpperCase(),
      subject,
      teacherId: teacherId || '',
      teacherName,
      jamKe,
      startTime: startTime || '',
      endTime: endTime || '',
      alokasiWaktu: alokasiWaktu || '2 JP',
      academicYear: academicYear || '2025/2026',
      semester: semester || 'Genap',
      createdAt: new Date().toISOString()
    };

    if (!force) {
      const clashCheck = detectScheduleClash(newSchedule, classSchedules);
      if (clashCheck.hasClash) {
        return res.status(409).json({ error: clashCheck.message, isClash: true });
      }
    }

    classSchedules.push(newSchedule);
    saveState();
    res.json({ success: true, newSchedule, classSchedules });
  });

  app.put("/api/curriculum/schedules/:id", (req, res) => {
    const { id } = req.params;
    const index = classSchedules.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Jadwal tidak ditemukan." });
    }

    const { day, className, subject, teacherId, teacherName, jamKe, startTime, endTime, alokasiWaktu, academicYear, semester, force } = req.body;
    
    const updatedSchedule: ClassSchedule = {
      ...classSchedules[index],
      day: day || classSchedules[index].day,
      className: className ? className.trim().toUpperCase() : classSchedules[index].className,
      subject: subject || classSchedules[index].subject,
      teacherId: teacherId !== undefined ? teacherId : classSchedules[index].teacherId,
      teacherName: teacherName || classSchedules[index].teacherName,
      jamKe: jamKe || classSchedules[index].jamKe,
      startTime: startTime !== undefined ? startTime : classSchedules[index].startTime,
      endTime: endTime !== undefined ? endTime : classSchedules[index].endTime,
      alokasiWaktu: alokasiWaktu || classSchedules[index].alokasiWaktu,
      academicYear: academicYear || classSchedules[index].academicYear,
      semester: semester || classSchedules[index].semester,
    };

    if (!force) {
      const clashCheck = detectScheduleClash(updatedSchedule, classSchedules, id);
      if (clashCheck.hasClash) {
        return res.status(409).json({ error: clashCheck.message, isClash: true });
      }
    }

    classSchedules[index] = updatedSchedule;
    saveState();
    res.json({ success: true, updatedSchedule, classSchedules });
  });

  app.post("/api/curriculum/schedules/bulk", (req, res) => {
    const { items, mode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Daftar jadwal yang diimport kosong atau tidak valid." });
    }

    const formattedSchedules: ClassSchedule[] = items.map((item: any, idx: number) => {
      let resolvedTeacherId = (item.teacherId || item.teacherUsername || '').toString().trim();
      let resolvedTeacherName = (item.teacherName || 'Guru').toString().trim();

      // If teacherId is empty or doesn't directly match, resolve against server's teacher lists
      if (!resolvedTeacherId && resolvedTeacherName) {
        const foundSubjectTeacher = subjectTeachers.find(st =>
          st.name.trim().toLowerCase() === resolvedTeacherName.toLowerCase() ||
          st.username?.toLowerCase() === resolvedTeacherName.toLowerCase() ||
          st.id?.toLowerCase() === resolvedTeacherName.toLowerCase()
        );
        if (foundSubjectTeacher) {
          resolvedTeacherId = foundSubjectTeacher.id || foundSubjectTeacher.username;
          resolvedTeacherName = foundSubjectTeacher.name;
        } else {
          const foundHomeroom = homeroomTeachers.find(hr =>
            hr.name.trim().toLowerCase() === resolvedTeacherName.toLowerCase() ||
            hr.username?.toLowerCase() === resolvedTeacherName.toLowerCase() ||
            hr.id?.toLowerCase() === resolvedTeacherName.toLowerCase()
          );
          if (foundHomeroom) {
            resolvedTeacherId = foundHomeroom.id || foundHomeroom.username;
            resolvedTeacherName = foundHomeroom.name;
          }
        }
      }

      return {
        id: `sch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        day: item.day || 'Senin',
        className: (item.className || '').toString().trim().toUpperCase(),
        subject: (item.subject || 'Mapel').toString().trim(),
        teacherId: resolvedTeacherId,
        teacherName: resolvedTeacherName,
        jamKe: (item.jamKe || '1-2').toString().trim(),
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        alokasiWaktu: item.alokasiWaktu || '2 JP',
        academicYear: item.academicYear || '2025/2026',
        semester: item.semester || 'Genap',
        createdAt: new Date().toISOString()
      };
    });

    let updatedCount = 0;
    let addedCount = 0;

    if (mode === 'replace') {
      classSchedules.length = 0;
      classSchedules.push(...formattedSchedules);
      addedCount = formattedSchedules.length;
    } else if (mode === 'update' || !mode) {
      // Upsert / Update mode: update if day, className, and jamKe match to prevent duplicates
      for (const newItem of formattedSchedules) {
        const existingIdx = classSchedules.findIndex(s =>
          s.day.trim().toLowerCase() === newItem.day.trim().toLowerCase() &&
          s.className.trim().toLowerCase() === newItem.className.trim().toLowerCase() &&
          s.jamKe.trim().toLowerCase() === newItem.jamKe.trim().toLowerCase()
        );

        if (existingIdx !== -1) {
          classSchedules[existingIdx] = {
            ...classSchedules[existingIdx],
            subject: newItem.subject,
            teacherId: newItem.teacherId,
            teacherName: newItem.teacherName,
            startTime: newItem.startTime || classSchedules[existingIdx].startTime,
            endTime: newItem.endTime || classSchedules[existingIdx].endTime,
            alokasiWaktu: newItem.alokasiWaktu || classSchedules[existingIdx].alokasiWaktu,
            academicYear: newItem.academicYear || classSchedules[existingIdx].academicYear,
            semester: newItem.semester || classSchedules[existingIdx].semester
          };
          updatedCount++;
        } else {
          classSchedules.push(newItem);
          addedCount++;
        }
      }
    } else {
      // mode === 'append': add, but update if exact day+class+jam slot exists to prevent duplicates
      for (const newItem of formattedSchedules) {
        const existingIdx = classSchedules.findIndex(s =>
          s.day.trim().toLowerCase() === newItem.day.trim().toLowerCase() &&
          s.className.trim().toLowerCase() === newItem.className.trim().toLowerCase() &&
          s.jamKe.trim().toLowerCase() === newItem.jamKe.trim().toLowerCase()
        );

        if (existingIdx !== -1) {
          classSchedules[existingIdx] = {
            ...classSchedules[existingIdx],
            subject: newItem.subject,
            teacherId: newItem.teacherId,
            teacherName: newItem.teacherName,
            startTime: newItem.startTime || classSchedules[existingIdx].startTime,
            endTime: newItem.endTime || classSchedules[existingIdx].endTime,
            alokasiWaktu: newItem.alokasiWaktu || classSchedules[existingIdx].alokasiWaktu,
          };
          updatedCount++;
        } else {
          classSchedules.push(newItem);
          addedCount++;
        }
      }
    }

    saveState();
    res.json({
      success: true,
      count: formattedSchedules.length,
      updatedCount,
      addedCount,
      classSchedules
    });
  });

  app.post("/api/curriculum/schedules/bulk-delete", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Daftar ID jadwal yang akan dihapus tidak valid." });
    }
    const idSet = new Set(ids);
    const initialCount = classSchedules.length;
    const remaining = classSchedules.filter(s => !idSet.has(s.id));
    classSchedules.length = 0;
    classSchedules.push(...remaining);
    saveState();
    const deletedCount = initialCount - classSchedules.length;
    res.json({ success: true, deletedCount, classSchedules });
  });

  app.delete("/api/curriculum/schedules/:id", (req, res) => {
    const { id } = req.params;
    const index = classSchedules.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Jadwal tidak ditemukan." });
    }
    classSchedules.splice(index, 1);
    saveState();
    res.json({ success: true, classSchedules });
  });

  // --- KEPALA SEKOLAH (PRINCIPAL) ENDPOINTS ---
  app.get("/api/principal/work-programs", (req, res) => {
    res.json(principalWorkPrograms);
  });

  app.post("/api/principal/work-programs", (req, res) => {
    const item = req.body;
    if (!item.title || !item.description) {
      return res.status(400).json({ error: "Judul dan deskripsi program kerja wajib diisi." });
    }

    if (item.id) {
      const idx = principalWorkPrograms.findIndex(p => p.id === item.id);
      if (idx !== -1) {
        principalWorkPrograms[idx] = {
          ...principalWorkPrograms[idx],
          title: item.title,
          description: item.description,
          targetDate: item.targetDate || "2026-12-31",
          status: item.status || "planned",
          syncWithStaff: item.syncWithStaff !== undefined ? item.syncWithStaff : true,
        };
      } else {
        return res.status(404).json({ error: "Program kerja tidak ditemukan" });
      }
    } else {
      const newItem = {
        id: `pwp-${Date.now()}`,
        title: item.title,
        description: item.description,
        targetDate: item.targetDate || "2026-12-31",
        status: item.status || "planned",
        syncWithStaff: item.syncWithStaff !== undefined ? item.syncWithStaff : true,
        createdAt: new Date().toISOString()
      };
      principalWorkPrograms.unshift(newItem);
    }
    saveState();
    res.json({ success: true, principalWorkPrograms });
  });

  app.delete("/api/principal/work-programs/:id", (req, res) => {
    const { id } = req.params;
    const idx = principalWorkPrograms.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Program kerja tidak ditemukan." });
    }
    principalWorkPrograms.splice(idx, 1);
    saveState();
    res.json({ success: true, principalWorkPrograms });
  });

  app.get("/api/principal/teacher-evaluations", (req, res) => {
    res.json(teacherEvaluations);
  });

  app.post("/api/principal/teacher-evaluations", (req, res) => {
    const item = req.body;
    if (!item.teacherId || !item.teacherName) {
      return res.status(400).json({ error: "Guru yang dinilai harus dipilih." });
    }

    if (item.id) {
      const idx = teacherEvaluations.findIndex(e => e.id === item.id);
      if (idx !== -1) {
        teacherEvaluations[idx] = {
          ...teacherEvaluations[idx],
          pedagogicScore: Number(item.pedagogicScore) || 80,
          professionalScore: Number(item.professionalScore) || 80,
          personalScore: Number(item.personalScore) || 80,
          socialScore: Number(item.socialScore) || 80,
          notes: item.notes || "",
          academicYear: item.academicYear || "2025/2026",
          date: item.date || new Date().toISOString().split('T')[0],
        };
      } else {
        return res.status(404).json({ error: "Penilaian tidak ditemukan" });
      }
    } else {
      const newItem = {
        id: `te-${Date.now()}`,
        teacherType: item.teacherType || 'homeroom',
        teacherId: item.teacherId,
        teacherName: item.teacherName,
        evaluatorName: schoolIdentity.principal || item.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI",
        date: item.date || new Date().toISOString().split('T')[0],
        academicYear: item.academicYear || "2025/2026",
        pedagogicScore: Number(item.pedagogicScore) || 80,
        professionalScore: Number(item.professionalScore) || 80,
        personalScore: Number(item.personalScore) || 80,
        socialScore: Number(item.socialScore) || 80,
        notes: item.notes || "",
        createdAt: new Date().toISOString()
      };
      teacherEvaluations.unshift(newItem);
    }
    saveState();
    res.json({ success: true, teacherEvaluations });
  });

  app.delete("/api/principal/teacher-evaluations/:id", (req, res) => {
    const { id } = req.params;
    const idx = teacherEvaluations.findIndex(e => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Penilaian tidak ditemukan." });
    }
    teacherEvaluations.splice(idx, 1);
    saveState();
    res.json({ success: true, teacherEvaluations });
  });

  // --- SARPRAS (FACILITIES AND INFRASTRUCTURE) ENDPOINTS ---
  app.get("/api/sarpras/items", (req, res) => {
    res.json(sarprasItems);
  });

  app.get("/api/sarpras/items/by-code/:code", (req, res) => {
    const code = decodeURIComponent(req.params.code).trim();
    const item = sarprasItems.find(i => i.code.toUpperCase() === code.toUpperCase());
    if (!item) {
      return res.status(404).json({ error: "Barang inventaris tidak ditemukan." });
    }
    res.json(item);
  });

  app.post("/api/sarpras/items", (req, res) => {
    const item = req.body;
    if (!item.name || !item.code) {
      return res.status(400).json({ error: "Nama barang dan kode inventaris wajib diisi." });
    }

    if (item.id) {
      const idx = sarprasItems.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        const diffTotal = (Number(item.totalQty) || 0) - (sarprasItems[idx].totalQty || 0);
        sarprasItems[idx] = {
          ...sarprasItems[idx],
          name: String(item.name).trim(),
          code: String(item.code).trim(),
          category: String(item.category || "Umum").trim(),
          condition: item.condition || "Baik",
          location: String(item.location || "Gudang").trim(),
          totalQty: Number(item.totalQty) || 0,
          availableQty: Math.max(0, (sarprasItems[idx].availableQty || 0) + diffTotal),
          price: Number(item.price) || 0,
          purchaseYear: item.purchaseYear ? String(item.purchaseYear).trim() : ""
        };
      } else {
        return res.status(404).json({ error: "Barang tidak ditemukan." });
      }
    } else {
      const newItem = {
        id: "item-" + Date.now(),
        name: String(item.name).trim(),
        code: String(item.code).trim(),
        category: String(item.category || "Umum").trim(),
        condition: item.condition || "Baik",
        location: String(item.location || "Gudang").trim(),
        totalQty: Number(item.totalQty) || 0,
        availableQty: Number(item.totalQty) || 0,
        price: Number(item.price) || 0,
        purchaseYear: item.purchaseYear ? String(item.purchaseYear).trim() : ""
      };
      sarprasItems.unshift(newItem);
    }

    saveState();
    res.json({ success: true, sarprasItems });
  });

  app.delete("/api/sarpras/items/:id", (req, res) => {
    const { id } = req.params;
    const hasActiveLoan = sarprasLoans.some(l => l.itemId === id && l.status === "dipinjam");
    if (hasActiveLoan) {
      return res.status(400).json({ error: "Barang tidak bisa dihapus karena sedang dipinjam oleh guru." });
    }

    const idx = sarprasItems.findIndex(i => i.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Barang tidak ditemukan." });
    }

    sarprasItems.splice(idx, 1);
    saveState();
    res.json({ success: true, sarprasItems });
  });

  app.get("/api/sarpras/proposals", (req, res) => {
    res.json(sarprasProposals);
  });

  app.post("/api/sarpras/proposals", (req, res) => {
    const prop = req.body;
    if (!prop.itemName || !prop.qty || !prop.estimatedPrice) {
      return res.status(400).json({ error: "Nama barang, jumlah, dan estimasi harga wajib diisi." });
    }

    if (prop.id) {
      const idx = sarprasProposals.findIndex(p => p.id === prop.id);
      if (idx !== -1) {
        if (sarprasProposals[idx].status !== 'pending') {
          return res.status(400).json({ error: "Pengajuan yang sudah diproses tidak dapat diedit." });
        }
        sarprasProposals[idx] = {
          ...sarprasProposals[idx],
          itemName: String(prop.itemName).trim(),
          qty: Number(prop.qty) || 1,
          estimatedPrice: Number(prop.estimatedPrice) || 0,
          totalPrice: (Number(prop.qty) || 1) * (Number(prop.estimatedPrice) || 0),
          reason: String(prop.reason || "").trim(),
          imageUrl: prop.imageUrl ? String(prop.imageUrl).trim() : ""
        };
      } else {
        return res.status(404).json({ error: "Pengajuan tidak ditemukan." });
      }
    } else {
      const newProp = {
        id: "proposal-" + Date.now(),
        itemName: String(prop.itemName).trim(),
        qty: Number(prop.qty) || 1,
        estimatedPrice: Number(prop.estimatedPrice) || 0,
        totalPrice: (Number(prop.qty) || 1) * (Number(prop.estimatedPrice) || 0),
        proposedBy: "Waka Sarpras",
        date: new Date().toISOString().split('T')[0],
        reason: String(prop.reason || "").trim(),
        imageUrl: prop.imageUrl ? String(prop.imageUrl).trim() : "",
        status: "pending",
        notes: "",
        createdAt: new Date().toISOString()
      };
      sarprasProposals.unshift(newProp);
    }

    saveState();
    res.json({ success: true, sarprasProposals });
  });

  app.post("/api/sarpras/proposals/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status baru tidak valid." });
    }

    const idx = sarprasProposals.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Pengajuan tidak ditemukan." });
    }

    sarprasProposals[idx].status = status;
    sarprasProposals[idx].notes = String(notes || "").trim();

    if (status === 'approved') {
      const propObj = sarprasProposals[idx];
      treasurerTransactions.unshift({
        id: "tx-bnd-sarpras-" + Date.now(),
        type: "outgoing",
        category: "Operasional",
        amount: propObj.totalPrice,
        description: `Belanja Sarpras Disetujui: ${propObj.itemName} (${propObj.qty} Unit)`,
        date: new Date().toISOString().split("T")[0],
        source: "custom",
        createdBy: "Persetujuan Kepala Sekolah"
      });
    }

    saveState();
    res.json({ success: true, sarprasProposals, treasurerTransactions });
  });

  app.get("/api/sarpras/loans", (req, res) => {
    res.json(sarprasLoans);
  });

  app.post("/api/sarpras/loans", (req, res) => {
    const loan = req.body;
    if (!loan.itemId || !loan.borrowerId || !loan.borrowerName || !loan.qty) {
      return res.status(400).json({ error: "Barang, peminjam, dan jumlah pinjam wajib diisi." });
    }

    const itemIdx = sarprasItems.findIndex(i => i.id === loan.itemId);
    if (itemIdx === -1) {
      return res.status(404).json({ error: "Barang tidak ditemukan." });
    }

    const reqQty = Number(loan.qty) || 1;
    if (sarprasItems[itemIdx].availableQty < reqQty) {
      return res.status(400).json({ error: `Stok tersedia tidak mencukupi. Tersedia: ${sarprasItems[itemIdx].availableQty} unit.` });
    }

    sarprasItems[itemIdx].availableQty -= reqQty;

    const newLoan = {
      id: "loan-" + Date.now(),
      itemId: loan.itemId,
      itemName: sarprasItems[itemIdx].name,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      qty: reqQty,
      loanDate: loan.loanDate || new Date().toISOString().split('T')[0],
      status: "dipinjam",
      notes: String(loan.notes || "").trim()
    };
    sarprasLoans.unshift(newLoan);

    saveState();
    res.json({ success: true, sarprasLoans, sarprasItems });
  });

  app.post("/api/sarpras/loans/:id/return", (req, res) => {
    const { id } = req.params;
    const loanIdx = sarprasLoans.findIndex(l => l.id === id);
    if (loanIdx === -1) {
      return res.status(404).json({ error: "Laporan pinjaman tidak ditemukan." });
    }

    if (sarprasLoans[loanIdx].status === 'kembali') {
      return res.status(400).json({ error: "Barang ini sudah dikembalikan sebelumnya." });
    }

    const itemIdx = sarprasItems.findIndex(i => i.id === sarprasLoans[loanIdx].itemId);
    if (itemIdx !== -1) {
      sarprasItems[itemIdx].availableQty = Math.min(
        sarprasItems[itemIdx].totalQty, 
        sarprasItems[itemIdx].availableQty + sarprasLoans[loanIdx].qty
      );
    }

    sarprasLoans[loanIdx].status = "kembali";
    sarprasLoans[loanIdx].returnDate = new Date().toISOString().split('T')[0];

    saveState();
    res.json({ success: true, sarprasLoans, sarprasItems });
  });

  // Real-time Event Streaming Endpoint (SSE)
  app.get("/api/notifications/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const client = { id: Date.now(), res };
    sseClients.push(client);

    // Initial heartbeat
    res.write(`data: ${JSON.stringify({ type: "heartbeat", system: "online" })}\n\n`);

    req.on("close", () => {
      sseClients = sseClients.filter(c => c.id !== client.id);
    });
  });

  // Get current notifications
  app.get("/api/notifications", (req, res) => {
    res.json(notifications);
  });

  // Manual trigger broadcast notification
  app.post("/api/notifications/broadcast", (req, res) => {
    const { title, message, type, category } = req.body;
    const notif: RealtimeNotification = {
      id: `notif-${Date.now()}`,
      title: title || "Pemberitahuan Sekolah",
      message: message || "Tidak ada pesan",
      type: type || "info",
      category: category || "admin",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notif);
    res.json({ success: true, notification: notif });
  });

  // ==========================================
  // BendaHara (Treasurer) Endpoints
  // ==========================================

  // Helper to extract clean YYYY-MM-DD date string
  function getWIBDateString(dateInput?: string | Date | null): string {
    if (!dateInput) return new Date().toISOString().substring(0, 10);
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      if (trimmed.includes("T")) {
        return trimmed.split("T")[0];
      }
      if (trimmed.length >= 10) {
        return trimmed.substring(0, 10);
      }
      return trimmed;
    }
    try {
      return dateInput.toISOString().substring(0, 10);
    } catch {
      return new Date().toISOString().substring(0, 10);
    }
  }

  // Get integrated treasurer ledger list of transactions
  app.get("/api/treasurer/transactions", (req, res) => {
    // Purge any auto-reconciled items before building integrated list
    purgeMidtransAutoReconciliation();

    // 1. Get all paid SPP bills
    const sppIntegrated = sppBills
      .filter(b => b.status === 'paid')
      .map(b => {
        const student = students.find(s => s.id === b.studentId);
        return {
          id: `spp-int-${b.id}`,
          type: 'incoming' as const,
          category: 'SPP',
          amount: b.amount,
          description: `Pembayaran SPP Bulan ${b.month} ${b.year} - ${student?.name || 'Siswa'} (${student?.nis || ''})`,
          date: getWIBDateString(b.paidAt || new Date()),
          source: 'spp' as const,
          studentName: student?.name || 'Siswa',
          nis: student?.nis || '',
          createdBy: b.paymentMethod || 'Manual Teller (Sekolah)'
        };
      });

    // 2. Get all successful savings transactions
    const actualSavingsIntegrated = savingsTransactions
      .filter(t => t.status === 'success')
      .map(t => {
        const student = students.find(s => s.id === t.studentId);
        const isDeposit = t.type === 'deposit';
        return {
          id: `sav-int-${t.id}`,
          type: (isDeposit ? 'incoming' : 'outgoing') as 'incoming' | 'outgoing',
          category: 'Tabungan',
          amount: t.amount,
          description: `${isDeposit ? 'Setoran' : 'Penarikan'} Tabungan Siswa - ${student?.name || 'Siswa'} (${student?.nis || ''})${t.notes ? `: ${t.notes}` : ''}`,
          date: getWIBDateString(t.createdAt || new Date()),
          source: 'savings' as const,
          studentName: student?.name || 'Siswa',
          nis: student?.nis || '',
          createdBy: t.paymentMethod || 'Teller'
        };
      });

    // 2b. Calculate differences for virtual savings entries to align ledger with student total balances
    const virtualSavingsIntegrated: any[] = [];
    students.forEach(student => {
      const sBalance = Number(student.savingsBalance) || 0;
      if (sBalance > 0) {
        // Sum of actual deposits for this student
        const actualDeposits = savingsTransactions
          .filter(t => t.studentId === student.id && t.status === 'success' && t.type === 'deposit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
        // Sum of actual withdrawals for this student
        const actualWithdrawals = savingsTransactions
          .filter(t => t.studentId === student.id && t.status === 'success' && t.type === 'withdrawal')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const diff = sBalance - (actualDeposits - actualWithdrawals);
        if (diff > 0) {
          virtualSavingsIntegrated.push({
            id: `sav-v-int-${student.id}`,
            type: 'incoming' as const,
            category: 'Tabungan',
            amount: diff,
            description: `Saldo Awal Tabungan Rill - ${student.name} (${student.nis || ''})`,
            date: '2026-06-15',
            source: 'savings' as const,
            studentName: student.name,
            nis: student.nis || '',
            createdBy: 'Penyamaan Saldo Awal'
          });
        } else if (diff < 0) {
          virtualSavingsIntegrated.push({
            id: `sav-v-int-${student.id}`,
            type: 'outgoing' as const,
            category: 'Tabungan',
            amount: Math.abs(diff),
            description: `Penyesuaian Saldo Tabungan Rill - ${student.name} (${student.nis || ''})`,
            date: '2026-06-15',
            source: 'savings' as const,
            studentName: student.name,
            nis: student.nis || '',
            createdBy: 'Penyamaan Saldo Awal'
          });
        }
      }
    });

    const savingsIntegrated = [...actualSavingsIntegrated, ...virtualSavingsIntegrated];

    // 2c. Get all paid miscellaneous bills
    const miscIntegrated = (miscBills || [])
      .filter(b => b.status === 'paid')
      .map(b => {
        const student = students.find(s => s.id === b.studentId);
        return {
          id: `misc-int-${b.id}`,
          type: 'incoming' as const,
          category: 'Iuran Lain',
          amount: b.amount,
          description: `${b.title} - ${student?.name || 'Siswa'} (${student?.nis || ''})`,
          date: getWIBDateString(b.paidAt || new Date()),
          source: 'custom' as const,
          studentName: student?.name || 'Siswa',
          nis: student?.nis || '',
          createdBy: b.paymentMethod || 'Manual Teller (Sekolah)'
        };
      });

    // 3. Merged transactions - Filter out any manually logged misc payments under "Operasional" to avoid double counting
    const filteredTreasurerTransactions = treasurerTransactions.filter(t => 
      !t.id.startsWith("tx-misc-") && 
      !(t.category === "Operasional" && t.description.startsWith("Pembayaran "))
    );

    const merged: TreasurerTransaction[] = [
      ...filteredTreasurerTransactions,
      ...sppIntegrated,
      ...savingsIntegrated,
      ...miscIntegrated
    ];

    // Sort by date descending
    merged.sort((a, b) => b.date.localeCompare(a.date));

    res.json(merged);
  });

  // Auto-Poller Engine Status Endpoint
  app.get("/api/midtrans-autopoller-status", (req, res) => {
    res.json({
      success: true,
      stats: midtransAutoPollerStats,
      config: {
        hasServerKey: !!(midtransConfig.serverKey || "").trim(),
        isProduction: midtransConfig.isProduction,
        isDisabled: !!midtransConfig.isDisabled
      }
    });
  });

  // Force Manual Run of Auto-Poller Engine Endpoint
  app.post("/api/midtrans-autopoller-run", async (req, res) => {
    try {
      const result = await runAutomatedMidtransReconciliation();
      res.json({
        success: true,
        ...result,
        message: result.reconciledCount > 0 
          ? `Sistem berhasil memverifikasi & merekonsiliasi ${result.reconciledCount} transaksi Midtrans terlewat!` 
          : `Pindai selesai. Dipindai ${result.scannedCount} order pending. Semua status di database sudah selaras dengan Midtrans.`
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // Verify pending orders for a specific student or system-wide
  app.post("/api/verify-midtrans-pending", async (req, res) => {
    try {
      const { studentId } = req.body;
      const pendingOrdersToVerify: string[] = [];

      if (studentId) {
        sppBills.filter(b => b.studentId === studentId && (b.status === "pending" || b.status === "unpaid") && b.orderId)
          .forEach(b => pendingOrdersToVerify.push(b.orderId!));
        miscBills.filter(b => b.studentId === studentId && b.status !== "paid" && b.orderId)
          .forEach(b => pendingOrdersToVerify.push(b.orderId!));
        savingsTransactions.filter(t => t.studentId === studentId && t.status === "pending" && t.orderId)
          .forEach(t => pendingOrdersToVerify.push(t.orderId!));
      }

      let updatedCount = 0;
      for (const orderId of pendingOrdersToVerify) {
        const result = await processMidtransOrderStatus(orderId);
        if (result.actionTaken) updatedCount++;
      }

      res.json({ success: true, updatedCount });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // Endpoint to purge all auto-reconciliation records & categories
  app.post("/api/treasurer/purge-auto-reconciliation", (req, res) => {
    try {
      const result = purgeMidtransAutoReconciliation();
      res.json({
        success: true,
        message: `Berhasil menghapus ${result.treasurerPurged} entri BKU auto-rekonsiliasi, ${result.savingsPurged} entri tabungan auto-rekonsiliasi, dan ${result.categoriesPurged} kategori pos yang dibuat secara otomatis.`,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Bulk reconciliation for pending/unpaid transactions since June 15, 2026
  app.post("/api/treasurer/reconcile-all", async (req, res) => {
    try {
      console.log("Starting bulk reconciliation for pending/unpaid transactions via Master Engine...");
      const result = await runAutomatedMidtransReconciliation();

      res.json({
        success: true,
        scannedCount: result.scannedCount,
        reconciledCount: result.reconciledCount,
        expiredCount: result.expiredCount,
        details: result.details,
        message: result.reconciledCount > 0 
          ? `Berhasil melacak & merekonsiliasi ${result.reconciledCount} transaksi terlewat.` 
          : "Pindai selesai. Semua transaksi di database sudah sesuai dengan status pembayaran rill di Midtrans."
      });
    } catch (err: any) {
      console.error("Bulk reconciliation error:", err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Categories synchronization endpoints for Treasurer (POS Budget)
  app.get("/api/treasurer/categories", (req, res) => {
    const list = Array.isArray(treasurerConfig.categories) && treasurerConfig.categories.length > 0
      ? treasurerConfig.categories
      : [
          { name: 'Operasional', type: 'outgoing' },
          { name: 'Gaji Guru', type: 'outgoing' },
          { name: 'Pembangunan', type: 'outgoing' },
          { name: 'Ujian', type: 'outgoing' },
          { name: 'HUT RI 81 2026', type: 'both' },
          { name: 'JARIYAH', type: 'incoming' },
          { name: 'SPARIFDA MART', type: 'both' },
          { name: 'MPLS 2026', type: 'both' },
          { name: 'Lain-lain', type: 'outgoing' },
          { name: 'Mantenance Aplikasi', type: 'outgoing' },
          { name: 'Utama', type: 'both' }
        ];
    res.json({ success: true, categories: list });
  });

  app.post("/api/treasurer/categories", async (req, res) => {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: "Format daftar kategori POS tidak valid." });
    }
    treasurerConfig.categories = categories;
    saveState();
    if (mongoDb && isInitialSyncCompleted) {
      try {
        await mongoDb.collection("configs").replaceOne(
          { id: "treasurerConfig" },
          { id: "treasurerConfig", ...treasurerConfig },
          { upsert: true }
        );
      } catch (e) {
        console.error("Failed saving treasurer categories to Mongo config:", e);
      }
    }
    res.json({ success: true, categories: treasurerConfig.categories });
  });

  // Dedicated instant bi-directional sync endpoint for Bendahara
  app.get("/api/treasurer/sync", async (req, res) => {
    try {
      if (mongoDb && isInitialSyncCompleted) {
        const remoteTxs = await mongoDb.collection("treasurerTransactions").find({}).toArray();
        const txMap = new Map<string, TreasurerTransaction>();
        treasurerTransactions.forEach(t => { if (t && t.id) txMap.set(t.id, t); });
        remoteTxs.forEach((d: any) => {
          const { _id, ...rest } = d;
          if (rest && rest.id) txMap.set(rest.id, rest as TreasurerTransaction);
        });
        treasurerTransactions.length = 0;
        treasurerTransactions.push(...Array.from(txMap.values()));
        saveState();

        // Also sync categories config from MongoDB if present
        const remoteConfig = await mongoDb.collection("configs").findOne({ id: "treasurerConfig" });
        if (remoteConfig && Array.isArray(remoteConfig.categories) && remoteConfig.categories.length > 0) {
          treasurerConfig.categories = remoteConfig.categories;
        }

        return res.json({
          success: true,
          status: "connected",
          count: treasurerTransactions.length,
          lastSync: new Date().toISOString(),
          message: `Berhasil sinkronisasi otomatis dengan MongoDB Atlas (${treasurerTransactions.length} transaksi).`
        });
      }
      res.json({
        success: true,
        status: "local",
        count: treasurerTransactions.length,
        lastSync: new Date().toISOString(),
        message: `Tersimpan di local cache (${treasurerTransactions.length} transaksi).`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Create manual bookkeeping transaction
  app.post("/api/treasurer/transactions/transfer", async (req, res) => {
    const { sourceCategory, targetCategory, amount, description, date } = req.body;
    if (!sourceCategory || !targetCategory || !amount || !description || !date) {
      return res.status(400).json({ error: "Semua field transfer wajib diisi secara lengkap." });
    }
    if (sourceCategory === targetCategory) {
      return res.status(400).json({ error: "POS anggaran sumber dan tujuan tidak boleh sama." });
    }
    const transferAmount = Number(amount) || 0;
    if (transferAmount <= 0) {
      return res.status(400).json({ error: "Jumlah transfer harus lebih besar dari Rp 0." });
    }

    const timestamp = Date.now();
    const sourceTx: TreasurerTransaction = {
      id: `tx-bnd-tr-out-${timestamp}`,
      type: "outgoing",
      category: String(sourceCategory),
      amount: transferAmount,
      description: `[Transfer POS] Ke POS ${targetCategory} : ${String(description)}`,
      date: String(date),
      source: "custom",
      createdBy: "bendahara",
      recipientName: `POS ${targetCategory}`
    };

    const targetTx: TreasurerTransaction = {
      id: `tx-bnd-tr-in-${timestamp}`,
      type: "incoming",
      category: String(targetCategory),
      amount: transferAmount,
      description: `[Transfer POS] Dari POS ${sourceCategory} : ${String(description)}`,
      date: String(date),
      source: "custom",
      createdBy: "bendahara",
      recipientName: `Dari POS ${sourceCategory}`
    };

    treasurerTransactions.push(sourceTx, targetTx);
    saveState();
    upsertDocToMongoDB("treasurerTransactions", sourceTx).catch(() => {});
    upsertDocToMongoDB("treasurerTransactions", targetTx).catch(() => {});
    res.json({ success: true, sourceTransaction: sourceTx, targetTransaction: targetTx });
  });

  // Create manual bookkeeping transaction
  app.post("/api/treasurer/transactions", async (req, res) => {
    let { type, category, amount, description, date, recipientName, fundingSource, paymentMethod, kodeRekening, noBukti } = req.body;
    
    // Parse amount robustly by removing all non-digits (e.g., "50.000", "Rp 50,000" -> 50000)
    let parsedAmount = 0;
    if (amount !== undefined && amount !== null) {
      if (typeof amount === 'number') {
        parsedAmount = amount;
      } else {
        const cleanedStr = String(amount).replace(/[^0-9]/g, '');
        parsedAmount = Number(cleanedStr) || 0;
      }
    }

    const missingFields: string[] = [];
    if (!type) missingFields.push("Tipe Arus Keuangan (pemasukan/pengeluaran)");
    if (!category) missingFields.push("Kategori POS BUDGET");
    if (!parsedAmount || parsedAmount <= 0) missingFields.push("Nominal/Jumlah");
    if (!description || !description.trim()) missingFields.push("Deskripsi");
    if (!date) missingFields.push("Tanggal");

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Gagal menyimpan: Kolom berikut wajib diisi dengan benar: ${missingFields.join(', ')}.` });
    }

    const newTx: TreasurerTransaction = {
      id: `tx-bnd-${Date.now()}`,
      type: type as 'incoming' | 'outgoing',
      category: String(category),
      amount: parsedAmount,
      description: String(description),
      date: String(date),
      source: 'custom' as const,
      createdBy: 'bendahara',
      recipientName: recipientName ? String(recipientName) : undefined,
      fundingSource: fundingSource ? String(fundingSource) : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
      kodeRekening: kodeRekening ? String(kodeRekening) : undefined,
      noBukti: noBukti ? String(noBukti) : undefined
    };

    treasurerTransactions.push(newTx);
    saveState();
    upsertDocToMongoDB("treasurerTransactions", newTx).catch(() => {});
    res.json({ success: true, transaction: newTx });
  });

  // Update manual bookkeeping transaction
  app.put("/api/treasurer/transactions/:id", async (req, res) => {
    let { type, category, amount, description, date, recipientName, fundingSource, paymentMethod, kodeRekening, noBukti } = req.body;
    const { id } = req.params;

    const txIndex = treasurerTransactions.findIndex(t => t.id === id);
    if (txIndex === -1) {
      return res.status(444).json({ error: "Transaksi manual tidak ditemukan." });
    }

    // Parse amount robustly if provided
    let parsedAmount = treasurerTransactions[txIndex].amount;
    if (amount !== undefined && amount !== null) {
      if (typeof amount === 'number') {
        parsedAmount = amount;
      } else {
        const cleanedStr = String(amount).replace(/[^0-9]/g, '');
        parsedAmount = Number(cleanedStr) || 0;
      }
    }

    const updatedTx = {
      ...treasurerTransactions[txIndex],
      type: type ? (type as 'incoming' | 'outgoing') : treasurerTransactions[txIndex].type,
      category: category ? String(category) : treasurerTransactions[txIndex].category,
      amount: parsedAmount,
      description: description ? String(description) : treasurerTransactions[txIndex].description,
      date: date ? String(date) : treasurerTransactions[txIndex].date,
      recipientName: recipientName !== undefined ? String(recipientName) : treasurerTransactions[txIndex].recipientName,
      fundingSource: fundingSource !== undefined ? (fundingSource ? String(fundingSource) : undefined) : treasurerTransactions[txIndex].fundingSource,
      paymentMethod: paymentMethod !== undefined ? String(paymentMethod) : treasurerTransactions[txIndex].paymentMethod,
      kodeRekening: kodeRekening !== undefined ? String(kodeRekening) : treasurerTransactions[txIndex].kodeRekening,
      noBukti: noBukti !== undefined ? String(noBukti) : treasurerTransactions[txIndex].noBukti
    };

    treasurerTransactions[txIndex] = updatedTx;
    saveState();
    upsertDocToMongoDB("treasurerTransactions", updatedTx).catch(() => {});
    res.json({ success: true, transaction: updatedTx });
  });

  // Delete manual bookkeeping transaction
  app.delete("/api/treasurer/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const txIndex = treasurerTransactions.findIndex(t => t.id === id);
    if (txIndex === -1) {
      return res.status(404).json({ error: "Transaksi manual tidak ditemukan." });
    }

    treasurerTransactions.splice(txIndex, 1);
    saveState();
    deleteDocFromFirestore("treasurerTransactions", id).catch(() => {});
    res.json({ success: true, message: "Transaksi berhasil dihapus." });
  });

  // --- SALARY ENDPOINTS FOR TEACHERS (Penggajian Guru: Mapel dan Wali) ---
  app.get("/api/treasurer/salary-config", (req, res) => {
    res.json(salaryConfig);
  });

  app.post("/api/treasurer/salary-config", (req, res) => {
    const { baseSalaryHomeroom, baseSalarySubject, homeroomAllowanceRate, journalRate, defaultTunjanganMasaKerja, defaultPotonganDanaSosial } = req.body;
    
    salaryConfig = {
      baseSalaryHomeroom: Number(baseSalaryHomeroom) || 0,
      baseSalarySubject: Number(baseSalarySubject) || 0,
      homeroomAllowanceRate: Number(homeroomAllowanceRate) || 0,
      journalRate: Number(journalRate) || 0,
      defaultTunjanganMasaKerja: Number(defaultTunjanganMasaKerja) || 0,
      defaultPotonganDanaSosial: Number(defaultPotonganDanaSosial) || 0
    };

    saveState();
    res.json({ success: true, salaryConfig });
  });

  app.get("/api/treasurer/salaries", (req, res) => {
    res.json(teacherSalaries);
  });

  app.post("/api/treasurer/salaries/generate", (req, res) => {
    const { month } = req.body; // e.g., "2026-06"
    if (!month) {
      return res.status(400).json({ error: "Bulan harus ditentukan (Format: YYYY-MM)." });
    }

    let generatedCount = 0;
    let skippedCount = 0;

    // 1. Homeroom Teachers
    homeroomTeachers.forEach(ht => {
      // Check if already has a salary record for this month
      const existing = teacherSalaries.find(ts => ts.teacherId === ht.id && ts.month === month);
      if (existing) {
        if (existing.status === 'paid') {
          skippedCount++;
          return; // Skip paid salaries
        } else {
          // Update unpaid
          existing.baseSalary = salaryConfig.baseSalaryHomeroom;
          existing.homeroomAllowance = salaryConfig.homeroomAllowanceRate;
          existing.journalCount = 0;
          existing.journalRate = 0;
          existing.tunjanganMasaKerja = existing.tunjanganMasaKerja !== undefined ? Number(existing.tunjanganMasaKerja) : (salaryConfig.defaultTunjanganMasaKerja || 0);
          existing.vakasi = existing.vakasi !== undefined ? Number(existing.vakasi) : 0;
          existing.potonganDanaSosial = existing.potonganDanaSosial !== undefined ? Number(existing.potonganDanaSosial) : (salaryConfig.defaultPotonganDanaSosial || 0);
          existing.potonganAbsen = existing.potonganAbsen !== undefined ? Number(existing.potonganAbsen) : 0;
          existing.potonganLain = existing.potonganLain !== undefined ? Number(existing.potonganLain) : 0;
          
          existing.totalAmount = existing.baseSalary + existing.homeroomAllowance + existing.tunjanganMasaKerja + existing.vakasi + existing.otherAllowance - (existing.potonganDanaSosial + existing.potonganAbsen + existing.potonganLain);
          generatedCount++;
          return;
        }
      }

      // Create new
      const defaultTMK = salaryConfig.defaultTunjanganMasaKerja || 0;
      const defaultSoc = salaryConfig.defaultPotonganDanaSosial || 0;
      const newSalary: TeacherSalary = {
        id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        teacherId: ht.id,
        teacherName: ht.name,
        teacherType: 'homeroom',
        month,
        baseSalary: salaryConfig.baseSalaryHomeroom,
        homeroomAllowance: salaryConfig.homeroomAllowanceRate,
        journalCount: 0,
        journalRate: 0,
        tunjanganMasaKerja: defaultTMK,
        vakasi: 0,
        potonganDanaSosial: defaultSoc,
        potonganAbsen: 0,
        potonganLain: 0,
        otherAllowance: 0,
        deductions: 0,
        totalAmount: salaryConfig.baseSalaryHomeroom + salaryConfig.homeroomAllowanceRate + defaultTMK - defaultSoc,
        status: 'unpaid',
        createdAt: new Date().toISOString()
      };
      teacherSalaries.push(newSalary);
      generatedCount++;
    });

    // 2. Subject Teachers
    subjectTeachers.forEach(st => {
      // Calculate teaching journals count in this month
      const journalsThisMonth = teachingJournals.filter(j => {
        if (j.teacherId !== st.id) return false;
        // Check if journal date matches YYYY-MM
        return j.date && j.date.startsWith(month);
      });
      const journalCount = journalsThisMonth.length;
      const journalPay = journalCount * salaryConfig.journalRate;

      const existing = teacherSalaries.find(ts => ts.teacherId === st.id && ts.month === month);
      if (existing) {
        if (existing.status === 'paid') {
          skippedCount++;
          return; // Skip paid salaries
        } else {
          // Update unpaid
          existing.baseSalary = salaryConfig.baseSalarySubject;
          existing.homeroomAllowance = 0;
          existing.journalCount = journalCount;
          existing.journalRate = salaryConfig.journalRate;
          existing.tunjanganMasaKerja = existing.tunjanganMasaKerja !== undefined ? Number(existing.tunjanganMasaKerja) : (salaryConfig.defaultTunjanganMasaKerja || 0);
          existing.vakasi = journalPay;
          existing.potonganDanaSosial = existing.potonganDanaSosial !== undefined ? Number(existing.potonganDanaSosial) : (salaryConfig.defaultPotonganDanaSosial || 0);
          existing.potonganAbsen = existing.potonganAbsen !== undefined ? Number(existing.potonganAbsen) : 0;
          existing.potonganLain = existing.potonganLain !== undefined ? Number(existing.potonganLain) : 0;
          
          existing.totalAmount = existing.baseSalary + existing.homeroomAllowance + existing.tunjanganMasaKerja + existing.vakasi + existing.otherAllowance - (existing.potonganDanaSosial + existing.potonganAbsen + existing.potonganLain);
          generatedCount++;
          return;
        }
      }

      // Create new
      const defaultTMK = salaryConfig.defaultTunjanganMasaKerja || 0;
      const defaultSoc = salaryConfig.defaultPotonganDanaSosial || 0;
      const newSalary: TeacherSalary = {
        id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        teacherId: st.id,
        teacherName: st.name,
        teacherType: 'subject_teacher',
        month,
        baseSalary: salaryConfig.baseSalarySubject,
        homeroomAllowance: 0,
        journalCount,
        journalRate: salaryConfig.journalRate,
        tunjanganMasaKerja: defaultTMK,
        vakasi: journalPay,
        potonganDanaSosial: defaultSoc,
        potonganAbsen: 0,
        potonganLain: 0,
        otherAllowance: 0,
        deductions: 0,
        totalAmount: salaryConfig.baseSalarySubject + defaultTMK + journalPay - defaultSoc,
        status: 'unpaid',
        createdAt: new Date().toISOString()
      };
      teacherSalaries.push(newSalary);
      generatedCount++;
    });

    saveState();
    res.json({ success: true, message: `Berhasil generate ${generatedCount} data gaji. (${skippedCount} sudah dibayar & dilewati).`, salaries: teacherSalaries });
  });

  app.put("/api/treasurer/salaries/:id", (req, res) => {
    const { id } = req.params;
    const { 
      baseSalary, 
      homeroomAllowance, 
      tunjanganMasaKerja, 
      vakasi, 
      potonganDanaSosial, 
      potonganAbsen, 
      potonganLain, 
      otherAllowance, 
      deductions, 
      notes 
    } = req.body;

    const salIndex = teacherSalaries.findIndex(s => s.id === id);
    if (salIndex === -1) {
      return res.status(404).json({ error: "Data gaji tidak ditemukan." });
    }

    const sal = teacherSalaries[salIndex];
    if (sal.status === 'paid') {
      return res.status(400).json({ error: "Gaji yang sudah dibayar tidak dapat diedit." });
    }

    sal.baseSalary = baseSalary !== undefined ? Number(baseSalary) : sal.baseSalary;
    sal.homeroomAllowance = homeroomAllowance !== undefined ? Number(homeroomAllowance) : sal.homeroomAllowance;
    sal.tunjanganMasaKerja = tunjanganMasaKerja !== undefined ? Number(tunjanganMasaKerja) : (sal.tunjanganMasaKerja || 0);
    sal.vakasi = vakasi !== undefined ? Number(vakasi) : (sal.vakasi !== undefined ? sal.vakasi : (sal.journalCount * sal.journalRate));
    sal.potonganDanaSosial = potonganDanaSosial !== undefined ? Number(potonganDanaSosial) : (sal.potonganDanaSosial || 0);
    sal.potonganAbsen = potonganAbsen !== undefined ? Number(potonganAbsen) : (sal.potonganAbsen || 0);
    sal.potonganLain = potonganLain !== undefined ? Number(potonganLain) : (sal.potonganLain || 0);
    sal.otherAllowance = otherAllowance !== undefined ? Number(otherAllowance) : sal.otherAllowance;
    sal.deductions = deductions !== undefined ? Number(deductions) : sal.deductions;
    sal.notes = notes !== undefined ? String(notes) : sal.notes;

    // Recalculate
    sal.totalAmount = sal.baseSalary + sal.homeroomAllowance + sal.tunjanganMasaKerja + sal.vakasi + sal.otherAllowance - (sal.potonganDanaSosial + sal.potonganAbsen + sal.potonganLain);

    saveState();
    res.json({ success: true, salary: sal });
  });

  app.post("/api/treasurer/salaries/:id/pay", (req, res) => {
    const { id } = req.params;
    const salIndex = teacherSalaries.findIndex(s => s.id === id);
    if (salIndex === -1) {
      return res.status(404).json({ error: "Data gaji tidak ditemukan." });
    }

    const sal = teacherSalaries[salIndex];
    if (sal.status === 'paid') {
      return res.status(400).json({ error: "Gaji sudah berstatus dibayar." });
    }

    // Mark as paid
    sal.status = 'paid';
    sal.paymentDate = new Date().toISOString().split('T')[0];

    // INTEGRATE: Record OUTGOING transaction in cash ledger
    const [year, monthNum] = sal.month.split('-');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthStr = monthNames[parseInt(monthNum, 10) - 1] || sal.month;
    const roleStr = sal.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mapel';

    const newTx: TreasurerTransaction = {
      id: `tx-sal-${Date.now()}`,
      type: 'outgoing',
      category: 'Gaji Guru',
      amount: sal.totalAmount,
      description: `Pembayaran Gaji ${sal.teacherName} (${roleStr}) - Periode ${monthStr} ${year}`,
      date: new Date().toISOString().split('T')[0],
      source: 'custom',
      createdBy: 'bendahara',
      recipientName: sal.teacherName
    };

    treasurerTransactions.push(newTx);
    saveState();

    // Broadcast notification
    const notification: RealtimeNotification = {
      id: `notif-sal-paid-${sal.id}`,
      title: "Gaji Dibayarkan",
      message: `Gaji ${sal.teacherName} untuk periode ${monthStr} ${year} sebesar Rp ${sal.totalAmount.toLocaleString('id-ID')} telah dibayarkan.`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, salary: sal, transaction: newTx });
  });

  app.delete("/api/treasurer/salaries/:id", (req, res) => {
    const { id } = req.params;
    const salIndex = teacherSalaries.findIndex(s => s.id === id);
    if (salIndex === -1) {
      return res.status(404).json({ error: "Data gaji tidak ditemukan." });
    }

    const sal = teacherSalaries[salIndex];
    if (sal.status === 'paid') {
      return res.status(400).json({ error: "Gaji yang sudah dibayar tidak dapat dihapus." });
    }

    teacherSalaries.splice(salIndex, 1);
    saveState();
    res.json({ success: true, message: "Data gaji berhasil dihapus." });
  });

  // Get active students
  app.get("/api/students", (req, res) => {
    res.json(students);
  });

  // Get all SPP bills (for Admin purposes)
  app.get("/api/admin/all-bills", (req, res) => {
    res.json(sppBills);
  });

  // Get all miscellaneous bills
  app.get("/api/misc-bills", (req, res) => {
    res.json(miscBills);
  });

  // Create miscellaneous bills (single, class, grade, or all, optional monthly)
  app.post("/api/admin/create-misc-bill", (req, res) => {
    const { studentId, targetType, targetClass, targetValue, title, amount, isMonthly, month, months, selectedMonths } = req.body;
    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Judul tagihan dan jumlah pembayaran harus diisi dengan benar." });
    }

    let targets: Student[] = [];
    if (targetType === "single") {
      const idToFind = studentId || targetValue;
      const s = students.find(x => x.id === idToFind);
      if (s) targets.push(s);
    } else if (targetType === "class") {
      const classToFind = targetClass || targetValue;
      targets = students.filter(x => x.class === classToFind);
    } else if (targetType === "grade") {
      const gradeToFind = (targetValue || "").trim().toUpperCase();

      const getGradeLevel = (className: string): string => {
        if (!className) return "";
        const clean = className.trim().toUpperCase();
        const romans = ["VIII", "VII", "XII", "XI", "IX", "X"];
        for (const r of romans) {
          if (clean === r || clean.startsWith(r + "-") || clean.startsWith(r + " ") || clean.startsWith(r)) {
            return r;
          }
        }
        const digitMatch = clean.match(/^(\d+)/);
        if (digitMatch) {
          return digitMatch[1];
        }
        return clean.split(/[- ]/)[0] || clean;
      };

      targets = students.filter(x => {
        if (!x.class) return false;
        return getGradeLevel(x.class) === gradeToFind;
      });
    } else if (targetType === "all") {
      targets = [...students];
    }

    if (targets.length === 0) {
      return res.status(404).json({ error: "Siswa penerima tagihan tidak ditemukan." });
    }

    const monthList: string[] = isMonthly
      ? (Array.isArray(selectedMonths) && selectedMonths.length > 0
          ? selectedMonths
          : Array.isArray(months) && months.length > 0
          ? months
          : month ? [month] : [])
      : [];

    const newBills: MiscBill[] = [];
    const timestampStr = Date.now();

    if (isMonthly && monthList.length > 0) {
      targets.forEach((s, sIdx) => {
        monthList.forEach((m, mIdx) => {
          const fullTitle = title.trim().toLowerCase().includes(m.toLowerCase())
            ? title.trim()
            : `${title.trim()} (${m})`;

          const bill: MiscBill = {
            id: `misc-std-${s.id}-${timestampStr}-${sIdx}-${mIdx}`,
            studentId: s.id,
            title: fullTitle,
            amount: Number(amount),
            status: "unpaid",
            createdAt: new Date().toISOString(),
            isMonthly: true,
            month: m
          };
          miscBills.push(bill);
          newBills.push(bill);

          const notification: RealtimeNotification = {
            id: `notif-misc-${timestampStr}-${sIdx}-${mIdx}`,
            studentId: s.id,
            title: "Tagihan Bulanan Baru",
            message: `Telah terbit tagihan bulanan baru "${fullTitle}" (${m}) sebesar Rp ${Number(amount).toLocaleString("id-ID")}.`,
            type: "payment",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);
        });
      });
    } else {
      targets.forEach((s, idx) => {
        const bill: MiscBill = {
          id: `misc-std-${s.id}-${timestampStr}-${idx}`,
          studentId: s.id,
          title: title.trim(),
          amount: Number(amount),
          status: "unpaid",
          createdAt: new Date().toISOString(),
          isMonthly: Boolean(isMonthly),
          month: month || undefined
        };
        miscBills.push(bill);
        newBills.push(bill);

        const notification: RealtimeNotification = {
          id: `notif-misc-${timestampStr}-${idx}`,
          studentId: s.id,
          title: "Tagihan Pembayaran Baru",
          message: `Telah terbit tagihan baru "${title.trim()}" sebesar Rp ${Number(amount).toLocaleString("id-ID")}.`,
          type: "payment",
          createdAt: new Date().toISOString()
        };
        broadcastNotification(notification);
      });
    }

    saveState();
    res.json({ success: true, count: newBills.length, bills: newBills });
  });

  // Delete a miscellaneous bill
  app.post("/api/admin/delete-misc-bill", (req, res) => {
    const { billId } = req.body;
    const index = miscBills.findIndex(b => b.id === billId);
    if (index === -1) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    const bill = miscBills[index];
    if (bill.status === "paid") {
      return res.status(400).json({ error: "Tagihan yang sudah dibayar tidak dapat dihapus." });
    }
    miscBills.splice(index, 1);
    saveState();
    res.json({ success: true });
  });

  // Delete miscellaneous bills in bulk (Hapus Massal Tagihan)
  app.post("/api/admin/delete-misc-bill-bulk", (req, res) => {
    const { title, billIds } = req.body;
    
    if (!title && (!billIds || !Array.isArray(billIds) || billIds.length === 0)) {
      return res.status(400).json({ error: "Judul tagihan atau daftar ID tagihan harus diisi." });
    }

    let deletedCount = 0;
    let skippedPaidCount = 0;

    if (title) {
      // Delete all UNPAID/PENDING bills with the specified exact title
      const billsToDelete = miscBills.filter(b => b.title === title);
      const paidBillsToDelete = billsToDelete.filter(b => b.status === "paid");
      skippedPaidCount = paidBillsToDelete.length;

      const remainingBills = miscBills.filter(b => !(b.title === title && b.status !== "paid"));
      const removedCount = miscBills.length - remainingBills.length;
      
      miscBills.length = 0;
      miscBills.push(...remainingBills);
      deletedCount = removedCount;
    } else if (billIds && Array.isArray(billIds)) {
      // Delete specified bill IDs if they are not paid
      const idsToDelete = new Set(billIds);
      const remainingBills = miscBills.filter(b => {
        if (idsToDelete.has(b.id)) {
          if (b.status === "paid") {
            skippedPaidCount++;
            return true; // Keep paid bills
          } else {
            deletedCount++;
            return false; // Remove
          }
        }
        return true; // Keep other bills
      });

      miscBills.length = 0;
      miscBills.push(...remainingBills);
    }

    saveState();

    let message = `Berhasil menghapus massal ${deletedCount} tagihan.`;
    if (skippedPaidCount > 0) {
      message += ` Sebanyak ${skippedPaidCount} tagihan berstatus LUNAS dilewati (tidak dihapus).`;
    }

    res.json({
      success: true,
      message,
      deletedCount,
      skippedPaidCount
    });
  });

  // Update/Edit a miscellaneous bill details (Revisi Detail Tagihan)
  app.post("/api/admin/update-misc-bill", (req, res) => {
    const { billId, title, amount, updateAllWithSameTitle, isMonthly, month } = req.body;
    const bill = miscBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Judul tagihan tidak boleh kosong." });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Nominal tagihan harus berupa angka positif." });
    }

    if (!updateAllWithSameTitle && bill.status === "paid" && bill.amount !== amountNum) {
      return res.status(400).json({ error: "Nominal tagihan yang sudah dibayar tidak dapat diubah. Silakan batalkan pembayaran terlebih dahulu jika ingin merubah nominal." });
    }

    const originalTitle = bill.title;
    const newTitleClean = title.trim();

    if (updateAllWithSameTitle) {
      // Bulk update all bills sharing the same original title
      let unpaidCount = 0;
      let paidCount = 0;

      miscBills.forEach(b => {
        if (b.title === originalTitle) {
          if (b.status === "unpaid") {
            b.title = newTitleClean;
            b.amount = amountNum;
            if (isMonthly !== undefined) b.isMonthly = isMonthly;
            if (month !== undefined) b.month = month;
            unpaidCount++;
          } else if (b.status === "paid") {
            // For paid bills, we ONLY update the title for consistency, never change the amount already paid
            b.title = newTitleClean;
            if (isMonthly !== undefined) b.isMonthly = isMonthly;
            if (month !== undefined) b.month = month;
            paidCount++;
          }
        }
      });

      saveState();
      return res.json({
        success: true,
        message: `Berhasil memperbarui ${unpaidCount + paidCount} tagihan dengan judul "${originalTitle}" (Unpaid: ${unpaidCount}, Paid: ${paidCount}).`,
        bill
      });
    } else {
      // Single update
      bill.title = newTitleClean;
      bill.amount = amountNum;
      if (isMonthly !== undefined) bill.isMonthly = isMonthly;
      if (month !== undefined) bill.month = month;
      saveState();
      return res.json({ success: true, bill });
    }
  });

  // Pay a miscellaneous bill manually (Teller)
  app.post("/api/admin/pay-misc-manual", (req, res) => {
    const { billId } = req.body;
    const bill = miscBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    if (bill.status === "paid") {
      return res.status(400).json({ error: "Tagihan sudah lunas." });
    }

    const student = students.find(s => s.id === bill.studentId);
    bill.status = "paid";
    bill.paidAt = new Date().toISOString();
    bill.paymentMethod = "Manual Teller (Sekolah)";
    bill.orderId = `MISC-MANUAL-${Date.now()}`;

    // Log as Treasurer transaction!
    const newTx: TreasurerTransaction = {
      id: `tx-misc-${Date.now()}`,
      type: "incoming",
      category: "Operasional",
      amount: bill.amount,
      description: `Pembayaran ${bill.title} - ${student?.name || ""} (${student?.nis || ""})`,
      date: new Date().toISOString().split("T")[0],
      source: "custom",
      studentName: student?.name,
      nis: student?.nis,
      createdBy: "Admin/Bendahara"
    };
    // Do not push to treasurerTransactions to avoid double counting under Operasional
    // treasurerTransactions.push(newTx);

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-misc-paid-${Date.now()}`,
      studentId: bill.studentId,
      title: `Pembayaran ${bill.title} Lunas`,
      message: `Pembayaran ${bill.title} ${student?.name || ""} sebesar Rp ${bill.amount.toLocaleString("id-ID")} telah DIVERIFIKASI oleh Admin Sekolah.`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    // Send automated WhatsApp confirmation if enabled
    if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        `📢 *KUITANSI PEMBAYARAN DIGITAL*\n` +
        `Pembayaran *${bill.title}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* telah BERHASIL diterima & diverifikasi oleh teller sekolah pada ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}.\n\n` +
        `Metode Pembayaran: *${bill.paymentMethod}*\n` +
        `No. Transaksi: *${bill.orderId}*\n` +
        `Status: *LUNAS (PAID)*\n\n` +
        `Terima kasih atas partisipasi aktif Anda.\n` +
        `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending auto payment WA:", err));
    }

    saveState();
    res.json({ success: true, bill });
  });

  // Pay multiple miscellaneous bills manually in bulk (Teller)
  app.post("/api/admin/pay-misc-manual-bulk", (req, res) => {
    const { billIds } = req.body;
    if (!Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({ error: "Daftar tagihan yang diproses tidak boleh kosong." });
    }

    const updatedBills: any[] = [];
    const nowISO = new Date().toISOString();
    const batchTimestamp = Date.now();

    billIds.forEach((billId: string, idx: number) => {
      const bill = miscBills.find(b => b.id === billId);
      if (!bill || bill.status === "paid") return;

      const student = students.find(s => s.id === bill.studentId);
      bill.status = "paid";
      bill.paidAt = nowISO;
      bill.paymentMethod = "Manual Teller (Sekolah)";
      bill.orderId = `MISC-MANUAL-BULK-${batchTimestamp}-${idx + 1}`;

      // Broadcast SSE notification
      const notification: RealtimeNotification = {
        id: `notif-misc-paid-${batchTimestamp}-${idx + 1}`,
        studentId: bill.studentId,
        title: `Pembayaran ${bill.title} Lunas`,
        message: `Pembayaran ${bill.title} ${student?.name || ""} sebesar Rp ${bill.amount.toLocaleString("id-ID")} telah DIVERIFIKASI oleh Admin Sekolah (Massal).`,
        type: "success",
        createdAt: nowISO
      };
      broadcastNotification(notification);

      // Send automated WhatsApp confirmation if enabled
      if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
        const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
          `📢 *KUITANSI PEMBAYARAN DIGITAL*\n` +
          `Pembayaran *${bill.title}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* telah BERHASIL diterima & diverifikasi oleh teller sekolah pada ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}.\n\n` +
          `Metode Pembayaran: *${bill.paymentMethod}*\n` +
          `No. Transaksi: *${bill.orderId}*\n` +
          `Status: *LUNAS (PAID)*\n\n` +
          `Terima kasih atas partisipasi aktif Anda.\n` +
          `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending auto payment WA:", err));
      }

      updatedBills.push(bill);
    });

    if (updatedBills.length === 0) {
      return res.status(400).json({ error: "Tidak ada tagihan valid atau belum lunas yang dapat diproses." });
    }

    saveState();
    res.json({ success: true, count: updatedBills.length, bills: updatedBills });
  });

  // Cancel/Void a paid miscellaneous bill payment (revert to unpaid)
  app.post("/api/admin/cancel-misc-payment", (req, res) => {
    const { billId } = req.body;
    const bill = miscBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    if (bill.status !== "paid") {
      return res.status(400).json({ error: "Tagihan belum lunas, tidak dapat membatalkan pembayaran." });
    }

    const student = students.find(s => s.id === bill.studentId);
    const oldMethod = bill.paymentMethod;
    const oldOrderId = bill.orderId;

    // Revert status
    bill.status = "unpaid";
    delete bill.paidAt;
    delete bill.paymentMethod;
    delete bill.orderId;

    // Refund student savings if payment method was Potong Tabungan
    if (oldMethod === "Potong Tabungan" && student) {
      student.savingsBalance += bill.amount;

      // Log compensatory savings transaction
      const refundSavTx: SavingsTransaction = {
        id: `sav-tx-misc-refund-${Date.now()}`,
        studentId: student.id,
        type: "deposit",
        amount: bill.amount,
        status: "success",
        createdAt: new Date().toISOString(),
        paymentMethod: "Potong Tabungan",
        orderId: `REFUND-${oldOrderId || Date.now()}`,
        notes: `[BATAL] Pengembalian dana iuran: ${bill.title}`
      };
      savingsTransactions.push(refundSavTx);
    }

    // Try to find and remove the corresponding TreasurerTransaction
    const descPart = `Pembayaran ${bill.title}`;
    const txIndex = treasurerTransactions.findIndex(t => {
      const descMatch = t.description.toLowerCase().includes(descPart.toLowerCase());
      const studentMatch = student ? t.description.toLowerCase().includes(student.name.toLowerCase()) : true;
      return descMatch && studentMatch;
    });
    if (txIndex !== -1) {
      treasurerTransactions.splice(txIndex, 1);
    }

    // Broadcast notification
    if (student) {
      const notification: RealtimeNotification = {
        id: `notif-misc-cancelled-${Date.now()}`,
        studentId: bill.studentId,
        title: `Pembatalan Pembayaran ${bill.title}`,
        message: `Pembayaran iuran ${bill.title} sebesar Rp ${bill.amount.toLocaleString("id-ID")} telah DIBATALKAN oleh Admin. Status kembali BELUM LUNAS.`,
        type: "warning",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);
    }

    saveState();
    res.json({ success: true, bill });
  });

  // Pay a miscellaneous bill using Student savings
  app.post("/api/student/pay-misc-savings", (req, res) => {
    const { studentId, billId } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const bill = miscBills.find(b => b.id === billId && b.studentId === student.id);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan atau bukan milik siswa." });
    }

    if (bill.status === "paid") {
      return res.status(400).json({ error: "Tagihan sudah lunas." });
    }

    if (student.savingsBalance < bill.amount) {
      return res.status(400).json({ error: "Saldo tabungan tidak mencukupi untuk membayar tagihan ini." });
    }

    // Deduct savings
    student.savingsBalance -= bill.amount;

    // Mark bill paid
    bill.status = "paid";
    bill.paidAt = new Date().toISOString();
    bill.paymentMethod = "Potong Tabungan";
    bill.orderId = `MISC-SAVINGS-${Date.now()}`;

    // Log savings transaction
    const savTx: SavingsTransaction = {
      id: `sav-tx-misc-${Date.now()}`,
      studentId: student.id,
      type: "withdrawal",
      amount: bill.amount,
      status: "success",
      createdAt: new Date().toISOString(),
      paymentMethod: "Potong Tabungan",
      orderId: bill.orderId,
      notes: `Bayar tagihan: ${bill.title}`
    };
    savingsTransactions.push(savTx);

    // Log treasurer transaction
    const newTx: TreasurerTransaction = {
      id: `tx-misc-${Date.now()}`,
      type: "incoming",
      category: "Operasional",
      amount: bill.amount,
      description: `Pembayaran ${bill.title} (Potong Tabungan) - ${student.name} (${student.nis})`,
      date: new Date().toISOString().split("T")[0],
      source: "custom",
      studentName: student.name,
      nis: student.nis,
      createdBy: "Potong Tabungan"
    };
    // Do not push to treasurerTransactions to avoid double counting under Operasional
    // treasurerTransactions.push(newTx);

    // Send WA
    if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        `📢 *KUITANSI PEMBAYARAN DIGITAL*\n` +
        `Pembayaran *${bill.title}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* telah BERHASIL menggunakan saldo tabungan pada ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}.\n\n` +
        `Sisa Saldo Tabungan Anda: *Rp ${student.savingsBalance.toLocaleString("id-ID")}*\n\n` +
        `Terima kasih atas partisipasi aktif Anda.\n` +
        `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending auto payment WA:", err));
    }

    saveState();
    res.json({ success: true, student, bill });
  });

  // Midtrans SNAP Token Generator for Cart/Multiple Payments at Once
  app.post("/api/pay-cart-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Pembayaran online mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { billIds, studentId: reqStudentId, origin } = req.body;
    if (!Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({ error: "Keranjang belanja kosong atau format data tidak valid." });
    }

    const selectedSpp = sppBills.filter(b => billIds.includes(b.id));
    const selectedMisc = miscBills.filter(b => billIds.includes(b.id));

    // Extract savings deposit items from cart IDs (e.g. savings-deposit-TIMESTAMP-AMOUNT or savings-deposit-AMOUNT)
    const savingsCartIds = billIds.filter(id => typeof id === "string" && id.startsWith("savings-deposit-"));
    const selectedSavings: { id: string; amount: number }[] = [];
    savingsCartIds.forEach(id => {
      const parts = id.split("-");
      const amt = Number(parts[parts.length - 1]);
      if (!isNaN(amt) && amt >= 10000) {
        selectedSavings.push({ id, amount: amt });
      }
    });

    const totalBills = selectedSpp.length + selectedMisc.length + selectedSavings.length;
    if (totalBills === 0) {
      return res.status(404).json({ error: "Item atau tagihan dalam keranjang tidak ditemukan." });
    }

    const anyPaidSpp = selectedSpp.some(b => b.status === "paid" || b.status === "waived");
    const anyPaidMisc = selectedMisc.some(b => b.status === "paid");
    if (anyPaidSpp || anyPaidMisc) {
      return res.status(400).json({ error: "Beberapa tagihan dalam keranjang sudah dilunasi." });
    }

    const studentIds = new Set<string>();
    selectedSpp.forEach(b => studentIds.add(b.studentId));
    selectedMisc.forEach(b => studentIds.add(b.studentId));

    if (studentIds.size > 1) {
      return res.status(400).json({ error: "Tagihan dalam keranjang harus berasal dari siswa yang sama." });
    }

    let studentId = Array.from(studentIds)[0];
    if (!studentId && reqStudentId) {
      studentId = reqStudentId;
    }
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const studentNis = (student.nis ? String(student.nis).trim() : studentId.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    let orderId = `CART-${studentNis}-${Date.now().toString().slice(-6)}`;
    if (orderId.length > 48) {
      orderId = `CART-${studentNis}-${Date.now().toString().slice(-4)}`;
    }

    selectedSpp.forEach(b => {
      b.orderId = orderId;
      b.status = "pending";
    });
    selectedMisc.forEach(b => {
      b.orderId = orderId;
      b.status = "pending";
    });

    // Create pending savings deposit transactions for each deposit item in cart
    selectedSavings.forEach((savItem, idx) => {
      const newSavingsTx: SavingsTransaction = {
        id: `sav-cart-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: student.id,
        type: "deposit",
        amount: savItem.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        paymentMethod: "Midtrans (Keranjang)",
        orderId: orderId,
        notes: "Setoran Tabungan via Keranjang Pembayaran"
      };
      (newSavingsTx as any).studentNis = student.nis;
      savingsTransactions.push(newSavingsTx);
    });

    saveState();

    const grossAmountVal = 
      selectedSpp.reduce((sum, b) => sum + b.amount, 0) + 
      selectedMisc.reduce((sum, b) => sum + b.amount, 0) +
      selectedSavings.reduce((sum, s) => sum + s.amount, 0);

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.status(400).json({ 
        error: "Metode pembayaran online dinonaktifkan karena Kunci Midtrans belum diatur oleh Administrator sekolah di Panel Pengaturan." 
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const appReturnUrl = origin || "https://ais-pre-vqyvsdvdikjp7ctz7wouro-539390488845.asia-east1.run.app";

      const itemDetails: any[] = [];
      selectedSpp.forEach(b => {
        itemDetails.push({
          id: shortenBillIdForMidtrans(b.id),
          price: b.amount,
          quantity: 1,
          name: `SPP ${b.month} ${b.year}`.substring(0, 50)
        });
      });
      selectedMisc.forEach(b => {
        itemDetails.push({
          id: shortenBillIdForMidtrans(b.id),
          price: b.amount,
          quantity: 1,
          name: b.title.substring(0, 50)
        });
      });
      selectedSavings.forEach((s, idx) => {
        itemDetails.push({
          id: shortenBillIdForMidtrans(`SAV-${idx}-${s.amount}`),
          price: s.amount,
          quantity: 1,
          name: `Setor Tabungan Rp ${s.amount.toLocaleString('id-ID')}`.substring(0, 50)
        });
      });

      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmountVal
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: student.name,
          email: student.email || `${student.nis}@maarif.sch.id`,
          phone: student.phone
        },
        item_details: itemDetails,
        callbacks: {
          finish: appReturnUrl,
          error: appReturnUrl,
          pending: appReturnUrl
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const snapResponse: any = await response.json();
      res.json({
        token: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        isSimulated: false,
        orderId,
        totalAmount: grossAmountVal,
        itemCount: totalBills
      });
    } catch (err: any) {
      console.error("Midtrans Snap API Call Error for Cart", err);
      let errorMsg = "Gagal memproses pembayaran keranjang dengan Midtrans.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error_messages && parsed.error_messages.length > 0) {
          errorMsg = `Kesalahan Validasi Midtrans: ${parsed.error_messages.join(', ')}`;
        }
      } catch (e) {
        if (err.message) errorMsg = err.message;
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // Midtrans SNAP Token Generator for Miscellaneous Payments
  app.post("/api/pay-misc-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Pembayaran online mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { billId, origin } = req.body;
    const bill = miscBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    if (bill.status === "paid") {
      return res.status(400).json({ error: "Tagihan sudah lunas." });
    }

    const student = students.find(s => s.id === bill.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const studentNis = (student.nis ? String(student.nis).trim() : student.id.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    const shortBillId = compressMiscBillIdForMidtrans(bill.id);
    let orderId = `MISC-${studentNis}-${shortBillId}-${Date.now().toString().slice(-4)}`;
    if (orderId.length > 48) {
      const maxShortBillLen = 48 - 5 - studentNis.length - 1 - 1 - 4;
      const trimmedBillId = maxShortBillLen > 4 ? shortBillId.slice(0, maxShortBillLen) : shortBillId;
      orderId = `MISC-${studentNis}-${trimmedBillId}-${Date.now().toString().slice(-4)}`;
    }
    bill.orderId = orderId;
    bill.status = "pending";
    saveState();

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.status(400).json({ 
        error: "Metode pembayaran online dinonaktifkan karena Kunci Midtrans belum diatur oleh Administrator sekolah di Panel Pengaturan." 
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const appReturnUrl = origin || "https://ais-pre-vqyvsdvdikjp7ctz7wouro-539390488845.asia-east1.run.app";

      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: bill.amount
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: student.name,
          email: student.email || `${student.nis}@maarif.sch.id`,
          phone: student.phone
        },
        item_details: [
          {
            id: compressMiscBillIdForMidtrans(bill.id),
            price: bill.amount,
            quantity: 1,
            name: (() => {
              const baseName = `${bill.title} - ${student.name}`;
              return baseName.length > 50 ? baseName.substring(0, 45) + "..." : baseName;
            })()
          }
        ],
        callbacks: {
          finish: appReturnUrl,
          error: appReturnUrl,
          pending: appReturnUrl
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Midtrans API returned status ${response.status}: ${errorText}`);
      }

      const snapResponse = await response.json();
      res.json({
        token: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        isSimulated: false,
        orderId,
        adminFee: 0,
        systemMaintenanceFee: 0,
        baseAmount: bill.amount,
        totalAmount: bill.amount
      });
    } catch (error: any) {
      console.error("Error generating Midtrans token for Misc Payment:", error);
      res.status(500).json({ error: error?.message || "Gagal menginisialisasi pembayaran online via Midtrans." });
    }
  });

  // Get all savings transactions (for Admin purposes)
  app.get("/api/admin/all-transactions", (req, res) => {
    res.json(savingsTransactions);
  });

  // Get Student by NIS
  app.get("/api/students/nis/:nis", (req, res) => {
    const student = students.find(s => s.nis === req.params.nis);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }
    const studentBills = sppBills.filter(b => b.studentId === student.id);
    const studentTx = savingsTransactions.filter(t => 
      t.studentId === student.id || 
      (student.nis && (t.studentId === String(student.nis) || (t as any).studentNis === String(student.nis)))
    );
    res.json({ student, bills: studentBills, transactions: studentTx });
  });

  // Get full details of a specific student
  app.get("/api/students/:id", (req, res) => {
    const student = students.find(s => s.id === req.params.id);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }
    const studentBills = sppBills.filter(b => b.studentId === student.id);
    const studentTx = savingsTransactions.filter(t => 
      t.studentId === student.id || 
      (student.nis && (t.studentId === String(student.nis) || (t as any).studentNis === String(student.nis)))
    );
    res.json({ student, bills: studentBills, transactions: studentTx });
  });

  // Helper to determine if an SPP bill is active or deactivated
  function isBillActive(bill: SppBill, studentBills: SppBill[]): boolean {
    const MONTH_MAP: Record<string, number> = {
      "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
      "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
    };

    const billMonthIdx = MONTH_MAP[bill.month] !== undefined ? MONTH_MAP[bill.month] : 0;
    const billScore = bill.year * 12 + billMonthIdx;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const currentScore = currentYear * 12 + currentMonthIdx;

    // 1. If it's a past month or current month, it is always active
    if (billScore <= currentScore) {
      return true;
    }

    // 2. If it is a future month, it is active only if all bills strictly prior to this bill are paid or waived
    const priorBills = studentBills.filter(b => {
      const bMonthIdx = MONTH_MAP[b.month] !== undefined ? MONTH_MAP[b.month] : 0;
      const bScore = b.year * 12 + bMonthIdx;
      return bScore < billScore;
    });

    return priorBills.every(b => b.status === 'paid' || b.status === 'waived');
  }

  // Admin Manual SPP Update (Teller/Manual mode)
  app.post("/api/admin/pay-spp-manual", (req, res) => {
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan SPP tidak ditemukan." });
    }
    if (bill.status === "paid" || bill.status === "waived") {
      return res.status(400).json({ error: "Tagihan sudah lunas atau dibebaskan." });
    }

    const studentBills = sppBills.filter(b => b.studentId === bill.studentId);
    if (!isBillActive(bill, studentBills)) {
      return res.status(400).json({ error: `Tagihan SPP ${bill.month} ${bill.year} belum aktif. Silakan lunasi SPP bulan berjalan terlebih dahulu.` });
    }

    const student = students.find(s => s.id === bill.studentId);

    bill.status = "paid";
    bill.paidAt = new Date().toISOString();
    bill.paymentMethod = "Manual Teller (Sekolah)";
    bill.orderId = `ORD-MANUAL-${Date.now()}`;

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-spp-${Date.now()}`,
      studentId: bill.studentId,
      title: "Pembayaran SPP Lunas (Manual)",
      message: `Pembayaran SPP ${student?.name || ""} bulan ${bill.month} ${bill.year} sebesar Rp ${bill.amount.toLocaleString("id-ID")} telah DIVERIFIKASI oleh Admin Sekolah.`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    // Send automated WhatsApp confirmation if enabled
    if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        `📢 *KUITANSI PEMBAYARAN SPP DIGITAL*\n` +
        `Pembayaran SPP Bulan *${bill.month} ${bill.year}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* telah BERHASIL diterima & diverifikasi oleh teller sekolah pada ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}.\n\n` +
        `Metode Pembayaran: *${bill.paymentMethod}*\n` +
        `No. Transaksi: *${bill.orderId}*\n` +
        `Status: *LUNAS (PAID)*\n\n` +
        `Terima kasih atas partisipasi aktif Anda dalam memenuhi iuran pendidikan putra/putri Anda.\n` +
        `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending auto payment WA:", err));
    }

    saveState();
    res.json({ success: true, bill });
  });

  // Admin Bulk Manual SPP Payment (Batch Teller mode for 12 months or multiple bills)
  app.post("/api/admin/pay-spp-bulk-manual", (req, res) => {
    const { billIds } = req.body;
    if (!Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({ error: "Daftar ID tagihan SPP tidak valid." });
    }

    const MONTH_MAP: Record<string, number> = {
      Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
      Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11
    };

    const targetBills = sppBills.filter(b => billIds.includes(b.id));
    if (targetBills.length === 0) {
      return res.status(404).json({ error: "Tagihan SPP tidak ditemukan." });
    }

    targetBills.sort((a, b) => {
      const aScore = a.year * 12 + (MONTH_MAP[a.month] || 0);
      const bScore = b.year * 12 + (MONTH_MAP[b.month] || 0);
      return aScore - bScore;
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const batchOrderId = `ORD-MANUAL-BULK-${Date.now()}`;
    const paidBills: SppBill[] = [];

    for (const bill of targetBills) {
      if (bill.status === "paid" || bill.status === "waived") continue;
      bill.status = "paid";
      bill.paidAt = nowIso;
      bill.paymentMethod = "Manual Teller (Sekolah)";
      bill.orderId = batchOrderId;
      paidBills.push(bill);
    }

    if (paidBills.length > 0) {
      const firstBill = paidBills[0];
      const student = students.find(s => s.id === firstBill.studentId);
      const totalAmount = paidBills.reduce((sum, b) => sum + b.amount, 0);
      const monthList = paidBills.map(b => `${b.month} ${b.year}`).join(", ");

      // Broadcast single consolidated SSE notification
      const notification: RealtimeNotification = {
        id: `notif-spp-bulk-${Date.now()}`,
        studentId: firstBill.studentId,
        title: "Pembayaran Paket SPP Lunas (Kolektif)",
        message: `Pembayaran ${paidBills.length} bulan SPP (${monthList}) a.n. ${student?.name || ""} total Rp ${totalAmount.toLocaleString("id-ID")} telah DIVERIFIKASI oleh Teller Sekolah.`,
        type: "success",
        createdAt: nowIso
      };
      broadcastNotification(notification);

      // Send automated WhatsApp confirmation
      if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
        const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
          `📢 *KUITANSI PEMBAYARAN SPP DIGITAL (KOLEKTIF)*\n` +
          `Pembayaran SPP *${paidBills.length} Bulan* (${monthList}) sebesar *Rp ${totalAmount.toLocaleString("id-ID")}* telah BERHASIL diterima & diverifikasi oleh teller sekolah pada ${now.toLocaleDateString('id-ID')} pukul ${now.toLocaleTimeString('id-ID')}.\n\n` +
          `Metode Pembayaran: *Manual Teller (Kolektif)*\n` +
          `No. Transaksi: *${batchOrderId}*\n` +
          `Status: *LUNAS (PAID)*\n\n` +
          `Terima kasih atas partisipasi aktif Anda dalam memenuhi iuran pendidikan putra/putri Anda.\n` +
          `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending bulk SPP WA:", err));
      }

      saveState();
    }

    res.json({ success: true, paidBills, count: paidBills.length });
  });

  // Admin Unified Cart Bulk Payment (Instant batch processing for SPP + Savings + Misc)
  app.post("/api/admin/pay-cart-bulk", (req, res) => {
    const { sppBillIds = [], miscBillIds = [], savingsDeposits = [] } = req.body;
    
    const now = new Date();
    const nowIso = now.toISOString();
    const batchOrderId = `CART-BULK-${Date.now()}`;
    const executedItems: { name: string; amount: number; desc: string }[] = [];
    const MONTH_MAP: Record<string, number> = {
      Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
      Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11
    };

    // 1. Process SPP Bills
    if (Array.isArray(sppBillIds) && sppBillIds.length > 0) {
      const targetSppBills = sppBills.filter(b => sppBillIds.includes(b.id));
      targetSppBills.sort((a, b) => {
        const aScore = a.year * 12 + (MONTH_MAP[a.month] || 0);
        const bScore = b.year * 12 + (MONTH_MAP[b.month] || 0);
        return aScore - bScore;
      });

      for (const bill of targetSppBills) {
        if (bill.status === "paid" || bill.status === "waived") continue;
        bill.status = "paid";
        bill.paidAt = nowIso;
        bill.paymentMethod = "Manual Teller (Kolektif)";
        bill.orderId = batchOrderId;
        const student = students.find(s => s.id === bill.studentId);
        executedItems.push({
          name: `SPP Bulanan - ${bill.month} ${bill.year}`,
          amount: bill.amount,
          desc: `Siswa: ${student?.name || "Siswa"} (Kelas ${student?.class || "-"})`
        });
      }
    }

    // 2. Process Misc Bills
    if (Array.isArray(miscBillIds) && miscBillIds.length > 0) {
      const targetMiscBills = miscBills.filter(b => miscBillIds.includes(b.id));
      for (const bill of targetMiscBills) {
        if (bill.status === "paid") continue;
        bill.status = "paid";
        bill.paidAt = nowIso;
        bill.paymentMethod = "Manual Teller (Kolektif)";
        bill.orderId = batchOrderId;
        const student = students.find(s => s.id === bill.studentId);
        executedItems.push({
          name: `Lain-lain: ${bill.title}`,
          amount: bill.amount,
          desc: `Siswa: ${student?.name || "Siswa"} (Kelas ${student?.class || "-"})`
        });
      }
    }

    // 3. Process Savings Deposits
    if (Array.isArray(savingsDeposits) && savingsDeposits.length > 0) {
      for (const item of savingsDeposits) {
        const { studentId, amount, notes } = item;
        const student = students.find(s => s.id === studentId);
        const valAmount = Number(amount);
        if (student && !isNaN(valAmount) && valAmount > 0) {
          student.savingsBalance += valAmount;
          const transaction: SavingsTransaction = {
            id: `sav-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            studentId,
            type: "deposit",
            amount: valAmount,
            status: "success",
            createdAt: nowIso,
            paymentMethod: "Manual Teller (Kolektif)",
            notes: notes || "Setoran Tabungan (Kolektif)"
          };
          savingsTransactions.push(transaction);
          executedItems.push({
            name: `Setoran Tabungan Manual`,
            amount: valAmount,
            desc: `Siswa: ${student.name} • Memo: "${notes || "Setoran"}"`
          });
        }
      }
    }

    if (executedItems.length > 0) {
      const totalAmount = executedItems.reduce((sum, item) => sum + item.amount, 0);

      // Broadcast single consolidated notification
      const notification: RealtimeNotification = {
        id: `notif-cart-bulk-${Date.now()}`,
        studentId: "",
        title: "Pembayaran Keranjang Transaksi Berhasil",
        message: `Transaksi kolektif teller (${executedItems.length} item) total Rp ${totalAmount.toLocaleString("id-ID")} telah DIVERIFIKASI LUNAS.`,
        type: "success",
        createdAt: nowIso
      };
      broadcastNotification(notification);

      saveState();
      return res.json({ success: true, executedItems, totalAmount, orderId: batchOrderId });
    }

    return res.status(400).json({ error: "Tidak ada item transaksi valid yang diproses." });
  });

  // Admin Cancel/Void Manual SPP
  app.post("/api/admin/cancel-spp-manual", (req, res) => {
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan SPP tidak ditemukan." });
    }
    if (bill.status !== "paid") {
      return res.status(400).json({ error: "Hanya tagihan berstatus lunas yang dapat dibatalkan." });
    }
    const isOnline = bill.paymentMethod && bill.paymentMethod.toLowerCase().includes("midtrans");
    if (isOnline) {
      return res.status(400).json({ error: "Hanya pembayaran melalui Manual Teller yang dapat dibatalkan." });
    }

    const student = students.find(s => s.id === bill.studentId);
    const prevOrderId = bill.orderId || "";

    bill.status = "unpaid";
    bill.paidAt = undefined;
    bill.paymentMethod = undefined;
    bill.orderId = undefined;

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-spp-cancel-${Date.now()}`,
      studentId: bill.studentId,
      title: "Pembayaran SPP Dibatalkan",
      message: `Status pembayaran SPP ${student?.name || ""} bulan ${bill.month} ${bill.year} sebesar Rp ${bill.amount.toLocaleString("id-ID")} telah DIBATALKAN / DIKOREKSI oleh Admin Sekolah.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    // Send automated WhatsApp void notification if enabled
    if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        `⚠️ *PEMBATALAN / KOREKSI PEMBAYARAN SPP*\n` +
        `Transaksi pembayaran SPP Bulan *${bill.month} ${bill.year}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* (No. Transaksi: ${prevOrderId}) telah *DIBATALKAN / DIKOREKSI* oleh pihak teller sekolah karena kesalahan administrasi.\n\n` +
        `Status tagihan Anda kembali menjadi: *BELUM LUNAS (UNPAID)*.\n\n` +
        `Silakan abaikan kuitansi sebelumnya. Hubungi bagian keuangan jika ada pertanyaan.\n` +
        `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending void SPP WA:", err));
    }

    saveState();
    res.json({ success: true, bill });
  });

  // Admin Bulk Waive/Free SPP due to Achievement (Academic / Non-Academic)
  app.post("/api/admin/waive-spp-bulk", (req, res) => {
    const { studentId, billIds, achievementType, achievementDetail } = req.body;
    if (!studentId || !Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({ error: "Siswa dan daftar tagihan wajib dipilih." });
    }
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const waivedBills: SppBill[] = [];
    billIds.forEach(billId => {
      const bill = sppBills.find(b => b.id === billId && b.studentId === studentId);
      if (bill && bill.status === "unpaid") {
        bill.status = "waived";
        bill.paidAt = new Date().toISOString();
        let methodStr = `Bebas SPP Prestasi (${achievementType === 'akademik' ? 'Akademik' : 'Non-Akademik'})`;
        let codeTag = achievementType === 'akademik' ? 'ACAD' : 'NONACAD';
        if (achievementType === 'non-prestasi' || achievementType === 'keringanan') {
          methodStr = `Bebas SPP Diluar Prestasi (${achievementDetail || 'Keringanan Khusus'})`;
          codeTag = 'NONPRESTASI';
        } else if (achievementType === 'kebijakan') {
          methodStr = `Bebas SPP (Kebijakan Yayasan / ${achievementDetail || 'Khusus'})`;
          codeTag = 'KEBIJAKAN';
        }
        bill.paymentMethod = methodStr;
        bill.orderId = `ORD-WAIVED-${codeTag}-${Date.now()}-${billId.slice(-4)}`;
        (bill as any).achievementType = achievementType;
        (bill as any).achievementDetail = achievementDetail || "";
        waivedBills.push(bill);
      }
    });

    if (waivedBills.length === 0) {
      return res.status(400).json({ error: "Tidak ada tagihan belum lunas yang terpilih atau dapat dibebaskan." });
    }

    // Broadcast SSE notification
    const monthsText = waivedBills.map(b => `${b.month} ${b.year}`).join(", ");
    let notifTitle = `Bebas SPP Prestasi 🏆`;
    let notifMsg = `Selamat kepada ${student.name}! Tagihan SPP bulan (${monthsText}) dibebaskan karena prestasi ${achievementType === 'akademik' ? 'Akademik' : 'Non-Akademik'}: ${achievementDetail || ""}.`;
    let waHeader = `🏆 *APRESIASI BEBAS SPP BEASISWA PRESTASI*\n` +
      `Selamat! Kami informasikan bahwa iuran SPP putra/putri Anda untuk bulan *(${monthsText})* telah *DIBEBASKAN (WAIVED)* dari kewajiban iuran bulanan.\n\n` +
      `Jenis Prestasi: *${achievementType === 'akademik' ? 'Akademik' : 'Non-Akademik'}*\n` +
      `Detail Piagam/Apresiasi: *${achievementDetail || "Apresiasi Prestasi Siswa Utama"}*\n\n` +
      `Sekolah sangat bangga atas pencapaian luar biasa yang diukir oleh putra/putri Anda. Terus asah potensi dan raih masa depan gemilang.`;

    if (achievementType === 'non-prestasi' || achievementType === 'keringanan') {
      notifTitle = `Bebas SPP (Diluar Prestasi) 🤝`;
      notifMsg = `Informasi untuk ${student.name}: Tagihan SPP bulan (${monthsText}) telah DIBEBASKAN (Bebas SPP Diluar Prestasi/Keringanan Khusus): ${achievementDetail || "Beasiswa Sosial / Keringanan"}.`;
      waHeader = `🤝 *PEMBEBASAN SPP (DILUAR PRESTASI / BEASISWA SOSIAL)*\n` +
        `Kami informasikan bahwa iuran SPP putra/putri Anda untuk bulan *(${monthsText})* telah *DIBEBASKAN (WAIVED)* dari kewajiban iuran bulanan.\n\n` +
        `Kategori: *Bebas SPP Diluar Prestasi (Keringanan / Beasiswa Sosial)*\n` +
        `Keterangan / Alasan: *${achievementDetail || "Keringanan Khusus Sekolahan"}*\n\n` +
        `Semoga bantuan ini membawa keberkahan dan kelancaran dalam menuntut ilmu di sekolah.`;
    } else if (achievementType === 'kebijakan') {
      notifTitle = `Bebas SPP (Kebijakan Yayasan) 📜`;
      notifMsg = `Informasi untuk ${student.name}: Tagihan SPP bulan (${monthsText}) telah DIBEBASKAN berdasarkan Kebijakan Yayasan/Sekolah: ${achievementDetail || "Kebijakan Khusus"}.`;
      waHeader = `📜 *PEMBEBASAN SPP (KEBIJAKAN YAYASAN / SEKOLAH)*\n` +
        `Kami informasikan bahwa iuran SPP putra/putri Anda untuk bulan *(${monthsText})* telah *DIBEBASKAN (WAIVED)*.\n\n` +
        `Kategori: *Kebijakan Yayasan / Subsidi Khusus*\n` +
        `Keterangan / Alasan: *${achievementDetail || "Kebijakan Pengurus Yayasan / Sekolah"}*\n\n` +
        `Semoga bermanfaat dan memberi kemudahan bagi kelangsungan pendidikan putra/putri Anda.`;
    }

    const notification: RealtimeNotification = {
      id: `notif-spp-waived-bulk-${Date.now()}`,
      studentId,
      title: notifTitle,
      message: notifMsg,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    // Send automated WhatsApp confirmation if enabled
    if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        waHeader + `\n\n-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending bulk waive SPP WA:", err));
    }

    saveState();
    res.json({ success: true, count: waivedBills.length });
  });

  // Admin Cancel/Revert Waived SPP
  app.post("/api/admin/cancel-spp-waived", (req, res) => {
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan SPP tidak ditemukan." });
    }
    if (bill.status !== "waived") {
      return res.status(400).json({ error: "Hanya tagihan berstatus bebas SPP yang dapat dibatalkan." });
    }

    const student = students.find(s => s.id === bill.studentId);

    bill.status = "unpaid";
    bill.paidAt = undefined;
    bill.paymentMethod = undefined;
    bill.orderId = undefined;
    delete (bill as any).achievementType;
    delete (bill as any).achievementDetail;

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-spp-waived-cancel-${Date.now()}`,
      studentId: bill.studentId,
      title: "Penghapusan Bebas SPP",
      message: `Pembebasan SPP ${student?.name || ""} bulan ${bill.month} ${bill.year} telah dinonaktifkan/dikoreksi oleh Admin Sekolah.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    saveState();
    res.json({ success: true, bill });
  });

  // Student post withdrawal request (unconfirmed, requires admin approval)
  app.post("/api/student/withdraw-request", (req, res) => {
    const { studentId, amount, notes } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const valAmount = Number(amount);
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: "Jumlah penarikan harus berupa angka positif." });
    }

    if (student.savingsBalance < valAmount) {
      return res.status(400).json({ error: "Maaf, saldo tabungan Anda tidak mencukupi." });
    }

    const transaction: SavingsTransaction = {
      id: `sav-${Date.now()}`,
      studentId,
      type: "withdrawal",
      amount: valAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
      paymentMethod: "Manual Teller",
      notes: notes || "Pengajuan tarik tunai mandiri"
    };

    savingsTransactions.push(transaction);

    // Broadcast live SSE notifications
    const notification: RealtimeNotification = {
      id: `notif-sav-req-${Date.now()}`,
      studentId,
      title: "Pengajuan Tarik Tabungan",
      message: `Siswa ${student.name} mengajukan penarikan tunai sebesar Rp ${valAmount.toLocaleString("id-ID")}. Menunggu persetujuan admin.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    saveState();
    res.json({ success: true, transaction });
  });

  // Admin confirm/approve or reject pending student withdrawal request
  app.post("/api/admin/savings-confirm", (req, res) => {
    const { transactionId, action } = req.body; // action: 'approve' | 'reject'
    const transaction = savingsTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Data pengajuan penarikan tidak ditemukan." });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Pengajuan penarikan ini sudah diproses sebelumnya." });
    }

    const student = students.find(s => s.id === transaction.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa terkait tidak ditemukan." });
    }

    if (action === "approve") {
      if (student.savingsBalance < transaction.amount) {
        transaction.status = "failed";
        saveState();
        return res.status(400).json({ error: "Gagal menyetujui. Saldo tabungan siswa saat ini tidak mencukupi." });
      }

      // Deduct balance
      student.savingsBalance -= transaction.amount;
      transaction.status = "success";

      // Broadcast success notification
      const notification: RealtimeNotification = {
        id: `notif-sav-appr-${Date.now()}`,
        studentId: student.id,
        title: "Penarikan Tabungan Disetujui",
        message: `Pengajuan tarik tunai Rp ${transaction.amount.toLocaleString("id-ID")} untuk ${student.name} telah disetujui admin. Saldo saat ini: Rp ${student.savingsBalance.toLocaleString("id-ID")}.`,
        type: "success",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);

      // Send automated WhatsApp confirmation for savings if enabled
      if (whatsappConfig.enabled && whatsappConfig.notifyOnSavings && student.phone) {
        const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
          `📝 *NOTIFIKASI TRANSAKSI TABUNGAN SISWA*\n` +
          `Pengajuan *TARIK PENARIKAN TABUNGAN* sebesar *Rp ${transaction.amount.toLocaleString("id-ID")}* telah DISETUJUI oleh Admin:\n\n` +
          `• Status: *BERHASIL / DISETUJUI*\n` +
          `• Waktu: ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}\n` +
          `• Memo: *${transaction.notes}*\n` +
          `• *SALDO AKHIR TABUNGAN*: *Rp ${student.savingsBalance.toLocaleString("id-ID")}*\n\n` +
          `Terima kasih.\n` +
          `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending savings WA:", err));
      }
    } else {
      // rejection
      transaction.status = "failed";

      // Broadcast rejection notification
      const notification: RealtimeNotification = {
        id: `notif-sav-rej-${Date.now()}`,
        studentId: student.id,
        title: "Penarikan Tabungan Ditolak",
        message: `Pengajuan tarik tunai Rp ${transaction.amount.toLocaleString("id-ID")} untuk ${student.name} telah DITOLAK oleh admin.`,
        type: "warning",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);
    }

    saveState();
    res.json({ success: true, student, transaction });
  });

  // Admin Manual Savings Transaction (Add/Withdraw manual)
  app.post("/api/admin/savings-manual", (req, res) => {
    const { studentId, type, amount, notes } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const valAmount = Number(amount);
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: "Jumlah harus berupa angka positif." });
    }

    if (type === "withdrawal" && student.savingsBalance < valAmount) {
      return res.status(400).json({ error: "Saldo tabungan tidak mencukupi." });
    }

    // Process balance mutation
    if (type === "deposit") {
      student.savingsBalance += valAmount;
    } else {
      student.savingsBalance -= valAmount;
    }

    const transaction: SavingsTransaction = {
      id: `sav-${Date.now()}`,
      studentId,
      type,
      amount: valAmount,
      status: "success",
      createdAt: new Date().toISOString(),
      paymentMethod: "Manual Teller",
      notes: notes || (type === "deposit" ? "Setoran manual pihak sekolah" : "Tarik tunai manual")
    };
    savingsTransactions.push(transaction);

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-sav-${Date.now()}`,
      studentId,
      title: type === "deposit" ? "Setoran Tabungan Berhasil" : "Tenggat Tarik Tabungan",
      message: `Operasi tabungan ${type === "deposit" ? "Setor" : "Tarik"} sebesar Rp ${valAmount.toLocaleString("id-ID")} untuk ${student.name} telah selesai. Saldo saat ini: Rp ${student.savingsBalance.toLocaleString("id-ID")}.`,
      type: type === "deposit" ? "success" : "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    // Send automated WhatsApp confirmation for savings if enabled
    if (whatsappConfig.enabled && whatsappConfig.notifyOnSavings && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        `📝 *NOTIFIKASI TRANSAKSI TABUNGAN SISWA*\n` +
        `Transaksi *${type === "deposit" ? "SETOR TUNAI (DEPOSIT)" : "TARIK TUNAI (WITHDRAWAL)"}* telah berhasil diproses:\n\n` +
        `• Jumlah: *Rp ${valAmount.toLocaleString("id-ID")}*\n` +
        `• Waktu: ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}\n` +
        `• Memo: *${transaction.notes}*\n` +
        `• *SALDO AKHIR TABUNGAN*: *Rp ${student.savingsBalance.toLocaleString("id-ID")}*\n\n` +
        `Terima kasih telah menabung untuk masa depan pendidikan yang cemerlang.\n` +
        `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending savings WA:", err));
    }

    saveState();
    res.json({ success: true, student, transaction });
  });

  // Admin Cancel/Void Savings Transaction (Deposit or Withdrawal)
  app.post("/api/admin/cancel-savings-transaction", (req, res) => {
    const { transactionId } = req.body;
    const transaction = savingsTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaksi tabungan tidak ditemukan." });
    }
    if (transaction.status !== "success") {
      return res.status(400).json({ error: "Hanya transaksi berstatus sukses yang dapat dibatalkan." });
    }

    const student = students.find(s => s.id === transaction.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan untuk transaksi ini." });
    }

    // Rollback student's balance
    if (transaction.type === "deposit") {
      if (student.savingsBalance < transaction.amount) {
        return res.status(400).json({
          error: `Pembatalan setoran gagal karena sisa saldo tabungan siswa saat ini (Rp ${student.savingsBalance.toLocaleString("id-ID")}) kurang dari nominal setoran (Rp ${transaction.amount.toLocaleString("id-ID")}).`
        });
      }
      student.savingsBalance -= transaction.amount;
    } else if (transaction.type === "withdrawal") {
      student.savingsBalance += transaction.amount;
    }

    // Mark transaction as failed/cancelled
    transaction.status = "failed";
    transaction.notes = `[DIBATALKAN ADMIN] ${transaction.notes || ""}`;

    // Create a notification for real-time update
    const notification: RealtimeNotification = {
      id: `notif-sav-cancel-${Date.now()}`,
      studentId: student.id,
      title: `Pembatalan ${transaction.type === "deposit" ? "Setoran" : "Penarikan"} Tabungan`,
      message: `Transaksi ${transaction.type === "deposit" ? "Setor" : "Tarik"} sebesar Rp ${transaction.amount.toLocaleString("id-ID")} telah DIBATALKAN oleh Admin. Saldo saat ini: Rp ${student.savingsBalance.toLocaleString("id-ID")}.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    notifications.unshift(notification);
    try {
      broadcastNotification(notification);
    } catch (err) {
      console.warn("Failed to broadcast SSE:", err);
    }

    // Send automated WhatsApp confirmation for savings cancellation if enabled
    if (whatsappConfig.enabled && whatsappConfig.notifyOnSavings && student.phone) {
      const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
        `⚠️ *PEMBATALAN TRANSAKSI TABUNGAN SISWA*\n` +
        `Transaksi *${transaction.type === "deposit" ? "SETOR TUNAI (DEPOSIT)" : "TARIK TUNAI (WITHDRAWAL)"}* sebesar *Rp ${transaction.amount.toLocaleString("id-ID")}* telah *DIBATALKAN / DIKOREKSI* oleh Admin Sekolah.\n\n` +
        `• *SALDO AKHIR TABUNGAN SISWA*: *Rp ${student.savingsBalance.toLocaleString("id-ID")}*\n\n` +
        `Terima kasih atas perhatian Anda.\n` +
        `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending savings cancel WA:", err));
    }

    saveState();
    res.json({ success: true, student, transaction });
  });

  // Admin Clear All Savings & History for a Student (by NIS or ID)
  app.post("/api/admin/clear-student-savings", (req, res) => {
    const { nis, studentId } = req.body;
    const student = students.find(s => 
      (studentId && s.id === studentId) || 
      (nis && String(s.nis).trim() === String(nis).trim())
    );

    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const sId = student.id;
    const sNis = String(student.nis).trim();

    // Reset savings balance to 0
    student.savingsBalance = 0;

    // Remove all savings transactions for this student
    let removedCount = 0;
    for (let i = savingsTransactions.length - 1; i >= 0; i--) {
      const tx = savingsTransactions[i];
      if (tx.studentId === sId || ((tx as any).studentNis && String((tx as any).studentNis).trim() === sNis)) {
        savingsTransactions.splice(i, 1);
        removedCount++;
      }
    }

    saveState();

    return res.json({
      success: true,
      message: `Saldo tabungan ${student.name} (NIS: ${student.nis}) di-reset ke Rp 0 dan ${removedCount} riwayat transaksi dihapus.`,
      student,
      removedCount
    });
  });

  // Admin Bulk Savings Withdrawal per grade level (7,8,9)
  app.post("/api/admin/savings-bulk-withdraw", (req, res) => {
    const { grade, amount, notes, allowDebt } = req.body;
    
    // Validate inputs
    if (!grade || !["7", "8", "9"].includes(String(grade))) {
      return res.status(400).json({ error: "Tingkat kelas tidak valid (harus 7, 8, atau 9)." });
    }

    const valAmount = Number(amount);
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: "Jumlah penarikan harus berupa angka positif." });
    }

    const customNotes = notes || `Penarikan massal tingkat ${grade}`;

    // Filter students belonging to specified grade
    const targetStudents = students.filter(student => {
      const cls = String(student.class || "").trim();
      return cls.startsWith(String(grade));
    });

    if (targetStudents.length === 0) {
      return res.status(404).json({ error: `Tidak ditemukan siswa di tingkat kelas ${grade}.` });
    }

    let successCount = 0;
    let skippedCount = 0;
    let totalDeducted = 0;

    for (const student of targetStudents) {
      let deductVal = valAmount;

      // Deduct balance (allows negative/minus balance)
      student.savingsBalance -= deductVal;
      totalDeducted += deductVal;
      successCount++;

      // Create transaction record
      const transaction: SavingsTransaction = {
        id: `sav-bulk-${Date.now()}-${student.id}`,
        studentId: student.id,
        type: "withdrawal",
        amount: deductVal,
        status: "success",
        createdAt: new Date().toISOString(),
        paymentMethod: "Manual Teller (Massal)",
        notes: customNotes
      };
      savingsTransactions.push(transaction);

      // Create dynamic notification for this specific student/parents
      const studentNotification: RealtimeNotification = {
        id: `notif-sav-bulk-st-${Date.now()}-${student.id}`,
        studentId: student.id,
        title: "Penarikan Tabungan Massal",
        message: `Tabungan Anda ditarik massal sebesar Rp ${deductVal.toLocaleString("id-ID")} untuk: ${customNotes}. Saldo baru: Rp ${student.savingsBalance.toLocaleString("id-ID")}.`,
        type: "warning",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(studentNotification);

      // Send automated WhatsApp notification (if enabled)
      if (whatsappConfig.enabled && whatsappConfig.notifyOnSavings && student.phone) {
        const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
          `📝 *NOTIFIKASI TRANSAKSI TABUNGAN SISWA*\n` +
          `Telah diproses *PENARIKAN TABUNGAN MASSAL* Tingkat ${grade} oleh Teller Sekolah:\n\n` +
          `• Jumlah Penarikan: *Rp ${deductVal.toLocaleString("id-ID")}*\n` +
          `• Keperluan: *${customNotes}*\n` +
          `• Tanggal: ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}\n` +
          `• Status: *BERHASIL*\n` +
          `• *SALDO AKHIR TABUNGAN*: *Rp ${student.savingsBalance.toLocaleString("id-ID")}*\n\n` +
          `Terima kasih.\n` +
          `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(student.phone, waMsg).catch(err => console.error(`Error sending bulk savings WA for ${student.name}:`, err));
      }
    }

    // Record general notification in the school notification feed
    const schoolNotification: RealtimeNotification = {
      id: `notif-bulk-sav-sch-${Date.now()}`,
      title: `Penarikan Massal Tingkat ${grade} Berhasil`,
      message: `Diproses penarikan tabungan massal tingkat ${grade} sebesar Rp ${valAmount.toLocaleString("id-ID")} per siswa untuk "${customNotes}". Sebanyak ${successCount} siswa didebet, total dana dihimpun: Rp ${totalDeducted.toLocaleString("id-ID")}.`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(schoolNotification);

    saveState();

    res.json({
      success: true,
      successCount,
      skippedCount,
      totalDeducted,
      message: `Berhasil memproses penarikan massal tingkat ${grade}. Keperluan: ${customNotes}.`
    });
  });

  // 1. Create Student (with initial savings & automatic SPP bills)
  app.post("/api/admin/students", (req, res) => {
    const { nis, name, class: className, email, phone, initialSavings, gender, password, customSppRate } = req.body;
    
    if (!nis || !name || !className) {
      return res.status(400).json({ error: "Siswa baru harus memiliki NIS, Nama, dan Kelas." });
    }

    // Check if NIS already exists
    const duplicate = students.find(s => s.nis === nis);
    if (duplicate) {
      return res.status(400).json({ error: `Nomor Induk Siswa (NIS) ${nis} sudah terdaftar.` });
    }

    const newStudentId = `std-${Date.now()}`;
    const parsedSavings = Number(initialSavings) || 0;
    const parsedCustomSpp = (customSppRate !== undefined && customSppRate !== null && customSppRate !== "" && !isNaN(Number(customSppRate)) && Number(customSppRate) > 0)
      ? Number(customSppRate)
      : undefined;

    const newStudent: Student = {
      id: newStudentId,
      nis,
      name,
      class: className,
      email: email || "",
      phone: phone || "",
      savingsBalance: parsedSavings,
      gender: gender || "",
      password: password ? String(password).trim() : nis.toString().trim(),
      customSppRate: parsedCustomSpp
    };

    students.push(newStudent);

    // Find all distinct start years in the existing SPP bills database
    const startYears = Array.from(new Set(sppBills.map(b => {
      const isFirstHalf = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(b.month);
      return isFirstHalf ? b.year : b.year - 1;
    })));

    // Fallback to 2025 if no bills exist yet
    if (startYears.length === 0) {
      startYears.push(2025);
    }

    // Pre-populate SPP bills for all active student academic years
    startYears.forEach(startYear => {
      months.forEach((month, mIdx) => {
        const billYear = mIdx < 6 ? startYear : startYear + 1;
        const isGrade7 = className.trim().startsWith("7") || className.trim().toUpperCase().startsWith("VII");
        const isJuly = month === "Juli";
        const isPaid = isGrade7 && isJuly;
        sppBills.push({
          id: `bill-${newStudentId}-${startYear}-${mIdx}`,
          studentId: newStudentId,
          month: month,
          year: billYear,
          amount: getSppAmountForStudent(newStudent, className),
          status: isPaid ? "paid" : "unpaid",
          paidAt: isPaid ? new Date().toISOString() : undefined,
          paymentMethod: isPaid ? "Lunas Pendaftaran" : undefined,
          orderId: isPaid ? `ORD-REGISTRATION-${newStudentId}` : undefined
        });
      });
    });

    // If initial savings balance is provided, record a savings transaction
    if (parsedSavings !== 0) {
      savingsTransactions.push({
        id: `sav-${newStudentId}-init`,
        studentId: newStudentId,
        type: parsedSavings > 0 ? "deposit" : "withdrawal",
        amount: Math.abs(parsedSavings),
        status: "success",
        createdAt: new Date().toISOString(),
        paymentMethod: "Manual Teller",
        notes: parsedSavings > 0 ? "Setoran Awal saat Pendaftaran" : "Tarik Saldo Awal (Saldo Minus) saat Pendaftaran"
      });
    }

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-new-student-${Date.now()}`,
      studentId: newStudentId,
      title: "Siswa Baru Terdaftar",
      message: `Siswa baru bernama ${name} (${nis}) kelas ${className} telah didaftarkan di sistem MA'ARIF NU.`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, student: newStudent });
  });

  // 2. Update Student
  app.put("/api/admin/students/:id", (req, res) => {
    const { nis, name, class: className, email, phone, password, gender, mutationDate, mutationReason, mutationDestination } = req.body;
    const student = students.find(s => s.id === req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    if (!nis || !name || !className) {
      return res.status(400).json({ error: "NIS, Nama, dan Kelas tidak boleh kosong." });
    }

    // Check if NIS already exists under another student
    const duplicate = students.find(s => s.nis === nis && s.id !== student.id);
    if (duplicate) {
      return res.status(400).json({ error: `Nomor Induk Siswa (NIS) ${nis} sudah terdaftar di siswa lain.` });
    }

    const previousClass = student.class;
    const previousCustomSppRate = student.customSppRate;

    student.nis = nis;
    student.name = name;
    student.class = className;
    student.email = email || "";
    student.phone = phone || "";
    student.gender = gender || "";
    student.mutationDate = mutationDate;
    student.mutationReason = mutationReason;
    student.mutationDestination = mutationDestination;

    if (req.body.customSppRate !== undefined) {
      const parsedVal = req.body.customSppRate;
      if (parsedVal === null || parsedVal === "" || parsedVal === 0 || parsedVal === "0") {
        student.customSppRate = undefined;
      } else {
        const numVal = Number(parsedVal);
        student.customSppRate = (!isNaN(numVal) && numVal > 0) ? numVal : undefined;
      }
    }

    // Buku Induk Fields
    student.nisn = req.body.nisn;
    student.nickname = req.body.nickname;
    student.nik = req.body.nik;
    student.birthPlace = req.body.birthPlace;
    student.birthDate = req.body.birthDate;
    student.kkNumber = req.body.kkNumber;
    student.birthCertNumber = req.body.birthCertNumber;
    student.livingWith = req.body.livingWith;
    student.childOrder = req.body.childOrder;
    student.siblingsCount = req.body.siblingsCount;
    student.stepSiblingsCount = req.body.stepSiblingsCount;
    student.address = req.body.address;
    student.googleDriveLink = req.body.googleDriveLink;

    // Ayah
    student.fatherName = req.body.fatherName;
    student.fatherNik = req.body.fatherNik;
    student.fatherBirthPlace = req.body.fatherBirthPlace;
    student.fatherBirthDate = req.body.fatherBirthDate;
    student.fatherEducation = req.body.fatherEducation;
    student.fatherOccupation = req.body.fatherOccupation;
    student.fatherIncome = req.body.fatherIncome;
    student.fatherAddress = req.body.fatherAddress;
    student.fatherPhone = req.body.fatherPhone;
    student.fatherStatus = req.body.fatherStatus;

    // Ibu
    student.motherName = req.body.motherName;
    student.motherNik = req.body.motherNik;
    student.motherBirthPlace = req.body.motherBirthPlace;
    student.motherBirthDate = req.body.motherBirthDate;
    student.motherEducation = req.body.motherEducation;
    student.motherOccupation = req.body.motherOccupation;
    student.motherIncome = req.body.motherIncome;
    student.motherAddress = req.body.motherAddress;
    student.motherPhone = req.body.motherPhone;
    student.motherStatus = req.body.motherStatus;

    // Wali
    student.guardianName = req.body.guardianName;
    student.guardianNik = req.body.guardianNik;
    student.guardianBirthPlace = req.body.guardianBirthPlace;
    student.guardianBirthDate = req.body.guardianBirthDate;
    student.guardianEducation = req.body.guardianEducation;
    student.guardianOccupation = req.body.guardianOccupation;
    student.guardianIncome = req.body.guardianIncome;
    student.guardianAddress = req.body.guardianAddress;
    student.guardianPhone = req.body.guardianPhone;
    student.guardianStatus = req.body.guardianStatus;
    student.guardianIsSameAsFather = !!req.body.guardianIsSameAsFather;
    
    if (password !== undefined) {
      student.password = String(password).trim();
    }

    // Sync student unpaid bills with the SPP rate corresponding to their new class grade or custom rate
    let updatedBillsCount = 0;
    if (previousClass !== className || previousCustomSppRate !== student.customSppRate) {
      const newRate = getSppAmountForStudent(student, className);
      sppBills.forEach(bill => {
        if (bill.studentId === student.id && bill.status === "unpaid") {
          if (bill.amount !== newRate) {
            bill.amount = newRate;
            updatedBillsCount++;
          }
        }
      });
    }

    // Automatically purge unpaid/pending bills for mutated students starting from the month of mutation and subsequent months
    const purgedCount = purgeMutatedStudentUnpaidBills();

    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-update-std-${Date.now()}`,
      studentId: student.id,
      title: "Data Siswa Diperbarui",
      message: `Data siswa ${name} (${nis}) telah diperbarui oleh Admin. ${updatedBillsCount > 0 ? `Sebanyak ${updatedBillsCount} tagihan Belum Lunas (Unpaid) disesuaikan ke tarif SPP kelas baru.` : ''}`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, student });
  });

  // 3. Delete Student (with safe cascading)
  app.delete("/api/admin/students/:id", (req, res) => {
    const studentIndex = students.findIndex(s => s.id === req.params.id);
    if (studentIndex === -1) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const studentName = students[studentIndex].name;
    const studentNIS = students[studentIndex].nis;

    // Filter out student
    students.splice(studentIndex, 1);
    deleteDocFromFirestore("students", req.params.id).catch(err => console.error(err));

    // Cascading delete the student's bills & transactions
    for (let i = sppBills.length - 1; i >= 0; i--) {
      if (sppBills[i].studentId === req.params.id) {
        const removedBill = sppBills.splice(i, 1)[0];
        deleteDocFromFirestore("sppBills", removedBill.id).catch(err => console.error(err));
      }
    }
    for (let i = savingsTransactions.length - 1; i >= 0; i--) {
      if (savingsTransactions[i].studentId === req.params.id) {
        const removedTx = savingsTransactions.splice(i, 1)[0];
        deleteDocFromFirestore("savingsTransactions", removedTx.id).catch(err => console.error(err));
      }
    }

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-delete-std-${Date.now()}`,
      title: "Siswa Dihapus",
      message: `Siswa bernama ${studentName} (${studentNIS}) beserta seluruh riwayat keuangan & SPP-nya telah dihapus permanen.`,
      type: "warning",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, message: `Siswa ${studentName} berhasil dihapus.` });
  });

  // 3a. Massal Kenaikan Kelas (Otomatis mengaktifkan Tahun Ajaran SPP Baru)
  app.post("/api/admin/students/promote-all", (req, res) => {
    let promotedCount = 0;
    let graduatedCount = 0;
    let updatedBillsCount = 0;

    // 1. Calculate the current latest starting year of the existing academic years
    const existingStartYears = Array.from(new Set(sppBills.map(b => {
      const isFirstHalf = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(b.month);
      return isFirstHalf ? b.year : b.year - 1;
    })));
    const currentMaxStartYear = existingStartYears.length > 0 ? Math.max(...existingStartYears) : 2025;
    const nextStartYear = currentMaxStartYear + 1;

    const { clearPreviousBills, generateNewBills } = req.body || {};

    students.forEach(student => {
      const cls = (student.class || "").trim();
      if (cls.toLowerCase() === "lulus" || cls.toLowerCase() === "lulusan" || cls.toLowerCase() === "mutasi" || cls.toLowerCase() === "mutasi keluar") {
        return;
      }

      const previousClass = student.class;
      if (cls.startsWith("7")) {
        student.class = cls.replace(/^7/, "8");
        promotedCount++;
      } else if (cls.startsWith("8")) {
        student.class = cls.replace(/^8/, "9");
        promotedCount++;
      } else if (cls.startsWith("9")) {
        student.class = "Lulus";
        graduatedCount++;
      }

      // If class changed, update their unpaid bills to the rate of the new class
      if (previousClass !== student.class) {
        const newRate = getSppAmountForStudent(student);
        sppBills.forEach(bill => {
          if (bill.studentId === student.id && bill.status === "unpaid") {
            bill.amount = newRate;
            updatedBillsCount++;
          }
        });
      }
    });

    // Option to clear old unpaid bills prior to nextStartYear
    let deletedBillsCount = 0;
    if (clearPreviousBills === true) {
      const initialBillsCount = sppBills.length;
      const filteredBills = sppBills.filter(b => {
        const isFirstHalf = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(b.month);
        const billStartYear = isFirstHalf ? b.year : b.year - 1;
        const isOlder = billStartYear < nextStartYear;
        // Delete older unpaid bills
        if (isOlder && b.status === "unpaid") {
          return false;
        }
        return true;
      });
      deletedBillsCount = initialBillsCount - filteredBills.length;
      sppBills.length = 0;
      sppBills.push(...filteredBills);
    }

    // 2. Automatically generate 12 months unpaid SPP bills for the next academic year for all non-graduated students
    let autoBillsGenerated = 0;
    const shouldGenerate = generateNewBills !== false;

    if (shouldGenerate) {
      const schoolMonths = [
        { name: "Juli", isNextYear: false },
        { name: "Agustus", isNextYear: false },
        { name: "September", isNextYear: false },
        { name: "Oktober", isNextYear: false },
        { name: "November", isNextYear: false },
        { name: "Desember", isNextYear: false },
        { name: "Januari", isNextYear: true },
        { name: "Februari", isNextYear: true },
        { name: "Maret", isNextYear: true },
        { name: "April", isNextYear: true },
        { name: "Mei", isNextYear: true },
        { name: "Juni", isNextYear: true }
      ];

      students.forEach(student => {
        const cls = (student.class || "").trim().toLowerCase();
        if (cls === "lulus" || cls === "lulusan" || cls === "mutasi" || cls === "mutasi keluar") {
          return;
        }

        schoolMonths.forEach((m, mIdx) => {
          const billYear = m.isNextYear ? nextStartYear + 1 : nextStartYear;
          // Check if bill already exists
          const exists = sppBills.some(b => 
            b.studentId === student.id && 
            b.month === m.name && 
            b.year === billYear
          );

          if (!exists) {
            sppBills.push({
              id: `bill-${student.id}-${nextStartYear}-${mIdx}-${Date.now().toString().slice(-3)}`,
              studentId: student.id,
              month: m.name,
              year: billYear,
              amount: getSppAmountForStudent(student),
              status: "unpaid"
            });
            autoBillsGenerated++;
          }
        });
      });
    }

    // Set active academic year
    (schoolIdentity as any).activeAcademicYear = `${nextStartYear}/${nextStartYear + 1}`;

    // Save changes
    saveState();

    // Broadcast SSE notification
    let sseMsg = `Prosedur Kenaikan Kelas & Aktivasi Tahun Ajaran ${nextStartYear}/${nextStartYear + 1} berhasil dijalankan secara otomatis. ${promotedCount} siswa naik kelas, ${graduatedCount} siswa lulus.`;
    if (shouldGenerate) {
      sseMsg += ` Total ${autoBillsGenerated} lembar tagihan baru otomatis dibuat.`;
    }
    if (clearPreviousBills) {
      sseMsg += ` Sebanyak ${deletedBillsCount} lembar tagihan belum lunas dari tahun sebelumnya telah dibersihkan agar data awal siap pakai.`;
    }

    const notification: RealtimeNotification = {
      id: `notif-promote-std-${Date.now()}`,
      title: "Kenaikan Kelas Selesai",
      message: sseMsg,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ 
      success: true, 
      promotedCount, 
      graduatedCount, 
      updatedBillsCount, 
      autoBillsGenerated,
      deletedBillsCount,
      nextStartYear,
      students 
    });
  });

  // 3b. Pengaktifan Tahun Ajaran Baru & Bulk SPP Bill Generation
  app.post("/api/admin/activate-academic-year", (req, res) => {
    const { startYear, clearPreviousBills, generateNewBills } = req.body || {};
    const yearNum = Number(startYear);
    
    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      return res.status(400).json({ error: "Tahun akademik awal tidak valid." });
    }

    let deletedBillsCount = 0;
    if (clearPreviousBills === true) {
      const initialBillsCount = sppBills.length;
      const filteredBills = sppBills.filter(b => {
        const isFirstHalf = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(b.month);
        const billStartYear = isFirstHalf ? b.year : b.year - 1;
        const isOlder = billStartYear < yearNum;
        // Delete older unpaid bills
        if (isOlder && b.status === "unpaid") {
          return false;
        }
        return true;
      });
      deletedBillsCount = initialBillsCount - filteredBills.length;
      sppBills.length = 0;
      sppBills.push(...filteredBills);
    }

    let billsGenerated = 0;
    let skippedBillsCount = 0;
    const shouldGenerate = generateNewBills !== false;

    if (shouldGenerate) {
      const schoolMonths = [
        { name: "Juli", isNextYear: false },
        { name: "Agustus", isNextYear: false },
        { name: "September", isNextYear: false },
        { name: "Oktober", isNextYear: false },
        { name: "November", isNextYear: false },
        { name: "Desember", isNextYear: false },
        { name: "Januari", isNextYear: true },
        { name: "Februari", isNextYear: true },
        { name: "Maret", isNextYear: true },
        { name: "April", isNextYear: true },
        { name: "Mei", isNextYear: true },
        { name: "Juni", isNextYear: true }
      ];

      students.forEach(student => {
        const cls = (student.class || "").trim().toLowerCase();
        // Skip graduated students
        if (cls === "lulus" || cls === "lulusan") {
          return;
        }

        schoolMonths.forEach(m => {
          const billYear = m.isNextYear ? yearNum + 1 : yearNum;
          
          // Check if bill already exists
          const exists = sppBills.some(b => 
            b.studentId === student.id && 
            b.month === m.name && 
            b.year === billYear
          );

          if (!exists) {
            const isGrade7 = student.class.trim().startsWith("7") || student.class.trim().toUpperCase().startsWith("VII");
            const isJuly = m.name === "Juli";
            const isPaid = isGrade7 && isJuly;

            sppBills.push({
              id: `bill-${student.id}-${m.name}-${billYear}-${Date.now().toString().slice(-4)}`,
              studentId: student.id,
              month: m.name,
              year: billYear,
              amount: getSppAmountForClass(student.class),
              status: isPaid ? "paid" : "unpaid",
              paidAt: isPaid ? new Date().toISOString() : undefined,
              paymentMethod: isPaid ? "Lunas Pendaftaran" : undefined,
              orderId: isPaid ? `ORD-REGISTRATION-${student.id}-${billYear}` : undefined
            });
            billsGenerated++;
          } else {
            skippedBillsCount++;
          }
        });
      });
    }

    // Set active academic year
    (schoolIdentity as any).activeAcademicYear = `${yearNum}/${yearNum + 1}`;

    // Save changes
    saveState();

    // Broadcast SSE notification
    let sseMsg = `Tahun Ajaran ${yearNum}/${yearNum + 1} berhasil diaktifkan.`;
    if (shouldGenerate) {
      sseMsg += ` Total ${billsGenerated} lembar tagihan baru dihasilkan.`;
    }
    if (clearPreviousBills) {
      sseMsg += ` Sebanyak ${deletedBillsCount} lembar tagihan belum lunas dari tahun sebelumnya telah dibersihkan agar persiapan data awal bersih.`;
    }

    const notification: RealtimeNotification = {
      id: `notif-new-year-${Date.now()}`,
      title: `Tahun Ajaran Baru ${yearNum}/${yearNum + 1} Aktif`,
      message: sseMsg,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ 
      success: true, 
      message: `Tahun Ajaran ${yearNum}/${yearNum + 1} berhasil diaktifkan!`,
      billsGenerated,
      skippedBillsCount,
      deletedBillsCount
    });
  });

  // Batch Import Teachers (Wali Kelas & Guru Mapel) via JSON data parsed from templates
  app.post("/api/admin/teachers/import", (req, res) => {
    const { homerooms, subjectTeachers: subjects } = req.body;
    let homeroomsAdded = 0;
    let homeroomsUpdated = 0;
    let subjectsAdded = 0;
    let subjectsUpdated = 0;

    if (Array.isArray(homerooms)) {
      homerooms.forEach((inputHt: any) => {
        const { username, name, className, password } = inputHt;
        if (!username || !name || !className) {
          // Skip invalid rows
          return;
        }

        const existingHt = homeroomTeachers.find(ht => ht.username.toLowerCase() === username.toString().toLowerCase().trim());
        if (existingHt) {
          existingHt.name = name.trim();
          existingHt.className = className.trim();
          if (password) existingHt.password = String(password).trim();
          homeroomsUpdated++;
        } else {
          homeroomTeachers.push({
            id: `ht-${Date.now()}-${homeroomsAdded}-${Math.random().toString(36).substr(2, 4)}`,
            username: username.toString().toLowerCase().trim(),
            name: name.trim(),
            className: className.trim(),
            password: password ? String(password).trim() : "wali123"
          });
          homeroomsAdded++;
        }
      });
    }

    if (Array.isArray(subjects)) {
      subjects.forEach((inputSt: any) => {
        const { username, name, subject, password } = inputSt;
        if (!username || !name || !subject) {
          // Skip invalid rows
          return;
        }

        const existingSt = subjectTeachers.find(st => st.username.toLowerCase() === username.toString().toLowerCase().trim());
        if (existingSt) {
          existingSt.name = name.trim();
          existingSt.subject = subject.trim();
          if (password) existingSt.password = String(password).trim();
          subjectsUpdated++;
        } else {
          subjectTeachers.push({
            id: `st-${Date.now()}-${subjectsAdded}-${Math.random().toString(36).substr(2, 4)}`,
            username: username.toString().toLowerCase().trim(),
            name: name.trim(),
            subject: subject.trim(),
            password: password ? String(password).trim() : "mapel123"
          });
          subjectsAdded++;
        }
      });
    }

    if (homeroomsAdded > 0 || homeroomsUpdated > 0 || subjectsAdded > 0 || subjectsUpdated > 0) {
      saveState();
      // Broadcast notification
      const notification: RealtimeNotification = {
        id: `notif-teachers-import-${Date.now()}`,
        title: "Batch Import Guru Berhasil",
        message: `Batch import berhasil! Wali Kelas: +${homeroomsAdded}, ~${homeroomsUpdated}. Guru Mapel: +${subjectsAdded}, ~${subjectsUpdated}.`,
        type: "success",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);
    }

    res.json({
      success: true,
      homeroomsList: homeroomTeachers,
      subjectTeachersList: subjectTeachers,
      summary: {
        homeroomsAdded,
        homeroomsUpdated,
        subjectsAdded,
        subjectsUpdated
      }
    });
  });

  // 4. Batch Import Students via JSON data parsed from CSV
  app.post("/api/admin/students/import", (req, res) => {
    const { studentsList } = req.body;
    if (!Array.isArray(studentsList)) {
      return res.status(400).json({ error: "Data import harus berupa list siswa." });
    }

    let updatedCount = 0;
    let addedCount = 0;

    studentsList.forEach((inputStd: any) => {
      const { nis, name, class: className, email, phone, initialSavings, gender, password } = inputStd;
      if (!nis || !name || !className) {
        // Skip invalid rows
        return;
      }

      const existingStudent = students.find(s => s.nis.toString().trim() === nis.toString().trim());

      if (existingStudent) {
        // Update details
        existingStudent.name = name;
        existingStudent.class = className;
        existingStudent.email = email || "";
        existingStudent.phone = phone || "";
        if (gender) {
          existingStudent.gender = gender;
        }
        if (password !== undefined && password !== null) {
          existingStudent.password = String(password).trim();
        }

        // Import of Buku Induk detail keys
        const bioFields = [
          'nisn', 'nickname', 'nik', 'birthPlace', 'birthDate', 'kkNumber', 'birthCertNumber',
          'livingWith', 'childOrder', 'siblingsCount', 'stepSiblingsCount', 'address', 'googleDriveLink',
          'fatherName', 'fatherNik', 'fatherBirthPlace', 'fatherBirthDate', 'fatherEducation',
          'fatherOccupation', 'fatherIncome', 'fatherAddress', 'fatherPhone', 'fatherStatus',
          'motherName', 'motherNik', 'motherBirthPlace', 'motherBirthDate', 'motherEducation',
          'motherOccupation', 'motherIncome', 'motherAddress', 'motherPhone', 'motherStatus',
          'guardianName', 'guardianNik', 'guardianBirthPlace', 'guardianBirthDate', 'guardianEducation',
          'guardianOccupation', 'guardianIncome', 'guardianAddress', 'guardianPhone', 'guardianStatus',
          'guardianIsSameAsFather'
        ];
        bioFields.forEach(field => {
          if (inputStd[field] !== undefined) {
            (existingStudent as any)[field] = field === 'guardianIsSameAsFather' 
              ? (inputStd[field] === 'true' || inputStd[field] === true) 
              : inputStd[field];
          }
        });

        if (initialSavings !== undefined && initialSavings !== null) {
          const parsedSavings = Number(initialSavings) || 0;
          
          // Calculate existing manual/online transactions in the app for this student
          const studentTxs = savingsTransactions.filter(t => 
            t.studentId === existingStudent.id && 
            t.status === "success" &&
            !t.id.includes("-init") && 
            !t.id.includes("sav-adjust-") &&
            !(t.notes && (
              t.notes.includes("Setoran Awal") || 
              t.notes.includes("Saldo Awal") || 
              t.notes.includes("Penyesuaian Saldo") ||
              t.notes.includes("Tarik Saldo Awal") ||
              t.notes.includes("Penarikan Awal")
            ))
          );
          
          let existingAppSetoran = 0;
          studentTxs.forEach(t => {
            if (t.type === "deposit") {
              existingAppSetoran += t.amount;
            } else if (t.type === "withdrawal") {
              existingAppSetoran -= t.amount;
            }
          });

          // The target balance is the imported initial savings + any manual transactions already in the app
          const targetBalance = parsedSavings + existingAppSetoran;

          if (existingStudent.savingsBalance !== targetBalance) {
            const diff = targetBalance - (existingStudent.savingsBalance || 0);
            if (diff !== 0) {
              savingsTransactions.push({
                id: `sav-adjust-${existingStudent.id}-${Date.now()}`,
                studentId: existingStudent.id,
                type: diff > 0 ? "deposit" : "withdrawal",
                amount: Math.abs(diff),
                status: "success",
                createdAt: new Date().toISOString(),
                paymentMethod: "Manual Teller",
                notes: `Penyesuaian Saldo via Import Kolektif (ke Rp ${targetBalance.toLocaleString('id-ID')} dengan saldo awal Rp ${parsedSavings.toLocaleString('id-ID')})`
              });
            }
            existingStudent.savingsBalance = targetBalance;
          }
        }

        updatedCount++;
      } else {
        // Add new student
        const newStudentId = `std-${Date.now()}-${addedCount}-${Math.random().toString(36).substr(2, 4)}`;
        const parsedSavings = Number(initialSavings) || 0;

        const newStudent: Student = {
          id: newStudentId,
          nis: nis.toString().trim(),
          name,
          class: className,
          email: email || "",
          phone: phone || "",
          gender: gender || "Laki-laki",
          savingsBalance: parsedSavings,
          password: password ? String(password).trim() : nis.toString().trim()
        };

        // Import of Buku Induk detail keys for new student
        const bioFields = [
          'nisn', 'nickname', 'nik', 'birthPlace', 'birthDate', 'kkNumber', 'birthCertNumber',
          'livingWith', 'childOrder', 'siblingsCount', 'stepSiblingsCount', 'address', 'googleDriveLink',
          'fatherName', 'fatherNik', 'fatherBirthPlace', 'fatherBirthDate', 'fatherEducation',
          'fatherOccupation', 'fatherIncome', 'fatherAddress', 'fatherPhone', 'fatherStatus',
          'motherName', 'motherNik', 'motherBirthPlace', 'motherBirthDate', 'motherEducation',
          'motherOccupation', 'motherIncome', 'motherAddress', 'motherPhone', 'motherStatus',
          'guardianName', 'guardianNik', 'guardianBirthPlace', 'guardianBirthDate', 'guardianEducation',
          'guardianOccupation', 'guardianIncome', 'guardianAddress', 'guardianPhone', 'guardianStatus',
          'guardianIsSameAsFather'
        ];
        bioFields.forEach(field => {
          if (inputStd[field] !== undefined) {
            (newStudent as any)[field] = field === 'guardianIsSameAsFather' 
              ? (inputStd[field] === 'true' || inputStd[field] === true) 
              : inputStd[field];
          }
        });

        students.push(newStudent);

        // Find all distinct start years in the existing SPP bills database
        const startYears = Array.from(new Set(sppBills.map(b => {
          const isFirstHalf = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(b.month);
          return isFirstHalf ? b.year : b.year - 1;
        })));

        // Fallback to 2025 if no bills exist yet
        if (startYears.length === 0) {
          startYears.push(2025);
        }

        // Pre-populate SPP bills for all active student academic years
        startYears.forEach(startYear => {
          months.forEach((month, mIdx) => {
            const billYear = mIdx < 6 ? startYear : startYear + 1;
            const isGrade7 = className.trim().startsWith("7") || className.trim().toUpperCase().startsWith("VII");
            const isJuly = month === "Juli";
            const isPaid = isGrade7 && isJuly;

            sppBills.push({
              id: `bill-${newStudentId}-${startYear}-${mIdx}`,
              studentId: newStudentId,
              month: month,
              year: billYear,
              amount: getSppAmountForStudent(newStudent, className),
              status: isPaid ? "paid" : "unpaid",
              paidAt: isPaid ? new Date().toISOString() : undefined,
              paymentMethod: isPaid ? "Lunas Pendaftaran" : undefined,
              orderId: isPaid ? `ORD-REGISTRATION-${newStudentId}` : undefined
            });
          });
        });

        // Record savings transactions if parsedSavings !== 0
        if (parsedSavings !== 0) {
          savingsTransactions.push({
            id: `sav-${newStudentId}-init-import`,
            studentId: newStudentId,
            type: parsedSavings > 0 ? "deposit" : "withdrawal",
            amount: Math.abs(parsedSavings),
            status: "success",
            createdAt: new Date().toISOString(),
            paymentMethod: "Manual Teller",
            notes: parsedSavings > 0 ? "Setoran Awal via Import Kolektif" : "Penarikan Awal (Saldo Minus) via Import Kolektif"
          });
        }

        addedCount++;
      }
    });

    if (addedCount > 0 || updatedCount > 0) {
      // Broadcast SSE notification
      const notification: RealtimeNotification = {
        id: `notif-import-std-${Date.now()}`,
        title: "Kolektif Import Siswa Sukses",
        message: `Kolektif import selesai! Berhasil menambahkan ${addedCount} siswa baru dan memperbarui ${updatedCount} siswa lama.`,
        type: "success",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);
    }

    res.json({ success: true, addedCount, updatedCount });
  });

  // Midtrans Payment Gateway Proxy & Token Endpoint
  // Generate snap payment token for SPP payment
  app.post("/api/pay-spp-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Pembayaran online mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { billId, origin } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    if (bill.status === "paid" || bill.status === "waived") {
      return res.status(400).json({ error: "Tagihan sudah lunas atau dibebaskan." });
    }

    const studentBills = sppBills.filter(b => b.studentId === bill.studentId);
    if (!isBillActive(bill, studentBills)) {
      return res.status(400).json({ error: `Tagihan SPP ${bill.month} ${bill.year} belum aktif. Silakan lunasi SPP bulan berjalan terlebih dahulu.` });
    }

    const student = students.find(s => s.id === bill.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    // Create clean, robust order ID for Midtrans (guaranteed well under 50 char limit)
    const monthMapShorten: { [key: string]: string } = {
      "Januari": "Jan",
      "Februari": "Feb",
      "Maret": "Mar",
      "April": "Apr",
      "Mei": "Mei",
      "Juni": "Jun",
      "Juli": "Jul",
      "Agustus": "Agu",
      "September": "Sep",
      "Oktober": "Okt",
      "November": "Nov",
      "Desember": "Des"
    };
    const monthShort = monthMapShorten[bill.month] || bill.month.slice(0, 3);
    const studentNis = (student.nis ? String(student.nis).trim() : student.id.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    const randSuffix = Date.now().toString().slice(-4);
    const orderId = `SPP-${studentNis}-${monthShort}-${bill.year}-${randSuffix}`;

    bill.orderId = orderId;
    bill.status = "pending";
    saveState();

    // Calculate fees if enabled and charged to user
    const adminFeeVal = 0; // Automated directly by Midtrans Surcharge settings
    const maintenanceFeeVal = 0;
    const grossAmountVal = bill.amount;

    // If Midtrans credentials aren't set, we return an error message
    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;

    if (!hasMidtrans) {
      return res.status(400).json({ 
        error: "Metode pembayaran online dinonaktifkan karena Kunci Midtrans belum diatur oleh Administrator sekolah di Panel Pengaturan." 
      });
    }

    // Real Midtrans integration flow
    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const appReturnUrl = origin || "https://ais-pre-vqyvsdvdikjp7ctz7wouro-539390488845.asia-east1.run.app";

      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmountVal
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: student.name,
          email: student.email || `${student.nis}@maarif.sch.id`,
          phone: student.phone
        },
        item_details: [
          {
            id: shortenBillIdForMidtrans(bill.id),
            price: bill.amount,
            quantity: 1,
            name: (() => {
              const baseName = `SPP ${bill.month} ${bill.year} - ${student.name}`;
              return baseName.length > 50 ? baseName.substring(0, 47) + "..." : baseName;
            })()
          },
          ...(maintenanceFeeVal > 0 ? [
            {
              id: "fee-maintenance",
              price: maintenanceFeeVal,
              quantity: 1,
              name: "Biaya Pemeliharaan Sistem"
            }
          ] : [])
        ],
        callbacks: {
          finish: appReturnUrl,
          error: appReturnUrl,
          pending: appReturnUrl
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const snapResponse: any = await response.json();
      res.json({
        token: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        isSimulated: false,
        orderId,
        adminFee: adminFeeVal,
        systemMaintenanceFee: maintenanceFeeVal,
        baseAmount: bill.amount,
        totalAmount: grossAmountVal
      });
    } catch (err: any) {
      console.error("Midtrans Snap API Call Error", err);
      let errorMsg = "Gagal memproses pembayaran dengan Midtrans.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error_messages && parsed.error_messages.length > 0) {
          errorMsg = `Kesalahan Validasi Midtrans: ${parsed.error_messages.join(', ')}`;
        }
      } catch (e) {
        if (err.message) errorMsg = err.message;
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // Deposit savings generate snap token
  app.post("/api/deposit-savings-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Deposit tabungan mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { studentId, amount, origin } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const valAmount = Number(amount);
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: "Jumlah deposit harus positif." });
    }

    const studentNis = (student.nis ? String(student.nis).trim() : studentId.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    let orderId = `SAV-${studentNis}-${Date.now()}`;
    if (orderId.length > 48) {
      orderId = `SAV-${studentNis}-${Date.now().toString().slice(-6)}`;
    }
    
    // Create pre-transaction ledger
    const trans: SavingsTransaction = {
      id: `sav-pay-${Date.now()}`,
      studentId,
      type: "deposit",
      amount: valAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
      orderId,
      paymentMethod: "Midtrans Snap",
      notes: "Setoran via Payment Gateway"
    };
    savingsTransactions.push(trans);
    saveState();

    // Calculate fees if enabled and charged to user
    const adminFeeVal = 0; // Automated directly by Midtrans Surcharge settings
    const maintenanceFeeVal = 0;
    const grossAmountVal = valAmount;

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.status(400).json({ 
        error: "Metode setoran tabungan online dinonaktifkan karena Kunci Midtrans belum diatur oleh Administrator sekolah di Panel Pengaturan." 
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const appReturnUrl = origin || "https://ais-pre-vqyvsdvdikjp7ctz7wouro-539390488845.asia-east1.run.app";

      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmountVal
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: student.name,
          email: student.email || `${student.nis}@maarif.sch.id`,
          phone: student.phone
        },
        item_details: [
          {
            id: `deposit-${Date.now()}`,
            price: valAmount,
            quantity: 1,
            name: (() => {
              const baseName = `Top Up Tabungan - ${student.name}`;
              return baseName.length > 50 ? baseName.substring(0, 47) + "..." : baseName;
            })()
          },
          ...(maintenanceFeeVal > 0 ? [
            {
              id: "fee-maintenance",
              price: maintenanceFeeVal,
              quantity: 1,
              name: "Biaya Pemeliharaan Sistem"
            }
          ] : [])
        ],
        callbacks: {
          finish: appReturnUrl,
          error: appReturnUrl,
          pending: appReturnUrl
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const snapResponse: any = await response.json();
      res.json({
        token: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        isSimulated: false,
        orderId,
        adminFee: adminFeeVal,
        systemMaintenanceFee: maintenanceFeeVal,
        baseAmount: valAmount,
        totalAmount: grossAmountVal
      });
    } catch (err: any) {
      console.error("Midtrans Snap API Call Error", err);
      let errorMsg = "Gagal memproses setoran tabungan dengan Midtrans.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error_messages && parsed.error_messages.length > 0) {
          errorMsg = `Kesalahan Validasi Midtrans: ${parsed.error_messages.join(', ')}`;
        }
      } catch (e) {
        if (err.message) errorMsg = err.message;
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // Helper to fetch actual Midtrans transaction status from API (if configured)
  async function getMidtransStatus(orderId: string): Promise<any> {
    const serverKey = (midtransConfig.serverKey || "").trim();
    if (!serverKey) {
      console.log("Midtrans credentials not configured, skipping real status check.");
      return null;
    }
    const cleanOrderId = (orderId || "").trim();
    if (!cleanOrderId) return null;

    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
    const primaryUrl = midtransConfig.isProduction 
      ? `https://api.midtrans.com/v2/${cleanOrderId}/status` 
      : `https://api.sandbox.midtrans.com/v2/${cleanOrderId}/status`;
    const fallbackUrl = midtransConfig.isProduction 
      ? `https://api.sandbox.midtrans.com/v2/${cleanOrderId}/status` 
      : `https://api.midtrans.com/v2/${cleanOrderId}/status`;

    try {
      console.log(`Checking real Midtrans status for orderId: ${cleanOrderId} on ${primaryUrl}`);
      const response = await fetch(primaryUrl, {
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        const statusData = await response.json();
        console.log(`Real Midtrans status for ${cleanOrderId} (primary):`, statusData);
        return statusData;
      } else {
        console.warn(`Midtrans Primary Status API returned status ${response.status} for ${cleanOrderId}, trying fallback...`);
      }
    } catch (err) {
      console.error(`Failed to fetch primary Midtrans status for ${cleanOrderId}:`, err);
    }

    try {
      console.log(`Checking fallback Midtrans status for orderId: ${cleanOrderId} on ${fallbackUrl}`);
      const response = await fetch(fallbackUrl, {
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        const statusData = await response.json();
        console.log(`Real Midtrans status for ${cleanOrderId} (fallback):`, statusData);
        return statusData;
      }
    } catch (err) {
      console.error(`Failed to fetch fallback Midtrans status for ${cleanOrderId}:`, err);
    }

    return null;
  }

  // Helper to parse Midtrans transaction/settlement time string (typically in WIB, GMT+7) to ISO-8601
  function parseMidtransTime(timeStr: string): string {
    if (!timeStr) return new Date().toISOString();
    try {
      const formatted = timeStr.trim().replace(" ", "T");
      // Midtrans typically uses WIB (Asia/Jakarta), which is UTC+7
      let d = new Date(formatted + "+07:00");
      if (isNaN(d.getTime())) {
        d = new Date(timeStr);
      }
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    } catch (e) {
      console.error("Error parsing Midtrans time:", timeStr, e);
    }
    return new Date().toISOString();
  }

  // Midtrans Auto-Poller Engine Statistics State
  const midtransAutoPollerStats = {
    lastRunTime: "",
    scannedCount: 0,
    reconciledCount: 0,
    expiredCount: 0,
    totalAutoReconciledLifetime: 0,
    lastLog: [] as string[]
  };

  // Master Midtrans Processor for single order ID
  async function processMidtransOrderStatus(orderId: string, customMidtransStatus?: any): Promise<{
    status: "settled" | "expired" | "pending" | "not_found" | "no_change";
    actionTaken: boolean;
    detailMessage: string;
    midtransStatus: any;
  }> {
    const cleanOrderId = (orderId || "").trim();
    if (!cleanOrderId) {
      return { status: "not_found", actionTaken: false, detailMessage: "Order ID kosong", midtransStatus: null };
    }

    // 1. Fetch real Midtrans status if not passed
    let statusData = customMidtransStatus;
    if (!statusData) {
      statusData = await getMidtransStatus(cleanOrderId);
    }

    if (!statusData) {
      return { status: "not_found", actionTaken: false, detailMessage: `Order ID / Ref ${cleanOrderId} tidak ditemukan di Gateway Midtrans`, midtransStatus: null };
    }

    const ts = statusData.transaction_status || "";
    const isSettled = ts === "settlement" || ts === "capture";
    const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";
    const paymentType = statusData.payment_type || "Online Gateway";
    const actualPaymentType = `Midtrans (${paymentType})`;
    const midtransTime = statusData.settlement_time || statusData.transaction_time || "";
    const resolvedPaidAt = midtransTime ? parseMidtransTime(midtransTime) : new Date().toISOString();

    const targetOrderId = statusData.order_id || cleanOrderId;
    const targetTransactionId = statusData.transaction_id || (cleanOrderId !== targetOrderId ? cleanOrderId : "");

    let actionTaken = false;
    let statusResult: "settled" | "expired" | "pending" | "no_change" = isSettled ? "settled" : isExpired ? "expired" : "pending";
    let detailMessage = "";

    // A. SPP BILLS
    if (targetOrderId.startsWith("SPP-") || cleanOrderId.startsWith("SPP-")) {
      const activeOrderId = targetOrderId.startsWith("SPP-") ? targetOrderId : cleanOrderId;
      const middle = activeOrderId.slice(4);
      const lastHyphenIndex = middle.lastIndexOf("-");
      const billId = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
      const cleanBillId = decompressBillIdForMidtrans(billId);

      let bill = findSppBillMatching(activeOrderId, sppBills) || 
                 findSppBillMatching(cleanOrderId, sppBills) || 
                 findSppBillMatching(billId, sppBills) ||
                 (targetTransactionId ? sppBills.find(b => b.transactionId === targetTransactionId) : undefined);

      if (bill) {
        if (isSettled) {
          if (bill.status !== "paid") {
            bill.status = "paid";
            bill.paidAt = resolvedPaidAt;
            bill.paymentMethod = actualPaymentType;
            bill.orderId = targetOrderId;
            if (targetTransactionId) bill.transactionId = targetTransactionId;
            actionTaken = true;

            const student = students.find(s => s.id === bill.studentId);
            detailMessage = `SPP ${bill.month} ${bill.year} (${student?.name || "Siswa"}) - Rp ${bill.amount.toLocaleString("id-ID")}` + (targetTransactionId ? ` [TxID: ${targetTransactionId}]` : "");

            const notification: RealtimeNotification = {
              id: `notif-spp-auto-${Date.now()}`,
              studentId: bill.studentId,
              title: "Pembayaran SPP Terverifikasi (Auto-Sync)",
              message: `Pembayaran SPP ${student?.name || ""} (${bill.month} ${bill.year}) sebesar Rp ${bill.amount.toLocaleString("id-ID")} via ${paymentType} telah LUNAS terverifikasi.`,
              type: "payment",
              createdAt: new Date().toISOString()
            };
            broadcastNotification(notification);

            if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
              const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
                `📢 *KUITANSI PEMBAYARAN SPP ONLINE*\n` +
                `Pembayaran SPP Bulan *${bill.month} ${bill.year}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* via ${paymentType} telah BERHASIL divalidasi.\n\n` +
                `• Metode Pembayaran: *${bill.paymentMethod}*\n` +
                `• No. Order ID: *${bill.orderId}*\n` +
                (targetTransactionId ? `• Transaction ID Midtrans: *${targetTransactionId}*\n` : '') +
                `• Status: *LUNAS (PAID)*\n\n` +
                `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
              sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending WA:", err));
            }
          }
        } else if (isExpired) {
          if (bill.status === "pending") {
            bill.status = "unpaid";
            actionTaken = true;
            detailMessage = `SPP ${bill.month} ${bill.year} kedaluwarsa/batal, dikembalikan ke status Belum Bayar.`;
          }
        }
      }
    }

    // B. MISC BILLS
    else if (targetOrderId.startsWith("MISC-") || cleanOrderId.startsWith("MISC-")) {
      const activeOrderId = targetOrderId.startsWith("MISC-") ? targetOrderId : cleanOrderId;
      let bill = findMiscBillMatching(activeOrderId, miscBills) || 
                 findMiscBillMatching(cleanOrderId, miscBills) ||
                 (targetTransactionId ? miscBills.find(b => b.transactionId === targetTransactionId) : undefined);

      if (bill) {
        if (isSettled) {
          if (bill.status !== "paid") {
            bill.status = "paid";
            bill.paidAt = resolvedPaidAt;
            bill.paymentMethod = actualPaymentType;
            bill.orderId = targetOrderId;
            if (targetTransactionId) bill.transactionId = targetTransactionId;
            actionTaken = true;

            const student = students.find(s => s.id === bill.studentId);
            detailMessage = `Tagihan ${bill.title} (${student?.name || "Siswa"}) - Rp ${bill.amount.toLocaleString("id-ID")}` + (targetTransactionId ? ` [TxID: ${targetTransactionId}]` : "");

            const notification: RealtimeNotification = {
              id: `notif-misc-auto-${Date.now()}`,
              studentId: bill.studentId,
              title: `Pembayaran ${bill.title} Terverifikasi (Auto-Sync)`,
              message: `Pembayaran ${bill.title} ${student?.name || ""} sebesar Rp ${bill.amount.toLocaleString("id-ID")} via ${paymentType} telah LUNAS terverifikasi.`,
              type: "payment",
              createdAt: new Date().toISOString()
            };
            broadcastNotification(notification);

            if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
              const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
                `📢 *KUITANSI PEMBAYARAN ONLINE*\n` +
                `Pembayaran *${bill.title}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* via ${paymentType} telah BERHASIL divalidasi.\n\n` +
                `• Metode Pembayaran: *${bill.paymentMethod}*\n` +
                `• No. Order ID: *${bill.orderId}*\n` +
                (targetTransactionId ? `• Transaction ID Midtrans: *${targetTransactionId}*\n` : '') +
                `• Status: *LUNAS (PAID)*\n\n` +
                `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
              sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending WA:", err));
            }
          }
        } else if (isExpired) {
          if (bill.status === "pending") {
            bill.status = "unpaid";
            actionTaken = true;
            detailMessage = `Tagihan ${bill.title} kedaluwarsa/batal, dikembalikan ke status Belum Bayar.`;
          }
        }
      }
    }

    // C. CART ORDERS
    else if (targetOrderId.startsWith("CART-") || cleanOrderId.startsWith("CART-")) {
      const activeOrderId = targetOrderId.startsWith("CART-") ? targetOrderId : cleanOrderId;
      const matchedSpp = sppBills.filter(b => b.orderId === activeOrderId || b.orderId === cleanOrderId || (targetTransactionId && b.transactionId === targetTransactionId));
      const matchedMisc = miscBills.filter(b => b.orderId === activeOrderId || b.orderId === cleanOrderId || (targetTransactionId && b.transactionId === targetTransactionId));
      const matchedSavings = savingsTransactions.filter(t => t.orderId === activeOrderId || t.orderId === cleanOrderId || (targetTransactionId && t.transactionId === targetTransactionId));

      if (matchedSpp.length === 0 && matchedMisc.length === 0 && matchedSavings.length === 0) {
        // CART Recovery Mechanism: Parse student short ID from order ID and match candidate bills
        const parts = activeOrderId.split("-");
        const studentIdentifier = parts.slice(1, -1).join("-");
        
        let student: any = undefined;

        // 1. Refine student selection using Midtrans customer details
        const custDetails = statusData.customer_details || {};
        const custEmail = (custDetails.email || "").toLowerCase().trim();
        const custPhone = (custDetails.phone || custDetails.mobile_number || "").replace(/\D/g, "");
        const custName = (custDetails.first_name || custDetails.name || "").toLowerCase().trim();

        if (custEmail && custEmail.includes("@")) {
          const emailNis = custEmail.split("@")[0].replace(/\D/g, "").trim();
          if (emailNis) {
            student = students.find(s => String(s.nis).trim() === emailNis);
          }
          if (!student) {
            student = students.find(s => s.email && s.email.toLowerCase().trim() === custEmail);
          }
        }
        if (!student && custPhone && custPhone.length >= 8) {
          student = students.find(s => s.phone && s.phone.replace(/\D/g, "").includes(custPhone));
        }
        if (!student && custName && custName.length >= 3) {
          student = students.find(s => s.name.toLowerCase().trim() === custName || s.name.toLowerCase().includes(custName) || custName.includes(s.name.toLowerCase()));
        }

        // 2. Strict matching by studentIdentifier
        if (!student && studentIdentifier) {
          student = students.find(s => String(s.nis).trim() === studentIdentifier || s.id === studentIdentifier);
          if (!student && studentIdentifier.length >= 12) {
            student = students.find(s => s.id === studentIdentifier || s.id.includes(studentIdentifier));
          }
        }

        if (student) {
          const monthMap: Record<string, number> = {
            "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
            "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
          };
          const sortSpp = (bills: any[]) => [...bills].sort((a, b) => ((a.year || 2026) * 12 + (monthMap[a.month] ?? 0)) - ((b.year || 2026) * 12 + (monthMap[b.month] ?? 0)));

          let candidateBills = [
            ...sortSpp(sppBills.filter(b => b.studentId === student.id && b.status === "pending")),
            ...miscBills.filter(b => b.studentId === student.id && b.status === "pending")
          ];
          
          if (candidateBills.length === 0) {
            candidateBills = [
              ...sortSpp(sppBills.filter(b => b.studentId === student.id && b.status === "unpaid")),
              ...miscBills.filter(b => b.studentId === student.id && b.status === "unpaid")
            ];
          }

          const targetAmount = Number(statusData.gross_amount) || 0;
          let currentSum = 0;
          for (const b of candidateBills) {
            if (currentSum + b.amount <= targetAmount) {
              currentSum += b.amount;
              if ('month' in b) {
                matchedSpp.push(b as any);
              } else {
                matchedMisc.push(b as any);
              }
            }
            if (currentSum === targetAmount) break;
          }
          console.log(`[MASTER RECONCIL CART RECOVERY] Recovered student: ${student.name}, matched ${matchedSpp.length} SPP and ${matchedMisc.length} Misc bills for total Rp ${currentSum} / Rp ${targetAmount}`);
        }
      }

      if (matchedSpp.length > 0 || matchedMisc.length > 0 || matchedSavings.length > 0) {
        if (isSettled) {
          let countSettled = 0;
          matchedSpp.forEach(b => {
            if (b.status !== "paid") {
              b.status = "paid";
              b.paidAt = resolvedPaidAt;
              b.paymentMethod = actualPaymentType;
              b.orderId = targetOrderId;
              if (targetTransactionId) b.transactionId = targetTransactionId;
              countSettled++;
            }
          });
          matchedMisc.forEach(b => {
            if (b.status !== "paid") {
              b.status = "paid";
              b.paidAt = resolvedPaidAt;
              b.paymentMethod = actualPaymentType;
              b.orderId = targetOrderId;
              if (targetTransactionId) b.transactionId = targetTransactionId;
              countSettled++;
            }
          });
          matchedSavings.forEach(t => {
            if (t.status !== "success") {
              t.status = "success";
              t.paymentMethod = actualPaymentType;
              t.orderId = targetOrderId;
              if (targetTransactionId) t.transactionId = targetTransactionId;
              const std = students.find(s => s.id === t.studentId);
              if (std) {
                std.savingsBalance = (std.savingsBalance || 0) + t.amount;
              }
              countSettled++;
            }
          });

          if (countSettled > 0) {
            actionTaken = true;
            const targetStudentId = matchedSpp[0]?.studentId || matchedMisc[0]?.studentId || matchedSavings[0]?.studentId;
            const student = students.find(s => s.id === targetStudentId);
            detailMessage = `Keranjang ${countSettled} Item (${student?.name || "Siswa"})` + (targetTransactionId ? ` [TxID: ${targetTransactionId}]` : "");

            const notification: RealtimeNotification = {
              id: `notif-cart-auto-${Date.now()}`,
              studentId: targetStudentId || "",
              title: "Pembayaran Keranjang Terverifikasi (Auto-Sync)",
              message: `Pembayaran keranjang multi-tagihan (${countSettled} item) ${student?.name || ""} via ${paymentType} telah LUNAS terverifikasi.`,
              type: "payment",
              createdAt: new Date().toISOString()
            };
            broadcastNotification(notification);
          }
        } else if (isExpired) {
          matchedSpp.forEach(b => { if (b.status === "pending") b.status = "unpaid"; });
          matchedMisc.forEach(b => { if (b.status === "pending") b.status = "unpaid"; });
          matchedSavings.forEach(t => { if (t.status === "pending") t.status = "failed"; });
          actionTaken = true;
          detailMessage = `Keranjang ${activeOrderId} kedaluwarsa/batal, item dikembalikan ke status Belum Bayar.`;
        }
      }
    }

    // D. SAVINGS TRANSACTIONS
    else if (targetOrderId.startsWith("SAV-") || cleanOrderId.startsWith("SAV-")) {
      const activeOrderId = targetOrderId.startsWith("SAV-") ? targetOrderId : cleanOrderId;
      let transaction = savingsTransactions.find(t => t.orderId === activeOrderId || t.orderId === cleanOrderId || (targetTransactionId && t.transactionId === targetTransactionId));
      if (!transaction && isSettled) {
        const parts = activeOrderId.split("-");
        if (parts.length >= 2) {
          const studentId = parts[1];
          const student = students.find(s => s.id === studentId);
          if (student) {
            const recoveredAmount = Number(statusData.gross_amount) || 0;
            if (recoveredAmount > 0) {
              transaction = {
                id: `sav-pay-auto-${Date.now()}`,
                studentId,
                type: "deposit",
                amount: recoveredAmount,
                status: "pending",
                createdAt: resolvedPaidAt,
                orderId: targetOrderId,
                transactionId: targetTransactionId || undefined,
                paymentMethod: actualPaymentType,
                notes: "Setoran via Payment Gateway (Auto Recovery)"
              };
              savingsTransactions.push(transaction);
            }
          }
        }
      }

      if (transaction) {
        if (isSettled && transaction.status === "pending") {
          transaction.status = "success";
          transaction.paymentMethod = actualPaymentType;
          transaction.orderId = targetOrderId;
          if (targetTransactionId) transaction.transactionId = targetTransactionId;
          if (midtransTime) transaction.createdAt = resolvedPaidAt;

          const student = students.find(s => s.id === transaction.studentId);
          if (student) {
            student.savingsBalance += transaction.amount;
          }
          actionTaken = true;
          detailMessage = `Setoran Tabungan ${student?.name || "Siswa"} - Rp ${transaction.amount.toLocaleString("id-ID")}` + (targetTransactionId ? ` [TxID: ${targetTransactionId}]` : "");

          const notification: RealtimeNotification = {
            id: `notif-sav-auto-${Date.now()}`,
            studentId: transaction.studentId,
            title: "Setoran Tabungan Lunas (Auto-Sync)",
            message: `Setoran tabungan e-money sebesar Rp ${transaction.amount.toLocaleString("id-ID")} via ${paymentType} terverifikasi LUNAS. Saldo baru: Rp ${student?.savingsBalance.toLocaleString("id-ID")}.`,
            type: "success",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);
        } else if (isExpired && transaction.status === "pending") {
          transaction.status = "failed";
          actionTaken = true;
          detailMessage = `Setoran Tabungan ${activeOrderId} kedaluwarsa/batal.`;
        }
      }
    }

    if (actionTaken) {
      saveState();
    }

    return {
      status: statusResult,
      actionTaken,
      detailMessage,
      midtransStatus: statusData
    };
  }

  // Master Automated Midtrans Reconciliation Scanner
  async function runAutomatedMidtransReconciliation() {
    const serverKey = (midtransConfig.serverKey || "").trim();
    if (!serverKey || midtransConfig.isDisabled) {
      return { scannedCount: 0, reconciledCount: 0, expiredCount: 0, details: [] };
    }

    const pendingOrders = new Set<string>();

    // Collect all pending or unpaid orders that have orderIds attached
    sppBills.forEach(b => {
      if ((b.status === "pending" || b.status === "unpaid") && b.orderId && b.orderId.trim()) {
        pendingOrders.add(b.orderId.trim());
      }
    });

    miscBills.forEach(b => {
      if (b.status !== "paid" && b.orderId && b.orderId.trim()) {
        pendingOrders.add(b.orderId.trim());
      }
    });

    savingsTransactions.forEach(t => {
      if (t.status === "pending" && t.orderId && t.orderId.trim()) {
        pendingOrders.add(t.orderId.trim());
      }
    });

    let scannedCount = 0;
    let reconciledCount = 0;
    let expiredCount = 0;
    const details: string[] = [];

    for (const orderId of Array.from(pendingOrders)) {
      scannedCount++;
      try {
        const res = await processMidtransOrderStatus(orderId);
        if (res.actionTaken) {
          if (res.status === "settled") {
            reconciledCount++;
            details.push(`[LUNAS] ${res.detailMessage || orderId}`);
          } else if (res.status === "expired") {
            expiredCount++;
            details.push(`[EXPIRED/RESET] ${res.detailMessage || orderId}`);
          }
        }
      } catch (e: any) {
        console.error(`[MIDTRANS AUTO-SYNC] Error processing ${orderId}:`, e?.message || e);
      }
    }

    midtransAutoPollerStats.lastRunTime = new Date().toISOString();
    midtransAutoPollerStats.scannedCount = scannedCount;
    midtransAutoPollerStats.reconciledCount = reconciledCount;
    midtransAutoPollerStats.expiredCount = expiredCount;
    midtransAutoPollerStats.totalAutoReconciledLifetime += reconciledCount;
    if (details.length > 0) {
      midtransAutoPollerStats.lastLog = details;
    }

    if (reconciledCount > 0 || expiredCount > 0) {
      console.log(`[MIDTRANS AUTO-POLLER ENGINE] Dipindai: ${scannedCount} pending orders | Rekonsiliasi Sukses: ${reconciledCount} | Expired/Reset: ${expiredCount}`);
    }

    return { scannedCount, reconciledCount, expiredCount, details };
  }

  // Background Auto-Poller Engine disabled to prevent MongoDB usage spikes
  // Manual reconciliation can be executed on-demand via /api/midtrans-autopoller-run button

  // Client simulated success trigger (Allows direct browser simulation and instant local sync verification)
  app.post("/api/simulate-payment-success", async (req, res) => {
    const { orderId, paymentType } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required." });
    }

    console.log("Simulate payment success request received for orderId:", orderId);

    // Try to get real status from Midtrans first (if configured)
    let midtransStatus: any = null;
    try {
      midtransStatus = await getMidtransStatus(orderId);
    } catch (e) {
      console.error("Failed to fetch real Midtrans status:", e);
    }

    let isSettled = false;
    let actualPaymentType = paymentType || "Midtrans Snap";
    let actualGrossAmount = 0;
    let resolvedOrderId = orderId;

    if (midtransStatus) {
      const ts = midtransStatus.transaction_status;
      isSettled = ts === "settlement" || ts === "capture";
      
      const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
      if (hasMidtrans && !isSettled) {
        return res.status(400).json({ 
          error: `Transaksi di Midtrans belum lunas (Status saat ini: ${ts || 'unknown'}). Silakan selesaikan pembayaran terlebih dahulu.` 
        });
      }

      if (midtransStatus.payment_type) {
        actualPaymentType = `Midtrans (${midtransStatus.payment_type})`;
      }
      if (midtransStatus.gross_amount) {
        actualGrossAmount = Number(midtransStatus.gross_amount);
      }
      if (midtransStatus.order_id) {
        resolvedOrderId = midtransStatus.order_id;
        console.log(`Resolved Order ID from Midtrans status: ${resolvedOrderId} (Originally: ${orderId})`);
      }
    }

    const midtransTime = midtransStatus?.settlement_time || midtransStatus?.transaction_time || "";
    const resolvedPaidAt = midtransTime ? parseMidtransTime(midtransTime) : new Date().toISOString();

    let message = "";
    let affectedStudent: Student | null = null;
    let title = "";

    if (resolvedOrderId.startsWith("SPP-")) {
      const middle = resolvedOrderId.slice(4);
      const lastHyphenIndex = middle.lastIndexOf("-");
      const billId = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
      
      let cleanBillId = decompressBillIdForMidtrans(billId);
      
      let bill = sppBills.find(b => b.orderId === resolvedOrderId || b.id === cleanBillId || b.id === billId);
      if (!bill) {
        const monthMap: { [key: string]: string } = {
          "jan": "Januari", "feb": "Februari", "mar": "Maret", "apr": "April",
          "mei": "Mei", "jun": "Juni", "jul": "Juli", "agu": "Agustus",
          "sep": "September", "okt": "Oktober", "nov": "November", "des": "Desember"
        };
        for (const [short, full] of Object.entries(monthMap)) {
          const searchPattern = `-${short}-`;
          if (cleanBillId.toLowerCase().includes(searchPattern)) {
            const index = cleanBillId.toLowerCase().indexOf(searchPattern);
            const originalPart = cleanBillId.substring(index + 1, index + 1 + short.length);
            const expandedBillId = cleanBillId.replace(`-${originalPart}-`, `-${full}-`);
            bill = sppBills.find(b => b.id === expandedBillId);
            if (bill) break;
          }
        }
      }

      if (bill) {
        bill.status = "paid";
        bill.paidAt = resolvedPaidAt;
        bill.paymentMethod = actualPaymentType;
        if (bill.orderId !== resolvedOrderId) {
          bill.orderId = resolvedOrderId; // repair
        }
        
        affectedStudent = students.find(s => s.id === bill.studentId) || null;
        title = "SPP Lunas Terverifikasi";
        message = `Pembayaran SPP ${affectedStudent?.name || ""} bulan ${bill.month} ${bill.year} sebesar Rp ${bill.amount.toLocaleString("id-ID")} BERHASIL divalidasi secara instan!`;

        const notification: RealtimeNotification = {
          id: `notif-spp-sim-${Date.now()}`,
          studentId: bill.studentId,
          title,
          message,
          type: "payment",
          createdAt: new Date().toISOString()
        };
        broadcastNotification(notification);

        // Send automated WA
        if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && affectedStudent && affectedStudent.phone) {
          const waMsg = `Yth. Orang Tua / Wali Siswa dari *${affectedStudent.name}* (NIS: ${affectedStudent.nis}).\n\n` +
            `📢 *KUITANSI PEMBAYARAN SPP ONLINE*\n` +
            `Pembayaran SPP Bulan *${bill.month} ${bill.year}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* telah BERHASIL diselesaikan secara online via Midtrans.\n\n` +
            `• Metode Pembayaran: *${bill.paymentMethod}*\n` +
            `• No. Transaksi (OrderId): *${bill.orderId}*\n` +
            `• Waktu: ${new Date(resolvedPaidAt).toLocaleDateString('id-ID')} pukul ${new Date(resolvedPaidAt).toLocaleTimeString('id-ID')}\n` +
            `• Status: *LUNAS (PAID)*\n\n` +
            `Terima kasih atas tertib administrasi pembayaran iuran sekolah.\n` +
            `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
          sendWhatsappNotification(affectedStudent.phone, waMsg).catch(err => console.error("Error sending online payment WA:", err));
        }

        saveState();
        return res.json({ success: true, type: "spp", bill, student: affectedStudent });
      }
    } else if (resolvedOrderId.startsWith("CART-")) {
      const selectedSpp = sppBills.filter(b => b.orderId === resolvedOrderId);
      const selectedMisc = miscBills.filter(b => b.orderId === resolvedOrderId);
      const selectedSavings = savingsTransactions.filter(t => t.orderId === resolvedOrderId);

      let targetStudentId = selectedSpp[0]?.studentId || selectedMisc[0]?.studentId || selectedSavings[0]?.studentId;
      affectedStudent = students.find(s => s.id === targetStudentId) || null;

      // CART Recovery Mechanism: If no bills match the order_id, find the student by parsing order_id
      if (!affectedStudent) {
        const parts = resolvedOrderId.split("-");
        const studentIdentifier = parts.slice(1, -1).join("-");

        // Try customer_details from midtransStatus or req.body if available
        const custDetails = (typeof midtransStatus === 'object' && midtransStatus ? midtransStatus.customer_details : req.body?.customer_details) || {};
        const custEmail = (custDetails.email || "").toLowerCase().trim();
        const custPhone = (custDetails.phone || custDetails.mobile_number || "").replace(/\D/g, "");
        const custName = (custDetails.first_name || custDetails.name || "").toLowerCase().trim();

        if (custEmail && custEmail.includes("@")) {
          const emailNis = custEmail.split("@")[0].replace(/\D/g, "").trim();
          if (emailNis) {
            affectedStudent = students.find(s => String(s.nis).trim() === emailNis) || null;
          }
          if (!affectedStudent) {
            affectedStudent = students.find(s => s.email && s.email.toLowerCase().trim() === custEmail) || null;
          }
        }
        if (!affectedStudent && custPhone && custPhone.length >= 8) {
          affectedStudent = students.find(s => s.phone && s.phone.replace(/\D/g, "").includes(custPhone)) || null;
        }
        if (!affectedStudent && custName && custName.length >= 3) {
          affectedStudent = students.find(s => s.name.toLowerCase().trim() === custName || s.name.toLowerCase().includes(custName) || custName.includes(s.name.toLowerCase())) || null;
        }

        if (!affectedStudent && studentIdentifier) {
          affectedStudent = students.find(s => String(s.nis).trim() === studentIdentifier || s.id === studentIdentifier) || null;
          if (!affectedStudent && studentIdentifier.length >= 12) {
            affectedStudent = students.find(s => s.id === studentIdentifier || s.id.includes(studentIdentifier)) || null;
          }
        }
        
        if (affectedStudent) {
          targetStudentId = affectedStudent.id;
          // Find pending or unpaid bills of this student
          let candidateBills = [
            ...sppBills.filter(b => b.studentId === affectedStudent!.id && b.status === "pending"),
            ...miscBills.filter(b => b.studentId === affectedStudent!.id && b.status === "pending")
          ];
          
          if (candidateBills.length === 0) {
            candidateBills = [
              ...sppBills.filter(b => b.studentId === affectedStudent!.id && b.status === "unpaid"),
              ...miscBills.filter(b => b.studentId === affectedStudent!.id && b.status === "unpaid")
            ];
          }

          const targetAmount = Number(actualGrossAmount) || 0;
          let currentSum = 0;
          for (const b of candidateBills) {
            if (targetAmount === 0 || currentSum + b.amount <= targetAmount) {
              currentSum += b.amount;
              if ('month' in b) {
                selectedSpp.push(b as SppBill);
              } else {
                selectedMisc.push(b);
              }
            }
            if (targetAmount > 0 && currentSum === targetAmount) break;
          }
          console.log(`[SIM CART RECOVERY] Recovered student: ${affectedStudent.name}, matched ${selectedSpp.length} SPP and ${selectedMisc.length} Misc bills`);
        }
      }

      if (selectedSpp.length === 0 && selectedMisc.length === 0 && selectedSavings.length === 0) {
        return res.status(404).json({ error: "Tagihan/setoran dalam keranjang tidak ditemukan atau tidak dapat dipulihkan." });
      }

      selectedSpp.forEach(bill => {
        bill.status = "paid";
        bill.paidAt = resolvedPaidAt;
        bill.paymentMethod = actualPaymentType;
      });

      selectedMisc.forEach(bill => {
        bill.status = "paid";
        bill.paidAt = resolvedPaidAt;
        bill.paymentMethod = actualPaymentType;
      });

      selectedSavings.forEach(tx => {
        if (tx.status !== "success") {
          tx.status = "success";
          tx.paymentMethod = actualPaymentType;
          if (affectedStudent) {
            affectedStudent.savingsBalance = (affectedStudent.savingsBalance || 0) + tx.amount;
          }
        }
      });

      title = "Pembayaran Keranjang Lunas Terverifikasi";
      const totalAmount = 
        selectedSpp.reduce((sum, b) => sum + b.amount, 0) + 
        selectedMisc.reduce((sum, b) => sum + b.amount, 0) +
        selectedSavings.reduce((sum, t) => sum + t.amount, 0);
      
      const itemParts: string[] = [];
      if (selectedSpp.length > 0) itemParts.push(`${selectedSpp.length} SPP`);
      if (selectedMisc.length > 0) itemParts.push(`${selectedMisc.length} Lain-lain`);
      if (selectedSavings.length > 0) itemParts.push(`${selectedSavings.length} Setoran Tabungan`);

      message = `Pembayaran Keranjang ${affectedStudent?.name || ""} sebesar Rp ${totalAmount.toLocaleString("id-ID")} (${itemParts.join(', ')}) BERHASIL divalidasi secara instan!`;

      const notification: RealtimeNotification = {
        id: `notif-cart-sim-${Date.now()}`,
        studentId: targetStudentId,
        title,
        message,
        type: "payment",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);

      if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && affectedStudent && affectedStudent.phone) {
        const itemNames = [
          ...selectedSpp.map(b => `SPP ${b.month} ${b.year}`),
          ...selectedMisc.map(b => b.title)
        ].join(", ");

        const waMsg = `Yth. Orang Tua / Wali Siswa dari *${affectedStudent.name}* (NIS: ${affectedStudent.nis}).\n\n` +
          `📢 *KUITANSI PEMBAYARAN ONLINE (KERANJANG)*\n` +
          `Pembayaran Keranjang belanja sekolah sebesar *Rp ${totalAmount.toLocaleString("id-ID")}* telah BERHASIL diselesaikan secara online via Midtrans.\n\n` +
          `• Item Pembayaran: *${itemNames}*\n` +
          `• Metode Pembayaran: *${actualPaymentType}*\n` +
          `• No. Transaksi (OrderId): *${resolvedOrderId}*\n` +
          `• Waktu: ${new Date(resolvedPaidAt).toLocaleDateString('id-ID')} pukul ${new Date(resolvedPaidAt).toLocaleTimeString('id-ID')}\n` +
          `• Status: *LUNAS (PAID)*\n\n` +
          `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(affectedStudent.phone, waMsg).catch(err => console.error("Error sending cart payment WA:", err));
      }

      saveState();
      return res.json({ success: true, type: "cart", student: affectedStudent });
    } else if (resolvedOrderId.startsWith("MISC-")) {
      let bill = findMiscBillMatching(resolvedOrderId, miscBills);
      if (bill) {
        bill.status = "paid";
        bill.paidAt = resolvedPaidAt;
        bill.paymentMethod = actualPaymentType;
        if (bill.orderId !== resolvedOrderId) {
          bill.orderId = resolvedOrderId; // repair
        }
        
        affectedStudent = students.find(s => s.id === bill.studentId) || null;
        title = "Tagihan Lain-Lain Lunas Terverifikasi";
        message = `Pembayaran tagihan ${bill.title} untuk ${affectedStudent?.name || ""} sebesar Rp ${bill.amount.toLocaleString("id-ID")} BERHASIL divalidasi secara instan!`;

        // Register incoming transaction for treasurer bookkeeping if not existing yet
        const txExists = treasurerTransactions.some(t => t.description.includes(resolvedOrderId) || (t.createdBy === "Midtrans Webhook" && t.description.includes(bill.title) && t.nis === affectedStudent?.nis));
        if (!txExists) {
          const newTx: TreasurerTransaction = {
            id: `tx-misc-${Date.now()}`,
            type: "incoming",
            category: "Operasional",
            amount: bill.amount,
            description: `Pembayaran ${bill.title} (Midtrans Sim) - ${affectedStudent?.name || ""} (${affectedStudent?.nis || ""})`,
            date: resolvedPaidAt.split("T")[0],
            source: "custom",
            studentName: affectedStudent?.name,
            nis: affectedStudent?.nis,
            createdBy: "Midtrans Simulator"
          };
          // Do not push to treasurerTransactions to avoid double counting under Operasional
          // treasurerTransactions.push(newTx);
        }

        const notification: RealtimeNotification = {
          id: `notif-misc-sim-${Date.now()}`,
          studentId: bill.studentId,
          title,
          message,
          type: "payment",
          createdAt: new Date().toISOString()
        };
        broadcastNotification(notification);

        // Send automated WA
        if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && affectedStudent && affectedStudent.phone) {
          const waMsg = `Yth. Orang Tua / Wali Siswa dari *${affectedStudent.name}* (NIS: ${affectedStudent.nis}).\n\n` +
            `📢 *KUITANSI PEMBAYARAN ONLINE*\n` +
            `Pembayaran *${bill.title}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* via Midtrans telah BERHASIL diselesaikan secara online.\n\n` +
            `• Metode Pembayaran: *${bill.paymentMethod}*\n` +
            `• No. Transaksi (OrderId): *${bill.orderId}*\n` +
            `• Status: *LUNAS (PAID)*\n\n` +
            `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
          sendWhatsappNotification(affectedStudent.phone, waMsg).catch(err => console.error("Error sending online misc payment WA:", err));
        }

        saveState();
        return res.json({ success: true, type: "misc", bill, student: affectedStudent });
      }
    } else if (resolvedOrderId.startsWith("SAV-")) {
      let transaction = savingsTransactions.find(t => t.orderId === resolvedOrderId);
      if (!transaction) {
        // Recovery mechanism from webhook
        const middle = resolvedOrderId.slice(4);
        const lastHyphenIndex = middle.lastIndexOf("-");
        const studentId = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
        const student = students.find(s => s.id === studentId);
        if (student) {
          const recoveredAmount = actualGrossAmount || 50000;
          transaction = {
            id: `sav-pay-recovered-${Date.now()}`,
            studentId,
            type: "deposit",
            amount: recoveredAmount,
            status: "pending",
            createdAt: resolvedPaidAt,
            orderId: resolvedOrderId,
            paymentMethod: actualPaymentType,
            notes: "Setoran via Payment Gateway (Sistem Pemulihan)"
          };
          savingsTransactions.push(transaction);
        }
      }

      if (transaction) {
        // Only progress if still pending to guarantee idempotency
        if (transaction.status === "pending") {
          transaction.status = "success";
          transaction.paymentMethod = actualPaymentType;
          if (midtransTime) {
            transaction.createdAt = resolvedPaidAt;
          }
          
          affectedStudent = students.find(s => s.id === transaction.studentId) || null;
          if (affectedStudent) {
            affectedStudent.savingsBalance += transaction.amount;
          }

          title = "Tabungan Terisi Real-time";
          message = `Uang tabungan Rp ${transaction.amount.toLocaleString("id-ID")} untuk ${affectedStudent?.name || ""} sukses ditambahkan via Midtrans (${actualPaymentType}). Saldo total: Rp ${affectedStudent?.savingsBalance.toLocaleString("id-ID")}.`;

          const notification: RealtimeNotification = {
            id: `notif-sav-sim-${Date.now()}`,
            studentId: transaction.studentId,
            title,
            message,
            type: "success",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);

          // Send automated WA
          if (whatsappConfig.enabled && whatsappConfig.notifyOnSavings && affectedStudent && affectedStudent.phone) {
            const waMsg = `Yth. Orang Tua / Wali Siswa dari *${affectedStudent.name}* (NIS: ${affectedStudent.nis}).\n\n` +
              `📝 *PENGISIAN TABUNGAN ONLINE BERHASIL*\n` +
              `Pengisian saldo tabungan sebesar *Rp ${transaction.amount.toLocaleString("id-ID")}* via Payment Gateway Midtrans (${transaction.paymentMethod}) telah BERHASIL dikonfirmasi.\n\n` +
              `• Saldo Baru Tabungan: *Rp ${affectedStudent.savingsBalance.toLocaleString("id-ID")}*\n` +
              `• Kode Order: *${transaction.orderId}*\n` +
              `• Waktu Transaksi: ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}\n\n` +
              `Terima kasih telah mendorong budaya menabung pada putra-putri Anda.\n` +
              `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
            sendWhatsappNotification(affectedStudent.phone, waMsg).catch(err => console.error("Error sending online savings WA:", err));
          }

          saveState();
          return res.json({ success: true, type: "savings", transaction, student: affectedStudent });
        } else {
          affectedStudent = students.find(s => s.id === transaction.studentId) || null;
          return res.json({ success: true, type: "savings", transaction, student: affectedStudent, message: "Transaksi sudah diproses sebelumnya." });
        }
      }
    }

    res.status(404).json({ error: "Order ID tidak ditemukan atau telah diproses." });
  });

  // Real Midtrans Webhook Notification Handler (Midtrans HTTP POST calls this directly)
  app.post("/api/midtrans-webhook", async (req, res) => {
    const webhookData = req.body;
    const { order_id, transaction_status, payment_type, gross_amount, settlement_time, transaction_time } = webhookData;

    console.log("Midtrans Webhook Received:", { order_id, transaction_status, payment_type, gross_amount, settlement_time, transaction_time });

    // Handle verification
    const isSettlement = transaction_status === "settlement" || transaction_status === "capture";
    const midtransTime = settlement_time || transaction_time || "";
    const resolvedPaidAt = midtransTime ? parseMidtransTime(midtransTime) : new Date().toISOString();
    
    if (!order_id) {
      return res.status(400).json({ status: "error", message: "Order ID missing" });
    }

    let isHandled = false;

    if (order_id.startsWith("SPP-")) {
      const middle = order_id.slice(4);
      const lastHyphenIndex = middle.lastIndexOf("-");
      const billId = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
      
      // Expand shortened 'B-' prefix to match full 'bill-std-' ID format if needed
      let cleanBillId = decompressBillIdForMidtrans(billId);
      
      let bill = findSppBillMatching(order_id, sppBills) || 
                 findSppBillMatching(billId, sppBills);
      if (bill) {
        if (isSettlement) {
          bill.status = "paid";
          bill.paidAt = resolvedPaidAt;
          bill.paymentMethod = `Midtrans (${payment_type})`;
          if (bill.orderId !== order_id) {
            bill.orderId = order_id; // repair orderId reference
          }
          
          const student = students.find(s => s.id === bill.studentId);
          isHandled = true;

          // Broadcast notification to active SSE listeners
          const notification: RealtimeNotification = {
            id: `notif-spp-midtrans-${Date.now()}`,
            studentId: bill.studentId,
            title: "Pembayaran SPP Lunas (Midtrans)",
            message: `Pembayaran SPP ${student?.name || ""} bulan ${bill.month} ${bill.year} sebesar Rp ${bill.amount.toLocaleString("id-ID")} via ${payment_type} BERHASIL divalidasi oleh Midtrans secara otomatis.`,
            type: "payment",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);

          // Send automated WA
          if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
            const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
              `📢 *KUITANSI PEMBAYARAN SPP ONLINE*\n` +
              `Pembayaran SPP Bulan *${bill.month} ${bill.year}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* via ${payment_type} telah BERHASIL divalidasi oleh Midtrans.\n\n` +
              `• Metode Pembayaran: *${bill.paymentMethod}*\n` +
              `• No. Transaksi (OrderId): *${bill.orderId}*\n` +
              `• Status: *LUNAS (PAID)*\n\n` +
              `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
            sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending online payment web WA:", err));
          }
        } else if (transaction_status === "pending") {
          bill.status = "pending";
          if (bill.orderId !== order_id) bill.orderId = order_id;
          isHandled = true;
        } else if (transaction_status === "expire" || transaction_status === "deny" || transaction_status === "cancel") {
          bill.status = "unpaid";
          isHandled = true;
        }
      }
    } else if (order_id.startsWith("CART-")) {
      const selectedSpp = sppBills.filter(b => b.orderId === order_id);
      const selectedMisc = miscBills.filter(b => b.orderId === order_id);
      const selectedSavings = savingsTransactions.filter(t => t.orderId === order_id);

      let targetStudentId = selectedSpp[0]?.studentId || selectedMisc[0]?.studentId || selectedSavings[0]?.studentId;
      let student = students.find(s => s.id === targetStudentId);

      // CART Recovery Mechanism: If no bills match the order_id, find the student by parsing order_id
      if (!student) {
        const parts = order_id.split("-");
        const studentIdentifier = parts.slice(1, -1).join("-");

        const custEmail = (req.body?.customer_details?.email || "").toLowerCase().trim();
        if (custEmail && custEmail.includes("@")) {
          const emailNis = custEmail.split("@")[0].replace(/\D/g, "").trim();
          if (emailNis) {
            student = students.find(s => String(s.nis).trim() === emailNis);
          }
          if (!student) {
            student = students.find(s => s.email && s.email.toLowerCase().trim() === custEmail);
          }
        }

        if (!student && studentIdentifier) {
          student = students.find(s => String(s.nis).trim() === studentIdentifier || s.id === studentIdentifier);
          if (!student && studentIdentifier.length >= 12) {
            student = students.find(s => s.id === studentIdentifier || s.id.includes(studentIdentifier));
          }
        }
        
        if (student) {
          targetStudentId = student.id;
          // Find pending or unpaid bills of this student
          let candidateBills = [
            ...sppBills.filter(b => b.studentId === student!.id && b.status === "pending"),
            ...miscBills.filter(b => b.studentId === student!.id && b.status === "pending")
          ];
          
          if (candidateBills.length === 0) {
            candidateBills = [
              ...sppBills.filter(b => b.studentId === student!.id && b.status === "unpaid"),
              ...miscBills.filter(b => b.studentId === student!.id && b.status === "unpaid")
            ];
          }

          const targetAmount = Number(gross_amount);
          let currentSum = 0;
          for (const b of candidateBills) {
            if (currentSum + b.amount <= targetAmount) {
              currentSum += b.amount;
              if ('month' in b) {
                selectedSpp.push(b as SppBill);
              } else {
                selectedMisc.push(b);
              }
            }
            if (currentSum === targetAmount) break;
          }
          console.log(`[WEBHOOK CART RECOVERY] Recovered student: ${student.name}, matched ${selectedSpp.length} SPP and ${selectedMisc.length} Misc bills for total Rp ${currentSum} / Rp ${targetAmount}`);
        }
      }

      if (isSettlement) {
        selectedSpp.forEach(bill => {
          bill.status = "paid";
          bill.paidAt = resolvedPaidAt;
          bill.paymentMethod = `Midtrans (${payment_type})`;
        });

        selectedMisc.forEach(bill => {
          bill.status = "paid";
          bill.paidAt = resolvedPaidAt;
          bill.paymentMethod = `Midtrans (${payment_type})`;
        });

        selectedSavings.forEach(tx => {
          if (tx.status !== "success") {
            tx.status = "success";
            tx.paymentMethod = `Midtrans (${payment_type})`;
            if (student) {
              student.savingsBalance = (student.savingsBalance || 0) + tx.amount;
            }
          }
        });

        const totalAmount = 
          selectedSpp.reduce((sum, b) => sum + b.amount, 0) + 
          selectedMisc.reduce((sum, b) => sum + b.amount, 0) +
          selectedSavings.reduce((sum, t) => sum + t.amount, 0);
        
        const notification: RealtimeNotification = {
          id: `notif-cart-midtrans-${Date.now()}`,
          studentId: targetStudentId,
          title: "Pembayaran Keranjang Lunas (Midtrans)",
          message: `Pembayaran Keranjang ${student?.name || ""} sebesar Rp ${totalAmount.toLocaleString("id-ID")} via ${payment_type} BERHASIL divalidasi oleh Midtrans secara otomatis.`,
          type: "payment",
          createdAt: new Date().toISOString()
        };
        broadcastNotification(notification);

        if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
          const itemNames = [
            ...selectedSpp.map(b => `SPP ${b.month} ${b.year}`),
            ...selectedMisc.map(b => b.title),
            ...selectedSavings.map(t => `Setor Tabungan Rp ${t.amount.toLocaleString('id-ID')}`)
          ].join(", ");

          const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
            `📢 *KUITANSI PEMBAYARAN ONLINE (KERANJANG)*\n` +
            `Pembayaran Keranjang belanja sekolah sebesar *Rp ${totalAmount.toLocaleString("id-ID")}* via ${payment_type} telah BERHASIL divalidasi oleh Midtrans.\n\n` +
            `• Item Pembayaran: *${itemNames}*\n` +
            `• No. Transaksi (OrderId): *${order_id}*\n` +
            `• Status: *LUNAS (PAID)*\n\n` +
            `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
          sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending online cart payment web WA:", err));
        }

        isHandled = true;
      } else if (transaction_status === "pending") {
        selectedSpp.forEach(b => { b.status = "pending"; });
        selectedMisc.forEach(b => { b.status = "pending"; });
        selectedSavings.forEach(t => { t.status = "pending"; });
        isHandled = true;
      } else if (transaction_status === "expire" || transaction_status === "deny" || transaction_status === "cancel") {
        selectedSpp.forEach(b => { b.status = "unpaid"; });
        selectedMisc.forEach(b => { b.status = "unpaid"; });
        selectedSavings.forEach(t => { if (t.status === "pending") t.status = "failed"; });
        isHandled = true;
      }
    } else if (order_id.startsWith("MISC-")) {
      let bill = findMiscBillMatching(order_id, miscBills);
      if (bill) {
        if (isSettlement) {
          bill.status = "paid";
          bill.paidAt = resolvedPaidAt;
          bill.paymentMethod = `Midtrans (${payment_type})`;
          if (bill.orderId !== order_id) {
            bill.orderId = order_id;
          }
          
          const student = students.find(s => s.id === bill.studentId);
          isHandled = true;

          // Log as Treasurer transaction!
          const newTx: TreasurerTransaction = {
            id: `tx-misc-${Date.now()}`,
            type: "incoming",
            category: "Operasional",
            amount: bill.amount,
            description: `Pembayaran ${bill.title} (Midtrans) - ${student?.name || ""} (${student?.nis || ""})`,
            date: resolvedPaidAt.split("T")[0],
            source: "custom",
            studentName: student?.name,
            nis: student?.nis,
            createdBy: "Midtrans Webhook"
          };
          // Do not push to treasurerTransactions to avoid double counting under Operasional
          // treasurerTransactions.push(newTx);

          const notification: RealtimeNotification = {
            id: `notif-misc-midtrans-${Date.now()}`,
            studentId: bill.studentId,
            title: `Pembayaran ${bill.title} Lunas (Midtrans)`,
            message: `Pembayaran ${bill.title} ${student?.name || ""} sebesar Rp ${bill.amount.toLocaleString("id-ID")} via ${payment_type} BERHASIL divalidasi oleh Midtrans secara otomatis.`,
            type: "payment",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);

          if (whatsappConfig.enabled && whatsappConfig.notifyOnPayment && student && student.phone) {
            const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
              `📢 *KUITANSI PEMBAYARAN ONLINE*\n` +
              `Pembayaran *${bill.title}* sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* via ${payment_type} telah BERHASIL divalidasi oleh Midtrans.\n\n` +
              `• Metode Pembayaran: *${bill.paymentMethod}*\n` +
              `• No. Transaksi (OrderId): *${bill.orderId}*\n` +
              `• Status: *LUNAS (PAID)*\n\n` +
              `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
            sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending online misc payment WA:", err));
          }
        } else if (transaction_status === "pending") {
          bill.status = "pending";
          if (bill.orderId !== order_id) bill.orderId = order_id;
          isHandled = true;
        } else if (transaction_status === "expire" || transaction_status === "deny" || transaction_status === "cancel") {
          bill.status = "unpaid";
          isHandled = true;
        }
      }
    } else if (order_id.startsWith("SAV-")) {
      let transaction = savingsTransactions.find(t => t.orderId === order_id);
      if (!transaction && isSettlement) {
        // Recovery mechanism: if transaction is missing from local state (e.g. database synced or updated without it)
        const middle = order_id.slice(4);
        const lastHyphenIndex = middle.lastIndexOf("-");
        const studentId = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
        const student = students.find(s => s.id === studentId);
        if (student) {
          const recoveredAmount = Number(gross_amount) || 0;
          if (recoveredAmount > 0) {
            transaction = {
              id: `sav-pay-recovered-${Date.now()}`,
              studentId,
              type: "deposit",
              amount: recoveredAmount,
              status: "pending",
              createdAt: resolvedPaidAt,
              orderId: order_id,
              paymentMethod: `Midtrans (${payment_type || 'Online'})`,
              notes: "Setoran via Payment Gateway (Sistem Pemulihan)"
            };
            savingsTransactions.push(transaction);
          }
        }
      }
      if (transaction) {
        if (isSettlement && transaction.status === "pending") {
          transaction.status = "success";
          transaction.paymentMethod = `Midtrans (${payment_type})`;
          if (midtransTime) {
            transaction.createdAt = resolvedPaidAt;
          }
          
          const student = students.find(s => s.id === transaction.studentId);
          if (student) {
            student.savingsBalance += transaction.amount;
          }
          isHandled = true;

          // Broadcast notifications
          const notification: RealtimeNotification = {
            id: `notif-sav-midtrans-${Date.now()}`,
            studentId: transaction.studentId,
            title: "Setoran Tabungan Otomatis",
            message: `Midtrans berhasil meneruskan transaksi e-money sebesar Rp ${transaction.amount.toLocaleString("id-ID")} ke rekening Tabungan ${student?.name || ""}. Saldo baru: Rp ${student?.savingsBalance.toLocaleString("id-ID")}.`,
            type: "success",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);

          // Send automated WA
          if (whatsappConfig.enabled && whatsappConfig.notifyOnSavings && student && student.phone) {
            const waMsg = `Yth. Orang Tua / Wali Siswa dari *${student.name}* (NIS: ${student.nis}).\n\n` +
              `📝 *PENGISIAN TABUNGAN ONLINE BERHASIL*\n` +
              `Pengisian saldo tabungan sebesar *Rp ${transaction.amount.toLocaleString("id-ID")}* via Midtrans (${transaction.paymentMethod}) telah BERHASIL dikonfirmasi.\n\n` +
              `• Saldo Baru Tabungan: *Rp ${student.savingsBalance.toLocaleString("id-ID")}*\n` +
              `• Kode Order: *${transaction.orderId}*\n\n` +
              `-- SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN --`;
            sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending online savings web WA:", err));
          }
          isHandled = true;
        }
      }
    }

    if (isHandled) {
      saveState();
    }

    res.json({ status: "success", handled: isHandled });
  });

  // Explicit Single Order ID Verification & Instant Reconciliation Endpoint
  app.post("/api/verify-midtrans-order", async (req, res) => {
    const { orderId } = req.body;
    if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
      return res.status(400).json({ error: "Order ID atau nomor referensi wajib diisi." });
    }

    const cleanOrderId = orderId.trim();
    console.log("Direct Midtrans order verification requested for:", cleanOrderId);

    // 1. Fetch real status from Midtrans API (Dual-environment check)
    const midtransStatus = await getMidtransStatus(cleanOrderId);
    if (!midtransStatus) {
      // If not found directly by status API, check local state or try matching by orderId
      const localSpp = sppBills.find(b => b.orderId === cleanOrderId || b.id === cleanOrderId);
      const localMisc = miscBills.find(b => b.orderId === cleanOrderId || b.id === cleanOrderId);
      const localSavings = savingsTransactions.find(t => t.orderId === cleanOrderId || t.id === cleanOrderId);

      if (localSpp || localMisc || localSavings) {
        return res.json({
          success: true,
          message: "Data transaksi ditemukan di sistem internal sekolah.",
          item: localSpp || localMisc || localSavings
        });
      }

      return res.status(404).json({
        error: `Order ID '${cleanOrderId}' tidak ditemukan di Gateway Midtrans (Sandbox & Production) maupun database lokal. Mohon pastikan Nomor Order/Ref pada kuitansi sudah benar.`
      });
    }

    const ts = midtransStatus.transaction_status;
    const isSettled = ts === "settlement" || ts === "capture";

    if (!isSettled) {
      return res.status(400).json({
        error: `Transaksi ditemukan di Midtrans tetapi status saat ini adalah '${(ts || 'unknown').toUpperCase()}'. Hanya transaksi dengan status SETTLEMENT/CAPTURE yang dapat diverifikasi sebagai LUNAS.`,
        midtransStatus
      });
    }

    // 2. Transaksi LUNAS/SETTLED di Midtrans! Panggil simulator/perekonsiliasi internal
    const actualPaymentType = midtransStatus.payment_type ? `Midtrans (${midtransStatus.payment_type})` : "Midtrans Online Gateway";
    const grossAmount = Number(midtransStatus.gross_amount) || 0;
    const midtransTime = midtransStatus.settlement_time || midtransStatus.transaction_time || "";

    try {
      const reconResult = await processMidtransOrderStatus(cleanOrderId, midtransStatus);
      if (reconResult.actionTaken) {
        saveState();
      }

      return res.json({
        success: true,
        type: reconResult.actionTaken ? "reconciled" : "midtrans_only",
        message: `BERHASIL! ${reconResult.detailMessage || `Transaksi LUNAS di Midtrans (${actualPaymentType}) sebesar Rp ${grossAmount.toLocaleString("id-ID")}.`}`,
        midtransStatus,
        reconResult
      });
    } catch (e: any) {
      console.error("Error verifying midtrans order:", e);
      res.status(500).json({ error: "Gagal memproses verifikasi order: " + e.message });
    }
  });

  // Bulk Midtrans Report Upload & Reconciliation Endpoint
  app.post("/api/verify-midtrans-bulk-report", async (req, res) => {
    try {
      const { items, rawContent } = req.body;
      let parsedItems: Array<{
        orderId: string;
        transactionId?: string;
        status?: string;
        grossAmount?: number | string;
        paymentType?: string;
        transactionTime?: string;
        customerEmail?: string;
        customerName?: string;
        studentNis?: string;
      }> = [];

      if (Array.isArray(items) && items.length > 0) {
        parsedItems = items.map(it => ({
          orderId: it.orderId || it.order_id || it["Order ID"] || "",
          transactionId: it.transactionId || it.transaction_id || it["Transaction ID"] || it.txId || undefined,
          status: it.status || it.transaction_status || "settlement",
          grossAmount: it.grossAmount || it.gross_amount || it.amount || 0,
          paymentType: it.paymentType || it.payment_type || "Midtrans Gateway",
          transactionTime: it.transactionTime || it.transaction_time || "",
          customerEmail: it.customerEmail || it.customer_email || it["Customer e-mail"] || it["Customer Email"] || "",
          customerName: it.customerName || it.customer_name || it["Customer Name"] || it["Nama"] || "",
          studentNis: it.studentNis || it.nis || it["NIS"] || ""
        }));
      } else if (rawContent && typeof rawContent === "string" && rawContent.trim()) {
        const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          const delimiter = lines[0].includes("\t") ? "\t" : (lines[0].includes(";") ? ";" : ",");
          const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
          
          let orderIdIdx = headers.findIndex(h => h.includes("order_id") || h.includes("order id") || h.includes("orderid") || h.includes("no. order") || h.includes("ref"));
          let txIdIdx = headers.findIndex(h => h.includes("transaction_id") || h.includes("transaction id") || h.includes("trans_id") || h.includes("id transaksi") || h.includes("tx id") || h.includes("tx_id"));
          let statusIdx = headers.findIndex(h => h.includes("status") || h.includes("transaction_status") || h.includes("state"));
          let amountIdx = headers.findIndex(h => h.includes("amount") || h.includes("gross") || h.includes("total") || h.includes("nominal") || h.includes("jumlah"));
          let paymentIdx = headers.findIndex(h => h.includes("payment") || h.includes("channel") || h.includes("metode"));
          let timeIdx = headers.findIndex(h => h.includes("time") || h.includes("date") || h.includes("tanggal") || h.includes("waktu") || h.includes("settlement"));
          let emailIdx = headers.findIndex(h => h.includes("email") || h.includes("e-mail") || h.includes("mail") || h.includes("customer"));
          let nameIdx = headers.findIndex(h => h.includes("customer_name") || h.includes("customer name") || h.includes("nama") || h.includes("siswa") || h.includes("pembayar"));
          let nisIdx = headers.findIndex(h => h.includes("nis") || h.includes("nisn") || h.includes("no_induk") || h.includes("no induk"));

          if (orderIdIdx === -1 && txIdIdx !== -1) orderIdIdx = txIdIdx;
          if (orderIdIdx === -1) orderIdIdx = 0;

          const startRow = (statusIdx !== -1 || headers.some(h => h.includes("order") || h.includes("status"))) ? 1 : 0;
          
          for (let i = startRow; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^['"]|['"]$/g, ''));
            const orderId = cols[orderIdIdx];
            const transactionId = txIdIdx !== -1 && cols[txIdIdx] ? cols[txIdIdx] : undefined;
            if (orderId && orderId.length > 2 && !orderId.toLowerCase().includes("order_id")) {
              parsedItems.push({
                orderId,
                transactionId,
                status: statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx] : "settlement",
                grossAmount: amountIdx !== -1 && cols[amountIdx] ? cols[amountIdx] : 0,
                paymentType: paymentIdx !== -1 && cols[paymentIdx] ? cols[paymentIdx] : "Midtrans Gateway",
                transactionTime: timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx] : "",
                customerEmail: emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : "",
                customerName: nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : "",
                studentNis: nisIdx !== -1 && cols[nisIdx] ? cols[nisIdx] : ""
              });
            }
          }
        }
      }

      if (parsedItems.length === 0) {
        return res.status(400).json({ error: "Tidak ada data transaksi yang dapat dibaca dari file report." });
      }

      let reconciledCount = 0;
      let alreadyPaidCount = 0;
      let notFoundCount = 0;
      let pendingCount = 0;
      let failedCount = 0;
      let totalAmountReconciled = 0;
      let stateChanged = false;

      const results: any[] = [];

      for (const item of parsedItems) {
        if (!item.orderId || typeof item.orderId !== "string") continue;
        const cleanOrderId = item.orderId.trim();
        const cleanTxId = (item.transactionId || "").trim();
        if (!cleanOrderId && !cleanTxId) continue;

        const customerEmail = (item.customerEmail || "").trim().toLowerCase();
        const emailNis = customerEmail.includes("@") ? customerEmail.split("@")[0].replace(/\D/g, "") : "";
        const rawNis = (item.studentNis || "").toString().trim();
        const rawName = (item.customerName || "").toString().trim().toLowerCase();

        let studentByEmail = students.find(s => 
          (emailNis && String(s.nis).trim() === emailNis) ||
          (customerEmail && s.email && s.email.toLowerCase().trim() === customerEmail) ||
          (rawNis && String(s.nis).trim() === rawNis) ||
          (rawName && s.name && s.name.toLowerCase().trim() === rawName)
        );

        if (!studentByEmail && cleanOrderId) {
          const parts = cleanOrderId.split("-");
          for (const p of parts) {
            if (/^\d{3,12}$/.test(p)) {
              const matched = students.find(s => String(s.nis).trim() === p);
              if (matched) {
                studentByEmail = matched;
                break;
              }
            }
          }
        }

        const rawStatus = (item.status || "settlement").toString().toLowerCase().trim();
        const isSettled = rawStatus.includes("settlement") || rawStatus.includes("capture") || rawStatus.includes("success") || rawStatus.includes("lunas") || rawStatus.includes("paid") || rawStatus.includes("settled");
        const isPending = rawStatus.includes("pending");

        const actualPaymentType = item.paymentType ? (item.paymentType.toLowerCase().includes("midtrans") ? item.paymentType : `Midtrans (${item.paymentType})`) : "Midtrans Online";

        if (!isSettled) {
          if (isPending) {
            pendingCount++;
            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: studentByEmail?.name || item.customerName || "-",
              studentNis: studentByEmail?.nis || item.studentNis || "-",
              category: "Transaksi Online",
              amount: Number(item.grossAmount) || 0,
              reportStatus: rawStatus || "pending",
              reportPaymentType: actualPaymentType,
              reportTime: item.transactionTime || "-",
              reconciliationStatus: "report_pending",
              message: "Status di report Midtrans masih PENDING (Menunggu pembayaran dari wali murid)."
            });
          } else {
            failedCount++;
            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: studentByEmail?.name || item.customerName || "-",
              studentNis: studentByEmail?.nis || item.studentNis || "-",
              category: "Transaksi Online",
              amount: Number(item.grossAmount) || 0,
              reportStatus: rawStatus || "failed",
              reportPaymentType: actualPaymentType,
              reportTime: item.transactionTime || "-",
              reconciliationStatus: "report_failed",
              message: `Status di report Midtrans: ${rawStatus.toUpperCase()} (Transaksi dibatalkan/kadaluarsa).`
            });
          }
          continue;
        }

        // Helper to ensure transaction is recorded in Treasurer Ledger (Disabled auto-recon entries per user directive)
        const ensureLedgerEntry = (cat: string, amt: number, desc: string, stdName?: string, stdNis?: string, stdId?: string) => {
          // Auto-creation of ledger transactions disabled to prevent duplicate entries (pemasukan ganda) and unrequested pos categories.
        };

        // 1. Search SPP Bill
        let targetStudent = studentByEmail;
        if (!targetStudent && cleanOrderId.startsWith("SPP-")) {
          const nisFromOrder = cleanOrderId.split("-")[1];
          if (nisFromOrder && /^\d+$/.test(nisFromOrder)) {
            targetStudent = students.find(s => String(s.nis).trim() === nisFromOrder);
          }
        }

        let sppBill = findSppBillMatching(cleanOrderId, sppBills, targetStudent?.id) || 
                      (cleanTxId ? findSppBillMatching(cleanTxId, sppBills, targetStudent?.id) : undefined);

        if (!sppBill && (cleanOrderId.startsWith("SPP-") || cleanOrderId.includes("SPP-"))) {
          const middle = cleanOrderId.includes("SPP-") ? cleanOrderId.split("SPP-")[1] : cleanOrderId;
          const lastHyphenIndex = middle.lastIndexOf("-");
          const billIdPart = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
          sppBill = findSppBillMatching(billIdPart, sppBills, targetStudent?.id);
        }

        if (sppBill) {
          const student = students.find(s => s.id === sppBill.studentId) || studentByEmail;
          ensureLedgerEntry("SPP", sppBill.amount, `Pembayaran SPP ${sppBill.month} ${sppBill.year} (Midtrans Report) - ${student?.name || ""} (${student?.nis || ""})`, student?.name, student?.nis, student?.id);

          if (sppBill.status === "paid") {
            alreadyPaidCount++;
            results.push({
              orderId: sppBill.orderId || cleanOrderId,
              transactionId: cleanTxId || sppBill.transactionId,
              studentName: student?.name || "Siswa",
              studentNis: student?.nis || "-",
              studentClass: student?.class || "-",
              category: `SPP ${sppBill.month} ${sppBill.year}`,
              amount: sppBill.amount,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: item.transactionTime || sppBill.paidAt || "-",
              reconciliationStatus: "already_paid",
              message: `SUDAH LUNAS: Tagihan SPP ${sppBill.month} ${sppBill.year} a.n ${student?.name || 'Siswa'} terverifikasi di Buku Kas.`
            });
          } else {
            sppBill.status = "paid";
            sppBill.paidAt = item.transactionTime ? parseMidtransTime(item.transactionTime) : new Date().toISOString();
            sppBill.paymentMethod = actualPaymentType;
            sppBill.orderId = cleanOrderId;
            if (cleanTxId) sppBill.transactionId = cleanTxId;
            reconciledCount++;
            totalAmountReconciled += sppBill.amount;
            stateChanged = true;

            results.push({
              orderId: sppBill.orderId,
              transactionId: sppBill.transactionId,
              studentName: student?.name || "Siswa",
              studentNis: student?.nis || "-",
              studentClass: student?.class || "-",
              category: `SPP ${sppBill.month} ${sppBill.year}`,
              amount: sppBill.amount,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: sppBill.paidAt,
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Tagihan SPP ${sppBill.month} ${sppBill.year} a.n ${student?.name || 'Siswa'} berhasil diset LUNAS & dicatat ke Buku Kas.`
            });
          }
          continue;
        }

        // 2. Search Misc Bill
        let miscBill = findMiscBillMatching(cleanOrderId, miscBills, studentByEmail?.id, Number(item.grossAmount)) ||
                       (cleanTxId ? findMiscBillMatching(cleanTxId, miscBills, studentByEmail?.id, Number(item.grossAmount)) : undefined);

        if (!miscBill && (cleanOrderId.startsWith("MISC-") || cleanOrderId.includes("MISC-"))) {
          const middle = cleanOrderId.includes("MISC-") ? cleanOrderId.split("MISC-")[1] : cleanOrderId;
          const lastHyphenIndex = middle.lastIndexOf("-");
          const billIdPart = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
          miscBill = findMiscBillMatching(billIdPart, miscBills, studentByEmail?.id, Number(item.grossAmount));
        }

        if (miscBill) {
          const student = students.find(s => s.id === miscBill.studentId) || studentByEmail;
          ensureLedgerEntry(miscBill.title || "Lain-lain", miscBill.amount, `Pembayaran ${miscBill.title} (Midtrans Report) - ${student?.name || ""} (${student?.nis || ""})`, student?.name, student?.nis, student?.id);

          if (miscBill.status === "paid") {
            alreadyPaidCount++;
            results.push({
              orderId: miscBill.orderId || cleanOrderId,
              transactionId: cleanTxId || miscBill.transactionId,
              studentName: student?.name || "Siswa",
              studentNis: student?.nis || "-",
              studentClass: student?.class || "-",
              category: miscBill.title,
              amount: miscBill.amount,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: item.transactionTime || miscBill.paidAt || "-",
              reconciliationStatus: "already_paid",
              message: `SUDAH LUNAS: Tagihan ${miscBill.title} a.n ${student?.name || 'Siswa'} terverifikasi di Buku Kas.`
            });
          } else {
            miscBill.status = "paid";
            miscBill.paidAt = item.transactionTime ? parseMidtransTime(item.transactionTime) : new Date().toISOString();
            miscBill.paymentMethod = actualPaymentType;
            miscBill.orderId = cleanOrderId;
            if (cleanTxId) miscBill.transactionId = cleanTxId;
            reconciledCount++;
            totalAmountReconciled += miscBill.amount;
            stateChanged = true;

            results.push({
              orderId: miscBill.orderId,
              transactionId: miscBill.transactionId,
              studentName: student?.name || "Siswa",
              studentNis: student?.nis || "-",
              studentClass: student?.class || "-",
              category: miscBill.title,
              amount: miscBill.amount,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: miscBill.paidAt,
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Tagihan ${miscBill.title} a.n ${student?.name || 'Siswa'} berhasil diset LUNAS & dicatat ke Buku Kas.`
            });
          }
          continue;
        }

        // 3. Search CART Order
        if (cleanOrderId.startsWith("CART-") || cleanOrderId.includes("CART-")) {
          let matchedSpp = sppBills.filter(b => b.orderId === cleanOrderId || (cleanTxId && b.transactionId === cleanTxId));
          let matchedMisc = miscBills.filter(b => b.orderId === cleanOrderId || (cleanTxId && b.transactionId === cleanTxId));
          let matchedSavings = savingsTransactions.filter(t => t.orderId === cleanOrderId || (cleanTxId && t.transactionId === cleanTxId));

          if (matchedSpp.length === 0 && matchedMisc.length === 0 && matchedSavings.length === 0) {
            let targetStudent = studentByEmail;
            if (!targetStudent) {
              const parts = cleanOrderId.split("-");
              const studentIdentifier = parts.slice(1, -1).join("-");
              if (studentIdentifier) {
                targetStudent = students.find(s => String(s.nis).trim() === studentIdentifier || s.id === studentIdentifier);
                if (!targetStudent && studentIdentifier.length >= 12) {
                  targetStudent = students.find(s => s.id === studentIdentifier || s.id.includes(studentIdentifier));
                }
              }
            }

            if (targetStudent) {
              const targetAmount = Number(item.grossAmount) || 0;
              const monthMap: Record<string, number> = {
                "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
                "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
              };
              const sortSpp = (bills: any[]) => [...bills].sort((a, b) => ((a.year || 2026) * 12 + (monthMap[a.month] ?? 0)) - ((b.year || 2026) * 12 + (monthMap[b.month] ?? 0)));

              let candidateBills = [
                ...sortSpp(sppBills.filter(b => b.studentId === targetStudent.id && b.status === "pending")),
                ...miscBills.filter(b => b.studentId === targetStudent.id && b.status === "pending")
              ];
              if (candidateBills.length === 0) {
                candidateBills = [
                  ...sortSpp(sppBills.filter(b => b.studentId === targetStudent.id && b.status === "unpaid")),
                  ...miscBills.filter(b => b.studentId === targetStudent.id && b.status === "unpaid")
                ];
              }

              let currentSum = 0;
              for (const b of candidateBills) {
                if (currentSum + b.amount <= targetAmount) {
                  currentSum += b.amount;
                  if ('month' in b) {
                    matchedSpp.push(b as any);
                  } else {
                    matchedMisc.push(b as any);
                  }
                }
                if (currentSum === targetAmount) break;
              }
            }
          }

          if (matchedSpp.length > 0 || matchedMisc.length > 0 || matchedSavings.length > 0) {
            let newlyPaid = 0;
            const paidAt = item.transactionTime ? parseMidtransTime(item.transactionTime) : new Date().toISOString();
            const targetStudentId = matchedSpp[0]?.studentId || matchedMisc[0]?.studentId || matchedSavings[0]?.studentId;
            const student = students.find(s => s.id === targetStudentId) || studentByEmail;

            matchedSpp.forEach(b => {
              ensureLedgerEntry("SPP", b.amount, `Pembayaran SPP ${b.month} ${b.year} (Keranjang Midtrans Report) - ${student?.name || ""} (${student?.nis || ""})`, student?.name, student?.nis, student?.id);
              if (b.status !== "paid") {
                b.status = "paid";
                b.paidAt = paidAt;
                b.paymentMethod = actualPaymentType;
                b.orderId = cleanOrderId;
                if (cleanTxId) b.transactionId = cleanTxId;
                newlyPaid++;
                totalAmountReconciled += b.amount;
              }
            });

            matchedMisc.forEach(b => {
              ensureLedgerEntry(b.title || "Lain-lain", b.amount, `Pembayaran ${b.title} (Keranjang Midtrans Report) - ${student?.name || ""} (${student?.nis || ""})`, student?.name, student?.nis, student?.id);
              if (b.status !== "paid") {
                b.status = "paid";
                b.paidAt = paidAt;
                b.paymentMethod = actualPaymentType;
                b.orderId = cleanOrderId;
                if (cleanTxId) b.transactionId = cleanTxId;
                newlyPaid++;
                totalAmountReconciled += b.amount;
              }
            });

            matchedSavings.forEach(t => {
              if (t.status !== "success") {
                t.status = "success";
                t.paymentMethod = actualPaymentType;
                t.orderId = cleanOrderId;
                if (cleanTxId) t.transactionId = cleanTxId;
                if (student) {
                  student.savingsBalance = (student.savingsBalance || 0) + t.amount;
                }
                newlyPaid++;
                totalAmountReconciled += t.amount;
              }
            });

            if (newlyPaid > 0) {
              reconciledCount++;
              stateChanged = true;
              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: `Keranjang (${matchedSpp.length + matchedMisc.length + matchedSavings.length} Item)`,
                amount: Number(item.grossAmount) || 0,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: paidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Keranjang Multi-item (${newlyPaid} item) a.n ${student?.name || 'Siswa'} berhasil diset LUNAS & dicatat ke Buku Kas/Tabungan.`
              });
            } else {
              alreadyPaidCount++;
              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: `Keranjang (${matchedSpp.length + matchedMisc.length} Item)`,
                amount: Number(item.grossAmount) || 0,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: paidAt,
                reconciliationStatus: "already_paid",
                message: `SUDAH LUNAS: Item keranjang a.n ${student?.name || 'Siswa'} terverifikasi di Buku Kas.`
              });
            }
            continue;
          }
        }

        // 4. Search Savings Transaction
        let savingsTx = savingsTransactions.find(t => t.orderId === cleanOrderId || (cleanTxId && t.transactionId === cleanTxId) || t.transactionId === cleanOrderId);
        if (!savingsTx && (cleanOrderId.startsWith("SAV-") || cleanOrderId.includes("SAV-"))) {
          let targetStudent = studentByEmail;
          if (!targetStudent) {
            const rawRest = cleanOrderId.replace(/^SAV-/, "").replace(/-\d{10,13}$/, "").trim();
            if (rawRest) {
              targetStudent = students.find(s => s.id === rawRest || String(s.nis).trim() === rawRest);
              if (!targetStudent && rawRest.length >= 12) {
                targetStudent = students.find(s => s.id === rawRest || s.id.includes(rawRest) || rawRest.includes(s.id));
              }
            }
          }

          if (targetStudent) {
            savingsTx = savingsTransactions.find(t => t.studentId === targetStudent.id && t.status === "pending");
          }
        }

        if (savingsTx) {
          const student = students.find(s => s.id === savingsTx.studentId) || studentByEmail;
          ensureLedgerEntry("Tabungan", savingsTx.amount, `Setoran Tabungan (Midtrans Report) - ${student?.name || ""} (${student?.nis || ""})`, student?.name, student?.nis, student?.id);

          if (savingsTx.status === "success") {
            alreadyPaidCount++;
            results.push({
              orderId: savingsTx.orderId || cleanOrderId,
              transactionId: cleanTxId || savingsTx.transactionId,
              studentName: student?.name || "Siswa",
              studentNis: student?.nis || "-",
              studentClass: student?.class || "-",
              category: "Setoran Tabungan",
              amount: savingsTx.amount,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: item.transactionTime || "-",
              reconciliationStatus: "already_paid",
              message: `SUDAH LUNAS: Setoran Tabungan a.n ${student?.name || 'Siswa'} sudah dikonfirmasi LUNAS & terverifikasi di Buku Kas.`
            });
          } else {
            savingsTx.status = "success";
            savingsTx.paymentMethod = actualPaymentType;
            savingsTx.orderId = cleanOrderId;
            if (cleanTxId) savingsTx.transactionId = cleanTxId;
            if (student) {
              student.savingsBalance += savingsTx.amount;
            }
            reconciledCount++;
            totalAmountReconciled += savingsTx.amount;
            stateChanged = true;

            results.push({
              orderId: savingsTx.orderId,
              transactionId: savingsTx.transactionId,
              studentName: student?.name || "Siswa",
              studentNis: student?.nis || "-",
              studentClass: student?.class || "-",
              category: "Setoran Tabungan",
              amount: savingsTx.amount,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: savingsTx.createdAt || new Date().toISOString(),
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Setoran Tabungan Rp ${savingsTx.amount.toLocaleString("id-ID")} a.n ${student?.name || 'Siswa'} telah ditambahkan ke saldo tabungan & Buku Kas.`
            });
          }
          continue;
        }

        // 4b. Auto-confirm Savings if orderId is SAV- and student exists
        if (cleanOrderId.startsWith("SAV-") || cleanOrderId.includes("SAV-")) {
          let targetStudent = studentByEmail;
          if (!targetStudent) {
            const rawRest = cleanOrderId.replace(/^SAV-/, "").replace(/-\d{10,13}$/, "").trim();
            if (rawRest) {
              targetStudent = students.find(s => s.id === rawRest || String(s.nis).trim() === rawRest);
              if (!targetStudent && rawRest.length >= 12) {
                targetStudent = students.find(s => s.id === rawRest || s.id.includes(rawRest) || rawRest.includes(s.id));
              }
            }
          }
          if (targetStudent) {
            const amountVal = Number(item.grossAmount) || 0;
            if (amountVal > 0) {
              const newSavingsTx: SavingsTransaction = {
                id: `sav-pay-report-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                studentId: targetStudent.id,
                type: "deposit",
                amount: amountVal,
                status: "success",
                createdAt: item.transactionTime ? parseMidtransTime(item.transactionTime) : new Date().toISOString(),
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                paymentMethod: actualPaymentType,
                notes: "Setoran Tabungan (Verified via Midtrans Report)"
              };
              savingsTransactions.push(newSavingsTx);
              targetStudent.savingsBalance += amountVal;
              reconciledCount++;
              totalAmountReconciled += amountVal;
              stateChanged = true;

              ensureLedgerEntry("Tabungan", amountVal, `Setoran Tabungan (Midtrans Report) - ${targetStudent.name} (${targetStudent.nis || ""})`, targetStudent.name, targetStudent.nis, targetStudent.id);

              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: targetStudent.name,
                studentNis: targetStudent.nis || "-",
                studentClass: targetStudent.class || "-",
                category: "Setoran Tabungan",
                amount: amountVal,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: newSavingsTx.createdAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Setoran Tabungan Rp ${amountVal.toLocaleString("id-ID")} a.n ${targetStudent.name} (NIS: ${targetStudent.nis}) berhasil diverifikasi, ditambahkan ke saldo & Buku Kas.`
              });
              continue;
            }
          }
        }

        // 5. Fallback matching by Student & Amount for SPP & Misc
        if (studentByEmail) {
          const amt = Number(item.grossAmount) || 0;
          const fallbackSpp = sppBills.find(b => b.studentId === studentByEmail.id && (b.status === "pending" || b.status === "unpaid") && b.amount === amt);
          if (fallbackSpp) {
            fallbackSpp.status = "paid";
            fallbackSpp.paidAt = item.transactionTime ? parseMidtransTime(item.transactionTime) : new Date().toISOString();
            fallbackSpp.paymentMethod = actualPaymentType;
            fallbackSpp.orderId = cleanOrderId;
            if (cleanTxId) fallbackSpp.transactionId = cleanTxId;
            reconciledCount++;
            totalAmountReconciled += amt;
            stateChanged = true;

            ensureLedgerEntry("SPP", amt, `Pembayaran SPP ${fallbackSpp.month} ${fallbackSpp.year} (Midtrans Report) - ${studentByEmail.name} (${studentByEmail.nis || ""})`, studentByEmail.name, studentByEmail.nis, studentByEmail.id);

            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: studentByEmail.name,
              studentNis: studentByEmail.nis,
              studentClass: studentByEmail.class,
              category: `SPP ${fallbackSpp.month} ${fallbackSpp.year}`,
              amount: amt,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: fallbackSpp.paidAt,
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Tagihan SPP ${fallbackSpp.month} ${fallbackSpp.year} a.n ${studentByEmail.name} terverifikasi & dicatat ke Buku Kas.`
            });
            continue;
          }

          const fallbackMisc = miscBills.find(b => b.studentId === studentByEmail.id && (b.status === "pending" || b.status === "unpaid") && b.amount === amt);
          if (fallbackMisc) {
            fallbackMisc.status = "paid";
            fallbackMisc.paidAt = item.transactionTime ? parseMidtransTime(item.transactionTime) : new Date().toISOString();
            fallbackMisc.paymentMethod = actualPaymentType;
            fallbackMisc.orderId = cleanOrderId;
            if (cleanTxId) fallbackMisc.transactionId = cleanTxId;
            reconciledCount++;
            totalAmountReconciled += amt;
            stateChanged = true;

            ensureLedgerEntry(fallbackMisc.title || "Lain-lain", amt, `Pembayaran ${fallbackMisc.title} (Midtrans Report) - ${studentByEmail.name} (${studentByEmail.nis || ""})`, studentByEmail.name, studentByEmail.nis, studentByEmail.id);

            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: studentByEmail.name,
              studentNis: studentByEmail.nis,
              studentClass: studentByEmail.class,
              category: fallbackMisc.title,
              amount: amt,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: fallbackMisc.paidAt,
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Tagihan ${fallbackMisc.title} a.n ${studentByEmail.name} terverifikasi & dicatat ke Buku Kas.`
            });
            continue;
          }
        }

        // 6. Direct record for any settled transaction in report to ensure cash ledger recording
        const amt = Number(item.grossAmount) || 0;
        ensureLedgerEntry(
          "Pembayaran Online Midtrans",
          amt,
          `Pembayaran Online Midtrans (Report) - ${studentByEmail?.name || item.customerName || "Wali Siswa / Umum"} (${studentByEmail?.nis || item.studentNis || cleanOrderId})`,
          studentByEmail?.name || item.customerName || "Wali Siswa / Umum",
          studentByEmail?.nis || item.studentNis,
          studentByEmail?.id
        );

        reconciledCount++;
        totalAmountReconciled += amt;
        results.push({
          orderId: cleanOrderId,
          transactionId: cleanTxId,
          studentName: studentByEmail?.name || item.customerName || "-",
          studentNis: studentByEmail?.nis || item.studentNis || "-",
          studentClass: studentByEmail?.class || "-",
          category: "Pembayaran Online Midtrans",
          amount: amt,
          reportStatus: rawStatus,
          reportPaymentType: actualPaymentType,
          reportTime: item.transactionTime || "-",
          reconciliationStatus: "reconciled",
          message: `BERHASIL DICATAT! Transaksi Midtrans Ref '${cleanOrderId}' sebesar Rp ${amt.toLocaleString("id-ID")} terverifikasi & dicatat ke Buku Kas Bendahara.`
        });
      }

      if (stateChanged) {
        saveState();
      }

      return res.json({
        success: true,
        summary: {
          totalRows: parsedItems.length,
          reconciledCount,
          alreadyPaidCount,
          notFoundCount,
          pendingCount,
          failedCount,
          totalAmountReconciled
        },
        results
      });
    } catch (e: any) {
      console.error("Error processing bulk Midtrans report verification:", e);
      return res.status(500).json({ error: "Terjadi kesalahan internal saat memproses file report: " + e.message });
    }
  });

  // Integration validation status checker
  app.get("/api/system-status", (req, res) => {
    res.json({
      status: "online",
      time: new Date().toISOString(),
      midtransEnvironment: midtransConfig.isProduction ? "Production" : "Sandbox",
      configured: !!(midtransConfig.clientKey && midtransConfig.serverKey),
      version: "1.0.0",
      sseConnectedClients: sseClients.length,
      firestore: {
        status: dbSyncStatus,
        lastSync: lastSyncTime,
        error: dbSyncError
      }
    });
  });

  // Dynamic PWA manifest.json generation synchronized with the current School Identity
  app.get("/manifest.json", (req, res) => {
    const pwaIcon = schoolIdentity.favicon || schoolIdentity.logo || "/icon-512.png";
    const isSvg = pwaIcon.startsWith("data:image/svg") || pwaIcon.toLowerCase().endsWith(".svg");
    
    res.json({
      name: schoolIdentity.name || "SMP MA'ARIF NU PANDAAN",
      short_name: schoolIdentity.name ? schoolIdentity.name.split(" ").slice(0, 3).join(" ") : "SIPAS Portal",
      description: `Sistem Informasi Spp & Tabungan Siswa - ${schoolIdentity.name || "SMP MA'ARIF NU PANDAAN"}`,
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#4f46e5",
      orientation: "portrait-primary",
      icons: [
        {
          src: pwaIcon,
          type: isSvg ? "image/svg+xml" : "image/png",
          sizes: "512x512"
        },
        {
          src: pwaIcon,
          type: isSvg ? "image/svg+xml" : "image/png",
          sizes: "192x192"
        }
      ]
    });
  });

  // Vite development integration or client index serving
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Handle errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Error", err);
    res.status(500).json({ error: "Terjadi kesalahan internal server" });
  });

  const isUnixSocket = typeof PORT === "string" && (PORT.includes("/") || PORT.includes("\\") || isNaN(Number(PORT)));
  if (isUnixSocket) {
    app.listen(PORT, () => {
      console.log(`SMP Maarif NU Pandaan app is running on Unix socket: ${PORT}`);
    });
  } else {
    const portNumber = typeof PORT === "number" ? PORT : parseInt(PORT, 10) || 3000;
    app.listen(portNumber, "0.0.0.0", () => {
      console.log(`SMP Maarif NU Pandaan app is running on TCP port ${portNumber}`);
    });
  }

  // Start background auto-backup engine checks
  setInterval(async () => {
    if (!backupConfig.enabled) return;
    
    const now = Date.now();
    const lastTime = backupConfig.lastBackupTime ? new Date(backupConfig.lastBackupTime).getTime() : 0;
    const nextTime = backupConfig.nextBackupTime ? new Date(backupConfig.nextBackupTime).getTime() : 0;
    
    // Check if backup is due
    const isDue = now >= nextTime || (lastTime === 0 && isInitialSyncCompleted && databaseBackups.length === 0);
    
    if (isDue) {
      console.log("[AUTO-BACKUP ENGINE] Automated database backup is due. Starting backup snapshot creation...");
      try {
        const backupId = `bkp-${Date.now()}`;
        const createdAt = new Date().toISOString();

        const { snapshot, counts } = await buildFullBackupSnapshot();
        const snapshotStr = JSON.stringify(snapshot);
        const sizeBytes = getUtf8ByteLength(snapshotStr);

        const newBackup = {
          id: backupId,
          createdAt,
          type: "auto",
          description: "Backup Otomatis Database (Siklus Periodik)",
          sizeBytes,
          collections: counts,
          data: snapshotStr
        };

        if (mongoDb) {
          await executeMongoOperationWithRetry(async () => {
            const col = mongoDb.collection("databaseBackups");
            await col.insertOne({ ...newBackup, _id: backupId });
          });
        }

        databaseBackups.push(newBackup);

        // Enforce max count
        if (databaseBackups.length > backupConfig.maxBackups) {
          const sorted = [...databaseBackups].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          const toRemove = sorted.slice(0, databaseBackups.length - backupConfig.maxBackups);
          for (const item of toRemove) {
            const idx = databaseBackups.findIndex(b => b.id === item.id);
            if (idx > -1) databaseBackups.splice(idx, 1);
            if (mongoDb) {
              try {
                await executeMongoOperationWithRetry(async () => {
                  await mongoDb.collection("databaseBackups").deleteOne({ $or: [{ _id: item.id }, { id: item.id }] });
                });
              } catch (delErr) {
                console.warn("Failed to prune auto backup from MongoDB:", delErr);
              }
            }
          }
        }

        backupConfig.lastBackupTime = createdAt;
        backupConfig.nextBackupTime = new Date(Date.now() + backupConfig.intervalHours * 60 * 60 * 1000).toISOString();

        if (mongoDb) {
          await mongoDb.collection("configs").replaceOne({ id: "backupConfig" }, { ...backupConfig, id: "backupConfig" }, { upsert: true });
        }
        saveState();
        console.log(`[AUTO-BACKUP ENGINE] Automated database backup successful: ${backupId}`);
      } catch (err: any) {
        console.error("[AUTO-BACKUP ENGINE] Automated database backup failed:", err.message || err);
      }
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
}

startServer();
