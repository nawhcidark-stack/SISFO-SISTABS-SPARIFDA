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
      setCartSnapAmount(Number(data.totalAmount) || paymentCart.reduce((sum, item) => sum + item.amount, 0));
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
                <div className="lg:col-span-5 flex flex-col gap-4 p-4.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    ‚öôÔ∏è Konfigurasi Backup Database Otomatis
                  </span>

                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xlxúÏ}Yo\IvÊ˚¸ä®DANv+πITIl™
I≤EâVRn çÆ»Ã Û*ÔíæãHöE¿∞wœ<î«∞Åyü?ÃØÈ?‡˙	sND‹=∂õL-µP™dÊç∏±û-Œ˘NÔ”ˇDeoÍΩ!ü&…s∞ßΩsü]¸g0â|rAÉÕıùû∫.‘N4¨Uè¬t0é¸)IŸU:H|ö≤¡„ÕÕﬁß£î¶YBˆÈdû-»!MÈò&åºH£Ä¶^≤∑ÅM9øá∑˛Õ÷Ê‚Íw’7ÌlnﬁÖÄMΩ,Ë}z@ß4ºòCÂ)ºëˇ√_õ∞	ç)≥xN}jz˘ﬁÃêÊßqñ¶Q®ÈszΩÄéäGzög¢¿˜&Ûß7˝5ÚÙS2£·‘g#˙Üâi:à¬sÔ¢ˇ—X|Xg!˚lzü‰_xa ‚7‘ˇ* ‚§¸:†W¢¯Ó£¢6Õ“Ë0∫˝àNüEÍØ›j∫UNÙÕ∑1Éôıﬁ0‚Öæ≤ﬂ ≥¡#r9ÿ⁄"…,ˆ¬˘`ìL†Q<XDºK$é≤p ¶ÉÛÃ˜…8äß,lÁ“òÜ0·1S¬?{©Ö∏·¢8!”,¶¸ÔmXLã5¬Aî•∞∞ì,ŸÖOºa2ÚÒMcj»g§7æÄSÔ"<ÇçGv˘7b@ìΩ€o’√v›{7ﬂ AÿA"z"ggÏGì9LœLœé‹yç˘∏\Œºv·åN£ÀAø{·Ãb9˙iPéôW‰CºÏ1Wø·É&∫.ˆ®ÍWπ˘UøXÈ∆ññnÏ˘tÃ|›qŒOêÚìøƒ¥IQ"E—¨◊ë<‰îÖ~¸a˘˙_”`M3|ﬁMOÊ≥I™yº$É˝†<å∫£'N˘TÎ3”ôo˘ÁY ‘™œ÷S_∞tùø|Ìmú˘ﬁ•ÿ¶ã¡ˆ˙NπY≈·Õœpqûä≠}Â7h>)ôÅ‚ËäØdkÂymﬁ‰U¢&†⁄#-¯‘€Ó√Rè.»Å}∞∑!~v¨˝®®˝hâ⁄[€ÂÀ∑±>ÈødÛ(`·î&ﬁZ«÷∂≠m?≠}EcèÜ]z¯∏hË·c—–6¡¶»àGÏ‹±≠GeÉY¥xDÌ"≥v∏/?e?tBÁâ ÖtëÃ¢îzpë%ê.2˝F»	ÉN¬º∂çˆWzkcq£p%çY9y”H4j™Gæ˚élm˛∏Èúë∞ÈXµZ~≤æ£ìÉxºg^
ßz¢›≥ø*ˆ*LöQIπúLΩ]Ä‡˛⁄õS¿A{3èåAêN@ËÒH¶Ÿ~/fj¿ß äΩu›I◊»Ÿ˙s~≥Ò+2Ñ’%˘ÚÖJS†,dtÈ•ì˘’Üj©ï‰ñ7H∆9ÀÎ,IΩÛÎ¡ò•óåÖ∞tŸ:“ÚÆÙ©W·4õÍ9f‰8
ÄV∞¯≠®Ruµjƒ…9˜|ò*°—™U±s∆4Œ»úë”‚G¿T>p-ÎNJ÷œB«jÓg•m)GˇŒı.$á“Ü∞îr´F"L+nÑ0Haì,“¡‰yrØ¥Ë‹∆„M“¶\€zÅJEıö∂F}%’ŸB™S„TÓ¥±N¨züVıΩ3”˘Ããwó!ÜjŒé‰/
#mˇ`mÚ≠Ì•bëŒºÄ¡>	Ÿ%öºX_˝ƒ⁄zÒ-≈F)ÓÕ~œõé{k∏°ˆô‰˜î≈!ùıt‘dY⁄˙°≠€(a¯:K√k∫˙•ùØP+á•Ãm,˜ÓÑ?ÑVÃ´[¬∏∫É’.©ôpºdI≈ ì∆Q@˚Y¯¥/§ÇŒ‰RêáùÈáézòDíÜ$WÔX·ROö;ô#MøÙ∏‘ÜlAª∏?|ˇáÉ„d>H∂!∑DóÊËæú¢5òY:J±€¬E¥⁄iJÁ>£SÏ?
WLñN38j±kÍëπ …0ú“œ»©#¨=¸ıË≈ÛB`ÁÄñq–æ≥d…¶Ö|˘tñ[ Ω∏LH‡ø™¡~êÔf¯V‹Û¿?è$^ƒB'¸/\µÒBÇ≠∂’ÿHJ^˛ŸÇ¶4ô¡ŸmIÒ≥Ëã:ŸCXîBTê¢ÕŒÊ∆÷&Y\√û_\¡ÓØËÇM{U)kQ_ß$ÿ‘Ñ⁄•)Cl ÒùÅpÌΩZ†Är‡GŸñ„ØAÇ⁄z|[®ºDÏqÿoúHiÑzN—F7aµÛ∂#eªÜ	D+‹Æt8÷¢…OvL4hòæÔ#Ü§∫≠k€y}}ù˜_ú	NÙö7Q˝ı◊IÆiÈ±˘‡¸∏•û?Ï,ZÚ∂4›%££—ÔE◊ˇ+ﬁ„%ªkê
,fß\ÈB ¢Sπ°ì	[§O{ºè˙«¶^¬¨n_ÍW£45	ÖNRÓ/Ä∑Ò˙∏»˙⁄ïUöy”)”vQ+Ωk≠vöô’±fŒòΩãY
«u v…	3`Ãr{ÇƒpqT‡^˛E"5	–bò8%œnRˇb»  ∑√‡cVãıÕV»Ò/
…Õj#Ÿ÷I:SÜ+ø'¡u€ˇ˜⁄ïPqÂÑq◊ù„sç3
GŸ8“|3ƒ∫-∑pã–KeJ“yÑgüh±ƒáŸyj‚]LﬂJ´˜!KÊ±∑ nøA`Q,h–R£Iõ˜¬L_r
ÉØ÷ìBbˆWô≥©·ëÖO'l„`Ò”àÁi4 ∆\©öÉtÔ!ØòÉ¿ë‹G©çV®áúûﬁ'Sﬂ_7Ω>∑éÛ¡√¥L`ZêÛÎ©é¬@û0©*Th⁄ªMæ-{v!õÆ ¶çE+-òπë—òoñÑ@7N√è'è©Røk>≠ ˛q*XuSX)¶xŸn¥†/ΩFz…gG¨Iy∫™´PõÇe’4híÅsb0|Û‡1ûiqπ&Æ™Ωk…ino‘M•AknŒ,Hf}√ﬁ›3	<ÛKv≥dvpôK≤j¥4óWìÖˆLí(oåì–\‚(a	Ñ6qw•˛W‘ﬁÔ2∂S?Kºx,\Ó·mã,Û›‚8¥¶<ãπ∞£.Ó8LΩyBoæƒ_ë-v∑P<íDÁ)ß√ıŒ[3V¬°ﬂ∫˚ùMA?}È]“köí{4X¸VÏ®}y[‹RL$áI÷}P∫”ŸÌöE≤w"óÊ+ì •…9K'3Àµoù∫>ã∏5√Zß&[åÅ≤Óî\Àø®—*â3Í„z* …&©»B›©_õ\m5Ô˙ƒTUnA¬@AuP©?±ÉÿbSÃTw9oıTGÍZJ¬ı`kªÉ…Ü’Üå¢3€TxeE1	ªÕŸ~®e ≠Õóˇ¢‚Ìâ∞≈ƒ›®jˆh¡é{¿ö@-	∆û_ø¶çœ ≥R≤´:!Oü>%õÙ“∫z‹@_ø¢ÒÙ0Fõ°XÈ€µïN“8ö3òÎıùﬂu[ ˙⁄’VL‹ÃÄ>©]1rçF)ò·ˇÉF⁄	ZÊÓ∂éÆ–´äÅπná¥Ù‹è.◊º t—†=ê◊˘Ò–÷fi)5^°»Ì–Eø?û/∏∫cô∞ˇsv*’|±ÓMoÎo,éêoëçùM≈˝∂˚›ÉnÓ*"Óú∂lÙÅ•Q'/µRmGg≠¡Â¿lµv∑v˙¯´.c∫phS∑˘9©25p"§ë3Œ¬	¸Ñûe0îo∂v¯ﬁKÇ]˘Ï0<;$ıRüÌ“9‹Q‚ióëXÖ^›òoæ’  n„%¿&lƒöãÅt√*¨W•À`©d}Ã{è≤'º=<ÉΩ∫EÀ¶&øﬂ ßπÌh¡S⁄ÆöˇP‘Õøx$ú2:Ã∏¢œπ€ÔÜ∞üÏÊ´X›]⁄√ÕFƒá€∏ê≠#ßÿøNYB6»÷ÊˆCº®˝¬ªb”˛÷⁄-9ﬁ_·Äåˆ√®‹G^ïTéNI„ëåAü.a3$Ns¬WzÍf√Í8ÙŒ+iª
…ÀoÈ<Õv…MyˇcòpÀÎtòjØ›W54ì]Óø»Ø◊u∫l≠M'∫é∫R·VQ~fªSxR⁄˚c◊&À‚¶Wñ•·ñw	‘-∫\˜a…p∂÷g1;'O…∑t·m–)∆)Ql|úsÇç©ä∆À¨—AŒsz¬sR}à7‰k.ùØI&€’}\*Æ‘Y´˘O'≠©Æ≤›eq"¬≈N)MT[Øf‘<´•ÍîÚ~7£ÚRlè£)˘∏_úﬁeó)ΩMÂ EÉ}±{Q±gOÛ[Ì∫ª úïf££–[v„Rt≤on‹Ü'D˘Ãj˜¨hµdÖÕ|5€Xπ§(–àu∞©À“6ËÕ	V£≠(6+≤ÂÂnÔpax]NÏ!púÙC:∞ºC+=ØbàK◊Øx»ƒ)ãÍ]™Eu,c6µ ¸â’Ilım»÷í˝ËŒ„YLìŸˆ{<å:Öãàä'˙ Ú}&Ö‘	»‡Ëi≤0%ãòΩÒ@¿”È#Iz≠Ò9©5…ÒJõ˜Óë„◊◊˙ú]'˝∆œkπEÚS≤âè⁄@oTAKóêQS«ˇ_∂–âpSÎÏé˙Ò]‚õVYePïãeF≠¬¡°‘˙Tî7Æü%^ÂO≤vã't„›üéº‰íÓ¬iÖ≥Ù'8òÊ:≠'i6Âkˇ›wdÛ^Àõ¯Ùn™ûx·|·ü˛Ê_:éÂÙt…ë,˚ûÔ8#9£‹ﬂ¯ı¬ÂÜx…‰C”8C_™%óàæêú!√¢íP|(#;Ò¶úë.ªR¢ˆ9¥cöê!™”Àç-çM≤ò≈‰‡Ü„ÑÅ¯≥‹–höbX~8aœ¢ãgL_fq∂Ò[Í;é™…]◊gQ¿‚(
ŒùÃX,∂F~MZO&g“ı?Ñ)ÿ?ñæ«–MÊŸXr.$É;doò-¯X,µzFƒÛG·y,∂∫”„ 9ânñè”8¢Ò§÷eÁN‘>Bk§a
ƒSßq¥àÍ€ü|—ö£/Èkè‡ë[í<ä≥3¢>ç=∂qÏçjÑ•˛ö¡ßKÔ¨Ù¬2z∫[ø‹€"nÍm+)®î†7.ﬁúQZ˜–V»R2‚QF‰Ä∆mˆ^Ÿd£^Z1ıüﬁ‹©œÓíÕ˚˛›⁄!∑Õ·I›±ˆÙz≥˝peÉn∑ã¡£öWC#4	ùπÚQF%+¸Úsó±äkwÌ’≠I∂›bÎn≠€æ˛€ïKN·ï¡ª‹∫h,"L¯◊£öJ£⁄75›y{S©;Î6ó.Úqˆ¿‡Ñ«˚ıI›£‰IﬁÈ|ÓU˜,çÔOˇ¯œˇÒÔØÿ¢úKÖ^[ÕK0&NÓ÷}g #4{†é*êpK	Ù¡É‰ö˜.±π_f!EõrÑŒ¸àÂ¡1>0x˛∫BME=Ç¡~0<≥$î≠çNN…	˝3 {Á‰˘+rJ°·Ú‚£[˝ÖlY∆∆ûØ¨N)ˆâ˜·E¢$H~µxE.g#‡é≤±9ÀD∞«ò^bg˙†O 5 uó5h/ÜÜÇ,ˆ¶dö¡µ≤)ŸÇÏ>™¡êE,$Ô“<fSB©ùOX¢l.K°	’(√$M’B ÉªQøoZºÍ£\ﬁ3+.°Å$µvúìœMó–ﬁü«ÀE˙ z8<íˇ<|˛%üì√£ØÜßØF‰ÙÛó'√Áü?ﬂUÃ¥öCÔeµ†8€È`

9·üºc∑Ta9µK˙∆-a‡k‹ä˜|O8•ñH¯L=A_»YqAD∏®=nzD„¢—(∂Ω<r£èô8 √M#å5„ßv{ÃÊtMΩs’›æ√h4r HRÄ≥¸ìˆπVø—a6bÈú=øÙR4•(_r¶@p∆@C‚1‚ÔU∂¬JcxM>êÀ∂éàˆ≠/UÊ59_gqî%‡•ßêìA*⁄%3Pwüºsb˘ö∆$†ÊøÁi9ç‚4:è|/ÇÅ„Ï-@iÀóîÏ{¡ÿ„ªæP;óûíâúxºà~
[Ë‚√3‰´¸ËÇåã◊Ìø´yŒSÔçáX^R7tKŒÄ±”‡5ÜÃe	BQBÉ2ÛÊ0î5g§	Œ%¯~˛©√Ë˜62Eú°Ù¶y ÿ›é¥ˇÁ|H)b	Ù¥í?)7‘Ø‰·⁄≈Ì“ÄD¿Iñz$å`ÿpR.(Ò8C/<èÌyhJ‡k#¶sB9*√}2<=BWYí*Â3øù—4.˜Ì	zæÄIA∑0\=ÿä–ÀlM0«≥œœÜßÔÀØá_	lHÇ§ﬁîŒÌ¡x¸LúÁŒˆ5%∏.@äAlª§
ÔrL-JáÖSæj*C{„lªan\ﬂËH:WBˇ6ƒî;*a(kø◊[”Ú ^atç˚‡$πË„≈¥˛·—,∫‰N¢)ı˚iú1Â√-%KUÉªıqq-@Ì
µ¨º9Ê
Ü9Li£¯Í±"P±tg≠àèZô¨*4nü•ÆLÛOyø]CÁ¬‹@‘hç⁄Æ`äÀY8ïπ!úh∏Ã#éÕ	™9ävNK≈Á•Áìæˇ„ﬂ*ˆ¥˙∫∂ª¡CX78Üb= "œX.ü¬1«Õ–2v‹$µÕ¢∫;m#ÙoE4ñ6…_∂wT3ﬂà‰®E˛É⁄ºÒháG:L„h13‡QmÌô—⁄b∞TÏ1	ziÓíÕı';˜+∆ıØXfdΩ≠J•-u%ê_è`Á^=ΩlYN3p∫tœØ{M¿ƒ…Äk·⁄L´»e∏ÖÄó»w<Ç"∏ma5˙BŒ∫ÛŒåk‹¨p»óß◊zŸ%B≤}4ùQÑ«j%tØ»¶“úÙ∏fN⁄6G˛}‡kıH⁄É3Ü9“‹h8UôòË¿h™À…aä†FèÅcy‘ALhZíÙù–å‰Ø
≥—ìB†·”˘†>£#„∆~ü≤‰q–ºí"ùDgûèΩ÷Ä?‰]¢Ç∂YÔ9ı=ˆB}{W∆;M>˚d≥∏Z€⁄mÔ.ska±¨Ìæn¯Ë˜R/`âZY2 Ü{+€k"£TÑ!‹ÁÍÈ≠MÓé¬ÆÚ∞8nuCß¢57∑®J;mpå:Y“ƒ\îßJmW”kÁBG(LùqπfÁL–ò#Ì4“4£iLm-M°J(J˚öˆ(Ëƒsn»Vxƒ|üz@F.§=9ˆ‘¿y§ív(]”4ºNŒ<¯ﬂ\~œéá«‰px:<”¥vx¥?<>›Eá8gàqékBπ…ÌlO-øàRC™≠#√µ†2K^Ò±Zπ•ﬁ≥J¯UíM&,1¿´`˘Ã1.lßˆÿÊ‹)Œ
±bão◊ÿˆcSÇÿà.“úx’r7ôÓBècBb¡U“x˛ÌTŸØ´£·ÒÁgG«‰€˙˘5Z~xÏò;∑?~Ò¸ã£ó'√—ëÅΩK´ëˆâyı¸Ï’19˘¸Ÿ˘◊ØŒ‡–∂çÔycFÙ('l:3rî7™ÜuÃRo^ô§[âgä∂ê¿P±¬P‡Çg'ê°+¢3B4`£ÙßœÅú5–§◊◊•Áx™∞3∏$KhÏ˝\◊,ßæ˘ØÈ∞úOO¯ï«<d[®ÏÑÖ£∞˛Øqe9Åî4GR©∞ˇ(}˛±ÙÕ{ø "ñ´Ê ùJê“Œ~$ù‰`sä_=Füx‘j«È>ÌF≥õ ¨9ı•Ë‡<ˇ:’Æ+íÿR0`ç…3–2êWN*∑˚‘jx√ÕπK¬æ!—"g@–v@¿Q˝†∆Æ™[Ô¨ç’j„˜™Çñ?ƒ…√]2ÓÉ‰‡Â´CÑ•§Ë[ê÷Ï~7<+ôPT˘}p§Ω¶´3¿uqÖrvÑjò:ÂX Q4f,5xzìj.#–CÀ-[zz”¯¢˝¸´≈¥˛|ÌãˆÛ" ´Ú|ÌãˆÛG¡"ä”Q—ÛÊ7Ì2B	ïÎœ‘òzÉ)ˆ .˙Y :“Å8©˜»0Üôâ4!G>–”ñ°ºÓ˚›,-™Yó¥)QFö˛oıásÛh‰0xµg`€1¶Ù´Znã◊ÎÒ3◊˜
∏ÚÜÕ∑%/4ª@«∞Zí{4æ∂Ãmu—¢¯ú≥á-ïÙ±˜eLß rPX?©¸È‘7oFï'òÓÚœqtâüç…ì∏MF„W®§±M7†*SBúïu~yïªœî–*cÁuÜñ§»kØôè3ø#.ìx5˘’√ñ∂Zyvªfô+Y&¢	k‰Ωæˇª?ê”/œÜœ»Ÿ´ìÁGËô˙9(££gG® OéûçŒ^™u&C¨∫ÖYÿ∏Z"@›¬L  ≥ °—ã´˚Ÿ<ÀÈ«1‚ﬁí'§œ}Ö»≥Ãœï⁄–¡KÒ*©Î∏“?Q‹ë‡ÒrÀu :4ó˝„0ZPÎ$D¥Òé¢—	F2âZñ‘»<!’!$ò”Mcr
*˘À∞±ò{;f¡"õk|àhà!0°¥»—9úÉurHìŸ8B≤É¶+Óÿ‘„=ùœ≤∫ ﬂ¢l.`¥H3lØÂm%]1›Bd0TÏúCR6∆€H3Ù-·f¥,X∆≤≥|ﬁéè3∏ˇC≈W-∫¸Á(6S@ì£pÍMhä(]6
}ÅÓh¯í£6QÏñnˇ¢ÚÁCRê˝‹A˚aÂRjª—n´∏≈’]¢π§÷Q>ÖÅπ =5UWô’>Å*ZèÆ”
îªmÓƒ¢y6xUk9Å∫?ù1‹Í=95D‡,ÖP‘ntTŸπ3TÖ]¬ =§≥ÿÊ“Î˙πÁ√~–«.˜õUgùw‰2√C}˘7∫dÒÃ%⁄P∞„g∫Gæ˚Œh«µ5@√ﬁö }K©≠¸˘VÔ2∆©yáºõøÛ˚<ﬂ˘R=¬v∂G3è˘S~ì˝Û8Ÿ'µwëŒË,ÁWoÁàã∞™.≤ˆqÇ
 ìz…–'OÁ]}å≈;'˝èp(k†Ê†õ·VH}˘î	√aåAÏVz…G?∂–Lﬁ\•)PDƒ¡|mÎ21"k.®7ÌÈ(ñ*Öˆ1Ì\›˛BµÔïƒ±ƒ=kB£Ÿ‰>Áaî≤üurOAQÇﬂ‚œÀÖ~ﬂ≠9’;QMyî…”*Ÿß&2!È1?ˆE®§˙”n yÆ‰[º‰37*.æ3-wj∆L—%ÅÊ„”QI=ç”≠rÃ¶ŸÑoÃÇ˚D,5|$øÜˆiÄ@B˜…¶∂r†ŒüQ¨∏j4Åz≠d±Öoˇ”¶ãá%í;-ΩUΩ∞∫w"ç9≥P«ü∂÷ËD4í
