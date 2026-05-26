import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

// Local storage files aren't strictly required, we can manage clean in-memory state that behaves like a database,
// allowing instant and reliable reads/writes without FS permission locks.
import { Student, SppBill, SavingsTransaction, RealtimeNotification, MidtransConfig, AttendanceLog, HomeroomTeacher, SubjectTeacher, TeachingJournal } from "./src/types";

// Setup serverport
const PORT = process.env.PORT || 3000;

// Initialize dynamic in-memory store
const students: Student[] = [
  {
    id: "std-1",
    nis: "20241001",
    name: "Ahmad Fauzi",
    class: "7-A",
    email: "ahmad.fauzi@example.org",
    phone: "081234567890",
    savingsBalance: 120000
  },
  {
    id: "std-2",
    nis: "20241002",
    name: "Siti Aminah",
    class: "7-B",
    email: "siti.aminah@example.org",
    phone: "081298765432",
    savingsBalance: 250000
  },
  {
    id: "std-3",
    nis: "20230905",
    name: "Muhammad Rian",
    class: "8-A",
    email: "rian.smp@example.org",
    phone: "085612345678",
    savingsBalance: 450000
  },
  {
    id: "std-4",
    nis: "20220812",
    name: "Lailatul Fitriyah",
    class: "9-C",
    email: "laila.fit@example.org",
    phone: "089912341234",
    savingsBalance: 80000
  }
];

const sppBills: SppBill[] = [];
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

const attendanceLogs: AttendanceLog[] = [
  { id: "att-1", studentId: "std-1", date: "2026-05-18", status: "Hadir", notes: "" },
  { id: "att-2", studentId: "std-1", date: "2026-05-19", status: "Hadir", notes: "" },
  { id: "att-3", studentId: "std-1", date: "2026-05-20", status: "Sakit", notes: "Demam tinggi" },
  { id: "att-4", studentId: "std-2", date: "2026-05-18", status: "Hadir", notes: "" },
  { id: "att-5", studentId: "std-2", date: "2026-05-19", status: "Izin", notes: "Acara keluarga" },
  { id: "att-6", studentId: "std-2", date: "2026-05-20", status: "Hadir", notes: "" },
  { id: "att-7", studentId: "std-3", date: "2026-05-20", status: "Alpa", notes: "Tanpa keterangan" }
];

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

const teachingJournals: TeachingJournal[] = [
  {
    id: "tj-1",
    teacherId: "st-1",
    teacherName: "Drs. Heru Setyawan, M.Pd",
    subject: "Matematika",
    className: "7-A",
    date: "2026-05-20",
    topic: "Persamaan Linear Satu Variabel (PLSV)",
    attendance: [
      { studentId: "std-1", studentName: "Ahmad Fauzi", status: "Hadir" },
      { studentId: "std-2", studentName: "Siti Aminah", status: "Hadir" }
    ],
    notes: "Siswa memahami konsep dasar persamaan linear dengan sangat baik. Diperbanyak latihan soal mandiri.",
    createdAt: new Date().toISOString()
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
  treasurer: "Bendahara Madrasah NU",
  logo: "", // base64 string or image url containing the school logo
  logo2: "", // base64 string or image url containing the second school logo
  letterhead: "", // base64 string or image url containing the school kop surat
  treasurerSignature: "", // base64 string or image url of treasurer signature
  schoolStamp: "" // base64 string or image url of school official stamp
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

const DATA_FILE = path.join(process.cwd(), "data_store.json");

// Firebase SDK Database connection initialization
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, rpath: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "SERVER_SERVICE",
      email: "server-agent@demo.com",
      emailVerified: true
    },
    operationType,
    path: rpath
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let db: any = null;
let dbSyncStatus = "Initial";
let dbSyncError: string | null = null;
let lastSyncTime: string | null = null;

try {
  let firebaseConfig: any = null;
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  } else {
    console.warn("firebase-applet-config.json not found. Using embedded fallback Firebase credentials to auto-connect database...");
    firebaseConfig = {
      "projectId": "ungoogly-impulse-271nt",
      "appId": "1:77575326547:web:93e4b8ce8b1361adcc2fa6",
      "apiKey": "AIzaSyCz_48fPfLgDHX62T_ClnVAb6Ca1fl_xZI",
      "authDomain": "ungoogly-impulse-271nt.firebaseapp.com",
      "firestoreDatabaseId": "ai-studio-7ff6ffdf-833a-490d-a519-ec4364d0517f",
      "storageBucket": "ungoogly-impulse-271nt.firebasestorage.app",
      "messagingSenderId": "77575326547",
      "measurementId": ""
    };
  }

  if (firebaseConfig) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized successfully on server. DB ID:", firebaseConfig.firestoreDatabaseId);
    dbSyncStatus = "Firebase SDK Initialized";
  }
} catch (error) {
  console.error("Failed to initialize Firebase on server:", error);
  dbSyncStatus = "Initialization Failed";
  dbSyncError = error instanceof Error ? error.message : String(error);
}

