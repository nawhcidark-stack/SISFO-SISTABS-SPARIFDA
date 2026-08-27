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
        setMysqlFeedback({ type: "success", message: "‚úîÔ∏è " + (data.message || "Koneksi MySQL berhasil!") });
        fetchMysqlStatus();
      } else {
        setMysqlFeedback({ type: "error", message: "‚ùå " + (data.message || "Gagal terkoneksi ke server MySQL.") });
      }
    } catch (err: any) {
      setMysqlFeedback({ type: "error", message: "‚ùå Gagal menguji koneksi: " + (err.message || "Kendala jaringan") });
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
        setMysqlFeedback({ type: "success", message: "‚úîÔ∏è " + (data.message || "Sinkronisasi seluruh data ke basis data MySQL sukses!") });
        fetchMysqlStatus();
      } else {
        setMysqlFeedback({ type: "error", message: "‚ùå " + (data.message || "Gagal sinkronisasi ke MySQL.") });
      }
    } catch (err: any) {
      setMysqlFeedback({ type: "error", message: "‚ùå Gagal menghubungi server: " + err.message });
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
        setBackupSuccessMessage(`üéâ Backup sukses dibuat: ${data.backup.id}`);
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
        setBackupSuccessMessage("‚úîÔ∏è Pengaturan backup otomatis berhasil disimpan!");
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
    if (!window.confirm("‚ö†Ô∏è PERINGATAN RESTORASI DATABASE:\n\nRestorasi ini HANYA akan memulihkan data database (Siswa, Tagihan, Transaksi, Absensi, Jurnal, Kesiswaan, Sarpras, dsb) dari file backup. Konfigurasi dan file sistem tidak akan diubah atau ditimpa.\n\nData database saat ini akan ditimpa dengan data dari backup ini. Apakah Anda yakin ingin melanjutkan?")) {
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
        setBackupSuccessMessage("üéâ Sukses! Restorasi data database berhasil diselesaikan. Halaman akan dimuat ulang...");
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

    if (!window.confirm("‚ö†Ô∏è PERINGATAN RESTORASI DATABASE LOKAL:\n\nRestorasi ini HANYA akan memulihkan data database dari file JSON lokal. Konfigurasi sistem dan file sistem tidak akan disentuh.\n\nApakah Anda yakin ingin melanjutkan memulihkan data database?")) {
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
          setBackupSuccessMessage("üéâ Sukses! Restorasi data database dari komputer lokal berhasil diselesaikan. Halaman akan dimuat ulang...");
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
        setBackupSuccessMessage("üóëÔ∏è Backup berhasil dihapus.");
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
          setBackupSuccessMessage(`üì• Backup otomatis baru (${newestBackup.id}) telah berhasil diunduh dan disimpan ke komputer lokal Anda.`);
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
          "‚úîÔ∏è Sinkronisasi sukses! Semua koleksi terbaru telah disalin ke Firebase Firestore.",
        );
        fetchSystemStatus();
        onRefresh();
      } else {
        setSyncFeedback(
          `‚ö†Ô∏è Gagal menyinkronkan: ${data.error || "Server error"}`,
        );
      }
    } catch (err) {
      setSyncFeedback(
        "‚ö†Ô∏è Galat koneksi saat mengirim permintaan sinkronisasi.",
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
      "‚ö†Ô∏è APAKAH ANDA YAKIN?\n\nTindakan ini akan menaikkan kelas semua siswa secara otomatis:\n- Kelas 7 -> Kelas 8\n- Kelas 8 -> Kelas 9\n- Kelas 9 -> Lulus";
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
        let textMsg = `üéâ Sukses! Kenaikan kelas massal selesai. ${data.promotedCount} siswa naik kelas, dan ${data.graduatedCount} siswa kelas 9 berhasil dinyatakan Lulus.`;
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

    let confirmMsg = `‚ö†Ô∏è AKTIFKAN TAHUN AJARAN ${yearNum}/${yearNum + 1}?`;
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
        let textMsg = `üéâ Sukses! Tahun Ajaran ${yearNum}/${yearNum + 1} aktif.`;
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
          text: "üéâ Konfigurasi WhatsApp API berhasil disimpan dan disimpan ke memori server!",
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
          text: "üéâ Konfigurasi SPP berhasil disimpan dan disesuaikan ke tagihan unpaid aktif.",
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
          text: "üéâ Sukses! Seluruh data transaksi keuangan & siswa dummy berhasil dikosongkan. Sistem akan memuat ulang halaman...",
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
          text: "üéâ Semua pengaturan API Midtrans & biaya sistem berhasil disimpan!",
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
          "‚ùå PIN Keamanan salah! Silakan masukkan PIN yang benar.",
        );
      }
    } catch (err) {
      console.error(err);
      setMidtransPinError(
        "üîê Gagal menghubungkan ke server untuk verifikasi PIN.",
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
        text: "üéâ Identitas resmi sekolah berhasil diperbarui dan disiarkan secara waktu nyata.",
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
                                ){item.notes && ` ‚Ä¢ Memo: "${item.notes}"`}
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
                                <span>Bayar via Midtrans (QRIS/VA) ‚ö°</span>
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
                                <span>Bayar Tunai & Cetak üñ®</span>
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
                                                    ? "ü§ù BEBAS (DILUAR PRESTASI)"
                                                    : b.achievementType === 'kebijakan'
                                                    ? "üìú BEBAS (KEBIJAKAN)"
                                                    : "üèÜ BEBAS PRESTASI"}
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
                                                    Cetak üñ®
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
                                                      Batal ‚Ü©
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
                                                    Batal üîÑ
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
                                    <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">üèÜ / ü§ù Pembebasan SPP (Beasiswa Prestasi & Bebas SPP Diluar Prestasi)</h5>
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
                                          <option value="akademik">üèÜ Prestasi Akademik</option>
                                          <option value="non-akademik">üé® Prestasi Non-Akademik</option>
                                          <option value="non-prestasi">ü§ù Bebas SPP Diluar Prestasi (Keringanan / Yatim / Beasiswa Sosial / Subsidi Khusus)</option>
                                          <option value="kebijakan">üìú Kebijakan Yayasan / Sekolah (Keterangan Khusus)</option>
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
                                          Simpan Pembebasan {waiveBillIds.length} Bulan SPP {waiveType === 'non-prestasi' ? 'ü§ù' : waiveType === 'kebijakan' ? 'üìú' : 'üèÜ'}
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
                                    : "Catat Penarikan Tunai / Manual (Teller) üí∏"}
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
                                                  Cetak üñ®
                                                </button>
                                                {(!t.paymentMethod || !t.paymentMethod.toLowerCase().includes("midtrans")) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCancelSavingsTransactionLocal(t.id, t.type, t.amount)}
                                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                                    title="Batalkan transaksi tabungan ini"
                                                  >
                                                    <Trash2 size={10} className="text-rose-600" /> Batal ‚úï
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
                                                          Batal ‚Ü©
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
                        <span className="text-lg">‚úÖ</span> Penarikan Massal
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
                            <span>üí°</span>
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
                      ‚úï
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
                    <option value="kbm">üìñ KBM & Akademik</option>
                    <option value="pembayaran">üí≥ Pembayaran & Keuangan</option>
                    <option value="bk">‚öñÔ∏è BK & Konseling</option>
                    <option value="admin">üì¢ Admin & Pengumuman Sekolah</option>
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
                    : "Siarkan Pengumuman Real-time! üì¢"}
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
                                      Bulanan {bill.month ? `‚Ä¢ ${bill.month}` : ''}
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
                  <span>{syncFeedback.includes("sukses") ? "‚úîÔ∏è" : "‚ö†Ô∏è"}</span>
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
                    üí°
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
                      Sekarang üîÑ
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
                  {isSavingSppRates ? "Menyimpan..." : "Simpan Setelan SPP üíæ"}
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
                      : "Perbarui Sandi Bendahara üîë"}
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
                    <span>Reset Password ke Default (bendahara123) üîÑ</span>
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
                      : "Perbarui Sandi Kepala Sekolah üîë"}
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
                    <span>Reset Password ke Default (kepala123) üîÑ</span>
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
                      : "Perbarui Sandi Waka Sarpras üîë"}
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
                    <span>Reset Password ke Default (sarpras123) üîÑ</span>
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
                      : "Perbarui Sandi Guru BK üîë"}
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
                    <span>Reset Password ke Default (bk123) üîÑ</span>
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
                      Tahun Ajaran Aktif Portal üóìÔ∏è
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
                      üîó Link Unduhan Aplikasi Mobile Sekolah
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
                      üìã Link SK Penugasan Bendahara &amp; Waka Sarpras
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
                    : "Simpan Identitas Sekolah üíæ"}
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
                        üöÄ PILIHAN A: Kenaikan Kelas Massal
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
                            Massal üë®‚Äçüéì
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CARD OPSI 2: Aktivasi Tahun Ajaran Saja */}
                  <div className="flex flex-col justify-between gap-4 p-4 border border-slate-250 rounded-xl bg-indigo-50/10 text-left">
                    <div>
                      <h4 className="font-extrabold text-slate-850 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        ‚öôÔ∏è PILIHAN B: Aktifkan Tahun Ajaran Baru Saja
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
                            <Check size={14} /> Aktifkan Tahun Ajaran Saja ‚úîÔ∏è
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
                      Pengaturan Terkunci üîê
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
                        <ShieldCheck size={12} /> Buka Pengaturan üîë
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
                      üîë Kredensial API Midtrans
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
                              ? "‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢ (Kunci Terenkripsi Aman)"
                              : "Masukkan Server Key keamanan"
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs"
                        />
                        {midtransStatus?.hasServerKey && (
                          <span className="text-[9px] text-emerald-600 mt-0.5 leading-relaxed font-semibold">
                            ‚úîÔ∏è Kunci sudah terintegrasi aman di server.
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
                          üîí Kosongkan jika tidak ingin mengubah PIN Keamanan
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
                      ‚ö° Informasi Biaya Admin Midtrans Otomatis:
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
                          ‚óè DINONAKTIFKAN SEMENTARA
                        </span>
                      ) : midtransStatus?.hasServerKey &&
                        midtransStatus?.clientKey ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                          ‚óè AKTIF (
                          {midtransStatus.isProduction
                            ? "PRODUCTION"
                            : "SANDBOX"}
                          )
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                          ‚óè SIMULASI TELLER
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
                        : "Simpan Semua Pengaturan üíæ"}
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
                üí° Informasi Penting Untuk Pengembang:
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
                    üí°{" "}
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
                  <span className="text-lg">üì≤</span> Pengaturan Whatsapp API
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
                      : "Simpan Konfigurasi Whatsapp üì≤"}
                  </button>
                </div>
              </form>

              {/* WA Testing Sandbox Section */}
              <div className="mt-2 border-t border-slate-200 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1 flex flex-col justify-center gap-1.5">
                  <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                    üß™ Uji Coba Pengiriman Instan
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
                        {waTesting ? "Mengirim..." : "Kirim Tes üöÄ"}
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
                      <span>{waTestFeedback.success ? "‚úîÔ∏è" : "‚ö†Ô∏è"}</span>
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
                    üì§ Unggah Berkas Baru
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
                        Mulai Unggah Berkas üöÄ
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Files List */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs block uppercase tracking-wide">
                      üìÅ Daftar Berkas Terunggah ({uploadedFiles.length})
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
                                  <span className="opacity-40">‚Ä¢</span>
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
                      : "Perbarui Sandi Admin üîë"}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Sistem Backup & Pemulihan Data Database Card */}
            <motion.div
    xúÏ}YodIvﬁªE4—(%Gï‹Yá’É$Ÿõ≈*™í•±–tGfF1oÂ]Rw)í‚ê¡/6,@∞ £-A¸Ó=¯◊ÃpˇüwèÌ&ìU’Àï¶:ôyo‹XNú8Îw…//ÙRè˙œnnH4ßc/Ωﬁ#	¸ªπKnoˇ©]4Ùö≤⁄›õ¸ÓçˆÕcü&…∞g+£ã˛Â‘Kô˜ë8 ¬	õÙØ|2ä‚	ãÂ˙âm˜∑66H2•ìË≤ü‰çœÆ¯?˝q‰ìä§Ï*Ì_%‚ø>{ìäO‚Ò'+µé|÷Ë÷˛ƒ{WÌÙ-H˙IJ„îød{•˘X˚¡ykm∑6öãæNºã®øª—ö¸~∆∆˚*ˇ~ƒ«{·¨ø°x#ºÛà¶tDFÔØ`ﬁ∑6n…∫¢kÎ–7uèï≠N∑k3Öi˘ìÍ<>Õªö/Çò¢1SŒ—Ê⁄Æ≤œÑΩn&t<ÀÊ‰Êø&g,»|oJCÇC"˘∏TΩ[ün+{=Øvö˜ÌõMËƒ¸Íw’éÔB«É¥øI|F'^x—èôOØÿÑa&,p®öûü0?Ú)ô≥pL'4ºÄÓN∞ªì|Ê,ˆ¢â7#=‰%}HŒÈé
