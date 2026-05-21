import React, { useState, useEffect, useMemo } from 'react';
import { Student, SppBill, SavingsTransaction, SchoolIdentity, AttendanceLog } from '../types';
import { motion } from 'motion/react';
import { GraduationCap, User, CreditCard, Wallet, Landmark, ArrowUpRight, ArrowDownLeft, Clock, RefreshCw, Send, CheckCircle2, ChevronRight, Check, Key, AlertCircle, CalendarRange, Printer, Download } from 'lucide-react';

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
  attendanceLogs = []
}: StudentPanelProps) {
  const [activeTab, setActiveTab] = useState<'spp' | 'tabungan' | 'absensi'>('spp');

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
        <td class="meta-td" style="text-align: right;">
          <span class="meta-label" style="text-align: right;">Tanggal Bayar</span>
          <span class="meta-val" style="display: block; text-align: right;">${dateStr}</span>
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
    </div>

    <table class="sig-table">
      <tr>
        <td class="sig-td" style="text-align: left;">
          <span class="sig-label">Wali Murid / Pembayar</span>
          <br />
          <span class="sig-line">(${student.name.substring(0, 16)})</span>
        </td>
        <td class="sig-td" style="text-align: right;">
          <span class="sig-label">${sIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
          <br />
          <span class="sig-line">(${sIdentity?.treasurer || "Bendahara Sekolah"})</span>
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

  return (
    <div id="student-panel-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Account Selector and Profile Details */}
      <div className="lg:col-span-4 flex flex-col gap-6">
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
            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:shadow-sm transition-all">
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
      </div>

      {/* Right Column: SPP Checklist / Deposits Form & History */}
      <div className="lg:col-span-8">
        {currentStudent ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full"
          >
            {/* Folder Header Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  id="tab-spp"
                  onClick={() => setActiveTab('spp')}
                  className={`py-3 px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === 'spp'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pembayaran SPP {selectedAcademicYear ? `(TA ${selectedAcademicYear})` : ''}
                </button>
                <button
                  id="tab-tabungan"
                  onClick={() => setActiveTab('tabungan')}
                  className={`py-3 px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === 'tabungan'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Metode Tabungan & Setoran
                </button>
                <button
                  id="tab-absensi"
                  onClick={() => setActiveTab('absensi')}
                  className={`py-3 px-1 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'absensi'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CalendarRange size={12} className="text-emerald-500" />
                  <span>Sistem Absensi Kehadiran</span>
                </button>
              </div>

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Portal Siswa"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Panel Tab Core Content */}
            <div className="p-6 flex-1">
              {activeTab === 'spp' && (
                <div>
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

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase font-bold tracking-widest text-[9px] border-b border-slate-200">
                          <th className="px-5 py-3">Bulan / Periode</th>
                          <th className="px-5 py-3 text-right">Nominal</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-right">Aksi Pembayaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBills.map((bill) => {
                          const isPaid = bill.status === 'paid';
                          const isPending = bill.status === 'pending';

                          return (
                            <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3.5 font-semibold text-slate-850">
                                <div className="flex flex-col gap-0.5">
                                  <span>{bill.month} {bill.year}</span>
                                  {selectedAcademicYear && getAcademicYearOfBill(bill) !== selectedAcademicYear && (
                                    <span className="inline-block text-[8px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-100 max-w-max uppercase tracking-wider mt-1.5 animate-pulse">
                                      Tunggakan TA {getAcademicYearOfBill(bill)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                                Rp {bill.amount.toLocaleString('id-ID')}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                    <Check size={10} strokeWidth={3} /> Lunas
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-100 uppercase animate-pulse">
                                    <Clock size={10} /> Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-100 uppercase">
                                    Belum Lunas
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
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
                </div>
              )}

              {activeTab === 'tabungan' && (
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Nominal Cepat</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {presetAmounts.map((preset) => (
                          <button
                            key={preset}
                            type="button, button"
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
                        <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex items-center gap-2 font-medium">
                          <CheckCircle2 size={12} /> Tarik Tabungan sukses divalidasi teller!
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* History Section (Under content) */}
              <div className="mt-8">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                  Log Transaksi Tabungan Siswa
                </h4>
                
                {transactions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                    Belum ada riwayat transaksi tabungan untuk siswa ini.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[220px] overflow-y-auto">
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
                              <td className="px-5 py-3">
                                <div className="font-semibold text-slate-800">{tx.notes || 'Penyesuaian Saldo'}</div>
                                {tx.orderId && <div className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {tx.orderId}</div>}
                              </td>
                              <td className="px-5 py-3 text-center text-[10px] font-semibold text-slate-500">
                                {tx.paymentMethod || 'Manual Teller'}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {isDeposit ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded text-[9px] uppercase tracking-wide">
                                    <ArrowUpRight size={9} /> Setor
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded text-[9px] uppercase tracking-wide">
                                    <ArrowDownLeft size={9} /> Tarik
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <span className={`font-bold font-mono text-[11px] ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isDeposit ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setReceiptToPrint({ type: 'savings', detail: tx, student: currentStudent! })}
                                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded border border-slate-200/80 shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
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
                )}
              </div>
              
              {activeTab === 'absensi' && (
                <div className="flex flex-col gap-6 animate-fade-in text-left">
                  <div>
                    <h4 className="font-bold text-slate-850 text-sm">Sistem Absensi Kehadiran Siswa</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Catatan presensi harian siswa yang dikonfirmasi oleh Wali Kelas Anda secara berkala.
                    </p>
                  </div>

                  {/* Attendance Stats Cards */}
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
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                            <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Hadir</span>
                            <span className="block text-lg font-black text-emerald-800 mt-1">{hCount} Hari</span>
                          </div>
                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                            <span className="block text-[9px] font-bold text-purple-600 uppercase tracking-wider">Terlambat</span>
                            <span className="block text-lg font-black text-purple-800 mt-1">{tCount} Hari</span>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                            <span className="block text-[9px] font-bold text-amber-600 uppercase tracking-wider">Sakit</span>
                            <span className="block text-lg font-black text-amber-800 mt-1">{sCount} Hari</span>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                            <span className="block text-[9px] font-bold text-blue-600 uppercase tracking-wider">Izin</span>
                            <span className="block text-lg font-black text-blue-800 mt-1">{iCount} Hari</span>
                          </div>
                          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                            <span className="block text-[9px] font-bold text-rose-600 uppercase tracking-wider">Alpa</span>
                            <span className="block text-lg font-black text-rose-800 mt-1">{aCount} Hari</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-950 rounded-xl p-3 text-center text-white">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kehadiran</span>
                            <span className="block text-lg font-black mt-1 text-emerald-400">{attendanceRate}%</span>
                          </div>
                        </div>

                        {/* Recent Attendance Logs Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          {logs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                              Belum ada catatan absensi untuk siswa {currentStudent?.name || ''}.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-55 bg-slate-100 border-b border-slate-200 font-bold text-slate-600 text-[10px] uppercase tracking-wider select-none">
                                    <th className="py-2.5 px-4">Hari & Tanggal</th>
                                    <th className="py-2.5 px-4 text-center">Status</th>
                                    <th className="py-2.5 px-4">Keterangan / Alasan dari Wali Kelas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {logs.slice().sort((a,b) => b.date.localeCompare(a.date)).map((log) => {
                                    const statusColors: Record<string, string> = {
                                      'Hadir': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                      'Terlambat': 'bg-purple-50 text-purple-700 border-purple-200',
                                      'Sakit': 'bg-amber-50 text-amber-700 border-amber-200',
                                      'Izin': 'bg-blue-50 text-blue-700 border-blue-200',
                                      'Alpa': 'bg-rose-50 text-rose-700 border-rose-200'
                                    };
                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                                          {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[9px] uppercase border ${statusColors[log.status] || 'bg-slate-100 text-slate-805'}`}>
                                            {log.status}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-500 italic max-w-xs truncate">
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

      {/* Receipt Modal for Student Panel */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-xl w-full flex flex-col gap-6 relative select-none">
            
            {/* Modal Actions */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-450 text-left">Kuitansi Resmi Pembayaran</span>
              <div className="flex gap-2">
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

            {/* Receipt Preview */}
            <div id="print-receipt-section" className="bg-white text-slate-900 p-6 rounded-lg font-sans border border-slate-100 flex flex-col gap-5 text-[11px] leading-relaxed relative">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 text-slate-700 pb-3 border-b border-dashed border-slate-300">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Wali Murid / Siswa</span>
                  <span className="font-bold text-slate-800 text-[11px]">{receiptToPrint.student.name}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">NIS Siswa</span>
                  <span className="font-mono font-semibold text-slate-700">{receiptToPrint.student.nis}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Pendidikan / Kelas</span>
                  <span className="font-bold text-slate-800 text-[11px]">Kelas {receiptToPrint.student.class}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right font-mono">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Cetak</span>
                  <span className="font-medium text-slate-600 block">{new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
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
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium italic text-slate-600 text-[10px] text-left">
                Terbilang: <span className="font-bold not-italic font-sans text-indigo-700">#{indonesianWordsForRupiah(receiptToPrint.detail.amount)}#</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 mt-4 pt-3 border-t border-slate-100 text-[10px]">
                <div className="flex flex-col justify-between h-[65px] text-left">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Wali Murid / Penyetor</span>
                  <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-28 pt-1 text-center">({receiptToPrint.student.name.substring(0, 16)})</span>
                </div>
                <div className="flex flex-col justify-between items-end h-[65px] text-right">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                  <span className="font-bold text-slate-700 font-sans border-t border-slate-300 w-28 pt-1 text-center">({schoolIdentity?.treasurer || "Bendahara Madrasah"})</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[8px] text-slate-400 mt-1 font-medium">
                Bukti pembayaran sah diterbitkan otomatis oleh {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
