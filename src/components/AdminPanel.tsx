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
                            Massal üë®üéì
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
                <div className="lg:xúÏ}Yo\IvÊªET¢ 'ªï‹$™$6•Bí¨ÖMIE+)7ÂFWdfêyïwIﬂE$Õ"‡åÿÄªgÄ1<(èaÛ>/˝0ø¶ˇÄÎ'Ã9q˜ÿn2)©ñ JïÃº7÷≥≈9ﬂôD˛ Y–p∞CŒ|v…ˇL"üú”≈‡!Åˇ÷w»¯|ê¯4eÉùM2é‚)ãÂˇ‰◊€õõ$é≤p ¶ÉÌKø˜ÏœH´Ï·[»ƒßIÚíÏi/eóÈ‡Î≠Õ≈Âo…Y¶Éq‰O	ˇ÷ßﬁy4¯öÕOh¬H”…‹œÔÄMÊ 7Úß˙üˇÒ« «QxÊùg1M<≤ï≥9§)ck_•Q@S/Qıtª˙ÏœT?MΩ∑’1)ÛR$É	SË÷õ,IΩ≥´¡ò•åÖ0Åp˙.fîuÓ4Sßyom©6◊w4uSﬂòn—ë«õõΩg£î¶Y¢ù≠|jﬂS]‚ õv`»ºõzY–{v@ß4<üCÂ)ºëˇ√_õ∞	ç)≥xN}jz˘ﬁÃêÊßqñ¶Q®ÈszµÄéäGzög¢¿˜&Ûß◊˝5ÚÙô—pÍ≥}Àƒ4m÷ˇh,>¨≥êé}6ΩOÚ/<‹o©ˇeî≈I˘u@/E›GEmö•—at˙ù>è&‘_ª—t´úËÎob3ÎΩeƒ}/dæAfÉG‰b∞µEíYÏÖÛ¡&ô@¢x∞àxóä}wñ˘~æ+∑ÛpﬁBòˆ5·üΩ‘ãB‹pQúê)+˛7Ó_ãáve),Ï$Kv·ÔGÖå||›òÚ)È¡°ê«¸l<≤Àø)éDÔÊı∞]˜ﬁı7rêˆFêàû»Ÿ·¥¶g¶gGÓ,äÉ∆|‰ß6ô—it1H‡w$?õïŸ–OÉrÃº"‚Â`áèπ˙4Ÿ–mp±Gï§Ul~WzU£[Z∫±Á”1Ûu«π§À¸$√/1mRîáHQ4Îu$œ9a·ÑXæ˛Øi∞¶>Ôç¶ß	ÛŸ$’º	^í¡~PF›—Çß¸™ıôÈÃ∑é¸À, j’gÎ)çœY∫Œ_ævgæw!∂Èb∞-8¥+ãi–¸
ÔU]Òïl≠<ØMB¬õºL‘T{d£?CbÅz[¿}XÍ—Ÿ"∞ˆ6ƒœéµµ-Q{kª|˘6÷'˝Wl,úÇ∞÷±µÌáEk€Ek_“ÿ£a◊Ü>.z¯X4¥M∞)2b¿;wlÎQŸ |-æ ¢vûY;‹óü≤zAÁâ ÖtëÃ¢îzpë%ê.2˝F»	ÉN¬º∂çˆWz	kcq£p%çY9y”H4j™Gæ˝ñlm˛∞Èúë∞ÈXµZ~≤æ£ìÉxºg^
ßz¢›≥ø(ˆ*LöQIπúLΩ]Ä‡˛∆õS¿A{3èåAêN@ËÒH¶Ÿ~œgj¿ß äΩu›I◊»Ÿ˙s~ΩÒ2Ñ’%˘ÚÖJS†,dt·•ì˘≈Üj©Ù˙‘ÎpöÕ
ıâ3PJ†,æU™ÆVç89#gûS%4∫Bµ*vŒò∆ô3rr@¸ò Æe›J…˙IËX≠¡˝§¥-ÂËﬂπﬁÖ‰P⁄PñRn’HÑi≈ç)líE:xÄ<OÓïù€xº©0⁄mÎ*’kÿıïTg´∞—Âú ù6÷âUÔYUﬂ;e1ùœºxwb®ÊÏH˛¢0“ˆ÷&ﬂ*–^*È‘Ïìê]†…ãı’O¨≠ßﬂRlî‚ﬁÏ˜ºÈ‡Ë∞∑Üjü˘@~OX“YOGMñ•≠⁄∫çÄÜo≤4º¢´_∫ö	¯ëAÇØ,encπwØ ¸!¥b^›˙∆’¨vIÕÑ„K“(ô4é"hÿÁ»¬G†}!t¶ êÇ<ÏL?t‘„	˘˛ªﬂˇ;ß ÛA≤π%∫4G˜Â≠¡ÙÄ»“QäÖﬂ.¢’NS:˜ùbˇQ∏d˙≥tí¡¡Pã]SèÃ• HÜ·î~JN<aÌ·_èæzYÏ|–2⁄wÉ,Ÿ¥êœ#üŒrKπó		¸∑@5 XÄ¿Ú›ﬂZﬁÖ$^ƒB'¸/\µÒBÇ≠∂’ÿHJ^˛ŸÇ¶4ô¡ŸmIÒ≥Ë-ã:ŸCºÅ E˘@!⁄Ïlnlmí≈ﬁ[]¬ÓØËÇM{U)kQ_ß$ÿ‘Ñ⁄•)Cl ÒùÅpÌΩ^†Är‡GŸñ„o@Ç⁄z|S®ºDÏqÿoúHiÑzN—F7aµÛ∂#eªÜ	D+‹Æt8÷¢…OvL4hòæÔ#Ü§∫≠k€y}}ù˜_ú	NÙö7Q˝ı7IÆiÈ±˘‡¸∏•û?Ï,ZÚ9∂4›%££—ÔD◊˜ﬁ„%ªkê
,fß\ÈB ¢Sπ°ì	[§O{ºè˙«¶^¬¨n_ÍW£45	ÖNRÓœÅ∑Ò˙∏»˙⁄ïUöy”)”vQ+Ωk≠vöô’±fŒòΩÛY
«u v…f¿òÂˆâ·¸®¿Ω¸ãDj†≈0qJû›§.˛˘Ó$øçˇD¡ò’b}≥ºµ_≈}˝2îa« ÔI0Fù∆ƒˆˇXª*æú#Œ·∫s|ÆqF·(^öo∆ÉòA∑Ânz©LI:œBÉ¨‡-ñX„>;KM¸°ãÈ[iı>d…<ˆ¿Ì7»Ã!äZj4iÛ^òÈKNa’z“AHÃ˛:Ûb65<≤ÈÑÕ`,~⁄Ò<çf@CŸò+UsêÓ=‰s8í˚(¢—
ıêìì˚dÍ˚Î¶◊Á÷q>xòñ	Lr~=’Q»&UÖJM{∑©¡ª≤g≤È™l⁄X¥“Çô-Ä˘fI¯t„4¸x±Òò*ıª‚”
‚ßÇïQ7ÖEêbäóÌF:Ò“+§ó|vƒöîß´∫
5—±)XVMÉ&8'≥¡◊„ôókb·™⁄ªñúÊˆF›T¥ÊÊÃÇd÷7Ï›=ì¿?øbg1Kfπ$˚†FKsy5Yxaœ$âÚ∆8	öK%,Å–&Œ·Æ‘ˇä⁄˚m∆v‚g…ÅOÄÖÀ¡=ºiëeæ[á÷îgÒ"v‘˘-á©7OËÕó¯+≤≈ÓäÁ†@íË¨"Ât∏ﬁπ3c%˙≠€ﬂŸ‰ÒŸ+ÔÇ^—î‹£¡‚W∞bg@ÌÀ€‚ñb"9L≤ÓÉ“ùŒn÷,íΩπ4_ôT.MŒX:ôYÆ}Î‘ıyƒ≠÷:5Ÿ≤`îuß‰Z˛yÖàVIúQ◊SQN6IEÍN˝⁄‰j´°x◊'¶™r
™ÉJ˝lƒŒibãM¡3P›1‰dº’S©k)	WÉ≠Ì&~T2äŒlS·ï=ƒ$Ï6Wd˚°ñÅ¥6_˛càä∑o$¬wK†™Ÿ£;Ókµ${~A¸ö6>+œ2HQ»ÆÍdÑ<}˙îl~–KÎÍq}˝í∆”√mÜb•l◊V:I„hŒ`Æ◊w~€m)ÎkW[1q3˙§v≈»•`2Ñˇi'hôª›:∫.X@/(>‰∫““3?∫\*”E/Äˆ@"\ÂƒC[õ••‘xÖ"∑[@˝˛xæ‡ÍéQd¬˛œŸ®TÛ≈∫7Ω©sº±,8BæE6v6˜€Ów∫π´pà∏s⁄∞—ñFùº‘Jµùµ≥‘⁄›⁄È„Ø∫àÈ¬°M›ÊÁ§ ,‘¿âêFŒ8'zñ¡Pæﬁ⁄·{/	vÂ∞√Ïê‘K}V,¥KÁpGâß]Fbzucæ˛F+#Ä∏çó õ∞k.“´∞^ï.É•íı1Ô= ^úˆˆÍ-õö¸~+üÊ∂£XL˝iªj˛CQ7ˇ‚ëp Ë0„ä>ÁnGº¬~f∞õØbYtwi7n„Bz¥éúbˇ*e	Ÿ [õ€Ò¢ˆsÔíM˚[k7‰xÖ2⁄7£VpyUR9z8%çD2=|>∏ÄÕê8Õ	_È©õ´„–;Ø§Ì*$/ø°Û4€%◊Â˝;åa¬-Ø”a™Ωv_’–L"tY∏ˇ"ø^◊È≤µ6ùË:ÍJÖWXE˘qò5ÏN·IiÔè]õ,ãõ^YñÜ[ﬁP∑Ëb›á%√ŸZü≈Ïå<%ﬂl–Ö∑Aß¿7§D±ÒqŒ	6¶r(/≥F9œÈ	œIı ﬁêØπtæ&ôlW˜q©∏vPg≠Ê?ù¥¶∫ 68tó≈â;•4QYlQºöQÛ¨ñ™S ˚›å {H±=é¶‰#‡~!pzó]¶Ù6ïÉˆ≈Óu D≈û=…oµÎÓ*sVöçéBoŸçK—…æπqûÂ3´›≥¢]‘í6Û’lcÂí¢@#÷¡b§.K€¿£7'Xç∂¢ÿ¨»ñóªΩ√Ö·u9±á¿q“È¿Ú≠Ùºä!.}\ø‰!',h®w-®’±åŸ‘r(Û'V{$±’ª>ê≠%˚¡ù«”ò&≥Ì˜xt
OÙA‰˚L
©ê¡—”>daJ1{ÎÅÄ=¶”sFíÙJ„sRkí‚ï6Ô›#_çﬂ¿_ÎsvïÙ?ØÂ…gdµ-Äﬁ®Çñ.!£¶éˇøl°·¶÷Ÿı„∫ƒ7≠≤ †*ÀåZÖÉC©ı©(o\ü%^ÂO≤vã't„›œF^rAw·è4é¬sçY˙Lsù÷ì4õÚµˇˆ[≤yØÂM<ªù™'^¯ _¯ßø˝◊éc99Yr$ã≈æÁ˚ŒHNÈ9˜7~NΩpπ!^2˘–∆4Œ–ój…%¢oÅ$ß»∞®$ »^xSŒHó])Q˚É⁄1M»’ÈÂ∆ñ∆å&YÃ‚rp√q¬@¸Ynh4M1,?ú∞Á—˘á3¶/≤8€¯ıG’‰ÆÎ≥(`qßåNf,[#ø$≠'ìå3È˙É¬ÏK_âcË&ÛÅl,9í¡≤∑Ãè|,ñZ=#‚˘£,[›ÈÒêúD7À«?Ñi—xRÎ≤s'j°5“0‚©ì8ZD	ıÌO>èh¯Õ—ÙçG»-I≈ŸQü∆[éà8ˆF5¬RÕ‡”•øwVza=›≠_Óm7ı∂ïTJ–oŒã(≠{h+d)Ò(#r@„∂	{Øl≤—/≠ò˙OØØâ‘gw…Ê}ˇnÌêõÊ§ÓX{zã?ΩŸ~∏≤A
∑€≈‡QÕ´°öÑNà\˘(£í~˘πÀX≈µªˆÍ÷$€n±u∑÷m_ˇÌ %ß ‡]n]4&¸ÎQM•QÌõöÓºΩ©‘ùuõK˘8{`p¬„˝˙§ÓQÚ$Ôt>˜™{-‡ø `{ãr.uz	l5/¡ò8π[˜iú)è–ÏÅr8™@¬-%–íkﬁˇπƒÊ~ëÖm :Û#ñ«¯¿‡A¯Î‹E4ı˚ù√√lÃí¿S∂6zqB^–?≤wF^æ&'⁄./>∫’üÀñe<aÏ˘Í0¡Íîbüx^$J"Å‰WãW‰r6Ó(õ≥L{åÈv¶˙§\£\wYÉˆbh(»boJ¶Y\)õí-»Ó”†YƒBÚ.Õc6E!î˙–˘Ñ©Ä 	…RhB5 0IEµêÄÚ‡n‘ÔõE Ø˙(ó˜ÃäKh I≠Á‰s”%Ùá˜ÁÒrëæÚÄOá‰?_~AÜ«√ó‰ËÀ·…Î9˘Ï’ã·Àœ^Ó*fZÕ°˜≤Z–úÌt0ÖúO^à±[™∞ú⁄%}„ñ05n≈{æßúRK$|¶û†/‰é¨∏ "‹Tà◊=¢q—Ë?€^π—«Lúê·¶∆öÒ”ª=fs∫¶ﬁπÍnﬂb49e$)¿i~¯I˚\´ﬂË0±tŒû_x)ö“âî/πS 8c â!ÒãòÒ˜*€a%ä1ºà&»åÂ[«ƒ˚÷ó*Ûöúø_gqî%‡•ßêìA*⁄%3Pwüºsb˘Ü∆$†ÊøÁi9â‚4:ã|/ÇÅ„Ï-@iÀóîÏ{¡ÿ„ªæP;óûíâúxºà~
[Ë¸√3‰´¸Ëúåã◊Ìø´yŒSÔ≠áX^R7tKŒÄ±”‡ÜÃe	BQBÉ2ÛÊ0îg§	Œ%¯~˛©√Ë˜62Eú°Ù¶y ÿ›é¥ˇÁ|H)b	Ù¥í?)7‘/‰·⁄≠¡CHú4‡a©G¬ÜÁ ÂÇè3Ù¬≥H—ûá¶æ6b:'të£2‹'√ì#tï%π°R>ÛõMì·bq_—û†Áòt√’É≠ΩÃ÷s<˝Ïtxˇæ˙ıã!ÅM Iê‘õ“π¢=èüâÛú¬Ÿæ¢7¿9A1àmT!‡›Bé©EÈ∞p WM%`hoúm7Ãçã‡kIÁJË_¬ÜòrG•#eÌ˜zkZ¿+åÆpºHŒ˚x1≠x4ã.xÖ—î˙˝4ŒòÚ·ñä•™¡]Ç˙∏∏†vÖZVﬁsÖ√&à¥Q|ıX®X∫≥VƒG≠LVx∑œR◊¶˘ßº_àÆ°san j¥FmW0≈Â,ú \ÉN4\Ê«Ê™9ävNJ≈ÁïÁìÔø˚√ﬂ)ˆ¥˙∫∂ª¡CX78Üb= "œW∞\>Öcéõ°eÏ∏NjõEuw⁄:FËﬂäh.,líølÔ®fæ…Qã¸µy„—ètò∆—b0f¿£⁄⁄3£µ≈`©ÿcÙ“‹%õÎOvÓWå3Í=^±Ã»z[ïJ[ÍJ ø¡ŒΩ|z=ÿ≤úf‡tÈû_˜öÄâì◊¬µ=òVë p/ëÔxEp€¬jÙÖúuÁù◊∏Y·ê/OØÙ≤KÑd˚h:£è’JË^1êM•9ÈqÕú¥mé¸˙¿◊Íë¥;gs§π—p™215–Å—Tóì√A=å«Ú®Éò–¥$È;°1…_f£'Ö@√ßÛA|FG∆ç˝>a1»‚$†y%E:âŒ<z≠2.»ªDm≥ﬁ3Í'zÏÖ˙ˆÆ
åvö|ˆ…f-pµ∂µ€ﬁ]Ê÷¬bY€}›—Ô•^¿µ≤d: ˜V∂◊DF©C∏œ’”[õ\u˛ò¸∏’ùä÷‹H‹¢"(Ì¥¡1ÍdIsQû*µ]MØù°0u
ƒÂöù3Acé¥”H”å¶1µy¥4Ö*m†(Ìk⁄£†œπ![m‡MÛ}Í9óˆ‰ÿSÁëJ⁄†tM”:9ı‡si¯==:ì√·…T”⁄·—˛t¯t‚ú!∆9Æ	Â&∑≥=µ¸"J©∂é◊Ç ,y≈«jÂBîzœ*·WI6ô∞ƒ ØÇÂS«∏∞ùF\ÿcõsß8+lƒä-æ]c€èMQ:X`#∫Hsb‡UÀ›d∫=é	àWI„˘∑SeøÆéÜ«üùìc4lÎÁ◊h˘·±cÓ‹˛¯´óüΩz1ÿª¥iüËë◊/O_ìü=æ¸ıÎS8¥m„{ﬁò= 	õŒåe≈ç™°F≥‘õWfÈV‚ô¢-$0T¨0∏‡Ÿ	d(√äËåÿ(˝Ès g4©∆ıuÈ9^√Ç*Ï.…{?◊5À©ØD˛k:¨Á”~Â1œŸ*;a·(¨?¸´E\YN %ÕQÅT*Ï?JüE,}ÛﬁØ≤àÂ™9Hß§¥3ÅﬂâE'9ÿú‚Wè∆'µ¡q∫Oª—ÏfkN}):8œøNµÎä$∂XcÚ¥‰ïï€}j5<ç·Ê‹%a_àêhë3 h; ‡®~PcW’≠w÷∆jµÒ{UAÀ‚‰·.	˜ArÍı!¬R“sÙ-Hkvøk
ãÑL(™¸.8“^Sä’‡∫∏B9;B5Lùr,Â(3ñá<ΩŒ?5óË!èÂñ-=Ωn|—~˛ıbZæˆE˚yÂUyæˆE˚˘£`≈È®ËyÛõv°Ñè èıgjLΩ¡{eó˝, È@ú‘{d√Ãƒ	öê#hçiÀP^˜˝nñ’¨K⁄èî(#Mˇ∑˙é√π˘4rº⁄3∞ÌS˙ÅU-∑≈Îı¯ôèké{\y√Ê€íö]†cX≠…=ö
_[Ê∂∫hQ|ŒŸ√ñJ˙ÿ˚"¶”åÄx9(¨üèT˛tÍõ7£ Lw˘Á8∫¿œ∆‰I‹&£Ò+T“ÿ¶Pï)!Œ :øº ›gJhï1àáÛ:CKR‰µWÃ«ôﬂóIºö¸ÍaK[≠<ª]≥Ãï,—Ñ5Úﬁ˜ﬂ˝˝Ô……WØNáœ…˘Î/è–3ı3PFGœèPAæ8zy4:}•÷ôi∞Ífa„jâ u3)Ã*áF/ÆÓgÛ,ß«à{Kûê>˜"œ3?KTjC/≈À§Æ„JˇDqGÇ«À-◊ÅË–\ˆè√hA≠+ê—>ƒ;äF'4…$hYR[ ÛÑTsLÑê`N34ç…)®‰/√∆bÓÌòãlÆÒ!¢!Ü¿Ñ“"GÁp÷…!Mf„…öÆ@∏cSè˜t>ÀË*ã≤πÄ–"Õ∞Ωñ∑ïtMƒtqê¡P±s¬IŸo#Õ–∑Ñõ—≤X`ÀŒÚiLx;>Œ‡J¸_µËÚ_d†ÿLMé¬©7°)¢tŸ(Ù9∫£·?HéÿDI∞[˛πM¸Û ü54HAˆsÌáïK©Ì¬Gª≠‚WwâÊíZG˘ÊÇÙ‘HT]eV˚™h=∫N+PÓ∂πã2‰Ÿ‡U≠Â∑Œ∫^“çN¢!ß(ÑÚ†v££ Œò°Çá(ÏË!ù≈6ó^◊œ<ˆÉ>vπüÿ¨:Îº√ óÍÀß8∏—ã`.—^ÄÇ?”=ÚÌ∑F;Æ≠ˆ÷TÓCXÚHmÂœ7zó1NÕ;¨‡Ì¸ùﬂÁ˘Œ/êÍ—∂≥=öyÃüÚõÏü∆…~AQ{ÈåNs~u7GºXÑUùpqêµèDP ô‘KÜ>y˙√8ÔÍ´`,ﬁÈÑCY5›¸∑BÍ+»ßLcb∑“K>˙±ÖfÚÊä(MÅ"í ÜÊk[óâ˘X≥pAΩiOGŸ∞Tq(¥èiÁÍÊg‚®}Ø$é%ÓYÕF ˜i8£î˝4®£ê{
∫à¸˚^-Ù¯öhÕ±(®Êÿâj £LûV…n85ë	Iè˘±Á(B%=–üv…s%ﬂ‚%ü∫QqÒ≠iπS3fä.	4üéJÍiúnïc6Õ&xc‹'b©·#˘%¥O∫O6µï; u˛¯àb≈U£	‘k%ã-|˚7]<ƒ(ë‹iÈNı¬Í"‹ä4ÊTÃB‹Z£—H*D£ ⁄ß>‚±ºG‚°¯™eﬁí¶ƒ£ÒdFÓâ,6˜ıª^GÇ”t,7M∑$~•y≈±£vêÂeÄ+à@q/¬kûCU7 Q\ã‡ÖIºŸ⁄ÿ&É2∑˙ˇ¬)=ƒû\PüÅhËélŒFıÏs<.Jlï1ãßÏÜ“öíÁØøÑ¢)¯Â—H{.}ãD;bhj“£ 47¨‘rK2ßpÚO»"∆T∏We÷ÿòŒÁ8Ω≠xU•P¸œ1&9,ˇ(ü®Â°k8?Tq‡ÉqÁ~µŸ’πÜö<NÏ?mgü⁄⁄Ùt0ÂıØˆIox˘l)\—/5–Ñ;uÔÙ m¨%$KÁ"úxNå	VûBùÀFk>‹ÑªÇZ^ä¨'Uß\†ir¸*b&“´∂˜+·Ë"Q-{Èå—©Ü2•±ÚB∫ï¯∆!^£ö∫JC‘∑Å––Me zºr˙$vÁﬁF:[™â£—rU•	œI3¬kØø:3Üˇ„¶Yæ÷‹€˚< ⁄dŒºmlÒÎ,¿úÌwŸÎ,åÑ:y,„ﬁGÜ¿1A√(ÏŒùÄ_bµî†=œ{È8ö^U;ÆIü§=Ü◊B`SqÿúÛt©ªöˇh é§kRœ”ÎOSÃÊk±µ]s5T¶Ò‡å∏*lnl"L:éŸO≈öÉÃñ˙©v≥j16y‰,œÈ!Èåù2}Z^}äÒ˙∞Á`Z–âAx;HπsÍq|óô«;0aK[ãúW´#lä~9‰5áVn§&©?ãf¥Ó=˜Bû	F&ûÖåœBÊvì¨›ßŒ◊“¬ŸºéêÔ\˜ncçvπºG¢k›∫‘·&ƒ⁄õÌ”Øy3–õJﬂrçﬁhä–Zµ6o—€MŸ8mÙ¥ºÍ˘ï›·2®ØÒh|vÂ0”çj4Y[pﬂx† u˜Òµ» ƒ¶£‹"Ì5w^3œ«[(¿LDﬁQc
YJß:Ü≠Õ◊5¶ºxß4ËÉÁ¶…*V Ñﬁ∏‘4Q$∑Qó`ÚÓ¯Òe?=C‚‹[˜Ø&+]m,U5aú≠€&®bpu„ﬁry∫n?~πÌÃ†>µ˛´ÈáSæ
µÂπM∞√kJ•ΩñÑ∞[∫4E˜oÑŒbÔΩ”QsKûaÇÏ-ÑGôt◊eXÉUı˛=ü7πvÍ^+Gè\W¯Ò˚=Lˆ#î3„•ŒL”I<?j'q=j§ MÎmLÛ∆„“dÿ©â>9úöΩõ√ΩÀC∂∫©”›W∂'0ˇe…9¸Á?‡>GÙ≈‹<˛C9Íéß¡5;V∑‹Xä8“∫ÄX®Aˆ\DıAÊQ\çûià™¢ús5Ëù¥UÍö∆DVï1ÒvéÖ	æ7∑kõ#˚ˆ€ÕôgÅ«Á,‘·?ñ≈-uìmÈ^,4µí¨æ	Â÷*’ç∑{/>¥(ÇçUYñÍIªU˜°≤{ Î√ﬁÖgä€/¸¨˚Bv»”<Uõ‘Tï–ÿàw ∆Òo’≥QàøÊ◊k≈›çÆ?‚qlLYE˝ó.›}Ù!K©Á√ëÀæ0ﬂg	˘·M'MÕ3S¥Ó®á"ÄÔ°@4oˆ°©j™º˙çg§7=<7¯ÿ™°áÅˆ.Œà4gäaÑ≠©FåÎò@vâ@G]^rKáÄ$‡·äK§Ec˝6aoÊ!’¥ãq&Ær%àMˆ\Ù6¯µá6¯5W`≥ôaÔuÇFFSﬁ¥tï2h]™»Iùiè∞‹1w<Ò?ıª≠É$ÏÛËÏ°abîπ4ôå#w7ª6e^á.Sô3îaìœ_?=æ4≤B+±(˜∆ôÔˇ
='ñÈΩ´"›^6≥ô¶k˜èô˘TÜÒâ8øç2úo*¢M6˚<rPoÆ_âœ.´⁄•Né{Î£aÛA@¸À∆ÒW“…F¬Ùó®˙¨ÿ$–RbŸ©˘L)\*úÑ’óZÏ.√u*`IØ8“¸	Ÿr )F(4êF^äyã8EÓŒvrBﬁ&•ø•.Îßí[Ë¯b%VÁ≤≤>Ó∑àf~˜h;yn0û`‘˝^≤Xò,'Uk}â¸≤≠≥/Yª·™é9∆ÂÑ›í#ô—Êí∆®%¨å‹H	≈ÖBÉﬂV=ëÑ≥ﬁÇ¢–^~vÅ≠Ãã@úç6Rg∏∏9µ…∆™Èˆˆ£h˛’—}]≤ ◊:ÚS¶∑ÂòVÌÆC®léT9¥±T∏ï~IÃ\ìõÆun¡´¡ãZ	ó?UB"Gˇ31≈DLÍ1nbí[§J˛‹Ánp∂´∏ñ{€À∏ÂN†Q —Û$ìî=¢±µ-ÅÜ*j¨A¯GÈ9Ë–ªÖ%e¥X@ã}ÃAeLâﬁÏt˙0@KµTã‡∆fÌT·—_O‘w”©Û7H£¡Œx%n<|ß<hïSUÎPSÌºp0C˝íÀŒ:Ë£ä’¡bµA"Â≠∞ïÇ‚O#*R„Ìÿz8œ∆£≈´Ÿspö≠ÚuT‘Éﬁë§-ºü*vª√›…ÈWMt˙˙Â_ƒ.B€∂öÆùΩ)¥EïkM~çƒ”≥°’¡Ó÷·ÍC`â6≠'Ò(/NbR^V!.U€Í$6ÂEÔZñ[Öe÷ZÍZŸmW9µF>ßáj∞÷zz„·fınSë˛†Hhÿ-±,&aHw)]îõpu[p…hïﬁE±»¢«˘}¨ïz8îÑz∂+sÎ∂1âÚ	$ &k•«l2µ—ÃÍ◊ÃÖ5ﬂmàõŒ¨q∂„fÔÆ‰%¯Åue†jgßƒﬂ˜èˇõ≥±˜Ü´™•“™ç∑≠N˘l«2(≠≠⁄Æ,R÷A√]–7ﬁÿÓv∞™ÿoEÓú&-∞<≥ôø≠,Váﬁ“òØ{@˙êcÁÊÛoËÃv∞b6è†OS®xüLìÒ⁄:ø<¿Œïπò5·äøij^nf>˛E∑oL]iÛÂ÷à≈œGnÛ°„yÆP¥€ÂF·—Ã„eOyº’=ƒΩÕ®ONË«æ˝j¡a-+_?n‹;ªûk∑C™∫íj¡k<©«πÎ*LÅt2/áÙTy√s&ríﬁ+}‘X!ÂÚ‡ERíX»ıW"~qA¸.Zöµ¬Ã*ˆçsà≤´iÌ XΩfõ˙êª˙sÍªFdm¸])]tè∑kÙ∑·g√CkÅRæxñyñÖ¶à)óÊ‹"»™Âîßz95‡M6ﬁºí:˙Nâ".,ﬂYﬂ:Õ^ûÃÊ§†÷+ÎßŸC®l…·8á≠9©û◊Àâº‚¨ªDjò´ﬂ:ë˘É¶@∫j)ÇÍ¨AbEçˆÜ{làØ≥ª bqUfE∏ùRígæŒ3]#É∏â¢LU@1y±ªYœ9¨ëõ_,!_;ım}}ΩÎN∆≤¬›åEã®R-øuP≈iøOs+¿x˝äÅ1 îp±@#<à'Ü∑·:+∂©j··R¯k¨TµTP+´…Ü-±UY\èå ¯°»˙Q7-‘ï4G∆!äòÑ öõ›»?p°‹ÁƒıxY‰∫P§åÈ4BWÉ_Yƒ4√’≤© êW8AùÑñÍ`™∂nyq‰[ïéπ∫˙|˜õ|˜ÓN±ùÊÀ)ãπò$<˛ªMÅìÌ∫Zê[x…h±@ì,O3&	€]Œ;Ï§=ÛE*Ωw3Ì/X(,<2hÂL¸›Õ/≈$∫≈ãø⁄3,æwS,õ˚∏πÔzvﬂ#{x?ƒœ1Ç¶^∫≈”‘K√Â√~	–,<yﬂÑyãÙ4:÷ïˆª∑!Ü∞+Óƒ›d…zôr˚—.ø°X¶æîowõ¢m˜∂nÒ˚⁄∑≥îœ‹ëVWz¨;à≈"Ä∞6A„”ÿπÁö }Qá_ï&±v
?ãi≥Ñe∫ân≈`ï~¨M?"mN9ûDÆ∞Ì#j[∑◊ï÷ÓÒç¡∫Z,πk@◊%“9.?r’”À≤auWï~ª˝wˇ„ˇtd..°jı≤ÛV˘+˝ÕX8µ&Ÿ’æe).p;>PMπZƒÊrÜCÅË—î|L=‰ª–Œ5
Fì´pBñedí◊«—ó∫˚T=«kâY≤oDﬁ÷zAΩî«€]Ål/níñaX‰@ñ·éK∞,™È‰AÀ4Üâp&◊ñZŸJÓ¬˛RØ_ïúÉÂñ≤ñ\ﬁY∂ÖEpŸ†»ƒc´§§ª|;X}òÍígªîê]êC‡Q˝µı4:}%-(N÷F]ü¯eÌñŒ¢Èm∫÷ì∑øßÃ˜Å9ÙGl˘t∂&o˚o1m\ :∫UÁ8≠ÀvlxŸÊÚÕWØ/Ü/_ü>æ∆µX£ã˛⁄Õ7ÀfŸä´ì‰y7ñ'∑êË±¨L™«≤‘(∫3‚Œ˙ÄI#®B÷zAúC…–)Í¶®ÚXk£ﬂ,jBW¨´òH»uKÏz˙¥ª§!%ÉŒ∆
Q §ÀùÆß<Èæs∞T≠Et˚ YxK»æV§JUÈÆ>à" ‹∏˝Lzu∑å…tù∂e¥$'è÷•˚’≈nÁvs ;`ø tı’`ä4R·ã‘qÒ0Î¸£i˜Ω£ÿë"TÁEñrúÚyK˚∂’£íÔ‹±Mãµ‡Ó‹¶Åc∞Î¸ﬂ˜èˇèœz∏π }ÛAXù›Œ`˙çÔç¬Q6‘cF√©œF"XJ|ÈäÂ©Hpé®ËÜ⁄›º·ªuªd›»º–Ò¬ˆ]ATù^ûB˝ﬁî-"/\Óq´Qì’∞˛j∏dS∂iF¸óòdñ@IcËc1	|‚>#à˘5@JÈIP/†_∂å¬ˆöfW,v62biªK,Æ|ı]oø/ùMczA˝˛¨åÂ'≥	—euæ⁄Mh#—òπkﬂåª√€πßæ1ÉZ”µºñBÕ¡lûÁá("	˙Ø6…ooÉwÃ⁄}}ñ§j5Ã
ﬁæ%bˆ◊ô3ªÁe‡ÖO{;.W.ıîL0´—ló@Mó∫2˜Rz9‰.Hv° ¡t*kªÂ_™ñZ–ÔvÀ1ﬁ«òw©ñ[I‹mõ%∑∏⁄€û&áK¢ˆy2Z∂õÙ÷öøë@Z“ƒeßÉ/∑€¡…èŒd∆&ÛqtÈBâ˘≥xAïÃ¢ã”ÀóQ ,®‚¢¥∂≠õŸ·/ ï˚[v√—®∆3N∑Íäì#Óô“õñ≈…∫VMW'çbµ”Ò`≥ù¨∏íò¨@‘ﬂ$˛u∆ˇ≠o%˚R9SÑ‰îc ‡/Xër@Aç§°cËvN«-œU7ão±—≤˝ºÊ`äÉ3:e0knÅ1ÔÄ#bë≥yÃ`≠xŒ""¶Ÿ1`√â=ÚG]O∫=±`≥‘∏⁄iÊ{	°0m4ºèó™ú«ù08—0,ﬂì0rXF.
ÑMm÷¡f)8°3M—1√≠pÂÖX~¸ãÀÒv1Zq´x´ìB%∂_¬≠∂ñnÈey}Mæ˝ñ|‰*(Uı®<ÀdˇH¨™ì6•¡ABªóB(aZ!Aå¥Â¢î-i®el©›È»Ô>qãk∏GE¢â¢ïÙﬁ÷ÜM+≥¢$‘vÖÏ3´ı÷÷çˆÊ¬~∂Ûù∏˚≠√ı“∂ æÙﬂ˜˚'#/@◊gnX°Œó4ªºˆøëœÊ	õg†„·G≠Zp!´ÆW+{ˆâ∑Q+ªˆΩ∑Å⁄ïDõ∂˜/ΩÊÛJù§π÷∏¡Ù˛…›Üïª„/Kj‰9æ⁄Xu´h%¶Ÿs≥≈òÒç˘¯ñõ∞m<Å…G—¸E4•~éZ€pã∞ä&´π†70ªä-øí°+Ãü√ÖªU°êÆ∂*ΩÒL∫£r¿k«•w!]ë\~Ü-xè∞ßä|y_˜P~ÕBÔ√x^H]ú|ﬂ}ﬂrëïuÓ√E)P:‹C¨XAÍåœïÆü+≠ÖI%ŸeÈ ]?√!“a"¨k‹•¬`‚ïéù£AEXÚ‰`Èpz∞¨ÓÂ≠-sä∞‹Éc˜«ÎìòÒ\∆È∫œÉﬁ¢ —ê˚¥¸≈—}ª“Czy∑8ÈÂOÂ°≈ÔP	mJÂ∫wÒp^+Pùu‰Ñ˚É#¶Ùjó‡M.ãΩIG?kkÅ!38Î"
∆í/æÈ‰ˇπßÀ&•+jòﬂÜLéö»Ër;R´ŒB‡3É"S/ıπı}=t7øã“Õëµxös{ÉN±âù`ﬂ7å4mÏV±%Ï? 8·ŒÖv»n B‘'˘ƒ‹^Jh•ΩÎπΩC<à›®˘…π"}¨=íΩV~r4z7∏∞›õ¨,›Pã8≠¯Aà∫√pºãÏü<DáÃÄròéÙÚgêé
H«;ÜË¯ìCU>Lééº}ô@≥Î˛G¿ãj—◊“Ò¢˛%ÁS,>Ä‘_[˜¬âî È˜o -:Ω5mn]cØﬂFÉæã»úÃ^‰À¯ú”“J≈˘sü[Ó)QÇÉwé‘ü˜\–¨ªXlÈÖÕR"˝§vY£Bµ«_w∫¥`˘√éEËõΩ}öRÆ∂àz°w˜·ª{∞Æ…lª§≠sû˚πƒººø‰Oˇ¸ﬂªÓÍ•Œb7€¬›)«?}Vä≤ˇ{e∫vµFïΩCNtuK–BÒ=PNÈxóå¯5Äa<Gı13
'ûÔQ‘∂´ﬁ(◊<áDë¸,‡{M"≠K|ÆOxæµ”îp:‰97:˘>RÊ$ifØO8Nœó@õ`2h<m'§ogh©f7ì…Õ–=Íﬁ)“õ…ø–ïœˇ™\Ôc^ı¢ª’4É9ÖŒ€´ÂY◊•:k©C÷îf€¬Ù-äœ∆|fm∏G™¸e S`vÕ¶ª¸s]‡g•‚óªÈ”È≤†Ya;sœµ©•=\Æ‰ŒÊÊ∆∂‹\Ú´á-[yˆ¡N’e¶ñGÁ2ı˝w¯œ‰‰´WòFmt4˙Õêºx}:·Å˝Ï¯´ó££ÁGßí¥ËL4{≥⁄ºiGü|ÿii¡d»’£•ø„Æ—ò˛1Û3ìBGŸ€Ÿe_€Iz.ìñ!;Ö≈÷ÏÌv"$Mm∂ûg>Àí,ë8Û ±Ú[WûÍ<@áuë]üÂaŒòg·Í˚ÇFrovØâã◊urË¡ß–#Cx⁄]Pµ~¿ﬁ–\x«√<Œ·òà	Ñˇ«)≈Áhò“ª®i®ñQà;⁄◊ˇ4[d!Y‰nô‚hNç∞üãX·U› +”ıh8¢ˆ¨ƒxª®ÓhnIX aÿ(ø÷5ÚOøb4âBßGÅPx!Vpz˛≥8ébÀìGâxñ˚b™Á~gLSCc:hXÏ·€÷iI®j>ÅÚ;ïK`≈aNd≈±¥ëæS±`Ò‰oÍ5¡Äáãò*Ä´Oıﬁâü%^<Òã‰µ;⁄õ'(£'9ï⁄ßq¶‹’:\ÕÊ⁄_™|Q⁄¯ãˆ™»‹zNΩ	
^âUÓhÇ$¡nq°ÜÚP√,¬åX⁄ﬂUÒDg#™x|™◊Y«¢Î¡2j¸¥∆K’ñïdº%êl◊51†Ï—úæÜ-\]È¢o PZqE›uÇUCÿÊ√∫ã≥√EŒiÑzdïπv„¸ .Ç,¢v¡~ú€>D”#-ç§’Óô”O,Ó'˝d=ê 5Ë*ÄzG˝õı4ˆ†¯à[
$‘åá≠ÒÒ€<vÚÁÍˆ™∫dﬁ≥∂!%Ñﬁö÷e∆ò‹“ê“r§…ì£€&bˆaèˆ≠™·hÁb˛ëìé!»úßUÈÔn(G± ´"Ç>ÆŒTØá“ë´˜ßAGÙwL<öùO”âYö≈!9£~¬Ù5‰S&Sº{j*ßå¬≠tU¬∑Rù‡A˘G	B('hÈèÔÛZFƒ¬!˘Ÿ‘>¶ù õüi≤ˆΩí&`-ƒ]>çYà⁄˚Î≈OÉ,5)≠Ä0Á±∫§ŸîÎ:ßœö√Ò≥ºwKyO7Ø1õfÏ0Ä¬â@¡, øÑóJøé}äYüŸ}≤©m§Éì–èè(©R2πê§}Œ—ıÙßDêﬁÅ§(‡÷Ù®o∂ı	Èêìè¬Îƒb!cÑÃÅî≠öòπì≥¥ïê4É(%%L.Eﬁj%∆˛uE7lÇ∆∂XO¢ÄıNZQƒQV$RãˇñKŸ~gπ’ı]˙õp˝5zùå+¸c,˝Oêohå…k˝µªfäØZ”‘	Â¡ë—¬˜R2åÌn2Ìé°ú#'√Î1˝√.…YÓé·–6ﬁjB7™^»_7|"˘≈z3ƒå◊¯‘|ñ[qi∂J≈—EOÊú3wcÆ~≥µ›ª)=	m‚Z{ß≈ΩkóÙÀ[˘ñÉtGfâ6‚˙>[ØèË"Œa›m¨ÓŒJh°≈®ZﬂeX Ò‘Í˜®‚U›-lÖ‚5«—h›¢n\™ÈYäWêºCW4D¸fºã&.Ó=Û€IMˇwÉôÊrÁ.öÓÌçç'ÍW◊s‰∏Ì–[=Z‰Í÷(^yü§	÷‹1ë÷ÏÿjuåP{∆A7^ç i-Án|jt<CÖˆ¢Z—≠*o˚É«d√ÙJ(b	I'„Õóª	É.ÄÒìñ+ÖEºÜõV:[4Ä”ÑÉLu:mÎ≠\Où$ØA—bÅ\
,ê ≠©DMàåòπÑ€«°Éıÿ©°zÏ‹’£·:j„–`J ÅÊî—å˛†Ø|ûEN† ∫&ja.5ÎÕ
⁄´)_∑i/è>ŒÕ„‘;jA1:@aHèMΩLœ˘ÆÖ†œ¶/rπ3|Ñ4¬+V DÏ8'T»g|´Ü”¬¨?
àÄÖ,»pCLA*ê<X pú',…®÷¡Ï∑kÚ‘5GE.Ë9:∫¥◊åáÌK}∆™ú	’,yÕ$PÃÓ˙Z°pC«´á¢eÛÑIΩì1£…!ßh™”Rπ≥∞◊N—ä”®/5@ã}A´Îmﬁr¥^rê≈1Ãú5íZå%ÒfCŸ˘4WÿÀ¯ï	¶À·nã8¿HpàÚï]‡E>PMü+í _´&F rñœmâ∞Sk†©Ìòhb:U&÷V’¶zv+®ZäŸ°a{`Éc8C≥øNÜT°!YÕïı¢˙neûFÇ”\1V∏†rÇ∂¥‰í¬ÀÈπ_ôèöq‘Ÿ°√;t»ÆÔîkü£d‘¡3\‚ç$RFk‡•ß®}‡.Û{Ãv]„MùqÕ*⁄ ‘Kÿ8K›†]Ô|€˙´>nNÉ¶àj)f¥~%∑lp˛ Á¿Â‡£ΩØ”±qãHóÚå”≥xX≈Bä†:«fÍ`ém´9áù!ó¬ñGgpE⁄∏ŒÂE«ÿY5}/c_Tø£æL"Ûa£∑uôˆÜÏgæcé'“ˇNñ3≤è;≤E◊e"ª=wtn√èÍ2w°ﬁuOíPF]-|∞:<‚€Áv€Ò«,	=æˇÓˇØ”Fwè¸}G€Ä&W·ÑtC2AßC«Gπ*xÊ≈Aó–ˇoÜsüåÛàp©≠KÎ»«uı·”ø
ˇ*w*‹æ6ıÊ"	Ø…∆Ùúz“ºBÁp&◊;dAwÉ3D{ä;ÑãPé√(8‡ó˛O…"éÇE⁄eÜz/híÕÁ<∑
*^#Q¥ö ¡¬ÜÁÚLà¯üÔÁ9…>Ôì«É˝˚‰…‡`m∑ÙI*w®–#∑V>3]Ê¥∞6	‰MòTzAΩˆ˘Î≈¥
Î@Qö ∫·¬tEÛ˝qóTî…Æ(4x
*¿_][‡T|∑ÿì]´≥Ä√Â=‡r≈Ø3†ŒbÖï±?ók©™ÑÓﬁ¢æºM¨{37ù7ªÄ·Qì«•€I#ÑbÑEW0óoF5".hTÉî„≈3»º∞{¶^N¸ªêk,ôPò˘~ßVnÛAx~ìÿ˚Ç"Ù=Fêÿ«4Œºú7äp‰éª´€(ùüu}“Ì9Gƒ¨∫$∫UìDÀ+´^VÅìS^Oª…¢F‘Mk¬ﬁîÅıÖÙ2Dyemu´Ä¨˘˛ª?¸›J•’Ÿ~l–2Ü›z£‘4jåWFã&„ËÒ[qDJ€éHLieNƒıõßë˛'‚Ó û*˝AıHππ‚ï†ßñ´Xu˝¥<‚N2ïW·Í«£œ›OJø}ElQ]K˜.WülµGë∫IÎ¸w»¡…	ôØTx¯µ˙≥î«üb®À˚ jG÷‹S+t	|T…Z„ñ¶ìÉEﬁœWAóHÀ›ì{
.·#Ëˆ"ûÂ◊h,kSä:JC˜P˘¢Â€áÃMYê≤,î~•^ì¢4Oöı“–ñÓ´£˜§≥•]ﬁ
6{Î%7‰O˚ØD øvøœ|JÔ ¸«Â ÀÏv%7[í›å»Öh˝*’é¡Gl“íõ6∆iıØñX´ñkf€Æãk5ˇD›(ı≥ö•ŸB;˘&©…îj…Êà[DqJ^ ›„~A˚—•3ı„Y´N6ıÓàÚ)Ó«’"⁄&B∂7€±Ò‹]±Çú¶	XJ“:x§~“øˇÓ˜ˇçÏ≥ÿÉINhL…=Ú9ùß.û‘ú&Ï∏“v3À·lt»√∂Ö‹…ê:Î…2q_dÏGìπÖ>Ââ”HèÌ~J›˜‹ÛW	:¬{Ëv£‘¢°=
l˝ø-è{◊'1÷0’*ÏˇÄnúfo2„’⁄áªÇ5oÑü⁄B}Lö0Gï{üK‚+&æÏJ
√Ë]/¢·G/˝ˆY8Ò05;©J$Ë‘≠
ÍíçCít¡…Í∫->Lk®^Ê÷*Òi˚|’‹oäﬁ I4æÍî]XäE∏¥V,O¥•ÇÜeM0l1ıt’€Ï˘Mõáa!`≥ÀÒTîoñëÍA«t,.ÓßØ_~Ò≈x¯Ri]Î∏ì3à=Jº!ÇπGbWãã	€›è;/N˛‹EÛ+LÃßÙÛv1ë—`™≈ÄS-.Æ0.¡¡“™·
~ÀiÆµˇ§ lÈæ]›ÁÆÕa‡yÈí%’}3≠n+-πëÏÓn!‹ˆfñÚEs1l˚MoKÅMÙ∞Ns7õ(æ=‹&ü3P˙∆ŸúÕ,ñ‰
‘¿êºÒÊ¥√Ë@ÀÄ
 kHJRzÓ!ƒØ®_œ–yB¬ÍöpÏ6#{&h…ﬂÖ{)ˇ“€∞˘™IÀÁÂ#?F_PÈV¨æD»v‡ù££—êú˜Å˜_æ¶ﬂ™÷sÍO£ñ;…A›{j≤≥è∑u&Ûdßñﬂ]vptwúï˚l˙‘2_dÔ)±§SÍò=-wñ„Èd…SÚÕIÅkæ`!⁄a´Áe¬ò⁄Eÿ.iràKÑol˛Q(©Úf‘∑oÄ∂àaóz^:õ∆ÙÇ˙2ÖyÏıÂ\Z∑®yj,NïŒÂ Àé¿‰Z]ÛÆ–.7œ‡©.i¯2.√’8ﬂ|∑ÔÊy3Äèﬂ…z0ãÿLt¡¥˜XlYL‘…oäPsÙ%˛£Ò‰€º2\Ï)ö_à8‹‰Ä±∞	πWà'~tN∏áÑﬁà“f˚$Ñ⁄Mr#Ò	7Ø◊¸%l≥¡ƒ˘Ú±Hc€JÜ,¢HïcvAﬂxcôÇÅÀë_“ÙÖë»’`X,”]•k‚J`M`¿⁄lıˆv”=Iwïñ_Ìõ•∫€BQî!Œ¿Jp'Ïb°KZ*≤¬vÕGÃ)J√-∂≈åÛ–©W]s∞˛:t∏=w⁄√…±G˙º+w⁄E˜I<E3˝|EmœúfÊ(rËÿi∏6⁄„∏Æªôˆ$@ü› bï5‹¡@ Yp BÁöH∫ 	— AµûoÔ¥GKbÖ‰≈Õ§%"sÈîíÿª†W4-å¿xL¶äº∏Â˙s…ÚÁñY˝ká>≠ØØ/kT^¡Ó„c±?Ù[óÅÄhòˆ˚4∑‰ç◊ØHB˘óh"Å±"™ªMÑ–"/ÿbÏ iëó 6o9·†˚™S3ÆÜMhÊvÓÅÂ`#¨h ’f7¯	gﬂu–ù≤aÍ˚lWÔ0:Œç¡∑Õø ±u‡Ù≤A«(ÙºTÅUöÈ˝∞'õ%ﬁ¥î◊oÓ?ÓëQ7Úsß˙DÇ∏∞Ä≈‘ü2n˛7∞‡Ü`ûˇ≤’=sÙn£ª‘{k÷EM]Vc˚“J'^Yªøióø©ùŸ•=-yf„.Ô∞·‰Tã˚ñÂd‰vª&¯9ﬁ5t´µöÂI
(«dÊ±∑”uü^-oÔœ√(,bñ†ïÏœ±è˚lLÆΩ~ˇ›ø˝ØÔÄ≤ÊúçΩ7(Ûj«˘_Ëü˜œ≤hüQqÛ˝wˇ_zÆ¥Â¿°?àò4˜EuU»ü^1ëÔ∆ôZ[ IË≠tiâÃËÀgEÔh≥mñÑ•ØÿÑyãÙ4:∂ïˆª∂ :[#Y,:«a2Âû?∞£ªWï¬ÂnSÆÏ⁄“M«∞D>k|≤é¶]É	Ï)¨9à≈¨∆s’wûπé}v‘ÀK:¢Ht/ømßoK4J”cœíŸ˛Ë˛ÿa§]∏F≈¢"ê„	&∫$∞ÅÁ]»CÁÛk:é”ï0˝ÁƒT≤p⁄•“∂¡]SeL»§“Õ±ÓU`~ırØ∑ÆÇ7›∫«	{´Ó 9DVÎ·Ö‘â‰πz'Ê&Î,¡#n√%Z|bF√©œZ -ø·™è˙ß≥æíepÔ¶àûRÁ
TKî%Y)æ1j5Úq€Äﬂºt›V"j∑"V9ÖÔñ•;5pÈ-ãõ-®“¸;ï_ ÎÎE!‡∞º÷:öÚ-™‘mCﬁ
>'/ú¡◊ª#GWI°}“YZ»°RNËSy”ΩTOTCÍå¶ÄÂ‡X–;ùDˆ;øy5‚Í-÷[â¨´Zó[o'∏ÆLtÌ,ºv¡∑‡OﬂJÿïË•ÉzÕ¢Ù›∂yBòe‹Çµ≠äwu„\˚ËüiÛghñ%D◊’?]Æ?¯´m÷´£óÜ¢Úàé¢|‡V·3Œ?4Ü“zjo#àpã≠◊æáZ≈g◊O«ª‰À(`qø)°À^Ω>$¿{Ë9ûkæ%◊tx!Tö…LVˇ]p§Ω&∆¡^ŸçZáΩN ıü^_È◊≥K6Ô¯wkßyö%NAÌŸ-˛ÏfÛQU*D‹Èôî-øó“ª¢Ú¢˙z¥›~Ä™J¥ Å+k1]h‚ì‘>ø{≥-Õ¨ÙW—Æ1,•àõ‡n2úg!©Ïë˛pú0†dÌS∑∑1{†ËT€9=˜^©Å@´Q·⁄#4 –û˘à òajª`Ïqg≠Ï‹úw.”L•£#é!ãQ≈ äÇà˙ ét§ÿå¥}}´/Wcú∏°S®“jjqõ∏≠Tˆ>ªƒËıSj0ãì~qT’7Tu¶¯@0EÓ±q”©=§— &gqw%»)·€îQø…"8 •*'∏´<v¡îPûﬂa7¡€¥¡ìùDÄ<˙ÿ0π=IJÍz]Ñ~DßyÍ©7ö¥D\„ˇléx µCp0˙À5}6>˜\ŸB´Öa˙éÇ ⁄„}Au˘’¬‘íœã ü≈qõ4ÜfÖë–,UNbˆ÷c≤Ê!®”˝Ø´¸(©Â´˚iú1e•ÿicÁ1ô|[W∞_ﬁÛ∆v‹ŒØ∏ô¸(s‹—bnoΩ£SL™8ÂäRG~≈»3¡òŒ6^√?µ!°Ìö&u§yÈ!È`ÓÏ%IÔÏ€I´CcËóvœh Ã¸,9‚âœ ¸z-N\˙ÄkàÆŸvmxûKãGjWÆOIèœ>¶ˇä1x´≤j›‘rÈ∂[Y±}g
£¨œmçÔR“ Q6º¥∞1ÕdÎ ºÂñ‚3ö˘©ŒX¡I“êÎ¡œ#@ß'G¸È ªêR|ÆAAïè üq¥Ê∂©>ò≤˙îLé\…|¥TΩ=ÚHYIo.™MLÔò'›°ÖÀ`àKÍ°–ÔìGdNc:áM˛ëém)ó‰å˙ânMÚ‘DöTºÍYO„+ÌXpEZ«√d)√
9r^√lYVEêS[` y}≥yß’=≥	«fcÀ†c‹ØÂ_6≥PY„•√”âUÚ?mırãÓ÷è√∑ﬂ$’g^»¨Nà…¸uÏã˙#¸h~ﬁà
l4|·>Ä5µUƒ¡“˘ﬁ~€[¶ÂU%Ö˝»b√≥f‚Ü>!ÀµôtmøNòΩuí—∆ﬁÂC,u¿u=¡‡Ø‘˛¶˚≈⁄Iq¨bv´c]Øo1w/sª√Â°˙öÎt9sfC¯ùü™pZ#*2n¬¸±≤ÕBæ√HíaBj‡À:ßÅ£óâòrü¯∑0/S ˆ™œßöüì	M'3‡–qÏ*éú≤¯»@GÍ#2öÑ@‡÷íî|Ù9Ωå–QFQç≈¶‹j¿_*Do•™`Ö[“)P◊ßcÊ∑Tù¶ñÛ»êÛnìÁ PŒÈ¢r∞4ˆr˛>M_nó<fùy1”≈™‘ÜÀG„åå@ƒ"Cê\ÈÏ>≠ühDeˆúwI˛π¨≥LŒKë.\ÌYÀ˘≠…˛∏∑ÿ» éêëıd·EïÓ	¿?ºÌπ_ÿô•UÅÔW˛Y}ÒÙ°Ì—OCAßˆ∂f¡ÎªÓœ¢‚˚€§;?’MZÁÁ—πßˆË˘–∂%ZC)ßöüPámôè–uWj≈π[ÛˆL¢O}◊°ﬁ◊c∆á’ﬂ¯´‰óÁ˜IØgà_”]Qˇ|4rªwqc1ËCÈ≈É0ÙçG∫#a=SÀp¶∏qjÑ∆)àç£ÅÀß§◊Ö¢˛∆4ô≠ùÜº"ª8Ω∏ÇÂOì_h:r€”ù´n∂˛Ù˙£÷ÄuSS=ˆz]ƒ}˛¯%û∏ÂÖåÎM“~XπˆBœ‰O≥[…‹&Í∂≠é∫˙∫°VUÆˆveüyΩ˜,¶ƒ◊9ÿ™˛Q‹®u "™„d ªjI"P∏pm<ŒÅvÙª¥*\‘≠ò ø8éí’‹7o®‹Ü)KAo	X¿b±°|ıúE1HÿŸ˘YOΩ3ôu~mù‡v/∂ß∂¡|€
>hŸ«ÉªL@;∫Ët-àûrˇ}∞r–s/úì◊·4„¡¯«÷ùùs∏Á˛ÎWœ◊LÑ\ÿPBNÛæÑxªeJ“ˇjëÄÆO}«7‹ñàg±Ø#\Jlñ¶ãdwcc{oŸ˙yù˚l}gûœ6÷◊◊IüOhÓ-°eVÚ«çx]iØÙS‘mØÉ‹˙§'s ‹VeƒÖ*∆¢àÒX1Ç‰i˜Òü˛È_˛„èˇPÈùNË–x/Æ)o”xs“Ó⁄y∏ïxnM¯v3“{âqˇ›ﬂˇ◊Z7W2n%Mî	>»Büø¢#/\mNô¬&Ìî>ÜS¯≠÷è.Ø_#®ß≤FØÆF¯·lØÙ£Ü≈⁄àn=âÊë<ZÍlr|÷Â±3Œºò˜Ñ{$Ë:[∆∆xuc±TN˝ìVï¸~ßÌŒæÏr<V-á¡∑’û˛[∑fÕY1“Œ√µµUs|…Ûü%/4d·“Ú·A•ë·º ~Ïïﬁ- ,ˆnÃ<_ø„t…7ê—j|±ﬂJwoüÅhî§$:´9Hq‰„ÆRè©äTÄÄ+wÅ⁄ÍÍÖ6ûƒ‡˝T™(Ím îö–ß,7ÅäïQ;*9 16º ö˛ËÖ|"]/’`»◊π≥g‚ÜÊ’f∂[€-ï’ 7h;¸˙tM{_ƒtöÒƒ&†S…,zäÖ+¯Å·¸äc*`,™´≤ÄrÍ◊πÎÊ»ﬁ∫ñY—©Í∂dà≥1°ﬁY»—:C?@
©üŒ»‹ãK„F»ùÁ“ø]Ø˙âKË‚í¢·‘ﬁYﬂ”À6⁄ËR-@Ê%»‘/∑‚íÁ™îG∂ïO9•fÔÁç⁄–˚ˆ“XáÜ©ﬂÿÆ	.ç»Ö™—AKºD†-πöÏ~Ì<
ÑD;È=´^î⁄±ı-uBéíéô^H-∞Q∑ÈQÔYqÅÅƒˆùn8áÉÚ,J˚≠héW≥¬J:CJ÷ëåc¨∞éh7ã Ì|pê∫Yå(u&¸9;öe∂Á
ˆbô‡ky#M”åÚ4©µú-pt¶˚§ €a„‹r∑in»ìÍfü™ñ£√]"Ÿ•/ŒËÿ&wÎ2ÀÈµ∆ùa†V:îû}€Çä:>H»,fgOã±πG£÷”ﬁÔ∆>ÁÓëæ1Ûüˆ¬(Z`¬A+ÀŒXwâ6%≠(OO”µìG?££˝ke<ÓÅƒU£≠ÎnP◊àbßxbí‡ Ã·Èl&èŒ‡é≠SaCjl¶˜h	058Bm“öFæ'∫#
<GEWEÉo5„
|–∆≠C'ûÖÃ,>´Ë∑ÀÓpNˇ„§•’öÓ !”:fI»ªÑ•ü5ç3}ŒÁú·(™.wRPËZ∑tá™nıÆ≠n*ïÌ‘µç‚fπgvçWT3?G-◊6±9ñ»Aﬁ∏àQ†‘’·§î\OûÍ¢z#Xæa˙‘ûaù´Cﬂ√ú[Æ65°úäjúJb$ûª‘Î„˜e ù·qÌ2â¬3/∂ƒN’À7CÙxüëa8≈w†‹˜Ï·˘å.≤D‹±WÃL:∆ßEºÉ'¿d≤p˝wDW◊.HM›bUEÑæ2üπÜæ4ãÖâÊïHòzs›ã8ôÔÇS‘	°àwﬁ´[ƒI≥Ù~Sz6çÛ`î©«∑ú-Ó§Y:¬1-â‡Â~“,]¬Qö•
ÀOb5Ïg»]t≤sPÎrØZwÊ.-Ê\ @÷°›Xs£r˘›á¿òOcöÃ∂óeÕ_‚ˆºﬁº"ç‘ÜπµfPé-8ZF-ìGÖ”≥z$äÍŒ‡X£l¸ÜMR"—G6æ»‚åº†Êw¡»JD+øKE+?>®¨ˇ  ˇˇÏ}[s…ïÊ_…∆z-–MÄW›hI •V≥)RlÇZá≠—X†DñQ∏∏.¢hö˚∂Û∞≥ﬁÔÉ#1O~ÿ}‹àyﬂ“`¸ˆúÃ¨™¨™ºUÑH5j∆-®  À…sœÔ,°≤H	*ãìJ‰êc@ø£≈ëõªá‰Á‰˚8êf. 8ﬁ≥„¯–rŒ<Yo%ç•1…3/Ù¯0‡ÅQ/!æƒa¿`lü|Å8Z|;/a¥“˘Æ£%“ª£ïÆ˛Ekâ¢ïC—∫mˆô,¡Hvß	Jg2Óƒ—‰%Fª@∫q,·æ:õª Ωù˙4ÕÈZkÿÎ*v}G¢u∆{Ö`î†∏y!yƒd≤@JÜG•7ÒµV°ï˘na¨€õÊ©!Ó√hP—(¥0LΩ}ÆÎ∑‚Ñ54¬}¯GÄ °„DŸhp∑¢RÒÃ
À,åΩÆÇ"©
n…‹ì&"Só§˜†ˇ}WëP»¯}¬L»ÎÑö©∆O	˘ÄNÂÿ:—ùòÏpb^X√'fkaÇOVm	üX>Ò´ëÖ£í?˛Qw'_Qªõì¯-ø[z´≠HÍ∫£ÿSﬁüå≠tÏÌqü•Ñ~f§ƒ%>•§≠€ÇOY‰B∂(ï˘ÁÍbUÊ[±B¨,v¯ˆ„Vrˇ á≤c,1+ıù◊`VfbÌŒÉÎ©0+E+ËsbVŒ∫…e≠|f¸ ÍõQΩT llnËn"Y
Í„…râdπD≤úíe∂±‰Øªeplª”aõ|◊&ùÛë3 ﬂ:ÒºUr∏D≥¸¬Ä¡¢qœ&ÅWäPSJΩÄñ–u›oCgïÏwV…Ò˜ØV…¿= L¨\®Q√ªË\_…ﬁAlKôË‰°ø©}xK|ÀüŒˆ¿ŒQè±º%Ωo6tK⁄ƒ¸¿-≠úÿx!ƒeEpKÓ8˛|–ñï`*≠gBVyÜ∫!Â`ï©- #¬‰oH±wHjúV‹Å?9ƒ 4f©¨‰€≥^•Å2…Ïö eùÕX≤R©>!ﬁ˚Eã2√ú§ñÛPˆûÑ`ì(∏R⁄˜Tõ]äKrkïì%‡dΩh	8˘πÕœ%‡§Ìp¬ÄìE	≥Ñù\¬N“k	;˘πa'ïØWÓ]%*e-}a¡`ïbJ⁄ÕÇU!mœFï±Â9e%!#dÀm¨k°Áp ≈SO9R≠D©‚J°≥§Èt-“ÈîÇ,üåñs-SD{“º
Û)ÿ<GGEÜ*W¥ä85*è¸≈ïë1iÄ1’áÉTÌ¨£úbk”J⁄çû¢¯jîM£t≈ÛjtLÈ·≤ú∆™1:2TMGu‰-J@R+#P*åÍç2Êô¶áŸÒ∑ë3é<1œ‡6sXõ‘t=chú ¶∫¥ﬂ6ÕÑwh39Th 6b¿ö’ë3e≤øê≤+xQ¥ DOÙgïI	%ÿ$*,[≥BifÌ‰â~ññ}˝6Úòa	‡»mC≠îŸ√©äÇZß¥,Úr
kFv∞ñ⁄ﬂ	Ω#<D$f[Å]UÅø2í1<(±ï≤ˇ±%xNè-j¶ Åıaﬂ[öiE$l¨A3°Õ/43€4s	öi∫©:bé® ,⁄TE‘LAg*EﬁÕ`°]kfÍ≥Uƒâª)ÑÃº~ë·ÊeÄôÇÜnÉå	√∫IdLπ>4IÙ•¢d]FM*ﬁjaerı†2Ã$OÆ æ6N¶@\«…LE¯Ìƒ…L}Z÷òóòôÀÛˆlÙªåè)xtñZﬂ|Q@òUŒ”/·|MÖßH;≥pß?OÜcq•xÕàt)ûPë”Ã^Z_)^w)≥G˘Z¬eÊÆ%\f·Z¬eÍ\´_\fÛárÏ\",fHˆú`j—1ŸCø˝}pã01À—‚§XïLçsâÚùÎ‡~_£`dwÚ©±ÆkŒ„pB◊§`óÍ·Ñ£˙9ò\( -Ô+ÒU–\ã≠Æ©`N*˚…˛»9s˜˚Juªÿ^ß9eíã1çAT®∏ÁYè‰[X¡«∫.Í ¶1¶€¡ıúKÖü.déS9˙ß*DkãˇI»û9C
Ã9H`áI∑BÏœ>ÙE\£9Ò4ñO'NﬁGo;~õL.6”…Rt¨i6‘æóó,lvèè◊ÄƒX¨pÉß˛dàyÒ.ÙÃPO0 Ë˚ˆ‰L°YbÖW2É∂ãE‹¶¡‰(él\à?Ê«	˚¬ú}Ïåù∂≤@≠4H´JhQn1
B+â]ÑÁÅ7∂‰N?ù…h6-}?Ã™Å6O'«–ôà<%ú˝Ümò7Ëk≥ÏI÷à∆¯x3lè‚à÷Í|é±q‡‡˘o|úØÄ◊ﬂªá89¯ù8 Ó˘Á¸©#*Óa3°w1ﬁÖ0Ô±‹[—h|Iœ_≈~å¿ñ›ÒvS/ËMŒ¯ûPêM4≈{±¬¡^’VM]·Æî|Æµø‚ã˙C¿n6b·R\´Á‰Æø’˜}ËDÿ,ı%wºåıÃ‹5Où<s≥=≥ZZ‰Gª$ÈªË≠ﬂ“Ω∆ÙT¥M√Wêùvú≤7ÊõPç•Ho∞I≤°™ûº^iÉô5õŒ*ÈQ>‚P™j˚ƒn›õå¶N‡6{Ã;¨Ï ÓÅKÂ2µtæxº\3+çS
ÍÄKL2A¡è©x}.*}gDÜ∞¿s„ã¨X∞ÉÚQÁ|0Œ©rÊT⁄áã+à:4üqbTòÚ∆Ú¡ëmŒ£†#¡ó=–"¡∂Ô|√Èù
ÎOY¶ë`ªÊ! 3lH˛))3'Å∑≈˘UŸ©OË4"‚µÁ◊êvÀT¨ÉDRQ†öp+·ª,Ü?ª ûMW∆5≈±ï@Æ$¯Ê,îmƒÚÕˆœrçÃ¬y6Ò\W@œ&¢Îi*¶ôHU	#›yEjøVOÀ÷Ñœf≥}≤”+â}Îçœˆ&>ñZ˜>∫?(Œê’0ô“2K´ii5Òki5-≠¶‰∫5VS¬®nƒpJ›Üâ’„±˜œe5©Õ¶Ári†èË√s‚Õßì»ÒÂìj€ƒq090
æÆÇ§Nˆƒº)∞◊±{AæÔ˛∆õ™)L,¥x†”}0¨>¡SÎÜ∂—xˆ É¥BR Ω·ŸS"ü≠ç≤∂F“C3Œxê9†≥å¢„õ0zÜîTaË`LÛäj
;§—Û'Ωl)„;w«Õ&ÃMC¥J†IÅ1ñ(L˙1Ü∑⁄}äy˙¬ß5‡ö«úÌ≈⁄âºëFŒ(Yqî˘Fıò2Ï˝ÓÎnÑ@%6∑á†‚∏ÕıU≤±nŸ1 3ªÒáﬁ'ã‘=6>N±I(ú˘oi©\õ'v»{zÔo1m®¸ˆÎ˜¶q‚∂ô*˜˛áìﬂRùˆ∑áNË¯–Æ0◊g∫V◊m Jªˆ1ﬂ⁄~sÚäì»köâßDg’NuTs2âÜ›Ÿ§Aòvm2‡QÀ≠2Ò›∂À@HÃù<={ß±J∞1”∞òXíU‹ëbåÁ, YÇh#:C€4`'„5Û,ô≠1]°ÉJƒ©ô9Ì[ëø3)Vë;öÓ9„èN®aS}zÉn¬~8¡©v√⁄“©Ÿu9C|t®íÍn”ì÷Ö7àŒw»ˆ˙∫>=i‰gﬁn‘ﬂFèeÌ…y‡C,ˇa˝√∆√M«òÂ„˘tºˇΩ˜këÿµ?6Èˆ≤ÿêˇü›[mÁ≤áårC œØø∂ÿÉRÌHl≈¯JQõ13G”ŒƒK≥;ÒEfo2˛‹à∞ΩC¢	¡dÖ€T±q¶S˛Å/©ÍFö	oöå˝K=sÂ˙ô9ò1˛TÿN∞˚∞∞ åÜáIk”ÒôâÀ±ÊX◊i‰¨Ì…—0]kˇàÏ–7˛æÚó¨µ’5Â7fg]Gµê¬|>-	zf–]Øe_ 7πnCBƒ6:j‹f“¯™0C´‰äˇµC–6†|^ﬂ—
?z«
ë†ÇL‚®)>(u˜W~â§˘≠¢ﬁÂ~r˚1:êHœÌ;qËí^0π1ÉÇ?∞#«˜@JﬁŸô∏ßÄ}Û/Î1"eÁØï≥h≥}ç1¨´˜Y´JÄ©j‘—Ä¸L≈6GÂ\Å∂´Ç'∫ü%ié'ˆtr·¶A0Ñ”ÇhV+◊&DÒí[ra<Y!ZﬁıJﬁ°Î˜≤ïS’l«‚o*œØf!ﬁü≈Ùÿê£M–˙%€yMøË∏^yØYä˜êP[U‘&4øÇÌ€∏ù™ Ò™â¬´f4äˆ“&"ÖW•®} u/Z‹,ÿù§MªÌ®ça.:Üª2h;OÄuÏ,◊∑ZÒ3⁄BÕöÍÌˆq4ºÍ«“2≈”Ë=<p&eèv°≥Ú/ÍîÓ¬∑¥–#ùóêúN&~œ	,¥J&G°¬‰/Õ1äZNAz∫9ü∫º!=Áå=‚3]ÓHπ+®Ç»ÉÂ…ì≈„‹NÃò8¬3¯†=µ.[Î3∂·ü©OkúJz3±ﬂ¢UC¿i3ÙÑè"+©¿‚T.∞`’KüGWuèŸE‘•êQåäpt¥ﬂm∑‡æIµ¿cî°”öj7ˇ†¶jâñÁ1ÇS≠Gz|U96™RL·fî0´e hÀ0ÉuYìÎ=Ú⁄üÖŸ‘`èZ`8Íèà¬Ÿíi4lêm%;'@ánù@±u
`*•ì¬©&Y:∏dŒ€Rü0˙Ò/ˇS¡I’ß‘Áb§¸âI? ì)ÍôJv%ÁL.*èV[NÙbWﬂw¬”µ7üXˇ˘ˆÌª˙Y~ì)5ãŸÑSç‰+¢Jdçúz=Ycw*`q„±˜˚ÿ•Ìr»©æØÖúJﬁL!•˙˛u≤ÊQ}^åu
ÔQµ™Ì¶¸∞àJâJ-¬(Å˚^ä»WX|yüú5BWô∂r·Õ@èÁÇôOâ5Õ\< ÛLy2Oı:QrveáMFìÄÏÉÕ6‰≤≥	b≤¨ΩW<>ó˚Y…s7ÙŒ∆‰Á‰ÏNú&P~"åá∞r7x8Ã
˘Ù∂€Æx`Ü®vËò∞‰˛˛◊ˇ˙7L:s@˘M)]öWÇòÓ¬>b˛=≈%›SXP[Ú}˘ƒVÊ‰7C3KKA†é˚…d˝∂¿3>;sŒa»£=1≈G‡”Ùí–R!ÉÍÃQncÈÒCXÏ…àå<ﬂ¶g≥(¥Cõÿº6õ+iKÈ€ì˙Ùåÿ$œxgX!Ü~ÁªÁiﬂ•mÒé‡´WŸY6Z¢—B;n‰§GæB7àú42®§–âj+æÉ8Ö`ÑXHõ&≠ ãè±*;7\¸©Í°±L’Ê¨ò…`@7∑\ô¢0l0¢ABÎ˚ÿ‘â˚A.kú~ﬂùFOy¯· √g\-Åæª'4ˇfän9£¬ìÂäµlÊyZN6mÓüˇ&â¿W;Rë1-jyΩìU◊≤bôJâ≠”û?â≠}±Ïëåiæ§,®f
Uÿ?üL¸}‘eΩËÚõˆîùii!Ê#·wÎ&æºZQê∏!è‰∞±æ^ kòî¿R±W…û*`4®ó?á êÆ]º¯äPø÷	F+0IáÓGœΩ@uŒÎ;—ƒ∆«%⁄Âe6ÓÁ÷	É®ı£≤î_X^‰)¢gÅDJ0PSkc3W0Nå&…∫æµ.;6U@∞KÑM¡û$N∑Ï,÷XÅ°gµïÎﬁËLAia–Zh[÷¥≈Ó‰6Ó9˚gB”±`Ò>™1A$ﬂÈy<ÍçA¡®PvGÉ‹≠√§ïBØÈ‡Õy…ºä˛d€ß¿¶ziAcµs *‘˘û?Èƒ5‚§⁄≥\!Ö=dßÓµ}G}j≈Ü<ì¸i¸˝Ø˝◊LŒpUìöU§≥É˝èˇãV*”|°¯3
Û\%6’lıÕêö-Ï‘*Sÿﬁ0˜Aì≈Lm‡ÁﬁñF
Z-¬'¿(ÿﬁ⁄ê6◊dhñYÎéú 5£µÉ”„Õ‘>	£`˙≤a°πàCÖ*I˙—Í˝§?"ˇÔœ‰˛Í÷„GYEﬁÙµÚv‰j∫|"g5Ï_båd‡ÖS¥!&®6ñ‰ŒUSûr-Ñ⁄‹JÁäÏ"øïbΩöËÆEhs.GW‘°÷˘˜†“≥ä{÷ât™O@’â\VçUV>^RxÛ9Öîæ…§ﬂL-PsTØªRHQUŸÃ–›æˇéñXQ„v3≈y{ΩPê¶ Kœw˙√BΩ@%„îPÌãU^uM}5”ÃÕ´Å"do“s∏≈Ù=6\:πc`ì|I„í<¿2Dø∑¢-t¸»K´Ë+Öø.mßR‚ßíÇ´«7âVäïóÅ∫∫J6/bA9Ç&˝gm\¸ÒBùª‰»C™	(÷—”Ïi£¯·hø´@ŸƒÔc7êß˘1÷˜˚‡îùzüO±T§W≤áò≈údru·ïæ˚C`<d4«tuÎduõTu6Íﬂu)Yv˘ÈVŸÈVπÈï2”´‰•kÚ=5?Yf§[Á£WœF7ßzÎ <Áqƒ´t∫®b≤≤xzh¶Tpª„C ’T•Â*íz5rØ'EGÒ‚ıvÿ$ÈÍ©ÿ+˜Û∏™I†pK–*ﬁnn£@õ∂Ó·2ˆTñ˘[p¿‚Äû–œ‹*©®;á<§"3u¢Î*∆©”îL¶§˘+6~–ŒËòVI4ô Í"
Õ`ﬂç@Ú“Ç^*Áªä¬Ø5Bgg‰ˇ:•òùLEﬂRÍtíó€‡ÌR¥zCÖç)πdæ§lL»æ‘ÑﬂE"0ùT49û@Â1ûèLj÷O`_b9õñ]-∂ÆÚVÌª‚è[ó«HvÇz}ß∏ætëSLU}‡´J7xΩ(o‹∫0∂&€ì≥âaOûò	/)Ò¡;l •)ÈΩ¬uY÷Êúlé7®Îx=s{é#ÙK•ìm—^mjƒÀàˆl";vï}‚…¿ÑlêÅ…”-gdM•Í›EÛãáÎSñ≈sñË?…s∂’|éﬁòáiÉJm¨¥Tú,æRﬂ-=Sbë-…… c∞}?sYÌ‘«¨43´Â°⁄)yL^œæè0#wgWiì“sbπÂx5∫á«‰∞sØs≤ˇ-,9Ó=Ôtéî0G¬(“<
wIlÊá≤9O‹(k_äãî§âÃ6Wa‹;gçZœÿÓãìŒ¡wØ:‰Õ´˝˘Ò?ˇ+ÅÔˆ_æI>üºËûv∫˚V”®,Ùö›b$|ã[§º|”Çô[±r#◊‘ÓMÆåè+ıf◊|˘˜‹€¿ªm8∑ño;£h˜k1mˆÏEròém≥'ÂGä◊èˇÁøÕN∏Z~mR 4«ìS£`∞∂»Æª‰Á‰eÄ∫◊K~&Pk»t)ò¶¬ë¬?SÿÉˆÈåÙúÏD!‹ fc ¢ÂZ%µµ-•©$¶Ãp¨n≤Èîƒ¡Gw òG$…Û“MEy2“|¯$å,j¥DL∆:R^€Nçîµ∑ÎÌıÌwYàûÁ™˙qÄn]…ìÜ"√IÀ+PåwHÁ#ÕÈ˚†–k<åÓı¡*Ωæ‚ùça∞xùÕ/¸q·EÁ<7.\˚·§‚∞Û∆≠©¸&!•ªåÈoÎ6K˘¬6ÚÖÌB™oŒ∆Áv2„õ	e€3Kgì¨Ly~4À	LDŸù|z⁄X'Îds˛ø"œªΩâ‹Î<˘êÌÅµ«-Ãßû∆∂áﬁD”36:éÉDı¥q∏±I66˚õÌÕ›6¿√«œvH?µ∂Ÿˇˆa~ÿ˛√f£[¯¡C≤ﬁzølm√?€7œ7|lmˆ◊Ò∑≠˚Ì≠-h„Qk˚≥˘dñƒJq®DèÇUÒXñî¸∏?nØ„˘âv~BQ-ÙA™fíJ°Ê5¿ú‚à±±t∑â1±√y-`AèﬂJ(·‘È„a¨H`§ÍÓÒ1¶ßwvﬂΩÏë”7Gù˝ŸT1ÛîSNM;øCû3^UÉQ·Ò©3Æ¿¢(Û6¸uê
ë¬¶≤‡“ºüár+J\hy ∆Mò©hÕu;ÊΩdSAo™¬–∏F∂YréÏIœ(N ≥
&$/	nÏhÍ~v‹ ™|πy>+5g3≥∂lÍÓP‹~w~W FÀ’ñèçS¡æ.≈æ¥|.†≥\ÚÚu‚UÁÜ]¥Î‰-YŸlx’◊òAÕoïç7§Â	ã‚Ú‡œ‰˙WVÔã%Ä1ó›Âˆjˇ:πÇJ5úT#…¢iT∫¸Ç,cùùE¥í∏ïàöãx,ßi&/ äïemÓ®E&vfE
Ú1›◊˘T∑µ€¥ˆòﬁùæ9 ªù_wN¨ÜUI;öR=X™ùı£Å}™∫Y„ FO∏ZÒ4«∏y∫÷^É8v˛líNèÙzMÖ…eÕV‚πˆ"…LüFeödRª‘;BX=V¬Œ~Ë{Cr’fŒãXíﬁ4¢
ΩoD8BiE16ªÌuS£Ù$ÓüKt√)≤#”mïû0‚Ãl—ÕB]Y˛Àvr¨P+V®ÁS0Q!¡à˘1ír∆çå≈eeˆXÖZ≥zÍO1ƒ@
˛¯øˇÀøˇ€?kâ€\ˆÜà!Ê(‘szÀ˜Ó;CDØD9§	ï<æü;kxßµPòÈ±ôIS∂∆1a¨£3—Çñj~î&O]€º)<}Ωí?}j]èó‹ﬂ!ØúÈœà¸úú∏CgÍE±èe?4Âx}ˆƒù®≈´Ø¿õåΩ˜p:B“•Zß‰T†R=∆”{B,C≈ã3ï7ﬂWˇÃ7ÓS¥√jH|\¬qFLö7&◊√ˆÁ	J–â&]Sw9Oâ/˘Iÿ&>Çà©‘55qŒ2øÏP≈V3ÇµÑ•l6Œi˙∏—HƒÂÓ¡‰Ä&'Ví÷˝ßÖx‹ÃT∆ËEöœ,Nˆ£S€Å|l
∂#bà>ñBtÜ#Õ±4©¸Oƒx®åuI@Î¨é¸©œ¨Á•áÍ¸∆û„ªÙ–?îºâr ›ÿﬂ—âíıCy÷K	•w√Ù ˜mÖ”ÈóI≤ŸñTKû|Î˘Óﬁπ6^él©∆0À¢ÿàóË˛í…6„ív…ì]'ÿm…h7)ÿ~áx‰Ö˝/ôxÈ¯ñÑk`∫Øo‹Ú·?wàr¡bqøhæÀ∏§]Ps}o⁄õ8¡@I¿ú+0‹ˇ˛◊?˝”hX¶c∞H‰ Lˆ–Å•⁄JlO∏ãŸûVxê™√Vç©|ıE‡Lc¥O¢·8 ß¬Ò˘;Ú˜Íí‘ên	W`Í∑‚éVîe{a19é¨IvØ¯∞å¨+sŒk=ƒ´|DÙf(dÛNÓÎE†ÿ2]H¢@ÌVAUŒÅNuVÖm∆ƒWú˙=4≈'Èù˚ÉfcäZm†∫4£z“XnE√„2ÿ`ÓÄÀé§úW<ˆPÙJK“@Öu,»†‚≤ñcÖO-‡¥Piäùö˜Ls.Õœâc‚Ô˝óø…„:üÛBHä◊öõNèop:8ó‰)ÈyæüBŒ(Ω·M
¢q®˜⁄!Cf¢Bc
/@ë°} oÍD˙ªÄ˝j˘/|ô<∆ TJLOs§Y;)®Jã≥ÇÔ.g…≈˘àH≈…ƒ–}ËP~b17ëan¢‹‹ÑqøÔÜ°azíS˘’gHxrŒì‘∆…5#xGnp*L0˚n≈r∆`å(ÒÁ€«Îuß””xÏx7%eå∂ÿ å¢)Ê⁄°ùOlµÅ'ü´√|U|‘p·ˆ˙S
’àp∆@∂ÕçúqÏ¯M	uM†v‡‚æ€l:˝˛*È3ê¶~ü|M˙mgÇ1Z%∆˙—…‚æ£ÜÙyWWª)ÀKj\£yµG	n~Õ›é5?AïÏËú[nÈŸöª=ÀõÓÈœπæÀMÕØE¨z‚k?EÒàDÃ∏Ó©
Åv€ó—Ì£∆"˚~‡˙±Ã°Ûxòq8∏,ËˇÓ0∆≤¥˜`Œ=Muª:}üƒ—∞gÈ˘ÅRÇy5:¥öpN·˚∫(/æñ–ö µ¿ﬁ2v#xGÆ˘¸;[Rh…&÷hè®•›Ø™Ã0Ê&a`ˆ¨üøº±¢Y6
ÿ«^’‘"ûv‡≈ﬁ@πÜ Ê;©›gQJ}ü6ö˛°ì√·l\ÓêF˜¯Xã¸∆OÔ pYØ=öå£ÛkÇ/]'∏~Ø{47±;≈ô÷=Ixl<¸£Ón∂#fæ74˜œÿè‹‹¨ù{ÿ¨07òø@úêëüOÇëö\ elØ6,Qo4wÍçÏ®7≤¢^¡∏∂$‡®2'å≈éä£ˆxπ‘Ùnt›àzÁ¨Z(sTÉò£*ƒU!fÌ]	13äõ/A£‰∏›Jhu˛^KÕª9Œˇ’ç±˛4n∑uzmzbˆãÊ¯4{bÆ;Dt¯%Ó¿∑Ìv[PfVâ¯7€¶πÔpóΩcò›j'a
Ê=v/zõN)i•}ÊFß°πZW˙cØ¯„L.ƒ√d¥©´\1˙T≥„—*±pc<›ˇ¥—o›O¬zdyôÑ√^|ÍªæfÁ°Ît«ﬁoJÚä≤˘6fèÓKılã˚¨ÃÈÈñ˜2‹psNÖ7‹õ◊·’7ñÇq¸5©Ô- ı]9Ÿ§iLP»tç)ËZ˝Hb*j^Õk<®Ó∏^Då6ÖqJ¥Ùõ;ùMOÉÂ¬≥/(!îk®sh*’Y/§C® É<ï_‰‰≈ÒÎìS“}≥{⁄Ÿ%;‰ygˇ’Ø…wùì˝ŒëÚ©RYs∆N°€ä:$Uûà/˝T+f¨QÌ*DCMq–Ÿ#† : ıÇûöpgµ@ßEàs.¡Môÿ≠,‘™˚ZEøN¡>Ç0∑ÿ¡<¸«2ì¢∂˜Ø^ÿo~Î§4≈Ê	ò[`.ﬁˇõZΩäæ˛ö^˛yˆ‘÷≥_ﬂß?èﬁZy√ŒÔY‹ﬁíﬁÅòM‘]“ù∫}Ã’ﬁs¸~Ï” *·[…æ(/∏ÖDÔˇ∞ÒyWqyX˘πky∏Îx:l}vﬁì_√÷á-we‘Ù[/ cm·´÷{©-˝”U<”ˆ>ÈYº—u¸–∂h;ﬂ≥…Î\≈ﬂlC|Çèôf_ŒYÖ©êàiN¬¨j~Ëﬂe•[Õ«¡Ω vÆpd◊‰Á&Áµù€˙Œ∞q≥c⁄f+›º3˙‹–ùnQÆgˆJËgÚBÜOãŸΩ#J-ﬂÏ`qHò/eæ=:˚ä›ºíT»YÊÂJê‚ÿÿß6◊RΩÒöÕ∑ˇ∏ÚÓÎïXYÛ§Œ¬¥dß™ƒöXCÙÌ∆;‡"o–ß*9*ØõFﬂ¢ÁB·ÿôÇH◊˜¢—=Íìóù”øÍ¸Z:-≤∑'ø>zµÙÇøî<)+WVê6¥ˇª†±jõAQã$%(Ÿ–ÿ;	≈î®®IÈ/«|îÎ¯ºÓ-kÍùj"Ö[‡uW)/ZÀâ¬π∞õX°1æE»◊O≈#kH|®ü<≥!ªìØ< YØUruçlÔƒÌ≥}¬6ÿ™0¢qåÖ~ôã˝IÆü…∂pÖb¥å!≈Y?tÍ“Pa^WÚ+o Î´Ü∑3÷GÍ∫°˜êÚ‹·úêã^i6¥H©µJŸ+}˝Zt>D&?ÓÏ?'ÕΩN˜ªµ√Œ—õŒ+upﬁÑ¸•(L?*ˆ∫TJ[πØì)π ˘(_DTvÆ6`]˜üÀuœ“yﬁfUô]˙¬õ¢¡"ã/ãLºÍßå„U5m\ÚF„˝V•∆T…∆kÖ◊—÷‹t}’ ⁄¢JL<Cè¬ ë˝±Wì¶ÙÄû?1√ï	THnû¡h≈’˘s˜/L·™ò.ÜWë´‹0ã∞;≠:ˆ9x£‚%Á“’diÓ»£OqÕ÷g‡—n¬¥òK≥˚‚Ùı	Y#®@ë˝£≈)O´3∑\@ÊÆ28¡o>”°vÕaœ•˛f‘KóÆÆ™êm©„Gùì˝¯H7’Î7ß7ø´ÇIËŒ≤•XXÚÀﬁSVg≈ÿ5Q ˜p—€*Czß(øö›≈ÔÑÌÖ∑.fá•Ω´ª≈^üv^Æâ7˜üüûté∫S«klØúO˙3Ï.a∆Yœ›ÅèÙ[MÌÊdõ‚zŒZöÊ'•ü≠èFNpI˛ì˚˘Œuê≤m˝l∏/Tr¬~1¡ï1Ñn¯ﬁXøTÔ•ª“Îƒ¬2{æá NHN]ﬂá·$.“‰f&∂wïFtJ1ŒïtqQ-#Ê;Dow\†Õ“«†Yz˝∆*°©ç?ü¡üòæ!¸NÆuÌik-Ã¿j$E¿∆¢∞z[¿âGQkÉåúO-‡∆æv…›@DÓ; và£*G≥Á»¿É∆GS'ÇOë3Í9:yr-0¡º%°^8‰[<Û»‘sâÜvj÷xÏh⁄„Iáih*ÚŒöÉ]Ìcﬂz˝(ÌÉzCMK•ƒ∂fÍïÂ√ıe
lÅÈQ¥lj.&}·sÜ>ﬂM˝÷ô∞¥≈§=®∞ø”ä¢:Éêñ8”Õ—ãS“yµrì<Ôu»∑˚›˝≤h*≥Y…!Õ[EXR:ö≠π6`ıe¸3a∞Yy§ü]âπuœûíuƒ˛,NF#ı\ˆÖ¨3πLB[x„º•ı“Ó9HmÃxd€Èòπ0Ü–·√œZñ™º©‘√™Fﬁ◊Íáiµ%ÂjÚ1”<¨CTjÅ´+ëQ¿>t⁄ÉˇŒÙJU†t{“TåÔ|´ÑZ®._P,¥Y‰Ä•UKﬂÂÎgv¿F“AÉÂK.÷ˆëÏæ∆≥DΩ∂©[ó+!spáq((â/a:.úÀîxu≥ªvæ•ù}ô]/ìvıA§ç¶ûèB-8àœAÃÅ†º§ËóTS¥≠C`E{ÃQ¡˙ˆ(a’≤˝8u¡≥5XˆF;@•∞2X≥DªÌ@íØÍ*ß…EkæŸõAßhq|t«±ª3G´»\|IÒ+r”Õ÷ﬁƒèGcÚ„ÌX%Û–ÖW˜Cí%{¸<e∞á;v}·7uµ:c@$^±tù⁄6‡E∞Y_7v»œy≥ÍäîÁ'àπÃ9∞%î"W;ﬂ÷¨Kx˛¶aoÈS5À‘8“ä≥£^k√∞≠;>»o‡;«X!‘_Ëâ¡N5k8∆≈›≤„‹jOË¶∞†©ñ„QÆ≤{›˙‚ˇõ∞€ıµœ∫««≥îÂ-9Àú…G∆∆ôâ⁄S¡ùÄ∫ ΩÃx/úNÔ≠Úˇƒ‰?!ÛØ:_‚S0K˝‚G™u…Oê]©‚fÌ	J=Q…‰)ùKÖ„;ª1˜˘|wá4øh!€É9“ó[ƒníñ€ƒrõ§©ÕÛ›'”8ò˙Ó‚•Ê‡/˜à≈-zÉÃ°B5◊∑7wÕ-±Nqt∑A˜æΩö7RXS˝8≥°O›`Íè4U®#àÍ⁄x6M¥©9nâ◊’ÎﬁÔ‹~‘∫óaSë˜ü1•kÙ@ö“—¥N›¬ûÙ¿ˆ˙¥ì≈F‹uÅ4	:Flûãæä◊/r¢‘°vöÛæZl∫≤c3üGXﬁ¿s5SIœëΩÌ3
X%x‚.|«éïGOWVÍÈ˛Z.?QI»ÒlÏ¢ ë"¨ú≈Ú®ÍI7\¡âíé…éÌK_vNM?e±ÕMÙtŒ–¢4ƒhüîö](fÈbs¡XW(“^÷Oa˜9#Pì˜îû#π˛¥b˚>Ì6ì^j'¿N∏i‘x≈¯!∂bÄ!$Ø<ê ˆ>ØbâhÕ∂À†Œ9=ﬂﬂ¿l,t‰~à24®\Ì:ËHØ÷eÚ¡∆˘èØ;wùÅAâÖpW´ƒÇph˚¯<Ô[>ça´ÒÏWŒ+⁄GÁuÓ“Ô9⁄Ô÷m‚Ä9%Ω⁄œª¿nfB◊iA‹πGì6yM©mˇy›˛pÜÌÜö] …ÿßë7vfoâå'-Z∂¶,µaZL9‹Ë’e#µ?âzì¡•ÿ/Âæ"â6i]¶#{UK?º‰&õÙxPÆª¿Êü^=≤ëAEô¬µP:YÄ»íò∫ß*’ó]6¬ÌîÊS†2•Å6AL˘∏≠*H©¡¿¯Ãeß.™	Ä*à⁄¥˘ã≤!	«Nìt<hÚø®IŒ>∂=v¶åûVM—îÂÚ≤KsV¥x°`†*}â7»i®)úbñ£π©óEb√)k»å∑Ã∫Ø™¥‚≈:å¡MÀ∞köËï>ú9;^∑[µXMÒ:üƒò¥µŸÇ…Ú"C
XÒû#Ãk≠«ØmN«∞ﬁ–“f√eóÕÓ‚wñ[™à?4®2π6Q˝ª
øiè°MÜ2√”ªŒùi6Æ≠¥W±µ
>¡ÙÑJU≥/–MvÌπ«‡ql'‹R#Onù«ÍT‹o	à	sôuèèÔ…ÎË*ª"IŸLí@r—~aÅr…≈∞æ*+†¬z—3ìˆC∞6Ê≤≤ÒíÕo™Y–$'1údñ≈cO˘iN~©:œ…Än„dßˇÕ6è$ìÕˇ,œ5ˇ°ÍTÎ™ƒ+rs=ó*>∑= ^l•9†“bª</á5Uí$≥å¡^BÎs˙¥Y{ôsA,dØt7™|2∂ƒïpçΩ†∂ﬂ,≥≥ß≥Ÿ`ÛË;˝a°»∏ı|†{S@¡ô≈ª9øf€U–Tôñ]Ê ”≤À≤µÏ¢Eœ˚Æ7M´ûW3)Ç≥V‡c5ìÇq=˛8«j´÷7:w’c´uùÏÂm◊jo'hjØT~ŒA>f0T~ò“g≠◊∫#:ﬂç Nœ'c∑ŒÉ<±c◊ÒùqﬂEå¨Jhèïn∂<=s#J˚ÉfÉnÍV¿6ÿV‘}“®–ú¢ZÑÏ qóçúπêUàø}T“∏≤S‹‹í≥-∂ÑÑÙ‘A"H∞|Âèfq∂≈,
e'ÏYÖÖ|⁄ÿÉ>$âwïú∏·»≥mƒ^r>°âe.Ñ2÷rRUàB~∑ù 1˚Ù2ò¡mbmQ7≥.∏E√@7q∂&v|ñ	Ó{·,`m9t∂M-R{3¨mÏPå!ÜYie3‡…ˆùÈ¸é.›|f€0~dq∆†§Ï∆√ò|cX+úÆÏTÍU0àÁÈSKŒ∑k‰œ»“7ù~8¯) ƒ1O;·¸ŒÎi{h8lg»b2Dd·œÖF[Ì‚≠•àÎ,QV<fìlSå∆—ßh¥uÌƒ˝`œS¥ë]\¯eÜvvcüÇÑüyÁv¡SE;,‚YªÅ∫—NscˆqNfÎ¨Ì4'N 8ìud”2∂i›‚õÏ¥øép⁄jL≤('ÚP˚®¶≠d£Ÿƒ6vr∫ç≈ßägZMVı\ëÑ=-ãÇ¶#µ1'*DF)=[jπ4ÇäXÚ∂vä,»*§€⁄È÷:x¡ÈrI”ÁÍ©ﬁë@ÂW∞ÖÄlEª◊¶¥x˘ög∞w∆pÔåﬂJ!ﬂJAﬂ*ﬁ<iÕ˚ùwÙw±Òﬂô"¿ïb¿ÛX¨9YËÓÁ≈áí⁄CãÍöZ\º¢µ\ïë†9ét¢©ºõ’»√e[∫¬l`\¢7ó†ƒ|GYÖÃ*%ÍÜ%f
LÃö»UÈ™*¸í–Ñ∂ÆπÏö-"ë˝©ê®íò1(1KXbÜ¿ƒ°âôÉ√UsQT
R¸T¬s	TT	UÃ¨®Æ®˘∂
YXô±F’ﬂ !ç°cbÊ£;4ê∞πì&Ñ-£	z⁄ËqH„»°õgËé·¡lÚ≤ÿÇ∂ë´Ë≠
<0ÿ•–AÉbE∏ë¡BrX´èéÔ`
ñëà‰Öw.q¢ﬂ√Ó©ˇ|ä‚–Mñq÷•y∆! åjáHØ™qàì)LÓ≠éDà+/J˛¨ëc˘‰¬H?w$"˙iG"Íå’¥e◊¸‚	3ƒfà#\/–ïvócïºπT=°Œ⁄Ù-wˇWŸW≤b?VYËÉ‘bH›_/“IÚ:EÃP·ívÇ`rÒ|r1~˙wUg#s!¨WqÏ‡%åè9V»(†»Uï⁄©‡∂¿ãV≈™≤ï"∂Ú[h_∫‘˘¢?ÙZ≠e}3=A}˜K^’S,Àtì´zC¿∫FuÄN±˙o76ôs!à«x|Øj∆4∞Ò$r-OÇUÒ<&-W>{””zıﬁ.d˜3/Ë\˝æõµÚWµP`¥⁄]∑$»¨∑⁄·¿ä˘<Û	V¥ÓÚ◊2h}-√ÅÍk\Ü•◊¨Ùì‚á“t\Ø4axπ/1æ¯T~ëì«ØONI˜ÕÓigê'/:«4?[ıH1&yÖËO›PêÇ®˜NùSôhi≥f√îÎa7Ubymç∞Js!˘9Ÿõå¶q‰Pp©“ùÃª…^ﬁÂ˛Õº´ìï
 k¡„lÜÌ:ÀÙ"ˇMT≠Ù˚+D«∏∑ÇûaND»‡üÛU∫9ñ2ı8ﬂ√Gåwë!≠„zoEJÍIü_≈~Lák◊o7Ωüﬁ‰åÔI_Ï} M6U–ˇJ‚µ˝‡¯°´ÓÓ»â˙Án¯2p†NJ›Èî˛ÕVõQ∞⁄FqZì˛“JQ·ØºËº)y^7Y¸Ì{¥≈ÏÌÙoŸ€ìó„óíõe/‚”ê'Ù]|s˘±Îï6Hç®ŸtVâ˙xÌn'¿l:Ç3≠±“ˆ©-¿oˆƒW	
π æ´‰ä
ä;h1∫´ „©ò˚ËEó;‰ñtªß–p˝sΩ¿m∞ûRÄ¯ìfÜÍ´,ıøîº{"„å/∏îM¡ﬁ'Z(œ¯—!fÊÜfÚ)y+Èm„˚ÿ˜`Íù≥JàªÓ$‰;¸ÒzM¯«#–íØüª!ˇ,m‘√∆¶Ì~ÎˆÇ‰Û!ÃAD_ZñOøqÈﬂ«câN2'|h¨¢Í!õëßÖ˘`—#1™£&∑p◊Û}‹,=¸7a•Râ≈N∆($ùêYH∑ìG*âÑ¥¡dœ˝⁄u…˛T ‹37ÍÙaÁçº>>˙˙ÇvOÿ»Y£+≤5“∞<`ÅwWú~.«ÈD1„ºSÆÁ%˝óäæFÈÍ®üç«ˆ˝`˜6®l¯*Â›¿ë˙√}˙xáH≥∑*,Ãäéï““_x2äGÁ°¯ä§åÇú@hmÖûP[!…gñõ/R3»‘ß7t®YØÿ–?kø¶}XciK|ÈxˇYWêÙ7∂Úyõö)Õ&f-ﬂ∆
˘´E•˜Çi)·©xDnË◊òÓ`)J∞íûÑ‘©Ñ‚Çë”ßiÂ¬ía˙Çè0ÌîñËc0âø$·Â®7≥öµFÆü¡∫\]À&,œì€¿À_8˝ÛfS! :ﬂwŒ2,∂‡;ÉA7√Ha8†XPyJËœíÕ≠q≠dÛ˘vÙá\òƒ’tb?˛ÂO"ùºÆâZï§|	jvÇ?-tc◊‹	ıõñ∆x	º û”®M9ÛWIõ∫qjGö•0÷ñf¨£’æèÔá‹ˇYˇ>’¨Kø7ÙN”3∫#≠fAˆf©ñ™tÚÓeñ≥R ≤ÈÆ›C~ªìÁfÚgpj˘›'îﬂÀÇﬂÕEÅÓ˛¢X”‹ï4äûˆ√ŒHˆªdA§œ6‹ô?È9˛i“qdÉ¢ˆßë|Mßﬂ_%º≤;eïH?˛M€f2$≤P≤õK=}ì*/ÛÏ´qI‰Ω-}ß…@“ó9÷·ƒ–zD	Æ¶Ô~t},SÎˆ£Ig< ﬁ W{–±T¡4≠÷\vz
y‡˘ﬁévEô·æí´s;…€ÆQöı)∑h»5∑(ñ[≠ñí4ÔÊÅ∫ví!∫uÏ˘ﬁ9˘ﬁˇŒüÌh]ÜµÍ!IºÕi™ø:ø=W7«ÊˇñöV`p>ƒˇ<¬ˇ<nºcˆ¢ˇ—∑*ÓcŸ£˘x–®9P-ÚWà˜—^…KDGc~s.V\¨Ω\L»I≤˚Eö)ä—ÑüŸƒÂTN2ÇïC˝í±ä¥é9´Ì`ı|“Œ6H)“‹ê9nˆ˘#µd ãæ√»ª/ﬂt»È˛—ÀÉŒ©Õ3;‰˝¡ãWù.¨ß±€vÅêï9∫”‹Ò‘9è«§Û;¨g1#sdRS˚∂èé√û-ªzÙ´	¨„ò7<Ÿt5æ¨‰XKˆÜ¶€°	ÇºM;°è@Èªì?èøïîA3p˝\ù4E≠ÕÏÙ’áIÏÇI—∞&Z¸´\´è Å–cKOëÈˆò·úƒdä≠Û≈£{¸ﬂæùÔﬁëŒ˜ùìŒ—ì5võAí9Çˇè;<|¡NÇÒéP	E!Ç¢ò’iá\Ÿ@=ÿç≈ƒ;ÿ~¯≤ŸSÆhÒ¬πáÒπ)ˆ!º‚ßŒ?§ê‡$T¥[≤êxÏ˝>vÈ“∏ÂR˛“Fƒ´Ÿ˜C⁄¿Àµh^f
óö2áL)å∑ÚQŸAô+<ñÚV¸l3-L;£∑õ_fµ“sc±⁄+õ…h¢á£ÃDMr¯æƒ°Ô~®Ïı”ô\;¶Ø∆º5wü7◊§ÆZí<Öü*ï%7,1;G˝‹;‰–	„°±≤çUk©ÿì!˛àcÿ∏Ã RòÊ[Ó’Àˆµã∆b‹6kùà_‚âƒ¥pR8ˆ‚œü∫AèœŒúEìDz‡£&=0oÁg¢£RiÙŸzu*ÂoSù
”œítm!˜Ãê0(Kr≈ñÏr\µ9≠fWb≠}¢Ö‰3%M<‡ïz\J|Ñ©riIî7Ωäê(Lh§Æ`ﬁøL3S!tÿ#øµéÚ˛›R/™ñÓdi©Ñ•≈Ruô¸˝ØˇÚ∑ˇ∑÷ê¶…#Ûôàcôâ
ˆÌ$9”ÁhtÎµÅ\vπühr%ò…Cßìü˙Æoq0A¢˛ôÛ∆%Vê˝Cô[ƒ¸L:,¥ìôü/H J0Vjzƒî6o3∆+]¬∑ÔLøîÂª{´µXnﬁ#'œ È7_.«ì≈˛ƒ‰˘J¸Ñ“<pÚ?˝Sm6>CôêC«C∞}Ñ$⁄É!√_0¯
aW∂VhqYƒ\Î·kŸõÖES∞…≈˜l!<—V“Õ^æøz4•[ÛEEø≈>Ê≈Û:	4ÎóVNÄœÕ´|*Ò"ÙŸLP^S;/2ä,Ï]Ê»¸¿§‰å¶~@Õ}Ë¿Œ#cû∏ËDNÃ2öá∞Ò]*ÈyÄ1ΩmäDGkFËmñ'k”˙:<nÆßt/<L`p◊®3h£ˆ±ÎÏê’4ã™Í‡ÍB◊ˇê9@Ë_fË1ãp¥}ÄY\f’l@˜∆'ò,0ihπ]vær$∫Ø‡Ô¿aõKÎLUã%c¿Y¶ü¶C2
ijfÏ±Xé8„É™äï∆ÊÛëË˚˘„¶≤^Ïk#∫˙ÕãÚäú§{µÀÊEª˝Ã¡·E®`m|1öçÈßN¢?˛Øˇ∂1ÿÀLbÏZ…£Ω<§©ñ°h1r@˙6 ]&€π“ˆã5kÒ≥D©úJÂâ˚aÌhø;æ$|vòB6C#≥Ç\ì≥¿…Rf“øBùj>Ëí·+˙6“‰I™ÊR%Îò‡üoÔn%åfŒV¿¶9rkì´ßMvœ_Ö‘wõG“\vÎˆç©Ïíg,€›R•πã◊µe|ÿ“ëFê≥C$ï!HÎÇ:Z¬®±˛2«"¥cµ‚2È‡«û%lS˝r‰®¬*eL≤.C≥ãÈ≥ò$¢ËY˜9Å-‰=ßoXH◊ÌãΩœ!ÉKﬂ‚høyì=±®ÇtNU˜T◊:˜0UïÄÎÖn'èúàì3R∞{’`Ë¬Ë·–Æ<FtæCﬁˇÏ
‹ı|_∑ÊYU»Õä∑´ÓfEâÖ]J\°Î’êı*Ä„Á#˝ï—ºJ≈Âı⁄UA⁄^3À»æR\’*R÷ã9ˆf(7%"‘Ÿ·dz’ ÷`}WEmc6X∫EL
Møxp√3í”•3'ñ‡çyüI™äAvÜí§Åp¬·.nßèÄªí˙ﬂw¶∆$•ZûÒ@†LΩ¥ˆ»„DõV{•hâ≤9˝DÌˇ∫ﬁÉ¨ı¶hß[L™ÕÍRªW¡≥pıÅa8.«Ñ·h0	ÜÉ¿PÙgÃë^8»áx…º$ÁÏF•sfçÆÂc⁄Krêã÷£∆3∏◊nÑ˙îX”dÊkÅ$q´ôW_Ùidã[ÈÖ0oâ¢yï∫ƒC‚ÇÂ_Ú»`Olçmd E3Zo"?∞ìó±Ã–∆ ŒÎ≠9+◊ZjﬂØâOãÔCuÊ ä»œår÷S¥1mﬂÕò—l(U51©r<Àdñ„J!ÏQß‚élbá$Z©H[´,3 Í.ÍÿPa(–RÎ∑h)aFI=≠˚`ÊÕ]1w4≠ƒõ|Ò(°A!R'bFÔËzá9´ﬂ_?˚Ò/∫1¯taÓD°EÕ]˘Bç„$1+ù9˙ór⁄Ifm◊uB‘H`‚v1m"∫◊Á$:jQ•ÛñØg`Enª†'å¢˚ÛMŒ^3ô>±Íè$˘í‚‰¨Ã<•˜ﬂ“	π÷-®N`Ö·lWG/E6+≥ÃÀû {«Ö¡È„€ ŒœGÊ[∫“!∑Ô€ªÈhÄπ˙ÊXÕlû]~§]”Û∂»4 “ £R§ä¸™h4ÆŸÇÒ-˜Å=uh:ñﬁ©uÿHOﬁxVz‡fÊ˛W]Å†≤ôØ°!(IË}•≤ﬁ ‹≈ƒkQæßb<Ìd>ˆ’w’"ÈÓÀÛÁl¥©<^Ã@Uπ-ôÄ$Gìq´3ÑŒ”%¿˛uNí<ØcmÚåÌÛ"µo%HÌ«õ£óù£y¡µ'E1´`∂3€éùÖwIÊ%&˚ù√dOñn&`vI#U—Ÿì&Ï!⁄%OÃß]â¬H5	wêê˙Óeó’tAXÒvª≠⁄Ôª§É|ØùØCZƒ)|UÑë™ç/Èa™¨ã™ÓCä14v™\duv¸⁄È”?¥]U#pp&SÏ‚-K∫√Oé,í6;
&~%»‰(“∂’˘	ñﬂéñ@êf¨¢˚≥aù“c—b—ä$˜F ã$ÔY‚›$n0¥√≥)4Û∞Òå?Œ±s÷jÊQ±ôGµöy\lÊ±M3w
ÂlFŒÒPŒ$Jìdã˛   ˇˇÏ}ÎrG≤Ê´î1	¥	‡M"( í(	I1hº≠’@7à6›ÿæò‰p±øœüççqbˇMƒ˛:è∞œs^`Á∂≤™˙^∑nÄ§l´'FÅÍ∫deeeee~ôyñî_ÒŒæ‚ùï≠ÉáF=<–3ﬁQ‰+ÚzX‰3E‡£^–c8PbÈêﬁÄ,É$Ò÷EìÿF‰~!á‰\pœH‹ñ∆í–@àHiÔHêá†“ã&K¬EZ†?B.S E‹7ü1Äzÿ¨ Ú"íTrA%⁄¿ÂoâÏÚ∑ ∆yyŒ^˛ÇËtDŒ‰=ÒÈ_ñ‘É>2<òïÆœ;Gzπ˜’πîã|} ˆà¢Œ~Ó€&Ç¿j¥∫`êHˇ‹™©ír—∞ûîm:]iåé4ÃÅ´`nãO>E9î FÔG˝£Ù‡Õ—˚¯Ô◊É£—·Ÿ·+….?N«ÅπUr¬¢qˆ∑ˆ…-vN¢Tø≈Æ7Ä∞$‹ÚR(I«2L |®ûZN‰G3º0ÊCcê´)zG8∂|”ˇO
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
®¨R◊·ØV©ØV©ØV©Ôﬂˇ  ˇˇÏ}€r‹Hñÿ˚|E™‹£-N≥ä7QRst	RR´Ÿ)ãöˆDª£;´
dAÖ0∏4≈·–a˚≈oª€cOxb„ÿ'á˝Ê∞#¸=˝ﬁO9ô	 d&≈ãJZVG®ã( q2Û\Ú‹+üØ<xq*_`0ü—˛ÛWˆúYpkûRèreÊ©:”æ5O)?sòßÑê9≈j—,Ä$+œ`5⁄Ga”í1HJ◊˘†6-´ƒi¶⁄¶ï‹⁄¥4üÛyÃSVy^’œ’Y¶.aï∫ÑE T™¨¸πµ.’fyk]jﬁ’À®,ŸÁ\ï@ﬂ \›˘Áø˝Ìü»‡≈o˘µªø‘Ê˘-|˛OˇõmÓæ¬Áﬂº=ZZà%ì9Ìxr6Èµ°å58•.9ó∑ÉëœîhÉ»Pãa €÷‰±ï∫¢OıO;s[rknª~s[≠Ó/4]B>%‹F_îX|5I„4∆à‰Ãø˝ﬁuJœä’h0≈ÈS¡Æ‘.g¯âôJ'XΩk4°æÔxdòß™a{?s;⁄÷a{êP€4gC
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
Ÿ‘	Ö1v≠7/˜Pïõ¶â+˝J∆¡Ã≈,6¬Õ…Iäôndu”ì~øﬂà∑\Coá≤B´ˇ±uÊ˙XHˆ´Ú|„®õEﬁÜÊ0Eç…˛j€o™Õ?{X;/6±ÍÏ›TdH{S©Y◊xç¡»≤üæEgNµÍö	6≠rÃÃ™UñõjñçÌVµ‰˜ ◊R\{PˆÖUW≤…lΩú˙ëäVövk_[ÙîÔ9≥ê˘lë;°ìªÏ¡≈‰fENC¨q˘:í ﬁeï◊πÙh·tﬁs«lëvRozË` uπo£#Ω∞MVﬂâ?Pu 4<X£CÙÄ1sÓ°r`Ñ˘ ººw=Ymøh~fŒ…%íï}aπa,Ác˘ÑËôn¶œ(Ä(nSÃëeÄ<>¡]üÜG¯ß4dª„‚˜7¸Bqù'≈€ÏÔ‚w4zÒòçÏé]qE∫'<ß#æ83ÏÄŸ9üˆÂ_—‚œVπxx‰a+⁄W® VüÃ‚é≈∆d=qÂE?ô—@π™(∂i@:Ç]ä„aL’[uÁN(ˇ.åG&0˜Û§–‚)a=y|núMÑ≤5ÜEëˇíÜ*≈÷T„È*≥Œ)¯‚øXY©∑«‘~Ó›˝Áoˆ_v∑˜…—Ôﬁº<‹>¯Íw‰.y˝‚˘Àá‰≈≥7˚œv_Ô≤∂úÚ’ã◊ÿ∑≥Â{~qú˙ØêÌ–d◊æÉÓı#wg{:ª‹À=Eˇ÷‚_ æ0˙eŒUqÀí|íNØÉTõDgÇ∆π€∫˙Œ)aÍkˆÃØ•f &Ë„˚V¨eÁkÍÉ>ÓÊ˛ŒóŒ0*_ŸÉÛiR¸πFÆ'˝ÍH∑~ù˙•ø<ÈØÌìP%..úuËéºŒõiî.ÏÉÑ+ﬂë|Â;yzczs˜·ÿ…ñ†>w¯ôØ¡∑ÏÆ=¸ﬁ]*rÊ–(ÂK@ıﬂ¡ﬂÂë&Aäwÿ&uŸç_¡•∏ª¥‘ÈòCît◊óIgµSÜ¿ı+èÌπ~ö8Ü≈~ˇŸ9ÃÌÇ|vŒ†«/Ê≈2|Ah.∂‡◊ø ﬂÏÓ¸ÄO^ê:¶I◊â¢Ã’'∆x¡ÓB¬…1Ùx±{|∆˘k◊’¡«*?≈Â.#%ü>P SÊ'Ìƒ¿≥Ô„îf_˜$ˇRûf(’Ò@óœÈ, ˛I>ê„—4ÌÏÄÆ'ˇ¶^qwÏ`≈éklsëäƒå»#≤∂^Y6ìo≈ﬂÒdN´ÚsÎ´äÁjKFzdn¸útáB;úÁ+ff Ú¿{4ôÙèΩ àÚáWíå,õ?¸ˇsÂŸcøƒ«ÿKÜYV°ÇıåòKÜ7ÃyU?&¸x©©ñÁö”8Wõ…™fÎ”¶…6Ãˆ≤ÆÃX ‘<·∆‡._ƒwpD∑±Â/rƒm˝$\íÀˆúEππ¯¸)ˆÀ :LCóN‡L23q™ëÁPˇ∑˛«Dö˚Já1>Ω¥î±â‚ﬁ«è…j!r˜è∑1ÇŒbzPîÁö∞$¬†˙ë√Ï›ïærÏùpˆ.FÜ1˙†8r†ª´Àdûﬁ¢¬%\)üWÓY„‹%áÊ‚ˇ  ˇˇ £