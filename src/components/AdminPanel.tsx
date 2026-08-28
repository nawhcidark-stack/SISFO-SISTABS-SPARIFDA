import DatabaseSettingsPanel from "./DatabaseSettingsPanel";
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
    | "database"
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
            id="admin-menu-database"
            onClick={() => setAdminTab("database")}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === "database"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database size={15} className={adminTab === "database" ? "text-white" : "text-emerald-600"} />
              <span>Database MySQL</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
              adminTab === "database" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            }`}>
              phpMyAdmin
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
        {adminTab === "database" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-6"
          >
            <DatabaseSettingsPanel />
          </motion.div>
        )}

        {adminTab === "config" && (
          <div className="flex flex-col gap-6 w-full">
            {/* MySQL & phpMyAdmin Quick Integration Card */}
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-700/50 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">Koneksi Database phpMyAdmin & MySQL</h4>
                    <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30">
                      Aktif
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Kelola parameter host, jalankan migrasi skema SQL, uji latensi koneksi, dan eksekusi kueri langsung.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-open-mysql-from-config"
                onClick={() => setAdminTab("database")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 shrink-0"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Buka Pengaturan MySQL</span>
              </button>
            </div>

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
                  </buttoxúÏ}Yo\IvÊ˚¸ä®DANv+πâTIlJÖ$YãíäVRn çÆ»Ã Û*ÔíæãHöE¿∞wœ cxP√Ê}^¸0ø¶ˇ¿‘Oòs"‚Ó±›dj©%§dÊç∏±û-Œ˘N¯Ù?êFŸﬂòzoö_ÔoúGqPˇv#àR/
◊˘Ûµün6~EF^í≤Ä–…<[ê{‰îôÔÕhHéhJ˘?cö0rH„)˘’∆mΩÌ≤ÈFOº–K=Í?ππ!—ÇNºÙzèlﬁ'Ô÷.πΩm<MC/†)´=Ω≈üﬁl?<Òiíº†{“_.g^ »bêƒQNŸtpÂìqOY,ˇ$>¥=ÿﬁ‹$…åN£ÀAêsü]Òì»'HŸU:∏Jƒˇ>;O≈'Q˝—ÊfØ÷ë÷‹√$T˚∆ﬂ }íAí“8Â/y–S¨d£‚b∞Ωæ[Õ≈¿ßﬁE4ÿ›lM~øc„}ï?‰cçΩp>ÿTºﬁY¨k‚˝5Ã˚ˆÊ-Ÿp‹d¢« Vgj3ÖÈ`˘”Í<>Œªö/Çò¢	SŒ—÷˙Æ≤œ§πWi∞¯çnø™z∑1{†Ïı¢⁄iﬁ∑o∂†ã´ﬂU;æ“¡Òùz·≈ f>ΩbS¬áô∞¿√°jz~¬¸»ßd¡¬	ù“∫;≈ÓNÛeX∞ÿã¶ﬁúÙaêóÙ>9£8*¸0Œ∞¬}2',Lº˚‰´,©ZMa¸mD„ELì˚döå◊H¶ŸúÍ4ú√€Êgq6ÉsâÇ&|3á.ÕHJ√≈gEœaËT∆kgcx ·≥æ1è¬sÔ"ã±.]¯ﬁ>¨+ßy·L≠⁄$I•î¶Y‘Ës∆¶cXnÚú%	Ω`IãAÖ1ﬂ£l2Åá‰É‰ﬁ=“w8j‡®¡˘bã©?m∞¸áÌ|€Ê_ =®û—∆^*¢<ˇ€öΩΩ8c0Jq∑ﬁ∂vd˛⁄O*'∑„&4®:πjz4ÿÍ=UN◊≠Ê§C3„,M£êD·°ÔMÊOn˙k‰…Sÿ=ÈÅ¢ù~ò˘˛öæ˚Hòf—Ôµ&3?xxÏ¯l¬ﬂ1ÂS:…‚$äã»„Dˆ2õ§É0
YÔÈΩ‘XÚõ˝—O«≠∑v€⁄vbZ>ã„(^n≈L±ÀbÔ‡+ﬁ7Cü≈È°O|fÿ=¯‚OvW¥s™S¥¸æ©∂¢€5ÿÌáªµ√ßp˜ΩÔñÊ]ƒﬁî‡?(N$»$.ˆ*n	C±ÑHÌû°®ëxS∂G9ë%dò•—@Ã7ŒY
GE˚⁄=Å√;…ÇÜÉ]Öò≥≤“éÿ∞9_”äK˘>›æÚ’ªﬂ¢`ûõ≈™î;[J&Hø≤pª	r=X≤…yÈ•«;‡GìπÜÉ˛Èˇ«ˇ˚˜ø''.$ÂÄBî˘:ç@äÙ%S¬Æ∂xçj€B…Î,IΩÛÎ¡ò•óåÖ0ÅH!y⁄ÊN3uö˜÷ñjS+)¶^)l°–˙T2S›lÂS„¯ûÍ7§#ﬁÖÄMΩ,Ë==,§â∫†ì∞	ç)≥xN}jzπñ¥ƒE”ÁÙzÅ∫§ßy¶Añ@“ö˙lDﬂ01M‚ˆ?ãÎ,§cüMÔì¸N[ﬁPˇÀ®M˘u@ØD›GEm
á˘(∫˝àNüE
¥N”≠r¢oæE˘2ıﬁ0êŸ|/dæAf†ß\∂∂JRﬁ w˘æ;íöÔ Ì¸ú∑&<Ü}M¯g’7‹pQúê)+˛7Ó_ãáve),Ï$Kˆ‡ÔRRÚÒMcj»ß§W**¿Á{dèSâﬁÌ∑ÍaªÓΩõoÂ Ïå =ë≥√iLœ.LœÆJ∫ç˘»Om©∆H~6+≥°üÂòyE>ƒ´¡.sı>h5ó≈Æ„B:Ÿòˇb•zjﬂßcÊÎésIóµrŒw6’
%ñcy&@'+’ú˛W4X”ü˜F”S¡∂5oÇód∞îáQw¥‡ƒ√)øÄj}f:Û≠#ˇ"ÄZıŸ:Hc,]Á/_{gæw)∂©∞ t`1ö_·Ωä£+æ™P.o)è™	®ˆ»F~Üƒı@h±‘£≤E`Ïoàük?,j?\¢ˆ÷v˘Úm¨O˙/AÂµv
¬√Z«÷∂wä÷∂wDk_“ÿ£a◊ÜvÌ<mläåpƒŒ€zX6üEãœÅ®]d÷Œ˜ÂßÏßBÄû”y‚@ÄF!]$≥(%G|\d	‰ÖãLGÑÑr¬†ì0/Ñm£˝ï^¡⁄5mäeiP∏í∆¨úºi$5’#ﬂ}G∂6‹tŒHÿt¨Z-?VZ	kAP%‡TO¥{ˆW≈^ÖÈO3J")óì©7£‹_{s¥œ˘lÏÕ<2A:AÛz≈»7cP>Q¨4…ï˙èÍ›9G’’Pí//P(Æàí—•óNfJuÙg†OΩ
ßŸ¨Pü»	•4 Z¡‚∑¢J’’™'g‰‹Ûa™ÑFW®V≈Œ”8#sFNâS˘¿µ¨;)Y?´5∏üï∂•˝;◊ªêJJ¿R ≠â0≠∏¬ ÖM≤HÖπXÓïù€x¥©0⁄ÈÃø™◊$∞5Í€≤úZÆÆtÑ´ VΩßU}Ôå≈t>Û‚Ωeà°ö≥#˘ã¬H€?4ﬁÀ≠ÌI˚Úô0ÿ'!ªDìÎ´üX[O#æ•ÿ(≈ΩŸÔy”¡ÒQo7‘ÛÅ¸û≤8§≥ûéö,K[?¥u%_gixMWøtÕÀió•Ãm,˜ÓÑ?ÑVÃ´[¬∏∫É’.©ôpºdI≈ ì∆Q@˚Y¯¥/§ÇŒ‰RêùŒÙCG=ﬁ°üêæˇ√øi˝K˙rä÷`z@dÈ(≈jnÒ[¢’nS:o\Êk˚~ö¡¡Pã]SèÃ• HÜ·î~JN=aÌ·ØF_ø(v>’K˘¶Ö\\ÃKKπó	ãk˙`Å∑˙PﬂZﬁÖàKzùØ∏ëÁ?¥¥ÒB‚ûıç§î·ÂüM!hJìú›ñ/nÚÍ:Ÿﬁ@Â¢Ç|†‚Ò≤±µI◊xouªø¢6ÌU•¨E}ùí`STŒ(bâÔÑkˇ’îC? ¶˘UÏ£ÍùÊçóà=˚çì )MÄ0#˝ü‡¥e·Ñ’Œ€ÆîÌ&≠p√ª“·Xã&?Ÿ5—d†a˙æèrêÍ∂ÆmÁııuﬁq&8—kﬁDı◊_'Q∏¶•«ÊÉo£ñzæ”Y¥ ‰stòI˜»ËxÙ{—ıﬂˇä˜x…Ó§ãŸ)W∫ê≤ËT.BËd¬ÈìÔ£˛±©óp´€ó˙’(MMB°ìî˚s‡mº>.≤æveïfﬁt ¥]‘JÔZ´ùŒ]M√ö9cˆ.f˘Â˚sf¿òÂˆâ·‚®¿Ω¸ãDj†≈0qùo„?Q0fçWGÀ≈dg%˜ıÀPÜ]+ø'¡u€ˇ˜⁄ïPqÂÑs◊ù„sç3
GŸ8“|3∆∫-∑pã–KeJ“yÑg•åb	Å£&˛–≈Ù≠¥z±d{‡ˆ‰Ê≈Ç-5ö¥y/ÃÙ%ß0¯j=È $fïy1õY¯t¬f0?ÈÅxûF3†°lÃï™9H˜Úä9…}î
—hÖz»ÈÈ}2ı˝u”ÎsÎ8<LÀ¶9øûÍ(‰Ö+R•Å¶Ω€‘‡€≤g≤È™l⁄X¥“Çô-Ä˘fI¯t„4¸x±Òò*ıªÊ”
‚ﬂ©ŸºZ¬"∫∏Â/€ìé‰É‹YL¨Iy∫™´PõÇe’4híÅsb0|Û‡ûÈäÁYM{◊í”¬e[3-≠π9≥ ôµ]À≤ox‡ÁóÏ<f…Ï2ód‘hi.Ø&/‘8V„$¸9h.qî∞Bõ8áªRˇ+jÔw€©ü%uè…ù∂Î!ﬂ-éCk ≥xë;Í‚é√‘õ'ÙÊKuH˛ã…BÒHùW§ú◊;oÕXπ‡éßwΩ≥)»„”óﬁ%Ω¶©å8¢Á@ÌÀ€‚ñb"9L≤ÓÉ“ùŒn◊,íΩπ4_ôT.MŒY:ôYÆ}Î‘ıYƒ≠÷:5Ÿ≤`îu∑‰Z˛EÖàVIúQ◊SQN6IEÍN˝⁄‰j´°x◊'¶™r
™ÉJ˝tƒ.hbãM¡3P›1‰dº’S©k)	◊ËgÏn≤·Gµ!£ËÃ6ı`§\10	ªÕŸﬁ—2ê÷ÊÀQÒˆçDÿb‚n	T5{¥`«=`M'3ˆ¸Ç¯5m|Vûeê¢ê]’…yÚ‰	Ÿ¸†ó÷’„˙˙%çßG1⁄≈J?ÿÆ≠tí∆—ú¡\ØÔ˛Æ€R÷◊Æ∂b‚fÙIÌäëk4J¡dˇ4“N–2w∑ut]∞Ä^P‹·∫““s?∫\*”E/Äˆ@"\ÁƒCÊók∆+π›∫Ë˜«ÛWwå"ˆŒÆA•ö/÷ΩÈmùC‡çe¡Ú-≤±ª©∏ﬂvø{–Õ]+˛•) Ë‚(ö≠+Óï@œ¿óöXIÁÓ÷N’eLmÍ6?'Uf°¶åTå≥p?°gÂõ≠]æ˜í`O~;œIΩ‘g≈Bªtwîx⁄e$V°W7Êõoµ2àÅ€x	∞Y	åÂ∑t√RDïJ÷«º˜({q¬€√3ÿ´;Ptà´Õ-¨ÉE›JÏz%tòqEüs∑#ﬁa?3ÿÕW±,∫ª¥ùÕFƒá€∏ê≠#ß8∏NYB6»÷Êˆ^‘~Ó]±ikÌñú¨p@F˚Üa‘
Ó#ØJ±äÕp‡1Ë·Û¡%lÜƒiN¯JO›lXáﬁy%mW!y˘-ùßŸπ)ÔﬂanyùSÌµ˚™Üf°À¬˝˘ı∫Nó≠µÈD◊QW*º¬jëÖ÷°aw
OJ{Ï⁄dY‹Ù ≤4‹Ú.Å∫EóÎ>,Gsò≈Ïú<!ﬂn–Ö∑Aß¿7§D±ÒqŒ	6¶r(/≥F9œÈ	œIı ﬁêØπtæéîP›«ç‡b7u÷j˛”Ik™´lÉCwYúàp±SJï≈≈´5œj©:•ºﬂÕ®ºá€„xJ>Óá—¡.ªLÈm*)Ïã›Î@àä={öﬂj◊›UÊ¨4áﬁ≤ó¢ì}s„6<! gVªgEª®%+lÊ´Ÿ∆ %EÅF¨É≈H]ñ∂ÅGoN∞mE±Yë-/w{á√ÎrbèÄ„§“ÅÂZÈyC\˙∏~…C&NY–PÔZP-™c…Ååá2bµGR@Hº›ŸZ≤›y<ãi2€~èá—AßpQÒDFæœ§ê:=Ì·C¶d≥7ÿc:Ω`$IØ5>'µ&π ^iÛﬁ=Úı¯5¸µ>g◊IøÒÛZnë|J6’h'çQiç*hÈ‡2jÍ¯ˇı`K¢åhúUQ?^†K|”*´™r±Ã®U88îZüä
H÷q‚Un$k∑xB7ﬁ˝îC7Ì¡iÖ≥Ù'8òÊ:≠'i6Âkˇ›wdÛ^Àõxz7UOºæOÛ/«rz∫‰Hãœ˜?úëH$-Úåz·rC
ºdÚ°çIÄÇ-πDÙ‚…ú!√¢íP|(#{ÓM9#]v•DÌrh'4!CTßó[3öd1ã?»¡Ip∫ÂÜF”√Ú√	{]|8c˙"ã≥çﬂRﬂqTMÓ∫>ãGQp∆Ëd∆b1∞5Úk“z2…8ìÆ?¯!L¡¡âÙï8Ån2»∆ís!‹{√¸h¿«b©’3"û?œc±’ù?…It≥|¸CòF	œ∏Ï‹â⁄«hç4LÅxÍ4éQB}˚ìœ"~@sÙ}Ì<rKíGqvF‘ß±«ñ#"ÇΩQç∞‘_3¯tÈÔùï^XFOwÎóL`Ù∆≈õÛ"JÎ⁄
Yö∞˛±ÄÀ–$tB‰ á	x∑¸—yó€–í˘@Ñ…ˇ≤„˛÷tÁwÅ˙À˚ıI›£‰.¿˙«F¿ˆÂ\Í8Ùÿj^Ç1q\pú)è–˚É˛")⁄î#tÊG,éÒÅ¡É◊Öäh*Í!`≈<œ∆,	<ek£Áß‰9˝3 {Á‰≈+rJ°·Ú‚£[˝ÖlY∆∆ûØ¨N)ˆâ˜·E¢$H~µxE.g#‡é≤±9ÀD∞«ò"@1ÈÉ>)◊(◊]÷†Ω
2œúfAp≠lJ∂ ªèÄ∆e0d…ª4èŸÖPÍCÁ¶Ç$$K°â∑\‹<…Â¡›®ﬂ7-ä ^ıQ.Ôôó–@íZ;Œ…Á¶KËÔœ£Â"}Â=û…æ¯ÇOÜ/»—Òó√”W#r˙ŸÀÁ√üΩÿSÃ¥öCÔgµ†8€È`

