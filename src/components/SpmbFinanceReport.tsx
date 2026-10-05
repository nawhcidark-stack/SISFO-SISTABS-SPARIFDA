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
  FileSpreadsheet,
  RotateCcw,
  CalendarDays,
  Shirt,
  Building,
  BookOpen,
  Tag,
  Phone,
  MessageCircle,
  Eye,
  Layers,
  ChevronRight
} from 'lucide-react';
import { SpmbCandidate, SpmbConfig, SchoolIdentity } from '../types';
import { calculateReRegDetails, printHtmlSafely, formatIndoDate, renderKopHeaderHtml, getReceiptCss } from '../utils/spmbReceiptPrint';

interface SpmbFinanceReportProps {
  candidates: SpmbCandidate[];
  config: SpmbConfig | null;
  schoolIdentity?: SchoolIdentity;
  onOpenReceiptModal?: (candidate: SpmbCandidate, type: 'token' | 'rereg') => void;
  onOpenRefundReceiptModal?: (candidate: SpmbCandidate) => void;
}

// Helper to normalize any date input to YYYY-MM-DD
function normalizeDateStr(dateVal?: string | null): string {
  if (!dateVal) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    return dateVal.slice(0, 10);
  }
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export default function SpmbFinanceReport({
  candidates,
  config,
  schoolIdentity,
  onOpenReceiptModal,
  onOpenRefundReceiptModal
}: SpmbFinanceReportProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'rereg_breakdown' | 'pending_rereg' | 'analytics'>('overview');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'token' | 'rereg' | 'refund'>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterSchoolOrigin, setFilterSchoolOrigin] = useState<'all' | 'maarif' | 'other'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');

  // Date Filtering State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('all');

  const currentAcademicYear = config?.academicYear || '2027/2028';
  const tokenFee = config?.registrationTokenFee || 50000;

  // Handle Preset Date Range
  const handleSelectPreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const dStr = toYMD(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const dStr = toYMD(yest);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'this_week') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      setStartDate(toYMD(sevenDaysAgo));
      setEndDate(toYMD(today));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(today));
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(toYMD(firstDayLastMonth));
      setEndDate(toYMD(lastDayLastMonth));
    } else if (preset === 'this_year') {
      const firstDayYear = new Date(today.getFullYear(), 0, 1);
      setStartDate(toYMD(firstDayYear));
      setEndDate(toYMD(today));
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterSession('all');
    setFilterSchoolOrigin('all');
    setFilterPaymentMethod('all');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
  };

  // 1. Process All Candidates and generate unified transactions & detailed re-registration breakdown
  const { allTransactions, reregPaidList, pendingReRegList, totalReRegStats } = useMemo(() => {
    const txList: Array<{
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
      reregBreakdown?: {
        buildingFee: number;
        netBuildingFee: number;
        julySppFee: number;
        netUniformTotal: number;
        baseFee: number;
        totalDiscount: number;
        uniformSize: string;
      };
    }> = [];

    const paidDU: Array<{
      candidate: SpmbCandidate;
      date: string;
      orderId: string;
      paymentMethod: string;
      sessionName: string;
      buildingFee: number;
      buildingDiscount: number;
      netBuildingFee: number;
      julySppFee: number;
      isSiblingFreeSpp: boolean;
      rawUniformTotal: number;
      uniformDiscount: number;
      netUniformTotal: number;
      baseFee: number;
      totalDiscount: number;
      grandTotal: number;
      uniformSize: string;
    }> = [];

    const unpaidDU: Array<{
      candidate: SpmbCandidate;
      registeredDate: string;
      tokenOrderId: string;
      sessionName: string;
      estimatedBuildingFee: number;
      estimatedJulySpp: number;
      estimatedUniform: number;
      estimatedDiscount: number;
      estimatedGrandTotal: number;
      uniformSize: string;
    }> = [];

    let sumBuildingNet = 0;
    let sumJulySpp = 0;
    let sumUniformNet = 0;
    let sumBaseFee = 0;
    let sumTotalDiscounts = 0;
    let sumGrandTotalReReg = 0;

    const uniformSizeCounts: Record<string, number> = {
      'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XXL': 0, 'Jumbo': 0, 'Lainnya': 0
    };

    candidates.forEach(c => {
      const isMaarif = c.schoolOriginType === 'maarif_jogosari' || 
        c.schoolOriginType === 'lp_maarif' ||
        (c.schoolOrigin || '').toLowerCase().includes('maarif');
      const isTokenPaid = Boolean(
        c.tokenPaymentStatus === 'paid' || 
        c.tokenPaid === true || 
        c.registrationType === 'school_collective' ||
        (c as any).isTokenPaid === true
      );
      const isCollective = c.registrationType === 'school_collective';
      const isRefunded = c.collectiveRefundStatus === 'refunded';
      
      const isReRegPaid = Boolean(
        (c.reRegistrationStatus === 'paid' || (c as any).reRegistrationPaid === true || (c as any).isReRegistered === true || (c as any).reRegistrationPaymentStatus === 'paid') &&
        (Number(c.reRegistrationAmount) > 0 || Number((c as any).totalReRegistrationPaid) > 0)
      );

      const sess = config?.sessions?.find(s => s.id === c.sessionId);
      const sessionName = sess?.name || (c.sessionId === 'inden' ? 'Jalur Inden' : c.sessionId === 'gelombang-1' ? 'Gelombang 1' : c.sessionId === 'gelombang-2' ? 'Gelombang 2' : c.sessionId || 'Reguler');
      const reregDetails = calculateReRegDetails(c, config);
      const sizeKey = c.selectedUniformSize || (c as any).uniformSize || 'L';

      // 1a. Token Fee Transaction
      if (isTokenPaid) {
        const nominalToken = c.tokenAmount || tokenFee;
        const dateStr = normalizeDateStr(c.tokenPaidAt || (c as any).tokenPaymentDate || c.createdAt);

        txList.push({
          id: `tx-token-${c.id}`,
          orderId: c.tokenPaymentOrderId || `ORD-TOKEN-${c.nisn}`,
          date: dateStr,
          candidateId: c.id,
          candidateName: c.fullName,
          nisn: c.nisn,
          schoolOrigin: c.schoolOrigin || (isMaarif ? 'SD Maarif Jogosari' : 'SD Umum'),
          isMaarif,
          sessionId: c.sessionId,
          sessionName,
          type: 'token',
          typeLabel: 'Token Formulir Online',
          amountIn: nominalToken,
          amountOut: 0,
          netAmount: nominalToken,
          paymentMethod: c.tokenPaymentMethod || (isCollective ? 'Kolektif / Midtrans' : 'Midtrans Snap Online'),
          status: 'paid',
          statusLabel: 'Lunas Token',
          candidate: c
        });
      }

      // 1b. Token Refund (Cash) Transaction
      if (isCollective && isRefunded) {
        const nominalRefund = c.collectiveRefundAmount || tokenFee;
        const dateStr = normalizeDateStr(c.collectiveRefundedAt || (c as any).collectiveRefundDate || c.updatedAt);

        txList.push({
          id: `tx-refund-${c.id}`,
          orderId: c.collectiveRefundReceiptNo || `KW-REFUND-${c.nisn}`,
          date: dateStr,
          candidateId: c.id,
          candidateName: c.fullName,
          nisn: c.nisn,
          schoolOrigin: c.schoolOrigin || (isMaarif ? 'SD Maarif Jogosari' : 'SD Umum'),
          isMaarif,
          sessionId: c.sessionId,
          sessionName,
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

      // 1c. Re-Registration (Daftar Ulang) Handling
      if (isReRegPaid) {
        const totalDiscount = reregDetails.totalBuildingDiscount + reregDetails.maarifUniformDiscount + reregDetails.sportsUniformBonus + (reregDetails.isSiblingFreeSpp ? reregDetails.julySppFee : 0);
        const nominalReReg = (Number(c.reRegistrationAmount) > 0 ? Number(c.reRegistrationAmount) : Number((c as any).totalReRegistrationPaid)) || reregDetails.grandTotal;
        const dateStr = normalizeDateStr(c.reRegistrationPaidAt || (c as any).reRegistrationDate || c.updatedAt || c.createdAt);

        sumBuildingNet += reregDetails.netBuildingFee;
        sumJulySpp += reregDetails.effectiveJulySppFee;
        sumUniformNet += reregDetails.netUniformTotal;
        sumBaseFee += reregDetails.baseFee;
        sumTotalDiscounts += totalDiscount;
        sumGrandTotalReReg += nominalReReg;

        const normalizedSize = ['S', 'M', 'L', 'XL', 'XXL', 'Jumbo'].includes(sizeKey) ? sizeKey : 'Lainnya';
        uniformSizeCounts[normalizedSize] = (uniformSizeCounts[normalizedSize] || 0) + 1;

        txList.push({
          id: `tx-rereg-${c.id}`,
          orderId: c.reRegistrationOrderId || `ORD-REREG-${c.nisn}`,
          date: dateStr,
          candidateId: c.id,
          candidateName: c.fullName,
          nisn: c.nisn,
          schoolOrigin: c.schoolOrigin || (isMaarif ? 'SD Maarif Jogosari' : 'SD Umum'),
          isMaarif,
          sessionId: c.sessionId,
          sessionName,
          type: 'rereg',
          typeLabel: 'Daftar Ulang & Seragam',
          amountIn: nominalReReg,
          amountOut: 0,
          netAmount: nominalReReg,
          paymentMethod: c.reRegistrationPaymentMethod || 'Midtrans Snap Online',
          status: 'paid',
          statusLabel: 'Lunas DU',
          candidate: c,
          reregBreakdown: {
            buildingFee: reregDetails.buildingFee,
            netBuildingFee: reregDetails.netBuildingFee,
            julySppFee: reregDetails.effectiveJulySppFee,
            netUniformTotal: reregDetails.netUniformTotal,
            baseFee: reregDetails.baseFee,
            totalDiscount,
            uniformSize: sizeKey
          }
        });

        paidDU.push({
          candidate: c,
          date: dateStr,
          orderId: c.reRegistrationOrderId || `ORD-REREG-${c.nisn}`,
          paymentMethod: c.reRegistrationPaymentMethod || 'Midtrans Snap Online',
          sessionName,
          buildingFee: reregDetails.buildingFee,
          buildingDiscount: reregDetails.totalBuildingDiscount,
          netBuildingFee: reregDetails.netBuildingFee,
          julySppFee: reregDetails.effectiveJulySppFee,
          isSiblingFreeSpp: reregDetails.isSiblingFreeSpp,
          rawUniformTotal: reregDetails.rawUniformTotal,
          uniformDiscount: reregDetails.maarifUniformDiscount + reregDetails.sportsUniformBonus,
          netUniformTotal: reregDetails.netUniformTotal,
          baseFee: reregDetails.baseFee,
          totalDiscount,
          grandTotal: nominalReReg,
          uniformSize: sizeKey
        });
      } else {
        // Pending Daftar Ulang (Piutang)
        if (isTokenPaid || c.status === 'accepted') {
          const totalDiscount = reregDetails.totalBuildingDiscount + reregDetails.maarifUniformDiscount + reregDetails.sportsUniformBonus + (reregDetails.isSiblingFreeSpp ? reregDetails.julySppFee : 0);
          unpaidDU.push({
            candidate: c,
            registeredDate: normalizeDateStr(c.tokenPaidAt || c.createdAt),
            tokenOrderId: c.tokenPaymentOrderId || `ORD-TOKEN-${c.nisn}`,
            sessionName,
            estimatedBuildingFee: reregDetails.netBuildingFee,
            estimatedJulySpp: reregDetails.effectiveJulySppFee,
            estimatedUniform: reregDetails.netUniformTotal,
            estimatedDiscount: totalDiscount,
            estimatedGrandTotal: reregDetails.grandTotal,
            uniformSize: sizeKey
          });
        }
      }
    });

    return {
      allTransactions: txList.sort((a, b) => b.date.localeCompare(a.date)),
      reregPaidList: paidDU.sort((a, b) => b.date.localeCompare(a.date)),
      pendingReRegList: unpaidDU.sort((a, b) => b.registeredDate.localeCompare(a.registeredDate)),
      totalReRegStats: {
        sumBuildingNet,
        sumJulySpp,
        sumUniformNet,
        sumBaseFee,
        sumTotalDiscounts,
        sumGrandTotalReReg,
        uniformSizeCounts
      }
    };
  }, [candidates, config, tokenFee]);

  // 2. Filtered Transactions based on Search, Type, Session, School Origin, Payment Method, and Date Range
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const matchesSearch = !searchQuery || 
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

      const matchesMethod = filterPaymentMethod === 'all' || tx.paymentMethod.toLowerCase().includes(filterPaymentMethod.toLowerCase());

      let matchesDate = true;
      if (startDate && tx.date < startDate) matchesDate = false;
      if (endDate && tx.date > endDate) matchesDate = false;

      return matchesSearch && matchesType && matchesSession && matchesSchool && matchesMethod && matchesDate;
    });
  }, [allTransactions, searchQuery, filterType, filterSession, filterSchoolOrigin, filterPaymentMethod, startDate, endDate]);

  // 3. Filtered Re-Registration Breakdown list
  const filteredReregPaidList = useMemo(() => {
    return reregPaidList.filter(item => {
      const matchesSearch = !searchQuery ||
        item.candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.candidate.nisn.includes(searchQuery) ||
        item.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.candidate.schoolOrigin || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSession = filterSession === 'all' || item.candidate.sessionId === filterSession;
      const isMaarif = item.candidate.schoolOriginType === 'maarif_jogosari' || 
        item.candidate.schoolOriginType === 'lp_maarif' || 
        (item.candidate.schoolOrigin || '').toLowerCase().includes('maarif');

      const matchesSchool = 
        filterSchoolOrigin === 'all' || 
        (filterSchoolOrigin === 'maarif' && isMaarif) ||
        (filterSchoolOrigin === 'other' && !isMaarif);

      let matchesDate = true;
      if (startDate && item.date < startDate) matchesDate = false;
      if (endDate && item.date > endDate) matchesDate = false;

      return matchesSearch && matchesSession && matchesSchool && matchesDate;
    });
  }, [reregPaidList, searchQuery, filterSession, filterSchoolOrigin, startDate, endDate]);

  // 4. Dynamic Financial Metrics calculated from Filtered Transactions
  const filteredMetrics = useMemo(() => {
    let grossToken = 0;
    let tokenPaidCount = 0;
    let tokenRefund = 0;
    let tokenRefundCount = 0;
    let reregRevenue = 0;
    let reregPaidCount = 0;

    let maarifGrossToken = 0;
    let maarifTokenRefund = 0;
    let maarifReRegRevenue = 0;

    let otherGrossToken = 0;
    let otherTokenRefund = 0;
    let otherReRegRevenue = 0;

    // Re-registration breakdown sums for filtered items
    let filteredBuildingNet = 0;
    let filteredJulySpp = 0;
    let filteredUniformNet = 0;
    let filteredBaseFee = 0;
    let filteredDiscounts = 0;

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

    filteredTransactions.forEach(tx => {
      const sessKey = tx.sessionId || 'inden';
      if (!sessionStats[sessKey]) {
        sessionStats[sessKey] = {
          name: tx.sessionName || sessKey,
          tokenPaidCount: 0,
          tokenGross: 0,
          tokenRefund: 0,
          reregPaidCount: 0,
          reregRevenue: 0,
          totalNet: 0
        };
      }

      if (tx.type === 'token') {
        grossToken += tx.amountIn;
        tokenPaidCount += 1;
        sessionStats[sessKey].tokenPaidCount += 1;
        sessionStats[sessKey].tokenGross += tx.amountIn;

        if (tx.isMaarif) maarifGrossToken += tx.amountIn;
        else otherGrossToken += tx.amountIn;
      } else if (tx.type === 'refund') {
        tokenRefund += tx.amountOut;
        tokenRefundCount += 1;
        sessionStats[sessKey].tokenRefund += tx.amountOut;

        if (tx.isMaarif) maarifTokenRefund += tx.amountOut;
        else otherTokenRefund += tx.amountOut;
      } else if (tx.type === 'rereg') {
        reregRevenue += tx.amountIn;
        reregPaidCount += 1;
        sessionStats[sessKey].reregPaidCount += 1;
        sessionStats[sessKey].reregRevenue += tx.amountIn;

        if (tx.isMaarif) maarifReRegRevenue += tx.amountIn;
        else otherReRegRevenue += tx.amountIn;

        if (tx.reregBreakdown) {
          filteredBuildingNet += tx.reregBreakdown.netBuildingFee;
          filteredJulySpp += tx.reregBreakdown.julySppFee;
          filteredUniformNet += tx.reregBreakdown.netUniformTotal;
          filteredBaseFee += tx.reregBreakdown.baseFee;
          filteredDiscounts += tx.reregBreakdown.totalDiscount;
        }
      }
    });

    Object.keys(sessionStats).forEach(k => {
      const s = sessionStats[k];
      s.totalNet = (s.tokenGross - s.tokenRefund) + s.reregRevenue;
    });

    const netToken = grossToken - tokenRefund;
    const totalNetKas = netToken + reregRevenue;

    // Piutang DU (unpaid) total
    const totalPendingReReg = pendingReRegList.reduce((acc, curr) => acc + curr.estimatedGrandTotal, 0);

    return {
      grossToken,
      tokenPaidCount,
      tokenRefund,
      tokenRefundCount,
      netToken,
      reregRevenue,
      reregPaidCount,
      totalNetKas,
      totalPendingReReg,
      pendingReRegCount: pendingReRegList.length,
      filteredBuildingNet,
      filteredJulySpp,
      filteredUniformNet,
      filteredBaseFee,
      filteredDiscounts,
      maarifGrossToken,
      maarifTokenRefund,
      maarifNetToken: maarifGrossToken - maarifTokenRefund,
      maarifReRegRevenue,
      maarifNetRevenue: (maarifGrossToken - maarifTokenRefund) + maarifReRegRevenue,
      otherGrossToken,
      otherTokenRefund,
      otherNetToken: otherGrossToken - otherTokenRefund,
      otherReRegRevenue,
      otherNetRevenue: (otherGrossToken - otherTokenRefund) + otherReRegRevenue,
      sessionStats
    };
  }, [filteredTransactions, pendingReRegList, config]);

  const activeDateRangeLabel = useMemo(() => {
    if (startDate && endDate) {
      return `${formatIndoDate(startDate)} s/d ${formatIndoDate(endDate)}`;
    }
    if (startDate) {
      return `Mulai ${formatIndoDate(startDate)}`;
    }
    if (endDate) {
      return `Sampai ${formatIndoDate(endDate)}`;
    }
    return 'Semua Periode';
  }, [startDate, endDate]);

  const hasActiveFilters = Boolean(
    searchQuery || 
    filterType !== 'all' || 
    filterSession !== 'all' || 
    filterSchoolOrigin !== 'all' || 
    filterPaymentMethod !== 'all' || 
    startDate || 
    endDate
  );

  // 5. Export to CSV / Excel with Detailed Breakdown
  const handleExportCsv = () => {
    const headers = [
      'No',
      'No Transaksi / Order ID',
      'Tanggal (YYYY-MM-DD)',
      'NISN',
      'Nama Calon Siswa',
      'Asal Sekolah',
      'Kategori SD',
      'Sesi / Gelombang',
      'Jenis Pembayaran',
      'Metode Bayar',
      'Pemasukan (Rp)',
      'Pengeluaran/Refund (Rp)',
      'Nominal Bersih (Rp)',
      'Ukuran Seragam',
      'Status'
    ];

    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      `"${tx.orderId}"`,
      tx.date,
      `"${tx.nisn}"`,
      `"${tx.candidateName.replace(/"/g, '""')}"`,
      `"${tx.schoolOrigin.replace(/"/g, '""')}"`,
      tx.isMaarif ? '"SD Maarif Jogosari (Afiliasi)"' : '"SD Umum / Luar"',
      `"${tx.sessionName}"`,
      `"${tx.typeLabel}"`,
      `"${tx.paymentMethod}"`,
      tx.amountIn,
      tx.amountOut,
      tx.netAmount,
      `"${tx.reregBreakdown?.uniformSize || '-'}"`,
      tx.statusLabel
    ]);

    const metadataHeader = [
      `"REKAPITULASI LAPORAN KEUANGAN SPMB - ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}"`,
      `"Tahun Ajaran: ${currentAcademicYear}"`,
      `"Filter Periode: ${activeDateRangeLabel}"`,
      `"Total Kas Bersih Masuk: Rp ${filteredMetrics.totalNetKas.toLocaleString('id-ID')}"`,
      `"Rincian DU Masuk - Infaq Gedung: Rp ${filteredMetrics.filteredBuildingNet.toLocaleString('id-ID')} | Seragam: Rp ${filteredMetrics.filteredUniformNet.toLocaleString('id-ID')} | SPP Juli: Rp ${filteredMetrics.filteredJulySpp.toLocaleString('id-ID')}"`,
      `"Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}"`,
      ''
    ].join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      metadataHeader + '\n' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateTag = startDate && endDate ? `${startDate}_sd_${endDate}` : new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Laporan_Keuangan_SPMB_${currentAcademicYear.replace(/\//g, '-')}_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Print Official Financial Report Sheet using printHtmlSafely
  const handlePrintReport = () => {
    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const principalName = schoolIdentity?.principal || "Kepala Sekolah";
    const treasurerName = schoolIdentity?.treasurer || "Bendahara SPMB";
    const printDateStr = formatIndoDate(new Date());

    const printHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Laporan Keuangan SPMB ${currentAcademicYear} - ${schoolName}</title>
        <style>
          ${getReceiptCss()}
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10px;
            line-height: 1.4;
          }
          .title-section {
            text-align: center;
            margin-bottom: 12px;
          }
          .report-title {
            font-size: 13.5px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 0 0 3px 0;
          }
          .report-subtitle {
            font-size: 9.5px;
            color: #475569;
            margin: 0;
          }
          .filter-badge-box {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 700;
            color: #047857;
            margin-top: 4px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 12px;
          }
          .kpi-card {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 6px;
            padding: 7px;
            text-align: center;
          }
          .kpi-label {
            font-size: 8px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .kpi-val {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
          }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            color: #0f172a;
            margin: 12px 0 5px 0;
            text-transform: uppercase;
            border-left: 3px solid #059669;
            padding-left: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            margin-bottom: 10px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 4px 5px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 7.5px;
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
            margin-top: 18px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 40%;
            text-align: center;
          }
          .sig-space {
            height: 45px;
          }
        </style>
      </head>
      <body>
        <!-- KOP Resmi Lembaga -->
        ${renderKopHeaderHtml(schoolIdentity, currentAcademicYear)}

        <div class="title-section">
          <h2 class="report-title">REKAPITULASI LAPORAN KEUANGAN PENERIMAAN MURID BARU (SPMB)</h2>
          <p class="report-subtitle">Tahun Ajaran ${currentAcademicYear} • Tanggal Cetak: ${printDateStr}</p>
          <div class="filter-badge-box">
            Periode: ${activeDateRangeLabel}
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Penerimaan Bersih Token</div>
            <div class="kpi-val text-emerald">Rp ${filteredMetrics.netToken.toLocaleString('id-ID')}</div>
            <div style="font-size: 7.5px; color: #64748b;">${filteredMetrics.tokenPaidCount} Murid Bayar (${filteredMetrics.tokenRefundCount} Refund)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Penerimaan Daftar Ulang</div>
            <div class="kpi-val text-emerald">Rp ${filteredMetrics.reregRevenue.toLocaleString('id-ID')}</div>
            <div style="font-size: 7.5px; color: #64748b;">${filteredMetrics.reregPaidCount} Murid Lunas DU</div>
          </div>
          <div class="kpi-card" style="background: #ecfdf5; border-color: #a7f3d0;">
            <div class="kpi-label" style="color: #065f46;">TOTAL KAS BERSIH MASUK</div>
            <div class="kpi-val text-emerald" style="font-size: 13px;">Rp ${filteredMetrics.totalNetKas.toLocaleString('id-ID')}</div>
            <div style="font-size: 7.5px; color: #047857;">Total Realisasi Kas SPMB</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Piutang / Belum Daftar Ulang</div>
            <div class="kpi-val text-amber">Rp ${filteredMetrics.totalPendingReReg.toLocaleString('id-ID')}</div>
            <div style="font-size: 7.5px; color: #64748b;">${filteredMetrics.pendingReRegCount} Murid Belum DU</div>
          </div>
        </div>

        <!-- 1. Rincian Komponen Biaya Daftar Ulang -->
        <div class="section-title">I. Rincian Realisasi Komponen Biaya Daftar Ulang & Seragam</div>
        <table>
          <thead>
            <tr>
              <th>Komponen Biaya Daftar Ulang</th>
              <th class="text-right">Realisasi Pemasukan (Rp)</th>
              <th>Keterangan Alokasi Dana</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold">1. Infaq Gedung & Sarana Prasarana</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${filteredMetrics.filteredBuildingNet.toLocaleString('id-ID')}</td>
              <td>Pengembangan gedung & fasilitas sekolah (setelah potongan gelombang/afiliasi)</td>
            </tr>
            <tr>
              <td class="font-bold">2. Paket Seragam Sekolah Lengkap</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${filteredMetrics.filteredUniformNet.toLocaleString('id-ID')}</td>
              <td>Pengadaan bahan seragam, atribut, jilbab/songkok, dan kaos olahraga</td>
            </tr>
            <tr>
              <td class="font-bold">3. SPP Bulan Pertama (Juli)</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${filteredMetrics.filteredJulySpp.toLocaleString('id-ID')}</td>
              <td>Iuran bulanan awal tahun ajaran baru (gratis jika sibling KK match Inden)</td>
            </tr>
            ${filteredMetrics.filteredBaseFee > 0 ? `
            <tr>
              <td class="font-bold">4. Administrasi Daftar Ulang</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${filteredMetrics.filteredBaseFee.toLocaleString('id-ID')}</td>
              <td>Biaya administrasi operasional pendaftaran ulang</td>
            </tr>` : ''}
            <tr class="bg-total">
              <td>TOTAL PENERIMAAN DAFTAR ULANG</td>
              <td class="text-right font-mono text-emerald" style="font-size: 10px;">Rp ${filteredMetrics.reregRevenue.toLocaleString('id-ID')}</td>
              <td>Total dari ${filteredMetrics.reregPaidCount} calon murid lunas daftar ulang</td>
            </tr>
            <tr>
              <td style="color: #64748b;">* Total Keringanan / Diskon Diberikan</td>
              <td class="text-right font-mono text-amber">Rp ${filteredMetrics.filteredDiscounts.toLocaleString('id-ID')}</td>
              <td style="color: #64748b;">Beasiswa gelombang, potongan alumni SD Ma'arif, bonus seragam</td>
            </tr>
          </tbody>
        </table>

        <!-- 2. Ringkasan per Gelombang / Sesi -->
        <div class="section-title">II. Rekapitulasi Penerimaan per Gelombang / Sesi</div>
        <table>
          <thead>
            <tr>
              <th>Gelombang / Sesi</th>
              <th class="text-center">Siswa Token</th>
              <th class="text-right">Token Masuk (Rp)</th>
              <th class="text-right">Refund Tunai (Rp)</th>
              <th class="text-right">Net Token (Rp)</th>
              <th class="text-center">Siswa Lunas DU</th>
              <th class="text-right">Daftar Ulang (Rp)</th>
              <th class="text-right">Total Net Kas (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(filteredMetrics.sessionStats).map(key => {
              const s = filteredMetrics.sessionStats[key];
              const netTok = s.tokenGross - s.tokenRefund;
              return `
                <tr>
                  <td class="font-bold">${s.name}</td>
                  <td class="text-center">${s.tokenPaidCount}</td>
                  <td class="text-right font-mono">Rp ${s.tokenGross.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono text-rose">${s.tokenRefund > 0 ? `- Rp ${s.tokenRefund.toLocaleString('id-ID')}` : 'Rp 0'}</td>
                  <td class="text-right font-mono font-bold">Rp ${netTok.toLocaleString('id-ID')}</td>
                  <td class="text-center">${s.reregPaidCount}</td>
                  <td class="text-right font-mono">Rp ${s.reregRevenue.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono font-bold text-emerald">Rp ${s.totalNet.toLocaleString('id-ID')}</td>
                </tr>
              `;
            }).join('')}
            <tr class="bg-total">
              <td>TOTAL</td>
              <td class="text-center">${filteredMetrics.tokenPaidCount}</td>
              <td class="text-right font-mono">Rp ${filteredMetrics.grossToken.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono text-rose">${filteredMetrics.tokenRefund > 0 ? `- Rp ${filteredMetrics.tokenRefund.toLocaleString('id-ID')}` : 'Rp 0'}</td>
              <td class="text-right font-mono font-bold">Rp ${filteredMetrics.netToken.toLocaleString('id-ID')}</td>
              <td class="text-center">${filteredMetrics.reregPaidCount}</td>
              <td class="text-right font-mono">Rp ${filteredMetrics.reregRevenue.toLocaleString('id-ID')}</td>
              <td class="text-right font-mono font-bold text-emerald">Rp ${filteredMetrics.totalNetKas.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Rincian Riwayat Transaksi -->
        <div class="section-title">III. Rincian Riwayat Transaksi (${filteredTransactions.length} Transaksi)</div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 22px;">No</th>
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
            ${filteredTransactions.length === 0 ? `
              <tr>
                <td colspan="9" class="text-center" style="padding: 12px; color: #64748b;">
                  Tidak ada transaksi pada periode filter yang dipilih.
                </td>
              </tr>
            ` : filteredTransactions.map((tx, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="font-mono">${tx.date}</td>
                <td class="font-mono text-center" style="font-size: 7px;">${tx.orderId}</td>
                <td><strong>${tx.candidateName}</strong> <span style="font-size: 7px; color: #64748b;">(${tx.nisn})</span></td>
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
            <p>Pandaan, ${printDateStr}<br /><strong>Bendahara / Panitia SPMB</strong></p>
            <div class="sig-space"></div>
            <p style="font-weight: 800; text-decoration: underline; margin: 0;">${treasurerName}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printHtmlSafely(printHtml);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Laporan Keuangan SPMB */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                Keuangan SPMB {currentAcademicYear}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/25 text-emerald-100 text-xs font-bold flex items-center gap-1">
                <Calendar size={12} />
                <span>{activeDateRangeLabel}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-100 text-xs font-semibold">
                {filteredTransactions.length} Transaksi Terpilih
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white m-0">
              Laporan Keuangan & Arus Kas SPMB {currentAcademicYear}
            </h2>
            <p className="text-xs text-emerald-100/90 m-0 max-w-3xl">
              Rekapitulasi penerimaan token formulir, pengembalian uang tunai jalur kolektif, pembayaran daftar ulang, dan infaq seragam secara real-time.
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
              className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
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
              Rp {filteredMetrics.grossToken.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              {filteredMetrics.tokenPaidCount} Transaksi Masuk
            </span>
          </div>

          {/* 2. Refund Cash Token */}
          <div className="p-3.5 rounded-2xl bg-rose-500/20 backdrop-blur-xs border border-rose-400/30">
            <span className="text-[11px] text-rose-200 block font-medium">Refund Cash Token</span>
            <span className="text-lg font-black text-rose-200 block mt-0.5">
              - Rp {filteredMetrics.tokenRefund.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-rose-200/80 mt-1 block">
              {filteredMetrics.tokenRefundCount} Transaksi Refund
            </span>
          </div>

          {/* 3. Token Bersih */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
            <span className="text-[11px] text-emerald-100 block font-medium">Net Penerimaan Token</span>
            <span className="text-lg font-black text-emerald-200 block mt-0.5">
              Rp {filteredMetrics.netToken.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              Setelah Refund Kolektif
            </span>
          </div>

          {/* 4. Daftar Ulang Masuk */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
            <span className="text-[11px] text-emerald-100 block font-medium">Daftar Ulang & Seragam</span>
            <span className="text-lg font-black text-white block mt-0.5">
              Rp {filteredMetrics.reregRevenue.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              {filteredMetrics.reregPaidCount} Murid Lunas DU
            </span>
          </div>

          {/* 5. Total Kas Bersih */}
          <div className="p-3.5 rounded-2xl bg-emerald-400 text-slate-950 shadow-md">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Total Kas Bersih Real</span>
            <span className="text-lg font-black text-slate-950 block mt-0.5">
              Rp {filteredMetrics.totalNetKas.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-800 font-bold mt-1 block">
              Pemasukan Kas SPMB
            </span>
          </div>

          {/* 6. Estimasi Piutang */}
          <div className="p-3.5 rounded-2xl bg-amber-500/25 backdrop-blur-xs border border-amber-300/40">
            <span className="text-[11px] text-amber-200 block font-medium">Potensi Piutang DU</span>
            <span className="text-lg font-black text-amber-200 block mt-0.5">
              Rp {filteredMetrics.totalPendingReReg.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-amber-200/80 mt-1 block">
              {filteredMetrics.pendingReRegCount} Murid Belum DU
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigasi Tab: Arus Kas, Rincian Daftar Ulang, Piutang DU, Komparasi */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <CreditCard size={15} />
          <span>1. Arus Kas & Riwayat Transaksi ({filteredTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rereg_breakdown')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'rereg_breakdown'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Shirt size={15} />
          <span>2. Rincian Komponen Daftar Ulang ({filteredMetrics.reregPaidCount} Lunas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending_rereg')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'pending_rereg'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Clock size={15} />
          <span>3. Monitoring Piutang DU ({filteredMetrics.pendingReRegCount} Belum Lunas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <PieChart size={15} />
          <span>4. Komparasi Gelombang & Asal SD</span>
        </button>
      </div>

      {/* 3. Filter Bar Terpadu (Date Range, Presets, Search, Type, Session, Origin) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-emerald-700" />
            <h3 className="text-sm font-black text-slate-900 m-0 uppercase tracking-wider">
              Filter Laporan & Rentang Tanggal
            </h3>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw size={13} />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        {/* Date Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <CalendarDays size={14} className="text-emerald-600" />
            <span>Pilihan Cepat:</span>
          </span>
          {[
            { key: 'all', label: 'Semua Waktu' },
            { key: 'today', label: 'Hari Ini' },
            { key: 'yesterday', label: 'Kemarin' },
            { key: 'this_week', label: '7 Hari Terakhir' },
            { key: 'this_month', label: 'Bulan Ini' },
            { key: 'last_month', label: 'Bulan Lalu' },
            { key: 'this_year', label: 'Tahun Ini' }
          ].map(btn => (
            <button
              key={btn.key}
              type="button"
              onClick={() => handleSelectPreset(btn.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === btn.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Tanggal Mulai */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Jenis Transaksi */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Jenis Pembayaran
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:bg-white"
            >
              <option value="all">Semua Jenis Transaksi</option>
              <option value="token">Token Formulir Online</option>
              <option value="rereg">Daftar Ulang & Seragam</option>
              <option value="refund">Refund Cash Token Kolektif</option>
            </select>
          </div>

          {/* Sesi / Gelombang */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Gelombang / Sesi
            </label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              <option value="all">Semua Gelombang</option>
              {config?.sessions?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              {!config?.sessions?.some(s => s.id === 'inden') && <option value="inden">Jalur Inden</option>}
              {!config?.sessions?.some(s => s.id === 'gelombang-1') && <option value="gelombang-1">Gelombang 1</option>}
              {!config?.sessions?.some(s => s.id === 'gelombang-2') && <option value="gelombang-2">Gelombang 2</option>}
            </select>
          </div>

          {/* Asal Sekolah */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Asal Sekolah
            </label>
            <select
              value={filterSchoolOrigin}
              onChange={(e) => setFilterSchoolOrigin(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              <option value="all">Semua Asal SD</option>
              <option value="maarif">SD Ma'arif Jogosari (Afiliasi)</option>
              <option value="other">SD Umum / Negeri / Luar</option>
            </select>
          </div>

          {/* Pencarian Teks */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pencarian Calon Siswa
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama / NISN / Order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. TAB CONTENT 1: OVERVIEW & RIWAYAT TRANSAKSI */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-600" />
              <h3 className="text-base font-black text-slate-900 m-0">
                Riwayat Transaksi Keuangan SPMB ({filteredTransactions.length} Transaksi)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Periode: <strong className="text-slate-800">{activeDateRangeLabel}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Order ID / Kuitansi</th>
                  <th className="py-3 px-3">Calon Siswa</th>
                  <th className="py-3 px-3">Asal Sekolah</th>
                  <th className="py-3 px-3">Jenis Pembayaran</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                      Tidak ada transaksi keuangan pada rentang tanggal atau filter yang dipilih.
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
                        {tx.reregBreakdown && (
                          <span className="block text-[9px] text-slate-500 mt-0.5 font-mono">
                            Uk. {tx.reregBreakdown.uniformSize}
                          </span>
                        )}
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
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                            title="Cetak Kuitansi Pengembalian Tunai"
                          >
                            <Printer size={11} />
                            <span>Kuitansi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenReceiptModal?.(tx.candidate, tx.type === 'rereg' ? 'rereg' : 'token')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
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
      )}

      {/* 5. TAB CONTENT 2: RINCIAN KOMPONEN DAFTAR ULANG (GEDUNG, SPP, SERAGAM, DISKON) */}
      {activeTab === 'rereg_breakdown' && (
        <div className="space-y-5">
          {/* Summary Cards for Re-Registration Components */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Uang Gedung Net */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                <Building size={16} />
                <span>Infaq Gedung (Net)</span>
              </div>
              <strong className="text-lg font-black text-slate-900 block font-mono">
                Rp {filteredMetrics.filteredBuildingNet.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500 block">Pengembangan Sarpras</span>
            </div>

            {/* 2. Seragam Net */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-cyan-700 font-bold text-xs">
                <Shirt size={16} />
                <span>Paket Seragam (Net)</span>
              </div>
              <strong className="text-lg font-black text-slate-900 block font-mono">
                Rp {filteredMetrics.filteredUniformNet.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500 block">Pengadaan Seragam Murid</span>
            </div>

            {/* 3. SPP Juli */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                <BookOpen size={16} />
                <span>SPP Bulan Juli</span>
              </div>
              <strong className="text-lg font-black text-slate-900 block font-mono">
                Rp {filteredMetrics.filteredJulySpp.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500 block">Bulan Pertama Masuk</span>
            </div>

            {/* 4. Total Diskon */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                <Tag size={16} />
                <span>Keringanan / Diskon</span>
              </div>
              <strong className="text-lg font-black text-amber-600 block font-mono">
                - Rp {filteredMetrics.filteredDiscounts.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500 block">Beasiswa & Keringanan</span>
            </div>

            {/* 5. Total Daftar Ulang Real */}
            <div className="bg-emerald-600 text-white rounded-2xl p-4 space-y-1 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-emerald-100 font-bold text-xs">
                <DollarSign size={16} />
                <span>Total DU Masuk Real</span>
              </div>
              <strong className="text-lg font-black text-white block font-mono">
                Rp {filteredMetrics.reregRevenue.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-emerald-100 block">{filteredMetrics.reregPaidCount} Murid Lunas</span>
            </div>
          </div>

          {/* Rekap Ukuran Seragam */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Shirt size={16} className="text-cyan-600" />
                <span>Rekapitulasi Kebutuhan Ukuran Seragam Murid Lunas DU</span>
              </div>
              <span className="text-xs text-slate-500 font-bold">Total: {filteredMetrics.reregPaidCount} Stel</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {Object.entries(totalReRegStats.uniformSizeCounts).map(([size, count]) => (
                <div key={size} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase">Ukuran {size}</span>
                  <strong className="text-base font-black text-slate-900 block font-mono mt-0.5">{count} Siswa</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Tabel Rincian Per Siswa Lunas DU */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 m-0 uppercase tracking-wider">
                  Daftar Calon Murid Lunas Daftar Ulang ({filteredReregPaidList.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Total Masuk: <strong className="text-emerald-700 font-mono">Rp {filteredMetrics.reregRevenue.toLocaleString('id-ID')}</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3">Tgl Bayar</th>
                    <th className="py-3 px-3">Nama Calon Siswa (NISN)</th>
                    <th className="py-3 px-3">Asal Sekolah</th>
                    <th className="py-3 px-3">Gelombang</th>
                    <th className="py-3 px-3 text-center">Uk. Seragam</th>
                    <th className="py-3 px-3 text-right">Infaq Gedung</th>
                    <th className="py-3 px-3 text-right">SPP Juli</th>
                    <th className="py-3 px-3 text-right">Seragam</th>
                    <th className="py-3 px-3 text-right">Diskon</th>
                    <th className="py-3 px-3 text-right">Total Lunas DU</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {filteredReregPaidList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada siswa yang lunas daftar ulang pada filter tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    filteredReregPaidList.map((item, idx) => (
                      <tr key={item.candidate.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">{item.date}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 m-0">{item.candidate.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono m-0">NISN: {item.candidate.nisn}</p>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">{item.candidate.schoolOrigin || '-'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                            {item.sessionName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 text-[10px] font-black uppercase font-mono">
                            {item.uniformSize}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-800">
                          Rp {item.netBuildingFee.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-800">
                          {item.isSiblingFreeSpp ? (
                            <span className="text-emerald-700 font-bold">Rp 0 (Gratis)</span>
                          ) : (
                            `Rp ${item.julySppFee.toLocaleString('id-ID')}`
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-800">
                          Rp {item.netUniformTotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-amber-600">
                          {item.totalDiscount > 0 ? `- Rp ${item.totalDiscount.toLocaleString('id-ID')}` : 'Rp 0'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs text-emerald-700">
                          Rp {item.grandTotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenReceiptModal?.(item.candidate, 'rereg')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                            title="Cetak Kuitansi Daftar Ulang Resmi"
                          >
                            <Printer size={11} />
                            <span>Kuitansi</span>
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

      {/* 6. TAB CONTENT 3: MONITORING PIUTANG / BELUM DAFTAR ULANG */}
      {activeTab === 'pending_rereg' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-600" />
                <h3 className="text-base font-black text-slate-900 m-0">
                  Monitoring Siswa Belum Lunas Daftar Ulang (Piutang)
                </h3>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Daftar seluruh calon murid yang telah membayar token pendaftaran / terdaftar resmi, namun belum melunasi biaya daftar ulang.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-right shrink-0">
              <span className="text-[10px] text-amber-800 block font-bold uppercase">Total Potensi Piutang</span>
              <strong className="text-base font-black text-amber-700 font-mono">
                Rp {filteredMetrics.totalPendingReReg.toLocaleString('id-ID')}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-3">Tgl Daftar</th>
                  <th className="py-3 px-3">Calon Siswa</th>
                  <th className="py-3 px-3">No. Kontak / WA Ortu</th>
                  <th className="py-3 px-3">Asal Sekolah</th>
                  <th className="py-3 px-3">Gelombang</th>
                  <th className="py-3 px-3 text-right">Infaq Gedung</th>
                  <th className="py-3 px-3 text-right">Seragam</th>
                  <th className="py-3 px-3 text-right">SPP Juli</th>
                  <th className="py-3 px-3 text-right">Estimasi Tagihan DU</th>
                  <th className="py-3 px-3 text-center">Status Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {pendingReRegList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400 text-xs">
                      Semua calon murid yang terdaftar telah melunasi biaya daftar ulang.
                    </td>
                  </tr>
                ) : (
                  pendingReRegList.map((item, idx) => {
                    const phone = item.candidate.parentPhone || item.candidate.phone || item.candidate.guardianPhone || '';
                    const cleanPhone = phone.replace(/[^0-9]/g, '');
                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=Assalamu%27alaikum%2C%20mengingatkan%20Bapak%2FIbu%20dari%20ananda%20${encodeURIComponent(item.candidate.fullName)}%20untuk%20pelaksanaan%20daftar%20ulang%20SPMB%20SMP%20Ma%27arif%20NU%20Pandaan.` : '';

                    return (
                      <tr key={item.candidate.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">{item.registeredDate}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 m-0">{item.candidate.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono m-0">NISN: {item.candidate.nisn}</p>
                        </td>
                        <td className="py-3 px-3">
                          {phone ? (
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 text-[11px]">
                              <span>{phone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                                  title="Kirim pesan WhatsApp pengingat daftar ulang"
                                >
                                  <MessageCircle size={12} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Tidak ada nomor</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">{item.candidate.schoolOrigin || '-'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                            {item.sessionName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-800">
                          Rp {item.estimatedBuildingFee.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-800">
                          Rp {item.estimatedUniform.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-800">
                          Rp {item.estimatedJulySpp.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs text-amber-700">
                          Rp {item.estimatedGrandTotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.candidate.documentsUploaded ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Berkas Siap
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                              Belum Lengkap
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 4: ANALYTICS & KOMPARASI */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Box Penerimaan Per Gelombang */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Calendar size={18} className="text-emerald-600" />
                <span>Penerimaan Kas per Gelombang / Sesi</span>
              </div>
              <span className="text-xs text-emerald-700 font-bold">
                {activeDateRangeLabel}
              </span>
            </div>

            <div className="space-y-3">
              {Object.keys(filteredMetrics.sessionStats).map(key => {
                const s = filteredMetrics.sessionStats[key];
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
              <span className="text-xs text-indigo-700 font-bold">
                {activeDateRangeLabel}
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
                    Rp {filteredMetrics.maarifNetRevenue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">Token Kotor</span>
                    <strong className="text-slate-900 font-mono">Rp {filteredMetrics.maarifGrossToken.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-rose-600 block">Refund Tunai</span>
                    <strong className="text-rose-600 font-mono">- Rp {filteredMetrics.maarifTokenRefund.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 block">Daftar Ulang</span>
                    <strong className="text-emerald-800 font-mono">Rp {filteredMetrics.maarifReRegRevenue.toLocaleString('id-ID')}</strong>
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
                    Rp {filteredMetrics.otherNetRevenue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-indigo-200">
                    <span className="text-[10px] text-slate-500 block">Token Kotor</span>
                    <strong className="text-slate-900 font-mono">Rp {filteredMetrics.otherGrossToken.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-200">
                    <span className="text-[10px] text-rose-600 block">Refund Tunai</span>
                    <strong className="text-rose-600 font-mono">- Rp {filteredMetrics.otherTokenRefund.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-200">
                    <span className="text-[10px] text-indigo-700 block">Daftar Ulang</span>
                    <strong className="text-indigo-800 font-mono">Rp {filteredMetrics.otherReRegRevenue.toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
