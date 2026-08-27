import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Student,
  SppBill,
  SavingsTransaction,
  SchoolIdentity,
  HomeroomTeacher,
  SubjectTeacher,
  AttendanceLog,
  StudentInfractionLog,
  isSppBillOverdue,
  MiscBill,
  ClassSchedule,
} from "../types";
import ScheduleView from "./ScheduleView";
import { SavingsPassbookModal } from "./SavingsPassbookModal";
import { motion, AnimatePresence } from "motion/react";
import {
  exportDailyReportToExcel,
  exportSppRecapToExcel,
  exportSppChecklistToExcel,
  exportSavingsRecapToExcel,
  exportMiscRecapToExcel,
  exportFilteredMiscBillsToExcel,
} from "../utils/excelExport";
import { MidtransBulkReportModal } from "./MidtransBulkReportModal";
import MidtransPayModal from "./MidtransPayModal";
import {
  ShieldAlert,
  BookOpen,
  Users,
  Banknote,
  BellRing,
  Settings,
  CheckCircle,
  Smartphone,
  Apple,
  User,
  RefreshCw,
  Send,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Zap,
  GraduationCap,
  Check,
  AlertCircle,
  Printer,
  TrendingUp,
  BarChart3,
  FileText,
  Calendar,
  FileCheck,
  ImageIcon,
  UploadCloud,
  Search,
  Trash2,
  Edit,
  ClipboardCheck,
  Download,
  ShoppingCart,
  X,
  Camera,
  Lock,
  Key,
  Home,
  LayoutGrid,
  Award,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Database,
  HardDrive,
  Server,
  FileCode,
  Terminal,
  CheckSquare,
} from "lucide-react";
import StudentManagement from "./StudentManagement";
import BukuIndukManagement from "./BukuIndukManagement";
import AdminSpmbManagement from "./AdminSpmbManagement";
import QRScannerModal from "./QRScannerModal";
import StudentPaymentCard from "./StudentPaymentCard";
import Pagination from "./Pagination";
import QRCode from "qrcode";
import JSZip from "jszip";

// Component for rendering beautifully styled, local QR Codes without API dependancy
function StudentQrCode({ text, size = 140 }: { text: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(text, {
      margin: 1,
      width: size,
      color: {
        dark: "#0f172a", // slate-900
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => console.error("Error in scanning StudentQrCode:", err));

    return () => {
      isMounted = false;
    };
  }, [text, size]);

  if (!qrUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center animate-pulse text-[8px] text-slate-400 font-extrabold"
      >
        QR...
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt="QR Code Siswa"
      style={{ width: size, height: size }}
      className="object-contain rounded-xl"
      referrerPolicy="no-referrer"
    />
  );
}

// Helper to extract clean YYYY-MM-DD date string
export const getWIBDateString = (dateInput?: string | Date | null): string => {
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
};

interface AdminPanelProps {
  students: Student[];
  bills: SppBill[];
  transactions: SavingsTransaction[];
  treasurerTransactions?: any[];
  isLoading: boolean;
  midtransStatus: {
    merchantId: string;
    clientKey: string;
    hasServerKey: boolean;
    isProduction: boolean;
    isDisabled?: boolean;
    adminFee?: number;
    systemMaintenanceFee?: number;
    chargeFeesToUser?: boolean;
    hasPin?: boolean;
  } | null;
  onPaySppManual: (billId: string) => Promise<any>;
  onCancelSppManual?: (billId: string) => Promise<any>;
  onPaySppViaMidtrans?: (bill: SppBill) => Promise<void>;
  adminSppBillToPrint?: string | null;
  onClearAdminSppBillToPrint?: () => void;
  onDepositSavingsViaMidtrans?: (
    amount: number,
    studentId?: string,
  ) => Promise<void>;
  adminSavingsToPrint?: {
    studentId: string;
    orderId: string;
    amount: number;
  } | null;
  onClearAdminSavingsToPrint?: () => void;
  onSavingsManual: (
    studentId: string,
    type: "deposit" | "withdrawal",
    amount: number,
    notes: string,
  ) => Promise<any>;
  onConfirmWithdrawal?: (
    transactionId: string,
    action: "approve" | "reject",
  ) => Promise<boolean>;
  onBulkWithdrawSavings?: (
    grade: string,
    amount: number,
    notes: string,
    allowDebt: boolean,
  ) => Promise<any>;
  onBroadcastNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "payment",
    category?: string,
  ) => Promise<boolean>;
  onRefresh: () => void;
  onCreateStudent: (data: {
    nis: string;
    name: string;
    class: string;
    email: string;
    phone: string;
    initialSavings: number;
    gender?: string;
    customSppRate?: number;
  }) => Promise<boolean>;
  onUpdateStudent: (
    id: string,
    data: {
      nis: string;
      name: string;
      class: string;
      email: string;
      phone: string;
      gender?: string;
      mutationDate?: string;
      mutationReason?: string;
      mutationDestination?: string;
      customSppRate?: number | null;
    },
  ) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onImportStudents: (
    list: Array<{
      nis: string;
      name: string;
      class: string;
      email: string;
      phone: string;
      initialSavings?: number;
      gender?: string;
      password?: string;
    }>,
  ) => Promise<{ success: boolean; addedCount: number; updatedCount: number }>;
  onImportTeachers?: (
    homerooms: Array<{
      username: string;
      name: string;
      className: string;
      password?: string;
    }>,
    subjectTeachers: Array<{
      username: string;
      name: string;
      subject: string;
      password?: string;
    }>,
  ) => Promise<{
    success: boolean;
    homeroomsAdded: number;
    homeroomsUpdated: number;
    subjectsAdded: number;
    subjectsUpdated: number;
  }>;
  schoolIdentity?: SchoolIdentity;
  onUpdateSchoolIdentity?: (
    updatedData: Partial<SchoolIdentity>,
  ) => Promise<boolean>;
  homerooms?: HomeroomTeacher[];
  onCreateHomeroom?: (data: {
    username: string;
    name: string;
    className: string;
    password?: string;
    skUrl?: string;
  }) => Promise<boolean>;
  onUpdateHomeroom?: (
    id: string,
    data: {
      username?: string;
      name?: string;
      className?: string;
      password?: string;
      skUrl?: string;
    },
  ) => Promise<boolean>;
  onDeleteHomeroom?: (id: string) => Promise<boolean>;
  subjectTeachers?: SubjectTeacher[];
  onCreateSubjectTeacher?: (data: {
    username: string;
    name: string;
    subject: string;
    password?: string;
    skUrl?: string;
  }) => Promise<boolean>;
  onUpdateSubjectTeacher?: (
    id: string,
    data: {
      username?: string;
      name?: string;
      subject?: string;
      password?: string;
      skUrl?: string;
    },
  ) => Promise<boolean>;
  onDeleteSubjectTeacher?: (id: string) => Promise<boolean>;
  onAutoGenerateSubjectTeachers?: () => Promise<boolean>;
  onLogout?: () => void;
  attendanceLogs?: AttendanceLog[];
  scannedStudentNis?: string | null;
  scannedStudentAt?: number | null;
  miscBills?: MiscBill[];
  classSchedules?: ClassSchedule[];
}

export default function AdminPanel({
  students,
  bills,
  transactions,
  treasurerTransactions = [],
  isLoading,
  midtransStatus,
  onPaySppManual,
  onCancelSppManual,
  onPaySppViaMidtrans,
  adminSppBillToPrint,
  onClearAdminSppBillToPrint,
  onDepositSavingsViaMidtrans,
  adminSavingsToPrint,
  onClearAdminSavingsToPrint,
  onSavingsManual,
  onConfirmWithdrawal,
  onBulkWithdrawSavings,
  onBroadcastNotification,
  onRefresh,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportStudents,
  onImportTeachers,
  schoolIdentity,
  onUpdateSchoolIdentity,
  homerooms = [],
  onCreateHomeroom,
  onUpdateHomeroom,
  onDeleteHomeroom,
  subjectTeachers = [],
  onCreateSubjectTeacher,
  onUpdateSubjectTeacher,
  onDeleteSubjectTeacher,
  onAutoGenerateSubjectTeachers,
  onLogout,
  attendanceLogs = [],
  scannedStudentNis,
  scannedStudentAt,
  miscBills = [],
  classSchedules = []
}: AdminPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [passbookModalStudent, setPassbookModalStudent] = useState<Student | null>(null);
  const [adminTab, setAdminTab] = useState<
    | "roster"
    | "broadcast"
    | "config"
    | "student_mgmt"
    | "laporan"
    | "homeroom_mgmt"
    | "subject_teacher_mgmt"
    | "student_qr"
    | "alumni"
    | "mutasi"
    | "buku_induk"
    | "pembayaran_lain"
    | "jadwal"
    | "spmb"
  >("roster");

  useEffect(() => {
    if (scannedStudentNis) {
      const target = students.find(
        (s) =>
          s.nis?.toLowerCase() === scannedStudentNis.toLowerCase() ||
          s.id === scannedStudentNis,
      );
      if (target) {
        setAdminTab("roster");
        setSelectedStudent(target);
      }
    }
  }, [scannedStudentNis, scannedStudentAt, students]);

  // Synchronize local selectedStudent state with updated parent props
  useEffect(() => {
    if (selectedStudent) {
      const updated = students.find((s) => s.id === selectedStudent.id);
      if (updated) {
        setSelectedStudent(updated);
      }
    }
  }, [students, selectedStudent?.id]);

  // States for Pembayaran Lain-lain
  const ACADEMIC_MONTHS = ["Juli", "Agustus", "September", "Oktober", "November", "Desember", "Januari", "Februari", "Maret", "April", "Mei", "Juni"];
  const [isCreateMiscOpen, setIsCreateMiscOpen] = useState(false);
  const [miscTargetType, setMiscTargetType] = useState<"all" | "grade" | "class" | "single">("all");
  const [miscTargetGrade, setMiscTargetGrade] = useState("");
  const [miscTargetClass, setMiscTargetClass] = useState("");
  const [miscTargetStudentId, setMiscTargetStudentId] = useState("");
  const [miscTitle, setMiscTitle] = useState("");
  const [miscAmount, setMiscAmount] = useState("");
  const [miscSearch, setMiscSearch] = useState("");
  const [miscGradeFilter, setMiscGradeFilter] = useState<string>("all");
  const [miscClassFilter, setMiscClassFilter] = useState<string>("all");
  const [miscStatusFilter, setMiscStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [miscTypeFilter, setMiscTypeFilter] = useState<"all" | "once" | "monthly">("all");
  const [miscMonthFilter, setMiscMonthFilter] = useState<string>("all");
  const [miscBillingType, setMiscBillingType] = useState<"once" | "monthly">("once");
  const [miscSelectedMonths, setMiscSelectedMonths] = useState<string[]>([]);
  const [selectedMiscBillIds, setSelectedMiscBillIds] = useState<string[]>([]);
  const [miscStudentSearchQuery, setMiscStudentSearchQuery] = useState("");
  const [isSubmittingMisc, setIsSubmittingMisc] = useState(false);

  // States for Pembayaran Massal (Bulk Payment) Pembayaran Lain-lain
  const [isPayMiscBulkOpen, setIsPayMiscBulkOpen] = useState(false);
  const [payMiscBulkTitleFilter, setPayMiscBulkTitleFilter] = useState<string>("all");
  const [payMiscBulkGradeFilter, setPayMiscBulkGradeFilter] = useState<string>("all");
  const [payMiscBulkClassFilter, setPayMiscBulkClassFilter] = useState<string>("all");
  const [payMiscBulkSearch, setPayMiscBulkSearch] = useState<string>("");
  const [isSubmittingPayMiscBulk, setIsSubmittingPayMiscBulk] = useState(false);

  // State for Midtrans Bulk Report Modal
  const [isMidtransBulkReportModalOpen, setIsMidtransBulkReportModalOpen] = useState(false);

  // Helper to extract grade level
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

  // Get unique grades available
  const availableGrades = useMemo(() => {
    const gradesSet = new Set<string>();
    students.forEach((s) => {
      if (s.class) {
        const g = getGradeLevel(s.class);
        if (g) gradesSet.add(g);
      }
    });
    return Array.from(gradesSet).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [students]);

  // States for Revisi Detail Tagihan Pembayaran Lain-lain
  const [isEditMiscOpen, setIsEditMiscOpen] = useState(false);
  const [editingMiscBill, setEditingMiscBill] = useState<any | null>(null);
  const [editMiscTitle, setEditMiscTitle] = useState("");
  const [editMiscAmount, setEditMiscAmount] = useState("");
  const [editMiscIsMonthly, setEditMiscIsMonthly] = useState(false);
  const [editMiscMonth, setEditMiscMonth] = useState("");
  const [isUpdatingMisc, setIsUpdatingMisc] = useState(false);
  const [updateAllWithSameTitle, setUpdateAllWithSameTitle] = useState(false);

  // States for Hapus Massal Tagihan Pembayaran Lain-lain
  const [isDeleteMiscBulkOpen, setIsDeleteMiscBulkOpen] = useState(false);
  const [deleteMiscBulkTitle, setDeleteMiscBulkTitle] = useState("");
  const [isDeletingMiscBulk, setIsDeletingMiscBulk] = useState(false);

  const handleCreateMiscBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!miscTitle.trim()) {
      alert("Judul tagihan tidak boleh kosong.");
      return;
    }
    const amountNum = Number(miscAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Nominal tagihan harus berupa angka positif.");
      return;
    }
    if (miscTargetType === "grade" && !miscTargetGrade) {
      alert("Harap pilih tingkat kelas terlebih dahulu.");
      return;
    }
    if (miscTargetType === "class" && !miscTargetClass.trim()) {
      alert("Target kelas tidak boleh kosong.");
      return;
    }
    if (miscTargetType === "single" && !miscTargetStudentId) {
      alert("Harap pilih siswa terlebih dahulu.");
      return;
    }
    if (miscBillingType === "monthly" && miscSelectedMonths.length === 0) {
      alert("Harap pilih minimal satu bulan untuk tagihan bulanan.");
      return;
    }

    try {
      setIsSubmittingMisc(true);
      const payload = {
        targetType: miscTargetType,
        targetValue:
          miscTargetType === "grade"
            ? miscTargetGrade
            : miscTargetType === "class"
            ? miscTargetClass.trim()
            : miscTargetType === "single"
            ? miscTargetStudentId
            : "all",
        title: miscTitle.trim(),
        amount: amountNum,
        isMonthly: miscBillingType === "monthly",
        selectedMonths: miscBillingType === "monthly" ? miscSelectedMonths : []
      };

      const res = await fetch("/api/admin/create-misc-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat tagihan lain-lain.");
      }
      alert(`Berhasil! ${data.count || 0} tagihan baru telah berhasil dibuat.`);
      setIsCreateMiscOpen(false);
      setMiscTitle("");
      setMiscAmount("");
      setMiscTargetGrade("");
      setMiscTargetClass("");
      setMiscTargetStudentId("");
      setMiscStudentSearchQuery("");
      setMiscBillingType("once");
      setMiscSelectedMonths([]);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat membuat tagihan.");
    } finally {
      setIsSubmittingMisc(false);
    }
  };

  const handlePayMiscManualLocal = async (billId: string) => {
    const confirmPay = window.confirm("Apakah Anda yakin ingin memproses pembayaran TUNAI manual (Teller) untuk tagihan ini?");
    if (!confirmPay) return;

    try {
      const res = await fetch("/api/admin/pay-misc-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pembayaran manual.");
      }
      onRefresh();
      
      const paidBill = data.bill;
      const s = students.find((st) => st.id === paidBill.studentId);
      if (s) {
        setReceiptToPrint({
          type: "misc",
          detail: paidBill,
          student: s
        });
        setPrintId("print-receipt-section");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal memproses pembayaran manual.");
    }
  };

  const handleDeleteMiscBillLocal = async (billId: string) => {
    const confirmDelete = window.confirm("PERINGATAN: Menghapus tagihan ini akan menghapus data tagihan permanen. Apakah Anda yakin?");
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/admin/delete-misc-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus tagihan.");
      }
      alert("Tagihan berhasil dihapus.");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menghapus tagihan.");
    }
  };

  const handleDeleteMiscBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteMiscBulkTitle.trim()) {
      alert("Harap pilih atau masukkan judul tagihan yang akan dihapus.");
      return;
    }

    const confirmDelete = window.confirm(
      `PERINGATAN SANGAT PENTING:\n\n` +
      `Anda akan menghapus MASSAL seluruh tagihan dengan judul "${deleteMiscBulkTitle}" untuk semua siswa.\n` +
      `- Tagihan yang berstatus BELUM LUNAS akan dihapus secara permanen.\n` +
      `- Tagihan yang sudah LUNAS tidak akan dihapus demi ketepatan laporan keuangan bendahara.\n\n` +
      `Apakah Anda yakin ingin melanjutkan tindakan ini?`
    );
    if (!confirmDelete) return;

    try {
      setIsDeletingMiscBulk(true);
      const res = await fetch("/api/admin/delete-misc-bill-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: deleteMiscBulkTitle.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus massal tagihan.");
      }
      alert(data.message || "Hapus massal tagihan berhasil diselesaikan!");
      setIsDeleteMiscBulkOpen(false);
      setDeleteMiscBulkTitle("");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat menghapus massal.");
    } finally {
      setIsDeletingMiscBulk(false);
    }
  };

  const handlePayMiscBulk = async (billIdsToPay: string[]) => {
    if (!billIdsToPay || billIdsToPay.length === 0) {
      alert("Pilih minimal 1 tagihan berstatus belum lunas untuk diproses.");
      return;
    }

    const targetBills = miscBills.filter(b => billIdsToPay.includes(b.id) && b.status !== "paid");
    if (targetBills.length === 0) {
      alert("Tidak ada tagihan berstatus belum lunas dalam daftar terpilih.");
      return;
    }

    const totalNominal = targetBills.reduce((sum, b) => sum + b.amount, 0);
    const confirmPay = window.confirm(
      `KONFIRMASI PEMBAYARAN MASSAL TELLER:\n\n` +
      `Anda akan melunaskan secara MASSAL sebanyak ${targetBills.length} tagihan siswa.\n` +
      `Total Nominal: Rp ${totalNominal.toLocaleString("id-ID")}\n` +
      `Metode: Manual Teller (Sekolah)\n\n` +
      `Apakah Anda yakin ingin memproses pembayaran lunas ini?`
    );
    if (!confirmPay) return;

    try {
      setIsSubmittingPayMiscBulk(true);
      const res = await fetch("/api/admin/pay-misc-manual-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billIds: targetBills.map(b => b.id) })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pembayaran massal.");
      }
      alert(`Berhasil! ${data.count} tagihan pembayaran lain-lain telah dilunaskan.`);
      setSelectedMiscBillIds([]);
      setIsPayMiscBulkOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat memproses pembayaran massal.");
    } finally {
      setIsSubmittingPayMiscBulk(false);
    }
  };

  const handleCancelMiscPaymentLocal = async (billId: string) => {
    const confirmCancel = window.confirm(
      "Apakah Anda yakin ingin membatalkan pembayaran untuk tagihan ini?\n\n" +
      "- Status pembayaran akan diubah kembali menjadi BELUM LUNAS.\n" +
      "- Pembayaran via Potong Tabungan akan otomatis dikembalikan ke saldo tabungan siswa.\n" +
      "- Catatan buku kas bendahara terkait transaksi ini akan dihapus/dibatalkan."
    );
    if (!confirmCancel) return;

    try {
      const res = await fetch("/api/admin/cancel-misc-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membatalkan pembayaran.");
      }
      alert("Pembayaran berhasil dibatalkan dan status tagihan dikembalikan menjadi Belum Lunas!");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal membatalkan pembayaran.");
    }
  };

  const handlePrintPdfMiscBills = () => {
    const filteredList = miscBills.filter((bill) => {
      const s = students.find((st) => st.id === bill.studentId);

      if (miscGradeFilter !== "all") {
        if (!s || !s.class || !s.class.startsWith(miscGradeFilter)) return false;
      }

      if (miscClassFilter !== "all") {
        if (!s || s.class !== miscClassFilter) return false;
      }

      if (miscTypeFilter === "once" && bill.isMonthly) return false;
      if (miscTypeFilter === "monthly" && !bill.isMonthly) return false;
      if (miscMonthFilter !== "all" && bill.month !== miscMonthFilter) return false;

      const matchText =
        bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
        bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
        (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
        (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
        (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase());
      if (!matchText) return false;

      if (miscStatusFilter === "unpaid") return bill.status === "unpaid" || bill.status === "pending";
      if (miscStatusFilter === "paid") return bill.status === "paid";
      return true;
    });

    if (filteredList.length === 0) {
      alert("Tidak ada data tagihan pembayaran lain-lain yang sesuai dengan filter yang aktif untuk dicetak.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak dokumen PDF.");
      return;
    }

    const schoolNameStr = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const subHeader = schoolIdentity?.subheading || "Sistem Informasi Manajemen & Keuangan Madrasah";
    const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
    const address = schoolIdentity?.address || "Pasuruan, Jawa Timur";
    const logoSrc = schoolIdentity?.logo || "";
    const principalName = schoolIdentity?.principal || "Kepala Sekolah";
    const treasurerName = schoolIdentity?.treasurer || "Bendahara Sekolah";

    const filterTingkatStr = miscGradeFilter === "all" ? "Semua Tingkat" : `Tingkat ${miscGradeFilter}`;
    const filterKelasStr = miscClassFilter === "all" ? "Semua Kelas" : `Kelas ${miscClassFilter}`;
    const filterTipeStr =
      miscTypeFilter === "all"
        ? "Semua Tipe"
        : miscTypeFilter === "once"
        ? "Sekali Bayar (Insidental)"
        : "Tagihan Bulanan";
    const filterBulanStr = miscMonthFilter === "all" ? "Semua Bulan" : miscMonthFilter;
    const filterStatusStr =
      miscStatusFilter === "all" ? "Semua Status" : miscStatusFilter === "paid" ? "Lunas" : "Belum Lunas";
    const filterSearchStr = miscSearch ? `Kata Kunci: "${miscSearch}"` : "";

    const totalBillsCount = filteredList.length;
    const totalTargetNominal = filteredList.reduce((sum, b) => sum + (b.amount || 0), 0);
    const paidBills = filteredList.filter((b) => b.status === "paid");
    const unpaidBills = filteredList.filter((b) => b.status !== "paid");
    const totalPaidNominal = paidBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalUnpaidNominal = unpaidBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const progressPct =
      totalTargetNominal > 0 ? Math.round((totalPaidNominal / totalTargetNominal) * 100) : 0;

    // Group by title
    const groupedMap: {
      [title: string]: {
        targetCount: number;
        paidCount: number;
        targetNominal: number;
        paidNominal: number;
        isMonthly?: boolean;
      };
    } = {};

    filteredList.forEach((bill) => {
      const title = bill.title;
      if (!groupedMap[title]) {
        groupedMap[title] = {
          targetCount: 0,
          paidCount: 0,
          targetNominal: 0,
          paidNominal: 0,
          isMonthly: bill.isMonthly,
        };
      }
      groupedMap[title].targetCount += 1;
      groupedMap[title].targetNominal += bill.amount || 0;
      if (bill.status === "paid") {
        groupedMap[title].paidCount += 1;
        groupedMap[title].paidNominal += bill.amount || 0;
      }
    });

    const groupedList = Object.entries(groupedMap)
      .map(([title, stats]) => ({
        title,
        ...stats,
        pct: stats.targetNominal > 0 ? Math.round((stats.paidNominal / stats.targetNominal) * 100) : 0,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    const summaryRowsHtml = groupedList
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold; text-align: left;">${item.title}</td>
        <td style="text-align: center;">${item.isMonthly ? '<span style="color: #2563eb; font-weight: 600;">Bulanan</span>' : '<span style="color: #475569;">Sekali Bayar</span>'}</td>
        <td style="text-align: center; font-family: monospace;">${item.paidCount} / ${item.targetCount} Siswa</td>
        <td style="text-align: right; font-family: monospace; font-weight: 600;">Rp ${item.targetNominal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #047857; font-weight: bold;">Rp ${item.paidNominal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">Rp ${(item.targetNominal - item.paidNominal).toLocaleString('id-ID')}</td>
        <td style="text-align: center; font-weight: bold; font-family: monospace; color: ${item.pct >= 100 ? '#047857' : '#0f172a'};">${item.pct}%</td>
      </tr>
    `
      )
      .join("");

    const detailRowsHtml = filteredList
      .map((bill, idx) => {
        const s = students.find((st) => st.id === bill.studentId);
        const isPaid = bill.status === "paid";
        const paymentInfo = isPaid
          ? `${bill.paidAt ? new Date(bill.paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} (${bill.paymentMethod || 'Teller'})${bill.orderId ? `<br/><span style="font-size: 7.5px; color: #64748b; font-family: monospace;">${bill.orderId}</span>` : ''}`
          : '<span style="color: #94a3b8;">-</span>';

        return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 600;">${s?.nis || '-'}</td>
          <td style="font-weight: bold; text-align: left;">${s?.name || 'Siswa'}</td>
          <td style="text-align: center; font-weight: 600;">${s?.class ? `Kelas ${s.class}` : '-'}</td>
          <td style="text-align: left;">
            <div style="font-weight: 600;">${bill.title}</div>
            ${(bill as any).description ? `<div style="font-size: 8px; color: #64748b;">${(bill as any).description}</div>` : ''}
          </td>
          <td style="text-align: center;">
            ${bill.isMonthly ? `<span style="color: #1d4ed8; font-weight: 600;">${bill.month || '-'}</span>` : '<span style="color: #475569;">Sekali Bayar</span>'}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">Rp ${(bill.amount || 0).toLocaleString('id-ID')}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; text-transform: uppercase; ${isPaid ? 'background-color: #d1fae5; color: #065f46;' : 'background-color: #fee2e2; color: #991b1b;'}">
              ${isPaid ? 'LUNAS' : 'BELUM BAYAR'}
            </span>
          </td>
          <td style="text-align: left; font-size: 8.5px;">${paymentInfo}</td>
        </tr>
      `;
      })
      .join("");

    const printDateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const printTimeStr = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Pembayaran Lain-lain - ${schoolNameStr}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 10px; color: #0f172a; background: white; line-height: 1.35; font-size: 10px; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #0f172a; margin-bottom: 10px; padding-bottom: 5px; }
            .logo-cell { width: 60px; text-align: center; vertical-align: middle; }
            .info-cell { text-align: center; vertical-align: middle; }
            .school-name { font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
            .school-sub { font-size: 9.5px; margin: 2px 0 0 0; color: #334155; font-weight: 600; }
            .school-meta { font-size: 8px; margin: 2px 0 0 0; color: #64748b; font-style: italic; }
            
            .doc-title { text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 8px 0 2px 0; letter-spacing: 0.5px; color: #1e3a8a; }
            .filter-tags { text-align: center; font-size: 8.5px; font-weight: 600; color: #475569; margin-bottom: 10px; }
            .filter-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 5px; margin: 1px 2px; }

            .summary-cards { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 10px; }
            .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; text-align: center; background: #f8fafc; }
            .card-val { font-size: 11px; font-weight: 800; margin-top: 1px; font-family: monospace; }
            .card-lbl { font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }

            .section-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 10px 0 4px 0; border-bottom: 1.5px solid #94a3b8; padding-bottom: 2px; }
            
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 4px 5px; font-size: 8.5px; }
            .data-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; color: #0f172a; text-transform: uppercase; font-size: 8px; }
            .data-table tr:nth-child(even) { background-color: #f8fafc; }
            .data-table tr { page-break-inside: avoid; }

            .signatures { display: flex; justify-content: space-between; margin-top: 18px; text-align: center; font-size: 8.5px; page-break-inside: avoid; }
            .sig-block { width: 220px; }
            .sig-space { height: 42px; }
            .sig-name { font-weight: bold; text-decoration: underline; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              ${logoSrc ? `<td class="logo-cell"><img src="${logoSrc}" style="max-height: 48px; max-width: 48px; object-fit: contain;" /></td>` : ''}
              <td class="info-cell">
                <div class="school-name">${schoolNameStr}</div>
                <div class="school-sub">${subHeader} &bull; Akreditasi: ${accreditation}</div>
                <div class="school-meta">Alamat: ${address}</div>
              </td>
            </tr>
          </table>

          <div class="doc-title">LAPORAN PEMBAYARAN &amp; IURAN LAIN-LAIN (NON-SPP)</div>
          <div class="filter-tags">
            <span class="filter-badge"><b>Tingkat:</b> ${filterTingkatStr}</span>
            <span class="filter-badge"><b>Kelas:</b> ${filterKelasStr}</span>
            <span class="filter-badge"><b>Tipe:</b> ${filterTipeStr}</span>
            ${miscTypeFilter !== "once" ? `<span class="filter-badge"><b>Bulan:</b> ${filterBulanStr}</span>` : ''}
            <span class="filter-badge"><b>Status:</b> ${filterStatusStr}</span>
            ${filterSearchStr ? `<span class="filter-badge">${filterSearchStr}</span>` : ''}
            <span class="filter-badge"><b>Tgl Cetak:</b> ${printDateStr} ${printTimeStr} WIB</span>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-lbl">Total Tagihan</div>
              <div class="card-val" style="color: #0f172a;">${totalBillsCount} Data</div>
            </div>
            <div class="card">
              <div class="card-lbl">Total Nominal Tagihan</div>
              <div class="card-val" style="color: #0f172a;">Rp ${totalTargetNominal.toLocaleString('id-ID')}</div>
            </div>
            <div class="card" style="background-color: #ecfdf5; border-color: #a7f3d0;">
              <div class="card-lbl" style="color: #047857;">Realisasi Lunas (${paidBills.length})</div>
              <div class="card-val" style="color: #047857;">Rp ${totalPaidNominal.toLocaleString('id-ID')}</div>
            </div>
            <div class="card" style="background-color: #fef2f2; border-color: #fecaca;">
              <div class="card-lbl" style="color: #b91c1c;">Sisa Tunggakan (${unpaidBills.length})</div>
              <div class="card-val" style="color: #b91c1c;">Rp ${totalUnpaidNominal.toLocaleString('id-ID')}</div>
            </div>
            <div class="card" style="background-color: #eff6ff; border-color: #bfdbfe;">
              <div class="card-lbl" style="color: #1d4ed8;">Persentase Realisasi</div>
              <div class="card-val" style="color: #1d4ed8;">${progressPct}%</div>
            </div>
          </div>

          ${groupedList.length > 1 ? `
            <div class="section-title">I. Ringkasan per Jenis Tagihan</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 25px;">No</th>
                  <th>Nama Tagihan / Kegiatan</th>
                  <th style="width: 70px;">Tipe</th>
                  <th style="width: 100px;">Target Siswa</th>
                  <th style="width: 90px;">Total Tagihan</th>
                  <th style="width: 90px;">Terbayar</th>
                  <th style="width: 90px;">Tunggakan</th>
                  <th style="width: 55px;">Progress</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRowsHtml}
              </tbody>
            </table>
          ` : ''}

          <div class="section-title">${groupedList.length > 1 ? 'II. ' : ''}Rincian Data Tagihan Siswa</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 25px;">No</th>
                <th style="width: 55px;">NIS</th>
                <th style="width: 130px;">Nama Siswa</th>
                <th style="width: 45px;">Kelas</th>
                <th>Tagihan &amp; Deskripsi</th>
                <th style="width: 75px;">Tipe / Periode</th>
                <th style="width: 75px;">Nominal</th>
                <th style="width: 65px;">Status</th>
                <th style="width: 110px;">Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              ${detailRowsHtml}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-block">
              <div>Mengetahui,</div>
              <div style="font-weight: bold; margin-top: 2px;">Kepala Sekolah</div>
              <div class="sig-space"></div>
              <div class="sig-name">( ${principalName} )</div>
              <div style="font-size: 7.5px; color: #64748b;">NIP. Penanggung Jawab Lembaga</div>
            </div>
            <div class="sig-block">
              <div>Pandaan, ${printDateStr}</div>
              <div style="font-weight: bold; margin-top: 2px;">Bendahara Sekolah</div>
              <div class="sig-space"></div>
              <div class="sig-name">( ${treasurerName} )</div>
              <div style="font-size: 7.5px; color: #64748b;">NIP. Verifikator Keuangan</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcelMiscBillsDirect = () => {
    const filteredList = miscBills.filter((bill) => {
      const s = students.find((st) => st.id === bill.studentId);

      if (miscGradeFilter !== "all") {
        if (!s || !s.class || !s.class.startsWith(miscGradeFilter)) return false;
      }

      if (miscClassFilter !== "all") {
        if (!s || s.class !== miscClassFilter) return false;
      }

      if (miscTypeFilter === "once" && bill.isMonthly) return false;
      if (miscTypeFilter === "monthly" && !bill.isMonthly) return false;
      if (miscMonthFilter !== "all" && bill.month !== miscMonthFilter) return false;

      const matchText =
        bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
        bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
        (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
        (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
        (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase());
      if (!matchText) return false;

      if (miscStatusFilter === "unpaid") return bill.status === "unpaid" || bill.status === "pending";
      if (miscStatusFilter === "paid") return bill.status === "paid";
      return true;
    });

    if (filteredList.length === 0) {
      alert("Tidak ada data tagihan pembayaran lain-lain yang sesuai dengan filter yang aktif untuk diekspor.");
      return;
    }

    const totalTargetNominal = filteredList.reduce((sum, b) => sum + (b.amount || 0), 0);
    const paidBills = filteredList.filter((b) => b.status === "paid");
    const unpaidBills = filteredList.filter((b) => b.status !== "paid");
    const totalPaidNominal = paidBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalUnpaidNominal = unpaidBills.reduce((sum, b) => sum + (b.amount || 0), 0);

    const groupedMap: {
      [title: string]: {
        targetCount: number;
        paidCount: number;
        targetNominal: number;
        paidNominal: number;
        isMonthly?: boolean;
      };
    } = {};

    filteredList.forEach((bill) => {
      const title = bill.title;
      if (!groupedMap[title]) {
        groupedMap[title] = {
          targetCount: 0,
          paidCount: 0,
          targetNominal: 0,
          paidNominal: 0,
          isMonthly: bill.isMonthly,
        };
      }
      groupedMap[title].targetCount += 1;
      groupedMap[title].targetNominal += bill.amount || 0;
      if (bill.status === "paid") {
        groupedMap[title].paidCount += 1;
        groupedMap[title].paidNominal += bill.amount || 0;
      }
    });

    const groupedList = Object.entries(groupedMap).map(([title, stats]) => ({
      title,
      ...stats,
      pct: stats.targetNominal > 0 ? Math.round((stats.paidNominal / stats.targetNominal) * 100) : 0,
    }));

    exportFilteredMiscBillsToExcel({
      filterInfo: {
        grade: miscGradeFilter,
        classStr: miscClassFilter,
        type: miscTypeFilter,
        month: miscMonthFilter,
        status: miscStatusFilter,
        search: miscSearch,
      },
      totalTarget: totalTargetNominal,
      totalPaid: totalPaidNominal,
      totalUnpaid: totalUnpaidNominal,
      groupedList,
      bills: filteredList,
      students,
    });
  };

  const handleCancelSavingsTransactionLocal = async (transactionId: string, type: "deposit" | "withdrawal", amount: number) => {
    const confirmCancel = window.confirm(
      `Apakah Anda yakin ingin membatalkan transaksi ${type === "deposit" ? "SETORAN" : "PENARIKAN"} tabungan sebesar Rp ${amount.toLocaleString("id-ID")} ini?\n\n` +
      `- Saldo tabungan siswa akan disesuaikan kembali.\n` +
      `- Status transaksi akan diubah menjadi BATAL.\n` +
      `- Notifikasi pembatalan otomatis akan dikirim ke WhatsApp wali murid.`
    );
    if (!confirmCancel) return;

    try {
      const res = await fetch("/api/admin/cancel-savings-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membatalkan transaksi tabungan.");
      }
      alert("Transaksi tabungan berhasil dibatalkan dan saldo siswa telah diperbarui!");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal membatalkan transaksi tabungan.");
    }
  };

  const handleOpenEditMisc = (bill: any) => {
    setEditingMiscBill(bill);
    setEditMiscTitle(bill.title);
    setEditMiscAmount(String(bill.amount));
    setEditMiscIsMonthly(Boolean(bill.isMonthly));
    setEditMiscMonth(bill.month || "");
    setUpdateAllWithSameTitle(false);
    setIsEditMiscOpen(true);
  };

  const handleUpdateMiscBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMiscBill) return;

    if (!editMiscTitle.trim()) {
      alert("Judul tagihan tidak boleh kosong.");
      return;
    }

    const amountNum = Number(editMiscAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Nominal tagihan harus berupa angka positif.");
      return;
    }

    try {
      setIsUpdatingMisc(true);
      const res = await fetch("/api/admin/update-misc-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: editingMiscBill.id,
          title: editMiscTitle.trim(),
          amount: amountNum,
          updateAllWithSameTitle,
          isMonthly: editMiscIsMonthly,
          month: editMiscIsMonthly ? editMiscMonth : ""
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah detail tagihan.");
      }
      alert(data.message || "Detail tagihan iuran berhasil direvisi!");
      setIsEditMiscOpen(false);
      setEditingMiscBill(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal mengubah detail tagihan.");
    } finally {
      setIsUpdatingMisc(false);
    }
  };

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [rosterClassFilter, setRosterClassFilter] = useState<string>("all");
  const [rekapSppClassFilter, setRekapSppClassFilter] = useState<string>("all");
  const [rekapTabunganClassFilter, setRekapTabunganClassFilter] = useState<string>("all");
  const [rekapTabunganGradeFilter, setRekapTabunganGradeFilter] = useState<string>("all");
  const [rekapMiscClassFilter, setRekapMiscClassFilter] = useState<string>("all");
  const [rekapMiscGradeFilter, setRekapMiscGradeFilter] = useState<string>("all");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [mutatedSearch, setMutatedSearch] = useState("");
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // States for student mutation modal
  const [isMutateModalOpen, setIsMutateModalOpen] = useState(false);
  const [mutateStudentId, setMutateStudentId] = useState("");
  const [mutateDate, setMutateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [mutateReason, setMutateReason] = useState("");
  const [mutateDestination, setMutateDestination] = useState("");
  const [isMutatingSubmit, setIsMutatingSubmit] = useState(false);
  const [mutateError, setMutateError] = useState("");

  // States for SPP Waiver (Prestasi & Diluar Prestasi)
  const [waiveBillIds, setWaiveBillIds] = useState<string[]>([]);
  const [waiveType, setWaiveType] = useState<'akademik' | 'non-akademik' | 'non-prestasi' | 'kebijakan'>('akademik');
  const [waiveDetail, setWaiveDetail] = useState('');
  const [isSubmittingWaiver, setIsSubmittingWaiver] = useState(false);
  const [waiverError, setWaiverError] = useState('');

  // Batch Import Teacher states
  const [isImportTeacherOpen, setIsImportTeacherOpen] = useState(false);
  const [importTeacherType, setImportTeacherType] = useState<
    "homeroom" | "subject"
  >("homeroom");
  const [teacherImportError, setTeacherImportError] = useState<string | null>(
    null,
  );
  const [teacherImportSuccess, setTeacherImportSuccess] = useState<
    string | null
  >(null);
  const [previewTeacherData, setPreviewTeacherData] = useState<any[]>([]);
  const [isTeacherImporting, setIsTeacherImporting] = useState(false);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const cardTemplateInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTeacherTemplate = (type: "homeroom" | "subject") => {
    let headers = "";
    let rows: string[] = [];
    let filename = "";

    if (type === "homeroom") {
      headers = "username,nama,kelas,password\n";
      rows = [
        "sitiaminah,Ibu Siti Aminah S.Pd,7-A,wali1234",
        "bambang_8a,Drs. Bambang Harianto,8-A,",
        "wardah,Ustadzah Wardah M.Pd,9-B,pancasilaku",
      ];
      filename = "template_import_wali_kelas.csv";
    } else {
      headers = "username,nama,mapel,password\n";
      rows = [
        "budis,Budi Santoso S.Pd,Matematika,mat123",
        "aisyah_bi,Aisyah Putri S.Pd,Bahasa Inggris,",
        "fauzi_ipa,Ahmad Fauzi S.Si,IPA,merdeka1",
      ];
      filename = "template_import_guru_mapel.csv";
    }

    const blob = new Blob([headers + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTeachers = (type: "homeroom" | "subject") => {
    let headers = "";
    let rows: string[] = [];
    let filename = "";

    if (type === "homeroom") {
      headers = "username,nama,kelas,password\n";
      rows = homerooms.map((h) => {
        const cleanName =
          h.name.includes(",") || h.name.includes('"')
            ? `"${h.name.replace(/"/g, '""')}"`
            : h.name;
        const cleanClassName =
          h.className.includes(",") || h.className.includes('"')
            ? `"${h.className.replace(/"/g, '""')}"`
            : h.className;
        return `${h.username},${cleanName},${cleanClassName},${h.password || ""}`;
      });
      filename = `data_wali_kelas_update_massal_${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      headers = "username,nama,mapel,password\n";
      rows = subjectTeachers.map((s) => {
        const cleanName =
          s.name.includes(",") || s.name.includes('"')
            ? `"${s.name.replace(/"/g, '""')}"`
            : s.name;
        const cleanSubject =
          s.subject.includes(",") || s.subject.includes('"')
            ? `"${s.subject.replace(/"/g, '""')}"`
            : s.subject;
        return `${s.username},${cleanName},${cleanSubject},${s.password || ""}`;
      });
      filename = `data_guru_mapel_update_massal_${new Date().toISOString().split("T")[0]}.csv`;
    }

    const blob = new Blob([headers + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTeacherCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTeacherImportError(null);
    setTeacherImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setTeacherImportError("File kosong atau rusak.");
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setTeacherImportError(
            "File CSV minimal harus berisi header & satu baris data.",
          );
          return;
        }

        const clean = (val: string) =>
          (val || "")
            .replace(/^"(.*)"$/, "$1")
            .replace(/^'(.*)'$/, "$1")
            .trim();

        // Helper function to split a string by delimiter while ignoring delimiters inside double quotes
        const parseCSVLineRobust = (
          rawLine: string,
          delim: string,
        ): string[] => {
          const result: string[] = [];
          let currentVal = "";
          let insideQuotes = false;

          for (let idx = 0; idx < rawLine.length; idx++) {
            const char = rawLine[idx];

            if (char === '"') {
              if (idx + 1 < rawLine.length && rawLine[idx + 1] === '"') {
                currentVal += '"';
                idx++; // skip the escaped quote
              } else {
                insideQuotes = !insideQuotes;
              }
            } else if (char === delim && !insideQuotes) {
              result.push(currentVal);
              currentVal = "";
            } else {
              currentVal += char;
            }
          }
          result.push(currentVal);
          return result;
        };

        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") ? ";" : ",";
        const headers = parseCSVLineRobust(firstLine, delimiter).map((h) =>
          clean(h).toLowerCase(),
        );

        const usernameIdx = headers.findIndex(
          (h) =>
            h.includes("user") ||
            h.includes("id") ||
            h.includes("nama_pengguna"),
        );
        const nameIdx = headers.findIndex(
          (h) =>
            (h.includes("nama") ||
              h.includes("name") ||
              h.includes("lengkap")) &&
            !h.includes("user") &&
            !h.includes("id") &&
            !h.includes("pengguna"),
        );
        const passwordIdx = headers.findIndex(
          (h) =>
            h.includes("pass") || h.includes("sandi") || h.includes("kunci"),
        );

        let classIdx = -1;
        let subjectIdx = -1;

        if (importTeacherType === "homeroom") {
          classIdx = headers.findIndex(
            (h) =>
              h.includes("kelas") ||
              h.includes("class") ||
              h.includes("bimbingan"),
          );
          if (usernameIdx === -1 || nameIdx === -1 || classIdx === -1) {
            setTeacherImportError(
              'Format kolom CSV Wali Kelas salah! Pastikan ada kolom "username", "nama", dan "kelas".',
            );
            return;
          }
        } else {
          subjectIdx = headers.findIndex(
            (h) =>
              h.includes("mapel") ||
              h.includes("subject") ||
              h.includes("mata") ||
              h.includes("pelajaran"),
          );
          if (usernameIdx === -1 || nameIdx === -1 || subjectIdx === -1) {
            setTeacherImportError(
              'Format kolom CSV Guru Mapel salah! Pastikan ada kolom "username", "nama", dan "mapel".',
            );
            return;
          }
        }

        const parsedRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = parseCSVLineRobust(line, delimiter).map((c) => clean(c));
          if (cols.length < 3) continue;

          const userVal = cols[usernameIdx];
          const nameVal = cols[nameIdx];
          const passVal = passwordIdx !== -1 ? cols[passwordIdx] : "";

          if (!userVal || !nameVal) continue;

          if (importTeacherType === "homeroom") {
            const classVal = cols[classIdx];
            if (!classVal) continue;

            const isExist = homerooms.some(
              (h) =>
                h.username.toLowerCase().trim() ===
                userVal.toLowerCase().trim(),
            );
            parsedRows.push({
              username: userVal.trim().toLowerCase().replace(/\s+/g, ""),
              name: nameVal.trim(),
              className: classVal.trim(),
              password: passVal.trim() || undefined,
              isExisting: isExist,
            });
          } else {
            const subVal = cols[subjectIdx];
            if (!subVal) continue;

            const isExist = subjectTeachers.some(
              (h) =>
                h.username.toLowerCase().trim() ===
                userVal.toLowerCase().trim(),
            );
            parsedRows.push({
              username: userVal.trim().toLowerCase().replace(/\s+/g, ""),
              name: nameVal.trim(),
              subject: subVal.trim(),
              password: passVal.trim() || undefined,
              isExisting: isExist,
            });
          }
        }

        if (parsedRows.length === 0) {
          setTeacherImportError("Tidak ada data yang valid untuk diimport.");
          return;
        }

        setPreviewTeacherData(parsedRows);
      } catch (err) {
        console.error(err);
        setTeacherImportError("Gagal memproses file CSV.");
      }
    };

    reader.readAsText(file);
  };

  const handleExecuteTeacherImport = async () => {
    if (previewTeacherData.length === 0 || !onImportTeachers) return;
    setIsTeacherImporting(true);
    setTeacherImportError(null);
    setTeacherImportSuccess(null);

    try {
      const homeroomsToImport =
        importTeacherType === "homeroom" ? previewTeacherData : [];
      const subjectsToImport =
        importTeacherType === "subject" ? previewTeacherData : [];

      const resp = await onImportTeachers(homeroomsToImport, subjectsToImport);
      if (resp.success) {
        setTeacherImportSuccess(
          `Selesai! Wali Kelas: +${resp.homeroomsAdded} baru, ~${resp.homeroomsUpdated} diperbarui. Guru Mapel: +${resp.subjectsAdded} baru, ~${resp.subjectsUpdated} diperbarui.`,
        );
        setPreviewTeacherData([]);
        onRefresh();
      } else {
        setTeacherImportError("Gagal mengunggah data import ke server.");
      }
    } catch (err) {
      setTeacherImportError("Terjadi kegagalan koneksi saat import.");
    } finally {
      setIsTeacherImporting(false);
    }
  };

  // Student QR card system states
  const [studentQrSearch, setStudentQrSearch] = useState("");
  const [studentQrClassFilter, setStudentQrClassFilter] = useState("all");
  const [qrCardsToPrint, setQrCardsToPrint] = useState<Student[] | null>(null);
  const [downloadingCollectiveQr, setDownloadingCollectiveQr] = useState(false);
  const [collectiveQrProgress, setCollectiveQrProgress] = useState(0);
  const [collectiveQrTotal, setCollectiveQrTotal] = useState(0);

  const handleCardTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Hanya mendukung file gambar (PNG, JPG, JPEG)!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      if (onUpdateSchoolIdentity) {
        const res = await onUpdateSchoolIdentity({
          paymentCardTemplate: base64String,
        });
        if (res) {
          alert(
            "Template latar belakang kartu pembayaran berhasil diperbarui!",
          );
        } else {
          alert("Gagal menyimpan latar belakang template kartu.");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCardTemplate = async () => {
    if (
      confirm(
        "Apakah Anda yakin ingin menghapus template gambar kartu? Kartu akan menggunakan desain default kembali.",
      )
    ) {
      if (onUpdateSchoolIdentity) {
        const res = await onUpdateSchoolIdentity({ paymentCardTemplate: "" });
        if (res) {
          alert(
            "Template gambar kartu berhasil dikembalikan ke desain default.",
          );
        } else {
          alert("Gagal mengembalikan ke desain default.");
        }
      }
    }
  };

  // Firebase/Cloud Sync States
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Backup system states
  const [backups, setBackups] = useState<any[]>([]);
  const [bConfig, setBConfig] = useState<any>({
    enabled: true,
    intervalHours: 12,
    maxBackups: 10,
    lastBackupTime: "",
    nextBackupTime: "",
    autoDownloadLocal: false
  });

  // MySQL Database States & Handlers
  const [mysqlConfig, setMysqlConfig] = useState({
    host: "localhost",
    port: 3306,
    user: "u604170242_root2",
    password: "",
    database: "u604170242_portal_maarif",
    enabled: false,
    passwordConfigured: false
  });
  const [mysqlStatus, setMysqlStatus] = useState<{
    connected: boolean;
    message: string;
    lastChecked: string;
    tablesCount?: number;
    latencyMs?: number;
  }>({
    connected: false,
    message: "Memuat status...",
    lastChecked: ""
  });
  const [isTestingMysql, setIsTestingMysql] = useState(false);
  const [isSyncingMysql, setIsSyncingMysql] = useState(false);
  const [mysqlFeedback, setMysqlFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchMysqlStatus = async () => {
    try {
      const res = await fetch("/api/mysql/status");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setMysqlConfig(prev => ({ ...prev, ...data.config }));
        }
        if (data.status) {
          setMysqlStatus(data.status);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat status MySQL:", err);
    }
  };

  const handleTestMysql = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsTestingMysql(true);
    setMysqlFeedback(null);
    try {
      const res = await fetch("/api/mysql/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mysqlConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMysqlFeedback({ type: "success", message: "[OK] " + (data.message || "Koneksi MySQL berhasil!") });
        fetchMysqlStatus();
      } else {
        setMysqlFeedback({ type: "error", message: "[GAGAL] " + (data.message || "Gagal terkoneksi ke server MySQL.") });
      }
    } catch (err: any) {
      setMysqlFeedback({ type: "error", message: "[GAGAL] Gagal menguji koneksi: " + (err.message || "Kendala jaringan") });
    } finally {
      setIsTestingMysql(false);
    }
  };

  const handleSyncMysql = async () => {
    setIsSyncingMysql(true);
    setMysqlFeedback(null);
    try {
      const res = await fetch("/api/mysql/sync-now", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMysqlFeedback({ type: "success", message: "[OK] " + (data.message || "Sinkronisasi seluruh data ke basis data MySQL sukses!") });
        fetchMysqlStatus();
      } else {
        setMysqlFeedback({ type: "error", message: "[GAGAL] " + (data.message || "Gagal sinkronisasi ke MySQL.") });
      }
    } catch (err: any) {
      setMysqlFeedback({ type: "error", message: "[GAGAL] Gagal menghubungi server: " + err.message });
    } finally {
      setIsSyncingMysql(false);
    }
  };

  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackupId, setIsRestoringBackupId] = useState<string | null>(null);
  const [isRestoringLocalBackup, setIsRestoringLocalBackup] = useState(false);
  const [isDeletingBackupId, setIsDeletingBackupId] = useState<string | null>(null);
  const [backupDescription, setBackupDescription] = useState("");
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [backupErrorMessage, setBackupErrorMessage] = useState<string | null>(null);

  // File Upload states and hooks
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isClassFilesLoading, setIsClassFilesLoading] =
    useState<boolean>(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileUploadProgress, setFileUploadProgress] = useState<number>(-1);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploadSuccess, setFileUploadSuccess] = useState<string | null>(
    null,
  );
  const [copiedFileUrl, setCopiedFileUrl] = useState<string | null>(null);
  const [fileDeletingName, setFileDeletingName] = useState<string | null>(null);

  const fetchUploadedFiles = async () => {
    setIsClassFilesLoading(true);
    try {
      const res = await fetch("/api/admin/uploaded-files");
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setUploadedFiles(data.files);
        }
      }
    } catch (err) {
      console.error("Gagal memuat berkas:", err);
    } finally {
      setIsClassFilesLoading(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    setFileUploadError(null);
    setFileUploadSuccess(null);
    setFileUploadProgress(0);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/upload-file", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100,
          );
          setFileUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              setFileUploadSuccess(response.url);
              setFileToUpload(null);
              const fileInput = document.getElementById(
                "admin-apk-file-input",
              ) as HTMLInputElement;
              if (fileInput) fileInput.value = "";
              fetchUploadedFiles();
            } else {
              setFileUploadError(response.error || "Gagal menggunggah file");
            }
          } catch (pErr) {
            setFileUploadError("Kesalahan parsing respon server");
          }
        } else {
          setFileUploadError(
            `Gagal mengunggah file (Kode Status: ${xhr.status})`,
          );
        }
        setFileUploadProgress(-1);
      };

      xhr.onerror = () => {
        setFileUploadError("Kesalahan koneksi jaringan saat mengunggah file");
        setFileUploadProgress(-1);
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Error uploading file:", err);
      setFileUploadError("Kesalahan internal saat memproses unggahan");
      setFileUploadProgress(-1);
    }
  };

  const handleDeleteUploadedFile = async (filename: string) => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menghapus file ini?\n" + filename,
      )
    )
      return;
    setFileDeletingName(filename);
    try {
      const res = await fetch(
        `/api/admin/delete-file/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (data.success) {
        fetchUploadedFiles();
        if (fileUploadSuccess && fileUploadSuccess.includes(filename)) {
          setFileUploadSuccess(null);
        }
      } else {
        alert(data.error || "Gagal menghapus file");
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("Kesalahan koneksi saat menghapus file");
    } finally {
      setFileDeletingName(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedFileUrl(url);
        setTimeout(() => setCopiedFileUrl(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy url:", err);
      });
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch("/api/system-status");
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error("Gagal mengambil status sistem:", err);
    }
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    setBackupErrorMessage(null);
    try {
      const res = await fetch("/api/admin/backups");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBackups(data.backups || []);
          if (data.config) {
            setBConfig(data.config);
          }
        }
      } else {
        setBackupErrorMessage("Gagal memuat daftar backup dari server.");
      }
    } catch (err) {
      console.error("Error fetching backups:", err);
      setBackupErrorMessage("Gagal menghubungkan ke server untuk mengambil backup.");
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCreatingBackup(true);
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);
    try {
      const res = await fetch("/api/admin/backups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "manual",
          description: backupDescription.trim() || "Backup Manual Admin"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupSuccessMessage(`[SUKSES] Backup sukses dibuat: ${data.backup.id}`);
        setBackupDescription("");
        fetchBackups();
      } else {
        setBackupErrorMessage(data.error || "Gagal membuat backup.");
      }
    } catch (err) {
      console.error("Error creating backup:", err);
      setBackupErrorMessage("Koneksi gagal saat membuat backup.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleSaveBackupConfig = async (enabled: boolean, intervalHours: number, maxBackups: number, autoDownloadLocal: boolean) => {
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);
    try {
      const res = await fetch("/api/admin/backups/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, intervalHours, maxBackups, autoDownloadLocal })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupSuccessMessage("[OK] Pengaturan backup otomatis berhasil disimpan!");
        fetchBackups();
      } else {
        setBackupErrorMessage(data.error || "Gagal menyimpan konfigurasi.");
      }
    } catch (err) {
      console.error("Error saving backup config:", err);
      setBackupErrorMessage("Gagal menyimpan konfigurasi karena kendala jaringan.");
    }
  };

  const safeParseResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await res.json();
      } catch (e) {
        return { error: "Respon dari server bukan JSON yang valid." };
      }
    }
    const text = await res.text();
    if (res.status === 413 || text.includes("413") || text.toLowerCase().includes("payload too large")) {
      return { error: "Ukuran file backup atau payload terlalu besar melebihi batas server (413 Payload Too Large)." };
    }
    if (res.status === 504 || text.includes("504") || text.toLowerCase().includes("gateway time-out") || text.toLowerCase().includes("gateway timeout")) {
      return { error: "Proses restorasi memerlukan waktu lebih lama karena ukuran data. Silakan tunggu beberapa saat lalu muat ulang (refresh) halaman untuk melihat data yang telah dipulihkan." };
    }
    if (text.trim().startsWith("<") || text.includes("<html>")) {
      return { error: `Server mengembalikan respon HTML (${res.status} ${res.statusText}). Pastikan endpoint API '/api/admin/backups' diproses dengan benar.` };
    }
    return { error: text || `Terjadi kesalahan pada server (${res.status}).` };
  };

  const handleRestoreBackup = async (id: string) => {
    if (!window.confirm("[PERINGATAN] PERINGATAN RESTORASI DATABASE:\n\nRestorasi ini HANYA akan memulihkan data database (Siswa, Tagihan, Transaksi, Absensi, Jurnal, Kesiswaan, Sarpras, dsb) dari file backup. Konfigurasi dan file sistem tidak akan diubah atau ditimpa.\n\nData database saat ini akan ditimpa dengan data dari backup ini. Apakah Anda yakin ingin melanjutkan?")) {
      return;
    }
    setIsRestoringBackupId(id);
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);
    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await safeParseResponse(res);
      if (res.ok && data.success) {
        setBackupSuccessMessage("[SUKSES] Sukses! Restorasi data database berhasil diselesaikan. Halaman akan dimuat ulang...");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setBackupErrorMessage(data.error || "Gagal melakukan restorasi.");
      }
    } catch (err: any) {
      console.error("Error restoring backup:", err);
      setBackupErrorMessage(err?.message || "Koneksi gagal saat merestorasi backup.");
    } finally {
      setIsRestoringBackupId(null);
    }
  };

  const handleRestoreFromLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("[PERINGATAN] PERINGATAN RESTORASI DATABASE LOKAL:\n\nRestorasi ini HANYA akan memulihkan data database dari file JSON lokal. Konfigurasi sistem dan file sistem tidak akan disentuh.\n\nApakah Anda yakin ingin melanjutkan memulihkan data database?")) {
      e.target.value = "";
      return;
    }

    setIsRestoringLocalBackup(true);
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          throw new Error("File backup yang dipilih kosong.");
        }

        const trimmedText = text.trim();
        if (trimmedText.startsWith("<") || trimmedText.toLowerCase().includes("<html")) {
          throw new Error("File yang dipilih adalah dokumen HTML/Web, bukan file backup JSON database. Silakan pilih file backup resmi ber-ekstensi .json.");
        }

        let snapshot: any;
        try {
          snapshot = JSON.parse(trimmedText);
        } catch (parseErr) {
          throw new Error("File yang dipilih bukan format JSON yang valid. Pastikan file tersebut adalah file backup .json database SIS.");
        }

        // Unwrap nested snapshot if file contains full backup record object
        let actualSnapshot = snapshot;
        if (actualSnapshot && typeof actualSnapshot === "object") {
          if (actualSnapshot.snapshot) {
            if (typeof actualSnapshot.snapshot === "string") {
              try { actualSnapshot = JSON.parse(actualSnapshot.snapshot); } catch (e) {}
            } else if (typeof actualSnapshot.snapshot === "object") {
              actualSnapshot = actualSnapshot.snapshot;
            }
          } else if (actualSnapshot.data) {
            if (typeof actualSnapshot.data === "string") {
              try { actualSnapshot = JSON.parse(actualSnapshot.data); } catch (e) {}
            } else if (typeof actualSnapshot.data === "object") {
              actualSnapshot = actualSnapshot.data;
            }
          }
        }

        if (!actualSnapshot || typeof actualSnapshot !== "object") {
          throw new Error("Format file JSON snapshot tidak valid.");
        }

        const res = await fetch("/api/admin/backups/restore-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: actualSnapshot })
        });
        const data = await safeParseResponse(res);
        if (res.ok && data.success) {
          setBackupSuccessMessage("[SUKSES] Sukses! Restorasi data database dari komputer lokal berhasil diselesaikan. Halaman akan dimuat ulang...");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setBackupErrorMessage(data.error || "Gagal melakukan restorasi dari file.");
        }
      } catch (err: any) {
        console.error("Error restoring from local file:", err);
        setBackupErrorMessage(err.message || "Gagal membaca atau memproses file backup lokal.");
      } finally {
        setIsRestoringLocalBackup(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      setBackupErrorMessage("Gagal membaca file dari komputer lokal.");
      setIsRestoringLocalBackup(false);
      e.target.value = "";
    };

    reader.readAsText(file);
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus file backup ini secara permanen?")) {
      return;
    }
    setIsDeletingBackupId(id);
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/backups/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupSuccessMessage(" Backup berhasil dihapus.");
        fetchBackups();
      } else {
        setBackupErrorMessage(data.error || "Gagal menghapus backup.");
      }
    } catch (err) {
      console.error("Error deleting backup:", err);
      setBackupErrorMessage("Gagal menghapus backup karena kendala jaringan.");
    } finally {
      setIsDeletingBackupId(null);
    }
  };

  useEffect(() => {
    if (adminTab === "config") {
      fetchSystemStatus();
      fetchUploadedFiles();
      fetchBackups();
      const interval = setInterval(fetchSystemStatus, 6000);
      return () => clearInterval(interval);
    }
  }, [adminTab]);

  // Effect for Auto-Downloading New Backups to Local Computer
  useEffect(() => {
    if (bConfig.enabled && bConfig.autoDownloadLocal && backups.length > 0) {
      // Find the absolute newest backup snapshot
      const sorted = [...backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const newestBackup = sorted[0];
      
      if (newestBackup) {
        const lastDownloadedId = localStorage.getItem("last_downloaded_backup_id");
        if (lastDownloadedId !== newestBackup.id) {
          console.log(`[AUTO-DOWNLOAD] New backup detected (${newestBackup.id}). Triggering automatic local file download...`);
          
          // Trigger the download
          const link = document.createElement("a");
          link.href = `/api/admin/backups/${newestBackup.id}/download`;
          link.download = `SIS_Backup_${newestBackup.id}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Save the downloaded state
          localStorage.setItem("last_downloaded_backup_id", newestBackup.id);
          
          // Toast or message feedback
          setBackupSuccessMessage(` Backup otomatis baru (${newestBackup.id}) telah berhasil diunduh dan disimpan ke komputer lokal Anda.`);
        }
      }
    }
  }, [backups, bConfig.autoDownloadLocal, bConfig.enabled]);

  const handleForceSync = async () => {
    setIsSyncingLive(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/admin/force-firestore-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(
          "[OK] Sinkronisasi sukses! Semua koleksi terbaru telah disalin ke Firebase Firestore.",
        );
        fetchSystemStatus();
        onRefresh();
      } else {
        setSyncFeedback(
          `[PERINGATAN] Gagal menyinkronkan: ${data.error || "Server error"}`,
        );
      }
    } catch (err) {
      setSyncFeedback(
        "[PERINGATAN] Galat koneksi saat mengirim permintaan sinkronisasi.",
      );
    } finally {
      setIsSyncingLive(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const activeStudents = students.filter(
      (s) =>
        (!s.mutationDate || s.mutationDate.trim() === '') &&
        (!s.class ||
          (s.class.toLowerCase() !== "lulus" &&
            s.class.toLowerCase() !== "lulusan" &&
            s.class.toLowerCase() !== "mutasi" &&
            s.class.toLowerCase() !== "mutasi keluar")),
    );
    const classFiltered = rosterClassFilter === "all"
      ? activeStudents
      : activeStudents.filter((s) => s.class === rosterClassFilter);
    const result = !studentSearch.trim()
      ? classFiltered
      : classFiltered.filter(
          (s) =>
            s.name.toLowerCase().includes(studentSearch.toLowerCase().trim()) ||
            s.nis.toLowerCase().includes(studentSearch.toLowerCase().trim()),
        );
    return [...result].sort((a, b) => {
      const classCompare = (a.class || "").localeCompare(b.class || "", undefined, { numeric: true, sensitivity: 'base' });
      if (classCompare !== 0) return classCompare;
      return a.name.localeCompare(b.name);
    });
  }, [students, studentSearch, rosterClassFilter]);

  const uniqueClasses = useMemo(() => {
    const cls = new Set<string>();
    students.forEach((s) => {
      if (
        (!s.mutationDate || s.mutationDate.trim() === '') &&
        s.class &&
        s.class.toLowerCase() !== "lulus" &&
        s.class.toLowerCase() !== "lulusan" &&
        s.class.toLowerCase() !== "mutasi" &&
        s.class.toLowerCase() !== "mutasi keluar"
      ) {
        cls.add(s.class);
      }
    });
    return Array.from(cls).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [students]);

  const filteredAlumni = useMemo(() => {
    const alumniList = students.filter(
      (s) =>
        s.class &&
        (s.class.toLowerCase() === "lulus" ||
          s.class.toLowerCase() === "lulusan"),
    );
    const result = !alumniSearch.trim()
      ? alumniList
      : alumniList.filter(
          (s) =>
            s.name.toLowerCase().includes(alumniSearch.toLowerCase().trim()) ||
            s.nis.toLowerCase().includes(alumniSearch.toLowerCase().trim()),
        );
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [students, alumniSearch]);

  const filteredMutatedStudents = useMemo(() => {
    const mutatedList = students.filter(
      (s) =>
        (s.mutationDate && s.mutationDate.trim() !== '') ||
        (s.class &&
          (s.class.toLowerCase() === "mutasi" ||
            s.class.toLowerCase() === "mutasi keluar")),
    );
    const result = !mutatedSearch.trim()
      ? mutatedList
      : mutatedList.filter(
          (s) =>
            s.name.toLowerCase().includes(mutatedSearch.toLowerCase().trim()) ||
            s.nis.toLowerCase().includes(mutatedSearch.toLowerCase().trim()),
        );
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [students, mutatedSearch]);

  // Pagination states
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPageSize, setRosterPageSize] = useState(10);
  useEffect(() => {
    setRosterPage(1);
  }, [studentSearch, rosterClassFilter]);
  const paginatedStudents = useMemo(() => {
    const start = (rosterPage - 1) * rosterPageSize;
    return filteredStudents.slice(start, start + rosterPageSize);
  }, [filteredStudents, rosterPage, rosterPageSize]);

  const [alumniPage, setAlumniPage] = useState(1);
  const [alumniPageSize, setAlumniPageSize] = useState(10);
  useEffect(() => {
    setAlumniPage(1);
  }, [alumniSearch]);
  const paginatedAlumni = useMemo(() => {
    const start = (alumniPage - 1) * alumniPageSize;
    return filteredAlumni.slice(start, start + alumniPageSize);
  }, [filteredAlumni, alumniPage, alumniPageSize]);

  const [mutatedPage, setMutatedPage] = useState(1);
  const [mutatedPageSize, setMutatedPageSize] = useState(10);
  useEffect(() => {
    setMutatedPage(1);
  }, [mutatedSearch]);
  const paginatedMutatedStudents = useMemo(() => {
    const start = (mutatedPage - 1) * mutatedPageSize;
    return filteredMutatedStudents.slice(start, start + mutatedPageSize);
  }, [filteredMutatedStudents, mutatedPage, mutatedPageSize]);

  const [miscPage, setMiscPage] = useState(1);
  const [miscPageSize, setMiscPageSize] = useState(10);
  useEffect(() => {
    setMiscPage(1);
  }, [miscSearch, miscGradeFilter, miscClassFilter, miscStatusFilter]);

  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null);

  // Manual payment cancellation/void states
  const [billToCancel, setBillToCancel] = useState<SppBill | null>(null);
  const [isCancelProcessing, setIsCancelProcessing] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  const pendingWithdrawals = useMemo(() => {
    return transactions.filter(
      (t) => t.type === "withdrawal" && t.status === "pending",
    );
  }, [transactions]);

  // Bulk Savings Withdrawal States
  const [isBulkWithdrawOpen, setIsBulkWithdrawOpen] = useState(false);
  const [bulkGrade, setBulkGrade] = useState<"7" | "8" | "9">("7");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkAllowDebt, setBulkAllowDebt] = useState(true);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    success: boolean;
    message: string;
    successCount?: number;
    totalDeducted?: number;
    skippedCount?: number;
  } | null>(null);

  // Printing & Receipt States
  const [printId, setPrintId] = useState<string | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{
    type: "spp" | "savings" | "consolidated" | "misc";
    detail: any;
    student: Student;
  } | null>(null);
  const [receiptPrintFormat, setReceiptPrintFormat] = useState<
    "standard" | "thermal"
  >("standard");
  const [reportToPrint, setReportToPrint] = useState<
    "harian" | "rekap-spp" | "rekap-tabungan" | "rekap-misc" | null
  >(null);

  // Student financial subtabs inside roster
  const [studentDetailTab, setStudentDetailTab] = useState<"spp" | "savings" | "misc">(
    "spp",
  );
  const [selectedSppBills, setSelectedSppBills] = useState<string[]>([]);

  useEffect(() => {
    setSelectedSppBills([]);
  }, [selectedStudent?.id]);

  // Homeroom & Subject Teacher mgmt states
  const [editingHomeroomId, setEditingHomeroomId] = useState<string | null>(
    null,
  );
  const [editingSubjectTeacherId, setEditingSubjectTeacherId] = useState<
    string | null
  >(null);
  const [formName, setFormName] = useState("");
  const [formClassName, setFormClassName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSkUrl, setFormSkUrl] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [mgmtError, setMgmtError] = useState<string | null>(null);
  const [mgmtSuccess, setMgmtSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setEditingHomeroomId(null);
    setEditingSubjectTeacherId(null);
    setFormName("");
    setFormClassName("");
    setFormSubject("");
    setFormUsername("");
    setFormPassword("");
    setFormSkUrl("");
    setMgmtError(null);
    setMgmtSuccess(null);
  };

  // Payment Summary / Shopping Cart States
  const [paymentCart, setPaymentCart] = useState<
    Array<{
      id: string;
      type: "spp" | "savings_deposit" | "misc";
      student: Student;
      amount: number;
      billId?: string;
      month?: string;
      year?: number;
      notes?: string;
    }>
  >([]);
  const [processingCart, setProcessingCart] = useState(false);

  const isMutationStudent = (studentOrId: Student | string | null | undefined) => {
    if (!studentOrId) return false;
    const student = typeof studentOrId === "string" ? students.find(s => s.id === studentOrId) : studentOrId;
    if (!student) return false;
    return !!student.mutationDate || (student.class && (student.class.toLowerCase() === "mutasi" || student.class.toLowerCase() === "mutasi keluar"));
  };

  // Helper to determine active / inactive state of an SPP bill (for Admin/Cashier)
  const checkIsBillActive = (bill: SppBill, studentId: string, tempCartIds: string[] = []) => {
    const student = students.find((s) => s.id === studentId);
    const MONTH_MAP: Record<string, number> = {
      Januari: 0,
      Februari: 1,
      Maret: 2,
      April: 3,
      Mei: 4,
      Juni: 5,
      Juli: 6,
      Agustus: 7,
      September: 8,
      Oktober: 9,
      November: 10,
      Desember: 11,
    };

    const billMonthIdx =
      MONTH_MAP[bill.month] !== undefined ? MONTH_MAP[bill.month] : 0;
    const billScore = bill.year * 12 + billMonthIdx;

    // Mutated student check: hapus/abaikan tunggakan bulan berjalan dan setelahnya semenjak siswa mutasi keluar
    if (student && isMutationStudent(student)) {
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

      if (billScore >= mutationScore && (bill.status === "unpaid" || bill.status === "pending")) {
        return false;
      }
    }

    const studentBills = bills.filter((b) => b.studentId === studentId);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const currentScore = currentYear * 12 + currentMonthIdx;

    // 1. If it's a past month or current month, it is always active
    if (billScore <= currentScore) {
      return true;
    }

    // 2. If it is a future month, check if all bills strictly prior are paid
    const priorBills = studentBills.filter((b) => {
      const bMonthIdx =
        MONTH_MAP[b.month] !== undefined ? MONTH_MAP[b.month] : 0;
      const bScore = b.year * 12 + bMonthIdx;
      return bScore < billScore;
    });

    return priorBills.every((b) => 
      b.status === "paid" || 
      b.status === "waived" ||
      paymentCart.some(item => item.type === "spp" && item.billId === b.id) ||
      tempCartIds.includes(b.id)
    );
  };

  const addToCartSpp = (bill: SppBill, student: Student) => {
    if (!checkIsBillActive(bill, student.id)) {
      alert(
        `Peringatan: Tagihan SPP ${bill.month} ${bill.year} belum aktif karena SPP bulan berjalan belum lunas.`,
      );
      return;
    }
    if (
      paymentCart.some((item) => item.type === "spp" && item.billId === bill.id)
    ) {
      alert(
        `SPP ${bill.month} ${bill.year} untuk ${student.name} sudah ada di dalam ringkasan keranjang belanja!`,
      );
      return;
    }
    const newItem = {
      id: `cart-spp-${bill.id}`,
      type: "spp" as const,
      student,
      amount: bill.amount,
      billId: bill.id,
      month: bill.month,
      year: bill.year,
    };
    setPaymentCart((prev) => [...prev, newItem]);
  };

  const addBatchToCartSpp = (selectedBills: SppBill[], student: Student) => {
    const MONTH_MAP: Record<string, number> = {
      Januari: 0,
      Februari: 1,
      Maret: 2,
      April: 3,
      Mei: 4,
      Juni: 5,
      Juli: 6,
      Agustus: 7,
      September: 8,
      Oktober: 9,
      November: 10,
      Desember: 11,
    };
    const sortedSelected = [...selectedBills].sort((a, b) => {
      const aScore = a.year * 12 + (MONTH_MAP[a.month] || 0);
      const bScore = b.year * 12 + (MONTH_MAP[b.month] || 0);
      return aScore - bScore;
    });

    const tempCartIds = sortedSelected.map(b => b.id);
    const addedItems: typeof paymentCart = [];
    let hasWarning = false;

    for (const bill of sortedSelected) {
      if (!checkIsBillActive(bill, student.id, [...paymentCart.filter(item => item.type === "spp").map(item => item.billId || ""), ...tempCartIds])) {
        alert(`Peringatan: Tagihan SPP ${bill.month} ${bill.year} tidak aktif karena terdapat bulan sebelum berjalan yang belum lunas dan tidak terpilih.`);
        hasWarning = true;
        break;
      }
      if (paymentCart.some((item) => item.type === "spp" && item.billId === bill.id)) {
        continue; // Already in cart
      }
      addedItems.push({
        id: `cart-spp-${bill.id}`,
        type: "spp" as const,
        student,
        amount: bill.amount,
        billId: bill.id,
        month: bill.month,
        year: bill.year,
      });
    }

    if (!hasWarning && addedItems.length > 0) {
      setPaymentCart((prev) => [...prev, ...addedItems]);
      alert(`Berhasil menambahkan ${addedItems.length} bulan SPP ke keranjang!`);
    }
  };

  const addToCartMisc = (bill: MiscBill, student: Student) => {
    if (
      paymentCart.some((item) => item.type === "misc" && item.billId === bill.id)
    ) {
      alert(
        `Tagihan "${bill.title}" untuk ${student.name} sudah ada di dalam ringkasan keranjang belanja!`,
      );
      return;
    }
    const newItem = {
      id: `cart-misc-${bill.id}`,
      type: "misc" as const,
      student,
      amount: bill.amount,
      billId: bill.id,
      notes: bill.title,
    };
    setPaymentCart((prev) => [...prev, newItem]);
  };

  const addToCartSavings = (
    amount: number,
    notes: string,
    student: Student,
  ) => {
    if (amount <= 0 || isNaN(amount)) {
      alert("Masukkan nominal setoran tabungan yang valid!");
      return;
    }
    const newItem = {
      id: `cart-savings-${student.id}-${Date.now()}`,
      type: "savings_deposit" as const,
      student,
      amount,
      notes: notes || "Setoran Tabungan",
    };
    setPaymentCart((prev) => [...prev, newItem]);
    alert(
      `Setoran tabungan sebesar Rp ${amount.toLocaleString("id-ID")} ditambahkan ke keranjang.`,
    );
  };

  const [isCartMidtransModalOpen, setIsCartMidtransModalOpen] = useState(false);
  const [cartSnapToken, setCartSnapToken] = useState<string | null>(null);
  const [cartSnapOrderId, setCartSnapOrderId] = useState<string | null>(null);
  const [cartSnapAmount, setCartSnapAmount] = useState(0);
  const [cartSnapItemName, setCartSnapItemName] = useState("");
  const [isProcessingCartMidtrans, setIsProcessingCartMidtrans] = useState(false);

  const removeFromCart = (cartItemId: string) => {
    setPaymentCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleProcessCartMidtransCheckout = async () => {
    if (paymentCart.length === 0) return;
    setIsProcessingCartMidtrans(true);
    try {
      const sppBillIds = paymentCart
        .filter((item) => item.type === "spp" && item.billId)
        .map((item) => item.billId!);

      const miscBillIds = paymentCart
        .filter((item) => item.type === "misc" && item.billId)
        .map((item) => item.billId!);

      const savingsDeposits = paymentCart
        .filter((item) => item.type === "savings_deposit")
        .map((item) => ({
          studentId: item.student.id,
          amount: item.amount,
          notes: item.notes || "Setoran Tabungan",
        }));

      const res = await fetch("/api/pay-cart-snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppBillIds,
          miscBillIds,
          savingsDeposits,
          billIds: [...sppBillIds, ...miscBillIds],
          studentId: selectedStudent?.id || paymentCart[0]?.student?.id,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menginisiasi pembayaran Midtrans untuk keranjang.");
      }

      setCartSnapToken(data.token);
      setCartSnapOrderId(data.orderId);
      setCartSnapAmount(data.totalAmount);
      setCartSnapItemName(`Keranjang Pembayaran (${paymentCart.length} Item: SPP, Tabungan, Lain2)`);
      setIsCartMidtransModalOpen(true);
    } catch (error: any) {
      console.error("Error initiating Midtrans cart checkout:", error);
      alert(error.message || "Gagal membuka jendela pembayaran online Midtrans.");
    } finally {
      setIsProcessingCartMidtrans(false);
    }
  };

  const handleCartMidtransSuccess = () => {
    const executedItems = paymentCart.map((item) => ({
      name:
        item.type === "spp"
          ? `SPP Bulanan (${item.month} ${item.year})`
          : item.type === "misc"
          ? `Lain-lain (${item.notes})`
          : `Setoran Tabungan (${item.notes || "Setoran"})`,
      amount: item.amount,
      desc: `Siswa: ${item.student.name} (${item.student.nis} - Kelas ${item.student.class})`,
    }));

    const totalAmount = paymentCart.reduce((sum, item) => sum + item.amount, 0);

    setReceiptToPrint({
      type: "consolidated",
      detail: {
        id: cartSnapOrderId || `CART-MIDTRANS-${Date.now()}`,
        amount: totalAmount,
        items: executedItems,
        paidAt: new Date().toISOString(),
        paymentMethod: "Midtrans (Online / QRIS)",
      },
      student: paymentCart[0]?.student || selectedStudent,
    });
    setPrintId("print-receipt-section");
    setPaymentCart([]);
    setIsCartMidtransModalOpen(false);
    if (onRefresh) onRefresh();
  };

  const handleProcessCartCheckout = async () => {
    if (paymentCart.length === 0) return;
    setProcessingCart(true);
    try {
      const executedItems: Array<{
        name: string;
        amount: number;
        desc: string;
      }> = [];

      const sppBillIds = paymentCart
        .filter((item) => item.type === "spp" && item.billId)
        .map((item) => item.billId!);

      const miscBillIds = paymentCart
        .filter((item) => item.type === "misc" && item.billId)
        .map((item) => item.billId!);

      const savingsDeposits = paymentCart
        .filter((item) => item.type === "savings_deposit")
        .map((item) => ({
          studentId: item.student.id,
          amount: item.amount,
          notes: item.notes || "Setoran Tabungan",
        }));

      const res = await fetch("/api/admin/pay-cart-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sppBillIds, miscBillIds, savingsDeposits }),
      });

      const data = await res.json();

      if (res.ok && data.executedItems && data.executedItems.length > 0) {
        executedItems.push(...data.executedItems);
      }

      if (executedItems.length > 0) {
        const totalAmount = executedItems.reduce(
          (sum, item) => sum + item.amount,
          0,
        );
        const orderId = `COLLECTIVE-CART-${Date.now()}`;

        setReceiptToPrint({
          type: "consolidated",
          detail: {
            id: orderId,
            amount: totalAmount,
            items: executedItems,
            paidAt: new Date().toISOString(),
            paymentMethod: "Manual Teller (Kolektif)",
          },
          student: paymentCart[0].student,
        });
        setPrintId("print-receipt-section");
        setPaymentCart([]);
        onRefresh();
      } else {
        alert("Gagal memproses pembayaran keranjang belanja kolektif.");
      }
    } catch (error) {
      console.error("Error processing cart payment:", error);
      alert("Terjadi kesalahan teknis saat memproses pembayaran kolektif.");
    } finally {
      setProcessingCart(false);
    }
  };

  // SPP Prestasi Waiver Handlers
  const handleWaiveSppBulk = async () => {
    if (!selectedStudent) return;
    if (waiveBillIds.length === 0) {
      setWaiverError("Silakan pilih minimal satu bulan tagihan yang ingin dibebaskan.");
      return;
    }
    if (!waiveDetail.trim()) {
      setWaiverError("Silakan isi detail piagam atau jenis prestasi siswa.");
      return;
    }

    setIsSubmittingWaiver(true);
    setWaiverError('');
    try {
      const res = await fetch("/api/admin/waive-spp-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          billIds: waiveBillIds,
          achievementType: waiveType,
          achievementDetail: waiveDetail
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memproses pembebasan SPP.");
      }

      alert("Pembebasan SPP prestasi siswa berhasil disimpan!");
      setWaiveBillIds([]);
      setWaiveDetail('');
      onRefresh();
    } catch (err: any) {
      setWaiverError(err.message || "Gagal memproses pembebasan SPP.");
    } finally {
      setIsSubmittingWaiver(false);
    }
  };

  const handleCancelSppWaived = async (billId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan status bebas SPP untuk bulan ini?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/cancel-spp-waived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId })
      });
      if (res.ok) {
        alert("Status bebas SPP berhasil dibatalkan.");
        onRefresh();
      } else {
        const errData = await res.json();
        alert(errData.error || "Gagal membatalkan bebas SPP.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghubungi server.");
    }
  };

  // Laporan & Rekap states
  const [activeReportSubTab, setActiveReportSubTab] = useState<
    "harian" | "rekap-spp" | "rekap-tabungan" | "rekap-absen" | "rekap-misc"
  >("harian");
  const [infractionList, setInfractionList] = useState<StudentInfractionLog[]>(
    [],
  );

  const fetchInfractionList = async () => {
    try {
      const res = await fetch("/api/student-infraction-logs");
      if (res.ok) {
        const data = await res.json();
        setInfractionList(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data pelanggaran", err);
    }
  };

  React.useEffect(() => {
    fetchInfractionList();
  }, []);

  React.useEffect(() => {
    if (activeReportSubTab === "rekap-absen") {
      fetchInfractionList();
    }
  }, [activeReportSubTab]);
  const [currentDateFilter, setCurrentDateFilter] = useState<string>(() =>
    getWIBDateString(new Date()),
  );
  const [rekapSppGradeFilter, setRekapSppGradeFilter] = useState<string>("all");
  const [rekapSppYearFilter, setRekapSppYearFilter] = useState<string>("all");
  const [rekapSppFormat, setRekapSppFormat] = useState<"standard" | "checklist">("standard");

  const [absenStartDate, setAbsenStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [absenEndDate, setAbsenEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [absenClassFilter, setAbsenClassFilter] = useState<string>("all");

  const getAcademicYearOfBill = (bill: SppBill) => {
    const startYear = [
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ].includes(bill.month)
      ? bill.year
      : bill.year - 1;
    return `${startYear}/${startYear + 1}`;
  };

  const academicYears = useMemo(() => {
    const years = Array.from(new Set(bills.map(getAcademicYearOfBill)));
    return years.sort((a, b) => b.localeCompare(a)); // Sort latest first
  }, [bills]);

  useEffect(() => {
    if (academicYears.length > 0 && rekapSppYearFilter === "all") {
      setRekapSppYearFilter(academicYears[0]);
    }
  }, [academicYears]);

  useEffect(() => {
    if (rekapSppGradeFilter !== "all" && rekapSppClassFilter !== "all") {
      if (!rekapSppClassFilter.startsWith(rekapSppGradeFilter)) {
        setRekapSppClassFilter("all");
      }
    }
  }, [rekapSppGradeFilter]);

  useEffect(() => {
    if (rekapTabunganGradeFilter !== "all" && rekapTabunganClassFilter !== "all") {
      if (!rekapTabunganClassFilter.startsWith(rekapTabunganGradeFilter)) {
        setRekapTabunganClassFilter("all");
      }
    }
  }, [rekapTabunganGradeFilter]);

  useEffect(() => {
    if (rekapMiscGradeFilter !== "all" && rekapMiscClassFilter !== "all") {
      if (!rekapMiscClassFilter.startsWith(rekapMiscGradeFilter)) {
        setRekapMiscClassFilter("all");
      }
    }
  }, [rekapMiscGradeFilter]);

  // Listen to print completion to reset print state
  React.useEffect(() => {
    const handleAfterPrint = () => {
      setPrintId(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // Listen for successful Midtrans callback to automatically select the student and prepare receipt for printing!
  useEffect(() => {
    if (adminSppBillToPrint) {
      const billToPrint = bills.find((b) => b.id === adminSppBillToPrint);
      if (billToPrint) {
        const student = students.find((s) => s.id === billToPrint.studentId);
        if (student) {
          setSelectedStudent(student);
          setReceiptToPrint({
            type: "spp",
            detail: {
              ...billToPrint,
              status: "paid",
            },
            student: student,
          });
          setPrintId("print-receipt-section");
        }
      }
      if (onClearAdminSppBillToPrint) {
        onClearAdminSppBillToPrint();
      }
    }
  }, [adminSppBillToPrint, bills, students, onClearAdminSppBillToPrint]);

  // Listen for successful Midtrans savings deposits to automatically prepare savings receipt for printing!
  useEffect(() => {
    if (adminSavingsToPrint) {
      const { studentId, orderId, amount } = adminSavingsToPrint;
      const txToPrint = transactions.find((t) => t.orderId === orderId) || {
        id: orderId,
        studentId,
        type: "deposit",
        amount,
        status: "success",
        paymentMethod: "Midtrans Web",
        notes: "Setoran Tabungan via Midtrans",
        createdAt: new Date().toISOString(),
      };
      const student = students.find((s) => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        setReceiptToPrint({
          type: "savings",
          detail: txToPrint,
          student: student,
        });
        setPrintId("print-receipt-section");
      }
      if (onClearAdminSavingsToPrint) {
        onClearAdminSavingsToPrint();
      }
    }
  }, [adminSavingsToPrint, transactions, students, onClearAdminSavingsToPrint]);

  // Loading and feedback states for automation actions
  const [processingBillId, setProcessingBillId] = useState<string | null>(null);

  // Manual Transaction States
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txNotes, setTxNotes] = useState<string>("");
  const [showTxNotes, setShowTxNotes] = useState<boolean>(false);
  const [txProcessing, setTxProcessing] = useState(false);

  // Broadcast States
  const [notifTitle, setNotifTitle] = useState<string>("");
  const [notifMessage, setNotifMessage] = useState<string>("");
  const [notifType, setNotifType] = useState<
    "info" | "success" | "warning" | "payment"
  >("info");
  const [notifCategory, setNotifCategory] = useState<
    "kbm" | "pembayaran" | "bk" | "admin"
  >("admin");
  const [broadcastProcessing, setBroadcastProcessing] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !txAmount) return;
    const amount = Number(txAmount);
    if (isNaN(amount) || amount <= 0) return;

    setTxProcessing(true);
    const resultTx = await onSavingsManual(
      selectedStudent.id,
      txType,
      amount,
      txNotes,
    );
    setTxProcessing(false);

    if (resultTx) {
      setTxAmount("");
      setTxNotes("");
      setShowTxNotes(false);
      // Update selectedStudent balance locally for instantaneous visual update
      const updatedS = { ...selectedStudent };
      if (txType === "deposit") {
        updatedS.savingsBalance += amount;
      } else {
        updatedS.savingsBalance -= amount;
      }
      setSelectedStudent(updatedS);

      // Create a complete transaction description to print
      const printTx = {
        id: resultTx.id || `sav-${Date.now()}`,
        studentId: selectedStudent.id,
        type: txType,
        amount: amount,
        status: "success",
        createdAt: new Date().toISOString(),
        paymentMethod: "Manual Teller",
        notes:
          txNotes ||
          (txType === "deposit"
            ? "Setoran manual pihak sekolah"
            : "Tarik tunai manual"),
      };

      setReceiptToPrint({
        type: "savings",
        detail: printTx,
        student: updatedS,
      });
      setPrintId("print-receipt-section");
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;

    setBroadcastProcessing(true);
    const success = await onBroadcastNotification(
      notifTitle,
      notifMessage,
      notifType,
      notifCategory,
    );
    setBroadcastProcessing(false);

    if (success) {
      setNotifTitle("");
      setNotifMessage("");
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    }
  };

  // SPP Rates Config States
  const [sppConfigRates, setSppConfigRates] = useState({
    grade7: 150000,
    grade8: 155000,
    grade9: 160000,
  });
  const [isSavingSppRates, setIsSavingSppRates] = useState(false);
  const [updateExistingUnpaidBills, setUpdateExistingUnpaidBills] =
    useState(true);
  const [sppConfigMsg, setSppConfigMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Treasurer Account credentials security states
  const [adminTreasurerPasswordInput, setAdminTreasurerPasswordInput] =
    useState("");
  const [treasurerActionMsg, setTreasurerActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isOperatingTreasurerPwd, setIsOperatingTreasurerPwd] = useState(false);

  // Principal/Kepala Sekolah Account credentials security states
  const [adminPrincipalPasswordInput, setAdminPrincipalPasswordInput] =
    useState("");
  const [principalActionMsg, setPrincipalActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isOperatingPrincipalPwd, setIsOperatingPrincipalPwd] = useState(false);

  // Waka Sarpras Account credentials security states
  const [adminSarprasPasswordInput, setAdminSarprasPasswordInput] =
    useState("");
  const [sarprasActionMsg, setSarprasActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isOperatingSarprasPwd, setIsOperatingSarprasPwd] = useState(false);

  // Guru BK Account credentials security states
  const [adminBkPasswordInput, setAdminBkPasswordInput] = useState("");
  const [bkActionMsg, setBkActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isOperatingBkPwd, setIsOperatingBkPwd] = useState(false);

  // System Data Reset States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetValidationInput, setResetValidationInput] = useState("");
  const [isResettingSystem, setIsResettingSystem] = useState(false);
  const [resetSystemMsg, setResetSystemMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Admin credentials update states
  const [currentAdminPass, setCurrentAdminPass] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [isUpdatingAdminPass, setIsUpdatingAdminPass] = useState(false);
  const [adminPassFeedback, setAdminPassFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Midtrans Gateways & Fees States
  const [adminFeeInput, setAdminFeeInput] = useState<number>(4000);
  const [systemMaintenanceFeeInput, setSystemMaintenanceFeeInput] =
    useState<number>(1500);
  const [chargeFeesToUserChecked, setChargeFeesToUserChecked] =
    useState<boolean>(true);
  const [isSavingFees, setIsSavingFees] = useState<boolean>(false);
  const [savingFeesMsg, setSavingFeesMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [midtransMerchantIdInput, setMidtransMerchantIdInput] =
    useState<string>("");
  const [midtransClientKeyInput, setMidtransClientKeyInput] =
    useState<string>("");
  const [midtransServerKeyInput, setMidtransServerKeyInput] =
    useState<string>("");
  const [midtransIsProduction, setMidtransIsProduction] =
    useState<boolean>(false);
  const [midtransIsDisabled, setMidtransIsDisabled] = useState<boolean>(false);
  const [midtransPinInput, setMidtransPinInput] = useState<string>("");
  const [isMidtransUnlocked, setIsMidtransUnlocked] = useState<boolean>(false);
  const [midtransVerificationPin, setMidtransVerificationPin] =
    useState<string>("");
  const [midtransPinError, setMidtransPinError] = useState<string>("");
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Admin Manual Transaction Verification states
  const [adminManualOrderId, setAdminManualOrderId] = React.useState<string>("");
  const [isAdminManualVerifying, setIsAdminManualVerifying] = React.useState<boolean>(false);
  const [adminManualVerifyStatus, setAdminManualVerifyStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAdminManualVerify = async () => {
    if (!adminManualOrderId.trim()) return;
    setIsAdminManualVerifying(true);
    setAdminManualVerifyStatus(null);
    try {
      const response = await fetch('/api/simulate-payment-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: adminManualOrderId.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setAdminManualVerifyStatus({
          type: 'error',
          message: data.error || 'Gagal menyinkronkan transaksi. Pastikan ID Transaksi/Order ID benar dan sudah diselesaikan di Midtrans.',
        });
      } else {
        setAdminManualVerifyStatus({
          type: 'success',
          message: data.message || 'Pembayaran berhasil disinkronkan secara real-time! Tagihan/tabungan terkait sekarang berstatus LUNAS.',
        });
        setAdminManualOrderId('');
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (err: any) {
      console.error('Error admin manual verifying payment:', err);
      setAdminManualVerifyStatus({
        type: 'error',
        message: 'Terjadi kesalahan koneksi jaringan saat menghubungi server.',
      });
    } finally {
      setIsAdminManualVerifying(false);
    }
  };

  React.useEffect(() => {
    if (midtransStatus) {
      if (midtransStatus.adminFee !== undefined)
        setAdminFeeInput(midtransStatus.adminFee);
      if (midtransStatus.systemMaintenanceFee !== undefined)
        setSystemMaintenanceFeeInput(midtransStatus.systemMaintenanceFee);
      if (midtransStatus.chargeFeesToUser !== undefined)
        setChargeFeesToUserChecked(midtransStatus.chargeFeesToUser);
      if (midtransStatus.merchantId !== undefined)
        setMidtransMerchantIdInput(midtransStatus.merchantId);
      if (midtransStatus.clientKey !== undefined)
        setMidtransClientKeyInput(midtransStatus.clientKey);
      if (midtransStatus.isProduction !== undefined)
        setMidtransIsProduction(midtransStatus.isProduction);
      if (midtransStatus.isDisabled !== undefined)
        setMidtransIsDisabled(midtransStatus.isDisabled);
    }
  }, [midtransStatus]);

  // School Identity Editor States
  const [schoolName, setSchoolName] = useState("");
  const [schoolSubheading, setSchoolSubheading] = useState("");
  const [schoolAccreditation, setSchoolAccreditation] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolPrincipal, setSchoolPrincipal] = useState("");
  const [schoolTreasurer, setSchoolTreasurer] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolLogo2, setSchoolLogo2] = useState("");
  const [schoolLetterhead, setSchoolLetterhead] = useState("");
  const [schoolTreasurerSignature, setSchoolTreasurerSignature] = useState("");
  const [schoolPrincipalSignature, setSchoolPrincipalSignature] = useState("");
  const [schoolStamp, setSchoolStamp] = useState("");
  const [schoolFavicon, setSchoolFavicon] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [iosUrl, setIosUrl] = useState("");
  const [treasurerSkUrl, setTreasurerSkUrl] = useState("");
  const [sarprasSkUrl, setSarprasSkUrl] = useState("");
  const [schoolActiveAcademicYear, setSchoolActiveAcademicYear] = useState("");
  const [isSavingSchoolIdentity, setIsSavingSchoolIdentity] = useState(false);
  const [schoolIdentityMsg, setSchoolIdentityMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (schoolIdentity) {
      setSchoolName(schoolIdentity.name || "");
      setSchoolSubheading(schoolIdentity.subheading || "");
      setSchoolAccreditation(schoolIdentity.accreditation || "");
      setSchoolAddress(schoolIdentity.address || "");
      setSchoolPhone(schoolIdentity.phone || "");
      setSchoolPrincipal(schoolIdentity.principal || "");
      setSchoolTreasurer(schoolIdentity.treasurer || "");
      setSchoolLogo(schoolIdentity.logo || "");
      setSchoolLogo2(schoolIdentity.logo2 || "");
      setSchoolLetterhead(schoolIdentity.letterhead || "");
      setSchoolTreasurerSignature(schoolIdentity.treasurerSignature || "");
      setSchoolPrincipalSignature(schoolIdentity.principalSignature || "");
      setSchoolStamp(schoolIdentity.schoolStamp || "");
      setSchoolFavicon(schoolIdentity.favicon || "");
      setApkUrl(schoolIdentity.apkUrl || "");
      setIosUrl(schoolIdentity.iosUrl || "");
      setTreasurerSkUrl(schoolIdentity.treasurerSkUrl || "");
      setSarprasSkUrl(schoolIdentity.sarprasSkUrl || "");
      setSchoolActiveAcademicYear(schoolIdentity.activeAcademicYear || "");
      if (schoolIdentity.sppRates) {
        setSppConfigRates(schoolIdentity.sppRates);
      }
    }
  }, [schoolIdentity]);

  // Kenaikan Kelas & Tahun Ajaran Baru States
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isActivatingYear, setIsActivatingYear] = useState(false);
  const [activatingYearMessage, setActivatingYearMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [newYearInput, setNewYearInput] = useState("2026");
  const [clearPastYearBills, setClearPastYearBills] = useState(false);
  const [generateNewActiveBills, setGenerateNewActiveBills] = useState(true);

  // Class Promotion massal handler
  const handlePromoteClasses = async () => {
    let confirmMsg =
      "[PERINGATAN] APAKAH ANDA YAKIN?\n\nTindakan ini akan menaikkan kelas semua siswa secara otomatis:\n- Kelas 7 -> Kelas 8\n- Kelas 8 -> Kelas 9\n- Kelas 9 -> Lulus";
    if (clearPastYearBills) {
      confirmMsg +=
        "\n\nSerta MENGHAPUS seluruh lembar tagihan sisa/belum lunas dari tahun ajaran sebelum-sebelumnya.";
    }
    if (generateNewActiveBills) {
      confirmMsg +=
        "\n\nSerta otomatis menghasilkan 12 bulan tagihan SPP baru siap bayar pada semester aktif berikutnya.";
    }
    confirmMsg +=
      "\n\nProses ini tidak dapat dibatalkan (irreversible). Lanjutkan?";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsPromoting(true);
    setPromotionMessage(null);
    try {
      const res = await fetch("/api/admin/students/promote-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearPreviousBills: clearPastYearBills,
          generateNewBills: generateNewActiveBills,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let textMsg = `[SUKSES] Sukses! Kenaikan kelas massal selesai. ${data.promotedCount} siswa naik kelas, dan ${data.graduatedCount} siswa kelas 9 berhasil dinyatakan Lulus.`;
        if (generateNewActiveBills) {
          textMsg += ` Menghasilkan ${data.autoBillsGenerated || 0} lembar tagihan baru.`;
        }
        if (clearPastYearBills && data.deletedBillsCount !== undefined) {
          textMsg += ` Menyapu/membersihkan ${data.deletedBillsCount} lembar tagihan belum lunas dari periode sebelumnya agar bersih.`;
        }
        setPromotionMessage({
          type: "success",
          text: textMsg,
        });
        onRefresh();
      } else {
        setPromotionMessage({
          type: "error",
          text: data.error || "Gagal memproses kenaikan kelas.",
        });
      }
    } catch (err) {
      console.error(err);
      setPromotionMessage({
        type: "error",
        text: "Koneksi gagal. Silakan coba lagi.",
      });
    } finally {
      setIsPromoting(false);
    }
  };

  // Activate New Academic Year
  const handleActivateNewYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const yearNum = Number(newYearInput);
    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      alert("Tahun awal akademik tidak valid!");
      return;
    }

    let confirmMsg = `[PERINGATAN] AKTIFKAN TAHUN AJARAN ${yearNum}/${yearNum + 1}?`;
    if (clearPastYearBills) {
      confirmMsg +=
        "\n\nTindakan ini akan MENGHAPUS seluruh lembar tagihan sisa/belum lunas dari tahun ajaran sebelum-sebelumnya.";
    }
    if (generateNewActiveBills) {
      confirmMsg += `\n\nSistem akan menghasilkan 12 bulan tagihan SPP baru siap bayar untuk tahun ajaran ${yearNum}/${yearNum + 1}.`;
    }
    confirmMsg += "\n\nLanjutkan?";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsActivatingYear(true);
    setActivatingYearMessage(null);
    try {
      const res = await fetch("/api/admin/activate-academic-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startYear: yearNum,
          clearPreviousBills: clearPastYearBills,
          generateNewBills: generateNewActiveBills,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let textMsg = `[SUKSES] Sukses! Tahun Ajaran ${yearNum}/${yearNum + 1} aktif.`;
        if (generateNewActiveBills) {
          textMsg += ` Menghasilkan ${data.billsGenerated} lembar tagihan baru bagi seluruh siswa.`;
        }
        if (clearPastYearBills && data.deletedBillsCount !== undefined) {
          textMsg += ` Membersihkan ${data.deletedBillsCount} lembar tagihan belum lunas dari tahun/periode sebelumnya.`;
        }
        setActivatingYearMessage({
          type: "success",
          text: textMsg,
        });
        onRefresh();
      } else {
        setActivatingYearMessage({
          type: "error",
          text: data.error || "Gagal mengaktifkan tahun ajaran baru.",
        });
      }
    } catch (err) {
      console.error(err);
      setActivatingYearMessage({
        type: "error",
        text: "Koneksi gagal. Silakan coba lagi.",
      });
    } finally {
      setIsActivatingYear(false);
    }
  };

  // WhatsApp Config States
  const [waToken, setWaToken] = useState("");
  const [waSender, setWaSender] = useState("");
  const [waProvider, setWaProvider] = useState("Fonnte");
  const [waBaseUrl, setWaBaseUrl] = useState("https://api.fonnte.com/send");
  const [waEnabled, setWaEnabled] = useState(false);
  const [waNotifyOnBilling, setWaNotifyOnBilling] = useState(true);
  const [waNotifyOnPayment, setWaNotifyOnPayment] = useState(true);
  const [waNotifyOnSavings, setWaNotifyOnSavings] = useState(true);

  const [isSavingWaConfig, setIsSavingWaConfig] = useState(false);
  const [waConfigMsg, setWaConfigMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // WhatsApp Test States
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestMsg, setWaTestMsg] = useState(
    "Halo! Ini adalah uji coba transmisi pesan notifikasi WhatsApp Gateway SMP Maarif NU Pandaan. Integrasi sukses.",
  );
  const [waTesting, setWaTesting] = useState(false);
  const [waTestFeedback, setWaTestFeedback] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const fetchWaConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp-config");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.whatsappConfig) {
          setWaToken(data.whatsappConfig.token || "");
          setWaSender(data.whatsappConfig.sender || "");
          setWaProvider(data.whatsappConfig.provider || "Fonnte");
          setWaBaseUrl(
            data.whatsappConfig.baseUrl || "https://api.fonnte.com/send",
          );
          setWaEnabled(!!data.whatsappConfig.enabled);
          setWaNotifyOnBilling(data.whatsappConfig.notifyOnBilling !== false);
          setWaNotifyOnPayment(data.whatsappConfig.notifyOnPayment !== false);
          setWaNotifyOnSavings(data.whatsappConfig.notifyOnSavings !== false);
        }
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi WhatsApp", err);
    }
  };

  const handleSaveWaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWaConfig(true);
    setWaConfigMsg(null);
    try {
      const res = await fetch("/api/admin/set-whatsapp-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: waToken,
          sender: waSender,
          provider: waProvider,
          baseUrl: waBaseUrl,
          enabled: waEnabled,
          notifyOnBilling: waNotifyOnBilling,
          notifyOnPayment: waNotifyOnPayment,
          notifyOnSavings: waNotifyOnSavings,
        }),
      });
      if (res.ok) {
        setWaConfigMsg({
          type: "success",
          text: "[SUKSES] Konfigurasi WhatsApp API berhasil disimpan dan disimpan ke memori server!",
        });
      } else {
        setWaConfigMsg({
          type: "error",
          text: "Gagal memperbarui konfigurasi WhatsApp.",
        });
      }
    } catch (err) {
      console.error(err);
      setWaConfigMsg({
        type: "error",
        text: "Kendala jaringan saat menyimpan konfigurasi.",
      });
    } finally {
      setIsSavingWaConfig(false);
    }
  };

  const handleTestWa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waTestPhone) {
      setWaTestFeedback({
        success: false,
        text: "Mohon isi nomor telepon tujuan terlebih dahulu.",
      });
      return;
    }
    setWaTesting(true);
    setWaTestFeedback(null);
    try {
      const res = await fetch("/api/admin/test-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: waTestPhone,
          message: waTestMsg,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWaTestFeedback({ success: true, text: data.message });
      } else {
        setWaTestFeedback({ success: false, text: data.message });
      }
    } catch (err) {
      console.error(err);
      setWaTestFeedback({
        success: false,
        text: "Gagal terhubung ke host server tester.",
      });
    } finally {
      setWaTesting(false);
    }
  };

  const fetchSppConfig = async () => {
    try {
      const res = await fetch("/api/admin/spp-config");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sppRates) {
          setSppConfigRates(data.sppRates);
        }
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi SPP", err);
    }
  };

  React.useEffect(() => {
    fetchSppConfig();
  }, []);

  React.useEffect(() => {
    if (adminTab === "config") {
      fetchSppConfig();
      fetchWaConfig();
    }
  }, [adminTab]);

  const handleSaveSppRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSppRates(true);
    setSppConfigMsg(null);
    try {
      const res = await fetch("/api/admin/set-spp-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade7: sppConfigRates.grade7,
          grade8: sppConfigRates.grade8,
          grade9: sppConfigRates.grade9,
          updateExistingUnpaid: updateExistingUnpaidBills,
        }),
      });
      if (res.ok) {
        setSppConfigMsg({
          type: "success",
          text: "[SUKSES] Konfigurasi SPP berhasil disimpan dan disesuaikan ke tagihan unpaid aktif.",
        });
        onRefresh(); // Trigger refresh on bills on the client
      } else {
        setSppConfigMsg({
          type: "error",
          text: "Gagal memperbarui konfigurasi SPP.",
        });
      }
    } catch (err) {
      console.error(err);
      setSppConfigMsg({
        type: "error",
        text: "Koneksi gagal. Silakan coba lagi.",
      });
    } finally {
      setIsSavingSppRates(false);
    }
  };

  const handleAdminUpdateTreasurerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTreasurerPasswordInput.trim()) {
      setTreasurerActionMsg({
        type: "error",
        text: "Password sandi baru tidak boleh kosong.",
      });
      return;
    }
    if (adminTreasurerPasswordInput.trim().length < 5) {
      setTreasurerActionMsg({
        type: "error",
        text: "Password minimal 5 karakter.",
      });
      return;
    }
    setIsOperatingTreasurerPwd(true);
    setTreasurerActionMsg(null);
    try {
      const res = await fetch("/api/admin/treasurer/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: adminTreasurerPasswordInput.trim(),
        }),
      });
      if (res.ok) {
        setTreasurerActionMsg({
          type: "success",
          text: "Sandi Bendahara berhasil diperbarui secara aman!",
        });
        setAdminTreasurerPasswordInput("");
      } else {
        const d = await res.json();
        setTreasurerActionMsg({
          type: "error",
          text: d.error || "Gagal mengubah sandi Bendahara.",
        });
      }
    } catch {
      setTreasurerActionMsg({
        type: "error",
        text: "Gangguan jaringan/server.",
      });
    } finally {
      setIsOperatingTreasurerPwd(false);
    }
  };

  const handleAdminResetTreasurerPassword = async () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menyetel ulang sandi Bendahara kembali ke bawaan default (bendahara123)?",
      )
    ) {
      return;
    }
    setIsOperatingTreasurerPwd(true);
    setTreasurerActionMsg(null);
    try {
      const res = await fetch("/api/admin/treasurer/reset-password", {
        method: "POST",
      });
      if (res.ok) {
        setTreasurerActionMsg({
          type: "success",
          text: "Sandi Bendahara sukses di-reset ke bawaan default: bendahara123",
        });
      } else {
        const d = await res.json();
        setTreasurerActionMsg({
          type: "error",
          text: d.error || "Gagal melakukan reset sandi.",
        });
      }
    } catch {
      setTreasurerActionMsg({
        type: "error",
        text: "Gangguan komunikasi dengan server.",
      });
    } finally {
      setIsOperatingTreasurerPwd(false);
    }
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdminPass.trim() || !newAdminPass.trim()) {
      setAdminPassFeedback({
        type: "error",
        text: "Semua kolom kata sandi wajib diisi.",
      });
      return;
    }
    if (newAdminPass.trim().length < 6) {
      setAdminPassFeedback({
        type: "error",
        text: "Sandi baru minimal harus 6 karakter.",
      });
      return;
    }
    setIsUpdatingAdminPass(true);
    setAdminPassFeedback(null);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: currentAdminPass.trim(),
          newPassword: newAdminPass.trim(),
        }),
      });
      if (res.ok) {
        setAdminPassFeedback({
          type: "success",
          text: "Kredensial Password Administrator Utama sukses diperbarui!",
        });
        setCurrentAdminPass("");
        setNewAdminPass("");
      } else {
        const d = await res.json();
        setAdminPassFeedback({
          type: "error",
          text: d.error || "Autentikasi gagal atau sandi lama salah.",
        });
      }
    } catch {
      setAdminPassFeedback({
        type: "error",
        text: "Sistem mengalami kegagalan hubung/jaringan.",
      });
    } finally {
      setIsUpdatingAdminPass(false);
    }
  };

  const handleAdminUpdatePrincipalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPrincipalPasswordInput.trim()) {
      setPrincipalActionMsg({
        type: "error",
        text: "Sandi baru tidak boleh kosong.",
      });
      return;
    }
    if (adminPrincipalPasswordInput.trim().length < 5) {
      setPrincipalActionMsg({
        type: "error",
        text: "Password minimal 5 karakter.",
      });
      return;
    }
    setIsOperatingPrincipalPwd(true);
    setPrincipalActionMsg(null);
    try {
      const res = await fetch("/api/admin/principal/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: adminPrincipalPasswordInput.trim(),
        }),
      });
      if (res.ok) {
        setPrincipalActionMsg({
          type: "success",
          text: "Sandi Kepala Sekolah berhasil diperbarui secara aman!",
        });
        setAdminPrincipalPasswordInput("");
      } else {
        const d = await res.json();
        setPrincipalActionMsg({
          type: "error",
          text: d.error || "Gagal mengubah sandi Kepala Sekolah.",
        });
      }
    } catch {
      setPrincipalActionMsg({
        type: "error",
        text: "Gangguan jaringan/server.",
      });
    } finally {
      setIsOperatingPrincipalPwd(false);
    }
  };

  const handleAdminResetPrincipalPassword = async () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menyetel ulang sandi Kepala Sekolah kembali ke bawaan default (kepala123)?",
      )
    ) {
      return;
    }
    setIsOperatingPrincipalPwd(true);
    setPrincipalActionMsg(null);
    try {
      const res = await fetch("/api/admin/principal/reset-password", {
        method: "POST",
      });
      if (res.ok) {
        setPrincipalActionMsg({
          type: "success",
          text: "Sandi Kepala Sekolah sukses di-reset ke bawaan default: kepala123",
        });
      } else {
        const d = await res.json();
        setPrincipalActionMsg({
          type: "error",
          text: d.error || "Gagal melakukan reset sandi.",
        });
      }
    } catch {
      setPrincipalActionMsg({
        type: "error",
        text: "Gangguan komunikasi dengan server.",
      });
    } finally {
      setIsOperatingPrincipalPwd(false);
    }
  };

  const handleAdminUpdateSarprasPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSarprasPasswordInput.trim()) {
      setSarprasActionMsg({
        type: "error",
        text: "Sandi baru tidak boleh kosong.",
      });
      return;
    }
    if (adminSarprasPasswordInput.trim().length < 5) {
      setSarprasActionMsg({
        type: "error",
        text: "Password minimal 5 karakter.",
      });
      return;
    }
    setIsOperatingSarprasPwd(true);
    setSarprasActionMsg(null);
    try {
      const res = await fetch("/api/admin/sarpras/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: adminSarprasPasswordInput.trim() }),
      });
      if (res.ok) {
        setSarprasActionMsg({
          type: "success",
          text: "Sandi Waka Sarpras berhasil diperbarui secara aman!",
        });
        setAdminSarprasPasswordInput("");
      } else {
        const d = await res.json();
        setSarprasActionMsg({
          type: "error",
          text: d.error || "Gagal mengubah sandi Waka Sarpras.",
        });
      }
    } catch {
      setSarprasActionMsg({ type: "error", text: "Gangguan jaringan/server." });
    } finally {
      setIsOperatingSarprasPwd(false);
    }
  };

  const handleAdminResetSarprasPassword = async () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menyetel ulang sandi Waka Sarpras kembali ke bawaan default (sarpras123)?",
      )
    ) {
      return;
    }
    setIsOperatingSarprasPwd(true);
    setSarprasActionMsg(null);
    try {
      const res = await fetch("/api/admin/sarpras/reset-password", {
        method: "POST",
      });
      if (res.ok) {
        setSarprasActionMsg({
          type: "success",
          text: "Sandi Waka Sarpras sukses di-reset ke bawaan default: sarpras123",
        });
      } else {
        const d = await res.json();
        setSarprasActionMsg({
          type: "error",
          text: d.error || "Gagal melakukan reset sandi.",
        });
      }
    } catch {
      setSarprasActionMsg({
        type: "error",
        text: "Gangguan komunikasi dengan server.",
      });
    } finally {
      setIsOperatingSarprasPwd(false);
    }
  };

  const handleAdminUpdateBkPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminBkPasswordInput.trim()) {
      setBkActionMsg({ type: "error", text: "Sandi baru tidak boleh kosong." });
      return;
    }
    if (adminBkPasswordInput.trim().length < 5) {
      setBkActionMsg({ type: "error", text: "Password minimal 5 karakter." });
      return;
    }
    setIsOperatingBkPwd(true);
    setBkActionMsg(null);
    try {
      const res = await fetch("/api/admin/bk/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: adminBkPasswordInput.trim() }),
      });
      if (res.ok) {
        setBkActionMsg({
          type: "success",
          text: "Sandi Guru BK berhasil diperbarui secara aman!",
        });
        setAdminBkPasswordInput("");
      } else {
        const d = await res.json();
        setBkActionMsg({
          type: "error",
          text: d.error || "Gagal mengubah sandi Guru BK.",
        });
      }
    } catch {
      setBkActionMsg({ type: "error", text: "Gangguan jaringan/server." });
    } finally {
      setIsOperatingBkPwd(false);
    }
  };

  const handleAdminResetBkPassword = async () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menyetel ulang sandi Guru BK kembali ke bawaan default (bk123)?",
      )
    ) {
      return;
    }
    setIsOperatingBkPwd(true);
    setBkActionMsg(null);
    try {
      const res = await fetch("/api/admin/bk/reset-password", {
        method: "POST",
      });
      if (res.ok) {
        setBkActionMsg({
          type: "success",
          text: "Sandi Guru BK sukses di-reset ke bawaan default: bk123",
        });
      } else {
        const d = await res.json();
        setBkActionMsg({
          type: "error",
          text: d.error || "Gagal melakukan reset sandi Guru BK.",
        });
      }
    } catch {
      setBkActionMsg({
        type: "error",
        text: "Gangguan komunikasi dengan server.",
      });
    } finally {
      setIsOperatingBkPwd(false);
    }
  };

  const handleResetSystemData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetValidationInput.trim() !== "KONFIRMASI") {
      setResetSystemMsg({
        type: "error",
        text: "Silakan ketik kata KONFIRMASI secara tepat untuk melanjutkan.",
      });
      return;
    }

    setIsResettingSystem(true);
    setResetSystemMsg(null);
    try {
      const res = await fetch("/api/admin/system/reset-data", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResetSystemMsg({
          type: "success",
          text: "[SUKSES] Sukses! Seluruh data transaksi keuangan & siswa dummy berhasil dikosongkan. Sistem akan memuat ulang halaman...",
        });
        setResetValidationInput("");
        setTimeout(() => {
          setShowResetModal(false);
          window.location.reload();
        }, 2500);
      } else {
        setResetSystemMsg({
          type: "error",
          text: data.error || "Terjadi kesalahan saat mengosongkan data.",
        });
      }
    } catch {
      setResetSystemMsg({
        type: "error",
        text: "Gagal menghubungi server untuk memproses reset data.",
      });
    } finally {
      setIsResettingSystem(false);
    }
  };

  const handleSaveMidtransFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFees(true);
    setSavingFeesMsg(null);
    try {
      const res = await fetch("/api/set-midtrans-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId: midtransMerchantIdInput,
          clientKey: midtransClientKeyInput,
          serverKey: midtransServerKeyInput,
          isProduction: midtransIsProduction,
          isDisabled: midtransIsDisabled,
          systemMaintenanceFee: 0,
          chargeFeesToUser: false,
          pin: midtransPinInput || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavingFeesMsg({
          type: "success",
          text: "[SUKSES] Semua pengaturan API Midtrans & biaya sistem berhasil disimpan!",
        });
        setMidtransServerKeyInput(""); // Reset server key password input after successful update
        setMidtransPinInput(""); // Clear set PIN input
        onRefresh(); // trigger system config refresh
      } else {
        setSavingFeesMsg({
          type: "error",
          text: data.error || "Gagal menyimpan pengaturan.",
        });
      }
    } catch (err) {
      console.error(err);
      setSavingFeesMsg({
        type: "error",
        text: "Koneksi gagal. Silakan coba lagi.",
      });
    } finally {
      setIsSavingFees(false);
    }
  };

  const handleVerifyMidtransPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPin(true);
    setMidtransPinError("");
    try {
      const res = await fetch("/api/verify-midtrans-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: midtransVerificationPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsMidtransUnlocked(true);
        setMidtransVerificationPin("");
      } else {
        setMidtransPinError(
          "[GAGAL] PIN Keamanan salah! Silakan masukkan PIN yang benar.",
        );
      }
    } catch (err) {
      console.error(err);
      setMidtransPinError(
        " Gagal menghubungkan ke server untuk verifikasi PIN.",
      );
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file logo terlalu besar. Maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogo2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file logo kedua terlalu besar. Maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolLogo2(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file kop surat terlalu besar. Maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolLetterhead(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTreasurerSignatureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file ttd bendahara terlalu besar. Maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolTreasurerSignature(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrincipalSignatureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file ttd kepala sekolah terlalu besar. Maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolPrincipalSignature(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSchoolStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file stempel sekolah terlalu besar. Maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolStamp(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setSchoolIdentityMsg({
        type: "error",
        text: "Ukuran file favicon terlalu besar. Maksimal 1MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSchoolFavicon(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSchoolIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSchoolIdentity) return;
    setIsSavingSchoolIdentity(true);
    setSchoolIdentityMsg(null);

    const success = await onUpdateSchoolIdentity({
      name: schoolName,
      subheading: schoolSubheading,
      accreditation: schoolAccreditation,
      address: schoolAddress,
      phone: schoolPhone,
      principal: schoolPrincipal,
      treasurer: schoolTreasurer,
      logo: schoolLogo,
      logo2: schoolLogo2,
      letterhead: schoolLetterhead,
      treasurerSignature: schoolTreasurerSignature,
      principalSignature: schoolPrincipalSignature,
      schoolStamp: schoolStamp,
      favicon: schoolFavicon,
      apkUrl: apkUrl,
      iosUrl: iosUrl,
      treasurerSkUrl: treasurerSkUrl,
      sarprasSkUrl: sarprasSkUrl,
      activeAcademicYear: schoolActiveAcademicYear,
    });

    if (success) {
      setSchoolIdentityMsg({
        type: "success",
        text: "[SUKSES] Identitas resmi sekolah berhasil diperbarui dan disiarkan secara waktu nyata.",
      });
    } else {
      setSchoolIdentityMsg({
        type: "error",
        text: "Gagal memperbarui identitas sekolah.",
      });
    }
    setIsSavingSchoolIdentity(false);
  };

  return (
    <div
      id="admin-panel-root"
      className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-24 md:pb-0"
    >
      {/* Sidebar Command List */}
      <div className="hidden md:flex md:col-span-3 flex-col gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2.5 block">
            Menu Administrasi
          </span>

          <button
            id="admin-menu-roster"
            onClick={() => setAdminTab("roster")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "roster"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users size={15} />
            Daftar Siswa & SPP
          </button>

          <button
            id="admin-menu-jadwal"
            onClick={() => setAdminTab("jadwal")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "jadwal"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50"
            }`}
          >
            <Calendar size={15} className="text-indigo-600" />
            Matriks Jadwal Pelajaran
          </button>

          <button
            id="admin-menu-subject-teacher-mgmt"
            onClick={() => setAdminTab("subject_teacher_mgmt")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "subject_teacher_mgmt"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users size={15} className="text-teal-500" />
            Akun Guru Mapel (Jurnal KBM)
          </button>

          <button
            id="admin-menu-student-mgmt"
            onClick={() => setAdminTab("student_mgmt")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "student_mgmt"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap size={15} />
            Akun Siswa
          </button>

          <button
            id="admin-menu-homeroom-mgmt"
            onClick={() => setAdminTab("homeroom_mgmt")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "homeroom_mgmt"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ClipboardCheck size={15} className="text-amber-500" />
            Akun Wali Kelas (Absensi)
          </button>

          <button
            id="admin-menu-alumni"
            onClick={() => {
              setAdminTab("alumni");
              setSelectedStudent(null);
            }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "alumni"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap size={15} className="text-yellow-500" />
            <span>Alumni (Lulusan)</span>
          </button>

          <button
            id="admin-menu-student-qr"
            onClick={() => setAdminTab("student_qr")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "student_qr"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ImageIcon size={15} className="text-indigo-500" />
            Kartu QR Pembayaran Siswa
          </button>

          <button
            id="admin-menu-broadcast"
            onClick={() => setAdminTab("broadcast")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "broadcast"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BellRing size={15} />
            Kirim Notifikasi Real-time
          </button>

          <button
            id="admin-menu-pembayaran-lain"
            onClick={() => {
              setAdminTab("pembayaran_lain");
              setSelectedStudent(null);
            }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "pembayaran_lain"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Banknote size={15} className="text-blue-500" />
            Pembayaran Lain-lain
          </button>

          <button
            id="admin-menu-reports"
            onClick={() => setAdminTab("laporan")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "laporan"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText size={15} className="text-emerald-500" />
            Laporan & Rekap
          </button>

          <button
            id="admin-menu-mutasi"
            onClick={() => {
              setAdminTab("mutasi");
              setSelectedStudent(null);
            }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "mutasi"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <RefreshCw size={15} className="text-orange-500" />
            <span>Siswa Mutasi</span>
          </button>

          <button
            id="admin-menu-buku-induk"
            onClick={() => {
              setAdminTab("buku_induk");
              setSelectedStudent(null);
            }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "buku_induk"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen size={15} className="text-indigo-600" />
            <span>Buku Induk Kesiswaan</span>
          </button>

          <button
            id="admin-menu-spmb"
            onClick={() => {
              setAdminTab("spmb");
              setSelectedStudent(null);
            }}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "spmb"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/20"
                : "text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users size={15} className={adminTab === "spmb" ? "text-white" : "text-emerald-600"} />
              <span>SPMB 2027/2028</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${adminTab === "spmb" ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-900"}`}>
              Baru
            </span>
          </button>

          <button
            id="admin-menu-config"
            onClick={() => setAdminTab("config")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "config"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Settings size={15} />
            Pengaturan
          </button>
        </div>

        {/* Integration Credentials Info Block */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs flex flex-col gap-2">
          <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-600" /> Profil Sistem
          </h4>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-bold tracking-wider">
                Gateway Status:
              </span>
              {midtransStatus?.isDisabled ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  DISABLED
                </span>
              ) : midtransStatus?.hasServerKey && midtransStatus?.clientKey ? (
                midtransStatus.isProduction ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PRODUCTION
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    SANDBOX
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                  TELLER / OFF
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-bold tracking-wider">
                SSE Listener:
              </span>
              <span className="text-emerald-600 font-bold font-mono">
                AKTIF (SSE)
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-bold tracking-wider">
                Metode Bayar:
              </span>
              <span className="text-slate-700 font-bold font-sans">
                WEBHOOK
              </span>
            </div>
          </div>
        </div>

        {/* Unduh Aplikasi Mobile Block */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs flex flex-col gap-2 text-left">
          <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone size={14} className="text-emerald-600" /> Aplikasi
            Mobile Sekolah
          </h4>
          <p className="text-[10px] text-slate-500 leading-normal">
            Akses portal instan di smartphone Anda menggunakan aplikasi mobile
            resmi.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <a
              href={schoolIdentity?.apkUrl || "#"}
              target={schoolIdentity?.apkUrl ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!schoolIdentity?.apkUrl) {
                  e.preventDefault();
                  alert(
                    "Link unduhan Android belum diatur oleh Administrator.",
                  );
                }
              }}
              className={`px-1.5 py-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer select-none group font-bold ${
                schoolIdentity?.apkUrl
                  ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800 border-emerald-250 shadow-3xs"
                  : "bg-slate-50/50 text-slate-400 border-slate-100 opacity-70"
              }`}
            >
              <Smartphone
                size={16}
                className={`${schoolIdentity?.apkUrl ? "text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)] group-hover:scale-110" : "text-emerald-300/60"} transition-transform stroke-[2.5]`}
              />
              <span className="text-[8.5px]">Android APK</span>
            </a>
            <a
              href={schoolIdentity?.iosUrl || "#"}
              target={schoolIdentity?.iosUrl ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!schoolIdentity?.iosUrl) {
                  e.preventDefault();
                  alert("Link unduhan iOS belum diatur oleh Administrator.");
                }
              }}
              className={`px-1.5 py-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer select-none group font-bold ${
                schoolIdentity?.iosUrl
                  ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-800 border-sky-250 shadow-3xs"
                  : "bg-slate-50/50 text-slate-400 border-slate-100 opacity-70"
              }`}
            >
              <Apple
                size={16}
                className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`}
              />
              <span className="text-[8.5px]">iOS Apple</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Action Stage */}
      <div className="md:col-span-9 flex flex-col gap-6">
        {/* Tab Jadwal Pelajaran */}
        {adminTab === "jadwal" && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <ScheduleView
              role="admin"
              schedules={classSchedules}
              onRefreshSchedule={onRefresh}
              availableClasses={Array.from(new Set(students.map(s => s.class))).filter(Boolean).sort()}
              subjectTeachers={subjectTeachers}
              homerooms={homerooms}
            />
          </div>
        )}

        {/* Tab 1: Student Roster and Payments */}
        {adminTab === "roster" && (
          <div className="flex flex-col gap-6">
            {/* Real-time Pending Withdrawal Approvals Section */}
            {pendingWithdrawals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-center gap-2 border-b border-amber-200/50 pb-3">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                    <ClipboardCheck size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-900 text-sm uppercase tracking-wide">
                      Persetujuan Penarikan Tabungan Siswa (
                      {pendingWithdrawals.length})
                    </h4>
                    <p className="text-[10px] text-amber-700/80 font-semibold">
                      Pengajuan penarikan tabungan mandiri dari siswa ini
                      membutuhkan verifikasi & konfirmasi manual admin sebelum
                      saldo dipotong.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingWithdrawals.map((tx) => {
                    const student = students.find((s) => s.id === tx.studentId);
                    const isProcessing = confirmingTxId === tx.id;

                    return (
                      <div
                        key={tx.id}
                        className="bg-white rounded-xl border border-amber-150 p-4 shadow-2xs flex flex-col justify-between gap-3 text-xs opacity-100"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-extrabold text-slate-800 text-sm block">
                                {student?.name || "Siswa Tidak Dikenal"}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                Kelas {student?.class || "-"} &bull; NIS{" "}
                                {student?.nis || "-"}
                              </span>
                            </div>
                            <span className="text-right shrink-0">
                              <span className="font-extrabold text-rose-600 font-mono text-sm block">
                                Rp {tx.amount.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[8px] text-slate-400 font-mono font-bold block mt-0.5">
                                NOMINAL PENARIKAN
                              </span>
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Alasan / Catatan Keperluan:
                            </span>
                            <span className="text-[11px] text-slate-705 font-medium">
                              "{tx.notes || "Tarik tunai keperluan sekolah"}"
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 font-medium">
                            Diajukan:{" "}
                            {new Date(tx.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={isProcessing || !onConfirmWithdrawal}
                            onClick={async () => {
                              if (!onConfirmWithdrawal) return;
                              setConfirmingTxId(tx.id);
                              await onConfirmWithdrawal(tx.id, "approve");
                              setConfirmingTxId(null);
                            }}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            {isProcessing ? (
                              "Memproses..."
                            ) : (
                              <>
                                <CheckCircle size={12} /> Setujui
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing || !onConfirmWithdrawal}
                            onClick={async () => {
                              if (!onConfirmWithdrawal) return;
                              if (
                                !window.confirm(
                                  "Apakah Anda yakin ingin menolak pengajuan penarikan ini?",
                                )
                              )
                                return;
                              setConfirmingTxId(tx.id);
                              await onConfirmWithdrawal(tx.id, "reject");
                              setConfirmingTxId(null);
                            }}
                            className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Profil Keuangan & Mutasi Detail Panel */}
            <AnimatePresence>
              {selectedStudent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5 text-xs"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <User size={16} className="text-indigo-600" /> Profil &
                        Buku Rekening Keuangan: {selectedStudent.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Siswa Kelas <strong>{selectedStudent.class}</strong>{" "}
                        &bull; NIS:{" "}
                        <strong className="font-mono">
                          {selectedStudent.nis}
                        </strong>{" "}
                        &bull; Kelola tabungan dan kuitansi pembayaran SPP
                        secara mandiri.
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-slate-500 hover:text-slate-900 font-bold border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Sembunyikan Panel
                    </button>
                  </div>

                  {/* RINGKASAN KERANJANG BELANJA PEMBAYARAN GABUNGAN/KOLEKTIF */}
                  {paymentCart.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-4 flex flex-col gap-3 relative shadow-sm"
                    >
                      <div className="flex flex-wrap justify-between items-center border-b border-amber-200 pb-2.5 gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="p-1 px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                            <ShoppingCart
                              size={13}
                              className="animate-bounce"
                            />
                            <span>
                              KERANJANG PEMBAYARAN ({paymentCart.length} ITEM)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {paymentCart.filter((i) => i.type === "spp").length > 0 && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-black">
                                {paymentCart.filter((i) => i.type === "spp").length} SPP
                              </span>
                            )}
                            {paymentCart.filter((i) => i.type === "savings_deposit").length > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black">
                                {paymentCart.filter((i) => i.type === "savings_deposit").length} Tabungan
                              </span>
                            )}
                            {paymentCart.filter((i) => i.type === "misc").length > 0 && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black">
                                {paymentCart.filter((i) => i.type === "misc").length} Lain-lain
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentCart([])}
                          className="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase hover:underline cursor-pointer transition-colors"
                        >
                          Kosongkan Keranjang
                        </button>
                      </div>

                      <div className="divide-y divide-amber-200/60 max-h-48 overflow-y-auto pr-1">
                        {paymentCart.map((item) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex justify-between items-center text-xs"
                          >
                            <div className="flex flex-col text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-800">
                                  {item.type === "spp"
                                    ? `SPP Bulanan (${item.month} ${item.year})`
                                    : item.type === "misc"
                                    ? `Lain-lain (${item.notes})`
                                    : "Setoran Tabungan"}
                                </span>
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                    item.type === "spp"
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      : item.type === "savings_deposit"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {item.type === "spp"
                                    ? "SPP"
                                    : item.type === "savings_deposit"
                                    ? "Tabungan"
                                    : "Lainnya"}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-550 font-medium">
                                Siswa:{" "}
                                <strong className="text-slate-700">
                                  {item.student.name}
                                </strong>{" "}
                                ({item.student.nis} - Kelas {item.student.class}
                                ){item.notes && ` - Memo: "${item.notes}"`}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-mono font-extrabold text-slate-900">
                                Rp {item.amount.toLocaleString("id-ID")},00
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 transition-colors hover:bg-rose-50 rounded"
                                title="Hapus dari keranjang"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between items-center pt-3 border-t border-amber-200 gap-3 font-bold text-sm bg-amber-100/40 -mx-4 -mb-4 p-4 rounded-b-2xl">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-wider text-amber-900 font-black">
                            Total Tagihan Keranjang ({paymentCart.length} Item)
                          </span>
                          <span className="font-mono text-slate-900 font-extrabold text-base">
                            Rp{" "}
                            {paymentCart
                              .reduce((total, item) => total + item.amount, 0)
                              .toLocaleString("id-ID")}
                            ,00
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Tombol Bayar via Midtrans Online */}
                          <button
                            type="button"
                            disabled={isProcessingCartMidtrans || processingCart}
                            onClick={handleProcessCartMidtransCheckout}
                            className={`px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                              isProcessingCartMidtrans || processingCart
                                ? "opacity-50 cursor-not-allowed shadow-none"
                                : "hover:from-emerald-700 hover:to-teal-700 active:scale-95 cursor-pointer"
                            }`}
                            title="Bayar online menggunakan gateway Midtrans (QRIS, VA Bank, Gopay, ShopeePay)"
                          >
                            {isProcessingCartMidtrans ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Menyiapkan Midtrans...</span>
                              </>
                            ) : (
                              <>
                                <Zap size={13} className="text-amber-300 fill-amber-300" />
                                <span>Bayar via Midtrans (QRIS/VA) </span>
                              </>
                            )}
                          </button>

                          {/* Tombol Bayar Kasir Tunai / Teller */}
                          <button
                            type="button"
                            disabled={processingCart || isProcessingCartMidtrans}
                            onClick={handleProcessCartCheckout}
                            className={`px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                              processingCart || isProcessingCartMidtrans
                                ? "opacity-50 cursor-not-allowed shadow-none"
                                : "hover:from-amber-600 hover:to-orange-600 active:scale-95 cursor-pointer"
                            }`}
                            title="Bayar langsung secara tunai di kasir dan cetak kuitansi kolektif"
                          >
                            {processingCart ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Sedang Memproses...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={13} />
                                <span>Bayar Tunai & Cetak  </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Switcher Tab utama: Memisahkan tampilan SPP Bulanan, Histori Tabungan, dan Lain-lain secara mandiri */}
                  <div className="flex flex-wrap border border-slate-200 p-1 bg-slate-50 rounded-xl gap-2 font-sans">
                    <button
                      type="button"
                      onClick={() => setStudentDetailTab("spp")}
                      className={`flex-1 min-w-[120px] py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        studentDetailTab === "spp"
                          ? "bg-indigo-650 bg-indigo-600 text-white border-transparent shadow-md font-extrabold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-bold"
                      }`}
                    >
                      <BookOpen size={14} />
                      Iuran SPP Bulanan (
                      {
                        bills.filter((b) => b.studentId === selectedStudent.id)
                          .length
                      }{" "}
                      Bulan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentDetailTab("savings")}
                      className={`flex-1 min-w-[120px] py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        studentDetailTab === "savings"
                          ? "bg-indigo-650 bg-indigo-600 text-white border-transparent shadow-md font-extrabold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-bold"
                      }`}
                    >
                      <Banknote size={14} />
                      Histori Tabungan (
                      {
                        transactions.filter(
                          (t) =>
                            t.studentId === selectedStudent.id &&
                            t.status === "success",
                        ).length
                      }{" "}
                      Transaksi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentDetailTab("misc")}
                      className={`flex-1 min-w-[120px] py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        studentDetailTab === "misc"
                          ? "bg-indigo-650 bg-indigo-600 text-white border-transparent shadow-md font-extrabold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-bold"
                      }`}
                    >
                      <CreditCard size={14} />
                      Iuran Lain-lain (
                      {
                        miscBills.filter((b) => b.studentId === selectedStudent.id)
                          .length
                      }{" "}
                      Tagihan)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {studentDetailTab === "spp" ? (
                      <>
                        {/* TAMPILAN SPP: 100% Hanya informasi dan aksi terkait SPP */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                          {/* Card SPP khusus */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white shadow-md flex flex-col justify-between min-h-[110px] relative overflow-hidden">
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                              <BookOpen size={120} />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-300">
                                STATUS BUKU IURAN SPP SISWA
                              </span>
                              <span className="text-lg md:text-xl font-bold font-mono block mt-1">
                                {
                                  bills.filter(
                                    (b) =>
                                      b.studentId === selectedStudent.id &&
                                      isSppBillOverdue(b),
                                  ).length
                                }{" "}
                                Bulan Tunggakan
                              </span>
                            </div>
                            <div className="mt-4 pt-2 border-t border-emerald-800/40 flex justify-between items-center text-[10px] text-emerald-300">
                              <span className="font-semibold uppercase tracking-wide">
                                Tingkat Kelas: {selectedStudent.class}
                              </span>
                              <span className="font-bold font-mono">
                                Tarif: Rp{" "}
                                {(() => {
                                  const clsStr = String(
                                    selectedStudent.class || "",
                                  ).toLowerCase();
                                  if (clsStr.includes("7"))
                                    return sppConfigRates.grade7.toLocaleString(
                                      "id-ID",
                                    );
                                  if (clsStr.includes("8"))
                                    return sppConfigRates.grade8.toLocaleString(
                                      "id-ID",
                                    );
                                  if (clsStr.includes("9"))
                                    return sppConfigRates.grade9.toLocaleString(
                                      "id-ID",
                                    );
                                  return sppConfigRates.grade7.toLocaleString(
                                    "id-ID",
                                  );
                                })()}
                                /bln
                              </span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-3 text-xs leading-relaxed text-slate-600">
                            <h5 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                              <ShieldAlert
                                size={14}
                                className="text-emerald-600"
                              />{" "}
                              Aturan Tagihan SPP
                            </h5>
                            <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-500">
                              <li>
                                Iuran SPP wajib diselesaikan paling lambat
                                tanggal <strong>10 setiap bulan</strong>.
                              </li>
                              <li>
                                Pembayaran SPP dapat digabungkan beberapa bulan sekaligus ke dalam keranjang untuk dicetak dalam satu kuitansi resmi.
                              </li>
                              <li>
                                Teller sekolah berhak mencatatkan pembayaran
                                tunai manual jika siswa membawa uang kas ke
                                loket tata usaha.
                              </li>
                              <li>
                                Kuitansi resmi dapat dicetak seketika setelah
                                pembayaran berhasil diverifikasi.
                              </li>
                            </ul>
                          </div>

                          {/* Bayar SPP Multi-Bulan Sekaligus Section */}
                          {bills.filter(b => b.studentId === selectedStudent.id && b.status === "unpaid" && (!isMutationStudent(selectedStudent) || checkIsBillActive(b, selectedStudent.id))).length > 0 && (
                            <div className="bg-amber-50/60 p-4 border border-amber-200/80 rounded-xl flex flex-col gap-3 text-xs text-slate-700 shadow-sm">
                              <h5 className="font-extrabold text-amber-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                                <ShoppingCart size={13} className="text-amber-600" />
                                Bayar SPP Beberapa Bulan Sekaligus
                              </h5>
                              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                                Pilih beberapa bulan SPP yang belum lunas di bawah, lalu tambahkan ke keranjang untuk dicatat dalam satu kuitansi resmi teller.
                              </p>

                              <div className="max-h-[140px] overflow-y-auto border border-amber-200/50 rounded-lg p-2 bg-white/80 flex flex-col gap-1.5">
                                {bills
                                  .filter(b => b.studentId === selectedStudent.id && b.status === "unpaid" && (!isMutationStudent(selectedStudent) || checkIsBillActive(b, selectedStudent.id)))
                                  .sort((a, b) => {
                                    const MONTH_MAP: Record<string, number> = {
                                      Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
                                      Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
                                    };
                                    const aScore = a.year * 12 + (MONTH_MAP[a.month] || 0);
                                    const bScore = b.year * 12 + (MONTH_MAP[b.month] || 0);
                                    return aScore - bScore;
                                  })
                                  .map((b) => {
                                    const isAlreadyInCart = paymentCart.some(item => item.type === "spp" && item.billId === b.id);
                                    const isSelected = selectedSppBills.includes(b.id);
                                    return (
                                      <label
                                        key={b.id}
                                        className={`flex items-center justify-between p-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                                          isAlreadyInCart
                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            : isSelected
                                            ? "bg-amber-100 text-amber-900"
                                            : "hover:bg-amber-50 text-slate-700"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            disabled={isAlreadyInCart}
                                            checked={isAlreadyInCart || isSelected}
                                            onChange={(e) => {
                                              if (isAlreadyInCart) return;
                                              if (e.target.checked) {
                                                setSelectedSppBills(prev => [...prev, b.id]);
                                              } else {
                                                setSelectedSppBills(prev => prev.filter(id => id !== b.id));
                                              }
                                            }}
                                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                                          />
                                          <span>{b.month} {b.year}</span>
                                        </div>
                                        <div className="font-mono text-[10px]">
                                          {isAlreadyInCart ? (
                                            <span className="text-slate-400 uppercase font-bold text-[9px] bg-slate-200/50 px-1.5 py-0.5 rounded">Di Keranjang</span>
                                          ) : (
                                            `Rp ${b.amount.toLocaleString("id-ID")}`
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const unpaidSpp = bills
                                      .filter(b => b.studentId === selectedStudent.id && b.status === "unpaid" && (!isMutationStudent(selectedStudent) || checkIsBillActive(b, selectedStudent.id)))
                                      .map(b => b.id);
                                    setSelectedSppBills(unpaidSpp);
                                  }}
                                  className="flex-1 py-1 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[10px] uppercase transition-all"
                                >
                                  Pilih Semua
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSppBills([])}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-[10px] uppercase transition-all"
                                >
                                  Bersihkan
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={selectedSppBills.length === 0}
                                onClick={() => {
                                  const selectedBillsObj = bills.filter(b => selectedSppBills.includes(b.id));
                                  addBatchToCartSpp(selectedBillsObj, selectedStudent);
                                  setSelectedSppBills([]);
                                }}
                                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                              >
                                <Plus size={12} />
                                <span>Tambah {selectedSppBills.length} Bulan Ke Keranjang</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* LIST SPP DI KANAN */}
                        <div className="lg:col-span-7 flex flex-col gap-4">
                          <div className="flex flex-col gap-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <BookOpen
                                size={13}
                                className="text-emerald-600"
                              />{" "}
                              Daftar Rekap Tagihan SPP Bulanan
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-mono">
                              Total{" "}
                              {
                                bills.filter(
                                  (b) => b.studentId === selectedStudent.id,
                                ).length
                              }{" "}
                              Tagihan
                            </span>
                          </div>

                          <div className="p-3 max-h-[350px] overflow-y-auto">
                            <div className="flex flex-col gap-2">
                              {bills.filter(
                                (b) => b.studentId === selectedStudent.id,
                              ).length === 0 ? (
                                <div className="text-center py-6 text-[11px] text-slate-400">
                                  Tidak ada tagihan SPP bagi siswa ini.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left font-sans text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                                        <th className="pb-2">Bulan/Tahun</th>
                                        <th className="pb-2">Nominal</th>
                                        <th className="pb-2 text-center">
                                          Status
                                        </th>
                                        <th className="pb-2 text-right">
                                          Aksi Pembayaran / Kuitansi
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {bills
                                        .filter(
                                          (b) =>
                                            b.studentId === selectedStudent.id,
                                        )
                                        .sort((a, b) => {
                                          if (b.year !== a.year)
                                            return b.year - a.year;
                                          const monthsOrdered = [
                                            "Juli",
                                            "Agustus",
                                            "September",
                                            "Oktober",
                                            "November",
                                            "Desember",
                                            "Januari",
                                            "Februari",
                                            "Maret",
                                            "April",
                                            "Mei",
                                            "Juni",
                                          ];
                                          return (
                                            monthsOrdered.indexOf(b.month) -
                                            monthsOrdered.indexOf(a.month)
                                          );
                                        })
                                        .map((b) => (
                                          <tr
                                            key={b.id}
                                            className="hover:bg-slate-50/50"
                                          >
                                            <td className="py-2.5 font-bold text-slate-700">
                                              {b.month} {b.year}
                                            </td>
                                            <td className="py-2.5 font-mono text-slate-600 font-bold">
                                              Rp{" "}
                                              {b.amount.toLocaleString("id-ID")}
                                            </td>
                                            <td className="py-2.5 text-center">
                                              {b.status === "paid" ? (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                  LUNAS
                                                </span>
                                              ) : b.status === "waived" ? (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-705 border border-indigo-100 uppercase flex items-center gap-0.5 justify-center">
                                                  {b.achievementType === 'non-prestasi'
                                                    ? " BEBAS (DILUAR PRESTASI)"
                                                    : b.achievementType === 'kebijakan'
                                                    ? "  BEBAS (KEBIJAKAN)"
                                                    : " BEBAS PRESTASI"}
                                                </span>
                                              ) : b.status === "pending" ? (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                                                  PENDING
                                                </span>
                                              ) : !checkIsBillActive(
                                                  b,
                                                  selectedStudent.id,
                                                ) ? (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 uppercase flex items-center gap-0.5 justify-center">
                                                  <Lock size={8} /> Nonaktif
                                                </span>
                                              ) : (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                                  UNPAID
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 text-right">
                                              {b.status === "paid" ? (
                                                <div className="flex gap-1.5 justify-end items-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setReceiptToPrint({
                                                        type: "spp",
                                                        detail: b,
                                                        student:
                                                          selectedStudent,
                                                      });
                                                      setPrintId(
                                                        "print-receipt-section",
                                                      );
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-205 border border-slate-200 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                                  >
                                                    <Printer
                                                      size={10}
                                                      className="text-indigo-600"
                                                    />{" "}
                                                    Cetak  
                                                  </button>
                                                  {onCancelSppManual && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBillToCancel(b);
                                                        setCancelFeedback(
                                                          null,
                                                        );
                                                      }}
                                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                                                      title={b.paymentMethod && b.paymentMethod.toLowerCase().includes("midtrans") ? "Batalkan / koreksi pembayaran Midtrans ini" : "Batalkan pembayaran manual teller ini"}
                                                    >
                                                      Batal  
                                                    </button>
                                                  )}
                                                </div>
                                              ) : b.status === "waived" ? (
                                                <div className="flex gap-1.5 justify-end items-center">
                                                  <span className="text-[10px] text-indigo-650 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md truncate max-w-[150px]" title={b.achievementDetail}>
                                                    {b.achievementDetail || "Apresiasi Prestasi"}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCancelSppWaived(b.id)}
                                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                                                    title="Batalkan pembebasan SPP ini untuk kembali berstatus unpaid"
                                                  >
                                                    Batal  
                                                  </button>
                                                </div>
                                              ) : !checkIsBillActive(
                                                  b,
                                                  selectedStudent.id,
                                                ) ? (
                                                <div className="flex justify-end items-center">
                                                  <span
                                                    className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1"
                                                    title="Siswa harus melunasi SPP bulan berjalan terlebih dahulu"
                                                  >
                                                    <Lock size={9} /> SPP
                                                    berjalan belum lunas
                                                  </span>
                                                </div>
                                              ) : (
                                                <div className="flex gap-1 justify-end items-center">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      addToCartSpp(
                                                        b,
                                                        selectedStudent,
                                                      );
                                                    }}
                                                    className="px-1.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded text-[8px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                                                    title="Tambahkan tagihan ini ke Ringkasan Keranjang Pembayaran"
                                                  >
                                                    <ShoppingCart size={9} />
                                                    <span>+ Keranjang</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={
                                                      processingBillId !== null
                                                    }
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      setProcessingBillId(b.id);
                                                      const resBill =
                                                        await onPaySppManual(
                                                          b.id,
                                                        );
                                                      setProcessingBillId(null);
                                                      if (resBill) {
                                                        onRefresh();
                                                        onRefresh();
                                                        setReceiptToPrint({
                                                          type: "spp",
                                                          detail: {
                                                            ...b,
                                                            status: "paid",
                                                            paidAt:
                                                              new Date().toISOString(),
                                                            paymentMethod:
                                                              "Manual Teller (Sekolah)",
                                                            orderId:
                                                              resBill.orderId ||
                                                              `ORD-MANUAL-${Date.now()}`,
                                                          },
                                                          student:
                                                            selectedStudent,
                                                        });
                                                        setPrintId(
                                                          "print-receipt-section",
                                                        );
                                                      }
                                                    }}
                                                    className="px-1.5 py-1 bg-slate-100 hover:bg-slate-205 border border-slate-300 disabled:bg-slate-50 text-slate-600 font-bold rounded text-[8px] uppercase tracking-wider flex items-center justify-center cursor-pointer transition-colors"
                                                    title="Bayar Manual Tunai langsung"
                                                  >
                                                    Manual
                                                  </button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* FORM APRESIASI BEBAS SPP BEASISWA PRESTASI */}
                          {(() => {
                            const unpaidBillsForWaiver = bills.filter(
                              (b) => b.studentId === selectedStudent.id && b.status === "unpaid" && (!isMutationStudent(selectedStudent) || checkIsBillActive(b, selectedStudent.id))
                            );

                            return (
                              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-3 text-xs animate-fade-in">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-2 bg-indigo-100 text-indigo-705 rounded-xl">
                                    <Award size={18} strokeWidth={2.5} />
                                  </div>
                                  <div>
                                    <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider"> /  Pembebasan SPP (Beasiswa Prestasi & Bebas SPP Diluar Prestasi)</h5>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                      Bebaskan tagihan SPP bulanan siswa karena Prestasi (Akademik/Non-Akademik) maupun Pertimbangan Diluar Prestasi (Keringanan Khusus, Yatim/Piatu, Beasiswa Sosial, Subsidi Sekolah, atau Kebijakan Yayasan).
                                    </p>
                                  </div>
                                </div>

                                {unpaidBillsForWaiver.length === 0 ? (
                                  <div className="text-[10px] text-slate-500 italic bg-white border border-slate-200 p-3 rounded-lg text-center font-semibold mt-1">
                                    Semua SPP bulanan siswa ini sudah lunas atau dibebaskan.
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3 mt-1 border-t border-indigo-100/40 pt-3">
                                    <div>
                                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2">1. Pilih Bulan yang Dibebaskan:</label>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {unpaidBillsForWaiver.map((b) => {
                                          const isChecked = waiveBillIds.includes(b.id);
                                          return (
                                            <label
                                              key={b.id}
                                              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all cursor-pointer select-none ${
                                                isChecked
                                                  ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm shadow-indigo-100"
                                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  if (isChecked) {
                                                    setWaiveBillIds((prev) => prev.filter((id) => id !== b.id));
                                                  } else {
                                                    setWaiveBillIds((prev) => [...prev, b.id]);
                                                  }
                                                }}
                                                className="accent-indigo-600 cursor-pointer w-3.5 h-3.5 rounded border-slate-350"
                                              />
                                              <span className="text-[10px] truncate">{b.month} {b.year}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5">2. Kategori Pembebasan SPP:</label>
                                        <select
                                          value={waiveType}
                                          onChange={(e) => setWaiveType(e.target.value as any)}
                                          className="w-full p-2 bg-white border border-slate-205 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
                                        >
                                          <option value="akademik"> Prestasi Akademik</option>
                                          <option value="non-akademik">  Prestasi Non-Akademik</option>
                                          <option value="non-prestasi"> Bebas SPP Diluar Prestasi (Keringanan / Yatim / Beasiswa Sosial / Subsidi Khusus)</option>
                                          <option value="kebijakan">  Kebijakan Yayasan / Sekolah (Keterangan Khusus)</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                          {waiveType === 'non-prestasi'
                                            ? "3. Alasan / Detail Bebas SPP Diluar Prestasi:"
                                            : waiveType === 'kebijakan'
                                            ? "3. Alasan / Detail Kebijakan Yayasan:"
                                            : "3. Piagam / Detail Pencapaian Prestasi:"}
                                        </label>
                                        <input
                                          type="text"
                                          value={waiveDetail}
                                          onChange={(e) => setWaiveDetail(e.target.value)}
                                          placeholder={
                                            waiveType === 'non-prestasi'
                                              ? "Contoh: Yatim Piatu / Beasiswa Kurang Mampu / Keringanan Ekonomi Wali"
                                              : waiveType === 'kebijakan'
                                              ? "Contoh: Kebijakan Khusus Yayasan / Subsidi Pengurus"
                                              : "Contoh: Juara 1 Olimpiade Robotik Provinsi"
                                          }
                                          className="w-full p-2 bg-white border border-slate-205 rounded-xl text-[11px] text-slate-705 outline-none focus:border-indigo-500 shadow-3xs"
                                        />
                                      </div>
                                    </div>

                                    {waiverError && (
                                      <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                                        {waiverError}
                                      </p>
                                    )}

                                    <button
                                      type="button"
                                      onClick={handleWaiveSppBulk}
                                      disabled={isSubmittingWaiver || waiveBillIds.length === 0 || !waiveDetail.trim()}
                                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-indigo-100/50 flex items-center justify-center gap-1.5 mt-1"
                                    >
                                      {isSubmittingWaiver ? (
                                        "Sedang menyimpan data pembebasan SPP..."
                                      ) : (
                                        <span>
                                          Simpan Pembebasan {waiveBillIds.length} Bulan SPP {waiveType === 'non-prestasi' ? '' : waiveType === 'kebijakan' ? ' ' : ''}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : studentDetailTab === "savings" ? (
                      <>
                        {/* TAMPILAN TABUNGAN: 100% Hanya informasi dan aksi terkait Saldo & Mutasi Tabungan */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                          {/* Card Saldo Tabungan */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md flex flex-col justify-between min-h-[110px] relative overflow-hidden">
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                              <Banknote size={120} />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-350 text-indigo-200">
                                TOTAL SALDO TABUNGAN SISWA
                              </span>
                              <span className="text-lg md:text-xl font-bold font-mono block mt-1">
                                Rp{" "}
                                {selectedStudent.savingsBalance.toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                            </div>
                            <div className="mt-4 pt-2 border-t border-indigo-800/50 flex justify-between items-center text-[10px] text-indigo-300">
                              <span>SMP Maarif Pandaan</span>
                              <span className="font-mono uppercase text-[9px] font-bold bg-indigo-950/40 px-2 py-0.5 rounded text-indigo-200">
                                REKENING AKTIF
                              </span>
                            </div>
                          </div>

                          {/* Formulir Mutasi Tabungan Manual */}
                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                              Mutasi Tabungan Manual
                            </span>

                            <div className="grid grid-cols-2 gap-1 bg-white p-0.5 border border-slate-200 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setTxType("deposit")}
                                className={`py-1.5 rounded font-bold text-[10px] text-center cursor-pointer transition-all ${
                                  txType === "deposit"
                                    ? "bg-indigo-660 bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                SETOR TUNAI
                              </button>
                              <button
                                type="button"
                                onClick={() => setTxType("withdrawal")}
                                className={`py-1.5 rounded font-bold text-[10px] text-center cursor-pointer transition-all ${
                                  txType === "withdrawal"
                                    ? "bg-indigo-660 bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                TARIK TUNAI
                              </button>
                            </div>

                            <form
                              onSubmit={handleSavingsSubmit}
                              className="flex flex-col gap-3"
                            >
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                  Nominal Uang (Rp)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    required
                                    placeholder="cth: 50000"
                                    value={txAmount}
                                    onChange={(e) =>
                                      setTxAmount(e.target.value)
                                    }
                                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                                  />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">
                                    Rp
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="inline-flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 hover:text-slate-900 select-none">
                                  <input
                                    type="checkbox"
                                    checked={showTxNotes}
                                    onChange={(e) => {
                                      setShowTxNotes(e.target.checked);
                                      if (!e.target.checked) setTxNotes("");
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span>Tambah Memo / Catatan</span>
                                </label>

                                {showTxNotes && (
                                  <div className="animate-fade-in">
                                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                      Memo / Keterangan
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="cth: Tabungan harian saku"
                                      value={txNotes}
                                      onChange={(e) => setTxNotes(e.target.value)}
                                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                                    />
                                  </div>
                                )}
                              </div>

                              {txType === "deposit" ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      txProcessing ||
                                      !txAmount ||
                                      !onDepositSavingsViaMidtrans
                                    }
                                    onClick={async () => {
                                      if (
                                        onDepositSavingsViaMidtrans &&
                                        selectedStudent
                                      ) {
                                        setTxProcessing(true);
                                        await onDepositSavingsViaMidtrans(
                                          Number(txAmount),
                                          selectedStudent.id,
                                        );
                                        setTxProcessing(false);
                                        setTxAmount("");
                                        setTxNotes("");
                                        setShowTxNotes(false);
                                      }
                                    }}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    title="Proses setoran tabungan via Gerbang Pembayaran Midtrans"
                                  >
                                    <Zap
                                      size={11}
                                      className="text-yellow-400 fill-yellow-400 animate-pulse"
                                    />
                                    <span>Bayar via Midtrans (Online)</span>
                                  </button>

                                  <button
                                    type="submit"
                                    disabled={txProcessing || !txAmount}
                                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-205 border border-slate-300 text-slate-700 font-semibold rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {txProcessing
                                      ? "Menyimpan..."
                                      : "Atau Terima Tunai / Manual (Teller)"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={txProcessing || !txAmount}
                                    onClick={() => {
                                      addToCartSavings(
                                        Number(txAmount),
                                        showTxNotes ? txNotes : "",
                                        selectedStudent,
                                      );
                                      setTxAmount("");
                                      setTxNotes("");
                                      setShowTxNotes(false);
                                    }}
                                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm mt-1.5"
                                  >
                                    <ShoppingCart size={11} />
                                    <span>
                                      + Tambahkan Setoran ke Keranjang
                                    </span>
                                  </button>
                                  <button type="button" className="hidden">
                                    {txProcessing
                                      ? "Menyimpan..."
                                      : "Atau Terima Tunai / Manual (Teller)"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="submit"
                                  disabled={txProcessing || !txAmount}
                                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                                >
                                  {txProcessing
                                    ? "Menyimpan..."
                                    : "Catat Penarikan Tunai / Manual (Teller) "}
                                </button>
                              )}
                            </form>
                          </div>
                        </div>

                        {/* LIST MUTASI TABUNGAN DI KANAN */}
                        <div className="lg:col-span-7 flex flex-col gap-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <Banknote
                                size={13}
                                className="text-indigo-650 text-indigo-600"
                              />{" "}
                              Histori Arus Rekening Tabungan
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPassbookModalStudent(selectedStudent)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                title="Cetak Buku Tabungan & Mutasi Rekening (NIS)"
                              >
                                <Printer size={11} /> Cetak Buku Tabungan / Mutasi
                              </button>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-mono">
                                {
                                  transactions.filter(
                                    (t) =>
                                      t.studentId === selectedStudent.id &&
                                      t.status === "success",
                                  ).length
                                }{" "}
                                Transaksi
                              </span>
                            </div>
                          </div>

                          <div className="p-3 max-h-[350px] overflow-y-auto">
                            <div className="flex flex-col gap-2">
                              {transactions.filter(
                                (t) =>
                                  t.studentId === selectedStudent.id &&
                                  t.status === "success",
                              ).length === 0 ? (
                                <div className="text-center py-6 text-[11px] text-slate-400">
                                  Belum ada riwayat mutasi tabungan
                                  terverifikasi.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left font-sans text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                                        <th className="pb-2">Waktu/Nota</th>
                                        <th className="pb-2">Tipe</th>
                                        <th className="pb-2">Nominal</th>
                                        <th className="pb-2 text-right">
                                          Aksi Kuitansi
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {transactions
                                        .filter(
                                          (t) =>
                                            t.studentId ===
                                              selectedStudent.id &&
                                            t.status === "success",
                                        )
                                        .map((t) => (
                                          <tr
                                            key={t.id}
                                            className="hover:bg-slate-50/50"
                                          >
                                            <td className="py-2.5">
                                              <div className="font-bold text-slate-700">
                                                {new Date(
                                                  t.createdAt,
                                                ).toLocaleDateString("id-ID")}
                                              </div>
                                              <div
                                                className="text-[9px] text-slate-400 max-w-[120px] truncate"
                                                title={t.notes}
                                              >
                                                {t.notes || "Mutasi Tabungan"}
                                              </div>
                                            </td>
                                            <td className="py-2.5">
                                              {t.type === "deposit" ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold">
                                                  <ArrowDownLeft size={10} />{" "}
                                                  Setor
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 text-rose-700 font-bold">
                                                  <ArrowUpRight size={10} />{" "}
                                                  Tarik
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 font-mono text-slate-700 font-bold">
                                              Rp{" "}
                                              {t.amount.toLocaleString("id-ID")}
                                            </td>
                                            <td className="py-2.5 text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setReceiptToPrint({
                                                      type: "savings",
                                                      detail: t,
                                                      student: selectedStudent,
                                                    });
                                                    setPrintId(
                                                      "print-receipt-section",
                                                    );
                                                  }}
                                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-205 border border-slate-200 text-slate-705 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 ml-auto cursor-pointer"
                                                >
                                                  <Printer
                                                    size={10}
                                                    className="text-indigo-650"
                                                  />{" "}
                                                  Cetak  
                                                </button>
                                                {(!t.paymentMethod || !t.paymentMethod.toLowerCase().includes("midtrans")) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCancelSavingsTransactionLocal(t.id, t.type, t.amount)}
                                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                                    title="Batalkan transaksi tabungan ini"
                                                  >
                                                    <Trash2 size={10} className="text-rose-600" /> Batal [X]
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* TAMPILAN IURAN LAIN-LAIN */}
                        {(() => {
                          const studentMiscBills = miscBills.filter(b => b.studentId === selectedStudent.id);
                          const unpaidMisc = studentMiscBills.filter(b => b.status !== "paid");
                          const totalOutstandingMisc = unpaidMisc.reduce((sum, b) => sum + b.amount, 0);

                          return (
                            <>
                              {/* Left Side: Summary of Misc Bills */}
                              <div className="lg:col-span-5 flex flex-col gap-4 text-left">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white shadow-md flex flex-col justify-between min-h-[110px] relative overflow-hidden">
                                  <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                                    <CreditCard size={120} />
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-200">
                                      TOTAL TAGIHAN LAIN-LAIN BELUM BAYAR
                                    </span>
                                    <span className="text-lg md:text-xl font-bold font-mono block mt-1">
                                      Rp {totalOutstandingMisc.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                  <div className="mt-4 pt-2 border-t border-indigo-850 flex justify-between items-center text-[10px] text-indigo-300">
                                    <span>SMP Maarif Pandaan</span>
                                    <span>{unpaidMisc.length} Tagihan Tertunda</span>
                                  </div>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col gap-3">
                                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <span>Panduan & Aksi Cepat</span>
                                  </h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Iuran/Tagihan Lain-lain mencakup pembayaran seragam, buku, kegiatan, komite, UTS/UAS, dan iuran non-SPP lainnya.
                                    Anda dapat menambahkan tagihan ini ke <strong>Keranjang Pembayaran</strong> untuk digabungkan menjadi 1 kuitansi dengan SPP atau Tabungan.
                                  </p>
                                </div>
                              </div>

                              {/* Right Side: List of All Misc Bills for this student */}
                              <div className="lg:col-span-7 flex flex-col gap-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs text-left">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                    <CreditCard size={13} className="text-indigo-600" />
                                    Daftar Tagihan Iuran Lain-lain Siswa
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-mono">
                                    {studentMiscBills.length} Tagihan
                                  </span>
                                </div>

                                <div className="p-3 max-h-[350px] overflow-y-auto">
                                  {studentMiscBills.length === 0 ? (
                                    <div className="text-center py-10 text-[11px] text-slate-400">
                                      Belum ada data tagihan iuran lain-lain untuk siswa ini.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left font-sans text-[11px]">
                                        <thead>
                                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                                            <th className="pb-2">Nama Tagihan</th>
                                            <th className="pb-2">Nominal</th>
                                            <th className="pb-2">Status</th>
                                            <th className="pb-2 text-right">Aksi</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {studentMiscBills.map((bill) => {
                                            const isInCart = paymentCart.some((c) => c.type === "misc" && c.billId === bill.id);
                                            return (
                                              <tr key={bill.id} className="hover:bg-slate-50/50">
                                                <td className="py-3">
                                                  <div className="font-extrabold text-slate-800 leading-snug">
                                                    {bill.title}
                                                  </div>
                                                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    Ref ID: {bill.id.substring(0, 8).toUpperCase()}...
                                                  </div>
                                                </td>
                                                <td className="py-3 font-mono font-bold text-slate-700">
                                                  Rp {bill.amount.toLocaleString("id-ID")}
                                                </td>
                                                <td className="py-3">
                                                  {bill.status === "paid" ? (
                                                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] border border-emerald-100">
                                                      <CheckCircle size={9} /> Lunas
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-0.5 text-orange-700 font-bold bg-orange-50 px-1.5 py-0.5 rounded text-[9px] border border-orange-100">
                                                      <Clock size={9} /> Belum Lunas
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-3 text-right">
                                                  <div className="flex items-center justify-end gap-1.5">
                                                    {bill.status !== "paid" ? (
                                                      <>
                                                        <button
                                                          type="button"
                                                          onClick={() => addToCartMisc(bill, selectedStudent)}
                                                          disabled={isInCart}
                                                          className={`px-2 py-1 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                                            isInCart
                                                              ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                                              : "bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white shadow-xs"
                                                          }`}
                                                        >
                                                          <ShoppingCart size={9} />
                                                          {isInCart ? "Di Keranjang" : "+ Keranjang"}
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => handlePayMiscManualLocal(bill.id)}
                                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                                        >
                                                          <CheckCircle size={9} />
                                                          Bayar Tunai
                                                        </button>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            setReceiptToPrint({
                                                              type: "misc",
                                                              detail: bill,
                                                              student: selectedStudent,
                                                            });
                                                            setPrintId("print-receipt-section");
                                                          }}
                                                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                                        >
                                                          <Printer size={9} className="text-indigo-600" />
                                                          Cetak Bukti
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleCancelMiscPaymentLocal(bill.id)}
                                                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                                        >
                                                          Batal  
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Left table of students list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Dashboard Buku Kas & Rekening Siswa
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kelola tagihan SPP dan saldo tabungan siswa secara
                    terotomasi. Sesi administrasi sinkron real-time.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
                    onClick={() => setIsBulkWithdrawOpen(!isBulkWithdrawOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
                    title="Lakukan penarikan dana tabungan massal per angkatan/tingkat kelas"
                  >
                    <ArrowDownLeft size={13} className="stroke-[2.5]" />
                    <span>Tarik Massal (7,8,9)</span>
                  </button>

                  <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Update Data Buku Kas"
                  >
                    <RefreshCw
                      size={13}
                      className={isLoading ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </div>

              {/* Premium Bulk Savings Withdrawal Panel */}
              {isBulkWithdrawOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-rose-50/50 border-b border-rose-100 p-5 flex flex-col gap-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-rose-200/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-100 text-rose-800 rounded-lg shrink-0">
                        <ArrowDownLeft size={16} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-rose-900 text-xs uppercase tracking-wider">
                          Form Penarikan Tabungan Massal
                        </h4>
                        <p className="text-[10px] text-rose-700 font-semibold">
                          Penarikan per angkatan untuk keperluan ujian, LKS,
                          study tour, atau kebutuhan siswa lainnya.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkWithdrawOpen(false);
                        setBulkFeedback(null);
                      }}
                      className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-lg transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  {bulkFeedback ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <span className="text-lg">[OK]</span> Penarikan Massal
                        Sukses!
                      </div>
                      <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                        {bulkFeedback.message}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1.5 bg-white/60 p-3 rounded-lg border border-emerald-100">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">
                            Siswa Didebet
                          </span>
                          <span className="text-sm font-extrabold text-slate-800 font-mono">
                            {bulkFeedback.successCount || 0} Siswa
                          </span>
                        </div>
                        {bulkFeedback.skippedCount !== undefined && (
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">
                              Siswa Dilewati (Saldo 0)
                            </span>
                            <span className="text-sm font-extrabold text-slate-800 font-mono">
                              {bulkFeedback.skippedCount} Siswa
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">
                            Total Pendanaan
                          </span>
                          <span className="text-sm font-extrabold text-rose-600 font-mono">
                            Rp{" "}
                            {bulkFeedback.totalDeducted?.toLocaleString(
                              "id-ID",
                            ) || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBulkFeedback(null);
                            setBulkAmount("");
                            setBulkNotes("");
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          Tarik Lagi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkWithdrawOpen(false);
                            setBulkFeedback(null);
                            setBulkAmount("");
                            setBulkNotes("");
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-205 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Left: Configuration Inputs */}
                      <div className="lg:col-span-3 flex flex-col gap-3.5">
                        {/* Selector for Grade */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Pilih Angkatan / Tingkat Kelas
                          </label>
                          <div className="flex gap-2">
                            {["7", "8", "9"].map((lvl) => {
                              const isActive = bulkGrade === lvl;
                              const count = students.filter(
                                (s) =>
                                  s.class && s.class.trim().startsWith(lvl),
                              ).length;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setBulkGrade(lvl as any)}
                                  className={`flex-1 py-2 px-3 border rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-rose-600 border-rose-700 text-white shadow-sm font-extrabold"
                                      : "bg-white hover:bg-rose-50/50 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <span className="text-xs font-extrabold">
                                    Tingkat {lvl}
                                  </span>
                                  <span
                                    className={`text-[9px] block font-semibold mt-0.5 ${isActive ? "text-rose-100" : "text-slate-400"}`}
                                  >
                                    {count} Siswa Terdaftar
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Amount with pre-filled buttons */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Nominal Penarikan per Siswa (Rp)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pb-0.5 font-sans font-bold text-slate-400 text-xs">
                              Rp
                            </span>
                            <input
                              type="number"
                              required
                              min="1"
                              value={bulkAmount}
                              onChange={(e) => setBulkAmount(e.target.value)}
                              placeholder="Masukkan nominal, contoh: 50000"
                              className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-xs focus:ring-1 focus:ring-rose-500 text-slate-800 focus:outline-none"
                            />
                          </div>

                          {/* Quick selection tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {[10000, 25000, 50000, 75000, 100000, 150000].map(
                              (val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setBulkAmount(String(val))}
                                  className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                                    bulkAmount === String(val)
                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                      : "bg-white hover:bg-slate-105 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  Rp {val.toLocaleString("id-ID")}
                                </button>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Reason and notes */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Alasan / Keterangan Penarikan (Tercatat di Mutasi /
                            Rapor Tabungan)
                          </label>
                          <input
                            type="text"
                            required
                            value={bulkNotes}
                            onChange={(e) => setBulkNotes(e.target.value)}
                            placeholder="Contoh: Biaya Ujian Akhir Semester Genap, Modul LKS Kelas 7..."
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-rose-500 text-slate-800 focus:outline-none"
                          />
                        </div>

                        {/* Debt Configuration Checkbox */}
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            id="bulkAllowDebt"
                            checked={bulkAllowDebt}
                            onChange={(e) => setBulkAllowDebt(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <label
                            htmlFor="bulkAllowDebt"
                            className="text-[11px] text-slate-600 font-semibold cursor-pointer select-none leading-tight"
                          >
                            Izinkan saldo siswa menjadi minus{" "}
                            <span className="text-slate-400 font-normal">
                              (Catat sebagai defisit/utang jika saldo kurang)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Right: Informational/Metric/Action Card */}
                      <div className="bg-rose-50/50 border border-rose-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                        <div className="flex flex-col gap-3">
                          <h5 className="font-bold text-rose-900 text-[10px] uppercase tracking-wider">
                            Keamanan & Rangkuman Sesi
                          </h5>

                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-[11px] border-b border-rose-150 pb-1">
                              <span className="text-slate-505 font-medium">
                                Banyak Siswa
                              </span>
                              <span className="font-bold text-slate-800 font-mono text-xs">
                                {
                                  students.filter(
                                    (s) =>
                                      s.class &&
                                      s.class.trim().startsWith(bulkGrade),
                                  ).length
                                }{" "}
                                Siswa
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] border-b border-rose-150 pb-1 font-medium">
                              <span className="text-slate-505">
                                Nominal per Siswa
                              </span>
                              <span className="font-bold text-slate-800 font-mono text-xs">
                                Rp{" "}
                                {Number(bulkAmount || 0).toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-505 font-medium">
                                Total Maksimal Tarik
                              </span>
                              <span className="font-extrabold text-rose-600 font-mono text-xs">
                                Rp{" "}
                                {(
                                  students.filter(
                                    (s) =>
                                      s.class &&
                                      s.class.trim().startsWith(bulkGrade),
                                  ).length * Number(bulkAmount || 0)
                                ).toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex gap-1 leading-relaxed text-[9px] text-amber-800 font-medium">
                            <span></span>
                            <span>
                              Tindakan ini akan langsung mendebet saldo tabungan
                              seluruh siswa terpilih tanpa persetujuan bertahap.
                              Pastikan kuitansi ujian/kebutuhan sekolah telah
                              siap.
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={
                            bulkProcessing ||
                            !bulkAmount ||
                            !bulkNotes ||
                            !onBulkWithdrawSavings
                          }
                          onClick={async () => {
                            if (!onBulkWithdrawSavings) return;
                            const targetCount = students.filter(
                              (s) =>
                                s.class && s.class.trim().startsWith(bulkGrade),
                            ).length;
                            if (targetCount === 0) {
                              alert(
                                `Tidak ditemukan siswa di Tingkat ${bulkGrade}.`,
                              );
                              return;
                            }
                            const confirmText = `Apakah Anda yakin ingin menarik tabungan secara MASSAL untuk seluruh siswa Tingkat ${bulkGrade} (${targetCount} siswa)?\nNominal penarikan: Rp ${Number(bulkAmount).toLocaleString("id-ID")} per siswa.\n\nTindakan ini langsung memperbarui buku kas & otomatis mengirim WhatsApp mutasi ke wali murid!`;
                            if (!window.confirm(confirmText)) return;

                            setBulkProcessing(true);
                            const res = await onBulkWithdrawSavings(
                              bulkGrade,
                              Number(bulkAmount),
                              bulkNotes,
                              bulkAllowDebt,
                            );
                            setBulkProcessing(false);

                            if (res && res.success) {
                              setBulkFeedback({
                                success: true,
                                message: res.message,
                                successCount: res.successCount,
                                skippedCount: res.skippedCount,
                                totalDeducted: res.totalDeducted,
                              });
                            }
                          }}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {bulkProcessing ? (
                            "Memproses Penarikan..."
                          ) : (
                            <>
                              <ArrowDownLeft
                                size={13}
                                className="stroke-[2.5]"
                              />
                              <span>Eksekusi Tarik Massal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Search Box Input for NIS/Name inside Student Accounts / Cash Book Dashboard */}
              <div className="p-3 border-b border-slate-150 bg-slate-50/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Cari siswa berdasarkan Nama atau NIS..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      [X]
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={rosterClassFilter}
                    onChange={(e) => setRosterClassFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs cursor-pointer"
                  >
                    <option value="all">Semua Kelas</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsQrScannerOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-lg text-xs cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                    title="Scan Kartu QR Siswa Menggunakan Kamera"
                  >
                    <Camera size={14} />
                    <span className="hidden sm:inline">Scan QR</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase font-bold tracking-widest border-b border-slate-200 text-[9px]">
                      <th className="px-5 py-3">Nama Siswa</th>
                      <th className="px-5 py-3">NIS</th>
                      <th className="px-5 py-3 text-center">Kelas</th>
                      <th className="px-5 py-3 text-right">Saldo Tabungan</th>
                      <th className="px-5 py-3 text-center">Outstanding SPP</th>
                      <th className="px-5 py-3 text-right">
                        Aksi Administrasi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-slate-400 font-medium font-sans"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search
                              size={24}
                              className="text-slate-300 stroke-[1.5]"
                            />
                            <span>
                              Tidak ada siswa yang cocok dengan pencarian "
                              {studentSearch}"
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((student) => {
                        const sBills = bills
                          .filter((b) => b.studentId === student.id)
                          .sort((a, b) => {
                            const MONTH_MAP: Record<string, number> = {
                              Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
                              Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
                            };
                            const aScore = a.year * 12 + (MONTH_MAP[a.month] || 0);
                            const bScore = b.year * 12 + (MONTH_MAP[b.month] || 0);
                            return aScore - bScore;
                          });
                        const isMut = isMutationStudent(student);
                        const rawUnpaidCount = sBills.filter(
                          (b) => b.status === "unpaid" && (!isMut || checkIsBillActive(b, student.id)),
                        ).length;
                        const unpaidCount = Math.min(rawUnpaidCount, 12);
                        const nextUnpaidBill = sBills.find(
                          (b) => b.status === "unpaid" && (!isMut || checkIsBillActive(b, student.id)),
                        );

                        return (
                          <tr
                            key={student.id}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              selectedStudent?.id === student.id
                                ? "bg-indigo-50/10"
                                : ""
                            }`}
                          >
                            <td className="px-5 py-3.5 font-bold text-slate-800">
                              {student.name}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-505 text-[10px]">
                              {student.nis}
                            </td>
                            <td className="px-5 py-3.5 text-center font-semibold text-slate-600">
                              {student.class}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-emerald-600 font-mono text-[11px]">
                              Rp{" "}
                              {student.savingsBalance.toLocaleString("id-ID")}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {unpaidCount > 0 ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">
                                  {unpaidCount} Bulan Belum
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                                  Lunas Semua
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex gap-1.5 justify-end items-center">
                                {/* Pay SPP manual choices */}
                                {nextUnpaidBill ? (
                                  <div className="flex items-center gap-1.5">
                                    {/* Cash payment receipt (immediate, no pop-up dialog blocked inside ifframes) */}
                                    <button
                                      id={`admin-pay-manual-${student.id}`}
                                      disabled={processingBillId !== null}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setProcessingBillId(nextUnpaidBill.id);
                                        const resBill = await onPaySppManual(
                                          nextUnpaidBill.id,
                                        );
                                        setProcessingBillId(null);
                                        if (resBill) {
                                          setReceiptToPrint({
                                            type: "spp",
                                            detail: {
                                              ...nextUnpaidBill,
                                              status: "paid",
                                              paidAt: new Date().toISOString(),
                                              paymentMethod:
                                                "Manual Teller (Sekolah)",
                                              orderId:
                                                resBill.orderId ||
                                                `ORD-MANUAL-${Date.now()}`,
                                            },
                                            student: student,
                                          });
                                          setPrintId("print-receipt-section");
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm shadow-emerald-100 cursor-pointer flex items-center justify-center gap-1 min-w-[110px]"
                                      title="Selesaikan pembayaran dengan pembayaran tunai manual ke Teller"
                                    >
                                      {processingBillId === nextUnpaidBill.id ? (
                                        <RefreshCw
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <>
                                          <Check size={11} />
                                          <span>
                                            Bayar Manual (
                                            {nextUnpaidBill.month.slice(0, 3)})
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold px-2 text-center block">
                                    Bebas SPP
                                  </span>
                                )}

                                {/* Trigger Mutasi Drawer */}
                                <button
                                  id={`admin-mutasi-${student.id}`}
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setTxType("deposit");
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                >
                                  MUTASI
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <Pagination
                  currentPage={rosterPage}
                  totalItems={filteredStudents.length}
                  pageSize={rosterPageSize}
                  onPageChange={setRosterPage}
                  onPageSizeChange={setRosterPageSize}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Broadcast Event Tool */}
        {adminTab === "broadcast" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 text-xs"
          >
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <BellRing
                  size={16}
                  className="text-indigo-650 text-indigo-600"
                />{" "}
                Pusat Pengumuman Sekolah & Notifikasi Real-time
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Kirimkan pengumuman penting sekolah kepada siswa dan orang tua
                murid secara real-time. Pesan yang dikirim menggunakan teknologi
                SSE push, akan meluncur di layar portal siswa secara instan!
              </p>
            </div>

            <form
              onSubmit={handleBroadcastSubmit}
              className="flex flex-col gap-3 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Topik / Judul Pesan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Batas Akhir Pelunasan SPP Mei"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Kategori Tab (KBM, SPP, BK, Admin)
                  </label>
                  <select
                    value={notifCategory}
                    onChange={(e) => setNotifCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs text-slate-800 font-bold bg-white"
                  >
                    <option value="kbm">  KBM & Akademik</option>
                    <option value="pembayaran"> Pembayaran & Keuangan</option>
                    <option value="bk">   BK & Konseling</option>
                    <option value="admin"> Admin & Pengumuman Sekolah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Tipe Tampilan
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: "info", label: "Info" },
                      { key: "success", label: "Done" },
                      { key: "warning", label: "Penting" },
                      { key: "payment", label: "Bayar" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setNotifType(t.key as any)}
                        className={`py-2 text-[9.5px] font-extrabold rounded-lg border transition-all text-center cursor-pointer uppercase tracking-wider ${
                          notifType === t.key
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Isi Pesan Lengkap
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="cth: Assalamu'alaikum wr. wb. Diimbau kepada seluruh orang tua / wali murid kelas 7, 8, dan 9 SMP Maarif NU Pandaan..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 leading-relaxed text-xs text-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] text-slate-400 italic">
                  *Pemberitahuan akan disiarkan ke semua browser aktif.
                </span>
                <button
                  type="submit"
                  id="btn-broadcast-submit"
                  disabled={broadcastProcessing || !notifTitle || !notifMessage}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white font-bold rounded-lg transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {broadcastProcessing
                    ? "Mengirim..."
                    : "Siarkan Pengumuman Real-time! "}
                </button>
              </div>

              {broadcastSuccess && (
                <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-2 font-semibold">
                  <CheckCircle size={14} /> Pengumuman disiarkan secara instan!
                  Siswa akan menerima Toast Notifikasi di browser mereka.
                </div>
              )}
            </form>
          </motion.div>
        )}

        {adminTab === "buku_induk" && (
          <div className="w-full">
            <BukuIndukManagement
              students={students}
              onUpdateStudent={onUpdateStudent}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {adminTab === "spmb" && (
          <div className="w-full">
            <AdminSpmbManagement
              onRefresh={onRefresh}
              schoolIdentity={schoolIdentity}
              students={students}
            />
          </div>
        )}

        {adminTab === "pembayaran_lain" && (
          <div className="flex flex-col gap-6 w-full animate-fade-in text-left">
            {/* Header section with Create Button and filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Manajemen Pembayaran &amp; Iuran Lain-lain</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Daftar, buat, hapus, dan kelola tagihan insidental (Wisuda, Pramuka, Seragam, Kegiatan, dll.) serta pembayaran tunai teller.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintPdfMiscBills}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-indigo-600/10"
                  title="Cetak Laporan PDF sesuai kriteria filter yang aktif"
                >
                  <Printer size={15} />
                  <span>Cetak PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcelMiscBillsDirect}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-sky-600/10"
                  title="Ekspor Data Excel sesuai kriteria filter yang aktif"
                >
                  <Download size={15} />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateMiscOpen(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-slate-900/10"
                >
                  <Plus size={15} />
                  <span>Buat Tagihan Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPayMiscBulkOpen(true);
                    setPayMiscBulkTitleFilter("all");
                    setPayMiscBulkGradeFilter("all");
                    setPayMiscBulkClassFilter("all");
                    setPayMiscBulkSearch("");
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-emerald-600/10"
                >
                  <CheckSquare size={15} />
                  <span>Bayar Massal Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteMiscBulkOpen(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-red-600/10"
                >
                  <Trash2 size={15} />
                  <span>Hapus Massal</span>
                </button>
              </div>
            </div>

            {/* Filter and Search controls */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 flex flex-col gap-4 shadow-xs">
              {/* Main Search Input - Full width, long, spacious, clear text visibility */}
              <div className="relative w-full">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, NIS, kelas, atau judul tagihan (contoh: Wisuda, Seragam, Pramuka, Study Tour)..."
                  value={miscSearch}
                  onChange={(e) => {
                    setMiscSearch(e.target.value);
                    setMiscPage(1);
                  }}
                  className="w-full pl-11 pr-10 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl focus:outline-none transition-all shadow-inner"
                />
                {miscSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setMiscSearch("");
                      setMiscPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Filter Tingkat */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tingkat:</span>
                    <select
                      value={miscGradeFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMiscGradeFilter(val);
                        if (val !== "all" && miscClassFilter !== "all" && !miscClassFilter.startsWith(val)) {
                          setMiscClassFilter("all");
                        }
                        setMiscPage(1);
                      }}
                      className="px-3 py-2 text-xs font-bold border border-slate-200 focus:border-slate-400 bg-slate-50 focus:bg-white rounded-xl focus:outline-none transition-all text-slate-700 cursor-pointer shadow-xs"
                    >
                      <option value="all">Semua Tingkat</option>
                      {availableGrades.map((g) => (
                        <option key={g} value={g}>
                          Tingkat {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Kelas */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas:</span>
                    <select
                      value={miscClassFilter}
                      onChange={(e) => {
                        setMiscClassFilter(e.target.value);
                        setMiscPage(1);
                      }}
                      className="px-3 py-2 text-xs font-bold border border-slate-200 focus:border-slate-400 bg-slate-50 focus:bg-white rounded-xl focus:outline-none transition-all text-slate-700 cursor-pointer shadow-xs"
                    >
                      <option value="all">Semua Kelas</option>
                      {uniqueClasses
                        .filter((cls) => miscGradeFilter === "all" || cls.startsWith(miscGradeFilter))
                        .map((cls) => (
                          <option key={cls} value={cls}>
                            Kelas {cls}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Filter Tipe Tagihan */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe:</span>
                    <select
                      value={miscTypeFilter}
                      onChange={(e) => {
                        setMiscTypeFilter(e.target.value as any);
                        setMiscPage(1);
                      }}
                      className="px-3 py-2 text-xs font-bold border border-slate-200 focus:border-slate-400 bg-slate-50 focus:bg-white rounded-xl focus:outline-none transition-all text-slate-700 cursor-pointer shadow-xs"
                    >
                      <option value="all">Semua Tipe</option>
                      <option value="once">Sekali Bayar</option>
                      <option value="monthly">Tagihan Bulanan</option>
                    </select>
                  </div>

                  {/* Filter Bulan (jika tipe bukan once) */}
                  {miscTypeFilter !== "once" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulan:</span>
                      <select
                        value={miscMonthFilter}
                        onChange={(e) => {
                          setMiscMonthFilter(e.target.value);
                          setMiscPage(1);
                        }}
                        className="px-3 py-2 text-xs font-bold border border-slate-200 focus:border-slate-400 bg-slate-50 focus:bg-white rounded-xl focus:outline-none transition-all text-slate-700 cursor-pointer shadow-xs"
                      >
                        <option value="all">Semua Bulan</option>
                        {ACADEMIC_MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMiscStatusFilter("all");
                        setMiscPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        miscStatusFilter === "all"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMiscStatusFilter("unpaid");
                        setMiscPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        miscStatusFilter === "unpaid"
                          ? "bg-white text-orange-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      Belum Lunas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMiscStatusFilter("paid");
                        setMiscPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        miscStatusFilter === "paid"
                          ? "bg-white text-emerald-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      Lunas
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Statistics and Quick Print Actions Strip */}
              {(() => {
                const filteredAll = miscBills.filter((bill) => {
                  const s = students.find((st) => st.id === bill.studentId);
                  if (miscGradeFilter !== "all" && (!s || !s.class || !s.class.startsWith(miscGradeFilter))) return false;
                  if (miscClassFilter !== "all" && (!s || s.class !== miscClassFilter)) return false;
                  if (miscTypeFilter === "once" && bill.isMonthly) return false;
                  if (miscTypeFilter === "monthly" && !bill.isMonthly) return false;
                  if (miscMonthFilter !== "all" && bill.month !== miscMonthFilter) return false;
                  const matchText =
                    bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
                    bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
                    (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                    (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                    (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase());
                  if (!matchText) return false;
                  if (miscStatusFilter === "unpaid") return bill.status === "unpaid" || bill.status === "pending";
                  if (miscStatusFilter === "paid") return bill.status === "paid";
                  return true;
                });

                const totalTarget = filteredAll.reduce((sum, b) => sum + (b.amount || 0), 0);
                const paidList = filteredAll.filter((b) => b.status === "paid");
                const unpaidList = filteredAll.filter((b) => b.status !== "paid");
                const totalPaid = paidList.reduce((sum, b) => sum + (b.amount || 0), 0);
                const totalUnpaid = unpaidList.reduce((sum, b) => sum + (b.amount || 0), 0);
                const pct = totalTarget > 0 ? Math.round((totalPaid / totalTarget) * 100) : 0;

                return (
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-150">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-slate-500">
                        Hasil Filter: <b className="text-slate-900 font-mono">{filteredAll.length}</b> tagihan
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">
                        Total Tagihan: <b className="text-slate-900 font-mono">Rp {totalTarget.toLocaleString("id-ID")}</b>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-emerald-700">
                        Lunas ({paidList.length}): <b className="font-mono">Rp {totalPaid.toLocaleString("id-ID")}</b>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-700">
                        Tunggakan ({unpaidList.length}): <b className="font-mono">Rp {totalUnpaid.toLocaleString("id-ID")}</b>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-indigo-700 font-bold font-mono">
                        Realisasi: {pct}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={handlePrintPdfMiscBills}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shadow-xs"
                        title="Cetak PDF Rekapitulasi Tagihan sesuai filter"
                      >
                        <Printer size={13} />
                        <span>Cetak PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportExcelMiscBillsDirect}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shadow-xs"
                        title="Ekspor ke spreadsheet Excel"
                      >
                        <Download size={13} />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* List and Table */}
            <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                      {(() => {
                        const filteredList = miscBills.filter(bill => {
                          const s = students.find(st => st.id === bill.studentId);
                          if (miscGradeFilter !== "all" && (!s || !s.class || !s.class.startsWith(miscGradeFilter))) return false;
                          if (miscClassFilter !== "all" && (!s || s.class !== miscClassFilter)) return false;
                          if (miscTypeFilter === "once" && bill.isMonthly) return false;
                          if (miscTypeFilter === "monthly" && !bill.isMonthly) return false;
                          if (miscMonthFilter !== "all" && bill.month !== miscMonthFilter) return false;
                          const matchText = (
                            bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
                            bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
                            (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                            (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                            (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase())
                          );
                          if (!matchText) return false;
                          if (miscStatusFilter === "unpaid") return bill.status === "unpaid" || bill.status === "pending";
                          if (miscStatusFilter === "paid") return bill.status === "paid";
                          return true;
                        });
                        const visibleUnpaid = filteredList.filter(b => b.status !== "paid");
                        const isAllSelected = visibleUnpaid.length > 0 && visibleUnpaid.every(b => selectedMiscBillIds.includes(b.id));

                        return (
                          <th className="px-4 py-3 w-10 text-center">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              checked={isAllSelected}
                              onChange={(e) => {
                                const unpaidIds = visibleUnpaid.map(b => b.id);
                                if (e.target.checked) {
                                  setSelectedMiscBillIds(prev => Array.from(new Set([...prev, ...unpaidIds])));
                                } else {
                                  setSelectedMiscBillIds(prev => prev.filter(id => !unpaidIds.includes(id)));
                                }
                              }}
                              title="Pilih semua tagihan belum lunas yang tampil"
                            />
                          </th>
                        );
                      })()}
                      <th className="px-5 py-3">ID / Siswa</th>
                      <th className="px-5 py-3">Tagihan &amp; Deskripsi</th>
                      <th className="px-5 py-3">Nominal</th>
                      <th className="px-5 py-3">Status / Pembayaran</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(() => {
                      const filtered = miscBills.filter(bill => {
                        const s = students.find(st => st.id === bill.studentId);
                        
                        if (miscGradeFilter !== "all") {
                          if (!s || !s.class || !s.class.startsWith(miscGradeFilter)) return false;
                        }

                        if (miscClassFilter !== "all") {
                          if (!s || s.class !== miscClassFilter) return false;
                        }

                        if (miscTypeFilter === "once" && bill.isMonthly) return false;
                        if (miscTypeFilter === "monthly" && !bill.isMonthly) return false;
                        if (miscMonthFilter !== "all" && bill.month !== miscMonthFilter) return false;

                        const matchText = (
                          bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
                          bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
                          (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                          (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                          (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase())
                        );
                        if (!matchText) return false;

                        if (miscStatusFilter === "unpaid") return bill.status === "unpaid" || bill.status === "pending";
                        if (miscStatusFilter === "paid") return bill.status === "paid";
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-400">
                              Tidak ada data tagihan pembayaran lain-lain yang cocok dengan kriteria pencarian Anda.
                            </td>
                          </tr>
                        );
                      }

                      const start = (miscPage - 1) * miscPageSize;
                      const paginatedMisc = filtered.slice(start, start + miscPageSize);
                      return paginatedMisc.map(bill => {
                        const s = students.find(st => st.id === bill.studentId);
                        const isSelected = selectedMiscBillIds.includes(bill.id);
                        return (
                          <tr key={bill.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}>
                            <td className="px-4 py-4 text-center">
                              {bill.status !== "paid" ? (
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMiscBillIds(prev => [...prev, bill.id]);
                                    } else {
                                      setSelectedMiscBillIds(prev => prev.filter(id => id !== bill.id));
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-slate-300 text-xs">&mdash;</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-800">{s?.name || "Siswa Tidak Ditemukan"}</span>
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5">NIS: {s?.nis || "-"} &bull; Kelas: {s?.class || "-"}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800">{bill.title}</span>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {bill.isMonthly ? (
                                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold text-[9px] uppercase tracking-wide">
                                      Bulanan {bill.month ? `- ${bill.month}` : ''}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded font-semibold text-[9px] uppercase tracking-wide">
                                      Sekali Bayar
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">Ref ID: {bill.id.toUpperCase()}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono font-bold text-slate-800">Rp {bill.amount.toLocaleString("id-ID")}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col items-start gap-1">
                                {bill.status === "paid" ? (
                                  <>
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-md font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle size={10} /> Lunas
                                    </span>
                                    {bill.paidAt && (
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        Metode: <strong className="uppercase">{bill.paymentMethod || "MANUAL"}</strong> &bull; {new Date(bill.paidAt).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"})}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-150 rounded-md font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={10} /> {bill.status === "pending" ? "Belum Lunas (Pending)" : "Belum Lunas"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {bill.status === "unpaid" || bill.status === "pending" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handlePayMiscManualLocal(bill.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <CheckCircle size={11} />
                                      <span>Bayar Tunai</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditMisc(bill)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg border border-slate-200 hover:border-indigo-200 bg-white hover:bg-indigo-50 transition-all cursor-pointer"
                                      title="Edit Detail Tagihan"
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMiscBillLocal(bill.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 transition-all cursor-pointer"
                                      title="Hapus Tagihan"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditMisc(bill)}
                                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-250 hover:border-indigo-350 font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                      title="Revisi Judul / Detail"
                                    >
                                      <Edit size={11} />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => s && setReceiptToPrint({ type: "misc", detail: bill, student: s })}
                                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Printer size={11} />
                                      <span>Cetak Bukti</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelMiscPaymentLocal(bill.id)}
                                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                      title="Batalkan Pembayaran"
                                    >
                                      <XCircle size={11} />
                                      <span>Batalkan</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                {(() => {
                  const filteredCount = miscBills.filter(bill => {
                    const s = students.find(st => st.id === bill.studentId);
                    if (miscGradeFilter !== "all" && (!s || !s.class || !s.class.startsWith(miscGradeFilter))) return false;
                    if (miscClassFilter !== "all" && (!s || s.class !== miscClassFilter)) return false;
                    const matchText = (
                      bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
                      bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
                      (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                      (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                      (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase())
                    );
                    if (!matchText) return false;
                    if (miscStatusFilter === "unpaid") return bill.status === "unpaid" || bill.status === "pending";
                    if (miscStatusFilter === "paid") return bill.status === "paid";
                    return true;
                  }).length;
                  return (
                    <Pagination
                      currentPage={miscPage}
                      totalItems={filteredCount}
                      pageSize={miscPageSize}
                      onPageChange={setMiscPage}
                      onPageSizeChange={setMiscPageSize}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Sticky Batch Pay Action Bar */}
            {selectedMiscBillIds.length > 0 && (
              <div className="sticky bottom-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30 animate-slide-up border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/30">
                    {selectedMiscBillIds.length}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">
                      {selectedMiscBillIds.length} Tagihan Terpilih
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Total Nominal:{" "}
                      <strong className="text-emerald-400 font-mono text-xs">
                        Rp{" "}
                        {miscBills
                          .filter(b => selectedMiscBillIds.includes(b.id))
                          .reduce((sum, b) => sum + b.amount, 0)
                          .toLocaleString("id-ID")}
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMiscBillIds([])}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingPayMiscBulk}
                    onClick={() => handlePayMiscBulk(selectedMiscBillIds)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    <span>{isSubmittingPayMiscBulk ? "Memproses..." : `Bayar Lunas (${selectedMiscBillIds.length} Siswa)`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pembayaran Massal Bill Modal Overlay */}
            {isPayMiscBulkOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans">
                <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-150 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <CheckSquare size={18} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">Pembayaran Massal Tagihan Lain-lain</h4>
                        <p className="text-[10px] text-slate-400">Pilih tagihan siswa yang akan dilunaskan sekaligus oleh Teller</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPayMiscBulkOpen(false)}
                      className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Modal Body & Filters */}
                  <div className="p-6 flex flex-col gap-4 overflow-y-auto text-xs">
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Judul Tagihan:</label>
                        <select
                          value={payMiscBulkTitleFilter}
                          onChange={(e) => setPayMiscBulkTitleFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-400"
                        >
                          <option value="all">-- Semua Jenis Tagihan --</option>
                          {Array.from(new Set(miscBills.map(b => b.title))).filter(Boolean).map(title => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tingkat Kelas:</label>
                        <select
                          value={payMiscBulkGradeFilter}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPayMiscBulkGradeFilter(val);
                            if (val !== "all" && payMiscBulkClassFilter !== "all" && !payMiscBulkClassFilter.startsWith(val)) {
                              setPayMiscBulkClassFilter("all");
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-400"
                        >
                          <option value="all">-- Semua Tingkat --</option>
                          {availableGrades.map(g => (
                            <option key={g} value={g}>
                              Tingkat {g}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kelas Target:</label>
                        <select
                          value={payMiscBulkClassFilter}
                          onChange={(e) => setPayMiscBulkClassFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-slate-400"
                        >
                          <option value="all">-- Semua Kelas --</option>
                          {uniqueClasses
                            .filter(cls => payMiscBulkGradeFilter === "all" || cls.startsWith(payMiscBulkGradeFilter))
                            .map(cls => (
                              <option key={cls} value={cls}>
                                Kelas {cls}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Search Candidate */}
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari siswa berdasarkan nama, NIS, kelas, atau judul tagihan..."
                        value={payMiscBulkSearch}
                        onChange={(e) => setPayMiscBulkSearch(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl focus:outline-none bg-slate-50 focus:bg-white transition-all shadow-inner"
                      />
                      {payMiscBulkSearch && (
                        <button
                          type="button"
                          onClick={() => setPayMiscBulkSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                          title="Hapus filter"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Candidate Unpaid List */}
                    {(() => {
                      const candidateUnpaid = miscBills.filter(bill => {
                        if (bill.status === "paid") return false;
                        if (payMiscBulkTitleFilter !== "all" && bill.title !== payMiscBulkTitleFilter) return false;
                        const s = students.find(st => st.id === bill.studentId);
                        if (!s) return false;
                        if (payMiscBulkGradeFilter !== "all" && (!s.class || !s.class.startsWith(payMiscBulkGradeFilter))) return false;
                        if (payMiscBulkClassFilter !== "all" && s.class !== payMiscBulkClassFilter) return false;
                        if (payMiscBulkSearch.trim()) {
                          const q = payMiscBulkSearch.toLowerCase();
                          const matchName = s.name.toLowerCase().includes(q);
                          const matchNis = s.nis.toLowerCase().includes(q);
                          const matchClass = s.class.toLowerCase().includes(q);
                          const matchTitle = bill.title.toLowerCase().includes(q);
                          if (!matchName && !matchNis && !matchClass && !matchTitle) return false;
                        }
                        return true;
                      });

                      const candidateIds = candidateUnpaid.map(b => b.id);
                      const isAllCandidateSelected = candidateIds.length > 0 && candidateIds.every(id => selectedMiscBillIds.includes(id));

                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                            <span>Daftar Tagihan Belum Lunas ({candidateUnpaid.length} Tagihan)</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isAllCandidateSelected) {
                                  setSelectedMiscBillIds(prev => prev.filter(id => !candidateIds.includes(id)));
                                } else {
                                  setSelectedMiscBillIds(prev => Array.from(new Set([...prev, ...candidateIds])));
                                }
                              }}
                              className="text-emerald-700 hover:text-emerald-900 font-extrabold cursor-pointer"
                            >
                              {isAllCandidateSelected ? "Batal Pilih Semua" : `Pilih Semua (${candidateUnpaid.length})`}
                            </button>
                          </div>

                          {candidateUnpaid.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              Tidak ada tagihan belum lunas yang sesuai dengan filter di atas.
                            </div>
                          ) : (
                            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                              {candidateUnpaid.map(bill => {
                                const s = students.find(st => st.id === bill.studentId);
                                const isChecked = selectedMiscBillIds.includes(bill.id);
                                return (
                                  <label
                                    key={bill.id}
                                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                                      isChecked ? "bg-emerald-50/50" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedMiscBillIds(prev => [...prev, bill.id]);
                                          } else {
                                            setSelectedMiscBillIds(prev => prev.filter(id => id !== bill.id));
                                          }
                                        }}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-extrabold text-slate-800">{s?.name || "Siswa"}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          NIS: {s?.nis || "-"} &bull; Kelas: {s?.class || "-"} &bull; Tagihan: <strong className="text-slate-700">{bill.title}</strong>
                                        </span>
                                      </div>
                                    </div>
                                    <span className="font-mono font-bold text-slate-800 text-xs">
                                      Rp {bill.amount.toLocaleString("id-ID")}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                    <div className="text-left w-full sm:w-auto">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Ringkasan Pilihan:</span>
                      <span className="text-xs font-black text-slate-800">
                        {selectedMiscBillIds.length} Siswa Terpilih &bull; Total:{" "}
                        <span className="text-emerald-600 font-mono">
                          Rp{" "}
                          {miscBills
                            .filter(b => selectedMiscBillIds.includes(b.id))
                            .reduce((sum, b) => sum + b.amount, 0)
                            .toLocaleString("id-ID")}
                        </span>
                      </span>
                    </div>

                    <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setIsPayMiscBulkOpen(false)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingPayMiscBulk || selectedMiscBillIds.length === 0}
                        onClick={() => handlePayMiscBulk(selectedMiscBillIds)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <CheckSquare size={15} />
                        <span>{isSubmittingPayMiscBulk ? "Memproses..." : `Proses Bayar Lunas (${selectedMiscBillIds.length})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Bill Modal Overlay */}
            {isCreateMiscOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans">
                <div className="bg-white rounded-2xl w-full max-w-md border border-slate-150 shadow-2xl overflow-hidden animate-slide-up">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                    <h4 className="font-extrabold text-slate-800 text-sm">Buat Tagihan Iuran Baru</h4>
                    <button
                      type="button"
                      onClick={() => setIsCreateMiscOpen(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                  <form onSubmit={handleCreateMiscBill} className="p-5 flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="font-bold text-slate-700">Target Distribusi Tagihan:</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("all")}
                          className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Seluruh Siswa
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("grade")}
                          className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "grade" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Per Tingkat
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("class")}
                          className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "class" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Per Kelas
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("single")}
                          className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "single" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Siswa Tunggal
                        </button>
                      </div>
                    </div>

                    {miscTargetType === "grade" && (
                      <div className="flex flex-col gap-1.5 animate-fade-in text-left">
                        <label className="font-bold text-slate-700">Pilih Tingkat Kelas Target:</label>
                        <select
                          value={miscTargetGrade}
                          onChange={(e) => setMiscTargetGrade(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white focus:border-slate-400 focus:outline-none rounded-xl"
                          required
                        >
                          <option value="">-- Pilih Tingkat Kelas --</option>
                          {availableGrades.map((g) => (
                            <option key={g} value={g}>
                              Tingkat {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {miscTargetType === "class" && (
                      <div className="flex flex-col gap-1.5 animate-fade-in">
                        <label className="font-bold text-slate-700">Nama Kelas Target:</label>
                        <input
                          type="text"
                          placeholder="Contoh: VII-A, VIII-B, IX-C"
                          value={miscTargetClass}
                          onChange={(e) => setMiscTargetClass(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl"
                          required
                        />
                      </div>
                    )}

                    {miscTargetType === "single" && (
                      <div className="flex flex-col gap-1.5 animate-fade-in text-left">
                        <label className="font-bold text-slate-700">Pilih Siswa Target:</label>
                        <div className="flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                            Pencarian Siswa:
                          </span>
                          <input
                            type="text"
                            placeholder="Ketik nama / NIS / kelas untuk menyaring..."
                            value={miscStudentSearchQuery}
                            onChange={(e) => setMiscStudentSearchQuery(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-lg"
                          />
                          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                            Menampilkan {
                              students.filter(st => {
                                const q = miscStudentSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                return (
                                  st.name.toLowerCase().includes(q) ||
                                  st.nis.toLowerCase().includes(q) ||
                                  st.class.toLowerCase().includes(q)
                                );
                              }).length
                            } dari {students.length} siswa
                          </span>
                        </div>
                        <select
                          value={miscTargetStudentId}
                          onChange={(e) => setMiscTargetStudentId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white focus:border-slate-400 focus:outline-none rounded-xl"
                          required
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {students
                            .filter(st => {
                              const q = miscStudentSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                st.name.toLowerCase().includes(q) ||
                                st.nis.toLowerCase().includes(q) ||
                                st.class.toLowerCase().includes(q)
                              );
                            })
                            .map(st => (
                              <option key={st.id} value={st.id}>
                                {st.name} (NIS: {st.nis} - Kelas {st.class})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Tipe Frekuensi Tagihan: Sekali Bayar vs Bulanan */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Tipe Frekuensi Tagihan:</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setMiscBillingType("once");
                            setMiscSelectedMonths([]);
                          }}
                          className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscBillingType === "once"
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Sekali Bayar (Insidental)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiscBillingType("monthly")}
                          className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            miscBillingType === "monthly"
                              ? "bg-purple-700 text-white shadow-2xs font-extrabold"
                              : "text-slate-500 hover:text-purple-700"
                          }`}
                        >
                          <Calendar size={13} />
                          <span>Tagihan Bulanan</span>
                        </button>
                      </div>
                    </div>

                    {/* Jika Tagihan Bulanan: Opsi Pilih Bulan */}
                    {miscBillingType === "monthly" && (
                      <div className="flex flex-col gap-2 p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-left">
                        <div className="flex flex-wrap justify-between items-center gap-1">
                          <label className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                            <Calendar size={13} className="text-purple-600" />
                            <span>Pilih Bulan Tagihan ({miscSelectedMonths.length} bulan):</span>
                          </label>
                          <div className="flex items-center gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setMiscSelectedMonths([...ACADEMIC_MONTHS])}
                              className="text-purple-700 hover:underline font-bold px-1"
                            >
                              Semua
                            </button>
                            <span className="text-purple-300">|</span>
                            <button
                              type="button"
                              onClick={() => setMiscSelectedMonths(["Juli", "Agustus", "September", "Oktober", "November", "Desember"])}
                              className="text-purple-700 hover:underline font-bold px-1"
                            >
                              Sem 1
                            </button>
                            <span className="text-purple-300">|</span>
                            <button
                              type="button"
                              onClick={() => setMiscSelectedMonths(["Januari", "Februari", "Maret", "April", "Mei", "Juni"])}
                              className="text-purple-700 hover:underline font-bold px-1"
                            >
                              Sem 2
                            </button>
                            <span className="text-purple-300">|</span>
                            <button
                              type="button"
                              onClick={() => setMiscSelectedMonths([])}
                              className="text-red-600 hover:underline font-bold px-1"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mt-1">
                          {ACADEMIC_MONTHS.map((m) => {
                            const isSelected = miscSelectedMonths.includes(m);
                            return (
                              <button
                                type="button"
                                key={m}
                                onClick={() => {
                                  if (isSelected) {
                                    setMiscSelectedMonths(prev => prev.filter(x => x !== m));
                                  } else {
                                    setMiscSelectedMonths(prev => [...prev, m]);
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  isSelected
                                    ? "bg-purple-700 text-white border-purple-700 shadow-2xs"
                                    : "bg-white text-slate-700 border-purple-150 hover:bg-purple-100/50"
                                }`}
                              >
                                <span>{m}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-purple-700 mt-0.5 leading-snug">
                          * Setiap bulan yang dicentang akan otomatis menjadi tagihan terpisah dengan label bulan pada judul.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Nama / Judul Iuran:</label>
                      <input
                        type="text"
                        placeholder={miscBillingType === "monthly" ? "Contoh: Uang Katering, Spp Les, Antar Jemput" : "Contoh: Dana Kemanusiaan, Iuran Wisuda 2026, Seragam Olahraga"}
                        value={miscTitle}
                        onChange={(e) => setMiscTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Nominal Tagihan (Rupiah):</label>
                      <input
                        type="number"
                        placeholder="Contoh: 150000"
                        value={miscAmount}
                        onChange={(e) => setMiscAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="flex gap-2.5 mt-4 border-t border-slate-150 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreateMiscOpen(false)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingMisc}
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        {isSubmittingMisc ? "Menyimpan..." : "Buat Tagihan"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Hapus Massal Bill Modal Overlay */}
            {isDeleteMiscBulkOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans">
                <div className="bg-white rounded-2xl w-full max-w-md border border-slate-150 shadow-2xl overflow-hidden animate-slide-up">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <Trash2 size={16} className="text-red-600" />
                      <span>Hapus Massal Tagihan Lain-lain</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteMiscBulkOpen(false);
                        setDeleteMiscBulkTitle("");
                      }}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                  <form onSubmit={handleDeleteMiscBulk} className="p-5 flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Pilih Judul Tagihan yang Akan Dihapus:</label>
                      <select
                        value={deleteMiscBulkTitle}
                        onChange={(e) => setDeleteMiscBulkTitle(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 bg-white focus:border-slate-400 focus:outline-none rounded-xl text-xs"
                        required
                      >
                        <option value="">-- Pilih Judul Tagihan --</option>
                        {Array.from(new Set((miscBills || []).map(b => b.title))).filter(Boolean).map(title => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {deleteMiscBulkTitle && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col gap-2.5 animate-fade-in text-left">
                        <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">Estimasi Dampak Penghapusan:</span>
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="block text-slate-500 font-bold">Total Tagihan</span>
                            <span className="block text-sm font-black text-slate-800 mt-1">
                              {(miscBills || []).filter(b => b.title === deleteMiscBulkTitle).length}
                            </span>
                          </div>
                          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-700">
                            <span className="block font-bold">Akan Dihapus</span>
                            <span className="block text-sm font-black mt-1">
                              {(miscBills || []).filter(b => b.title === deleteMiscBulkTitle && b.status !== "paid").length}
                            </span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-700">
                            <span className="block font-bold">Tetap (Lunas)</span>
                            <span className="block text-sm font-black mt-1">
                              {(miscBills || []).filter(b => b.title === deleteMiscBulkTitle && b.status === "paid").length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 flex gap-3 text-red-700">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 leading-relaxed text-[10.5px]">
                        <strong className="font-bold text-red-800">Peringatan Penghapusan Permanen:</strong>
                        Tindakan ini akan menghapus tagihan terpilih dari semua siswa yang belum melunasinya secara permanen. Data tagihan yang sudah lunas tidak akan dihapus untuk menjaga keakuratan laporan kas masuk sekolah.
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-2 border-t border-slate-150 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeleteMiscBulkOpen(false);
                          setDeleteMiscBulkTitle("");
                        }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isDeletingMiscBulk || !deleteMiscBulkTitle}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm shadow-red-200"
                      >
                        {isDeletingMiscBulk ? "Menghapus..." : "Ya, Hapus Massal"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit/Revision Bill Modal Overlay */}
            {isEditMiscOpen && editingMiscBill && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans text-left">
                <div className="bg-white rounded-2xl w-full max-w-md border border-slate-150 shadow-2xl overflow-hidden animate-slide-up">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Revisi Detail Tagihan</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Ref: {editingMiscBill.id.toUpperCase()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditMiscOpen(false);
                        setEditingMiscBill(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                  <form onSubmit={handleUpdateMiscBill} className="p-5 flex flex-col gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-600">
                      <div>
                        <strong>Siswa:</strong> {students.find(s => s.id === editingMiscBill.studentId)?.name || "Siswa"}
                      </div>
                      <div>
                        <strong>Status Pembayaran:</strong>{" "}
                        {editingMiscBill.status === "paid" ? (
                          <span className="text-emerald-600 font-bold uppercase text-[9px] px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-150">Lunas</span>
                        ) : (
                          <span className="text-orange-600 font-bold uppercase text-[9px] px-1.5 py-0.5 bg-orange-50 rounded border border-orange-150">Belum Lunas</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Tipe Frekuensi:</label>
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="editIsMonthly"
                            checked={!editMiscIsMonthly}
                            onChange={() => setEditMiscIsMonthly(false)}
                            className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>Sekali Bayar</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-purple-700">
                          <input
                            type="radio"
                            name="editIsMonthly"
                            checked={editMiscIsMonthly}
                            onChange={() => setEditMiscIsMonthly(true)}
                            className="text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span>Tagihan Bulanan</span>
                        </label>
                      </div>
                    </div>

                    {editMiscIsMonthly && (
                      <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-slate-700">Bulan Tagihan:</label>
                        <select
                          value={editMiscMonth}
                          onChange={(e) => setEditMiscMonth(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white focus:border-purple-500 focus:outline-none rounded-xl text-xs font-bold"
                        >
                          <option value="">-- Pilih Bulan --</option>
                          {ACADEMIC_MONTHS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Nama / Judul Iuran:</label>
                      <input
                        type="text"
                        placeholder="Contoh: Dana Kemanusiaan, Iuran Wisuda 2026, Seragam Olahraga"
                        value={editMiscTitle}
                        onChange={(e) => setEditMiscTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Nominal Tagihan (Rupiah):</label>
                      <input
                        type="number"
                        placeholder="Contoh: 150000"
                        value={editMiscAmount}
                        onChange={(e) => setEditMiscAmount(e.target.value)}
                        disabled={editingMiscBill.status === "paid" && !updateAllWithSameTitle}
                        className={`w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl font-mono font-bold ${(editingMiscBill.status === "paid" && !updateAllWithSameTitle) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                        required
                      />
                      {editingMiscBill.status === "paid" && !updateAllWithSameTitle && (
                        <p className="text-[10px] text-orange-600 leading-tight">
                          * Nominal tidak dapat diedit karena tagihan ini sudah lunas. Jika ingin mengubah nominal, silakan batalkan pembayaran terlebih dahulu atau aktifkan opsi Revisi Massal di bawah.
                        </p>
                      )}
                    </div>

                    <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 flex flex-col gap-2 mt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={updateAllWithSameTitle}
                          onChange={(e) => setUpdateAllWithSameTitle(e.target.checked)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5"
                        />
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="font-bold text-slate-800 text-[11px]">Revisi Massal (Seluruh Siswa)</span>
                          <span className="text-[10px] text-slate-500 leading-tight">
                            Terapkan perubahan ini ke semua siswa yang memiliki tagihan dengan judul <strong className="text-indigo-700">"{editingMiscBill.title}"</strong>.
                          </span>
                        </div>
                      </label>
                      {updateAllWithSameTitle && (
                        <div className="text-[9.5px] text-indigo-600 border-t border-indigo-150 pt-1.5 leading-tight font-medium">
                          <strong>Catatan Keamanan Kas:</strong> Nominal tagihan siswa yang sudah lunas tidak akan terpengaruh demi ketepatan pencatatan bendahara. Namun, judul tagihan mereka akan tetap disesuaikan agar seragam.
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 mt-4 border-t border-slate-150 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMiscOpen(false);
                          setEditingMiscBill(null);
                        }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-center"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingMisc}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                      >
                        {isUpdatingMisc ? "Menyimpan..." : "Simpan Revisi"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Config Status Viewer */}
        {adminTab === "config" && (
          <div className="flex flex-col gap-6 w-full">
            {/* Firebase Database Sync Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-5 text-xs text-left relative overflow-hidden"
            >
              {/* Decorative subtle background mesh */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <UploadCloud className="text-emerald-400" size={18} /> Cloud
                    Database-Sync Integration (MongoDB Atlas)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-medium">
                    Sistem ini terintegrasi langsung dengan database awan
                    MongoDB Atlas Cluster Anda agar setiap perubahan data
                    tersimpan secara permanen.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Status Gateway:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                      systemStatus?.firestore?.status?.includes("Synced") ||
                      systemStatus?.firestore?.status ===
                        "Synced (Loaded from MongoDB)"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : systemStatus?.firestore?.status === "Connecting..." ||
                            systemStatus?.firestore?.status?.includes("Syncing")
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse"
                          : "bg-red-500/10 border border-red-500/30 text-red-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        systemStatus?.firestore?.status?.includes("Synced") ||
                        systemStatus?.firestore?.status ===
                          "Synced (Loaded from MongoDB)"
                          ? "bg-emerald-450"
                          : systemStatus?.firestore?.status ===
                                "Connecting..." ||
                              systemStatus?.firestore?.status?.includes(
                                "Syncing",
                              )
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                    ></span>
                    {systemStatus?.firestore?.status ||
                      "Sedang memuat status..."}
                  </span>
                </div>
              </div>

              {syncFeedback && (
                <div
                  className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                    syncFeedback.includes("sukses")
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border border-red-500/20 text-red-300"
                  }`}
                >
                  <span>{syncFeedback.includes("sukses") ? "[OK]" : "[PERINGATAN]"}</span>
                  <span>{syncFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    DATABASE ENGINE
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 truncate font-semibold">
                    MongoDB Atlas Cluster (vSrv)
                  </span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    CLUSTER HOSTNAME
                  </span>
                  <span className="font-mono text-[11px] text-slate-200 truncate font-semibold">
                    cluster0.0hekxl2.mongodb.net
                  </span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TERAKHIR DISINKRONKAN (WIB)
                  </span>
                  <span className="font-mono text-[11px] text-slate-200 font-semibold">
                    {systemStatus?.firestore?.lastSync
                      ? new Date(
                          systemStatus.firestore.lastSync,
                        ).toLocaleString("id-ID")
                      : "Belum di sinkronisasikan"}
                  </span>
                </div>
              </div>

              {systemStatus?.firestore?.error && (
                <div className="p-4 bg-red-950/40 border border-red-900/30 rounded-lg flex flex-col gap-2 text-red-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-400" /> DETAIL
                    OPERASIONAL & PETUNJUK SOLUSI:
                  </span>
                  <p className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-red-200 select-all font-semibold">
                    {systemStatus.firestore.error}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
                    
                  </span>
                  <div className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    Setiap pembaruan data murid, pembayaran tagihan SPP,
                    transaksi tabungan, maupun jurnal absensi,{" "}
                    <strong>otomatis langsung tersinkronkan</strong> ke database
                    awan MongoDB secara real-time. Jika Anda mendapati basis
                    data awan kosong, tekan tombol sinkronkan untuk memigrasikan
                    database memori server secara instan.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isSyncingLive}
                  className="flex items-center justify-center gap-2 self-end sm:self-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shrink-0 select-none"
                >
                  {isSyncingLive ? (
                    <>
                      <RefreshCw
                        size={12}
                        className="animate-spin text-white animate-normal"
                      />{" "}
                      Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} className="text-white" /> Sinkronkan
                      Sekarang  
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* SPP Nominal Rates Configurations per Level */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Settings size={16} className="text-emerald-600" /> Pengaturan
                  Nominal Pembayaran SPP Per Tingkat (Kelas 7, 8, & 9)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Tentukan nilai nominal iuran bulanan wajib SPP bagi siswa di
                  setiap jenjang tingkatan kelas secara mandiri. Perubahan akan
                  disimpan di server memory secara instan.
                </p>
              </div>

              <form
                onSubmit={handleSaveSppRates}
                className="flex flex-col gap-4"
              >
                {sppConfigMsg && (
                  <div
                    className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                      sppConfigMsg.type === "success"
                        ? "bg-emerald-50 border border-emerald-205 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {sppConfigMsg.type === "success" ? (
                      <Check size={14} className="text-emerald-700" />
                    ) : (
                      <AlertCircle size={14} className="text-red-700" />
                    )}
                    {sppConfigMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      SPP KELAS 7 (Tingkat I)
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={sppConfigRates.grade7}
                        onChange={(e) =>
                          setSppConfigRates({
                            ...sppConfigRates,
                            grade7: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      SPP KELAS 8 (Tingkat II)
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={sppConfigRates.grade8}
                        onChange={(e) =>
                          setSppConfigRates({
                            ...sppConfigRates,
                            grade8: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      SPP KELAS 9 (Tingkat III)
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={sppConfigRates.grade9}
                        onChange={(e) =>
                          setSppConfigRates({
                            ...sppConfigRates,
                            grade9: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-1 py-1 text-slate-600 select-none">
                  <input
                    type="checkbox"
                    id="update-existing-unpaid-spp-chk"
                    checked={updateExistingUnpaidBills}
                    onChange={(e) =>
                      setUpdateExistingUnpaidBills(e.target.checked)
                    }
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label
                    htmlFor="update-existing-unpaid-spp-chk"
                    className="text-[11px] font-medium leading-normal cursor-pointer text-slate-500"
                  >
                    Terapkan & sesuaikan nominal baru ke semua tagihan siswa
                    yang berstatus <strong>Belum Lunas (Unpaid)</strong> saat
                    ini.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSppRates}
                  className="w-full md:w-auto self-end px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg uppercase tracking-wider text-[11px] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSppRates ? "Menyimpan..." : "Simpan Setelan SPP  "}
                </button>
              </form>
            </motion.div>

            {/* Pengaturan Keamanan Akses Bendahara */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left text-slate-800"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Key size={16} className="text-emerald-600" /> Pengaturan
                  Keamanan Akun Bendahara
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Kelola keamanan kredensial login untuk{" "}
                  <strong>Bendahara Keuangan</strong>. Anda dapat memperbarui
                  password secara langsung di bawah ini atau meresetnya kembali
                  ke sandi bawaan default (
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">
                    bendahara123
                  </code>
                  ).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to change password directly */}
                <form
                  onSubmit={handleAdminUpdateTreasurerPassword}
                  className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Atur Kata Sandi Baru Khusus
                  </span>

                  {treasurerActionMsg && (
                    <div
                      className={`p-3 rounded-lg font-bold text-xs ${
                        treasurerActionMsg.type === "success"
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-800"
                          : "bg-rose-50 border border-rose-200 text-rose-700"
                      }`}
                    >
                      {treasurerActionMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400">
                      Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi baru Bendahara (Min 5 karakter)"
                      value={adminTreasurerPasswordInput}
                      onChange={(e) =>
                        setAdminTreasurerPasswordInput(e.target.value)
                      }
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOperatingTreasurerPwd}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOperatingTreasurerPwd
                      ? "Menyimpan..."
                      : "Perbarui Sandi Bendahara "}
                  </button>
                </form>

                {/* Reset to Default */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl h-full justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Setel Ulang Sandi Kembali ke Bawaan
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
                      Lupa password bendahara aktif? Klik tombol di bawah ini
                      untuk mengembalikan sandi Bendahara kembali ke standar
                      bawaan sistem:{" "}
                      <strong className="font-mono text-indigo-700">
                        bendahara123
                      </strong>
                      .
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminResetTreasurerPassword}
                    disabled={isOperatingTreasurerPwd}
                    className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw
                      size={12}
                      className={isOperatingTreasurerPwd ? "animate-spin" : ""}
                    />
                    <span>Reset Password ke Default (bendahara123)  </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pengaturan Keamanan Akses Kepala Sekolah */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left text-slate-800"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Key size={16} className="text-violet-600" /> Pengaturan
                  Keamanan Akun Kepala Sekolah (Principal)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Kelola keamanan kredensial login untuk{" "}
                  <strong>Kepala Sekolah</strong>. Anda dapat memperbarui
                  password secara langsung di bawah ini atau meresetnya kembali
                  ke sandi bawaan default (
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-violet-700">
                    kepala123
                  </code>
                  ).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to change password directly */}
                <form
                  onSubmit={handleAdminUpdatePrincipalPassword}
                  className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">
                    Atur Kata Sandi Baru Khusus
                  </span>

                  {principalActionMsg && (
                    <div
                      className={`p-3 rounded-lg font-bold text-xs ${
                        principalActionMsg.type === "success"
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-800"
                          : "bg-rose-50 border border-rose-200 text-rose-700"
                      }`}
                    >
                      {principalActionMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400">
                      Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi baru Kepala Sekolah (Min 5 karakter)"
                      value={adminPrincipalPasswordInput}
                      onChange={(e) =>
                        setAdminPrincipalPasswordInput(e.target.value)
                      }
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-violet-600 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOperatingPrincipalPwd}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOperatingPrincipalPwd
                      ? "Menyimpan..."
                      : "Perbarui Sandi Kepala Sekolah "}
                  </button>
                </form>

                {/* Reset to Default */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl h-full justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Setel Ulang Sandi Kembali ke Bawaan
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
                      Lupa password Kepala Sekolah aktif? Klik tombol di bawah
                      ini untuk mengembalikan sandi Kepala Sekolah kembali ke
                      standar bawaan sistem:{" "}
                      <strong className="font-mono text-violet-700">
                        kepala123
                      </strong>
                      .
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminResetPrincipalPassword}
                    disabled={isOperatingPrincipalPwd}
                    className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw
                      size={12}
                      className={isOperatingPrincipalPwd ? "animate-spin" : ""}
                    />
                    <span>Reset Password ke Default (kepala123)  </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pengaturan Keamanan Akses Waka Sarana & Prasarana (Sarpras) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left text-slate-800"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Key size={16} className="text-indigo-600" /> Pengaturan
                  Keamanan Akun Waka Sarpras
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Kelola keamanan kredensial login untuk{" "}
                  <strong>Waka Sarana &amp; Prasarana (Sarpras)</strong>. Anda
                  dapat memperbarui password secara langsung di bawah ini atau
                  meresetnya kembali ke sandi bawaan default (
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">
                    sarpras123
                  </code>
                  ).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to change password directly */}
                <form
                  onSubmit={handleAdminUpdateSarprasPassword}
                  className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Atur Kata Sandi Baru Khusus
                  </span>

                  {sarprasActionMsg && (
                    <div
                      className={`p-3 rounded-lg font-bold text-xs ${
                        sarprasActionMsg.type === "success"
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-800"
                          : "bg-rose-50 border border-rose-200 text-rose-700"
                      }`}
                    >
                      {sarprasActionMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400">
                      Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi baru Waka Sarpras (Min 5 karakter)"
                      value={adminSarprasPasswordInput}
                      onChange={(e) =>
                        setAdminSarprasPasswordInput(e.target.value)
                      }
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOperatingSarprasPwd}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOperatingSarprasPwd
                      ? "Menyimpan..."
                      : "Perbarui Sandi Waka Sarpras "}
                  </button>
                </form>

                {/* Reset to Default */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl h-full justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Setel Ulang Sandi Kembali ke Bawaan
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
                      Lupa password Waka Sarpras aktif? Klik tombol di bawah ini
                      untuk mengembalikan sandi Waka Sarpras kembali ke standar
                      bawaan sistem:{" "}
                      <strong className="font-mono text-indigo-700">
                        sarpras123
                      </strong>
                      .
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminResetSarprasPassword}
                    disabled={isOperatingSarprasPwd}
                    className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw
                      size={12}
                      className={isOperatingSarprasPwd ? "animate-spin" : ""}
                    />
                    <span>Reset Password ke Default (sarpras123)  </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pengaturan Keamanan Akses Guru Bimbingan Konseling (BK) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left text-slate-800"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Key size={16} className="text-indigo-600" /> Pengaturan
                  Keamanan Akun Guru BK / Konselor
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Kelola keamanan kredensial login untuk{" "}
                  <strong>Guru BK (Konselor Bimbingan Konseling)</strong>. Anda
                  dapat memperbarui password secara langsung di bawah ini atau
                  meresetnya kembali ke sandi bawaan default (
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">
                    bk123
                  </code>
                  ).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to change password directly */}
                <form
                  onSubmit={handleAdminUpdateBkPassword}
                  className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Atur Kata Sandi Baru Khusus
                  </span>

                  {bkActionMsg && (
                    <div
                      className={`p-3 rounded-lg font-bold text-xs ${
                        bkActionMsg.type === "success"
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-800"
                          : "bg-rose-50 border border-rose-200 text-rose-700"
                      }`}
                    >
                      {bkActionMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400">
                      Kata Sandi Baru BK
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi baru Guru BK (Min 5 karakter)"
                      value={adminBkPasswordInput}
                      onChange={(e) => setAdminBkPasswordInput(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOperatingBkPwd}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOperatingBkPwd
                      ? "Menyimpan..."
                      : "Perbarui Sandi Guru BK "}
                  </button>
                </form>

                {/* Reset to Default */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl h-full justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Setel Ulang Sandi Kembali ke Bawaan
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
                      Lupa password Guru BK aktif? Klik tombol di bawah ini
                      untuk mengembalikan sandi kembali ke standar bawaan
                      sistem:{" "}
                      <strong className="font-mono text-indigo-700">
                        bk123
                      </strong>
                      .
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminResetBkPassword}
                    disabled={isOperatingBkPwd}
                    className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw
                      size={12}
                      className={isOperatingBkPwd ? "animate-spin" : ""}
                    />
                    <span>Reset Password ke Default (bk123)  </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pengaturan Identitas Sekolah & Logo */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 text-xs text-left"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Settings size={16} className="text-emerald-600" /> Pengaturan
                  Identitas & Logo Resmi Sekolah
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Sesuaikan nama sekolah, kop surat, data akreditasi, nomor
                  telepon dinas, alamat lengkap, nama pejabat (Kepala Sekolah &
                  Bendahara), serta unggah logo instansi resmi Anda. Nilai di
                  bawah ini akan memperbarui kop kuitansi cetak otomatis.
                </p>
              </div>

              <form
                onSubmit={handleSaveSchoolIdentity}
                className="flex flex-col gap-5"
              >
                {schoolIdentityMsg && (
                  <div
                    className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                      schoolIdentityMsg.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-red-50 border border-red-205 text-red-700"
                    }`}
                  >
                    {schoolIdentityMsg.type === "success" ? (
                      <Check size={14} className="text-emerald-700" />
                    ) : (
                      <AlertCircle size={14} className="text-red-750" />
                    )}
                    {schoolIdentityMsg.text}
                  </div>
                )}

                {/* Top row: Logo, Kop Surat and Main Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* File Uploads Column for Logo AND Kop Surat */}
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* Logo File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Logo Sekolah Utama
                      </span>

                      <div className="relative w-28 h-28 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolLogo ? (
                          <>
                            <img
                              src={schoolLogo}
                              alt="Logo preview"
                              className="w-full h-full object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolLogo("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Logo
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={28} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Logo Utama
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Logo Utama</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400">
                        Format gambar persegi
                      </span>
                    </div>

                    {/* Logo kedua / pendamping */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Logo Kedua / Pendamping
                      </span>

                      <div className="relative w-28 h-28 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolLogo2 ? (
                          <>
                            <img
                              src={schoolLogo2}
                              alt="Logo 2 preview"
                              className="w-full h-full object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolLogo2("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Logo Kedua
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={28} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Logo Kedua
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogo2Upload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Logo Kedua</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400">
                        Format gambar persegi
                      </span>
                    </div>

                    {/* Kop Surat File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Kop Surat Default
                      </span>

                      <div className="relative w-full h-16 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolLetterhead ? (
                          <>
                            <img
                              src={schoolLetterhead}
                              alt="Kop Surat preview"
                              className="w-full h-full object-contain p-1"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolLetterhead("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Kop
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={20} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Kop Surat
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLetterheadUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Kop Surat</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400 leading-none">
                        Rasio panjang banner (Kop dokumen cetak)
                      </span>
                    </div>

                    {/* TTD Kepala Sekolah File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Tanda Tangan Kepala Sekolah
                      </span>

                      <div className="relative w-full h-16 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolPrincipalSignature ? (
                          <>
                            <img
                              src={schoolPrincipalSignature}
                              alt="Tanda tangan kepala sekolah preview"
                              className="w-full h-full object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolPrincipalSignature("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Tanda Tangan
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={20} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Tanda Tangan
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePrincipalSignatureUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Ttd Kepala Sekolah</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400 leading-none">
                        Format ttd PNG transparan
                      </span>
                    </div>

                    {/* TTD Bendahara File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Tanda Tangan Bendahara
                      </span>

                      <div className="relative w-full h-16 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolTreasurerSignature ? (
                          <>
                            <img
                              src={schoolTreasurerSignature}
                              alt="Tanda tangan preview"
                              className="w-full h-full object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolTreasurerSignature("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Tanda Tangan
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={20} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Tanda Tangan
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTreasurerSignatureUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Tanda Tangan</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400 leading-none">
                        Format ttd PNG transparan
                      </span>
                    </div>

                    {/* Stempel Sekolah File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Stempel Resmi Sekolah
                      </span>

                      <div className="relative w-full h-16 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolStamp ? (
                          <>
                            <img
                              src={schoolStamp}
                              alt="Stempel preview"
                              className="w-full h-full object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolStamp("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Stempel
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={20} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Stempel Resmi
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSchoolStampUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-605 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Stempel Resmi</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400 leading-none">
                        Format stempel transparan
                      </span>
                    </div>

                    {/* Favicon File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Favicon Portal (.png / .ico)
                      </span>

                      <div className="relative w-full h-16 border border-slate-200 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group">
                        {schoolFavicon ? (
                          <>
                            <img
                              src={schoolFavicon}
                              alt="Favicon preview"
                              className="w-8 h-8 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setSchoolFavicon("")}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer border-0"
                            >
                              Hapus Favicon
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={20} />
                            <span className="text-[9px] text-slate-400">
                              Belum Ada Favicon
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/png, image/x-icon, image/jpeg"
                          onChange={handleFaviconUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-605 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud size={12} />
                          <span>Unggah Favicon</span>
                        </div>
                      </label>
                      <span className="text-[8px] text-slate-400 leading-none">
                        Format gambar ikon kecil tab
                      </span>
                    </div>
                  </div>

                  {/* Identity Form Inputs Column */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                        Nama Resmi Sekolah
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="CONTOH: SMP MA'ARIF NU PANDAAN"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                        Subheading / Lembaga Atas
                      </label>
                      <input
                        type="text"
                        value={schoolSubheading}
                        onChange={(e) => setSchoolSubheading(e.target.value)}
                        placeholder="CONTOH: LP MA'ARIF NU CABANG PASURUAN"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                        Skala / Status Akreditasi
                      </label>
                      <input
                        type="text"
                        value={schoolAccreditation}
                        onChange={(e) => setSchoolAccreditation(e.target.value)}
                        placeholder="CONTOH: Terakreditasi A"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                        Nomor Telepon Dinas
                      </label>
                      <input
                        type="text"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                        placeholder="CONTOH: (0343) 631234"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                        Alamat Lengkap Instansi
                      </label>
                      <input
                        type="text"
                        value={schoolAddress}
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        placeholder="CONTOH: Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Official Signatures & Academic Year Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Nama Kepala Sekolah / Jabatan 1 (Ttd Kuitansi)
                    </label>
                    <input
                      type="text"
                      value={schoolPrincipal}
                      onChange={(e) => setSchoolPrincipal(e.target.value)}
                      placeholder="Contoh: H. Ahmad Fuad, S.Pd, M.PdI"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Nama Bendahara / Jabatan 2 (Ttd Kuitansi)
                    </label>
                    <input
                      type="text"
                      value={schoolTreasurer}
                      onChange={(e) => setSchoolTreasurer(e.target.value)}
                      placeholder="Contoh: Bendahara Sekolah"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Tahun Ajaran Aktif Portal   
                    </label>
                    <select
                      value={schoolActiveAcademicYear}
                      onChange={(e) => setSchoolActiveAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
                    >
                      <option value="2026/2027">2026/2027</option>
                      <option value="2025/2026">2025/2026</option>
                      <option value="2024/2025">2024/2025</option>
                    </select>
                  </div>
                </div>

                {/* Mobile App Download Links Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <div className="md:col-span-2">
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                       Link Unduhan Aplikasi Mobile Sekolah
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Masukkan tautan unduhan resmi untuk APK Android dan App
                      Store iOS. Link ini akan otomatis ditampilkan dan dapat
                      diakses langsung oleh seluruh akun (Siswa, Wali Kelas,
                      Guru Mapel, Bendahara, Sarpras, Kepala Sekolah) di portal
                      masing-masing.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">
                      Link Unduhan APK Android
                    </label>
                    <input
                      type="url"
                      value={apkUrl}
                      onChange={(e) => setApkUrl(e.target.value)}
                      placeholder="Contoh: https://link-download-apk.com/smp-maarif.apk"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">
                      Link Unduhan Aplikasi iOS
                    </label>
                    <input
                      type="url"
                      value={iosUrl}
                      onChange={(e) => setIosUrl(e.target.value)}
                      placeholder="Contoh: https://apps.apple.com/id/app/smp-maarif"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                </div>

                {/* SK Penugasan Config for Treasurer & Sarpras */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <div className="md:col-span-2">
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                       Link SK Penugasan Bendahara &amp; Waka Sarpras
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Masukkan tautan unduhan SK Penugasan resmi untuk Bendahara
                      Keuangan dan Waka Sarpras. Tautan ini akan dapat diunduh
                      langsung di halaman panel dashboard masing-masing.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">
                      Link SK Penugasan Bendahara
                    </label>
                    <input
                      type="url"
                      value={treasurerSkUrl}
                      onChange={(e) => setTreasurerSkUrl(e.target.value)}
                      placeholder="Contoh: https://drive.google.com/file/... (Link Download)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">
                      Link SK Penugasan Waka Sarpras
                    </label>
                    <input
                      type="url"
                      value={sarprasSkUrl}
                      onChange={(e) => setSarprasSkUrl(e.target.value)}
                      placeholder="Contoh: https://drive.google.com/file/... (Link Download)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSchoolIdentity}
                  className="w-full md:w-auto self-end px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg uppercase tracking-wider text-[11px] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSchoolIdentity
                    ? "Menyimpan..."
                    : "Simpan Identitas Sekolah  "}
                </button>
              </form>
            </motion.div>

            {/* Academic Operations: Kenaikan Kelas & Aktivasi Tahun Ajaran Otomatis */}
            <div className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 text-xs text-left"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <GraduationCap size={18} className="text-emerald-600" />{" "}
                    Operasi Kenaikan Kelas Massal & Manajemen Tahun Ajaran Baru
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Atur kenaikan kelas siswa dan konfigurasi penagihan SPP Anda
                    saat berpindah semester atau tahun ajaran baru.
                  </p>
                </div>

                {/* Persiapan Data Awal & Perilaku Tagihan Form */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                    <Settings size={14} className="text-indigo-600" /> Opsi
                    Persiapan Data Awal & Konfigurasi Tagihan
                  </span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Gunakan pengaturan di bawah ini untuk mengontrol apakah sisa
                    tagihan lama dihapus atau apakah tagihan baru langsung
                    digenerate otomatis. Sangat membantu saat persiapan awal
                    menggunakan aplikasi.
                  </p>

                  <div className="flex flex-col gap-2.5 mt-1 text-left">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={clearPastYearBills}
                        onChange={(e) =>
                          setClearPastYearBills(e.target.checked)
                        }
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 text-[11px]">
                          Bersihkan/Hapus seluruh tagihan lama siswa di tahun
                          ajaran sebelumnya
                        </span>
                        <span className="text-[9.5px] text-slate-500 leading-normal">
                          Apabila diaktifkan, seluruh lembar tagihan sisa yang
                          belum terbayar di tahun-tahun ajaran terdahulu akan
                          dibersihkan agar database Anda bersih (bebas tunggakan
                          masa lalu). Sempurna untuk data awal pemakaian
                          aplikasi.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none border-t border-slate-200/60 pt-2.5">
                      <input
                        type="checkbox"
                        checked={generateNewActiveBills}
                        onChange={(e) =>
                          setGenerateNewActiveBills(e.target.checked)
                        }
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 text-[11px]">
                          Hasilkan 12 bulan tagihan SPP baru siap bayar secara
                          otomatis
                        </span>
                        <span className="text-[9.5px] text-slate-500 leading-normal">
                          Secara otomatis menerbitkan lembar SPP 12 bulan (Juli
                          s.d Juni) untuk seluruh siswa aktif
                          non-keluaran/lulusan pada tahun akademik baru yang
                          aktif.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* CARD OPSI 1: Kenaikan Kelas Massal */}
                  <div className="flex flex-col justify-between gap-4 p-4 border border-slate-250 rounded-xl bg-orange-50/20 text-left">
                    <div>
                      <h4 className="font-extrabold text-slate-850 text-[11px] uppercase tracking-wider flex items-center gap-1">
                         PILIHAN A: Kenaikan Kelas Massal
                      </h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1">
                        Menaikkan tingkat siswa dalam satu klik:{" "}
                        <strong>Kelas 7 naik ke 8</strong>,{" "}
                        <strong>Kelas 8 naik ke 9</strong>, dan{" "}
                        <strong>Kelas 9 dinyatakan Lulus</strong>. Serta
                        mengaktifkan tahun ajaran berikutnya secara kumulatif.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {promotionMessage && (
                        <div
                          className={`p-2.5 rounded-lg font-bold text-[10.5px] leading-relaxed flex items-start gap-1.5 ${
                            promotionMessage.type === "success"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                              : "bg-red-50 border border-red-200 text-red-700"
                          }`}
                        >
                          {promotionMessage.type === "success" ? (
                            <Check
                              size={14}
                              className="text-emerald-700 mt-0.5 flex-shrink-0"
                            />
                          ) : (
                            <AlertCircle
                              size={14}
                              className="text-red-700 mt-0.5 flex-shrink-0"
                            />
                          )}
                          <div>{promotionMessage.text}</div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handlePromoteClasses}
                        disabled={isPromoting}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {isPromoting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />{" "}
                            Memproses Kenaikan...
                          </>
                        ) : (
                          <>
                            <TrendingUp size={14} /> Proses Kenaikan Kelas
                            Massal   
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CARD OPSI 2: Aktivasi Tahun Ajaran Saja */}
                  <div className="flex flex-col justify-between gap-4 p-4 border border-slate-250 rounded-xl bg-indigo-50/10 text-left">
                    <div>
                      <h4 className="font-extrabold text-slate-850 text-[11px] uppercase tracking-wider flex items-center gap-1">
                         PILIHAN B: Aktifkan Tahun Ajaran Baru Saja
                      </h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1">
                        Gunakan ini untuk mengaktifkan tahun ajaran baru secara
                        manual <strong>tanpa menaikkan kelas siswa</strong>.
                        Sangat cocok saat input perdana siswa baru atau
                        penyesuaian data awal.
                      </p>
                    </div>

                    <form
                      onSubmit={handleActivateNewYear}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest shrink-0">
                          Tahun Mulai (Juli):
                        </label>
                        <input
                          type="number"
                          min="2020"
                          max="2100"
                          value={newYearInput}
                          onChange={(e) => setNewYearInput(e.target.value)}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-bold focus:outline-none focus:border-indigo-600 text-center"
                          placeholder="2026"
                        />
                        <span className="text-[11px] text-slate-500 font-semibold">
                          / {Number(newYearInput) + 1}
                        </span>
                      </div>

                      {activatingYearMessage && (
                        <div
                          className={`p-2.5 rounded-lg font-bold text-[10.5px] leading-relaxed flex items-start gap-1.5 ${
                            activatingYearMessage.type === "success"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                              : "bg-red-50 border border-red-200 text-red-700"
                          }`}
                        >
                          {activatingYearMessage.type === "success" ? (
                            <Check
                              size={14}
                              className="text-emerald-700 mt-0.5 flex-shrink-0"
                            />
                          ) : (
                            <AlertCircle
                              size={14}
                              className="text-red-700 mt-0.5 flex-shrink-0"
                            />
                          )}
                          <div>{activatingYearMessage.text}</div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isActivatingYear}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {isActivatingYear ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />{" "}
                            Mengaktifkan...
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Aktifkan Tahun Ajaran Saja [OK]
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Midtrans Config & Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 text-xs"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Settings size={16} className="text-indigo-600" />{" "}
                    Pengaturan & Integrasi Gateway Midtrans
                  </span>
                  {isMidtransUnlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMidtransUnlocked(false);
                        setMidtransVerificationPin("");
                        setMidtransPinError("");
                      }}
                      className="px-2.5 py-1 text-[10px] bg-slate-100 font-bold hover:bg-slate-200 text-slate-600 rounded-md flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                    >
                      <Lock size={12} /> Kunci Kembali
                    </button>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Konfigurasikan kunci akses API Midtrans Anda secara langsung
                  di bawah ini. Pengaturan ini akan disinkronkan secara aman ke
                  peladen backend database sekolah.
                </p>
              </div>

              {!isMidtransUnlocked ? (
                <form
                  onSubmit={handleVerifyMidtransPin}
                  className="p-6 border border-slate-200 rounded-xl bg-slate-50/40 flex flex-col items-center justify-center text-center gap-4"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                    <Lock size={20} className="className-test animate-bounce" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                      Pengaturan Terkunci 
                    </span>
                    <p className="text-[11px] text-slate-500 leading-normal font-medium">
                      Area ini memuat informasi kunci API dan setelan sensitif
                      finansial sekolah. Silakan masukkan PIN Keamanan Midtrans
                      pengaturan untuk membuka akses.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full max-w-[240px]">
                    <div className="relative">
                      <input
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={8}
                        value={midtransVerificationPin}
                        onChange={(e) =>
                          setMidtransVerificationPin(
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        placeholder="PIN (Default: 1234)"
                        className="w-full pl-3 pr-10 py-2.5 text-center font-mono font-bold text-sm bg-white border border-slate-250 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-3xs tracking-wider"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <Key size={14} />
                      </div>
                    </div>
                    {midtransPinError && (
                      <span className="text-[10px] text-rose-600 font-bold leading-normal text-center">
                        {midtransPinError}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingPin}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-sm select-none flex items-center gap-1.5"
                  >
                    {isVerifyingPin ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />{" "}
                        Membuka...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={12} /> Buka Pengaturan 
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleSaveMidtransFees}
                  className="flex flex-col gap-5"
                >
                  {savingFeesMsg && (
                    <div
                      className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                        savingFeesMsg.type === "success"
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-800"
                          : "bg-red-50 border border-red-250 text-red-700"
                      }`}
                    >
                      {savingFeesMsg.type === "success" ? (
                        <Check size={14} className="text-emerald-700" />
                      ) : (
                        <AlertCircle size={14} className="text-red-700" />
                      )}
                      {savingFeesMsg.text}
                    </div>
                  )}

                  {/* Midtrans Credentials Inputs */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 flex flex-col gap-4">
                    <span className="font-bold text-slate-800 text-xs block uppercase tracking-wide">
                       Kredensial API Midtrans
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Midtrans Merchant ID
                        </label>
                        <input
                          type="text"
                          value={midtransMerchantIdInput}
                          onChange={(e) =>
                            setMidtransMerchantIdInput(e.target.value)
                          }
                          placeholder="Contoh: G123456789"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Midtrans Client Key
                        </label>
                        <input
                          type="text"
                          value={midtransClientKeyInput}
                          onChange={(e) =>
                            setMidtransClientKeyInput(e.target.value)
                          }
                          placeholder="Contoh: SB-Mid-client-XXXXX"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Midtrans Server Key
                        </label>
                        <input
                          type="password"
                          value={midtransServerKeyInput}
                          onChange={(e) =>
                            setMidtransServerKeyInput(e.target.value)
                          }
                          placeholder={
                            midtransStatus?.hasServerKey
                              ? "---------------- (Kunci Terenkripsi Aman)"
                              : "Masukkan Server Key keamanan"
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs"
                        />
                        {midtransStatus?.hasServerKey && (
                          <span className="text-[9px] text-emerald-600 mt-0.5 leading-relaxed font-semibold">
                            [OK] Kunci sudah terintegrasi aman di server.
                            Kosongkan jika tidak ingin mendesain ulang kunci
                            baru.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Lingkungan API (Development / Production)
                        </label>
                        <select
                          value={midtransIsProduction ? "prod" : "sandbox"}
                          onChange={(e) =>
                            setMidtransIsProduction(e.target.value === "prod")
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs cursor-pointer"
                        >
                          <option value="sandbox">
                            Sandbox (Mode Simulasi Demo)
                          </option>
                          <option value="prod">
                            Production (Gerbang Pembayaran Riil / Live)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* PIN Security Setting Input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/60 pt-4 mt-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Atur PIN Pengaturan Gateway Baru (Ubah PIN)
                        </label>
                        <input
                          type="password"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={8}
                          value={midtransPinInput}
                          onChange={(e) =>
                            setMidtransPinInput(
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                          placeholder="Masukkan PIN Angka Baru (Sandi Baru)"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs font-mono text-center tracking-widest"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                           Kosongkan jika tidak ingin mengubah PIN Keamanan
                          pengaturan (saat ini). Hanya karakter angka yang
                          valid. (PIN bawaan: 1234)
                        </span>
                      </div>
                    </div>

                    {/* Temporary Disable Midtrans Checkbox/Switch Option */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-slate-800">
                          Nonaktifkan Sementara Pembayaran Online Midtrans
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Jika diaktifkan, wali murid tidak dapat melakukan
                          pembayaran lewat Midtrans untuk sementara waktu.
                        </span>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          checked={midtransIsDisabled}
                          onChange={(e) =>
                            setMidtransIsDisabled(e.target.checked)
                          }
                          className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Midtrans Info Surcharge */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-amber-50/50 text-amber-900 text-[11px] leading-relaxed flex flex-col gap-1.5">
                    <span className="font-bold text-amber-950 flex items-center gap-1">
                       Informasi Biaya Admin Midtrans Otomatis:
                    </span>
                    <p className="m-0 text-amber-850 font-medium">
                      Sistem ini terintegrasi penuh untuk mendukung semua metode
                      pembayaran Snap (Virtual Account, QRIS/GoPay/ShopeePay,
                      Alfa/Indomaret, atau Kartu Kredit). Biaya administrasi
                      Midtrans akan otomatis ditambahkan oleh server Midtrans
                      sendiri di dalam popup Snap kepada Wali Murid (jika fitur
                      Surcharge diaktifkan di Dashboard Portal Midtrans Anda),
                      sehingga nilai tarif admin tidak perlu diatur atau dirawat
                      manual dari aplikasi ini.
                    </p>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 font-bold font-sans">
                        Status Koneksi Gateway:
                      </span>
                      {midtransStatus?.isDisabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-150 text-rose-800 border border-rose-250">
                          * DINONAKTIFKAN SEMENTARA
                        </span>
                      ) : midtransStatus?.hasServerKey &&
                        midtransStatus?.clientKey ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                          * AKTIF (
                          {midtransStatus.isProduction
                            ? "PRODUCTION"
                            : "SANDBOX"}
                          )
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                          * SIMULASI TELLER
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingFees}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-md select-none"
                    >
                      {isSavingFees
                        ? "Menyimpan Konfigurasi..."
                        : "Simpan Semua Pengaturan  "}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>

            {/* Admin Manual Sync Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-left flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shrink-0">
                  <RefreshCw className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    Alat Sinkronisasi & Rekonsiliasi Transaksi Midtrans
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Gunakan alat bantu ini untuk memeriksa langsung status pembayaran di Midtrans dan menyinkronkannya dengan database internal sekolah secara paksa. Sangat berguna apabila ada laporan wali murid yang sudah sukses membayar via Gopay/Bank Transfer namun status tagihan di sistem masih belum Lunas.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Masukkan No. Order ID (e.g. SPP-B-...) or ID Transaksi Midtrans (UUID)"
                  className="flex-1 text-xs bg-slate-50 text-slate-800 placeholder-slate-400 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  value={adminManualOrderId}
                  onChange={(e) => setAdminManualOrderId(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAdminManualVerify}
                  disabled={isAdminManualVerifying || !adminManualOrderId.trim()}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isAdminManualVerifying || !adminManualOrderId.trim()
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-750 shadow-md shadow-indigo-100'
                  }`}
                >
                  {isAdminManualVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Sinkronkan Transaksi</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMidtransBulkReportModalOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 border border-emerald-500/30 shrink-0"
                  title="Upload file report CSV/Excel dari Midtrans MAP untuk verifikasi status transaksi massal secara otomatis"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Report Midtrans (Bulk Cek)</span>
                </button>
              </div>

              {adminManualVerifyStatus && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 shadow-3xs animate-fade-in ${
                  adminManualVerifyStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-900'
                    : 'bg-rose-50 border-rose-150 text-rose-900'
                }`}>
                  {adminManualVerifyStatus.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-extrabold block">
                      {adminManualVerifyStatus.type === 'success' ? 'Sinkronisasi Sukses!' : 'Sinkronisasi Gagal'}
                    </span>
                    <p className="m-0 text-slate-600 mt-0.5 leading-relaxed font-medium">
                      {adminManualVerifyStatus.message}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 text-xs flex flex-col gap-2 leading-relaxed text-blue-900"
            >
              <span className="font-bold">
                 Informasi Penting Untuk Pengembang:
              </span>
              <p className="m-0 leading-relaxed">
                Untuk menghubungkan dengan akun Midtrans asli milik SMP Maarif
                NU Pandaan:
              </p>
              <ol className="list-decimal pl-4 m-0 flex flex-col gap-1.5">
                <li>
                  Buka folder project di Cloud Workspace dan sunting berkas{" "}
                  <code className="bg-white/75 px-1 rounded font-mono text-[10px]">
                    .env
                  </code>
                </li>
                <li>
                  Atur{" "}
                  <code className="bg-white/75 px-1 rounded font-mono text-[10px]">
                    MIDTRANS_MERCHANT_ID
                  </code>
                  ,{" "}
                  <code className="bg-white/75 px-1 rounded font-mono text-[10px]">
                    MIDTRANS_CLIENT_KEY
                  </code>
                  , dan{" "}
                  <code className="bg-white/75 px-1 rounded font-mono text-[10px]">
                    MIDTRANS_SERVER_KEY
                  </code>
                </li>
                <li>
                  Gunakan URL Webhook Midtrans ini pada Dashboard Midtrans Anda
                  agar notifikasi pembayaran terhubung mundur secara real-time:
                  <div className="mt-1.5 bg-slate-900 text-slate-200 font-mono text-[10px] py-1.5 px-3 rounded-lg border border-slate-800 font-semibold break-all select-all">
                    {window.location.origin}/api/midtrans-webhook
                  </div>
                </li>
                <li>
                  Gunakan URL Pengalihan Selesai (Finish Return/Redirect URL)
                  berikut ini pada Dashboard Midtrans Anda di menu{" "}
                  <strong className="text-blue-950">
                    Settings &gt; Payment &gt; Redirection URL
                  </strong>{" "}
                  agar wali murid otomatis diarahkan ke halaman kuitansi digital
                  interaktif setelah transaksi berhasil diselesaikan:
                  <div className="mt-1.5 bg-slate-900 text-emerald-400 font-mono text-[10px] py-1.5 px-3 rounded-lg border border-slate-800 font-semibold break-all select-all">
                    {window.location.origin}/pembayaran-sukses
                  </div>
                  <span className="text-[10px] text-blue-700 mt-1 block">
                    {" "}
                    <em>
                      Sistem secara otomatis mengaktifkan Mode Tinjau Kuitansi
                      Terverifikasi yang persisten, meminta detail verifikasi
                      status pembayaran real-time via API, dan mematikan timer
                      auto-close agar wali murid dapat mengunduh atau mencetak
                      kuitansi digital mereka secara santai.
                    </em>
                  </span>
                </li>
              </ol>
            </motion.div>

            {/* WhatsApp API Configuration Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="text-lg"> </span> Pengaturan Whatsapp API
                  Gateway
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Konfigurasikan integrasi pengiriman WhatsApp otomatis untuk
                  pemberitahuan tagihan SPP rutin, kuitansi lunas instan, serta
                  notifikasi masuk & keluar buku Tabungan siswa otomatis.
                </p>
              </div>

              <form
                onSubmit={handleSaveWaConfig}
                className="flex flex-col gap-4"
              >
                {waConfigMsg && (
                  <div
                    className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                      waConfigMsg.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {waConfigMsg.type === "success" ? (
                      <Check size={14} className="text-emerald-700" />
                    ) : (
                      <AlertCircle size={14} className="text-red-750" />
                    )}
                    {waConfigMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Pilih Provider Gateway
                    </label>
                    <select
                      value={waProvider}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWaProvider(val);
                        if (val === "Fonnte") {
                          setWaBaseUrl("https://api.fonnte.com/send");
                        } else if (val === "Wablas") {
                          setWaBaseUrl(
                            "https://api.wablas.com/api/send-message",
                          );
                        } else if (val === "Whacenter") {
                          setWaBaseUrl("https://tools.whacenter.com/api/send");
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-xs"
                    >
                      <option value="Fonnte">Fonnte (Rekomendasi)</option>
                      <option value="Wablas">Wablas</option>
                      <option value="Whacenter">Whacenter</option>
                      <option value="Custom">Custom Gateway URL</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      API Endpoint Base URL
                    </label>
                    <input
                      type="url"
                      required
                      disabled={waProvider !== "Custom"}
                      value={waBaseUrl}
                      onChange={(e) => setWaBaseUrl(e.target.value)}
                      placeholder="https://api.provider.com/send"
                      className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-105 disabled:bg-slate-100 disabled:text-slate-500 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Nomor Pengirim (Device / ID SIKAT)
                    </label>
                    <input
                      type="text"
                      value={waSender}
                      onChange={(e) => setWaSender(e.target.value)}
                      placeholder="Contoh: 08123456789 atau Device ID"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Token Otorisasi / API Key
                    </label>
                    <input
                      type="password"
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      placeholder="Ketik rahasia token akses API Anda di sini..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono tracking-widest focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      Status & Pengaktifan Otomatis
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-705 text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-left">
                        <input
                          type="checkbox"
                          checked={waEnabled}
                          onChange={(e) => setWaEnabled(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Aktifkan Whatsapp Gateway</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none text-left">
                        <input
                          type="checkbox"
                          checked={waNotifyOnBilling}
                          onChange={(e) =>
                            setWaNotifyOnBilling(e.target.checked)
                          }
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Notif Tagihan Terbit</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none text-left">
                        <input
                          type="checkbox"
                          checked={waNotifyOnPayment}
                          onChange={(e) =>
                            setWaNotifyOnPayment(e.target.checked)
                          }
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Notif Kuitansi SPP Lunas</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none text-left">
                        <input
                          type="checkbox"
                          checked={waNotifyOnSavings}
                          onChange={(e) =>
                            setWaNotifyOnSavings(e.target.checked)
                          }
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Notif Transaksi Tabungan</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button
                    type="submit"
                    disabled={isSavingWaConfig}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] cursor-pointer shadow-xs transition-colors"
                  >
                    {isSavingWaConfig
                      ? "Menyimpan..."
                      : "Simpan Konfigurasi Whatsapp  "}
                  </button>
                </div>
              </form>

              {/* WA Testing Sandbox Section */}
              <div className="mt-2 border-t border-slate-200 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1 flex flex-col justify-center gap-1.5">
                  <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                      Uji Coba Pengiriman Instan
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lakukan simulasi atau pengiriman ril dengan memasukkan nomor
                    target format internasional (misal:{" "}
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">
                      628...
                    </code>
                    ) untuk memverifikasi keabsahan API Token dari provider yang
                    Anda miliki.
                  </p>
                </div>

                <form
                  onSubmit={handleTestWa}
                  className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-4 border border-slate-205 border-slate-200"
                >
                  <div className="flex flex-col gap-1 md:col-span-1 text-left">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      No. WA Tujuan (Format 62xxx)
                    </label>
                    <input
                      type="text"
                      required
                      value={waTestPhone}
                      onChange={(e) => setWaTestPhone(e.target.value)}
                      placeholder="Contoh: 628123456789"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2 text-left">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      Isi Pesan Tes
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={waTestMsg}
                        onChange={(e) => setWaTestMsg(e.target.value)}
                        placeholder="Tulis pesan uji coba..."
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                      <button
                        type="submit"
                        disabled={waTesting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        {waTesting ? "Mengirim..." : "Kirim Tes "}
                      </button>
                    </div>
                  </div>

                  {waTestFeedback && (
                    <div
                      className={`col-span-1 md:col-span-3 p-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 ${
                        waTestFeedback.success
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-800"
                          : "bg-amber-50 border border-amber-200 text-amber-800"
                      }`}
                    >
                      <span>{waTestFeedback.success ? "[OK]" : "[PERINGATAN]"}</span>
                      <span>{waTestFeedback.text}</span>
                    </div>
                  )}
                </form>
              </div>
            </motion.div>

            {/* File Upload & Manager Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <UploadCloud size={16} className="text-indigo-600" />{" "}
                  Pengelola Berkas &amp; Unggah APK Aplikasi
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Unggah berkas aplikasi (.apk) Android sekolah, gambar
                  pengumuman, atau dokumen panduan ke server ini. Berkas yang
                  diunggah akan memiliki tautan unduhan langsung (Direct Link)
                  yang siap dibagikan ke wali murid atau dipasang di tombol web.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Upload Form */}
                <div className="lg:col-span-5 border-r border-slate-100 lg:pr-6 flex flex-col gap-4">
                  <span className="font-bold text-slate-800 text-xs block uppercase tracking-wide">
                     Unggah Berkas Baru
                  </span>

                  <form
                    onSubmit={handleUploadFile}
                    className="flex flex-col gap-3.5"
                  >
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Pilih Berkas (.apk, .png, .pdf, dsb)
                      </label>
                      <div
                        className="border-2 border-dashed border-slate-250 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                        onClick={() =>
                          document
                            .getElementById("admin-apk-file-input")
                            ?.click()
                        }
                      >
                        <UploadCloud size={28} className="text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-700 text-xs">
                            {fileToUpload
                              ? fileToUpload.name
                              : "Klik atau seret file ke sini"}
                          </p>
                          <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                            {fileToUpload
                              ? `${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`
                              : "Ukuran maks. 50 MB"}
                          </p>
                        </div>
                        <input
                          id="admin-apk-file-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFileToUpload(e.target.files[0]);
                              setFileUploadError(null);
                              setFileUploadSuccess(null);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {fileUploadError && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold text-xs flex items-center gap-1.5">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{fileUploadError}</span>
                      </div>
                    )}

                    {fileUploadSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Check
                            size={14}
                            className="text-emerald-700 shrink-0"
                          />
                          <span>Dokumen berhasil diunggah!</span>
                        </div>
                        <div className="mt-1 bg-white p-2 rounded border border-emerald-150 font-mono text-[9px] break-all text-slate-700 select-all flex items-center justify-between gap-2 shadow-3xs">
                          <span className="truncate">{fileUploadSuccess}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fileUploadSuccess)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded uppercase text-[8px] tracking-wide cursor-pointer flex items-center gap-0.5 shrink-0"
                          >
                            {copiedFileUrl === fileUploadSuccess
                              ? "Copied!"
                              : "Salin Link"}
                          </button>
                        </div>
                      </div>
                    )}

                    {fileUploadProgress >= 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-extrabold text-slate-500">
                          <span>Mengirim file ke server...</span>
                          <span>{fileUploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full transition-all duration-150"
                            style={{ width: `${fileUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      {fileToUpload && (
                        <button
                          type="button"
                          onClick={() => {
                            setFileToUpload(null);
                            const fileInput = document.getElementById(
                              "admin-apk-file-input",
                            ) as HTMLInputElement;
                            if (fileInput) fileInput.value = "";
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg uppercase tracking-wider text-[10px] cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!fileToUpload || fileUploadProgress >= 0}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] cursor-pointer shadow-xs transition-colors"
                      >
                        Mulai Unggah Berkas 
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Files List */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs block uppercase tracking-wide">
                       Daftar Berkas Terunggah ({uploadedFiles.length})
                    </span>
                    <button
                      onClick={fetchUploadedFiles}
                      disabled={isClassFilesLoading}
                      className="p-1 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-55"
                    >
                      <RefreshCw
                        size={10}
                        className={`${isClassFilesLoading ? "animate-spin" : ""}`}
                      />
                      <span>Segarkan</span>
                    </button>
                  </div>

                  {isClassFilesLoading && uploadedFiles.length === 0 ? (
                    <div className="flex-1 min-h-[150px] flex items-center justify-center border border-slate-150 rounded-xl bg-slate-50/20 text-slate-400 font-bold text-xs">
                      Memuat daftar file dari server...
                    </div>
                  ) : uploadedFiles.length === 0 ? (
                    <div className="flex-1 min-h-[150px] flex flex-col gap-1.5 items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/15 text-slate-400 font-bold text-xs p-5 text-center">
                      <span>Belum ada berkas terunggah yang disimpan.</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Gunakan form di sebelah kiri untuk mengunggah file APK
                        Anda pertama kali!
                      </span>
                    </div>
                  ) : (
                    <div className="max-h-[280px] overflow-y-auto border border-slate-150 rounded-xl divide-y divide-slate-100 flex flex-col">
                      {uploadedFiles.map((file) => {
                        const isApk = file.filename
                          .toLowerCase()
                          .endsWith(".apk");
                        return (
                          <div
                            key={file.filename}
                            className="p-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-all text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={`p-2 rounded-lg ${isApk ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"} shrink-0`}
                              >
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="font-bold text-slate-800 text-xs truncate"
                                  title={file.displayName}
                                >
                                  {file.displayName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
                                  <span>
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                  <span className="opacity-40">-</span>
                                  <span>
                                    {new Date(
                                      file.createdAt,
                                    ).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => copyToClipboard(file.url)}
                                className={`p-1.5 px-2.5 rounded-lg border font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer select-none ${
                                  copiedFileUrl === file.url
                                    ? "bg-emerald-500 border-emerald-600 text-white"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                                }`}
                                title="Salin Tautan Langsung"
                              >
                                <ClipboardCheck size={11} className="mr-0.5" />
                                <span>
                                  {copiedFileUrl === file.url
                                    ? "Selesai!"
                                    : "Salin Link"}
                                </span>
                              </button>

                              <button
                                onClick={() => window.open(file.url, "_blank")}
                                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-indigo-600 flex items-center justify-center cursor-pointer transition-all"
                                title="Unduh / Buka di Tab Baru"
                              >
                                <ArrowUpRight size={13} />
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteUploadedFile(file.filename)
                                }
                                disabled={fileDeletingName === file.filename}
                                className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 disabled:opacity-50 flex items-center justify-center cursor-pointer transition-all"
                                title="Hapus Berkas Permanen"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Admin Password Update Configuration Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5 text-xs text-left"
            >
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <Key size={16} className="text-indigo-650" /> Pengaturan Kata
                  Sandi Akun Administrator Utama
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">
                  Demi keamanan data institusi, perbarui sandi default Staf
                  Administrasi (admin123) dengan password baru yang lebih kuat.
                </p>
              </div>

              <form
                onSubmit={handleUpdateAdminPassword}
                className="flex flex-col gap-4"
              >
                {adminPassFeedback && (
                  <div
                    className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                      adminPassFeedback.type === "success"
                        ? "bg-emerald-50 border border-emerald-205 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-750"
                    }`}
                  >
                    {adminPassFeedback.type === "success" ? (
                      <Check size={14} className="text-emerald-700" />
                    ) : (
                      <AlertCircle size={14} className="text-red-700" />
                    )}
                    <span>{adminPassFeedback.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      KATA SANDI SEKARANG (LAMA)
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan sandi saat ini"
                      value={currentAdminPass}
                      onChange={(e) => setCurrentAdminPass(e.target.value)}
                      className="mt-1 w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      KATA SANDI BARU
                    </span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="mt-1 w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingAdminPass}
                    className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-slate-800 text-white font-extrabold rounded-lg uppercase tracking-wider text-[11px] transition-all cursor-pointer disabled:opacity-50 select-none flex items-center justify-center gap-2"
                  >
                    {isUpdatingAdminPass
                      ? "Memproses..."
                      : "Perbarui Sandi Admin "}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Sistem Backup & Pemulihan Data Database Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-xœì}isG’ö÷÷W”-8+ğ¦eHÊ6MQâ
ÔÎnx'ìP$ZèÛ‡H.‡ÿıÍ¬ê«ºëj”ä£'Fîê:²²ò|òIÙM:¸IÄ}v™ŠO‰OS6x±¹Ùû¤v}'ıEÈÁÔûD&>M’·4`¯z—>»!^Ê‚d¤4NÉ]vzÍÇÚ.Ûë{$²pÊ¦ƒŸŒ¯^8õ®¢ÁŞ&Gñ”ÅùŠï·67E_ó¿ŸÁßÉ,öÂù`SñFxç1Mé˜&Œ$Şÿ±WwÛ›÷dCÑµè›ºÇÊVg;ÒDa:Gş´>/‹®&©MÑ„…)çhk}OÙgBF^7“C:™gò„‹¿“sd¾7£!Á!‘b\ªŞmÌv”½^Ô;ÍûöËtbqóÏzÇ÷ ãA:Ø">£S/¼ÄÌ§7lJø0x8TMÏO™ù”,X8¡S^Aw§Øİi±{ÑÔ›“>òš>%ô
G…Æ>ğ”Ç	ï)ù9‹Cê?…V¼ÑxÓä)™&ã5’…i6'ƒçÎám	ó³8›/¼Œâ€&|3‡.ÍHJÃÅ{EÏğfèTÆŸÎÆpCÂg}c…—ŞUã³tá{sø°®œæ…#!å_6¾½Ûø¥4Íò„üÀØtËMÎX’Ğ+–¿mÜ7sze“	Ü”ßH<!}‡­¶[öXLıi{ƒ?ld[|ü ¾G´\D¹ÿ·5´}p4c0J±·İ·(²xíóÚÎFrÜ„U;WÍ[½ï”Óu¯ÙéĞÌ8KÓ($Qxä{“ù«»şyõPOz¨h§f¾¿¦ï>2¦Yô‰Åû­É,6n;>›ğwLù”N²8‰âÁ"ò8“ Zf“tF!ë}÷$õ–üı`CôÓ‘ôÖî[d'¦åuGñr43ıà—%íà+¦›¡ÏâôÈ‹'>3P¾øùŞŠ(§>EËÓM½Õ`·ŸíIÃ§pïËS2©×G'ïŞî“ÃáèdD‡Cröß£ÿxCúoŞßüôntA6şçäíäè|øöõøâü§ó³ÿŸ¼]Sp³6yqâºŠáĞ3rFƒqL.ã(¨„‚˜O\Ï€nŞágx`mìä8ØnH@“/*JÜRLft]—ç2_õIäsúÛu[ä§‚é>ÿG×øY:å?fIê]ŞÆ,½f,’QÑÁ±B¶YŒq“©w€^ìªÉ*¹K=ÛZÙëY±‹Å,ç³L‹OÕÄjŞo±ø’¤IæÒRaÕcmûNs±-é:¦mOQ–ÛmÉrÕSt†æHm H!íìVì’hBıY”¤¸Kà? T‘É9™¿¦ïÖÆl×ĞédâK[šÛD6Q-eS\F\1âÅLÑâdI	—À H¶ )m‚ÒLÃd2àµ”jöb¶8»N/ÌÖ3{ôø¼1òÖ0NŠv¡õôá,Ï>+°©—Å‘ ËO
¢\>ÌÅ?âƒÀ˜À—dÎ*QV¬®Í©Ofù²Ã)Í%Í±Go)ô0Ê¦Õ3ãš¢¡JãUÈ”Æ‰PË–xÕäËXş	M£ˆs
ç}›ó¦w4—ù‘ÿE³4ÒÌè]p›ü¯/:²>‰Â)P&¾WH]ºëŒ¼ƒ¼ÕbeİÅÜçÒÖÈeÛhîÀÌÌ5ü_ÚIRW6	½ Ir‘ù	ÒfÚÏßñİ‹gœ"‘ør"M*–Ï’#xoJşõ/ÜT)j“tî…pr{–ˆ{‚dmé­·Föuõh0†¥j­øº\9ñç‹ÇZ·¢›®ëtMùév{SÒÿyôî-ì¾(Fñz8) çŠ#.È™wÅÕK¾šXå.Ö˜24|¹„ ª¦
ªä‚¤Ê[•ŠC‹î~C±ÇU0ÈNÛä[¹ëéí‚‘W¯^‘^"ô³p–Ş²Šn»×EÃéİÿvï&pi˜©–R]Æ)”i¡m«µ¢Rjj§¨Áhíz•Ü×TÄÓ*âã#çÔÜèPªQzZ7	ƒ¹’…Óğª'şè)T®³úKuÚ’›Rj(TÑ‚N¼ô†\1+¾ØB¦`Õ°´jkYmr¹B.‚ÿ ‘ 1îj¿öç6§µƒ;úu"?Â}òCä´fÕzB>|ôğ6‡¿4Â šÏ`†GÙ8ğÒWw3N}vÁ1ÇÒ¬Bß [\ÙÁs…RµƒüTh aIÌ^ÚaB^Ó+Z©WÈ|*Ñ=|ñt×Iµ­³Ğ8“AĞ¹/ß2»¨ás´C¦0Ça9¹Ç’°¨!{±%œØH‹.’ F;FŠª=x¼\ºmÅÒm™RÅRM·Ò<ÎÖŸ„N”k‹'ç¼IÃ+½p‘¥-D0|OÏp×'êg°lœEñ±¼£á¼¶À<Õg·Ï÷ïÈúúz­Á§\%Ø'Ä³øŠ¥ëüä^yf×Â§6ƒ™b1ìªRkäfê­íçë›ğ¿-ÓÀjkq-$<4a÷“®Ûqå¦ô¯Î Úò]F“,Ù²Ô÷BÆMùW²!£4 Œ6ˆÂHßkiÀ¦ü2OºçQœ®Š\ÃeÍ»€¬–`±Å}ò–w¦/Óí*;;›Ïº0Şÿ±šTô®ü}»3ÿÜÛª|“_—Õî¢Õ‡°õìÙæîÖóÍíİí_qÃQÿ×€ÒØ»ük§ğ¿0ı~HXÂ“_gĞ—ÕÒ/¶¸"Ú£(İş‹f»q÷.Ô¼¼†éh(!Š¶Ğ³ æEŞ´~*UKşÜ–Yò6;Qu¦•=<Ê•en§îò‹ôGÙIX\™bˆ	*0kÜ|t%‘ğ|ôæ”LÙ%Íü”ø5ğ”s¨ïèïo™ı|7	zîTˆEZ¹ySyì[&¯¤°ÔXH;á=aO½ííÓWw^‚æ/¼—UD›7š¾oÅ2ÖfXX˜ªïĞbQ¼ª4<íIÙÚ·ª^ÈWUo~oF”Nñ4¦aâ¥^(P\=¬@3DÃáø]Æ,™]–’ºå¨1…¸Ù
I²ğB¾ŸzZç106¶Û9Ã¨®ÊÊ|ƒ·Æ-_OÈaFSá%!£9hÏh˜Dú-¬|¢­ÜpiâÂ )¬m£Ûpb¡­:5âí¡ÆŠG”ÄXy¾ÿ ´ø§Ç±÷‰éh±>MZ¬ûœvsO#i6›Ò¼õÂyaÀbI˜£ò+2ÊcñÜv§Lõ¯Z·1Úwµ~ã÷ŞÕ¬2 §Ğ›<Ÿ‘uô‰¨ËšÃ#gpt,×íÅ{*{±Î•=;‚E$[ûä<KÁæ8äÚKÅœiº¡Š‚Ù­LÓZ³tğbê¬–›Ü]]<˜ÎVğ—«µ‚óÎ U¡ç³²„7»VrÜéÄ×ª\¹7…¥é#e™Âa\°íIy)æ¤æÜR¸ıšs|qKğÅZhŒqø!Bşë³…ºlZC]Ü†!¼'‹(.£§S~46B´Éèü¼¦}˜Í3rŠ±ØePöèüìğ)™úş3ŠóÈoèˆXå[îRàÓÔx@ªØ¤k<%ç(Üöı_Ã³óóÎ13+?•…›ñè9º^,ì÷6èÂÛà*Ä»Ááàcï)éı:†qÍ{-¤-Üó¨{<‹èˆİJ2b=håÁ‡pÁyg²ö6„v?“£ëĞèTr¤YTqµ9ˆÎ²¶Kb²p8EÍgÒö>9‘¿!£Éùû1”GV[¢J½Sœ>_öì)O¦%bÅWŞ‰FN,Çõf<r{¥q6O³8üa¡V~Üä‡M©‹*™ó’gÖ»Ğÿ|¡”›ŠÄ Úébè,1é /Yz¹ÕƒB€LXš-j¡‘4Îà¯Ø#aä/Ãìõ'ï,f—¯zÅ«~Møşü•ómäm?çO¯zK<\ßâ·UÌ›D Uk[¦™ç²)§±Ãò´€®œısòóg~®_YÓå"f5_·¾a´lAÆ·$Áÿ^eÀ»€ZÃfKÅâì]JmÜxnÈn¬GÉµ­Å¸zµ•—„û=ûîl±-‹² áÏe¸ ªã ¿M3”=<ŸSr"Ä½9+càKµqƒT!ò•¸¯\<1X=©ÁT)#„.>!&úD’®İÓ)Úç7lXİ2cJJ{yMaéIG˜7 V®$Ënï»­uaâª¼Xâq}ë8« ĞÓbq ×µµxJïU»”L@éûN'rlğŸ×—÷ûÊ§w{½ æÒ(â6Ãç|fÅ¿•ËZĞS8;½Ä÷ˆ9<‘$3šx>§À@1ÓÖCu	Ô°¹ïÍËœz±Àbş•/ù£®ËÎz-yfCäQ»-ÍM²9>Ç¹ÖFiEò<·cAáYÎ¶OıLrndæ-T†æjòÑ¾Çê}³Ô*˜/å—Ío—‰5}¦X¢2Ò4qŸ¯PÚ0ÃÔ<‘¼B²U>swÃà.Æ
UÉÙ¶}ã»…UÆ%ŠtìG“¹ëÑ·yV©Ä¼K£€¦^b8í;{ ½‡k›5Í¤¹¸´ÍÛY%€4uF¬ÿ.O]ÒÍ–E*4-®I¥9*±dØ‚„MhLÉ˜ÅsêÓ‡E±kúìbŒj˜¢r7ıÄÄ4ånòoÆ¹?›…Ügó”_pÿõŠ@è¯¾èh ¾û¦|“º
yËgZcV=Õm):YêjÉlğŒ\¶¶ªÄì†Ö!gß4Ry¹Â² 1Ğu]y‚‹â„La[ñ¿‘~,l×A”¥*ÿö·w©É³Eê&j‘RÅ¢ßÿ¦¶+íİı–rÀ>ÁÑ“|v8×€éÙƒéÉ53~¸4³‘¤\Ü~GÆ³Y›ı4(ÇÌäC¼ìñ1×¿áƒÖûò­®üª©ÜèxN—Peîî®!,à$ß¾_‚–ô¦ÚaŸ9Ú³æMyLŒr3ê¶V+$F³ç[[^Çû{¾›R7cÚ˜•„¦4I‘ØmËF¾‡Äõ¶àôa)z)¶ĞÁÁ†øÙñégåÓÏ–xzk»zù6>OúïÙ<•a
ÂÃZÇÖ¶wËÖ¶wEk?aZvØµ¡İeC»/DCÛ›aNÄÎÛzV5ŸE‹gÀÔ®2kçàôå»ìÂ€Îè<ñĞò0
é"™E ¶{ğœ"K0 SôK¶(@6Ú_é¬]!¬º®â1+go‰FŸ½°µùûæsFÆ¦;ª^q•\À{*»z¢¥Ù¿•´
ÓŸf”D¹\jñŒ.@pçÑlÔ±7óÈUez¼dšySøD±`Ëhí3Â JJSôH¨ dtí¥“ÙÒà¿s}JXÙõ‰œ2PJà,~UJV«Fœ	+Vn(U«’r¸hÎÈù‘ ÕøÊµ¬)Y
«5¸?•¶¥ıg×»æ6”€¥”[5aZqc„A*"®yˆ‚2æz[gØÕGÄ)¹^“ÁJÜ·…ƒf¢Ô1®z~DMß»`1Ï¼xf¨>Ù‹Hy½û³$h/G‹»ğt²k4y±¾úµõ4â$ÅF)Òf¿çM'Ç=fé2Øï9æ1Í´¹+r |ñu'?fixKW¿tM¨Y—¥,l,O”Œ?„VÌ«+ßa\İÁj—ÔÌ8Ş³$bÆQø„‹V8¼F }!tæ ;ÈAv;ó®8aº':ä]TÌùô¬ÁÔ€¸ÒQ‚uºÙkJæ®Açl
µÈ5õÈ<ş¸Wë{"“õ›9‚Q!¬ó	¨Ãë6­ãb7·’{!œ0a	¸,Â·V~·«üu8h-M¼”…„#_""S4LS šÒdû¶%Áç:’>¶‹~§BLhfîìmnlmb`×®÷©éM[•ˆ³dN·2¡‚øÎÍ÷;—8D]°ó¢‘!hèoÿ\’¨åFŒat&íµ½\®k˜?ì‘@İ÷Lüø—¾ï#†§G¬%r.R2Äà¯é…ê¯L¢pÍº·dá‹–j¾ÛY¬ ñ‡¦ûdt2úUtı×¿ñ/Ù]sì KÂ(r} LØ"}Õã}tK½S­­Kb©PærÎıœküy\d§Hí™72mµ’»Öb·D0šÈÍ.÷3fp(çä	ÒÂî<)¾Hr#MB8F`g¼
ÌÉ6Ï¬y°—~Î°g=ëI ÇÙW]Æ¬Ò§ÅlŸğã­ûq¯DÔ:Šô9§ß—/‚Ô“g¡AjVbY›b±ğÃca)ps÷1Kæ±·€£~ƒÁ¢LĞ`¤Ÿ]!fÿ›y1›n‘€@.O£0P6æÚÔÄzŠ9HÉS	ÑZUäÄL}İÜAHV0-˜<ö»¢;6hºM>–!»LWeÌÆkIô•gxóí	ÜÃvÀÈ¡ŞyÏ®-Ç{ÏšW[í®ú*¸»†ƒÏ¿ì¼À=]‹ü–Ôv-/-+¯h¦Å .7gÖ€Œ×IÚ!¶4óFR¹Aå‰p@P[â(a	Hƒ6Y©Rÿ«	-×elç~–È ŠKN-Ck
³èÁŠºzà0õv	sn•HDVıb2M¼í‘D—5§ƒ_çÑ¬”‹¢‹«³¦‚1~ï]Ó[Z„£ÓKàö•›¸¥•ä'L²ù–éìŞ–õ¶ÚôÈK–Nf¯Ì]ßDÜ”a}F,KÆÀY÷4i3ugTÆ-˜¤&­c«¡uË³4.Æˆ]ÑÄ–GK~TôÔ3¢šˆ£¶ãj»!£èl62œx¡˜„İæŠlïjñ?Šü#¶Ø¶[•dˆÇqï»3^îjìù%ókø¬g–Ü]f#wzó«^Z×PÒFÙÙ–á®Ó8š3˜ëõ½v[Jyí¤.ÌĞ­˜ÈŒ‡É?h¡å•#¶®Ğ›Š»\·C^zéG×ƒ[^×ÁE/€ö@"ÜªüÆB»0úNrrè¢ßÏ\İ1ŠLØÿ9»•j¾X÷¦÷ò	®ÊF^¥¨ÔvlwI¤VÏ]«Œ•²è¥Q§ğ´Z½ÆÀ×š’‡Îİí\*§Öª’ø9«25U–8'ğ†”ÁP~ÙÚã´—ûù@a¸wHê¥>+Ú¥sHQân—‘X…^İ˜ï~ÓÊÚÊ:µ4ñF¬`¥d}Ë{_şóÚ*räD‡ò˜E„…µBå™©¼rÆ}.âx7„ıÌ`4_Å²èi»›®ÙëÒ¸­ãIqx›²„l­Íí]ôĞşàİ°ikíœ®p@Fû†aÔŠÓ§J!¯kóÍªcĞÃç"4•M©ÍNÈÔÍ†ÕqèWÒæ)®Ğyší“»Êñc˜pËët˜jıí«šI„®.¸Èıê:]VjÓ¹ÎN&´»S†PÚûc×&«ËM¯¬.5 "jâl­#ºyE~ãX<Óf7r‰bãÛâ$Ø(€4áeò3§WÃ=k©Úè_sé|#]¶R«øè¦ÎZÍ:iMåÇ6DrW—î†ãS>fÔ<ëW=åË£Ò	)ÈãdJ¾ÓËÎ¸P™2Ì4¤h°/¨×•4{^¸´åX•9«ÌF'¡·,á
üÃá6Â ª{VK³eA.•Í|5d¬\RhÄ:XŒÔÕÕ6ğèÍ	V£­¸lVdËËİŞáràuÙ±Çpâ¤_Ó†åZé~C\z»şÄs%ÎYĞPWP¿TÛ2¯ÊeØ”Å«İ’¢NÚãnÈÖ’ıîöãEL“ÙöÜŒ:…‹ˆÊ¡î"ßg¹:Cìá–\Äì“ö˜—MÒ[MÀ‰Ô$Äkm>yBŞ?Â_ësv›ô?¯ÉïÈ¦®ö 4*3´8JÈ7yQ•[Dâ•aõÈâx¼i•UfS¹XfÔ*lJmLEåqıî¤^\¬8Ú-!ĞwÇá=÷µ+¥şˆÑå…XOÒlÊ×-±M¦ê‰îàGr~¾ä8‹CÏ÷¿–qH«o¨.7 ÀK&_×ˆ\ì’ËC?!xÌU4g_Ç¸Î¼)?@—]%ñôW8°Sš¿¶ÔÈÒ˜Ñ$‹Yüm8Nˆ<ËŒ¦)æà‡ö&ºúZFôcgÿ ¾ã˜šçéú,
XEÁ£“‹Å°ÖÈ¿“ÖIÆeùÆ/?‡§ylÄ)t’ùÀ,–œ‰ü@;fŸ˜-øX.³z>Äı'áe,ˆÜév,Ò-ºYİşå'1‡ï^væÄÓ'h{4L€¸ë<QB}ûo"~53ô#ıèÜlK2E±kFÔ§±Ç–cB¼Qe°<¿fˆßZerë—AÄÍºm…Œ¼E/y™õí‚,Í±şwSí8¨šltÀA¦ş«»»¢Üó>Ù|Jàß­=rß^®'Jwoñ»7Û7×¤VşøYŞ»ÊAÂ€C®h˜êLì•îU·ôêÖ$Û<Ö:µî±æĞ¼ËíZéÅ@„yÿz&©/*º‘ôäíM¥¬#.]zãlÇpÇûõ\yY0áÉ9ışäíÃ‹áÛ*•ŸS'¡— Áy	¦Àå4{HãL¹‘f;ÊA©ò·”˜<'®éñsIÃı1)Z‘#ßGØçÁ0¡)/ÉSÔ#˜Ûw7Ã½1KOÙÚèìœœÑCdXòöG¦"ÈÅÇ@ú«¼å<}0ö4ğßõ)Å>ñ"’HYrMJOä6bë(›³L¤wŒé5v¦:d¾F…Î²FD	‹ C„Ìijğõ¼…¼û4¨ç>–©¼Kó˜MQ¥>t>a*ÌGB²šPÍ€2+òÀŸÕöİ=L‹2WW½¡+Ï²ÂíŒ©EqNQ6]2}x^,—Ô+mÓcøùïáÛÉğtø–Ÿü4<ÿ0"pËÙğíë·mjİi}IÉ2°ÃÓÁ”qÂ?y!&l©ÒqÚ€Ş•w0ğ5áÄ¾§Ë–RK'|¾^bä6®pnÿ)Å»Ñ„fôwñç!'÷¢ÀHsÓÌøšÙœ®©éWİíŒF#³´.
@Ú»[ıF‡Ùˆó ìùµ—¢	øÀÿ’§0Âx3Æb8\yÒ¯²-\¢ÓŠhò•ÌX‘¨uÊ@ñ°oı\m^Ëçïç,¡4¼ôrfHE»dÆé’¢aÎ2?Ò˜tÁü/<-Xæ=ºŒ|/‚íì-@y+–”zÁØãT_ªŸKOÉ$ŸxtÀÀ©ŠU‘®0-#•]‘qùºÃÓÏ5/Ãyê}ò¼+×]ÆRÃØiüÿSå²7¡(­‹A™Oè+áG~œ&8”àûù§£?ØÈù…J”›¦á_z{¹İ_ªĞ´\Z‹\ÑÁ¿å›k_Âƒ88ip’¥Xı†u¸¸Äó½ğ2R´ç¡I¯˜Î	]POÉğüCdIa¨ÌïùÇŒ¦Ép±xªhOğó¢.-®"ô2[‡ãÅë‹á9üûşçáCb›@ ©7¥sE{0?û9…½}K	À•(ò‡ˆBÌ{€4#eç°pÊWM%fh=Í6ÏrÃ|§cé\!ıO ˆ)P:ÁÖ~¯·¦=ø£[¤ƒ³äªiıÍ£YtÍ8‹¦Ôï§qÆ”7·R¼êÚÜÍ€×Ú)Õ8)ôH(G˜Ş0Axò«ŠÅ*Œµ&Dj%³ºÀ£®üL‹OE¿RCºÜ€ÑhÚ®l
§,©J7‹à.óˆms†Ê¢óJıyïù„(Zí£ínùf„èˆ¿óÖÊ§°Ç‘ZV»D¢•Ã´µ‡0¨ñ[X:Ø$ÿ7ØŞSM{#}CÊõıyãÙOo˜ÆÑb0†“€§²µgFk”Á«f˜I04sŸl®¿Ü{Z³Ò¨	¼f¢ÉŸÛª=´¥~„× Û›Wwƒ-Ë®ifKW1ùr¨L\QÕÇ³Ó:ÖA•c! %
rG7úUã-çvÑ™±t”•QøùÖ]²œcJ3TS­—)²©´+½ìJÛætŸ¡‡šœ>»gˆÀ0§—-¨*[Smv/LÆÃ&pšoušÆ$}'46£üW…åèe)ÍğéÜ‘àft<ÜØïsƒá!8ZXRd’Áó¡×úªn0ºÏˆÚ>w/©Ÿèdò®K‹;{ÍCö¥\äM"ívH—9mµ4]JÔ×ıIê,QËK‚ÿc·²½&JMB:WO¯4¹ê:1Åv“mŠÖÜXÜ¢&%íµ1d¶¤I´¨v•Ú´¦WÍ…‚PZ;¾²dêLĞ’“ir»Œ¦1µ…´²†*Í (êkÚ£ Ï¹-[mãÍ‹ı¹ÊMÊ±§†Ê#µ"+	–“­ÃëäÂƒÿÌsÛïÅÉñğ”Ï‡šÖO‡Ã7 ¸è0æ‰Í±$‘›bÍÔò‹¸$\Z®ŒYßª5qÉ=«å\%ÙdÂ¦
^ß;&ƒí5«dÛ":E–Yi&Vø¶tl¿0¥è@€"Í‰W-çÒtzË˜’&Üo¯~üºF¾¾89%§hÕÖÏ¯ÑìÃÆÜOûÓwo8y6ws6BzäÃÛ‹§äìõ›áÛŸ?\À¦UU!£œĞèÌpQV°(	*ê”¥Ş¼6È·Ï”b‘£AÅ
+‚€ƒ2¬ˆÎÑÀŠÒï>vÖ€jø±k…ªë P¥‘Á¥4Bƒö]³šúZº¿¦ÃZ8>=ãWnó…m¡2–ÑÁúÍÿUè»
¤¤9*Qj~Gè¯H ×Õ%ÆJµåª9H§9,ig‹Nr°EÂ¯ŒO<j5âÄé>íF››¬9õ•èà<ÿ:Õ®+|ØRØ_É3ğ2WÎj~„f5Ü9æ<*áPˆ:…`pÙj´*ÙtgmLÚ¥ßëšı@
'»ûd$ÉÑûÇDI¯0¶ •Œ~w<ù¡xä×à*H{MVg}ëåÕ°sæc©FÑ˜±"¹àÕ]ñ©¹ŒÀyövŞÒ«»Æíû?,¦òıÒíûE^Wí~é‹öı¢Œï¨ìyó›öyNŞš”ï‘N/5)heŸı, éHlÓ'dÃÌÄ	Ú#ÿS£fyƒd(öËK‹eÊbö3%®H3
N¦8œ›Ÿ@‡Á«ãÛ1U4Xİl[¾^˜ùB
ß+ÑÉß–°ĞìÃjeÈëÑN8øÎdn¨‹åçâlØR‰?Ætšqéïİ‚ÂôùLU§ö¹õ`ºÏ?ÇÑ5~6ÖIâMt¡’Ç6Ã€ê'"«¬s·U8S©ŒA6œË§Y’âA{Ë|œù=áFâå_í¶TÕÚ½Û’Y®:/<X[ôşİû‹á2|óáìí	Æ¦¾Í`tòæ5ƒáñÙÉÛ“ÑÅ{µ²d¨v%›–…q«uöË¦eR¥“Õ6Œ^N=ÌæYÁ;Nå–¼$}!DŞd~–¨ô…Š7‰¬Üæ±‰Â9‚[Ë­¬èĞ<ïÍ‚§nA4DÃï(Z›ĞR”×+@“’ÚôXÔšcÍƒK—¡M,Ÿ‚Z™2l,æ‘Y°ÈæšÈ!bêK˜›âèöÀ:9¦Él!ËA›HulêñÎgY]åoQ6° Z¤¶×Š±ÊÃ±²Bd0Tìœˆ>R6ÆÛH3Œ(áö³,ÈÅygù4&¼gp%±‡Š¯Z<ù?2ĞhVz&'áÔ›Ğ1¹lÜ¹U¯<	jõÊ·åòå»ş£`ùEˆönÍµ]Fi·uÛÒg—h\Ó:®§°,—lGbO²®¬TñyV`ÚmóĞe‚³!®Z{
<¸¬zÅ4Êˆ†	\D 	æµUv®Dç‡Â a Ò™jÉuıÒóô™ÊıÄfÎYç™ÌpS?¿‹C]³øæ(Ôñ=İ#ÿú—Ñ€kk€†½5UĞ^E^¶òç{} çæVğa±Î_r#9Â¶·G3ùSîÂşsìì3Šj»¨\tQœW³ÅËEXÕY{;A¼G½dè“W¿ı®öãå]’ş78”5Pq0¸pó£şü.bÃÓÖ­ü’~lá™¼¹2GS`†$ˆ‚eÙÖóú‡|¬Y¸ Ş´§ãlxÕQ'´·içêş/æ¨}oÎ+”³&šAÒpF)ûspG!÷”|%ø/-ş¼_è	øohÍ¶(¹æØ‰kæ[™¼ª³İpjb9?æÛcUü@¿Û,Ï•}‹—|ïÆÅÅÍæåNÍ˜9zÎ ùøt\RÏãt«³i6ap6fÁS"–>’‡öi€°AOÉ¦öá°œ<¦X‹ÑhÂòZÙbÍşÍ17¤ˆVzT½°¾b³pÇ?¶ÖèÄ4’Ó(©H,_y(¾j™·rSâˆÑx2#ODÍßƒìäud8ÍˆróÖt«×WÅ×":$G@T WÒ'ÂŸ¼‚Gİ8GéAg0Iô…lml“AUBı–áTâ _,Ÿiè#lQFr­9%HeÌâ)¦¸¡tƒ¦äC¿÷‚P4¿=iàyP‘hGMÍzTuå†µ§ÜJÊ)"üÁK²ˆ±êímU£Ó¹¾ç·µp¡ºŠ_ã>Æ’†ÕÕRÕ¹FÔCõ]1÷ÓOš]]L¨)ÔÄéÓò‘Ö¦§%—óºvì“ŞïÙRÄ ßh€÷ä°ôš'Ö’ˆ¥‹
™M¼ä&f+w¡.\£5nÂ]É-oD“z4.ğ´|ü*f&*©¶é¿•„ @t‘¨…–ƒtÆèTÃ™ÒXéŒn•¹qHÔ¨ªÒ0õ-Cú3tS™2ˆ¡®œ?	ê<ØHgK5q2ZîÑÜ„gI¡¡ÛkÄ]gÆ¤$šå{a-³}ÈÓMæÌ‡vÁ6?g–gÌ.Xga$ÔÉÓ<ÑàKtaˆ™Û1Ì½îÜ	ø%VK	Úı|£ém½ãšbIÚmx'”6›Í¹*—º«Å¦Z¸ÀºF õ¼º{îXP¶X‹­m)ÆPY´ƒÄuascË
`ÒqÌ1*ÖŠc¶BO’gÕbl.«ÆYîÓCÒtªëiyõféÍÁ´deÍû\îœzÕeFæ1ü‡°¥­EqV«SkÊ~9T5çTn¤šCR¿ÍØÜzå…¼î‹ØL¼æŸ…ÌÍ“tİWÎîŠÜÂÙtGäï\÷bv¹¢G¢kİºÔÁbíMŠöé¼èM­o…Fo4Eh-„†§6ĞÛMÙ8mô´rõü]†îàÌîkÜ¼z]Ef¾QO#kî;ªÊvßŞ‰z?l:*,Ò^“òšUÅ8ÊB	a"ªŒæXØR:ÕØÚ*q]“ÉËwqNã¥Éo*g?„Şİ»<iâFn#®`ãİ‘â«~z†¹î_%HÖºÚX¦zi8[·MæOÅàdÃŞr¹>şœäÌ0>RÿÕ¼Ã©2…Úê\Æ%ØÁ5s…]*7Ø­0š¢û÷B_±÷Şi«¹•É0Áõ–‚c^^×eXƒUõşï·œöäˆ‡­Gîjgñ—İLö-TÄKí™fpx±ÔÁáz´HUˆÖsm"óÆ‹Ê\Ø¹^êäpjojú1·Úê&Pç±lOcñË’3ùîôŸäb.æñßËvwÜ®µ°ºUÂR$Êb©Ù+Éƒ,220¸9ÓUğCÅéÕày¹­RoĞ4–­ª9ÄÄÛ9–óŞÜş§mìÄwš39ÍrÜO„Ÿ³P‡úX]n…šlô¥Wxñ2 ©•dµ'”[«Tn÷^*uhQf«j*É%ºU÷s¡²{ÊëíÂ=¥÷?+Q¾ğHäe
^©Mjª‡ĞØˆwªÆñoÕ½Qˆ¿îµÒw£ë¸S>¢~‹Kö–Î}ÌRêù°åŠ/Ì÷YB~@PÓ	ÂRóº-õP$ï#fˆçÍ>4UMUÔA¿qOŸÀMo±¶Ç0Â@ë‹3BÌ™ò4ÕPq‹ ˆ‹İ ÂQ——<0  	xªâÅÄ¥±~›7‹t¿zaÅ¸W…¨&{åyîÚ®wÍÚßlf8øà	“gRŞ·ô•*iCªÈy]j¡ğz"rîxÁ%¾ë÷[IØ&æÑÙ®ab”u4UŒ#¾›}›B¯ƒ•©MŒùÌÓ&ß|xóa4|k<
­ Äâz2Î|ÿï9±Lï]•éö²™M5]»ÊüÈ§yŸÈóÛ¨Òù¦"ëĞd³/2õæúå øì²ª]êäh·Nø¶¾ll%Ÿl;Àx‰zÌŠM­$–=)fJRá$¬îÜhA»îTÀ’Şr|ùs²åQŒh 1Œ®½+qŠ"œíüœ|JªxK]Oåi¡;·$±>—µõ ¿e6óç‡Ù)*ƒ¡ğ£î÷’ÅÂd=©[ë+È—m±<‘µWÌ1”hKad†™K£Î!E`äFN(
ó¶‰$‚õ…öÜ³^eq	¨9Ñh£`†K˜S›m¬Šîà0ŠæïëëRóWJè(v™Ş’cZµÇN¡js<¡Ê¡¥Ò­ôKb>5¹ùZ¼ ¨•0áğø³2’|ô1q™˜‰œãfa&…Eª:Ÿû<Îæk‰°uÈ-·‰şL2…AÙĞ#$¸ˆ­íd¨¦Æ„”‘Ş€½_ZRF‹… ´8ÄúSÆèÍAG ´TçjqÕØ¬*"úåR}W1z0ƒ4ŒaÇQPÆÃwÊVÛUR‡šjà…ƒê—\vÖÁÕ¬[¨©ˆhR
Ê?ˆH´sëa?·Ì^…Ól­ÈïQgE½4èIÚÂû©ƒ¶;xN.Ş!4ÑÅ‡·?şÈË¹mÛjºv¨ĞBÕ\›Ü‰ÄK³¡ÕÁÖáG`É6­_NâQq9‰IÅµ
q©ŞV'±©¸ô¸®Õõ ´L©¡¥\ËnTå¸ÕUœvÕ(­æôÆîfİ³©¨{P3ì–ƒX]&aH\îRº¸:áêHpI´Jïâ²Èğâó‡VrìáPêÙæV²1‰ù:8@,Ö*ÙNdj£™É×=¬€5ßoˆ›ÎGãlÏÍŞ]+H °ee@´sàÄ§lì}äjj¥°jsmëÓ=Û³Hk§vÃ„«®\wÖÁÂ]ÓŞØp°ğ¶¤µ²`‚ MË­¯¼–™»­º¨#¥±ì]-ï€ô' ÃÎ	ÌçÿÑ™mSÅlAŸ¦ğàS2MÆkëÜq€«
8,°TÂ-ÓÔ¼ ÜÌ|ü‹!ßX¬ÒÇ­5‹Ÿ-AÜæÇ‹[¡X·Ï "š™çÊ^ğ\«'ˆw›QŸœÓ[yûnÁ«_-+[¿høœ]÷´ÛU¹£ZĞ/åwİ&…)0Mæ×1½5%÷îÂœ‰*¤Oª85NHµ<èDêÀK™şVäÎ!†#ˆşp‚VIf­³šíÁÆß2ì$]™§×lSŸn'ß§N½kT>ÖæŞU’E÷\»F16<­¸´8ŸÀ2Ï²Ğ”-åÒœ[öXıºàõ].X“7¯¤‡qSâÎÊÏÖ·N³WT°9/¹õÊúiªZrØÎ)kNjçİrâ®ƒ(ë.Z“åäá['²¸Ñ”DW¿Ê„:k‚XùD›à^rëìáx¹*²"UŒN))j]µ­ñ€Ğ¸‰Luàc0ŠËbYŞç°Fn±„üâÔ·õõõ®”Œ×
©/-šJıú§Û€’(Nû}ZX Æë·äˆ¡üƒ‹şğ:œŞ†ë¬ØÒ£êO•Â7Xó¤êWmµJ™lØªYU—ë–QÿîŠR²YAVĞq‰I ¹Ù}ş.”ûœ¸n/Ë€\RÊ:1Fèjì«.1Âhµ¬5ª6äNP'¡¥>˜ºİ…[]Ï­ZÇ\ƒüQû/LQûeğv§,Ns×‹¹˜$¢ı»M“İº~áiá%£ÅP¬¬<ÍXÎØsşÛi'í™/ëç}i?c¡°ğHI+Ÿaúo–)ÖÏ-§YüÕgñıç›haÚ<DìÙı‚‡Ä—a94òÕ-£F¾Av7@óâuû&Ì[¤Ñ9`i¿{bûÂ+î&QÊ×”[‘ö¹b™çs)w¿)àvoëŞÁ¯};KùÌ‘auWoÏb± ²MĞÎ¸Ä4vî¹&@©°*ÃX»zŸÅÀÙJÃ2ù¢[YXU$k3’H[N×+-üˆÛÖmÃuåµœ0X7F‹WĞu‰t¡ËÏ\µõêÚ°Š«®#îc O—L5ùZâäV…+ÃÍX8µ×Õ¾e©#àa‡@½HähGXÃv
¡'Sòœ€ ß{v~¢<¿hrNÈ²§XÎ„åqôsõ}	–^ÀµÄ,94oë/zM½”§Ûİ‚x/œIËœxåYæh\â\ÀK5<gb™Æ°nÎäÚR+[+[Ø_êõ«rğz  ƒW!ì,Û…Ò(¸lP^â©U¹˜»|;øø0ÕÍv¹BvMá€ê¯­§ÑÉè]nDq28êúÄıµg,EÓ‡t­—;€/˜ïÃáĞ±yäÓÙZîğÀ´qièäAÃí´·cƒË6_¿½{<8¾ı0|3øö×b=Œ®ûk÷¿-;Àûe\Ï»±<³x€8×ÊDz¼–E÷ƒ¸³2`Rêˆõ¥RPGæĞ!24BŠºéªúÕÚä7‹ĞUë*&r×»^½ê.iä’AgK…¸ªšËí®¤¼ìN9xÕã¬Erû YxKÈ¾V JÕÕ]}—@qãÆ³<@¨»Y,ïA×i[FKr
h]º_]ŒvnÎSŞ»Ğ!ÔW)Ò¸I/"ßâdÖùGõ}¦Ô‘2Sç,K9Ì	ù!Šƒ¥ÃÛä¤äGmÓB-¸Ç·iĞ\t~œ2Œpsùæ#°»]ÂÜ_…£l  ÇŒ†SŸD¢”øÒÇSQØÑOw‹„oê¶œ`İ¨ºĞÑaû¹à©.n. …~oÊÈ.~ÜzÆd=¥¿*ÙlšÙş™%IÒ˜öXN„ğdqâ½†äÇ\tÒÃÈ(—-s°ıI3ğ+^ö3dÄÒ(vÙ–x¹ªŸ›ü®½t6é5õÿXËŸ†1du¾Z"´§hlÜÃ7cîğ6|©o¬Ö-—Ê§9ØÌ‹Úe&AÿıÂ&ölğY»¯¯T¿ÄF3t¾ÛI"fÿ›y1³G^^øª·çâl‘Ë1Á¬F³}Oº<›×]Jo†<ÉÎ Tõ—.ò§İj/Õ/)áw»ï‚c¬¹$ÕUÒvÛfÉ-§ö¡»ÉAZlï'£éa»Éo­µŸi r3šps:Är»mœbëLfl2G7.œ˜ß‹Ş©d]_Ü¼RfAW‹lİlæ}Q½¨¢ï¼5^mºõ¬Ø9¢á©´iu9™Öê¥êr‹˜´;v6Û…ŠkEÉJ4ıMrÍ¡_gü_™”ìKå`IŒŸ± "äˆ‚ICÇ´í‚[î«‹k±Ñ²}¿@ŠƒK:e0kn‰1ŸáDÄ+ŸÍSkÅë1Í	NÇ#¿Õu§Û‹
6/éT»È|/!¦†OÑ£ÊÏ¸s;†å{9„\	‡™‹]S[q°y•'¡3OÑ†^ázâõ»8ñrÙŞ.öB+fµÃÙê¤P	òK¸•Ã6À*"½©|×ä_ÿ"ß¸
Ju=ª¨0YÃ>«ê¤Mi0Ğèå‚ÎJ˜VHP€"m¹(eK¤j-’C'ÿî¹[^ƒÀ<*M”­ ÷¶6lZ™!A¢
'ØÿfEë­­{­ÛÂ¾·¡ò¸»Ëáni[_z2òxæFêìÅ&¯ç	›g ÛÃGmva§®ş”û„Û¸”]ë>Ø@ËìJ²ÌKƒûO^sy«.Ì,5n°·?ÜtrwÌåœ9dŒ¯6Gİ*R‰iöÜl0fLc~G‡óÊÍü×6şÃäŒ£h~M©_ Õ6b!¬"Éj¼ò†C®fÃ¯>è
íçàe·*ypm;o|— rkÇ¥wa]Ñ[ş‚+ø‚p‰üÜO÷Ğ ~f¡÷u‚¼/¤.‘½Ÿ¿otÈÊ:÷õ¢Ö	¤ uÆäJW†É•J‰QI6Aº(×_0üêƒ0VµŞRi(q*.™ğ‡ACXrçàÕa÷àµºT´¶Ì.Âëñà»?^ŸÄŒ×/N×}ì~ˆ€Ü§Õ/1Û]Ò›ÇÅwHoşôèe ~‡‡Ğ–T­{—°æµ-ß)#&<í˜1¥·û=¸,ö&ƒ«9œæqÌ`;t|Ñ/–|ñ}§ Ï])İ¥†ömÈä¨‰\ƒ.·—kÕYçLÇ4ÈÔK}nu_İÍîâê½Z¾Í¸½A§lÄ‘¯_…Fš¶u+Øö€ß‡ãê6ø¯ ÿAà¯gCD&=ö¼>"òC‡nHqq®HBßj·b¯UİÓ×=V]İPŠ8øA‡ºn|\ì?=G^íä!€éÍ_p¿8ÏÆñú†êúĞ7:íËd•İõ¿³HJµÎ-ä/ù9uÍâ#  şÚºN|àI¿xSnÉé­iëè{ıEP6ü]dâa¥"?ÏÇ¹¨¬Sü|îsÃS’Küƒ8Á;§ÿé÷{!dÊ![zA³’FŸKN… ªİşºİİàËov¼„Ù;¤)õçjK¨zŸ«{ ëšÌ¶+¾ĞÚçE\/ÂËûK~ù¯nèuËîÅn6…ÇSŠÿÊğ¬]šB÷UiğöcG6õÏÕ-AågŒ<¹ ã}2âæÿ<eñHlÕ'ÄÌ(œx¾GQË®G¡Üñše¡³€?Øk2i]‘s}qó­½¦„Ó¡¦¹1¨÷™²şH³Ê¸<á8=?o‚É8¢ñ´]|¾]¥^É,/d†!QWğNQÊ,ÿCXàöâ¯š[k¨—İ­—,8tÑTS]WÖ¬¥YË—m“_´(?k—µãß©j•)w9;˜îóÏqtŸ•Š_f¤+B§«xfè,"bÔf–fªpµ’{››Û9qå_í¶ÎØÚ½;{õP©ğ>Têüİ{¬—6:ıcHÎ>\G'¸[_Ÿ¾{;:ys*ùŠÎ>s0ÛÑH«E÷cN+£V=®ï+½c[b0ıSæg4&X²·³e_Ûyn’–õ:…•&ìívÅ#MZV.…3ŸeI–ä ò ®rW+¯i`tº(|®/é0g,ª€Øô}Á yè:×„·u{ğ)ôÈnƒvTn°€74¡ğ0sFø&bá¿qJñ>¦4Ã.j’Êñ¨z©Âo@³E’E‹)îæÔpú…|ŞR•ÛXY›Gsj7ªA†·Ëé¶–„¥à€
_®)k§¼û=£I:İz\Â9„‚Óı¯ã8Š-w$â^ˆ5ûiœ1Í»AÃ\'¸Ş¶0Kç\J
Ì¿SÅÖ¢4aGÖ¢Iu:U`
–À@şà^Ìn¸©²Ò·zWœûYräÅ¿¬R»§-¥yzRp©CgJªÖÉßê3®ı¥*PEÿÈ€VE‰Ö“pêMPêJ¬BGú#	öëğ
È®æ¤TH2biœ(ê²‰Î@TóT¯³î|–3cv¤ÃT:HŸIQÊJ6Ş’F¶e58{4gƒ_€ÄáHWÆã”VVQ÷E]IÕ£¹+Ç5;xp."T"ë‡k·“_ÙEDÔq×/
C :C4=ÒòXÁZíá8ıÄsÒOÖƒãPé¿YOc/ ¥ÀBÍÈwĞ¿-L§¸O6VÉêbÏÚF.!ôÖ´q2Æ*–†Ú•#MQq˜˜Ù×Í<ÚîTÆÑ.ºügC9/êÒßãprVÅ80øÍ(¯‡Ò‘•÷ÏÁGô&ºÎ§iÄ,Íâ\R?aú'ò»Lvx÷:TN¥ƒ[µ©D@¥º0şÀ3ğOKNĞ Ò?åOË(äïÈ¦ö6íTŞÿÅ“µïÍyr‰<Ğ‚'°ñå‹˜…¨½Xü9Ør)ÑQSfÒ
s‘˜ëÀšMµ¯î
ş¬ÙÉ{”÷tó³i6apfp8‘˜äßá¥yPÇ!ÅÏì)ÙÔ6Ò!BèÇ”T•—\XÒ!çoúgbHŸARğ`~Ô7Ûú„tÈÙGrb±°1FæÀÊVÍÌÜÙÙŠÚJXšA”Ê%L.E>h%ÆÁu5E‰ˆ AëI°~ÂY+
8ÊšDj	ŞÊÇRµßYnu}—Ş®÷¡ËçÇ¸v~Œóà<74ÆäµşÚcŠ¯ZÓ3ê…Qñ`ŠÈhá{)ÆŒv7™vGK.0’áõXèaŸ‹œÓnho5ùõäoï‘Ü«ŞÌ+ãO|oŞË­d4ÛCåÖÅ0f	¸™Ç0×¿ÙÚîİWa„6L	áÓŞkŞ’‡~·rÉ·¢£;–h/}ÇğÙê;ŞÑ¥™Ã :W¬Îg¥F±Ğ¢Q‹?­·—£äài²U¸QÕ=ĞbU(<¨xFË‹ºiˆ§>¦—)º y‡niˆ`Íè‹„C\ø=ï¤¦
ß !X¦¹ÜE¼ƒ¦{#Fã‰úÕrU"üÉCÕ£E‘•nMİÍıIšŒaÉ«fR“Aiìİx{22 ¡åøgÅéÆ§Fwf¨pÏÎêº¢ŸÕåmğ‚,b˜Şw8Ç¡€‰If/*êCÆ ËZ|ŞŠ£PB†K iU¤E%MDÇÔ§Ó¶ŞÊõÔIò(- È  ©yM5èjFdú(â#€>fT–Çå±÷ (FÜ¨!‡C$šsF3äƒşá“ğ2rBÑ5!å¸HÖ›´')_i¯H9ÎÍãÔGi‘0:à_ä:›z™şä»‚>›5ärgÌR„-Q¬D…Øs®PÌø–	ÓÂ¬?
à‡€…,È ¦ ägp.Ãñ£8aIFXæ ]S˜®9rA¯0Ğ¥½f<W?×g¬Ê™PÍ’\AÅì±İ
Ğ:ºÊ–Í“z'&cF“c6NÑT!¦¥æ³°?¢§ñ|®ZìZõĞøÜæGë%GYÃÌù·£\‹±”Øl(;ß
{µ7as9ø¶ˆvGŒ¨^ÙK´ÕŒ¹Bôòíjbúfuß–È9µf™Ú¶‰&¡Sebm=ÚTÏ¤Õ¯rvChØÕà˜ËĞì¯“!UhHVs¥|¨¾_„ç Œà4—,Œ.h>A[Ú	r©×ƒ×Å•_›É8ê
çĞa:d×÷ªµ/ 1dÄ—d££5ğ*RÔ>p—ù=eû®I‚¦Î¸Öí		eê%lœ¥nx®Nß¶lşzŒ›° ÉQ¿Ê•]rËfæ¯|\6>Úû:m·tô\qº—£«2£Î±‰Á–m5ûC3RØòĞ®0w…¼è˜8«æïUâ‹jâ÷ÔÎD‘ b16z+Ë´÷ä0ó8±şÏ°³œá|Üa-$\—‰ì’ñÜ=Ë¹E<’eîR½ë^¡J¹Z*ù`u Ä¯øëFñ§,Õ;œˆÜ=å÷3‘ MnÃ	éa‚‡·r5ğÒ‹ƒ.9ÿ¿ç<7+©à¹¦[F¾•U‡ïÿ'üŸPøS¸mmêÍEÅş$Ó+êå¦:‡ı¸Ş¡Ö¹~!ÚRÜ±[„bFÁwø¿"‹8
i—êÑ$›Ïy>Tt!Q´šæƒbç²LˆøïïÅÇ†OÉ‹ÁáSòrp´¶ß	ó¤wx 8
’V13]æ´´4	¨M˜TzM½èüÃbZ%„uC¨Ôÿn€0]a|@wÜ'5E²+üî‚ZğW×8ß/i²ëã,àøAEøŸ\éëŒ¤³˜Eam,üÏåZª+ ûx^$>¤…šòÕ½™ûN€›]Pˆp«åÛ¥ÛN#„bvEW—ßF<ªÁÊÑéò.PÏÔ+˜vWG(&…ôf¾ß©•{Â|œ?Ã$ö~¤ˆug#Hëcg^q6ŠTäÔÕm”Î÷ºŞévŸ#T–,…nIRhå®j e• 9•kÚM5
Ÿn2Xï¦Jª/¥—!Ê+k«VVÍjEÕ}l€2R½×IiıÅ€&£Åqõ­E ¥í¤‚´²çÂïæiDÿ‰pÀ]U ş¡)·Sœ öóÊâƒU?¿€–G<:¦ö*üB}{âïEÜIp¢ï x[T?¥{—k0¶:€£,Ô¤ú;æˆäœ†ÌWÿ)BûZıY*ÔO1Ôåƒÿ4#k¥©Æ>«Õ¨q+ÆÉ¡Œ¢fí« +›ån€)B—t{¯åk´’µ9…ÏĞ=G¾lùá¹òeS|,§_i¸¤¸š;Íê-´÷ê6élbÏİÍŞzÉ=\ôµ‡{cPU?.Rf7)¹™‘ìÖC.?ë×HÚ[¥IËlÚ¸¦u÷TD«’kVÔ–%5),Q7Jıì_di¶ĞN¾If2•C¦‡õàQœ’3àz<è0ºqæ}¼"`=v`gS…˜ßÅÃ·Z,ÛÄÆf{¶^D)ÖĞÒ4yJI*Fö×!‹=˜á„Æ”<!?Ğyê<Í¹Á+W7°ìˆøràÀ¶-ŒŞÈ€Ô¹^/—Iõ"c?šÌ-œ©(æÀvl.)uß‹`_%Îï¡›©Å=;ØúÿĞÓís/\«†%Uşºq‘}ÌŒŞ´¯w¥ „?ÛB},Š° ’û’K‚+…|Ù•öĞÇ^DÃ¶sô ³pâaò=êt¹‘`·*+oÔ˜…¤ËGV?Û:G‚©äen­–’vÈWñü¦ dA@ãÛNU„s± ÌÖŠâ¶DĞĞ ¬…„-F®›½is3,Lv5ZNò‹Í*9=èXzÅ%"àâÃÛßj’«¥;ÅØÃâ—{òuır±\»‡n—SwÙü
ğ)C»],ãF ˜úe ƒ©_.Ñ/.„à`cÕœ
~+N®™¨ÿ²~>ØÊz»FÌİ™3¿‹«K5TwbZ)-IHö¨·¬m{3K…Ÿ9ˆ6zÓ[Q€ˆve»Ùîmèà6!øŠÒ7Îæ<OfÎ‘[PCòÑ›ÓzÚj ÃM¬® T 0÷>R’Ò+Q}ÅÓğõc&r$]sÎİ>c<Ş…ñ9?ßED)‹Ò‡ó:“öœÏoùãôµÕátÔW Øgçèd4$ÃC8û‡o¿Ì¡ßJê9õ§ÑW{:åƒzœã©y$˜Ãº­3Y5µÜøø²CÔ {´à¸äØgÓW–ù"¯ˆ¥|RÇjiEŒ/K^‘ßÎK(óÑ[5¯
ÄH.°}ÒÂàîƒßlaQ˜så3fÔ·@[Ä°K	½k/MczM}™Â¼öçó¹´’¨yj,±µÎå€<}±Èk¼Z
®ñ.·`à«®xø2QÂõÔŞ‚Ú÷‹:p–ßåÏÁ,b3Ñ5Óúğ²d±('÷$”Ùå¦˜{,†‹-Eók ‡›0õ5!OJÑÄ®‹ĞPÚG¾ø@ò7ŠœpÓº%±³IÌÆg—cY*ÆFFÆŠxå€)§ìš~ôÆyÅ.CşDcĞF¢4ƒa±LJ-´Ä­€–Àü´Ùà—íífD’Î…V8ôÍİC‘'ª†V`%0v‘Ğ¥•Ha[
sJÊpKe1Ã:têU×z«?g¦çQ{Ø¡ öH_fåQ»è>‰h¢Ÿ¯h¡íUÒŒ8åM®x{hF{ÚÖ]7³^Çg·°Xåwìjœ*Î¹.1A4¸O­ûÛ”ölIhâr3g‰D\:¥$ö®é-MKÃ<&3Eq¹Õõs©èçVAı‡>­¯¯/kP^õñ±Øor)é¸baÚïÓÂŠ7^¿e å\ˆ¤ŠxÜm"ìøÅÅq,ÆÅU#óVğ­:5ãjô×dbnqWöÁúà±Ù=~ÂÙwt§Ê—ú>›³Ó;sŒCğC«¿¯rlNú¼AÇ¤óâªã¨4KùaO6+xé\R|!{í¿í–„!ø¹y¿Óó$Çla‹©?-eÜâo8‚‚yñËV÷*Ñûî^Sï“Y5uYåÿ¼U:¼2°vÓ>S»K{ZŠ*Æ]ŞaƒÅ©_î$ËÙÈÃ¨&øúº=µšåI
8Çdæ±OKs_Ü.oïßÂ(,b– …ìß°‡lL®½öøË•OÍÙØûˆ1ä´ø‹ğg 	*<0=×LÙj´ğ°ŸDÌ”ûJº'w¯˜³w;Ztä$éÖº´DéóåËw4Ò6¯„¥ïÙ„y‹ô":‡³*íwmAtH#Y,:ç[2å¡>@ÊİÍ%Êı¦0Ùµ¥ûé‡|ÖødL»&Â\à“ƒXÌú a¼}ç™ëØgÇ„¼âjÀC”•ì…¥·ámI<i†èYJ×? %ã;Œ´Ëƒ‰^±è‚ÈÙx‰Å,Éğ¼{è\C~MwÌteLÆ€91•,œvÀ<©µmˆÏTYúh×(x•¸^½§K:æDlà}·îqÆŞj„GDñ|õĞu´6>ôN‡[şÌgÄCN‰Ö91£áÔgGè‡òG‹Å?8AõQétVRŠK™Ä»)¥Ôõ ÕbdÅVÊoŒjƒÄ>šØ[\]ÉJdç–"•Kšnuug©»Õåfı©5ÿY…—ÊY½ˆ#D5€3 Y'S^ƒ“’ºQãƒ0rŠ‹ŸîrwÄÎè*&4ğM:‹
Ê9½…=šûµ—ê‰jH!ğz ^‹Îûß¼YõÒêƒäÕÕI¬ËÈ¬“ZW&·v–\»€Xğ»$éæU8ºøPEjÛâÌny®­êàêvlb4f—£j	™uõ¦NgµÍ¬aéÒBMÔnQCNT7<(QÆù‡ÆPZwl’×ºô=<U~æ¹ût¼O~ŠGQ°ñ
›ìèı‡cç½âR³IrG§Â£B%™åÿ\i¯‰cpPuCê°õSÿÕİÉ#xöÉæSÿní5wrE İ»ÅïİlŞªªsè‚Ç %A+Ê¥Š¥¨½H^v€ï3xA]{¶ƒ p-í:¦M&’:º÷`¶ÓRÉªd~ß³Rj~H‘Èp…¤F#ıá8aÀÅÚ»î`c¶£èT;½ˆU‘Õ¨äÕIÏ|„Ì°n]0öxXÖ5vnÎ;—…i¦RÎ¨‰ØÄ(bCAÿCEGÊQì‰XÅkÚvÖ*"ÉÕ8&nªš™Z!Ü&j+µ¼×7˜£~Á@ÿeqÒ/·ªÚ%ˆ;â@äñW1zĞóAbrGAéÁS¾Mõ›Ç£"Û¿ÒáÄÉšo»`J(/Ş°Ÿ ïlğr¯ F…>6lDåFnO’’»G×¡ÑiQWjç^Ssˆ«ú¯ç˜õ/m‚£Ñ®éKíéNÏ•-´Zï$¨­=zêË¯Äà©ü~ñğë8b“¶Ğ|`$ôË#ç1ûä±ëüÉcĞ£û¿üSûI"åİ‚…ı4Î˜ò	¥Ø‰°‹ìKNÖ5|—/LØäüaÄ|äG™#E‹¹}0E;ÖT”+ªùC Ïc:Ûø ÿHCÂ˜Ù5M]HºÒ.é`ç|%Kïó
ä¤Õ‚1ôKK32?K¼xâ³ªx^ë$®¢½5˜Cwl
T^Òâ‰:pë{Òã³µ½bLÓª­ƒZ¯•<Ò­­Ø!3…5VDã¶¿Æw)yå(^ZZ…˜g²u>qñ%ÍüTg¨à,iÈuà7O•Ó³#~÷ÈÅ.¬ïkpPå­Dgœ„¦¹2Õ§MÖïZOÿ?   ÿÿì}	wÛF²î_ióÍS‰Z½ilçP²ã(²dE”^Ş\o’ˆ\‚ÅËhôß_Uwh ½’”,9ÄÌ‰)hôR]U]ËW´ò±PÖh¦ç“ÇÒ‡Ô¦¢ÒÄ4iE-PZ¨†À£*ı!yL†^äÈ¨Ä–tI.¼0V­IVwHQgW>ëIôU9\‘ÚöĞYÉğí8{BoUcEĞSkhÉÙózÓN­{zóÉ¾–Æ~ÄŒ‘(Îù_&“PñÄ±Åİ9‹bìgš›rİ-o‡ÿş— «¾Æ¾1ä0G!{¾ƒõ÷kaµF/¤XS“AµÂoìe¸¼"ò,©*8ìƒıÎXfú„"×dÎµ´ûZò–YF\—±8¶Ôƒ¾Rù›êc'Ù¶Şü¹¶uùyƒ©{–è²gÛ„ò-¨ÆeÏéà7¾«ÆıÜ!è,H„÷~[™f!£0§XmäòÔz­—²˜ĞøO0/}Âõ¢÷§\“—ô ¡£ÈV9ó£?@ >{!b@¡In%K¹& Wà<§ÖuÙXL‡[eu÷/Õ[zT0+©ğlèuı°vÔ©rk*}aQmòÊ¡76–Â^Nß§èË|å¾#ÿÏ4ˆ|UfJ¹8¯ĞqĞMIT,ÒÍÕ¬’NëDÊKƒgØ¥*øOü™Y
‚aµÀÕ ¥‚ŞŠ‚àO…,ÅJyo†,WÏq¯î}÷Ès/·3s«¥WúYîxºk4úd­ÍøôÓµ=ÒÌe½+}æ~;"}ôW%Ò\>¿\òh»F–hõ(×|âYe6B[ªTªœZ³ötªO™Ëpî­È§Ãj®ÿ;şaır•4šl5•‹z¹52»·€€¸ş¶Õ‰óìFúúcÕ–0î)|¥ÙSÔ8ÕAã”®ÆÒ@Š×¤Ñ<EUı7­šÂ!»p;}=sÁÒ»É?™wwgG7Óqõ 6`ÕÔˆÛ^}±Ÿ?:ƒqÀ¼¼p £ç&n?œÀÁ8ĞÅÒì
¥ÙØ³u«£êyÕPF•{]ÅgöÜıE°ûÓ×6Å?rš‘m']QUC¡€<|kıi©›ãÜ%B
(‹M7¢'ÿãpOğ˜‚tó‡ÇÉ0ñ8·Œü=3‚
QETKÉ ²³½¼¤üJ‹ ¹çä©l0#[†·-ãÊö !Ğ*]	—'¥¿;«½ÆCr>î§4õşa¹ÓK
ìÜ<?}»¢cäòŒ†\šöeŒŞ-]©æ»ig}/TI|]öÀ¼L<Bã’ª`ƒ$™Æ»ëëı(øä·.'“ËĞoõ&£õ‹ ô×[­iÒ	Í¢%”ÂJ`ÔˆçÊûèCÅ³íÕ(³>©Ùœ´~U‘j!K®(e`<•LcyJ:~òúôàøMû¬}üAè£JõPÄ0®H}j´9n}u´Ã­HÙ®fwÏ2úÎùaçuçC©«»”;ò‚dª®Yá([C&·N[•‹¡¼~³‚ñ£*áWÉëÖ©ßUÉ@ÜÆöŠˆ-“H™É­fÖ4™GÉ§u!ĞªªuÚ™góÓØUg‹™ l6¶à†Ò©VË¿âß?ªµÏºOeË¡‰r5WùV­YuVtÛ€Ô«nmn–B`²jgñ4kjn)%‹¥RhsÁ~lq. 66®õÒ_MqªÒ†ë(rQY•oyàwèƒ’'drQ
•¢hÇ®±RO%¥‰d@€†Út†BkO¬‰ƒ*+r2à¡JÕXè3?b>AÉÊÈC–, +ñeÕÈô\SáÁ†_ä ÈWYØgl‡âU¸›[è,™6U«.hÚüêMÏßD^?¥ÅLöátÅkæI.—šıË¶)C²@ˆ.a)$d?È»-}roù¼)œ$…é6y–³¶|Ş›tL‘:pC?@ıßaf1oòHwõ!¹£swE%¼İùä§Öm”9¦J`Ì/S½ÜZhKZ™’o «Ğ›f”
ÚÏ5¡ö=O"
¦<‘c«¤¸TrDóƒ’y±D@c15RGNd 'xÒx)ºLÍ‡ê–œ£xˆf0öpQóô¨ñ2we ³½µÁµ‡°QŞÁ¢yìø>× õ™kF8Ik(É2¸‚vŒ‚8 HvƒÈÊ÷§DˆN§Ã3£XV‘{¾âÑ=_&ØZÚHÕH#İy9-+PÎ³$¼İùÁ2È®^›bàšª¨v–*ñ:xµKø"ÛôÅ Û¤^z=½Ô¸5”Æ^‡úÀËÿ:¢Py–72ˆü‹ùØìó™yëEã÷nè‡öù¾‘¾hŒ'“)$°²ş…E.ÃºBÅîÉ³»e9Ğ¨…Fh	[
}J±h¾µ]ÃuÏ6·Ø*³Ø†%XÀsØä<ëÙ£5¨cmW˜«%=j
L	†PY¨¦RãÄŠï0…÷QŞßEñà¹f\‚Zñ?8É,`jˆ^XD¿m¨ÃºäÕ)­Ô´Œ;€ÌŒ¨w±Ÿ¼®gšTÎYƒRˆÁw\Qp}¶ŒIİµ•<`E '×6rsC$/y”¹hryHZ¶mX"tÌPs¼â’‘ Õ•¥¤RïêüñJÚ|Åô©0<U<‡,ş	8³\m(’:%Q.‰9yöZêÇ-m÷Y`4‰rõ«7_‘!‹ª|}lcìû€´Ç}¬j‡ûÜã>¾xÓ4fŞvÁÌô·üŒñc^¼ ½ñ„ìÈûãÖG{\[W¼&·ìFÙÅ’`^ù¡o›S½XRÌd(äÄ”›sC1¢lŞ­È	§ˆwè
‰å–{R½¿1Nİ,-¥P’3e T/GP¦q¼¬Qª—KbJõÊÓÃ²(æ…İàÙŸíïtNoíU“Î4Ø &œsÈ2Ú£h®<\|wóYäÅƒ­YEóÏH7!›t"5¡o­hÇD--š–.¢Âê^5&…ø…5LV'íşá÷ÂqHÖß¤QJ¼©º eÅ¬•ßÖÊ4ë¯ šÅI%ñÈ	 ?hAäæáŞù;ù%¤1‚· ¡…
ïeŠ~üŠAiy—¬·’ÆrŸäe|ğÀ¨›_â1ˆ0¶O¾CD-¾—€Zù|Ï¨%ğÒû¨•¯şOk‰§UÂÓºm¶™Ü&–‘ìN¨ÎdÜN“ÉôvtãXÆ}ugî
 wnGĞ4§;ĞZƒ_»œëKˆk—¼WK	Š[“§L&¤ÔgÈTú#¾öThu|·8¬ÛÍóƒx£AE£>ĞÊ0õçs]¿¿˜p!¬Aªø#ô8‰=/)Fƒƒ¸ƒğNaÄs+,ó0öYI%pKæş?y@!2uI8púßó…ŒßgÌ„¼Ë¨™jü”¿EQ-AM ŠÙ0@(–5b±& EaÕ–@Š3)>È°Y8Î!ùïuwòµ»9óßò»¥·ÚŠ¤?J=8Ê‡“¡îây<d!¡ß3q‰T)ië® UV¹-^eù¹YQ+Ë­XaWV;|÷,¹}€ƒÚ±?–è•úÎkĞ+±vïaöTè•â)è[¢WÎ»Ée­|c$K÷Í¨ŞŠ* 6·¶tx?1-õq‰i¹Ä´\bZ.
Ó²ØXò×İ1`¶½é°E~n‘ö`äõÉO^úŸ`•-q-¿3È@8Ñø—“(¨y¨)¥ŞhKèºæ·¡·JNÚ«ää—w‡«¤‚e&V®8ƒÕ°ÇîN×wE²÷åÒC&z<ô÷‘Ú†·Dºüëlìµ[ ]ÒûæÃ¹¤M,æÒÊˆ‚]:Â\rÃñ·¹t¬´	-lå%ê†”3XÀVægQîfpCŠJ¸KòÃ©ãüËaWæ>Kt%ßnÈ•,Ê,²kP”³lF7ğJ¥ú„tøğ%TÊ}’œ‡²÷d›í@Á”Òz¨ÚìR\’;«œ,¡']ô¢%ôä·>~.¡'—Ğ“Ğ“UY³ \PÒk	@ù­(•¯Wî]%>åLšÃ-ÃVŠÁi7[Yk´Í’ª£6Ê£Ëj‚Fˆ›ÛÜĞ‚Ğá ªùO%RıD©ìJA´¤uO,ë”Â¬–V22S”{Ò¼ŠËÁØ<ZGE†*£´Š85ÊüÅÎ™O5™j´CŠFª6ÛQN±½e%íFYQ|5Ê¦Qºây5N¦4Í¬¤»j¾¦§J~K2¸Tg,JÅñz³~¦éa‘7òÆ©‡¹óx³„ºI±——SÙTC ÜÀ†¡™øşBnfé…ˆ#±é¡YI]”ÉşJğ®`OÑÂ=×g-“^$°ITX¶çÕ,Ú)ı<-e–ûÙÛ(£‡eĞ#w¿Rv2ÎUôÔ:=´e•—S€Ë8±¸ÔşNüeœX #jÀ1Î
ìr… +HÆğ ä¨”ıÏ,aÜpzlñ3- 	¬Ó~ï|¦‘°Y°†Ï„6¿[øÌllKøÌ%|¦é&wPD¨ƒÌ¬©ªø™‚ÎT#ŠÂÑ[vÅ*œ¼ÖÌ6ÖÇ­ˆwSX™eı¢@Ğ+ 3İ#†u“™r}h’è{ÅË¬šŒšT¼Í„šÉÕgÀIfUüÌˆ™qİ:bf.Âï&bfnÓ²Ê|²Ê,Lwg£ßg¤LÁ¢û·ü4ñãw‰é’YS½„L‡§HE³’•ãÆÏ³áXä¢T¯91/Å\9ÍÜ0ô¥u"Kõº·˜™NÀõk	œYº–À™•k	œ©3­~?À™IÚGTÌ_OÉ‰÷2c²ïEıX‹“ÉúıÏè¡cÖ½ÅIµ>™ñ'ägßÃı¾Na=ÈŞäKÍc=³¯¹ŒÈ	]“Â^ª‡véçhòYáP¦¸1x_G¨œæR_ìL0›
æ¤:b??y—şAO©nW{À+– §Ìb1¦)ˆ
·ã<ë©|+øX‡GÂ4¦t;ø£®÷•zDá§Ï2Ã©Tå¢µE%dßO¼!…èìg€Ã¬[1ö„gz†Ø">õÑ¼tšÊ§'ïSĞO½°E'}éä%)NÖ´jßË‹6;''ëÀR,[¸‚ÎÓp2ÄyzÇPOĞ†ûäM¡Ù b…USšAÛÅrnÓhrŠ#"‘…i@â‡€§Q;¼£G£­ÌQ+uÒªZ”[ŒÂÑJ|ñ 
ÆÃ5¹ÑOwd4-m?ìTmMN 3	yA8û[0oĞ×f36œ'Y#A|”âãÍ¸5JZµóúÆƒ—¿Ér ¯øsğ:q”İóÏåü#*b3qğ1Ş…€ï©=\Ñh|YÏß¦aŠ–İñvS/èMŞø¡ZM4Å{±Âa_ÕVM]a*xÇJhÏ…ø¢ş±›hExÅô®ÕsÊ×ßŒ{!t"nÖúRJ4c=3w-PÏÜlÏ¬Ö„–ûÑ.Iş.zëOt¯1ımÓğd§§ìå&ÔCãD)Òl’b¨ª'¯WZpÌHšMo•t)ñ(UµÂ	¢¸îOFS/ò›]fVv wŠÀ¥J‘Z:[¼^®™•Æ…wÀˆ%&™ à	+A‹ÊĞ‘a,<
<Âø"+ì¡|ÔŒsªœ9•öáã
¢Í'Cœú‚¼±²sdG‡ø(èHğå§ 4ƒD8[Š÷¶áüNšõ—"ÒH8»–Á ”Hş)+8'…ƒ·EüUSŸÓiDìk=â¯!ì–©X‡™ş¤¢@5á:áû,†¿¹ O»
ãÅ±•@v|Ê6bùfûg¹Ffá<ŸxU@Ï'¢gÒTL3‘ªFºÌEz~uËÖ¸Ïæ;ûÙ+Ùù6_îOB,º|òUä‘ÍpdÊ,OMËS¿–§¦å©)»îÌ©)cT7rpÊÍ†Ù©)ÅøoujR›^É¥Ş£Ï‰7ŸM/”Oªm'Ñä2B/ø†
œ:Ûÿ	¦À^ÇşgòKç‚©šÒàˆ…'èô V_à©CÛ™h<†óÊƒ´BR*½áå"Ÿíe}äI3Ş¸_ ÿçà)DÇ7a6ô)«ÇĞÆ(˜æÕvI£NºØRÆ7ğÇÍ&ÌMC´
 É1+íOz)º·Z=Š~ú:¤ÕàšÏíÅÚI‚‘'Ş([q”ùFõ˜2ìƒÎ»N‚%6·Ç âøÍU²¹aÙ1Ê3;éÅEğÅ"ôDÏŸS”
lş;-škóÄ.ùHïıÃ†êo¿şh'.a«_¨r=ıê´¿y±B»Â\ÃŸùZ]·€(íÚÇxwhûüô-'‘w4şÎ‰Îªê¨æ`»³	ƒ0í
AÚd¤–[eú-ŸÁ‘2À	:˜={·±J°1Ó°˜X‚Uü‘£ç2Y‚h=:CÛ4 (ã5÷,™Ocº’5•ˆS3©rÚ÷"#ş`R¬4İ÷ÆŸ¼XÃ¦zôİ„ızŠSì†µ¥SŠ7êb†øèP%Õİ¦'­ÏA?ì’}xÒÈ‹.ƒ1Ü¨¿¦eíÉ¹ïEC,ÿgãbóÉ–gŒŒ
1?ï¿ —á~-&»öÇ&İ^’V`÷ºí\öQnäùÃ{Pª‰­_)j3fæhÚ™xiv'^ ÈìOÆŸ€¶wH2!¬ğx‡*6ŞtêÃ?ğ%UİH3ãM“qøUÏ\¹~æ%FŒ¿¶ì>,ñ‡2£`Ãút|iâr¬9Ö5|¹ k;Çt4L×úÿâ»ôÿÆWş“µ¶ºn¢üÆ|ğá¬ë¨RÀÏ5AÏt×ëÅÀM®[ĞEƒP±†¿™5¾*ÌĞ*¹âí<P>¯ï¨Å/€Ş±V$¨ “4iŠ„Jİ£•"işäÅ¨wù_ü^Š$Òõ{^û¤M>ÇAÁ‹	œ#ÇAJDÁå¥ù}t§€}¿ÎÆˆ”¿VÎ¢Íö5ú°®>N,“k9ÔQŸüMÅ6Gå\¶«‚'zTi'	ötòÙÏ`¦…Ót+Ü&xñ²[Jn<YIZŞùJŞ¡ë²•S8ÕlKÈüo*Ë¯f!>ŸÅğØ˜F› õK¶)òš^Õp½òQ³) ¡g	TQ›Ğü
¶ocvrq âåê‰ÂkFoí¥G
/'¯} 7/ZÜ,œ;56H›vÛQİ\t÷eĞv– kßY©o3ùÏh3úĞTo·÷£á5»//“?ŞÃgRöhç:«ÿ¢é®|KK>Òy‰ÉÙdv½ÈA«VkrÔjMnó"£dí1Â	>Î³›Ë¡Ë›Ò<gìŸézGê]‰@D,¬¦s{]8Æ¤	æàƒö´öumƒ`Ä6ü3iµSI¢7ûk´aÌ 8­`†óQÅ"¨œÊVC­š êË8«^0"#{ˆº3à#ŠqC:­–æ—cªVxŒÒuZÃUí”´CW­#Áò<CpÊhí©iU’ªÔs¸%àjZÀ2,`]Öåz¼
he65ø£úÑŠ;[²"†Æ­dçDhĞÀ­)¶NL¥–)œk’µÄ%sÜ–:Ãèıÿû à¤êìu^Œ”?1éÇ]Yıh2E=SÉ®äœÉGåÑjË‰Vl÷}'<=óæ+Aß½}7{”ßdJÅlÂ©Fò’•S¥²NÎ„ K¯³;°¸é8ø3õéDûrªj!§²7SH©^x­9|Tç‹±Ná=ªVµİ”'›ø¡”¨Ô"ŒX±ï¥ˆ|•Åçà÷Y®šÊ´%˜+oşô8ù”XKğÌÕT—ÊÌ8Ìêõ’,we—OF“ˆÀ™mÈegÄd]{wLŸ+}‡¬ä•—còwrçNœ&P~ô‡°¹L³B>½+	c;	c0DµAÇŒ%wZ»š?¨Iùº¼õÁt6áƒh
—tCa]mÉ÷õt­ÂÂ#îe–W„@÷‹ß/:m~>¾¼ô0ŞQ—¦Kñ„tİl´bHÂ Ã¹„³¨·±Øø!¬ôdDFAóÄ,ŠëÃ¢ ÅæJÚRşö¬M›dÈ™ıàÅĞïB÷]Úï¾z•%²ÑJşÚñ/Ï÷Šı(ñr· rB'ÖPU	=)„@Œõ´iÄ
ğ÷‹c°Ä¸iäãO®c3pT›D1ÓimÜrMŠb°Áˆú­`S§ş…\Ğx½?M^pßÃ?”™g\'ú¡¿/4>E›œQûàpÉr­Z6‹L•“MG‹çÌÜïnùÇ’A–Ï–ájµ–ÕÌTªGlöÃIjmˆeLóeA3Æÿ^Å½Ád "$_lMYò¸HK·rvb$|ê`İÄ—»Õ)PÊ0›¤†P@Ù!—yN‡©
@ƒzùKùúÏ
ïˆS 1j¢«#tÈIä
üÏ¨Ë=/™Ø¸ÄÆyÍ‚ÍG¥uÂÊ jå¨®ı”–×z*#èYÀĞƒÔ´¶¹Uª'º’d]ßŞåLUàë2aS…¯'™Å­HÄ+ ô¬ö¯`=]*(-z/*mËš¶Øü€;`ÿLh,,Ş'5 ¨‚ä;¤£î‡ê;Øn ­wM‡mÎ+ç9“m7œ4˜ê¥ÕÎ"[)€TÑå»á¤7D{Ôˆ³¢Ï
d…ö˜¥Ü	jû®:eÅ†<“ü#iBÈr=Ã™Ut³‹O¼bj4_"ş€âT®˜j†z>¤–¬ÊTõ~0LÇ=Ğa1@8y0E…1‚>‹¨	}8¼ZÛ”6×d ‡VYïŒ¼u¢õÃ³“Í¤>“hš²a‰¹í‡#„*‰ùéê£Ç¤7‚OV·Ÿ=…*º¦o•7#×Ïåó8ïqşzFúA<ÅÃÃä‚ª‘qMà\5åÖ‚ƒÍwÊ&²ó÷:yx5>]‡æBVÔÖÅ÷ îÈ³òvÎâßTç=Íâ¯tõP:'•TÇ¨AN¡Æ4Ş7™Ø›Ëúíc÷j+.ˆ@ŠZ*Èf†>ÈæÖ£´°Š­›iÌ;Nğ@š²+İĞë+õ•|SgĞG}/U™?Ô•HôÕLã®lˆıI×ãö”ÏC4ÕpáäMğ%õFr·Ê­İŠ¶Ğâ#/¨¢¯Zıº¶jáJ
vs‰o‘ğ²æ!¯Ãsáu•m.^º‚rMĞÏú:Z¶xò 	b’|r ÕDáhŒÁõ´Qüp|ĞU lâÏÔäÁ}Œõı±¬ åÀJEP%{ˆ•³ø­¼2ôŒ©ER·Q·	Pgs ş]ˆe•n“n‘îî®‰òÔüd‡n…îƒnğÖÁv."±«–Sä¢,æÍ n—4¤\MU0®"”W#÷ñz^Åm/^e‡M’®ŠŠ½òğ¨Œ¦š¹·­âıÖ
´éÚ#ÁIÆ*â}+–·~Ñ¼üÂ’Û~ªÎ°¼à	™¹õ¤ZP1Nµ;˜" ‹ğp2%ÍßØøAG¸¤cZ%Éd*«†(4P=ÿ†~’—–ñRYeØU~k#´r®üßFkÔc³u©jTÊ­MòBa›¼]Qo¨« 1e—ÌˆTL€	Ï—špâ;H¦üD“Å	TcVdV©æd»ø+±Y³+^£EÔ5 İªVüqë¢ÙNP¯ï×—.r¤ª÷x¹tƒW‰
ÆkŸ­ÉvÆärbØ¼'fÂÃKJ|ğiJzo±Cæ{µÉ-Qà&µoöÎq‚f©|²-Ú›™ñ2b<›È]ucx60!dS`òtËYS­nwõøÅıô9Ëâ‘JôŸì9Û>ÇçæaÚ`Që+U'‹o…ÜhK3I,€±%‘pl=*lÕÕsê3V™UpLPíJ;f¯gß'=#wgWm“Òì0‹ˆr¼£rÔ~Ø>=ø	œ´_µÛÇJp#añ•»$gæ'²9ól”/ÅEÊâCæ›«8íX£Ö3¶÷ú´}øóÛö!9:{Ğ&k¾9x{tÎ>œ¾îœµ;VS¨,íZÜb$z‹[¤||Ë‚‘[±q×TëÍ®‚‡+Kó×by÷œÛÀ·m¸¶–g{£.hfbØìÙÇŠp0ËfOÊ“ª×?æ'[-§6©cštäü8°‡WaK†©OşNŞD¨u½á9€Úó€L‹‚Iª¤vyaÚ§óı)ğŠB¸AŒ¾”9Èµê!êiÛÊC’%Ã­¯ºÉ¦S’FŸü¾p0"Yh—n*ê“‘Ç¿gQïp¼¢Ç•$ÉØ @Èë;ùñdııFkcçCá•ç±©a¡AW’SÒP5‰cy*ñ.i¢a|Š»5‚ÉçAÎ£_«—c,f³ù…?>É€‡ÃÅë¿:»|¬5•»Ã¸£|1ãıcf)WØA®°S	í-îù‰?›ñ-‹˜†ú©³ˆ`ã¬èëüd–{²7ùò¢±A6ÈÖüß‘ã¿ßÙBŞ5È>{`ı™¿Ç³å‹\ÛG;¢éíÆC¢zÑ8ÚÜ"›[½­ÖÖ&ŒnàÉ3øg'¦ŸÖvØÿûƒ°?ìüg³Ñƒ-üø	ÙX{
¿lïÀ?;Ÿ¶›?­mõ6ğ·ÇkZÛÛĞÆÓµÿ4Ì‡çë°$Vjƒ=
ç‰g²ˆ ìÇøqgó%6Y¾„¢:èã\,ä”Bù+ë~%•½bùn½a1:òÖ€=û@(¡ÄS¯‡ÉXÀHÕ“Goï¿i“³óãöÁ|Š˜yÊ)§¦ß%¯¯šQaºˆÔWaQÙÙ§°3ü5‡£â4eÁ1¤¡>Oäç'q¡ä˜4FÆñwÜ>j›÷’MÅX¼É…¡q}l«>äÙ’Pœ vò©y	pc_@O‹ô*«råæùtjÎffmÙÔı¡¸ƒÎâ®€Vª3,#¦ÊÉº>ûRò%WÎrÉë×áë·íZtñT'_hÉÊÃs_c1´¸U6Ş`–§ÌËİ>“/Ôİï¬ŞWKşbø0ÊíÕşÏhşã
*Õpr¤ğ£QéZ±² u–{h%qˆš‡x&§i&/êŠ•e-ğÎ>¨E&vfE
ò1=ÒYSw´Ûtæ1Ÿ’½ö¿Ú§VÃrÒ¦TÖ:iE3ı¨onÖ¸ŠDè	W+^”7Ôz¬ÂgÇnÁŸMÒé©^ï¡A0¥pY'k/’Ìôi`T¦Ù@&µG­#„Õ_%,İC¯ØÂª¶2G^ÂÂó¦	Uè•ø"BÖ¤ÅØè¶/Ì]ÉªEéHÜ?_Ñ§ˆ‹Ì·UTÄ™œE·*udù/;eˆ±JmX¡~Oåˆ*	FÌÏ”nd,&+;9Ô–ÕSR-a›ËÀŞ!ä •ÚMïù¾ı`ğãÕˆ¢„Š ¡gJ©…÷jA+E˜™4ei¼èÆ½Ú09-hÙ æGiÈÔµmMåéë•r²©uí]òh—¼õ¦Lù;9õ‡Ş4HÒK|hJï†ì‰{QwW_m7{'íâtÄ¤C5NI R5Æd=Á¡âÃ…º[îkxi‡‘ ÷©³íp2û–½ˆ¡òÆzØş<,	:ñ™IÖÜTÎákvD÷¢Iˆ€a*ÕDÍCMœ³Î/ÛhñÔ‡ÕL`-a)›—£‰x Ü4˜åcrb%En¶h;­äÛñ#¦Ò3/rĞrt`…w*p½Ú¸ØäcS°/ô™3iÑ¤²?o=¡2Ö%¨³ÊğS§¨—¥‡*kcß}š©Æs·Päûg:Q²~(3¼”°y7L¯rßµx:ı>I¶Ş’jÉóŸ‚Ğßøp¾+‘-•Àèb¹G›ğrÜß3Ùæc\Ò.y¾çEû €’mífÅÙï‚¸÷=/ß’pL÷­Œ×BøÏ=¢\8±øß5ße\Ò.¨¹a0íN¼¨¯$à6ÎÜ@¿
ÜÃiDµdX›íìÜ	w±s§î£*½Ãª1•¾Š±‚á‹öÁ3<óÿÌCä½pWş^’½-ã(}öVÜ‘Á‡²(/,§Ã‹•#ÆîW¶ƒ‹•¢]Fy­ÕAnUv~ˆ–%RlÙ¸ıx£
[§é@èÜ*HÊE‚Í©_aUØfÌìÄ¹ÍCSd’ŞyĞo6¦øa-¢¬Å>uÂ¨4–UÑğ·˜ŸÄò"9×ªi©1è¢²ùS]ÖºCŞ©…›M±SËViÎ¡™Ñ93JH	Imh¾ZâÅä¦Ó/èŸMúŞWò‚tƒ0ÌÑe”&ğ&Å	ÑXÑ»­˜¡/Qi1… ¬Ğ>€7µı]Àz~;ØC†Ä+[f1´”·Ód/k'õgqVğï½åÌ ¹xŸŠ8›º=ÊH,æ&1ÌMRš›8íõü86LO–€ï>CÂ“¤î0Í&¨™À;â4ò£3aª°Bùû+–3cDQ¿Ø>&X ¨3¥c/@d)(ûcì°Å`MqÕüd0é³Õf<0–yP}Ôpåö
ĞSÕHpÆ?¶Í¼qê…MuÑŸVä÷Óßlz½Ş*é1<¦^ü@z-o1Y%ÆÑÙâ¾£jômWW»)ëKj\£EµG	nqÍİ5?A•íè’[néùš»;Ë›ïéo¹¾ËMÍ¯ÛXõÌÀ~ŠB‰:˜qİsÏl_ö}D°O·Ù÷C?L½hÇìÅ~ä}Æe¹…şïS,ı@{ç¸¹n7Kß'ir	'×Ë[éù¡S‚y;z´\pIáû¡*/~ĞšÊ¦ÀŞ2öxG©ùò;×¤$°&›Xãy¬OOĞ}We†17	³gıüåÍ²Ql>öª¦Ü¬¿/ú:t5)ßÍÏ}µÒh£ùZÜ888\N¢¯»¤Ñ99Ñ‚¼ñá]Ä(ë¶F“q2¸&øñ«ïE×u–&v·:Óº'©å‡ÔİÍvŞÌ÷†æ^à‰?‚›µs›æƒˆ3òÓ€İIàP³«B¹ŒíÍÌ kÔ›,œz;êM¬¨W8\[pâLÀc±£â¤5$>=z7:~BÍrV-Tˆ9™˜bN\ˆY{WFÌŒâKĞ(9î¶êÎßgRónó?¸1ÖŸ{¾í¶N·ESd¿kOC&ºCDƒ_f|ßjµef•ˆ³mZúwÙÏ­6æ¸İcÿ3AË`Ók!%­´.ıä>4W@ëÊìVœË„x”67•+FŸk¶q:Z¥~#ægLG {âŸ6ú­ÿ}W¯€,¿f~°×_z~¨Ùyh:İµ·›’²¢l¾Ç÷åz¶Å}V–ôtË{™n¸¹¤Âî-ëğê›…“‚qü5©ïO ê»J²IÓ˜ éSĞµú‘ì¨¨y5/ç ºãú6œ³9nSî™¥ßÜ{·lşUòË¾¦„P®áæ–•§åTrFU@^È/rúúäİééœïµ÷Èæ.yÕ>xû/òsûô }¬|ªV=Ä¦Sé¶¢ÜçÕßk?Íä/Ö¨uP“t~ï§²ÜÇlO«ÓÍÉiáŞ\ˆcS&rgrjU}­’?‹ÁŞ{°0¿Á"lÇ²ãÄÌ–¿Ù\~‹['å1lq^€…Ùÿbù¿©Õs´óÏhá_dOm­ú³ÛóÑ[+K¸Áğ=É[Ò;³™ªK:S¿‡ÁÙû^ØKCZ@@%|ìà·e·°€èm6öns‡•{&ëö,V[û†eÃdÓ°µ_ËÍ3Ú¬oËZma§Ö[¨-mÓ.Vi{{ô<–èYlĞ¶Ög;»³Éâìbk¶!>Á¾L#/¬Â8aš0]úwYéV‹1nß;W±gäç&ÃµÉúŞ°q³QÚf+İ¼!úLĞî¶ÌÎì•ĞÏì…Œ#{G”Z~ÜÅ0_ÊX{¬gö€İ¼’ÂYfá*âØØ§6×s½ñßÍæûÿ]ùğÃÊ¿WÖ©¡0¯Ì©ª¤&–
}¿ù¸È9ZàT•EååÑè[ô\({Séú^4:Çíò¦}öú·ö¿¤Ó"{{öğ»ã·Ç¯ÉÉÉ“²ªdiCû¿jÁ‹³Y=‘ä%{G?£˜5)ı•˜rÀëŞ³¦>¨&R¸^w•ó¢89ñO8v+4Æ·ùá…¸cd‰õ²g6ewòuƒ$ëµJ®®‘íú=`¶ÏÙ[F4N±FÃ?³a±?ÉõKÙv¨9+R$ø¡Q—º¡³º’ß‚>¬¯ËÎX4©Ëƒ>bà?ÊdÃAaâ]m6µ°¨3•ªWÚùµP|C~Ò>xEšûíÎÏëGíãóö[µcŞõ¥(<?ªöºVøI[Ÿ¯Ó)¹*Ù(_Dv®6`]^É³¸çé<Ck³*}Ì.}}MÑ¾`Á—E^³‡‹ãå2.y£ñ~«Šâ•\â†ñZáå²57]_5ˆ¶~OÃ8 ¸Gä`ÌHSzôÎ¿ƒáÊ*$7Ï`hbwşÂÌıKS¹CÅğªr•fv™
ß cß‚w1*^r.]É?áúÍ\»ğú>pí&Ì+·4;¯ÏŞ’u‚
98¾=åé‰;s+9dî+ƒìæs%ä°k{.·7£^ºÜp³ª
Å–:y}Ü>=8„tS½;?»ù]Mb-ÅÜ’ß÷²Êc×"D(ßÃÛŞV¬;…õÕì.~'l/¼õvvXŞ»Y·Ø»³ö[Â5ñæÑÁ«³ÓöqçÖÔñ¶WÉ&ıv—0ã¬ç~?HGú­¦6s²Mq½`-Mó“ÒÎÖIG#/úJş¯—†	ùÙ÷²míl¸/T˜qÂ~1a”1HnøŞX¬To¥»ÒëÔÂ2a€¨ï‡^LÎü0„ád&Òä°e&¶w•{tj>Î•|~Q-#æ;Dî¸"@›»¤1NA³zUBC7à›p2¾„?1|Cø\ëÚÓW˜ƒÕHj}3PEaõ¶’µM2ò¾¬7µKväG"T?œR)ªr4zôh|4õø”x£®§“g1×3[ñgb‹—™úc.ÑğœÚ‚5{šöxĞaîšJ‚¾7„æ`—AûØ·.|?J»â`¨i)¡”ØÒL½²R¸¾.C…-0=Š–}‚MÍÅd(|. çà»i¸öX&,miöw^>Tw ¤õÌ´DsüúŒ´ß€Ü$¯ÚÇmòÓAçàìÁß‡š2lVrHóV‡”¦K¬õY1™ğRlQéoWblİËdÁ>«“ÑÈQ<#Ÿ}!CçÌ.“ĞŞ¸hi=‡´{R#úÅv:aæt‡!V8î³–€µ’n*õp“ª‘´úa^Z)D¹š},4k•ZàêjbT0Ãvá?¼3İZÉ'İ4UŞl×`A+…ä+Š…6‰ERêZç®\L¸8lf}4X¾äb1Éîk¼ÌÔk›"u¥š1‡ƒ4NcAI|ÓñÙûš¯nv×ÛÚÙ—‰ÑúaÒ®xãˆ´Ñ4Q¨Åp Òˆ9”_)²ÇW
ª)­caùzŒQÁbö(aÕŠı8õúÁÜ¬s£ RX™«©YBÜŠç@’£­êÊ¤WÉE{|³?áˆã“?NıİŠÌÕ–¿"7İZÛŸ„éhLŞ ¿Kbùğê^LŠ`¿ç1pÇ~(ü¦.MgtèƒÄ«Ö©SŸxÅkÖ×Í]²ÏcŞ¬º"åùL.3luÇÕÆ·õÇ¿eØ[ºƒ©šejyyÙQwmÓ°­Û!Èoà;'XÔ_è‰áœjÖpŒ‹»mÇ¹Õ–Ğ-a9@#R-ÇÓR÷Y‹‰KìoÂn¯Ón¼ìœœÌSƒ·Ş,spfœ/d&jK7h
àÃx:}¸R‰ÿƒÿ„È?w¾Ä§`bÅOUëR »ºÄÍ™'(3ô$Ñ“¥t!åŒïíÆÈÌç‹İÒø¢[ÙÌ¾Ü"v“´Ü&–Û$m^ì>™¦Ñ4ôo_Š`şrXÌĞmo”£æúöÖn¦ù¯g'3İ]Ğ½ï®æ), ~Rœ¡Ïühê½€4+ªXGîÚx1M´î¨Ùo‰×Õ»î~/iı¯qS÷Ÿ1¥k´@šÂÑ´FİÊà0ôhù%‹¸çi44ŒØ<Wm	®_â%¹!Bm4ç}µØt+d×8f>°¼Qàk¦’æ‘½ï1
X%˜q`ieÆÑÓ‡•zqÅŸ¿–Â/Tr,;¨2¤+g±<ª¢AÒW1¢äc²cûÒ—hu£é—Â·¹…–Î9Z”ºíƒR‹Å,]l.gŠ´—³§²ûªœ‘¨É{JóH®¿¬Ø¾ÏB{ƒÍ¤ƒÚ	°nÚ5V1ÄVu0Ääm ÀŞæU­	­Ùv… ÔÙã¯úâ¸ƒ¹ü‹¤@‚*«ƒ~ôZûš}°1şãë¾×7¨!I¤îj•X®‚mïŸç}+‡1l7^şæ±„}2˜åáuñ®“ãƒÎ¬M2£d0óó>°[¡giAÜ¹Ç“yG©íàÕ¬ıáÛ3v©p$cŸFÁØ›¿%2¬ÑZ]0e)¨ãØbÊáH¯.©ıyÒô¿ŠıRî+’É`“Öe
0²WµôÃËn²	åºlşÅÕST•)\k ¥ãi•ˆ,‰©{ªú|Åe#ÜÎh<*ƒIîhôÁœÛª‚”ŒÏLQvê¢š ¨‚¨M -_ñH8n"IÇı&ÿ‹ÉÙÇVÀrÊh¶j. ¬‘W\š\Ñê…‚j¨ô%A¿¤¡æPŠEŒæ–^‰÷¥¬¡8¼§{W¥/ÖatnZ>€uWó@¯üáÂØ)üeİnÕb5Åk0I1hkk&+H!`ÕxnŠ¯3=~m“Ã.xÃš6®¸lv¿³¾ØREü‰A•)µ‰êßUückm2”Ş5ğ¦iÜ¸¶Ò^ÅÖl‚y†Šë±/ĞMv	íyÀàql'ÜR#Ïn]Äê8î·Ä„™Ì:''åÅs•]‘„leA %o¿°@¥à€ª[_à°^4gÒ~Ö‡9¼¬Î‡xÉæ7sÕÜÒ$g>œl–Å´§ò4g¿¸Îs6 »8Ù¹Áÿ–f›{²ÉæÖçšÿà:Õº²ğŠÜÄ\ÏÅ¥*•ÎmÓÄ‹­4Tºİ./JÇá@MN’d1ØKh}LŸ6j¯0.ˆ•ë•æF•MÆaK\Y×ØjûÍ2?A±ót1lC¯7¬T·4o
(8óX77ÀÂ``»
š
Ó²Ë\uZvYV¢–]´ÒyÏ¦y©s·#CPc§øèv¤`\?Î±ÚÜZà‡Î]BõX·®3€½òÙÕíí„€MÏ+ÎÏyŞÇÎSúœéµşˆÎwÃùÁé`2ögyvìy¡7îùˆ‘åÔ€6­¨v³…åAè™ŸP‚?è7tS¯El#ÀÙŠšOÍ)*EÈ®wÙ,Šêâ·OkW‘ÅÍ ¥³Å¶H	V®Ğ(Î5E!‹JÉ	{–Da!_4öa‡If]%§~<
l±—œÏéBb‰¡…µœT¢ßm'HÌ6=¼Œf0›\[ÔÌ¬snQ7ĞMäÖ¤^È"ÁÃ ¬­„Î¶¥EŠco¦µÍ]Š1Ä0+í½læbß™òwtèæl˜£Ãø©E"ŒAIÙK‡)ù%Æ°V8]EVêU	0ˆÇéCK;3ÄÏÈÂ7~y<‹23ÌÓÎöşºÚ’íQL¬Áıy«ŞV;kÍã:—3Ãl‚mªŞ8úõ¶®Ÿú6ş<E™ÓõĞ‡_æhg/)Høe0°s*ÚaÏ™˜ÕÛinÌŞÏi#Ã,|.ŞNsà¤Œ3Y{6-}›¶ŞMÁ¿ùØNû»a§­Æ$ór"µ÷jÚêA6Zo³a' §ÛœøTşL«ÉÊ¼+·§eAĞ|¤6Ç	Ï(¥gK-—zPKŞöœ"s²
á¶v:¼µ^1º|¥á†µTïÈ òÎˆ‚CÖñÜkSV¼~-ÒÙ;§»wN‡¯“Ë×ÉéëbÍS‘ÖÜ¾ßE{o×ÿ;—ØÉ¼ˆÅZ€“…î~^|(«=t[ıw¡©ÛóW8QËU	šãH»‹ónAT#wKÔÏÒ³~‰îBœ‹¥™9:%fuKÌå˜˜ß5QªÒå*ü2×„¶¦¹ìšÏ#‘ı™Ù!1»KbN§Ä<n‰9s¸&ævN8º'\vQ89)ş*nŠ…8*\\ó9+\İNo+—…Õ1Ö¨ú$¤Ñuat^ÌºC	[»y@ØÒ› §v”Æä(M<ºy†ş,&¯ğ-h¹*ß)Çƒ]Šƒ4è!–QÂ,$‡µúä…A¦`é‰È^xï<wÀñìÙŸ/CQù£ÉÒÁº´H?DQ-ıùåê‡1¹‘ÃäŞiO„¸òB¡äoê‰0–O®Œô[{"’¿¶'b§‚±š¶ìZœ?a_Â~„ë[4¥İgŸ€“5—ª'ÔøO›¾ãæ—}%+öc%…>HOy¢Ñ£*d?¡QÄ.ya;Š&Ÿ_M>ß‚şíjld&„Ã^Âø˜a…Œ"Š\åÔƒÙ/ZËe)œ<¶ò[h_ºÔå¢?ôÚLËz>=E}÷{^Õ3,Ët“«zCÀºFu€N±úï7·˜q!JÇ˜¾ç1<l<I|ËL0ËcÖ²sÂïMOëÕG;—İßTü½Â£KõønÖ0(_n®Àdé
´»îˆ+Şfv:Æó,Æèxº+_Kw õµtª¯¥;pé”^ß‘;Ğé'Åµé¸^iÂğJ_¢ñ…ü"§¯OŞ‘ÎùŞY{§¯Û'4>[õHÕ'y…èOŸüSP¢¤“vÏ¼.S™hi³5Œ†©×ÃnªÄòú:a•æbòw²?MÓÄ£àRµ;™u“½¼Ãí›eS'+"+ ÖB¥	<ØŒ[#ş24–!èEù›¨Z#è÷DÇx¸‚aFDÈàŸËUº9–2µ8?ÄGŒw‘!­ãúpEJêYŸß¦aJ‡k×o7½ŸŞäJ_\&›*h„¿%³Ú^xaì«»;ò’ŞÀßD^ÔiB	£3Ò¿Ùj3ŠVÛ¨NkÖ_Z)*ş-HMÉóºÉâoß§-o§ËŞ½¿”Ü,{Ÿ†Ò8¡ïâ›ë]¯´@j$Í¦·JÔél´G¸¼g°é	Æ´ÆJ+¤gş{³+ş¸JPÈ]€øê¯’+Â+(îâ‰Ñ_OÅÜ§ ùºKbI·‡
=×¿ÔÜ9ˆ?ifÈ£¶ÊZñKÉ[±'2Áø‚OÙÌq|¡5€Ê¼@Á0€adnÌ`&_÷’Ş6~IÃ ¦®Ñ¾L¡Äø±ãOAòwA¾Ãï†É„<í!ûú•óÏÒF½1llÚîO~7Ê>Á$ôe e…ôŸşğK:–h$sÂ‡Æ*ª±yQ™æ=½:jr‹÷‚0ÄÍÒÅ3V*•X,3F!é„ÈBº?RM$äf{î_¾Iö§Ræ^úI»;oôğÑw8Ú=a#®ÈÖHÃF0Áî8%</Çé%)ã¼S®—%ı—Š¾Fùê¨ŸMÇöı`÷6¨lxónàH½á}¼M	¤Ù]fEÇJié/ÌŒâŞyè¾"+£ 'Z[¡+ÔVÈâ™åÇé1ÈÔ§s:Ô¢Wlèß´_Ó¬±´%¾tÜÿ’l(HúG[yĞ¢Ç”f“ˆ?³^nc…üƒÀ©E¥÷ÂÑRÂ3rñˆÜ0®1İÅR”pJzS£ŠFN»œ¦	”Ïû˜Ñ|„i§´DÿÃ‘¸ñOu'p¬f­‘ë—°.W×²	+óäğò×^oĞlê DYç»âNÀYB†Å¶|`9t3Œk@*K	ıY²¹5¦•b>ß>à+“¸šOLãı»Ã"¼®‰j•¤|fìZèÇ¹ê7e<1x•=«QŸåpÌ²6uãÔ4§Ja¬kš±ZŒVû>¾!„·ıÛTs.ıŞĞ7M¿è†´šÙ›¥ZX®ÑÉ»ÃYÎI)Ç¦›vÙín™™ÉŸÁ‰åwŒP~/[~7—ºû«RMsWIÎ(zÚS»X Ùï’‘N<Ûn—á¤ë…gYÇ‘ŠÊŸFğ5½^o•ğÂî”SÂ üø7-›ÉˆBÉ^®õô<×]ÙWã’È{[ûN€¤¯r¬ƒ‰¡åˆ2XÍĞÿä‡X¥Öï%“(&Ş¸O>}Ğ[í1kÄJÓ¼Xsİæ)„—{;êÛÕd†ûj–Î,l{†zĞ´¦O½EC¨¹E­\·RJÒ°›ÇêÒIçÖIò‹?şÃ_îj-†3•C’›óHuxÿF©l	Ëÿ==YÁyó	şç)şçYã;.†ŸB«Ú>¶=š}n¿Š»:ğjF":ó›K®âjéåj<NÜ/ÒLÅPu&üÍÆ-§²‘Á¬ìé?’‚UäeÌYi«ç3v±AjÑæ†Ì^p³É©¥8ÿ[ôFŞy}tŞ&gÇoÛg6Ïì’‡¯ß¶;°6HœÆnÛùAVPè^sÇ3oIû,g1'sdRSû¶O^˜Â­[zô«	¬c ÌlúSVv	¬¥xCÓoĞAŞ¢Ğ; ôİ)§ãogUĞ\¿T&MQj³H¾º˜ôà\0IêÕÄÓÿªÔêÓº´ÂØò$2İ3¤IL¦Ø:_<ºÇ_òíÛşùü˜´iŸ¶Ÿ¯³Û’ÌÌÜŞ‰ØvŒw„J(ŠØıÃÌ¨ÎÚäÊéÁn,&ŞÁöÃ÷Í>˜rEã‡o{Ÿ›bÂ+şêüC 
¹NBE»%IÇÁŸ©O—Æ¯»Ê—Ö/"^Í^[Ğ^&ß¨Eğ2“·Ô8dŠ `¼•Ê&Md®ğXÎ[ñ³Í´0íŒŞn~™ÕJ/ŒÅjt>&ã=GtñHß×8ô#Âsjá¼şÙ”’kÇôÕ·æ®ãóæ’Ô®Ésô©ZUrÃ³4êWŞØ#G^œ…m¬JXKÅğG,ÃÆeÆÂ(ßŠuo¶`_±h¬Åm³Ö™(	%–ˆĞ@L·N
'Aš`îü™%éøòÒ»m’Èó=f¤fíüFaT*V [«Sø6Õ©0ú,‹ÖBÏñ‚²WlÉ.ÄUÒj6å!ÔÚZG¾PÒÄü®ÜâRã#L•+HK¢¼émP\h€DaB#7óşš™
 C€n…k(àßmõ¢jéN•JXT,U—‰†&M¦˜oD•èÂÌt¯Ÿ&ÑÈK˜"G¢T¯õß²ËÿBƒ*á¬=t6yı¥ç‡		u½ïÿ  ÿÿì}WÛHî_éñf3‹æ0!³NBo€p°³s÷ÌÎ™È–ŒµÈ–¯$X.ÿıvu·¤–Ô/ÉÆ$™xÏfŒÕêguuUuÕWŞ_\ ş˜¿”ÚCôï$³@/ÚÙ;!ıû¹#²Ô”‡ê^Ñ¹Ë\Ã'YÂghÍ¾—åûöVkµl|€µ›,'¿|¿"Š=ß²³ü˜?"4_…/äÔr``ˆ^ãáâ¿ğÀKÜµÒu5Ëà¢µ¦–¹.˜×ÿò×·ĞÎ6@mÇİdû«FPúJ ½ÈyïFs|áYnâéK²%àïõ»¬ÿ îB$rl!ø®™všDJ.µ^èÉY“™É@\¿²ğ®CSæ¬hEÖœz1_áMïC‘Ä LI±É¡VT^lÌªî°U˜ŒÒ»vÁi=€]#wK •š_X§U³ô*UQ:Ş(µz¿ôpcwĞæ·Êòe:QõîŞÔ¶[§v	ï“›E‹+Ã="û
ÿXts)-¨ò#I{Ë,’M“!ihz¿LÙc>qÊeY*µÕg¯Ÿw³!)²úÈW^ãjôî‹dŸöèœ(·ş6xÕÄÉißu¦cúË“'ÂÊ1=)^ZyøR%#QâáàS‡í.õè™Î„µ_6Œˆ”KC¤¼pFgİŞX’ø»E±*YĞò<ğ/'D@]à4²Ôr$îªHk¨Î<RõiIVÖ1Îè½ÜŞ}•™î+õ×´&yJÏöì'ççnòJâ¸n\¿Öo]ğ{®[2ŸvşsoxlßH®‹Óx‘Òp£U!ä¸~)ZcÆ±\"™dğS×¢©zêq,a™”%i—qµ«é3ïlÄ#æ÷9†(d='-¬¤ëæ‰İ—à®¥®ñK¾YU=Ö ˆ€4&b{"k]OU):h°Dq”³Äñè/ºWr.Œnúì‚/¢q}~r‡ÜıÏŸËaÔ¼,¯Y²¸Ü»nQDX¼KÉ€Kt½Š^	 üìµ~©AÔï’ãò~ã.wÚŞSÍÈ<+\ÙŒQÆ‹¹ö¦I-Å£Ñ™ábvWCÆÀ|wyic1ºUL
ñµØ{àÉÈR«™ÃlïZ'¿G†AR¨Âå˜DÉå7bĞ_§€™‘†¾çY3­GR%Ë ı'/­âû¡-£½’×Dé†œİı¿ªõ ­ ¼	²é6=Õ5)ğİ+aY¸û@`ÃaÈ/õ…¾¤kÊP] ƒsÉ‚¹ÄAu“ŠÒ˜*A“{ñ˜Z|útİØ¯½ÄeÍF¨öÕMf6ïÇ‡ø¾jáÕçm©Áâ«´Bè7‹À
Q¿KL|D8§ùì"ˆSeH^V«È{fç¥àX¦h¢ gåÖŒ–k|*ÛWÜKóíŠºpƒ¢„±ù QÆzò:¦iÛ”-†HU*Ã³Ì e†@e@)~e &f¨¡¥‚Ğå‘°Ê"£,o" ††€*•Ñ~ó‘R4çÈsİØÅ
oVİåE“¬»ñû1r·t!ÆÀßXéÜ·©±úóıK€¢y0¬tnòbø UMYú\BãØ+™:ò—tŞöÓöÊ±BIğÌ½ZÅ´ñP^IuD¥Jæ-›¼ÀˆŞ^aAa’PİÃÁóã¹«Ç“ÇSı?ÿH0qÖPùo«Î¸ÆWˆÀ®Ù,ú0ä¹¬H1/‚Ìí›g.¿œ#ßĞú¹¹kn¥#XÿK5/,1qÙ
*·H	’xåm£Y”z?FïGù•»ŸQXfsº7GÜÜS‹ä›£·ÒíJEj$òÚËÂ×xfÆøÿåå2 Ó#55ÔxY"¾z_ÅHÉQ¯9ÛygkşxONñädGøë`U}—­’ê¼­¼>(kr¯f˜2Ï–ô|Dgş´Ñ¹Â]' ıëØVì¼¬6ñC	_{\Löí“ÿñéì]çlYÀìqúË2èìT³£aïç[ş¾şÍ¡¯ÇK·» ’²8ìqæ`ì‚7–ˆÈ.\$‚„cÇ¤şê¶G³· €x³Ù”m‰?(Ä» ƒ)êû ™ÍƒÈÊıTo‘HïHøTÚEY÷´Ø‹!‡ºj;Ur";ExíÉÊ®ÊÁ6“É÷•İañ"«D€d„‡¾W
ì1@Ú1Šš Íáäæ£–hw1X¢>	ˆVL$à¸‚N$hçDÑCB1¬B3èš\5Ïk/Ùë&çy¥jöóÕìWªæ _ÍI5ß Ù‚œã ÍBÓƒòĞf? Í
#ÅÃ ¾™Hùr†äLòhîXsE†”X:” ‹@)ü†Mñ#v¹^È€6çœ3'†…Ñ#0!RFZÃ'Òø!ˆô²ÅRP‘ßG†¡Å†X5‘1<ªi–Àt‘±)5—’Şê·dÆ
õ[EËº¼@W¿ SíOˆBŞ–«şªäô£‚Yêæ|p`—•oÍêÈ-ê½©:òÂúeàÚşsEØh%"ıs»$‚J·ÅÀlR4æ´”¡9Êè¡d¹#WŠd¨Ôúû“ôàİÉÇWøï·İ“şñÅñÅÙ­Ö#ÄãÀ”*4aA8šÛúäö:ÃMÊß^W@<nw)\¤çX6L|¤™í9Ş<˜ñ¦˜ÌêŒEî¤èÕàÀ	l+´‚+ü;eZ(´¬¹S·âXÊÁÅ~w~qüáø¬{öa‚îöº¨ŞùĞï¾E½ãşÇ¹˜¾|ú6£¹œ}€èk$æ;ÍÉªÈAH?™L„:¡À²¿¡;ŞYÃÅ´¶6ÚTé;?£7Và²]l[5a½ú±m+mÛN¿Ó€P¯sòæcrB­pÇš(ë»V¼E·tÚ¢İ²¶úyDuîLÖ¥iVdáóÕ³ıô4]v1±elaÅ£²Wu_V êšO„#¿Ã%¿~|Às‡bèEè)z5¿š£Ç¾¤xusê^§<†ÑŠa ß¸á<œO32ã•3s&®çÂwJØ±‰J­ ;A„‡~é"ÛE½ÓsÌqği6BgŸĞ9 (6b?Şj D=V ò¡!yš‡]®˜É$ørå Lb@%ß(ôMøªY,æpœCqZÙ¨G¶PºÿAë*T1Ö¬¶k:ghƒpÂåAİÉŒzôš"‰)tí³|W<¥ñwÄŞ1	5­Ù1@‰‚Ï1ôwÔ2¹s1r¡/dÖÅR0@w³*üOIèŸEú)‹¹4êg5¸Ÿ…»«‰I®}ŒÆ`U‘Œ3ë—WjBˆi&a&Áå3ªHÑİpj‚Q4¡(zõÀø‘_¸ÚgÛ„N‡m‚ÌÙÚşÔ	±JşÔdñÁñÚÆ`h£‚ô\b…×ãZMtï·’;4ÚŸ\Şã¶YmÍpæ¹Q½Ö]±BÓäX'ğí¤¬ñ»Ì÷â‰³®dÓàhY4dZV‚RË³ğjéÛ¢jŠ­xê)&ã²\¹¬H].+ÆœËJ¤‘èÂ¨–Ï¶nñÚaî4¢´ğûÖë¨µ)!nÙã0ôğ÷\-Zj –²uÈêI›Ç/mJŠ2Züüäwö=¹#mÂ’ô³è­{4tTw‚@–FOãEöw/pnŞØÀêâëÌÌéf4Ÿ·	Ë¸t¢·ÌÕ‰"k—øÌ8ñ/Ã„oH…çDÈÃ%»SPÕ}¶2U$Á!¸”â¾] €_nÂ¬ —¸~à‹=0nÄÁ#ÉÓìéñÔ†gÂÊ„4$Hc°Ö#ã*¬›åQW4…L 'u6FeNL<ß]›fÇ£f¯v¥)S¤Wå„Ã³×æ:ÅZ¸p"Ònı‰øş÷;şªíø˜t|ÜLd%ÒÿŒHVºÿÙŞĞJ“?¥]ù5)BäVi¹6ªÑx´7.&æh~eMkÒ‰a“'w	i6›x±ä‚›	Dñrµş7äŞp>¬q+i›Í=ÊLo;ó—ì{ñzİ‹-T	s %!øBN| Å5„E÷NX·/¬éíKÅ­éÀşÉn5d;°ÇÆ$%û"
æÂ˜«dí¹½ø:	aÊW\‚ñÄÁ^lX‚è%iğRü0_<jŞ^W‡±:ø*å5\à×{Ëvƒü‹Š˜,‘Ç cè:òCÓ£è@Ïºr£;@ê¨ÚîÿÜé‚íCU›ïx3kÁæ¡ŠªÍ÷À³&kÑ%HêQvDÒ“Ù0bt(ÒZò–İõeîøêYo¤/³kl1sk£MÙ$á®1
]V×huËé¥]]ÏD½ o
:¡iRk•É›åäèsYVYjD¢û;gê ÎFcŸC,É@LDkFÌËkúÈ±°J‹’xòá•pæİ‘ë0ãTìµô”èp)Š‚O¢0“3qv=q	®—\úÏ8‚Ğpõ©ŸˆŸZa9ÿ)Y³ä$†™ih6ÿ‹.VÜ¬¬:bœïo5^¾[\¹QQY9|ªÅ’Ço.$%RLa
rÃ"±ş‚Ñå[–,'o’ í4Û"R6ÎÁ6úÚŸ`­ß©Èk*Ğ£#Oø™ÛUg@&cUÒšSrc]8%&†#yúÅŒÒ˜QÃ°V‰ID¡}¦ZF¬s‹+ÂÖÔUeßÍW& „´Ù‡jí6;+yªWN(îa,G©má×äk3œ¨ı´¾IJmôì™våMäë‹œ9£äŞd†¾Æ—ˆY}Ú½,QS2Ñı@Å22}ßæÉ=¥n©Ü¿¦ñƒê™WHåx]…]ó
‰`®«¯c^‘´uõõÍëK¥f¹_ˆ¦5"gd[T½ ÒFá“atİé(°ˆ(ÅMş)C‚ÈSÌºÄİRš‹gÄŒ—íT±§¦S'…¦É
Ngì¢IÂÄàZ‰éƒt:œOÖQbrÁ¡¿#b‚i’8•¸÷¦4¤Râµ[ªï$Ù³xÂ©ïŠÎ—6yV7x*'±œ±ÓÌÔYÂĞ©1sºv[»!š,§Æ¶Ğa	‹¦‰³ÙlªãÛÄûĞ´4¡|)ü(¦M¬&ö fkp›(yAèác'¸‘dİc›%ğİœ@¬’WI;LH•‰ïyá™üª¸ÛÍT–ŞÍDFá)Í­*¹]6‰…ß¤†£€Ó}q]5¶¦¶çÄAvÿç¤§Ôa6’¶âÛî#:#â…À£ÅËUë»¶u…,ÂÀ]šøFÏa÷ÆºşñzÁßf€BÑ”İµÓéß3
~„Ë¾q4ÆıYğøyv3ñ¦aÛ?ªášÛápìL¬°1q‡ú£¨1ô'm4r‡ûO½qcğ†Šì…£Ú8ŠfíëëëæõvÓ.7úÇ¯Ğ±kÍ¹ß‹Ÿßñš\âÓzúèàI9Ü¼Ôƒä¦M¢(óƒ«ï_)\Q¸’áØq¢PéZ˜/­qf¼i‹{IÃ­Ï¡ûx²‡º’¶>ğeÿØ+oÜpæY·ï×HpCçsY®(o:Å²Òª3Eå«†‹ÉşÅO¿cåİıÑhH
4d²Pè»|R™6Š¿Rÿ±‘5q½Û6ê.>CøG7B|úŒ¥`*˜£àz­áÕ%1VBİ~ĞFÛìoöû›„3°V®ğ]k#ğV;d}j£Öì…¾çÚèoÃ½ë´ÑÌ²!¾£ög7‡Ô¯ÍòÜË)î7‰5PôÊNF«®yj–ÕÒ$hã¸&ê-îşÏXkg	Ç!ê^<-gÛÚ·MÌf³ílB;ªJwïîî(*ew¥f®9&wÂ5µ[#ËÙM{°¹·;ÚÙ3i“!¹[79p¬‘ÃÏäÎ¦5Z¼I.„-œÑöğyÚâÁÖÎæ¦˜tKµhÁM‚¤EgËÙâZ<hZƒÅ[Œ’q³ÛÎşh”6»7ØjYû6ûbCÊˆ^lÈÆr§ÊjÊ(xI|d}¢²j­íòjdïÖ^tÎ?^tÎ(ìm·ÿé¤Óë¢ó‹ãŞñşÒëö~ë :ÅÄıç§Ó“Îû5âHªòUµ
¹ö’„Ótu.ºoI<MçìM§s¶„Š©*à ¾‰Œ¼6zr'uÇÌ×îQØ´õ/Äv½û%t÷7L3ÌAzƒı—ZÚ¡ãrÛ?V-k=g2·PZAk’ŸiÅWï?WëíKƒ·ÔA/4AÑØ è†”ÒÇ×bÆ¡4PÚ(j
¦ólPš¥<­	xJksp°ßÊúµ—ô^»NöÖµe
¼ÛÈñQï-Xûh÷ÀÙj'WÎõî‚•;£ü)TN®—ë+ßìó’Ş×û&-¼¤F³Xš_pÀ­–½³_èØ(Ğ9&4à_Ä2–¶àœÖÖöĞ 92FMcJ† Óz!	ø,ñÂŠ•sÌ”­á¸^üë4ìJ¬¤-øïbYÉ‘’p’£ZœjïI°¤ŠŸ€ÙÜcÅµ1ƒëuƒ$ígÿùÏ?ÖŠ5ã¡h“°ášã’ºôiÂŞÃ›úìgi+¼Î´5*gÛ|oú2•m³/÷L_&Rjöİ®é»DŞÌ¾Û1}7•³ôK.PL4E‘2®‘ÜU¬5Ïjä­ˆ-ª6³ófûšÁÊøØİ_l·U3M“"|éÅ†ì5,×G"»…˜åQ;æÀóèMkô
­ÿUü±.ax »×Æ¢álæ¹Câ”³ñej7'aƒØë‡cÅˆæÑ¨±/Œ#ºÑ¾Ì°7~º8iK¾ÿu†ş»½T¼è¹Ó+ˆ;ò‡ó	¹ ¯{üU¯Yb£(¼ÕÎ¿Š›–±c$5¼–ÄÌög|0ÿùşÏŞŸİ?;öÿ4’¢ÿé.•Ÿ/aù9ş5ÑîÿÄêBü+S
î›7^(¤FÒå!ÀŠ=f`zç‹ÅM/})³yÖøıº÷¯ïËøÍ.AÂ/şµ<¸¬:³£CIØS­¼¶+«I¬ÂJJfB\¢Ö¥TÄ”Î}–ÔÂ©‹åÔD#QÒjM6gş!VÊSëT~˜öò0Ñkä0ÖcÙş0#‡f…ìC¹@,xD…Wa‡ÿ('`NmG%b&´xâNE #©ÄGÙíäçÚQ­–Š‚µZM²P41¯˜yÖĞ©oÔ6.×Ñ³ZíÙÚ½şU*	êËñR`É¦ˆğ§zØS=ìªvTûª‡‘üÎ—(w¥,•]Ê[RNÖœÍÃq‘Ró¿¸²zí°&ö¬SFÉ½úxŠ)±öŸùÛã·o…‘ÂÙ^ü{ÒÚƒÿLkk:y¬øµ¬|!æ½m#Ç’0ğ„?²„Aà¥ÏíQÇ¸Ó4¦é{”64ùo˜‹û×xx×äKÓŸ9x‡@Îî?øğ¹·H<`¹÷5ã|o‘ô=øpœª™?›Ï xj€yMˆÙÁsÌ†‰{H°¼mÿ
è~¹#‡cß÷˜‡ı£Şntû+9zÀ¿K&ıÈ·j8¼w,@g*ÖŠŸ)R©ûÜ™ºXtğœ\ş6zåN.ÁzŠE‹k…€¿uî”óHÑ¬5Ä<Ávi¤‚ éìsh#Öı-tQGU·mc~ŠjeOÈh¬pÌ­é:ú§…)·ïNæ¢RÏ¿ô{ÁPP)<!5*Şrº3K¶~ÉsRÑÃ²›så{ÖXìuÆ»jö"X½Ïx¥"dl|Œá˜´Ë’{…ÃG"4¼Ç-m®Óï=î{—ûŞá¾÷á»8E^^Òäâ%kúïG(h¾onÖ#R¤§(Ò¥EºŠ"Z¤£(Ò§Eú¥…b/¹â=u[J§„jd¬¹•ìµÌè$¸­`¼İãf? Jˆ Àr\ØLÏÏLÑÜü^Z»‰V51İÛEµeºTÊB¬˜×ÄIbçùşîs±ë‹àÚd8²G»‡æffƒ´ìÇŞ77íF‡æ†iƒæ¬ÖŞÖæsas#gt0Ü>4·e478h[B3,#‹‹í|&îĞÖhëğ	°¹7·“ô+v§µjv¹Y×[ÕuÛwÓºÁHÌ¾n²º«3²¯1Õ°&æ÷œ¨ÛL4²ëÀœº„±‹ÍâñC[x¯İ+QÓu*ÅÂHIYy]J×@øücf]‚›õ<ëì ,õÛ!>ÈœC4±‚Kw
şh“‰Ü×>›ò.{<ë9—¾ƒ>uŸ­£ğ6ŒœIcîfW¼Ö.øâ%lsÔz¾eñÛ'q"$ÉÔÆŒZÍÃŒß\KåÑŸæ˜êØ)òÚµ!_LksóçC•‡${4ğ£ÈŸ´Ñöìk(s¨#é,¬¤HkúÂ˜üªt9$Q¸1t</íİŞ¦ÌòàøbQ3ş}âÚX‡Õ´€7MÒÂÒ*¥DÙ JTÖ—‘¬lfïon²áŒ5 @·SğÛ”ì6‹e×€°±˜Bèf³¹«QÖ5¬‰¼,oÒÆğrá“b“ot{{§µ»›ëütŞ¤½¢[ç>í¬¢Å½ç;û±÷Ùºm„•5ÏjÚÄL©;¬JO
6ìíÊÒ¢]Ş¥kaê÷šô/Œa×šEb"ë‘w‹îEUG”ë9ŸàúnC+°CÜI›ú¡·	\úa‚9™q—ÛˆfQbpé‡€‰Îœ˜K÷ª	Má†py¥¿4ãPe»ó1š„½îÊÏaÿ6ÚÇÂ‰Ò K/–—ÛK[b¢bCü¡w“º½'Ü6™ÊŸo
v‚‚…F¡¤]°¾•>ò«©gD\3Ñx=û·©Ï:n…®mq[˜·-ñ	naÉô ´{Ìš›ÚÓhÜ]Ï®;_œéš¤;	5*7'î“Í±”T~gfˆSºEJN4îPƒf¨HHikkÓè5Ò=üZ,Şìš½ÆŸ¹‚e³¡ ŞSL` BUæ†ÿ˜8¶kQX™İ0‘	ÒÕœ›ÊÜ!*)Vî[Nj@{¹tG5^:ÔÀşk°„ŸÜÅÖÎ_ÑgÎŸ(ïj/_¸“KÃ£ZRø>q4šX7,À/Œ È5´A]˜?SVÙŞ¯,ÿôi’$G5N¾å+£ƒh²yHªÂÇ>©)6ß£§@ˆDÄDM\ x+våÆ¨KzÇ³Àij¥Vl“útØÒj\éÄ«J^‚ëm"Æ™Å.<µ&³CôºÓÇÿ;C¯>hF“o)¼”„ÀĞ4Õ8˜»3¶êdÑÁ	‰a]µ³MS±ã•äÅ0õæäŞ‚ÒBÏ	¤Æü¡™·½Hòu`	©à4ÈNJb¼È]ê	Q_ ?j•ƒ6µ4râµŞ=mÛ›‡Uæ«0VjùŒç‘XÒ\Æõ?¡ù!ß¯z©ñ4?ƒƒ‘=9K™Af¹M(1tXÎ&õ³ì­x™=8?ƒ#ÛÁk»”dÆèxÓ`åL`R=›Àîê'ì×…	Ä¬eh-e™y=À4`e9˜TÏ&°³ê	¤¦øü:6µĞ/>ì À\PÎrf1iƒÍbáYÔÊ™9Uí–‘(K+Û¥‘@±v:Y™ôVÙ×ŸoÒ×S\UÈh•m‘Jï¥²Z•ˆÑ·¹CWó°n¶·ìÆÄİ,ŠoÉIb¹iPßÒÛFqÓ¿e·%İæBş"KÂ©ªÕ@ï)D]9;Î^áR1	Ñ#ªÃ²Ût†¶½]¸LdmriyÛtÆ‚Œ+Ér²™)U‰ùÌX£J\äËS¬İ`Õ{<w×MÏ;¹'IŞ˜\{ùnÌ±ŞKÌ‰÷¤5-y¬&v7ˆ/ı&5‡ÔíGâÇ÷ÁŸ†>Æ§<?jföæ/S˜‰Î©ó&ÉhëN­ƒ.%7•Za–/t1x]ƒ¯[=Íü†&›4Óg$ã×³u°Ó‚öÙt>Á;ˆ!	nğ/?½ÄBšî9º_3²Ó”%¬‹à£ĞÍ“»ŒWãıƒÑËÌ2sLà¨9@'$%²Ş°±¨ w¦„“Šİcoô8™P}ØÏÉCbl®¯©ÌÇ/6ÔMÉ#å1Œà"ò	:ƒ=_-r8Wä#Rçe†üÊ{’]y·ñºÀ]Á+íŞúÁ„¥ËşeC‚Ùò•gŸVe›Îg¦†6·Wl·[¸Û³Ac{ÉY©›(°T©©qŸé“IÕ,ÕŸ¦ö|Œ¢×Ä/zu¼SPıı:ê­£î:ê¬£¾:]ó*V3*$±$ë Í=ğ<gxÂÅØ
\š‰]Y¸ú¶İ+ÇÃ\ù3F× ÑH	.7¶²®€m”ˆš«IBl@(m*'¯j®kÁ_Ch¥\<©[@00¹jql0"AÂ5şqLx;“‚êl¹şô5DÖİ)#`Ô÷Kù¡²Â·š»hvÓØF³[òóÌAİKŸd]MRü²ßÇ;ˆò¢4¿iÌy¼KÄSg¼Ëğ†ÎƒĞ¯·MÜ\8Q–çI÷`ÌÇ¶nBÕdif2uP>îZÛ÷hã%Û·çoŞ¢zsfÔÛ“®×£­=.ºüõv°8gyvvÁãW¾â,s<KÙu>¾
g~€Ö#ºÀÌ¯÷~ëıº÷¯å¯wzæ2x|CkÏ0§®5ÀÔ!hq±EVj;®\®à¤ÂFMìvúç¶F,£B$	q"ŠœTj5]”ÿZ	á…gğ^‘HâTì»›Uå(v3N±â*×‹tKÙqw:›G[ÀùÕò‹åÍ1]å‚cu{xi–îêÅ©w¢NæıºÓÄ_/¨Iª×$Ğæ“Œãù6‘£sÂÿnFøw¥,×{Êv!³úp¶ıyD\¸§şÔa?u S*÷“vq¹İÍ=O5¥
T`º
Ä<µ¿_Òï9~¥ÄÇ€W#}ööÂ~Lhc¡÷q:
šiô{ÚE@Ò7BH¦Ì˜ÂùÈÜRT®¹‰÷ W~(kø+m´ç˜x¶j$ŞZ7ùy¨ZÃ¯&- .Úºò»4‰'¦y_ä™°³c¸rn±”ßtíû˜¹Œ1÷ºa!6šÌK¨“°]]'Œ¸¦äÏ/6èşZLnV<’ZQ{ÔÓá(DçÖó(SûiN ßÊ
à{„-n+Ø¢Â»cb0aÎF›xÄ3dG…å~fM‹Œù@Î—7+òå,$–ÊÀ{T¶Ãèí¯‡{D¿Bœ{y£ƒ2IÔh)û|—ä`½aÑªØërªg,ÙİÜØÙPDü¼µûÈ4Á›z*QEâ/ºZ‚à­Q%I"Íá|êwqzèûŸ« 4qÌæÁÌs¤´Á?:i°~T¦ŒŒİj©ƒu½*q$=g’ş½:"`I@J"äá£éEeòHÜ¤WK¤ÓU	ƒô™ı¾:‚°š·Œ"èÓG'	ÚÊ4;~¯–$h§«Òô™‘ùº:ŠüPÎ"ÈÃG§ÖÅŠä»±¯–HŸ«Rt™Qùº(5(Iµ",¢qkÔ'ÎßÔ«$pfDpgs_Ÿ“‰b«xsT¢·xâ®ŠUT9j,ÓMãÔÁ
ıÌõ ™‘¨5ÔU#ï£aîcBC'r¡â³ÁyeÄÀ–	¤¥b
¤îjV®£XœèW…í$O¡p‹™7rá!Œ»„ö-tVb’…bßÕWr¸s½±ëxvÀ4•zG¹µolÑãÈe3ukêNàû hˆ™Ó ±UÑâ,c’2s fæº;VêšÅøH#Xµ9IÉÔ¥xcA06ŒFËÀú4°Æ‡£™3R·'<šyîUYY“j[3+‚åù—é,iQ;1iÎ6•MmµU{ÈÌ¿˜Î-xŒ<`êkù:Oc.âˆ¾OM½tY ÂÁ4XÓ0vhÁ²áV1nÜÆ_g@}ğ»A¼-HvÔÎî.Ê+Üù‘
79O¤Ù@åÄ¨í7ë{†™AÃ1–’Te,%¿T•ÑˆŒc£¤*beĞ©‚)ÌhízoÒô2»kÜ†ıë­º‰úgØÁîª;Hd{óşuVİ¿ÔæfØÃş
{˜ªL¦)õQ–TÎD|1ì-q³UgòÃuøyÒáóÈ-¯Ëº0º¸&ƒ—†ÓñÃ—ñLwlw>1ú
¾YtD?Š¨Ñ8ÔÎîé‡\ä°S[wí¸ÙÉ¹^‚]gÑ‹UbP;èÄ3ÂA)ÌP¢Em5w»½xyhH›ğI€¯M;¥ğÑ@xm˜0ƒD¼+3†8)ÎjÇ ²mKEF›úPzËGÑÑ‘</
ÛŒbŠ¯vdt4{»ü‚-<¬ù£¬g-\çv×:Y0¼÷_Ç˜’‹«…¤	¾XÕ€Òk—…GÔı:Fê‹¨óuˆ»M_xHı¯cHéÉTï1¸q·µy_vˆÿ‡Y¼Â2¾ƒÛ.%)Ğø¿Š•Íª$²1ï-<æşÃ¬²‰IÆ*şs¯ñLGzœVH–²7-bü Å&·m¥²et,İ€İÍ¢ÆvláŒÊš:Bjopá¿·¸­øÚ5p<ëÆÑËê/t×q±(ğ§—/?8x,†şáù¢E·¹–<Ö®¶IkÆ]Êİc¸SâTM¯l¯É6“Ó]'¼æçï¶B4	ğ,*8Úïû°Ìñ4G€½QÁ:vn`L(·2±&YôtWy‡èŸó‰gxkk›q©XmË³&|è8½½ùº×n*‹¼½ÌEŞ7\d½y±Ò"ƒÍª¸ÊÔÁ8?}ı*C5üR_Í'sÌÜšÌWu¿hÚëÅ1W¤·sçY}’…ãë~­¾–a¿ƒãö‹sáÌü êÍ}k@SÔßÆÄ‡5ôôi®¢º,…&ŸÏ±OñÛ½h‰ıHBöµIŸ×ë¡Ô"GëqÃÓy	;ÃædN=SHDßÓ§(ûK3
Ü	îÓO¸çÏ­Aª3üÙTP8şNÀŒ®àµ/dœÏ šĞ}¯hKÁ­îÜ
‰ÓŞÆ}>™{s2\³xP\×>)dMŸIsxÒ©Â•°ö×b#æÈòBGŞ]â”ä„ïËvHâ;¼ê°lä‡BÊÂÜ¼Æ&2Dø›ë¢
TÓÅÚ§1j\û\T¶ı¸yøQTZœÕLEf¬¸û|Û¸Q)–&”r×{NÄ’ãouİtH"›®-šŠ8(ìCxó•ëy0“ø{¼_¤¾íæØ
ëƒfòÛš¼ÏDa‚êû$œRSf[lâÏ‡Ş•óÉ:Ğ ÌùıšÖ,Ñ:Ú”v?©şÜrmAåü ÃÄ%‰,ì¿P[[RëŸ¦³íÿT¾ıB66Ğ;|ìÎĞàõƒ]ÒE 5œQÒ8…<2wèwÙŞÆ+
ÁpÀO4Ôï54×FÓ9XmÖt0÷-wæOÜ) ´ó%s?¢{ü¿#tw_œºÂÅ¹åøOg¦i~m’?¤É…³§ƒşC–fXXú/9)3¶)Ë„ÎÍ ´LnJ•u¥¥„…s-Í¶É	ò™¶Dµ©Şd½ƒwÉòPò•­)RÜeÖ§™Ì¯´¿ª7Íû[œC“æ„«@LD4£xsÊÀuÂz¶Gkô®vl8M†Ğ8MÑTĞb‚Í&™ÍPôl6„Ô5ğ4·T4µå©›D„Çlˆ”â§gCôæúò;W‘ï×Öš!ëêu+fiİ¬M`:¾ö'3+pğ	B~˜¿±£½q"ËõŠ^m™C¦“@é‰ÈêTr™0>
uÜœ„€Ù_pØÊÅr`@]áB`¦Nvü…{êešLÎ<U£ºb£L³6ïb¾	;l³Š‹pK¢( ó«xLçBÄ:D^<U`ú‚Y€ÿ6IWcc¼1{(&1¸/-l%ş¡pG=f$€!p½Cl¨!XAWşŞZæÕÏ\ùÃIÎWzb§†Æ¼‘79ârì©í‡ÆVX¬Q©ÇÃÚR{tçÍ7ÂÛù=9Ö…ÆÌr®õX°œ^^YQ[ilĞ{E£\ˆ´¸e#]\Úx8´ÍŒR¹˜¬wÈe*Ø)ÔE¦Vv’…7Ë¡]pQ1ñ}Êr¡/zÇ§Ÿ:¨ß={÷¡Ó7ƒtÈUó¼ö’½>Ÿtzèy¥jöóÕìWªæ _ÍI5Æ8ßÇ Y¾VÎ/çBĞÆ~ñü‚l-C„›ùÔı¿s‡,£{Á*»´FüúĞˆ>ZÃ¥A¸5­)Sfˆ?jÄc'Z&—‡i¿–` Áw“‰¡ü‘7¸«1YëÕÀıÈj@TÍ TğTÙ=Fú!œ.Gú>®ó7#Jü&y£k×ki¾Š¡CÄsÕÛ÷ò	6pİağ^<VkÎ‡8	ˆÕÁ·VGcNƒ¹R¦Uô‚”VAA9€æ- ™FçÊRßê@\WN`Îğ™p[ïûwXhtJ?"Ş¤fM¢#ZıFîÆÀ°°\A/¥ÊººpÎŠ§.\4A©Êß¯jÿ%î¤ÉöK@F¾Ñİ—ÇÍ¦Ûï˜P2ÃÍ®´ı´xnÇ­"‚[Ie%Ô}¤,ˆ¦2hY‚ ¹+_z}ÚŸşÇ~çõ;ïºï;gè¤Ó=kÀ?ŠS»
˜&â´ó9wA†ÿx q6¹˜1œ¶”%i‰XJ¢IITSÈ%ÕzÏâz³±"Ô5'ã:c ŒgQ”ĞE¶5µPd]ºXBXhôÎÏãlXh0ğCZ2PÌ÷E×Ç“n$Ù>>}Õùwç¢³J¢æçÌ©NÍoŠ¦/ËsÃ„š	õ†sÛSöTÏïYÁ-WÖk`#/rğ·[÷?`ŞC³¹·2¥ïkcô?½{×ù€™ı¤ïÄ¼…›ÃÈƒ4³3¨øMíŞ(šƒçáÉ†4X·Ä	‘l“ãÍ'x›xó)ìµ;âƒ@½£‚5Üüˆ\ân.[}­ÀOKÇ|º W/X†&¹Ù:Xî´ááĞ+éŸÎÔ•Û¾*•:($T,vØYÂ´­À‘şÃ@WÎ¥kEøÑşŠeö9¼Ò‹Š1VDzª*³b@Ãä×2 vÀCÆáF ÍbœF[ŒêÒg”û”*Ö—…waW™$“%i`¡ZÊŒYRöåU˜Š7=f–4öóÀ¿œ0D?¯0a±	Â‚.ÿß]ÎcÇ÷Ä ŞŠ„¡ù^ŸwGw{÷¹´Y¼xvO¹˜Ü¡QìÂ+r'8d1gôŞNº —;Ue[a#0ˆ@ÓÇ©±¹è'¿äV,Q)Ğ…ÁİBĞ{üJfº‹P»¦pUÆ€;@t	 „iì^Dşšçâç¶`k… š<„9:íTâ>y™-ëgêz¯˜äº»ø°ûãF%“©Ç’<7æ´X^˜_åËÃ|%£äÜ5yŒyò4IA)šİà3WŒEÎDš'ÒUÂZ±€Í+®BøUA„ÿ°ùF÷?›uÜ0ÊÌtrM"„×Ôw½š;RMP°& xÅŞŒ€æÇ\p± SÂ¨ş—QüŞX#ÌµØt%Ò0®(ÎÕ,ÒU–©ÇPÿl:Š±šØ•ÑÀ	 r9CÊzĞë¨“0§Æfé	–ñtÑÿüĞû¾½ÏsyHœÂ~pqôŒÌ–¨ -]ãëãõ—l€¥TVÀ~lüÖ¾âUúw¡ó¥ØÓ±ºg]AL8ƒ:'l’‚|•jŸ`U^óCxv/§È7C+J¥¦ògŞ¿Vª~P‘µ¸×ÆãËÛÛş*£t®I74oñ!N±Û°±ŒÍ²fÆd“·ØxbÈõªDQ¼g+©WĞ²sëh`¾o2]"hßA¤w*øœ< ¸((Uø@ÑIz…n	ï´8Êh »Ab1Õ˜dµß}ÆÚa‹¦İln%Bÿ¤pëÇ§~! ROîÑpøLÉ¦Æ+Ü§Ë’äá¡aæÉ¥¼ÉaÄ‰!qj÷Ÿ<hÓ¬×'ŸÎ:=Ò…WÇ'ŸNıÛ·ŠÌmÉÕ(Áëtîº*} #L%;Aj^Jc¿[ãRş¸úâ®bjñyÂu—…¦RÇZÖ ¶K9ØxCf'¥ª‹@ÙiùöBÆ$ĞAü{üO›™×“"Y­Ÿøœ||Õ9A>uû³^Õ/_wÏûèã¿/N:ÿ^CçÏ?sv(€ñvÜYìxOpt’–
B{ƒQw:Qcı ¡qï€•=À'ø3ğ¾ƒ”*µOŞB%µ…ÅGß–>^ŠÌ{à‹:kìÇ²Ç2^Œd»€î ş=Ç1HÈ¯L¬ˆ¥|‡8‘Şµ 6Å°_¡•¸+7ZY‹.gÀ›ú½1¢HcÖØ04¹âdNöjçúœS=‰Ì BèƒNE½†Oè©m¶hçó,Lr‹:ió×Y×j^öÎ9a?‰	”k
I˜HC‰„›©ƒ” 2SL1pé–c’»‰yNÂœ37Øâi…vÕ?Ì±â©†Îß¼Ís-™›öC.\„Évby¸nq¾ÆeëÓ¾a¾éãá}°B70[4‘XG²üC?pİâ3ëÒA,<	‘P8|’"Ü²#ä'¹ö]û(	t"œD:å
rËY®nmg˜bµf˜H8I¥À\¡†)g<DFD1¦3Õ`İ‰ùeã¿?ß›Lş@j¼)ƒÄy²DŒ(A[5‚=ÌS›¶ˆüZB7Ô½ëÎÁ§¦§KşÄÏü§K“=TÔ§1Ùõß_œbA >şñÑÿñS“W¡°^ïÏaí‰É= 7÷"ˆ–L€i¼ÇS#8:İÿ˜høTÃ—›ÆîÂáØ÷½.fÜèö×¦ç_úY(×?w"¿ 	ƒáQ®FR¡Q˜Ó5–SÆøÿ>ÁOÂ³?À=&ãµ¿ÂÒÖe`İ† yËãá,/:ªÀNğŠÈËÎÈ	'8÷ñq{TÃÂGü“ì%	Š¦CS°ŠB Tb§ÈİÔ`¦oxX°ÄPbJ¬“¼ÊdêZ\ 	°{(b­wzN;Ï:İ·èì:ïœ½étÎ¤&W±¢ó6–ôêHÿÓ ³T&#na0á|0¦ï«Ãµk'pMyi¡íÚ.ÜsZVàĞ™5¶ñöš{è“gM¬‡ÿóæn~èlõU´l›xÂB[á<˜[ÓuôOëÚB}w2*C¡
YËÖÒyËÖê™Ë™úÇâ.ò«ná}ƒÂ¢/¼!D
Ó³EB~“úôêÓ‡>…OãŞiı¢$(‹BÊÈ xV0J*Jiü.œQıMò0ghÚäê«éÚÀ2(zf}sµ6×š‘ÿ	¦BçÊP”%¾
zyc3‘Ó‡ÎÄ%kÆ`âçáğm?ŠòK İ³(>€@Z)‡|•»h(mÄİô/½&z·ßíÒ±3Bs€.¬3¿¬ C2ıy&J¦Ÿ_‘˜$ÀØQ#ÖÀË€×°ÑuU-k‰AŠfŠëFiälëöÓùÄ	ÜaM‡¼‹¢1~'ûAdôÆ­ƒ×«L#÷:„’¶dn7Ú¦¸‰^|2«Lg•	­0¥“JT<êp~a_êÉ+,Aº5 ÷Ÿ^6E›àaKK€íVX`­p'}û‹ÿc'°Œ½hzT—TõWŸë¿áUV£Q­Bê"¸E¥®üí¹VêZ
A”!„2Pbáñ‚ßÕÒËâé`îy‡ºR¢ÁzwÉûsèùVÃv/]İ0'ît9†Å„²uÂ2;)‹°Âw	S©L“¢ö”Ù ”é”ì2×åL·-Õ’O!._³)åŠÊş“;µ2NŒËµô,aÎº½J“ ‰:’N‚<“òãÍS5˜…—Ì«R28ê_YiêmÙ…kÈSyG2G¾Vv[.hn2˜z¡Õ«Ğ¬Àtr°«õ‘¤krî„Ö”²Ã4™¬bo> EUí«†Ú›Ü‡^bğ‚U&n«ÒmE<ÁÛÈšŞ®#7Î£unMİYİ¢/koÓpÀ*9¥Ko–Ã‘¯¯ÙË\À3ó‰©Øìlàœ—ø Ñœ	UİÏ–’i.vl¶p¨²ã'B›ÚÌ½ìî#+ÃæîÌ93¨ŞBdtàÏCï¶çDİéÔ	Ş÷OOîîĞŸ£‰×Fé¸˜Œô#Í§G?ß;åKqÅ*˜*–£$SdÁ·:'®¹ºÁUÒóÂh_½ìÎ!~b_Í=`¼†›Rp½  7Ìôy
ÓoSÒ‰¶ìè&Z=‚~$U€Ê¢ßäÒøÈ¸€êùšÊ"HS4.iñ$c,2ğPÙ#öç6u®GõóN÷Îş±„i_Ê¬jÇÖ·s)©A‘­PB¶3óCWqš~~EµsgzKnL^h“¬ îÜvŒ~}“ N‰TuÆ§~ä„fÀòµ>8'ZW¡›¬´Áìéz¶(u«¬
êğûå§‹™Ö$#òª’Ve+IÉk~Š«gMm¶VBgJâ#_À©º´4Ï U(u^=Rà²óò–XŞIõRı†§ÆÔ„•a;Y‰—†o¾¡ïRV·åäÎÚşÔ	]kJúÿÖ.æ3×K.Cè„V äød@OÑ+gj[cL¨;ù¨~†7º{9Åçqà %¾f89Hî-Ş‚wŠIi›Ø&ÀGB‡ ’z•\{…3dV&÷1 Vµÿ1ĞĞ(˜O‡¸êÚËºÊì—sdÙY»_[ÀÚµÌÙH–~£cO\,_j:òNhQà€ï^|ğƒKÚ­UœŠjÎXl›ó›œø2½™v2Sµ»iäîs@İ}¶´êÜ/¿ü‚úÇİÓúĞéußÃâñg„#âw”¾W–÷\ãp=üHÊ¦‰W©õŒºV~Bç8"±H„Éò‹ÛpéĞwÖ‹7&>ã2o0MUô^
,(Wè•e_:ÈŸ¢hì “‚ùyèx#	C»«çùlN‹~úT8?†>5k2ÒØ!Dø¶¼ÏT{”tzñn+&Ëú‚‰1T´-9ĞøÆÃùpè„¡2¿ÓOÊj/ê›ú“™çÀÄ¯­­Éíny†cğŠÍ!ÔÃÇgÛÆ¿?ò¥A¢˜«¸ÉÿpK~°„‰¨±#5Ò(úÍÖn&@qvÓØ£áS,"ªá|¼¼™@òı
A^ÌëId
ç@/f:ÛÀuòN®Ù—¸:zç¨$¨_QFa“1p`Ô×OÔíŞ§½c9–@¥£ƒ.³@e LÑ}ÜÁ'] ¾ûR3T!r–ÉÉ©Èœ‹ÉE1ñÚœ"K;©'ı6ôT'¡^cÜEàö¥ïŸôşõæµ—ôâ$ó€hù ıI”^õ‰`o´:)Ç'Êø¿Èá!À>âí®4 $AäÄm½¢Úo`œSz¥ÃGê™®ÜÖ·uuiŸv2š¥»‚ÈíŸ%·ó=·]Îù½ÄûâéH³*–ŸòquğÉìÑÖ&f)øŸ\ L6êTŸIŒºX~…%QE’æ~@ÊĞR—Ğ“î&”„ëeÑK/-ÊtÛ Í®q"Éø°\•QVõ™`ˆ¾ƒÏ"ğšÑ‰Eô€slw>1Jã‡~KÙ«ŞÇréı-tQ§fp]hæx¨Ô-(Ppucã y/Qßñf
ƒ£´¯³1ÌP}s{g{ím·¶¶wZr“Ì°’‡f'„ÉEùøHÒªg…"N>zX ­¯ø¸àWáÉao®>9Ä²¨6ß¡úLNÓ3­ĞZUl-+¸š‹®Ç*èÀç˜óãİ¹»:¿ä şuuÏJŠÃÛF—DÛ±6”`âåá¬¥×kš;—ß[[›³›?[[ğÏ(( ‚”´øä·Î®R¾úÍò\D.V6TY-J^3Èk/+ûo›‡T<¢;÷#¬ìY·÷¸‹S5-Éã9œ?Â*1äö¯i%æê¤Sa¥”èÄàTOv€U¸pÀË6±¸/ÇO>~¤ƒEÃCFäLì)Ò¦Úÿı^îk;à1Ïùƒ˜8ÏSê“°Ì,òâ›úı¿¸KşNùUİò‘d-ÿanûšRåİ°|,v+\kcÒS«Z?å‚›ˆXMUÎÍ—‹5ĞwÅÓÙÌ_à/2ñ"“A+r—|ƒ—‘Àmf¼ú)}iè1jd]A¼HQÀRÍô"FÖ77µ\BĞˆ4¦Aî¸«öˆ.ïØH™¸Z{_¢yáïÒòa.ÛTañ›õ_wÇY,—!-ƒİ˜Œ‹tÒj¹¾í^-%PCª›=OÈ·Ã§²Ê™u;Œ,N4öí_³3çp„j¯;½÷hvÎ>uNNşÏúÇÇoúeÊ5‘Q‹Ç—<âÎPÆ¬|››¢°ÙÓ„ã?¨7ÿ1IœôhÄy:'·Fœ9K…æ\9S¸d‹A¾M]fR.	õ,Ïö!sšåš½ÎG%eŞ6>/’Me´Œ˜ lTãyX*¤ZÚöZ lv!)[wÏ¡"*G¤™§¦úd!¤–ìº‘ÆÆT²}Ah	–ÚÓˆ”RÁ2{¡å‹Ë<‡ÀhÆ!ŸKñÎ9fÆBqra|ø”^Q0	ÂQ˜	4XGrW6&—‹ò›»%Fş¨›Z’ÕNsş$À©3Ïÿ´oA*Me©Öfqˆ+Sx«ÚÊó§—Šb†¨V2 §ªXMqˆ–é¶-gaq`âUv
Á-ÂÜße¬Û	wÈÛÆì‚Äd«ªnÎ…§ËÜ‰*Ğ^®§w—XÚå•
[ÈTÔÌŞùŠW ®‰¯Û[ˆpÅ^­R&&moM
7ø V~±İÈ™Úy
¡f8I$ÓÖÒÚ™E©4¦_!<7'Ô$+©kXˆÕzÙ éGÀN6QUé-Â	À¬aèéçş²òSz>¿%øå{åñ÷ÊâSœ ÿug¹jPÉª%°¥úæÅËÈ4^¼F øÑ‹¬ÉyÖ-½w#‰IO&‰“:+FÃgÑ0]A%#ŒáS9ÊxYCX$ÚXô~ÅˆcøT:6›ÃÈcø(£ß"[•ÈĞÄ©«X¾Ş¥˜¼ÚğàÖ¦6‰ªz;7«÷!Å‘ïò–:"İ“ZD­»¾Øa¿Ø”ÎVK|íû‘¢¨èÑbaFEş+yñZAÊÁ1‚³ÜƒDÿÈ%š¸7‡[oLæ^äÎ¼[]*ºık Å>×ñ‡ğT2Ùy3Ó’D@ÿ¦|ø¡VŸkÃhÙ{x_Ìõœ+ß³Æ‹,ü[øß÷È:ÓÕÿıyòÇ5¸1m	I`KDÈŸYC<¦Æşî£Qƒì‘ÎĞıÕ›U±mºX®iEm|ëû‘q’Ë"6(,e%iV‰^27¯æW‘‹féİvh‘Ï`àFpwçcB·"7D¾çŒX¥…À&Xõİ‰8ÜàÊ
İ1²"+ÄR[€›wg$Ğ/RS>»ÅŸx6¹„¹’<¼§¾my¨ÃüŒ­ˆ`Ñ¼"›Ş,‰wbÄ
'mò=ğ¯™Ï±ÒùJcØó~“w«ì_¸ÙÀÜ\:;i\îğV$IR|á„—A i¾OÂ}"Íy¸ãî^S<‡xªğŞôC–÷Z—ùºûZ¬$^ÃÕÎu“Ìw}íPX&ÍšÍäÂú@RØŸ^8£À	ÇâÚ„®–ÜDÍnÛ’2\&à,{I&kîÇçñ5 M`œ®;Ÿ›…„bdJÏn‡“|ŠïlZïâÜY#™9"kşÏ9ºkmİãCŠ^)¥´&ØÛâlèK¤Éê¬S²Jâtäér%«9ünÃõÊeQÏ.†Ùì¿ÂLÖ3]£-ü”û!óg*(\Î“¯:'è¤sş^Ö/ñ—>úø¯ã‹“Î¿×ĞùÇóOçÃ½œ™Ä«‘•(|Å…DÚî/bc\€Ï÷Áæ.Ö–0káÚÜØÁE0ıÛVÂŞ< S£J¡fØB¶,¸F§{‘Ç}’Û`ª±‡&v{ÖØg2åÎM’â\”W<IŠÎÄÑƒÍ/ãü5 L>=İ]çf
öü„œ|@u»ÀY'>åHúz('†afS¨7¤İÕ±H4ú£î¥O3G	ö×y€Wcú_kÎ8Ú‰5*ÁK•9š'–†À¹Â£a(¡Ve˜=¥ÿIknÛ÷-9\­”ïÂGÇ{á#â¿x¤½ÙŒf³¯×0a0°åÈÂé ï>cV¼§PaÃJîÆ¹”Ñd‘•¬=‘’ƒL™E*î¦B×ú¥,'¤çéö¿Q^Š´Q.s;VrQ²’î?‹gPªBõè˜$jì0&OW@Ã±3¼‚d;_9e¤ıüHaŞFE#J“ˆD}+¬¤°œB¡ ÌPâ@€Oò´Š‡Ô$²:ƒ^PÜù‹‰ó=¼#ğ\|4q;K¿Gi¾?æ³%Hóiñµ`É•LE¶ACkúÅ
ñ¬R9’ˆvàD?v—ùM
36ò0ÍİRMœÜ…‘¶®…Aë@o¬ÅùÉŞ<$î¬{ü’äMb)4/psñªyÜ€Ô*×;œ‡'ùãhä],3›;ƒül ´Rh",ş)A¥L S [>ğœì<àrè*zLJ…İ¿Bh5|P3tĞÒvw‰½}•¸ e}5Rù‡›úIÇŠ¼
É®@ÚÀwl…®wE²G9RéÒ.#Ñl‰4³%’ÌÊ]@¹€Èÿ,Ô’¢‰š°†mClÑ­?ñ¢£F5×UĞE³pqp›ÿ‘ÀÅ‘3M‡g,ZéŠPz=(§Æ¥ƒKào&Ë†]™Ã’æ^ÆI4•KbŠ.€(º<ÑŠÓ“OÉa‰&Q*ÚĞÈ‡@5L`^ET!ºìÉ–·²€©|4ªÀ•`—.štùèÙÆŠB¤
 iÅ£E	Fúpg‹‡ô‘N—¥àšàV—@5{`{j¹ßò¥ååÈË¥$æR2ó"ÓUø‰Üp)Ôï!‡9 ` Ì×á¿çÖ¥Ø±Råó3I2Â«¡0_Œ·¤ÂT
¾%—:À,x®ToİL±€`MÉµÔgvÓ…>X!zO~g1õó²ö¦K²põŠvö_Ó.’ÛK4 Ä¶lğƒËœüYZ_[R_¶Ï•>ŠäS4|îÀ6¼Â³ğ”v¼æ	ˆAé™×8‰kœ`¤[~±1ŞR® »¬3#1‘d„ÃJD+æ9Br’xg:©„˜ÛèIÊ‡s|şM#øşÖõğfÕD§äcOhdÉÿ  ÿÿì}ıwÛ6²èïûW zİ^ykÉ_q’zãôÈ‰›º±¯ålïÜ¼’h‹Eêò£¯×ïo3 H‚$ ‚²ìÈ¹fÏIe‰ÀÌ`¾'Ë,)ç w[0ñüñ«ãF‹<‡øCœUJVoC:Óáã¢5}Tıı£=rvpüö]ïŒ¼Û?ìõÉóUòbïÇÒÿ.½C9$Lˆü;};«‘*¿û5¢şİl|éMÊùÎè8ñIï3CKşƒü¢ÁJæØûåÃ1éıÚƒc½î¬§|^ÕxlÈ»f“Rò^ôN)Æ5lWz÷|{¦xzÕ¬cX5+y/zKcVïœoõJOêVNÙRšÌ›1lH+GØ£ÑÕôPnxwS6Ü6…jb6TL€ÑaGÉ³ ˜*Ù%×ó¢î9[JÖà¨Ú}PÍu2%+Dj¨é'şí`O:Ò‡VØK*ˆZÖÕD˜ŠuàyUé:ÄRÉäºåˆË«³®³óLÎF‹"=×t]Ã€¿f…¨`ed„ÑÀV³`µÄ‘B*è&¤SkÒÕ”4Ş]º™I—iÕ¸®ë½dúv+f5¸jêÈÙ6¥~B½–¶f©.¢:£dè´Ût8\%CFØğ‘ü@†¢@Î*Y·ÛÊ÷>*(_k/‰‹å¬İ“ÅŒÆPkQƒ}íN…‚#%Üe‰µÕì2çe$VÔ¿»/¨ápOhxk°/İx<
é%nÄCª:[êÃ`÷®æmE>úƒb«LÇ“ïÄğ‹7é¨ÖV3£µ5räØÁGú3‡…T¼¦Ş0ñ˜İ?2@7ÏÁôšqÎ<,ÂŠW·V´ÛŒ%íÅ‹Úz›;Ú—º#½,v§ÎN&¯èïµ‡Ø€Ùúû±üE¢NÛ?91êDëc¿»ˆBÂ?²rÀè,,åNymõÏ1/5Ÿ‡ø¨¿—SŞ*hG{'Påë"00¬5ò(@#fújcf"Í°“3”9YKCãchlƒ¡±†Æ6•@$$"iVÜÓSã¬’( ·(‹jñ|	aãÆÛ#ll°†{R„MË3,
iQGŒE}u³;Ó©mvŠ[sÕ­şÖ²dó#¤±Äv7GË“;9[2«²İxÕñoğHá¶®E‘§ÜZ)µ|ìv»’D´Jä¿9(|‡$ş©a¬51ĞUÂ±,3šÓ.âÌJè=‰íõ²åçVüS‰0›vŞ™0%ÓUÀÃÇ“)ÈºR¯Z‘`N_ú†a#¼µ=åuİw¯ãh°jµ“öşÀ
	8	}ùÕRv¶¯4qœe°?Ûk™\ü_íöÇÿ»òé‡•ÿZYs5ö${rÅàÑ±û>n|*–¬×¬sÓ²7š¹\äÓˆ õµúÇ½ò¶w¶ÿ[ï_ÚåÒA’òşøğàxŸœ¼ÕŒpcwú±9í83—¾2m.C@İtù{F)†U°5º*25ã~?×~äÃ}2-²t¼ö:ãqë ŠO¸6ê‡u‹.*ÈŒü°+Sn@ùÁaúÜ†în±·ğfOWÉõ²ÖSgÌı%'ÖUi–¼_ØßÓ©ò?ÉÍ+KoÔñÅú(Ê§Ú_òXƒN?™Nixº¯¾N¸úõ¥²Ã[Ä»ØÉÿÜùU’gV•0±µ½Mf,Ï®œö’¥aÏßf¨¦ı"£ò+ïìÃìkGÌ&¶c~»M/(=„¹_ÛzËù…İ¬
Öm?«[‚_ßcÀˆÏM¼j…Ÿ™§­Ko±psomÂÉË¿³ÎÇ­5]e}Éwµ`=}ÜYÓõk“¬»Ì}îlDõéxU6–Û«ÿ7îlM}ùâmj3åşù±€µéôÊ¯´ÁæÊ¸ip(
C×syîC?†=F ‘\ÈÅ¹BÕ´|‚R´IO,ô‚ÉÃQçhû^›?ˆ×±“çâá°ÿL@Èç,Ñğ©Í<ñ%cÈÆñ:pÆğ6WœÆWLk±ÓúæLlÒŠ õ\1Tr¶ÍÙÚÔ²’õ@ƒ31‹ÅÕÖá›quÆOk‘‹¹T¹2°4~›0ÑôÚè’S¨‘c>ÓĞV®8áˆÇğ—¹°éµìFìzŞ®¬Ó˜© úËµñSãzÄ,ÖJ“HÌ°+u5ã{tVXš:cÒXG|‡Ê¶QX"AÅ®¯—²öÔ5—²4›VÓñ¸È®6–zÑ1'«¾z¿Òiı{×âñ×®ïF—”¬‘ãƒşCÉâ—>Şñˆz‰aäíE¿€Ra+Xƒ©ë+ê
Î,ÜÖğ§5õ2£«º—©x5sï­[´Ûe<Ğfy^Æ#‹»Ğ´ú>õw¯ŸÙtŸ¬¶£Ok^e¥õª;[íÏ·­/%_6™ŞÑ	¡#JfÏ
ş
“Ë¿‹EB…ë»ªº¾å6ºö²A»µ¤ÿ#{HmÚŠˆ`\ŒÑàÎMŒ¾õG6MQi‹g¸çIt syô¨•·Tš©Î._5ÖéâHnu!çj÷ıÅvè[¬ÙcâDµ5ÌŠ—ª2ºlÄK²¹­”’^×»_òÕ¬ƒ‘|Õ‡{©®Û¤yV¯F‰ŸÕ«Q*hõ²èI•_ğ–UÓ_¼ì“¸w$³ÔWäë:’+[01qäé,‰Z7–”ãò¸§¾*~e–w·"Ö€Él
lüt_¥ùUW,™ÆJ.ÁT´6›¹øa1çAäJ,Ã4•µ¹æ%N4Î¤Á@óç™´d„—…ÌPËjmµò8Ü‚ÖÛÙÒPÙCÓ“Œ¬FÓ£ij{q¦©Í.9JXÑšwNBÑÇ9»„Q Î*%…?Z¥­RV©eƒïW/NåKækÃşÚ‘3ÍSêQfª2íGó”òšÃ<%üx€Ì	V‹f$iy«Ñ„MKÆ )]ç«Ú´¬w¤™~m›VühÓÒ\×ó˜§¬ò¼Ê×â,S·°JİÂ"e*UV¼­K•Y>Z—êwõ6*Kz]«è™«[ ìŸñ_Ç+MŞÁ‡Ïz§ïğá÷ÎV–bq…H2§OÎ#½3d±§Ğçö0òa*ÑKY—š,ªRWî©z53´Å†¶»7´U*.ğÒN}Ñä[2½muEqÅwã$J"ŒEN=Ûoá]—ô*_#œ>	l¡9ÃOÌH:Æº]Ã1õ}Ç#ƒ,I;ù™[~W¶ƒÌ´ír¶¤€Q©¾m|Â²JÙEyh©¿ÎÜÉ­WGp½Ù'oöÏz‡;6ÑÃ×ïY1å.ÈıQ[“Í·ÒT¯€ÈÏ”Ö«\Ó}·ÒFõó %+tÃT˜NøQ Ã*6ö‰£O<1¼^Meób*’àFËju`fCìLÀü‹WÈÍ@u?¿Ù,QïæK½„i³Ş°âæŒL¹>ZĞ6“á¥Ó;2ˆJ¦í;zS+îjl^EÁ½3Ğc'dÎ¨;zÁ{öıÁ›;ÇXŞ½Z —Ï¾\',±ùÅ7`lÎ÷\P|¶c=v0¡¡¶T|İ™-™xXædò£EY}ñÕÁ20ìNó†Ifo{Œ“´ºã$¥a-ÙÃ¼VVFÅiÉ°%˜GcØEı²% }1ü[”H["Ì*…­Şb‚V%—–aÊa•
3=×µ·X×ÿ¨œŞÍJ[Ù}jö0-Pø6œËïEQ×œ,J—±ÂqNÄzdÀæ¾3À?Ú‘8¥¾ÿˆ]Ö~<úÍÇmÅó+ZT(@À:hH¨{q ) ø¥âæšªc…ùÂä·kÊ‘­ğ¢ŠyõDóŠ2è^ÓqEÛT:Ö[+]Ñ©ø½=\em¿@sFXíLtÚ…5qVIä°ôºñÕùğÎÿ ØLÅä
<AÛAVÉPş©®NĞ*pã—š·ß˜K3ÖaEÄíI»ä£€Ö¯‰çÂª´z	 w„ûÎØŞÀ	ñ÷“8ƒ?³¯ß8‘ø¬ËL„lìŸA˜~>‚©Åì…³ĞõØ7ûá×ÄwÕzÜ'óTy¸#
lùÌ´H³\q—µi3fE¬t¯e{ËZ½BSgÔ$éòÆŠ¸mcã¦š&«p^÷†@|Swˆ¿?ÇI1P%zÎÖÓ5sL·C¸'/UV'¾R£¸f47:J€sóÿ³.b³İ3?ŸøJxj¶®(„õ÷k?áÛ`ÍöØ¸=†]íÁª´“+ó. «¯ƒ	¸Â\
ÀãëÓú˜zĞYåÖT¶µ¾îîúm`üÀ–%‡’/ÓRÁ9ÆÚv$Å	aã}ELa~ÂÖNã.sã¶Ûl¢â¹µâ8+äodc}İ$bíuóÊfdÓ°¯ÙNµ'GÍ´È7`—ĞLq>Â¶0¼d`ãÖßIt57­ÃKn^aSm½ÒâÑ=Â}:·ÛuöN>‰Lv¸jÈ=9yÁÒÇljYñ8˜
²Š[œ¥Æş”¯ñÇ)¯åZ\ØÕl±Zß¿ûÔÒ—uÅë†8(UUXÄŞÜ1‚Ï0æ7¦–3/x¥=k3«¬œn:nİ¼3Ï0Xš{§fî–³7¾W‘ôVRÿVÓ~h³€Õ '#jëµÑA¡•3IT@
CÕv<)xÍk˜¥©>½;OHÌV?ß2ñ„8‰ê)Ÿ´5wÎ;äCÃrä›©­\ßP´¿×Ëæ¦Ã5Òµ¿‰è¸ºÎå9âKA^§Ï!­ÿmÍdX¨søŞ:„äEw›EÈÅµE mcIî8šä9ØÊ†¥ğŞ«kXX‡z4–N)Ï”¼‹ÑD‘ :DEWè¹BÇÚ­Ğl…RË4QlxÃ´V¡°
uµ¨¬¶>qİrj:–Î9D§7–ó$²oÿ²³İzÏÚÎzÅÊ8i¿è20lŸF¶¡0Í_$bIÎœ0N0l`b·ba>µ
)±*Aß˜l„àxq˜òQŸv«åsU¥kİXc2†[¹ôv3‡'İÒD]5ÌÛzWR–Áé»ÑMãxÃ7s£ş2xêß–»²7²Ç¼’³ªÛÙäæ´¾8š­K_ØÍĞtS_º‘Mì	^âOğÂ½iÂL×‹ÌTÂëW"¥ÇÅ¶[ÕPçr"|Rş:Ô1E®­ó¨ğêÔ }ùÀKÅ›Sdä·w$3™–òò\1w2ÏkÛé{%;Ç¿Iú%SVô°”HÔGÖk½ê4†¤‰çÒ*äÊ>G²ªàxî·rÑuvhİ¬]—N-Køï‚ãê½½ùDÓÜ«y¦•@/É·óÛ.„¸^À³pàZ¸pÙM*õ²PçUÌ-9íE"¿gÅP2‹;õ:—¾°}¦É1ÙVù.bXÆ…áÌ:D¶És{ğĞC#&¿çš=OØó¬AãWwàÑãÀïô&±{ÎŞÃôF”œÑwŒ’¸E·€Ú^
kú_ëÂhKŠ?¦şˆ†#’vj:c:»Yí_LjˆVÿæ‡4Ré›ŒZı¡ã_`‚`í¾ñ‹xÌà8ıLÃ;y‡FŸ%mV.{åŞy¡‘¿Şá»„Í¸i‹Sì.'—êí\iÇõlòÒ{®7TQÜk×ÄĞ>6¿j­åùU6X<’lÇ·²}—±´‚K`™ìáéõp,s.Î¨aWşb¡–&Ñçs›7æ
éLÙ¥¤ˆ€øSQEx›ƒ{E:Ò¥¤ßk €›¿Ş1 eGmohğši;'÷­ë,r2}ï–‹°¼*_‡½‡ˆ^í+î<š7­V7H/sFi-Ù»îMÇ¾U„¯byÂ|Óaìc}OÜAÀ¯1¦“Ñ»3J÷fï*­rÌ[¶ëöĞ¶5û +ŠîQ8/†éZúJÛ†]4ão½`@½\¨5±s¼56Ç?øH~€m²P?g„œ•àA<½!ûÃº9²RPM^ºÓ€&¢7–!êaíoä7wtáÄ·l'Í+¼è/uÓhn¶¨kXS¦®Á\jJâ­(ûîşÀÊÚNÈwÕÊ„V±Ë¼`8)Å_"1Â¥vÓ¸³Ş5·ÇÆ+;tµ4mFÅÎª‹nÙ”ñyuêL4¹Q6ÂÜ%Û…kƒ¸á¶Ÿ‡¸â4¦ş!}˜>%[ñÓÙu‹Ôf^kY´U 3¿
áÎV­â [ÓŸu¡yùµ¢£ëÚgwÈút =¢®O8>B‹N ÷eæ¶1r}7@Y»ËóZYkâ+ÏÙ½¾&—î(ïÖÓ¿¶ÈMõÕëjÇuåâ­ì¡Míæõ`ô-˜÷Wƒ®â_¸0‹V§Zmú,Ü”¶]Ş93gêz¬<?øÎìJ¿×C^g¹°0ØÛ˜ë¯uja!Éo•¸£/V6f›"6eûs&µ˜Ú56NšE˜1KE¡¬¢ja¥A5İ¨_ËBN÷U¸¡`¦ÿšÀ['‹fş¯rqÙWÓ,ÇÁ×œ‰:tH!µ[MÏNdÇ+[‚¢…¤,ıZÉâi&ñÚ¶ÕõzÁfKêÙæØ¥Z3u‘úÎ-ÑS7ŞŞ
}£Ü…Ç½•õ¹4À<–gÂŞê\ºû¾-ÎY–~Ôw0”««Á§¶j£˜¸q#'f›L«<^ŸNLÓÏé&¤üıİ1ÚRå€3ìLÇWœÑğ‚A_zkjl6äc“õzÛ6wÂsìË/§¢JĞ] Ò<+4‡A	ÄÚyÉŒ®È™{êZ}Ô¼‘£Kë¾&c|$ÍÅş„_Ål¯D£Ÿ`Üşªœ
™~ÅïÈâ¥/Éü§Ïñ®,Wšâåj›Ù›‚(ŒÑe˜ê¢<)._€O¦aå8Ã)QXDmå ¼¤•5ŞWZîÚ1ó;µ7jótuçŸr%ºÒ\É»dC7ªéé4«è±íMûÈnk”p¯~¶şFØMO7ƒ]½¶5‡€ôrÖNu·\S¾]ZJY,$¯[~«æÇn—­t¤û}6Ä¤jVì½¸¯XÅb¹j¿K^¶5Õ“i¢Ãß›•Je&Ê‰¿R¬ˆ}«=©€Šã“ğrj{Iá0Æe7KîÈêI,Æµ¯íSwr¨öØJÁñ©Í-½J‘˜Ji›;9mu_j^<Ç«~ñíK°¢Miá‹J¡|r¶îVµtlH[ïL,%&Pà*±BƒƒR‘íÉf€
	Ê?j)ñÖşôíùüé"Òö…_]¤cCêúşY:÷¢p«çZÃ·äS›à„zECÒ>u¨çF4rWîvä Ìyv¹Í7¸y@vá÷  g8/ÿJ[`ãbNó¨@=áÕwÉv£«cªF°İÅÊ9ÃëEZj<†=ÆR<T]Å³ÅVtÉ©‹^?ÌÀÙsÂ|kx—ğgÊ¨Ùè®ªköØv¨i#ïmÕS¾µÍ\å¯Ê›t÷¹SUX6,Âvw¹i²ãÕ †,
|}8ÄiøU6fC"²İ¬ªöÜoXIó¿Ëf@y£ŸíRİŠÍ‚ƒM¢õ§YëB=!dz©IF¨E$Û˜ÅõÍ)/_Ö-ÇŞÏWG$|ÁCV™^ãàO'Ü±ïœ˜¿hş|+Ñ?%öî2ÛJYÄÁ¾^ƒ(Ï/çJq°s¢Müfıı&òÌŸº#MòÁf0eJÄvÓÂ*Ü{úÒ‚\£Ü¾hĞbD, ¦â-t†¶59êXêrô3N-« J¤–ÙoA‹àjÄĞÅ¤†²†À‹kÙŞ£qß:Ä¦T›Ö‹\¬ú‚qWÍIÕ3Î_ZÆØvŸ™Öï¾HƒBVßZí¥ ÇŞ«.Z(
(RÖò©.UgÙıh/Ïn§½„åS-&é¾’£XÅo^‰¹§Ê†¨Ñ"÷RJ‚W&+ÀQªSÖPÎäN;†,ƒU2h‚*bhxg3(£s¾}N¢Ø=¿êœøÒqüFå*Óºa×ƒLeµ)7VBêZáq&S,{ù¼ ¼`ÍÜ8ÿ,û…üÖM`°úæı‡{}öª½ıÃGd¯÷¯Ş©}ŸJ6Õ†‹SëS‘/»bÌ÷­sÎ¡^çÎó¥V,íÊ¤ÌibHc¾Î
\ÿq› wäxßIóA<ˆ¨X¾5§Üì(oİüaM±Åõºs­éŠ=8U½ñ¢Ø™çp 2Ö…œÎáÇNp~N˜_U]í &c]¬/°’çÓÿâ""ş˜º\ó÷@æ…=ï„ c}qŠñšs×R:ÉwC‡u}`¢K„’ÕâÎ+„´»áÒi™Çá Iwsï¨º­3	<ªNt5=†:¨*m^¶<Äöä²óô)«Àj•ç¨“d®£á8¼”İÜøê§îŒÉô0SSºÖ/]ÒOéˆüœĞÑ*éwOàß#ø÷@›<£&SıŠiÉ¦6ñâ¶?Êğª>ãò^Qìšƒ{îNhä’ïÉ‰ÆôTĞU?ÓK:Ğ¸Ê—Ó*(‡€a…¬{çìÓ0£$x×5tSäœ'ôÂICìg,è"İñ\ßÁğ“ õöYQY%ö²¦<EvšªËŠ	ÒYÂbÒŒ'îıû8˜ÒØ 	útL¾$÷w@!0 	ãD€h¾PxÅJÀôİc{£©ëÃÇÇíMXÉ	zgt”şÑ	9¢Pv‚õ~©ßÕ-pí—•¯J_şÌÏ:V~áı›Ş!ˆıg½Ãw½cr²ÄT øxÔ;ş ?õON¤zÙó]X4çCÇJGô5ªtgÁkLÊóX+H2qñ$sıÈ‰;ëäğ¨[ÿDªÅ±Sæ"şÌÔ} ’µ§ëd t?
ƒÖî1®É:Ù°€ZÎ½à²sÕ¡I\Ú_Nl—ÙÈJ;»ÔC‹V„2×Yïş¸½J‚²·ëÕ2”/‹ôÌ†ôÀFõç‹7zCÑb}9†uÊ‚67¿x0ãg$ÓÌÿT‰¸hàÒ/ËÎtDdû{ÎzT… Pğ`-ğ¦WÅÄë
nª
õ	!¶t6èliÜ€$r<gˆí|GAØvÕÕ7¥7¥âeì:Ş¨çÁi bŞÿÀNn¼¸!Ê¢Şjv_rÛDSÃ~øçn8EFñÏ DC /%ÇUób'$q¨U|5CŒa?«’æÿ50ÍÉîµ)ıÈtO¢î¶˜£	H‡[ùM?;ÎéS³²VˆºÅÓÌâ§ªÏWø;¶¡ü¼&a„Yàª«™¨6çã~R,8_;¶Áÿ9må2€Bãı@íu·ËŞ)ö-IÊ¾xÊö
5BMp‚şÅ+‰àV
r?Ù0ø”ÿBÎ\8«0À¸$ÑShƒÃoV§YãFX½p2cÁ8¸gt¤ £u	÷ß¨¸`îf¯Ÿà€ïò?ÃÄtYäéŒ¸u‹Y»HûÃñIïàÍJ6©.?éÃ‰ÀåBÅH31)¸/HÉÈ¸¡;ˆÈocG½ÙŒ\2ĞĞú´‡º3+àÎ&ø
Á:.¿ö¬Š¬ÔÅ’ÊŠ‡óìËï Êÿ¾q6Ssqİ.>%÷fŞ^
/×æ0†P[ËğZĞ¯ùY•UZùÉPubZØWÜ$^“â{:ıË"-ÅNåÖJ>ÎsÃN¥55ÊûÅ])©" 33Õ¦Pl·®,ÊÃŞmV<õi/Å^7¢JY-á=µoJ_^94ü7î×d
Ú¾FÀüú»fJ‚Cxaxd33øÃŞ½#'Fê‚	÷½sE—/€îE`d°Å½›ñœ˜Ğ81“ÔöYÄèzô-²FŞûhÒ°Ú‡½ÇA—œ¥bîRìfù¤Ä¹B‡NPo²ÜR&oğÍì,jß´æÄaA¡,Û–²Ç«–~]€ªdWuY7áùN›_ K.ÔÂ6i†
¬?´á¤nÕ4œJv³ûô—Sá»6hª*Aµâ¨ëæÕ~ªñ¢´5JL½Ùİ@¡fºlcjXBgÃ,ÎíHqc;Ò7c>¹zNG»×nÄ:	ƒ¡Ep\Ö˜[f_:[°¨³+ƒ|³u…+›¾qG/3äSiÊ„÷%’Ü8E“MÉ cgÁ9Kâd
v%£Õ:•:cÎm0 éŠgC£+HLxÃJÁılÔşlÆÍQŒ@‹@8Úq˜8·Ç8XŒğª¦\ºÉw	½¤nL* ·‡ˆ¡8ÎGVÿëFÉgb* S†öVB–ò.ÉÀ	Ç4r=ØÍÔrõD˜£2ãSjq
ÎÏQZ,ãv¤®¡ ¡¡- |æN ‰•ï²›m9ˆn9j¹Y%@àú2#7Äñ€F´|<Ù?=8~Û;ë"o)°Š8ha¯ê:apÏå[zRâÔ™ÎğÄŠ$\ëæ9]SŞòx8&mx±ÃªÓkæğÎ‰ 0†'pÆ Ió3eFT¿ÛÒ tCÎ1ÑÈÓ“”š˜Ï)ì„nÌ9ììÀøŸ
¶‘yIrVŸu¥Î8}úe–Á½Q–l¾à­Ë\_¸°¦£ôSfå.øÕ¾î¶İI¡àÖÚ ï—ÚH£Sçpvüú2õm"Q…W°Í\¿¥v&±a˜ |”ây·Û5JõÊqôÛzè_§sÈk ü]%{©]_bmôc­Ì²Âûoö¶¿Ê¸×·Ùuıßák¢´0é}8©·²“ÚÆç<íÌ:/ì]ÏOáá{®z8Íì‘qçãë?™=ÏËğ‹CñÅØr%ğÉÃ¤7™#8Lp¹=ªª§´p×5›X4†tT¦KçµÚcs0¥ÎÁP)±V¨Âdƒl=eI³µ(ÂsÕ±q‡x9Ö@s$hL'!à…ÿ™&ä5‹ÏyxkşóÔî„üã”´Kô-2znôV|æhR©éMİï-U½Zu£^á°T:™ôÀÖá`Ôn1†Óáu™;‘Ã(D'—(dÓKÀ à’Å*Æí•UVşP#€¨WZ!nÀQ¼RÂÍLäÈMŒ·•/ôbBÊ±/›…èŒ!/Ùj£Ã	hOÔ[’*1M§’.K`OÿQ ®Øl×V¶]öf{1èv"50i¥Ñ¢›"î'[H–ÙÜJ~)NÅât)ûdv6ø‰±¡9*ÓpG»jÂ6ËûÙQ^Ê$g±^ùî”cUÕ'œîü¶”Âaß'¸ÕoÑDÌbw
ÄÂÿÌºçî©Gç r‰Ù©	C?AÒäŞ×˜ÿ7H4İ‘#ò9äl%ß‹oX\*	È¬DsR•!¹ÏŠ‘a×™4˜¸ùÕ íŠ6ÎDÉ*¹{€Rú'†­ñµ©ş`jÌ’%
Ï@xÙÃGØ“;¤ÅŸ5µ2æ‹¼¨î†«o¸;Ë[ÍËœ°R¯Ş-…[›Ÿu£“ĞùÓu.w¯ÑgºY«}±*AÅ¸èî¶"2Z%_Ò@šİÌU³½¼tÀK/XÄ´;Ib—ñİˆ&4äŸib5ÙƒÆL¢<ÕÌ^§Ú/íõÍôc^}ptòşôŒ¼ıpú|O~ëwû‡½>Æ]¿ş¥ÀÅ®İè`Êºg8t8vÂ÷3P;)ªıóY9HÄÿA}­Loe4×?WeÅÔ¨Œæ*höŒ!bÚúuÚ« ›h¬B}±úhéøËNô±;Ö *lÒ,vkëµK9
P¿—úìg]eš—ã-¿ùÇTŒ+)vV¸ò
/ù0ó:zíÉ¨ò6Š9#Ì»]ˆ¦4ÜÓ2£áØÉåÊÇ*ƒ²$éq0uÂ ˜ê´ŸHë7t	°€2£göm&Xk’¸÷3ÚÍZÅ”öëş?›§éŒ·”ßÏ*‹Rw)`+EO¼Şò4xb:ÃûÑ'3uIâÇÉp/Ø’Ü‚Æz¬™&.ü«£8/p1@VÅœ¤)ÀE½j”,ÎfvÿñïÌâ^aÀÂä^gGg²’$A¢’´YÔ‘¶UîÏVï¹BÚ_şgJDÏ”Dt»ğv›ËšWb”ºÀ<–áQ¹Ñ%g)‚}8‡Ú»Ph¬2Å©+VÑÎñÔr05*ÅW6Á>‡Á¥Ù`¨‡I=›4O­fQB,Ï?¬õÆ`51ƒÀ÷Á%ãl›Ì­Ûæg«ÖŒUf­3ÇÓcªN¦`9IÚ$Mğ+Cİ(Ñ1úÊ0¯˜ ƒ>@ÂB7bıäq0&íˆÂê ?¼\–€ºH/@ˆîù#
ÏhŒ–)p_PŠA~"W$oĞ…İQM¢ÁT;à€%º¨y×êb7ùéÌÒ¨˜"†¸‹É<.<¹ç pâ»ÒYI#ÖµJfØ`5^3X€3¸çHÙ
À`§¡ëŞCÉ$ˆ@§	–wñœ&^œ&|„V‹lŠs‹ÿ UeL–>[_ùÓÎrÓñœ7Á¥XJ›wÛŠÕ…°é–QÚ–ÔóA2÷2·÷^„@RÀ;qĞ	ÉyLe0|©6ş–SlÃù‰™»Œ¥ÃRo÷­7ïê/Ó•KOÕ§µ^Ó"Ë$ Ö™=¥s°¶>¥âHËƒ×¶Ë†Û,œpû¡ŸlrÈämÏ¶ıI„RìäÑ=æYêSàW¾:l·ñ©’Uyjt®¨ØÉ1€`²Ügù^3Dì¢lM#\SÌœ8é$Ñ-qş…3rc‡]…”UlVIÉ,UV	ü™	~ÉY´ïˆxË,<w=´o‡‘ô´
?z	—U$ûW4ç‚GôìTñèkée©ƒf#$Ü#¦¨ä9ƒKÌı—ßÿ"¡A¤`î‹åâ)~6;Ôûf˜x•70ıü–œ\óµR;Úì’Ÿ§P,ıˆù›æS‹4!8*ñ\oXÖ9EN\Ïó)ÀÊ‘_X´å>R9R¾r@V?Ö²J*#Q÷¬ú_)'¹¶]Ğ½3·–f³™´n$`äH:òóİë˜S&.ÛäSç\G t8tfñn«;Œş4°`€ßœÂ‡ÅçÆ7â§ƒ(ğ ÛÔ´œ†x¯—µÂ<:fÿSC¤³àÑÕd 6U¦
–93\È‹`ävGƒ7B6\rî±iäÆ:eVirÏsÑÆ Ø;Ğ ğ(‹XZ> œ91?‘à4TÆ4YQM)HY (O•1Àwä€<Áã™A„ˆ›ªÆ3gêFpşN‚)%íÕ¾v èqÒá÷ş]§˜ù²Îòİœ)³‚CÊX„–#§”ÍÍŠû,¼ÙÃ¤ªÿàŒåĞ¡ªşàpS:<Yj’(!À}ŒN5ÄŠ ¼vÃ!l”8!‹MW2¡@t3ZçõÙ„¶B°bı”q¦,ûWx[Ÿg4Ü/)³K­ymnW÷­PesŞ½c!½w·w·Ø7±’w¹s@‘[]"î¤o°_ÏøMâPD¹Nê j»Ûª
Úí wb$«Ëy…5¼òxK&õ¶õKvCöĞºi0îÇ˜1¿Ö@";³t©9†1ÔW!ÄKÔsUQ€zâ0¨¦öÎÜñåàCo½3)àdkÿÀ5òıõÿ¦ÃÚsË
¯,Üewµğlon²U5G¥K/6¶õ•‡rOx©±‡IĞb¥şunmp!Ïprêç¬³®w›{ÖÖ¶!(µJñ‘› o<k½êÒÔ÷;ĞÒzõ!³ªÏ?«¢sè`_ÈÙmÆ1>v;C¿~"-^ŒeÏX¶Tı3;X? èH7Ooî€İ|Ñzu’¹Ì™Ë'×v¯à+d@€ª1®îŠˆRä%KäwFn2-³ú4ÔÅ¸{*fÎÂÃàÒ¶qƒ¶eƒJ—®Å¥rµrk$„É Ğ]7Úÿ¼Û”ÆUzaùTWnğüçunãÊtEI=|^I¦çßKÜUîŸİ´Z:·5Ú@oYtß®‡ÍjèªTW$r³& \˜¯H]Ít›jé:l-WÎ/EN5hÏÇ:•8îd M€¼O íÚİş\Â“	ç–ÁcñÄ{"JŸAñ¸${j·4cêŸ—S–Nœy:Oà°ébp'ïUûwì-ù…áo¿±u]L-Ojz'û&45|ÍY¡½ÈÕ*UM–¹ÂV—"ĞON˜×fAeEJ”RÉ‚Ê½™qfP?–ìDÖHßñœˆVÖ¹CjQæ[¥§ÉuSÎdC‘¦nŠ´ƒ©{Ó&±SxÖ&›m;Û:K'fš(9)Ki‰¹åEÚYei]<§1SQ$+f§IAª®©Ù/¤Œ‰ñ¾D§–eµ]1?>áõAxEÒ>œşp^ÕÚ«´‘&c¤Î§«c–Å¯æÏ é¿îïŸbšó»ŞÑşi¯œ4ò°?¤¾¯IùÇ©øõ³àP‰¨(K†*™h¿ÏrDŠÕŞÕ±÷¶}7Ræ²ñ*@SŒ¹±7¾{îú£*~´ù(OeÕ/ğ5dÒ ²U¾-W}©d ¡k^¼]UÌØ~¿X·5»»šKÄÎˆÂÂjj¯Wì¦¼€¯=@ÏÂÁ£T~jM/×*½Ä/ˆ&»å‹œìŸöúgûÇgdïıÙÙû#rÜûçÁÛŞÙÁûc²×;%mX	Òı†}gš`hCâ¯(†’ú?(SPÅ´ƒqMçè'fVVV3ãinĞHxr
¾úqı÷ÎS,Ê¸	ÿ„Ú^_eÿu×·W>å!(œUNG;Âv™Š”ñŞ"w6Õ¥µ12sü„lö/ #¬>Û!3ê!ëÄß+Š«}ºÏ˜¬ÈÀ
¬ŸÑA»²·–³òcÇÁåQ:£øV´ÃÜmÒÌ­¾^‰°Ñ¦bY93¬Ô|MÊ@§W>"À„ùîšŠÅàúšXQ.QÄ…¦ö‡<hTÓoM‚¤Ä‡qK,|ùëú²*/Ñ‹!b§óq“ed2ğÒ¯6º¬A´‘¬qjWYØYx*hÁıaXÜÂzª{PÚ­ìOÅ8ƒòYªB3êÛÄ
rÜ9¥‰Cé÷éÅ4~¤·%
Ë²pªCÇÆÂ©® ²Bb«R£â¦¥¤ÏÊf,ŒJËíšĞèi‹^ZwO¥Ñ#f8‘®ÈÂi¢×cÆ['Päq.Ê /ŒäÍÌItOI{/èhH£øîÉn¾ê‘ğ2¤È×dñ¤çxŞ)`ãÂ)¯óƒ ½"È‹KÓaç¤¿m<ô\³F:@Œ“ ¦“ÕL7Ä>¢Ê2…µÑ†Å~yÂ>};äIÓ\8IÒ« ‰±¢Ts¢*VO7÷C(e¸x41Ì¶"Â¬$ãSßÃğ4‘cT\"ìA$;Nœ•ÜÄ*^-ñ¶–]KÑÂ¤Ë6ÍÒ¦7+NcWf½»eS‡¦zO]«½L†Ò³ÜŒ6ğèpÒÒ£›å* È­õõ¿*ÊmI‹ X:yÃ9¹ãÈùfĞşvÑZ%#:Á§²¹½Šázçç¾E;X|ÜXÁ§`hÜx6¯¥1eKqg«Ø35Âæ{]PÓÒ?XŠ¶Rôb6èl”Ü3eAãØßJübÎ ±ò¬mEÙtš††ĞZe:Š±¦˜ÆùÏÈ÷$Í Q¡÷¸s€-ÊEÓ4´]Lo‚®"™›ö·$b:U'¡©R|¡™‹àU¬.CXˆì\WŞ,××,l&2yûŠÕ.æñ:³R›ŠºMY™R½ÆM4õçnñ>ªÊ?< kib¿3®çtğëD³éà6M_$ƒ#¤oÀQvI™ÄÔ(aéU[ö5”{[<ŒT*!ğ\B5©~/WTS$D€(˜óÕtx©*²8İs7–A~¦È‹’jzº0¥fÌIŸÑmUÛ{CË¤ñm×¥w¤5¼ÒIÿh³íŸíÁ)»ù|şy¡{ëÚxÛ:£"ZŒô|¡ç9Å¢¥MËwÊ0CDè\™DU®AÎ/‘R³Ö^¤©S™„sJàÜsBª°86ÆR@É*b½†±4Î+Ä Uø«"ŠaDÏcì½©:1‰®Ğ€6‹Qüs÷Í¯r>ø™.©gâ„wÅÛ„ğ´ÉY[&J­=­–ß^2¦&ÀRuú.×ÊÑ3¶…q6{¾$€3±¥#‡î$"¿2¼Ğà¹%Õm¾6iöĞSÄÂ€ãH›×Á(‚$LÆ¼2	ùÕ3üvh”zÉÔw—_Z"oU
^6ú½r<T)¿â—gÛuä{ÿÄ[oßcxBÚ‡‰—DÔ×+“z…Iœ¶ÔÇDKV.‰#²8OğC4ì_ñğX,gÊŠéò7$í¦Nãÿ®„I·?Rd¥
È—BgõÇé2$ï4‚¢¢5ÎRP$/»¡ Ä!B‰mòÒ¶=./¤'i„	¢"ğ7D“<#èwQAt$=øHR¦¡®FÆÃ<1ß9^àQ’×Í[
P	…NÈä‚ÂyÎ«tÏ°FÏt–”Êï};Ô™æ>’¥¥ª JÉù`‰2¯z¹DyD}ú¸Ï›Ş^ ¼ÓAÀ«Is:ä
è·C‹Ó¤€GÍsq$‹1gŠdÅ/TÒe¬äˆ¡ËR«H@ãì„5Ÿ'ßãd-¡3	`c=—²rB	E.†\È?@Â$“äwı»Ä»LçíRï 9@dÁ¦éH1Zyò+	Â>q˜ÒÚá}mnÀìI/¨DXg‚Jmpxn nR3¹Hç³¬é÷ïuµd‰½1±¼DyN³ïëOée¤s©C<Fıuc–‚Îß0Mw•`U2¦³$Mvò6Æ¹	Ï»[úX\!*eÎÈsx€ä<üs÷âQé5Ğå,	g’2Å/“6Ó8êÍfïRìRĞç;†–@{ .³˜ØøØ¹¤We°Å©ŒúñÃ¦ÊÀ?.¬ëÿ}ö¹ıÈµ˜´»$û¼½¾¶%Ñ¨øn¹H4ºRXJ—AVc”B’W£],QŠ=l.#@tŠı¯hè2ñNDĞlãöåñ8I©ºÂ¼”¨¼½ô-f ü#"c}"Xã€ŒÒG,“ Óˆà$'ñØ)f'°|…ú~í°X[†RV³¸Ò;‰—ƒÑå[°ó¥æX*\¢#U0k}p6‹­+ñZCÇgu¢fÓyãªëÍœX,ä)¶şTl˜š^¬ˆ<Û%œRu¬zÚ…”¦ñPİB3Ò‰3Åö{xó¾å´s¼Dšç*òÓdÆñwUq®ä}…<8‚bòËIµx³ºSi]P³(é®k»úR}¤Y¯bòŸºt6ùzäßÿ&­ÿ£)‡"ï…kı‰´~tò'˜?„Xyîú¦2_èx»-?fÚH`Ëœs'umxòĞ1¼rÏ5tªJ>éåt15î¥ütç&^;˜ª¶]‚ÓOXn€?
±×ı ˜ß”Œ\'!a-™Ì9¤€]İV¹*Q~iQ¯¬òÈ.¥×a– wâgD•6…/´õı¾Õ•äŠ9€½Jé`ûN·5ê­Ô®O”|¿Š€óíôËj¼z1N7¯;(w\È™±±Ws!¢”úRI(JK»=SVgƒıCµ¥š“»?¥a<ÃZëÖ4­¦ùİ”œÑl_H–m(Çi3TèˆªxØ„½³±!·ë°Øà­¦‰œ´¾[Ûš5ÔQ‹më
éÜi½J‰ºwòÎTèª-6aÊnÍË”Å£KÊ”9t_‰)»ïûy!™ocC&WÅD3ø»ÂˆñË¼Ü)ü!1`üóA0_P´í˜ï‚ïÖ,Îwq6ÏEšeË[Ãq«_*ÔÃF•5ó¿,ë(²™;©C—»˜YÂ‘¤$^»ş;ìæjÁMu‘Ä<›{ÛTûXüY(£üãúúÚ3ÀPçàğš¡W ,÷ƒÓ¥~+ÓßAíAÂ÷·ËLN•	¿‘=±Q¾½Úü…·©šÊ	ÙU½Y6$å‰ØåŞ4E£¦œ§Í*ÒË8\Bjkärì\‘÷r¼UÍ?–Y®¾toƒÆKÕ*¼ÏµUxa5‚Ke)Ş=6»qy 7ŞTÈh¼U™­J]Ï{øˆ…ÛàÆ#•Úz¹,<)t1ş~HCÊÚûù\'_Ã_èdì†XJÈ†ÇbFÒ±Â;cWCgxt\Ö¼+z·Ê>ôbéÁÀï'ƒ)V2 Ñ•?$Z!ÈFa"Ò”ñáí<P–e¦[Î7X»v‹õ<o‰ÈV	¤ò6ñ'jÇLè€ĞãW©²k	°7¶Fa}
»qèNÛ+vÑ(™ Ñ¥Ïw€œ%Ÿ–ÉˆèµHO5®½™EÈc«(¾„A«|Åêô²÷ÑrtiÇa¢2µ—ÃwWnZ[#?!¤‘y‰d, 	W99xSyˆWSâÑYÀßP_QYª©Z–U*áfU6Ö µôZõ†èD‹Ä]B/©qñ.6Y}åÒë5jHï;òL±"´ZŒÇ†#¥[áõ½ŒaÇ(œjÔgJ]¯80ûŠipšg˜²^|†}ez†-Pâ¸{Gì~6ßÍ	$½ŸÿU3~NôÙkò¯TÏŞ¨/†|Ÿõj_N1¹`dpO‰GŠèÁ©§æn>{«[¥›î¯QBÿ`òà´MÁdDŒ·:s¦ıİu%oğ¼³N×#cä€Yu±?ËÍÒÏHÿä„0ÓïÿL=æcÁ4ÓØñx³zöq \ÃÅ‚İ,j¡û‡NÏÕÌó†8°úĞ ™‹iFn½¥ÔC·É…¼zBE„rˆÇBÃa6q0F
„8"®vWV¹²ÜÊYÀ¶ vGÛ ƒ$ÆÖZµßÕ×¨8½¦Î»¡@Ñ¬³­ªd.
t=Í'¡n³¡ë,<±
ÿíf*×²¿ŠmGR/¤d©ĞË®õAU«à§Êv³š¶¼«ƒ¼
7ZW’J¬¶­ïÑª®ºñ’u›·ğ¶)«çèš/ñ®÷9{Ê”<m›û—\.Pú'õXéÒ¹ªR×óğBÂUğ[§Ë]6l]"¡áq'¿ÀºÍjTÏy0L¢Ô:”E¡¯—¬FY›œb×Ö²ŸûN¥ò-y|‹RÄûïÄré?MdA0c­Xø’¶Z¯:Âu:/×ø-ª§³J&ò™ä¤c¤\JÓ8O"Ş|	í=mqO©qÆVÆ³²[ÀS¦ ºÇ±
î¼ˆ\[>/ÎÙV¥ï¿Ô9çİ(€³¼MWÉ€!=e‡q×Ğ€ñ:˜Îhè´ìËÍ¬fdl‚™¢k‰²öMJ˜ìıÎÂï\8h_‹ùß¬9>èï°ß\Mläz\T÷fÊ¸ˆ] ÅrñÎ3Šò‘G
¢{şéú³DÅ>yÄj(*öQ`®(•7ã«øÄı²ÔZŞY²eıa›ğÎÊáı¨d³XËJ1-‰Õ:Î Xgûá„»­× ~0Ş!ı£rì\ dëTŒ¨ºÛqsõ¥!"JzÏRã£´V²«ç–ö¸ñJ“Ì¦ÇL2•Cº€~g‰£0‘Mœ™0Æ®¢õ†áåªr“$v¥_É(˜º˜²F¸99N0­¡nzÑívkñ–kèÍPVhõ[§®µaŸ³ÂÍ÷ºiÌíÌ£¨1Ù/¶£¦ÚüS³‡yıò|ËÎŞmE¦€´7¥‚U×†,ûé4ÛTP«®?`İ*GÌì Ze¹OfÑHÑlU~¯l-ÅwÏ‹¾°òJVÃ˜­—S_ùQÑÓní+ò#g:c>[äNèä.zp‰" §&Ê¸øz‘Š®e•Ë¹ğhîq>rGl…öorê`èt±£!±°Vß‰?çPu4<X!Bt1[î©‡À3“y¹îj~ÑöÌ<“+$û(;Â2«XÆÄ²	ŸĞ+İL_S QÜ¦˜#KüØ½Â]}ŸÎÎğOiÈFùïïùùt
8ç7ôØßùïhñâéâéh”ùâL°}fäü©+ÿŠæ~¶ÊùÃC[Ë¾Cí°üdö÷(6&íq+/’øÉŒÊU-!@¾M}ú'ìR‚`¢Şª'OfòïÂrdãDq?Ï ÍŸ¦“İkóàl"”­1,Šü—4T!°¦LWšuF¡€À7ùËÚZµİ¥öÂ»ß¼?ŞïôÉÙ¿NŞ¿=íüò/ò=9Üóvÿ”œî¿~üúàğ€µÙì“_ö±gÃ÷üå<ñ9^!Û¡ñ?
|}ëgî{:µ¹‹-ü	OX[%ıÀè—yVÅ-+ÂíIZRm^	ç<lÓê;—„é®é3—n˜Â0FßG±–­_©Ê¸›™÷[?;ƒ°øÍ§qşgoºô«#İúkâşò¤¿z	 J”Ñwf@¨'÷âµŞOâ ğÅ1oÅ[@’¿ù$OoD¯`n£.Èœl	ªs‡Ÿù|dwáçöJa+‡†é(?ªÿş.4¼£Ï6©Ínü¾ŠÚ++İsãöæ*i­·Š¸~é±#×ObÇğ Øï?¾»†¹İï®ôøÁ¼Y…ÍÍüâú7ä·ƒ½?ğÉ2D¯4i;a˜úùÄX/Ø]H8†^/vÏ¯8mû 7ø@å'¸ÜE¤äóÁrdJ¤­xcúy”Ğôcì^dŸáˆ§)Jµ<Pä³|:Í mœäxtjvúÀ×“ÿ%^~wä`akls‘ŠÄŒÈK²±YZ6“â†O|™ÇªøÜæºâ¹Ê’‘Ù€ -Â¡ĞÂ|iÀÔFYøˆÆãî¹aöğ¾^’’aó‡ÿÿ !}ì¯ø»cÅ0Ë2T°!óÂğ†9¯ëÇ„o5Õâ\3`jçj3YÕlİAR7ÙšÙŞvÂ¥€ê'\;cÜ­á+ƒøäsKKPş%AÜÖÁ%ùÙ±(7;>CŠı9O“™KÇ “LMœjè9Ôÿ'¼—Hóaé Â§WVR6‘ß»»KÖó#÷8ğ#è4 O‚â\ÓVDT7t˜±¡½ö_ÑkÀŞ	gïbd£Z#º½¾J6àÉàj[ÂòCéÎ]2hnşòÿ  ÿÿ üsê