import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceLog, HomeroomTeacher, SchoolIdentity, SppBill } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Check, AlertCircle, Save, Loader2, Users, ClipboardCheck, 
  Sparkles, LogOut, ArrowRight, BookOpen, AlertCircle as ErrorIcon,
  Download, Copy, Search, Wallet, CreditCard, CheckCircle, Clock, User, Key,
  Printer, FileText
} from 'lucide-react';

interface HomeroomPanelProps {
  currentTeacher: HomeroomTeacher;
  students: Student[];
  attendanceLogs: AttendanceLog[];
  bills: SppBill[];
  schoolIdentity?: SchoolIdentity;
  onLogout: () => void;
  onSaveBatchAttendance: (logs: { studentId: string; date: string; status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }[]) => Promise<boolean>;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function HomeroomPanel({
  currentTeacher,
  students,
  attendanceLogs,
  bills,
  schoolIdentity,
  onLogout,
  onSaveBatchAttendance,
  onRefresh,
  isLoading
}: HomeroomPanelProps) {
  const todayStr = new Date().toISOString().substring(0, 10);

  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'history' | 'rekap_absensi' | 'finance' | 'profile'>('record');
  const [rekapStartDate, setRekapStartDate] = useState(getFirstDayOfMonth());
  const [rekapEndDate, setRekapEndDate] = useState(todayStr);
  const [financeSearch, setFinanceSearch] = useState('');
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Homeroom Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Teaching Journals state and printing systems
  const [teachingJournalsList, setTeachingJournalsList] = useState<any[]>([]);
  const [loadingJournals, setLoadingJournals] = useState(false);
  const [journalViewMode, setJournalViewMode] = useState<'presensi' | 'kbm'>('presensi');
  const [selectedJournalToPrint, setSelectedJournalToPrint] = useState<any | null>(null);
  const [compiledJournalPrint, setCompiledJournalPrint] = useState<boolean>(false);

  const fetchTeachingJournals = async () => {
    setLoadingJournals(true);
    try {
      const res = await fetch('/api/teaching-journals');
      if (res.ok) {
        const data = await res.json();
        // Filter journals that belong to current homeroom teacher's class
        const filtered = data.filter((j: any) => j.className.toLowerCase() === currentTeacher.className.toLowerCase());
        setTeachingJournalsList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat jurnal pembelajaran guru", err);
    } finally {
      setLoadingJournals(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchTeachingJournals();
    }
  }, [activeSubTab, currentTeacher.className]);
  
  // Filter students who are in this homeroom teacher's class
  const classStudents = students.filter(
    (s) => s.class.toLowerCase() === currentTeacher.className.toLowerCase()
  );

  // In-memory state for active edits of attendance for the selected date
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState<boolean>(false);

  // Sync state when date changes or logs/students change
  useEffect(() => {
    const statusMap: Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }> = {};
    
    classStudents.forEach((student) => {
      const existing = attendanceLogs.find(
        (log) => log.studentId === student.id && log.date === selectedDate
      );
      if (existing) {
        statusMap[student.id] = {
          status: existing.status,
          notes: existing.notes || ''
        };
      } else {
        // default status is "Hadir"
        statusMap[student.id] = {
          status: 'Hadir',
          notes: ''
        };
      }
    });

    setDailyStatusMap(statusMap);
    setNotifMsg(null);
  }, [selectedDate, attendanceLogs, students]);

  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat') => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotifMsg(null);

    const logsToSave = classStudents.map((s) => ({
      studentId: s.id,
      date: selectedDate,
      status: dailyStatusMap[s.id]?.status || 'Hadir',
      notes: dailyStatusMap[s.id]?.notes || ''
    }));

    try {
       const success = await onSaveBatchAttendance(logsToSave);
       if (success) {
         setNotifMsg({ type: 'success', text: `🎉 Berhasil menyimpan absensi Kelas ${currentTeacher.className} tanggal ${selectedDate}!` });
         setShowSuccessCheck(true);
       } else {
         setNotifMsg({ type: 'error', text: 'Gagal menghubungkan ke server untuk menyimpan absensi.' });
       }
     } catch (err) {
       setNotifMsg({ type: 'error', text: 'Terjadi kesalahan sistem.' });
     } finally {
       setIsSaving(false);
     }
  };