?å2|‡!å&ﬁCÚuá‘≠&x3˛6§Ò<¶…C2IF´$”lFœ4ú¡€Êgq6Ö}˘&äöxÕ∫4%)ÁÔ=√õ°S:¡	üııYæÒ.≤ü•sﬂõ¡á5Â4œ	I~Ÿ¯ˆf˝Wdò“4K»Úcì,79eIB/XB~µﬁ‰7#N√l<Üõ‰ç‰¡“sÿj€∞’`±Ä≈‘ü¥7X˛√VN∂˘¿™{¥AÎ¿Eî˚KC€˚áS£õqÛ—mã"Û◊>ÆÏl$«hPµs’¸®øπÚôr∫n5;öeiÖ$
}o<{v”[%œ>ÍIÌÙ¬Ã˜Wı›G∆4çﬁ±xØ5ô˘∆√m«g˛é)ü“q'Q‹üGg@Àlúˆ√(d+ü=HΩÄ%øﬁ_˝t$Ω’€Ÿâi˘<é£x1äôÇ~ÀÇvè%”Õ¿gqzË≈cü®_¸xwIîSù¢≈È¶⁄äéj∞€èvk√ßp˜√S2©œœè_æÿ#É·ÒêŒ‰Ù/ÜˆúÙûø<<ˇÍÂú¨¸œÒã/…·Ÿ‡≈Áœ·ã≥ØŒNˇbptz¸bU¡Õ⁄‰≈âÎ"ÜCŒ»~ıG1yGA)¨√ÑºÛ®îÖ?√k};'«˛VCb ö\RR‚ê¢I8⁄qê[ÍOì=˛9é.ÒsÌîõ%©˜Ê∫?bÈ%c°êåÚé≤Õ|ÑõLΩÙbWE¶P…]ÍŸ÷ ^èÚ],fYŒV0…?ï´yºm»‚wHí&ôKKÖeèµÌ;Õ≈ñX§ÀòŒµ=EYnß%Àï{L-–ö# µÅ !Ñ¥”k±K¢1ıßQí‚.ÅˇÄPE∆g4d˛™æ[Î”Cßì9à/minŸDπîMqyr…àÁW0EÛkdê%ºE≤9Hicî÷`∆3î/=†T„∞Á”˘Èı`x°XOiÏ—£Ú
ƒ»k√8q(⁄Ö÷”á≥<˚(t¿&^‰GÇ~,_e(àr˘PäƒÅ1Å/…åï¢¨X]?öQüLÂ≤¬	ïíÊ»£◊zeìÚôQM—P%OäÒ*dJ„D®eKº*ÚÂ1,ˇò¶Qƒ9ÅÛæÕçySéª
ö7Ú»Ü«ˇ¢YifÙ&∏N˛“YGaá(øQH]∫ÎåºçºŸbe›≈‹«µ≠!e€hÓ¿)ÃÃ%¸Ø∂ìj]Ÿ»’ˇ˛<Û8§Õ¥/ﬂÒŸ9ãßú"ë¯$G©M*êñœíCxoJ~ˇ{‹T)jSÌ.‹·¯˙4˜…Í¬[oïÏ›ÎÍ—`K’Z;Òu±r‚œ'˜µny'6\◊È4ö0Ú’ı(ˆ&§˜ıÂÿ}Qå‚ı`RÄ‰äCèŒ…©w¡’KæöwXÂ.÷ò24|πÑ ™¶
™‰Ç§ä[ïäCãnæC±«U0»N[‰”z÷“Î9#œû=#+â–œVÄ≥¨,™ËÆ aØt—pVnøªu∏4ÃTK©.„ ¥Pä∂‘ZQ°5µSTâ`¥vΩ™ﬁ◊Tƒ”*‚„#Á‘‹ËP®QzZ7	ÉR…¬ix∂"˛XQ®\ß’óÍ¥-$7•‘P®§Öé©òÂ_l"S∞jX⁄µµ¨6π\ ¡P«H–w±W˘sãSèZà¡˝ç∫áëü·˘"ärR±j= Øﬂz¯õ¡_a Õg0√√lxÈ≥õ)'>;gâò„⁄¨Bﬂ†[}\Ÿ˛cÖRµM*ˆÎ˚µNâ—IΩBÊSâÓR≈”]'’v∂ŒBG‡LA‰>πevP√!gháLaé√brèj¬¢ÜÏ≈ñpb#-∫HÇ
]lm(™ˆ‡ÒbÈ∂K∑i:J}3tZH9›JÛ8?Xø:ë‘èœˆ◊yìÜWz·<KZà`¯û√]Ô®ü¡≤qu»7∆
:éÜÿTè’∏çxæwC÷÷÷*>‰*¡a û≈,]„Ô$∑ 3;øÊ>≥)ÃãaWZ#7Son=^€Äˇ€4¨≤óBí¡Cv_>ÈZèQæ)˝ãÜ3®≤|o¢qñÏEYÍ{!„Ü&˘U›êQrFDa§Ôµ∆4`S˛åFô˚'›≥(NóEÆaÜ≤fGÇùCñK∞ÿ‚y¡;”´”Ì**€€è∫0ﬁˇ±öTÙÆ¸}´3ﬂ€û*}ìêùÁóÂÓêº’ª∞ıÏ—∆ŒÊ„ç≠ù≠oq√Qˇ€Ä“ÿ{ÛÀN·?~`˙}ù∞8Ñ'?Œ†/À•_lqI¥GQ∫ıÕv„Ó]®y	"
<y	”—PB,m°gAÕsŸ¥~*Uã|HOn»,≤ÕNT]•ie•≤ÃÌ‘+¸ÎV˛?È≥	ñ∞∏32¡êThVπ9È$J"·MxÎÕ(ô∞74ÛS‚W|B¬_PÃ©æ„?æ=eˆ˚u‹4Ë…S9$ÊiÈˆMÎcﬂ4y)ÖÂ∆BÍ	7ÄË	}‚%hü<ªÒ4èx·Ö∞ê∏¨"⁄¿—~-ñ±2√¬‚T~áå¸UÖ!j∑Ê©≠¨q€¿ÍÖ|UıÊ¯f4A·$Oc&^ÍEaü≈U√4C4ñØÿõò%”√À‹r≤]µ$5¶7_Ó2IÊ^»˜”ä÷ôÃ_ åèÌvN1 ´¥z·≠˝˝˛∑Ü= MÖÁÑg,†+Fc%“pn˘ª}Ic¶â'
#ß∞¿Ø√±Öæ™â∑ﬂÖ"K>QdÈˇ	–„W4û≈ﬁ;¶£«Í6È±Íá⁄ëﬁGÚl6‰yÌÖ≥8¬ ∆ú8ˇ¯ˇDÜ≈∑d(CÒ8w'NıØZo2ö}µÓ‰Wﬁ≈¥¥+ø'–õ/<üë5t â`ÃJ¿∫årpÙ7WÕ»ª*3≤Œ√=;Ñu$õ{‰<yÁ(Ê‰“K≈úi∫°
éŸ)-÷Zkucå(Í¨≠õº`]õŒ∆ÒßÀ5éÛŒ U¢C¥4ê7ªVv‹≈◊™XπÁe¶9È!eô¢d<≥ÌIy*Ê§‚&‹Txõs¨qS∞∆Jƒåq¯9B˛îÎΩE¿lX#`Å›Ü!|>KÊQ\Uß¸tlDnì·ŸY5z˚ õe‰C¥ãXÌ·ŸÈ¡C2Ò˝U2b ÀÄpËàXÂk˙ÅR‡”ƒÎ{⁄E êêß+<Ernˇ˜É”≥≥Œ°4K?òÖ˜ÒË9∫\ãÊ,Ï≠¨”π∑Œ5ãuvÖ√È√«ïádÂ€åk∂bPN⁄2>∆«9ö®–mMT¨∆≤‹˘Œ9O„X÷û√Üh‘Ó«ÚQt˙ù‘¸kñSUGm¢3∏≠¡íXc/NQÛô¥µGŒ@ë$GGœ…p<E~‡~…ÄkÀATjyä”Á√û=≈…”4P,Ÿ!À;—Hı©ãr+Î9Ç=”8õ•Y,eX®•7Ú∞)TR%s^åA¬z˙Ô/¬rCë/T9]ùÂ¢b"&‰≈ ãCO?¯q »Ñ•Ÿº1I„˛ä=F˛"Ã^ÚNcˆÊŸ z˛™oæ?øÂ|πÉAÈó¸ÈŸ W∑¯u
W#êÜ∂µUßô«uãNcá…lÅÆú˝}ÚÛmg~Æù_Y”≈i5_∑æ—µlNF◊$¡ˇ^d¿ªÄZ√fK≈‚ÏΩñÒ∏˛ÿêÙXûkëqı*+_ÓwÌª≥≈∂, ÇÜ?}‡®Ü¸˝ﬂ˝ní°‰Ë·ùíc!ÚÕX_®éÎ§åû/≈¿=ÂÍ¬Íd&™ !xÒπ1ó–'5	€=”¢}Ü√¶’-5f´¥óÿ±æü§qÑ)j´f‰]˘lsMX∫Jóx\ﬂ:Œ*ı4_Ëıze-íπÁ{ÂN%˚cP¸>”â]˚Î¸ÁµE#?ÚÈ›ZÀ©π0å∏ÕüƒÄÖY˛∆œDC≈„uMË!»Oú•æ¡˜à9|ë$Söx>©¿D1	◊Cï	T±ôÔÕäúx±¿b~/˘©ÆÀˆZ%ØfC§Xª-Õ)M≤>«πêà„FWjIÚ<ÌcN·6YÃ∂O˝¨>Â‹÷Ã[(ÌÕÂ‰£çè%‘˚d°U0a /õﬂ.Ü˙H±DEjß‚5†¥AÜY{"Ø=d'™TÁÓ∆¡-Íí≥3lÎ w;ÍåKÄÈ»è∆3ˇÒ˛«ˇ˚∑ø≠ÖÁ ¥ˇBùyôFMΩƒpÊ9zˆ˚Z†ÆmÓ4SÁ‚Û6ojï(“‘1Ú˛3ô€§õ-ã|hZbìrsXÄ‘q6¶1%#œ®OÔÊÆÈ≥ãY™aîí>#˙éâií~ÙOF“·ÕBÓ¿yHÚ/∏∞ˇé˙_E ˛ó_ÙJ4 ﬂ}R<çY_πdœ•4≠Y´öÇV«=.Ue⁄D.˚õõeÊvCˇ®ßÁ4r}πÍ2ß1–uUçÇã‚ÑL`[Òøë~,l⁄~î•*á˜ß7ç©ëÈ$Ucµ»)É’oøS€ïˆnæìÉÏ≥w0ÇDÙDŒÁ0=ª0=RG„GL3]©ñ¨õ¿Ô»~6*≥°üÂò˘É|àW˝]>ÊÍ7|–zÁæ5%¬ï_5’œÈ+£LÓ›1ƒ	À=ÅÒ˝™IÔk®˝∆¯ö}°Gkﬁ$ÉfîõQ∑µZ13ö=ﬂ⁄ÚÍ@ﬂ˚ÿÛï`ï™A”~ƒ,%V•¡HÚ¡n[6öÛ=$heNñ¢øbì ÏØãüü~T<˝hÅß7∑ óo·Û§˜äÕ"P& <¨vlmkßhmkG¥ˆÊmá]⁄yR4¥ÛD4¥E∞)i·DÏ‹±ÕGeÉY¥x
LÌ"≥vN_æÀ~*ËîŒÌ√êŒìi ª_¿)≤ 2Ö˜π§#ÄÍ	d£˝ï^¡⁄5!ƒ ´¡·J≥tˆ¶ëhÙÈõ?n>gdl∫£⁄ËW…¡9˛®∞´«Zö˝UA´0˝iFI$ÂrPéßtÇ;á`£éº©GF®0#ö^”æ)|
¢Xâ¿e¥˘qP%ÖQz(Q2ºÙ“ÒtatÑπ>%ÏÌπ˙DN(•
ﬂã*UW´Üúù	[ñ4™UA9‹4c‰ÏP†n|‰Z÷ùî¨üÖé’‹œJ€Ré˛ΩÎ]»•%`)ÂVçDòV‹aêäl¨†¬ﬁ“ôwı±qJÆ◊d∞5Ó€J≥ UÍW5Å¢¢Ôù≥òŒ¶^º∑3TüÏyËºﬁZê
¥'·‰ŒΩÄùÑÏM^¨ßæcu-ç8I±aä¥Ÿ[Ò&˝„£DnY9`>∞ﬂ3Ltöjìñ‰¯‡Î6NæÕ“ö.ÈöX¥.Kô€X<(≠òW∑~áqu˚À]R3„x≈í4äáÈéZ·ˆÇˆÖ\–ôÉl#ŸÈÃ?∫E‹É]⁄ˇØ:x^TŒ˘≠¬ÙÄ»“Qäu¡ŸmJÁÆ!ûglµÿ5Ò»L
Ä‹øı"\î’õ9ÃQ.∞Û	®b6-‰áWZ ΩNô∞@ÂÊûO·[K_à¿‰’	ˇ:∞¥ñ6^»C¬•_#$SlLSö–d
{∑%≈ÀpùöN∂É®\Th¶ÛÏn¨on`ò◊é˛©ËÇM{U-,g¡ƒoeÜ' Òù)∂Ô5w3r;æÛ§ë$!hËç≥ )MTí%F0∫1´Ì∑])€5L ˆ∏†naÜª&û<Lﬂ˜!√§J÷5rŒs4ƒû‡LØÈâÍ≠ΩM¢p’êœ∑`<·ìñzæ”Y¥ à¶{dx<¸Vt˝€_Ò/ÿ]s$°KV)r}ÿèŸ<}∂¬˚ËñèßZ[óÏS°–IŒ˝úm¸y\dß∏Ì©7ô0mµ“ª÷j∑@hö»‘Œ˜Sfp0KÚâ·Cx‰_$“Pì$ÿŸØB|rÉ∞ïy6wˆ◊/¬v≠Á=	Ù`ºx¡±ˇo5óPôf-&¸òüp›O|%Ú÷aÃ†€íÑ[å>èX|ûÖ·Yâym
*ƒ˜Öπ¿≠ﬁG,ô≈ﬁN˚ursàbAÉóæ/Üò˝eÊ≈lb∏•à ‚yMÅá≤W™f ›{xVÃ@‡H¢TàF´<If‚˚k B∏Çi√¥‡…ﬂ‚†Ÿ@”ﬁmjæÏŸÖl∫,õ6^¢å,=ÛõoO` ∂3¶˚-3zvlπﬂª÷\€rwUW¡—›5>|⁄ˇf˚	ÓÈJ(xM{◊≤”¢BãfZZssf∏¡xÌõbK?o$õ$QﬁòàÕ%éñÄ@hÁê*ıøöPu]∆vÊgI»Sët…©≈qhMyπ@Qw¶ﬁ<aN∂ô…™_LäÁ†@íËME È‡ﬁπ7cÂ¸ Ñ¸‚Í≥)·é_yóÙöÊ±©GÙp˚“[‹RL‰	ì¨af:Ωµ•¡-7_ÚK«Sã€∑Œ]üG‹öa}¶&[åÅ≥ÓjÚh™,Œ®è[pHEZZ∆fCÒÆOÃ¬xCvAc[Ó-R—SW qLëj"ì⁄é´≠Üå¢3€‘a«s≈¿$Ï6WdkG{Ä¥à/ˇQ$ìô∞≈ƒ›®jˆhqØ|v Àbç<ø`~MüıÃ≤Ä¿◊Ÿ«ßﬁ¯®ó÷5‚Ü¥ëA∂∑Í∞ÿiÕÃı⁄ÓÔ∫-e}Ìj+&<3òF†[1ë*ì!‚–HÀ+L‹m],†W}w∏náºÙç]ˆØy˝Ω ⁄â∞ù(sÌ¬ËBë‰–yØ7öÕπ∫cô∞ˇ3v*’læÊMnÎ'z,âñ¢∆P€ø›%≥Z=w≠rW ‚@ñFù¢‘*u/Ï_jJ#:w∑sIùJ´J‚Á¨ ,‘îÖ\‚,√OYC˘fsó”^Ï…/Ä¬pÔê‘K}V,¥KÁê¢ƒ›.#±
Ω∫1ﬂ|ßï¥x*y„çê¡R…˙î˜æ,¿k∞‘(:î—Ã-¨uZH)èLeî3ÆËsvƒª!Ïgª˘2ñEÁK€ŸpMgØç˘—û◊)K»:Ÿ‹ÿ⁄AGÌﬁõÙ6Wo……¡d¥oF≠8} úÚ™6ﬂ¨˛9=|÷GÄBSyï å‡ÑL‹lXáﬁy%mÆê¸˙-ù•Ÿπ)˝Ô0Ü1∑ºN©÷Ìæ¨°ôDËÚ‚Òã‹ΩÆ”ekm:◊„)¢¬jÖ≠C√Óëîˆ˛ÿµ…Úr”+ÀKç»ÉHõ8[k˜@ûëÔ88≈⁄u)Q¨öüÎ9≤É& ¨—A~Ê¨TÄ–Z™6z»W]:ﬂ»ùm ÑT*C∫©≥VÛüNZSπ≤›ÂÂƒÑª˚è5œÍUJ˘∞ƒ®ÙC
Ú8ûêO‡Ù√Ú4.T¶å6ïÉˆı:0¢ÇfœrØv=\e∆J≥—qË-J∏±A∏çHàÚûÂ“lQ∏Ke3_+ó±#uyµ<zsÇ’h+.õŸÚr∑w∏x]vÏú8È«¥ayáñ∫_≈ﬁÆ_Òîâ34‘áT/’∂î’ªõ2øcπ[R‘SªﬂŸZ≤›~<èi2›˙Äõ—AßpQ9ˆ]‰˚L
©cê¡1“>`â yÃﬁy `èx)“$Ω÷ƒú‘ö‰Çx•Õ»À—[¯km∆Æì^„Á’‹"˘Ÿ–’(¨ç 9éÚï,ærçpAºÇ¨q\ í7≠≤ §*ÀåZÖÉM©ç©(=ÆüWãêÂGª%∫ÒÓœ8ﬁÁûp•–±rz}!÷í4õµÁEG†ìª©z‚Ö€¯¬?˛ı?wÀŸŸÇ#ôœ<ﬂˇxFí√Ø>ß^∏ÿê/lc(≤.}áx2Áx`Q…(>ñëùz~ê.∫R‚Èèrh'4!ïm°±•1£I≥¯£‹`î0MSLÀ«ÏytÒÒåÈÀ,Œ÷K}«Q5O◊µi∞8äÇsF«SãÅ≠í?%≠;ìå“ı?Ü)88ë±'–MÊ€Xp.‰wƒﬁ1?ö±Xjıåà˚è√7± uß€±∏∑Ëfy˚«0ç·{—πO£5“0‚Æ≥8öG	ıÌw>èh¯Õ—óÙ≠GpÀ-»≈ﬁRü∆[åâ8ˆF5¬Ú¸™!¶kô≈À≠_ÓØ7ı∂ïTJ0=ÁEñ÷¥≤TÇ
¿Ó¶*≤_6ŸËÄÇVL˝g77y©Ë=≤Òê¿øõª‰∂9<©;÷Óﬁ‰wo¥oÆH•tÚ£6xôöÑAà\˘0£ÿ-pﬂÀ–Ó⁄´[ìlÛbÎº÷
<»äìSDe.∑Î¨Á&¸ÎQM•Q—MMwﬁ⁄PÍŒ:‚“e>N∑Axº_èÎ%OîÊ†3Ü˘ˇ·!`õD˘)uz	êöó`Nú§÷g -4›VGïH∏©˙‡IrMˇüKnÓóYH—¶a0?bypåé	My°»¶¢¡dø∏ÓçYx ÷Üßg‰î˛	Ç∆íØ9h0!/>Ü’_»ñe>aÏi–¡´Sä}‚=Dxë¢0[-_ëÀŸ∏£ll∆2ëÏ1¢óÿôËìrçr›eïà
AÜ‡ôì,‘ÿÏ≤Ÿ}Tì!ã\Hﬁ•YÃ&(ÑR:ü0$!Y
M®f@ô&yL–r„Æ◊˝MÛ"ÅWΩïK?≥¬	,©EqN17]Rxû,ñÈ+7Ë—‡|@˛b‚K28º G«_Œ^…ŸÁØN/>—¶÷ù–˚Y-iˆv⁄üÄBN¯'/ƒ‹-UZNÈªÙæ&¨xﬂ˜tâSjâÑœ‘SåÖ¬ñ"¬Ì@ÖËq≥B4!ΩAˆrHBœ+øÄ7â0◊åÔ†ˆòÕË™ör’›æ√h4rJ^ZÎ<ﬂ¸§ΩØ’otòçXgœ.ΩMÈƒŒó<Ñ)ú∞ƒ+Á¿Å ìá¯{ïmÅ∞≈ò^Dìèd∆ÚÑ≠báá}ÎIïyUŒﬂ◊YÁB	x·)‰lêäv…î‘=$oE√úYæ•1	Ëú˘xZ∞,|Ù&ÚΩf∂≥7•-_Rr‡#èS}°v.<%c9ÒËàÅÛÀ%]`zÜ|ï]êQÒ∫Éì˜5/ÉYÍΩÛÀKÍÜ.c…`Ï4«xã)sYÇÉPî–≈†ÃgÛî-?Hú	J˝¸Sá—ÔØgä<C%ËM” éª]iˇØhäX=≠
PÆË‡Ø‰Ê⁄´¡CHú48√R,ã√∆‚\P‚yÜ^¯&R¥Á°)ÅØçòŒ1ùÁ®…‡ÏCeIn®î˜¸vJ”d0ü?T¥'¯y^∑WHzô≠ä√Ò¸ÛÛ¡¸˚ÍÎ¡óõ í ©7°3E{0?˚9ÖΩ}M	¿Ö®˛áàB¿ªÉSÀ“a·ÑØöJ¿–zúmÊÜ#¯F«“π˙Á@®tå©¨ΩïïUÌ¿^#ú&=tLÎoN£K˛¿i4°~/ç3¶ºπ•Ñ‚U’‡Æ˙º0—v°∫’BêÑBÑicD⁄(æz¢HT,√Y+‚£V&´
<Í™†¡$ˇî˜—5t!ÃDç÷®Ì
¶pŒí≤¥≥¢·2èÿ6ß®Ê(⁄9+üWûO~¯˛£†iµª∂ª¡CX78Üb= "œKX.ü¬6Gbh;ní±®|ß≠mÑÒ≠àÊ¬“˛˘´˛÷ÆjÊôµÃPõ◊ÌÚLáIÕ˚#8xV[{f¥∂º*ˆò£4˜»∆⁄”›á„åö∆+ñ˘‹fÂ°MıC øÂ^=ªÈoZ6N3q∫œØGM¿ƒÂˇxh{0©"îÈ^"ßxEp#a5˙B~tÁù’N≥" _Óﬁãƒ9f8£àà’jYë| Js“ìö9iÀú˘3·\´g“ÓÇ1ÃôÊF√© ƒ‘@FS]ŒSı0Fú»≠bB”í§ÔÑ∆`$UòçûüŒÌ¯åéç˚}∆bê3<ƒI@ÛJä|Éy>1ÙZ_ÒÕ O˜QA€GÔÍ'zÏÖ:yW∆Ì›Ê9˚¥^ ÆF⁄ÌË.ska±¨Q_7|Ù©∞D-Ç,X ”ΩïÌ5ëQ*¬“πzzkì´Æìo∑∫°S—öãõW•›68Fù-ir. ]•∂´Èµs°#¶NÅ∏\≥s&hÃëviö—4¶6èñ¶P••}M{t‚7d´º≤0∞ëiOé=5p©î]I∞Y›4ºFŒ=¯œL~œèè'‰hp68◊¥vt|08<›Eá8g»qékBπ)Ïl_-øà´ÜT[GÜkAeñg≈ßjÂB\ıûU“Øíl<fâ^Øﬂ8ÊÖÌ6+h€Ç;E¬Ya#Vê¯VÌÿ~b B–¡—EöØZÃìÈ.Ù8 \%M‰ﬂnı¯u4<˘¸¸¯Ñú†a[?øFÀœs?ÌO^æ¯‚¯’È`xl8ﬁÕÖŸY!Ø_úø>!ßü?º¯˙ı9lZUUH—ò= 	õŒåe≈ç™°Fù∞‘õUf˘V‚ô≤-$0T¨0∏‡Ÿ	d(√äËåÿ(˝Ós`g4©Ü˚∫Rƒ∫äUÿ\ä%4h?◊5À©Ød˛k:¨Á”3~Â6œŸÊ*;a(¨ﬂ¸˜Q°æ´@Jö£eË∑51ˇä\z]Õb¨b[¨öÉt*AJ;3¯êXtíÉ-(~˘a|‚Q´'N˜i7ö›, aÕ©/EÁ˘◊©v]ëƒÇkLûÅóÅºrZÒÓ#P´·nL7Á!	BÑDãúA€GıÉª™nΩ≥6V€®çﬂ´2Z˛@';{d(¬…·´◊GKI/0∂ ≠Ÿ˝nx*,> dBÒ»∑¡EêÆ4•XùÆK(îs T√‘)«Ré¢1cy™¡≥õ¸SsÅÚ\nŸ“≥õ∆Ì˚_œ'ı˚k_¥ÔY^ï˚k_¥Ô~áEœõﬂ¥üêJx´¸XøßvÄ©	LA+{d‡gËHábß> Éf&N–Ñ˘Ô%Õ$C˘≥ñXZ\≥.i?R¢å4„ﬂÍásÛh‰0xud`;0¶å´Znã◊ÎÒ3ü‘˜
∏ÚÜÕ∑%/4ª@G∞Z≤{4ˆøÅcô€Í¢yÒ9?6U“«˛ó1ùd\ <DÁ†∞~>R≈”©=oFï'òÏÒœqtâüç≈ì∏MFW®‰±Õ0†Í°Ñ8+k‹yïáœî–*#gı-IÒ¨Ωf>Œ¸Æp&Ò«‰W;-mµrÔVÕ2Wôà&¨ë˜~¯˛ø˛=9{˘Í|úûø>}qåë©üÉÇ0<~~å
¬‡ËÙ¯≈Ò¸ïZg2î¡™[òÖç´%‘-Ã§L0´lΩ∏zêÕ≤úú Ó-yJz<Và<œ¸,Q©¢Øí∫é+„Öè∑ó[≠—°ôÏá—ÇßÆABD˚Ô(ù–`$ã†eImÅÃRÕ∞BÇ5Õ–4&ß†Røãy¥cÃ≥ô&ÜàÜòJãù¡>X#G4ôé"d;h∫·éM<ﬁ”Ÿ4K†´¸- Ê@ã4√ˆZ—V24À-ƒAC≈Œâ8$ecºç4√ÿnFÀbÅe,;Àß1·Ì¯8ÉKâ?T|’‚ÀñÅbC∞49'ﬁò¶à“e„–≠rÊIP)gæUØnæ£·A
∂ühÔTúR[Eåv[≈-\wâ∆I≠„|
s¡zj,™Æ2´cUºCß(w[<àEôÚlà™÷ûwÆ∫^ÚçN¢aÁ(Ñr£v„£ Œò°‚Qÿ%–C:ãm.ΩÆΩÒ|†}Ór/±Yu÷xáA.3‹‘ìwqp£K¬\¢Ω ;æßW»Ôo¥„⁄†· ™*|Ø<S[˘Û≠>dåsÛ+x∑xÁπøsR=¬∂∑áSè˘Ó…˛yÏÏSä⁄ª(gtûüW˜≥≈ãEX÷Y{;AêIΩd‡ìg?é˝Æv„ÂΩ!ΩOp(´†Ê`ò·VH˝Ú.Ü√ìÿ≠¸íè~d·ôºπ"KS†à$à!Çı⁄÷daD>÷,úSo≤¢„lxUq(¥∑iÁÍˆÊ®}Ødé%ÓYÕ∆ h8£î˝<∏£ê{
æà¸á^Õı|√7¥f[\s‰ƒ5ÂV&œ™l7úòÿÑ‰«|€s°íËwªÅÂπ≤oÒíﬂ∏qqqÛùyπS3fé.4üéKÍyúnïc6…∆Œ∆,xHƒR√GÚß–>HË!Ÿ–>‹®Ûß«+°M†^+[l·€ˇ¥˘‚fâ‰AK˜™V·N¨1ÁbÓ¯”÷ùòFRa8–ıèÂ2≈W-Ûñ4%ç«SÚ@T±q?‘}ΩéßXnﬁönE¸ 0ÚJ`GÕê•3¿D†ã'/‡Q7ŒQ∏E–·L˝!õÎ[§_÷VøÊ_8ïáÿóÀbÍ30}¿ë-ÿ®^}éÁE	R±xÇ…n(›¡†)yŒ–˝='M¡/éáZ?∏å-Ìà°©Yè™“‹†Úî[ë9E@êﬂJÊ1ñ¬Ω.´ˆ a:Wú„¸∂5TïBÒk‹«X‰∞¸£º£VáÆ¸P≈ÅW∆˝Ù´ÕÆ.4‘qb¯i˚‘÷fES^œ⁄∂Oz# gSä~•Å&‹≠GßWº±ñî,]pàHp‚E81'Xπu!≠˘pÓ
ny%™ûTÉrÅß…Ò´òô(Ø⁄¶ˇV>¬ˇ–y¢Zˆ”)£gJc•C∫U¯∆!_£Z∫J√‘7â––MeÚ Fºr˛$®s=ù.‘ƒÒp±G•	œíI3D∑◊êªŒåÈˇH4ã˜¬Z{˚Ä'@õÃôwÌÇm"æŒ¨Ÿ~ü]∞Œ¬P®ì'2ﬂ‡CtaÄ	„1Ã¬Ó‹	¯%VK	⁄˝ºüé¢…uµ„öÚI⁄mx#î6õÕπNó∫´˘è¶Í∏¿∫Ü ı<ªyÏXb6_ãÕ≠Z®°≤å?à´¬Ê˙¶!#¿§„ò„T¨5»l•üjûUã±π®#gπOIg|–©“ßÂ’ÁòØ4”ÇA"⁄A ùè„ªL…,Üﬂ·∂¥5œœjuÜM—/á£Ê‘ ıTsHÍ˜¢≠{N/ºêWÇõâW!„≥êπ˘oÅµ˚ÃŸ]!-úMwÑ|Áöwk§∞ÀÂ=]Î÷•ûkoR¥OøÊÕ@o*}À5z£)Bk!4<µqáﬁNirƒFi£ß•´Á◊z|tgp_„÷‡ıÏJ0Ûçj6Y[p_ﬂV’∫˚ÙFT bìanëˆöî◊¨3∆Ò
0Qw‘XB«¬ñ“âÓ¿÷÷çÎöS^ºãså¡s”‰7+Bo]û4q$∑Qó`ÚÓ¯Òe?=C·‹;˜Ø&+]m,Uµ`ú≠€&®bpu„ﬁbu∫Ó>~IvfPüZˇ’¸√©^Ö⁄Ú\ƒ&ÿ·5•“^+Bÿ≠\ö¢˚∑Bg±˜ﬁi´πœ0Aˆ¬£,∫Î2¨˛≤zˇÅ˜õ§Ö›z‘ä√÷#7ïÛ¯√n&˚ „ÖˆL3H<ﬂÍ q=j§*LÎ±6ßy˝Ii2Ï\/â>9òò£õ√ΩœM∂º©”˘+€òˇ≤‡˛„pü#˙bnˇ±lu«›‡Z´[m,Ei]@,‘ {-¢˙ Û¨LÆfœ4D’
Q~r5¯ù¥UÍö∆BVáòx;«Ç¬ﬂ[ø≥Õëù¸@s&'ôD E‡Òu¯èÂÂV∫…F_zÖ/C öZIV{BπµJÂ·vÔÖ“áÊE≤±™ RΩh∑ ‚~&TvOπ#`˝c†]∏ß~·g%ÿáºL¡3µIMı–r„NŸ8˛≠∫7
Ò◊‹ΩV¯nt˝∑cc G‘oq…‡“˘£èXJ=∂\æÒÖ˘>K»o:Fhj^ô¢Â£àæ3Ñ. —ºŸá¶™©ä:Ë5ÓëÒ	‹Ù‹k`{#¥æ8#“ú)áHSç◊±Ä∏ÿuy…íÄß+.P:@\Î∑	{3O˘´ñòè
0qU(Å@l≤◊¢∑¡ØÌÿ‡◊\Å˝ÕfÜ˝◊	û02õÚ∂•´îI;REŒ‚ËçÒØ"Áé^‚ª~ØµëÑ]¬`ùÓ&FY+@S)¿8r·ªŸ≥)Û:tô ƒòO@ô6˘¸ıÛ◊√¡„QhÖ#◊ÉQÊ˚ø∆»âEzÔ™H∑óÕl¶È⁄˝ÊG>ïi|"œoΩLÁõà¨CìÕ>œ‘õÎC‚≥À™v©ì„ﬁ:¡hÿbˇ≤±˝ï|≤Q „%™1+6	¥îXvk1Säê
'au˚Jã›epß≤ ñÙö#Õü—ê-êbÑBâaxÈ•X∑à#Q‰·lgg‰]R∆[Í™~*O›πÖXâ’π¨¨èÄ˚-≤ôﬂ?⁄N^Ö'uo%ôœMñì™µæD~Ÿ“ŸãYKp’¿#A9a∑‰HFf¥π§1j	+#7rB·Phú∑’H$¨7ß(¥WÄü]`+ÛK ŒâF•3\¬ú⁄lcŸàt˚Q4{9Gt_ó*¿µÑé|óÈm9¶UªÔ™∆1«™⁄X(›Jø$ÊSìõÆua¡À¡ãZ
Œéü+#ë£ˇÖôàÀƒLÍ9nfí[§ Ûπ«√‡lÆ∏ñ{Wg‹b;–(êËœ$Sî=¢±π%ÅÜ*j¨A¯GÈ9Ë–{Ö%e8ü@ã¨Ae,âﬁÏt˙–GKµTã‡∆fÌT—_/‘w”âÛ◊O£˛ˆx%n<|ß‹hï]UÎPSÌº∞?E˝íÀŒ:Ë£ä’¡bµA"Â≠@JAÒß©ÒÇvn=Ïg„÷‚èŸkpö≠ÚuV‘SÉﬁë§-ºü*vªÉÔ‰¸%Bùø~ÒÂóº∞ã–∂≠¶kÁh
-DQ≈≠…›Hº<ZÏaÆ1ñl”ÍÂ$Âóìòî_Àó™muõÚKÔZ^wJÀ¨5¥ê[Ÿç™∑Z£û”é¨5áû^ﬂŸ®˙6ÂäÇÜ›rÀÀ$âÀ]JW"\	.HÄVÈ]\^\"p˛Ä¡—Jé<JB=õÀ‹J6&Cﬁ°Éƒ¢`≠ÚòÌD¶6öY›‚∫ãµ∞f{q”˘húÓ∫Ÿª+u	~`]®Å⁄Ÿ9Òﬂˇ›?ë6ÚﬁrUµTZµ˘∂’)üÓZ•µUª·¬ïó‘üu–póÙ≠7≤á],º.Ë≠®ù Ä”§ñW6”‚∑ïÇ’a¥4¡´‰êﬁ‰ÿÅ˘¸+:µm¨òÕ"Ë”|H&…huç;∞se-á9VM∏ÊoöòÑ[ÑôÉ1ÏKW⁄bπµbÒ≥%ê€ºÈxù+Ìˆ∏DD4Û|Ÿsûoı qo3Íì3zÕ±o_Œy!¨EÂÎ'ø≥Îæv€§*óT^„i=œ]∑Qa
†ì˘uDﬂÄ™"=º0g¢&ÈÉ2VAçR.:í:∞ƒBÆø˘sà„‚?ú¢e¢Y+Õ¨b∞Ò8á,ªö÷ÆÃ’k∂©Oπ´ﬂßNøkT@÷Êﬂï“E˜|ªFq6<µ8µ8¿2O≥–î1Â“ú[Yı:Á•^Œxìç7/•áé±S‚À˜÷∑N≥ó≥9+∏ı“˙ié*[rÿŒikN™ÁÕb"ØÉ8Î.ëZÊÍ√∑Nd~£)ëÆzIu÷$±‚â6¡=1‰◊ŸC ÒrUfE∫ùPíWæŒ+]„-‡qDôÍ¡«,`‰ó=Ã≤∏œaç‹‚b	˘∆©okkk])Ø%R3^ZDïÍı;∑%Qúˆz4∑å÷Æ»}B˘ 4¬ìËpbxÆ≥bKë™^<]
ﬂ`Õï™^ï‘™j≤n+lU^Æ[F º#™~‘Mu%ÕÒ‡óòÑ öõﬁ ?p°‹Áƒu{Y‰í∫PîåÈ4BWÉ_yâiÜ´E-Rï!/qÇ:	-’¡Tm/‹Ú‚xnU:ÊÍoà›bä›/∏;Â
töºŒYÃ≈$Òﬂm
úl◊’O/ŒÁ®ÄbëÂI∆$cªœ˘oßù¥gæ(•˜~¶˝îÖ¬¬#ìVﬁ√ƒﬂﬂ¸R,¢[L∞¯´=√‚˚˜7≈¬∞yÄƒ}ﬂ≥˚èá√¸3hÍW∑|ö˙’˘∞;ö/ﬁ7fﬁ<=èŒ‡ËJ{›€Cÿ>q7Y≤~M∏˝hè{(y^ ∑{M—∂{[∑Ü¸}Ì€Y gÓÿà´ªVÊ¯l?ã ¬⁄-åLcÁûkr Ùó:˝™4âµK¯YLõ≠$,ì'∫ïÉU∆±6„à¥5Âxπ¬∂è®m›6\W^ªœ	Éuc¥xÂ°]óH∏¸»UO/Øukò∏Í:‰ﬁÖæˇÔˇª„·‚í™Vø8ºU±¡ x3N¨EvµoYË∏€9P-π ö«÷rÜMÅËÒÑ|á F»wg†ùü(é0ö\ác≤ËA&˘p}=©ª/¿’sºñò%F‰m˝E/©óÚ|ªkêÌÖ'ië#/9êEN«éºT”…ì&i7‡LÆ.¥≤ï⁄ÖΩÖ^ø,9Ø; :xÂÚŒ¢](,Çãv E&û[%%›≈€¡«©Æx∂À≤KrgTou-çéá/•≈…⁄®Îw÷û≤tMÓ“µÈ˝=gæáCo»fëOß´“€ái„—Òù:á€iM∂c√À6_ﬂΩ|u‘?ºx=xﬁˇÙ◊b-å.{´∑ﬂ-:¿€E\û$œª±8≥∏ÉDè◊“§zºE˜É∏≥>`“™êıÖ^PÁ–A24bä∫©™:÷⁄Ï7ãö–UÎ*&r”ªû=Î.iH…†≥±B\e—Ü≈v
◊Sûvßº™Å÷"ªΩüÃΩd_+R•ÍÍÆ>àK@∏q˚ôåÍnì=Ë:mãhIN≠˜´ã›ŒÕs ;`w :ƒ˙j0E7©EÍ∑∏Dòu˛—D}Ô)w§H’9ÕRésBæà‚`·ÿ∂zVÚΩ∂i±‹É€4pvùˇáÔˇÓˇÚY√7†o>k∞€ò~„{£pòçıò“p‚≥°Hñ_∫by*
ú#*∫·Èn—j›™'Y7*/ttÿæ/à™Û´sh°∑2aÛƒ?n5k≤ö÷_Mól 6ÕåˇìÃí(iL},&ÅB¯3ÚÅ8±_C§îûÙ–ıÙÀñQÿ˛§¸/˚12diªlKº\œ’˜M~ó^:ùƒÙí˙?~
¨åÂgCÑ≤:[.⁄”H4fÓ√7„Ó6|©o¨†÷-ØïPs0õÁı!äLÇﬁ´πMÚ€_Á≥v__%©zâçfËÇ∑ìDÃ˛2ÛbfèººŸ ÆãÀ•^í	f5öÓx“ÂYY{)Ω$;ÉP’`:óOª’_™^µ§ﬂ≠V`ºé±ÓR≠∂í∏€6Knyµw›MN¢ˆ~2Z∂ö¸÷Zøë@Z“Ñ≥”!ñ€m„‰[g<e„Ÿ(∫r·ƒ¸^tP%”ËÚ¸ÍEî2™∏∏ZdÎf6G¯ãÚE%}Àn8’x≈È÷≥bÁàÜWLÂMÀÀ…∫V-W'çbµ›±Ω—.V\)LV ÍoêKˇ:Âˇ÷I…æT∆a9ß¡¯)"≤N)®ë4tL›Œ˘∏Âæ*±Ë-€˜k¶ÿC'fÕ-1Ê=úàx…Ÿ<a∞Vºf”Ïò∞·t<Ú[]w∫Ω∞`Û™ùjÁôÔ%Ñ¬¥—!:U˘w∆`G√∞|O¬»`qòπ(6µUõWq:Û›aÿ‡Æg!^?äÛ/óÌÌb2¥‚V;ú≠N
ï øÑ[9l,√ “´“}M~ˇ{Úâ´†T’£Ú*ì¸#±™N⁄î	Ì^.}†ÑiÖ0“¶ãR∂†Q†V±•Ê”ëﬂ=vÀk∏GE°â¢ïÙﬁ÷ÜM+≥¢$‘®¬	ˆøY’zsÛVÎπ∞Ô-G¿|'ÓÓu∏Yÿƒó˛áÔˇ˛_…–0ÙôV®≥ìfè?˝/‰ÛY¬fËx¿¯Q+Ü\ÿ™´keﬂ>Ò6ne◊æ˜◊—BªîlÛ¬ˆ˛ïó¿|^´ã4◊7òﬁﬂoZπ;˛≤‰Fô„ÀÕU∑äVbö=7[åﬂòﬂ—·‹r3∂çÄg09£(öùFÍÁ®µç∞´h≤Ω·∞´ÿÚ+E∫¬¸98‹≠
Öµ≠pÈıœd8*ºv\z6–…ÂÿÇ[pN1°»ó˛∫Ä
5Ωè‡Ex!u	Ú}ˇ}À!Dñ÷πè•@@È±N`©3>W∫4|Æ¥ñ&ïdcî•; t˝á¿ØÓpca]´‡.8®¸‚ÿ	?TÑw^v^À€AykãÏ"ºÓÜ¡±˚£µqÃx-„tÕÁIÔáQÄh»=Z˛‚æ›È!Ω∫_úáÙÍgèÚPƒ‚wxmJÂ∫wâp^-Pùu‰Ñáì#&Ùzè†'ó≈ﬁ∏cú5áµ¿îé)láéœ"
∆Ç/æÌˇπØ´&•ª‘0øô5ëK–Âv•VùÖpŒtLäLΩ‘Á÷˜µ–›¸.ÆnÅ¨≈+–úª“Ôîõÿ1ˆC£q¿H”ñ¡nÈ`õ¬#Ä„·\háÏ6"D}í?BÃ•ÑV⁄˚û€{ƒÉË–çZúú+≤–ß⁄-π“™OéFÔ∆)lè&+Øn®EúW|å D›a8ﬁGzˆœ¢CV@πLGzıH«è§„=Ct¸Ç…°∫>Léég˚"âf7ΩO‡,™e_À¿ã˙ó¸ú∫dÒ!PouÕ«>pÇ§∑xn—YY’÷÷5ˆ˙É o4¯ª»Ã9ƒÍEæÃœ9/≠T¸|ÓqK√C"%
˛Aú‡ù3ı˚=4Î!õza≥îH◊ú5
!Tª˝uªª¡ﬂÏx	}sÂÄ¶‘ü©-¢^Ë›˙Ó>¨k2›*˘BküÁq.º0/Ô/˘„?˛∑ÆTΩ–^Ïf[∏?Â¯ó§œ •Ïˇ˛zY.º˝X„ë˝uCMtuK–BÒ#PŒÈhèπ@¶0ä≠˙ÄÄòÖcœ˜(j€’hî^C¢(~WöLZW¯\_|s∑)·t®snÚ}§¨I“¨<^üpúûØÄ7¡d“x“.HﬂÆ–R≠n&ãõax‘ºSî7ìa(‹ûˇUqÔc]ı¢ª’2É9áŒ€´’Y◊ï:k©C÷íf[¬ÙÕãœ∆zfÌx∏G™˙e ]`Õ&{¸s]‚g•‚óáÈ
”È™†Ya;Û»µ©•ô=\Æ‰Ó∆∆˙ñ$.˘’NÎå≠‹ªΩ[ô©√—ÖL˝˝˛#9{˘
À®èáøê”◊ÁÉ·1nÿœO^æ??Ü?ï¨Eg¢ŸünkÎ¶U}Úaß•]ã!W∑ñﬁ«]„1ΩÊg4&9Ñé≤∑”me_€EzÆíñ!;Ö≈÷Ï≠v!$Mm∂^g6Õí,ë8Û ±rØ+/u`¿∫®áÆØÚ0cs¨≥Äpı=¡#y4;çWÖ„uçy)Ù» nÉvÁTÅ∞Ä74—Ò0è3F¯&b·øqJÒ>¶4√.j™U‚Åˆµ¬øÕÊYHÊyX¶∏öS#ÏÁ"VxMUdeπÕâ®›´1ﬁ.™;ö[ñrÿ6Ã›∫¶Dû‚ÓWå&QËtÎ0
/‰¿
N˜«QlπÛ8˜Úò@,ı‹K„åiû–ò;¡¯∂ÑuZ2™ZL†¸NX	ÿÑY	,mîÔTA,Xb˘[Ä{ç1··2¶ ‡Í]ΩÊg…°è˝¢xÌÆ∂¬Ê ËIŒ•hú)©Z'Ç´èπˆó™òAî6˛,Zï[è√â7F¡+± -@ê$ÿ´".‘Av4á•BòK;ÁDQOt6¢JƒßzùuGt=Yfªvû÷Œ“GµÄe%o	$[uM8{4c˝oÄƒ·TWÜËîV\Q˜E]`’ê∂πSqvp‰úG®GV◊n'ø≤ã ã®C∞ü‰∂ Ùáhz§Â±Çµ⁄#szâ%¸§ó¨§CPÔ®≥ñ∆^ qKÅÖöÒ†5>~[ƒN~_›^U◊Ä¨¿{÷6§Ñ∞≤™ô1∑4î¥jÍ‰Ëà√ƒÃ>nÊ—ˆ™∫0év-Êü8ÎÄÃy^ï˛Óás∞,∆!¯É¡u&†z=îéåXΩ?>¢˜1Òlv>M´$fiá‰ı¶Bﬁe2≈ªó¶r™(‹*W%b+’ïÅÒûîú Ñ‚`å6ëﬁË! ÉX$F6¥∑ißÚˆû¨}Ø‰…A±¿∆óœc¢ˆ˛z˛Û`ÀÖDGMIJK`ÃyÆÆk6ï√∫…˘≥fs¸"Ô›Qﬁ”ÕkÃ&Ÿò¡qò¿·D¢`ê?Öó ∏éäUüŸC≤°m§Cê–Oè)©J2π∞§Œ0ÙÙÁƒêﬁÉ§(‡Œ¸®g∂ı	Èê≥è"ÍƒbacåÃÅï-õôπ≥≥%1¥•∞4É(%%L.Eﬁi%FÒuEâà†AkI∞^¬Y+
û8 äDjâﬂíc)€Ô,∑∫æKÔ	◊ª—ÎÁ«®r~åd¸	ûcÚjoıæè≈W-ÉÈ)ıBÇ@y0Ed8˜ΩîbFªõLªc(Á»…z,ˇ∞GÚEñ¥√1⁄∆[MÍF5
˘”õFL$w¨7SÃ¯ø1ÔÂV^öÌ°bÎb$sŒôá1WøŸ‹Zπ-#	m¬≠Ω€:ΩkN˙ù“+ﬂ
êÓxX¢ºp√g´˚x[óqÉòÎº±:üï–BãQ-˛¥±À∞@‚©’˝®¬ç™ÓÅ∂B·AÕq4Z^‘CHı}ì¢íwËöÜàﬂåæH8ƒÖﬂ3˜Nj˙ß‚eöÀùá<h∫∑?d4´_]Ø5êG@ Ÿa¥z4œ‘≠Yº“ü§I÷¯òåHkvlµ:F(ç=„†Î/éáÄ4	âñün|jtgÜ

Ì¥˙†+ ZUﬁˆ˚O»<ÜÈïPƒív&Êõ=)©É.ÅÒq+îBâ"^√M+É-¿i"@¶:ù∂ıVÆßNí◊†Çh±@ÆH≈k™Q3"#ÊGa¿ˆ1|Ë`=vk®ªw@ıhÑé“84ò¿†9g4£?Ë>ﬂDN† ∫&ji.5ÎÕ⁄´)_wi/œ>ÃÃ„‘jA1:@aHèMºLÚ›AüMNrπ3|Ñ4¬ñ+V DÏ:T»g|≥Ü”¬¨?
àÄÖ,»ê & »3X p¸(NXíQ#¨É9n◊©kŒäú”tiØO€ó˙åU9™YÚö+H†ò›∑[°pCG◊C—≤ŸaRÔƒdLirƒF)ö*ƒ¥T|ˆßS¥‚4ûó†≈æ†Uçœm‹q¥^rò≈1Ãú=îZå•fCŸ˘MÆ∞ó+kLóÉoã8¿HpàÚï]‡E1PÕò+í üﬁ®&F rñ˜mä¥Sk¢©mõhr:U&÷÷£MıÏN*Pı*f7ÑÜÌâéÈÕ˛:RÖÜd5W÷/’˜*É0ú∆‡íà±ƒï¥©ù ó>xù_¯ï˘®G]ë:¨±CáÏ⁄Ònπˆ9JF<√%ﬂH"e¥^Fä⁄Ó2ø'lœ5O–‘◊™¢+BBôx	e©¥ÎΩ”∑-°ø„ÊÑ1hÚ@TØbFÎ.πEìÛó>.Ì}ù∂ç[F∫îgúÓÂ¿√™#§H™sl¶∆‡à–∂ú}»—r)lqtW§çõ\^tÃùUÛ˜2˜E5Òªjg¢H±òΩ≠À¥∑‰ Ûk8±˛˜∞≥úë}‹ë-jÄ∏.Ÿ%Èπ{¢sñxXóπıÆ{ëÑ2Îj°‰ÉÂ·ﬂΩ∞≈ü∞LÙ¯·˚ø˚?NÑÓû˘˚û»Ä&◊·òtC2¡†C«[π*¯∆ãÉ.©ˇﬂf<?+Â·R[ó÷ëOÎÍ√o˛C¯B·S·ˆµâ7ÖH¯ìlD/®'Õ+t{r≠Ct78C¥ß∏C∏Â8åÇCÓÙFÊqÃ”.3¥rJìl6„µU¯P—çD—FÃi*œÂ7òÒ=ﬁﬂÀkí=Óí'˝Éá‰iˇpuØÙ…
<‹·Å)HZ˘Ãtô”¬⁄$ê7aRÈ%ıR†Û◊ÛIô÷Ä¢4t√ÖÈäÊ˙„©(ì]QhpTÄø∫∂¿π¯^Aì]gá {¿ˇ‰ä_g@ù˘4
+c·.÷RU	›ª√Û"A.-T∞ÓÕ‹v¬ﬂÏFÑ[Mnón;çä]¡\æ÷ò∏‡QVéégêyÅz&^Œ¸ª∞kº:"2)$†0Û˝N≠‹ÊÉ¸&qÂKä–˜p6Çƒ>¢qÊÂg£HGÓH]›FÈ|ØÎùn˜9"f’%—Õö$Z∫¨xYNNÈûvìEç®õ÷ÑΩ)ÎÈeÄÚ ÍÚVYÛ√˜¯õ•J´K≤˝ÿ†e‘z´‘4jåWFã&„Ò[	DJ€ÅHLieŒÑ˚Õ”Hˇc·;Äª x¸C=RnÆ8F%Ëô≈´~~-yêLÂU¯Ö˙ˆ(ƒﬂÛì2ÓDﬂAÒ∂®~J˜.◊òluGQ∫I¸wƒ¡…ôØàTD¯µ˙≥Pƒüb®ã« jG÷⁄SK	|T©Z„V¶ìÉEsLﬁœWAWHÀ›ìG
.#Ëˆ"^Â◊h,ksä:JC˜T˘¢ÂªßÃMYê≤,ú~©Qì‚jÓ4´”–VÓ´cÙ§≥•]zõΩıí[Ú«ø˛g"Â_{‹g>
ete˛„bÄevªíõ-…nF‰B¥~ïj€`ì#6iŸM„¥Í«´÷*¢Âö’∂Î‚Z->Q7J˝Ïügi6◊NæIj2ïC∂á5‚ÊQúíS‡{<.Ë ∫rÊ~ºJ`5à`{Cé(Ô‚q\-¶mbd˚”]€œ√+»iöÑ•$≠ÉGÍ'˝áÔˇ˛?ì{0)É1ç)y@æ†≥‘%íöÛÑ]WﬁnFcŸ¡Ê¿Ä=lYÿΩë©øû.í˜EF~4ûY¯S^8ÕÅıÿ¸SÍæÁëøJ–ﬁC7èRãávå(∞ıˇÆg‹˚^8â±Ü•VÅ˛∫~ûΩÕåÆµèwk—?∑Ö¯X46`é*˜!óƒW
á¯¢+)£˜ΩàÜmgÈ@g·ÿ√L|‘Ï§*ë`P∑*©K6jLI“%'´ümù#¡§ÜÍen≠íüv¿W¡˝&êdA@„ÎN’Ö•hP§Kk≈qG[*hËQ÷√SOWΩÕ^ﬂ¥πÊ6ªO%A˘…Fô©t,«‚p˛˙≈ó_N/4ô÷µé;Éÿ≥ƒ"ò{&vır1aª«qÁóS<w—¸Û)„º]L‰F4òÍe@Ü©^.°0.Ñ‡`i’ú
~+hÆôµˇ¥z>ÿ }ªÜœ›ò”¿Û´KïTwbZ)-HHˆ∑n{3≈¢9à6z”€RÄàvÍ<w£â‚€–√mB•oîÕx“ÃΩ$◊†Ü‰≠7£’÷@¢X^®@°tCRí“!~≈”ıÉ'$¨Æ9«n£1Ô¬-œw^JF"æÙ.«|	’§=ÁÂ-?ùÉæ2†*6“ùé˙!€·Ï‰|p gˇ‡≈á9Ù;‡A’zN˝IÙ—ûNrP˜s<5èså∑u&Ûbßñﬂ_vtú ó˘lÚÃ2_dˇ±îSÍX=-ñ„Âd…3Ú›YÅk>g!⁄a´Áe¡òö#lè¥ 9Ñ·;[¸CJÆ|J√å˙vhãv)aÂ“Kßìò^RﬂA¶0ØÄ˝y9óV5Oç%(£≤¡π sŸòº¬´kë¡ﬁÂ‹`’%_$d∏öÁõS˚^^7Œ—‚;˘Ã"6]2≠ˇ /õAuroBëjé±ƒˇf‹˘∂®{äÊ◊"79`.lB‚â]!°7¢¥è}BÕì‹(|¬ÕÎµxâÌb6ò8;ãÚ16R2TÒóDP9aóÙ≠7í%∏˘çA_äZÜ≈2˘*µX◊k÷¶˝o∂∂ö·I:WZÓ⁄7KuwÖ¢(BúÅ•‡Nÿ≈Bó≤TdÖ≠ZåòSñÜ[nãÁ°SØ∫÷`˝:t∏=˜⁄√≈±á˙∫+˜⁄E˜I<G3˝lImØúfÊ(nrËÿmÑ6⁄Û∏n∫ôˆ$@ü› bï5‹¡@ Yp™BÁZH∫ 	— AµÓoS⁄£±BÚÀÕ§%2sÈÑíÿª§◊4-åpòL˘ÂVÎœ• ü[eıo˙¥∂∂∂®Qy	‘««bøÈw.—0Ìıhn…≠]3ê˙ÑÚ.ŸDcE<Ó6v@ã¸‚¿#Hã¸™êy+√Wùöq5¸kR3∑Ú,aıÇÅÿÙ?·Ïª∫S5L}üÕÈÍÇI«π1¯Æ·ó9∂'Ωl–1=ø™¿*ÕÚ~ÿìçoZJäOÍû˚Oªed‘ç¸‹ƒﬂÈy"A\X¿bÍO
7ˇé‡Ü`ûˇ≤ŸΩrÙ^£ªó‘{g÷EM]Vc˚?nï/ç¨›ﬂ¥«ﬂ‘ÆÏ“ûñº≤qówÿpr™ó;…r6r7™Ä	~éæÜnO-gyAíŒ1ûzÏ√r›Á◊s∆€˚ì0
˚Ûò%h%˚Ï„—ÑkØ?|ˇ/ˇsÖw@˘‰åçº∑(Û«NÚø0>Ô9d—£¬Û√˜˚üV\3hÀÅC~1iÓãÍ
™êﬂΩd&ﬂÌdjëîì–[È“ï—Øäﬁ—f€ºñæbcÊÕ”ÛËé≠¥◊µ—y çd>ÔúáI»ÑG˛ EwT
ó{Mπ≤kK∑”˘¨Ò…:ûtM$@S¯d?≥ﬁOØUﬂyÊ:ˆŸ1Q/ø–E°{a¯m}[≤Qö{ñ ˆw@ê¿«#Ìr⁄`ˆW,∫ 9ûb°Kr<Î¬:óò_’ù8]ì1~NL%'P*m¬5U∆DÅL*√Î‡^Ê◊Jé·U;ÌD®‡m∑Óq∆ﬁjÑH®ı–!u&œ‹zß√M>≥¿qóS¢uNLi8ÒŸ!∫•¸·|˛[NP=‘?ùıï¸R&˜nàÏ)u≠@µDY≤ï‚£QcwM¯ÕØÆd%≤v+bïS˙nyuÁé)ΩÂÂf™4ˇ^Âó“}=è#<Äc ›Z«^¢Sï∫‰ù‡sÚãıÓàÕ—URh@ütñr®î3z€Tz∫ÍâjHù—∫8^ùŒ"{ùﬂºqıéÎùD÷Â	≠ãà≠w\ó&∫v^ª‡[ªÔ$ÏJtä2@Ω
Q∆n€"!Ã2nq¥-ÎÏÍvr`|¶-û°y- ∫.ﬂ¯È‚˛‡Ø∂Y7¨Å^Zä -j8äÚÜ;•œ8ˇ–JÎÆ˝ı B[´}Oüy^?ÌëØ¢Ä≈Q¨ˇ∂Ñ.;|ı˙à¿ŸC/∏\ã-π°ì¿·Q°ôLÂ„ﬂA∫“ƒ8ÿ/ªQÎ∞¬†˛≥õ"„zˆ»∆CˇnÓ6w≥ƒ)®›ª…Ô›hﬁ™*ÖËÇõ #ìí†˜RFWT^T_èvÿÔ#∞AUâ∂$peÌ2¶sM~í:Êw∫›“Ã DÔ√R*ÄHoë»`ñÖ§B#Ω¡(a¿…⁄ªn}∫≠ËT;8=è^©Å@´Q⁄#
4 –û˘à òaiª`‰Ò`≠KÏ‹åw.”L•£#é!ãQ≈ äÇà˙ ét§ÿåó¥ÌæUƒó´1N‹–)Te5µÇ∏M‹V*{ü_aˆ˙95ò≈IØÿ™jU˝P‹á"èÿ∏àÈƒÉû˜”®ì7qæ<)·€îQøyD*p JUNúÆr€By}áΩΩi˝ßª-à 5x(Ù±a**6r{íî‹ı(∫˝àNÚ“S€∑ö≤D\„ˇ|Üx µMp8¸ÛU}5>›Èπ¥ÖV√ ÙïµGAu˘’¬<%Ô«Ql“öÖé`y‰,fÔ<v)ü<u∫˜ÕÔÙ∑'µ°ºú≥∞ó∆S>°î;vûì……∫Ç˝ÚÅ	€ëú_œëò˝(s§h1∑w¶h«ì™ìrI•#øà‚ ‰ô`DßÎØ·ü⁄ê0ävUS:Ráº¥C:òª˚{I≈“;G¡9iuà`˝““å¿ÃœíC/˚¨¨Ø◊:âÀp—õ ’Üπ¥x¨Â˙Y·≥èÂøbLﬁ™¨ÉZ∑µ\ÜÌVVÏÄ∆ô¬(+‚s€_„ªÚoˇ?   ˇˇÏ}[oIñÊ_	se™K¢Ææ©-(ŸÂRÈbï(m°€Ì)'…îò≈‰•Ú"[≠∞oã›áôfwXPãyÍá›«Ê}ˇI˝ÅÈü∞ÁDDfFf∆-IJñ\Ãnî)232.'Œ9q.ﬂÆ—∞∑^îZÜ\œt†\PKÒô˚ë XAYRìûÉ˜G4ÅNÕéË›†€∞RºØ¿A•∑j üq¥Êê©:ôRºãG*MÙ‹sÚX˙ê⁄\îõò⁄-∫J’¡ó‘C•ﬂ'èIﬂ	ú>˘ïÿí.…ô„á™5IJ)JÒ g=
.ïc¡)mù•H¿êì'Ùñ5fU=µ¶ú<Ø7Ôî∫ß7·òllqËËâ‚îˇe2eOZ‹ù≤(ˆ»NÚßÈπ1'—Õ¸v¯À_≤Í3oËÉ√˛i‡≥Á[¯QøXk¯B:Ä55UÃ¡–˘⁄v€+”R¯™å√>0ÿåï∏°O(rM&]K€Øfoûeî±wÈ≥3`CÕ0Ë+ïø©~1vímÎù¿ùj[Áü7òª'ŸàU∂·dõPæıœTŸszC¯çÔ™a75F:·ΩﬂV¶YH(åÑ1§π<v˙éG`Î≈lF4&˛Ê•k¿ûı˛îÀs“q¢N$tÿ™#'nË¿GB«Gd(4	Å¬≠d)◊‰
úÁ‘:BEE6”·VY ˛£DıñåpK™C<Î;m◊/uäßú«öb`XwõÏÉBŸw∆¬∆RÿÀÈ˚}ôÆ"x‡˛{Å´ U…Á<v€1iÅäEö†π:ΩE“j)DyıÑW)˛fíö·Yπp5¥gÆÊ∑¢f¯S!o±P!#Û≈¬”G™ ø{‰πù⁄ôπUÅ“+˝,w<›5}≤‘d|˙È“∂i¶≤æ*}¶~:"}Ù[%“T>ÔèŒ=yDœ]#K¥Ü:îk>q,»2°-U*’N≠I{:’'O«y®˜F‡“a’óˇ~µ|æHj5M˛ö E=ﬂâ›[¿E\~ÑÎÍTzv#}˘±jK˜«√“Ï)júj°qJbci ≈ÎkR´£™ø¸⁄ÇŒÄ÷NM]ëM∏ùæûπ`È›‰wäéLªªì£õiáo]=(X55‚∂WüEÏÁèŒ‡nË1//»Ëπâ€'∞7ÙtÒ4õBÂ6ˆlŸÍ®z^5TÅQ%«ﬁ™‚3yÓ~Hœ,`ä}çâêK´‚©G≠ëm']›UCÅ4Ñk˘i¥õ¢ﬂEBR(Q7b*ˇnoéòÇtÛì√…0r#8∑‹=3ÇÚQETK… Å≤ìΩygºÍ¸BÉ πß‰©l0![Ü¬-{√¬ˆ†!–é*;]	¢'•ø;´Ì{√>9vcöåøá`›Ò9Ö{ÆüÔ/Ëπ<±!Éú¶}¢wKW§˛f¬YﬂÒU_óD0-è_≈∏§*X/ä∆·ÊÚr7.‹∆˘htÓªçŒh∞|Ê˘Ór£— u:°I¥ÑRX	ÏèÒ™Ú>˙–oÒl{5H¨Oj6'≠mïe\»r,râO%”¿Xûíé˝üˇÎﬂˇÌÑﬁ©îEÙ‚Ç‘õFõ„v◊ √ÚπÈ€≈LÔ	∆˝∑_˛˛ø‰∫9ìqKy"/A∆Í˙e·lk §6i´Ú1î√Ø∞~Tu˝
I=¬¢∫
ÈáÎÿ^Ge(3∫’,öfÚ(π≥.YU«N;ÛlﬁCë†Ílñ„Âç≈<P:ıœJ…W¸˚GÂpˆIó„©l94±≠ÊÚﬂ™5+ŒänêrÆ’’\‡KRˇ,{CM.•¸aT
Œ¿èµ,∫î≈⁄µ^Ê´)NUÏp≠"´-˜ˆ]Pç¬àåŒrR˘∏jÑ‘SI©" ‡ÃC†V´Ü@°ç'‘D?eG9 •bÙâ0O†de‰ÅJ@åÖ®≤b<z™ü√èr0‰´$ÿ3¥CÛ*€’5ÑñLá*’4m~uπ¶ÁØß”¬&;p¶‚UÙ$ó Õ˛e€î¡X Tó∞Ä≤Î•Ó‹Ü>≥7 ŒíRu´<≈Y[PÔu<§h∏ç°†É÷ÔÙHﬂ2„∆ê5ˆy|ª˙Ë«ú–©ì¢‘^˘ºß÷mîŸ•JÄÃè SΩ‹ZàKZ´ío +ﬂ'Xî
⁄O5°˜=è¶<}c-ß∏2D£Éíy±@Sq5ﬁ˝‹~d'àvR{!:JÕXáÍñ*!GÒ¿LoË`£¶ÈQÌEÍ¿@f{kÉkˆa£ºÅEsÿ°}™ÍÛ’å∞í÷êíydÌq@ÌzÅ§Ó
R◊•Ná?gF≥,¬ˆ\‚Å=]&¯Z⁄H—4#›çii-+DùŒü$º›ˆ¡2ˇ«Ævõb‡ö:©vˆ)Ò⁄}πI¯"€Ù≈˝€§a]z==◊∏5î∆Já˙¿ãøTÑ†r,o$§∏g[ÈÿÏ3èôQk´ˆc€wÜ}˚Lﬂ¿ı∑j√—hå	¨¨{ÊAï\a]—äl˜§9]èíÏg‘B¥ÕÇ«>ëX4⁄⁄Æ·≤cõQlïOl√,Ä9l2ùıÏ—‹±¥+LHç≈Ú%&G®,ZS®wb≈wòBÅ˚(ÌÔ¨xT3.¡-x*…,`làYòEøm®√∫¸è’)-◊tôÍ–1BﬁÖnÙ™hú©S9gG!Ü‹qE°Í≥Y8îHÍU[I√Tr™⁄FÍYÆÈC„%è2«L*œFÀ∂Klé	jê1î∫<úîTÍÒ]ù>^Hñ/ò>ÜßBZÁÏ∆ü#'ñ´E*ß‰1 %1œ^™ÇıqK€}@'Mz\˘ÍåÜg^`»ù _ÔõÒﬁ#Õa+‹¡·>ı≥œ{Œ8ôè]03}ëû1æNã†ûÄê8Cwÿxoè®c·Z©©ZN£Ïb©//]ﬂµM})^,f‘2aÚÕU√/¢læ
NQ%Ñ":‹~U0¨j'≈´ˆCŸ‘NíQ∫%9SﬁIÒ™«4!ÇóU˙IÒ™íéRº“§∞d'äŸ`78Cˆg@˚;+'µNˆ™ôIgbPŒ)dÍ—N4ŒæªÇ˘$p¬ﬁ⁄§¢˘[$œõêÕ3:ëö0∑4ácéñCKQauØâB¸¬´∑r;·Ë#ÀØ„ &Œÿı´`dÖ¨ï#÷ *Î∑ ï≈I%r»†ühq‰˙ﬁˆ˘í|“»¿[ ŒBÖ˜<F?~≈ ¥úsO÷[Ic©OÚ‹=>x`–NGà/q0€'ü!éﬂŒs≠tæ'Ç—xÈ}Ç—JWé¢5G— °h›	Ç6€Ln¡Hvß	Jg4l∆—Ë5zª@∫q,·æ∫3wz;µ#hö”h≠aØ´úÎs8KÁºWF	äõíßL&§‘exT˙#æˆThu|∑8¨€Õ”É∏£AE£<–¬0ıÁs]øøò– ¨°©Ó√w8	' FÉÉ∏É†ï¬àßVX¶aÏì*(í™‡ñÃ˝èi@!2uI8p˙ﬂqÖåﬂ'ÃÑºI®ôj¸îê?ËDQéÕ°M–â…0 'Êè5|b∂&¯Da’Êâ¡'>HY8∫!˘À_twÚµª9ÒﬂÚª•∑⁄ä§ñ;à8 ˚£°ïÓÅ‚y‹g!°ü)qéO)iÎÆ‡Sπê-Je˛πI±*Û≠X!V;|˜q+π}ÄCŸ±?Êòï˙Œk0+3±vÔ¡ıTòï‚)ËSbVNª…e≠|b¸ ÍõQΩkT ¨Æ≠Ë~"Y
Í„…réd9G≤úíe∂±‰Øªcpl€„~É|€ Õﬁ¿Èíoú¯œﬁ"9ò£Y~f@Åp¢qœGÅWÚPSJΩÄñ–uÕo}gëÏ5…—woˆI◊= L¨\®Q√ªË\ü…ﬁClKôËÚ–jﬁﬂÚ∑≥=∞s‘bloIÔõ›í61;pK+#6^qY‹íé?¥e%òJÎô–ÇUû£nH9ÉXezÂaÚ◊ßXÑõ$=úV‹Åø9ƒ ‘g©¨‰€≥^•Å2âÏö Â$õ±d•R}B:|¯ªeÜ9IOŒ}Ÿ{ÇMv†`Ji<Tmv).…ùUNÊÄìUÙ¢9‡‰ß>~Œ'má˚ú,Jò9Ï‰ví^sÿ…O;©|ΩrÔ*Q)'“n¨RIªY∞ "D£mnT´QSV2B¥‹ÍäzPÃz ë:h%JW
ù%ß{bNßd˘`¥úiô"⁄ì˙Uò¡Ê1:*2Tô¢Uƒ©Qy‰/Æåå˘Tå©∆8§§jcÂÎkV“n¿≈W£l¥A†+ûW£cJìÀr´Ê–ë°j:™î∑(I≠å@©8TØñ1œ4=Ã“ﬂŒ0v0cû¡mÊ∞6È—ıú°q*õ™È¬~kÿ04ﬁ_†Õ$©– lƒÄ5´#ge≤ø≤+XQ¥ Dœıπ §Ñ	lñıi°4≥vÚD?MKâΩ~Ú6Úòa	‡»]C≠îùáS=µNhY‰Â÷2åÏ`-µøzFxàHÃ
gvU˛ H∆†‰®î˝œ,¡€pzlQ3- 	¨ì}Ôh¶ë∞Y∞ÕÑ6?[–Ãdls–Ã9h¶È¶ÍPàU8¢(≥x¶*¢f
:Sâ(2˜nﬁ´pÌZ3€P≠"N‹M!dÊıã7/Ã4tdL÷M"c ı°H¢œ%≥h2™SÒ6V&W*√LÚ‡™å‡'∆…àÎ÷q2S~7q2Sõñ5<Êì9<ffÚº;˝>„c
›/“”ƒ◊üfï|ö‚%‰◊Txä∞3π8’¯y2ãî‚5%“•ò°"ßôº¥N_)^˜)≥G˘ö√eÊÆ9\f·ö√eÍL´ü\fwÛ˚cr‰\",fHvú†j—1ŸC?˛‹!LÃ≤∑¯1)V%S„\‚Ñ|Î:∏ﬂó)òŸ},y¨'ˆ5Áq8°kR∞Kıp¬¡&˝å>( -Ô+Òï”\Íãù\S¡úTGÏÁªÁ‹›Ì(’Ìbxù‰îI,∆8Q°‚vúg=ïoak1∏®=ò∆ònw–v.©G~˙ 3ú —?U.Z[¸OBv‹»ÈS`Œn”ÿO∫b_@xv†gà(‚R˝¿â«±|:qÚ.ºnÏ¯≤7Í∫ÿL'/dH—±∆ŸP#¯^^≤∞ﬁ::Zc±¬tû˙£>∆≈ª–8>ÄzÇ@ﬂG∞'gÕz†+¨öò»⁄.q£3PŸ∏Ãè=vÑ9:ÿ·e=meéZ©ìV–¢‹bÑV‚ª{Å7Ï/…ç~∫#£˘àhi˚aß
hÛdtùâ»·Ï7l¿ºA_Îı–pûdçx·Aåè◊√∆ éh≠ŒóËûˇ&¡«y º˛·Cƒ…¡gËƒQvœ?Á≥é®dxàÕÑﬁC|ƒx¬º«NpA£Ò%=ﬂè˝Å,ª·„Ì¶^–õú·C† õ6hä˜bÅÉΩ™≠ö∫>¿ñî‹”ûE˝>`71ä
È\´Á‰Æø’v|ËDX/ı%ó^∆zfÓößûπŸûY≠	-Ú£]íÙ]Ù÷oË^c˙*⁄¶·+»N;NŸÛM®á∆âR§7ÿ$ŸPUO^/4‡ò’ÎŒ"iS>‚P™j¯#ƒn›∆N‡÷€Ã:¨Ï ÓÅKÂ"µt∂xº\3+µ
ÍÄKL2A¡”Tºïæ3 ˝ Xx‡9ÑÒEV,ÿA˘®3>ÁT9s*Ì√≈DöOÜ81*ÃycyÁ»ÜÁQ–ë‡À4ÉH8[ä˜∂·ÙNÜı«,“H8ªÊ! 3lH˛))3'Å∑≈˘UùSü”iDƒk=ŒØ!Ïñ©X{â˛§¢@5·V¬˜YrA<ù(Æ*å'«Vπí‡õ±P∂À7€?À52ÁÈƒÛ§z:=πê¶böâTï0“Â+“Ûkı∞lç˚l∫≥OñΩíúoΩ·˘Œ»«RÎﬁÖ˚Ω"álÇ#SZÊ`~jöüö¯5?5ÕOM…ugNM	£∫ëÉSj6LNM1¶Ω™Sì˙ÿÙR.Ù}xNº˘d9æ|Rmõ8
FÁz¡WTê‘…û¯≥7ˆ:t?êÔZÙ∆jJÉ#ûx†”]8X}ÑßVm'¢ÒŒ_(“
I)˜Ü[D>⁄3 Ú2Iìfúa73@ˇq˜)D«7a6Ù)©¬–ƒ(ò˙’6I≠Ìè⁄5ÿR∆◊sáı:ÃMC¥
†IÅ!ñ(Ìé:1∫∑äy˙ ß5‡Í5«Ì≈⁄âºÅFŒ Yqî˘Fıò2Ï›÷õVÑ@%6∑á†‚∏ıïE≤∫bŸ1 3[ÒŸô˜—"ÙDœüçèSl
g˛#-ïkÛƒ&yOÔ˝√Ü oø~o'.a£õ©rÔø?˛ëÍ¥?8°„Cª¬\√üÈZ]7Ä(Ì⁄«xwh˚Ùxüì»âßDg’NuTs0âÜ›ŸÑAòv≠3‡QÀ≠2Ú›ÜÀ@HÃùÃûÜΩøY[$ÿòiXL,	¡*Ó¿	—«sÄ¨A¥Éùæãm∞ìÒözñÃß1]°ÉJƒ©ô9Ì[ëø3)Vë;Ô8√'‘∞©ΩA7aﬂ„‘ªamÈTÉÏç∫ò!>:TIu∑ÈIÎÉ◊çzõdceEû4pÇso7Ío£iYõFrÓ:AÀX9[}≤Ê#£|ÃO«˚œËe∏_ãƒÆ˝±N∑ó≈Ü§¯ˇÏﬁj;ó=dîy~ıï≈îjGb+∆Wä⁄åô9öv&^ö›â(2;£·p#¬ˆâFÉoP≈∆è]¯æ§™©'ºi4Ù/ıÃïÎgN‰`ƒ¯ñ∞ù`˜aa?î5Éñ«√sócÕ±Æ·”»X€)í£a∫ñˇÿ§o¸æÚ˜¨µ≈eÂ◊¶g]Gµê¬|nï=;–]/g_ 7πn@Bƒ6j‹z“¯¢0Cã‰äˇµIl@˘ºæ£(~Ùé"A≈Q]$|PÍ-¸IÛ'DΩÀ˝Ëvb4 ë∂€q‚–%Ì`Ù!ƒ
˛XH‡9|R"Œœ›¿Ì¢;îhËõ9#Rv˛Z9ã6€◊Ë√∫zü9±™8ò™At…*∂©08*Á
¥]<—£,Hs8ä∞ß£nÍC80-àfµrmÇ/π%Á∆ì¢Â=PØ‰∫~/[9ÖSÕ∂p¨¡ˇ¶≤¸j‚˝YèÈa¥Zødõ"ØÈÌ◊Ô5KÒû¢ zñ@µÕ/`˚6fß*@º™z¢ö–E{i„ë¬´í◊á>êö-nŒù§MªÌ®çn.:Ü˚2h;KÄµÔ,◊∑â¸g¥Ö	}h™∑€˚—ö‹óÜó…üFÔ·é3){¥sùïQátæ•ÖÈºÑ‰d4Ú€N`Å†U™09Ë
&◊yiéA¥Ù·ßŸÕ˘–ÂUiû3ˆàœtπ#ÂÆ†
"ñO”πù6c‚sA{Z∫\Z!±ˇå}Z„TíËÕƒ˛≠b2 N+ò°Á|YâHßrÅ’ ´&X˙<∫™xå»»6¢.Ö¯àb‹PÑ£√›V£° ˜ÂH™£tùñ–T[˘Ì0UÀHD∞<œú2Xz™«Wïc£*5¡nF	≥ZÇ∞3Xóeπﬁ#Ø˝YòMˆ®Ü£>E¥‡Œñ¨H≠fÉl+Ÿ94pÎä≠S S)e
ßöd)q…∑•Œ0˙ı_˛áÇì™≥‘y1R˛ƒ§weuÉ—ıL%ªís&ïG´-'Z±´Ô;·Èâ7üXˇ˘ÓÌª…£¸Fcz,fN5í¨à*50êer‚!XÙ|ô›©Ä≈çáﬁœ±K'⁄ÂêS_9ïºôBJu¸ÎdÕ·£:_åu
ÔQµ™Ì¶<Ÿƒ•D•aî¿ä}/E‰+,>áºOrç–T¶-º\xÛ†«ûpÃßƒöÉf.¶ÚºPf∆aVØ%π+õ‰p4dŒl}.;Î &À⁄{≈Ùπ‹w»J^∫°w>$_í8w‚4ÅÚ°?Ñe»›`ròÚÈ]I€®ò0CTtLXr˚ÂÔˇäÄIÁ(ˇ†)•K≥Ô àÈ6Ï√>∆/–,.Èû¬Ç⁄íÔÀ[ôëG‹4Õ,-Å:ÓG∑õı€;¸tx~ÓÙ`»É6Õò‚#È⁄…h©êáAu	«Qnc·Ò}XÏ—Ä<ﬂÎßπY⁄!ÑMÏ^ÉÕï¥•ÙÌI˝ö#6J¿3ªﬁ9Và°ﬂ˘n/Ìª¥-ﬁ|ı"Àe£%›>¥„FNöÚ∫A‰§ûAÂ ÖN,°∂‚;àSgÄi”†`Ò1V≈`πq„¿≈ü™&çM¿Tmr≈L4sÀï)
√#Í&¥æãMªgrY„t:Ó8⁄‚Óáﬂ)ìœ∏Zˇt}wGh˛tåf9£¬ìÂäµlfô-'õé∑œùx‡´•TdLKÜZ>YfDU√µ¨X¶RCbÎ¥„èbk[,{$cöØ)ö0¯*ÏÙF#uY/∫¸∫1f˘„"-› Òâë±;Äu_^≠(H‹êGrX]Y)Ä5ÃÄJ‡©ÿ´tû*`4®ó?á êÆˇ§xÒ°
$v≠cÙV`ê9
‹œ˝ÄÍú◊q¢ëççK<c<ëó-X}î[',¢÷è 
P~ayëß<àû=(¡@MK´kπÇq¢7I÷ııY⁄T¡.6E{í›≤\¨°Cœjˇ*1÷Ω¡πÇ“¬†≥Uh[÷¥≈Ó‰g‹˚gD√±`Ò.‘ò†éíÔ§⁄CP0*î›— wÎ0i•–k:xs^2Ø¢=Ÿv√)pÉ©^Z–XÌå≤Ö GuæÌè:}±Gç8©ˆ¨ Wà@aY÷ù†∂o™≥Vl»S1…_ì⁄ﬂ~˘Â_39∑«UQjVëŒ&>Ùﬂˇ/û˙PôÊ≈üQœUbSÕVO˚Ùÿ¬≤Vô¬ﬁı˙Ò∞ö,Fj?˜F∞¥0R–j>°áÇ›óK´“ÊÍ≠b/¿"À≠Å†f¥ºwr¥†ô⁄Áaå@_6,47q®P%I?]|Ùòt‰ˇ˝3y¥∏˛Ï)|Vë7}≠ºπö.ü»iˆØ—G“ı¬1û!FgTõKrÁ™.π\mn•º";œo%_Ø∆ªk·⁄úIÍä⁄’:˚î]zV~œI<ùÍ®I<óU}ïï”K
œc¸ ßPcB	ÔõL˙Me—5˜qı∫+U∞ÅUUêÕÙ]—çGÔhâ5n7Sú7V*i
∞¥}ß”/‘T2N9∞A’æXeQ◊$—W3ÕÃºÿ!BvFmáõQPL˜—b√•ì;6È¡ó‘/…,}¥{+⁄B√èº¥äæRhÒÎ“v*~*)∏ös|ç¯Á%_y®Ø´dsÒ"î#h¬ñó—¿≈”àí®ÁíC©&†XGC≥ßç‚á√›¨e?«n Ûc¨ÔÁ‡ÑÂΩœáX*¬+ŸCÏƒúDrµ‡ïæ˚}`L2öa∏∫u∞∫M®:õıÔ∫ê,ª¯t´Ët´ÿÙJëÈU‚“5Òûöü,#“≠„—´G£õCΩu û≥HÒ*eUV≥á¶
∑KRÆ¶*,W‘´ë˚x=/"8äØ∑√&IWO≈^yxî«UMÖÎÇVÒvm⁄xÈë‡.cOeëø\7hÜ~fVIM@E∑X^ÑäÃ‘àR¨®ß⁄1LC–Y∏7ì˙l¸†#ú”1-íh4ñ’E(É}7…Kz©å3Ï*
ø•;ó@˛Ø£QÍ±Ÿ»T¥-•F'y…∞U^—.E´7TX–ÿêíKfK &¿ÑÏK≠A8Ò-$S¶¢…*è1?2©Ys4Ç]|âÂlñÏ ÿh±uê∑j€‹∫<F≤‘Î;∆ı•ãúb™Í_U∫¡ÎEy√•∆÷d;ct>2Ï	ﬁ3··%%>xá†4%Ω}ÏPãπ`mÚds∏JM«+ôŸs°]*ùlãˆ&¶Fºåhœ&≤cWŸ&ûLàYò<›rF÷T™ﬁ]<~qw} ≤xÃ˝'yŒ∂öœ·©yò6®‘∆JK≈…‚[!µ›“úàlILè2ìuÒú˙åïffµ#T;Ö"è…ÎŸ˜Q B«»›ŸU⁄§4OÃ"∂ØZÎ‡à46èwøÅE GÕ√óÕÊ°ÊHòEòG·.…ô˘âléƒåeÌKqëí0ëÈÊ*å€=÷®ıåmø:nÓ}ªﬂ‹#ß˚ªMÚÎ˙WﬂÌÓú&üèé_µNö≠]´iTzÕn1æ≈-R^æf¡Ã≠Xπäëkj˜&W∆«ïÖz≥k∂¸{
Óm‡›6ú[À∑ùA¥ÇG1mˆÏcEpòém≥'Â©	≈Î◊ˇÛﬂ¶'\-ø6)eöÙ‰ÙP∞çXó»∂ª‰KÚ:@›Î5œ	‘û
d∫LS!•∞Õs
€–>ùÒœ…2
·1SÊ-◊*â®≠≠+èJb»∑¡Í&õNI\∏]·xDí8/›Tî'#çáO¢‡·êE-Qì±BÄîó7“C Ú€ï∆ ∆ªÃEœcU˝8@≥Æ$«§¶àp«≤äÒ&i^–òæ≥ Öﬁ¡dtØß“K‡+ﬁ˘ãôËl~·è^‘„±q·Ú˜«áù?‹ö ﬂaR∫ÀòûÒˆâ±n≥î/l _ÿ(Ñ˙ÊŒ¯¸‹üÃ¯öEÄC˘ÏôÖ3àAVGty^òÂ¢lè>n’V»
Y€ÄˇW‰˘o7÷ê{ıíŸX~f¡ÒÒÑπU„al;hM4=c£„8HT[µÉ’5≤∫÷Yk¨≠¬Ë6Ä û<É6B˙iiÉ˝è∞?˚@√∆ü0ÿ¬èüêï•ßÀ˙¸≥q±÷[}|±¥÷Y¡ﬂ/=j¨ØCOó6˛\3û/√íX)ïËQ8U<ìÖ%?n¿è+ò?± Ú'’Bß˙`&©*`^Ã)éËKwõË—ù∑,ËŸ;B	%;L∂¿äF™naxzs˚ÙuÛêúú6wßS≈ÃSN95Ì¸&y…x’å
”G§∆∏ãJN@ôµ·œ®ÉT8)ŒTC˜ÛD~äZAàÒAf*ûÊõMÛ^≤© ã7Uah\#[+9GˆÇ§g'Äù
GH^‹ÿ–‘˝,› ™|πy>+5g3≥∂lÍ˛P‹nkvWäFÀ’ñèçS·|]ä}i˘úCgæ‰ÂkÔ’~ÛÜ]<◊…Z≤≤Ÿ™Ø1Éö›*o0HÀcÊ≈ÂŒü—GÍÙØ¨ﬁK c,1öÀÌ’˛h‰
*’pRç$Û¶QÈZ∞≤àuñãh%q+5/ÒLN”L^î+À⁄‡≠PãLÏÃä‰cz§≥©nh∑Èƒc:=<9›#€Õ?4è≠ÜUI;S=XÎ™çıÉÆ}®∫Y„ £G\≠ÿ 1nÆıXÖ◊ é›Ç?õ§”SΩﬁCCarQ≥ïxÆΩH2”ßÅQôfô‘6µéVèï∞‹ΩboÆZK‹y“GT°W‚ç)îVcS∞€æPw!ô®•_ qˇ\¢Nôn´4√à3?8ãÆÍ Ú_6ÚêcÖZ±B=ü¬Uåòü!)g‹»X\Vv´PkVO˝)ÜH¡_ˇ˜˛˜˚-qõK√ﬁ1§¿ÖzNo˘ﬁ}gËï#áî °ígèrπÜ˜jQÖôûôô4ekºF¿⁄0:-hY°ÊGi‘µm‚M·ÈÎÖ|ˆ©u=^ÚhìÏ;„Êà|Ié›æ3ˆ¢ÿ«≤örº>{‚^‘‚’W‡M∆ﬁä€8!iQ≠Sí®Tè1{Oe®xq¶ÚÊ˚Íü€·&¿}Í¥A;¨Üƒ∆%§3b–º1∏∂?PÇN|`“55óÛê¯í-ëÑù`‰#àòJ=QÛPÁ,ÛÀ&_<va5#XKX z≠G√«ÂàF"F(7&	öúXIñ¨-⁄O	x¸ò©Ù—ã4'X‡ù
ÏGß4.∂˘ÿlGƒ}&ÖËö¥4©¸OD®åuI@Î¨R˛‘9ÎyÈ° ﬂÿq|ó&≠Ò§‰5îÈ∆˛ñNî¨ \/%îﬁ”kÄ‹w)è?OíÕÜ7ßZÚ¸œwwz.úÒrdK%0∫YÓ≈FºD˜ÁL∂ÈÁ¥Kûo;¡†h]FªI¡ˆ{D¿/Ï|ŒƒK«7'\”›wº·íˇπGî'˜≥ÊªlÄs⁄5◊˜∆Ìëtï‹ƒπÇÉ˚ﬂ~˘«ˇ:VÄÈN$r &{Ë¿“≠'gO∏ãù=≠ U…Vç©lıE‡c¥¢·8 '¬Ò˘õÚ˜Íí‘ên	WÈbË∑‚éVîE{a19é¨Ivß¯∞å¨+3Œk-ƒ´ºD¥f(dÛFÓ«+E†ÿ2]H¢@ÌVAUŒÅNï´¬6cb+NÌö‚ìÙŒ›nΩ6∆Km`)t©3Fı§±‹äÜ«e∞¡‹ %ñI9ØòˆP¥JK“@Öu,»†‚≤ñ}ÖO-‡¥Piäùö∑Ls.Õœâa‚oø¸”_Â~ùÕ˘VHä◊öèèØ{2Í:ódã¥=ﬂO!gî÷:—‘€çê!3Q°1Ü†»–>Ä75#˝]¿Å~ÿ›Fæƒ_&è1ï””§4k'UiqVÔÌ˘Ã π8àTúL›áÂ'sÊ& ÕMw:n¶'… Ø>C¬ì3û§v?N&®¡;¬8pÉa™∞Ä˘€wñ3cDâ?€>FXø®5üƒC«C∏)Å(˚cÏ∞≈`M1◊‹®7Í≤’û‹3VáyP|‘p·ˆ˙S
Uãpj∆@∂ÕúaÏ¯5M	uM†F‡v„é[Ø;ùŒ"È0ê¶Ná|E:g Ç1Z$∆˙—…‚æ¢ÜÙiWWª)ÀKj\£YµG	nvÕ›ç5? AïÏËúõoÈÈöª;ÀõÓÈOπæÛMÕØ€Xıƒ÷~ ä‚â:òq›Sœl_v]D∑èj∑Ÿ˜=◊èù`ù«d∆n‡|¿eπÖ˛o˜c,A{«π≠T∑õ§Ô£8:áÏ˘≠Ù|œ	)¡Ïè˙≠&úS¯æ* ãØ$¥¶2-∞∑›ﬁëk>ˇŒ%)	,…&÷xÎ“ìtø™2√òõÑÅŸ≥~˛Ú⁄ÇfŸ(`{U]ãx÷›Ñ{]‰òo¶Á>ãRÍª¥—Ù-òŒG¡Â&©µéé¥»o<cxÅÀ⁄ç¡hıÆ	~ºtù‡˙ΩÓ—‹ƒngZ˜$5‡±Òè∫ªŸé¿õ˘ﬁ–‹<c7rp≥vÓa≥¬‹`¸qBF~<	Fjr(ó±Ωâ`âz£ôSodGΩëı
ákKé*p¬XÏ®8jGëKèﬁµñQÎúUbé& Ê®
1GUàY{WBÃå‚fK–(9Ó∂ZùøO§Ê›Ápc¨?uÇ€mùvÉfÃ~÷üFOÃtáàøƒ¯∂—h Ã"ˇf€4˜Ó≤w≥[m$L¡ºáÓÇñ¡∫”@JZhúª—	|®/Ä÷ï˛ÿ.˛8ï	Ò mj*Wå>’l√x∞H›GÃ›@˜ƒ?mÙ[˜#∫∞^Y^&Ó∞W;ÆØŸyh:›¥∑õíº¢læçù«˜•z∂≈}VÊÙtÀ{ôn∏9ß¬ÓÕÎÍõÖìÇq¸5©ÔO Íªr≤I”ò†êÈS–µ˙ë‰®®y5ØÒ†∫„˙6|¥)åSÍ†•ﬂ‹{Ôlöñsœæ¢ÑPÆ°é°©TgΩ°*≤%ø»Ò´£7«'§u∫}“‹&´õ‰eswˇ‰€ÊÒnÛP˘T©¨à9bß–mEä*œƒó~ö»g¨QÌ*xCM~–È=† : ì9=5ÓŒjéNÁLúõ2±;ë≥P´Ók˝I¸ˆÑô˘fa?ñ)&∂˛MÊˆõ›:)èb≥ÛÃÃ0ÎˇM≠^E[ˇÑV˛Yˆ‘÷≤?πMΩµ≤Üåﬂ”òΩ%Ω1õ®ª§5v;´Ω„¯ùÿßïT¬∑í-¸∂¨‡VΩ˝√∆Ê]≈‰aeÁû»¬=â•√÷∆ag›0Ÿ5lmÿrS∆ÑvÎ€≤X[ÿ™ıVjK˚tÀ¥ΩMzkÙ$vh[¥ùÌŸduÆbo∂!>¡∆L£/g¨¬Tƒ4aV=~Ëﬂe•[Õ∆¿}Ï\a»ûêüõå◊vfÎ{√∆ÕÜiõ≠tÛ∆Ë0Ct∫€2=≥WB?ì2|ZåÓPj˘zãC¬|)„Ì±–ŸvÛBR!K dôïO(Aäcc[ú˛Y_Nı∆?’Îoˇn·›WZXˆ§∆¬¥dß™ƒöXCÙÌÍ;‡"ßhÖSïï◊M£o—s°pËåA§Î{Qk6è»ÎÊ…´öêNãÏÌ…√o˜w_ë£◊í'eÂ 
“Üˆ‘Ç>Vm≥"(z"I	J64ˆénB1%*™S˙À1Â:>Ä◊ΩeMΩSM§pºÓ*ÂE+pr‚üp.Ï&VhåoÚ’ñ∏cdâuígVewÚuÉ$ÎµHÆÆëÌª`∂œŸ[F4å±p√Ôìa±?…ıŸÆPåVÇ1§»ıC£.uEfu%?x]X_5ºù±nh8P◊}ƒ∞Äîyá3B.¬º“¨jëR'*eØ¥ık—˘ô¸®π˚í‘wö≠oóöáßÕ}µsﬁÑ¸•(L?(ˆ∫TJ[πØ„1π Ÿ(_DTvÆ÷`]w_ ì∫ßÈ<o≥™âÃ.}·M—æ`≈ÅóE$^ìáå„U5l\ÚF„˝V•∆Tâ∆kÅ◊—÷‹t}U#⁄¢JL<ıCè¬ ë›°7!MÈ=cÜ+®ê‹<É–ä´ÛfÓü3ò¬U1\Ø"Wπaaó≠	:ˆ)x£‚9Á“’daÓ¿£OqÕ•3ßÎ—n¬¥òKΩıÍ‰Õ1Y&®@ë›√€SûûTgn9áÃ}epÇ›|™§vÕ`œ•ˆf‘KÁnRU!€RGØõ«ª{ën™7ß'7ø´ÇQËN≥•ò[ÚÛﬁSVπbÏöÖ(Âª€€*Czß(øö›≈ÔÑÌÖ∑ﬁŒK{7È{s“‹'\ØÏæ<9n∂nMü`{Âl“ü`w	3ŒzÓvΩx†ﬂjj3'€◊3÷“4?)Ìl≠x0pÇKÚùÿè»∑ÆÉîmkg√}°Çêˆã	Æå!t√˜∆˙•z+›ùê^«nñŸÛ=ÅﬂsBr‚˙>'1!ê:G03±Ω´‘£SÚq.§@ãj1ﬂ!˙s«⁄‹$µaö•◊©-∫ﬂ¯£·9¸â·¬Ô‰Z◊û∂÷¬¨FRúa,
´∑úx-≠íÅÛq	∏±Ø]≤7ë˚·;ƒãQï£—s§ÎA„É±¡ß»¥ù<πò`ﬁí–?8d[<˜»ÿrâÜÁ‘¨Ò–—¥«ÉS◊T‰uù>4ª⁄«æµ·˚>P⁄ôz}MK•ƒÜfÍïÂ√ıe
lÅÈQ¥lj.&}·sÜ>ﬂç˝•«2aiã5H{PaßEuBZ‚LK4áØNHs‰&yŸ<líov[ª{d˛ﬁ”Tf≥íCö∑ä∞§t4mZs≠ÀÍÀ¯Á¬`≥ÚH_\â±u/∂»
b'£ñÇz.˚B÷ô\&°-ºq÷“z
i˜§6F<t≥ÌtƒÃ?ËCËpÜ·g-KUﬁTÍ·*U#iı√¥⁄íèr5˘òi÷.*µ¿’ï»(
`:n√xg⁄•*P∫=i*∆◊[/!Ñ™Àm"ã∞¥jÈª|}·Ï∞öÙA–`˘íãµ}$ªØˆ"QØmÍ÷ÂJ»Ïı‚0%Ò5L«Á2%^›Ï.˜÷µ≥/£+Â√§]=«iÉ±Á£P· ƒ=s (/)∫«•C’œ÷!	∞¢=∆®`}{îé∞jŸ~;]á`nñΩ—P)¨Ã÷,—n≈s IÅWuï”ã‰¢=æŸÉNƒq·cwsÜß"sÒ%≈Ø»M◊ñvF~<í◊Ëo«*ô.º∫í,ÿ„Àî¡"Ó–ıÖﬂ‘’Íå}êx≈“uÍ≥/ÇÕ˙∫∫IvxÃõUW§<?AÃe∆Åu°π⁄¯∂¸xE¬Û◊{Kw0U≥Lça ≠8;h/≠∂u”˘|Á+ƒÄ˙=1úSÕéqq◊Ì8∑⁄∫&,hD™Âxö´Ï>i}qâ˝MÿÌÖ˙⁄µ≠££i ÚñÅúeŒdÅ#„„ÖÃDm©‡F@MÄ^f|é«
Òbü˘Wù/Ò)ò¶~ÒS’∫‰'»ÆTq}‚	J=Q—d)ùIÖ„{ª1Û˘lwá4æËV∂3§œ∑à›$Õ∑âÂ6ICõgªO∆q0ˆ›€ó"É?ﬂ#3t€d™πæΩ∂ôh˛À…I‡GwtÔª´y√A
k™egË7;}«#ı¬Å*‘Dum<õ&ZÜ‘Ï∑ƒÎÍM˚'∑5˙ÓeXWƒ˝'DLÈ-ê¶p4≠Q∑∞'=8{Zç…b#nª@ö6œE[EÑÎ9QjàPÕy_-6›Ÿ4éôœ#,o‡πö©§ydo;å	f‹ÖÔXZôqÙt≈a•∂Æ¯Û◊rA¯ëJBégc'UÜaÂ,ñGU?H∫·
FîtLvl_˙≤-t4˛ò˘6◊–“9EãR£}Pjv°ò•ãÕ„§BëˆrÚÒv_ë3≤’yOi…ı«€˜Yho∞ôÙbP;v¬M˚£∆*∆ìÿäÜêÏ{ Ïm^≈—ömó	@ù=>r⁄æ+æÅ;ÿòÎ»=ã24®\Ì:ËHØ•À‰ÉçÒ_◊sùÆAâÖpW´ƒÇph{ˇ<Ô[>åaΩˆ‚ßèÌ£ﬁ$∑®ãwôÓ∂&mbè%ΩâüwÅ›:Ï=I‚Œ=5»Jmª/'Ì◊`ÿnò∞Kô#˚4ÜŒÙ-ë·hâñÌÇ)ãAmÜSwzuŸHÌœ£ˆ®{)ˆKπØH"ÉMZó)¿»^’“/π…&<îÎ∞˘≠´ß62®(S∏÷ J«”"YS˜T•˙≤ÀF∏ù–x
T£‘—&ËÉ)∑U)5üô¢Ï‘E5PQõ@õø8 ‚ëpÏD8íªu˛=í≥èèÂî—l’]@Y./ª4π¢≈’PÈKºnNCM·≥Õ5Ω,ÓJYCvxÀN˜UïVºXá—πi˘ ñaMΩ“á3c¶ÁuªEã’Øﬁ(∆†≠µ%ò,/2ÑÄ/‡π1¬ºNÙ¯µMvª‡K⁄h∏Ï≤Ÿ]¸ŒÚbKÒ'U&◊&™W·◊ç!¥…PfxxWœ«aÌ⁄J{[´`L3T™›dì–û{«v¬-5Ú‰÷Y¨N≈˝ñÄò0ìYÎËË°ºéÆ≤+í0êµ$$ÁÌ(PtÎ´¢*¨Õô¥Çıa/´Û!^≤˘M\5∑4…â'ôe1Ì)?Õ…/UÁ9–]úÏ‘‡K≥Õ=…dÛ?ÀsÕ®:’∫*ÒäÅ‹ƒ\O≈•
Öœm”ƒã≠4T∫›.œJ«·@Mï$…4c∞ó–˙ò>m‘^f\Ÿ+Õç*õLÖ-qe\c/®Ì7ÀÙ≈Œ”Ÿl∞yÙùNøPd‹z>–º)†‡Lc›ú› 3ÉÅÌ*h™LÀ.sÂiŸeYçZv—¢Á◊ßUœ´)Ç;≠¿«jG
∆ı¯„´≠Z¸–πI®[≠Î`/v≠ˆvB@Å¶Áï œ9ﬁ«ï¶Ù9—k›ùÔZÂ«Ω—–ù‰Aÿ±Ì¯Œ∞„"FV•¥iE•õ-,Bœ‹à¸n∑^£õz)`ŒV‘|R´–ú¢ZÑÏ qó’‹q!´!~˚¥§qeY‹‹ í;[¨È©ÅDê`˘ ç‚\R≥(îù∞gIr´∂;ºOÎ*9v√Åg€àΩ‰|NÀ\e(¨Â§™Ö¸n;Ab∂È·e$0ÉŸƒ‡⁄¢ffùsã∫Ån"∑&v|	Ó{·4`m9t∂5-R{3u¨≠nRå!ÜYiÔe3'd˚Œîø£ã@7g√l∆O-aJ v‹è…wq0Ñµ¬È ≤RØrÄA<ﬁHZ“€ò ~FæaËÙÀ¿9„Yîâaûv˛ÉÛì◊÷ˆ–êlgàb2xdÓœ[ı∂⁄˘[K◊iº¨òflSÙ∆—ß®∑u˘ÿ=≥ÒÁ)⁄HúÆ{.¸2E;€±OA¬œΩûùÛT—ÛxN‹¿§ﬁNscˆ~Nf·Î¨‚Ì4N 8ìµg”“∑iÎ›¸õèÌ¥øˆp⁄jL2/'ÚP{Ø¶≠d£Ÿ¯6vr∫ÕâOÂœ¥ö¨ƒÎπ q{ZMGjsú®‡•Ùl©ÂR*b…€ûSdNV!‹÷Ná∑÷¡FóKn8SK%é*ø¬Qp»V<˜⁄î/_≥tˆNÈÓù“·[…Â[…È[≈öß"≠©}ø≥ˆ˛ﬁÆˇw*p%,kN∫˚yÒ°§ˆ–mıø
M›ûø¢µ\ïë†9ét¢©‚ºõ’»›Â≥tÖŸ@øD{&NâŸé≤
ôUtJLÍñò 11Ωk"W•´™K\⁄∫Ê≤k:èDRÙgbáƒ‰.â)ù”∏%¶pLL·öò⁄9Q—=Q’A1cE%'≈o≈M1GEW≈tŒä™ÓäJûo+óÖ’1÷®˙$§—uat^Lù∫C	kõi@ÿ‹õ†ßçfá‰ é∫y˙ÓÃ&/Û-hπ Åﬂ)«É]
Ω4Ë ñQƒÅ,$áµ∫p|ØS0˜D$/ºwûà;‡Ö¯vœ‰œÁ°(‹¡hÓá`]ö•¢Ã®Ê~àÙ™Íá0πë¬‰ﬁiOÑ∏ÚB°‰OÍâ0ñO.åÙS{"¢ﬂ∂'bßÇ±ö∂Ïöù?a
_¬~ÑÎ[4•›gü@%k.UO®Òü6}«ÕˇUˆï¨ÿèï@˙ =1§âFèVätí¸ÑF3T∏‰ÖÕ }x9˙0‹˝ª™±ëôV™v∆«+dP‰™JÌT0[‡E´bUYäJ[˘-¥/]Í|—üzm¢e=£æ˚9ØÍ	ñe∫…UΩ!	`›£:¿ßX}â∑´kÃ∏ƒCLﬂ´1<l8ä\ÀL∞*ñ«§Â 	ø7=≠WÔÌ\v_®¯{ÅGÁÍ›¨-`êø™π£π+–Ó∫#Æ@vzõÿX1ûg6Ó¿äßª¸5wZ_sw†˙öªÁÓ@Èıπ+˝§¯°4◊u^ÓKÙ/n…/r¸ÍËÕÒ	iùnü4∑—y¸jØyD„≥Uè}íWà˛t·ÉÇD≠∏}‚¥ô DKõ-a4Lπv]%ñóó	´4í/…Œh0é#áÇKïÓd÷MˆÚ∑oÊMù¨àh®T X^xG`=l¯À–XÜ†˘o†j†ﬂ„·
XxÜ5!ÉŒWÈÊX ‘‚¸1ﬁE˙¥éÎ√)©'}ﬁè˝ò◊Æ>ﬁnz?Ω…>îæÿ;#u6U–ˇBbµ=s¸–Uww‡Dùûæú.®”ÑFk<¶≥’f¨∂Vú÷§ø¥RT¯ÉıÍíÁuì≈ﬂæC[ÃﬁNˇñΩ=y9~)πYˆ">πqBﬂ≈7óª^hÄ‘àÍugë®”ÿhèp;8Œ`›åiµÖÜOœ¸˜z[¸që†ê;Ò’]$WÑWP‹ƒ£ª2ûäπ/∫‹$±§€CÖûÄÎüÎnÉïîƒü43‰P[e©ø¯•‰≠ÿá`|¡•l
Ê8>“@y^†`¿è027d0ì[‰≠§∑µÔbﬂÉ©´5œc`(!~lπcê¸mêÔ«õ~4‚A{Hæ~ÈÜ¸≥¥Qgõ∂˚ç€íœ0}hY>˝∆•?|%Z¿;…ú°±ä™lF∂
Û¡ºG¢WGMn·∂Á˚∏Y⁄¯o¬J•ãe∆($ùYH∑ì‡G*âÑ¥¡dœ˝¡u…˛T ‹s7jv`Áº>˙ÊAª'l‰¨—Ÿiÿ&X √›ßÑÁ·8ù(f<£Üw u„ºƒ°ˇRÒ¬◊(]ı≥Ò–æÏﬁïRﬁ©”ﬂ•è7)Å‘€ã¬¬,ËX)-˝ÖôQ‹;˝¿W$e‰Bk+¥Ö⁄
I<≥¸¯"=ô˙tJáöıä˝ìˆk‹Å5ñ∂ƒóé˚Ò_êIM`+˜ÙòRØ”ÒgñÛm,êﬂ8µ®Ù^8ZJxF*ë˙¿5∆õXäNIœCjTBq¡»iì”4ÅÚ¡ía˙Çè0ÌîñËC8◊~O¬ÀA{«j÷π~Îru-õ∞<On /Âtzı∫Bîuæ-Óú%dXl+¿ñÉA7√@qp@±4†≤î–ü%õ[cZ…ÊÛÌ‡π0âãÈƒ‘~˝ó¨Èå‡uM\–™$]‡K0a'¯”B7∂ÕùPø)aiåó¿´Ï9ç˙(ác~ê¥©ßv§)Q
c]“å’b¥⁄˜Ò˝ê[‡÷øO5Î“ÔΩ”ÙåÓH´YêΩY™Ü•*ùº;|ôÂ¨î≤l∫kwêﬂnÊπô¸úZ~∑¿	Â˜≤Ö‡wsQ†ªø(÷4wÂç¢ß≈∞≥í˝.YÈƒ≥wÓè⁄éítŸ†®˝i$_›Èt	ØÏNY%|“è”∞ôâ,îÏÊROOSÂeñ}5.âº∑•Ô4H˙2«:úZè(¡’Ù›◊«2µn'!qÜ]Ú¡ÎÇ‚jZ#ñ*ß’öÀFO!<ﬂ€A◊Æ(3‹W2un$q€Ñ¶E} -bÕ-äÂV´•$çªy¨Æùdnyæ◊#ﬂπ√üú·˘¶÷d8Q=$âµ9ıW«˜Ø‰ÍÊò¿¸ﬂ“£8ü‡û‚û’ﬁ±Û¢·[˜±ıÏ—x<h‘Ï®Ê˘+¯˚®Ød%¢£1ø9Á+.÷^.‰$—˝"ÕEo¬6~9ïëÜ`ePˇöd¨"≠cŒj;X=ü∏¥≥R
á47dvÉõm˛H-ô¿¢Ô0Ú÷´É”&9Ÿ=|Ω◊<±yfìºﬂ{µﬂl¡⁄ qªmÁYòA1†{ÕOú^<$Õü∞û≈îÃëIMÌ€.?Ü=[6ıËWXGò7<Yw5∂¨‰XKˆÜ∫€ °	ÇºA;°˜@Èªìœ«_O †∏~ÆNö¢÷fñ}u6Í¿π`G‘≠âß˛UÆ’ßeGhÅ±•Yd∫=f»ìç±uæxtèø‡€∑˘ÌÈ!i~◊<n>_f∑$ô#ÿˇ∏¡¡Ï$ÔïP≤!!(˙áôQù4…ï‘É›XLºÉÌáœõ}0Âäﬂ:˜<>7≈>ÑW¸÷˘áÄrúÑävKΩücó.ç[ˆ!Â/≠cDºÍ?¥†ºLŒQã&‡e&w©)r»B¡x+ïM
ö»\·±î∑‚gõia⁄Ω›¸2´ïûã’˛X˘òåGÙpê—≈#9|_‚–èO™ÖÛ˙SNÆ”WcﬁöªéœõkRW-Iû¬Oï íñòÂQøtÜ9p¬∏o¨lcU√Z*ˆdà?b≈6.3àÜ˘¨{ìE˚ZàEc1nõµNDâ/±D¯b∫uR8Ú‚ìÁO‹ äáÁÁŒmìDö1!=0kÁ'¢£Ri¥ŸZu*≈oSù
√œípm!ˆÃ0(r≈ñÏb\µ1≠fSb≠}§Ö‰3%MLJ-.%>¬Tπå¥$ õﬁ≈ÖH&4RS0Ô_¶ô©:ÏÜÅø¥ÇÚ˛]W/™ñÓda©ÑÖ≈Ruô¸Ìó˙Îˇ  ˇˇÏ}›r€HíÓ´Ts∫m™G§D˝Y¢,˜–∂lk,…
ëû>=mê Eå@ÇÄñ4:ä8◊s≥±1ª{q"&‚\Ì#ÏÛÃÏ<¬©¨* †˛ RîÌ6'∆M®ˇ¨¨Ã¨Ã/ˇÁøˇUAö:ãÃ'‹e∆"ÿ+?[ïÁ»Ì( ÷+/rÈ«π&ŒïXeàı¸√ÎÅ„&ƒ?Ωﬂ∏@2/îöEÙeíY†wAÌÏ’êæ|Ó§,UÄ≤R]ù€º¡ù1|í%<w÷ÙKYæœoµñÀÕ˚X……≤rÚÀóÀ«!≤ÿÛ-;À»	Ò#BÛòìˇÌØïŸ¯iBN,¿ˆíË2˛æƒµ+]+–∏Ó\´·kô´ÖyU0ìÌl<—f‹Õ~∂øj4•OÊã˝n4Û¿/ûÂI ^ø$s˛^øÕ∫0/D¢»ÊÇÚöö·x°qd†ÔRCÊêû˛ë5û∫ê¯$˜KÔ<4aéãVdÕ®GÛ%ﬁ¯9I<¿Ñº6¢#9#‘:À”µiu∂
ìS∫W.8∞∞k‰
§RÛªÎ4»jöﬁ™™‡ÍB«¶ÚózÃ‡:⁄¸ÇY~πL'™^√›õÿV`Î40·’r≥h|eHd_·øãn.•1U~,i/úEÚi2$Ì!MØö){Ãß#N˘†,c•∂˙ÏMÙv6¸/≈TV˚ ]ıÊÖÛ
ù'{µKÁEπ˝Ùó√À&PN€¯b(4”ØùDˇÒüˇÜuc¨/”„π—°’óÁÄ4U2%F>}ÿ≥QóûÌLh˚~Õ¯¯˘äRπ0î sg∏vz‘ù_∑®@6G%ÛÇ\û˛E‡Ñh®<ÈèA¶Z∫§¡ıi’ôì™>U…“:∆Ÿ¡€ªOF3£+¿¶˛Ê÷ƒWOÈÏû˝‰\ﬂMä$æÏ∆ık]Ÿe€s›íππÛü;√˚asHGrÉúëîÜ ≠
Íhc «˙KÛ–éÂíÀ$Éü∏Ü∞M’”ë+†
À§1Iªå´]Nüyˇ#Eœ∏œ1l!Î9ia)]7Oˆæ .uçWX˙Õ™Ï±@§›Yk‰⁄x™J◊AÉ%^G9ãèìQR†{Â`Ë¬Ë‡–n!#µ—áoo1Éª˚ÓC9‹öge!7Kæ.w∏õ%ÔR2‡]/á¨W?{”_jı€‰∏º[ªÕù∂wT32œW6ãîÒb.ÑΩi“MÒu¶C8üﬁ÷ê1Xﬂm^⁄òñnìB‹/vÓyF2≤‘rÊƒ0º÷ÔÔÅ°ë‘†™pâCc(Qré‹≈ßi#`¶§ÅÔy÷TÎ§T…2¿äƒKc+Å¯ûh√hØ‰5Q∫!ß◊DˇØj=H+PoÇv∫IOµyM
|˜JXn`Ü√0aCÇa 0Ω≈ö0§Ú¬ ^≤ /qú›∏Ñ¢4¢J–¯N<¶üí]5vkœªf#TªƒÍ&3õ‰m|o5˜ÍÛ6ç‘`ÒIZ!ÙõE`Ö®ﬂ&&>Hú”¸vÏâ©≤$ØF´U‰≥ÛRp,”4QÄ≥rkFÀ5>ïÌ+Óß˘ˆ@EùªAQŸ|Ã(c=y”¥m åÊC©™àIï·Yf ≥W
`è28?0d3$—RIBËÚHXeëQñ7√á
CÄñ høyçH
3ösÍπjlcÖ7´ÓÚæ£I&ﬁ¯á›òπõ:éc0p¨ÙéÔ⁄‘X˝·ÓŸ?˛ÔﬂÓ>ùõªQhY≥GV>ó„8vÃJfé¸%ù∂]¡¨=w¨$<qœó1m<∫◊C—®íyÀÊ30"∑ÁXNsD˜˜9{ıx˙8ƒ™ˇç‚	NŒ ‹S qˇM’!◊¯≤a8õ%∆QüÜ<õiÊEKêπ·BcÙÒLÁsÊöí!7∑ÕÕt$¿BÌÃf∂ÀÅ ?RÇ.Óyõh•nêQ¡RF~Â.h¶ŸúÚÕ˜[˜‘"IËËµtªR∞ëûºˆ¨P‡
œÃˇøº Adzd§∂Ü'LƒWÔÀ(9Î5á;ÔxÕüÔ…1ûÌhÌ/´Ô≤ER∏s,œ§£MŒ„ÂTÊ€íêË‘ü4:ó∏Ûd	†€ä=Ç÷&~(alã‘æ#µ„?ﬁüæÓú.
Æ=NäY≥ùÍv4ﬁ±„,Ã_1Ÿ?;LˆxÈÊfTRù=Æ¬¢]PbÅ8ÌRF"I8vLÍœo∫4ß¿ä7õMŸñ¯ôø:òb¡˜õŸ¸0®Å¨‹O%@âÿ¯öS•]îuO»rPå°∂SÂ‡" ≥S‡◊ŒÄ¸°Ï™ÅÉ1ô|ˇ oY–9≤LXHFÿxÿQ‡{• „P§-£¯	ÍﬂéøAÍ±ä∂Á√*Íë0ÅhπhEé{/êEÇvæ‚›'n04√≥…UÛ§ˆågÿ9O*U≥õØf∑R5{˘jˆL™˘¨PŒÊ‰Är&öÓïo|≈;˚äwV¯)ıà@œD™»W‰3Ù∞»gö¿G≥†«,2p†ƒ“°ºôH·9lä&±Ö»˝B…9Áûë∏1Ãç%aÄë20“>ë¿A§ó-ñÇäå@§T¶äX6ù1Ä™lñ yëq*5£í‡ÍR2{Ö∫T—x†~_†¬´»¥˚c¢ì∑Â⁄ø*©˝®`∫?ÔÈeÈªs>(ı˛Tùyô˝"pmˇÄ’"l¥¿ ë˛πYR%‰b`=)⁄tZ eòÉP¿‹íkE9T*ΩwΩŒqz˙¯›s¸˜´£„ﬁ·˘·K≈ÆV'ƒ„¿‘*9a—8{ö[˚‰;√Q ﬂbW@Xny)î§ÁX6L|§ûÌ:ﬁ,òç∆O	çEÆ¶Ëaﬂ	l+¥ÇK¸;e\(¥¨π∑‚X A…~q~~¯ˆÙËÙ5¬}‘=BıŒ€ﬁ—+‘=ÏΩ;óKÎãßo”xö[¡˘«â>Ebæ’úÆäÖÙìISh†
¸k∫#ûe8úOyk£uï⁄Ûzi.€≈∂ÂYc÷´Ø€∂“∂ÌÙ:¯u;«/ﬂ%'‘w¨Y§≤>¬k…[DpYß› ⁄ù!;`´Ôò‰YgŒ∏o]∏Ä°fE>_=€OO„)Q)a„[ƒV<*{c˜IÄ™n˚DÛ[fÚ”<s(®^Ñ°Á≥À:vÏ
`7£nv c-•Œ¬Ÿ$#3^:SgÏz.|ßÑ[™‘J∫DxË.≤]‘=9√üfCt˙ùúÄ%ˆ‚Ì†FF‘É*íßy¸ÂíöL¢0óéŒ$FVÚçb‡ÑEÕÇ2 Ë4ú”‹G]≤Ö“˝™ÿëBcÕjª¶sä6à+\∂—≠Ã∞Go+í‡B◊æ6ÀÖe ∆SàgNìRcÙö-∏(¯‹‚CøE-ì´#W˙R¯@f],Ö4w7´‚ ïƒ ößü≤‡K£~V√˝ôªªö∏ë‰ˆ«hÊò…8≥Nrye¡†&ÑòFaÇfen0£˙¿›Eß&(Eí¢Wåπá´]∑≠~ËTÒ€&ùG€ü8!V©¿≠ö,>¯_€¯LmBê^ÇÅ'Ú7ÏÂƒπV›ΩD¡ç‰çˆg
w¯∏mV[3úznTØ5d7≠–4)+„‡æôtÇU#.À\ê! ô¯ÏJ÷9çíñΩê∆NÀﬁ`’≤«,ŒZZ⁄QTMb≤O=≈”$t\ˆP.{%	3óΩêüÀﬁHC“Öo¸¨Z>€∫¡káI té&•Öü6~^E≠u	…pÀ«£á?Â*h—
Pµî≠C∆O⁄<.¥.yï—‚áooqgÔ–∑∑§M¯BÜ~ï∫CpKGu'dbÙ4^dwÁµ5¨.N±ŒÃ|oÜ≥	Ònê∞å'z≈ÃQù(r∞vâœåcˇ"L¯ÜîQxNÑ<¸Ê—Tuﬂ∆/[ô*í¸ñ‚Œ]ÉÄ7aV–3\?≈.7‚í‰ÈSˆÙpb√3aeB∆§!XÎÉëÒ÷Õr¨+Göb'êì:N£2'&ÆM3á„Q≥¢G“<*“Îr¬·YÒÑπN∞.úà¥€#Ïæ?∆˝éøj;>"5YâÙ?#íïÓ∂7¥“‰OiW~H^!r´ÙΩ6™—∞¥ó.&ÊhviMj“âaì'wi6õx±‰Çõ	DÒrµæàr%\Ö_{â∏ñ¥ÕÊe¶∑ù˘KVÊNº^wbU¬¿DIàæêHqa—Ω÷ÕSkrÛL±Eck:∞≤[ŸÏ¬1Ñ°I…æàÇô0Ù*Y{n/æH"ôÚó`<qÃñ àI√óÊãßCÕ€ÎÍ#V_•<∞ÜãˇzcŸnê/®ÌÒ»y;Ü. ©C ?§°=ät≠K7ö≥§é™8˙ã;ô≥}®¢jÛojÕŸ<TQµ˘ûx÷∏oÕªI= éHz2DåEZKBﬁ≤ªæÃ_ù#Îµ¥0ª∆3∑6ZóMÓ£–EuçV∑òÆQ⁄’ıL‘RR–	MÉîZ´4HJñoê£œE-@Ze©EâÓØùâÄ8ç|∞$Oê1˝!≠1/¨È#«¬*E,J‚…á"·‘∏C◊a∆©ÿkÈ—+‡SüD`&g‚zÏÄ/πÙü=q‚ÍS??µ¬r@˛M,≤f„»I(3/“–Xm˛]»∏ŸªÍ¿qæøIx˘nqÅ‰FØ ¬…·S-§<.9óhîH1Ö)»ãÑ¸Fóo]¯f9yìƒißAŸë≤±p∂—˛k˝NΩO~\QiÑ›y¬œ‹Œ(®:£ 2´í÷úíÎ¬	11 ©DüQ3j÷*1â(¥œTÀàunqE¯ÖuUŸ≤˘ îêˆ1˚P≠›fg%Oı 	≈"åÂ µ-¸ê|mÜ≥>µü÷◊©Q©ç?÷Ó£º…Ç|}ö3gî‹õÃ–¡◊¯,c1´Oªó%jJ&»®XF¶o⁄<πß‘-ï˚W4~P]Û
©Ø´»ºB"òÎÍÎò◊G$m]}=Û˙R©YÓ¢iç»ŸUD⁄(|2åÓh2,bÜJqìø@ –D"r√≥.q∑îÊ‚)1„e;UÏ©i«∆I°i≤Bá”;Éàí01∏F¢ ¸ ùg„Uîò\_Ë∑àò`ö$V%ÓΩ.ç¨îxÌñÍ;… -ûÍª¢Û•Mû’û I,gÏ43uñ0tjÃúÆ›÷nHÑ&ÜÀâ±-tP¬¢ib¡l6õÍ7Ò>4}õPæîã
~”&Vª∑’øIîº Òëì‹H≤Ó±Õ¯nN V…´§&$É¿ ƒ˜ºL~U‹Ìf™KÔz"£èîÊVï‹.õƒ¬oR√Q¿Èæç∏.«èY€s‚@ªˇu‹Ujœ0I[Òm˜ùÒB‡—‚Â™ı\€∫Dña‡.M|£g∞{c]ˇíxΩ‡oS £h Ó⁄ÈtäÔ?¬eﬂ(„˛ x¸î<ª{ì∞Ì‘pÕÌp0r∆VÿªÉ¿˝a‘¯„∂?∫á˝ß∆J\îp Jë8®ç¢h⁄^[ª∫∫j^m6˝‡b≠wæv~¯¢˝ÿª÷<ï;Ò=˝¶—¯	Ø…>≠«°èˆ~ñºáõózê\∑I$Âè~pŸ˜˝KÖ+
˜f8rú(T∫Êﬂ÷83^∑Å≈=£Q◊gÅÉè–ç}<ŸC]I[ÔÅ≤¨»K7úz÷ÕÎ¿µY#\”˘\ñkﬁ7ùÜ‚ª“™3Ø Wø&[¯ßﬂ¸Ñïww¯s£!yÅ‰#ìuÄ˙CﬂÊ≥À¥Q¸mü˙è≠±Î›¥Q'pÒÇ¿?∫‚”g∏/≈T¡◊k./à±ÍˆÉ6˙Õfwc∏≥èÿﬂ$úÅµrÂÄÔZÅ∑⁄>ÎSµ¶◊(Ù=◊FøÙÌmßµè¶ñÒm¥;Ωﬁß~mñÁ^LpøI¨Å¢Wv2ZuÕ;P≥¨ñ&¡«5Qoq˜/x∆Z[”H8Q˜‚…h9õ÷Æ•hhÏ`6õmg⁄QU∫ıd{{gOQ)»∏-5sÕπÉÆ©›ZŒv⁄ÉıùÌ·÷éÒlHõ…›Ç∏…æc~&∑÷≠·¸M∫pë lqË7O“˜6∂÷◊≈§[™En$-:Œ◊‚^´ﬂÍœﬂbî‹àõ›tvá√¥Ÿù˛FÀ⁄ù≥ŸßkRFÙtMv4>ï;U>U˚SF¡3‚#Î{ïuPkm÷®êwP#{∑ˆÏ∏sˆÓºsJ—oèzÔè;›#tv~ÿ=<≈_∫G›;®N°qˇ˛‰∏ÛfÖ8í™<EU≠¬FÆ=#·4ù«ùÛ£W$û¶s˙≤”9]@≈TpPœÇåF^}{+u«ÃWÓPÿ¥ıbªﬁ›∫˚#¶Ê Ω∆˛K-Ì–qπÌ´ñµÆ3ûY(≠†Ü5…¥äb—ª’z˚Ã†î:(„©&®#›ê∑ÙÒ5‰5„Px€(j^LÁŸ‡mñ˚¥&‡)≠ı˛ﬁn+wÍ◊û—{Ì:Ÿ[s‘.î)n#«GΩ;gÌ√Ì=gΩ_®ù\9◊èÊ¨‹n·O°rrΩ\ÔÃY˘n{ òóÙ∆∏ﬁ3i·5ö≈“¸únµÏ≠›Bü¿FÅŒ0°ˇ
 ∆ê±¥9ß†Ô¥66Õë1jS2uò÷SIÄ¿âV¨úc¶|hFız‡_•aWb%ùh¡ø´»JéîÑì‘‚ú{ﬂ&K™¯	(»Ê+Æç…\ØÙ i?˛”ü~˜xøV¨Eõç◊ø©À£&Ï=î‘ßAK[·t¶≠Qâ8€Ê”¬T∂ÕÓö&Rj∂ÏëiY"ofÀvLÀ¶íc∂Ç^…äâ¶(R∆5í{†äµÊYçº±EuŒfcñcﬁlO3Xﬂª˚ãÌ∂jÊ†	aRÑ/=]ì√r}$≤[àYµcˆ=øè–ƒπBœÒ◊˙OP≈œ´Ü–{m,Nßû; N9k'vs6àΩn0ÇPåË`ª¬à1™ÌÀ, {„˚Û„Ê p∞‰˚Æˇgg·øÎ–KEAœù\B‹ë?òç…Õ )~Ë9WΩfâç¢P™9
ú!.äõñæb«hjx-âôÌó¯`˛ÂÕ/›_é~È¸“˚≈Hä˛§ªT~¬Ús¸k¢/‹˝Ç’Ö¯W¶‹5ØΩPHç§ÀÄ>{Ã¿ÙŒGˇíõ^<˙RfÛ¨Ò˚E˜_ñÒõ]ÇÑœ˝+ypY-t¶˚í∞ßZymWVìXÖïº˝Å	qâZóRS:3TÙARß.ñSç4DI´5Ÿú˙˚X)€O5Æ}R˘~⁄À˝DØŸOtê˝X_ÿèe˚˝åæü≤˜Â±‡^Ö˛πúÄ9±ïàô–‚±;qÅé§e∑ìjµZ*
÷j5…2¿´© ày≈‘≥N}≠∂v±ä◊jèWÓÙE©$®èóK6EÑ?’√ÆÍ·ëÍaGı∞ßz…Ô|ÈÂÆî•≤Kπ`K …ö”Y8™3Rj˛WVØÌ◊ƒûu (πÁÔN0%÷˛4{u¯Íï0RX"[@¡ﬂ&›°=¯”§∂¢ì7¿ÍπÜãeÂ1Ô˝u9˛;óÑÅ'¸Å%Ç2}f;ˆÿù§1M_¢¥A ƒ\‹ø¬√ª"_ö˛‘¡;íwˇ“«áœ•∏E‚Àï◊åÛçE≤¯‡√p™¶˛t6‡©>Ê5!dœ16&ÓÅÙ∂˝K†˚≈é8å|ﬂcNÙè#æp£õ»—˛]2ÈGæU√Yˇçc:S±V¸lDëÍH›gŒƒı,¿¢{ãÁ‰0∏—sw‹w	ﬁ–#,ZÙ]+¸≠3‡úáäf≠Ê	∂K#MgüCÎX±.Èo°ã:™∫mÛÉPT+{BFcÖ≥`fMV—Ô-Lπ=w<ïz˛ÖﬂÇJ·	©QQ»m‡N-Ÿ˙%œIEo¸ÀnŒ•ÔY#±◊Ô™Ÿç`ı>‹„ïäê±Ò1.Ñc“~,JÓmà–∑¥æJøwπÔG‹˜˜Ωﬂ≈ôÚÚíf /Y”ø=@AÛçxs≥ëW∫äWéË+GäW:Ùïé‚ï}•WZ(!ˆê+ﬁP∑•tH®F∆ö[…^ÀåNÇÿ
∆[—=n∆Ò†Ñ
¸>g¿ÖÕÙ∏Òÿ¥Õ˝1¿Ô•µõòaUS”Ω±XT[¶K•,ƒäyMú$∂ûÏn?ªæÆMC{∏Ωonf6ËAÀﬁrÏ]qs√·Œp∏onò6hŒjÌl¨?67tÜ{ÉÕ}s[∂As˝Ω÷†%4√2≤Ë∞ÿŒ«‚m7ˆì õ;s;πAøbw
Q´÷põõuΩU]∑}Á0≠å‰ﬁÏÎ&´ª<#˚
Skb~œâ∫ÕD#ª
‹»©Kªÿ,?‘∏Ä˜ä–Ω50]ßR,åîº+ØKÈüﬂM≠ps£ûgù-Ñ•~;ƒô≥è∆Vp·N¿m<ñ˚¡á`Sﬁfœì«]Á¬w–˚£«´(º	#g‹òπY«¬ƒØµæx	€∂ûlX¸ˆIúINµ£ÖVsk?„7◊RyÙ¡ß9"Çz#väºrm»”Z_ˇn_Â!…ı˝(Ú«m¥9Ω∆ ÍH:K'+y•µ}aL~U∫íÇ(‹8ûóˆng]Ê˘p|±®ˇ>vm¨√jZ¿õ&iaaïR¢l%*ÎÀHV6≥Öw◊◊ŸpH÷†€)¯mJvÎEä¿≤k@ÿXL!t≥ﬁ‹÷Œ(Î÷ƒ
^ñ◊icxπI±Œ7∫ππ’⁄ﬁŒu~:o“^—≠sóvV—‚Œ÷ì≠›ÿ˚èl›6¬ öÁ4mb¶‘àV•'ˆfÂi—.o¡ø“µ0ı{M˙ç∆∞Î{Õ"1ëı»ª≈
˜¢™# ıúçq}7çÅÿ!Ó§M˝–€.}?¡Gá‘Ã∏ÀmD3)1∏Ù}¿DgNÃ•{’Ñ&ÅÜpC¯}•ø4„PÅeª≥ê1öÑΩnÀœa3‹≈¬âé“†Kçèñó€Kb¢bCé¸)°wì∫Ωæ'‹6ô ü¨vçÇÇÖF°§]∞æï>Ú´©gD\3—h5˚∑©œ:nÖÆmq[ò∑-Ò	na…tØ¥{Ãöçõ⁄ìh‘å\œÆ;ù…ä§;	5*7'ÓìÕ∞îT~gfàS∫EJN4ÓPÉf®HHicc›®È.ã7€f≈¯3W∞l∂3bƒ;bÇ	D® ‹wc«v-*+3&2aB∫ösSô;D%≈ }À…Sh/ó.‡†∆Káÿñ∑∑±µÛÙÅÛ'Jƒª⁄≥ßÓ¯Ö¡‡†ñº|ó8ç≠ÎFñ‡FP‰áZ£.Ã®´ÏÔWã˙4IÜÉ'ﬂÅÚï—A4Ÿ<$U·cü‘œÔ–£> D¢Nb¢&. ºªrc‘%Ω„Y‡¥µR+∂I}:li5Æt‚U%ÉÎm"∆ô≈.<≤∆”}Ù¢”√ˇ;EœﬂjFìo)ºîÑ¿–4„8òª3∂Íd—¡	âa]µ≥M3≤„ï‰≈0ıÊ‰J¡€BœøHç˘C3o{=ë‰Î¿R¡iêùîƒxëª.‘¢˛Ö¸®U⁄‘“»â7‘z˜d∏iØÔWôØ¬X©Â3ûG.`As◊ˇ-Õ˘fŸ3Hçß˘ÏÌ˛–Y»2ÀmBâi†√bf0©üÕ`w…3»Ï¡˘⁄^€ÖÃ 3F«3òs,fìÍŸ-¡~]ò@ÃZ÷B&êô◊„	LV3ÅIıl;Àû@jäœO†≥gS˝¸»Ó‚	ÃÂ,fì6ÿ,ˆÊûEÌ©úëôS’nâ≤¥≤]	kW†ìïIoï-˛dù7NqU!£U∂E*Ωó jU"FO‹ÊQ\Õ√∫Yÿﬁ¢t≥(æ7&âÂ¶A}oK≈Mc¸›ñ8tõ˘õã,	ß™VΩßuyËl9;ÖK≈$Dè®ãn”ÿˆf·2ëµi8 ÖÂm”2Æ$ã…Bd¶T%Ê3cç*1pêœN∞vÉUÔ—Ã]5=Ô‰û$ycrÌŸÎY0√z/	0'ﬁì÷§‰±öÿ› ºtIj©#⁄èƒèÔ≠?	|˛åOy~‘ÃÏÕ_¶07úSgMí—÷ùX%]Jn*µ¬,_Ë*&b∫_∑zö?¯%M6h¶èI∆Ø«´`ßÌ„…låw˛ ˇB‹‡_<rÅˇÑ47‹st∑bdß)K<Y¡°õoo3^çw˜F/0ÀÃ0AÇ£fìî»z√∆ºÇb8‹©N*v;éΩ—„dBıb?'â±πæ¢2?]S7%è`î«0Ç[à»'PË2|1`¥»·\ëèHùóÚ+ÔHvÂÌ⁄˜ËwØtl¥{Âcñ.˚˚5	fÀ'û}Zïm:üô⁄‹H\5≤›n·nO˚çÕg•vÆ£¿R•¶∆}¶O∆U≥Tøüÿ≥zÑ^øxÍ‘ÈÛNAı7´®ªäéVQgı‘Èöóô∞öQ!âm Y›hÊÅÁ9√∂ÿ(FV‡“LÏ Íhxƒ–∑Ì^:Ê⁄»˜ú∫ÂàFJpπ±ïul£D‘\MbBiS9yUs]´˛
B#(Â‚I› ÇÅ…Uãc˝Y	ÆÒàc¬€ôº®ŒñÎO^@dÕ¡≠2F}øîZ!+|´πç¶◊çM4Ω!ﬂ1ü¡‘ΩI÷’$≈/˚ÌIºÉ(/JÛõ∆ú«ª@<u∆ªo∏¡,˝†Azq€ƒ¿Ö•ayût∆|l„:TMñÊ`&Sï·˘‡∂µyá÷û±}{ˆÚ™7ßˆPΩ=Èz=ÿ⁄s‡¢ã_oãsñgg<˛qÈ+>«2«≥î]Á√ÀpÍà`=¢sÃÏz_{·g±ﬁ/∫X¸zßáa.É˜ﬁg¥÷¯sz∏q·ZAÇÁ[dÂŸ°ñ±ÛÁ E‡⁄˛A*l¥–ÿnßnjƒ2*Dí'¢»I•FQ”E˘Ø•ëûzVÔâƒ!N≈æΩ^Uéb7”ËÀ ÆrΩH∑îw'”Yd∞%ú_Ω!?Zﬁ”U.8V∑áGêfÈ‡∂ÓPúz'Íd ◊ù&˛z·DMRΩ&Å6üdÔ`ÿ»7âù˛∑3¬º+eπﬁS.∞ô’≥∞Ìœ"‚¬=Ò'˚	¨òRπ?ò∞çk»m¯´∆pÊy™)U†Î‘U ˛√â˝Âí~◊Òú%˛8ºÈ≥“_	_¯1!|†çAÑﬁƒÈ(h¶—/iIÁ‹!ô2c
Á#sKQπÊR$ﬁ\˝˘}†¨·◊¥I4“ûO`‚Ÿ™ëxk›‰Á°jIøö¥Ä∏hCÍ o”|0$ûòÊ}ëg¬Œé·“π¡R~”µÔb"‰2∆‹ÈÜÖÿh2ÖP˛&aª∫NpE…üüÆ—˝5ü‹¨x$µ¢v©ß!¬QàŒ¨	ÊQ¶ˆ”ú æë¿w[‹T∞EÖ=vÀƒ+`¬úç6Òàg»é
À˝‘öÛûú/ØW‰ÀYH,ïÅ˜®lá˚–⁄_˜à~Ö8˜<+Ú(Fe<„®—Rˆ˘6…¡z¬¢U±◊ÂT;ŒX≤Ωæ∂µ-†à¯yk˚ÅiÇ7ıT¢äƒ_tπ¡[£JíDö√˘’o„Ù–wﬂUAi‚òŒÇ©ÁHiÉ=~p“`˝®L∫ÂRÎzU‚HzŒ$˝{yD“«íÄîD»√'“ã ‰ë∏I/ó4Hß´È3#
˙}ya4oE–ßN¥ïi"v¸^.I–NW•	Ë3#	Úuy¯°úEêáN¨ã…!vc_.9ê>W•Ë2£Úu^jP<íjEXDˇË:W®Gúø©WI‡Lâ‡Œ0Ê>='≈"VÒÊ®DoÒƒ	\7´®r‘X§õ∆âÉ˙©Î2#Qk®´FﬁG√‹«Ñ9ÜN‰B-ƒgÉÛ àÅ-HK≈H›-‘<≠\G±8—
€IûB·3o‰¬C9v	Ì[Ë¨ƒ˛$≈æ´Ø‰pÁ∫#◊ÒÏÄi**Ùérc◊ÿ¢«ëÀ&fÍ÷ƒ√˜>— 3ß~c£¢≈Y∆$eÊ@ÃÃuw"¨‘54çÒëÜ∞
jsíí©K Ò∆Ç`lçñÅ#Ùæoç
GSg2†nOx4≥‹´≤≤&’∂¶V Û/“Y ”¢vb“úm*õ⁄
j´ˆêô1ù[z¿‘÷,Úuû∆\ƒ-OMΩtY ¬è¡4Xì0vh¡≤·V1n‹ƒ_g@}ªAº}/êÏ®≠Ìmî;V∏Û#nrûH”æ âQ€o÷˜3É9Üc,%© 8XJ^æTï—àåc£§ù*be–©Ç)ÃhÌzc“Ù"ªk‹Ü˝Î.ªâ˙gÿ¡£ewê»ˆÊ˝Î,ª©ÕÕ∞áΩ%ˆ0UôL;RÍÉ,1®úâ¯bÿ[‚f´Œ‰˚Îì§√%Ê7ê[\óuatqM.ß„á/=‚ôÓÿÓll0Ù[|≥Èà~Q¢q®ù›”π»%`ß∂Ó⁄5˛p≥ìsΩªŒ:¢´ƒ°v–â?fÑÉRò°Dã⁄hnv{ÒÚ–ê6·ì _õvJ‡£Ä⁄0aâxWfqRúÂéAd€ ñäå6Ò!°Ù07é££#yR∂Á≈_Ó»Ëhv∂˘õ{ XÛY)Œ.Z∏ ŒÌÆku(≤`xo>ç1%WsH|±¨•◊.sèËË”Q,®œ?†Œß1 Ó6}Ó!ı>ç!•'SaDº«‡⁄Ì∆˙]Ÿ!RX¸fÒ
K8»¯n≥î\§@„ˇ$V6´í»∆º3˜ò{˜≥ &Z|$´¯œù∆3Èq>ÿK≤îΩÈ+∆¿∫Plr€V* [f@«“ÿÕ—4jl∆Œ®¨©” §ˆ˜˛{É€äØ]«≥ÆΩ¨˛Tw]ø˛‰‚Ÿ[OÄ≈–?<L¥Ë6 ◊í«⁄’6iÕ∏Kπ{wBú™ÈïÌŸ¶#Úo∫ÎÑ◊¸¸›Và∆ûEG˚iñ9ûÊ∞7*X«Œå	ÂV&6¿$kÅç·*o˝~6ˆ¨ÔqmmS.´my÷òß∑7üˆ√M•`ë7π»ªÜã¨7/VZd∞YWô:á‡ßØ_e®Ü_ÍÀŸxÜ˘ë;D„Y‡™ÓM{=?ÊäÙvN‚|!´OÚ†p|›≠‘Wr Ï∑p‹~tŒù©D›Yøgıiä:‚;–ª·†Ü= UTó•–‰≥‡9ˆ	.›çfêÿè$ d_õÙyΩJ-r¥7<ôEê∞3lég‘3ÖDÙ=zÑ≤ø4£¿„>}É{˛¯Ò
§:√e»¶Çó„ÔÃË 	^XÄB∆˘™	›«PD˚‹ÍŒ¨‡±8Ìm‹Á„ô7#√5ÎÄØÎ⁄'/Yì«“ût™p%¨˝ïÿà9¥º–ëwó8%9·Î¿≤í¯Ø:,˘°ê≤07Øqáâ˛ËF£∫®’t±ˆiå◊>ïm?n~Ω-ŒjH¶"3V‹}æm‹è(ÅKJ	˘»ªNƒí„ou›tH"õÆ-öä8(ÏC(˘‹ı<òãq¸=ﬁ/}RﬂvsdÖı~3˘mEﬁg¢0Aı=N©)≥-6q«gÔ ŸxıiPÊlå~ã˙Mkåñh≠KªüTfπ∂†r~–a‚íDvä‘V‘˙˚…¥D˚ﬂîoø–Åµ5ÙªS‘øA=¿`ót@ßî4N èÃ-˙â@∂∑ÒäB0‹œı{Õµ—dVõUÃ˝Dﬂ;ı«Ó⁄˘7s?¢;¸øt{Wú∫¬≈πÂ˚¯Og¶i~º⁄$HìgN˝≥,Õ∞eËø‰§ÃLÿ∫,:7É“wrS™¨+}K¯í`Æ≈±ô¬—6π1A>”ñ®6UI÷;(KñáíØl}»+≈˝Xf}ö…¸J˚´*iﬁﬂ‚*ò4◊ \b"¢≈õòSÆ÷≥=Z°wÖ¥c´ƒi2¸ô∆iä¶Çæ&x–líŸEœ¶H]OsKES[ûX—®IDxÃÜ»[¸Ù¨âJÆ†Ô!ø∏siÒne•b±Æ^∑bñf—Õ⁄Ù¶„<µü ‰W·ÈÅ˘; –K'≤\ØË’ñ9a:Ÿã (=YùJ.∆G°éõ≥„è0˚[πÿA®ÀÅ√"úÎ Ã‘…éø~OΩLì…ôßj¥¬QWlî…Qb÷¿Ê]Ã7acám÷CÒ+‹í(^Ä˘U<¶s!b"/û*0}¡,¿õ§´±ø1ﬁòÇ=ì‹ó∂ˇP∏£Ó3í
¿∏ﬁ!6‘ı≠†ä+ˇÔ	-ÛÍgÆ¸·8Á+=∂SCcﬁå»õÒ{Ï©-Ìçá∆VX¨Q©«√⁄P{tÁÕ7¬€˘9÷Ö∆ÃrÆıX∞ú\\ZQ[il–{E£\à¥∏E#]ú⁄∏?¥ÕåRπò¨∑»e*ÿ)‘E¶VvíÖ7À°]pQ1Ò} b°/∫á'Ô;®wt˙˙mßgÈê´ÊIÌ+éﬁw∫ËI•jvÛ’ÏV™f/_ÕûI5∆8_ «†YæñŒ/ÓÁ\–∆W~qü¸Çl-CÑõŸƒ˝óôCñ∆Q«Ω`ââ]Z#~}‡Öƒ≠·“†‹ö÷î)3ƒ5	‚±-ìçÀ¿√4Ñã%@›db($Ø‹’ò¨ır‡~dO5 ™f ™	x™Ï#˝Œó#=üÄ◊˘õ•É .IJŸıAöo§¢FËÒ\U˙N>¡¶ Æ[ﬁã«jÕ˘'±:¯÷ÍhÃi0W ¥ä^êí¡*((–º¡4”Ë‹˛˝ﬂˇKJaj◊•”òst¨Ê<◊{>Å⁄ù“èà=©πìËîVó»]æ,◊—ØR}]˝rŒêß~πhÖRΩ∑¨-òxî&;0¡˘L7`:õÓ¿CB…:˚üˇ€_+mA-¨Ås´‰VIYâx``&)ã•©å]ñ inÀó_ü˝ß˜Æ◊9FΩŒÎ£7ùSt‹9:m¿?ä√ª
¶&‰¥Û9ØAπßÒ99ü2∏∂î!%ŸâXf¢…LTSà'’zœ¬{≥!#‘C'„AcÄègQGî–E∂5±Pd]∏XBXhtœŒ‚§Xv0pGZ0^ÃóE◊Ááù„£.…µ}xÚºÛ«ŒygôDÕ–ôS5úúüMü;ñÁÜ	5Íg∂5¢4Ï®ûﬂ≥ÇÀÆ¨Û¿Z^Ï‡/πÓæ‹8ºá¶3oi@J_÷∆ËΩ?}˝∫Û3˚5»>ﬂâyˇ7áë#ifgPAÒ≥⁄]º1P4ƒKíi‹∑nà/"Ÿ&}«õçÒ6Òfÿ?jØƒ{√ÇzMÖk∏ $Hπƒ›\∂˙TÒü˝tNn`∞MR6≤u<∂‹I√√ˇ†Á.“Ôùâ+7Å=T*uPd®XÏ∞≥Ñi[Å>˝ÜÅ.ù◊ä£5¸ÀÏ3(“Dãä1V|™é-≥d\√ÿ2<}¿J∆ËFÄ–búM[Ó“cî@˚î*÷óEya7ö$°%i`ÆZ åYnˆ≈Uòä7]f4ˆ≥¿øú0Dﬂ-1o±	–Ç.‡mŒcé ˜ƒ ÏäD£˘^üw∑;wπ»¥-YÿxvOπò‹ÅQ√sr'pd1gÙﬁNÅ∫Æó;Q%]a#0D”á†©!∫Ë'ø‰r¨Q)ﬁÖ¡C–Î\$3›EƒâmS‘*c‹Ç- ∫¬4ÑØ0ë
MÅèqwõ≥µBlMV¬§áv*Ò¢º√Ãñı3uΩ”‡Lr›ùXÑ˝q£í…TÜ„IûÛ],/Ã/såÂ—æíQr^õ<∆<yé§†MØÒÜ+∆"g"ÕÈ*a≠X¿ÊW!
´Œ ¬ÿ|¢ªÔÃ:nlf:π&Å¬+Í+_ÕU©&6X<á‚GoG@Ûcû∏X–)aTˇ’(~/≠!ÊZl∫iWßlÈÉ*À‘C®6ÖZMÏ ®ÔÑN )ù!s=Ëu‘WòSc≥ÙÀ¿x∫ËæÍ}üÅﬁg π8@Na?∏p˙sFfT–ÆÒuâÒ˙•K6¿B*+`/∂~n
_Ò:˝ã–˘RÍX›≥.!4ú!û6I±>IµO∞*˜Ø˘!<ªìF‰õÅñ	•RS˘3Ôf+U?®Ä»á\‹i√ÚÂÌàmˇ	ïQ	:◊§ö∑x
ßÿ{ÿX∆f…3c2FÀõo<1ÚzU¢(ﬁ≥ï‘+h§Ÿ9˝U‘7ﬂ7ô.ë‘œÔ “;äN\îì î*|†Ë$ΩB∑ÑwZe¸„ˇ¸?t€O¨ ¶:ì¨˛€X?l—|¢ÎÕçDÏÓ˝¯0MÍ€[AX>U≤9Ú
7Í≤lyxpò}rπor`qblú⁄›#W⁄Ù#ÎıÒ˚”Nót·˘·Ò˚Dˇ6∞"s[r5Jp;ùﬂnÖJÔ¡S…Rêò“ ¬/÷ºîƒA.ÑxßÎÜò⁄|æÂ∫ÀbT©ÎG-Î €%!lº!≥ìR’I†Ï¥|˛f!„!æ‹ÿ/‘f¶xÚJVÔ'«Ôûwé—€˜GΩŒi˜’œ_ùı–ª?ûw˛∏ÇŒﬁùΩ?„,QÄÁÌ∏”ÿü Í$-ƒ˜£Ó$t¢∆:˙AD„\‡4ªèO;ß‡É$&)UéüºçJjãèæ}‡,º2mÏÄ7Í¥±KCK}-0ìm#@ºÉ@¯« ±ø~0∂"ñ˚F∫W.†€„ÖrT‚¥‹hem∫ú	o‚7HC∆å"^c√–$çìπ⁄´]ÏsÆı$DÉP°:ı>°'∂ÿ¢ùœ≥42…-Í™Õ˚]g¨yÈ;Áä˝mL†\ÛT0H∫¿DJ$‹LÌ•Ù ÿôbäÅk∑ì‹N\…sÊúπ¡˜tL+¥s®˛vÜUg»9tˆÚUûk…µÔs·"L∂cÀ{¿uã{).[èˆÛMÔ≠∫ÅŸ¢âL∞¿:íÂ¯ÅÉËüZbqJàƒƒ·ì·ñ!?…µÔ⁄Iƒô‡$‰)˜"∑úÖ·Í÷FpÜ)VkäâÑìT
Ã5jòz& FdD3a:S÷ùòﬂQ6˛”ìùÒ¯g4¶ÊÎò2H¿'Àÿ QâÇ¥U#ÿ·…<µjã»Ø%tD›…∞Óéjz∫‰O¸Ãﬂy∫4ŸCEçì]ÔÕ·˘	‚„˝Ôﬁ˜0y^÷k˛9–˝Ω"21π	‡Ê^$ë–í10ç7xjGß¢;¬ èÍ¯r„ÿm8˘æw¶7∫˘°È˘~V ıœÀØh¬`pê´ëThÏtÖÂî˛øOÄîÏO"pê	GxÌ/±¥uX7!HﬁÚ®8Àãj«0Çcº"Ú˜gËÅú˘¯¿∏9®a·#˛IVHß)”¨¢1ïÿ)rw5òÈ^!l1‘ãòÎ8Ø2ô:h,üÄéXÎûú°ìŒ„Œ˘—+t˙ùuN_v:ßRÑ∆ØX—yäK˙?Ò	§ˇiêY*ì∑0òp÷—ÚÍ∏Ì⁄1\T^X‡Dhª∂7ù'ñ∏CtjçlºΩfzÔYcÎ>∆ˇ§πùüz+[}-€&~Å∞êgV8f÷d˝ﬁ∫≤PœœÇJ√P(ÉB÷≤±pﬁ≤±|ÊrN¶˛°∏ã¸≤[x„†∞ÈÔàö¬Ùlëêß˛=ˇ∂«H·”∏{rÑæWî¿I!ed <+H%•4ûÁŒ∞ç~#yò34mr˘’tm`F≥ææäZÎ+Õ»SG1tep oΩº±ûHãÈ¿CgÏí5„O¿ÒÛ∏¯∂E˘•ÙÓi@ ≠îÉ¿ ]5îé7‚nz^=á˚ÔvÈË°9@ÿô_V–!ô˛<ïÜ&”œHL`Ï®°k†0 ˜~t]UÀJbPÑW≥F≈U£|r∂uÉ˚…lÏÓ†¶ÉÅﬁE—ó	G~ï∏qzïi‰NU“ñÃm·ÊC€7—ÛOfïÈ¨2°¶‘`RâäG]Œè!K=yÖ%H∑ @‚”À∆≥h`lÈõ©DªÊÿGK‹Iüˇ‚›	Ï#c/É¿ö^’%U˝⁄Á˙◊ExU£Å’∞TÀê∫ÄQE©+{Æï∫Be°îXxº‡∑5§Ù≤x‘üyﬁæÓ-—å`Ωª‰åå¸Ù|£aªÆnòcw2ã√◊ÔÖ≤u¬2;)ã∞‘w	S©Lì¢ˆîiøîÈîÌ2◊ÂL∑-’íO 2_≥)Âäê ˛ì;µ2nåãµÙ,`Nè∫ï&Aw$ùyJÂáõä™j0œò_•dp‘√≤“8‘€ÚÆ!H(OÂ…˘ZŸm9ßπ…`ÍÖVØB≥”…ﬁ∂÷KíÆ…ôZ ”d≤ä›Yü8UµØjor/zâ¡Vô8ÆJ∑Òo#kr≥ä‹8å÷Ω5uhuãﬁ¨æM´$wî.ΩY2GææBl/s7N—'§b≥≥Ås^‚ÉFì'Tu?[H πÿµŸv¬Å éüTmjGX0˜≤ªè¨õª3ÁÃ†zëX–Å?ΩõÆM&N¶wr|p{ã~˘eçΩ6J«•@f§ib=˙—¯ﬁ)ßX
 ,V¡T—%ô"ø’	<qÕ’Æ⁄†ûßF˚ÍŸ—"!z˘Ã∆k∏)◊z√Lüß0˝6%ùhÀÓàn¢’#ËGR®,˙M.çêå_P=_QYiÆ∆-ûdåeBÓk!ªƒ˛‹¶Œı®~÷9z©≥,`⁄2´⁄±ı¨˛åƒJÍÉPd+î–ÉÌL˝–U‹Ç¶üPÌÃô‹PåìmR¿
‡Œ›`«Ë◊Á!	Íƒ˚x@Ug|‚GNhÜ0_ÎÅs¢u∫…JÃûÆgÛR∑ ™†¿üS~:üjM2‚)Ø*iU∂íîºÊß»z÷ƒfpk%t1q $>ˆµ ô™KÛ†q’)¥ÅRÁ’Ÿ#!~ ;/nâÂùT/’èxjLMX∂ìïxi 2ÒÊõszN–w!wu[æAn›âÌOú–µ&§ˇØ¸‡|6u≠ë‰2ÑNhBéOÙ=w&∂5¬Åé&C’OÒFw/&¯<D ≈Wß1 Ω¡ªSN1)m€¯H» TRØ“ìkßpÜl√ ƒ„^#¿™ˆ?≥… W]{VWô˝ré,[+w+sXª9…“ØuÏ±´ëÂKMGﬁ	-
}√ã~pIªµäSQÕãms~ì_∆¢7”Vf™∂◊ç‹}ˆ®ªœÜVù˚˛˚ÔQÔ¸Ë§Éﬁv∫Go‡Ò¯3¬Ò; ﬂ∆+À{ÆÜq8œ~$e”ƒ´‘zL]+ﬂ£3ëÿ$¬àdyÑ?ã≈m∏tËÅ;Î˘KüqôÉ7Åò¶*˙/ÉKÙ‹≤/‰OP4rãI¡¸<tº°Ñ°›÷Û|6ßE?z$úCüöô@iÏ",-Ô3’%ùûø€ä…≤>bbmK4æÒp68a®LÙÙç≤EA}Û<ıò¯ïïπ›-œp¨>^±Ñz¯¯l[€@‡˜Gæ4Ha◊˘n»ñ– –#5∂ƒ¢FEøæ÷⁄Œ(NØ;4|äED5úèê†7®BæˇE!»ãy=âL·Ë≈Lg∏Nﬁ…5€„WG˜·ïı+ﬁQÿdııuª˚˛m˜Pé%PÈhƒ¬†ÑK∆,PStwIÄÔæ‘Uàúerr*2g√brQLº6$ß»“NÍIø=’I®◊àw¿}i9‚ì˛÷ü¢Ó,∞ñ‚í^úd-¥?é“´>çV'Â¯Dˇ9@dŸGº›ïÑ$àú∏≠WT˚åsJØt¯H=”ï€∫‡∂Æ~€¿ßùåf·Æ r˚g…Ìºe@O†Ámñs~/QæB<iV≈R‡S>Æ>ô=⁄Z«,ˇìÄ…“BùÍ≥"	ÇQøVÅﬂ¿GaITë§πê2ÙÅ‘%Ù§ª%·zY<≈R≈ã≤#›6»∑kúäD2>,WeîU}.ò9¢Ô‡≥ÄºπÊFtbQ=‡€ùçM¿RE¡xÉAÄÀc)b‡a’{X.Ω§øÖ.Í‘ÆÕï°Ä∫%
Æ¢£ÿ8hﬁK‘sº©¬‡(ÌÎtƒ3T_ﬂ‹⁄\A;õ≠çÕ≠πñ‹$E¨‰°Ÿ	arCQ>>ít†ÍY°àìÑœΩh„>.x¡Uxròú´O±,™Õx`(Çﬁì”ÙL+¥V[À
ÆÊ¢Î˝ÒÖ
:Ê¸xwÆ≈ÆŒ/!=»πU›≥íÉ¢¿¬¶—%—f¨%òxy@kÈıöÊŒÂß÷∆˙Ù˙ó÷¸3
Ä %->˘≠≥≠îØ~¥<ëãï5U^ãí◊2l‡⁄≥ ˛€Ê!ËŒ˝ +{z‘}ÿ≈©öò‰·Œ`ïv˚ß¥âÛu“©∞RJ|‚{p™ßN;¿*ú;‡eìX‹„'ü??RåAà¢·!#r&ˆiSÌˇ˛“	/wäµòÁ¸ALúÁ©	ıIXd»F˘	Ò∆M˝˛üﬂ%ß¸™n˘H≤ñˇ0∑}Õ[Â›ç∞|,v+\kc“S´Z?ÂÇõàXMUŒÕèóã5–w≈”ŸÃ_‡é/2Òê"ìA+ró|É¬H‡∂≥^˝î>3Ù5≤Æ ^§(`©fz#´ÎÎ⁄. hD” w‹U{Dówl§L\≠Ω/–Ü<wÑÅ«wiy»0óo*ç∞¯—˙≥€è„,Àê¡nL∆E:âµ\ﬂv/®°’àÕû'N‰€éÅ·SYÂ‘∫CN'˘ˆYÉáôs8BµùÓ¥ÜN:ßÔ;««DáßΩ√Û√ó˝2Âáö»®˘„Kpg(cV>œMQÿÏi ÒØ‘õˇò§Nz0‚<ôë[£∑Œå%Cs.ù	\≤≈Å ü'Å.2
)áÑ∫ñg˚ê;ÕrÕäÛQIô“∆ÁE≤©Ã"Çîç
r<ãC%ÇÉÙ·A€^sÑÕŒ%eÎÓ9¥QD%„à4Û„¿Tü,Ñ‘í˝\ó “ÿòJ∂/-¡R{ëR*XF`Ø1¥|qπÁÕ8‰s)ﬁ9«ÃX(N.,êü“+
&A8 ”3ÅÎHÓ ∆‰rQ~s∑¿»uS≤⁄iŒü8uÍ·üˆ,H¶È1∞,’⁄Ãqe
oC[y˛‰BÒö!™ïË©*VS¢e∫m¡YXÿÅxï≠Bpã0˚wÎv¬ÚˆÅª 1Ÿ™™õs·È≤%w¢
¥óÎÈ›%ñvcy•¬25≥wæ‚Äk‚´∆Ê"úA±Wc´îâI€Yë¬ﬁãï_l7r&vûB®Ní#…¥µ¥vfQ*çÈWœÕ	5…J*≈bµZ6@˙∞ìDTUCzãC0kz˙˘äø¨¸îûœœ	~˘Î^y¯Ω2ˇ'h¡øﬁYÆT≤l	l°æ˘FÒ22ÉØ ~t#k<EûuCDØ ¡∆]K‚Cc“ìI‚§Œäë≈ô7LWPG…c¯Té2^‘Êâ6ïØqü Q«fsayeÙÒOd´ö8’`UÀ◊€ìW‹Z◊&QUog‚f„>§ò"Ú]BJI°#“=©A‘∫ÎãˆãMÈlµƒ◊æŸ)ääNp-f§Q‰è±íØ§A 8À=∏GÙè\` Y¢±{›Ë{∏ı∆xÊEÓ‘ª—ı†¢€øÇQÏsO%ìô'13-IÙo áÔkıπ6åñΩã˜≈‘ÒP◊πÙ=k4œ¬o∞Öˇiá¨3]˝üû$\Å”Üê6D$Ä¸©5¿cjÏn?5»È›üºY≈€&°ã≈öV‘f¡Wæ'π,b„à¬R∆Qífïÿ·%sÛ|vπhöﬁmá÷Ÿ¯Ï˙nww>&t+rC‰{ŒHÅUZlÇUﬂã√.≠–!+≤B,µ∏ywJ˝"5Â≥[¸πÄgìKò+…√{‚€ñá:ÃœÿäÕs≤ÈÕíx'F¨p‹&ﬂˇä˘+ùØ4Ü›8Ôw1y∑ ˛Ö˚êÃÕ•≥ì∆Ân	oEí$≈ÁN8v öÊ˚$‹'“úÁâ˚0ÓÓ≈sàß
ÔMA?dyØuôØπØ≈J‚\Ì\5…|◊WˆÖÔ§Y≥ô\Xü‡H^ˆ'ÁŒ0p¬ë∏6°´%7Q”Î∆&√Éá§	8ÀNí…ö˚ÒI|@ßÎŒßÁfD!!ÅÉ“≥Ñ€·8ü‚;õ÷ª8˜B÷Hfé»öqn[w¯ê¢WJ)≠˝ÛÔˇ˛_ˇÛﬂˇ*ÿ‚‚§Ë$…",W≤X‚¨‰È™%˜´9o√eÀ%SœÆâŸ"<«º÷3û]ø-¸î˚!Ûg*/xŒ„wœ;«Ë∏sˆÚ^÷œÒóz˜á√Û„ŒW–Ÿª≥˜gﬂΩú©ƒ´ë,Ï≈Ö|⁄Ó/bcÀ] 
œ˜ﬁ˙6Vö0á·Z_€¬Ø‡m`XÎ{≥ÄMçFÖ¶òoπ≥‡6ùnI˛IF lüÑ®∆€Ìicóâñ[◊I¶sQzÒ$7:ìJ˜÷?éÚ∑Å0˘ÙêCtùCò)ÿ˙cr yz÷ÕGû¯∞#YÏ·=A,∏03õIΩ!ıÔÆI¢Å≤–üò¯¥p/|ö@J∞øŒºì?[3∆ÿé≠)8V	vúX∏Ã—<18Œ%≥C	ï+√¸Ë)˝∑Hv{ﬁ÷xyl»Qk•|>:ﬁˇ≈#ÌNß4©}ΩÜ	KÇÅ-N}˚≥‚ç8ì
VrEŒeé&ã¨d•Ë[π=9»të¶‚n*TÆP xBzínˇkÂ›HÂò±c%,+©·ÓÉxeö‘?ˇ˛∑øÇa∆%—Äd2y∫‚åú¡%‰›˘ƒ©#ÌÁóCˇ¯œ√RÊqd`4ê†4ôH¥π¬j
ﬂSË !J¸	…CæÉíqüäEVÖ–å[ø2ÈæãwE éå-›sGÎó(‹˜f—l∫ ·æ <æ,»íÈ£x7h`M>Z!ûU*VI\ÎGé‡
!øWa∆Ü&Ω™ˇOÅÎª0˛÷µÒ¢0¿ËMÉu†8?"QúÁÖƒ…uá_íºaR,îÊÂo.ä5è&ê:FÂz'˚$ø›Åã≈qfâg@†î@Y
áÂ!A%Xï	ê`
kÎœ˙ûìùîPsEèT©∏®ÜZ5‘3¥¥5^bÖ_&ZhYŒΩT¢0¬¶ﬁ”±^ØBe21ê6“Y°Î]íúRFÓU∫4µãH?["˘lâ‘≥r«êyÆ%Ú?À¬∑§£&¨a”qtKÎe</Úh‹QÕÂdÃ—,à‹Ò„$ r‰L”a»¡çV∫8î^ ©qa!‚PúÒ¢AFóÊ∆§π≠1∆MÂ«íH£s‡å.e¥‚Ù‰£Vr£IÏä6`Ú>E”öWƒ’#ã.z≤ÂpÆ,å*£™Éu%à¶ã ,]<¶∂ÒÅ¢©SZÒhQBîﬁﬂŸ¢F'}†”e!®§&h÷%HMƒﬁ{ÿûZÓ∑xiy1Úr)âπîÃ<è;u~"∑_
ı{»l∏hÛu¯Ôôu!v∑Tyçì<ÒjÄÃß£©0ïBr…•0ãû+’€EU#, XrKıÅ]|°∑VàﬁêﬂY§Ωƒ“¨Ω¯í,\Ω¢…˝á¥ã‰b¡≈» ±IõÉ·Ú)ê÷◊ñ‘ó≠ÁÉÑ@Â£èb\˘$ü9∞/Ò,<¢ù ∑ØYmPbÊˇ?   ˇˇÏ}]sIíÿ˚˛ä<;Ó‡ó(i∏¢&@I£·H§∏µ„	›x¶ 4â›∏˛ä«•√ˆãﬂÓ"nœﬁ≈:÷qO˚ÕaG¯˜Ï˝gVUwWwWUWÉ iŸ°ÅÓÍ¨™Ã¨¸N˛Óö–Ò⁄	gïSîo~º6ﬁTbÆ¢Á¨æíFf")ás!≠nöG¨@íìeAÛEe»ºC>Ày‚0ÅÛœèÒÛ◊ÆƒZì≥RŒH)Âõî≥Iêª-òx~˙÷Òﬂ°aû√|â°Œ*%´!âÈq—çÓ™˛ÛÉ7=r≤¯‚eÔÑº|˛™◊'W…£U@æ/[H¸ªÙÂê0!ÚªÙÌ¨r™¸Óßà˙w≥Ò•7)‰o8°„ƒ'Ωw-˘Úãæáï6Ã±˜ÕõC“˚∂«<{›IO˘,º™Ò˛ÿêwÕ&•‰ΩËùRåkÿÆÙÓ˘ˆLÒÙ<´Y«∞jVÚ _Ù*ñ∆4¨ ﬁ9ﬂÍïû‘≠ú≤O§.`ô∑$cÿêV∞s£´È¨‹Ó¶l∏m
‡ƒ©ò £√>ì'0U≤KÆÁE›S∂:ï¨=¿Qµ'˙†öeJaàÑQ”=gN¸›˛ût§≠∞óTµ¨´â;Î¿≥≠“uà•B uÀó#VÁbfÁ˘ùçEzÆÈ∫Üµ~Õ S¡ »£Å≠f¡j1à#ÖTÊMHß4◊$±›+?hºªt3ì:Œ”Zr]◊z	»ÙÌVÃ*s’Tó≥lJ˝Ñz-m%S]ZE7tF…–i∑Èp∏JÜå∞·#˘ÇEŸúU≤n∑ïØ}TP>‘^”ÀXª'ãç°÷¢˚–;ú
4J&∏Àk´ŸeŒÀH¨®äw[P√·û–⁄`üªÒx“s‹àÜTu∂‘ØÇ	‹ªö∑˘Ëä≠2Oæ√k,ﬁP¶£Z[Õå÷÷»Å;bÈœRÒîz√ƒcvˇ» ›T<”k∆U8ÛP∞{v*^›Z—n3∫/jÎ-lÓh^ÍéÙv≤ÿù:;ôº¢øOT$⁄gfËÔ«ÓÚgAà:mˇË»`®@å˝Ïr  ¸»äˇ§∞∞î;Âµ’?«º‘|‚£˛^N1x´†Ìù@ï˚¨∑¿¿∞÷@»;¢à ç8öÈkêôâ4√NŒPÊd-çå°±Ü∆€‘ëê4nà§Y…OLç≥˙¢Ä‹¢X™≈Û%Ñç#llè∞±=¬ÓI6-⁄∞(§E05Ù=‘ÕnPLk§∂Ÿ)nÕU∑˙wZÀíÕèê∆€Õ-˜n‰l…¨ 6t;‡µ»?¡#Ö€∫Eûr√•‘v∂€ÌJ—*ëˇÊ¸°í¯›(c≠âÅÆéeô—úvgV∫@_ËIlØÄ¨ó˝8(ˇ8∑‚üJÑÈ‹¥ÛŒÑÈ(ôÆ≤ÿ >ûLA÷ï:à‘ä‘ s˙“g·≠Ì)ØˆæCxuGÉU®Ìî¥ÔÒVHËƒIËÀ»Øñ≤≥}•ÒpåÛ‰,É˝Ÿ^À‰‚øn∑ﬂ˛õïæX˘Îï5WcO‚∞'W]ªÔÌ∆≈Bˆ∫ëunZˆF3óã|:§¢Vˇ∞wD^ÙNû◊˚^ª\:H“A^æ⁄?|Né^hF∏≤;˝ÿúˆ@úôåÇsﬂ
ô6ó!†n∫¸=£√*X«⁄_ôöqøÔ¡kﬂÚ·~0-≤tºˆ2„qÎ†ÅäO∏6Íáuã.*»å|±+Sùn@˘¡a˙‹ÜÓn±∑êfOW…Â≤÷cgÃ˝1'÷UiñºãÿØ”©Ú?…’Ko‘Ò≈˙( ˚öbÚXÉN?ôNix∫Øæz∏˙ı•bƒ[ƒ;€…ˇ‹iVígVï0±µΩMf,ÂÆúˆíeeœﬂ|®¶>˝"⁄•Ú+Ô˜√ÏkÃ&∂c~ªMá(=Ñπ_€zÀ˘Ö=Æ
÷mó´kÇ_ﬂy¿àœMºj›üôß≠Vo±psomé¬ç…Àø≥Œª≠5]e}…wµ`=Ω€Y”ıíkì¨ÁÃmÓlDıÈxU6ñ€´ˇw∂¶\Ü|ÒÊµôär˚¸X¿⁄àtzÂ⁄`sΩ‹48Ö°Îπ<˜°√£F–H.‰‚\°àHZIA)⁄§':ƒ‰·®s4ÉØÕƒÎ–âIœsÒpÿÉ& ‰sGñh’Êû¯í1d„x8cxÛ+N„+&Ñµÿi}À&∂iaÄz.Ñ*9€ÊlxjŸ…àz†¡èôò≈‚jÎÕ∏:„˚µá»ó≈\™\GôXøMòhzmt…±TÉ»Ç1üih+◊úpDOc¯À\ÓÙRv#v=«?CoW÷ÃTf˝Ò⁄¯æq=bk•I$f	ÿïjõ¿Ò=:+,Mãè1i¨é#>éCe3),ë†b˜◊◊KY{ÍLYÑMÍx\dW´æËòìU∑ΩoÈ¥˛ΩkÒ¯√@◊w£sJ÷»·~â°dqéKÔÉDΩƒ0Ú¶£@©0Å¨á¡‘ıeÁÓ	k¯”öÉzÇ—E›ÀTºöπ˜÷-ö2h≥<è„ë≈]h⁄}ü˙ªólzRVõ‘ß%/≤J{’ù≠vÌ€÷Wâí/õâÇLÔéËÑ–%3«geÄÖ…eÜﬂ≈"°¬ı]UµﬂÚ]{Ÿ å]€ZRàˇë=§6ÕFD0.∆hpÁ&Fﬂ˙#õV)Ñ¥≈3‹Û$˙Çπ<z‘ [*ÕTgóØÎtÒ$∑∫èêâs±{â˛b;Ù-÷Ï1q¢⁄rf≈ÀU]6‚ä%Ÿ‹VJIØÀÅ]ﬂ/˘j÷◊HæÍ√ΩT◊u“<´W£ƒœÍ’(¥zYt™ /xK«™0^våI‹;íYÍ+Úu…ï-òò8r«tñD≠+KJœÜqy‹SG_+ø2Àõ[ëk¿‰N66~:â?ãÇ˝™+ñLc%ó`*ZõÕ\¸∞òÛ r%ñaö ⁄\Û'g“`†˘åÜÛL⁄F2¬ÀBf®eµ6œZynAÎ∆ılOi®Ï+”ìå¨≠F”£çij{q¶©Õ.9HX—öóNB—«ê9ªÑQ†Œ*%ÖﬂY•Ó¨RwV©eÉÔ[/NÂKÊS√˛⁄Å3ÓÃSÍQfû™2Ì;ÛîÚö√<%¸xÄÃ	Vãf$iy´—>
õñåAR∫ŒµiY%ÓH3˝–6≠¯Œ¶•π.Á1OYÂyïØ≈Y¶Æaï∫ÜE T™¨x›Yó*≥º≥.’ÔÍuTñÙ∫T%–72W∑˛ÂO˙g“~¬[~ÌÆ4y~üˇ«ˇMNz«˚/Ò˘◊oNVñbâÖ`2ßOŒ&Ω1î±ß–%Á˙v0Úôm*1LY€ö,∂RWÙ©z53∑≈wÊ∂õ7∑UÍ.O}—%‰S2¿muEâ≈ó„$J"åHN˝€/‡]ÁÙ"_çSú>l°v9√OÃT:∆Í]√1ı}«#É,U€˚ô€ÅW∂€ÉÃ¥Ms∂§∞Q© mî|¬≤J9FyÔh©ÀŒ‹q…≠'p={Nû=?ÈÌø⁄±â!æ|ÕJ*wA˙è⁄öúæï¶
yD~¶¥û‰ZiúÓªê6
†ò®Z°Î¶¬4√∑V±ΩO˝¿”√ÎïU6/¶(âÆî≠Vf6ƒ¡4º¿?{Ç‹úT«—a—¯ÿú=¿“ıÆﬁ◊Àô6Î+n»»îÎÿÈù]i3I˛[:Ω!≥®d‡æ°70Â‚¶∆Êµ‹=vBÊí∫°ºfﬂÔ?ª°·y§ÂÕ[™Öz˘¨ÃuÚ»òú}&ÁÏpœ≈è¡Ç¨«&4‘,êØ≥(≥íóQôÅ|gWV_|u∞L#Î”º¡íŸ€Ó¢%≠ÆªhIiò;{ˆÇÁ0ØïïQqZ8l	Ê—vQ≈l	@_ˇÖ“ñ≥J¡´◊ò†U·•eòÚ¬Y•ÚLw∆uÌ-V∆ı∆?*ßwµ“Vˆ†ö£IåE„T~ÜÁÚ{QîÁïg#ãf¨|ú±N0Üπ˚èv$N©œ?'‚có5!èæs„q[Ò¸ä
∞>Íé A
 ~©∏π¶ˆXaæ0˘Ìö¢d+º¥b^C—º¢∫ß¡tFC\—6ïéı÷J◊ct*~o‰WYÛ/Pƒú÷<˝áv@aMúU9¨/˝œn|±C˛j ºÛØ 6SIπ$˜–vê’3î™´÷∆¥
‹¯•ÊÌWÊçÄıòMq{“.y´†ım‚π∞*≠ﬁY»·«æ3∂7pB¸„ı$ƒ«√‡ÁÏÎgN$>k∆b!˚kg¶ü`j1{·,t=ˆç√~¯6Ò]µ˜Éy™º‹∂¸fZ§YÆ∏À⁄¥≥"V¿◊≤…äe≈^°©3jítyc]‹∂±}SM´U8Ø{C æ©;ƒ«_ü‚§®=ÁÎKÍöπ
&›!O‹ìó*´_©T\3ö$¿π˘ˇY%±áŸÓôüO|%<5[Wî¬∫¸µÔqàÄm∞ñ{˚l‹√Æˆ`U⁄…ïyêUŸ¡4\a.‡ÒıiïL=Ë¨~Î@*ﬁZ_}w˝:0æaÀíC…ói©‡úcm”í‚Ñ∞Ò>!¶∫0_aÉßqóπq€m6QÒ‹ZqúÚ+≤±æn±v»∫ÜyeG3≤iÿ◊lßZíì£ÊNZÍ∞s
Ë«?¶∏
a[^≤?∞õqÎ◊$∫òÇ¿õV„%WO∞î©∂jiÒ¿Ëû·s:∑€uˆN>âÅLv∏j»=9y¡ûÿ«ljêYÒ8ò ≤ä[ú•∆˛îØÒ€)ØËZ\ÿ’l±Z˛„Ô[˙⁄Æx]«ù™
äÿök #Fê¿Ÿ≥∆¸∆îørﬁØ¥ÁlfÉ’‘M«≠õ∑qÊKsÔ‘Ã›rˆ∆˜
* ¿Íﬂk⁄Ìo– eTmΩ::(¥bc&äÍ¡ha(ﬁéG„OyÈ‡∑4ï©wG‚	â€ÍÔÁõ&ûGQ›3Â£∂ÊŒ¬ÅgÄ|hXé|3µÏ ˆ∑ZiŸ‹{∏∆C∫ˆ+˜[◊9ﬂ!|)»”Ùy"ƒı_≠ô,uﬂk«ê<Ín≥π∏∂§m0…áì<d [±Ó{u)k¿ÎXèÜ√“)Â	ì71zÉ0@Á∑®È
EW(πBΩ™≠–jô*ä}oò⁄*4V°Øµ’÷\πúZ∆é•Ûc—ÈïÂ<âÏ‹?Ôl∑û¿≥∂≥^±≤N⁄/∫€Äƒßëm,LÛâ`í'ååòXÆXÿO≠bJl£J–9&[!8^\f'¶|‰ß›j˘¿\U)[W÷ÿÖåá·V.ø]Õ·J∑¥QW-Û∂Óïîáep˙nt’¿:ﬁÕ‹Íüøû∫¡∑Â~ÜÏçÏÒØ‰¨ÍzFπ9ÕoéfÎ”Ü3¥›‰◊ØÑvd|ÇW£ ºpoö0”ı"3ï∞√˙ïHÈq±˚V5÷πú	¬ﬂ_ÜîøîLÑkÎ<*º9µhﬂ=GÒ‚î˛ıÌ]…L¶ÜÄ•º<TN˝Ûº∏ùæY≤t¸é§_2›hEMâF}îhΩ÷ìNcHö¯.≠ÇÆÏs%0¢
íÁn–y+]fß÷’⁄eÈÿ≤Ñˇ&XÆﬁﬂõO4Õæög⁄Y)Ù¬ô|=O∞ÌBÿyÅÎ%<ÆÖó›§“/ıŒQ«‹í_$Ú{Pv!≥∏≥QØtÈ‹g™ëïmïÒ"ÜE6g÷+îaõ<∂Ì94qÚ{Œ†ŸÛ¿Ÿ,B„ów‡—√¿ÔÙ&±{ ﬁé√ÙFîú–3wå≤∏E€Ä⁄¶
k˙_Î"iK™?¶˛àÜ#í∂l:aZªYÒ_Lvàç^ˇâ¶à4RÍõèåz˝+«?√¡˙}„Ò∞=¿q˙éÜ7ÚçFK⁄¨nˆ -ºÛ(ŒB'"øº¡w	Eöq“«ÿMN.’‹π⁄éÎŸ‰•∑\x®¢∫◊Æâ°èl~’⁄ÀÛ´l∞x$7#ÿéoe˝.=ció¿2Yƒ”Î„±iÃ7∫8≥Ü]åÖ⁄6ö†œm‡ò+™3eóí&‚OE·˝nÈHóÚ~/ÅÆ~y√ îUµ≈°qÃk¶Ó›∂≤≥»u»æk.¬ÚÍ|uˆÇzµØ∏ÒÄﬁ¥l›¸QΩ<2Ã•Eeo"æ7˚ZAæäAÊâÙMá±˜U<q1ø∆∞NFÔŒ(›õΩã¥‹1Ô›Æ€C€ÌÉÆ®∏G·º:§ChÈ+m?v=–åoºÇırpu†÷ÑœÒŸˇ‡#˘∂…@mùrV=ÇÚÙÜÏ#ËÊ‡JA5ex1ÓNöàﬂXÜ∏áµ_ëÔ‹—ô_≥Ø4/Ú¢;æ‘›£πŸ¢ÆS`MÅò∫Ns©)â˜§ÏªS¯Kl;!ﬂU+Z≈07Ç·§|øèƒ<
?ñ:ŸM„Œz◊‹'ØÏ<.–’“Ù;´Ó0∫eS…Á…±3q|å—‰F=ÿ7ról.‚ä€~>∆ß1ÌÑÈÉƒy,Ÿäœ.[§6ëRÀ¢≠bù˘Uàx∂h›ö˛¥®ŒÀØ]◊>ªC÷ó†Ìu}Ú Å„#¥h	z[fn#˜á7qîµª<Øïµv‡(æú›ÀKrÓé‚Òi›ˇeã\’Q_ΩÆvXW7ﬁ ⁄‘n^÷~ﬂÇy0Ë*˛Ö€≥hu™Ÿ¶·¬çAi€‡•3s¶Æ«J¡ÛÉÔƒÆ|=‰uñÉΩçπ˛RßÚ¸Vâ;zoec∂©cS∂?7aRã)_c„§YÑ≥T *ÆVT”ç˙U±¨Ât[µ
f˙	ºµq≤hÊˇ@ Wßë}5-√Rp|»ô®cáRª’ÙÏDvº≤%(ZH “Øï,ûa≤Øm`[]Ø◊l∂§ﬁòm^™5S◊©o‹=u£·ı≠–0 MX†q‹kYüKÃcy∆!Ï≠Œ•ªo€‚ú%ÍG}Éô±¿|j´6äâ7rb∏…¥ VÒÈ¥∂¿4˝únÚ@*Û«ﬂﬂ”®-X1√ŒÙq|≈	œÙ•∑¶∆fCJ6YØ∑m„xG<Õæ¸y*™›B&Mı∑Ç·^sî@¨≠ëaêÃ»‡Çú∏±ß.◊«A=√9 ∞ÃÓKÚ6∆G“tÏ´òÌï»cÙå‹_ïì!”Ø¯}¬Yº≥Ù%πÇˇÙiﬁïÂJ≥º≥tm3õaSµ1∫ÏSiî{≈E‡É)MX˘ Œ«pJQ[< /ieç˜ïñªvÃ¸NÌç⁄L]›˘ß\âÆ4WÚ≈.Ÿ–çjz:Õ+˙Bl#G{”>≤€Â‹´ﬂü≠øv””Õ`WØmÕ! ΩúıU›-óï/BóVìg@k…Îñáﬂ™˘±€e+È~ü1≠ö’{/nÁV¥X.\¡ÔíómMıdZƒÇË˜j•Rúâr‚Ø‘+bﬂjO*‡ü‚¯$ºäú⁄^R8åqô≈Õí;≤zãqÌÀ˚‘ùÍö=6µRp<G™CsçcØR'¶R›ÊFN[EÈóöœqƒ™_|˝"¨nSZz¿¢VÅc®†ú≠ªUµ “ñ<Kâ∏J¨÷‡†TßFA{≤†BÇÚèZJº∂?}{>∫à¥˝ã´ãtÚä∫~«ÉñŒΩ(‹Íπ÷)˘‘≈&8·Ä^–ê¥èÍπç‹ïõ›9sûù@nÛ	ÓCû–á]∏·=»@ÁŸ ŒÀ?–ÿ∏ò”<*–Bèx^rÇÈÍò™,EÉ±r⁄∆zëáñzèaõ±OUWÒl`±˚]rÏ¢◊3pˆúpBƒﬁ.¸»ô2j6∫´Í:Ö›u™@⁄»{[ıîom3W˘ìÚ&›|ÓTñã0É›\nöÏx5Ä!ãq~êçYÁêàl7´∫=∑õV“¸o≤PﬁÎgªTπb≥‡`ìh˝~÷Ωß–COô^*díj…ƒ6fq≠s Àó5Ã±w∆Û’	_êU¶◊8¯Ÿ	wÏõ'Ê/ö?ﬂJ¥PâΩõÃ∂RVq∞/ÿ *ÙÀπRÏ‹ÜhøôAªâ<ÛßÓHì¸h3ò2%bªiå@an=}iAHÆQn5Ë2" SÒ:C€¢u,u9ZßñUP%RÀÏß†Ep5bËbRCŸ
C‡≈µlÔNá∏mbS™M+F.VH}ƒÅ∏©˛§Íô?‰/-clªœLÎ7_§A!´o-âˆRÄcÔÜU-˜©k˘Tó™≥Ïv¥ó◊”^BÅÚ©âﬁtHÉQ¨‚'Øƒ‹RÂC‘hé[)%¡Kì‡(*k(grßCñ¡*4A14º3åîQÜ9ﬂﬁ%QÏû^tN|Ó8~£Çï¢Ëÿø˚gr9»îVõÇcïA$∞.>g`3≈“óÍ6“ÃÕÛ≤ﬂPÃo]5ÎÔhﬁˇÍÕaØœ^µ˜¸’õ≤◊˚æwlﬂ¨íMµ·‚‘zU‰ÀÆ Ûmkùs(ÿπ˚|©UKªB)s“ËÄ≥ó?]'ƒyﬁg“<Dò#*÷pÕ)7;Ã[W?YSlqΩÆ„^k∫bù≤ﬁ¯«FqÏÃw8 )ÎÃŒâ%Ác'8=%Ã≥™ÆwPè±âN÷GXÃÛ~äqøÃé]Æ˚{ ı¬ûwB–≤ﬁ;≈Õ…kH)édº°KÇ∫D0è—•B…äqÁ¬˙ÅÉ≠èpÈ¥Ã„ ƒpê%«âªäŸw‘Ì÷ôUß∫öŒC)Tï>/€‚åGH{rﬁπüaµ t‘…2ó—pﬁ>Jon|ÒUw∆§zò©©I]Îõ.ÈçßtDæNËhïÙªGÔ¸ªØMüQì©~≈¥d”õx}[«exUüsy´(ˆÃ›¡=u'4r…Á‰»	c
ö*h´ÔË9húÂKåiîäCáF¿∞B÷¬sˆÇéiòQíNºkå:ì)rŒ#zÊ§Aˆ3ñtñ¿ÓxÆÔ` JÄöç˚¨(»¨{YWû";Mf≈^—Y¬c⁄å'Ó˝Î8ò“ÿç 	˙tL>$û˜k@è!0†	„DÄh¿Px¡ä¿Ù›£{£©Î√««ÌMX+…	˙ègtîê˛¡9†êéæQvÑ©ﬂ’-pÌóïØJ_˛Ãœ:VÄ·ı≥ﬁ+˚OzØ^ˆ…—Û¶¿«Éﬁ·¯©t$m‘„ûÔ¬¢9Gp:˛P:¢/Q©;	ûbZû«˙A îYàã'ôÎGN‹Y'ãG›˙§Z;e.‚œL·*YªøN@˜£0òaˇ#õ¸†√ëK°ç‡‘Œ;öƒe°˝Ò4¿ûô]Ä¨¥¿∞ì±K=¥iE(sÌêıÓó€´$ò—!ktª^-t@˘≤HœlHlTpﬁªq£7m÷ÁcXß,lsÛΩ3~@¢1¡|ÒOïàã&Ó)}ﬂ9ÔLGD∂¿Á¨GU

÷oz—yTLΩÆ‡¶Í®PübKgÉŒñ∆Å8A"«sÜÿÅ¿wÑmW`}Sär”Ÿ*˜«Æ„çzú Ê˝-Ï‰∆£+¢,Î≠f˜%«M4’0ÏóÅÍÜSdø@4˙Rr\5/÷q‚A«ÅäQ≈3ƒˆ≥*m>ü”úÏ^ö0ÅL˜$Ín˚Ä9öêt∏ïﬂÙµ„åê>ı7+´Ö®[Q‹œl~™˘|’Åøc/Í¿ÔP¿ÎaFAÿôÆ∫ûâjs˛¸«ˇ§Xpæv.lÉˇr⁄ e Ñ∆˚Å⁄Ínó˝SÏ[$íîº˜î66jÑö
‡¸≥' ¡≠‰"~≤a¯)ˇÖú∏pVaà!pI¢9ß“á1ﬁ&¨N≥, ç∞ä·d∆¬qpœËHFÎÓ¡Q!q¡‡Õ^?¡=ﬁÂøÉâÈÚ»”qÎ≥vëˆõ√£ﬁ˛≥ïlR]1Ç“áÅÀÖäëfbRp_ê
íë;qCw
ëÔ∆4éz≥9g†%†ıiu;fV¿ùM"!Çu\~ÌA)8X©ã%ïÁŸ˚Aîˇq„4l¶&Ê‚∫]ÑJÓœºæ^ÆŒa¢∂ñ·µ†_Ú≥*´µÚï°Óƒ¥∞∏Iº*≈Át:˚5FZäù ≠ï|úáÜùJ´jî˜ã;SRE ff™N°ÿn]aîè{∑YÅ‘´Ω{›à*eµÑ7÷æ*}y·–S‹∏oì)h˚Û√Ôö)m‡Ö=‚ôêÕÃ‡˜Ó8q0RóL∏Ìù+:}A tœ#É-Ó›åg›¿Ñ∆¡àô§∞◊"∆◊{†oë5Ú⁄GªêÜ’~‹€xt…I*Ê.≈nñOJúÀ tËı&À-eÚÊ>ﬂÃŒ¢ˆMkN ≤m){ºj…·W—®JwUv˛óœ¥Ú∞‰r@≠?ˇÒˇﬂˇ˝{C÷ØZqR«jR%;Zã¢}˙ÀÜ©¯›4Uã™†ZuTèuıìjG’òQ⁄•¶ﬁÓ
◊n†R3m625-°ªaÁñ§∏±%Èì1†å‹}ß£›K7‚Ö¡–â"80k.≥˜ù-X‘ŸÖ∆EæYçº¬ïMﬂ∏#ÃóÚ©Ã4e“{Iéú¢—¶d“±≥·ú$q2É#;ì—j≠Jù9Á:–t≈3å°—Ö?$&ºaeÅ‡~6j6„Áä(H†E†˝
Ì8LúÎc,FxQS2ÂªÑûS7&–€ÖcƒP gé#≥áˇu£dà31—©NC{+!ÇCKŸód‡ÑcπÏgjΩ∫'LRô*µ:ßß(± ûq[R◊PM––◊@>qßNêƒ∆˙wŸÕ∂<D∑ 5è\≠ q}±ë+‚x@•⁄Çü˛¸Oˇ∑‡6±«,ÏÛW]'Ó∑|Aœ@Fú:”ûVëdÄk]˝4«rk ¡1«§/÷cWub-˝K'ên¿…Ç¶ÃwîO˝nK 9≈#OOHj>•∞˙∫1Á∞Øªø/ò˝YÊ…|÷í:„ÔÈóYJ˜BY2˜Çó>,Ûz·∫öé“OôuªdÿW˚x6∫€vÁÉÇGk√Ωk#åéùS¿÷Ò”Û‘W¥UàAﬁ¿N4s˝ñ⁄âƒÜaÚAä·›n◊(Õ+«—ájÎ°:v@åŒ!Ø{∫JˆR{æƒ0€ËøZôdÖ◊ﬂÏe)~ï;n.o9¢ÎÚo¬ß4EiI“€pNoÃŒi_Ût¥3Î<≤w9ﬂá;ÑœπÍŸxPt2≥G∆ù∑_Æˇ<˛¡Ïq∆Üoä/∆f+ÅOˆ&E∏Å¿h»4¡1ÇÀÌQU%•Öª¨Ÿƒ¢1ÏÙ§£2ëX:≠’ûö˝)=sˆáJ9µÍ<¶dÎ)Kö%pà®’>¡™éçÎ8¬À1ö#Acz8
/¸w4!OY\ŒÀ¿sX€üó†n'‰7«§]¢oëÀs•∑ﬁ3ìJ9oÍv7Ë¶Í˝”*ıjÜ•™…§∂˚£vã1úØ»‹âF!:πD!èûÁ,F1nØ¨≤¬áDΩ“
qéj‰ïnf"GnZºÆ|°RéÖxŸ,d@gyÃVeN@õx¢¶ÿ êÙ_˛Ùüˇ;ãJÑ”È£Fÿ⁄ﬂ®Ñ+6ª∂ïÌöΩM‡VÙ›Ü§6 &¥4ZtS¿ù‚‡a…Rõ{°C…w!≈©X2•”üÃ¬Œ?864'ÜbÓhWMﬂf±?;—K©‰,‘+ﬂùr®™˙†”„ñ¬8¨·Î∑˙ZËÉYÏNÅÜ@ò9C˜‘2-ÈB.∏135a»Ò3(Cö‰˚Îˇâ¶;r@>áú≠d·{ÒãÅKô£h¨Úi$7Z1ÚÌö*ì7øÙ]—Üô(9&˜py™C∆®5æ6’LùY≤L·»0{¯Ë>{rá¥¯≥¶˛Q∆t·ÇÂ›pıwgâ´ŸbôÛUä—’ª•hkÛ≥nt:?ªŒ˘Ó%‡L7kï06C•®››VFÎÉ‰K≤µõπÜb6ñÀ◊üˇ¯ò- ~z∆Ç¶›Iªå˜F‰UBC~ö&Wì@hLˆ—â# ìÕÏx™˝“^ıL?Ê÷˚GØèO»ã7«o»Á‰ªﬁ´}ÚÚ˘´^CØü~S‡dón¥?e-4:;·Îh çt÷Ç*˙†'íœﬂ¢çæV£∆7è^ö´¢´≤éj‘Ksm4{∆4m˝Ü:EV»ÇMîW°ö>⁄’¥tfß˙ÿ{PU7i>çÖÉıä¶®ﬂK}
¥Æ<Õ„Òñ∆Â¸e* ïtº´‹@èÖóºôy=ıÇdTy≈¥Ê‡Æã≈NmTÓ¿Èô—plÊreÇcÂAYûÙ8ò:aLı«⁄W§ızXLô—5˚"	,8O…‹˚Mh-ÉéJH˚iˇ∑Õ3u∆[ ÔgïE…ª0çï‚'^/x&<1ù·˝Ëîô∫$Ò„dÇ1∏gl…nAã=N˛é’Åúg∏ ØbZ“‡¢^5Pg3ª˝xf|Ø0`a}Ø3©3yIí¢JQIO⁄,ÍI€™˜á¯\QÌèˇuJDîDtΩwùÀ⁄Wdî˙Å¿<ñ·Qπ—%')Ç}8áäºPj¨í≈Ÿ+Vœ!’r<5*≈WÅF¡>á¡πŸv®áI=õ4O≠$fQG,OA¨uÃ`I1É–˜∆%„lõÃ˝€Êg´÷åUf≠3«”c*Q¶`é9I⁄‰M+C›(—1∫Õ0µò†ÉÓ@¬B7bÂq0&Ìà¬Í?º\ñÄ Hœ@àÓ˘#
œhåñé)p_PåA~"$o–á›Q≠£¡T;‡ÄÂ∫é®y◊Í¬7˘ÈÃ2©ò"Fπã…<.<πß p‚ª“éY]#÷ÅµJfÿe5^3XÄ3∏ÁHŸ
¿`ß°k·C…$à@ß	ñwÒî&^úÊ|ÑVãläsãˇ†UeL÷>{_˘”Œr”Òúg¡πèXJõw€ä’≈∞ÈñQ⁄ñ‘	B2O37˝ûÖ@R¿;q–	…iLek0|©∂óçSl√˘âô{è•√RoÆ∑ÙÍè”ïKO’˚µ‘"À$ ÷ôù¶ì∞∂H•‚HÀ£◊∂À∆€,ûp˚c?Ÿ‰ò…Îûmœ'J±œêG˜òì©OÅ_Ì˚Í»›∆ßJVË©—π"†b'« NÄ…püÂ;xÕ±Cä≤5çpM1}p‚§GêD∑xƒ˘gŒ»ç	.tnPV±c%%≥TyZ%gB&¯%g—º#J‡=,π‘ı–∆F–”*¸Ë%l\VñpÏ_–,ö–s8≤Su∆£,®óeæôçêpò¢íß.1˜\˛˘{	"s_,OÒ[∞Òÿ°ﬁ'√ƒ´ºÅÈÁ◊‰‰öØï⁄—fó|ç8Ωèb!ËGÃÁ4üZ§â.Ë¿ÒÏTâáz„≤Œ1r‰zÓòOVé|√Ç-ü#ï#Â+◊àd•¡Òc-+¶2¢—ÿ’hq
—ˇïöík€›;smi6õIÎFFé§#ﬂ–9›Ωå9e‚±M>vNuJáCgÔ∂∫√ËgK 6p¯ÕπÅ |X|n|≥ ~:à/∫MMÀiå˜zŸY+Ã£cˆ?5D:û]MjìÅQe™`…”©q1√ÖºFnw4x#d√%ÁõFÓa,Ufï)˜0mÄΩ
è≤àeÊ„— ôÛs	NCeHì’îÖî≈ÇÚl|à¡<ûDà∏©j<s¶nÁÔ$òR“^]a‡käÅ'~ÔØuÍâô/Î,ﬂÕôÚ!´0§åEh9rJŸ‹¨¯ú≈8“òT% úë¢∫1T .cJá'ÀNU∏OÉ—©fÅXîßn8Ñç'd±ÛJ&àñaFÎº>°–VV¨ﬂÇíŒîïˇ
oÎÛ‘ÉÜ˚%•v©5ØÕÌÍæ
mŒªw,∫˜ÊˆÓ˚&VÚ&w(r´KÑ”ùÙ∂„ÀøIä(◊ImDmw[U§C«£†°„Nåd}9Ø∞ÜWz…§ﬁ∂~…Æ»Z7¶Q¿˝”#Ê·◊∫H$hñN#5á¡PÜ˙BÑxâín†*
êAO√ ¬‘ﬁô;æ¸`h∞w2úlÌ/¯°Fﬁ∞ø˛≠¡tX{nY·ïÖ£ÏÆûÌÕM∂™Ê uÈ≈∆ﬁ¢¯PÓ	/u˜0	Z¨ﬁøŒM£0‚N.@˝úu÷ıŒss„⁄⁄^•~	"FrÑ‡ç≠'=@ö˙¶∫AZOﬁdVı˘«`Öt^9ÿrvùqåè]œ–ƒØØHã◊cŸsßñ8UˇÃñ(:“Õ”õ{`G7µûenÛ@Ê
 µ-,x˚
†jå≠ª ‚É}…r˘ùëõLÀ¨>u1Óûäô≥P≈08∑Ìﬁ†Ì€†“•kq©\∞‹	a2 t◊çûøﬁm Ë*Ω∞|™¿+7xÙ:∑qe∫¢§>¨d”ÛÔ%Ó*7—nZ0ù€m†∑¨ªo◊Ã√f5tÂ
™+í	πãY.LÑçW§Æl∫M¡t∂ñãÁó"ßÙËcHùJ7
≤
–&@ﬁ&Äv]ÌÆ.·…ÑsÀ‡±xbá=%Éw†x‹>í›∑[Ñ1ıãœÀ)K'Œ<Ì'pÿ42∏Ü˜§˝å;ˆçñ¸¬◊ﬂÿ∫F¶Æ'5Ìå≠öæÊ,—Ç^‰jHï™(À\a´KË'ÁŒk3°≤û"%J©dBÂ^ÜÃ83O®Kx"k§ÔxND´NÎ‹!µ(s»µR‘‰¬)'≤°HS8E⁄¡‘ΩÈìÿ)<kì—∂ùmù•3œRîúî•≈‹Ú"Ì¨≤6é.û”ò¥(Úâ≥”§!U◊‘¿ÏR—¿ƒx£SÀ≤ÄÆûüâ?Ò"!º(iN8ØjÌU⁄»ì1RÁ”’1À‚WÛgêÙüˆüc∆ÛÀﬁ¡Û„^9i‰7aH}_ì0ÚõcÒÎ&ƒ†iPQñU2—~üÂâ4´ΩãCÓm˚n§Ãg„eÄ¶sbˇn6|˜‘ıGU¸hÛQ"¨ü 
<û;·S9»§Ad´|[.˝R… B◊ºxª™¢∞˝~±tkvw5óàùÖÖ’îa)ÆÿUyüzÄûÖÉG5®¸‘öØU⁄/à_MvÀ9z~‹ﬂÔü<?<!{ØON^ê√ﬁo˜_ÙNˆ_íΩﬁ1i√J–êFË7Ï;”CE1î‘Bôz4Ä*¶åk:E?1≥≤≤Ú˜sÉÑF¿ìS’∑Î?vÓc]∆M¯'<–ˆ˙*˚ØªæΩÚCÇ¬YÂt¥#ló©ÿ@Ô-Ú–qg„A]j#3«O»i:¬⁄q·≥2£≤N¨ÒΩR†∏ÍŸß;Òåy˚Ä¨∆˙	¥[!{k9A1vú°É0*0∞Äo’@;Ãﬂ&Õ‹ÍÎïm:vÅëï3√J˝◊§ÏtzÂ#LAëœ.©XÆØâıE\hj»ÉF5-◊$HJ|˜∏D¡¬óøÆœ!´Ú-∞"6q:o7YV&/˝j£À∫D˘«ö·p°vïÖùÖßÉ‹Ü≈-¨ß∫•› ÓÅTå3(ü•
!4£æM‡H¨6«çSö8î~úûM„;zÀP¢∞,ß:tl,úÍ
 +$∂*5*nZJ˙¨l∆¬®¥‹a°	çnë∂hßuÛTÍÒ›hÜÈä,ú6A!z:¶aºµpïA˛(ŒE‡Öëú†ô9âÓ>iÔÖiﬂ<Ÿ“W›^Ü˘ö,ûÙœ;l\8Âa˛(hØÚ‚ƒ“tÿ9Èo=◊«¨ë„$àÈd5”±‰Ç®≤Lam¥a±_Ó±OüyE“4NRØËEêƒXU™9Qï´ßõ€!î2\<öf[ëFaVíÒ©Ôax
ö»1*.ˆ ç'Œ™ob%Øñx[ÀÆ´ha“eõfi”õß±´G≥ﬁ›≤©CSΩßÜÆ’^&CZnFxt8iÈ—Õr ‰÷∆˙˙/%∑§EPO,ùºaåú‹ÒF‰|H3h;k≠íùŒ‡”Ÿ‹^≈pΩ”Sﬂâ¢¨=n¨‡S04n<ò◊“ò≤•∏≥UlõöFaÛä=äF®iÈ¨J[)z1t6JÓô≤è†qÏo%~1gêXÑ÷∂∏l:MœGCh≠2≈XWL„¸g‰{îfÄ®¿–{\ä9¿Âà¢i⁄Æ¶7AWèÃM[\í71ù™ì–T)æçã–Ã≈*Vó!,DvÆ+äoñkl6àº}≈jÛxùYπM≈
]ß¨L©f„&ö˙Û?∑x+UÂœÄı4±ﬂô◊s:xåu¢ŸtpùÆ/í¡G“w‡(ª§Ãbjî∞Ù™Ì ÄÅ ¿Ω-F*ïx(°ö‘çøó+™)"@Ã˘ÍZºTYúÓ©À ?P‰EIuOΩ3s¯ó?˝›?4„O˙§n´JﬂZ>Öºoª.√#-„ïŒ˚Kc§mˇË`⁄Õákœ#›[◊∆€÷ô≈(—b∞Á#=€)÷e(Ì[æYÜ©ÇBÁJ˛#™äräâîùµˆ(Õû ÑÙÿòVGüÇ`Öı—∞-0VJV	–ìË8å’q&X‰ ≈¬_Å#z”ê`N’°Itµ¥âå⁄¯üõoÄï≥¬wttN=3º)ˆ&‰ßMŒ›2ijÌ~µ˘ˆíÒ5ñ™ﬂwπ\éÅ∑˝·˜∫:‰s∞7{Ê$ 4Ò¶áÓ$"ﬂ2‰– ªé/’Pnæ@ç	˜ï;¶,òÖ«17ØAÇ—IòåyÖÚ9´k¯È*ıí©Ô.ø‘"Dﬂ™4ºlD|·x®2*R≈/∂Îi¯Ô~˚\{ﬂc∏B⁄Ø/â®Ø+\:'äî68v©èIó¨tGfq∞‡áËÿø‡°≤X⁄î“Âr~îÙõ:êˇ¶R$›~Gïïä Ôı@Xú´øˇèÀHìº	åä¶9KAîºíRÏÜÇá%6–K˙∏º∂>®∆)à¡üYÚ°EqeíÙ‡ÅJâá∫í6ÁÔˇÎ2ÈK«<JÚRzKA§*°Ä¬AôúQ8÷y·ÓñÌôŒíREæOáB”4¡;“¥TKî)y&ÎÛÔˇÁf^s)ÛÄ˙Ùp=ü7ƒ=C—5¶ÉÄôÊ¥»ı—Oáß	HwäË‚»C—ŒŸä_lÑﬁ¸˜ÀH∂,∂ï0åY
ä©i\ñù∞æÙ‰s¸Ä‹%t&Ï≠ÁRVh(°H∆≈`Úèêv…$˘—EœÔ˝.◊±˚˚?,#˝Óæê}ƒlÆéD£ï,?êHÏá©∞ﬁÙf‡Ã¿‰ÒjKÑµ} ®‚ßÅÁö·&5ì˚I}ñ5ˇ—£Æ∂—ÏΩ7¶˜Åó(OkˆΩÕY˝ˇgi]Í&èaÅƒö•†ıgLÔ]%ÿÊcïåÈ,IsÀ≈πÉ‰ç¡CnÇ¿Ûò>V_àJ©5Ú>Bí˛©{vßhsñÑ3OIù‚óz˙¸Û?˝ó‚ó≠ß–Ô∆4éz≥ô¿˛˝‘4ªT˙í!'P »Œ,n∂?vŒÈElq>£æ¸q”f‡ø
Œ,ˇˇyˆπ˝àUö¥	%˚ºΩæ∂%Q™¯nπ5∫R/∞9EˇÈ‹>ç2‡jÏT®RÚ∫µã•K±çÕeàN±S]&√—ön¬÷≥åG*U˜Kòóï∑óæ≈\Öﬂ$@g¨ÉBkêQ⁄‰ÄE~‡È$;≈<ñŸPﬂ›kÀPÙjW∫,Ò¬—"}væ‘ÜãäK§§
{≠„f!x%vkË≠VTn:®íˇK4Ï±Fn¿è≈ZcüP≈û©I∆˙ò»Sc¬)U∂ß-Ki
èÎ-t.ù8SÏ’áw±òi‡ªqPŒQ«K‰ÑÆ"WMfÖWßKﬁÑ»ÉÉ(&ﬂU+=´€ö÷E@ã˙Ô∫≠è’€ò5)ˆ,ˇ™Kgì7°G~˜;“˙Wö⁄π ˛û9±ˆ—ØHÎG¿(Ç…FàòßÆÔh ¯Öé∑€ÚÉ`ÜAê∂Ã9u¬P◊≥'?√A»À¸‹SCß*˚ì^NÛË‡~Q˜Owz‚E±Ç©î`ÎïÎOp˙	K$GaÄ±ù¿ˇ¶d‰“8		Îo»‰i‡œ!ÏÍ∂ %åÚKåzeïw)´Â∞¨È‘á9#™¥ã|·∏≠oÆn√$ó◊ÏÄTJg€g∫≠Qo•v•x∆†‰VDßoß_VÉ€ãΩyëBπ=CŒèççùπ•<ôJˆQZÓÅ≤îÏËO™-’ﬁ˝)„Ÿ÷Z∑¶i©5ÕÔ¶T‚låf˚B≤‘D9¢õ°BGî–√éÌùçπ^á}ƒnp5Á§ı›⁄÷¨°éZl˚\HÁNÎIJ‘Ω£ó¶™pT›ï±	SvÉh^¶,]R¶Ã°˚@LŸ}›øc»a»|kr4π(f•¡ﬂFå_ÊµQ·â„üÛ-A€ª˘&¯nÕÚÁ|W„ÊπH≥lyk8nıKÖÜÿ®g˛óe—EVMs'ıÒrØ3KMíÙƒK7¬bá›\≠Œ©Æ®òß~oõ
%ã?5óø\__{ ¯^3ÙÑÂÊq∫<qeÆ<®=à@òˇÂvô…©“Ê7≤'6 ∑W;≈ûV”Q9{ª™:ÀÊ§<kª‹»¶h⁄îì∫Yôr@záK®QÌ£\éà‡ ¬Ç+˜è∑™… ”2À’◊˘m–•©Z≤˜°∂d/¨FpÆ¨€ª«fó".èù‡ˆõ
ç∑*≥U©Îy√±p‹~§R[˜#ó-Ö.ËiHY/@üÎ‰k¯ùå›ÎÆ ŸhDLªQ:Yx{alÅËLèéÀöwEÔVôà#C,=¯˝d0≈≤4∫áD+Ÿ»1LDö2~ ºü˚ :µÃÄÀ˘kx◊n±…c‡-ô¬*a7UT¬&~OÌ§	z¸Í/Uv-ˆÃ¡>*¨©a7›i{≈¬%4∫Ù˘êì‰]¬rΩ	·±C£Ü¿ı±4≥y,îï≈ó∞1hïØXQ_ˆ> Zé.Ì8LT˜2`¯Ó Mkk‰k Ñ¥z2Øßå’Ü"·:'˚œ*Ò“ÀQ<:	¯ÍÀ/KòAÀ¡L%‹¨ ∆§ñ^´ﬁùËß∏KË9uc .ﬁÚ&+∆\zΩFm È}Gû)ñèVãÒÿù§t+|£æó±3l/≈qÉsBçz‡L©Îf_1NÛS÷ãœ∞ØLœ∞J|wÔà›¡œÊª9Å§˜Ûøj∆œâ>{M˛ïÍŸ+‚‚≈–ÅÔ≥^ÌÀ)&åN*Ò»A=8ı‘‹Õgou´4c”˝5JËOLÅ∂)òå˚„VgŒ¥?ª,£‰ûwc÷{‰bÿ0´.6s`)¶Y~ÈëÊÑ„˝Ô®«‹,òã;Ôlœ>ê Äk∏X›õE0t“Èπöy^vC& s1Õ»≠ÙåzË99sÅWO®à[ÒXà‡q8Ã&∆LÅßSƒ’NÀ*W÷É[9ÿƒÓàbœdêƒÿZ´ˆª˙ß◊Ö7T3öu∂UEÜÃÑ.ß˘$‘=9tÌÉÖ?V·≈›LÂZˆW±GIÍàî,zŸµﬁ9®Í+|_ŸõV”cÇ∑ÄêW·JÎJRÈÇ’û±ı]’ı9≥÷Ù7e©]ß¶#&‘q‰Ï)ˆØ±´ÄL.P˙3ıXÈ“π™R◊ÛÜÒB¬U[ßÀçê]6l]…"°·qWø¿∫ÕjÑœi0L¢‘:î≈¶Øó¨FYOùbã◊≤7üªO•Z/yîãRƒ˚õƒùrù@M|A0c}[¯í∂ZO:ù¬ûu:è◊¯-™ß≥ˆJ&Úô‰§c§\J”û8˜"ﬁ©	Ì=mqO©À∆=VÛ”∂[¿S¶†∫«±dÓºàèk>/ŒŸV•Iø‘IÈ›(Ä≥ºMW…Ä!=eáq◊–ÄÒ4òŒhË¥ÏÀÕ¨qfdÏòô¢Îóâ≤ˆUJòÏ˝Œ¬Ô\8h_ä˘_≠ê9‹ÔÔ∞ﬂ\MCm‰z\T7f ∏à],≈rÒŒäÚëG
¢{˛È˙≥D≈>y‹j(*ˆQ`Æ(ï7„´¯ƒÌ≤‘ZﬁY≤ûeÕdõŒ ·˝1 P…f±ñmZ!™uú∞Œˆ√	w[O¸`ºC˙G‰–9»&≤Quk‰"ÊÍKCDîÙû•∆Gi≠dWœ_ñˆ∏ÒJìﬂ¶«L2ïC∫Ä~'â£0ëMúô0∆Æ¢ıÜ·Â™rì$v•_…(ò∫ò≈F∏99N0”ç†nz÷ÌvkÒñkËÕPVhı!∂N]…>dUûou”»€ô9LQc≤_l˚Mµ˘ßfÛbÁ˘&ñùΩ€ä¨ioJ’!´Ø1Yˆ”7ËÃ©†V]3¡∫UéòŸAµ rSÕ¢ë¢Ÿ™¸^ŸZäÔ}aÂï¨F2[/ßæF§¢ï¶›⁄W=ÂŒt∆|∂»ù–…]Ù‡br≥"ß&÷∏¯:íäﬁeï◊πhÓt>pGlëˆorÏ` u±o£!Ω∞MVﬂâ?ÁPu 4<X°CÙÄ1sÓ±Á¿ÛïyyÔj≤⁄~—¸Ãúì+$˚(˚¬2√X∆«≤	—›LüR Q‹¶ò#À ŸΩ¬]}üŒNOi»ˆG˘ÔØ˘˘t
hÁ7Ùÿﬂ˘ÔhÙ‚1È˚‚Èûhî˘‚L∞}fÁ¸™+ˇä∂ ˘√C[—æD±¸dˆw(6&Ìâ+/í¯…å U-!@æM}˙3–ÏRÇ`¢ﬁ™{˜fÚÔ¬xd„Hq?O
Õü÷ì›KÛ‡l"î≠1,ä¸ó4T!∂¶OWöuF°Ä¿Wø¯≈⁄Zµ=¶ˆ¬ª˜üΩ>|ﬁﬂÔíìÔè^ø8Ó}Û=˘úºz˛Ï≈Ûcr¸¸ÈÎ√ß˚ØˆY[Œ>˘Ê˘+Ï€Ÿ=ø8M|éW»vhºÔèﬂA˜˙â;ŸûNgmÓeøBˇ÷‚_I?0˙eŒUqÀä|íVßÖTáÇ∆π€∫˙Œ9aÍk˙ÃØ•¶på—«˜V¨eÎ[ÍÉ>Óf˛÷◊Œ ,~s ÚiúˇŸõÖÆ'˝ÍH∑~õ¯Öø<ÈØﬁY®Â_ÙùÍ¿…y≠◊ì8(|q'\Ò–à‰o~êß7¢0∑QƒN∂’π√œ|ﬁ≤ªs{•0»ÖC√tîØ’øáøã#çÉÔË≥Mj≥øÅØ¢ˆ JwFG¿¬∏ΩπJZÎ≠"Æ_zÏ¿ıìÿ1<(ˆ˚ßœ.anW‰≥K=~@0ØV·Bsµø∏˛˘nÔ'|Úä—1M⁄N¶Æ>1ñ¿vNÜ°Á¿ã›”Œ_€>®>∆P˘	.w)˘|ÅôR?i+ﬁò~%4˝ªgŸg8ÂiäR-t˘ÏüN≥@·g9ùÅ¶ùæp¿ı‰øgâóﬂ9Xqá„€\§"1#Úòllñ÷ÑÕ‰≠∏·æÄÃiU|ns]Ò\e…Hál¿ç_ê·Ph«yæ4`j¶,|@„q˜‘Ç0{xﬂ/I…Ç∞˘√ˇøPéê>ˆK|å›±bòe*Xœêπax√ú◊ıc¬è◊öjqÆ0µsµô¨j∂Ó ©õlÕlØ;·“å@ıÆù± Ó⁄ïA|"∫%à%(ëÅ nÎ∆Å‡í¸lœXîõüﬂ!≈~Ñ«…Ã•cêI¶&N5ÙÍˇﬁøK§˘∞èt·”++)õ»Ô››%Î˘ë{xÑøçt”É'AqÆÈ +"™:Ãﬁ–^˚ÎËãµ3`ÔÑ≥w12å—≈ë›^_%d.·J˘¢tœÁ.4Wø¯ˇ   ˇˇ  „π€