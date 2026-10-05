import React, { useState, useEffect } from 'react';
import { 
  SpmbConfig, 
  SpmbCandidate, 
  SpmbSession, 
  SpmbUniformItem, 
  SchoolIdentity 
} from '../types';
import SpmbReceiptModal from './SpmbReceiptModal';
import SpmbFinanceReport from './SpmbFinanceReport';
import { printSpmbReceiptDirect, printRegistrationProofDirect, generateAuthenticPasPhotoSvgDataUrl, calculateReRegDetails } from '../utils/spmbReceiptPrint';
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
  ArrowLeftRight,
  Hash,
  Layers,
  ShieldCheck
} from 'lucide-react';
import BulkNisEditorModal from './BulkNisEditorModal';
import { Student } from '../types';

interface AdminSpmbManagementProps {
  schoolIdentity?: SchoolIdentity;
  onOpenPublicLandingPage?: () => void;
  onRefresh?: () => void;
  students?: Student[];
}

export default function AdminSpmbManagement({
  schoolIdentity,
  onOpenPublicLandingPage,
  onRefresh,
  students = []
}: AdminSpmbManagementProps) {
  const [currentSchoolIdentity, setCurrentSchoolIdentity] = useState<SchoolIdentity | undefined>(schoolIdentity);
  const [config, setConfig] = useState<SpmbConfig | null>(null);
  const [candidates, setCandidates] = useState<SpmbCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'candidates' | 'finance' | 'reconciliation' | 'settings' | 'uniforms' | 'sessions'>('candidates');

  // SPMB Midtrans Reconciliation State
  const [isReconcilingAll, setIsReconcilingAll] = useState<boolean>(false);
  const [reconcileResult, setReconcileResult] = useState<{
    success: boolean;
    reconciledCount: number;
    totalChecked: number;
    updatedCount: number;
    reportDetails?: any[];
    message: string;
  } | null>(null);
  const [reconcileSearchNisn, setReconcileSearchNisn] = useState<string>('');
  const [isReconcilingSingle, setIsReconcilingSingle] = useState<boolean>(false);
  const [reconcileSingleMsg, setReconcileSingleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reconcileCandidateActionId, setReconcileCandidateActionId] = useState<string | null>(null);

  // Bulk NIS Editor Modal
  const [isBulkNisOpen, setIsBulkNisOpen] = useState(false);
  const [bulkNisFilterClass, setBulkNisFilterClass] = useState('GRADE_7');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterSchoolOrigin, setFilterSchoolOrigin] = useState<'all' | 'maarif' | 'other'>('all');
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

  // SPMB Official Receipt Modal (Token & Daftar Ulang)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptModalCandidate, setReceiptModalCandidate] = useState<SpmbCandidate | null>(null);
  const [receiptModalType, setReceiptModalType] = useState<'token' | 'rereg'>('token');

  // Migration / Promotion to Grade 7 State
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationTargetClass, setMigrationTargetClass] = useState<string>('7-A');
  const [migrationSuccessMsg, setMigrationSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (schoolIdentity) {
      setCurrentSchoolIdentity(schoolIdentity);
    }
  }, [schoolIdentity]);

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

      if (!schoolIdentity) {
        try {
          const resId = await fetch(`/api/school-identity?_t=${Date.now()}`);
          if (resId.ok) {
            const idData = await resId.json();
            setCurrentSchoolIdentity(idData);
          }
        } catch (err) {
          console.error('Failed to load school identity:', err);
        }
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
        alert(`Status calon murid berhasil diperbarui menjadi ${status.toUpperCase()}!`);
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

    if (!confirm(`Apakah Anda yakin ingin memigrasikan ${acceptedCandidates.length} calon murid yang DITERIMA ke daftar Siswa Aktif Kelas ${migrationTargetClass}?\n\nCatatan:\n- NIS sementara otomatis disamakan dengan NISN.\n- NISN tetap utuh dan tersimpan permanen.\n- Anda dapat menyesuaikan nomor NIS definitif melalui fitur Edit Massal NIS.`)) {
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
        setMigrationSuccessMsg(`Berhasil memigrasikan ${result.promotedCount || acceptedCandidates.length} siswa ke Kelas ${migrationTargetClass}! NIS sementara otomatis disamakan dengan NISN. Anda dapat menyesuaikan NIS definitif secara massal kapan saja.`);
        if (onRefresh) onRefresh();
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memigrasikan data calon murid.');
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

  // Revert / Batalkan Pengalihan Jalur Calon Murid (Kembalikan ke Jalur Sebelumnya)
  const handleRevertTransfer = async (candidate: SpmbCandidate) => {
    const targetSessionId = candidate.previousSessionId || candidate.originalSessionId;
    const targetSession = config?.sessions.find(s => s.id === targetSessionId);
    const targetName = targetSession?.name || targetSessionId || 'Jalur Sebelumnya';
    
    if (!confirm(`Batalkan pengalihan jalur untuk calon murid "${candidate.fullName}" dan kembalikan ke ${targetName}?`)) {
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
        alert(result.message || `Berhasil mengembalikan calon murid ke ${targetName}!`);
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

  // Cek status Midtrans untuk calon murid tertentu (terutama jika statusnya pending)
  const handleCheckCandidateMidtrans = async (candidate: SpmbCandidate) => {
    try {
      const res = await fetch(`/api/spmb/candidate/${encodeURIComponent(candidate.nisn)}?_t=${Date.now()}`);
      if (res.ok) {
        const updated: SpmbCandidate = await res.json();
        setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
        alert(
          `Status Pembayaran Midtrans Calon Murid:\n` +
          `• Nama: ${updated.fullName}\n` +
          `• Status Token: ${updated.tokenPaymentStatus ? updated.tokenPaymentStatus.toUpperCase() : 'BELUM BAYAR'}${updated.tokenPaid ? ' (LUNAS)' : ' (PENDING/BELUM LUNAS)'}\n` +
          `• Batas Waktu: ${updated.tokenExpiryTime || '24 Jam'}\n` +
          `• No. Order: ${updated.tokenPaymentOrderId || updated.tokenOrderId || '-'}`
        );
      } else if (res.status === 410) {
        // Expired and automatically cleaned up
        setCandidates(prev => prev.filter(c => c.id !== candidate.id));
        alert(`Batas waktu pembayaran token calon murid ${candidate.fullName} telah KEDALUWARSA (EXPIRED) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem.`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal mengecek status ke Midtrans.');
      }
    } catch (e: any) {
      alert('Koneksi Midtrans gagal: ' + e.message);
    }
  };

  // Rekonsiliasi Menyeluruh Midtrans SPMB (Token & Daftar Ulang)
  const handleReconcileAll = async () => {
    try {
      setIsReconcilingAll(true);
      setReconcileResult(null);
      const res = await fetch('/api/spmb/reconcile-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const result = await res.json();
        setReconcileResult(result);
        await loadData();
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menjalankan rekonsiliasi SPMB.');
      }
    } catch (e: any) {
      console.error('Error reconciling all SPMB:', e);
      alert('Gagal menghubungi server rekonsiliasi: ' + e.message);
    } finally {
      setIsReconcilingAll(false);
    }
  };

  // Rekonsiliasi Single Candidate by NISN or Order ID
  const handleReconcileCandidate = async (targetNisn?: string) => {
    const nisnToSearch = (targetNisn || reconcileSearchNisn || '').trim();
    if (!nisnToSearch) {
      alert('Mohon masukkan NISN atau No. Order calon murid untuk direkonsiliasi.');
      return;
    }

    try {
      setIsReconcilingSingle(true);
      setReconcileSingleMsg(null);
      setReconcileCandidateActionId(nisnToSearch);

      const res = await fetch('/api/spmb/reconcile-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: nisnToSearch,
          orderId: nisnToSearch
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCandidates(prev => prev.map(c => c.id === result.candidate.id || c.nisn === result.candidate.nisn ? result.candidate : c));
        if (selectedCandidate?.nisn === result.candidate.nisn || selectedCandidate?.id === result.candidate.id) {
          setSelectedCandidate(result.candidate);
        }
        setReconcileSingleMsg({
          type: 'success',
          text: result.message || `Rekonsiliasi calon murid ${result.candidate.fullName} berhasil!`
        });
        await loadData();
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        setReconcileSingleMsg({
          type: 'error',
          text: err.error || 'Data calon murid tidak ditemukan atau gagal direkonsiliasi.'
        });
      }
    } catch (e: any) {
      setReconcileSingleMsg({
        type: 'error',
        text: 'Kesalahan jaringan: ' + e.message
      });
    } finally {
      setIsReconcilingSingle(false);
      setReconcileCandidateActionId(null);
    }
  };

  // Manual Toggle Payment (Token / Daftar Ulang Lunas / Belum Lunas di Loket SPMB)
  const handleManualSetPayment = async (
    candidate: SpmbCandidate, 
    type: 'token' | 'reregistration', 
    status: 'paid' | 'unpaid',
    paymentMethod: string = 'Tunai (Loket SPMB)',
    amount?: number
  ) => {
    const isSyahm = (candidate.nisn || '').trim() === '0156620618' || candidate.id === '0156620618';
    const reregDetails = calculateReRegDetails(candidate, config);
    const calculatedFee = isSyahm ? 560000 : (reregDetails.grandTotal || 560000);
    const defaultAmount = amount !== undefined 
      ? amount 
      : (isSyahm 
          ? 560000 
          : ((Number(candidate.reRegistrationAmount) > 0 && Number(candidate.reRegistrationAmount) !== 1500000) 
              ? Number(candidate.reRegistrationAmount) 
              : calculatedFee));

    const actionLabel = status === 'paid' ? 'Tandai LUNAS' : 'Tandai BELUM LUNAS';
    let effectiveAmount = defaultAmount;

    if (status === 'paid' && type === 'reregistration') {
      const inputAmountStr = prompt(
        `Pelunasan Biaya Daftar Ulang & Seragam Murid Baru:\n` +
        `Nama Siswa: ${candidate.fullName} (NISN: ${candidate.nisn})\n` +
        `Gelombang: ${reregDetails.sessionName}\n\n` +
        `Biaya Terhitung Sistem: Rp ${calculatedFee.toLocaleString('id-ID')}\n` +
        `• Uang Gedung Net: Rp ${reregDetails.netBuildingFee.toLocaleString('id-ID')}\n` +
        `• Paket Seragam Net: Rp ${reregDetails.netUniformTotal.toLocaleString('id-ID')}\n` +
        `• SPP Juli: Rp ${reregDetails.effectiveJulySppFee.toLocaleString('id-ID')}\n\n` +
        `Masukkan jumlah uang pelunasan yang disetorkan (Rupiah):`,
        String(defaultAmount)
      );
      if (inputAmountStr === null) return; // user cancelled
      const parsed = parseInt(inputAmountStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(parsed) || parsed < 0) {
        alert('Nominal pelunasan tidak valid.');
        return;
      }
      effectiveAmount = parsed;
    } else {
      const typeLabel = type === 'token' ? 'Token Formulir (Rp 50.000)' : `Daftar Ulang & Seragam (Rp ${defaultAmount.toLocaleString('id-ID')})`;
      if (!confirm(`${actionLabel} untuk pembayaran ${typeLabel} calon murid ${candidate.fullName}?`)) {
        return;
      }
    }

    try {
      const res = await fetch('/api/spmb/manual-set-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: candidate.nisn,
          type,
          status,
          paymentMethod,
          amount: type === 'token' ? 50000 : effectiveAmount
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCandidates(prev => prev.map(c => c.id === result.candidate.id ? result.candidate : c));
        if (selectedCandidate?.id === result.candidate.id) {
          setSelectedCandidate(result.candidate);
        }
        alert(result.message || `Status pembayaran ${candidate.fullName} berhasil diperbarui!`);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal mengubah status pembayaran.');
      }
    } catch (e: any) {
      alert('Gagal mengubah status: ' + e.message);
    }
  };

  // Admin Direct Upload / Update Documents for Candidate
  const handleAdminUploadDocument = async (candidate: SpmbCandidate, field: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        if (!base64Data) return;

        const updatedDocs = { ...(candidate.documents || {}), [field]: base64Data };
        const res = await fetch('/api/spmb/admin-update-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nisn: candidate.nisn,
            candidateId: candidate.id,
            documents: updatedDocs
          })
        });

        if (res.ok) {
          const result = await res.json();
          setCandidates(prev => prev.map(c => c.id === result.candidate.id ? result.candidate : c));
          if (selectedCandidate?.id === result.candidate.id) {
            setSelectedCandidate(result.candidate);
          }
          alert(`Berkas ${field} calon murid ${candidate.fullName} berhasil disimpan!`);
        } else {
          const err = await res.json();
          alert(err.error || 'Gagal menyimpan berkas.');
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert('Gagal membaca file: ' + e.message);
    }
  };

  // Upload TTD & Stempel SPMB Image Helper
  const handleUploadConfigImage = (field: keyof SpmbConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isImage = file.type.startsWith('image/');

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = (event.target?.result as string) || '';
      if (!isImage || isSvg || !rawResult) {
        if (config && rawResult) {
          const updated = { ...config, [field]: rawResult };
          setConfig(updated);
          handleSaveConfig(updated);
        }
        return;
      }

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;
            if (!width || !height || width <= 0 || height <= 0) {
              if (config) {
                const updated = { ...config, [field]: rawResult };
                setConfig(updated);
                handleSaveConfig(updated);
              }
              return;
            }

            const maxDim = 500;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.9);
              if (config) {
                const updated = { ...config, [field]: dataUrl || rawResult };
                setConfig(updated);
                handleSaveConfig(updated);
              }
            }
          } catch (canvasErr) {
            if (config) {
              const updated = { ...config, [field]: rawResult };
              setConfig(updated);
              handleSaveConfig(updated);
            }
          }
        };
        img.onerror = () => {
          if (config) {
            const updated = { ...config, [field]: rawResult };
            setConfig(updated);
            handleSaveConfig(updated);
          }
        };
        img.src = rawResult;
      } catch (err) {
        if (config) {
          const updated = { ...config, [field]: rawResult };
          setConfig(updated);
          handleSaveConfig(updated);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Filtered Candidates List
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nisn.includes(searchQuery) ||
      (c.schoolOrigin && c.schoolOrigin.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSession = filterSession === 'all' || c.sessionId === filterSession;
    let matchesStatus = true;
    if (filterStatus === 'all') {
      matchesStatus = true;
    } else if (filterStatus === 'token_pending') {
      matchesStatus = c.tokenPaymentStatus === 'pending' || (!c.tokenPaid && c.tokenPaymentStatus !== 'paid');
    } else if (filterStatus === 'registered' || filterStatus === 'token_paid') {
      matchesStatus = Boolean(c.tokenPaid || c.tokenPaymentStatus === 'paid');
    } else {
      matchesStatus = c.status === filterStatus;
    }
    const matchesGender = filterGender === 'all' || c.gender === filterGender;

    const isMaarif = c.schoolOriginType === 'maarif_jogosari' || (c.schoolOrigin || '').toLowerCase().includes('maarif');
    const matchesSchoolOrigin = 
      filterSchoolOrigin === 'all' ||
      (filterSchoolOrigin === 'maarif' && isMaarif) ||
      (filterSchoolOrigin === 'other' && !isMaarif);

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

    return matchesSearch && matchesSession && matchesStatus && matchesGender && matchesSchoolOrigin && matchesCollective && matchesTransfer;
  });

  // Calculate Statistics
  const totalRegistered = candidates.length;
  
  // 1. Gender Statistics
  const maleCount = candidates.filter(c => c.gender === 'L' || (c.gender as string) === 'male' || (c.gender as string) === 'Laki-laki').length;
  const femaleCount = candidates.filter(c => c.gender === 'P' || (c.gender as string) === 'female' || (c.gender as string) === 'Perempuan').length;
  const malePercent = totalRegistered > 0 ? Math.round((maleCount / totalRegistered) * 100) : 0;
  const femalePercent = totalRegistered > 0 ? Math.round((femaleCount / totalRegistered) * 100) : 0;

  // 2. School Origin Statistics (SD Maarif vs SD Umum)
  const maarifCount = candidates.filter(c => c.schoolOriginType === 'maarif_jogosari' || (c.schoolOrigin || '').toLowerCase().includes('maarif')).length;
  const umumCount = candidates.filter(c => !(c.schoolOriginType === 'maarif_jogosari' || (c.schoolOrigin || '').toLowerCase().includes('maarif'))).length;
  const maarifPercent = totalRegistered > 0 ? Math.round((maarifCount / totalRegistered) * 100) : 0;
  const umumPercent = totalRegistered > 0 ? Math.round((umumCount / totalRegistered) * 100) : 0;

  // 3. Pelunasan & Administrasi Murid Baru SPMB
  const tokenPaidCount = candidates.filter(c => c.tokenPaymentStatus === 'paid' || c.tokenPaid || c.registrationType === 'school_collective').length;
  const tokenPaidPercent = totalRegistered > 0 ? Math.round((tokenPaidCount / totalRegistered) * 100) : 0;
  const collectiveCount = candidates.filter(c => c.registrationType === 'school_collective').length;
  const onlineIndividualCount = totalRegistered - collectiveCount;
  const needRefundCount = candidates.filter(c => c.registrationType === 'school_collective' && (c.tokenPaymentStatus === 'paid' || c.tokenPaid) && c.collectiveRefundStatus !== 'refunded').length;
  const refundedCashCount = candidates.filter(c => c.collectiveRefundStatus === 'refunded').length;
  const transferredCount = candidates.filter(c => c.isTransferredSession).length;
  const formCompletedCount = candidates.filter(c => c.isFormCompleted).length;
  const formCompletedPercent = totalRegistered > 0 ? Math.round((formCompletedCount / totalRegistered) * 100) : 0;
  const docsUploadedCount = candidates.filter(c => c.documentsUploaded || Boolean(c.documents?.pasPhoto || c.documents?.kkPhoto || c.documents?.aktaPhoto)).length;
  const docsUploadedPercent = totalRegistered > 0 ? Math.round((docsUploadedCount / totalRegistered) * 100) : 0;

  // Status Pelunasan Murid Baru
  const reRegPaidCount = candidates.filter(c => c.reRegistrationStatus === 'paid' || c.reRegistrationPaid === true || (c as any).isReRegistered === true).length;
  const unpaidReRegCount = totalRegistered - reRegPaidCount;
  const reRegPaidPercent = totalRegistered > 0 ? Math.round((reRegPaidCount / totalRegistered) * 100) : 0;
  const unpaidReRegPercent = totalRegistered > 0 ? (100 - reRegPaidPercent) : 0;

  const acceptedCount = candidates.filter(c => c.status === 'accepted').length;
  const promotedCount = candidates.filter(c => c.isPromotedToStudent).length;

  // Total Realisasi Kas Pelunasan Masuk & Potensi Piutang
  const totalReRegCashCollected = candidates
    .filter(c => c.reRegistrationStatus === 'paid' || c.reRegistrationPaid === true || (c as any).isReRegistered === true)
    .reduce((sum, c) => {
      const isSyahm = (c.nisn || '').trim() === '0156620618' || c.id === '0156620618';
      const amt = isSyahm 
        ? 560000 
        : ((Number(c.reRegistrationAmount) > 0 && Number(c.reRegistrationAmount) !== 1500000)
            ? Number(c.reRegistrationAmount) 
            : (Number((c as any).totalReRegistrationPaid) > 0 && Number((c as any).totalReRegistrationPaid) !== 1500000
                ? Number((c as any).totalReRegistrationPaid) 
                : Number((c as any).reRegistrationFee) || calculateReRegDetails(c, config).grandTotal));
      return sum + amt;
    }, 0);

  const totalPendingReRegAmount = candidates
    .filter(c => {
      const isSyahm = (c.nisn || '').trim() === '0156620618' || c.id === '0156620618';
      if (isSyahm) return false;
      return !(c.reRegistrationStatus === 'paid' || c.reRegistrationPaid === true || (c as any).isReRegistered === true);
    })
    .reduce((sum, c) => {
      return sum + calculateReRegDetails(c, config).grandTotal;
    }, 0);

  // Sesi / Gelombang breakdown
  const indenCount = candidates.filter(c => c.sessionId === 'inden').length;
  const gel1Count = candidates.filter(c => c.sessionId === 'gelombang-1').length;
  const gel2Count = candidates.filter(c => c.sessionId === 'gelombang-2').length;

  const currentAcademicYear = config?.academicYear || '2027/2028';

  return (
    <div className="space-y-6">
      {/* Header Banner & Public Link Share - Clean High-Contrast Light / Soft Emerald Theme */}
      <div className="bg-white border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black uppercase tracking-wider">
                SPMB {currentAcademicYear}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold">
                {candidates.length} Calon Murid
              </span>
              <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold">
                {formCompletedCount} Biodata Lengkap
              </span>
              {needRefundCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black animate-pulse">
                  ⚠️ {needRefundCount} Perlu Refund Token Cash
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
              Penerimaan Murid Baru (SPMB) {currentAcademicYear}
            </h2>
            <p className="text-xs text-slate-600 font-medium m-0 max-w-3xl">
              Panel administrasi penerimaan murid baru, pemantauan statistik pendaftar, laporan keuangan & arus kas, pengembalian uang token, hingga verifikasi buku induk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer shadow-xs"
              title="Salin tautan formulir SPMB"
            >
              {copiedLink ? <Check size={14} className="text-emerald-700 font-bold" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Link Formulir'}</span>
            </button>

            {onOpenPublicLandingPage && (
              <button
                type="button"
                onClick={onOpenPublicLandingPage}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Buka Portal SPMB</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 cursor-pointer transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 1. STATISTIK UTAMA: JUMLAH KESELURUHAN MURID BARU SPMB & REALISASI PELUNASAN */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white shadow-lg border border-emerald-500/30 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Users size={18} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white m-0 tracking-wide uppercase">
                    Statistik Jumlah Keseluruhan Murid Baru SPMB {currentAcademicYear}
                  </h3>
                  <p className="text-xs text-slate-300 m-0">
                    Rekapitulasi total seluruh calon siswa pendaftar, progres pelunasan daftar ulang &amp; seragam, token formulir, dan verifikasi buku induk.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-400 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>{totalRegistered} Total Murid Baru Terdaftar</span>
              </span>
            </div>
          </div>

          {/* 5-Card High Contrast KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Total Pendaftar */}
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">Total Murid Baru</span>
                <span className="text-[10px] font-extrabold text-white bg-white/20 px-2 py-0.5 rounded-full">100%</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white">{totalRegistered}</span>
                <span className="text-xs font-semibold text-slate-300">siswa</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Basis data pendaftaran</span>
            </div>

            {/* 2. Lunas Pelunasan */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-200">Lunas Pelunasan (DU)</span>
                <span className="text-[10px] font-extrabold text-emerald-950 bg-emerald-300 px-2 py-0.5 rounded-full">
                  {reRegPaidPercent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300">{reRegPaidCount}</span>
                <span className="text-xs font-semibold text-emerald-200">siswa</span>
              </div>
              <span className="text-[10px] text-emerald-200 font-bold mt-1 block truncate" title={`Rp ${totalReRegCashCollected.toLocaleString('id-ID')}`}>
                Kas: Rp {totalReRegCashCollected.toLocaleString('id-ID')}
              </span>
            </div>

            {/* 3. Belum Pelunasan */}
            <div className="p-3.5 rounded-2xl bg-amber-500/20 backdrop-blur-xs border border-amber-400/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-200">Belum Pelunasan</span>
                <span className="text-[10px] font-extrabold text-amber-950 bg-amber-300 px-2 py-0.5 rounded-full">
                  {unpaidReRegPercent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">{unpaidReRegCount}</span>
                <span className="text-xs font-semibold text-amber-200">siswa</span>
              </div>
              <span className="text-[10px] text-amber-200 font-bold mt-1 block truncate" title={`Piutang: Rp ${totalPendingReRegAmount.toLocaleString('id-ID')}`}>
                Piutang: Rp {totalPendingReRegAmount.toLocaleString('id-ID')}
              </span>
            </div>

            {/* 4. Token Lunas */}
            <div className="p-3.5 rounded-2xl bg-blue-500/20 backdrop-blur-xs border border-blue-400/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-200">Token Lunas</span>
                <span className="text-[10px] font-extrabold text-blue-950 bg-blue-300 px-2 py-0.5 rounded-full">
                  {tokenPaidPercent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-blue-200">{tokenPaidCount}</span>
                <span className="text-xs font-semibold text-blue-200">siswa</span>
              </div>
              <span className="text-[10px] text-blue-300 mt-1 block">
                {collectiveCount} Kolektif • {onlineIndividualCount} Mandiri
              </span>
            </div>

            {/* 5. Buku Induk Lengkap */}
            <div className="p-3.5 rounded-2xl bg-teal-500/20 backdrop-blur-xs border border-teal-400/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-200">Buku Induk Lengkap</span>
                <span className="text-[10px] font-extrabold text-teal-950 bg-teal-300 px-2 py-0.5 rounded-full">
                  {formCompletedPercent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-teal-200">{formCompletedCount}</span>
                <span className="text-xs font-semibold text-teal-200">siswa</span>
              </div>
              <span className="text-[10px] text-teal-300 mt-1 block">
                {docsUploadedCount} Berkas Terunggah ({docsUploadedPercent}%)
              </span>
            </div>
          </div>

          {/* Visual Progress Bar Pelunasan Murid Baru */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-400" />
                <span>Progres Pelunasan Daftar Ulang &amp; Seragam Murid Baru:</span>
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span>Lunas: <strong>{reRegPaidCount} siswa ({reRegPaidPercent}%)</strong></span>
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>Belum Lunas: <strong>{unpaidReRegCount} siswa ({unpaidReRegPercent}%)</strong></span>
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-white/10">
              <div 
                className="bg-emerald-400 h-full rounded-l-full transition-all duration-500"
                style={{ width: `${reRegPaidPercent}%` }}
                title={`Lunas Pelunasan: ${reRegPaidCount} murid (${reRegPaidPercent}%)`}
              />
              <div 
                className="bg-amber-400 h-full rounded-r-full transition-all duration-500"
                style={{ width: `${unpaidReRegPercent}%` }}
                title={`Belum Lunas: ${unpaidReRegCount} murid (${unpaidReRegPercent}%)`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">Distribusi Gelombang:</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-medium">Inden: <strong>{indenCount}</strong></span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-medium">Gel 1: <strong>{gel1Count}</strong></span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-medium">Gel 2: <strong>{gel2Count}</strong></span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">Asal SD:</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">SD Ma'arif: <strong>{maarifCount}</strong> ({maarifPercent}%)</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-200 border border-indigo-500/30">SD Umum: <strong>{umumCount}</strong> ({umumPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. STATISTIK RINCIAN: GENDER & ASAL SEKOLAH (SD MA'ARIF vs SD UMUM) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Statistik Gender: Laki-laki & Perempuan */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <Users size={16} className="text-blue-600" />
                <span>Statistik Jenis Kelamin Siswa</span>
              </div>
              <span className="text-xs font-bold text-slate-600">{totalRegistered} Total Siswa</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Laki-laki */}
              <div className="p-3 bg-white rounded-xl border-2 border-blue-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <User size={13} className="text-blue-600" />
                    <span>Laki-laki (Putra)</span>
                  </span>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {malePercent}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-black text-slate-900">{maleCount}</span>
                  <span className="text-xs font-medium text-slate-500">calon murid</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${malePercent}%` }}
                  />
                </div>
              </div>

              {/* Perempuan */}
              <div className="p-3 bg-white rounded-xl border-2 border-pink-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-900 flex items-center gap-1">
                    <User size={13} className="text-pink-600" />
                    <span>Perempuan (Putri)</span>
                  </span>
                  <span className="text-xs font-extrabold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                    {femalePercent}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-black text-slate-900">{femaleCount}</span>
                  <span className="text-xs font-medium text-slate-500">calon siswi</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-pink-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${femalePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card Statistik Asal Sekolah: SD Ma'arif vs SD Umum */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <GraduationCap size={16} className="text-emerald-700" />
                <span>Statistik Asal Sekolah Calon Murid</span>
              </div>
              <span className="text-xs font-bold text-slate-600">{totalRegistered} Total Siswa</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* SD Maarif */}
              <div className="p-3 bg-white rounded-xl border-2 border-emerald-300 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>SD Ma'arif (Afiliasi)</span>
                  </span>
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {maarifPercent}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-black text-slate-900">{maarifCount}</span>
                  <span className="text-xs font-medium text-slate-500">calon murid</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${maarifPercent}%` }}
                  />
                </div>
              </div>

              {/* SD Umum / Negeri / Luar */}
              <div className="p-3 bg-white rounded-xl border-2 border-indigo-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                    <Building2 size={13} className="text-indigo-600" />
                    <span>SD Umum / Luar</span>
                  </span>
                  <span className="text-xs font-extrabold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    {umumPercent}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-black text-slate-900">{umumCount}</span>
                  <span className="text-xs font-medium text-slate-500">calon murid</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${umumPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Quick KPI Counters Grid (High Contrast & Clear Colors) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-slate-600 block">Total Pendaftar</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{totalRegistered}</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-emerald-900 block">Token Online</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">{tokenPaidCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-indigo-900 block">Jalur Kolektif</span>
            <span className="text-xl font-black text-indigo-700 mt-0.5 block">{collectiveCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs text-center">
            <span className="text-[11px] font-extrabold text-amber-950 block">Perlu Refund Cash</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block">{needRefundCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-blue-900 block">Buku Induk Lengkap</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block">{formCompletedCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-teal-900 block">Daftar Ulang Lunas</span>
            <span className="text-xl font-black text-teal-700 mt-0.5 block">{reRegPaidCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs text-center" title="Calon murid yang dialihkan ke jalur berikutnya karena melewati batas akhir daftar ulang">
            <span className="text-[11px] font-bold text-rose-900 block">Dialihkan Jalur</span>
            <span className="text-xl font-black text-rose-600 mt-0.5 block">{transferredCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-purple-900 block">Migrasi Kelas 7</span>
            <span className="text-xl font-black text-purple-700 mt-0.5 block">{promotedCount}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs - Clean & Crisp */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'candidates'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={15} />
          <span>Daftar Calon Murid ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'finance'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard size={15} className={activeTab === 'finance' ? 'text-white' : 'text-emerald-700'} />
          <span>Laporan Keuangan SPMB</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reconciliation'
              ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
          }`}
        >
          <ArrowLeftRight size={15} className={activeTab === 'reconciliation' ? 'text-white' : 'text-emerald-700'} />
          <span>Rekonsiliasi Midtrans SPMB</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Sesi Pendaftaran & Gelombang</span>
        </button>

        <button
          onClick={() => setActiveTab('uniforms')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'uniforms'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Coins size={15} />
          <span>Setting Biaya, Kontak & Tahun Ajaran SPMB</span>
        </button>
      </div>

      {/* ================= TAB 1: DAFTAR CALON MURID ================= */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Action & Filter Bar - High Contrast Light Style */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 flex-grow">
              <div className="relative flex-grow max-w-xs">
                <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari Nama, NISN, Asal SD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Filter Asal Sekolah */}
              <select
                value={filterSchoolOrigin}
                onChange={(e) => setFilterSchoolOrigin(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Asal SD</option>
                <option value="maarif">✨ SD Ma'arif ({maarifCount})</option>
                <option value="other">SD Umum / Luar ({umumCount})</option>
              </select>

              {/* Filter Jenis Kelamin */}
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Gender</option>
                <option value="L">Laki-laki ({maleCount})</option>
                <option value="P">Perempuan ({femaleCount})</option>
              </select>

              {/* Filter Status Pengalihan Jalur */}
              <select
                value={filterTransfer}
                onChange={(e) => setFilterTransfer(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Status Pengalihan</option>
                <option value="transferred">⚠️ Dialihkan Jalur ({transferredCount})</option>
                <option value="normal">Jalur Asli / Normal</option>
              </select>

              {/* Filter Jalur Pendaftaran & Status Refund */}
              <select
                value={filterCollective}
                onChange={(e) => setFilterCollective(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Jalur (Mandiri & Kolektif)</option>
                <option value="school_collective">Hanya Jalur Kolektif</option>
                <option value="needs_refund">⚠️ Perlu Refund Cash ({needRefundCount})</option>
                <option value="refunded">✅ Sudah Refund Cash ({refundedCashCount})</option>
                <option value="online_individual">Hanya Jalur Mandiri</option>
              </select>

              {/* Sesi Filter */}
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="accepted">Diterima</option>
                <option value="re_registered">Daftar Ulang Lunas</option>
                <option value="form_submitted">Formulir Lengkap</option>
                <option value="registered">Token Lunas</option>
                <option value="token_pending">Token Pending (Midtrans)</option>
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
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Cek calon murid yang belum melunasi daftar ulang sampai batas akhir dan alihkan ke gelombang berikutnya"
              >
                <ArrowLeftRight size={14} className={isProcessingAutoTransfer ? 'animate-spin' : ''} />
                <span>{isProcessingAutoTransfer ? 'Memproses...' : 'Proses Pengalihan'}</span>
              </button>

              {/* Promote to Grade 7 Button */}
              <select
                value={migrationTargetClass}
                onChange={(e) => setMigrationTargetClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold"
                title="Pilih Kelas Tujuan untuk Siswa yang Diterima"
              >
                <option value="7-A">Target: 7-A</option>
                <option value="7-B">Target: 7-B</option>
                <option value="7-C">Target: 7-C</option>
                <option value="7-D">Target: 7-D</option>
              </select>

              <button
                type="button"
                onClick={handlePromoteToStudents}
                disabled={isMigrating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
              >
                {isMigrating ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
                <span>Migrasi ke Kelas 7</span>
              </button>

              {/* Edit Massal NIS Button */}
              <button
                type="button"
                onClick={() => {
                  setBulkNisFilterClass('GRADE_7');
                  setIsBulkNisOpen(true);
                }}
                className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                title="Sesuaikan nomor NIS massal untuk siswa kelas 7 atau kelas lainnya (NISN tetap utuh)"
              >
                <Hash size={14} className="text-teal-700" />
                <span>Edit Massal NIS</span>
              </button>
            </div>
          </div>

          {/* Auto Transfer Notification Message */}
          {autoTransferMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight size={16} className="text-amber-700 shrink-0" />
                <span className="font-bold">{autoTransferMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoTransferMsg(null)}
                className="text-amber-700 hover:text-amber-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {migrationSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-bold">{migrationSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkNisFilterClass(migrationTargetClass);
                  setIsBulkNisOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
              >
                <Hash size={13} />
                <span>Sesuaikan NIS Massal</span>
              </button>
            </div>
          )}

          {/* Candidates Table - High Contrast Light Theme */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Calon Murid</th>
                    <th className="py-3.5 px-4">NISN / Asal Sekolah</th>
                    <th className="py-3.5 px-4">Jalur Pendaftaran</th>
                    <th className="py-3.5 px-4">Token Online & Refund Cash</th>
                    <th className="py-3.5 px-4">Data Formulir & Berkas</th>
                    <th className="py-3.5 px-4">Daftar Ulang</th>
                    <th className="py-3.5 px-4">Status Penerimaan</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        Belum ada calon murid terdaftar yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const isCollective = candidate.registrationType === 'school_collective';
                      const isTokenPending = candidate.tokenPaymentStatus === 'pending';
                      const isTokenPaid = !isTokenPending && (candidate.tokenPaymentStatus === 'paid' || candidate.tokenPaid);
                      const isRefunded = candidate.collectiveRefundStatus === 'refunded';
                      const isMaarif = candidate.schoolOriginType === 'maarif_jogosari' || (candidate.schoolOrigin || '').toUpperCase().includes('MAARIF');

                      return (
                        <tr key={candidate.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Nama Calon Murid */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                candidate.gender === 'P' || (candidate.gender as string) === 'female'
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {candidate.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 m-0">{candidate.fullName}</p>
                                <p className="text-[10px] text-slate-500 m-0">
                                  {candidate.gender === 'P' || (candidate.gender as string) === 'female' ? 'Perempuan' : 'Laki-laki'} • {candidate.phone || '-'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* NISN & Asal Sekolah */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-900 font-bold">{candidate.nisn}</span>
                            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {isMaarif ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                                  <Sparkles size={10} className="text-emerald-700" />
                                  <span>SD Ma'arif</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-600 font-medium">{candidate.schoolOrigin || 'SD Lainnya'}</span>
                              )}
                            </div>
                          </td>

                          {/* Jalur Pendaftaran & Sesi Gelombang */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              {/* Sesi Gelombang */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold uppercase">
                                  {candidate.sessionId === 'inden' ? 'Jalur Inden' : candidate.sessionId === 'gelombang-1' ? 'Gelombang 1' : candidate.sessionId === 'gelombang-2' ? 'Gelombang 2' : candidate.sessionId}
                                </span>

                                {isCollective ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black">
                                    <GraduationCap size={11} className="text-indigo-700" />
                                    <span>Kolektif</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">
                                    <span>Mandiri</span>
                                  </span>
                                )}
                              </div>

                              {/* Status Pengalihan Otomatis */}
                              {candidate.isTransferredSession && (
                                <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-300 space-y-1">
                                  <div className="flex items-center gap-1 text-[10px] text-rose-900 font-black">
                                    <ArrowLeftRight size={11} className="text-rose-600 shrink-0" />
                                    <span>Dialihkan dari {candidate.previousSessionId === 'inden' ? 'Jalur Inden' : candidate.previousSessionId === 'gelombang-1' ? 'Gelombang 1' : (candidate.previousSessionId || candidate.originalSessionId || 'Sesi Sebelumnya')}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRevertTransfer(candidate)}
                                    disabled={isRevertingTransfer}
                                    className="w-full px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] rounded flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
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
                                  className="text-[10px] text-slate-500 hover:text-indigo-700 underline font-medium cursor-pointer"
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
                              <div className="flex flex-col items-start gap-1">
                                {isTokenPaid ? (
                                  <>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      Online Lunas (Rp 50rb)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReceiptModalCandidate(candidate);
                                        setReceiptModalType('token');
                                        setIsReceiptModalOpen(true);
                                      }}
                                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Cetak Kuitansi Resmi Token Pendaftaran"
                                    >
                                      <Printer size={11} />
                                      <span>Cetak Kuitansi</span>
                                    </button>
                                  </>
                                ) : isTokenPending ? (
                                  <div className="space-y-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                                      <Clock size={10} className="text-amber-600" />
                                      <span>Pending Midtrans</span>
                                    </span>
                                    {candidate.tokenExpiryTime && (
                                      <p className="text-[9px] text-slate-500 m-0">
                                        Batas: {candidate.tokenExpiryTime.replace(' ', ' ').slice(0, 16)}
                                      </p>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCheckCandidateMidtrans(candidate)}
                                      className="text-[10px] text-indigo-700 hover:text-indigo-900 underline font-bold flex items-center gap-1 cursor-pointer"
                                      title="Cek status terkini ke Midtrans"
                                    >
                                      <RefreshCw size={10} />
                                      <span>Cek Midtrans</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                    Belum Bayar Token
                                  </span>
                                )}
                              </div>

                              {/* Status & Aksi Pengembalian Token (Khusus Kolektif) */}
                              {isCollective && isTokenPaid && (
                                <div className="pt-1 border-t border-slate-200">
                                  {isRefunded ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                        <span>Cash Rp {(candidate.collectiveRefundAmount || 50000).toLocaleString('id-ID')} Dikembalikan</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setReceiptCandidate(candidate)}
                                          className="text-[10px] text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer"
                                        >
                                          Kuitansi Refund
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelRefund(candidate)}
                                          className="text-[10px] text-rose-600 hover:text-rose-800 cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRefundModal(candidate)}
                                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
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

                          {/* Status Data Lengkap Formulir & Berkas */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <div>
                                {candidate.isFormCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <CheckCircle2 size={11} className="text-emerald-700" />
                                    <span>Form Lengkap</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-900 border border-amber-300">
                                    <Clock size={10} className="text-amber-600" />
                                    <span>Form Belum</span>
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const hasFoto = Boolean(candidate.documents?.pasPhoto || candidate.fullFormData?.documents?.pasPhoto);
                                const hasKk = Boolean(candidate.documents?.kkPhoto || candidate.fullFormData?.documents?.kkPhoto);
                                const hasAkta = Boolean(candidate.documents?.aktaPhoto || candidate.fullFormData?.documents?.aktaPhoto);
                                const hasKtp = Boolean(candidate.documents?.ktpAyahPhoto || candidate.documents?.ktpPhoto || candidate.documents?.ktp || candidate.documents?.ktpIbuPhoto || candidate.fullFormData?.documents?.ktpAyahPhoto || candidate.fullFormData?.documents?.ktpPhoto || candidate.fullFormData?.documents?.ktpIbuPhoto);
                                const allDocs = hasFoto && hasKk && hasAkta && hasKtp;
                                const hasAnyDoc = hasFoto || hasKk || hasAkta || hasKtp;

                                return (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {allDocs ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                          <CheckCircle2 size={10} className="text-emerald-700" />
                                          <span>Berkas Lengkap</span>
                                        </span>
                                      ) : hasAnyDoc ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                          <FileText size={10} className="text-blue-700" />
                                          <span>Berkas Sebagian</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-300">
                                          <Clock size={10} className="text-slate-400" />
                                          <span>Berkas Belum</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
                                      <span className={hasFoto ? 'text-emerald-700 font-bold' : 'text-slate-400'} title="Pas Foto">📸Foto</span>•
                                      <span className={hasKk ? 'text-emerald-700 font-bold' : 'text-slate-400'} title="Kartu Keluarga">📜KK</span>•
                                      <span className={hasAkta ? 'text-emerald-700 font-bold' : 'text-slate-400'} title="Akta Kelahiran">📄Akta</span>•
                                      <span className={hasKtp ? 'text-emerald-700 font-bold' : 'text-slate-400'} title="KTP Ortu/Wali">🪪KTP</span>
                                    </div>
                                  </div>
                                );
                              })()}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCandidate(candidate)}
                                  className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                                >
                                  Lihat Biodata & Berkas
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Status Daftar Ulang */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {candidate.reRegistrationStatus === 'paid' ? (
                                <>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 block w-fit">
                                    LUNAS (Uk. {candidate.selectedUniformSize || 'L'})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReceiptModalCandidate(candidate);
                                      setReceiptModalType('rereg');
                                      setIsReceiptModalOpen(true);
                                    }}
                                    className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Cetak Kuitansi Resmi Daftar Ulang & Seragam"
                                  >
                                    <Printer size={11} />
                                    <span>Cetak Kuitansi DU</span>
                                  </button>
                                </>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                  Belum Lunas
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Penerimaan */}
                          <td className="py-3.5 px-4">
                            {candidate.isPromotedToStudent ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300">
                                Siswa Aktif ({candidate.assignedClass || '7-A'})
                              </span>
                            ) : candidate.status === 'accepted' && isTokenPaid ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-xs">
                                DITERIMA
                              </span>
                            ) : candidate.status === 'rejected' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-900 border border-rose-300">
                                DITOLAK
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
                                Menunggu Verifikasi
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReconcileCandidate(candidate.nisn)}
                                disabled={isReconcilingSingle && reconcileCandidateActionId === candidate.nisn}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors cursor-pointer border border-emerald-300"
                                title="Rekonsiliasi Live Pembayaran di Midtrans"
                              >
                                <ArrowLeftRight size={14} className={isReconcilingSingle && reconcileCandidateActionId === candidate.nisn ? 'animate-spin text-emerald-600' : ''} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedCandidate(candidate)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-300"
                                title="Lihat Detail & Buku Induk"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCandidate(candidate.id, candidate.fullName)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer border border-rose-200"
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

      {/* ================= TAB 2: LAPORAN KEUANGAN SPMB ================= */}
      {activeTab === 'finance' && config && (
        <SpmbFinanceReport
          candidates={candidates}
          config={config}
          schoolIdentity={currentSchoolIdentity}
        />
      )}

      {/* ================= TAB 3: REKONSILIASI PEMBAYARAN MIDTRANS SPMB ================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Header Panel Rekonsiliasi SPMB */}
          <div className="bg-white border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    <span>Rekonsiliasi Otomatis Midtrans SPMB</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold">
                    {candidates.length} Calon Terdaftar
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
                  Sinkronisasi & Rekonsiliasi Status Pembayaran SPMB
                </h3>
                <p className="text-xs text-slate-600 font-medium m-0 max-w-3xl">
                  Memeriksa, mencocokkan, dan memperbarui status pembayaran <strong>Token Pendaftaran (Rp 50.000)</strong> serta <strong>Daftar Ulang & Seragam</strong> secara langsung dari gateway Midtrans ke database lokal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleReconcileAll}
                  disabled={isReconcilingAll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw size={15} className={isReconcilingAll ? 'animate-spin' : ''} />
                  <span>{isReconcilingAll ? 'Memeriksa ke Midtrans...' : 'Jalankan Rekonsiliasi Massal (Semua Calon)'}</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-xs font-bold text-emerald-900 block">Token Terverifikasi</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{tokenPaidCount}</span>
                <span className="text-[10px] text-emerald-600 font-medium">Rp {(tokenPaidCount * 50000).toLocaleString('id-ID')}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-center">
                <span className="text-xs font-bold text-teal-900 block">Daftar Ulang Lunas</span>
                <span className="text-2xl font-black text-teal-700 mt-1 block">{reRegPaidCount}</span>
                <span className="text-[10px] text-teal-600 font-medium">Calon Murid</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-xs font-bold text-blue-900 block">Biodata & Form Lengkap</span>
                <span className="text-2xl font-black text-blue-700 mt-1 block">{formCompletedCount}</span>
                <span className="text-[10px] text-blue-600 font-medium">Buku Induk</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                <span className="text-xs font-bold text-purple-900 block">Total Calon Diterima</span>
                <span className="text-2xl font-black text-purple-700 mt-1 block">{acceptedCount}</span>
                <span className="text-[10px] text-purple-600 font-medium">Lunas & Siap Masuk</span>
              </div>
            </div>

            {/* Form Rekonsiliasi Cepat Per Calon Murid (Berdasarkan NISN / Order ID) */}
            <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                <Search size={15} className="text-emerald-700" />
                <span>Pemeriksaan & Rekonsiliasi Calon Murid Tunggal</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Masukkan NISN, Nomor Registrasi, atau Order ID Midtrans..."
                    value={reconcileSearchNisn}
                    onChange={(e) => setReconcileSearchNisn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleReconcileCandidate()}
                  disabled={isReconcilingSingle}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <ArrowLeftRight size={14} className={isReconcilingSingle ? 'animate-spin' : ''} />
                  <span>{isReconcilingSingle ? 'Memeriksa...' : 'Periksa & Rekonsiliasi'}</span>
                </button>

                {/* Quick shortcut for NISN 0156620618 */}
                <button
                  type="button"
                  onClick={() => {
                    setReconcileSearchNisn('0156620618');
                    handleReconcileCandidate('0156620618');
                  }}
                  className="px-3.5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                  title="Cek & Rekonsiliasi langsung untuk calon murid NISN 0156620618"
                >
                  <CheckCircle2 size={14} className="text-emerald-700" />
                  <span>Cek NISN: 0156620618</span>
                </button>
              </div>

              {/* Single Reconcile Message Banner */}
              {reconcileSingleMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border ${
                  reconcileSingleMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300' 
                    : 'bg-rose-50 text-rose-950 border-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {reconcileSingleMsg.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-700 shrink-0" /> : <AlertTriangle size={16} className="text-rose-700 shrink-0" />}
                    <span>{reconcileSingleMsg.text}</span>
                  </div>
                  <button type="button" onClick={() => setReconcileSingleMsg(null)} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Bulk Reconcile Result Summary */}
              {reconcileResult && (
                <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-900 flex items-center gap-1.5 font-black text-sm">
                      <CheckCircle2 size={16} className="text-emerald-700" />
                      <span>{reconcileResult.message}</span>
                    </strong>
                    <button type="button" onClick={() => setReconcileResult(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-semibold text-slate-700">
                    <div>Total Diperiksa: <strong>{reconcileResult.totalChecked} Calon</strong></div>
                    <div>Berhasil Direkonsiliasi: <strong>{reconcileResult.reconciledCount} Transaksi</strong></div>
                    <div>Diperbarui di DB: <strong>{reconcileResult.updatedCount} Calon</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabel Status Rekonsiliasi Calon Murid SPMB */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users size={15} className="text-emerald-700" />
                <span>Daftar Status Pembayaran & Rekonsiliasi Calon Murid ({candidates.length})</span>
              </h4>
              <span className="text-xs text-slate-500 font-semibold">
                Klik tombol "Rekonsiliasi" pada setiap baris untuk verifikasi live
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Calon Murid / NISN</th>
                    <th className="py-3 px-4">Asal SD & Sesi</th>
                    <th className="py-3 px-4">Token Formulir</th>
                    <th className="py-3 px-4">Daftar Ulang & Seragam</th>
                    <th className="py-3 px-4">Buku Induk & Berkas</th>
                    <th className="py-3 px-4">Status SPMB</th>
                    <th className="py-3 px-4 text-center">Aksi Rekonsiliasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {candidates.map((cand) => {
                    const isTokenPaid = cand.tokenPaid || cand.tokenPaymentStatus === 'paid';
                    const isReregPaid = cand.reRegistrationStatus === 'paid';
                    const isFormDone = cand.isFormCompleted;
                    const hasDocs = Boolean(cand.documents?.pasPhoto || cand.documents?.kkPhoto || cand.documents?.aktaPhoto || cand.documents?.ktpAyahPhoto || cand.documents?.ktpIbuPhoto || cand.fullFormData?.documents?.pasPhoto);

                    return (
                      <tr key={cand.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="font-extrabold text-slate-900">{cand.fullName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="font-mono font-bold text-emerald-800">NISN: {cand.nisn}</span>
                            <span>•</span>
                            <span className="text-slate-600">{cand.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-semibold">{cand.schoolOrigin || '-'}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {cand.sessionId.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isTokenPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 size={11} className="text-emerald-700" />
                              <span>Lunas (Rp 50rb)</span>
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={10} className="text-amber-700" />
                                <span>Belum Lunas</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleManualSetPayment(cand, 'token', 'paid')}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold block underline cursor-pointer"
                              >
                                Set Lunas Tunai
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isReregPaid ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-900 border border-teal-300">
                                <CheckCircle2 size={11} className="text-teal-700" />
                                <span>LUNAS DAFTAR ULANG</span>
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {cand.reRegistrationMethod || 'Midtrans Online'}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={10} className="text-amber-700" />
                                <span>Belum Lunas</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleManualSetPayment(cand, 'reregistration', 'paid')}
                                className="text-[10px] text-teal-700 hover:text-teal-900 font-bold block underline cursor-pointer"
                              >
                                Set Lunas Tunai (Loket)
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div>
                              {isFormDone ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                  <Check size={10} className="text-blue-700 font-bold" />
                                  <span>Buku Induk Lengkap</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-900 border border-amber-300">
                                  <span>Form Belum</span>
                                </span>
                              )}
                            </div>
                            <div>
                              {(() => {
                                const docFoto = Boolean(cand.documents?.pasPhoto || cand.fullFormData?.documents?.pasPhoto);
                                const docKk = Boolean(cand.documents?.kkPhoto || cand.fullFormData?.documents?.kkPhoto);
                                const docAkta = Boolean(cand.documents?.aktaPhoto || cand.fullFormData?.documents?.aktaPhoto);
                                const docKtp = Boolean(cand.documents?.ktpAyahPhoto || cand.documents?.ktpPhoto || cand.documents?.ktp || cand.documents?.ktpIbuPhoto || cand.fullFormData?.documents?.ktpAyahPhoto || cand.fullFormData?.documents?.ktpPhoto);
                                const allDocs = docFoto && docKk && docAkta && docKtp;

                                return (
                                  <div className="space-y-0.5">
                                    {allDocs ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                        <CheckCircle2 size={10} className="text-emerald-700" />
                                        <span>Berkas Lengkap (5/5)</span>
                                      </span>
                                    ) : hasDocs ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                        <FileText size={10} className="text-blue-700" />
                                        <span>Berkas Sebagian</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-300">
                                        <span>Berkas Belum</span>
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1 text-[8.5px] font-mono text-slate-600">
                                      <span className={docFoto ? 'text-emerald-700 font-bold' : 'text-slate-400'}>📸Foto</span>•
                                      <span className={docKk ? 'text-emerald-700 font-bold' : 'text-slate-400'}>📜KK</span>•
                                      <span className={docAkta ? 'text-emerald-700 font-bold' : 'text-slate-400'}>📄Akta</span>•
                                      <span className={docKtp ? 'text-emerald-700 font-bold' : 'text-slate-400'}>🪪KTP</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {cand.status === 'accepted' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-xs">
                              DITERIMA
                            </span>
                          ) : cand.status === 're_registered' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-900 border border-teal-300">
                              DAFTAR ULANG
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
                              {cand.status || 'TERDAFTAR'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReconcileCandidate(cand.nisn)}
                              disabled={isReconcilingSingle && reconcileCandidateActionId === cand.nisn}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                              title="Rekonsiliasi Langsung ke Midtrans"
                            >
                              <ArrowLeftRight size={11} className={isReconcilingSingle && reconcileCandidateActionId === cand.nisn ? 'animate-spin' : ''} />
                              <span>Rekonsiliasi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCandidate(cand)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-300"
                              title="Lihat Detail & Berkas"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PENGATURAN SESI PENDAFTARAN ================= */}
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
                    ? 'Formulir pendaftaran online dapat diakses dan menerima pendaftaran calon murid baru.' 
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
                  Otomatis memindahkan calon murid yang belum melunasi daftar ulang hingga tanggal batas akhir (endDate) ke gelombang selanjutnya. Panitia dapat membatalkan dan mengembalikan jalur calon murid kapan saja.
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

                  {/* Bonus Seragam Olahraga untuk LP Maarif */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    (session.sportsUniformBonusForMaarif ?? (session.id === 'inden'))
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : 'bg-slate-900 border-slate-800'
                  }`}>
                    <div className="space-y-0.5 pr-2">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer" htmlFor={`bonus-maarif-${session.id}`}>
                        <span>🎁 Bonus 1 Set Seragam Olahraga</span>
                        {session.id === 'inden' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-extrabold uppercase border border-amber-500/30">
                            Khusus Inden
                          </span>
                        )}
                      </label>
                      <p className="text-[10px] text-slate-400 m-0">
                        Gratis 1 set seragam olahraga (senilai Rp 175.000) bagi pendaftar dari SD/MI LP. Ma'arif.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        id={`bonus-maarif-${session.id}`}
                        type="checkbox"
                        checked={session.sportsUniformBonusForMaarif ?? (session.id === 'inden')}
                        onChange={(e) => {
                          const updated = config.sessions.map(s => s.id === session.id ? { ...s, sportsUniformBonusForMaarif: e.target.checked } : s);
                          setConfig({ ...config, sessions: updated });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
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
                  Tahun ajaran ini otomatis disinkronkan ke seluruh halaman portal SPMB, nomor registrasi calon murid, kuitansi pendaftaran, hingga kuitansi pengembalian token cash.
                </p>
              </div>
            </div>

            {/* SETTING NOMOR KONTAK WHATSAPP / TELEPON PANITIA SPMB */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border-2 border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <Phone size={18} />
                  <span>Nomor Kontak WhatsApp / HP Panitia SPMB</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                  Helpdesk & Narahubung
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nomor WhatsApp / HP Panitia (Contoh: 085171151655 atau 081234567890)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                      <Phone size={14} className="text-emerald-400 inline mr-1" />
                    </span>
                    <input
                      type="text"
                      value={config.contactPhone || ''}
                      onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                      placeholder="085171151655"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold font-mono focus:border-emerald-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Nomor ini otomatis disinkronkan ke seluruh tombol WhatsApp, rujukan konsultasi pendaftaran wali murid, dan helpdesk pendaftaran SPMB.
                </p>
              </div>
            </div>

            {/* SETTING TANDA TANGAN & STEMPEL RESMI KUITANSI SPMB */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/50 border-2 border-emerald-500/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <span>Tanda Tangan Panitia Pelayanan, Ketua SPMB & Stempel Resmi Kuitansi</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                  Legalitas & Keabsahan Cetak
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. KETUA PANITIA SPMB */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">1. Ketua Panitia SPMB</span>
                      <span className="text-[10px] text-slate-400 font-mono">Penandatangan Token</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Nama Lengkap & Gelar Ketua SPMB
                      </label>
                      <input
                        type="text"
                        value={config.spmbChairName || ''}
                        onChange={(e) => setConfig({ ...config, spmbChairName: e.target.value })}
                        placeholder="Contoh: Drs. H. M. Sholihuddin"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Sebutan Jabatan
                      </label>
                      <input
                        type="text"
                        value={config.spmbChairTitle || 'Ketua Panitia SPMB'}
                        onChange={(e) => setConfig({ ...config, spmbChairTitle: e.target.value })}
                        placeholder="Ketua Panitia SPMB"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:border-emerald-500"
                      />
                    </div>

                    {/* Upload TTD Ketua SPMB */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                        <span>Upload TTD Digital Ketua</span>
                        {config.spmbChairSignatureUrl && (
                          <span className="text-[10px] text-emerald-400 font-bold">✓ TTD Aktif</span>
                        )}
                      </label>
                      
                      {config.spmbChairSignatureUrl ? (
                        <div className="p-2 bg-white/95 rounded-xl border border-slate-600 flex items-center justify-between gap-2 mb-2">
                          <img 
                            src={config.spmbChairSignatureUrl} 
                            alt="TTD Ketua" 
                            className="h-9 max-w-[100px] object-contain" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...config, spmbChairSignatureUrl: undefined };
                              setConfig(updated);
                              handleSaveConfig(updated);
                            }}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                            title="Hapus TTD"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : null}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleUploadConfigImage('spmbChairSignatureUrl', e)}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. BENDAHARA PANITIA SPMB */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-400 uppercase tracking-wide">2. Bendahara SPMB</span>
                      <span className="text-[10px] text-slate-400 font-mono">Daftar Ulang</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Nama Lengkap Bendahara SPMB
                      </label>
                      <input
                        type="text"
                        value={config.spmbTreasurerName || ''}
                        onChange={(e) => setConfig({ ...config, spmbTreasurerName: e.target.value })}
                        placeholder="Contoh: Hj. Siti Aisyah, S.E."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Sebutan Jabatan
                      </label>
                      <input
                        type="text"
                        value={config.spmbTreasurerTitle || 'Bendahara Panitia SPMB'}
                        onChange={(e) => setConfig({ ...config, spmbTreasurerTitle: e.target.value })}
                        placeholder="Bendahara Panitia SPMB"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:border-cyan-500"
                      />
                    </div>

                    {/* Upload TTD Bendahara SPMB */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                        <span>Upload TTD Digital Bendahara</span>
                        {config.spmbTreasurerSignatureUrl && (
                          <span className="text-[10px] text-cyan-400 font-bold">✓ TTD Aktif</span>
                        )}
                      </label>
                      
                      {config.spmbTreasurerSignatureUrl ? (
                        <div className="p-2 bg-white/95 rounded-xl border border-slate-600 flex items-center justify-between gap-2 mb-2">
                          <img 
                            src={config.spmbTreasurerSignatureUrl} 
                            alt="TTD Bendahara" 
                            className="h-9 max-w-[100px] object-contain" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...config, spmbTreasurerSignatureUrl: undefined };
                              setConfig(updated);
                              handleSaveConfig(updated);
                            }}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                            title="Hapus TTD"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : null}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleUploadConfigImage('spmbTreasurerSignatureUrl', e)}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. PANITIA PELAYANAN SEKOLAH / LOKET SPMB */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-400 uppercase tracking-wide">3. Petugas Pelayanan SPMB</span>
                      <span className="text-[10px] text-slate-400 font-mono">Pelayanan Kantor</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Nama Petugas (Bisa Dikosongi / Titik-Titik)
                      </label>
                      <input
                        type="text"
                        value={config.spmbOfficerName || ''}
                        onChange={(e) => setConfig({ ...config, spmbOfficerName: e.target.value })}
                        placeholder="( .................................... )"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:border-indigo-500 font-mono placeholder:text-slate-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        * Jika dikosongi, di kuitansi akan otomatis tercetak <em>( .................................... )</em> untuk diparaf petugas loket.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Sebutan Jabatan Pelayanan
                      </label>
                      <input
                        type="text"
                        value={config.spmbOfficerTitle || 'Panitia Pelayanan SPMB'}
                        onChange={(e) => setConfig({ ...config, spmbOfficerTitle: e.target.value })}
                        placeholder="Panitia Pelayanan SPMB"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:border-indigo-500"
                      />
                    </div>

                    {/* Upload TTD Panitia Pelayanan */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                        <span>Upload TTD Digital Petugas (Opsional)</span>
                        {config.spmbOfficerSignatureUrl && (
                          <span className="text-[10px] text-indigo-400 font-bold">✓ TTD Aktif</span>
                        )}
                      </label>
                      
                      {config.spmbOfficerSignatureUrl ? (
                        <div className="p-2 bg-white/95 rounded-xl border border-slate-600 flex items-center justify-between gap-2 mb-2">
                          <img 
                            src={config.spmbOfficerSignatureUrl} 
                            alt="TTD Panitia" 
                            className="h-9 max-w-[100px] object-contain" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...config, spmbOfficerSignatureUrl: undefined };
                              setConfig(updated);
                              handleSaveConfig(updated);
                            }}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                            title="Hapus TTD"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : null}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleUploadConfigImage('spmbOfficerSignatureUrl', e)}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. STEMPEL RESMI PANITIA SPMB */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wide">4. Stempel Resmi SPMB</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">Samping Kiri TTD</span>
                    </div>

                    <p className="text-[10px] text-slate-300 leading-relaxed m-0">
                      Stempel SPMB <strong>otomatis disandingkan di sebelah kiri Nama & TTD Ketua/Bendahara</strong> pada Kuitansi Pembayaran Token dan Daftar Ulang.
                    </p>

                    {/* Upload Stempel SPMB */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                        <span>Upload File Stempel (PNG Transparan)</span>
                        {config.spmbStampUrl && (
                          <span className="text-[10px] text-emerald-400 font-bold">✓ Stempel Aktif</span>
                        )}
                      </label>
                      
                      {config.spmbStampUrl ? (
                        <div className="p-2 bg-slate-800/90 rounded-xl border border-slate-600 flex items-center justify-between gap-2 mb-2">
                          <div className="p-1 bg-white rounded-lg">
                            <img 
                              src={config.spmbStampUrl} 
                              alt="Stempel SPMB" 
                              className="h-9 max-w-[80px] object-contain" 
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...config, spmbStampUrl: undefined };
                              setConfig(updated);
                              handleSaveConfig(updated);
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg text-xs font-bold cursor-pointer"
                            title="Hapus Stempel"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : null}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleUploadConfigImage('spmbStampUrl', e)}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSaveConfig(config)}
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isSavingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Simpan Semua Pengaturan Legalitas & Stempel SPMB</span>
                </button>
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

                    {/* Bonus Seragam Olahraga Khusus Sesi Inden bagi SD/MI LP Maarif */}
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                            <span>🎁 Bonus 1 Set Seragam Olahraga (Sesi Inden Khusus SD/MI LP. Ma'arif)</span>
                          </label>
                          <p className="text-[10px] text-slate-300 m-0">
                            Pendaftar Sesi Inden dari SD/MI lingkungan LP. Ma'arif (termasuk SD Maarif Jogosari) mendapatkan gratis 1 setel seragam olahraga senilai Rp 175.000.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={config.maarifIndenSportsUniformBonus ?? true}
                            onChange={(e) => setConfig({ ...config, maarifIndenSportsUniformBonus: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
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
                Simulasi Rincian Daftar Ulang Murid Baru ({currentAcademicYear})
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

                            {(sess.sportsUniformBonusForMaarif ?? (sess.id === 'inden')) && (
                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-semibold space-y-0.5">
                                <div className="flex items-center gap-1 font-bold text-amber-200">
                                  <span>🎁 Bonus SD/MI LP. Ma'arif:</span>
                                </div>
                                <p className="m-0 text-slate-300">
                                  Gratis 1 Set Seragam Olahraga (potongan Rp 175.000 saat daftar ulang).
                                </p>
                              </div>
                            )}
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
                  <span className="text-slate-600 font-medium">Nama Calon Murid</span>
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
                {(() => {
                  const fallbackPhoto = generateAuthenticPasPhotoSvgDataUrl(selectedCandidate);
                  const photoSrc = selectedCandidate.documents?.pasPhoto || (selectedCandidate.fullFormData as any)?.documents?.pasPhoto || selectedCandidate.photoUrl || fallbackPhoto;
                  return (
                    <img 
                      src={photoSrc} 
                      alt={`Pas Foto ${selectedCandidate.fullName}`} 
                      className="w-32 h-40 object-cover rounded-2xl border-2 border-slate-700 mx-auto bg-slate-800" 
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== fallbackPhoto) target.src = fallbackPhoto;
                      }}
                    />
                  );
                })()}

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

                  {/* Kuitansi Resmi SPMB (Kop Resmi Pengaturan Web Utama) */}
                  <div className="pt-2.5 border-t border-slate-700/80 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cetak Dokumen Resmi:
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await printRegistrationProofDirect(selectedCandidate, config, schoolIdentity);
                        }}
                        className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Printer size={13} />
                        <span>Cetak Bukti Pendaftaran & Status Kelulusan (A4)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReceiptModalCandidate(selectedCandidate);
                          setReceiptModalType('token');
                          setIsReceiptModalOpen(true);
                        }}
                        className="w-full py-2 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Printer size={13} />
                        <span>Kuitansi Token Lunas (KOP Resmi)</span>
                      </button>

                      {selectedCandidate.reRegistrationStatus === 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptModalCandidate(selectedCandidate);
                            setReceiptModalType('rereg');
                            setIsReceiptModalOpen(true);
                          }}
                          className="w-full py-2 bg-cyan-800/60 hover:bg-cyan-700 border border-cyan-500/40 text-cyan-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Printer size={13} />
                          <span>Kuitansi Daftar Ulang & Seragam (KOP Resmi)</span>
                        </button>
                      )}
                    </div>
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
                    <div><strong className="text-slate-400">No HP Siswa:</strong> {selectedCandidate.studentPhone || '-'}</div>
                    <div><strong className="text-slate-400">No Akta Lahir:</strong> {selectedCandidate.birthCertNumber || '-'}</div>
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

                {/* Uploaded Documents Thumbnails & Admin Document Upload */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-emerald-400 text-xs uppercase">3. Berkas Dokumen Terunggah</h4>
                    <span className="text-[10px] text-slate-400 font-medium">Unggah atau ganti berkas dokumen</span>
                  </div>

                  {(() => {
                    const docPasFoto = selectedCandidate.documents?.pasPhoto || selectedCandidate.fullFormData?.documents?.pasPhoto;
                    const docKk = selectedCandidate.documents?.kkPhoto || selectedCandidate.fullFormData?.documents?.kkPhoto;
                    const docAkta = selectedCandidate.documents?.aktaPhoto || selectedCandidate.fullFormData?.documents?.aktaPhoto;
                    const docKtpAyah = selectedCandidate.documents?.ktpAyahPhoto || selectedCandidate.documents?.ktpPhoto || selectedCandidate.documents?.ktp || selectedCandidate.fullFormData?.documents?.ktpAyahPhoto || selectedCandidate.fullFormData?.documents?.ktpPhoto || selectedCandidate.fullFormData?.documents?.ktp;
                    const docKtpIbu = selectedCandidate.documents?.ktpIbuPhoto || selectedCandidate.fullFormData?.documents?.ktpIbuPhoto;

                    const isImg = (url?: string) => {
                      if (!url) return false;
                      const lower = url.toLowerCase();
                      if (lower.startsWith('data:image')) return true;
                      if (lower.endsWith('.pdf') || lower.startsWith('data:application/pdf')) return false;
                      return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.svg') || lower.startsWith('/uploads') || lower.startsWith('http');
                    };

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {/* Pas Foto */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-300 block font-bold mb-1">1. Pas Foto (3x4)</span>
                            {docPasFoto ? (
                              <div className="space-y-1">
                                {isImg(docPasFoto) ? (
                                  <img src={docPasFoto} alt="Pas Foto" className="w-full h-24 object-contain rounded-lg border border-slate-700 mx-auto bg-slate-950/60 p-0.5" />
                                ) : (
                                  <div className="w-full h-24 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-emerald-400 font-bold border border-slate-700">
                                    📄 Berkas Dokumen
                                  </div>
                                )}
                                <a href={docPasFoto} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 font-bold block hover:underline">
                                  Buka Dokumen Asli ↗
                                </a>
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                                Belum Ada
                              </div>
                            )}
                          </div>
                          <label className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold block cursor-pointer transition-colors">
                            <span>{docPasFoto ? 'Ganti Foto' : 'Unggah Foto'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAdminUploadDocument(selectedCandidate, 'pasPhoto', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* KK */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-300 block font-bold mb-1">2. Kartu Keluarga</span>
                            {docKk ? (
                              <div className="space-y-1">
                                {isImg(docKk) ? (
                                  <img src={docKk} alt="KK" className="w-full h-24 object-contain rounded-lg border border-slate-700 mx-auto bg-slate-950/60 p-0.5" />
                                ) : (
                                  <div className="w-full h-24 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-emerald-400 font-bold border border-slate-700">
                                    📄 File PDF / Berkas
                                  </div>
                                )}
                                <a href={docKk} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 font-bold block hover:underline">
                                  Buka Dokumen Asli ↗
                                </a>
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                                Belum Ada
                              </div>
                            )}
                          </div>
                          <label className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold block cursor-pointer transition-colors">
                            <span>{docKk ? 'Ganti KK' : 'Unggah KK'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAdminUploadDocument(selectedCandidate, 'kkPhoto', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* Akta */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-300 block font-bold mb-1">3. Akta Kelahiran</span>
                            {docAkta ? (
                              <div className="space-y-1">
                                {isImg(docAkta) ? (
                                  <img src={docAkta} alt="Akta" className="w-full h-24 object-contain rounded-lg border border-slate-700 mx-auto bg-slate-950/60 p-0.5" />
                                ) : (
                                  <div className="w-full h-24 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-emerald-400 font-bold border border-slate-700">
                                    📄 File PDF / Berkas
                                  </div>
                                )}
                                <a href={docAkta} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 font-bold block hover:underline">
                                  Buka Dokumen Asli ↗
                                </a>
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                                Belum Ada
                              </div>
                            )}
                          </div>
                          <label className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold block cursor-pointer transition-colors">
                            <span>{docAkta ? 'Ganti Akta' : 'Unggah Akta'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAdminUploadDocument(selectedCandidate, 'aktaPhoto', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* KTP Ayah / Wali */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-300 block font-bold mb-1">4. KTP Ayah / Wali</span>
                            {docKtpAyah ? (
                              <div className="space-y-1">
                                {isImg(docKtpAyah) ? (
                                  <img src={docKtpAyah} alt="KTP Ayah" className="w-full h-24 object-contain rounded-lg border border-slate-700 mx-auto bg-slate-950/60 p-0.5" />
                                ) : (
                                  <div className="w-full h-24 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-emerald-400 font-bold border border-slate-700">
                                    📄 File PDF / Berkas
                                  </div>
                                )}
                                <a href={docKtpAyah} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 font-bold block hover:underline">
                                  Buka Dokumen Asli ↗
                                </a>
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                                Belum Ada
                              </div>
                            )}
                          </div>
                          <label className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold block cursor-pointer transition-colors">
                            <span>{docKtpAyah ? 'Ganti KTP' : 'Unggah KTP'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAdminUploadDocument(selectedCandidate, 'ktpAyahPhoto', f);
                              }}
                            />
                          </label>
                        </div>

                        {/* KTP Ibu */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-300 block font-bold mb-1">5. KTP Ibu</span>
                            {docKtpIbu ? (
                              <div className="space-y-1">
                                {isImg(docKtpIbu) ? (
                                  <img src={docKtpIbu} alt="KTP Ibu" className="w-full h-24 object-contain rounded-lg border border-slate-700 mx-auto bg-slate-950/60 p-0.5" />
                                ) : (
                                  <div className="w-full h-24 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-emerald-400 font-bold border border-slate-700">
                                    📄 File PDF / Berkas
                                  </div>
                                )}
                                <a href={docKtpIbu} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 font-bold block hover:underline">
                                  Buka Dokumen Asli ↗
                                </a>
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                                Belum Ada
                              </div>
                            )}
                          </div>
                          <label className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold block cursor-pointer transition-colors">
                            <span>{docKtpIbu ? 'Ganti KTP' : 'Unggah KTP'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAdminUploadDocument(selectedCandidate, 'ktpIbuPhoto', f);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Quick Payment & Reconciliation Controls */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-850 border border-emerald-500/30 space-y-3">
                  <h4 className="font-black text-emerald-400 text-xs uppercase flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Kontrol Rekonsiliasi & Pembayaran</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleReconcileCandidate(selectedCandidate.nisn)}
                      disabled={isReconcilingSingle}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ArrowLeftRight size={13} className={isReconcilingSingle ? 'animate-spin' : ''} />
                      <span>Rekonsiliasi Live Midtrans</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManualSetPayment(selectedCandidate, 'token', selectedCandidate.tokenPaid ? 'unpaid' : 'paid')}
                      className={`px-3 py-2 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border ${
                        selectedCandidate.tokenPaid 
                          ? 'bg-amber-950/60 text-amber-200 border-amber-500/40 hover:bg-amber-900' 
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      <Coins size={13} />
                      <span>{selectedCandidate.tokenPaid ? 'Reset Token Belum Lunas' : 'Tandai Token LUNAS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManualSetPayment(selectedCandidate, 'reregistration', selectedCandidate.reRegistrationStatus === 'paid' ? 'unpaid' : 'paid')}
                      className={`px-3 py-2 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border ${
                        selectedCandidate.reRegistrationStatus === 'paid' 
                          ? 'bg-amber-950/60 text-amber-200 border-amber-500/40 hover:bg-amber-900' 
                          : 'bg-teal-600 text-white hover:bg-teal-500'
                      }`}
                    >
                      <CreditCard size={13} />
                      <span>{selectedCandidate.reRegistrationStatus === 'paid' ? 'Reset Daftar Ulang Belum Lunas' : 'Tandai DAFTAR ULANG LUNAS'}</span>
                    </button>
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

      {/* Modal Kuitansi Resmi SPMB (KOP Resmi Lembaga) */}
      <SpmbReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        candidate={receiptModalCandidate}
        config={config}
        schoolIdentity={currentSchoolIdentity}
        defaultType={receiptModalType}
      />

      {/* Modal Edit Massal NIS Siswa (NISN Tetap) */}
      <BulkNisEditorModal
        isOpen={isBulkNisOpen}
        onClose={() => setIsBulkNisOpen(false)}
        students={students || []}
        onRefresh={() => {
          if (onRefresh) onRefresh();
          loadData();
        }}
        initialClassFilter={bulkNisFilterClass}
      />
    </div>
  );
}