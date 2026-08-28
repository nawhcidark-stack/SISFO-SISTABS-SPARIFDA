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
import { MysqlDatabaseToolCard } from "./MysqlDatabaseToolCard";
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
            {/* MySQL & phpMyAdmin Database Migration Tool Card */}
            <MysqlDatabaseToolCard
              studentsCount={students?.length || 0}
              sppBillsCount={bills?.length || 0}
              treasurerCount={treasurerTransactions?.length || 0}
              attendanceCount={attendanceLogs?.length || 0}
              schedulesCount={classSchedules?.length || 0}
            />
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 text-xs text-left text-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    Sistem Backup &amp; Pemulihan Data Database
                  </h3>
                  <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed font-semibold">
                    Kelola pencadangan data database periodik (Siswa, Tagihan, Tabungan, Absensi, Jurnal, Kesiswaan, Sarpras, dsb) untuk mengamankan seluruh informasi sekolah tanpa mencadangkan atau mengubah sistem/konfigurasi aplikasi.
                  </p>
                </div>
              </div>

              {/* Status & Feedback Messages */}
              {backupSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div className="flex-1">{backupSuccessMessage}</div>
                  <button onClick={() => setBackupSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 text-[11px] font-extrabold cursor-pointer select-none">&times;</button>
                </div>
              )}

              {backupErrorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-750 shrink-0 mt-0.5" />
                  <div className="flex-1">{backupErrorMessage}</div>
                  <button onClick={() => setBackupErrorMessage(null)} className="text-red-650 hover:text-red-850 text-[11px] font-extrabold cursor-pointer select-none">&times;</button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Config / Auto-backup settings */}
                <div className="xúÏ}Yo\IvÊªET¢ 'ªï‹$™$6•Bí¨ÖMIE+)7ÂFWdfêyïwIﬂE$Õ"‡åÿÄªgÄ1<(èaÛ>/˝0ø¶ˇÄÎ'Ã9q˜ÿn2)©ñ JïÃº7÷≥≈9ﬂÒœw'ë?H4Ïê3ü]Ú%9ßã¡Cˇ≠ÔêÒ˘ Òi ;õd≈SÀˇ…Ø∑77Ie·îM€ó~ÔŸüëVŸ√∑êâOì‰%ÿ”^ .”¡◊[õãÀﬂí≥(L„»ü˛≠NΩÛh	4õ-,û–Ñë4¶ìπû.<ﬁ?öÃïo"‰OˇÙ?ˇ„èˇ@é£Ã;œböxd*grHS:∆÷æJ£Ä¶^¢ÍÈvıŸü©~özo´c‡SÊ•,H¶–≠7YízgWÉ1K/a‡Ù]Ã‡)Î‹i¶NÛﬁ⁄RmÆÔhÍ*¶æ1›¢#è77{œF)M≥D;[˘‘8æß∫ƒï7Ì¿êy6ı≤†˜ÏÄNix>á Sx#ˇáø6aS2fÒú˙‘ÙÚΩò!ÕO„,M£P”ÁÙjèÙ4œD·ÅÔMÊOØ˚k‰È32£·‘g#˙ñâi:‡€¨ˇ—X|Xg!˚lzü‰_x∏3ﬁRˇÀ(ãìÚÎÄ^ä‡ªèä⁄4K£√Ë"Ù#:}M®øv£ÈV9—◊ﬂƒf÷{Àà˙^»|ÉÃè»≈`kã$≥ÿÁÉM2ÅDÒ`Ò.˚Ó,Û˝|WnÁ‡ºÖ0·1Ïk¬?{©Ö∏·¢8!S8V¸o‹øÌ  RXÿIñÏ¬'ﬁè0
˘¯∫15‰S“ÉC!è˘#ÿxdóSâﬁÕ7ÍaªÓΩÎo‰ Ï-å =ë≥√iLœLœé‹Yç˘»Om2£”Ëbê¿ÔH~6+≥°üÂòyE>ƒÀ¡sı>h≤°€‡bè*I´ÿ¸ÆÙ™F7∂¥tcœßcÊÎésIó˘IÜ_b⁄§(ë¢h÷ÎHû	r¬¬	?˛∞|˝_”`M3|ﬁMOÊ≥I™yº$É˝†<å∫£'N˘9TÎ3”ôo˘óY ‘™œ÷Sü≥tùø|Ì.Œ|ÔBl”≈`[phW”†˘ﬁ´8∫‚+ŸZy^õÑÑ7yô®	®ˆ»F~Üƒı∂Ä˚∞‘£≤E`Ïmàük?*j?Z¢ˆ÷v˘Úm¨O˙Øÿ<
X8·a≠ck€ã÷∂ä÷æ§±G√Æ=|\4Ù±hhõ`SdƒÄ#vÓÿ÷£≤A¯,Z|DÌ<≥v∏/?e?ÙÇŒ/ 4
È"ôE)9Ù‡‡"K /\d:˙#$åêùÑx!lÌØÙ÷∆‚F·J≥rÚ¶ëh‘Tè|˚-Ÿ⁄¸a”9#a”±jµ¸d}G'',xœºNıDªgQÏUò˛4£$ír9ôz3∫ ¡˝ç7ß$ÄÉ:ˆfÉ ùÄ–„ë,L≥9¸ûœ‘ÄOA{Î∫ìÆë≥ıÁ¸z„d´KÚÂ
ï¶@Y»Ë¬K'3Úã’RˇËı©◊·4õÍ9f†î@+X|'™T]≠qrFŒ<¶JhtÖjUÏú1ç32g‰‰Ä¯0ï\À∫ïíıì–±ZÉ˚Ii[ —øsΩ…°¥°,•‹™ë”ä!Rÿ$ãt yû‹+-:∑ÒxSa¥€÷T*™◊$∞5Í+©ŒVa£À9ï;m¨´ﬁ≥™æw b:üyÒÓ2ƒPÕŸë¸Ea§Ì¨MæU†ΩT,“©0ÿ'!ª@ìÎ´üX[O#æ•ÿ(≈ΩŸÔy”¡—ao7‘>ÛÅ¸û∞8§≥ûéö,K[?¥u%ﬂdixEWøt5#É_Y ‹∆rÔ^A¯Ch≈º∫ı'å´;XÌíö	«+ñ§Q2iD–∞œëÖè@˚B*ËLA yÿô~Ë®«;4‡Ú˝wøˇw8NAÊÉdrKtiéÓÀ)ZÉÈë•£ø-\D´ù¶tÓ3:≈˛£ p…ÙgÈ$ÉÉ°ª¶ôKê√)˝îúx0¬⁄√ø}ı≤ÿ˘†e¥Ô,Y≤i!üG>ùÂñr/.¯oÅj@∞ Å‰ªæµºIºàÖN¯_∏j„Ö<[m´±ëî2º¸≥)Mi2É≥€í‚g—[7t≤áxïã
ÚÅB¥ŸŸ‹ÿ⁄$ã+º∑∫Ñ›_—õˆ™R÷¢æNI∞©	µ1JSÜÿ@‚;·⁄{Ω@Â¿è≤),«ﬂÄµı¯¶*Pyâÿ„∞ﬂ8	ê“34Ùú¢1ån¬jÁmG vàV∏·]Èp¨EìüÏòh2–0}ﬂG9Hu[◊∂Û˙˙:Ôø8úË5o¢˙Îoí(\”“cÛ¡7¯qK=ÿY¥ ‰sli∫KFG£ﬂâÆˇÓº«Kv◊ XÃNπ“ÖîEßrB'∂HüˆxıèMΩÑ3X›æ‘ØFij
ù§‹üo„ıqëıµ+´4Û¶S¶Ì¢Vz◊ZÌ43´cÕú1{Á≥éÎîÌí4ÃÄ1ÀÌ	√˘9PÅ{˘â4‘$@ãa‚î<ªI]¸ m¸'
∆¨Îõ≠‡≠˝*ÓÎó°;V~OÇ1Í4&∂ˇ«⁄ïPqÂÑq◊ù„sç3
GŸ8“|3ƒ∫-∑pã–KeJ“yÑgüh±ƒáŸYj‚]LﬂJ´˜!KÊ±∑ nøA`Q,h–R£Iõ˜¬L_r
ÉØ÷ìBbˆ◊ô≥©·ëÖO'l„`Ò”àÁi4 ∆\©öÉtÔ!ØòÉ¿ë‹G©çV®áúú‹'Sﬂ_7Ω>∑éÛ¡√¥L`ZêÛÎ©é¬@û0©*Th⁄ªMﬁï=ªêMWe”∆¢ïÃ‹»hÃ7K¬†ß·«àç«T©ﬂüVˇ8¨å∫),ÇSºl7Z–âó^!Ω‰≥#÷§<]’U®âéM¡≤j4…¿91òæ~œ¥∏\W’ﬁµ‰4∑7Í¶“†57g$≥æaÔÓô¯˘;ãY2;∏»%Ÿ5ZöÀ´…¬{&Iî7∆I¯–\‚(a	Ñ6qw•˛W‘ﬁo3∂?Kºx,\Ó·Mã,Û›‚8¥¶<ãπ∞£Œo9LΩyBoæƒ_ë-v∑P<íDg)ß√ıŒù+·–o›˛Œ¶ èœ^yÙä¶‰øÇ;j_ﬁ∑…aíuîÓtv≥fëÏù»•˘ §rir∆“…ÃrÌ[ßÆœ#nÕ∞÷©…ñÖ c†¨;%◊Úœ+D¥J‚å˙∏ûär≤I*≤PwÍ◊&W[≈ª>1Uï[ê0PPTÍg#vNc[l
û˘ÄÍé!'„≠ûÍH]KI∏lmw0Ÿ£⁄êQtfõ
Ø¨Ë!&a∑π"€µ§µ˘ÚCTº}#∂ò∏[UÕ-ÿqX®%¡ÿÛ‚◊¥ÒYyñAäBvU'#‰È”ßdÛÉ^ZWèËÎó4û∆h3+˝`ª∂“IGssΩæÛ€nKY_ª⁄äâõ–'µ+FÆ–(ì!¸–H;AÀ‹Ì÷—u¡z9@1!◊Ìêñû˘—≈‡jÄWô.z¥·‡*ˇ ⁄⁄,-•∆+π›∫Ë˜«ÛWwå"ˆŒÆ@•ö/÷ΩÈMùC‡çe¡Ú-≤±≥©∏ﬂvø{–Õ]ÖC$¿ù”ñÄÄç>∞4Í‰•V™ÌË¨5∏òm†÷Ó÷N’ELmÍ6?'Uf°NÑ4r∆Y8Åü–≥ÜÚı÷ﬂ{I∞+øÄÜgá§^Í≥b°]:á;J<Ì2´–´Ûı7Zƒ¿mºÿÑçXs1ênXÖı™t,ï¨èyÔQˆ‚Ñ∑ág∞Ww†hŸ‘‰˜[˘4∑-X¿bÍO€UÛä∫˘èÑSFáWÙ9w;‚›ˆ3É›|À¢ªK{∏Ÿà¯p“£u‰˚W)K»Ÿ⁄‹~àµü{ól⁄ﬂZª!«˚+ê—æaµÇ˚»´í —√)i‹ í1Ë·Û¡lÜƒiN¯JO›lXáﬁy%mW!y˘ùßŸ.π.ÔﬂanyùSÌµ˚™Üf°À¬˝˘ı∫Nó≠µÈD◊QW*º¬* è√¨aw
OJ{Ï⁄dY‹Ù ≤4‹Ú.Ä∫EÎ>,Œ÷˙,fg‰)˘fÉ.º:ﬁ∏!%äçèsN∞1ïC—xô5:»yNOxN™Ô ÒÜ|Õ•Û5…dª∫èK≈µÉ:k5ˇÈ§5’U∂¡°ª,ND∏ÿ)•â bã‚’åögµTùRﬁÔfTﬁCäÌq4%˜Å”ªÏ2•∑©§h∞/vØ!*ˆÏI~´]wWô≥“ltzÀn\äNˆÕç€Ñ(üYÌûÌ¢ñ¨∞ôØf+ó±#uY⁄Ω9¡j¥≈fE∂º‹Ì.ØÀâ=éì~Hñwh•ÁUqÈ„˙%ô8aq@CΩkAµ®éeÃ¶ñCô?±⁄#â≠ﬁıÅl-ŸÓ<û∆4ômø«√Ë†S∏à®x¢"ﬂgRHùÄéûˆ!S≤àŸ[Ï1ùû3í§WüìZì\Ø¥yÔ˘j¸˛Zü≥´§ﬂ¯y-∑H>#õ¯®mÙF¥tp	5u¸ˇ’`ù7µŒÓ®/–%æiïUUπXf‘*J≠OEy„˙Ï(Ò*7xíµ[<°Ô~6Úí∫§qûkÃ“ü‡`öÎ¥û§ŸîØ˝∑ﬂíÕx-o‚ŸÌT=Ò¬¯¬?˝ÌøvÀ……í#Y,ˆ=ﬂˇpFrJœπøÒsÍÖÀ)í…á6¶qÜæTK.} 9EÜE%°¯PFˆ¬õrF∫ÏJâ⁄‰–éiBÜ®N/7∂4f4…bêÉé‚œrC£iäa˘·Ñ=èŒ?ú1}ë≈Ÿ∆o®Ô8™&w]üEã£(8et2c±ÿ˘%i=ôdúI◊¸¶`ˇX˙JC7ôdc…πêÓêΩe~¥‡c±‘ÍœÖg±ÿÍNèÄ‰$∫Y>˛!L„à∆êZóù;Q˚≠ëÜ)Oùƒ—"J®oÚyD√héæ†o<ÇGnIÚ(ŒŒà˙4ˆÿrDƒA∞7™ñ˙kü.˝Ω≥“ÀËÈn˝ro#à∏©∑≠§†RÇﬁ∏xs^Di›C[!K…àGë∑Mÿ{eìçx!h≈‘z}M§>ªK6Ô¯wká‹4á'u«⁄”[¸ÈÕˆ√ïR∏›.èj^ç–$tB‰ Gï¨Àœ]∆*Æ›µW∑&Ÿvã≠ªµn˚˙oW.9ÖWÔrÎ¢±à0Y‡_èj*çjﬂ‘tÁÌM•Ó¨€\∫»«ŸÉÔ◊'uèí'yßÛπW›≥hq ˇq €[îs©£–K`´y	∆ƒ…›∫O„LyÑfî√Qn)Å>xê\Û˛œ%6˜ã,§hSé–ô±<8∆¬_Á^(¢©®G0ÿÔÜgcñû≤µ—ãÚÇ˛9êΩ3ÚÚ59°–épyÒ—≠˛\∂,„	cœWá	Vß˚ƒ{à"Q	$øZº"ó≥pGŸÿúe"ÿcL/∞3}–'ÂÂ∫À¥CCA{S2ÕÇ‡JŸîlAvü’`»"íwi≥)
°‘áŒ'LIHñB™PÜIö(™Öîw£~ﬂ¥(x’GπºgV\BIjÌ8'üõ.°?º?èóãÙïÙpx:$ˇi¯Ú2<æ$áG_O^è»…gØ^_~ˆrW1”jΩó’Çf‡lßÉ)(‰ÑÚBå›RÖÂ‘.È∑ÑÅØq+ﬁÛ=]‡îZ"·3ı}!Gpd≈·v†BÙ∏ÓçãFˇ°ÿˆÚ»ç>f‚\Ä7ç0÷åüÿÌ1õ”5ıŒUw˚£—»)#INÛ√O⁄ÁZ˝FáŸà•sˆ¸¬K—îN|†|…}òa¿Iià_ƒ<xàøWŸ+Qå·E4˘@f,ÿ:f vxÿ∑æTô◊‰¸˝:ãC†\(/=ÖúR—.ôqÄ∫˚‰çhòÀ74&]0ˇ=OÀIß—Y‰{ÃgoJ[æ§dﬂ∆ﬂıÖ⁄πÙîL‰ƒ„ESÿBÁÁû!_ÂGÁd\ºnˇ¯]ÕÀpûzo=ƒÚí∫°ÀXråùÊ8 o0d.K`ä∫îô7/Ä°Ño8#Mp&(¡˜ÛOFø∑ë)‚ï†7Õ ¡Óv§˝?ÁCJK†ßï¸Iπ°~!◊nZ@"‡§K=F0l8)îxú°ûEäˆ<4%µ”9°ãï·>û°´,…ïÚôﬂÃhöã˚äˆ=_¿§†[ÆlEËe∂&ò„Ègß√¯˜’Øá_	lHÇ§ﬁîŒÌ¡x¸LúÁŒˆ%∏ŒAäAlª†
ÔrL-JáÖSæj*C{„lªan\_ÎH:WBˇ6ƒî;*a(kø◊[”Ú ^atÖ˚‡Erﬁ«ãi˝√£Yt¡+ºà¶‘Ôßq∆î∑îP,UÓ‘«≈ï µ+‘≤ÚÊò+DÊ0A§ç‚´«ä@≈“ùµ">je≤™¿”∏}ñ∫n0Õ?Â˝BtùsQ£5jªÇ).g·TÊÑp¢·2è86/PÕQ¥sR*>Ø<ü|ˇ›˛N±ß’◊µ›¬∫¡1ÑÎyæÇÂÚ)s‹-c«uR€,™ª”÷1BˇVDsaÈ`ì¸Õ`{G5ÛçHéZ‰?®Õèvx§√4éÉ10’÷û≠-K≈ì†óÊ.Ÿ\≤søbúQÔÒäeF÷€™T⁄RW˘ıvÓÂ”Î¡ñÂ‡4ßK˜¸∫◊Lú∏ÆÌ¡¥ä|PÜ[xâ|«#(Ç€V£/‰¨;ÔÃ∏∆Õ
á|yzm†ó]"$€G”µ@x¨VB˜äÅl*ÕIèkÊ§ms‰œ–æVè§›18cò#ÕçÜSïâ©Åå¶∫ú¶ÍaÙ8ñGƒÑ¶%Iﬂ	ç¡H˛™0=)>ùj‡3:2nÏ˜	ãAŒ'Õ+)“ItÊ˘»–k¯ìqAﬁ%*hõıûQ?—c/‘∑wU`|∞”‰≥O6kÅ´µ≠›ˆÓ2G∞À⁄ÓÎÜè~/ıñ®Eê%”`∏∑≤Ω&2JE¬}Æûﬁ⁄‰™Û«‰«≠nËT¥ÊF‚AißéQ'KöòãÚT©ÌjzÌ\ËÖ©S .◊Ïú	s§ùFöf4ç©Õ£•)TiEi_”ùxŒŸjoÇòÔS»»π¥'«û8èT“Æ •köÜ◊…©ˇõK√ÔÈ—·òOÜßö÷èˆáß√Á†ªËÁ1ŒqM(7πùÌ©ÂQjHµud∏Tf…+>V+¢‘{V	øJ≤…Ñ%x,ü:∆ÖÌ4‚¬€ú;E¿Ya#VlÒÌ€~läB–¡—EöØZÓ&”]ËqL(@,∏Jœøù*˚uu4<˛ÏÙËò£a[?øFÀèsÁˆ«_Ω¸¸Ë’ã·Ë»¿ﬁ•’H˚Dèº~y˙˙òº¯Ï˘ÂØ_ü¬°mﬂÛ∆åËQNÿtf‰(+nT5Íò•ﬁº2H∑œm!Å°bÖ°¿œN CVDgÑh¿FÈOü9k†I5ÆØKœÒTagpIñ–ÿ˚πÆYN}%Ú_”a-8üû+èy»∂PŸ	Ga˝·_-‚ r)ié
§RaˇQ˙¸+bÈõ˜~ïE,WÕA:ï •ù	¸>H,:…¡Êøzå0>Ò®’é”}⁄çf7@XsÍK—¡y˛u™]W$±•`¿ìg†e Øº®‹Ó#P´·i7Á.	˚BÑDãúA€GıÉª™nΩ≥6V;®çﬂ´2Z˛@'w…H∏íÉWØñíû£oAZ≥˚]ÛPX¨ dBQÂw¡yêˆöR¨Œ ◊≈ Ÿ™aÍîc)G—ò±<‘‡Èu˛©πå@y,∑lÈÈu„ãˆÛØ”˙Ûµ/⁄œã(Ø Ûµ/⁄œã(NGEœõﬂ¥k»%|T~¨?Sc`Í¶ÿ+ªdËgËH‚§ﬁ#√f&N–Ñ˘@kL[ÜÚ∫Ôw≥¥®f]“~§Di˙ø’wŒÕó†ë√‡’ûÅm«ò“¨jπ-^Ø«œ|\s‹+‡ 6ﬂñº–Ï√jeHÓ—T8¯ÿ2∑’Eã‚sŒ∂T“«ﬁ1ùf\ <¿ÀAa˝|§ÚßSﬂºUû`∫À?«—~6&O‚6ç_°í∆6›Ä™L	qV÷˘ÂUÓ>SB´åA<ú◊Zí"ØΩb>Œ¸é∏L‚’‰W[⁄jÂŸÌöeÆdôà&¨ë˜æˇÓÔONæzu:|NÜœ_øxyÑû©üÅÇ0:z~Ñ
¬≈—À£—È+µŒdHÉU∑0WK®[òI`V94zqu?õg9˝8F‹[ÚÑÙπØyû˘Y¢R:x)^&uW˙'ä;<^nπDáÊ≤Fj]ÅÑàˆ!ﬁQ4:°¡H&1@Àí⁄ô'§öc"Ñsö°iLNA%6so«,Xdsç1&î9:ás∞Ni2GHv–t¬õzºßÛYñ@W˘[îÕ,ÄiÜÌµº≠§k"¶[àÉÜäù~H ∆xiÜæ%‹åñ≈ÀXvñOc¬€ÒqW‚®¯™Eóˇ"≈Ü`
hrNΩ	M•ÀF°œ—ˇArî¿&JÇ›Úœm‚üW˛|®°A
≤ü;h?¨\Jm>⁄m∑∏∫K4ó‘: ß00§ßF¢Í*≥⁄'PEÎ—uZÅr∑ÕùXî!œØj-'∏u÷ıíht8ç@!îµUvÆ¿<Daó0@È,∂πÙ∫~Ê˘∞Ù±À˝ƒf’YÁπÃP_>≈¡ç.X| sâˆÏ¯ôÓëoø5⁄qm–∞∑¶r¬íGj+æ—ªåqjﬁaoÁÔ¸>œw~ÅTèÜ∞ùÌ—Ãc˛îﬂdˇ4Nˆä⁄ªHgtöÛ´ª9‚≈"¨ÍÑãÉ¨}ú Ç»§^2Ù…”∆yW_cÒŒHˇ# ®9ËÊG∏R_A>e¬pcªï^Ú—è-4ì7WDi
ë1D0_€∫Lå»«öÖÍM{: Ü•äC°}L;W7?GÌ{%q,qœö–h6πO√y•ÏßAÖ‹S–Eî‡ﬂ∑¯Ûj°ﬂ¿◊¸@kéEA5«NTSeÚ¥Jv√©âLHzÃè=G*ÈÅ˛¥Hû+˘/˘‘çäãáoMÀùö1StI†˘¯tTRO„t´≥i6a¿≥‡>K…/°} ê–}≤©≠‹®Û«G+ÆM†^+Yl·€ˇ∏È‚!Fâ‰NKw™V·V§1ßbÍ¯„÷ùàFR!8–>ıèÂ=≈W-Ûñ4%éç'3rOd±q∏®ﬂı:ú¶cπ˘h∫%Ò+›»+éµÀÄ$(/\Aä{^Û™∫Qé‚Z/|ÄH‚}»÷∆6îπ’Ø¯NÈ!ˆ‰≤XÄ˙DCÔpds6™gü„qQb´åY<≈`7îÓ`–î<gx˝Ω M¡/èF⁄{pÈ[$⁄CSìU¶πa•ñ[í9ÖCê?xB1¶¬Ω*≥ˆ¿∆tŒ8«Èm≈k®*Ö‚◊xé1…a˘G˘D-]√˘°äØå;˜´ÕÆŒ5‘‰qbw¯i;˚‘÷¶ßÉ)ØGx=∞Oz√ÀgK·ä~©Å&‹©{ßWnc-!Y:Á‡ƒìpbL∞ÚÍ\6ZÛ·&‹‘ÚRd=©:ÂMì„W3ë^µΩˇ[Ò@ˇCâZhŸKgåN5î)çï“≠ƒ7Ò’‘U¢æeÑÜn*É—„ï”'±;˜6“ŸRMçñ´*MxñHö^{ç¯’ô1¸7ÕÚΩ∞ÊﬁﬁÁ–&sÊmª`õà_gÊløÀ.Xga$‘…co>∫0ƒÄéqÇFawÓ¸´•ÌyﬁK«—Ù™⁄qM˙$Ì1º  õä√ÊúßK›’¸GSv\ ]#êzû^‚òb6_ã≠Ìö´°2çgƒUascÀ`“qÃ~*÷d∂‘OµõUã±π»#gyNIg¨ËîÈ”ÚÍSå◊á=”ÇN¬€A ùSè„ªÃ»<ÜﬂÅ	[⁄Z‰ºZaSÙÀ!«®9¥r#’0I˝Y4£u/ËπÚL0‚0Ò,d|2∑˚õD`Ì>uæÆêŒÊuÑ|Á∫wk§∞ÀÂ=]Î÷•7!÷ﬁ§hü~ÕõÅﬁT˙ñkÙFSÑ÷Bh®µyãﬁŒhr»∆i£ßÂUœØÙ¯ËóY@}çGÉÁ≥+˜ÄônT£…⁄Ç˚∆UÆªèØE 6ÂiØπÛöy∆8ﬁBf"ÚéSËX»R:’1lmﬁ∏Æ1Â≈ª8•A<G0M˛P±!Ù∆•¶â"πç∫ìw«è/˚ÈÁﬁ∫•0YÈjc©™	„l›6ô@É´˜ñÀ”u˚ÒÀmgı©ı_M?úÚU®-œÖoÇ^S*Ìµ$Ñ›“•)∫#t{Ôùéö[Údo!< §ª.√¨™˜Ô˘º…Ω∞S˜Zq8z‰∫¬èﬂÔa≤°ú/uföN‚˘9P;âÎQ#UnZühcö7ó&≥¿N%∞HÙ…·‘Ï›‘Ó]≤’MùÓæ≤=Å˘/KŒ·?ˇÁ9¢/ÊÊÒ Qw<ÆŸ±∫Â∆Rƒë÷ƒB≤Á"™2è ¿Ä‡jÙLCTm†Âú´AÔ§≠Ro–4&≤™\àâ∑s,(LΩπ˝[€Ÿ∑ﬂ>hŒ‰8ì†<>g°ˇ±,n©õl˚KØb18†©ïdıM(∑V©nD∏›{©°El¨ ≤TO⁄≠≤∏üï›SûXˇˆ.<S‹~·g%ÿ≤Cû¶‡©⁄§¶™¥Ä∆F‹∏S6é´ûçB¸5ø^+Ónt˝ècc *Í∑∏DpÈÓ£YJ=é\~Ö˘>K»Áo:Ahjûô¢uG=|'] ¢y≥MUSÂu–o<#˝∏È·π¡◊¿V=¥wqF§9S#lM5b\« ¢∞K:ÍÚí[:$W\"uÄ(Î∑	{3˘´¶Xå0qï+Å@l≤Á¢∑¡Ø=¥¡Øπ˚õÕ{Ø‰02öÚ¶•´îA;ËREN‚ËLãxÑÂûàπ„âó¯©ﬂm$aó0òGg£Ã†…`π∏ªŸµ)Û:tô ƒò9†õ|˛˙˘Î—•ëZ·àEπ7Œ|ˇWË9±LÔ]Èˆ≤ôÕ4]ªÃ¸»ß2åOƒ˘mî·|Suh≤ŸÁëÉzs˝rH|vY’.ur‹['õ‚_6éøíN6†øD’g≈&ÅñÀNÕgJ·R·$¨>∏‘bwÆSY Kz≈ëÊOh»ñH1B°Åƒ0∫RÃ[ƒë(rw∂ìÚ6)˝-uY?ï‹B«∑+±:óïıpøE4ÛªG€…sÉ°£Ó˜í≈¬d9©ZÎK‰ómù}±‡»⁄WuÃ1n('Ïñ…»å6ó4F-aE`‰FJ(.¸∂Íâ$úıÖˆ
≥le^‚úh¥ë:√≈Õ©M6VçH∑∑EÛØàÓÎí∏–ëü2Ω-«¥jwB’`s<† °ç•¬≠ÙKbÊö‹t≠s^^‘Jàà∏Ï¯©9˙üââ(&bRèq≥ì‹"UÚÁ>wÉ≥]≈µDÿ€^∆-wçâû'ô‹†lË5∏à≠m	4TQc¬? HœAáﬁ-,)£≈B ZÏc*cJÙfœ†#–áZ™•Z‹ 76kß
è˛z¢æÛòN=òøA∆p∆„((q„·;ÂA´ú™Záöj‡ÖÉÍó\v÷AU¨[®)˜hÖ≠Që/h«÷√y6-^ÕûÉ”l≠êœ®£¢ûÙé$m·˝T±€ÓNNøBh¢”◊/ø¯Ç'v⁄∂’tÌÏM°Ö(™\kÚk$ûû≠v∑WK¥iµ8âGyqìÚ≤
q©⁄V'±)/zx◊≤‹*,≥÷–R◊ nª Ò®5Ú9=TÉµÊ–”7´wõäÙEB√n1àe1	C¢∏KÈ¢tÿÑ´€ÇKn@´Ù.äEÜE8ŒÔ3`≠‰–√°$‘≥]ô[∑çIƒêOË 1)X+=f;ê©çfV∑∏Ó`.¨˘nC‹tfç≥7{w%/Å¿¨+5P;;%˛˛ª¸ﬂ‰òçΩ7\U-ïVmºmu g;ñAim’n∏peë˙≥ÓÇæÒ∆v∑ãÄÖW≈~+r'‡4iÅÂôÕ¥¯meA∞:Ùñ∆$xïÿ“üÄ;'0üCg∂É≥y}öB≈˚döå◊÷˘ÂvÆÃÂ∞¿¨	W¸MSÛÇpã0Ûa`/∫}cÍJõ/∑÷@,~∂8rõœsÖ¢›.7Çèf/{ „≠Ó!ÓmF}rBØ8ˆÌWûkY˘˙q„ﬁŸı\ªR’ïT^„I=Œ]wPa
†ìy9§g†™»^ò3ëìÙ^È´†∆
)ó/í:êƒBÆøÒsà„‚?p—2–¨fV±?ÿhúCî]MkW∆Í5€‘á‹’üSáﬂ52 k„ÔJÈ¢{º]£ø?ZîZ≈{∞Ã≥,4ELπ4ÁAV-ß<’À©o≤ÒÊïÙ–—wJqa˘Œ˙÷iˆÚd6'µ^Y?ÕBeKÁ¿9lÕIıº^N‰ug›%Rk¿\}¯÷âÃ4“UKTg+j¥7‹cC|ù›ã´2+¬≈Ëîí<ÛuûÈ¥Ä«M4e™ÇèY¿»ã›Õ≤xŒaç‹¸b	˘⁄©oÎÎÎ]w2ñÓf,ZDïj˘≠€Äí(N˚}ö[∆ÎW‰à°¸Éã ·At81º◊Y±ÖHUó¬7Xc•™•rÄZYM6lâ≠ ‚zdT¿E÷è∫i°Æ§92Qƒ$–‹ÏF˛ÅÂ>'Æ«À2 ó–Ö"eLß∫¸ "¶AÆñµHUÜº¬	Í$¥TSµΩpÀã#ﬂ™tÃ’’ﬂ‡ªˇÿ‰ª_8pwäË4XNYÃ≈$·Òﬂm
úl◊’Ç‹¬KFã*†òdyö1IÿÓr˛€a'Ìô/RÈΩõi¡Ba·ëA+Ô`‚Ôn~)&—-&X¸’ûaÒ˝ªõbaÿ‹«Õ}◊≥˚Ÿ√˚!~é4ı“-û¶^.ˆKÄf·…˚&Ã[§ß—	∞Æ¥ﬂΩ1Ñ]q'Ó&K÷Àî€èv˘≈2ı•|ª€mª∑ucàﬂ◊æù•|Êéå∏∞∫“[`›A,Ñµ	Zóò∆Œ=◊ƒ Ëã:¸™4âµS¯YLõ≠ ,”Mt+´Ùcm˙is Ò$rÖmQ€∫∏Æ¥vèo÷ç–b…]∫.ëŒq˘ë´û^ñ´õ∏™€ÖÔø˚ˇß#sq	U´ó%ò∑ 7XÈo∆¬©5…Æˆ-KqÅ€ÒÅj≤»%à–"é0ó3
î@è¶‰#`ÇË!ﬂùÄvÆQ∞0ö\Ö≤,#ìt∏>éæ‘›ó†Í9^KÃí}#Ú∂æ–Í•<ﬁÓ
d{qì¥ã¿"≤w\Ç5`QM'öX¶1L‹Ä3π∂‘ Vrˆóz˝™‰,∑îu∞‰ÚŒ≤](,ÇÀv E&[%%›Â€¡Í√Tó<€•ÑÏÇèÍØ≠ß——Ë+iAq≤6Í˙ƒ/k_∞tMo”µûº˝=eæÃ°?bÛ»ß≥5y€ãi„——≠:á«i]∂c√À6óoæzu8x1|˘z¯|Ò5Æ≈z]Ù◊næYvÄ7ÀV\ù$œª±<±∏ÖDèeeR=ñ•F—ùw÷LA≤æ–™‡:HÜÜOQ7ï@ï«Z˝fQ∫ä`]≈DBÆ[b◊”ß›%)t6VàR&mXÓ§p=ÂI˜ùÉ•Íh-¢€…¬[Bˆµ"U™JwıA·∆Ìg“;®ªeLˆ†Î¥-£%9y¥.›Ø.v;∑õSﬁ˚†ÉØØS§Òê
_§˛àãáYÁMªÔ≈é°:/≤î„úêœ£8X⁄∑≠ï|ÁémZ¨wÁ6É]Áˇ˛ª¸|÷–√ÕËõ¬ÍÏv”o|oé≤qÄ†3N}6¡R‚KW,OEÇsDE7‘ÓÊﬂÿ≠€ı ÎFÊÖé∂Ô
¢ÍÙÚZË˜¶lÅx·rè[çö¨ÜıW√%õ≤M3‚øƒ$≥JCãI‡É˜˘@ú»Ø! RJOzËÄz˝≤e∂◊4Éøb±≥ëK£ÿÂXbqÂ´Ôz˚]xÈl”Íˇw`e,?ôMà.´Û’nB{â∆Ã]#¯f‹ﬁÜœ=ıç‘öÆÂµjfÛ<?DI–µ∞I~{ºc÷ÓÎ≥$Uã8®aÜWˆ-≥øŒºòŸ=//|⁄€qπr©ßdÇYçfªj∫‘ïπó“À!wA≤U¶SY€-ˇRµ‘Ç~∑[éÒ.8∆ºKµ‹J:‡n€,π≈’ﬁˆ49\µœì—˙∞›§∑÷¸Öè4∞ “í&.;|π›N~t&36ôè£KJÃü≈™d]ú^æåRfA•µm›ÃÊQæ®‹ﬂ≤éF5ûq∫UWú—pœîﬁ¥,N÷µj∫:i´ùéõÌd≈ïƒd¢˛&π‡Ø3˛o}+Ÿó ¡ò"å ß4¡Çàlê
j$C∑s:nyÆ∫YtxãçñÌÁ5Sú—)ÉYsåyãúÕck≈s1ÕéNÏë?Íz“Ìâõ•∆’N3ﬂKÖi£·}ºTÂ<ÓÑ¡âÜa˘ûÑë+¿‚0rQ lj≥6K¡	ùiäé6hÖ+/ƒÚÉ‡áX\é∑ã…–ä[Ì¿[ù*±˝nÂ∞∞tÉH/ÀÎkÚÌ∑‰#WA©™GÂY&+¯GbUù¥)⁄Ω\˙@	”
	
`§-•lI£@-cKÌNG~˜â[\É¿=*M≠‰†˜∂6lZô%°∂+ú`ˇõY≠∑∂n¥7ˆ≥ÂòÔD¿›oÆó∂Ò•ˇ˛ªﬂˇ;y∫>s√
uæ§ŸÂµˇç|6Oÿ<?j≈–ÇYuΩZŸ≥OºçZŸµÔΩ¥–Æ$⁄º∞ΩÈ%0üWÍ$Õµ∆¶˜OÓ6¨‹YR#á»Ò’∆™[E+1Õûõ-∆åoÃüË¿∑‹ÃÄm#‡	LŒ8äÊ/¢)ıs‘⁄Ü[ÑU4YÕΩÅŸUl˘ï$]a˛.‹≠
Ötµ≠PÈçg“ï^;.ΩËä‰Ú3l¡{Ñ-8•P‰À˚∫˜Ä
kz&(¿À(BÍ‚‰˚Ó˚ñCà¨¨s.JÅÄ“·bù¿
Rg|Æte¯\i-L*…&(Kw Ë˙ÅóÓpa]´‡.8®ºpÏÑ*¬í'Ká”Éeu'(omôSÑÂÓ`ª?^üƒåÁ2N◊}Ù~àÜ‹ßÂ/éÓ€]ê“Àª≈yH/Ú(Ö/~áJhS*◊ΩãáÛZÅöÄÔ¨#'‹Ô1•WªorYÏM:˙YsXÈò¡qËXQ0ñ|ÒM'ˇœ=]6)]Q√¸6dr‘D.@ó€ëZuüÈôz©œ≠ÔÎ°ª˘]îné¨≈+–ú€täMÏË˚æ—8`§iÀ`∑r0à-a¯¿qw.¥CvõÄ ¢>… ÊÜRB+Ì]œÌ‚AtËFÕOŒYËcÌëÏµÚì£—ª¡ÖÌﬁdeÈÜZƒi≈áB‘Ü„]Ñgˇ‰!:dî€¿t§ó?Ét¸P@:ﬁ1D«œò™Ú!`rt‰ÌÀö]˜?^Tãæñéı/9ü∫`Òl†˛⁄∫N|†IøxSn—È≠isÎ{˝^Ä7Ù]DÊ`ˆ"_∆ÁúñV*Œü˚‹“püHâÇºsD†˛ºÁÇf›≈bK/lñÈ'µÀÖ™=˛∫”›†Àv,BﬂÏÌ”î˙sµE‘Ωªﬂ›ÉuMf€%]hùÛ‹œÖ'ÊÂ˝%˙ÁˇﬁuW/uªŸÓN9˛9Ë≥Rî˝ﬂ€(”Ö∑´5™Ïmr¢´[ÇäœËÅrJ«ªdƒØd„Å8™˜àôQ8Ò|è¢∂]ıFπÊ9$ä‰gØÿki]‚s}¬Û≠ù¶Ñ”!œπ—…˜ë2'I3Ûx}¬qzæ⁄ìq@„i;!};CK5ªôLnÜÓQÁNëﬁL˛ÖÆ,x˛WÂzÛ™›≠¶Ã)tﬁ^-œ∫.’YK≤¶4€¶øhQ|6Ê3k˚√=RÂ/Sû≥kv0›Âü„Ë?+ø‹›HóòNóÕ
€ô{∆®M-ÕË·r%w677∂ÂÊí_=lÒÿ ≥v™.3µd8:ó©Ôø˚√&'_Ω¬4j££—oÜ‰≈Î”·ËÏg«_Ω=?Ç?ï§Eg¢Ÿõ=–ÊM´8˙‰√NKª&CÆ-˝wç∆Ùèôü—ò‰: ﬁŒ(˚⁄N“sô¥Ÿ),û∞fo∑!izàh≥ıÏ8ÛYñdâƒôâïﬂ∫ÚTÁ:¨ã|Ë˙,s∂¿<Wﬂ4í{≥”xM\ºÆìC>Ö¬c–ÓÇ™=ÜÊ¬;ÊqŒü¿DL ¸?N)>G√îfÿEMCµåB‹—æñ¯7†Ÿ"…"wÀœ@sjÑ˝\ƒ
Ø®ÍYôÆG√µg’ ∆€EuGsK¬R{¿F˘µÆ)êßx˙£I:=zÑ¬9∞Ç”Ûü≈q[û<Jƒ≥‹'S=˜”8cö”A√b'ﬂ∂∞NKBUÛ	îﬂ©\+õp"+é•çÙù*àãè PØ	<\ƒTô \}™˜N¸,9‚â_$Ø›—fÿ<A=…©‘>ç3ÂÆ÷â‡j6◊˛RÂ3à“∆_d∞WEÊ÷£pÍMPJ¨rG$	v´à5|êáf©fƒ“.¯¶®ä':Q≈„SΩŒ:]ñyP„ß5^˙®Ê∞¨$„-ÅdªÆâeèÊl5lq‡ÍJ}Å“ä+Íæ®¨¬6÷]ú.rN#‘#´ÃµÁWvdµˆ„‹Ä˜!öii¨ ≠vœú~bq?È'ÎÅ©AW‘;Íﬂ¨ß± ≈G‹R °f<<hçèﬂÊ±ì?W∑W’5 +ûµ)!Ù÷¥.3∆‰ñÜîñ#Mû›Ê0≥õx¥oU]G;ÛèútAÊ<≠JwC9äX·Ù¡pu&†z=îéåXΩ?:¢øc‚—Ï|ö÷HÃ“,…ı¶Ø!ü2ô‚›SS9en•´æïÍÃ¿¯ ?JBq8AõH|ü◊2˙ …œ»¶ˆ1ÌTﬁ¸LìµÔï4π #h!ÿËÚiÃB‘ﬁ_/~dπêË®)HiÑ9è’u Õ¶tX◊9}÷éüÂΩ[ {∫yçŸ4õ0`áY N
f˘%ºT˙uÏSÃ˙ÃÓìMm#úÑ~|DIïí…Ö$Ì”péÆß?%ÇÙ$E± ∑¶G}≥≠OHáú|^G Fs d§l’ƒÃùú≠à†≠Ñ§D))ar)ÚV+1vØ´(
∏`4∂≈z¨üp“äÇ'é≤"ëZ¸∑‰X ˆ;À≠ÆÔ“ﬂÑÎØ—Î¸c\·cÈÇ|CcL^ÎØ›5ÎP|’2òæ†^H(¶àåæóíaÃhwìiwÂ9^èÈvIæ»rÔpá∂ÒV∫QıB˛¯∫·…/÷õ!fº∆ßÊ≥‹äK≥U*é.z2◊‡úπsıõ≠ÌﬁMÈIhÉó◊⁄;-Ó]ª§Xﬁ ∑§;2K¥Å◊«Ÿz}¸@qÉXËncuwVj@-Fµ¯3–˙.s¿âßVøG◊®Íha+7®9éFÎu”‡R}HœRºÇ‰∫¢!‚7„]$0qqÔôﬂNj˙ß∏4¯À4ó;wy–tooƒh<Qø∫ûk ˜Ä¿máﬁÍ—"P∑FÒ ˚$M∞Êé…à¥f«V´cÑ“ÿ#0∫ÒÚhd Hìêh9w„S£„*(¥’äÆÄhUy€<&ã¶WBKH
8ôoˆ∏‹}Htåü¥\)î(‚5‹¥“Ÿ¢ú&d™”i[oÂzÍ$y*à‰R`ÅTnM5@ jBdƒ¸»˝#ÿ>fÄ¨«N’cÁ®◊QCáS4ßåfÙ}Â£,r—5Qs©YoV–^M˘∫M{yÙ·pnßﬁQ”ä—
CÍxlÍezŒw-}6}—êÀù·#,†∂X± b«9°B>„[5tò∏f˝Q`@,dAÜb
RÅ‰¡RÜ„¨8aIFç∞fø]ìßÆ9*rAœ——•Ωf<l_Í3VÂL®f…kÆ Åbv◊◊
Ä:^=-õ/ LÍùòåMŸ8ESÖòñ ùÖΩväVúF}©ZÏZı–XoÛñ£ıíÉ,éaÊ¸´ë‘b,â7 Œßπ¬^Æ¿ØL0]w[ƒFÇÉGîØÏ/⁄Åj˙\!ê˘¯Z51ê≥|nKÑùZMm«D”©2±∂™6’≥[©@’RÃn€√ö˝u2§
…jÆ¨’w+É0ú∆‡à±¬ï¥•ù ó>XNœ˝ |‘å£Æ»÷ÿ°CvÌxß\˚%£û·o$ë2Z/=EÌwôﬂc∂Î'hÍåkV—ûêP¶^¬∆YÍÌzÁ˚€–_ıqs¬4›@TK1£ı+πeÉÛW>.Ì}ùéç[D∫îgúûÂ¿√*R’96ScpDh[Õ9‰Ëπ∂<:É+“∆u./:∆Œ™È{˚¢ö¯ıe¢±òΩ≠À¥7d?Ûs8ë˛wp≤úë}‹ë-jÄ∏.Ÿ%Ëπ{†sñxTóπıÆ{íÑ2Íj©‡É’·ﬂ>∞€é?fôHËÒ˝wˇ¯ù6∫{‰Ô;⁄4π
'§í	::> U¡3/∫Ñ˛3úÛ¯¨`úGÑKm]ZG>Æ´ü˛U¯W°∏S·ˆµ©7âHxM6¶Á‘ìÊ:á3πﬁ!∫ú!⁄S‹!\ÑrF¡øÙJq,“.3‘{Aìl>ÁπU¯PÒâ¢ç8X–T6<óﬂ`Bƒ˜¯|?œIˆ…`xü<Ïﬂ'Okªù†OzPπCÖ)∏µÚôÈ2ßÖµI o¬§“Í•∞œ_/¶ePX7 ä“–¶+öËèª§¢LvE°¡SPi ˛Í⁄ß‚ª≈ûÏZùF(Ôˇì+~ùu≥(¨åÖˇπ\KU%t˜ıEÄ‡mZ®(`›õπÈÑøŸåèö<.›N!#,∫Çπ|3™qA£§/ûAÊÖ›3ır‚ﬂÖ\cÈà»§êÄ¬Ã˜;µrCò¬Û;òƒﬁ°ÔÅ7Çƒ>¶qÊÂºQÑ#w‹]›FÈ¸¨Îìnœ9"f’%—≠ö$Z^Y5≤
úúÚz⁄M5
†n2Xˆ¶¨/§ó! +k´XdÕ˜ﬂ˝·ÔV*≠Æ»ˆcÉñ1Ï÷ù†¶Qc∏2Z4Gèﬂä#R⁄vDj`J+;p"Æﬂ<çÙ?wTÈÇ®G ÕG®=µ\≈™Î/†Âwí©º
øP?Ö¯{Ó~R˙ùË;(j`ãÍZ∫wπ˙d´˝8ä‘MZÁøCéHNh»|Ö†¬√Ø’ü•<˛C]ﬁPc8≤ÊûZ°K‡£J÷∑4ù‘(Z`~æ
∫DZÓvò‹Sp	A∑Ò,øFcYõR‘Q∫á -ﬂ>dæh Çîe°Ù+ıö•y“¨óÜ∂t_Ω'ù-ÌÚV∞Ÿ[/π!˙€%R˛µ˚}Ê£PzWÊ?.Xf∑+πŸíÏfD.DÎW©v∂8bìñ‹¥1N´˜xµƒZÖ∑\3€v]\´˘'ÍF©ü˝”,Õ⁄…7IM¶TcHˆ0G‹"äSÚË˜⁄è.ù©œXu"x∞©wGîOq?Æ—6≤ΩŸéÌàÁÓä‰4M¿Rí÷¡#ıì˛˝wøˇodü≈L pBcJÓëœÈ<uÒ§Ê4a«ï∂õ—Xgs†@∂-‰ﬁHÜ‘Å_Oñâ˚"c?öÃ-Ù)OúÊ@zl˜SÍæÁûøJ–ﬁC∑•ÌËQ`Îˇmy‹ª^8â±Ü©Vaˇt„4{ìØ÷>‹¨y#¸‘rËc“t8Ä9™‹˚\B_)0ÒeWRFÔz?⁄xÈÁ∞œ¬âáë¯®ŸIU"AßnUPól‘í§NV◊mÒë`ZCı2∑VâO€Á´Ü‡~SÙH≤ †ÒUßÏ¬R4(¬•µbÅx¢-4Ù(kÇaã©ß´ﬁfœo⁄<õ]éß†¸x≥åT:¶cqq8}˝Úã/Ü«√óöHÎZ«ùúAÏQ‚Ã=ªZ\LÿÓ~‹yqÚÁ.ö_ab>•ü∑ãâ‹àS-dòjqqÖqŸñVW[NsÕ®˝'U˛`K˜ÌÍ>wmœKó,©Óõiu[i…çdwp·∂7≥î/öÉàa€oz[
l¢áuöªŸDÒmË·6!¯úÅ“7ŒÊ<hfÅ∑$W†Ü‰ç7ß’÷@¢Xñ T†P^CRí“s!~Em¯zÜŒV◊Äc∑—Ÿª0AK˛.‹K…X¯óﬁÜÕóPMZ>/˘Ò0˙ Ä™ÿH∑bı%B∂ÔçÜ‰t∏º¯Ú˝0˝xPµûS}∞‹IÍnÿSì%ò}º≠3ô';µ<¯Ë≤É˚†ª€‡®‰ÿg”ßñ˘"{Oâ%ùR«Ïiπ≥O'KûíoN
\Û—[E8/∆‘.¬vIêC\"|cÛàBIï_–0£æ}¥Eªî–ª“Ÿ4¶‘wê)Ã+`Ø/Á“∫EÕScq ®p.»Xv&Ø–ÍögpÖvπy7HuI√óqÆ∆˘Êª}7œõ|¥¯N÷ÉYƒf¢¶Ω?¿b3»b¢N~õPÑö£/Òç'ﬂÊï·bO—¸⁄@ƒ·&åÖM»ΩB<Ò£s¬=$ÙFî6€◊ !‘níâO∏yΩÊ/Ò`ìò&ŒóèE˙€V2dÒE"®≥˙∆À\é¸í∆†/åDÆ√bôÓ*µXWk÷fÉØ∑∑õÓI∫´¥¸jﬂ,’›ä¢lqVÇ;a]“Riê∂k>bNQn±-fúáNΩÍöÉı◊Y†√Ìπ”vHé=“Á]π”.∫O‚)öÈÁ+Zh{Ê4#0GÒê+@«N√µ—«u›Õ¥'˙ÏV´¨·RŒÇS:◊D“Hà™ı|{ß=Z+$/n&-ôKßîƒﬁΩ¢iaº ∆c2U‰≈-◊üKñ?∑ÃÍ_;Ùi}}}Y£Ú
vã˝°ﬂ∫D√¥ﬂßπ%oº~≈@: ?∏D	åQ›m"ÏÄy·¿cHãºT∂yÀ	›Wùöq5¸kB3∑s,aµ¿@®6ª¡O8˚ÆÉÓîSﬂgs∏záÅ`–qnæmF¯Ué≠ßó:F°Á•
¨“LÔá=Ÿ,Ò¶•§¯∏~sˇq∑àå∫ëüõ¯;’'ƒÖ,¶˛¥êqÛøÅ7Û¸ó≠Óô£w›Ω†ﬁ[≥.jÍ≤€ˇìV:Ò“»⁄˝Mª¸MÌÃ.Ìi…3wyá'ßZ‹∑,'#∑€0¡œÒÆ°[≠’,/HR@9&3èΩeòÆ˚Ùj¡x{F·`≥≠dé}‹gcöpÌı˚Ô˛Ìıxî5ÁlÏΩA°òW;ŒˇBˇºÊêE˚åäÀòÔø˚áˇ“sç†-¯Y@ƒ§π/™+®B˛Ùäâ|7Œ‘⁄RNBo•KKdF_>+zGõm≥$,}≈&Ã[§ß—	∞≠¥ﬂµ—yÿ…b—9ìê)˜¸Å›Ω™.wõre◊ñn:Ü%ÚY„ìu4Ì$H`OaÕA,f}ê0û´æÛÃuÏ≥c†^^–E¢{a¯m;}[¢Qö{ñÃˆ∑@ê@˜«#Ì¬m0˙+]ÅO0—%9Ä<ÔB:ßò_”qúÆÑ…Ë?'¶íÖ”x(ï∂Óö*c¢@&ïnéupØÛ´ócx’∏ùpºÈ÷=Nÿ[çp…!≤Z/§N$œÌ¿ÿ¯–;17Yg	q.—‚3N}vÄ◊R˛h±¯ﬂP}‘?ùıïº(É{7EÙî:W†Z¢,…JÒçQÉ®ëè€¸Ê•Î∂Qª± )|∑,›©ÅcHoY‹lAïÊﬂ©¸R^_/‚Ä‡µ÷—îßh¡P•nÚV9y·æﬁq8∫J
ËìŒ“BïrBØ‡ò õÓ•z¢Rg4,∑ ß¿ÇﬁÈ< ≤ﬂ˘Õ´Wo)∞ﬁJd]ù–∫åÿz;¡ue¢kg·µæ˙V¬ÆDß(‘kÆ•Ô∂Õ¬,„¨mUº´Á⁄GˇLõ?C≥,!∫Æﬁ¯Èr˝¡_m≥nXΩ¥0ïG‘pÂ∑
üq˛°1î÷S{AÑ[lΩˆ=‘*>Û∏~:ﬁ%_Fã£(ÿ¯M	]vÍı!ﬁCœπ\Û-π¶”¿°™–Lf≤˙ÔÇÛ Ì51ˆ n‘:ÏÖp®ˇÙ˙öHøû]≤yü¿ø[;Õ”,q
jœnÒg7õè™R!∫‡&Hœ§$h˘Ωîﬁï’◊£Ìˆ˚» lPU¢Ì 	\YªàÈBü§ˆ˘›õ=hife†øävçÅ`)@‹opê·<IeèÙá„Ñ%kü∫ΩçŸEß⁄ŒÈπ˜JZ≠à
◊ë†Åˆ¸»G¡S€cè;k]`ÁÊºsYòf*qôXå“(Q‘@‘q$†#≈û`º†ÌÎ[Öπ„ƒùBïVS+à€ƒm•≤˜Ÿ%FØü2PÉYúÙã£™æ°™3≈Ç)rèçÛòN=Ë˘ ç19ã£†∏+AN	ﬂ¶å˙M©¿(U9¡]Â±¶ÑÚ¸ª	ﬁ¶ûÏ¥ ‘‡°–«Ü©®8»ÌIRR◊√Ë"Ù#:ÕSO=∏—§%‚ˇgsƒ®ÇÉ—_ÆÈ≥ÒÈ∏Á Z-É–wT÷Ô™ÀØ∆†ñ|^T˛,é£ÿ§14+åÑé`©r≥∑ªê5AùÓ˝[˝„GIm(_-XÿO„å)k(Â¿N;è…‰€∫Ç˝Úû7∂„v~Ω¿Õ|‡Gô„és{ÎÌòbR≈)Wî:ÚÛ(@û	∆t∂Ò˛©	Ωh◊4©#u»KIs˜@`/©Hzg/XÿNZ"Cø¥{F`Êg…ÅO|VÊ◊kq‚“\ÉGtÕ¶∞k√Û\Z<Rªr}Jz|ˆ1˝Wå¡[ïuPÎ6†ñK∑› äÌ”8SeÖn˚k|óíVé≤q‡•Öeàh&[1‡-∑ü—ÃOu∆
NíÜ\~Ò :=9‚Oø πÿÖî‚s
™|‘ ¯åÛÄ†5∞Mı¡î’ßdr‰JÊ£•ÍÌëG JzsQmbz«<È-\C\RÖ~ü<"s”9lÚètlKπ$g‘Otkíß&“§‚Uœz_i«Ç+“:&KV»¡êÛfÀö∞*Çú⁄SŒÎõÕ;≠ÓôM86[ñ∞X „¶x-ˇ≤ôÖ /û.Hî®rêˇi´∑ê[t∑~æ˝ñ ©>ÛBfuBLÊØc_‘·GÛÛFT`£·˜¨©Õ®⁄ ñŒ˜ˆsÿﬁ*0-áØ*)ÏGû57Ù	YÆÕ§Îh˚u¬Ï≠ìå6ˆ.b©ÆÎ	•ˆ7›/÷Näc}≥[Îz}ãπ{ôÉÿÂ.w’G–\ßÀô3¬Ô¸TÖ”¬QëYp˛‡èïmÚFíR_^–9ıΩL¿î˚ƒøÖyô⁄ ∞W}>’¸úLh:ôáécWq‰î≈o@é :íPë°–$∑ñ§‹‡+†œÈeÑé2äj,6ÂVõ ˛R!z+U+‹íN…Ä∫>3ø•Í4µúGÜd`òwõ<ÅrNïÉ•±óÛ˜i˙rªå‡1˚ÎÃãô.V•û0\&8gd"Ç‰Jg˜…h˝DÎ *≥áÁ∏K‚œeùerÜ_ät·zhœZŒoMŒ«ï∏≈FpÑå¨'/™tO ˛·mœ˝¬Œ,≠
|øÚœÍãßmè~2
:˝x∞Ô∞5^ﬂuﬂﬂ&›˘©n“Ç??èŒ=µGœá∂-—J9’¸Ñ:lÀ|ÑÆªR+F»›ö∑g}Í˚∏ıæ3>¨˛∆_%ø‹8øOz=C¸öÓä˙Á£ë€Ω+∏à;à1@J/Ñ°o<“	ÎôíxXÜ3≈çS#4Nô@l§X>%Ω˛+ı7æ†!»hÌ4‰ŸÖ«˘Î≈,ö¸B”ë€ûÓ\u≥ùß◊µ¨õöÍ±◊Î"ÓÛ«g(Òƒ-/(d\oíˆ√ %∞z&ö›JÊ6Q∑mu‘’◊µB®rµ∑+˚ÃÎ˝0∏gÈ0%æ∆@»¡Vıè‚F≠Q'SﬁUKÅ¬Ök„q¥[†ﬂ•ï†P·¢n≈T˛≈qîD®¶‡æyCÂ6LY
zK¿ÆãÂ£à®Á,äA¬ŒŒœzÍù…¨ÛkÎ∑{±=µÊ€V†AÀ^ÿ8‹e⁄—EßkAÙî˚ÔÉïÉû{·úºß∆?F∞ÓÏú√=˜_øzæf"‰Í¿Ürö˜%ƒ€-Sê˛Wãt}ÍÎ8æ)à‡∂D<ã}·Rä`≥4]$ª”ÿ{À÷œ£Ë‹gÎì(ÿ8Û|∂±ææN˙|Bso	-≥™ê?nƒÎJ˚x•ü¢n{‰÷'=ôSÊ∂*#.T1µ@å«äi$OªèˇÙOˇÚ¸áJÔtBá∆{qMyõ∆õìv◊Œ√≠ƒsk¬∑õëﬁKå˚˚Ô˛˛ø÷∫πíq+i¢LA˙¸y·js 6ißÙ1ú¬o5∞~ty˝A=ï5jxu5¬`{•0î(÷FtÎI4è‰—Rgì„≥.èùqÊ≈º'‹#A◊Ÿ26∆´ãh†rÍü¥ÇØ‰˜;mwˆeó„±j9æ≠ˆÙﬂ∫5kŒäÈêvÆ≠≠ö„Kûˇ,Yx°!óñˇ*çÁcØÙna±wcÊ˘˙ßKv∏ÅåV„ã’¯V∫{˚D£$%—YÕAä#wıêz¨HU§\π‘VW(¥Ò$ÔßREQoÈ†‘ÙÄ>e±∏	T¨å⁄Q…à±·U÷ÙG/‰Èbx©CæŒù=74Ø6≥›⁄6@h©d®VæA€·◊ßk⁄˚"¶”å'69 ùJf—S,\¡ÁWScÅP]ï‰–êSØ∏Œ]7Gˆ÷µÃä†HU∑%Cúç	ıæ»Bé÷Å«˙R0H˝tFÊ^\7BÓ‘8ó˛Ìz’O\BóßˆŒ˙û^∂—Fój2/9@¶~πçó<W•<"∞≠|∫»±(5{?o‘Üﬁ∑ó∆:4Lu¯∆vMpiD.TçZ‚%B m…’d˜kÁQ ú ⁄IÔYı¢‘éu®o©rîtÃÙBjÅç∫Mèzœä$∂Ôlp√9îØ`—®P⁄o5@sºöV“R≤é¨`cÖpDªYÏ iáÁÉÉ‘ÕbD©3·œŸ—,õ∞=W®∞À‰ _Àiöfîß±H≠ÂÑhÅ£3›'UﬁÓ˚‡ˇ„ñªM3pCûT7˚TµÓπ».}qFø¿6π[óYNØ5Óe∞“°<Ï€éT‘ÒABf1;{ZåÕ=ÚXµûˆ~7ˆi8wèÙçôˇ¥F—XYv∆‚∏K¨∞)iEyzäòÆù<˙•–Ì_+É‡q$Æm]◊pÉ∫F;≈ªê`óHg3ytwlù
Rc3ΩGKÄ©¡jì÷4Úù8—!P‡9*˙ª*|´W‡É6n:Ò,`fÒYXEø]vás˙'-≠÷tôÓ–1KBﬁ%,˝¨iúÈs>ÁGQuπìÇB◊∫•;Tu´wm•pS©lßÆm7À=≥kº¢™∏ò)¯9¬hπ∂·àÕ±DÚ∆Eå•Æ'•‰zÚT’¡Ú”ß∆‘Î\¬¯n‡‹rµ©	ÂTT„T#Ò‹•†.XÔË∏/ËdèkóIûy±%v™^æ¢«˚å√)f∏Âæ∏gœgtë%‚éΩbf˙∏–1>-í‡<&–êÖÎﬂ∏#Í∏B∏vAjÍ”®*"ÙÂê˘Ã5Ù•YD(L4ØD¬‘õÎÜ_ƒ…|ú¢NE|∏ÛÆ`X›"Nö•˜õ“≥iú£L=æÂlq'Õ“éiI/ßìfÈé“,EPX~´—`w8CÓ:†˚ìùÉZó{’ ∏3w1h1Á≤ıË∆öïÀÔ>∆|”d∂Ω,k˛∑Á]Êi§6Ã≠5Érl¡—2bhô<*úû’#QTøp«e„7líâ>≤ÒEg‰]0øFV"Z˘]*Z˘ëAe˝   ˇˇÏ}[s…ïÊ_…∆z-–MÄW›hI •V≥)RlÇZá≠—X†DñQ∏∏.¢hö˚∂Û∞≥ﬁÔÉ#1O~ÿ}‹àyﬂ“`¸ˆúÃ¨™¨™ºUÑH5j∆-®  À…sœÔ,°≤ÿUÄ ‚§9‰–Ôhq‰Ê¡Ó!˘9˘>§ôÅ ŒBÖ˜,∆8~≈ ¥ú3O÷[IciLÚÃ=>x`‘KGà/q0€'_ éﬂŒK≠tæk¡h	ºÙ.¡h•´øD—Z¢hÂP¥nAõ}&ãD0í›iÇ“ôå;q4yâ—.ên\K∏ØŒÊ.@oß~Ms:É÷ˆ∫ä]ü√ëhùÒ^!%(n^H1ô,ê“Ä·QÈM|≠Uheæ[Îˆ¶yjà˚0T4 -SoüÎ˙≠¯≈ÑaMÖpæ√ HË8Q6ƒ-Ö®îF<≥¬2cØ´†H™Ç[2˜ﬂ§	Ö»‘%È¿=ËﬂU$2~ü0Ú:°f™ÒSB˛†E9∂ÑN4A'&{¿ úò<÷âŸZò‡ÖU[¬'÷ÇO¸*Ad·ËÜ‰è‘›…W‘ÓÊ$~ÀÔñﬁj+í∫Ó(v¿î˜'#B+›;D{‹g)°ü)qâO)iÎ∂‡Sπê-Je˛π∫Xï˘V¨+ãæ˝∏ï‹?¿°ÏÿKÃJ}Á5òïôXªÛ‡z*ÃJ—
˙úòï≥nrY+üø≤˙fTo≈ õ[:ºõHñÇ˙∏D≤\"Y.ë,ÁÖdôm,˘În€Ótÿ&ﬂµIÁ|‰»∑N¸oï.—,ø0†@∞h‹≥I‡ï"‘îRÔ†%t›E˜€–Y%˚«ùUr¸˝ÎÉU2Aè2+◊*C‘∞«Ó:◊E≤w€“A&˙yËoGjﬁﬂÚß≥=∞s‘cloIÔõ›í61?pK+'6^qY‹í;é?¥e%òJÎô–ÇUû°nH9ÉXejãÚà0˘R,¬íßw‡O±2çY™ +˘ˆ¨ÜWi@†L2ªÊ@Yg3VÉ¨T™OHá˜~ë√¢Ã0'©Â<îΩ'!ÿd
Æîˆ=’fó‚í‹ZÂd	8YE/ZN~nÛs	8i;‹ü0‡dQ¬,a'ó∞ìÙZ¬N~nÿIÂÎï{WâJYK_X0X•òív≥`ïEàF€≥Qe¨FyNYI»ŸrÎZË9@Ò‘Sé‘A+Q™∏RË,i:›Cãt:• À'£Â\À—û4Ø¬|
6œ—Që° ≠"Nç #qedÃG`L5∆!≈ U;Î(ßÿ⁄¥ív#Üß(æe”®]ÒºSz∏,ß±jåéU”Qyãê‘ î
£z£åy¶Èav¸m‰åcOÃ3∏Õ÷&5]œß≤©Ü.Ì∑ÅC3·›⁄LÄç∞fu‰Ã¬ÅEôÏ/§Ï
^-—˝YeRBâ6â
À÷¨PöY;y¢ü••ƒ__øç<fX8r€P+eˆp™¢á†÷È-ãºú¬ZÜë¨•ˆw¬@/√»QâY¡V`WU‡ØådJÏ@•Ïl	ﬁÜ”cãöiH`}ÿ˜ñÅfZ	õk–LhÛãÕL∆∂Õ\Çfön™ÖXÖ#ÍÄ2ã6U5S–ôJDëÖwÛXEh◊öŸÜ˙lq‚n
!3Ø_d∏y`¶†°€ c¬∞nSÆÕA}©(ôEóQìä∑ZXô\=®3…ì´2ÇØçì)◊¬q2S~;q2Süñ5<Ê√%<fÊÚº=˝.„c
›ü•÷ƒ7_fïÛ4≈K8_S·)R¿Œ,ú≈©∆œì·Xú@)^3"]ä'T‰4s√Äó÷«Wä◊ùE ¨«Qæñpôπk	óY∏ñpô:◊Íóó≈ƒ¬¸·Ñ;óãí='ÑZtLˆ–o‹"LÃr¥¯)V%S„\‚Ñ|Á:∏ﬂ◊(òŸù|*E¨k«öÛ8ú–5)ÿ•z8·há~&äÄ2Eã¡˚J<B4ó∆bkÅk*òì ƒ~≤?rŒ‹˝æR›.ˆÄ◊)ANô‰bLc*n«y÷#˘V±.Éã:ÄiåÈvpG=ÁíFD·ßô„Té˛©
—⁄‚≤ÁFŒêsò∆a“≠˚¬≥=CDó∆ËGN<çÂ”âì˜—ƒéﬂ&ìÅãç¿tÚBÜkö5ÇÔÂ%õ›„„5`1+\¡‡©?b^ºΩ Û‘ ˙>Ç=9Sh÷ÖX·’ƒÉÃ†Ìb∑i0˘ ä#‚è˘±G¬æÉ0ßA;º£Gß≠,P+“™Zî[åÇ–Jb·y‡çá-π”Og2öMDKﬂ≥*|†Õ”…1t&"O	gøaÊ˙⁄lÜ{í5‚Öá1>ﬁ€£8¢µ:ücl8x˛õÁ+‡ı˜Ó!N>C'é≤{˛9ÍàJÜ{ÿLË›√Gåw!Ã{Ï˜V4_“ÛW±#pÅe7|º›‘zì3æg d”MÒ^¨p∞BµUS◊Gx ºÎ%ükÌ¬Ø¯¢˛∞õçExÖ‘◊Í9˘ÅÎoı∆}:6K}…/c=3wÕS'œ‹lœ¨÷Ñ˘—.I˙.zÎ∑tØ1˝m”dßßÏç˘&‘C„D)“líl®™'ØW⁄`fDÕ¶≥Jzîè8î™⁄˛±[˜&£©∏ÕÛ+;Ä;E‡RπL-ù/^/◊ÃJ„îÇ:`∆ìÅLPc*^üãJﬂëa ,<¬¯"+Ï†|‘9ås™ú9ïˆ·‚
¢Õ'CúÊÇº±|pd[áÛ(ËHÂG4ÉH∞-≈{ﬂpzß√˙Sñi$ÿÆy»íJ ÃIA‡mq~UvÍ:çàx≠«˘5§›2Î —üT®&‹ B¯.ã·œ.àg≈UÖqMql%ê+	æ9e±|≥˝≥\#≥pûM<◊–≥âË˙Böäi&RU¬Hw^ë⁄Ø’”≤5·≥ŸlüÏÙJbﬂz„≥Ωâè•÷ΩèÓä3d5L¶¥Ã¡“jZZM¸ZZMK´)πnç’î0™1úR∑ab5≈xÏ˝sYMj≥Èπ\Ë#˙úxÛÈ$r|˘§⁄6qLŒåÇØ´ ©ì=Òo
ÏuÏ^êÔªøÒ¶jJ-û Ët´O‘∫°ÌD4Å˝ÖÚ« ≠êîroxˆî»gAk£¨≠ëÙ–å3dËﬂÏ#ÖË¯&ÃÜû!%U:ò”º¢ö¬iÙ¸IØ[ ¿¯Œ›q≥	s¡≠hE`å%Jì~å·≠vübûæi∏f√1g{±v"o‰Üë3JVeæQ=¶{ø˚∫!PâÕÌ!®8ns}ïl¨[våÚÃn¸·É˜…"ıDœüçèSl
g˛[Z*◊ÊâÚûﬁ˚[L*ø˝˙Ωiú∏ÑÌA¶ Ωˇ·‰∑Tß˝Ì°:>¥+Ã¡5¸ôÆ’uà“Æ}Ãwá∂ﬂúº‚$Úöf‚¿ﬂ)—Yµ”G’úL¢aw6i¶›BÅGõx‘r´L|∑Ì2R3AßOO√ﬁﬂi¨lÃ4,&ñÑdw‰Ñ„9@÷Ä ⁄√àŒ–≈6ÿ…xÕ<KfkLW®∆†qj&EN˚VdƒÔLäU‰é¶{Œ¯£jÿTüﬁ†õ∞NpjÅ›∞∂t™AˆF]Œ™§∫€Ù§u·¢Û≤ΩæÆOO9¡ô7Üı∑—cY;Fr8¡ÀXˇ∞Òp”1fF˘x>Ôˇ@/√˝Z$vÌèM∫Ω,6$≈ˇg˜V€πÏ!£‹»ÛÎØ-ˆ†T;[1æR‘fÃÃ—¥3Ò“ÏNº@ëŸõå?7"lÔêhB0Y·¡6UlúÈ‘Ö‡K™∫ëf¬õ&cˇRœ\π~ÊDfå?∂Ï>,Ïá2£·aí√⁄t|f‚r¨9÷5|π k;Er4L◊⁄?‚;ÙçˇÄØ¸%kmuÕD˘çŸ@√Y◊Q-§0üOKÇût◊kŸ¿MÆ€–EÉP±çé∑ô4æ*Ã–*π‚Ì¥(ü◊w¥≈œÅﬁ±B$® ì8jäÑJ›˝ï_"i~ÎÑ®wπü‹~å$“s˚N∫§L.BÃ†‡èÖÏ»Ò=êÅwvÊÓ √)†DCﬂ¸ÀzåHŸ˘kÂ,⁄l_cÎÍ}ƒ™`™Zu4 ?S±MÖ√Q9W†Ì™‡âÓgIö„IÑ=ù\∏i·¿¥ ö’ µ	Qº‰ñ\OVàñ˜D@ΩíwË˙ΩlÂA5€¬±Ü¯õ Û´Yà˜á¿g1=6§∆h¥~…6E^”/˙ÆWﬁkñ‚=E$‘ñ@µ	ÕØ`˚6nß*@º™F¢™ç¢Ω¥âH·U)ÍCH›ã7vß∆iì¡n;jcòãé·Æ⁄Œ`;Àı≠V¸å∂P3Ü¶zª}Ø˙±4ºLÒ4zúIŸ£]Ë¨¸ã:•ª--ÙHÁ%$ßìâﬂs≠RÖ…—@®0π≈Kså¢÷Ñ|êûnŒß.oHœ9cè¯Ló;RÓJ ™ Ú`yÚdÒ8∑”3&é>hO≠À÷:¡åm¯gÍ”ßíÉﬁLÏ∑h√êpZ¡=·£»JD*∞8ï¨X5¡“Á—Uù¿cDFvu)d¿G„Ü"Ìw€m∏/GR-eË¥Ñ¶⁄Õ?há©ZF"ÇÂyå‡îAÎë_Uéç™‘S∏%ÃjZ¿2Ã`]÷‰zèºˆga65ÿ£é˙#¢Öp∂dEd[…Œ	–°Å['PlùòJÈ§p™Iñ.ôÛ∂‘'å~¸ÀˇTpRıÈıπ)b“èá≤¡däz¶í]…9ìã £’ñΩÿ’˜ùtÌÕ'÷æ}˚Æ~ñﬂdJÕb6·T#y∆ä®RY#ßBÄEO÷ÿù
X‹xÏ˝>vÈDªr™Ôk!ßí7SH©æù¨9|Tücù¬{T≠jª)?l‚áR¢Rã0J`≈æó"ÚüCﬁ'gç–U¶-º\xÛ–„π`ÊSbÕA3èÚ<Sûå√SΩNîú]Ÿ!Gì—$ ˚`≥πÏlÇò,kÔèœÂæCVÚ‹Ω≥1˘99ªß	îü„!ÏÑ‹≥B>Ω-∆∂+É!™:&,πøˇıø˛ìŒP˛ASJóÊïÉ ¶ª∞áòø@OqI˜‘ñ|_>±ï9yƒM√–Ã“R®„~rYø-∞√ﬂåœŒúsÚ®GOLÒ¯tΩd¥THÜ√†É∫s‘Å€Xz¸{2"#œ˜ÜÈŸ,
Ì¬&ˆØÕÊJ⁄R˙ˆ§˛=#6I¿3ﬁVà°ﬂ˘Óy⁄wi[º#¯ÍUvñçñhtá–é9ÈëØ–"'ç*)t¢Ö⁄äÔ N!ÿ !“¶I+¿‚c¨ä¡Œ∆M™zh¨Sµ9+f2–Õ-W¶(åhê–˙>6u‚~êÀßﬂwß—S~¯ÖÚWK‡üÅÔÓ	Õøô¢[Œ®Äpƒdπb-õÅyûñìMGõ˚ÁøI"’éTdLKÜZ^ÔdDU«µ¨X¶RCbÎ¥ÁObk_,{$cö/)™ô|ˆœ'uY/∫¸¶=eÁ«EZZà˘ƒH¯ƒ¡∫â/ØV$n»#9l¨Ø¿Ê@%páTÏU≤ß
ÍÂœ°2§Î_/æ"TÅƒØuÇ—
L“!«Å˚—s/PùÛ˙N4±Òqâ6∆CyŸÇç˚πu¬¬ j˝®¨ Âñy ÉËY —É‘‘⁄ÿÃå£I≤Æo≠ÀéMÏaSD∞'â”-;ã5V`ËYÌ_%∆∫7:SPZÙü⁄ñ5m±;πç{Œ˛ô–t,XºèjLP«…wzèzcP0*î›— wÎ0i•–k:xs^2Ø¢?Ÿv√)pÉ©^Z–XÌú≤Ö GuæÁO˙C±Gç8©ˆ¨ Wà@aŸ©;AmﬂQüZ±!O≈$CˇÎ_ˇ5ìs\≈§fÈÏ‡Cˇ„ˇ¢’á 4_(˛å¬<WâM5[}3§f;µ ˆÅ7å«}–d1S¯π7Å•ÖëÇVã	0
ˆü∑6§Õ5Z≈AÄ%D÷∫#'@ÕhÌ‡ÙxE3µO¬(òÄælXhÓ‚P°Jí~¥zˇÈè»ˇ˚3πø∫ı¯|Vë7}≠ºπö.ü»Y˚ó#x·mà…™MÜ%πs’îß\°6∑“π"ª»o•XØ&∫k⁄úÀ—u®u˛=(áÙ¨‚ûu"ùÍPu"óUcïïèóû«¸AN°∆%ºo2È7ìG‘‹’ÎÆT¡RTUA63tAD∑Ôø£%V‘∏›Lqﬁ^Ø§)¿“Ûù˛∞P/P…8Â¿T˚bïD]ìD_Õ4sÛj`áŸõÙÓFA1=DèóNÓÿ§_“∏$∞—Ô≠h?Ú“*˙J°≈ØK€©î¯©§‡j¡ÒM‚üïbÂe†.ºÆíÕ≈ãXPé†IˇY[C?F@ºêDÁ.9Úêjäu4∆4{⁄(~8⁄Ô¬*P6Ò˚ÿ‰i~åı˝>8eÁÉﬁÁS,ÈïÏ!f1'ô\]x•Ô˛Õ1]›:Y›&UùÕÅ˙w]Jñ]~∫Uv∫Unz•ÃÙ*yÈö|OÕOñÈ÷˘Ë’≥—Õ©ﬁ: œyÒ*ù.™ò¨,ûö)‹Ó¯êr5Uiπä§^ç‹«ÎI¡QºxΩ6I∫z*ˆ √˝<Æj(‹¥ä∑õ€(–¶≠˚B∏å=ïe˛pÉ8†'Ù3∑JÍ*Ü≈Œ·©»Lù(≈˙Ääq™√4%ÉÖì)i˛äçtÑ3:¶UM¶≤∫àBE3ÿw#êº¥†ó 9√Æ¢kç–ŸŸ˘øÖN©f'S—∑î:ù‰%√6xEª≠ﬁPaA„CJ.ô/)õ ≤/ı·ƒwëL'Mé'PyåÁ#ìö5«ÿ≈óXŒ¶eW∆Fã≠kÄºU˚Æ¯„÷Â1íù†^ﬂ)Æ/]‰SU¯™“^/ ∑.å≠…v∆‰lbÿº'f¬√KJ|@iJzØ∞C]Çµ9'õ£¿Í:^œ‹û„˝RÈd[¥WõÒ2¢=õ»é]eüx20!dC`ÚtÀYS©zw—¸‚·˙îeÒú%˙OÚúm5ü£7Êa⁄†R+-'ãoÖ‘wKœîX@dKr2¿lﬂœ\÷E;ı1+ÕÃj9F®v
Eì◊≥Ô£ B«»›ŸU⁄§ÙúòEn9^çÓ·19Ï‹ÎúÏã@é;Gœ;ù#%Ãë0ä4è¬]õ˘°léƒ7 ⁄ó‚"%i"≥ÕU˜ŒY£÷3∂˚‚§s›´Œ9|ÛjøC~¸œˇJ‡ª˝Wáoíœ«'/∫ßùÓæ’4*Ωf∑	ﬂ‚)/ﬂ¥`ÊV¨\≈»5µ{ì+„„ BΩŸ5_˛=˜6nŒ≠Â€Œ®Z¡˝ZLõ=˚@ë¶c€ÏI˘—Ñ‚ı„ˇ˘o≥Æñ_õî2ÕÒ‰‘(ÿ≈¨-≤Î«.˘9y†Óıíü	‘Z2]
¶©p§∞«œˆ†}:„=';Q7àŸò≤hπVIDmmKi*â)3‹´õl:%q—ÊIÚºtSQûå4>…Ç#ã-Qì±NÄî◊∂S#eÌÌz{}˚]¢Áπ™~†[Wr∆§°»p«Ú
„“˘Hs˙>(ÙZ£{}∞J/ÅØxgc,ûDgÛ\x—9œç◊~8©8Ïºqk*áIHÈ.cz∆€á∆∫ÕRæ∞ç|aªêÍõ≥Òπ›üÃ¯¶EÇCŸˆÃ“ƒ$+”CûÕrQv'üû6÷…:Ÿ‹ÜˇØ»Ûﬂno"˜:O>d{`Ì±«GÛiÉß±Ì°7—Ùåçé„ Q=mnlíçÕ˛f{sF∑1¸≥“O≠mˆÑ˝AÿÇ∂ˇ0ÇŸË√~ê¨∑¡/[€œˆ«ÕÛç[õ˝u¸ÌAÎ~{k⁄x‘⁄˛C√l><YÉ%±R*—£`U<ñ•%?n√è€Îx~bÉùüPT}êÍÉô§R®Äy0ß8bl,›mbL,ƒp^X–„wÑJ8u˙xÿ+©∫{|åÈÈù›7G/;G‰ÙÕQg6UÃ<ÂîS”ŒÔêÁåW’`Tx|DÍå+∞®ƒ º@§ÇA§∞©,8Ü4ÔÁ°‹äZAàÒAf*ZsGù√éy/ŸTê≈õ™04Æëmñáú#{A“≥ä¿ÏüÇ	…KÇ˚ö∫ü∑≤*_nûœJÕŸÃ¨-õ∫;∑ﬂù¡ï≤—ruáÂccƒT∞ØÀC±/-üË,óº|ºx’π°EÌ:˘BKV6^ı5fêCÛ[e„iy¬¢∏<¯3˘DÉ˛ï’˚b	`Ã%FwπΩ⁄ÅN@Æ†R'’H≤hïÆø ÀXgg≠$n%¢Ê≈"Àiö…ã≤beYºªjëâùYëÇ|L˜u>’mÌ6≠=¶7Gßo»nÁ◊ù´aU“é¶T÷ÜjEg˝h`ü™n÷∏≤É—ÆV<Õ1nûÆı@Ö◊ é›Ç?õ§”#ΩﬁCSarY≥ïxÆΩH2”ßÅQôfô‘.ıéVèï∞≥z≈ﬁê\µôÑÛ"ñ§7ç®BØƒéPZQåM¡n˚B›Ö√D≈‘(˝â˚Á›päÏ»t[•'å8Û[t≥PWñˇ≤ùá+‘äÍ˘LTAH0b~å§úq#cqYô=V°÷¨û˙S1êÇ?˛ÔˇÚÔˇˆœZ‚6óÜΩ!bHÅ9
ıúﬁÚΩ˚Œ—+F)AB%èÔÁŒﬁ©E-fzlf“î≠ÒBLòk√ËL¥†eÖö•…S◊∂o
O_Ø‰OüZ◊„%˜w»+g:¡3"?''Ó–ôzQÏcŸM9^ü=q'jÒÍ+&cÔ∆=úéêt©÷)9®TèÒÙûÀPÒ‚LÂÕ˜’?≥√MÄ˚‘«Ì∞ópúìÊç…ı∞˝yÇt‚ÇI◊‘]ŒS‚KæDˆÉâè b*ıDÕCMú≥Ã/;|ÒƒÖ’å`-a)õçsö>.G41Bπ{09†…âïdáµEˇi· 73ï1zëÉÊÛºSÅ˝Ëî∆≈v õÇÌà¢è•ù·Hs,M*ˇ”1*c]–:´#Í3ÎyÈ°:ø±Á¯.=¥∆%o¢H7ˆwt¢d˝PûıRBÈ›0Ω»}[·t˙eíl6º%’í'ﬂzæªwÓÇçó#[*Å1Ãrá(6‚%∫ød≤M«∏§]Úd◊	ˆ@ E[2⁄M
∂ﬂ!yaˇK&^:æ%·òÓ+«∑|¯œ¢\∞X‹/öÔ≤.i‘\ﬂõˆ&N0PpÁ
˜øˇıOˇ4VÄÈ,9 ì=t`iÜ∂€Ób∂ß§Í∞áUc*_}x”Ììh8¿©Ép|˛é¸Ω:Ñ$5§[¬Uò˙≠∏#ÅeŸ^XLNá#+Gí›+>l#+Ö¿ úÛZœÉÒ*ΩJŸºì˚¡z(∂L“Å(PªUPïÛD†SÉÖUaõ1Òß~MÒIzÁ˛†Ÿò‚áV@hÖ.∆®û4ñ[—∏6ò;†ƒ≤#)Áè=Ω“Rá4–Ea2®∏¨ÂX!«¡S8-TöbßÊ=”úK3«s‚ò¯˚_ˇÂoÚ8ÑŒÁºí‚µÊ¶”c«úNŒ%yJzûÔßê3JoxìÇáhÍΩv»êô®–ò¬Pdh¿õ:ë˛.‡@ø⁄ﬂEæƒ_&è1ï””i÷N
™“‚¨‡ﬂªÀôArq>"Rq21t:îüXÃMdòõ(77a‹Ôªahòû‰T~ıûúÛ$ıÜq2AÕﬁ∆Åú
SÖÃﬂæ[±ú1#J¸˘ˆ1¬˙E›ÈÙ4;¬M	|@Ÿcá-6 £häπvËFÁì[m‡…Á∆Í0_5‹_∏ΩÄ˛îÇD5"úÑÜ±êms#g;~CSÇG]®∏É∏Ô6õNøøJ˙§©ﬂ'_ì~€Å`åVâ±~t≤∏Ø«®!}ﬁ’’n Úí◊h^ÌQÇõ_s∑cÕAP%;:'ƒñ[z∂ÊnœÚ¶{˙sÆÔrSÛk´û¯⁄Aë@<"Q3Æ{™B†›¿ˆÂ¿Et˚®±»æ∏~ÏsË<fŒ.À˙ø;å±,Ì=òsOS›ÆNﬂ'qtÏŸBz~‡Ñî`^MÜ≠&úS¯æ. ãØ%¥¶r-∞∑å›ﬁëk>ˇŒñîZ≤â5⁄cji@˜´*3åπIò=ÎÁ/o¨hñçˆ±W5µàgÉx±7–AÆ!Ä˘Nj˜YîRﬂßç¶h¡‰¿p8õó;§—=>÷"øÒ√;\÷kè&„Ë¸ö‡«K◊	ÆﬂÎÕMÏNq¶uORˇ®ªõÌºôÔÕΩ¿3ˆ#w7kÁ6+ÃÊ/'d‰ßA¿ì`§&WÅr€´Õ K‘Õùz#;Íç¨®W0Æ-	8™L¿	c±£‚®=ûD.5Ω]7¢ﬁ9´
ƒ’ Ê®
1GUàY{WBÃå‚ÊK–(9n∑Zùø◊RÛnéÛuc¨?Ç€mù^õûò˝¢9>ÕûòÎ~â;mª›îôU"˛Õ∂iÓ;‹eÔf∑⁄IòÇyè›Çû¡¶”FJZiüπ—)|hÆÄ÷ï˛ÿ+˛8ìÒ0mÍ*Wå>’l√x¥J√G,‹è@˜ƒ?mÙ[˜Ü∞ûY^&·∞ü˙ÆØŸyË:›±˜õíº¢læçŸ„Ü˚R=€‚>´sz∫ÂΩL7‹úS·˜ÊuxıÕÇ•`ø@MÍ{E@}WN6i2]c
∫V?íòäöWÛ™;Æ£Maú“ -˝ÊŒGg””`πÏ AÂÍöJu÷È™Ú OÂ9yq¸˙‰îtﬂÏûvv…∆yﬁŸıkÚ]Ádøs§|™TVƒú±SË∂¢	EïÁ‚K?’äkTª
—PStˆ®≤HΩ†ß&‹Y-–i‚úKpS&vkµÍæV—ØG∞è Ã-v0ˇ±Ã§®Ì˝´ˆõﬂ:)M±˘EÊòã˜ˇ¶VØ¢Øø¶óû=µıÏ◊˜Èœ£∑VﬁpÉÛ{∑∑§w fuótßnsµ˜ø˚¥≤ÄJ¯VÚÖ/ n·—˚?l|ﬁU\V~ÓZÓ:û[áùw√‰◊∞ıaÀ]5˝÷ãÚX[¯™ı^jKˇtœ¥ΩOzot?¥≠⁄Œ˜lÚ:WÒ7€ü‡c¶ŸósVa*$böì0´ö˙wYÈVÛqp/Äù+Ÿ5˘π…ymÁ∂æ3l‹Ïò∂ŸJ7Ôåæ7¥Aß[îÎôΩ˙ôºê·”bvÔàRÀ7;XÊKôoèÖŒæb7Ø$≤Bñy˘Ñ§86∂≈ÈüÕµTo¸áfÛÌ?Æº˚zÂV÷<©≥0-Ÿ©*±&÷}ªÒ∏»Ù¬©Jé Î¶—∑ËπP8v¶ “ıΩhtè:«‰eÁÙ≈Ø:øñNãÏÌ…√Øè^ÌΩ «/%O  ï§Ìˇ.®C¨⁄fEP‘"I	J64ˆéAB1%*jR˙À1Â:~Ø{ÀözßöH·x›U ã÷¡r‚üp.Ï&VhåoÚıSq«»Í'œl»Ó‰ÎH÷kï\]#€;q˚¿lü∞∂*åhc·Ü_&√bíÎg≤-\°≠cHq÷ù∫4Eò◊ï¸ ¿˙™·ÌåuC√ë∫nË}Ü§<w8'‰"<ÉWöÅ-Rj≠RˆJ_øùë…è;˚œIsØ”˝nÌ∞sÙ¶ÛJú7!)
”èäΩ.UÑ“V.«ÎdJÆr> ïù´áX◊˝ÁÚC›≥tûÅ∑Y’Dfóæ¶Ë_∞»‚¿À"ìØ˙)„xUMóº—xøU©Ò¬UráÒZ·u¥57]_5à∂®O√–£0HdÏ’§)=†ÁOå¡peíõg0Zqu˛¬‹˝KS∏*¶ã·U‰*7Ã"ÏN+|Üé}ﬁ≈®x…πtµ YÑ;ÚËSC≥ı¡∏¿A¥õ0-Ê“Ïæ8}}B÷*Pdˇhq ”√ÍÃ-êπ´Nõœt(á]sÿs©øı“ÂÜ´´*d[Í¯≈QÁdˇ >“Mı˙ÕÈÕÔ™`∫≥l)ñ¸≤˜î’Y1vÕCîÅÚ=\Ù∂ êﬁ) ØfwÒ;a{·≠ãŸaiÔÍn±◊ßùWÑk‚Õ√˝Áß'ù£Ó¬‘Ò€+Áì˛ªKòq÷sw‡≈#˝VSª9Ÿ¶∏û≥ñ¶˘IÈgÎ∆£ë\íˇ‰ƒ~Dæs§l[?ÓÑú∞_Lpe°æ7÷/’{ÈnÖÙ:qá∞ÃûÔ!¸ÅíS◊˜a8âÅ49ÇôâÌ]•ùRås%› B\TÀà˘—€Whsá4∆1hñ^ø±JhÍ|„O∆g'¶oøìk]{⁄Z3∞IpÜ±(¨ﬁp‚Q‘⁄ #ÁS∏±Ø]≤C7ë˚¡à‚≈® —Ï92†Ò—‘â‡S‰åzéNûÖ\L0oIËÖ<9ƒœ<2u«\¢°ù⁄Ü5;öˆx“aöäºÅ3ÑÊ`óA˚ÿ∑|?J˚‡ÖﬁP”RD)±≠ôze˘p}ôÜ[`z≠õöãI_¯ú°œ¡wSøı@&,m±i*ÏÔ¥¢®Œ §%Œ¥DsÙ‚ît^ÌÉ‹$œ;GÚÌ~wˇÄÏ¬ﬂö lVrHÛVñîé¶GkÆX}ˇLlVÈgWbn›≥ßd±?ãì—HA=ó}!ÎL.ì–ﬁ8oi=É¥{R3Ÿv:fÓá!t8√≥ñÄ•*o*ıpÉ™ë˜µ˙aZm…Gπö|Ã4ÎïZ‡ÍJd0Éùˆ‡?º3ΩR(›û4„;ﬂ*!Ñ™ÀÌA9`i’“w˘˙¬ô∞ëÙA–`˘íãµ}$ªØÒ,QØmÍ÷ÂJ»ú«a
J‚KòéÁ2%^›ÏÆùoig_&F◊À∆§]=«Ci£©Á£P¡ ‚ss (/)∫«•C’mÎêX—sT∞æ=JGXµl?NùÅClñΩ—P)¨Ã÷,—nE;ê§¿´∫ ÈEr—öoˆf–)ö@@›qÏÓÃ—*2_R¸ä‹t≥µ7Ò„—òºƒx;V…<t·’˝êd…?O,¬·é]_¯M]≠Œ–âW,]ß∂xl÷◊ç≤«sﬁ¨∫"Â˘	b.sl	•»’Œ∑µÎûøiÿ[:√TÕ25éÅ¥‚Ï®◊⁄0lÎéÚ¯Œ1Vàızb∞SÕéqq∑Ï8∑⁄∫),hD™Âxî´Ï^∑æ∏ƒˇ&ÏˆB}Ì∆≥ÓÒÒ,eyÀ@Œ≤ g≤¿ëqÅÒBf¢ˆTp'†á.@/sﬁß”{+Ö¸?1˘O»¸´Œó¯ÃRø¯ëj]ÚdW™∏Y{ÇGO|2yJÁR·¯Œnåƒ}>ﬂ›!Õ/Z»ˆ`éÙÂ±õ§Â6±‹&ijÛ|˜…4¶æªx)Ç9¯À=b1Cãﬁ s®PÕıÌÕùDÛ_K,ÅS›m–ΩoØÊÜ÷T?ŒlËS7ò:C«#ÕÇAÍ¢∫6ûM-Cjé[‚uı∫˜;∑µáÓeÿT‰˝'DLÈ=ê¶t4≠S∑∞'=0ÜΩ>≠∆d±w] MÇéÜõÁ¢Ø"¬ıãú(uD®ùÊºØõnÖÏ«ÃÁñ7\ÕT“sdo˚åV	û∏ﬂ±ce∆—”áïzz≈üøñ¬OTr<;Å®r§+g±<™˙A“Wp¢§c≤c˚“óù”BG”OYls=ù3¥(1⁄'•fäY∫ÿ\0÷ä¥óı«Sÿ}EŒ»‘‰=•ÁHÆ?≠ÿæœB{ÉÕ§É⁄	∞n⁄5^1~à≠`…+$ÄΩœ´X"Z≥Ì2®Û«GNœw≈7 π¢*Wª˙“´uô|∞q˛„ÎŒ]g`PC¢@!‹’*± \⁄>>œ˚ñOcÿj<˚ï3ƒäˆ—yùáª4ƒªFéˆªuõ8`NIØˆÛ.∞[áô–uZwÓ—§M^Sj€^∑?\Éaª°fó≤@2ˆi‰çùŸ["„IãñÌÇ)ãAmáSwzuŸHÌO¢ﬁdp)ˆKπØH"ÉMZó)¡»^’“/π…&=îÎ.∞˘ßWèldPQ¶p≠îéGE ≤$¶Ó©Jıeóçp;•˘®Fi†M–S>n´
Rj00>3EŸ©ãj†
¢ˆ m˛‚ÄlàG¬±¡$ö¸/jí≥èmèù)£ßUSteπºÏ“ú-^(®ÜJ_‚rj
ßòÂhnÍeëÿ@ 2„-≥Ó´*≠x±cp”Ú,√ö&z•gŒ<¬ü◊ÌV-VSºŒ'1&mm∂`≤º»êVºÄÁ∆ÛZÎÒkõ”1ÏÇ7¥¥ŸpŸe≥ª¯ùÂ≈ñ*‚™LÆMTˇÆ¬o⁄chì°ÃÙÆsgáçk+ÌUl≠ÇO0=°R’l¿tìB{Ó1x€	∑‘»ì[Á±:˜[b¬\f›„„{Ú:∫ ÆH“@6ì$ê\¥_X†\r@1¨Ø 
®∞^ÙÃ§˝¨ç9º¨ÏCºdÛõÑj4…I'ôeÒÿS~öì_™Œs2†€8Ÿ©√A≥Õ#…dÛ?ÀsÕ®:’∫*ÒäÅ‹ƒ\œƒ•
Öœmèà[i®¥ÿ.œK«·@Mï$…,c∞ó–˙ú>m÷^Ê\Ÿ+›ç*üLÖ-qe\c/®Ì7ÀÏ≈ÏÈl6ÿ<˙NX(2n=ËﬁPpfÒnŒoÄô√¿v4U¶eóπÚ¥Ï≤¨F-ªh—ÛæÎM”™Á’L
Ü†∆¨¯XÕ§`\è?Œ±⁄™µ¿çŒBıÿj]g {y€µ⁄€	ö⁄+ïüsºèï¶ÙYÎµÓàŒw£ÚÉ”Û…ÿ≠Û OÏÿu|g‹w#´R⁄cE•õ-<Bœ‹à¸˛†Ÿ†õ∫∞ç ∂uü4*4ß®!ªr‹e#g.d"ƒoï4ÆÏ7wÄ‰lã-!!=uê,_9¬£Yú-E1ãBŸ	{ñDa!ü6ˆ`áI‚]%'n8Úl±óúOËBbô°ÖµúT¢êﬂm'HÃ>=ºåfpõB[‘Õ¨n—0–Mú≠âüeÇ˚^8X[ùmSã«ﬁLk;càaV⁄GŸÃx≤}g:ø£À@7üÜŸ6åYÑ1()ªÒ0&ﬂ«¡÷
ß+;ïzï‚˘F˙‘íÛÌ˘3≤ÙCßüŒ~ä2qÃ”Œ_8øÛz⁄€≤òYC¯s°—Vªxk)‚:KîOÜŸ$€£qÙ)m];q?ÿƒÛm$A◊~ô°ù›ÿß ·gﬁπ]T—ãx÷n†n¥”‹ò}ú”FÜYƒ:´D;Õâì2ŒdŸ¥åm⁄F7Ö¯Ê;ÌÔÜ#ú∂ì, â<‘>™i´ŸhA6±ÕÑùÄúncÒ©‚ôVìïD=W$aOÀ¢†ÈHmÃâ
ëQJœñZ.ç†"ñº≠ù"≤
È∂v:ºµ^p∫\“t√πz*Åw$P˘lD! [—Óµ)-^æÊÏù1‹;c¿∑R»∑R–∑ä7OEZ3«~Á˝]l¸w¶p•<kA∫˚yÒ°§ˆ–¢˙_Ö¶Ø®D-We$hé#]Öh™ÔÊD5Ú∞DŸñÆ0óËÕ%(1ﬂQV!≥äAâ∫aâô≥á&rU∫™
ø$4°≠k.ªfãH$Ej$Íá$fJÃñò!01ChbÊ‡D≈D’ ≈úCïÇ?ï0≈\UB≥+™Ü+*Eæ≠BVf¨Qı7HHcË¬ºò˘Ë$lÓ§	aÀhÇû6:Aí√8rËÊ∫cx0õº,∂†m‰*:|´v)ÙF–†ÉXFnd∞ê÷Í£„{òÇe$"y·ùãD‹Ç(ƒ˜∞{Í?üá¢8tGìeÇuiûqà2£Z∆!“´jbƒ‰F
ì{´#‚ Öí?k$¬X>π0“œâà~⁄ëà:Ac5mŸ5øx¬±Ñ‚◊t•›Âò@%o.UO®Ûü6}À›ˇUˆï¨ÿèï@˙ µ“ÉF˜◊ãtí¸ÑN3T∏‰Öù ò\<ü\å_Å˛]’Ÿ»\ÎU;x	„cé2
(rU•v*∏-¢U±™,E•àÅ≠¸⁄ó.uæËOΩVkYﬂLOPﬂ˝íWıÀ2›‰™ﬁê∞ÓÄQ‡ÄS¨æƒ€çMÊ\‚1ﬂ´ö1<l<â\Àì`U<èIÀï¸ﬁÙ¥^Ω∑Ÿ˝L≈ﬂ<:WøÄÔfmÉ¸U--CÅv◊-	2Î≠v8∞b>œ|¬Å≠ª¸µZ_Àp†˙ZÜó·@ÈıÖ+˝§¯°4◊+M^ÓKå/>ï_‰‰≈ÒÎìS“}≥{⁄Ÿ≈ ‰…ãÉŒ1ÕœV=RåI^!˙”G˜§ Í∆ΩSß«T&Z⁄¨ÖŸ0ÂzÿMïX^[#¨“\H~Nˆ&£i9\™t'Ûn≤ówπ3ÔÍdEDC•¿Z¬√8Çõa{ƒ_ÜŒ2Ω»”Uk˝˛
—1Ó≠†ÄÖgòS2¯Á|ïné•L=Œ˜„]dHÎ∏ﬁ[ëíz“ÁW±”·⁄u¿«€MÔß79„{“{HìM4¬ﬂøíxm?8~Ë™ª;r¢˛πæú®”ÑFw:•≥’f¨∂Qú÷§ø¥RT¯+/:oJû◊M˚m1{;˝[ˆˆ‰Â¯•‰fŸã¯4‰∆	}ﬂ\~Ïz•R#j6ùU¢>^¿∆@{Ñ€¡	põé‡Lk¨¥}jﬂõ=Ò«UÇBÓàØ¡*π"ºÇ‚ZåÓ*»x*Ê>z—Âπá%›Ó)Ù\ˇ\/p¨ß ˛§ô!á˙*K˝≈/%o≈û»8„.eS0«Å˜â÷  Û√ ~tàôπ!Éô|JﬁJz€¯>ˆ=ò∫FÁ,Ü‚«Æ;…ﬂ˘ºF˛Ò¥á‰ÎÁn»?Ku∆∞±iªﬂ∫Ω ˘|s—óÅñÂ”o\˙√˜ÒX¢ºìÃ	´®z»f‰ia>XÙHåÍ®…-‹ı|7KˇMX©Tb±ì1
I'd“Ì$ƒëJ"!m0Ÿsøvù@≤?ï2˜Ãç:}ÿy#Øèèæ˛ÄÉ†›6r÷Ëälç4lX √›ßÑü¬q:QÃxFÔîÎ∆yâCˇ•‚ÖØQ∫:Íg„±}?ÿΩ*æJy7p§˛pü>ﬁ°“Ï≠
≥¢c•¥Ùûå‚—yËæ")£ 'Z[°'‘VHÚôÂÊã‘2ıÈj÷+6Ùœ⁄Øi÷X⁄_:«F÷$˝Å≠|ﬁ¶fJ≥IƒüYÀ∑±B~A¿jQÈΩ`ZJxF*ë˙¿5¶;Xä¨§'!u*°∏`‰¥√iöÄ@πpÄdÿ«Ñæ‡#L;•%˙«L‚∆/Ix9ÍM¿¨f≠ëÎg∞.W◊≤	ÀÛ‰6ÚNˇºŸ‘Aà≤Œ˜ƒùÄ≥Ñãm¯¿Œ`–Õ0R(÷ÄTû˙≥dsk\+Ÿ|æΩ√!&q5ùò∆è˘SÉHgØk‚ÇV%È_Çöù‡O›ÿ5wB˝¶Ñ•1^Ø≤Á4jS«¸U“¶nú⁄ë¶D)åµ•´≈hµÔ„˚!∑¿÷øO5Î“ÔΩ”ÙåÓH´YêΩY™Ü•*ùº;|ôÂ¨î≤l∫k˜êﬂÓ‰πô¸úZ~∑¿	Â˜≤Ö‡wsQ†ªø(÷4wÂç¢ß}≈∞≥í˝.YÈƒ≥wÊOzéötŸ†®˝i$_”È˜W	ØÏNY%|“è”∂ôâ,îÏÊROﬂ§ À<˚j\yoKﬂi2êÙeéu81¥QÇ´Èª]À‘∫˝hÑƒ»Ö7 ≈’¥F,U0M´5óùûBxæ∑£Å]Qf∏Ø‰Í‹NÚ∂kÑ¶E} -rÕ-äÂV´•$Õªy†Æùdàn{æwNæw«øs∆g;Zóa≠zHosöÍØŒÔ_œ’Õ1Å˘ø•¶úÒ?è?èÔòΩËÙ≠ä˚ÿFˆh>4jTã¸‚}4ÇWÚ——òﬂúãk/ríÏ~ëf
Åb4·g6q9ïìÜ`ÂPˇÜd¨"≠cŒj;X=üÑ¥≥RJá47dÉõ}˛H-ô¿¢Ô0ÚÓã√7r∫ÙÚ†sjÛÃy‚UßkÉƒiÏ∂] de≈ÄÓ4w<uŒ„1È¸ÎYÃ»ô‘‘æÌ£„«∞gÀÆ˝jÎ8ÊO6]ç/+π÷íΩ°È∂AhÇ o”NË#P˙Ó‰œ„o%e–\?W'MQk3;}ıa“ª`G4¨â÷ˇ*◊Í£r ¥¿ÿ“Sd∫=f8'1ôbÎ|ÒË∆∑oÁª7G§Û}Á§sÙdç›fêdé‡ˇ„O_∞ì`º#TBQ»ÜÑ†ËfFu⁄!W6Pvc1Ò∂ælˆ¡î+ö@ºpÓ!D|nä}Ø¯©Û)‰8	Ìñ,${øè]∫4n9Üîø¥ÅÒjˆ˝–Ç62G-öÄóô¬•¶Ã!S
„≠|T6G–DÊ
è•º?€L”ŒËÌÊóY≠Ù‹X¨ˆ« f2öË·(3—Eìæ/qË˚Ñ™{˝¬t&◊éÈ´1oÕ]«ÁÕ5©´ñ$O·ßJe…KÃŒQ?w∆9t¬xh¨lcU√Z*ˆdà?b≈6.3à¶˘º{ı≤}-ƒ¢±∑ÕZ'¢ƒóx"|1-úéΩ8¬√Ûßn≈„≥3g—$ë¯®IÃ€˘ô(¬®TΩ@∂^ùJ˘€Tß¬Ù≥$][»=3$ í\±%ªWmN´ŸïáXküh!˘LIx•óa™\FZÂMÔÉ‚B$
©+ò˜/”ÃTv√»o≠£¸Å∑‘ã™•;YZ*ai±T]&ˇÎø¸ÌﬂˇÌü5§iÚ»|&‚ƒXf¢Ç};	FNƒÙ9E¿zm ó]Ó'ö\	&CÚ–È‰≈ßæÎ[Lê®ÊºqâdˇPÊ1?ìŒãÌ‰CCÊÁí≤“åïö1•Õ[ƒåÒJóƒÌ;”/e˘Óﬁj-ñõ˜¿»…≥r˙ÕóÀ«Òd±?qyF˛Ç?°4ú¸OˇTõçœP&‰–Òl!âˆ`»æBÿï≠Z\1◊z¯Zˆfa—,FrÒ=[O¥ït≥óÔØMÈñ¿|Q—ÔE±èyÒºNÕ˙•ï‡sÛ*üJ¿Aº=E6î◊‘«ãå"{ó92?0È9£©áÖPs:∞Û»ò'.:ë≥åÊ!l|ó
Fz`Loõ"——özõÂ…⁄¥æè[ÖÎ)›ÿ‹5Í⁄®}Ï:;d5Õ¢™:∏∫–ı?d˙ózÃ"m`VóŸD5–ΩÒ¿	&LZnóùØâÓ+¯;pÿÊ“:S’b…pñÈßÈêåBöÖö{,ñ#Œ¯†™b•±˘|$˙~˛¯_Ü©¨˚⁄àÆ~Û¢º"'È^Ì≤y—n?spx—*X_Öfc˙©ìËèˇÎøÉmˆ2ìªV2¬h/œ i™e(Zåê>|áHó…vÆ¥˝bÕZ¸,Q*ÁÜRy‚~X;⁄ÔŒÄ/	ü¶êÕ–»¨ ó«¡‰,pC≤Ü‘ÖôÙØPßö∫§E¯äæç4yí™πT…¬:&¯¡Á€ª[	£ô≥0Ñié‹⁄‰Íiì›ÛW!ı›Êë4ó›∫}c*ª‰ãƒˆB∑TiÓ‚um∂át§‰ÏIe“∫†éñ0j¨ø¡±ÌX≠∏L:¯±g	€Tøπ™∞Jì¨À–Ïb˙,Êâ(z÷}N`yœÈ“u˚bÔs»‡“∑x⁄oﬁdO¨ ™ ùS’=’µŒΩLU%‡:|aÖ€I¡#'"¬‰åÏ^5∫0∫D8¥+<èùÔê˜?ªw˝ﬂW√≠yVr≥‚ÌÍÑªYQbaó“WËz5dΩ
‡¯˘H•A4ØRqyΩvUê∂◊Ã2≤ØWµäîıbŒÖΩ Mâu∂C8ô^5à5XﬂUQ€òñnìB”/‹å‰t©≈ÃâexcﬁﬂgÜF“É™báù°$i úp∏ã€È#‡Æ§˛ƒ˜ù©1I©ñg@<(S/≠ΩÚ8—¶’^)Z¢lCN?Q˚øÆ˜ kAΩ)⁄Èìj≥∫ƒÓU,\ΩE`é√1a8GÇ· 0Ω≈s§Ú¬!^Ú /…9ªQCÈúA£k˘ò6ƒí‰¢ı®ÒÓµ°>%÷4ô˘Z I‹jÊ’}ô√‚Vz!ÃõE‚Öh^•.Òê∏`˘ó¸2ÿ[cH—å÷õ»Ï‰•D,≥¥1ÄÛzkŒ µÇ⁄˜k‚”‚˚–Dù˘Ö≤"≤≈3£úımL€w3f4JUML™œ≤ôÂ∏R{î√©¯Ü#õÿ!âV*¬ñG¡*Àå≤∫ãÄ:6T
¥T≈˙-ZDJò—BRœEÎ>ºysWÃM+Ò&_<JhPà‘	ÑòÄÅÉ—;∫ﬁaŒÍ˜◊œ~¸Àün>]òªQhQ≥GWæP„8IÃJgé˛•ú∂GíY€uù5ò∏›ELõàÓı9âéZTÈºÂÎXë€.Ë	#ÅË˛|ì≥◊L¶O@¨˙#Iæ§89+3O©¿˝∑tBÆu™Xa8€∆—KCëÕ ,Û≤'»ﬁqap˙¯6àÛÛë˘ñÓát»Ì˚ˆn:Z `Æ˛Ö9V3[ÄÁ@ó©@ó¡Ùº-2ç≤4»®î©"øjçk∂`|ƒ}‡BOZÑéÖ•wj6“√ì7ûï∏Äô9áˇUW ËÄlEFÊkh Dz_ƒ@©¨7w1ÒZîÔ©OE;YÉèΩEı]µH:Å;√Ú¸9m*è3PUnK& …—d‹Í°Ût	∞ùÅìdœÎXõ¸Gc˚ºHÌ[	R;¸ÒÊËeÁh^pÌIQÃ*òÌÃ∂cg·›ARÖyâ…~Á0Ÿì•õ	ò]“HUtˆ§	{àv…sƒiW¢0RM¬$§æ{Ÿe5]Vº›n´∂ƒ;¸.È`ÜﬂkÁÎ√êq
_U a§j„Kzò*Î¢™{F@∆PÄbçù™ŸGùùøv˙ÙmW’ú…˚áxÀíÓì#ãÑÖ‰Ñ√éÇâ_	29ä¥mu~ÇÂ7á£%§´Ë˛lXEßÙò@¥X¥"	«Ω»"…{ñ∏E7â[ƒÌl
Õ<l<„èsÏúáµöyTlÊQ≠fõyl”ÃùB9õës|î3â“T‹¢ˇ  ˇˇÏ}ÎrG≤Ê´î1	¥	‡M"( í(	I1hº≠’@7à6›ÿæò‰p±øœüççqbˇMƒ˛:è∞œs^`Á∂≤™˙^∑nÄ§l´'FÅÍ∫deeeee~ôñî_ÒŒæ‚ùï≠ÉáF=<–3ﬁQ‰+ÚzX‰3E‡£^–c8PbÈêﬁÄ,É$Ò÷EìÿF‰~!á‰\pœH‹ñ∆í–@àHiÔHêá†“ã&K¬EZ†?B.S E‹7ü1Äzÿ¨ Ú"íTrA%⁄¿ÂoâÏÚ∑ ∆yyŒ^˛ÇËtDŒ‰=ÒÈ_ñ‘É>2<òïÆœ;Gzπ˜’πîã|} ˆà¢Œ~Ó€&Ç¿j¥∫`êHˇ‹™©ír—∞ûîm:]iåé4ÃÅ´`nãO>E9î FÔG˝£Ù‡Õ—˚¯Ô◊É£—·Ÿ·+….?N«ÅπUr¬¢qˆ∑ˆ…-vN¢Tø≈Æ7Ä∞$‹ÚR(I«2L |®ûZN‰G3º0ÊCcê´)zG8∂|”ˇO
#D∂k◊K5(ŸﬂÉüæ;<úºAò°√jˆﬂçØ—pÙ˛L¨≠Øûøu„in8˚C$˙ô˘F±ªJ“'ó¶P„h»1o®∂xñ·pπ√[ud«û?£WÜo≥Ulé1gΩ˙∫lk-€˛®ﬂÇ–∞ÙÍ}≤C›„ä’ãTVGx›Û·\÷)àreà6ÿ˙+Êe÷©5Á6`®°Å˜W«Ù“›xAéî∞ä1≈V±Ñ%?UΩ±˚"¿e∑}<å˘m3˘ÂûZT/Dè–ãË"BGñyNÏ"Íf'›Ü—=„æ≤É(à‹úŒxa-¨πÌÿô2vl©í“-?ƒC?∑ëi£·Ò)ñ8x7õ¢ìË‡î ,q/92¢<P˙£&{Í«_ﬁ3BìNÊΩ£3Òëï<≠8Ó´zAô+ tZŒiià£!YBÈ˙á£ÿ@rcÕ*ª¶rä÷à+\∂—ç»∞Go+í‡B€º“ÀÖ•∆SàgIùRmÙöm∏(xn0≈–˜®´sı¢ÂJ_	HØãïÄñÓf]†ä@ÀÙS|©’œz∏?KwW7í‹˛hçA≥"gﬁIÆxX–®	!v¢–¡”â2◊†®:0Eu—©JQÑ§®è⁄?hπáÀ]∑çq`’Ò€&ù◊Ù\+¿G*p´&ì˛◊&˛Û@ÑÑó`‡â¸+úx 7ºªó–ø‹£—˛,‡∑Õjk«õçñË¶ö&ÔƒáqﬂJ:¡™·øÀ\ê! ô¯Ï
Ê9çíHcßE%XDµËgg-|€íTMb≤%ø:í_ì–qQÅL@π®Hf.*êüãJ§!È‹üd”g◊xÓ0÷¿)/|‹¸¥é∫Àd¶=éG>*Ë“
Pu•≠C∆O⁄<~©#( xÒÛ∑7∏≥∑Ë€“&| 	C?Ûﬁ∫EpKGMÀ˜Eb‘<^∑Áç|\\‡33ÛΩôF.Ònàås+|ÕÃQ˝0¥ÈÔGﬁyê»°†p¨9∏‰¿Ö£∫g‚¬FÆä$Fóí‹π+ê Àm†
zéÎπ8„FCí¸˙å˝zËö∑2.qc“ê|ÍÉëe ≠õÂXóé4≈N ;u>úFfNL‡mìf«£fØÑyTÑ◊ÂD¬≥◊·Í‚S8ói∑gﬁ‹Ú=oé˚Tv|F:>k'∫ÈN%´‹ˇ|oh•…ü¬Æ¸ê!z´∞\5hX⁄+3s]nCHF<±[Hª›∆ì%V§%`=î’´’ØÿAÊ[‚ó¡
◊íûÌQéºΩ‹_¢wn˘ÛuÀ∑P%¬LîÑI‡ŸÒÅ◊V›˚æo\?3‹ÎÁí%[”A¸ì’™)v`â¡MJ÷EËG‹–´dÓ3kÒe…T¨∏Ç‡âcæÿ∞8AL¬¶¯æòrŸﬁîG±:≤Uäk2Ò_o”ˆã/JB{2E√é°@Í‡Ëihè§C„¬óÏ ©£n∑›%€á*Í6ﬂw∆íÕCuõYæcÃ«∆≤Sê‘#Ìà†'ãI»¯êwjIÿ[t◊óª„kfÿz#}ô]cÛÖ[uDD¬]c∫™Æ—ÍV”5 ª™ûÒzAﬁ‰tB— Â÷:í7´7ò·œUM@Ze•I‡©Óo,◊ÚAùgﬁ	&Xì'»òﬁî÷åòó>È#À¿GäXïƒƒáWÇÖ5±ß∂≈åS±◊“#rÆ@ÄOQV|íÉ 39á◊#õ |âµˇ¸é√âóÔ˙â˙©Tñ„ Úobï5GNBô≥*ç’Œ~£
◊++œˆ7	Øﬁ≠L πVQQ89<ıB „7óRç-¶DÇ¬∞H»?gt≈÷π%´Èõ$N; 6àñçïs∞çæÙÊ¯‘o5«‰À5Ÿâ–°£»¯π€	WÁÄL«™ujNŸçu·òòêP£œs«0|™ƒ,"9}¶ßå¯ÃÕØXìWï∑Xá“>ÊîünÛT)rΩî†∏CD∞§∂ÖíèÌ S˚i≥CçJ=Ù¯±rM‰„≥Ç9£‚⁄dÜélçœs&Ω˙îkYpL…˘ãÿÙm/ÀÓ)wı˛5Ö‘PøB™«´*ËWHsU}}˝˙à¶≠™o§__™5ã˝B≠=#ﬂ¢Ïﬁiûú†∏Sﬂ fH‡;˘¥E$bfò|—≈Ôñ‘\º fº|ß =’Ìòƒ8…5M÷ËpJ±Sà(	Éki$¿“È öØ£ƒ‰ÇˇBﬂ#bÇiìXï §wGY)⁄≠‘wíöOÍª§ÛïMûıûR"V3vÍô:+:fN€Ï)$BÆ¶¡“’∂ÖN*X4u,òÌv[„∆_á∫•	Á•(ÁK>o‚c‚‚∂∆◊…!œ F|f%
7Ã{l≥π[Pàe˙*iá)…†∞2ıΩ®<ìo%wªπj¿“€ItîÏORs´Lo±Ùù–p‰gŒæúqSå53\”±‚@ªˇr4îûûÅI[Òm˜•"hÒt5F∂i\ √Ñ∞pó&æ—¨ﬁ¯¨Aº^ßÄQ¥EwÌîú¸{FŒópŸ7Á ∏?s~~F~ªö;n–Û∏Ê^0ôYs#hÕÌâÔﬁ4lMºyœõNÌâ≈˛”`o\iºaAî"{·†1√Eoc„ÚÚ≤}π’ˆ¸Ûç—Ÿ∆Ÿ·ÀÙcõÔZÛLÏƒ˜ÏõVÎ#ûìsº[œÌ}î√Õ=HÆz$íÚ'œø{ﬁÖƒ%S2òYVH]ã•ŒåW=qœi‘ı©oa≈#∞cOˆ£™Ü§≠˜É@⁄?ˆ +;X8∆ıﬂ6Y#ÿP˘\Vk Îí°\VXuÆ®x÷p1—ƒ?˚Ê#>º€”O≠ñ† …G&Í ıáæ)fóÈ°¯”>ıõs€πÓ°æo„=Åt+¿ªœt_à©Ç%
Æ◊ò\úc%‘Ì˘=Ùß≠Ò”ÕÈÓ>bìp÷ •æk=ﬁj˚¨O=‘]\°¿sl˝i26w¨Ó>Z&ƒwÙ–”≈’>ık3˚‹≈˝&±í^ô…hÂ5ÔBÕ¢Z⁄w◊DΩ≈Ìøcäu∑!wºÓ≈ƒËZ[∆SC“–‹¬b6ﬂN⁄ëU∫˝dggwOR)»∏©Dπˆå‹ApÁ‘ÏNk'ÌAgwg∫Ω´Maìπ[‡79∂å©ï•‰v«ò.ﬂ§	‹ß÷tkÚ$mqosª”·≥n•∏I¥hmZõô˜∫„Óx˘√‰∆ÄﬂÏñıt:Mõ›ovçßK6˚lC(àûmà∂∆gbß gr –N|d=¢≤›≠UÚdÌ6ûıOﬂüıO(˙Ì`Ù·®?†”≥√··	˛0Í£&Ö∆˝Ò√ÒQˇÌq$ïyä ZÖÖ‹xN¬i˙è˚gÉ◊$û¶Ú™ﬂ?YA≈Ù(`°ëçú˙ˆFËéY0
Æ›¢†m™_àÌz∑+ËÓOògòÉÙ˚/µ¥C«≈∂|¥l≠yd†¥Ç>I~¶Uî_Ω˝\Ø∑œ5ﬁíe<SuÑ3ç†RJ_Cäiá“@i≠®(ò“Y£4À}⁄‡»îngº˜¥[ÿıœÈΩvì¨≠%jÁÍxµëÌ£9\≤ˆÈŒû’ój'WŒÕ¡íï[”m¸î*'◊ÀÕ˛íï?ÔL8tIoåõ#ùûS£Y¨Õ/9‡n◊‹~ZÍÿ(–)f4ê_>ƒ2ë∂$	∆Vwsk¢—£¢1©@êái=|xa≈ás,îç…¨ŸÙΩÀ4ÏäH'ß‡Ô˘Gd©DJ¬IqŒΩoìÄ%Y¸º»hèÆ-7◊Î›Hzèˇˆ∑yºﬂ(◊åá¢Ã∆ÜkéK™Ú®q{o™”†•≠dt∫≠Qç8ﬂÊ[›ó©nõy®˚2—RÛÔtﬂ%˙f˛›æÓª©ÊòØ`TqÇb¶)´îqç‰®f≠EQ#nÖoQ]≤ŸX‰Ë7;RV$w¯Ó˛|ª≠\8(Bò$·Kœ6DØaΩ>‰Ÿ-¯"è⁄1«é7F»µ.—¸±˘™¯¥.x Ω◊√™·b·ÿ‚î≥Ò´k∂ÁAãÿÎˆ'3≈¢p⁄z ç·£∫—æD>ÿ?úµ'æÖ5ﬂ˜„_¨IàˇnB/%/:∂{qGﬁ$öìõÚ˙°c¡_ÕÜ¡7ä¬[ÌôoMÒ´∏ia3FS√sIÃl?«Ûœo˛<¯πˇÛËg--˙g–ÓR˝ôÛ÷ü„oìÛ¬Ìœ¯∏À∑Ì+'‡r#ÈÚ†˘3@^ﬂ˙’ª»êèæíŸ<o¸~9¸ÀÔÀ¯Õ.AÇ_œºKqpY#∞˚Ç∞ßFı”Æ®&˛VP˙3S‚íc] EÏ–ô„¢œÇZ2«≈j«D≠¢†’Üà'ﬁ>>îÌß'Æ}R˘~⁄À˝‰\≥üúAˆ„Û¬~¨€ÔÁÙ˝ºíΩ/Và9?QÂï€·O’L◊¥d*f¬ãG∂kII=†>än'?7çTl4ÇiÄ¢©"àe≈¬1&Vs£±qæé7è◊n’ØRMP].´Vlä(≤á≤≤˚≤G≤CÒù/-PÌJY®ªT∂§í¨ΩàÇYì±R˚\Y≥±ﬂ‡{÷I£‰^º?∆úÿ¯[Ù˙ıkn§∞@∑ÄøO∫C{7∑±¶“7¿ÍπÅ_ÀÎ|Ÿ˚«V0
Úw)¸Å5Ç2}jN˚Ê‹v”ò¶ﬂ£∂A ¬R‹ªƒ√ª$⁄ﬁ¬¬+íwˇ<∆õœøE‚õy_1Œ∑…‚É7G¿©Zxãh¿Sc,k<»>¶16fÓ	ÅÙ6Ω‡˚’é8òÃ<œaNÙèx_ÿ·ıdÎˇ.ëˆ#^™A4~kÄŒTÆˇ6£Hu§ÓSÀµ∞Ëﬁaö\ 7zaœ«6¡zÑUã±mÄøuÍúÛT“¨1¡2¡¥i§ßÈ¸Ô–:VFå˙]`£æ¨n”ƒÚ ‡’ ~!£1Ç»èw˝h`ŒŸÛ»óTÍxÁﬁ–üp*Ö_Hçí∑Å›&ˆ¬Õ_Ú;©ËùÖ?a›Õ∫c∆˜:À∫jCòΩœwx•¬lŸ"1i?V•˜ráé6Dixã[Í¨”œ√ÃÁAÊs?Ûyü˘ôÚäö¶/V/Y”ﬂ ø˝ñø∏YèHë°§»ÄHäÙiëæ§»àUVJàΩÙä∑‘m)%	’»YskŸkô—âs[√xÀª«Õ9~ îAÅﬂœpa1=n=÷mDq{iÌ:fX	bæ◊∂ÛjÀu©íÖXB◊ƒIb˚…”ù'|◊Œµ…djNwˆıÕÃ=Ëö€ñ˘îﬂ‹t∫;ùÓÎ¶5ö3∫ªõù'‹Ê¶÷to≤µØoÀ÷hnº◊ùtπfX∆}€˘òﬂ°ÕÈÊ˛c`s´o'◊ËWÏN¡k’òÓd®Æ∂™´ñÔ¶uçë‹ô}]gvÔœ»æ∆éÜæºœ®∫Ì‰DvÈ€°’væY<˛Q·V ﬁ+\˜J‘¬|ùj±0RRV\ó‘5ûYÁ‡ÊF=œ˙€k˝fÄ72kÕˇ‹v¡m>˚¡C∞)oÚ˚…„°uÓYË√‡Ò:
ÆÉ–ö∑";ÔXò∏‚uw¿/õ”ÓìM#ª|'BíSm∆x°€ﬁﬁœ˘Õue}¥gDQo≈Nëó∂	9c∫ùŒü˜eíÏß±Üﬁºá∂W¯ÑAIg)±í"›MË`Ú≠‘ÂêtT·÷ƒrú¥wªë‰ØÄ„ãUÕ¯˚πm‚3¨¢ºhíVV)e 9DÂ}…ÃÊñ”Náád≠∫óÇﬂ¶l◊)s÷]C ¬∆j
·õN{GIQ÷5|+yY^•ç·È¬;E'€Ë÷÷vwgß–˘]ËºN{e∑Œß¥≥íw∑ül?çΩˇ»“Ì!|XsÏâ¢M,îZ±√™pß`√ﬁ™=!]⁄Âm¯W8∫~ØIøÒƒhv}Ø]f&2E∑XÓZîuD:ü—◊w›öæ‡Nö‘ΩG‡“˜|tHÕåª‹C4ìÉKﬂLtÊƒ\πWmhx7ÑÀK˝•ôÑÚ”é&hÒ∫# Y	˚ßÈS¨ú®8∫‘˙’p
kiìœTl»°∑ ¸ÆS∑3v∏À&W˘ìg’H8òkJ⁄Î[Â-°8õjAîi&ú≠Áˇ÷ıY«≠–π-/˝∂>¡]¨ôÓUˆoèE≥vÛ~œg≠…ÃvÃ¶ı´ÂÆ	∫ìp£tq‚>aÑµ§Í+3«ú¬%Rë–∏C-ö°"a•ÕÕé÷k§{¯µXΩŸ—{-ªÁr¶Õ¥&ûOlÄxE∏ò¡@Ö™-ˇenô∂AbiÜ√D'LXW±oJsá»¥X±o9˘U⁄õIp–»já
ÿñ∑7±µÛÙ9„Oî®wçÁœÏ˘9
¸…A#)|õ8Õç´Vû‡∆P‰ã⁄†.ÃüÈV⁄ù¨_Y¨˛©”$I˝_π3à"õá†*ºÌìöb„˘-z4ÑH‘OL‘ƒ k≈Æ›uIÔ;8-B≠‘ä≠Sü
[Zé+ùxUâKdzõ®qz±èå˘bΩÏèˇN–ãwä—[ä/)#04Õ8ÊÓú≠:ô4NpBbXó≠l›åÏx&≥jò|qfﬁÇ“
F/§¡¸°ô∑ΩöIäu`©‰4»vJbº(\™Q]†8jôÉ6µ4f‘jΩ{2›2;˚uËU+µ|∆tÃ¨àñq˝ﬂ“¸êoÔõÇ‘xZ§‡xjéß÷J(»,∑	'¶Å´°`R?£‡û)»Ï¡E
NMœÌJ(»å—1”`é’0©ûppˇ˚uâÄX¥Låïêô◊c¶+´!`R=#`ˇæ	HMÒEZ{&µ–/O@v∞î≥*&m0*éñ¶¢rWŒÈÃÈ—nâ≤î∫]	üÆ‡LV%ΩU˛ı'˙∫vä´≠Ú-RÌΩRV´
1z¸6∑…¡U?¨õÖÌ≠∫1~@7ã‚[qcÇXn‘∑Ú∂∏Q‹4∆o’mÒC∑3!K±%ëTıj†˜º.O≠mk∑t©òÑËë£√™€¥&¶πU∫Ldmjérey€T∆Çú+…j≤È™Ûôˆâ*1pilêœèÒÈΩgëΩÆªﬂâ=Iä∆‰∆Û7ë·s/	0'ﬁìÜ[q[MÏn^˘Mji"⁄èƒèÔùÁñ>⁄ª|v‘ÃÏùΩLa&nÿßN€$£≠Ì]Io™4√,_Ë:fb∫_∑fö?¯M6h¶èI∆Ø«Î`ßÌc7ö„ï?¡ﬂê7¯«sœÒüêÊ&Û;∫]”≤”Teûºã‡ÉÕ∑79Ø∆€;„Ã2fHp‘£#íYmÿXVQ&æΩê¬I≈n«±7zúL®πFÏÁ‰GblnÆ…Ã«œ6‰Mâ#≈1å‡¬Û	‰:ÉLèÕs8ó‰#íÁeÜ¸ ªÇUy≥Ò:√]¡3Ì^{˛ú•À˛nCÄŸÚÖgüñeõ.f¶Ü67Wç|∑ª∏€ãqkk≈Y©≠´–7d©©qüÈ/Û∫Y™?∏f4Cè–K‚OΩÇ˙„¨SPÛÌ:Æ£¡:ÍØ£ë<]Û}&¨f\HbH÷A;å<gx¬≈Ãmöâ]Zè∏˛6ÌÀ¡Ryé5Cóp8¢ëô‹ÿ“∫|∂PBjÆ&	±°¥-%^›\◊2ÜøÑ– πò®õ¿0@\π:6é¬êìp-˚@^Œ§†<[ÆÁæÑ»öÉiå¸~©8¥RV¯n{-ÆZ[hqM>c9É%®}Óë¨´Iä_ˆ›ìxQYîÊ7ç%èsé≤‹Ø2º‡&ëx~ã‡ı‚∂â;Ä;JÀp·åÂÿÊU #ñbc&§É Ü|p”›∫EœŸ∫=}ı5€s*_ûtælÓ3‡¢´üo´sÜcÊ'<˛Úﬁg|âié©îüÁ√ã`·˘à`=¢3,Ï|_9¡obæ_ˇ≤˙˘N7√BÔΩﬂ–\„=Ã·∆πs0MZ\ní•{á\«.Ó+Áæm"¯©†’Es≥ó˛π•PÀ®IBú»AN®5Úö.Î]ÖÜÃ1∆x≠4~*ˆùN]=ä›L£c¨Éÿ“˘"›ív‹vQ®±$ú_æ 5úÛU!8VµÜgêfÈ‡¶iQúz+ÏÁﬁoZm¸Ò‹
€§zEÌlíqºÇa!_'ztA˘ﬂ…)ˇÒ™ÂzO•¿dVüDAœãB‚¬ÌzÆ≈æÎ Ê‘ÃLÿ¡5¸ek9éå§T`’qòˇ–5ø¨?¥+¯Bô?éØ«˙ÏÌØåœ}txc¢∑q:
öiÙ˜¥
 Ä§K.ÑÄêLõ√≥ëπï∏\q)ØÅL˝≈u ≠·è¥H⁄ûG`‚Ÿ¨ëxkÒãPµ$Ü_ŒZ¿\¥!yÂ7i>OLÛæà3aÁ«pa]c-ømõ∑1f2∆‹™ÜÖÿhr/°¸M¬vUù–‡öT>?€†Îk9ΩYÚì–ä:§ûÜ†á:5\,£tÌß|3ØÄÔ±∏%ã{Ï∂é=ñ#Ñ36⁄ƒ#û!;J,˜√-Ê=±\Ó‘îÀyH,ôÅ˜®já«–⁄_˜à~Ñ8˜¢(r(F<Û∞’ïˆ˘&…¡z ¢Q≥◊’évc…Ngc{á√ÒÔ›ùÊâ¨©ßW$˛¢˜ÀYkTEñHs8ﬂ¢ÊMú˙ˆœuGPô9ëøp,!o∞üú5X?jsFŒáÓ~πÉuΩ.s$=gí˛}L2∆öÄêE»èŒ §µŸ#qìæ_÷ ùÆÀ§œå)ËÁ˚cÉ†yã8Ç˛˙‡,AªQõ'b«Ô˚e	⁄È∫<}f,A>ﬁG¯^ ‰«Á÷≈öÏª±ﬂ/;ê>◊ÂË2„ÚqYnê¸$<a˝W€∫D#‚¸MΩJ|kAwÜ1˜Â9ôH&±é7G-~ã	«q›êÃ¢ÃQcïn«>–/lê…±Ü∫j}4Ù}L(êc`Ö6‘B|62^1∞ei)!Å–›B.”J¡uã˝ ±ù9n1ãF.<ÑôeV8}sùïÿüd¢ÿg˘ïÓ‹pf[éŸ0M©AÖﬁQn>’∂Ëeÿeu√µÁyåG4¡¬i‹⁄¨iq	Ië9s’+u-b|§)ÃÇ‹ú$Í¬àø∞ F£‡}≥í√—¬r'‘Ì	è& ¡ΩJ+K`RMcaÑ∞†Ô<•!ã‹âI±∑…ljk®'[Cz˛≈î∂‡0u@®∑å(ÙTû∆ôà#˙>5ı“i?”`∏AÏ:–Öi√≠b˘‹∫é?$ŒÄÍ‡wçx%ZŒ¨®ÌùTÿV2˚G™‹<ëcô£≤ﬂ¨Ô9a5fén∞î†*Ì`)Ò˚ï"®¥F§%ÏTµ+çNïLaZsá–[ù¶WŸ≈¯ƒ≠Ÿø·}˜/9˛ivppﬂ$∫Ω~ˇ˙˜›ø‘Ê¶Ÿ√—=ˆ0=2Èv¥‘ôb8r&Íãfoiàõ)€ìÔÆ√OíW†o ∑∫.´¬Ë‚ö46\Nóæpãg'pÀ¥£π∆–odÕr§#˙H¢:x„ê;ªßπ»%`ß¶Í⁄5~2‘)∏^Ç]ßÉË≈*±@»t‚GèqP
3îú¢6€;ú’^æ<‘‰Mx‡k›N) |‘‡^&¬ QÔ™å!Näsøc‡Ÿ6à%Ü"£πD#TÜÜC¿Í∆Qtt$O  ˆ“£ò‚˜;2:ö›ùÏÑ-=ê¨˘ÉÃT∆.Z∫ .¨Æ+y(2gxoøå1%WKH|q_JØ]ñ—‡ÀQ¨®/?†˛ó1†Ãm˙“C}CJw¶“à≤É7õù€™C§∞¯8ÃÚwêÒ‹V%ΩHÇ∆ˇEÃl˛H"ÛÓ“c›Õ,Îúb‡d¨ >∑
œt§∆˘`ÖD){”"⁄¿™Plr€V) [d@«⁄ÿÕ—"lm≈Œ∞™©S#§ˆ
˜˛{ç€äØ]}À1Æ,µÆ˛Lu]}œ=˛Œ¬0˙á„Õ…)∫»µ‰gÂlÎ¥¶›•¬=ÜÌßjze{IñÈå¸õÆ:Ó5ˆn+@sSQ"—>>Öié…ˆFÎÿ©Ü1°⁄Ãƒòd.–£9\ÂÌ££πcÃxè+k[dR±öÜcÃ≥°„ÙˆÊÀûc∏©‰LÚ÷*'˘©Ê$´Õãµ&lVÂY¶∆¯È´g™…NıE4è∞<≤ßh˘∂Ï~Q∑◊ÀcÆoÁŒ¢˙?î∂Ø€µÊZÑ˝∂€_≠3k·˘·0èå1MQG|Zs;ò4–£GÖäö¢öŸ,xñyåﬂÜ$ˆ#	Ÿ«6˝ΩŸÑ9ZèG!$Ï⁄Ûàz¶êàæGèP˛õvË€s‹ßopœ?^ÉTg¯≤®†p¸ôÄ]Z˛K^»8C5Å˝^QñÇ[›»Û”ﬁ∆}>äúàWØWµO
ÓcaOJ*\	k-6bN'∞ƒ›%NIV∆7Lã$æ√≥”Fæ(•,,–5Ó0—!ÇüÏp÷‰U #kü∆®e⁄œÑ@Â€èõá/y•˘Y	)rc≈›œ∂ÕÅ˚·%êbiB)#Ã`hÖ,I1˛‘‰Ò=1A$¬±mõ<Rƒ9@a¬õ/l«ZÃ„œÒzìZ≤m∑gF–∑ìÔ÷ƒ}&&®~D¬… 5eæ≈6Óx4±™åÊÎhLÉ2£9˙ç€∆o,·:ÍªüTjÿ&ßÚÏ†√ƒ%âLÏø–X[QÎ‹EÖˆø©ﬁ~©Ëﬁvh|çFÄ¡.Ë"Ä.(kCôÙë@∂˜åB0‹'¯äÜ˙ΩÑÊz»ç¿j≥é†ÉÖØhπonªÄ–û-Y¯›‚ˇ†õ€2ÈJ$äsÀèÒü
…L”¸ (⁄&ìÁN˝Iîfò[˙/ÿ)sÎà2°g((,S ©¥Æ¥∑á÷¸ÿLÓh€ô1A>”.Ø6Ÿõ¨w.ô æ¢˘!E Î± ¸¥˙
˚+{SøøeJÑt¶A∏
ƒLD3ä∑±§Ùm+hÊ{¥FÔ
i«÷â”dâ∆iÚHAãq~h∑	5ﬁoã	§ÆÅ_SES[·¨MTx,ÜH©,y6xoÆ°Ô ø∏sïyÒvm≠`µÆŸ4bëf–≈⁄v¶„Koæ0|Ô ‰[ÓÓÅÂ€ –++4lßÏ’ñ€Åú¨ Ä 
wDVßT ÒV®íÊl˚#Ã˛ÇÕV¨vêÍ≤`≥ñ⁄ su≤Ì/∏€]/◊d≤Á…≠±’ïez_40∫ÛÂ&,Ï†«z»/íôI†Ø‰gJûË‡)x1©¿ÙTÄˇ∂IWccº09k(f1∏/--•Ïè‹ugòëTÜ¿ı>±°hl¯u\˘∑≥û–"Ø~Ê Ãæ“s354ÕàYì#.W¬û⁄Vﬁx(lÖÂ0ëj<¨MπGw—|√Ωùﬂc](Ã,ß‡ZèK˜¸¬{RcÉ⁄+ZÂÇwä[5“≈ßçªCª»†ôQ.Á≥ıN	πL{!Ñ∫»’J¬NÚf¥ãLTL|ü≤ZËã··Òá>NﬁºÎèÙ 
’<i<gØ£wáG˝!zR´öß≈jû÷™fØXÕûN5⁄8øâA≥|›ªº∏Cdú3N_Â≈] ≤¥4n"◊˛oëE¶∆í«Ω‡#SªîF¸Êƒ	4ò•·R£‹ö“î)2ƒèúÒÿ…)ìçK√√4Ñ_K0Ä‡≥a®|$≈5ÓjtÊ˙~‡~Dø*@Tı TT—=F˙…ó##èÄ7≥7#R¸&yc`6iæÂìäZÅE‘sŸ€∑bÎ∏n3xØ,Vk¡á8	àU¡∑÷GcNÉπR°UˆÇV¬AÄÊÕ@3çŒ˝Á?˛˝?Ñ&«qΩw≥ÆÄ/@‘úÅÁ˙»#–√\ªS˙ƒì\:Òvi˘ÖKÕ¬‚3z©(=ØÀyÚ¬e+î¨¸Ì}-¡ƒ£4YÅ	Œ»ot°≥È
<$úÃ†≥ˇ˘è˚◊ZKP	ÎF‡‹jπUDRñ"hòI™biJcó@ö;‚ÈWgˇΩıè–®ˇf∂Çé˙Éì¸#ŸºÎ`j`FN;_d0ê{
üì≥ÉkKRíùàe&jêÃDâzRØ˜,º72B=tr4¯xuD	ldÆÅB„‹∆!Ñ≠·ÈiúÎÓH+∆ã˘}ÒıŸaˇh0$π∂è_Ùˇ⁄?Îﬂ'Sg ËÙπvŒﬂOüYÜc	7Ó"”òQˆ|‘,ÆYŒeWﬁy`£®vd/πnˇ∏qx-"ÁﬁÄî~_cÙ·‰Õõ˛;,Ï7 ˚|?ñ˝˜∏8¥Is+É*äø©µ1ƒÖ8 ^ê§HÛ±qM|…2[N4«Àƒâ\X?rØƒ;√ÇzCïk∏ $Hπƒ]_∑˙RÒüV˝tFn`∞MR6≤y<2l∑Â‡–ã.“èñkãM`Éïj*V;Ã<cöÜo«ÄOø¿0–Öun!˛iƒ:{o4—¢då5üÍcÀ‹3ÆåflûL}@JFËÜÉ–¢ùMõÓ2bú@˚îj÷óGya7ö$°%i`©Z}*åYnˆ’Uò™7CPfV4ˆSﬂ;˜≠ @æ«º≈:@™4Ä7Så>*[‹ç∞+çÊ9Cºﬂ‹Ïﬁ"”∂Ea„˘5ecF∞'Z!/»>ú¿ë≈í—Id;Íb∏^∂+K∫¬F†à¶AìCt—ß8‰r¨Q)ﬁÖ∆CË”Î¸Jé‹eƒâ]‘*m‹Çm`∫B7ÑØ
0Bˆ"ö‚Ó∂dk•ÿö"¨Ñ>HÌT‚EyãÖ-ÎgÍ
z´¿ôÃtw˘aÒóïHß“hÚôÒ0ﬂ≈Í ¸}é±:⁄W2 å◊Êè±»ûö#)äWx√cï3—Êâvïán¨`gÆ\VïA$˚0zN¬€?Îu\3ÿLó∏:Å¬kÚ+_≈U©"6Xºƒ¡èﬁé¿…èy‚bEßÇQ˝s{eL±‘b‰J¥a\Qú≤ôwîY¶‚¯g“AP®’ƒÆå∆V`˘ê“2◊√πé˙
gÑ±Yzéu`L.˙üØÁæﬂ¿πOîsuÄú‹~d¬Èœõ≠Ä∂ÚﬂêØ_Ÿd¨§B∞éb+‡oÌ¿WæNˇ]ú˘RÍ¯∏g\@h8C<'bíb|ë«>Œ¨‹˝…aÍûª≠–”-„j•∫˙g—ÕVx¸†
b6‰‚Vñ/náo˚O∏åj–Ö&Ì@ø≈ª8pÚΩáµulñ07&m¥ºÂ∆#Ø◊eäÚ=[≈sçÙ!+gºé∆˙Î&◊%≤Ä∆≈Dz'C—)‚ÇÛr¿°
o(*MØ‘-ÓùVÜ3˛Û¸t3N¨ ∫g&Q˝7üÒ˘∞KÛâv⁄õâ⁄?/›˚es¿4©oo8aqxW…Á»+›®ã≤Â·¡aÒô…}S ã„c„4n?kπ“¶è®◊GN˙C“ÖáGé˝[¿ä–∂‚lTêv*ø›ïﬁÅ¶ñ• 50•AÑø[ÛRyˇ#ƒ+]5ƒ‘ÊÛm¶ª,Fï∫~4Ú> ∞\
¬⁄2Oî∫NU…Ú€7iˇ ¿ æ7˜¿µù{=)í?˜èÉ£˜/˙GË›á¡®2†ÊŸ·À√¡ÈΩˇÀ·ŸQˇØkËÙ˝Èá”å%
º-{{‡@ù§•íZ`_·m‘v+lu–ﬂ	"Z∆@≥«xÁ1}o>∏~bííÂ¯)⁄®Ñ÷∞xÎ€TŒBëEkºQ≠ß±6‰∞‘◊3Ÿƒ;Ñ/H˚Î˘s#dπﬂ!`dxi∫M9˛ó´G%NÀ≠nﬁ¶õ1·π^ãÑ1‰Ã(¬‡56E“8ë´Ω‹≈æ‡ZOB4á˛†§h6ÌöÜoÚV~V§"w©´v÷Ô:Ô`ù’æÆÿﬂ∆öiû*IòJCô$C©Ωî ;ìœ1pÌVí;â+y·DÑ%ga∞Â5Û
Ìjæã—rùæz]îZ"GÌªú∏≥Ì‹ppﬁ‚|â”6¢}√r”√√{g∂Ø7i<,àéd˙'ûo!∫ƒ∆πÖXú"1qx'E∏eã+O
Ì€ÊAÒDúÑ<
f¶≥4\’‹pˆ0…l-0ìd4ïípMîv<„ #2&äÖ0•Tãu'ñwTå|≤;üBsjæé9É|≤åï»AO6Ç›,õßVm˚uπé®ª9—]¿QMwó‚éü˚ª»ó:k®|¢∆l7z{xvåÅx˚«[ˇ˚#Ã^•¬ÍìtØåLLn2¥Á©@$¥dB„-&gÎîtá§s∆ﬂ£g|±qÏ&òÃ<œÄi∆Øh;ﬁπó◊Å
˝≥Á‚+ö¿üj$j;]b=eÜˇÔ %L}7ô`ÜÁ˛k[ÁæqÄÊ-éä3ú†q#8¬3".Á[SÀ˜-ˇ‘√∆ıA+ÒW¢ópö"0MŒ,rSâù¢pWÉÖæÊb…CΩà)≥ŒãG&]Á‚OÄÂ–√„St‹‹?ºF'–iˇ‰Uø"4A(¸ä%ùß¯±§ˇÆG$ ˝OãP©Jj‹“`Çh<£ÔÀ„∂GpQynÄ°iõ6‹tÜoO—â13ÒÚäÙ¡1Ê∆]åˇI{ßHz+[”$~Å0ëßF˘ë·Æ£çKçÏy‰◊Ü‰0»-õ+ó-õ˜/\ŒÈJ∫à/ªπ7õ>˜é†)t˜˚QpÍÔ–ãÔFŸ )ºèË;)CqúRa@êâ†§™î¬s·Ãöˆ–ü?mì\~µmDÖ—lv÷Q∑≥÷Ω@:ä°+ÇSx+®ıçN¢-¶¨πMÊ,;xé_ƒ≈7Ω0,N†w/¬xm•V·™°rºQÊv`tÓ¥—∏ˇÓUéû·öTÅù≈iÖ3$;?/Ñ°…Ù˘ÒYÏÄ}9tº¿ΩÄ›î’≤ñ°hﬁ®∏ÆïOŒ4Æ±bÔFsÀ∑'Ñ<xÖ3¸N0Û¸PÎçkœWïFnUP%=mK7 ¶2Ñ^ûòu»Yá†5H™ATrƒ£.ÁG¯%'^i
“• êx˜21Må-,IêJîKaâutè+È∑?˘_W{D‚e‚[¿”´‡∫§™?:≠ˇXåW7XKuZ0™©uoœïZ◊J¢
#TaÄ
è'¸¶Å§^è∆ë„Ï´JÒ(Çœ›)2Û"Ë˘fÀ¥œm’0Á∂ÖñfÒ;·l’Ö∞»N ¢Lı]¡T*:IQ{ b\…tö	Ì“?ÀÈ.[zJ>Ü»|≈¢Ñdˆü¬Æïsc\≠•gd8kAw$$Ç8•Ú√—Ä¢™jP·9Û´ézX÷á|Y‡ÇÑÚ‘^ëÃëØõ_ñKöõ4HœµzïöÂòNˆvî^ítNN≠¿pI(;êIgá—ò8’µØjûﬁƒ^ÙÉÃ2q\.+‚ﬁCÜ{ΩéÏ8å“Ω5uhµÀﬁ¨%πMÎ$wNΩ^2«l}•ÿ^ÊÆù¢èØH≈fgÁºƒç&O®Î~∂íîs±k≥iô?©⁄Té∞dÓewy∂pgû1É™-D&`A˚^8◊C+∏ÆÂø‹‹†üûÖsßá“qIêÈ#L¨GÖÔùîƒB `˛LÕQQ(≤[ï¬◊\ﬂ‡™Íy¶µÆû"à ÑË¡ëÇWsQrÆ8¸ÜÖ~ñ√‘Àît¢'∫C gÂ9Ç>Ç*‡»¢^‰¬…∏ÄÏ˜5ôEêÊj\—‰	∆X%d‡Æ&rHÏœ=Í\èöß˝¡+ï˝cd_	Uïc„àƒJ™ÉPD3îÉi-º¿ñ‹Ç¶œ®qjπ◊„FÁÖy¡·Œ]c≈®ÁÁ!Íÿö{x@u)Óz°Ë!Ã7F‡úh\v2”‘SılYÓñY‰¯KÍOg•IÜOÚ∫öVm+I≈k~ä¨g∏&É[´p„ßL ∆æñ†!”„“ <h\u
m =Û™Ïëí?–ùW7≈‚N ßÍ'L]VNÏ‰5^ÄLº˘ñúÑëÂèm»]›/ê€5=◊
l√%˝Ì˘g—¬6fÇÀJ–åÔËzaπ¶1√ÅÓ‘CÕº–ÌsÔ«æÖ†¯ö&†‹õYwä¨SL €ƒ6>"@ô÷+ı‰⁄-Ì!;03Ò∏7à∞Æ˝è¡ÜÜ~‰Np’çÁMôŸØ‡»≤Ωvª∂Ñµkï‘H¶~£oŒmÖ._âE'¥–∑¿˜O>¯¡%Ì6jí¢û3[ÊŸEN|ÀﬁL€9RÌt¥‹}ˆ®ªœ¶Ú8˜›wﬂ°—·Ÿ‡∏èﬁıáÉ∑¸9Âà¯Éo„ôÕzÆq8œ.˛I(¶âW©Òò∫V~@ß8"∞î¡ÙpøÊ´€pÈ0w÷≥W:>„"o1MèË'<XQÙ/–√<∑êÁ¢pf!ìÇÂy`9SÅ@ªiÂl·˝Ëó>ö>5k"ÖR€!Ñ˚∂∏œÙÙ(ËÙÚ›ñÀ¯3c i[∞°e¢…ƒ
i¢ßo§’H^T7?ÒÊ«¬Ø≠≠âÌnEÅcåÒåEÍ··ΩmcÅﬂ˘–"QLDT\ø∏&_¯XCÉ@èD’ÿÊ´i}g£ªìP\\µvi¯ãàjYøBÇﬁ\†
˘¸wâ"œóı$2%„@œ:[ uäNÆ˘W∏:∫Á®$®_RFbì—p`T◊Oé€√ÔÜáb,ÅZ[#VR2Å“@ò≤˚∏Öw:|˜Öf®R‰,”ìSï9Sàb ûÜƒYŸI=È∑¶ß:	ıö±‡.∏/|è¯§øÛh˘∆Ω∏§óâúÖD+Ìœ√Ù™è|£<ìf‰Dˇ1@dŸGº›•Ñ$àú∏≠◊<ˆkÁ§^È=”•À∫‰∂./≠·”NF≥rW±˝≥‚rﬁ÷‡'8ÁmUs~Ø~çx:“¨L§¿S=Æû‹Ìv∞H¡ˇ`ÚÅ¥Pß|ØHÇ`‰≈j»x$ñDKÍ˚ICH]\O∫´@Æó«S¨_º≤(;“mç|ª⁄©H„√zUÓ∞™Œ≥DÙ<+à¿[ä6ºãËgôv4◊KÂ„M&>~kŸ≥>¬zÈ˝.∞Qø°q]®Áx(TM/Ppb„†~/—»rÉ£∞Øã0P®ŸŸ⁄ﬁZCª[›Õ≠Ì•¶\'E¨‡GΩBÁÜ¢z|$È@›ΩB'	œùnhÛﬁ.≤ä+wÁ–8óÔ|]TôÒ@SΩ!ßËôRi≠´∂VU\ıU◊ªì5Œ¿ßXÚ„’πª:øÇÙ gﬁe}œ VÜ∑¥.â∂‚”PÇâW¥^Ø)Ó\>v7;ã´üªõœ‘/ÇT¥¯óŒéTø˙…plD.V6dy-*^3à∞Åœk˚oÎáT<†;˜ÃÏ…`¯∞ìS71…√9ú?¿,1Ïˆ/i%ÊÍ§Sc¶§¯ƒw‡TOùvÄU∞t¿À±∏Ø∆Oæ∏§ÉEìÖå(òÿS§Mπˇ˚++∏Ì>ÌÄ«|∆D«yû˙êPüÑUÜl‰ëüP÷∏©^ˇÀª‰/·î_◊-Ò@÷äs€Wî™ÓnÑıcæ[ÁZ≥û¸°tÒìN∏ûÅà’T«‡LÄ—¥x3±ÍÆhb:Î9„s‹Òy&¢¨§å∆§—äÿ%_„eƒq€Å^Øö§œ5=FuÄ¨k®)
Xz2ΩÉàëıNG9¿çcƒéªrèËÍéçTàÀOÔ+¥!/°·Ò]Y“ÃÑê…7ïFX¸d¸bè„8ã’
§UàùqëŒCb-€3Ìãïj»C5b≥Á±z¶•a¯îVπ0ÆÁêì≈
gû˘Cﬁ‡°ÁéP„e¯m†„˛…á˛——_—·…ËÏïFøtÂ°"2j˘¯í\“òïﬂÊ¢(-ˆ4Â¯WÓ->:©ìå9è#rkÙŒäX24Î¬r·í-˘m2Ë*£ê
qHhh8¶π”[ÔılTRÓmÌ˝"YTzA´à	 GYéÉ’°
¡AÍ†ï-Ø%¬fó“≤U˜ (¢äqD
:≈80ıâÖê\≥_ÍDSÀˆ°%XkO#R*ÀpÏ5öñØLÓ9F≥ÚπÔ<#ÃX(N!,0>•>(Ë·Hw,Z¨#Ö+ùÀEÒÕ›
#‰M≠»jßÿ‡‘Ö£Ö:2 ô¶√¿≤ds≥<ƒï.ºUmÂxÓπ§ò&™ïË©.VS¢•ªlK¡YXÿÖxïÌRp7˚wÎv"äˆÅª —Y™≤õsÓÓ≤-v¢ÚïóÎÈ›%÷vc}•∆“U5Ûwæ¸Äk‚À÷÷fD8áb/«V©ì∂ª&Ñº+?ﬂndπfëC®Nê#I∑µ¥vfQ™åÈW
œ-(5…LJ’bµ^5@˙∞ì5TTYCjãC0+z˙|≈_ñ>ïÈ˘[Ç_˛∫V~≠,O‚-¯èKÂ∫A%˜≠Å≠‘7_+^Ft¬»™◊ ?Ü°1_ «∏&™óè`·n$Ò°1Îâ4qRgÕ»bxñ”Â‘Q1¬û⁄Q∆´¬2—∆º˜kF√S;ÍXèöë«H£è?ní•Jth‚TÉèXøﬁ°òº ‡nGôDUæúâõUå˚êbäàW	yKëÆI%¢“]üÔ∞_nJe´%æˆ£–LQTTäo≤∞ CoéyÒ\A ¡Ç≥‹É{‰¸Q S4∑ØZc∑ﬁöGNh/úkUj∫˝+ ˘>◊ÒCd*!6dûƒ¬¥"–ø©æ´Ÿœ¥°5ÌCº.ñÉÜ÷ÖÁ≥e&~ìM¸«]2œtˆ?>I˛∏7¶M.lÚX ycÇ«‘z∫Û`‹ ˙IeË˛‚Õ*öÿ6	_¨÷¥"7æˆºP;…eáñ2ì4´ƒ/†ÕãË"¥—"Ω€å2Òﬁ·èÌÓÓ<ÃËFh»s¨ô´≤ÿ´æ=Áá\Å=CFhXkÛqÛˆÇ˙·Ijã©[˛∫ÑgSHò+»√{ÏôÜÉ˙Ãœÿ	Õ≤Ëıíx'F¨`ﬁ#ü}Ôí˘KùØÜ›8Ôw9y∑Ã˛Ö˚êÃ-§≥∆ÂnsoEí$≈gV0∑ ö˚ƒ]'¬úÁâ˚0ÓÓ%≈sàIÖ◊&ß¢º◊™Ã◊•‹◊¸C‚%\Ì\∂	Ωõk˚‹2i÷l¶6]<Aaœ=≥¶æÃ¯µq]-3ÑZ\µ∂<$e8O¿YvìL÷ô/üƒ◊ 4Åq:ÔŸÙ‹å)¨¿Q#cPzñp;òS|Á”zóiœçÑrD◊¸ªup”›º≈õΩRJyÌüˇ¯˜ˇ¯ˇ˜rñ8?)˙
ŸC0…”ïL?+y:k…˝j∆[s⁄
…‘Ûs¢7	/∞¨u¥©Àë∑•Ø
_‰˛LıœyÙ˛EˇıOﬂCﬁÀÊŸ!˛0BÔˇrxv‘ˇÎ:}˙·4#wo|k·˘Òl‰Àíx±!ü∂Ì‚Ilu∞ﬁ†p1Ω˜:;¯–Ñ%Lˆ´Œ∆6.ÇóÅÈ„≥ÿÿâ|"7'*¥¿rõ+ù9∑ÈtIf·üD¬÷AàjÌ¢πŸ[¥û2’r˚*…tŒK/û‰FgZÈ^Á◊YÒ6àO79DÁ9 J¡“üìÿ”1ÆóÿÚ¯õ…bÂ8±‡‹hÃ|&ıñ–øª>$â BΩc‚›¬>˜h)Œ˙:ıÒl∏ølG∆´8+éØ\xû|ÎèÜŸ°∏á+Õ¸Ë)ˇwIv{ﬁVxyläQkÖrïÏÖá'ÒHáãMjﬂl`¬ö†oäÜ”Aﬂ|∆¢x3Œ§¬Üï\ëg2GìIñäRÙ≠ÿûÏÁ∫»Sq7%GÆP*≤åÙ$]˛W“ªë*$0c€J!XVP√Ìg>E'©˛„ﬂ˛´0.¡	H¥!ì_ÔÅ9&3krywæpÓH˚˘˚aèˇ¸ﬂˇkiX∆ëÅ—@Ç l"8Õïfì[Nræ Q‚OÄwÚwy∞»!‘
„ˆLª‚U·É#„Ck˜ô≠ı˜®‹è¢0Z¨@π/)è/=+≤Ñ|ÔM˜W#¿T•j%—Ù¿µ~fqÆäk(6u0Î]”Ûˇ¬Á∏æs„omO
‹Åﬁ¥X Ù·©‚YYHú\w≥SR4LÚï“¢˛ùâb-¢	§éQÖﬁq‘>L‰˜”©=±±:Œ,Ò¥Ö(KÆ·∞:$® ´2LamΩhÏXy:h†Ñf0W‘Hïí€Äz∏°ıPCı0C+[„V¯˚D≠Í¡πó™BFX◊{:>◊ÀPôt@Ñº≤gF`;$ßîñ{ï*MÌ*“œVH>[!ı¨ÿ1dôkâ‚◊¢-!∆®éhÿ“D›Vz/ã<ZwTq9Ys4"w¸¯àŸ”TrZp£µ.ÖóÜbn\Yà∏ gæjê—{scR‹÷h„ã¶˙cE§—%pFWÇ2Zì<≈®ï¬hª¢òº|QÕ¥Ê5±E’»¢´&∂ŒïÖQcTU∞Æ—tÄ•´«‘÷ﬁP‘¿"u`Jkn-Rà“ª€[‰Ë§¥ª¨ïTÕ∫©é⁄{ÀS)˝VØ-ØF_Æ§1W“ôóqßÆ#OƒˆKÓ˘2õ.⁄¿r˛{júÛ›-eû@Û$Oº ÛŸlS®L•ê\b≠Ã"æcœÌºã™Vó‹R}f_Ëù†∑‰{i/∞4+/æ◊¨irˇ!Ì"πX∞±F:@l“Œ¿ÄdÚ)÷◊‘óØÁ≥ÄA≈£c\1	íÜO-XÜò
èh'¿Ì+J†*S^·:ÆpÇú¬m˘Ÿ∆lìÀπúú≥b$çƒDíSk1≠hòß …J¢†)Q	3˜–∑©LúDxˇsC¯¸⁄vbUƒ¨#R
Ò&≈hên+^<ü¥‹_¿0O˚ãÂaUº¨ﬁ¯Ü…ÜCÎk4\Wè?Ù—hpÚÊ]ÑﬁıáË…:z∫éôoØÎÅ~ó‡VâÑ˛{‹:ANÕ∂˝ÿ@‹6©?”˜E⁄¬»òE.ÍˇBÿí˛êmËØò“í1ˆﬂ~8A˝˚xõ'Õç˙‹wqSïÁGgy+&)^ﬁ´û)NΩíÈäK◊õ3Œ€u®©X
J„◊WM≈Bù
B…z‘+º)¢7O§»aô¶$#7>xr∞∂rômAfÂä•´ä·¶ÃÅb§BÑ‰ôyX®¢4∂'hO	=DG≤ÊjÓË„rî,ÑiÃFeeŒ≠ß¡ãÃfø¥F)m |]W‡w Ë@£≠b:Ñ e9B)9B~,ñd¥aﬂYâ(ô˜™“EBíÀkOÖ)ìeAﬂSreäÃ”Nç`¶b˚¶¯¢¥t°0—:.c,π∂ÌNúÎÙÕFHêπËr∫ïÕ72úÜ…TV—ˆ-3öXÕ¶1ô¨£	Yÿ¯#˙MlŒ:ÍËMÂ{(5ó“p∆‚*Ád5µ÷ZUe=√±Rpl—ÃrF¥)fô 2rPÒÓ´◊xsèÈn_⁄·ÃÙçKòà;Ó9>™Ryx„>¥ñó£ﬂs¶J∂=πVàõ—h!ﬂôè∂Çml†c€$.,‚RÒ“p&ëCÏ˛Å§wsˆ^5©BÖGDËãS÷tcM8Õ tœjä-l∂Ÿ√ç⁄¶ÿN⁄s´óË+‚rëh@*L˛óáÏÚÁûg⁄·È©ƒP«:`5ˆ€õ1ÉFëÄøò#eØH[Ò{‰ñöéÉ}ó•+ä≤µ#,âWÂÄ‰KhçrèÅe31ô|ë&‹IJM—R‚–p≈Íph®¡°°>HÜI√äLö@~jpjò‡ãbÊf`©Ô6¨Ã∞°>√Ü˙+)3l⁄∞*¶Ö3*ÊX8°øÄ≥Ÿ™iïémz∑ÍG7uõ⁄∫dı-§≤∆v7[À7w≤∑$Veùu;¶X‰ø√-Ö⁄∫Vµ<≥	ób€¡«vªù—à÷Qˆo*rﬂ¡ˇ‘<?öåuDπ,1öm‡ôµ6^_pìÿ\√∫^Ú„∏¯cÌÉ¨∆cé;Q¶ÉhæN|®˚x4«∫n&ÉàR•∆}é}E∏∑⁄úS¥˜¢Ëé´^mS‘¸Üæ∞Ü|+å|7À¸|-;ôW#úÃ`úTdê?õâ^¸∑fÛ„]˚Ù˝⁄ﬂ÷6lÅ=âˆÄºπ&π—e=#Â>v?ÂÅÏE5ãÆiIãr)∏∆´ Í5Ü'˝SÙ¶?:¸©ˇW!πD=â+yr489Dßo5‹ÍÌ~dL/∞:sazóÆí”\¬Ä¢·“vÃò√J\G“_ÂÖötæø¡Õ~§’}í9S7{ì»∏>Å≤O@˛À"¢g*eÀ}ê]u¢
≥/N‚˜∫¢“lnÒKÇ9]G7∑ Zœ¨	ÓœËb]œåíf€èáJˇD∑œE"Åµ(íãj/ Ì
I1©ØAkÕÁÜçœæbÙp~Û0‚-‰ú˜“?wXòUÊfñ0±µ≥É$‰ÆˆíDe◊O>§¿ß_E∫T˙§˘~àΩc„òÿƒzÚ÷u2Dâ{òﬁkkO9} «UŒ:#Ãrµd˜’ô§¸Ãÿƒ)„˛,!ZΩ·jOÌo)àìø¸ô•˝¸:µ≤ßxBˇ¬g5g=˝:≥≤Áq÷FIŒô˚úYﬂ‘·î&ñ⁄´ˇà3´ÄÀ»>4ymrDπyÃ˙ZiÈÊŒï4¡rº‹ÿ9&∂c”ÿáaàÁNïÙB™ŒÂ@Db$Æ®ûòÀì∫£÷HØåÑÁƒ
Qﬂ±asxÅˇπ¿J>Ω»bi†öT¡c_Å,≠ØÖ˜ö¸äÆÒ5√jÃ¥8e°C†ñB¿°ôÀ∂ö	O5”"IYü‡gDÕ"~µ*~ìRg∂≠‹DˆÚ±TÈe>&a¸:n¢Ò”m£3Ø`˘å][Èy¿ÚMc‚ø‰pß7Ÿkƒ∂cπÁp€ï‰ì¡¨?€òmKÈ_+A 1	¿.°mbâÔãiT">Ñ†1ïD|˙‹dR ë¿€ùN!jè¡îÑAË$†gyq’EÄ˙"NZŸˆ~4ÊÍv7¬Ÿ√Ùnhó⁄@'É·‹K‚Á¯˜èÊ¡≈ã˙Ó#M:˙0Ã hııƒõ€.f∞Ngq_!ü64‘≥pÏô◊™∆x≤ö\Ôu4í®Cûg°©Q
Lª¯ºo∏7ª:9)ÀIÍc»¬ÎiØ<≥Â¨};bî®Ï£3P¨”€¶qÅ”@À%0¿Ã‰≤ÄÔBPaª6Ì∑¯‡âVnC:£ó∂Â¸≤7§:…Fò3.¯h–ÀMæuMùT)5Ÿ;ÙÊâÂ≥©˜®÷mif§"xˆQXßÛfr≠r]X◊7p_¨«æyÃô$R¬ôÂ=V%Î≤íT,ËÊ∫ZJ¸‹åıÚ~eüjyç≤è⁄›ã˜,ÊY~*~ñüJ°†ÂG#SU˙‡VZZ©Ä·—L¨l&”<Ødüõ ãlA‘D”ûã(h‹jÆÙ§õ˙=µƒX˘•QﬁE*–ÄËùd§˛x?¿~ﬁì:K∆æí_¿PÑ6õZÚ0Û¿b%æÑar±πÍ.N0ŒƒŒ@ıåÜu≠£¡£°3(Å“Ê©‘«q∞n,g{ä]eètLOY~ i5™òuLS;´3Mm∂—qD@kﬁYëw…e3
®¨R◊·ØV©ØV©ØV©áÌﬂˇ  ˇˇÏ}€r‹Hñÿ˚|E™‹£-N≥ä7QRst	RR´Ÿ)ãöˆDª£;´
dAÖ0∏4≈·–a˚≈oª€cOxb„ÿ'á˝Ê∞#¸=˝ﬁO9ô	 d&≈ãJZVG®ã( q2Û\Ú‹ÎüØ<xq*_`0ü—˛ÛWˆúYpkûRèreÊ©:”æ5O)?sòßÑê9≈j—,Ä$+œ`5⁄Ga”í1HJ◊˘†6-´ƒi¶⁄¶ï‹⁄¥4üÛyÃSVy^’œ’Y¶.aï∫ÑE T™¨¸πµ.’fyk]jﬁ’À®,ŸÁ\ï@ﬂ \›˘Áø˝Ìü»‡≈o˘µªø‘Ê˘-|˛OˇõmÓæ¬Áﬂº=ZZà%ì9Ìxr6Èµ°å58•.9ó∑ÉëœîhÉ»Pãa €÷‰±ï∫¢OıO;s[rknª~s[≠Ó/4]B>%‹F_îX|5I„4∆à‰Ãø˝ﬁuJœä’h0≈ÈS¡Æ‘.g¯âôJ'XΩk4°æÔxdòß™a{?s;⁄÷a{êP€4gC
ï™‹A…ß,´îcTÙéñ∫ÏÃó‹y≤“Ë˘Ú¸≈—ˆÓÎ-õ‚Û7¨§rNˇqWì”∑‘V!ØÅ»eJÁI°ï&Ÿæ€ i£ äyÄ™πéa*L3¸V √2∂˜I‚Ôxzx≥≤ Ê≈%1¿Ö2¢’J`ÊClL√¸ì'»Õ@Mç?Å]¡Ÿ,]Ô‚}Û9”fΩa≈Õôr;Ωµ£+ mwíˇöŒÆ…,*∏ØÈLπ∏Æ±y-˜⁄@Oúàπ§ÆÈoÿı›Á◊4<è¥º~Kµ0C/ûïπÈ<≤ &ÁáüÄ…9Ó≈AÒc∞ Î±É»ük≥(≥íóQôÅ|kWV¯Í`1òV÷ßyÉ%Û∑›FKZ}n£%•anÌŸW<áy≠¨åä≥¬a0è÷∞ã*f ˙’oQ(mÅ0´ºzâ	Z^ZÑ)_y ´TûÈ÷∏ÆΩ≈ ∏ﬁ˙GÂÙ.ñ∫ Ts4â±hºÄ*¿è∞·¸¸^> Û ≥±E3V>ŒâYß√‹}¯G7RÍÓ]"æˆYÚ¯7ôtœ/iQ°Î£!A†Ó»d ‡E≈Õµ«JÛÖ9»o◊%[‚•ãäÊe–=f!çpEªTÎù•æ«ËT¸ﬁ ?.≥Ê_†à9c¨y&˙mÅ¬ö:À$vX_˙›‰lã¸›xÁﬂl¶ír%HÓ†Ì Øg(ˇ‘T≠ç–jp„EÕ€/ÃÎ˜0õ"Êˆ§«‰[ ùØSœÖUÈlü§Ä‹1~8!∞Ω°·o¶I æÓ?Êóü;±¯ÆãMDlÏ/ùaî}ﬂÉ©%ÏÖa‰zÏä√~¯:ı]µ˜ùy™º‹∂¸fZ¶YÆ∏À⁄¥≥bV¿◊≤…äe≈^°©3jítyc]‹Æ±}SC´Uê◊€# æô;¬«ﬂ„§®=ÎKÍöπ
&›!O‹ëó*Ø_´T‹0öÔ•¿π˘ˇY%±á˘ÓôüO}%<[Wî¬∫¸uÔpàÄm∞ñ{ªl‹mÜ]›·≤¥ìKÛ. ´≤Éi∏¬\
¿„Î≥*ôz–Y˝÷°Tºµπ˙ÓÍe`|Àñ•Äí/”B¡ém”í·Ñ∞Ò>!¶∫0O±¡”§œ‹∏›.õ®xn•<Œ˘Y[]5±∂»™ÜyÂ¢Ÿ¥Ï+‹™ó‰‰®πïï˙vJ˝¯◊W·+l√Kˆv3Ó¸öƒg38f’x…≈,e™≠ZZ˝„ zAGìn∑…ﬁ…'1î…Wπ''/¯¬˚ÅÕgVßCSYVqãÇ≥4ÿüä5˛v∆+∫ñv9_¨Œœ˝©£ØÌäü‚x†S’A[s	`ƒ8;v¿òﬂòÒWŒª‡ïˆúÕ¨a∞ö∫Ÿ∏MÛ6Œ<G`iÓΩÜπ[Œﬁ¯^AC%¯sÛ{M;¢˝ÕZ§å™≠WGÖˆÿòEı‡	¥0oGQ¡∏¿3^:∏ƒ-MeÍ›±xB‚∂˙˚˘¶â'Ñ(jz¶*jÓ,	<‰#√rõ©-`ﬂÚl£ïñÕΩá<§+ø·qøuù”-≤«óÇ<Àû'‚∏˛´ìe°…„{Èíá˝M"ó4÷Ç¥&πÊpí`+#ñ¬}Ø.eX`Î—rX:£<aÚ:FoFË¸-j∫B—JÆPoÖj+¥Z¶äbﬂ¶∂
çUË´emµÛW.gñ±cŸ¸òGtva9O";˜O{õù'¨Ì¨ó¨¨ìˆã.√6 ıil”˛E"ò‰»âí„¶ñÅ+ˆS´ò€®té…VéÁπƒîEA!Ìñ´sY•l]Xc2Ü[≈˘ÌbW∫•ç∫nô∑uØd<,á”w„ã÷ÒñoÊVˇ‚e‘5æ≠3‰odè∑x%gUó3 Õi~+q4[üæ0ú°Ì¶t~}*¥#õ‡¸¥
@¡ÓMf∫Zf¶vXø)=)wﬂ™«:W3A¯õ‡bD˘Î@…A∏∂Œ£“õ3Äˆ›C/u/ŒËèQﬂŒe êÃdjX ÀÂ‘ˇ<œãªŸõ%K«IvëÈFKzh*4Í„â÷Î<ÈµÜ§çÔ“*Ë >W≤#™!y·ù∑Ç—y.µ.VŒ+bÀ˛Î`πzo1—,˚jûiÁ•–K2˘rû`€Ö∞Û7ü,\∏N\vìJø,’;GsCN|ë»Ô~9ÿÖÑIo≠YÈ“∏œU#9*€*„Eãld÷k<√∂yl⁄qh,‚‰wúaªÁÅ≤<XÑ÷/Ô¡£˚Åﬂ€û&Ó1{;≥=¶‰àû∏<ã[¥hl™∞¢ˇµ)í∂¢˙Íèi4&YÀ¶#¶µõˇ´…±—Î?—ëVJ}˚ëQØÌ¯'ò#ÿBøo˝"∂8Nﬂ—ËZﬁ°—hIó’Õ^∫ÅwD¡I‰ƒ‰ó◊¯.°H3nC∫Bå]Á‰2Õù´Ì∏ûm^z√Öáj™{„ö˙»üF{yÒ©,)Ã∂„[Yø+œX⁄¡%∞LÒÏÛÒÿ4ÊàΩ:≥Ü]å+µm¥	@ü€¿1WTg∆.%Mé?5]Ñ˜;∏X$ë.Â˝û\¸Úö®™<jãCÎò◊\›9∏ieÁ*◊!W¯.πã´Û5qÿÍ’æ‚⁄z≥≤uÛGıÚ»0gúïΩé¯ﬁlÏK˘*ô'“7∆>‹WÒƒ5ƒ¸√:Ω;„lovŒ≤r«ºwªnm{¥˚¢Z‡y1rHè– %m?v=–åoºÙÇ!ı
pu†6ÑœÒŸˇ‡+˘∂…@mùrV=ÇÚlèÿF–Õ¡ïÇj™b‹ù4ø±q+ø"ﬂ∏„'πd_i^‰E'æ‘›£πŸ¢©S`CÅò¶Nsô)â˜§∏3¯Kl;ﬂU+ZÕ07ÙÇ—¥*äﬂ«b
Ö+ùÏfIoµoÓìçü\óËja˙çäùUw›∞©‰Û‰–ô:>∆hr£lÑª∂Á
q¡m?„ä”Ñˆ"¯á‡ƒy,ÿäÜÁ“òHxÆe—V±Œ¸Säx∂:–*›ä^Z4Áü%]7>ªEV†Ìu}Ú⁄ÒY¥Ω)3∑çë˚√õ∏ ∆]û◊ ⁄8púúyŒ„ÛsrÍéì…È‹˚eá\4Q_≥Æ∂ﬂT7ﬁ ⁄÷nﬁ÷Ó¿Çy0Ëj˛Öõ≥lujŸ¶·¬µAi€‡ï:3◊c•‡π‡;≤´ﬂyìÂ¬¬`ocÆ?◊©Ö•<øe‚éﬂ[ŸòmÍÿTÌœmò‘’îØ±q“\Ö≥R *ÆVT”µÊU±¨ÂtSµJf˙	ºµq≤lÊˇ@ ◊ßï}5+√Rr|»ô®cáßv´ÈŸŸÒì/AŸBR=˝Zù≈≥"L6«kÿñWõ5õ-i6fõÉóÕ‘FÍk∑Dœ‹xty+Ùårh˜R÷Á  ÛXûq{´sÂÓõ∂8Áâ˙Ò¿¡`f,∞ﬂ∫™çb«çò91‹dZÂ´¯tV[`ñ}œ6y(ï˘„ÔÔOh‹ïä,ôag˙8æ‚àF'˙ [3c≥!%õ¨6€∂qºûf_}Å<UéÓB6Kı∑Ç·N{î@¨¨êóQêÜdxFé‹ƒSóÎ„†û‡çeXf˜9˘6¡G≤tÏÔR¬ˆJ‰1˙)FÓ/À…êŸ%~üpDñÔ¨\$ü>Õª∂\YñwûÆmf3l
¢6Fü˝a*çrßº|æ3•	+¿˘§Diµ≈#≠¨Òæ r7éY‹©ΩQõ©´ì ïËKs%ü?&k∫QMOgyEüãm‰ho⁄Gv[´ú{ı˚Ûı7¬nz∫ÏÍµm“ÀY_’«’≤ÚeË≤jÚ»r-y›Ú[5?ˆ˚l•c›Ô·”™YΩ˜Úv>aEãÂ¬¸.yŸVTOfE,à/ñj≈ô('˛ZΩ"vU+©Ä
ÒIx9µΩ§$åqô≈Õí;≤.â≈∏ˆÂ}ö$á∫fèM≠œëÍ–\BÏ’Íƒ‘™€\ã¥Uî~ixÒ"V˝‚À!`uõ≤“µ
CÂ|›≠™Ëÿê∂‰ôXJÃ†¿Ubµáï:5
⁄ìÕ 5î‘R‚•˝ÈõÛ˘”E§Ìøø∫H« Ø©Î˜<¯g·‹ã¬≠^hüíO]lÇÈçH˜–°û”ÿ]∫ﬁ}êÉ0ÁŸ	‰6ü‡>y ÿÖkﬁÉ< tû‡º¸mÅçã9À£-ÙÄ‡%GÿêÆâ©¡R4´¶Ø≠ñyh•˜∂ÀdXwáCã≠ÿÌìCΩ~òÅ≥„Dc¯!÷v·ŒåQ≥—]’‘)Ï∂ÛP“Vﬁ€∫ß|cìπ üT7È˙sßÍ∞¨	XÑÏ˙r”d«´˘(··“ÉlÃ*áDdªY’ÌπŸ4∞äÊù˝Ää^?õï Î%õDÎ˜ÚÓ=•z‚êÈeáL2F-"ù⁄¶¿\]ÎúÍÚÂsÏùÒ|uD¬<dïÈ5	~t¢-˚Êâ≈ãÊœ∑-TÔ:≥≠îUÏ6à
˝rÆª∞!⁄ƒoÊ–ﬂl"œ¸©;“$?⁄¶\âÿl#PZÖO_∫"$◊(∑[tÄ©xW:C€¢M,u1ZgñUP%2ÀÏß†Ep5b‰bRC’
C‡≈çlÔVá∏ib]T€Våº⁄CÍCƒuı'Uœ¸icªfZø˛"ä≥˙∆Çh/%8vÆYu—BqO@ëŸ∞Ou©;ÀnF{π9Ì%(üi1±ËM˜Å4≈*~ÚJÃUé0Dçñ·∏ëRº4Y	éJ°≤ñÁLÓ¥c»2\&√6®"¶ÅÜwÜ1√* 0Á€ª4N‹„≥ﬁ–IN«oU∞R˚wˇDŒáπ“jSp¨6à÷π¬Ál¶\˙ÚAI}¡FöÖy˛~˛Û;mÄ¡˙;ö˜ø~ªø=`Ø⁄yÒ˙ÌŸŸ˛›ˆ°}≥J6’ñã”ËUë?vôoZÎúC¡.‹Á≠Z⁄Jô”»êE|ò8ˇ·2!Ó»Û>ìÊ!¬<xQπÜkAππ0Ô\¸`M±Âı∫å{≠Ìä}t zÎ[≈±3ﬂ·NY'>pN,9á_{¡Ò1aûUuΩÉÜxåut≤>ƒbû˜2¸K à¯E.vπÓÔ¡©ˆºÅñıﬁ)G`h$Ø9 •"…º°KÇ∫D0è—•B…äqÚ
·˝¿¡÷G∏tZÊ±«p8KNRw≥Ô®⁄≠3<™Nu5…C)Tï>/€íúGH{r⁄ªwèaµ t‘ùeŒ„—$º]<Ωπ…Ÿ”~»Nı0SSì∫ŒW}≤=ô—1˘2•„e2Ë¿ø{ÔÆ6}FM¶˙”íM;l‚ımú„UsŒÂç¢ÿst˜ÿù“ÿ%w…Å%4U–Vﬂ—S:‘8À”j(ïDçÅaE¨ÖÁÏù–(ß$›ÒÆ5jËL¶»9ËâìŸá,Ë$Ö›Ò\ﬂ¡ î 5ˆYSêY9ˆ™Æ<Cvö)Ãä	º¶a¡b⁄åõ§Ó˝õ$ò—ƒç	tBÓSœ˚5†«–îq"@
4`(<cE`nå—à€„ôÎ√◊«›û≤VíSÙátúí¡ﬁŸ£êéÏøUvÄ©ﬂ◊-p„≈⁄• Ö“üÖ¨cﬁ<ﬂ~«˛£Ì◊Ø∂˜…¡ã=¶¿◊ΩÌ˝∑”‡‡@⁄®G€æãÊÄ8t¸ë$¢œQ©;
ûaZû«˙A TYàãíÃıc'È≠í?†®[˝é‘ÎcgÃE¸ô+¸@%+˜V…Ë~!è0≤…zŸ∞Ñ⁄éΩ‡¥w÷£iR=¥?öÿ3≥êUv2q©á6≠œ\[dµˇ≈Ê2	B:bçnWÎÖ(_Èô5ÈÅµ˙Œ{7iıÜ≤Õ˙tÎîámÆø˜`∆˜I<°cò/˛©:‚¢â{Fﬂ˜N{≥1ë-ÎQïÇ¬ÉkÑ7;Î=,ß^◊pS%*‘Bli8ÏmhÄ$v<gÑ|GAÿv÷◊•(7ù≠‚—`‚:ﬁx€i «º?¿NÆ=º  ≤ﬁjv_q‹ƒ3√~¯«n4CFÒ€ éÜ@_Jé´Ê≈:N<Lì$P1™‰,Dåa?´“Êˇ0ÕÈ„sS&êÈéD›]0Gí∑Úõætú1“ß˛feµu+ä{πÕOU üØ:wÏE¯=
x=J£8àza‡™Îô®6ÁÁø˛'≈ÇÛµ”pa¸/ë”Fq∞@hº®ù°Óf’?≈Æ"ëdl‡ΩßÏ‡∞∂¶P#‘T ,Oû¿ôn•p.‚í√O˘/‰»YÖ!Ü¿%âF8Œ0§Ñ1ﬁ&¨NaÂFX≈p≤p‹3:RÄ—˙Ñ{pTH\2x≥◊Oq@œÖw˘Ô`b∫<ÚlF‹∫≈¨]§˚vˇ`{˜˘R>©>1Ç“â¿œÖäëB1)∏/»í±;u#wëo&4â∑√êú2–R–˙¥B›éôïpgù|»¡:.ørøé¨‘≈ä ä¬9|ˇ=Âø_;é⁄©â≈q›.B•g^˛^≠Œa¢∂>√kA?Á≤*ØµÚ‘Pw‚
¥∞∏Iº*≈]:çÖëbß
k%ÁÅaß≤™’˝‚ŒîLÄôô™S(∂[WÂ„ﬁmV <Ûj/ƒ^∑¢JY-·çµ/*œ}ä˜u:m_s¿¸ªfJÉCxièx&d;3¯«Ω{{Nå’%nzÁ N_8 ∫'Åë¡ñ˜.‰Y70°I0f&©=ÏµàÒıË[dÖºÒ—.§aµ˜6Ó}rîsb7´íÁ2å:EΩ…rKŸysóofÔ™ˆMkNï ™m)ºn…·ü≤PïÓ™.Ï&¸/üi3‰K`…ÂÄ:?ˇıOˇÔˇ˛É°
ÎSÇVúÃ±öÖT…é÷Ú—>˚eÕT¸nãö)ãeUP≠:™«∫¯Aµ£jÃ®léRSowçk∑P©ô6ôôñ–›&Ö%)imI˙d(c7FﬂÈ¯ÒπÛÅ¢`‰ƒ1ÃÉK¯æ∑ãûi\‰Îı»+\ŸÏç[¬|ô#ü LS%Ω˜±‰»)m*&;ŒQö§!àÏLFÎµ*uÊúÀ`@€œ1Ü∆g˛àòÜïÇ˚Ÿ®É0‰ÇsI$–"–nén•ŒÂ1#:k(ÇéÚ«ÑûR7!5–ª%1b(Ç3«ëÄŸ√ˇ˙q:¬ôòäË‘ß°Ωï¡°•ÏK2t¢	ç]ˆ3≥^›&©‹ ïYùÇ„c<± ûq[RﬂPM––◊@>rgNê&∆˙w˘Õ∂<D∑ è\, q}±ë‚x@•W¥?¸¸óˇÜ[íõÿ1˚¸¥ÔDQ¿˝ñ/È	úgŒ,DiK∏Œ≈s,∑¶ºàÒd4!]x±ªÍÎË_91Äƒp$ö2ﬂQf<ı˚(‰Så<=!©I¯ò¬ÍÎ∆ú√æÏ˛û`ˆ'πw§`yKÍúøgÛîÓÖ≤dÓ%/}TÂı¬u5gﬂrÎv≈∞ØˆÒ¨ı7Ì‰ÉÇGk√Ωi#åùc¿÷…≥”ÃW¥QäAﬁ¿^∫~GÌDb√∞Ú^Ü·˝~ﬂxöWé£’÷Cˇl‚¿1∫Äº¿ﬂ—e≤ìŸÛ%ÜŸEˇ’“ +º˛f/K˘R·∏5∏ºÂàÆÛﬂGœh4é≥í§7·úﬁ¸òù”6æÊŸx+Ï=¥w9ﬂÉ;ÑœπÓŸ∏_v2≥G&ΩoøX˝qÚùŸ„å1_9_åÕVüÏ0LäqÅ—êY01ÇÀÌQU%•+wY≥â≈ÿÈiOe"±tZ´=5ª3z‚ÏéîÁ‘∫ÛTòjê≠g,)LAà®’>¡®ƒ∆e·’çH–ò"¿ˇM…3óÛ*÷ˆÁ®€)˘Õ!ÈVË[‰Ú\Ë≠˜Ã¡§RŒ€∫›∫©zˇ¥JF≥öa©j≤”[á›q∑√NèWdÓ≈£›πDq=
NYåb“]ZfÖ5ıJ+é ™ëWJ∏ô9
”‚eœ˙cB∆±/€ÖËL èÿj„Ü–:J‘[í˛Ûﬂ˛Ûá√¢·t˙Ë#lÌoJT¬ïõ]€»wÕﬁ&p#˙ønC2 ;¥¥ZtS¿ùB∞Öd©Õ€ëC…7≈©XôäÙ'a‘[„ÇcM#1”p«è’Ùm>ˆÁΩíJŒBΩä›©Ü™™ùNå[∆aﬂ§∏’/—BÑâ; tFÓ±;bZ“1(Ñ¸‡∆Ã‘Ñ!«è†iíÔ¨ˇk$ûm…˘r∂í•Î‚
ãÅÀ2G—¨™4í≠˘vCïIÉÖõZÙ]—Üô(9&˜ÛTè˛àQk|mÍ?ò:≥‰ô¬!úav—]ˆ‰ÈgM˝£åÈ"¬/ ª·ÍÓŒWÛ≈2Á´î£´W¢≠Õœ∫ÒA‰¸Ë:ßèœ— g∫Y´Ñ±*˝@Â∞Ë˛¶"0Z$_9´¡°vΩ–PÃ∆r˘ÛÛ_ˇ≥£¿OOX–¥;MóÒﬁòºNiƒe†ir	Ñ∆d›qD)ŸÃéß∆ãˆ™gˆµà∞ﬁ›;xsxD^æ=|KÓío∂_ÔíW/^o0Ù˙ŸW%NvÓ∆ª3÷B√°£âΩ	Ai•≥ñT—˚’8i8˘¸mÙç-0æyÙ“B]ñuT£^Zh£˘3Ü†iÎ74)≤‚,ÿFy™È√MPM+"0óÍwÏAU›§]¯4÷+ör †~/ı)–∫Ú4è&óÛŸQÆ¢„Yç‡z,º‰mËt¸Ã“qÌm”FòÉª);≥Qi∏ß#dF£â1òÀï	éïey“ì`ÊDA0”ãµß§ÛzXLô—5˚2çR,8O…‹˚MhÉéJH˜Ÿ‡∑Ì3u& Îamë·‰]âò% „'~^ÚLxb‚˝Ëîôπ$ıìtä1∏'l…nAã=NåR˛N‘Åú'∏p^≈¥§¿EΩz†,Œ&º˘xf|Ø1`a}o2©≥Ûítä.)E=iΩ¨'m™b‹î‡sEµ?˙◊›W—Â"‹ÒË\’f∏"£‘Ê)∞EÂZüevpy°‘X%ã)≤W¨û-B™ÂxjT ØçÇ}èÇS≥ÌPìz6Y JÌIÃ¢éXëÇÿËò¡íbÜCﬂ[úNÚm2˜oõü≠Z3VôµÜéß∆T¢L¡í¥…õ‡üu„tL'Ë6√‘R`Ç∫·π1„àË(OÇ	È∆ûP«¯·«ı√TFzáËmL··ê&»`ÈÑ˜≈ŒO‰å¬…Ùaw‹GÎh0”8dπÆcjﬁµ¶M.ùY&U
Sƒ(w!êÃ„¬S±{ ßæ;%›Ñ’5ÇaX´4ƒ.´…íò¡ï¬=ß@ V aúÜz¨Ö%” ùNò∞d∏ã«4ıí,Ácò"¥ZdS»-˛ÉVï1Y˚lÏ}U9¶ùÂ¶„9œÉS`m
‹Ì÷(V√¶[Fi[2'…=Õ‹Ù{I?Ï%A/"«Q0ì≠¡pQmÆßÿÜsâYxè%a©77[zıáGŸ eRı^£µÃ2	ÎÃNSÉIX[§R!“äË¬ïÕ™Ò6è'‹¸ÿ%õ3yYŸˆb„)ˆ9ÚËmÊdP‡Wªæ:r∑µT…=µí+*&9Ü ¶+¿}Oö!bBä≤5çqM1}pÍd"H¢_q˛â3v¬Ö.√ç  2v¨§$Ãîße¶dä9ãˆ‡q
Ôa…Ö«Æá6Ó(vÄûñ·G/e„≤≤ÑˇåÊ—\ËêûÇ»Œ‘èN±†^û=¯6#·Ó1E•H\`Ó/∏¸ã˜ƒ
Ê~µ\<√o¡∆ázüØÛ¶ü_íìk.+µ£ı>˘qzèÖ†1ü”|jë&∫¿£C«≥S%ËçÀ:«»ÅÎπ>X9Ú∂|ÅTéîØ\#êï«≈Z^LeL„â3n–‚Óó¢ˇk5%W6K∫wÓ⁄“l6;≠	9íé|#Á¯Òy¬)óàmÚ°s¨#P:9aÚ∏”≈?X∞Å¿oŒ·√‚s„õÒ”ax)–mfZŒbºW´ŒZaù∞ˇ©!“YåËj2Põå*SKûŒåã9.u0
ª£¡!.9˜X7rc©2´Lπ≈—∆ ÿ+–†Pî≈,3E#(gN¬Â úÜ 8ê&+™))èÂŸ2¯ˆ8OQ<3àq3’8tfnÚwÃ(È./1µ%@è”ø˜◊:ıƒÃóuñÔˆLyü’Q∆"¥9£lnV|¡búiL™ŒXQ›™?cJ¬ìe'â*‹ß¡ËT≥@¨ 37¡F		YÓºí
DÀ0£u^üPh{V¨ﬂ%ù)+ˇïﬁ6‡©-˜KJÌRk^Îõı}+⁄úwÔXtÔıÌ›%ˆM¨‰uÓP‰Füß;l«Á!øIE<◊ImDmw[U§C«£†•„Nåd}9Ôa?EË%;ıvıKvAv–∫i0çÓ'ò1ø÷I ë†YëFjÉ°ÕÖÒ#J∫Å™(@=qåT3{g·¯rã°¡ﬁú)@≤u?ÁBçºe˝[ÉÈ∞QnY·ïÖ£ÍÆûÌıu∂™Ê uÈ≈∆ﬁ¢¯P·	Øt˜0¥XΩùõF`ƒ3öûÅ˙ˆVıŒss„⁄∆^ï~	"Fr¡k˜;O∂iöõËÈ<yõ[’ÁÉ“yÌ`s»2„ªú°âûíØ«≤„ŒÜ,q™˘ô-,!Pv§õß7˜¿éÆ?Ï<9»›ÊÅÃî[Xˆ2 @’[wFƒ)˙íÂÚ;c7ùUY}Íb‹=3g°äQpj€ΩA€∑A•K7‚Rµ`π5¬d Ëæøxº€î—UyaU™¿+◊xÙ*∑qÂ∫¢§>®e”ÛÎwïõh∑-òŒmç6–[÷›∑kÊa≥∫rı…πW≥&p∏0∂^ë¶≤È6”uÿZ-û_âúj—£è!uv‚∏VêUÄ∂Ú&¥ÎjwyπÑí	Áñ√cÒƒ{"NáÔ@Ò∏y$ªg∑4cÊüóSV$Œ<Ì'Kpÿ42∏Ü˜§˚ú;ˆçñ¸“óﬂÿ¶F¶Æ'Ìå≠⁄æÊ,—Ç^‰zHï™(À\a´Ë'ÁŒk3°Úû"J©eB^Ü‹83O®Kx"+d‡xNLÎNÎ¬!uUÊêK•®…ÖSédCë¶pä¥Éô{”•âSz÷&£m3ﬂ:K'fë•(9)+äÖÂE⁄Yem]<ß1iQ‰+fßIC™Ø©ÅŸ_IE„}ÑN-À¬∫z~&˛|¿ãÑ¢§ê˛ ØÌU⁄»ì1RÁ”’1ÀÚ•˘3Hœ∂˜˜_b∆Û´ÌΩá€’§ëﬂDÉı}M¬»o≈Ø{ò_ÇJ§A≈yBT≈D¯ñ$“¨vŒˆ]∏∑Îª±2üçóöaÃ=˚Á√˜è]\«è.%∆˙©¨¿„©=£±ÉLélµ´’“/µ tÕã∑´*∫ €îK∑Êw◊sâòå(-¨¶Ky≈.™¯ÃÙ,	’†ÚS+
tx¥Rkø ~A4y\˝êÉáÉ›¡—ã˝#≤ÛÊËËÕŸﬂ˛ÌÓÀÌ£›7˚dg˚êta%hDcÙúYä°©ø§Jj°L=@≥∆5£üòYYY˘å{ÖABs@…)¯Í∑´ﬂ˜Óa]∆u¯':“ÓÍ2˚Øø∫πÙ]Ç¬YÂlº%lóŸ±Å2ﬁ[Ê°ìﬁ⁄˝¶‘6Fféüí5“˝
tÑï√ ∆g{$§≤N¨ÒΩT¢∏∫Ï”I<cﬁ> ´±~Dá›NƒﬁZM–Gåùß{A‰ å
,·[=–Û∑I;∑˙j-¬Fõé]bd’Ã∞Jˇ5);ù^≈à S≈‰≥s*ÉÎkbADΩDöŸä†QMÀ5	í
∆=ÆP∞ÂØÍs»ÍºD,ÜàMùﬁ∑Î,+ìÅó]ZÎ≥.—F˛±bBjWYÿYx:h…˝aX‹“z™€P⁄≠Ïû qUY™8ÑÊ‘∑â’Ê∏vJBÈ˚Ÿ…,π•∑%JÀrÂTáéç+ß∫»ä[ù7-$}÷6„ ®¥⁄a°çnêÆhßu˝TÍÒ›héŸä\9mÇBÙlB£d„ 	T˘£êã2¿WFrÇfÊ$∫{§ªt<¢qr˝d7Ã^uKx9Rkrı§Áxﬁ!`„ïS^ÊèÇˆ  _›±4vN˙€D°Á˙ò5“bú	ù.Á∫!∂Çº"™¨RXmXÏó;Ï€ßC^±4Õ+'©◊Ù,H¨*’û®™Ä5”ÕÕJÆ+M≥≠H£4+…¯40<M‰ó
{â'éì‰’7±íWGº≠c◊U¥4È™M≥≤ÈÌä”ÿ’£YÌoÿ‘°©ﬂ”@◊j/ì°
-7£=:övÙËfπ
 rgmuıóäí[“"®'ñMﬁ0FAÓx#r>§¥øùtñ…òŒB¯∂E÷7ó1\Ô¯ÿw‚xkè+¯îçk˜Áµ4fl)Èmî€¶fQÿºbè¢jV˙´“÷ä^Ñ√ﬁZ≈=Sı¥é˝≠≈/ã–⁄óÕ¶°È˘h≠U¶£Îäiúˇå|≤zèK9ÿ¢Q<ÀB€’¿lO—Uƒ#s≥ó‰mBgÍ$4UäoÎ"4s±¸î´À";◊≈7´56KõâDﬁærµãyºŒ¨‹¶bÖ.SV¶R≥qM˝≈üºï™rÉÁ¿zö√ƒÔÕÇ°Î9=cΩ8ú/”ıE28‚H˙UóîπCLÉñ}; `†Ü2poÉáëJ%H®&u#¬ÎrE5EBæz-^ÍÅä,N˜ÿMdêÔ+Ú¢§∫ßﬁâÜ9¸Ûﬂ˛˛€Ò'}R∑U•Ô5-üBﬁ∑Ÿî·ëïÒ Ê˝Ö1“vp∞∑Çv˝¡
¸ÛP˜÷ï…¶u&F9J¥Ï˘Pœv u*˚Vlña*Ü†–πíˇà™bÉúb"eg≠<Ã≤ßÚCzbL+—ÁDp∞¬˙hÿ´•ÀËIt∆Í8S,rêÄb·/ã@Ü1=NhD∞ßJh]≠m"£6˛Á˙`¨üRœƒØãΩâÛ”:Án˘ijÂ^Ω˘ÊÇÒ5ñ™ﬂwµ\éÅ∑˝˘']Ú9ÿõ=söx”M"wìØrhê]«ó(∑X†÷Ñ˚⁄ùPÃ¬Ä„ò[‘ ¡hÇ4J'ºB	πÀÍ~:ÑJΩtÊªãjGﬂ˙ix—à¯ÃÒPeT§˛ä_Óo6”ﬂˇtÛ‹{øÕpÖt_ß^S_W∏tN
.)m!v©èIó¨tGf!XáC
tÏüÒPY,m 
Èr9?J˙Õ»øØÖI∑ﬂRe≠"»˚R=ê˚rıßˇ∏à4…{ê`¿®hö≥D…+)%n$hqÑPbΩ¨°èÀkÎÉ@ç1NA˛Ñ»í'}/ä#(cê§o	TJ<‘ïÃ∞ú?˝◊E$“Wéxî•ÙÇHTBAôûPÎºpwàe{faZ©»˜ÈPhñ&xKöñj©Ç2%œda˛√ˇ\`¬,äa.aÓQüæÆÁÛÜ∏'xtçÇŸ0‡E¶9-r}Ù”°«Y
ßÅ[EÙÍ»C—NŸä_lΩ˙˜ãH∂,∂ïÏ1åYä©i¸,;e}È…]¸Ç‹%r¶Ï≠ÁRVh(•H∆Â`ÚèêváÈ4˝ﬁEœÔ-˝.ñÿ˝ÈœãHø;Ä/dÒõ´#—hOñËHÏá©∞=ﬁÙfËÃ¿‰ÒjKÑµ} ®‚«ÅÁö·¶ì˚I=ÃõÉÔQW€hˆñﬁ[”˚–Kï“ö]∑ë’ˇ¯ë÷•nÚÿC¨YZŒÙﬁeÇm>ñ…ÑÜiñ[.‰v'orSû∑¿Ù±˙B\I≠ëÁíÙ(è›ì[ÿ@õaÖûí:≈/ÕÙ˘Û_˛ÀÒÀ6SË7öƒ€a(∞73Õ.ïæb»	gg7€ü8ßÙ¨
∂êœ®/‹¥¯ØÉì ÀˇﬂÕøw? q¢Jì5°dﬂ7WW6$J◊ãPs†kı≤Ò)˙óˇqÛ4 Äk∞S°J…Î÷^-]ämlPFÄË;e—»egaç†È&l=À¯! R©∫_¬ºƒ®ºΩrs~ìù±
1¨q@∆Y3ê=˘IÄoƒ “I2q y,≥°πª;,÷Ü°ËUò‘∫,Ò¬—"}væ“ÜãäK§§
{m„f!xvkË≠VTn:®íˇK4‹fç‹Äãµ<ƒ>°ä=Sìåµò(Rc¢U∂g-KièÎ-u.ù:3Ï’áw±òY‡ªIPÕQ«è»	]FÆöÜÖó“•hB‰Å J»WıJœÍ∂¶M–¢˛ªÆGÎ#µ`õ∞∆"ÂûÂO˚4úæç<Ú«?íŒø“‘ŒÖ„Ôâìh}J:ﬂF˘SL6Bƒ<v}GS∆/rº«?BÇ$∞eŒ±E∫û=ÖtÇêó˘π£ÜNUˆ'˚8}Ã£É˚E›?ùÙƒ≈6¶RÇù◊Æ?≈Èß,ë¿G∆vˇõë±Kì4"¨ø!;Oé(`WøS-aT|¥¿®WV)∏+πxX-áeHROsFTY˘í∏mnÆn√$ó◊ÏÄT*≤Ì3›÷®∑RªR<cPÚ+¢”7≥ãı‡ˆrDoQ§PnœPcccÁRÓE%O¶ñ}î’ÅªØ,Â;˙ÉjK5¬{0£QN`≠uköïZ”¸nJ%Œ«h∑/$OMî#∫*ÙD	=Ïÿﬁ[[ì+·ıÿWÏ◊–qNZﬂçMÕÍ®≈∂œÖ$w:O2¢ﬁ>xe™
G’]€0e7àÁe ‚—e ∫ƒî›7É[Ü|%ôocCéßgÂ¨4¯ª∆àÒbQ˛ê0˛˘Q0_–¥ΩõØÉÔ6,¡wq?nûã4Àñ∑Å„÷/*4ƒVe8ãø,ã.≤jö[ôèó{ùYjí§'ûª1˛ê8ÏÊzuNuE≈"ı{”T(Y¸Y™π¸≈ÍÍ }¿–Ë@xÖË%à™Õ„ty‚ \yP{Å0˛ãÕ*ìS•ÕØÂO¨UoØwä·=≠f„jˆv]uñÕIE÷vµëMŸ¥)'u≥2ÂÄÙ2WP£ﬁGπ¡AÑW$Ó=öl‘ìïgUñ´ØÛ€¢KSΩdÔm…^Xç‡TY∑wáÕ.C\;¡Ì752öl‘f´R◊ãÜ?b·÷∏˝H•∂Ó∆.Zä\–—à≤^Ä>◊…W:ù∏÷]≤·—àòv£t≤ˆ¬ÿ—ôùT5Ôöﬁ≠2=BÜXy0ÈpÜeh|ÊèàˆdséaG§„¬˚π´¨SÀ∏úo∞Üw›kê<ﬁì¨vSÂA%l‚w‘Nö»ÅCè_ˇ•ŒÆ%¿û;ÿGÖ55Ï'ë;Î.ŸA∏G„täFóﬂrîæKYŒ#¢◊UBxË–∏%plÕ,BeÂ@Ò%lZÌ+ÍÀﬁDÀ—•õD© ‡^ﬂ]ªieÖ|	ÑêUOÊıî±⁄P,\Ád˜yÌ!^z9N∆GCs˘e© 3h9XÉ©Çõı≥±©•◊™7D@'˙)>&Ùî∫	oyìcÆº^£6¿È}Kû)ñèV„±;IÂV∏¢æó±3l/≈qÉsBçz‡Ã®ÎïfóòßyÜ)ÎÂgÿ%”3lAÄü√›[bwª˘nN Ÿ˝¸ØÜÒ¢œ_S\R={°B\¸0t‡˚¨W˚
ä)F'ïxdØåúzÓÊ≥∑∫Uö±È˛%ÙvÉ∂)òå˚„VgŒ¥?;Ø¢‰ ª	kã=v1lòUõ9∞”<?ç»s¬Ò˛w‘cnÃEMèw∂g_Hê¿5\¨ÓÕ"˙?ËÙ\Õ</àª°êπòf‰ŒKzB=Ùúú∏¿´ßTƒ-G(bxÑŸ‘¡ò)8ƒÈqµ”≤Œïı‡÷d€ÇƒSÏô'1∂÷™˝ÆøF≈È5E·’å¬ﬁ¶™»êπÇ–˘¨òÑ∫'áÆ}∞«*º∏ÎŸπñ˝UÓQí9"%KÖ˛Ï⁄ÏTıæßÏM´È1¡[@»´p°u%©t¡zœÿÊÜÆÍ˙èXkzáõ≤‘éÆS”;‘q‰‹V&Ï=Za/V9 Ÿπ@1Ëè‘Ka•+rU•Æ„≈	W¡où>7BˆŸ∞M%ãÑÜ«]˝Î÷Î>«¡(ç3ÎPõæZ±Â=u -^´ﬁ|Ó>ïjΩQ. #ﬁÔS7r™u5ÒA»˙∂%ÌtûÙz•=Îı≠[TOÁÌ5îLŒgêìéëÚSöV‚‹âyß28HhÔÈä{*]6Ó∞ö∑ò∂›ûb05=é%sÁ@dx\Úy!g;µ&!¸£NJÔ«»Ú.]&CÜÙî	„æ†„Y0i‰táÏ‚íf÷836vÃÃPáıÀƒ≥ˆEFòÏ˝Œ¬Ô¸p–=ÛøX"=≤ø;ÿbøπöÜ⁄»+Ù∏®n2ÃîqªXä≈‚ùGœG)›[O◊S˚‰q[®°®ÿGâπ‚©º_≈'nñ•6ÚŒäı,o&€Üw÷Ñ˜«Ä@õ≈J^¥È êÅP≠c¿:ÿ'z‹y‡ì-2ÿ; ˚Œ	@@÷±ê≈ò™[#ó1∞P_Z"¢§˜,4>Jk%ªz˛≈`È67^iÚ€ÙòâCÉ S9§KËwîz†1
Ÿ‘	Ö1v≠7/˜Pïõ¶â+˝J∆¡Ã≈,6¬Õ…Iäôndu”ì~øﬂà∑\Coá≤B´ˇ±uÊ˙XHˆ´Ú|„®õEﬁÜÊ0Eç…˛j€o™Õ?{X;/6±ÍÏ›TdH{S©Y◊xç¡»≤üæEgNµÍö	6≠rÃÃ™UñõjñçÌVµ‰˜ ◊R\{PˆÖUW≤…lΩú˙ëäVövk_[ÙîÔ9≥ê˘lë;°ìªÏ¡≈‰fENC¨q˘:í ﬁeï◊πÙh·tﬁs«lëvRozË` uπo£#Ω∞MVﬂâ?Pu 4<X£CÙÄ1sÓ°r`Ñ˘ ººw=Ymøh~fŒ…%íï}aπa,Ác˘ÑËôn¶œ(Ä(nSÃëeÄ<>¡]üÜG¯ß4dª„‚˜7¸Bqù'≈€ÏÔ‚w4zÒòçÏé]qE∫'<ß#æ83ÏÄŸ9üˆÂ_—‚œVπxx‰a+⁄W® VüÃ‚é≈∆d=qÂE?ô—@π™(∂i@:Ç]ä„aL’[uÁN(ˇ.åG&0˜Û§–‚)a=y|núMÑ≤5ÜEëˇíÜ*≈÷T„È*≥Œ)¯‚øXY©∑«‘~Ó›˝Áoˆ_v∑˜…—Ôﬁº<‹>¯Íw‰.y˝‚˘Àá‰≈≥7˚œv_Ô≤∂úÚ’ã◊ÿ∑≥Â{~qú˙ØêÌ–d◊æÉÓı#wg{:ª‹À=Eˇ÷‚_ æ0˙eŒUqÀí|íNØÉTõDgÇ∆π€∫˙Œ)aÍkˆÃØ•f &Ë„˚V¨eÁkÍÉ>ÓÊ˛ŒóŒ0*_ŸÉÛiR¸πFÆ'˝ÍH∑~ù˙•ø<ÈØÌìP%..úuËéºŒõiî.ÏÉÑ+ﬂë|Â;yzczs˜·ÿ…ñ†>w¯ôØ¡∑ÏÆ=¸ﬁ]*rÊ–(ÂK@ıﬂ¡ﬂÂë&Aäwÿ&uŸç_¡•∏ª¥‘ÈòCît◊óIgµSÜ¿ı+èÌπ~ö8Ü≈~ˇŸ9ÃÌÇ|vŒ†«/Ê≈2|Ah.∂‡◊ø ﬂÏÓ¸ÄO^ê:¶I◊â¢Ã’'∆x¡ÓB¬…1Ùx±{|∆˘k◊’¡«*?≈Â.#%ü>P SÊ'Ìƒ¿≥Ô„îf_˜$ˇRûf(’Ò@óœÈ, ˛I>ê„—4ÌÏÄÆ'ˇ¶^qwÏ`≈éklsëäƒå»#≤∂^Y6ìo≈ﬂÒdN´ÚsÎ´äÁjKFzdn¸útáB;úÁ+ff Ú¿{4ôÙèΩ àÚáWíå,õ?¸ˇsÂŸcøƒ«ÿKÜYV°ÇıåòKÜ7ÃyU?&¸x©©ñÁö”8Wõ…™fÎ”¶…6Ãˆ≤ÆÃX ‘<·∆‡._ƒwpD∑±Â/rƒm˝$\íÀˆúEππ¯¸)ˆÀ :LCóN‡L23q™ëÁPˇ∑˛«Dö˚Já1>Ω¥î±â‚ﬁ«è…j!r˜è∑1ÇŒbzPîÁö∞$¬†˙ë√Ï›ïærÏùpˆ.FÜ1˙†8r†ª´Àdûﬁ¢¬%\)üWÓY„‹%áÊ‚ˇ  ˇˇ /Ä+