async function saveDocToFirestore(colName: string, docId: string, data: any) {
  if (!db) return;
  try {
    await setDoc(doc(db, colName, docId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${colName}/${docId}`);
  }
}

async function deleteDocFromFirestore(colName: string, docId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, colName, docId));
    console.log(`Deleted document ${docId} from ${colName} in Firestore`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${colName}/${docId}`);
  }
}

async function saveStateToFirestore() {
  if (!db) return;
  try {
    console.log("Syncing database state to Firebase Firestore...");
    
    // Save students
    for (const item of students) {
      await saveDocToFirestore("students", item.id, item);
    }
    // Save sppBills
    for (const item of sppBills) {
      await saveDocToFirestore("sppBills", item.id, item);
    }
    // Save savingsTransactions
    for (const item of savingsTransactions) {
      await saveDocToFirestore("savingsTransactions", item.id, item);
    }
    // Save notifications (limit to newest 100 entries to optimize)
    const newestNotifications = notifications.slice(0, 100);
    for (const item of newestNotifications) {
      await saveDocToFirestore("realtimeNotifications", item.id, item);
    }
    // Save attendanceLogs
    for (const item of attendanceLogs) {
      await saveDocToFirestore("attendanceLogs", item.id, item);
    }
    // Save homeroomTeachers
    for (const item of homeroomTeachers) {
      await saveDocToFirestore("homeroomTeachers", item.id, item);
    }
    // Save all key configuration documents
    await saveDocToFirestore("configs", "sppRates", sppRates);
    await saveDocToFirestore("configs", "schoolIdentity", schoolIdentity);
    await saveDocToFirestore("configs", "midtransConfig", midtransConfig);
    await saveDocToFirestore("configs", "whatsappConfig", whatsappConfig);

    console.log("All state collections synced to Firestore.");
  } catch (err) {
    console.error("Failed executing batch state sync to Firestore:", err);
  }
}

async function syncWithFirestore() {
  if (!db) {
    dbSyncStatus = "Disabled (No DB)";
    return;
  }
  try {
    console.log("Connecting database to Firestore...");
    dbSyncStatus = "Connecting...";
    let snapshot;
    try {
      snapshot = await getDocs(collection(db, "students"));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "students");
    }

    if (snapshot && !snapshot.empty) {
      console.log("Cloud documents found. Pulling state from Firestore...");
      dbSyncStatus = "Syncing (Loading state)...";
      
      // Clear and populate students
      students.length = 0;
      snapshot.forEach(d => {
        students.push(d.data() as Student);
      });

      // Clear and populate bills
      try {
        const billsSnap = await getDocs(collection(db, "sppBills"));
        sppBills.length = 0;
        billsSnap.forEach(d => sppBills.push(d.data() as SppBill));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "sppBills");
      }

      // Clear and populate transactions
      try {
        const txsSnap = await getDocs(collection(db, "savingsTransactions"));
        savingsTransactions.length = 0;
        txsSnap.forEach(d => savingsTransactions.push(d.data() as SavingsTransaction));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "savingsTransactions");
      }

      // Clear and populate notifications
      try {
        const notifsSnap = await getDocs(collection(db, "realtimeNotifications"));
        notifications.length = 0;
        notifsSnap.forEach(d => notifications.push(d.data() as RealtimeNotification));
        notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "realtimeNotifications");
      }

      // Clear and populate attendance logs
      try {
        const attSnap = await getDocs(collection(db, "attendanceLogs"));
        attendanceLogs.length = 0;
        attSnap.forEach(d => attendanceLogs.push(d.data() as AttendanceLog));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "attendanceLogs");
      }

      // Clear and populate homeroom teachers
      try {
        const htSnap = await getDocs(collection(db, "homeroomTeachers"));
        homeroomTeachers.length = 0;
        htSnap.forEach(d => homeroomTeachers.push(d.data() as HomeroomTeacher));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "homeroomTeachers");
      }

      // Populate config settings
      try {
        const configSnap = await getDocs(collection(db, "configs"));
        configSnap.forEach(d => {
          const cid = d.id;
          const cdata = d.data();
          if (cid === "sppRates") Object.assign(sppRates, cdata);
          else if (cid === "schoolIdentity") Object.assign(schoolIdentity, cdata);
          else if (cid === "midtransConfig") Object.assign(midtransConfig, cdata);
          else if (cid === "whatsappConfig") Object.assign(whatsappConfig, cdata);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "configs");
      }

      dbSyncStatus = "Synced (Loaded from Cloud)";
      lastSyncTime = new Date().toISOString();
      dbSyncError = null;
      console.log("Connected successfully. State has been loaded from Firestore.");
    } else {
      console.log("No remote database documents. Performing initial Firestore migration...");
      dbSyncStatus = "Syncing (Uploading Seed)";
      await saveStateToFirestore();
      dbSyncStatus = "Synced (Initial Seed Completed)";
      lastSyncTime = new Date().toISOString();
      dbSyncError = null;
      console.log("Initial Firestore seed and migration completed.");
    }
  } catch (err) {
    dbSyncStatus = "Failed";
    dbSyncError = err instanceof Error ? err.message : String(err);
    console.error("Firestore database sync error:", err);
  }
}

