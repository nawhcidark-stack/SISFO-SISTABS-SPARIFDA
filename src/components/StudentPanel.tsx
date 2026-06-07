import React, { useState, useEffect, useMemo } from 'react';
import { Student, SppBill, SavingsTransaction, SchoolIdentity, AttendanceLog, RealtimeNotification, TeachingJournal, StudentDevelopmentLog, StudentInfractionLog, StudentCounselingLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, User, CreditCard, Wallet, Landmark, ArrowUpRight, ArrowDownLeft, Clock, RefreshCw, Send, CheckCircle2, ChevronRight, Check, Key, AlertCircle, Info, CalendarRange, Printer, Download, Home, History, Bell, BookOpen, ClipboardList, QrCode, Lock, LayoutGrid, Smartphone, Apple } from 'lucide-react';
import QRCode from 'qrcode';
import StudentPaymentCard from './StudentPaymentCard';

// Component for rendering beautifully styled, local QR Codes without API dependency
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

interface StudentPanelProps {
  students: Student[];
  currentStudent: Student | null;
  bills: SppBill[];
  transactions: SavingsTransaction[];
  isLoading: boolean;
  onSelectStudent: (id: string) => void;
  onPaySpp: (bill: SppBill) => void;
  onDepositSavings: (amount: number) => void;
  onWithdrawSavings: (amount: number, notes: string) => Promise<boolean>;
  onRefresh: () => void;
  onChangePassword?: (studentId: string, oldPassword?: string, newPassword?: string) => Promise<{ success: boolean; error?: string }>;
  isLoginLocked?: boolean;
  schoolIdentity?: SchoolIdentity;
  attendanceLogs?: AttendanceLog[];
  notifications?: RealtimeNotification[];
  onLogout?: () => void;
  midtransStatus?: {
    merchantId: string;
    clientKey: string;
    hasServerKey: boolean;
    isProduction: boolean;
    isDisabled?: boolean;
    adminFee?: number;
    systemMaintenanceFee?: number;
    chargeFeesToUser?: boolean;
  } | null;
}

