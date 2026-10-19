import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, SubjectTeacher, HomeroomTeacher, MerdekaAssessment, SchoolIdentity, ClassSchedule, CurriculumSubject, AttendanceLog } from '../types';
import ScheduleView from './ScheduleView';
import { SharedTpBankView } from './SharedTpBankView';
import { 
  BookOpen, 
  FileSpreadsheet, 
  BarChart3, 
  Key, 
  Upload, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  GraduationCap, 
  Search, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Calendar,
  ShieldCheck,
  Check,
  FileText,
  Home,
  LayoutGrid,
  Eye,
  Printer,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Filter,
  ClipboardCheck,
  Plus,
  Trash2,
  Edit2,
  Layers,
  Save,
  Tag,
  Hash
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Subject normalizer for reliable cross-matching (e.g. IPA <=> Ilmu Pengetahuan Alam (IPA))
export const normalizeSubject = (subj?: string): string => {
  if (!subj) return '';
  const s = subj.trim().toLowerCase();
  if (s === 'pai' || s.includes('agama islam')) return 'Pendidikan Agama Islam';
  if (s.includes('pancasila') || s === 'pkn' || s === 'ppkn') return 'Pendidikan Pancasila';
  if (s === 'b. indonesia' || s === 'bahasa indonesia' || s === 'bindo' || s.includes('indonesia')) return 'Bahasa Indonesia';
  if (s === 'mtk' || s === 'mat' || s.includes('matematika')) return 'Matematika';
  if (s === 'ipa' || s.includes('pengetahuan alam')) return 'Ilmu Pengetahuan Alam (IPA)';
  if (s === 'ips' || s.includes('pengetahuan sosial')) return 'Ilmu Pengetahuan Sosial (IPS)';
  if (s === 'b. inggris' || s === 'bahasa inggris' || s === 'bing' || s.includes('inggris')) return 'Bahasa Inggris';
  if (s.includes('seni') || s.includes('budaya') || s === 'sbk') return 'Seni Budaya';
  if (s === 'pjok' || s.includes('jasmani') || s.includes('olahraga') || s.includes('penjas')) return 'Pendidikan Jasmani, Olahraga, dan Kesehatan';
  if (s.includes('informatika') || s.includes('komputer') || s === 'infor' || s === 'tik') return 'Informatika';
  if (s === 'b. daerah' || s === 'bahasa daerah' || s.includes('jawa') || s.includes('muatan lokal') || s === 'mulok' || s === 'bjawa') return 'Muatan Lokal: Bahasa Daerah';
  if (s.includes('prakarya')) return 'Prakarya';
  if (s.includes('aswaja') || s.includes('ke-nu-an')) return 'Ke-NU-an / Aswaja';
  if (s.includes('arab')) return 'Bahasa Arab';
  if (s.includes('konseling') || s === 'bk') return 'Bimbingan Konseling';
  if (s.includes('kokurikuler') || s.includes('p5')) return 'Kokurikuler';
  return subj.trim();
};

export const isSameSubject = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  const sA = a.toLowerCase().trim();
  const sB = b.toLowerCase().trim();
  if (sA === sB) return true;
  return normalizeSubject(a).toLowerCase() === normalizeSubject(b).toLowerCase();
};

export const normClass = (cls?: string): string => {
  return (cls || '').replace(/[\s-]/g, '').toUpperCase();
};

export const OFFICIAL_REPORT_ORDER: string[] = [
  'Pendidikan Agama Islam',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'Informatika',
  'Muatan Lokal: Bahasa Daerah'
];

export const DEFAULT_REPORT_SUBJECTS: Array<{ id: string; code: string; name: string; category: string; kktp: number; orderNum: number }> = [
  { id: 'mapel-pai', code: 'PAI', name: 'Pendidikan Agama Islam', category: 'Muatan Nasional', kktp: 75, orderNum: 1 },
  { id: 'mapel-ppkn', code: 'PPKN', name: 'Pendidikan Pancasila', category: 'Muatan Nasional', kktp: 75, orderNum: 2 },
  { id: 'mapel-bindo', code: 'BINDO', name: 'Bahasa Indonesia', category: 'Muatan Nasional', kktp: 75, orderNum: 3 },
  { id: 'mapel-mtk', code: 'MAT', name: 'Matematika', category: 'Muatan Nasional', kktp: 75, orderNum: 4 },
  { id: 'mapel-ipa', code: 'IPA', name: 'Ilmu Pengetahuan Alam (IPA)', category: 'Muatan Nasional', kktp: 75, orderNum: 5 },
  { id: 'mapel-ips', code: 'IPS', name: 'Ilmu Pengetahuan Sosial (IPS)', category: 'Muatan Nasional', kktp: 75, orderNum: 6 },
  { id: 'mapel-bing', code: 'BING', name: 'Bahasa Inggris', category: 'Muatan Nasional', kktp: 75, orderNum: 7 },
  { id: 'mapel-seni', code: 'SENI', name: 'Seni Budaya', category: 'Muatan Nasional', kktp: 75, orderNum: 8 },
  { id: 'mapel-pjok', code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', category: 'Muatan Nasional', kktp: 75, orderNum: 9 },
  { id: 'mapel-infor', code: 'INFOR', name: 'Informatika', category: 'Muatan Nasional', kktp: 75, orderNum: 10 },
  { id: 'mapel-bjawa', code: 'MULOK', name: 'Muatan Lokal: Bahasa Daerah', category: 'Muatan Lokal', kktp: 75, orderNum: 11 },
  { id: 'mapel-barab', code: 'BARAB', name: 'Bahasa Arab', category: 'Muatan Lokal', kktp: 75, orderNum: 12 },
  { id: 'mapel-aswaja', code: 'ASWAJA', name: 'Ke-NU-an / Aswaja', category: 'Muatan Lokal', kktp: 75, orderNum: 13 },
];

export const cleanTeacherName = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(s\.pd\.?i?|m\.pd\.?i?|s\.si|s\.mat|s\.sos|shi|s\.kom|a\.md|s\.s|s\.psi|dra\.|drs\.|h\.|hj\.|kh\.)/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

export const getCanonicalTeacherId = (id?: string): string => {
  if (!id) return '';
  const trimmed = id.trim();
  if (trimmed.startsWith('st-sync-')) {
    return trimmed.replace('st-sync-', '');
  }
  return trimmed;
};

export const hasAssessmentData = (a?: MerdekaAssessment): boolean => {
  if (!a) return false;
  if (a.nilaiRataTp !== undefined && Number(a.nilaiRataTp) > 0) return true;
  if (a.nilaiAkhirMapel !== undefined && Number(a.nilaiAkhirMapel) > 0) return true;
  if (a.nilaiKokurikuler !== undefined && Number(a.nilaiKokurikuler) > 0) return true;
  if (a.nilaiPts !== undefined && Number(a.nilaiPts) > 0) return true;
  if (a.nilaiPas !== undefined && Number(a.nilaiPas) > 0) return true;
  if (a.nilaiTp1 !== undefined && Number(a.nilaiTp1) > 0) return true;
  if (a.nilaiTp2 !== undefined && Number(a.nilaiTp2) > 0) return true;
  if (a.nilaiTp3 !== undefined && Number(a.nilaiTp3) > 0) return true;
  if (a.nilaiTp4 !== undefined && Number(a.nilaiTp4) > 0) return true;
  if (a.tp1Uh || a.tp1Tugas1 || a.tp1Tugas2) return true;
  if (a.tp2Uh || a.tp2Tugas1 || a.tp2Tugas2) return true;
  if (a.tp3Uh || a.tp3Tugas1 || a.tp3Tugas2) return true;
  if (a.tp4Uh || a.tp4Tugas1 || a.tp4Tugas2) return true;
  if (a.nilaiFormatif !== undefined && Number(a.nilaiFormatif) > 0) return true;
  if (a.nilaiSumatifLM !== undefined && Number(a.nilaiSumatifLM) > 0) return true;
  if (a.nilaiSAS !== undefined && Number(a.nilaiSAS) > 0) return true;
  if (a.nilaiRapor !== undefined && Number(a.nilaiRapor) > 0) return true;
  if (a.deskripsiCapaian && a.deskripsiCapaian.trim().length > 0) return true;
  return false;
};

const getSemesterFromDate = (dateStr?: string): 'Ganjil' | 'Genap' => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const m = d.getMonth() + 1;
  return (m >= 7 && m <= 12) ? 'Ganjil' : 'Genap';
};

interface WakaKurikulumPanelProps {
  students: Student[];
  subjectTeachers: SubjectTeacher[];
  homerooms: HomeroomTeacher[];
  merdekaAssessments: MerdekaAssessment[];
  classSchedules?: ClassSchedule[];
  schoolIdentity?: SchoolIdentity;
  attendanceLogs?: AttendanceLog[];
  onRefreshData?: () => void;
}

