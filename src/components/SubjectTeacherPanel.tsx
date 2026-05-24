import React, { useState, useEffect, useMemo } from 'react';
import { Student, SubjectTeacher, TeachingJournal, SchoolIdentity, SubjectAttendanceEntry, RealtimeNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Check, AlertCircle, Save, Loader2, Users, ClipboardCheck, 
  Sparkles, LogOut, ArrowRight, BookOpen, AlertCircle as ErrorIcon,
  Search, ShieldCheck, HelpCircle, History, CheckCircle2, ChevronRight, FileText, X, Printer,
  User, Bell
} from 'lucide-react';

interface SubjectTeacherPanelProps {
  currentTeacher: SubjectTeacher;
  students: Student[];
  attendanceLogs: any[];
  schoolIdentity?: SchoolIdentity;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function SubjectTeacherPanel({
  currentTeacher,
  students,
  attendanceLogs,
  schoolIdentity,
  onLogout,
  onRefresh,
  isLoading = false
}: SubjectTeacherPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history' | 'notifications' | 'profile'>('create');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [fase, setFase] = useState<string>('D');
  const [semester, setSemester] = useState<string>('Genap');
  const [alokasiWaktu, setAlokasiWaktu] = useState<string>('2 JP');
  const [jamKe, setJamKe] = useState<string>('1 - 2');
  const [pertemuanKe, setPertemuanKe] = useState<string>('');
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState<string>('');
  const [pencapaianKktp, setPencapaianKktp] = useState<string>('Tercapai');
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [loadingJournals, setLoadingJournals] = useState<boolean>(false);
  
  // Realtime notification lists for Teacher panel view
  const [systemNotifications, setSystemNotifications] = useState<RealtimeNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);
  const [notifSearch, setNotifSearch] = useState<string>('');
  
