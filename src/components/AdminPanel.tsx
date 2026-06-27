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
} from "../types";
import { motion, AnimatePresence } from "motion/react";
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
} from "lucide-react";
import StudentManagement from "./StudentManagement";
import BukuIndukManagement from "./BukuIndukManagement";
import QRScannerModal from "./QRScannerModal";
import StudentPaymentCard from "./StudentPaymentCard";
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

interface AdminPanelProps {
  students: Student[];
  bills: SppBill[];
  transactions: SavingsTransaction[];
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
      initialSavings: number;
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
}

export default function AdminPanel({
  students,
  bills,
  transactions,
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
  miscBills = []
}: AdminPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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
  const [isCreateMiscOpen, setIsCreateMiscOpen] = useState(false);
  const [miscTargetType, setMiscTargetType] = useState<"all" | "class" | "single">("all");
  const [miscTargetClass, setMiscTargetClass] = useState("");
  const [miscTargetStudentId, setMiscTargetStudentId] = useState("");
  const [miscTitle, setMiscTitle] = useState("");
  const [miscAmount, setMiscAmount] = useState("");
  const [miscSearch, setMiscSearch] = useState("");
  const [miscStatusFilter, setMiscStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [isSubmittingMisc, setIsSubmittingMisc] = useState(false);

  // States for Revisi Detail Tagihan Pembayaran Lain-lain
  const [isEditMiscOpen, setIsEditMiscOpen] = useState(false);
  const [editingMiscBill, setEditingMiscBill] = useState<any | null>(null);
  const [editMiscTitle, setEditMiscTitle] = useState("");
  const [editMiscAmount, setEditMiscAmount] = useState("");
  const [isUpdatingMisc, setIsUpdatingMisc] = useState(false);

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
    if (miscTargetType === "class" && !miscTargetClass.trim()) {
      alert("Target kelas tidak boleh kosong.");
      return;
    }
    if (miscTargetType === "single" && !miscTargetStudentId) {
      alert("Harap pilih siswa terlebih dahulu.");
      return;
    }

    try {
      setIsSubmittingMisc(true);
      const payload = {
        targetType: miscTargetType,
        targetValue: miscTargetType === "class" ? miscTargetClass.trim() : miscTargetType === "single" ? miscTargetStudentId : "all",
        title: miscTitle.trim(),
        amount: amountNum
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
      setMiscTargetClass("");
      setMiscTargetStudentId("");
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
      alert("Pembayaran manual berhasil dicatat!");
      onRefresh();
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

  const handleOpenEditMisc = (bill: any) => {
    setEditingMiscBill(bill);
    setEditMiscTitle(bill.title);
    setEditMiscAmount(String(bill.amount));
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
          amount: amountNum
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah detail tagihan.");
      }
      alert("Detail tagihan iuran berhasil direvisi!");
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

  // States for SPP Prestasi Waiver
  const [waiveBillIds, setWaiveBillIds] = useState<string[]>([]);
  const [waiveType, setWaiveType] = useState<'akademik' | 'non-akademik'>('akademik');
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

  useEffect(() => {
    if (adminTab === "config") {
      fetchSystemStatus();
      fetchUploadedFiles();
      const interval = setInterval(fetchSystemStatus, 6000);
      return () => clearInterval(interval);
    }
  }, [adminTab]);

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
          "✔️ Sinkronisasi sukses! Semua koleksi terbaru telah disalin ke Firebase Firestore.",
        );
        fetchSystemStatus();
        onRefresh();
      } else {
        setSyncFeedback(
          `⚠️ Gagal menyinkronkan: ${data.error || "Server error"}`,
        );
      }
    } catch (err) {
      setSyncFeedback(
        "⚠️ Galat koneksi saat mengirim permintaan sinkronisasi.",
      );
    } finally {
      setIsSyncingLive(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const activeStudents = students.filter(
      (s) =>
        !s.class ||
        (s.class.toLowerCase() !== "lulus" &&
          s.class.toLowerCase() !== "lulusan" &&
          s.class.toLowerCase() !== "mutasi" &&
          s.class.toLowerCase() !== "mutasi keluar"),
    );
    const result = !studentSearch.trim()
      ? activeStudents
      : activeStudents.filter(
          (s) =>
            s.name.toLowerCase().includes(studentSearch.toLowerCase().trim()) ||
            s.nis.toLowerCase().includes(studentSearch.toLowerCase().trim()),
        );
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [students, studentSearch]);

  const uniqueClasses = useMemo(() => {
    const cls = new Set<string>();
    students.forEach((s) => {
      if (
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
        s.class &&
        (s.class.toLowerCase() === "mutasi" ||
          s.class.toLowerCase() === "mutasi keluar"),
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
    "harian" | "rekap-spp" | "rekap-tabungan" | null
  >(null);

  // Student financial subtabs inside roster
  const [studentDetailTab, setStudentDetailTab] = useState<"spp" | "savings">(
    "spp",
  );

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
      type: "spp" | "savings_deposit";
      student: Student;
      amount: number;
      billId?: string;
      month?: string;
      year?: number;
      notes?: string;
    }>
  >([]);
  const [processingCart, setProcessingCart] = useState(false);

  // Helper to determine active / inactive state of an SPP bill (for Admin/Cashier)
  const checkIsBillActive = (bill: SppBill, studentId: string) => {
    const studentBills = bills.filter((b) => b.studentId === studentId);
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

    return priorBills.every((b) => b.status === "paid");
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

  const removeFromCart = (cartItemId: string) => {
    setPaymentCart((prev) => prev.filter((item) => item.id !== cartItemId));
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

      for (const item of paymentCart) {
        if (item.type === "spp" && item.billId) {
          const resBill = await onPaySppManual(item.billId);
          if (resBill) {
            executedItems.push({
              name: `SPP Bulanan - ${item.month} ${item.year}`,
              amount: item.amount,
              desc: `Siswa: ${item.student.name} (Kelas ${item.student.class})`,
            });
          }
        } else if (item.type === "savings_deposit") {
          const resTx = await onSavingsManual(
            item.student.id,
            "deposit",
            item.amount,
            item.notes || "Setoran Tabungan",
          );
          if (resTx) {
            executedItems.push({
              name: `Setoran Tabungan Manual`,
              amount: item.amount,
              desc: `Siswa: ${item.student.name} • Memo: "${item.notes || "Setoran"}"`,
            });
          }
        }
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
    "harian" | "rekap-spp" | "rekap-tabungan" | "rekap-absen"
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
  const [currentDateFilter, setCurrentDateFilter] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [rekapSppGradeFilter, setRekapSppGradeFilter] = useState<string>("all");
  const [rekapSppYearFilter, setRekapSppYearFilter] = useState<string>("all");

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
  const [txProcessing, setTxProcessing] = useState(false);

  // Broadcast States
  const [notifTitle, setNotifTitle] = useState<string>("");
  const [notifMessage, setNotifMessage] = useState<string>("");
  const [notifType, setNotifType] = useState<
    "info" | "success" | "warning" | "payment"
  >("info");
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
      "⚠️ APAKAH ANDA YAKIN?\n\nTindakan ini akan menaikkan kelas semua siswa secara otomatis:\n- Kelas 7 -> Kelas 8\n- Kelas 8 -> Kelas 9\n- Kelas 9 -> Lulus";
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
        let textMsg = `🎉 Sukses! Kenaikan kelas massal selesai. ${data.promotedCount} siswa naik kelas, dan ${data.graduatedCount} siswa kelas 9 berhasil dinyatakan Lulus.`;
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

    let confirmMsg = `⚠️ AKTIFKAN TAHUN AJARAN ${yearNum}/${yearNum + 1}?`;
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
        let textMsg = `🎉 Sukses! Tahun Ajaran ${yearNum}/${yearNum + 1} aktif.`;
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
          text: "🎉 Konfigurasi WhatsApp API berhasil disimpan dan disimpan ke memori server!",
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
          text: "🎉 Konfigurasi SPP berhasil disimpan dan disesuaikan ke tagihan unpaid aktif.",
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
          text: "🎉 Sukses! Seluruh data transaksi keuangan & siswa dummy berhasil dikosongkan. Sistem akan memuat ulang halaman...",
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
          text: "🎉 Semua pengaturan API Midtrans & biaya sistem berhasil disimpan!",
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
          "❌ PIN Keamanan salah! Silakan masukkan PIN yang benar.",
        );
      }
    } catch (err) {
      console.error(err);
      setMidtransPinError(
        "🔐 Gagal menghubungkan ke server untuk verifikasi PIN.",
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
    });

    if (success) {
      setSchoolIdentityMsg({
        type: "success",
        text: "🎉 Identitas resmi sekolah berhasil diperbarui dan disiarkan secara waktu nyata.",
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
                      className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3 relative shadow-xs"
                    >
                      <div className="flex flex-wrap justify-between items-center border-b border-amber-200 pb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 px-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                            <ShoppingCart
                              size={12}
                              className="animate-bounce"
                            />
                            <span>
                              KERANJANG PEMBAYARAN TUNAI ({paymentCart.length})
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-700 font-bold tracking-wide">
                            (Digabung Menjadi 1 Kuitansi Kolektif)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentCart([])}
                          className="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase hover:underline cursor-pointer transition-colors"
                        >
                          Kosongkan Keranjang
                        </button>
                      </div>

                      <div className="divide-y divide-amber-200/50 max-h-48 overflow-y-auto pr-1">
                        {paymentCart.map((item) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex justify-between items-center text-xs"
                          >
                            <div className="flex flex-col text-left">
                              <span className="font-extrabold text-slate-800">
                                {item.type === "spp"
                                  ? `SPP Bulanan (${item.month} ${item.year})`
                                  : "Setoran Tabungan Tunai"}
                              </span>
                              <span className="text-[10px] text-slate-550 font-medium">
                                Siswa:{" "}
                                <strong className="text-slate-700">
                                  {item.student.name}
                                </strong>{" "}
                                ({item.student.nis} - Kelas {item.student.class}
                                ){item.notes && ` • Memo: "${item.notes}"`}
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

                      <div className="flex flex-wrap justify-between items-center pt-3 border-t border-amber-200 gap-3 font-bold text-sm bg-amber-100/30 -mx-4 -mb-4 p-4 rounded-b-2xl">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-wider text-amber-800">
                            Total Nominal Pembayaran
                          </span>
                          <span className="font-mono text-slate-900 font-extrabold text-base">
                            Rp{" "}
                            {paymentCart
                              .reduce((total, item) => total + item.amount, 0)
                              .toLocaleString("id-ID")}
                            ,00
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={processingCart}
                          onClick={handleProcessCartCheckout}
                          className={`px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                            processingCart
                              ? "opacity-50 cursor-not-allowed shadow-none"
                              : "hover:from-amber-600 hover:to-orange-600 active:scale-95 cursor-pointer"
                          }`}
                        >
                          {processingCart ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>
                                Sedang Memproses ({paymentCart.length} Item)...
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={13} />
                              <span>Bayar & Cetak 1 Kuitansi Kolektif 🖨</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Switcher Tab utama: Memisahkan tampilan SPP Bulanan dan Histori Tabungan secara mandiri */}
                  <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-xl gap-2 font-sans">
                    <button
                      type="button"
                      onClick={() => setStudentDetailTab("spp")}
                      className={`flex-1 py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
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
                      className={`flex-1 py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
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

                          {/* Informasi & Kebijakan SPP */}
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
                                Pembayaran online via{" "}
                                <strong className="text-emerald-700 font-bold">
                                  Midtrans
                                </strong>{" "}
                                akan disinkronisasi lunas secara instan.
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
                                                  🏆 BEBAS PRESTASI
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
                                                    Cetak 🖨
                                                  </button>
                                                  {b.paymentMethod ===
                                                    "Manual Teller (Sekolah)" &&
                                                    onCancelSppManual && (
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
                                                        title="Batalkan pembayaran manual teller ini"
                                                      >
                                                        Batal ↩
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
                                                    Batal 🔄
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
                                                      if (onPaySppViaMidtrans) {
                                                        setProcessingBillId(
                                                          b.id,
                                                        );
                                                        await onPaySppViaMidtrans(
                                                          b,
                                                        );
                                                        setProcessingBillId(
                                                          null,
                                                        );
                                                      }
                                                    }}
                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded text-[8px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                                                    title="Bayar online menggunakan gerbang pembayaran Midtrans"
                                                  >
                                                    <Zap
                                                      size={9}
                                                      className="text-yellow-355 fill-yellow-355 fill-yellow-350 animate-pulse"
                                                    />
                                                    <span>Midtrans</span>
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
                              (b) => b.studentId === selectedStudent.id && b.status === "unpaid"
                            );

                            return (
                              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-3 text-xs animate-fade-in">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-2 bg-indigo-100 text-indigo-705 rounded-xl">
                                    <Award size={18} strokeWidth={2.5} />
                                  </div>
                                  <div>
                                    <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">🏆 Apresiasi Beasiswa Prestasi</h5>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                      Bebaskan tagihan SPP bulanan bagi siswa berprestasi (akademik maupun non-akademik). Notifikasi apresiasi akan terkirim secara otomatis kepada wali murid.
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
                                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5">2. Kategori Prestasi:</label>
                                        <select
                                          value={waiveType}
                                          onChange={(e) => setWaiveType(e.target.value as any)}
                                          className="w-full p-2 bg-white border border-slate-205 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
                                        >
                                          <option value="akademik">🏆 Prestasi Akademik</option>
                                          <option value="non-akademik">🎨 Prestasi Non-Akademik</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1.5">3. Piagam / Detail Pencapaian:</label>
                                        <input
                                          type="text"
                                          value={waiveDetail}
                                          onChange={(e) => setWaiveDetail(e.target.value)}
                                          placeholder="Contoh: Juara 1 Olimpiade Robotik Provinsi"
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
                                        "Sedang menyimpan data beasiswa..."
                                      ) : (
                                        <span>Simpan Pembebasan {waiveBillIds.length} Bulan SPP 🏆</span>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
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

                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                  Memo / Keterangan
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="cth: Tabungan harian saku"
                                  value={txNotes}
                                  onChange={(e) => setTxNotes(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                                />
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
                                        txNotes,
                                        selectedStudent,
                                      );
                                      setTxAmount("");
                                      setTxNotes("");
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
                                    : "Catat Penarikan Tunai / Manual (Teller) 💸"}
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
                                                Cetak 🖨
                                              </button>
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
                        <span className="text-lg">✅</span> Penarikan Massal
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
                            <span>💡</span>
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
              <div className="p-3 border-b border-slate-150 bg-slate-50/20 flex items-center gap-2">
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
                      ✕
                    </button>
                  )}
                </div>
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
                      filteredStudents.map((student) => {
                        const sBills = bills.filter(
                          (b) => b.studentId === student.id,
                        );
                        const rawUnpaidCount = sBills.filter(
                          (b) => b.status === "unpaid",
                        ).length;
                        const unpaidCount = Math.min(rawUnpaidCount, 12);
                        const nextUnpaidBill = sBills.find(
                          (b) => b.status === "unpaid",
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
                                {/* Pay SPP manual / automated choices */}
                                {nextUnpaidBill ? (
                                  <div className="flex items-center gap-1.5">
                                    {/* Midtrans Cash processing (primary option) */}
                                    <button
                                      id={`admin-pay-midtrans-${student.id}`}
                                      disabled={processingBillId !== null}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (onPaySppViaMidtrans) {
                                          setProcessingBillId(
                                            nextUnpaidBill.id,
                                          );
                                          await onPaySppViaMidtrans(
                                            nextUnpaidBill,
                                          );
                                          setProcessingBillId(null);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm shadow-emerald-100 cursor-pointer flex items-center justify-center gap-1 min-w-[110px]"
                                      title="Terima tunai lalu bayar online via Midtrans sehingga tercatat otomatis"
                                    >
                                      {processingBillId ===
                                      nextUnpaidBill.id ? (
                                        <RefreshCw
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <>
                                          <Zap
                                            size={11}
                                            className="text-yellow-400 fill-yellow-400 animate-pulse"
                                          />
                                          <span>
                                            Tunai Midtrans (
                                            {nextUnpaidBill.month.slice(0, 3)})
                                          </span>
                                        </>
                                      )}
                                    </button>

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
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-205 border border-slate-300 disabled:bg-slate-50 text-slate-600 rounded font-bold text-[9px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                                      title="Selesaikan pembayaran dengan pembayaran tunai manual ke Teller"
                                    >
                                      Manual
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
                                  Mutasi Tabungan
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:border-slate-905 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Kategori Visual
                  </label>
                  <div className="grid grid-cols-4 gap-2">
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
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all text-center cursor-pointer uppercase tracking-wider ${
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
                    : "Siarkan Pengumuman Real-time! 📢"}
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
              <button
                type="button"
                onClick={() => setIsCreateMiscOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-slate-900/10"
              >
                <Plus size={15} />
                <span>Buat Tagihan Baru</span>
              </button>
            </div>

            {/* Filter and Search controls */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, NIS, kelas, atau judul tagihan..."
                  value={miscSearch}
                  onChange={(e) => setMiscSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 focus:border-slate-400 bg-slate-50 focus:bg-white rounded-xl focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMiscStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      miscStatusFilter === "all"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setMiscStatusFilter("unpaid")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      miscStatusFilter === "unpaid"
                        ? "bg-white text-orange-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    Belum Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setMiscStatusFilter("paid")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
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

            {/* List and Table */}
            <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
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
                        const matchText = (
                          bill.title.toLowerCase().includes(miscSearch.toLowerCase()) ||
                          bill.id.toLowerCase().includes(miscSearch.toLowerCase()) ||
                          (s?.name || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                          (s?.nis || "").toLowerCase().includes(miscSearch.toLowerCase()) ||
                          (s?.class || "").toLowerCase().includes(miscSearch.toLowerCase())
                        );
                        if (!matchText) return false;

                        if (miscStatusFilter === "unpaid") return bill.status === "unpaid";
                        if (miscStatusFilter === "paid") return bill.status === "paid";
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-400">
                              Tidak ada data tagihan pembayaran lain-lain yang cocok dengan kriteria pencarian Anda.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(bill => {
                        const s = students.find(st => st.id === bill.studentId);
                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-800">{s?.name || "Siswa Tidak Ditemukan"}</span>
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5">NIS: {s?.nis || "-"} &bull; Kelas: {s?.class || "-"}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{bill.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Ref ID: {bill.id.toUpperCase()}</span>
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
                                    <Clock size={10} /> Belum Lunas
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {bill.status === "unpaid" ? (
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
            </div>

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
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Target Distribusi Tagihan:</label>
                      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("all")}
                          className={`flex-1 py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                          }`}
                        >
                          Seluruh Siswa
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("class")}
                          className={`flex-1 py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "class" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                          }`}
                        >
                          Per Kelas
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiscTargetType("single")}
                          className={`flex-1 py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            miscTargetType === "single" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                          }`}
                        >
                          Siswa Tunggal
                        </button>
                      </div>
                    </div>

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
                      <div className="flex flex-col gap-1.5 animate-fade-in">
                        <label className="font-bold text-slate-700">Pilih Siswa Target:</label>
                        <select
                          value={miscTargetStudentId}
                          onChange={(e) => setMiscTargetStudentId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white focus:border-slate-400 focus:outline-none rounded-xl"
                          required
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {students.map(st => (
                            <option key={st.id} value={st.id}>
                              {st.name} (NIS: {st.nis} - Kelas {st.class})
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
                        disabled={editingMiscBill.status === "paid"}
                        className={`w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl font-mono font-bold ${editingMiscBill.status === "paid" ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                        required
                      />
                      {editingMiscBill.status === "paid" && (
                        <p className="text-[10px] text-orange-600 leading-tight">
                          * Nominal tidak dapat diedit karena tagihan sudah lunas. Jika ingin mengubah nominal, silakan batalkan pembayaran terlebih dahulu.
                        </p>
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
                  <span>{syncFeedback.includes("sukses") ? "✔️" : "⚠️"}</span>
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
                    💡
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
                      Sekarang 🔄
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
                  {isSavingSppRates ? "Menyimpan..." : "Simpan Setelan SPP 💾"}
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
                      : "Perbarui Sandi Bendahara 🔑"}
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
                    <span>Reset Password ke Default (bendahara123) 🔄</span>
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
                      : "Perbarui Sandi Kepala Sekolah 🔑"}
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
                    <span>Reset Password ke Default (kepala123) 🔄</span>
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
                      : "Perbarui Sandi Waka Sarpras 🔑"}
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
                    <span>Reset Password ke Default (sarpras123) 🔄</span>
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
                      : "Perbarui Sandi Guru BK 🔑"}
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
                    <span>Reset Password ke Default (bk123) 🔄</span>
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

                {/* Official Signatures Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
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
                </div>

                {/* Mobile App Download Links Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <div className="md:col-span-2">
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      🔗 Link Unduhan Aplikasi Mobile Sekolah
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
                      📋 Link SK Penugasan Bendahara &amp; Waka Sarpras
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
                    : "Simpan Identitas Sekolah 💾"}
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
                        🚀 PILIHAN A: Kenaikan Kelas Massal
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
                            Massal 👨‍🎓
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CARD OPSI 2: Aktivasi Tahun Ajaran Saja */}
                  <div className="flex flex-col justify-between gap-4 p-4 border border-slate-250 rounded-xl bg-indigo-50/10 text-left">
                    <div>
                      <h4 className="font-extrabold text-slate-850 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        ⚙️ PILIHAN B: Aktifkan Tahun Ajaran Baru Saja
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
                            <Check size={14} /> Aktifkan Tahun Ajaran Saja ✔️
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
                      Pengaturan Terkunci 🔐
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
                        <ShieldCheck size={12} /> Buka Pengaturan 🔑
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
                      🔑 Kredensial API Midtrans
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
                              ? "•••••••••••••••• (Kunci Terenkripsi Aman)"
                              : "Masukkan Server Key keamanan"
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs"
                        />
                        {midtransStatus?.hasServerKey && (
                          <span className="text-[9px] text-emerald-600 mt-0.5 leading-relaxed font-semibold">
                            ✔️ Kunci sudah terintegrasi aman di server.
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
                          🔒 Kosongkan jika tidak ingin mengubah PIN Keamanan
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
                      ⚡ Informasi Biaya Admin Midtrans Otomatis:
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
                          ● DINONAKTIFKAN SEMENTARA
                        </span>
                      ) : midtransStatus?.hasServerKey &&
                        midtransStatus?.clientKey ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                          ● AKTIF (
                          {midtransStatus.isProduction
                            ? "PRODUCTION"
                            : "SANDBOX"}
                          )
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                          ● SIMULASI TELLER
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
                        : "Simpan Semua Pengaturan 💾"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 text-xs flex flex-col gap-2 leading-relaxed text-blue-900"
            >
              <span className="font-bold">
                💡 Informasi Penting Untuk Pengembang:
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
                    💡{" "}
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
                  <span className="text-lg">📲</span> Pengaturan Whatsapp API
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
                      : "Simpan Konfigurasi Whatsapp 📲"}
                  </button>
                </div>
              </form>

              {/* WA Testing Sandbox Section */}
              <div className="mt-2 border-t border-slate-200 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1 flex flex-col justify-center gap-1.5">
                  <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                    🧪 Uji Coba Pengiriman Instan
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
                        {waTesting ? "Mengirim..." : "Kirim Tes 🚀"}
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
                      <span>{waTestFeedback.success ? "✔️" : "⚠️"}</span>
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
                    📤 Unggah Berkas Baru
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
                        Mulai Unggah Berkas 🚀
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Files List */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs block uppercase tracking-wide">
                      📁 Daftar Berkas Terunggah ({uploadedFiles.length})
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
                                  <span className="opacity-40">•</span>
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
                      : "Perbarui Sandi Admin 🔑"}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Pembersihan Data & Reset Sistem Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border-2 border-rose-100 shadow-sm flex flex-col gap-5 text-xs text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-rose-750 text-slate-900 text-sm flex items-center gap-1.5">
                    ⚠️ Pembersihan Data &amp; Inisialisasi Sistem Baru
                  </h3>
                  <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed font-semibold">
                    Gunakan opsi ini jika Anda ingin memulai penggunaan resmi
                    SMP Ma'arif NU Pandaan di lembaga Anda secara ril.
                    Pembersihan ini akan mengosongkan seluruh data transaksi
                    keuangan bawaan (SPP &amp; Tabungan) serta murid dummy
                    bawaan secara aman tanpa memengaruhi data kredensial akses
                    utama.
                  </p>
                </div>
              </div>

              <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 text-slate-700 font-semibold text-xs leading-relaxed flex flex-col gap-2">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  ⚠️ DATA YANG AKAN DIHAPUS PERMANEN:
                </span>
                <ul className="list-disc list-inside flex flex-col gap-1 text-[11px] text-slate-600 ml-1">
                  <li>
                    <strong className="text-rose-950">Semua Data Siswa</strong>{" "}
                    (4 dummy murid bawaan beserta saldo tabungan mereka).
                  </li>
                  <li>
                    <strong className="text-rose-950">
                      Seluruh Transaksi SPP &amp; Tabungan
                    </strong>{" "}
                    (riwayat kwitansi lunas, tagihan bulanan, tarikan &amp;
                    setoran kas).
                  </li>
                  <li>
                    <strong className="text-rose-950">
                      Seluruh Catatan Kehadiran (Absensi) &amp; Jurnal Guru
                    </strong>{" "}
                    (data absensi harian, jurnal mengajar mapel).
                  </li>
                  <li>
                    <strong className="text-rose-950">
                      Portofolio Kedisiplinan &amp; Bimbingan Konseling
                    </strong>{" "}
                    (catatan poin pelanggaran &amp; log bimbingan BK).
                  </li>
                  <li>
                    <strong className="text-rose-950">Aktivitas Sarpras</strong>{" "}
                    (seluruh log pengajuan usulan aset &amp; transaksi
                    peminjaman sarana prasarana).
                  </li>
                </ul>
                <div className="mt-2 border-t border-rose-150 pt-2 text-[10.5px] text-slate-500 italic font-bold">
                  *Catatan: Konfigurasi sistem (seperti nominal tarif SPP, info
                  identitas &amp; cap sekolah, API key Midtrans &amp; WhatsApp,
                  serta password login guru) AKAN TETAP TERJAGA agar Anda tidak
                  perlu mengaturnya ulang dari awal.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetValidationInput("");
                    setResetSystemMsg(null);
                    setShowResetModal(true);
                  }}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-850 text-white font-extrabold rounded-xl uppercase tracking-wider text-[11px] cursor-pointer shadow-md shadow-rose-600/10 flex items-center gap-2 transition-all"
                >
                  <Trash2 size={14} /> Kosongkan Data Dummy &amp; Mulai
                  Penggunaan Ril 🔄
                </button>
              </div>
            </motion.div>

            {/* Reset Confirmation Overlay Modal */}
            {showResetModal && (
              <div className="fixed inset-0 z-250 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  tabIndex={-1}
                  className="bg-white border text-left border-slate-250 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="p-4 bg-rose-950 border-b border-rose-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-900 border border-rose-800 text-rose-200">
                        <AlertCircle size={15} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs tracking-tight">
                          Konfirmasi Pembersihan Data
                        </h3>
                        <p className="text-[9px] text-rose-300 font-bold uppercase tracking-wider">
                          Perhatian Sangat Penting!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="p-1 text-slate-350 hover:bg-rose-900 rounded-lg text-rose-200 hover:text-white cursor-pointer transition-all text-sm font-extrabold"
                    >
                      &times;
                    </button>
                  </div>

                  <form
                    onSubmit={handleResetSystemData}
                    className="p-5 flex flex-col gap-4 text-xs font-semibold"
                  >
                    <div className="p-3 bg-rose-50 rounded-xl text-rose-800 text-[11px] leading-relaxed font-bold border border-rose-100">
                      Sistem akan menghapus seluruh data siswa dummy beserta
                      seluruh data transaksi keuangan (SPP &amp; Tabungan) agar
                      aplikasi SMP Ma'arif NU Pandaan siap dipergunakan ril
                      secara bersih di lembaga Anda. Tindakan ini TIDAK DAPAT
                      DIBATALKAN.
                    </div>

                    {resetSystemMsg && (
                      <div
                        className={`p-3 rounded-xl text-[11px] font-extrabold ${
                          resetSystemMsg.type === "success"
                            ? "bg-emerald-50 border border-emerald-150 text-emerald-850"
                            : "bg-rose-100 border border-rose-200 text-rose-800"
                        }`}
                      >
                        {resetSystemMsg.text}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-405 uppercase text-slate-500">
                        KETIK KATA "
                        <strong className="text-rose-700 tracking-wider">
                          KONFIRMASI
                        </strong>
                        " UNTUK MELANJUTKAN:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ketik KONFIRMASI di sini"
                        value={resetValidationInput}
                        onChange={(e) =>
                          setResetValidationInput(e.target.value)
                        }
                        className="w-full p-2.5 border-2 border-slate-200 focus:border-rose-600 rounded-xl text-slate-800 font-bold uppercase text-center placeholder-slate-400"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowResetModal(false)}
                        className="flex-1 py-3 border border-slate-205 hover:bg-slate-50 text-slate-700 rounded-xl font-bold cursor-pointer transition-all text-center"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isResettingSystem}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-extrabold cursor-pointer transition-all text-center uppercase tracking-wide inline-flex items-center justify-center gap-1.5"
                      >
                        {isResettingSystem
                          ? "Mengosongkan..."
                          : "Mulai Bersih 🔄"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Student CRUD Management */}
        {adminTab === "student_mgmt" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <StudentManagement
              students={students}
              onCreateStudent={onCreateStudent}
              onUpdateStudent={onUpdateStudent}
              onDeleteStudent={onDeleteStudent}
              onImportStudents={onImportStudents}
              onRefresh={onRefresh}
            />
          </motion.div>
        )}

        {/* Tab: Alumni Center & Arrears Resolver */}
        {adminTab === "alumni" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 text-slate-800 text-left"
          >
            {/* Header Card */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] opacity-10">
                <GraduationCap size={160} />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex px-2.5 py-1 text-[9px] font-black tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg uppercase mb-3">
                    🎓 PORTAL ALUMNI & REKONSILIASI ADMINISTRASI
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight font-sans text-slate-100">
                    Buku Alumni Kelas 9 (Siswa Lulus)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Siswa kelas 9 yang dinyatakan Lulus dipindahkan secara
                    otomatis ke basis data Alumni untuk menghindari penumpukan
                    antrean siswa aktif. Dashboard ini disediakan khusus untuk
                    memantau sisa saldo tabungan serta mempermudah penagihan
                    sisa tunggakan iuran SPP siswa yang sudah lulus.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stat Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                  <GraduationCap size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Total Alumni
                  </span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {
                      students.filter(
                        (s) =>
                          s.class &&
                          (s.class.toLowerCase() === "lulus" ||
                            s.class.toLowerCase() === "lulusan"),
                      ).length
                    }{" "}
                    Siswa
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Masih Punya Tunggakan
                  </span>
                  <span className="text-lg font-black text-rose-600 font-mono">
                    {
                      students.filter((s) => {
                        const isAl =
                          s.class &&
                          (s.class.toLowerCase() === "lulus" ||
                            s.class.toLowerCase() === "lulusan");
                        if (!isAl) return false;
                        return (
                          bills.filter(
                            (b) =>
                              b.studentId === s.id && b.status === "unpaid",
                          ).length > 0
                        );
                      }).length
                    }{" "}
                    Siswa
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Banknote size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Total Tunggakan SPP
                  </span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    Rp{" "}
                    {bills
                      .filter((b) => {
                        const student = students.find(
                          (s) => s.id === b.studentId,
                        );
                        const isAl =
                          student?.class &&
                          (student.class.toLowerCase() === "lulus" ||
                            student.class.toLowerCase() === "lulusan");
                        return isAl && b.status === "unpaid";
                      })
                      .reduce((sum, b) => sum + b.amount, 0)
                      .toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <RefreshCw size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Dana Tabungan Alumni
                  </span>
                  <span className="text-lg font-black text-emerald-600 font-mono">
                    Rp{" "}
                    {students
                      .filter(
                        (s) =>
                          s.class &&
                          (s.class.toLowerCase() === "lulus" ||
                            s.class.toLowerCase() === "lulusan"),
                      )
                      .reduce((sum, s) => sum + s.savingsBalance, 0)
                      .toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Alumni Search & List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari alumni berdasarkan Nama Lengkap atau NIS..."
                    value={alumniSearch}
                    onChange={(e) => setAlumniSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition-all font-medium"
                  />
                </div>
                {alumniSearch && (
                  <button
                    type="button"
                    onClick={() => setAlumniSearch("")}
                    className="px-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>

              <div className="overflow-x-auto text-[11px] sm:text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-150">
                      <th className="px-5 py-3.5">Nama Alumni</th>
                      <th className="px-5 py-3.5">NIS</th>
                      <th className="px-5 py-3.5 text-right">
                        Sisa Saldo Tabungan
                      </th>
                      <th className="px-5 py-3.5 text-center">
                        Bulan Tunggakan
                      </th>
                      <th className="px-5 py-3.5 text-right">
                        Jumlah Tunggakan
                      </th>
                      <th className="px-5 py-3.5 text-center">
                        Status Keuangan
                      </th>
                      <th className="px-5 py-3.5 text-center">
                        Aksi Administrasi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredAlumni.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-12 text-center text-slate-400 font-medium bg-slate-50/10"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <GraduationCap
                              size={24}
                              className="text-slate-300"
                            />
                            <span>
                              Tidak ditemukan data alumni di bawah kriteria
                              pencarian.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAlumni.map((alumnus) => {
                        const sBills = bills.filter(
                          (b) => b.studentId === alumnus.id,
                        );
                        const unpaidBills = sBills.filter(
                          (b) => b.status === "unpaid",
                        );
                        const totalUnpaid = unpaidBills.reduce(
                          (sum, b) => sum + b.amount,
                          0,
                        );
                        const hasDebt = unpaidBills.length > 0;

                        return (
                          <tr
                            key={alumnus.id}
                            className={`hover:bg-slate-100/30 transition-colors ${selectedStudent?.id === alumnus.id ? "bg-indigo-50/10 font-bold" : ""}`}
                          >
                            <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                              <span>🎓</span>
                              <span>{alumnus.name}</span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-500">
                              {alumnus.nis}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600">
                              Rp{" "}
                              {alumnus.savingsBalance.toLocaleString("id-ID")}
                            </td>
                            <td className="px-5 py-3.5 text-center font-bold">
                              {unpaidBills.length > 0 ? (
                                <span className="text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-0.5 font-mono">
                                  {unpaidBills.length} Bulan
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-605 text-rose-600">
                              Rp {totalUnpaid.toLocaleString("id-ID")}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {hasDebt ? (
                                <span className="inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 rounded-md">
                                  ⚠️ Ada Tunggakan
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md">
                                  ✔️ Lunas Lengkap
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedStudent(alumnus)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                              >
                                Buka Kuitansi & Rekening
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Selected Alumnus Financial Logs */}
            <AnimatePresence>
              {selectedStudent &&
                (selectedStudent.class === "Lulus" ||
                  selectedStudent.class === "Lulusan") && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5 text-xs text-left"
                  >
                    <div className="flex justify-between items-start pb-4 border-b border-slate-200 gap-4 flex-wrap">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <User size={16} className="text-yellow-600" /> Profil
                          & Buku Kas Alumni: {selectedStudent.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Status:{" "}
                          <strong className="text-yellow-600">
                            ALUMNI LULUSAN
                          </strong>{" "}
                          &bull; NIS:{" "}
                          <strong className="font-mono">
                            {selectedStudent.nis}
                          </strong>{" "}
                          &bull; Kelola sisa tagihan/tunggakan dan sisa
                          tabungan.
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-slate-500 hover:text-slate-950 font-extrabold border border-slate-250 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-wider bg-slate-55 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer shadow-3xs"
                      >
                        Sembunyikan Panel
                      </button>
                    </div>

                    {/* Switcher Tab Alumni SPP vs Tabungan */}
                    <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-xl gap-2 font-sans">
                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("spp")}
                        className={`flex-1 py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                          studentDetailTab === "spp"
                            ? "bg-slate-900 text-white border-transparent shadow-md font-extrabold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <BookOpen size={14} />
                        Tunggakan SPP Alumni (
                        {
                          bills.filter(
                            (b) =>
                              b.studentId === selectedStudent.id &&
                              b.status === "unpaid",
                          ).length
                        }{" "}
                        Bulan)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("savings")}
                        className={`flex-1 py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                          studentDetailTab === "savings"
                            ? "bg-slate-900 text-white border-transparent shadow-md font-extrabold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Banknote size={14} />
                        Rekening Tabungan (Sisa Rp{" "}
                        {selectedStudent.savingsBalance.toLocaleString("id-ID")}
                        )
                      </button>
                    </div>

                    {studentDetailTab === "spp" ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left: Alumnus Spp Stat Block */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                          <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950 to-slate-900 text-white shadow-md flex flex-col justify-between min-h-[110px] relative overflow-hidden text-left">
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                              <ShieldAlert size={100} />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-widest font-extrabold text-rose-300">
                                TOTAL TUNGGAKAN ALUMNI
                              </span>
                              <span className="text-xl font-mono font-black block mt-2">
                                Rp{" "}
                                {bills
                                  .filter(
                                    (b) =>
                                      b.studentId === selectedStudent.id &&
                                      b.status === "unpaid",
                                  )
                                  .reduce((sum, b) => sum + b.amount, 0)
                                  .toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="mt-4 pt-2 border-t border-rose-800/40 text-[9px] text-rose-300 font-semibold uppercase tracking-wide">
                              {
                                bills.filter(
                                  (b) =>
                                    b.studentId === selectedStudent.id &&
                                    b.status === "unpaid",
                                ).length
                              }{" "}
                              Bulan Belum Diselesaikan
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl leading-relaxed text-slate-505 dark:text-slate-600 text-left">
                            <h5 className="font-extrabold text-slate-800 text-[10px] tracking-wider uppercase mb-2">
                              💡 Kebijakan Tunggakan Alumni
                            </h5>
                            <p className="text-[11px] leading-relaxed">
                              Alumni yang dinyatakan Lulus diwajibkan
                              menyelesaikan seluruh iuran tagihannya untuk
                              kelancaran administrasi (cetak ijazah,
                              rekomendasi, dsb). Bukukan transaksi pembayaran di
                              tabel sebelah kanan.
                            </p>
                          </div>
                        </div>

                        {/* Right: SPP Bills List Table & Manual Payment Option */}
                        <div className="lg:col-span-8 bg-slate-50/50 p-4 border border-slate-200 rounded-xl text-left">
                          <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-3">
                            Daftar Detail Tagihan & Kuitansi SPP
                          </h4>

                          <div className="overflow-y-auto max-h-[300px] border border-slate-150 rounded-lg">
                            <table className="w-full text-left bg-white text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-150">
                                  <th className="px-4 py-2">Bulan & Tahun</th>
                                  <th className="px-4 py-2 text-right">
                                    Tarif Tagihan
                                  </th>
                                  <th className="px-4 py-2 text-center">
                                    Status
                                  </th>
                                  <th className="px-4 py-2 text-right">
                                    Tindakan Pembayaran
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {bills.filter(
                                  (b) => b.studentId === selectedStudent.id,
                                ).length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-4 py-8 text-center text-slate-400"
                                    >
                                      Tidak ada riwayat tagihan SPP untuk siswa
                                      ini.
                                    </td>
                                  </tr>
                                ) : (
                                  [
                                    ...bills.filter(
                                      (b) => b.studentId === selectedStudent.id,
                                    ),
                                  ]
                                    .sort((a, b) => b.year - a.year)
                                    .map((bill) => (
                                      <tr
                                        key={bill.id}
                                        className="hover:bg-slate-50/50"
                                      >
                                        <td className="px-4 py-3 font-semibold text-slate-800">
                                          {bill.month} {bill.year}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                                          Rp{" "}
                                          {bill.amount.toLocaleString("id-ID")}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          {bill.status === "paid" ? (
                                            <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-wide">
                                              Terbayar Lunas
                                            </span>
                                          ) : isSppBillOverdue(bill) ? (
                                            <span className="inline-flex px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[9px] font-black uppercase tracking-wide">
                                              Menunggak ⚠️
                                            </span>
                                          ) : (
                                            <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-black uppercase tracking-wide">
                                              Belum Bayar
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          {bill.status === "paid" ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReceiptToPrint({
                                                  type: "spp",
                                                  detail: bill,
                                                  student: selectedStudent,
                                                });
                                                setPrintId(
                                                  "print-receipt-section",
                                                );
                                              }}
                                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded font-bold text-[9px] uppercase tracking-wider transition-all shadow-3xs cursor-pointer inline-flex items-center gap-1 leading-none"
                                            >
                                              <Printer
                                                size={10}
                                                className="text-slate-600"
                                              />{" "}
                                              Cetak 🖨
                                            </button>
                                          ) : (
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                type="button"
                                                disabled={
                                                  processingBillId !== null
                                                }
                                                onClick={async () => {
                                                  setProcessingBillId(bill.id);
                                                  const resB =
                                                    await onPaySppManual(
                                                      bill.id,
                                                    );
                                                  setProcessingBillId(null);
                                                  if (resB) {
                                                    onRefresh();
                                                    setReceiptToPrint({
                                                      type: "spp",
                                                      detail: {
                                                        ...bill,
                                                        status: "paid",
                                                        paidAt:
                                                          new Date().toISOString(),
                                                        paymentMethod:
                                                          "Manual Teller (Sekolah) Alumni",
                                                        orderId:
                                                          resB.orderId ||
                                                          `ORD-MANUAL-${Date.now()}`,
                                                      },
                                                      student: selectedStudent,
                                                    });
                                                    setPrintId(
                                                      "print-receipt-section",
                                                    );
                                                  }
                                                }}
                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-3xs inline-flex items-center gap-1"
                                              >
                                                {processingBillId ===
                                                bill.id ? (
                                                  <RefreshCw
                                                    size={9}
                                                    className="animate-spin"
                                                  />
                                                ) : (
                                                  <span>Bayar Manual</span>
                                                )}
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left: Tabungan Mutation Form */}
                        <div className="lg:col-span-5 bg-slate-50 p-4 border border-slate-200 rounded-xl text-left">
                          <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-widest mb-3 flex items-center gap-1.5">
                            💼 Mutasi Saldo Tabungan
                          </h4>

                          <form
                            onSubmit={handleSavingsSubmit}
                            className="flex flex-col gap-3.5"
                          >
                            <div className="grid grid-cols-2 p-1 bg-slate-200 rounded-lg text-slate-700">
                              <button
                                type="button"
                                onClick={() => setTxType("deposit")}
                                className={`py-1.5 text-center font-extrabold text-[10px] uppercase rounded-md transition-all cursor-pointer ${
                                  txType === "deposit"
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                Setor Tabungan
                              </button>
                              <button
                                type="button"
                                onClick={() => setTxType("withdrawal")}
                                className={`py-1.5 text-center font-extrabold text-[10px] uppercase rounded-md transition-all cursor-pointer ${
                                  txType === "withdrawal"
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                Tarik Tabungan
                              </button>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase">
                                Jumlah Transaksi (Rp)
                              </label>
                              <input
                                type="number"
                                required
                                min="500"
                                placeholder="Contoh: 50000"
                                value={txAmount}
                                onChange={(e) => setTxAmount(e.target.value)}
                                className="p-2 bg-white text-xs border border-slate-250 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase">
                                Memo / Keterangan Tambahan
                              </label>
                              <input
                                type="text"
                                placeholder="Tulis alasan, contoh: Pengembalian sisa tabungan kelulusan..."
                                value={txNotes}
                                onChange={(e) => setTxNotes(e.target.value)}
                                className="p-2 bg-white text-xs border border-slate-250 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={txProcessing || !txAmount}
                              className={`w-full py-2.5 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-1 ${
                                txType === "deposit"
                                  ? "bg-indigo-600 hover:bg-indigo-750"
                                  : "bg-rose-600 hover:bg-rose-700"
                              }`}
                            >
                              {txProcessing ? (
                                <RefreshCw size={11} className="animate-spin" />
                              ) : (
                                <>
                                  <span>
                                    {txType === "deposit"
                                      ? "📥 Simpan Setoran"
                                      : "📤 Eksekusi Penarikan"}
                                  </span>
                                </>
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Right: Tabungan History List */}
                        <div className="lg:col-span-7 bg-slate-50/50 p-4 border border-slate-200 rounded-xl text-left">
                          <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-3">
                            Histori Tabungan Alumni
                          </h4>

                          <div className="overflow-y-auto max-h-[300px] border border-slate-150 rounded-lg">
                            <table className="w-full text-left bg-white text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-150">
                                  <th className="px-4 py-2">Tanggal Mutasi</th>
                                  <th className="px-4 py-2 text-center">
                                    Jenis
                                  </th>
                                  <th className="px-4 py-2 text-right">
                                    Nominal
                                  </th>
                                  <th className="px-4 py-2 text-right">
                                    Kuitansi
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {transactions.filter(
                                  (t) =>
                                    t.studentId === selectedStudent.id &&
                                    t.status === "success",
                                ).length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-4 py-8 text-center text-slate-400"
                                    >
                                      Tidak ada catatan transaksi tabungan untuk
                                      siswa ini.
                                    </td>
                                  </tr>
                                ) : (
                                  [
                                    ...transactions.filter(
                                      (t) =>
                                        t.studentId === selectedStudent.id &&
                                        t.status === "success",
                                    ),
                                  ]
                                    .sort((a, b) =>
                                      b.createdAt.localeCompare(a.createdAt),
                                    )
                                    .map((tx) => (
                                      <tr
                                        key={tx.id}
                                        className="hover:bg-slate-50/50"
                                      >
                                        <td className="px-4 py-3 font-semibold text-slate-800">
                                          {new Date(
                                            tx.createdAt,
                                          ).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                          <div
                                            className="text-[9px] text-slate-400 max-w-[150px] truncate"
                                            title={tx.notes}
                                          >
                                            {tx.notes || "-"}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          {tx.type === "deposit" ? (
                                            <span className="inline-flex px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-wide">
                                              Setor 📥
                                            </span>
                                          ) : (
                                            <span className="inline-flex px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[9px] font-black uppercase tracking-wide">
                                              Tarik 📤
                                            </span>
                                          )}
                                        </td>
                                        <td
                                          className={`px-4 py-3 text-right font-mono font-bold ${tx.type === "deposit" ? "text-emerald-600" : "text-slate-800"}`}
                                        >
                                          Rp {tx.amount.toLocaleString("id-ID")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setReceiptToPrint({
                                                type: "savings",
                                                detail: tx,
                                                student: selectedStudent,
                                              });
                                              setPrintId(
                                                "print-receipt-section",
                                              );
                                            }}
                                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded font-bold text-[9px] uppercase tracking-wider shadow-3xs cursor-pointer inline-flex items-center gap-1 leading-none"
                                          >
                                            <Printer
                                              size={10}
                                              className="text-slate-600"
                                            />{" "}
                                            Cetak
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Tab: Siswa Mutasi Center & Reconciliator */}
        {adminTab === "mutasi" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 text-slate-800 text-left"
          >
            {/* Header Card */}
            <div className="bg-gradient-to-r from-orange-850 to-orange-900 bg-orange-950 rounded-2xl p-6 text-white border border-orange-800 shadow-sm relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] opacity-10">
                <RefreshCw size={160} />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex px-2.5 py-1 text-[9px] font-black tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/35 rounded-lg uppercase mb-3">
                    🔁 PORTAL SISWA MUTASI & REKONSILIASI
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight font-sans text-slate-100">
                    Siswa Mutasi (Keluar Sekolah)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Menu administrasi khusus untuk mencatat dan mengelola status
                    kepindahan (mutasi keluar) siswa. Di sini Anda dapat
                    memindahkan siswa ke luar sekolah serta memantau dan
                    menyelesaikan sisa tunggakan SPP maupun penarikan sisa dana
                    tabungannya.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setMutateStudentId("");
                      setMutateReason("");
                      setMutateDestination("");
                      setMutateError("");
                      setIsMutateModalOpen(true);
                    }}
                    className="px-4.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <PlusCircle size={15} />
                    Proses Mutasi Baru
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stat Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                  <RefreshCw size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Total Siswa Mutasi
                  </span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {
                      students.filter(
                        (s) =>
                          s.class &&
                          (s.class.toLowerCase() === "mutasi" ||
                            s.class.toLowerCase() === "mutasi keluar"),
                      ).length
                    }{" "}
                    Siswa
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Ada Tunggakan SPP
                  </span>
                  <span className="text-lg font-black text-rose-600 font-mono">
                    {
                      students.filter((s) => {
                        const isMut =
                          s.class &&
                          (s.class.toLowerCase() === "mutasi" ||
                            s.class.toLowerCase() === "mutasi keluar");
                        if (!isMut) return false;
                        return (
                          bills.filter(
                            (b) =>
                              b.studentId === s.id && b.status === "unpaid",
                          ).length > 0
                        );
                      }).length
                    }{" "}
                    Siswa
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Total Sisa Tabungan
                  </span>
                  <span className="text-lg font-black text-indigo-700 font-mono">
                    Rp{" "}
                    {students
                      .filter(
                        (s) =>
                          s.class &&
                          (s.class.toLowerCase() === "mutasi" ||
                            s.class.toLowerCase() === "mutasi keluar"),
                      )
                      .reduce((sum, s) => sum + s.savingsBalance, 0)
                      .toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Banknote size={20} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Total Tunggakan SPP
                  </span>
                  <span className="text-lg font-black text-amber-700 font-mono">
                    Rp{" "}
                    {(() => {
                      const mutatedIds = students
                        .filter(
                          (s) =>
                            s.class &&
                            (s.class.toLowerCase() === "mutasi" ||
                              s.class.toLowerCase() === "mutasi keluar"),
                        )
                        .map((s) => s.id);
                      return bills
                        .filter(
                          (b) =>
                            mutatedIds.includes(b.studentId) &&
                            b.status === "unpaid",
                        )
                        .reduce((sum, b) => sum + b.amount, 0);
                    })().toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Split Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Mutated Student Lists */}
              <div
                className={`${selectedStudent && (selectedStudent.class?.toLowerCase() === "mutasi" || selectedStudent.class?.toLowerCase() === "mutasi keluar") ? "lg:col-span-5" : "lg:col-span-12"} bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 text-left`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Buku Catatan Siswa Mutasi Keluar
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Daftar siswa yang telah berpindah sekolah
                    </p>
                  </div>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-2 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Cari Nama/NIS..."
                      value={mutatedSearch}
                      onChange={(e) => setMutatedSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 w-full sm:w-[180px] text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg focus:border-orange-500 focus:outline-hidden placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-150">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-150 tracking-wider">
                        <th className="px-4 py-3">Siswa</th>
                        <th className="px-4 py-3">Info Mutasi</th>
                        <th className="px-4 py-3 text-right">Sisa Tabungan</th>
                        <th className="px-4 py-3 text-right">Tunggakan SPP</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredMutatedStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-12 text-center text-slate-400"
                          >
                            Tidak menemukan data siswa mutasi yang sesuai.
                          </td>
                        </tr>
                      ) : (
                        filteredMutatedStudents.map((student) => {
                          const sUnpaid = bills.filter(
                            (b) =>
                              b.studentId === student.id &&
                              b.status === "unpaid",
                          );
                          const hasDebt = sUnpaid.length > 0;
                          const totalDebt = sUnpaid.reduce(
                            (sum, b) => sum + b.amount,
                            0,
                          );
                          const isCurrentlySelected =
                            selectedStudent?.id === student.id;

                          return (
                            <tr
                              key={student.id}
                              className={`transition-all hover:bg-orange-50/5 ${isCurrentlySelected ? "bg-orange-50/10" : ""}`}
                            >
                              <td className="px-4 py-4">
                                <div className="font-extrabold text-slate-900 text-sm">
                                  {student.name}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">
                                  NIS: {student.nis}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-[11px] font-bold text-slate-700">
                                  Tgl: {student.mutationDate || "-"}
                                </div>
                                <div
                                  className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]"
                                  title={student.mutationDestination}
                                >
                                  Ke:{" "}
                                  {student.mutationDestination ||
                                    "Tidak disebutkan"}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right font-mono font-bold text-slate-850">
                                Rp{" "}
                                {student.savingsBalance.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-4 text-right font-mono">
                                <span
                                  className={
                                    hasDebt
                                      ? "font-extrabold text-rose-600"
                                      : "text-slate-400"
                                  }
                                >
                                  Rp {totalDebt.toLocaleString("id-ID")}
                                </span>
                                {hasDebt && (
                                  <div className="text-[9px] font-extrabold text-rose-500 uppercase tracking-tight mt-0.5">
                                    {sUnpaid.length} Bulan
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudent(student)}
                                    className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    Keuangan 💳
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Akan membatalkan status mutasi ${student.name}?\n\nSiswa akan dikembalikan sebagai siswa aktif.`,
                                        )
                                      ) {
                                        const nomClass = prompt(
                                          "Masukkan kembali Kelas tempat siswa tersebut ditempatkan (Contoh: 7-A, 8-B, 9-C):",
                                          "7-A",
                                        );
                                        if (nomClass) {
                                          const success = await onUpdateStudent(
                                            student.id,
                                            {
                                              nis: student.nis,
                                              name: student.name,
                                              class: nomClass,
                                              email: student.email || "",
                                              phone: student.phone || "",
                                              mutationDate: "",
                                              mutationReason: "",
                                              mutationDestination: "",
                                            },
                                          );
                                          if (success) {
                                            alert(
                                              `Status mutasi siswa ${student.name} berhasil dibatalkan.`,
                                            );
                                            setSelectedStudent(null);
                                          } else {
                                            alert(
                                              "Gagal memperbarui status siswa.",
                                            );
                                          }
                                        }
                                      }
                                    }}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg transition-all cursor-pointer"
                                    title="Batalkan Mutasi (Kembalikan Aktif)"
                                  >
                                    Batal 🔄
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
              </div>

              {/* Right Column: Mutated Student Detail Panel */}
              {selectedStudent &&
                (selectedStudent.class?.toLowerCase() === "mutasi" ||
                  selectedStudent.class?.toLowerCase() === "mutasi keluar") && (
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-6 text-left animate-fade-in">
                    {/* Top Bar Detail */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                          <RefreshCw size={20} className="stroke-[2.5px]" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            {selectedStudent.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            NIS: {selectedStudent.nis} • Status Mutasi Keluar
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        className="p-1 px-2 border border-slate-200 hover:bg-slate-50 text-slate-550 rounded-lg text-xs cursor-pointer transition-all font-semibold"
                      >
                        Tutup
                      </button>
                    </div>

                    {/* Passport Metadata Box */}
                    <div className="p-4 bg-orange-50/30 rounded-xl border border-orange-100 flex flex-col gap-2.5">
                      <h5 className="font-extrabold text-xs text-orange-850 uppercase tracking-widest leading-none">
                        📋 Berita Acara & Fakta Mutasi Keluar
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                            Tanggal Keluar
                          </span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5">
                            {selectedStudent.mutationDate || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                            Sekolah Penerima/Tujuan
                          </span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5">
                            {selectedStudent.mutationDestination || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                            Alasan Kepindahan
                          </span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5 italic">
                            {selectedStudent.mutationReason || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financial State Details Tabs */}
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Block SPP debt summary */}
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="p-1 bg-amber-100 text-amber-805 rounded-md text-[9px] font-black uppercase tracking-wider">
                                TUNGGAKAN SPP
                              </span>
                              <span className="text-[10px] font-extrabold text-amber-700 font-mono">
                                {
                                  bills.filter(
                                    (b) =>
                                      b.studentId === selectedStudent.id &&
                                      b.status === "unpaid",
                                  ).length
                                }{" "}
                                Bulan
                              </span>
                            </div>
                            <span className="text-xl font-mono font-black text-amber-900 block mt-3">
                              Rp{" "}
                              {bills
                                .filter(
                                  (b) =>
                                    b.studentId === selectedStudent.id &&
                                    b.status === "unpaid",
                                )
                                .reduce((sum, b) => sum + b.amount, 0)
                                .toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="text-[10px] mt-4 text-amber-800 leading-relaxed font-semibold">
                            Segera bukukan pembayaran jika siswa yang mutasi
                            melunasi sisa tagihan yang masih tertunggak.
                          </p>
                        </div>

                        {/* Right Block Savings balance summary */}
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="p-1 bg-indigo-100 text-indigo-805 rounded-md text-[9px] font-black uppercase tracking-wider font-sans">
                                SISA TABUNGAN
                              </span>
                              <span className="text-[10px] font-extrabold text-indigo-700 font-mono">
                                Saldo
                              </span>
                            </div>
                            <span className="text-xl font-mono font-black text-indigo-900 block mt-3">
                              Rp{" "}
                              {selectedStudent.savingsBalance.toLocaleString(
                                "id-ID",
                              )}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={selectedStudent.savingsBalance <= 0}
                            onClick={() => {
                              const noteStr = `Penarikan penutupan sisa dana tabungan mutasi keluar: ${selectedStudent.name}`;
                              onSavingsManual(
                                selectedStudent.id,
                                "withdrawal",
                                selectedStudent.savingsBalance,
                                noteStr,
                              );
                            }}
                            className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-lg shadow-2xs transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Tarik Tutup Tabungan 💸
                          </button>
                        </div>
                      </div>

                      {/* Left Column SPP Bills & Savings log tables */}
                      <div className="border border-slate-150 rounded-2xl overflow-hidden mt-2 bg-slate-50/30 p-4">
                        <h4 className="font-extrabold text-slate-800 text-[10px] tracking-wider uppercase mb-3">
                          Daftar Kewajiban SPP yang Harus Selesai
                        </h4>
                        <div className="overflow-y-auto max-h-[220px] rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                              <tr>
                                <th className="px-4 py-2 bg-slate-100">
                                  Bulan
                                </th>
                                <th className="px-4 py-2 bg-slate-100 text-right">
                                  Jumlah
                                </th>
                                <th className="px-4 py-2 bg-slate-100 text-center">
                                  Status
                                </th>
                                <th className="px-4 py-2 bg-slate-100 text-right">
                                  Tindakan
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 text-slate-705">
                              {bills.filter(
                                (b) => b.studentId === selectedStudent.id,
                              ).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="px-4 py-6 text-center text-slate-400"
                                  >
                                    Tidak ada riwayat tagihan SPP.
                                  </td>
                                </tr>
                              ) : (
                                [
                                  ...bills.filter(
                                    (b) => b.studentId === selectedStudent.id,
                                  ),
                                ]
                                  .sort((a, b) => b.year - a.year)
                                  .map((b) => (
                                    <tr
                                      key={b.id}
                                      className="hover:bg-slate-50/50"
                                    >
                                      <td className="px-4 py-2.5 font-bold">
                                        {b.month} {b.year}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono font-bold">
                                        Rp {b.amount.toLocaleString("id-ID")}
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span
                                          className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold ${
                                            b.status === "paid"
                                              ? "bg-emerald-50 text-emerald-705 border border-emerald-100"
                                              : b.status === "waived"
                                                ? "bg-indigo-50 text-indigo-750 border border-indigo-100"
                                                : "bg-rose-50 text-rose-705 border border-rose-100"
                                          }`}
                                        >
                                          {b.status === "paid"
                                            ? "Lunas"
                                            : b.status === "waived"
                                              ? "Beasiswa 🏆"
                                              : "Belum Lunas"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        {b.status === "paid" ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setReceiptToPrint({
                                                type: "spp",
                                                detail: b,
                                                student: selectedStudent,
                                              });
                                              setPrintId(
                                                "print-receipt-section",
                                              );
                                            }}
                                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-0.5"
                                          >
                                            <Printer size={9} /> Cetak
                                          </button>
                                        ) : b.status === "waived" ? (
                                          <div className="flex flex-col items-end gap-1">
                                            <span className="text-[9px] text-slate-500 font-medium italic max-w-[150px] truncate" title={b.achievementDetail}>
                                              {b.achievementDetail || "Apresiasi Prestasi"}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleCancelSppWaived(b.id)}
                                              className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded text-[8px] font-bold uppercase transition-all cursor-pointer"
                                            >
                                              Batal Beasiswa 🔄
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            disabled={processingBillId !== null}
                                            onClick={async () => {
                                              setProcessingBillId(b.id);
                                              const success =
                                                await onPaySppManual(b.id);
                                              setProcessingBillId(null);
                                              if (success) {
                                                onRefresh();
                                                setReceiptToPrint({
                                                  type: "spp",
                                                  detail: b,
                                                  student: selectedStudent,
                                                });
                                                setPrintId(
                                                  "print-receipt-section",
                                                );
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded transition-all cursor-pointer"
                                          >
                                            Bayar 💸
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </motion.div>
        )}

        {/* Tab: Homeroom/Wali Kelas CRUD Management */}
        {adminTab === "homeroom_mgmt" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">
                  Manajemen Akun Wali Kelas (Absensi)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Daftarkan dan kelola akun bimbingan wali kelas untuk
                  memberikan otorisasi presensi harian siswa.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setImportTeacherType("homeroom");
                    setTeacherImportError(null);
                    setTeacherImportSuccess(null);
                    setPreviewTeacherData([]);
                    setIsImportTeacherOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-xs font-bold hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud size={13} />
                  <span>Import Wali Kelas (CSV)</span>
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Tambah/Ubah Wali Kelas (Left) */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <PlusCircle size={14} className="text-indigo-600" />
                  {editingHomeroomId
                    ? "Ubah Informasi Wali Kelas"
                    : "Daftar Wali Kelas Baru"}
                </h4>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsActionLoading(true);
                    setMgmtError(null);
                    setMgmtSuccess(null);

                    if (
                      formPassword &&
                      formPassword.trim().length > 0 &&
                      formPassword.trim().length < 6
                    ) {
                      setMgmtError("Kata sandi harus minimal 6 karakter!");
                      setIsActionLoading(false);
                      return;
                    }

                    try {
                      if (editingHomeroomId) {
                        if (onUpdateHomeroom) {
                          const res = await onUpdateHomeroom(
                            editingHomeroomId,
                            {
                              username: formUsername,
                              name: formName,
                              className: formClassName,
                              password: formPassword || undefined,
                              skUrl: formSkUrl,
                            },
                          );
                          if (res) {
                            setMgmtSuccess(
                              "Berhasil memperbarui data Wali Kelas!",
                            );
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError("Gagal memperbarui data wali kelas.");
                          }
                        }
                      } else {
                        if (onCreateHomeroom) {
                          const res = await onCreateHomeroom({
                            username: formUsername,
                            name: formName,
                            className: formClassName,
                            password: formPassword,
                            skUrl: formSkUrl,
                          });
                          if (res) {
                            setMgmtSuccess(
                              "Berhasil mendaftarkan Wali Kelas baru!",
                            );
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError(
                              "Username sudah terpakai atau data tidak valid.",
                            );
                          }
                        }
                      }
                    } catch (err) {
                      setMgmtError("Terjadi kesalahan sistem.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="flex flex-col gap-4 text-xs"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Nama Lengkap Wali Kelas
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ibu Siti Aminah, S.Pd"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-800 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Bimbingan Kelas (Nama Kelas)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 7-A atau 8-B"
                      value={formClassName}
                      onChange={(e) => setFormClassName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Username Login
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: sitiaminah7a"
                      value={formUsername}
                      onChange={(e) =>
                        setFormUsername(
                          e.target.value.toLowerCase().replace(/\s+/g, ""),
                        )
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">
                    <label className="font-bold text-amber-850">
                      Kata Sandi{" "}
                      {editingHomeroomId
                        ? "(Reset/Ganti Baru)"
                        : "(Sandi Akun Baru) *"}
                    </label>
                    <input
                      type="password"
                      required={!editingHomeroomId}
                      placeholder={
                        editingHomeroomId
                          ? "Isi untuk mereset sandi wali kelas ini"
                          : "Masukkan sandi minimal 6 karakter"
                      }
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                    {editingHomeroomId && (
                      <p className="text-[10px] text-amber-700/85 italic leading-tight font-medium mt-0.5">
                        *Kosongkan saja untuk tetap memakai sandi lama (
                        {editingHomeroomId ? "Sandi Aktif" : ""}). Isi minimal 6
                        karakter jika ingin mereset sandi akun ini.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Link Unduhan SK Penugasan (URL){" "}
                      <span className="text-slate-400 font-normal">
                        (Opsional)
                      </span>
                    </label>
                    <input
                      type="url"
                      placeholder="Contoh: https://drive.google.com/file/... (Link Download)"
                      value={formSkUrl}
                      onChange={(e) => setFormSkUrl(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-800 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  {mgmtError && (
                    <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-lg font-medium">
                      ⚠️ {mgmtError}
                    </div>
                  )}

                  {mgmtSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg font-medium">
                      🎉 {mgmtSuccess}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    {editingHomeroomId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold uppercase rounded-lg cursor-pointer hover:bg-slate-300 transition-colors"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isActionLoading}
                      className="flex-1 py-2 bg-slate-900 border border-slate-950 text-white font-bold uppercase rounded-lg cursor-pointer hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                    >
                      {isActionLoading && (
                        <RefreshCw size={11} className="animate-spin" />
                      )}
                      <span>{editingHomeroomId ? "Simpan" : "Daftarkan"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Table List of Wali Kelas (Right) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Users size={14} className="text-amber-500" />
                  Daftar Akun Wali Kelas Terdaftar
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {homerooms.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2">
                      <GraduationCap size={24} className="text-slate-300" />
                      <span>Belum ada Wali Kelas yang didaftarkan.</span>
                      <p className="font-normal text-slate-400 mt-1 max-w-sm">
                        Gunakan form di sebelah kiri untuk menambahkan wali
                        kelas bimbingan presensi harian.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase tracking-wider select-none">
                            <th className="py-2.5 px-4">Nama Lengkap</th>
                            <th className="py-2.5 px-4 text-center">
                              Kelas Binaan
                            </th>
                            <th className="py-2.5 px-4">Username Akun</th>
                            <th className="py-2.5 px-4 text-center">
                              Aksi Operasional
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {homerooms.map((hr) => (
                            <tr key={hr.id} className="hover:bg-slate-55">
                              <td className="py-3 px-4 text-left">
                                <span className="font-bold text-slate-800 block">
                                  {hr.name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ID: {hr.id}
                                  </span>
                                  {hr.skUrl && (
                                    <>
                                      <span className="text-slate-300">|</span>
                                      <a
                                        href={hr.skUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-emerald-650 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        SK Penugasan
                                      </a>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded font-black text-[10px] uppercase bg-indigo-50 border border-indigo-100 text-indigo-700">
                                  Kelas {hr.className}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-650 text-left">
                                {hr.username}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingHomeroomId(hr.id);
                                      setFormName(hr.name);
                                      setFormClassName(hr.className);
                                      setFormUsername(hr.username);
                                      setFormPassword("");
                                      setFormSkUrl(hr.skUrl || "");
                                    }}
                                    className="p-1 px-2 border border-slate-200 hover:border-slate-800 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-all"
                                  >
                                    <Edit size={10} />
                                    <span>Ubah</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Apakah Anda yakin ingin menghapus akun Wali Kelas ${hr.name}? Tindakan ini permanen.`,
                                        )
                                      ) {
                                        setIsActionLoading(true);
                                        if (onDeleteHomeroom) {
                                          const ok = await onDeleteHomeroom(
                                            hr.id,
                                          );
                                          if (ok) {
                                            setMgmtSuccess(
                                              "Wali kelas berhasil dihapus!",
                                            );
                                            onRefresh();
                                          } else {
                                            setMgmtError(
                                              "Gagal menghapus wali kelas.",
                                            );
                                          }
                                        }
                                        setIsActionLoading(false);
                                      }
                                    }}
                                    className="p-1 px-2 border border-rose-200 hover:border-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold text-rose-600 hover:text-rose-900 cursor-pointer flex items-center gap-1 transition-all"
                                  >
                                    <Trash2 size={10} />
                                    <span>Hapus</span>
                                  </button>
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
          </motion.div>
        )}

        {/* Tab: Subject Teacher/Guru Mapel CRUD Management */}
        {adminTab === "subject_teacher_mgmt" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">
                  Manajemen Akun Guru Mata Pelajaran (KBM & Jurnal)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Daftarkan dan konfigurasikan akun bagi Guru Mata Pelajaran
                  untuk mengisi Jurnal Pembelajaran dan absensi Mapel.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportTeacherType("subject");
                    setTeacherImportError(null);
                    setTeacherImportSuccess(null);
                    setPreviewTeacherData([]);
                    setIsImportTeacherOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-xs font-bold hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud size={13} />
                  <span>Import Guru Mapel (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsActionLoading(true);
                    setMgmtError(null);
                    setMgmtSuccess(null);
                    try {
                      if (onAutoGenerateSubjectTeachers) {
                        const success = await onAutoGenerateSubjectTeachers();
                        if (success) {
                          setMgmtSuccess(
                            "Berhasil men-generate otomatis 8 akun Guru Mapel default!",
                          );
                          onRefresh();
                        } else {
                          setMgmtError(
                            "Gagal melakukan generate otomatis akun Guru Mapel.",
                          );
                        }
                      }
                    } catch (e) {
                      setMgmtError("Kendala sistem saat generate akun.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap size={13} className="animate-bounce" />
                  <span>Generate Otomatis Akun Mapel</span>
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Tambah/Ubah Guru Mapel (Left) */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <PlusCircle size={14} className="text-teal-600" />
                  {editingSubjectTeacherId
                    ? "Ubah Informasi Guru Mapel"
                    : "Daftar Guru Mapel Baru"}
                </h4>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsActionLoading(true);
                    setMgmtError(null);
                    setMgmtSuccess(null);

                    if (
                      !formName.trim() ||
                      !formSubject.trim() ||
                      !formUsername.trim()
                    ) {
                      setMgmtError("Semua kolom wajib diisi lengkap!");
                      setIsActionLoading(false);
                      return;
                    }

                    if (
                      formPassword &&
                      formPassword.trim().length > 0 &&
                      formPassword.trim().length < 6
                    ) {
                      setMgmtError("Kata sandi harus minimal 6 karakter!");
                      setIsActionLoading(false);
                      return;
                    }

                    try {
                      if (editingSubjectTeacherId) {
                        if (onUpdateSubjectTeacher) {
                          const res = await onUpdateSubjectTeacher(
                            editingSubjectTeacherId,
                            {
                              username: formUsername,
                              name: formName,
                              subject: formSubject,
                              password: formPassword || undefined,
                              skUrl: formSkUrl,
                            },
                          );
                          if (res) {
                            setMgmtSuccess(
                              "Berhasil memperbarui data Guru Mapel!",
                            );
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError("Gagal memperbarui data Guru Mapel.");
                          }
                        }
                      } else {
                        if (onCreateSubjectTeacher) {
                          const res = await onCreateSubjectTeacher({
                            username: formUsername,
                            name: formName,
                            subject: formSubject,
                            password: formPassword || "sandi123",
                            skUrl: formSkUrl,
                          });
                          if (res) {
                            setMgmtSuccess(
                              "Berhasil mendaftarkan Guru Mapel baru!",
                            );
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError(
                              "Username sudah terpakai atau data tidak valid.",
                            );
                          }
                        }
                      }
                    } catch (err) {
                      setMgmtError("Terjadi kesalahan sistem.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="flex flex-col gap-4 text-xs"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Nama Lengkap Guru Mapel
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bpk. H. Ahmad Fauzi, M.Pd"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-800 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Kategori Mata Pelajaran (Mapel)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Matematika, IPA, PJOK, dll."
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Username Login
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: ahmadfauzi_mapel"
                      value={formUsername}
                      onChange={(e) =>
                        setFormUsername(
                          e.target.value.toLowerCase().replace(/\s+/g, ""),
                        )
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 bg-teal-50/50 p-3 rounded-lg border border-teal-200/60">
                    <label className="font-bold text-teal-850">
                      Kata Sandi{" "}
                      {editingSubjectTeacherId
                        ? "(Ganti Baru)"
                        : "(Sandi Default) *"}
                    </label>
                    <input
                      type="password"
                      placeholder={
                        editingSubjectTeacherId
                          ? "Isi untuk mereset sandi guru mapel ini"
                          : "Password default jika kosong: sandi123"
                      }
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-teal-700/85 italic leading-tight font-medium mt-0.5">
                      {editingSubjectTeacherId
                        ? "*Kosongkan saja untuk tetap memakai sandi lama."
                        : '*Isi minimal 6 karakter atau kosongkan saja untuk default password "sandi123".'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">
                      Link Unduhan SK Penugasan (URL){" "}
                      <span className="text-slate-400 font-normal">
                        (Opsional)
                      </span>
                    </label>
                    <input
                      type="url"
                      placeholder="Contoh: https://drive.google.com/file/... (Link Download)"
                      value={formSkUrl}
                      onChange={(e) => setFormSkUrl(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-800 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  {mgmtError && (
                    <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-lg font-medium">
                      ⚠️ {mgmtError}
                    </div>
                  )}

                  {mgmtSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg font-medium">
                      🎉 {mgmtSuccess}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    {editingSubjectTeacherId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold uppercase rounded-lg cursor-pointer hover:bg-slate-300 transition-colors"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isActionLoading}
                      className="flex-1 py-2 bg-slate-900 border border-slate-950 text-white font-bold uppercase rounded-lg cursor-pointer hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                    >
                      {isActionLoading && (
                        <RefreshCw size={11} className="animate-spin" />
                      )}
                      <span>
                        {editingSubjectTeacherId ? "Simpan" : "Daftarkan"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Table List of Guru Mapel (Right) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center px-5">
                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                      Daftar Guru Mata Pelajaran Aktif ({subjectTeachers.length}
                      )
                    </span>
                  </div>

                  {subjectTeachers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Users
                        size={32}
                        className="mx-auto text-slate-300 mb-2"
                      />
                      <p className="text-xs font-semibold">
                        Belum ada akun Guru Mata Pelajaran terdaftar.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Daftarkan manual di form sebelah kiri atau gunakan
                        "Generate Otomatis Akun Mapel" di atas.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-5 py-3">Nama Lengkap</th>
                            <th className="px-5 py-3">Mata Pelajaran</th>
                            <th className="px-5 py-3">Username</th>
                            <th className="px-5 py-3 text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 font-sans">
                          {subjectTeachers.map((st) => (
                            <tr
                              key={st.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-5 py-3">
                                <div className="font-extrabold text-slate-900">
                                  {st.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ID: {st.id}
                                  </span>
                                  {st.skUrl && (
                                    <>
                                      <span className="text-slate-300">|</span>
                                      <a
                                        href={st.skUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-emerald-650 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        SK Penugasan
                                      </a>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-850 border border-teal-200">
                                  {st.subject}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">
                                {st.username}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubjectTeacherId(st.id);
                                      setFormName(st.name);
                                      setFormSubject(st.subject);
                                      setFormUsername(st.username);
                                      setFormPassword("");
                                      setFormSkUrl(st.skUrl || "");
                                    }}
                                    className="p-1 px-2 border border-slate-200 hover:border-slate-800 bg-white rounded text-[10px] font-bold text-slate-700 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-all"
                                  >
                                    <Edit size={10} />
                                    <span>Ubah</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Apakah Anda yakin ingin menghapus akun Guru Mapel ${st.name}?`,
                                        )
                                      ) {
                                        setIsActionLoading(true);
                                        if (onDeleteSubjectTeacher) {
                                          const res =
                                            await onDeleteSubjectTeacher(st.id);
                                          if (res) {
                                            setMgmtSuccess(
                                              "Berhasil menghapus akun Guru Mapel!",
                                            );
                                            resetForm();
                                            onRefresh();
                                          } else {
                                            setMgmtError(
                                              "Gagal menghapus akun Guru Mapel.",
                                            );
                                          }
                                        }
                                        setIsActionLoading(false);
                                      }
                                    }}
                                    className="p-1 px-2 border border-rose-200 hover:border-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold text-rose-600 hover:text-rose-900 cursor-pointer flex items-center gap-1 transition-all"
                                  >
                                    <Trash2 size={10} />
                                    <span>Hapus</span>
                                  </button>
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
          </motion.div>
        )}

        {/* Tab: Student QR Payments Cards */}
        {adminTab === "student_qr" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 w-full text-left"
          >
            {/* Header / Info Box */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                    <ImageIcon
                      className="text-indigo-600 animate-pulse"
                      size={18}
                    />
                    Sistem Kartu QR Pembayaran Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Cetak dan download kartu QR siswa secara kolektif maupun
                    individual. Kode QR digunakan saat pembayaran tunai
                    (SPP/Tabungan) di loket sekolah agar teller dapat instan
                    mendeteksi profil siswa melalui scan barcode / kamera.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const listToPrint = students.filter((s) => {
                        const matchSearch =
                          !studentQrSearch.trim() ||
                          s.name
                            .toLowerCase()
                            .includes(studentQrSearch.toLowerCase().trim()) ||
                          s.nis
                            .toLowerCase()
                            .includes(studentQrSearch.toLowerCase().trim());
                        const matchClass =
                          studentQrClassFilter === "all" ||
                          s.class.toLowerCase() ===
                            studentQrClassFilter.toLowerCase();
                        return matchSearch && matchClass;
                      }).sort((a, b) => a.name.localeCompare(b.name));
                      if (listToPrint.length === 0) {
                        alert(
                          "Tidak ada kartu siswa untuk dicetak dalam kriteria filter yang aktif!",
                        );
                        return;
                      }
                      setQrCardsToPrint(listToPrint);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>
                      Cetak Kolektif (
                      {
                        students.filter((s) => {
                          const matchSearch =
                            !studentQrSearch.trim() ||
                            s.name
                              .toLowerCase()
                              .includes(studentQrSearch.toLowerCase().trim()) ||
                            s.nis
                              .toLowerCase()
                              .includes(studentQrSearch.toLowerCase().trim());
                          const matchClass =
                            studentQrClassFilter === "all" ||
                            s.class.toLowerCase() ===
                              studentQrClassFilter.toLowerCase();
                          return matchSearch && matchClass;
                        }).length
                      }{" "}
                      Siswa)
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={downloadingCollectiveQr}
                    onClick={() => {
                      const listToDownload = students.filter((s) => {
                        const matchSearch =
                          !studentQrSearch.trim() ||
                          s.name
                            .toLowerCase()
                            .includes(studentQrSearch.toLowerCase().trim()) ||
                          s.nis
                            .toLowerCase()
                            .includes(studentQrSearch.toLowerCase().trim());
                        const matchClass =
                          studentQrClassFilter === "all" ||
                          s.class.toLowerCase() ===
                            studentQrClassFilter.toLowerCase();
                        return matchSearch && matchClass;
                      }).sort((a, b) => a.name.localeCompare(b.name));
                      if (listToDownload.length === 0) {
                        alert(
                          "Tidak ada QR siswa untuk diunduh dalam kriteria filter yang aktif!",
                        );
                        return;
                      }

                      setDownloadingCollectiveQr(true);
                      setCollectiveQrTotal(listToDownload.length);
                      setCollectiveQrProgress(0);

                      const zip = new JSZip();
                      let currentIndex = 0;

                      const downloadNext = () => {
                        if (currentIndex >= listToDownload.length) {
                          // Generate and download ZIP file
                          zip
                            .generateAsync({ type: "blob" })
                            .then((content) => {
                              const link = document.createElement("a");
                              const timestamp = new Date()
                                .toISOString()
                                .slice(0, 10);
                              const classSuffix =
                                studentQrClassFilter === "all"
                                  ? "Semua_Kelas"
                                  : `Kelas_${studentQrClassFilter}`;
                              link.download = `QR_Siswa_Masal_${classSuffix}_${timestamp}.zip`;
                              link.href = URL.createObjectURL(content);
                              link.click();
                              setDownloadingCollectiveQr(false);
                            })
                            .catch((err) => {
                              console.error("Error creating ZIP:", err);
                              alert("Gagal mengemas program QR Code ke ZIP.");
                              setDownloadingCollectiveQr(false);
                            });
                          return;
                        }

                        const student = listToDownload[currentIndex];
                        const tempCanvas = document.createElement("canvas");
                        QRCode.toCanvas(
                          tempCanvas,
                          student.nis,
                          {
                            width: 400,
                            margin: 4,
                            color: {
                              dark: "#0f172a",
                              light: "#ffffff",
                            },
                          },
                          (error) => {
                            if (error) {
                              console.error(error);
                              currentIndex++;
                              setCollectiveQrProgress(currentIndex);
                              downloadNext();
                              return;
                            }

                            // Convert canvas to base64 and append to JSZip (QR Code only)
                            const dataUrl = tempCanvas.toDataURL("image/png");
                            const base64Data = dataUrl.replace(
                              /^data:image\/png;base64,/,
                              "",
                            );
                            const filename = `Kelas_${student.class}/${student.nis}.png`;
                            zip.file(filename, base64Data, { base64: true });

                            currentIndex++;
                            setCollectiveQrProgress(currentIndex);
                            setTimeout(downloadNext, 15); // Faster execution because browser downloads aren't triggered iteratively
                          },
                        );
                      };

                      downloadNext();
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                      downloadingCollectiveQr
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-150"
                    }`}
                  >
                    <Download size={13} />
                    <span>
                      {downloadingCollectiveQr
                        ? `Memproses ZIP (${collectiveQrProgress}/${collectiveQrTotal})`
                        : `Unduh Masal QR (ZIP) (${
                            students.filter((s) => {
                              const matchSearch =
                                !studentQrSearch.trim() ||
                                s.name
                                  .toLowerCase()
                                  .includes(
                                    studentQrSearch.toLowerCase().trim(),
                                  ) ||
                                s.nis
                                  .toLowerCase()
                                  .includes(
                                    studentQrSearch.toLowerCase().trim(),
                                  );
                              const matchClass =
                                studentQrClassFilter === "all" ||
                                s.class.toLowerCase() ===
                                  studentQrClassFilter.toLowerCase();
                              return matchSearch && matchClass;
                            }).length
                          } Siswa)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari Siswa Berdasarkan Nama atau NIS..."
                    value={studentQrSearch}
                    onChange={(e) => setStudentQrSearch(e.target.value)}
                    className="w-full pl-9.5 pr-8 py-2 border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                  />
                  {studentQrSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentQrSearch("")}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Class filter dropdown */}
                <div>
                  <select
                    value={studentQrClassFilter}
                    onChange={(e) => setStudentQrClassFilter(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 cursor-pointer"
                  >
                    <option value="all">Semua Kelas / Tingkat</option>
                    {uniqueClasses.map((cl) => (
                      <option key={cl} value={cl}>
                        Kelas {cl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center text-[11px] text-slate-400 font-semibold italic justify-end gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Format Kode QR: Nomor Induk Siswa (NIS)
                </div>
              </div>
            </div>

            {/* Design & Template Settings Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-slate-900 font-extrabold text-sm flex items-center gap-1.5 font-sans">
                    🎨 Pengaturan Template Latar Belakang Kartu
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed font-sans font-medium">
                    Unggah gambar template latar belakang jika ingin menggunakan
                    desain kartu kustom milik sekolah Anda sendiri. Latar
                    belakang default akan otomatis digantikan oleh template
                    kustom Anda, dan data teks detail siswa serta QR Code akan
                    otomatis di-overlay di posisi yang sesuai secara presisi.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="file"
                    ref={cardTemplateInputRef}
                    accept="image/*"
                    onChange={handleCardTemplateUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => cardTemplateInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <UploadCloud size={13} />
                    <span>Upload Template Gambar</span>
                  </button>

                  {schoolIdentity?.paymentCardTemplate && (
                    <button
                      type="button"
                      onClick={handleRemoveCardTemplate}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <Trash2 size={13} />
                      <span>Hapus Template</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time Preview Indicator */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4 text-xs font-medium text-slate-600">
                <div className="w-20 h-12 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                  {schoolIdentity?.paymentCardTemplate ? (
                    <img
                      src={schoolIdentity.paymentCardTemplate}
                      className="w-full h-full object-cover"
                      alt="Thumbnail"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">
                      Default
                    </span>
                  )}
                </div>
                <div className="font-sans leading-relaxed">
                  <span className="text-slate-800 font-extrabold block mb-0.5 text-xs">
                    Status Cetakan Template:{" "}
                    {schoolIdentity?.paymentCardTemplate
                      ? "🟢 Template Kustom Aktif"
                      : "🔵 Desain Default Aktif"}
                  </span>
                  <span>
                    Ukuran cetak kartu dikunci pada rasio/dimensi standar ID-1
                    (Kartu Kredit/Smarcard/KTP):{" "}
                    <strong className="text-slate-800 font-bold font-mono">
                      8,56 cm × 5,398 cm
                    </strong>
                    .
                  </span>
                </div>
              </div>
            </div>

            {/* Grid display of cards */}
            {(() => {
              const matched = students.filter((s) => {
                const matchSearch =
                  !studentQrSearch.trim() ||
                  s.name
                    .toLowerCase()
                    .includes(studentQrSearch.toLowerCase().trim()) ||
                  s.nis
                    .toLowerCase()
                    .includes(studentQrSearch.toLowerCase().trim());
                const matchClass =
                  studentQrClassFilter === "all" ||
                  s.class.toLowerCase() === studentQrClassFilter.toLowerCase();
                return matchSearch && matchClass;
              }).sort((a, b) => a.name.localeCompare(b.name));

              if (matched.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
                    <ImageIcon
                      className="mx-auto text-slate-300 stroke-[1.5] mb-2.5"
                      size={40}
                    />
                    <p className="text-xs font-black text-slate-800">
                      Tidak ada kartu siswa ditemukan
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Coba sesuaikan kata kunci pencarian atau filter kelas
                      Anda.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matched.map((student) => {
                    // QR content is the Nis for scanning matching NIS search query
                    const qrText = `${student.nis}`;
                    const handleDownloadSingleQr = () => {
                      const tempCanvas = document.createElement("canvas");
                      QRCode.toCanvas(
                        tempCanvas,
                        qrText,
                        {
                          width: 400,
                          margin: 4,
                          color: {
                            dark: "#0f172a",
                            light: "#ffffff",
                          },
                        },
                        (error) => {
                          if (error) {
                            console.error(error);
                            return;
                          }
                          const link = document.createElement("a");
                          link.download = `${student.nis}.png`;
                          link.href = tempCanvas.toDataURL("image/png");
                          link.click();
                        },
                      );
                    };

                    return (
                      <div
                        key={student.id}
                        className="bg-white border border-slate-205 hover:border-emerald-300 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[270px] relative overflow-hidden"
                      >
                        {/* Card Kop (White background, top) */}
                        {schoolIdentity?.letterhead ? (
                          <div className="-mx-3 -mt-3 h-16 flex items-center justify-center overflow-hidden shrink-0 border-b border-slate-100 mb-2 bg-white">
                            <img
                              src={schoolIdentity.letterhead}
                              alt="Kop Surat"
                              className="w-full h-full object-fill"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 text-left shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              {schoolIdentity?.logo ? (
                                <img
                                  src={schoolIdentity.logo}
                                  alt="Logo Sekolah"
                                  className="w-10 h-10 object-contain shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-black text-[11px] shrink-0 ring-1 ring-emerald-200">
                                  NU
                                </div>
                              )}
                              <div className="min-w-0 leading-none">
                                <h4 className="text-[10.5px] font-black text-slate-900 tracking-tight uppercase leading-tight truncate">
                                  {schoolIdentity?.name ||
                                    "SMP MA'ARIF NU PANDAAN"}
                                </h4>
                                <p className="text-[7px] font-black text-emerald-700 uppercase tracking-wider leading-none mt-0.5 truncate">
                                  {schoolIdentity?.subheading ||
                                    "BERAKHLAK MULIA • BERILMU • BERPRESTASI"}
                                </p>
                              </div>
                            </div>
                            {schoolIdentity?.logo2 ? (
                              <img
                                src={schoolIdentity.logo2}
                                alt="Logo 2"
                                className="w-10 h-10 object-contain shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 font-extrabold text-[11px] shrink-0 ring-1 ring-amber-100">
                                ⭐
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Body - Blue & Green Gradient */}
                        <div className="flex-1 bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-500 rounded-xl p-3 flex items-center justify-between gap-3 relative overflow-hidden text-white mb-2.5">
                          {/* Curved background overlay */}
                          <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-white/[0.04] rounded-l-full blur-xs pointer-events-none" />

                          {/* Left: Avatar frame - vertically aligned and centered with details/QR */}
                          <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 min-w-[70px]">
                            <div className="w-14 h-14 rounded-full border border-white bg-white/20 flex items-center justify-center overflow-hidden shadow-inner relative shrink-0">
                              <svg
                                viewBox="0 0 24 24"
                                className="w-[42px] h-[42px] text-white/90"
                                fill="currentColor"
                              >
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            </div>

                            <div className="bg-emerald-950/70 border border-emerald-450/40 px-1.5 py-0.5 rounded-full text-[6px] font-extrabold uppercase tracking-wide leading-none text-emerald-200 shrink-0 text-center scale-[0.9] whitespace-nowrap">
                              SPP & TABUNGAN TUNAI
                            </div>
                          </div>

                          {/* Center: Details */}
                          <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 text-left z-10 leading-none">
                            <div className="min-w-0">
                              <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">
                                NAMA
                              </span>
                              <span
                                className="text-[12.5px] font-black tracking-wide text-white block uppercase truncate leading-tight mt-0.5"
                                title={student.name}
                              >
                                {student.name}
                              </span>
                            </div>

                            <div>
                              <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">
                                NIS
                              </span>
                              <span className="font-mono text-[11.5px] font-black text-white tracking-wider block leading-none mt-0.5">
                                {student.nis}
                              </span>
                            </div>

                            <div>
                              <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">
                                KELAS
                              </span>
                              <span className="text-[11px] font-black text-white block leading-none uppercase mt-0.5">
                                {student.class}
                              </span>
                            </div>
                          </div>

                          {/* Right: White box for QR */}
                          <div className="bg-white rounded-lg p-2 flex flex-col items-center justify-center w-[102px] h-full shrink-0 shadow-sm z-10 text-slate-900 gap-1 select-none">
                            <span className="text-[7.5px] font-black text-indigo-900 uppercase tracking-tight leading-none text-center">
                              SCAN NIS
                            </span>
                            <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">
                              UNTUK BAYAR
                            </span>

                            <div className="p-0.5 bg-white border border-slate-100 rounded-md flex items-center justify-center shrink-0">
                              <StudentQrCode text={student.nis} size={64} />
                            </div>

                            <span className="font-mono text-[8.5px] font-black tracking-widest text-slate-800 leading-none">
                              {student.nis}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Action buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-auto pt-1.5 border-t border-slate-100 font-sans shrink-0">
                          <button
                            type="button"
                            onClick={handleDownloadSingleQr}
                            className="py-1 border border-slate-200 bg-white hover:bg-indigo-50/20 hover:border-indigo-400 text-slate-600 hover:text-indigo-700 font-extrabold rounded-lg text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1 transition-all"
                          >
                            Download QR ⬇️
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrCardsToPrint([student])}
                            className="py-1 bg-slate-900 border border-slate-950 text-white font-extrabold rounded-lg text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1 transition-all"
                          >
                            <Printer size={9} />
                            <span>Cetak Kartu</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Tab 5: Laporan & Rekapitulasi */}
        {adminTab === "laporan" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 w-full"
          >
            {/* Laporan Sub Tabs Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-xs">
              <div className="flex gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-lg w-full lg:w-auto overflow-x-auto whitespace-nowrap scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab("harian")}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === "harian"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center">
                    <Calendar size={12} /> Laporan Harian
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab("rekap-spp")}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === "rekap-spp"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center">
                    <FileCheck size={12} /> Rekap SPP
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab("rekap-tabungan")}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === "rekap-tabungan"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center">
                    <BarChart3 size={12} /> Rekap Tabungan
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab("rekap-absen")}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === "rekap-absen"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center">
                    <ClipboardCheck size={12} /> Rekap Absensi 📊
                  </span>
                </button>
              </div>

              {activeReportSubTab === "harian" && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="font-bold text-slate-500 whitespace-nowrap">
                      Filter Tanggal:
                    </span>
                    <input
                      type="date"
                      value={currentDateFilter}
                      onChange={(e) => setCurrentDateFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-indigo-600 cursor-pointer w-full sm:w-auto"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReportToPrint("harian");
                      setPrintId("print-report-section");
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all w-full sm:w-auto justify-center shadow-xs uppercase tracking-wider font-sans"
                  >
                    <Printer size={12} /> Cetak Laporan 🖨️
                  </button>
                </div>
              )}
            </div>

            {/* ======================= REPORT SUBTAB 1: DAILY HARIAN ======================= */}
            {activeReportSubTab === "harian" &&
              (() => {
                // Filters
                const sppPaidToday = bills.filter(
                  (b) =>
                    b.status === "paid" &&
                    b.paidAt &&
                    b.paidAt.split("T")[0] === currentDateFilter,
                );
                const savingsToday = transactions.filter(
                  (t) =>
                    t.status === "success" &&
                    t.createdAt &&
                    t.createdAt.split("T")[0] === currentDateFilter,
                );

                const totalSppTunai = sppPaidToday
                  .filter(
                    (b) =>
                      b.paymentMethod === "cash" ||
                      !b.paymentMethod ||
                      b.paymentMethod.toLowerCase().includes("tunai") ||
                      b.paymentMethod.toLowerCase().includes("manual"),
                  )
                  .reduce((acc, c) => acc + c.amount, 0);

                const totalSppOnline = sppPaidToday
                  .filter(
                    (b) =>
                      b.paymentMethod &&
                      !b.paymentMethod.toLowerCase().includes("tunai") &&
                      !b.paymentMethod.toLowerCase().includes("cash") &&
                      !b.paymentMethod.toLowerCase().includes("manual"),
                  )
                  .reduce((acc, c) => acc + c.amount, 0);

                const totalTabunganMasuk = savingsToday
                  .filter((t) => t.type === "deposit")
                  .reduce((acc, c) => acc + c.amount, 0);

                const totalTabunganKeluar = savingsToday
                  .filter((t) => t.type === "withdrawal")
                  .reduce((acc, c) => acc + c.amount, 0);

                const totalKasMasukLokal = totalSppTunai + totalTabunganMasuk;
                const netKasLokal = totalKasMasukLokal - totalTabunganKeluar;

                return (
                  <div className="flex flex-col gap-6">
                    {/* Daily Report Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          SPP PAID (CASH/MANUAL)
                        </span>
                        <span className="text-sm font-bold text-emerald-800 font-mono">
                          Rp {totalSppTunai.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {
                            sppPaidToday.filter(
                              (b) =>
                                b.paymentMethod === "cash" ||
                                !b.paymentMethod ||
                                b.paymentMethod
                                  .toLowerCase()
                                  .includes("manual"),
                            ).length
                          }{" "}
                          Transaksi Hari Ini
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          SPP PAID (ONLINE SNAP)
                        </span>
                        <span className="text-sm font-bold text-indigo-900 font-mono">
                          Rp {totalSppOnline.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {
                            sppPaidToday.filter(
                              (b) =>
                                b.paymentMethod &&
                                !b.paymentMethod
                                  .toLowerCase()
                                  .includes("cash") &&
                                !b.paymentMethod
                                  .toLowerCase()
                                  .includes("manual"),
                            ).length
                          }{" "}
                          Transaksi Online
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold animate-fade-in">
                          TABUNGAN (SETOR / CASH IN)
                        </span>
                        <span className="text-sm font-bold text-emerald-700 font-mono">
                          Rp {totalTabunganMasuk.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {
                            savingsToday.filter((t) => t.type === "deposit")
                              .length
                          }{" "}
                          Setoran Tunai
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          TABUNGAN (PENARIKAN CASH OUT)
                        </span>
                        <span className="text-sm font-bold text-rose-700 font-mono">
                          Rp {totalTabunganKeluar.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {
                            savingsToday.filter((t) => t.type === "withdrawal")
                              .length
                          }{" "}
                          Tarikan Tunai
                        </span>
                      </div>
                    </div>

                    {/* Summary Vault Header */}
                    <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Rekonsiliasi Kas Teller Hari Ini (Tanggal{" "}
                          {new Date(currentDateFilter).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "long", year: "numeric" },
                          )}
                          )
                        </span>
                        <p className="text-[11px] text-slate-350 mt-1 max-w-xl">
                          Merekapitulasi semua iuran tunai di tempat ditambah
                          setoran tabungan siswa dikurangi penarikan cash. Dana
                          Online Midtrans tidak dihitung di brankas fisik
                          teller.
                        </p>
                      </div>
                      <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 flex flex-col gap-1 w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          NET ALIRAN DANA FISIK BRANKAS
                        </span>
                        <span
                          className={`text-base md:text-lg font-bold font-mono ${netKasLokal >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          Rp {netKasLokal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* Dual Grid lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* List 1: SPP Today */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Buku Jurnal SPP Hari Ini ({sppPaidToday.length})
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Draf siswa pembayar SPP wajib
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-sans text-[11px] divide-y divide-slate-100">
                            <thead>
                              <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider pb-2">
                                <th className="pb-2">Waktu/Ref</th>
                                <th className="pb-2">Siswa / Kelas</th>
                                <th className="pb-2">Bulan Tagihan</th>
                                <th className="pb-2">Metode</th>
                                <th className="pb-2 text-right">Nominal</th>
                                <th className="pb-2 text-right">Kuitansi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-105">
                              {sppPaidToday.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="text-center py-8 text-slate-400 text-[11px] italic"
                                  >
                                    Tidak ada transaksi SPP hari ini.
                                  </td>
                                </tr>
                              ) : (
                                sppPaidToday.map((b) => {
                                  const s = students.find(
                                    (student) => student.id === b.studentId,
                                  );
                                  return (
                                    <tr
                                      key={b.id}
                                      className="hover:bg-slate-50/50"
                                    >
                                      <td className="py-2.5 text-slate-500 font-mono text-[10px]">
                                        {b.paidAt
                                          ? new Date(
                                              b.paidAt,
                                            ).toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : "-"}
                                      </td>
                                      <td className="py-2.5 font-bold text-slate-700">
                                        <div>{s?.name || "Siswa dihapus"}</div>
                                        <div className="text-[9px] text-slate-400 font-semibold font-mono">
                                          NIS: {s?.nis || "-"}
                                        </div>
                                      </td>
                                      <td className="py-2.5 text-slate-600 font-medium">
                                        {b.month} {b.year}
                                      </td>
                                      <td className="py-2.5">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700 font-mono">
                                          {b.paymentMethod || "cash"}
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                                        Rp {b.amount.toLocaleString("id-ID")}
                                      </td>
                                      <td className="py-2.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReceiptToPrint({
                                              type: "spp",
                                              detail: b,
                                              student: s || {
                                                id: b.studentId,
                                                nis: "-",
                                                name: "Siswa",
                                                class: "-",
                                                email: "",
                                                phone: "",
                                                savingsBalance: 0,
                                              },
                                            });
                                            setPrintId("print-receipt-section");
                                          }}
                                          className="p-1 text-indigo-600 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 rounded hover:bg-slate-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                                          title="Cetak Kuitansi Resmi"
                                        >
                                          <Printer size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* List 2: Tabungan Today */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Arus Mutasi Rekening Tabungan Hari Ini (
                            {savingsToday.length})
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Total simpanan & tarikan tunai yang divalidasi
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-sans text-[11px] divide-y divide-slate-100">
                            <thead>
                              <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider pb-2">
                                <th className="pb-2">Waktu</th>
                                <th className="pb-2">Siswa / Kelas</th>
                                <th className="pb-2">Jenis</th>
                                <th className="pb-2 text-center">Memo</th>
                                <th className="pb-2 text-right">Nominal</th>
                                <th className="pb-2 text-right">Kuitansi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-105">
                              {savingsToday.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="text-center py-8 text-slate-400 text-[11px] italic"
                                  >
                                    Tidak ada mutasi tabungan hari ini.
                                  </td>
                                </tr>
                              ) : (
                                savingsToday.map((t) => {
                                  const s = students.find(
                                    (student) => student.id === t.studentId,
                                  );
                                  return (
                                    <tr
                                      key={t.id}
                                      className="hover:bg-slate-50/50"
                                    >
                                      <td className="py-2.5 text-slate-500 font-mono text-[10px]">
                                        {new Date(
                                          t.createdAt,
                                        ).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </td>
                                      <td className="py-2.5 font-bold text-slate-700">
                                        <div>{s?.name || "Siswa dihapus"}</div>
                                        <div className="text-[9px] text-slate-400">
                                          Kelas {s?.class || "-"}
                                        </div>
                                      </td>
                                      <td className="py-2.5">
                                        {t.type === "deposit" ? (
                                          <span className="text-emerald-750 font-bold text-emerald-600 block">
                                            <ArrowDownLeft
                                              size={10}
                                              className="inline mr-0.5"
                                            />
                                            SETOR
                                          </span>
                                        ) : (
                                          <span className="text-rose-700 font-bold block">
                                            <ArrowUpRight
                                              size={10}
                                              className="inline mr-0.5"
                                            />
                                            TARIK
                                          </span>
                                        )}
                                      </td>
                                      <td
                                        className="py-2.5 text-slate-500 italic max-w-[120px] truncate"
                                        title={t.notes}
                                      >
                                        {t.notes || "-"}
                                      </td>
                                      <td
                                        className={`py-2.5 text-right font-mono font-bold ${t.type === "deposit" ? "text-emerald-700" : "text-rose-700"}`}
                                      >
                                        Rp {t.amount.toLocaleString("id-ID")}
                                      </td>
                                      <td className="py-2.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReceiptToPrint({
                                              type: "savings",
                                              detail: t,
                                              student: s || {
                                                id: t.studentId,
                                                nis: "-",
                                                name: "Siswa",
                                                class: "-",
                                                email: "",
                                                phone: "",
                                                savingsBalance: 0,
                                              },
                                            });
                                            setPrintId("print-receipt-section");
                                          }}
                                          className="p-1 text-indigo-600 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 rounded hover:bg-slate-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                                          title="Cetak Kuitansi Resmi"
                                        >
                                          <Printer size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* ======================= REPORT SUBTAB 2: REKAP SPP ======================= */}
            {activeReportSubTab === "rekap-spp" &&
              (() => {
                // Filters & Computations
                const activeStudents = [
                  ...(rekapSppGradeFilter === "all"
                    ? students
                    : students.filter((s) =>
                        s.class.startsWith(rekapSppGradeFilter),
                      ))
                ].sort((a, b) => a.name.localeCompare(b.name));

                // Compute SPP matrix for activeStudents
                const summaryMatrix = activeStudents.map((student) => {
                  const sBills = bills.filter(
                    (b) =>
                      b.studentId === student.id &&
                      (rekapSppYearFilter === "all" ||
                        getAcademicYearOfBill(b) === rekapSppYearFilter),
                  );
                  const paid = sBills.filter((b) => b.status === "paid");
                  const unpaid = sBills.filter((b) => b.status === "unpaid");
                  const totalPaidNominal = paid.reduce(
                    (sum, b) => sum + b.amount,
                    0,
                  );
                  const totalUnpaidNominal = unpaid.reduce(
                    (sum, b) => sum + b.amount,
                    0,
                  );
                  const pct =
                    sBills.length > 0
                      ? Math.round((paid.length / sBills.length) * 100)
                      : 0;
                  return {
                    student,
                    totalBillsCount: sBills.length,
                    paidCount: paid.length,
                    unpaidCount: unpaid.length,
                    totalPaidNominal,
                    totalUnpaidNominal,
                    pct,
                  };
                });

                const globalTotalPaid = summaryMatrix.reduce(
                  (acc, current) => acc + current.totalPaidNominal,
                  0,
                );
                const globalTotalUnpaid = summaryMatrix.reduce(
                  (acc, current) => acc + current.totalUnpaidNominal,
                  0,
                );

                return (
                  <div className="flex flex-col gap-6">
                    {/* Category level selectors and widgets */}
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600 uppercase tracking-wide">
                            Pilih Jenjang:
                          </span>
                          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                            {["all", "7", "8", "9"].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setRekapSppGradeFilter(lvl)}
                                className={`px-3 py-1 rounded font-bold text-[10px] tracking-wide cursor-pointer transition-all ${
                                  rekapSppGradeFilter === lvl
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {lvl === "all"
                                  ? "SEMUA TINGKAT"
                                  : `KELAS ${lvl}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600 uppercase tracking-wide">
                            Tahun Ajaran:
                          </span>
                          <select
                            value={rekapSppYearFilter}
                            onChange={(e) =>
                              setRekapSppYearFilter(e.target.value)
                            }
                            className="px-3 py-1.5 bg-white border border-slate-205 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-800 transition-all cursor-pointer shadow-xs"
                          >
                            <option value="all">SEMUA TAHUN AJARAN</option>
                            {academicYears.map((year) => (
                              <option key={year} value={year}>
                                TA {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto">
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">
                              Total Dana Masuk SPP
                            </span>
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                              Rp {globalTotalPaid.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 border-l border-slate-200 pl-6">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">
                              Total Piutang Tertunggak SPP
                            </span>
                            <span className="font-mono font-bold text-rose-700 text-sm">
                              Rp {globalTotalUnpaid.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setReportToPrint("rekap-spp");
                            setPrintId("print-report-section");
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all w-full sm:w-auto justify-center shadow-xs uppercase tracking-wider font-sans ml-0 md:ml-3"
                        >
                          <Printer size={12} /> Cetak Rekap 🖨️
                        </button>
                      </div>
                    </div>

                    {/* Main Table */}
                    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          Rekapitulasi Tagihan SPP Bulanan (
                          {summaryMatrix.length} Siswa)
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Pantau prosentase kelunasan serta total tunggakan per
                          masing-masing wali murid secara real-time
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-[11px] divide-y divide-slate-100">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider pb-2">
                              <th className="pb-2">Ref/NIS</th>
                              <th className="pb-2">Nama Siswa</th>
                              <th className="pb-2">Kelas</th>
                              <th className="pb-2">Progres / Status Lunas</th>
                              <th className="pb-2 text-right">
                                Lunas (Nominal)
                              </th>
                              <th className="pb-2 text-right">
                                Tertunggak (Nominal)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-105">
                            {summaryMatrix.map(
                              ({
                                student,
                                totalBillsCount,
                                paidCount,
                                unpaidCount,
                                totalPaidNominal,
                                totalUnpaidNominal,
                                pct,
                              }) => (
                                <tr
                                  key={student.id}
                                  className="hover:bg-slate-50/50"
                                >
                                  <td className="py-2.5 font-mono text-slate-500 font-medium">
                                    {student.nis}
                                  </td>
                                  <td className="py-2.5 font-bold text-slate-800">
                                    {student.name}
                                  </td>
                                  <td className="py-2.5 text-slate-650 font-bold">
                                    Kelas {student.class}
                                  </td>
                                  <td className="py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className="bg-indigo-600 h-1.5 rounded-full"
                                          style={{ width: `${pct}%` }}
                                        ></div>
                                      </div>
                                      <span className="font-bold font-mono text-[10px]">
                                        {pct}%
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        ({paidCount}/{totalBillsCount} Bulan)
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                                    Rp{" "}
                                    {totalPaidNominal.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-bold text-rose-600">
                                    Rp{" "}
                                    {totalUnpaidNominal.toLocaleString("id-ID")}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* ======================= REPORT SUBTAB 3: REKAP TABUNGAN ======================= */}
            {activeReportSubTab === "rekap-tabungan" &&
              (() => {
                const orderedStudentsBySavings = [...students].sort(
                  (a, b) => b.savingsBalance - a.savingsBalance,
                );
                const totalGlobalSavings = students.reduce(
                  (acc, s) => acc + s.savingsBalance,
                  0,
                );
                const countActiveAccounts = students.filter(
                  (s) => s.savingsBalance > 0,
                ).length;

                return (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          TOTAL TABUNGAN GLOBAL SMP
                        </span>
                        <span className="text-lg font-bold font-mono text-indigo-900">
                          Rp {totalGlobalSavings.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[9px] text-slate-500 block leading-tight">
                          Seluruh simpanan aktif siswa yang dititipkan saat ini
                        </span>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          REKENING TERISI (AKTIF SETOR)
                        </span>
                        <span className="text-lg font-bold font-mono text-emerald-700">
                          {countActiveAccounts} Siswa
                        </span>
                        <span className="text-[9px] text-slate-500 block leading-tight">
                          {Math.round(
                            (countActiveAccounts / students.length) * 100,
                          )}
                          % Dari total siswa sekolah
                        </span>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          RATA-RATA SALDO TABUNGAN
                        </span>
                        <span className="text-lg font-bold font-mono text-slate-800">
                          Rp{" "}
                          {students.length > 0
                            ? Math.round(
                                totalGlobalSavings / students.length,
                              ).toLocaleString("id-ID")
                            : 0}
                        </span>
                        <span className="text-[9px] text-slate-500 block leading-tight">
                          Pembagian rata saldo simpanan per siswa
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Peringkat & Buku Ledger Tabungan Siswa
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Disusun berdasarkan kepemilikan saldo tabungan
                            tertinggi di SMP Maarif NU Pandaan
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReportToPrint("rekap-tabungan");
                            setPrintId("print-report-section");
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all uppercase tracking-wider font-sans shadow-xs whitespace-nowrap"
                        >
                          <Printer size={12} /> Cetak Rekap 🖨️
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-[11px] divide-y divide-slate-100">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider pb-2">
                              <th className="pb-2">No</th>
                              <th className="pb-2">NIS</th>
                              <th className="pb-2">Nama Siswa</th>
                              <th className="pb-2">Kelas</th>
                              <th className="pb-2 text-right">
                                Saldo Tabungan Saat Ini
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-105">
                            {orderedStudentsBySavings.map((student, idx) => (
                              <tr
                                key={student.id}
                                className="hover:bg-slate-50/50"
                              >
                                <td className="py-2.5 font-bold text-slate-405">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 font-mono text-slate-500">
                                  {student.nis}
                                </td>
                                <td className="py-2.5 font-bold text-slate-800">
                                  {student.name}
                                </td>
                                <td className="py-2.5 text-slate-600 font-bold">
                                  Kelas {student.class}
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                                  Rp{" "}
                                  {student.savingsBalance.toLocaleString(
                                    "id-ID",
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {activeReportSubTab === "rekap-absen" &&
              (() => {
                const formatIndonesianDateLocal = (dateStr: string) => {
                  if (!dateStr) return "";
                  try {
                    const parts = dateStr.split("-");
                    if (parts.length !== 3) return dateStr;
                    const months = [
                      "Januari",
                      "Februari",
                      "Maret",
                      "April",
                      "Mei",
                      "Juni",
                      "Juli",
                      "Agustus",
                      "September",
                      "Oktober",
                      "November",
                      "Desember",
                    ];
                    const day = parseInt(parts[2], 10);
                    const month = months[parseInt(parts[1], 10) - 1];
                    const year = parts[0];
                    return `${day} ${month} ${year}`;
                  } catch (err) {
                    return dateStr;
                  }
                };

                // Map & Filter function
                const getFilteredAttendanceLogsLocal = () => {
                  let logsInPeriod = attendanceLogs.filter((log) => {
                    return (
                      log.date >= absenStartDate && log.date <= absenEndDate
                    );
                  });

                  const mapped = logsInPeriod
                    .map((log) => {
                      const student = students.find(
                        (s) => s.id === log.studentId,
                      );
                      if (!student) return null;

                      const homeroom = homerooms.find(
                        (h) => h.className === student.class,
                      );
                      const homeroomName = homeroom
                        ? homeroom.name
                        : "Belum Ditentukan";

                      return {
                        ...log,
                        studentName: student.name,
                        studentNis: student.nis,
                        studentClass: student.class,
                        homeroomName: homeroomName,
                      };
                    })
                    .filter((item) => item !== null) as Array<any>;

                  const filtered = mapped.filter((log) => {
                    if (absenClassFilter === "all") return true;
                    return log.studentClass === absenClassFilter;
                  });

                  return filtered;
                };

                const filteredLogs = getFilteredAttendanceLogsLocal();
                const totalLogs = filteredLogs.length;

                const matchHadir = filteredLogs.filter(
                  (l) => l.status === "Hadir",
                ).length;
                const matchSakit = filteredLogs.filter(
                  (l) => l.status === "Sakit",
                ).length;
                const matchIzin = filteredLogs.filter(
                  (l) => l.status === "Izin",
                ).length;
                const matchAlpa = filteredLogs.filter(
                  (l) => l.status === "Alpa",
                ).length;
                const matchTerlambat = filteredLogs.filter(
                  (l) => l.status === "Terlambat",
                ).length;

                const pctHadir =
                  totalLogs > 0
                    ? Math.round((matchHadir / totalLogs) * 100)
                    : 0;
                const pctSakit =
                  totalLogs > 0
                    ? Math.round((matchSakit / totalLogs) * 100)
                    : 0;
                const pctIzin =
                  totalLogs > 0 ? Math.round((matchIzin / totalLogs) * 100) : 0;
                const pctAlpa =
                  totalLogs > 0 ? Math.round((matchAlpa / totalLogs) * 100) : 0;
                const pctTerlambat =
                  totalLogs > 0
                    ? Math.round((matchTerlambat / totalLogs) * 100)
                    : 0;

                // Generate the recap list of total counts for each student in the specified class filter & date range
                const getStudentRecapList = () => {
                  const filteredStudents = students
                    .filter((student) => {
                      if (absenClassFilter === "all") return true;
                      return student.class === absenClassFilter;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name));

                  const list = filteredStudents.map((student) => {
                    const studentLogs = attendanceLogs.filter((log) => {
                      return (
                        log.studentId === student.id &&
                        log.date >= absenStartDate &&
                        log.date <= absenEndDate
                      );
                    });

                    const counts = {
                      H: studentLogs.filter((l) => l.status === "Hadir").length,
                      S: studentLogs.filter((l) => l.status === "Sakit").length,
                      I: studentLogs.filter((l) => l.status === "Izin").length,
                      A: studentLogs.filter((l) => l.status === "Alpa").length,
                      T: studentLogs.filter((l) => l.status === "Terlambat")
                        .length,
                      total: studentLogs.length,
                    };

                    const studentInfractions = infractionList.filter(
                      (l) => l.studentId === student.id,
                    );
                    const periodInfractions = studentInfractions.filter(
                      (l) => l.date >= absenStartDate && l.date <= absenEndDate,
                    );
                    const infractionPointsPeriod = periodInfractions.reduce(
                      (sum, item) => sum + (item.points || 0),
                      0,
                    );
                    const infractionPointsTotal = studentInfractions.reduce(
                      (sum, item) => sum + (item.points || 0),
                      0,
                    );

                    const homeroom = homerooms.find(
                      (h) => h.className === student.class,
                    );
                    const homeroomName = homeroom
                      ? homeroom.name
                      : "Belum Ditentukan";

                    return {
                      id: student.id,
                      nis: student.nis,
                      name: student.name,
                      class: student.class,
                      homeroomName,
                      ...counts,
                      infractionPointsPeriod,
                      infractionPointsTotal,
                    };
                  });

                  // Sort by class first, then student name
                  return list.sort((a, b) => {
                    const classCompare = a.class.localeCompare(b.class);
                    if (classCompare !== 0) return classCompare;
                    return a.name.localeCompare(b.name);
                  });
                };

                const recapList = getStudentRecapList();

                const handleDownloadXLS = () => {
                  if (recapList.length === 0) {
                    alert("Tidak ada data siswa untuk filter kelas terpilih.");
                    return;
                  }

                  let html = `
                  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                  <head>
                    <!--[if gte mso 9]>
                    <xml>
                      <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                          <x:ExcelWorksheet>
                            <x:Name>Rekap Presensi Siswa</x:Name>
                            <x:WorksheetOptions>
                              <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                          </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                      </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <style>
                      table { border-collapse: collapse; font-family: Arial, sans-serif; }
                      th { background-color: #3b82f6; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
                      td { border: 1px solid #cbd5e1; padding: 6px; }
                      .title { font-size: 14pt; font-weight: bold; text-align: center; color: #1e3a8a; }
                      .meta { font-size: 10pt; text-align: center; color: #475569; }
                      .center { text-align: center; }
                      .hadir { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
                      .sakit { background-color: #dbeafe; color: #1e40af; font-weight: bold; text-align: center; }
                      .izin { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
                      .alpa { background-color: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
                      .terlambat { background-color: #f3e8ff; color: #6b21a8; font-weight: bold; text-align: center; }
                    </style>
                  </head>
                  <body>
                    <table>
                      <tr><td colspan="13" class="title">LAPORAN REKAPITULASI PRESENSI SISWA (REKAP JUMLAH)</td></tr>
                      <tr><td colspan="13" class="meta">SMP MA'ARIF NU PANDAAN</td></tr>
                      <tr><td colspan="13" class="meta">Periode Tanggal: ${formatIndonesianDateLocal(absenStartDate)} s.d ${formatIndonesianDateLocal(absenEndDate)}</td></tr>
                      <tr><td colspan="13" class="meta">Wali Kelas / Kelas Filter: ${absenClassFilter === "all" ? "Semua Wali Kelas" : `Kelas ${absenClassFilter}`}</td></tr>
                      <tr><td colspan="13"></td></tr>
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>NIS</th>
                          <th>Nama Siswa</th>
                          <th>Kelas</th>
                          <th>Wali Kelas</th>
                          <th style="background-color: #10b981; color: white;">Hadir (H)</th>
                          <th style="background-color: #3b82f6; color: white;">Sakit (S)</th>
                          <th style="background-color: #f59e0b; color: white;">Izin (I)</th>
                          <th style="background-color: #ef4444; color: white;">Alpa (A)</th>
                          <th style="background-color: #8b5cf6; color: white;">Terlambat (T)</th>
                          <th>Total Presensi</th>
                          <th style="background-color: #e11d48; color: white;">Poin Pelanggaran (Periode)</th>
                          <th style="background-color: #be123c; color: white;">Poin Pelanggaran (Total)</th>
                        </tr>
                      </thead>
                      <tbody>
                `;

                  recapList.forEach((row, idx) => {
                    html += `
                    <tr>
                      <td class="center">${idx + 1}</td>
                      <td style="mso-number-format:'\\@';" class="center">${row.nis}</td>
                      <td>${row.name}</td>
                      <td class="center">${row.class}</td>
                      <td>${row.homeroomName}</td>
                      <td class="hadir center">${row.H}</td>
                      <td class="sakit center">${row.S}</td>
                      <td class="izin center">${row.I}</td>
                      <td class="alpa center">${row.A}</td>
                      <td class="terlambat center">${row.T}</td>
                      <td class="center" style="font-weight: bold;">${row.total}</td>
                      <td class="center" style="color: #e11d48; font-weight: bold;">${row.infractionPointsPeriod}</td>
                      <td class="center" style="color: #be123c; font-weight: bold;">${row.infractionPointsTotal}</td>
                    </tr>
                  `;
                  });

                  html += `
                      </tbody>
                    </table>
                  </body>
                  </html>
                `;

                  const blob = new Blob([html], {
                    type: "application/vnd.ms-excel;charset=utf-8",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `Rekap_Presensi_H_S_I_A_T_${absenClassFilter === "all" ? "Semua_Wali" : `Kelas_${absenClassFilter}`}_${absenStartDate}_s.d_${absenEndDate}.xls`;
                  link.click();
                  URL.revokeObjectURL(url);
                };

                const handleDownloadCSV = () => {
                  if (recapList.length === 0) {
                    alert("Tidak ada data siswa untuk filter kelas terpilih.");
                    return;
                  }

                  const csvRows = [
                    "sep=;",
                    "LAPORAN REKAPITULASI PRESENSI SISWA (REKAP JUMLAH)",
                    "SMP MA'ARIF NU PANDAAN",
                    `Periode: ${absenStartDate} s.d ${absenEndDate}`,
                    `Wali Kelas Filter: ${absenClassFilter === "all" ? "Semua Kelas" : `Kelas ${absenClassFilter}`}`,
                    "",
                    "No;NIS;Nama Siswa;Kelas;Wali Kelas;Hadir (H);Sakit (S);Izin (I);Alpa (A);Terlambat (T);Total Presensi;Poin Pelanggaran (Periode);Poin Pelanggaran (Total)",
                  ];

                  recapList.forEach((row, index) => {
                    const csvLine = [
                      index + 1,
                      `"=""${row.nis}"""`,
                      `"${row.name.replace(/"/g, '""')}"`,
                      `"${row.class}"`,
                      `"${row.homeroomName.replace(/"/g, '""')}"`,
                      row.H,
                      row.S,
                      row.I,
                      row.A,
                      row.T,
                      row.total,
                      row.infractionPointsPeriod,
                      row.infractionPointsTotal,
                    ];
                    csvRows.push(csvLine.join(";"));
                  });

                  const BOM = "\uFEFF";
                  const blob = new Blob([BOM + csvRows.join("\n")], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `Rekap_Presensi_H_S_I_A_T_${absenClassFilter === "all" ? "Semua_Kelas" : `Kelas_${absenClassFilter}`}_${absenStartDate}_s.d_${absenEndDate}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                };

                return (
                  <div className="flex flex-col gap-6">
                    {/* Rentang Filter Form block */}
                    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                            Unduh Rekap Absensi Siswa (H, S, I, A, T)
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Filter data rekapitulasi status absensi harian per
                            siswa yang dikelola oleh wali kelas berdasarkan
                            rentang tanggal tertentu.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                          <button
                            type="button"
                            onClick={handleDownloadXLS}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] sm:text-xs cursor-pointer transition-all uppercase tracking-wider"
                          >
                            <Download size={13} /> Ekspor Excel Rapi (.xls)
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[10px] sm:text-xs cursor-pointer transition-all uppercase tracking-wider"
                          >
                            <FileText size={13} /> Ekspor CSV (.csv)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Start Date */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                            Tanggal Mulai
                          </label>
                          <input
                            type="date"
                            value={absenStartDate}
                            onChange={(e) => setAbsenStartDate(e.target.value)}
                            className="px-3.5 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full"
                          />
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                            Tanggal Selesai
                          </label>
                          <input
                            type="date"
                            value={absenEndDate}
                            onChange={(e) => setAbsenEndDate(e.target.value)}
                            className="px-3.5 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full"
                          />
                        </div>

                        {/* Select Homeroom Class */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                            Wali Kelas / Kelas
                          </label>
                          <select
                            value={absenClassFilter}
                            onChange={(e) =>
                              setAbsenClassFilter(e.target.value)
                            }
                            className="px-3.5 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full"
                          >
                            <option value="all">
                              Semua Wali Kelas & Kelas
                            </option>
                            {homerooms.map((h) => (
                              <option key={h.id} value={h.className}>
                                Kelas {h.className} - {h.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Summary Stats Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
                      <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col gap-1 shadow-xs justify-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Presensi
                        </span>
                        <span className="text-base font-black font-mono text-slate-800 leading-none mt-1">
                          {totalLogs} Data
                        </span>
                      </div>

                      <div className="bg-emerald-50/45 p-4 border border-emerald-150 rounded-xl flex flex-col gap-1 shadow-xs justify-center">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                          Hadir (H)
                        </span>
                        <span className="text-base font-black font-mono text-emerald-700 leading-none mt-1">
                          {matchHadir} ({pctHadir}%)
                        </span>
                      </div>

                      <div className="bg-purple-50/45 p-4 border border-purple-150 rounded-xl flex flex-col gap-1 shadow-xs justify-center">
                        <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider">
                          Terlambat (T)
                        </span>
                        <span className="text-base font-black font-mono text-purple-700 leading-none mt-1">
                          {matchTerlambat} ({pctTerlambat}%)
                        </span>
                      </div>

                      <div className="bg-blue-50/45 p-4 border border-blue-150 rounded-xl flex flex-col gap-1 shadow-xs justify-center">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                          Sakit (S)
                        </span>
                        <span className="text-base font-black font-mono text-blue-700 leading-none mt-1">
                          {matchSakit} ({pctSakit}%)
                        </span>
                      </div>

                      <div className="bg-amber-50/45 p-4 border border-amber-150 rounded-xl flex flex-col gap-1 shadow-xs justify-center">
                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                          Izin (I)
                        </span>
                        <span className="text-base font-black font-mono text-amber-700 leading-none mt-1">
                          {matchIzin} ({pctIzin}%)
                        </span>
                      </div>

                      <div className="bg-rose-50/45 p-4 border border-rose-150 rounded-xl flex flex-col gap-1 shadow-xs justify-center">
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                          Alpa (A)
                        </span>
                        <span className="text-base font-black font-mono text-rose-700 leading-none mt-1">
                          {matchAlpa} ({pctAlpa}%)
                        </span>
                      </div>
                    </div>

                    {/* Preview Table block representation */}
                    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                          Preview Rekap Absensi Siswa
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Menampilkan total rekap status absensi (H, S, I, A, T)
                          untuk setiap siswa berdasarkan filter terpilih.
                        </p>
                      </div>

                      {recapList.length === 0 ? (
                        <div className="py-12 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-4">
                          <ShieldAlert
                            size={28}
                            className="text-slate-350 animate-bounce mb-2"
                          />
                          <span className="text-xs font-bold text-slate-500">
                            Tidak ada data siswa / presensi found
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-xs mt-1">
                            Ubah rentang tanggal pencarian atau filter kelas
                            untuk mendapatkan log presensi siswa.
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left font-sans text-[11px] divide-y divide-slate-100">
                              <thead>
                                <tr className="text-slate-455 font-extrabold uppercase text-[9px] tracking-wider pb-2 border-b border-slate-100">
                                  <th className="pb-2 text-center">No</th>
                                  <th className="pb-2">NIS</th>
                                  <th className="pb-2">Nama Siswa</th>
                                  <th className="pb-2 text-center">Kelas</th>
                                  <th className="pb-2">Wali Kelas</th>
                                  <th className="pb-2 text-center text-emerald-600">
                                    H
                                  </th>
                                  <th className="pb-2 text-center text-blue-600">
                                    S
                                  </th>
                                  <th className="pb-2 text-center text-amber-600">
                                    I
                                  </th>
                                  <th className="pb-2 text-center text-rose-600">
                                    A
                                  </th>
                                  <th className="pb-2 text-center text-purple-600">
                                    T
                                  </th>
                                  <th className="pb-2 text-center font-black">
                                    Total
                                  </th>
                                  <th className="pb-2 text-center text-rose-500 font-bold">
                                    Poin Pd.
                                  </th>
                                  <th className="pb-2 text-center text-rose-700 font-black">
                                    Poin Tot.
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {recapList.map((row, idx) => {
                                  return (
                                    <tr
                                      key={row.id}
                                      className="hover:bg-slate-50/40 select-none"
                                    >
                                      <td className="py-2.5 text-center font-bold text-slate-400">
                                        {idx + 1}
                                      </td>
                                      <td className="py-2.5 font-mono text-slate-500 font-extrabold">
                                        {row.nis}
                                      </td>
                                      <td className="py-2.5 font-bold text-slate-800 whitespace-nowrap">
                                        {row.name}
                                      </td>
                                      <td className="py-2.5 text-center text-slate-755 font-extrabold whitespace-nowrap">
                                        {row.class}
                                      </td>
                                      <td className="py-2.5 text-slate-655 font-bold whitespace-nowrap">
                                        {row.homeroomName}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-emerald-600 font-mono text-xs">
                                        {row.H}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-blue-600 font-mono text-xs">
                                        {row.S}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-amber-600 font-mono text-xs">
                                        {row.I}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-rose-600 font-mono text-xs">
                                        {row.A}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-purple-600 font-mono text-xs">
                                        {row.T}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-slate-800 font-mono text-xs bg-slate-50/{20}">
                                        {row.total}
                                      </td>
                                      <td className="py-2.5 text-center font-bold text-rose-500 font-mono text-xs bg-rose-50/30">
                                        {row.infractionPointsPeriod}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-rose-700 font-mono text-xs bg-rose-50/60">
                                        {row.infractionPointsTotal}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-[10px] text-slate-455 mt-1 pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 leading-relaxed">
                              <span>
                                <strong>Keterangan Kolom Poin:</strong>
                              </span>
                              <span>
                                <span className="inline-block w-2.5 h-2.5 bg-rose-50 border border-rose-100 rounded-xs mr-1 text-center font-bold text-[8px] leading-tight text-rose-600">
                                  P
                                </span>
                                <strong>Poin Pd.</strong> &mdash; Jumlah poin
                                pelanggaran dalam tanggal terfilter
                              </span>
                              <span>
                                <span className="inline-block w-2.5 h-2.5 bg-rose-200 border border-rose-300 rounded-xs mr-1 text-center font-bold text-[8px] leading-tight text-rose-800">
                                  T
                                </span>
                                <strong>Poin Tot.</strong> &mdash; Total semua
                                poin pelanggaran kumulatif murid
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
          </motion.div>
        )}
      </div>

      {/* GLOBAL KUITANSI (RECEIPT OVERLAY) POPUP */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-xl w-full flex flex-col gap-5 relative">
            {/* Format Selection Switcher */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl no-print text-[11px] font-bold text-slate-650 w-full justify-center">
              <button
                type="button"
                onClick={() => setReceiptPrintFormat("standard")}
                className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${receiptPrintFormat === "standard" ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-800"}`}
              >
                Format Standar (Kuitansi PDF)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPrintFormat("thermal")}
                className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${receiptPrintFormat === "thermal" ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-800"}`}
              >
                Format Thermal (Roll Kasir)
              </button>
            </div>

            {/* Kuitansi core print page section starting here */}
            <div
              id="print-receipt-section"
              className={
                receiptPrintFormat === "thermal"
                  ? "bg-white text-slate-900 p-2 font-mono flex flex-col gap-2.5 text-[10px] leading-tight text-center relative print-thermal w-full max-w-[76mm] mx-auto border-none select-all"
                  : "bg-white text-slate-900 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 text-[11px] leading-relaxed relative"
              }
            >
              {receiptPrintFormat === "thermal" ? (
                /* THERMAL RECEIPT LAYOUT */
                <div className="flex flex-col gap-2.5 text-slate-900 font-mono text-left select-all">
                  {/* Small Header */}
                  <div className="flex items-center gap-1.5 border-b border-dashed border-slate-900 pb-2.5">
                    {schoolIdentity?.logo && (
                      <img
                        src={schoolIdentity.logo}
                        className="w-8 h-8 object-contain shrink-0 grayscale"
                        alt="Logo Left"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 text-center font-black uppercase text-xs tracking-wider">
                      <span className="block text-sm font-extrabold leading-tight">
                        {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                      </span>
                      <span className="block text-[8px] font-normal normal-case leading-none mt-1">
                        {schoolIdentity?.subheading ||
                          "Lembaga Pendidikan Maarif Nahdlatul Ulama"}
                      </span>
                      <span className="block text-[7.5px] font-normal mt-0.5 leading-tight">
                        {schoolIdentity?.address || "Pasuruan, Jawa Timur"}
                      </span>
                    </div>
                    {schoolIdentity?.logo2 && (
                      <img
                        src={schoolIdentity.logo2}
                        className="w-8 h-8 object-contain shrink-0 grayscale"
                        alt="Logo Right"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="text-center font-mono font-bold uppercase text-[9px] py-1 border-b border-dashed border-slate-900">
                    <span>* BUKTI PEMBAYARAN RESMI *</span>
                    <p className="text-[8px] font-mono normal-case tracking-tight mt-0.5">
                      Ref: #
                      {receiptToPrint.detail.id.substring(0, 10).toUpperCase()}
                    </p>
                    <p className="text-[8.5px] font-normal normal-case mt-0.5">
                      Tgl:{" "}
                      {new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      &bull; Jam:{" "}
                      {new Date().toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Student details */}
                  <div className="flex flex-col gap-0.5 text-[8.5px] pb-1.5 border-b border-dashed border-slate-900 uppercase">
                    <div className="flex justify-between">
                      <span>Murid:</span>
                      <span className="font-bold">
                        {receiptToPrint.student.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>NIS:</span>
                      <span className="font-mono">
                        {receiptToPrint.student.nis}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kelas:</span>
                      <span>Kelas {receiptToPrint.student.class}</span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="flex flex-col gap-1.5 py-1 text-[8.5px] border-b border-dashed border-slate-900">
                    <div className="flex justify-between font-bold uppercase border-b border-dotted border-slate-950 pb-0.5">
                      <span>Pesanan / Item</span>
                      <span>Subtotal</span>
                    </div>
                    {receiptToPrint.type === "consolidated" ? (
                      receiptToPrint.detail.items.map(
                        (item: any, i: number) => (
                          <div key={i} className="flex flex-col gap-0.5 py-0.5">
                            <div className="flex justify-between font-bold">
                              <span className="uppercase">{item.name}</span>
                              <span className="font-mono shrink-0">
                                Rp {item.amount.toLocaleString("id-ID")}
                              </span>
                            </div>
                            {item.desc && (
                              <span
                                className="text-[7.5px] text-slate-600 leading-tight normal-case"
                                dangerouslySetInnerHTML={{ __html: item.desc }}
                              />
                            )}
                          </div>
                        ),
                      )
                    ) : (
                      <div className="flex justify-between font-bold py-0.5 uppercase">
                        <div>
                          {receiptToPrint.type === "spp" ? (
                            <>
                              <span>Iuran SPP Bulanan</span>
                              <p className="text-[7.5px] text-slate-650 normal-case">
                                Bulan: {receiptToPrint.detail.month}{" "}
                                {receiptToPrint.detail.year}
                              </p>
                            </>
                          ) : receiptToPrint.type === "misc" ? (
                            <>
                              <span>{receiptToPrint.detail.title}</span>
                              <p className="text-[7.5px] text-slate-650 normal-case">
                                Status: LUNAS (PAID)
                              </p>
                            </>
                          ) : (
                            <>
                              <span>
                                Tabungan (
                                {receiptToPrint.detail.type === "deposit"
                                  ? "Penyetoran"
                                  : "Penarikan"}
                                )
                              </span>
                              <p className="text-[7.5px] text-slate-650 normal-case">
                                Memo: "
                                {receiptToPrint.detail.notes ||
                                  "Transaksi Tabungan"}
                                "
                              </p>
                            </>
                          )}
                        </div>
                        <span className="font-mono shrink-0">
                          Rp{" "}
                          {receiptToPrint.detail.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Grand total */}
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase py-1 border-b border-dashed border-slate-900">
                    <span>Total Pembayaran:</span>
                    <span className="font-mono text-xs">
                      Rp {receiptToPrint.detail.amount.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Words */}
                  <div className="text-[7.5px] leading-tight italic pb-2 border-b border-dashed border-slate-900">
                    Terbilang:{" "}
                    {indonesianWordsForRupiah(receiptToPrint.detail.amount)}
                  </div>

                  {/* Penyetor & Bendahara Info (No signature space) */}
                  <div className="grid grid-cols-2 text-[8px] text-center uppercase gap-1 pt-2">
                    <div>
                      <span className="block text-[6.5px] text-slate-500">Penyetor/Murid</span>
                      <span className="font-bold block truncate">({receiptToPrint.student.name.substring(0, 14)})</span>
                    </div>
                    <div>
                      <span className="block text-[6.5px] text-slate-500">Bendahara/Admin</span>
                      <span className="font-bold block truncate">({schoolIdentity?.treasurer || "Bendahara"})</span>
                    </div>
                  </div>

                  <div className="text-center text-[7px] leading-none tracking-tight mt-4 text-slate-550 border-t border-dotted border-slate-900 pt-2 uppercase">
                    *** TERIMA KASIH ***
                    <p className="mt-1 font-mono text-[6.5px] tracking-widest text-[6px]">
                      SMP Ma'arif NU Pandaan
                    </p>
                  </div>
                </div>
              ) : (
                /* STANDARD RECEIPT LAYOUT */
                <>
                  {/* Paid Status Watermark Badge on the Receipt itself */}
                  {((receiptToPrint.type === "spp" &&
                    receiptToPrint.detail.status === "paid") ||
                    receiptToPrint.type === "consolidated" ||
                    (receiptToPrint.type === "misc" &&
                      receiptToPrint.detail.status === "paid") ||
                    (receiptToPrint.type === "savings" &&
                      (receiptToPrint.detail.status === "success" ||
                        !receiptToPrint.detail.status ||
                        receiptToPrint.detail.status === "completed"))) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 border-4 border-dashed border-emerald-500/15 rounded-2xl px-6 py-2 pointer-events-none select-none z-0">
                      <span className="font-sans font-black tracking-widest text-[36px] uppercase text-emerald-500/15">
                        {receiptToPrint.type === "consolidated" || receiptToPrint.type === "misc"
                          ? "LUNAS"
                          : receiptToPrint.type === "spp"
                            ? "LUNAS"
                            : "SUKSES"}
                      </span>
                    </div>
                  )}

                  {/* Receipt Header */}
                  {schoolIdentity?.letterhead ? (
                    <div className="border-b-2 border-slate-900 pb-2 flex flex-col items-center">
                      <img
                        src={schoolIdentity.letterhead}
                        className="w-full max-h-24 object-contain"
                        alt="Kop Surat"
                        referrerPolicy="no-referrer"
                      />
                      <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center select-none">
                        <span className="font-extrabold text-slate-800 text-[9px]">
                          KUITANSI RESMI
                        </span>
                        <span>
                          Ref: #
                          {receiptToPrint.detail.id
                            .substring(0, 10)
                            .toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        {schoolIdentity?.logo && (
                          <img
                            src={schoolIdentity.logo}
                            className="w-10 h-10 object-contain print-receipt-logo"
                            alt="Logo"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest leading-none block">
                            {schoolIdentity?.subheading ||
                              "Lembaga Pendidikan Maarif Nahdlatul Ulama"}
                          </span>
                          <span className="text-[8px] text-slate-400 block font-medium mt-0.5">
                            {schoolIdentity?.accreditation || "Terakreditasi A"}{" "}
                            &bull;{" "}
                            {schoolIdentity?.address ||
                              "Pasuruan, Jawa Timur, Indonesia"}{" "}
                            &bull; Telp:{" "}
                            {schoolIdentity?.phone || "(0343) 631234"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {schoolIdentity?.logo2 && (
                          <img
                            src={schoolIdentity.logo2}
                            className="w-10 h-10 object-contain print-receipt-logo"
                            alt="Logo 2"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="text-right flex flex-col gap-0.5 font-mono">
                          <span className="text-xs font-extrabold text-slate-850">
                            KUITANSI RESMI
                          </span>
                          <span className="text-[8px] text-slate-400 block">
                            Ref: #
                            {receiptToPrint.detail.id
                              .substring(0, 10)
                              .toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Patient/Student Data Row */}
                  <div className="flex flex-col gap-1 text-left pb-3 border-b border-dashed border-slate-300 text-slate-700 font-sans text-xs">
                    <div className="grid grid-cols-[120px_12px_1fr] leading-relaxed">
                      <span className="font-bold text-slate-500">
                        Wali Murid/Siswa
                      </span>
                      <span className="text-slate-400 font-bold">:</span>
                      <span className="font-bold text-slate-900">
                        {receiptToPrint.student.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-[120px_12px_1fr] leading-relaxed">
                      <span className="font-bold text-slate-500">NIS</span>
                      <span className="text-slate-400 font-bold">:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {receiptToPrint.student.nis}
                      </span>
                    </div>
                    <div className="grid grid-cols-[120px_12px_1fr] leading-relaxed">
                      <span className="font-bold text-slate-500">Kelas</span>
                      <span className="text-slate-400 font-bold">:</span>
                      <span className="font-bold text-slate-800 text-normal">
                        {receiptToPrint.student.class}
                      </span>
                    </div>
                  </div>

                  {/* Transactions details */}
                  <div className="flex flex-col gap-3 py-2">
                    <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[9px] uppercase text-slate-400">
                      <span>Deskripsi Item Pembayaran</span>
                      <span>Total Rupiah</span>
                    </div>
                    <div className="flex flex-col gap-2 w-full text-slate-800">
                      {receiptToPrint.type === "consolidated" ? (
                        receiptToPrint.detail.items.map(
                          (item: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between items-center text-xs py-1 border-b border-dotted border-slate-200"
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-extrabold text-slate-800 text-[11px]">
                                  {item.name}
                                </span>
                                <span
                                  className="text-[9px] text-slate-500 font-medium leading-none mt-1"
                                  dangerouslySetInnerHTML={{
                                    __html: item.desc || "",
                                  }}
                                ></span>
                              </div>
                              <span className="font-mono font-bold text-slate-800 text-xs text-right shrink-0">
                                Rp {item.amount.toLocaleString("id-ID")},00
                              </span>
                            </div>
                          ),
                        )
                      ) : (
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col gap-0.5 text-left">
                            {receiptToPrint.type === "spp" ? (
                              <>
                                <span className="font-bold text-slate-800 text-xs">
                                  Pembayaran Iuran SPP Wajib Bulanan
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium leading-none mt-1">
                                  Bulan periodik: {receiptToPrint.detail.month}{" "}
                                  {receiptToPrint.detail.year} &bull; Metode:{" "}
                                  {receiptToPrint.detail.paymentMethod?.toUpperCase() ||
                                    "CASH / MANUALLY ENTERED"}
                                </span>
                              </>
                            ) : receiptToPrint.type === "misc" ? (
                              <>
                                <span className="font-bold text-slate-800 text-xs">
                                  {receiptToPrint.detail.title}
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium leading-none mt-1">
                                  Pembayaran Iuran Lain-lain &bull; Metode:{" "}
                                  {receiptToPrint.detail.paymentMethod?.toUpperCase() ||
                                    "CASH / MANUALLY ENTERED"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-slate-800 text-xs">
                                  Mutasi Keuangan Rekening Tabungan
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium leading-none mt-1">
                                  {receiptToPrint.detail.type === "deposit"
                                    ? "Penyetoran Saldo Tunai"
                                    : "Penarikan Saldo Tunai"}{" "}
                                  &bull; Memo: "
                                  {receiptToPrint.detail.notes ||
                                    "Transaksi Teller Tabungan"}
                                  "
                                </span>
                              </>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            Rp{" "}
                            {receiptToPrint.detail.amount.toLocaleString(
                              "id-ID",
                            )}
                            ,00
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wordify Terbilang Words */}
                  <div className="flex flex-col gap-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium italic text-slate-650 text-[10px] text-left">
                      Terbilang:{" "}
                      <span className="font-bold not-italic font-sans text-slate-850">
                        #
                        {indonesianWordsForRupiah(receiptToPrint.detail.amount)}
                        #
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-semibold pl-1 text-left">
                      Tanggal Cetak:{" "}
                      {new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 mt-6 pt-4 border-t border-slate-100 text-[10px]">
                    <div className="flex flex-col justify-between h-[120px] text-left">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                        Wali Murid / Penyetor
                      </span>
                      <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-32 pt-1 text-center font-bold">
                        ({receiptToPrint.student.name.substring(0, 16)})
                      </span>
                    </div>
                    <div className="flex flex-col justify-between items-end h-[120px] text-right relative">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-bold text-slate-800 font-sans">
                          Pandaan,{" "}
                          {receiptToPrint.type === "spp"
                            ? receiptToPrint.detail.paidAt
                              ? new Date(
                                  receiptToPrint.detail.paidAt,
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : receiptToPrint.detail.status === "paid"
                                ? new Date().toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })
                                : "Belum Lunas"
                            : receiptToPrint.type === "consolidated"
                              ? new Date(
                                  receiptToPrint.detail.paidAt,
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : new Date(
                                  receiptToPrint.detail.createdAt,
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                        </span>
                      </div>

                      {/* Signature and Stamp layer for paid/completed receipts */}
                      {((receiptToPrint.type === "spp" &&
                        receiptToPrint.detail.status === "paid") ||
                        receiptToPrint.type === "consolidated" ||
                        (receiptToPrint.type === "misc" &&
                          receiptToPrint.detail.status === "paid") ||
                        (receiptToPrint.type === "savings" &&
                          (receiptToPrint.detail.status === "success" ||
                            !receiptToPrint.detail.status ||
                            receiptToPrint.detail.status === "completed"))) && (
                        <div className="absolute top-[28px] right-2 w-32 h-[55px] pointer-events-none select-none z-10 flex items-center justify-center">
                          {/* Treasurer signature */}
                          {schoolIdentity?.treasurerSignature && (
                            <img
                              src={schoolIdentity.treasurerSignature}
                              alt="Ttd Bendahara"
                              className="absolute -bottom-1 right-2 max-h-12 max-w-[90px] object-contain z-10 mix-blend-multiply"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {/* School stamp */}
                          {schoolIdentity?.schoolStamp && (
                            <img
                              src={schoolIdentity.schoolStamp}
                              alt="Stempel Sekolah"
                              className="absolute -bottom-2 right-[60px] max-h-[70px] max-w-[112px] object-contain z-20 mix-blend-multiply opacity-85"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      )}

                      <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-32 pt-1 text-center font-bold">
                        ({schoolIdentity?.treasurer || "Bendahara Sekolah"})
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-[8px] text-slate-400 mt-2 font-medium">
                    Bukti pembayaran sah diterbitkan otomatis oleh{" "}
                    {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}. Terima
                    kasih atas partisipasi Anda.
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions at the Bottom */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4 border-t border-slate-100 no-print">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-450">
                Kuitansi Resmi SMP Maarif
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setReceiptToPrint(null);
                    onRefresh();
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer size={12} /> Cetak Kuitansi 🖨️
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptToPrint(null)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL LAPORAN (REPORT OVERLAY) POPUP */}
      {reportToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-905-notif bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-4xl w-full flex flex-col gap-6 relative max-h-[90vh]">
            {/* Action buttons inside modal overlay */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Pratinjau Cetak Laporan - SMP Ma'Arif Pandaan
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer size={12} /> Cetak Sekarang 🖨️
                </button>
                <button
                  type="button"
                  onClick={() => setReportToPrint(null)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Core report print canvas section starting here */}
            <div className="overflow-y-auto pr-1">
              <div
                id="print-report-section"
                className="bg-white text-slate-950 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 text-[11px] leading-relaxed relative"
              >
                {/* Official School Header - Kop Surat */}
                {schoolIdentity?.letterhead ? (
                  <div className="w-full border-b-4 border-double border-slate-900 pb-2 flex flex-col items-center text-left select-none">
                    <img
                      src={schoolIdentity.letterhead}
                      className="w-full max-h-28 object-contain"
                      alt="Kop Surat"
                      referrerPolicy="no-referrer"
                    />
                    <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-850">
                        LAPORAN RESMI
                      </span>
                      <span>
                        Dihasilkan: {new Date().toLocaleDateString("id-ID")}{" "}
                        {new Date().toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border-b-4 border-double border-slate-900 pb-3 flex justify-between items-center gap-4 text-left">
                    <div className="flex items-center gap-3">
                      {schoolIdentity?.logo && (
                        <img
                          src={schoolIdentity.logo}
                          className="w-12 h-12 object-contain print-report-logo"
                          alt="Logo"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-sm font-black uppercase tracking-wider text-slate-800">
                          {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none block">
                          {schoolIdentity?.subheading ||
                            "Lembaga Pendidikan Maarif Nahdlatul Ulama"}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-semibold mt-1">
                          {schoolIdentity?.accreditation || "Terakreditasi A"}{" "}
                          &bull;{" "}
                          {schoolIdentity?.address ||
                            "Pasuruan, Jawa Timur, Indonesia"}
                        </span>
                        <span className="text-[8px] text-slate-400 block italic leading-none mt-0.5">
                          Telp: {schoolIdentity?.phone || "(0343) 631234"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {schoolIdentity?.logo2 && (
                        <img
                          src={schoolIdentity.logo2}
                          className="w-12 h-12 object-contain print-report-logo"
                          alt="Logo 2"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="text-right flex flex-col gap-0.5 font-mono">
                        <span className="text-xs font-black text-slate-850">
                          LAPORAN RESMI
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-1">
                          Dihasilkan: {new Date().toLocaleDateString("id-ID")}{" "}
                          {new Date().toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtitle / Title Page */}
                <div className="text-center my-1 text-slate-900">
                  <h2 className="text-sm font-extrabold uppercase tracking-widest underline">
                    {reportToPrint === "harian" && `Laporan Kas Harian Teller`}
                    {reportToPrint === "rekap-spp" &&
                      `Laporan Rekapitulasi Pembayaran SPP`}
                    {reportToPrint === "rekap-tabungan" &&
                      `Laporan Peringkat & Rekap Buku Tabungan`}
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono mt-1 font-semibold">
                    {reportToPrint === "harian" &&
                      `Periode Tanggal Buku Teller: ${new Date(currentDateFilter).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
                    {reportToPrint === "rekap-spp" &&
                      `Jenjang Filter Tingkat: ${rekapSppGradeFilter === "all" ? "SEMUA TINGKAT KELAS 7, 8, & 9" : `KELAS TINGKAT ${rekapSppGradeFilter}`} | Tahun Ajaran Filter: ${rekapSppYearFilter === "all" ? "SEMUA TAHUN AJARAN" : `TA ${rekapSppYearFilter}`}`}
                    {reportToPrint === "rekap-tabungan" &&
                      `Disusun Berdasarkan Kepemilikan Saldo Tabungan Terbesar Kelas 7/8/9`}
                  </p>
                </div>

                {/* Report Table Material */}
                {reportToPrint === "harian" &&
                  (() => {
                    const sppPaidToday = bills.filter(
                      (b) =>
                        b.status === "paid" &&
                        b.paidAt &&
                        b.paidAt.split("T")[0] === currentDateFilter,
                    );
                    const savingsToday = transactions.filter(
                      (t) =>
                        t.status === "success" &&
                        t.createdAt &&
                        t.createdAt.split("T")[0] === currentDateFilter,
                    );

                    const totalSppTunai = sppPaidToday
                      .filter(
                        (b) =>
                          b.paymentMethod === "cash" ||
                          !b.paymentMethod ||
                          b.paymentMethod.toLowerCase().includes("tunai") ||
                          b.paymentMethod.toLowerCase().includes("manual"),
                      )
                      .reduce((acc, c) => acc + c.amount, 0);

                    const totalSppOnline = sppPaidToday
                      .filter(
                        (b) =>
                          b.paymentMethod &&
                          !b.paymentMethod.toLowerCase().includes("tunai") &&
                          !b.paymentMethod.toLowerCase().includes("cash") &&
                          !b.paymentMethod.toLowerCase().includes("manual"),
                      )
                      .reduce((acc, c) => acc + c.amount, 0);

                    const totalTabunganMasuk = savingsToday
                      .filter((t) => t.type === "deposit")
                      .reduce((acc, c) => acc + c.amount, 0);

                    const totalTabunganKeluar = savingsToday
                      .filter((t) => t.type === "withdrawal")
                      .reduce((acc, c) => acc + c.amount, 0);

                    const totalKasMasukLokal =
                      totalSppTunai + totalTabunganMasuk;
                    const netKasLokal =
                      totalKasMasukLokal - totalTabunganKeluar;

                    return (
                      <div className="flex flex-col gap-4 text-slate-900">
                        {/* Sub-Summary Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[9px] border border-slate-350 p-2.5 rounded-lg text-slate-905">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-500">
                              Iuran SPP Tunai/Manual:
                            </span>
                            <span className="font-bold font-mono text-slate-900">
                              Rp {totalSppTunai.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-slate-300 pl-2">
                            <span className="font-bold text-slate-500">
                              Iuran SPP Snap Online:
                            </span>
                            <span className="font-bold font-mono text-slate-900">
                              Rp {totalSppOnline.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-slate-300 pl-2">
                            <span className="font-bold text-slate-500">
                              Setoran Tabungan:
                            </span>
                            <span className="font-bold font-mono text-slate-900">
                              Rp {totalTabunganMasuk.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-slate-300 pl-2">
                            <span className="font-bold text-slate-500">
                              Kredit Penarikan:
                            </span>
                            <span className="font-bold font-mono text-rose-800">
                              Rp {totalTabunganKeluar.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        {/* Reconciliation Statement */}
                        <div className="p-2.5 bg-slate-100 rounded border border-slate-300 flex justify-between items-center text-[10px] uppercase font-bold text-slate-900">
                          <span>
                            Net Aliran Brankas Tunai Teller (Manual Tunai Masuk
                            - Tarikan Keluar):
                          </span>
                          <span className="font-mono text-emerald-800">
                            Rp {netKasLokal.toLocaleString("id-ID")},00
                          </span>
                        </div>

                        {/* Cash SPP list */}
                        <div>
                          <h4 className="font-bold text-slate-900 uppercase text-[9px] mb-1.5 font-semibold">
                            1. Rincian Buku Pembayar SPP Terdaftar (
                            {sppPaidToday.length} Transaksi)
                          </h4>
                          <table className="w-full text-left font-sans border-collapse text-[9px]">
                            <thead>
                              <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                                <th className="p-1 px-2 border border-slate-300">
                                  Jam
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Siswa / NIS
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Kelas
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Bulan SPP
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Metode
                                </th>
                                <th className="p-1 px-2 border border-slate-300 text-right">
                                  Nominal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sppPaidToday.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="text-center py-3 border border-slate-300 italic text-slate-500"
                                  >
                                    Tidak ada penerimaan SPP pada tanggal ini.
                                  </td>
                                </tr>
                              ) : (
                                sppPaidToday.map((b) => {
                                  const s = students.find(
                                    (student) => student.id === b.studentId,
                                  );
                                  return (
                                    <tr
                                      key={b.id}
                                      className="border border-slate-300 text-slate-900"
                                    >
                                      <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">
                                        {b.paidAt
                                          ? new Date(
                                              b.paidAt,
                                            ).toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : "-"}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 font-semibold">
                                        {s?.name || "Siswa dihapus"} (
                                        {s?.nis || "-"})
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300">
                                        Kelas {s?.class || "-"}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 font-medium">
                                        {b.month} {b.year}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 uppercase font-bold text-[8px]">
                                        {b.paymentMethod || "cash"}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 text-right font-mono font-semibold">
                                        Rp {b.amount.toLocaleString("id-ID")}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Savings List */}
                        <div className="mt-2 text-slate-900">
                          <h4 className="font-bold text-slate-950 uppercase text-[9px] mb-1.5 font-semibold">
                            2. Mutasi Keuangan Tabungan Siswa (
                            {savingsToday.length} Transaksi)
                          </h4>
                          <table className="w-full text-left font-sans border-collapse text-[9px]">
                            <thead>
                              <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                                <th className="p-1 px-2 border border-slate-300">
                                  Jam
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Siswa / NIS
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Kelas
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Jenis Mutasi
                                </th>
                                <th className="p-1 px-2 border border-slate-300">
                                  Catatan/Memo
                                </th>
                                <th className="p-1 px-2 border border-slate-300 text-right">
                                  Nominal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {savingsToday.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="text-center py-3 border border-slate-300 italic text-slate-500"
                                  >
                                    Tidak ada penarikan atau setoran tabungan
                                    pada tanggal ini.
                                  </td>
                                </tr>
                              ) : (
                                savingsToday.map((t) => {
                                  const s = students.find(
                                    (student) => student.id === t.studentId,
                                  );
                                  return (
                                    <tr
                                      key={t.id}
                                      className="border border-slate-300 text-slate-900"
                                    >
                                      <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">
                                        {new Date(
                                          t.createdAt,
                                        ).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 font-semibold">
                                        {s?.name || "Siswa dihapus"} (
                                        {s?.nis || "-"})
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300">
                                        Kelas {s?.class || "-"}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 font-bold uppercase text-[8px]">
                                        {t.type === "deposit"
                                          ? "🟢 SETORAN (IN)"
                                          : "🔴 TARIKAN (OUT)"}
                                      </td>
                                      <td className="p-1 px-2 border border-slate-300 italic font-medium">
                                        {t.notes || "-"}
                                      </td>
                                      <td
                                        className={`p-1 px-2 border border-slate-300 text-right font-mono font-semibold ${t.type === "deposit" ? "text-emerald-800" : "text-rose-800"}`}
                                      >
                                        Rp {t.amount.toLocaleString("id-ID")}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                {reportToPrint === "rekap-spp" &&
                  (() => {
                    const activeStudents = [
                      ...(rekapSppGradeFilter === "all"
                        ? students
                        : students.filter((s) =>
                            s.class.startsWith(rekapSppGradeFilter),
                          ))
                    ].sort((a, b) => a.name.localeCompare(b.name));

                    const summaryMatrix = activeStudents.map((student) => {
                      const sBills = bills.filter(
                        (b) =>
                          b.studentId === student.id &&
                          (rekapSppYearFilter === "all" ||
                            getAcademicYearOfBill(b) === rekapSppYearFilter),
                      );
                      const paid = sBills.filter((b) => b.status === "paid");
                      const unpaid = sBills.filter(
                        (b) => b.status === "unpaid",
                      );
                      const totalPaidNominal = paid.reduce(
                        (sum, b) => sum + b.amount,
                        0,
                      );
                      const totalUnpaidNominal = unpaid.reduce(
                        (sum, b) => sum + b.amount,
                        0,
                      );
                      const pct =
                        sBills.length > 0
                          ? Math.round((paid.length / sBills.length) * 100)
                          : 0;
                      return {
                        student,
                        totalBillsCount: sBills.length,
                        paidCount: paid.length,
                        unpaidCount: unpaid.length,
                        totalPaidNominal,
                        totalUnpaidNominal,
                        pct,
                      };
                    });

                    const globalTotalPaid = summaryMatrix.reduce(
                      (acc, current) => acc + current.totalPaidNominal,
                      0,
                    );
                    const globalTotalUnpaid = summaryMatrix.reduce(
                      (acc, current) => acc + current.totalUnpaidNominal,
                      0,
                    );

                    return (
                      <div className="flex flex-col gap-4 text-slate-900">
                        {/* Financial summary blocks */}
                        <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded-lg text-xs font-bold uppercase text-slate-900">
                          <div className="flex justify-between items-center text-emerald-800">
                            <span>Total Akumulasi Terbayar (Paid SPP):</span>
                            <span className="font-mono">
                              Rp {globalTotalPaid.toLocaleString("id-ID")},00
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-rose-800 border-l border-slate-300 pl-4">
                            <span>Total Tunggakan Aktif (Unpaid SPP):</span>
                            <span className="font-mono">
                              Rp {globalTotalUnpaid.toLocaleString("id-ID")},00
                            </span>
                          </div>
                        </div>

                        {/* Table core */}
                        <table className="w-full text-left font-sans border-collapse text-[9px] mt-2">
                          <thead>
                            <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                              <th className="p-1 px-2 border border-slate-350">
                                NIS
                              </th>
                              <th className="p-1 px-2 border border-slate-350">
                                Nama Lengkap Siswa
                              </th>
                              <th className="p-1 px-2 border border-slate-350">
                                Kelas Belajar
                              </th>
                              <th className="p-1 px-2 border border-slate-350 text-center">
                                Kelunasan (Bulan)
                              </th>
                              <th className="p-1 px-2 border border-slate-350 text-center">
                                Progres %
                              </th>
                              <th className="p-1 px-2 border border-slate-350 text-right">
                                Lunas (Nominal)
                              </th>
                              <th className="p-1 px-2 border border-slate-350 text-right">
                                Tunggakan (Nominal)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryMatrix.map(
                              ({
                                student,
                                totalBillsCount,
                                paidCount,
                                unpaidCount,
                                totalPaidNominal,
                                totalUnpaidNominal,
                                pct,
                              }) => (
                                <tr
                                  key={student.id}
                                  className="border border-slate-300 text-slate-900"
                                >
                                  <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">
                                    {student.nis}
                                  </td>
                                  <td className="p-1 px-2 border border-slate-300 font-bold">
                                    {student.name}
                                  </td>
                                  <td className="p-1 px-2 border border-slate-300 font-semibold">
                                    {student.class}
                                  </td>
                                  <td className="p-1 px-2 border border-slate-300 text-center">
                                    {paidCount} / {totalBillsCount} Bulan
                                  </td>
                                  <td className="p-1 px-2 border border-slate-300 text-center font-bold font-mono">
                                    {pct}%
                                  </td>
                                  <td className="p-1 px-2 border border-slate-300 text-right font-mono text-emerald-800 font-semibold">
                                    Rp{" "}
                                    {totalPaidNominal.toLocaleString("id-ID")}
                                  </td>
                                  <td className="p-1 px-2 border border-slate-300 text-right font-mono text-rose-800 font-semibold">
                                    Rp{" "}
                                    {totalUnpaidNominal.toLocaleString("id-ID")}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                {reportToPrint === "rekap-tabungan" &&
                  (() => {
                    const orderedStudentsBySavings = [...students].sort(
                      (a, b) => b.savingsBalance - a.savingsBalance,
                    );
                    const totalGlobalSavings = students.reduce(
                      (acc, s) => acc + s.savingsBalance,
                      0,
                    );
                    const countActiveAccounts = students.filter(
                      (s) => s.savingsBalance > 0,
                    ).length;

                    return (
                      <div className="flex flex-col gap-4 text-slate-900">
                        {/* Widgets */}
                        <div className="grid grid-cols-3 gap-2 border border-slate-300 p-2.5 rounded-lg text-[9px] uppercase font-bold text-slate-950">
                          <div>
                            <span>Total Simpanan Global:</span>
                            <span className="block font-mono text-xs font-black text-slate-900 mt-0.5">
                              Rp {totalGlobalSavings.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="border-l border-slate-300 pl-3">
                            <span>Rekening Aktif Terisi:</span>
                            <span className="block font-mono text-xs font-black text-slate-900 mt-0.5">
                              {countActiveAccounts} Kelas 7/8/9
                            </span>
                          </div>
                          <div className="border-l border-slate-300 pl-3">
                            <span>Rata-rata Saldo Siswa:</span>
                            <span className="block font-mono text-xs font-black text-slate-900 mt-0.5">
                              Rp{" "}
                              {students.length > 0
                                ? Math.round(
                                    totalGlobalSavings / students.length,
                                  ).toLocaleString("id-ID")
                                : 0}
                            </span>
                          </div>
                        </div>

                        {/* Main Ledger list */}
                        <table className="w-full text-left font-sans border-collapse text-[9px] mt-2">
                          <thead>
                            <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                              <th
                                className="p-1 px-2 border border-slate-350 text-center"
                                style={{ width: "4%" }}
                              >
                                No
                              </th>
                              <th className="p-1 px-2 border border-slate-350">
                                NIS Siswa
                              </th>
                              <th className="p-1 px-2 border border-slate-350">
                                Nama Lengkap Siswa
                              </th>
                              <th className="p-1 px-2 border border-slate-350 text-center">
                                Kelas
                              </th>
                              <th className="p-1 px-2 border border-slate-350 text-right">
                                Kepemilikan Saldo Tabungan
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderedStudentsBySavings.map((student, idx) => (
                              <tr
                                key={student.id}
                                className="border border-slate-300 text-slate-900"
                              >
                                <td className="p-1 px-2 border border-slate-300 text-center font-bold text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">
                                  {student.nis}
                                </td>
                                <td className="p-1 px-2 border border-slate-300 font-bold">
                                  {student.name}
                                </td>
                                <td className="p-1 px-2 border border-slate-300 text-center font-semibold">
                                  Kelas {student.class}
                                </td>
                                <td className="p-1 px-2 border border-slate-300 text-right font-mono font-black text-slate-900">
                                  Rp{" "}
                                  {student.savingsBalance.toLocaleString(
                                    "id-ID",
                                  )}
                                  ,00
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                {/* Sub signatures sign-off blocks */}
                <div className="grid grid-cols-2 mt-8 pt-4 border-t border-slate-900 text-[10px] leading-relaxed text-slate-900">
                  <div className="flex flex-col justify-between h-[85px]">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                      Mengetahui, Kepala Sekolah
                    </span>
                    <span className="font-bold text-slate-800 font-sans border-t-2 border-slate-900 w-44 pt-1 text-center">
                      (
                      {schoolIdentity?.principal ||
                        "H. Ahmad Fuad, S.Pd, M.PdI"}
                      )
                    </span>
                  </div>
                  <div className="flex flex-col justify-between items-end h-[85px] text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                      Diverifikasi & Pertanggungjawaban
                    </span>
                    <span className="font-bold text-slate-800 font-sans border-t-2 border-slate-900 w-44 pt-1 text-center">
                      ({schoolIdentity?.treasurer || "Bendahara Sekolah"})
                    </span>
                  </div>
                </div>

                {/* Page number print guidelines footer */}
                <div className="text-center text-[7px] text-slate-400 mt-4 italic">
                  Laporan Rekapitulasi Otomatis & Sah &bull; Dicetak Menggunakan
                  Layanan Sistem Administrasi Akademik Terpadu SMP Maarif NU
                  Pandaan.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BATALKAN PEMBAYARAN MANUAL SPP */}
      <AnimatePresence>
        {billToCancel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-md w-full text-slate-900 flex flex-col gap-4 relative my-8"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 select-none">
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert size={18} />
                  <span className="font-extrabold text-sm">
                    Konfirmasi Void SPP
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBillToCancel(null);
                    setCancelFeedback(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-3 font-sans">
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] leading-relaxed">
                  <strong>Peringatan Admin:</strong> Tindakan ini akan
                  membatalkan status pembayaran lunas pada transaksi ini. Status
                  tagihan siswa akan kembali menjadi{" "}
                  <strong>BELUM LUNAS (UNPAID)</strong>. Pesan notifikasi
                  pembatalan otomatis akan dikirim ke WhatsApp wali murid.
                </div>

                <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px]">
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">
                      Nama Siswa
                    </span>
                    <span className="text-slate-500">:</span>
                    <span className="font-bold text-slate-800">
                      {selectedStudent?.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">
                      Kelas &amp; NIS
                    </span>
                    <span className="text-slate-500">:</span>
                    <span className="font-mono text-slate-700">
                      Kelas {selectedStudent?.class} &bull; NIS{" "}
                      {selectedStudent?.nis}
                    </span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">
                      Bulan Tagihan
                    </span>
                    <span className="text-slate-500">:</span>
                    <span className="font-bold text-slate-800">
                      {billToCancel.month} {billToCancel.year}
                    </span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">
                      Jumlah SPP
                    </span>
                    <span className="text-slate-500">:</span>
                    <span className="font-bold text-slate-900">
                      Rp {billToCancel.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">
                      No. Transaksi
                    </span>
                    <span className="text-slate-500">:</span>
                    <span className="font-mono text-slate-500 break-all">
                      {billToCancel.orderId}
                    </span>
                  </div>
                </div>

                {cancelFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-center font-bold text-[10px] ${
                      cancelFeedback.startsWith("✔️")
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                        : "bg-rose-50 text-rose-800 border border-rose-100"
                    }`}
                  >
                    {cancelFeedback}
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setBillToCancel(null);
                    setCancelFeedback(null);
                  }}
                  disabled={isCancelProcessing}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                >
                  Tutup / Keluar
                </button>
                <button
                  type="button"
                  disabled={isCancelProcessing}
                  onClick={async () => {
                    if (!onCancelSppManual) return;
                    setIsCancelProcessing(true);
                    setCancelFeedback(null);
                    try {
                      const res = await onCancelSppManual(billToCancel.id);
                      if (res && res.success) {
                        setCancelFeedback(
                          "✔️ Pembayaran berhasil dibatalkan! Status tagihan kembali offline / UNPAID.",
                        );
                        setTimeout(() => {
                          setBillToCancel(null);
                          setCancelFeedback(null);
                        }, 2000);
                      } else {
                        setCancelFeedback(
                          `⚠️ Galat: ${res?.error || "Gagal memproses pembatalan"}`,
                        );
                      }
                    } catch (err) {
                      setCancelFeedback("⚠️ Kesalahan koneksi jaringan.");
                    } finally {
                      setIsCancelProcessing(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-rose-100 transition-all flex items-center gap-1.5"
                >
                  {isCancelProcessing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Ya, Batalkan Pembayaran (Void)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {qrCardsToPrint && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs no-print p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col gap-6 relative my-8 max-h-[90vh]"
            >
              {/* Header Action Buttons inside modal overlay */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ImageIcon
                    className="text-indigo-600 animate-pulse"
                    size={17}
                  />
                  <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    Pratinjau Cetak Kolektif Kartu QR ({qrCardsToPrint.length}{" "}
                    Siswa)
                  </span>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintId("print-report-section");
                      setTimeout(() => window.print(), 100);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer size={12} /> Cetak Kartu 🖨️
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrCardsToPrint(null)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                  >
                    Tutup / Batal
                  </button>
                </div>
              </div>

              {/* Printable Area Wrapper */}
              <div className="overflow-y-auto pr-1 flex-1">
                <div
                  id="print-report-section"
                  className="bg-white text-slate-950 p-4 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 relative"
                >
                  {/* Outer Grid optimized specifically for Print break intervals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 justify-items-center">
                    {qrCardsToPrint.map((student) => {
                      return (
                        <div
                          key={student.id}
                          className="flex flex-col items-center gap-1.5 break-inside-avoid print:break-inside-avoid"
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <StudentPaymentCard
                            student={student}
                            schoolIdentity={schoolIdentity}
                            isPreview={true}
                          />
                          <span className="text-center text-[7.5px] text-slate-400 uppercase tracking-widest font-extrabold pb-2 no-print select-none">
                            ✂️ Potong Mengikuti Batas Luar Kartu
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* MODAL IMPORT GURU & WALI KELAS BATCH */}
        {isImportTeacherOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden text-left font-sans"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                    <UploadCloud className="text-amber-500" size={18} />
                    <span>
                      Import Batch{" "}
                      {importTeacherType === "homeroom"
                        ? "Wali Kelas"
                        : "Guru Mata Pelajaran"}{" "}
                      (CSV)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gunakan template resmi untuk mengimpor dan memperbarui data
                    guru secara massal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportTeacherOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
                {/* 1. Template & Guide section */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">
                      Unduh Template{" "}
                      {importTeacherType === "homeroom"
                        ? "Wali Kelas"
                        : "Guru Mapel"}
                    </h4>
                    <p className="text-slate-500 leading-relaxed">
                      Template sudah disertai dengan baris data contoh (sample
                      input) agar Anda dapat memahami format yang valid. Kolom
                      bertanda{" "}
                      <span className="font-bold text-amber-600">username</span>{" "}
                      bersifat unik (tidak boleh duplikat). Kolom{" "}
                      <span className="font-bold text-amber-600">password</span>{" "}
                      opsional (bila kosong, sandi default akan dibuat).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadTeacherTemplate(importTeacherType)
                    }
                    className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-bold hover:shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Unduh Template CSV</span>
                  </button>
                </div>

                {/* 2. File Input & Area */}
                <div className="flex flex-col gap-2">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider">
                    Pilih File CSV Hasil Edit Anda
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50/50 transition relative">
                    <input
                      type="file"
                      ref={teacherFileInputRef}
                      accept=".csv"
                      onChange={handleTeacherCSVUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-amber-50 rounded-full text-amber-500">
                        <UploadCloud size={24} />
                      </div>
                      <span className="font-bold text-slate-700 text-xs">
                        Klik di sini atau seret file CSV Anda
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        Mendukung file .csv dengan pemisah koma (,) atau
                        titik-koma (;)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notification Area */}
                {teacherImportError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2 max-w-full">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">
                      {teacherImportError}
                    </span>
                  </div>
                )}

                {teacherImportSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-800 flex items-start gap-2 max-w-full">
                    <CheckCircle size={15} className="shrink-0 mt-0.5" />
                    <span className="font-bold leading-relaxed">
                      {teacherImportSuccess}
                    </span>
                  </div>
                )}

                {/* 3. Preview Section */}
                {previewTeacherData.length > 0 && (
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-700 uppercase tracking-wider">
                        Pratinjau Data ({previewTeacherData.length} Baris
                        Terdeteksi)
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold leading-none text-right">
                        Sistem mendeteksi kecocokan username untuk menentukan
                        Tambah (+) atau Ubah (~).
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-2 w-16">Aksi</th>
                            <th className="px-3 py-2">Username</th>
                            <th className="px-3 py-2">Nama Lengkap</th>
                            <th className="px-3 py-2">
                              {importTeacherType === "homeroom"
                                ? "Kelas Bimbingan"
                                : "Mata Pelajaran"}
                            </th>
                            <th className="px-3 py-2 w-28">Password</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                          {previewTeacherData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2">
                                {row.isExisting ? (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">
                                    Update
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                                    Baru
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-900 font-semibold">
                                {row.username}
                              </td>
                              <td className="px-3 py-2 text-slate-900 font-bold">
                                {row.name}
                              </td>
                              <td className="px-3 py-2 text-slate-800">
                                {importTeacherType === "homeroom"
                                  ? row.className
                                  : row.subject}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-400">
                                {row.password ? (
                                  <span className="text-slate-700 font-semibold">
                                    {row.password}
                                  </span>
                                ) : (
                                  <span>(Default)</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsImportTeacherOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition shrink-0 cursor-pointer"
                >
                  Batal / Selesai
                </button>

                {previewTeacherData.length > 0 && (
                  <button
                    type="button"
                    disabled={isTeacherImporting}
                    onClick={handleExecuteTeacherImport}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-md text-white font-extrabold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isTeacherImporting ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <FileCheck size={13} />
                    )}
                    <span>
                      Proses &amp; Simpan {previewTeacherData.length} Baris Ini
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {/* MODAL SCANNER QR KAMERA */}
        {isQrScannerOpen && (
          <QRScannerModal
            students={students}
            onSelectStudentByNis={(nis) => {
              const matched = students.find(
                (s) => s.nis.toLowerCase() === nis.toLowerCase(),
              );
              if (matched) {
                setSelectedStudent(matched);
                setIsQrScannerOpen(false);
              }
            }}
            onClose={() => setIsQrScannerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16 no-print select-none">
        {/* Menu 1 (Home/Roster - paling kiri) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab("roster");
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${adminTab === "roster" ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
          >
            <Home
              size={20}
              className={
                adminTab === "roster" ? "stroke-[2.5px]" : "stroke-[1.8px]"
              }
            />
          </div>
          <span
            className={`text-[9.5px] leading-none ${adminTab === "roster" ? "text-indigo-650 font-bold" : "text-slate-400"}`}
          >
            Beranda
          </span>
        </button>

        {/* Menu 2 (Siswa) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab("student_mgmt");
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${adminTab === "student_mgmt" ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
          >
            <User
              size={20}
              className={
                adminTab === "student_mgmt"
                  ? "stroke-[2.5px]"
                  : "stroke-[1.8px]"
              }
            />
          </div>
          <span
            className={`text-[9.5px] leading-none ${adminTab === "student_mgmt" ? "text-indigo-650 font-bold" : "text-slate-400"}`}
          >
            Siswa
          </span>
        </button>

        {/* Menu 3 (Laporan) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab("laporan");
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${adminTab === "laporan" ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
          >
            <BarChart3
              size={20}
              className={
                adminTab === "laporan" ? "stroke-[2.5px]" : "stroke-[1.8px]"
              }
            />
          </div>
          <span
            className={`text-[9.5px] leading-none ${adminTab === "laporan" ? "text-indigo-650 font-bold" : "text-slate-400"}`}
          >
            Laporan
          </span>
        </button>

        {/* Menu 4 (Broadcast) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab("broadcast");
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${adminTab === "broadcast" ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
          >
            <BellRing
              size={20}
              className={
                adminTab === "broadcast" ? "stroke-[2.5px]" : "stroke-[1.8px]"
              }
            />
          </div>
          <span
            className={`text-[9.5px] leading-none ${adminTab === "broadcast" ? "text-indigo-650 font-bold" : "text-slate-400"}`}
          >
            Broadcast
          </span>
        </button>

        {/* Menu 5 (Lainnya - 4 kotak, paling kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu((prev) => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${showMoreMenu ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
          >
            <LayoutGrid
              size={20}
              className={showMoreMenu ? "stroke-[2.5px]" : "stroke-[1.8px]"}
            />
          </div>
          <span
            className={`text-[9.5px] leading-none ${showMoreMenu ? "text-indigo-650 font-bold" : "text-slate-400"}`}
          >
            Lainnya
          </span>
        </button>
      </div>

      {/* Slide-over menu bottom sheet overlay for "Lainnya" */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Menu Pendukung
                  </span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">
                    Akses Tambahan Admin Utama
                  </h4>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("alumni");
                    setSelectedStudent(null);
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-yellow-50 rounded-xl text-yellow-650 text-lg">
                    🎓
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Alumni (Lulusan)
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Pantau data alumni &amp; bantu penyelesaian tunggakan
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("student_qr");
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">
                    📇
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Cetak QR Kolektif
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Eksportir &amp; cetakan kartu QR identitas siswa massal
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("subject_teacher_mgmt");
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-650 text-lg">
                    📝
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Kelola Guru Mapel
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Kelola daftar penugasan guru pengampu mata pelajaran
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("homeroom_mgmt");
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">
                    🏫
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Kelola Wali Kelas
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Manajemen pembagian rombongan belajar kelas
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("mutasi");
                    setSelectedStudent(null);
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-orange-50 rounded-xl text-orange-600 text-lg">
                    🔁
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Siswa Mutasi
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Proses siswa keluar & kelola rekonsiliasi keuangannya
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("buku_induk");
                    setSelectedStudent(null);
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">
                    📗
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Buku Induk Kesiswaan
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Kelola dan ekspor-impor biodata lengkap serta portofolio
                      kesiswaan
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("pembayaran_lain");
                    setSelectedStudent(null);
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-blue-50 rounded-xl text-blue-600 text-lg">
                    💵
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      Pembayaran Lain-lain
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Daftar, buat, hapus &amp; kelola tagihan iuran insidental siswa
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab("config");
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-purple-50 rounded-xl text-purple-600 text-lg">
                    ⚙️
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">
                      WhatsApp &amp; Identitas
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Konfigurasi token gateway WhatsApp &amp; data lembaga
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout && onLogout();
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-rose-100 bg-rose-50/30 hover:bg-rose-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-rose-100 rounded-xl text-rose-600 text-lg">
                    🚪
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-rose-800">
                      Keluar Sistem
                    </h5>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-tight">
                      Keluar aman dari portal kontrol admin pusat
                    </p>
                  </div>
                </button>
              </div>

              {/* Quick access to download Mobile Apps in the bottom sheet menu */}
              <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  📲 Unduh Aplikasi Mobile Resmi
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Gunakan aplikasi mobile resmi untuk kemudahan akses monitor
                  laporan, setup admin, &amp; data lembaga langsung lewat HP.
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
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.apkUrl
                        ? "bg-emerald-50 hover:bg-emerald-105 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs"
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Smartphone
                      size={13}
                      className={
                        schoolIdentity?.apkUrl
                          ? "text-emerald-600 group-hover:scale-110 transition-transform"
                          : "text-slate-350"
                      }
                    />
                    <span className="text-[10px]">Android APK</span>
                  </a>

                  <a
                    href={schoolIdentity?.iosUrl || "#"}
                    target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.iosUrl) {
                        e.preventDefault();
                        alert(
                          "Link unduhan iOS belum diatur oleh Administrator.",
                        );
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.iosUrl
                        ? "bg-sky-50 hover:bg-sky-105 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs"
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Apple
                      size={13}
                      className={
                        schoolIdentity?.iosUrl
                          ? "text-sky-600 group-hover:scale-110 transition-transform"
                          : "text-slate-350"
                      }
                    />
                    <span className="text-[10px]">iOS Apple</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: Proses Mutasi Baru */}
      {isMutateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden text-slate-800 text-left font-sans"
          >
            <div className="bg-orange-600 text-white p-4.5">
              <h3 className="text-sm font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                <RefreshCw size={17} className="animate-spin-slow" />
                Borang Mutasi Siswa Keluar
              </h3>
              <p className="text-[11px] text-orange-100 mt-1">
                Isian berita acara pemindahan / berakhirnya pendaftaran siswa
                aktif di sekolah.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!mutateStudentId) {
                  setMutateError("Anda harus memilih siswa aktif!");
                  return;
                }
                if (!mutateDestination.trim()) {
                  setMutateError("Masukkan Sekolah Tujuan mutasi!");
                  return;
                }
                if (!mutateReason.trim()) {
                  setMutateError("Sebutkan alasan mutasi siswa!");
                  return;
                }

                setIsMutatingSubmit(true);
                setMutateError("");

                // Find student matching selected ID
                const stdToMutate = students.find(
                  (s) => s.id === mutateStudentId,
                );
                if (stdToMutate) {
                  const success = await onUpdateStudent(mutateStudentId, {
                    nis: stdToMutate.nis,
                    name: stdToMutate.name,
                    class: "Mutasi Keluar",
                    email: stdToMutate.email || "",
                    phone: stdToMutate.phone || "",
                    mutationDate: mutateDate,
                    mutationReason: mutateReason,
                    mutationDestination: mutateDestination,
                  });

                  if (success) {
                    setIsMutateModalOpen(false);
                    setMutateStudentId("");
                    setMutateReason("");
                    setMutateDestination("");
                    alert(
                      `Prosedur mutasi keluar untuk siswa ${stdToMutate.name} berhasil dibukukan.`,
                    );
                  } else {
                    setMutateError(
                      "Gagal mengirimkan pembaruan status ke server.",
                    );
                  }
                } else {
                  setMutateError("Siswa tidak ditemukan.");
                }
                setIsMutatingSubmit(false);
              }}
              className="p-5 flex flex-col gap-4"
            >
              {mutateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 leading-tight">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{mutateError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Pilih Siswa Aktif
                </label>
                <select
                  value={mutateStudentId}
                  onChange={(e) => setMutateStudentId(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-150 focus:border-orange-500 hover:border-slate-300 font-semibold rounded-xl text-xs bg-white text-slate-800"
                  required
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students
                    .filter(
                      (s) =>
                        !s.class ||
                        (s.class.toLowerCase() !== "lulus" &&
                          s.class.toLowerCase() !== "lulusan" &&
                          s.class.toLowerCase() !== "mutasi" &&
                          s.class.toLowerCase() !== "mutasi keluar"),
                    )
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class}) - NIS: {s.nis}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Tanggal Mutasi Keluar
                </label>
                <input
                  type="date"
                  value={mutateDate}
                  onChange={(e) => setMutateDate(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-150 focus:border-orange-500 font-semibold rounded-xl text-xs text-slate-800 bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Sekolah Tujuan / Penerima
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SMP Negeri 2 Pandaan"
                  value={mutateDestination}
                  onChange={(e) => setMutateDestination(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-150 focus:border-orange-500 font-semibold rounded-xl text-xs text-slate-800 placeholder-slate-400 bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Alasan Mutasi
                </label>
                <textarea
                  placeholder="Tulis alasan kepindahan, contoh: Mengikuti kepindahan domisili orang tua ke Malang..."
                  value={mutateReason}
                  onChange={(e) => setMutateReason(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-150 focus:border-orange-500 font-semibold rounded-xl text-xs text-slate-800 placeholder-slate-400 min-h-[75px] bg-white"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={() => setIsMutateModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition-all text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isMutatingSubmit}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-extrabold text-xs cursor-pointer transition-all text-center uppercase tracking-wider disabled:opacity-50"
                >
                  {isMutatingSubmit ? "Memproses..." : "Proses Mutasi 🔁"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// INDONESIAN TYPOGRAPHY & LEDGER RECONCILIATIONS HELPERS
// ==========================================

function formatIndonesianTimestamp(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hour}:${min} WIB`;
  } catch (err) {
    return dateStr;
  }
}

function wordifyAmount(nominal: number): string {
  const words = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];
  if (nominal < 12) {
    return words[nominal];
  } else if (nominal < 20) {
    return wordifyAmount(nominal - 10) + " belas";
  } else if (nominal < 100) {
    return (
      wordifyAmount(Math.floor(nominal / 10)) +
      " puluh " +
      wordifyAmount(nominal % 10)
    );
  } else if (nominal < 200) {
    return "seratus " + wordifyAmount(nominal - 100);
  } else if (nominal < 1000) {
    return (
      wordifyAmount(Math.floor(nominal / 100)) +
      " ratus " +
      wordifyAmount(nominal % 100)
    );
  } else if (nominal < 2000) {
    return "seribu " + wordifyAmount(nominal - 1000);
  } else if (nominal < 1000000) {
    return (
      wordifyAmount(Math.floor(nominal / 1000)) +
      " ribu " +
      wordifyAmount(nominal % 1000)
    );
  } else if (nominal < 1000000000) {
    return (
      wordifyAmount(Math.floor(nominal / 1000000)) +
      " juta " +
      wordifyAmount(nominal % 1000000)
    );
  }
  return nominal.toString();
}

function indonesianWordsForRupiah(num: number): string {
  const cleanVal = Math.floor(Math.abs(num));
  if (cleanVal === 0) return "Nol Rupiah";
  const str = wordifyAmount(cleanVal).trim().replace(/\s+/g, " ");
  return str.substring(0, 1).toUpperCase() + str.substring(1) + " Rupiah";
}