export default function WakaKurikulumPanel({
  students,
  subjectTeachers,
  homerooms,
  merdekaAssessments,
  classSchedules = [],
  schoolIdentity,
  attendanceLogs = [],
  onRefreshData
}: WakaKurikulumPanelProps) {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'schedules' | 'master_mapel' | 'import_pts_pas' | 'rekap_nilai' | 'detail_nilai' | 'rapor_tengah_semester' | 'password'>('monitoring');
  const [masterMapelSubTab, setMasterMapelSubTab] = useState<'mapel_list' | 'bank_tp'>('mapel_list');
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Master Data Mata Pelajaran State
  const [curriculumSubjectsList, setCurriculumSubjectsList] = useState<CurriculumSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);
  const [isSavingSubject, setIsSavingSubject] = useState<boolean>(false);
  const [subjectFeedback, setSubjectFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingSubject, setEditingSubject] = useState<CurriculumSubject | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [subjectForm, setSubjectForm] = useState<{
    id?: string;
    code: string;
    name: string;
    category: string;
    kktp: number;
    tingkat: string;
    orderNum: number;
    description: string;
  }>({
    code: '',
    name: '',
    category: 'Muatan Nasional',
    kktp: 75,
    tingkat: 'Semua Tingkat',
    orderNum: 1,
    description: ''
  });

  const fetchCurriculumSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const res = await fetch(`/api/curriculum/subjects?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.subjects)) {
          setCurriculumSubjectsList(data.subjects);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat master data mata pelajaran:", err);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchCurriculumSubjects();
  }, []);

  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      code: '',
      name: '',
      category: 'Muatan Nasional',
      kktp: 75,
      tingkat: 'Semua Tingkat',
      orderNum: (curriculumSubjectsList.length + 1),
      description: ''
    });
    setSubjectFeedback(null);
    setShowSubjectModal(true);
  };

  const handleOpenEditSubject = (subj: CurriculumSubject) => {
    setEditingSubject(subj);
    setSubjectForm({
      id: subj.id,
      code: subj.code,
      name: subj.name,
      category: subj.category || 'Muatan Nasional',
      kktp: subj.kktp ?? 75,
      tingkat: subj.tingkat || 'Semua Tingkat',
      orderNum: subj.orderNum ?? 1,
      description: subj.description || ''
    });
    setSubjectFeedback(null);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.code.trim() || !subjectForm.name.trim()) {
      setSubjectFeedback({ type: 'error', text: 'Kode dan Nama Mata Pelajaran wajib diisi.' });
      return;
    }
    setIsSavingSubject(true);
    setSubjectFeedback(null);
    try {
      const isEdit = !!editingSubject?.id;
      const url = isEdit ? `/api/curriculum/subjects/${editingSubject.id}` : '/api/curriculum/subjects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subjectForm.id || `mapel-${subjectForm.code.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          code: subjectForm.code.trim().toUpperCase(),
          name: subjectForm.name.trim(),
          category: subjectForm.category,
          kktp: Number(subjectForm.kktp) || 75,
          tingkat: subjectForm.tingkat,
          orderNum: Number(subjectForm.orderNum) || 1,
          description: subjectForm.description.trim()
        })
      });

      const resData = await res.json();
      if (res.ok) {
        if (Array.isArray(resData.subjects)) {
          setCurriculumSubjectsList(resData.subjects);
        } else {
          fetchCurriculumSubjects();
        }
        setShowSubjectModal(false);
        setSubjectFeedback({
          type: 'success',
          text: resData.message || `Mata pelajaran ${subjectForm.name} berhasil disimpan ke master data.`
        });
        if (onRefreshData) onRefreshData();
      } else {
        setSubjectFeedback({ type: 'error', text: resData.error || 'Gagal menyimpan mata pelajaran.' });
      }
    } catch (err: any) {
      setSubjectFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan sistem saat menyimpan.' });
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (subj: CurriculumSubject) => {
    if (!confirm(`Hapus mata pelajaran "${subj.name}" (${subj.code}) dari master data?\n\nPerhatian: Mapel ini akan dihapus permanen dari sistem dan basis data MySQL.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/curriculum/subjects/${subj.id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok) {
        if (Array.isArray(resData.subjects)) {
          setCurriculumSubjectsList(resData.subjects);
        } else {
          await fetchCurriculumSubjects();
        }
        setSubjectFeedback({ type: 'success', text: `Mata pelajaran "${subj.name}" berhasil dihapus permanen dari database MySQL.` });
        if (onRefreshData) onRefreshData();
      } else {
        alert(resData.error || 'Gagal menghapus mata pelajaran.');
      }
    } catch (err: any) {
      alert('Kesalahan saat menghapus: ' + err.message);
    }
  };

  const handleResetDefaultSubjects = async () => {
    if (!confirm('Kembalikan Master Data Mata Pelajaran ke standar Kurikulum Merdeka (13 Mapel Nasional & Lokal)?')) {
      return;
    }
    try {
      const res = await fetch('/api/curriculum/subjects/reset-defaults', { method: 'POST' });
      const resData = await res.json();
      if (res.ok) {
        if (Array.isArray(resData.subjects)) {
          setCurriculumSubjectsList(resData.subjects);
        } else {
          fetchCurriculumSubjects();
        }
        setSubjectFeedback({ type: 'success', text: 'Master data mata pelajaran berhasil direset ke standar Kurikulum Merdeka!' });
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      alert('Gagal mereset: ' + err.message);
    }
  };

  // Detail Nilai Guru & Wali Kelas States
  const [detailRoleFilter, setDetailRoleFilter] = useState<'all' | 'subject_teacher' | 'homeroom'>('all');
  const [detailTeacherFilter, setDetailTeacherFilter] = useState<string>('all');
  const [detailSubjectFilter, setDetailSubjectFilter] = useState<string>('all');
  const [detailClassFilter, setDetailClassFilter] = useState<string>('all');
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<'all' | 'complete' | 'incomplete' | 'mapel_filled' | 'koku_filled'>('all');

  // Selected Student for Modal View
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Live assessments state for real-time synchronization
  const [liveAssessments, setLiveAssessments] = useState<MerdekaAssessment[]>(merdekaAssessments || []);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);

  // Function to pull latest assessments from server
  const fetchLiveAssessments = async () => {
    setIsRefreshingLive(true);
    try {
      const res = await fetch(`/api/merdeka-assessments?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLiveAssessments(data);
        }
      }
    } catch (e) {
      console.error('Gagal mengambil data penilaian terbaru:', e);
    } finally {
      setIsRefreshingLive(false);
    }
  };

  // Sync prop updates
  React.useEffect(() => {
    if (merdekaAssessments && merdekaAssessments.length > 0) {
      setLiveAssessments(merdekaAssessments);
    }
  }, [merdekaAssessments]);

  // Initial fetch on mount
  React.useEffect(() => {
    fetchLiveAssessments();
  }, []);

  // Smart initial semester & year
  const initialSemester = useMemo(() => {
    if (schoolIdentity?.activeSemester) return schoolIdentity.activeSemester;
    const autoSem = getSemesterFromDate();
    const source = liveAssessments.length > 0 ? liveAssessments : (merdekaAssessments || []);
    if (source.length > 0) {
      if (source.some(a => a.semester === autoSem)) return autoSem;
      const foundSem = source.find(a => a.semester)?.semester;
      if (foundSem) return foundSem;
    }
    return autoSem;
  }, [schoolIdentity?.activeSemester, liveAssessments, merdekaAssessments]);

  const initialAcademicYear = useMemo(() => {
    if (schoolIdentity?.activeAcademicYear) return schoolIdentity.activeAcademicYear;
    const source = liveAssessments.length > 0 ? liveAssessments : (merdekaAssessments || []);
    if (source.length > 0) {
      const foundYear = source.find(a => a.academicYear)?.academicYear;
      if (foundYear) return foundYear;
    }
    return '2026/2027';
  }, [schoolIdentity?.activeAcademicYear, liveAssessments, merdekaAssessments]);

  // Filter States
  const [selectedSemester, setSelectedSemester] = useState<string>(initialSemester);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(initialAcademicYear);

  React.useEffect(() => {
    if (schoolIdentity?.activeAcademicYear) {
      setSelectedAcademicYear(schoolIdentity.activeAcademicYear);
    }
  }, [schoolIdentity?.activeAcademicYear]);

  React.useEffect(() => {
    if (schoolIdentity?.activeSemester) {
      setSelectedSemester(schoolIdentity.activeSemester);
    }
  }, [schoolIdentity?.activeSemester]);

  // Auto-sync filter: jika data nilai tersedia dan filter saat ini menghasilkan 0 baris,
  // otomatis sesuaikan ke periode yang berisi data nilai agar langsung tampil di Waka Kurikulum
  React.useEffect(() => {
    if (liveAssessments.length > 0) {
      const matchCount = liveAssessments.filter(a => {
        const matchSem = selectedSemester === 'all' || !selectedSemester || a.semester === selectedSemester;
        const matchYear = selectedAcademicYear === 'all' || !selectedAcademicYear || a.academicYear === selectedAcademicYear;
        return matchSem && matchYear;
      }).length;

      if (matchCount === 0) {
        const itemWithData = liveAssessments.find(a => hasAssessmentData(a)) || liveAssessments[0];
        if (itemWithData) {
          if (itemWithData.semester && selectedSemester !== 'all') setSelectedSemester(itemWithData.semester);
          if (itemWithData.academicYear && selectedAcademicYear !== 'all') setSelectedAcademicYear(itemWithData.academicYear);
        }
      }
    }
  }, [liveAssessments]);

  const academicYearOptions = useMemo(() => {
    const list = [
      schoolIdentity?.activeAcademicYear,
      '2026/2027',
      '2025/2026',
      '2024/2025',
      '2023/2024',
      ...liveAssessments.map(a => a.academicYear).filter(Boolean)
    ].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [schoolIdentity?.activeAcademicYear, liveAssessments]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [homeroomFilterType, setHomeroomFilterType] = useState<'all' | 'binaan' | 'cross_class'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Import PTS/PAS States
  const [importText, setImportText] = useState<string>('');
  const [importParsedData, setImportParsedData] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState<boolean>(false);

  // Password States
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false);

  // Active students excluding mutasi/lulus
  const activeStudents = useMemo(() => {
    return students.filter(s => {
      const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
      const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
      return !isMut && !isLulus;
    });
  }, [students]);

  // Lookup map to get NIS instead of internal Student ID
  const studentNisMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => {
      const actualNis = (s.nis || '').trim();
      if (actualNis) {
        if (s.id) map.set(s.id, actualNis);
        map.set(actualNis, actualNis);
        if (s.name) map.set(s.name.toLowerCase().trim(), actualNis);
      }
    });
    return map;
  }, [students]);

  const getStudentNis = (studentId?: string, studentName?: string): string => {
    if (studentId && studentNisMap.has(studentId)) {
      return studentNisMap.get(studentId)!;
    }
    if (studentName && studentNisMap.has(studentName.toLowerCase().trim())) {
      return studentNisMap.get(studentName.toLowerCase().trim())!;
    }
    const matched = students.find(s => s.id === studentId || s.nis === studentId || (studentName && s.name.toLowerCase().trim() === studentName.toLowerCase().trim()));
    if (matched && matched.nis) return matched.nis;
    return studentId || '-';
  };

  // Available Classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach(s => {
      if (s.class) set.add(s.class.trim().toUpperCase());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [activeStudents]);

  // Rapor Tengah Semester States
  const [selectedRaporClass, setSelectedRaporClass] = useState<string>('');
  const [selectedRaporStudentId, setSelectedRaporStudentId] = useState<string>('');
  const [raporSearchQuery, setRaporSearchQuery] = useState<string>('');
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [raporNotes, setRaporNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('waka_rapor_pts_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Tanggal Rapor untuk Tanda Tangan
  const [raporDate, setRaporDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('waka_rapor_pts_date');
      if (saved) return saved;
    } catch {}
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const handleRaporDateChange = (val: string) => {
    setRaporDate(val);
    try {
      localStorage.setItem('waka_rapor_pts_date', val);
    } catch {}
  };

  const formatIndonesianDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${d} ${months[mIdx] || parts[1]} ${y}`;
    }
    return dateStr;
  };

  // Default class for rapor
  useEffect(() => {
    if (!selectedRaporClass && availableClasses.length > 0) {
      setSelectedRaporClass(availableClasses[0]);
    }
  }, [availableClasses, selectedRaporClass]);

  // Students for chosen Rapor class
  const raporStudents = useMemo(() => {
    if (!selectedRaporClass) return [];
    return activeStudents
      .filter(s => s.class && normClass(s.class) === normClass(selectedRaporClass))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStudents, selectedRaporClass]);

  // Sync selected student ID
  useEffect(() => {
    if (raporStudents.length > 0) {
      if (!selectedRaporStudentId || !raporStudents.some(s => s.id === selectedRaporStudentId)) {
        setSelectedRaporStudentId(raporStudents[0].id);
      }
    } else {
      setSelectedRaporStudentId('');
    }
  }, [raporStudents, selectedRaporStudentId]);

  const selectedRaporStudent = useMemo(() => {
    return raporStudents.find(s => s.id === selectedRaporStudentId) || (raporStudents.length > 0 ? raporStudents[0] : null);
  }, [raporStudents, selectedRaporStudentId]);

  const handleSaveStudentNote = (studentId: string, note: string) => {
    setRaporNotes(prev => {
      const next = { ...prev, [studentId]: note };
      try {
        localStorage.setItem('waka_rapor_pts_notes', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save rapor note to localStorage', e);
      }
      return next;
    });
  };

  // Rekap kehadiran otomatis dari data harian presensi wali kelas
  const getStudentAttendance = (student: Student | string) => {
    const targetId = typeof student === 'string' ? student : student.id;
    const targetNis = typeof student === 'string' ? '' : (student.nis || '');
    const targetName = typeof student === 'string' ? '' : (student.name || '').trim().toLowerCase();

    const att = { Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
    if (!attendanceLogs || attendanceLogs.length === 0) return att;

    attendanceLogs.forEach(l => {
      const match =
        (l.studentId && (l.studentId === targetId || (targetNis && l.studentId === targetNis))) ||
        (targetName && (l as any).studentName && (l as any).studentName.trim().toLowerCase() === targetName);

      if (match) {
        const d = l.date ? new Date(l.date) : null;
        let isCurrentSemester = true;
        if (selectedSemester && selectedSemester !== 'all' && d && !isNaN(d.getTime())) {
          const m = d.getMonth() + 1;
          const sem = (m >= 7 && m <= 12) ? 'Ganjil' : 'Genap';
          isCurrentSemester = (sem === selectedSemester);
        }

        if (isCurrentSemester) {
          const st = (l.status || '').trim();
          if (st === 'Sakit' || st === 'S') att.Sakit++;
          else if (st === 'Izin' || st === 'I') att.Izin++;
          else if (st === 'Alpa' || st === 'A' || st.toLowerCase() === 'tanpa keterangan') att.Alpa++;
          else if (st === 'Terlambat' || st === 'T') att.Terlambat++;
        }
      }
    });
    return att;
  };

  const getStudentAssessmentsForRapor = (st: Student) => {
    const matched = filteredAssessments.filter(a =>
      (a.studentId === st.id || a.studentId === st.nis || (a.studentName && a.studentName.trim().toLowerCase() === st.name.trim().toLowerCase())) &&
      (!selectedSemester || selectedSemester === 'all' || a.semester === selectedSemester) &&
      (!selectedAcademicYear || selectedAcademicYear === 'all' || a.academicYear === selectedAcademicYear)
    );

    // Source master subjects from curriculumSubjectsList, with fallback to DEFAULT_REPORT_SUBJECTS
    const baseSubjects = (curriculumSubjectsList && curriculumSubjectsList.length > 0)
      ? [...curriculumSubjectsList]
      : [...DEFAULT_REPORT_SUBJECTS];

    // Strictly sort subjects: Official 11 order first, then remaining master subjects by orderNum
    baseSubjects.sort((a, b) => {
      const idxA = OFFICIAL_REPORT_ORDER.findIndex(o => isSameSubject(o, a.name) || isSameSubject(o, a.code));
      const idxB = OFFICIAL_REPORT_ORDER.findIndex(o => isSameSubject(o, b.name) || isSameSubject(o, b.code));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (Number(a.orderNum) || 99) - (Number(b.orderNum) || 99);
    });

    // Map each master subject to the student's assessment
    const reportRows = baseSubjects.map(cs => {
      const a = matched.find(m => isSameSubject(m.subject, cs.name) || isSameSubject(m.subject, cs.code));
      const kktp = cs.kktp || (a ? (a as any).kktp : 75) || 75;
      const avgTp = a && a.nilaiRataTp !== undefined && a.nilaiRataTp !== null ? Number(a.nilaiRataTp) : 0;
      const koku = a && a.nilaiKokurikuler !== undefined && a.nilaiKokurikuler !== null ? Number(a.nilaiKokurikuler) : 0;
      const pts = a && a.nilaiPts !== undefined && a.nilaiPts !== null ? Number(a.nilaiPts) : 0;

      let naPts = 0;
      if (avgTp > 0 && pts > 0) {
        // Perhitungan NA khusus Rapor Tengah Semester: (Rata-rata TP x 80%) + (ASTS x 20%)
        naPts = Math.round((avgTp * 0.8) + (pts * 0.2));
      } else if (avgTp > 0 && pts === 0) {
        // Jika ASTS belum diisi, gunakan Rata-rata TP
        naPts = Math.round(avgTp);
      } else if (pts > 0 && avgTp === 0) {
        // Jika TP belum diisi, gunakan ASTS
        naPts = Math.round(pts);
      } else if (a && a.nilaiAkhirMapel && Number(a.nilaiAkhirMapel) > 0) {
        naPts = Number(a.nilaiAkhirMapel);
      }

      let desc = '';
      if (a && a.deskripsiCapaian && a.deskripsiCapaian.trim()) {
        desc = a.deskripsiCapaian.trim();
      } else if (naPts >= 85) {
        desc = `Menunjukkan pemahaman prima dalam seluruh materi dan tujuan pembelajaran tengah semester.`;
      } else if (naPts >= 75) {
        desc = `Menunjukkan capaian kompetensi yang tuntas dan pemahaman materi tengah semester yang baik.`;
      } else if (naPts > 0) {
        desc = `Perlu bimbingan dan pendampingan remedial pada capaian materi tengah semester.`;
      } else {
        desc = `-`;
      }

      return {
        id: a ? a.id : `subj-${cs.id || cs.code}-${st.id}`,
        subject: cs.name,
        code: cs.code,
        kktp,
        avgTp,
        koku,
        pts,
        naPts,
        desc,
        hasAssessment: !!a
      };
    });

    // Append any extra subjects that were assessed but not present in baseSubjects
    matched.forEach(a => {
      const exists = reportRows.some(r => isSameSubject(r.subject, a.subject) || isSameSubject(r.code, a.subject));
      if (!exists) {
        const avgTp = a.nilaiRataTp !== undefined && a.nilaiRataTp !== null ? Number(a.nilaiRataTp) : 0;
        const koku = a.nilaiKokurikuler !== undefined && a.nilaiKokurikuler !== null ? Number(a.nilaiKokurikuler) : 0;
        const pts = a.nilaiPts !== undefined && a.nilaiPts !== null ? Number(a.nilaiPts) : 0;

        let naPts = 0;
        if (avgTp > 0 && pts > 0) {
          // Perhitungan NA khusus Rapor Tengah Semester: (Rata-rata TP x 80%) + (ASTS x 20%)
          naPts = Math.round((avgTp * 0.8) + (pts * 0.2));
        } else if (avgTp > 0 && pts === 0) {
          naPts = Math.round(avgTp);
        } else if (pts > 0 && avgTp === 0) {
          naPts = Math.round(pts);
        } else if (a.nilaiAkhirMapel && Number(a.nilaiAkhirMapel) > 0) {
          naPts = Number(a.nilaiAkhirMapel);
        }

        let desc = a.deskripsiCapaian || (naPts >= 75 ? 'Menunjukkan capaian kompetensi yang tuntas.' : '-');
        reportRows.push({
          id: a.id,
          subject: a.subject,
          code: '',
          kktp: (a as any).kktp || 75,
          avgTp,
          koku,
          pts,
          naPts,
          desc,
          hasAssessment: true
        });
      }
    });

    return reportRows;
  };

  const printMidtermReport = (studentsToPrint: Student[]) => {
    if (studentsToPrint.length === 0) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const printDateStr = formatIndonesianDate(raporDate) || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const city = "Pandaan";
    const principalName = schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd";

    const officialKopHtml = schoolIdentity?.letterhead
      ? `<div style="width: 100%; margin: 0 0 8px 0; padding: 0;">
           <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block; border: none; margin: 0; padding: 0;" alt="KOP Resmi Sekolah" />
         </div>`
      : `<div style="width: 100%; text-align: center; margin-bottom: 8px;">
           <div style="font-size: 10pt; font-weight: 700; letter-spacing: 0.5px;">LEMBAGA PENDIDIKAN MA'ARIF NU</div>
           <div style="font-size: 13.5pt; font-weight: 800; text-transform: uppercase; margin: 1px 0;">${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</div>
           <div style="font-size: 8pt; color: #222;">NPSN: ${schoolIdentity?.npsn || '20519280'} &bull; Status Akreditasi: ${schoolIdentity?.accreditation || 'A (Unggul)'}</div>
           <div style="font-size: 8pt; color: #222;">${schoolIdentity?.address || "Jl. Dr. Sutomo No. 1 Pandaan, Pasuruan"} &bull; Telp: ${schoolIdentity?.phone || "0343-631234"}</div>
         </div>`;

    const pagesHtml = studentsToPrint.map((st) => {
      const att = getStudentAttendance(st);
      const studentScores = getStudentAssessmentsForRapor(st);
      const homeroomTeacher = homerooms.find(h => h.className && normClass(h.className) === normClass(st.class));
      const homeroomTeacherName = homeroomTeacher?.name || 'Wali Kelas';
      const defaultNote = "Ananda menunjukkan kesungguhan dan ketertiban yang sangat baik selama pembelajaran tengah semester. Pertahankan fokus belajar, kedisiplinan beribadah, dan tingkatkan pemahaman materi untuk persiapan akhir semester.";
      const noteText = raporNotes[st.id] || defaultNote;

      let totalScore = 0;
      let assessedCount = 0;
      studentScores.forEach(s => {
        if (s.naPts > 0) {
          totalScore += s.naPts;
          assessedCount++;
        }
      });
      const avgScore = assessedCount > 0 ? Math.round(totalScore / assessedCount) : 0;

      const subjectRowsHtml = studentScores.length === 0
        ? `<tr><td colspan="5" style="text-align: center; padding: 12px; border: 1px solid #000; font-style: italic; color: #555;">Belum ada data penilaian mata pelajaran untuk tengah semester ini.</td></tr>`
        : studentScores.map((s, idx) => `
            <tr>
              <td style="text-align: center; border: 1px solid #000; padding: 3.5px 3px; font-weight: 500;">${idx + 1}</td>
              <td style="border: 1px solid #000; padding: 3.5px 6px; font-weight: bold;">${s.subject}</td>
              <td style="text-align: center; border: 1px solid #000; padding: 3.5px 3px; font-weight: 600; color: #1e293b;">${s.avgTp > 0 ? s.avgTp : '-'}</td>
              <td style="text-align: center; border: 1px solid #000; padding: 3.5px 3px; font-weight: 600; color: #3730a3;">${s.pts > 0 ? s.pts : '-'}</td>
              <td style="text-align: center; border: 1px solid #000; padding: 3.5px 3px; font-weight: 800; background-color: #f8fafc;">${s.naPts > 0 ? s.naPts : '-'}</td>
            </tr>
          `).join('');

      const nameLen = (st.name || '').trim().length;
      let nameFontSize = '9pt';
      if (nameLen > 36) {
        nameFontSize = '7pt';
      } else if (nameLen > 28) {
        nameFontSize = '7.5pt';
      } else if (nameLen > 22) {
        nameFontSize = '8pt';
      }

      const principalSigHtml = schoolIdentity?.principalSignature
        ? `<img src="${schoolIdentity.principalSignature}" style="max-height: 40px; max-width: 115px; object-fit: contain; margin: 0 auto; display: block;" alt="TTD Kepala Sekolah" />`
        : `<div style="height: 40px;"></div>`;

      return `
        <div class="page-container">
          ${officialKopHtml}

          <div style="text-align: center; margin-bottom: 7px;">
            <div style="font-size: 11pt; font-weight: 800; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.5px;">LAPORAN PENILAIAN HASIL BELAJAR TENGAH SEMESTER</div>
            <div style="font-size: 8.5pt; font-weight: 700; text-transform: uppercase; margin-top: 1px;">(RAPOR TENGAH SEMESTER)</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 7px; font-size: 8.5pt; line-height: 1.35; width: 100%;">
            <table style="border-collapse: collapse; font-size: 8.5pt;">
              <tr>
                <td style="font-weight: 600; white-space: nowrap; padding-right: 8px;">Nama Murid</td>
                <td style="white-space: nowrap; line-height: 1.2;">: <span style="font-size: ${nameFontSize}; font-weight: 700; white-space: nowrap; display: inline-block; vertical-align: middle;">${st.name}</span></td>
              </tr>
              <tr>
                <td style="font-weight: 600; white-space: nowrap; padding-right: 8px;">NIS</td>
                <td style="white-space: nowrap;">: ${st.nis || "-"}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; white-space: nowrap; padding-right: 8px;">Nama Sekolah</td>
                <td style="white-space: nowrap;">: ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</td>
              </tr>
            </table>

            <table style="border-collapse: collapse; font-size: 8.5pt; margin-left: auto;">
              <tr>
                <td style="font-weight: 600; white-space: nowrap; padding-right: 8px;">Tahun Ajaran</td>
                <td style="white-space: nowrap; text-align: left;">: ${selectedAcademicYear}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; white-space: nowrap; padding-right: 8px;">Kelas / Fase</td>
                <td style="white-space: nowrap; text-align: left;">: ${st.class} / Fase D</td>
              </tr>
              <tr>
                <td style="font-weight: 600; white-space: nowrap; padding-right: 8px;">Semester</td>
                <td style="white-space: nowrap; text-align: left;">: ${selectedSemester}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 3px; font-weight: 700; font-size: 8.5pt; text-transform: uppercase;">A. CAPAIAN HASIL BELAJAR TENGAH SEMESTER</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 7px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
                <th style="border: 1px solid #000; padding: 4px 3px; width: 6%;">NO</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: left;">MATA PELAJARAN</th>
                <th style="border: 1px solid #000; padding: 4px 3px; width: 16%;">HARIAN</th>
                <th style="border: 1px solid #000; padding: 4px 3px; width: 16%;">ASTS</th>
                <th style="border: 1px solid #000; padding: 4px 3px; width: 18%;">NILAI AKHIR</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8fafc; font-weight: bold; text-align: center;">
                <td colspan="4" style="border: 1px solid #000; padding: 3.5px 6px; text-align: right;">JUMLAH NILAI</td>
                <td style="border: 1px solid #000; padding: 3.5px 3px; font-weight: bold;">${totalScore}</td>
              </tr>
              <tr style="background-color: #f8fafc; font-weight: bold; text-align: center;">
                <td colspan="4" style="border: 1px solid #000; padding: 3.5px 6px; text-align: right;">RATA-RATA NILAI</td>
                <td style="border: 1px solid #000; padding: 3.5px 3px; font-weight: bold;">${avgScore}</td>
              </tr>
            </tfoot>
          </table>

          <!-- ABSENSI SEBELUM CATATAN WALI KELAS -->
          <div style="display: grid; grid-template-columns: 220px 1fr; gap: 8px; margin-bottom: 7px; align-items: stretch;">
            <div>
              <div style="font-weight: 700; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 2px;">B. REKAPITULASI KEHADIRAN</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
                <tr>
                  <td style="border: 1px solid #000; padding: 2.5px 5px; width: 65%;">Sakit (S)</td>
                  <td style="border: 1px solid #000; padding: 2.5px 5px; text-align: center; font-weight: bold; width: 35%;">${att.Sakit} Hari</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 2.5px 5px;">Izin (I)</td>
                  <td style="border: 1px solid #000; padding: 2.5px 5px; text-align: center; font-weight: bold; width: 35%;">${att.Izin} Hari</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 2.5px 5px;">Tanpa Keterangan (A)</td>
                  <td style="border: 1px solid #000; padding: 2.5px 5px; text-align: center; font-weight: bold; width: 35%;">${att.Alpa} Hari</td>
                </tr>
                <tr style="background-color: #f8fafc; font-weight: bold;">
                  <td style="border: 1px solid #000; padding: 2.5px 5px;">Jumlah Tidak Hadir</td>
                  <td style="border: 1px solid #000; padding: 2.5px 5px; text-align: center;">${att.Sakit + att.Izin + att.Alpa} Hari</td>
                </tr>
              </table>
            </div>

            <div>
              <div style="font-weight: 700; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 2px;">C. CATATAN WALI KELAS</div>
              <div style="border: 1px solid #000; padding: 5px 8px; font-size: 7.8pt; line-height: 1.35; font-style: italic; min-height: 48px; box-sizing: border-box; background-color: #fff;">
                "${noteText}"
              </div>
            </div>
          </div>

          <!-- TANDA TANGAN (3 KOLOM) -->
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 4px; page-break-inside: avoid;">
            <tr>
              <td style="width: 33%; text-align: center; vertical-align: top;">
                Mengetahui,<br/>
                Orang Tua / Wali Murid
                <div style="height: 38px;"></div>
                ( .................................................. )
              </td>
              <td style="width: 34%; text-align: center; vertical-align: top;">
                ${city}, ${printDateStr}<br/>
                Wali Kelas ${st.class}
                <div style="height: 38px;"></div>
                <u><strong>${homeroomTeacherName}</strong></u>
              </td>
              <td style="width: 33%; text-align: center; vertical-align: top;">
                Mengetahui,<br/>
                Kepala Sekolah
                <div style="height: 38px; display: flex; align-items: center; justify-content: center; position: relative;">
                  ${principalSigHtml}
                </div>
                <u><strong>${principalName}</strong></u>
              </td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Rapor Tengah Semester - Kelas ${selectedRaporClass}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 6mm 4mm 6mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #000;
              margin: 0;
              padding: 0;
              background-color: #fff;
              font-size: 8.5pt;
              line-height: 1.3;
            }
            .page-container {
              box-sizing: border-box;
              padding: 0;
              margin: 0;
              width: 100%;
              max-height: 289mm;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .page-container:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            table {
              border-collapse: collapse;
            }
            @media print {
              html, body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .page-container {
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-after: always;
                break-after: page;
                max-height: 289mm;
                overflow: hidden;
              }
              .page-container:last-child {
                page-break-after: auto;
                break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 4000);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Distinct Canonical Subjects for filter dropdowns (normalized and sorted)
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    subjectTeachers.forEach(t => {
      if (t.subject) set.add(normalizeSubject(t.subject.trim()));
    });
    classSchedules.forEach(s => {
      if (s.subject) set.add(normalizeSubject(s.subject.trim()));
    });
    liveAssessments.forEach(a => {
      if (a.subject) set.add(normalizeSubject(a.subject.trim()));
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'id'));
  }, [subjectTeachers, classSchedules, liveAssessments]);

  // Assessment matching current sem & year (supports 'all' semester & year)
  const filteredAssessments = useMemo(() => {
    return liveAssessments.filter(a => {
      const matchSem = selectedSemester === 'all' || !selectedSemester || a.semester === selectedSemester;
      const matchYear = selectedAcademicYear === 'all' || !selectedAcademicYear || a.academicYear === selectedAcademicYear;
      return matchSem && matchYear;
    });
  }, [liveAssessments, selectedSemester, selectedAcademicYear]);

  // Distinct Teacher Options for filter dropdown (using username/ID as value, displaying teacher Name & username)
  const allTeacherOptions = useMemo(() => {
    interface TeacherOpt {
      id: string; // Canonical ID (e.g. 'st-1784121769274-0-scop', 'ht-4')
      name: string; // Display Name (e.g. 'Drs. Husnan')
      username: string; // Teacher username (e.g. 'novita', 'novitasari')
      usernames: string[]; // List of all usernames mapped to this teacher
      rawIds: string[]; // Linked IDs e.g. ['ht-4', 'st-sync-ht-4']
      role: 'subject_teacher' | 'homeroom' | 'both';
      subject?: string;
      className?: string;
    }

    const teacherMap = new Map<string, TeacherOpt>();

    // 1. Process subject teachers
    subjectTeachers.forEach(st => {
      if (!st.name || st.name.trim().toLowerCase() === 'guru mapel' || st.name.trim().toLowerCase() === 'guru') return;
      const canonicalId = getCanonicalTeacherId(st.id);
      const name = st.name.trim();
      const username = (st.username || '').trim().toLowerCase();

      // Look up existing teacher:
      // Primary match by username (if username exists)
      // Fallback match by canonical ID
      // Fallback match by exact clean name
      const existing = (username ? teacherMap.get(username) : null) ||
                       (canonicalId ? teacherMap.get(canonicalId) : null) ||
                       Array.from(teacherMap.values()).find(t => 
                         (username && t.usernames.includes(username)) ||
                         (canonicalId && t.rawIds.includes(canonicalId)) ||
                         (cleanTeacherName(t.name) === cleanTeacherName(name))
                       );

      if (existing) {
        if (st.id && !existing.rawIds.includes(st.id)) existing.rawIds.push(st.id);
        if (canonicalId && !existing.rawIds.includes(canonicalId)) existing.rawIds.push(canonicalId);
        if (username && !existing.usernames.includes(username)) existing.usernames.push(username);
        if (st.subject && !existing.subject) existing.subject = st.subject;
        if (existing.role === 'homeroom') existing.role = 'both';
      } else {
        const key = username || canonicalId;
        teacherMap.set(key, {
          id: canonicalId,
          name,
          username: username || canonicalId,
          usernames: username ? [username] : [],
          rawIds: [canonicalId, st.id].filter(Boolean),
          role: 'subject_teacher',
          subject: st.subject,
          className: st.className
        });
      }
    });

    // 2. Process homeroom teachers
    homerooms.forEach(hr => {
      if (!hr.name || hr.name.trim().toLowerCase() === 'wali kelas') return;
      const canonicalId = getCanonicalTeacherId(hr.id);
      const name = hr.name.trim();
      const username = (hr.username || '').trim().toLowerCase();

      const existing = (username ? teacherMap.get(username) : null) ||
                       (canonicalId ? teacherMap.get(canonicalId) : null) ||
                       Array.from(teacherMap.values()).find(t => 
                         (username && t.usernames.includes(username)) ||
                         (canonicalId && t.rawIds.includes(canonicalId)) ||
                         (cleanTeacherName(t.name) === cleanTeacherName(name))
                       );

      if (existing) {
        if (hr.id && !existing.rawIds.includes(hr.id)) existing.rawIds.push(hr.id);
        if (canonicalId && !existing.rawIds.includes(canonicalId)) existing.rawIds.push(canonicalId);
        if (username && !existing.usernames.includes(username)) existing.usernames.push(username);
        if (hr.className) existing.className = hr.className;
        existing.role = 'both';
      } else {
        const key = username || canonicalId;
        teacherMap.set(key, {
          id: canonicalId,
          name,
          username: username || canonicalId,
          usernames: username ? [username] : [],
          rawIds: [canonicalId, hr.id].filter(Boolean),
          role: 'homeroom',
          className: hr.className
        });
      }
    });

    // 3. Process schedules to ensure any scheduled teacher is mapped
    classSchedules.forEach(sch => {
      if (!sch.teacherName || sch.teacherName.trim().toLowerCase() === 'guru mapel') return;
      const schId = sch.teacherId ? getCanonicalTeacherId(sch.teacherId) : '';
      const name = sch.teacherName.trim();
      const schUsername = sch.teacherId && !sch.teacherId.startsWith('st-') && !sch.teacherId.startsWith('ht-') 
        ? sch.teacherId.trim().toLowerCase() 
        : '';

      const existing = (schUsername ? teacherMap.get(schUsername) : null) ||
                       (schId ? teacherMap.get(schId) : null) ||
                       Array.from(teacherMap.values()).find(t => 
                         (schUsername && t.usernames.includes(schUsername)) ||
                         (schId && (t.id === schId || t.rawIds.includes(schId))) ||
                         (cleanTeacherName(t.name) === cleanTeacherName(name))
                       );

      if (existing) {
        if (schId && !existing.rawIds.includes(schId)) existing.rawIds.push(schId);
        if (schUsername && !existing.usernames.includes(schUsername)) existing.usernames.push(schUsername);
        if (sch.subject && !existing.subject) existing.subject = sch.subject;
      } else if (schId || schUsername) {
        const key = schUsername || schId;
        teacherMap.set(key, {
          id: schId || schUsername,
          name,
          username: schUsername || schId,
          usernames: schUsername ? [schUsername] : [],
          rawIds: schId ? [schId] : [],
          role: 'subject_teacher',
          subject: sch.subject,
          className: sch.className
        });
      }
    });

    return Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [subjectTeachers, homerooms, classSchedules]);

  // Selected teacher entity from detailTeacherFilter (supports Username, ID, or fallback Name)
  const selectedTeacherObj = useMemo(() => {
    if (detailTeacherFilter === 'all') return null;
    const filterVal = detailTeacherFilter.trim().toLowerCase();
    const filterCanonical = getCanonicalTeacherId(detailTeacherFilter);

    // 1. By username match (primary)
    const byUsername = allTeacherOptions.find(t => 
      t.username.toLowerCase() === filterVal ||
      t.usernames.some(u => u.toLowerCase() === filterVal)
    );
    if (byUsername) return byUsername;

    // 2. By ID match
    const byId = allTeacherOptions.find(t => 
      t.id === filterCanonical || 
      t.rawIds.some(rid => getCanonicalTeacherId(rid) === filterCanonical)
    );
    if (byId) return byId;

    // 3. By exact clean name (STRICT EQUALITY ONLY, NEVER SUBSTRING)
    const cleanFilter = cleanTeacherName(detailTeacherFilter);
    return allTeacherOptions.find(t => 
      t.name.toLowerCase().trim() === filterVal ||
      (cleanTeacherName(t.name) === cleanFilter)
    ) || null;
  }, [detailTeacherFilter, allTeacherOptions]);

  // Helper to determine assigned teaching classes for a teacher based on schedule, assessments, and teacher record
  const getTeacherClasses = useCallback((teacherName: string, subject: string, explicitClass?: string) => {
    const cleanT = cleanTeacherName(teacherName);
    const classesSet = new Set<string>();

    // 1. From classSchedules matching teacher and subject (strict name matching)
    classSchedules.forEach(s => {
      if (isSameSubject(s.subject, subject)) {
        const cleanS = cleanTeacherName(s.teacherName);
        if (
          (s.teacherName && s.teacherName.toLowerCase().trim() === teacherName.toLowerCase().trim()) ||
          (cleanS && cleanT && cleanS === cleanT)
        ) {
          if (s.className) classesSet.add(s.className.trim().toUpperCase());
        }
      }
    });

    // 2. From assessments directly inputted by this teacher for this subject (strict name matching)
    filteredAssessments.forEach(a => {
      if (isSameSubject(a.subject, subject) && hasAssessmentData(a)) {
        const cleanA = cleanTeacherName(a.teacherName);
        if (
          (a.teacherName && a.teacherName.toLowerCase().trim() === teacherName.toLowerCase().trim()) ||
          (cleanA && cleanT && cleanA === cleanT)
        ) {
          if (a.className) classesSet.add(a.className.trim().toUpperCase());
        }
      }
    });

    // 3. From explicit class if assigned and not generic
    if (explicitClass && explicitClass !== 'SEMUA KELAS') {
      classesSet.add(explicitClass.trim().toUpperCase());
    }

    return Array.from(classesSet);
  }, [classSchedules, filteredAssessments]);

  // Detailed Filtered Assessments for Waka Kurikulum Inspection
  const detailedAssessmentsList = useMemo(() => {
    return filteredAssessments.filter(a => {
      // 1. Must have assessment data
      const hasTp = hasAssessmentData(a);
      if (!hasTp) return false;

      // 2. Class filter (using normalized class matcher)
      if (detailClassFilter !== 'all') {
        if (normClass(a.className) !== normClass(detailClassFilter)) return false;
      }

      // 3. Subject filter (using robust subject matcher)
      if (detailSubjectFilter !== 'all') {
        if (!isSameSubject(a.subject, detailSubjectFilter)) return false;
      }

      // Resolve authoritative scheduled teacher for this assessment's class and subject
      const sched = classSchedules.find(s => 
        normClass(s.className) === normClass(a.className) && 
        isSameSubject(s.subject, a.subject)
      );
      const scheduledTeacherName = sched?.teacherName?.trim();
      const scheduledTeacherId = sched?.teacherId ? getCanonicalTeacherId(sched.teacherId) : '';

      // Resolve homeroom teacher for this assessment's class
      const hrTeacher = homerooms.find(h => h.className && normClass(h.className) === normClass(a.className));
      const homeroomTeacherName = hrTeacher?.name?.trim();
      const homeroomTeacherId = hrTeacher?.id ? getCanonicalTeacherId(hrTeacher.id) : '';

      // Check score types
      const hasSubjectScores = (a.nilaiRataTp && Number(a.nilaiRataTp) > 0) ||
        Boolean(a.tp1Uh || a.tp1Tugas1 || a.tp1Tugas2 || a.tp2Uh || a.tp2Tugas1 || a.tp2Tugas2 || a.tp3Uh || a.tp3Tugas1 || a.tp4Uh || a.tp4Tugas1 || a.nilaiTp1 || a.nilaiTp2 || (a.nilaiAkhirMapel && Number(a.nilaiAkhirMapel) > 0));
      const hasKokuScore = Boolean(a.nilaiKokurikuler && Number(a.nilaiKokurikuler) > 0);

      // 4. Role filter
      if (detailRoleFilter === 'subject_teacher') {
        if (!hasSubjectScores) return false;
      } else if (detailRoleFilter === 'homeroom') {
        if (!hasKokuScore) return false;
      }

      // 5. Teacher filter (using Username and ID as primary anchors, strict exact Name matching fallback)
      if (detailTeacherFilter !== 'all') {
        const targetUsernames = selectedTeacherObj 
          ? [selectedTeacherObj.username.toLowerCase(), ...selectedTeacherObj.usernames.map(u => u.toLowerCase())]
          : [detailTeacherFilter.toLowerCase().trim()];

        const targetIds = selectedTeacherObj
          ? selectedTeacherObj.rawIds.map(getCanonicalTeacherId)
          : [getCanonicalTeacherId(detailTeacherFilter)];

        const targetCleanName = selectedTeacherObj 
          ? cleanTeacherName(selectedTeacherObj.name) 
          : cleanTeacherName(detailTeacherFilter);

        // a. Direct match with assessment recorded teacher
        const actualTeacherId = a.teacherId ? getCanonicalTeacherId(a.teacherId) : '';
        const cleanActual = cleanTeacherName(a.teacherName);
        const cleanSched = cleanTeacherName(scheduledTeacherName);
        const cleanHr = cleanTeacherName(homeroomTeacherName);
        const directTeacherEntity = allTeacherOptions.find(t => 
          (actualTeacherId && (t.id === actualTeacherId || t.rawIds.some(rid => getCanonicalTeacherId(rid) === actualTeacherId))) ||
          (cleanActual && cleanTeacherName(t.name) === cleanActual)
        );
        const directTeacherUsernames = directTeacherEntity 
          ? [directTeacherEntity.username.toLowerCase(), ...directTeacherEntity.usernames.map(u => u.toLowerCase())]
          : [];

        const isDirectTeacher = (
          (directTeacherUsernames.length > 0 && directTeacherUsernames.some(u => targetUsernames.includes(u))) ||
          (actualTeacherId && targetIds.includes(actualTeacherId)) ||
          (a.teacherName && selectedTeacherObj && a.teacherName.toLowerCase().trim() === selectedTeacherObj.name.toLowerCase().trim()) ||
          (cleanActual.length > 0 && targetCleanName.length > 0 && cleanActual === targetCleanName)
        );

        // b. Scheduled teacher match for this class and subject
        const scheduledTeacherEntity = allTeacherOptions.find(t => 
          (scheduledTeacherId && (t.id === scheduledTeacherId || t.rawIds.some(rid => getCanonicalTeacherId(rid) === scheduledTeacherId))) ||
          (cleanSched && cleanTeacherName(t.name) === cleanSched)
        );
        const schedTeacherUsernames = scheduledTeacherEntity 
          ? [scheduledTeacherEntity.username.toLowerCase(), ...scheduledTeacherEntity.usernames.map(u => u.toLowerCase())]
          : [];

        const isScheduled = (
          (schedTeacherUsernames.length > 0 && schedTeacherUsernames.some(u => targetUsernames.includes(u))) ||
          (scheduledTeacherId && targetIds.includes(scheduledTeacherId)) ||
          (scheduledTeacherName && selectedTeacherObj && scheduledTeacherName.toLowerCase().trim() === selectedTeacherObj.name.toLowerCase().trim()) ||
          (cleanSched.length > 0 && targetCleanName.length > 0 && cleanSched === targetCleanName)
        );

        // c. Homeroom match for this student's class
        const hrTeacherEntity = allTeacherOptions.find(t => 
          (homeroomTeacherId && (t.id === homeroomTeacherId || t.rawIds.some(rid => getCanonicalTeacherId(rid) === homeroomTeacherId))) ||
          (cleanHr && cleanTeacherName(t.name) === cleanHr)
        );
        const hrTeacherUsernames = hrTeacherEntity 
          ? [hrTeacherEntity.username.toLowerCase(), ...hrTeacherEntity.usernames.map(u => u.toLowerCase())]
          : [];

        const isHomeroomMatch = (
          (hrTeacherUsernames.length > 0 && hrTeacherUsernames.some(u => targetUsernames.includes(u))) ||
          (homeroomTeacherId && targetIds.includes(homeroomTeacherId)) ||
          (homeroomTeacherName && selectedTeacherObj && homeroomTeacherName.toLowerCase().trim() === selectedTeacherObj.name.toLowerCase().trim()) ||
          (cleanHr.length > 0 && targetCleanName.length > 0 && cleanHr === targetCleanName)
        );

        if (detailRoleFilter === 'homeroom') {
          // Explicitly inspecting Wali Kelas (Kokurikuler)
          if (!isHomeroomMatch) return false;
        } else if (detailRoleFilter === 'subject_teacher') {
          // Explicitly inspecting Guru Mapel:
          // Must be the direct teacher who inputted OR the scheduled teacher for this subject & class
          if (!isDirectTeacher && !isScheduled) return false;
        } else {
          // Role is 'all':
          const matchesAsSubject = isDirectTeacher || isScheduled;
          const matchesAsHomeroom = isHomeroomMatch && (
            hasKokuScore || detailSubjectFilter === 'all'
          );

          if (!matchesAsSubject && !matchesAsHomeroom) {
            return false;
          }
        }
      }

      // 6. Status filter
      const isComplete = hasSubjectScores && hasKokuScore;
      if (detailStatusFilter === 'complete' && !isComplete) return false;
      if (detailStatusFilter === 'incomplete' && isComplete) return false;
      if (detailStatusFilter === 'mapel_filled' && !hasSubjectScores) return false;
      if (detailStatusFilter === 'koku_filled' && !hasKokuScore) return false;

      // 7. Text Search Query
      if (detailSearchQuery.trim()) {
        const q = detailSearchQuery.toLowerCase().trim();
        const nameMatch = a.studentName?.toLowerCase().includes(q);
        const idMatch = a.studentId?.toLowerCase().includes(q);
        const subjMatch = a.subject?.toLowerCase().includes(q) || normalizeSubject(a.subject).toLowerCase().includes(q);
        const teacherMatch = a.teacherName?.toLowerCase().includes(q) || (scheduledTeacherName && scheduledTeacherName.toLowerCase().includes(q));
        const classMatch = a.className?.toLowerCase().includes(q) || normClass(a.className).includes(normClass(q));
        // Match teacher username
        const teacherUserMatch = allTeacherOptions.some(t => 
          (t.username.toLowerCase().includes(q) || t.usernames.some(u => u.toLowerCase().includes(q))) &&
          (cleanTeacherName(t.name) === cleanTeacherName(a.teacherName) || 
           (scheduledTeacherName && cleanTeacherName(t.name) === cleanTeacherName(scheduledTeacherName)) ||
           (homeroomTeacherName && cleanTeacherName(t.name) === cleanTeacherName(homeroomTeacherName)))
        );
        if (!nameMatch && !idMatch && !subjMatch && !teacherMatch && !classMatch && !teacherUserMatch) return false;
      }

      return true;
    });
  }, [filteredAssessments, detailRoleFilter, detailTeacherFilter, detailSubjectFilter, detailClassFilter, detailStatusFilter, detailSearchQuery, homerooms, classSchedules, selectedTeacherObj]);

  // Monitoring Stats for Subject Teachers
  const teacherProgressList = useMemo(() => {
    return subjectTeachers.map(teacher => {
      const assignedClasses = getTeacherClasses(teacher.name, teacher.subject, teacher.className);
      const cleanTarget = cleanTeacherName(teacher.name);

      let targetClassDisplay = 'SEMUA KELAS';
      if (assignedClasses.length > 0) {
        targetClassDisplay = assignedClasses.join(', ');
      } else if (teacher.className && teacher.className !== 'SEMUA KELAS') {
        targetClassDisplay = teacher.className;
      }

      let classStudentsList = activeStudents;
      if (selectedClassFilter !== 'all') {
        // If a specific class filter is selected in header
        classStudentsList = activeStudents.filter(s => s.class && normClass(s.class) === normClass(selectedClassFilter));
      } else if (assignedClasses.length > 0) {
        // Filter students belonging to this teacher's assigned classes
        classStudentsList = activeStudents.filter(s => s.class && assignedClasses.some(c => normClass(c) === normClass(s.class)));
      } else if (teacher.className && teacher.className !== 'SEMUA KELAS') {
        classStudentsList = activeStudents.filter(s => s.class && normClass(s.class) === normClass(teacher.className));
      }

      const totalStudentsInClass = classStudentsList.length;

      // Helper to test if an assessment belongs to this teacher
      const matchesThisTeacher = (a: MerdekaAssessment) => {
        if (!isSameSubject(a.subject, teacher.subject) || !hasAssessmentData(a)) {
          return false;
        }

        const cleanA = cleanTeacherName(a.teacherName);
        const isDirect = (a.teacherName && a.teacherName.toLowerCase().trim() === teacher.name.toLowerCase().trim()) ||
          (cleanA.length > 0 && cleanTarget.length > 0 && (cleanA === cleanTarget || cleanA.includes(cleanTarget) || cleanTarget.includes(cleanA)));

        const isSched = classSchedules.some(sch => 
          normClass(sch.className) === normClass(a.className) &&
          isSameSubject(sch.subject, a.subject) &&
          (
            sch.teacherName?.toLowerCase().trim() === teacher.name.toLowerCase().trim() ||
            cleanTeacherName(sch.teacherName) === cleanTarget
          )
        );

        const isGeneric = !a.teacherName || a.teacherName.toLowerCase().trim() === 'guru mapel' || a.teacherName.toLowerCase().trim() === 'guru';
        const isGenericMatch = isGeneric && (isSched || (assignedClasses.length > 0 ? assignedClasses.some(c => normClass(c) === normClass(a.className)) : true));

        return isDirect || isSched || isGenericMatch;
      };

      // Count students with assessment completed for this teacher's subject & class
      const assessedCount = classStudentsList.filter(s => {
        return filteredAssessments.some(a => a.studentId === s.id && matchesThisTeacher(a));
      }).length;

      // Detect per-class breakdown of filled assessments for this teacher's classes
      const assessedClassesBadges: Array<{ cls: string; count: number; total: number }> = [];
      const classesToEvaluate = assignedClasses.length > 0 ? assignedClasses : availableClasses;

      classesToEvaluate.forEach(cls => {
        const cStudents = activeStudents.filter(s => s.class && normClass(s.class) === normClass(cls));
        const cAssessed = cStudents.filter(s => {
          return filteredAssessments.some(a => a.studentId === s.id && matchesThisTeacher(a));
        }).length;

        if (cAssessed > 0) {
          assessedClassesBadges.push({ cls, count: cAssessed, total: cStudents.length });
        }
      });

      const percentage = totalStudentsInClass > 0 ? Math.round((assessedCount / totalStudentsInClass) * 100) : 0;

      let status: 'selesai' | 'sebagian' | 'belum' = 'belum';
      if (percentage === 100 && totalStudentsInClass > 0) status = 'selesai';
      else if (percentage > 0 || assessedCount > 0 || assessedClassesBadges.length > 0) status = 'sebagian';

      return {
        id: teacher.id,
        teacherName: teacher.name,
        subject: teacher.subject,
        className: targetClassDisplay,
        assignedClasses,
        totalStudents: totalStudentsInClass,
        assessedCount,
        assessedClassesBadges,
        assessedClassesCount: assessedClassesBadges.length,
        percentage,
        status
      };
    });
  }, [subjectTeachers, activeStudents, filteredAssessments, selectedClassFilter, availableClasses, getTeacherClasses, classSchedules]);

  // Monitoring Stats for Wali Kelas (Kokurikuler & Penilaian Rapor Merdeka Lintas Mapel)
  const homeroomProgressList = useMemo(() => {
    const allClassesSet = new Set<string>();
    homerooms.forEach(hr => {
      if (hr.className) allClassesSet.add(hr.className.trim().toUpperCase());
    });
    availableClasses.forEach(cls => {
      if (cls) allClassesSet.add(cls.trim().toUpperCase());
    });

    return Array.from(allClassesSet).sort().map(clsName => {
      const primaryHr = homerooms.find(hr => hr.className && normClass(hr.className) === normClass(clsName));
      const clsStudents = activeStudents.filter(s => s.class && normClass(s.class) === normClass(clsName));
      const totalStudents = clsStudents.length;

      // Count students with Kokurikuler score inputted (> 0)
      const kokuCount = clsStudents.filter(s => {
        return filteredAssessments.some(a => a.studentId === s.id && a.nilaiKokurikuler !== undefined && a.nilaiKokurikuler > 0);
      }).length;

      // Count distinct subjects evaluated for this class & breakdown badges
      const evaluatedSubjectsMap: Record<string, number> = {};
      const assessedStudentIds = new Set<string>();

      filteredAssessments.forEach(a => {
        if (clsStudents.some(s => s.id === a.studentId)) {
          if (hasAssessmentData(a)) {
            assessedStudentIds.add(a.studentId);
            const stdSubj = normalizeSubject(a.subject) || a.subject;
            evaluatedSubjectsMap[stdSubj] = (evaluatedSubjectsMap[stdSubj] || 0) + 1;
          }
        }
      });

      const evaluatedSubjectsBadges = Object.entries(evaluatedSubjectsMap).map(([name, count]) => ({
        name,
        count
      }));

      const kokuPercentage = totalStudents > 0 ? Math.round((kokuCount / totalStudents) * 100) : 0;
      const mapelAssessedPercentage = totalStudents > 0 ? Math.round((assessedStudentIds.size / totalStudents) * 100) : 0;
      const combinedPercentage = Math.max(kokuPercentage, mapelAssessedPercentage);

      return {
        id: primaryHr ? primaryHr.id : `cls-${clsName}`,
        teacherName: primaryHr ? primaryHr.name : 'Wali Kelas Lintas Kelas / Pengampu',
        className: clsName,
        totalStudents,
        kokuCount,
        kokuPercentage,
        mapelAssessedCount: assessedStudentIds.size,
        mapelAssessedPercentage,
        percentage: combinedPercentage,
        totalAssessedPercentage: mapelAssessedPercentage,
        evaluatedSubjectsCount: Object.keys(evaluatedSubjectsMap).length,
        evaluatedSubjectsBadges,
        hasPrimaryTeacher: !!primaryHr,
        isCrossClass: !primaryHr || (primaryHr && Object.keys(evaluatedSubjectsMap).length > 0)
      };
    });
  }, [homerooms, availableClasses, activeStudents, filteredAssessments]);

  // Handle Parse Excel/CSV Input
  const handleParseImport = () => {
    setImportError(null);
    setImportSuccessMsg(null);

    if (!importText.trim()) {
      setImportError('Harap tempel (paste) data dari Excel/CSV atau buat format data terlebih dahulu.');
      return;
    }

    try {
      const lines = importText.trim().split('\n');
      const parsedRows: any[] = [];

      lines.forEach((line, idx) => {
        const cols = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        if (cols.length < 3) return; // skip header or short lines

        const col0 = cols[0]?.trim();
        const col1 = cols[1]?.trim();
        const col2 = cols[2]?.trim();
        const col3 = cols[3]?.trim();
        const col4 = cols[4]?.trim();

        // Check if header line
        if (col0.toLowerCase().includes('nis') || col1.toLowerCase().includes('nama')) {
          return;
        }

        let nis = col0;
        let studentName = col1;
        let subject = col2;
        let pts = col3;
        let pas = col4;

        // Try matching student
        let matchedStudent = students.find(s => s.nis.trim() === nis);
        if (!matchedStudent && studentName) {
          matchedStudent = students.find(s => s.name.toLowerCase().trim() === studentName.toLowerCase().trim());
        }

        if (matchedStudent) {
          parsedRows.push({
            studentId: matchedStudent.id,
            nis: matchedStudent.nis,
            studentName: matchedStudent.name,
            className: matchedStudent.class,
            subject: subject || 'Semua Mapel',
            pts: pts && !isNaN(Number(pts)) ? Number(pts) : 0,
            pas: pas && !isNaN(Number(pas)) ? Number(pas) : 0
          });
        }
      });

      if (parsedRows.length === 0) {
        setImportError('Tidak ada data siswa yang cocok dengan nomor NIS / Nama di database. Mohon periksa format input.');
      } else {
        setImportParsedData(parsedRows);
      }
    } catch (err) {
      setImportError('Gagal memproses teks/data Excel. Pastikan format kolom sesuai.');
    }
  };

  // Submit Import PTS/PAS
  const handleSubmitImport = async () => {
    if (importParsedData.length === 0) return;
    setIsSubmittingImport(true);
    setImportError(null);

    try {
      const res = await fetch('/api/curriculum/import-pts-pas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: importParsedData,
          semester: selectedSemester,
          academicYear: selectedAcademicYear
        })
      });

      if (res.ok) {
        setImportSuccessMsg(`Berhasil mengimpor & menghubungkan nilai PTS & PAS untuk ${importParsedData.length} data siswa!`);
        setImportParsedData([]);
        setImportText('');
        if (onRefreshData) onRefreshData();
      } else {
        const errData = await res.json();
        setImportError(errData.error || 'Gagal menyimpan nilai PTS/PAS.');
      }
    } catch (err) {
      setImportError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Download Excel Template for PTS/PAS
  const handleDownloadTemplate = () => {
    const templateData: any[] = [];
    activeStudents.forEach(s => {
      availableSubjects.forEach(subj => {
        templateData.push({
          'NIS': s.nis,
          'Nama Siswa': s.name,
          'Kelas': s.class,
          'Mata Pelajaran': subj,
          'Nilai PTS': 80,
          'Nilai PAS': 85
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_PTS_PAS');
    XLSX.writeFile(workbook, `Template_Nilai_PTS_PAS_${selectedSemester}_${selectedAcademicYear.replace('/', '-')}.xlsx`);
  };

  // Export Clean Final Grades Excel Report
  const handleExportFinalGradesExcel = () => {
    const rows: any[] = [];

    // Filter students by selected class
    let listStudents = activeStudents;
    if (selectedClassFilter !== 'all') {
      listStudents = activeStudents.filter(s => s.class && s.class.trim().toUpperCase() === selectedClassFilter);
    }

    listStudents.forEach((student, idx) => {
      const studentAsses = filteredAssessments.filter(a => a.studentId === student.id);
      
      if (studentAsses.length === 0) {
        rows.push({
          'No': idx + 1,
          'NIS': student.nis,
          'Nama Siswa': student.name,
          'Kelas': student.class,
          'Mata Pelajaran': '-',
          'Rata-rata TP': 0,
          'Nilai Kokurikuler': 0,
          'Nilai PTS': 0,
          'Nilai PAS': 0,
          'Nilai Akhir Mapel': 0,
          'Predikat': 'Belum Dinilai'
        });
      } else {
        studentAsses.forEach(a => {
          const finalScore = a.nilaiAkhirMapel ?? a.nilaiRapor ?? 0;
          let predikat = 'D';
          if (finalScore >= 90) predikat = 'A (Sangat Baik)';
          else if (finalScore >= 80) predikat = 'B (Baik)';
          else if (finalScore >= 70) predikat = 'C (Cukup)';

          rows.push({
            'No': idx + 1,
            'NIS': student.nis,
            'Nama Siswa': student.name,
            'Kelas': student.class,
            'Mata Pelajaran': a.subject,
            'Rata-rata TP': a.nilaiRataTp ?? 0,
            'Nilai Kokurikuler': a.nilaiKokurikuler ?? 0,
            'Nilai PTS': a.nilaiPts ?? 0,
            'Nilai PAS': a.nilaiPas ?? 0,
            'Nilai Akhir Mapel': finalScore,
            'Predikat': predikat
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Nilai_Akhir');
    
    const fileName = `Rekap_Nilai_Akhir_Kurikulum_${selectedClassFilter}_${selectedSemester}_${selectedAcademicYear.replace('/', '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export Monitoring Jam Mengajar Guru to Excel
  const handleExportTeacherWorkloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const summaryMap: Record<string, {
      teacherId: string;
      teacherName: string;
      roleStr: string;
      subjects: Set<string>;
      classes: Set<string>;
      totalJp: number;
      schedulesCount: number;
    }> = {};

    subjectTeachers.forEach(st => {
      summaryMap[st.name.trim().toLowerCase()] = {
        teacherId: st.id || st.username || '',
        teacherName: st.name,
        roleStr: 'Guru Mata Pelajaran',
        subjects: new Set(st.subject ? [st.subject] : []),
        classes: new Set(st.className ? [st.className] : []),
        totalJp: 0,
        schedulesCount: 0
      };
    });

    homerooms.forEach(hr => {
      const key = hr.name.trim().toLowerCase();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          teacherId: hr.id || hr.username || '',
          teacherName: hr.name,
          roleStr: `Wali Kelas ${hr.className || ''}`,
          subjects: new Set(),
          classes: new Set(hr.className ? [hr.className] : []),
          totalJp: 0,
          schedulesCount: 0
        };
      } else {
        summaryMap[key].roleStr += ` & Wali Kelas ${hr.className || ''}`;
        if (hr.className) summaryMap[key].classes.add(hr.className);
      }
    });

    classSchedules.forEach(sch => {
      const key = (sch.teacherName || '').trim().toLowerCase();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          teacherId: sch.teacherId || '',
          teacherName: sch.teacherName,
          roleStr: 'Guru Pengampu',
          subjects: new Set(),
          classes: new Set(),
          totalJp: 0,
          schedulesCount: 0
        };
      }

      if (sch.subject) summaryMap[key].subjects.add(sch.subject);
      if (sch.className) summaryMap[key].classes.add(sch.className);

      let jpVal = 2;
      if (sch.alokasiWaktu) {
        const num = parseInt(sch.alokasiWaktu);
        if (!isNaN(num)) jpVal = num;
      } else if (sch.jamKe && sch.jamKe.includes('-')) {
        const parts = sch.jamKe.split('-');
        jpVal = Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
      }

      summaryMap[key].totalJp += jpVal;
      summaryMap[key].schedulesCount += 1;
    });

    const workloadList = Object.values(summaryMap).sort((a, b) => b.totalJp - a.totalJp);

    const summaryRows: any[][] = [
      ["LAPORAN MONITORING JUMLAH JAM MENGAJAR GURU (TOTAL JP/MINGGU)"],
      ["SEKOLAH: SMP MA'ARIF NU PANDAAN"],
      [`PERIODE: TAHUN AJARAN ${selectedAcademicYear} - SEMESTER ${selectedSemester}`],
      [`TANGGAL CETAK / EXPORT: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`],
      [],
      [
        'No',
        'Nama Guru / Wali Kelas',
        'ID / Username Guru',
        'Status Guru',
        'Mata Pelajaran yang Diampu',
        'Kelas / Rombel yang Diajar',
        'Jumlah Sesi Pertemuan',
        'Senin (JP)',
        'Selasa (JP)',
        'Rabu (JP)',
        'Kamis (JP)',
        'Jumat (JP)',
        'Sabtu (JP)',
        'Total Jam Mengajar (JP/Minggu)',
        'Status Beban Mengajar (Standar 24 JP)'
      ]
    ];

    workloadList.forEach((item, idx) => {
      const dayJp: Record<string, number> = {
        'Senin': 0,
        'Selasa': 0,
        'Rabu': 0,
        'Kamis': 0,
        'Jumat': 0,
        'Sabtu': 0
      };

      classSchedules.forEach(sch => {
        const isMatchTeacher = (sch.teacherName && sch.teacherName.trim().toLowerCase() === item.teacherName.trim().toLowerCase()) ||
          (sch.teacherId && item.teacherId && sch.teacherId.toLowerCase() === item.teacherId.toLowerCase());
        if (isMatchTeacher && sch.day) {
          const d = sch.day.trim();
          let jp = 2;
          if (sch.alokasiWaktu) {
            const num = parseInt(sch.alokasiWaktu);
            if (!isNaN(num)) jp = num;
          } else if (sch.jamKe && sch.jamKe.includes('-')) {
            const parts = sch.jamKe.split('-');
            jp = Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
          }
          if (dayJp[d] !== undefined) {
            dayJp[d] += jp;
          }
        }
      });

      let statusBeban = 'Belum Ada Jadwal';
      if (item.totalJp >= 24) {
        statusBeban = 'Memenuhi Beban Standar (>= 24 JP)';
      } else if (item.totalJp > 0) {
        statusBeban = `Kurang dari 24 JP (${24 - item.totalJp} JP lagi)`;
      }

      summaryRows.push([
        idx + 1,
        item.teacherName,
        item.teacherId || '-',
        item.roleStr,
        Array.from(item.subjects).join(', ') || '-',
        Array.from(item.classes).join(', ') || '-',
        item.schedulesCount,
        dayJp['Senin'],
        dayJp['Selasa'],
        dayJp['Rabu'],
        dayJp['Kamis'],
        dayJp['Jumat'],
        dayJp['Sabtu'],
        item.totalJp,
        statusBeban
      ]);
    });

    const totalJpAll = workloadList.reduce((acc, t) => acc + t.totalJp, 0);
    const totalSesiAll = workloadList.reduce((acc, t) => acc + t.schedulesCount, 0);
    summaryRows.push([]);
    summaryRows.push([
      'TOTAL KESELURUHAN',
      '',
      '',
      '',
      '',
      '',
      totalSesiAll,
      '',
      '',
      '',
      '',
      '',
      '',
      totalJpAll,
      ''
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 18 },
      { wch: 24 },
      { wch: 32 },
      { wch: 22 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
      { wch: 34 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Rekap Jam Mengajar Guru");

    const detailRows: any[][] = [
      ['No', 'Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Nama Guru Pengampu', 'ID / Username Guru', 'Alokasi JP'],
      ...classSchedules
        .slice()
        .sort((a, b) => {
          const dayA = daysOrder.indexOf(a.day) >= 0 ? daysOrder.indexOf(a.day) : 99;
          const dayB = daysOrder.indexOf(b.day) >= 0 ? daysOrder.indexOf(b.day) : 99;
          if (dayA !== dayB) return dayA - dayB;
          return a.className.localeCompare(b.className);
        })
        .map((sch, idx) => {
          return [
            idx + 1,
            sch.day,
            sch.jamKe,
            `${sch.startTime || '07:00'} - ${sch.endTime || '08:20'}`,
            sch.className,
            sch.subject,
            sch.teacherName,
            sch.teacherId || '-',
            sch.alokasiWaktu || '2 JP'
          ];
        })
    ];

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 25 },
      { wch: 28 },
      { wch: 18 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Rincian Jadwal Pelajaran");

    XLSX.writeFile(wb, `Monitoring_Jumlah_Jam_Mengajar_Guru_${selectedSemester}_${selectedAcademicYear.replace('/', '-')}.xlsx`);
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak sesuai.' });
      return;
    }

    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'Kata sandi minimal 4 karakter.' });
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch('/api/curriculum/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: data.message || 'Kata sandi Waka Kurikulum berhasil diperbarui.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Gagal mengubah kata sandi.' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Terjadi gangguan jaringan.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-24 md:pb-8 space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider">
              <Sparkles size={12} className="text-indigo-400 animate-pulse" />
              WAKIL KEPALA SEKOLAH BIDANG KURIKULUM
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Portal Monitoring & Penilaian Akademik
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Pantau progres input nilai Guru Mapel & Wali Kelas, kelola impor nilai PTS/PAS secara terpusat, dan ekspor rekapitulasi Nilai Akhir Mapel Kurikulum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportTeacherWorkloadExcel}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
              title="Export Laporan Monitoring Jumlah Jam Mengajar Guru ke Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              <span>Export Jam Mengajar Guru (.xlsx)</span>
            </button>

            <button
              onClick={() => {
                fetchLiveAssessments();
                if (onRefreshData) onRefreshData();
              }}
              disabled={isRefreshingLive}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshingLive ? 'animate-spin' : ''} />
              <span>{isRefreshingLive ? 'Memuat Data...' : 'Muat Ulang Data'}</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
              <option value="all">Semua Semester (Gabungan)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tahun Ajaran</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Tahun Ajaran</option>
              {academicYearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Filter Kelas</label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Kelas ({activeStudents.length} Siswa)</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'monitoring'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 size={15} />
          <span>Monitoring Progress Input</span>
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'schedules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={15} />
          <span>Atur Jadwal Mengajar</span>
        </button>

        <button
          onClick={() => setActiveTab('master_mapel')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'master_mapel'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={15} />
          <span>Master Data Mata Pelajaran</span>
          {curriculumSubjectsList.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'master_mapel' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {curriculumSubjectsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('import_pts_pas')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'import_pts_pas'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Import Excel PTS & PAS</span>
        </button>

        <button
          onClick={() => setActiveTab('rekap_nilai')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rekap_nilai'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen size={15} />
          <span>Rekap & Export Nilai Akhir</span>
        </button>

        <button
          onClick={() => setActiveTab('detail_nilai')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'detail_nilai'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck size={15} />
          <span>Detail Nilai Guru & Wali</span>
        </button>

        <button
          onClick={() => setActiveTab('rapor_tengah_semester')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rapor_tengah_semester'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap size={15} />
          <span>Rapor Tengah Semester</span>
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'password'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key size={15} />
          <span>Keamanan Sandi</span>
        </button>
      </div>

      {/* TAB: JADWAL PELAJARAN */}
      {activeTab === 'schedules' && (
        <ScheduleView
          role="waka_kurikulum"
          schedules={classSchedules}
          onRefreshSchedule={() => onRefreshData && onRefreshData()}
          availableClasses={availableClasses}
          subjectTeachers={subjectTeachers}
          homerooms={homerooms}
        />
      )}

      {/* TAB: MASTER DATA MATA PELAJARAN (KURIKULUM MERDEKA) */}
      {activeTab === 'master_mapel' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Sub Navigation Bar: Master Mapel & Bank TP Bersama */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setMasterMapelSubTab('mapel_list')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                masterMapelSubTab === 'mapel_list'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Layers size={15} />
              <span>Daftar Mata Pelajaran</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                masterMapelSubTab === 'mapel_list' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {curriculumSubjectsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMasterMapelSubTab('bank_tp')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                masterMapelSubTab === 'bank_tp'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <BookOpen size={15} />
              <span>Bank TP Bersama (Kurikulum Merdeka)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                masterMapelSubTab === 'bank_tp' ? 'bg-indigo-700 text-indigo-100' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                Tersinkronisasi Otomatis
              </span>
            </button>
          </div>

          {/* VIEW 1: BANK TP BERSAMA */}
          {masterMapelSubTab === 'bank_tp' && (
            <SharedTpBankView
              isWaka={true}
              currentUser={{ name: 'Waka Kurikulum', role: 'waka_kurikulum' }}
              subjectsList={curriculumSubjectsList}
              embedded={true}
            />
          )}

          {/* VIEW 2: DAFTAR MATA PELAJARAN */}
          {masterMapelSubTab === 'mapel_list' && (
            <div className="space-y-6">
              {/* Header Action Banner */}
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 rounded-3xl p-6 text-white border border-indigo-700/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                      <Layers size={18} />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">Kurikulum Merdeka</span>
                  </div>
              <h2 className="text-xl font-black text-white">Master Data Mata Pelajaran (Mapel)</h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Tiap mata pelajaran memiliki <strong>ID & Kode Unik</strong> yang terhubung langsung ke penentuan mata pelajaran guru pada tab <em>Guru Mapel</em>, menu <em>Atur Jadwal Mengajar</em>, dan penguncian <em>Tujuan Pembelajaran (TP)</em> pada penilaian guru &amp; wali kelas.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetDefaultSubjects}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Reset kembali ke standar 13 mapel Kurikulum Merdeka"
              >
                <RefreshCw size={13} />
                <span>Reset Standar Kurikulum</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddSubject}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
              >
                <Plus size={15} />
                <span>Tambah Mata Pelajaran</span>
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {subjectFeedback && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-fade-in ${
              subjectFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2">
                {subjectFeedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-rose-600 shrink-0" />}
                <span>{subjectFeedback.text}</span>
              </div>
              <button onClick={() => setSubjectFeedback(null)} className="p-1 hover:opacity-70 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Subjects Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Daftar Mata Pelajaran Terdaftar</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black">
                    {curriculumSubjectsList.length} Mapel
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ID Mapel otomatis digunakan untuk sinkronisasi nilai rapor, jadwal KBM, dan pengisian TP serumpun.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchCurriculumSubjects}
                disabled={isLoadingSubjects}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={13} className={isLoadingSubjects ? 'animate-spin' : ''} />
                <span>Segarkan Data</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">ID Mapel (Sistem)</th>
                    <th className="py-3 px-3">Kode</th>
                    <th className="py-3 px-3">Nama Mata Pelajaran</th>
                    <th className="py-3 px-3">Kategori Muatan</th>
                    <th className="py-3 px-3 text-center">KKTP / KKM</th>
                    <th className="py-3 px-3">Tingkat Kelas</th>
                    <th className="py-3 px-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {isLoadingSubjects && curriculumSubjectsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Memuat data mata pelajaran...</span>
                      </td>
                    </tr>
                  ) : curriculumSubjectsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                        Belum ada data mata pelajaran. Klik tombol "Reset Standar Kurikulum" di atas untuk memuat 13 mapel resmi.
                      </td>
                    </tr>
                  ) : (
                    curriculumSubjectsList.map((subj, idx) => (
                      <tr key={subj.id || idx} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{subj.orderNum ?? (idx + 1)}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                            {subj.id}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900">
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">
                            {subj.code}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 text-xs">{subj.name}</span>
                            {subj.description && (
                              <span className="text-[10px] text-slate-400 line-clamp-1">{subj.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            subj.category === 'Muatan Lokal'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : subj.category === 'Peminatan'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {subj.category || 'Muatan Nasional'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-black text-slate-900 text-xs">{subj.kktp ?? 75}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-600 text-xs font-semibold">{subj.tingkat || 'Semua Tingkat'}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubject(subj)}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200"
                              title="Edit Mapel"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(subj)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer border border-rose-200"
                              title="Hapus Mapel"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Form Tambah/Ubah Mata Pelajaran */}
          {showSubjectModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left animate-scale-in space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Layers size={18} />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {editingSubject ? 'Ubah Data Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                      </h4>
                      <p className="text-[10px] text-slate-400">Master Data Kurikulum Merdeka SMP Ma'arif NU Pandaan</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSubjectModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveSubject} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Kode Mapel *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: MAT, IPA, PAI"
                        value={subjectForm.code}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-800 uppercase focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Nomor Urut Rapor
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={subjectForm.orderNum}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, orderNum: Number(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Nama Lengkap Mata Pelajaran *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Matematika, Bahasa Indonesia"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Kategori Muatan
                      </label>
                      <select
                        value={subjectForm.category}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value="Muatan Nasional">Muatan Nasional</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                        <option value="Peminatan">Peminatan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        KKTP Standar
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={subjectForm.kktp}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, kktp: Number(e.target.value) || 75 }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Tingkat
                      </label>
                      <select
                        value={subjectForm.tingkat}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, tingkat: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value="Semua Tingkat">Semua Tingkat (7, 8, 9)</option>
                        <option value="7">Tingkat 7</option>
                        <option value="8">Tingkat 8</option>
                        <option value="9">Tingkat 9</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Deskripsi / Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Catatan ruang lingkup materi, referensi buku ajar, dll."
                      value={subjectForm.description}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSubjectModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingSubject}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/30"
                    >
                      {isSavingSubject ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>{editingSubject ? 'Simpan Perubahan' : 'Tambahkan Mapel'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: MONITORING PROGRESS */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Quick Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Guru Mapel</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{subjectTeachers.length}</h3>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Pengampu Mata Pelajaran</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Wali Kelas</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{homerooms.length}</h3>
                <p className="text-[10px] font-bold text-violet-600 mt-0.5">Penginput Nilai Kokurikuler</p>
              </div>
              <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                <GraduationCap size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Data Nilai</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{filteredAssessments.length}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {selectedSemester === 'all' ? 'Semua Semester' : `Semester ${selectedSemester}`} ({liveAssessments.length} Total Basis Data)
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Siswa Aktif</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{activeStudents.length}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{availableClasses.length} Rombel Kelas</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <BookOpen size={22} />
              </div>
            </div>
          </div>

          {/* Alert Banner when Current Filter has 0 records but other records exist */}
          {filteredAssessments.length === 0 && liveAssessments.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 text-xs shadow-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-xs text-amber-950">Informasi: Filter Periode Saat Ini Tidak Menemukan Nilai</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Filter aktif: <strong>Semester {selectedSemester} - Tahun {selectedAcademicYear}</strong>. Namun terdeteksi <strong>{liveAssessments.length}</strong> data nilai tersimpan di sistem pada periode lain.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const autoSem = getSemesterFromDate();
                    setSelectedSemester(autoSem);
                    setSelectedAcademicYear('2026/2027');
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Beralih ke Semester Ganjil 2026/2027
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemester('all');
                    setSelectedAcademicYear('all');
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tampilkan Semua Semester
                </button>
              </div>
            </div>
          )}

          {/* Table 1: Progress Guru Mapel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  <span>Progres Penilaian Guru Mata Pelajaran</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoring keterisian Tugas (1-2), Ulangan Harian (UH), dan TP (1-4) per Guru Mapel
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari guru atau mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 w-full sm:w-56"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Nama Guru</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Kelas Pengampu</th>
                    <th className="py-3 px-4 text-center">Siswa Terdokumentasi</th>
                    <th className="py-3 px-4">Progres Keterisian</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {teacherProgressList
                    .filter(t => 
                      t.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{t.teacherName}</div>
                          {t.assessedClassesBadges && t.assessedClassesBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {t.assessedClassesBadges.map((badge: any) => (
                                <button
                                  key={badge.cls}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailTeacherFilter(getCanonicalTeacherId(t.id));
                                    setDetailSubjectFilter(normalizeSubject(t.subject));
                                    setDetailClassFilter(badge.cls);
                                    setDetailRoleFilter('subject_teacher');
                                    setActiveTab('detail_nilai');
                                  }}
                                  className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9.5px] font-extrabold rounded-md cursor-pointer transition-colors"
                                  title={`Lihat detail nilai Kelas ${badge.cls}`}
                                >
                                  Kelas {badge.cls}: {badge.count}/{badge.total} siswa
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-bold text-slate-800 text-[11px]">
                            {t.subject}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">
                          {selectedClassFilter !== 'all' ? (
                            `Kelas ${selectedClassFilter}`
                          ) : t.assignedClasses && t.assignedClasses.length > 4 ? (
                            <span title={t.className}>
                              {t.assignedClasses.slice(0, 3).join(', ')}{' '}
                              <span className="text-[10px] text-slate-400 font-semibold">(+{t.assignedClasses.length - 3} kelas)</span>
                            </span>
                          ) : (
                            t.className
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span>
                            {t.assessedCount} / {t.totalStudents} Siswa
                            {t.assessedClassesCount > 0 && selectedClassFilter === 'all' ? ` (${t.assessedClassesCount} Rombel)` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  t.percentage === 100 ? 'bg-emerald-500' : t.percentage > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${t.percentage}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 w-10 text-right">{t.percentage}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.status === 'selesai' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                              <CheckCircle2 size={11} /> Selesai
                            </span>
                          ) : t.status === 'sebagian' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
                              <Clock size={11} /> Sebagian
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                              <AlertCircle size={11} /> Belum Input
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailTeacherFilter(getCanonicalTeacherId(t.id));
                              setDetailSubjectFilter(normalizeSubject(t.subject));
                              if (selectedClassFilter !== 'all') {
                                setDetailClassFilter(selectedClassFilter);
                              } else {
                                setDetailClassFilter('all');
                              }
                              setDetailRoleFilter('subject_teacher');
                              setActiveTab('detail_nilai');
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 mx-auto cursor-pointer shadow-3xs"
                            title={`Buka rincian nilai ${t.subject} - ${t.teacherName}`}
                          >
                            <Eye size={12} />
                            <span>Detail Nilai</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Progress Wali Kelas (Kokurikuler & Penilaian Rapor) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <GraduationCap size={18} className="text-violet-600" />
                  <span>Progres Input Nilai Kokurikuler & Rapor oleh Wali Kelas</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoring keterisian nilai Kokurikuler dan nilai Rapor Merdeka yang diinput Wali Kelas (Termasuk input di kelas selain kelas binaan / Lintas Kelas)
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHomeroomFilterType('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    homeroomFilterType === 'all'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setHomeroomFilterType('binaan')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    homeroomFilterType === 'binaan'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kelas Binaan
                </button>
                <button
                  type="button"
                  onClick={() => setHomeroomFilterType('cross_class')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    homeroomFilterType === 'cross_class'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Input Lintas Kelas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {homeroomProgressList
                .filter(hr => {
                  if (homeroomFilterType === 'binaan') return hr.hasPrimaryTeacher;
                  if (homeroomFilterType === 'cross_class') return hr.evaluatedSubjectsCount > 0 || !hr.hasPrimaryTeacher;
                  return true;
                })
                .map(hr => (
                  <div key={hr.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-md font-black text-[10px] uppercase">
                            Kelas {hr.className}
                          </span>
                          {!hr.hasPrimaryTeacher && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-black text-[9px] uppercase">
                              🌐 Lintas Kelas
                            </span>
                          )}
                          {hr.evaluatedSubjectsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[9px]">
                              {hr.evaluatedSubjectsCount} Mapel Terisi
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5">{hr.teacherName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-700 block">{hr.percentage}%</span>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                          hr.percentage === 100 ? 'bg-emerald-100 text-emerald-700' :
                          hr.percentage > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {hr.percentage === 100 ? 'Selesai' : hr.percentage > 0 ? 'Sebagian' : 'Belum'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Mapel & Kokurikuler */}
                    <div className="space-y-2 text-[10.5px]">
                      <div>
                        <div className="flex justify-between font-bold text-slate-600 mb-0.5">
                          <span>Progres Input Mapel:</span>
                          <span className="text-indigo-700 font-extrabold">{hr.mapelAssessedCount}/{hr.totalStudents} Siswa ({hr.mapelAssessedPercentage}%)</span>
                        </div>
                        <div className="bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              hr.mapelAssessedPercentage === 100 ? 'bg-emerald-500' : hr.mapelAssessedPercentage > 0 ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            style={{ width: `${hr.mapelAssessedPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-slate-600 mb-0.5">
                          <span>Progres Kokurikuler P5:</span>
                          <span className="text-violet-700 font-extrabold">{hr.kokuCount}/{hr.totalStudents} Siswa ({hr.kokuPercentage}%)</span>
                        </div>
                        <div className="bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              hr.kokuPercentage === 100 ? 'bg-emerald-500' : hr.kokuPercentage > 0 ? 'bg-violet-600' : 'bg-slate-300'
                            }`}
                            style={{ width: `${hr.kokuPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Badges of evaluated subjects in this class */}
                    {hr.evaluatedSubjectsBadges && hr.evaluatedSubjectsBadges.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-1">Mapel Terisi di Rombel ini:</span>
                        <div className="flex flex-wrap gap-1">
                          {hr.evaluatedSubjectsBadges.map((b: any) => (
                            <span key={b.name} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-extrabold">
                              {b.name}: {b.count} siswa
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDetailClassFilter(hr.className);
                        if (hr.hasPrimaryTeacher && hr.id && !hr.id.startsWith('cls-')) {
                          setDetailTeacherFilter(getCanonicalTeacherId(hr.id));
                        } else {
                          setDetailTeacherFilter('all');
                        }
                        setDetailSubjectFilter('all');
                        setDetailRoleFilter('homeroom');
                        setActiveTab('detail_nilai');
                      }}
                      className="w-full mt-2 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/60 rounded-xl text-[10.5px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye size={13} />
                      <span>Lihat Detail Nilai Kelas {hr.className}</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT EXCEL PTS & PAS */}
      {activeTab === 'import_pts_pas' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-indigo-600" />
                <span>Import Nilai PTS (Tengah Semester) & PAS (Akhir Semester)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai PTS & PAS diinput oleh Waka Kurikulum dan terhubung otomatis ke Rata-rata TP Guru Mapel & Kokurikuler Wali Kelas.
              </p>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <Download size={14} />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          {/* Step Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1">
              <span className="font-black text-indigo-700 text-[10px] uppercase tracking-wider">Langkah 1</span>
              <h4 className="font-bold text-slate-900">Unduh / Buka Excel</h4>
              <p className="text-slate-600 text-[11px]">Unduh template di atas atau siapkan file Excel dengan kolom: <strong>NIS, Nama Siswa, Mata Pelajaran, Nilai PTS, Nilai PAS</strong>.</p>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1">
              <span className="font-black text-indigo-700 text-[10px] uppercase tracking-wider">Langkah 2</span>
              <h4 className="font-bold text-slate-900">Salin & Tempel Data</h4>
              <p className="text-slate-600 text-[11px]">Blok tabel nilai di Excel Anda, tekan Ctrl+C, lalu tempelkan (Ctrl+V) ke dalam kotak input di bawah.</p>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1">
              <span className="font-black text-indigo-700 text-[10px] uppercase tracking-wider">Langkah 3</span>
              <h4 className="font-bold text-slate-900">Simpan & Terhubung</h4>
              <p className="text-slate-600 text-[11px]">Klik "Pratinjau Data" kemudian simpan. Nilai Akhir Tiap Mapel akan dihitung otomatis oleh sistem.</p>
            </div>
          </div>

          {/* Paste Input Area */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
              Tempel Data Tabel Excel / TSV Di Sini:
            </label>
            <textarea
              rows={6}
              placeholder="Contoh salinan dari Excel:&#10;21101	Ahmad Rizky	Matematika	85	88&#10;21102	Biti Nur	Bahasa Indonesia	90	92"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:border-indigo-600 bg-slate-50"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={handleParseImport}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Search size={14} />
                <span>Pratinjau Data Impor</span>
              </button>
            </div>
          </div>

          {importError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{importError}</span>
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {importParsedData.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-slate-900">
                  Pratinjau {importParsedData.length} Data Siswa Terdeteksi
                </h4>
                <button
                  onClick={handleSubmitImport}
                  disabled={isSubmittingImport}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Check size={16} />
                  <span>{isSubmittingImport ? 'Menyimpan...' : 'Simpan & Hubungkan Nilai PTS/PAS'}</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">NIS</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">Mata Pelajaran</th>
                      <th className="py-2.5 px-3 text-center">Nilai PTS</th>
                      <th className="py-2.5 px-3 text-center">Nilai PAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {importParsedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.nis}</td>
                        <td className="py-2 px-3 font-bold">{row.studentName}</td>
                        <td className="py-2 px-3 text-indigo-600 font-bold">{row.className}</td>
                        <td className="py-2 px-3">{row.subject}</td>
                        <td className="py-2 px-3 text-center font-bold text-indigo-600">{row.pts}</td>
                        <td className="py-2 px-3 text-center font-bold text-violet-600">{row.pas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REKAP & EXPORT NILAI AKHIR */}
      {activeTab === 'rekap_nilai' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                <span>Rekapitulasi Nilai Akhir Tiap Mapel (Kurikulum Merdeka)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Formula resmi: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">NILAI AKHIR = ((Rata2 TP × 3) + Kokurikuler + PTS + PAS) / 6</code>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportTeacherWorkloadExcel}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
                title="Export Monitoring Beban Jam Mengajar Guru (Total JP/Minggu) ke Excel"
              >
                <FileSpreadsheet size={16} />
                <span>Export Jam Mengajar (JP)</span>
              </button>

              <button
                onClick={handleExportFinalGradesExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
              >
                <FileSpreadsheet size={16} />
                <span>Export Nilai Akhir (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">NIS</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3 text-center">Rata2 TP</th>
                  <th className="py-3 px-3 text-center">Kokurikuler</th>
                  <th className="py-3 px-3 text-center">PTS</th>
                  <th className="py-3 px-3 text-center">PAS</th>
                  <th className="py-3 px-3 text-center bg-indigo-900">Nilai Akhir Mapel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                      Belum ada data penilaian yang masuk untuk semester & tahun ajaran ini.
                    </td>
                  </tr>
                ) : (
                  filteredAssessments
                    .filter(a => selectedClassFilter === 'all' || (a.className && normClass(a.className) === normClass(selectedClassFilter)))
                    .map(a => {
                      const finalVal = a.nilaiAkhirMapel ?? a.nilaiRapor ?? 0;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{getStudentNis(a.studentId, a.studentName)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{a.studentName}</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-600">{a.className}</td>
                          <td className="py-2.5 px-3">{a.subject}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">{a.nilaiRataTp ?? 0}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-violet-600">{a.nilaiKokurikuler ?? 0}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{a.nilaiPts ?? 0}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-600">{a.nilaiPas ?? 0}</td>
                          <td className="py-2.5 px-3 text-center font-black text-indigo-700 bg-indigo-50/50 text-sm">
                            {finalVal}
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

      {/* TAB: DETAIL NILAI GURU & WALI KELAS */}
      {activeTab === 'detail_nilai' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] uppercase mb-1">
                <ClipboardCheck size={12} />
                <span>Inspeksi Rinci Kurikulum</span>
              </div>
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <span>Rincian Input Nilai Guru Mapel & Wali Kelas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Pantau secara langsung seluruh butir komponen nilai yang diinput oleh Guru Mata Pelajaran (TP1-4, Tugas 1-2, UH, Rata-rata TP, Deskripsi) dan Wali Kelas (Kokurikuler P5) per siswa.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDetailRoleFilter('all');
                  setDetailTeacherFilter('all');
                  setDetailSubjectFilter('all');
                  setDetailClassFilter('all');
                  setDetailSearchQuery('');
                  setDetailStatusFilter('all');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Reset Filter</span>
              </button>

              <button
                type="button"
                onClick={handleExportFinalGradesExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider">
                <Filter size={13} />
                Filter Inspeksi Penilaian
              </span>
              <span className="text-slate-500 text-[11px] font-semibold">
                Menampilkan <strong className="text-slate-900">{detailedAssessmentsList.length}</strong> data penilaian
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Filter Tipe Penilai */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Tipe Pendidik</label>
                <select
                  value={detailRoleFilter}
                  onChange={(e: any) => setDetailRoleFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Semua Pendidik</option>
                  <option value="subject_teacher">Guru Mapel (TP & UH)</option>
                  <option value="homeroom">Wali Kelas (Kokurikuler)</option>
                </select>
              </div>

              {/* Filter Nama Guru / Wali (menggunakan Username sebagai nilai/kunci pencarian utama) */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Guru / Wali</label>
                <select
                  value={detailTeacherFilter}
                  onChange={(e) => setDetailTeacherFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Semua Guru / Wali</option>
                  {allTeacherOptions.map(t => (
                    <option key={t.username || t.id} value={t.username || t.id}>
                      {t.name} {t.username ? `(@${t.username})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Kelas */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Kelas</label>
                <select
                  value={detailClassFilter}
                  onChange={(e) => setDetailClassFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Semua Kelas</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>

              {/* Filter Mapel */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Mata Pelajaran</label>
                <select
                  value={detailSubjectFilter}
                  onChange={(e) => setDetailSubjectFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Semua Mapel</option>
                  {availableSubjects.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Status Nilai</label>
                <select
                  value={detailStatusFilter}
                  onChange={(e: any) => setDetailStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="complete">Lengkap (Guru & Wali)</option>
                  <option value="mapel_filled">Terisi Guru Mapel (TP & UH)</option>
                  <option value="koku_filled">Terisi Wali (Kokurikuler)</option>
                  <option value="incomplete">Belum Lengkap</option>
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Pencarian</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nama / NIS..."
                    value={detailSearchQuery}
                    onChange={(e) => setDetailSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                  />
                  <Search size={13} className="absolute left-2 top-2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3.5 space-y-0.5">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Rekam Penilaian</span>
              <p className="text-xl font-black text-indigo-950">{detailedAssessmentsList.length}</p>
              <p className="text-[9.5px] font-bold text-slate-500">Tersaring Sesuai Filter</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5 space-y-0.5">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Terisi Guru Mapel</span>
              <p className="text-xl font-black text-emerald-950">
                {detailedAssessmentsList.filter(a => (a.nilaiRataTp && a.nilaiRataTp > 0) || a.tp1Uh || a.tp1Tugas1).length}
              </p>
              <p className="text-[9.5px] font-bold text-slate-500">Memiliki Nilai TP & UH</p>
            </div>

            <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-3.5 space-y-0.5">
              <span className="text-[10px] font-extrabold text-violet-600 uppercase tracking-wider">Terisi Wali Kelas</span>
              <p className="text-xl font-black text-violet-950">
                {detailedAssessmentsList.filter(a => a.nilaiKokurikuler && a.nilaiKokurikuler > 0).length}
              </p>
              <p className="text-[9.5px] font-bold text-slate-500">Memiliki Nilai Kokurikuler P5</p>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 space-y-0.5">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Rata-rata Akhir</span>
              <p className="text-xl font-black text-blue-950">
                {detailedAssessmentsList.length > 0
                  ? (detailedAssessmentsList.reduce((acc, curr) => acc + (curr.nilaiAkhirMapel || curr.nilaiRapor || 0), 0) / detailedAssessmentsList.length).toFixed(1)
                  : '0.0'}
              </p>
              <p className="text-[9.5px] font-bold text-slate-500">Skala 0 - 100</p>
            </div>
          </div>

          {/* Main Inspection Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Siswa (NIS & Nama)</th>
                  <th className="py-3 px-3">Kelas & Mapel</th>
                  <th className="py-3 px-3">Guru Mapel (Penginput)</th>
                  <th className="py-3 px-3 text-center bg-slate-800">Rata2 TP (Guru)</th>
                  <th className="py-3 px-3 text-center bg-violet-900">Kokurikuler (Wali)</th>
                  <th className="py-3 px-3 text-center">PTS & PAS</th>
                  <th className="py-3 px-3 text-center bg-indigo-900">Nilai Akhir</th>
                  <th className="py-3 px-3 text-center">Detail / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {detailedAssessmentsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-lg mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                          <AlertCircle size={24} />
                        </div>
                        <span className="text-slate-800 font-black text-sm">
                          {detailTeacherFilter !== 'all' && detailSubjectFilter !== 'all'
                            ? `Belum Ada Nilai Terdata untuk ${selectedTeacherObj?.name || detailTeacherFilter}`
                            : 'Tidak Ada Data Penilaian Sesuai Filter'}
                        </span>
                        <p className="text-xs text-slate-500 font-normal leading-relaxed">
                          {detailTeacherFilter !== 'all' && detailSubjectFilter !== 'all'
                            ? `Guru ${selectedTeacherObj?.name || detailTeacherFilter} belum menginput nilai untuk mata pelajaran ${detailSubjectFilter}${detailClassFilter !== 'all' ? ` di Kelas ${detailClassFilter}` : ''}. Silakan pilih guru lain atau gunakan tombol di bawah untuk meninjau seluruh nilai tersimpan.`
                            : 'Periksa kembali pilihan guru, kelas, mapel, atau periode semester & tahun ajaran di atas.'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap justify-center pt-2">
                          {detailTeacherFilter !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setDetailTeacherFilter('all')}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                            >
                              <Users size={13} />
                              <span>Semua Guru {detailSubjectFilter !== 'all' ? `(${detailSubjectFilter})` : ''}</span>
                            </button>
                          )}
                          {detailClassFilter !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setDetailClassFilter('all')}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Filter size={13} />
                              <span>Semua Kelas</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDetailRoleFilter('all');
                              setDetailTeacherFilter('all');
                              setDetailSubjectFilter('all');
                              setDetailClassFilter('all');
                              setDetailSearchQuery('');
                              setDetailStatusFilter('all');
                              setSelectedSemester('all');
                              setSelectedAcademicYear('all');
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <RefreshCw size={13} />
                            <span>Reset Semua Filter</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  detailedAssessmentsList.map((a, idx) => {
                    const finalVal = a.nilaiAkhirMapel ?? a.nilaiRapor ?? 0;
                    const isExpanded = expandedRowId === a.id;
                    const matchedStudent = students.find(s => s.id === a.studentId || s.nis === a.studentId);
                    const hrTeacher = homerooms.find(h => h.className && normClass(h.className) === normClass(a.className));
                    const sched = classSchedules.find(s => 
                      normClass(s.className) === normClass(a.className) && 
                      isSameSubject(s.subject, a.subject)
                    );
                    const scheduledTeacherName = sched?.teacherName?.trim();

                    return (
                      <React.Fragment key={a.id || idx}>
                        <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-slate-500 text-[10px]">NIS: {getStudentNis(a.studentId, a.studentName)}</span>
                              <span className="font-extrabold text-slate-900 text-xs">{a.studentName}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-extrabold text-indigo-600 text-xs">{a.className}</span>
                              <span className="text-[11px] text-slate-700 font-bold">{a.subject}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-900">
                                {scheduledTeacherName || a.teacherName || 'Guru Mapel'}
                              </span>
                              {a.teacherName && scheduledTeacherName && cleanTeacherName(a.teacherName) !== cleanTeacherName(scheduledTeacherName) && a.teacherName.toLowerCase() !== 'guru mapel' && (
                                <span className="text-[9px] text-amber-700 font-medium">
                                  (Akun: {a.teacherName})
                                </span>
                              )}
                              {hrTeacher && (
                                <span className="text-[9.5px] font-semibold text-violet-600">
                                  Wali: {hrTeacher.name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Rata2 TP */}
                          <td className="py-3 px-3 text-center bg-slate-50/80">
                            {a.nilaiRataTp && a.nilaiRataTp > 0 ? (
                              <span className="font-black text-emerald-700 text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                {a.nilaiRataTp}
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Belum Input</span>
                            )}
                          </td>

                          {/* Kokurikuler */}
                          <td className="py-3 px-3 text-center bg-violet-50/30">
                            {a.nilaiKokurikuler && a.nilaiKokurikuler > 0 ? (
                              <span className="font-black text-violet-700 text-xs px-2 py-0.5 rounded bg-violet-100 border border-violet-200">
                                {a.nilaiKokurikuler}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Belum Input</span>
                            )}
                          </td>

                          {/* PTS & PAS */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-[11px]">
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                                PTS: {a.nilaiPts ?? '-'}
                              </span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded">
                                PAS: {a.nilaiPas ?? '-'}
                              </span>
                            </div>
                          </td>

                          {/* Nilai Akhir */}
                          <td className="py-3 px-3 text-center bg-indigo-50/50">
                            <span className="font-black text-indigo-900 text-sm">
                              {finalVal}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(isExpanded ? null : a.id)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="Lihat Rincian Butir TP & Tugas"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                <span>{isExpanded ? 'Tutup' : 'Rincian TP'}</span>
                              </button>

                              {matchedStudent && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentDetail(matchedStudent)}
                                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Pratinjau Kartu Rapor Lengkap Siswa"
                                >
                                  <Eye size={12} />
                                  <span>Kartu Nilai</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Accordion Expanded Details */}
                        {isExpanded && (
                          <tr className="bg-slate-50 border-b border-indigo-100">
                            <td colSpan={8} className="p-4 sm:p-5">
                              <div className="p-4 bg-white border border-indigo-150 rounded-2xl space-y-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <h5 className="font-extrabold text-xs text-indigo-900 flex items-center gap-1.5">
                                    <BookOpen size={14} className="text-indigo-600" />
                                    <span>Rincian Komponen Nilai {a.subject} — {a.studentName} ({a.className})</span>
                                  </h5>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Penginput Guru: <strong>{a.teacherName || '-'}</strong>
                                  </span>
                                </div>

                                {/* Component Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                  {/* TP 1 */}
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-black text-indigo-700 text-[10px] uppercase">{a.tp1Name || 'TP 1'}</span>
                                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                        Nilai TP: {a.nilaiTp1 ?? '-'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                                      <p>Tugas: <strong className="text-slate-900">{a.tp1Tugas1 ?? '-'}</strong></p>
                                      <p>UH / Sumatif: <strong className="text-slate-900">{a.tp1Uh ?? '-'}</strong></p>
                                    </div>
                                  </div>

                                  {/* TP 2 */}
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-black text-indigo-700 text-[10px] uppercase">{a.tp2Name || 'TP 2'}</span>
                                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                        Nilai TP: {a.nilaiTp2 ?? '-'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                                      <p>Tugas: <strong className="text-slate-900">{a.tp2Tugas1 ?? '-'}</strong></p>
                                      <p>UH / Sumatif: <strong className="text-slate-900">{a.tp2Uh ?? '-'}</strong></p>
                                    </div>
                                  </div>

                                  {/* TP 3 */}
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-black text-indigo-700 text-[10px] uppercase">{a.tp3Name || 'TP 3'}</span>
                                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                        Nilai TP: {a.nilaiTp3 ?? '-'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                                      <p>Tugas: <strong className="text-slate-900">{a.tp3Tugas1 ?? '-'}</strong></p>
                                      <p>UH / Sumatif: <strong className="text-slate-900">{a.tp3Uh ?? '-'}</strong></p>
                                    </div>
                                  </div>

                                  {/* TP 4 */}
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-black text-indigo-700 text-[10px] uppercase">{a.tp4Name || 'TP 4'}</span>
                                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                        Nilai TP: {a.nilaiTp4 ?? '-'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                                      <p>Tugas: <strong className="text-slate-900">{a.tp4Tugas1 ?? '-'}</strong></p>
                                      <p>UH / Sumatif: <strong className="text-slate-900">{a.tp4Uh ?? '-'}</strong></p>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Details: Deskripsi Capaian & Final Grade Formula */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1">
                                    <span className="font-black text-indigo-800 text-[10px] uppercase tracking-wider">
                                      Deskripsi Capaian Pembelajaran (Guru Mapel)
                                    </span>
                                    <p className="text-slate-700 italic text-[11px]">
                                      {a.deskripsiCapaian || 'Belum ada catatan deskripsi capaian pembelajaran dari guru mapel.'}
                                    </p>
                                  </div>

                                  <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl space-y-1">
                                    <span className="font-black text-violet-800 text-[10px] uppercase tracking-wider">
                                      Perhitungan Nilai Akhir Kurikulum
                                    </span>
                                    <p className="text-slate-800 font-mono text-[10.5px]">
                                      ((Rata2 TP: {a.nilaiRataTp || 0} × 3) + Kokurikuler: {a.nilaiKokurikuler || 0} + PTS: {a.nilaiPts || 0} + PAS: {a.nilaiPas || 0}) / 6
                                    </p>
                                    <p className="text-indigo-900 font-black text-xs">
                                      = NILAI AKHIR MAPEL: {finalVal}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: KARTU NILAI DETAIL SISWA (SAMPEL WAKA KURIKULUM) */}
      <AnimatePresence>
        {selectedStudentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
                    <GraduationCap size={12} />
                    <span>Transkrip Nilai Siswa — Waka Kurikulum</span>
                  </div>
                  <h3 className="text-xl font-black">{selectedStudentDetail.name}</h3>
                  <p className="text-xs text-slate-300">
                    NIS: <strong>{selectedStudentDetail.nis}</strong> &bull; Kelas: <strong>{selectedStudentDetail.class}</strong> &bull; Semester: <strong>{selectedSemester} ({selectedAcademicYear})</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} />
                    <span>Cetak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentDetail(null)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
                {/* Student Info Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Wali Kelas</span>
                    <strong className="text-slate-900 font-extrabold text-xs">
                      {homerooms.find(h => h.className && h.className.trim().toUpperCase() === selectedStudentDetail.class?.trim().toUpperCase())?.name || 'Wali Kelas Lintas Kelas'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status Siswa</span>
                    <strong className="text-emerald-700 font-extrabold text-xs">Siswa Aktif</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jumlah Mapel Terdata</span>
                    <strong className="text-indigo-700 font-extrabold text-xs">
                      {filteredAssessments.filter(a => a.studentId === selectedStudentDetail.id || a.studentId === selectedStudentDetail.nis).length} Mata Pelajaran
                    </strong>
                  </div>
                </div>

                {/* Table of all subjects for this student */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[10px]">
                        <th className="py-2.5 px-3">Mata Pelajaran</th>
                        <th className="py-2.5 px-3">Guru Mapel</th>
                        <th className="py-2.5 px-3 text-center">Rata2 TP</th>
                        <th className="py-2.5 px-3 text-center">Kokurikuler</th>
                        <th className="py-2.5 px-3 text-center">PTS</th>
                        <th className="py-2.5 px-3 text-center">PAS</th>
                        <th className="py-2.5 px-3 text-center bg-indigo-900">Nilai Akhir</th>
                        <th className="py-2.5 px-3 text-center">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {filteredAssessments.filter(a => a.studentId === selectedStudentDetail.id || a.studentId === selectedStudentDetail.nis).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                            Belum ada rekam nilai mapel yang tersimpan untuk siswa ini.
                          </td>
                        </tr>
                      ) : (
                        filteredAssessments
                          .filter(a => a.studentId === selectedStudentDetail.id || a.studentId === selectedStudentDetail.nis)
                          .map((a, i) => {
                            const finalScore = a.nilaiAkhirMapel ?? a.nilaiRapor ?? 0;
                            let predikat = 'D';
                            if (finalScore >= 90) predikat = 'A (Sangat Baik)';
                            else if (finalScore >= 80) predikat = 'B (Baik)';
                            else if (finalScore >= 70) predikat = 'C (Cukup)';

                            return (
                              <tr key={a.id || i} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{a.subject}</td>
                                <td className="py-2.5 px-3 text-slate-600">{a.teacherName || '-'}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">{a.nilaiRataTp ?? 0}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-violet-600">{a.nilaiKokurikuler ?? 0}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{a.nilaiPts ?? 0}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-blue-600">{a.nilaiPas ?? 0}</td>
                                <td className="py-2.5 px-3 text-center font-black text-indigo-800 bg-indigo-50/50">{finalScore}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{predikat}</td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TAB: RAPOR TENGAH SEMESTER (PTS / STS KURIKULUM MERDEKA) */}
      {activeTab === 'rapor_tengah_semester' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Header Controls Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Modul Waka Kurikulum</span>
                <h2 className="font-extrabold text-xl text-slate-900 mt-1 flex items-center gap-2">
                  <GraduationCap className="text-indigo-600" size={24} />
                  <span>Rapor Penilaian Tengah Semester (PTS / STS)</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Laporan hasil belajar tengah semester Kurikulum Merdeka. Dilengkapi rekapitulasi absensi sebelum catatan wali kelas, KOP resmi sekolah dari panel admin, serta tanda tangan otomatis Kepala Sekolah &amp; Wali Kelas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={raporStudents.length === 0}
                  onClick={() => printMidtermReport(raporStudents)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                  title="Cetak lembar rapor seluruh siswa kelas ini sekaligus (tiap siswa terpisah 1 halaman)"
                >
                  <Printer size={15} />
                  <span>Cetak Rapor 1 Kelas ({raporStudents.length} Siswa)</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Pilih Kelas Rombel
                </label>
                <select
                  value={selectedRaporClass}
                  onChange={(e) => setSelectedRaporClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      Kelas {cls} ({activeStudents.filter(s => s.class && normClass(s.class) === normClass(cls)).length} Siswa)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Semester (Berjalan)
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Tahun Ajaran
                </label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  {academicYearOptions.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Tanggal Rapor (Untuk TTD)
                </label>
                <input
                  type="date"
                  value={raporDate}
                  onChange={(e) => handleRaporDateChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Main Grid: Student Selector (Left) & Report Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Student Roster in Selected Class (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Daftar Siswa Kelas {selectedRaporClass} ({raporStudents.length})
                  </span>
                  {selectedRaporClass && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {homerooms.find(h => h.className && normClass(h.className) === normClass(selectedRaporClass))?.name || 'Wali Kelas'}
                    </span>
                  )}
                </div>

                {/* Quick Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NIS siswa..."
                    value={raporSearchQuery}
                    onChange={(e) => setRaporSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                {/* Student Buttons List */}
                <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1">
                  {raporStudents.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                      Tidak ada siswa aktif terdaftar di kelas {selectedRaporClass}.
                    </div>
                  ) : (
                    raporStudents
                      .filter(s => {
                        if (!raporSearchQuery) return true;
                        const q = raporSearchQuery.toLowerCase();
                        return s.name.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q));
                      })
                      .map((st, idx) => {
                        const isSelected = selectedRaporStudentId === st.id;
                        const stAssessments = getStudentAssessmentsForRapor(st);
                        const hasPtsScores = stAssessments.some(a => a.pts > 0);

                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedRaporStudentId(st.id)}
                            className={`w-full text-left p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 shadow-md text-white'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-6 w-6 shrink-0 rounded-lg text-[10px] font-black flex items-center justify-center ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-extrabold text-xs truncate leading-tight">{st.name}</div>
                                <div className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                                  NIS: {st.nis || '-'}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end shrink-0 gap-0.5">
                              <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold font-mono ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : hasPtsScores
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600'
                              }`}>
                                {stAssessments.filter(a => a.naPts > 0).length} / {stAssessments.length} Mapel
                              </span>
                              {hasPtsScores && (
                                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">
                                  PTS Siap
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Report Card Preview (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {selectedRaporStudent ? (() => {
                const att = getStudentAttendance(selectedRaporStudent);
                const scores = getStudentAssessmentsForRapor(selectedRaporStudent);
                const homeroomTeacher = homerooms.find(h => h.className && normClass(h.className) === normClass(selectedRaporStudent.class));
                const homeroomTeacherName = homeroomTeacher?.name || 'Wali Kelas';
                const defaultNote = "Ananda menunjukkan kesungguhan dan ketertiban yang sangat baik selama pembelajaran tengah semester. Pertahankan fokus belajar, kedisiplinan beribadah, dan tingkatkan pemahaman materi untuk persiapan akhir semester.";
                const studentNote = raporNotes[selectedRaporStudent.id] || defaultNote;

                let totalScore = 0;
                let assessedCount = 0;
                scores.forEach(s => {
                  if (s.naPts > 0) {
                    totalScore += s.naPts;
                    assessedCount++;
                  }
                });
                const avgScore = assessedCount > 0 ? Math.round(totalScore / assessedCount) : 0;

                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Pratinjau Lembar Rapor Resmi
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Kelas {selectedRaporStudent.class} &bull; Semester {selectedSemester}
                          </span>
                        </div>
                        <h3 className="font-black text-slate-900 text-lg leading-tight mt-1">
                          {selectedRaporStudent.name}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => printMidtermReport([selectedRaporStudent])}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                      >
                        <Printer size={14} />
                        <span>Cetak Rapor Siswa Ini</span>
                      </button>
                    </div>

                    {/* Report Card Document Simulation (A4 Look) */}
                    <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xs text-black font-sans text-xs select-text">
                      {/* 1. KOP Resmi Sekolah (Full kanan-kiri, tanpa garis pembatas) */}
                      {schoolIdentity?.letterhead ? (
                        <div className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-5 overflow-hidden rounded-t-2xl">
                          <img
                            src={schoolIdentity.letterhead}
                            alt="KOP Resmi Sekolah"
                            className="w-full h-auto block"
                            style={{ width: '100%', display: 'block' }}
                          />
                        </div>
                      ) : (
                        <div className="w-full text-center mb-4">
                          <div className="text-xs font-bold tracking-wider uppercase">LEMBAGA PENDIDIKAN MA'ARIF NU</div>
                          <div className="text-base font-black uppercase mt-0.5">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            NPSN: {schoolIdentity?.npsn || '20519280'} &bull; Status Akreditasi: {schoolIdentity?.accreditation || 'A (Unggul)'}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            {schoolIdentity?.address || "Jl. Dr. Sutomo No. 1 Pandaan, Pasuruan"} &bull; Telp: {schoolIdentity?.phone || "0343-631234"}
                          </div>
                        </div>
                      )}

                      {/* 2. Judul Dokumen Rapor */}
                      <div className="text-center my-3">
                        <h4 className="font-extrabold text-sm uppercase underline tracking-wide">
                          LAPORAN PENILAIAN HASIL BELAJAR TENGAH SEMESTER
                        </h4>
                        <p className="font-bold text-xs uppercase mt-0.5">
                          (RAPOR TENGAH SEMESTER)
                        </p>
                      </div>

                      {/* 3. Grid Metadata Identitas Siswa & Sekolah (Dua Kolom) */}
                      {(() => {
                        const nameLen = (selectedRaporStudent.name || '').trim().length;
                        const nameSizeClass = nameLen > 36
                          ? 'text-[10px]'
                          : nameLen > 28
                          ? 'text-[11px]'
                          : nameLen > 22
                          ? 'text-[11.5px]'
                          : 'text-xs';
                        return (
                          <div className="flex justify-between items-start mb-3 text-xs leading-relaxed w-full">
                            <table className="border-collapse">
                              <tbody>
                                <tr>
                                  <td className="font-semibold py-0.5 whitespace-nowrap pr-2">Nama Murid</td>
                                  <td className="py-0.5 whitespace-nowrap">
                                    : <strong className={`${nameSizeClass} inline-block whitespace-nowrap align-middle`}>
                                        {selectedRaporStudent.name}
                                      </strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="font-semibold py-0.5 whitespace-nowrap pr-2">NIS</td>
                                  <td className="py-0.5 font-mono whitespace-nowrap">: {selectedRaporStudent.nis || "-"}</td>
                                </tr>
                                <tr>
                                  <td className="font-semibold py-0.5 whitespace-nowrap pr-2">Nama Sekolah</td>
                                  <td className="py-0.5 whitespace-nowrap">: {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</td>
                                </tr>
                              </tbody>
                            </table>

                            <table className="border-collapse ml-auto">
                              <tbody>
                                <tr>
                                  <td className="font-semibold py-0.5 whitespace-nowrap pr-2">Tahun Ajaran</td>
                                  <td className="py-0.5 whitespace-nowrap text-left">: {selectedAcademicYear}</td>
                                </tr>
                                <tr>
                                  <td className="font-semibold py-0.5 whitespace-nowrap pr-2">Kelas / Fase</td>
                                  <td className="py-0.5 whitespace-nowrap text-left">: {selectedRaporStudent.class} / Fase D</td>
                                </tr>
                                <tr>
                                  <td className="font-semibold py-0.5 whitespace-nowrap pr-2">Semester</td>
                                  <td className="py-0.5 whitespace-nowrap text-left">: {selectedSemester}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}

                      {/* 4. Tabel Hasil Belajar Tengah Semester */}
                      <div className="font-bold uppercase text-[11px] mb-1">
                        A. CAPAIAN HASIL BELAJAR TENGAH SEMESTER
                      </div>
                      <div className="overflow-x-auto border border-black mb-3">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-center font-bold">
                              <th className="border border-black py-1.5 px-1 w-10">NO</th>
                              <th className="border border-black py-1.5 px-3 text-left">MATA PELAJARAN</th>
                              <th className="border border-black py-1.5 px-2 w-28">HARIAN</th>
                              <th className="border border-black py-1.5 px-2 w-28">ASTS</th>
                              <th className="border border-black py-1.5 px-2 w-32 bg-slate-200">NILAI AKHIR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scores.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="border border-black py-8 text-center text-slate-500 italic">
                                  Belum ada data penilaian mata pelajaran untuk tengah semester ini.
                                </td>
                              </tr>
                            ) : (
                              scores.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="border border-black py-1.5 px-1 text-center font-medium">{idx + 1}</td>
                                  <td className="border border-black py-1.5 px-3 font-bold">{s.subject}</td>
                                  <td className="border border-black py-1.5 px-2 text-center font-semibold text-slate-700">
                                    {s.avgTp > 0 ? s.avgTp : '-'}
                                  </td>
                                  <td className="border border-black py-1.5 px-2 text-center font-bold text-indigo-700">
                                    {s.pts > 0 ? s.pts : '-'}
                                  </td>
                                  <td className="border border-black py-1.5 px-2 text-center font-black bg-slate-100">
                                    {s.naPts > 0 ? s.naPts : '-'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {scores.length > 0 && (
                            <tfoot>
                              <tr className="bg-slate-50 font-bold text-center">
                                <td colSpan={4} className="border border-black py-1.5 px-3 text-right">JUMLAH NILAI</td>
                                <td className="border border-black py-1.5 px-2 font-black">{totalScore}</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold text-center">
                                <td colSpan={4} className="border border-black py-1.5 px-3 text-right">RATA-RATA NILAI</td>
                                <td className="border border-black py-1.5 px-2 font-black">{avgScore}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* 5. REKAPITULASI KEHADIRAN (ABSENSI) SEBELUM CATATAN WALI KELAS */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 items-stretch">
                        {/* Absensi (5 Cols) */}
                        <div className="md:col-span-5 flex flex-col">
                          <div className="font-bold uppercase text-[11px] mb-1">
                            B. REKAPITULASI KEHADIRAN
                          </div>
                          <table className="w-full text-xs border border-black border-collapse h-full">
                            <tbody>
                              <tr>
                                <td className="border border-black py-1 px-2 w-7/12">Sakit (S)</td>
                                <td className="border border-black py-1 px-2 text-center font-bold">{att.Sakit} Hari</td>
                              </tr>
                              <tr>
                                <td className="border border-black py-1 px-2">Izin (I)</td>
                                <td className="border border-black py-1 px-2 text-center font-bold">{att.Izin} Hari</td>
                              </tr>
                              <tr>
                                <td className="border border-black py-1 px-2">Tanpa Keterangan (A)</td>
                                <td className="border border-black py-1 px-2 text-center font-bold">{att.Alpa} Hari</td>
                              </tr>
                              <tr className="bg-slate-100 font-bold">
                                <td className="border border-black py-1 px-2">Jumlah Tidak Hadir</td>
                                <td className="border border-black py-1 px-2 text-center">
                                  {att.Sakit + att.Izin + att.Alpa} Hari
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Catatan Wali Kelas (7 Cols) */}
                        <div className="md:col-span-7 flex flex-col">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold uppercase text-[11px]">
                              C. CATATAN WALI KELAS
                            </span>
                            {editingNoteStudentId !== selectedRaporStudent.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                   setEditingNoteStudentId(selectedRaporStudent.id);
                                   setEditingNoteText(studentNote);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                              >
                                Edit Catatan
                              </button>
                            ) : null}
                          </div>

                          {editingNoteStudentId === selectedRaporStudent.id ? (
                            <div className="flex flex-col gap-1.5 h-full">
                              <textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-indigo-400 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                                placeholder="Tuliskan catatan wali kelas untuk siswa ini..."
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteStudentId(null)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSaveStudentNote(selectedRaporStudent.id, editingNoteText);
                                    setEditingNoteStudentId(null);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                >
                                  Simpan Catatan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-black p-3 text-xs leading-relaxed italic bg-white flex-1 min-h-[70px]">
                              "{studentNote}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6. Kolom Tanda Tangan (3 Kolom: Orang Tua, Wali Kelas, Kepala Sekolah) */}
                      <table className="w-full text-xs mt-6 border-collapse">
                        <tbody>
                          <tr>
                            <td className="w-1/3 text-center align-top">
                              Mengetahui,<br />
                              Orang Tua / Wali Murid
                              <div className="h-14"></div>
                              ( .................................................. )
                            </td>
                            <td className="w-1/3 text-center align-top">
                              Pandaan, {formatIndonesianDate(raporDate) || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                              Wali Kelas {selectedRaporStudent.class}
                              <div className="h-14"></div>
                              <u><strong>{homeroomTeacherName}</strong></u>
                            </td>
                            <td className="w-1/3 text-center align-top">
                              Mengetahui,<br />
                              Kepala Sekolah
                              <div className="h-14 flex items-center justify-center">
                                {schoolIdentity?.principalSignature ? (
                                  <img
                                    src={schoolIdentity.principalSignature}
                                    alt="TTD Kepala Sekolah"
                                    className="max-h-12 max-w-[120px] object-contain mx-auto"
                                  />
                                ) : null}
                              </div>
                              <u><strong>{schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</strong></u>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })() : (
                <div className="py-24 text-center text-slate-400 font-semibold bg-white border border-slate-200 rounded-3xl shadow-sm text-xs">
                  Pilih siswa di sebelah kiri untuk melihat pratinjau lembar Rapor Tengah Semester.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KEAMANAN SANDI */}
      {activeTab === 'password' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Key size={20} className="text-indigo-600" />
              <span>Pengaturan Sandi Akun Waka Kurikulum</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui kata sandi otentikasi portal kurikulum secara berkala untuk menjaga keamanan data nilai siswa.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordMsg && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Kata Sandi Lama
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                placeholder="Masukkan kata sandi lama Anda"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                placeholder="Minimal 4 karakter"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                placeholder="Ulangi kata sandi baru"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>{isSavingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16 no-print select-none">
        {/* Menu 1 (Home - paling kiri) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('monitoring');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'monitoring' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <Home size={20} className={activeTab === 'monitoring' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'monitoring' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Home</span>
        </button>

        {/* Menu 2 (Jadwal Mengajar) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('schedules');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'schedules' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <Calendar size={20} className={activeTab === 'schedules' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'schedules' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Jadwal</span>
        </button>

        {/* Menu 3 (Import PTS/PAS) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('import_pts_pas');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'import_pts_pas' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <FileSpreadsheet size={20} className={activeTab === 'import_pts_pas' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'import_pts_pas' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Import</span>
        </button>

        {/* Menu 4 (Rekap Nilai) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('rekap_nilai');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'rekap_nilai' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <BookOpen size={20} className={activeTab === 'rekap_nilai' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'rekap_nilai' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Rekap</span>
        </button>

        {/* Menu 5 (Lainnya - Kotak Empat, Paling Kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'password' || showMoreMenu ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={activeTab === 'password' || showMoreMenu ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'password' || showMoreMenu ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Lainnya</span>
        </button>
      </div>

      {/* Slide-over menu bottom sheet overlay for "Lainnya" */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 z-40 bg-black md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10 no-print md:hidden"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Pendukung</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Waka Kurikulum</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('detail_nilai');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'detail_nilai'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">📋</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Detail Nilai Guru & Wali</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Inspeksi butir TP & Kokurikuler</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rapor_tengah_semester');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'rapor_tengah_semester'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">🎓</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Rapor Tengah Semester</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Cetak Rapor PTS/STS Kurikulum Merdeka</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'password'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">🔑</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Keamanan Sandi</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Ubah kata sandi akun Kurikulum</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onRefreshData) onRefreshData();
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">🔄</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Muat Ulang Data</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Sinkronkan ulang data dari server</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
