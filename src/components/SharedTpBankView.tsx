import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Plus, Check, Copy, AlertCircle, Edit2, Trash2, 
  RefreshCw, CheckCircle2, Send, X, Layers, Clock, User, 
  HelpCircle, ChevronRight, MessageSquare, Filter, ShieldCheck, Sparkles, AlertTriangle
} from 'lucide-react';
import { SharedLearningObjective, CurriculumSubject } from '../types';

export interface SharedTpBankViewProps {
  isWaka?: boolean;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
  };
  initialSubject?: string;
  initialGradeLevel?: string;
  initialSemester?: string;
  initialAcademicYear?: string;
  onUseTp?: (tp: SharedLearningObjective, targetSlot: 1 | 2 | 3 | 4) => void;
  subjectsList?: CurriculumSubject[];
  activeClass?: string;
  embedded?: boolean; // if true, renders directly in-page rather than in a modal
  onClose?: () => void;
}

export const SharedTpBankView: React.FC<SharedTpBankViewProps> = ({
  isWaka = false,
  currentUser,
  initialSubject = '',
  initialGradeLevel = '',
  initialSemester = 'Ganjil',
  initialAcademicYear = '2026/2027',
  onUseTp,
  subjectsList = [],
  activeClass = '',
  embedded = false,
  onClose
}) => {
  // Extract initial grade level
  const resolvedInitialGrade = useMemo(() => {
    if (initialGradeLevel) return initialGradeLevel;
    if (activeClass) {
      const m = String(activeClass).match(/\d+/);
      if (m) return m[0];
    }
    return 'all';
  }, [initialGradeLevel, activeClass]);

  const [tps, setTps] = useState<SharedLearningObjective[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>(initialSubject || 'all');
  const [filterGrade, setFilterGrade] = useState<string>(resolvedInitialGrade);
  const [filterSemester, setFilterSemester] = useState<string>(initialSemester || 'all');
  const [filterYear, setFilterYear] = useState<string>(initialAcademicYear || '2026/2027');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [showReviewRevisionModal, setShowReviewRevisionModal] = useState<boolean>(false);
  const [selectedTpForAction, setSelectedTpForAction] = useState<SharedLearningObjective | null>(null);

  // Form states
  const [formCode, setFormCode] = useState<string>('');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formSubjectName, setFormSubjectName] = useState<string>('');
  const [formGrade, setFormGrade] = useState<string>('7');
  const [formSemester, setFormSemester] = useState<string>('Ganjil');
  const [formYear, setFormYear] = useState<string>('2026/2027');
  const [formTpNumber, setFormTpNumber] = useState<number>(1);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Disetujui' | 'Menunggu Verifikasi'>('Aktif');

  // Revision request form
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [selectedRevisionItem, setSelectedRevisionItem] = useState<any>(null);
  const [revisionNewTitle, setRevisionNewTitle] = useState<string>('');

  // Slot selector popover for "Gunakan TP"
  const [slotSelectorTpId, setSlotSelectorTpId] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Fetch TPs from server
  const fetchSharedTps = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/curriculum/shared-tps');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.tps)) {
          setTps(data.tps);
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat Bank TP Bersama:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedTps();
    // Auto-sync polling every 20s so new TPs from other teachers appear automatically without page refresh
    const interval = setInterval(() => {
      fetchSharedTps(false);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Update filter when initial props change
  useEffect(() => {
    if (initialSubject) setFilterSubject(initialSubject);
    if (resolvedInitialGrade) setFilterGrade(resolvedInitialGrade);
  }, [initialSubject, resolvedInitialGrade]);

  // Registered subjects list
  const availableSubjects = useMemo(() => {
    if (subjectsList.length > 0) return subjectsList;
    // Derive from loaded TPs if subjectsList is empty
    const map = new Map<string, CurriculumSubject>();
    tps.forEach(tp => {
      if (tp.subjectId && !map.has(tp.subjectId)) {
        map.set(tp.subjectId, {
          id: tp.subjectId,
          code: tp.code.split('-')[1] || 'TP',
          name: tp.subjectName
        });
      }
    });
    return Array.from(map.values());
  }, [subjectsList, tps]);

  // Filtered list
  const filteredTps = useMemo(() => {
    let list = [...tps];

    if (filterSubject && filterSubject !== 'all') {
      const s = filterSubject.toLowerCase().trim();
      list = list.filter(tp => 
        tp.subjectId.toLowerCase() === s || 
        tp.subjectName.toLowerCase().includes(s) ||
        s.includes(tp.subjectName.toLowerCase())
      );
    }

    if (filterGrade && filterGrade !== 'all') {
      list = list.filter(tp => String(tp.gradeLevel).trim() === filterGrade);
    }

    if (filterSemester && filterSemester !== 'all') {
      list = list.filter(tp => tp.semester.toLowerCase() === filterSemester.toLowerCase());
    }

    if (filterYear && filterYear !== 'all') {
      list = list.filter(tp => tp.academicYear.toLowerCase() === filterYear.toLowerCase());
    }

    if (filterStatus && filterStatus !== 'all') {
      list = list.filter(tp => tp.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(tp =>
        tp.code.toLowerCase().includes(q) ||
        tp.title.toLowerCase().includes(q) ||
        tp.subjectName.toLowerCase().includes(q) ||
        (tp.creatorName && tp.creatorName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [tps, filterSubject, filterGrade, filterSemester, filterYear, filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = tps.length;
    const active = tps.filter(t => t.status === 'Aktif' || t.status === 'Disetujui').length;
    let pendingRevisions = 0;
    tps.forEach(t => {
      if (t.revisionRequests) {
        pendingRevisions += t.revisionRequests.filter(r => r.status === 'pending').length;
      }
    });
    return { total, active, pendingRevisions };
  }, [tps]);

  // Copy TP formulation to clipboard
  const handleCopyTp = (text: string, code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('success', `📋 Rumusan [${code}] berhasil disalin ke clipboard!`);
    } else {
      showToast('info', 'Teks telah dipilih. Tekan Ctrl+C untuk menyalin.');
    }
  };

  // Open Add TP Modal
  const handleOpenAddModal = () => {
    // Guess default subject from filter or first available
    let defSub = availableSubjects.find(s => s.id === filterSubject || s.name.toLowerCase() === filterSubject.toLowerCase());
    if (!defSub && availableSubjects.length > 0) defSub = availableSubjects[0];

    const defSubId = defSub ? defSub.id : (filterSubject !== 'all' ? filterSubject : 'mapel-mtk');
    const defSubName = defSub ? defSub.name : 'Matematika';
    const defGrade = filterGrade !== 'all' ? filterGrade : '7';
    const defSem = filterSemester !== 'all' ? filterSemester : 'Ganjil';

    setFormSubjectId(defSubId);
    setFormSubjectName(defSubName);
    setFormGrade(defGrade);
    setFormSemester(defSem);
    setFormYear(filterYear !== 'all' ? filterYear : '2026/2027');
    setFormTitle('');
    setFormCode('');
    setFormTpNumber(1);
    setFormStatus(isWaka ? 'Disetujui' : 'Aktif');
    setShowAddModal(true);
  };

  // Submit Add TP
  const handleSaveAddTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('error', 'Rumusan Tujuan Pembelajaran (TP) wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/curriculum/shared-tps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode || undefined,
          subjectId: formSubjectId,
          subjectName: formSubjectName,
          gradeLevel: formGrade,
          semester: formSemester,
          academicYear: formYear,
          tpNumber: formTpNumber,
          title: formTitle,
          creatorId: currentUser?.id,
          creatorName: currentUser?.name || (isWaka ? 'Waka Kurikulum' : 'Guru Mata Pelajaran'),
          creatorRole: currentUser?.role || (isWaka ? 'Waka Kurikulum' : `Guru ${formSubjectName}`),
          status: formStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || 'TP baru berhasil ditambahkan ke Bank TP Bersama!');
        setShowAddModal(false);
        fetchSharedTps();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal menambahkan TP ke Bank Bersama.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Open Edit Modal (Waka Kurikulum)
  const handleOpenEditModal = (tp: SharedLearningObjective) => {
    setSelectedTpForAction(tp);
    setFormCode(tp.code);
    setFormTitle(tp.title);
    setFormGrade(tp.gradeLevel);
    setFormSemester(tp.semester);
    setFormYear(tp.academicYear);
    setFormTpNumber(tp.tpNumber || 1);
    setFormStatus(tp.status as any);
    setShowEditModal(true);
  };

  // Submit Edit TP (Waka Kurikulum)
  const handleSaveEditTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTpForAction) return;

    try {
      const res = await fetch(`/api/curriculum/shared-tps/${selectedTpForAction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          code: formCode,
          tpNumber: formTpNumber,
          status: formStatus,
          gradeLevel: formGrade,
          semester: formSemester,
          academicYear: formYear,
          userRole: isWaka ? 'waka_kurikulum' : 'teacher'
        })
      });

      if (res.ok) {
        showToast('success', `TP [${formCode}] berhasil diperbarui.`);
        setShowEditModal(false);
        fetchSharedTps();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal mengubah data TP.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Delete TP (Waka Kurikulum)
  const handleDeleteTp = async (tp: SharedLearningObjective) => {
    if (!confirm(`Hapus TP "${tp.code}: ${tp.title.slice(0, 40)}..." dari Bank TP Bersama?\n\nPerhatian: Guru lain tidak akan dapat lagi memilih TP ini untuk penilaian.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/curriculum/shared-tps/${tp.id}?userRole=waka_kurikulum`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', `TP [${tp.code}] berhasil dihapus dari Bank Bersama.`);
        fetchSharedTps();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal menghapus TP.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Open Revision Request Modal (Guru Mapel / Wali)
  const handleOpenRevisionModal = (tp: SharedLearningObjective) => {
    setSelectedTpForAction(tp);
    setRevisionNote('');
    setShowRevisionModal(true);
  };

  // Submit Revision Request
  const handleSaveRevisionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTpForAction || !revisionNote.trim()) {
      showToast('error', 'Silakan tulis catatan atau usulan perubahan.');
      return;
    }

    try {
      const res = await fetch(`/api/curriculum/shared-tps/${selectedTpForAction.id}/revision-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: currentUser?.id,
          teacherName: currentUser?.name || 'Guru Mata Pelajaran',
          teacherRole: currentUser?.role || `Guru ${selectedTpForAction.subjectName}`,
          note: revisionNote
        })
      });

      if (res.ok) {
        showToast('success', `Usulan perubahan untuk [${selectedTpForAction.code}] berhasil dikirim ke Waka Kurikulum!`);
        setShowRevisionModal(false);
        fetchSharedTps();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal mengirim usulan perubahan.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Review Revision Requests (Waka Kurikulum)
  const handleOpenReviewRevisionModal = (tp: SharedLearningObjective) => {
    setSelectedTpForAction(tp);
    const pending = (tp.revisionRequests || []).find(r => r.status === 'pending');
    setSelectedRevisionItem(pending || (tp.revisionRequests || [])[0] || null);
    setRevisionNewTitle(tp.title);
    setShowReviewRevisionModal(true);
  };

  const handleResolveRevision = async (action: 'approved' | 'rejected') => {
    if (!selectedTpForAction || !selectedRevisionItem) return;

    try {
      const res = await fetch(`/api/curriculum/shared-tps/${selectedTpForAction.id}/resolve-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRevisionItem.id,
          action,
          newTitle: action === 'approved' ? revisionNewTitle : undefined
        })
      });

      if (res.ok) {
        showToast('success', `Pengajuan usulan telah ${action === 'approved' ? 'disetujui dan rumusan TP diperbarui' : 'ditolak'}.`);
        setShowReviewRevisionModal(false);
        fetchSharedTps();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal memproses pengajuan.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Reset defaults (Waka Kurikulum)
  const handleResetDefaults = async () => {
    if (!confirm('Standarisasi ulang Bank TP Bersama ke acuan resmi Kurikulum Merdeka SMP Ma\'arif NU Pandaan?')) {
      return;
    }
    try {
      const res = await fetch('/api/curriculum/shared-tps/reset-defaults', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast('success', `Bank TP Bersama berhasil distandarisasi (${data.count} TP).`);
        fetchSharedTps();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal reset data.');
    }
  };

  return (
    <div className={`space-y-5 text-left ${embedded ? '' : 'p-2'}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] max-w-md p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
            : toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : 'bg-indigo-50 border-indigo-200 text-indigo-950'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            ) : (
              <Sparkles size={18} className="text-indigo-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)}
            className="p-1 hover:opacity-60 text-slate-500 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white border border-indigo-700/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <BookOpen size={18} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
              Kurikulum Merdeka • Satu Sumber Terpadu
            </span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>Bank TP Bersama (Tujuan Pembelajaran)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold">
              {stats.total} TP
            </span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Menghubungkan guru secara otomatis berdasarkan <strong>ID Mata Pelajaran</strong> dan <strong>Jenjang Kelas (7, 8, 9)</strong>. Guru dapat menambahkan TP baru atau menggunakan TP yang sudah ada tanpa input ulang.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isWaka && (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Reset ke acuan standar Kurikulum Merdeka"
            >
              <RefreshCw size={13} />
              <span>Standarisasi TP</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <Plus size={15} />
            <span>Tambah TP Baru</span>
          </button>

          {!embedded && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari rumusan TP, kode TP (contoh: TP-MAT-7.1), materi pokok, atau nama guru pembuat..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Filter 1: Mata Pelajaran */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Mata Pelajaran
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {availableSubjects.map((s, idx) => (
                <option key={s.id || idx} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Jenjang Kelas (7 / 8 / 9) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Jenjang Kelas
            </label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">Semua Jenjang (7, 8, 9)</option>
              <option value="7">Kelas 7 (Fase D - Awal)</option>
              <option value="8">Kelas 8 (Fase D - Lanjutan)</option>
              <option value="9">Kelas 9 (Fase D - Akhir)</option>
            </select>
          </div>

          {/* Filter 3: Semester */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">Semua Semester</option>
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* Filter 4: Tahun Ajaran */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">Semua Tahun</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>

          {/* Filter 5: Status */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Status TP
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="Disetujui">Disetujui Resmi</option>
              <option value="Aktif">Aktif Digunakan</option>
              <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            </select>
          </div>
        </div>

        {/* Quick summary & Reset filters */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>Menampilkan <strong>{filteredTps.length}</strong> dari total {tps.length} TP</span>
            {stats.pendingRevisions > 0 && isWaka && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center gap-1">
                <AlertTriangle size={11} />
                {stats.pendingRevisions} Usulan Perubahan Guru
              </span>
            )}
          </div>

          {(filterSubject !== 'all' || filterGrade !== 'all' || filterSemester !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterSubject('all');
                setFilterGrade('all');
                setFilterSemester('all');
                setSearchQuery('');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* TP List Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <span>Memuat Bank TP Bersama...</span>
          </div>
        ) : filteredTps.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-semibold flex flex-col items-center gap-2 px-4">
            <BookOpen size={32} className="text-slate-300 stroke-[1.5]" />
            <span className="text-sm font-bold text-slate-700">Tidak ada Tujuan Pembelajaran (TP) yang cocok.</span>
            <p className="text-xs text-slate-400 max-w-md">
              Coba sesuaikan filter mata pelajaran dan jenjang kelas, atau klik tombol <strong>"Tambah TP Baru"</strong> di atas untuk membuat TP pertama.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              + Tambah TP Sekarang
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTps.map((tp) => {
              const pendingCount = (tp.revisionRequests || []).filter(r => r.status === 'pending').length;

              return (
                <div 
                  key={tp.id} 
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col gap-3 group"
                >
                  {/* Top Row: Badges, Scope, and Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Code Badge */}
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-mono font-black text-xs border border-indigo-200">
                        {tp.code}
                      </span>

                      {/* Subject Badge */}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                        {tp.subjectName}
                      </span>

                      {/* Grade Badge */}
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-black text-xs border border-purple-200">
                        Kelas {tp.gradeLevel}
                      </span>

                      {/* Semester & Year */}
                      <span className="text-[11px] font-semibold text-slate-500">
                        {tp.semester} • {tp.academicYear}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Pending revision badge */}
                      {pendingCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewRevisionModal(tp)}
                          className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black flex items-center gap-1 hover:bg-amber-200 cursor-pointer"
                          title="Lihat usulan perubahan dari guru"
                        >
                          <AlertTriangle size={11} className="text-amber-600" />
                          <span>{pendingCount} Usulan Revisi</span>
                        </button>
                      )}

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        tp.status === 'Disetujui'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : tp.status === 'Aktif'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {tp.status}
                      </span>
                    </div>
                  </div>

                  {/* Rumusan TP Text */}
                  <div className="bg-slate-50/60 group-hover:bg-white p-3.5 rounded-2xl border border-slate-150 transition-colors">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                      {tp.title}
                    </p>
                  </div>

                  {/* Bottom Row: Metadata & Actions */}
                  <div className="flex items-center justify-between gap-3 flex-wrap text-xs pt-1">
                    {/* Author & Updated Time */}
                    <div className="flex items-center gap-3 text-slate-500 text-[11px] font-semibold flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-indigo-600" />
                        <span>Pembuat: <strong className="text-slate-800">{tp.creatorName}</strong> ({tp.creatorRole || 'Guru Mapel'})</span>
                      </span>
                      {tp.updatedAt && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock size={11} />
                          <span>Pembaruan: {new Date(tp.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Salin TP */}
                      <button
                        type="button"
                        onClick={() => handleCopyTp(tp.title, tp.code)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Salin rumusan TP ke clipboard"
                      >
                        <Copy size={13} />
                        <span>Salin TP</span>
                      </button>

                      {/* Gunakan TP (Bagi Guru & Wali Kelas jika onUseTp tersedia) */}
                      {onUseTp && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSlotSelectorTpId(slotSelectorTpId === tp.id ? null : tp.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Gunakan TP ini pada form penilaian aktif"
                          >
                            <Check size={13} />
                            <span>Gunakan TP</span>
                          </button>

                          {/* Slot Selector Dropdown (TP-1..TP-4) */}
                          {slotSelectorTpId === tp.id && (
                            <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-30 w-44 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase px-2 py-0.5">
                                Pilih Slot Penilaian:
                              </span>
                              {[1, 2, 3, 4].map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    onUseTp(tp, slot as any);
                                    setSlotSelectorTpId(null);
                                    showToast('success', `✓ [${tp.code}] telah dipasang ke Tujuan Pembelajaran ${slot} (TP-${slot})!`);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                                >
                                  <span>Gunakan di TP-{slot}</span>
                                  <ChevronRight size={12} className="text-slate-400" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ajukan Perubahan (Bagi Guru / Wali Kelas ke Waka Kurikulum) */}
                      <button
                        type="button"
                        onClick={() => handleOpenRevisionModal(tp)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Ajukan usulan perubahan/revisi ke Waka Kurikulum"
                      >
                        <MessageSquare size={13} />
                        <span>Ajukan Perubahan</span>
                      </button>

                      {/* Waka Kurikulum Admin Controls */}
                      {isWaka && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tp)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200"
                            title="Edit TP (Waka Kurikulum)"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTp(tp)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer border border-rose-200"
                            title="Hapus TP (Waka Kurikulum)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Tambah TP Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus size={18} />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Tambah TP Baru ke Bank TP Bersama
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Otomatis terhubung ke seluruh guru dengan mapel & jenjang kelas yang sama
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddTp} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Mata Pelajaran *
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => {
                      const sid = e.target.value;
                      setFormSubjectId(sid);
                      const s = availableSubjects.find(item => item.id === sid);
                      if (s) setFormSubjectName(s.name);
                    }}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    required
                  >
                    {availableSubjects.map((s, idx) => (
                      <option key={s.id || idx} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenjang Kelas */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Jenjang Kelas *
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    required
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Semester
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Tahun Ajaran
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2025/2026">2025/2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nomor Urut TP
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formTpNumber}
                    onChange={(e) => setFormTpNumber(Number(e.target.value))}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Kode TP (Opsional, Otomatis jika kosong)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: TP-MAT-7.1"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Rumusan Tujuan Pembelajaran (TP) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Memahami konsep bilangan bulat dan operasinya dalam pemecahan masalah sehari-hari..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 leading-relaxed focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Simpan ke Bank TP Bersama</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit TP (Waka Kurikulum) */}
      {showEditModal && selectedTpForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Edit2 size={18} />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Ubah TP Master (Waka Kurikulum)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {selectedTpForAction.subjectName} • Tingkat {selectedTpForAction.gradeLevel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditTp} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Kode TP
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Status TP
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Disetujui">Disetujui Resmi</option>
                    <option value="Aktif">Aktif Digunakan</option>
                    <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Rumusan Tujuan Pembelajaran (TP) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 leading-relaxed focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Simpan Perubahan TP</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Ajukan Perubahan TP ke Waka Kurikulum */}
      {showRevisionModal && selectedTpForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <MessageSquare size={18} />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Ajukan Perubahan TP ke Waka Kurikulum
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Sampaikan catatan atau usulan rumusan baru untuk dipelajari oleh Waka Kurikulum
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-600">
                TP Saat Ini ({selectedTpForAction.code})
              </span>
              <p className="text-xs font-bold text-slate-800 leading-snug">
                {selectedTpForAction.title}
              </p>
            </div>

            <form onSubmit={handleSaveRevisionRequest} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Catatan / Usulan Perbaikan Anda *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Contoh: Mohon disesuaikan rumusan materi pertemuan 3 terkait pemisahan campuran..."
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 leading-relaxed focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-amber-600/30 flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Kirim ke Waka Kurikulum</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Review Usulan Revisi (Khusus Waka Kurikulum) */}
      {showReviewRevisionModal && selectedTpForAction && selectedRevisionItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Review Usulan Perubahan Guru
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Dari: {selectedRevisionItem.teacherName} ({selectedRevisionItem.teacherRole})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewRevisionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                  Catatan Usulan Guru:
                </span>
                <p className="text-xs font-bold text-amber-950">
                  {selectedRevisionItem.note}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Rumusan TP Setelah Penyesuaian (Bisa Diedit Langsung)
                </label>
                <textarea
                  rows={4}
                  value={revisionNewTitle}
                  onChange={(e) => setRevisionNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 leading-relaxed focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleResolveRevision('rejected')}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tolak Usulan
              </button>
              <button
                type="button"
                onClick={() => handleResolveRevision('approved')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Setujui & Terapkan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
