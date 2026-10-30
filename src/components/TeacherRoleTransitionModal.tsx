import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Users, 
  UserCheck, 
  ArrowLeftRight, 
  GraduationCap, 
  BookOpen, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  RefreshCw, 
  ShieldAlert, 
  Calendar,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { HomeroomTeacher, SubjectTeacher, TeacherAssignment } from '../types';

interface TeacherRoleItem {
  id: string;
  username: string;
  name: string;
  defaultRole: 'homeroom' | 'subject_teacher';
  defaultClass?: string;
  subject: string;
  subjectId?: string;
  targetAcademicYear: string;
  roleInYear: 'homeroom' | 'subject_teacher';
  classInYear: string;
  assignments: TeacherAssignment[];
}

interface TeacherRoleTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAcademicYear: string;
  availableAcademicYears: string[];
  homerooms: HomeroomTeacher[];
  subjectTeachers: SubjectTeacher[];
  onRefreshData?: () => void;
}

const STANDARD_CLASSES = [
  '7-A', '7-B', '7-C', '7-D', '7-E', '7-F', '7-G',
  '8-A', '8-B', '8-C', '8-D', '8-E', '8-F', '8-G',
  '9-A', '9-B', '9-C', '9-D', '9-E', '9-F', '9-G'
];

export default function TeacherRoleTransitionModal({
  isOpen,
  onClose,
  activeAcademicYear = '2026/2027',
  availableAcademicYears = [],
  homerooms = [],
  subjectTeachers = [],
  onRefreshData
}: TeacherRoleTransitionModalProps) {
  // Target academic year selection (default to active year or next upcoming year)
  const [selectedTargetYear, setSelectedTargetYear] = useState<string>(activeAcademicYear);
  const [teachersList, setTeachersList] = useState<TeacherRoleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'homeroom' | 'subject_teacher'>('all');

  // Transition Action Form Sub-Modal
  const [activeTeacherForEdit, setActiveTeacherForEdit] = useState<TeacherRoleItem | null>(null);
  const [formNewRole, setFormNewRole] = useState<'homeroom' | 'subject_teacher'>('homeroom');
  const [formTargetClass, setFormTargetClass] = useState<string>('7-A');
  const [formSubject, setFormSubject] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Copy from previous year states
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState<boolean>(false);

  // All years list including future year
  const allYears = useMemo(() => {
    const set = new Set<string>(availableAcademicYears);
    set.add(activeAcademicYear);
    // Add next upcoming year if not already present
    const parts = activeAcademicYear.split('/');
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      if (!isNaN(start)) {
        set.add(`${start + 1}/${start + 2}`);
        set.add(`${start + 2}/${start + 3}`);
      }
    }
    return Array.from(set).sort();
  }, [availableAcademicYears, activeAcademicYear]);

  // Fetch teachers status for the selected target year
  const fetchTeacherRoles = async (year: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/teacher-roles?academicYear=${encodeURIComponent(year)}`);
      if (res.ok) {
        const data = await res.json();
        setTeachersList(data.teachers || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Gagal memuat status penugasan guru.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTeacherRoles(selectedTargetYear);
    }
  }, [isOpen, selectedTargetYear]);

  // Quick action: Open edit form for a teacher
  const handleOpenEdit = (teacher: TeacherRoleItem, defaultRoleIntent?: 'homeroom' | 'subject_teacher') => {
    setActiveTeacherForEdit(teacher);
    const targetRole = defaultRoleIntent || teacher.roleInYear;
    setFormNewRole(targetRole);
    setFormTargetClass(teacher.classInYear || teacher.defaultClass || '7-A');
    setFormSubject(teacher.subject || '');
  };

  // Submit role transition
  const handleSaveTransition = async () => {
    if (!activeTeacherForEdit) return;

    if (formNewRole === 'homeroom' && !formTargetClass.trim()) {
      setErrorMsg('Harap pilih kelas binaan bagi Wali Kelas.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/teacher-roles/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: activeTeacherForEdit.id,
          username: activeTeacherForEdit.username,
          academicYear: selectedTargetYear,
          newRole: formNewRole,
          targetClass: formNewRole === 'homeroom' ? formTargetClass.trim() : '',
          subject: formSubject.trim() || activeTeacherForEdit.subject
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Peran guru berhasil diperbarui.');
        setActiveTeacherForEdit(null);
        await fetchTeacherRoles(selectedTargetYear);
        if (onRefreshData) onRefreshData();
      } else {
        setErrorMsg(data.error || 'Gagal menyimpan perubahan peran guru.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy assignment from previous year
  const handleCopyFromPreviousYear = async () => {
    setIsCopying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Compute previous year
    const parts = selectedTargetYear.split('/');
    let sourceYear = activeAcademicYear;
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      if (!isNaN(start)) {
        sourceYear = `${start - 1}/${start}`;
      }
    }

    try {
      const res = await fetch('/api/admin/teacher-roles/copy-from-previous-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAcademicYear: sourceYear,
          targetAcademicYear: selectedTargetYear
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Berhasil menyalin plotting penugasan dari T.A ${sourceYear} ke T.A ${selectedTargetYear} (${data.copiedCount} guru).`);
        setShowCopyConfirm(false);
        await fetchTeacherRoles(selectedTargetYear);
        if (onRefreshData) onRefreshData();
      } else {
        setErrorMsg(data.error || 'Gagal menyalin penugasan.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsCopying(false);
    }
  };

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachersList.filter(t => {
      if (roleFilter !== 'all' && t.roleInYear !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchUser = t.username.toLowerCase().includes(q);
        const matchSub = (t.subject || '').toLowerCase().includes(q);
        const matchCls = (t.classInYear || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchSub && !matchCls) return false;
      }
      return true;
    });
  }, [teachersList, roleFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = teachersList.length;
    const homeroomCount = teachersList.filter(t => t.roleInYear === 'homeroom' && t.classInYear).length;
    const subjectOnlyCount = teachersList.filter(t => t.roleInYear === 'subject_teacher').length;
    const assignedClasses = new Set(teachersList.filter(t => t.roleInYear === 'homeroom' && t.classInYear).map(t => t.classInYear.toUpperCase()));
    return {
      total,
      homeroomCount,
      subjectOnlyCount,
      assignedClasses
    };
  }, [teachersList]);

  if (!isOpen) return null;

  const isSelectedYearActive = selectedTargetYear === activeAcademicYear;
  const isFutureYear = selectedTargetYear > activeAcademicYear;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <ArrowLeftRight size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  Peralihan Peran Guru (Wali Kelas ⇄ Guru Mapel)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Antisipasi T.A. Baru
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Konfigurasi penugasan wali kelas dan guru mata pelajaran per tahun ajaran. Riwayat tahun sebelumnya tetap tersimpan utuh.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Pilih Tahun Ajaran Target & Aksi */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Calendar size={15} className="text-indigo-600" />
              Tahun Ajaran Sasaran:
            </label>
            <select
              value={selectedTargetYear}
              onChange={(e) => setSelectedTargetYear(e.target.value)}
              className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-extrabold text-indigo-950 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {allYears.map(yr => (
                <option key={yr} value={yr}>
                  T.A {yr} {yr === activeAcademicYear ? '(Aktif Saat Ini)' : yr > activeAcademicYear ? '(Tahun Mendatang)' : '(Histori Arsip)'}
                </option>
              ))}
            </select>

            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
              isSelectedYearActive 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : isFutureYear
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {isSelectedYearActive 
                ? '🌟 Berlaku Sekarang (Aktif)' 
                : isFutureYear 
                  ? '🚀 Perencanaan Tahun Ajaran Baru' 
                  : '📂 Tinjauan Riwayat Masa Lalu'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCopyConfirm(true)}
              disabled={isCopying || isLoading}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Salin semua penugasan wali kelas dari tahun sebelumnya sebagai awalan"
            >
              <Copy size={13} className="text-slate-500" />
              <span>Salin dari T.A Sebelumnya</span>
            </button>

            <button
              type="button"
              onClick={() => fetchTeacherRoles(selectedTargetYear)}
              disabled={isLoading}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
              title="Muat Ulang Data"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </div>

        {/* Confirm Copy Modal Banner */}
        {showCopyConfirm && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-indigo-900">
              <Info size={18} className="text-indigo-600 shrink-0" />
              <span>
                Apakah Anda ingin menyalin seluruh plotting wali kelas dari tahun sebelumnya ke <strong>T.A {selectedTargetYear}</strong>? Ini akan mempermudah Anda memulai tahun ajaran baru sebelum menyesuaikan guru yang berganti peran.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCopyConfirm(false)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCopyFromPreviousYear}
                disabled={isCopying}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {isCopying && <RefreshCw size={12} className="animate-spin" />}
                Ya, Salin Plotting
              </button>
            </div>
          </div>
        )}

        {/* Success / Error Messages */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-700 hover:text-red-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-4 shrink-0">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Guru Terdaftar</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">{stats.total} Orang</div>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Wali Kelas di T.A Ini</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">{stats.homeroomCount} Kelas</div>
          </div>
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Guru Mapel Murni</div>
            <div className="text-lg font-black text-indigo-900 mt-0.5">{stats.subjectOnlyCount} Orang</div>
          </div>
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Tahun Ajaran Target</div>
            <div className="text-lg font-black text-purple-900 mt-0.5">T.A {selectedTargetYear}</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru, username, mapel, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({teachersList.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('homeroom')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                roleFilter === 'homeroom' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wali Kelas ({stats.homeroomCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('subject_teacher')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                roleFilter === 'subject_teacher' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Guru Mapel Murni ({stats.subjectOnlyCount})
            </button>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-indigo-600" />
              <span className="text-xs font-bold">Memuat data penugasan guru...</span>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users size={32} className="mx-auto mb-2 opacity-50 text-slate-400" />
              <div className="text-xs font-bold text-slate-600">Tidak ada guru yang sesuai filter</div>
              <p className="text-[11px] text-slate-400 mt-1">Coba ubah kata kunci pencarian atau ganti filter peran.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Nama Guru & Kredensial</th>
                    <th className="py-3 px-3">Mata Pelajaran Pokok</th>
                    <th className="py-3 px-3">Status di T.A {selectedTargetYear}</th>
                    <th className="py-3 px-3">Riwayat Penugasan</th>
                    <th className="py-3 px-4 text-right">Aksi Peralihan Peran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTeachers.map((teacher) => {
                    const isHomeroom = teacher.roleInYear === 'homeroom' && Boolean(teacher.classInYear);
                    return (
                      <tr key={teacher.id || teacher.username} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Nama Guru */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              isHomeroom 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {teacher.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-850 flex items-center gap-1.5">
                                <span>{teacher.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                user: {teacher.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mata Pelajaran */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <BookOpen size={11} className="text-slate-500" />
                            {teacher.subject || 'Umum'}
                          </span>
                        </td>

                        {/* Status di T.A. Ini */}
                        <td className="py-3 px-3">
                          {isHomeroom ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-300">
                              <GraduationCap size={13} className="text-emerald-600" />
                              Wali Kelas {teacher.classInYear}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              <UserCheck size={13} className="text-indigo-600" />
                              Guru Mapel Murni
                            </span>
                          )}
                        </td>

                        {/* Riwayat Penugasan Lain */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {teacher.assignments && teacher.assignments.length > 0 ? (
                              teacher.assignments
                                .filter(a => a.academicYear !== selectedTargetYear)
                                .slice(-3)
                                .map((a, idx) => (
                                  <span key={idx} className="text-[9.5px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-mono" title={`T.A ${a.academicYear}: ${a.role === 'homeroom' ? `Wali Kelas ${a.className}` : 'Guru Mapel'}`}>
                                    {a.academicYear}: {a.role === 'homeroom' ? a.className : 'Mapel'}
                                  </span>
                                ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Bawaan ({teacher.defaultRole === 'homeroom' ? teacher.defaultClass : 'Mapel'})</span>
                            )}
                          </div>
                        </td>

                        {/* Aksi Peralihan */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isHomeroom ? (
                              <>
                                {/* Tombol Alihkan jadi Guru Mapel Murni */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(teacher, 'subject_teacher')}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Alihkan guru ini menjadi Guru Mapel Murni (bebas tugas wali kelas di tahun ajaran ini)"
                                >
                                  <ArrowLeftRight size={12} className="text-amber-700" />
                                  <span>Jadikan Mapel Murni</span>
                                </button>

                                {/* Tombol Ganti Rombel */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(teacher, 'homeroom')}
                                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  title="Ganti kelas binaan pada tahun ajaran ini"
                                >
                                  Ganti Kelas
                                </button>
                              </>
                            ) : (
                              /* Tombol Promosikan / Tugaskan jadi Wali Kelas */
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(teacher, 'homeroom')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Tugaskan guru ini menjadi Wali Kelas pada tahun ajaran ini"
                              >
                                <GraduationCap size={13} />
                                <span>Tugaskan Jadi Wali Kelas</span>
                              </button>
                            )}
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

        {/* Edit / Transition Action Sub-Modal */}
        {activeTeacherForEdit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight size={18} className="text-indigo-400" />
                  <h3 className="font-extrabold text-sm">
                    Atur Peran Guru: {activeTeacherForEdit.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTeacherForEdit(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4 text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Tahun Ajaran Sasaran</div>
                  <div className="font-extrabold text-sm mt-0.5">T.A {selectedTargetYear}</div>
                  <p className="text-[11px] text-indigo-700/80 mt-1">
                    Perubahan ini akan berlaku untuk tahun ajaran {selectedTargetYear} tanpa merusak riwayat kelas tahun-tahun lainnya.
                  </p>
                </div>

                {/* Pilih Peran Baru */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                    Pilih Peran pada T.A {selectedTargetYear}:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormNewRole('homeroom')}
                      className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                        formNewRole === 'homeroom'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <GraduationCap size={15} className="text-emerald-600" />
                        <span>Wali Kelas</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        Memegang kelas binaan, mengelola absensi & rapor.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormNewRole('subject_teacher')}
                      className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                        formNewRole === 'subject_teacher'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <UserCheck size={15} className="text-indigo-600" />
                        <span>Guru Mapel Murni</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500">
                        Bebas tugas wali kelas, fokus mengajar mata pelajaran.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Jika Wali Kelas: Pilih Kelas Binaan */}
                {formNewRole === 'homeroom' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                      Pilih Kelas Binaan / Rombel:
                    </label>
                    <select
                      value={formTargetClass}
                      onChange={(e) => setFormTargetClass(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      {STANDARD_CLASSES.map(cls => {
                        const occupiedBy = teachersList.find(t => 
                          t.roleInYear === 'homeroom' && 
                          t.classInYear.toUpperCase() === cls.toUpperCase() && 
                          t.id !== activeTeacherForEdit.id
                        );
                        return (
                          <option key={cls} value={cls}>
                            Kelas {cls} {occupiedBy ? `(Saat ini: ${occupiedBy.name})` : '(Kosong / Siap Diisi)'}
                          </option>
                        );
                      })}
                    </select>

                    <div className="mt-2 text-[10px] text-slate-500">
                      Atau ketik nama kelas khusus jika diperlukan:
                    </div>
                    <input
                      type="text"
                      value={formTargetClass}
                      onChange={(e) => setFormTargetClass(e.target.value)}
                      placeholder="Contoh: 7-A, 8-B, 9-C"
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                )}

                {/* Mata Pelajaran yang Diampu */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                    Mata Pelajaran yang Diampu:
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Contoh: Matematika, Bahasa Inggris, IPA..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Mata pelajaran ini dapat diajarkan di kelas oleh guru baik berstatus Wali Kelas maupun Guru Mapel.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTeacherForEdit(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveTransition}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  Simpan Perubahan Peran
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-600" />
            <span>Kredensial login guru (username & password) tetap sama baik sebagai Wali Kelas maupun Guru Mapel.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs transition-all cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