export default function StudentPanel({
  students,
  currentStudent,
  bills,
  transactions,
  isLoading,
  onSelectStudent,
  onPaySpp,
  onDepositSavings,
  onWithdrawSavings,
  onRefresh,
  onChangePassword,
  isLoginLocked = false,
  schoolIdentity,
  attendanceLogs = [],
  notifications = [],
  onLogout,
  midtransStatus
}: StudentPanelProps) {
  const [activeTab, setActiveTab] = useState<'spp' | 'tabungan' | 'absensi' | 'kartu_qr' | 'jurnal_catatan'>('spp');
  const [printQrCard, setPrintQrCard] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'beranda' | 'log' | 'lonceng' | 'orang'>('beranda');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mobileNotifSearch, setMobileNotifSearch] = useState('');
  const [mobileLogFilter, setMobileLogFilter] = useState<'all' | 'savings' | 'spp'>('all');
  
  // Subject Teacher journals and attendance data states
  const [teachingJournals, setTeachingJournals] = useState<TeachingJournal[]>([]);
  const [loadingJournals, setLoadingJournals] = useState<boolean>(false);
  const [attendanceSubTab, setAttendanceSubTab] = useState<'harian' | 'mapel'>('harian');

  // Student synchronized journals/logs states
  const [devLogs, setDevLogs] = useState<StudentDevelopmentLog[]>([]);
  const [infractionLogs, setInfractionLogs] = useState<StudentInfractionLog[]>([]);
  const [counselingLogs, setCounselingLogs] = useState<StudentCounselingLog[]>([]);
  const [loadingStudentLogs, setLoadingStudentLogs] = useState<boolean>(false);
  const [journalSubTab, setJournalSubTab] = useState<'perkembangan' | 'pelanggaran' | 'bimbingan'>('perkembangan');

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('student_read_notif_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Fetch teaching journals from server to extract subject student attendance
  useEffect(() => {
    if (currentStudent) {
      setLoadingJournals(true);
      fetch('/api/teaching-journals')
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Gagal mengambil data jurnal mapel');
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setTeachingJournals(data);
          }
        })
        .catch((err) => console.error("Error fetching teaching journals inside student panel:", err))
        .finally(() => setLoadingJournals(false));
    }
  }, [currentStudent]);

  // Fetch synchronized student development, infraction, and counseling logs on load / selection
  useEffect(() => {
    if (currentStudent) {
      setLoadingStudentLogs(true);
      Promise.all([
        fetch('/api/student-development-logs').then(res => res.ok ? res.json() : []),
        fetch('/api/student-infraction-logs').then(res => res.ok ? res.json() : []),
        fetch('/api/student-counseling-logs').then(res => res.ok ? res.json() : [])
      ])
        .then(([devData, infData, counData]) => {
          if (Array.isArray(devData)) {
            setDevLogs(devData.filter(log => log.studentId === currentStudent.id));
          }
          if (Array.isArray(infData)) {
            setInfractionLogs(infData.filter(log => log.studentId === currentStudent.id));
          }
          if (Array.isArray(counData)) {
            setCounselingLogs(counData.filter(log => log.studentId === currentStudent.id));
          }
        })
        .catch((err) => console.error("Error fetching personal student logs inside student panel:", err))
        .finally(() => setLoadingStudentLogs(false));
    }
  }, [currentStudent, isLoading]);

  const totalInfractionPoints = useMemo(() => {
    return infractionLogs.reduce((acc, log) => acc + (log.points || 0), 0);
  }, [infractionLogs]);

  // Memoized subject attendance entries for current student
  const studentSubjectAttendance = useMemo(() => {
    if (!currentStudent) return [];
    
    interface SubjectAttItem {
      journalId: string;
      date: string;
      subject: string;
      teacherName: string;
      topic: string;
      status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
      notes?: string;
      jamKe?: string;
    }

    const list: SubjectAttItem[] = [];

    for (const journal of teachingJournals) {
      if (!journal.attendance) continue;
      const entry = journal.attendance.find(a => a.studentId === currentStudent.id);
      if (entry) {
        list.push({
          journalId: journal.id,
          date: journal.date,
          subject: journal.subject,
          teacherName: journal.teacherName,
          topic: journal.topic,
          status: entry.status as any,
          notes: entry.notes || journal.notes,
          jamKe: journal.jamKe
        });
      }
    }

    // Sort descending by date
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [teachingJournals, currentStudent]);

  useEffect(() => {
    if (mobileTab === 'lonceng' && notifications.length > 0) {
      const allIds = notifications.map(n => n.id);
      setReadNotifIds(prev => {
        const merged = Array.from(new Set([...prev, ...allIds]));
        localStorage.setItem('student_read_notif_ids', JSON.stringify(merged));
        return merged;
      });
    }
  }, [mobileTab, notifications]);

  // Calculate dynamic SPP nominal
  let sppRateAmount = 150000;
  if (schoolIdentity?.sppRates && currentStudent) {
    const cls = currentStudent.class.trim().toUpperCase();
    if (cls.startsWith('7') || cls.startsWith('VII')) {
      sppRateAmount = schoolIdentity.sppRates.grade7;
    } else if (cls.startsWith('8') || cls.startsWith('VIII')) {
      sppRateAmount = schoolIdentity.sppRates.grade8;
    } else if (cls.startsWith('9') || cls.startsWith('IX')) {
      sppRateAmount = schoolIdentity.sppRates.grade9;
    } else {
      sppRateAmount = bills.length > 0 ? bills[0].amount : schoolIdentity.sppRates.grade7;
    }
  } else if (bills.length > 0) {
    sppRateAmount = bills[0].amount;
  }
  const [topUpAmount, setTopUpAmount] = useState<string>('50000');
  const [customTopUp, setCustomTopUp] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNotes, setWithdrawNotes] = useState<string>('Tarik tunai keperluan sekolah');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Password Update States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !onChangePassword) return;

    if (newPassword.length < 6) {
      setPasswordError('Sandi baru harus berjumlah minimal 6 karakter.');
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const res = await onChangePassword(currentStudent.id, oldPassword, newPassword);
    setChangingPassword(false);

    if (res.success) {
      setPasswordSuccess('🎉 Sandi akun berhasil diperbarui secara aman.');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess(null);
      }, 3000);
    } else {
      setPasswordError(res.error || 'Gagal mengubah sandi akun.');
    }
  };

  // Invoice/Receipt state & download helpers
  const [receiptToPrint, setReceiptToPrint] = useState<{ type: 'spp' | 'savings'; detail: any; student: Student } | null>(null);
  const [receiptPrintFormat, setReceiptPrintFormat] = useState<'standard' | 'thermal'>('standard');

  const wordifyAmount = (nominal: number): string => {
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
  };

  const indonesianWordsForRupiah = (num: number): string => {
    const cleanVal = Math.floor(Math.abs(num));
    if (cleanVal === 0) return "Nol Rupiah";
    const str = wordifyAmount(cleanVal).trim().replace(/\s+/g, ' ');
    return str.substring(0, 1).toUpperCase() + str.substring(1) + " Rupiah";
  };

  const handleDownloadInvoice = (type: 'spp' | 'savings', detail: any, student: Student, sIdentity?: SchoolIdentity) => {
    const refNum = detail.id.substring(0, 10).toUpperCase();
    const dateStr = new Date(detail.paidAt || detail.createdAt || '').toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
    const wordified = indonesianWordsForRupiah(detail.amount);
    
    let itemTitle = "";
    let itemSubtitle = "";
    if (type === 'spp') {
      itemTitle = "Pembayaran Iuran SPP Wajib Bulanan";
      itemSubtitle = `Bulan periodik: ${detail.month} ${detail.year} • Metode: ${detail.paymentMethod?.toUpperCase() || 'ONLINE/MANUAL'}`;
    } else {
      itemTitle = "Mutasi Keuangan Rekening Tabungan";
      itemSubtitle = `${detail.type === 'deposit' ? 'Penyetoran Saldo Tunai' : 'Penarikan Saldo Tunai'} • Memo: "${detail.notes || 'Transaksi Teller Tabungan'}"`;
    }

    const schoolLogoStr = sIdentity?.logo ? `<img src="${sIdentity.logo}" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo" />` : '';
    const schoolLogo2Str = sIdentity?.logo2 ? `<img src="${sIdentity.logo2}" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo 2" />` : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice Kuitansi #${refNum}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
    }
    .invoice-card {
      background-color: #ffffff;
      max-width: 650px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
      padding: 35px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 3px double #0d9488;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .school-info {
      text-align: left;
      padding-left: 15px;
    }
    .school-name {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .school-sub {
      font-size: 10px;
      color: #0d9488;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      font-weight: 700;
    }
    .school-meta {
      font-size: 9px;
      color: #64748b;
      margin: 4px 0 0 0;
    }
    .title-area {
      text-align: right;
    }
    .doc-type {
      font-size: 16px;
      font-weight: 800;
      color: #1d4ed8;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-ref {
      font-family: monospace;
      font-size: 10px;
      color: #64748b;
      margin: 3px 0 0 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px dashed #cbd5e1;
      margin-bottom: 20px;
    }
    .meta-td {
      width: 25%;
      padding-bottom: 12px;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      display: block;
      margin-bottom: 3px;
    }
    .meta-val {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .details-table th {
      border-bottom: 2px solid #e2e8f0;
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
      padding: 8px 0;
      font-weight: 700;
      text-align: left;
    }
    .details-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .item-desc {
      font-weight: 700;
      font-size: 12px;
      color: #1e293b;
    }
    .item-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
    }
    .item-total {
      font-family: monospace;
      font-weight: 750;
      font-size: 13px;
      color: #0f172a;
      text-align: right;
    }
    .wordify-box {
      background-color: #f0fdf4;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #bbf7d0;
      font-style: italic;
      color: #166534;
      font-size: 11px;
      margin-bottom: 25px;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }
    .sig-td {
      width: 50%;
      vertical-align: top;
    }
    .sig-label {
      font-size: 9px;
      font-weight: bold;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .sig-line {
      font-weight: bold;
      color: #334155;
      display: inline-block;
      width: 180px;
      border-top: 1px solid #cbd5e1;
      padding-top: 5px;
      margin-top: 65px;
      text-align: center;
      font-size: 11px;
    }
    .class-badge {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #1d4ed8;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .action-bar {
      margin-bottom: 20px;
      text-align: center;
    }
    .btn {
      background-color: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      cursor: pointer;
      margin: 0 5px;
      box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);
    }
    .btn:hover {
      background-color: #047857;
    }
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .action-bar {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar row-layout">
    <button class="btn" onclick="window.print()">Cetak Invoice 🖨️</button>
  </div>
  
  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td style="width: 50px; vertical-align: middle;">
          ${schoolLogoStr}
        </td>
        <td class="school-info" style="vertical-align: middle;">
          <h1 class="school-name">${sIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</h1>
          <h2 class="school-sub">${sIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</h2>
          <p class="school-meta">${sIdentity?.accreditation || "Terakreditasi A"} &bull; ${sIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"} &bull; Telp: ${sIdentity?.phone || "(0343) 631234"}</p>
        </td>
        <td style="width: 50px; text-align: right; vertical-align: middle;">
          ${schoolLogo2Str}
        </td>
        <td class="title-area" style="vertical-align: middle; padding-left: 15px;">
          <h1 class="doc-type">Invoice Resmi</h1>
          <p class="doc-ref">Ref: #${refNum}</p>
        </td>
      </tr>
    </table>

    <table class="meta-table">
      <tr>
        <td class="meta-td">
          <span class="meta-label">Nama Siswa</span>
          <span class="meta-val">${student.name}</span>
        </td>
        <td class="meta-td">
          <span class="meta-label">ID / NIS</span>
          <span class="meta-val">${student.nis}</span>
        </td>
        <td class="meta-td">
          <span class="meta-label">Pendidikan / Kelas</span>
          <span class="meta-val">Kelas ${student.class}</span>
        </td>
      </tr>
    </table>

    <table class="details-table">
      <thead>
        <tr>
          <th>Deskripsi Pembayaran</th>
          <th style="text-align: right;">Jumlah Nominal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-desc">${itemTitle}</div>
            <div class="item-sub">${itemSubtitle}</div>
          </td>
          <td class="item-total">Rp ${detail.amount.toLocaleString('id-ID')},00</td>
        </tr>
      </tbody>
    </table>

    <div class="wordify-box">
      Terbilang: <strong>#${wordified}#</strong>
      <div style="font-size: 9px; color: #166534; font-style: normal; margin-top: 5px; font-weight: bold;">
        Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
      </div>
    </div>

    <table class="sig-table">
      <tr>
        <td class="sig-td" style="text-align: left;">
          <span class="sig-label">Wali Murid / Pembayar</span>
          <br />
          <span class="sig-line" style="margin-top: 48px;">(${student.name.substring(0, 16)})</span>
        </td>
        <td class="sig-td" style="text-align: right;">
          <span style="font-size: 11px; font-weight: bold; color: #1e293b; display: block; margin-bottom: 2px;">Pandaan, ${dateStr}</span>
          <span class="sig-label">${sIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
          <br />
          <span class="sig-line" style="margin-top: 25px;">(${sIdentity?.treasurer || "Bendahara Sekolah"})</span>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${type}_${student.nis}_${refNum}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick select chip helper for deposits
  const presetAmounts = ['50000', '100000', '250000', '500000'];

  // Helper to get academic year of a bill
  const getAcademicYearOfBill = (bill: SppBill) => {
    const startYear = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"].includes(bill.month)
      ? bill.year
      : bill.year - 1;
    return `${startYear}/${startYear + 1}`;
  };

  // Helper to determine active / inactive state of an SPP bill
  const checkIsBillActive = (bill: SppBill, allBills: SppBill[]) => {
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
    const priorBills = allBills.filter(b => {
      const bMonthIdx = MONTH_MAP[b.month] !== undefined ? MONTH_MAP[b.month] : 0;
      const bScore = b.year * 12 + bMonthIdx;
      return bScore < billScore;
    });

    return priorBills.every(b => b.status === 'paid');
  };

  // Get list of unique academic years present in the bills list
  const academicYears = useMemo(() => {
    const years = Array.from(new Set(bills.map(getAcademicYearOfBill)));
    return years.sort((a, b) => b.localeCompare(a)); // Sort latest first
  }, [bills]);

  // Track selected academic year
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');

  // Auto-select latest year
  useEffect(() => {
    if (academicYears.length > 0) {
      if (!selectedAcademicYear || !academicYears.includes(selectedAcademicYear)) {
        setSelectedAcademicYear(academicYears[0]);
      }
    }
  }, [academicYears, selectedAcademicYear]);

  // Sort months in school calendar standard index: Juli = 0, ... Juni = 11
  const monthOrder = useMemo(() => [
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    "Januari", "Februari", "Maret", "April", "Mei", "Juni"
  ], []);

  // Filter & sort bills by academic year
  const filteredBills = useMemo(() => {
    let result = bills;
    if (selectedAcademicYear) {
      const selectedStartYear = parseInt(selectedAcademicYear.split('/')[0], 10);
      result = bills.filter(b => {
        const billYearStr = getAcademicYearOfBill(b);
        if (billYearStr === selectedAcademicYear) return true;
        // Include unpaid bills from previous academic years
        const billStartYear = parseInt(billYearStr.split('/')[0], 10);
        if (billStartYear < selectedStartYear && b.status === 'unpaid') {
          return true;
        }
        return false;
      });
    }
    return [...result].sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  }, [bills, selectedAcademicYear, monthOrder]);

  const unpaidBillsCount = useMemo(() => filteredBills.filter(b => b.status === 'unpaid').length, [filteredBills]);
  const paidBillsCount = useMemo(() => filteredBills.filter(b => b.status === 'paid').length, [filteredBills]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!currentStudent || isNaN(amount) || amount <= 0) return;
    if (amount > currentStudent.savingsBalance) {
      alert('Maaf, saldo tabungan Anda tidak mencukupi.');
      return;
    }

    setWithdrawing(true);
    const success = await onWithdrawSavings(amount, withdrawNotes);
    setWithdrawing(false);
    if (success) {
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      setWithdrawNotes('Tarik tunai keperluan sekolah');
      setTimeout(() => setWithdrawSuccess(false), 3000);
    }
  };

  if (!currentStudent) {
    return (
      <div id="student-panel-loading" className="col-span-12 flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-3xs">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">Memuat Data Siswa...</h3>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-sm">
          Silakan tunggu sebentar sementara sistem menyinkronkan profil Anda dari Server SMP Maarif NU Pandaan.
        </p>
      </div>
    );
  }

  return (
    <div id="student-panel-root" className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-24 md:pb-0">
      {/* Left Column: Account Selector and Profile Details */}
      <div className={`md:col-span-4 flex flex-col gap-6 ${mobileTab === 'beranda' ? 'flex' : 'hidden md:flex'}`}>
        {/* Student Selector */}
        {isLoginLocked ? (
          <div className="bg-gradient-to-r from-blue-700 to-emerald-600 border-4 border-emerald-400 text-white p-5 rounded-xl shadow-lg relative overflow-hidden flex items-center gap-3">
            <div className="absolute right-0 bottom-0 text-emerald-800/20 translate-x-3 translate-y-3 pointer-events-none">
              <GraduationCap size={72} className="rotate-12" />
            </div>
            <div className="z-10">
              <span className="text-[9px] font-black text-yellow-300 uppercase tracking-widest block mb-1">Status Sesi Masuk</span>
              <h4 className="font-extrabold text-[12px] leading-tight flex items-center gap-1.5 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-ping inline-block" /> Terhubung Sesi Orang Tua
              </h4>
              <p className="text-[10px] text-slate-100 mt-1.5 leading-relaxed">
                Anda masuk secara resmi untuk memonitor keuangan, setor tabungan, atau bayar SPP murid di bawah ini.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pilih Akun Siswa & Wali Murid
            </label>
            <div className="relative">
              <select
                id="student-select"
                value={currentStudent?.id || ''}
                onChange={(e) => onSelectStudent(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-slate-800 focus:ring-1 focus:ring-slate-850 transition-all font-semibold text-slate-800 appearance-none"
              >
                <option value="" disabled>-- Pilih Siswa --</option>
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.nis}) - Kelas {std.class}
                  </option>
                ))}
              </select>
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={15} />
              </div>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 border-l border-slate-200 pl-2 text-[10px] font-bold">
                SWITCH
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">
              *Silakan ganti siswa untuk mensimulasikan login wali murid yang berbeda.
            </p>
          </div>
        )}

        {/* Profile Card & Balances */}
        {currentStudent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Student Profile Card */}
            <div className="hidden md:block bg-slate-900 text-slate-200 p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden">
              {/* Decorative branding elements */}
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-indigo-500/10 blur-xl" />
              
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-800 border border-slate-700 text-[10px] px-2.5 py-1 rounded text-slate-300 font-semibold font-mono">
                  NIS: {currentStudent.nis}
                </span>
                <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded tracking-wider">
                  Kelas {currentStudent.class}
                </span>
              </div>

              <h3 className="text-base font-bold truncate leading-tight tracking-tight text-white mb-1">
                {currentStudent.name}
              </h3>
              <p className="text-slate-400 text-xs">{schoolIdentity?.name || "SMP Maarif NU Pandaan"}</p>

              <div className="border-t border-slate-800 my-4 pt-4 flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Wali Murid:</span>
                  <span className="font-semibold text-slate-300">Bp/Ibu {currentStudent.name.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Kontak:</span>
                  <span className="font-semibold text-slate-300">{currentStudent.phone}</span>
                </div>
              </div>
            </div>

            {/* Quick Balances Stats */}
            <div className={`grid grid-cols-2 gap-4 ${mobileTab === 'beranda' ? 'grid' : 'hidden md:grid'}`}>
              {/* Savings Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Wallet size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TABUNGAN</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block leading-tight">Saldo Aktif</span>
                </div>
                <strong className="text-lg text-slate-900 mt-2 font-bold block truncate leading-none">
                  Rp {currentStudent.savingsBalance.toLocaleString('id-ID')}
                </strong>
              </div>

              {/* SPP Pending Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CreditCard size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TAGIHAN</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block leading-tight">Sisa SPP</span>
                </div>
                <strong className={`text-lg mt-2 font-bold block truncate leading-none ${unpaidBillsCount > 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                  {unpaidBillsCount === 0 ? 'Lunas 🎉' : `${unpaidBillsCount} Bulan`}
                </strong>
              </div>
            </div>

            {/* Keamanan Akun (Sandi) Card */}
            <div className="hidden md:flex bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-col gap-3 hover:shadow-sm transition-all">
              <div className="flex items-center gap-1.5 justify-between">
                <div className="flex items-center gap-1.5">
                  <Key size={14} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 uppercase">Keamanan Sandi Akun</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline cursor-pointer"
                >
                  {isChangingPassword ? 'Batal' : 'Ganti Kata Sandi'}
                </button>
              </div>
              
              {!isChangingPassword ? (
                <div className="text-[11px] text-slate-500 leading-normal">
                  Sandi bawaan Anda adalah nomor <span className="font-mono font-bold bg-slate-100/80 px-1 py-0.5 rounded text-slate-700">NIS Siswa</span> atau <span className="font-mono font-bold bg-slate-100/100 px-1 py-0.5 rounded text-slate-700">123456</span>. Demi keamanan wali murid, amankan dengan sandi baru di sini.
                </div>
              ) : (
                <form onSubmit={handlePasswordChangeSubmit} className="flex flex-col gap-3 mt-1 text-slate-700 border-t border-slate-100 pt-3">
                  {passwordError && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg font-bold flex items-center gap-1.5 text-[11px]">
                      <AlertCircle size={13} /> {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-lg font-bold flex items-center gap-1.5 text-[11px]">
                      <Check size={13} /> {passwordSuccess}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Lama / Saat Ini *</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan sandi lama/default"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-650 transition-all text-slate-800 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru *</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter baru"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-655 transition-all text-slate-800 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full mt-1.5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {changingPassword ? 'Sedang Memproses...' : 'Ubah Sandi Baru Anda 🔐'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="bg-slate-100/50 p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
            Silakan pilih siswa di atas terlebih dahulu untuk memuat portal.
          </div>
        )}

        {/* Unduh Aplikasi Mobile Block */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs flex flex-col gap-2.5 text-left select-none">
          <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone size={14} className="text-emerald-700" /> Aplikasi Mobile Sekolah
          </h4>
          <p className="text-[10px] text-slate-500 leading-normal">
            Gunakan aplikasi mobile resmi untuk kemudahan monitor laporan presensi, aktivitas, & pembayaran SPP langsung dari handphone Anda.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={schoolIdentity?.apkUrl || "#"}
              target={schoolIdentity?.apkUrl ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!schoolIdentity?.apkUrl) {
                  e.preventDefault();
                  alert("Link unduhan Android belum diatur oleh Administrator.");
                }
              }}
              className={`px-1.5 py-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer select-none group font-bold ${
                schoolIdentity?.apkUrl 
                  ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800 border-emerald-250 shadow-3xs" 
                  : "bg-slate-50/50 text-slate-400 border-slate-100 opacity-70"
              }`}
            >
              <Smartphone size={16} className={`${schoolIdentity?.apkUrl ? "text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)] group-hover:scale-110" : "text-emerald-300/60"} transition-transform stroke-[2.5]`} />
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
              <Apple size={16} className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`} />
              <span className="text-[8.5px]">iOS Apple</span>
            </a>
          </div>
        </div>
      </div>

      {/* Right Column: SPP Checklist / Deposits Form & History */}
      <div className={`md:col-span-8 ${mobileTab === 'beranda' ? 'block' : 'hidden md:block'}`}>
        {currentStudent ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full"
          >
            {/* Folder Header Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 md:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-5 md:gap-4 justify-center items-center w-full sm:w-auto">
                <button
                  id="tab-spp"
                  onClick={() => setActiveTab('spp')}
                  className={`py-2 px-3 md:py-3 md:px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                    activeTab === 'spp'
                      ? 'border-indigo-600 text-slate-905 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-indigo-600'
                  }`}
                  title={`Pembayaran SPP ${selectedAcademicYear ? `(TA ${selectedAcademicYear})` : ''}`}
                >
                  <div className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                    activeTab === 'spp'
                      ? 'bg-indigo-100 text-indigo-705 shadow-xs ring-1 ring-indigo-200/50'
                      : 'bg-indigo-50/50 text-indigo-400/80 hover:bg-indigo-100/50 hover:text-indigo-600'
                  } md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:text-inherit`}>
                    <CreditCard className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  </div>
                  <span className="hidden md:inline">Pembayaran SPP {selectedAcademicYear ? `(TA ${selectedAcademicYear})` : ''}</span>
                </button>
                <button
                  id="tab-tabungan"
                  onClick={() => setActiveTab('tabungan')}
                  className={`py-2 px-3 md:py-3 md:px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                    activeTab === 'tabungan'
                      ? 'border-emerald-600 text-emerald-705 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-emerald-600'
                  }`}
                  title="Metode Tabungan & Setoran"
                >
                  <div className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                    activeTab === 'tabungan'
                      ? 'bg-emerald-100 text-emerald-705 shadow-xs ring-1 ring-emerald-200/50'
                      : 'bg-emerald-50/50 text-emerald-400/80 hover:bg-emerald-100/50 hover:text-emerald-600'
                  } md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:text-inherit`}>
                    <Wallet className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  </div>
                  <span className="hidden md:inline">Metode Tabungan & Setoran</span>
                </button>
                <button
                  id="tab-absensi"
                  onClick={() => setActiveTab('absensi')}
                  className={`py-2 px-3 md:py-3 md:px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                    activeTab === 'absensi'
                      ? 'border-amber-500 text-amber-705 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-amber-500'
                  }`}
                  title="Sistem Absensi Kehadiran"
                >
                  <div className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                    activeTab === 'absensi'
                      ? 'bg-amber-100 text-amber-600 shadow-xs ring-1 ring-amber-200/50'
                      : 'bg-amber-50/50 text-amber-400/80 hover:bg-amber-100/50 hover:text-amber-600'
                  } md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:text-inherit`}>
                    <CalendarRange className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  </div>
                  <span className="hidden md:inline">Sistem Absensi Kehadiran</span>
                </button>
                <button
                  id="tab-kartu-qr"
                  onClick={() => setActiveTab('kartu_qr')}
                  className={`py-2 px-3 md:py-3 md:px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                    activeTab === 'kartu_qr'
                      ? 'border-indigo-600 text-indigo-705 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-indigo-600'
                  }`}
                  title="Kartu QR Pembayaran Siswa"
                >
                  <div className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                    activeTab === 'kartu_qr'
                      ? 'bg-indigo-100 text-indigo-755 shadow-xs ring-1 ring-indigo-200/50'
                      : 'bg-indigo-50/50 text-indigo-400/80 hover:bg-indigo-100/50 hover:text-indigo-600'
                  } md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:text-inherit`}>
                    <QrCode className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  </div>
                  <span className="hidden md:inline">Kartu QR Pembayaran</span>
                </button>
                <button
                  id="tab-jurnal-catatan"
                  onClick={() => setActiveTab('jurnal_catatan')}
                  className={`py-2 px-3 md:py-3 md:px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                    activeTab === 'jurnal_catatan'
                      ? 'border-rose-600 text-rose-705 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-rose-600'
                  }`}
                  title="Jurnal Catatan Perkembangan, Pelanggaran, dan Bimbingan Siswa"
                >
                  <div className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                    activeTab === 'jurnal_catatan'
                      ? 'bg-rose-100 text-rose-700 shadow-xs ring-1 ring-rose-200/50'
                      : 'bg-rose-50/50 text-rose-400/80 hover:bg-rose-100/50 hover:text-rose-600'
                  } md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:text-inherit`}>
                    <ClipboardList className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  </div>
                  <span className="hidden md:inline">Jurnal & Catatan</span>
                </button>
              </div>

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 sm:self-center"
                title="Refresh Portal Siswa"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Panel Tab Core Content */}
            <div className="p-6 flex-1">
              {activeTab === 'spp' && (
                <div>
                  {midtransStatus?.isDisabled && (
                    <div className="mb-4 p-3.5 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2.5 text-rose-900 shadow-3xs animate-fade-in text-xs shrink-0">
                      <Info size={14} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-extrabold text-rose-950 block">⚠️ Pembayaran Online Midtrans Dinonaktifkan Sementara</span>
                        <p className="m-0 text-slate-500 font-medium mt-0.5 leading-relaxed">
                          Sistem pembayaran SPP online via gerbang pembayaran elektronik Midtrans dibatalkan/dinonaktifkan sementara oleh Administrator demi kelancaran rekonsiliasi manual kas keuangan sekolah. Sementara waktu, silakan melakukan pembayaran tunai langsung di loket Teller SMP Maarif NU Pandaan.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Tagihan SPP Bulanan Siswa</h4>
                      <p className="text-slate-550 text-xs mt-0.5">
                        Besaran SPP sebesar Rp {sppRateAmount.toLocaleString('id-ID')},- / bulan wajib diselesaikan sebelum tanggal 10.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                      {academicYears.length > 1 && (
                        <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200/80 transition-colors">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TA:</span>
                          <select
                            id="ta-selector"
                            value={selectedAcademicYear}
                            onChange={(e) => setSelectedAcademicYear(e.target.value)}
                            className="text-[10px] bg-transparent font-bold text-slate-800 border-none p-0 outline-none focus:ring-0 cursor-pointer"
                          >
                            {academicYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 font-bold">
                          Lunas: {paidBillsCount}
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold">
                          Belum: {unpaidBillsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase font-bold tracking-widest text-[9px] border-b border-slate-200">
                          <th className="px-5 py-3 whitespace-nowrap">Bulan / Periode</th>
                          <th className="px-5 py-3 text-right whitespace-nowrap">Nominal</th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                          <th className="px-5 py-3 text-right whitespace-nowrap">Aksi Pembayaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBills.map((bill) => {
                          const isPaid = bill.status === 'paid';
                          const isPending = bill.status === 'pending';
                          const isCurrentlyActive = checkIsBillActive(bill, bills);

                          return (
                            <tr key={bill.id} className={`hover:bg-slate-50 transition-colors ${!isCurrentlyActive && !isPaid ? 'opacity-60 bg-slate-50/50' : ''}`}>
                              <td className="px-5 py-3.5 font-semibold text-slate-850 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className={!isCurrentlyActive && !isPaid ? 'text-slate-400 font-normal' : ''}>{bill.month} {bill.year}</span>
                                  {selectedAcademicYear && getAcademicYearOfBill(bill) !== selectedAcademicYear && (
                                    <span className="inline-block text-[8px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-100 max-w-max uppercase tracking-wider mt-1.5 animate-pulse">
                                      Tunggakan TA {getAcademicYearOfBill(bill)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${!isCurrentlyActive && !isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                                Rp {bill.amount.toLocaleString('id-ID')}
                              </td>
                              <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                    <Check size={10} strokeWidth={3} /> Lunas
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-100 uppercase animate-pulse">
                                    <Clock size={10} /> Pending
                                  </span>
                                ) : !isCurrentlyActive ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                                    <Lock size={10} /> Belum Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-100 uppercase animate-pulse">
                                    Belum Lunas
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                {isPaid ? (
                                  <div className="flex items-center justify-end gap-2 text-right">
                                    <div className="text-[10px] text-slate-400">
                                      <span className="block font-semibold text-slate-600">{bill.paymentMethod}</span>
                                      <span className="block font-mono text-[9px] mt-0.5">
                                        {new Date(bill.paidAt || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setReceiptToPrint({ type: 'spp', detail: bill, student: currentStudent! })}
                                      className="p-1.5 hover:bg-slate-100 text-indigo-600 hover:text-indigo-800 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                      title="Cetak & Unduh Invoice Kuitansi"
                                    >
                                      <Printer size={13} />
                                    </button>
                                  </div>
                                ) : !isCurrentlyActive ? (
                                  <button
                                    disabled
                                    className="px-3 py-1.5 font-bold rounded-lg text-[10px] uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                    title="SPP bulan berjalan harus dilunasi terlebih dahulu"
                                  >
                                    Nonaktif
                                  </button>
                                ) : (
                                  <button
                                    id={`pay-spp-${bill.id}`}
                                    onClick={() => onPaySpp(bill)}
                                    className={`px-3 py-1.5 font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-sm transition-all focus:outline-none cursor-pointer ${
                                      isPending 
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                        : 'bg-indigo-600 hover:bg-indigo-750 text-white shadow-md shadow-indigo-100'
                                    }`}
                                  >
                                    {isPending ? 'Lanjutkan' : 'Bayar Online'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Mobile-Friendly Card List View */}
                  <div className="block md:hidden flex flex-col gap-3">
                    {filteredBills.map((bill) => {
                      const isPaid = bill.status === 'paid';
                      const isPending = bill.status === 'pending';
                      const isCurrentlyActive = checkIsBillActive(bill, bills);

                      return (
                        <div key={`mob-${bill.id}`} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3.5 hover:border-slate-350 transition-colors ${!isCurrentlyActive && !isPaid ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <span className={`font-bold text-sm leading-tight ${!isCurrentlyActive && !isPaid ? 'text-slate-400 font-normal' : 'text-slate-800'}`}>{bill.month} {bill.year}</span>
                              {selectedAcademicYear && getAcademicYearOfBill(bill) !== selectedAcademicYear && (
                                <span className="inline-block text-[8px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-100 max-w-max uppercase tracking-wider animate-pulse">
                                  Tunggakan TA {getAcademicYearOfBill(bill)}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`block font-extrabold text-sm ${!isCurrentlyActive && !isPaid ? 'text-slate-400' : 'text-slate-900'}`}>
                                Rp {bill.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                            <div>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                  <Check size={9} strokeWidth={3} /> Lunas
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-100 uppercase animate-pulse">
                                  <Clock size={9} /> Pending
                                </span>
                              ) : !isCurrentlyActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                                  <Lock size={9} /> Belum Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-100 uppercase animate-pulse">
                                  Belum Lunas
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-end">
                              {isPaid ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-right text-[9px] text-slate-400 leading-tight">
                                    <span className="block font-bold text-slate-600">{bill.paymentMethod}</span>
                                    <span className="block font-mono">
                                      {new Date(bill.paidAt || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setReceiptToPrint({ type: 'spp', detail: bill, student: currentStudent! })}
                                    className="p-2 hover:bg-slate-100 text-indigo-600 hover:text-indigo-800 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    title="Cetak & Unduh Invoice Kuitansi"
                                  >
                                    <Printer size={13} />
                                  </button>
                                </div>
                              ) : !isCurrentlyActive ? (
                                <button
                                  disabled
                                  className="px-4 py-2 font-black rounded-lg text-[10px] uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-1.5"
                                  title="SPP bulan berjalan harus dilunasi terlebih dahulu"
                                >
                                  Nonaktif
                                </button>
                              ) : (
                                <button
                                  id={`pay-spp-mob-${bill.id}`}
                                  onClick={() => onPaySpp(bill)}
                                  className={`px-4 py-2 font-black rounded-lg text-[10px] uppercase tracking-wider shadow-sm transition-all focus:outline-none cursor-pointer flex items-center justify-center gap-1.5 ${
                                    isPending 
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                      : 'bg-indigo-600 hover:bg-indigo-750 text-white shadow-md shadow-indigo-100'
                                  }`}
                                >
                                  {isPending ? 'Lanjutkan' : 'Bayar Sekarang'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'tabungan' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tabungan Deposit Box */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <Landmark size={14} className="text-indigo-600" /> Setor Tabungan Online
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                        Lakukan penambahan saldo tabungan siswa secara instan menggunakan Virtual Account atau QRIS Midtrans.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-4">
                      {midtransStatus?.isDisabled ? (
                        <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl flex flex-col gap-1.5 text-xs text-rose-900 leading-relaxed font-sans">
                          <span className="font-extrabold text-rose-950 flex items-center gap-1">⚠️ Fitur Online Nonaktif Sementara</span>
                          <p className="m-0 text-rose-800 font-medium font-sans">
                            Deposit tabungan online via Midtrans sedang dinonaktifkan sementara oleh Administrator keuangan demi kelancaran penyesuaian saldo berkala. Silakan berkoordinasi langsung dengan bagian kasir/bendahara sekolah untuk penyetoran manual secara tunai.
                          </p>
                        </div>
                      ) : (
                        <>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Nominal Cepat</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {presetAmounts.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setTopUpAmount(preset);
                                  setCustomTopUp('');
                                }}
                                className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  topUpAmount === preset && !customTopUp
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                                }`}
                              >
                                {Number(preset) / 1000}K
                              </button>
                            ))}
                          </div>

                          <div className="relative mt-1">
                            <input
                              id="topup-amount-input"
                              type="number"
                              placeholder="Atau masukkan jumlah kustom..."
                              value={customTopUp}
                              onChange={(e) => {
                                setCustomTopUp(e.target.value);
                                setTopUpAmount('');
                              }}
                              className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-semibold text-slate-800"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">Rp</span>
                          </div>

                          <button
                            id="btn-deposit-savings"
                            onClick={() => {
                              const amt = customTopUp ? Number(customTopUp) : Number(topUpAmount);
                              if (isNaN(amt) || amt < 10000) {
                                alert('Minimum setoran tabungan online adalah Rp 10.000');
                                return;
                              }
                              onDepositSavings(amt);
                            }}
                            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-indigo-100 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Wallet size={13} /> Setor Rp {(customTopUp ? Number(customTopUp) : Number(topUpAmount)).toLocaleString('id-ID')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tabungan Withdrawal Box */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <Send size={14} className="text-slate-800" /> Pengajuan Tarik Tabungan
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                        Tarik saldo tabungan siswa untuk keperluan tunai di sekolah (Buku LKS, Pramuka, dll).
                      </p>
                    </div>

                    <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-2.5 mt-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nominal Tarik Tunai</label>
                        <div className="relative">
                          <input
                            id="withdraw-amount"
                            type="number"
                            required
                            placeholder="Contoh: 50000"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            max={currentStudent?.savingsBalance || 0}
                            className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-semibold text-slate-800"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[10px]">Rp</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Keperluan / Keterangan</label>
                        <input
                          id="withdraw-notes"
                          type="text"
                          required
                          placeholder="cth: Modul LKS/Buku Kas Latihan"
                          value={withdrawNotes}
                          onChange={(e) => setWithdrawNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-700"
                        />
                      </div>

                      <button
                        type="submit"
                        id="btn-withdraw-savings"
                        disabled={withdrawing || !withdrawAmount}
                        className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-855 text-white disabled:opacity-50 font-bold text-xs rounded-lg transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {withdrawing ? (
                          'Memproses...'
                        ) : (
                          <>
                            <Send size={13} /> Ajukan Tarik Tunai
                          </>
                        )}
                      </button>

                      {withdrawSuccess && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex flex-col gap-1 font-semibold leading-relaxed">
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-bold">
                            <span className="text-sm">⏳</span> Pengajuan Berhasil Terkirim!
                          </div>
                          <span>Penarikan sedang diproses dan menunggu persetujuan/konfirmasi oleh Admin secara manual. Terima kasih!</span>
                        </div>
                      )}
                    </form>
                  </div>
                </div>

              {/* History Section (Under content) */}
              <div className="mt-8 hidden md:block">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                  Log Transaksi Tabungan Siswa
                </h4>
                
                {transactions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                    Belum ada riwayat transaksi tabungan untuk siswa ini.
                  </p>
                ) : (
                  <>
                    {/* Desktop Transaction Log View */}
                    <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-450 uppercase font-bold tracking-widest text-[9px] border-b border-slate-200">
                            <th className="px-5 py-2.5">Tanggal</th>
                            <th className="px-5 py-2.5">Keterangan</th>
                            <th className="px-5 py-2.5 text-center">Metode</th>
                            <th className="px-5 py-2.5 text-center">Tipe</th>
                            <th className="px-5 py-2.5 text-right">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((tx) => {
                            const isDeposit = tx.type === 'deposit';

                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-mono text-[10px] text-slate-450 whitespace-nowrap">
                                  {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800">{tx.notes || 'Penyesuaian Saldo'}</div>
                                  {tx.orderId && <div className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {tx.orderId}</div>}
                                </td>
                                <td className="px-5 py-3 text-center text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                                  {tx.paymentMethod || 'Manual Teller'}
                                </td>
                                <td className="px-5 py-3 text-center whitespace-nowrap">
                                  <div className="flex flex-col items-center gap-1">
                                    {isDeposit ? (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded text-[9px] uppercase tracking-wide">
                                        <ArrowUpRight size={9} /> Setor
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded text-[9px] uppercase tracking-wide">
                                        <ArrowDownLeft size={9} /> Tarik
                                      </span>
                                    )}
                                    {tx.status === 'pending' && (
                                      <span className="inline-flex px-1 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-bold uppercase tracking-wider leading-none">
                                        Pending
                                      </span>
                                    )}
                                    {tx.status === 'failed' && (
                                      <span className="inline-flex px-1 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[8px] font-bold uppercase tracking-wider leading-none">
                                        Ditolak
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className={`font-bold font-mono text-[11px] ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isDeposit ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setReceiptToPrint({ type: 'savings', detail: tx, student: currentStudent! })}
                                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded border border-slate-200 shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                      title="Cetak & Unduh Bukti Transaksi"
                                    >
                                      <Printer size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Transaction Log View (Touch-Optimized Cards with quick Action) */}
                    <div className="block md:hidden flex flex-col gap-3 max-h-[350px] overflow-y-auto">
                      {transactions.map((tx) => {
                        const isDeposit = tx.type === 'deposit';

                        return (
                          <div key={`tx-mob-${tx.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3 hover:border-slate-350 transition-colors text-left">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-1 max-w-[65%]">
                                <span className="font-bold text-slate-800 text-sm leading-snug">{tx.notes || 'Penyesuaian Saldo'}</span>
                                <span className="text-[10px] text-slate-450 font-mono">
                                  {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {tx.orderId && <span className="text-[8px] text-slate-400 font-mono leading-none">ID: {tx.orderId}</span>}
                              </div>
                              <div className="text-right">
                                <span className={`block font-extrabold text-sm font-mono ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isDeposit ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                                </span>
                                <span className="text-[9px] text-slate-450 font-medium block mt-0.5">
                                  {tx.paymentMethod || 'Manual Teller'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isDeposit ? (
                                  <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded text-[9px] uppercase tracking-wide">
                                    <ArrowUpRight size={9} /> Setor Masuk
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded text-[9px] uppercase tracking-wide">
                                    <ArrowDownLeft size={9} /> Tarik Keluar
                                  </span>
                                )}
                                {tx.status === 'pending' && (
                                  <span className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-bold uppercase tracking-wider leading-none">
                                    Pending
                                  </span>
                                )}
                                {tx.status === 'failed' && (
                                  <span className="inline-flex px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[8px] font-bold uppercase tracking-wider leading-none">
                                    Ditolak
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setReceiptToPrint({ type: 'savings', detail: tx, student: currentStudent! })}
                                className="px-3 py-1.5 bg-white text-indigo-600 hover:text-indigo-850 hover:bg-slate-50 border border-slate-200 hover:border-slate-350 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                title="Cetak & Unduh Bukti Transaksi"
                              >
                                <Printer size={11} className="shrink-0" /> Cetak Bukti
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
                </>
              )}
              
              {activeTab === 'absensi' && (
                <div className="flex flex-col gap-6 animate-fade-in text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Sistem Rekapitulasi Presensi Kehadiran Siswa</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Pantau riwayat presensi harian dari Wali Kelas dan presensi per-sesi KBM dari Guru Mapel secara terperinci.
                      </p>
                    </div>

                    {/* Sub-tab Pill Switcher */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 select-none self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setAttendanceSubTab('harian')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                          attendanceSubTab === 'harian'
                            ? 'bg-white text-emerald-850 shadow-xs ring-1 ring-slate-200/20'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <ClipboardList size={12} className={attendanceSubTab === 'harian' ? 'text-emerald-600 animate-pulse' : 'text-slate-400'} />
                        <span>Wali Kelas (Harian)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceSubTab('mapel')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                          attendanceSubTab === 'mapel'
                            ? 'bg-white text-indigo-850 shadow-xs ring-1 ring-slate-200/20'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <BookOpen size={12} className={attendanceSubTab === 'mapel' ? 'text-indigo-600' : 'text-slate-400'} />
                        <span>Guru Mapel (KBM)</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB TAB 1: DAILY ATTENDANCE (WALI KELAS) */}
                  {attendanceSubTab === 'harian' && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                      <div className="bg-emerald-50/40 border border-emerald-100/60 p-3.5 rounded-2xl flex gap-3 text-xs text-slate-600 leading-relaxed">
                        <ClipboardList size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-emerald-900 block text-[11px] uppercase tracking-wider mb-0.5">Catatan Presensi Harian Wali Kelas</span>
                          Presensi di bawah ini dikonfirmasi satu kali setiap hari oleh <strong>Wali Kelas {currentStudent?.class}</strong>. Menentukan kualifikasi kehadiran umum siswa untuk penilaian akhir semester di rapor sekolah.
                        </div>
                      </div>

                      {(() => {
                        const logs = attendanceLogs || [];
                        const total = logs.length;
                        const hCount = logs.filter(l => l.status === 'Hadir').length;
                        const sCount = logs.filter(l => l.status === 'Sakit').length;
                        const iCount = logs.filter(l => l.status === 'Izin').length;
                        const aCount = logs.filter(l => l.status === 'Alpa').length;
                        const tCount = logs.filter(l => l.status === 'Terlambat').length;
                        const attendanceRate = total > 0 ? Math.round(((hCount + tCount) / total) * 100) : 100;

                        return (
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                              <div className="bg-emerald-50 border border-emerald-100/70 rounded-2xl p-3 text-center transition-all hover:bg-emerald-100/40">
                                <span className="block text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider">Hadir</span>
                                <span className="block text-lg font-black text-emerald-850 mt-1">{hCount} Hari</span>
                              </div>
                              <div className="bg-purple-50 border border-purple-100/70 rounded-2xl p-3 text-center transition-all hover:bg-purple-100/40">
                                <span className="block text-[9px] font-extrabold text-purple-600 uppercase tracking-wider">Terlambat</span>
                                <span className="block text-lg font-black text-purple-850 mt-1">{tCount} Hari</span>
                              </div>
                              <div className="bg-amber-50 border border-amber-100/70 rounded-2xl p-3 text-center transition-all hover:bg-amber-100/40">
                                <span className="block text-[9px] font-extrabold text-amber-600 uppercase tracking-wider">Sakit</span>
                                <span className="block text-lg font-black text-amber-850 mt-1">{sCount} Hari</span>
                              </div>
                              <div className="bg-blue-50 border border-blue-100/70 rounded-2xl p-3 text-center transition-all hover:bg-blue-100/40">
                                <span className="block text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">Izin</span>
                                <span className="block text-lg font-black text-blue-850 mt-1">{iCount} Hari</span>
                              </div>
                              <div className="bg-rose-50 border border-rose-100/70 rounded-2xl p-3 text-center transition-all hover:bg-rose-100/40">
                                <span className="block text-[9px] font-extrabold text-rose-600 uppercase tracking-wider">Alpa</span>
                                <span className="block text-lg font-black text-rose-850 mt-1">{aCount} Hari</span>
                              </div>
                              <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-950 rounded-2xl p-3 text-center text-white shadow-sm shadow-slate-900/10">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Persentase</span>
                                <span className="block text-lg font-black mt-1 text-emerald-400">{attendanceRate}%</span>
                              </div>
                            </div>

                            {/* Recent Attendance Logs Table */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                              {logs.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
                                  <ClipboardList className="text-slate-300 stroke-[1.5]" size={32} />
                                  <span>Belum ada catatan absensi harian wali kelas untuk {currentStudent?.name || ''}.</span>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10px] uppercase tracking-wider select-none">
                                        <th className="py-3 px-4">Hari & Tanggal</th>
                                        <th className="py-3 px-4 text-center border-l border-r border-slate-100">Status</th>
                                        <th className="py-3 px-4">Keterangan / Alasan dari Wali Kelas</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {logs.slice().sort((a,b) => b.date.localeCompare(a.date)).map((log) => {
                                        const statusColors: Record<string, string> = {
                                          'Hadir': 'bg-emerald-50 text-emerald-750 border-emerald-200 text-emerald-700',
                                          'Terlambat': 'bg-purple-50 text-purple-750 border-purple-200 text-purple-700',
                                          'Sakit': 'bg-amber-50 text-amber-750 border-amber-200 text-amber-700',
                                          'Izin': 'bg-blue-50 text-blue-750 border-blue-200 text-blue-700',
                                          'Alpa': 'bg-rose-50 text-rose-750 border-rose-200 text-rose-700'
                                        };
                                        return (
                                          <tr key={log.id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                              {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </td>
                                            <td className="py-3 px-4 text-center border-l border-r border-slate-100">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-black text-[9px] uppercase border ${statusColors[log.status] || 'bg-slate-100 text-slate-800'}`}>
                                                {log.status}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 font-semibold italic">
                                              {log.notes || <span className="text-slate-300 font-normal">Tidak ada catatan</span>}
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
                        );
                      })()}
                    </div>
                  )}

                  {/* SUB TAB 2: SUBJECT ATTENDANCE (GURU MAPEL KBM) */}
                  {attendanceSubTab === 'mapel' && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                      <div className="bg-indigo-50/40 border border-indigo-100/60 p-3.5 rounded-2xl flex gap-3 text-xs text-slate-600 leading-relaxed">
                        <BookOpen size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-indigo-900 block text-[11px] uppercase tracking-wider mb-0.5">Catatan Presensi Mata Pelajaran Guru Mapel</span>
                          Presensi di bawah ini diisi secara real-time oleh para <strong>Guru Mata Pelajaran</strong> pada setiap sesi KBM (Kegiatan Belajar Mengajar) sesuai dengan topik materi yang diajarkan pada hari itu.
                        </div>
                      </div>

                      {loadingJournals ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400 font-semibold text-xs gap-3">
                          <RefreshCw className="animate-spin text-indigo-500" size={24} />
                          <span>Memproses histori presensi KBM Mapel...</span>
                        </div>
                      ) : (
                        (() => {
                          const list = studentSubjectAttendance;
                          const total = list.length;
                          const hCount = list.filter(l => l.status === 'Hadir').length;
                          const sCount = list.filter(l => l.status === 'Sakit').length;
                          const iCount = list.filter(l => l.status === 'Izin').length;
                          const aCount = list.filter(l => l.status === 'Alpa').length;
                          const tCount = list.filter(l => l.status === 'Terlambat').length;
                          const attendanceRate = total > 0 ? Math.round(((hCount + tCount) / total) * 100) : 100;

                          return (
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                <div className="bg-emerald-50 border border-emerald-100/70 rounded-2xl p-3 text-center transition-all hover:bg-emerald-100/40">
                                  <span className="block text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider">Hadir</span>
                                  <span className="block text-lg font-black text-emerald-850 mt-1">{hCount} Sesi</span>
                                </div>
                                <div className="bg-purple-50 border border-purple-100/70 rounded-2xl p-3 text-center transition-all hover:bg-purple-100/40">
                                  <span className="block text-[9px] font-extrabold text-purple-600 uppercase tracking-wider">Terlambat</span>
                                  <span className="block text-lg font-black text-purple-850 mt-1">{tCount} Sesi</span>
                                </div>
                                <div className="bg-amber-50 border border-amber-100/70 rounded-2xl p-3 text-center transition-all hover:bg-amber-100/40">
                                  <span className="block text-[9px] font-extrabold text-amber-600 uppercase tracking-wider">Sakit</span>
                                  <span className="block text-lg font-black text-amber-850 mt-1">{sCount} Sesi</span>
                                </div>
                                <div className="bg-blue-50 border border-blue-100/70 rounded-2xl p-3 text-center transition-all hover:bg-blue-100/40">
                                  <span className="block text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">Izin</span>
                                  <span className="block text-lg font-black text-blue-850 mt-1">{iCount} Sesi</span>
                                </div>
                                <div className="bg-rose-50 border border-rose-100/70 rounded-2xl p-3 text-center transition-all hover:bg-rose-100/40">
                                  <span className="block text-[9px] font-extrabold text-rose-600 uppercase tracking-wider">Alpa</span>
                                  <span className="block text-lg font-black text-rose-850 mt-1">{aCount} Sesi</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-950 rounded-2xl p-3 text-center text-white shadow-sm shadow-slate-900/10">
                                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kehadiran KBM</span>
                                  <span className="block text-lg font-black mt-1 text-indigo-400">{attendanceRate}%</span>
                                </div>
                              </div>

                              {/* Subject Attendance Logs Table */}
                              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                                {list.length === 0 ? (
                                  <div className="p-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
                                    <BookOpen className="text-slate-300 stroke-[1.5]" size={32} />
                                    <span>Belum ada catatan kehadiran mata pelajaran untuk {currentStudent?.name || ''}.</span>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10px] uppercase tracking-wider select-none">
                                          <th className="py-3 px-4">Hari / Tanggal</th>
                                          <th className="py-3 px-4">Mata Pelajaran & Guru</th>
                                          <th className="py-3 px-4">Materi Kegiatan Pembelajaran (KBM)</th>
                                          <th className="py-3 px-4 text-center border-l border-r border-slate-100">Status</th>
                                          <th className="py-3 px-4">Keterangan Khusus Mapel</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {list.map((item, idx) => {
                                          const statusColors: Record<string, string> = {
                                            'Hadir': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            'Terlambat': 'bg-purple-50 text-purple-700 border-purple-200',
                                            'Sakit': 'bg-amber-50 text-amber-700 border-amber-200',
                                            'Izin': 'bg-blue-50 text-blue-700 border-blue-200',
                                            'Alpa': 'bg-rose-50 text-rose-700 border-rose-200'
                                          };
                                          return (
                                            <tr key={`${item.journalId}-${idx}`} className="hover:bg-slate-50/50">
                                              <td className="py-3 px-4 font-bold text-slate-800">
                                                <div>
                                                  {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                {item.jamKe && (
                                                  <span className="inline-block text-[9px] font-extrabold bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-0.5 font-mono">
                                                    Jam Ke-{item.jamKe}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4">
                                                <div className="font-extrabold text-indigo-950 text-[12px]">{item.subject}</div>
                                                <div className="text-slate-400 font-semibold text-[10px]">{item.teacherName}</div>
                                              </td>
                                              <td className="py-3 px-4 text-slate-600 font-bold max-w-xs truncate leading-relaxed">
                                                {item.topic}
                                              </td>
                                              <td className="py-3 px-4 text-center border-l border-r border-slate-100">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-black text-[9px] uppercase border ${statusColors[item.status] || 'bg-slate-100 text-slate-800'}`}>
                                                  {item.status}
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-slate-500 font-semibold italic">
                                                {item.notes || <span className="text-slate-300 font-normal">-</span>}
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
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'kartu_qr' && currentStudent && (
                <div className="flex flex-col gap-6 animate-fade-in text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Sistem Kartu QR Pembayaran Siswa</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Download atau cetak kartu QR pembayaran Anda secara mandiri. Kode QR ini digunakan saat melakukan pembayaran tunai (SPP/Setoran Tabungan) di loket sekolah agar teller dapat instan mendeteksi profil siswa melalui scan barcode / kamera.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
                    {/* Beautiful physical QR card mockup */}
                    <StudentPaymentCard 
                      student={currentStudent} 
                      schoolIdentity={schoolIdentity} 
                      isPreview={true}
                    />

                    {/* Explanatory cards & interactive actions */}
                    <div className="flex-1 flex flex-col gap-4 w-full">
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Petunjuk Penggunaan Kartu QR
                        </h5>
                        <ul className="text-[11px] text-slate-600 space-y-2 list-disc list-inside">
                          <li>Saran terbaik: klik tombol <strong>Cetak Kartu Fisik</strong> kemudian potong sesuai garis horisontal putus-putus.</li>
                          <li>Anda juga dapat menyimpan QR Code sebagai gambar di galeri HP Anda untuk dibuka secara instan saat dibutuhkan.</li>
                          <li>Scan QR code ini pada petugas loket sekolah untuk penarikan/penyetoran tabungan maupun iuran SPP tunai agar proses input cepat dan bebas dari kesalahan entri data.</li>
                        </ul>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const tempCanvas = document.createElement('canvas');
                            QRCode.toCanvas(tempCanvas, currentStudent.nis, {
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
                              const link = document.createElement('a');
                              link.download = `${currentStudent.nis}.png`;
                              link.href = tempCanvas.toDataURL('image/png');
                              link.click();
                            });
                          }}
                          className="flex-1 py-3 bg-white hover:bg-indigo-50 border-2 border-indigo-150 hover:border-indigo-500 text-indigo-700 font-extrabold rounded-2xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          <Download size={14} />
                          <span>Unduh Gambar QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintQrCard(true)}
                          className="flex-1 py-3 bg-slate-900 border border-slate-950 text-white font-extrabold rounded-2xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-950 transition-all cursor-pointer shadow-md"
                        >
                          <Printer size={14} />
                          <span>Cetak Kartu Fisik</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'jurnal_catatan' && (
                <div className="flex flex-col gap-6 animate-fade-in text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        📋 Jurnal Catatan & Perkembangan Siswa
                      </h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Rekaman riwayat catatan perkembangan, pelanggaran kedisiplinan, dan histori bimbingan konseling Anda secara langsung dari sekolah.
                      </p>
                    </div>
                  </div>

                  {/* Infraction Points Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <div className="bg-white border border-slate-150 rounded-xl p-4.5 text-left shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Catatan Pelanggaran</span>
                      <div className="text-xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                        <span>{infractionLogs.length}</span>
                        <span className="text-xs text-slate-400 font-semibold">Kejadian</span>
                      </div>
                    </div>
                    <div className="bg-red-50/50 border border-red-150 rounded-xl p-4.5 text-left shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-red-700 block tracking-wider">Akumulasi Poin Pelanggaran</span>
                      <div className="text-xl font-black text-red-650 mt-1 flex items-baseline gap-1 font-mono">
                        <span>{totalInfractionPoints}</span>
                        <span className="text-xs text-red-500 font-black">POIN PENALTI</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Makin rendah poin, makin tinggi indeks kedisiplinan Anda.
                      </p>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-4.5 text-left shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Status Disiplin Siswa</span>
                      <div className="text-sm font-black text-emerald-750 mt-1.5 flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{totalInfractionPoints === 0 ? "Sangat Baik & Disiplin" : totalInfractionPoints <= 15 ? "Kondusif" : totalInfractionPoints <= 50 ? "Perlu Pembinaan" : "Rekomendasi Skorsing/Panggilan Wali"}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Sistem Penilaian Kedisiplinan Terkendali Utama.
                      </p>
                    </div>
                  </div>

                  {/* Sub Tab Switcher */}
                  <div className="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-max gap-2 text-xs font-bold shadow-xs">
                    <button
                      type="button"
                      onClick={() => setJournalSubTab('perkembangan')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                        journalSubTab === 'perkembangan'
                          ? 'bg-rose-500 text-white shadow-xs font-black'
                          : 'text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      📈 Catatan Perkembangan ({devLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalSubTab('pelanggaran')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                        journalSubTab === 'pelanggaran'
                          ? 'bg-amber-600 text-white shadow-xs font-black'
                          : 'text-slate-655 hover:bg-slate-200'
                      }`}
                    >
                      🚨 Pelanggaran & Disiplin ({infractionLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalSubTab('bimbingan')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                        journalSubTab === 'bimbingan'
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'text-slate-655 hover:bg-slate-200'
                      }`}
                    >
                      🤝 Bimbingan & Konseling ({counselingLogs.length})
                    </button>
                  </div>

                  {/* SUB TAB CONTENT */}
                  {loadingStudentLogs ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                      <RefreshCw size={24} className="animate-spin text-rose-500" />
                      <p className="text-xs font-medium">Memuat jurnal catatan siswa...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* SUB TAB: CATATAN PERKEMBANGAN */}
                      {journalSubTab === 'perkembangan' && (
                        <div className="space-y-4">
                          {devLogs.length === 0 ? (
                            <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center justify-center bg-slate-50/50 gap-2">
                              <BookOpen size={28} className="text-slate-350" />
                              <p className="text-xs font-bold text-slate-600">Belum Ada Catatan Perkembangan</p>
                              <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                                Wali kelas belum memasukkan catatan perkembangan akademik, sikap, maupun prestasi terkait Anda.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {devLogs.map((log) => {
                                const categoryColors: Record<string, string> = {
                                  'Akademik': 'bg-blue-50 text-blue-700 border-blue-200',
                                  'Sikap': 'bg-purple-50 text-purple-700 border-purple-200',
                                  'Prestasi': 'bg-amber-50 text-amber-700 border-amber-200',
                                  'Minat': 'bg-pink-50 text-pink-700 border-pink-200',
                                  'Catatan Khusus': 'bg-slate-50 text-slate-700 border-slate-200'
                                };
                                const col = categoryColors[log.category] || 'bg-slate-50 text-slate-700 border-slate-200';
                                return (
                                  <div key={log.id} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                      <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${col}`}>
                                        {log.category}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-705 leading-relaxed font-semibold whitespace-pre-wrap">
                                      {log.notes}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB TAB: PELANGGARAN & DISIPLIN */}
                      {journalSubTab === 'pelanggaran' && (
                        <div className="space-y-4">
                          {infractionLogs.length === 0 ? (
                            <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center justify-center bg-slate-50/50 gap-2">
                              <CheckCircle2 size={28} className="text-emerald-500" />
                              <p className="text-xs font-bold text-slate-650">Siswa Berkelakuan Sangat Baik</p>
                              <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                                Tidak ada rekam jejak pelanggaran tata tertib sekolah atau catatan kedisplinan yang tercatat untuk Anda. Terus pertahankan!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                               {infractionLogs.map((log) => {
                                 const statusColors: Record<string, string> = {
                                   'Selesai': 'bg-green-50 text-green-700 border-green-200',
                                   'Dalam Proses': 'bg-amber-50 text-amber-700 border-amber-200',
                                   'Belum Selesai': 'bg-rose-50 text-rose-700 border-rose-200'
                                 };
                                 const statusCol = statusColors[log.resolutionStatus] || 'bg-slate-50 text-slate-705';
                                 const isReduction = log.points !== undefined && log.points < 0;
                                 return (
                                   <div key={log.id} className={`bg-white border border-slate-150 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col md:flex-row md:items-start justify-between gap-4 ${isReduction ? 'bg-emerald-50/5 border-emerald-100' : ''}`}>
                                     <div className="flex-grow flex flex-col gap-2">
                                       <div className="flex items-center gap-2 flex-wrap">
                                         {isReduction ? (
                                           <span className="text-[11px] font-black text-emerald-950 bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 rounded-lg">
                                             ❇️ {log.infractionType}
                                           </span>
                                         ) : (
                                           <span className="text-[11px] font-black text-rose-950 bg-rose-50 border border-rose-150 px-2.5 py-0.5 rounded-lg">
                                             🚨 {log.infractionType}
                                           </span>
                                         )}
                                         {log.points !== undefined && (
                                           <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black font-mono border ${isReduction ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                             {isReduction ? 'Pengurangan:' : 'Penalti:'} {log.points} pt
                                           </span>
                                         )}
                                         <span className="text-[10px] text-slate-400 font-bold font-mono">
                                           ⏱️ {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} pukul {log.time}
                                         </span>
                                       </div>
                                       
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                         <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left">
                                           <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tempat Kejadian</div>
                                           <p className="text-xs font-bold text-slate-750 mt-0.5">{log.location}</p>
                                         </div>
                                         <div className={`p-2.5 rounded-xl border text-left ${isReduction ? 'bg-emerald-50/40 border-emerald-100/60' : 'bg-amber-50/40 border-amber-100/60'}`}>
                                           <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                             {isReduction ? 'Apresiasi / Hasil Pembinaan BK' : 'Tindak Lanjut / Sanksi'}
                                           </div>
                                           <p className="text-xs font-bold text-slate-755 text-slate-750 mt-0.5">{log.actionTaken}</p>
                                         </div>
                                       </div>
                                     </div>

                                    <div className="shrink-0 flex md:flex-col justify-between items-center md:items-end gap-2 border-t md:border-t-0 border-slate-110 pt-3 md:pt-0">
                                      <span className="text-[9px] font-medium text-slate-400 hidden md:block">Status Penanganan</span>
                                      <span className={`text-[10px] font-black tracking-wide px-2.5 py-1 rounded-full border ${statusCol}`}>
                                        ● {log.resolutionStatus}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB TAB: BIMBINGAN & KONSELING */}
                      {journalSubTab === 'bimbingan' && (
                        <div className="space-y-4">
                          {counselingLogs.length === 0 ? (
                            <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center justify-center bg-slate-50/50 gap-2">
                              <User size={28} className="text-slate-350" />
                              <p className="text-xs font-bold text-slate-650">Tidak Ada Rekaman Konseling</p>
                              <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                                Konselor / Guru BK belum mencatat adanya sesi bimbingan, mediasi, atau mediasi konsultasi pribadi untuk Anda.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {counselingLogs.map((log) => (
                                <div key={log.id} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col gap-3">
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <span className="text-xs font-black text-emerald-950 bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                      🤝 Konseling BK
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                                      <Clock size={10} />
                                      {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>

                                  <div className="text-left font-medium space-y-2">
                                    <div>
                                      <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider">Topik Pembahasan:</span>
                                      <p className="text-xs font-bold text-slate-800 whitespace-pre-wrap">{log.topic}</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 pt-1 border-t border-slate-50">
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Rencana Pemecahan Solusi:</span>
                                        <p className="text-xs text-slate-650 mt-0.5 whitespace-pre-wrap">{log.actionPlan}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Hasil BK / Tindak Lanjut:</span>
                                        <p className="text-xs text-slate-650 mt-0.5 whitespace-pre-wrap">{log.result}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <User size={32} className="text-slate-350" />
            <div>
              <p className="font-bold text-slate-700 text-sm">Portal Belum Memuat Murid</p>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto mt-1 leading-relaxed">
                Silakan pilih profil murid di kolom sebelah kiri untuk menyimulasikan sistem pembayaran sekolah.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================= MOBILE NAVIGATION TAB VIEWS (lg:hidden) ================= */}
      {currentStudent && (
        <div className="md:hidden col-span-1">
          {/* 1. MOBILE TAB: LOG TRANSAKSI */}
          {mobileTab === 'log' && (
            <div className="flex flex-col gap-4 animate-fade-in text-left">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col gap-1.5 mb-4 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Log & Riwayat Transaksi Siswa</h3>
                  <p className="text-slate-400 text-xs">Rekaman bukti transaksi tabungan dan pembayaran SPP Anda.</p>
                </div>

                {/* Filter Tabs for Mobile logs */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold mb-4">
                  <button
                    onClick={() => setMobileLogFilter('all')}
                    className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                      mobileLogFilter === 'all'
                        ? 'bg-white text-slate-800 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setMobileLogFilter('savings')}
                    className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                      mobileLogFilter === 'savings'
                        ? 'bg-white text-emerald-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-emerald-650'
                    }`}
                  >
                    Tabungan
                  </button>
                  <button
                    onClick={() => setMobileLogFilter('spp')}
                    className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                      mobileLogFilter === 'spp'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-indigo-650'
                    }`}
                  >
                    SPP
                  </button>
                </div>

                {/* Container Mutasi */}
                <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
                  {/* Render Mutasi Tabungan */}
                  {(mobileLogFilter === 'all' || mobileLogFilter === 'savings') && (
                    <div className="flex flex-col gap-2">
                      {(mobileLogFilter === 'savings' || (mobileLogFilter === 'all' && transactions.length > 0)) && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mutasi Tabungan</span>
                      )}
                      {transactions.length === 0 ? (
                        mobileLogFilter === 'savings' && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
                            Belum ada riwayat transaksi tabungan untuk siswa ini.
                          </p>
                        )
                      ) : (
                        transactions.map((tx) => {
                          const isDeposit = tx.type === 'deposit';
                          return (
                            <div key={`m-tx-${tx.id}`} className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-left">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl shrink-0 ${isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {isDeposit ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 leading-tight block">{tx.notes || 'Penyesuaian Saldo'}</span>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5 font-medium">
                                    <span className="font-mono">{new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span>&bull;</span>
                                    <span>{tx.paymentMethod || 'Teller'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-black font-mono text-[12px] ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isDeposit ? '+' : '-'}Rp{tx.amount.toLocaleString('id-ID')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReceiptToPrint({ type: 'savings', detail: tx, student: currentStudent })}
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition-colors cursor-pointer shrink-0"
                                  title="Cetak/Unduh Bukti"
                                >
                                  <Printer size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Render Mutasi/Tagihan SPP Lunas */}
                  {(mobileLogFilter === 'all' || mobileLogFilter === 'spp') && (
                    <div className="flex flex-col gap-2 mt-2">
                      {(mobileLogFilter === 'spp' || (mobileLogFilter === 'all' && bills.filter(b => b.status === 'paid').length > 0)) && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Riwayat SPP Selesai</span>
                      )}
                      {bills.filter(b => b.status === 'paid').length === 0 ? (
                        mobileLogFilter === 'spp' && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
                            Belum ada riwayat iuran SPP lunas.
                          </p>
                        )
                      ) : (
                        bills.filter(b => b.status === 'paid').map((bill) => (
                          <div key={`m-spp-${bill.id}`} className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-left">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                                <CreditCard size={15} />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 leading-tight">SPP {bill.month} {bill.year}</span>
                                <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
                                  <span>TERBAYAR 🎉</span>
                                  {bill.paidAt && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="font-mono text-slate-400">{new Date(bill.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[12px] text-indigo-700 font-mono">
                                Rp{bill.amount.toLocaleString('id-ID')}
                              </span>
                              <button
                                type="button"
                                onClick={() => setReceiptToPrint({ type: 'spp', detail: bill, student: currentStudent })}
                                className="p-1.5 bg-white hover:bg-indigo-100/50 text-indigo-600 rounded border border-indigo-150 transition-colors cursor-pointer shrink-0"
                                title="Cetak/Unduh Bukti"
                              >
                                <Printer size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. MOBILE TAB: NOTIFIKASI LONCENG */}
          {mobileTab === 'lonceng' && (
            <div className="flex flex-col gap-4 animate-fade-in text-left">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col gap-1.5 mb-4 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="relative inline-block">
                      <Bell size={16} className="text-slate-800" />
                      {notifications.filter(n => !readNotifIds.includes(n.id)).length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                      )}
                    </span>
                    Notifikasi Sekolah
                  </h3>
                  <p className="text-slate-400 text-xs text-left">Pemberitahuan resmi iuran SPP, mutasi tabungan, absensi siswa, dan informasi sekolah.</p>
                </div>

                {/* Filter Cari Notifikasi di Ponsel */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Cari pengumuman..."
                    value={mobileNotifSearch}
                    onChange={(e) => setMobileNotifSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all font-semibold"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                </div>

                {/* List Notifikasi */}
                <div className="flex flex-col gap-3.5 pr-1">
                  {(() => {
                    const filtered = notifications.filter(n => {
                      const matchesQuery = n.title.toLowerCase().includes(mobileNotifSearch.toLowerCase()) || 
                                           (n.message || "").toLowerCase().includes(mobileNotifSearch.toLowerCase());
                      const isForThisStudent = !n.studentId || n.studentId === currentStudent.id;
                      return matchesQuery && isForThisStudent;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 px-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2.5">
                          <Bell size={24} className="text-slate-300 stroke-1" />
                          <div>
                            <p className="font-bold text-slate-600 text-[11px]">Belum Ada Pengumuman</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Semua notifikasi penting wali murid akan muncul di sini.</p>
                          </div>
                        </div>
                      );
                    }

                    return filtered.map((notif) => {
                      let bgClass = 'bg-blue-50/55 border-blue-150';
                      let barColor = 'bg-blue-650 bg-blue-600';
                      let labelText = 'Info Sekolah';
                      if (notif.type === 'success') { 
                        bgClass = 'bg-emerald-50/50 border-emerald-150'; 
                        barColor = 'bg-emerald-600'; 
                        labelText = 'Transaksi Berhasil'; 
                      } else if (notif.type === 'warning') { 
                        bgClass = 'bg-amber-50/60 border-amber-150'; 
                        barColor = 'bg-amber-500'; 
                        labelText = 'Pemberitahuan Rekening / Sandi'; 
                      } else if (notif.type === 'payment') { 
                        bgClass = 'bg-indigo-50/50 border-indigo-150'; 
                        barColor = 'bg-indigo-600'; 
                        labelText = 'Pembayaran Terverifikasi'; 
                      }

                      // Robust helper to resolve descriptions from any source or keyword patterns
                      const getNotifDetails = (n: RealtimeNotification): string => {
                        if (n.message && n.message.trim() !== '') return n.message;
                        const anyNotif = n as any;
                        if (anyNotif.pesan && anyNotif.pesan.trim() !== '') return anyNotif.pesan;
                        if (anyNotif.notes && anyNotif.notes.trim() !== '') return anyNotif.notes;
                        if (anyNotif.description && anyNotif.description.trim() !== '') return anyNotif.description;
                        if (anyNotif.content && anyNotif.content.trim() !== '') return anyNotif.content;
                        if (anyNotif.messageText && anyNotif.messageText.trim() !== '') return anyNotif.messageText;

                        // Fallbacks built dynamically to ensure clear user-facing descriptions
                        const lowerTitle = (n.title || "").toLowerCase();
                        if (lowerTitle.includes("identitas")) {
                          return "Data administrasi dan identitas resmi SMP MA'ARIF NU PANDAAN berhasil dimutakhirkan oleh Administrator.";
                        }
                        if (lowerTitle.includes("massal") || lowerTitle.includes("bulk")) {
                          return `Prosedur penarikan tabungan massal perwalian kelas berhasil dibukukan oleh sistem teller sekolah secara aman.`;
                        }
                        if (lowerTitle.includes("tarik") || lowerTitle.includes("tabungan") || lowerTitle.includes("withdraw")) {
                          return "Mutasi rekening atau status penarikan tabungan siswa telah dicatat dan didebet sesuai otorisasi.";
                        }
                        if (lowerTitle.includes("setoran") || lowerTitle.includes("deposit")) {
                          return "Mutasi penyetoran dana tabungan siswa telah berhasil diverifikasi dan ditambahkan ke saldo utama.";
                        }
                        if (lowerTitle.includes("gateway") || lowerTitle.includes("biaya") || lowerTitle.includes("midtrans")) {
                          return "Konfigurasi payment gateway otomatis dan biaya administrasi diperbarui untuk opsi pelunasan SPP online.";
                        }
                        if (lowerTitle.includes("spp") || lowerTitle.includes("bayar") || lowerTitle.includes("lunas")) {
                          return "Catatan pelunasan iuran bulanan SPP wajib siswa berhasil dicatatkan dalam server keuangan sekolah.";
                        }
                        if (lowerTitle.includes("sandi") || lowerTitle.includes("katasandi") || lowerTitle.includes("password")) {
                          return "Pengaturan kata sandi akun masuk portal siswa & wali murid berhasil diperbarui demi tujuan keamanan.";
                        }
                        return "Pengumuman berkala reguler mengenai kemajuan akademik dan aktivitas operasional harian sekolah.";
                      };

                      const fullMessage = getNotifDetails(notif);

                      return (
                        <div key={`m-notif-${notif.id}`} className={`p-4 rounded-xl border ${bgClass} flex flex-col gap-2 relative overflow-hidden text-left shadow-xs transition-colors`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor}`} />
                          
                          {/* Title and Badge Metadata Row */}
                          <div className="flex justify-between items-start gap-3 pl-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">{labelText}</span>
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight pr-10">{notif.title}</h4>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono font-bold whitespace-nowrap hidden sm:inline-block">
                              {new Date(notif.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Mobile Screen Spec Date Badge */}
                          <div className="pl-2.5 text-[9px] text-slate-500 font-mono font-bold block sm:hidden">
                            {new Date(notif.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>

                          {/* High Contrast Detailed Message Grid (Keterangan) */}
                          <div className="pl-2.5 mt-1 pb-0.5">
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider block mb-1">Keterangan:</span>
                            <p className="text-[12px] sm:text-xs text-slate-900 leading-relaxed font-bold break-words px-2.5 py-1.5 bg-white/70 border border-slate-250/25 rounded-lg">
                              {fullMessage}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 3. MOBILE TAB: PROFIL ORANG */}
          {mobileTab === 'orang' && (
            <div className="flex flex-col gap-5 animate-fade-in text-left">
              {/* Digital School Card Samping */}
              <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

                <div className="flex justify-between items-start mb-5">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Kartu Profil Siswa</span>
                    <span className="text-slate-400 text-[10px] mt-0.5 leading-none">{schoolIdentity?.name || "SMP Maarif NU Pandaan"}</span>
                  </div>
                  <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                    Kelas {currentStudent.class}
                  </span>
                </div>

                <div className="flex flex-col gap-3.5 border-t border-slate-800/80 pt-4">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Nama Lengkap Siswa</span>
                    <span className="text-base font-extrabold text-white leading-tight block">{currentStudent.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-1.5">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Nomor Induk Siswa (NIS)</span>
                      <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800/55 border border-slate-700/50 px-2 py-0.5 rounded w-fit">{currentStudent.nis}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Kontak Wali Phone</span>
                      <span className="text-xs font-semibold text-slate-300">{currentStudent.phone}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 text-left mt-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Orang Tua / Wali Sesi</span>
                    <span className="text-xs font-semibold text-slate-300">Bp/Ibu {currentStudent.name.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Security password form */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-1.5">
                    <Key size={14} className="text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ubah Kata Sandi Akun</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                  Sandi bawaan Anda adalah nomor <span className="font-mono font-bold bg-slate-100/100 px-1 py-0.5 rounded text-slate-700">NIS Siswa</span> atau <span className="font-mono font-bold bg-slate-100/100 px-1 py-0.5 rounded text-slate-700">123456</span>. Amankan dengan sandi baru di sini.
                </p>

                <form onSubmit={handlePasswordChangeSubmit} className="flex flex-col gap-3.5 mt-2 border-t border-slate-100 pt-3">
                  {passwordError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg font-bold flex items-center gap-1.5 text-[11px] text-left">
                      <AlertCircle size={14} /> {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-lg font-bold flex items-center gap-1.5 text-[11px] text-left">
                      <Check size={14} /> {passwordSuccess}
                    </div>
                  )}

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Lama / Default *</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan sandi lama"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-600 transition-all text-slate-800 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru *</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-600 transition-all text-slate-800 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full mt-1.5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {changingPassword ? 'Sedang Memproses...' : 'Ubah Sandi Baru Anda 🔐'}
                  </button>
                </form>
              </div>

              {/* Mobile app download on Mobile Profile Tab */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 text-left">
                <div className="flex items-center gap-1.5">
                  <Smartphone size={15} className="text-emerald-700" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800">Unduh Aplikasi Mobile Resmi</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Siswa &amp; wali murid disarankan menggunakan aplikasi Android (.apk) atau iOS (.ipa/App Store) resmi untuk kemudahan akses monitoring langsung tanpa browser.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={schoolIdentity?.apkUrl || "#"}
                    target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.apkUrl) {
                        e.preventDefault();
                        alert("Link unduhan Android belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.apkUrl 
                        ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Smartphone size={14} className={schoolIdentity?.apkUrl ? "text-emerald-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10.5px]">Android APK</span>
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
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.iosUrl 
                        ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Apple size={14} className={schoolIdentity?.iosUrl ? "text-sky-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10.5px]">iOS Apple</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      {currentStudent && (
        <div 
          style={{ contentVisibility: 'auto' }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16 no-print select-none"
        >
          {/* Menu 1 (Home - paling kiri) */}
          <button
            type="button"
            onClick={() => {
              setMobileTab('beranda');
              setActiveTab('spp');
              setShowMoreMenu(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${mobileTab === 'beranda' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <Home size={20} className={mobileTab === 'beranda' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${mobileTab === 'beranda' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Beranda</span>
          </button>

          {/* Menu 2 (Log Trx) */}
          <button
            type="button"
            onClick={() => {
              setMobileTab('log');
              setShowMoreMenu(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${mobileTab === 'log' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <History size={20} className={mobileTab === 'log' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${mobileTab === 'log' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Log Trx</span>
          </button>

          {/* Menu 3 (Notifikasi) */}
          <button
            type="button"
            onClick={() => {
              setMobileTab('lonceng');
              setShowMoreMenu(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all relative"
          >
            <div className={`p-1.5 rounded-xl transition-colors relative ${mobileTab === 'lonceng' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <Bell size={20} className={mobileTab === 'lonceng' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
              {notifications.filter(n => (!n.studentId || n.studentId === currentStudent?.id) && !readNotifIds.includes(n.id)).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white px-1 leading-none shadow-sm border border-white">
                  {notifications.filter(n => (!n.studentId || n.studentId === currentStudent?.id) && !readNotifIds.includes(n.id)).length}
                </span>
              )}
            </div>
            <span className={`text-[9.5px] leading-none ${mobileTab === 'lonceng' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Notif</span>
          </button>

          {/* Menu 4 (Profil) */}
          <button
            type="button"
            onClick={() => {
              setMobileTab('orang');
              setShowMoreMenu(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${mobileTab === 'orang' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <User size={20} className={mobileTab === 'orang' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${mobileTab === 'orang' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Profil</span>
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
      )}

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
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Akses Cepat Siswa</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Menu Tambahan Siswa / Wali</h4>
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
                    setPrintQrCard(true);
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-600 text-lg">📇</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Kartu Pembayaran</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Cetak kartu ID pembayaran digital dengan kode QR unik Anda</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('beranda');
                    setActiveTab('spp');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-600 text-lg">💰</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800 font-sans">Tagihan SPP</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Cek status cicilan iuran bulanan dan pelunasan SPP online</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('beranda');
                    setActiveTab('tabungan');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">🏦</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Setor &amp; Tarik</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Ajukan setor tunai mandiri maupun penarikan dana tabungan</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('beranda');
                    setActiveTab('absensi');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-sky-50 rounded-xl text-sky-600 text-lg">📅</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Kehadiran Kelas</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Rekapitulasi log harian dan absen mata pelajaran siswa</p>
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
                    <h5 className="font-extrabold text-xs text-rose-800">Keluar Sesi</h5>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-tight">Keluar dengan aman serta akhiri pengalihan akses siswa</p>
                  </div>
                </button>
              </div>

              {/* Quick access to download Mobile Apps in the bottom sheet menu */}
              <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  📲 Unduh Aplikasi Mobile Resmi
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Gunakan aplikasi mobile resmi untuk kemudahan akses monitor laporan tagihan SPP, presensi kelas, &amp; dana tabungan langsung lewat HP.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a
                    href={schoolIdentity?.apkUrl || "#"}
                    target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.apkUrl) {
                        e.preventDefault();
                        alert("Link unduhan Android belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.apkUrl 
                        ? "bg-emerald-50 hover:bg-emerald-105 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Smartphone size={13} className={schoolIdentity?.apkUrl ? "text-emerald-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">Android APK</span>
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
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.iosUrl 
                        ? "bg-sky-50 hover:bg-sky-105 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Apple size={13} className={schoolIdentity?.iosUrl ? "text-sky-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">iOS Apple</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {printQrCard && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col gap-6 relative"
          >
            {/* Header Action Buttons */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 text-slate-900">
                <QrCode className="text-indigo-600 animate-pulse" size={17} />
                <span className="font-extrabold text-sm uppercase tracking-wide">Pratinjau Cetak Kartu QR</span>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTimeout(() => window.print(), 100);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer size={12} /> Cetak Kartu 🖨️
                </button>
                <button
                  type="button"
                  onClick={() => setPrintQrCard(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable Area Wrapper */}
            <div className="bg-white p-4 rounded-lg border border-slate-100 flex flex-col items-center">
              <div id="print-report-section">
                <StudentPaymentCard 
                  student={currentStudent} 
                  schoolIdentity={schoolIdentity} 
                  isPreview={true}
                />
              </div>

              <span className="text-center text-[7.5px] text-slate-400 uppercase tracking-widest font-extrabold pt-4 no-print select-none">
                ✂️ Potong Mengikuti Batas Luar Kartu
              </span>
            </div>

          </motion.div>
        </div>
      )}

      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-xl w-full flex flex-col gap-5 relative select-none">
            
            {/* Format Selection Switcher */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl no-print text-[11px] font-bold text-slate-650 w-full justify-center">
              <button
                type="button"
                onClick={() => setReceiptPrintFormat('standard')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${receiptPrintFormat === 'standard' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Format Standar (Kuitansi PDF)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPrintFormat('thermal')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${receiptPrintFormat === 'thermal' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Format Thermal (Roll Kasir)
              </button>
            </div>

            {/* Receipt Preview */}
            <div 
              id="print-receipt-section" 
              className={receiptPrintFormat === 'thermal'
                ? "bg-white text-slate-900 p-2 font-mono flex flex-col gap-2.5 text-[10px] leading-tight text-center relative print-thermal w-full max-w-[76mm] mx-auto border-none select-all"
                : "bg-white text-slate-900 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-6 text-[11px] leading-relaxed relative"
              }
            >
              {receiptPrintFormat === 'thermal' ? (
                /* THERMAL RECEIPT LAYOUT */
                <div className="flex flex-col gap-2.5 text-slate-900 font-mono text-left select-all">
                  {/* Small Header */}
                  <div className="text-center font-black uppercase text-xs tracking-wider border-b border-dashed border-slate-900 pb-2.5">
                    <span className="block text-sm font-extrabold">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                    <span className="block text-[8px] font-normal normal-case leading-none mt-1">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                    <span className="block text-[7.5px] font-normal mt-0.5">{schoolIdentity?.address || "Pasuruan, Jawa Timur"}</span>
                  </div>

                  <div className="text-center font-mono font-bold uppercase text-[9px] py-1 border-b border-dashed border-slate-900">
                    <span>* BUKTI PEMBAYARAN RESMI *</span>
                    <p className="text-[8px] font-mono normal-case tracking-tight mt-0.5">Ref: #{receiptToPrint.detail.id.substring(0,10).toUpperCase()}</p>
                    <p className="text-[8.5px] font-normal normal-case mt-0.5">Tgl: {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})} &bull; Jam: {new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>

                  {/* Student details */}
                  <div className="flex flex-col gap-0.5 text-[8.5px] pb-1.5 border-b border-dashed border-slate-900 uppercase">
                    <div className="flex justify-between">
                      <span>Murid:</span>
                      <span className="font-bold">{receiptToPrint.student.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NIS:</span>
                      <span className="font-mono">{receiptToPrint.student.nis}</span>
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
                    <div className="flex justify-between font-bold py-0.5 uppercase">
                      <div>
                        {receiptToPrint.type === 'spp' ? (
                          <>
                            <span>Iuran SPP Bulanan</span>
                            <p className="text-[7.5px] text-slate-650 normal-case">Bulan: {receiptToPrint.detail.month} {receiptToPrint.detail.year}</p>
                          </>
                        ) : (
                          <>
                            <span>Tabungan ({receiptToPrint.detail.type === 'deposit' ? 'Penyetoran' : 'Penarikan'})</span>
                            <p className="text-[7.5px] text-slate-650 normal-case">Memo: "{receiptToPrint.detail.notes || 'Transaksi Tabungan'}"</p>
                          </>
                        )}
                      </div>
                      <span className="font-mono shrink-0">Rp {receiptToPrint.detail.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Grand total */}
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase py-1 border-b border-dashed border-slate-900">
                    <span>Total Pembayaran:</span>
                    <span className="font-mono text-xs">Rp {receiptToPrint.detail.amount.toLocaleString('id-ID')}</span>
                  </div>

                  {/* Words */}
                  <div className="text-[7.5px] leading-tight italic pb-2 border-b border-dashed border-slate-900">
                    Terbilang: {indonesianWordsForRupiah(receiptToPrint.detail.amount)}
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 text-[8px] text-center uppercase gap-2 pt-2">
                    <div className="flex flex-col justify-between h-[45px]">
                      <span>Penyetor/Murid</span>
                      <div className="h-4"></div>
                      <span className="font-bold border-t border-slate-900 pt-0.5 truncate">({receiptToPrint.student.name.substring(0,12)})</span>
                    </div>
                    <div className="flex flex-col justify-between h-[45px]">
                      <span>Bendahara/Admin</span>
                      <div className="h-4"></div>
                      <span className="font-bold border-t border-slate-900 pt-0.5">({schoolIdentity?.treasurer || "Bendahara"})</span>
                    </div>
                  </div>

                  <div className="text-center text-[7px] leading-none tracking-tight mt-4 text-slate-550 border-t border-dotted border-slate-900 pt-2 uppercase">
                    *** TERIMA KASIH ***
                    <p className="mt-1 font-mono text-[6.5px] tracking-widest text-[6px]">SMP Ma'arif NU Pandaan</p>
                  </div>
                </div>
              ) : (
                /* STANDARD RECEIPT LAYOUT */
                <>
                  {/* Paid Status Watermark Badge on the Receipt itself */}
                  {((receiptToPrint.type === 'spp' && receiptToPrint.detail.status === 'paid') || 
                    (receiptToPrint.type === 'savings' && (receiptToPrint.detail.status === 'success' || !receiptToPrint.detail.status || receiptToPrint.detail.status === 'completed'))) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 border-4 border-dashed border-emerald-500/15 rounded-2xl px-6 py-2 pointer-events-none select-none z-0">
                      <span className="font-sans font-black tracking-widest text-[36px] uppercase text-emerald-500/15">
                        {receiptToPrint.type === 'spp' ? 'LUNAS' : 'SUKSES'}
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
                      <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center">
                        <span className="font-extrabold text-slate-800 text-[9px]">KUITANSI RESMI</span>
                        <span>Ref: #{receiptToPrint.detail.id.substring(0,10).toUpperCase()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        {schoolIdentity?.logo && (
                          <img 
                            src={schoolIdentity.logo} 
                            className="w-10 h-10 object-contain" 
                            alt="Logo" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                          <span className="text-[8px] text-slate-400 block font-medium mt-0.5">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {schoolIdentity?.logo2 && (
                          <img 
                            src={schoolIdentity.logo2} 
                            className="w-10 h-10 object-contain" 
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
                  <div className="flex flex-col gap-2 py-1">
                    <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[9px] uppercase text-slate-400">
                      <span>Deskripsi Item Pembayaran</span>
                      <span>Total Rupiah</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800">
                      <div className="flex flex-col gap-0.5 text-left">
                        {receiptToPrint.type === 'spp' ? (
                          <>
                            <span className="font-bold text-slate-800 text-xs">Pembayaran Iuran SPP Wajib Bulanan</span>
                            <span className="text-[9px] text-slate-500 font-medium leading-none mt-1">Bulan periodik: {receiptToPrint.detail.month} {receiptToPrint.detail.year} &bull; Metode: {receiptToPrint.detail.paymentMethod?.toUpperCase() || 'ONLINE/MANUAL'}</span>
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
                  <div className="flex flex-col gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium italic text-slate-650 text-[10px] text-left">
                      Terbilang: <span className="font-bold not-italic font-sans text-indigo-700">#{indonesianWordsForRupiah(receiptToPrint.detail.amount)}#</span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-semibold pl-1 text-left">
                      Tanggal Cetak: {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 mt-4 pt-3 border-t border-slate-100 text-[10px]">
                    <div className="flex flex-col justify-between h-[120px] text-left">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Wali Murid / Penyetor</span>
                      <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-28 pt-1 text-center font-bold">({receiptToPrint.student.name.substring(0, 16)})</span>
                    </div>
                    <div className="flex flex-col justify-between items-end h-[120px] text-right relative">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-bold text-slate-800 font-sans">
                          Pandaan, {receiptToPrint.type === 'spp'
                            ? (receiptToPrint.detail.paidAt 
                                ? new Date(receiptToPrint.detail.paidAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})
                                : (receiptToPrint.detail.status === 'paid' ? new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Belum Lunas'))
                            : new Date(receiptToPrint.detail.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                      </div>
                      
                      {/* Signature and Stamp layer for paid/completed receipts */}
                      {((receiptToPrint.type === 'spp' && receiptToPrint.detail.status === 'paid') || 
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

                      <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-28 pt-1 text-center font-bold">({schoolIdentity?.treasurer || "Bendahara Sekolah"})</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-[8px] text-slate-400 mt-1 font-medium">
                    Bukti pembayaran sah diterbitkan otomatis oleh {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}.
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions at the Bottom */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4 border-t border-slate-100 no-print">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-450 text-left">
                Kuitansi Resmi Pembayaran
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(receiptToPrint.type, receiptToPrint.detail, receiptToPrint.student, schoolIdentity)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-slate-900 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download size={12} /> Unduh Invoice HTML 📥
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer size={12} /> Cetak / Save PDF 🖨️
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptToPrint(null)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