function saveState() {
  try {
    const data = {
      students,
      sppBills,
      savingsTransactions,
      notifications,
      sppRates,
      schoolIdentity,
      midtransConfig,
      whatsappConfig,
      attendanceLogs,
      homeroomTeachers,
      subjectTeachers,
      teachingJournals
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    // Asynchronously update to Firestore
    saveStateToFirestore().catch(err => console.error("Async saveState to Firestore failed:", err));
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
        students.push(...data.students);
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
      if (Array.isArray(data.savingsTransactions)) {
        savingsTransactions.length = 0;
        savingsTransactions.push(...data.savingsTransactions);
      }
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
      if (data.sppRates) Object.assign(sppRates, data.sppRates);
      if (data.schoolIdentity) Object.assign(schoolIdentity, data.schoolIdentity);
      if (data.midtransConfig) Object.assign(midtransConfig, data.midtransConfig);
      if (data.whatsappConfig) Object.assign(whatsappConfig, data.whatsappConfig);
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
  saveState();
} else {
  students.forEach((student, sIdx) => {
    months.forEach((month, mIdx) => {
      // Make bills before Maret 2026 paid
      const isPaid = mIdx < 8; // Juli - Februari paid
      const mappedAmount = getSppAmountForClass(student.class);

      sppBills.push({
        id: `bill-${student.id}-${mIdx}`,
        studentId: student.id,
        month: month,
        year: mIdx < 6 ? 2025 : 2026,
        amount: mappedAmount,
        status: isPaid ? "paid" : "unpaid",
        paidAt: isPaid ? new Date(2025, 6 + mIdx, 10, 14, 30).toISOString() : undefined,
        paymentMethod: isPaid ? "Manual Teller" : undefined,
        orderId: isPaid ? `ORD-MANUAL-${student.id}-${mIdx}` : undefined
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

// Server configuration values (Midtrans Keys)
let midtransConfig: MidtransConfig = {
  merchantId: process.env.MIDTRANS_MERCHANT_ID || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  isProduction: false,
  adminFee: 4000,
  systemMaintenanceFee: 1500,
  chargeFeesToUser: true
};

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
  // Sync state with Firestore database
  await syncWithFirestore();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

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
      adminFee: 0, // Automated/Handled directly by Midtrans
      systemMaintenanceFee: midtransConfig.systemMaintenanceFee !== undefined ? midtransConfig.systemMaintenanceFee : 1500,
      chargeFeesToUser: midtransConfig.chargeFeesToUser !== undefined ? midtransConfig.chargeFeesToUser : true
    });
  });

  // Force database synchronization with Firestore
  app.post("/api/admin/force-firestore-sync", async (req, res) => {
    try {
      console.log("Admin triggered manual Firestore synchronization...");
      await syncWithFirestore();
      res.json({
        success: true,
        status: dbSyncStatus,
        lastSync: lastSyncTime,
        error: dbSyncError
      });
    } catch (err: any) {
      console.error("Manual Firestore sync failed:", err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Update dynamic midtrans credentials
  app.post("/api/set-midtrans-config", (req, res) => {
    const { merchantId, clientKey, serverKey, isProduction, systemMaintenanceFee, chargeFeesToUser } = req.body;
    midtransConfig = {
      merchantId: merchantId || "",
      clientKey: clientKey || "",
      serverKey: serverKey ? serverKey : (midtransConfig.serverKey || ""),
      isProduction: !!isProduction,
      adminFee: 0, // Automated/Handled directly by Midtrans
      systemMaintenanceFee: systemMaintenanceFee !== undefined ? Number(systemMaintenanceFee) : (midtransConfig.systemMaintenanceFee || 1500),
      chargeFeesToUser: chargeFeesToUser !== undefined ? !!chargeFeesToUser : (midtransConfig.chargeFeesToUser !== false)
    };
    
    const notif: RealtimeNotification = {
      id: `notif-sys-${Date.now()}`,
      title: "Konfigurasi Gateway & Biaya Diupdate ⚙️",
      message: `Midtrans Admin fee otomatis (Surcharge Aktif), Maintenance Fee: Rp ${midtransConfig.systemMaintenanceFee}. Ditanggung Wali: ${midtransConfig.chargeFeesToUser ? 'YA' : 'TIDAK'}`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notif);

    res.json({ success: true, message: "Konfigurasi Midtrans & Biaya Tambahan pemeliharaan berhasil disimpan!" });
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
        if (bill.status === "unpaid") {
          const student = students.find(s => s.id === bill.studentId);
          if (student) {
            const currentExpectedAmount = getSppAmountForClass(student.class);
            if (bill.amount !== currentExpectedAmount) {
              bill.amount = currentExpectedAmount;
              updatedBillsCount++;
            }
          }
        }
      });
    }

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-spp-config-${Date.now()}`,
      title: "Konfigurasi SPP Diperbarui",
      message: `Nominal SPP tingkat berhasil diperbarui (Kl. 7: Rp ${sppRates.grade7.toLocaleString('id-ID')}, Kl. 8: Rp ${sppRates.grade8.toLocaleString('id-ID')}, Kl. 9: Rp ${sppRates.grade9.toLocaleString('id-ID')}). ${updatedBillsCount > 0 ? `Berhasil menyesuaikan nominal pada ${updatedBillsCount} tagihan unpaid.` : ''}`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ success: true, sppRates, updatedBillsCount });
  });

  // Get School Identity settings
  app.get("/api/school-identity", (req, res) => {
    res.json({ success: true, schoolIdentity: { ...schoolIdentity, sppRates } });
  });

  // Update School Identity settings
  app.post("/api/admin/set-school-identity", (req, res) => {
    const { name, subheading, accreditation, address, phone, principal, treasurer, logo, logo2, letterhead, treasurerSignature, schoolStamp } = req.body;
    
    if (name !== undefined) schoolIdentity.name = String(name).trim();
    if (subheading !== undefined) schoolIdentity.subheading = String(subheading).trim();
    if (accreditation !== undefined) schoolIdentity.accreditation = String(accreditation).trim();
    if (address !== undefined) schoolIdentity.address = String(address).trim();
    if (phone !== undefined) schoolIdentity.phone = String(phone).trim();
    if (principal !== undefined) schoolIdentity.principal = String(principal).trim();
    if (treasurer !== undefined) schoolIdentity.treasurer = String(treasurer).trim();
    if (logo !== undefined) schoolIdentity.logo = String(logo); // can be empty or base64 data URI
    if (logo2 !== undefined) (schoolIdentity as any).logo2 = String(logo2); // can be empty or base64 data URI
    if (letterhead !== undefined) schoolIdentity.letterhead = String(letterhead); // can be empty or base64 data URI
    if (treasurerSignature !== undefined) (schoolIdentity as any).treasurerSignature = String(treasurerSignature);
    if (schoolStamp !== undefined) (schoolIdentity as any).schoolStamp = String(schoolStamp);

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-school-identity-${Date.now()}`,
      title: "Identitas Sekolah Diperbarui",
      message: `Identitas resmi sekolah ${schoolIdentity.name} berhasil diperbarui oleh Administrator.`,
      type: "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

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

  // --- STUDENT ATTENDANCE (ABSENSI) ENDPOINTS ---
  app.get("/api/attendance", (req, res) => {
    res.json(attendanceLogs);
  });

  app.get("/api/attendance/student/:studentId", (req, res) => {
    const studentId = req.params.studentId;
    const logs = attendanceLogs.filter(l => l.studentId === studentId);
    res.json(logs);
  });

  // Save single attendance entry
  app.post("/api/attendance", (req, res) => {
    const { studentId, date, status, notes } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: "Data absensi tidak lengkap." });
    }

    const index = attendanceLogs.findIndex(l => l.studentId === studentId && l.date === date);
    if (index !== -1) {
      attendanceLogs[index].status = status;
      attendanceLogs[index].notes = notes || "";
    } else {
      attendanceLogs.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId,
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
    const { logs } = req.body; // array of { studentId, date, status, notes }
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: "Logs harus berupa array." });
    }

    logs.forEach(item => {
      const { studentId, date, status, notes } = item;
      if (!studentId || !date || !status) return;

      const index = attendanceLogs.findIndex(l => l.studentId === studentId && l.date === date);
      if (index !== -1) {
        attendanceLogs[index].status = status;
        attendanceLogs[index].notes = notes || "";
      } else {
        attendanceLogs.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId,
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
    const { username, name, className, password } = req.body;
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
      password: password ? String(password).trim() : "wali123"
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
    const { username, name, className, password } = req.body;
    
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
    const { username, name, subject, password } = req.body;
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
      password: password ? String(password).trim() : "mapel123"
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
    const { username, name, subject, password } = req.body;
    
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
  app.get("/api/teaching-journals", (req, res) => {
    res.json(teachingJournals);
  });

  app.post("/api/teaching-journals", (req, res) => {
    const { 
      teacherId, 
      teacherName, 
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
      const { studentId, status, notes: attNotes } = studentAtt;
      const existingLogIndex = attendanceLogs.findIndex(log => log.studentId === studentId && log.date === date);
      if (existingLogIndex !== -1) {
        // Update existing daily attendance
        attendanceLogs[existingLogIndex].status = status;
        attendanceLogs[existingLogIndex].notes = `Oleh Guru Mapel (${subject}): ${attNotes || ''}`.trim();
      } else {
        // Create new daily attendance
        attendanceLogs.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId,
          date,
          status,
          notes: `Oleh Guru Mapel (${subject}): ${attNotes || ''}`.trim()
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
    const { title, message, type } = req.body;
    const notif: RealtimeNotification = {
      id: `notif-${Date.now()}`,
      title: title || "Pemberitahuan Sekolah",
      message: message || "Tidak ada pesan",
      type: type || "info",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notif);
    res.json({ success: true, notification: notif });
  });

  // Get active students
  app.get("/api/students", (req, res) => {
    res.json(students);
  });

  // Get all SPP bills (for Admin purposes)
  app.get("/api/admin/all-bills", (req, res) => {
    res.json(sppBills);
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
    const studentTx = savingsTransactions.filter(t => t.studentId === student.id);
    res.json({ student, bills: studentBills, transactions: studentTx });
  });

  // Get full details of a specific student
  app.get("/api/students/:id", (req, res) => {
    const student = students.find(s => s.id === req.params.id);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }
    const studentBills = sppBills.filter(b => b.studentId === student.id);
    const studentTx = savingsTransactions.filter(t => t.studentId === student.id);
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

    // 2. If it is a future month, it is active only if all bills strictly prior to this bill are paid
    const priorBills = studentBills.filter(b => {
      const bMonthIdx = MONTH_MAP[b.month] !== undefined ? MONTH_MAP[b.month] : 0;
      const bScore = b.year * 12 + bMonthIdx;
      return bScore < billScore;
    });

    return priorBills.every(b => b.status === 'paid');
  }

  // Admin Manual SPP Update (Teller/Manual mode)
  app.post("/api/admin/pay-spp-manual", (req, res) => {
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan SPP tidak ditemukan." });
    }
    if (bill.status === "paid") {
      return res.status(400).json({ error: "Tagihan sudah lunas." });
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
        `-- LP MA'ARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending auto payment WA:", err));
    }

    saveState();
    res.json({ success: true, bill });
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
    if (bill.paymentMethod !== "Manual Teller (Sekolah)") {
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
        `-- LP MA'ARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending void SPP WA:", err));
    }

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
          `-- LP MA'ARIF NU PANDAAN --`;
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
        `-- LP MA'ARIF NU PANDAAN --`;
      sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending savings WA:", err));
    }

    res.json({ success: true, student, transaction });
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
      if (!allowDebt && student.savingsBalance < valAmount) {
        // If they have some balance but not enough, we withdraw whatever balance they have remaining
        deductVal = student.savingsBalance;
      }

      if (deductVal <= 0) {
        skippedCount++;
        continue;
      }

      // Deduct balance
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
          `-- LP MA'ARIF NU PANDAAN --`;
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
    const { nis, name, class: className, email, phone, initialSavings } = req.body;
    
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

    const newStudent: Student = {
      id: newStudentId,
      nis,
      name,
      class: className,
      email: email || "",
      phone: phone || "",
      savingsBalance: parsedSavings
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
        sppBills.push({
          id: `bill-${newStudentId}-${startYear}-${mIdx}`,
          studentId: newStudentId,
          month: month,
          year: billYear,
          amount: getSppAmountForClass(className),
          status: "unpaid"
        });
      });
    });

    // If initial savings balance is provided, record a savings transaction
    if (parsedSavings > 0) {
      savingsTransactions.push({
        id: `sav-${newStudentId}-init`,
        studentId: newStudentId,
        type: "deposit",
        amount: parsedSavings,
        status: "success",
        createdAt: new Date().toISOString(),
        paymentMethod: "Manual Teller",
        notes: "Setoran Awal saat Pendaftaran"
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
    const { nis, name, class: className, email, phone, password } = req.body;
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
    student.nis = nis;
    student.name = name;
    student.class = className;
    student.email = email || "";
    student.phone = phone || "";
    
    if (password !== undefined) {
      student.password = String(password).trim();
    }

    // Sync student unpaid bills with the SPP rate corresponding to their new class grade
    let updatedBillsCount = 0;
    if (previousClass !== className) {
      const newRate = getSppAmountForClass(className);
      sppBills.forEach(bill => {
        if (bill.studentId === student.id && bill.status === "unpaid") {
          bill.amount = newRate;
          updatedBillsCount++;
        }
      });
    }

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

    students.forEach(student => {
      const cls = (student.class || "").trim();
      if (cls.toLowerCase() === "lulus" || cls.toLowerCase() === "lulusan") {
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
        const newRate = getSppAmountForClass(student.class);
        sppBills.forEach(bill => {
          if (bill.studentId === student.id && bill.status === "unpaid") {
            bill.amount = newRate;
            updatedBillsCount++;
          }
        });
      }
    });

    // 2. Automatically generate 12 months unpaid SPP bills for the next academic year for all non-graduated students
    let autoBillsGenerated = 0;
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
      if (cls === "lulus" || cls === "lulusan") {
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
            amount: getSppAmountForClass(student.class),
            status: "unpaid"
          });
          autoBillsGenerated++;
        }
      });
    });

    // Save changes
    saveState();

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-promote-std-${Date.now()}`,
      title: "Kenaikan Kelas Selesai",
      message: `Prosedur Kenaikan Kelas & Aktivasi Tahun Ajaran ${nextStartYear}/${nextStartYear + 1} berhasil dijalankan secara otomatis. ${promotedCount} siswa naik kelas, ${graduatedCount} siswa lulus, dan ${autoBillsGenerated} lembar tagihan baru otomatis digenerate.`,
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
      nextStartYear,
      students 
    });
  });

  // 3b. Pengaktifan Tahun Ajaran Baru & Bulk SPP Bill Generation
  app.post("/api/admin/activate-academic-year", (req, res) => {
    const { startYear } = req.body;
    const yearNum = Number(startYear);
    
    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      return res.status(400).json({ error: "Tahun akademik awal tidak valid." });
    }

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

    let billsGenerated = 0;
    let skippedBillsCount = 0;

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
          sppBills.push({
            id: `bill-${student.id}-${m.name}-${billYear}-${Date.now().toString().slice(-4)}`,
            studentId: student.id,
            month: m.name,
            year: billYear,
            amount: getSppAmountForClass(student.class),
            status: "unpaid"
          });
          billsGenerated++;
        } else {
          skippedBillsCount++;
        }
      });
    });

    // Broadcast SSE notification
    const notification: RealtimeNotification = {
      id: `notif-new-year-${Date.now()}`,
      title: `Tahun Ajaran Baru ${yearNum}/${yearNum + 1} Aktif`,
      message: `Tahun Ajaran ${yearNum}/${yearNum + 1} berhasil diaktifkan. SPP Bulanan siap dibayar. Total ${billsGenerated} lembar tagihan baru dihasilkan.`,
      type: "success",
      createdAt: new Date().toISOString()
    };
    broadcastNotification(notification);

    res.json({ 
      success: true, 
      message: `Tahun Ajaran ${yearNum}/${yearNum + 1} berhasil diaktifkan!`,
      billsGenerated,
      skippedBillsCount
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
      const { nis, name, class: className, email, phone, initialSavings } = inputStd;
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
          savingsBalance: parsedSavings
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
            sppBills.push({
              id: `bill-${newStudentId}-${startYear}-${mIdx}`,
              studentId: newStudentId,
              month: month,
              year: billYear,
              amount: getSppAmountForClass(className),
              status: "unpaid"
            });
          });
        });

        // Record savings transactions if parsedSavings > 0
        if (parsedSavings > 0) {
          savingsTransactions.push({
            id: `sav-${newStudentId}-init-import`,
            studentId: newStudentId,
            type: "deposit",
            amount: parsedSavings,
            status: "success",
            createdAt: new Date().toISOString(),
            paymentMethod: "Manual Teller",
            notes: "Setoran Awal via Import Kolektif"
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
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    if (bill.status === "paid") {
      return res.status(400).json({ error: "Tagihan sudah lunas." });
    }

    const studentBills = sppBills.filter(b => b.studentId === bill.studentId);
    if (!isBillActive(bill, studentBills)) {
      return res.status(400).json({ error: `Tagihan SPP ${bill.month} ${bill.year} belum aktif. Silakan lunasi SPP bulan berjalan terlebih dahulu.` });
    }

    const student = students.find(s => s.id === bill.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const orderId = `SPP-${bill.id}-${Date.now()}`;
    bill.orderId = orderId;
    bill.status = "pending";

    // Calculate fees if enabled and charged to user
    const adminFeeVal = 0; // Automated directly by Midtrans Surcharge settings
    const maintenanceFeeVal = midtransConfig.chargeFeesToUser ? (midtransConfig.systemMaintenanceFee || 1500) : 0;
    const grossAmountVal = bill.amount + maintenanceFeeVal;

    // If Midtrans credentials aren't set, we automatically enter sandbox flow simulation mode
    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;

    if (!hasMidtrans) {
      // Simulation mode
      const mockSnapToken = `snap-token-spp-mock-${Date.now()}`;
      return res.json({
        token: mockSnapToken,
        isSimulated: true,
        orderId,
        redirectUrl: "#",
        adminFee: 0, // Calculated dynamically by Midtrans
        systemMaintenanceFee: maintenanceFeeVal,
        baseAmount: bill.amount,
        totalAmount: grossAmountVal,
        message: "Menggunakan Simulasi Midtrans Sandbox karena Kunci Server tidak diatur."
      });
    }

    // Real Midtrans integration flow
    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

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
            id: bill.id,
            price: bill.amount,
            quantity: 1,
            name: `SPP ${bill.month} ${bill.year} - ${student.name}`
          },
          ...(maintenanceFeeVal > 0 ? [
            {
              id: "fee-maintenance",
              price: maintenanceFeeVal,
              quantity: 1,
              name: "Biaya Pemeliharaan Sistem"
            }
          ] : [])
        ]
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
      // Fallback to beautiful simulation if API call fails
      const mockSnapToken = `snap-token-spp-mock-${Date.now()}`;
      res.json({
        token: mockSnapToken,
        isSimulated: true,
        orderId,
        redirectUrl: "#",
        adminFee: adminFeeVal,
        systemMaintenanceFee: maintenanceFeeVal,
        baseAmount: bill.amount,
        totalAmount: grossAmountVal,
        error: err.message,
        message: "API error. Menggunakan Simulasi Midtrans Sandbox Aman."
      });
    }
  });

  // Deposit savings generate snap token
  app.post("/api/deposit-savings-snap", async (req, res) => {
    const { studentId, amount } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const valAmount = Number(amount);
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: "Jumlah deposit harus positif." });
    }

    const orderId = `SAV-${studentId}-${Date.now()}`;
    
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

    // Calculate fees if enabled and charged to user
    const adminFeeVal = 0; // Automated directly by Midtrans Surcharge settings
    const maintenanceFeeVal = midtransConfig.chargeFeesToUser ? (midtransConfig.systemMaintenanceFee || 1500) : 0;
    const grossAmountVal = valAmount + maintenanceFeeVal;

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      const mockSnapToken = `snap-token-sav-mock-${Date.now()}`;
      return res.json({
        token: mockSnapToken,
        isSimulated: true,
        orderId,
        redirectUrl: "#",
        adminFee: 0, // Calculated dynamically by Midtrans
        systemMaintenanceFee: maintenanceFeeVal,
        baseAmount: valAmount,
        totalAmount: grossAmountVal
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

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
            name: `Top Up Tabungan - ${student.name}`
          },
          ...(maintenanceFeeVal > 0 ? [
            {
              id: "fee-maintenance",
              price: maintenanceFeeVal,
              quantity: 1,
              name: "Biaya Pemeliharaan Sistem"
            }
          ] : [])
        ]
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
      // Fallback
      const mockSnapToken = `snap-token-sav-mock-${Date.now()}`;
      res.json({
        token: mockSnapToken,
        isSimulated: true,
        orderId,
        redirectUrl: "#",
        adminFee: adminFeeVal,
        systemMaintenanceFee: maintenanceFeeVal,
        baseAmount: valAmount,
        totalAmount: grossAmountVal,
        message: "Gagal memanggil API Midtrans. Beroperasi di bawah Simulasi Sandbox aman."
      });
    }
  });

  // Client simulated success trigger (Allows direct browser simulation)
  app.post("/api/simulate-payment-success", (req, res) => {
    const { orderId, paymentType } = req.body;
    
    let message = "";
    let affectedStudent: Student | null = null;
    let title = "";

    if (orderId.startsWith("SPP-")) {
      const bill = sppBills.find(b => b.orderId === orderId);
      if (bill) {
        bill.status = "paid";
        bill.paidAt = new Date().toISOString();
        bill.paymentMethod = paymentType || "Midtrans Simulator (GoPay/Transfer)";
        
        affectedStudent = students.find(s => s.id === bill.studentId) || null;
        title = "SPP Lunas Terverifikasi";
        message = `Pembayaran SPP ${affectedStudent?.name || ""} bulan ${bill.month} ${bill.year} sebesar Rp ${bill.amount.toLocaleString("id-ID")} BERHASIL divalidasi oleh Midtrans secara instan!`;

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
            `• Waktu: ${new Date().toLocaleDateString('id-ID')} pukul ${new Date().toLocaleTimeString('id-ID')}\n` +
            `• Status: *LUNAS (PAID)*\n\n` +
            `Terima kasih atas tertib administrasi pembayaran iuran sekolah.\n` +
            `-- LP MA'ARIF NU PANDAAN --`;
          sendWhatsappNotification(affectedStudent.phone, waMsg).catch(err => console.error("Error sending online payment WA:", err));
        }

        return res.json({ success: true, type: "spp", bill, student: affectedStudent });
      }
    } else if (orderId.startsWith("SAV-")) {
      const transaction = savingsTransactions.find(t => t.orderId === orderId);
      if (transaction) {
        // Only progress if still pending to guarantee idempotency
        if (transaction.status === "pending") {
          transaction.status = "success";
          transaction.paymentMethod = paymentType || "Midtrans Simulator";
          
          affectedStudent = students.find(s => s.id === transaction.studentId) || null;
          if (affectedStudent) {
            affectedStudent.savingsBalance += transaction.amount;
          }

          title = "Tabungan Terisi Real-time";
          message = `Uang tabungan Rp ${transaction.amount.toLocaleString("id-ID")} untuk ${affectedStudent?.name || ""} sukses ditambahkan via Midtrans (${paymentType || 'E-Wallet'}). Saldo total: Rp ${affectedStudent?.savingsBalance.toLocaleString("id-ID")}.`;

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
              `-- LP MA'ARIF NU PANDAAN --`;
            sendWhatsappNotification(affectedStudent.phone, waMsg).catch(err => console.error("Error sending online savings WA:", err));
          }

          return res.json({ success: true, type: "savings", transaction, student: affectedStudent });
        } else {
          return res.json({ success: true, message: "Transaksi sudah diproses sebelumnya." });
        }
      }
    }

    res.status(404).json({ error: "Order ID tidak ditemukan atau telah diproses." });
  });

  // Real Midtrans Webhook Notification Handler (Midtrans HTTP POST calls this directly)
  app.post("/api/midtrans-webhook", async (req, res) => {
    const webhookData = req.body;
    const { order_id, transaction_status, payment_type, gross_amount } = webhookData;

    console.log("Midtrans Webhook Received:", { order_id, transaction_status, payment_type, gross_amount });

    // Handle verification
    const isSettlement = transaction_status === "settlement" || transaction_status === "capture";
    
    if (!order_id) {
      return res.status(400).json({ status: "error", message: "Order ID missing" });
    }

    let isHandled = false;

    if (order_id.startsWith("SPP-")) {
      const bill = sppBills.find(b => b.orderId === order_id);
      if (bill) {
        if (isSettlement) {
          bill.status = "paid";
          bill.paidAt = new Date().toISOString();
          bill.paymentMethod = `Midtrans (${payment_type})`;
          
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
              `-- LP MA'ARIF NU PANDAAN --`;
            sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending online payment web WA:", err));
          }
        } else if (transaction_status === "pending") {
          bill.status = "pending";
          isHandled = true;
        } else if (transaction_status === "expire" || transaction_status === "deny" || transaction_status === "cancel") {
          bill.status = "unpaid";
          isHandled = true;
        }
      }
    } else if (order_id.startsWith("SAV-")) {
      const transaction = savingsTransactions.find(t => t.orderId === order_id);
      if (transaction) {
        if (isSettlement && transaction.status === "pending") {
          transaction.status = "success";
          transaction.paymentMethod = `Midtrans (${payment_type})`;
          
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
              `-- LP MA'ARIF NU PANDAAN --`;
            sendWhatsappNotification(student.phone, waMsg).catch(err => console.error("Error sending online savings web WA:", err));
          }
          isHandled = true;
        }
      }
    }

    res.json({ status: "success", handled: isHandled });
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
}

startServer();
