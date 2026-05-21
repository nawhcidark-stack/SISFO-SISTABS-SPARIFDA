import React, { useState, useMemo, useEffect } from 'react';
import { Student, SppBill, SavingsTransaction, SchoolIdentity, HomeroomTeacher } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, BookOpen, Users, Banknote, BellRing, Settings, CheckCircle, Smartphone, User, RefreshCw, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck, Zap, GraduationCap, Check, AlertCircle, Printer, TrendingUp, BarChart3, FileText, Calendar, FileCheck, ImageIcon, UploadCloud, Search, Trash2, Edit, ClipboardCheck } from 'lucide-react';
import StudentManagement from './StudentManagement';

interface AdminPanelProps {
  students: Student[];
  bills: SppBill[];
  transactions: SavingsTransaction[];
  isLoading: boolean;
  midtransStatus: { merchantId: string; clientKey: string; hasServerKey: boolean; isProduction: boolean; adminFee?: number; systemMaintenanceFee?: number; chargeFeesToUser?: boolean } | null;
  onPaySppManual: (billId: string) => Promise<any>;
  onPaySppViaMidtrans?: (bill: SppBill) => Promise<void>;
  adminSppBillToPrint?: string | null;
  onClearAdminSppBillToPrint?: () => void;
  onDepositSavingsViaMidtrans?: (amount: number, studentId?: string) => Promise<void>;
  adminSavingsToPrint?: { studentId: string; orderId: string; amount: number } | null;
  onClearAdminSavingsToPrint?: () => void;
  onSavingsManual: (studentId: string, type: 'deposit' | 'withdrawal', amount: number, notes: string) => Promise<any>;
  onBroadcastNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'payment') => Promise<boolean>;
  onRefresh: () => void;
  onCreateStudent: (data: { nis: string; name: string; class: string; email: string; phone: string; initialSavings: number }) => Promise<boolean>;
  onUpdateStudent: (id: string, data: { nis: string; name: string; class: string; email: string; phone: string }) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onImportStudents: (list: Array<{ nis: string; name: string; class: string; email: string; phone: string; initialSavings: number }>) => Promise<{ success: boolean; addedCount: number; updatedCount: number }>;
  schoolIdentity?: SchoolIdentity;
  onUpdateSchoolIdentity?: (updatedData: Partial<SchoolIdentity>) => Promise<boolean>;
  homerooms?: HomeroomTeacher[];
  onCreateHomeroom?: (data: { username: string; name: string; className: string; password?: string }) => Promise<boolean>;
  onUpdateHomeroom?: (id: string, data: { username?: string; name?: string; className?: string; password?: string }) => Promise<boolean>;
  onDeleteHomeroom?: (id: string) => Promise<boolean>;
}