—(¿Åˆ©èx,Ôëx(æjô∑§)qƒh<ôë{"ãç√˝C˝Æ◊ë‡4ÀÕG”-â_ÈF^qÏ®]$Ay‡
"P‹ãöP’çr◊"x·DÔC∂6∂…†Ã≠~ÕøpJ±'ó≈‘g zá#õ≥Q=˚èã[eÃ‚)ª°tÉ¶‰√ÎÔ°h
~~4“ﬁÉKﬂ"—éööÙ®2Õ+µ‹íÃ)Ç¸¡≤à1Óuôµ6¶s∆9No+^CU)ø∆såIÀ? 'jyËŒUx≈`‹π_mvuÆ°&èª√O€Ÿß∂6=Ly=¬ÎÅ}“^>[
WÙ+4·N›;Ωrk	…“9áà 'ûÑcÇïßPÁ≤—ö7·Æ†ñW"ÎI’)höøäòâÙ™Ì˝ﬂäB¯∫H‘BÀ^:ct™°Li¨ºên%æqà◊®¶Æ“ı-C 4tS<àØú>â›π∑ëŒñj‚h¥\Ui¬≥D“å⁄kƒØŒå·ˇ∏iñÔÖ5˜ˆ>Ä6ô3Ô⁄€D|ùò≥˝mv¡:#°NÀxÉ˜—Ö!<påCƒ0
ªs'‡óX-%hœÛ^:é¶◊’ék“'iè·çPÿT6Á<]ÍÆÊ?ö≤„ÈÅ‘ÛÙÊ«≥˘Zlm◊\ïi<8#Æ
õ[Üà ìécˆS±Ê ≥•~™›¨ZåÕE9ÀszH:cEßLüñWüaº>Ï9òtbﬁRÓúzﬂeFÊ1¸Lÿ“÷"Á’Íõ¢_9FÕ°ï©ÜIÍœ¢≠{A/ºêgÇáâg!„≥êπ›ﬂ$k˜©ÛuÖ¥p6Ø#‰;◊ΩªX#Ö].ÔëËZ∑.u∏	±ˆ&E˚Ù+ﬁÙ¶“∑\£7ö"¥BC≠Õ;ÙvFìC6N=-Øz~£«Gw∏ÃÍk<<ü]πÃt£M÷‹7®r›}|#2 ±È(∑H{Õù◊Ã3∆Ò
0ëw‘òB«Bñ“©éakÛ∆uç)/ﬁ≈)˙‡9ÇiÚáä°á∑.5M…m‘%òº;~|ŸOœê8˜Œ˝+Ö…JWKUMgÎ∂…™\›∏∑\ûÆªè_n;3®O≠ˇj˙·îØBmy.|ÏöRiØ%!Ïñ.M—˝[°≥ÿ{Ôt‘‹ígò {·Q&›u÷`UΩœÁMÓÖù∫◊ä√—#7~¸~ì˝ÂÃx©3”tœœÅ⁄I\è©r”˙D”ºÒ∏4ôv*ÅE¢OßfÔ¶∆pﬂÊ![›‘ÈÓ+€òˇ≤‰˛”qü!˙bnˇ±u«”‡ö´[n,Ei]@,‘ {.¢˙ Û®ÆFœ4D’
QŒπÙN⁄*ıMc"´ Öòx;«Ç¬ﬂõ€ø≥Õë}˚ÌÉÊLé3â ä¿„sÍÀ‚ñ∫…∂øÙ
/ÉöZIVﬂÑrkïÍFÑ€Ωó
Z¡∆™,Kı§›*ã˚©PŸ=ÂâÄıèaÔ¬3≈Ì~VÇ}!;‰i
û™Mj™Jhlƒç;e„¯∑ÍŸ(ƒ_ÛÎµ‚ÓF◊Ò86¶¨¢~ãKóÓ>˙ê•‘Û·»Â_òÔ≥Ñ|Å¶Ñ¶Êô)Zw‘C¿wä– ö7˚–T5U^˝∆3“?Åõû|l’–√@{gDö3≈0¬÷T#∆uL 
ªB†£./π£C@p≈%Rà¢±~õ∞7ÛêøjZÅ≈∏ Wπƒ&{.z¸⁄C¸ö+∞øŸÃ∞˜*A#£)o[∫J¥É.U‰4éŒµàGXÓâò;ûxâü˙›÷Av	Éytˆ–01 \öL∆ëãªõ]õ2ØCó©Låô ∞…gØûΩüY°éXî{„Ã˜ÉûÀÙﬁUën/õŸL”µ˚«Ãè|*√¯DúﬂFŒ7Qá&õ}9®7◊/áƒgóUÌR'«ΩuÇ—∞˘  ˛e„¯+Èd#·˙KT}Vlh)±Ï‘|¶.N¬ÍÉ+-vó·:ï∞§◊i˛îÜl9Ä#H£K/≈ºEâ"wg;=%oí“ﬂRóıS…-t|±´sYY˜[D3ø{¥ù<7
O0Í~/Y,Lñì™µæD~Ÿ÷Ÿé¨›pU«„Ür¬n…ëåÃhsIc‘VFn§Ñ‚B°¡o´ûH¬YoAQhØ ?ª¿VÊE ŒâF©3\‹ú⁄dc’àt{˚Q4±@t_ó,¿µÄé¸îÈm9¶U{€!T6«™⁄X*‹Jø$fÆ…M◊:∑‡’‡E≠ÑààÀéü+!ë£ˇÖòàb"&ı71…-R%Ós78€U\KÑΩÎe‹r'–(êËyí… ÜQÉãÿ⁄ñ@C5÷ ¸£åÙtË›¬í2Z,†≈>Ê†2¶Doˆ:}†•Z™≈pc≥v™ËØ'ÍªàÈ‘É˘§—`g<éÇ7æS¥ ©™u®©ˆ^8ò°~…egÙQ≈Í`±Ö⁄ ërèVÿJAÒß©ÒÇvl=úg„—‚’Ï98Õ÷
˘å:*ÍâAÔH“ﬁOª›·Ó‰ÏBùΩz˛Âó<±ã–∂≠¶kgo
-DQÂZì_#ÒÙlhu∞ªu∏˙X¢M´≈I< ãìòîóUàK’∂:âMy—√ªñÂNaôµÜñ∫Vv€UéG≠ëœÈ°¨5áûﬁx∏YΩ€T§?(vãA,ãI≈]J•√&\›\rZ•wQ,2º(¬q~ük%á%°ûÌ ‹∫mL"Ü|B	àI¡ZÈ1€ÅLm4≥∫≈usaÕw‚¶3kúÌ∏Ÿª+y	~`]®Å⁄Ÿ)Òﬂˇ√ˇ&«lÏΩÊ™j©¥j„m´S>€±Jk´v√Ö+ã‘üu–póÙµ7∂ª],º.ˆ[ë;A ßI,œl¶≈o+Ç’°∑4&¡´ƒê˛‰ÿ9Å˘¸k:≥¨òÕ#Ë”*ﬁ'”dº∂Œ/∞se.áfM∏ÊoööÑ[ÑôÉ—ÌSW⁄|πµbÒ≥≈ë€|Ëxû+ÌvπDx4ÛxŸ3ouqo3ÍìSzÕ±o_,x"¨eÂÎ«ç{g◊sÌvHUWR-xç'ı8w›AÖ)0ÄNÊÂêûÉ™"oxaŒDN“{•ØÇ+§\ºHÍ@π˛Zƒœ!é#àˇ¿EÀ@≥VòY≈˛`£qQv5≠]´◊lSrWN~◊»Ä¨çø+•ãÓÒvç˛6¸lxh-Pj¡Ô¡2œ≤–1Â“ú[YµúÒT/gº…∆õW“CGﬂ)QƒÖÂ;Î[ßŸÀìŸú‘ze˝4{ï-9úÁ∞5'’Ûf9ë◊AúuóH≠sı·['2–HW-EPù5H¨®—ﬁpèÒuv@,Æ ¨£SJÚÃ◊y¶kd–7—@î©
>f#/v7À‚9á5rÛã%‰ßæ≠ØØw›…XV∏õ±hU™ÂwnJ¢8Ì˜inØ_3ê#ÑÚ.6 hÑ—·ƒ6\g≈"U-<\
ﬂ`çï™ñ je5Ÿ∞%∂*ãÎëQ9 ?Y?Í¶Ö∫íÊ»8Dì@s≥[˘.î˚ú∏/ÀÄ\Bäî1ùFËj+ãòa∏Z÷"UÚ
'®ì–RL’ˆ¬-/é|´“1WWÉÔ˛cìÔ~·¿›)V†”\`9c1ìÑ«∑)p≤]Wr/-®ÄbíÂi∆$a{õÛﬂ;iœ|ëJÔ›L˚	ÖÖG≠ºÉâ{ÛK1ân1¡‚ØˆãÔﬂ›√Ê>nÓ∑=ªÔë=º‚ÁAS/›‚iÍ•·Úaøhûºo¬ºEzùÎJ˚›€Cÿw‚n≤dΩLπ˝hóﬂP,S_ ∑ªM—∂{[∑Ü¯}Ì€Y gÓ»à´+Ω÷ƒb@Xõ†ÖqâiÏ‹sMÄæ®√ØJìX;Öü≈¥Ÿ
¬2›D∑b∞J?÷¶ë6ßO"Wÿˆµ≠€ÅÎJk˜¯∆`›-ñ‹5†ÎÈóπÍÈeŸ∞∫â´ ø]¯·˚ˇ˘:2óPµzYÇy´|Éï˛f,úZìÏjﬂ≤∏®&ã\Ç-‚s9√°@	ÙhJ>&àÚ›	hÁ£…u8!À22IáÎ„ËK›}	™û„µƒ,Ÿ7"oÎΩ§^ „ÌÆA∂7IÀ∞,r Àp«%X’tÚ†âe√ƒ8ìkK≠l%wa©◊ØJŒ¡rGYK.Ô,€Ö¬"∏lPd‚±UR“]æ¨>Lu…≥]J».…!®˛⁄zç^HäìµQ◊'~Y{¬“Y4ΩK◊zÚˆ˜å˘>0á˛àÕ#üŒ÷‰mˇ¶çDGwÍßuŸé/€\æ}ÒÚpp2|˛j¯lÒÆ≈z]ˆ◊nø]vÄ∑ÀV\ù$œª±<±∏ÉDèeeR=ñ•F—ùw÷LA≤æ–™‡:HÜÜOQ7ï@ï«Z˝fQ∫ä`]≈DBnZb◊”ß›%)t6VàR&mXÓ§p=ÂI˜ùÉ•Íh-¢€…¬[Bˆµ"U™JwıA·∆Ìg“;®ªeLˆ†Î¥-£%9y¥.›Ø.v;∑õSﬁ˚†ÉØØS§Òê
_§˛àãáYÁMªÔ≈é°:'Y qN»Q,Ì€VèJ~ÎémZ¨wÁ6É]Áˇ·˚¯|÷–√ÕËõ¬ÍÏv”o|oé≤qÄ†3N}6¡R‚KW,OEÇsDE7‘ÓÊﬂÿ≠€ı ÎFÊÖé∂Ô
¢ÍÏÍZË˜¶lÅx·rè[çö¨ÜıW√%õ≤M3‚øƒ$≥JCãI‡É˜˘@ú»Ø! RJOzËÄz˝≤e∂◊4Éøb±≥ëK£ÿÂXbqÂ´Ôz˚]zÈl”KÍˇ¯w`e,?õMà.´Û’nB{â∆Ã]#¯f‹ﬁÜœ=ıç‘öÆÂµjfÛ<?DI–π∞I~{ºc÷ÓÎ≥$Uã8®aÜWˆ-≥ø ºòŸ=//|⁄€qπr©ßdÇYçfªj∫‘ïπó“´!wA≤U¶3Y€-ˇRµ‘Ç~∑[éÒ.8∆ºKµ‹J:‡n€,π≈’ﬁı49\µœì—˙∞›§∑÷¸Öè4∞ “í&.;|π›N~t&36ôè£+JÃü≈™d]û]=èRfA•µm›ÃÊQæ®‹ﬂ≤éF5ûq∫UWú—pœîﬁ¥,N÷µj∫:i´ùéõÌd≈ïƒd¢˛&π‰Ø3˛o}+Ÿó ¡ò"å g4?aAD6»5íÜé°€9∑<W›,:º≈FÀˆÛöÉ)ŒÈî¡¨π∆ºéàEŒÊ1Éµ‚9ãàòf«Ä'ˆ»u=ÈˆƒÇÕR„jgôÔ%Ñ¬¥—>^™rw ‡D√∞|O¬»`qπ(6µYõ•‡ÑŒ4E«¥¬ïb˘QC,.«€≈dh≈≠v‡≠N
ïÿ~	∑rÿX∫A§WÂı5˘Ó;Úë´†T’£Ú,ì¸#±™N⁄î	Ì^.}†ÑiÖ0“ñãR∂§Q†ñ±•vß#ø˚ƒ-ÆA‡â&äVr–{[6≠ÃäíP€N∞ˇÕ¨÷[[∑⁄õ˚ŸrÃw"‡Ó∑7K€Ç¯“ˇ˝˛çåº ]üπaÖ:_“ÏÚ⁄ˇJ>ü'lûÅéÑµbh¡Ö¨∫^≠ÏŸ'ﬁF≠Ï⁄˜ﬁZhWm^ÿﬁøÚòœkuíÊZ„”˚'o7¨‹YR#á»Ò’∆™[E+1Õûõ-∆åoÃüË¿∑‹ÃÄm#‡)LŒ8äÊ'—î˙9jm√-¬*ö¨ÊÇﬁ¿Ï*∂¸JÑÆ0ÓVÖB∫⁄V®Ù∆ß“ï^;.ΩËä‰Úl¡{Ñ-8£P‰À˚∫˜Ä
5Ω‡yx!uqÚ}˜}À!DV÷π•@@Èp±N`©3>W∫2|Æ¥&ïdî•; t˝á¿Kw8Ñâ∞ÆUpó
ÉâT^8v¬Oa…ìÉ•√È¡≤∫î∑∂Ã)¬Úˆ`ª?^üƒåÁ2N◊}Ù~àÜ‹ßÂ/éÓ€]ê“´∑ãÛê^˝ÏQ
_¸ï–¶TÆ{Áµ5ﬂYGN∏ﬂ18bJØw	ﬁ‰≤ÿõtÙ≥Ê∞“1É„–±.¢`,˘‚€N˛ü{∫lR∫¢Ü˘m»‰®â\Ç.∑#µÍ,>”1(2ıRü[ﬂ◊CwÛª(›YãW†9∑7Ëõÿ—	ˆ}£q¿H”ñ¡nÂ`[¬#Ä„Ó\háÏ6 "D}í?@Ã·•ÑV⁄∑=∑o¢C7j~rÆ»BkèdØïüçﬁ.l˜&+K7‘"N+>D¢Ó0Ô"<˚g—!3†‹¶#Ω˙§„«“Òé!:~¡‰Pïì£#o_&–Ï¶ˇ¢ZÙµtº®…˘‘%ã`ı◊÷Ωp‚%H˙Ω¿õrãNoMõ[◊ÿÎ˜º—†Ô"2Á ≥˘2>Á¨¥Rq˛‹ÁñÜ˚DJ¸É‡‡ù#ıÁ=4Î.[za≥îH?©]÷(ÑPÌÒ◊ùÓ-X˛∞c˙foü¶‘ü´-¢^ËΩ˝›=X◊d∂]“Ö÷9œ˝\xb^ﬁ_Úß˙]wıRg±õm·Ì)«ø}Vä≤ˇ{e∫vµFïΩCNtuK–BÒ=PŒËxóå¯5Äa<Gı13
'ûÔQ‘∂´ﬁ(7<áDë¸,‡{M"≠K|ÆOxæµ”îp:‰97:˘>RÊ$ifØO8NœW@õ`2h<m'§ogh©f7ì…Õ–=Íﬁ)“õ…ø–ïœˇ™\Ôc^ı¢ª’4É9ÖŒ€´ÂY◊•:k©C÷îf€¬Ù-äœ∆|fm∏G™¸e S`vÕ¶ª¸s]‚g•‚óªÈ”È≤†Ya;sœµ©•=\Æ‰ŒÊÊ∆∂‹\Ú´á-[yˆ¡N’e¶ñGÁ2ı√˜¸/‰Ù≈KL£6:˝vHN^ùGGx`??~Ò|tÙÏ˛Tíùâfoˆ@õ7≠‚Ëì;-Ì"òπz¥Ùw‹5”?f~FcíCË({;{†Ïk;IœU“2dß∞x¬öΩ›NÑ§È!¢Õ÷≥„ÃgYí%g$V~Î SùË∞.Ú°Î≥<ÃŸÛ, \}_–HÓÕN„5qÒ∫N=¯zdèAª™ˆ¿X¿öÔxò«9#|1Åˇ8•¯Söa5’2
qG˚Z‚ﬂÄfã,$ã‹-S<Õ©ˆs+º¶™de∫G‘ûUÉo’Õ-	K9ÏÂ◊∫¶@û‚Èóå&QËÙË!
/‰¿
Nœ«QlyÚ(œrü@Lı‹O„åijhLãù |€¬:-	UÕ'P~ßr	¨8l¬â¨8ñ6“w™ ,>Ç¸-@Ω&pSepı©ﬁ;ı≥‰¿ã'~ëºvGõaÛeÙ$ßR˚4ŒîªZ'Ç´Ÿ\˚Kïœ Jû¡^ô[è¬©7A¡+± -@ê$ÿ≠".‘Ajò•BòKª‡õ¢*ûËlDèOı:ÎXt=XÊAçü÷xÈ£ö√≤íå∑íÌ∫&î=ö≥¡7∞≈Å´+]ÙJ+Æ®˚¢N∞j€|Xwqv∏»9ãPè¨2◊nú_ŸEêE‘.ÿès[ ﬁáhz§•±Ç¥⁄=s˙â≈˝§ü¨§]PÔ®≥û∆^ qKÅÑöÒ†5>~õ«N˛\›^U◊Ä¨¿{÷6§Ñ–[”∫Ãì[RZé4yrtõ√DÃ>l‚—æUu!Ì\Ã?q“1ôÛ¨*˝Ω Q,¿™á†Ü´3’Î°tdƒÍ˝y–˝èfÁ”¥FbñfqHŒ©ü0}˘î…Ôûö )£p+]ï≠Tg∆xP˛QÇä√	⁄D˙„˚ºñ—±pH˛îlj”NÂÌ/4Y˚^Iì0ÇbÅç.ü≈,DÌ˝’‚ÁAñâéöÇîV@òÛX]“lJáuì”gÕ·¯Eﬁª£ºßõ◊òM≥	vò@·D†`ê_√K•_«>≈¨œÏ>Ÿ‘6“¡IËßGîT)ô\H“>ÁËz˙s"HÔ@Rpgz‘7€˙Ñt»…G·ub±ê1BÊ@ VMÃ‹…Ÿä⁄JHöAîí&ó"Ô¥cˇ∫ä¢Äõ6Ac[¨'Q¿˙	'≠(x‚(+©≈Ké•lø≥‹Í˙.˝M∏˛ΩŒ?∆˛1ñ˛'»74∆‰µ˛⁄€fäØZ”ÍÖÅÚ`ä»h·{)∆åv7ôv«PŒëì·ıò˛aó‰ã,˜«pho5°U/‰èo>ë¸bΩb∆k|f>À≠∏4[•‚Ë¢'sŒôª1WøŸ⁄Ó›ñûÑ6x	q≠Ω”‚ﬁµK˙áÂ≠|ÀA∫#≥Dxq}ü≠◊«tÁ0àÖÓ6Vwg•¥–bTã?≠Ô2,êxjı{Tqç™ÓÅ∂BqÉö„h¥nQ7.’áÙ<≈+Hﬁ°k"~3ﬁE˜û˘Ì§¶äªAÉøLsπsóM˜ˆFå∆ı´Îπr‹vË≠-Ú ukØºO“kÓòåHkvlµ:F(ç=„†œèFÄ4	âñs7>5:û°ÇB;©VtD´ €˛‡1Yƒ0ΩäXBR¿…ƒx≥«ÂÓC¬†`¸§ÂJ°DØ·¶ïŒ‡4· SùN€z+◊S'…kPA¥X W§rk™Q"#ÊGÓa¿ˆ1|Ë`=vj®;w@ıh∏é¬84ò@†9e4£?Ë+ÖÁë(àÆâZòKÕz≥Çˆj ◊]⁄À£ásÛ8ıéöFPåPR«cS/”sæ!Ë≥ÈIC.wÜè∞ÄFÿb≈
ÄàÁÑ
˘åo’–a:‡BòıGÅ∞ênà)HíKé≥‚Ñ%5¬:ò˝vMû∫Ê®»Ω@GóˆöÒ∞}©œXï3°ö%Ø∏ÇäŸ€æVË ‹–ÒÍ°hŸ|aRÔƒdÃhr»∆)ö*ƒ¥TÓ,ÏµS¥‚4ÍK–b_–™á∆zõw≠ódq3Á_è§cIºŸPv>Àˆr~cÇÈr∏€"0<¢|ex—ÜT”Á
Å$»«7™âÄúÂs["Ï‘hj;&öòNïâµUµ©û›I™ñbvChÿÿ‡Œ–ÏØì!UhHVseΩÄ®æ[ÑÁÄë‡4ó@å.®ú†-Ìπ§¡rv·WÊ£fuEvË∞∆≤k«;Â⁄Á(uóx#âî—xÈ)j∏À¸≥]◊8ASg\≥äˆÑÑ2ı6ŒR7h◊∑æøm˝U7'åA”Dµ3Zøí[68Âs‡r—ﬁ◊Èÿ∏E§Ky∆ÈY<¨b!EPùc3u0GÑ∂’úCéŒêKaÀ£3∏"m‹‰Ú¢cÏ¨öæó±/™âﬂQ_&ä ã˘∞—€∫L{Kˆ3ﬂ1«ÅÈ'ÀŸ«Ÿ¢àÎ2ë]Çûª:∑aâGuôªPÔ∫'I(£Æñ
>XÒ›Û ªÌ¯cñâÑ?|ˇˇ◊i£ªG˛æ£m@ìÎpB∫!ô†”°„£\<˜‚†KËˇ∑√9èœ
∆yD∏‘÷•u‰„∫˙Ÿ_Üä;n_õzsëàÑ◊dczA=i^°s8ìÎ≤†ª¡¢=≈¬E(«aKˇßdG¡"Ì2CΩödÛ9œ≠¬áä◊Hmƒ¡Ç¶r∞∞·π¸"æ«Á˚yN≤O√˚‰Ò`ˇ>y28X€Ì}“É *t¿H¡≠ïœLó9-¨My&ï^R/Ö}˛j1-É¬∫Pî&Än∏0]—|@‹%e≤+
ûÇJW◊8ﬂ-ˆd◊Í,‡0By¯ü\ÒÎ®≥òEae,¸œÂZ™*°ªw®/Ô“BEÎﬁÃm'¸Õ.`Dx‘‰qÈv“°a—ÃÂ€Qçà’ ÂxÒ2/Ïû©óˇ.‰KGD&Öfæﬂ©ï[¬|ûﬂ¡$ˆæ§}º$ˆ1ç3/Áç"π„ÓÍ6JÁg]üt{Œ1´.ân’$—Ú ™ÅóU‡‰î◊”n≤®Q uì¡ö∞7e`}!ΩQ^Y[ù¿* k~¯˛èªRiuE∂¥åa∑ﬁÍ5çc¿ï—¢…8z¸Vë“∂#RSZŸÅSq˝Êi§ˇâ∏;ÄßJ¸C=RnÆ8B%Ë©Â*V]-è∏ìLÂU¯Ö˙Ò(ƒﬂs˜ì“ÔDﬂAQ[T◊“ΩÀ’'[Ì«Q§n“:ˇrpDrJCÊ+| ~≠˛,ÂÒßÍÚ>Ä√ë5˜‘
]U≤÷∏•È‰†F—É˜ÛU–%“r∑√‰ûÇK¯∫Ωàg˘5À⁄î¢é“–=Tæh˘Ó!ÛES§,•_©◊§(ÕìfΩ4¥•˚ÍË=Èlió∑ÇÕﬁz…-˘”ﬂ¸ëÚØ›Ô3Ö“ª2ˇq9¿2ª]…Õñd7#r!ZøJµc∞≈õ¥‰¶çqZΩ«´%÷*ºÂöŸ∂Î‚ZÕ?Q7J˝Ïüei∂–NæIj2•C≤á9‚Qúí†{‹/h?∫r¶~<K`’â‡¡¶ﬁQ>≈˝∏ZD€D»ˆf;∂#ûª+Vê”4KIZè‘O˙ﬂˇ·øì}{0)√	ç)πGæ†Û‘≈ìö”ÑW⁄nFcy úÕÅ. yÿ∂ê{#R~=Y&Óãå˝h2∑–ß<qöÈ±›O©˚û{˛*AGx›nîZ4¥£GÅ≠ˇwÂqÔz·$∆¶ZÖ˝–ç≥ÏufºZ˚pW∞Êçs[»°èI”· Ê®rÔs	A|•¿ƒó]Ia}€ãh¯—∆KøÄ}N<åƒGÕN™	:u´Ç∫d£∆ê$]p≤∫nãè”™óπµJ|⁄>_5˜õ¢7@íçØ;eñ¢A.≠ƒm©†°GY[L=]ı6{~”ÊaXÿÏr<ï Â«õe§z–1ãã{¿Ÿ´Á_~9<>◊DZ◊:Ó‰bèoà`Óëÿ’‚b¬v˜„Œãì?w—¸
Û)˝º]L‰F4òj1 √Tãã+åÀFp∞¥j∏ÇﬂrökFÌ?©Ú[∫oW˜πsx^∫dIuﬂL´€JKn$ª˚Ä[∑Ωô•|—D€~”€R`=¨”‹Õ&äoC∑	¡îæq6ÁA3º%π50$ØΩ9≠∆∞:≈≤†ÖÚííî^xÒ+j√◊3tûê∞∫Ê ªç∆»ﬁÖ	ZÚw·^J∆¬øÙ.læÑj“Úy˘»Oá—WT≈F∫´/≤xÁËh4$g√}‡˝√ÁÔáÈw¿É™ıú˙”ËÉÂNrPoá=5YÇŸ«€:ìy≤SÀÉÔÄ.;∏∫ªNÅJé}6}jô/≤˜îX“)uÃûñ;ÀÒt≤‰)˘ˆ¥¿5_∞Ì∞UÑÛ2aLÌ"ló¥ 9ƒ%¬∑6ˇá(îT˘ÑÜıÌ†-bÿ•Ñﬁ•óŒ¶1Ω§æÉLa^{}9ó÷-jûãSFÂÄs9@∆≤#0yÖV◊<É+¥ÀÕ3∏A™KæåÀp5Œ7ﬂÌªyﬁ‡£≈w≤Ã"6]2Ì˝õAuÚ€Ñ"‘}âˇ›xÚm^.ˆÕØDnr¿XÿÑ‹+ƒ?∫ ‹CBoDi≥}BÌ&πë¯Ñõ◊k˛6âŸ`‚|˘X§è±m%CQ$Ç 1ª§ØΩ±L¡¿Â»Øh˙¬H‰j0,ñÈÆRã5q-∞&0`m6¯f{ªÈû§ªJÀØˆÕR›]°( Üg`%∏v±–%-ïYaªÊ#Ê•·€b∆yË‘´Æ9XøŒnœ[Ìaá‰ÿ#}ﬁï∑⁄E˜I<C3˝|EmœúfÊ(rËÿi∏6⁄„∏n∫ôˆ$@ü› bï5‹¡@ Yp BÁöH∫ 	— AµûoÔ¥GKbÖ‰≈Õ§%"sÈîíÿª§◊4-å¿xL¶äº∏Â˙s…ÚÁñY˝á>≠ØØ/kT^¡Ó„c±?Ù;óÅÄhòˆ˚4∑‰ç◊ØHB˘óh"Å±"™ªMÑ–"/ÿbÏ iëó 6o9·†˚™S3ÆÜMhÊvÓÅÂ`#¨h ’f∑¯	gﬂu–ù≤aÍ˚lWÔ0:Œç¡wÕø ±u‡Ù≤A«(ÙºTÅUöÈ˝∞'õ%ﬁ¥î◊oÓ?ÓëQ7Úsß˙DÇ∏∞Ä≈‘ü2n˛7∞‡Ü`ûˇ≤’=sÙn£ªó‘{c÷EM]Vc˚“J'^Yªøióø©ùŸ•=-yf„.Ô∞·‰Tã˚ñÂd‰nª&¯ﬁ5t´µöÂI
(«dÊ±7”uü]/oÔœ¬(,bñ†ïÏœ∞è˚lLÆΩ˛˝ø˛ØÔÄ≤ÊúçΩ◊(Ûj«˘_Ëü˜O≤hüQqÛ√˜ˇ_{Æ¥Â¿°?àò4˜EuU»ü^1ëÔ∆ôZ[ IË≠tiâÃËÀgEÔh≥mñÑ•/ŸÑyãÙ,:∂ïˆª∂ :[#Y,:«a2Âû?∞£ªWï¬ÂnSÆÏ⁄“m«∞D>k|≤é¶]É	Ï)¨9à≈¨∆s’wûπé}v‘ÀK:¢Ht/ømßoK4J”cœíŸ˛Ë˛ÿa§]∏F≈¢"ê„	&∫$∞ÅÁ]»CÁÛk:é”ï0˝ÁƒT≤p⁄•“∂¡]SeL»§“Õ±ÓU`~ırØ∑ÆÇ∑›∫«	{´Ó 9DVÎ·Ö‘©‰πz'Ê&Î,¡#Ó¬%Z|bF√©œZ -øÂ™è˙ß≥æíepÔ¶àûRÁ
TKî%Y)æ1j5Úq◊Äﬂºt›V"j∑"V9ÖÔñ•;5pÈ-ãõ-®“¸;ï_ ÎÎE!‡∞º÷:öÚ-™‘mCﬁ	>'/ú¡◊ª#GWI°}“YZ»°RNÈ5Sy”ΩTOTCÍå¶ÄÂ‡X–;ùDˆ;øy5‚Í÷;â¨´Zó[Ô&∏ÆLtÌ,ºv¡∑‡OﬂIÿïË•ÉzÕ¢Ù›∂yBòe‹Çµ≠äwu„\˚ËüiÛghñ%D◊’?]Æ?¯´m÷´£óÜ¢Úàé¢|‡N·3Œ?4Ü“zjo#àpã≠◊æáZ≈g◊O«ª‰´(`qø-°À^æ:$¿{Ëûkæ%7tx!Tö…LVˇ}p§Ω&∆¡^ŸçZáΩN ıüﬁ‹È◊≥K6Ô¯wkßyö%NAÌŸ-˛ÏfÛQU*D‹Èôî-øó“ª¢Ú¢˙z¥›~Ä™J¥ Å+kó1]h‚ì‘>ø{≥-Õ¨ÙW—Æ1,•àõ‡5n2úg!©Ïë˛pú0†dÌS∑∑1{†ËT€9=˜^©Å@´Q·⁄#4 –û˘à òajª`Ïqg≠KÏ‹úw.”L•£#é!ãQ≈ äÇà˙ ét§ÿåó¥}}´/Wcú∏°S®“jjqõ∏≠Tˆ>ø¬Ëı3j0ãì~qT’7Tu¶¯@0EÓ±q”©=§— &Áqw%»)·€îQø…"8 •*'∏´<v¡îPûﬂa7¡€¥¡ìùDÄ<˙ÿ0π=IJÍz]Ü~DßyÍ©∑ö¥D\„ˇ|éx µCp0˙ã5}6>˜\ŸB´Öa˙éÇ ⁄„}Au˘’¬‘íœã ü«qõ4ÜfÖë–,UNcˆ∆có≤Ê!®”˝o~ß¸(©Â≈ÇÖ˝4Œò≤ÜRÏ¥±ÛòLæ≠+ÿ/Ôyc;nÁW‹Ã~î9Óh1∑wﬁ—é)&UúrE©#øà‚ ‰ô`LgØ‡ü⁄ê–ãvMì:RáºÙêt0wˆíä§wˆÇÖÌ§’!Ç1ÙKªg4 f~ñxÒƒge~Ω'.}¿5xD7l
ª6º»•≈#µ+◊g§«g”≈ºUYµnjπt€≠¨ÿ>ç3ÖQV¯Á∂ø∆w)iÂ(^ZXÜòÅf≤uﬁpKÒ9Õ¸Tg¨‡$i»ı‡g†”ì#˛Ù	»≈.§ükPPÂ£¿gú≠πÑm™¶¨>%ì#W2-Uoè<RV“õãj”;ÊI∑@h·2‚íz(Ù˚‰ô”òŒaì§c[ %9ß~¢[ì<5ë&Øz÷”¯Z;\ë÷Ò0Y ∞BÜú◊0[÷ÑU‰‘òr^ﬂlﬁiuœl¬±Ÿÿ≤Ñ≈Ë7≈+˘óÕ,T÷xÓtA¢DïÉ¸O[ΩÖ‹¢ªı„›wIıπ2´b2˚¢˛?öü7¢_∏`MmF’q∞tæ∑ü√ˆVÅi9|UIa?≤ÿ¨ô∏°O»rm&]G€Øfoùd¥±w˘Kp]O0¯+µøÈ~±vRÎÉò›ÈX◊Î[Ã›Àƒ.«pπC®>ÇÊ:]ŒúŸ˛÷OU8-åô7·è˛XŸf!ﬂa$…0!5ÂùSè¿—ÀƒLπO¸òó© {’ÁSÕœ…Ñ¶ìpË8vGŒX¸‰†#	ı
MB pkI -æ˙ú^FË(£®∆bSnµ	‡Ø¢∑RU∞¬-Èî®Î”1Û[™NSÀydHÜy∑…3(ÁtQ9X{9ü¶/wÀ≥ø ºòÈbUÍ	√eè£qFF bë!HÆtvüå÷Oµ¢2{xNÅª$ˇB÷Y&g¯ïHÆáˆ¨Â¸÷‰\â[ld G»»z≤¢J˜‡ﬁˆ‹/ÏÃ“™¿˜+ˇ¨æx˙–ˆË'É°†”è˚[≥‡ı]˜gQÒ˝m“ùüÎ&-¯Û≥Ë¬S{Ù|h€≠°îSÕO®√∂ÃGË∫+µbÑ‹≠y{&—ßæèÎPÔÎ1„√Ío¸eÚÎçã˚§◊3ƒØÈÆ®9π›ªÇã∏±ÉÙ°Ù‚A˙∆#›ë∞û)âáe8S‹85B„î	ƒ∆—@äÂ3“ÎøDQ„KÇÃÄ÷NC^ë]xúø^\¡Úß…Ø4πÎÈŒU7€	zÛQk¿∫©©{Ω.‚>|èO‹ÚÇB∆ı&i?¨\{°gÚßŸ≠dnu€VG]}›P+Ñ*W{ª≤œºﬁèÉ{ñS‚kÑlUˇ(n‘:’q2Â]µ$(\∏6Á@ª˙]Z	
.ÍVLÂ_GIÑj
Óõ◊Tn√î•†∑,‡
±ÿP>äàzŒ¢$ÏÏ¸¨ßﬁπÃ:ø∂Npª€S€`æm
¥ÏÖç„¡]&†]t∫DOπˇ>X9ËôŒ…´pöÒ`¸cÎŒ.8‹sˇ’Àgk&BÆl(!ßy_Bº›2•ÈøX$†ÎS_«ÒMAw%‚YÏÎóRõ•È"Ÿ›ÿò∆ﬁ∂~E>[üD¡∆πÁ≥çııu“Áö{KhôUÖ¸q#^W⁄«+˝u€õ ∑>È…ú2∑Uq°ä±®b<VLÉ y⁄}¸ß¸Áˇ¯˜øØÙN'thº◊î∑iº9iwÌ<‹J<∑&|ªÈΩƒ∏¯˛Ô˛[≠õ+∑í& d°œ_—ëÆ6ßLaìvJ√)¸VÎGó◊Ø‘SY£ÜWW#¸∂W˙— CâbmD∑ûDÛH-u69>ÎÚÿg^Ã{¬=tù-ccº∫±ÿÅ*ß˛I+¯J~ø”vg_v9´ñ√‡€jOˇ≠[≥Ê¨òéiÁ·⁄⁄™9æ‰˘œíÖ≤pi˘è†“»p^ ?ˆJÔ{∑fûØﬂq∫dá»h5æXço•ª∑œ@4JRù◊§8ÚqW©«äTE*@¿ïª@muuÅBOb~*Uı6êJMË3ãõ@≈ ®ïÄ^eMÙB>ë.ÜWj0‰õ‹Ÿ3qCÛj3€≠mÑñJÜjÂ¥~}∫¶Ω/c:Õxbì–©d=≈¬¸¿p~≈10’UY@9ıäÎ‹usdo]À¨ËäTu[2ƒŸòPÔÀ,‰hxå° É‘OgdÓ≈•q#‰NçsÈﬂÆW˝ƒ%tqI—pjÔ¨ÔÈemt© ÛädÍó€q…sU #€ ßããR≥˜ÛFmË}{i¨C√Táol◊óF‰B’Ë†%^"–ñ\Mvøv¬	¢ùÙ>≠^î⁄±ı-uBéíéô^H-∞QwÈQÔ”‚âÌ;‹pÂ,J˚ùhéW≥¬J:CJ÷ëåc¨∞éh7ã Ì|pê∫Yå(u&¸9;öe∂Áˆbô‡ky#M”åÚ4©µú-pt¶˚§ €a„‹r∑in»ìÍfü™ñ£√]"Ÿ•/ŒËÿ&wÎ2ÀÈµ∆ùa†V:î>˝Æ#u|êêYÃŒücsè<F≠ßΩﬂè}Œ›#}cÊ?ÌÖQ¥¿ÑÉVñù≥8Ó+lJZQûû"¶k'è~F)4F˚◊  x‹â´F[◊5‹†Æ≈NÒƒ.$¡ò√%“ŸLù¡[ß¬Ü‘ÿLÔ—`jpÑ⁄§5ç|'NtGxéä˛Æäﬂi∆¯†ç[áN<òY|V—oó›·ú˛«IK´5›B¶;tÃíêw	K?og˙úœ9√QT]Ó§†–µnÈU›Í][)‹T*€©k≈ÕrœÏØ®*.f
~é0ZÆm8bs,ëÉºq£@©´√I)πû<’EıF∞|√Ù©1<5¬:Wá0æá8∑\mjB9’8ïƒH<w)®÷«;:ÓÀ :¬„⁄eÖÁ^lâù™óoáËÒ>#√päÓ@π/ÓŸ√ã]dâ∏cØòô>.tåœä$xOÄ…4d·˙∑Óà:ÆÆ]êö∫≈4™ä}9d>s}i
Õ+ë0ıÊ∫·q2ﬂß®BÓº+V∑àìfÈ˝∂ÙlÁ¡(Sèo9[‹I≥tÑcZ¡À)¸§Y∫Ñ£4Kñüƒj4ÿ[ú!w–˝…ŒA≠ÀΩje‹ôª¥òsÅ YáztcÕç Âwc>ãi2€^ñ5Ö€ÛmÊi§6Ã≠5Érl¡—2bhô<*úû’#QTøp«e„◊líâ>≤Òeg‰Ñ.òﬂ#+≠¸>≠¸ïısÄ í[%•‰–kûπºBÓëØ≥XÈ∏*‡¨ˇ  ˇˇÏ}[s…ïÊ_…∆z-–MÄW›hI •V≥)RlÇZá≠—X†DñQ∏∏.¢hö˚∂Û∞≥ﬁÔÉ#1O~ÿ}‹àyﬂ“`¸ˆúÃ¨™¨™ºUÑH5j∆-®  À…sœÔàW8ﬁ≥„¯–rŒ<Yo%ç•1…3/Ù¯0‡ÅQ/!æƒa¿`lü|Å8Z|;/a¥“˘Æ£%“ª£ïÆ˛Ekâ¢ïC—∫mˆô,¡Hvß	Jg2Óƒ—‰%Fª@∫q,·æ:õª Ωù˙4ÕÈZkÿÎ*v}G¢u∆{Ö`î†∏y!yƒd≤@JÜG•7ÒµV°ï˘na¨€õÊ©!Ó√hP—(¥0LΩ}ÆÎ∑‚Ñ54¬}¯GÄ °„DŸhp∑¢RÒÃ
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
ÂlFŒÒPŒ$J”çÚç%ﬁŸ¯∆ˇ  ˇˇÏ}Îr9≤Ê´†9=6’-R§n∂)À}h[∂ŸñdÖHOÔÑß∑]d≈j´∏uiI£Uƒ˛>66Nƒâ˝7˚Î<¬>œyÅùGX$Ä∫„VEÍ“n◊ƒ∏)$ÄD"ë»¸2}æ º3’¡C£ËÔ(Ú˘›/Úô"Q/Ë±ã(±tHo@ñ¡íxÎ¢Il#røêCr.∏g$nKcIh D§å¥Üw§	»CPÈEì%·"-–!ó)Ä"Óöœ¿=lV yI*π†m‡Ú∑Dˆ
˘[e„Åº<Á/At∫?$gÚû¯Ù/KÍAÃJ◊Á≠#Ω‹˘Í\ Eæ>e{DQg?Ûm¡?`µZ]0H§nUÑT…πhXO 6ùÆ4FGÊ¿U0∑≈'ü¢J££˛azˆ√K¸˜õ¡·Ë‡Ù‡µdó'¯˝¿‹*9a—8œ∑ˆ…-vN¢Tø≈Æ◊Å∞$‹ÚR(I«2L¯P<;¥ú»èfxaÃÜ∆ WSÙépl˘¶˛9˛û
.Fàl◊ÆŸójP≤_Éüº?8øEò°√jˆﬂèo–`Ù·T¨≠Øûøu„iÆ9˚C$zàÃ|≠ÿ]%	
ÈìKS®q4‰¯7T[<Àp∏‹·≠á:≤cœü—k√∑Ÿ*6«ò3™æ.€ZÀ∂?Í∑‡4Ïæ˛êÏPw∏bı"ï’^wºD8óu ¢\¢∂˛äπGôubÕ«∆ôjFh‡˝’1Ωt7^ê#%¨b<b´X¬íü™ﬁÿ=@Ÿmc~õ¡L>|¿¿ãÇÍÖËzùGË–2œ(Ä]D›Ï§€0∫c\¿◊vëõ”œ≠Ö5∑>S∆é-UÚC∫Âá∏Îg62m4<:¡ÔfSt¸ù úÄ%é‚Â GFTÉJ‘dO˝¯À;Fh“â¬ºst&>≤íß«}U/(sÄNÀ¡9-q4$K(]ˇpHéb¨Y%i*ßhç∏¬’a]ã{Ù∂"	.¥ÕKΩ\X`<ïÅxñ·—â ’FØŸ÷ÄãÇÁè˙uuÆ^¥\È+·ÈëX	hi2Î‚ Uƒ ZÜNQ•ùıpñ&W7í‹˛hıA≥"ÈgﬁIÆxX–®	!v¢–¡”â2◊Qu`äÍ¢Sî¢IQ¥–róªn„¿™„∑M :ÆÈπVÄèT‡VM&¸ØM¸ÊÅ
#/¡¿˘V8Ò@n4xw/°%∏G£Ù,‡∑Õjk«õçñË¶ö&ÔƒáqﬂJà`’ﬂe.»êL|vÛúFIã
§±”¢,¢ZÙ3ã≥æmI™&1Ÿí_…ØIË∏®@&†\T$	3HÉœE%“êtnâüe”gWxÓ0÷¿)/|⁄¸yu;ñ…L{è|*T–•†ÍJ[áåü¥y¸RGPîÒ‚ÁoØ1±7Ë€k“&| 	C?Ûﬁ∫ApKGMÀ˜Eb‘<^7Áç|\\‡33ÛΩôF.Ònàå3+|√ÃQ˝0¥ÈÔáﬁYê»°†p¨9∏‰¿Ö£∫g‚¬FÆä$Fóí‹π+ê ÀmÙ◊rq∆ç8Ü$˘ı9˚ı¿5·7ne\‚∆§!¯‘=Àvî[7À±.Ìiäù@vÍ|8çÃúò8¿€&Õé{Õ^Û®ØÀâÑgØ'¬’≈ßpÓ@§dœºπÂ{ﬁ”T>#Ñœ⁄âÆDËœ©dïÈœSC+M˛íÚCRÑË≠¬r=‘†aiØmÃÃatn∏·¿∞¡ªÖ¥€m<YbEäçt¢á≤zµ˙;»ºaK¸2X!‚Z“”{îﬁ^Ó/—;7¸˘∫·[®· &J¬$ÅÏ¯¿äk´Ó}ﬂ7ÆûÓ’…ç≠È ˛…j’;∞
àƒ‡Ü&%Î"Ù#nËU2˜ôµ¯*âd*V\Aƒ1_¨[ú &aS¸_<rŸﬁîG±:≤Uäk2Ò_Ô”ˆã/JB{2E√é°@Í‡ËihèÑÄ°qnáK@Í®K¿‡Ô∂ªd˚PE›Ê˚Œ¬X≤y®¢nÛ#Àwå˘ÿXv
íz§Ñ(YLB∆áºSK¬ﬁ¢ªæ‹_3√÷ÈÀÏõ/‹z®#$L„–UëF´[iîwUîÒ® oràP4HπµNÉ‰ÕÍf¯sUêVYix™˚[Àµ|Pg√ôÖwÇ	÷‰	2¶7•5#ÊeÅO˙»2ë"V%Ò‡√+¡¬öÿS€b∆©ÿkÈ9W ¿ß(+>…AÄôúâ√Î°M æƒ⁄~«·DàÀw˝D˝T*Àq ˘7± öè#'°ÃYïÜ∆jgøQÖåÎïïégÈMÇ«´ìï	$◊**
'áß^Hy¸ÊR™Q¢≈îÜ†–-ÚœÈ]±un…j˙&â”NÉ≤¢ecÂl£Øº9>ı[Õ1˘rMv"tË¬(2~ÓvF¬’π ”±jùöSvc$√>jÙπCcÓÜOïòE$ßœÙîüπ˘·kÚ™ÚÔ+„pBJc˛G˘È6?*EÆó(&àñ˝‘∂CÚ±Dcj?mv®Q©á?VÆ£¢…Ç||^0gT\õÃ–ë≠ÒEŒ¢Wür-é)π ‡bõæÎeŸ=Ân°ﬁø¶ÉÍWHıxUÖ˝
âbÆ™ØØ_—¥UıçÙÎKµf±_à¢5¢g‰[îΩ¿;ç¬ìtwÍƒ	úb'Åñ°àDÃtì/∫¯dIÕ≈b∆ÀU¶Tó0âqíkö¨Ap:b'Q$◊RO$ÄÑË öØ£ƒ‰ÇˇBﬂ#bÇiìXï §wGY)⁄≠D;… Õ{¢]B|eìg}Éßt´;ıLùù
3ßmˆî!W”`Èj€B',ö:Ãvª-èq„ØC›“ÑÛÖRîÛ%ü7Ò1qq[„´‰êÁ #>≥Ö	Ê=∂YÇ‹-(ƒ2}ï¥√îdPXô˙^Tû…∑íª›\5`ÈÌ$:Jˆ'©πU¶∑ã±Ùù–p‰gŒæúqSå53\”±‚@ªˇr8îûûa4í∂‚€Ó}:"¸â¿Ω≈”’Ÿ¶qé¬¿]ö¯FG∞z„≥˛9Òz¡ü F—›µ”·‰ﬂ3ræÑÀæY8¡˝ôÛÛsÚ€Â‹qÉû∑ﬂ¿5˜Ç…ÃöAknO|/¶ak‚Õ{ﬁtjO,ˆü{„R„¢Ÿ˚çY.zÌã≠∂ÁümåN7N^µÄémækÕs±ﬂÛoZ≠OxNŒn=<ÙÏgA9‹º–É‰≤G")Ú¸Û±ÁùK\Q2%ÉôeÖÅ‘µ∞XZ·ÃxŸ˜ÇF]ü¯V<;ˆÒd?™jH⁄˙@0§Ù±W^€¡¬1Æﬁ˙∂	»¡Ü Á≤Z+P^w eÖUÁäägM¸Ûo>·√ª=˝π’ ˘»DPËÎbvôä?ÌQˇ±©1∑ù´Í˚6ﬁC¯G∑º˚L˜Ñò*X¢‡zç…˘1VB›ûﬂC⁄?›úÓÓ!ˆ7	g`≠\X‡ª÷C‡≠∂«hÍ°Ó‚ûcõËOì±πcu˜–¬0!æ£áû..˜®_õ·ÿg.¶õƒH®2ìﬁ kﬁÖöEµ¥	Ó8Æâzã€«#÷›^Ñ‹~»ã£kmOICsãŸ|;hGVÈˆìùù›gíJY@∆u•ëkœ»wNÕÓ‘∞vR
:ª;”Ì]Ì—6êª~ìcÀòZŸë‹Ó”Âõ¥·"Å€‚‘önMû§->€‹Ót¯¨[©En-Zõ÷f¶≈g›qwº|ãarc¿ovÀz:ù¶ÕÓé7ª∆”%õ}æ!Dœ7D[„s±SÂsπ?eËø >≤ûQY˚çÓVÉ*y˚≤v/˚'N˚«˝v0˙xÿ–…È¡‡Ü?ıQìB„˛¯ÒË∞ˇnç8í <Ee≠¬Bnº ·4˝«˝”¡O”?~›ÔØ†bz∞–»ÄåFN}{-t«,◊nP–6’/ƒvΩõê˚ÊÊ Ω¡˛K-Ì@∏ÿˆèèñç°5èîV–¿'…œ¥äÚ´7üÎQ˚B„-yP∆sEPG8”∫!•‘Ò5§òv(î÷äöÅÇÈ8kîfπOô“Ìåü=Ìv˝∆zØ›$kkâ⁄π:^md˚hó¨}∫ÛÃÍåKµì+ÁÊ`… ≠È6~JïìÎÂf… üéw&úqIoåõ#ù^P£Y¨Õ/Ÿ·n◊‹~Z¢	lË3»/bôH[r∆Vwsk¢—È£¢1©@êái=|xa≈ás,îå…¨ŸÙΩã4ÏäH'ß‡Ô˘Gd©DJ¬IˆqŒΩoìÄ%Y¸º»∆\[nÆ◊-∫ëÙˇÌoˇÚxØQÆwEôç◊óTÂQ„Ro™”†•≠dt∫≠Qç8ﬂÊ;›ó©nõy®˚2—RÛÔtﬂ%˙f˛›æÓª©ÊòØ`TqÇb¶)´îqç‰®f≠EQ#nÖoQ]≤ŸX‰Ë7;RtV$w¯Ó˛|ª≠\8(Bò$·Kœ7DØaΩ>‰Ÿ-¯"è⁄1«é7F˚»µ.–K¸±˘	™¯y]  zØáU√≈¬±'ƒ)g„7◊lœÉ±◊ÌMfäÓG·¥ıî¬Gu£¥D>ÿ?û∂'æÖ5ﬂ„_≠Iàˇnïí€=á∏#oÕ…Õ y˝¿±‡Øf√‡E·≠ˆÃ∑¶¯U‹¥∞à£©·π$f∂_‚ç˘ówø¸“ˇeÙãñ˝hw©˛Ãy	ÎœÒ∑…y·Ê|\àøeáÇõˆ•pπëê<ËCæ«Øo˝ÊùgÜ˜æíŸ<o¸~5¸Àóe¸fó ¡oßﬁÖ8∏¨Xã˝=AÿS£˙iWTˇ+(˝ô)q…±.Â"vËÃq—gA-ô„bµc¢÷	Q–jC4«ﬁ>îÌ•'Æ=R˘^JÂ^rÆŸKŒ {Òya/÷Ì˜rz¯^^…ﬁ+ƒúü®Ú %¯Áj
¶kZ23·≈C€µ$Åé§PE∑ìü˚çF™
6¡4@—Tƒ≤b·´π—ÿ8[Gèç«k7ÍW©&®.ó’+6Eî?ŸèCŸèŸè}Ÿè#Ÿè°¯Œó®v•,‘]™[RI÷^D¡¨…X©˝+Æ¨Ÿÿk=Î§Qr/?aNl¸-zsÊ7RX†[¿ãﬂ'‰P
˛Ê6÷T˙X=7ky˝Ç/{ˇÿ
FA˛.•a‡øgÉ†Lüò”æ9∑›4¶ÈK‘6B˘OXä{∏{‰C€[XxÖ@ÚÓ_∆xÛ9Á∑H<`3Ô+˙˘Œ Y|Ê8Uo- xjåeMÄ;Ÿ«cÃ∫çô{B ΩMÔ¯~µ=&3œsòá˝c ﬁvxıŸz¿øK§˝àójçﬂY†3ïk≈øÕ(R©˚ƒrm« ,∫˜xLŒÉΩ¥Ácõ‡=¬™≈ÿ6¿ﬂ:Ò Œy*i÷ò`ô`⁄4RÅ”t˛wh+#∆9˝.∞Q_V∑ibyjeøêﬁA‰GÜªé~40ÁéÏy‰K*uº3oËO8ï¬/§F…€¿n{aàÊ/˘ùTÙﬁ¬ü∞Ófù{é1„{ùe]5á!ÃﬁÁ[ºR·
∂låëòîéUÈΩ‹nÉ£Qﬁ·ñ:ÎÙÛ0Ûyê˘‹œ|¡g~¶º¢¶Èã’K÷Ù˜˚»oø„/nF)2î–"Ië>-“ó—"£ J	±óÄ^Òé∫-•√@B5r÷‹ZˆZft‚‹¿÷0ﬁÚÓqsé %DP‡˜2\XLè[èuQ‹¸^ZªéV61ﬂk€ÅyµÂH™d!ñåk‚$±˝‰ÈŒæÎÁ⁄d25ß;{˙ff
∫Ê∂e>Â77ùÓNß{˙ÜiçÊåÓÓfÁ	∑π©5}6Ÿ⁄”∑ek47~÷ùtπfX∆}€˘òO–ÊtsÔ1	∞π—∑ìk–ªSZ5¶;ôQW[’UÀw	”∫FOnÕæÆ3ªwgd_cG√_ﬁgT›vr"ªÌ–j
;ﬂ,ˇ®p+ ÔÆ{%jaæNµXË))+ÆKÍœø,å3ps£ûg˝mÑµ~3¿ôµáÊÜfª‡è6üã}ç‡!ÿî◊˘˝‰Ò–:Û,ÙqxWAhÕ[ëùw,L\Ò∫;‡ãóàÕi˜…¶ë]>â!…©6cº–moÔÂ¸Ê∫2è>x⁄3¢®∑bß»€Ñú1›NÁœ{2Iˆ”ÿCoﬁC[ãK|Bâ†éÑX:XIëÓ&–¬:ò|+u9$Ç*‹öXéìR∑€π@˛8æX’åøü€&>√*Z¿ã&iaeïR¶lëCTﬁóëÃln	?ÌtXwH÷P†{)¯m vù2G`›5 l¨¶æÈ¥wî# H√'±íóÂe⁄û.ºSt≤çnmmwwv
ƒÔÒ:Ìï›:üRb%-Ón?Ÿ~{ˇë•€C¯∞ÊÿEõX(µbáU·N¡∫ΩU{B∫î‰m¯W8∫~Ø	›xb4I÷.3ôè¢[,w- ëŒg4«ı]µ&ÜoòHì˙°˜\˙^Çè©ô1…=D3)1∏Ù=¿DgNÃï©jCì¿C∏!\^Í/Õ$îoòv0Aìà◊ë …Jÿ?MübÂD≈i@RÎ7√)¨•M>S±.áﬁÇªN›Œÿ·.õ\ÂO:úU#·`ÆQ(i¨oï∑Ñ‚l™Q¶ôp∂ûˇ[◊g∑BÁ∂º,Ù€¯w±f˙¨≤{,öµõ˜{n8kMf∂c6≠ﬂ,wM@N¬ç“≈âi2¬kI’Wfé9ÖK§‚@cÇZ4CE¬Jõõ≠◊y¯µXΩŸ—{-ªÁr¶Õ¥&ûOlÄxE∏ò¡@Ö™-ˇenô∂AbiÜ√D'LXW±oJsá»¥X±o9˘U⁄õI∞ﬂ»já
ÿñ∑◊±µÛÙ9„Oî®wçœÌ˘
¸…~#)|ì8ÕçÀVû‡∆P‰ã⁄†.ÃüÈVJN÷Ø,Vˇ‘ií$˚çå~áØ‹DëÕCPﬁˆIM±Ò¸=B$Í'&j‚êµb◊nå∫§˜ú°Vj≈÷©OÖ--«ïNº™ƒ%2‘&jú^Ï¬#cæÿCØ˙#¸øcÙÚΩ¢7≈ñb≈K Ã M3éÉπ;g´N&çúê÷e+[7#;û…¨&_úô∑†¥Ç—ã≈Ai0hÊmØfíbXC*9≤ùí/
◊ÖjFT(ˆZÊ†M-çıÜZÔûL∑ÃŒ^ùÒ*ıïZ>„qÃ¨h,„˙ø•˘!ﬂ›ıR„iq«Ss<µV2ÇÃrõpbË∞öLÍg#8º„dˆ‡‚NMœÌJFê£„LÉ9V3ÄIıl w?Ä`ø. -c%»ÃÎÒ ¶+´¿§z6Ä˝ª@jä/†ıÃ§˙Âê›ƒX YÕ(&m∞Q-=ä ]9ß3ßGªU$ RÍvi$P|∫Ç3YïÙV˘◊ütËÎ⁄)Æjd¥ ∑Hµ˜JY≠*ƒËÒ€‹&W˝∞n∂∑Í∆¯›,äo≈ç	bπiPﬂ €‚Fq”øU∑≈›ŒÑ¸-≈ñDR’´ÅﬁSHûZ€÷nÈR1	—#GáU∑iMLs´tô»⁄‘ÏÂ Ú∂©å9Wí’d!“;T%Ê3ÌUb‡“ÿ _·”>zœ"{]wø{íç…ço#?¬Á^`Nº'∑‚∂öÿ› ºÚõ‘“DîéƒèÔΩÁñ>⁄ª|∂◊ÃÏùΩLa&nÿßN⁄$£≠Ì:]Io™4√,_Ë:fb∫_∑fö?¯5M6h¶èI∆Ø«Î`ßÌc7ö„ï?¡ﬂê7¯«sœüêÊ&Û;∫Y”≤”Teûºã‡ΩÕ∑◊9Ø∆õ[„Ã2fHp‘£CíYmÿXVQ&æΩê¬I≈n«±7zúL®πFÏÁ‰GblnÆ…Ã«œ7‰Mâ#≈1å‡¬Û	‰:ÉLèÕs8ó‰#íÁeÜ¸ ªÇUyΩÒ:≈§‡ôéçvo<Œ“e∑!¿ly‡ŸßeŸ¶ãô©°ÕÕƒU#OvìΩ∑∂Vúï⁄∫}Cñö”Lô◊ÕR˝—5£zÑ^øxÍ‘gùÇöÔ÷—p÷Qç‰ÈöÔ2a5„B€@≤⁄a‰ÄÁ9√6X/fÜo”LÏ“Íhxƒ∑iü[ñ⁄»s¨∫Ä√çî»‰∆ñ÷Â≥ÖRs5Ià•mÈ‡’Õu-c¯ç†úãuWÆéç£0‰$\À>«Ñó3)(œñÎπØ ≤fˇZ#ø_*v≠îæ€ﬁAãÀ÷Z\ëœXŒ`	jüy$Îjí‚ó}˜$^AT•˘Mc…„ú°,w∆´/∏I‰ûﬂ"xΩ∏m‚`√é“2G∏c9∂y»K±1ì°É Üº››∫A/ÿ∫=y˝5€s*_ûtæÓmÓ3‡¢´üo´sÜcÊ'<˛ÚŒg|âiéG)?œÁ¡¬Û¡zDßXÿ·˘ætÇﬂ≈|ø˛eıÛùnÜÖﬁœ~Gsç˜0kÑÁŒ5¿4!hqπIñÓrª∏Øú˘∂â‡P§ÇVÕÕ^˙ÁñB-£J$	q"9°÷»k∫¨ˇu¬s«„µ"–8¯©ÿw:uı(v3çé∞bKÁãê%%‹vQ®±$ú_æ 3úÛU!8VµÜgêfiˇ∫iQúz+ÏÁﬁoZm¸ÒÃ
€§zEÌlíqºÇa!_%ztA˘ﬂ…)ˇÒ™ÂzO•¿dVüDAœãB‚¬ÌzÆ≈æÎ Ê‘ÃLÿ¡5¸Ek9élH%®¿™„*0ˇÅk~π¨?¥+x†Ã«Ä◊c}ˆˆW∆Á>:åº1	—ª8Õ4˙%≠Ç2 Èí! C¶Õ·Ÿ»‹J\Æ∏â◊@¶˛‚:ê÷GZ$
mœ#0Òl÷HºµjãPµ$Ü_ŒZ¿\¥!yÂ◊i>OLÛæà3aÁ˚pn]a-ømõ71f2∆‹®∫ÖXor/°¸M¬vUDhupM*üüo–ıµúﬁ,˘IhEROCPÑ√ ù.ñQ∫ˆ”ÇæôW¿wâX‹íàEâ=v[«À¬m‚œê%ñ˚Ö·ñÛ3±\Ó‘îÀyH,ôÅSTï‡1CÈu0EÙ#ƒπEëC1:®‡ôá≠ÆîÊÎ$Î(ãFM™´Ì2∆íùŒ∆ˆá#‚ﬂª;˜ÃYSO-ÆH¸EÔñ!≤÷®ä,ëÊpæAÕÎ8=ÙÕüÎˆ†2s,"·XBﬁ`?ﬂ;k0:jsFŒáÓnπÉë^ó9 É§ﬂìå±& dÚ„Ω3°¢6{$n“wÀÑË∫åAhfLA?ﬂCÕ[ƒÙ◊{g	JFmûàøÔñ%(—uyhf,A>ﬁG¯^ ‰«{ÁFbMvà›ÿÔñÕuπHf‹@>.ÀíüÑß"¨¢ˇf[hDúø©Wâo-à‚Œ0ÊûìâdÎxs‘‚∑x‡8ÆíYî9j¨“M„»¬˙ÖÌ 2#9÷PWç¢èÜæè	r¨–ÜZàœF∆+#∂L -%C t∑êÀ¥Rp≈‚D?Hl'EÖ[Ã¢ëwafôNﬂ\g%ˆ'ô(ˆY~%áâŒlÀ1˚ ¶)5®–; Õß⁄Ωªla°n∏ˆ>èqè&X8ç[õ5-Œ"!)2baÆ∫√‡a•n†Eåè4ÖYêõì§B]∏ÒcCoî°èccVr8ZXÓÑ∫=·ﬁD9∏Wie	L™i,åî„ù•£@ÜEÓƒ§ÿ€d6µ5‘ì≠!=ˇb:∂‡0u@®∑å(ÙTû∆ôà#˙>5ı“i?”`∏AÏ:–Öi√≠b˘‹∫ä?$ŒÄÍ‡wçx%ZŒ¨®ÌùTÿV2˚G™‹<ëcô£ínF{NòAçÅ£,%®J;XJ¸~•*≠i«F	â™b•AT…¶5wΩ”izï$∆'nM˙ÜwM_r¸”$pp◊›^üæ˛]”ó⁄‹4)›!ÖÈëIó8–RÔeä·»ô®/ö‘“7S∂'ﬂ¡OÇ+åo ∑:íUatqM.ßÀv_∏≈≥∏e⁄—\£Î◊2¯f9“}$Qº~»ù›”á\‰∞SSuÌ?ô—)∏^Ç]ßÉË≈*±@»t‚GèqP
3îú¢6€;ú’^æ<‘‰Mx‡k]¢ >ÍpØaê®wU˙'≈π€>lƒCë—\¢*wC√!`u˝(	:⁄ì'ee{ÈéQLÒªÌÌÕÓNv¬ñÓH÷¸^f*c-]V◊•<ô”Ωw£O…≈’“R_‹Uá“kó•{4x=äıÂ;‘ ‹¶/›•—√ËR∫3ïzîı‹∏ﬁÏ‹TÌ"Ö≈ø«nñØ∞∏ùåÔ‡∂*ÈE4˛1≥˘#â®œªK˜yt;≥¨säÅGê±*˚‹(<”ëÁÉ•ÏMãh?®B±…m[•Älëk7`7Gã∞µ[8√™¶Nçê⁄KL/¸˜
∑_ª˙ñc\Zj]˝πÍ∫ .˙û{ˆ‚ΩÖ¿`Ëé7'ßË ◊íüï≥≠”ö6IÖ{€%N’Ù ˆÇ,”˘7]u‹k˛Ï›VÄÊ>EâD˚Ù¶9Ê∞7jX«N4å	’f&6¿$sÅÕ·*o˝ÕcÜ¿{\Y€"ìä’4cûß∑7{é·¶í3…[´ú‰ßöì¨6/÷öd∞Yïgô:‡ßØûe®&;’Á—<¬Ú»û¢y‰€≤˚E]™ó«\ﬁŒ	ú/Dı	~(m_7kÕµ˚5l∑øYß÷¬Û√a4cö¢é¯¥Êv0i†Gè
5E)4≥Y,Ûø=#HÏG≤èm˙{≥-r¥;8äBHÿ¥ÁıL!}è°¸7Ì–∑Áò¶o0ÂèØA™3¸YTP8˛L¿å.,ˇï/§üè°ö¿~Ø(K¡≠nd¯è˘iocö#'"›’#¿Å‚™ˆI!√},Ã·Iá
W¬⁄_ãçòS√	,1πƒ)…
ﬁ˙Üiëƒwx÷a⁄»•îÖÖqç	&:DìŒöº
d√≈⁄ß1jôˆ3!P˘ˆ„Ê·K^i~VC2πæbÚ≥ms‡~x	§XöP »3Z!KRå?5y|OL–âpl€&o(‚†∞·Õó∂„¿XÃ„œÒzìZ≤m∑gF–∑ìÔ÷ƒ4ìT?"·dêö2ﬂbM,º*£˘:”†ÃhéæG„∂1«K∏é:BÚìÍO€‰TûÌL\í»ƒ.çµµ˛—]ThˇõÍÌóÿÿ@oÒ∂ª@„+4vâ j∏†¨qydÆ—'Ÿﬁ√3
¡p?√W4‘Ô4◊CnVõuæ¢ÂéΩπÌB{∂d·KtÉˇ∑èÆo CW¢8∑¸ˇ©êÃ4Õœ>Ç¢mÚá0πpæ„¥”?ã“s˝Çù27`Q&ÙÃ
ÀÜTZWZä[à3÷¸ÿLno€ô>A>”.Ø6Ÿõå:xóLe_—¸ê"ÂıXe~⁄…¯
ÈïΩ©Ooy%B:” \b&¢≈€XR˙∂4Û≠—ªBJÿ:qö~¶qöº°†≈8?¥€d4ﬁoã	§ÆÅ_SES[·¨MTx,ÜH©Ïlﬁ\CﬂA~#pÁ*Û‚Õ⁄Z;¿j]≥iƒ"Õ†ãµÌL«Wﬁ|a¯ﬁA»∑‹›À7∂ï°◊VhÿNŸ´-∑)¬p≤Ç (‹YùR)ƒ[°Jö≥Ìè00˚6[±⁄A6®ÀÇÕ"XjÃ’…∂ø‡vwΩ\ì…û'k¥∆VWnîÈQ|—¿∆ù/7aa=F!øHfJ$`|%?”±‡âûÇòæ`‡ømBjÏoå&g≈,˜•••î˝ëª¢n3í*¿∏ﬁ'6‘ çøé+ˇv÷Z‰’œ\˘Éy¡Wzn¶Ü∆¢1krƒÂJÿS€ Ö≠∞\£&Rçáµ)˜Ë.öo∏∑Ûªb¨ÖôÂ\Î±bÈûùaOjlP{Ek£\Nq´F∫8Â¥q{h43 Â|∂ﬁ)!ó…`/ÑPπZIÿIﬁ¨ÄvëâäâÔSV}1<8˙ÿG£¡Ò€˜˝ë§C°ö'çÏuÙ˛‡∞?DOjUÛ¥XÕ”Z’<+VÛLßmä/@b–,_w./nÁî”∆WyqõÚÇ,-MÑõ»µˇ[dë©±‰q/¯àƒ‘.•ø9qÊÄGi∏‘®∑¶4eäÃÒ#gA‹wr d˝“0ÕÅ ·◊ ¯¨30T>í‚w5:s}7p?¢_ ™z ™	x™Ë#}à‰ÅÀëëG@ÅõŸõ©É ~ìº10õÇ4ﬂÚIE≠¿"ÍπÏÌÒ Î∏n3xØ,Vk¡á8	àU¡∑÷GcNÉπR°UˆÇtV¬AÄÊÕ@3çŒ˝Á?˛˝?Ñ&«qΩs≥.Å/@‘úÇÁ˙»#–√\ªS˙ƒì\:Òvi˘ÖKÕ¬‚3z©(=ØÀyÚ¬e+î¨¸Õ]-¡ƒ£4YÅ	Œ»Ôt°≥È
< úÃ†≥ˇ˘è˚◊ZKP	ÎF‡‹jπUDRñ"hòI™biJcó@ö;‚ÈWgˇ}ı—®ˇvÆå˚É„¸#ŸºÎ`j`FNâ/x2»g
üì”ÉkKRíùàe&jêÃDâzRèzﬁõ°:9|<É:¢62◊@°qf„É¬áÅ÷‰$NäÅuw§„≈|Y|}z–?IÆÌÉ£ó˝øˆO˚w…‘ :}ÆÜùÛw≈”ßñ·ÿA¬ÕÑ{É»4fîá=5ãkñsŸïwÿ(™ŸKÆõ?n^Cã»π3 •/kaå>ø}€èÖ˝düÔ«≤ˇáñ#inePEÒwµ6Üxa†0ƒsíi>6Æà/"Y&cÀâÊxô8ëÎGÓïxkXPo©rÄ)ó∏°ÎÎVˇiÂ–Oß‰Î—$e#õ«C√v[˛ΩÃ‡"˝hπ∂ÿv?xP©÷Aë°bµ√Ã3¶i¯v¯Ù+tù[g∂‚ü6G¨≥GV@-J˙X©>∂Ã„ hÊ¿·…d—¥°dtÄn8-⁄Ÿ¥˘‡.#∆) ¥OY°f}yîv£IZíñ™’ß¬òÂf_]Ö©z3efE}?ÒΩ3ﬂ
ÙÁ;Ã[¨¥†Jx]0≈Ë£≤≈îhÑ]ëh4œ‚˝nˇz˜¶ô∂-
œØ)3Ç=—
axIˆ·é,ñåN"€)P√ı≤]Y“÷ç@4uö¢ã>≈˘ ó`çJÒ.4ÆBü^/‡Wr√]Fúÿ—E≠“∆-ÿ¶Kp tC¯™ #d/R°)Ò!ÓnK∂Vä≠)¬JËÉÙP¢/ ,lù©+Ëçg2CÓÚ›"‚/”+ëN•Ÿ?–‰3˝aæã’ï˘ªÏcu¥Ø§óØÕ{Ócë=5{R:-.ÒÜ+∆*g¢ÕÌ*›X¡Œ\π(¨*ÉHˆa„9	o˛¨G∏f∞ôÓ‡Í
Ø…Ø|W•äÿ`E\?z;'?Êâãù
Fı?Ã¡Ôµ1≈RãW¢„ä‚îÕºÛ†Ã2u«?ìvÇB≠&ve4∂ÀáîŒêπŒu‘W8s åÕ“s¨„·¢ˇ˘zÓ˚ú˚¥A9W»…•#N ÿlÖ¥ïü¯Üƒx˝⁄&`%Çp[oæÚu˙qÊK!®„„ûq°·ÒúàIä è}úYπ˝ì¬£{Ê∂BO¥å´ïÍÍüE7[·ÒÉ*àŸêãeXæ∏æÌ?·2™Aö¥˝o„¿…˜÷÷±Yr¿\ü¥—ÚñÎOåº^ó) ˜lœ4“á¨úÒ:ÎØõIdçã+àP'C—)‚ÇÛr¿°
o(*MØD˜N+√ˇ˘?˛∫'V›3ì®˛Îœ¯|ÿ•˘D;ÌÕDÌüóÓ˝≤9`ö‘∑◊ú∞8º´‰s‰ïn‘EŸÚpÁ∞¯Ã‰æ)Ä≈Ò±q7üµ\i”GDı·«„˛êêÚ‡„¢ÎXë±≠8§ù o∑F•∑`Ü©e)HLi·k^J‚ Ôæáx•´∫ò⁄|æÕêÀbT©ÎG#Ô À• !¨Ω ÛÉR◊I†Í∞¸˛ÕB⁄?0Ñ≤ÔÕ=BmÁ^Oä‰œ˝ƒ„‡√À˛!zˇq0Í®yzÍ`p2B˛rpzÿˇÎ:˘pÚÒ$câ<oÀ^ƒ¯P'i©§ÿóxµ›¿
[ÙwÇàñqÅ–Ï1ﬁyLﬂ[ÄÆüò§d9~ä6*°5,ﬁ˙6’Å≥Pd—⁄o‘EÎi¨9,ı5«L∂É Ò·Éƒ˛z˛‹YÓw^ÿÄnSéˇÂÍQâ”r´õ∑ÈfLxÆ◊"a93ä0xçuCë4N‰j/w±/∏÷ì¬!Ñ?ËP4xávM√7y+?+“» w©´v÷Ô:Ô`ù’æÆÿﬂ∆öiû*		L•°Lí©g)? v&üc‡⁄≠ $wWÚ¬âKŒBgÀk:ÊJjæè—rùº~SîZ"GÌ€ú∏≥Ì‹pÓqﬁb
‚¥ç(mXnz∏{Ôç¿ˆı&çgÇ—ëLˇƒÛ-Dó¯¬8≥ãSB$&Ô§∑lqÂI°}€‹O"û» '!OÖÇôÈ,uW57ú=L2[Ã$M•$\•Üœ8¿àåâb!LG™≈»âÂ„üûÏŒÁ?£95_«úA>Y∆àJ‰Ù†'Î¡nñÕS´6è˝∫\G‘›úË.‡®¶ªKq«œ˝]‰Kù5T>Qc∂Ω;8=¬ä@º˝„≠ˇ√«fØRaı…ø ∫ˇ¨åLLn2cœSÅHh…Ñ∆;<4ú≠SB7HÁåˇåûÒ≈∆±Î`2Û<g ¶;º˙°Ìxg^^*–gœ≈W4Å?Ÿ/‘H*‘
v∫¿z ˇﬂ#@JxÙ›dÇû˚s¨mù˘∆U ö∑8*Œp¬˝∆!Ù‡œà∏úoM-ﬂ∑¸oW˚¨|ƒ_â^¿iä¿49≥»EL%vä¬]˙öWà%[ı"¶Ã:/ôtùãK<ñO@GlèN–QˇqˇtD'˝„◊˝˛±–°+ñOÒc	˝ÆG$ ˝OãåRï‘∏•Œ—xFﬂó«m7·¢ÚÃ 'B”6m∏È<2ﬂû¢ccf‚Â9Ë£cÃç€ËˇìˆNqË≠l˝Y4Lì¯¬DûA‰GÜªé~4.4≤Áë_´í√ W¥lÆ\∂lﬁΩp9%C_“E|ŸÕΩqêÿÙπwƒ M°ª∑ÿèÇSá^~|? H·›xx4@ﬂIä„§ê
“Å¨(H%U•ûß÷¥á˛$¯±`hõ‰Ú´mõ 2(åf≥≥é∫ùµvË}Ñ°£∫"8eÅ∑ÇZﬂË$⁄b⁄Ò¿ö€dŒ≤ù'‡¯E\|”√‚Tz˜"å7 –V™A`Æ*«enFgNΩÑ˚Ô^ÂËÆ9@ÿYúV8C≤ÛÛBöLüü%¿ÿóC◊¿À ‹¯—MY-kâAäÊçäÎZ˘‰L„
+ˆn4∑|{“PAà¿ÉWQ8√Ô3œµﬁ∏≤|Ui‰FU“åmÈÊCŸTf†óÃ:√Yg@k©∆†í#u9?Ñ¿/˘‡ï¶ ]  âw/è¢IÄ±Ö%	Râr),±éÓp%˝˛'ˇÎJ`èHºL|xz\óTıGÎ?„’çñ√R›Ö÷E åjj]≈€s•÷µÜ®¬U†¬ƒ„	øn ©ó≈£q‰8{™Rº¡ÁÓä#2Û"†|≥e⁄g∂™õs€çBK≥¯≠p∂ÍBXd'eQ&É˙Æ`*ù§®=e1Æd:ÕÑvÈüÂtó-=%AdæbQäB2˚Oa◊ π1Æ÷“≥Ça8kÇ"ÓH8‚î ˜7UUc^0øJAÁ®áe≠~»óÂ Æ!H(OÌ…˘∫˘eπ§πIcËπVØR≥”…≥•ó$ùì+0\ √§3ã√hLãÍ⁄W5Oob/zÅ¡fô8Æ
óÒÔ!√ΩZGvúFÈﬁö:¥⁄eo÷í‹¶Åuí;
ß^/ôc∂æRl/s◊N—«W§b≥≥Üs^‚ÉFì'‘u?[I πÿµŸ¥ÇâÃéüTm*{X2˜≤ªèº[∏3œòA’"∞†}/
ú´°\◊Úﬂçé˜ØØ—/øÃ¬π”Ciø$»åÙ&÷£è¬˜N:ƒB `˛LÕQQ(≤[ï¬◊\ﬂ‡™ÍyÆµÆ^"à ÑË¡óëÇWsQrÆ8¸ÜÖ~ñ√‘Àî—›!ê≥âÚAApdQ/raÑd\@ˆ˚öÃ"Hs5ÆhÚ}¨2p[9$ˆÁuÆGÕì˛‡µ ˛±Ça_…®*˚62∆âïT°àf(·”ZxÅ-πMüP„ƒrØ(∆çŒ=ÚÇ·√ùª∆äQœœ}2‘ë5˜páÍé∏ÎÖV†á0ﬂÅs¢qÿ…Lkåûä≤eπ[fUê‡/©?ù.î&˛ê◊’¥j[I*^ÛSd=√5‹ZÖ≥?eR6ˆµôóVÊ@„™ShÈôWeèîÑ¯ÅÓº∫))ü™ü–Ëö∞rb'ØÒ“ d‚Õ∑‰$å,lCÓÍûxÅ\€ÆÈπV`.°ˇçÁüF€ò	.CËÄ÷`‰xg@è–KÀ5çf4pßj„Önüπx?ˆ-D ≈◊4á±  Ωôuß»:≈§ºMl‡#!DêiΩROÆ›“≤3˜{É Î⁄ˇlhËGÓW›x—îô˝
é,€k7kKXªV9…‘oÙÕπ≠–Â+G—	-Ù-}√ì~pIªçöCQœã-ÛÏ"'æåeo¶Ì‹PÌt¥‹}ûQwüMÂqÓªÔæC£É”¡QΩÔÔ‡~ˇs Ò;*ﬂ∆3õı\‚pû]¸ìPLØR„1u≠¸àN pD`7(#ÇÈ·~ÕW∑·“aÓ¨ßØu|∆Eﬁbö!–Ox*∞¢Ëü£óÜyf!œE·ÃB,&ÀÛ¿r¶Åv›, Ÿ¬)˙—#Ó¯h˙‘¨âJmáÓ€böÈÈQ@ÙÚdKÀ¯3c i[∞°e¢…ƒ
i¢ßo§’H^T7?ÒÊ«ÇÅ_[[€›ä«„ã ‘√√{€∆&ø?Ú°E¢òà®∏,~qEæ±ÜÅâ™±ÕW5“(˙ŒFw'†∏∏lÌ“)’≤~ÉΩπ@Ú˘ÔEû/ÎIdJ∆Åû/t∂@Íù\ÛW∏:∫Á®$®_RFbì—p`T◊Oé€√èÔáb,ÅZ[#VR2Å“@ò≤˚∏Öw:|˜Öf®R‰,”ìSï9Sàb ûÜƒYŸI=°[”SùÑzÕXp‹æG|“ﬂ{4å|„N\“ÀÉúÖD+Ìœ√Ù™è|£<ìf‰Dˇ1@dŸGº›•Ñ$àú∏≠◊<ˆkÁ§^È=”•À∫‰∂./≠·”Nz≥rW±˝≥‚rﬁ÷‡'8ÁmUs~Ø~çx:“¨L§¿S=Æû‹Ìv∞H¡ˇ`ÚÅ¥Pß|ØHÇ`‰≈j»x$ñDKÍ˚ICH]\O∫À@Æó«S¨_º≤(;B∂Fæ]ÌT$Ç˛aΩ*wXUÁÇY"˙ûD‡-56ºãËgôv4◊KÂ„M&>~kŸ≥>¬zÈ9˝.∞Qø°q]®Áx(TM/Ppb„†>ïhd9â¡QHÎbÃ#‘Ïlmo≠°›≠ÓÊ÷ˆRSÆì"V£ﬁ°sCQ=>íPwØêƒI¬s´õ⁄|¿€EVqÂÓz ÁÚùÉØã*3h™†∑!‰î)ï÷∫jkU≈U_uΩ=πP„|Ç%?^ù±´ÛkHrÍ]‘˜¨Ã@Q`exKÎíh+>%òxE@k·ıö‚ŒÂSw≥≥∏¸•ª	ˇL˝ HEãOqÈÏHı´ü«F‰beCñ◊¢‚5É∏Ò¢∂ˇ∂~H≈=∫sﬂ√ÃÜ˜;9uì‹ü√˘=Ã√nHã(1ÔP'ù3%≈'æßzÍ¥C ¨Ç•^∂à≈}5~Ú≈˝#≈Ñ(ö,dD¡ƒû"m ˝ﬂ_[¡πo/i<Ê3˛ :ŒÛ‘áÑ˙$¨2d#è¸Ñ≤∆Mı˙_ﬁ%	ß¸∫n˘à≤V|ò€æ¢Tuw#¨Û›ä8◊⁄òı‰«•ãüt¬ıD¨¶:gå¶Ö«õâ5Pì¢âÈ¨Áåœq«Áôà≤ê2ìF+bó|çó«mzºÍ!}°È1™d]CΩHQ¿“ìÈ-Då¨w: Æ hD” v‹ï{DWwl§B\~z_°yÈèÔ ˙êf&ÑLæ©4¬‚'„W{«Y¨V ≠B‹ËÙãâµlœ¥œW®!’àÕûGVËôñÜ·SZÂ¬∏öCN+úyÊyÉáûs8BçW˝·;¥Åé˙«˚ááE«£É”É◊tÈ CEd‘ÚÒ%˜∏2§1+øœEQZÏi ÒØ‹[|tR'›sE‰÷ËΩ±dh÷πÂ¬%[Ú˚d–UF!‚ê––pLrß∂ﬁÎŸ®§‹€⁄˚E≤®Ù"ÇVîè
≤´CÇÉ‘·A+[^KÑÕ.•e´Ó9îQD„à„„¿‘,Ñ‰ö˝Ró ¬ÿòZ∂/-¡Z{ëR)XÜcØ—¥|erœ!0öeêœÖxÁa∆Bq
aÅŸ)ıAA'G∫[`!–bÑÆlt.≈7w+å¸ë7µ"´ùbˇIÄSé˛È»ÄdöÀíÕÕÚW∫V1¥ï„πgíbö®V"†ß∫XMqàñÓ≤-gau`‚U∂K¡-‹ÏﬂU¨€ât(⁄fÏÇDg© nŒπªÀ∂ÿâ W^ÆßwóX€çıïKHW’Ãﬂ˘Úg Æâ/Z[õ·äΩ[•JL⁄ÓönV¨¸|ªëÂöE°f8Aé$›÷“⁄ôE©2¶_)<∑†‘$3)UkXà’z’ È{¿N÷PQe©-¬˜	¿¨ËÈÛY˙Tœﬂ¸Ú◊µrˇke˘!N–Çˇ∏£\7®‰Æ5∞ï˙Êk≈ÀàNYı‡«04Ê‰WDıÚ,‹ç$>4f=ë&NÍ¨Yœ≤a∫ú:*F√S; xU]X&⁄ò˜~ÕàcxjGÎçÖf‰1<“Ë„Oõd©ö8’‡£÷Øw(&Ø2<∏€Q&Qï/g‚f„>§ò"‚UBﬁBG§kR	Ç®t◊Á;ÏóõRŸjâØ˝(4Sï‚¿õ,,H√–õ„C^<WêrpÅ‡,˜‡3r˛(ê)ö€ó≠±É[oÕ#'¥ŒïäÇönˇ
Fæœu¸ôJ2ObaZë	ËﬂTﬂ÷Ïg⁄–öˆ!^ÀACÎ‹såŸ2ø…&˛”.ôg:˚üû$\Ä”&ó6y,ÄºÖ1¡}j=›π7n˝§2t?x≥ä&∂M¬´5≠»ÕÇo</‘NrY∆∆·Ö•Ã√$Õ*±√∆Êet⁄hëﬁm∆ôxÔ«vwwft#¥‰9÷LÅUY	lÉUﬂûÛ√Œç¿û!#4¨µ˘∏y{A˝$µ≈£[˛∫ÑgSHò+»√{‰ôÜÉ˙Ãœÿ	ÕK≤Ëıíx'F¨`ﬁ#ü}ÔÇ˘KùØÜ›8Ôw9y∑Ã˛Öi»Ê“Ÿ	„r∑π∑"Ií‚S+ò€êMã4q◊â0Áy‚>å…Ω†xÒP·µ…°Cî˜Zï˘∫î˚öHºÄ´ùã6ÔÊ⁄∑Lö5õÈÖM˜@PÿsO≠©o3~m\WÀÃ@-.[[í2ú%‡,ªI&ÎÃóO‚k ö¿8ù˜lzn∆V‡®ë1(=K∏Ãã)æÛiΩÀcœçd‰àÆ˘wkˇ∫ªyÉ7)z•îÚ⁄?ˇÒÔˇÒˇ˛Ôˇ‰,q~RÙ≤á`í5¶+ô,~VÚt÷í˚’å∑Ê¥í©ÁÁDo^bYÎhè.Gﬁñæ*|ë˚3’<Á·áó˝Ctÿ?˘ y/õß¯√}¯À¡ÈaˇØkË‰√…«ìå‹Ωˆ≠ÖÁ«≥ëW,K‚≈Ü|⁄∂ã'±’¡zÄ¬≈„˝¨≥ÉMX¬døÍll„"xò>>ãçù»'rSq¢B,∑π“ôsõNód˛Iƒ lùÑ®÷.öõΩEÎ)S-∑/ìLÁºÙ‚Int¶ï>Î¸6+ﬁ¬‡”M—y`§`Èœ…ÏÈWKly¸Õéd±árúXpn4f>ìzKËﬂ]íDe°ﬁ1Ònaüy4Åg}ù¯x6‹_çà	∂CcéUú«W.<Oæué{√ÏP‹√ïf~Ùîˇª$ª=xo+º<6≈®µBπèJˆ¬√ìø∏ß√≈Ç&µo60aM–7≈ √ißØ?cQºgRa›JÆ»3ô£…$KE)˙VlOˆs$2√TL¶‰»ıJEBñëû§ÀˇRz7“CÖfl[)À
j∏˘ÃA—IÍüˇ¯∑√*ÙKpm»‰◊;`é…ÃöúCﬁùŒ)ù_{¸Áˇ˛_XK√2étåTf¡iÆ4õ‹ríÛ@àºÛêœp»∏ÕÉE˛°V∑ˇ`⁄˝Ø
Ô[ªœl≠_¢r?ä¬h±Âæ§<æÚ|¨»í·£x7hb∏øU™VM\ÎgÁ
°∏Vaƒ¶fΩ+z˛_¯◊wn¸≠m‚IaÄ;@MãPû*ûïÖƒ…u7;%E√$_)-Íﬂô(÷"ö@ÍU†é£ˆ·A˛0ù⁄´„ÃœÄ@[(Å≤‰´CÇ
∞* ¡÷÷ã∆éïî–Êä©RrP7¥j®fhekº¿
óh°U=8ü•™Ö÷ıûéœı2T&aØÌôÿŒ9…)•Â^•JSªäÙ≥íœVH=+vYÊZ¢¯µ(|Kà1™#∂4G∑ï^∆À"è÷¿U\N÷¡ÕÉ»¡?˛G "Gˆ4Üú‹h≠ãC·•°òW". ≈ôØdÙŒ‹ò∑5⁄¯¢©˛Xit	ú—ï†å÷ûb‘Ja4â]QLﬁæ®fZÛöÿ¢jd—U∂ŒïÖQcTU∞Æ—tÄ•´«‘÷ﬁP‘¿"u`Jkn-Rà“€€[‰Ë§˜¥ª¨ïTÕ∫©é⁄{ÀS)˝VØ-ØF_Æ§1W“ôóqßÆ#OƒˆKÓ˘2õ.⁄¿r˛{búÒ›-eû@Û$Oº Û˘lS®L•ê\b≠Ã"æcœÌºã™Vó‹R}f_ËΩ†w‰{i/∞4+/æ◊¨irˇ!%ë\,ÿX£ 6ig`@2˘î?ÎÎ	ÍÀ◊ÛY¿†‚ﬁá1.ÅxíÜO,XÜÁxQ"¿Ì+J†*èº¬u\Ÿ·9Ö€ÚÛçŸ&ós99g≈Hââ$ß÷bZQ7O@íïDA”A%Ã‹Cﬂ¶2q·˝œ·Û€¡ãU≥RåH)ƒõ£I@∫≠xÒ|˛—r√<•À%¬>–´xYΩıìuá÷÷h∏Æ}Ï£—‡¯Ì˚˛Ω?8Ï—ìuÙt3ﬂ≥¨˙]\Ç[%Ó˙ÔqÎ95€ˆ+`q€§˛LK‹i#cπ®ˇ+aK˙C∂°ø‚ëñÙ±ˇÓ„1Íˇÿ«€<in‘Áæãõ™<?:À[1IÒÚ^ıLqÍïLW\∫ﬁúqﬁÆ3ö*Å•…#¸˙™G±Pßd°dΩ—+º)9nûHë√2MIFn|‰`mÂ27⁄ÇÃ KW√Mô'ƒHÖ:»39Ú∞PE˚hl;N–ûíÒ…öc®U∏£èÀP≤¶1ïï9≥¬ü/3õA¸“i§¥Åu]Åﬂ)mèCòRVG(éêã%Èmò∆wVîÃ{U«E20$-8ñ◊û
èLña¥)L…Aî)20oL;5Çô"àÌõ‚ã““Ö¬DÎ∏à±‰⁄∂;q"¨”7!AÊR†ÀÈV67‹»pB$SQXE€∑Ãhb5õ∆d≤é&da„èË{4a∞9Î®£7ï\8†‹◊\J√ã®úì’‘FXkUï›˜«J¡ëDÁ0À—¶òe*ÀP»A≈ª+™ÒÊ˛“d_ÿ·ÃÙçòà[¶’…PzÁx„ﬁ¥ñó£ﬂs¶J∂=πVàõ—h!OLã7∂Çml†#€$.,‚RÒ p&ëCÏ˛ÅÑ∫9{wØöT°¬É#"Ù≈)k∫±&úf ∫g5≈6€Ï·FmSl'Ìπ’KÙq9ÜH4 &àÀCv˘3œá3Ì‰Db®c	∞˚Ìıò¡#¯H@Ç?ã_ÃeØ8∂‚˜»-5Ì˚(.KWekGXØ …-0ñå5^»="`îÕƒdÚEöp'(5EKâC√sh®√°°áÜ:¯ &+2i˘©¡©aÇ/äôõÅ•jº_`ÿ∞2√Ü˙Í3¨§LÃ∞1h√™òŒ®òc·Ñ˛Œf∑®¶U:∂È‹™›‘mjÎí’∑ê €Ìl-ﬂ‹ ﬁíXïu÷ÌòbëÅ[
µu≠jyf.≈∂ÉOÌv;£≠£ÏﬂT>‰æÉ%˛s;¸Phb0÷Â≤ƒhn¥Åg÷⁄x}¡MbsÎz…è„‚èµ˛±F˜MÿÔDô¢˘:Ò†Ó„—Î∫ô"Jï”7˙öp#nµ9ßhÔ=D—%V-º⁄¶®˘}a˘V˘nñ˘˘Zv2ØF8ôA?©» 67Ω¯oÕÊßˇ∫ˆÛ˜k[€∞ˆ$JysMr£À(#Â>uŒŸãj]”íÂR.pçVA‘5Ü«˝Ù∂?:¯©ˇW·pâ(â+˘p|88>@'o5‹ËÌ~§O/±:snzÆí”\¬Ä¢Ó“vÃò√J\G“_ÂÖötæø¡Õ~¢’˝,‰L1‹Ïu"„:¯ >¡ÿ_z¶R∂Ã–˜˚ŸU'™0˚‚$~Ø+*ÕÊø$ò”ut}¢ı‘ö`·˛ú.÷ıL/i±Ω∏´ÙOtÛB$Xã"π®ˆ¢‹Æêì˙¥Ü—|n¯W¯Ï+FÁ7_ #ﬁBŒY/˝sáÖYenfy[;;hABÓäa/ITv˝‰C
|˙U§K•OöÔáÿ;6éàM¨'o]'Cîò¬Ù^[{ È9Ær÷añ´%…WgêÚ3cßå˚≥pÑhıW{jáxKA‘ò¸gñ“˘ujeOÒÑ˛¿g5g=˝:≥≤Á=q÷FIŒôªúYﬂ‘·î&ñ⁄´ˇà3´ÄÀ»>4ymrDπ{yÃh≠¥tsÁ {ö`9^nÏúÅ
€±iÏ√0ƒs'ÇJz!UÁr "1íW‘	OÃeàI›Qk$ÉW∆¬slÖ®Ôÿ∞9ºƒˇúc%ü^d±4PM™‡±/â@ñ÷◊¬{M~E◊¯öåa5fZú≤âåC†ñB¿°ôÀ∂ö	O5”"IYü‡gDÕ"~µ*~ìéŒl[πâ<À«R•gî˘òÑÒÎ∏â∆O∑çNmºjÄY¿Á3vm•ÁÀ7çiàˇí√ù^gØ€éÂû¡mWíL≥˛|c∂-èê¯Z	âI v	mK|«X‰ÜF%‚CSIƒÁ°œM&	<·∞›È¢ˆ¯LIÑNÍpñW]®/"·§ïmÔGcÆnw#ú›uC;∏0–:0ïƒœÒ”GÛ‡‚E˝Äi§IGÔá¿0Å≠«ﬁ‹v90Éuà≈e|Ö|⁄–Pœ√±g^©„…jrΩ◊—H¬Kd†Œ<MçR`⁄≈Á}√›øﬁ’…IYNRC^%H{Âô-gÌ€£Deùébùﬁ6çsdòZX.Åf&ó|≤Ä
€µyhø≈O¥r“aΩ¥µ(ÁˇìΩ!’I6¬úq¡GÉ^nÇ˜≠kÍ§JA®…ﬁ°7O,/òMΩGµnK3=Ÿ¿≥è¬:ù0ìkïCË‹∫⁄øÜ˚b=ˆÕcˆ»$ëŒ,ˇË±*Yóï§bA7◊’R‚Áz¨ó˜+˚TÀkî}‘Ó^ºgô0œÚS)≥¸T
-?ô™“∑““Jèû`beÎ0ôÊy%˚\Yd¢&öˆÃXDA„Fs•'’ÿ‘Ô©%∆ /ıÚˆF§¬ΩìtÅ‘w‚˛˚†ÿœ{Rg…ÿWÚtEh≥©%Û1,V‚!tìãÕUwqÇq&v™g4¨”iÕùA)î6O•>éãÄuc9€SÏ*{®cz ÚI´Q≈Ù®cö⁄Yùij≥çé"ZÛﬁä∏cH.ªòQ@eï ∏µJ}µJ}µJ=4˙~¥@Ò¢´¸ì˘ Òˇ‹ç#kÓ}QÊ©ˇ  ˇˇÏ}[s‹Hñﬁ˚¸äTπG[úfo¢§ÊË§§V≥%R5ÌâvGwV»Ç
`piä√°√ˆãﬂv#∂«ûƒ8∆±O˚ÕaG¯˜Ù˛üìô @f"Qº®§euÑ∫ày;Á‰π}gÕSu¶}kûR~Ê0O	?lÊ—¢Y Iœ`’⁄Ga”íwêîÆÛAmZVâ;“H?¥M+πµii>ÁÛòß¨Úº™ü´≥L]¬*u	ãî	™¨¸πµ.’Fyk]j^’À®,ŸÁ\ï@ﬂ \›˘Áø˝Ìü»‡≈/˘µªø‘Ê˘-|˛OˇõmÓæ¬Áﬂº=ZZà)ì9Ìxr6ÈµmÎÓî™‰\ﬁF>Sn‹µ¶ºlM[©}™⁄ô€í[s€ıõ€j∏‡i ™Ñ|J∏çæÄX|5I„4∆à‰Ãø˝ﬁuJœäŸh0≈ÈS¡Æ‘.g¯âôJ'àﬁ5öPﬂw<2ÃS’∞ºüπxmÈ∞<H®-ö≥!ÖçJ(∑EPÚi”*Âµ£•*;s«%wûÏÅ4z˛Ç<q¥Ω˚zÀ&Ü¯¸ÉTÓ√È?Ójr˙ñ⁄*‰µ.rô“yRh•I∂Ó6ù¥Q ≈8@’ä\«0¶~+6√2ñ˜I‚Ôxzx≥≤ ∆≈%—¿Ö2¢’J`ÊMlL√¸ì'»ÕYáö8:L´Ç≥X∫ﬁ≈˚Ês¶Õ|√åõ22Â&vzkGWÙ¥›I˛k:ª&≥®d‡æ¶70Â‚∫⁄ÊX
Óµu=q"Êí∫¶ºa◊wü_SÛ<“Ú˙-’¬ΩxVÊ¶Û»òú~&Á\∏≈è¡Ç¨ﬂÏ––X ÆÕ¢Ã >.£2ÎÚ≠]Y˝·≥É`0≠¨OÛKÊoªçñ¥˙‹FKJÕ‹⁄≥ØxÛZYg¿a0é÷}(f–ı´·ﬂ(mÅvV%xı¥^ZÑ!_y ´œtk\◊ﬁbe\o˝£rxK]e™9äƒX^@‡GXp~~/Â9Úll`∆‡„úòU Ä6Ã’gÄtc!•Óﬁ%‚kü!èøqìIWÒ¸ív+îz¿ÍhH=PW‰Äd¿ãäõ∞«J„Ö1»o◊Äí-qh≈C—<£¨wœÇYH#ú—.ïƒzg©Ô1:øwáÚèÀ¨¯(bŒ1œD˝°-PXSgôƒ´Kˇ£õúmëøÔ¸;Ëõ	RÆ‘ì;h;»ÒÂüö–⁄ÿ≠÷oº®y˚Ö†v˝fSƒ‹ûÙò|´È@ÁÎ‘saV:€')lÓøúÿﬁ–âè7”$_˜ÉÛÀœùX|◊6å`k˚Kgeﬂ˜`h	{aπª‚∞æN}W≠«}g*áÇ€£¿ñﬂ√HÀ4ÀwYõ6Ô¨ò¯ZY±DÏö:£&Ió7‚‚vçÂõJ≠ÇºﬁÒÕ‹>˛Ê≈∫*—s—∞R◊ÃU0Èy‚é<U9Z|©∏°57ﬁKÅsÛˇ3$±Ü˘ÍôüO}eñÆ“Qﬁ´Ú◊Ω√{lÉï‹€eÌn≥›’.K+π4Ô2îL√ÊRË<æ>C…‘wù·∑%÷fÙ›’ÀÙÒ-õñ¢ó|ö™ü·(—] Ÿû6ﬁ'ƒÑÛ<M˙Ãç€Ì≤ÅäÁV Ì,ë_ëµ’U”kã¨jòW.öëM{¿æ¬≠:$'ﬂö[‘7∞S
€èÕˆ*|Öea˚í˝Å’å;ø&ÒŸº/πxÇP¶Z‘“≤¿Ë—:ötªMˆN>à°Lv8k»=9y¡ûÿ«lf8≥¢8ö`Y≈-
Œ“`*Ê¯€Gt-OÏr>Yùüˇ˙SGèÌäü‚x†S’ª"ñÊù-H›Ÿ±Îå˘çÂº^iœŸÃ√‘Õ⁄m∑q‰˘ñ∆ﬁkªÂËçÔ4T⁄ n~ØiE¥øYÙ÷–SF’÷≥£ÎÖˆÿòEı›€¬ ﬁé¢ÇqÅg:∏ƒ-M0ıÓX<!q[˝˝|—ƒB5=Sµwñû°Á#√tã©∞oy∂øQ§esÌ·È ØDx‹o]ÁtãÏÒ© œ≤Áâ8Æˇj≈dYhÚ¯^:Ü‰aìÖ»%çXê∂¡$◊NÚÄuÿ à•pﬂ´°¨aX«z¥lñŒ(Oòºé÷[Ñë¿v˛5]°Ë
%W®∑BµZ-SE±ÓS[Ö∆*Ù’≤∂⁄˘é+ó3Àÿ±l|Ã#:ª∞'ëù˚ßΩÕŒx÷v‘KV÷I˚Ió;√ ıil”˛E"ò‰»âí„¶ñÅ+ˆS´ò€®té…Væ/Œsâ)ãÇB⁄-WÊ≤JŸ∫∞ﬁ]»xÿﬁ*Œos∏“-m‘uÀº≠{%„ay?}7æhao˘fnı/^O]„€
?C˛FˆxãWrVu9£‹úÊ∑G≥ıÈ√⁄nJÁ◊ßB;≤	>¡O´ ¸‡⁄¥a¶´ef*ÌÎW"•'ÂÍ[ıXÁj&\å((ô"◊÷yTzsf–æ{Ë•é‚≈˝1Í€πL$3ô∫,ÂÂÅrËûÁ≈›ÏÕí•„è$ª»t£%}o*4Í„â÷Î<ÈµÓIﬂ•U–ï}ÆdFT€‰Öt^£Û\j]¨úWƒñeˇØÉÂÍ˝Ω≈@≥Ï´yÜùC°ódÚÂ<¡∂aÁn>·Y∏p-ú∏Ï&ï~Y¬;GsCN|ë»Ô~9ÿÖÑIo≠YÈ“‹Á™ëïmïÒ"öE62Î5ûa€<∂Ì84qÚ;Œ∞›Û¿YLBÎó˜‡—˝¿ÔmO˜òΩõŸSrDO‹	û≈- 4UX—ˇ⁄I[Q˝	ı«4ì¨d””⁄Õäˇ’dáÿËıühäH+•æ}À®◊øv¸Ãl°ﬂ∑~€É=Nﬂ—ËZﬁ°—hIó·f/›¿;¢‡$rbÚÀk|óP§∑!]!∆ÆspôÊŒ’vúœ6/Ωa‡°öÍﬁ8'Ü:≤≈ß—^^|™Ü ãG
3Çm˚V÷Ô 3ñvp©[&ãxˆ˘xlsƒç^ùY√„Jmm–Á6pÃ’ô±KIÅ„OM·ın§/íHóÚ~œÅ.~yÕ®™<jãCÎò◊\›9∏ieÁ*Á!W¯.9	ã´Û5qÿÍ’æ‚⁄z3ÿ∫˘£zydò3Œ@eØ#æ7k˚RAæäFÊâÙÕö±˜U<q1ø∆∞NFÔŒ8[õù≥Óò◊n◊≠°mçˆa_†ÓPê#áÙ≠\“÷c◊wöÒçó^0§^—]]W¬Áxçlæˇ‡+˘ñ…¶É⁄:cœz‰Ÿ±?å]7W
™©ˆ„Ó4]Òã˜∞Ú+Úç;>qíK÷ïÊ /:Ò•ÆÕÕMï bö*Õe¶$^ìr‡Œ‡Ñÿv"æ™V6¥öanË£iUøè≈<
?V*ŸÕíﬁjﬂ\'?π<.—’¬‘+´Æ0∫aÉ‰Û‰–ô:>∆hr£,Ñª∂
Á
q¡m?„å”Ñˆ"¯á‡ƒq,ÿåÜÁ“òHxÆe—V±Œ¸Säx∂:–*›ä^Z4Áü%]7>ªEV†Ìu}Ú⁄ÒYîΩ)3∑çë˚√õ∏°óç´<Øïµ±·89Ûú«ÁÁ‰‘'ì-“π˜Àπh¢æf]mø	7ﬁ ⁄÷nﬁ‹≠›ÅÛ˛`Ω´˘næõe´Scóm
.\[/mÀºrBgÊz
ûæ#;¯Êû7Y.,ˆ6Ê˙sùZX Û[&Ó¯ΩïçŸ«¶jn√§Ææ∆∆IsfÃ
.îU\-Ã4®¶kÕ≥bâÂtSÿ%3˝áÏºµq≤lÊˇ@]ÆmúVˆ’Ü•‰8¯ê#Q«)NÌV√≥;≤„'üÇ≤Ö§z˙µ:ãg L6«kõæ-Ø6k6K“lÃ6/5ö©å‘◊nâûπÒËÚVË=hÂ:,–ÿÓ•¨œïÊ±<cˆVÁ ›7mqŒı„ÅÉ¡Ã∞ﬂ∫™Öb«çò91‹dZÂ´¯tÜ-0Àægã<î`˛¯˚˚w%Ä%sﬂô>éØ8¢—	Î}Â≠ô±ŸêíMVõm€ÿﬁO≥Øæ@ä*G˜
{6Kı∑Í√ùˆ}PvbeÖºåÇ4$√3r‰&ûÆèwıo‰[Üevüìo|$K«˛/%l≠D£üb‰˛≤úô]‚˜	Gd˘Œ ErˇÈ”ºk”ïeyÁÈ⁄f6√Ü ∞1˙Ï4 ùÚ$	¯Œî&¨| «cê•I‘Ç‡GöY„}ïÈnl≥∏S{£6SW'ˇî3—ó∆J>L÷t≠öûŒÚä>À»∑ΩiŸm≠rÓ’ÔœÁﬂÿw””Ì˙Æû€! Ωú’U}\Öï/˜.Cìgù,c…Î¶áﬂ™˘±ﬂg3Î~GòVÕﬁÀÀ˘ÑÅÀ¿¸.y⁄VTOf D∑/ñj‡LîØà]’J*‡üB|é"ß∂óîÑ1N≥∏YrG÷%±h◊ﬁßIr®1{l∞R∞=G¬°πÑÿ´·ƒ‘–mÆE⁄*†_^<áàUø¯Ú ∑)É∞¿*p ˘º[°ËÿêÚLL%fP‡,1¨¡aßFA{≤†FÇÚèZJº¥?}s>∫à¥˝·WÈ‰5u˝ûˇ,ú{Q∏’≠·SÚ©ãEp¢!=£È:‘scªK◊ªrÊ<+Å‹Ê\á"` ´pÕkêÄŒ≥ úó†%∞q1gyT†Öp ^rÑÈöò™±[äc’¥·µ’2≠‘√2cŸ>÷]≈·–b)v˚‰–EØf‡Ï8—æD∏kxπg∆®ŸËÆj™v[y®÷”Vﬁ€∫ß|cìπ üTÈ˙sßÍ}Y}f∞ÎÀMìØÜn»GÅﬂ!?»¬¨Úûàl7+‹ûõM´h˛◊Y®®ı≥YAÆX/9ÿ$ZøóWÔ)’–áL/;dí1jÈ‘6ÊÍJÁTß//òcÔåÁ≥#æ‡!´LØI£mŸO,^4æï(°íx◊ôm•Dq∞l˝rÆÔvaC¥âﬂÃ{≥â<ÛßÓHÉ¸h3òr%b≥må@in<}Èä6πFπ}ÿ¢ àò L≈ª“⁄Çr4±‘≈(iúYVAï»,≥üÇ¡’àëãIU+Å7≤Ω[‚¶uàuqPmãyµá‘áº◊UüT=Ú¸•’€0”˙ıÉ4(ŒÍ¢Ωî˙±sÕ™ã∂˜D/2÷‚©.ugŸÕh/˜/ßΩDbÀgZL,j”} F1ãüºsC»Ü®—r?nJÇCìï˙Q*kyŒ‰N;∂YÜÀdÿf´àa†·ùÌòauÀ0Á€ª4N‹„≥ﬁ–IN«oX)@«˛›?ëÛaÆ¥⁄ é’ë∫uÆ9õ)C_>(©/XH≥0œﬂœ√c~Á¢MgGÛ˛◊o˜∑ÏU;/^ø›#;€ø€>¥/V…Ü⁄rrΩ*Ú«ê˘¶µŒ9Ï¬}æ–™•P úFÜ,:‡√Ã¿˘ó	qGû˜ô4Ê¡√à ÆÂÊ¬ºsÒÉ5≈ñÁÎ2Óµ∂3ˆ—)Î≠l«Œ|áC8eù¯¿9røˆÇ„c¬<´jºÉÜxåut≤>D0œ{Ÿ˛K Òã\Ïr›ﬂÉS/¨y/-ÎΩSé¿–H^s@JE8í	xCï5D0è—•B…äqÚ
˚˙ÅÉ•èpÍ¥Ãcé·pñú§Ó2fﬂQ¥[gxTùÍjí=(Tï>/€íúGHkr⁄ªwèÅ∞Ze:ÍŒ2ÁÒhﬁ.ûﬁ‹‰Ïi?dßz©©H]Á´>ŸûÃËò|ô“Ò2Ù‡ﬂ=¯wWõ>£&S˝åi…¶›n‚¯∂é?Œ˜UsŒÂçn±Á.ËÓ±;•±KÓí'J(h™†≠æ£ßt®qñ/N´m©$rh+b%<w`-ËÑF9%Èéw≠∑ÜŒdäúÛÄû8Yê}»ÅNRXœı@	P≥±aü5ô¡±WuÂ≤”LaV‡5É÷Ë”f‹$ıpÌﬂ$¡å&nõ`@'‰Ó0ıº_√ˆö2Nõ œÃ¿ç1q{<s}¯aª€SVJrä˛„êéS2ÿ; {î¬¶#˚oç ‚/ı˚∫	nºXªTπP˙≥êuÄ·ÕÛÌ◊pÏ?⁄~˝j{üºÿc* |›€ﬁ?§Öz¥Ìª0iŒàC«I"˙ï∫£‡¶Ây¨§‹ü*qQíπ~Ï$ΩUÚu´ﬂë:>v∆\ƒüπ¬T≤roïÅÓ«Q"ÄÑëM~–„õ!å–FpÏßΩ≥MìÍ°˝—,¿öô}ËYeÇa%ózh”äÒÃµEV˚_l.ì §#VËvµt@˘¥Hœ¨I¨’pﬁªI´7îm÷ßòß<ls˝Ω#æO‚	√xÒO’M‹3˙æw⁄õçâlÅ/Xè


¨ﬁÏ¨˜∞úz]€õ*Q°ñbI√aoC„¿Ä=Ab«sFXÅ¿wÑm∞æ.EπÈlè◊Ò∆€H8Ê˝VrÌ·Q¬z´Ÿ}≈qœ4˚U‡ª—≈o8})9ÆöÎ8Ò0Mí@≈®í≥w˚Yï6¯œÄiNüõ0ÅLw$ÍÓ˙∞s4!Èp+øÈK«#}ÍoV¢Ö®KQ‹Àm~*Ä|>Î¿ﬂ±u‡˜(ÏÎQ≈A‘Wçg¢Zúüˇ˙üŒÁN√Ömˆâú6ä3Ä≈Ü∆˚Å⁄Ÿ÷›¨˙ßÿU$íåº˜î÷÷jÑö
@Ç˛…8¡≠ŒE\≤a¯)ˇÖπ ´0ƒ∏$—«Ü¥Å0∆€Ñ’)Ã£‹C'!«¡5£S h≠O∏GµâKoˆ˙)6Ëπ.ˇLóGûçà[∑òµãtﬂÓlÔ>_ ’áC FP˙ ¯πP—R(˜Ÿ¡ÅıdÏN›»ùAè»7öƒ€aHNY◊R–˙¥B›éôïˆŒ:˚!;Î∏¸ ˝˙¶‡€¿J]¨®¨(ú√˜ﬂ√Q˛˚µ„®ùöX◊Ì"T
ÊÂO·Utcµı^€ıs.´r¨ïß‹â+–¬>‡"qTäªt˛Åëb•
k%oÁÅa•2TçÍzqgJ¶¿»LËäÂ÷£|‹´Õ ¬3ØˆB¨u+™î’^X˚¢rÒÃ°—ß∏p_ß3–ˆ5Ãøj¶48¥Åó÷àgB∂3É‹´∑Á$¡Xôp”+Wv˙¬–=	å∂ºv!œ∫ÅMÇ13IÌa≠EåØ˜@ﬂ"+‰çèv!´˝∏óq?Ëì£Ïòª´Yïî8ña‰–)ÍMñK Œõª|1{WµnZs‚®§PVmK˘„uKˇî]Ä™tW5∞õø|¶Õê/uKÜÍ¸¸◊?˝øˇ˚÷ß≠8ôc5©í≠Â£}ˆÀö	¸nã5ö)ãeUP≠:™€∫¯Aµ¢ÍùQY•¶^Ó◊n°R3m23-°ª!L
KR“⁄íÙ…P∆nåæ”Ò„s7ÊD¡»âcòó}o&5<”∏»◊ÎëW8≥Ÿ∑Ñ˘2ﬂ|*3MïÙﬁ«í#ßl¥©òtÏl8GiíÜ R∞2≠cUÍÃ9óŸmg<ﬂ14>ÛGƒ¥o,‹œZÑ!úKê@ªÅvk˝Ë&QÍ\~«¡dDgê!Ë(LË)uRÎz∑$F !8rl	ò=¸Øß#â	Dß>Ì≠Ñ-e_í°MhÏz∞ûôıÍé0IÂ®ÃÍ„âˆ∑%ıhÇÜ∫∂–Â#wÊibƒøÀo∂Â!∫	ix‰bô âÎ¡F.à„ï^—¸Û_˛.¡K
lbƒ,¨Û”æE˜[æ§'pFú9≥•U,‡:?Ã1›x#„…hB∫b˝Ó™¨#zˇ â°KloÄdASÊ; åß~ø£È 9∆#OOHj>¶0˚∫6Á∞Øªø'ò˝IÓ)|^í:ÁÔŸ≈<%Ç{°,ô{…KUyΩp]Õ∆Ÿ∑‹∫]1Ï´}<k˝M;˘†‡—⁄pÔG⁄£CÁvÎ‰ŸiÊ+⁄(≈†
o`/]ø£v"±fÿy/€·˝~ﬂxöW∂£’÷˜˛ŸƒÅct—ÛÜ˛é.ìùÃû/1Ã.˙ØñÊË≤¬Îoˆ≤î/é[ÉÀ[éË:ˇ}ÙåF„8É$Ω	ÁÙÊ«Ïú∂Ò5œ∆[aÔ°ΩÀ˘‹!|Œuœ∆˝≤ìô=2È}˚≈ÍèìÔÃgåa¯ °¯b,∂¯dáÌ§ôc#8›U!)]πÀö,û¿JO{*â•”ZÌ©Ÿù—gw§<ß÷ùß¬TÉl=cIa
BD≠ˆ	Ü@%6.„Ø∆hDÇ∆Ùp¡æﬂ—î<cq9Øœae^Å∫ùíﬂínÖæE.œÖﬁzœL*Âº≠€›†õ™◊O´d4´ñ™&;=∞yÿw;å·Ù8"s/vÖËŒ%äÛË)Ï†‡î≈(&›•e|®9Ä®gZq‹ QçºR⁄õ˘ë£0-^ˆ|°?&d˜eªêù	‰õm<√pZGâöÌV∂Iˇ˘oˇ˘ø√aQπ·t˙ËoX⁄ﬂî®Ñ+6´∂ëØöΩM‡FÙ›Çd6 vhi5È¶Ä;Ö‡a…Rõ∑#áío"äC±2ÈO¬®∑∆«öFb(Ü·é´È€|Ïœ%z%ïúÖz´SUU:ù∑<å√æIq©_¢Ö>w4:@Ëå‹cwƒ¥§cP˘¡çô©	€?Ç2§Iæo∞˛Øëx∂%‰Ûû≥ô,]WX\v ê9äF`U•ë\h≈»∑P&n˛iQwEf¢‰ò‹;¿œS=˙#F≠Òπ©ˇ`™Ãíg
ápÜŸ¡GwŸì[§√ü5’è2¶ãºÄw√Ÿ7‹ù'ÆÊìeŒW)GW?ÆD[õüu„É»˘—uNü£Œt≥V	c#T˙Å a—˝ME`¥>HærVÉCÌz°°òçÂÚÁÁø˛fGÄüû∞†iwö&.„Ω1yù“àÀ@”‡ç…>∫„àR≤ôOçÌUœÏkaΩªwÊàº|{¯ñ‹%ﬂløﬁ%Ø^ºﬁ`Ëı≥ØJúÏ‹çwg¨ÑÜCG'zÇ“Jg-©¢˜´q“pÚ˘⁄Ë5Z`|ÛË•Ö*∫,Î®FΩ¥–FÛgA”÷ohRd≈Y∞çÚ*T”áõ†öVD`.’'ÓÿÉ
›§]¯4ÎM9Pøñ˙h<Õ£…Ü∆Â¸Evî´ËxCÜ‹BèÖóºΩÄéüyA:ÆΩçb⁄sp7≈bg6*w‡tÑÃh41sπ2¡1xPñ'=	fN3ΩX{J:ﬂ†GÄ≈î]≥/”(E¿yJ‡ﬁwhBÎtTB∫œømü©3ŸP^kì'ÔJ¿,Q?ÒÛíg¬¿≥ÔGßÃÃ%©ü§Så¡=aH∆pZÏ81J]¯;Qrû‡d¿y”íf–/Í’eq4·Õá¿3„{çÎ{ìIùùó§StI)™ËIÎe=iS„˛†d ü+™˝—øŒàËæíà.·éGÁ™6√•~ vûbó°®\Îì£lÉ›Ö=áäºPj¨í≈Ÿ+Vœ!’r<5*ÂWÅF¡æG¡©Ÿv®Ôìz4Y JÌIÃG¨HAltÃ §ò·–˜÷ßì|ôÃı€Êg´÷åUf≠°„i;cÇ(S0«Ç$mÚ&¯'ﬂ∫q:¶tõaj)0A›Åpã‹òqDtî'¡Ñtc
O®c¸„˙a
*#=ÅCÙ∂?¶pHd∞tBÅ˚ÇbÁ'rF·‰˙∞;Ó£u4òi≤\◊15ØZS¯&óŒ,ì*Ö!bîªHÊv·©ÿ=Üßæ;%›Ñ·A≥ÃUbï’dIå‡ :¬=ß@ V¬8ıX	J¶A:ú0a pèiÍ%YŒ«0≈ﬁj7õBnÒ¥™å…⁄gcÔ´ 1Ì('0œyú˙x ÀhSÏ›nçbu1l∫iîñ%sÇê‹”ÃMø'ê√^Ù"r3Ÿ’v‡™qä-8óòÖ˜Xñzp≥•WopxîÕ\&UÔ5:PÀ,ì¿±ŒÏ45òÑµ ï
ëVDÆlVç∑y<·Ê«.Ÿ‰ò…À ∂”O±œëGo3'”Äø⁄ı’ëª≠•JÙ‘JÆà^1…1	0]Ó≥xÇ◊‹#&§(õ”Á”ßN&¬Ä$˙eÁü8c7! \Ë2‹]Y∆äïîÑôÚ¥L‡œîLÒ"g—º#N·=,πÿı–∆≈–”2¸Ë•¨]K8ÒœhÕèÈ)àÏLùÒËıÚÏ¡∑·	wè)*E⁄‡s¡Â_ºó∂A¨`ÓWÀ≈≥˝-ÿx‚PÔìa‚uﬁ¿ÙÛKrrÕe•v¥ﬁ'_‚ûﬁ≈c!ËGÃÁ4üZ§â.Ë–ÒÏTâz„≤Œ1r‡zÓÑfé|≈Ç-_ ï#Â+Áàu»JÉ„b-S”x‚å¥∏˚•Ëˇ¶‰ fI˜Œ][ö≈fßu##G“ëo‰?>O8e‚±E>téuJG#'Lw˙£¯GK 6p˚õsA¯0˘‹¯fA¸t^
tõôñ≥Ô’™≥VòG'ÏÍÈ,x∆Ìj2Põå*SKûŒåã˘^(p0
ª£¡!.9˜X7r#TôU¶‹É‚hcËÿ+–†Pî≈,3E#(gN¬Â úÜ x'MVTSR ≥e˝€s‡<EÒÃzÑ7SçCgÊ∆ ß¡åíÓÚÎæ∂°Ëq⁄„˜˛Zßûò˘≤ŒÚ›û)Ô3ÃÄe,BÀë3 Êf≈,∆Ÿê∆§ÇÄp∆
tc®  ~∆îÑ'ÀN(‹ß¡ËT3AÂôç`°ÑÑ,W^…¢dò—:ØO(¥=+ÊÔäíŒî»•∑xÍAÀıíRª‘ö◊˙f}›J@õÛÆãÓΩæµªƒ∫âôºŒïä‹Ë·t'ÉÌ¯<‰7	°àÁ:©å®Ìj´@:¥q<⁄Z:ÓDKV—óÛ÷SÑ^≤SoW?ed≠õ”(Ï˝”#Ê·◊:	$4+“HÕa0î°à?“TE—e–G¡(@Ö0≥wé/ø
Ï¡ô$[˜s.‘»[ˆ◊ø5òÂñ’æ≤pcT›’¬≥ΩæŒf’†.ΩÿX€CÄûJu”Aã·˝Î‹4⁄ C û—Ù‘œ∞∑™wûõ◊6÷"®‘K1íÎp^ªﬂy≤õ¶πËÅÆëŒì∑πU}˛6êŒkãCÜói«¯ÿÂM¸Ûît8Àé;≤ƒ©Êg∂B†ÏH7oÓ	Ä]ÿyrêªÃôîKXÚrGÄ™1∂Óåà/RÙ%ÀÂw∆n:´≤˙,‘≈∏z*fŒB£‡‘∂zÉ∂nÉJón‹KU¿rÎMÉÅN˜›¯≈{‡›¶åÆ ´R^π∆†Wπç+◊%ıA-õû_ó∏´\Dª-`:∑5⁄ÙﬁwﬂÆòáÕlË‡
Í3írØfN‡pa
 l=#M∞È6ÄÈ∫›ZœØDNµ®—«6uv‚∏÷.´:⁄¶ì7ŸAª™vóóK(ôply,ûÿbOƒÈ(7ø…ÓŸMˆ1ÛãœÀ)+gûÚì•~ÿ2∏Ü˜§˚ú;ˆçñ¸RÛó_ÿ¶B¶™'Âå•⁄æÊÑhA/r=§J 2WÿÍB˙…πÛ⁄L®º¶HÖRjôPÖó!7ŒÃÍ«û»
8û”∫”∫pH]ï9‰R)j2p ël(“ ßH+òπ7ùQö8•gm2⁄6Û•≥tbYäíì≤í°XX^§ïUb„Ë‚9çIã"üX1:MR}NÃ˛JLå˜:µ,Åtx~&˛|¿AB8(È §?»´F{ï6≤√då‘˘tuÃ≤|i˛í¡≥Ì˝˝áòÒ¸j{Ô≈·v5i‰7—`D}_ì0ÚõCÒÎ&ƒóz%“†‚<!™b¢¸ÀiV;g˚.‹€ı›Xôœ∆aÄfs«˛«yÛ˝c◊◊˜Gó∑#~*x<u¢g4vêI√ë≠vµ
˝RÀ B◊ºxª
—ÿ˛†›öﬂ]œ%b2¢4±ñÚå]T'ô€≥$xTç O≠(∂√£ïZ˘Ònì«’9xq8ÿΩÿ?";oééﬁÏë˝ÌﬂÓæ‹>⁄}≥Ov∂IfÇF4Fø·¿ô•⁄ê˙Kä¶§ ‘£a T1Îa\”1˙âôïï¡g‹+öì JN¡Wø]˝æwq◊·üËdHª´ÀÏø˛ÍÊ“wE
gï≥Òñ∞]f« xoôáNzk˜õR€ô9~J÷H˜+–VÉüÌëêz»:„{©DquŸßìx∆º}ÿc˝àªùàΩµö†è;vúÓëÉ}TÏ¿“~´⁄a˛6iÁV_≠Eÿh”±Kå¨öV©ø&eG†”´h˙D1˘Ïúä…‡˙öòÅó(‚B3˚C4™)π&ı§¬áqç+,|˘´˙≤:/—vCƒ¶NÔ€uñï…∫ó]ZÎ≥*—F˛±bBjgYÿYx:h…˝aò‹“|™ÀP⁄ÕÏû qUY™8ÑÊ‘∑âas\;•	°Ù˝Ïdñ‹“[æ%J”rÂTáéç+ß∫Ró'∂:5*nZH˙¨-∆ïQiµ¬B› ]QNÎ˙©‘„/∫%–|Od3rÂ¥	
—≥	çíç+'PπÀÖ\î;|e$'hfN¢ªG∫;Q@«#'◊Ov√ÏU∑ÑóoäbNÆûÙœ;Ñ›xÂîWÓÛGA{Â._›±4kvN˙€D°Á˙ò5“bú	ù.Á∫!ñÇº"™¨RXmXÏó;Ï€ßC^±4Ã+'©◊Ù,HDïjOT’é5”ÕÕJµ_W(öÿŒ∂"ç“®$„”¿√4ëcT\*ÏA$û8Ní£o"íWGº≠cWU¥4Ë™M≥≤ËÌ¿iÏhV˚684ı{ËZÌe2†–r3⁄–££iGø›,g∫‹Y[]˝•rKöı¿≤¡⁄(»oDŒá4Éˆ∑ìŒ2”Yﬂ∂»˙Ê2ÜÎ˚No!ˆ∏¡ßdh\ª?Ø•1cKIo£\65ã¬Êà=äB®Ù¢“÷@/¬ao≠‚û©˙Z«˛÷‚â ¥∂‡≤Ÿ045°µ t#Æò∆˘œ»˜ À QuCÔq)Á [¿≈≥,¥]›ôÌ)∫äxdnV‚íºMËLùÑ¶JÒmB3;¿O]Ü∞ŸπÆ ﬂ¨blñàº|e¥ãyºŒnS1CóÅï©`6Æ£©ø¯sÉóRU.¸·àß9L¸ﬁ,∫û”C1÷ã√Ÿ2U_$É#∂§Ø¿QuIô+ƒ4(aŸß± j(˜6x©!@⁄jR5"º.#™)"‡(X’+(ÒRTdq∫«n"w˘æ"/J¬=ıN4Ã·üˇˆ˜ˇÿé?Èì∫≠êæ◊¥|
yﬂfSÜG„ïç˚c§Ì‡`oÌ˙É¯Á°Ó≠+ìMÎLårîh9ÿÛ°ûÌîq*ÎV,ña(Ü†–πíˇà
±AN1ë≤≥VfŸS˘!=1¶ïÄËs"8X!>ñF4†tô =âä√àé3EêÉY2åÈqB#Ç8UBìË∞¥âå⁄¯üÎ/ÄU∞¬wt|J=3º.ˆ&ŒOÎúªÂß©ï{uÚÕ„k¢[™zﬂU∏o˚ÛO:Ú9ÿõ=s=4Ò¶=öDÓ4&_≥Õ°ŸÏ:æ‘@π≈µ&‹◊ÓÑ≤`÷9æså&H£t¬J»]Ük¯È*ı“ôÔ.˛©E}Îß·E#‚3«CïQë˙+~πøŸL√ˇ”ÕpsÏ˝6€+§˚:ı“ò˙:‡“9)∏R⁄BÏRì.tﬂÃB∞·áËÿ?„°≤m ÄÅtπú%˝f‰ﬂ◊Bä§€o©≤ÜÚæÑrﬂBÆ˛Ùë&yEsÇ(9íR‚FÇGÿK,†óÙq9∂>‘„@'Dñ<AË{é†åAíº%P)ÒPôa#8˙ØãH§Ø/()†ÙÇHEØÑ
Ç2=° ÷9pwà∞=≥0≠ Ú}:ö•	ﬁí¶•Z™†L…3ŸDòˇ?ò00ÃÖ Ã=Í”w¿ı|^˜èÆQ0dö”"◊G?zú•p∏UDØél1ÌƒQë≠¯≈Ê–˚ßøàdÀb[…€1A±"5çüeß¨.=πã_êªDŒ4Äµı\ ÄÜRäd\∆ê{˛“Ó0ù¶ﬂªË˘Ω•ﬂ≈ª?˝yÈwˆŸ≈˝Ç≈’ëh¥'Àt$ˆâ√Tÿ/z3tf`Ú8⁄ae™∏¡q‡πÅ¶πi√‡>BRÛ‚‡ﬂ{‘’öΩ•˜÷Ù>ÙR•¥f◊mdı?˛üE§u©ö<Üˆp◊,≠?gzÔ2¡2ÀdB√4À-r;Åì7π)vûó¿Ù}!Æ§÷»c¯Iz¯«Ó…≠
l†Õ0çBOIù‚óf˙¸˘/ˇÂÉ¯eõ)Ùõ	M‚Ì0ª73Õ.ïæbõ(ŒŒ,nñ?qNÈYµ€B>£æ¸q”f‡øNÑˇøõÔ~ ‚Dï&+B…æoÆÆlHî*Æ-°ÊùÆ·e„6RÙ/ˇ„ÊiîuÆ¡NÖ*%«≠ΩZ∫Àÿ˛†å¢3¨îE#óùÖA4Ç¶õD∞Ù,„áÄH•Íz	Û£Úˆ UÃU¯M
t∆*(ƒ0«g≈@ˆX‰'æÉH'…ƒ)Á1∞ÃÜÊÍÓ0Y–´0©UY‚¿—"}VæRÜA≈%RRÖΩ6áq≥º
ª5‘áV+*T…ˇ%
n≥Bn¿è≈\bùP≈ö©I∆ZL©1—å™€≥í•4ÎèÎ-U.ù:3¨’áw±òY‡ªIPÕQ«è»	]FÆöÜ|/+§KQÑ»AîêØÍHœÍ≤¶M–ˇ]W£ıëZ∞MXaërÕÚß}NﬂF˘„IÁ_i∞s·¯{‚$⁄GüíŒ˜∞£¸)&·∆<v}G„9ﬁ„é!AX2Áÿâ"]ÕûB:A»a~Ó®{ßÇ˝…>NÛË‡~Å˚ßìû¯°X¡%ÿyÌ˙S~ 	¸q`l'øª4I#¬Í≤Û4Áà¬ÓÍw™F≈G€ıÃ*w%—rX÷Ä$ıÑ0gDïUë/â€Ê‚‡Í2L2ºÏﬁ H•"€>”-çz)µ3≈3%œ∞":}3ªXn/GÙ ÖryÜÇ;ór/*y2µÏ£Óæ VÙ’íjÑ˜`F£$ú¿\ÎÊ4ÉZ”¸nJ%Œ€h∑.$OMî#∫ŸVË	=¨ÿﬁ[[ìëzÏ+VÉk®8'ÕÔ∆¶fu‘b[ÁBí;ù'Qoº2°¬QuU∆6LŸ‚yô≤xtAô2Ô›b Óõ¡-CæÜÃó±Å!«”≥rV¸]cƒx±¿FÖ?$å~Ã¥mÌÊÎ‡ª”_]ú¡èõÁ"Õ≤Èm‡∏ıã
±gÒó%Ë"C”‹ |º‹ÎÃRì$=Ò‹çÒáƒa7◊—9’àäEÍ˜¶	(Y¸Y¬\˛buuÂ>Ï–Ë@xÖË%à™≈„ty‚ \yP{pa:¸õU&ßJõ_ÀüX´ﬁ^Ø√kZÕ∆’ÏÌ∫Í,õìä¨Ìj!õ≤iSNÍf0Â∞ÈÂ=\Ÿı: ’àﬁEòpE‚ﬁ£…F=YyVeπzúﬂUöÍêΩ¥êΩ0¡©∑wáç.€∏<vÇ€ojd4Ÿ®çV•Æƒƒ≠q˚ëJm›ç]¥π†?¢eµ }ÆìØ‡/t:q#ƒ]≤·—àòv£t≤Ú¬X—ôùT5Ôöﬁ≠2=BÜXy0ÈpÜ∞4>ÛGD{≤9«∞#“åÒ·˝‹U‚‘2.Á¨‡]∑√
$OÄ∑ƒd≥Ñ’TyP	¯µì&r‡–„◊©≥k©cœ¨£¬äˆì»ùuóÏz∏G„täFó_rîæKYŒ#nØ´Ï·°C„ñù`!hfÚX(+Ôü¬÷]´]b†æÏ}@¥|ªtì(U‹´√w◊nZY!_!dË…O—Üb·:'ªœkqËÂ8¸ÕÀ 3h9à¡TŸõı≥±fSKØU/àËù®ß¯ò–SÍ&@\º‰M∆\yΩFmÄ”˚ñ<RÑèV„±:IÂV∏¢æó±3,/≈˜ÁÑı¿ôQ◊+7Ã.1NÛS÷Àœ∞K¶gÿÑ %>áª∑ƒÍ‡wÛ›ú@≤˚˘_ÌDüø¶∏§zˆBµqÒ√∂_gΩ⁄WPLq028©ƒ#{ÂÌ¡©ß·n>z´[•õÓoPB`Á¡1hõÇ…à∞?nuÊL˚≥ÛÍñº@y7ae±«.ÜÕ≥Íc1ñböÁßë¡¡bN8ﬁˇézÃÕÇπ®â„Ò ˆÏ	í ∏ÜãËﬁ,Ç°ˇÉNœ’åÛÇ8∞˙0ôãiZÓº§'‘Cœ…âºzJE‹rÑb!Ü«AòMåôÇCúNW;-Î\Yﬂ›ö,`Kê∏cä5ì·$∆ÊZµﬁı◊®8ΩﬁÄfˆ6U Cf°ÛY1uM]˘`·èUxq◊≥s-˚´\£$sDJñ
˝ŸµŸ9®™+|OYõVScÇóÄêg·BÎJRÈÇıö±Õ]’¯èXizáõjGW©ÈÄÍ¯Ê‹V&Ï=Za/V9 Ÿπ@—Ëè‘Ka¶+rU•Æ„≈	W¡où>7BˆY≥MêEB√„Æ~±Î÷Î>«¡(ç3ÎPõæZ±Â5u %^´ﬁ|Ó>ï∞^ä(ÂÔ˜©9Uú@M|A≤∫-|J;ù'Ω^iÕzΩG+¸’”yy%ìÉÛô‰§c§¸î¶ï8wb^©⁄{∫‚ûJïç;Û”∂;¿S¶†¶«2wﬁDÜ«%ür∂S+¬?Í§Ù~Ä,Ô“e2dõû2a‹˜4`<f!çúÓê]\“¥¿
g∆∆äôŸ÷aı2Ò¨}ë&˚Cø≤;?tœ≈¯/ñHèÏÔ∂ÿoÆ¶†6Ú
˝^Tf ∏à],≈bÒŒ#äÁ#èîéÓ-¯ßÎá©ä}Ú∏-‘PTÏ£ƒ\ÒTﬁéØ‚7ÀRyg≈zñìm√;k¬˚cÿ@õ≈J⁄teõ;°ö«:ÎL`=úËqÁt?òlë¡ﬁŸwN†dÅ,∆T]πºı•ÂFîÙûÖﬁè“\…Æû1ªtõØ4˘m˙ùâMÉ S9§K€Ô(ı@c&≤©
cÏ2Zoÿæ‹CUnö&ÆÙ+3≥ÿ7'')f∫ë=‘MO˙˝~„æÂzª-+¥˙èp∑Œ\Åd0îÁﬂ∫Y‰mhS‘òÏØ∂¸¶⁄¸”∞Üÿy±àUgÔ¶"k@Zõ
:d]„5#À~˙ï9‘™+&ÿ4À13;®fY.™Y6R¥õ’íﬂ+üKqÌAŸVù…z$≥ıtÍ1"•4ÌÊæ6Ë)ﬂsf!ÛŸ"wB'wŸÉã…ÕäúÜX„Ú%t$ïΩÀ*ØsÈ—¬ÈºÁéŸ$Ì§ﬁÙ–¡ Ír›F7Fzaã¨æ.†™@hx∞FáËcÊ‹C‰¿Ûï9ºw=Ymøh~fŒ…%íï}aπa,Ác˘ÄËôn§œ(tQ‹¶#À y|>Çª>èOi»v«≈Ôo¯Ö‚:Émú7l≥øãﬂ—Ë≈c6≤;v≈Èûˆ—8Ò…ôâŒòùÛi_˛-˛lñãáGñ¢}Ö
bı…¸'Ó(P,LVWû$Òìy(gµ≤äe–Åé`ï‚xSıR›π ø„ë©ä˚yRhÒî∞û<>77ŒBŸ√§»IMïbk™ÒtïQÁ
¯‚øXY©ó«‘~Ó›˝Áoˆ_v∑˜…—Ôﬁº<‹>¯Íw‰.y˝‚˘Àá‰≈≥7˚œv_Ô≤≤úÚ’ã◊X∑≥Â{~qú˙|_!€°…Æ?|›ÎGÓŒˆtvπó-zä˛'ƒ‚_ æ0˙eŒUqÀí|íNØÉTõDgÇ∆πÀ∫˙Œ)aÍkˆÃØ•f &Ë„˚VÃeÁkÍÉ>ÓÊ˛ŒóŒ0*_ŸÉÛiR¸πFÆ'˝ÍH∑~ù˙•ø<ÈØÌì∂J\\8!Í–)yù7”$(]ÿ	Wæ4"˘ wÚ∆Ù∆6Ó√±ìMA}Ï3üÉoŸ]{¯ΩªTj‰Ã°Q÷ ó∞’ó[ö)ﬁ1`ã‘e7~ó‚Ó“R?§c`Q“]_&ù’NπÆ_ylœı”ƒ1<(÷˚áœŒal‰≥s÷{¸Ç›ºXÜ/ÿõã-¯≈ı/»7ª;?‡ìdÑéi“u¢(sıâ∂ƒæ`w!·‰;Ùx±{|∆˘k◊’¡«*?≈È.oJ>|†ÿLôü¥oÃæèSö}M‹ì¸;Hyöm©é∫|˛ÉOg˘†OÚÜèÜ†igÔÄ=‡zÚﬂaÍw«"ÓΩ∆©Håà<"kÎï9a#˘V‹ü@Ê¥*?∑æ™xÆ6e§G÷‡∆œIá^h€ÉÛ|•¡ÃLYnxè&ì˛±Q˛
æ^íëa„áˇÆl!{Ïó¯ªc…0 jØ`>#ÊÑÊc^’∑	?^j®Â±Êùi´Õ`U£uái”`F{ŸWF,:‘<‡∆ãŒ]∫’.æÉ#∫e+Ω¸Eﬁq[?	ó‰≤=gQn.>øAä˝2à”–•8ìÃLúj‰9‘ˇ-ºˇ1ë∆√æ“aåO/-el¢∏˜Òc≤Zà‹˝¿#¸må†≥òîÂ±f,â0®~‰0{CwÂﬂƒüØú {'úΩãñ°ç>(éº”›’e≤OoQ·Æîœ+˜¨qÓí˜Ê‚ˇ  ˇˇ ∫·