import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, SppBill, SavingsTransaction, SchoolIdentity, HomeroomTeacher, SubjectTeacher } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, BookOpen, Users, Banknote, BellRing, Settings, CheckCircle, Smartphone, User, RefreshCw, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck, Zap, GraduationCap, Check, AlertCircle, Printer, TrendingUp, BarChart3, FileText, Calendar, FileCheck, ImageIcon, UploadCloud, Search, Trash2, Edit, ClipboardCheck, Download, ShoppingCart, X, Camera, Lock, Key, Home, LayoutGrid } from 'lucide-react';
import StudentManagement from './StudentManagement';
import QRScannerModal from './QRScannerModal';
import QRCode from 'qrcode';

// Component for rendering beautifully styled, local QR Codes without API dependancy
function StudentQrCode({ text, size = 140 }: { text: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(text, {
      margin: 1,
      width: size,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => console.error('Error in scanning StudentQrCode:', err));

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
  midtransStatus: { merchantId: string; clientKey: string; hasServerKey: boolean; isProduction: boolean; adminFee?: number; systemMaintenanceFee?: number; chargeFeesToUser?: boolean } | null;
  onPaySppManual: (billId: string) => Promise<any>;
  onCancelSppManual?: (billId: string) => Promise<any>;
  onPaySppViaMidtrans?: (bill: SppBill) => Promise<void>;
  adminSppBillToPrint?: string | null;
  onClearAdminSppBillToPrint?: () => void;
  onDepositSavingsViaMidtrans?: (amount: number, studentId?: string) => Promise<void>;
  adminSavingsToPrint?: { studentId: string; orderId: string; amount: number } | null;
  onClearAdminSavingsToPrint?: () => void;
  onSavingsManual: (studentId: string, type: 'deposit' | 'withdrawal', amount: number, notes: string) => Promise<any>;
  onConfirmWithdrawal?: (transactionId: string, action: 'approve' | 'reject') => Promise<boolean>;
  onBulkWithdrawSavings?: (grade: string, amount: number, notes: string, allowDebt: boolean) => Promise<any>;
  onBroadcastNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'payment') => Promise<boolean>;
  onRefresh: () => void;
  onCreateStudent: (data: { nis: string; name: string; class: string; email: string; phone: string; initialSavings: number }) => Promise<boolean>;
  onUpdateStudent: (id: string, data: { nis: string; name: string; class: string; email: string; phone: string }) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onImportStudents: (list: Array<{ nis: string; name: string; class: string; email: string; phone: string; initialSavings: number }>) => Promise<{ success: boolean; addedCount: number; updatedCount: number }>;
  onImportTeachers?: (
    homerooms: Array<{ username: string; name: string; className: string; password?: string }>,
    subjectTeachers: Array<{ username: string; name: string; subject: string; password?: string }>
  ) => Promise<{ success: boolean; homeroomsAdded: number; homeroomsUpdated: number; subjectsAdded: number; subjectsUpdated: number }>;
  schoolIdentity?: SchoolIdentity;
  onUpdateSchoolIdentity?: (updatedData: Partial<SchoolIdentity>) => Promise<boolean>;
  homerooms?: HomeroomTeacher[];
  onCreateHomeroom?: (data: { username: string; name: string; className: string; password?: string }) => Promise<boolean>;
  onUpdateHomeroom?: (id: string, data: { username?: string; name?: string; className?: string; password?: string }) => Promise<boolean>;
  onDeleteHomeroom?: (id: string) => Promise<boolean>;
  subjectTeachers?: SubjectTeacher[];
  onCreateSubjectTeacher?: (data: { username: string; name: string; subject: string; password?: string }) => Promise<boolean>;
  onUpdateSubjectTeacher?: (id: string, data: { username?: string; name?: string; subject?: string; password?: string }) => Promise<boolean>;
  onDeleteSubjectTeacher?: (id: string) => Promise<boolean>;
  onAutoGenerateSubjectTeachers?: () => Promise<boolean>;
  onLogout?: () => void;
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
  onLogout
}: AdminPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adminTab, setAdminTab] = useState<'roster' | 'broadcast' | 'config' | 'student_mgmt' | 'laporan' | 'homeroom_mgmt' | 'subject_teacher_mgmt' | 'student_qr'>('roster');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Batch Import Teacher states
  const [isImportTeacherOpen, setIsImportTeacherOpen] = useState(false);
  const [importTeacherType, setImportTeacherType] = useState<'homeroom' | 'subject'>('homeroom');
  const [teacherImportError, setTeacherImportError] = useState<string | null>(null);
  const [teacherImportSuccess, setTeacherImportSuccess] = useState<string | null>(null);
  const [previewTeacherData, setPreviewTeacherData] = useState<any[]>([]);
  const [isTeacherImporting, setIsTeacherImporting] = useState(false);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTeacherTemplate = (type: 'homeroom' | 'subject') => {
    let headers = "";
    let rows: string[] = [];
    let filename = "";
    
    if (type === 'homeroom') {
      headers = "username,nama,kelas,password\n";
      rows = [
        "sitiaminah,Ibu Siti Aminah S.Pd,7-A,wali1234",
        "bambang_8a,Drs. Bambang Harianto,8-A,",
        "wardah,Ustadzah Wardah M.Pd,9-B,pancasilaku"
      ];
      filename = "template_import_wali_kelas.csv";
    } else {
      headers = "username,nama,mapel,password\n";
      rows = [
        "budis,Budi Santoso S.Pd,Matematika,mat123",
        "aisyah_bi,Aisyah Putri S.Pd,Bahasa Inggris,",
        "fauzi_ipa,Ahmad Fauzi S.Si,IPA,merdeka1"
      ];
      filename = "template_import_guru_mapel.csv";
    }

    const blob = new Blob([headers + rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
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
          setTeacherImportError('File kosong atau rusak.');
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setTeacherImportError('File CSV minimal harus berisi header & satu baris data.');
          return;
        }

        const clean = (val: string) => (val || "").replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim();

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = firstLine.split(delimiter).map(h => clean(h).toLowerCase());

        const usernameIdx = headers.findIndex(h => h.includes('user') || h.includes('id') || h.includes('nama_pengguna'));
        const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('lengkap'));
        const passwordIdx = headers.findIndex(h => h.includes('pass') || h.includes('sandi') || h.includes('kunci'));

        let classIdx = -1;
        let subjectIdx = -1;

        if (importTeacherType === 'homeroom') {
          classIdx = headers.findIndex(h => h.includes('kelas') || h.includes('class') || h.includes('bimbingan'));
          if (usernameIdx === -1 || nameIdx === -1 || classIdx === -1) {
            setTeacherImportError('Format kolom CSV Wali Kelas salah! Pastikan ada kolom "username", "nama", dan "kelas".');
            return;
          }
        } else {
          subjectIdx = headers.findIndex(h => h.includes('mapel') || h.includes('subject') || h.includes('mata') || h.includes('pelajaran'));
          if (usernameIdx === -1 || nameIdx === -1 || subjectIdx === -1) {
            setTeacherImportError('Format kolom CSV Guru Mapel salah! Pastikan ada kolom "username", "nama", dan "mapel".');
            return;
          }
        }

        const parsedRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(delimiter).map(c => clean(c));
          if (cols.length < 3) continue;

          const userVal = cols[usernameIdx];
          const nameVal = cols[nameIdx];
          const passVal = passwordIdx !== -1 ? cols[passwordIdx] : '';

          if (!userVal || !nameVal) continue;

          if (importTeacherType === 'homeroom') {
            const classVal = cols[classIdx];
            if (!classVal) continue;

            const isExist = homerooms.some(h => h.username.toLowerCase().trim() === userVal.toLowerCase().trim());
            parsedRows.push({
              username: userVal.trim().toLowerCase().replace(/\s+/g, ''),
              name: nameVal.trim(),
              className: classVal.trim(),
              password: passVal.trim() || undefined,
              isExisting: isExist
            });
          } else {
            const subVal = cols[subjectIdx];
            if (!subVal) continue;

            const isExist = subjectTeachers.some(h => h.username.toLowerCase().trim() === userVal.toLowerCase().trim());
            parsedRows.push({
              username: userVal.trim().toLowerCase().replace(/\s+/g, ''),
              name: nameVal.trim(),
              subject: subVal.trim(),
              password: passVal.trim() || undefined,
              isExisting: isExist
            });
          }
        }

        if (parsedRows.length === 0) {
          setTeacherImportError('Tidak ada data yang valid untuk diimport.');
          return;
        }

        setPreviewTeacherData(parsedRows);
      } catch (err) {
        console.error(err);
        setTeacherImportError('Gagal memproses file CSV.');
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
      const homeroomsToImport = importTeacherType === 'homeroom' ? previewTeacherData : [];
      const subjectsToImport = importTeacherType === 'subject' ? previewTeacherData : [];

      const resp = await onImportTeachers(homeroomsToImport, subjectsToImport);
      if (resp.success) {
        setTeacherImportSuccess(
          `Selesai! Wali Kelas: +${resp.homeroomsAdded} baru, ~${resp.homeroomsUpdated} diperbarui. Guru Mapel: +${resp.subjectsAdded} baru, ~${resp.subjectsUpdated} diperbarui.`
        );
        setPreviewTeacherData([]);
        onRefresh();
      } else {
        setTeacherImportError('Gagal mengunggah data import ke server.');
      }
    } catch (err) {
      setTeacherImportError('Terjadi kegagalan koneksi saat import.');
    } finally {
      setIsTeacherImporting(false);
    }
  };

  // Student QR card system states
  const [studentQrSearch, setStudentQrSearch] = useState('');
  const [studentQrClassFilter, setStudentQrClassFilter] = useState('all');
  const [qrCardsToPrint, setQrCardsToPrint] = useState<Student[] | null>(null);
  const [downloadingCollectiveQr, setDownloadingCollectiveQr] = useState(false);
  const [collectiveQrProgress, setCollectiveQrProgress] = useState(0);
  const [collectiveQrTotal, setCollectiveQrTotal] = useState(0);

  // Firebase/Cloud Sync States
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error("Gagal mengambil status sistem:", err);
    }
  };

  useEffect(() => {
    if (adminTab === 'config') {
      fetchSystemStatus();
      const interval = setInterval(fetchSystemStatus, 6000);
      return () => clearInterval(interval);
    }
  }, [adminTab]);

  const handleForceSync = async () => {
    setIsSyncingLive(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/force-firestore-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback("✔️ Sinkronisasi sukses! Semua koleksi terbaru telah disalin ke Firebase Firestore.");
        fetchSystemStatus();
        onRefresh();
      } else {
        setSyncFeedback(`⚠️ Gagal menyinkronkan: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      setSyncFeedback("⚠️ Galat koneksi saat mengirim permintaan sinkronisasi.");
    } finally {
      setIsSyncingLive(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const query = studentSearch.toLowerCase().trim();
    return students.filter(
      (s) => s.name.toLowerCase().includes(query) || s.nis.toLowerCase().includes(query)
    );
  }, [students, studentSearch]);

  const uniqueClasses = useMemo(() => {
    const cls = new Set<string>();
    students.forEach((s) => {
      if (s.class) {
        cls.add(s.class);
      }
    });
    return Array.from(cls).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null);

  // Manual payment cancellation/void states
  const [billToCancel, setBillToCancel] = useState<SppBill | null>(null);
  const [isCancelProcessing, setIsCancelProcessing] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  const pendingWithdrawals = useMemo(() => {
    return transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  }, [transactions]);

  // Bulk Savings Withdrawal States
  const [isBulkWithdrawOpen, setIsBulkWithdrawOpen] = useState(false);
  const [bulkGrade, setBulkGrade] = useState<'7' | '8' | '9'>('7');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkAllowDebt, setBulkAllowDebt] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ success: boolean; message: string; successCount?: number; totalDeducted?: number; skippedCount?: number } | null>(null);

  // Printing & Receipt States
  const [printId, setPrintId] = useState<string | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{ type: 'spp' | 'savings' | 'consolidated'; detail: any; student: Student } | null>(null);
  const [reportToPrint, setReportToPrint] = useState<'harian' | 'rekap-spp' | 'rekap-tabungan' | null>(null);
  
  // Student financial subtabs inside roster
  const [studentDetailTab, setStudentDetailTab] = useState<'spp' | 'savings'>('spp');

  // Homeroom & Subject Teacher mgmt states
  const [editingHomeroomId, setEditingHomeroomId] = useState<string | null>(null);
  const [editingSubjectTeacherId, setEditingSubjectTeacherId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formClassName, setFormClassName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [mgmtError, setMgmtError] = useState<string | null>(null);
  const [mgmtSuccess, setMgmtSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setEditingHomeroomId(null);
    setEditingSubjectTeacherId(null);
    setFormName('');
    setFormClassName('');
    setFormSubject('');
    setFormUsername('');
    setFormPassword('');
    setMgmtError(null);
    setMgmtSuccess(null);
  };

  // Payment Summary / Shopping Cart States
  const [paymentCart, setPaymentCart] = useState<Array<{
    id: string;
    type: 'spp' | 'savings_deposit';
    student: Student;
    amount: number;
    billId?: string;
    month?: string;
    year?: number;
    notes?: string;
  }>>([]);
  const [processingCart, setProcessingCart] = useState(false);

  // Helper to determine active / inactive state of an SPP bill (for Admin/Cashier)
  const checkIsBillActive = (bill: SppBill, studentId: string) => {
    const studentBills = bills.filter(b => b.studentId === studentId);
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

    // 2. If it is a future month, check if all bills strictly prior are paid
    const priorBills = studentBills.filter(b => {
      const bMonthIdx = MONTH_MAP[b.month] !== undefined ? MONTH_MAP[b.month] : 0;
      const bScore = b.year * 12 + bMonthIdx;
      return bScore < billScore;
    });

    return priorBills.every(b => b.status === 'paid');
  };

  const addToCartSpp = (bill: SppBill, student: Student) => {
    if (!checkIsBillActive(bill, student.id)) {
      alert(`Peringatan: Tagihan SPP ${bill.month} ${bill.year} belum aktif karena SPP bulan berjalan belum lunas.`);
      return;
    }
    if (paymentCart.some(item => item.type === 'spp' && item.billId === bill.id)) {
      alert(`SPP ${bill.month} ${bill.year} untuk ${student.name} sudah ada di dalam ringkasan keranjang belanja!`);
      return;
    }
    const newItem = {
      id: `cart-spp-${bill.id}`,
      type: 'spp' as const,
      student,
      amount: bill.amount,
      billId: bill.id,
      month: bill.month,
      year: bill.year
    };
    setPaymentCart(prev => [...prev, newItem]);
  };

  const addToCartSavings = (amount: number, notes: string, student: Student) => {
    if (amount <= 0 || isNaN(amount)) {
      alert("Masukkan nominal setoran tabungan yang valid!");
      return;
    }
    const newItem = {
      id: `cart-savings-${student.id}-${Date.now()}`,
      type: 'savings_deposit' as const,
      student,
      amount,
      notes: notes || 'Setoran Tabungan'
    };
    setPaymentCart(prev => [...prev, newItem]);
    alert(`Setoran tabungan sebesar Rp ${amount.toLocaleString('id-ID')} ditambahkan ke keranjang.`);
  };

  const removeFromCart = (cartItemId: string) => {
    setPaymentCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const handleProcessCartCheckout = async () => {
    if (paymentCart.length === 0) return;
    setProcessingCart(true);
    try {
      const executedItems: Array<{ name: string; amount: number; desc: string }> = [];
      
      for (const item of paymentCart) {
        if (item.type === 'spp' && item.billId) {
          const resBill = await onPaySppManual(item.billId);
          if (resBill) {
            executedItems.push({
              name: `SPP Bulanan - ${item.month} ${item.year}`,
              amount: item.amount,
              desc: `Siswa: ${item.student.name} (Kelas ${item.student.class})`
            });
          }
        } else if (item.type === 'savings_deposit') {
          const resTx = await onSavingsManual(item.student.id, 'deposit', item.amount, item.notes || 'Setoran Tabungan');
          if (resTx) {
            executedItems.push({
              name: `Setoran Tabungan Manual`,
              amount: item.amount,
              desc: `Siswa: ${item.student.name} • Memo: "${item.notes || 'Setoran'}"`
            });
          }
        }
      }
      
      if (executedItems.length > 0) {
        const totalAmount = executedItems.reduce((sum, item) => sum + item.amount, 0);
        const orderId = `COLLECTIVE-CART-${Date.now()}`;
        
        setReceiptToPrint({
          type: 'consolidated',
          detail: {
            id: orderId,
            amount: totalAmount,
            items: executedItems,
            paidAt: new Date().toISOString(),
            paymentMethod: 'Manual Teller (Kolektif)'
          },
          student: paymentCart[0].student
        });
        setPrintId('print-receipt-section');
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

  // Laporan & Rekap states
  const [activeReportSubTab, setActiveReportSubTab] = useState<'harian' | 'rekap-spp' | 'rekap-tabungan'>('harian');
  const [currentDateFilter, setCurrentDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rekapSppGradeFilter, setRekapSppGradeFilter] = useState<string>('all');
  const [rekapSppYearFilter, setRekapSppYearFilter] = useState<string>('all');

  const getAcademicYearOfBill = (bill: SppBill) => {
    const startYear = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(bill.month)
      ? bill.year
      : bill.year - 1;
    return `${startYear}/${startYear + 1}`;
  };

  const academicYears = useMemo(() => {
    const years = Array.from(new Set(bills.map(getAcademicYearOfBill)));
    return years.sort((a, b) => b.localeCompare(a)); // Sort latest first
  }, [bills]);

  useEffect(() => {
    if (academicYears.length > 0 && rekapSppYearFilter === 'all') {
      setRekapSppYearFilter(academicYears[0]);
    }
  }, [academicYears]);

  // Listen to print completion to reset print state
  React.useEffect(() => {
    const handleAfterPrint = () => {
      setPrintId(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Listen for successful Midtrans callback to automatically select the student and prepare receipt for printing!
  useEffect(() => {
    if (adminSppBillToPrint) {
      const billToPrint = bills.find(b => b.id === adminSppBillToPrint);
      if (billToPrint) {
        const student = students.find(s => s.id === billToPrint.studentId);
        if (student) {
          setSelectedStudent(student);
          setReceiptToPrint({
            type: 'spp',
            detail: {
              ...billToPrint,
              status: 'paid'
            },
            student: student
          });
          setPrintId('print-receipt-section');
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
      const txToPrint = transactions.find(t => t.orderId === orderId) || {
        id: orderId,
        studentId,
        type: 'deposit',
        amount,
        status: 'success',
        paymentMethod: 'Midtrans Web',
        notes: 'Setoran Tabungan via Midtrans',
        createdAt: new Date().toISOString()
      };
      const student = students.find(s => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        setReceiptToPrint({
          type: 'savings',
          detail: txToPrint,
          student: student
        });
        setPrintId('print-receipt-section');
      }
      if (onClearAdminSavingsToPrint) {
        onClearAdminSavingsToPrint();
      }
    }
  }, [adminSavingsToPrint, transactions, students, onClearAdminSavingsToPrint]);
  
  // Loading and feedback states for automation actions
  const [processingBillId, setProcessingBillId] = useState<string | null>(null);

  // Manual Transaction States
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNotes, setTxNotes] = useState<string>('');
  const [txProcessing, setTxProcessing] = useState(false);

  // Broadcast States
  const [notifTitle, setNotifTitle] = useState<string>('');
  const [notifMessage, setNotifMessage] = useState<string>('');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warning' | 'payment'>('info');
  const [broadcastProcessing, setBroadcastProcessing] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !txAmount) return;
    const amount = Number(txAmount);
    if (isNaN(amount) || amount <= 0) return;

    setTxProcessing(true);
    const resultTx = await onSavingsManual(selectedStudent.id, txType, amount, txNotes);
    setTxProcessing(false);

    if (resultTx) {
      setTxAmount('');
      setTxNotes('');
      // Update selectedStudent balance locally for instantaneous visual update
      const updatedS = { ...selectedStudent };
      if (txType === 'deposit') {
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
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'Manual Teller',
        notes: txNotes || (txType === 'deposit' ? 'Setoran manual pihak sekolah' : 'Tarik tunai manual')
      };

      setReceiptToPrint({
        type: 'savings',
        detail: printTx,
        student: updatedS
      });
      setPrintId('print-receipt-section');
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;

    setBroadcastProcessing(true);
    const success = await onBroadcastNotification(notifTitle, notifMessage, notifType);
    setBroadcastProcessing(false);

    if (success) {
      setNotifTitle('');
      setNotifMessage('');
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    }
  };

  // SPP Rates Config States
  const [sppConfigRates, setSppConfigRates] = useState({ grade7: 150000, grade8: 155000, grade9: 160000 });
  const [isSavingSppRates, setIsSavingSppRates] = useState(false);
  const [updateExistingUnpaidBills, setUpdateExistingUnpaidBills] = useState(true);
  const [sppConfigMsg, setSppConfigMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Treasurer Account credentials security states
  const [adminTreasurerPasswordInput, setAdminTreasurerPasswordInput] = useState('');
  const [treasurerActionMsg, setTreasurerActionMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isOperatingTreasurerPwd, setIsOperatingTreasurerPwd] = useState(false);

  // Principal/Kepala Sekolah Account credentials security states
  const [adminPrincipalPasswordInput, setAdminPrincipalPasswordInput] = useState('');
  const [principalActionMsg, setPrincipalActionMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isOperatingPrincipalPwd, setIsOperatingPrincipalPwd] = useState(false);

  // Midtrans Gateways & Fees States
  const [adminFeeInput, setAdminFeeInput] = useState<number>(4000);
  const [systemMaintenanceFeeInput, setSystemMaintenanceFeeInput] = useState<number>(1500);
  const [chargeFeesToUserChecked, setChargeFeesToUserChecked] = useState<boolean>(true);
  const [isSavingFees, setIsSavingFees] = useState<boolean>(false);
  const [savingFeesMsg, setSavingFeesMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [midtransMerchantIdInput, setMidtransMerchantIdInput] = useState<string>('');
  const [midtransClientKeyInput, setMidtransClientKeyInput] = useState<string>('');
  const [midtransServerKeyInput, setMidtransServerKeyInput] = useState<string>('');
  const [midtransIsProduction, setMidtransIsProduction] = useState<boolean>(false);

  React.useEffect(() => {
    if (midtransStatus) {
      if (midtransStatus.adminFee !== undefined) setAdminFeeInput(midtransStatus.adminFee);
      if (midtransStatus.systemMaintenanceFee !== undefined) setSystemMaintenanceFeeInput(midtransStatus.systemMaintenanceFee);
      if (midtransStatus.chargeFeesToUser !== undefined) setChargeFeesToUserChecked(midtransStatus.chargeFeesToUser);
      if (midtransStatus.merchantId !== undefined) setMidtransMerchantIdInput(midtransStatus.merchantId);
      if (midtransStatus.clientKey !== undefined) setMidtransClientKeyInput(midtransStatus.clientKey);
      if (midtransStatus.isProduction !== undefined) setMidtransIsProduction(midtransStatus.isProduction);
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
  const [schoolStamp, setSchoolStamp] = useState("");
  const [isSavingSchoolIdentity, setIsSavingSchoolIdentity] = useState(false);
  const [schoolIdentityMsg, setSchoolIdentityMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      setSchoolStamp(schoolIdentity.schoolStamp || "");
      if (schoolIdentity.sppRates) {
        setSppConfigRates(schoolIdentity.sppRates);
      }
    }
  }, [schoolIdentity]);

  // Kenaikan Kelas & Tahun Ajaran Baru States
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isActivatingYear, setIsActivatingYear] = useState(false);
  const [activatingYearMessage, setActivatingYearMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [newYearInput, setNewYearInput] = useState('2026');

  // Class Promotion massal handler
  const handlePromoteClasses = async () => {
    if (!window.confirm("⚠️ APAKAH ANDA YAKIN?\n\nTindakan ini akan menaikkan kelas semua siswa secara otomatis:\n- Kelas 7 -> Kelas 8\n- Kelas 8 -> Kelas 9\n- Kelas 9 -> Lulus\n\nProses ini tidak dapat dibatalkan (irreversible). Lanjutkan?")) {
      return;
    }
    
    setIsPromoting(true);
    setPromotionMessage(null);
    try {
      const res = await fetch('/api/admin/students/promote-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromotionMessage({
          type: 'success',
          text: `🎉 Sukses! Kenaikan kelas massal selesai. ${data.promotedCount} siswa naik kelas, dan ${data.graduatedCount} siswa kelas 9 berhasil dinyatakan Lulus.`
        });
        onRefresh();
      } else {
        setPromotionMessage({ type: 'error', text: data.error || 'Gagal memproses kenaikan kelas.' });
      }
    } catch (err) {
      console.error(err);
      setPromotionMessage({ type: 'error', text: 'Koneksi gagal. Silakan coba lagi.' });
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

    if (!window.confirm(`⚠️ AKTIFKAN TAHUN AJARAN ${yearNum}/${yearNum + 1}?\n\nTindakan ini akan mengaktifkan tahun ajaran baru dan menghasilkan 12 bulan tagihan SPP untuk semua siswa aktif yang belum lulus.\n\nLanjutkan?`)) {
      return;
    }

    setIsActivatingYear(true);
    setActivatingYearMessage(null);
    try {
      const res = await fetch('/api/admin/activate-academic-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startYear: yearNum })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActivatingYearMessage({
          type: 'success',
          text: `🎉 Sukses! Tahun Ajaran ${yearNum}/${yearNum + 1} aktif. Menghasilkan ${data.billsGenerated} lembar tagihan baru bagi seluruh siswa.`
        });
        onRefresh();
      } else {
        setActivatingYearMessage({ type: 'error', text: data.error || 'Gagal mengaktifkan tahun ajaran baru.' });
      }
    } catch (err) {
      console.error(err);
      setActivatingYearMessage({ type: 'error', text: 'Koneksi gagal. Silakan coba lagi.' });
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
  const [waConfigMsg, setWaConfigMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // WhatsApp Test States
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestMsg, setWaTestMsg] = useState("Halo! Ini adalah uji coba transmisi pesan notifikasi WhatsApp Gateway SMP Maarif NU Pandaan. Integrasi sukses.");
  const [waTesting, setWaTesting] = useState(false);
  const [waTestFeedback, setWaTestFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const fetchWaConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp-config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.whatsappConfig) {
          setWaToken(data.whatsappConfig.token || "");
          setWaSender(data.whatsappConfig.sender || "");
          setWaProvider(data.whatsappConfig.provider || "Fonnte");
          setWaBaseUrl(data.whatsappConfig.baseUrl || "https://api.fonnte.com/send");
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
      const res = await fetch('/api/admin/set-whatsapp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: waToken,
          sender: waSender,
          provider: waProvider,
          baseUrl: waBaseUrl,
          enabled: waEnabled,
          notifyOnBilling: waNotifyOnBilling,
          notifyOnPayment: waNotifyOnPayment,
          notifyOnSavings: waNotifyOnSavings
        })
      });
      if (res.ok) {
        setWaConfigMsg({ type: 'success', text: '🎉 Konfigurasi WhatsApp API berhasil disimpan dan disimpan ke memori server!' });
      } else {
        setWaConfigMsg({ type: 'error', text: 'Gagal memperbarui konfigurasi WhatsApp.' });
      }
    } catch (err) {
      console.error(err);
      setWaConfigMsg({ type: 'error', text: 'Kendala jaringan saat menyimpan konfigurasi.' });
    } finally {
      setIsSavingWaConfig(false);
    }
  };

  const handleTestWa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waTestPhone) {
      setWaTestFeedback({ success: false, text: "Mohon isi nomor telepon tujuan terlebih dahulu." });
      return;
    }
    setWaTesting(true);
    setWaTestFeedback(null);
    try {
      const res = await fetch('/api/admin/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: waTestPhone,
          message: waTestMsg
        })
      });
      const data = await res.json();
      if (data.success) {
        setWaTestFeedback({ success: true, text: data.message });
      } else {
        setWaTestFeedback({ success: false, text: data.message });
      }
    } catch (err) {
      console.error(err);
      setWaTestFeedback({ success: false, text: "Gagal terhubung ke host server tester." });
    } finally {
      setWaTesting(false);
    }
  };

  const fetchSppConfig = async () => {
    try {
      const res = await fetch('/api/admin/spp-config');
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
    if (adminTab === 'config') {
      fetchSppConfig();
      fetchWaConfig();
    }
  }, [adminTab]);

  const handleSaveSppRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSppRates(true);
    setSppConfigMsg(null);
    try {
      const res = await fetch('/api/admin/set-spp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grade7: sppConfigRates.grade7,
          grade8: sppConfigRates.grade8,
          grade9: sppConfigRates.grade9,
          updateExistingUnpaid: updateExistingUnpaidBills
        })
      });
      if (res.ok) {
        setSppConfigMsg({ type: 'success', text: '🎉 Konfigurasi SPP berhasil disimpan dan disesuaikan ke tagihan unpaid aktif.' });
        onRefresh(); // Trigger refresh on bills on the client
      } else {
        setSppConfigMsg({ type: 'error', text: 'Gagal memperbarui konfigurasi SPP.' });
      }
    } catch (err) {
      console.error(err);
      setSppConfigMsg({ type: 'error', text: 'Koneksi gagal. Silakan coba lagi.' });
    } finally {
      setIsSavingSppRates(false);
    }
  };

  const handleAdminUpdateTreasurerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTreasurerPasswordInput.trim()) {
      setTreasurerActionMsg({ type: 'error', text: 'Password sandi baru tidak boleh kosong.' });
      return;
    }
    if (adminTreasurerPasswordInput.trim().length < 5) {
      setTreasurerActionMsg({ type: 'error', text: 'Password minimal 5 karakter.' });
      return;
    }
    setIsOperatingTreasurerPwd(true);
    setTreasurerActionMsg(null);
    try {
      const res = await fetch('/api/admin/treasurer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: adminTreasurerPasswordInput.trim() })
      });
      if (res.ok) {
        setTreasurerActionMsg({ type: 'success', text: 'Sandi Bendahara berhasil diperbarui secara aman!' });
        setAdminTreasurerPasswordInput('');
      } else {
        const d = await res.json();
        setTreasurerActionMsg({ type: 'error', text: d.error || 'Gagal mengubah sandi Bendahara.' });
      }
    } catch {
      setTreasurerActionMsg({ type: 'error', text: 'Gangguan jaringan/server.' });
    } finally {
      setIsOperatingTreasurerPwd(false);
    }
  };

  const handleAdminResetTreasurerPassword = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menyetel ulang sandi Bendahara kembali ke bawaan default (bendahara123)?')) {
      return;
    }
    setIsOperatingTreasurerPwd(true);
    setTreasurerActionMsg(null);
    try {
      const res = await fetch('/api/admin/treasurer/reset-password', {
        method: 'POST'
      });
      if (res.ok) {
        setTreasurerActionMsg({ type: 'success', text: 'Sandi Bendahara sukses di-reset ke bawaan default: bendahara123' });
      } else {
        const d = await res.json();
        setTreasurerActionMsg({ type: 'error', text: d.error || 'Gagal melakukan reset sandi.' });
      }
    } catch {
      setTreasurerActionMsg({ type: 'error', text: 'Gangguan komunikasi dengan server.' });
    } finally {
      setIsOperatingTreasurerPwd(false);
    }
  };

  const handleAdminUpdatePrincipalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPrincipalPasswordInput.trim()) {
      setPrincipalActionMsg({ type: 'error', text: 'Sandi baru tidak boleh kosong.' });
      return;
    }
    if (adminPrincipalPasswordInput.trim().length < 5) {
      setPrincipalActionMsg({ type: 'error', text: 'Password minimal 5 karakter.' });
      return;
    }
    setIsOperatingPrincipalPwd(true);
    setPrincipalActionMsg(null);
    try {
      const res = await fetch('/api/admin/principal/change-password', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ newPassword: adminPrincipalPasswordInput.trim() })
      });
      if (res.ok) {
         setPrincipalActionMsg({ type: 'success', text: 'Sandi Kepala Sekolah berhasil diperbarui secara aman!' });
         setAdminPrincipalPasswordInput('');
      } else {
         const d = await res.json();
         setPrincipalActionMsg({ type: 'error', text: d.error || 'Gagal mengubah sandi Kepala Sekolah.' });
      }
    } catch {
       setPrincipalActionMsg({ type: 'error', text: 'Gangguan jaringan/server.' });
    } finally {
       setIsOperatingPrincipalPwd(false);
    }
  };

  const handleAdminResetPrincipalPassword = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menyetel ulang sandi Kepala Sekolah kembali ke bawaan default (kepala123)?')) {
      return;
    }
    setIsOperatingPrincipalPwd(true);
    setPrincipalActionMsg(null);
    try {
      const res = await fetch('/api/admin/principal/reset-password', {
        method: 'POST'
      });
      if (res.ok) {
        setPrincipalActionMsg({ type: 'success', text: 'Sandi Kepala Sekolah sukses di-reset ke bawaan default: kepala123' });
      } else {
        const d = await res.json();
        setPrincipalActionMsg({ type: 'error', text: d.error || 'Gagal melakukan reset sandi.' });
      }
    } catch {
      setPrincipalActionMsg({ type: 'error', text: 'Gangguan komunikasi dengan server.' });
    } finally {
      setIsOperatingPrincipalPwd(false);
    }
  };

  const handleSaveMidtransFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFees(true);
    setSavingFeesMsg(null);
    try {
      const res = await fetch('/api/set-midtrans-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId: midtransMerchantIdInput,
          clientKey: midtransClientKeyInput,
          serverKey: midtransServerKeyInput,
          isProduction: midtransIsProduction,
          systemMaintenanceFee: systemMaintenanceFeeInput,
          chargeFeesToUser: chargeFeesToUserChecked
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavingFeesMsg({ type: 'success', text: '🎉 Semua pengaturan API Midtrans & biaya sistem berhasil disimpan!' });
        setMidtransServerKeyInput(''); // Reset server key password input after successful update
        onRefresh(); // trigger system config refresh
      } else {
        setSavingFeesMsg({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan.' });
      }
    } catch (err) {
      console.error(err);
      setSavingFeesMsg({ type: 'error', text: 'Koneksi gagal. Silakan coba lagi.' });
    } finally {
      setIsSavingFees(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({ type: 'error', text: 'Ukuran file logo terlalu besar. Maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
         setSchoolLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogo2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({ type: 'error', text: 'Ukuran file logo kedua terlalu besar. Maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setSchoolLogo2(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({ type: 'error', text: 'Ukuran file kop surat terlalu besar. Maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setSchoolLetterhead(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTreasurerSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({ type: 'error', text: 'Ukuran file ttd bendahara terlalu besar. Maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setSchoolTreasurerSignature(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSchoolStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSchoolIdentityMsg({ type: 'error', text: 'Ukuran file stempel sekolah terlalu besar. Maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setSchoolStamp(result);
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
      schoolStamp: schoolStamp
    });

    if (success) {
      setSchoolIdentityMsg({ type: 'success', text: '🎉 Identitas resmi sekolah berhasil diperbarui dan disiarkan secara waktu nyata.' });
    } else {
      setSchoolIdentityMsg({ type: 'error', text: 'Gagal memperbarui identitas sekolah.' });
    }
    setIsSavingSchoolIdentity(false);
  };

  return (
    <div id="admin-panel-root" className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-24 md:pb-0">
      {/* Sidebar Command List */}
      <div className="hidden md:flex md:col-span-3 flex-col gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2.5 block">Menu Administrasi</span>
          
          <button
            id="admin-menu-roster"
            onClick={() => setAdminTab('roster')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'roster'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={15} />
            Daftar Siswa & SPP
          </button>

          <button
            id="admin-menu-broadcast"
            onClick={() => setAdminTab('broadcast')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'broadcast'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BellRing size={15} />
            Kirim Notifikasi Real-time
          </button>

          <button
            id="admin-menu-config"
            onClick={() => setAdminTab('config')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'config'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings size={15} />
            Pengaturan
          </button>

          <button
            id="admin-menu-student-mgmt"
            onClick={() => setAdminTab('student_mgmt')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'student_mgmt'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap size={15} />
           Akun Siswa
          </button>

          <button
            id="admin-menu-reports"
            onClick={() => setAdminTab('laporan')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'laporan'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={15} className="text-emerald-500" />
            Laporan & Rekap
          </button>

          <button
            id="admin-menu-homeroom-mgmt"
            onClick={() => setAdminTab('homeroom_mgmt')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'homeroom_mgmt'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck size={15} className="text-amber-500" />
            Akun Wali Kelas (Absensi)
          </button>

          <button
            id="admin-menu-subject-teacher-mgmt"
            onClick={() => setAdminTab('subject_teacher_mgmt')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'subject_teacher_mgmt'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={15} className="text-teal-500" />
            Akun Guru Mapel (Jurnal KBM)
          </button>

          <button
            id="admin-menu-student-qr"
            onClick={() => setAdminTab('student_qr')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold cursor-pointer transition-all ${
              adminTab === 'student_qr'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ImageIcon size={15} className="text-indigo-500" />
            Kartu QR Pembayaran Siswa
          </button>
        </div>

        {/* Integration Credentials Info Block */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs flex flex-col gap-2">
          <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-600" /> Profil Sistem
          </h4>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-bold tracking-wider">Gateway Status:</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                SANDBOX
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-bold tracking-wider">SSE Listener:</span>
              <span className="text-emerald-600 font-bold font-mono">AKTIF (SSE)</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-bold tracking-wider">Metode Bayar:</span>
              <span className="text-slate-700 font-bold font-sans">WEBHOOK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Stage */}
      <div className="md:col-span-9 flex flex-col gap-6">
        {/* Tab 1: Student Roster and Payments */}
        {adminTab === 'roster' && (
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
                      Persetujuan Penarikan Tabungan Siswa ({pendingWithdrawals.length})
                    </h4>
                    <p className="text-[10px] text-amber-700/80 font-semibold">
                      Pengajuan penarikan tabungan mandiri dari siswa ini membutuhkan verifikasi & konfirmasi manual admin sebelum saldo dipotong.
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
                                {student?.name || 'Siswa Tidak Dikenal'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                Kelas {student?.class || '-'} &bull; NIS {student?.nis || '-'}
                              </span>
                            </div>
                            <span className="text-right shrink-0">
                              <span className="font-extrabold text-rose-600 font-mono text-sm block">
                                Rp {tx.amount.toLocaleString('id-ID')}
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
                              "{tx.notes || 'Tarik tunai keperluan sekolah'}"
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 font-medium">
                            Diajukan: {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={isProcessing || !onConfirmWithdrawal}
                            onClick={async () => {
                              if (!onConfirmWithdrawal) return;
                              setConfirmingTxId(tx.id);
                              await onConfirmWithdrawal(tx.id, 'approve');
                              setConfirmingTxId(null);
                            }}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            {isProcessing ? 'Memproses...' : (
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
                              if (!window.confirm('Apakah Anda yakin ingin menolak pengajuan penarikan ini?')) return;
                              setConfirmingTxId(tx.id);
                              await onConfirmWithdrawal(tx.id, 'reject');
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

             {/* Left table of students list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Dashboard Buku Kas & Rekening Siswa</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kelola tagihan SPP dan saldo tabungan siswa secara terotomasi. Sesi administrasi sinkron real-time.
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
                    <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
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
                          Penarikan per angkatan untuk keperluan ujian, LKS, study tour, atau kebutuhan siswa lainnya.
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
                        <span className="text-lg">✅</span> Penarikan Massal Sukses!
                      </div>
                      <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                        {bulkFeedback.message}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1.5 bg-white/60 p-3 rounded-lg border border-emerald-100">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Siswa Didebet</span>
                          <span className="text-sm font-extrabold text-slate-800 font-mono">{bulkFeedback.successCount || 0} Siswa</span>
                        </div>
                        {bulkFeedback.skippedCount !== undefined && (
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Siswa Dilewati (Saldo 0)</span>
                            <span className="text-sm font-extrabold text-slate-800 font-mono">{bulkFeedback.skippedCount} Siswa</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Total Pendanaan</span>
                          <span className="text-sm font-extrabold text-rose-600 font-mono">Rp {bulkFeedback.totalDeducted?.toLocaleString("id-ID") || 0}</span>
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
                              const count = students.filter(s => s.class && s.class.trim().startsWith(lvl)).length;
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
                                  <span className="text-xs font-extrabold">Tingkat {lvl}</span>
                                  <span className={`text-[9px] block font-semibold mt-0.5 ${isActive ? 'text-rose-100' : 'text-slate-400'}`}>
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
                            {[10000, 25000, 50000, 75000, 100000, 150000].map((val) => (
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
                            ))}
                          </div>
                        </div>

                        {/* Reason and notes */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Alasan / Keterangan Penarikan (Tercatat di Mutasi / Rapor Tabungan)
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
                          <label htmlFor="bulkAllowDebt" className="text-[11px] text-slate-600 font-semibold cursor-pointer select-none leading-tight">
                            Izinkan saldo siswa menjadi minus <span className="text-slate-400 font-normal">(Catat sebagai defisit/utang jika saldo kurang)</span>
                          </label>
                        </div>
                      </div>

                      {/* Right: Informational/Metric/Action Card */}
                      <div className="bg-rose-50/50 border border-rose-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                        <div className="flex flex-col gap-3">
                          <h5 className="font-bold text-rose-900 text-[10px] uppercase tracking-wider">Keamanan & Rangkuman Sesi</h5>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-[11px] border-b border-rose-150 pb-1">
                              <span className="text-slate-505 font-medium">Banyak Siswa</span>
                              <span className="font-bold text-slate-800 font-mono text-xs">
                                {students.filter(s => s.class && s.class.trim().startsWith(bulkGrade)).length} Siswa
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] border-b border-rose-150 pb-1 font-medium">
                              <span className="text-slate-505">Nominal per Siswa</span>
                              <span className="font-bold text-slate-800 font-mono text-xs">
                                Rp {Number(bulkAmount || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-505 font-medium">Total Maksimal Tarik</span>
                              <span className="font-extrabold text-rose-600 font-mono text-xs">
                                Rp {(students.filter(s => s.class && s.class.trim().startsWith(bulkGrade)).length * Number(bulkAmount || 0)).toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex gap-1 leading-relaxed text-[9px] text-amber-800 font-medium">
                            <span>💡</span>
                            <span>Tindakan ini akan langsung mendebet saldo tabungan seluruh siswa terpilih tanpa persetujuan bertahap. Pastikan kuitansi ujian/kebutuhan sekolah telah siap.</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={bulkProcessing || !bulkAmount || !bulkNotes || !onBulkWithdrawSavings}
                          onClick={async () => {
                            if (!onBulkWithdrawSavings) return;
                            const targetCount = students.filter(s => s.class && s.class.trim().startsWith(bulkGrade)).length;
                            if (targetCount === 0) {
                              alert(`Tidak ditemukan siswa di Tingkat ${bulkGrade}.`);
                              return;
                            }
                            const confirmText = `Apakah Anda yakin ingin menarik tabungan secara MASSAL untuk seluruh siswa Tingkat ${bulkGrade} (${targetCount} siswa)?\nNominal penarikan: Rp ${Number(bulkAmount).toLocaleString("id-ID")} per siswa.\n\nTindakan ini langsung memperbarui buku kas & otomatis mengirim WhatsApp mutasi ke wali murid!`;
                            if (!window.confirm(confirmText)) return;

                            setBulkProcessing(true);
                            const res = await onBulkWithdrawSavings(
                              bulkGrade,
                              Number(bulkAmount),
                              bulkNotes,
                              bulkAllowDebt
                            );
                            setBulkProcessing(false);

                            if (res && res.success) {
                              setBulkFeedback({
                                success: true,
                                message: res.message,
                                successCount: res.successCount,
                                skippedCount: res.skippedCount,
                                totalDeducted: res.totalDeducted
                              });
                            }
                          }}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {bulkProcessing ? "Memproses Penarikan..." : (
                            <>
                              <ArrowDownLeft size={13} className="stroke-[2.5]" />
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
                      onClick={() => setStudentSearch('')}
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
                      <th className="px-5 py-3 text-right">Aksi Administrasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-medium font-sans">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search size={24} className="text-slate-300 stroke-[1.5]" />
                            <span>Tidak ada siswa yang cocok dengan pencarian "{studentSearch}"</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const sBills = bills.filter(b => b.studentId === student.id);
                        const rawUnpaidCount = sBills.filter(b => b.status === 'unpaid').length;
                        const unpaidCount = Math.min(rawUnpaidCount, 12);
                        const nextUnpaidBill = sBills.find(b => b.status === 'unpaid');

                        return (
                          <tr
                            key={student.id}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              selectedStudent?.id === student.id ? 'bg-indigo-50/10' : ''
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
                              Rp {student.savingsBalance.toLocaleString('id-ID')}
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
                                          setProcessingBillId(nextUnpaidBill.id);
                                          await onPaySppViaMidtrans(nextUnpaidBill);
                                          setProcessingBillId(null);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm shadow-emerald-100 cursor-pointer flex items-center justify-center gap-1 min-w-[110px]"
                                      title="Terima tunai lalu bayar online via Midtrans sehingga tercatat otomatis"
                                    >
                                      {processingBillId === nextUnpaidBill.id ? (
                                        <RefreshCw size={10} className="animate-spin" />
                                      ) : (
                                        <>
                                          <Zap size={11} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                          <span>Tunai Midtrans ({nextUnpaidBill.month.slice(0, 3)})</span>
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
                                        const resBill = await onPaySppManual(nextUnpaidBill.id);
                                        setProcessingBillId(null);
                                        if (resBill) {
                                          setReceiptToPrint({
                                            type: 'spp',
                                            detail: {
                                              ...nextUnpaidBill,
                                              status: 'paid',
                                              paidAt: new Date().toISOString(),
                                              paymentMethod: 'Manual Teller (Sekolah)',
                                              orderId: resBill.orderId || `ORD-MANUAL-${Date.now()}`
                                            },
                                            student: student
                                          });
                                          setPrintId('print-receipt-section');
                                        }
                                      }}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-205 border border-slate-300 disabled:bg-slate-50 text-slate-600 rounded font-bold text-[9px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                                      title="Selesaikan pembayaran dengan pembayaran tunai manual ke Teller"
                                    >
                                      Manual
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold px-2 text-center block">Bebas SPP</span>
                                )}

                                {/* Trigger Mutasi Drawer */}
                                <button
                                  id={`admin-mutasi-${student.id}`}
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setTxType('deposit');
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
                        <User size={16} className="text-indigo-600" /> Profil & Buku Rekening Keuangan: {selectedStudent.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Siswa Kelas <strong>{selectedStudent.class}</strong> &bull; NIS: <strong className="font-mono">{selectedStudent.nis}</strong> &bull; Kelola tabungan dan kuitansi pembayaran SPP secara mandiri.
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
                            <ShoppingCart size={12} className="animate-bounce" />
                            <span>KERANJANG PEMBAYARAN TUNAI ({paymentCart.length})</span>
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
                          <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                            <div className="flex flex-col text-left">
                              <span className="font-extrabold text-slate-800">
                                {item.type === 'spp' ? `SPP Bulanan (${item.month} ${item.year})` : 'Setoran Tabungan Tunai'}
                              </span>
                              <span className="text-[10px] text-slate-550 font-medium">
                                Siswa: <strong className="text-slate-700">{item.student.name}</strong> ({item.student.nis} - Kelas {item.student.class})
                                {item.notes && ` • Memo: "${item.notes}"`}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-mono font-extrabold text-slate-900">
                                Rp {item.amount.toLocaleString('id-ID')},00
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
                          <span className="text-[9px] uppercase tracking-wider text-amber-800">Total Nominal Pembayaran</span>
                          <span className="font-mono text-slate-900 font-extrabold text-base">
                            Rp {paymentCart.reduce((total, item) => total + item.amount, 0).toLocaleString('id-ID')},00
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={processingCart}
                          onClick={handleProcessCartCheckout}
                          className={`px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                            processingCart ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:from-amber-600 hover:to-orange-600 active:scale-95 cursor-pointer'
                          }`}
                        >
                          {processingCart ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Sedang Memproses ({paymentCart.length} Item)...</span>
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
                      onClick={() => setStudentDetailTab('spp')}
                      className={`flex-1 py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        studentDetailTab === 'spp'
                          ? 'bg-indigo-650 bg-indigo-600 text-white border-transparent shadow-md font-extrabold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-bold'
                      }`}
                    >
                      <BookOpen size={14} />
                      Iuran SPP Bulanan ({bills.filter(b => b.studentId === selectedStudent.id).length} Bulan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentDetailTab('savings')}
                      className={`flex-1 py-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        studentDetailTab === 'savings'
                          ? 'bg-indigo-650 bg-indigo-600 text-white border-transparent shadow-md font-extrabold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-bold'
                      }`}
                    >
                      <Banknote size={14} />
                      Histori Tabungan ({transactions.filter(t => t.studentId === selectedStudent.id && t.status === 'success').length} Transaksi)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {studentDetailTab === 'spp' ? (
                      <>
                        {/* TAMPILAN SPP: 100% Hanya informasi dan aksi terkait SPP */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                          {/* Card SPP khusus */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white shadow-md flex flex-col justify-between min-h-[110px] relative overflow-hidden">
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                              <BookOpen size={120} />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-300">STATUS BUKU IURAN SPP SISWA</span>
                              <span className="text-lg md:text-xl font-bold font-mono block mt-1">
                                {bills.filter(b => b.studentId === selectedStudent.id && b.status === 'unpaid').length} Bulan Tunggakan
                              </span>
                            </div>
                            <div className="mt-4 pt-2 border-t border-emerald-800/40 flex justify-between items-center text-[10px] text-emerald-300">
                              <span className="font-semibold uppercase tracking-wide">Tingkat Kelas: {selectedStudent.class}</span>
                              <span className="font-bold font-mono">
                                Tarif: Rp {
                                  (() => {
                                    const clsStr = String(selectedStudent.class || '').toLowerCase();
                                    if (clsStr.includes('7')) return sppConfigRates.grade7.toLocaleString('id-ID');
                                    if (clsStr.includes('8')) return sppConfigRates.grade8.toLocaleString('id-ID');
                                    if (clsStr.includes('9')) return sppConfigRates.grade9.toLocaleString('id-ID');
                                    return sppConfigRates.grade7.toLocaleString('id-ID');
                                  })()
                                }/bln
                              </span>
                            </div>
                          </div>

                          {/* Informasi & Kebijakan SPP */}
                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-3 text-xs leading-relaxed text-slate-600">
                            <h5 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                              <ShieldAlert size={14} className="text-emerald-600" /> Aturan Tagihan SPP
                            </h5>
                            <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-500">
                              <li>Iuran SPP wajib diselesaikan paling lambat tanggal <strong>10 setiap bulan</strong>.</li>
                              <li>Pembayaran online via <strong className="text-emerald-700 font-bold">Midtrans</strong> akan disinkronisasi lunas secara instan.</li>
                              <li>Teller sekolah berhak mencatatkan pembayaran tunai manual jika siswa membawa uang kas ke loket tata usaha.</li>
                              <li>Kuitansi resmi dapat dicetak seketika setelah pembayaran berhasil diverifikasi.</li>
                            </ul>
                          </div>
                        </div>

                        {/* LIST SPP DI KANAN */}
                        <div className="lg:col-span-7 flex flex-col gap-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <BookOpen size={13} className="text-emerald-600" /> Daftar Rekap Tagihan SPP Bulanan
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-mono">
                              Total {bills.filter(b => b.studentId === selectedStudent.id).length} Tagihan
                            </span>
                          </div>

                          <div className="p-3 max-h-[350px] overflow-y-auto">
                            <div className="flex flex-col gap-2">
                              {bills.filter(b => b.studentId === selectedStudent.id).length === 0 ? (
                                <div className="text-center py-6 text-[11px] text-slate-400">Tidak ada tagihan SPP bagi siswa ini.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left font-sans text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                                        <th className="pb-2">Bulan/Tahun</th>
                                        <th className="pb-2">Nominal</th>
                                        <th className="pb-2 text-center">Status</th>
                                        <th className="pb-2 text-right">Aksi Pembayaran / Kuitansi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {bills
                                        .filter(b => b.studentId === selectedStudent.id)
                                        .sort((a,b) => {
                                          if (b.year !== a.year) return b.year - a.year;
                                          const monthsOrdered = [
                                            "Juli", "Agustus", "September", "Oktober", "November", "Desember",
                                            "Januari", "Februari", "Maret", "April", "Mei", "Juni"
                                          ];
                                          return monthsOrdered.indexOf(b.month) - monthsOrdered.indexOf(a.month);
                                        })
                                        .map((b) => (
                                          <tr key={b.id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 font-bold text-slate-700">{b.month} {b.year}</td>
                                            <td className="py-2.5 font-mono text-slate-600 font-bold">Rp {b.amount.toLocaleString('id-ID')}</td>
                                            <td className="py-2.5 text-center">
                                              {b.status === 'paid' ? (
                                                 <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">LUNAS</span>
                                               ) : b.status === 'pending' ? (
                                                 <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">PENDING</span>
                                               ) : !checkIsBillActive(b, selectedStudent.id) ? (
                                                 <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 uppercase flex items-center gap-0.5 justify-center"><Lock size={8} /> Nonaktif</span>
                                               ) : (
                                                 <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">UNPAID</span>
                                               )}
                                            </td>
                                            <td className="py-2.5 text-right">
                                              {b.status === 'paid' ? (
                                                <div className="flex gap-1.5 justify-end items-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setReceiptToPrint({ type: 'spp', detail: b, student: selectedStudent });
                                                      setPrintId('print-receipt-section');
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-205 border border-slate-200 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                                  >
                                                    <Printer size={10} className="text-indigo-600" /> Cetak 🖨
                                                  </button>
                                                  {b.paymentMethod === 'Manual Teller (Sekolah)' && onCancelSppManual && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBillToCancel(b);
                                                        setCancelFeedback(null);
                                                      }}
                                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                                                      title="Batalkan pembayaran manual teller ini"
                                                    >
                                                      Batal ↩
                                                    </button>
                                                  )}
                                                </div>
                                              ) : !checkIsBillActive(b, selectedStudent.id) ? (
                                                   <div className="flex justify-end items-center">
                                                     <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1" title="Siswa harus melunasi SPP bulan berjalan terlebih dahulu">
                                                       <Lock size={9} /> SPP berjalan belum lunas
                                                     </span>
                                                   </div>
                                                 ) : (
                                                   <div className="flex gap-1 justify-end items-center">
                                                     <button
                                                       type="button"
                                                       onClick={(e) => {
                                                         e.stopPropagation();
                                                         addToCartSpp(b, selectedStudent);
                                                       }}
                                                       className="px-1.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded text-[8px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                                                       title="Tambahkan tagihan ini ke Ringkasan Keranjang Pembayaran"
                                                     >
                                                       <ShoppingCart size={9} />
                                                       <span>+ Keranjang</span>
                                                     </button>
                                                     <button
                                                       type="button"
                                                       disabled={processingBillId !== null}
                                                       onClick={async (e) => {
                                                         e.stopPropagation();
                                                         if (onPaySppViaMidtrans) {
                                                           setProcessingBillId(b.id);
                                                           await onPaySppViaMidtrans(b);
                                                           setProcessingBillId(null);
                                                         }
                                                       }}
                                                       className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded text-[8px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                                                       title="Bayar online menggunakan gerbang pembayaran Midtrans"
                                                     >
                                                       <Zap size={9} className="text-yellow-350 fill-yellow-350 animate-pulse" />
                                                       <span>Midtrans</span>
                                                     </button>
                                                     <button
                                                       type="button"
                                                       disabled={processingBillId !== null}
                                                       onClick={async (e) => {
                                                         e.stopPropagation();
                                                         setProcessingBillId(b.id);
                                                         const resBill = await onPaySppManual(b.id);
                                                         setProcessingBillId(null);
                                                         if (resBill) {
                                                           setReceiptToPrint({
                                                             type: 'spp',
                                                             detail: {
                                                               ...b,
                                                               status: 'paid',
                                                               paidAt: new Date().toISOString(),
                                                               paymentMethod: 'Manual Teller (Sekolah)',
                                                               orderId: resBill.orderId || `ORD-MANUAL-${Date.now()}`
                                                             },
                                                             student: selectedStudent
                                                           });
                                                           setPrintId('print-receipt-section');
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
                              <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-350 text-indigo-200">TOTAL SALDO TABUNGAN SISWA</span>
                              <span className="text-lg md:text-xl font-bold font-mono block mt-1">
                                Rp {selectedStudent.savingsBalance.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="mt-4 pt-2 border-t border-indigo-800/50 flex justify-between items-center text-[10px] text-indigo-300">
                              <span>SMP Maarif Pandaan</span>
                              <span className="font-mono uppercase text-[9px] font-bold bg-indigo-950/40 px-2 py-0.5 rounded text-indigo-200">REKENING AKTIF</span>
                            </div>
                          </div>

                          {/* Formulir Mutasi Tabungan Manual */}
                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Mutasi Tabungan Manual</span>
                            
                            <div className="grid grid-cols-2 gap-1 bg-white p-0.5 border border-slate-200 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setTxType('deposit')}
                                className={`py-1.5 rounded font-bold text-[10px] text-center cursor-pointer transition-all ${
                                  txType === 'deposit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                SETOR TUNAI
                              </button>
                              <button
                                type="button"
                                onClick={() => setTxType('withdrawal')}
                                className={`py-1.5 rounded font-bold text-[10px] text-center cursor-pointer transition-all ${
                                  txType === 'withdrawal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                TARIK TUNAI
                              </button>
                            </div>

                            <form onSubmit={handleSavingsSubmit} className="flex flex-col gap-3">
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Nominal Uang (Rp)</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    required
                                    placeholder="cth: 50000"
                                    value={txAmount}
                                    onChange={(e) => setTxAmount(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                                  />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">Rp</span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Memo / Keterangan</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="cth: Tabungan harian saku"
                                  value={txNotes}
                                  onChange={(e) => setTxNotes(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                                />
                              </div>

                              {txType === 'deposit' ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    type="button"
                                    disabled={txProcessing || !txAmount || !onDepositSavingsViaMidtrans}
                                    onClick={async () => {
                                      if (onDepositSavingsViaMidtrans && selectedStudent) {
                                        setTxProcessing(true);
                                        await onDepositSavingsViaMidtrans(Number(txAmount), selectedStudent.id);
                                        setTxProcessing(false);
                                        setTxAmount('');
                                        setTxNotes('');
                                      }
                                    }}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    title="Proses setoran tabungan via Gerbang Pembayaran Midtrans"
                                  >
                                    <Zap size={11} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                    <span>Bayar via Midtrans (Online)</span>
                                  </button>
                                  
                                  <button
                                    type="submit"
                                    disabled={txProcessing || !txAmount}
                                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-205 border border-slate-300 text-slate-700 font-semibold rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {txProcessing ? 'Menyimpan...' : 'Atau Terima Tunai / Manual (Teller)'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={txProcessing || !txAmount}
                                    onClick={() => {
                                      addToCartSavings(Number(txAmount), txNotes, selectedStudent);
                                      setTxAmount('');
                                      setTxNotes('');
                                    }}
                                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm mt-1.5"
                                  >
                                    <ShoppingCart size={11} />
                                    <span>+ Tambahkan Setoran ke Keranjang</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="hidden"
                                  >
                                    {txProcessing ? 'Menyimpan...' : 'Atau Terima Tunai / Manual (Teller)'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="submit"
                                  disabled={txProcessing || !txAmount}
                                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                                >
                                  {txProcessing ? 'Menyimpan...' : 'Catat Penarikan Tunai / Manual (Teller) 💸'}
                                </button>
                              )}
                            </form>
                          </div>
                        </div>

                        {/* LIST MUTASI TABUNGAN DI KANAN */}
                        <div className="lg:col-span-7 flex flex-col gap-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <Banknote size={13} className="text-indigo-650 text-indigo-600" /> Histori Arus Rekening Tabungan
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-mono">
                              {transactions.filter(t => t.studentId === selectedStudent.id && t.status === 'success').length} Transaksi
                            </span>
                          </div>

                          <div className="p-3 max-h-[350px] overflow-y-auto">
                            <div className="flex flex-col gap-2">
                              {transactions.filter(t => t.studentId === selectedStudent.id && t.status === 'success').length === 0 ? (
                                <div className="text-center py-6 text-[11px] text-slate-400">Belum ada riwayat mutasi tabungan terverifikasi.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left font-sans text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                                        <th className="pb-2">Waktu/Nota</th>
                                        <th className="pb-2">Tipe</th>
                                        <th className="pb-2">Nominal</th>
                                        <th className="pb-2 text-right">Aksi Kuitansi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {transactions
                                        .filter(t => t.studentId === selectedStudent.id && t.status === 'success')
                                        .map((t) => (
                                          <tr key={t.id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5">
                                              <div className="font-bold text-slate-700">{new Date(t.createdAt).toLocaleDateString('id-ID')}</div>
                                              <div className="text-[9px] text-slate-400 max-w-[120px] truncate" title={t.notes}>{t.notes || 'Mutasi Tabungan'}</div>
                                            </td>
                                            <td className="py-2.5">
                                              {t.type === 'deposit' ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold"><ArrowDownLeft size={10} /> Setor</span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 text-rose-700 font-bold"><ArrowUpRight size={10} /> Tarik</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 font-mono text-slate-700 font-bold">
                                              Rp {t.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="py-2.5 text-right">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setReceiptToPrint({ type: 'savings', detail: t, student: selectedStudent });
                                                  setPrintId('print-receipt-section');
                                                }}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-205 border border-slate-200 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 ml-auto cursor-pointer"
                                              >
                                                <Printer size={10} className="text-indigo-600" /> Cetak 🖨
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
          </div>
        )}

        {/* Tab 2: Broadcast Event Tool */}
        {adminTab === 'broadcast' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 text-xs"
          >
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <BellRing size={16} className="text-indigo-650 text-indigo-600" /> Pusat Pengumuman Sekolah & Notifikasi Real-time
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Kirimkan pengumuman penting sekolah kepada siswa dan orang tua murid secara real-time. Pesan yang dikirim menggunakan teknologi SSE push, akan meluncur di layar portal siswa secara instan!
              </p>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Topik / Judul Pesan</label>
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kategori Visual</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'info', label: 'Info' },
                      { key: 'success', label: 'Done' },
                      { key: 'warning', label: 'Penting' },
                      { key: 'payment', label: 'Bayar' }
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setNotifType(t.key as any)}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all text-center cursor-pointer uppercase tracking-wider ${
                          notifType === t.key
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Isi Pesan Lengkap</label>
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
                  {broadcastProcessing ? 'Mengirim...' : 'Siarkan Pengumuman Real-time! 📢'}
                </button>
              </div>

              {broadcastSuccess && (
                <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-2 font-semibold">
                  <CheckCircle size={14} /> Pengumuman disiarkan secara instan! Siswa akan menerima Toast Notifikasi di browser mereka.
                </div>
              )}
            </form>
          </motion.div>
        )}

        {/* Tab 3: Config Status Viewer */}
        {adminTab === 'config' && (
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
                    <UploadCloud className="text-emerald-400" size={18} /> Cloud Database-Sync Integration
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-medium">
                    Sistem ini terintegrasi langsung dengan database awan Google Firebase Firestore menggunakan koneksi tersemat (Embedded Fallback) otomatis tanpa konfigurasi manual.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status Gateway:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                    systemStatus?.firestore?.status?.includes('Synced') || systemStatus?.firestore?.status === 'Firebase SDK Initialized'
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : systemStatus?.firestore?.status === 'Connecting...' || systemStatus?.firestore?.status?.includes('Syncing')
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      systemStatus?.firestore?.status?.includes('Synced') || systemStatus?.firestore?.status === 'Firebase SDK Initialized'
                        ? "bg-emerald-450"
                        : systemStatus?.firestore?.status === 'Connecting...' || systemStatus?.firestore?.status?.includes('Syncing')
                        ? "bg-amber-400"
                        : "bg-red-400"
                    }`}></span>
                    {systemStatus?.firestore?.status || "Sedang memuat status..."}
                  </span>
                </div>
              </div>

              {syncFeedback && (
                <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                  syncFeedback.includes('sukses') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  <span>{syncFeedback.includes('sukses') ? "✔️" : "⚠️"}</span>
                  <span>{syncFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROJECT-ID CLOUD</span>
                  <span className="font-mono text-[11px] text-slate-200 truncate font-semibold">ungoogly-impulse-271nt</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FIRESTORE SUITE DATABASE ID</span>
                  <span className="font-mono text-[11px] text-emerald-400 truncate font-semibold">ai-studio-7ff6ffdf-833a-490d-a519-ec4364d0517f</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TERAKHIR DISINKRONKAN (WIB)</span>
                  <span className="font-mono text-[11px] text-slate-200 font-semibold">
                    {systemStatus?.firestore?.lastSync ? new Date(systemStatus.firestore.lastSync).toLocaleString('id-ID') : "Belum di sinkronisasikan"}
                  </span>
                </div>
              </div>

              {systemStatus?.firestore?.error && (
                <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-lg flex flex-col gap-1 text-red-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider">DETAIL OPERASIONAL ERROR:</span>
                  <p className="font-mono text-[10px] break-all leading-normal text-red-200 select-all font-semibold">
                    {systemStatus.firestore.error}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded">💡</span>
                  <div className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    Setiap pembaruan data murid, pembayaran tagihan SPP, transaksi tabungan, maupun jurnal absensi, <strong>otomatis langsung tersinkronkan</strong> ke database awan secara real-time. Jika Anda mendapati basis data awan kosong, tekan tombol sinkronkan untuk memigrasikan database memori server secara instan.
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
                      <RefreshCw size={12} className="animate-spin text-white animate-normal" /> Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} className="text-white" /> Sinkronkan Sekarang 🔄
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
                  <Settings size={16} className="text-emerald-600" /> Pengaturan Nominal Pembayaran SPP Per Tingkat (Kelas 7, 8, & 9)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Tentukan nilai nominal iuran bulanan wajib SPP bagi siswa di setiap jenjang tingkatan kelas secara mandiri. Perubahan akan disimpan di server memory secara instan.
                </p>
              </div>

              <form onSubmit={handleSaveSppRates} className="flex flex-col gap-4">
                {sppConfigMsg && (
                  <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                    sppConfigMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-205 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {sppConfigMsg.type === 'success' ? <Check size={14} className="text-emerald-700" /> : <AlertCircle size={14} className="text-red-700" />}
                    {sppConfigMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">SPP KELAS 7 (Tingkat I)</span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={sppConfigRates.grade7}
                        onChange={(e) => setSppConfigRates({ ...sppConfigRates, grade7: parseInt(e.target.value) || 0 })}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">SPP KELAS 8 (Tingkat II)</span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={sppConfigRates.grade8}
                        onChange={(e) => setSppConfigRates({ ...sppConfigRates, grade8: parseInt(e.target.value) || 0 })}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">SPP KELAS 9 (Tingkat III)</span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={sppConfigRates.grade9}
                        onChange={(e) => setSppConfigRates({ ...sppConfigRates, grade9: parseInt(e.target.value) || 0 })}
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
                    onChange={(e) => setUpdateExistingUnpaidBills(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="update-existing-unpaid-spp-chk" className="text-[11px] font-medium leading-normal cursor-pointer text-slate-500">
                    Terapkan & sesuaikan nominal baru ke semua tagihan siswa yang berstatus <strong>Belum Lunas (Unpaid)</strong> saat ini.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSppRates}
                  className="w-full md:w-auto self-end px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg uppercase tracking-wider text-[11px] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSppRates ? 'Menyimpan...' : 'Simpan Setelan SPP 💾'}
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
                  <Key size={16} className="text-emerald-600" /> Pengaturan Keamanan Akun Bendahara
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Kelola keamanan kredensial login untuk <strong>Bendahara Keuangan</strong>. Anda dapat memperbarui password secara langsung di bawah ini atau meresetnya kembali ke sandi bawaan default (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">bendahara123</code>).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to change password directly */}
                <form onSubmit={handleAdminUpdateTreasurerPassword} className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Atur Kata Sandi Baru Khusus</span>
                  
                  {treasurerActionMsg && (
                    <div className={`p-3 rounded-lg font-bold text-xs ${
                      treasurerActionMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-250 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                      {treasurerActionMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400">Kata Sandi Baru</label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi baru Bendahara (Min 5 karakter)"
                      value={adminTreasurerPasswordInput}
                      onChange={(e) => setAdminTreasurerPasswordInput(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOperatingTreasurerPwd}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOperatingTreasurerPwd ? 'Menyimpan...' : 'Perbarui Sandi Bendahara 🔑'}
                  </button>
                </form>

                {/* Reset to Default */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl h-full justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Setel Ulang Sandi Kembali ke Bawaan</span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
                      Lupa password bendahara aktif? Klik tombol di bawah ini untuk mengembalikan sandi Bendahara kembali ke standar bawaan sistem: <strong className="font-mono text-indigo-700">bendahara123</strong>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminResetTreasurerPassword}
                    disabled={isOperatingTreasurerPwd}
                    className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} className={isOperatingTreasurerPwd ? 'animate-spin' : ''} />
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
                  <Key size={16} className="text-violet-600" /> Pengaturan Keamanan Akun Kepala Sekolah (Principal)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Kelola keamanan kredensial login untuk <strong>Kepala Sekolah</strong>. Anda dapat memperbarui password secara langsung di bawah ini atau meresetnya kembali ke sandi bawaan default (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-violet-700">kepala123</code>).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to change password directly */}
                <form onSubmit={handleAdminUpdatePrincipalPassword} className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Atur Kata Sandi Baru Khusus</span>
                  
                  {principalActionMsg && (
                    <div className={`p-3 rounded-lg font-bold text-xs ${
                      principalActionMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-250 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                      {principalActionMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400">Kata Sandi Baru</label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi baru Kepala Sekolah (Min 5 karakter)"
                      value={adminPrincipalPasswordInput}
                      onChange={(e) => setAdminPrincipalPasswordInput(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-violet-600 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOperatingPrincipalPwd}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOperatingPrincipalPwd ? 'Menyimpan...' : 'Perbarui Sandi Kepala Sekolah 🔑'}
                  </button>
                </form>

                {/* Reset to Default */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl h-full justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Setel Ulang Sandi Kembali ke Bawaan</span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
                      Lupa password Kepala Sekolah aktif? Klik tombol di bawah ini untuk mengembalikan sandi Kepala Sekolah kembali ke standar bawaan sistem: <strong className="font-mono text-violet-700">kepala123</strong>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminResetPrincipalPassword}
                    disabled={isOperatingPrincipalPwd}
                    className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} className={isOperatingPrincipalPwd ? 'animate-spin' : ''} />
                    <span>Reset Password ke Default (kepala123) 🔄</span>
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
                  <Settings size={16} className="text-emerald-600" /> Pengaturan Identitas & Logo Resmi Sekolah
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Sesuaikan nama sekolah, kop surat, data akreditasi, nomor telepon dinas, alamat lengkap, nama pejabat (Kepala Sekolah & Bendahara), serta unggah logo instansi resmi Anda. Nilai di bawah ini akan memperbarui kop kuitansi cetak otomatis.
                </p>
              </div>

              <form onSubmit={handleSaveSchoolIdentity} className="flex flex-col gap-5">
                {schoolIdentityMsg && (
                  <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                    schoolIdentityMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-205 text-red-700'
                  }`}>
                    {schoolIdentityMsg.type === 'success' ? <Check size={14} className="text-emerald-700" /> : <AlertCircle size={14} className="text-red-750" />}
                    {schoolIdentityMsg.text}
                  </div>
                )}

                {/* Top row: Logo, Kop Surat and Main Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  
                  {/* File Uploads Column for Logo AND Kop Surat */}
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* Logo File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logo Sekolah Utama</span>
                      
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
                            <span className="text-[9px] text-slate-400">Belum Ada Logo Utama</span>
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
                      <span className="text-[8px] text-slate-400">Format gambar persegi</span>
                    </div>

                    {/* Logo kedua / pendamping */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logo Kedua / Pendamping</span>
                      
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
                            <span className="text-[9px] text-slate-400">Belum Ada Logo Kedua</span>
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
                      <span className="text-[8px] text-slate-400">Format gambar persegi</span>
                    </div>

                    {/* Kop Surat File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kop Surat Default</span>
                      
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
                            <span className="text-[9px] text-slate-400">Belum Ada Kop Surat</span>
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
                      <span className="text-[8px] text-slate-400 leading-none">Rasio panjang banner (Kop dokumen cetak)</span>
                    </div>

                    {/* TTD Bendahara File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanda Tangan Bendahara</span>
                      
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
                            <span className="text-[9px] text-slate-400">Belum Ada Tanda Tangan</span>
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
                      <span className="text-[8px] text-slate-400 leading-none">Format ttd PNG transparan</span>
                    </div>

                    {/* Stempel Sekolah File Upload & Preview Column */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stempel Resmi Sekolah</span>
                      
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
                            <span className="text-[9px] text-slate-400">Belum Ada Stempel Resmi</span>
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
                      <span className="text-[8px] text-slate-400 leading-none">Format stempel transparan</span>
                    </div>
                  </div>

                  {/* Identity Form Inputs Column */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Nama Resmi Sekolah</label>
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Subheading / Lembaga Atas</label>
                      <input
                        type="text"
                        value={schoolSubheading}
                        onChange={(e) => setSchoolSubheading(e.target.value)}
                        placeholder="CONTOH: LP MA'ARIF NU CABANG PASURUAN"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Skala / Status Akreditasi</label>
                      <input
                        type="text"
                        value={schoolAccreditation}
                        onChange={(e) => setSchoolAccreditation(e.target.value)}
                        placeholder="CONTOH: Terakreditasi A"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Nomor Telepon Dinas</label>
                      <input
                        type="text"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                        placeholder="CONTOH: (0343) 631234"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Alamat Lengkap Instansi</label>
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Nama Kepala Sekolah / Jabatan 1 (Ttd Kuitansi)</label>
                    <input
                      type="text"
                      value={schoolPrincipal}
                      onChange={(e) => setSchoolPrincipal(e.target.value)}
                      placeholder="Contoh: H. Ahmad Fuad, S.Pd, M.PdI"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Nama Bendahara / Jabatan 2 (Ttd Kuitansi)</label>
                    <input
                      type="text"
                      value={schoolTreasurer}
                      onChange={(e) => setSchoolTreasurer(e.target.value)}
                      placeholder="Contoh: Bendahara Sekolah"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSchoolIdentity}
                  className="w-full md:w-auto self-end px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg uppercase tracking-wider text-[11px] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSchoolIdentity ? 'Menyimpan...' : 'Simpan Identitas Sekolah 💾'}
                </button>
              </form>
            </motion.div>

            {/* Academic Operations: Kenaikan Kelas & Aktivasi Tahun Ajaran Otomatis */}
            <div className="w-full">
              {/* Card Operation: Kenaikan Kelas */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-5 text-xs"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <GraduationCap size={16} className="text-emerald-600 animate-pulse" /> Operasi Kenaikan Kelas Massal & Tahun Ajaran Baru
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Membantu naik kelas seluruh siswa dalam satu klik: Kelas 7A/B naik ke Kelas 8A/B, Kelas 8A/B naik ke Kelas 9A/B, dan Kelas 9A/B dinyatakan lulus (Lulus). 
                    <strong className="text-indigo-650 text-indigo-600 ml-1">Sistem akan secara otomatis mendeteksi dan mengaktifkan tahun ajaran berikutnya serta membuat 12 bulan tagihan SPP baru siap bayar bagi seluruh siswa aktif non-graduated.</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {promotionMessage && (
                    <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                      promotionMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {promotionMessage.type === 'success' ? <Check size={14} className="text-emerald-700" /> : <AlertCircle size={14} className="text-red-700" />}
                      {promotionMessage.text}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePromoteClasses}
                    disabled={isPromoting}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs uppercase tracking-wide cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isPromoting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Memproses Kenaikan & Aktivasi...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={14} /> Proses Kenaikan Kelas & Aktivasi Tahun Ajaran Baru 👨‍🎓🚀
                      </>
                    )}
                  </button>
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
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Settings size={16} className="text-indigo-600" /> Pengaturan & Integrasi Gateway Midtrans
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Konfigurasikan kunci akses API Midtrans Anda secara langsung di bawah ini. Pengaturan ini akan disinkronkan secara aman ke peladen backend database sekolah.
                </p>
              </div>

              <form onSubmit={handleSaveMidtransFees} className="flex flex-col gap-5">
                {savingFeesMsg && (
                  <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                    savingFeesMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-250 text-emerald-800' : 'bg-red-50 border border-red-250 text-red-700'
                  }`}>
                    {savingFeesMsg.type === 'success' ? <Check size={14} className="text-emerald-700" /> : <AlertCircle size={14} className="text-red-700" />}
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
                        onChange={(e) => setMidtransMerchantIdInput(e.target.value)}
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
                        onChange={(e) => setMidtransClientKeyInput(e.target.value)}
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
                        onChange={(e) => setMidtransServerKeyInput(e.target.value)}
                        placeholder={midtransStatus?.hasServerKey ? "•••••••••••••••• (Kunci Terenkripsi Aman)" : "Masukkan Server Key keamanan"}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs"
                      />
                      {midtransStatus?.hasServerKey && (
                        <span className="text-[9px] text-emerald-600 mt-0.5 leading-relaxed font-semibold">
                          ✔️ Kunci sudah terintegrasi aman di server. Kosongkan jika tidak ingin mendesain ulang kunci baru.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Lingkungan API (Development / Production)
                      </label>
                      <select
                        value={midtransIsProduction ? 'prod' : 'sandbox'}
                        onChange={(e) => setMidtransIsProduction(e.target.value === 'prod')}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 shadow-3xs cursor-pointer"
                      >
                        <option value="sandbox">Sandbox (Mode Simulasi Demo)</option>
                        <option value="prod">Production (Gerbang Pembayaran Riil / Live)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* System Fees Settings */}
                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 flex flex-col gap-4">
                  <span className="font-bold text-slate-800 text-xs block uppercase tracking-wide">
                    ⚙️ Biaya Pemeliharaan Aplikasi
                  </span>
                  
                  <div className="flex items-center gap-2.5 px-1 py-1 text-slate-600 select-none">
                    <input
                      type="checkbox"
                      id="charge-fees-to-user-chk"
                      checked={chargeFeesToUserChecked}
                      onChange={(e) => setChargeFeesToUserChecked(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="charge-fees-to-user-chk" className="text-[11px] font-bold leading-normal cursor-pointer text-slate-700">
                      Bebankan Iuran Pemeliharaan kepada Wali Murid (Disematkan ke Total Tagihan Online)
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Nominal Surcharge Biaya Pemeliharaan Sistem
                    </label>
                    <div className="relative mt-1 max-w-md">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="0"
                        disabled={!chargeFeesToUserChecked}
                        value={systemMaintenanceFeeInput}
                        onChange={(e) => setSystemMaintenanceFeeInput(parseInt(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-450"
                        placeholder="Contoh: 1500"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Tambahan nominal iuran kas pemeliharaan aplikasi (Contoh Rp 1.500)</span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-250 text-amber-900 text-[11px] leading-relaxed flex flex-col gap-1">
                    <span className="font-bold">⚡ Informasi Biaya Admin Midtrans Otomatis:</span>
                    <p className="m-0">
                      Sistem ini terintegrasi penuh untuk mendukung semua metode pembayaran Snap (Virtual Account, QRIS/GoPay/ShopeePay, Alfa/Indomaret, atau Kartu Kredit). Biaya administrasi Midtrans akan otomatis ditambahkan oleh server Midtrans sendiri di dalam popup Snap kepada Wali Murid (jika fitur Surcharge diaktifkan di Dashboard Portal Midtrans Anda), sehingga nilai tarif admin tidak perlu diatur atau dirawat manual dari aplikasi ini.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold font-sans">Status Koneksi Gateway:</span>
                    {midtransStatus?.hasServerKey && midtransStatus?.clientKey ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                        ● AKTIF ({midtransStatus.isProduction ? 'PRODUCTION' : 'SANDBOX'})
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
                    {isSavingFees ? "Menyimpan Konfigurasi..." : "Simpan Semua Pengaturan 💾"}
                  </button>
                </div>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 text-xs flex flex-col gap-2 leading-relaxed text-blue-900"
            >
              <span className="font-bold">💡 Informasi Penting Untuk Pengembang:</span>
              <p className="m-0 leading-relaxed">
                Untuk menghubungkan dengan akun Midtrans asli milik SMP Maarif NU Pandaan:
              </p>
              <ol className="list-decimal pl-4 m-0 flex flex-col gap-1.5">
                <li>Buka folder project di Cloud Workspace dan sunting berkas <code className="bg-white/75 px-1 rounded font-mono text-[10px]">.env</code></li>
                <li>Atur <code className="bg-white/75 px-1 rounded font-mono text-[10px]">MIDTRANS_MERCHANT_ID</code>, <code className="bg-white/75 px-1 rounded font-mono text-[10px]">MIDTRANS_CLIENT_KEY</code>, dan <code className="bg-white/75 px-1 rounded font-mono text-[10px]">MIDTRANS_SERVER_KEY</code></li>
                <li>
                  Gunakan URL Webhook Midtrans ini pada Dashboard Midtrans Anda agar notifikasi pembayaran terhubung mundur secara real-time:
                  <div className="mt-1.5 bg-slate-900 text-slate-200 font-mono text-[10px] py-1.5 px-3 rounded-lg border border-slate-800 font-semibold break-all select-all">
                    {window.location.origin}/api/midtrans-webhook
                  </div>
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
                <span className="text-lg">📲</span> Pengaturan Whatsapp API Gateway
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Konfigurasikan integrasi pengiriman WhatsApp otomatis untuk pemberitahuan tagihan SPP rutin, kuitansi lunas instan, serta notifikasi masuk & keluar buku Tabungan siswa otomatis.
              </p>
            </div>

            <form onSubmit={handleSaveWaConfig} className="flex flex-col gap-4">
              {waConfigMsg && (
                <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                  waConfigMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {waConfigMsg.type === 'success' ? <Check size={14} className="text-emerald-700" /> : <AlertCircle size={14} className="text-red-750" />}
                  {waConfigMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Pilih Provider Gateway</label>
                  <select
                    value={waProvider}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWaProvider(val);
                      if (val === "Fonnte") {
                        setWaBaseUrl("https://api.fonnte.com/send");
                      } else if (val === "Wablas") {
                        setWaBaseUrl("https://api.wablas.com/api/send-message");
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">API Endpoint Base URL</label>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Nomor Pengirim (Device / ID SIKAT)</label>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Token Otorisasi / API Key</label>
                  <input
                    type="password"
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder="Ketik rahasia token akses API Anda di sini..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono tracking-widest focus:outline-none focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Status & Pengaktifan Otomatis</span>
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
                        onChange={(e) => setWaNotifyOnBilling(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Notif Tagihan Terbit</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-left">
                      <input
                        type="checkbox"
                        checked={waNotifyOnPayment}
                        onChange={(e) => setWaNotifyOnPayment(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Notif Kuitansi SPP Lunas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-left">
                      <input
                        type="checkbox"
                        checked={waNotifyOnSavings}
                        onChange={(e) => setWaNotifyOnSavings(e.target.checked)}
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
                  {isSavingWaConfig ? "Menyimpan..." : "Simpan Konfigurasi Whatsapp 📲"}
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
                  Lakukan simulasi atau pengiriman ril dengan memasukkan nomor target format internasional (misal: <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">628...</code>) untuk memverifikasi keabsahan API Token dari provider yang Anda miliki.
                </p>
              </div>

              <form onSubmit={handleTestWa} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-4 border border-slate-205 border-slate-200">
                <div className="flex flex-col gap-1 md:col-span-1 text-left">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">No. WA Tujuan (Format 62xxx)</label>
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
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Isi Pesan Tes</label>
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
                  <div className={`col-span-1 md:col-span-3 p-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 ${
                    waTestFeedback.success ? "bg-emerald-50 border border-emerald-250 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800"
                  }`}>
                    <span>{waTestFeedback.success ? "✔️" : "⚠️"}</span>
                    <span>{waTestFeedback.text}</span>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
          </div>
        )}

        {/* Tab 4: Student CRUD Management */}
        {adminTab === 'student_mgmt' && (
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

        {/* Tab: Homeroom/Wali Kelas CRUD Management */}
        {adminTab === 'homeroom_mgmt' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">Manajemen Akun Wali Kelas (Absensi)</h3>
                <p className="text-xs text-slate-500 mt-1">Daftarkan dan kelola akun bimbingan wali kelas untuk memberikan otorisasi presensi harian siswa.</p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setImportTeacherType('homeroom');
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
                  {editingHomeroomId ? 'Ubah Informasi Wali Kelas' : 'Daftar Wali Kelas Baru'}
                </h4>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsActionLoading(true);
                    setMgmtError(null);
                    setMgmtSuccess(null);

                    if (formPassword && formPassword.trim().length > 0 && formPassword.trim().length < 6) {
                      setMgmtError('Kata sandi harus minimal 6 karakter!');
                      setIsActionLoading(false);
                      return;
                    }

                    try {
                      if (editingHomeroomId) {
                        if (onUpdateHomeroom) {
                          const res = await onUpdateHomeroom(editingHomeroomId, {
                            username: formUsername,
                            name: formName,
                            className: formClassName,
                            password: formPassword || undefined
                          });
                          if (res) {
                            setMgmtSuccess('Berhasil memperbarui data Wali Kelas!');
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError('Gagal memperbarui data wali kelas.');
                          }
                        }
                      } else {
                        if (onCreateHomeroom) {
                          const res = await onCreateHomeroom({
                            username: formUsername,
                            name: formName,
                            className: formClassName,
                            password: formPassword
                          });
                          if (res) {
                            setMgmtSuccess('Berhasil mendaftarkan Wali Kelas baru!');
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError('Username sudah terpakai atau data tidak valid.');
                          }
                        }
                      }
                    } catch (err) {
                      setMgmtError('Terjadi kesalahan sistem.');
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="flex flex-col gap-4 text-xs"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">Nama Lengkap Wali Kelas</label>
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
                    <label className="font-bold text-slate-650">Bimbingan Kelas (Nama Kelas)</label>
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
                    <label className="font-bold text-slate-650">Username Login</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: sitiaminah7a"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">
                    <label className="font-bold text-amber-850">Kata Sandi {editingHomeroomId ? '(Reset/Ganti Baru)' : '(Sandi Akun Baru) *'}</label>
                    <input
                      type="password"
                      required={!editingHomeroomId}
                      placeholder={editingHomeroomId ? 'Isi untuk mereset sandi wali kelas ini' : 'Masukkan sandi minimal 6 karakter'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                    {editingHomeroomId && (
                      <p className="text-[10px] text-amber-700/85 italic leading-tight font-medium mt-0.5">
                        *Kosongkan saja untuk tetap memakai sandi lama ({editingHomeroomId ? 'Sandi Aktif' : ''}). Isi minimal 6 karakter jika ingin mereset sandi akun ini.
                      </p>
                    )}
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
                      {isActionLoading && <RefreshCw size={11} className="animate-spin" />}
                      <span>{editingHomeroomId ? 'Simpan' : 'Daftarkan'}</span>
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
                      <p className="font-normal text-slate-400 mt-1 max-w-sm">Gunakan form di sebelah kiri untuk menambahkan wali kelas bimbingan presensi harian.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase tracking-wider select-none">
                            <th className="py-2.5 px-4">Nama Lengkap</th>
                            <th className="py-2.5 px-4 text-center">Kelas Binaan</th>
                            <th className="py-2.5 px-4">Username Akun</th>
                            <th className="py-2.5 px-4 text-center">Aksi Operasional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {homerooms.map((hr) => (
                            <tr key={hr.id} className="hover:bg-slate-55">
                              <td className="py-3 px-4 text-left">
                                <span className="font-bold text-slate-800 block">{hr.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal">ID: {hr.id}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded font-black text-[10px] uppercase bg-indigo-50 border border-indigo-100 text-indigo-700">
                                  Kelas {hr.className}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-600 text-left">
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
                                      setFormPassword('');
                                    }}
                                    className="p-1 px-2 border border-slate-200 hover:border-slate-800 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-all"
                                  >
                                    <Edit size={10} />
                                    <span>Ubah</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`Apakah Anda yakin ingin menghapus akun Wali Kelas ${hr.name}? Tindakan ini permanen.`)) {
                                        setIsActionLoading(true);
                                        if (onDeleteHomeroom) {
                                          const ok = await onDeleteHomeroom(hr.id);
                                          if (ok) {
                                            setMgmtSuccess('Wali kelas berhasil dihapus!');
                                            onRefresh();
                                          } else {
                                            setMgmtError('Gagal menghapus wali kelas.');
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
        {adminTab === 'subject_teacher_mgmt' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">Manajemen Akun Guru Mata Pelajaran (KBM & Jurnal)</h3>
                <p className="text-xs text-slate-500 mt-1">Daftarkan dan konfigurasikan akun bagi Guru Mata Pelajaran untuk mengisi Jurnal Pembelajaran dan absensi Mapel.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportTeacherType('subject');
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
                          setMgmtSuccess('Berhasil men-generate otomatis 8 akun Guru Mapel default!');
                          onRefresh();
                        } else {
                          setMgmtError('Gagal melakukan generate otomatis akun Guru Mapel.');
                        }
                      }
                    } catch (e) {
                      setMgmtError('Kendala sistem saat generate akun.');
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
                  {editingSubjectTeacherId ? 'Ubah Informasi Guru Mapel' : 'Daftar Guru Mapel Baru'}
                </h4>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsActionLoading(true);
                    setMgmtError(null);
                    setMgmtSuccess(null);

                    if (!formName.trim() || !formSubject.trim() || !formUsername.trim()) {
                      setMgmtError('Semua kolom wajib diisi lengkap!');
                      setIsActionLoading(false);
                      return;
                    }

                    if (formPassword && formPassword.trim().length > 0 && formPassword.trim().length < 6) {
                      setMgmtError('Kata sandi harus minimal 6 karakter!');
                      setIsActionLoading(false);
                      return;
                    }

                    try {
                      if (editingSubjectTeacherId) {
                        if (onUpdateSubjectTeacher) {
                          const res = await onUpdateSubjectTeacher(editingSubjectTeacherId, {
                            username: formUsername,
                            name: formName,
                            subject: formSubject,
                            password: formPassword || undefined
                          });
                          if (res) {
                            setMgmtSuccess('Berhasil memperbarui data Guru Mapel!');
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError('Gagal memperbarui data Guru Mapel.');
                          }
                        }
                      } else {
                        if (onCreateSubjectTeacher) {
                          const res = await onCreateSubjectTeacher({
                            username: formUsername,
                            name: formName,
                            subject: formSubject,
                            password: formPassword || 'sandi123'
                          });
                          if (res) {
                            setMgmtSuccess('Berhasil mendaftarkan Guru Mapel baru!');
                            resetForm();
                            onRefresh();
                          } else {
                            setMgmtError('Username sudah terpakai atau data tidak valid.');
                          }
                        }
                      }
                    } catch (err) {
                      setMgmtError('Terjadi kesalahan sistem.');
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="flex flex-col gap-4 text-xs"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">Nama Lengkap Guru Mapel</label>
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
                    <label className="font-bold text-slate-650">Kategori Mata Pelajaran (Mapel)</label>
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
                    <label className="font-bold text-slate-650">Username Login</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: ahmadfauzi_mapel"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 bg-teal-50/50 p-3 rounded-lg border border-teal-200/60">
                    <label className="font-bold text-teal-850">Kata Sandi {editingSubjectTeacherId ? '(Ganti Baru)' : '(Sandi Default) *'}</label>
                    <input
                      type="password"
                      placeholder={editingSubjectTeacherId ? 'Isi untuk mereset sandi guru mapel ini' : 'Password default jika kosong: sandi123'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-teal-700/85 italic leading-tight font-medium mt-0.5">
                      {editingSubjectTeacherId ? '*Kosongkan saja untuk tetap memakai sandi lama.' : '*Isi minimal 6 karakter atau kosongkan saja untuk default password "sandi123".'}
                    </p>
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
                      {isActionLoading && <RefreshCw size={11} className="animate-spin" />}
                      <span>{editingSubjectTeacherId ? 'Simpan' : 'Daftarkan'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Table List of Guru Mapel (Right) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center px-5">
                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                      Daftar Guru Mata Pelajaran Aktif ({subjectTeachers.length})
                    </span>
                  </div>

                  {subjectTeachers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Users size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">Belum ada akun Guru Mata Pelajaran terdaftar.</p>
                      <p className="text-[11px] text-slate-400">Daftarkan manual di form sebelah kiri atau gunakan "Generate Otomatis Akun Mapel" di atas.</p>
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
                            <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-extrabold text-slate-900">{st.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {st.id}</div>
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-850 border border-teal-200">
                                  {st.subject}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">{st.username}</td>
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubjectTeacherId(st.id);
                                      setFormName(st.name);
                                      setFormSubject(st.subject);
                                      setFormUsername(st.username);
                                      setFormPassword('');
                                    }}
                                    className="p-1 px-2 border border-slate-200 hover:border-slate-800 bg-white rounded text-[10px] font-bold text-slate-700 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-all"
                                  >
                                    <Edit size={10} />
                                    <span>Ubah</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`Apakah Anda yakin ingin menghapus akun Guru Mapel ${st.name}?`)) {
                                        setIsActionLoading(true);
                                        if (onDeleteSubjectTeacher) {
                                          const res = await onDeleteSubjectTeacher(st.id);
                                          if (res) {
                                            setMgmtSuccess('Berhasil menghapus akun Guru Mapel!');
                                            resetForm();
                                            onRefresh();
                                          } else {
                                            setMgmtError('Gagal menghapus akun Guru Mapel.');
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
        {adminTab === 'student_qr' && (
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
                    <ImageIcon className="text-indigo-600 animate-pulse" size={18} />
                    Sistem Kartu QR Pembayaran Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Cetak dan download kartu QR siswa secara kolektif maupun individual. Kode QR digunakan saat pembayaran tunai (SPP/Tabungan) di loket sekolah agar teller dapat instan mendeteksi profil siswa melalui scan barcode / kamera.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const listToPrint = students.filter(s => {
                        const matchSearch = !studentQrSearch.trim() || 
                          s.name.toLowerCase().includes(studentQrSearch.toLowerCase().trim()) ||
                          s.nis.toLowerCase().includes(studentQrSearch.toLowerCase().trim());
                        const matchClass = studentQrClassFilter === 'all' || 
                          s.class.toLowerCase() === studentQrClassFilter.toLowerCase();
                        return matchSearch && matchClass;
                      });
                      if (listToPrint.length === 0) {
                        alert('Tidak ada kartu siswa untuk dicetak dalam kriteria filter yang aktif!');
                        return;
                      }
                      setQrCardsToPrint(listToPrint);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Cetak Kolektif ({
                      students.filter(s => {
                        const matchSearch = !studentQrSearch.trim() || 
                          s.name.toLowerCase().includes(studentQrSearch.toLowerCase().trim()) ||
                          s.nis.toLowerCase().includes(studentQrSearch.toLowerCase().trim());
                        const matchClass = studentQrClassFilter === 'all' || 
                          s.class.toLowerCase() === studentQrClassFilter.toLowerCase();
                        return matchSearch && matchClass;
                      }).length
                    } Siswa)</span>
                  </button>

                  <button
                    type="button"
                    disabled={downloadingCollectiveQr}
                    onClick={() => {
                      const listToDownload = students.filter(s => {
                        const matchSearch = !studentQrSearch.trim() || 
                          s.name.toLowerCase().includes(studentQrSearch.toLowerCase().trim()) ||
                          s.nis.toLowerCase().includes(studentQrSearch.toLowerCase().trim());
                        const matchClass = studentQrClassFilter === 'all' || 
                          s.class.toLowerCase() === studentQrClassFilter.toLowerCase();
                        return matchSearch && matchClass;
                      });
                      if (listToDownload.length === 0) {
                        alert('Tidak ada QR siswa untuk diunduh dalam kriteria filter yang aktif!');
                        return;
                      }
                      
                      setDownloadingCollectiveQr(true);
                      setCollectiveQrTotal(listToDownload.length);
                      setCollectiveQrProgress(0);
                      
                      let currentIndex = 0;
                      const downloadNext = () => {
                        if (currentIndex >= listToDownload.length) {
                          setDownloadingCollectiveQr(false);
                          return;
                        }
                        const student = listToDownload[currentIndex];
                        const tempCanvas = document.createElement('canvas');
                        QRCode.toCanvas(tempCanvas, student.nis, { 
                          width: 400, 
                          margin: 4,
                          color: {
                            dark: '#0f172a',
                            light: '#ffffff'
                          }
                        }, (error) => {
                          if (error) {
                            console.error(error);
                            currentIndex++;
                            setCollectiveQrProgress(currentIndex);
                            downloadNext();
                            return;
                          }
                          
                          const finalCanvas = document.createElement('canvas');
                          finalCanvas.width = 400;
                          finalCanvas.height = 490;
                          const ctx = finalCanvas.getContext('2d');
                          if (ctx) {
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, 400, 490);
                            ctx.drawImage(tempCanvas, 0, 0);
                            
                            ctx.fillStyle = '#0f172a';
                            ctx.textAlign = 'center';
                            
                            // Name
                            ctx.font = 'bold 20px "Inter", "Helvetica Neue", sans-serif';
                            let displayName = student.name.toUpperCase();
                            if (displayName.length > 28) {
                              displayName = displayName.substring(0, 25) + '...';
                            }
                            ctx.fillText(displayName, 200, 425);
                            
                            // NIS
                            ctx.font = 'bold 16px "JetBrains Mono", monospace';
                            ctx.fillStyle = '#64748b';
                            ctx.fillText(`NIS: ${student.nis}`, 200, 455);
                            
                            const link = document.createElement('a');
                            link.download = `${student.nis}.png`;
                            link.href = finalCanvas.toDataURL('image/png');
                            link.click();
                          }
                          
                          currentIndex++;
                          setCollectiveQrProgress(currentIndex);
                          setTimeout(downloadNext, 120);
                        });
                      };
                      
                      downloadNext();
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                      downloadingCollectiveQr 
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-150'
                    }`}
                  >
                    <Download size={13} />
                    <span>
                      {downloadingCollectiveQr 
                        ? `Mengunduh (${collectiveQrProgress}/${collectiveQrTotal})` 
                        : `Unduh Kolektif QR Saja (${
                            students.filter(s => {
                              const matchSearch = !studentQrSearch.trim() || 
                                s.name.toLowerCase().includes(studentQrSearch.toLowerCase().trim()) ||
                                s.nis.toLowerCase().includes(studentQrSearch.toLowerCase().trim());
                              const matchClass = studentQrClassFilter === 'all' || 
                                s.class.toLowerCase() === studentQrClassFilter.toLowerCase();
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
                      onClick={() => setStudentQrSearch('')}
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
                      <option key={cl} value={cl}>Kelas {cl}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center text-[11px] text-slate-400 font-semibold italic justify-end gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Format Kode QR: Nomor Induk Siswa (NIS)
                </div>
              </div>
            </div>

            {/* Grid display of cards */}
            {(() => {
              const matched = students.filter(s => {
                const matchSearch = !studentQrSearch.trim() || 
                  s.name.toLowerCase().includes(studentQrSearch.toLowerCase().trim()) ||
                  s.nis.toLowerCase().includes(studentQrSearch.toLowerCase().trim());
                const matchClass = studentQrClassFilter === 'all' || 
                  s.class.toLowerCase() === studentQrClassFilter.toLowerCase();
                return matchSearch && matchClass;
              });

              if (matched.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
                    <ImageIcon className="mx-auto text-slate-300 stroke-[1.5] mb-2.5" size={40} />
                    <p className="text-xs font-black text-slate-800">Tidak ada kartu siswa ditemukan</p>
                    <p className="text-[10px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kelas Anda.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matched.map((student) => {
                    // QR content is the Nis for scanning matching NIS search query
                    const qrText = `${student.nis}`;
                    const handleDownloadSingleQr = () => {
                      const tempCanvas = document.createElement('canvas');
                      QRCode.toCanvas(tempCanvas, qrText, { 
                        width: 400, 
                        margin: 4,
                        color: {
                          dark: '#0f172a',
                          light: '#ffffff'
                        }
                      }, (error) => {
                        if (error) {
                          console.error(error);
                          return;
                        }
                        const finalCanvas = document.createElement('canvas');
                        finalCanvas.width = 400;
                        finalCanvas.height = 490;
                        const ctx = finalCanvas.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#ffffff';
                          ctx.fillRect(0, 0, 400, 490);
                          ctx.drawImage(tempCanvas, 0, 0);
                          
                          ctx.fillStyle = '#0f172a';
                          ctx.textAlign = 'center';
                          
                          // Name
                          ctx.font = 'bold 20px "Inter", "Helvetica Neue", sans-serif';
                          let displayName = student.name.toUpperCase();
                          if (displayName.length > 28) {
                            displayName = displayName.substring(0, 25) + '...';
                          }
                          ctx.fillText(displayName, 200, 425);
                          
                          // NIS
                          ctx.font = 'bold 16px "JetBrains Mono", monospace';
                          ctx.fillStyle = '#64748b';
                          ctx.fillText(`NIS: ${student.nis}`, 200, 455);
                          
                          const link = document.createElement('a');
                          link.download = `QR_${student.nis}_KELAS_${student.class}_${student.name.replace(/\s+/g, '_')}.png`;
                          link.href = finalCanvas.toDataURL('image/png');
                          link.click();
                        }
                      });
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
                                  {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                                </h4>
                                <p className="text-[7px] font-black text-emerald-700 uppercase tracking-wider leading-none mt-0.5 truncate">
                                  {schoolIdentity?.subheading || "BERAKHLAK MULIA • BERILMU • BERPRESTASI"}
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
                              <svg viewBox="0 0 24 24" className="w-[42px] h-[42px] text-white/90" fill="currentColor">
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
                              <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">NAMA</span>
                              <span className="text-[12.5px] font-black tracking-wide text-white block uppercase truncate leading-tight mt-0.5" title={student.name}>
                                {student.name}
                              </span>
                            </div>

                            <div>
                              <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">NIS</span>
                              <span className="font-mono text-[11.5px] font-black text-white tracking-wider block leading-none mt-0.5">
                                {student.nis}
                              </span>
                            </div>

                            <div>
                              <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">KELAS</span>
                              <span className="text-[11px] font-black text-white block leading-none uppercase mt-0.5">
                                {student.class}
                              </span>
                            </div>
                          </div>

                          {/* Right: White box for QR */}
                          <div className="bg-white rounded-lg p-2 flex flex-col items-center justify-center w-[102px] h-full shrink-0 shadow-sm z-10 text-slate-900 gap-1 select-none">
                            <span className="text-[7.5px] font-black text-indigo-900 uppercase tracking-tight leading-none text-center">SCAN NIS</span>
                            <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">UNTUK BAYAR</span>

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
        {adminTab === 'laporan' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 w-full"
          >
            {/* Laporan Sub Tabs Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
              <div className="flex gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-lg w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab('harian')}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === 'harian'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center"><Calendar size={12} /> Laporan Harian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab('rekap-spp')}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === 'rekap-spp'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center"><FileCheck size={12} /> Rekap SPP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportSubTab('rekap-tabungan')}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-center font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeReportSubTab === 'rekap-tabungan'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5 justify-center"><BarChart3 size={12} /> Rekap Tabungan</span>
                </button>
              </div>

              {activeReportSubTab === 'harian' && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="font-bold text-slate-500 whitespace-nowrap">Filter Tanggal:</span>
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
                      setReportToPrint('harian');
                      setPrintId('print-report-section');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all w-full sm:w-auto justify-center shadow-xs uppercase tracking-wider font-sans"
                  >
                    <Printer size={12} /> Cetak Laporan 🖨️
                  </button>
                </div>
              )}
            </div>

            {/* ======================= REPORT SUBTAB 1: DAILY HARIAN ======================= */}
            {activeReportSubTab === 'harian' && (() => {
              // Filters
              const sppPaidToday = bills.filter(b => b.status === 'paid' && b.paidAt && b.paidAt.split('T')[0] === currentDateFilter);
              const savingsToday = transactions.filter(t => t.status === 'success' && t.createdAt && t.createdAt.split('T')[0] === currentDateFilter);

              const totalSppTunai = sppPaidToday
                .filter(b => b.paymentMethod === 'cash' || !b.paymentMethod || b.paymentMethod.toLowerCase().includes('tunai') || b.paymentMethod.toLowerCase().includes('manual'))
                .reduce((acc, c) => acc + c.amount, 0);

              const totalSppOnline = sppPaidToday
                .filter(b => b.paymentMethod && !b.paymentMethod.toLowerCase().includes('tunai') && !b.paymentMethod.toLowerCase().includes('cash') && !b.paymentMethod.toLowerCase().includes('manual'))
                .reduce((acc, c) => acc + c.amount, 0);

              const totalTabunganMasuk = savingsToday
                .filter(t => t.type === 'deposit')
                .reduce((acc, c) => acc + c.amount, 0);

              const totalTabunganKeluar = savingsToday
                .filter(t => t.type === 'withdrawal')
                .reduce((acc, c) => acc + c.amount, 0);

              const totalKasMasukLokal = totalSppTunai + totalTabunganMasuk;
              const netKasLokal = totalKasMasukLokal - totalTabunganKeluar;

              return (
                <div className="flex flex-col gap-6">
                  {/* Daily Report Widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPP PAID (CASH/MANUAL)</span>
                      <span className="text-sm font-bold text-emerald-800 font-mono">
                        Rp {totalSppTunai.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400">{sppPaidToday.filter(b => b.paymentMethod === 'cash' || !b.paymentMethod || b.paymentMethod.toLowerCase().includes('manual')).length} Transaksi Hari Ini</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPP PAID (ONLINE SNAP)</span>
                      <span className="text-sm font-bold text-indigo-900 font-mono">
                        Rp {totalSppOnline.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400">{sppPaidToday.filter(b => b.paymentMethod && !b.paymentMethod.toLowerCase().includes('cash') && !b.paymentMethod.toLowerCase().includes('manual')).length} Transaksi Online</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold animate-fade-in">TABUNGAN (SETOR / CASH IN)</span>
                      <span className="text-sm font-bold text-emerald-700 font-mono">
                        Rp {totalTabunganMasuk.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400">{savingsToday.filter(t => t.type === 'deposit').length} Setoran Tunai</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TABUNGAN (PENARIKAN CASH OUT)</span>
                      <span className="text-sm font-bold text-rose-700 font-mono">
                        Rp {totalTabunganKeluar.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400">{savingsToday.filter(t => t.type === 'withdrawal').length} Tarikan Tunai</span>
                    </div>
                  </div>

                  {/* Summary Vault Header */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekonsiliasi Kas Teller Hari Ini (Tanggal {new Date(currentDateFilter).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})})</span>
                      <p className="text-[11px] text-slate-350 mt-1 max-w-xl">
                        Merekapitulasi semua iuran tunai di tempat ditambah setoran tabungan siswa dikurangi penarikan cash. Dana Online Midtrans tidak dihitung di brankas fisik teller.
                      </p>
                    </div>
                    <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 flex flex-col gap-1 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">NET ALIRAN DANA FISIK BRANKAS</span>
                      <span className={`text-base md:text-lg font-bold font-mono ${netKasLokal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Rp {netKasLokal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Dual Grid lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* List 1: SPP Today */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Buku Jurnal SPP Hari Ini ({sppPaidToday.length})</h4>
                        <span className="text-[10px] text-slate-400">Draf siswa pembayar SPP wajib</span>
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
                                <td colSpan={6} className="text-center py-8 text-slate-400 text-[11px] italic">Tidak ada transaksi SPP hari ini.</td>
                              </tr>
                            ) : (
                              sppPaidToday.map(b => {
                                const s = students.find(student => student.id === b.studentId);
                                return (
                                  <tr key={b.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 text-slate-500 font-mono text-[10px]">{b.paidAt ? new Date(b.paidAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                                    <td className="py-2.5 font-bold text-slate-700">
                                      <div>{s?.name || 'Siswa dihapus'}</div>
                                      <div className="text-[9px] text-slate-400 font-semibold font-mono">NIS: {s?.nis || '-'}</div>
                                    </td>
                                    <td className="py-2.5 text-slate-600 font-medium">{b.month} {b.year}</td>
                                    <td className="py-2.5">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700 font-mono">
                                        {b.paymentMethod || 'cash'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-bold text-slate-800">Rp {b.amount.toLocaleString('id-ID')}</td>
                                    <td className="py-2.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReceiptToPrint({ type: 'spp', detail: b, student: s || { id: b.studentId, nis: '-', name: 'Siswa', class: '-', email: '', phone: '', savingsBalance: 0 } });
                                          setPrintId('print-receipt-section');
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
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Arus Mutasi Rekening Tabungan Hari Ini ({savingsToday.length})</h4>
                        <span className="text-[10px] text-slate-400">Total simpanan & tarikan tunai yang divalidasi</span>
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
                                <td colSpan={6} className="text-center py-8 text-slate-400 text-[11px] italic">Tidak ada mutasi tabungan hari ini.</td>
                              </tr>
                            ) : (
                              savingsToday.map(t => {
                                const s = students.find(student => student.id === t.studentId);
                                return (
                                  <tr key={t.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 text-slate-500 font-mono text-[10px]">{new Date(t.createdAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="py-2.5 font-bold text-slate-700">
                                      <div>{s?.name || 'Siswa dihapus'}</div>
                                      <div className="text-[9px] text-slate-400">Kelas {s?.class || '-'}</div>
                                    </td>
                                    <td className="py-2.5">
                                      {t.type === 'deposit' ? (
                                        <span className="text-emerald-750 font-bold text-emerald-600 block"><ArrowDownLeft size={10} className="inline mr-0.5" />SETOR</span>
                                      ) : (
                                        <span className="text-rose-700 font-bold block"><ArrowUpRight size={10} className="inline mr-0.5" />TARIK</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 text-slate-500 italic max-w-[120px] truncate" title={t.notes}>{t.notes || '-'}</td>
                                    <td className={`py-2.5 text-right font-mono font-bold ${t.type === 'deposit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      Rp {t.amount.toLocaleString('id-ID')}
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReceiptToPrint({ type: 'savings', detail: t, student: s || { id: t.studentId, nis: '-', name: 'Siswa', class: '-', email: '', phone: '', savingsBalance: 0 } });
                                          setPrintId('print-receipt-section');
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
            {activeReportSubTab === 'rekap-spp' && (() => {
              // Filters & Computations
              const activeStudents = rekapSppGradeFilter === 'all'
                ? students
                : students.filter(s => s.class.startsWith(rekapSppGradeFilter));

              // Compute SPP matrix for activeStudents
              const summaryMatrix = activeStudents.map(student => {
                const sBills = bills.filter(b => b.studentId === student.id && (rekapSppYearFilter === 'all' || getAcademicYearOfBill(b) === rekapSppYearFilter));
                const paid = sBills.filter(b => b.status === 'paid');
                const unpaid = sBills.filter(b => b.status === 'unpaid');
                const totalPaidNominal = paid.reduce((sum, b) => sum + b.amount, 0);
                const totalUnpaidNominal = unpaid.reduce((sum, b) => sum + b.amount, 0);
                const pct = sBills.length > 0 ? Math.round((paid.length / sBills.length) * 100) : 0;
                return {
                  student,
                  totalBillsCount: sBills.length,
                  paidCount: paid.length,
                  unpaidCount: unpaid.length,
                  totalPaidNominal,
                  totalUnpaidNominal,
                  pct
                };
              });

              const globalTotalPaid = summaryMatrix.reduce((acc, current) => acc + current.totalPaidNominal, 0);
              const globalTotalUnpaid = summaryMatrix.reduce((acc, current) => acc + current.totalUnpaidNominal, 0);

              return (
                <div className="flex flex-col gap-6">
                  {/* Category level selectors and widgets */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 uppercase tracking-wide">Pilih Jenjang:</span>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                          {['all', '7', '8', '9'].map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setRekapSppGradeFilter(lvl)}
                              className={`px-3 py-1 rounded font-bold text-[10px] tracking-wide cursor-pointer transition-all ${
                                rekapSppGradeFilter === lvl ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {lvl === 'all' ? 'SEMUA TINGKAT' : `KELAS ${lvl}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 uppercase tracking-wide">Tahun Ajaran:</span>
                        <select
                          value={rekapSppYearFilter}
                          onChange={(e) => setRekapSppYearFilter(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-slate-205 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-800 transition-all cursor-pointer shadow-xs"
                        >
                          <option value="all">SEMUA TAHUN AJARAN</option>
                          {academicYears.map(year => (
                            <option key={year} value={year}>TA {year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-400 font-semibold block uppercase">Total Dana Masuk SPP</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">Rp {globalTotalPaid.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 border-l border-slate-200 pl-6">
                          <span className="text-[9px] text-slate-400 font-semibold block uppercase">Total Piutang Tertunggak SPP</span>
                          <span className="font-mono font-bold text-rose-700 text-sm">Rp {globalTotalUnpaid.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReportToPrint('rekap-spp');
                          setPrintId('print-report-section');
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
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Rekapitulasi Tagihan SPP Bulanan ({summaryMatrix.length} Siswa)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pantau prosentase kelunasan serta total tunggakan per masing-masing wali murid secara real-time</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-[11px] divide-y divide-slate-100">
                        <thead>
                          <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider pb-2">
                            <th className="pb-2">Ref/NIS</th>
                            <th className="pb-2">Nama Siswa</th>
                            <th className="pb-2">Kelas</th>
                            <th className="pb-2">Progres / Status Lunas</th>
                            <th className="pb-2 text-right">Lunas (Nominal)</th>
                            <th className="pb-2 text-right">Tertunggak (Nominal)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-105">
                          {summaryMatrix.map(({ student, totalBillsCount, paidCount, unpaidCount, totalPaidNominal, totalUnpaidNominal, pct }) => (
                            <tr key={student.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-mono text-slate-500 font-medium">{student.nis}</td>
                              <td className="py-2.5 font-bold text-slate-800">{student.name}</td>
                              <td className="py-2.5 text-slate-650 font-bold">Kelas {student.class}</td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <span className="font-bold font-mono text-[10px]">{pct}%</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">({paidCount}/{totalBillsCount} Bulan)</span>
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-emerald-700">Rp {totalPaidNominal.toLocaleString('id-ID')}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-rose-600">Rp {totalUnpaidNominal.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ======================= REPORT SUBTAB 3: REKAP TABUNGAN ======================= */}
            {activeReportSubTab === 'rekap-tabungan' && (() => {
              const orderedStudentsBySavings = [...students].sort((a,b) => b.savingsBalance - a.savingsBalance);
              const totalGlobalSavings = students.reduce((acc, s) => acc + s.savingsBalance, 0);
              const countActiveAccounts = students.filter(s => s.savingsBalance > 0).length;

              return (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">TOTAL TABUNGAN GLOBAL SMP</span>
                      <span className="text-lg font-bold font-mono text-indigo-900">
                        Rp {totalGlobalSavings.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-500 block leading-tight">Seluruh simpanan aktif siswa yang dititipkan saat ini</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">REKENING TERISI (AKTIF SETOR)</span>
                      <span className="text-lg font-bold font-mono text-emerald-700">
                        {countActiveAccounts} Siswa
                      </span>
                      <span className="text-[9px] text-slate-500 block leading-tight">{Math.round((countActiveAccounts / students.length) * 100)}% Dari total siswa sekolah</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">RATA-RATA SALDO TABUNGAN</span>
                      <span className="text-lg font-bold font-mono text-slate-800">
                        Rp {students.length > 0 ? Math.round(totalGlobalSavings / students.length).toLocaleString('id-ID') : 0}
                      </span>
                      <span className="text-[9px] text-slate-500 block leading-tight">Pembagian rata saldo simpanan per siswa</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Peringkat & Buku Ledger Tabungan Siswa</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Disusun berdasarkan kepemilikan saldo tabungan tertinggi di SMP Maarif NU Pandaan</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReportToPrint('rekap-tabungan');
                          setPrintId('print-report-section');
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
                            <th className="pb-2 text-right">Saldo Tabungan Saat Ini</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-105">
                          {orderedStudentsBySavings.map((student, idx) => (
                            <tr key={student.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-bold text-slate-405">{idx + 1}</td>
                              <td className="py-2.5 font-mono text-slate-500">{student.nis}</td>
                              <td className="py-2.5 font-bold text-slate-800">{student.name}</td>
                              <td className="py-2.5 text-slate-600 font-bold">Kelas {student.class}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                                Rp {student.savingsBalance.toLocaleString('id-ID')}
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
          </motion.div>
        )}
      </div>

      {/* GLOBAL KUITANSI (RECEIPT OVERLAY) POPUP */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-xl w-full flex flex-col gap-6 relative">
            
            {/* Kuitansi core print page section starting here */}
            <div id="print-receipt-section" className="bg-white text-slate-900 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 text-[11px] leading-relaxed relative">
              {/* Paid Status Watermark Badge on the Receipt itself */}
              {((receiptToPrint.type === 'spp' && receiptToPrint.detail.status === 'paid') || 
                receiptToPrint.type === 'consolidated' ||
                (receiptToPrint.type === 'savings' && (receiptToPrint.detail.status === 'success' || !receiptToPrint.detail.status || receiptToPrint.detail.status === 'completed'))) && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 border-4 border-dashed border-emerald-500/15 rounded-2xl px-6 py-2 pointer-events-none select-none z-0">
                  <span className="font-sans font-black tracking-widest text-[36px] uppercase text-emerald-500/15">
                    {receiptToPrint.type === 'consolidated' ? 'LUNAS' : (receiptToPrint.type === 'spp' ? 'LUNAS' : 'SUKSES')}
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
                    <span className="font-extrabold text-slate-800 text-[9px]">KUITANSI RESMI</span>
                    <span>Ref: #{receiptToPrint.detail.id.substring(0,10).toUpperCase()}</span>
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
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                      <span className="text-[8px] text-slate-400 block font-medium mt-0.5">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"} &bull; Telp: {schoolIdentity?.phone || "(0343) 631234"}</span>
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
                      <span className="text-xs font-extrabold text-slate-850">KUITANSI RESMI</span>
                      <span className="text-[8px] text-slate-400 block">Ref: #{receiptToPrint.detail.id.substring(0,10).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient/Student Data Row */}
              <div className="flex flex-col gap-1 text-left pb-3 border-b border-dashed border-slate-300 text-slate-700 font-sans text-xs">
                <div className="grid grid-cols-[120px_12px_1fr] leading-relaxed">
                  <span className="font-bold text-slate-500">Wali Murid/Siswa</span>
                  <span className="text-slate-400 font-bold">:</span>
                  <span className="font-bold text-slate-900">{receiptToPrint.student.name}</span>
                </div>
                <div className="grid grid-cols-[120px_12px_1fr] leading-relaxed">
                  <span className="font-bold text-slate-500">NIS</span>
                  <span className="text-slate-400 font-bold">:</span>
                  <span className="font-mono font-bold text-slate-800">{receiptToPrint.student.nis}</span>
                </div>
                <div className="grid grid-cols-[120px_12px_1fr] leading-relaxed">
                  <span className="font-bold text-slate-500">Kelas</span>
                  <span className="text-slate-400 font-bold">:</span>
                  <span className="font-bold text-slate-800 text-normal">{receiptToPrint.student.class}</span>
                </div>
              </div>

              {/* Transactions details */}
              <div className="flex flex-col gap-3 py-2">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[9px] uppercase text-slate-400">
                  <span>Deskripsi Item Pembayaran</span>
                  <span>Total Rupiah</span>
                </div>
                <div className="flex flex-col gap-2 w-full text-slate-800">
                  {receiptToPrint.type === 'consolidated' ? (
                    receiptToPrint.detail.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-dotted border-slate-200">
                        <div className="flex flex-col text-left">
                          <span className="font-extrabold text-slate-800 text-[11px]">{item.name}</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-none mt-1" dangerouslySetInnerHTML={{ __html: item.desc || '' }}></span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 text-xs text-right shrink-0">Rp {item.amount.toLocaleString('id-ID')},00</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col gap-0.5 text-left">
                        {receiptToPrint.type === 'spp' ? (
                          <>
                            <span className="font-bold text-slate-800 text-xs">Pembayaran Iuran SPP Wajib Bulanan</span>
                            <span className="text-[9px] text-slate-500 font-medium leading-none mt-1">Bulan periodik: {receiptToPrint.detail.month} {receiptToPrint.detail.year} &bull; Metode: {receiptToPrint.detail.paymentMethod?.toUpperCase() || 'CASH / MANUALLY ENTERED'}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-800 text-xs">Mutasi Keuangan Rekening Tabungan</span>
                            <span className="text-[9px] text-slate-500 font-medium leading-none mt-1">{receiptToPrint.detail.type === 'deposit' ? 'Penyetoran Saldo Tunai' : 'Penarikan Saldo Tunai'} &bull; Memo: "{receiptToPrint.detail.notes || 'Transaksi Teller Tabungan'}"</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-xs">Rp {receiptToPrint.detail.amount.toLocaleString('id-ID')},00</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Wordify Terbilang Words */}
              <div className="flex flex-col gap-2">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium italic text-slate-650 text-[10px] text-left">
                  Terbilang: <span className="font-bold not-italic font-sans text-slate-850">#{indonesianWordsForRupiah(receiptToPrint.detail.amount)}#</span>
                </div>
                <div className="text-[9px] text-slate-500 font-semibold pl-1 text-left">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 mt-6 pt-4 border-t border-slate-100 text-[10px]">
                <div className="flex flex-col justify-between h-[120px] text-left">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Wali Murid / Penyetor</span>
                  <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-32 pt-1 text-center font-bold">({receiptToPrint.student.name.substring(0, 16)})</span>
                </div>
                <div className="flex flex-col justify-between items-end h-[120px] text-right relative">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] font-bold text-slate-800 font-sans">
                      Pandaan, {receiptToPrint.type === 'spp'
                        ? (receiptToPrint.detail.paidAt 
                            ? new Date(receiptToPrint.detail.paidAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
                            : (receiptToPrint.detail.status === 'paid' ? new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Belum Lunas'))
                        : (receiptToPrint.type === 'consolidated'
                            ? new Date(receiptToPrint.detail.paidAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
                            : new Date(receiptToPrint.detail.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}))}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                  </div>
                  
                  {/* Signature and Stamp layer for paid/completed receipts */}
                  {((receiptToPrint.type === 'spp' && receiptToPrint.detail.status === 'paid') || 
                    receiptToPrint.type === 'consolidated' ||
                    (receiptToPrint.type === 'savings' && (receiptToPrint.detail.status === 'success' || !receiptToPrint.detail.status || receiptToPrint.detail.status === 'completed'))) && (
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


                  <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-32 pt-1 text-center font-bold">({schoolIdentity?.treasurer || "Bendahara Sekolah"})</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[8px] text-slate-400 mt-2 font-medium">
                Bukti pembayaran sah diterbitkan otomatis oleh {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}. Terima kasih atas partisipasi Anda.
              </div>
            </div>

            {/* Modal Actions at the Bottom */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4 border-t border-slate-100 no-print">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-450">
                Kuitansi Resmi SMP Maarif
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
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
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Pratinjau Cetak Laporan - SMP Ma'Arif Pandaan</span>
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
              <div id="print-report-section" className="bg-white text-slate-950 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 text-[11px] leading-relaxed relative">
                
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
                      <span className="text-[9px] font-black text-slate-850">LAPORAN RESMI</span>
                      <span>Dihasilkan: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
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
                        <span className="text-sm font-black uppercase tracking-wider text-slate-800">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                        <span className="text-[9px] text-slate-400 block font-semibold mt-1">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"}</span>
                        <span className="text-[8px] text-slate-400 block italic leading-none mt-0.5">Telp: {schoolIdentity?.phone || "(0343) 631234"}</span>
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
                        <span className="text-xs font-black text-slate-850">LAPORAN RESMI</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Dihasilkan: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtitle / Title Page */}
                <div className="text-center my-1 text-slate-900">
                  <h2 className="text-sm font-extrabold uppercase tracking-widest underline">
                    {reportToPrint === 'harian' && `Laporan Kas Harian Teller`}
                    {reportToPrint === 'rekap-spp' && `Laporan Rekapitulasi Pembayaran SPP`}
                    {reportToPrint === 'rekap-tabungan' && `Laporan Peringkat & Rekap Buku Tabungan`}
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono mt-1 font-semibold">
                    {reportToPrint === 'harian' && `Periode Tanggal Buku Teller: ${new Date(currentDateFilter).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}`}
                    {reportToPrint === 'rekap-spp' && `Jenjang Filter Tingkat: ${rekapSppGradeFilter === 'all' ? 'SEMUA TINGKAT KELAS 7, 8, & 9' : `KELAS TINGKAT ${rekapSppGradeFilter}`} | Tahun Ajaran Filter: ${rekapSppYearFilter === 'all' ? 'SEMUA TAHUN AJARAN' : `TA ${rekapSppYearFilter}`}`}
                    {reportToPrint === 'rekap-tabungan' && `Disusun Berdasarkan Kepemilikan Saldo Tabungan Terbesar Kelas 7/8/9`}
                  </p>
                </div>

                {/* Report Table Material */}
                {reportToPrint === 'harian' && (() => {
                  const sppPaidToday = bills.filter(b => b.status === 'paid' && b.paidAt && b.paidAt.split('T')[0] === currentDateFilter);
                  const savingsToday = transactions.filter(t => t.status === 'success' && t.createdAt && t.createdAt.split('T')[0] === currentDateFilter);

                  const totalSppTunai = sppPaidToday
                    .filter(b => b.paymentMethod === 'cash' || !b.paymentMethod || b.paymentMethod.toLowerCase().includes('tunai') || b.paymentMethod.toLowerCase().includes('manual'))
                    .reduce((acc, c) => acc + c.amount, 0);

                  const totalSppOnline = sppPaidToday
                    .filter(b => b.paymentMethod && !b.paymentMethod.toLowerCase().includes('tunai') && !b.paymentMethod.toLowerCase().includes('cash') && !b.paymentMethod.toLowerCase().includes('manual'))
                    .reduce((acc, c) => acc + c.amount, 0);

                  const totalTabunganMasuk = savingsToday
                    .filter(t => t.type === 'deposit')
                    .reduce((acc, c) => acc + c.amount, 0);

                  const totalTabunganKeluar = savingsToday
                    .filter(t => t.type === 'withdrawal')
                    .reduce((acc, c) => acc + c.amount, 0);

                  const totalKasMasukLokal = totalSppTunai + totalTabunganMasuk;
                  const netKasLokal = totalKasMasukLokal - totalTabunganKeluar;

                  return (
                    <div className="flex flex-col gap-4 text-slate-900">
                      {/* Sub-Summary Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[9px] border border-slate-350 p-2.5 rounded-lg text-slate-905">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-500">Iuran SPP Tunai/Manual:</span>
                          <span className="font-bold font-mono text-slate-900">Rp {totalSppTunai.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-300 pl-2">
                          <span className="font-bold text-slate-500">Iuran SPP Snap Online:</span>
                          <span className="font-bold font-mono text-slate-900">Rp {totalSppOnline.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-300 pl-2">
                          <span className="font-bold text-slate-500">Setoran Tabungan:</span>
                          <span className="font-bold font-mono text-slate-900">Rp {totalTabunganMasuk.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-300 pl-2">
                          <span className="font-bold text-slate-500">Kredit Penarikan:</span>
                          <span className="font-bold font-mono text-rose-800">Rp {totalTabunganKeluar.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Reconciliation Statement */}
                      <div className="p-2.5 bg-slate-100 rounded border border-slate-300 flex justify-between items-center text-[10px] uppercase font-bold text-slate-900">
                        <span>Net Aliran Brankas Tunai Teller (Manual Tunai Masuk - Tarikan Keluar):</span>
                        <span className="font-mono text-emerald-800">Rp {netKasLokal.toLocaleString('id-ID')},00</span>
                      </div>

                      {/* Cash SPP list */}
                      <div>
                        <h4 className="font-bold text-slate-900 uppercase text-[9px] mb-1.5 font-semibold">1. Rincian Buku Pembayar SPP Terdaftar ({sppPaidToday.length} Transaksi)</h4>
                        <table className="w-full text-left font-sans border-collapse text-[9px]">
                          <thead>
                            <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                              <th className="p-1 px-2 border border-slate-300">Jam</th>
                              <th className="p-1 px-2 border border-slate-300">Siswa / NIS</th>
                              <th className="p-1 px-2 border border-slate-300">Kelas</th>
                              <th className="p-1 px-2 border border-slate-300">Bulan SPP</th>
                              <th className="p-1 px-2 border border-slate-300">Metode</th>
                              <th className="p-1 px-2 border border-slate-300 text-right">Nominal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sppPaidToday.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-3 border border-slate-300 italic text-slate-500">Tidak ada penerimaan SPP pada tanggal ini.</td>
                              </tr>
                            ) : (
                              sppPaidToday.map(b => {
                                const s = students.find(student => student.id === b.studentId);
                                return (
                                  <tr key={b.id} className="border border-slate-300 text-slate-900">
                                    <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">{b.paidAt ? new Date(b.paidAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                                    <td className="p-1 px-2 border border-slate-300 font-semibold">{s?.name || 'Siswa dihapus'} ({s?.nis || '-'})</td>
                                    <td className="p-1 px-2 border border-slate-300">Kelas {s?.class || '-'}</td>
                                    <td className="p-1 px-2 border border-slate-300 font-medium">{b.month} {b.year}</td>
                                    <td className="p-1 px-2 border border-slate-300 uppercase font-bold text-[8px]">{b.paymentMethod || 'cash'}</td>
                                    <td className="p-1 px-2 border border-slate-300 text-right font-mono font-semibold">Rp {b.amount.toLocaleString('id-ID')}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Savings List */}
                      <div className="mt-2 text-slate-900">
                        <h4 className="font-bold text-slate-950 uppercase text-[9px] mb-1.5 font-semibold">2. Mutasi Keuangan Tabungan Siswa ({savingsToday.length} Transaksi)</h4>
                        <table className="w-full text-left font-sans border-collapse text-[9px]">
                          <thead>
                            <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                              <th className="p-1 px-2 border border-slate-300">Jam</th>
                              <th className="p-1 px-2 border border-slate-300">Siswa / NIS</th>
                              <th className="p-1 px-2 border border-slate-300">Kelas</th>
                              <th className="p-1 px-2 border border-slate-300">Jenis Mutasi</th>
                              <th className="p-1 px-2 border border-slate-300">Catatan/Memo</th>
                              <th className="p-1 px-2 border border-slate-300 text-right">Nominal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {savingsToday.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-3 border border-slate-300 italic text-slate-500">Tidak ada penarikan atau setoran tabungan pada tanggal ini.</td>
                              </tr>
                            ) : (
                              savingsToday.map(t => {
                                const s = students.find(student => student.id === t.studentId);
                                return (
                                  <tr key={t.id} className="border border-slate-300 text-slate-900">
                                    <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">{new Date(t.createdAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="p-1 px-2 border border-slate-300 font-semibold">{s?.name || 'Siswa dihapus'} ({s?.nis || '-'})</td>
                                    <td className="p-1 px-2 border border-slate-300">Kelas {s?.class || '-'}</td>
                                    <td className="p-1 px-2 border border-slate-300 font-bold uppercase text-[8px]">
                                      {t.type === 'deposit' ? '🟢 SETORAN (IN)' : '🔴 TARIKAN (OUT)'}
                                    </td>
                                    <td className="p-1 px-2 border border-slate-300 italic font-medium">{t.notes || '-'}</td>
                                    <td className={`p-1 px-2 border border-slate-300 text-right font-mono font-semibold ${t.type === 'deposit' ? 'text-emerald-800' : 'text-rose-800'}`}>
                                      Rp {t.amount.toLocaleString('id-ID')}
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

                {reportToPrint === 'rekap-spp' && (() => {
                  const activeStudents = rekapSppGradeFilter === 'all'
                    ? students
                    : students.filter(s => s.class.startsWith(rekapSppGradeFilter));

                  const summaryMatrix = activeStudents.map(student => {
                    const sBills = bills.filter(b => b.studentId === student.id && (rekapSppYearFilter === 'all' || getAcademicYearOfBill(b) === rekapSppYearFilter));
                    const paid = sBills.filter(b => b.status === 'paid');
                    const unpaid = sBills.filter(b => b.status === 'unpaid');
                    const totalPaidNominal = paid.reduce((sum, b) => sum + b.amount, 0);
                    const totalUnpaidNominal = unpaid.reduce((sum, b) => sum + b.amount, 0);
                    const pct = sBills.length > 0 ? Math.round((paid.length / sBills.length) * 100) : 0;
                    return {
                      student,
                      totalBillsCount: sBills.length,
                      paidCount: paid.length,
                      unpaidCount: unpaid.length,
                      totalPaidNominal,
                      totalUnpaidNominal,
                      pct
                    };
                  });

                  const globalTotalPaid = summaryMatrix.reduce((acc, current) => acc + current.totalPaidNominal, 0);
                  const globalTotalUnpaid = summaryMatrix.reduce((acc, current) => acc + current.totalUnpaidNominal, 0);

                  return (
                    <div className="flex flex-col gap-4 text-slate-900">
                      {/* Financial summary blocks */}
                      <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded-lg text-xs font-bold uppercase text-slate-900">
                        <div className="flex justify-between items-center text-emerald-800">
                          <span>Total Akumulasi Terbayar (Paid SPP):</span>
                          <span className="font-mono">Rp {globalTotalPaid.toLocaleString('id-ID')},00</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-800 border-l border-slate-300 pl-4">
                          <span>Total Tunggakan Aktif (Unpaid SPP):</span>
                          <span className="font-mono">Rp {globalTotalUnpaid.toLocaleString('id-ID')},00</span>
                        </div>
                      </div>

                      {/* Table core */}
                      <table className="w-full text-left font-sans border-collapse text-[9px] mt-2">
                        <thead>
                          <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                            <th className="p-1 px-2 border border-slate-350">NIS</th>
                            <th className="p-1 px-2 border border-slate-350">Nama Lengkap Siswa</th>
                            <th className="p-1 px-2 border border-slate-350">Kelas Belajar</th>
                            <th className="p-1 px-2 border border-slate-350 text-center">Kelunasan (Bulan)</th>
                            <th className="p-1 px-2 border border-slate-350 text-center">Progres %</th>
                            <th className="p-1 px-2 border border-slate-350 text-right">Lunas (Nominal)</th>
                            <th className="p-1 px-2 border border-slate-350 text-right">Tunggakan (Nominal)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryMatrix.map(({ student, totalBillsCount, paidCount, unpaidCount, totalPaidNominal, totalUnpaidNominal, pct }) => (
                            <tr key={student.id} className="border border-slate-300 text-slate-900">
                              <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">{student.nis}</td>
                              <td className="p-1 px-2 border border-slate-300 font-bold">{student.name}</td>
                              <td className="p-1 px-2 border border-slate-300 font-semibold">{student.class}</td>
                              <td className="p-1 px-2 border border-slate-300 text-center">{paidCount} / {totalBillsCount} Bulan</td>
                              <td className="p-1 px-2 border border-slate-300 text-center font-bold font-mono">{pct}%</td>
                              <td className="p-1 px-2 border border-slate-300 text-right font-mono text-emerald-800 font-semibold">Rp {totalPaidNominal.toLocaleString('id-ID')}</td>
                              <td className="p-1 px-2 border border-slate-300 text-right font-mono text-rose-800 font-semibold">Rp {totalUnpaidNominal.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {reportToPrint === 'rekap-tabungan' && (() => {
                  const orderedStudentsBySavings = [...students].sort((a,b) => b.savingsBalance - a.savingsBalance);
                  const totalGlobalSavings = students.reduce((acc, s) => acc + s.savingsBalance, 0);
                  const countActiveAccounts = students.filter(s => s.savingsBalance > 0).length;

                  return (
                    <div className="flex flex-col gap-4 text-slate-900">
                      {/* Widgets */}
                      <div className="grid grid-cols-3 gap-2 border border-slate-300 p-2.5 rounded-lg text-[9px] uppercase font-bold text-slate-950">
                        <div>
                          <span>Total Simpanan Global:</span>
                          <span className="block font-mono text-xs font-black text-slate-900 mt-0.5">Rp {totalGlobalSavings.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="border-l border-slate-300 pl-3">
                          <span>Rekening Aktif Terisi:</span>
                          <span className="block font-mono text-xs font-black text-slate-900 mt-0.5">{countActiveAccounts} Kelas 7/8/9</span>
                        </div>
                        <div className="border-l border-slate-300 pl-3">
                          <span>Rata-rata Saldo Siswa:</span>
                          <span className="block font-mono text-xs font-black text-slate-900 mt-0.5">Rp {students.length > 0 ? Math.round(totalGlobalSavings / students.length).toLocaleString('id-ID') : 0}</span>
                        </div>
                      </div>

                      {/* Main Ledger list */}
                      <table className="w-full text-left font-sans border-collapse text-[9px] mt-2">
                        <thead>
                          <tr className="bg-slate-200 border border-slate-400 text-slate-800 font-bold uppercase text-[8px]">
                            <th className="p-1 px-2 border border-slate-350 text-center" style={{ width: '4%' }}>No</th>
                            <th className="p-1 px-2 border border-slate-350">NIS Siswa</th>
                            <th className="p-1 px-2 border border-slate-350">Nama Lengkap Siswa</th>
                            <th className="p-1 px-2 border border-slate-350 text-center">Kelas</th>
                            <th className="p-1 px-2 border border-slate-350 text-right">Kepemilikan Saldo Tabungan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderedStudentsBySavings.map((student, idx) => (
                            <tr key={student.id} className="border border-slate-300 text-slate-900">
                              <td className="p-1 px-2 border border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-1 px-2 border border-slate-300 font-mono text-[8px]">{student.nis}</td>
                              <td className="p-1 px-2 border border-slate-300 font-bold">{student.name}</td>
                              <td className="p-1 px-2 border border-slate-300 text-center font-semibold">Kelas {student.class}</td>
                              <td className="p-1 px-2 border border-slate-300 text-right font-mono font-black text-slate-900">Rp {student.savingsBalance.toLocaleString('id-ID')},00</td>
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
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Mengetahui, Kepala Sekolah</span>
                    <span className="font-bold text-slate-800 font-sans border-t-2 border-slate-900 w-44 pt-1 text-center">({schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI"})</span>
                  </div>
                  <div className="flex flex-col justify-between items-end h-[85px] text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Diverifikasi & Pertanggungjawaban</span>
                    <span className="font-bold text-slate-800 font-sans border-t-2 border-slate-900 w-44 pt-1 text-center">({schoolIdentity?.treasurer || "Bendahara Sekolah"})</span>
                  </div>
                </div>

                {/* Page number print guidelines footer */}
                <div className="text-center text-[7px] text-slate-400 mt-4 italic">
                  Laporan Rekapitulasi Otomatis & Sah &bull; Dicetak Menggunakan Layanan Sistem Administrasi Akademik Terpadu SMP Maarif NU Pandaan.
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
                  <span className="font-extrabold text-sm">Konfirmasi Void SPP</span>
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
                  <strong>Peringatan Admin:</strong> Tindakan ini akan membatalkan status pembayaran lunas pada transaksi ini. Status tagihan siswa akan kembali menjadi <strong>BELUM LUNAS (UNPAID)</strong>. Pesan notifikasi pembatalan otomatis akan dikirim ke WhatsApp wali murid.
                </div>

                <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px]">
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">Nama Siswa</span>
                    <span className="text-slate-500">:</span>
                    <span className="font-bold text-slate-800">{selectedStudent?.name}</span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">Kelas &amp; NIS</span>
                    <span className="text-slate-500">:</span>
                    <span className="font-mono text-slate-700">Kelas {selectedStudent?.class} &bull; NIS {selectedStudent?.nis}</span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">Bulan Tagihan</span>
                    <span className="text-slate-500">:</span>
                    <span className="font-bold text-slate-800">{billToCancel.month} {billToCancel.year}</span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">Jumlah SPP</span>
                    <span className="text-slate-500">:</span>
                    <span className="font-bold text-slate-900">Rp {billToCancel.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="grid grid-cols-[100px_5px_1fr]">
                    <span className="text-slate-500 font-semibold">No. Transaksi</span>
                    <span className="text-slate-500">:</span>
                    <span className="font-mono text-slate-500 break-all">{billToCancel.orderId}</span>
                  </div>
                </div>

                {cancelFeedback && (
                  <div className={`p-2.5 rounded-lg text-center font-bold text-[10px] ${
                    cancelFeedback.startsWith('✔️') ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
                  }`}>
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
                        setCancelFeedback('✔️ Pembayaran berhasil dibatalkan! Status tagihan kembali offline / UNPAID.');
                        setTimeout(() => {
                          setBillToCancel(null);
                          setCancelFeedback(null);
                        }, 2000);
                      } else {
                        setCancelFeedback(`⚠️ Galat: ${res?.error || 'Gagal memproses pembatalan'}`);
                      }
                    } catch (err) {
                      setCancelFeedback('⚠️ Kesalahan koneksi jaringan.');
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
                  <ImageIcon className="text-indigo-600 animate-pulse" size={17} />
                  <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Pratinjau Cetak Kolektif Kartu QR ({qrCardsToPrint.length} Siswa)</span>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintId('print-report-section');
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
                <div id="print-report-section" className="bg-white text-slate-950 p-4 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 relative">
                  
                  {/* Outer Grid optimized specifically for Print break intervals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                    {qrCardsToPrint.map((student) => {
                      const qrText = `${student.nis}`;
                      return (
                        <div
                          key={student.id}
                          className="border-2 border-dashed border-slate-300 rounded-[24px] p-5 flex flex-col justify-between h-[270px] bg-white text-slate-905 shadow-none break-inside-avoid print:shadow-none print:border-slate-400 print:break-inside-avoid relative overflow-hidden"
                          style={{ pageBreakInside: 'avoid' }}
                        >
                          {/* Inner Header / Kop */}
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
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 text-left shrink-0 w-full">
                              <div className="flex items-center gap-2 min-w-0">
                                {schoolIdentity?.logo ? (
                                  <img
                                    src={schoolIdentity.logo}
                                    alt="Logo"
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
                                    {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                                  </h4>
                                  <p className="text-[7px] font-black text-emerald-700 uppercase tracking-wider leading-none mt-0.5 truncate">
                                    {schoolIdentity?.subheading || "BERAKHLAK MULIA • BERILMU • BERPRESTASI"}
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

                          {/* Beautiful Card Body */}
                          <div className="flex-1 bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-500 rounded-xl p-3 flex items-center justify-between gap-3 relative overflow-hidden text-white mb-2.5">
                            <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-white/[0.04] rounded-l-full blur-xs pointer-events-none" />

                            {/* Left: Avatar frame - vertically aligned and centered with details/QR */}
                            <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 min-w-[70px]">
                              <div className="w-14 h-14 rounded-full border border-white bg-white/20 flex items-center justify-center overflow-hidden shadow-inner relative shrink-0">
                                <svg viewBox="0 0 24 24" className="w-[42px] h-[42px] text-white/90" fill="currentColor">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                              
                              <div className="bg-emerald-950/70 border border-emerald-450/40 px-1.5 py-0.5 rounded-full text-[6px] font-extrabold uppercase tracking-wide leading-none text-emerald-200 shrink-0 text-center scale-[0.9] whitespace-nowrap">
                                SPP & TABUNGAN TUNAI
                              </div>
                            </div>

                            {/* Center Details */}
                            <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 text-left z-10 leading-none">
                              <div className="min-w-0">
                                <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">NAMA</span>
                                <span className="text-[12.5px] font-black tracking-wide text-white block uppercase truncate leading-tight mt-0.5">
                                  {student.name}
                                </span>
                              </div>

                              <div>
                                <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">NIS</span>
                                <span className="font-mono text-[11.5px] font-black text-white tracking-wider block leading-none mt-0.5">
                                  {student.nis}
                                </span>
                              </div>

                              <div>
                                <span className="text-[7.5px] font-black text-emerald-200 uppercase tracking-widest block leading-none">KELAS</span>
                                <span className="text-[11px] font-black text-white block leading-none uppercase mt-0.5">
                                  {student.class}
                                </span>
                              </div>
                            </div>

                            {/* Right: White box for QR */}
                            <div className="bg-white rounded-lg p-2 flex flex-col items-center justify-center w-[102px] h-full shrink-0 shadow-sm z-10 text-slate-900 gap-1">
                              <span className="text-[7.5px] font-black text-indigo-900 uppercase tracking-tight leading-none text-center">SCAN NIS</span>
                              <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">UNTUK BAYAR</span>

                              <div className="p-0.5 bg-white border border-slate-100 rounded-md flex items-center justify-center shrink-0">
                                <StudentQrCode text={student.nis} size={64} />
                              </div>

                              <span className="font-mono text-[8.5px] font-black tracking-widest text-slate-800 leading-none">
                                {student.nis}
                              </span>
                            </div>
                          </div>

                          {/* Cutting Line Cue Footnote */}
                          <div className="text-center text-[7.5px] text-slate-400 uppercase tracking-widest font-extrabold shrink-0">
                            ✂️ Gunting Mengikuti Garis Putus-Putus
                          </div>
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
                    <span>Import Batch {importTeacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mata Pelajaran'} (CSV)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Gunakan template resmi untuk mengimpor dan memperbarui data guru secara massal.</p>
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
                      Unduh Template {importTeacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mapel'}
                    </h4>
                    <p className="text-slate-500 leading-relaxed">
                      Template sudah disertai dengan baris data contoh (sample input) agar Anda dapat memahami format yang valid. Kolom bertanda <span className="font-bold text-amber-600">username</span> bersifat unik (tidak boleh duplikat). Kolom <span className="font-bold text-amber-600">password</span> opsional (bila kosong, sandi default akan dibuat).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadTeacherTemplate(importTeacherType)}
                    className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-bold hover:shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Unduh Template CSV</span>
                  </button>
                </div>

                {/* 2. File Input & Area */}
                <div className="flex flex-col gap-2">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider">Pilih File CSV Hasil Edit Anda</label>
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
                      <span className="font-bold text-slate-700 text-xs">Klik di sini atau seret file CSV Anda</span>
                      <span className="text-slate-400 text-[10px]">Mendukung file .csv dengan pemisah koma (,) atau titik-koma (;)</span>
                    </div>
                  </div>
                </div>

                {/* Notification Area */}
                {teacherImportError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2 max-w-full">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{teacherImportError}</span>
                  </div>
                )}

                {teacherImportSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-800 flex items-start gap-2 max-w-full">
                    <CheckCircle size={15} className="shrink-0 mt-0.5" />
                    <span className="font-bold leading-relaxed">{teacherImportSuccess}</span>
                  </div>
                )}

                {/* 3. Preview Section */}
                {previewTeacherData.length > 0 && (
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-700 uppercase tracking-wider">
                        Pratinjau Data ({previewTeacherData.length} Baris Terdeteksi)
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold leading-none text-right">
                        Sistem mendeteksi kecocokan username untuk menentukan Tambah (+) atau Ubah (~).
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
                              {importTeacherType === 'homeroom' ? 'Kelas Bimbingan' : 'Mata Pelajaran'}
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
                                {importTeacherType === 'homeroom' ? row.className : row.subject}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-400">
                                {row.password ? (
                                  <span className="text-slate-700 font-semibold">{row.password}</span>
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
                    <span>Proses &amp; Simpan {previewTeacherData.length} Baris Ini</span>
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
              const matched = students.find(s => s.nis.toLowerCase() === nis.toLowerCase());
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
            setAdminTab('roster');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${adminTab === 'roster' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Home size={20} className={adminTab === 'roster' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${adminTab === 'roster' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Beranda</span>
        </button>

        {/* Menu 2 (Siswa) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab('student_mgmt');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${adminTab === 'student_mgmt' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <User size={20} className={adminTab === 'student_mgmt' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${adminTab === 'student_mgmt' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Siswa</span>
        </button>

        {/* Menu 3 (Laporan) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab('laporan');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${adminTab === 'laporan' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <BarChart3 size={20} className={adminTab === 'laporan' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${adminTab === 'laporan' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Laporan</span>
        </button>

        {/* Menu 4 (Broadcast) */}
        <button
          type="button"
          onClick={() => {
            setAdminTab('broadcast');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${adminTab === 'broadcast' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <BellRing size={20} className={adminTab === 'broadcast' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${adminTab === 'broadcast' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Broadcast</span>
        </button>

        {/* Menu 5 (Lainnya - 4 kotak, paling kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${showMoreMenu ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={showMoreMenu ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${showMoreMenu ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Pendukung</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Admin Utama</h4>
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
                    setAdminTab('homeroom_mgmt');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">🏫</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Kelola Wali Kelas</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Manajemen pembagian rombongan belajar kelas</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab('subject_teacher_mgmt');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-650 text-lg">📝</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Kelola Guru Mapel</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Kelola daftar penugasan guru pengampu mata pelajaran</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab('student_qr');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">📇</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Cetak QR Kolektif</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Eksportir &amp; cetakan kartu QR identitas siswa massal</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab('config');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-purple-50 rounded-xl text-purple-600 text-lg">⚙️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">WhatsApp &amp; Identitas</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Konfigurasi token gateway WhatsApp &amp; data lembaga</p>
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
                  <span className="p-2 w-fit bg-rose-100 rounded-xl text-rose-600 text-lg">🚪</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-rose-800">Keluar Sistem</h5>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-tight">Keluar aman dari portal kontrol admin pusat</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hour}:${min} WIB`;
  } catch (err) {
    return dateStr;
  }
}

function wordifyAmount(nominal: number): string {
  const words = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (nominal < 12) {
    return words[nominal];
  } else if (nominal < 20) {
    return wordifyAmount(nominal - 10) + " belas";
  } else if (nominal < 100) {
    return wordifyAmount(Math.floor(nominal / 10)) + " puluh " + wordifyAmount(nominal % 10);
  } else if (nominal < 200) {
    return "seratus " + wordifyAmount(nominal - 100);
  } else if (nominal < 1000) {
    return wordifyAmount(Math.floor(nominal / 100)) + " ratus " + wordifyAmount(nominal % 100);
  } else if (nominal < 2000) {
    return "seribu " + wordifyAmount(nominal - 1000);
  } else if (nominal < 1000000) {
    return wordifyAmount(Math.floor(nominal / 1000)) + " ribu " + wordifyAmount(nominal % 1000);
  } else if (nominal < 1000000000) {
    return wordifyAmount(Math.floor(nominal / 1000000)) + " juta " + wordifyAmount(nominal % 1000000);
  }
  return nominal.toString();
}

function indonesianWordsForRupiah(num: number): string {
  const cleanVal = Math.floor(Math.abs(num));
  if (cleanVal === 0) return "Nol Rupiah";
  const str = wordifyAmount(cleanVal).trim().replace(/\s+/g, ' ');
  return str.substring(0, 1).toUpperCase() + str.substring(1) + " Rupiah";
}