  // Class attendance state mapper
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Submit & success states
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);
  const [historyDetailJournal, setHistoryDetailJournal] = useState<TeachingJournal | null>(null);
  const [selectedJournalToPrint, setSelectedJournalToPrint] = useState<TeachingJournal | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCollectivePrintModal, setShowCollectivePrintModal] = useState<boolean>(false);

  const filteredJournals = useMemo(() => {
    let list = journals;
    if (startDate) {
      list = list.filter(journal => journal.date >= startDate);
    }
    if (endDate) {
      list = list.filter(journal => journal.date <= endDate);
    }
    // Sort chronological (oldest to newest) for school logs printable order
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [journals, startDate, endDate]);

  // Get distinct classes from students
  const availableClasses = useMemo(() => {
    const classesSet = new Set<string>();
    students.forEach(s => {
      if (s.class) classesSet.add(s.class.trim().toUpperCase());
    });
    return Array.from(classesSet).sort();
  }, [students]);

  // If no class is selected yet, default to the first available class
  useEffect(() => {
    if (!selectedClass && availableClasses.length > 0) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // Load journals history
  const fetchJournals = async () => {
    setLoadingJournals(true);
    try {
      const res = await fetch('/api/teaching-journals');
      if (res.ok) {
        const data: TeachingJournal[] = await res.json();
        // Filter journals belonging to current teacher
        const filtered = data.filter(j => j.teacherId === currentTeacher.id);
        setJournals(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJournals(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setSystemNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchJournals();
    fetchNotifications();
  }, [currentTeacher]);

  // Class students roster
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.class.trim().toUpperCase() === selectedClass.trim().toUpperCase())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Pre-fill attendance statuses when selecting a class
  useEffect(() => {
    if (classStudents.length > 0) {
      const initialMap: Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }> = {};
      classStudents.forEach(s => {
        initialMap[s.id] = { status: 'Hadir', notes: '' };
      });
      setDailyStatusMap(initialMap);
    }
  }, [selectedClass, students]);

  // Status statistics for selected daily map
  const currentDailyStats = useMemo(() => {
    const values = Object.values(dailyStatusMap) as Array<{ status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }>;
    return {
      total: classStudents.length,
      hadir: values.filter(v => v.status === 'Hadir').length,
      terlambat: values.filter(v => v.status === 'Terlambat').length,
      sakit: values.filter(v => v.status === 'Sakit').length,
      izin: values.filter(v => v.status === 'Izin').length,
      alpa: values.filter(v => v.status === 'Alpa').length,
    };
  }, [dailyStatusMap, classStudents]);

  // Handler to adjust status for a specific student
  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat') => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  // Handler to adjust note for a specific student
  const handleNoteChange = (studentId: string, notes: string) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  // Helper keyword shortcut "Hadirkan Semua"
  const markAllHadir = () => {
    setDailyStatusMap(prev => {
      const nextMap = { ...prev };
      classStudents.forEach(s => {
        nextMap[s.id] = { ...nextMap[s.id], status: 'Hadir' };
      });
      return nextMap;
    });
  };

  const handleSaveJournal = async () => {
    setFeedback(null);

    if (!selectedClass) {
      setFeedback({ type: 'error', text: 'Mohon pilih kelas bimbingan terlebih dahulu.' });
      return;
    }

    if (!topic.trim()) {
      setFeedback({ type: 'error', text: 'Materi KBM / Topik Pembelajaran harus diisi.' });
      return;
    }

    setIsSaving(true);

    try {
      // Build the list of student attendances
      const attendanceList: SubjectAttendanceEntry[] = classStudents.map(student => {
        const studentRecord = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };
        return {
          studentId: student.id,
          studentName: student.name,
          status: studentRecord.status,
          notes: studentRecord.notes
        };
      });

      const response = await fetch('/api/teaching-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: currentTeacher.id,
          teacherName: currentTeacher.name,
          subject: currentTeacher.subject,
          className: selectedClass,
          date: selectedDate,
          topic: topic.trim(),
          notes: notes.trim(),
          fase,
          semester,
          alokasiWaktu,
          jamKe,
          pertemuanKe,
          tujuanPembelajaran,
          pencapaianKktp,
          attendance: attendanceList
        })
      });

      if (response.ok) {
        setTopic('');
        setNotes('');
        setPertemuanKe('');
        setTujuanPembelajaran('');
        setFeedback({ type: 'success', text: 'Jurnal KBM & Absensi berhasil disinkronkan!' });
        setShowSuccessCheck(true);
        fetchJournals();
        onRefresh();
      } else {
        const errData = await response.json();
        setFeedback({ type: 'error', text: errData.error || 'Gagal menyimpan Jurnal Pembelajaran.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'Gagal terhubung dengan server.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter student rows in rendering
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.nis && s.nis.includes(q))
    );
  }, [classStudents, searchQuery]);

  return (
    <div id="subject-teacher-panel-container" className="flex flex-col gap-6 pb-24 md:pb-0">
      
      {/* Header Info Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
            <ClipboardCheck size={28} className="stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-slate-900 font-extrabold text-lg leading-tight tracking-tight">
                {currentTeacher.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase">
                Guru Mapel
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Mata Pelajaran: <strong className="text-slate-700 font-bold">{currentTeacher.subject}</strong></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-350 bg-slate-400" />
              <span>SMP Ma'arif NU Pandaan</span>
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-250 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-600 tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <LogOut size={13} className="stroke-[2.5]" />
          <span>KELUAR</span>
        </button>
      </div>

      {/* Navigation Subtabs (Desktop: flex, Mobile: hidden) */}
      <div className="hidden md:flex border-b border-slate-200 gap-1.5 px-1 bg-slate-50/50 p-1 rounded-2xl border w-fit select-none">
        <button
          onClick={() => { setActiveSubTab('create'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
            activeSubTab === 'create'
              ? 'bg-white text-slate-900 border border-slate-150 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Save size={13} />
          <span>Isi Jurnal & Absensi</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('history'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-white text-slate-900 border border-slate-150 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <History size={13} />
          <span>Riwayat Jurnal ({journals.length})</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('notifications'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
            activeSubTab === 'notifications'
              ? 'bg-white text-slate-900 border border-slate-150 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="relative">
            <Bell size={13} />
            {systemNotifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white leading-none">
                {systemNotifications.length}
              </span>
            )}
          </div>
          <span>Notifikasi ({systemNotifications.length})</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('profile'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
            activeSubTab === 'profile'
              ? 'bg-white text-slate-900 border border-slate-150 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <User size={13} />
          <span>Profil</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 border rounded-2xl text-xs font-semibold flex items-start gap-2 text-left shadow-xs ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <ErrorIcon size={16} className="mt-0.5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* View: Isi Jurnal & Absensi */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Journal form details */}
          <div className="lg:col-span-4 flex flex-col gap-6 text-left">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FileText size={16} className="text-indigo-600" />
                Jurnal Pembelajaran (KBM)
              </h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-650 flex items-center gap-1">
                  <span>Pilih Kelas</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-slate-800 text-xs bg-white shadow-xs cursor-pointer"
                >
                  {availableClasses.length === 0 ? (
                    <option value="">Tidak ada kelas</option>
                  ) : (
                    availableClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-650 flex items-center gap-1">
                  <span>Tanggal Pembelajaran</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-slate-800 text-xs bg-white shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-650 flex items-center gap-1">
                    <span>Fase</span>
                  </label>
                  <select
                    value={fase}
                    onChange={(e) => setFase(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D (SMP)</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-650 flex items-center gap-1">
                    <span>Semester</span>
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-650">Pertemuan Ke</label>
                  <input
                    type="text"
                    placeholder="misal: 1"
                    value={pertemuanKe}
                    onChange={(e) => setPertemuanKe(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-650">Jam Ke</label>
                  <input
                    type="text"
                    placeholder="misal: 1 - 2"
                    value={jamKe}
                    onChange={(e) => setJamKe(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-650">Alokasi (JP)</label>
                  <input
                    type="text"
                    placeholder="misal: 2 JP"
                    value={alokasiWaktu}
                    onChange={(e) => setAlokasiWaktu(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-650 flex items-center gap-1">
                  <span>Tujuan Pembelajaran</span>
                </label>
                <textarea
                  placeholder="Kemampuan minimal yang dicapai setelah pembelajaran..."
                  rows={2}
                  value={tujuanPembelajaran}
                  onChange={(e) => setTujuanPembelajaran(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 text-xs bg-white resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-650 flex items-center gap-1">
                  <span>Materi / Topik Pembelajaran</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <textarea
                  required
                  placeholder="Contoh: Operasi Aljabar, Persamaan Linier, Past Tense..."
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 text-xs bg-white resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-650">Pencapaian KKTP</label>
                <input
                  type="text"
                  placeholder="misal: Tercapai, Belum Tercapai..."
                  value={pencapaianKktp}
                  onChange={(e) => setPencapaianKktp(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-650">Catatan KBM / Hambatan (Opsional)</label>
                <textarea
                  placeholder="Tulis hambatan, PR, atau catatan siswa khusus pada hari ini..."
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 text-xs bg-white resize-none"
                />
              </div>

              <button
                onClick={handleSaveJournal}
                disabled={isSaving || classStudents.length === 0}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100 border border-indigo-700 flex items-center justify-center gap-2 ml-0"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Simpan Jurnal & Absensi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Attendance mapping of selected class roster */}
          <div className="lg:col-span-8 flex flex-col gap-4 text-left">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Users size={16} className="text-emerald-500" />
                    Daftar Absensi Mapel Kelas {selectedClass}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Silakan input kehadiran pelajaran untuk {classStudents.length} siswa hari ini.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllHadir}
                    disabled={classStudents.length === 0}
                    type="button"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 disabled:bg-slate-50 disabled:text-slate-400 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <Check size={12} className="stroke-[3px]" />
                    Set Hadir Semua
                  </button>
                </div>
              </div>

              {/* Attendance Quick Stats Panel */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Hadir</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">{currentDailyStats.hadir}</span>
                </div>
                <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-amber-550 text-amber-600">Terlambat</span>
                  <span className="text-sm font-black text-amber-650 mt-0.5">{currentDailyStats.terlambat}</span>
                </div>
                <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-sky-500">Sakit</span>
                  <span className="text-sm font-black text-sky-650 mt-0.5">{currentDailyStats.sakit}</span>
                </div>
                <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-indigo-550 text-indigo-600">Izin</span>
                  <span className="text-sm font-black text-indigo-650 mt-0.5">{currentDailyStats.izin}</span>
                </div>
                <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex flex-col items-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-rose-500">Alpa</span>
                  <span className="text-sm font-black text-rose-650 mt-0.5">{currentDailyStats.alpa}</span>
                </div>
              </div>

              {/* Student Search and Roster Table */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama siswa atau NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs font-semibold text-slate-800"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={13} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150">
                  <thead className="bg-slate-50/50">
                    <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-5 py-3 text-left w-12">No</th>
                      <th className="px-5 py-3 text-left">Nama Siswa</th>
                      <th className="px-5 py-3 text-center">Status Presensi Pelajaran</th>
                      <th className="px-5 py-3 text-left">Keterangan Khusus / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-400 font-semibold font-sans">
                          {classStudents.length === 0 
                            ? 'Tidak ada data siswa untuk kelas ini.' 
                            : 'Tidak ada siswa yang cocok dengan pencarian.'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, idx) => {
                        const studentRecord = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/40 transition-all">
                            <td className="px-5 py-3.5 font-bold text-slate-400 font-sans">{idx + 1}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-900 leading-tight">{student.name}</span>
                                <span className="text-[10px] font-sans font-bold text-slate-450 text-slate-400 mt-1">NIS: {student.nis}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1 bg-slate-50 border border-slate-150 p-1 rounded-xl w-fit mx-auto self-center">
                                {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map(status => {
                                  let bgClass = 'hover:bg-white text-slate-600';
                                  if (studentRecord.status === status) {
                                    if (status === 'Hadir') bgClass = 'bg-emerald-600 text-white shadow-xs';
                                    else if (status === 'Terlambat') bgClass = 'bg-amber-500 text-white shadow-xs';
                                    else if (status === 'Sakit') bgClass = 'bg-sky-500 text-white shadow-xs';
                                    else if (status === 'Izin') bgClass = 'bg-indigo-600 text-white shadow-xs';
                                    else if (status === 'Alpa') bgClass = 'bg-rose-500 text-white shadow-xs';
                                  }
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(student.id, status)}
                                      type="button"
                                      className={`px-2 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${bgClass}`}
                                    >
                                      {status === 'Alpa' ? 'Alpa' : status}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <input
                                type="text"
                                placeholder={
                                  studentRecord.status === 'Sakit' ? 'Sakit apa (cth: Demam)...' :
                                  studentRecord.status === 'Izin' ? 'Izin apa (cth: Acara keluarga)...' :
                                  studentRecord.status === 'Terlambat' ? 'Cth: Terlambat 15 menit...' :
                                  'Catatan kecil (opsional)...'
                                }
                                value={studentRecord.notes}
                                onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-lg font-medium text-[11px] text-slate-700 placeholder-slate-400"
                              />
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
      )}

      {/* View: Riwayat Jurnal */}
      {activeSubTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm text-left overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Riwayat Jurnal KBM & Presensi Mapel</h3>
              <p className="text-xs text-slate-500 mt-1">Daftar jurnal pembelajaran yang pernah diisi oleh Bapak/Ibu guru.</p>
            </div>
          </div>

          {!loadingJournals && journals.length > 0 && (
            <div className="p-5 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row gap-4 items-end justify-between select-none">
              <div className="flex gap-4 flex-wrap w-full md:w-auto">
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tanggal Mulai</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5 min-w-[140px]">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tanggal Selesai</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-extrabold rounded-xl text-xs uppercase cursor-pointer transition-all self-end"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (filteredJournals.length === 0) {
                    alert("Tidak ada jurnal pembelajaran dalam rentang waktu yang dipilih untuk dicetak.");
                    return;
                  }
                  setShowCollectivePrintModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm self-start md:self-end"
              >
                <Printer size={13} />
                <span>Cetak Jurnal Kolektif ({filteredJournals.length})</span>
              </button>
            </div>
          )}

          {loadingJournals ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-450 text-slate-400">
              <Loader2 className="animate-spin text-slate-500 mb-2" size={24} />
              <span className="text-xs font-semibold">Memuat riwayat jurnal...</span>
            </div>
          ) : journals.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-semibold text-xs">
              Belum ada riwayat pengisian Jurnal Pembelajaran untuk mata pelajaran ini.
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-semibold text-xs">
              Tidak ada jurnal pembelajaran yang cocok dalam rentang waktu yang dipilih.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...filteredJournals].reverse().map((journal) => {
                const totalSiswa = journal.attendance.length;
                const hadirCount = journal.attendance.filter(a => a.status === 'Hadir').length;
                const terlambatCount = journal.attendance.filter(a => a.status === 'Terlambat').length;
                const sakitCount = journal.attendance.filter(a => a.status === 'Sakit').length;
                const izinCount = journal.attendance.filter(a => a.status === 'Izin').length;
                const alpaCount = journal.attendance.filter(a => a.status === 'Alpa').length;

                return (
                  <div key={journal.id} className="p-5 hover:bg-slate-50/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-3 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-120 font-black text-[10px] text-indigo-700 uppercase tracking-wider">
                          Mata Pelajaran {journal.subject}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 font-black text-[10px] text-emerald-800 uppercase tracking-widest font-sans">
                          {journal.className}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 font-sans">
                          <Calendar size={12} />
                          {new Date(journal.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <h4 className="font-extrabold text-slate-950 text-sm">
                          {journal.topic}
                        </h4>
                        {journal.notes && (
                          <p className="text-slate-500 text-[11px] leading-relaxed italic bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-1.5">
                            " {journal.notes} "
                          </p>
                        )}
                      </div>

                      {/* Attendances mini bar stats */}
                      <div className="flex gap-4 items-center flex-wrap pt-0.5 text-[10.5px] font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Hadir: <strong className="text-slate-800 font-extrabold">{hadirCount}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Terlambat: <strong className="text-slate-800 font-extrabold">{terlambatCount}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          Sakit: <strong className="text-slate-800 font-extrabold">{sakitCount}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-550 bg-indigo-600" />
                          Izin: <strong className="text-slate-800 font-extrabold">{izinCount}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Alpa: <strong className="text-rose-600 font-extrabold">{alpaCount}</strong>
                        </span>
                        <span className="text-[10px] uppercase font-black text-slate-400 border-l border-slate-250 pl-2">
                          Total: {totalSiswa} Siswa
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap h-fit self-start md:self-center pr-1 select-none">
                      <button
                        onClick={() => setHistoryDetailJournal(journal)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 border border-slate-202 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Rincian</span>
                        <ChevronRight size={13} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => setSelectedJournalToPrint(journal)}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-120 text-indigo-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Cetak Jurnal (PDF)"
                      >
                        <Printer size={13} />
                        <span>Cetak</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View: Notifikasi dan Pengumuman Sekolah */}
      {activeSubTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm text-left overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4 select-none">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Bell size={16} className="text-indigo-600 animate-bounce" />
                Pemberitahuan & Pengumuman Sekolah
              </h3>
              <p className="text-xs text-slate-500 mt-1">Daftar pemberitahuan, edaran, dan pengumuman resmi dari pihak sekolah.</p>
            </div>
            
            <div className="relative w-full max-w-xs">
              <input
                type="text"
                placeholder="Cari pengumuman..."
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-xs font-semibold text-slate-800 bg-white"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={13} />
              </div>
            </div>
          </div>

          {loadingNotifications ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 font-semibold font-sans">
              <Loader2 className="animate-spin text-slate-500 mb-2" size={24} />
              <span className="text-xs">Memuat pengumuman...</span>
            </div>
          ) : systemNotifications.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2">
              <Bell size={24} className="text-slate-300 stroke-[1.5]" />
              <span>Belum ada pengumuman atau notifikasi resmi saat ini.</span>
            </div>
          ) : (
            (() => {
              const q = notifSearch.toLowerCase().trim();
              const filtered = systemNotifications.filter(n => 
                n.title.toLowerCase().includes(q) || 
                n.message.toLowerCase().includes(q)
              );
              if (filtered.length === 0) {
                return (
                  <div className="py-20 text-center text-slate-400 font-semibold text-xs animate-pulse">
                    Tidak ada pengumuman yang sesuai dengan pencarian Anda.
                  </div>
                );
              }
              return (
                <div className="divide-y divide-slate-150 bg-white leading-relaxed">
                  {filtered.map((notif) => {
                    let badgeClass = 'bg-slate-50 text-slate-650 border-slate-200';
                    if (notif.type === 'info') badgeClass = 'bg-sky-50 text-sky-700 border-sky-100';
                    else if (notif.type === 'success') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    else if (notif.type === 'warning') badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                    else if (notif.type === 'payment') badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';

                    return (
                      <div key={notif.id} className="p-5 hover:bg-slate-50/20 transition-all flex gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shadow-inner">
                          <Bell size={18} className="text-slate-605" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5 select-none">
                            <span className={`px-2 py-0.5 rounded-md border text-[8.5px] font-black uppercase tracking-wider ${badgeClass}`}>
                              {notif.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold font-mono">
                              {new Date(notif.createdAt).toLocaleDateString('id-ID', { hour: 'numeric', minute: 'numeric', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-xs text-left">
                            {notif.title}
                          </h4>
                          <p className="text-slate-600 text-[11px] leading-relaxed mt-1 font-medium whitespace-pre-line text-left">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* View: Profil Guru Mapel */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          {/* Left Column: Teacher Identity Info */}
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600" />
              
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white mb-4 shadow-indigo-100 select-none">
                {currentTeacher.name.split(' ').map((n, i) => i < 2 ? n[0] : '').join('').toUpperCase()}
              </div>

              <h3 className="font-black text-slate-900 text-base subpixel-antialiased tracking-tight">
                {currentTeacher.name}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-black uppercase mt-1 select-none">
                Guru Mata Pelajaran
              </span>

              <p className="text-slate-400 text-xs font-semibold mt-1 font-sans">
                {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
              </p>

              <div className="w-full border-t border-slate-100 my-4 pt-4 flex flex-col gap-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold">Mata Pelajaran</span>
                  <span className="font-black text-slate-900">{currentTeacher.subject}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold">Username Akun</span>
                  <span className="font-black text-slate-900">{currentTeacher.username}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold">Total Rekap KBM</span>
                  <span className="font-black text-slate-900 text-indigo-650">{journals.length} Kali</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-full mt-2 py-2.5 bg-rose-50 hover:bg-rose-105 hover:bg-rose-50 text-rose-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-rose-100 select-none"
              >
                <LogOut size={13} className="stroke-[2.5]" />
                <span>Keluar Sesi Guru</span>
              </button>
            </div>
          </div>

          {/* Right Column: Detailed School Identity & Stat details */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
              <h3 className="font-extrabold text-slate-950 text-sm border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
                <ShieldCheck size={16} className="text-indigo-600 animate-pulse" />
                <span>Data Verifikasi Sekolah & Lembaga</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="flex flex-col gap-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Nama Institusi</span>
                  <span className="font-extrabold text-slate-800">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                </div>

                <div className="flex flex-col gap-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Kepala Sekolah</span>
                  <span className="font-extrabold text-slate-800">{schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</span>
                </div>

                <div className="flex flex-col gap-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Akreditasi Sekolah</span>
                  <span className="font-extrabold text-slate-800">{schoolIdentity?.accreditation || "Terakreditasi A"}</span>
                </div>

                <div className="flex flex-col gap-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Alamat Lengkap</span>
                  <span className="font-extrabold text-slate-800">{schoolIdentity?.address || "Pasuruan, Jawa Timur"}</span>
                </div>
              </div>

              <div className="mt-2 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-indigo-950 text-[12px]">Pusat Kinerja Pembelajaran Guru Mapel</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed mt-1">
                    Seluruh rekapitulasi pengisian jurnal agenda pembelajaran dinilai berkala oleh kepala sekolah demi peningkatan standar KKTP {schoolIdentity?.name || "SMP Ma'arif NU Pandaan"}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rincian Absensi History Modal popup */}
      <AnimatePresence>
        {historyDetailJournal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md no-print p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-w-2xl w-full text-left relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm uppercase text-amber-400 tracking-wider">
                    Rincian Kehadiran Pelajaran
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Mata Pelajaran: {historyDetailJournal.subject} | Kelas {historyDetailJournal.className}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryDetailJournal(null)}
                  className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Topic header info */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Materi Pembelajaran</span>
                <p className="font-extrabold text-slate-900 text-sm mt-1 leading-relaxed">
                  {historyDetailJournal.topic}
                </p>
                <div className="flex gap-4 items-center text-[11px] font-semibold text-slate-500 mt-3 border-t border-slate-150 pt-3">
                  <span>Tanggal: <strong className="text-slate-800">{new Date(historyDetailJournal.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span>Total Absensi: <strong className="text-slate-800">{historyDetailJournal.attendance.length} Siswa</strong></span>
                </div>
              </div>

              {/* Table scroll */}
              <div className="max-h-[350px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-150">
                  <thead className="bg-slate-50 uppercase text-[9px] font-bold text-slate-400 tracking-wider sticky top-0">
                    <tr>
                      <th className="px-5 py-2.5 text-left w-12">No</th>
                      <th className="px-5 py-2.5 text-left">Nama Lengkap</th>
                      <th className="px-5 py-2.5 text-center">Presensi KBM</th>
                      <th className="px-5 py-2.5 text-left">Catatan KBM Siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {historyDetailJournal.attendance.map((att, idx) => {
                      let tagClass = 'bg-slate-100 text-slate-750 border-slate-200';
                      if (att.status === 'Hadir') tagClass = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                      else if (att.status === 'Terlambat') tagClass = 'bg-amber-50 text-amber-800 border-amber-150';
                      else if (att.status === 'Sakit') tagClass = 'bg-sky-50 text-sky-800 border-sky-100';
                      else if (att.status === 'Izin') tagClass = 'bg-indigo-50 text-indigo-800 border-indigo-150';
                      else if (att.status === 'Alpa') tagClass = 'bg-rose-50 text-rose-800 border-rose-100';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="px-5 py-2.5 font-bold text-slate-400 font-sans">{idx + 1}</td>
                          <td className="px-5 py-2.5 font-extrabold text-slate-900">{att.studentName}</td>
                          <td className="px-5 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full border text-[9.5px] font-black uppercase tracking-wider ${tagClass}`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-500 italic font-medium">
                            {att.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-wrap gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJournalToPrint(historyDetailJournal);
                    setHistoryDetailJournal(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} />
                  <span>Cetak PDF / Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryDetailJournal(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm border border-slate-950"
                >
                  Tutup Rincian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600" />
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
                Jurnal KBM Berhasil Disimpan!
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-2 px-1">
                Jurnal pembelajaran dan rekap absensi KBM mapel <span className="font-extrabold text-slate-800">{currentTeacher.subject}</span> di <span className="font-extrabold text-slate-800">Kelas {selectedClass}</span> tanggal <span className="font-bold text-slate-800">{new Date(selectedDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span> telah disimpan & disinkronkan.
              </p>

              {/* Micro stats review */}
              <div className="mt-5 w-full bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-2 relative z-10 text-xs">
                <div className="flex justify-between items-center text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Hadir / Terlambat
                  </span>
                  <span className="font-black text-slate-900 font-sans">
                    {currentDailyStats.hadir + currentDailyStats.terlambat} Murid
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Sakit / Izin
                  </span>
                  <span className="font-black text-slate-900 font-sans">
                    {currentDailyStats.sakit + currentDailyStats.izin} Murid
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Tanpa Keterangan
                  </span>
                  <span className="font-black text-rose-650 font-sans">
                    {currentDailyStats.alpa} Murid
                  </span>
                </div>
                <div className="border-t border-slate-200/60 my-0.5 pt-1.5 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Total Partisipan</span>
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

      {/* MODAL PRINT OUT JURNAL INDIVIDUAL (SUBJECT TEACHER) */}
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
                    <h2 className="text-base font-extrabold uppercase tracking-widest text-slate-950 font-sans">
                      JURNAL MENGAJAR GURU
                    </h2>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono mt-0.5">
                      TAHUN PELAJARAN 2025 / 2026
                    </h3>
                  </div>

                  {/* Meta Information Field */}
                  <div className="grid grid-cols-2 gap-x-8 text-[11px] border border-slate-300 p-4 rounded-xl bg-slate-50/10 font-sans select-none text-slate-900">
                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Mata Pelajaran</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">{selectedJournalToPrint.subject}</span>
                      </div>
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Kelas/Semester</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">Kelas {selectedJournalToPrint.className} / {selectedJournalToPrint.semester || "Genap"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Fase</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">{selectedJournalToPrint.fase || "D"}</span>
                      </div>
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Alokasi Waktu</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">{selectedJournalToPrint.alokasiWaktu || "2 JP"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Indonesian Printed Reference Jurnal Mengajar Guru Table */}
                  <div className="w-full">
                    <table className="w-full border-collapse border border-slate-900 text-[10px] text-slate-950">
                      <thead>
                        <tr className="bg-slate-100 font-bold uppercase tracking-wider text-slate-900 text-center select-none">
                          <th className="border border-slate-900 px-2 py-3 text-[10px]" style={{ width: '12%', border: '1px solid #000' }}>Hari / Tanggal</th>
                          <th className="border border-slate-900 px-1 py-3 text-[9px]" style={{ width: '6%', border: '1px solid #000' }}>Jam Ke</th>
                          <th className="border border-slate-900 px-1 py-3 text-[9px]" style={{ width: '6%', border: '1px solid #000' }}>JP</th>
                          <th className="border border-slate-900 px-1 py-3 text-[9px]" style={{ width: '7%', border: '1px solid #000' }}>Pertemuan Ke</th>
                          <th className="border border-slate-900 px-2.5 py-3 text-[10px]" style={{ width: '23%', border: '1px solid #000' }}>Tujuan Pembelajaran</th>
                          <th className="border border-slate-900 px-2.5 py-3 text-[10px]" style={{ width: '23%', border: '1px solid #000' }}>Materi Pembelajaran</th>
                          <th className="border border-slate-900 px-1.5 py-3 text-[9px]" style={{ width: '8%', border: '1px solid #000' }}>Pencapaian KKTP</th>
                          <th className="border border-slate-900 px-1 py-1 text-[9px]" colSpan={4} style={{ width: '15%', border: '1px solid #000' }}>
                            <div className="border-b border-slate-900 pb-1 mb-1 font-bold text-center">Absensi</div>
                            <div className="grid grid-cols-[60%_13.3%_13.3%_13.3%] text-[8px] font-black text-center tracking-tighter">
                              <span className="text-left pl-1">Nama</span>
                              <span>S</span>
                              <span>I</span>
                              <span>A</span>
                            </div>
                          </th>
                          <th className="border border-slate-900 px-2 py-3 text-[10px]" style={{ width: '10%', border: '1px solid #000' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="align-top">
                          <td className="border border-slate-900 text-center px-1.5 py-2.5 font-bold" style={{ border: '1px solid #000' }}>
                            {new Date(selectedJournalToPrint.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="border border-slate-900 text-center px-1 py-2.5 font-mono" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.jamKe || "-"}
                          </td>
                          <td className="border border-slate-900 text-center px-1 py-2.5 font-mono" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.alokasiWaktu || "-"}
                          </td>
                          <td className="border border-slate-900 text-center px-1 py-2.5 font-mono" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.pertemuanKe || "-"}
                          </td>
                          <td className="border border-slate-900 px-2.5 py-2.5 text-justify leading-relaxed whitespace-pre-wrap" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.tujuanPembelajaran || "Siswa memahami materi pokok bahasan baru."}
                          </td>
                          <td className="border border-slate-900 px-2.5 py-2.5 text-justify leading-relaxed font-extrabold text-slate-900" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.topic}
                          </td>
                          <td className="border border-slate-900 text-center px-1.5 py-2.5 font-bold" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.pencapaianKktp || "Tercapai"}
                          </td>
                          
                          {/* Absensi sub-table renderer */}
                          <td colSpan={4} className="border border-slate-900 p-0 text-left align-top font-mono" style={{ border: '1px solid #000' }}>
                            {(() => {
                              const absents = selectedJournalToPrint.attendance.filter(
                                att => att.status === 'Sakit' || att.status === 'Izin' || att.status === 'Alpa'
                              );
                              if (absents.length === 0) {
                                return (
                                  <div className="text-center text-slate-400 font-bold italic py-3 select-none text-[8px]">
                                    Nihil (Hadir Semua)
                                  </div>
                                );
                              }
                              return (
                                <table className="w-full border-collapse text-[8px] leading-tight">
                                  <tbody>
                                    {absents.map((abs, sIdx) => {
                                      return (
                                        <tr key={sIdx} className={sIdx > 0 ? "border-t border-slate-400" : ""}>
                                          <td className="px-1 py-1 text-left font-sans font-bold truncate max-w-[50px] text-slate-900" style={{ width: '60%', borderRight: '1px solid #000' }}>
                                            {abs.studentName}
                                          </td>
                                          <td className="py-1 text-center font-bold text-amber-600" style={{ width: '13.3%', borderRight: '1px solid #000' }}>
                                            {abs.status === 'Sakit' ? '✔' : ''}
                                          </td>
                                          <td className="py-1 text-center font-bold text-blue-600" style={{ width: '13.3%', borderRight: '1px solid #000' }}>
                                            {abs.status === 'Izin' ? '✔' : ''}
                                          </td>
                                          <td className="py-1 text-center font-bold text-rose-600" style={{ width: '13.3%' }}>
                                            {abs.status === 'Alpa' ? '✔' : ''}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </td>

                          <td className="border border-slate-900 px-2 py-2.5 text-justify text-[9px] text-slate-600 italic leading-relaxed" style={{ border: '1px solid #000' }}>
                            {selectedJournalToPrint.notes || "-"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures section */}
                  <div className="grid grid-cols-2 gap-8 mt-12 mb-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengetahui,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Kepala Sekolah {schoolIdentity?.name || "SMP Maarif NU Pandaan"}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">KEPALA SEKOLAH</span>
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

      {/* MODAL PRINT OUT JURNAL KOLEKTIF / BUKU JOURNAL MENGAJAR GURU */}
      <AnimatePresence>
        {showCollectivePrintModal && (
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
                  <span className="font-extrabold text-slate-800 text-sm">Pratinjau Buku Jurnal Mengajar Guru (Kolektif)</span>
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
                    onClick={() => setShowCollectivePrintModal(false)}
                    className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
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
                        <span className="text-[9px] font-black text-slate-800">BUKU JURNAL MENGAJAR GURU (KOLEKTIF)</span>
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
                        <span className="text-xs font-black text-slate-800">LOG MENGAJAR RESMI</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Dihasilkan: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  )}

                  {/* Title of Document */}
                  <div className="text-center my-1 text-slate-900">
                    <h2 className="text-base font-extrabold uppercase tracking-widest text-slate-950 font-sans">
                      JURNAL MENGAJAR GURU
                    </h2>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono mt-0.5">
                      TAHUN PELAJARAN 2025 / 2026
                    </h3>
                    <p className="text-[9px] text-slate-500 font-semibold font-sans mt-0.5">
                      {startDate && endDate ? (
                        <span>Rentang Waktu: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s.d. {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      ) : startDate ? (
                        <span>Mulai Dari: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      ) : endDate ? (
                        <span>Hingga: {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      ) : (
                        <span>Semua Riwayat Pembelajaran</span>
                      )}
                    </p>
                  </div>

                  {/* Meta Information Field */}
                  <div className="grid grid-cols-2 gap-x-8 text-[11px] border border-slate-300 p-4 rounded-xl bg-slate-50/10 font-sans select-none text-slate-900">
                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Nama Guru</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">{currentTeacher.name}</span>
                      </div>
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Mata Pelajaran</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">{currentTeacher.subject}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Kelas</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">
                          {Array.from(new Set(filteredJournals.map(j => j.className))).sort().join(', ') || "-"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-slate-500">Jumlah Pertemuan</span>
                        <span>:</span>
                        <span className="font-black text-slate-1000">{filteredJournals.length} Pertemuan</span>
                      </div>
                    </div>
                  </div>

                  {/* Jurnal Mengajar Table (Sequential records in one table) */}
                  <div className="w-full">
                    <table className="w-full border-collapse border border-slate-900 text-[10px] text-slate-950">
                      <thead>
                        <tr className="bg-slate-100 font-bold uppercase tracking-wider text-slate-900 text-center select-none">
                          <th className="border border-slate-900 px-2 py-3 text-[10px]" style={{ width: '12%', border: '1px solid #000' }}>Hari / Tanggal / Kelas</th>
                          <th className="border border-slate-900 px-1 py-3 text-[9px]" style={{ width: '6%', border: '1px solid #000' }}>Jam Ke</th>
                          <th className="border border-slate-900 px-1 py-3 text-[9px]" style={{ width: '6%', border: '1px solid #000' }}>JP</th>
                          <th className="border border-slate-900 px-1 py-3 text-[9px]" style={{ width: '7%', border: '1px solid #000' }}>Pertemuan Ke</th>
                          <th className="border border-slate-900 px-2.5 py-3 text-[10px]" style={{ width: '23%', border: '1px solid #000' }}>Tujuan Pembelajaran</th>
                          <th className="border border-slate-900 px-2.5 py-3 text-[10px]" style={{ width: '23%', border: '1px solid #000' }}>Materi Pembelajaran</th>
                          <th className="border border-slate-900 px-1.5 py-3 text-[9px]" style={{ width: '8%', border: '1px solid #000' }}>Pencapaian KKTP</th>
                          <th className="border border-slate-900 px-1 py-1 text-[9px]" colSpan={4} style={{ width: '15%', border: '1px solid #000' }}>
                            <div className="border-b border-slate-900 pb-1 mb-1 font-bold text-center">Absensi</div>
                            <div className="grid grid-cols-[60%_13.3%_13.3%_13.3%] text-[8px] font-black text-center tracking-tighter">
                              <span className="text-left pl-1">Nama</span>
                              <span>S</span>
                              <span>I</span>
                              <span>A</span>
                            </div>
                          </th>
                          <th className="border border-slate-900 px-2 py-3 text-[10px]" style={{ width: '10%', border: '1px solid #000' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJournals.map((journalToPrint, index) => (
                          <tr key={journalToPrint.id || index} className="align-top">
                            <td className="border border-slate-900 text-center px-1.5 py-2.5 font-bold" style={{ border: '1px solid #000' }}>
                              <div>{new Date(journalToPrint.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                              <div className="text-[9px] bg-slate-100 rounded px-1 py-0.5 mt-1 text-slate-705 select-none inline-block font-sans font-black uppercase">{journalToPrint.className}</div>
                            </td>
                            <td className="border border-slate-900 text-center px-1 py-2.5 font-mono" style={{ border: '1px solid #000' }}>
                              {journalToPrint.jamKe || "-"}
                            </td>
                            <td className="border border-slate-900 text-center px-1 py-2.5 font-mono" style={{ border: '1px solid #000' }}>
                              {journalToPrint.alokasiWaktu || "-"}
                            </td>
                            <td className="border border-slate-900 text-center px-1 py-2.5 font-mono" style={{ border: '1px solid #000' }}>
                              {journalToPrint.pertemuanKe || "-"}
                            </td>
                            <td className="border border-slate-900 px-2.5 py-2.5 text-justify leading-relaxed whitespace-pre-wrap" style={{ border: '1px solid #000' }}>
                              {journalToPrint.tujuanPembelajaran || "Siswa memahami materi pokok bahasan baru."}
                            </td>
                            <td className="border border-slate-900 px-2.5 py-2.5 text-justify leading-relaxed font-extrabold text-slate-900" style={{ border: '1px solid #000' }}>
                              {journalToPrint.topic}
                            </td>
                            <td className="border border-slate-900 text-center px-1.5 py-2.5 font-bold" style={{ border: '1px solid #000' }}>
                              {journalToPrint.pencapaianKktp || "Tercapai"}
                            </td>
                            
                            {/* Absensi sub-table renderer */}
                            <td colSpan={4} className="border border-slate-900 p-0 text-left align-top font-mono" style={{ border: '1px solid #000' }}>
                              {(() => {
                                const absents = journalToPrint.attendance.filter(
                                  att => att.status === 'Sakit' || att.status === 'Izin' || att.status === 'Alpa'
                                );
                                if (absents.length === 0) {
                                  return (
                                    <div className="text-center text-slate-400 font-bold italic py-3 select-none text-[8px]">
                                      Nihil (Hadir Semua)
                                    </div>
                                  );
                                }
                                return (
                                  <table className="w-full border-collapse text-[8px] leading-tight">
                                    <tbody>
                                      {absents.map((abs, sIdx) => {
                                        return (
                                          <tr key={sIdx} className={sIdx > 0 ? "border-t border-slate-300" : ""}>
                                            <td className="px-1 py-1 text-left font-sans font-bold truncate max-w-[50px] text-slate-900" style={{ width: '60%', borderRight: '1px solid #000' }}>
                                              {abs.studentName}
                                            </td>
                                            <td className="py-1 text-center font-bold text-amber-600" style={{ width: '13.3%', borderRight: '1px solid #000' }}>
                                              {abs.status === 'Sakit' ? '✔' : ''}
                                            </td>
                                            <td className="py-1 text-center font-bold text-blue-600" style={{ width: '13.3%', borderRight: '1px solid #000' }}>
                                              {abs.status === 'Izin' ? '✔' : ''}
                                            </td>
                                            <td className="py-1 text-center font-bold text-rose-600" style={{ width: '13.3%' }}>
                                              {abs.status === 'Alpa' ? '✔' : ''}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </td>

                            <td className="border border-slate-900 px-2 py-2.5 text-justify text-[9px] text-slate-600 italic leading-relaxed" style={{ border: '1px solid #000' }}>
                              {journalToPrint.notes || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures section */}
                  <div className="grid grid-cols-2 gap-8 mt-12 mb-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengetahui,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Kepala Sekolah {schoolIdentity?.name || "SMP Maarif NU Pandaan"}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">KEPALA SEKOLAH</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Tanda Tangan,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Guru Mata Pelajaran</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{currentTeacher.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">GURU MATA PELAJARAN</span>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-2 py-1.5 flex justify-around items-center z-40 no-print select-none">
        <button
          type="button"
          onClick={() => { setActiveSubTab('create'); setFeedback(null); }}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeSubTab === 'create'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500'
          }`}
        >
          <ClipboardCheck size={20} className={activeSubTab === 'create' ? 'text-indigo-600' : ''} />
          <span className="text-[9px] text-center font-bold tracking-tight leading-none">Jurnal & Absensi</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('history'); setFeedback(null); }}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeSubTab === 'history'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500'
          }`}
        >
          <History size={20} className={activeSubTab === 'history' ? 'text-indigo-600' : ''} />
          <span className="text-[9px] text-center font-bold tracking-tight leading-none">Riwayat Jurnal</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('notifications'); setFeedback(null); }}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-colors cursor-pointer relative ${
            activeSubTab === 'notifications'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Bell size={20} className={activeSubTab === 'notifications' ? 'text-indigo-600' : ''} />
            {systemNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white leading-none">
                {systemNotifications.length}
              </span>
            )}
          </div>
          <span className="text-[9px] text-center font-bold tracking-tight leading-none">Notifikasi</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('profile'); setFeedback(null); }}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-colors cursor-pointer ${
            activeSubTab === 'profile'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500'
          }`}
        >
          <User size={20} className={activeSubTab === 'profile' ? 'text-indigo-600' : ''} />
          <span className="text-[9px] text-center font-bold tracking-tight leading-none font-sans">Profil</span>
        </button>
      </div>
    </div>
  );
}