export default function AdminPanel({
  students,
  bills,
  transactions,
  isLoading,
  midtransStatus,
  onPaySppManual,
  onPaySppViaMidtrans,
  adminSppBillToPrint,
  onClearAdminSppBillToPrint,
  onDepositSavingsViaMidtrans,
  adminSavingsToPrint,
  onClearAdminSavingsToPrint,
  onSavingsManual,
  onBroadcastNotification,
  onRefresh,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportStudents,
  schoolIdentity,
  onUpdateSchoolIdentity,
  homerooms = [],
  onCreateHomeroom,
  onUpdateHomeroom,
  onDeleteHomeroom
}: AdminPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adminTab, setAdminTab] = useState<'roster' | 'broadcast' | 'config' | 'student_mgmt' | 'laporan' | 'homeroom_mgmt'>('roster');
  const [studentSearch, setStudentSearch] = useState('');

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

  // Printing & Receipt States
  const [printId, setPrintId] = useState<string | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{ type: 'spp' | 'savings'; detail: any; student: Student } | null>(null);
  const [reportToPrint, setReportToPrint] = useState<'harian' | 'rekap-spp' | 'rekap-tabungan' | null>(null);
  
  // Student financial subtabs inside roster
  const [studentDetailTab, setStudentDetailTab] = useState<'spp' | 'savings'>('spp');

  // Homeroom mgmt states
  const [editingHomeroomId, setEditingHomeroomId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formClassName, setFormClassName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [mgmtError, setMgmtError] = useState<string | null>(null);
  const [mgmtSuccess, setMgmtSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setEditingHomeroomId(null);
    setFormName('');
    setFormClassName('');
    setFormUsername('');
    setFormPassword('');
    setMgmtError(null);
    setMgmtSuccess(null);
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

  // Midtrans Gateways & Fees States
  const [adminFeeInput, setAdminFeeInput] = useState<number>(4000);
  const [systemMaintenanceFeeInput, setSystemMaintenanceFeeInput] = useState<number>(1500);
  const [chargeFeesToUserChecked, setChargeFeesToUserChecked] = useState<boolean>(true);
  const [isSavingFees, setIsSavingFees] = useState<boolean>(false);
  const [savingFeesMsg, setSavingFeesMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  React.useEffect(() => {
    if (midtransStatus) {
      if (midtransStatus.adminFee !== undefined) setAdminFeeInput(midtransStatus.adminFee);
      if (midtransStatus.systemMaintenanceFee !== undefined) setSystemMaintenanceFeeInput(midtransStatus.systemMaintenanceFee);
      if (midtransStatus.chargeFeesToUser !== undefined) setChargeFeesToUserChecked(midtransStatus.chargeFeesToUser);
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
          merchantId: midtransStatus?.merchantId || "",
          clientKey: midtransStatus?.clientKey || "",
          serverKey: "", 
          isProduction: midtransStatus?.isProduction || false,
          systemMaintenanceFee: systemMaintenanceFeeInput,
          chargeFeesToUser: chargeFeesToUserChecked
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavingFeesMsg({ type: 'success', text: '🎉 Biaya pemeliharaan sistem berhasil diperbarui!' });
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
      letterhead: schoolLetterhead
    });

    if (success) {
      setSchoolIdentityMsg({ type: 'success', text: '🎉 Identitas resmi sekolah berhasil diperbarui dan disiarkan secara waktu nyata.' });
    } else {
      setSchoolIdentityMsg({ type: 'error', text: 'Gagal memperbarui identitas sekolah.' });
    }
    setIsSavingSchoolIdentity(false);
  };

  return (
    <div id="admin-panel-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar Command List */}
      <div className="lg:col-span-3 flex flex-col gap-4">
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
            Kelola & CRUD Siswa
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
      <div className="lg:col-span-9 flex flex-col gap-6">
        {/* Tab 1: Student Roster and Payments */}
        {adminTab === 'roster' && (
          <div className="flex flex-col gap-6">
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
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Update Data Buku Kas"
                  >
                    <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

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
                                              ) : (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">UNPAID</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 text-right">
                                              {b.status === 'paid' ? (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setReceiptToPrint({ type: 'spp', detail: b, student: selectedStudent });
                                                    setPrintId('print-receipt-section');
                                                  }}
                                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-205 border border-slate-200 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 ml-auto cursor-pointer"
                                                >
                                                  <Printer size={10} className="text-indigo-600" /> Cetak 🖨
                                                </button>
                                              ) : (
                                                <div className="flex gap-1 justify-end items-center">
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
                      placeholder="Contoh: Bendahara Madrasah NU"
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

            {/* Midtrans Status */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 text-xs"
            >
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Settings size={16} className="text-indigo-605 text-indigo-600" /> Integrasi Payment Gateway Midtrans
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Aplikasi ini terintegrasi penuh dengan Midtrans Snap API. Kunci-kunci (Keys) diambil langsung oleh Server Node.js di sisi backend dari berkas rahasia lingkungan sistem (.env) demi keamanan API.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">MIDTRANS MERCHANT ID</span>
                  <span className="font-mono text-slate-800 text-xs font-semibold">
                    {midtransStatus?.merchantId || '(Mode Simulasi Aktif)'}
                  </span>
                </div>
                
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">MIDTRANS CLIENT KEY</span>
                  <span className="font-mono text-slate-800 text-xs font-semibold">
                    {midtransStatus?.clientKey || '(Mode Simulasi Aktif)'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm mt-1 text-xs">
                <div>
                  <span className="font-bold text-slate-800">Status Server Key Keamanan:</span>
                  <span className="text-[11px] text-slate-500 block">Kunci Server terenkripsi di server-side untuk melindungi saldo dana sekolah.</span>
                </div>
                <div>
                  {midtransStatus?.hasServerKey ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 font-bold rounded-full bg-emerald-100 text-emerald-800 font-mono text-[9px] uppercase tracking-wide">
                      ✔️ Tersambung
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[9px] uppercase tracking-wide">
                      ⚠️ Simulasi Teller
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Form Pengaturan Biaya Tambahan ditanggung wali murid */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  ⚙️ Pengaturan Beban Biaya Pembayaran Online (Wali Murid)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Tentukan apakah biaya tambahan untuk pemeliharaan sistem dibebankan penuh ke Wali Murid saat melakukan transaksi cicilan/SPP online. Biaya administrasi gerbang pembayaran (Midtrans) otomatis dihitung oleh Midtrans sesuai metode pembayaran yang dipilih (VA, QRIS, Gopay, Kartu Kredit, dll).
                </p>
              </div>

              <form onSubmit={handleSaveMidtransFees} className="flex flex-col gap-4">
                {savingFeesMsg && (
                  <div className={`p-3 rounded-lg font-bold text-xs flex items-center gap-2 ${
                    savingFeesMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {savingFeesMsg.type === 'success' ? <Check size={14} className="text-emerald-700" /> : <AlertCircle size={14} className="text-red-700" />}
                    {savingFeesMsg.text}
                  </div>
                )}

                <div className="flex items-center gap-2.5 px-1 py-1 text-slate-600 select-none">
                  <input
                    type="checkbox"
                    id="charge-fees-to-user-chk"
                    checked={chargeFeesToUserChecked}
                    onChange={(e) => setChargeFeesToUserChecked(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="charge-fees-to-user-chk" className="text-[11px] font-bold leading-normal cursor-pointer text-slate-700">
                    Bebankan Iuran Pemeliharaan kepada Wali Murid (Disematkan ke Total Tagihan Online)
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                      Nominal Biaya Pemeliharaan Sistem
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="0"
                        disabled={!chargeFeesToUserChecked}
                        value={systemMaintenanceFeeInput}
                        onChange={(e) => setSystemMaintenanceFeeInput(parseInt(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-450"
                        placeholder="Contoh: 1500"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Tambahan nominal iuran kas pemeliharaan aplikasi (Contoh Rp 1.500)</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-250 text-amber-900 text-[11px] leading-relaxed flex flex-col gap-1">
                  <span className="font-bold">⚡ Informasi Biaya Admin Midtrans Otomatis:</span>
                  <p className="m-0">
                    Sistem ini terintegrasi penuh untuk mendukung semua metode pembayaran Snap (Virtual Account, QRIS/GoPay/ShopeePay, Alfa/Indomaret, atau Kartu Kredit). Biaya administrasi Midtrans akan otomatis ditambahkan oleh server Midtrans sendiri di dalam popup Snap kepada Wali Murid (jika fitur Surcharge diaktifkan di Dashboard Portal Midtrans Anda), sehingga nilai tarif admin tidak perlu diatur atau dirawat manual dari aplikasi ini.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSavingFees}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] self-start transition-all cursor-pointer shadow-xs"
                >
                  {isSavingFees ? "Menyimpan..." : "Simpan Pengaturan Biaya Pembayaran 💾"}
                </button>
              </form>
            </div>

            <div className="p-4 rounded-xl border border-blue-250 border-blue-200 bg-blue-50/20 text-xs flex flex-col gap-2 leading-relaxed text-blue-900">
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
            </div>
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

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-650">Kata Sandi {editingHomeroomId && '(Kosongkan jika tidak diubah)'}</label>
                    <input
                      type="password"
                      required={!editingHomeroomId}
                      placeholder={editingHomeroomId ? '••••••••' : 'Masukkan sandi minimal 6 karakter'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-850 bg-white focus:outline-none focus:border-slate-800"
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
                      <span className="text-[9px] text-slate-500 block leading-tight">{Math.round((countActiveAccounts / students.length) * 100)}% Dari total siswa madrasah</span>
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
            
            {/* Action buttons inside modal overlay */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-450">Kuitansi Resmi SMP Maarif</span>
              <div className="flex gap-2">
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

            {/* Kuitansi core print page section starting here */}
            <div id="print-receipt-section" className="bg-white text-slate-900 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 text-[11px] leading-relaxed relative">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 text-slate-700 pb-4 border-b border-dashed border-slate-300">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider block">Wali Murid / Siswa</span>
                  <span className="font-bold text-slate-800">{receiptToPrint.student.name}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-455 uppercase tracking-wider block">NIS Siswa</span>
                  <span className="font-mono font-semibold text-slate-700">{receiptToPrint.student.nis}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-455 uppercase tracking-wider block">Pendidikan / Kelas</span>
                  <span className="font-bold text-slate-800">Kelas {receiptToPrint.student.class}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider block">Tanggal Cetak</span>
                  <span className="font-medium text-slate-600 block">{new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                </div>
              </div>

              {/* Transactions details */}
              <div className="flex flex-col gap-3 py-2">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[9px] uppercase text-slate-400">
                  <span>Deskripsi Item Pembayaran</span>
                  <span>Total Rupiah</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <div className="flex flex-col gap-0.5">
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
              </div>

              {/* Wordify Terbilang Words */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium italic text-slate-650 text-[10px]">
                Terbilang: <span className="font-bold not-italic font-sans text-slate-850">#{indonesianWordsForRupiah(receiptToPrint.detail.amount)}#</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 mt-6 pt-4 border-t border-slate-100 text-[10px]">
                <div className="flex flex-col justify-between h-[80px] text-left">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Wali Murid / Penyetor</span>
                  <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-32 pt-1 text-center">({receiptToPrint.student.name.substring(0, 16)})</span>
                </div>
                <div className="flex flex-col justify-between items-end h-[80px] text-right">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                  <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-32 pt-1 text-center font-bold">({schoolIdentity?.treasurer || "Bendahara Madrasah NU"})</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[8px] text-slate-400 mt-2 font-medium">
                Bukti pembayaran sah diterbitkan otomatis oleh {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}. Terima kasih atas partisipasi Anda.
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
                    <span className="font-bold text-slate-800 font-sans border-t-2 border-slate-900 w-44 pt-1 text-center">({schoolIdentity?.treasurer || "Bendahara Madrasah NU"})</span>
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

