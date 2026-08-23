import React, { useState, useEffect } from 'react';
import { 
  SpmbConfig, 
  SpmbCandidate, 
  SpmbSession, 
  SpmbUniformItem, 
  SchoolIdentity 
} from '../types';
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Users, 
  Sparkles, 
  CreditCard, 
  FileText, 
  Upload, 
  Search, 
  Check, 
  AlertCircle, 
  Printer, 
  Phone, 
  User, 
  Eye, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Shirt, 
  Award,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Download,
  CheckSquare,
  UserCheck,
  Building2,
  Coins,
  Percent,
  Receipt,
  Banknote,
  RotateCcw,
  BadgePercent,
  Undo2,
  ArrowLeftRight
} from 'lucide-react';

interface AdminSpmbManagementProps {
  schoolIdentity?: SchoolIdentity;
  onOpenPublicLandingPage?: () => void;
  onRefresh?: () => void;
}

export default function AdminSpmbManagement({
  schoolIdentity,
  onOpenPublicLandingPage,
  onRefresh
}: AdminSpmbManagementProps) {
  const [config, setConfig] = useState<SpmbConfig | null>(null);
  const [candidates, setCandidates] = useState<SpmbCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'candidates' | 'settings' | 'uniforms' | 'sessions'>('candidates');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterCollective, setFilterCollective] = useState<string>('all');
  const [filterTransfer, setFilterTransfer] = useState<'all' | 'transferred' | 'normal'>('all');

  // Auto-Transfer & Revert State
  const [isProcessingAutoTransfer, setIsProcessingAutoTransfer] = useState<boolean>(false);
  const [autoTransferMsg, setAutoTransferMsg] = useState<string | null>(null);
  const [isRevertingTransfer, setIsRevertingTransfer] = useState<boolean>(false);

  // Selected Candidate Modal
  const [selectedCandidate, setSelectedCandidate] = useState<SpmbCandidate | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateNote, setStatusUpdateNote] = useState<string>('');

  // Cash Refund Modal State (Jalur Kolektif)
  const [refundModalCandidate, setRefundModalCandidate] = useState<SpmbCandidate | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(50000);
  const [refundRecipient, setRefundRecipient] = useState<string>('');
  const [refundedBy, setRefundedBy] = useState<string>('Panitia SPMB');
  const [refundDate, setRefundDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [refundNote, setRefundNote] = useState<string>('Pengembalian tunai (cash) pendaftaran online jalur kolektif');
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);

  // Cash Refund Receipt Modal (Kuitansi Resmi Cetak)
  const [receiptCandidate, setReceiptCandidate] = useState<SpmbCandidate | null>(null);

  // Migration / Promotion to Grade 7 State
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationTargetClass, setMigrationTargetClass] = useState<string>('7-A');
  const [migrationSuccessMsg, setMigrationSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Load SPMB config & candidates
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [resConfig, resCandidates] = await Promise.all([
        fetch(`/api/spmb/config?_t=${Date.now()}`),
        fetch(`/api/spmb/candidates?_t=${Date.now()}`)
      ]);

      if (resConfig.ok) {
        const configData = await resConfig.json();
        setConfig(configData);
      }
      if (resCandidates.ok) {
        const candidatesData = await resCandidates.json();
        setCandidates(candidatesData);
      }
    } catch (e) {
      console.error('Failed to load SPMB data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Public SPMB Registration URL
  const publicRegistrationUrl = `${window.location.origin}/?view=spmb`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicRegistrationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Save SPMB Configuration
  const handleSaveConfig = async (newConfig: SpmbConfig) => {
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/spmb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated.config || updated);
        alert(`Pengaturan SPMB ${newConfig.academicYear || 'Tahun Ajaran'} berhasil disimpan!`);
      } else {
        alert('Gagal menyimpan pengaturan.');
      }
    } catch (e) {
      console.error('Error saving SPMB config:', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Toggle Candidate Collective Registration Status
  const handleToggleCollective = async (candidate: SpmbCandidate) => {
    const nextType = candidate.registrationType === 'school_collective' ? 'online_individual' : 'school_collective';
    const confirmMsg = nextType === 'school_collective'
      ? `Tandai calon murid ${candidate.fullName} sebagai JALUR KOLEKTIF SEKOLAH? Uang token yang sudah dibayar online dapat dikembalikan (cash refund) oleh panitia.`
      : `Ubah jalur pendaftaran calon murid ${candidate.fullName} menjadi MANDIRI ONLINE?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/spmb/candidate/${candidate.id}/toggle-collective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationType: nextType })
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => c.id === data.candidate.id ? data.candidate : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(data.candidate);
        }
      }
    } catch (e) {
      console.error('Failed to toggle collective status:', e);
    }
  };

  // Open Cash Refund Modal for a Candidate
  const handleOpenRefundModal = (candidate: SpmbCandidate) => {
    setRefundModalCandidate(candidate);
    setRefundAmount(candidate.tokenAmount || candidate.tokenFee || 50000);
    setRefundRecipient(candidate.parentName || candidate.fatherName || candidate.motherName || candidate.fullName);
    setRefundedBy('Panitia SPMB');
    setRefundDate(new Date().toISOString().slice(0, 10));
    setRefundNote(`Pengembalian cash pendaftaran kolektif dari ${candidate.schoolOrigin || 'sekolah'}`);
  };

  // Submit Cash Refund
  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalCandidate) return;

    try {
      setIsProcessingRefund(true);
      const res = await fetch(`/api/spmb/candidate/${refundModalCandidate.id}/process-collective-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundAmount,
          recipientName: refundRecipient,
          refundedBy,
          refundDate,
          note: refundNote
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCandidates(prev => prev.map(c => c.id === result.candidate.id ? result.candidate : c));
        if (selectedCandidate?.id === refundModalCandidate.id) {
          setSelectedCandidate(result.candidate);
        }
        const updatedCandidate = result.candidate;
        setRefundModalCandidate(null);
        // Automatically prompt to show printable receipt
        setReceiptCandidate(updatedCandidate);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memproses pengembalian uang cash.');
      }
    } catch (err) {
      console.error('Error processing refund:', err);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Cancel / Undo Cash Refund
  const handleCancelRefund = async (candidate: SpmbCandidate) => {
    if (!confirm(`Batalkan / reset status pengembalian uang cash untuk ${candidate.fullName}?`)) return;
    try {
      const res = await fetch(`/api/spmb/candidate/${candidate.id}/cancel-collective-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const result = await res.json();
        setCandidates(prev => prev.map(c => c.id === result.candidate.id ? result.candidate : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(result.candidate);
        }
      }
    } catch (e) {
      console.error('Error cancelling refund:', e);
    }
  };

  // Update Candidate Status (Accepted / Rejected / Verified)
  const handleUpdateCandidateStatus = async (status: SpmbCandidate['status']) => {
    if (!selectedCandidate) return;
    try {
      setIsUpdatingStatus(true);
      const res = await fetch('/api/spmb/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCandidate.id,
          status,
          verificationNotes: statusUpdateNote
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setCandidates(prev => prev.map(c => c.id === updated.candidate.id ? updated.candidate : c));
        setSelectedCandidate(updated.candidate);
        alert(`Status calon siswa berhasil diperbarui menjadi ${status.toUpperCase()}!`);
      }
    } catch (e) {
      console.error('Error updating candidate status:', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Promote Accepted Candidates to Active Grade 7 Students
  const handlePromoteToStudents = async () => {
    const acceptedCandidates = candidates.filter(c => c.status === 'accepted' && !c.isPromotedToStudent);
    if (acceptedCandidates.length === 0) {
      alert('Tidak ada calon murid dengan status DITERIMA yang belum dimigrasikan.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin memigrasikan ${acceptedCandidates.length} calon murid yang DITERIMA ke daftar Siswa Aktif Kelas ${migrationTargetClass}? Sistem akan otomatis membuat akun login dan NIS resmi.`)) {
      return;
    }

    try {
      setIsMigrating(true);
      setMigrationSuccessMsg(null);
      const res = await fetch('/api/spmb/promote-to-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: acceptedCandidates.map(c => c.id),
          defaultClass: migrationTargetClass
        })
      });

      if (res.ok) {
        const result = await res.json();
        setMigrationSuccessMsg(`Berhasil memigrasikan ${result.promotedCount || acceptedCandidates.length} siswa ke data siswa aktif kelas ${migrationTargetClass}!`);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memigrasikan data calon siswa.');
      }
    } catch (e) {
      console.error('Error promoting candidates:', e);
    } finally {
      setIsMigrating(false);
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Hapus data pendaftaran calon murid ${name}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/spmb/candidate/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCandidates(prev => prev.filter(c => c.id !== id));
        if (selectedCandidate?.id === id) setSelectedCandidate(null);
      }
    } catch (e) {
      console.error('Failed to delete candidate:', e);
    }
  };

  // Revert / Batalkan Pengalihan Jalur Calon Siswa (Kembalikan ke Jalur Sebelumnya)
  const handleRevertTransfer = async (candidate: SpmbCandidate) => {
    const targetSessionId = candidate.previousSessionId || candidate.originalSessionId;
    const targetSession = config?.sessions.find(s => s.id === targetSessionId);
    const targetName = targetSession?.name || targetSessionId || 'Jalur Sebelumnya';
    
    if (!confirm(`Batalkan pengalihan jalur untuk calon siswa "${candidate.fullName}" dan kembalikan ke ${targetName}?`)) {
      return;
    }

    try {
      setIsRevertingTransfer(true);
      const res = await fetch(`/api/spmb/candidate/${candidate.id}/revert-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorName: 'Panitia SPMB',
          note: `Pembatalan pengalihan jalur pendaftaran manual oleh Panitia SPMB.`
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCandidates(prev => prev.map(c => c.id === result.candidate.id ? result.candidate : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(result.candidate);
        }
        alert(result.message || `Berhasil mengembalikan calon siswa ke ${targetName}!`);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal membatalkan pengalihan jalur.');
      }
    } catch (e) {
      console.error('Error reverting transfer:', e);
      alert('Terjadi kesalahan saat membatalkan pengalihan jalur.');
    } finally {
      setIsRevertingTransfer(false);
    }
  };

  // Trigger Manual Auto-Transfer Process
  const handleProcessAutoTransfers = async () => {
    try {
      setIsProcessingAutoTransfer(true);
      setAutoTransferMsg(null);
      const res = await fetch('/api/spmb/process-auto-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const result = await res.json();
        setAutoTransferMsg(result.message);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memproses otomatisasi pengalihan jalur.');
      }
    } catch (e) {
      console.error('Error processing auto transfers:', e);
    } finally {
      setIsProcessingAutoTransfer(false);
    }
  };

  // Manual Session Change
  const handleChangeCandidateSession = async (candidate: SpmbCandidate, newSessionId: string) => {
    if (!newSessionId || newSessionId === candidate.sessionId) return;
    const targetSession = config?.sessions.find(s => s.id === newSessionId);
    const targetName = targetSession?.name || newSessionId;

    if (!confirm(`Pindahkan sesi pendaftaran "${candidate.fullName}" ke ${targetName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/spmb/candidate/${candidate.id}/change-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSessionId,
          operatorName: 'Panitia SPMB',
          reason: `Pemindahan sesi manual ke ${targetName} oleh Panitia SPMB`
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCandidates(prev => prev.map(c => c.id === result.candidate.id ? result.candidate : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(result.candidate);
        }
        alert(result.message || `Sesi berhasil dipindahkan ke ${targetName}!`);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memindahkan sesi.');
      }
    } catch (e) {
      console.error('Error changing session:', e);
    }
  };

  // Filtered Candidates List
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nisn.includes(searchQuery) ||
      (c.schoolOrigin && c.schoolOrigin.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSession = filterSession === 'all' || c.sessionId === filterSession;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesGender = filterGender === 'all' || c.gender === filterGender;

    let matchesCollective = true;
    if (filterCollective === 'online_individual') {
      matchesCollective = c.registrationType !== 'school_collective';
    } else if (filterCollective === 'school_collective') {
      matchesCollective = c.registrationType === 'school_collective';
    } else if (filterCollective === 'needs_refund') {
      matchesCollective = c.registrationType === 'school_collective' && c.collectiveRefundStatus !== 'refunded';
    } else if (filterCollective === 'refunded') {
      matchesCollective = c.collectiveRefundStatus === 'refunded';
    }

    let matchesTransfer = true;
    if (filterTransfer === 'transferred') {
      matchesTransfer = !!c.isTransferredSession;
    } else if (filterTransfer === 'normal') {
      matchesTransfer = !c.isTransferredSession;
    }

    return matchesSearch && matchesSession && matchesStatus && matchesGender && matchesCollective && matchesTransfer;
  });

  // Calculate Statistics
  const totalRegistered = candidates.length;
  const tokenPaidCount = candidates.filter(c => c.tokenPaymentStatus === 'paid' || c.tokenPaid).length;
  const collectiveCount = candidates.filter(c => c.registrationType === 'school_collective').length;
  const needRefundCount = candidates.filter(c => c.registrationType === 'school_collective' && (c.tokenPaymentStatus === 'paid' || c.tokenPaid) && c.collectiveRefundStatus !== 'refunded').length;
  const refundedCashCount = candidates.filter(c => c.collectiveRefundStatus === 'refunded').length;
  const transferredCount = candidates.filter(c => c.isTransferredSession).length;
  const formCompletedCount = candidates.filter(c => c.isFormCompleted).length;
  const reRegPaidCount = candidates.filter(c => c.reRegistrationStatus === 'paid').length;
  const acceptedCount = candidates.filter(c => c.status === 'accepted').length;
  const promotedCount = candidates.filter(c => c.isPromotedToStudent).length;

  const currentAcademicYear = config?.academicYear || '2027/2028';

  return (
    <div className="space-y-6">
      {/* Header Banner & Public Link Share */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-800 to-indigo-900/40 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase">
                SPMB {currentAcademicYear}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                {candidates.length} Calon Terdaftar
              </span>
              {needRefundCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
                  ⚠️ {needRefundCount} Perlu Refund Token Cash
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white m-0">
              Penerimaan Murid Baru (SPMB) {currentAcademicYear}
            </h2>
            <p className="text-xs text-slate-300 m-0">
              Kelola sesi pendaftaran, penetapan jalur kolektif & pengembalian token tunai, verifikasi buku induk, hingga migrasi ke rombel kelas 7.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-sm"
              title="Salin tautan formulir SPMB"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Link Formulir'}</span>
            </button>

            {onOpenPublicLandingPage && (
              <button
                type="button"
                onClick={onOpenPublicLandingPage}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Buka Portal SPMB</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400 block">Total Pendaftar</span>
            <span className="text-xl font-black text-white">{totalRegistered}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-center">
            <span className="text-[11px] text-emerald-400 block">Token Online Lunas</span>
            <span className="text-xl font-black text-emerald-400">{tokenPaidCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-center">
            <span className="text-[11px] text-indigo-400 block">Jalur Kolektif</span>
            <span className="text-xl font-black text-indigo-400">{collectiveCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center">
            <span className="text-[11px] text-amber-300 font-bold block">Perlu Refund Cash</span>
            <span className="text-xl font-black text-amber-400">{needRefundCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-center">
            <span className="text-[11px] text-blue-400 block">Buku Induk Lengkap</span>
            <span className="text-xl font-black text-blue-400">{formCompletedCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-center">
            <span className="text-[11px] text-emerald-300 block">Daftar Ulang Lunas</span>
            <span className="text-xl font-black text-emerald-300">{reRegPaidCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center" title="Calon siswa yang dialihkan ke jalur berikutnya karena melewati batas akhir daftar ulang">
            <span className="text-[11px] text-rose-300 font-bold block">Dialihkan Jalur</span>
            <span className="text-xl font-black text-rose-400">{transferredCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-center">
            <span className="text-[11px] text-cyan-400 block">Migrasi Kelas 7</span>
            <span className="text-xl font-black text-cyan-400">{promotedCount}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'candidates'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users size={14} />
          <span>Daftar Calon Murid ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar size={14} />
          <span>Sesi Pendaftaran & Gelombang</span>
        </button>

        <button
          onClick={() => setActiveTab('uniforms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'uniforms'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Coins size={14} />
          <span>Setting Biaya & Tahun Ajaran SPMB</span>
        </button>
      </div>

      {/* ================= TAB 1: DAFTAR CALON MURID ================= */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="p-4 rounded-3xl bg-slate-850 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-grow">
              <div className="relative flex-grow max-w-xs">
                <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama, NISN, Asal SD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Status Pengalihan Jalur */}
              <select
                value={filterTransfer}
                onChange={(e) => setFilterTransfer(e.target.value as any)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
              >
                <option value="all">Semua Status Pengalihan Jalur</option>
                <option value="transferred">⚠️ Calon Dialihkan Jalur ({transferredCount})</option>
                <option value="normal">Jalur Pendaftaran Asli/Normal</option>
              </select>

              {/* Filter Jalur Pendaftaran & Status Refund */}
              <select
                value={filterCollective}
                onChange={(e) => setFilterCollective(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
              >
                <option value="all">Semua Jalur (Mandiri & Kolektif)</option>
                <option value="school_collective">Hanya Jalur Kolektif</option>
                <option value="needs_refund">⚠️ Kolektif Perlu Refund Cash ({needRefundCount})</option>
                <option value="refunded">✅ Kolektif Sudah Refund Cash ({refundedCashCount})</option>
                <option value="online_individual">Hanya Jalur Mandiri</option>
              </select>

              {/* Sesi Filter */}
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300"
              >
                <option value="all">Semua Sesi</option>
                <option value="inden">Jalur Inden</option>
                <option value="gelombang-1">Gelombang 1</option>
                <option value="gelombang-2">Gelombang 2</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300"
              >
                <option value="all">Semua Status</option>
                <option value="accepted">Diterima</option>
                <option value="re_registered">Daftar Ulang Lunas</option>
                <option value="form_submitted">Formulir Lengkap</option>
                <option value="registered">Token Lunas</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Trigger Auto Transfer */}
              <button
                type="button"
                onClick={handleProcessAutoTransfers}
                disabled={isProcessingAutoTransfer}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Cek calon siswa yang belum melunasi daftar ulang sampai batas akhir dan alihkan ke gelombang berikutnya"
              >
                <ArrowLeftRight size={14} className={isProcessingAutoTransfer ? 'animate-spin' : ''} />
                <span>{isProcessingAutoTransfer ? 'Memproses...' : 'Proses Pengalihan Jalur'}</span>
              </button>

              {/* Promote to Grade 7 Button */}
              <select
                value={migrationTargetClass}
                onChange={(e) => setMigrationTargetClass(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
                title="Pilih Kelas Tujuan untuk Siswa yang Diterima"
              >
                <option value="7-A">Target Kelas: 7-A</option>
                <option value="7-B">Target Kelas: 7-B</option>
                <option value="7-C">Target Kelas: 7-C</option>
                <option value="7-D">Target Kelas: 7-D</option>
              </select>

              <button
                type="button"
                onClick={handlePromoteToStudents}
                disabled={isMigrating}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
              >
                {isMigrating ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
                <span>Migrasi ke Kelas 7</span>
              </button>
            </div>
          </div>

          {/* Auto Transfer Notification Message */}
          {autoTransferMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight size={16} className="text-amber-400 shrink-0" />
                <span className="font-bold">{autoTransferMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoTransferMsg(null)}
                className="text-amber-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Info Banner Alur Kolektif & Refund */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-start gap-3">
            <Banknote size={20} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white m-0">Alur Pendaftaran & Pengembalian Uang Token Jalur Kolektif:</p>
              <p className="m-0 text-slate-300 text-[11px] mt-0.5">
                1. Calon murid tetap membayar token formulir (Rp 50.000) via online.<br />
                2. Admin menandai calon murid dengan status <strong>"Kolektif Sekolah"</strong>.<br />
                3. Admin mengembalikan uang token pendaftaran secara tunai (Cash Refund) dan mencetak kuitansi tanda terima resmi.
              </p>
            </div>
          </div>

          {migrationSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{migrationSuccessMsg}</span>
            </div>
          )}

          {/* Candidates Table */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Calon Siswa</th>
                    <th className="py-3.5 px-4">NISN / Asal Sekolah</th>
                    <th className="py-3.5 px-4">Jalur Pendaftaran</th>
                    <th className="py-3.5 px-4">Token Online & Refund Cash</th>
                    <th className="py-3.5 px-4">Daftar Ulang</th>
                    <th className="py-3.5 px-4">Status Penerimaan</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        Belum ada calon murid terdaftar yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const isCollective = candidate.registrationType === 'school_collective';
                      const isTokenPaid = candidate.tokenPaymentStatus === 'paid' || candidate.tokenPaid;
                      const isRefunded = candidate.collectiveRefundStatus === 'refunded';
                      const isMaarif = candidate.schoolOriginType === 'maarif_jogosari' || (candidate.schoolOrigin || '').toUpperCase().includes('MAARIF JOGOSARI');

                      return (
                        <tr key={candidate.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Nama Calon Siswa */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                                {candidate.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-white m-0">{candidate.fullName}</p>
                                <p className="text-[10px] text-slate-400 m-0">{candidate.phone || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* NISN & Asal Sekolah */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-white font-bold">{candidate.nisn}</span>
                            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {isMaarif ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                                  <Sparkles size={10} />
                                  <span>SD Maarif Jogosari</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">{candidate.schoolOrigin || 'SD Lainnya'}</span>
                              )}
                            </div>
                          </td>

                          {/* Jalur Pendaftaran & Sesi Gelombang */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              {/* Sesi Gelombang */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold uppercase">
                                  {candidate.sessionId === 'inden' ? 'Jalur Inden' : candidate.sessionId === 'gelombang-1' ? 'Gelombang 1' : candidate.sessionId === 'gelombang-2' ? 'Gelombang 2' : candidate.sessionId}
                                </span>

                                {isCollective ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black">
                                    <GraduationCap size={11} />
                                    <span>Kolektif</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                                    <span>Mandiri</span>
                                  </span>
                                )}
                              </div>

                              {/* Status Pengalihan Otomatis */}
                              {candidate.isTransferredSession && (
                                <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 space-y-1">
                                  <div className="flex items-center gap-1 text-[10px] text-rose-300 font-black">
                                    <ArrowLeftRight size={11} className="text-rose-400 shrink-0" />
                                    <span>Dialihkan dari {candidate.previousSessionId === 'inden' ? 'Jalur Inden' : candidate.previousSessionId === 'gelombang-1' ? 'Gelombang 1' : (candidate.previousSessionId || candidate.originalSessionId || 'Sesi Sebelumnya')}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRevertTransfer(candidate)}
                                    disabled={isRevertingTransfer}
                                    className="w-full px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] rounded flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
                                    title="Batalkan pengalihan dan kembalikan ke jalur pendaftaran sebelumnya"
                                  >
                                    <Undo2 size={10} />
                                    <span>Kembalikan ke Jalur Sebelumnya</span>
                                  </button>
                                </div>
                              )}

                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCollective(candidate)}
                                  className="text-[10px] text-slate-400 hover:text-indigo-300 underline cursor-pointer"
                                  title="Klik untuk mengubah jenis jalur"
                                >
                                  {isCollective ? 'Ubah ke Mandiri' : 'Tandai Kolektif'}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Token Online & Refund Cash */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              {/* Status Pembayaran Token Online */}
                              <div>
                                {isTokenPaid ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Online Lunas (Rp 50rb)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Belum Bayar Token
                                  </span>
                                )}
                              </div>

                              {/* Status & Aksi Pengembalian Token (Khusus Kolektif) */}
                              {isCollective && isTokenPaid && (
                                <div>
                                  {isRefunded ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                        <CheckCircle2 size={12} />
                                        <span>Cash Rp {(candidate.collectiveRefundAmount || 50000).toLocaleString('id-ID')} Dikembalikan</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setReceiptCandidate(candidate)}
                                          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
                                        >
                                          Cetak Kuitansi
                                        </button>
                                        <span className="text-slate-600">•</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelRefund(candidate)}
                                          className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRefundModal(candidate)}
                                      className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-[10px] rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                                      title="Kembalikan uang token pendaftaran Rp 50.000 secara tunai"
                                    >
                                      <Banknote size={12} />
                                      <span>Kembalikan Token (Cash)</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status Daftar Ulang */}
                          <td className="py-3.5 px-4">
                            {candidate.reRegistrationStatus === 'paid' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                LUNAS (Uk. {candidate.selectedUniformSize || 'L'})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Belum Lunas
                              </span>
                            )}
                          </td>

                          {/* Status Penerimaan */}
                          <td className="py-3.5 px-4">
                            {candidate.isPromotedToStudent ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Siswa Aktif ({candidate.assignedClass || '7-A'})
                              </span>
                            ) : candidate.status === 'accepted' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950 shadow-xs">
                                DITERIMA
                              </span>
                            ) : candidate.status === 'rejected' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                DITOLAK
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                Menunggu Verifikasi
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedCandidate(candidate)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Detail & Buku Induk"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCandidate(candidate.id, candidate.fullName)}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Data Calon Murid"
                              >
                                <Trash2 size={14} />
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

      {/* ================= TAB 2: PENGATURAN SESI PENDAFTARAN ================= */}
      {activeTab === 'sessions' && config && (
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calendar size={18} className="text-emerald-400" />
                <span>Pengaturan Sesi Pendaftaran SPMB {currentAcademicYear}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur status master buka/tutup pendaftaran, rentang tanggal, kuota rombel, dan <strong>Diskon Gelombang khusus Uang Gedung (%)</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSaveConfig(config)}
              disabled={isSavingConfig}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              {isSavingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Simpan Sesi</span>
            </button>
          </div>

          {/* MASTER STATUS BUKA / TUTUP PENDAFTARAN SPMB */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                config.isOpen !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {config.isOpen !== false ? <Check size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <strong className="text-sm font-bold text-white block">
                  Status Master Pendaftaran SPMB: {config.isOpen !== false ? '🟢 DIBUKA / AKTIF' : '🔴 DITUTUP / TIDAK AKTIF'}
                </strong>
                <span className="text-xs text-slate-400">
                  {config.isOpen !== false 
                    ? 'Formulir pendaftaran online dapat diakses dan menerima pendaftaran calon siswa baru.' 
                    : 'Pendaftaran ditutup total. Pengunjung akan melihat pesan bahwa pendaftaran belum dibuka/aktif.'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={config.isOpen !== false}
                onChange={(e) => setConfig({ ...config, isOpen: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* PENGALIHAN OTOMATIS JALUR / GELOMBANG KETIKA LEWAT BATAS AKHIR DAFTAR ULANG */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                config.autoTransferExpiredSessions !== false ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
              }`}>
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <strong className="text-sm font-bold text-white block">
                  Pengalihan Jalur Otomatis (Batas Akhir Daftar Ulang): {config.autoTransferExpiredSessions !== false ? '🟢 AKTIF' : '⚪ NONAKTIF'}
                </strong>
                <span className="text-xs text-slate-400">
                  Otomatis memindahkan calon siswa yang belum melunasi daftar ulang hingga tanggal batas akhir (endDate) ke gelombang selanjutnya. Panitia dapat membatalkan dan mengembalikan jalur calon murid kapan saja.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleProcessAutoTransfers}
                disabled={isProcessingAutoTransfer}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw size={13} className={isProcessingAutoTransfer ? 'animate-spin' : ''} />
                <span>Jalankan Cek Sekarang</span>
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoTransferExpiredSessions !== false}
                  onChange={(e) => setConfig({ ...config, autoTransferExpiredSessions: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
            <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Diskon Gelombang Khusus Uang Gedung (Infaq Pembangunan):</strong>
              <p className="mt-0.5 text-slate-300">
                Diskon gelombang dihitung dari nominal pokok Uang Gedung (Rp {(config.buildingFee || 1500000).toLocaleString('id-ID')}).
                Misalnya Jalur Inden (50%) = diskon Rp {Math.round((config.buildingFee || 1500000) * 0.5).toLocaleString('id-ID')}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {config.sessions.map((session, idx) => {
              const bFee = config.buildingFee || 1500000;
              const discPercent = typeof session.discountPercent === 'number' ? session.discountPercent : 0;
              const discNominal = Math.round(bFee * (discPercent / 100));
              const netGedung = Math.max(0, bFee - discNominal);

              return (
                <div key={session.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <strong className="text-sm font-bold text-white">{session.name}</strong>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={session.isActive}
                        onChange={(e) => {
                          const updated = config.sessions.map(s => s.id === session.id ? { ...s, isActive: e.target.checked } : s);
                          setConfig({ ...config, sessions: updated });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Tgl Mulai</label>
                      <input
                        type="date"
                        value={session.startDate}
                        onChange={(e) => {
                          const updated = config.sessions.map(s => s.id === session.id ? { ...s, startDate: e.target.value } : s);
                          setConfig({ ...config, sessions: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Tgl Selesai</label>
                      <input
                        type="date"
                        value={session.endDate}
                        onChange={(e) => {
                          const updated = config.sessions.map(s => s.id === session.id ? { ...s, endDate: e.target.value } : s);
                          setConfig({ ...config, sessions: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Kuota Siswa</label>
                      <input
                        type="number"
                        value={session.quota}
                        onChange={(e) => {
                          const updated = config.sessions.map(s => s.id === session.id ? { ...s, quota: Number(e.target.value) } : s);
                          setConfig({ ...config, sessions: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-400 mb-1">Diskon Uang Gedung (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={discPercent}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = config.sessions.map(s => s.id === session.id ? { 
                            ...s, 
                            discountPercent: val,
                            discountAmount: Math.round(bFee * (val / 100))
                          } : s);
                          setConfig({ ...config, sessions: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 font-bold font-mono"
                      />
                    </div>
                  </div>

                  {/* Simulasi Ringkasan Uang Gedung Net */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Uang Gedung Pokok:</span>
                      <span>Rp {bFee.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Diskon ({discPercent}%):</span>
                      <span>- Rp {discNominal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold border-t border-slate-800/80 pt-1">
                      <span>Net Uang Gedung:</span>
                      <span className="text-emerald-300">Rp {netGedung.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Keterangan / Deskripsi Sesi</label>
                    <textarea
                      rows={2}
                      value={session.description}
                      onChange={(e) => {
                        const updated = config.sessions.map(s => s.id === session.id ? { ...s, description: e.target.value } : s);
                        setConfig({ ...config, sessions: updated });
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: BIAYA UTAMA, TAHUN AJARAN & PERLENGKAPAN SERAGAM ================= */}
      {activeTab === 'uniforms' && config && (
        <div className="space-y-6">
          {/* 1. Pengaturan Komponen Biaya Pokok & Tahun Ajaran SPMB */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Building2 size={18} className="text-emerald-400" />
                  <span>Pengaturan Tahun Ajaran & Biaya Pokok SPMB</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur Tahun Ajaran SPMB aktif, nominal Uang Gedung, SPP Bulan Juli, dan Biaya Token Formulir Pendaftaran.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveConfig(config)}
                disabled={isSavingConfig}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
              >
                {isSavingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Simpan Semua Pengaturan Biaya</span>
              </button>
            </div>

            {/* SETTING TAHUN AJARAN SPMB */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border-2 border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <Calendar size={18} />
                  <span>Tahun Ajaran SPMB Aktif</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Pilihan Cepat:</span>
                  {['2026/2027', '2027/2028', '2028/2029', '2029/2030'].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setConfig({ ...config, academicYear: year })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        config.academicYear === year
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Format Tahun Ajaran SPMB (e.g. 2027/2028)
                  </label>
                  <input
                    type="text"
                    value={config.academicYear || '2027/2028'}
                    onChange={(e) => setConfig({ ...config, academicYear: e.target.value })}
                    placeholder="2027/2028"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold font-mono focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Tahun ajaran ini otomatis disinkronkan ke seluruh halaman portal SPMB, nomor registrasi calon siswa, kuitansi pendaftaran, hingga kuitansi pengembalian token cash.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Uang Gedung */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Building2 size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">1. Uang Gedung (Infaq)</span>
                </div>
                <p className="text-[10px] text-slate-400">Dasar perhitungan diskon gelombang dalam persen (%).</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={config.buildingFee || 1500000}
                    onChange={(e) => setConfig({ ...config, buildingFee: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold font-mono focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* SPP Bulan Juli */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Calendar size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">2. SPP Bulan Juli</span>
                </div>
                <p className="text-[10px] text-slate-400">SPP bulan pertama masuk tahun ajaran baru {config.academicYear || '2027/2028'}.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={config.julySppFee || 200000}
                    onChange={(e) => setConfig({ ...config, julySppFee: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold font-mono focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Biaya Token Pendaftaran */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <CreditCard size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">3. Token Formulir Online</span>
                </div>
                <p className="text-[10px] text-slate-400">Biaya verifikasi awal online via Midtrans (Rp 50.000).</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={config.registrationTokenFee || 50000}
                    onChange={(e) => setConfig({ ...config, registrationTokenFee: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold font-mono focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* PENGATURAN KHUSUS ASAL SD MAARIF JOGOSARI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              {/* Box Diskon SD Maarif Jogosari */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Sparkles size={18} />
                    <span>Diskon Khusus SD MAARIF JOGOSARI</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                    Otomatis Aktif
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama SD Maarif Afiliasi</label>
                    <input
                      type="text"
                      value={config.maarifSchoolName || 'SD MAARIF JOGOSARI'}
                      onChange={(e) => setConfig({ ...config, maarifSchoolName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Diskon Uang Gedung Maarif */}
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                      <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                        Diskon Uang Gedung
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={config.maarifBuildingDiscountType || 'amount'}
                          onChange={(e) => setConfig({ ...config, maarifBuildingDiscountType: e.target.value as any })}
                          className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                        >
                          <option value="amount">Nominal (Rp)</option>
                          <option value="percent">Persen (%)</option>
                        </select>
                        <input
                          type="number"
                          value={config.maarifBuildingDiscount ?? 250000}
                          onChange={(e) => setConfig({ ...config, maarifBuildingDiscount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {config.maarifBuildingDiscountType === 'percent'
                          ? `Potongan ${config.maarifBuildingDiscount || 0}% dari Uang Gedung`
                          : `Potongan tetap Rp ${(config.maarifBuildingDiscount || 0).toLocaleString('id-ID')}`}
                      </p>
                    </div>

                    {/* Diskon Seragam/Perlengkapan Maarif */}
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                      <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                        Diskon Seragam / Perlengkapan
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={config.maarifUniformDiscountType || 'amount'}
                          onChange={(e) => setConfig({ ...config, maarifUniformDiscountType: e.target.value as any })}
                          className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                        >
                          <option value="amount">Nominal (Rp)</option>
                          <option value="percent">Persen (%)</option>
                        </select>
                        <input
                          type="number"
                          value={config.maarifUniformDiscount ?? 100000}
                          onChange={(e) => setConfig({ ...config, maarifUniformDiscount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {config.maarifUniformDiscountType === 'percent'
                          ? `Potongan ${config.maarifUniformDiscount || 0}% dari Total Seragam`
                          : `Potongan tetap Rp ${(config.maarifUniformDiscount || 0).toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Informasi Kebijakan Jalur Kolektif */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-black text-sm">
                    <GraduationCap size={18} />
                    <span>Ketentuan Jalur Kolektif Sekolah</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-500/30">
                    Sistem Refund Cash
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <p className="text-slate-200 text-xs font-bold leading-relaxed m-0">
                      Murid dari jalur kolektif sekolah tetap membayar token formulir awal via online (Midtrans).
                    </p>
                    <p className="text-[11px] text-slate-300 m-0">
                      Pada tabel calon murid di panel admin, panitia dapat mengklik tombol <strong>"Kembalikan Token (Cash)"</strong> untuk mengembalikan biaya token Rp 50.000 secara tunai serta mencetak tanda terima resmi ber-kop sekolah.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 text-[11px]">
                    ✓ Kuitansi pengembalian uang cash otomatis tersimpan dan dapat dicetak kapan saja.
                  </div>
                </div>
              </div>
            </div>

            {/* Simulasi Total Biaya Per Gender & Sesi */}
            <div className="pt-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3">
                Simulasi Rincian Daftar Ulang Siswa Baru ({currentAcademicYear})
              </h4>
              {(() => {
                const bFee = config.buildingFee || 1500000;
                const spp = config.julySppFee || 200000;
                const maleUniformTotal = config.uniformItems
                  .filter(u => u.gender === 'both' || u.gender === 'male' || u.gender === 'all')
                  .reduce((sum, i) => sum + i.price, 0);
                const femaleUniformTotal = config.uniformItems
                  .filter(u => u.gender === 'both' || u.gender === 'female' || u.gender === 'all')
                  .reduce((sum, i) => sum + i.price, 0);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {config.sessions.map((sess) => {
                      const discP = typeof sess.discountPercent === 'number' 
                        ? sess.discountPercent 
                        : (sess.discountAmount ? Math.round((sess.discountAmount / bFee) * 100) : 0);
                      const discNom = Math.round(bFee * (discP / 100));
                      const netG = Math.max(0, bFee - discNom);
                      const totalMale = netG + spp + maleUniformTotal;
                      const totalFemale = netG + spp + femaleUniformTotal;

                      return (
                        <div key={sess.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <strong className="text-emerald-400 font-black">{sess.name}</strong>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              Diskon Gedung: {discP}%
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] text-slate-400">
                            <div className="flex justify-between">
                              <span>Net Uang Gedung:</span>
                              <span className="text-white font-medium">Rp {netG.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SPP Bulan Juli:</span>
                              <span className="text-white font-medium">Rp {spp.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800/60 pt-1">
                              <span>Seragam Putra ({config.uniformItems.filter(u => u.gender === 'both' || u.gender === 'male').length} item):</span>
                              <span className="text-slate-300">Rp {maleUniformTotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-bold">
                              <span>Total Putra:</span>
                              <span>Rp {totalMale.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800/60 pt-1">
                              <span>Seragam Putri ({config.uniformItems.filter(u => u.gender === 'both' || u.gender === 'female').length} item):</span>
                              <span className="text-slate-300">Rp {femaleUniformTotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-pink-400 font-bold">
                              <span>Total Putri:</span>
                              <span>Rp {totalFemale.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 2. Pengaturan Biaya Perlengkapan & Seragam Sekolah */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Shirt size={18} className="text-emerald-400" />
                  <span>Pengaturan Item Perlengkapan & Seragam Sekolah</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Item seragam olahraga, bedge, hasduk, jilbab (khusus putri), topi, kaos kaki, baju batik, dan ikat pinggang.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newItem: SpmbUniformItem = {
                      id: `u-${Date.now()}`,
                      name: 'Item Perlengkapan Baru',
                      price: 50000,
                      gender: 'both',
                      required: true
                    };
                    setConfig({ ...config, uniformItems: [...config.uniformItems, newItem] });
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Tambah Item</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.uniformItems.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const updated = config.uniformItems.map(u => u.id === item.id ? { ...u, name: e.target.value } : u);
                        setConfig({ ...config, uniformItems: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.uniformItems.filter(u => u.id !== item.id);
                        setConfig({ ...config, uniformItems: updated });
                      }}
                      className="p-2 bg-rose-950/40 hover:bg-rose-900 text-rose-300 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Harga (Rp)</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const updated = config.uniformItems.map(u => u.id === item.id ? { ...u, price: Number(e.target.value) } : u);
                          setConfig({ ...config, uniformItems: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Berlaku Untuk</label>
                      <select
                        value={item.gender}
                        onChange={(e) => {
                          const updated = config.uniformItems.map(u => u.id === item.id ? { ...u, gender: e.target.value as any } : u);
                          setConfig({ ...config, uniformItems: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        <option value="both">Semua Siswa (Putra & Putri)</option>
                        <option value="male">Khusus Putra (Laki-laki)</option>
                        <option value="female">Khusus Putri (Perempuan / Jilbab)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CASH REFUND FORM ================= */}
      {refundModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                <Banknote size={20} />
                <span>Pengembalian Uang Token (Cash Refund)</span>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalCandidate(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Calon Murid:</span>
                <span className="font-bold text-white">{refundModalCandidate.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NISN:</span>
                <span className="font-mono text-slate-300">{refundModalCandidate.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Asal Sekolah:</span>
                <span className="text-slate-300">{refundModalCandidate.schoolOrigin} (Jalur Kolektif)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pembayaran Online:</span>
                <span className="text-emerald-400 font-bold">LUNAS Rp {(refundModalCandidate.tokenAmount || 50000).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <form onSubmit={handleProcessRefundSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nominal Pengembalian Uang Tunai (Rp) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    required
                    className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold font-mono text-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nama Penerima Uang <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={refundRecipient}
                    onChange={(e) => setRefundRecipient(e.target.value)}
                    placeholder="Wali Murid / Siswa / Koordinator"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Tanggal Pengembalian <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nama Petugas Panitia SPMB
                </label>
                <input
                  type="text"
                  value={refundedBy}
                  onChange={(e) => setRefundedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRefundModalCandidate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  {isProcessingRefund ? <RefreshCw size={14} className="animate-spin" /> : <Banknote size={14} />}
                  <span>Konfirmasi Pengembalian (Cash)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KUITANSI RESMI PENGEMBALIAN UANG CASH (PRINTABLE) ================= */}
      {receiptCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Header / Actions */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <Receipt size={18} />
                <span>Kuitansi Tanda Terima Pengembalian Uang Token (Cash)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Kuitansi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptCandidate(null)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Layout */}
            <div className="border-2 border-slate-800 rounded-2xl p-6 space-y-5">
              {/* Kop Surat Sekolah */}
              <div className="text-center border-b-2 border-slate-800 pb-3 space-y-0.5">
                <p className="font-extrabold text-xs uppercase tracking-widest text-slate-600 m-0">
                  LEMBAGA PENDIDIKAN MA'ARIF NU KABUPATEN PASURUAN
                </p>
                <h2 className="text-lg sm:text-xl font-black text-emerald-900 m-0">
                  {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                </h2>
                <p className="text-[11px] text-slate-600 m-0">
                  {schoolIdentity?.address || "Jl. Jogosari No. 01 Pandaan, Pasuruan - Jawa Timur"} • Telp: {schoolIdentity?.phone || "0343-631xxx"}
                </p>
              </div>

              {/* Judul & Nomor Kuitansi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-black text-sm text-slate-900 m-0 uppercase tracking-wide">
                    KUITANSI PENGEMBALIAN UANG TUNAI (CASH REFUND)
                  </h3>
                  <p className="text-[11px] text-slate-600 m-0">
                    Jalur Kolektif Pendaftaran SPMB Tahun Ajaran {currentAcademicYear}
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-[11px] text-slate-700">
                  <strong>No:</strong> {receiptCandidate.collectiveRefundReceiptNo || `KW-REFUND-${receiptCandidate.nisn}`}
                </div>
              </div>

              {/* Rincian Kuitansi */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Telah Diterima Dari</span>
                  <span className="col-span-2 font-bold text-slate-900">: Panitia SPMB SMP Ma'arif NU Pandaan</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Diserahkan Kepada</span>
                  <span className="col-span-2 font-bold text-slate-900">: {receiptCandidate.collectiveRefundRecipient || receiptCandidate.parentName || receiptCandidate.fullName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Nama Calon Siswa</span>
                  <span className="col-span-2 font-bold text-slate-900">: {receiptCandidate.fullName} (NISN: {receiptCandidate.nisn})</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Asal Sekolah</span>
                  <span className="col-span-2 font-bold text-slate-900">: {receiptCandidate.schoolOrigin || 'SD/MI'} (Jalur Kolektif)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Uang Sejumlah</span>
                  <span className="col-span-2 font-extrabold text-emerald-800 text-sm">
                    : Rp {(receiptCandidate.collectiveRefundAmount || 50000).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Terbilang</span>
                  <span className="col-span-2 font-semibold italic text-slate-800">: Lima Puluh Ribu Rupiah</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-600 font-medium">Untuk Pembayaran</span>
                  <span className="col-span-2 text-slate-800">
                    : Pengembalian tunai (cash) biaya formulir/token pendaftaran online jalur kolektif SPMB {currentAcademicYear}.
                  </span>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-3 text-center">
                <div className="space-y-12">
                  <p className="text-slate-700 m-0">Yang Menerima,</p>
                  <p className="font-bold text-slate-900 underline m-0">
                    ( {receiptCandidate.collectiveRefundRecipient || receiptCandidate.parentName || receiptCandidate.fullName} )
                  </p>
                </div>
                <div className="space-y-12">
                  <p className="text-slate-700 m-0">
                    Pandaan, {new Date(receiptCandidate.collectiveRefundedAt || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'long' })}<br />
                    Panitia SPMB,
                  </p>
                  <p className="font-bold text-slate-900 underline m-0">
                    ( {receiptCandidate.collectiveRefundedBy || 'Panitia SPMB'} )
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setReceiptCandidate(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL CALON MURID & VERIFIKASI BUKU INDUK ================= */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{selectedCandidate.fullName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    NISN: {selectedCandidate.nisn}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 m-0">
                  Asal Sekolah: {selectedCandidate.schoolOrigin} • Sesi: {selectedCandidate.sessionId.toUpperCase()} • Jalur: {selectedCandidate.registrationType === 'school_collective' ? 'Kolektif Sekolah' : 'Mandiri Online'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Candidate Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo & Status */}
              <div className="space-y-3 text-center">
                {selectedCandidate.documents?.pasPhoto ? (
                  <img src={selectedCandidate.documents.pasPhoto} alt="Pas Foto" className="w-32 h-40 object-cover rounded-2xl border-2 border-slate-700 mx-auto" />
                ) : (
                  <div className="w-32 h-40 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500 mx-auto">
                    Belum Ada Pas Foto
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-left text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Sesi SPMB:</span>
                    <span className="font-bold text-white uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">
                      {selectedCandidate.sessionId === 'inden' ? 'Jalur Inden' : selectedCandidate.sessionId === 'gelombang-1' ? 'Gelombang 1' : selectedCandidate.sessionId === 'gelombang-2' ? 'Gelombang 2' : selectedCandidate.sessionId}
                    </span>
                  </div>

                  {/* Transfer Status Notice & Revert Button */}
                  {selectedCandidate.isTransferredSession && (
                    <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 space-y-2">
                      <div className="flex items-start gap-1.5 text-rose-300 text-[11px] leading-tight">
                        <AlertTriangle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Dialihkan Jalur Pendaftaran:</strong>
                          <p className="m-0 text-slate-300 text-[10px] mt-0.5">
                            Semula terdaftar di <strong>{selectedCandidate.previousSessionId === 'inden' ? 'Jalur Inden' : selectedCandidate.previousSessionId === 'gelombang-1' ? 'Gelombang 1' : (selectedCandidate.previousSessionId || selectedCandidate.originalSessionId)}</strong>.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevertTransfer(selectedCandidate)}
                        disabled={isRevertingTransfer}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Undo2 size={13} />
                        <span>Batalkan & Kembalikan ke Jalur Sebelumnya</span>
                      </button>
                    </div>
                  )}

                  {/* Manual Session Switcher */}
                  <div className="pt-2 border-t border-slate-700/80 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Pindahkan Sesi Manual:</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        id={`session-select-${selectedCandidate.id}`}
                        defaultValue={selectedCandidate.sessionId}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-white"
                      >
                        {config?.sessions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const selectElem = document.getElementById(`session-select-${selectedCandidate.id}`) as HTMLSelectElement;
                          if (selectElem) {
                            handleChangeCandidateSession(selectedCandidate, selectElem.value);
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] rounded-lg cursor-pointer shrink-0"
                        title="Pindahkan sesi pendaftaran siswa ini"
                      >
                        Pindah
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Jalur:</span>
                    <span className="font-bold text-indigo-300 uppercase">
                      {selectedCandidate.registrationType === 'school_collective' ? 'Kolektif' : 'Mandiri'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Token Online:</span>
                    <span className="font-bold text-emerald-400 uppercase">LUNAS (Rp 50rb)</span>
                  </div>
                  {selectedCandidate.registrationType === 'school_collective' && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Refund Cash:</span>
                      <span className={`font-bold ${selectedCandidate.collectiveRefundStatus === 'refunded' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedCandidate.collectiveRefundStatus === 'refunded' ? 'SUDAH REFUND' : 'PERLU REFUND'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daftar Ulang:</span>
                    <span className={`font-bold ${selectedCandidate.reRegistrationStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedCandidate.reRegistrationStatus === 'paid' ? 'LUNAS' : 'Belum Lunas'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ukuran Seragam:</span>
                    <span className="font-bold text-white">{selectedCandidate.selectedUniformSize || '-'}</span>
                  </div>

                  {/* Button Action Refund Cash inside Modal */}
                  {selectedCandidate.registrationType === 'school_collective' && (
                    <div className="pt-2 border-t border-slate-700">
                      {selectedCandidate.collectiveRefundStatus === 'refunded' ? (
                        <button
                          type="button"
                          onClick={() => setReceiptCandidate(selectedCandidate)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Receipt size={14} />
                          <span>Lihat / Cetak Kuitansi Refund</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRefundModal(selectedCandidate)}
                          className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Banknote size={14} />
                          <span>Kembalikan Token (Cash)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Data Buku Induk Lengkap */}
              <div className="md:col-span-2 space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <h4 className="font-black text-emerald-400 text-xs uppercase">1. Data Pribadi Siswa</h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div><strong className="text-slate-400">NIK:</strong> {selectedCandidate.nik || '-'}</div>
                    <div><strong className="text-slate-400">No KK:</strong> {selectedCandidate.kkNumber || '-'}</div>
                    <div><strong className="text-slate-400">Tempat, Tgl Lahir:</strong> {selectedCandidate.birthPlace}, {selectedCandidate.birthDate}</div>
                    <div><strong className="text-slate-400">Agama:</strong> {selectedCandidate.religion || 'Islam'}</div>
                    <div className="col-span-2"><strong className="text-slate-400">Alamat:</strong> {selectedCandidate.address || '-'}, Desa {selectedCandidate.village || '-'}, Kec. {selectedCandidate.district || '-'}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <h4 className="font-black text-emerald-400 text-xs uppercase">2. Data Orang Tua</h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div><strong className="text-slate-400">Nama Ayah:</strong> {selectedCandidate.fatherName || '-'}</div>
                    <div><strong className="text-slate-400">Pekerjaan Ayah:</strong> {selectedCandidate.fatherOccupation || '-'}</div>
                    <div><strong className="text-slate-400">Nama Ibu:</strong> {selectedCandidate.motherName || '-'}</div>
                    <div><strong className="text-slate-400">Pekerjaan Ibu:</strong> {selectedCandidate.motherOccupation || '-'}</div>
                    <div className="col-span-2"><strong className="text-slate-400">No HP Orang Tua:</strong> {selectedCandidate.phone || selectedCandidate.fatherPhone || '-'}</div>
                  </div>
                </div>

                {/* Uploaded Documents Thumbnails */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <h4 className="font-black text-emerald-400 text-xs uppercase">3. Berkas Dokumen Terunggah</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedCandidate.documents?.kkPhoto ? (
                      <a href={selectedCandidate.documents.kkPhoto} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-center hover:border-emerald-500 block">
                        <span className="text-[10px] text-slate-300 block font-bold">Foto Kartu Keluarga</span>
                        <span className="text-[9px] text-emerald-400">Lihat File ↗</span>
                      </a>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-[10px]">
                        KK Belum Diunggah
                      </div>
                    )}

                    {selectedCandidate.documents?.aktaPhoto ? (
                      <a href={selectedCandidate.documents.aktaPhoto} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-center hover:border-emerald-500 block">
                        <span className="text-[10px] text-slate-300 block font-bold">Akta Kelahiran</span>
                        <span className="text-[9px] text-emerald-400">Lihat File ↗</span>
                      </a>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-[10px]">
                        Akta Belum Diunggah
                      </div>
                    )}

                    {selectedCandidate.documents?.sklPhoto ? (
                      <a href={selectedCandidate.documents.sklPhoto} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-center hover:border-emerald-500 block">
                        <span className="text-[10px] text-slate-300 block font-bold">SKL / Ijazah</span>
                        <span className="text-[9px] text-emerald-400">Lihat File ↗</span>
                      </a>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-[10px]">
                        SKL Belum Diunggah
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Decision & Verification Notes */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Catatan Verifikasi Panitia</label>
                <input
                  type="text"
                  placeholder="Contoh: Berkas lengkap, telah memenuhi kriteria seleksi."
                  value={statusUpdateNote}
                  onChange={(e) => setStatusUpdateNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateCandidateStatus('accepted')}
                    disabled={isUpdatingStatus}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Terima / Luluskan Calon Murid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCandidateStatus('rejected')}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-rose-500/40 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Tolak</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
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