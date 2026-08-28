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
        setBackupSuccessMessage("‚úî Pengaturan backup otomatis berhasil disimpan!");
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
    if (!window.confirm("‚ö† PERINGATAN RESTORASI DATABASE:\n\nRestorasi ini HANYA akan memulihkan data database (Siswa, Tagihan, Transaksi, Absensi, Jurnal, Kesiswaan, Sarpras, dsb) dari file backup. Konfigurasi dan file sistem tidak akan diubah atau ditimpa.\n\nData database saat ini akan ditimpa dengan data dari backup ini. Apakah Anda yakin ingin melanjutkan?")) {
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

    if (!window.confirm("‚ö† PERINGATAN RESTORASI DATABASE LOKAL:\n\nRestorasi ini HANYA akan memulihkan data database dari file JSON lokal. Konfigurasi sistem dan file sistem tidak akan disentuh.\n\nApakah Anda yakin ingin melanjutkan memulihkan data database?")) {
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
        setBackupSuccessMessage("üóë Backup berhasil dihapus.");
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
          "‚úî Sinkronisasi sukses! Semua koleksi terbaru telah disalin ke Firebase Firestore.",
        );
        fetchSystemStatus();
        onRefresh();
      } else {
        setSyncFeedback(
          `‚ö† Gagal menyinkronkan: ${data.error || "Server error"}`,
        );
      }
    } catch (err) {
      setSyncFeedback(
        "‚ö† Galat koneksi saat mengirim permintaan sinkronisasi.",
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
      "‚ö† APAKAH ANDA YAKIN?\n\nTindakan ini akan menaikkan kelas semua siswa secara otomatis:\n- Kelas 7 -> Kelas 8\n- Kelas 8 -> Kelas 9\n- Kelas 9 -> Lulus";
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

    let confirmMsg = `‚ö† AKTIFKAN TAHUN AJARAN ${yearNum}/${yearNum + 1}?`;
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
                    <option value="bk">‚öñ BK & Konseling</option>
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
                  <span>{syncFeedback.includes("sukses") ? "‚úî" : "‚ö†"}</span>
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
                      Tahun Ajaran Aktif Portal üóì
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
                        ‚öô PILIHAN B: Aktifkan Tahun Ajaran Baru Saja
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
                            <Check size={14} /> Aktifkan Tahun Ajaran Saja ‚úî
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
                            ‚úî Kunci sudah terintegrasi aman di server.
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
                      <span>{waTestFeedback.success ? "‚úî" : "‚ö†"}</span>
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
                <div className="lg:col-span-5 flex flex-col gap-4 p-4.5 bg-slate-50 bordexúÏ}Yo\IvÊ˚¸ä®DANv+ìãDïDì*$…Zÿ%ZIπ1(7∫"3ÉÃ´ºõÔ"íf ∆ É<ÄªgÄ1<(èaÛ>/~ò_”ø†~¬úq˜€M&%’@©íô7‚∆z∂8Á;ô—åEÉÿ•	lmlê(H˝õ∂Æ‹ﬁÛˇ@Ze7©O¶.ç„ó‘c{ΩÑ]%Éo67¬´ﬂëÛ¿Oì¿ù˛≠„œúã`4õÜ!ã¶4f$âËt·¯ÉKﬁL&n0]HﬂD»ü˛Òí„¿?w.“à∆ŸáöiHiB'ÿ‘´$h‚ƒ≤nÆc?üˇŸO3Á]u Á.ª"N¬ºx0e~}zõ∆âs~=ò∞‰í1üÑÉGdû√SŸå©'N1oä˜‚?Éi‡í6Ü€ä∫íyoÃµË»”ççﬁÛqBì4VŒV>5ñÔ©ÆoÂM€0dﬁèÕú‘Î=?†3Í_,†Úﬁ»ˇ·ØçŸîFîLX¥†.’Ω|wfHÒ”$Mí¿WÙ9π°£‚ëû‚ô¿?pùÈbÔ¶øFˆûì9ıg.”wLL”ﬂf˝O&‚√ê˘t‚≤ŸCí·‡ŒxG›ØÉ4äÀØ=z%ÄÔ>)j”4	ÉKﬂËÏE0•Ó⁄≠¢[ÂDﬂ|1òYÁ#éÔ:>2<!óÉÕMœ#«_6»:DÉ0‡]*ˆ›yÍ∫˘Æ‹ ?¿aÛa¬#ÿ◊Ñv'q√QLfp¨¯ﬂ∏,úÿAê&∞∞”4ﬁÅOº~‡3ÚÈMcj»Á§á";„O`„ë˛Mq$z∑ﬂ ámª˜næÕ9`Ô`±ËI6;úp¿Ùl√Ùlã¡ùë◊òè¸‘∆s:.1¸é¥g£2ÍiêéôW‰CºlÛ1Wø·É&Î™.ˆ®îÆäÕoKØjtcSI7v]:aÆÍ8óDôüd¯%¢MäÚ)äbΩé≤3ANô?Â«ñØˇÍ≠)Üœ{£ËiÃ\6MoÇó§∞§áQu¥‡ƒ√)øÄj}¶;Û≠#ˇ2ıÄZıŸ0°—KÜ¸Âk˜qÊ{óbõÜÉ≠·v”†˘∆+9∫‚´¨µÚº6		oÚ*ñPÂëB~Üƒı6Å˚∞ƒ°!Ÿ$∞v◊≈œñµüµü,Q{s´|˘÷'˝◊lxÃüÅ∞÷±µ≠«Ek[èEk_”»°~◊Ü?-z¸T4¥E∞)2f¿;wlÛIŸ |-û QªHçùÓÀOŸOÖ ù–EÏx@Ä∆>„yêêCæ .≤r¸0U—!a¯ú0®$œÒa€(•W∞v0;
W“òïì7ÖD#ßz‰ªÔ»Ê∆èõŒi	õäUÀ≈‡g√mï3œ·=s8’SÂû˝U±Wa˙ìîí ìÀ…Ãô”˜∑ŒÇÍƒô;dÇtBèCR?IÉ1gP>yA‰U']!g´œ˘Õ˙Ø»Vó‰À*IÄ≤êÒ•ìLÁ‰WÎ≤•˛…ÎSo¸Y:/‘'rÃ@)ıÄV∞Ë^T©∫Z5Ê‰åú;.Lï–Ë
’™ÿ9•d¡»Èq`*πñu'%Îg°cµ˜≥“∂§£Ôzí√ÃÜ‚±Ñr´F,L+vÑ–K`ìÑ…‡ÚºlØ¥Ë‹˙”“¶\[jÅJFıö∂F}3™≥YËrNeOÎƒ™˜º™Ôù±à.ÊN¥≥1îsv$Å(˚kìoh/ãtÊxˆâœ.—‰≈˙Ú'÷ÜI¿∑'∏7˚=g68:Ï≠·Ü⁄g.êﬂS˘tﬁSQìeiÎ«∂nc†Ñ˛€4ÒØÈÍóÆfˇ}¢ë‡+Kô€X<(ø≠ËW∑˛Ñvu´]R=·xÕ‚$à@&çèˆ%≤1h_H≠)»#§ è;”ıxè÷{B~¯˛ˇ«…K]êl}nâ.Õ—˝lä÷`z@dÈ(≈¬o°çhµ›îŒ]FgÿÆò˙,ù¶p0‰b◊Ã!ãL $#F?'ßå∞ˆo∆Ø^;ü ¥åÉˆùF K6-‰ã¿•Û‹RÓ¯¿e|ˇÖ®x!¸ ﬂÕÒ≠Â]HÏƒ@,T¬h´çÚlµÕ∆Fí ŸüM!hF„9ú›ñ?ﬁ±®°ì=ÜE)DÖÏÅB¥ŸﬁXﬂ‹ ·5Ï˘
vEl⁄´JYã∫*%¡§&‘∆òô2ƒﬂi◊Óõî7Hg∞‘Ê”€™@Âƒbè√~„$ ì&@ò°æ„·M`tSV;o€ôl◊0Å(Öﬁï«Z4˘Ÿ∂é&S˜}ÃêÉT∑um;áCﬁq&8—kﬁDıáo„¿_S“c˝¡◊¯iK=‹Y¥ ‰Kli≤C∆G„ﬂãÆˇ˛Wº«KvW#ÃNπ“ÖîE•rBßS&{=ﬁGıc3'ÊVµ/’´QööÑBóQÓ/Å∑Ò˙∏»Í⁄ïUö;≥SvQ)Ω+≠väôU±fŒòùãy«u∆v»	ıS`ÃŸˆâ·‚®¿É¸ã83‘ƒ@ãa‚§<ªI]‹ã +‹Éœ$åY.÷7[	ë„_íõ—F¢∫¨_Ü2l˘=Ò&®”Ëÿ˛ø◊ÆÑäÉüM¯Áp›9>◊8úN<'…7„Aƒ†€Ÿn˙Lô Ë<Û5¬≥ÑO¥XbçC∏Ï<—Òá.¶o©’˚ê≈ã»	Å€ØìòC¥Tk“ÊΩ–”óú¬‡´’§Éêà˝uÍDl¶y$tÈîÕa,⁄ÎÅxûs†°l¬ï™H˜ÚäÒCî
—hÖz»ÈÈC2s›°Óıπuú¶e
”Çú_Mu$Úòe™B•Å¶Ω[◊‡}Ÿ≥ŸtU6m,JiAœç¥¿|≥ƒ¸ ⁄q~<ÅÄòxLï˙]ÛiÒèS¡ ®õ¬"H1≈ÀvÇêNù‰È%ü±&ÂÈ™ÆBMtl
ñU”†NŒâ¡|Õ£ßx¶≈ÂöX∏™ˆÆ$ßπΩQ5ï≠π9≥ ôı5{wW'¿œØŸyƒ‚˘¡e.…>™—“\^çC«ÔÈ$Qﬁ'·'†πDAÃbM‚ÓJıØ®Ωﬂelßn8—Xx6∏«∑-≤ÃwãÂ–öÚ,^‰¬é∫∏„0’Ê	µ˘E∂ÿ›BÒHúW§ú◊;˜f¨ÑCøy˜;õÇ<>Ì\“köê‘ˇVÏ®}y[‹RL2]P∫ì˘ÌöA≤∑"ó˙+ì •…9K¶s√µoù∫æ∏5√Xß&[åÜ≤nó\ÀΩ®—*â”Í„j* …&©»B›©_õ\m6Ô˙ƒTUnA¬@AµP©üèŸç@l1)x˙™:Üúå∑z™"u-%·z∞π’¡d√èjCFQôm*º≤¢áËÑ›Êäl=V2ê÷ÊÀÙQÒvµDÿ`‚n	T5{¥`«=`M†ñx«-à_”∆g‰Y)
ŸUùåêΩΩ=≤ÒQ/≠≠«ÙıkÕ#¥äï~¥U[È8âÇÉπnˇÆ€R÷◊Æ∂b‚fÙIÂäëk4J¡dˇ4“N—2w∑u¥]0è^P|Ãu;§•Ánp9∏‡U¶ç^ ÌÅD8∏Œ?àá67JK©ˆ
%€n˚˝…"‰ÍéVd¬˛/ÿ5®TãpËÃnÎo,éêoëıÌ…˝∂˝›ÉjÓ*"Óú¥lÙë°Q+/µRmGg≠¡Â@o5v∑v˙¯´.#Z¥©⁄¸úTÈÖ8ôë3J˝)¸Ñûe0îo6∑˘ﬁãΩùÏÿaxvH‚$.+⁄¶s∏£ƒ”6#1
Ω™1ﬂ|´î@‹¬KÄÿà5ÉÃ´∞^ï.É•íı)Ô= ^úˆˆÍ-õZˆ˝f>ÕmGÊ±à∫≥v’¸á¢n˛≈·î—a∆%}Œ›éx7Ñ˝Lc7_≈≤®Ó“o4">Ï∆ÖÙhàúbˇ:a1Y'õ[èÒ¢ˆKÁäÕ˙õk∑‰xÖ“⁄74£ñpüÏ™§rÙpJ7àdz¯bp	õ!∂öæ“3;V«°w^I”UH^~KI∫Cn ˚w√î[^g£DyÌæ™°ÈDË≤pˇE~ΩÆ“ekmZ—u‘ï
Ø∞äÚc1kÿù¬ì“‹≥6Y;Ω≤,∑ºK†n¡Â–Ö%√ŸŒ#vNˆ»∑Î4t÷Èx„z&Q¨ösÇıY6ÖóY£ÉúÁÙÑÁ§¸o»◊l:_ìL∂™˚∏T\;®≥FÛüJZì]ek∫ÀbEÑãùRö®∂(^M´yVK’)Â√nFÈ=§ÿG3Ú	p?8ΩÕ.ìzõfÉˆ≈Óµ D≈û=ÕoµÎÓ*Vöçé|gŸçK—…æπqûÂ3´›≥¢]‘í%6Û’lcÈí¢@#÷¡`§.K€¿£6'ç∂¢ò¨»Üó€Ω√Ü·u9±á¿qíèÈ¿Ú≠Ùºä!.}\øÊ!ß,Ú®Øv-®Ÿ±åÿÃp(Û'V{$±’˚>ê≠%˚—ù«≥à∆Û≠x-t
OÙA‡∫,Rß É£ß=|H˝ÑÑ{ÁÄÄ=°≥F‚‰Z·sRkí‚ï6< Ø&o·Ø·Ç]«˝∆œkπEÚ9Ÿ¿GM†6™†•ÉK»®©„ˇØõËD∏°tvG˝8Dó¯¶UVTecôë´pp(ï>ÂçÎÛ£ÿ©‹‡e¨›‡	›x˜Û±_“¯#âˇBañ˛”\ßaú§3æˆﬂ}G6n·µºâÁwSıƒ·ˇÙ∑ˇ“q,ßßKé$˜◊˝xFrF/∏øÒÍ¯À…s‚È«6¶IäæTK.} >CÜE3BÒ±åÏƒôqF∫ÏJâ⁄Â–éiLF®N/7∂$b4N#}îÉMb‚œrC£IÇa˘˛îΩ.>û1}ïFÈ˙o©k9™&wŒèEA‡ù1:ù≥Hlç¸ö¥ûåSŒ§Î~S∞ú˘JC7ôdc…π»‹!{«‹ Ù‡c±‘Úœ˘ÁëÿÍVèÄ‰$∫Y>˛1L„òF!H≠ÀŒù®}Ñ÷HÕàßN£ bÍöü|Pˇ#ö£ØË[á‡ë[í<ä≥3¶.ç∂±ÏµjÑ°˛ö∆ßK}Ô,ı¬“z∫ø‹]˜nÍm+)®î†7.ﬁúQZ–V»2ÊQF‰ÄFmˆnŸd£éZ1u˜nnH¶œÓêçá˛›‹&∑Õ·e∫cÌÈM˛ÙF˚· )‹n√¡ìöWC#4	ùπÚQF%K¸Úsó±äkwÌ’≠I6›b´n≠€æ˛[ïKN·ï¡ª‹∫h,"L¯◊ìöJ#€75›ykC™;´6ó*Úq˛H„Ñ«˚ıY›£‰YﬁÈ|Óe˜,J¿ñÏOŒ¢é|'Ü}Êƒóm’}•“Û3$ã,äpSäÚ¡#‰öó6Åπ_•>EÉrÄû¸‰¡>0r˛∫p|JEÇë~0<±ÿs§≠çON…	˝3†yÁ‰ÂrJ°·Ô‚¢O˝E÷rL9Æ<F∞:•ÿ'ﬁCƒ	‚@¿¯’Çπêçh;“∆,ëzâùÈÉ2ô≠QÆ∏¨A{4‰•ë3#≥‘ÛÆ•Me-d›ß^5≤Ñ‰]ZDlÜ(u°Û1ì°@í&–Ñl§1í:rj8ˇÂ©]Ø_6ÖEÙÆ¸óóÃíh†G≠gÂp”%Óá˜ÁÈraæx:Gg#ÚG/ø"£„—KrxÙıËÙÕòú~Ò˙dÙÚãó;íiñÛÊ›¥.;Ã@'¸ì„c‘ñ, ßv=ﬂ∏Ù\ÖCÒÆÎ®B¶‰≤ü¶gË9ÜÛ*ÆÜ∑ B«Mè(ú3˙è≈ûœˆ∂À'L
êﬁfFôÒ£[=b∫&ﬂ∂Únﬂa4
	eúˇ≥¸‰ìˆ°ñø—b6¢Ã-{qÈ$hD'.êΩ¯!LÅ0›LÄ˙‘«/"6ƒﬂ+mƒî ¬¿"$3ñáj38Ï[?Sñ◊≤˘˚M˘@∂Pˆ]z
9§¢]2Á–t…[—0ßîoiD<2˜OÀi%¡y‡:Ãg'u-_R≤ÔxáÔ˙B·\zJ¶Ÿƒ„0SÿBòëΩ .»§x›˛Ò˚öó—"qﬁ9à‚ïiÖ6c…π/vö# º≈`π4∆ÉA( ÊbPz∆7Òﬂr.„LPÇÔÁü:å~w=ïDJ·nö¶¡Î∂3ÀŒÑ§Úï¿M+ôìtC˝*;\;5`hÜÄì,qà¿∞·$\J‚ÜéH⁄s–à¿◊FLÁîÜ9√C2:=B'Yíõ(≥g~;ßI<
√áíˆ=aR–!W∂"Ù2]ÃÒÏã≥—)¸˚˙7£ØF§5!AgFíˆ`<n*Œsg˚ö‹  E ≥]Râtw!¶ü√¸_5ôt°ºk6›-7ÆÄoT$ù´ü	b∆]îé0àµﬂÎ≠)y Ø0æ∆}p_ÙÒJZ˝x\Ú
'¡å∫˝$JôÙ·ñ˙â•™ª]Å‚^8ªB!+Ôåπ*ÑSƒÿ(æz*	Q,Y+≤£R ´
<ç{ÁLÀıf˘ßº_à´°r^n`i¥FmV-≈µ,ú \}Ó3\Ê«ÊuI;ß•÷Û⁄q…ﬂˇÒÔ${Z~Q€›‘!Ï=QãÁ,óK·ò„fhô9n‚⁄fë›ö∂éz∂"éK‰o[€≤ôoƒp‘b˛Aa^≤ÕcfQ&¿x<[{fîV,KLå˛ô;dc¯l˚a≈,#ﬂ„õLVo≥RiS^	‰◊#ÿπW{7ÉM√¡iÜLóé˘u	ò∏,‘Z8µ{≥*ÊAh!Ä%Úèpv[Xéªê≥Óº3ì7+\Ò≥”kÇªÏŸ>ö÷x¬Wµ¥WdCjHzZ3$mÈc~F.µzÌ∂∆CcÆ5ô åK\`4“Â‰0A8≠Ø¿qv‘ALhöë‘ùPXã≤_%6£gÖ@√ßÛQvFE∆µ˝>e»"$†m%A:ân<ühz≠Ä}“.»˚ƒm≥ﬁsÍ∆j‘Ö˙ˆÆ
åè∂õ|ˆŸF-dµ∂µ€~]˙ÿ’¬VY€}›ê—$é«bπ≤d" Ùñ∂◊ƒD©C∏œÂ”[õ‹mâ]Âqq‹ÍVNIkv$.¨J€mXå:YRD[îßJnTSkÁBG(Ïúkπf‰å—òìŸi2”å¢1πm¥¥ÉJ†(Ì+⁄£†/∏[n›çÌ}Ê π»å…ë#áÃ#ïÑ+@Èöv·!9s‡ãÃÍ{vt8:&á£”—ô¢µ√£˝—ŸËË.*¨9MtsT ugªr˘EîFmÆíYÚäOÂ Ö(ıûUØ‚t:e±XÀÁña€çà∞ß&∑NjVà%[|´∆∂üÍ‚TÄ¿Z\ëÊƒ¿´ñª√¥z,S	¢í¬Áoª ~m]èø8;:&«hÿVœØ÷Ú√£∆Ïπ˝Ò´ó_Ω>çè4Ï=≥)üËë7/œﬁìì/^å^˛ÊÕ⁄∂Ò=oLãeÖJß«å2"F’¢éY‚,*≥Ät+vtq$T$1ÿ Ÿ	L(Õä®å¿(ıÈ≥ g©∆≈uÈ3^CÅ*Ï6i{?◊5À©Øƒ¸+:¨ÑÂS~È1œ°ÿBôù∞pV˛’b≠,'êíÊ®@*ˆ©∑ø$äæyÈWYƒr’,§”û¥3ÅﬂâE%9ò‹·Wè∆'µ¡q∫Oª÷ÏfÄkN}):XœøJµÎä!∂ XcÚ4¥‰ïì ’>B¥jû∆@sÓè∞/DH¥»i∞≥-∞od?»Q´Í÷;ccµÉ⁄¯Ω*É†ÂqÚxáåÖ„ 9x˝Ê)È:$5ªﬂÇ≈
B&U~Ô]xIØ)≈™p]ú†¨]†¶Œl,Â(3ñÏ›‰üöÀÙêGqg-Ì›4æh?ˇ&ú’üØ}—~^ƒwUûØ}—~˛»É(=o~”Æë≈&·£Ÿ«˙35&ﬂ`íΩ≤CFnÍÅét NÍ2ä`f¢M»Å¥F∑e(Ø˚a7Kãj÷%Ì'R|ë¶Á[}«·‹|9^Óÿˆä)=¿™ñ€‚ıj‰Ãß5óΩ®ºaÛm…Õ.–	¨Vä‰MÖÉoÄ-s[]üsˆ∞)ì>vøäË,Â‡^
ÎÁô'ù¸ÊM´Úx≥˛9
.Ò≥6m∑…(<
•4∂ÈTeJà∞2‰óWπ˚L	™2ÒpQghqÇºˆöπ8Û€‚2âWÀæz‹“V+œn’,s%ÀDaÖº˜√˜ˇr˙ÍıŸËΩxsÚÚ}Rø a|Ù‚Ñ—·…—À£ÒŸkπŒ§IÄU∑0WK®[òIZV94jqu?]§9˝8Fƒ[ÚåÙπØyë∫i,S:∏(^≈u7sNw$xºÏ≤à-≤˛q -®u"⁄áxG—ËÑ£,}Zñ‰»<’S ƒòÕMcŸT2óacwuLΩ0](|à®è¡/~fë£8CrH„˘$@≤É¶+ÓÿÃ·=]Ã”∫ ﬂ"mŒc¥HSlØÂmï˘%b¢Ö»Ka®ÿ9·á$må∑ë§Ë[¬Õhi$På≥ŒÚiåy;.Œ‡Jú%_µËÚ_§†ÿL˛Lé¸ô3•	‚sô(Ù∫£·?HébÿD±∑S˛πE‹ã üè4HBˆs◊Ï«ïK©≠¬;ª≠‚Ww±‚íZE˘$ÊÇÙ‘HT]eñ˚ h=:MKÌ∂∏ã4ÿY„O≠‰wN∂^“ÖN¢ g(ÑŸAÌFG•ù+–Bëÿ%4†C*ãm.ΩœˆÉ:jπõ¨:CﬁaêÀ4ı≥ß8¨—%ã`.—^ÄÇ?”=Ú›wZ;Æ©Í˜÷dÓCXÚmÈœ∑jó1NÕ;¨‡›úù?‰˘Œ/êÍq¶≥=û;ÃùÒõÏü«…>°®ΩãDFg9ø∫ü#^,¬™N∏8» «	b'ÄLÍƒ#óÏ˝8Œª¸*ãsN˙ü‡P÷@ÕA7?¬≠êÍ
ŸS:ÙÜ	ÜØÈ%˝ƒ@3ysE|¶¿â=3µ≥îà|¨©Rg÷SQ6,U
Âc π∫˝Ö8*ﬂõ«Ò¨	äf"ê˚‘_¯A¬~‘Q»=]D	˛Cã?ØCıæ·Zq,
™9±¢öŸQ&{U≤Îœtd"£«¸ÿs¸†í®OªÜ‰ŸíoÒíœÌ®∏x¯Œ¥‹™=Eœ4üäJ™iújï#6KßxcÍ=$b©·#˘5¥O=ÑzH6îï;@t˛Ùàb≈U£	—k$ã-d˚ü6]<ƒ(ë‹iÈ^ı¬Í"‹â4ÊTÃ@⁄Z£—à+D£Ä⁄ß."±|@‚!˘™eﬁ LâcF£Èú<˘k,ÓÍwΩñßÈXÆ?övÈ˚J7ÚäcGÌ2 ˆ À [¯Ä‚^Ñ◊ºÄ™vî£∏¡ íx≤πæEeVık˛ÖUbà›lY}¢°v829’ÛŒÒ∏(±U&,öa∞Jw0hJ^0º˛	ESÀ£±Ú<Û-Ìà°…Iè,«‹®RÀ.Ωúƒ!»<#aÑIpØÀ|=∞1≠sÕqz[Ò™J°¯5ûcLoX˛Q>QÀ@◊p~®"¿Kcœ˝j≥´r’yúò~⁄Œ>µµÈ©  Î^èÃìﬁÚŸî∏¢_)@	∑ÎﬁÈï€XCHñ 9D8ÒÙõ,=Ö*óç÷|ÿ	wµº˘N™Nπ@”≤ÒÀàôH¨⁄ﬁˇ≠x ˛°a,Zvì9£3eJ"ÈÖt+ÂçEºF5iïÇ®oj°°õ“‡AÙxÂÙIÏŒ›ıdæTG„Â™f&<C$ÕØΩ∆¸ÍL˛èõf˘^≥nÔÛ hù9ÛÆ]0MƒoR≥µﬂgå≥0Í‰qo!∫0¬ÄénÇFawÓ¸…•ÂyﬁM&¡Ï∫⁄qE‚$Â1º  õâ√fù°Kﬁ’¸G]^\ ]cêzˆn>≥L.õØ≈ÊVÕ’Pö¿É3‚™∞πæ©â–È8z?cˆ1S“ß⁄Õ™¡ÿ\dê3<ß£”V¥ Òixı∆Î√ûÉiA'·Ìê…ù3á„ªÃ…"ÇﬂÅ	⁄
s^-è∞)˙eë]TZπû(ò§˙,Íq∫Cz·¯<å8L<ˇüÖ‘Ó˛&(ª{÷◊ôÖ≥yëΩsË‹≈)ÏryèD◊∫u©√Mà±7	⁄ßﬂf†7ïæÂΩ÷°¥jjm‹°∑s≤I“Ëiy’ÛÁjdtãÀ,†æ⁄£¡3Ÿï{@O7™—dm¡}˝ë,À›ß7"˜õçsã¥”‹yÕco° 3Gµ…sd)ô©∂2c\◊òÚ‚]ú“†û%å&®XzxkSSGëÏF]¬»€#«ó˝t4)sÔ‹øRò¨tµ±T’Tq¶nÎL†í¡’ç{ÀeË∫˚¯≥mßı©ı_N?¨2U»-œÖoÇX3S⁄kÈª%JìtˇVË,Êﬁ[5ª¥:∞ﬁBxÃ“Ì⁄k∞™ﬁ‡ÛñÌÖÌ∫◊ä≈—#7~¸aì˘ÂÃx©3”tœœÅ‹I\)s”˙L”º˛¥4ôyf*Å°'G3ΩkSc¨˜y¬V7o™À ˆÏÂø,9ÅˇÙGÚqs√¯èÂê[û€åX›ÚaI"HÎ¢a° ôÛ’ô«c`(p5n¶!§6árû’†tôïRm ‘&Ø™\Öâ∑s(LÍΩ±ı;”ô˜ﬁ>ËÃ‰8Õ∞?l|¡|ÚcYÏ“5ôˆóZ’≈¢q=ì´«Ú;Pnßí›Öpã˜RÅCaf,À¨TO‘-≥µü
e›ëûXˇˆ.<S‹{·g)Ã2Bûö`OnLìU
°±17Îîç„ﬂ≤gÕ/÷ä[Uƒ„ÿò¥ä¸-6±[™õËCñP«Ö#ó|a∏’ˇK6ù""5œF—∫ùâ–ΩS- °ºŸá¶í)Û7Ë7û…<∏—·Ö∆À¿T}î∑pZå9]Ù"lM9V\GÿQÿBuy…]bè*.ë.@Ö›[á∫ô˚US	ÑìC\ÊD ∞öÃ˘ÁM¿kèM¿k∂`˛z√Óõ9LGy€“R pt¶"ßQpÆƒ:¬Ú@D€ÒdK¸‘Ô¥í∞Hh£Û«öâë¶P$–é\‹⁄Ïò‘xÆLebÙ0ò|ÒÊ≈õÒË•ñÅàEy0I]˜œ—gbôﬁ€™–Ìe”h∫vˇòπÅK≥ >·∑^ÚÕDº°ŒZü«™ıÀaôeU≥‘…o≠ 4Lﬁà|Ÿ8˛R:Ÿ»sÄûUoìZJ,€5o)â3Öï∞˙ËJâ⁄•πHe,È5«ò?•>[EÇ√¯“I0W«†»ŸNO…ª∏Ù¥Te˙îrﬂBîƒÍ\V÷G ˝qÃÔg'œÜ¬å∫ﬂã√Pg3©⁄ÈKÃó-ïe±‡» Wu…—n(+‘ñ√Hè37Fùä¿»µîP\%4¯m’I∏ÈÖÖˆ
‰≥`e^÷úh¥ë4√∆¡©M6VçE∑ªãW!‚˙⁄d˛≠Ör‰ßLm»—≠⁄}O5ÿ•≤hc©@+ıíËπ&7Z´ÇWÉµ""Æ9~ÆÑ$˝/ƒD1©G∑àInë*˘sü;¿ô.·Z"Ï]Ø·ñ;ÅZÅDÕìtP&‹àPƒÊV1TQc5¬? H/@áﬁ),)„0P˚òzJõΩŸ3ËÙaÄñÍL-n¿ÎµSâ/=9ﬂEDgÃﬂ 	8„Q‡ïàÒùÙ†UNU≠CMµﬂs¸¡ıK.;´@è*VÉ-‘Üî˚≤¬VÚä?µxHç¥£Í·<kèØfŒª©∑Vdœ»„°ûiÙé8i!˝TQ€-.NŒ^!(—Ÿõó_}≈S∫m€h∫∂ˆ£PÇU.4˘œ ÜV≥Cá≠˜Ä!Œ¥Z¨ƒ£ºXâIyYÖ∏Tm´ìÿî5∞kYÓêYkh©eª]ey‘ôúÀaZs–Èı«’ãMI‚É"èa∑Ë√≤ËÑ!QÏ•tQ:l¬’m¡%7†Qz≈ √ã"\Ê˜∞VrË‡PbÍòÓÀç€F'bdO®¿ 1X++f;Ñ©çcV∑∏nc¨≈NC‹¥fçÛm;{w%#Å@¨+58;3%˛·˚¯ﬂ‰òMú∑\U-ïVe§mu Á€ÜA)m’vàpe…Ùg(‹%}ÎLÃ>ÛØã˝VdMêiôñÁ4S"∑ïaÍ–O”ﬂU¢H
rÏÇ¿|˛ùõVƒÙiíY<YÚÀÏ\ô≈!ƒ|	◊¸M3˝Çpã0sa`/:|c“Jì∑“@,~6∏pÎœpÖ¢›7Ç_f){∆#≠ ‚mJ]rJØ9ÍÌ´êß¿ZVæ~⁄∏w∂=◊váTv%’÷xVèpWTò‹d^È9®*Ÿ/Ãô»F˙†ÙUê£ÑîÀÉIHb!◊_ã»9DpÒ∏hb÷
0´ÿL4Œ"æÆ¶µK£Ùöm™ÉÌÍœ…Ôâèïëw•t—=“Æ—ﬂÜü™J-¯‚XÊyÍÎb•lö≥ã´ñ3û‰ÂLÉ4ŸxÛJzhÈ;%ä∏∞|o}Î4{yõ”ÇZØ¨üz°≤%ãs`∞f•zﬁ,'ÚZà≥ˆ©1TÆ>|„DÊÍBË™•ß3Üá5⁄Ó©&≤ŒÏà≈VôÅbtFIûÛ:œqçZ „∆
p2Y¡G/`‰≈ÏfY<g±FvN±Ñ|c’∑·pÿu'cY·n∆¢ƒR©ñﬂŸ(¢§ﬂßπ`2ºf GÂll –ü√â·mÿŒä)8™Zx†æ¡%U-ï‘ g≤nJiU€##s ~,Ú}‘Mu%Õíqà"&¡ÉÊÊ∑Ÿ∏Pˆsb{º≤	Z(í≈t°≠¡Ø,bÑ·jYãTe»+ú†NBKu0U€∑ºXÚ≠J«l˝¸5é˚Oué˚Öwß@ÅNsÅÂåE\Lˇ›¶¿ v]-»-úxÜ®ÄbzÂY 2¬vüÛﬂ8iœ|ëDÔ˝L˚	ÛÖÖ√Uﬁ√¨ﬂﬂ‰RÃù[ÃÆ¯´=Ω‚˚˜7ø¬™πè;˚æg˜ÚÜC˘,√gÍ•[0MΩ4¸=Ã7 Õ¬sˆMô&g¡)≠§ﬂΩ1Ñq!n'H÷Àåèv¯ıƒ2ı3·vß)◊voÎV∂Ø|;K¯Ãi·`U•b›A$$µ)öóò∆Œ=W ®ã<ˆ™¥áµ3˜Ïö≠,›5t+ ´tbm:)S…Ò‹qÖa¡⁄∫∏Æ¥vóo÷ç–b…˝∫.ë k˘â≠í^ñu£è∏¨´Öæˇˇß#s±âS´ó%ò∑Ã1XÍl∆¸ô1∑ÆÚ-KqÅªÒÅjé»%àPò¬äüG3Ú	0AtèÔN@;◊(XçØ˝)Yñëet∏>é~¶∏/A’sòñà≈˚Z¿mu°ó‘Ix∞›5ˆ‚iÅ%»2‹q	÷ÄE6ù<bbô∆0_Œ‰⁄R+[IYÿ_Íı´ís∞‹Q÷¡íÀ;Àv°0.€ôx`U&È.ﬂV%™úŸ6≈gó‰xTmòG„Wô˘ƒ ‘®Íø©=a…<ò›•kΩÏÍ˜åπ.0á˛ò-óŒ◊≤´˛;LàéÓ‘9<N√¨L∂æ|˚Íı·‡dÙÚÕË≈‡”\ã°\ˆ◊nø]vÄ∑ÀV\ù$œª±<±∏ÉDèeeR=ñ•F—ùw÷tA©æ–™∞*<ÜÜCQ7ï@ñæZ˙fP∫ä`]≈DBnZb◊ﬁ^wI#ì:+D)s5,wR∏ûÚ¨˚Œ¡Rı≤°ÌÉ8tñê}ç ï≤“]}E ∑q˚YÊ‘›2ñı†Î¥-£%Yπ≥.›Ø.v;ªkSﬁÛÌüÖ£ØP§Òê\§˛àç{YÁuªÔ=éq:'i¬AN»óA‰-ÌÿVIæwØ6%–ÇΩgõã¡¨Ûˇ˝?¸?>kËﬁfÉÔÕaÙt;áÈ◊æ7«ÈƒCDè9ıg.ãH)Ò•-Ñß$Ø9Ç°kjwsÖoÏ÷≠zÑu#·B«€⁄˜ÖOuvu-Ù{3 ^ÿ\‚VC&´1˝’X…¶l”˜/—»Qí⁄∏«b¯ ƒ}F>+Ú´â~Ã§'5n@ΩÄ~Ÿ2
õkÍ1_±òŸ»ò%Ads,±ÿÚ’˜Ω˝.ùd>ãË%u¸;∞2ñüÕ&D’≈j7°9ÜDaÊÆ|=Ëo√Ân˙⁄ƒiMøÚZÊ4≥yû¢#ËøMíﬂÓ:Ôò±˚Í‰H’"™ü‚ºyKDÏØS'bf∑KœÒ˜z€6W.ıLL0´¡|á@Mõ∫Y •‰jƒ˝èÃBñzÈ,´móv©Zjø[-Øx m∫•ZJ%^∑iñÏÇjÔzö,.â⁄ÁIk}ÿj“[c⁄¬'
LÄÃí&.;-πÌN~t¶s6]LÇ+JÃü≈™x\û]Ωf •µmÌÃÊà}Qæ®‹ﬂY7,çj<—t´Æ89¢·û.´iY¨¨k’,uôQ¨v:m¥sWÚë@˙‰ícøŒ˘øı≠d^*cä0ÇúQo¸ÑyY'‘HÍ[∆mÁt‹\u≥®¿-õœké§88ß3≥fÛ8"ñl6è¨OUDƒ4[FkX±G˛®ÌI7ÁlñW;K]'&¶ç˙ÒRïÛ∏S'ÜÂ:Ü\Åáaã^Sôl∞Y
NhMSTÃ∞A+ly!ñ?ƒbsºmLÜF–jﬁj•PâÌs+áiÄ•DrU^_ìÔæ#üÿ
JU=*O.Y?´j•M)@ê–ÓeœJòRHê†"m⁄(eKjâZjw:ŸwüŸ5–£"øD—Jéuoj√§ï!jª¬
ÌøôÃzsÛVysa>[ñP˘V‹˛÷·fi[_˙æˇ√øë±„°Î37¨PÎKö^˚_…ãò-R–ÒÄ£V-ÿêU€´ï]Ûƒõ®ïY˚ﬁ]GÌJBÕ€˚◊NÛy-œÕ\k\czˇÏ~c Ì¡ó3jd6æ⁄@u£h%¶Ÿ±≥≈Ë¡ç˘¯ñù∞m<Ö…ô¡‚$òQ7á¨m∏EEì’\–kò]≈ñ_…Ä–„œ‚¬›®PdÆ∂*Ω˛<sGÂh◊ñKoC∫¬∏¸ÇY1Œ(FπŸ}›Ä¯Ûùè‡e‡9>µqÚ}ˇ}ÀÒCV÷πè¢@‡Ëp±NHâ58W≤2pÆ§&ßSî•;†s˝ÇÖ¿Kw,Ñ©∞ÆU@ó
ÉâT^8p¬Oa…ìÉ•√È¡≤∫î∑∂Ã)¬rñ›üß„)åì°À#ﬁ°ê˚¥¸≈“}ªÃCruø …’œ‚°≈ÔP	mJÂ∫wÒp^+ ùuÿÑáÉ#fÙzá‡M.ãúiG?kéiÅ!s8Î"∆í/æÌ‰ˇπ´J%•*råﬂÜLéö»%Ër€ôVù˙¿g:E&N‚rÎ˚–∑7øã“Õëµxös{ÉN±âù`?4å4iÏVé±)Ï?,·ŒÖv»n B‘'˘#‹^Jh•ΩÔπΩG<à›®˘…Ÿ¬
}™<íΩVZr4z7∏∞Ÿõ¨,› ã8≠¯à∫√pºèÏü=DGñ˛‰.0…’/ ?êé˜—Ò&á¨|òy˚2Åf7˝OÄ’¢Ø3«ã˙óúO]≤Ë 6PmË¯S(A‹ÔyŒå[tzk ƒ∫⁄^‡ç}ë9ò∫»Õ‚sŒJ+Áœ}nixH2âÇºsD†˙ºÁÇf›≈bS-lñÈgµÀâ™<˛™”›†Àv,BﬂÏÌ”Ñ∫πE‘Òù˚ﬂ›ÖuçÁ[%]hùÛ‹œÖgÂÂ˝%˙ßˇﬁuW/uªŸÓO9˛%Ë≥R§˝ﬂ]/sÖ∑´5™ÏÆk¢À[ÇäœËÅrF';dÃØ≤∆qT3Í∏EmªÍçr√Hôœ<^±◊$“™¨ÁÍlÁõ€M	ßCís≠ìÔiBíf⁄Ò˙Ñ„Ù|¥	&„ÄF≥v6˙vzñjj≥,≥∫G]¿;En≥Ï/teÅ«Ûø*◊˚òTΩËn5«`N°ÛˆjI÷UyŒZÍê1üŸñ0˝aÒYõÃ¨Ì˜DñºLz
ÙÆŸﬁláéÇK¸,U¸rw#UV:U
4#lgÓ#7µ4£áÀï‹ﬁÿXﬂ 6Wˆ’„è≠<˚hªÍ2SÀÑ£rô˙·˚?˛'r˙Í5ÊPç;"'oŒF„#<∞_øz9>zqJIã D≥;§LöVqÙ…áùîvÃÑ\=ZÍ;ÓçÈ37•…!t§Ωù?íˆµù°Á*n≤X<aÕﬁjgARÙ°fÎ©qÛ4N„d$V~Î Ûú{Ë∞.í°´S<,XàI´æ/h$˜fß—ö∏xíC>˘¡c–nHÂ¯ÛxC·Û∏`ÑO`,&˛%ü£~BSÏ¢¢°Z:!Óh_À˙Î—4L}Ênô‚hNØüãX˛5ï› Ksı(8¢Ú¨jƒx≥®ninâY¬aÿ8ø÷’ÚOøf4|´GÅP8>V∞z˛ã(
"√ìG±xñ˚bûÁ~•LQCa:hXÏ·€÷ÈåP’|≥Ôd.ÅáM8ë«“FÓNƒÇ¡Gêø®◊.#*Õ˛-?’ªßn8—‘-2◊n+”kû¢åÁTjüF©tW´Dp9õk)ÛDi„/Rÿ´"mÎë?s¶(x≈Fπ£{;UƒÖ>»c≥î3biCæ)™‚â FTÒ¯îØ≥äE◊Ée’¯içó>©9,K…xK Ÿ™kb@ŸÉ|[∏∫‘E_C†î‚äº/ÚÏ™ö∞Õ«ugããú≥ ı»*sÌ∆˘•]YDÓÇ˝4∑‡}à¢GJ+H´Ÿ3ß‹O˙Ò–À@j–U ıé˙7√$r<†¯à[
$Tèá≠ÒÒõ<vÚÁÍˆ™∫dﬁ3∂ëIΩ5•Àå6≥•&üÂXë$Gµ9tƒÏ„&Ì[U¬—Nƒ¸'#ê9œ™“ﬂ˝PébVE8}–\ù	®^•#-VÔœÉé®Ôòx4;ü¶5±$ç|rN›ò©kdOÈLÒˆy©¨“	∑rU	ﬂJyZ`¸ÅÂ≈°8ö¢M§?y»ki}á‰ÁdC˘òr*o°… ˜f4π #h!òËÚYƒ|‘ﬁﬂÑ?≤\HtT§¥¬ú«ÍZêf].¨õú>+«/ÚﬁÂ=’ºFlñN∞√‘
'Sè¸^ö˘uÏSL˘Ãíe#úÑ~zDIñí…Ü$ÌSÅÆß?'ÇÙ$E± w¶G}Ω≠OHáú|^G F≥ d§l’ƒÃûú≠à†≠Ñ§iD©L¬‰R‰ùVbb·_WQp3¿&hlãax¨s“äÇ'é≤"ë¸∑≤±îÌwñ[mﬂ•æ	W_£◊˘«§¬?&ôˇ	ÚÖ1y≠øvﬂ¨CÚUÀ`zBü PLáÆìêQƒhwìiwÂ9^èÈvHæ»Ÿﬁ·m„≠"t£ÍÖ¸ÈM√'í_¨7CÃxçœıgπóf™T]ÙdÆ¡9s7ÊÍ7õ[Ω€“ì–/!Æµ∑[‹ªvIˇ∏ºïo9Hwdñh/Æè·≥Ò˙¯ë*‚™ncUwVr@%Fµ¯”S˙.s¿ÇO≠~è*ÆQÂ=P¬VHnPsç÷-ÍÜ∆•˙êû'x…;tM}ƒo∆ªH`‚‚ﬁ3øùTÙOr7®Òói.wÓÚ†ËﬁÓò—h*u=◊@ÓÅ€Ω’É0P7FÒf˜Iä‡a≈ìiÕå≠V«•ëC`t˝Â—XêñA¢Â‹çOçäg»†–N™m—™Ú∂;xJ¬¶7É"Œ )‡dbºŸ”r˜!aP0~÷r•ê¢à◊p”Jgãpöpê©NßiΩ•Î©í‰® J,ê+ÅRπ5U Å»	ëÛ#˜è–`˚Ë>T∞€5TèÌ;†z4\G5a
L	 –ú2Í—‘ïè¸Û¿
D’D-Ã•fΩYA{5ÂÎ.ÌÂ—á£Ö~újGM-(F(åL«c3'Usæ!Ë≥ŸIC.∑Üè0ÄFòb≈
ÄàmÎÑ
˘åo÷–a:‡BËıGÅ·1üy)nàHŒd8ŒäcßTÎ†˜€’yÍÍ£"CzÅé.Ì5„a˚ô>cTŒÑjø·
(f˜}≠–∏°„’C—≤˛Bßﬁâ…ò”¯êM4Uài©‹Yòk'h≈i‘œ4@É}A©jÎm‹q¥N|êFÃú{=Œ¥C‚ÕÜ≤ÛyÆ∞ó+Á:ò.ãª-b#¡¡# WvÅm¯@5}ÆHÇ|z#õ»Y>∑)¬NçÅ¶¶c¢àÈîôX[UõÍŸùT†j)f◊áÜÕÅñ·Õ˛ZRÖÜd4W÷àÍ;ïA8	Vc∞	ƒX·Çf¥©ú õ>XŒ.‹ |‘å£∂»÷ÿ¢CfÌxª\˚%£ûaoî!e¥^zäön3ø«l«6NP◊€¨¢=!°ÃúòM“ƒ⁄ıﬁ˜∑)†øÍ„fÖ1®ªÅ®ñbFÎWrÀÁØ|l>⁄˚:ªàÙLû±zñÀXHTgŸLå¡°m5Áê£3‰RÿÚË∂H7πºh;+ßÔeÏãl‚∑Âóâ"@ƒ`>lÙ∂.”ﬁí˝‘µÃq`E˙ﬂ√…≤Fˆ±G∂®‚⁄Ldó†ÁÓÅŒmX‚q]Ê.‘ªÓI ®´•ÇVáG|˜<¿v;˛ò•"°«ﬂˇ√ˇµ⁄ËˆëøÔi–¯⁄üínH&Ëth˘(Wœù»Î˙ˇÌh¡„≥ºIûiÎôu‰”∫˙˘_˘Âã;n_õ9ëàÑ◊dzAùÃºBp&á≤†€¡¢=≈¬E(«~‡Kˇ=FÅ&]f®wB„t±‡πU¯PÒâ¢çÿií6<óﬂ`Bƒ˜¯|?œIˆŸ`Ùê<Ï?$œk;ù†OzPπCÖ)∏µÚôÈ2ßÖµI o¬§“KÍ$∞œﬂÑ≥2(¨ EiËÜ”ÕÙ«RQ&ª¢–‡)®4 umÅSÒùbOv≠Œ<#î˜Äˇ…øŒÄ:·<+c·.◊RU	›πC} xó*
X˜fn;·ov#¬£ñón'çä]¡\æ◊à∏†QRéœ Û¬Óô99ÒÔBÆ±tDdíH@~Í∫ùZπ%Ã·˘=LbÔ+ä–˜¿Abü–(urﬁ(¬ë;ÓÆn£¥~÷ˆIªÁ,≥ÍíËfM-Ø¨xYNNy=m'ãjP;¨	{S÷“ÀÂïµ’	¨≤ÊáÔˇ¯w+ïVWd˚1AÀhvÎ≠JPS®1\%öå•«o≈)i;"50••8◊oéB˙üäªx™Ù¡?‰#ÂÊä#TÇˆW±Ú˙!¥<ÊN2ïW·Ú«œ›OJøuElQ^Kı.[ülπGë∫IÈ¸w»¡…)ıô+Òîx¯µ˙≥î«üd®À˚ *G∆‹S+t	|R…Zcó¶ìÉ!ÔÁ´†J§eoá…=ó¥{œÚ´5ñµ)E•°{®|—Ú›CÊã¶HYJøRØIQö'ÕxihJ˜’—{“⁄“û›
6{Îƒ∑‰O˚/$ìÕ~ü˘(§ﬁï˘èÀñôÌJv∂$≥ë—ÍU™ÉMéÿ§$7må”Í=^-±V·-◊Ã∂]◊j˛â™Q™gˇ,M“P9˘:©Iój…ÊàÉ(!'@˜∏_–~peM˝xñ¿™¡£µ;bˆ˜„jm!€ùoõéxÓÆXANS,≈I<R=È?|ˇáˇJˆY‰¿§å¶4¢‰˘í.OjN∂miªçÂëp6∫ ‰aÀ@ÓµdH¯ılô∏/2qÉÈ¬@üÚƒi§«t?%Ô{Ó˘+·=¥ªQj—–é¶˛ﬂï«ΩÔÖÀ0÷0’*ÏèÆü•oSÌ’⁄«ªÇ5oÑü€Bé\Lö0Gï˚êK‚+&æÏJ
√Ë}/¢ÊG/˝ˆô?u05ªLïà—©[‘ï5™IR'ÀÎ∂¯à7´°zÈ[´ƒßÌÛUCpøzƒ©Á—Ë∫Sv·L4(¬•ïbÅx¢-4Ù(cÇaÉ©ß´ﬁfŒo⁄<°ÄÕ.«S	P~∫QF™{”±ÿ∏úΩy˘’W£„—KE§u≠„VŒ Ê(ÒÜfâ]-6&l{?ÓºX˘sÕØ01ü‘œ€∆DÆEÉ©2Lµÿ∏¬ÿlK´Ç+∏-ßπf‘˛≥*0•˚∂uüª—áÅÁ•KñT˚Õ¥∫≠¥‰F2ªÿÖpõõY ÕBƒ0Ì7µ-6—„:Õ›h¢¯6Ùpì|¡@Èõ§4‚-…5®Å>yÎ,h5Ü’SÅ(ñ≈»œÆ!)IËÖÉø¢6|=GÁâVWÄc∂—hŸª0Ag¸]∏óíâ/Ωõ/°öî|>{‰ß√Ë+™b#›â’óŸºs|4ë≥—>˛—À√Ù;‡A’zN›Y—rßlP˜√ûö,AÔ„mú…<Ÿ©·¡˜@ó-‹Ì›g@%'.õÌÊãÏÓC:•éŸ”rg9ûNñÏëoO\Ûê˘há≠"úó	cja;§»!.æ5˘?~FïO®üR◊º⁄"ÜYJË]:…|—KÍZ»˙0◊œÊ“∏EıScp ®p.d±ÏL^°’5œ‡
Ì≤ÛnêÍíÜ/„2\çÛÕw˚Nû7¯hÒ]Vfõ	.ôÚ˛ ã… ãâ:˘mBjéæƒˇÆ=˘&Ø{ä‚◊"79`,lL‚â\Ó!°6¢¥Ÿæ	°vì‹H|¬ÕÎ5âGDo0±æ|,“«ò∂í&ãá(Ç 1ª§oùIñÇÅÀë_”ÙÖ±»’†Y,›]•k‚Z`M`¿⁄|Õ÷V”=Iuïñ_ÌÎ•∫ªBQî!Œ¿Jp'Ãb°MZ*≤¬VÕGÃ*J√.∂EèÛ–©W]s∞˛&ıT∏=˜⁄√…±«Íº+˜⁄E˚I<C3˝bEmŒú¶Ê(≤Ëÿn∏6ö„∏n∫ôˆ2Ä>≥ï≈(kÿÉÅî≥`ïÖŒ6ët¢ Çj=ﬂﬁiOñƒ
…ãùIKDÊ“%ësIØiR/ÄÒËLy±ÀıgìÂœ.≥˙7}áÀïW∞˚¯XÃ˝Œf  &˝>Õ-yì·5È`@(ˇ`M$0VDuªâ0Z‰Ö[L, -ÚRŸÊ-'t_µj∆÷ØÕ‹ =∞,lÑ’ı†⁄¸?·Ï€∫S6Luüı·ÍÇA«π1¯Æ·W9∂ú>k–2
=/U`ïfz?Ï…Fâ7ùIäOÎ7˜üvã»®˘πâøS}íÅ∏0èE‘ù2n˛7∞‡Ü`ûˇ≤Ÿ=sÙN£ªó‘yß◊Eu]ñc˚÷J'^Yªøiáø©ùŸ•=-yf„.Ô0·‰Tã˝ñÂd‰nª&¯ﬁ5t´µöÂI
(«tÓ∞w”uü]áå∑˜g~‡¬à≈h%˚3Ï„>õ–òkØ?|ˇØˇ´«; ≠π`Á-
≈º⁄q˛˙Á˝á,⁄gT\∆¸˝˚œ=€⁄r‡–ÄõzDLö˝¢⁄Ç*‰OØò»w„L≠-e%ÙV∫¥DfÙÂ≥¢w¥Ÿ6KÃí◊l ú09NÅm%˝Æ-àŒ√÷à√∞s&!3Ó˘;∫{’L∏‹i ï][∫Ìñ»gçO÷—¨kê Å=Ö5ëòıAÃxÆ˙Œ3◊±œñÅzyi@GâÓÖ·∑ÌÙmàFizÏ2€ﬂA›;å¥∑¡ËØHtAr<√Dó‰ 6¢yËúb~M≈q∫&≠ˇúòJÊœ:‡°T⁄÷∏k åâô4ss¨É{ò_Ω√´∆ÌÑ´‡m∑Óq¬ﬁjÑ;Héê’:x!uöÒ‹åçΩsÀÍ,¡#Ó¬%Z|bN˝ôÀZ á·o˘ÜÍ£˛i≠Ø‰E‹ª!¢ß‰πÂeIVäo¥Dç|‹5‡7/]∑ïà⁄≠àUV·ªeÈN,CzÀbg™4ˇ^ÂóÚ˙:å< 6Ä◊ZG3û¢Cï∫m»;¡Á‰Ö3¯zwƒ·Ë*)4†O:K9T )ΩÜcö›t/’Ÿê:£)`π8ÙNÁë˝Œo^ç∏zGÅıN"ÎÍÑ÷eƒ÷ª	Æ+];Ø]-¯”wv3tä“AΩÊ
Q˙nõ<!Ù2n¡⁄V≈ª∫qÆ}Ùœ4˘34À¢ÎÍçü6◊¸’&ÎÜ——K	CQyDGQ>pßÎCi=µªÓ∏≈ÜµÔ°VÒô«ı”…˘:Xﬁ˙oKË≤É◊o	z¡ÖÁöo…ùyéUÖf2œ™ˇﬁªí^„`∑ÏF≠√é'Ä∫{77$ÛÎŸ!	¸ªπ›<ÕNAÌŸM˛ÏFÛQY*D‹ÑÃ3)ˆZ~/•wEÂEııhª˝>— Tïh3@W÷.#*‚ì‰>øªÛG-Õ¨Ùó—Æ	,©àõ‡-n2Z§>©Ïë˛h3†dÌS∑ª>$ÈT€9=˜^©Å@ÀQ·⁄#4 –û∏à òbj;o‚pg≠KÏ‹Çw.ıìT¶£#é!ãAD äÇà˙ ét§»åó¥}}+Ò/ócúÿ°S»“j*qì∏-Uˆæ∏¬Ëı3j0ã‚~qTÂ7Tu¶¯H0EÓ±q—ô=$¡ "ÁQ‡w%»)·€ÑQ∑…"%8 •*'∏kvÏº°<ø√Nå∑iÉg€-à 9x(Ù±a**r{í§‘ı0∏Ù›ÄŒÚ‘Sèniâ∏∆ˇ≈Ò já‡`¸ókÍl|*Óπ≤Öñ√ Ùyïµ«˚ÇÍÚÀÖ1®ï=/*EA§”ö∆BG0T9çÿ;á]f5AùÓÛ;ı„Gqm(ØBÊ˜ì(e“R9∞”∆Œc2˘∂Æ`ø|‡çmπùﬂÑ∏ô‹ µ‹—bnÔº£-SL 8ÂäRG~D»3ﬁÑŒ◊ﬂ¿?µ!°Ìö"u§
yÈ1È`ÓÏ%IÔÏ€I©CxËórœ( Ã‹4>p¢©À ¸z-N\˙Ä+ànÿv≠ëKãGrWÆœIèœ>¶ˇä0x´≤r›‘ÚÃm∑≤b˚4J%FY·ü€˛ﬂ%•ï„t‚9Iabö…Ü º„ñ‚sö∫â X¡I“àÎ¡/@ß&G¸ÈêãmH)>◊††“G5Äœ8Zs	€TLY}*Ké\…|¥TΩ]ÚDZIm.™MLÔò'›°ÖÀ`àKÍ†–Ôí'dA#∫ÄM˛âämIó‰ú∫±jMÚ‘DäTºÚYO¢kÂXpEZ«Cg)√
9r^CoYVEêS[` y}Ωyß’=Ω	«dcKc	†c‹o≤øLf°≤∆Kãß%™‰öÍÖŸ›©áÔæ#H™œüù„≈õ»ı«¯QˇºXk¯¬} kj2™6àÉ°ÛΩ˝∂∑
LÀ·´J
˚â¡ÜgÃƒ}Bñk2ÈZ⁄~≠0{Î$£çΩÀáXÍÄC5¡‡ØT˛¶˙≈ÿIq¨"vßc]Øo0w/sª√Â°¸ÍÎt9szC¯Ωü*V#*2n¬˝±2ÕBæ√HúbBj‡À!]Pá¿—K≈L∏O¸;òóô	 {’ÁSŒœ…î&”9pË(≤GŒXÙ‰†#1u
MB p+I -æ˙úZFË(£»∆bRnï	‡Ø$¢∑TU0¬-©î®Î“	s[™NSÀy¢IÜy∑…(4¨,ÖΩúøO—óªeèÿ_ßNƒT±*ıÑ·Yè£IJ∆ bëHÆt˛êåáßJ—,{xNÅª$ˇ2´≥LŒ+ë.\ÌYÀ˘≠»˛¥∑ÿ» éêëıd·EïÓ	¿?æÌπ_ÿô3´ﬂØ¸≥¸‚Èc€£üFÇN?Ï[lÕÇ◊w›üE≈∑I∑Æõ¥‡œ/ÇGÓ—Û±mK¥ÜRN5?£€2°ÌÆTäŸnÕ€”â>ı}\ázFå´ø˛WÒØ◊/í^Oø¶∫¢˛Âh‰vÔ
.‚˙6b<Rá“ãaËÎOTG¬x¶2<,Õô‚∆©1ßt 6ñR,üì^ˇ5ä˙Î_Qd¥vjÚäÏ¿„¸ı‚
ñ?M~•Ë»]OwÆ∫ôN¯ﬁÕ'≠´¶¶zÏ’∫à˝¸Ò<äqÀ
◊õ2˚aÂÿÒù?ÕN%sõ®€∂:™Í´ÜZ!Tπ⁄€ï}Êı~‹≥tò_c ‰`≥˙Gq£÷Åà»éì.Ô™!â@·¬µ˛4⁄-–ÔíJP®pQ7b*ˇÍ8àTSpﬂº•Ÿ6LXzã«<ÆãÂ¢à®Ê,íA¬ŒŒœz‚úgYÁ◊Ü∑{±=ïÊ€V†AÀéﬂ8‹e⁄QEß+AÙ§˚Ô£ïÉ^8˛ÇºÒg)∆?F∞ÓÙÇ√=˜ﬂº~±¶#‰Ú¿Ürö˜≈«€-]ê˛´0]ü∫*éØ"∏+O#WE∏§"ÿ<I¬xg}}9Ôÿ".\6úﬁ˙π„≤ı·pH˙|Bso	%≥™ê?nƒÎJ˚x•ü£n{„Â÷'5ôìÊ∂*#.d1µ@åßíi$OπèˇÙèˇ\ÈöJ‚P∏.ÆIØ“xsô—µÛX+¡‹äÿÌfò˜É˛·˚øˇ/µnÆd‹RÇòe˜ °:yEGF∏⁄Ñ2ÖA⁄*w'Ôõ†URøFDOeç.]çÿ√Gÿ^ÈD‹$àî·‹j˙Ã√xî§YÁı¨Jbßùy1Ô1wGPu∂åqÍñb(ù˙g≠»´Ï˚Ì∂/˚≤ÀÒT∂«VsÓo’ö5gEwH;	◊ÊfÕÎ%O~áéØI¡•d>¬}J!¿9¸ÿ+][@RÏ›Íæz«©2Æ#óU8b5æÕ|Ω]rQúê‡ºÊ≈aèª∫G=ï‰)í°Æ‹ˇi≥´ˇxbçÎS©ü»∑AÊù‘t>cë∏î¨å‹K…Ö±·R÷tF/ÑìÃøJéÑ|ì{z∆vP^mfªπ•¡œí	P≠dÉ¶√ØŒ’¥˚UDg)œjr 
UñBO≤p?–ú_qLÜ‚tUê„BŒú‚.w®Î≠´ò%@íßn3ão÷f”˚*ı9TcËà¿ Ú”9Y8QiŸπG„"snWÎ}‚∫∏°hx¥wVˆ‘≤ç2¥Tâéy≈—1’À≠≈∑‰â*≥#€ •aD©ÿ˚y£&Ëæ›$RAa c7∂jÇK#l°jqP/ˇg ¨ñuøvº	BùÙûWoIÕ@áÍñ:¡Fe^ôéOòQwÈQÔyq{ÅƒˆΩn¥ÄÉÚ
ç
ç˝N‘´1%≠Ò$Î∞
⁄1Vÿá≥õGxvx>8B›<Bà:¯ú ≤âŸsç⁄z±Lÿµºë¶]FzãºZVp8:›eRÂÌñòñ¡?vâ€◊$Iµ3NUÀ—·…Ÿ¶/÷–ÿ&˜È“ÀÈµ∆≠1†4&:îû◊äZ>H»<bÁ{≈ÿÏ√éÖEkØ˜˚âK˝Ö}òoƒ‹Ωû!f$∞≤ÏúEQó@a]∆äÚÙ]€yË3J°øVÜøcE\µÿ⁄Æ·:µ'∂
&∂!	®6aŒzÚhçÏÿ:&ò∆fnèñ S√"Tf¨i$;±¢;B†¿sTÙwU4¯N3.m\9t‚Y8¿‘‡∞∞ä~€ÏÎ‹?VZZ≠È¯1›qcñƒªãYÚE”8”Á|Œã¢Íoó	
]ÎñæP’≠ﬁµï¬G•≤ù∫∂Q\+˜Ù~Òí™‚V¶‡Áà°e€Ü%0«	»∑0à∫:ñîîÎeß∫®ﬁàîoò>ÜßFLÁÍ‡≈wqÁñ´Eß§ßíÜg/u˙xO«}4'Ml\ªLˇ‹âÅSıÚÌ››Ád‰œ0Ω(˜≈%ª1ßaãˆäôÈ”B«¯º»`Äò¨G}Êøµá”±≈oÌ”‘-†QVD‹À!sôm‹K≥à8ò`Q	É©7◊ºàì˘. Eù‡â¯p]ë∞∫Öõ4KÔ∑•[”$èDô9|ÀôÇNö•#”í]V±'Õ“%•Yäà∞¸$VC¡ÓqÜÏu@˚';G¥.˜™ïqgÓ_–bŒ¸cÁ—é57*óﬂ}å˘,¢Ò|kY÷¸5nœ˚‡Õ+“HMÄ[kÂÿ ¢•–“yTX=´Ü°®~açå5N'oŸ4!Ù»˙Wiîí2∑@V,Z˘}"Z˘'KÉìıˇ  ˇˇÏ}Ÿr…πÊ´dcz,–MÄ´6ZRH©’läõ†∆aÀ:V(ëe◊"ä¶1wq.&f¬3«s·Gú+_Ã\ŒÃõÙ¯Êˇ3≥™≤™r´ëj‘9nÅ@UV.˛{~ˇÉì≈I%r»1†?– »ÕÉ›CÚÚCH”ÄöÖ
ÔYåq¸ä°g9gû¨∑í∆“ò‰ôz|¿®óé_‚0T0∂Oæ@-æùóZÈ|◊¬–xÈ]¬–JW	°µÑ– Ah›
Ç6˚L	_$ª”Ñ£3w‚hÚ£] ›∏ñp_ùÕ]¿›N˝öÊt≠5Êuª>"—:„ΩB$JP‹ºê<b2Y •£“õ¯Z´– |∑0÷ÌMÛ‘˜a4®hîZ¶ﬁ>◊ı[Òã	
¬ó
±>|á√?ê–q¢l48à[àQ)çxfÖe∆^WAëî∑dÓøM
ë©K“Å{–ˇæ´H(d¸>a&‰uBÕT„ßÑ¸‡&ärlâõh¬MLˆÄ51/x¨±≥µ0a'
´∂ƒN¨Öù¯U«¬°…üˇ¨ªìØ®›ÕI¸ñﬂ-Ω’V$u›QÏÄ)ÔOFÑñπvàˆ∏œRB?3L‚úR“÷mß,r![à ¸suÅ*Û≠X¡U;|˚A+πÄ„ÿ±?ñÄï˙Œk +3±vÁëıTÄï¢Ù9+g›‰≤V>3xeıÕ®ﬁä* 66∑tx7a,ıq	cπÑ±\¬XŒ∆2€XÚ◊›2,∂›È∞MæoìŒ˘»êÔú¯Oﬁ*9\BY~a(Å`—∏gì¿+E®)•ﬁ4KË∫ãÓ∑°≥Jˆè;´‰¯á◊´d‡Ée&VÆT∆ßaè›hÆ/ädÔ ∞•ÉLÙÚ–ﬂè‘>º%∏Âœg{`Á®«ÿ€íﬁ7¥%mb~»ñVNlºﬂ≤"≤%w>\ÀJï÷3°E™<C›êr§ ‘ÂaÜ7§@Ñ;$5N+Ó¿ü\e≥T°UÚÌY¨“ ?ôdvÕ}≤Œf¨ÜW©TüêÔ˝2DôNRÀy({OB∞…\)Ì{™Õ.≈%πµ …m≤ä^¥Dõ¸‹ÊÁm“j¨?c¥…¢xYbN.1'Èµƒú¸‹òì ◊+˜Æí≤ñ≤∞`§J1Ìfë*ã¯å∂£ @çÚÑ≤íêRÂ6÷µ∏s8Ä‚ëß©ÉJ¢‘o•∏Y“\∫áπtJAñœDÀ˘ï)ñ=i^Ö˘¸kû†£"CïZEú}G˛‚ ∞òè4®òjÄC
@™ˆ‘QN±µi%ÌFLQ|5 ¶Q∫‚y54¶ÙdYN]’X§¶£:Ô%©ï·'ıFL”√ÏÏ€»«ógXõ9†Mj∑û1(NeS]ŒoÜf¬ªã≤ôú(4†1TÕÍ∞ôÖ”ä2Ÿ_»◊\(Z¢'˙É §	lñ≠Yq4≥vÚD?KKâ≥æ~y¿∞m‰∂AV å·TEA≠”£Yy9≈¥#;LKÌÔÑ!^Üë¢≥Ç≠¿Æ™®_…îÿÅJŸˇÿπß«2”ç¿˙§Ô-CÃ¥"6÷àô–ÊãòôåmâòπDÃ4›T±
G‘°dm™"d¶†3ïà"ãÌÊ£Øä∏Æ5≥ı©*‚ƒ›<f^ø»@Û2¥LAC∑Å≈Ña›$,¶\öÉ$˙R!2ã.£&oµÄ2πzPcígVe_$S ÆÖÉd¶"¸vÇd¶>-klÃáKlÃÃÂy{6˙]«<∫_ß÷ƒ∑_
fï√4≈K8\S·)R Œ,ƒ©∆œì·X?)^3¬\ä«S‰4s√hó÷gWä◊ùÖ…¨Ñ≈QæñXôπkâïY∏ñXô:◊ÍóÉï≈¬¸ÒÑ;óàâí='ÑZhLˆ–Ôˇ‹"@Ãr¥¯)ñ$SÉ\‚Ñ|Ô:∏ﬂ◊(íŸù|*E¨k«öÛ ú–5)“•z8·há~&äÄ2Öä¡˚J<B4ó∆bk!k*òì ƒ~≤?rŒ‹˝æR›.ˆÄ)ANô‰bLc*n«y÷#˘V±.√ä:ÄiåÈvpG=ÁíFD·ßô„T˝©
—⁄Ç≤ÁFŒê¢rå∆a“≠˚¬≥=C8ó∆ËGN<çÂ”âì˜—ƒéﬂ&ìÅãç¿tÚ*Ükö5ÇÔÂı
õ›„„5`1V*\¡‡©?bRºΩ Û‘ ˙>"=9Sh÷ÖX·’ƒSÃ†Ìb∑i0˘ ä#Çè˘±G¬æÉßA;º£Gß≠,P+“™Zî[å"–Jb·y‡çá-π”Og2öMDKﬂ≥*|†Õ”…1t&"O	gøaÊ˙⁄lÜ{í5‚Öá1>ﬁ€£8¢Ö:ücl8x˛õÁ+‡ı˜Ó!H>C'é≤{˛9‰àJÜ{ÿLË›√Gåw!∆{Ï˜V4_“ÛW±#jÅe7|º›‘zì3æg@d”MÒ^¨p§BµUS◊Gx˙ªÎ%ükÌ¬Ø¯¢˛∞õç ExÖ‘◊Í9˘ÅÎoı∆}:6K}…ù-c=3wÕS'œ‹lœ¨÷ÑV¯—.I˙.zÎwtØ1˝m”dßßÏç˘&‘C„D)“líl®™'ØW⁄`fDÕ¶≥Jzîè8î™⁄˛Å[˜&£©∏ÕÛ+;Ä;E‡RπL-ù/^/◊ÃJ„î":`∆ìÅLP3*^üãJﬂëa ,<¬¯"´Ï†|‘9ås™ú9ïˆ·‚
¢Õ'Cú‡Çº±|pd[Ú(ËHÂG4ÉH∞-≈{ﬂpzß¿˙Sñi$ÿÆy¸«íJjÃI‡mA~UvÍ:çw≠˘5§›2Î —üT®&‹ B¯.ã·œ.àg≈UÖqMql%ê+	æ9e±|≥˝≥\#≥pûM<◊–≥âË˙Böäi&RU¬HwXë⁄Ø’”≤5·≥ŸlüÏÙJbﬂz„≥Ωâèu÷ΩèÓèä3d5L¶¥∆¡“jZZM¸ZZMK´)πnç’î0™1úR∑ab5≈xÊ˝sYMj≥Èπ\Ë#˙úxÛÈ$r|˘§⁄6qLŒåÇØ´®ì=Ò'o
ÏuÏ^ê∫øı¶jJ-û Ët´O‘∫°ÌD4Å˝ÖÚ« ≠êîroxˆî»gAk£¨≠ëÙ–å3dËﬂÓ#ÖË¯&ÃÜû!%%:ò”º¢ö¬iÙ¸IØ[ ¿¯Œ›q≥	s¡≠hE`åıIì~å·≠vüûæi∏f√1g{±v"o‰Üë3JVeæQ=¶{ø˚∫!JâÕÌ!®8ns}ïl¨[våÚÃn¸·É˜…"ıDœüçèS`äe˛{Z'◊ÊâÚûﬁ˚{L*ø˝˙Ωiú∏ÑÌA¶ ΩˇÒ‰˜Tß˝˝°:>¥+Ã¡5¸ôÆ’uà“Æ}Ãwá∂ﬂúº‚$Úöf‚¿ﬂ)—Yµ”G’úL¢aw6i¶›BQGõu‘r´L|∑Ì2RÜ1AßOO√ﬁﬂi¨lÃ4,&ñÑdw‰Ñ„9@÷Ä ⁄√àŒ–≈6¿…xÕ<KfkLW•∆†qj&EN˚VdƒÔLäU‰é¶{Œ¯£jÿTüﬁ†õ∞OpjÅ›∞∂t™AˆF]Œ™§∫€Ù§u·¢Û≤ΩæÆOO9¡ô7Üı∑—cY;Fr8¡ÀXˇ∞Òp”1fF˘x>Ôˇ@/√˝ZvÌèM∫Ω,6$ˇg˜V€πÏ!£‹»Ûõo,ˆ†T;[1æR‘fÃÃ—¥3Ò“ÏNº@ëŸõå?7"lÔêhB0Y·¡6UlúÈ‘Ö‡K™∫ëf¬õ&cˇRœ\π~ÊDfå?∂Ï>¨Íá2£·aí√⁄t|f‚r¨9÷5|π k;Öq4L◊⁄ø‡;Ùçø√W˛äµ∂∫f¢¸∆là·¨Î®Råœß%Aœ∫ÎµÏ‡&◊mË¢A(ÉÿFGç€L_fhï\Òøv⁄îœÎ;ZÅ‚Á@ÔXTêI5E¬•Ó˛ Øê4øsB‘ª‹On?FÈπ}']“&!fP«Bv‰¯Hâ¿;;swÄ·P¢°o˛e=F§Ï¸µrm∂Ø1Üuı>bU	0U≠Ä:êØUlS·pTŒhª*x¢˚YíÊxaO'nC,0-ÇfµZmB/π%∆ìU°Â=PØ‰∫~/[9EPÕ∂j¨!˛¶Ú¸j‚˝!YLè©1⁄≠_≤Më◊Ùã˛ÄÎï˜ö•xO! 	µ%PEmBÛ+ÿæç€©J Ø™ë(ºjF£h/m"RxUä˙–R˜¢≈ÕÇ›©ÒA⁄d∞€é⁄Ê¢c∏+É∂ÛX«Œr}´?£-‘å°©ﬁnG√´~,/S<çﬁ√gRˆh:+ˇ¢NÈ.|K´<“y	…Èd‚˜ú¿A´T^r4 KnÒ∫£®ı ·§ßõÛ©À“sŒÿ#>”ÂéîªÄ*à<Xû<Y<ŒÌÙ¿åâ#<É⁄SÎ≤µN0c˛ô˙¥¿©‰†7˚-Z¬0dËõV0CO¯(≤˙ê
 NÂ´—UMòÙyhU'ëë]D]
≈∏°GG˚›v[ÅÏÀaT<F:-A©vÛ⁄™ñëà`y#8e–z§Wï£*5¡nFâ±ZFÅ∞3Xó5πﬁ#/¸YòMˆ®Ü£˛àh!ú-YëF√÷V≤sth‡÷	[ß ¶R:)újí•ÉKÊº-ı	£ü˛ˆ?úT}˙G}.F üòÙ„°¨A0ô¢û©dWrŒ‰¢ÚhµÂD/vı}'<]{Ûâ≈üoﬂæ´üÂ7ôR≥òM8’Hû±
™‘¡@÷»©á`—ì5vß7{å]:—.áúÍ˚Z»©‰ÕR™Ô_'k’Á≈XßU´⁄n õÅ¯°î®‘"åX±Ô•à|Ö≈Áx˜…Y#tïi´.ﬁ|Ùx.ò˘îXs–Ã≈£<œî'„TØ%gWv»—d4	»>ÿlC.;õ &À⁄{≈„sπÔêï<wCÔlL~AN¡ÓƒiÂ'¬x;!wÉá√¨êOoÀÅ±Ìä∆`àjáé	KÓüˇØˇ@¿§3î–î“•yÂ àÈ.Ï√!Ê/–S\“=Ö’¥%ﬂóOleNq”04≥¥Í∏ü‹A÷oÏ7„≥3ÁÜ<Í—S|>A/≠í·0Ë†.¡u‡6ñ?Ñ≈ûå»»ÛΩaz6ãB;Ñ∞âΩ¿k≥πí∂îæ=)˛@œàMÃÅwÜÂaËwæ{ûˆ]⁄Ôæzïùe£ı›!¥„FNz‰+tÉ»I#É A
ùh°∂‚;àS6@àU¥i“
∞¯Kb∞≥q”¿≈ü™´¡TmŒäôtsÀï)
√#$¥æèMù∏‰≤∆È˜›iÙîá~©<|∆’¯g‡ª{BÛo¶Ëñ3* 1YÆXÀf`ûßÂd”—Ê˛˘oì|µ#”í°ñ◊;Q’q-´î©‘êÿ:Ì˘ìÿ⁄À…òÊK Çj¶ _Ö˝Û…ƒﬂG]÷ã.ømOŸ˘qëñb>1>qG∞n‚À´U…ÄÚHÎÎ∞Ü9P@	‹!{ïÏ©FÉz˘s®È˙◊≈ãØU Òkù`¥ìt»q‡~Ù‹TÁºæMl|\¢çÒP^∂`„~nù∞0àZ?*+@˘ÖÂûÚ zHÙ†5µ66s’‚ƒhí¨Î[Î≤cSªDÿÏI‚tÀŒbçzV˚Wâ±ÓçŒî˝ßÖ∂eM[ÏNn„û≥&4Ô£‘ÒAÚùû«£ﬁå
5w4»›:LZ)Ùöﬁú◊À´ËO∂›p
‹`™ó4V;ßl°ÏQAùÔ˘ì˛AÏQ#NJ=+¿"PÿCvÍNP€w‘ßVl»S1…ﬂí∆?ˇ˛˜œ‰‹WE1©YE:;¯–ˇ¯øhı°2Õä?£0œUbSÕVﬂ©Ÿ¬N≠2Ö}‡„q4YÃ‘~ÓM`ia§†’"|¬ åÇ˝Á≠isMÜVq`	ëµÓ»	P3Z;8=^—LÌì0
&†/ö;Å8T®í§≠ﬁ@˙#Úˇ˛JÓØn=~üU‰M_+oGÆ¶À'rV√˛%∆H^8EbÚÅjìaIÓ\5Â)◊B®Õ≠tÆ».Ú[)÷´âÓZÑ6ÁrtEjù !=´∏gùHß˙Tù»e’XeÂ„%ÖÁ1êS®Ò@	ÔõL˙Õ‰—5˜Aı∫+U∞ÅUUêÕ]—Ì˚Ôhâ5n7Sú∑◊+i
∞Ù|ß?,T2N9∞¡ ’æXÂQ◊$—ó2Õ‹ºÿ!Bˆ&=áªQPL—c√•ì;6È¡ó4.…,CÙ{+⁄B«èº¥äæLhÒÎ“v*%~*)∏Zp|ì¯g•Xy®Ø´dsÒ"î#h“÷÷–¡≈è/$—πKé<§öÄbç1Õû6äéˆª∞
îM¸1vyöc}NŸ˘†˜˘KEz%{àYÃI&W^Èª?∆CFsLW∑NV∑IUgs†˛]óíeóünïùnïõ^)3ΩJ^∫&ﬂSÛìeF∫u>zılts™∑¿sGºJßã*&+ãßáfJ∑;>§\MUZÆ"©W#˜ÒzRDp/^oáMíÆûäΩÚp?è´ö
∑≠‚ÌÊ6
¥iÎæ.cOeôø‹ Ë	˝Ã≠í∫Ääa±sx¡C*2S'J±>†búÍ¿0MI¿`·¡dJöøf„·åéiïDì©¨.¢–@—ˆ›$/-Ë•rŒ∞´(¸Z#tv∂@˛o°SÍÅŸ…TÙ-•N'y…∞^—.E´7TX–¯êíKÊK &¿ÑÏKΩA8Ò]$”IEì„	T„˘»§fÕÒvÒ%ñ≥iŸï±—bÎ o’æ+˛∏uyåd'®◊wäÎK9≈T’æ™tÉ◊ãÚ∆≠ck≤ù19õˆÔâôíº√Pöíﬁ+ÏPóÖ`mŒ…Ê(pÉ∫é◊3∑Á8BøT:ŸÌ’¶Fºåhœ&≤cWŸ'ûL»Ÿò<›rF÷T™ﬁ]4øx∏>eY<gâ˛ì<g[ÕÁËçyò6®‘∆JK≈…‚[!ı›“3%Ÿíú0€˜3óu—N}ÃJ3≥Zé™ùBë«‰ıÏ˚( É–1rwvï6)='fë[éW£{xL;˜:'˚ﬂ¡"ê„Œ—ÛNÁH	s$ÃÄ"Õ£póƒf~(õ#Òƒç≤ˆ•∏HIö»ls∆Ωs÷®ıåÌæ8È|ˇ™s@ﬂº⁄Ôêü˛Ûø¯nˇ’·õ‰ÛÒ…ãÓißªo5ç BØŸ-F¬∑∏E À7-òπ+W1rMÌﬁ‰ ¯∏≤PovÕóœ¿Ωº€Üsk˘∂3ÍÅVpø”fœ>P$áÈÿ6{R~4°x˝Ù˛€ÏÑ´Â◊&•Ls<95
v± kãÏ˙±K~A^®{Ω‰gµVÅLóÇi*)ÏÒ3Ö=hüŒ¯Gœ…N¬b6¶,ZÆUQ[€RöJb ˜¡Í&õNI|tÇyDí</›Tî'#ÕáO≤‡¡»¢FK¡d¨ ÂµÌ‘HY{ªﬁ^ﬂ~óÖËyÆ™Ë÷ïú1i(2úƒ±º≈xát>“úæ
Ω¡√Ë^¨“K‡+ﬁŸã'—Ÿ¸¬^tŒs„¬µO*;o‹ö ﬂaR∫ÀòûÒˆ°±n≥î/l#_ÿ.§˙Êl|n˜'3æië‡P∂=≥t1…¡ Ù¿êÁG≥ú¿Dî›…ßßçu≤N6∑·ˇ+Ú¸∑€õ»ΩŒìŸX{l¡Ò—¬|⁄‡il{ËM4=c£„8HTOáõdc≥øŸﬁ‹Ä—m<|ˇláÙSkõ˝aˆÅ‡áÌ?ç`6˙∞Ö<$Î≠GÀ÷6¸≥˝qÛ|„¡«÷f{–∫ﬂﬁ⁄Ç6µ∂ˇ‘0õO÷`I¨áJÙ(XèeÈA…è€„ˆ:ûüÿ`Á'’B§˙`&©*`^Ã)éKwõ1ú◊Ù¯°ÑNù>∂¿äF™Óczzg˜Õ—ÀŒ9}s‘ŸüM3O9Â‘¥Û;‰9„U5ë:„
,*±Ä2o√üP©`)l*é!Õ˚y(∑¢ƒÖVêb|–Ñôä÷‹QÁ∞cﬁK6dÒ¶*çkdõÂ!Á»^êÙlÄ‚0˚ß`BÚí‡∆æÄ¶Óg«≠¨ óõÁ≥Rs63kÀ¶Ó≈ÌwÁGp•l¥\›a˘ÿ1ÏÎÚPÏKÀÁ:À%/_/^unh—EªNæ–íïÕÜW}ç‰–¸VŸxÉAZû∞(.˛L>—†eıæXsâ—]nØˆ_†ê+®T√I5í,öF•k¡/»2÷ŸYD+â[â®y±à«röfÚ¢¨XY÷ÔÓÅZdbgV§ ”}ùOu[ªMkèÈÕ—Èõ≤€˘MÁƒjXï¥£)’Éµ°Z—Y?ÿß™õ5ÆÏ`ÙÑ´Osåõßk=P·5àc∑‡œ&ÈÙHØ˜–Tò\÷l%ûk/íÃÙi`T¶Ÿ@&µKΩ#Ñ’c%ÏÏá^±7$Wm&·ºà%ÈM#™–+ÒFÑ#îVcS∞€æPw·0Q15Jø@‚˛πD7ú";2›VÈ	#Œ¸¿›,‘ïÂølÁ!«
µbÖz>Uåò#)g‹»X\VfèU®5´ß˛C§‡Oˇ˚øh)€\ˆÜ(!EÂ(szÀ7Ó;C8ØD9ò	â<æü;hxßV¥PïÈ±ôCSû∆´0a˙´ó3—Çñj~îfN]€û∫)<}Ωí?zj]åó‹ﬂ!ØúÈà¸Çú∏CgÍE±è5?4µx}ˆƒù(ƒ´/øõåΩ˜p:B“•*ß‰H†R7∆£{B C≈à3}7ﬂWˇÃ4ÓSü¥jH\¬YFÃò7f÷√ˆÁŸI–â&ZS_9œá/9Iÿ&>"à©t55qŒ2øÏP‰≈V3ÇµÑ•l6ŒiÓ∏ŒHÂæ¡‰t&'Víù‘ùßÖ”w‹∆TËEöO,N£S€Å|l
∂#à>ñ‚sÜ#Õô4©Oƒ`®åuIÎ¨Œ˚©¨Á•áÍ∆û„ªÙƒ?ëºâr ›ÿﬂ”âíıCy–Kâ£w√Ù ˜mÖ”ÈóI≤ŸñTKû|Á˘Óﬁπ^él©∆À¢ÿà◊Á˛í…6„ív…ì]'ÿm…h7©÷~áx‰Ö˝/ôxÈ¯ñÑk`∫Øo‹Ú·?wàr¡bqøhæÀ∏§]Ps}o⁄õ8¡@I¿ú+0‹ˇ˘˜ø¸ÎhXÅ§c∞H‰ËKˆ∏Å•⁄JlO∏ãŸûV`ê™ìVç©ıE‘Ãa¥œ†·  ßbÒ˘;Ú˜Í‡ë‘xn	W`ﬁ∑‚éSî•za%9à¨FvØ¯∞Ü¨ˇ*ÛÃk=∏´|DÙf(·cÛÓÎEîÿ2]H¢ÄÏV·TŒ~NuVÖm∆ƒWú˙=4ï'Èù˚ÉfcäZm†∫4£z“XkE√„2Ã`ÓÄké§úW<ÛPÙJK“@Öu,»†‚≤ñÖO-‡¥8iäùö˜Ls.Õœâc‚üˇ∑HâIÌp^=Ò*s”È±„N'Áí<%=œ˜S∞•+ºIaC4ﬁÙ^;dòLTbL·(/¥‡MùH∞ü_ÔÔ"S‚%/ì«xJâ„i3k'ıhqVÔ›ÂÃ π8£8ô∫	 L,Ê&2ÃMîõõ0Ó˜›04LOrø˙	OŒyíz√8ô†fÔ„¿NÖ©¬“Âoﬂ≠XŒå≈˝|˚aÂ¢ÓtzèÅ¶>†Ïè±√ÄQ4E[;t£Û…Ä≠60‰sc]òØäèÓ/‹^¿}J·°NB√X¸«∂πë3éø°)æ£Æ‘‹A‹wõMßﬂ_%}œ‘ÔìoHøÌå@*F´ƒX9:Y‹◊cTè>ÔÍj7eyIçk4Øˆ(¡ÕØπ€±Êá ®íùbÀ-=[s∑gy”=˝9◊wπ©˘µàUOÌá†H ë®É◊=U!–n`˚r‡"Æ}‘Xdﬂ\?vÇ9tè1Áóe˝ﬂ∆XÇˆlπß©nWßÔì8:Îıl!=?pBJ0Ø&Cá÷Œ)|ﬂÂ≈7ZS˘ÿ[∆nÔ»5ügKJ-ŸƒÌ±µ4†˚Uï∆‹$ÃûıÛó7V4ÀF°˙ÿ´öZ¨≥¡ºÿË¿÷∫|'µ˚,ä®Ô”F”?¥0r`8úMÇÀ“Ëk1ﬂ¯Y·Ñ,ÎµGìqt~M„•Î◊ÔuèÊ&vß8”∫'©˜éçá‘›ÕvﬁÃ˜ÜÊ^‡˚ë;ÇõµsõÊìà2Ú”`ﬂI–Qì´@πåÌ’fÄ%ÍçÊNΩëıFV‘+◊ñU&‡Ñ±ÿQq‘O"óöﬁçÆQ◊úUbéjsTÖò£*ƒ¨Ω+!fFqÛ%hî∑[	≠Œﬂk©y7«˘ø∫1÷üF¿Ì∂NØMœ ~—ü¶NÃuáàøƒ¯∂›n Ã*ˇf€4˜Ó≤w≠[Ì$Laº«ÓAœ`”i#%≠¥œ‹Ë>4W@ÎJÏú…Öxòå6uï+Füj∂a<Z•±#kåG†{‚ü6˙≠˚	„WœÅ,/ìXÿãO}◊◊Ï<tùÓÿ˚MI^Q6ﬂ∆Ïq√}©ûmqüUÉ9=›Ú^¶ÄnŒ©Ü{Û:º˙f¡R0é_†&ıΩ¢†æ+'õ4ç	
ôÆ1]´ILEÕ´yu’◊ã–¶ Nitñ~sÁC≥È9∞\lˆÂ ÑruM•
ÎÖ\UaêßÚãúº8~}rJ∫ovO;ªdcá<ÔÏø˙˘æs≤ﬂ9R>U*(bN◊)t[QÅÑ‚…Û“•üj≈å5™]Öh®):{TY§^–SÓ¨Ë¥qŒ%∏)ªµÇÖZu_´Ë◊â#ÿGÊ;òáˇXfR‘ˆ˛’˚Õoùî¶ÿ¸"sãÃ≈˚S´W—◊_”À?œû⁄zˆÎ˚ÙÁ—[+o∏¡˘=ã€[“;≥â∫K∫S∑èâ⁄{éﬂè}ZS@%|+˘¬Â∑ÇË˝6>Ô*.+?w-wOá≠è√ŒªaÚkÿ˙∞ÂÆåö~ÎEy¨-|’z/µ•∫äg⁄ﬁ'=ã7∫é⁄÷mÁ{6yù´¯õmàO1”ÏÀ9´01ÕIòUÕ˝ª¨t´˘8∏¿ŒéÏö¸‹‰º∂s[ﬂ6nvL€l•õwFﬂÄ⁄†”- ıÃ^	˝L^»êi1ªwD©Â€,	Û•Ã∑«g_±õWí⁄X!Àº|BÒQ€‚ÙœÊZ™7˛ÆŸ|˚/+ÔæY˘› ö'u¶≈:U≈’ƒÍ°o7ﬁyÉ^8U±Qy≈4˙=
«ŒD∫æçÓQÁòºÏúæ¯uÁ7“iëΩ=y¯ı—´˝£‰¯•‰IY°≤Ç¥°˝ﬂµ`àı⁄¨äZ$)A…Ü∆ﬁ1H(¶DEMJ9Ê£\«Ø‡uoYSÔT)‹ØªJy—:XN¸ŒÖ›ƒ
çÒ-Bæy*ÓYC‚C˝‰ôŸù|›‡…z≠í´kd{'nòÌ∂¡VÖçc,Ÿ´dXÏOr˝L∂Ö+î°ï )˙°SóÜ¢Û∫í_{X_5∞ù±bh8RWΩœÄÄîáÁ[ÑJ3∞°≈H≠Uƒ^ÈÎ◊‚Ú!&˘qgˇ9iÓu∫ﬂØvéﬁt^©ÉÛ&ÿ/EI˙Q±◊•ZP⁄öÂxùL…UŒ«@˘"‚±sı∞Î∫ˇ\~¢{ñŒ3‰6´j»Ï“ó‹˝YxYdr‡U?eØ™i„í7Ô∑*2^x†JÓ0^+ºÇ∂Ê¶Î´—ñSb‚izâÏèΩö4•áÚ¸ô1ÆL†BrÛF¿)ÆŒ_òª…`
W≈t1ºä\ÂÜYÑ›iÖœ–±œ¡ª/9óÆ
 KÉpG}äh∂>88àv¶e\ö›ßØO»AäÏ-NyzXùπÂ2wï¡	~ÛôÂ∞k{.ı7£^∫‹puUÖlKø8ÍúÏ¿G∫©^ø9Ω˘]LBwñ-≈¬í_ˆû≤:+∆Æyà2PæáãﬁV∆;Ö¯’Ï.~'l/ºu1;,Ì]›-ˆ˙¥ÛäpMºy∏ˇ¸Ù§s‘]ò:^c{Â|“üaw	3ŒzÓºx§ﬂjj7'€◊s÷“4?)˝l›x4rÇKÚüúÿè»˜ÆÉîmÎg√}°¬èˆã	´å¡s√˜∆ •z/›≠ê^'ÓñŸÛ=DÄ?pBrÍ˙>'q!ê&á/3±Ω´4¢SäqÆ§@àãj1ﬂ!zª„ä mÓê∆8Õ“Î7V	M›Äo¸…¯˛ƒÙ·wr≠kO[haV#)ˇÕ Ö’€N<äZd‰|j7ˆµKvË"l?ÿ±CºU9ö=G4>ö:|äúQœ—…≥êkÅ	‡-	Ω¬Å'áÿ‚ôG¶ÓòK4¥S€∞∆cG”O:LCSë7pÜ–Ï2h˚÷ÉÔá@iº–jZä(%∂5SØ,ÆØ—P`Lè¢5†`Ss1Èü3Ë9¯nÍ∑»Ñ•-– ÌAÖ˝ù÷’Ñ¥∏ôñhé^úíŒ´}êõ‰yÁ®Cæ€ÔÓê]¯˚@SìÕJiﬁ*bí“—Ùhµµ´,„ü	ÉÕ
#}}%Ê÷={J÷¯≥8ç—3pŸ2§Œ‰2	m·çÛñ÷3HªÁ µ1„aêmßcÊ˛¡p‚Ü3 ?k	X™Ô¶R7®y_´¶uñ|î´…«LÛ∞Q©ÆÆ>FQ 3Ï–i˛√;”+’“ÌISæÛ≠<h°Æ|A±–dë£ïV-zóØ,úŸIñ/πXÿG≤˚œı⁄¶b]Æ~Ã¡y∆°†$æÑÈ∏p.S‚’ÕÓ⁄˘ñvˆebtΩlL⁄Ur<ë6öz>
µ‡ >1ÇÚí¢{\:TPM—∂IÄµÏ1G+€£tÑUÀˆ„‘8œ÷`ÕÌ ï¬ \ZÕÍV¥Iä∫™´ô^$≠˘foù¢	ƒÒ—«ÓŒ≠"sÂ%≈Ø»M7[{?ç…Kå∑c}ÃC^›IñÏÒãî¡"ÓÿıÖﬂ‘uÍå}êx≈¢uj€Äóøf}›ÿ!{<ÁÕ™+Rûü¿Â2Á¿ñPÑ\Ì|[{∞.·˘õÜΩ•3L’,S„HkÕéz≠√∂Ó¯ øÅÔcyP°';’¨·wÀés´=°õ¬rÄF§ZéGπöÓu+ãK¸o¬n/T÷n<ÎœRê∑å‚,p&/d&jOwzËÙ2‡Ωp:Ω∑R»ˇìˇÑÃøÍ|âO¡,ïã©÷%?AvEäõµ'(qÙD¡'ìßt.µçÔÏ∆H‹ÁÛ›“¸¢ÖlÊH_nªIZnÀmí¶6œwüL„`Íªãó"òÉø‹#3¥Ë2á⁄‘\ﬂﬁ‹I4ˇµƒ8≈—››˚ˆjﬁ`Ha5ı„ÃÜ>uÉ©3t<“,T°é ™k„Ÿ4—§Ê∏%^WØ{p˚Q{Ë^ÜMEﬁBƒîÆ—iJG”:u{“cÿÎ”RLq◊“$Ëh±y.˙*"\ø»âRGÑ⁄iŒ˚j±ÈV»éqÃ|ayœ’L%=Gˆ∂œ(`ï‡âª;Vf=]qX©ßW¸˘kπ ¸D%!«≥±à*Gä∞rÀ£*$›p'J:&;∂/}Ÿ9≠r4˝î≈67—”9Cã“£}Rjv°ò•ãÕc]°H{Y<Ö›W‰ål@MﬁSzé‰˙”äÌ˚,¥7ÿLz1®ù ;·¶˝Q„„áÿäÜêºÚ@ÿ˚ºäı°5€.Ä:|‰Ù|W|∞±–ë˚! –†rÖÎ†_ ΩZó…Á?æÓ‹u5$
¬]≠¬UP†Ì„Ûºo˘4Ü≠∆≥_;C,gù◊y∏KCºk‰hø[∑âÊîÙj?Ôªuò	]ßqÁM⁄‰5•∂˝Áu˚√5∂jv)$cüFﬁÿôΩ%2û¥hÕ.ò≤‘Üqh1ÂpG†Wóç‘˛$ÍMóbøî˚ä$2ÿ§uôåÏU-˝íõl“„AπÓõzı»Fe
◊@ÈxTd"KbÍû™N_vŸ∑SöOÅ `î⁄}0Â„∂™ •„3Sîù∫®& ™ j–Ê/»Üx$;L“Ò†…ˇ¢&9˚ÿˆÿô2zZ5EP÷ À.ÕY—‚ÖÇÅj®Ù%ﬁ ß°¶päYéÊ¶^â§¨!3ﬁ2Îæ™“äÎ07-¿¨i¢W˙pÊÏ¿#¸y›n’b5≈Î|c“÷f&Àã)`≈xnå0Øµø∂9√.xCKõó]6ªãﬂY^l©"˛–† ‰⁄DıÔ*¸∂=Ü6 OÔ:w¶qÿ∏∂“^≈÷*¯”*UÕº@7Ÿ!¥ÁÉ«±ùpKç<πu´Sqø% &Ãe÷=>æ'/¢´Ïä$d3I…E˚Ö %√˙™¨Ä
ÎEœL⁄¡⁄ò√À >ƒK6øI®fAìúƒpíYè=Âß9˘•Í<'∫çìù:¸4€<êL6ˇ≥<◊¸á™S≠+Ø»MÃıL\™Pı‹ˆ8Äx±ïÊÄJãÌÚºt‘TIíÃ2{	≠œÈ”fÌeŒ±äΩ“›®Ú…TÿWV¿5ˆÇ⁄~≥ÃNPÃûŒfÉÕ£ÔÙáÖ
„÷ÛÅÓMgÔÊ¸ò9lWASeZvô+OÀ.Àj‘≤ãV<Ôªﬁ4-y^Õ§`jÃZÅè’L
∆ı¯„´≠Z‹Ë‹!Tè≠÷u∞ó∑]´ΩùP†©ΩR˘9¡˚ò¡P˘aJüµ^ÎéË|7*?8=üå›:Úƒé]«w∆}1≤*5†=VT∫Ÿ¬Û ÙÃç(¡Ôö∫©[€`[Q˜I£Bsäj≤+«]6rÊBV!B¸ˆQI„ NqsHŒ∂ÿ“Sâ ¡Úï#<ö≈ŸR≥(îù∞gIÚicv¯ê$ﬁUr‚Ü#œ∂{…˘Ñ.$ñπ PXÀIU!
˘›vÇƒÏ”√ÀH`∑â!¥E›Ã∫‡›ƒŸöÿÒY&∏ÔÖ≥ÄµÂ–Ÿ6µHqÏÕ4∞∂±C1Üf•}îÕ|Ä'€w¶Û;∫tÛiòmc¿¯ë≈AÉí≤cÚCåa≠p∫≤S©W9¿ ûo§O-9ﬂÆë?#Kﬂ0t˙y‡|‡ß(«<Ì¸ÖÛØßÌ°·∞ù!ã…ë5Ñ?mµã∑ñ"Æ≥DYÒdòM≤M1Gü¢—÷µ˜ÉM<O—Ft=p·ó⁄Ÿç}
~Êù€OÌ∞àgÌÍF;ÕçŸ«9mdòE¨≥J¥”ú8)„L÷ëMÀÿ¶mtSào>∞”˛n8¬i´1…¢ú»CÌ£ö∂zêçd€,@ÿ	»È6ü*ûi5YI‘sEˆ¥,
öé‘∆ú®•Ùl©Â“*b…€⁄)≤ ´ênkß√[Î‡ßÀ%M7ú´ßxGï_¡F≤Ì^õ“‚Âkû¡ﬁ√Ω3|+Ö|+}´xÛT§5sÏwﬁ—ﬂ≈∆gä Wäœc±Êd°ªüJj-™ˇUhjqÒäJ‘rUFÇÊ8“Uà¶JnNT#KîmÈ
≥Åqâﬁ\ÇÛe2´î®ñò)01{h"W•´™KB⁄∫Ê≤k∂àDRÙßv@¢~Hb∆†ƒ,aâ3Ñ&fNTOTPÃ9DQ)HÒs	SÃ%PQ%T1[∞¢j∏¢R‰€*dae∆UÉÑ4Ü.å¡ãôèÓ–@¬ÊNö∂å&Ëi£ƒ!9å#ánû°;Ü≥…Àb⁄FÆr†√∑*¿`óBo:àeq‡F…a≠>:æ7Ä)XF"íﬁπHƒ-àB¸ ªß˛Ûy(äCw4Y∆!XóÊá(3™e"Ω™∆!FLn§0π∑:!ÆºP(˘≥F"åÂì#˝‹ëàËÁâ®T0V”ñ]Ûã'ÃKò!épΩ@W⁄]é	TÚÊRıÑ:ˇi”∑‹˝_e_…ä˝X	d°Rã!=htΩH'…OË1CÖK^ÿ	Ç…≈Û…≈¯ËﬂUùçÃÖ∞^≈±Éó0>ÊX!£Ä"WUjßÇ€/Z´ RTäÿ o°}ÈRÁã˛d–kµñıÕÙı›/yUO±,”MÆÍI Î’8≈ÍKº›ÿdŒÖ „ÒΩ™”¿√∆ì»µ<	V≈Ûò¥\˘¿ÔMOÎ’{ªê›◊*˛^‡—π˙|7k‰Øj°¿h
¥ªnI(êYoµ√ÅÛyÊ¨h›ÂØe8–˙ZÜ’◊2∏JØ/(XÈ'≈•È∏^i¬r_b|Ò©¸"'/é_üúíÓõ›”Œ. O^téi~∂ÍëbLÚ
—ü>∫'† Q7Óù:=¶2—“f-ÃÜ)◊√n™ƒÚ⁄aïÊBÚ≤7M„»°‡R•;ôwìΩºÀ˝õyW'+"* ÷Ç∆<ÿ€#˛2tñ!ËE˛õ6®Z#Ë˜Wàéqo,<√úàê¡?Á´ts,eÍqæáèÔ"CZ«ıﬁäî‘ì>øä˝ò◊Æ>ﬁnz?Ω…ﬂìæÿ˚@öl™†˛˛ïƒk˚¡ÒCW››ëıœ›e‡@ù&î0∫”)˝õ≠6£`µç‚¥&˝•ï¢¬_{—ySÚºn≤¯€˜hãŸ€Èﬂ≤∑'/«/%7À^ƒß!7NËª¯ÊÚc◊+mêQ≥È¨ıÒ6⁄#‹NÄ3ÿtgZc•ÌS[ÄˇﬁÏâ?Ær@|V…·w–btWA∆S1˜—ã.w»=,ÈvO°'‡˙ÁzÅ€`=• Ò'Õ9‘WYÍ/~)y+ˆD∆!_p)õÇ9ºO¥Pû(£CÃÃÃ‰SÚV“€∆±Ô¡‘5:g10î?v›)H˛»w¯„ı0öèG†=$_?wC˛Y⁄®3ÜçM€˝ŒÌ…ÁCòÉàæ¥,ü~„“~à«-‡ùdN¯–XE’C6#OÛ¡¢GbTGMn·ÆÁ˚∏Yz¯o¬J•ãùåQH:!≥ên'!éT	iÉ…û˚çÎí˝©îπgn‘È√Œy}|ÙıÌû∞ë≥FWdk§a#x¿ÓÆ8%¸\é”âb∆3xß\7ŒK˙//|ç“’Q?èÌ˚¡ÓmPŸU ªÅ#ıá˚ÙÒ%êfoUXò+••ødèŒC?I9Å–⁄
=°∂Bíœ,7_§fê©OoËP≥^±°÷~M˚∞∆“ñ¯“Ò8˛3≤Æ Èo	lÂÛ65SöM: ˛ÃZæçÚKVãJÔ”R¬3RÒà‹–Æ1›¡Rî`%=	©S	≈#ßN” Ö$√>&Ùa⁄)-—?∆`7~E¬ÀQof5kç\?Éuπ∫ñMXû'∑Åóøp˙ÁÕ¶Bîuæ'Óú%dXl+¿vÉnÜë¬p@±4†Úî–ü%õ[„Z…ÊÛÌËπ0â´Èƒ4~˙€_D:#x]¥*I¯‘ÏZË∆ÆπÍ7%,çÒxï=ßQõr8ÊØí6u„‘é4%Ja¨-ÕX-F´}ﬂπ˛´˛}™Yó~oËù¶gtGZÕÇÏÕR5,UÈ‰›·À,g•îe”]ªá¸v'œÕ‰œ‡‘ÚªN(øó-øõã›˝E±¶π+'h=Ì+Üù-êÏw…ÇH'ûm∏3“s¸”§„»EÌO#˘öNøøJxew *·ê~¸õ∂ÕdHd°d7óz˙&U^ÊŸW„í»{[˙NìÅ§/s¨√â°ıà\Mﬂ˝Ë˙X¶÷ÌGì $Œx@.º(Æˆ†5b©ÇiZ≠πÏÙÚ¿ÛΩÏä2√}%WÁví∑]£ 4-ÍSn—êknQ,∑Z-%iﬁÕuÌ$CtÎÿÛΩsÚÉ;˛É3>€—∫k’Cíxõ”Tu~ˇzÆné	Ãˇ-5≠¿‡|àˇyÑˇy‹x«ÏEˇ£oU‹«6≤GÛÒ†Qs0†Z‰ØÔ£ºíóàé∆¸Ê\¨∏X{πòêìd˜ã4S£	_€ƒÂTN2ÇïC˝[í±ä¥é9´Ì`ı|“Œ6H)“‹ê9nˆ˘#µd ãæ√»ª/ﬂt»È˛—ÀÉŒ©Õ3;‰˝¡ãWù.¨ß±€vÅêï9∫”‹Ò‘9è«§Û¨g1#sdRS˚∂èé√û-ªzÙ´	¨„ò7<Ÿt5æ¨‰XKˆÜ¶€°	ÇºM;°è@Èªì?èøïîA3p˝\ù4E≠ÕÏÙ’áIÏÇI—∞&Z¸´\´è Å–cKOëÈˆò·úƒdä≠Û≈£{¸ﬂæùÔﬂëŒùìŒ—ì5võAí9Çˇè;<|¡NÇÒéP	E!Ç¢ò’iá\Ÿ@=ÿç≈ƒ;ÿ~¯≤ŸSÆhÒ¬πáÒπ)ˆ!º‚ÁŒ?§ê‡$T¥[≤êxÏ˝1vÈ“∏ÂR˛“Fƒ´Ÿ˜C⁄¿Àµh^f
óö2áL)å∑ÚQŸAô+<ñÚV¸l3-L;£∑õ_fµ“sc±⁄+õ…h¢á£ÃDMr¯æƒ°Ô~®Ïı”ô\;¶Ø∆º5wü7◊§ÆZí<Öü*ï%7,1;G˝‹;‰–	„°±≤çUk©ÿì!˛àcÿ∏Ã RòÊ[Ó’Àˆµã∆b‹6kùà_‚âƒ¥pR8ˆ‚œü∫AèœŒúEìDz‡£&=0oÁg¢£RiÙŸzu*ÂoSù
”œítm!˜Ãê0(Kr≈ñÏr\µ9≠fWb≠}¢Ö‰3%M<‡ïz\J|Ñ©riIî7Ωäê(Lh§Æ`ﬁøL3S!tÿ#øµéÚ˛›R/™ñÓdi©Ñ•≈Ruô¸ÛÔˇˆ]ö‹1üâ21êôË_ﬂMÇë1eéÜF≠^≈eó˚âfVÇΩê<t:yÒ©Ô˙ß$∫ü9i\bŸ?î˘DÃœ§≥¿A;˘∏ê˘˘Çò¨Ù „£¶GL9Ûcº“%<q˚ŒÙKYæª∑ZãeÂ=∞pÚ|ú~ÛÂ2q<VÏOúAûãø†ƒO(ÕˇÀø÷f„3‘9t<D⁄G<¢=2¸ÉØsekÖÊñE¿µ∏ñΩMX¥ãa\|œbm%›ÏÂ˚´áR∫%_TÓ{QÏcR</í@S~iŸ¯‹º Áp/BèêÕÑ„5µÒ"£»¬ÿe^ÃL˙GŒhÍa’T€áÏ<2ÊYãN‰ƒ,ùyﬂ•Çë”€¶Ht¥`Ñﬁ`y≤6≠Ø¿„V·zJ˜¬√Ïı wç:=Å6j∏ŒNXM≥ê™´.t˝ô˜É˛e∆≥àE€Gó’ëe6QÕto<pÇÅ…¸í∆ï€eœ+@¢˚
˛∂π¥ûTµX2Fõe˙i:$£êfqf∆ãµà3>®*Wil>Üæü?˚ó*Î≈æ6ú´ﬂº(Ø»I∫Wªl^¥€œ^4Å
÷∆C°Ÿò~Ó$˙”ˇ˙Ô`)3q±k% å∆Ú`¶Zn¢E«—√∑◊Ätô`Á€/◊¨eœürn¯î'Óáµ£˝Ó»íŸa⁄ÿçÃ
oyLŒ7$kH]òCˇ
™˘‡JZÆË€Hìßßöãî,¨cÇ|æΩªï ö9CÉóÊò≠Mñû6Õ=íﬁmI≥ÿ≠€7&±Kû±Hi/tKï‡.^◊ñëa{0G;ŒéèT≠Áh	`†F˘À∞ã†é’  §É{ñÄMıëk@
´0…∫Õ.¶œbÊëàüg›Á∞ê˜úæa!]∑/Û>á‹-}ã†˙ÊÌıƒ†
“9’€S]Î‹¿TUÇ¨√V∏ù‹q"LŒB¡ÓU†£KBª¬ì—˘yˇı0∏Îˇ¯æbÕ≥™`õoWß⁄Õäªî∏B◊´aÍUÄ≈œ«¯+¢yïäÀÎµ´Ç¥Ωfñë}ç∏™ı£¨s.ÏÕPhJƒ¶≥¬…Ù™A¨a˙Æä⁄∆lÄtãòöxÒ‡Üg$ßK-fN,kø3˛>3(íN#8ÏÙ$I£‡Ñ]‹N˜#ı'æÔLçÈIµ<‚Q@ôziÌ%êâ6≠ˆJ—er˙â⁄ˇuΩY#ÁMqN∑òTõ’• vØÇg·Í-B¬pDé√q`8á°∏-ŒòcºpxÓíávINÿç*JÁÃ]À«¥!„ ≠GçgpØ›ı…∞¶…ÃW9HÇV3ØæË”»∑“aﬁ,/DÛ*u!à«√Àø‰7êûÿ€»@äf¥ﬁD~`'/%bô-†çú◊[sVÆµ‘æ_úﬂá&ÍÃ/îïè-ûÂ¨ßhc⁄æõ1£Ÿ©j¢QÂxñº,GîB¿£B≈∑”ƒC¥Ry∂<
VYfî’]‘±!‡¡Pà•*÷o—"Rå2z.Z˜¡‡Õõªb÷hZÉ7˘‚QBÉBòN ƒåﬁ—ısVøø~ˆ”ﬂ˛rc¿È¬‹%XBãö=∫ÚÖÍ∆IVV:sÙ/Â¥=íÃ⁄ÆÎÑ®ë¿ƒÌ.b⁄D\ØœIt‘¢JÁ-_…¿ä‹vAO	D˜◊õúΩf2}V’üIÚ%E»YôyJÓø•r≠[Pó¿
ΩŸÆ$é^älVfôó=AˆéÉ”«∑¡öüèÃ∑t?§Cnﬂ∑w”QËˇπ˙ÊX«lû]r§WsÛ∂»4 r £R§ä¸™h4ÆŸÇÒ-˜Å=uh˘9ñﬁ©uÃHLﬁxVz‡fÊ˛W]Å†≤ôØ°!(IË}•≤ﬁ ‹≈¨kQæßb<Ìd>ˆ’w’"ÈÓÀÛ◊l¥©<^Ã@Uπ-ôÄ$Gìq´3ÑŒ”%¿˛uNí<ØmÚåÌÛb¥o%Ì«õ£óù£yµ'Â0´†µ3€éùÇwI˝Â%˚ùCcOñn&HvI#UqŸì&Ï¡Ÿ%OÃ°]âøH5	wêê˙ÓeóUsA@Òvª≠⁄Ô‰ª§É
|ØùØCZƒ)|U~ë™ç/ÈI™¨ã™Ó°CÑ14v™Pduv˘⁄È”?¥]Ucop&SÏ"-K∫√èç,í6;
&~%Ï«‰“∂’·	ñ‹éñêfî¢˚≥°ù“3—bqä$˜F¿ä$ÔY"›$bá.¥C≤)4Û∞Òå?ŒQs÷jÊQ±ôGµöy\lÊ±M3w
ﬂlFŒÒÕ$J”çÚç"“Ÿˇ  ˇˇÏ}[s9≤Ê_Aszl™[§H›lQñ{h[∂ŸñdÖHOÔÑ«€.≤äbµäU<uiI£Uƒ>ü∑çqbﬂ&büŒÔ:ø`~¬"‘∑*Ríª€51näD	 ëH$2ø¸*7æ"ùÈ<4Í·¡ùÒé"_1œ–√bû)¢ı"+¿Øà`ÅKáÙdd âÁ∞.îƒ6"˜9ÁÇ{F‚∆∞4êÑ<D*¿HkxGöÄ<ï^4Y.ZÓGâqﬂ|∆–]Ëa≥¬ãHR…ïhóø%≤W»ﬂ*‰Â9Gx˘¢”˝9ì˜ƒßY:˙»¿`V∫>ÔÊÂﬁWÁr8.Úı)€#ä:˚πoõ˛´E–ÍÇA"˝s´"ûJ≈E√zR∂Èt•1:“0ÆÇπ->9¯ﬂPzÄΩıè“{Ä7GÔ_‡ø_éFágáØ$[∏¸8¡ÔÊVa»	ã∆ŸS‹⁄'∑ÿ9âR˝ª^JêípÀKA$À0a‡CeÏ–r"?ö·Ö1_É\M—;¬±ÂõF`¯¯{*∏P`!≤]ªf_™Å»˛Ó¸Ï›·…‡‰¬=P≥ˇn4xçÜá£˜gbm}ı¸≠Os√Ÿˇ—ó»Ã7ä›Uíöê>πÖGCéÅCµ≈≥‹ÜÀﬁz®#;ˆ¸Ω2|õ≠b”på9£ÍÎ≤≠µl˚£~˛A√˛—´˜…uè+V/RY·uœKÑsYß\  ï!⁄`ÎØòîYß÷|lú€ †fÑﬁ_”Kw„9R¬*∆#∂ä%,˘©Íç›Å(ªÌ„°Ào3å…/-‘¢àz!zÑ^D:≤Ãsä^Q7;È6åÓïDA‰Êt∆kaÕm«Üœî±cKï¸ên˘!Ó˙πçLèO±ƒ¡ªŸù|@ß ßHâ£x9»a’»Å“5ŸS?˛Úûöt¢0Ôùâè¨‰i≈¿q_’ \†”rpNKC…J◊?≈í£kVIö )Z#ÆpuÿF7"√Ω≠HÇmÛJ/ñOe û%Axt"Hµ—k∂5‡¢‡π¡#ÜæG]ù´-W˙J¯@z$V¬ZöÃ∫8@1Äñ°S|©Eg=‹ü•…Uƒç$∑?Z}–«¨H˙ôwí+4jBàù(t∞√t¢Ã5FTò¢∫ËT•(BR‘«Ì¥‹√ÂÆ€∆8∞Í¯màŒÅkzÆ‡#∏Uì…ˇkˇÅy†á¬¬K0D˛ÜN<êﬁ›KË_Ó—(=∏√«m≥⁄⁄¡¬±√f£%∫iÖ¶…;Òa|¡∑"X5¸wô2$ü]¡<ßQ“¢iÏ¥®ã®˝Ã‚¨Öo[í™IL∂‰WGÚk:.*ê	(I¬ÃE“‡sQâ4$ù[‚ìl˙L„œfÅ¿∏!ÂÖèõü÷Q∑#`ôÃ¥«ÒË¡«B]Zj°Æ¥u»ıIõ«/uE/~˛ˆ{ãæΩ!m¬í*Ù3Ô≠[4∑t‘¥|_îFÕ„eÒwÀÒqﬁÿ¿«≈>33ﬂõi‰ÔÅ»8∑¬◊Ã’Cü.Òûq‰ùâ‹

«
ëÉK\8™{&.l‰™HbDp)…ùª	 ø‹ÜQAœq˝ á`‹àcHí_ü±_]~„V∆Â!nL@“ÄO}–≥lGπu≥ÏÍ“û¶ÿ	dßŒá”»Ãââºm“ú·∏◊Ï’Å0âä∫úHxˆz"\]|
ÁDJˆÃõ[æÁÕ1›ÒG%·3B¯¨ùËJÑ˛úJVô˛<5¥“‰O!)?$Eàﬁ*,◊Cñˆ ∆ÃFÜ€<±[Hª›∆ì%V§ÿH@'z(´W´_±ÉÃ∂ƒ/É"Æ%=Ω±Gπ·ÌÂ˛ΩsÀüØ[æÖ*`¢$L»é¨∏Ü∞Íﬁ˜}„˙ô·^?ó,—ÿö‚ü¨VM±´ÄHnhR≤.B?‚Ü^%süYã/ìH¶b≈OÛ≈∫≈	b∆0≈ÔÄ≈√!óÌMyÑ´#[•8∞&ˇı÷0mø¯¢$¥«!S‰0Ï:§é˛êÜˆHv∏$§é∫˛aªK∂U‘mæÔ,å%õá*Í6?≤|«òèçeß ©GJàÄí≈$d|»;µ$Ï-∫ÎÀ›Ò53lΩëæÃÆ±˘¬≠á:¢A¬§1]i¥∫’êFyWEè
Ú&áEÉî[Î4Hﬁ¨ﬁ`Ü?W5iïï&Åß∫ø±\Àu6úYx'ò`Mû czSZ3b^¯§è,)bU>º,¨â=µ-fúäΩñës|ä≤‚ìò…ô8ºŸ‡K¨˝ÁwNÑ∏|◊O‘O•≤ê´¨˘8r úUih¨vˆU»∏^Yy‡xñﬁ$xº:Yô@r≠¢¢prxÍÖî«o.•%ZLi
›"!ˇúﬁ[Áñ¨¶oí8Ì4(€ Z6VŒ¡6˙“õ„Sø’ì/◊d'Bá.å"„Áng$\ù; 2´÷©9e7F¬111 °Fü;4Êéa¯TâYDr˙LOÒôõ_.∞&Ø*ˇn±2'§4ÊîünÛ£R‰zÈÄbÇà`9Hm?$€A4¶ˆ”fáïzËÒcÂ:*ö,»«gsF≈µ…ŸüÁL zı)◊≤‡òíÚ.±È€^ñ›SÓÍ˝k
?®°~ÖTèWU8–Øê(Ê™˙˙˙ıM[UﬂHøæTk˚Ö(Z#zFæEŸº”(<9A7pßæAÃê¿)vÚhäHƒL7˘¢ãOñ‘\º fº<QeJu	ì'π¶…ß#v
%Abp-ıD¯Aà¢˘:JL.¯/Ù="&ò6âU	@zwÑëïØ›J¥ìÙœ¸ ⁄%ƒW6y÷7xJ±ö±Sœ‘Y¡–©0s⁄fOπ r5ñÆ∂-tR¡¢©c¡l∑€Ú7˛:‘-M8_(E9_Úyá∑5æNy~ 0‚3+Q∏ë`ﬁcõ%»›ÇB,”WI;LIÖï©ÔEÂô|+π€ÕUñﬁN¢£díö[ezªhKﬂ	G~ÊÏÀ97≈¯Q3√5+¥˚GCÈÈF#i+æÌ>†#¬ü‹[<]çëm»0!¨‹•âot´7>Î_Ø¸i`m—];N˛=#ÁK∏ÏõÖs‹ü9??#ø]Õ7Ëy\s/òÃ¨π¥Êˆƒ˜o∂&ﬁºÁMßˆƒbˇi∞7Æ4ﬁ∞ JëΩp–òÖ·¢∑±qyyŸæ‹j{˛˘∆Ël„ÏeËÿÊª÷<;Ò=˚¶’˙àÁ‰Ô÷Û¿C{üÂpÛBí´â§¸…Û/∆ûw!qE…îfñR◊¬biÖ3„UD‹su}Í[XÒÏÿ«ì˝®™!iÎ=¡ ê“«^ye«∏~„€& k*üÀj≠@y›a(óVù+*û5\L4Òœæ˘àÔˆÙS´%(@Úëâ†˛–7≈Ï2=⁄ß˛cScn;◊=‘˜mºá ènx˜ôÓ1U∞D¡ıìãsb¨Ñ∫=øá˛¥5~∫9››GÏoŒ¿Zπ¥¿w≠á¿[mü—‘C›≈
<«6—ü&cs«ÍÓ£ÖaB|G=]\ÌSø6√±œ]L7â5êPe&Ωï◊º5ãji‹q\ı∑ˇÅG¨ªΩπ˝‡ëF◊⁄2ûíÜÊ≥˘v:–é¨“Ì';;ª{íJY@∆M•ëkœ»wNÕÓ‘∞vR
:ª;”Ì]Ì—6êª~ìcÀòZŸë‹Ó”Âõ¥·"Å€‚‘önMû§-Ómnw:|÷≠‘¢7	Ç≠Mk3”‚^w‹/ﬂbò‹õ›≤ûNßi≥ª„ÕÆÒt…füm—≥—÷¯LÏT˘LÓO˙œâè¨Á@T÷A£ª’†JﬁAÉ¨›∆Û£˛È˚≥˛	Eøå>ıátzv8<<¡ÜÉ·O}‘§–∏?~8>Íø]#é§2OQY´∞êœI8Mˇqˇlöƒ”ÙO^ı˚'+®ò,42 £ë”Cﬂﬁ›1F¡µ[¥Mı±]Ôv‰˛ÑyÜ9Ho∞ˇRK;.∂˝„£echÕ#•4IÚ3≠¢¸ÍÌÁz‘>◊xKîÒL‘Œ4ÇnH)u|)¶J•µ¢f†`:Œ•YÓ”G¶t;„Ωß›¬ÆﬂxNÔµõdm-Q;Wß¿´çlÕ·íµOwˆ¨Œ∏T;πrnñ¨‹ön„ßT9π^nˆó¨¸Èxg¬óÙ∆∏9“i·95ö≈⁄¸íÓvÕÌß%ö¿FÅN1£Å¸Ú!∆êâ¥%á`lu7∑&Õë>*ì
yò÷3AÄ¿gÅV|8«B˘–òÃöMﬂªL√Æ¯átr
˛ûDñJ§$ú‰†Á‹˚6	Xí≈O¿ãlÏÒ¡µÂF‡z›¢IÔÒﬂˇ˛ó«˚çrÕ∏+ ll∏Ê∏§*èózxSù-m%k†”mçjƒ˘6ﬂÍæLu€¸ÀC›óâñöw†˚.—7ÛÔˆuﬂM5«|£ä3MY•åk$˜@5k-äq+|ãÍíÕ∆"GøŸë¢≥"π√w˜Á€mÂ¬A¬$	_z∂!zÎı!œn¡y‘é9vº1:@Æuâ^‡èÕèP≈ßuÅ¿ËΩV«ûßúç_]≥=Zƒ^∑?ôA(FxÖ”÷SnD’ç“˘`o¸pv‘û¯÷|ﬂè±&!˛ª	TJ^tl˜‚éºI4'7‰ıC«ÇøöÉoÖ∑⁄3ﬂö‚Wq”¬"få¶ÜÁíòŸ~é7Êüﬂ˛<¸ysˇÁ—œZZÙœ†›•˙3Á%¨?«ﬂ&ÁÖ€üÒq!˛ñ
n€WN¿ÂFBÚ†˘30ºæı´wë^‹˚JfÛºÒ˚ÂØø/„7ª	~=Û.≈¡eç¿ZÏ¬û’Oª¢ö¯GXAÈœLâKéu)±Cgéã>j…´µNàÇV¢8ÒˆÒ°l?=qÌì ˜S*˜ìsÕ~rŸèœ˚±nøü”√˜ÛJˆæX!Ê¸DïW.¡ü™)òÆi…TÃÑèl◊í:íz@}›N~n4©*ÿh4” ESEÀäÖcL¨ÊFc„|=n4Ø›™_•ö†∫\V¨ÿQ˛d?e?d?ˆe?éd?Ü‚;_Z†⁄ï≤Pw©lI%Y{≥&c•ˆ/∏≤fcø¡˜¨ìF…Ωxå9±Ò˜Ëı·Î◊‹HaÅn/~üêC)¯ª€XSÈ`ı‹¿ØÂıæÏ˝c+˘ªîÜÅ¸Å5Ç2}jN˚Ê‹v”ò¶ﬂ£∂A ¬R‹ªƒ›ª$⁄ﬁ¬¬+íwˇ<∆õœøE‚õy_—œ∑…‚É7G¿©Zxãh¿Sc,k‹…>c÷mÃ‹Èmz¿˜´Ìq0ôyû√<úËæ∞√Î»÷˛]"ÌGºTÉh¸÷2 ù©\+˛mFëÍH›ßñk;`—Ω√cr‹ËÖ=€oËV-∆∂ ˛÷©pŒSI≥∆À”¶ë
ú¶ÛøCÎX1.ËwÅç˙≤∫MÀÉÄW+˚ÖÙ∆"?2‹uÙ£Å9wdœ#_R©„ù{C¬©~!5JﬁvõÿC4…Ô§¢w˛Ñu7Î¬såﬂÎ,Î™9aˆ>ﬂ·ï
W∞ec\àƒ§t¨JÔÂvmà“∑‘YßüáôœÉÃÁ~ÊÛ>Û3Â5M_¨^≤¶ø?@~˚-q3äHë°§»ÄHäÙiëæ§»àUVJàΩÙä∑‘m)™ë≥Ê÷≤◊2£Á∂ÜÒñwèõs¸ (!Çøü1‡¬bz‹z¨€à‚˛‡˜“⁄uÃ∞≤!à˘^€Ã´-GR%±d\'âÌ'Owû]_8◊&ì©9›Ÿ◊73kP–5∑-Û)øπÈtw:›◊7Lk4gtw7;O∏ÕM≠Èﬁdk_ﬂñ≠—‹xØ;ÈrÕ∞å-˙,∂Û1ü†ÕÈÊ˛c`s´o'◊†+vß‡µjLw2£Æ∂™´ñÔ¶uçû‹ô}]gvÔœ»æ∆éÜæºœ®∫Ì‰DvÈ€°’væY<˛Q·V ﬁ+\˜J‘¬|ùj±–SRV\ó‘5ûø,åsps£ûg˝mÑµ~3¿ôµèÊÜnª‡è6üã}ç‡!ÿî7˘˝‰Ò–:˜,Ùax◊AhÕ[ëùw,L\Ò∫;‡ãóàÕi˜…¶ë]>â!…©6cº–moÔÁ¸Ê∫2è>x⁄3¢®∑bß»K€Ñú1›NÁœ˚2Iˆ”ÿCoﬁC[ã+|Bâ†éÑX:XIëÓ&–¬:ò|+u9$Ç*‹öXéìR∑€π@˛
8æX’åøü€&>√*Z¿ã&iaeïR¶lëCTﬁóëÃln	?ÌtXwH÷P†{)¯m vù2G`›5 l¨¶æÈ¥wî# H√'±íóÂU⁄û.ºSt≤çnmmwwv
ƒÔÒ:Ìï›:üRb%-Ón?Ÿ~{ˇë•€C¯∞ÊÿEõX(µbáU·N¡∫ΩU{B∫î‰m¯W8∫~Ø	›xb4IﬂkóôâÃG—-ñªeÑHÁ3ö„˙Æ[√7L§I˝–{.}?¡Gá‘Ãò‰¢ôî\˙>`¢3'Ê Tµ°I‡!‹./ıóf 7L;
ò†IƒÎéHÄd%Ïü¶O±r¢‚4 ©ı´·÷“&ü©XóCoA¯]ßngÏpóMÆÚ'Œ™ëp0◊(î¥÷∑ [Bq6’Ç(”L8[œˇ≠Î≥é[°s[^˙m|ÇªX3›´ÏﬂãfÌÊ˝ûŒZìôÌòMÎWÀ]êìp£tqböå0¬ZRıïôcN·©8–ò†ÕPë∞“ÊfGÎ5B~-VovÙ^ÀÓπúi3≠âÁ ^.f0P°jK√øÃ-”6®B,ÕpòËÑ	Î*ˆMiÓô+ˆ-'ø*@{3ÈYÌP˚Ø¿˛ˆ&∂v˛Ä>g¸âıÆÒ¸ô=?GÅ?9h$ÖoG£πq’ Û|√ä|—@‘Ö˘3=¿J……˙ï≈Íü:ç@íÑ·†ë—Ô‡ï;É(≤y™¬€>©)6ûﬂ¢Gc@àD˝ƒDM\ ≤VÏ⁄çQóÙæcÄ”"‘J≠ÿ:ı©∞•Â∏“âWï∏DÜ⁄Dç”ã]xdÃ˚ËeÑˇwÇ^ºSÙ¶ÿR¨xIÅ†i∆q0wÁl’…§qÇ√∫leÎfd«3ôU√‰ã3ÛîV0z±8h ÊÕºÌ’LR¨kH%ßA∂S„E·∫PÕàÍ≈^À¥©•1£ﬁPÎ›ìÈñŸŸØ3^•æRÀg<éô Äçe\ˇ∑4?‰€˚Aj<-é‡xjéß÷JFêYnNLV3ÇI˝lá˜<ÇÃ\¡©i·π]…2ct<Çi0«j0©û‡‡˛Ï◊•ƒ¢eb¨d ôy=¿4`e5òTœ∞ﬂHMÒ≈¥ˆLj°_~ Ÿ=@<ÄÖ†ú’åb“≈—“£®‹ïs:sz¥[E¢,•nóF≈ß+8ìUIoï˝IáæÆù‚™FF´|ãT{Øî’™BåøÕmrp’Îfa{´nå–Õ¢¯V‹ò ñõı≠º-n7çÒ[u[¸–ÌL»ﬂRlI$UΩË=è‰©µmÌñ.ì=rtXuõ÷ƒ4∑Jóâ¨MÕ^Æ,oõ Xês%YM"ΩCUb>”>Q%.çÚ˘1>›‡£˜,≤◊u˜;±'I—ò‹x˛&Ú#|Ó%Êƒ{“p+n´â›‚¡+øIÕ!MDÈH¸¯ﬁyn`9‡ÛßΩÀg{ÕÃﬁŸÀf‚Ü}Í¥M2⁄⁄ÆQ°”ïÙ¶J3ÃÚÖÆc&Økuk¶˘É_—d3Äf˙òd¸zºvZ∞—>v£9^˘¸IpÉøq<˜ˇ	in2ø£€5-;MUÊ…ª>ﬂ|{ìÛjºΩ3~q¡,aÜGÕ1:")ë’Üçe≈`‚€)úTÏv{£«…Ñökƒ~N~$∆ÊÊöÃ|¸lCﬁî8ÇQ√n!<ü@Æ3»ƒÒ¯Ä—<ásI>"y^f»Øº+Xï7ﬂ°3L
ûÈÿh˜⁄ÛÁ,]ˆwÃñ/<˚¥,€t135¥πô∏j‰…Ób≤„÷÷ä≥R[W°o»RScöÈ/Û∫Y™?∏f4Cè–K‚OΩÇ˙„¨SPÛÌ:Æ£¡:ÍØ£ë<]Û}&¨f\HbH÷A;å<gx¬Î≈Ãmöâ]Zè∏˛6ÌÀ¡Ryé5Cóp8¢ëô‹ÿ“∫|∂PBjÆ&	±°¥-º∫πÆe	°îsÒ†n√¿‡ ’±qÜúÑkŸ‚òr&ÂŸr=˜%D÷‹H#`‰˜K≈Æï≤¬w€;hq’⁄BãkÚÀ,AÌsèd]MR¸≤Ôûƒ+à ¢4øi,yúsîÂŒxï·7â¸¿Û[Ø∑M‹lÿQZÜ„◊`,«6ØŸ`)6f2tPﬁên∫[∑h„9[∑ßØ^£f{aNÂÀìŒ◊ÉÕ}\tıÛmauŒpÃ¸Ñ«_ﬁ˚å/1ÕÒ(ÂÁ˘"Xx>"XèË;<ﬂWNõòÔó√øÆ~æ”Õ∞ê¡{Ô74◊x≥F∏qÓ\AÇóõdÈﬁ!◊±ã˚ πoõ˛E*hu—‹Ï•n)‘2™Dí'rêjçº¶À˙_W°!<så1^+çÉüä}ßSWèb7”ËÎ ∂tæYR¬mwÖK¿˘ÂÚW√â0_ÇcUkxiñnö≈©∑¬~Ó˝¶’∆œ≠∞M™W$–Œ&«+Úu¢GîˇùúÚØJQÆ˜T
Ï@fıIÙº($.‹ÆÁZÏ+∞`NÕ¸¡¥Ä\Ca¡_∂¶ë„»ÜTÇ
¨:ÆÛ∫ÊÔóıáñc_(Û«1‡ıXüΩ˝ïÒπè„oLBÙ6NGA3ç˛ûVAêt…Öê!”Êldn%.W\äƒk SqHk¯#-Ö∂Áòx6k$ﬁZ5¯E®Z√/g-`.⁄êºÚõ4â'¶y_ƒô∞Û}∏∞Æ±ñﬂ∂Õ€ò	3cnU›B¨7πóP˛&aª*"¥:∏&ïœœ6Ë˙ZNoñ¸$¥¢©ß!(¬aÄNÀ(]˚iAﬂÃ+‡ªD,nIƒ¢ƒª≠cèÂ·åç6Òàg»éÀ˝¬pÀÇyO,ó;5ÂrKf‡«U%xƒPzL˝qÓEQ‰På*xÊa´+•˘&…¡z ¢QìÍjGªå±dß≥±Ω√·à¯˜ÓŒÛD÷‘Sã+—˚eà¨5™"K§9úoQÛ&N}˚Á∫=®Ãã»_8ñê7ÿœŒåé⁄úëÛ°ª_Ó`§◊eéÑr∆ Èﬂ˜«$c¨	YÑ¸¯‡B®®ÕâõÙ˝≤!∫.cöS–œ˜«AÛq˝ı¡YÇíQõ'b«Ô˚e	Jt]û öKêè˜«æàE˘Ò¡˘ÅëXìb7ˆ˚eBs]n í7êèÀrÉ‰'·©´Ëø⁄÷%ÁoÍU‚[¢∏3åπ/œ…D2âuº9jÒ[<p◊…, 5VÈ¶ql·˝¬v ôëk®´F—GCﬂ«Ñ9VhC-ƒg#„ï[&êñí!∫[»eZ)∏ébq¢$∂ì"á¬-f—»Öª0≥Ã
ßoÆ≥˚ìL˚,øí√ƒg∂Âò} ”îTËÂÊSmã^Ü]∂∞P7\{ü«∏G,ú∆≠Õögëêô±0W›a∞R7–"∆Gö¬,»ÕIR°.‹Ä¯Ç±°7Jé–á±1+9-,wB›ûpo¢‹´¥≤&’4F ÒŒ”Q √"wbRÏm2õ⁄Í…÷êû1[ò: ‘[Fz*O„Lƒ}üözÈ¥ ÑÉi0‹ vË¬¥·V±|n]«g@uªFº-ÁV‘ˆŒ*l+ô˝#Un
ûHã±ÃâQI7£='Ã†∆å¿—ñT•,%~øRïVè¥c£ÑDU±“ ™d
”ö;ÑﬁÍ4ΩJ„∑&}√˚¶/9˛i8∏oânØO_ˇæÈKmnöéÓë¬Ù»§Kh©2≈p‰L‘Mjiàõ)€ìÔé‡'	¡∆7ê[…™0∫∏&çóÜ”eª/‹‚Ÿ	‹2ÌhÆ—ı|≥Èà>í®^?‰ŒÓÈC.r	ÿ©©∫vçüÃË\/¡Æ”AÙbïX ‰:Ò£«8(ÖJNQõÌŒj/_jÚ&<	µ.Q
 u∏◊Üâ0H‘ª*}àì‚‹ox∂bâ°»hÆ—ïª°·∞∫~îÌ…ì≤≤Ωt«(¶¯˝ˆåˆfw';aKw$k˛ 3ï±ãñ.à´ÎJäÃÈﬁ€/£O…≈’“R_‹Wá“kó•{4¯2z+ÍÀw®ˇet(sõætóF_Fó“ù©‘£¨«‡∆ÕfÁ∂j),˛v≥|Ö≈Ìd|∑UI/í†Ò3õ?íà˙ºªtüGw3À:ßx´≤œ≠¬3©q>X!Q ﬁ¥à6É*õ‹∂U
»–±vvs¥[[±Ö3¨jÍ‘©Ω¬Ù¬Øq[Òµ´o9∆ï•÷’ü©Æ‚b°ÔπÁœﬂYx Ü˛·xsräÓr-˘Y9€:≠iìT∏«∞]‚TMØl/…2ùë”U«ΩÊœﬁmhÓ„QîH¥èOaö„a{£ÜuÏT√òPmfbL2Ë—ÆÚˆ—è—‹1fº«ïµ-2©XM√1ÊŸ–qz{Ûeœ1‹Tr&ykïì¸Tsí’Ê≈Zì6´Ú,S„ ¸Ù’≥’dß˙"öGXŸS4è|[vø®KıÚò+¬€9ÅÛÖ®>¡•ÌÎv≠πV aøÅÌˆWÎÃZx~8å∆#cLS‘ﬂÅ÷‹&ÙËQ°¢¶(Öf6ûe„∑áaâ˝HBˆ±Mo6°Eé÷c«Q	;Éˆ<¢û)$¢Ô—#îˇ¶˙ˆ”Ù¶¸Ò„5HuÜﬂ!ã

«ü	ò—•Âø4 ·ÖÙÛ1Tÿè·e)∏’çˇ1?ÌmLÛQ‰D§ªz8P\’>)d∏èÖ9<ÈP·JX˚k±sj8Å%&ó8%Y¡ﬂ0-í¯œ:L˘¢î≤∞0Æ1¡Dá~≤√YìWÅl∏X˚4F-”~&*ﬂ~‹<|…+ÕœjHÜ"◊WL~∂m‹/ÅKJy`C+dIäÒß&èÔâ	: ém€‰Eú÷!º˘¬vãy¸9^/cRK∂ÌˆÃö„vÚ›öòfr`ÇÍG$úRSÊ[lc¬£âÖWe4_GcîÕ—˜h‹6Êxc	◊QGH~R˝©aõú ≥] ÇâKôÿ~°±∂¢÷?∏ã
ÌSΩ˝Ëﬁvh|çFÄ¡. @î5é!èÃ˙H €{xF!Ó|EC˝^Bs=‰F`µYG@`·+ZÓƒõ€. ¥gKæD∑¯ËÊ∂<t•!äsÀèÒü
…L”¸ (⁄&ìÁ;N;˝Iîfò[ËÏîπÎà2°gFPX¶0§“∫“R‹Bú±Ê«fr{€ŒÙ	Úôvyµ…ﬁd‘¡ªdz(˚äÊá)Ø«*Û”N∆WHØÏM}zÀc(“ô·*3Õ(ﬁ∆í“∑≠†ôßhçﬁR¬÷â”dâ∆iÚÜÇ„¸–nì—xø-&ê∫~-LMmylÑ≥6Q·±"•≤√≥¡{s}˘ç¿ù´Ãã∑kkÌ ´uÕ¶ã4É.÷∂C0_zÛÖ·[x!ﬂrw,ﬂÿVÜ^Y°a;eØ∂‹¶√…
†pGduJ•LoÖ*iŒ∂?¬¿Ï/ÿl≈jŸ0†.6ã`©0W'€˛Çª›ırM&{û¨—[]πQ¶GÒEwæ‹ÑÖÙÖ¸"ô)ëÄÒï¸L«Ç':x
^<T`˙ÇQÄˇ∂	©±ø1^òú5≥‹óññRˆGÓä∫3ÃH™ C‡züÿP46¸:Æ¸€YOhëW?sÂÊ_Èπôãfƒ¨…ó+aOm+o<∂¬rç
òH5÷¶‹£ªhæ·ﬁŒÔä±.fñSp≠«ä•{~aÑ=©±AÌ≠çr¡;≈≠È‚å”∆›°]d–Ã(óÛŸzßÑ\&ÉΩB]‰j%a'yx≥⁄E&*&æOY-Ù≈¯Cç'oﬁıGzêÖjû4û≥◊—ª√£˛=©UÕ”b5OkU≥W¨fOßmäﬂÅƒ†YæÓ]^‹!2ŒßçØÚ‚.ÂYZö7ëkˇ[dë©±‰q/¯àƒ‘.•ø9qÊÄGi∏‘®∑¶4eäÃÒ#gA‹wr d˝“0ÕÅ ·◊ ¯¨30T>í‚w5:s}?p?¢_ ™z ™	x™Ë#}à‰ÅÀëëG@ÅõŸõ©É ~ìº10õÇ4ﬂÚIE≠¿"ÍπÏÌ[Ò Î∏n3xØ,Vk¡á8	àU¡∑÷GcNÉπR°UˆÇtV¬AÄÊÕ@3çŒ˝◊?ˇÛøÑ&«qΩw≥ÆÄ/@‘úÅÁ˙»#–√\ªS˙ƒì\:Òvi˘ÖKÕ¬‚3z©(=ØÀyÚ¬e+î¨¸Ì}-¡ƒ£4YÅ	Œ»ot°≥È
<$úÃ†≥ˇıœˇ¯˜ZKP	ÎF‡‹jπUDRñ"hòI™biJcó@ö;‚ÈWgˇΩıè–®ˇf∂Çé˙Éì¸#ŸºÎ`j`FNâ/x2»=Öœ…ŸÇ¡µ•)…Nƒ25Hf¢ÜD=©G=ÔÕáåPùúç>ûAQôÜk†–8∑ÒA·√@kxz'≈¿∫ÉÜ;“äÒb~_|}vÿ?IÆÌ√„˝øıœ˙˜…‘ :}ÆÜùÛ7≈”gñ·ÿA¬ÕÑ{É»4fîá=5ãkñsŸïwÿ(™ŸKÆ€?n^Cã»π7 •ﬂ◊¬}8yÛ¶ˇ˚»>ﬂèeˇ=.-G“‹ †ä‚ojmÒ¬@aà$)“|l\_D≤L∆ñÕÒ2q"÷è‹+ÒŒ∞†ﬁPÂ. 	R.qC◊◊≠æT¸ßïC?ùë¨Gìîçlè€m9¯Ù"ÉãÙ£Â⁄bÿ√‡A•ZEÜä’3œò¶·€1‡”/–taù€Fà⁄¿±Œ¡[M¥(ÈcM¿ß˙ÿ2˜å+£ô[Ñ'ìE–Üí—∫· ¥hg”ÊÉªåß –>eÖöıÂQ^ÿç&IhIX™Vü
cñõ}u¶ÍÕîôı˝‘˜Œ}+–üÔ1o±–Ç*‡M¡£è S¢vE¢—<gà˜ªÉõ›€Bd⁄∂(l<ø¶lÃˆD+Ñ·Ÿá8≤X2:âlß@]◊ÀveIWX4—‘!hrà.˙ÁÉ\.Ä5*≈ª–∏b}zΩÄ_…wqbGµJ∑`ò.¡Å–·´åêΩHÖ¶¿«á∏ª-ŸZ)∂¶+°“CâJº(o±∞et¶Æ†∑
ú…πÀwãàøLØD:ïfˇ@ìœÙá˘.VWÊÔ≥è’—æí^fº6∏èEˆ‘ÏIÈP¥∏¬{Æ´úâ6O¥´D8tc;{pÂ¢∞™"ŸáçÁ$º˝≥·ö¡f∫É´(º&øÚU\ï*bÉq¡K¸ËÌú¸ò'.Vt*’ˇ0øW∆K-6\â6å+äS6ÛŒÉ2À‘CˇL⁄	
µöÿï—ÿ
,R:CÊz8◊Q_·ÃÅ06Kœ±åáã˛ÁÎπÔ7pÓ”Â\ 'óéL8˝c≥–V~‚„ı+õ,ÄïTV¿Ql¸≠¯ ◊Èøã3_
A˜ågàÁDLRlÄ/Úÿ«ôïª?˘!<∫Án+ÙÙ@À∏Z©Æ˛Yt≥?®Çòπ∏UÜÂã€·€˛.£t°I;–oÒ.ú|Ôamõ%ÃıI-oπ˛ƒ»Îuô¢|œVÒ\A#}» Ø£±˛∫…ëD–∏∏Çu2ù".8/'™Ü¢“ÙJdqÔ¥2úÒﬂˇ˚ˇ°õqb—=3âÍø˘åœá]öO¥”ﬁL‘˛yÈﬁ/õÜ†I}{√	ã√ªJ>G^ÈF]î-wãœLÓõXßq˚YÀï6}DT}8È		/è>#˙∑.Ä€ä≥QA⁄©¸vkTzfòZñÇ‘¿î˛nÕKI‰˝˜ØtUSõœ∑rYå*u˝h‰} `π Ñµd~PÍ:	TñﬂæYH˚ÜPˆΩπ^®Ì‹ÎIë¸πüxΩ—?BÔ>F˝ì· 5œ_NGË˝_œé˙[CßÔO?úf,QÄÁmŸãÿü Í$-ï‘˚
o£∂Xa´É˛A—2. ö=∆;èÈ{¡ıìî,«O—F%¥Ü≈[ﬂ¶:pä,Zª‡ç∫h=çµ!á•æÊò…v ﬁA |Abêÿ_œü!À˝#√K–m Òø\=*qZnuÛ6›å	œıZ$å!gFØ±n(í∆â\ÌÂ.ˆ◊z¢A8ÑäfÔ–Æi¯&oÂgE‰.u’Œ˙]Á¨≥⁄w¡˚€òA3ÕS≈ !Å©4îI2#µóÚ`gÚ9Æ›
Br'q%/úà∞‰,t∂º¶c^°ƒ°Êªù!Á–È´◊E©%r‘æÀâ1€ŒÁÁ-¶‡Kú∂•ÀMwÔùÿæﬁ§ÒL∞ :íÈüxæÖË_ÁbqJàƒƒ·ù·ñ-Æ<)¥oõIƒ‡$‰©P03ù•Ó™ÊÜ≥áIfkÅô$£©îÑk¢‘∞„ë1Q,ÑÈHµ9±º£b¸„ì›˘¸öSÛuÃ$‡ìelÄ®DNz≤ÏfŸ<µjÛÿØÀuD›ÕâÓéj∫ªw¸‹ﬂEæ‘YCÂ5fª—€√≥c¨ƒ€?ﬁ˙ﬂaˆ*Vü¸†˚{edbrê{û
DBKÊ 4ﬁ‚°·lùr∏!@:g¸=z∆«nÇ…ÃÛúòfÏ˙á∂„ù{y®@ü=_—˛‰†P#©P+ÿÈÎ)3¸è )·—wCpê	fxÓ/∞∂uÓ◊hﬁ‚®8√	G–É#<#‚ræ5µ|ﬂÚO=ºa\4∞Ú%zI ß)”‰Ã"1ïÿ)
w5XËk^!ñl1‘ãò2Îºxd“u..ÒX>±1<>E«˝«˝≥¡ktÚùˆO^ı˚'BÑ¬ØXB<≈è%ÙªëÄÙ?-2JUR„ñ:D„}_∑›8Çã súM€¥·¶Ûÿ0|{äNåôâóW‰†é17Ó¢ˇO⁄;≈†∑≤ıg—0M‚yjëÓ:˙—∏4–»ûG~≠nHÉ\—≤πrŸ≤yˇ¬Âå˝CIÒe7˜∆Ab”Áﬁ4ÖÓﬁ"`?
N˝zÒ·›( Öw„·Ò }'e(éìB*H≤¢ îTïRx.úY”˙ì‡«Ç!†míÀØ∂mÇ»†0öÕŒ:Ív÷⁄°˜ÜébËä‡îﬁ
j}£ìhãi«knì9ÀvûÄ„qÒM/ãSË›ã0ﬁÄ@[©ÅU∏j®oîπù;mÙÓø{ï£g∏Ê U`gqZ·…Œœah2}~@|ñ ;`_]/p/‡G7eµ¨%E(ö7*ÆkÂì3çk¨ÿª—‹ÚÌIC!^E·øÃ<?‘z„⁄¬ÛU•ë[TIO0∂•õeSôÅ^~0Îgù≠1§ÉJéx‘Â¸ø‰ÉWöÇti  $ﬁΩL<ä&∆ñ$H% •∞ƒ:∫«ïÙ€ü¸Ø+Å="Ò2Ò-‡ÈUp]R’}¨ˇXåW7XKuZ0™©uoœïZ◊J¢
#TaÄ
è'¸¶Å§^è∆ë„Ï´JÒFüª+é»ÃãÄÚÕñiü€™nŒm7
-Õ‚w¬Ÿ™aëùîEòÍªÇ©Ttí¢ˆî≈∏íÈ4⁄•ñ”]∂Ùî|ë˘äE)>…Ï?Ö]+Á∆∏ZKœ
Ü·d0¨5ä∏#· àS*?‹PTUçQxŒ¸*ù£ñµ˙!_ñ∏Ü °<µW$s‰ÎÊóÂíÊ&ç°ÁZΩJÕrL'{;J/I:'ßV`∏$îÜIgá—ò8’µØjûﬁƒ^ÙÉÃ2q\.+‚ﬁCÜ{ΩéÏ8å“Ω5uhµÀﬁ¨%πMÎ$wNΩ^2«l}•ÿ^ÊÆù¢èØH≈fgÁºƒç&O®Î~∂íîs±k≥iô?©⁄Tˆ∞dÓewy∂pgû1É™-D&`A˚^8◊C+∏ÆÂø‹‹†üûÖsßá“~IêÈ#L¨GÖÔùtàÖ ¿¸#ò,ö£¢Pd·∑*Ö'Æπæ¡U‘ÛLk]=DA—É/"ØÊ¢‰\/p¯˝,á©ó)!¢'∫C gÂ9Ç>Ç*‡»¢^‰¬…∏ÄÏ˜5ôEêÊj\—‰	˙X%d‡Æ&rHÏœ=Í\èöß˝¡+ï˝c√æíQUˆmdå#+©BÕP¬¶µ[rö>?†∆©Â^Såùz‰√á;wç£ûüád®ckÓ·’q◊≠@aæ1ÁD„"∞ìô÷=eÀr∑Ã™ ¿_R:[(M2¸!Ø´i’∂íTºÊß»zÜk2∏µ
g1~ §lÏk	2=.≠Ã3Ä∆Uß–“3Ø )	Ò›yuS,&R>U?·°—5aÂƒN^„•»ƒõo…IY˛ÿÜ‹’=Òπ±]”s≠¿6\Bˇkœ?ã∂1\Ü–≠¡»ÒŒÄ°ñk3Ãh‡N=‘<¡›>wÒ~Ï[à äØicî{3ÎNëuäIyõÿ&¿GBà ”z•û\ª•=df&Ó˜1 ÷µˇ1ÿ––è‹	Æ∫Òº)3˚Y∂◊n◊ñ∞v≠r4í©ﬂËõs[°ÀWé¢ZË[‡˚Ü'¸‡ív5á¢û3[ÊŸEN|ÀﬁL€π°⁄Èhπ˚ÏQwüMÂqÓªÔæC£√≥¡qΩÎo·~ˇs Ò;*ﬂ∆3õı\‚pû]¸ìPLØR„1u≠¸ÄN!pD`7(#ÇÈ·~ÕW∑·“aÓ¨gØt|∆Eﬁbö!–Ox*∞¢Ë_†Üyn!œE·ÃB,&ÀÛ¿r¶Åv”, Ÿ¬)˙—#Ó¯h˙‘¨âJmáÓ€böÈÈQ@ÙÚdKÀ¯3c i[∞°e¢…ƒ
i¢ßo§’H^T7?ÒÊ«ÇÅ_[[€›ä«„ã ‘√√{€∆&ø?Ú°E¢òà®∏*~qMæ±ÜÅâ™±ÕW5“(˙ŒFw'†∏∏jÌ“)’≤~ÖΩπ@Ú˘Eû/ÎIdJ∆Åû/t∂@Íù\ÛW∏:∫Á®$®_RFbì—p`T◊Oé€√ÔÜáb,ÅZ[#VR2Å“@ò≤˚∏Öw:|˜Öf®R‰,”ìSï9Sàb ûÜƒYŸI=°[”SùÑzÕXp‹æG|“ﬂy4å|„^\“ÀÉúÖD+Ìœ√Ù™è|£<ìf‰Dˇ1@dŸGº›•Ñ$àú∏≠◊<ˆkÁ§^È=”•À∫‰∂./≠·”Nz≥rW±˝≥‚rﬁ÷‡'8ÁmUs~Ø~çx:“¨L§¿S=Æû‹Ìv∞H¡ˇ`ÚÅ¥Pß|ØHÇ`‰≈j»x$ñDKÍ˚ICH]\O∫´@Æó«S¨_º≤(;B∂Fæ]ÌT$Ç˛aΩ*wXUÁÇY"˙ûD‡-56ºãËgôv4◊KÂ„M&>~kŸ≥>¬zÈ˝.∞Qø°q]®Áx(TM/Ppb„†>ïhd9â¡QHÎbÃ#‘Ïlmo≠°›≠ÓÊ÷ˆRSÆì"V£ﬁ°sCQ=>íPwØêƒI¬sßõ⁄¸Ç∑ã¨‚ ›9Ù ŒÂ;_Uf<–TAÔB»)(S*≠u’÷™ä´æÍzwr°∆¯K~º:7bWÁWê‰Ãª¨ÔYôÅ¢¿ ñ÷%—V|J0ÒäÄ÷¬Î5≈ùÀ«Ófgqısw˛ô˙%@êäü‚“ŸëÍW?éç»≈ Ü,ØE≈k6p„ymˇm˝êätÁ~Äô=vrÍ&&y8áÛò%Ü›˛%-¢ƒºCùtjÃîü¯úÍ©”∞
ñxŸ"˜’¯…˜èc¢h≤ê{ä¥)˜eæΩ¿ßòœ¯ÉË8œSÍì∞ êç<Ú 7’Îyó¸%úÚÎ∫Â#»ZÒan˚äR’›ç∞~Ãw+‚\kc÷ì#î.~“	◊3±öÍú	0öo&÷@Mä&¶≥û3>«üg" @ hL≠à]Ú5^F∑}0ËE™áÙπ¶«®êuı"EKO¶w1≤ﬁÈ(;∏Ç†aLÉÿqWÓ]›±ë
q˘È}Ö6‰•C 4<æ+ÎCöô2˘¶“ãüå_Ïqg±ZÅ¥
q£”/B<$÷≤=”æXI†Ü<T#6{[°gZÜOiï„z9Y¨pÊô?‰zŒ·5^ˆáo—:Óü|Ë˝ûåœ_i–•+ëQÀ«ó<‡ ê∆¨¸6Ei±ß)«øroÒ—IùÙ`Ãyë[£wVƒí°Yñólq »oìAWÖTàCBC√1=»ùfÿzØg£írokÔ…¢“ãZELP>*»r¨URá≠ly-6ªîñ≠∫ÁPFUå#RåSåS∞íkˆK]ÇccjŸæ ¥kÌiDJ•`éΩF”Úï…=á¿hñA>‚ùgÑ≈)Ñf√ß‘ù ÈnÅÖ@ãR∏≤—π\ﬂ‹≠0ÚGﬁ‘ä¨vä˝'N]8Z¯ß#íi:,K67ÀC\È¬[≈–VéÁûKäi¢ZâÄûÍb5≈!Z∫À∂úÖ’Å]àWŸ.∑p≥W±n'“°hò±ù•*ª9ÁÓ.€b'*_yπûﬁ]bm7÷Wj,!]U3ÁÀü∏&ælmmf@Ñs(ˆrlï*1iªkB∏¡;±ÚÛÌFñk9Ñö·9ít[Kkg• ò~•‹ÇRìÃ§T≠a!VÎU§ ;YCEï5§∂?$ ≥B†ßœW¸eÈSy<KÀ_◊ √ØïÂá8A˛„ér›†í˚÷¿VÍõØ/#:ad’kÄ√–ò/êc\’ÀG∞p7í¯–òıDö8©≥fd1<ÀÜÈrÍ®aOÌ(„Uuaôhcﬁ˚5#é·©u¨7öë«H£è?ní•Jth‚TÉèXøﬁ°òº ‡nGôDUæúâõUå˚êbäàW	yKëÆI%¢“]üÔ∞_nJe´%æˆ£–LQTTäo≤∞ CoéyÒ\A ¡Ç≥‹É{‰¸Q S4∑ØZc∑ﬁöGNh/úk5›˛å|üÎ¯!2ï6dûƒ¬¥"–ø©æ´Ÿœ¥°5ÌCº.ñÉÜ÷ÖÁ≥e&~ìM¸«]2œtˆ?>I˛∏7¶M.lÚX ycÇ˚‘z∫Û`‹ ˙IeË˛‚Õ*öÿ6	_¨÷¥"7æˆºP;…eáñ2ì4´ƒ/õ—Eh£Ez∑3d‚Ω√€!‹›yò—ç–êÁX3	Ve%∞V}{Œ7∏0{Üå–∞÷Ê„ÊÌ	Ù√ì‘èn˘ÎûM!aÆ Ô±gÍ3?c#$X4/»¢◊K‚ù±Çyè|ˆΩKÊs,uæRv„ºﬂÂ‰›2˚¶!ò[Hg'åÀ›Êﬁä$Iäœ¨`n3@"4-“ƒ]'¬úÁâ˚0&˜í‚9ƒCÖ◊&áQﬁkUÊÎRÓk˛!ÒÆv.€dºõk˚‹2i÷l¶6]‹Aaœ=≥¶æÃ¯µq]-3µ∏jm1<xH pûÄ≥Ï&ô¨3_>âØh„tﬁ≥ÈπSXÅ£F∆†Ù,·v0/¶¯Œßı.è=W4íë#∫Ê?¨ÉõÓÊ-ﬁ§ËïR kˇ˙Á˛g}Û3¢Øê73¨1W…LÒSíßSñ\Æ0º5Á¨êI=?!z3ZG{t9¬∂ÙU·ã‹ü©≤@∞9èﬁøË°£˛È{HzŸ<;ƒFË˝_œé˙[CßÔO?úfÑÓço-<?ûçºVYí-6$”∂]<â≠V∫ .ÔΩŒ>1aÒí˝™≥±çã‡5`˙¯ 6v"üM≈q
-∞–ÊäfŒU:]èYÏ'É∞EF‡°Zªhnˆ≠ßLØ‹æJ“úÛrã'â—ôJ∫◊˘uVº
Ñ¡ß;¢Û¿H¡∫üì›ÿ”1ÆóÿÔ¯;IaÂ8Å‡‹PÃ|ıñ–πª>â«BΩ]‚≠¬>˜hˆ(Œ˙:ıÒl∏øìjG∆º™8+éØYxûX|Î˜Ü°∏'+Õ‰Ë)ˇwIj{p›V∏xlä!kÖrïÏÖá'qOáãÕhﬂl`¬j†oä—Ö”Nﬂ|∆¢x3N£¬∫ï‹èg“FìIñäRÙ≠ÿòÏÁHdV©òL…yÎîäÑ,#=IóˇïÙb§á
ŸÀÿ∂Ràî‘p˚ô?Ç¢c‘ø˛˘ˇVUËó‡¯#⁄ê…Ø˜¿ìô5πÄ§;_8w§t˛~ÿ„øˇÔˇ¡éÙäÜTÊ¡9Æ4ï‹ríìÄáOºÌêœpº∏À#E˛†÷∑ˇ`z˝/	\TØœl™øGµ~Ö—bj}Im|È˘XÖ%√Gan–ƒp5<™T°$:x‘œ,ŒÕAq°¬àMÃw◊Ùÿø9Ô‹∞[€ƒì¬pvÄö#†<><%<+âoÎnvJäˆHæ:Z‘º3¡´EÅ‘™@G·√É¸~:µ'6Vƒôû·∂PÇ`…µVG@T&¯Å)ö≠ç+?‡†®5@•‰†\h=∞P=®– FxÅÒ˝>AB´:nÓ•JE÷uöéOÙ20&ÏaØÏôÿŒI%•ÂU• Nªä¨≥rŒV»8+ˆYÊ6¢¯µ(jK-™#∂4ÅF∑ïŒ≈Àé÷ÄU‹I÷ÅÕc«¡’>˛GÄGˆ4tú h≠˚B·]°òW.¿¬ôØ[Ùﬁºóó4⁄∞¢©˛X`t	x—ïÄã÷ûb∞JX4	YQ∆Iﬁ¨®f6Ûöê¢j@—U∂≈ïEOCSUhÆ»t8•´á“÷ﬁP‘x"u–Ikn-Rd“ª€[‰†§¥ª¨åTƒ∫©é⁄{ÀS)˝VØ-ØF_Æ§1W“ôóÒ¢Æ#Oƒ∆KÓ˘ö⁄¿r˛{júÛΩ,e@Û$=ºÛŸlS®L•H\b≠Ã"æcœÌº+™Vó‹O}fW^Ëù†∑‰{`/∞1+Øº◊¨ilˇ!%ë\)ÿX£ ∂gg–?2iî?ÎÎ	ÍÀ◊ÛY¿†‚ﬁá1ÅxíÜO-XÜxQ"¿€+J*èº¬c\Ÿ·0Ö€Ú≥çŸ&ós9©f≈ ââ$ß÷bZQ7O	.íï?”A%Ã‹Cﬂ¶2q·˝œ·Ûk€¡ãU™RD)ÑôÉH@∫≠xÒ|˛—r´<•À%¬>–´xYΩÒìuá÷÷h∏®Ë£—‡‰Õª˛Ω;<Í—ìuÙt3ﬂ^÷˝..¡≠w˝Ø∏uòöm˚%∞Å∏mR¶%Óã¥Öë1ã\‘ˇÖ∞%˝!€–ﬂHK˙ÿ˚·ıÏ„mû47Ísﬂ≈MUûùÂ≠ò§xyØz¶8ıJ¶+.]oŒ8o◊Mï¿Rå‰1~}’£X®S2ÇP≤ﬁËﬁç7=§»Oôf"#7>xr∞∂r	mABÂä•´ä·¶ÃoB£BÑ§óyX®¢4∂'hO…xàédÕ1‘*‹—«Â¿'Y‰“ò≈â  ú[·OÉôÕ ~iç4R⁄@¯∫Æ¿›îç≤ä«!Ã‡'´Ü#îG»¡íÙ6L√:+JÊΩ™„"íÀkÇJÖG&À0⁄¶‰  t7¶ù¡LªˆMÒEiÈBa¢u\∆rm€ù8÷Èõçê r)@Ât+õnd8!Ä©(ö¢Ì[f4±öMc2YG≤∞ÒGÙ=ö0¥úu‘—õ ˜.Pj.•Qå≈	TŒ…jj#¨µ™ zÜc•‡ÿ¢òÂåhSÃ2ïe(‰Ä·›’xsèi≤/Ìpf˙∆%LƒSéèÍd®èººqZÀÀ—Ô9S%€û\+ƒÕh¥ê'¶≈[Aè66–±míçq©xi8ì»!vˇ@B›úΩáªWM™P·¡˙‚î5›XN3‡€≥Üöbõmˆp£∂)∂ìÖˆ‹Í%˙ä∏"ê
ì?ƒÂ!©¸πÁ√ôvxz*1‘±<Xç˝ˆfÃPÖ|$ÿ¿ü≈/ÊÜ≤W[Ò{‰ñöˆÉ}ó•+ä≤µ#,âWÂÄ§K∆/‰√0 fbË1˘"M∏ì
îö¢•ƒ°·ä94‘·–PÉCCXêìÜô4A˙‘‡‘0Å≈ÃÕ0R5ﬁ/0lXôaC}ÜıVR&fÿ´aULgTÃ±pBg≥;T”*€Ùn’ènÍ6µu…Í[HeçÌn∂ñoÓdoI¨ :ÎvL!»á[
µu≠jyfÛ,≈∂ÉèÌv;£≠£ÏﬂT>‰æÉ%˛©x~(41ÎàrYb47⁄¿3kmºæ‡&±πÜuΩ‰«qÒ«⁄ˇX#å˚&Ïw¢L—|ù¯P˜Òhéu›L‚•Jçié}E∏∑⁄úSê˜¢†é´^mS‘¸Üæ∞Ü|+å|7À¸|-;ôW#úÃ†üTdê?õâ^¸˜fÛ„ˇ\˚Ù˝⁄ﬂ◊6lÅ=âR@ﬁ\ì‹Ë2 Hπè›Oy¸zQÕ¢kZ“¢\ Æ±¿*àö¢∆§äﬁÙGá?ıˇ&.%q%ÔOé'áËÙç†Ü[Ω›èÙÈVg.LÔ“’b@röKP‘]⁄ésXâÎH÷´ºPìŒ˜7∏Ÿè¥∫O≤AŒ√Õﬁ$2ÆÉO†Ïåˇe—†g*eÀ}ê]u¢
≥/N‚˜∫¢“lnÒKÇ9]G7∑ Zœ¨	ÓœËb]œÙí&€èªJˇD∑œE"Åµ(íãj/ Ì
π0©ØAkÕÁÜçœæb–p~Û‚-‰ú˜“?wXåUÊfñ0±µ≥É$ÿÆˆíƒc◊œ9§Ä•_EñT˙§i~àΩc„òÿƒzÚ÷uCâ)LÔµµßú>ê⁄*gù&∑Zí|u¬)?36q p?GRØ1pµßvà∑Dç…_˛ÃR:øN≠Ï)û–øYÕYOøŒ¨ÏyGúµQíjÊ>g÷˜ux<•â•ˆÍ?‚Ã*Ä2≤ÕYõQÓ_3Z+-›‹πÚÅ&Xì;g‡É¬ƒvl˚0Ò√â†í^H’π|Hå°¿’ u¬sâaRw‘9‡ïÒÉúX!Í;6l/?X…ßY,˚Sì*xÏK"ê•ıµCs^—5æ&cXçôgj"„£®•phÊ≤≠fûSÕlHR÷√'¯Q≥à_≠äﬂ§£3€Vn"{˘X™Ùå2ì0~7—¯È∂—ôçW0¯|∆Æ≠Ù<`˘¶1Ò_rî”õÏ5b€±‹s∏ÌJ“é…–’ümÃ∂•„_+A 1	¿.ÅlbâÔã‹–®D|Ac*â¯,Ùπ9§ "Å'∂;ùB‘|)	É–…;ŒÚ‚™ã ÔE$ú¥íÏ˝hÃ’ÌnÑ≥á°nhó⁄@'É·L%Òs¸ÇÈ£ÈoÒ¢˛Çi§πFÜ¿0Å≠'ﬁ‹v9 Éuà≈e|Ö|⁄–Pœ¬±g^´„…jrΩ◊—»ΩKd†Œ<MçR`⁄≈Á}√=∏Ÿ’IEYŒMÉ^'{Âô-'Î€„Ceùébùﬁ6çdòZX.Aˇe&ó|≤Ä
€µy ø≈O¥r“aΩlµ(ÁˇìΩ!’…1¬úq¡GÉ^nÇ˜≠kÍdHA®…ﬁ°7O,òMΩGµnK3=Ÿ¿≥è¬:ù0ìkïCË¬∫>∏Å˚b=ˆÕcˆ»$ë»,ˇË±*Yóï§bA7◊’R‚Áf¨óÓ+˚TKgî}‘Ó^ºgô0œÚS)≥¸T
-?	™“∑““  èû`beÎ0ôÊy%˚‹Yd¢&öˆÃXDA„Vs•'’ÿ‘Ô©%Ü»/ıÚÓF§¬ΩìtÅ‘w‚·˚†Å”œ{Rg…ÿWÚËä–fSKÊcX¨ƒó–M.6W›≈	∆ôÿ®û—∞Nßu4#x4t• P⁄<ï˙8.÷çÂlO±´ÏëéÈ)À$õF”£éijgu¶©Õ6:éhÕ;+2‡é!πÏbFïU*„:¸’*ı’*ı’*ı•—˜£ä]Â´"Ûˇ  ˇˇÏ}]s‹»µÿªEÔdΩwËÂøDIKK⁄"%≠ñ+ë¢9î7ÆÕ÷nœ»Å¿¯Xä¶y+…Kﬁn™Æù∏‚r ©˚îJﬁR…Ú/O»9›†t7√!5“ÂlïvàßªœGüÔ Û)M‡?Ì¿ôwÊ)ı(3O’ôˆùyJ˘ô√<%¸xÄÃ)Vãf$Yy´—>õñåAR∫Œ{µiY%ÓH3}ﬂ6≠‰Œ¶•˘\Œcû≤ Û™~gô∫ÜUÍ)S©≤ÚÁŒ∫TõÂùu©yWØ£≤düKU}+suÁÔ˝Îøê¡ÛﬁÏkˇp•ÕÛ;¯¸ˇ/9Ÿ=ﬁâœø~s≤≤K,&s⁄Ò‰l“CkpJ˝qÆo#ü*—ë°√î7¨…c+uEüÍüvÊ∂‰Œ‹vÛÊ∂Z›^‡i ∫Ñ|L∏≠æ(±¯rí∆iå…ô˚ºÎú^´—`ä”ßÇ-‘.g¯âôJ'XΩk4°æÔxdòß™ac?s⁄÷a{êP€4gK
ï™‹A…Á,´îcT¥åñ∫ÏÃó‹yr “ËŸsÚÏ˘…Ó˛´õ‚À◊¨§rNˇqWì”∑“V!ØÅ»eJÁI°ï&Ÿæ€ i£ äyÄ™πéa*L3¸N √*∂˜I‚Ôyzx≥≤ Ê≈%1¿ï2¢’J`ÊCÏL√¸≥'»Õ@Mç?ÅÕ¿Ÿ,]ÔÍ]Û9”fΩa≈Õôr;Ω≥£+ mwíˇÜŒn»,*∏oËLπ∏©±y-˜∆@Oúàπ§nËØŸı˝g74<è¥ºyKµ0C/üïπÈ<≤&ÁáÅ…9Ó≈AÒC∞ Î±É»ü≥(≥íñQôÅ|gWV¯Í`1òV÷ßyÉ%Û∑›EKZ}Ó¢%•aÓÏŸû√ºVVF≈Y·∞%òGkÿE≥% }1¸[J["Ã™Ø^cÇVÖóña dï 3›◊µ∑X◊[ˇ®úﬁ’JWŸÉjé&1çP¯	6úüﬂÀGy^y6∂(`∆ «91Îîcòªœ ˇË∆BJ}ˆ_˚¨	y¸≠õL∫äÁW¥®PÇÄı—ê Pw‰ 2 ¢‚ÊÜ⁄c•˘¬‰∑käí≠“äEEÛä2Ëû≥êF∏¢]*âıŒJﬂct*~ÔÂWYÛ/Pƒú1÷<˝áv@aMùU;¨/˝Onr±C˛aºÛ 6SIπ$ü†Ì Øg(ˇ‘T≠ç–jp„EÕ€ØÃÎ0õ"Êˆ§«‰; ùoRœÖUÈÏû•Ä‹1~8!∞Ω°·ØßI æ?Âóü9±¯ÆãMDlÏØúaî}?Ä©%ÏÖa‰zÏä√~¯&ı]µ˜Ωy™º‹∂¸fZ¶YÆ∏À⁄¥≥bV¿◊≤…äe≈^°©3jítyc]‹Æ±}SC´Uê◊ª# æô;¬«_ü‚§®=ÎKÍöπ
&›!O‹ìó*Ø_´T‹0ö§¿π˘ˇY%±á˘ÓôüO}%<[Wî¬∫¸u?·€`-˜ˆŸ∏ªª∫√Ui'WÊ]@Ve”pÖπÄ«◊gU2ı†≥˙≠C©xksı›ıÎ¿¯Ü-K%_¶•Ç3%⁄¶$√	a„}BLuaæƒOì>s„vªl¢‚πµÚ8+‰dc}›tƒ⁄!ÎÊïãfd”∞Øpß^íì£ÊNVÍÿ9Ù„_3\ÖØ∞-/ŸÿÕ∏ÛK_Ã‡¿õU„%WO∞î©∂jiY`ÙOÉË9M∫›&{'üƒP&;\5‰ûúº‡OÏc63úYQúMeY≈-
Œ“`*÷¯ªØËZ^ÿ’|±:˚À:˙⁄Æ¯π"é:U±5◊ Få Å≥gå˘çÂº^iœŸÃ´©õç€4o„ÃsñÊﬁkòªÂÏçÔ4TBÄ?5ø◊¥#⁄ﬂ,†5@ ®⁄zutPhèç˘QTû@CÒvå<Â•ÉK‹“T¶ﬁã'$n´øüoöxBà¢¶g™¢∂·Œí¿3@>2,G±ô⁄ˆ-œˆ∑ZiŸ‹{∏¡C∫ˆ˜k◊9ﬂ!|)»”Ïy"éÎøX3Yö<æ◊é!yÿﬂf!rIc-H€`í'y¿ ∂2b)‹˜ÍR÷Ä÷±-á•3 &obÙa$ÄŒﬂ°¶+]°‰
ıV®∂B´e™(ˆΩaj´–XÖæZ÷V;ﬂsÂrf;ñÕèyDgWñÛ$≤sˇº∑›yœ⁄Œz≈ :iøË20lRü∆∂±0Ì_$ÇINú(I1n`j∏ba?µä)±ç*AÁòlÖ‡xqôKLY“nµ*0WU ÷ï5v!„a∏UúﬂÆÊp•[⁄®Îñy[˜J∆√r8}7æjao˘fnı/^O›‡€
?C˛FˆxãWrVu=£‹úÊ∑G≥ıÈ√⁄nJÁ◊/Övd|ÇüV(¯¡Ωi√L◊ÀÃT¬ÎW"•'ÂÓ[ıXÁj&\å((ô"◊÷yTzsf–æ{Ë•é‚≈˝1Í€ªíôLKyy†ú˙üÊyq7{≥dÈ¯=….2›hEMÖF}<—zù'Ω÷ê¥Ò]Z]ŸÁJ∂`D5$/‹†ÛV0∫Ã•÷’⁄eElY¬,WÔÔ-&öe_Õ3ÌºzI&_œlªv^‡ÊûÖ◊¬âÀnRÈó•zÁ®cn…â/˘›/ªê0Èm4+]˙˜πj$Ge[eºàaëÉÃzÖgÿ6èÌ¡C{çEú¸û3l˜<∞@6Çã–˙Â=xÙ0{ª”ƒ=eo«av«îú–3wÇgqã∂çM÷Ùø6E“VTˇAB˝1ç∆$kŸt¬¥v≥‚øòÏΩ˛#Mi•‘∑ı˙WéÜ9Ç-Ù˚÷/‚a{Ä„Ù-çn‰çñtY›Ïï[xÁQúENL~~ÉÔä4„6§+ƒÿMN.”‹π⁄éÎŸÊ•∑\x®¶∫7Æâ°èlÒi¥óü™!¿‚ë¬å`;æïıªÚå•\Àdœ>éMcé∏—≈ô5ÏÍ`,‘∂—& }n«\Qùªî48˛‘tﬁÔ‡V`ëD∫î˜{	pıÛ†™Ú®-≠c^suÁË∂ïùEÆCÆ]sñWÁk‚∞∑‘´}≈çÙfeÎÊèÍÂëaŒ8+*{ÒΩŸÿ◊
ÚU2O§o6å}∏Ø‚âà˘5Üu2zw∆ŸﬁÏ]dÂéyÔv›⁄ˆhˆEµ¿=
Úb‰ê°ïK⁄~Ïz†ﬂx·CÍ‡Í@mü„=≤9˛¡WÚ9lìÄ⁄:#‰¨z‰Ÿ±?å†õÉ+’T·≈∏;h"~c‚÷~Aæu«gNrÕæ“º»ãN|©ªGs≥ESß¿Ü1MùÊ2SÔI9pgñÿv"æ´V6¥öanË£iUøã≈<
?V:ŸÕíﬁzﬂ‹'?π<.—’“Ù;´Ó0∫eS…Á…±3u|å—‰F=ÿ7vól.‚ä€~>ƒß	ÌE¿â9‡ÛX≤?/;§1ëRÀ¢≠bù˘ßÒlu†U∫5Ω¥h
Œ+>+:∫n|vá¨/A+⁄Í˙‰ï‚#≤h	z[fn#˜˚7qîçª<Øïµq‡8πú«óó‰‹'ì“π˜Ûπj¢æf]Ì∞©nºï=¥≠›º¨˝ÅÛ~o–’¸∑fŸÍ‘≤M√ÖÉ“∂=¿K'tfÆ«J¡s¡wbWæÚ&ÀÖÖ¡ﬁ∆\©SKy~´ƒø≥≤1€‘±©⁄ü€0©≈îØ±q“,¬åY©eW+™ÈFÛ™X÷r∫≠⁄%3˝˚ﬁ⁄8Y6Ûø'êkà” æöïa)9ﬁÁL‘±CäSª’ÙÏéÏ¯…ó†l!©û~≠Œ‚Y&õ„µl´ÎÕÉÕñ4≥Õ¡KçfÍ#ıç[¢gn<∫æ˙ Fπ	4é{-ÎseÄy,œ8ÑΩ’πr˜m[úÛD˝x‡`03XÉo]’F±„FÃçúò n2≠ÚÄU|:´-0Àægõ<î ¸Ò˜˜'4ÓJ≈VÃ∞3}_qB£3}Â≠ô±ŸêíM÷õm€8ﬁO≥Øæ@ûä*GwÅº…R˝≠`¯§=J ÷÷»ã(HC2º 'n‚©ÀıqPœFé2,≥˚í|ó‡#Y:ˆ˜x)a{%Ú˝#˜WÂd»ÏøO8"ÀwV.í+¯OüÊ][Æ,À;O◊6≥6Q£œ˛0ïF˘§º|æ7•	+¿˘§Diµ≈#≠¨Òæ r7éY‹©ΩQõ©´ì ïËKs%ü?&∫QMOgyEüãm‰ho⁄Gv[´ú{ı˚Ûı7¬nz∫ÏÍµm“ÀY_’«’≤ÚeË≤jÚ»r-y›Ú[5?ˆ˚l•c›Ô·”™YΩ˜Úv>aEãÂ¬¸.yŸ÷TOfE,àØVj≈ô('˛ZΩ"vU+©Ä
ÒIx9µΩ§$åqô≈Õí;≤.â≈∏ˆÂ}ö$á∫fèM≠œëÍ–\CÏ’Íƒ‘™€‹à¥Uî~ixÒ"V˝‚Î!`uõ≤“µ
CÂ|›≠™Ëÿê∂‰ôXJÃ†¿Ubµáï:5
⁄ìÕ 5î‘R‚µ˝È€Û˘”E§Ìø
ø∫H« Ø®Î˜<¯gÈ‹ã¬≠^hìO]lÇÈçH˜ÿ°û”ÿ]πŸ}êÉ0ÁŸ	‰6·>y ÿÖﬁÉ< tû‡º¸=mÅçã9À£-Ùà‡%'ÿêÆâ©¡R4´¶o¨óyh•˜∂ÀdXwáCã≠ÿÔìcΩ~òÅ≥ÁDc¯!÷v·GŒåQ≥—]’‘)ÏÆÛP“Vﬁ€∫ß|kõπ üT7ÈÊsßÍ∞lXÑÏÊr”d«´˘(˛·“ΩlÃ:áDdªY’Ìπ›4∞äÊì˝Ää^?€ï õ%õDÎ˜ÚÓ=•z‚êÈeáL2F-"ù⁄¶¿,ÆuNu˘ÚÜ9ˆŒxæ:"·≤ Ùö?9—é}Ûƒ‚EÛÁ[â*âwìŸV *ˆDÖ~9WäÉ]ÿm‚7sËo7ëg˛‘iílSÆDl∑ç(≠¬≠ß/-…5 Ì√]Fƒ`*ﬁBgh[î£â•.GK„Ã≤
™Dfô˝¥ÆFå\Lj®Zaº∏ëÌ›È∑≠CläÉj€äëã=§>‰@‹TRıÃóV1∂;`¶ıõ/“†8´o-âˆRÇcÔÜU-˜ôk˘Tó∫≥Ïv¥ó˚◊”^"ÅÚôãﬁtÔIÉQ¨‚GØƒ‹RÂC‘hé[)%¡Kìï‡®*kyŒ‰N;Ü,√U2lÉ*bhxg3¨¢sæΩM„ƒ=ΩËù‰‹q¸V+E—±ˇ/‰rò+≠6«jÉH`]*|Œ¿f •/î‘l§YòÁÔÁø·1øs’¨ø£yˇ´7áªˆ™ΩÁØﬁêΩ›ﬂÏ€7´dSmπ8ç^˘cWê˘∂µŒ9Ï¬}æ‘™•]°î9çYt¿˚YÅÀØ‚é<ÔSi"ÃÉáïk∏îõÛŒ’è÷[^ØÎ∏◊⁄Æÿß¨∑˛±U;Û·îuÊÁƒís¯µúûÊYU◊;hà«ÿD'ÎC,Êy/√ø§åà_‰bóÎ˛úzaœ{hYÔúrÜFÚöR*¬ëL@¿∫$®KÛ]*î¨G Ø~–l}ÑKßepá≥‰$uW1˚éz†›:”¿£ÍTWìÏ1îBUÈÛ≤Ì!…yÑ¥'ÁΩ{˜XV´LG›YÊ2MÇ¿€«”õõ\|ŸŸ©fjjR◊˘∫Ov'3:&_•tºJ˝#¯˜ ˛›◊¶œ®…TøbZ≤iáMºæ≠„èsºjŒπºU{ÊÇÓ‡û∫Sª‰3r‰D	M¥’∑Ùú5ŒÚ%∆¥J%ëCc`Xk·π{A'4 )Iwºkç:ì)rŒ#zÊdAˆ!K:Kaw<◊w0 %@Õ∆Ü}÷dVéΩ™+œêùf
≥bØhD∞G«ò6„&©á{ˇ:	f4qc@ÇùêœÜ©Á˝–ch 8 0î^∞"07∆hƒ›ÒÃı·kÑ„ÓNY+…)˙èC:N…‡‡àP
HGﬂ(;¬äø‘ÔÎ∏ÒbÌRÂBÈœB÷±ØüÌæÇcˇ…Ó´óªá‰Ë˘S‡Î¡Ó·¯ipt$m‘£]ﬂÖEsé@:˛H—ó®‘ùO1-œc˝ ex™,ƒEIÊ˙±ìÙ÷…ÔP‘≠OÍı±3Ê"˛Ã~†íµ{Îdt?éÇ¯GŸ‰=élX¬mß^pﬁªË—4©⁄ÕÏôŸ»*;ô∏‘CõVågÆ≤ﬁˇb{ï!±F∑ÎıBî/ãÙÃÜÙ¿F˝Áùõ¥zCŸf}>Åu √67ﬂy0„˚$û–1ÃˇTq—ƒ=£ÔzÁΩŸò»¯Çı®JA·¡É5¬õ]ÙñSØk∏©j	!∂4ˆ∂4¿	;û3¬æ£ lªÎõRîõŒVÒh0qoºÎÅ4ÄcﬁÔ`'7^eYo5ªØ8n‚ôÜaø¸S7ö!£¯u GC†/%«UÛb'¶I®Ur"∆∞üUiÛÅˇòÊÙÒ•)»tO¢ÓÆò£	Iá[˘M_9ŒÈS≥≤Zà∫≈Ω‹Êß*êœW¯;ˆ¢¸º•QDΩ0p’ıLTõÛ∑ø¸≈ÇÛµ”pa¸/ë”Vq∞@hº®ù°Óv’?≈Æ"ëdl‡ùßÏ‡∞±°P#‘T ,œû¿ôn•p.‚í√O˘/‰ƒYÖ!Ü¿%âF8Œ0§Ñ1ﬁ&¨NaÂFX≈p≤p‹3:RÄ—˙Ñ{pTH\2x≥◊Oq@œÖw˘oab∫<ÚlF‹∫≈¨]§˚ÊhwˇŸJ>©>1Ç“â¿œÖäëB1)∏/»í±;u#wëo'4âw√êú3–R–˙¥B›éôïpgì|»¡:.øvøé¨‘≈ä ä¬9|˜Âÿ8ç⁄©â≈q›.B•g^ˇ^≠Œa¢∂>√kAø‰≤*ØµÚ•°Óƒ¥∞˜∏Iº*≈gt˛#-≈N÷J>Œ√NeU5™˚≈ù)ô" 33UßPl∑Æ0 áΩ€¨@xÊ’^äΩnEï≤Z¬k_U.^84˙7Óõt⁄æÊÄ˘˛wÕîá6“ÒL»vf{˜ú$´K&‹ˆŒïùæp tœ#É-Ô]»≥n`Bì`ÃLRÿk„Î=–∑»yÌ£]H√j?Ïm<˙‰$;Ê.≈nV%%Œe9täzìÂñ≤ÛÊ>ﬂÃﬁ¢ˆMkNï ™m)ºn…·ü≤PïÓ™.Ï&¸/üj3‰K`…ÂÄ:˚À%Xø$h¬…º™Y<ïÏe-üÎ≥_6LïÔvÿ†ô¶X÷’z£z¨´U€©Fã Œ(0ı^◊Xv}ö©B∞ãô]	}aRòëí÷f§è∆z2vctúé_∫1Ë(
FNÉ¥l∞∂ÑÔz[∞®·Ö∆?æYª¬ïÕﬁ∏#ló9Ú©l4U∫{K^ú≤≈¶bœ±3‡ú§IÇ<¡∂d¥^®RgÀπ¥]Òch|·èà	oXM ∏üç:C.5WD5-Ì◊‡Ë&QÍ\„`1¢ãÜz!Ë%LË9uRΩ[í!ÜÍ 8s	8=¸Øß#úâ©ÇN}⁄[	Aˆ,Â]í°MhÏz∞ôô›Íaå MOôΩ)8=≈≥
 ∑"ıumﬁwÊib¨|óﬂlÀ@t´—»’*˙÷óπ"é$∫†ıˇÒo˛‰±“v¯ÀæEwWæ†gp4ú9≥ÂT,Ÿ›:W?Œ±÷ö™F Ωì—Ñt·≈zº™œ™É†øtbÄáa4_æ•Ã`Í˜;8Æ»)¶yz˙QSÓ)Öu◊ç9áM∏¸=¡„œrèH¡◊Û6‘9[œ.Êi‹Ûd…”Kû˘® ‚Öªj6ŒæÂÌä1_Ì◊ŸËo€âk÷Üx?“F;ßÄ™ìßÁôh´w*<ÄΩ8t˝é⁄qƒÜaá‚ÉΩ˚˝æÒØGû≠á˛ÈƒÅ£syÄø°´d/≥·K¨≤ã>´ï9@Vx˙ÕûïÚ•¬YkpsÀQ\óøçû“hgeHo√!Ω˝!;§m¸À≥ÒNÿ{hÔfæw?s›õqøÏXfèLzﬂ}±˛”‰{≥ó„æv(æ¨>Ÿcò„£!≥`2ó€£™ÍIwS≥â≈ÿÈiOe±tT´Ω3˚3zÊÏèî«”∫√Tògê≠g,)LAà®µ=¡®ƒ∆uúﬂ’∏çH–òé"¿ˇ-M…SãÛ2÷ÍÁ%®ÿ)˘’1ÈVË[‰Ô\È-ˆÃ©§“…€∫⁄*©zˇ¥∫E≥va©a≤”[á˝q∑√NèWaÓ≈£›πDq=
ŒY\b“]Ye≈5ıJ+é ™ëWJ∏ô9
s‚uœ˙cB∆±/€Ö	Ë,èÿj„Ü–&J‘[í˛˝Øˇı*±MßÉ.S`_U"ÆÿlŸVæeˆvÄ[—˘uªëÈ˝Ïƒ“j—Mv
©√íÂ2ÔF%ﬂFßb!a*¢üÑQoÉKçç∏PL√?V∑˘ÃüãÛJÓ8ãÌ*vßõ™ñr:nyá5|ù‚Vø@ì|&ÓÄ–πßÓà©Hß†
ÚS≥KÜ?Å&§…∂o0˜oêx∂#G‡s»ŸJñÆã+,Ë-;»ÏD#≠™¢HÓ¨bd⁄e%&m˛i—hEW¢dó‹¿S=˙Ü©Òµ©ˇ`j≈íßápÄŸ√G˜Ÿì;§√ü55å2Êáüª®ÁÜ´o∏;œTÕÀú†Rß~\	Ø6?Î∆GëÛìÎú?æD£õÈf≠∆f®t¸î„†˚€äHh}T|Â†'⁄ÕB=1»Âœﬂ˛Ú…Q ÃÙåÖHª”4q„ç…´îF\˙ôf÷ê.hLÌ—DîbÕÏfjºhØtf_ãxÍ˝É£◊«'‰≈õ„7‰3ÚÌÓ´}ÚÚ˘´›Z?˝∫ƒ∆.›x∆f8t4q¢◊!Ë≠¥’ízøgûﬂ°QæQóÆ7èFZ(°´≤vj‘H=4∆"m˝Ü&Vú€®≠B)}∏JiE˛Â"}‚éÅ7®jô¥ñ∆2¡zS˚”Ô•>·YWåÊ—dK„`˛";«U¥ª!´‹BÉÖóº	ΩÄéüzA:ÆΩçbísg7E^g÷)w‡tÑÃh41Ünπ2¡±b†,+zÃú(fzôˆ%È|ã^ AfÙ≈æH£ÀÀSr˜æE„Y«†ù“}:¯u˚ºú…ñÚzX[d8vW|˛≥Dyˆƒœû˜OÃBºΩ03ó§~íN1‚ˆå- √-h®«2âQÍ¬ﬂâ:lÛ´òÑ4∏®Wã≈ŸÑ∑ŒÃÓ5,ÏÓM∆tvXíé–%ç®¢$mñï§mUD˚ÉíÈ{ÆˆGˇ6#¢˚J"∫^<;ûõ´™◊bî Å¿<ñ°®‹Ëìì¡>úC^h4V©aä\´fã j9zµÅÚ´@ù`ﬂ£‡‹l5‘√§ûMñÒáRD{≥®V$6∫d∞Äò·ƒ˜∆ßì|õÃ›⁄Êg´÷åUf≠°„iÅ1$S0«Ç$m≤$¯'G›8”	:Ã0ëò†Éé@8ÑEnÃ8"z∆ì`B∫1Ö'‘}¯q˝0}ëû¡!z◊Sx8§	2X:°¿}A+ÜÛπ†pÚeÿ˜—.Ã¥YfÎòöw≠)XìKgñ7ï¬1¶]$Û∏TÏû¿©ÔNI7aUå`X÷*±ßj≤"f∞0 C∏ÁHŸ
¿ åÅ”Pè5Ï°dƒ†”¿	ñwÒî¶^íexSÑVãl
π≈–™2&Süç±Ø*«¥≥ú¿t<ÁYpÓ„,£MÅª›≈ÍÇ÷tÀ(mKÊ˛ πèô}œ" )‡áΩ$ËE‰4
f≤.™-¿UÀ€p.1ø±$,ı∆ﬂfØﬁ⁄([πL™ﬁktùñY&ÅcùŸ]j∞kKR*DZN∏∂]µ‹ÊÑ€∫dìÉ$Ø+€ûOc<≈>CΩÀ‹K
¸jﬂW«È∂ñ*yYßVrE@≈$«$¿t∏œÚ	^3DLHQ∂¶1Æ)&NùLÑIÙÀ"Œ?s∆nB@∏–U∏@Y≈˛îîÑôÚ¥J‡œîLÒ"g—º#N·=,ï‘ı–¿≈–”*¸Ë•l\VÑp‚_–<Ç“sŸô:„—)ñœÀsﬂÑc$‹¶®IÇKÃ˝ó˛NBÉX¡‹À≈3¸l<q®˜—0Ò:o`˙˘59πÊ≤R;⁄ÏìØß˜ÒX˙s8Õßi‚
<:t<;U‚Åﬁ≤¨Ûäπû;·SÄï#_≥ ÀÁHÂH˘ 5b Yip\¨Â•S∆4û8„-Ó~)÷øVArmª§{Á~-Õf≥”∫ëÄë#È»7rN_&ú2qâÿ&;ß:•£ë&è;˝Q¸ìÅ% 8¸Ê‹@>,>7æY?∆Åó›f¶Â,®{ΩÍ©Ê—	˚ü"ùœàÆ&µ…¿®2U∞TÈÃ∏ò„BQı¢∞;º≤·ísèM#˜0&≥ ã{PmÄΩ
EYÃÚQ4ÇrÊ$\"¡i®åi≤¢öréÚ(PûcÄÔ¿Åc≈3É7SçCgÊ∆ ß¡åíÓÍ
_;PÙ8ÌÒ{©SOÃ|Yg˘nœîYÖÄe,BÀë3 Êf≈Á,¥Ÿê¥§*¯‡åı–ç°*˜‡3¶$<Y.í®¿}åN5ƒ™û<u£lîêêÂ>+˘°@43ZÁıÈÉ∂á`≈˙-(≈LYÁØÙ∂œ5hπ_R.óZÛ⁄‹ÆÔ[©¨Êº{«‚zonÔÆ±ob%orÁÄ"∑˙Dx‹…¿`;æ˘MB(‚πNjjª€™í⁄ Ì -wb$´∏Àyk¯)Ç.Ÿ©∑´_≤+≤á÷MÉip?¡ƒày¯µNâtÃä4Rsåch.;àQ¿TE2Ëâ£`†BòŸ;«óÉ_ÌÙN‡Lí≠˚9j‰˚Î¶√FπeÖWnå™ªZx∂77Ÿ™öC”•;yàRCÖ'º“À√t–b’˝unmt!œhzÍgÿ[◊;œÕmj;T∫#à …M8o‹Ô<Ÿ§inq†§Û‰MnUüV6ÁïÉ≠ √Îåc|ÏzÜ&˛˘ítxıï=w6d)SÕœÏ`¡Ä≤#›<Ωπ vtÛaÁ…QÓF0dÆó‹ÿ∞Ç7´ê™∆¿∫"æH°ó,sﬂªÈ¨ Í≥P„Ó©ò9ãSåÇs€^⁄.*]∫ó™Â…≠ë&@˜›¯˘;‡›¶\Æ ´R^π¡3û◊πç+◊%ıA-}û_ó∏´‹2ªmytnk¥Åﬁ≤ æ]Îõ’–’'®ØH~»]Ãö¿·¬@ÿzEöä§€îG◊akµT~%r™EG>Ü‘Ÿâ„FAV⁄»€–Æá›ıÂJ&ú[è≈;Ïâ8æ≈„ˆëÏû›“ åô_|^NYë8Û4õ,¡a”∂‡FﬁìÓ3Óÿ7ZÚK√_cõ⁄*òzú44K06Jhk¯ö≥&zëÎ!U™*,sÖ≠.E†üú5ØMÉ ;àT(•ñUxr„Ã<°~,€â¨ëÅ„91≠;≠á‘¢Ã!◊ Oì+•ú»Ü"M•i3˜¶3JßÙ¨M:€væuñNÃ"?QrRVrÀã¥≥ b8∫xNc∫¢»$VÃNìÉT_S≥_H-„}ÑN-Àí∫Í}&˛|ƒkÉ§ê˛ ØÌU⁄»ì1RÁ”’1ÀÚ•˘3HOwücÆÛÀ›ÉÁ«ª’§ë_EÉı}M¬»Øé≈Øò
_ÇJ‰@≈y6T≈D¯ñ$r¨ˆ.]∏∑Îª±2ôç◊˝ôaÃ=˚Á√˜O]\«è.%∆j©¨ú„π=•±ÉLélµ´’ä/µ tÕã∑´
π €îµÊw◊sâòå(-¨¶ Ky≈Æ™¯‘Ù,	’†ÚSk
tx¥Vk∂ ~A4y\˝ê£Á«É˝¡…Û√≤˜˙‰‰ı9‹˝ı˛ã›ì˝◊ádo˜òta%hDcÙúYä°©ø¢Jj¯†L=@≥∆5ù¢üòYYY·å{ÖABs@…)¯ÍwÎ?ÙÓa∆M¯':“Ó˙*˚ØøæΩÚ}Ç¬YÂlº#lóŸ±Å2ﬁ[Ê°ìﬁ∆˝¶º6Fféüí“˝tÑµ„ ∆g{$§≤N¨ËΩR¢∏∫Ï”I<c∆> ´®~Bá›NƒﬁZMÕGåùÁA‰ å
,·[=–ì∑I;∑˙z-¬Fõã]bd’Ã∞J∑5);ù^≈à S≈‰”K*ÉÎkbADÅDöŸä†QMÉ5	í
∆=ÆP∞ÂØÎs»ÍºD,ÜàMùﬁwõ,%ìÅó]⁄Ë≥û–F˛±fBjWYÿYx.h…˝aX‹“z™õN⁄≠Ïû qUY™8ÑÊ‘∑	âUÂ∏qJBÈáŸŸ,π£∑%JÀ≤p™C«∆¬©Æ≤‚ƒVßF≈MKIüµÕXïV˚)¥°—-“Õ≥nûJ=˛¢;Õq"[ëÖ”&(DO'4J∂N†2»Ñ\î^…	öôìËÓëÓ^–Òà∆…Õì›0{’·ÂHQ¨…‚IœÒºc¿∆ÖS^ÊÇˆ  /ÓXö;'˝m£–s}ÃÈ1NÉÑNWs›?.à*´÷E˚ÂˆÌ„!ØXöÊ¬IÍΩ“KJµ'™*`Õts;ÑRÖkÅ¢âa∂iîf%üÜß†â£‚Ra"ÒƒqíºÓ&ñÒÍà∑uÏzàñ&]µiV6Ω]qªz4Î˝-õ:4ı{ËZÌe2‘üÂf¥°GG”é›,W@Ól¨Øˇ\QoKZıƒ≤…∆(»oDŒá4Éˆ∑≥Œ*”Yﬂv»Êˆ*ÜÎùû˙NÔ`Ωqcüí°q„˛ºñ∆å-%Ω≠rì‘,
õWÏQ¥=ÕJˇ`=⁄Z—ãpÿ€®∏g™>Ç÷±øµ¯≈ÇAb˘Y€≤≤Ÿ44°µ tcQ1çÛüëÔQñ¢CÔq)Á [î#ägYhªò›)∫äxdn÷–íºIËLùÑ¶JÒm]Ñf.vÄüru¬B@dÁ∫¢Úfµ¿fi3ëÅ»€WÆv1è◊ô’⁄T¨–u  T
6n¢©ø¯sã7NUn¸·XLsò¯ΩY0t=ßáb¨á≥·u⁄ºHGIﬂr£Íí2∑ÑiP¬≤OcÌ‘PÓmÒ0R©Ñ¿	’§ˆCx]Æ®¶HàÄ£`¡W–”•®»‚tO›D˘æ"/J*zÍùiò√ﬂˇ˙Oˇ‹é?Èì∫≠j|oh˘ÚæÌ¶è¨åW6Ô/åë∂É£É=¥õ÷‡üá∫∑ÆM∂≠31 Q¢Â`œáz∂SÆÀPŸ∑b≥S1ÖŒï¸GT‰);kÌañ=ï“cZ	à>'ÇÉ÷G√&¿X(]%@O¢ø0V«ôbëÉU2åÈiB#Ç˝6UBìËjhµÒ?7ﬂÒ™`ÖoÈ¯úz&fxSÏMúü69wÀOSk˜ÍÂ«∑óåØ	∞T›Ω´ÂrºÌOXo≥ÁL<c:†I‰NcÚ√¶ÎòRŸ´”öj_π "Ypmã$JêFÈÑó'!ü±¢ÜïR/ù˘ÓÚYƒπ∑~^6
æp<‘yø‚ó˚€Õ¸OÔÅÄõÔwÆêÓ´‘KcÍÎ™ñŒI¡•
•-d.ı1„í’M‚»,§Í~HÅé˝'ãuMYU ]"ÁIøô˜¯∑µx"Èˆ;™¨ïyW*rﬂB®˛·?-#MÚ÷#-*zÂ,QÚ2Jâ	Z!îÿ7/Î„„Ú™˙ PcR’Å?"≤‰ŸA?à   $È¡;ï≤uı2lÁ˛˚2ÈK«<Jä:zKA§*°}Ç†Lœ(àu^µ;ƒö=≥0≠î„˚x(4Àº#MKùTAôí[≤â0ˇÛˇ^b¬,*a.aPüæÆÁÛ&∏gxtçÇŸ0‡¶9-r}Ù„°«Y
ßÅ;Etqdãqhgéäl≈/6áﬁ?˛áe$[ÿJ∆,≈äº4~ñù≤.Ù‰3¸Ç‹%r¶Ï≠ÁRVe(•H∆ÂHÚêváÈ4˝¡E∑Ô˝.óÿ˝√üñë~˜ _»>‚ˆTG¢—û,ﬂ”ëÿ'Sa{º„Õ–òÅ…„•ñÎ˘@P≈Nœ4√M&˜ízò˜ˇ¡£Æ∂øÏΩ∑¶˜°ó*•5ªn#´ˇ˘ˇ-#≠KM‰1&∞áX≥¥˛åÈΩ´{|¨í	”,±\»ÌNﬁ9‰¶<o~ÈcÈÖ∏íW#œ·$ÈQ‡ü∫gw*∞Å6√4
=%uä_öÈÛo˛oÀHûﬂNhÔÜ°@˝˝Ã.ª$˙ía&êúYƒÏ}‚ú”ã*ÿB8£≤¸af‡ø
Œ,¸ˇY˛Ω˚(ıô¨˝$˚æΩæ∂%ë©∏∂\Tö]´îç?ÿà–?ˇØ€ßQ\Éë
ıI^±v±t)∂±˝)¢3ÏëE#óÑA.ÇöõD∞ı,◊áÄ<•ÍN	Û£Úˆ UÃR¯U
t∆z'ƒ∞∆gm@XÃ'æÉ<'…ƒ)g0∞úÜÊ¶Ó∞X[ÜrWaRÎØƒKFãÙ-ÿ˘J
,'.ëí*‡µ9ÄõﬂUÿ≠°-¥:LQπÈ†G˛—póµp~,÷Ú;Ñ*ˆLM2÷b¢HäâfT“û5+•D<¢∑‘≥tÍÃ∞Kﬁ≈¢¡gÅÔ&A5;?"tπjr^UHó¢˝êÇ(!_’k<´ö6≈>ã Ô∫Ó¨è‘Çm¬Zäî[ïŸß·ÙM‰ëﬂˇût˛ç¶j.ú}œúD˚Ëó§Û`î?≈4#DÃS◊w4¸"«{‹ÒÉ ƒG[Êú:Q§Î÷S»A« yÅüO‘–©
˛dßètpø®¯ßìû¯°ÿ ¡TD∞Û ıß8˝î•¯„(¿®N‡32viíFÑu6dái‡œÏÍw™≈ãäèı *w%Î‰∞|IÍ	aŒà*k_∑Õm¡’ò‰¬:ÄΩêJE∂}™€ıVjWäÁ
JnaE\˙vv±÷^éÂ-  ç
~llÈ\ ∫®d»‘Úé≤
p˜ïE‹`GTm©Fxf4J¬	¨µnM≥"köﬂMIƒ˘ÌˆÖ‰Iâr,7CÖû(ûáΩ⁄{rº˚ä}‡zÕIÎªµ≠YCµÿv∏ê‰NÁIF‘ªG/Mı‡®∫c¶ÏÒºLY<∫§LôC˜ûò≤˚zp«ê¬ê˘660‰xzQŒGÉøkå/UQ·â„üÛ-A€µ˘&¯n√Ú|W√ÊπH≥ly8n˝¢BClUÄ≥¯À≤‹"´£πì9xπÀô%%Iz‚•„â√nÆ◊ÂT◊R,íæ∑M%í≈ü•jÀ_¨ØØ›¸çÑWà.Ç®⁄6Nó!ÆÃíµ·øÿÆ29U¬¸F˛ƒFıˆzèﬁÕj6ÆÊm◊UgŸúT‰kW[ÿîMõr:7+PH/„p5Íî´·DXpE ﬁ£…V=MyVeπ˙
ø-˙3’ãı>–ÎÖ’Œï{˜ÿÏ2ƒÂÅ‹~S#£…Vm∂*uΩhı#nÉ€èTjÎ~Ï≤à•»≈Ë¸ç(ÎËsù|°”âa≈ äà97Jo,åÕùi‡—IUÛÆÈ›*—#dàïêgXÄ∆˛àhA6ÁvDö1~ \ü˚ 
µÃÄÀ˘ku◊Ì∞÷»‡-1ô¡*aUQ¬&˛â⁄C9pËÒÎø‘Ÿµÿ3;®∞vÜ˝$rg›;húN—Ë2‡;@N“∑)ÀvDÙZ$Ñ«ç[7¿–Ã"‰±8V_¬÷†’.±ræÏ}@¥]∫Iî™ÓU¿›µõ÷÷»W@Y›d^IÎ≈¬oNˆü’‚Eó„d|74^ñJ/ÉñÉ’ó*∏Y?kêZz≠zCt¢ì‚cBœ©õ qÒf7yÊ Î5júﬁw‰ôb·hı1˚íTnÖ+Í{;√∆R78'‘®Œå∫^y`vâipögò≤^~Ü]2=√(Ò‹Ω#vøõÔÊí›œˇjø ˙¸5≈%’≥W*ƒ≈CæœzµØ†ò‚`dpRâG Ë¡©ß·n>{´[•õÓoPBdÁ¡1hõÇ…àò?nuÊL˚”À*J^°ºõ∞ÜÿccÊÄYı±çÀ/Õì”»‡Ëà1ÔK=Êf¡D‘ƒÒxO{ˆÖI \√≈∫ﬁ,|°ˇ£Nœ’ÃÛä8∞˙ôãiFÓº†g‘Cœ…ôºzJE–rÑb!Ü«AòMòÇCúNW;-Î\YnM∞-H‹1≈n…pck≠⁄Ô˙kTú^SﬁP«(Ïm´ ôk]ŒäI®ªqË¨¬ãªôùkŸ_ÂÓ$ô#R≤TËœÆÕŒAUG·{ Æ¥öÓº˘Éº
WZWíJ¨wãmnÂ™ÆÃÒà5•∑p∏)ãÏËz4±CGŒ]e∂ﬁ£5ˆbïêùÉ˛DΩV∫"WUÍz—*^úp¸÷Ès#dü€T¨Hhx‹’/∞n≥ﬁså“8≥ÂÅÈÎ´QﬁMß‹‹µÍÕÁÓS© KÂ¢<‚˝6u#ßZ!P_Ñ¨c_“NÁIØW⁄≥^Ô—øEıtﬁXC…‰‡|Ê9È)?•i%Œ'1ÔQ	Ì=]qO•ø∆'¨⁄-ÊlwÄßLAMèc±‹yÈ◊|^»ŸN≠=ˇ®3“˚q ≤ºKW…ê!=e¬∏Ôh¿xÃB9›!ª∏¢ÅµÃåçΩ23‘aù2Ò¨}ï&˚Cø≥;?t/≈¸ØVHèÓvÿoÆ¶ï6Ú
=.™€ã3e\ƒ.ñbπxÁ	≈ÛëGJG˜¸”ı√T≈>y‹j(*ˆQbÆx*o«WÒâ€e©çº≥b=À€»∂·ù5·˝! P≈f±ñókZ!™uXg˚·Dè;O¸`≤CG‰–9»&V±SuS‰2ÍKKDîÙû•∆Gi≠dWœø,›Â∆+Mrõ3qhd*át	˝NR4Fa"õ:°0∆Æ¢ıÜ·Â™r”4q•_…8òπò¬F∏99I1Õç†nz÷Ô˜ÒñkËÌPVhı ∂Œ\K»>`ıùou≥»€–¶®1Ÿ/∂Ò¶⁄¸”∞áEôÛb´ŒﬁmE Ä¥7ï∫êuç◊å,˚È[Ù‰TP´Æç`”*«ÃÏ†ZeπùfŸH—nUK~Ø|-≈µe_Xu%ÎëÃ÷À©Ø©h¢i∑ˆµÖ@O˘Å3ôœπ:πÀ\ÃlVƒ‡4ƒó/°#©Ï]VyùKèNÁwÃi/ı¶«Pó;6∫1“€dıù¯s1UÔA√É5:D3Á; Fò¨Ã{◊ì–ˆãÊgÊú\!˘WŸñ∆r>ñO¯à^Ëf˙îà‚6≈Y»„À‹5ixÇJ3@ˆ∞?.~Õ/w–†qR‹∞À˛.~G£èŸ»ÓÿW§{b¿£q:‚ã3¿òùÛÀæ¸+Z¸Ÿ*è<lB˚ƒÍì˘O‹Q†ÿò¨ÆºH‚'3(WµÇ ≈6ËO@G∞Kq<Ç©z´>˘$î∆#Gä˚yFhÒî∞û<æ4Œ&BŸ√¢»ICïbk™ÒtïYÁ
|ı≥ü≠≠’cj?x˜˛·≥◊áœ˚ªá‰‰7GØ_Ô}˝Úyı¸ŸãÁ«‰¯˘”◊áO˜_Ì≥ÜúÚıÛWÿ±≥Â{~vö˙ØêÌ–dﬂæÉÓıwg{:ª‹À}â˛'¨¬øí}aÙÀú´‚ñ·˘$ù^©6â.çs6tıùs¬‘◊Ïô_J7Ã@L–«˜ùXÀŒ7‘}‹Õ-¸ùØúaTær Á”§¯s7å\O˙’ën˝&ıKy“_ªg)†J\\8!Í–)yù◊”$(]8	Wæ4"˘ ˜ÚÙ∆ÙÊ6Ó√±ì-A}Ó3_ÉÔÿ]¯ΩªR‰¬°Q6 WÄÍøÅøÀ#MÇÔ∞MÍ≤øÜKqwe•“10á(ÈnÆíŒzßÅÎW;p˝4qä˝˛Ò”Kò€˘ÙíAè_Ã´U¯Ç–\Ì¿/ÆEæ›ﬂ˚üº"#tLìÆEô´Oå%Ç›ÖÑìcË9b˜ÙÇÛ◊Æ™Éè1T~äÀ]FJ>|†@¶ÃO⁄âÅ7fﬂ«)Õæ&ÓY˛§<ÕP™„Å.üˇ‡”Y˛ (¸ì| «£!h⁄Ÿ; \O˛;LΩ‚Óÿ¡r;◊ÿÊ"âëGdc≥≤&l&ﬂâæÁ»úVÂÁ6◊œ’ñåÙ»‹¯9ÈÖv<8œWÃÃîÂÅh2ÈüzAÂØ·;‡%Y6¯ˇÁ ≤«~éè±;V≥¨BÎ1ó oòÛ∫~L¯ÒZS-œ5¶qÆ6ìUÕ÷¶MìmòÌu'\ô± ®y¬ç3¿]æ*ào·àn	b üÂ à€˙I ∏$óÌ9ãrsÒ˘-RÏWAtúÜ.ù¿ôdf‚T#œ°˛Ø·˝èâ4ˆïc|ze%c≈ΩèìıB‰·ocù≈Ù†$(œ5`EÑAı#áŸ∫kˇ.˛|Ìÿ;·Ï]åcÙAq‰@w◊W…<ºAÖK∏R>Ø‹≥¡πKÕ’œ˛?   ˇˇ Àí:¬