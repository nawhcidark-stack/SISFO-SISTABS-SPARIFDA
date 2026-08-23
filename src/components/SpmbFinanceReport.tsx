import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  ArrowUpRight, 
  ArrowDownRight, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  Search, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Users, 
  GraduationCap, 
  PieChart, 
  TrendingUp, 
  FileSpreadsheet
} from 'lucide-react';
import { SpmbCandidate, SpmbConfig, SchoolIdentity } from '../types';
import { calculateReRegDetails } from '../utils/spmbReceiptPrint';

interface SpmbFinanceReportProps {
  candidates: SpmbCandidate[];
  config: SpmbConfig | null;
  schoolIdentity?: SchoolIdentity;
  onOpenReceiptModal?: (candidate: SpmbCandidate, type: 'token' | 'rereg') => void;
  onOpenRefundReceiptModal?: (candidate: SpmbCandidate) => void;
}

export default function SpmbFinanceReport({
  candidates,
  config,
  schoolIdentity,
  onOpenReceiptModal,
  onOpenRefundReceiptModal
}: SpmbFinanceReportProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'token' | 'rereg' | 'refund'>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterSchoolOrigin, setFilterSchoolOrigin] = useState<'all' | 'maarif' | 'other'>('all');

  const currentAcademicYear = config?.academicYear || '2027/2028';
  const tokenFee = config?.registrationTokenFee || 50000;

  // 1. Data Processing & Transaction Log Generation
  const financialData = useMemo(() => {
    let totalGrossToken = 0;
    let totalTokenRefund = 0;
    let totalReRegRevenue = 0;
    let totalPendingReReg = 0;

    let maarifGrossToken = 0;
    let maarifTokenRefund = 0;
    let maarifReRegRevenue = 0;

    let otherGrossToken = 0;
    let otherTokenRefund = 0;
    let otherReRegRevenue = 0;

    // Per Session Stats
    const sessionStats: Record<string, {
      name: string;
      tokenPaidCount: number;
      tokenGross: number;
      tokenRefund: number;
      reregPaidCount: number;
      reregRevenue: number;
      totalNet: number;
    }> = {};

    (config?.sessions || []).forEach(sess => {
      sessionStats[sess.id] = {
        name: sess.name,
        tokenPaidCount: 0,
        tokenGross: 0,
        tokenRefund: 0,
        reregPaidCount: 0,
        reregRevenue: 0,
        totalNet: 0
      };
    });

    // Make sure fallback sessions exist
    ['inden', 'gelombang-1', 'gelombang-2'].forEach(sId => {
      if (!sessionStats[sId]) {
        sessionStats[sId] = {
          name: sId === 'inden' ? 'Jalur Inden' : sId === 'gelombang-1' ? 'Gelombang 1' : 'Gelombang 2',
          tokenPaidCount: 0,
          tokenGross: 0,
          tokenRefund: 0,
          reregPaidCount: 0,
          reregRevenue: 0,
          totalNet: 0
        };
      }
    });

    const transactionLogs: Array<{
      id: string;
      orderId: string;
      date: string;
      candidateId: string;
      candidateName: string;
      nisn: string;
      schoolOrigin: string;
      isMaarif: boolean;
      sessionId: string;
      sessionName: string;
      type: 'token' | 'rereg' | 'refund';
      typeLabel: string;
      amountIn: number;
      amountOut: number;
      netAmount: number;
      paymentMethod: string;
      status: 'paid' | 'refunded' | 'pending';
      statusLabel: string;
      candidate: SpmbCandidate;
    }> = [];

    candidates.forEach(c => {
      const isMaarif = c.schoolOriginType === 'maarif_jogosari' || 
        (c.schoolOrigin || '').toLowerCase().includes('maarif');
      const isTokenPaid = c.tokenPaymentStatus === 'paid' || c.tokenPaid;
      const isCollective = c.registrationType === 'school_collective';
      const isRefunded = c.collectiveRefundStatus === 'refunded';
      const isReRegPaid = c.reRegistrationStatus === 'paid';

      const sessKey = c.sessionId || 'inden';
      if (!sessionStats[sessKey]) {
        sessionStats[sessKey] = {
          name: sessKey,
          tokenPaidCount: 0,
          tokenGross: 0,
          tokenRefund: 0,
          reregPaidCount: 0,
          reregRevenue: 0,
          totalNet: 0
        };
      }

      // 1a. Token Fee Handling
      if (isTokenPaid) {
        const nominalToken = c.tokenAmount || tokenFee;
        totalGrossToken += nominalToken;
        sessionStats[sessKey].tokenPaidCount += 1;
        sessionStats[sessKey].tokenGross += nominalToken;

        if (isMaarif) maarifGrossToken += nominalToken;
        else otherGrossToken += nominalToken;

        transactionLogs.push({
          id: `tx-token-${c.id}`,
          orderId: c.tokenPaymentOrderId || `ORD-TOKEN-${c.nisn}`,
          date: c.tokenPaidAt ? c.tokenPaidAt.slice(0, 10) : (c.createdAt ? c.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          candidateId: c.id,
          candidateName: c.fullName,
          nisn: c.nisn,
          schoolOrigin: c.schoolOrigin || (isMaarif ? 'SD Maarif Jogosari' : 'SD Umum'),
          isMaarif,
          sessionId: c.sessionId,
          sessionName: sessionStats[sessKey]?.name || c.sessionId,
          type: 'token',
          typeLabel: 'Token Pendaftaran Online',
          amountIn: nominalToken,
          amountOut: 0,
          netAmount: nominalToken,
          paymentMethod: c.tokenPaymentMethod || (isCollective ? 'Kolektif / Midtrans' : 'Midtrans Online'),
          status: 'paid',
          statusLabel: 'Lunas',
          candidate: c
        });
      }

      // 1b. Token Refund (Cash) Handling
      if (isCollective && isRefunded) {
        const nominalRefund = c.collectiveRefundAmount || tokenFee;
        totalTokenRefund += nominalRefund;
        sessionStats[sessKey].tokenRefund += nominalRefund;

        if (isMaarif) maarifTokenRefund += nominalRefund;
        else otherTokenRefund += nominalRefund;

        transactionLogs.push({
          id: `tx-refund-${c.id}`,
          orderId: c.collectiveRefundReceiptNo || `KW-REFUND-${c.nisn}`,
          date: c.collectiveRefundedAt ? c.collectiveRefundedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          candidateId: c.id,
          candidateName: c.fullName,
          nisn: c.nisn,
          schoolOrigin: c.schoolOrigin || (isMaarif ? 'SD Maarif Jogosari' : 'SD Umum'),
          isMaarif,
          sessionId: c.sessionId,
          sessionName: sessionStats[sessKey]?.name || c.sessionId,
          type: 'refund',
          typeLabel: 'Pengembalian Token Tunai (Cash)',
          amountIn: 0,
          amountOut: nominalRefund,
          netAmount: -nominalRefund,
          paymentMethod: 'Tunai (Cash Refund)',
          status: 'refunded',
          statusLabel: 'Uang Kembali',
          candidate: c
        });
      }

      // 1c. Re-Registration Revenue Handling
      const reregDetails = calculateReRegDetails(c, config);
      const expectedReRegAmount = reregDetails.grandTotal;

      if (isReRegPaid) {
        const nominalReReg = c.reRegistrationAmount || expectedReRegAmount;
        totalReRegRevenue += nominalReReg;
        sessionStats[sessKey].reregPaidCount += 1;
        sessionStats[sessKey].reregRevenue += nominalReReg;

        if (isMaarif) maarifReRegRevenue += nominalReReg;
        else otherReRegRevenue += nominalReReg;

        transactionLogs.push({
          id: `tx-rereg-${c.id}`,
          orderId: c.reRegistrationOrderId || `ORD-REREG-${c.nisn}`,
          date: c.reRegistrationPaidAt ? c.reRegistrationPaidAt.slice(0, 10) : (c.createdAt ? c.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          candidateId: c.id,
          candidateName: c.fullName,
          nisn: c.nisn,
          schoolOrigin: c.schoolOrigin || (isMaarif ? 'SD Maarif Jogosari' : 'SD Umum'),
          isMaarif,
          sessionId: c.sessionId,
          sessionName: sessionStats[sessKey]?.name || c.sessionId,
          type: 'rereg',
          typeLabel: 'Daftar Ulang & Seragam',
          amountIn: nominalReReg,
          amountOut: 0,
          netAmount: nominalReReg,
          paymentMethod: c.reRegistrationPaymentMethod || 'Midtrans Snap Online',
          status: 'paid',
          statusLabel: 'Lunas DU',
          candidate: c
        });
      } else {
        // Pending Re-registration (Piutang)
        totalPendingReReg += expectedReRegAmount;
      }
    });

    // Compute net totals per session
    Object.keys(sessionStats).forEach(key => {
      const s = sessionStats[key];
      s.totalNet = (s.tokenGross - s.tokenRefund) + s.reregRevenue;
    });

    const netToken = totalGrossToken - totalTokenRefund;
    const totalNetRevenue = netToken + totalReRegRevenue;

    const maarifNetRevenue = (maarifGrossToken - maarifTokenRefund) + maarifReRegRevenue;
    const otherNetRevenue = (otherGrossToken - otherTokenRefund) + otherReRegRevenue;

    return {
      totalGrossToken,
      totalTokenRefund,
      netToken,
      totalReRegRevenue,
      totalNetRevenue,
      totalPendingReReg,
      maarifGrossToken,
      maarifTokenRefund,
      maarifNetToken: maarifGrossToken - maarifTokenRefund,
      maarifReRegRevenue,
      maarifNetRevenue,
      otherGrossToken,
      otherTokenRefund,
      otherNetToken: otherGrossToken - otherTokenRefund,
      otherReRegRevenue,
      otherNetRevenue,
      sessionStats,
      transactionLogs: transactionLogs.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [candidates, config, tokenFee]);

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return financialData.transactionLogs.filter(tx => {
      const matchesSearch = 
        tx.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.nisn.includes(searchQuery) ||
        tx.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.schoolOrigin.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || tx.type === filterType;
      const matchesSession = filterSession === 'all' || tx.sessionId === filterSession;
      const matchesSchool = 
        filterSchoolOrigin === 'all' || 
        (filterSchoolOrigin === 'maarif' && tx.isMaarif) ||
        (filterSchoolOrigin === 'other' && !tx.isMaarif);

      return matchesSearch && matchesType && matchesSession && matchesSchool;
    });
  }, [financialData.transactionLogs, searchQuery, filterType, filterSession, filterSchoolOrigin]);

  // Export to CSV / Excel
  const handleExportCsv = () => {
    const headers = [
      'No',
      'No Transaksi / Order ID',
      'Tanggal',
      'NISN',
      'Nama Calon Siswa',
      'Asal Sekolah',
      'Sesi / Gelombang',
      'Jenis Pembayaran',
      'Metode Bayar',
      'Pemasukan (Rp)',
      'Pengeluaran/Refund (Rp)',
      'Nominal Bersih (Rp)',
      'Status'
    ];

    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      `"${tx.orderId}"`,
      tx.date,
      `"${tx.nisn}"`,
      `"${tx.candidateName.replace(/"/g, '""')}"`,
      `"${tx.schoolOrigin.replace(/"/g, '""')}"`,
      `"${tx.sessionName}"`,
      `"${tx.typeLabel}"`,
      `"${tx.paymentMethod}"`,
      tx.amountIn,
      tx.amountOut,
      tx.netAmount,
      tx.statusLabel
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_SPMB_${currentAcademicYear.replace(/\//g, '-')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Full Financial Report Sheet (Ber-KOP Resmi)
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan di browser Anda.');
      return;
    }

    const kopLogo = schoolIdentity?.logo || '';
    const kopHeaderImg = schoolIdentity?.letterhead || '';
    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const schoolAddress = schoolIdentity?.address || "Jl. Jogosari No. 01 Pandaan, Pasuruan - Jawa Timur";
    const schoolPhone = schoolIdentity?.phone || "0343-631xxx";
    const principalName = schoolIdentity?.principal || "Kepala Sekolah";
    const treasurerName = schoolIdentity?.treasurer || "Bendahara SPMB";

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Keuangan SPMB ${currentAcademicYear} - ${schoolName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .kop-container {
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 14px;
            text-align: center;
          }
          .kop-header-img {
            max-width: 100%;
            height: auto;
            max-height: 95px;
            object-fit: contain;
          }
          .kop-text-org {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #334155;
            margin: 0 0 2px 0;
          }
          .kop-school-name {
            font-size: 18px;
            font-weight: 900;
            color: #064e3b;
            margin: 0 0 3px 0;
            text-transform: uppercase;
          }
          .kop-sub {
            font-size: 10px;
            color: #475569;
            margin: 0;
          }
          .title-section {
            text-align: center;
            margin-bottom: 16px;
          }
          .report-title {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 0 0 3px 0;
          }
          .report-subtitle {
            font-size: 10.5px;
            color: #475569;
            margin: 0;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
          }
          .kpi-card {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
          }
          .kpi-label {
            font-size: 9px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .kpi-val {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 3px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
            margin: 14px 0 6px 0;
            text-transform: uppercase;
            border-left: 3px solid #059669;
            padding-left: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin-bottom: 14px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 8.5px;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-mono { font-family: monospace; }
          .text-emerald { color: #047857; }
          .text-amber { color: #b45309; }
          .text-rose { color: #be123c; }
          .bg-total {
            background-color: #e2e8f0;
            font-weight: 800;
          }
          .signatures {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 40%;
            text-align: center;
          }
          .sig-space {
            height: 55px;
          }
        </style>
      </head>
      <body>
        <div class="kop-container">
          ${kopHeaderImg ? `<img src="${kopHeaderImg}" class="kop-header-img" />` : `
            <p class="kop-text-org">LEMBAGA PENDIDIKAN MA'ARIF NU KABUPATEN PASURUAN</p>
            <h1 class="kop-school-name">${schoolName}</h1>
            <p class="kop-sub">${schoolAddress} • Telp: ${schoolPhone}</p>
          `}
        </div>

        <div class="title-section">
          <h2 class="report-title">REKAPITULASI LAPORAN KEUANGAN PENERIMAAN MURID BARU (SPMB)</h2>
          <p class="report-subtitle">Tahun Ajaran ${currentAcademicYear} • Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
        </div>

        <!-- Ringkasan Pemasukan Bersih -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Penerimaan Bersih Token</div>
            <div class="kpi-val text-emerald">Rp ${financialData.netToken.toLocaleString('id-ID')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Penerimaan Daftar Ulang</div>
            <div class="kpi-val text-emerald">Rp ${financialData.totalReRegRevenue.toLocaleString('id-ID')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Kas Bersih SPMB</div>
            <div class="kpi-val text-emerald" style="font-size: 14px; color: #047857;">Rp ${financialData.totalNetRevenue.toLocaleString('id-ID')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Piutang / Belum Lunas</div>
            <div class="kpi-val text-amber">Rp ${financialData.totalPendingReReg.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <!-- 1. Ringkasan Berdasarkan Sesi / Gelombang -->
        <div class="section-title">I. Rekapitulasi Penerimaan per Gelombang / Sesi</div>
        <table>
          <thead>
            <tr>
              <th>Gelombang / Sesi</th>
              <th class="text-center">Siswa Token</th>
              <th class="text-right">Token Kotor (Rp)</th>
              <th class="text-right">Refund Tunai (Rp)</th>
              <th class="text-right">Net Token (Rp)</th>
              <th class="text-center">Siswa Lunas DU</th>
              <th class="text-right">Daftar Ulang (Rp)</th>
              <th class="text-right">Total Net Kas (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(financialData.sessionStats).map(key => {
              const s = financialData.sessionStats[key];
              const netTok = s.tokenGross - s.tokenRefund;
              return `
                <tr>
                  <td class="font-bold">${s.name}</td>
                  <td class="text-center">${s.tokenPaidCount}</td>
                  <td class="text-right font-mono">Rp ${s.tokenGross.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono text-rose">Rp ${s.tokenRefund.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono font-bold">Rp ${netTok.toLocaleString('id-ID')}</td>
                  <td class="text-center">${s.reregPaidCount}</td>
                  <td class="text-right font-mono">Rp ${s.reregRevenue.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono font-bold text-emerald">Rp ${s.totalNet.toLocaleString('id-ID')}</td>
                </tr>
              `;
            }).join('')}
            <tr class="bg-total">
              <td>TOTAL KESELURUHAN</td>
              <td class="text-center">${candidates.filter(c => c.tokenPaymentStatus === 'paid' || c.tokenPaid).length}</td>
              <td class="text-right font-mono">Rp ${financialData.totalGrossToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono text-rose">Rp ${financialData.totalTokenRefund.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold">Rp ${financialData.netToken.toLocaleString('id-ID')}</td>
              <td class="text-center">${candidates.filter(c => c.reRegistrationStatus === 'paid').length}</td>
              <td class="text-right font-mono">Rp ${financialData.totalReRegRevenue.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${financialData.totalNetRevenue.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <!-- 2. Ringkasan Berdasarkan Asal Sekolah -->
        <div class="section-title">II. Rekapitulasi Berdasarkan Asal Sekolah</div>
        <table>
          <thead>
            <tr>
              <th>Kelompok Asal Sekolah</th>
              <th class="text-right">Token Masuk (Rp)</th>
              <th class="text-right">Refund Tunai Kolektif (Rp)</th>
              <th class="text-right">Net Token (Rp)</th>
              <th class="text-right">Penerimaan Daftar Ulang (Rp)</th>
              <th class="text-right">Total Net Penerimaan (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold">SD Ma'arif Jogosari / LP Ma'arif NU (Afiliasi)</td>
              <td class="text-right font-mono">Rp ${financialData.maarifGrossToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono text-rose">Rp ${financialData.maarifTokenRefund.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono">Rp ${financialData.maarifNetToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono">Rp ${financialData.maarifReRegRevenue.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${financialData.maarifNetRevenue.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td class="font-bold">SD Umum / Negeri / SD Swasta Luar</td>
              <td class="text-right font-mono">Rp ${financialData.otherGrossToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono text-rose">Rp ${financialData.otherTokenRefund.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono">Rp ${financialData.otherNetToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono">Rp ${financialData.otherReRegRevenue.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${financialData.otherNetRevenue.toLocaleString('id-ID')}</td>
            </tr>
            <tr class="bg-total">
              <td>TOTAL</td>
              <td class="text-right font-mono">Rp ${financialData.totalGrossToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono text-rose">Rp ${financialData.totalTokenRefund.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold">Rp ${financialData.netToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono">Rp ${financialData.totalReRegRevenue.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${financialData.totalNetRevenue.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Rincian Riwayat Transaksi -->
        <div class="section-title">III. Rincian Riwayat Transaksi Keuangan SPMB</div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 25px;">No</th>
              <th>Tgl</th>
              <th>Order ID / Kuitansi</th>
              <th>Nama Calon Siswa (NISN)</th>
              <th>Asal Sekolah</th>
              <th>Jenis Transaksi</th>
              <th>Metode</th>
              <th class="text-right">Nominal (Rp)</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.slice(0, 100).map((tx, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${tx.date}</td>
                <td class="font-mono text-center" style="font-size: 8px;">${tx.orderId}</td>
                <td><strong>${tx.candidateName}</strong> <span style="font-size: 8px; color: #64748b;">(${tx.nisn})</span></td>
                <td>${tx.schoolOrigin}</td>
                <td>${tx.typeLabel}</td>
                <td>${tx.paymentMethod}</td>
                <td class="text-right font-mono font-bold ${tx.amountOut > 0 ? 'text-rose' : 'text-emerald'}">
                  ${tx.amountOut > 0 ? `- Rp ${tx.amountOut.toLocaleString('id-ID')}` : `Rp ${tx.amountIn.toLocaleString('id-ID')}`}
                </td>
                <td class="text-center"><strong>${tx.statusLabel}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Tanda Tangan Resmi -->
        <div class="signatures">
          <div class="sig-box">
            <p>Mengetahui,<br /><strong>Kepala Sekolah</strong></p>
            <div class="sig-space"></div>
            <p style="font-weight: 800; text-decoration: underline; margin: 0;">${principalName}</p>
          </div>
          <div class="sig-box">
            <p>Pandaan, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}<br /><strong>Bendahara / Panitia SPMB</strong></p>
            <div class="sig-space"></div>
            <p style="font-weight: 800; text-decoration: underline; margin: 0;">${treasurerName}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Laporan Keuangan SPMB */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                Keuangan SPMB {currentAcademicYear}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 text-xs font-semibold">
                {financialData.transactionLogs.length} Total Transaksi
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white m-0">
              Laporan Keuangan & Arus Kas SPMB {currentAcademicYear}
            </h2>
            <p className="text-xs text-emerald-100/90 m-0 max-w-3xl">
              Rekapitulasi penerimaan token formulir, pengembalian uang tunai jalur kolektif, pembayaran daftar ulang, dan infaq pembangunan secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Unduh data keuangan dalam format CSV / Excel"
            >
              <FileSpreadsheet size={15} className="text-emerald-700" />
              <span>Export Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Cetak Laporan Keuangan SPMB Resmi ber-KOP"
            >
              <Printer size={15} />
              <span>Cetak Laporan Resmi</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* 1. Token Kotor */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
            <span className="text-[11px] text-emerald-100 block font-medium">Token Masuk (Kotor)</span>
            <span className="text-lg font-black text-white block mt-0.5">
              Rp {financialData.totalGrossToken.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              {candidates.filter(c => c.tokenPaymentStatus === 'paid' || c.tokenPaid).length} Murid Bayar
            </span>
          </div>

          {/* 2. Refund Cash Token */}
          <div className="p-3.5 rounded-2xl bg-rose-500/20 backdrop-blur-xs border border-rose-400/30">
            <span className="text-[11px] text-rose-200 block font-medium">Refund Cash Token</span>
            <span className="text-lg font-black text-rose-200 block mt-0.5">
              - Rp {financialData.totalTokenRefund.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-rose-200/80 mt-1 block">
              {candidates.filter(c => c.collectiveRefundStatus === 'refunded').length} Siswa Dikembalikan
            </span>
          </div>

          {/* 3. Token Bersih */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
            <span className="text-[11px] text-emerald-100 block font-medium">Net Penerimaan Token</span>
            <span className="text-lg font-black text-emerald-200 block mt-0.5">
              Rp {financialData.netToken.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              Setelah Refund Kolektif
            </span>
          </div>

          {/* 4. Daftar Ulang Masuk */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
            <span className="text-[11px] text-emerald-100 block font-medium">Daftar Ulang & Seragam</span>
            <span className="text-lg font-black text-white block mt-0.5">
              Rp {financialData.totalReRegRevenue.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              {candidates.filter(c => c.reRegistrationStatus === 'paid').length} Murid Lunas DU
            </span>
          </div>

          {/* 5. Total Kas Bersih */}
          <div className="p-3.5 rounded-2xl bg-emerald-400 text-slate-950 shadow-md">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Total Kas Bersih</span>
            <span className="text-lg font-black text-slate-950 block mt-0.5">
              Rp {financialData.totalNetRevenue.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-800 font-bold mt-1 block">
              Total Pemasukan Kas SPMB
            </span>
          </div>

          {/* 6. Estimasi Piutang */}
          <div className="p-3.5 rounded-2xl bg-amber-500/25 backdrop-blur-xs border border-amber-300/40">
            <span className="text-[11px] text-amber-200 block font-medium">Potensi / Piutang DU</span>
            <span className="text-lg font-black text-amber-200 block mt-0.5">
              Rp {financialData.totalPendingReReg.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-amber-200/80 mt-1 block">
              {candidates.filter(c => c.reRegistrationStatus !== 'paid').length} Murid Belum DU
            </span>
          </div>
        </div>
      </div>

      {/* 2. Rincian Berdasarkan Sesi & Asal Sekolah */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Box Penerimaan Per Gelombang */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
              <Calendar size={18} className="text-emerald-600" />
              <span>Penerimaan Kas per Gelombang / Sesi</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              SPMB {currentAcademicYear}
            </span>
          </div>

          <div className="space-y-3">
            {Object.keys(financialData.sessionStats).map(key => {
              const s = financialData.sessionStats[key];
              const netTok = s.tokenGross - s.tokenRefund;

              return (
                <div key={key} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-900 font-bold text-sm">{s.name}</strong>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                      Total Net: Rp {s.totalNet.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Token ({s.tokenPaidCount} siswa)</span>
                      <strong className="text-slate-900 font-mono">Rp {netTok.toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Daftar Ulang ({s.reregPaidCount} lunas)</span>
                      <strong className="text-emerald-700 font-mono">Rp {s.reregRevenue.toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-rose-600 block">Refund Tunai</span>
                      <strong className="text-rose-600 font-mono">- Rp {s.tokenRefund.toLocaleString('id-ID')}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Box Penerimaan Berdasarkan Asal Sekolah (SD Maarif vs SD Umum) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
              <GraduationCap size={18} className="text-indigo-600" />
              <span>Komparasi Penerimaan: SD Ma'arif vs SD Umum</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Analisis Asal Sekolah
            </span>
          </div>

          <div className="space-y-3.5">
            {/* SD Maarif Jogosari */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border-2 border-emerald-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-700" />
                  <strong className="text-emerald-950 font-bold text-sm">SD Ma'arif Jogosari (Afiliasi)</strong>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-black">
                  Rp {financialData.maarifNetRevenue.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-500 block">Token Kotor</span>
                  <strong className="text-slate-900 font-mono">Rp {financialData.maarifGrossToken.toLocaleString('id-ID')}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-rose-600 block">Refund Tunai</span>
                  <strong className="text-rose-600 font-mono">- Rp {financialData.maarifTokenRefund.toLocaleString('id-ID')}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block">Daftar Ulang</span>
                  <strong className="text-emerald-800 font-mono">Rp {financialData.maarifReRegRevenue.toLocaleString('id-ID')}</strong>
                </div>
              </div>
            </div>

            {/* SD Umum & Lainnya */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-700" />
                  <strong className="text-indigo-950 font-bold text-sm">SD Umum / Negeri / Luar</strong>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-black">
                  Rp {financialData.otherNetRevenue.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-slate-500 block">Token Kotor</span>
                  <strong className="text-slate-900 font-mono">Rp {financialData.otherGrossToken.toLocaleString('id-ID')}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-rose-600 block">Refund Tunai</span>
                  <strong className="text-rose-600 font-mono">- Rp {financialData.otherTokenRefund.toLocaleString('id-ID')}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 block">Daftar Ulang</span>
                  <strong className="text-indigo-800 font-mono">Rp {financialData.otherReRegRevenue.toLocaleString('id-ID')}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Riwayat Transaksi Tabel */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" />
            <h3 className="text-base font-black text-slate-900 m-0">
              Riwayat Transaksi Keuangan SPMB ({filteredTransactions.length})
            </h3>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-grow sm:w-60">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama, NISN, Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:bg-white"
            >
              <option value="all">Semua Jenis Transaksi</option>
              <option value="token">Token Formulir Online</option>
              <option value="rereg">Daftar Ulang & Seragam</option>
              <option value="refund">Refund Cash Token Kolektif</option>
            </select>

            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              <option value="all">Semua Sesi</option>
              <option value="inden">Jalur Inden</option>
              <option value="gelombang-1">Gelombang 1</option>
              <option value="gelombang-2">Gelombang 2</option>
            </select>

            <select
              value={filterSchoolOrigin}
              onChange={(e) => setFilterSchoolOrigin(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              <option value="all">Semua Asal SD</option>
              <option value="maarif">SD Ma'arif Jogosari</option>
              <option value="other">SD Umum / Luar</option>
            </select>
          </div>
        </div>

        {/* Table Transaksi */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">No</th>
                <th className="py-3 px-3">Tgl</th>
                <th className="py-3 px-3">Order ID / Kuitansi</th>
                <th className="py-3 px-3">Calon Siswa</th>
                <th className="py-3 px-3">Asal Sekolah</th>
                <th className="py-3 px-3">Jenis Pembayaran</th>
                <th className="py-3 px-3">Metode</th>
                <th className="py-3 px-3 text-right">Nominal</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada data transaksi keuangan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">{tx.date}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 text-[11px]">{tx.orderId}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 m-0">{tx.candidateName}</p>
                      <p className="text-[10px] text-slate-500 font-mono m-0">NISN: {tx.nisn}</p>
                    </td>
                    <td className="py-3 px-3">
                      {tx.isMaarif ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          <Sparkles size={10} />
                          <span>SD Maarif Jogosari</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600">{tx.schoolOrigin}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === 'refund' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                          : tx.type === 'rereg'
                          ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tx.typeLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">{tx.paymentMethod}</td>
                    <td className={`py-3 px-3 text-right font-mono font-bold text-xs ${
                      tx.amountOut > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}>
                      {tx.amountOut > 0 ? `- Rp ${tx.amountOut.toLocaleString('id-ID')}` : `+ Rp ${tx.amountIn.toLocaleString('id-ID')}`}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        tx.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {tx.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {tx.type === 'refund' ? (
                        <button
                          type="button"
                          onClick={() => onOpenRefundReceiptModal?.(tx.candidate)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                          title="Cetak Kuitansi Pengembalian Tunai"
                        >
                          <Printer size={11} />
                          <span>Kuitansi</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenReceiptModal?.(tx.candidate, tx.type === 'rereg' ? 'rereg' : 'token')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                          title="Cetak Kuitansi Resmi"
                        >
                          <Printer size={11} />
                          <span>Kuitansi</span>
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
  );
}