9·üºc∑Ta9µK˙∆-a‡k‹ä˜}O8•ñH¯L=F_»YqAD∏®=nzD„¢—ﬂ€^π—«Lúê·¶∆öÒ”ª=fs∫¶ﬁπÍnﬂa49e$)¿Y~¯I˚\´ﬂË0±tŒû_z)ö“âî/πS 8c â!ÇùCÂ¡C¸Ω ∂@Xâb/¢…2cy¿÷	±√√æı• º&ÁO†∫s	xÈ)‰dêäv…å‘›'ØE√úXæ¶1	ËÇ˘ÔyZN£8çŒ#ﬂã`F‡8{P⁄Ú%%^0ˆ¯Æ/‘Œ•ßd"'/bÄü¬∫∏¿˘*?∫ „‚u'Ôj^ÜÛ‘{„!ñó‘]∆í3`Ï4«xç!sYÇÉPî–≈†Ãºy%|ÕiÇ3A	æüÍ0˙˝çLg®Ωi^ v∑+Ìˇ9RäX=≠‰O ı+y∏ˆj–'xXÍë0Ça√9Hπ†ƒ„1Ç¢=M	|mƒtNË"Ge∏OÜß«Ë*KrC•|Ê∑3ö&√≈‚æ¢=Aœ0)ËÜ´[zô≠	ÊxˆŸŸ˛}˘’ã!ÅM Iê‘õ“π¢=è/4–Œˆ5%∏.@äAlª§
ÔrL-JáÖSæj*C{„lªan\ﬂËH:WBˇ6ƒî;*c(kø◊[”Ú ^atç˚‡yr!`Êµèf—%Ø<öRøü∆S>‹RB±T5∏+P◊‘ÆPÀ õcÆaò√ë6äØ)Kw÷ä¯®ï…™O_Ë∫¡4ˇî˜—5t.ÃDç÷®Ì
¶∏úÖSôk¬âÜÀ<‚ÿ<G5G—Œi©¯ºÙ|Ú√˜¸[≈ûV_◊v7xÎ«B¨D‰˘ñÀßpÃq3¥å7Im≥®ÓN[«˝[ÕÖ•ÉMÚ◊ÉÌ]’Ã7"9jëˇ†6o<‹Âë”8Z∆¿xT[{f¥∂,{LÇ^ö{ds˝ÒÓ˝äqFΩ«+ñYo´RiK]	‰◊cÿπWOn[ñÉ”ú.›ÛÎ^0q2‡Z∏∂”*ÚAn!‡%Úè†n[Xçæê≥Óº3„7+ÚÂÈµÅ^vâêlMg‘·±Z	›+≤©4'=™ôì∂Õë?ä‹#ªgs§π—p™215–Å—Tóì√A=å'Ú®Éò–¥$È;°1…_f£«Ö@√ßÛA|FG∆ç˝>e1»‚$†y%E:âŒ<z≠2.»ªDm≥ﬁsÍ'zÏÖ˙ˆÆ
åvõ|ˆÒf-pµ∂µ€ﬁ]Ê÷¬bY€}›—e˛Õú/ï √ΩïÌ5ëQ*¬ÓsıÙ÷&Wù?&?nuCß¢57∑®Jªmpå:Y“ƒ\îßJmW”kÁBG(LùqπfÁ‰)÷§ùFöf4ç©Õ£•)TiEi_”^ûeMg‡MÛ}Íπêˆ‰ÿSÁëJ⁄†tM”:9Û‡øπ4¸ûO»—tx¶iÌË¯`x6|∫ãqŒ„◊Ñrì€ŸæZ~•ÜT[GÜkAeñº‚cµr!JΩgï´D$93˚`~Í∂€Ã$gsÓgÖçX±≈∑klªï™≤Zt∞¿FtëÊƒ¿´ñª…tz
Æí∆Ûo∑ ~]O>;;>!'hÿ÷œØ—Ú√c«‹π˝…◊/>?~˘|8:6∞wi5“>—#Ø^úΩ:!œ?{6|Ò’´38¥m„{ﬁò= 	õŒåe≈ç™°Fù∞‘õWfÈV‚ô¢-$0T¨0∏‡Ÿ	d(√äËåÿ(˝Ès g4©∆ıuÈ9^√Ç*Ï.…{?◊5À©ØD˛k:¨Á”~Â1œŸ*;a·(¨?¸´E\YN %ÕQÅT*Ï?JüE,}ÛﬁOô “A:ï •ù	¸H,:…¡Êøzå0>Ò®’é”}⁄çf7@XsÍô.Ø§~˛u™]W$±•`¿ìg†e Ø<Ø‹Ó#P´·i7Á.	BÑDãúA€GıÉª™nΩ≥6V;®çﬂ´2Z˛@';{d$‹…·ÀWGKI/–∑ ≠Ÿ˝nx(,V2°®Ú˚‡"H{M)VgÄÎ‚
ÂÏ’0u ±î£hÃXj‰&ˇ‘\F†á<ñ[∂Ù‰¶ÒE˚˘Wãi˝˘⁄ÌÁEîWÂ˘⁄ÌÁèÉEß£¢ÁÕo⁄5dÑ>*?÷ü©10ıSÏï=2Ù≥ t§CqRÔëa3'hBé|†5¶-Cy›˜ªYZT≥.i?T¢å4˝ﬂÍ;ÁÊK–»ajœ¿∂cLÈVµ‹Ø◊„g>™9ÓpÂõoK^hvÅéaµ2$˜h*|lô€Í¢EÒ9g[*ÈcˇãòN3. ‚Â†Ãº¨ÚßSﬂºUû`∫«?«—%~6&O‚6ç_°í∆6›Ä™L	qV÷˘ÂUÓ>SB´å}Ã√^chIäºˆö˘8Ûª‚2âWì_Ì¥¥’ ≥€5À\…2MX#Ô˝˝ﬂ˝Åú~˝Úl¯åüΩz˛‚=S?at¸ÏÑ·—Û„«£≥ójù…ê´na6ÆñP∑0ì2¿¨rhÙ‚ÍA6œr˙qÇ∏∑‰1Ès_!Ú,Û≥D•6tRºJÍ:ÆÙOw$xº‹ràÕeˇ8å‘∫	ÌCº£htBÉëLbÄñ%µ2OH5«D	Ê4C”òúÇJ˛2l,ÊﬁéY∞»Ê"bL(-rtÁ`ù—d6éêÏ†È
Ñ;6ıxOÁ≥,ÅÆÚ∑(õX -“€ky[I◊DL∑;'¸êîçÒ6“}K∏-ãñ±Ï,ü∆Ñ∑„„ÆƒˇPÒUã.ˇyä¡–‰8úzö"JóçB∑“ô'A%ù˘v=ª˘éÜ)»~Ó†ΩSπî⁄.|¥€*nquóh.©uîOa`.HOçD’UfµO†ä÷£Î¥Ânõ;±(Cû^’ZNpÁ¨Î%-–Ë$"pÅB(j7:™Ï\Å*xà¬.aÄ“YlsÈu˝‹Ûa?Ëcó˚âÕ™≥Œ;rô·°æ|äÉ]≤¯ÊÌ(ÿÒ3›#ﬂ}g¥„⁄†aoMÂ>Ñ%è‘V˛|´w„‘º√
ﬁÕﬂ˘}ûÔ¸©a;€£ô«¸)ø…˛yúÏÁµwëŒË,ÁWoÁàã∞™.≤ˆqÇ
 ìz…–'O~Á]}å≈;'˝èp(k†Ê†õ·VH}˘î	√aåAÏVz…G?∂–Lﬁ\•)PDƒ¡|mÎ21"k.®7ÌÈ(ñ*Öˆ1Ì\›˛BµÔïƒ±ƒ=kB£Ÿ‰Áaî≤üurOAQÇﬂ‚œÀÖ~ﬂ≠9’;QMyî…ì*Ÿß&2!È1?ˆE®§˙”n yÆ‰[º‰S7*.æ3-wj∆L—%ÅÊ„”QI=ç”≠rÃ¶ŸÑoÃÇ˚D,5|$øÜˆiÄ@B˜…¶∂r†ŒüQ¨∏j4Åz≠d±Öoˇ”¶ãG%í;-ΩUΩ∞∫w"ç9≥P«ü∂÷ËD4í
—(¿Å®èx,Ôëx(æjô∑§)qƒh<ôë{"ãç√˝C˝Æ◊ë‡4ÀÕG”-â_ÈF^qÏ®]$Ay‡
"P‹ãöP’çr◊"x·DÔC∂6∂…†Ã≠~ÕøpJ±/ó≈‘g zá#õ≥Q=˚èã[eÃ‚)ª°tÉ¶‰√ÎÔ°h
~q<“ﬁÉKﬂ"—éööÙ®2Õ+µ‹íÃ)Ç¸¡c≤à1Óuôµ6¶s∆9No+^CU)ø∆såIÀ? 'jyËŒUx≈`‹π_mvuÆ°&èª√O€Ÿß∂6=Ly=¬ÎÅ}“^>[
WÙ+4·n›;Ωrk	…“9áà 'ûÑcÇïßPÁ≤—ö7·Æ†ñW"ÎI’)höøäòâÙ™Ì˝ﬂäB¯∫H‘BÀ~:ct™°Li¨ºên%æqà◊®¶Æ“ı-C 4tS<àØú>â›πøëŒñj‚x¥\Ui¬≥D“å⁄kƒØŒå·ˇ∏iñÔÖ5˜ˆÄ6ô3Ô⁄€D|ïò≥˝mv¡:#°Nû»xÉ˜—Ö!<påCƒ0
ªs'‡óX-%hœÛ~:é¶◊’ék“'iè·çPÿT6Á<]ÍÆÊ?ö≤„ÈÅ‘Û‰Ê«≥˘Zlm◊\ïi<8#Æ
õ[Üà ìécˆS±Ê ≥•~™›¨ZåÕE9ÀszH:cEßLüñWüaº>Ï9òtbﬁRÓúzﬂeFÊ1¸Lÿ“÷"Á’Íõ¢_9FÕ°ï©ÜIÍœ¢≠{A/ºêgÇáâg!„≥êπ›ﬂ$k˜âÛuÖ¥p6Ø#‰;◊ΩªX#Ö].ÔëËZ∑.u∏	±ˆ&E˚Ù+ﬁÙ¶“∑\£7ö"¥BC≠Õ;ÙvFì#6N=-Øz~£«Gw∏ÃÍk<<ü]πÃt£M÷‹7®r›}|#2 ±È(∑H{Õù◊Ã3∆Ò
0ëw‘òB«Bñ“©éakÛ∆uç)/ﬁ≈)˙‡9ÇiÚáä°á∑.5M…m‘%òº;~|ŸOœê8˜Œ˝+Ö…JWKUMgÎ∂…™\›∏∑\ûÆªè_n;3®O≠ˇj˙·îØBmy.|ÏöRiØ%!Ïñ.M—˝[°≥ÿ{Ôt‘‹ígò {·Q&›u÷`UΩœÁMÓÖ›∫◊ä√—#7~¸~ì˝ÂÃx©3”tœœÅ⁄I\è©r”˙D”ºÒ®4ôv*ÅE¢OßfÔ¶∆pﬂÊ![›‘ÈÓ+€òˇ≤‰˛”qü!˙bnˇ±u«”‡ö´[n,Ei]@,‘ {.¢˙ Û®ÆFœ4D’
QŒπÙN⁄*ıMc"´ Öòx;«Ç¬ﬂõ€ø≥Õë}˚ÄÊLN2â ä¿„sÍÀ‚ñ∫…∂øÙ
/ÉöZIVﬂÑrkïÍFÑ€Ωó
Z¡∆™,Kı§›*ã˚©PŸ=ÂâÄıèaÔ¬3≈Ì~VÇ}!;‰i
û®Mj™Jhlƒç;e„¯∑ÍŸ(ƒ_ÛÎµ‚ÓF◊Ò86¶¨¢~ãKóÓ>˙à•‘Û·»Â_òÔ≥Ñ|é¶Ñ¶Êô)Zw‘C¿wä– ö7˚–T5U^˝∆3“?Åõû|l’–√@{gDö3≈0¬÷T#∆uL 
ªB†£./π£C@p≈%Rà¢±~õ∞7ÛêøjZÅ≈∏ Wπƒ&{.z¸⁄é~Õÿﬂlfÿï áë—î∑-]•⁄Aó*rGÁZƒ#,˜DÃOºƒO˝^Î 	ªÑ¡<:€1Lå2WÄ&SÄq‰‚Ófœ¶ÃÎ–e*cÊÄ2lÚŸ´gØF√FVhÖ#Âﬁ8Û˝ﬂ†Áƒ2ΩwU§€Àf6”tÌ˛	Û#ü 0>Á∑QÜÛME‘°…füGÍÕıÀ!ÒŸeUª‘…qoù`4l>àŸ8˛J:ŸHxÄ˛UüõZJ,ª5ü)ÖKÖì∞˙‡Jã›e∏Ne,È5Gö?•![ ≈Ö√Ë“K1oG¢»›ŸNO…õ§Ù∑‘e˝TrﬂB¨ƒÍ\V÷G¿˝—ÃÔm'œÜ¬å∫ﬂKìÂ§j≠/ë_∂uˆ≈Ç#k7\’1«∏°ú∞[r$#3⁄\“µÑÅë)°∏Ph€™'íp÷[P⁄+¿œ.∞ïyàs¢—FÍ7ß6ŸX5"›˛AÕø^ ∫ØK‡Z@G~ Ù∂”™ΩÌ™õ„Um,n•_3◊‰¶kù[j¢VBDƒe«œïê»—ˇBLD1ìzåõÖò‰©í?˜πúÌ*Æ%¬ﬁı2nπhHÙ<…‰eCè®¡ElmK†°äk˛QFz:Ù^aI-–‚ sPS¢7{Å>–R-’‚∏±Y;UxÙ◊ı]ƒtÍ¡¸“h0Ü3GAâﬂ)ZÂT’:‘T˚/ÃPø‰≤≥˙®bu∞ÿBmêHπG+l•†¯”àä‘xA;∂Œ≥ÒhÒjˆúfkÖ|Fıÿ†w$iÔßä›Ópwrˆ5BùΩzÒ≈<±ã–∂≠¶kgo
-DQÂZì_#ÒÙlhu∞ªu∏˙X¢M´≈I< ãìòîóUàK’∂:âMy—√ªñÂNaôµÜñ∫Vv€UéG≠ëœiG÷öCOoÏlVÔ6ÈäÑÜ›bÀbÜDqó“EÈ∞	W∑ó‹ÄVÈ]ã/äpú?`¿Z…ëáCI®gª2∑nìà!ü–AbR∞VzÃv SÕ¨nq›≈\XÛΩÜ∏ÈÃgªnˆÓJ^ÅXWj†vvJ¸√˜ˇø»	{Øπ™Z*≠⁄x€Íîœv-É“⁄™›p· "ıg4‹%}ÌçÌnØã˝V‰N¿i“À3õiÒ€ Ç`uË-çI*±§?9vN`>ˇöŒl+fÛ˙4Öä˜…4Ø≠ÛÀÏ\ôÀaÅYÆ˘õ¶Ê·aÊ√¿‡_t˚∆‘ï6_n≠ÅX¸lq‰6:ûÁ
Eª=nÕ<^ˆå«[›C‹€å˙‰î^sÏ€Ø<÷≤Úı£∆Ω≥Îπv;§™+©º∆„zúªÓ†¬@'ÛrDœAUë7º0g"'ÈΩ“WAçR.^$u âÖ\-‚Á«ƒ‡¢e†Y+Ã¨b∞—8á(ªö÷Æå’k∂©π´?ßøkd@÷∆ﬂï“E˜xªF~6<¥(µ‡ã˜`ôgYhäòriŒ-Ç¨ZŒx™ó3ﬁd„Õ+È°£Ôî(‚¬Úùı≠”ÏÂ…lNjΩ≤~ö=Ñ ñŒÅsÿöìÍy≥ú»Î Œ∫K§÷Äπ˙≠ô?h
§´ñ"®Œ$V‘ho∏GÜ¯:ª WeVÑã—)%yÊÎ<”52hèõh  T≥ÄëªõeÒú√π˘≈ÚçSﬂ÷◊◊ªÓd,+‹ÕX¥à*’Ú;∑%Qúˆ˚4∑å◊Ø»B˘ 4¬ÉËpbxÆ≥bë™.Öo∞∆JUKÂ µ≤ölÿ[ï≈ı»®ÄwD÷è∫i°Æ§92Qƒ$–‹ÏV˛ÅÂ>'Æ«À2 ó–Ö"eLß∫¸ "¶AÆñµHUÜº¬	Í$¥TSµΩpÀã#ﬂ™tÃ’’ﬂ‡ªˇ»‰ª_8pwäË4XŒXÃ≈$·Òﬂm
úl◊’Ç‹¬KFã*†òdyö1IÿﬁÊ¸∑√N⁄3_§“{7”˛úÖ¬¬#ÉVﬁ¡ƒøΩ˘•òD∑ò`ÒW{Ü≈˜ÔnäÖaÛ 7˜€û›˜»ﬁÒså†©ónÒ4ı“p˘∞_4Oﬁ7aﬁ"=ãNÅu•˝Ómà!Ïâ;q7Y≤^¶‹~¥«o(ñ©/Â€Ω¶h€Ω≠[C¸æˆÌ,Â3wlƒÖ’ïﬁÎb± ¨M–¬∏ƒ4vÓπ&@_‘·W•I¨ù¬œb⁄laôn¢[1X•k”èHõSé'ë+l˚à⁄÷Ì¿u•µ˚|c∞nÑKÓ–uâtéÀ]ıÙ≤lX›ƒUÂêﬂ.¸˝ˇﬂôãK®ZΩ,¡ºUæ¡J3N≠IvµoYä‹çTìE.AÑqÑπú·P†z<%D˘Ó¥sçÇÖ—‰:úêeô§√ıqÙ•ÓæUœÒZbñë∑ıÖ^R/ÂÒv◊ €ãõ§eX9êe∏„¨ãj:y–ƒ2ça‚ú…µ•V∂íª∞ø‘ÎW%Á`π£¨É%ówñÌBa\∂(2Òÿ*)È.ﬂV¶∫‰Ÿ.%dó‰xTm=çéG_KäìµQ◊'~Y˚ú•≥hzóÆı‰ÌÔÛ}`˝õG>ù≠…€˛;LàéÔ‘9<NÎ≤^∂π|˚ıÀ£¡Û·ãW√gÉèop-÷√Ë≤øv˚Ì≤º]∂‚Í$yﬁçÂâ≈$z,+ìÍ±,5äÓå∏≥>`“™êıÖ^PÁ–A24|ä∫©™<÷⁄Ë7ãö–UÎ*&r”ªû<È.iH…†≥±Bî2i√r'ÖÎ)èªÔ,UGk›>Hﬁ≤Ø©RU∫´¢7n?ìﬁA›-c≤]ßm-……£uÈ~u±€π›úÚÿ/ |}5ò"çáT¯"ıG\<Ã:ˇh⁄}Ô(v§’yû•ÁÑ|≈¡“æmı®‰∑Óÿ¶≈Zpwn”¿1ÿu˛æˇáˇÀg=‹\Äæ˘ ¨ŒnÁ0˝∆˜F·(Í1£·‘g#,%æt≈ÚT$8GTtCÌnﬁç›∫]≤nd^Ëxa˚Æ ™ŒÆŒ†Ö~o à.˜∏’®…jX5\≤)€4#˛KL2K†§1Ù±ò>qüëƒâ¸ •Ù§á®–/[Fa{M3¯+;±4ä]é%Wæ˙Æ∑ﬂ•óŒ¶1Ω§˛èV∆Ú≥ŸÑË≤:_Ì&¥áëhÃ‹5Ço∆›·m¯‹SﬂòA≠ÈZ^K°Ê`6œÛCë˝óõ‰∑ø¡;fÌæ>KRµàÉfxoﬂ1˚´Ããô›Û2¬'Ω]ó+ózJ&ò’h∂G†¶K]ô{)Ωr$;ÅPÂ`:ìµ›Ú/UK-ËwªÂÔÇÅcÃªTÀ≠§Ó∂Õí[\Ì]Oì√%Q˚<≠€MzkÕ_¯P -i‚≤”¡ó€Ì‡‰Gg2cì˘8∫r°ƒ¸Yº†Jf—ÂŸ’ã(eTqQZ€÷ÕléÂã ˝-ª·hT„ß[u≈…˜LÈMÀ‚d]´¶´ìF±⁄Èx∞ŸNV\ILV ÍoíKˇ:„ˇ÷∑í}©å)¬rFÉ1Á,à»9§†F“–1t;ß„ñÁ™õEá∑ÿhŸ~^s0≈¡9ù2ò5∑¿òw¿±»Ÿ<a∞V<g”Ï∞·ƒ˘£Æ'›ûX∞Yj\Ì,ÛΩÑPò6ﬁ«KUŒ„NúhñÔIπ,#¬¶6Î`≥ú–ô¶ËòaÉV∏ÚB,?
~à≈Âxªò≠∏’º’I°€/·V€ K7àÙ™ºæ&ﬂ}G>rî™zTûe≤Ç$V’Iõ“‡ °›À°î0≠ê† F⁄rQ ñ4
‘2∂‘Ót‰wü∏≈5‹£"—D—Jzok√¶ïYQjª¬	ˆøô’zkÎV{sa?[éÄ˘N‹˝÷·fi[_˙æˇ√øëë†Î37¨PÁKö=^˚_…gÛÑÕ3–ÒÄ£V-∏êU◊´ï}˚ƒ€®ï]˚ﬁﬂ@ÌJ¢Õ€˚ó^Ûy≠N“\k‹`zˇ‰ÌÜïª„/Kj‰9æ⁄Xu´h%¶Ÿs≥≈òÒç˘¯ñõ∞m<Ö…G—¸y4•~éZ€pã∞ä&´π†70ªä-øí°+Ãü√ÖªU°êÆ∂*ΩÒT∫£r¿k«•w!]ë\~Å-xè∞gä|y_˜Pæb°˜aÇºà/§.NæÔæo9Ñ» :˜·¢(Ó!÷	¨ u∆ÁJWÜœï÷¬§ílÇ≤tÄÆ_‡xÈá0÷µ
ÓRa0qÅÉ «N¯…†",yr∞t8=XVwÇÚ÷ñ9EXﬁÉc˜«ÎìòÒ\∆È∫œÉﬁ£ —ê˚¥¸≈—}ª“Czıvq“´ü= C·ãﬂ°⁄î uÔ‚·ºV†&‡;Î»	˜;GLÈı¡õ\{ìé~÷÷C:fp:÷Eå%_|€…ˇs_óMJW‘0øô5ëK–Âv•VùÖ¿g:E¶^ÍsÎ˚zËn~•õ#kÒ
4Áˆùb;:¡æo4i⁄2ÿ≠bKÿ~p¬ùÌê›&‡@Ñ®OÚàπ!ºî–J˚∂Áˆ-‚AtËFÕOŒYËcÌëÏµÚì£—ª¡ÖÌﬁdeÈÜZƒi≈áB‘Ü„]ÑgˇÏ!:dîª¿t§WøÄt¸X@:ﬁ1D«/ò™Ú!`rt‰ÌÀö›Ù?^Tãæñéı/9ü∫dÒ!l†˛⁄∫N|†IøxSn—È≠isÎ{˝^Ä7Ù]DÊbˆ"_∆ÁúïV*Œü˚‹“püHâÇºsD†˛ºÁÇf›≈bK/lñÈ'µÀÖ™=˛∫”›†Àv,BﬂÏ–î˙sµE‘Ω∑æªÎöÃ∂K∫–:ÁπüOÃÀ˚K˛ÙOˇ≠ÎÆ^Í,v≥-º=Â¯ó†œJQˆ£LﬁÆ÷®≤øa»âÆn	Z(>£ Ôëøê!åá‚®ﬁ# fF·ƒÛ=ä⁄v’ÂÜÁê(íüºbØI§uâœı	œ∑võNá<ÁF'ﬂá ú$ÕÃ„ı	«È˘hL∆!çßÌÑÙÌ-’Ïf2π∫G]¿;Ez3˘∫≤¿„˘_ïÎ}Ã´^t∑öf0ß–y{µ<Î∫Tg-u»ö“l[ò˛¢EÒŸòœ¨Ì˜PïøLy
ÃÆŸ¡tèé£K¸¨T¸rw#]b:]4+lgÓ£6µ4£áÀï‹›‹‹ÿñõK~µ”‚±ïgÏV]fj…pt.S?|ˇ«ˇDNø~âi‘F«£ﬂ…ÛWg√—1ÿœNæ~1:~v*IãŒD≥?{†ÕõVqÙ…áùñvLÜ\=Z˙;ÓçÈü0?£1…!tîΩù=Pˆµù§Á*i≤SX<aÕﬁn'B“Ù—fÎŸqÊ≥,…â3+øuÂ©ŒtX˘–ıYÊlÅyÆæ/h$˜fßÒö∏x]'G|
=2Ñ«†›U{‡,‡ÕÖw<Ã„ú>Åâò@¯?N)>G√îfÿEMCµåB‹—æñ¯7†Ÿ"…"wÀœ@sjÑ˝\ƒ
Ø©ÍYôÆG√µg’ ∆€EuGsK¬R{¿F˘µÆ)êßx˙%£I:=zÑ¬9∞Ç”Ûü≈q[û<Nƒ≥‹'S=˜”8cö”A√b'ﬂ∂∞NKBUÛ	îﬂ©\+õp"+é•çÙù*àãè PØ	<\∆Tô \}™˜O˝,9Ù‚â_$Ø›’fÿ<E=…©‘ç3ÂÆ÷â‡j6◊˛RÂ3à“∆üg∞WEÊ÷„pÍMPJ¨rG$	ˆ™à5|ê≥T3bi|ST≈ùç®‚Ò©^gãÆÀ<®Ò”/}XsXVíÒñ@≤]◊ƒÄ≤Gs6¯∂8pu•ãæÅ@i≈u_‘	Vaõ;ugáãú≥ı»*sÌ∆˘ï]YDÌÇ˝(∑‡}à¶GZ+H´›3ßüX‹O˙…z Aj–U ıé˙7ÎiÏ@Ò∑H®Z„„∑yÏ‰œ’ÌUu»
ºgmCJΩ5≠Àå1π•!•ÂHì'G∑9LƒÏ√&Ì[U¬—Œ≈¸'Cê9œ™“ﬂ€°≈¨äp˙`∏:PΩJGF¨ﬁü—ﬂ1Òhv>Mk$fiá‰ú˙	”◊êOôLÒÓ©©ú2
∑“U	ﬂJuf`¸ÅÂ'°8ú†M§?æœk}á‰ßdS˚òv*o°…⁄˜Jö\Ä¥lt˘,f!jÔØ?≤\Ht‘§¥¬ú«Í:êfS:¨õú>k«/ÚﬁÂ=›º∆löM∞√, 
'≥Ä¸^*˝:(f}f˜…¶∂ëNB?=¢§J…‰Bíh8G◊”üAzí¢XÄ;”£æŸ÷'§CN>
Ø##àÖå92R∂jbÊNŒVD–VB“¢îî0πyßï;¯◊U‹∞	€b=â÷O8iE¡GYëH-˛[r,e˚ùÂV◊wÈo¬ı◊Ëu˛1Æè±Ù?Aæ°1&Øı◊ﬁ6ÎP|’2ò>ß^H(¶àåæóíaÃhwìiwÂ9^èÈˆHæ»rÔpá∂ÒV∫QıB˛¯¶·…/÷õ!fº∆ßÊ≥‹äK≥U*é.z2◊‡úπsıõ≠ÌﬁmÈIhÉó◊⁄ª-Ó]ª§ﬂ)oÂ[“ô%⁄¿ãÎc¯lΩ>~†ã8áA,t∑±∫;+5†Ö£Z¸h}ó9`ÅƒS´ﬂ£äkTu¥∞ä‘G£uã∫ip©>¢Á)^AÚ]”ÒõÒ.ò∏∏˜Ão'5˝S‹¸eöÀùª<h∫∑?b4û®_]œ5ê{@‡∂Coıhë®[£xÂ}í&xXs«dDZ≥c´’1BiÏ›xq<2 §IH¥úªÒ©—Ò⁄ÛjEW@¥™ºÌëE”+°à%$úLå7{TÓ>$∫ ∆OZÆJÒnZÈl— N2’È¥≠∑r=uíºDãr%∞@*∑¶ 5!2b~‰˛l3¿á÷c∑ÜÍ±{TèÜÎ®!åCÉ)öSF3˙ÉæÚqx9ÅÇËö®Öπ‘¨7+hØ¶|›•Ω<˙p87èSÔ®i≈Ë Ö!u<6ı2=ÁªÇ>õ>o»ÂŒ–[¨X±ÎúP!üÒ≠:L\≥˛(0 ≤ √1©@Ú`)√qVú∞$£FX≥ﬂÆ…S◊π†ËË“^3∂/ı´r&T≥‰Wê@1{€◊
Ä:^=-õ/ LÍùòåMéÿ8ESÖòñ ùÖΩväVúF}©ZÏZı–XoÛé£ıí√,éaÊ¸Îë‘b,â7 Œßπ¬^Æ¿oL0]w[ƒFÇÉGîØÏ/⁄Åj˙\!ê˘¯F51ê≥|nKÑùZMm«D”©2±∂™6’≥;©@’RÃn€√ö˝u2§
…jÆ¨’˜*É0ú∆‡à±¬ï¥•ù ó>XŒ.¸ |‘å£Æ»÷ÿ°CvÌx∑\˚%£û·o$ë2Z/=EÌwôﬂ∂Á'hÍåkV—ûêP¶^¬∆YÍÌ˙÷˜∑-†øÍ„ÊÑ1h∫Å®ñbFÎWrÀÁØ|\>⁄˚:∑àt)œ8=ÀÅáU,§™sl¶∆‡à–∂ös»—r)lytW§çõ\^tåùU”˜2ˆE5ÒªÍÀD b16z[óio…AÊ;Ê8p"˝Ô‡d9#˚∏#[‘ q]&≤K–s˜@Á6,Ò®.sÍ]˜$	e‘’R¡´√#æ{`∑¬2ë–„áÔˇ·ˇ8mt˜»ﬂw¥hrNH7$t:t|î´ÇÁ^t	˝ˇv8ÁÒY¡8èó⁄∫¥é|\W>˝À/Cqß¬ÌkSo.ëölL/®'Õ+tgrΩCt78C¥ß∏C∏Â8åÇC~ÈˇÑ,‚(X§]f®˜ú&Ÿ|Œs´°‚5Eq∞†©,lx.ø¡ÑàÔÒ˘~ûìÏì¡>y48∏O◊ˆ:AüÙ†rá
0RpkÂ3”eNkì@ﬁÑI•ó‘KaüøZLÀ†∞n •	†.LW4–˜HEôÏäBÉß†“ ¸’µN≈˜ä=Ÿµ:8åPﬁ˛'W¸:Í,fQXˇsπñ™JËﬁÍã ¡ª¥PQ¿∫7s€	≥5y\∫ù4B(FXts˘vT#‚ÇF5H9^<ÉÃªgÍÂƒøπ∆“ëI!ÖôÔwjÂñ0ÑÁw0âΩ/(Bﬂoâ}L„ÃÀy£GÓ∏ª∫ç“˘Y◊'›ûsDÃ™K¢[5I¥º≤j‡e89Âı¥õ,j@›d∞&ÏMX_H/CîW÷V'∞
»öæˇ„ﬂÆTZ]ëÌ«-cÿ≠∑:AM£∆pe¥h2éøG§¥Ìà‘¿îVv‡T\øyÈ"Ó‡©“ˇPèîõ+éQ	zbπäU◊_@À#Ó$Sy~°~<
Ò˜‹˝§Ù;—wP‘¿’µtÔrı…V˚q©õ¥ŒGëú“ê˘
@Öá_´?Ky¸)Ü∫º†∆pdÕ=µBó¿áï¨5ni:9®Q¥¿‡˝|tâ¥‹Ì0πß‡>Çn/‚Y~ç∆≤6•®£4tï/Zæ{»|—î)ÀBÈWÍ5)JÛ§Y/mÈæ:zO:[⁄Â≠`≥∑^rK˛Ù7ˇB§¸k˜˚ÃG°ÙÆÃ\∞ÃnWr≥%ŸÕà\à÷ØRÌlqƒ&-πicúVÔÒjâµ
oπf∂Ì∫∏VÛO‘çR?˚gYö-¥ìoíöL©∆êÏaé∏Eß‰9–=Ót]9S?û%∞ÍD`SÔé(ü‚~\-¢m"d˚≥]€œ›+»iöÄ•$≠ÉGÍ'˝áÔˇ_…ã=òî·Ñ∆î‹#ü”yÍ‚IÕi¬Æ+m7£±<ŒÊ@Ä<l[»Ωë©ø/˜E∆~4ô[ËSû8ÕÅÙÿÓß‘}œ=ï†#ºán7J-⁄—£¿÷ˇªÚ∏wΩpcS≠¬˛Ë∆Yˆ:3^≠}∏+XÛF¯π-‰–«§Èp sTπ˜πÑ æR`‚ÀÆ§0åæÌE4¸h„•ü√>'F‚£f'Uâù∫UA]≤QcHí.8Y]∑≈GÇi’À‹Z%>ÌÄØÇ˚M— …ÇÄ∆◊ù≤K—†ó÷ä‚â∂T––£¨	Ü-¶ûÆzõ=øiÛ0,lv9ûJÄÚ£Õ2R=Ëòé≈≈=‡Ï’ã/æû_h"≠kwr±Gâ7D0˜HÏjq1aª˚qÁ≈…üªh~Öâ˘î~ﬁ.&r#Lµêa™≈≈∆e#8XZ5\¡o9Õ5£ˆW˘É-›∑´˚‹ç9</]≤§∫o¶’m•%7í›}¿-Ñ€ﬁÃRæh"ÜmøÈm)∞âvÍ4w≥â‚€–√mB•oúÕy–ÃoIÆA…koN´1¨ÅD±,®@°ºÜ§$•B¸ä⁄ıù'$¨Æ9 «n£1≤waÇñ¸]∏óí±/Ωõ/°ö¥|^>Ú”aÙïU±ëÓƒÍKÑlﬁ9:…Ÿ xˇ≈˚a˙†j=ß˛4˙`πì‘€aOMñ`ˆÒ∂ŒdûÏ‘Ú‡;†ÀÓÉÓnÉS†ícüMüXÊãÏ?!ñtJ≥ßÂŒr<ù,yBæ=-pÕ,D;l·ºLSª€#-@qâ≠Õˇ!
%U~N√å˙ˆ–1ÏRBÔ“Kg”ò^RﬂA¶0ØÄΩæúKÎ5Oç≈)£r¿π cŸòºB´kû¡⁄ÂÊ‹ ’%_∆e∏ÁõÔˆΩ<o—‚;Yfõâ.ôˆ˛ ãÕ ãâ:˘mBjéæƒˇn<˘6Ø{äÊ◊"79`,lBÓ‚â]Ó!°7¢¥Ÿæ	°vì‹H|¬ÕÎ5âõƒl0qæ|,“«ÿ∂í!ãá(AÂÑ]“◊ﬁX¶`‡r‰ó4}a$r5ÀtW©≈ö∏X∞6|≥Ω›tO“]•ÂW˚f©ÓÆPeCà3∞‹	ªXËíñJÉ¨∞]Ûsä“pãm1„<tÍU◊¨_eÅ∑Á≠ˆ∞CrÏë>Ô [Ì¢˚$û°ô~æ¢Ö∂gN3sπtÏ6\Ìq\7›L{†œne± Ó` Â,8e°sM$]ÄÑhÄ†Zœ∑w⁄√%±BÚ‚f“ëπtJIÏ]“kö∆`<&SE^‹r˝πd˘sÀ¨˛çCü÷◊◊ó5*Ø`˜Ò±ÿ˙ùÀ@@4L˚}ö[Ú∆Î◊§É°¸ÉK4ë¿X’›&¬hël1vÄ¥»Keõ∑úp–}’©W√ø&4s;˜¿r∞V4Äj≥[¸Ñ≥Ô:ËNŸ0ı}6á´wÁ∆‡ªfÑ_Âÿ:pzŸ†cz^™¿*ÕÙ~ÿìÕoZJäèÍ7˜wã»®˘πâøS}"A\X¿bÍO7ˇXpC0œŸÍû9zØ—›KÍΩ1Î¢¶.´±˝?i•/ç¨›ﬂ¥«ﬂ‘ŒÏ“ûñ<≥qówÿpr™≈}Àr2r∑]¸Ô∫’ZÕÚÇ$îc2ÛÿÜÈ∫œÆå∑˜ga1K–Jˆgÿ«6¶	◊^¯˛_ˇgèw@YsŒ∆ﬁkäyµì¸/Ùœ˚'Yt¿®∏å˘·˚øˇœ=◊⁄r‡–ÄüDLö˚¢∫Ç*‰OØò»w„L≠-Â$ÙV∫¥DfÙÂ≥¢w¥Ÿ6K¬“ól¬ºEzù€J˚][ùá≠ë,ù„0	ôrœÿ—›´J·rØ)WvmÈ∂cX"ü5>Y«”ÆAÇˆ÷ƒb÷	„πÍ;œ\«>;ÍÂ•Q$∫Üﬂ∂”∑%•È±g…l	tÏ0“.‹£øb—»Ò]íCÿ¿Û.‰°sä˘5«ÈJòå˛sb*Y8ÌÄáRi€‡Æ©2&
dRÈÊX˜*0øz9ÜWç€	W¡€n›„ÑΩ’wê"´ıBÍTÚ‹åçΩsìuñ‡w·->1£·‘gáx-ÂèãﬂÚ’G˝”Y_…ã2∏wSDO©s™% í¨ﬂ5à˘∏k¿o^∫n+µ[´ú¬wÀ“ù8ÜÙñ≈ÕTi˛ù /Âıı"é ÿ ^kOyäUÍ∂!ÔüìŒ‡Î›á£´§–Ä>È,-‰P)ßÙé©ºÈ^™'™!uFS¿rp
,ËùŒ"˚ùﬂºqıéÎùD÷’	≠Àà≠w\W&∫v^ª‡[ßÔ$ÏJtä“AΩÊ
Q˙n€<!Ã2n¡⁄V≈ª∫qÆÙœ¥˘34À¢ÎÍçü.◊¸’6ÎÜ’—KCQyDGQ>pßÁCi=µøD∏≈÷kﬂC≠‚3èÎß„=Úe∞8äÇçﬂñ–eá/_‡=ÙÇœ5ﬂí:º™
Õd&´ˇ>∏“^„`øÏF≠√^'Ä˙OnnàÙÎŸ#õ˜	¸ªµ€<Õß†ˆÏv≥˘®*¢nÇÙLJÇñﬂKÈ]QyQ}=⁄nø¿U%⁄ê¿ïµÀò.4ÒIjüﬂ˝ŸÉñfV˙´h◊ñRƒM7Œ≥êTˆH8NP≤ˆ©€ﬂò=Pt™Ìúû{Ø‘@†’ä®pÌ	hœè|DÃ0µ]0ˆ∏≥÷%vnŒ;óÖi¶“—«ê	è≈(çbEAD}G:RÏ	∆K⁄ææU¯ó´1N‹–)Ti5µÇ∏M‹V*{ü]aÙ˙5ò≈Iø8™Í™:S| ò"˜ÿ∏àÈ‘Éû“hìÛ8
äª‰îm ®ﬂdë
ÄRï‹Uª`J(œÔ∞ó‡m⁄‡Òn"@
}lòääÉ‹û$%u=ä.C?¢”<ı‘É[MZ"ÆÒ6G<Ä⁄!8˝≈ö>üé{Æl°’¬0}«AeÌÒæ†∫¸jaj…ÁEÂœ‚8äMC≥¬HËñ*ß1{„±KYÛ‘È˛7ø”?~ú‘ÜÚıÇÖ˝4Œò≤ÜRÏ¥±ÛòLæ≠+ÿ/Ôyc;nÁW‹Ãá~î9Óh1∑wﬁ—é)&UúrE©#?è‚ ‰ô`LgØ‡ü⁄ê–ãvMì:Ráº¥C:òª{IE“;{¡¬v“Í¡˙•›3 3?KΩx‚≥2ø^ãó>‡<¢6Ö]^‰“‚±⁄ïÎS“„≥èÈøbﬁ™¨ÉZ∑µ\∫ÌVVÏÄ∆ô¬(+¸s€_„ªî¥rîç/-,CÃ@3Ÿ:ào∏•¯úf~™3Vpí4‰z≥à–È…˙9»≈.§ükPPÂ£¿gú≠πÑm™¶¨>%ì#W2-Uoü<TV“õãj”;·I∑@h·2‚íz(Ù˚‰!ô”òŒaì§c[ %9ß~¢[ì<5ë&Øz÷”¯Z;\ë÷Ò0Y ∞BÜú◊0[÷ÑU‰‘òr^ﬂlﬁiuœl¬±Ÿÿ≤Ñ≈Ë7≈+˘óÕ,T÷x·tA¢Dï√¸O[ΩÖ‹¢{ı„›wIıπ2´b2˚¢˛?öü7¢_∏`MmF’q∞tæwê√ˆVÅi9|UIa?≤ÿ¨ô∏°O»rm&]G€Øfoùd¥±w˘Kp]O0¯+µøÈ~±vRÎ√ò›ÈX◊Î[Ã›Àƒ.«pπC®>ÇÊ:]ŒúŸ˛÷OU8-åô7·è˛XŸf!ﬂa$…0!5ÂùSè¿—ÀƒLπO¸òó© {’ÁSÕœ…Ñ¶ìpË8vGŒX¸‰†#	ı
MB pkI -æ˙ú^FË(£®∆bSnµ	‡Ø¢∑RU∞¬-Èî®Î”1Û[™NSÀyhHÜy∑…3(ÁtQ9X{9ü¶/wÀ≥ø ºòÈbUÍ	√eè„qFF bë!HÆtvüå÷Oµ¢2{xNÅª$ˇ\÷Y&g¯ïHÆáˆ¨Â¸÷‰Tâ[ld G»»z≤¢J˜‡ﬁˆ<(ÏÃ“™¿˜+ˇ¨æx˙–ˆË'É°†”è[≥‡ı]˜gQÒ˝m“›üÎ&-¯Û≥Ë¬S{Ù|h€≠°îSÕO®√∂ÃGË∫+µbÑ‹≠y{&—ßæèÎPÔÎ1„√Ío¸eÚÎçã˚§◊3ƒØÈÆ®9π›ªÇã∏±ãÙ°Ù‚A˙∆C›ë∞û)âáe8S‹85B„î	ƒ∆—@äÂS“ÎøDQ„ÇÃÄ÷NC^ë=xúø^\¡Úß…Ø4πÎÈŒU7€	rÛQk¿∫©©{Ω.‚>|èO‹ÚÇB∆ı&i?¨\{°gÚßŸ´dnu€VG]}›P+Ñ*W{ª≤œºﬁèÉ{ñS‚kÑlUˇ(n‘:’q2Â]µ$(\∏6Â@ª˙]Z	
.ÍVLÂ_ùDIÑj
Óõ◊Tn√î•†∑,‡
±ÿP>äàzŒ¢$ÏÏ¸¨ßﬁπÃ:ø∂Npª€S€`æm
¥ÏÖç„¡]&†]t∫DOπˇ>X9ËôŒ…´pöÒ`¸ÎŒ.8‹sˇ’Àgk&BÆl(!ßy_Bº›2•ÈΩH@◊ßæé„õÇÓJƒ≥ÿ◊.•6K”E≤∑±1çΩ7l˝"ä.|∂>âÇçsœgÎÎÎ§œ'4˜ñ–2´
˘„FºÆ¥èW˙9Í∂7An}“ì9en´2‚BcQƒx§òAÚ¥˚¯Oˇ¯œˇÔﬂˇæ“;ù–°Ò^\Sﬁ¶ÒÊ§›µÛp+Ò‹öÌf§˜„˛·˚ø˚/µnÆd‹Jö(|êÖ>EG^∏⁄ú2ÖM⁄)}ß[¨]^øFPOeç^]ç√ÿ^ÈG%äµ›zÕ#y¥‘Ÿ‰¯¨Àcgúy1Ô	˜H–u∂åçÒÍ∆b®ú˙«≠‡+˘˝n€ù}ŸÂx§ZÉo´=˝∑nÕö≥b:§ùákk´Ê¯íÁ?K^h»¬•Â?¬ÉJ#√y¸ÿ+Ω[@XÏ›öyæ~«Èín £’¯b5æïÓﬁ>—(IIt^sê‚»«]=§)R© WÓµ’’
m<â¡˚©TQ‘€@:(5=†œX,n+£vTr blxï5˝—˘D∫^©¡êorgœƒÕ´Õl∑∂Z*™ïo–v¯ıÈöˆøàÈ4„âMAßíYÙW√˘«T¿X TWe94‰‘+Æs◊ÕëΩu-≥¢(R’m…gcBΩ/≤ê£u‡1Ü~ÄR?ùëπó∆çê;5Œ•ª^ıó–≈%E√©Ω≥æßóm¥—•ZÄÃ+ê©_n#ƒ%œU)èl+ü.r,JÕﬁœµ°˜Ìß±Sæ±]\ëU£Éñxâ@[r5Ÿ˝⁄y'àv“{ZΩ(µcÍ[ÍÑ%3ΩêZ`£Ó“£ﬁ”‚âÌ;‹pÂkX4*îˆ;–ØfÖïtÜî¨#+«Xa—n;@⁄·˘‡ u≥QÍL¯sv4À&lœ5*Ï≈29¿◊ÚFö¶Âi,Rk9!Z‡ËL˜Iï∑;¬>8∆ˇ∏Ân”‹ê'’Õ>U-«G{D.≤K_ú—/∞MÓ÷eñ”kç;√@¨t(<˝Æ#u|êêYÃŒücsè<F≠'Ωﬂè}Œ›#}cÊ?ÈÖQ¥¿ÑÉVñù≥8Ó+lJZQûû"¶k7è~F)4F˚◊  x‹â´F[◊5‹†Æ≈NÒƒ.$¡ò√%“ŸLù¡[ß¬Ü‘ÿLÔ—`jpÑ⁄§5ç|'NtGxéä˛Æäﬂi∆¯†ç[áN<òY|V—oó›·ú˛«IK´5›B¶;tÃíêw	K?kg˙úœ9√QT]Ó§†–µnÈU›Í][)‹T*€©k≈ÕrœÏØ®*.f
~é0ZÆm8bs,ëÉºq£@©´√I)πû<’EıF∞|√Ù©1<5¬:Wá0æè8∑\mjB9’8ïƒH<w)®nÄ¸ˇ   ˇˇÏ}[s€HñÊ_…‚÷∂©.ë∫˙¶∂]A….óJñ¨Â≠Ëˆx  	ã(Çó& Ànµ"ˆm#Êag7zwz:¢#Ê©v7bﬁ˜ü‘ò˛	{NfH y%)Yr3]¶H ëóìÁûﬂ1‹{=€}@'ÕÒ∏Í’èﬁS√Ÿ©‚ı∂ÖÔ}“ı∞¬˜Yú}t÷˜&IƒbÏÇõÈÀÃ∆¯:+bÄ1xBvËç¸QÛ≠=¢é-Ñ´Rì€ôFŸ≈éæ<ıCﬂˆËK˘bGa∆·$L±97¸" Ê]päúäËpÆ`Xn'N WÌá<≥©ìFÈî‰LÁN ó#”å^V«O óÀqîÚï
Kw¢xÏ
g»ﬁ¥ø”˘PÎlØZòt¶)·ú!@°ÌDsÈ·¸ªõ òOß^‘ﬂúU4ã‰y≤yA©	skEcp¥¥Z∫å
´{’H‚÷‡XÌ§Ûìﬂç	GY{ûLrËM¸–#+b≠¸≥VñPYø®,N*±GéA ˝Dã#◊v…Ø»w…Töx¿Y®û%Á¿ØÄñw»z+i,ãIûQ¿á;ŸÒ%c˚‰3ƒ—‚€y	£ïÕ˜L0Z/ΩM0ZŸÍ/Q¥ñ(Z≠A–fü…u"…Ó4AÈåG≠$?«hH7ÆÅ•‹Wgsó†∑3?Ç¶9ùAk{Ìb◊p$gºWF	ä[ëL&§‘cxTz_kZôÔ∆∫Ωiû‚!åçÍ@K√‘€Á∫~+~1°AXCS!‹GËqy^úèqA!ú“àÁVXÊaÏ≥*(í™‡ñÃ˝wYB!2uI:p˙ﬂı	ÖåﬂßÃÑºL©ôj¸îê?ËDQé-°M–âÈ0 'è5|bæ&¯Da’ñâ3¡'~ë"≤ptCÚ«?ÍÓ‰+jwsøÂwKoµImòx` á„!°ïÓÅ¢=≤î–Oåî∏ƒßî¥uS)À\»•≤¯‹¨Xï≈V¨+Àæ˘∏ï‹?¿°ÏÿKÃJ}Á5òïπXªı‡z*ÃJ—
˙îòïÛnrY+üø“}3™∑bç
ÄçÕ-ﬁN$KA}\"Y.ë,óHñãB≤Ã7ñ¸u7émw2híoõ§’z=Úçó¸!X%áK4Àœ(,ˇl<*jJ©∑–∫Ó£˚m‡≠í˝„÷*9˛ÓÂ¡*ÈÖ†GôâïkŒ5Ï±€ÅŒıYëÏ-ƒ∂ÙêâæC˙„PÌ√[‚[˛r∂vézå-‡-È}Û°[“&niÂƒ∆!.¡-π„¯”A[:¡TZœÑ¨ÚuC ,¿*3[îGÑ»ﬂÄbÓêÃ8u‹Åø8ƒ ,f©¨‰€”Ø“Ä@ôfv-ÄrñÕËY©TüêÔ¸∫ÄEôcNRÀy {OJ∞È\)Õ;™Õ.≈%π± …p“E/ZN~jÛs	8i;‹_0‡dY¬,a'ó∞ìÙZ¬N~jÿIÂÎï{WâJ9ìæpÕ`ïbJ⁄’ÇUñ!mœFU±Â9e!#dÀm¨k°Áp ÂSOR≠D©‚J°≥§Èt˜-“ÈîÇ¨òåVp-SD{Røàä)ÿ<GGEÜ*W¥ä85*è¸≈Œ»ò4¿òjåCäA™v÷QN±µi%ÌÜOQ|5 ¶a∫‚y5:¶ÙpYAc’9™¶ß:Úß ©Œî
£z£äy¶Èa~¸mËçOÃ3∏Õ÷&5]œß≤©ö.Ì∑ÜC3—Ì⁄LÄç∞¶;rfÈ¿¢LˆóRv/äÑËë˛¨2©†DõDÖek^(Õºù"—œ”RÍØüΩç"fX
8r”P+eˆp¶¢G†÷È-Àºú¬ZF±¨•ˆw¬@/£ÿQâÈ`+∞À¯+'√É;P)˚ZÇ∑·Ùÿ¢fZ XˆΩa†ôVD¬f¡4⁄¸lA3”±-A3ó†ô¶õ‹°]8¢(≥lSïQ3ù©Byx∑ÄUÑv≠ôm§œV'Ó™2ã˙Eéõóf
∫2&Î*ë1Â˙–$—ÁäíYv’©xõ	+ì´Œ0ì<π*'¯ôq2‚∫vúÃLÑﬂLúÃÃßeèy	èôª<oŒFøÕ¯òÇG˜ÀÃö¯˙≥¬t9OSæÑÛ5OëvfÈ,é?Oácq•|Õât)ûPë”Ã^Z_)_∑)”	é£z-·2◊.≥t-·2uÆ’œ.3NzàÖ˘˝	9ˆ>",fDˆºi/“¢c≤á~¸˝ÙabV£≈˜Hπ*ôÁ'‰[ﬂ√˝æF¡<»Ó¯C%b=s¨πà√	]ìÇ]™áwËÁÈ¯\P¶h1x_ÖG®ÇÊ“XÏL‡ö
Ê§2±ÌΩ3ø´T∑À=‡uJêS¶πìDÖä€qûı@æÖ|¨Õ‡¢`∫¸a«˚H#¢”πÃq*GˇTÖhmÒ?	ŸÛco@Å9{)L„ ÌVÑ}·ŸÖû!¢àOcÙC/ô$ÚÈƒ…{Ù/líÉqœ«F`:y!Cäé5…á√˜ÚíÖıˆÒÒ∞ÄãÆ`40/ﬁá^Ä˘ Í	 √¡ûº	4ÄB¨j‚Af–v±à€d:~ä#‚èÖI@¢Æá0ß”.vxFèN[Y†V§U%¥(∑°ïƒ.¢˛4rßüŒd4õàñæfUÑ@õß„cËLLŒ~£&ÃÙµ^èˆ$k$à|º5áILku>≈ÿ8p‚7)>Œ¿ÎÔ‹Aú|ÜNe˜¸sÒ‘ïw∞ô(∏ÉèÔBò˜ƒõﬁY—h|iœ_$aÇ¿ñ›ÒvS/ËMﬁËéPêM4≈{±¬¡^’VM]‚∂î‹◊⁄Ö_E˝~ n6b·Q\´ÁÆø5uCËDTØÙ•pºåıÃ‹µ@ù<sµ=≥ZZ‰Gª$ŸªË≠ﬂ–Ω∆ÙT¥M√Wêùvú≤7õPç•Ho∞IÚ°™ûº\iÇô◊Îﬁ*ÈP>‚Q™jÜcƒn›'ﬁ‘ØwòwXŸ‹)ó*djÈ|
xπfVjß‘3ñòdÇÇS	∫\TÜﬁê¶¿¬ßÅG_d≈Ç=îè:ÁÉqNï3ß“>|\A‘°˘dà£¬\ê7VélÎp	æ|Äf∂•xè‡ŒÓT`X»3ç€µôcCÚOiô9)º-ŒØ N}DßØı8øÜ¥[¶b§˙ìä’ÑÎ,Ño≥˛‰Çx>QÏ*åg«VŸI-X(€àÂ´ÌüÂôÖÛ|‚yV=üàû]HS1ÕD™JÈŒ+R˚’=-[>õœˆ…OØ§ˆm0:€áXj=xÔØ8C6É…îï9XZMK´â_K´ii5•◊ç±öRFu%ÜSÊ6L≠¶èΩ*´Im6=ïK}Dûo>«^(üT€&éß„≥)F¡◊Uê‘Èû¯C0ˆ:Úœ…wÌﬂ5•ÅâÖœËt´‘∫°ÌT4Å˝ÖÚ« ≠êî
oxÚò»gAk£¨≠ëÏ–å7ÍÂËﬂÌ#ÖË¯&ÃÜû!•UZòSø†ö¬©u¬qß[ ¿¯˙˛®^áπâaàV	4©"0¬•Ωq7¡V≥K1OüÖ¥\ΩÊô≥ΩX;q0Ù£ÿ¶+é2ﬂ®SÜΩﬂ~Ÿé®ƒÊˆTøææJ6÷-;Fyf;y˜.¯`ëz¢Áœ∆«)6	Ö3ˇëñ µybáº•˜˛àiC’∑_æ5çó∞ŸÀUπ∑ﬂü¸Hu⁄Ω»°]a.·œl≠.õ@îvÌcæ;¥˝Í‰'ëó4˛ŒàŒ™ù.Í®Êdª≥IÉ0Ì
<Zg¿£ñ[e˙MüÅê2ò	:xzˆ˛Nmï`c¶a1±$$´¯C/¬œŸd¢=åË|l”Äùå◊‹≥d∂∆tÖj*ßfRÊ¥ØEF¸∆§X≈˛p≤Áçﬁ{ëÜMuÈ∫	˚˛ßÿkKß‰o‘ÂÒ—°J™ªMOZÁA/ÓÔêÌıu}z“–õû#∏Q=ñµc$Áû7Ä`˘ÎÔ6Óoz∆Ã®œß„˝ÔËe∏_ãƒÆ˝±N∑ó≈Ü§¯ˇÏ^∑ùÀ2 Å<ø˙ bJµ#±„+Em∆ÃM;/ÕÓƒôΩÒË=p#¬ˆâ«ìÓmS≈∆õL|¯æ§™©ßºi<
?Íô+◊œºÿ√åÒ«¬vÇ›áÖ˝Pf‘LrXõåŒL\é5«∫ÜO#`mgHéÜÈZ˚G|`áæÒïøa≠≠Æô(ø6h8Î:™ÖÊÛqE–3ÉÓr-ˇ∏…e∫h  ∂—Q„◊”∆WÖZ%¸ØÇ∂ÂÛ˙é:P¸Ë+DÇ
2N‚∫H¯†‘›]˘íÊ7^Ñzóˇ¡Ô&Ë@"øÎ%ëO:”ÒyÑ¸±àÄ9∫Rbúù˘Søá·P¢°o·«Ÿë≤Ûó Y¥Ÿæ∆÷≈€<àÂ`r-Ç:Ïë/UlS·pTŒhª*x¢ªyíÊhcO«Á~C80-à¶[π6!äóﬁR„…
—Úû®WÚ]æï≠ú"®f[8÷Sy~5Òˆ¯,¶«F‘≠É÷/Ÿ¶»k∫e¿Â [ÕRº•(ÄÑ⁄®¢÷°˘lﬂ∆Ì‰ ƒÀ5Ö◊å—(⁄Kõà^NQ˙@Ê^¥∏Y∞;5>Hõv€Q√\t∑e–vû ÎÿY°o3≈œh3∆–To∑è£·5{,/S<çﬁ√gRˆh:´˛¢NÈ.}K=“yâ»Èxvº©ÇV•¬‰∞'Tò‹‚•9Üq„¬	ﬁÀN7Só7§Áú±G|¶´©ve
™ Ú`yÚd˘8∑◊3&âÒ>hOçèçuÇ€œ$§5N%Ωôÿo–*Ü‡¥ÇzƒGëóàT`q*X∞jÇ•/¢´z”ÄŸE‘•àQåäpt¥ﬂn6‡æIµƒcî°”
öjª¯†¶jâñÁ!ÇSNÙ¯™rlT•&ò¡Õ(aV´@–ñaÎ≤&◊{‰µ?K≥©¡µ¿p‘-Ö≥%+R´Ÿ €JvŒ∏u¶ä≠SS©úŒ4… ¡%sﬁñ˙Ñ—œ˘ü
N™>˝£>#ÂOL˙ÒPVo:û†û©dWrŒ‰£ÚhµÂD/∂˚æûûyÛâıüoﬁæõ=Ào<°f1õp™ë<aET©ÉÅ¨ë” !¿‚GkÏN,n2
~ü¯t¢}9’µêSÈõ)§T7ºL◊>™œã±N·=™Vµ›î6ÒC)Q©E%∞bﬂK˘Jãœ!Ô”≥FË*”^.Ω˘Ë±/ò˘îX–ÃÂ£<Oî'„TØßgWv»—x8ûí}∞Ÿ\v÷ALVµw«„sÖÔêï<ı£‡lD~EN¡ÓƒiÂ'∆x;!wÖá√¨êOo Å±m«c0DµC«Ñ%˜˜ø˛◊ø!`“ô ?hJŸ“ºƒtˆ· ÛË).Èû¬Ç⁄íÔ´'∂r'è∏iöYV
u‹~/Ô∑v¯´—Ÿô◊á!;ÙƒAHG–IG@KÖ‰8:®K0G=∏ç•«`±«C2¬`êùÕ¢–l‚`4Ÿ\I[ ﬁû÷†gƒ∆)xf/8√
1Ùª–Ôg}ó∂≈;ÇØ^egŸhâF Ì¯±ó˘ä¸iÏeëAÂ ÖN4P[	=ƒ) ¬B⁄4iX|ÇU1ÿŸ∏…‘«ü\çÕ¿TmŒäôtsÀï)
√#Í•¥æèMù¯Ô‰≤∆Îv˝I¸òá~≠<|∆’¯ß˙{BÛØ&Ëñ3* 1YÆXÀf`ëßÂd”—‰˛˘Ø”º€ëäúi…PÀg;·Í∏ñÀTjHlùˆ¬qbÌãeè‰LÛ9eA3¶ _D›˛xÓ£.ƒønNÿ˘qëñÆ≈|b$|‚a›ƒóª…ÅäHÎÎ%∞ÜP@‹!{NˆT	£AΩ¸TÜl˝g≈ãwÑ*ê¯µN0ZÅI:‰xÍø¸sTÁÇÆèm|\¢çq_^∂`„naù∞0àZ?™*@≈ÖÂEûä zHÙ†5566„ƒhí¨Î[Î≤cS%ªTÿîÏIÍtÀœbçzV˚Wâ±œîMªèKmÀö∂ÿù‹∆Ì≥∆4ÔΩ‘AÚùˆìag
ÜCŸr∑ìV
Ω¶É7Á%Û˝…∂NÅLı“í∆jÁî-U>*©Ûùp‹ à=jƒiµg∏B
{ƒN›	j˚é˙‘äy*&˘kR˚˚_ˇ˙Øπú;‡™(&5´Hg˙ˇ≠>T¶˘BÒgÊπJl™ŸÍ´5[ÿ©U¶∞˜ÇA2ÍÇ&ãô⁄¿œÉ1,-å¥ZÑOËÅQ∞ˇ¥±!mÆŒ–*¶XBd≠=Ù¶®≠úØh¶ˆQO«†/ö;Å8T®í§¨ﬁΩG∫CÚˇ˛LÓÆn=| üU‰M_+oGÆ¶À'r^√˛9∆HzA4Ab¸éjìQEÓ\‘Â)◊B®Õw:Wd˘uäıj¢ª°ÕÖ]QáZﬂÉjHœ*Ó9K§S}jñ»•k¨“˘xIÈyÃ‰j<P¬˚&ì~sy¥@ÕΩÁ^w≈HQUŸÃ¿›º˚ÜñXQ„v3≈y{›	(HSÄ•z›A©^†íq Åz®ˆ%*/à∫&âæöiÓÊ’¿≤7Óx‹çÇbzÄ.ù¸∞… æ§qI`†ﬂ[—:~‰•UÙïBÀ_W∂S%ÒSI¡n¡ÒMûUbÂU†.º.“Õ≈ãXPé†IˇY[C?F@Çàƒ}üH5Säu4¬4{⁄(~8⁄o√*P6Ò˚ƒü ”¸Î˚˝Ùîùz[L±T§W≤áò≈úfrµ·ï°ˇ˝‘x»hÅÈÍ÷…Í6©Íl‘øÎR≤ÏÚ”≠≤”≠r”ù2”]Ú“5˘ûöü,3“≠Û—›≥—Õ©ﬁ: œEÒ™ú.rLVOÕï
nw|Hπö™¥\ERØFÓ„ı®å‡(^ºﬁõ$]={Â·nW5n	Z≈ÎÕmhì∆]!\∆û 3K∏^2•'Ùs∑JÊ*á≈˙Ç˚TdfNîr}@≈8’ÅaöíÄ¡¬ÉÒÑ‘`„·åéiïƒ„â¨.¢–@Ÿ˝$/-Ë•rŒ∞´,¸Ctv6@˛o°SÍûŸ…Tˆ-eN'y…∞^—.C´7TX–¯ê“KÊK '¿ÑÏKΩA8Òm$”IEì„	T„˘»¥fÕÒvÒG,g”∞+c£≈÷5@ﬁ™}W¸qÎÚÈNPØÔ◊ó.rÜ©™|πtÉ◊ã
Fçsck≤ù1>ˆÔâôíº√PöíﬁÏPõÖ`mŒ…(pÉ∫é◊s∑Á(FøT6ŸÌÕLçx—ûMd«Æ™O<òê≤!0y∫Âå¨©RΩªl~Òp}∆≤xŒ˝'}Œ∂öœ—+Û0mP©çïñ ì≈∑BÊª•gJ, ≤%9`6ÔÊ.Î≤ù˙êïffµcT;Ö"èÈÎŸ˜ÒBœ»›ŸUŸ§ÙúòEn9^µˆ·19l›iùÏã@é[GO[≠#%Ãë0ä4è“]õ˘æléƒ7 ⁄ó‚"•i"ÛÕUît˙¨QÎ€}v“:¯ˆEÎÄæz±ﬂ"?ˇÁ%›˛ã√WÈÁ„ìgÌ”V{ﬂjïÖ^Û[åÑoqãîóoZ0s+VÆb‰ö⁄ΩÈïÛqe°ﬁ¸Z,ˇûÉ{x∑Á÷Úmoÿ≠‡ÓLLõ={Oë¶c€ÏI˘—ÑÚıÛˇ˘oÛÆñ_õî2ÕÒ‰Ã(ÿ≈¨≤&>˘y>E›Î9?®µ
d∫LSÈHaáü)Ï@˚t∆ﬂ^~¢n≥1e—r≠íà⁄⁄ñ“TSf∏V7ŸtJíÈ{ø'òG$ÕÛ“MEu2≤|¯4å,j¥ƒ1L∆:R^€Œåîµ◊ÎÕıÌ7yàûÁ™Ü…›∫í3&5EÜì8ñ†Ôê÷{ö”˜näBØA0z–´Ù#ï‡lÉ≈ìËl~·èÛ ÓÛ‹∏hÌ˚«aç[S˘;LB v”3^ﬂ7÷mñÚÖm‰€•TﬂÇçœÌ˛t∆7-™∂gûŒ &9XôÚ|oñòà≤;˛∏∂N÷…Ê6¸ø#œΩΩâ‹´ü~»˜¿⁄CéèÊ„Oc€Co¢È«C¢z\;‹ÿ$õ›ÕÊÊån‡˛C¯g;¢ü€Ïˇ˚É∞?lˇa≥—Ö-|Ô>Yo<Ä_∂∂·üÌ˜õ˝ç{Ôõ›u¸Ì^„nsk⁄x–ÿ˛CÕl><ZÉ%±RúËQ∞* “É“∑·«Ìu<?±¡ŒO(™ÖﬁÀÙ¡\R)T¿¢XP16ñÌ61&a8Ø,Ë·B	%öx]<lÅ	åT›>>∆ÙÙ÷Ó´£Á≠#r˙Í®µ?ü*fûr ©iÁw»S∆´f`Tx|DÍå+±®‘ Ω@ƒ¡ RÿTCö˜s_nEâ≠ ƒ¯†	3é÷‹QÎ∞eﬁK6dÒ&Ü∆5≤ÕÍêd/Hz6@qò˝S2!yIpc_@SÛ„VVÂÀÕÛÈ‘úÕÃ⁄≤©€Cq˚Ì≈\%≠PwX>6FL%˚∫:˚“ÚÖÄŒr…´◊¡≥≠+Zt—Æì/¥deÛ·πØ1ÉZ‹*o0HÀ≈Â¡üÒÙwVÔÀ%Ä1ó›Âˆjˇ9:πÇJ5úL#…£iT∫ñ¸Ç,cùùE¥í∏NDÕãE<î”4ìU≈ ≤6x{‘";≥"˘òÓÍ|™€⁄m:Ûò^ùæ: ª≠ﬂ∂N¨ÜÂ§M®¨’äŒ˙aœ>U›¨qÂ£«\≠x\`‹<]Îû
ØAª6IßzΩá¶¬≤fùxÆΩH2”ßÅQôfô‘.ıéVèï∞≥z≈ﬁê\µôÜÛbñ§7â©BØƒéPZQåM¡n˚B›•√DÂ‘(˝â˚Á#∫·ŸëŸ∂ NqÊ∂Ëf©Æ,ˇeª9V™+‘Û)ô®Çê`ƒ¸I9ÁF∆‚≤2{Ã°÷¨û˙31êÇ?ˇÔˇÚÔˇˆœZ‚6óÜΩ"b»Ä9Jıú^ÛΩ˚∆—´F)AB%ÔŒﬁ™E-fzhf“î≠ÒBLòk√ËL¥†eÖö•…Só∂oJO_ÆOüZ◊„%ww»o2∆3"ø"'˛¿õqbŸM9ﬁê=q+jÒÍ+¶co'úéà¥©÷)9®TèÒÙûÀPÒ‚\Â-ˆ5<≥√MÄ˚‘«Ì∞RópúìÊç…ı∞˝yÇt‚úI◊Ã]ŒS‚+æDuß„AƒTÍâöáö8gï_∂(¯‚â´√Z¬R÷k}ö>.G41Bπ{0=†…âï‰áµEˇiÈ 73ï1zëÉÛKºSÅ˝ËU∆≈v õÇÌà¢•ù—Ps,M*ˇ≥1*c]–:´#Í3ÎEÈ°:ø±ÁÖ>=¥∆%o¢»6ˆ∑t¢d˝PûıRBÈ]1ΩNë˚6¢…‰Û$Ÿ|xK™%èæ	BØÔÉçW [*Å1Ãrã(6Ê%∫?g≤Õ∆∏§]Úh◊õÓÅ ä∑d¥õløE<¢ÓÁLºt|K¬50›^0jÑü[Dπ`±¯ü5ﬂe\“.®πa0ÈåΩiOI¿-ú+0‹ˇ˛◊?˝”hX¶c∞H‰ Lˆ–Åï⁄JmO∏ãŸûVxê™√Vç©|ıe‡Lc¥O¢·8 ß¬ÒÖ;Ú˜Íí‘ên)WÈaÍ∑‚éVîe{a19é¨IvØ¸∞å¨+wŒk=ƒ´bDÙf(dãNÓ{Îe†ÿ*]H¢@ÌVAU.ÅNuVÖm∆‘Wú˘=4≈'Èù˚ΩzmÇS⁄@#Úi0Fı§±‹äÜ«Â∞¡‹%ñ…8ØxÏ°Ïïñ:§Å.JÎXíAÂe≠∆
9ûZ¿i°“;µËôÊ\ö9ûS«ƒﬂˇ˙/ì«!t>Ák!)^kn29ˆÇﬁÈ∏Á}$èI'√rFÈØSçCΩ”å2xäÌxS+÷ﬂËá˝]‰Kºe˙ÉP©0=ÕëfÌ§†*-Œ
˛Ωªú$Ô="ßC˜°G˘â≈‹ƒÜπâs%›ÆEÜÈIOÂªœê‰Ç'©3H“	™«é(ô˙”Sa™∞Ä˘Î7+ñ3cDâøÿ>∆Xø®=ôú&#/@∏)Å(˚cÏ∞≈`M1◊˝∏?Ó±’û‹7Vá˘¢¸®·˛“Ì%Ùß$™„$‘å%Älõz£ƒkö<Íö@Õ©ﬂK∫~ΩÓuª´§À@ö∫]ÚÈ6Ω!∆xïÎGßã˚rÑ“ß]]Ì¶¨.©qç’%∏≈5w3÷¸U∫£Blπ•ÁkÓÊ,o∂ß?Â˙.75øÆc’S_˚!(àG$Í`∆uœT¥ÿæÏ˘àn◊Æ≥Ô~òx”t3ˆ¶ﬁ9.À5Ùwê`Y⁄{0Ág∫›,}'Ò∞g◊“Û/¢Ûb<h5·Ç¬˜UY^|%°5ïkÅΩe‰«éBÛ≈w6§$–êM¨—ÎQK∫Ô™Ã0Ê&a`ˆ¨üøº∂¢Y6
ÿ«^U◊"ûıv‡≈AOπÜ Ê;ô›gQJ}ü6ö˝°ì√·l<˝∏CjÌ„c-Ú?1ºÉ¿eùÊp<ä˚ó?~ÙΩÈÂ[›£Öâ›)œ¥ÓIÍ¿c„·uw≥Å7ÛΩ°πx∆~Ï·fÌ‹√fÖπ¡¸‚Eå¸4xå‘Ù*Q.c{33¿
ı∆ßﬁÿézc+ÍåkKéù	8e,vT7G„ÿß¶w≠Ì«‘;g’Bâò„à9v!ÊÿÖòµw•ƒÃ(n±çí„f+°Ó¸}&5ÔÍ8ˇW∆˙≥ ∏›÷È4ÈâŸœö„”ÏâÖÓ—·ó∫_7õMAôY%‚ﬂlõæ√]ˆÜav´ùÑò˜»?'Ë¨{M§§ïÊôü¬á˙
h]ŸèùÚèsπ”—fÆr≈Ë3Õ6JÜ´4|ƒ¬ç…tO¸”Føı?`Î)êÂ«4ˆÏC◊5;]ß;ˆ~SRTîÕ∑1{‹p_¶g[‹g’`AO∑ºó)‡Üõ*º·ﬁ¢ØæY∞å„®I}Øh®Ô*»&McÇB¶kLA◊ÍGRSQÛj^„Au«Âuƒh3ß,@Køπı—ŸÏ4X!<˚årBπÜ:á∆©Œz)BU‰±¸"'œé_ûúíˆ´›”÷.Ÿÿ!O[˚/~KæmùÏ∑éîOU äò3vJ›V‘!°®Úº@|Âßôb∆’Œ!jäÉŒU÷ô-Ë©	w∫:-Bú	n ƒÓL¡B≠∫ØUÙgâ#ÿG;XÑˇXfRÃÏ˝õ-Ï∑∏uRöbãã,,∞ÔˇU≠û£ØF/ˇ"{jÎŸü›ßøàﬁZy√ŒÔy‹ﬁíﬁÅòM’]“û¯]Ã’ﬁÛ¬n“ *·Î‰ø./∏ÖDÔˇ∞Òyª∏<¨¸‹3y∏gÒtÿ˙8Ïº&øÜ≠[Ó ò—o}]k_µﬁKmÈüvÒL€˚§ÁÒFœ‚á∂ı@€˘ûM^g≥Ò	>fö}π`∆!”úÑÈj~Ëﬂe•[-∆¡}Ï\·»ûëüõú◊vnÎ[√∆Õéiõ≠tıŒË+pCt∫Îr=≥WB?”2|ZÃÓRj˘zãC¬|)ÛÌ±–ŸÏÊï¥Bñ@»2/üPÇ«∆∂8˝≥æñÈçˇPØø˛«ï7_≠¸√ Z uf%;U%÷ƒ¢Ø7ﬁ yÖ^8U…Qy›4˙=äFﬁD∫æµˆQÎò<où>˚°ı[È¥»ﬁû>¸ÚË≈˛—3r¸\Ú§¨\YI⁄–˛ÔÇZ0¿™mVE-íå†dCcÔË•S°¢:•øÛQÆ„∫◊¨©7™ânÅ◊]dºh,'˛	Á¬nbÖ∆¯!_=wå¨!Ò°n˙ÃÜÏNænÄdΩV…≈%≤ΩøÃˆ€`´¬àF	n¯M:,ˆ'π|"€¬≈h%Cä≥~Ë‘•°(¬ºÆ‰á†Î´Ü∑3÷çÜÍ∫°wêÚ‹·Çêã^e6¥H©3ï≤W˙˙µË|àL~‹⁄JÍ{≠ˆ∑ká≠£W≠Í‡º	˘KQò~XÓu•"î∂r9^'rQ1Pæà®Ï\=¨¡∫Ó?ïÍûßÛºÕ™&2ªÙÖ7EˇÇE^ôxÕû2éók⁄∏‰ç∆˚≠Jçóp…∆kÖ◊—÷‹tyQ#⁄¢JL<¢Ä¬ ë˝Q0#MÈ=aÜ+®ê\=É–ä›˘s˜/LÈrL√´ÃUÆòEÿùV¯˚ºãQÒísÈj≤4–ß8Üf„ù◊ÛÅÉh7aVÃ•ﬁ~v˙ÚÑ¨T†»˛—ı)O˜›ô[! s[ú‡7üÎPª∞Á23Í•À7´™êo©„gG≠ì˝¯H7’ÀWßWø´¶„»ügK±∞‰ÁΩß¨Œä±k¢îÔ¡uo´Èù¢¸jvø∂ﬁz=;,Î›¨[ÏÂiÎ·öx˝pˇÈÈIÎ®}mÍ¯€´‡ì˛ªKòq÷sø$C˝VSª9Ÿ¶∏\∞ñ¶˘IÈgk'√°7˝H˛ìóÑ1˘÷˜ê≤m˝l∏/Tr¬~1¡ï1Ñn¯ﬁXøTÔ•ª“Îƒ¿2aÄ ^DN˝0Ñ·§.RÁf&∂wëEt*1ŒïlqQ-#Ê;Dow\†ÕR%†Y›⁄*°©M8ù¡üòæ!¸N.uÌik-Ã¡j$E¿∆¢∞z[¿âáqcÉΩ‡∆°v…˝©à‹v@‚ë AUéfœë^ ç'^üboÿÒtÚ,‚Z`äyK¢ :˜‡…∂xêâ?‚Ì‘&¨Ò»”¥«ì≥–TÙº4ª⁄«æu‡˚P⁄ª 
öñbJâMÕ‘+ÀáÎÀ4îÿ”£h%(ÿ‘\LÜ¬Á}æõÑç{2aiã5H{‡∞ø≥ä¢:Éêñ8”Õ—≥S“z±rì<mµ»7˚Ì˝≤h*≥Y…!Õ[EXR:ö≠π÷cıe¬3a∞yy§//ƒ‹∫'è…:bñ'£ñÅzN}ˆÖ¨3ΩLB[x„¢•ı“Ó)HmÃxËÂ€Èòπ0Ü–·√œZV™º©‘√™Fﬁ’ÍáYµ•Âj˙1◊<¨CTjÅ´+ëQ¿>t“ÅˇŒt*U†t{“TåØøUA-Uó/)⁄É,r¿R◊“w≈˙¬π∞ëˆA–`˘íãµ}$ªØˆ$UØmÍ÷J»Ùì(â%Ò9L«π˜1#^›ÏÆı∑¥≥/£ÎUc“Æû„!à¥·$Q®E` Oì>à9î)∫«Gè
™	⁄÷ôbE{ÃQ¡˙ˆ(a’Ú˝8Òz¡≥5XˆF;@•∞2X≥DªÌ@íØÍ*ßó…EkæŸõAßhqº˜Gâø≥@´»\|IÒ+r”Õ∆ﬁ8LÜ#Ú„ÌX%Û–áWw#í'{¸*c∞á;ÚC·7uµ:c@$^πtù⁄6‡E∞Y_7v»œy≥ÍäîÁßàπÃ9∞%î"W;ﬂ÷Ó≠Kx˛¶aoÈS5À‘8≤ä≥√Nc√∞≠[!»o‡;«X!‘_Ëâ¡N5k8∆≈›≤„‹jOË¶∞†©ñ„A°≤˚¨ı≈%˛7a∑óÍk◊û¥èèÁ)À[rñ8”éçå2µßÇ;tπN4ô‹Y)Âˇâ…BÊü;_‚S0O˝‚™u)Nê]©‚˙Ãî:z‚Èìßt!éoÌ∆H›Áã›“¸¢kŸÃëæ‹"vì¥‹&ñ€$Km^Ï>ô$”IË_ø¡¸Â±ò°Îﬁ ®PÕıÌÕùTÛ_K-ÅS›M–ΩoÆÊÜ÷T?ŒmËS:Ò^@Í%É*“Ñª6ûO-Cjé[‚uÒ≤ÛìﬂçõˇcTW‰˝ßDLÈ=ê¶t4≠S∑¥'0ÜÉ.≠∆d±w} MÇéÜ!õÁ≤Ø"∆ıãΩ8sD®ùÊºØõnÖÏ«ÃÁñw¯ö©§Á»^w¨<qΩa« å£ß++ı¯Ç?)Ñ®$‰x6vQÂHVŒbyTıÉ§Æ‰D…∆d«ˆ•/Î”BGìyls=ùs¥(1⁄'•ÊäY∫ÿ\0Œ*i/gOi˜ï9#Pù˜îû#π¸∞b˚>Ì6ì^j'¿N∏i‘x≈¯!∂rÄ!"/ê ˆ>ØrâhÕ∂À†Œ{ù–ﬂ¿l,t‰øãs4®BÌ:ËHØ∆«ÙÉçÛ_◊˜ΩûAâß
·ÆVâ·*(–ˆÒyﬁ∑b√VÌ…ﬁ +⁄«˝Yn”Ô9⁄oœ⁄ƒsJ3?Ôªıò	=K‚Œ=7…KJm˚OgÌ◊`ÿnò±Ky ˚4Fﬁ¸-ë—∏AÀv¡î%†6å"ã)á;¶zuŸHÌè‚Œ∏˜QÏór_ëTõ¥.SÇëΩ™•^zìMz<(◊m`Ûè/ÿ»†≤L·Z( ,@dIL›SïÍÀ/·vJÛ)På≥@õ†f|‹V§‘``|fä≤S’@DÌ⁄‚≈ŸèÑc'ÇI:Í’˘_‘$gõ;SFO´fË ry˘•9+ZæP0Pïæ$Ë4‘N1œ—‹‘À"±·ûî5‰∆[n›ª*≠x±cp”Ú,√ö%zeÁŒ<¬_‘ÌV-VSº˙„ì∂60YAlH+_¿sÑyùÈÒKõ”1ÏÇ74¥Ÿp˘e≥ª¯ù’≈ñ*‚˜™L°MTˇ.¢Øõ#hì°ÃÙÆæ7I¢⁄•ïˆ*∂Ê‡ÃN®∏öxÅn≤Chœèc;·ñyzÎ"V«qø• &Ãe÷>>æ#Ø£´Ïä$d3M)D˚Ö*$î√˙™¨ áı¢g&Ìá`mÃ·ee‚%õﬂ4TsMìú∆p“Yè=ß9˝≈uû”›ƒ…Œ˛◊4€<êN6ˇ≥:◊¸◊©÷UâW‰*Êz..U*|n{@ºÿJs@•ÎÌÚ¢t‘‰$IÊÉΩÑ÷ÁÙi≥ˆrÁÇX»^ÈnT˘d∂ƒÖpçΩ†∂ﬂ,Û≥ßÛŸ`Ûz›A©»∏ı|†{S@¡ô«ªπ∏Ê€U–Tôñ]Ê ”≤À≤µÏ¢Eœª~0…™ûªôAçY+—Õ§`\è?Œ±⁄‹Z‡FÁ°z¨[◊¿^—vu{;!†@S{≈˘9¡˚ò¡‡¸0•œô^ÎÈ|◊úúÙ«#ñyb«Æz£ÆèYNhèUn∂<=ÛcJ˚ΩzçnÍ∆îm∞≠®˚§Ê–ú¢ZÑÏ*póçÇπêWàø}P—∏ÚS‹‹R∞-∂ÑÑÙÃA"H∞bÂàÄfq6≈,Je'ÏYÖÖ|\€É> ©wïú¯—0∞mƒ^r>¢âe.Ñ2÷rRUàB~∑ù 1˚Ù2ò¡mbmQ7≥.∏E√@Wq∂&ÒBñ	—<`mt∂M-R{3¨mÏPå!ÜYie3‡…˜ùÈ¸é.›|f€0~`q∆†§Ï&ÉÑ|óLG∞V8]˘©‘ã`œ7“ßñÙ∑g»üë•o:˝tÍΩ„ß(S«<Ì¸π˜S–—ˆ–pÿŒê≈dà»¬ü◊mµã∑V"ÆÛDYÒdòM≤M9Gü¢—÷µˇùM<O—Ft=·ó9⁄ŸMB
~ÙÌÇßävXƒsÊfçvö≥ès⁄»0ãXßK¥”ú8)„L÷ëMÀÿ¶mtSàoﬁ≥”˛Æ8¬i´1…¢ú»CÌ£ö∂zêçd€,Aÿ	»È6ü*ûi5Yi‘sEˆ¥,
öç‘∆úpàåRz∂‘ri±‰mÌYêUH∑µ”·≠uí”Â#M7\®ßxG
ïÔ`#
YGª◊¶¥xıZd∞wŒpÔú_ßêØS–◊≈õß"≠πcøãé˛^o¸wÆ∞SxãµÄ ›˝º¯PZ{Ë∫˙ÔBS◊Øp¢ñã*4«ëv!ó‡›Ç®Fñ®⁄“≥ÅqâŒBÇã•ô9%fKÃòò?4Q®“Â*¸“–Ñ∂ÆπÏö/"ë˝ô9 1{HbŒ†ƒ<aâ9sÑ&ÊN8Ü'\Q8)~)aäÖ*\BÛ+\√Nëo´êÖïkT˝“∫0/Ê>∫C	õ;YBÿ2ö†ßç÷4â»a{tÛ¸<òO^[–6rQ æQÅªCh–C,£ò72XHkıﬁÉL¡2ëæ÷E"n@‚;ÿ=≥?_Ñ¢8Ùá„eÇuiëqà*£Z∆!≤À51dr#É…Ω—ëqÂÖB…ü4a,ü\ÈßéDƒøÏHƒ,Ac5mŸµ∏x¬±Ñ9‚ó◊ËJªÕ1'o.UO®Ûü6}√›ˇ.˚JVÏ«J }êZŸA£ªÎe:IBßà*\Ú¬÷t:>:>Ω ˝€’Ÿ»\Î.éºÑÒ1«
N)rïS;nºhU,ó•päÿ o°}ÈRã˛‰–k3-Î´…	ÍªüÛ™ûbY¶´\’+í ÷0™pä’óxΩ±…ú”dÑ«˜\3¶Åáç∆±oyÃ≈Ûò∂Ï|‡˜™ßı‚≠]»ÓK/ÒËB˝æõµäó[(0^ÜÌÆ
d÷€Ã·@«|û≈Ñ≠ª‚µZ_Àp†˙ZÜó·@ÈıÖù~R¸PôéÀï:Ø%∆À/rÚÏ¯Â…)iø⁄=mÌb Ú‰ŸAÎòÊg´)«$/˝ÈΩ
“4n'ùSØ√T&Z⁄¨ÅŸ0’zÿuïX^[#¨“\D~Eˆ∆√I{\™r'Ûn≤ó∑π≥ËÍdED#•¿Z¢√$ÜÎQs»_ÜŒ2Ω(~”Uk˝˛—1Ó¨†ÄÖgòS2¯Ábïné•L=Œw„]d@Î∏ﬁYëíz⁄ÁIò–·⁄u ƒ€MÔß7y£;“ÔHùM4¬ﬂøízmﬂya‰´ª;Ù‚nﬂèûOΩ®”ÑF{2°≥’f¨∂Vû÷¥ø¥RTÙC˜ÎíÁuì≈ﬂæG[ÃﬂNˇñΩ=}9~)πYˆ">ÖqBﬂ≈7Wª\iÇ‘àÎuoï®è∞1–·v¶8ÉuOp¶’Vö!µ¯Ôıé¯„*A!˜ƒWoï\^Aq-Fd<sÔÉ¯„πÉ%›Ó(Ù\ˇB/p¨g ˛§ô!è˙*+˝≈/%o≈û»8„>eS0«”‡≠T‰
Ü¸Ë3s#3˘òºñÙ∂ˆ]0uµ÷Y%¬èmíøÚ˛x9à«¸„hÈ◊O˝àñ6Íç`c”vøÒ;”ÙÛ!ÃAL_ZVHøÒÈﬂ%#âF2'|h¨¢Í!õë«•˘`—#1™£&∑h7C‹,¸7e•Râ≈N∆($ùêYH∑ìG™àÑ¨¡tœ˝÷˜¶í˝©îπg~‹Í¬Œ]|ÙÂ;Ìû∞ëÛFWdk§a#x¿ÓÆ8%¸\é”ã∆3jxß\7.J˙//|ç≤’Q?õåÏ˚¡Ó≠QŸE∆ªÅ#u˚ÙÒ%êzgUXò+••ødèŒC?i9Å–⁄
°∂Böœ,7_§fê©OØËPÛ^±°“~M∫∞∆“ñ¯“Ò8˛≤Æ ÈØ	lÂ~ìö)ı:f≠ÿ∆
˘5´E•˜Çi)·ôxDn◊òÏ`)J∞íE‘©Ñ‚Çë”ßiÂ‹íaS˙Çè0ÌîñË#0âkø!—«agf5kç\>Åuπ∏îMXë'7Åó?Û∫˝z]! :ﬂwŒ2,∂‡;ÉA7√Pa8†XPyJËœíÕ≠q≠‰Û˘z¯á\öƒ’lbj?ˇÂO5"ùº.âZï§|	fÏZË∆ÆπÍ7•,çÒxï=ßQõr8Ê/“6u„‘é4#Ja¨ÕX-F´}ﬂÖ˛≥˛}™Yó~oËù¶gtGZÕÇÏÕR5,SÈ‰›·À,g•îe”]ªá¸vß»Õ‰œ‡‘ÚªN(øó-øõã›˝e±¶π´ h=Ì*Üù/êÏw…ÇH'ûm∏≥p‹Ò¬”¥„»EÌO#˘Í^∑ªJxew *·ê~¸õ¶ÕdHd°d7Wz˙*S^ŸW„í»{[˘NìÅ§/s¨√â°ıàR\Õ–ÔáX¶÷Ô∆„iDºQèú=P\ÌAkƒRì¨Zs’È)‰Å{;ÏŸeÜ˚*ÆŒÌ4o{ÜÇ–¥®OµECÆπE±\∑ZJ“ºõ{Í⁄IÜË÷q}Úù?˙…ùÌh]Ü3’Cíxõ≥Tu~ˇz°né	Ãˇ55≠¿‡ºèˇyÄˇyX{√Ï≈}hU‹«6≤GÛÒ†Qs0¿-ÚWä˜—^≈KDGc~s!V\ÆΩ\N»I≥˚Eö) —Ñ/m‚r*'¡ °˛5…YEV«ú’v∞z>iÁ§íin»7˚¸ëZrÄEﬂa‰ÌgáØZ‰tˇË˘AÎ‘ÊôÚˆ‡ŸãV÷â”ÿmª@» ä›jÓxÍıìi˝Ñı,ÊdéLjjﬂˆﬁÿ≥UWè~5ÅuÙÅy√ìu_„ÀJ/Åµ‰o®˚Mö »õ¥˙îæ;≈Û¯[i4◊/‘IS‘⁄ÃO_Ωw¡.'1k¢u¿ø*¥˙†-1∂ÏônèŒIå'ÿ:_<∫«üÌ€˙ˆ’i}◊:i=Zc∑$ô'¯ˇ∏√¡Ï$ÔïP≤!%(˙áôQù∂»Ö‘É›XLºÉÌáœõ}0Âä&_;˜">W≈>ÑW¸“˘áÄrúÑävKíåÇﬂ'>]øC*^⁄¿àx’ªadAxôÇ£M¿ÀL·RSÊê)ÖÇÒV>*õ#h"sÖ«2ﬁäüm¶ÖigÙvÛÀ¨Vza,V˚£≥ôå&z4ÃMt—$áÔ+˙.·áj¡^?7ù…µc˙jÃ[s◊ÒysMj◊í‰¸T•,πaâŸ9Íßﬁ»#á^îåïm¨jXK≈ûÒG¨√∆eë¬4ﬂíwo∂l_±h,∆m≥÷©(	%ûà–@L◊N
«A„·˘S'£≥3Ô∫I";1#=0oÁ'¢£RiÙŸzuúÚ∑©NÖÈgi∫∂ê{fHî%πbKv9Æ⁄úV≥+±÷>–BÚπí& <.>¬Tπú¥$ õﬁ≈ÖH&42W0Ô_Æô©:ÏÜaÿXG˘ˇn©UKw≤¥T¬“b©∫L˛˛◊˘€øˇ€?kH”‰ë˘Dƒâ±ÃT˚f<z1”ÁhtÎµÅ\v˘hr%òÈCß„g∫~hq0A¢˛ôÛ∆%Vê˝Cπ[ƒ¸L6,¥Sôü/IJß+5=bJõ∑à„ï-·âﬂı&üÀÚ›æ’∫^nﬁ#ß» È7ü/«ì≈·ÿÎ˘3J¸Ñ“<pÚ?˝”Ãl|é2!á^Ä`˚I¥CÜø`aW∂VhqYƒ\g√◊≤7À¶`9íãÔŸBx¢≠¥õùbıhJ7Êãä˛ NBÃãÁuh÷/≠ú üÎ≈T‚EË)≤π†º&v8^d[ÿªÃë˘éIˇÿN,¸Äö˚¿ÉùGF<q—ãΩÑe4`„˚T0“Û #z€âé÷å–€,è÷&≥Î∏U∏û“>0Å}äªFù°@µè]Áá¨&yTUW˘·ª‹Bˇ2CèYÑ£ÌÃÍ‡2õ®z∫7Íy”û…ìÜñõUÁ+«@¢˚
˛ûzlsiù©j±d8ÀÙ”lHF!ÕBÕå=ñÀÁ|PU±“ÿ|1}∑x¸/«T÷ã}mDWøyQ^ëìlØ∂Ÿºh∑ü98|›*XüÖÊc˙•ìËœˇÎøÉmˆ2ìªV2¬h/œi™e(Zåê>|áıHõ…vÆ¥˝zÕZ¸,Q*ÜRy‚ø[;⁄oœÅ/	ü=¶êÕ—»º ó«”ÒŸ‘è»Rf“ø@ùj1Ëí·+˙6RÁI™ÊR%◊÷1¡æÿﬁ›HÕÇ≠Ä!Ls‰÷&WOõÏ^ºJ©Ô6èdπÏ÷ÌSŸ%œX$∂ó∫•JsØKÀ¯∞=§#ç ÁáHú!Hgu¥Ñ1Pc˝ÂéehG∑‚2Ÿ‡GÅ%l”ÏÂ»5PÖ.eLÚ.C≥◊”g1ˇHD—≥Ós
[»{Nﬂp-]∑/ˆæÄ.}ãÁ†˝Mˆ‘
†
Rü™ÓôÆ’z0UN¿u¯Bá€I…#'"¬åÏû]D8¥<è˜w»€//Ä¡]˛«∑n∏5O\!7oW'‹Õãªîÿ°În»z‡¯≈Hø” Íô∏º\ª(I€KfŸWäs≠"eΩòaoÜrS"BùÌN&5b÷wQ÷6ÊÉ•ªéI°È˜ÆxF
∫‘ıÃâexcﬁﬂ'ÜF“É™báù°$Y úp∏ãõÈ#‡Æ§Ó8Ωâ1Ii&œÄx P¶^Z{	‰q¢M´ΩR∂DŸÜú|†ˆˇ¨ﬁÉºı¶hß[L™ÕÎRªÁ‡Y∏xç¿0Üc¬p4é√A`(zã7‚H/‰ÖCº^“svCC©œå†·•|LbIrﬁxP{˜⁄çPüköÃb-êÉ4n5˜Íã>ç‹aq#ΩÊÕ"ÒB‘/2ÇxH\∞¸+~Ïâ≠±ç§lFÎM‰{vÚR"ñŸ⁄¿EΩµ`ÂZAÌ˚5ÒiÒ}h¢Œ˝BYŸÚôQŒz 6¶Ìª3ö•jFL™œ≤ôÂ∏R{T¿©¯ö#õÿ!â:	aÀ£`ïUFÈÓ"†éÜ-πXøeãH	3ZJÍ9o‹É∑hÓäπ£Y%ﬁÙã)
ë:ÅS0p0záó;ÃY˝ˆÚ…œ˘”ï¡ßsó"
]◊Ï—ï/’8N≥≤ô£)ßÌÅd÷v}/Bç&n˜:¶MD˜˙îDG-™lﬁäı¨»mÙÑ°@tæ Ÿ´ß”' V˝ë§_RúúïπßT‡˛[:!◊∏’	¨0úÌ
„Ë•°»feñy’dÔ∏08}Bƒ˘≈»|K˜C6‰Ê]{7- ∞Pˇ¬´ô]ÉÁ@ó©@ó¡Ùº-2âÛ4»∏í©"?∑ ç∆5[2æ‚>°ß-B«¬“;36“√ì◊ûT8áôÈ√ˇ‹: [ëë˚jÇ2ëÜﬁØc†T÷Ñªòx- ˜Låg¢ù¨¡«Œuı]µH:Å;«Ú¸9m&èØg†™‹ñ\@í£Ò®—@ÁÈ`ˇZ=/Õ^‘±6˘è
∆ˆië⁄∑R§v¯„’—Û÷—¢‡⁄”¢ò.òÌÃ∂cg·˝^ZÖyâ…~S1Ÿˇ?   ˇˇÏ}Îr9≤Ê´†9=6’-R§n∂(À}h[∂ŸñdÖHOÔÑ«€.≤äbµäU‹∫¥§—*bü?'‚ƒ˛õà˝uaüÁº¿Œ#,@›q´"%πª]„¶Hê âD"ÛK!&{<uK≥s*©äŒW°—ŒycÖ8ÌBF¢IXfÃÍ/Æá4ß¿ä∑€m—í¯DÅﬂ9¶X„v>?j!£UF¢6æ!¡T)â"ÚîÄåAä1PU.r:;~ÌO»RR≈L»Èºe9,r‰>a!c„náæÁTBÄåCë∂µ‚'®s0ˇ
©∆*⁄Y´hD¬¬˚E+‚H‹;Å,‚¥Û∑Ë.qãÄ°ûM°ö'çÁÏuÜùÛ§V5Oã’<≠UÕ^±ö=ùj~S(gKJé@9„(Mw*7æ‚ù}≈;+=Zçzx†gº£»W‰3Ù∞»gä¿GΩ†«
,"p†ƒ“!ΩYH‚9¨ã&±ç»˝B…π‡ûë∏1,ç%°Åë
0“ﬁë& A•MñÑã¥@Ñ\¶ ä∏o>c /Ù∞Y‰E$©‰ÇJ¥ÅÀﬂŸ+‰oïçÚÚú#º¸—È˛àú…{‚”ø,©}dx0+]üwéÙrÔ´s9(˘˙îÌEù˝‹∑MˇÄ’"hu¡ ë˛πUR%‰¢a=)€t∫“iòW¡‹ü|är(=@åﬁè˙GÈ=¿õ£˜/ﬂØG£√≥√Wí-\~ú‡˜s´0‰ÑE„Ï)nÌì[ÏúD©~ã]Ø%`I∏Â•Píéeò0°2xvh9ëÕ¬ò/çAÆ¶Ë·ÿÚM#0¸¸=\(0åŸÆ]≥/’†dw~v¯ÓdpÚaÜ®Ÿ7ºF√√—˚3±∂æz˛÷çßπ·ÏëËKdÊ≈Ó*IPHü\öBç£!«¿ø°⁄‚YÜ√Âo=‘ë{˛å^æÕV±i8∆úQıuŸ÷Z∂˝Qøˇ†aˇË’˚dá∫«´©¨é∫Á%¬π¨S.Â m∞ıWÃ ¨Sk>6Œm¿P3BÔØéÈ•ªÒÇ)a„[≈ñ¸Tı∆Óã î›ˆÒ0Ê∑Ã‰óxjQPΩ=B/¢ãYÊ9∞ã®õùtF˜å¯ ¢ rs:„Öµ∞Ê∂c√g ÿ±•J~H∑¸w˝‹F¶çÜ«ßX‚‡›läN>†SÄS∞ƒQº‰»àj@ÈèöÏ©yœM:Qò˜éŒƒGVÚ¥b‡∏ØÍeÆ –i98ß•!éÜd	•Îéb…Qå5´$MÂ≠W∏:l£ëaèﬁV$¡Ö∂y•óKåß2œí <:§⁄Ë5€pQ‹‡Cﬂ£ÆŒ’ãñ+}%| =+·-Mf]†ä@À–)
æ‘¢≥Óœ“‰*‚Fí€≠>ËcV$˝Ã;…5!ƒN:ÿa:QÊ#™LQ]t*ÇR!)Í„ÅˆZÓ·r◊mcXu¸∂	DÁ¿5=◊
ë
‹™…‰Éˇµâˇ¿<–Ca·%x"√
'»çÔÓ%ÙØ˜hîû‹·„∂YmÌ`·ÿa≥—›¥B”‰ù¯0æ‡[	¨˛ªÃíâœÆ`û”(iQÅ4vZTÇETã~fq÷¬∑-I’$&[Ú´#˘5	»îãä$aÊ¢iπ®DíŒ-ÒI6}¶qçÁ≥@`‹êÚ¬«ÕOÎ®€∞Lf⁄„xÙ‡c°Ç.≠ µPW⁄:d¸§Õ„ó:Ç¢å?{ÉâΩEﬂﬁê6·I˙ô˜÷-öÄ[:jZæ/ £ÊÒ≤¯ªÂ¯8ol‡„‚üôôÔÕ4râwÉ@dú[·kféÍá°ÖOóxœ8ÚŒÉDnÖcÖ»¡%.’=6rU$1"∏î‰Œ]ÅÄ_n√®†Á∏~êãC0nƒ1$…ØœÿØáÆ	øq+„Ú7& i¿ß>ËY∂£‹∫YéuiOSÏ≤SÁ√idÊƒƒﬁ6iÊp‹kˆÍ@òGEx]N$<{=Æ.>Ös"%{ÊÕ-ﬂÛÊòÓ¯£í!|÷Nt%BN%´LûZiÚßêîí"DoñÎ°K{ecf£√mÜûÿ-§›n„…+Rl$†=î’´’ØÿAÊ[‚ó¡
◊íûﬁÿ£‹ˆrâﬁπÂœ◊-ﬂBï0Q&Åd«V\CXuÔ˚æq˝ÃpØüKñhlMÒOV´¶ÿÅU@$74)Y°qCØíπœ¨≈óI$S±‚
Ç'é˘b›‚1	cò‚w@¯‚·êÀˆ¶<¬à’ë≠RXìâˇzkò∂_|Q⁄„ê)rvù RGHC{$ç;\í RG]∑›%€á*Í6ﬂw∆íÕCuõYæcÃ«∆≤Sê‘#%D@…b2>‰ùZˆ›ıÂÓ¯ö∂ﬁH_f◊ÿ|·÷C— a“áÆä4Z›jH£º´¢åGyìCÑ¢A ≠u$oVo0√ü´öÄ¥ Jì¿S›ﬂXÆÂÉ:Œ,ºL∞&Oê1Ω)≠1/|“GñÅè±*â^	÷ƒû⁄3N≈^Kè»π>EYÒIÃ‰L^èl%÷˛Û;'B\æÎ'ÍßRYé»øâU÷|9	eŒ™44V;˚ç*d\Ø¨<p<Ko<^ù¨L πVQQ89<ıB „7óRç-¶4ÖnëêNÔä≠sKV”7Iúvîm-+Á`}ÈÕÒ©ﬂjé…ók≤°CFëÒs∑3ÆŒ ôéUÎ‘ú≤#·òòêP£œs«0|™ƒ,"9}¶ßå¯ÃÕØXìWï∑XáRÛ? O∑˘Q)rΩt@1AD∞§∂ÖíèÌ S˚i≥CçJ=Ù¯±rM‰„≥Ç9£‚⁄dÜélçœs&Ω˙îkYpL…˘ãÿÙm/ÀÓ)wı˛5Ö‘PøB™«´*ËWHsU}}˝˙à¶≠™o§__™5ã˝B≠=#ﬂ¢Ïﬁiûú†∏Sﬂ fH‡;˘¥E$b¶õ|—≈'Kj.^3^û®2•∫ÑIåì\”dÇ”;Öàí 1∏ñz"¸ D—|%&¸˙Lõƒ™ Ω;¬»JÅ◊n%⁄Ih˛Ä?Ì‚+õ<Î<•ÉXÕÿ©gÍ¨`ËTò9m≥ß\êπöKW€:©`—‘±`∂€myåÍñ&ú/î¢ú/˘ºâèâCà€_'á<? Òôï(‹H0Ô±Õ‰nA!ñÈ´§¶$É¬ ‘˜¢ÚLæï‹ÌÊ™Ko'—Q≤?IÕ≠2Ω]4à•ÔÑÜ#?sˆÂúàõb¸®ô·öé⁄˝ó£°ÙÙ£ë¥ﬂv–·OÓ-ûÆ∆»6çdò÷ Ó“ƒ7:Ç’üı/à◊˛¥ 0ä∂ËÆù'ˇûëÛ%\ˆÕ¬9ÓœúüüëﬂÆÊéÙºÉÆπLf÷‹Zs{‚{Å7[oﬁÛ¶S{b±ˇ4ÿWoX•»^8hÃ¬p—€ÿ∏ººl_nµ=ˇ|ct∂qv¯≤tlÛ]kûâù¯û}”j}ƒsréwÎy‡°ΩOÇr∏y°…UèDR˛‰˘cœªê∏¢dJ3À
©ka±¥¬ôÒ™"Ó9ç∫>ı-¨xvÏ„…~T’ê¥ıû`HÈcØº≤ÉÖc\øÒmê5ÇïœeµV†ºÓ0îÀ
´Œœ.&ö¯gﬂ|ƒáw{˙©’ ˘»DPËõbvôä?ÌSˇ±©1∑ùÎÍ˚6ﬁC¯G∑º˚L˜Öò*X¢‡zç…≈91VB›ûﬂC⁄?›úÓÓ#ˆ7	g`≠\Z‡ª÷C‡≠∂œhÍ°Ó‚
ûcõËOì±πcu˜—¬0!æ£áû.Æˆ©_õ·ÿÁ.¶õƒH®2ìﬁ kﬁÖöEµ¥	Ó8Æâzã€«#÷›^Ñ‹~»ã£kmOICsãŸ|;hGVÈˆìùù›=I•, „¶“»µg‰Ç;ßfwjX;)ù›ùÈˆÆˆhõ»›ø…±eL≠ÏHnwåÈÚM⁄pë¿mqjM∑&O“˜6∑;>ÎVj—ÄõAã÷¶µôiqØ;Óéóo1Ln¯ÕnYOß”¥Ÿ›Òf◊x∫d≥œ6ÑÇËŸÜhk|&v™|&˜ß˝ÁƒG÷s *Î†—›jP%Ô†A÷n„˘QˇÙ˝YˇÑ¢ﬂFé˙√:=;û‡√¡ß>jRh‹?ıﬂÆGRôß®¨UX»çÁ$ú¶ˇ∏6xM‚i˙'Ø˙˝ìTLèê—»È°ooÑÓò£‡⁄-
⁄¶˙ÖÿÆwªr¬<√§7ÿ©•€˛Ò—≤1¥ÊëÅ“
¯$˘ôVQ~ıˆs=jükº% x¶ÍgA7§î:æÜ”•Å“ZQ3P0gç“,˜iÉ#S∫ùÒﬁ”na◊o<ß˜⁄M≤∂ñ®ù´S‡’F∂èÊp…⁄ß;{Vg\™ù\97KVnM∑ÒS™ú\/7˚KV˛tº3·åKzc‹È¥úÕbm~…wªÊˆ”M`£@ßò—@~˘c»D⁄íC0∂∫õ[çÊHçIÇ<LÎô @‡≥¿+>úc°|hLfÕ¶Ô]¶aW¸C:9œ?"K%RNr–àsÓ}õ,…‚'‡E6ˆ¯‡⁄r#pΩn—ç§˜¯o˚ó«˚çrÕ∏+ ll∏Ê∏§*èózxSù-m%k†”mçjƒ˘6ﬂÍæLu€¸ÀC›óâñöw†˚.—7ÛÔˆuﬂM5«|£ä3MY•åk$˜@5k-äq+|ãÍíÕ∆"GøŸë¢≥"π√w˜Á€mÂ¬A¬$	_z∂!zÎı!œn¡y‘é9vº1:@Æuâ^‡èÕèP≈ßuÅ¿ËΩV«ûßúç_]≥=Zƒ^∑?ôA(FxÖ”÷SnD’ç“˘`o¸pv‘û¯÷|ﬂè±&!˛ª	TJ^tl˜‚éºI4'7‰ıC«ÇøöÉoÖ∑⁄3ﬂö‚Wq”¬"få¶ÜÁíòŸ~é7Êüﬂ˛<¸ysˇÁ—œZZÙœ†›•˙3Á%¨?«ﬂ&ÁÖ€üÒq!˛ñ
n€WN¿ÂFBÚ†˘30ºæı´wë^‹˚JfÛºÒ˚Â/ø/„7ª	~=Û.≈¡eç¿ZÏ¬û’Oª¢ö¯GXAÈœLâKéu)±Cgéã>j…´µNàÇV¢8ÒˆÒ°l?=qÌì ˜S*˜ìsÕ~rŸèœ˚±nøü”√˜ÛJˆæX!Ê¸DïW.¡ü™)òÆi…TÃÑèl◊í:íz@}›N~n4©*ÿh4” ESEÀäÖcL¨ÊFc„|=n4Ø›™_•ö†∫\V¨ÿQ˛d?e?d?ˆe?éd?Ü‚;_Z†⁄ï≤Pw©lI%Y{≥&c•ˆ/∏≤fcø¡˜¨ìF…Ωxå9±Ò∑Ëı·Î◊‹HaÅn/~üêC)¯õ€XSÈ`ı‹¿ØÂıæÏ˝c+˘ªîÜÅ¸Å5Ç2}jN˚Ê‹v”ò¶ﬂ£∂A ¬R‹ªƒ›ª$⁄ﬁ¬¬+íwˇ<∆õœøE‚õy_—œ∑…‚É7G¿©Zxãh¿Sc,k‹…>c÷mÃ‹Èmz¿˜´Ìq0ôyû√<úËæ∞√Î»÷˛]"ÌGºTÉh¸÷2 ù©\+˛mFëÍH›ßñk;`—Ω√cr‹ËÖ=€oËV-∆∂ ˛÷©pŒSI≥∆À”¶ë
ú¶ÛøCÎX1.ËwÅç˙≤∫MÀÉÄW+˚ÖÙ∆"?2‹uÙ£Å9wdœ#_R©„ù{C¬©~!5JﬁvõÿC4…Ô§¢w˛Ñu7Î¬såﬂÎ,Î™9aˆ>ﬂ·ï
W∞ec\àƒ§t¨JÔÂvmà“∑‘YßüáôœÉÃÁ~ÊÛ>Û3Â5M_¨^≤¶ø?@~˚-q3äHë°§»ÄHäÙiëæ§»àUVJàΩÙä∑‘m)™ë≥Ê÷≤◊2£Á∂ÜÒñwèõs¸ (!Çøü1‡¬bz‹z¨€à‚˛‡˜“⁄uÃ∞≤!à˘^€Ã´-GR%±d\'âÌ'Owû]_8◊&ì©9›Ÿ◊73kP–5∑-Û)øπÈtw:›◊7Lk4gtw7;O∏ÕM≠Èﬁdk_ﬂñ≠—‹xØ;ÈrÕ∞å-˙,∂Û1ü†ÕÈÊ˛c`s´o'◊†+vß‡µjLw2£Æ∂™´ñÔ¶uçû‹ô}]gvÔœ»æ∆éÜæºœ®∫Ì‰DvÈ€°’væY<˛Q·V ﬁ+\˜J‘¬|ùj±–SRV\ó‘5ûYÁ‡ÊF=œ˙€k˝fÄ72kÕˇ‹v¡m>˚¡C∞)oÚ˚…„°uÓYË√‡Ò:
ÆÉ–ö∑";ÔXò∏‚uw¿/õ”ÓìM#ª|'BíSm∆x°€ﬁﬁœ˘Õue}¥gDQo≈Nëó∂	9c∫ùŒü˜eíÏß±Üﬁºá∂W¯ÑA	±t∞í"›M†Öu0˘VÍrHU∏5±'•n∑#rÅ¸p|±™?∑M|ÜU¥ÄM“¬ *•LŸ"á®º/#ôŸ‹~⁄È∞Óê¨5†@˜R€îÌ:eé¿∫k@ÿXM!|”iÔ(GîëÜOb%/À´¥1<]xßËd›⁄⁄ÓÓÏàﬂ‚u⁄+ªu>•ƒJZ‹›~≤˝4ˆ˛#K∑áaÕ±'ä6±Pj≈´¬ùÇu{´ˆÑt)…€Øp.t˝^∫Òƒhíæ◊.3ôè¢[,w- ëŒg4«ı]∑&ÜoòHì˙°˜\˙~Çè©ô1…=D3)1∏Ù}¿DgNÃï©jCì¿C∏!\^Í/Õ$îoòv0Aìà◊ë …Jÿ?MübÂD≈i@RÎW√)¨•M>S±.áﬁÇªN›Œÿ·.õ\ÂO:úU#·`ÆQ(i¨oï∑Ñ‚l™Q¶ôp∂ûˇ[◊g∑BÁ∂º,Ù€¯w±f∫WŸø=Õ⁄Õ˚=7úµ&3€1õ÷Øñª& '·FÈ‚ƒ4aÑµ§Í+3«ú¬%Rq†1A-ö°"a•ÕÕé÷kÑ<¸Z¨ﬁÏËΩñ›s9”fZœ'6@º"\Ã`†B’ñÜˇ2∑L€†
±4√a¢&¨´ÿ7•πCdZ¨ÿ∑ú¸™ ÌÕ§8hdµCÏøK¯€õÿ⁄˘˙úÒ'J‘ª∆Ûgˆ¸˛‰†ëæMçÊ∆U+œc(ÚEmPÊœÙ +%'ÎW´Í4IÜÉFFøÉ√WÓ¢»Ê!®
o˚§¶ÿx~ãç!ı5q»Z±k7F]“˚éNãP+µbÎ‘ß¬ññ„J'^U‚j5N/v·ë1_Ï£ó˝˛ﬂ	zÒN—õbK±‚%efÄ¶«¡‹ù≥U'ì∆	NHÎ≤ï≠õëœdVì/ŒÃ[PZ¡Ë≈‚†Å4ò?4Û∂W3I±¨!ïúŸNIåÖÎB5#™{-s–¶ñ∆åzC≠wO¶[fgøŒxï˙J-üÒ8fÇ V4ñq˝ﬂ“¸êoÔ{©Ò¥8Ç„©9ûZ+AfπM81tXÕ&ı≥ﬁÛ2{pqß¶ÖÁv%#»å—Ò¶¡´¿§z6ÄÉ˚@∞_óãñâ±ídÊıx ”Äï’`R=¿˛} 5≈–⁄3©Ö~˘d˜ Ò ÇrV3äIlGKè¢rWŒÈÃÈ—nâ≤î∫]	üÆ‡LV%ΩU˛ı'˙∫vä´≠Ú-RÌΩRV´
1z¸6∑…¡U?¨õÖÌ≠∫1~@7ã‚[qcÇXn‘∑Ú∂∏Q‹4∆o’mÒC∑3!K±%ëTıj†˜<íß÷∂µ[∫TLBÙ»—a’mZ”‹*]&≤65{π≤ºm*cAŒïd5YàÙUâ˘L˚Dï∏46»Á«¯tÉèﬁ≥»^◊›Ôƒû$Ecr„˘õ»èπóòÔI√≠∏≠&v7àØ¸&5á4•#Ò„{ÁπÅÂÄœüˆ.üÌ53{g/Sòâˆ©”6…hkªFÖNW“õ*Õ0À∫éôºÆ¡◊≠ôÊ~EìÕ öÈcíÒÎÒ:ÿi¡F˚ÿçÊxÂO7$¡˛∆Ò‹s¸'§π…¸én◊¥Ï4Uô'Ô"¯ |ÛÌMŒ´ÒˆŒ¯≈≥LÑ5«Ëà§DV6ñUÉâo/§pR±€qÏç'jÆ˚9˘ëõõk2ÛÒ≥yS‚Fq#∏Ö|πŒ «„FÛŒ%˘à‰yô!øÚÆ`Uﬁl|áŒ0)x¶c£›kœü≥tŸﬂm0[æÏ”≤l”≈Ã‘–Êf‚™ë'ªã…^å[[+ŒJm]Öæ!KMçi¶øÃÎf©˛‡ö—=B/â_<ı
Íè≥NAÕ∑Îh∏éÎ®øéFÚtÕ˜ô∞öq!âm YÌ0r¿Ûú·	¨3√∑i&viu4<‚¯€¥/,Km‰9÷]¬·àFJdrcKÎÚŸB	©πö$ƒÑ“∂tÍÊ∫ñ1¸%ÑFPŒ≈É∫	É+W«∆QrÆeàc¬ÀôîgÀı‹óYsp#çÄëﬂ/ªV 
ﬂmÔ†≈Uk-Æ…g,g∞µœ=íu5IÒÀæ{Ø *ã“¸¶±‰qŒQñ;„UÜ‹$Úœoº^‹6q∞aGié#\É±€º
dÉ•ÿò…–AexC>∏Èn›¢çÁl›ûæzçöÌÖ9ï/O:_6˜p—’œ∑Ö’9√1ÛyÔ3æƒ4«£îüÁ√ã`·˘à`=¢3,Ï|_9¡obæ_ˇ≤˙˘N7√BÔΩﬂ–\„=Ã·∆πs0MZ\ní•{á\«.Ó+Áæm"¯©†’Es≥ó˛π•PÀ®IBú»AN®5Úö.Î]ÖÜÃ1∆x≠4~*ˆùN]=ä›L£c¨Éÿ“˘"dI	∑›Ej,I Áó/»_'¬|UéU≠·§Y:∏iZßﬁ
˚π˜õV<∑¬6©^ë@;õdØ`X»◊â]P˛wr º*EπﬁS)∞ô’'Q–Û¢ê∏pªûk±Ø¿:Ä95Û”vpÖŸöFé#R	*∞Í∏
ÃËöø_÷Zé|°Ã«Ä◊c}ˆˆW∆Á>:åº1	—€8Õ4˙{Ze@“%B@ÜLõ√≥ëπï∏\q)ØÅL˝≈u ≠·è¥H⁄ûG`‚Ÿ¨ëxk’‡°jIøúµÄπhCÚ o“|0$ûòÊ}g¬Œ˜·¬∫∆Z~€6oc&ÃdåπUu±ﬁ‰^B-¯õÑÌ™à–Í‡öT>?€†Îk9ΩYÚì–ä:§ûÜ†á:5\,£tÌß|3ØÄÔ±∏%ã{Ï∂é=ñ#Ñ36⁄ƒ#û!;J,˜√-Ê=±\Ó‘îÀyH,ôÅSTï‡1CÈu0EÙ#ƒπEëC1:®‡ôá≠ÆîÊõ$Î-(ãFM™´Ì2∆íùŒ∆ˆá#‚ﬂª;ÃYSO-ÆH¸EÔó!≤÷®ä,ëÊpæEÕõ8=ÙÌüÎˆ†2s,"·XBﬁ`??8k0:jsFŒáÓ~πÉë^ó9 É§ﬂìå±& dÚ„É3°¢6{$n“˜ÀÑË∫åAhfLA?ﬂCÕ[ƒÙ◊g	JFmûàøÔó%(—uyhf,A>ﬁG¯^ ‰«ÁFbMvà›ÿÔóÕuπHf‹@>.ÀíüÑß"¨¢ˇj[óhDúø©Wâo-à‚Œ0Êæ<'…$÷ÒÊ®≈oÒ¿q\7$≥(s‘X•õ∆±ÖÙ€dFr¨°ÆE}
‰X°µüçåWFlô@ZJÜ@Ën!ói•‡:ä≈â~êÿNä
∑òE#Ó¬Ã2+úæπŒJÏO2QÏ≥¸J7úŸñcˆLSjP°wîõOµ-zvŸ¬B›pÌ9|„M∞p∑6kZúEBRdƒ¬\uá¡√J›@ãi
≥ 7'IÖ∫p‚/,∆Üﬁ(8B∆∆¨‰p¥∞‹	u{¬ΩârpØ“ òT”X!,(«;OGÅã‹âI±∑…ljk®'[Cz˛≈tl¡#`ÍÄPoQË©<ç3GÙ}jÍ•”~¶¡pÉÿu†”Ü[≈ÚπuHú’¡ÔÒJ¥ú/XQ€;;®∞≠dˆèTπ)x"-∆2'F%›åˆú0É3G7XJPïv∞î¯˝JTZ=“éçU-ƒJÉ®í)LkÓz´”Ù*IåO‹öÙÔõæ‰¯ßI‡‡æ	$∫Ω>}˝˚¶/µπiR8∫G
”#ì.q†•>»√ë3Q_4©•!n¶lOæ;Çü$Wﬂ8@nu$´¬Ë‚ö46\NóÌæpãg'pÀ¥£πF◊odÕr§#˙H¢:x˝ê;ªßπ»%`ß¶Í⁄5~2£SpΩªN—ãUbÅê;Ëƒè„†f(9Em∂w8´Ω|y®…õ$¿◊∫D) |‘‡^&¬ QÔ™Ù!Näsø}‡Ÿ6à%Ü"£πD#TÓÜÜC¿Í˙Qt¥'O  ˆ“£ò‚˜€3⁄õ›ùÏÑ-›ë¨˘ÉÃT∆.Z∫ .¨Æ+y(2ß{oøå>%WKwH|q_JØ]ñÓ—‡ÀËQ¨®/ﬂ°˛ó—°Ãm˙“]}]Jw¶Rè≤É7õù€™]§∞¯ÿÕÚ∑ìÒ‹V%ΩHÇ∆ˇEÃl˛H"ÍÛÓ“}›Õ,Îúb‡d¨ >∑
œt§∆˘`ÖD){”"⁄¿™Plr€V) [d@«⁄ÿÕ—"lm≈Œ∞™©S#§ˆ
”ˇΩ∆m≈◊ÆæÂWñZW¶∫.àãÖæÁû?g·0˙á„Õ…)∫»µ‰gÂlÎ¥¶MR·√vâS5Ω≤Ω$ÀtF˛MW˜ö?{∑†πèGQ"—>>Öiéá9Ïç÷±ScBµôâ0…\†Gs∏ €G?Fs«ò!W÷∂»§b5«ògC«ÈÌÕó=«pS…ô‰≠UNÚSÕIVõkM2ÿ¨ ≥Lå”Wœ2TìùÍãhaydO—<ÚmŸ˝¢.’ÀcÆoÁŒ¢˙?î∂Ø€µÊZÑ˝∂€_≠3k·˘·0èå1MQG|Zs;ò4–£GÖäö¢öŸ,xñyåﬂÜ$ˆ#	Ÿ«6˝ΩŸÑ9ZèG!$Ï⁄Ûàz¶êàæGèP˛õvË€sL”7òÚ«è◊ ’~á,*(&`Fóñˇ“ Ñ“œ«PM`?ÜWî•‡V72¸«¸¥∑1ÕGëëÓÍ‡@qU˚§ê·>Ê§CÖ+aÌØ≈FÃ©·ñò\‚îdo|√¥H‚;<Î0m‰ãR ¬¬∏∆"¯…gM^≤·bÌ”µL˚ô®|˚qÛ%Ø4?´!ä\_1˘Ÿ∂9p?ºR,M(e‰Å≠ê%)∆üö<æ'&ËÄD8∂mì7qPXáÊ€q`,ÊÒÁxΩåI-Ÿ∂€3#hé€…wkbö…Å	™ëp2HMôo±ç	è&^ï—|çiPf4Gﬂ£q€ò„ç%\G!˘IıßÜmr*œv&.Idb¯Ö∆⁄äZˇ‡.*¥ˇMıˆKll†7x€]†Ò5ªÄD 5\P÷8Ü<27Ë#ÅlÔ·Ö`∏Oı{	ÕıêÅ’fÅÖØhπonªÄ–û-Y¯›‚ˇ†õ€Ú–ïÜ(Œ-?∆*$3MÛsÄ†hõ¸!L.úÔ8ÌÙ'Qöana†_∞SÊ¨# ÑûAaô¬êJÎJKqq∆öõ…Ìm;”'»g⁄Â’&{ìQÔíÈ°Ï+öR§º´ÃO;_!Ω≤7ıÈ-è°DHgÑ´@ÃD4£xKJﬂ∂Çfû¢5zWH	['Nì¡'ß…
ZåÛCªMF3‡˝∂ò@Í¯µ0U4µÂ±Œ⁄DÖ«bàî œÔÕ5Ù‰7wÆ2/ﬁÆ≠µ¨÷5õF,“∫X€¡t|ÈÕÜo·Ñ|À›=∞|c[zeÖÜÌîΩ⁄rõ"'+ Ä¬ë’)ï2Aº™§9€˛≥ø`≥´d√Ä∫,ÿ,Ç•6¿\ùl˚Óv◊À5ôÏy≤FkluÂFô≈l‹˘rv–cÚãd¶DR ∆WÚ3ûË‡)xÒPÅÈF˛€&§∆˛∆xar÷PÃbp_ZZJŸπ+ÍŒ0#©ÅÎ}bC–ÿÎ∏Úog=°E^˝Ãï?ò|•Áfjh,ö≥&G\ÆÑ=µ≠ºÒPÿ
À5*`"’xXõrèÓ¢˘Ü{;ø+∆∫PòYN¡µ+ñÓ˘Öˆ§∆µW¥6 Ô∑j§ã3NwávëA3£\ŒgÎùrôˆBuë´ïÑù‰·Õ
hô®ò¯>eµ–√√„}4úºy◊ÈA:™y“xŒ^GÔè˙CÙ§V5Oã’<≠UÕ^±ö=ùj¥q(~Éf˘∫wyqá»8gú6æ ãªîdii"‹DÆ˝ﬂ"ãLç%è{¡G$¶v)ç¯Õâh0<J√•F∏5•)Sdà9‚æìS&ÎóÜáiøñ` ¡gùÅ°Úë◊∏´—ôÎ˚Å˚˝™ Q’PM¿SE˜ÈC$\éå<
‹ÃﬁåHõ‰çÅŸl§˘ñO*jQœeoﬂäX¿uõ¡{e±Z>ƒI@¨
æµ>sÃï
≠≤§†≥* 4of öitÓ?ˇÒÔˇ!‰09éÎΩÛòu|¢Ê<◊GÅÊ⁄ù“á'û‰“â∑KÀﬂ(\hü—KEÈy]^∏`»ì.[°dÂoÔk	&•…
LpF~£∞ùMW‡!·dù˝œ¸€ø÷ZÇJX7ÁV»≠"í≤Ò@√LRKSª, “‹Oø:˚œË˝®ÑF˝7É∑˝t‘ú¥‡…Ê]S3rJ|¡kê¡@Ó)|NŒÆ-HIv"ñô®A25$ÍI=ÍYxo>dÑzË‰<h4ÒÍàÿ»4\Ö∆πçBZ√””8)÷4‹ëVåÛ˚‚Î≥√˛—`HrmøËˇµ÷øO¶Œ –Ès5Ïúø)û>≥«n&‹D¶1£<Ï˘®Y\≥úÀÆºÛ¿FQÌ»^r›˛p„ZDŒΩ)˝æ∆Ë√…õ7˝wXÿo@ˆ˘~,˚Ôqqh9íÊVUSkcà
#p@º IëÊc„ö¯"íe2∂úhéóâπ∞~‰^âwÜıÜ*◊pHêrâ∫ænı•‚?≠˙Èå‹¿`=ö§ldÛxdÿnÀ¡ˇ†\§-◊õ¿*’:(2T¨vòy∆4ﬂéü~Ån†Î‹6B¸”˛àuˆﬁ
h¢EIk>’«ñπg\Õÿ"<ô,˙Ä6îå–°E;õ6‹eƒ8Äˆ)+‘¨/èÚ¬n4IBK“¿Rµ˙T≥‹Ï´´0UoÜ†Ã¨®ÔßæwÓ[AÄ˛|èyãuÄTi o
¶}T∂òç∞+çÊ9Cºﬂ‹Ïﬁ"”∂Ea„˘5ecF∞'Z!/»>ú¿ë≈í—Id;Íb∏^∂+K∫¬z†à¶AìCt—ß8‰r¨Q)ﬁÖ∆CË”Î¸Jn∏Àà;∫®U⁄∏€¿t	Ñn_`ÑÏE*4>>ƒ›m…÷J±5EX	}êJT‚EyãÖ-£3uΩU‡Lf»]æ[D¸ez%“©4˚ö|¶?Ãw±∫2ü}¨éˆïÙ2„µ˘¿},≤ßfOJá¢≈ﬁ√p≈XÂL¥y¢]%¬°+ÿŸÉ+ÖUe…>l<'·Ìüı◊6”\ù@·5˘ïØ‚™T¨à^‚‡GoG‡‰«<q±¢S¡®˛á9¯Ω2¶Xj±·J¥a\Qú≤ôwîY¶‚¯g“NP®’ƒÆå∆V`˘ê“2◊√πé˙
gÑ±Yzéu`<\Ù?_œ}øÅsü6(ÁÍ 9πtd¬Èœõ≠Ä∂ÚﬂêØ_Ÿd¨§B∞éb+‡oÌ¿WæNˇ]ú˘RÍ¯∏g\@h8C<'bíb|ë«>Œ¨‹˝…·—=w[°ßZ∆’Juıœ¢õ≠¯Aƒl»≈≠2,_‹ﬂˆüp’†M⁄Å~ãwq‡‰{kÎÿ,9`ÆO⁄hyÀı'F^ØÀÂ{∂äÁ
ÈCVŒxçı◊Mé$≤Ä∆≈D®ì°Ëq¡y9	‡PÖ7ï¶W"ã{ßï·åˇ¸ˇ›å+àÓôITˇÕg|>Ï“|¢ùˆf¢ˆœK˜~Ÿ0MÍ€NXﬁUÚ9ÚJ7Í¢ly∏sX|frﬂ¿‚¯ÿ8ç€œZÆ¥È#¢˙Ë√IHHxqxÙ·—øu¨»ÿVúç
“NÂ∑[£“;0√‘≤§¶4àwk^J‚ Ôøáx•´∫ò⁄|æÕêÀbT©ÎG#Ô À• !¨Ω ÛÉR◊I†Í∞¸ˆÕB⁄?0Ñ≤ÔÕ=BmÁ^Oä‰œ˝ƒ„‡Ë˝ã˛z˜a0Íü®yv¯Úpp:BÔˇrxv‘ˇÎ:}˙·4câ<oÀ^ƒ¯P'i©§ÿWxµ›¿
[ÙwÇàñqÅ–Ï1ﬁyLﬂ[ÄÆüò§d9~ä6*°5,ﬁ˙6’Å≥Pd—⁄o‘EÎi¨9,ı5«L∂É Ò·Éƒ˛z˛‹YÓw^⁄ÄnSéˇÂÍQâ”r´õ∑ÈfLxÆ◊"a93ä0xçuCë4N‰j/w±/∏÷ì¬!Ñ?ËP4xávM√7y+?+“» w©´v÷Ô:Ô`ù’æÆÿﬂ∆öiû*		L•°Lí©Ωî ;ìœ1pÌVí;â+y·DÑ%g°≥Â5Û
%5ﬂE¯Ë9áN_Ω.J-ë£ˆ]N\àŸvn88o1_‚¥ç(mXnz∏{Ôå¿ˆı&çgÇ—ëLˇƒÛ-Dó¯¬8∑ãSB$&Ô§∑lqÂI°}€<H"û» '!OÖÇôÈ,uW57ú=L2[Ã$M•$\•Üœ8¿àåâb!LG™≈»âÂ„üÏŒÁü–úöØcŒ ü,cD%rz–ìı`7ÀÊ©Uõ«~]Æ#ÍnNtpT”›•∏„Á˛.Ú•Œ*ü®1€çﬁûcE ﬁ˛Ò÷ˇ˛√≥W©∞˙‰_ ›ﬂ+#ìõÄÃÿÛT Z2°ÒgÎîê√“9„Ô—3æÿ8vLfûÁ¿4cá◊?¥Ô‹ÀÎ@˙Ïπ¯ä&'ÖIÖZ¡NóXOô·ˇ{H	èæÇÉL0√sÅµ≠sﬂ∏@ÛG≈Nx–8Ç·óÛ≠©Â˚ñÍ·„˙†Åïè¯+—K8Mò&gπà©ƒNQ∏´¡B_Û
±dã°^ƒîYÁ≈#ìÆsqâ'¿Ú	Ëàç·Ò):Ó?Óü^£ìË¥Ú™ﬂ?ö ~≈‚)~,°ﬂıà§ˇiëQ™í∑‘ô œË˚Ú∏Ì∆\Tû‡Dh⁄¶7ù«Ü·€StbÃLºº"}påπq˝“ﬁ)é Ωï≠?ãÜiø@ò»S#à¸»p◊—è∆•ÅFˆ<ÚkuCr‰äñÕïÀñÕ˚.gdËJ∫à/ªπ7õ>˜é†)t˜˚QpÍÔ–ãÔFŸ )ºèË;)CqúRa@:êâ†§™î¬s·Ãöˆ–ü?mì\~µmDÖ—lv÷Q∑≥÷Ω0tCWß,VPÎùD[L;XsõÃY∂ÛøàãozaXú*@Ô^ÑÒ⁄J5¨¬UCÂx£ÃÌ¿Ë‹i£pˇ›´=√5®;ã”
gHv~^CìÈÛ‚≥ÿ˚rËxÄ{?∫)´e-1(B—ºQq]+üúi\c≈ﬁçÊñoO*x*
g¯ù`Ê˘°÷◊ûØ*ç‹™†JzÇ±-›|(õ ÙÚÉYg8Îhç!’Trƒ£.ÁG¯%º“§K  ÒÓe‚Q4	0∂∞$A*Q.Ö%÷—=Æ§ﬂ˛‰]	ÏâóâoOØÇÎí™˛Ëc˝«bº∫—¿rX™˚–∫ÄQM≠´x{Æ‘∫V¬U°
Tòx<·7$ı≤x4ég_Uä7"¯‹]qDf^îo∂L˚‹VusnªQhiøŒV]ãÏ§,j¿dPﬂL•¢ìµß,∆ïLßô–.˝≥úÓ≤•ß‰càÃW,JÒAHfˇ)ÏZ97∆’ZzV0'Éa≠APƒ	AúR˘·∆Ä¢™jå¬sÊW)Ëı∞¨’˘≤¿5	Â©Ω"ô#_7ø,ó47i=◊ÍUjñc:Ÿ€QzI“99µ√%°Ï0L:≥8å∆ƒ±®Æ}UÛÙ&ˆ¢º`ñâ„™pY_2‹Îud«…`îÓ≠©C´]ˆf-…mX'π£pÍıí9fÎ+≈ˆ2'pÌ}|E*6;k8Á%>h4yB]˜≥ï§úã]õM+ò»Ï¯IÖ–¶≤á%s/ª˚»Î∞Ö;ÛåTm!2⁄˜¢¿πZ·¿u-ˇÌË¯Ë‡Ê˝¸Û,ú;=îˆKÇÃHab=˙(|Ô§C, Ê¡d—Ö"øU)<qÕıÆ †ûgZÎÍ˘ ÇBà|9 x5%ÁzÅ√oXËg9LΩL	=—9õ(œÙTGı"FH∆døØ…,Ç4W„ä&O–«*!w5ëCbÓQÁz‘<Ì^©Ï+ˆïå™≤o#cëXIuähÜ~0≠Öÿí[–Ù˘5N-˜öb‹Ëº–#/>‹πk¨ı¸<$C[sw®Óàª^hzÛç8'ÅùÃ¥∆Ë©([ñªeVy ˛í˙”ŸBií·y]M´∂ï§‚5?E÷3\ì¡≠U8ãÒS&ec_K–êÈqieû4Æ:Ö6êûyUˆHIàËŒ´õb1ëÚ©˙	çÆ	+'vÚ/@&ﬁ|KN¬»Ú«6‰ÆÓâ»çÌöûk∂·˙_{˛Y¥∞çô‡2ÑhFéwÙΩ∞\”òaÜ@wÍ°Ê	^Ëˆπã˜cﬂBP|Ms†‹õYwä¨SL €ƒ6>"@ô÷+ı‰⁄-Ì!;03qø7à∞Æ˝è¡ÜÜ~‰Np’çÁMôŸØ‡»≤Ωvª∂Ñµkï£ëL˝Fﬂú€
]æ“pù–Bﬂﬂ7<˘‡ó¥€®9ıú±ÿ2œ.r‚ÀXˆf⁄Œ’NGÀ›gè∫˚l*èsﬂ}˜ûé˚Ë]8x_˚üSéàﬂQ1¯6ûŸ¨ÁjáÛÏ‚üÑböxïè©kÂt
Å#ªÅ@L˜kæ∫ó#pg={•„3.r&”ÙÅ~¬SÅEˇΩ0Ãsy.
gb1)Xûñ3¥õfQŒN—èq«G”ßfM§Pj;Ñpﬂ”LOè¢ó'[2X∆ØòI€Ç-€xM&VH=}#≠FÚ¢∫˘â7_8¸⁄⁄öÿÓV8∆œX°ﬁ€66¯˝ë-≈DD≈UÒãkÚÖè54ÙHTçmæ™ëF—w6∫;π ≈≈UkóÜO±à®ñı+$ËÕ™êœó(Ú|YO"S2Ù|°≥RßË‰öß∏¬’—]8G%A˝í2õåÜ£∫~r‹~x7<c	‘⁄±2(êí±î¬î›«-º”˘‡ª/4Cï"gôûú™Ã˘∞òBSˆ4$Ê» NÍ	›öûÍ$‘k∆Çª‡æ=‚ì˛Œ[†a‰˜‚í^‰,$Z1h¶W}<‡Âô4#'™¯øà"»>‚Ì.5 $A‰ƒmΩÊ±_√8'ıJáGËô.]÷%∑uyiüv“õïªÇàÌüóÛ∂?¡9o´öÛ{Ö˜kƒ”ëfe"ûÍqu‰÷h∑ÉE
˛ß ì§Ö:Â{E#/VCﬁ¿#±$ XRﬂH˙@Í‚z“]ÇpΩ<ûb%¯‚ïEŸ≤5ÚÌjß"ÙÎUπ√™:Ã—w¨ o©±·ÌX‘¿@78À¥£πX*/o2ÒÒ˚XÀÜxòı÷K/ËwÅç˙çÎB=«Ci(†j
xÅÇÎhı©D#ÀYHéBZ3`6°fgk{kÌnu7∑∂óörù±ÇıvùäÍÒëÑÄ∫{Ö$Nû;›,–Êº]dWÓŒ°p.ﬂ9¯∫®2„Å¶
zBNAôRi≠´∂VU\ıU◊ªì5Œ¿ßXÚ„’πª:øÇÙ gﬁe}œ VÜ∑¥.â∂‚”PÇâW¥^Ø)Ó\>v7;ã´üªõœ‘/ÇT¥¯óŒéTø˙…plD.V6dy-*^3à∞Åœk˚oÎáT<†;˜ÃÏ…`¯∞ìS71…√9ú?¿,1Ïˆ/i%ÊÍ§Sc¶§¯ƒw‡TOùvÄU∞t¿À±∏Ø∆Oæ∏§ÉEìÖå(òÿS§Mπˇ˚++∏Ì>ÌÄ«|∆D«yû˙êPüÑUÜl‰ëüP÷∏©^ˇÀª‰/·î_◊-Ò@÷äs€Wî™ÓnÑıcæ[ÁZ≥û¸°tÒìN∏ûÅà’T«‡LÄ—¥x3±jR41ùıúÒ9Ó¯<Q÷ RFc“hEÏíØÒ2‚∏ÌÉÅ@/ÇW=§œ5=FuÄ¨k®)
Xz2ΩÉàëıNGŸ¡çcƒéªrèËÍéçTàÀOÔ+¥!/°·Ò]Y“ÃÑê…7ïFX¸d¸bè„8ã’
§Uàù~‚!±ñÌôˆ≈J5‰°±ŸÛÿ
=”“0|J´\◊s»…bÖ3œ¸!o–sG®Ò≤?|ã6–qˇ‰CˇËËØËdtxv¯JÉ.]y®àåZ>æ‰WÜ4fÂ∑π(Jã=M9˛ï{ãèNÍ§cŒ„à‹Ω≥"ñÕ∫∞\∏dãA~õ∫ (§BéÈAÓ4√÷{=ïî{[{øHï^D–*bÇÚQAñ„`u®Bpê:<heÀkâ∞Ÿ•¥l’=á2ä®bëbúbò˙ÉÖê\≥_ÍDSÀˆ°%XkO#R*ÀpÏ5öñØLÓ9F≥ÚπÔ<#ÃX(N!,0>•>(Ë·Hw,Zåê¬ïçŒÂ¢¯ÊnÖë?Ú¶VdµSÏ?	pÍ¬—¬?êL”a`Y≤πY‚Jﬁ*Ü∂r<˜\RL’JÙT´)—“]∂•‡,¨ÏBº v)∏Öõ˝ªäu;ëE˚¿å]êË,UŸÕ9wwŸ;Q˘ ÀıÙÓkª±æRc	È™ö˘;_˛¿5Òekk3"úC±óc´TâI€]¬ﬁâïüo7≤\≥»!‘'»ë§€ZZ;≥(U∆Ù+ÖÁîöd&•j±ZØ ˝ ÿ…*™¨!µE¯!ò=}æ‚/Kü „˘[Ç_˛∫V~≠,?ƒ	ZwîÎï‹∑∂Rﬂ|≠x—	#´^# ¸Ü∆|Å„ö®^>ÇÖªëƒá∆¨'“ƒIù5#ã·Y6LóSG≈cxjGØ™ÀDÛﬁØqOÌ®cΩ±–å<ÜG}¸qì,U¢Cß|î¿˙ı≈‰UÜw; $™ÚÂL‹¨b‹áSDºJ»[BËàtM*AïÓ˙|á˝rS*[-ÒµÖfä¢¢RxìÖizs|»ãÁ
RŒ úÂ‹#ÁèB` ô¢π}’;∏ı÷<rB{·\´(®ÈˆØÄ`‰˚\«ë©d∞!Û$¶ôÄ˛MÂ]Õ~¶≠i‚u±∞4¥.<«ò-3Òõl‚?Óíy¶≥ˇÒIÚ«%∏1mrY`ì«»[‹ß÷”ù„—O*C˜oV—ƒ∂I¯bµ¶πYµÁÖ⁄I.Àÿ8º∞îyò§Y%vx¡ÿºà.B-“ªÌ¿ò!Ô˛ÿ·ÓŒ√ånÑvÄ<«öI ∞*+Åm∞Í€s~∏¡Öÿ3dÑFÄµ67o/H†û§∂xtÀ_ól
	syxè=”pPü˘!¡¢yAΩ^ÔƒàÃ{‰≥Ô]2üc©Ûï¬∞Á˝.'ÔñŸø0˘¿‹B:;a\Ó6˜V$IR|fsõA†ië&Ó:Ê<O‹á1πóœ!*º69tàÚ^´2_ór_ÛâópµsŸ&„›\€ÁñI≥f3Ω∞È‚
{Óô5ı≠`∆ØçÎjô®≈Ukã·¡CRÜÛúe7…dù˘ÚI|@ßÛûMœÕòB¿
52•g	∑Éy1≈w>≠wyÏπ¢ëå—5ˇn‹t7oÒ&EØîR^˚Á?˛˝?˛ﬂˇ˝üú%ŒOäæBˆL≤∆t%ì≈œJûŒZrøZÄÒ÷ú∂B2ı¸úËM¬,kÌ—Â»€“WÖ/r¶˙ÅÁ<zˇ¢Ñé˙ßÔ!ÔeÛÏ°˜9<;Íˇuùæ?˝pöëª7æµ¸x6ÚäeIºÿêO€vÒ$∂:XÔP∏xº˜:;¯–Ñ%Lˆ´Œ∆6.ÇóÅÈ„≥ÿÿâ|"7'*¥¿rõ+ù9∑ÈtIf·üD¬÷AàjÌ¢πŸ[¥û2’r˚*…tŒK/û‰FgZÈ^Á◊YÒ6ünràŒs #KN6@`O«∏^bÀ„ov$ã=î„ƒÇs£1Ûô‘[BˇÓ˙ê$
(ıéâw˚‹£	§8ÎÎ‘«≥·˛bDL∞p¨‚¨8ærY‡ybp≠‹fá‚Æ4Û£ß¸ﬂ%ŸÌ¡{[·Â±)F≠ ]xT≤û¸≈=.4©}≥ÅkÇæ)N;}Ûã‚Õ8ì
ÎVrEû…M&Y*J—∑b{≤ü#ë¶b2%GÆP*≤åÙ$]˛W“ªë*$0c€J!XVP√Ìg˛äNRˇ¸«ø˝+V°_ÇêhC&øﬁsLf÷‰ÚÓ|·‹ë“˘˚aèˇ¸ﬂˇkiX∆ëé—@Ç l"8Õïfì[Nræ Q‚OÄwÚwy∞»!‘
„ˆLª‚U·É#„Ck˜ô≠ı˜®‹è¢0Z¨@π/)è/=+≤d¯(ﬁöÓØFÄGï™ïD”◊˙ô≈πB(ÆU±©ÉYÔöûˇ>«ıùkõxR‡P”bî«áßäge!qr›ÕNI—0…WJã˙w&äµà&ê:F®„®}xêﬂOßˆƒ∆Í8≥ƒ3 –J†,πÜ√Íê†¨ H0Öµı¢±cÂ«A%4Éπ¢F™î‹‘√≠á™áZŸ/∞¬ﬂ'ZhUŒΩT¢0¬∫ﬁ”Òπ^Ü §b l‡ï=3€π 9•¥‹´TijWë~∂BÚŸ
©g≈é!À\KøÖo	1FuD√ñ&‚Ë∂“ÀxY‰—∏£äÀ…:ò£y9∏„«ˇ@‰»û¶¬ê”Ç≠uq(º4s„ Bƒ†8ÛUÉåﬁõì‚∂F_4’+"ç.Å3∫î—ö√SåZ) å&±+ Ä…ª¿’Lk^[Tç,∫Í¡√π≤0™bå™
÷ï öÆ∞tıò⁄⁄äX§LiÕ≠E
Qzw{ãùÙÅvóï†íÍ†YW¿#’Q{Ô`y*•ﬂÍµÂ’ËÀï4ÊJ:Û2Ó‘u‰âÿ~…=ﬂCfs¿≈@XÆ√Oçsæª•Ãhû‰âód>õm
ï©íK¨uÄYƒwl·πùwQ5√
Ç·í[™œÏ‚Ω3Ùñ|œ"ÌñfÂ≈ó`‚ö5MÓ?§$íãk4†ƒ&ÌH&üÚga}=A}˘z>T‹˚0∆%A“©Àè¬#J∏}E	¥AÂëW∏é+;ú ßp[~∂1€‰r.'Á¨I#1ë‰î√ZL+ÍÊ)H≤í(h:®Ñô{Ë€T&N"ºˇπ!|~m;x±*bVä)Öxìb4	H∑/ûœ?ZÓ/`òßÙbπDÿz/´7æa≤Ó–z¡◊U√√„}4úºy◊°wáG˝!z≤éûÆcÊ€k¿z†ﬂ≈%∏U‚°ˇ∑NêS≥mø6∑MÍœ¥ƒ}ë∂02fëã˙ø∂§?d˙+iI˚o?ú†˛è}ºÕìÊF}Óª∏© Û£≥ºì/ÔUœß^…t≈•ÎÕÁÌ:£©Xäë<∆ØØzuJFJ÷Ω¬õ¢ë„Êâ9,”îd‰∆O÷Vé!s£-»¨\±tU1‹î9pBåTà∞†É<ì#UtÄ∆∂„Ì)—ë¨9ÜZÖ;˙∏%a≥ÄQYôs+¸i"≥ƒ/≠ëFJ_◊¯ù≤q†—VÒ8Ñ e’pÑ“·˘±XíﬁÜi|g•A…ºWu\$C“ÇcyM‡©»dF@õb¿îDô"Û∆¥S#ò)Çÿæ)æ(-](L¥éÀKÆmª'¬:}≥d.∫únes√çß!D2ÖU¥}Àå&V≥iL&ÎhB6˛àæGõ≥é:zS˘ﬁÖ CÕ•4ú±8Å 9YMmÑµVUŸCœp¨At≥úmäY¶≤ÖTº˚¢oÓë·/Mˆ•ŒLﬂ∏Ñâ∏c ÒQùıëwÅ7ÓAky9˙=g™d€ìkÖ∏çÚƒ¥xc+Ë—∆:∂M≤Ò°·¬"./g9ƒÓH®õ≥˜p˜™I*<8"B_ú≤¶k¬i†{÷PSla≥Õn‘6≈v≤–û[ΩD_ócàDRaÚá∏<dó?˜|8”OO%Ü:ñ–´±ﬂﬁåº0Çè$¯≥¯≈‹Pˆäc+~è‹R”~∞è‚≤t≈@Q∂vÑ%Ò™ê‹c…X„Ö‹c F@ŸLåA&_§	wRÅRS¥î84\1áÜ:jph®Éía“∞"ì&êüú&¯¢òπX™∆˚Ü+3l®œ∞°>√J ƒÉ6¨äi·åä9NË/‡lvájZ•cõﬁ¡≠˙—M›¶∂.Y}©¨±›Õ÷ÚÕùÏ-âUYg›é)˘ÔpK°∂ÆU-œl¬•ÿv±›ng4¢uî˝õ á‹w∞ƒ?µœÖ&cQ.KåÊFxf≠ç◊‹$6◊∞Æó¸8.˛X˚‡kÑqﬂÑ˝NîÈ öØﬂ Í>Õ±Æõ… ¢T©1Õq£Ø7‚VõsäˆﬁC›Qb’¬´mäöﬂ–÷êoÖëÔfôüØe'ÛjÑìÙìäÚgs#—ãˇ÷l~¸Øküæ_˚€⁄Ü-∞'Q
»õkí]F)˜±˚)d/™YtMKZîKπ¿5XQS‘ûÙO—õ˛Ëß˛_Ö√%¢$Æ‰˝…—‡‰ùæ‘p´∑˚ë>Ω¿ÍÃÖÈ]∫ZHNs	ä∫K€1c+qIïj“˘˛7˚ëV˜I6»ôb∏ŸõD∆u	î}Ç±·ø,ÙL•lô°Ô≤´NTaˆ≈I¸^WTöÕ-~I0ßÎËÊDÎô5¡¬˝]¨Îô^“,b˚qWÈüËˆπH$∞ErQÌEπ]!)&ı5h£˘‹ØÒŸWåŒoæ FºÖúÛ^˙Á≥ ‹ÃÚ&∂vv–ÇÑ‹√^í®Ï˙…á¯Ù´HóJü4ﬂ±wlõXOﬁ∫NÜ(1ÖÈΩ∂ˆî”r\Â¨3¬,WKíØŒ< Âg∆&N˜g·—Í5Æˆ‘ÒñÇ®1˘ÀüYJÁ◊©ï=≈˙>´9ÎÈ◊ôï=Ôà≥6JrŒ‹ÁÃ˙^†/Äß4±‘^˝GúY\Fˆ°…kì# ˝ÀcFk••õ;W>–ÀÒrcÁ|PòÿéMcÜ!ûc8T“©:óâë∏†Nxb.CLÍéZ#º2~û+D}«ÜÕ·˛Á+˘Ù"ã•ÅjRè}I≤¥æﬁchÚ+∫∆◊d´1”‚îMdb` µÕ\∂’Lx™ôI z¯?#jÒ´UÒõttf€ Md/KïûQÊc∆Ø„&?›6:≥Ò™füœÿµïû,ﬂ4¶!˛KwzìΩFl;ñ{∑]I˛1Ã˙≥çŸ∂t<B‚k%$&ÿ%¥M,Òcëïà!hL%üÖ>7ô@$Ñ√vßSà⁄„C0%a:	®√Y^\u†æàÑìV∂Ωçπ∫›çpˆ0‘Ì‡“@Ëd0¸Ç©$~é_0}4.^‘_0ç4ÈË√ò&–¢ıƒõ€.f∞±∏åØêOÍY8ˆÃkUc<YMÆ˜:Ixâ‘ûg°©Q
Lª¯ºo∏7ª:9)ÀIÍc»¬ÎiØ<≥Â¨};bî®Ï£”Q¨”€¶qÅ”@À%0¿Ã‰≤ÄÔBPaª6Ì∑¯‡âVnC:£ó∂Â¸≤7§:…Fò3.¯h–ÀMæuMùT)5Ÿ;ÙÊâÂ≥©˜®÷mi¶ß"xˆQXßÛfr≠r]X◊7p_¨«æyÃô$R¬ôÂ=V%Î≤íT,ËÊ∫ZJ¸‹åıÚ~eüjyç≤è⁄›ã˜,ÊY~*~ñüJ°†ÂG#SU˙‡VZZ©Ä·
¶ˇ  ˇˇÏ}[s‹Hñﬁ˚¸äÏrOoqöUºâíö#©Éî‘j∂DäÕ¢¶=—ÓËŒ™YP° ,.Mqπ‹∞é€nƒŒ⁄û«8ˆ…aø9Ïˇû˘ûü‡s2@»L$äE™§euÑ∫ày;Á‰π}GuÔ<õÃR_ë?ó±ål¡éâcwB√4Ó\YRzﬁåÀ„ûzz¨¸⁄(onFZÃ;w≤!∞ˆ≥Aºˇ1X ˆ´>E∞d+πC—⁄lÊ‚áÂúë+±√TbsÕKúhú…ÇÅÊ3Œ3hõì~,Œçå†—ÊŸxá[–∫q=€S*˚ ∆Ù$ÔVV£çÈ—∆4µΩ8”‘fü§¥Ê•ìRÙ1‰Œ.ah≤JI°√wV©;´‘ùUjŸ˙˜çÉ/NÂK‹Õß4Åˇ¸µg‹ôß‘≠,Ã<Ug⁄wÊ)ÂgÛî„¡fN-öêdV≠}6-yIÈ:Ô’¶eï∏#çÙ}€¥í;õñÊs9èy *œ´˙YúeÍV©kX§LPeÂœùu©6 ;ÎRÛ™^Ge…>ó™˙VÊÍŒ_˛Ùß&ÉÁ'º‰◊˛·JõÁw˘˙ﬂ‰d˜xˇ%>ˇ˙Õ… RL±8òÃi«ì≥IolÀXwßT%Á˙v0Ú©r€‡f®≈0ÂekÚÿJËS˝”Œ‹ñ‹ô€nﬁ‹V√]‡ OQ%‰c2¿mıƒ‚ÀIß1F$g˛ÌÆszQÃFÉ)Nü
∂Pªú·'f*ù z◊hB}ﬂÒ»0OU√Ú~Êr‡µ•√Ú °∂hŒñ6*°‹A…ÁL´îcT‘éñ™ÏÃó‹yr “ËŸsÚÏ˘…Ó˛´õ‚À◊Rπßˇ∏´…È[i´ê◊∫»eJÁI°ï&Ÿ∫€t“F„ U+r√Pòf¯Ωÿ´Xﬁ'â‡È·Õ *SîDW àV+Åô7±C0/œû 7gj‚Ë0i¸	¨
Œ`ÈzWÔöœô6Û3nn»»îõÿÈù]—”v'˘oËÏÜÃ¢íÅ˚Üﬁ¿îãõjõc)∏7÷ıƒâòKÍÜ^ö]ﬂvCÕÛHÀõ∑T3ÙÚYôõŒ#K`r~¯òús·^?≤~w∞CC#`Å¸π1ã2É¯∞å ¨ÀwveıáœÇ¡¥≤>Õ,ôøÌ.Z“Ís-)5sgœ^Êµ≤2*ŒÄ√ñ`≠˚.PÃñ†Îã·ﬂ(mâvV%xı¥^ZÜ!/<êUÇg∫3Æko±2Æ∑˛Q9º´ïÆ≤’Eb,
/†
3,8?øóèÚy6∂ 0cqNÃ*e@ÊÍ3¿?∫±êRü}Fƒ◊>+BÁ&ìÆ‚˘ÌV(ıÄ’—êz†Æ»=»:Ä77`èï∆cêﬂÆ%[·–äÜ¢yFYÔû≥êF8£]*âıŒJﬂct*~ÔÂWYÒ/Pƒú1bûâ˙C;†∞¶Œ*âVó˛g7πÿ!5ﬁ˘W–7§\©'ü†Ì «3îjBkc¥ZøÒ¢ÊÌWfÄFÿıòMs{“cÚΩ¶ùoRœÖYÈÏû•∞πc¸:pB`{C'¬?^Oì@|=~Œ/?sbÒ]€0ÇMD¨ÌØúaî}?Ä°%ÏÖa‰zÏä√~¯&ı]µ˜Éy®
ÓÄ[~#-”,W‹em⁄º≥b‡kYd≈±WhÍåö$]ﬁàã€5ñoj(µ
Úzwƒ7sG¯¯ÎSÎ™DœE√zH]3W¡§;‰â{ÚTÂhÒ5§‚Ü÷‹¯ ŒÕˇœê\ƒÊ´g~>ıï˝iX∫JGy#¨ _˜ﬁ#`¨‰ﬁ>kwóÌÆÓpUZ…ïy'ê°Ï`Æ0óBÁÒıJ¶æÎøu(Å∑6£ÔÆ_ßèoÿ¥Ω‰”¥T˝Gâ∂Ë…ˆÑ∞Ò>!&\ò/±¿”§œ‹∏›.®xn≠‹Œ
˘ŸX_7±v»∫ÜyÂ¢Ÿ¥Ï+‹©CrÚ≠πìA}É ;ß∞˝¯◊lØ¬WX∂/ŸXÕ∏Ûk_Ã‡¿õ°Òí´'e™E--å˛i=ß£I∑€dÔ‰É dá≥Ü‹ìì|·â}å¿fÜ3+ä”°	ñU‹¢‡,ˆßbéøüqD◊ÚƒÆÊì’˘Û◊—cª‚Áä8ËTıÆà•πFgDRwˆÏ:c~c∆_9ÔÇW⁄s6≥Ü¡0u≥võ∆myæÅ•±˜∆n9z„{ï6¿ÔõﬂkZÌoΩ5ÙîQµıÏËz°=6ÊGQ}˜ƒ∂0Ä∑£®`\‡)á.qKLΩ;OH‹V?_4ÒÑEMœTEm√ù%ÅgË˘»0≈bjÏ[ûÌoiŸ\{∏¡C∫ˆ+˜◊9ﬂ!|*»”Ïy"éÎøZ3Yö<æ◊é!yÿﬂf!rI#§m0…áì<`∂2b)‹˜j(kÿ÷±-õ•3 &o¢ıa$∞ùøGMW(∫B…Í≠PmÖVÀTQ¨{√‘V°±
}µ¨≠v~‡ ÂÃ2v,ÛàŒÆ,«IdÁ˛yoªÛûµıäïu“~“ÂŒ∞H}€∆¬¥ë&9q¢$≈∏Å©e‡äÖ˝‘*¶ƒ6™ùc≤ÇÔãÀ\b ¢†êv´UÅπ™R∂Æ¨w2∂∑äÛ€’ÆtKu›2oÎ^…xXﬁOﬂçØZX«[æô[˝ãó¡S7¯∂¬œêøë=ﬁ‚ïúU]œ(7ß˘≠ƒ—l}˙¬pÜ∂õ“˘ıK°Ÿü‡ßU 
~pm⁄0”ı23ïváı+ë“ìrı≠z¨s5Ñø	.FîøîLÑkÎ<*Ω9≥hﬂ=ÙRGÒ‚å˛ıÌ]ßíôL›ñÚÚ@9ÙﬂœÛ‚nˆf…“Ò∑$ª»t£}o*4Í„â÷Î<ÈµÓIﬂ•U–ï}ÆdFT€‰Öt^£À\j]≠]VƒñeˇoÇÂÍ˝Ω≈@≥Ï´yÜùC°ódÚı<¡∂aÁn>·Y∏p-ú∏Ï&ï~Y¬;GsKN|ë»Ô~9ÿÖÑIo£YÈ“‹Á™ëïmïÒ"öE62Îûa€<∂Ì94qÚ{Œ∞›Û¿YLBÎó˜‡—√¿ÔÌN˜îΩõŸSrBœ‹	û≈- 4UX”ˇ⁄I[Q˝	ı«4ì¨d”	”⁄Õäˇb≤ClÙ˙è4E§ïRﬂæe‘Î_9˛Ê∂–Ô[øàáÌ¡ßoit#Ô–h¥§Àp≥Wn·ùGQp91˘ÂæK(“å€êÆc79∏LsÁj;Œgõóﬁ2PMuoúCŸ‚”h//>UCÄ≈#Ö¡∂}+ÎwÂK;∏‘-ìE<˚|86ç9‚Fg÷∞√¡X®m£M ˙‹éπ¢:3v)i"p¸©È"ºﬁ¡≠ÙEÈRﬁÔ%P¿’/o∏UïGmqhÛö´;G∑≠Ï,rrÖÔöì∞º:_áΩÖ†^Ì+n<†7É≠õ?™óGÜ9„Tˆ&‚{≥∂Ø‰´hdûHﬂ¨˚p_≈7ÛkÎdÙÓå≥µŸª»‡éyÌv›⁄÷hˆZ‡y1rHè– %m=v}ßﬂx·CÍ›’uµ!|é◊»Ê˚æíœaôl:®°3ˆú°G@û›˚√ÿusp•†öj1ÓN”5ø±qkø"ﬂπ„3'πf]iÚ¢_ÍÍ—‹l—T)∞ ¶©“\fJ‚5)Ó˛@àm'‚´jeC´ÊÜ^0öVEÒªX¡£c•í›,È≠˜Õu≤ÒìÀ„]-MΩQ±≤Í
£[6H>Oéù©„cå&7Í¡B∏±ªd´p©`W‹ˆÛ!Œ8Mh/Ç» NÃ«íÕ¯qxŸ!çâÑóZmÎÃ?•àg´≠B–≠È•ESp^ÒY——u„≥;d}	J—P◊'ØëEI–€2s€πﬂøâzŸ∏ ÛZYéìœy|yIŒ›q2Ÿ!ù{øÏê´&Ík÷’õp„≠Ï°mÌÊÕ›⁄X0Ô˜÷ªö·ˆªY∂:5vŸ¶‡¬çı“∂<¿K'tfÆ«†‡π‡;±√ÄoÓyìÂ¬¬`ocÆø‘©Ö•<øU‚éﬂYŸòmpl™ˆÁ6Lj156NöEò1+∏PVqµ0”†ön4œä%ñ”ma7îÃÙÔ≥Û÷∆…≤ôˇ=uπ∂qZŸW3ñí„‡}éD;§8µ[œÓ»éü|
 íÍÈ◊Í,ûÅ0ŸØm˙∂∫ﬁ¨1ÿ,I≥1€º‘h¶n0Rﬂ∏%zÊ∆£Î[°†ïõ∞@cª◊≤>Wò«ÚåMÿ[ù+wﬂ∂≈9O‘è3#¿|Î™ä7bn‰ƒpìiï¨‚”∂¿,˚û-ÚPÇ˘„ÔÔOh‹ï¿VÃ}g˙8æ‚ÑFg¨˜ï∑f∆fCJ6Yo∂mc{G<Õæ˙y(™›ˆ‡MñÍo’áO⁄˜AŸâµ5Ú"
“ê/»âõxj∏>ﬁ’3ºëoñŸ}IæOë,˚ºî∞µyå~äë˚´r2dvâﬂ'ëÂ;+…¸ßOÛÆMWñÂùßkõŸÇ¿∆Ë≥?L–(üî'ÅO¿¶4aÂ8Éî(M¢< ?“ÃÔ´Lwcõ≈ù⁄µô∫:˘ßúâæ4VÚ˘c≤°k’ÙtñWÙπXFæÌMÎ»nkïsØ~>ˇ∆æõûn◊wı‹6ÈÂ¨ÆÍ„*¨|πwö<ÎdK^7=¸VÕè˝>õÈX˜{8¬¥jÜ˜^^Œ'¥XÆ‡w…”∂¶z2± ∫˝{µRg¢ú¯kxEÏ™VRˇ‚ìp9µΩ§$åqö≈Õí;≤.âEªˆ>MíCçŸcÉïÇÌ9Õ5ƒ^'¶Üns#“V˝“‚9D¨˙≈◊!`∏MÙÄVÅc@PŒÁ›
-@«Ü¥êgb*1Égâa+85
⁄ìÕ 5î‘R‚µ˝È€Û˘”E§Ìøø∫H« Ø®Î˜<¯gÈ‹ã¬≠^hìO],ÇÈçH˜ÿ°û”ÿ]πŸuêÉ0ÁY	‰6·:y XÖ^É< tû‡º¸=-Åçã9À£-Ùàí,H◊ƒTç›R´¶o¨óyh•ˆñÀˆ…∞Ó*áK±ﬂ'«.z˝0gœâ∆%¬]√ÀÖ93FÕFwUS•∞ª Cµû∂Úﬁ÷=Â[€ÃU˛§∫H7ü;UÔÀÜËã0É›\nöÏx5tC>
ºˇ~i¯^fù˜DdªY·ˆ‹nXEÛø…z@E≠üÌ
r≈f…¡&—˙ΩºzO©Üû8dzŸ!ìåQãHß∂)0ã+ùSùæº`éΩ3ûœéH¯Çá¨2Ω&¡œN¥c_<±x—¸˘V¢ÑJ‚›d∂ï≈¡∞A ÙÀπRº€Ö—&~3Ô˝Ì&ÚÃü∫#ÚÉÕ` ïàÌ∂1•Y∏ıÙ•mrçr˚∞Eï1òä∑–⁄Çr4±‘Â(iúYVAï»,≥É¡’àëãIU+Å7≤Ω;‚∂uàMqPmãπÿCÍCﬁâõ™O™˘˛“ÍéÌòi˝ÊAgı≠%—^J˝ÿªa’E€ã{¢ôk˘Tó∫≥Ïv¥ó˚◊”^"±Â3-&µÈﬁì£ò≈è^âπ%‰C‘hπ∑%¡°…J˝® ïµ<grß€,√U2l≥Uƒ0–ŒvÃ∞∫eòÛÌm'ÓÈEoË$Áé„∑¨†cˇˆü…Â0WZm «jçH›∫T¯úÅÕî°/î‘,§YòÁÔÁø·1øs’¶3àø£yˇ´7áªˆ™ΩÁØﬁêΩ›ﬂÓ€´dCm99ç^˘c»|€ZÁ
v·>_j’“(eN#C~f‡ÚßÎÑ∏#œ˚TáÛ‡aDe◊Çrsaﬁπ˙…öbÀÛu˜Z€˚‡îı÷?∂äcgæ√!ú≤Œ|‡ú9á_{¡È)aûU5ﬁAC<∆&:Y"òÁΩlˇ%Âç¯E.vπÓÔ¡©÷ºÅñıŒ)G`h$Ø9 •"…º°JÇ"òGàËR°d≈8yÖ˝˝¿¡“G8uZÊq «p8KNRw≥Ô®⁄≠3<™Nu5…™JüómIŒ#§59Ô›ª«@X≠2ugôÀx4	oOonrÒe?dßz©©H]ÁÎ>ŸùÃËò|ï“Ò*Ùè‡ﬂ¯w_õ>£&S˝åi…¶›n‚¯∂é?Œ˜UsŒÂ≠n±g.ËÓ©;•±K>#GNîP–TA[}KœÈP„,_‚ùV€RI‰–VƒJxÓ¡Z–	çrJ“ÔZoù…9Á=s≤ ˚ê%ù•∞:ûÎ;Ä†fc√>k
2ÉcØÍ 3dßô¬¨¿+¨—1¶Õ∏IÍ·⁄øNÇM‹6¡ÄN»g√‘Û~€ch 8l
4`(º` 07∆hƒ›ÒÃı·kÑÌÓNY)…)˙èC:N…‡‡àP
õéæQ4vÑàø‘ÔÎ&∏ÒbÌRÂBÈœB÷1 Ü◊œv_¡±ˇd˜’À›CrÙ¸Ä© ı`˜¸48:íÍ—ÆÔ¬§9G $âËKTÍNÇßòñÁ±zêr™,ƒEIÊ˙±ìÙ÷…ﬂ†®[ˇÅ‘Ò±3Ê"˛Ã~†íµ{Îdt?éÇ¸#ålÚÉﬂlaÑ6ÇS/8Ô]ÙhöTÌèf÷ÃÏCœ*+ô∏‘CõVågÆ≤ﬁˇb{ï!±B∑Îu† ßEzfCz`£˛ÄÛŒMZΩ°l≥>ü¿<ÂaõõÔ<Ò}OË∆ã™é∏h‚û—wΩÛﬁlLd|¡zTPPx`ÖfΩáÂ‘Î⁄ﬁTâ
µÑK{[Ï	;û3¬
æ£ l;ÄıM) Mg´x4ò∏é7ﬁı@¿1Ôo`%7^%¨∑ö›W7ÒL√∞_˛©ÕêQ¸&Ä£!–óí„™y±é”$	Tå*πq«∞üUiÛÅˇòÊÙÒ•)»tO¢ÓÆ;Gí∑Úõærú1“ß˛f%Zà∫≈Ω‹Êß»Á≥¸kQ~è¬æ•QDΩ0p’x&™≈˘Ûˇìb¬˘‹i∏∞Õ˛/ë”Vq∞ÿ–x?P;€∫€UˇªäDí±Åwû≤Ç√∆ÜBçPSH∞¿?{g"∏ï¬πàK6?ÂøêdÜó$·8√ê6∆xõ∞:Öyîaà·$d·8∏ft
§ ≠ı	˜‡®6q…‡Õ^?≈=ﬁÂøÖÅÈÚ»≥qÎ≥vëÓõ√£›˝g+˘†˙pƒJ$?*Z
≈†‡æ ;8∞ûå›©π3Ë˘nBìx7…9ÎZ
ZüV®€1≥“ﬁŸ$b?dá`ó_ª_ﬂ|X©ãïÖs¯ÓG8 ˇ∏qµSã„∫]ÑJ·œº˛)ºäŒa¢∂>√kª~…eUéµÚ•wbZÿ{\$éJÒùÖøF`§•X©¬Z…€y`X©U£∫^‹ôí)02:Öbπu¿(ˆj3ÄÃ´Ωk›ä*eµÑ÷æ™\ºphÙ1.‹7È¥}ÕÛ˝Øö)m‡•5‚ôêÌÃ‡ˆÍ8I0VC&‹ˆ ïùæp tœ#É-Ø]»≥n`@ì`ÃLRXk„Î=–∑»yÌ£]H√j?Ïe<˙‰$;Ê.≈jV%%ée9täzìÂí≤ÛÊ>_Ãﬁ¢÷MkNï ™m)ºn…·ü≤PïÓ™v˛óOµÚ•n…p@ù?ˇÒü˛ﬂˇ˝
Îó≠8ôc5©í≠Â£}ˆÀÜ	¸ná5ö)ãeUP≠:™€∫˙Iµ¢ÍùQY•¶^Ó◊n°R3m23-°ª!L
KR“⁄íÙ—P∆nåæ”Ò„K7ÊE¡»âcòó]o&5º–∏»7ÎëW8≥ŸwÑ˘2ﬂ|*3MïÙﬁ≈í#ßl¥©òtÏl8'iíÜ R∞2≠cUÍÃ9◊Ÿmg<ﬂ14æGƒ¥o,‹œZÑ!ú+ê@ªÅˆk˝Ë&QÍ\«¡dDê!Ë(LË9uRÎz∑$F !8rl	ò=¸Øß#â	Dß>Ì≠Ñ-e_í°MhÏz∞ûôıÍaí Pô’)8=≈Ï3nKÍ–um°À'ÓÃ	“ƒàóﬂlÀCt“»’*◊Éç\«*]–¸ÙÁ?¸7\ÇÿƒàYXÁ/˚N‹o˘Çû¡qÊÃBîV±dÄÎ\˝4«tk‡ç@å'£	È¬ãıª´>∞éË˝K'Ü.±ΩíMôo)3û˙˝é¶+W‰Så<=!©I¯î¬ÏÎ⁄ú√æÏ˛û`ˆgπw§`yIÍúøgÛîÓÖ≤dÓ%/}TÂı¬u5gﬂrÎv≈∞ØˆÒlÙ∑Ì‰ÉÇGk√Ωi#åéùSÿ≠ìßÁôØh´É*ºÅΩ8t˝é⁄âƒöa‰Élá˜˚}„i^Ÿé>T[ﬂ˚ßé—Eœ:¯[∫Jˆ2{æƒ0ªËøZô£À
ØøŸÀRæT8n.o9¢ÎÚØ£ß4«$Èm8ß∑?dÁ¥çØy6ﬁ	{Ì]Œ˜‡·sÆ{6ÓóùÃÏëIÔ˚/÷û¸`ˆ8c√◊≈c±ï¿'{l'≈∏Ä¿h»,É¡Èˆ®
Ii·.k6∞x+=Ì©L$ñNkµßfFœú˝ëÚúZwû
S≤ıå%Ö)µ⁄'¬ïÿ∏é#ºc†	”√Q˚¬KSÚî≈Âº<áï˝y	ÍvJæ=&›
}ã\û+Ωıû9òT y[∑ªA7UØüV…hV3,UMvz`Û∞?Óv√ÈqDÊ^Ï0
—ùKÁ—sÿA¡9ãQL∫+´¯Ps Qœ¥‚∏¢y•¥7Û#GaZºÓ˘BL»8ÓÀv!:»#6€xÜ·¥â5€≠lì˛ÂOˇ˘ø√aQπ·t˙ËÇ7,Ì∑%*· ÄÕ™mÂ´fo∏˝_∑ ôÄZZM∫)‡N!xÿD≤‘Ê›»°‰ªà‚P,ÑLE˙ì0Ímp¡±°ëäa∏„«j˙6˚sâ^I%g°^≈ÍTCU’ÇN'∆-„0áØS\Íh°¬ƒùÅ:#˜‘1-ÈB~pcfj¬6«œ†iíÔ¨ˇ$ûÌ»˘ºÁl&K◊≈ódé¢XUi$Z1ÚÌîIÉÖõZ‘]—Üô(9&˜ÛTè˛åQk|nÍ?ò*≥‰ô¬!úaˆ—}ˆ‰ÈgMı£åÈ"¬/‡›pˆwÁâ´˘dôÛU —’è+—÷Êg›¯(r~vùÛ«óhÄ3›¨U¬ÿï~†rXt[≠íØú’‡PªYh(fcπ¸˘Ûˇ=≥£¿OœX–¥;MóÒﬁòºJiƒe†ip	Ñ∆d›qD)ŸÃéß∆ãˆ™gˆµà∞ﬁ?8z}|B^º9~C>#ﬂÌæ⁄'/üø⁄`Ëı”ØKúÏ“ç˜g¨ÑÜCG'zÇ“Jg-©¢˜´q“pÚ˘¥—7j¥¿¯Ê—KUtU÷Qçzi°çÊœÇ¶≠ﬂ–§»ä≥`ÂU®¶∑A5≠à¿\™O‹1∞∫Iªi÷+ör †~-ı)–:xöGì-çÀ˘ãÏ(W—ÒÜ#∏Ö/yz?ıÇt\{≈¥Ê‡nä≈ŒlTÓ¿Èô—hbÊreÇc†,OzÃú(fz±ˆ%È|áSftÕæH£Á)9Ç{ﬂ¢	≠c–Q	È>¸¶}¶ŒdKy=¨M2úº+Q ≥Dy¸ƒœû	OÃBºù23ó§~íN1˜åM √-h±G‡ƒ(u·ÔD»yÜìÁULKöAø®Wî≈—Ñ∑œåÔ5,¨ÔM&uv^íN—%•®¢'mñı§mUå˚Éí|Æ®ˆGˇ:#¢˚J"∫^Ñ;ù´⁄Wdî˙Åÿyä]Ü¢r£ON≤ˆÏ9T‰ÖRcï,¶»^±
x∂©ñ„©Q!(ø
4
ˆ=
ŒÕ∂C}ü‘£…r QähOb8bE
b£c!≈áæ7˛8ù‰ÀdÆﬂ6?[µf¨2kO€DôÇ9$iì7¡?˘÷ç”1ù†€SKÅ	:ËÑCX‰∆å#¢£<	&§SxB„á◊SPÈ¢w˝1ÖáCö É•
‹c8?ë
'o–á›q≠£¡L€‡êÂ∫é©y’ö¬7πtfôT)£‹Ö@2∑O≈Ó)t8ı›)È&◊öu`Æ“´¨&+bÎ`˜ú)[u0c‡4‘c%|(ô1Ë4p¬Ñ)√U<•©ód9√{´›l
π≈–™2&küçΩØ*«¥£ú¿p<ÁYpÓ„,£M±wª5ä’≈∞È¶QZñÃ	BrO37˝ûE@R¿{I–ã»iÃdk0\T€Å´∆)∂‡\bﬁcIXÍM¿Õñ^Ω¡·Q6sôTΩ◊Ë@-≥L«:≥”‘`÷ÇT*DZ]∏∂]5ﬁÊÒÑ€∫dìc&Ø+€ûOc<≈>CΩÀúL
¸jﬂWGÓ∂ñ*9–S+π"z≈$«$¿t∏œÚ	^sèòê¢lNcúSLú:ôíËóEúÊå›ÑÄp°´p#te+VRf ”*Å?S2≈ãúE{é8Ö˜∞‰¬S◊Cw;@O´£ó≤v,·ƒø†y4<:§Á ≤3u∆£S‘À≥ﬂÑc$‹¶®iÉKÃ˝ó˛N⁄±Çπ/ñãg˚[∞Òƒ°ﬁG√ƒÎºÅÈÁ◊‰‰öÀJÌh≥Oæ¬=Ωè«B–èòœi>µH]‡—°„Ÿ©Ù∆eùc‰»ı‹	Ã˘ö[>G*G WŒÎêï«≈Z¶2¶Òƒ7hq˜K—ˇ5L…µÌíÓùª∂4ãÕNÎFFé§#ﬂ»9}|ôp ƒ)bã|ÏúÍîéFNò<ÓÙGÒœñ l‡ˆ7ÁÇaÚπÒÕÇ¯È0ºË63-g1ﬁÎUg≠0èNÿˇ‘=“Yå€’d†6U¶
ñ<ùÛΩP‡`vGÉ7B6\rÓ±i‰F®2´Lπ≈—∆–±ó†A°(ãYf>äFPŒúÑÀA$8ïÒNö¨®¶,§<îgÀ˙w‡¿1xä‚ôı7n¶áŒÃçA˛NÉ%›’÷}mC	–„¥«Ô˝µN=1ÛeùÂª=S>dò# XÑñ#gîÕÕäœYå≥!çI·åË∆P@8¸å)	Oñù$P∏OÉ—©fÇ S7¡B		YÆºí
D…0£u^üPh{VÃﬂÇíŒî»•∑xÍAÀıíRª‘ö◊Êv}›J@õÛÆãÓΩπµª∆∫âôº…ïä‹Í·t'ÉÌ¯2‰7	°àÁ:©å®Ìj´@:¥q<⁄Z:ÓDKV—óÛ÷SÑ^≤SoW?eWd≠õ”(Ï˝”#Ê·◊:	$4+“HÕa0î°à?“TE—e–G¡(@Ö0≥wé/ø
Ïù¿ô$[˜s.‘»ˆ◊ﬂLáçrÀj_Y∏1™Ój·Ÿﬁ‹d≥jPó^l¨Ì!¿á
Ox•∫áÈ†≈˛unmÄ!œhzÍgÿ[◊;œÕÖkkTÍ%à…M8o‹Ô<ŸÖM”\Ù@◊HÁ…õ‹™>HÁïÉ≈!√Î¥c|ÏzÜ&˛˘ít8Àû;≤ƒ©ÊgvB†ÏH7oÓ	Ä›|ÿyrîªÃôîKXÚrGÄ™1∂ÓÇà/RÙ%ÀÂw∆n:´≤˙,‘≈∏z*fŒB£‡‹∂zÉ∂nÉJón‹KU¿rÎMÉÅN˜›¯˘;‡›¶åÆ ´R^π¡†◊πç+◊%ıA-õû_ó∏´\Dª-`:∑5⁄ÙﬁwﬂÆòáÕlË‡
Í3ír3'p∏0∂ûë&ÿt¿t›n≠ÇÁW"ßZ‘Ëcõ:;q‹hóUm”…€Ï†]UªÎÀ%îL8∂º?OÏ∞'‚t¯è€ﬂd˜Ï¶˚ò˘≈ÁÂîâ3O˘…R?l
‹√{“}∆˚FK~©˘Î/lS°S’ìÜÚ	∆“	m_sB¥†πR•eô+lu)˝‰‹ym&T^S§B)µL®¬ÀêgÊ	ıc	Odçœâi›i]8§eπVäöúr"ä4¿)“
fÓMgî&NÈYõå∂Ì|È,ùòEñ¢‰§¨d(ñieïÿ8∫xNc“¢»'VåNìÜTüS≥_¢ÅâÒ>Bßñ%Äœœƒüè8H%ÄÙy’hØ“Fvòåë:üÆéYñ/ÕüA2x∫{x¯¸3û_Ó<?ﬁ≠&ç|F‘˜5	#ﬂã_0!æ‘+ëÁ	Qm‡X>êH≥⁄ª8t·ﬁÆÔ∆ |64√ò{8ˆ?ŒõÔü∫˛∏æ?∫ºïÒS¿„π=•±ÉLélµ´UËóZ∫Ê≈€Uà.¿ˆeË÷¸Óz.ì•â’¿∞îgÏ™:ÅO=ÿû%¡£jT~jM±≠’ /à_põ<Æ~»—Û„¡˛‡‰˘·	Ÿ{}rÚ˙ÄÓ˛fˇ≈Ó…˛ÎC≤∑{L∫04¢1˙Œ,≈–Ü‘_Q4%ïÄP¶†äY„öN—OÃ¨¨>„^aê–úPr
æ˙˝˙èΩ{àÀ∏	ˇDgC⁄]_eˇı◊∑W~(BP8´úçwÑÌ2;6P∆{À<t“€∏ﬂî⁄∆»ÃÒS≤A∫_Éé∞vƒ¯lèÑ‘C÷âﬂ+%ä´À>ùƒ3ÊÌ√f`Î'tÿÌDÏ≠’}‹±ì‡¸ àÏ£bñˆ[=–Û∑I;∑˙z-¬Fõé]bd’Ã∞J˝5);ù^Eã–ß ä…ßóTL◊◊ƒÑºDöŸä†QM…5©'>åk\°`·À_◊Áê’yâ∂≥"6uzﬂo≤¨L÷ΩÏ“FüUâ6Úè5ÉpÇP;À¬Œ¬”AKÓ√‰ñÊS]Ü“nf˜‡Té3® R≈!4ßæM‡Hõ„∆)M•gg≥‰éﬁÚ-QöñÖS:6Nu•.+NlujT‹¥îÙY[åÖQiµ¬B›"]QNÎÊ©‘„/∫#–|Od3≤p⁄ÖËÈÑF…÷¬	TÓÚ!Â/å‰ÕÃIt˜Hw/
ËxD„‰Ê…nòΩÍéÚMQÃ…‚IœÒºcÿçßºrü?⁄+wyq«“¨Ÿ9ÈoÖûÎc÷Hàq$t∫öÎÜX
rATY•∞.⁄∞ÿ/ü∞oy≈“0NRØËEê&à*’û®™k¶õ€!îjø(öÿŒ∂"ç“®$„”¿√4ëcT\*ÏA$û8Ní£o"íWGº≠cWU¥4Ë™M≥≤ËÌ¿iÏh÷˚[684ı{ËZÌe2†–r3⁄–££iGø›,g∫‹ŸX_ˇ•rKöı¿≤¡⁄(»oDŒá4Éˆ∑≥Œ*”Yﬂv»Êˆ*ÜÎùû˙NÔ ˆ∏¡ßdh‹∏?Ø•1cKIo´\65ã¬Êà=äB®Ù¢“÷@/¬ao£‚û©˙Z«˛÷‚â ¥∂‡≤Ÿ045°µ t#Æò∆˘œ»˜(À QuCÔq)Á [¿≈≥,¥]›ô›)∫äxdnV‚íºIËLùÑ¶JÒmB3;¿O]Ü∞ŸπÆ ﬂ¨blñàº|e¥ãyºŒnS1C◊Åï©`6n¢©ø¯sãóR’.p©Âπ√_sò¯ΩY0t=ßáb≠áIÿàvuùJ0Öûï∑¶ØÃQuUô+«4(gŸß±2 p(˙∂xx©-@⁄ÇRï"º.#≠)%‡àX€î~©0≤¯›S7ëª|_ë/%·°zgö=ıó?˝˛?Ë0|µ¨KüÔmæaÿ·è&€M…¬W6Ù/åA∏œƒf$Éo_Èﬁ∫6Ÿ∂N“(êñ„@Í9R≤°≤t≈zÜN¬ÉFf⁄aÃëHTêräîæµˆ0KØ OÒâ1Ô‰•®2	b Ü#Í;é¶Œåíì†W±æH§k≥J>√,œi¯nåÖƒµ0k(mûc∆≤À4„p6\√d-›1ÀÄY˛˝?~ºúrpt∞⁄ ÊÉ5¯Á·Õ)ëıÀ«#Ap"–Ndk´#§Z∫JÄûDŸvÑõ"RLLUDÉçÈiB#ÇeåUö«¸\≤≈ÒQUV¯ñéœ©gbÜ7≈ﬁÑ∫…π[ÆíÆ›´Wrÿ^2æ&∫µ°`kUÃ1”Aw<⁄3'—Co:†I‰NcÚ€öÕÆ„Kî[LPk¬}ÂN(ãdù„;∑ r¬ê¨4J'Ê	Œ6˚Ò*ı“ôÔ.ˇ©EÿÍ&Öe#‚«Cªõ?A¸rªôÜˇ˛w∑O¿Õ	LªlØêÓ´‘KcÍÎ–üÁ§‡“s±K}Ã\g¯s|3¡:ÑR†cˇÇÁ >4CW”%ƒêÙõE·¸u-.S∫˝é*k∞JÔJ†J˜-‰ÍÔ˛„2“$/‰ÑQ˜¢ÚÿR%á£K‹H–‚{âUH≥™h./P5∆`/Å≤˛ë%œ≤¸Q Ã(9•ÔT ﬁ÷·ŸŒﬂ˝◊e$“óéxîx§KA§¢WBAôûQÎº˙Aàÿg≥0≠¿ö~<öÂZﬂë¶•Z™†L)º£â0ˇ·.1aà¬KAò‘ßoÅÎ˘º™¯]£`68R?ßEÆè~<Ù8K·4pßà.él1û˜ÃQë≠¯≈Ê–˚Oˇn…ñ%ê∂cñÇbE~/?Àabaπœró»AÁòÎπî°µ•…∏—&˜¸§›a:Mt1|Êé~óKÏ˛Ó˜ÀHø{∞_»>Óê∫åh¥'À˜t$ˆâ√TÿØ6tf`Ú8daµs™∏¡i‡πÅ¶πi√‡>@Rg'íT~Ù®´≠÷}GÔ≠È}Ë•JiÕÆ€»Í¸?ÀHÎG˘Üaë‹=‹5KAÎœòﬁªJ∞V“*ô–0Õ :Ñ‹N‡‰çònäùÁuÑ}Ñ∞â+˘âÚ>@í˛©{vßh3L£–SRß¯•ô>ˇ¸áˇÚ^¸≤Õ˙›Ñ&Ònä›øüôfóÇJ_≤Õ	gg7Àü8ÁÙ¢⁄m!üQ_˛∞i3_g÷P˘,ˇﬁ}ƒâ*MV…ó}ﬂ^_€í(U\[.BÕ;]+:Ä?ÿH—?¸è€ßQ÷π;™î¸{±t)ñ±˝A;DgXnêF.;ÉhM7â`ÈY⁄$ëJ’EgÊ%FÂÌï´òım
t∆ –ƒ0«gïX‰'æÉH'…ƒ)'É±Ù∞:"5Œ&kÀÄ&µRu}_$Ûl¡ Wj˘`eâîTŸ3Õπ0,Ø¬nµ…0:@7Â¢É*˘øDu’]V¯±òÀc,∂¨X35…Xãâ"ø0öQuvPV˜ôf=‚qΩ•ÚœSgÜOÒ.ñX3|7	™@¯âı´»U”êo·UÖt)*πy àÚıQ._]∫)çD—–∫~§lVù)MÇ¿¬˚‚À>ßo"è¸ÌﬂíŒø“ ê√Ò˜ÃI¥è~I:?¬éÚßò±âÛ‘ıj‰xè;~ÑI`…úS'ätÖœ
9Ë!«J˚D›;vZˆq˙òå˜TùÙƒ≈Z2&<÷Œ+◊ü‚SñçÂè£ c;ÅˇÕ»ÿ•IV$ñùßÅ?GvWøS≈Å+>⁄Œ®gV)∏+	Õ9∆RØ$©'Ñ9#*A›eqkÄ75÷≤ì1 `˜@*Ÿˆ©ni‘K©ù)ûv-yÜ—È€Ÿ≈zp{9¢∑@zïk‹¸XèπºCä⁄eÃ‘{9∂∏î¬ôÅiﬁW‚a¬ä˛§ZRçÃhîÑòk›úfxïöﬂMxyÌ÷Ö‰˘›rD7€
=ÅC:∫Íml»p¢=ˆKj6îÌîÊwk[3á:j±-$…ùŒìå®wè^ö†5©∫¥m¶ÏÒºLY<∫§Lô˜Ó=1e˜ı‡é!/Ñ!Ûel`»ÒÙ¢ú⁄◊1^, ¶·â„üÛ-¡ªMæ€0˝ﬂ≈¸∞y.“,õﬁé[ø®–[aY"◊2H‚ùÃ«ÀΩŒ,5I“/›Hvs‚XK[‡glõ–Ê≈ü%‡˙/÷◊◊Ó√˛çÑWà^Ç®ZÅS∂°µ7bä|±]er*Ïëç¸âçÍÌır[º0‡l\Ö¿®´Œ≤9©Äæ®V+õ6edVÎ6Ωºá+[£^åæ¡ªÆH‹{4Ÿ™#>Ã™,Wñﬁ¢‘]˜¸Å˜f#8WÇüÔ±—eó«Np˚Mçå&[µ—™‘ı¢jöò∏n?R©≠˚±ÀÇñ"ÙG4¢¨†™œuÚ5¸ÖN'nÑ‡U@6<”nîN^£Î»:”¿£ì™Ê]”ªU&¢G»+˛ Œ;Ü∆˛àhA6ÁvDö1~ ºü˚J∞of¿Â|ÉUÌvXï˘	ñòÃ`ñ∞$5*aˇDÌ§â8Ù¯ı_ÍÏZÍÿ3ãQ± ∞˝$rg›ª–8ù¢—e¿WÄú§oSñÛà€kë=<vh‹≤sgò&Ã"‰±PVﬁ)>Ö≠ªVªƒê—Ÿ˚Äh˘vÈ&Q™2∏W;ÜÔÆ›¥∂FæB» Ë9(=B∂≈¬uNˆü’‚¯ıq2>	¯ö1Ï%{–r»Æ≤7ÎgcÕ¶ñ^´^—;Qîˆ1°Á‘MÄ∏x›∞—æÚzç⁄ ß˜y§à¡Ø>∆câß ≠pE}/cgX£èÔŒ	5ÍÅ3£ÆWnò]búÊ¶¨óüaóLœ∞	J|wÔà’¡ÔÊª9Åd˜Ûø⁄/à>MqIıÏïj„‚ámæŒzµØ†ò‚`dpRâG €ÉSO√›|ÙV∑J#6›ﬂ†Ñ˛ƒŒÉc–6ìa‹ÍÃôˆßó’-yÖÚn∑{ ƒ0lòU+‚∞”<?çéé»s¬Ò˛∑‘cnÃEM‡π(+Ÿ$pK$∞Ü˛O:=W3Œ+‚¿jË√d.¶iπÛÇûQ='g.Í)qÀäÖa6u0f
q:E\Ì¥¨se}wk≤Ä-A‚é)ûáìõk’z◊_£‚Ùö H∏∞∑≠Bj3√∞]ŒäA®Èj∞¨¬ãªôùkŸ_ÂBOô#R≤TËœÆÕŒAUqˆ{ ﬂöB=ºéé<WZWíJ¨ﬁnÆä≠∆Áx‰!¥çÖ√MâW¶+wwƒu|sÓ*ˆ≠±´ÄÏ\†hÙgÍ•0”π™R◊ˇÈèÏπôO¡où>7BˆY≥M∏oB√„Æ~±Î6Î>ß¡(ç3ÎPõæ^±ÂÖ… u≤´ﬁ|Ó>ï∞^ä(ÂÔØS7r™`´ö¯Ç d≈Ø¯îv:OzΩ“öızè÷¯-™ßÛEJ&Á3»I«H˘)M+q>âyπG8HhÔÈä{*•ä>a¿·ò∂›ûb05=é∏„Û6 2<Æ˘ºê≥ùZ•%˛Q'•˜„ dyóÆí!€Ùî	„æ†„i0i‰táÏ‚ä¶V}86ñŒ∂+:ågÌ´å0Ÿ˙ïÖﬂ˘·†{)∆µBz‰p∞√~scùï—¥’ïÅô2.bK±\ºÛÑ‚˘»#•£{˛È˙a™bü<n5˚(1W<ï∑„´¯ƒÌ≤‘FﬁY±ûÂπ€Œö˛6P≈f±ñÉ6-la'TÛBgù	¨á=Ó<ÖÓì288"áŒÙÄl"ê≈ò™ÎÀów`°æ¥‹àíﬁ≥‘˚Qö+Ÿ’Û/fóÓr„ï&øMø3±id*áti˚ù§hå¬D6uBaå]EÎ€ó® M”ƒï~%„`Êb·Ê‰$≈L7rÄ∫ÈYøﬂo‹∑\Co∑eÖVˇÓ÷ôÎ#˜ïÎ[7ãºÕaäì˝bk´Õ?kXTå(±ÍÏ›VdHkSAá¨kº∆`dŸOﬂ¢º±ÇZuYõf9ff’,ÀïâÀFäv≥ZÚ{Âs)Æ=(˚¬™3Yèd∂ûN=F§¢±›‹◊&=ÂŒ,d>[‰NË‰.{p1πYÉ”k\æÑé§≤wYÂu.=Z8ù‹1õ§Ω‘õ;@].~Î∆H/lë’w‚œ≈ Te\÷Ë=`Ãú{ÏÄaæ2ØëPOV@€/öüôsrÖ‰_e_XnÀ˘X>‡#z°ÈS
]∑)∆»2@_é‡ÆÅO√¸S≤á˝qÒ˚k~°∏ÉŒ`'≈ªÏÔ‚w4zÒòçÏé}qE∫'Ü}4NG|rf¢≥fÁ¸≤/ˇä6À≈√#ÎyøD±˙d˛w(&+,.Oí¯…ºî≥ZŸ ≈2Ëœ@G∞Jq<Ç©z©>˘$î∆#S7é˜Û§–‚)a=y|inúÑ≤9ÜIëˇíö*≈÷T„È*£Œ)6’/~±∂VØ1¨˝‡›˚áœ^>ÏÔíìﬂΩ~qº{Ùıo…g‰’Ûg/ûì„ÁO_>›µœj»◊œ_aÒ„ñÔ˘≈iÍÛ}Ölá&˚˛8tØü∏38€”YÿÂ^∂ËKÙ?aAìïÏ£_Ê\∑¨œ'ÈÙ:HµIt!hú˚∞6∂Ôú¶æfœ¸Z∫ab`Ç>æÔ≈\væ°>Ë„nn·Ô|Â£Úï8ü&≈üªa‰z“ØétÎ7©_˙Àì˛⁄=Ka´ƒ≈ÖÅ°ù¬ë◊y=MÇ“ÖCêpÂ[@#íØ¸ oL/`l„>;Ÿ‘«?Û9¯û›uÄﬂª+•F.e≠|[˝∑wπ•Iê‚∂H]v„◊p)ÓÆ¨ÙC:Ê%›ÕU“YÔî{‡˙ï«\?M√ÉbΩ˙Ù∆vE>ΩdΩ«/ÿÕ´U¯ÇΩπ⁄Å_\ˇä|∑ø˜>yEFËò&]'ä2WühKÏvNæCœÅªßúøv}P|å°ÚSúÓÚ¶‰„¡äÕî˘I;1∆Ï˚8•Ÿ◊ƒ=ÀøÉîßŸñÍx†ÀÁ?¯tñ? 
ˇ$o»ÒhövˆÿÆ'ˇ¶^qwÏ ‚ﬂklqëäƒà»#≤±Yô6íÔ≈?	dN´ÚsõÎäÁjSFzdn¸útÔÖ∂=8œWÃÃîÂÜh2ÈüzAÂØ·;‡%Y6~¯ˇÁ ≤«~âè±;V£¨ˆ
Ê3b.Ahﬁ0Êu}õ„µÜZkﬁô∆±⁄V5Zwò6∂a¥◊peƒ¢CÕn±Ë‹µ˚WÌ‚[8¢[v±“À_‰]∑ıì@pI.€sÂÊ‚Û;§ÿØÇË8]:Å3…Ãƒ©FûC˝ﬂ¿˚i<Ï+∆¯Ù J∆&ä{?&ÎÖ»=<¬ﬂ∆:ãÈAIPk÷¿äÉÍG≥7t◊˛M¸˘⁄∞w¬Ÿªh⁄ËÉ‚»;›]_%d.·J˘ºrœÁ.yoÆ~Òˇ  ˇˇ ÿö∆„