  const handleTeacherPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Sandi baru harus berjumlah minimal 6 karakter.');
      return;
    }
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const res = await fetch('/api/homerooms/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: currentTeacher.id,
          oldPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordSuccess('🎉 Kata sandi berhasil diperbarui secara aman.');
        setOldPassword('');
        setNewPassword('');
      } else {
        setPasswordError(data.error || 'Gagal memperbarui sandi.');
      }
    } catch (err) {
      setPasswordError('Kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Pre-calculate today's statistics
  const currentFilteredLogs = attendanceLogs.filter(l => l.date === selectedDate && classStudents.some(s => s.id === l.studentId));
  const stats = {
    total: classStudents.length,
    hadir: currentFilteredLogs.filter(l => l.status === 'Hadir').length,
    terlambat: currentFilteredLogs.filter(l => l.status === 'Terlambat').length,
    sakit: currentFilteredLogs.filter(l => l.status === 'Sakit').length,
    izin: currentFilteredLogs.filter(l => l.status === 'Izin').length,
    alpa: currentFilteredLogs.filter(l => l.status === 'Alpa').length,
  };

  const currentDailyStats = useMemo(() => {
    const values = Object.values(dailyStatusMap) as { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }[];
    return {
      total: classStudents.length,
      hadir: values.filter(v => v.status === 'Hadir').length,
      terlambat: values.filter(v => v.status === 'Terlambat').length,
      sakit: values.filter(v => v.status === 'Sakit').length,
      izin: values.filter(v => v.status === 'Izin').length,
      alpa: values.filter(v => v.status === 'Alpa').length,
    };
  }, [dailyStatusMap, classStudents]);

  // All time class stats
  const classLogs = attendanceLogs.filter(l => classStudents.some(s => s.id === l.studentId));

  // Copy WhatsApp Reminder for parents regarding outstanding bills
  const copyWaReminder = (student: Student, unpaidBills: SppBill[]) => {
    const formattedSavings = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(student.savingsBalance || 0);

    const totalUnpaid = unpaidBills.reduce((acc, curr) => acc + curr.amount, 0);
    const formattedUnpaid = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(totalUnpaid);

    const monthsStr = unpaidBills.map(b => `${b.month} ${b.year}`).join(', ');
    const schoolName = schoolIdentity?.name || "SMP Maarif";

    const text = `Assalamualaikum Wr. Wb. Bapak/Ibu Wali Murid dari *${student.name}* (NIS: *${student.nis}*).

Kami dari pihak Wali Kelas *${currentTeacher.className}* ${schoolName} ingin menginfokan bahwa saat ini terdapat tagihan SPP bulanan siswa yang belum dilunasi dengan rincian sebagai berikut:

*Tunggakan SPP Belum Lunas:* ${formattedUnpaid} (${monthsStr})
*Saldo Tabungan Saat Ini:* ${formattedSavings}

Bapak/Ibu dapat melakukan pelunasan SPP ini secara online via Portal Pembayaran Siswa, atau dengan menyetorkan secara tunai melalui staf sekolah / teller keuangan.

Terima kasih banyak atas perhatian, kerja sama, dan support Bapak/Ibu sekalian.
Wassalamualaikum Wr. Wb.

-- Hormat kami,
*${currentTeacher.name}*
(Wali Kelas ${currentTeacher.className})`;

    navigator.clipboard.writeText(text);
    setCopiedStudentId(student.id);
    setTimeout(() => {
      setCopiedStudentId(null);
    }, 2000);
  };

  // Memoized Attendance Recap calculation in selected duration
  const rekapData = useMemo(() => {
    return classStudents.map((student, idx) => {
      // Filter logs for this student within date range
      const sLogs = attendanceLogs.filter(
        l => l.studentId === student.id &&
             l.date >= rekapStartDate &&
             l.date <= rekapEndDate
      );

      const countHadir = sLogs.filter(l => l.status === 'Hadir').length;
      const countTerlambat = sLogs.filter(l => l.status === 'Terlambat').length;
      const countSakit = sLogs.filter(l => l.status === 'Sakit').length;
      const countIzin = sLogs.filter(l => l.status === 'Izin').length;
      const countAlpa = sLogs.filter(l => l.status === 'Alpa').length;
      const totalDays = sLogs.length;

      // Rate of attendance (hadir and terlambat ratio of total sessions logged)
      const attendanceRate = totalDays > 0 
        ? Math.round(((countHadir + countTerlambat) / totalDays) * 100) 
        : 100;

      return {
        index: idx + 1,
        student,
        hadir: countHadir,
        terlambat: countTerlambat,
        sakit: countSakit,
        izin: countIzin,
        alpa: countAlpa,
        total: totalDays,
        rate: attendanceRate
      };
    });
  }, [classStudents, attendanceLogs, rekapStartDate, rekapEndDate]);

  // Excel (.xls format with clean XML and styles optimized for Microsoft Excel)
  const downloadExcelRekap = () => {
    const totalHadirClass = rekapData.reduce((acc, r) => acc + r.hadir, 0);
    const totalTerlambatClass = rekapData.reduce((acc, r) => acc + r.terlambat, 0);
    const totalSakitClass = rekapData.reduce((acc, r) => acc + r.sakit, 0);
    const totalIzinClass = rekapData.reduce((acc, r) => acc + r.izin, 0);
    const totalAlpaClass = rekapData.reduce((acc, r) => acc + r.alpa, 0);
    const totalPencatatanClass = rekapData.reduce((acc, r) => acc + r.total, 0);
    const avgRateClass = rekapData.length > 0
      ? Math.round(rekapData.reduce((acc, r) => acc + r.rate, 0) / rekapData.length)
      : 0;

    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();

    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Rekap Presensi</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #1e293b;
  }
  .title-school {
    font-size: 15pt;
    font-weight: bold;
    color: #15803d; /* Emerald-700 green */
    text-align: left;
    height: 30px;
  }
  .title-report {
    font-size: 11pt;
    font-weight: bold;
    color: #334155;
    text-align: left;
    height: 22px;
  }
  .meta-label {
    font-size: 9pt;
    font-weight: bold;
    color: #475569;
    height: 18px;
  }
  .meta-value {
    font-size: 9pt;
    color: #0f172a;
    height: 18px;
  }
  .th-header {
    background-color: #1e293b; /* Slate-800 */
    color: #ffffff;
    font-weight: bold;
    font-size: 9.5pt;
    text-align: center;
    border: 1px solid #cbd5e1;
    height: 28px;
    vertical-align: middle;
  }
  .td-data {
    font-size: 9.5pt;
    border: 1px solid #e2e8f0;
    height: 22px;
    vertical-align: middle;
    padding: 2px 6px;
  }
  .td-center {
    text-align: center;
  }
  .td-left {
    text-align: left;
  }
  .zebra-even {
    background-color: #f8fafc; /* Slate-50 zebra pattern */
  }
  .summary-row {
    background-color: #f1f5f9; /* Slate-100 */
    font-weight: bold;
    font-size: 9.5pt;
    height: 24px;
  }
</style>
</head>
<body>
  <table>
    <!-- Header identity info block -->
    <tr>
      <td colspan="11" class="title-school">${schoolNameUpper}</td>
    </tr>
    <tr>
      <td colspan="11" class="title-report">LAPORAN REKAPITULASI PRESENSI KEHADIRAN SISWA</td>
    </tr>
    <tr>
      <td colspan="11" style="height: 6px;"></td>
    </tr>
    
    <!-- Meta/Context Details -->
    <tr>
      <td colspan="2" class="meta-label">Kelas:</td>
      <td colspan="9" class="meta-value">${currentTeacher.className}</td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Wali Kelas:</td>
      <td colspan="9" class="meta-value">${currentTeacher.name}</td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Rentang Waktu:</td>
      <td colspan="9" class="meta-value">${rekapStartDate} s.d. ${rekapEndDate}</td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Tanggal Ekspor:</td>
      <td colspan="9" class="meta-value">${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB</td>
    </tr>
    <tr>
      <td colspan="11" style="height: 12px;"></td>
    </tr>

    <!-- Table Grid Heads -->
    <thead>
      <tr>
        <th class="th-header" style="width: 40px; background-color: #334155;">No</th>
        <th class="th-header" style="width: 100px; background-color: #334155;">NIS</th>
        <th class="th-header" style="width: 250px; background-color: #334155;">Nama Siswa</th>
        <th class="th-header" style="width: 70px; background-color: #334155;">Kelas</th>
        <th class="th-header" style="width: 85px; background-color: #16a34a;">Hadir (H)</th>
        <th class="th-header" style="width: 90px; background-color: #ca8a04;">Terlambat (T)</th>
        <th class="th-header" style="width: 85px; background-color: #2563eb;">Sakit (S)</th>
        <th class="th-header" style="width: 85px; background-color: #7c3aed;">Izin (I)</th>
        <th class="th-header" style="width: 90px; background-color: #db2777;">Alpa (A)</th>
        <th class="th-header" style="width: 100px; background-color: #475569;">Total Hari</th>
        <th class="th-header" style="width: 100px; background-color: #0f766e;">Persentase</th>
      </tr>
    </thead>
    <tbody>
`;

    rekapData.forEach((row, idx) => {
      const isEven = idx % 2 === 1;
      const zebraClass = isEven ? 'zebra-even' : '';
      const percentValue = row.rate / 100;
      
      excelHtml += `
      <tr class="${zebraClass}">
        <td class="td-data td-center">${idx + 1}</td>
        <!-- Force text formatting for NIS so leading zeroes are NOT dropped -->
        <td class="td-data td-center" style="mso-number-format:'@';">${row.student.nis}</td>
        <td class="td-data td-left" style="font-weight: 500;">${row.student.name}</td>
        <td class="td-data td-center">${currentTeacher.className}</td>
        <td class="td-data td-center" style="color: #16a34a; font-weight: bold;">${row.hadir}</td>
        <td class="td-data td-center" style="color: #ca8a04;">${row.terlambat}</td>
        <td class="td-data td-center" style="color: #2563eb;">${row.sakit}</td>
        <td class="td-data td-center" style="color: #7c3aed;">${row.izin}</td>
        <td class="td-data td-center" style="color: #db2777;">${row.alpa}</td>
        <td class="td-data td-center">${row.total}</td>
        <td class="td-data td-center" style="font-weight: bold; mso-number-format:'0%';">${percentValue}</td>
      </tr>
`;
    });

    excelHtml += `
      <!-- Table Footer Summary for Class averages and absolute totals -->
      <tr class="summary-row" style="background-color: #e2e8f0; font-weight: bold;">
        <td colspan="4" class="td-data" style="text-align: right; background-color: #cbd5e1; border-top: 2px solid #475569; padding-right: 12px;">TOTAL / RATA-RATA KELAS</td>
        <td class="td-data td-center" style="color: #16a34a; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalHadirClass}</td>
        <td class="td-data td-center" style="color: #ca8a04; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalTerlambatClass}</td>
        <td class="td-data td-center" style="color: #2563eb; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalSakitClass}</td>
        <td class="td-data td-center" style="color: #7c3aed; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalIzinClass}</td>
        <td class="td-data td-center" style="color: #db2777; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalAlpaClass}</td>
        <td class="td-data td-center" style="background-color: #e2e8f0; border-top: 2px solid #475569;">${totalPencatatanClass}</td>
        <td class="td-data td-center" style="background-color: #cbd5e1; border-top: 2px solid #475569; mso-number-format:'0%';">${avgRateClass / 100}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Presensi_Kelas_${currentTeacher.className}_${rekapStartDate}_to_${rekapEndDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized school / student finance aggregate statistics for this class
  const classFinanceStats = useMemo(() => {
    let totalSavings = 0;
    let totalUnpaidSpp = 0;
    let totalInArrearsCount = 0;

    classStudents.forEach(student => {
      totalSavings += student.savingsBalance || 0;
      
      const sBills = bills.filter(b => b.studentId === student.id && b.status === 'unpaid');
      const unpaidSum = sBills.reduce((acc, curr) => acc + curr.amount, 0);
      totalUnpaidSpp += unpaidSum;
      if (sBills.length > 0) {
        totalInArrearsCount++;
      }
    });

    return {
      totalSavings,
      totalUnpaidSpp,
      totalInArrearsCount
    };
  }, [classStudents, bills]);

  return (
    <div id="homeroom-dashboard-root" className="flex flex-col gap-6 pb-24 lg:pb-0 animate-fade-in">
      {/* Top Welcome Title Bar */}
      <div className={`bg-gradient-to-r from-emerald-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-emerald-950 relative overflow-hidden animate-fade-in ${
        activeSubTab === 'record' ? 'hidden lg:block' : 'hidden'
      }`}>
        {/* Abstract shapes */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/5 rounded-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-450/20 text-emerald-300 font-bold text-[10px] w-fit uppercase tracking-widest border border-emerald-500/30">
              <Sparkles size={11} className="text-yellow-400 animate-pulse" /> Portal Wali Kelas Resmi
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Selamat Bertugas, {currentTeacher.name}!
            </h1>
            <p className="text-xs text-slate-300 max-w-xl">
              Anda berhak mengontrol dan memasukkan rekaman kehadiran harian kelas <strong>{currentTeacher.className}</strong>. Data absensi ini langsung terhubung dengan login dashboard profil murid masing-masing.
            </p>
          </div>

          <div className="flex shrink-0 gap-3 items-center">
            <button
              onClick={onRefresh}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-1.5 cursor-pointer"
            >
              🔄 Muat Ulang
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-1.5 border border-rose-700 shadow-sm shadow-rose-950 cursor-pointer"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Class Overview Cards - Compact & Clean Layout */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in ${
        activeSubTab === 'record' ? 'grid' : 'hidden'
      }`}>
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
            <Users size={16} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Murid</span>
            <span className="block text-sm md:text-base font-black text-slate-800 mt-0.5 whitespace-nowrap">{classStudents.length} Anak</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
            <ClipboardCheck size={16} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Hadir Hari Ini</span>
            <span className="block text-sm md:text-base font-black text-slate-800 mt-0.5 whitespace-nowrap">{(stats.hadir + stats.terlambat)} / {stats.total}</span>
            {stats.terlambat > 0 && (
              <span className="block text-[8px] text-purple-600 font-bold leading-none mt-0.5">({stats.terlambat} Tlk)</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
            <Calendar size={16} />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Izin & Sakit</span>
            <span className="block text-sm md:text-base font-black text-slate-800 mt-0.5 whitespace-nowrap">{stats.sakit + stats.izin} Anak</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 text-white shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Log</span>
            <span className="block text-sm md:text-base font-black text-emerald-600 mt-0.5 whitespace-nowrap">{classLogs.length} Entri</span>
          </div>
        </div>
      </div>

      {/* Primary Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Column (Date and Subtabs selector) - Hidden on mobile, controlled via bottom nav */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-inner flex flex-col gap-5 text-left">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atur Parameter</span>
              <h3 className="text-slate-900 font-extrabold text-sm mt-1">Absensi Kelas {currentTeacher.className}</h3>
            </div>

            {/* Subtab selection - Responsive layout (row with icons on mobile, vertical list with labels on desktop) */}
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl scrollbar-none">
              <button
                _id="tab-btn-record"
                onClick={() => setActiveSubTab('record')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'record'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Pengisian Absensi"
              >
                <span className="text-sm">📝</span>
                <span className="hidden md:inline">Pengisian Absensi</span>
              </button>
              <button
                _id="tab-btn-history"
                onClick={() => setActiveSubTab('history')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'history'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Riwayat Jurnal Kelas"
              >
                <span className="text-sm">📊</span>
                <span className="hidden md:inline">Riwayat Jurnal</span>
              </button>
              <button
                _id="tab-btn-rekap"
                onClick={() => setActiveSubTab('rekap_absensi')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'rekap_absensi'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Rekap Absensi Kelas"
              >
                <span className="text-sm">📉</span>
                <span className="hidden md:inline">Rekap Absensi</span>
              </button>
              <button
                _id="tab-btn-finance"
                onClick={() => setActiveSubTab('finance')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'finance'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Tabungan & Tagihan SPP"
              >
                <span className="text-sm">💳</span>
                <span className="hidden md:inline">Tabungan & SPP</span>
              </button>
              <button
                _id="tab-btn-profile"
                onClick={() => setActiveSubTab('profile')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'profile'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Profil Wali Kelas & Ubah Sandi"
              >
                <span className="text-sm">👤</span>
                <span className="hidden md:inline">Profil & Sandi</span>
              </button>
            </div>

            {/* Date Picker input widget */}
            {activeSubTab === 'record' && (
              <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Kalender</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={todayStr}
                    className="w-full px-3 py-2 border border-slate-250 border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <span className="text-[8.5px] text-slate-400">Pilih tanggal untuk melihat/menulis rekaman presensi.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Details/List/Form Column */}
        <div className="lg:col-span-9">
          {activeSubTab === 'record' && (
            <form onSubmit={handleSubmitAttendance} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2 select-none">
                <div>
                  <h2 className="font-extrabold text-slate-800 text-sm">Lembar Absensi Harian Kelas</h2>
                  <p className="text-slate-450 text-[11px] mt-0.5 font-bold text-indigo-700">Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400 border border-slate-250 bg-white px-2.5 py-1 rounded-lg">
                  <span>H:{stats.hadir}</span> &bull; <span>T:{stats.terlambat}</span> &bull; <span>S:{stats.sakit}</span> &bull; <span>I:{stats.izin}</span> &bull; <span>A:{stats.alpa}</span>
                </div>
              </div>

              {/* Compact Date Picker for Mobile Screens inside Right Panel when sidebar is hidden */}
              <div className="lg:hidden px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-col gap-1.5 text-left">
                <label className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Kalender Absensi:</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={todayStr}
                  className="px-3.5 py-2 w-full bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Status Alert or notification inside form code */}
              {notifMsg && (
                <div className={`m-6 mb-2 p-3 font-semibold text-xs rounded-xl flex items-center gap-2.5 animate-fade-in ${
                  notifMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100 border'
                    : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{notifMsg.text}</span>
                </div>
              )}

              {/* Students attendance rows list */}
              {classStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <ErrorIcon size={24} />
                  <p className="font-bold text-xs text-slate-700">Belum Ada Siswa Di Kelas Ini</p>
                  <p className="text-[11px] text-slate-440 max-w-xs mt-0.5">Silakan tambahkan data murid ke kualifikasi kelas &ldquo;{currentTeacher.className}&rdquo; terlebih dahulu via panel Admin sekolah Anda.</p>
                </div>
              ) : (
                <div className="p-6 flex flex-col gap-4">
                  {/* Desktop Table View */}
                  <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase tracking-wider select-none">
                          <th className="py-2.5 px-4">Informasi Murid</th>
                          <th className="py-2.5 px-4 text-center">Status Kehadiran</th>
                          <th className="py-2.5 px-4">Keterangan / Alasan Surat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((student) => {
                          const currentData = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{student.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {student.nis}</div>
                              </td>
                              
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-1 bg-slate-50 p-1.5 border border-slate-200 rounded-lg w-fit mx-auto">
                                  {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                    const activeColors = {
                                      'Hadir': 'bg-emerald-600 border-emerald-700 text-white shadow-xs',
                                      'Terlambat': 'bg-purple-600 border-purple-700 text-white shadow-xs',
                                      'Sakit': 'bg-amber-500 border-amber-600 text-white shadow-xs',
                                      'Izin': 'bg-indigo-600 border-indigo-700 text-white shadow-xs',
                                      'Alpa': 'bg-rose-650 bg-rose-600 border-rose-700 text-white shadow-xs'
                                    };
                                    const defaultColors = 'bg-white hover:bg-slate-100 border-slate-200 text-slate-650 font-bold';
                                    const isActive = currentData.status === st;

                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleStatusChange(student.id, st)}
                                        className={`px-2 py-1 text-[10px] border font-bold uppercase tracking-wider rounded-md cursor-pointer transition-all min-w-[50px] text-center ${isActive ? activeColors[st] : defaultColors}`}
                                      >
                                        {st}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={currentData.notes}
                                  onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                  placeholder="Sakit demam, izin keluar kota, alpa, dll"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs placeholder:text-slate-300 focus:outline-none focus:border-slate-700 font-semibold"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Touch-Friendly Card List View */}
                  <div className="block md:hidden flex flex-col gap-4">
                    {classStudents.map((student) => {
                      const currentData = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };

                      return (
                        <div key={`mob-att-${student.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">NIS: {student.nis}</span>
                          </div>

                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status Kehadiran:</span>
                            <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 border border-slate-200 rounded-lg">
                              {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                const activeColors = {
                                  'Hadir': 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
                                  'Terlambat': 'bg-purple-600 text-white border-purple-600 shadow-xs',
                                  'Sakit': 'bg-amber-500 text-white border-amber-500 shadow-xs',
                                  'Izin': 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
                                  'Alpa': 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                };
                                const defaultColors = 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 font-bold';
                                const isActive = currentData.status === st;
                                const shortLabel = st === 'Hadir' ? 'H' : st === 'Terlambat' ? 'T' : st === 'Sakit' ? 'S' : st === 'Izin' ? 'I' : 'A';

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(student.id, st)}
                                    className={`py-2 px-0.5 text-xs border font-black uppercase tracking-wider rounded-md text-center cursor-pointer transition-all ${isActive ? activeColors[st] : defaultColors}`}
                                    title={st}
                                  >
                                    {shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Keterangan / Alasan Surat:</span>
                            <input
                              type="text"
                              value={currentData.notes}
                              onChange={(e) => handleNotesChange(student.id, e.target.value)}
                              placeholder="Sakit demam, izin keluar kota, dll"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs placeholder:text-slate-300 focus:outline-none focus:border-slate-700 font-semibold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="self-end mt-2 px-6 py-2.5 bg-emerald-650 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Simpan Rekap Absensi Kelas</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {activeSubTab === 'history' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-sm">Jurnal &amp; Riwayat Presensi Kelas / KBM</h3>
                  <p className="text-slate-450 text-xs mt-0.5">Koleksi ringkasan kehadiran seluruh siswa kelas {currentTeacher.className} dari waktu ke waktu dan log kegiatan pembelajaran harian.</p>
                </div>
                
                {/* Switcher Mode / Segmented Control */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setJournalViewMode('presensi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${journalViewMode === 'presensi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    📝 Kehadiran Harian
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJournalViewMode('kbm');
                      fetchTeachingJournals();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${journalViewMode === 'kbm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    📖 Jurnal Pembelajaran (KBM)
                  </button>
                </div>
              </div>

              {journalViewMode === 'presensi' ? (
                classLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    Belum ada sejarah pengisian jurnal absensi di kelas ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Aggregate stats breakdown of current class logs ratio */}
                    {(() => {
                      const uniqueDates = Array.from(new Set(classLogs.map(l => l.date)));
                      const totalEntries = classLogs.length;
                      const h_total = classLogs.filter(l => l.status === 'Hadir').length;
                      const t_total = classLogs.filter(l => l.status === 'Terlambat').length;
                      const s_total = classLogs.filter(l => l.status === 'Sakit').length;
                      const i_total = classLogs.filter(l => l.status === 'Izin').length;
                      const a_total = classLogs.filter(l => l.status === 'Alpa').length;

                      return (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between flex-wrap gap-4 select-none">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Kehadiran Kumulatif</span>
                            <span className="block text-xl font-black text-slate-800 mt-1">{totalEntries > 0 ? Math.round(((h_total + t_total) / totalEntries) * 100) : 100}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-emerald-600 uppercase">Hadir</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{h_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-purple-600 uppercase">Terlambat</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{t_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-amber-600 uppercase">Sakit</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{s_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-blue-600 uppercase">Izin</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{i_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-rose-600 uppercase">Alpa</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{a_total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Date-wise journals listing */}
                    {(() => {
                      const uniqueDatesSorted = Array.from(new Set(classLogs.map(l => l.date))).sort((a,b) => b.localeCompare(a));

                      return (
                        <div className="flex flex-col gap-4">
                          {uniqueDatesSorted.map((date) => {
                            const dateLogs = classLogs.filter(l => l.date === date);
                            const total = classStudents.length;
                            const h = dateLogs.filter(l => l.status === 'Hadir').length;
                            const t = dateLogs.filter(l => l.status === 'Terlambat').length;
                            const s = dateLogs.filter(l => l.status === 'Sakit').length;
                            const i = dateLogs.filter(l => l.status === 'Izin').length;
                            const a = dateLogs.filter(l => l.status === 'Alpa').length;
                            const attendanceRate = total > 0 ? Math.round(((h + t) / total) * 100) : 100;

                            return (
                              <div key={date} className="bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-col gap-1 text-left">
                                  <span className="text-xs font-black text-slate-800">
                                    {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-semibold uppercase font-mono tracking-wider">
                                    Persentase: {attendanceRate}% Hadir ({h + t} dari {total} Siswa)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <div className="flex gap-1">
                                    {h > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded">H: {h}</span>}
                                    {t > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 rounded">T: {t}</span>}
                                    {s > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 rounded">S: {s}</span>}
                                    {i > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-50 rounded">I: {i}</span>}
                                    {a > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 rounded">A: {a}</span>}
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDate(date);
                                      setActiveSubTab('record');
                                    }}
                                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer text-center"
                                  >
                                    Edit Jurnal
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : (
                /* JOURNAL KBM FROM SUBJECT TEACHERS (LES / MAPEL) */
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex-wrap gap-4 select-none">
                    <div className="text-left">
                      <h4 className="text-indigo-950 font-black text-xs uppercase tracking-wider">Jurnal Kegiatan Belajar Mengajar (KBM) Kelas {currentTeacher.className}</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5 font-semibold">Berikut adalah rincian materi pembelajaran dan administrasi presensi harian per jam mata pelajaran dari guru bidang studi.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchTeachingJournals}
                        disabled={loadingJournals}
                        className="px-3.5 py-2 border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all bg-white/70"
                      >
                        🔄 {loadingJournals ? 'Memuat...' : 'Muat Ulang'}
                      </button>
                      {teachingJournalsList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompiledJournalPrint(true);
                            // Trigger native browser printing immediately
                            setTimeout(() => {
                              window.print();
                            }, 350);
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-700 transition-all"
                        >
                          <Printer size={13} strokeWidth={2.5} />
                          <span>Cetak Buku KBM Kelas</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingJournals ? (
                    <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-indigo-600" size={26} />
                      <p className="text-xs">Menghubungkan ke pusat data KBM...</p>
                    </div>
                  ) : teachingJournalsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl">
                      <BookOpen size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Belum ada Rekaman Jurnal Pembelajaran</p>
                      <p className="text-[11px] text-slate-440 max-w-sm mx-auto mt-0.5">Guru Mata Pelajaran belum mengisi Jurnal KBM maupun absensi khusus jam pelajaran di kelas {currentTeacher.className}.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {teachingJournalsList
                        .sort((a,b) => b.date.localeCompare(a.date))
                        .map((journal) => {
                          const totalSiswa = journal.attendance?.length || 0;
                          const hadirCount = journal.attendance?.filter((a: any) => a.status === 'Hadir').length || 0;
                          const terlambatCount = journal.attendance?.filter((a: any) => a.status === 'Terlambat').length || 0;
                          const sakitCount = journal.attendance?.filter((a: any) => a.status === 'Sakit').length || 0;
                          const izinCount = journal.attendance?.filter((a: any) => a.status === 'Izin').length || 0;
                          const alpaCount = journal.attendance?.filter((a: any) => a.status === 'Alpa').length || 0;
                          const totalHadir = hadirCount + terlambatCount;
                          const totalAbsen = sakitCount + izinCount + alpaCount;

                          return (
                            <div key={journal.id} className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-grow min-w-0 flex gap-3 text-left">
                                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl hidden sm:block h-fit shrink-0">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0 flex flex-col gap-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-sm text-slate-900">{journal.subject}</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {journal.teacherName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                                      {new Date(journal.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 font-semibold leading-tight"><strong className="text-slate-400 font-extrabold text-[10px] uppercase">Materi KBM:</strong> {journal.topic}</p>
                                  {journal.notes && (
                                    <p className="text-[11px] text-slate-500 italic mt-0.5">Catatan: &ldquo;{journal.notes}&rdquo;</p>
                                  )}
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">Hadir: {totalHadir}</span>
                                    {totalAbsen > 0 && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-rose-50 text-rose-800 border border-rose-100 uppercase">Absen: {totalAbsen}</span>
                                    )}
                                    {sakitCount > 0 && <span className="px-1 py-0.5 text-[8.5px] font-semibold text-amber-600 font-mono">Sakit: {sakitCount}</span>}
                                    {izinCount > 0 && <span className="px-1 py-0.5 text-[8.5px] font-semibold text-blue-600 font-mono">Izin: {izinCount}</span>}
                                    {alpaCount > 0 && <span className="px-1 py-0.5 text-[8.5px] font-bold text-rose-600 font-mono">Alpa: {alpaCount}</span>}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJournalToPrint(journal);
                                  setTimeout(() => {
                                    window.print();
                                  }, 350);
                                }}
                                className="px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer self-start md:self-center"
                              >
                                <Printer size={13} />
                                <span>Cetak Jurnal PDF</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'rekap_absensi' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-sm">Rekapitulasi Presensi Kehadiran Siswa</h3>
                  <p className="text-slate-450 text-xs mt-0.5">Pantau rasio persentase absensi kelas {currentTeacher.className} pada rentang waktu terpilih.</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={downloadExcelRekap}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-emerald-200 cursor-pointer"
                  >
                    <Download size={14} />
                    Unduh Laporan Excel (.xls)
                  </button>
                </div>
              </div>

              {/* Date pickers for rekapitulasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl col-span-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={rekapStartDate}
                    onChange={(e) => setRekapStartDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-250 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={rekapEndDate}
                    onChange={(e) => setRekapEndDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-250 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {rekapData.length === 0 ? (
                <div className="p-12 text-center text-slate-450 text-xs">
                  Tidak ada data siswa untuk kelas ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">No</th>
                        <th className="py-2.5 px-3">NIS</th>
                        <th className="py-2.5 px-3">Nama Siswa</th>
                        <th className="py-2.5 px-3 text-center text-emerald-700 bg-emerald-50/50">Hadir</th>
                        <th className="py-2.5 px-3 text-center text-purple-700 bg-purple-50/50">Terlambat</th>
                        <th className="py-2.5 px-3 text-center text-amber-700 bg-amber-50/50">Sakit</th>
                        <th className="py-2.5 px-3 text-center text-blue-700 bg-blue-50/50">Izin</th>
                        <th className="py-2.5 px-3 text-center text-rose-700 bg-rose-50/50">Alpa</th>
                        <th className="py-2.5 px-3 text-center">Total Hari</th>
                        <th className="py-2.5 px-3 text-right">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rekapData.map((row) => (
                        <tr key={row.student.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="py-2 px-3 text-center font-semibold text-slate-400">{row.index}</td>
                          <td className="py-2 px-3 font-mono text-slate-500 font-bold">{row.student.nis}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.student.name}</td>
                          <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/20 font-bold">{row.hadir}</td>
                          <td className="py-2 px-3 text-center text-purple-800 bg-purple-50/20 font-bold">{row.terlambat}</td>
                          <td className="py-2 px-3 text-center text-amber-800 bg-amber-50/20 font-bold">{row.sakit}</td>
                          <td className="py-2 px-3 text-center text-blue-800 bg-blue-50/20 font-bold">{row.izin}</td>
                          <td className="py-2 px-3 text-center text-rose-800 bg-rose-50/20 font-bold">{row.alpa}</td>
                          <td className="py-2 px-3 text-center text-slate-500 font-medium">{row.total}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              row.rate >= 90 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : row.rate >= 75 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {row.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'finance' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left p-6">
              <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-sm">Monitoring Administrasi & Keuangan Kelas</h3>
                  <p className="text-slate-450 text-xs mt-0.5">Informasi rincian saldo tabungan dan tunggakan tagihan SPP untuk bantuan pengingat (Reminder).</p>
                </div>
                {/* Search input inside Tab */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NIS siswa..."
                    value={financeSearch}
                    onChange={(e) => setFinanceSearch(e.target.value)}
                    className="w-full md:w-56 pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white"
                  />
                </div>
              </div>

              {/* Class Aggregate widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50/55 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest">Total Tabungan Kelas</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Wallet size={16} className="text-emerald-600" />
                    <span className="block text-base font-black text-slate-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(classFinanceStats.totalSavings)}
                    </span>
                  </div>
                </div>

                <div className="bg-rose-50/55 border border-rose-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-rose-700 uppercase tracking-widest">Total Tunggakan SPP Kelas</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <CreditCard size={16} className="text-rose-600" />
                    <span className="block text-base font-black text-rose-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(classFinanceStats.totalUnpaidSpp)}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/55 border border-amber-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-amber-700 uppercase tracking-widest">Siswa Menunggak SPP</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Users size={16} className="text-amber-600" />
                    <span className="block text-base font-black text-slate-800">{classFinanceStats.totalInArrearsCount} <span className="text-xs font-normal text-slate-500">Siswa</span></span>
                  </div>
                </div>
              </div>

              {/* Students administration table */}
              {(() => {
                const filteredClassStudents = classStudents.filter(
                  s => s.name.toLowerCase().includes(financeSearch.toLowerCase()) || 
                       s.nis.includes(financeSearch)
                );

                if (filteredClassStudents.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-450 text-xs">
                      Tidak ada data siswa yang cocok dengan filter pencarian.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Nama Lengkap & NIS</th>
                          <th className="py-2.5 px-3">Saldo Tabungan</th>
                          <th className="py-2.5 px-3">Status Tagihan SPP (Unpaid)</th>
                          <th className="py-2.5 px-3 text-right">Tindakan Pengingat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredClassStudents.map((student) => {
                          const studentBills = bills.filter(b => b.studentId === student.id && b.status === 'unpaid');
                          const totalUnpaid = studentBills.reduce((sum, b) => sum + b.amount, 0);

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800">{student.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold font-mono">NIS: {student.nis}</div>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-700">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(student.savingsBalance || 0)}
                              </td>
                              <td className="py-3 px-3">
                                {studentBills.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={10} /> Lunas
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono text-rose-700 font-bold">
                                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalUnpaid)}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      {studentBills.map(b => `${b.month} ${b.year}`).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {studentBills.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => copyWaReminder(student, studentBills)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold shadow-xs transition-all cursor-pointer ${
                                      copiedStudentId === student.id
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse'
                                        : 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-150 text-indigo-700 hover:text-indigo-850'
                                    }`}
                                  >
                                    {copiedStudentId === student.id ? (
                                      <>
                                        <Check size={12} className="text-emerald-600 font-black" />
                                        Reminder Tersalin!
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        Salin WA Reminder
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium italic">Tidak ada tunggakan</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {activeSubTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 text-left">
              <div>
                <h3 className="text-slate-900 font-extrabold text-lg flex items-center gap-2">
                  <span className="p-1 px-2 rounded-lg bg-indigo-50 text-indigo-700">👤</span> Profil Wali Kelas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Detail informasi akun kedinasan Anda dan pengaturan privasi kata sandi.
                </p>
              </div>

              {/* Profile Card details */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-950 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
                  <User size={150} />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-3xl font-extrabold">
                    🏫
                  </div>
                  <div className="flex-1">
                    <span className="block text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Wali Kelas Aktif</span>
                    <h4 className="text-lg font-bold tracking-tight">{currentTeacher.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-150 mt-1 border-t border-white/10 pt-1.5 font-medium">
                      <span>Kelas Binaan: <strong className="text-white font-extrabold">{currentTeacher.className}</strong></span>
                      <span className="opacity-40">•</span>
                      <span>Username: <strong className="text-white font-mono font-bold">@{currentTeacher.username}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Form Section */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mb-4">
                  <span className="p-1 rounded-md bg-amber-50 text-amber-700">🔐</span> Ubah Kata Sandi Akun
                </h4>

                <form onSubmit={handleTeacherPasswordChange} className="flex flex-col gap-4 max-w-md">
                  {passwordError && (
                    <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-55 bg-emerald-50 border border-emerald-150 border-emerald-200 text-emerald-850 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                      <Check size={14} className="shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Kata Sandi Saat Ini</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="Masukkan sandi lama wali kelas"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                      />
                      <Key size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="Masukkan sandi baru (minimal 6 karakter)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                      />
                      <Key size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="mt-2 w-full sm:w-auto self-start px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Sedang Menyimpan...
                      </>
                    ) : (
                      <>Ubah Sandi Akun 🔐</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= STICKY BOTTOM NAVIGATION BAR FOR MOBILE (lg:hidden) ================= */}
      <div 
        style={{ contentVisibility: 'auto' }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-2 pt-2 pb-3.5 flex justify-around items-center transition-all"
      >
        {/* Absensi Tab Button */}
        <button
          type="button"
          onClick={() => setActiveSubTab('record')}
          className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'record' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <ClipboardCheck size={21} className={activeSubTab === 'record' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'record' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Absensi</span>
        </button>
 
        {/* Jurnal Tab Button */}
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'history' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}>
            <BookOpen size={21} className={activeSubTab === 'history' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'history' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>Jurnal</span>
        </button>
 
        {/* Rekap Tab Button */}
        <button
          type="button"
          onClick={() => setActiveSubTab('rekap_absensi')}
          className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'rekap_absensi' ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}>
            <Calendar size={21} className={activeSubTab === 'rekap_absensi' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'rekap_absensi' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>Rekap</span>
        </button>
 
        {/* Keuangan Tab Button */}
        <button
          type="button"
          onClick={() => setActiveSubTab('finance')}
          className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'finance' ? 'bg-purple-50 text-purple-600' : 'text-slate-400'}`}>
            <Wallet size={21} className={activeSubTab === 'finance' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'finance' ? 'text-purple-600 font-bold' : 'text-slate-400'}`}>Keuangan</span>
        </button>
 
        {/* Profil Tab Button */}
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className="flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'}`}>
            <User size={21} className={activeSubTab === 'profile' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'profile' ? 'text-indigo-800 font-bold' : 'text-slate-400'}`}>Profil</span>
        </button>
      </div>

      {/* Visual Checklist / Success Animation Modal */}
      <AnimatePresence>
        {showSuccessCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md no-print p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-150 flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Subtle green pattern background */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-50 rounded-full opacity-40 pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-slate-50 rounded-full opacity-40 pointer-events-none" />

              {/* Draw-in animated SVG checkmark */}
              <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100 flex items-center justify-center mb-5 mt-2 shadow-inner">
                <svg className="w-11 h-11 text-emerald-600" viewBox="0 0 52 52" fill="none" stroke="currentColor">
                  <motion.circle 
                    cx="26" 
                    cy="26" 
                    r="23" 
                    strokeWidth="3.5" 
                    stroke="currentColor" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                  <motion.path 
                    d="M16 27l7 7 15-15" 
                    strokeWidth="4.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                  />
                </svg>
              </div>

              <h3 className="font-extrabold text-slate-950 text-base subpixel-antialiased tracking-tight">
                Absensi Berhasil Disimpan!
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-2 px-1">
                Rekap absensi kelas <span className="font-extrabold text-slate-800">Kelas {currentTeacher.className}</span> untuk tanggal <span className="font-bold text-slate-800">{new Date(selectedDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span> telah sukses disimpan & disinkronkan.
              </p>

              {/* Micro stats review */}
              <div className="mt-5 w-full bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-2 relative z-10">
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Hadir
                  </span>
                  <span className="font-black text-slate-900 font-sans">{currentDailyStats.hadir} Siswa</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Terlambat
                  </span>
                  <span className="font-black text-slate-900 font-sans">{currentDailyStats.terlambat} Siswa</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Sakit / Izin
                  </span>
                  <span className="font-black text-slate-900 font-sans">{currentDailyStats.sakit + currentDailyStats.izin} Siswa</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Tanpa Keterangan
                  </span>
                  <span className="font-black text-rose-600 font-sans">{currentDailyStats.alpa} Siswa</span>
                </div>
                <div className="border-t border-slate-200/60 my-0.5 pt-1.5 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Total Murid</span>
                  <span className="font-black font-sans">{currentDailyStats.total} Anak</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowSuccessCheck(false)}
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md border border-slate-950 flex items-center justify-center gap-2 relative z-10"
              >
                <Check size={14} className="stroke-[3px]" />
                Selesai & Tutup
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PRINT OUT JURNAL INDIVIDUAL */}
      <AnimatePresence>
        {selectedJournalToPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-4xl w-full text-slate-900 flex flex-col gap-4 relative my-8"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-indigo-600" />
                  <span className="font-extrabold text-slate-800 text-sm">Pratinjau PDF Jurnal Pembelajaran KBM</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-indigo-700 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>Cetak Jurnal (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJournalToPrint(null)}
                    className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-slate-605 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Core report print canvas section */}
              <div className="overflow-y-auto pr-1 max-h-[70vh]">
                <div id="print-report-section" className="bg-white text-slate-950 p-6 rounded-lg font-sans border border-slate-150 flex flex-col gap-6 text-[11px] leading-relaxed relative text-left">
                  
                  {/* Official School Header - Kop Surat */}
                  {schoolIdentity?.letterhead ? (
                    <div className="w-full border-b-4 border-double border-slate-900 pb-2 flex flex-col items-center text-left select-none">
                      <img 
                        src={schoolIdentity.letterhead} 
                        className="w-full max-h-24 object-contain" 
                        alt="Kop Surat" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-800">DOKUMEN JURNAL PEMBELAJARAN (KBM)</span>
                        <span>Diunduh: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b-4 border-double border-slate-900 pb-3 flex justify-between items-center gap-4 text-left">
                      <div className="flex items-center gap-3">
                        {schoolIdentity?.logo && (
                          <img 
                            src={schoolIdentity.logo} 
                            className="w-12 h-12 object-contain" 
                            alt="Logo" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col gap-0.5 text-left font-sans">
                          <span className="text-sm font-black uppercase tracking-wider text-slate-900">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold mt-1">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 font-mono shrink-0">
                        <span className="text-xs font-black text-slate-800">DOKUMEN RESMI</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Dihasilkan: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  )}

                  {/* Title of Document */}
                  <div className="text-center my-1 text-slate-900">
                    <h2 className="text-sm font-extrabold uppercase tracking-widest underline">
                      Jurnal Pembelajaran &amp; Presensi Mata Pelajaran
                    </h2>
                    <p className="text-[9px] text-slate-500 font-semibold font-mono mt-1">
                      Kelas: {selectedJournalToPrint.className} &bull; Semester Genap &bull; Tahun Ajaran 2025/2026
                    </p>
                  </div>

                  {/* Meta Information Field */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Mata Pelajaran</span>
                        <span>:</span>
                        <span className="font-extrabold text-slate-900">{selectedJournalToPrint.subject}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Guru Pengampu</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">{selectedJournalToPrint.teacherName}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Hari &amp; Tanggal</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">
                          {new Date(selectedJournalToPrint.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Materi / Bahasan</span>
                        <span>:</span>
                        <span className="font-bold text-slate-900">{selectedJournalToPrint.topic}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Catatan KBM</span>
                        <span>:</span>
                        <span className="font-medium text-slate-700 italic">{selectedJournalToPrint.notes || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Tingkat Absensi</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">
                          {(() => {
                            const total = selectedJournalToPrint.attendance?.length || 0;
                            const hadir = selectedJournalToPrint.attendance?.filter((a: any) => a.status === 'Hadir' || a.status === 'Terlambat').length || 0;
                            return `${hadir} dari ${total} Siswa Hadir (${total > 0 ? Math.round((hadir / total) * 100) : 100}%)`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Table */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Daftar Kehadiran Siswa Jam Pelajaran:
                    </span>
                    <table className="w-full border-collapse border border-slate-300 text-[10px] text-slate-800">
                      <thead>
                        <tr className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700">
                          <th className="border border-slate-300 px-3 py-2 text-center" style={{ width: '4%' }}>No</th>
                          <th className="border border-slate-300 px-3 py-2 text-center" style={{ width: '15%' }}>NIS</th>
                          <th className="border border-slate-300 px-3 py-2 text-left" style={{ width: '45%' }}>Nama Siswa</th>
                          <th className="border border-slate-300 px-3 py-2 text-center" style={{ width: '15%' }}>Kehadiran</th>
                          <th className="border border-slate-300 px-3 py-2 text-left" style={{ width: '21%' }}>Catatan Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students
                          .filter(s => s.class.toLowerCase() === selectedJournalToPrint.className.toLowerCase())
                          .sort((a,b) => a.name.localeCompare(b.name))
                          .map((student, idx) => {
                            const attEntry = selectedJournalToPrint.attendance?.find((a: any) => a.studentId === student.id);
                            const status = attEntry?.status || 'Hadir';
                            const notes = attEntry?.notes || '';

                            const statusColors: Record<string, string> = {
                              'Hadir': 'text-emerald-700 font-bold',
                              'Terlambat': 'text-purple-600 font-bold',
                              'Sakit': 'text-amber-600 font-semibold',
                              'Izin': 'text-blue-600 font-semibold',
                              'Alpa': 'text-rose-600 font-black'
                            };

                            return (
                              <tr key={student.id} className="hover:bg-slate-50/50">
                                <td className="border border-slate-300 px-3 py-1.5 text-center">{idx + 1}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{student.nis}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-left font-bold">{student.name}</td>
                                <td className={`border border-slate-300 px-3 py-1.5 text-center uppercase tracking-wider ${statusColors[status] || 'text-slate-705'}`}>{status}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-left text-[9px] text-slate-500 font-medium">{notes || "-"}</td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures section */}
                  <div className="grid grid-cols-2 gap-8 mt-12 mb-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengetahui,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Wali Kelas {selectedJournalToPrint.className}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{currentTeacher.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">WALI KELAS RESMI</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Tanda Tangan,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Guru Mata Pelajaran</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{selectedJournalToPrint.teacherName}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">GURU MATA PELAJARAN</span>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PRINT OUT JURNAL REKAPITULASI COMPILED */}
      <AnimatePresence>
        {compiledJournalPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-5xl w-full text-slate-900 flex flex-col gap-4 relative my-8"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-indigo-600" />
                  <span className="font-extrabold text-slate-800 text-sm">Pratinjau PDF Buku Rekap Jurnal Pembelajaran KBM Kelas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-950 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>Cetak Sekarang (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompiledJournalPrint(false)}
                    className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-slate-605 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Core report print canvas section */}
              <div className="overflow-y-auto pr-1 max-h-[70vh]">
                <div id="print-report-section" className="bg-white text-slate-950 p-6 rounded-lg font-sans border border-slate-150 flex flex-col gap-6 text-[11px] leading-relaxed relative text-left">
                  
                  {/* Official School Header - Kop Surat */}
                  {schoolIdentity?.letterhead ? (
                    <div className="w-full border-b-4 border-double border-slate-900 pb-2 flex flex-col items-center text-left select-none">
                      <img 
                        src={schoolIdentity.letterhead} 
                        className="w-full max-h-24 object-contain" 
                        alt="Kop Surat" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-800">REKAPITULASI JURNAL MENGAJAR KBM KELAS</span>
                        <span>Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b-4 border-double border-slate-900 pb-3 flex justify-between items-center gap-4 text-left">
                      <div className="flex items-center gap-3">
                        {schoolIdentity?.logo && (
                          <img 
                            src={schoolIdentity.logo} 
                            className="w-12 h-12 object-contain" 
                            alt="Logo" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col gap-0.5 text-left font-sans">
                          <span className="text-sm font-black uppercase tracking-wider text-slate-900">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold mt-1">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 font-mono shrink-0">
                        <span className="text-xs font-black text-slate-800">BUKU KBM KELAS</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  )}

                  {/* Title of Document */}
                  <div className="text-center my-1 text-slate-900">
                    <h2 className="text-sm font-extrabold uppercase tracking-widest underline">
                      Buku Rekapitulasi Jurnal Mengajar &amp; KBM Kelas
                    </h2>
                    <p className="text-[9px] text-slate-500 font-semibold font-mono mt-1">
                      Kelas Rujukan: {currentTeacher.className} &bull; Wali Kelas: {currentTeacher.name} &bull; Semester Genap &bull; Tahun Ajaran 2025/2026
                    </p>
                  </div>

                  {/* Summary counts panel */}
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex justify-between items-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    <span>Nama Kelas: {currentTeacher.className}</span>
                    <span>Total Jurnal Terdaftar: {teachingJournalsList.length} Entri Kegiatan</span>
                    <span>Tanggal Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                  </div>

                  {/* Rationale and Instruction */}
                  <div className="flex flex-col gap-2">
                    <table className="w-full border-collapse border border-slate-300 text-[10px] text-slate-800">
                      <thead>
                        <tr className="bg-slate-100 font-extrabold uppercase tracking-wider text-slate-700 text-center">
                          <th className="border border-slate-300 px-3 py-2" style={{ width: '4%' }}>No</th>
                          <th className="border border-slate-300 px-3 py-2" style={{ width: '15%' }}>Hari &amp; Tanggal</th>
                          <th className="border border-slate-300 px-3 py-2" style={{ width: '20%' }}>Mata Pelajaran</th>
                          <th className="border border-slate-300 px-3 py-2" style={{ width: '20%' }}>Guru Pengampu</th>
                          <th className="border border-slate-300 px-3 py-2 text-left" style={{ width: '26%' }}>Materi / Pembahasan Belajar</th>
                          <th className="border border-slate-300 px-3 py-2" style={{ width: '15%' }}>Kehadiran Jam Mapel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachingJournalsList
                          .sort((a,b) => b.date.localeCompare(a.date))
                          .map((journal, idx) => {
                            const total = journal.attendance?.length || 0;
                            const h = journal.attendance?.filter((a: any) => a.status === 'Hadir').length || 0;
                            const t = journal.attendance?.filter((a: any) => a.status === 'Terlambat').length || 0;
                            const sakit = journal.attendance?.filter((a: any) => a.status === 'Sakit').length || 0;
                            const izin = journal.attendance?.filter((a: any) => a.status === 'Izin').length || 0;
                            const alpa = journal.attendance?.filter((a: any) => a.status === 'Alpa').length || 0;

                            const isAllHadir = sakit + izin + alpa === 0;

                            return (
                              <tr key={journal.id} className="hover:bg-slate-50/50">
                                <td className="border border-slate-300 px-3 py-1.5 text-center">{idx + 1}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-center font-bold">
                                  {new Date(journal.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                                </td>
                                <td className="border border-slate-300 px-3 py-1.5 text-center font-extrabold text-slate-900">{journal.subject}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-center font-medium text-slate-700">{journal.teacherName}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-left leading-relaxed font-semibold">
                                  <div>{journal.topic}</div>
                                  {journal.notes && <div className="text-[8.5px] italic text-slate-400 mt-0.5">Note: &ldquo;{journal.notes}&rdquo;</div>}
                                </td>
                                <td className="border border-slate-300 px-2 py-1.5 text-center font-mono text-[9px]">
                                  {isAllHadir ? (
                                    <span className="text-emerald-700 font-bold">LENGKAP ({total})</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mx-auto">
                                      {h + t > 0 && <span className="text-emerald-600 font-semibold text-[8px]">H:{h+t}</span>}
                                      {sakit > 0 && <span className="text-amber-500 font-semibold text-[8px]">S:{sakit}</span>}
                                      {izin > 0 && <span className="text-blue-600 font-semibold text-[8px]">I:{izin}</span>}
                                      {alpa > 0 && <span className="text-rose-600 font-bold text-[8.5px]">A:{alpa}</span>}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures section */}
                  <div className="grid grid-cols-2 gap-8 mt-12 mb-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengesahkan Rekap,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Wali Kelas {currentTeacher.className}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{currentTeacher.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">WALI KELAS KBM RESMI</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengetahui,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Kepala Sekolah {schoolIdentity?.name || "SMP Maarif NU Pandaan"}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">KEPALA SEKOLAH</span>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
