import React, { useState, useEffect, useMemo } from "react";
import { 
  LogOut, 
  RefreshCw, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  Loader2, 
  Brain, 
  User, 
  Calendar, 
  AlertCircle, 
  Printer, 
  ShieldCheck, 
  Key, 
  Grid, 
  Clock, 
  BookOpen, 
  Activity, 
  ChevronRight, 
  CheckSquare, 
  Award,
  Smartphone,
  Apple,
  HelpCircle,
  Home,
  LayoutGrid,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  UserCheck,
  Building,
  ArrowRight,
  TrendingUp,
  FileText,
  Trash2,
  Check,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Plus,
  X,
  Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { StudentCounselingLog, SchoolIdentity, AttendanceLog, StudentInfractionLog, Student, ClassSchedule, SubjectTeacher, HomeroomTeacher } from "../types";
import BukuIndukManagement from "./BukuIndukManagement";
import ScheduleView from "./ScheduleView";
import { Pagination } from "./Pagination";

interface CounselorPanelProps {
  schoolIdentity?: SchoolIdentity;
  onLogout: () => void;
  onRefresh: () => void;
  onUpdateStudent: (id: string, data: any) => Promise<boolean>;
  classSchedules?: ClassSchedule[];
  subjectTeachers?: SubjectTeacher[];
  homerooms?: HomeroomTeacher[];
  students?: Student[];
  attendanceLogs?: AttendanceLog[];
}

export default function CounselorPanel({ 
  schoolIdentity, 
  onLogout, 
  onRefresh, 
  onUpdateStudent, 
  classSchedules = [], 
  subjectTeachers = [], 
  homerooms = [], 
  students = [],
  attendanceLogs = []
}: CounselorPanelProps) {
  const [logs, setLogs] = useState<StudentCounselingLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>(() => (attendanceLogs && attendanceLogs.length > 0) ? attendanceLogs : []);
  const [infractions, setInfractions] = useState<StudentInfractionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'home' | 'counseling' | 'attendance' | 'infractions' | 'buku_induk' | 'journals' | 'jadwal'>('home');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Teaching Journals State & Filters (Monitoring Jurnal Walas & KBM)
  const [teachingJournals, setTeachingJournals] = useState<any[]>([]);
  const [journalTeacherTypeFilter, setJournalTeacherTypeFilter] = useState<'all' | 'subject' | 'homeroom'>('all');
  const [selectedSubjectTeacherFilter, setSelectedSubjectTeacherFilter] = useState<string>('all');
  const [selectedHomeroomTeacherFilter, setSelectedHomeroomTeacherFilter] = useState<string>('all');
  const [journalStartDate, setJournalStartDate] = useState("");
  const [journalEndDate, setJournalEndDate] = useState("");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [classFilter, setClassFilter] = useState("all");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'>('all');
  const [attendanceSortBy, setAttendanceSortBy] = useState<'name' | 'class' | 'hadir' | 'sakit' | 'izin' | 'alpa' | 'terlambat' | 'total' | 'rate'>('name');
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc'>('asc');

  // Date range filters for attendance & infractions
  const [attendanceStartDate, setAttendanceStartDate] = useState("");
  const [attendanceEndDate, setAttendanceEndDate] = useState("");
  const [infractionStartDate, setInfractionStartDate] = useState("");
  const [infractionEndDate, setInfractionEndDate] = useState("");

  // Secondary sub-tab states for custom list or aggregates
  const [attendanceSubTab, setAttendanceSubTab] = useState<'diary' | 'aggregate'>('aggregate');
  const [infractionSubTab, setInfractionSubTab] = useState<'student_points_table' | 'list' | 'points' | 'add' | 'reduction' | 'rubric'>('student_points_table');
  const [studentPointsViewMode, setStudentPointsViewMode] = useState<'by_student' | 'all_rows'>('by_student');

  // Infraction rules rubric configuration inside Counselor Panel
  const [infractionRules, setInfractionRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleBabInput, setRuleBabInput] = useState('');
  const [ruleSubBabInput, setRuleSubBabInput] = useState('');
  const [ruleCodeInput, setRuleCodeInput] = useState('');
  const [ruleNameInput, setRuleNameInput] = useState('');
  const [ruleSanctionInput, setRuleSanctionInput] = useState('');
  const [rulePointsInput, setRulePointsInput] = useState<number>(2);
  const [ruleCategoryInput, setRuleCategoryInput] = useState('Ringan');
  const [rubricImportMode, setRubricImportMode] = useState<'append' | 'replace'>('append');
  const [importingRubric, setImportingRubric] = useState(false);
  const rubricFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importingPoints, setImportingPoints] = useState(false);
  const pointsFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Suggestion & Solutions form state
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [bkFeedbackText, setBkFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Change Password State
  const [showPasswordTab, setShowPasswordTab] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Custom Quick Counseling draft state (auto-connect from infractions or absences)
  const [draftStudentId, setDraftStudentId] = useState("");
  const [draftStudentNisn, setDraftStudentNisn] = useState("");
  const [draftStudentName, setDraftStudentName] = useState("");
  const [draftClassName, setDraftClassName] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [draftSuccess, setDraftSuccess] = useState(false);
  const [initiatedStudentIds, setInitiatedStudentIds] = useState<string[]>([]);

  // Print Student Modal state
  const [showPrintStudentModal, setShowPrintStudentModal] = useState(false);
  const [printStudentSearch, setPrintStudentSearch] = useState("");
  const [selectedStudentForPrint, setSelectedStudentForPrint] = useState("");

  // Point Reduction State (Percentage-Based)
  const [allStudents, setAllStudents] = useState<Student[]>(() => (students && students.length > 0) ? students : []);
  const [reductionStudentId, setReductionStudentId] = useState("");
  const [reductionStudentSearch, setReductionStudentSearch] = useState("");
  const [draftStudentSearch, setDraftStudentSearch] = useState("");
  const [reductionPercentage, setReductionPercentage] = useState<number>(25);
  const [reductionReason, setReductionReason] = useState("");
  const [reductionDate, setReductionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reductionTime, setReductionTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [submittingReduction, setSubmittingReduction] = useState(false);

  // Khusus Kelas 7: Tanggal Pemberlakuan Poin (Poin Alpa & pelanggaran lain sebelum tanggal ini tidak dihitung)
  const [grade7PointsEffectiveDate, setGrade7PointsEffectiveDate] = useState<string>("");
  const [savingGrade7Date, setSavingGrade7Date] = useState(false);

  // Direct Infraction Point Giving State (Guru BK -> Langsung ke MySQL)
  const [newInfractionStudentId, setNewInfractionStudentId] = useState("");
  const [newInfractionStudentSearch, setNewInfractionStudentSearch] = useState("");
  const [newInfractionRuleId, setNewInfractionRuleId] = useState("");
  const [newInfractionBab, setNewInfractionBab] = useState("");
  const [newInfractionSubBab, setNewInfractionSubBab] = useState("");
  const [newInfractionSanction, setNewInfractionSanction] = useState("");
  const [newInfractionNotes, setNewInfractionNotes] = useState("");
  const [newInfractionType, setNewInfractionType] = useState("");
  const [newInfractionPoints, setNewInfractionPoints] = useState<number>(5);
  const [newInfractionLocation, setNewInfractionLocation] = useState("Lingkungan Sekolah");
  const [newInfractionActionTaken, setNewInfractionActionTaken] = useState("Pembinaan disiplin dan konseling oleh Guru BK");
  const [newInfractionResolutionStatus, setNewInfractionResolutionStatus] = useState<'Dalam Proses' | 'Belum Selesai' | 'Selesai' | 'Butuh Mediasi'>('Dalam Proses');
  const [newInfractionDate, setNewInfractionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newInfractionTime, setNewInfractionTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [submittingInfraction, setSubmittingInfraction] = useState(false);

  // Pagination states for high-volume tabs to eliminate DOM overload & browser freezing
  const [attendanceAggregatePage, setAttendanceAggregatePage] = useState(1);
  const [attendanceAggregatePageSize, setAttendanceAggregatePageSize] = useState(25);

  const [attendanceDiaryPage, setAttendanceDiaryPage] = useState(1);
  const [attendanceDiaryPageSize, setAttendanceDiaryPageSize] = useState(25);

  const [journalsPage, setJournalsPage] = useState(1);
  const [journalsPageSize, setJournalsPageSize] = useState(15);

  const [infractionPage, setInfractionPage] = useState(1);
  const [infractionPageSize, setInfractionPageSize] = useState(25);

  const [counselingPage, setCounselingPage] = useState(1);
  const [counselingPageSize, setCounselingPageSize] = useState(15);

  // Reset pagination to page 1 on filter or search updates
  useEffect(() => {
    setCounselingPage(1);
    setAttendanceAggregatePage(1);
    setAttendanceDiaryPage(1);
    setJournalsPage(1);
    setInfractionPage(1);
  }, [searchQuery, classFilter, statusFilter, attendanceStatusFilter, journalTeacherTypeFilter, selectedSubjectTeacherFilter, selectedHomeroomTeacherFilter, attendanceStartDate, attendanceEndDate, infractionStartDate, infractionEndDate]);

  // Sync state if props become available after mounting
  useEffect(() => {
    if (students && students.length > 0 && allStudents.length === 0) {
      setAllStudents(students);
    }
  }, [students]);

  useEffect(() => {
    if (attendanceLogs && attendanceLogs.length > 0 && attendance.length === 0) {
      setAttendance(attendanceLogs);
    }
  }, [attendanceLogs]);

  // Load all integrated databases efficiently
  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resCouns, resAtt, resInf, resRules, resJournals, resBkSettings] = await Promise.all([
        fetch("/api/student-counseling-logs"),
        fetch("/api/attendance"),
        fetch("/api/student-infraction-logs"),
        fetch("/api/infraction-rules"),
        fetch("/api/teaching-journals"),
        fetch("/api/bk/infraction-settings")
      ]);

      if (resCouns.ok) {
        const data = await resCouns.json();
        setLogs(Array.isArray(data) ? data : []);
      }
      if (resAtt.ok) {
        const data = await resAtt.json();
        setAttendance(Array.isArray(data) ? data : []);
      }
      if (resInf.ok) {
        const data = await resInf.json();
        setInfractions(Array.isArray(data) ? data : []);
      }
      if (resRules.ok) {
        const data = await resRules.json();
        setInfractionRules(sortInfractionRulesClient(Array.isArray(data) ? data : []));
      }
      if (resJournals.ok) {
        const data = await resJournals.json();
        setTeachingJournals(Array.isArray(data) ? data : []);
      }
      if (resBkSettings.ok) {
        const cfg = await resBkSettings.json();
        setGrade7PointsEffectiveDate(String(cfg?.grade7PointsEffectiveDate || "").substring(0, 10));
      }

      // If students prop is empty or missing, fetch students in background
      if (!students || students.length === 0) {
        fetch("/api/students")
          .then(res => res.ok ? res.json() : [])
          .then(data => { if (Array.isArray(data) && data.length > 0) setAllStudents(data); })
          .catch(() => {});
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal melakukan sinkronisasi dengan database rekam sekolah.");
    } finally {
      setLoading(false);
    }
  };

  const isGrade7ClassName = (cls?: string): boolean => {
    const clean = String(cls || "").trim();
    return /^(?:kelas\s*)?(?:7|vii)(?:$|[^0-9i])/i.test(clean);
  };

  // Filter seluruh pelanggaran (termasuk Alpa & pelanggaran lainnya): jika Kelas 7 dan tanggal < grade7PointsEffectiveDate, tidak dihitung
  const effectiveInfractions = useMemo(() => {
    const effDate = String(grade7PointsEffectiveDate || "").trim().substring(0, 10);
    if (!effDate) return infractions;
    return infractions.filter(inf => {
      const d = String(inf.date || "").trim().substring(0, 10);
      if (!d) return true;
      let cls = String(inf.className || "").trim();
      if (!cls || cls === "-") {
        const matched = allStudents.find(
          s =>
            s.id === inf.studentId ||
            (s.nis && s.nis === inf.studentId) ||
            s.name.trim().toLowerCase() === String(inf.studentName || "").trim().toLowerCase()
        );
        if (matched?.class) cls = matched.class;
      }
      if (isGrade7ClassName(cls) && d < effDate) {
        return false;
      }
      return true;
    });
  }, [infractions, grade7PointsEffectiveDate, allStudents]);

  const handleSaveGrade7EffectiveDate = async (nextDate: string) => {
    setSavingGrade7Date(true);
    try {
      const clean = String(nextDate || "").trim().substring(0, 10);
      const res = await fetch("/api/bk/infraction-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade7PointsEffectiveDate: clean })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setGrade7PointsEffectiveDate(String(data.grade7PointsEffectiveDate || ""));
        if (Array.isArray(data.studentInfractionLogs)) {
          setInfractions(data.studentInfractionLogs);
        } else {
          fetchAllData();
        }
        setSuccessMsg(data.message || "Pengaturan tanggal pemberlakuan poin Kelas 7 berhasil disimpan.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(data.error || "Gagal menyimpan tanggal pemberlakuan poin Kelas 7.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghubungi server untuk menyimpan pengaturan Kelas 7.");
    } finally {
      setSavingGrade7Date(false);
    }
  };

  // Calculate accumulated points per student for percentage-based reduction
  const studentPointsMapForReduction = useMemo(() => {
    const map = new Map<string, number>();
    effectiveInfractions.forEach(inf => {
      const matched = allStudents.find(
        s =>
          s.id === inf.studentId ||
          (s.nis && s.nis === inf.studentId) ||
          s.name.trim().toLowerCase() === String(inf.studentName || '').trim().toLowerCase()
      );
      const key = matched ? matched.id : String(inf.studentId || '');
      if (!key) return;
      const prev = map.get(key) || 0;
      map.set(key, Number((prev + (Number(inf.points) || 0)).toFixed(2)));
    });
    map.forEach((val, key) => {
      if (val < 0) map.set(key, 0);
    });
    return map;
  }, [effectiveInfractions, allStudents]);

  const selectedReductionStudentCurrentPoints = useMemo(() => {
    if (!reductionStudentId) return 0;
    return Math.max(0, studentPointsMapForReduction.get(reductionStudentId) || 0);
  }, [reductionStudentId, studentPointsMapForReduction]);

  const calculatedReductionPoints = useMemo(() => {
    if (selectedReductionStudentCurrentPoints <= 0) return 0;
    const pct = Math.min(100, Math.max(0, Number(reductionPercentage) || 0));
    return Number(((selectedReductionStudentCurrentPoints * pct) / 100).toFixed(2));
  }, [selectedReductionStudentCurrentPoints, reductionPercentage]);

  const remainingPointsAfterReduction = useMemo(() => {
    return Math.max(0, Number((selectedReductionStudentCurrentPoints - calculatedReductionPoints).toFixed(2)));
  }, [selectedReductionStudentCurrentPoints, calculatedReductionPoints]);

  const handleSubmitReduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(reductionPercentage) || 0;
    if (!reductionStudentId || pct <= 0 || pct > 100 || !reductionReason.trim()) {
      alert("Mohon pilih siswa, isi persentase pengurangan (1% - 100%), dan lengkapi alasan pengurangan poin.");
      return;
    }

    const student = allStudents.find(s => s.id === reductionStudentId);
    if (!student) {
      alert("Siswa tidak ditemukan.");
      return;
    }

    if (selectedReductionStudentCurrentPoints <= 0 || calculatedReductionPoints <= 0) {
      alert(`Siswa ${student.name} saat ini memiliki 0 poin pelanggaran, sehingga tidak ada poin yang dapat dikurangi.`);
      return;
    }

    setSubmittingReduction(true);
    try {
      const res = await fetch('/api/student-infraction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          className: student.class,
          date: reductionDate,
          time: reductionTime,
          location: "Ruang Bimbingan Konseling (BK)",
          infractionType: `Pengurangan Poin (${pct}%): ${reductionReason.trim()}`,
          actionTaken: `Hasil pembinaan & bimbingan BK selesai (Poin dikurangi ${pct}% / -${calculatedReductionPoints} Poin dari ${selectedReductionStudentCurrentPoints} Poin, sisa ${remainingPointsAfterReduction} Poin)`,
          notes: `Pengurangan ${pct}% (-${calculatedReductionPoints} Poin dari total ${selectedReductionStudentCurrentPoints} Poin). Alasan: ${reductionReason.trim()}`,
          resolutionStatus: 'Selesai',
          points: -Math.abs(calculatedReductionPoints),
          source: 'reduction_bk'
        })
      });

      if (res.ok) {
        setSuccessMsg(
          `Berhasil mengurangi ${pct}% (-${calculatedReductionPoints} Poin) untuk ${student.name}. Sisa poin: ${remainingPointsAfterReduction} Poin.`
        );
        setReductionReason("");
        setReductionStudentId("");
        fetchAllData();
        onRefresh();
        setInfractionSubTab('points');
        
        // Auto dismiss success toast message after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal mencatatkan pengurangan poin.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal terhubung ke server.");
    } finally {
      setSubmittingReduction(false);
    }
  };

  const handleSubmitNewInfraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfractionStudentId || !newInfractionPoints || !newInfractionType.trim()) {
      alert("Mohon lengkapi data siswa, jenis pelanggaran, dan bobot poin pelanggaran.");
      return;
    }

    const student = allStudents.find(s => s.id === newInfractionStudentId);
    if (!student) {
      alert("Siswa tidak ditemukan.");
      return;
    }

    setSubmittingInfraction(true);
    try {
      const res = await fetch('/api/student-infraction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          className: student.class,
          date: newInfractionDate,
          time: newInfractionTime,
          location: newInfractionLocation.trim() || "Lingkungan Sekolah",
          infractionType: newInfractionType.trim(),
          actionTaken: newInfractionActionTaken.trim() || newInfractionSanction.trim() || "Pembinaan disiplin dan konseling oleh Guru BK",
          resolutionStatus: newInfractionResolutionStatus,
          points: Math.abs(Number(newInfractionPoints)) || 5,
          bab: newInfractionBab.trim(),
          subBab: newInfractionSubBab.trim(),
          sanction: newInfractionSanction.trim(),
          notes: newInfractionNotes.trim(),
          ruleId: newInfractionRuleId,
          source: 'manual_bk'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const mysqlStatus = data.mysqlSaved ? " (Tersimpan langsung ke database MySQL)" : "";
        setSuccessMsg(`Berhasil memberikan ${newInfractionPoints} poin pelanggaran untuk ${student.name}${mysqlStatus}.`);
        setNewInfractionType("");
        setNewInfractionBab("");
        setNewInfractionSubBab("");
        setNewInfractionSanction("");
        setNewInfractionNotes("");
        setNewInfractionPoints(5);
        setNewInfractionStudentId("");
        setNewInfractionRuleId("");
        setNewInfractionLocation("Lingkungan Sekolah");
        setNewInfractionActionTaken("Pembinaan disiplin dan konseling oleh Guru BK");
        fetchAllData();
        onRefresh();
        setInfractionSubTab('student_points_table');

        // Auto dismiss success toast message after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal memberikan poin pelanggaran.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal terhubung ke server.");
    } finally {
      setSubmittingInfraction(false);
    }
  };

  const handleDeleteStudentAttendance = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Hapus seluruh rekap absensi untuk siswa "${studentName}"?`)) return;
    try {
      const res = await fetch(`/api/attendance/student/${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetch(`/api/attendance/student/${encodeURIComponent(studentName)}`, {
          method: 'DELETE'
        });
        setSuccessMsg(`Berhasil menghapus seluruh rekap absensi siswa ${studentName}.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchAllData();
        onRefresh();
      } else {
        alert("Gagal menghapus data absensi siswa.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menghapus absensi.");
    }
  };

  const handleDeleteSingleAttendance = async (id: string, studentName: string, date: string) => {
    if (!window.confirm(`Hapus catatan presensi ${studentName} pada tanggal ${date}?`)) return;
    try {
      const res = await fetch(`/api/attendance/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg(`Berhasil menghapus catatan presensi ${studentName} tanggal ${date}.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchAllData();
        onRefresh();
      } else {
        alert("Gagal menghapus catatan presensi.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menghapus presensi.");
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleNameInput.trim() || rulePointsInput === undefined) {
      alert('Nama acuan aturan sanksi dan poin harus terisi.');
      return;
    }
    setLoadingRules(true);
    try {
      const url = editingRuleId ? `/api/infraction-rules/${editingRuleId}` : '/api/infraction-rules';
      const method = editingRuleId ? 'PUT' : 'POST';
      const formattedName = ruleCodeInput.trim() && !ruleNameInput.trim().startsWith(ruleCodeInput.trim())
        ? `${ruleCodeInput.trim()} ${ruleNameInput.trim()}`
        : ruleNameInput.trim();
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bab: ruleBabInput.trim(),
          subBab: ruleSubBabInput.trim().replace(/:$/, ''),
          code: ruleCodeInput.trim(),
          name: formattedName,
          sanction: ruleSanctionInput.trim(),
          points: Number(rulePointsInput),
          category: ruleCategoryInput
        })
      });
      if (res.ok) {
        setSuccessMsg(editingRuleId ? 'Sukses memperbarui acuan sanksi di MySQL!' : 'Sukses menambah acuan sanksi baru ke MySQL!');
        setRuleBabInput('');
        setRuleSubBabInput('');
        setRuleCodeInput('');
        setRuleNameInput('');
        setRuleSanctionInput('');
        setRulePointsInput(2);
        setRuleCategoryInput('Ringan');
        setEditingRuleId(null);
        
        const resRules = await fetch("/api/infraction-rules");
        if (resRules.ok) {
          const data = await resRules.json();
          setInfractionRules(sortInfractionRulesClient(Array.isArray(data) ? data : []));
        }
        onRefresh();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menyimpan aturan.');
      }
    } catch {
      alert('Koneksi server terputus.');
    } finally {
      setLoadingRules(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus acuan rules pelanggaran ini secara permanen dari MySQL?')) return;
    setLoadingRules(true);
    try {
      const res = await fetch(`/api/infraction-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Acuan sanksi berhasil dihapus dari MySQL.');
        setEditingRuleId(null);
        setRuleNameInput('');
        
        const resRules = await fetch("/api/infraction-rules");
        if (resRules.ok) {
          const data = await resRules.json();
          setInfractionRules(sortInfractionRulesClient(Array.isArray(data) ? data : []));
        }
        onRefresh();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert('Gagal menghapus acuan.');
      }
    } catch {
      alert('Kehilangan sinyal server.');
    } finally {
      setLoadingRules(false);
    }
  };

  // ============================================================================
  // 1. TEMPLATE & IMPORT RUBRIK SANKSI (BAB, SUB BAB, BUTIR, SANKSI, BESAR POIN)
  // ============================================================================
  const handleDownloadRubricTemplateCsv = () => {
    const lines = [
      "BAB,SUB BAB,Kode,Jenis Pelanggaran,Sanksi,Besar Poin,Kategori",
      '"BAB 1 Kerapian","SUB BAB 1 Seragam Murid","1.1","1.1 Corat-coret topi","Teguran Langsung","2","Ringan"',
      '"BAB 1 Kerapian","SUB BAB 1 Seragam Murid","1.2","1.2 Memakai topi tidak beridentitas sekolah","Teguran Langsung","2","Ringan"',
      "",
      "# ===========================================================================",
      "# CATATAN: Anda juga dapat menulis dengan format blok berurutan seperti contoh:",
      "# BAB 1 Kerapian",
      "# SUB BAB 1 Seragam Murid:",
      "# 1.1 Corat-coret topi",
      "# 1.2 Memakai topi tidak beridentitas sekolah",
      "# Sanksi=Teguran Langsung",
      "# Besar Poin=2",
      "# ==========================================================================="
    ];
    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "TEMPLATE_RUBRIK_SANKSI_BK.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadRubricTemplateExcel = () => {
    const wb = XLSX.utils.book_new();
    const tableRows = [
      ["BAB", "SUB BAB", "Kode", "Jenis Pelanggaran", "Sanksi", "Besar Poin", "Kategori"],
      ["BAB 1 Kerapian", "SUB BAB 1 Seragam Murid", "1.1", "1.1 Corat-coret topi", "Teguran Langsung", 2, "Ringan"],
      ["BAB 1 Kerapian", "SUB BAB 1 Seragam Murid", "1.2", "1.2 Memakai topi tidak beridentitas sekolah", "Teguran Langsung", 2, "Ringan"]
    ];
    const wsTable = XLSX.utils.aoa_to_sheet(tableRows);
    wsTable["!cols"] = [
      { wch: 22 },
      { wch: 28 },
      { wch: 10 },
      { wch: 42 },
      { wch: 25 },
      { wch: 12 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTable, "Template Tabel Rubrik");

    const blockRows = [
      ["BAB 1 Kerapian"],
      ["SUB BAB 1 Seragam Murid:"],
      ["1.1  Corat-coret topi"],
      ["1.2 Memakai topi tidak beridentitas sekolah"],
      ["Sanksi=Teguran Langsung"],
      ["Besar Poin=2"]
    ];
    const wsBlock = XLSX.utils.aoa_to_sheet(blockRows);
    wsBlock["!cols"] = [{ wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsBlock, "Format Blok BAB & SUB BAB");

    XLSX.writeFile(wb, "TEMPLATE_RUBRIK_SANKSI_BK.xlsx");
  };

  const parseRubricFromSheetRows = (rows: any[][]): any[] => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    // 1. Cek apakah menggunakan format Tabel Kolom (Header: BAB, SUB BAB, Jenis Pelanggaran, Sanksi, Besar Poin)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowCells = (rows[i] || []).map((c: any) => String(c ?? "").trim().toLowerCase());
      const hasBabCol = rowCells.some(c => c === "bab" || c.startsWith("bab "));
      const hasSubBabCol = rowCells.some(c => c.includes("sub bab") || c.includes("sub_bab") || c.includes("subbab"));
      const hasNameCol = rowCells.some(c => c.includes("pelanggaran") || c.includes("aturan") || c.includes("deskripsi") || c.includes("butir"));
      if ((hasBabCol && hasSubBabCol) || hasNameCol) {
        if (rowCells.filter(Boolean).length >= 3) {
          headerIdx = i;
          break;
        }
      }
    }

    const parsedRules: any[] = [];

    if (headerIdx !== -1) {
      const headers = (rows[headerIdx] || []).map((c: any) => String(c ?? "").trim().toLowerCase());
      const colBab = headers.findIndex(h => h === "bab");
      const colSubBab = headers.findIndex(h => h.includes("sub bab") || h.includes("sub_bab") || h.includes("subbab"));
      const colCode = headers.findIndex(h => h === "kode" || h === "code" || h === "no" || h === "nomor");
      const colName = headers.findIndex(h => h.includes("pelanggaran") || h.includes("aturan") || h.includes("deskripsi") || h.includes("butir") || h === "nama");
      const colSanction = headers.findIndex(h => h.includes("sanksi") || h.includes("tindakan"));
      const colPoints = headers.findIndex(h => h.includes("poin") || h.includes("point") || h.includes("bobot"));
      const colCat = headers.findIndex(h => h.includes("kategori") || h.includes("tingkat"));

      let activeBab = "";
      let activeSubBab = "";
      let activeSanction = "";
      let activePoints = 0;

      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const firstCell = String(row[0] ?? "").trim();
        if (firstCell.startsWith("#")) continue;

        const rawBab = colBab !== -1 ? String(row[colBab] ?? "").trim() : "";
        const rawSubBab = colSubBab !== -1 ? String(row[colSubBab] ?? "").trim().replace(/:$/, "") : "";
        const rawCode = colCode !== -1 ? String(row[colCode] ?? "").trim() : "";
        const rawName = colName !== -1 ? String(row[colName] ?? "").trim() : "";
        const rawSanction = colSanction !== -1 ? String(row[colSanction] ?? "").trim() : "";
        const rawPtsStr = colPoints !== -1 ? String(row[colPoints] ?? "").trim() : "";
        const rawCat = colCat !== -1 ? String(row[colCat] ?? "").trim() : "";

        if (rawBab) activeBab = rawBab;
        if (rawSubBab) activeSubBab = rawSubBab;
        if (rawSanction) activeSanction = rawSanction;
        if (rawPtsStr !== "" && !isNaN(Number(rawPtsStr))) activePoints = Number(rawPtsStr);

        if (!rawName) continue;

        let extractedCode = rawCode;
        let finalName = rawName;
        const codeMatch = rawName.match(/^(\d+(?:\.\d+)+)\s+(.+)$/);
        if (!extractedCode && codeMatch) {
          extractedCode = codeMatch[1];
        } else if (extractedCode && !rawName.startsWith(extractedCode)) {
          finalName = `${extractedCode} ${rawName}`;
        }

        const pts = rawPtsStr !== "" && !isNaN(Number(rawPtsStr)) ? Number(rawPtsStr) : (activePoints || 2);
        const sanction = rawSanction || activeSanction || "Teguran Langsung";
        const category = rawCat || (pts >= 25 ? "Berat" : pts >= 10 ? "Sedang" : "Ringan");

        parsedRules.push({
          bab: activeBab,
          subBab: activeSubBab,
          code: extractedCode,
          name: finalName,
          sanction,
          points: pts,
          category
        });
      }

      if (parsedRules.length > 0) return parsedRules;
    }

    // 2. Format Blok Berurutan (BAB 1 ..., SUB BAB 1 ..., 1.1 ..., 1.2 ..., Sanksi=..., Besar Poin=...)
    let currentBab = "";
    let currentSubBab = "";
    let blockSanction = "";
    let blockPoints = 0;
    let pendingItems: { code: string; name: string }[] = [];
    let seenMetaAfterItems = false;

    const flushPendingItems = () => {
      if (pendingItems.length === 0) return;
      const pts = blockPoints > 0 ? blockPoints : 2;
      const sanction = blockSanction || "Teguran Langsung";
      const category = pts >= 25 ? "Berat" : pts >= 10 ? "Sedang" : "Ringan";
      for (const item of pendingItems) {
        parsedRules.push({
          bab: currentBab,
          subBab: currentSubBab,
          code: item.code,
          name: item.name,
          sanction,
          points: pts,
          category
        });
      }
      pendingItems = [];
      seenMetaAfterItems = false;
    };

    for (let r = 0; r < rows.length; r++) {
      const row = (rows[r] || []).map((c: any) => String(c ?? "").trim()).filter(Boolean);
      if (row.length === 0) continue;
      const fullLine = row.join(" ").trim();
      if (!fullLine || fullLine.startsWith("#")) continue;

      if (/^bab\b/i.test(fullLine)) {
        flushPendingItems();
        currentBab = fullLine.replace(/:$/, "").trim();
        currentSubBab = "";
        blockSanction = "";
        blockPoints = 0;
        continue;
      }

      if (/^sub\s*bab\b/i.test(fullLine)) {
        flushPendingItems();
        currentSubBab = fullLine.replace(/:$/, "").trim();
        blockSanction = "";
        blockPoints = 0;
        continue;
      }

      const sanksiMatch = fullLine.match(/^sanksi\s*[=:]\s*(.+)$/i) || (row.length >= 2 && /^sanksi$/i.test(row[0]) ? [null, row.slice(1).join(" ")] : null);
      if (sanksiMatch && sanksiMatch[1]) {
        blockSanction = sanksiMatch[1].trim();
        if (pendingItems.length > 0) seenMetaAfterItems = true;
        continue;
      }

      const poinMatch = fullLine.match(/^(?:besar\s*)?poin\s*[=:]\s*(\d+(?:\.\d+)?)/i) || (row.length >= 2 && /^(?:besar\s*)?poin$/i.test(row[0]) ? [null, row[1]] : null);
      if (poinMatch && poinMatch[1]) {
        blockPoints = Number(poinMatch[1]) || 0;
        if (pendingItems.length > 0) seenMetaAfterItems = true;
        continue;
      }

      // Jika sudah pernah melihat Sanksi=... / Besar Poin=... setelah daftar butir, dan sekarang ketemu butir baru, flush blok sebelumnya
      if (seenMetaAfterItems && pendingItems.length > 0) {
        flushPendingItems();
      }

      const itemMatch = fullLine.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
      if (itemMatch) {
        const code = itemMatch[1].trim();
        const text = itemMatch[2].trim();
        pendingItems.push({
          code,
          name: `${code} ${text}`
        });
      } else {
        pendingItems.push({
          code: "",
          name: fullLine
        });
      }
    }

    flushPendingItems();
    return parsedRules;
  };

  const handleImportRubricFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImportingRubric(true);
    setErrorMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const parsedRules = parseRubricFromSheetRows(rows);
      if (parsedRules.length === 0) {
        alert("Tidak ditemukan data rubrik sanksi yang valid di dalam file. Pastikan format sesuai template.");
        return;
      }

      const res = await fetch("/api/infraction-rules/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: parsedRules,
          mode: rubricImportMode
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInfractionRules(sortInfractionRulesClient(Array.isArray(data.infractionRules) ? data.infractionRules : []));
        setSuccessMsg(`Berhasil mengimpor ${data.count} rubrik sanksi (BAB & SUB BAB) langsung ke database MySQL!`);
        setTimeout(() => setSuccessMsg(null), 5000);
        onRefresh();
      } else {
        alert(data.error || "Gagal menyimpan hasil import rubrik sanksi ke MySQL.");
      }
    } catch (err: any) {
      console.error("[Import Rubric Error]:", err);
      alert("Gagal membaca file Excel/CSV rubrik: " + (err?.message || String(err)));
    } finally {
      setImportingRubric(false);
    }
  };

  // ============================================================================
  // 2. TEMPLATE & IMPORT PEMBERIAN POIN PELANGGARAN SISWA (OTOMATIS TERISI SEMUA SISWA AKTIF + MULTI-ISIAN PELANGGARAN + REFERENSI RUBRIK)
  // ============================================================================
  const activeStudentsSorted = useMemo(() => {
    return [...allStudents]
      .filter(s => {
        const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === "mutasi" || s.class.toLowerCase() === "mutasi keluar"));
        const isLulus = s.class && (s.class.toLowerCase() === "lulus" || s.class.toLowerCase() === "lulusan");
        if (isMut || isLulus) return false;
        if (classFilter !== "all" && s.class !== classFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const cmpClass = (a.class || "").localeCompare(b.class || "", "id", { numeric: true, sensitivity: "base" });
        if (cmpClass !== 0) return cmpClass;
        return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
      });
  }, [allStudents, classFilter]);

  const sortInfractionRulesClient = <T extends Record<string, any>>(rules: T[]): T[] => {
    const extractSegments = (r: Record<string, any>): number[] | null => {
      const codeStr = String(r?.code || "").trim();
      const nameStr = String(r?.name || r?.infractionType || "").trim();
      const m = codeStr.match(/^(\d+(?:\.\d+)*)/) || nameStr.match(/^(\d+(?:\.\d+)*)/);
      if (!m) return null;
      return m[1].split(".").map(n => parseInt(n, 10));
    };
    const extractBabNum = (babStr: string): number | null => {
      const m = String(babStr || "").trim().match(/(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    };
    return [...(rules || [])].sort((a, b) => {
      const babNumA = extractBabNum(a?.bab);
      const babNumB = extractBabNum(b?.bab);
      if (babNumA !== null && babNumB !== null && babNumA !== babNumB) {
        return babNumA - babNumB;
      }
      const segA = extractSegments(a);
      const segB = extractSegments(b);
      if (segA && segB) {
        const len = Math.max(segA.length, segB.length);
        for (let i = 0; i < len; i++) {
          const va = segA[i] ?? -1;
          const vb = segB[i] ?? -1;
          if (va !== vb) return va - vb;
        }
      } else if (segA && !segB) {
        return -1;
      } else if (!segA && segB) {
        return 1;
      }
      const babCmp = String(a?.bab || "").localeCompare(String(b?.bab || ""), "id", { numeric: true, sensitivity: "base" });
      if (babCmp !== 0) return babCmp;
      const subBabCmp = String(a?.subBab || "").localeCompare(String(b?.subBab || ""), "id", { numeric: true, sensitivity: "base" });
      if (subBabCmp !== 0) return subBabCmp;
      const codeCmp = String(a?.code || "").localeCompare(String(b?.code || ""), "id", { numeric: true, sensitivity: "base" });
      if (codeCmp !== 0) return codeCmp;
      return String(a?.name || a?.infractionType || "").localeCompare(String(b?.name || b?.infractionType || ""), "id", { numeric: true, sensitivity: "base" });
    });
  };

  const getRuleDisplayNumber = (r: any, idx: number): string => {
    if (r?.code && String(r.code).trim()) return String(r.code).trim();
    const m = String(r?.name || "").trim().match(/^(\d+(?:\.\d+)*)/);
    if (m) return m[1];
    return String(idx + 1);
  };

  const handleDownloadPointsTemplateCsv = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const csvEscape = (val: any) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [];
    // Header Utama: Otomatis terisi semua siswa aktif; BK tinggal mengisi Nomor Pelanggaran (misal 1.1, 1.2) dan Keterangan Tambahan
    lines.push(
      [
        "No",
        "Tanggal",
        "NIS",
        "Nama Siswa",
        "Kelas",
        "Nomor Pelanggaran 1 (Contoh: 1.1)",
        "Keterangan Tambahan 1",
        "Nomor Pelanggaran 2 (Contoh: 1.2)",
        "Keterangan Tambahan 2",
        "Nomor Pelanggaran 3",
        "Keterangan Tambahan 3"
      ].map(csvEscape).join(",")
    );

    activeStudentsSorted.forEach((st, idx) => {
      lines.push(
        [
          idx + 1,
          todayStr,
          st.nis || st.id,
          st.name,
          st.class,
          "",
          "",
          "",
          "",
          "",
          ""
        ].map(csvEscape).join(",")
      );
    });

    lines.push("");
    lines.push("# ===================================================================================================");
    lines.push("# DAFTAR REFERENSI NOMOR PELANGGARAN SESUAI RUBRIK POIN (TINGGAL ISI NOMOR PELANGGARAN DI KOLOM ATAS)");
    lines.push("# Contoh pengisian: tulis 1.1 pada kolom Nomor Pelanggaran 1, dan isi Keterangan Tambahan jika ada.");
    lines.push("# 1 Siswa dapat diisi beberapa pelanggaran pada Nomor Pelanggaran 1, 2, 3 atau dipisah titik koma (;).");
    lines.push("# ===================================================================================================");
    lines.push("# Nomor Pelanggaran,BAB,SUB BAB,Jenis Pelanggaran (Rubrik),Sanksi,Besar Poin,Kategori");

    if (infractionRules.length === 0) {
      lines.push('# "1.1","BAB 1 Kerapian","SUB BAB 1 Seragam Murid","1.1 Corat-coret topi","Teguran Langsung",2,"Ringan"');
      lines.push('# "1.2","BAB 1 Kerapian","SUB BAB 1 Seragam Murid","1.2 Memakai topi tidak beridentitas sekolah","Teguran Langsung",2,"Ringan"');
    } else {
      infractionRules.forEach((r, idx) => {
        lines.push(
          "# " +
            [
              getRuleDisplayNumber(r, idx),
              r.bab || "-",
              r.subBab || "-",
              r.name || "-",
              r.sanction || "-",
              r.points || 0,
              r.category || "Ringan"
            ].map(csvEscape).join(",")
        );
      });
    }

    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix = classFilter !== "all" ? `_KELAS_${classFilter}` : "_SEMUA_SISWA_AKTIF";
    link.download = `TEMPLATE_IMPORT_POINT_PELANGGARAN_BK${suffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPointsTemplateExcel = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const wb = XLSX.utils.book_new();

    const headerRow = [
      "No",
      "Tanggal",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Nomor Pelanggaran 1 (Contoh: 1.1)",
      "Keterangan Tambahan 1",
      "Nomor Pelanggaran 2 (Contoh: 1.2)",
      "Keterangan Tambahan 2",
      "Nomor Pelanggaran 3",
      "Keterangan Tambahan 3",
      "",
      "REFERENSI: Nomor Pelanggaran",
      "REFERENSI: BAB",
      "REFERENSI: SUB BAB",
      "REFERENSI: Jenis Pelanggaran (Rubrik)",
      "REFERENSI: Sanksi",
      "REFERENSI: Besar Poin"
    ];

    const maxRows = Math.max(activeStudentsSorted.length, infractionRules.length, 1);
    const sheetRows: any[][] = [headerRow];

    for (let i = 0; i < maxRows; i++) {
      const st = activeStudentsSorted[i];
      const rule = infractionRules[i];
      sheetRows.push([
        st ? i + 1 : "",
        st ? todayStr : "",
        st ? (st.nis || st.id) : "",
        st ? st.name : "",
        st ? st.class : "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        rule ? getRuleDisplayNumber(rule, i) : "",
        rule ? (rule.bab || "-") : "",
        rule ? (rule.subBab || "-") : "",
        rule ? (rule.name || "-") : "",
        rule ? (rule.sanction || "-") : "",
        rule ? (rule.points ?? 0) : ""
      ]);
    }

    const wsInput = XLSX.utils.aoa_to_sheet(sheetRows);
    wsInput["!cols"] = [
      { wch: 6 },
      { wch: 13 },
      { wch: 14 },
      { wch: 28 },
      { wch: 10 },
      { wch: 30 },
      { wch: 28 },
      { wch: 30 },
      { wch: 28 },
      { wch: 26 },
      { wch: 28 },
      { wch: 4 },
      { wch: 22 },
      { wch: 22 },
      { wch: 26 },
      { wch: 38 },
      { wch: 24 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInput, "Input Point Pelanggaran");

    const refRows: any[][] = [
      ["Nomor Pelanggaran", "BAB", "SUB BAB", "Jenis Pelanggaran (Rubrik)", "Sanksi", "Besar Poin", "Kategori"]
    ];
    infractionRules.forEach((r, idx) => {
      refRows.push([
        getRuleDisplayNumber(r, idx),
        r.bab || "-",
        r.subBab || "-",
        r.name || "-",
        r.sanction || "-",
        r.points ?? 0,
        r.category || "Ringan"
      ]);
    });
    const wsRef = XLSX.utils.aoa_to_sheet(refRows);
    wsRef["!cols"] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 28 },
      { wch: 42 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRef, "Referensi Rubrik Point");

    const suffix = classFilter !== "all" ? `_KELAS_${classFilter}` : "_SEMUA_SISWA_AKTIF";
    XLSX.writeFile(wb, `TEMPLATE_IMPORT_POINT_PELANGGARAN_BK${suffix}.xlsx`);
  };

  const handleImportPointsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImportingPoints(true);
    setErrorMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (!rows || rows.length < 2) {
        alert("File kosong atau tidak memiliki baris data.");
        return;
      }

      // Cari baris header utama
      let headerIdx = 0;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const cells = (rows[i] || []).map((c: any) => String(c ?? "").trim().toLowerCase());
        if (cells.some(c => c === "nis" || c.includes("nama siswa") || c.includes("pelanggaran"))) {
          headerIdx = i;
          break;
        }
      }

      const headers = (rows[headerIdx] || []).map((c: any) => String(c ?? "").trim().toLowerCase());
      const colDate = headers.findIndex(h => h.includes("tanggal") || h === "date");
      const colNis = headers.findIndex(h => h === "nis" || h === "nisn" || h === "id siswa");
      const colName = headers.findIndex(h => h.includes("nama siswa") || h === "nama" || h === "student_name");
      const colClass = headers.findIndex(h => h === "kelas" || h === "class");

      // Deteksi seluruh pasangan kolom Pelanggaran & Keterangan Tambahan (mendukung 1 siswa banyak isian kolom maupun banyak baris)
      const infractionSlotCols: { infCol: number; notesCol: number; pointsCol: number; sanctionCol: number }[] = [];
      headers.forEach((h, idx) => {
        if (h.startsWith("referensi:")) return; // Abaikan kolom tabel referensi di sebelah kanan
        if (h.includes("pelanggaran") || h.includes("kode") || h.includes("rubrik")) {
          // Cari apakah ada kolom keterangan/poin/sanksi setelahnya
          const slotNumMatch = h.match(/(\d+)/);
          const slotNum = slotNumMatch ? slotNumMatch[1] : "";
          const notesCol = headers.findIndex((nh, nIdx) =>
            nIdx > idx &&
            !nh.startsWith("referensi:") &&
            (nh.includes("keterangan") || nh.includes("catatan") || nh === "notes") &&
            (!slotNum || nh.includes(slotNum))
          );
          const pointsCol = headers.findIndex((ph, pIdx) =>
            pIdx > idx &&
            !ph.startsWith("referensi:") &&
            (ph.includes("poin") || ph.includes("point")) &&
            (!slotNum || ph.includes(slotNum))
          );
          const sanctionCol = headers.findIndex((sh, sIdx) =>
            sIdx > idx &&
            !sh.startsWith("referensi:") &&
            sh.includes("sanksi") &&
            (!slotNum || sh.includes(slotNum))
          );
          infractionSlotCols.push({ infCol: idx, notesCol, pointsCol, sanctionCol });
        }
      });

      const itemsToImport: any[] = [];
      const todayStr = new Date().toISOString().split("T")[0];

      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const firstNonEmpty = row.map((c: any) => String(c ?? "").trim()).find(Boolean) || "";
        if (!firstNonEmpty || firstNonEmpty.startsWith("#")) continue;

        const nis = colNis !== -1 ? String(row[colNis] ?? "").trim() : "";
        const studentName = colName !== -1 ? String(row[colName] ?? "").trim() : "";
        const className = colClass !== -1 ? String(row[colClass] ?? "").trim() : "";
        const dateVal = colDate !== -1 && String(row[colDate] ?? "").trim() ? String(row[colDate] ?? "").trim() : todayStr;

        if (!nis && !studentName) continue;
        if (nis.toLowerCase() === "nis" || studentName.toLowerCase() === "nama siswa") continue;

        for (const slot of infractionSlotCols) {
          const rawPelanggaranCell = String(row[slot.infCol] ?? "").trim();
          if (!rawPelanggaranCell || rawPelanggaranCell === "-") continue;

          const rawNotesCell = slot.notesCol !== -1 ? String(row[slot.notesCol] ?? "").trim() : "";
          const rawPointsCell = slot.pointsCol !== -1 ? String(row[slot.pointsCol] ?? "").trim() : "";
          const rawSanctionCell = slot.sanctionCol !== -1 ? String(row[slot.sanctionCol] ?? "").trim() : "";

          // Mendukung pengisian beberapa kode/pelanggaran dipisah titik koma (;) di dalam 1 sel juga
          const splitRefs = rawPelanggaranCell.split(";").map(s => s.trim()).filter(Boolean);
          for (const refItem of splitRefs) {
            itemsToImport.push({
              nis,
              studentName,
              className,
              date: dateVal,
              ruleRef: refItem,
              infractionType: refItem,
              notes: rawNotesCell,
              points: rawPointsCell !== "" && !isNaN(Number(rawPointsCell)) ? Number(rawPointsCell) : undefined,
              sanction: rawSanctionCell || undefined
            });
          }
        }
      }

      if (itemsToImport.length === 0) {
        alert("Tidak ditemukan isian pelanggaran pada file yang diunggah. Pastikan kolom Pelanggaran sudah diisi pada baris siswa yang melanggar.");
        return;
      }

      const res = await fetch("/api/student-infraction-logs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToImport })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.studentInfractionLogs)) {
          setInfractions(data.studentInfractionLogs);
        } else {
          fetchAllData();
        }
        setSuccessMsg(`Berhasil mengimpor ${data.count} data poin pelanggaran siswa langsung ke MySQL dan dimasukkan ke Daftar/Tabel Point Pelanggaran Siswa!`);
        setInfractionSubTab("student_points_table");
        setTimeout(() => setSuccessMsg(null), 5000);
        onRefresh();
      } else {
        alert(data.error || "Gagal mengimpor poin pelanggaran siswa.");
      }
    } catch (err: any) {
      console.error("[Import Points Error]:", err);
      alert("Gagal membaca file import poin pelanggaran: " + (err?.message || String(err)));
    } finally {
      setImportingPoints(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleReload = () => {
    fetchAllData();
    onRefresh();
  };

  // Submit Saran & Rekomendasi Guru BK
  const handleSubmitFeedback = async (e: React.FormEvent, logId: string) => {
    e.preventDefault();
    if (!bkFeedbackText.trim()) {
      alert("Saran dan solusi tidak boleh kosong.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/student-counseling-logs/${logId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bkFeedback: bkFeedbackText.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.studentCounselingLogs);
        setSelectedLogId(null);
        setBkFeedbackText("");
        setSuccessMsg("Saran & Komitmen solusi berhasil dikirim langsung ke akun Wali Kelas terkait!");
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        alert("Gagal menyimpan saran. Coba hubungi administrator.");
      }
    } catch (err) {
      console.error(err);
      alert("Koneksi internet bermasalah.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi sandi baru tidak cocok.");
      return;
    }

    if (newPassword.length < 5) {
      setErrorMsg("Kriteria sandi minimal 5 karakter.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/bk/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      if (res.ok) {
        setSuccessMsg("Sandi akun konselor Guru BK berhasil diamankan.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Gagal memperbarui sandi.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Sandi gagal dikirim karena kendala sistem jaringan.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Print single counselor layout
  const handlePrintLog = (log: StudentCounselingLog) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak dokumen.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const subHeader = schoolIdentity?.subheading || "Penilaian Karakter, Bimbingan & Kebiasaan Positif";
    const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
    const address = schoolIdentity?.address || "Jl. Pandaan, Jawa Timur";
    const logoSrc = schoolIdentity?.logo || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Hasil Bimbingan & Konseling Sekolah</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: white; line-height: 1.5; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #0f172a; margin-bottom: 25px; padding-bottom: 10px; }
            .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
            .info-cell { text-align: center; vertical-align: middle; }
            .school-name { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
            .school-sub { font-size: 11px; margin: 3px 0 0 0; color: #475569; font-weight: 600; }
            .school-meta { font-size: 9px; margin: 3px 0 0 0; color: #64748b; font-style: italic; }
            .title-doc { text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 25px 0; letter-spacing: 0.5px; text-decoration: underline; }
            .meta-info-table { width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; margin-bottom: 20px; }
            .meta-info-table th, .meta-info-table td { padding: 8px 12px; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; }
            .meta-info-table th { background-color: #f8fafc; font-weight: bold; width: 25%; }
            .log-section { width: 100%; border: 1px solid #e2e8f0; border-collapse: collapse; margin-bottom: 20px; }
            .log-section th { background-color: #f1f5f9; font-size: 11px; font-weight: bold; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
            .log-section td { font-size: 11px; padding: 12px; border: 1px solid #e2e8f0; vertical-align: top; background: #fff; }
            .block-text { margin: 0; font-size: 11px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
            .feedback-block { background-color: #f0fdf4 !important; border-left: 4px solid #16a34a; }
            .signatures { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 30px; margin-top: 50px; text-align: center; font-size: 11px; }
            .sig-space { height: 75px; }
            .sig-title { font-weight: bold; margin-bottom: 5px; }
            .footer-line { border-top: 1px solid #cbd5e1; font-size: 9px; font-style: italic; text-align: center; color: #94a3b8; margin-top: 50px; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${schoolIdentity?.letterhead ? `
            <div style="width: 100%; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
              <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block;" />
            </div>
          ` : `
            <table class="header-table">
              <tr>
                ${logoSrc ? `<td class="logo-cell"><img src="${logoSrc}" style="max-height: 60px; max-width: 60px;" /></td>` : ''}
                <td class="info-cell">
                  <div class="school-name">${schoolName}</div>
                  <div class="school-sub">${subHeader} - Akreditasi: ${accreditation}</div>
                  <div class="school-meta">Alamat: ${address}</div>
                </td>
              </tr>
            </table>
          `}

          <div class="title-doc">DOKUMEN INTEGRASI PEMBINAAN BIMBINGAN & KONSELING (BK)</div>

          <table class="meta-info-table">
            <tr>
              <th>Nama Siswa Terkait</th>
              <td>${log.studentName}</td>
              <th>Wali Kelas Penginput</th>
              <td>Kelas ${log.className}</td>
            </tr>
            <tr>
              <th>Tanggal Konseling</th>
              <td>${new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              <th>Waktu Audit Rekaman</th>
              <td>${new Date(log.createdAt).toLocaleString('id-ID')}</td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th>I. Topik / Deskripsi Permasalahan Siswa (Diinput Wali Kelas)</th>
            </tr>
            <tr>
              <td>
                <p class="block-text">"${log.topic}"</p>
              </td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th>II. Rencana Tindakan Advokasi & Mediasi Kelas</th>
            </tr>
            <tr>
              <td>
                <p class="block-text">"${log.actionPlan}"</p>
              </td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th>III. Komitmen Perubahan Perilaku & Hasil Akhir Siswa</th>
            </tr>
            <tr>
              <td>
                <p class="block-text">"${log.result}"</p>
              </td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th style="background-color: #dcfce7; color: #14532d;">IV. Saran Profesional, Intervensi &amp; Solusi Terarah Guru BK</th>
            </tr>
            <tr class="feedback-block">
              <td>
                <p class="block-text" style="color: #14532d; font-weight: bold;">
                  ${log.bkFeedback ? `"${log.bkFeedback}"` : "Belum diuraikan oleh Guru Konselor BK / dalam proses pengamatan khusus."}
                </p>
                ${log.bkFeedbackAt ? `<span style="font-size: 8px; color: #166534; display: block; margin-top: 5px;">Diselesaikan pada: ${new Date(log.bkFeedbackAt).toLocaleString('id-ID')}</span>` : ''}
              </td>
            </tr>
          </table>

          <div class="signatures">
            <div>
              <div class="sig-title">Wali Kelas Penginput</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Wali Kelas ${log.className} )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Kelas Terdaftar</div>
            </div>
            <div>
              <div class="sig-title">Guru Bimbingan Konseling</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Guru Konselor BK )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. BK Terintegrasi</div>
            </div>
            <div>
              <div class="sig-title">Kepala Sekolah / Yayasan</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( ${schoolIdentity?.principal || "Kepala Sekolah"} )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Penanggung Jawab</div>
            </div>
          </div>

          <div class="footer-line">
            Kerahasiaan dokumen bimbingan ini dilindungi di bawah kode etik Guru BK dilarang dibagikan ke pihak luar lembaga yang tidak berkepentingan resmi.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Global Counseling Journal
  const handlePrintGlobalLogs = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak dokumen.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const subHeader = schoolIdentity?.subheading || "Penilaian Karakter, Bimbingan & Kebiasaan Positif";
    const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
    const address = schoolIdentity?.address || "Jl. Pandaan, Jawa Timur";
    const logoSrc = schoolIdentity?.logo || "";

    const logsToPrint = filteredLogs.length > 0 ? filteredLogs : logs;

    printWindow.document.write(`
      <html>
        <head>
          <title>Jurnal Global Bimbingan & Konseling BK</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Inter', system-ui, sans-serif; padding: 20px; color: #1e293b; background: white; line-height: 1.4; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #0f172a; margin-bottom: 18px; padding-bottom: 10px; }
            .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
            .info-cell { text-align: center; vertical-align: middle; }
            .school-name { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
            .school-sub { font-size: 11px; margin: 3px 0 0 0; color: #475569; font-weight: 600; }
            .school-meta { font-size: 9px; margin: 3px 0 0 0; color: #64748b; font-style: italic; }
            .title-doc { text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 15px 0 5px 0; letter-spacing: 0.5px; text-decoration: underline; }
            .sub-doc { text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-bottom: 20px; }
            .main-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px; }
            .main-table th { background-color: #f1f5f9; color: #0f172a; font-weight: 800; border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; text-transform: uppercase; }
            .main-table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
            .badge-resolved { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .signatures { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-top: 35px; text-align: center; font-size: 11px; page-break-inside: avoid; }
            .sig-space { height: 60px; }
            .sig-title { font-weight: bold; margin-bottom: 5px; }
            .footer-line { border-top: 1px solid #cbd5e1; font-size: 8px; font-style: italic; text-align: center; color: #94a3b8; margin-top: 25px; padding-top: 8px; }
          </style>
        </head>
        <body>
          ${schoolIdentity?.letterhead ? `
            <div style="width: 100%; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
              <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block;" />
            </div>
          ` : `
            <table class="header-table">
              <tr>
                ${logoSrc ? `<td class="logo-cell"><img src="${logoSrc}" style="max-height: 55px; max-width: 55px;" /></td>` : ''}
                <td class="info-cell">
                  <div class="school-name">${schoolName}</div>
                  <div class="school-sub">${subHeader} - Akreditasi: ${accreditation}</div>
                  <div class="school-meta">Alamat: ${address}</div>
                </td>
              </tr>
            </table>
          `}

          <div class="title-doc">JURNAL REKAPITULASI GLOBAL BIMBINGAN & KONSELING (BK)</div>
          <div class="sub-doc">Total Kasus / Bimbingan Terdata: ${logsToPrint.length} Rekaman Session | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 25px;">No</th>
                <th style="width: 75px;">Tanggal</th>
                <th style="width: 120px;">Nama Siswa</th>
                <th style="width: 45px;">Kelas</th>
                <th>Topik & Kronologi Permasalahan</th>
                <th>Upaya Advokasi Wali Kelas</th>
                <th>Rekomendasi & Solusi Guru BK</th>
                <th style="width: 65px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${logsToPrint.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; padding: 20px; color: #94a3b8;">Belum ada data rekaman jurnal bimbingan konseling.</td></tr>
              ` : logsToPrint.map((l, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="white-space: nowrap;">${l.date || "-"}</td>
                  <td style="font-weight: bold; color: #0f172a;">${l.studentName || "Siswa"}</td>
                  <td style="text-align: center; font-weight: bold;">${l.className || "-"}</td>
                  <td>${l.topic || "-"}</td>
                  <td>${l.actionPlan || "-"}</td>
                  <td>${l.bkFeedback ? `<b>[Solusi BK]:</b> ${l.bkFeedback}` : `<i>(Belum ada tanggapan BK)</i>`}</td>
                  <td style="text-align: center;">
                    ${l.bkFeedback ? `<span class="badge badge-resolved">Disaran BK</span>` : `<span class="badge badge-pending">Pending</span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="sig-title">Guru Bimbingan Konseling (BK)</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Guru Konselor BK )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Konselor Terdaftar</div>
            </div>
            <div>
              <div class="sig-title">Kepala Sekolah / Yayasan</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( ${schoolIdentity?.principal || "Kepala Sekolah"} )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Penanggung Jawab</div>
            </div>
          </div>

          <div class="footer-line">
            Dokumen resmi UPT Bimbingan & Konseling Sekolah. Dicetak otomatis oleh Sistem Manajemen Sekolah Integratif.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Student Individual Counseling Journal
  const handlePrintStudentLogs = (targetStudentIdentifier: string) => {
    if (!targetStudentIdentifier) {
      alert("Silakan pilih siswa terlebih dahulu.");
      return;
    }

    const cleanTerm = targetStudentIdentifier.trim().toLowerCase();
    
    const matchedStudent = allStudents.find(s => 
      s.id === targetStudentIdentifier || 
      (s.name && s.name.trim().toLowerCase() === cleanTerm) || 
      (s.nis && s.nis.trim().toLowerCase() === cleanTerm)
    );

    const studentName = matchedStudent ? matchedStudent.name : targetStudentIdentifier;
    const className = matchedStudent ? matchedStudent.class : "";
    const nisn = matchedStudent ? (matchedStudent.nisn || matchedStudent.nis || "-") : "-";

    const studentLogs = logs.filter(l => {
      if (!l) return false;
      const matchId = l.studentId && l.studentId === targetStudentIdentifier;
      const matchName = l.studentName && l.studentName.trim().toLowerCase() === cleanTerm;
      return matchId || matchName;
    });

    if (studentLogs.length === 0) {
      alert(`Tidak ditemukan catatan bimbingan konseling untuk siswa: ${studentName}`);
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak dokumen.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const subHeader = schoolIdentity?.subheading || "Penilaian Karakter, Bimbingan & Kebiasaan Positif";
    const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
    const address = schoolIdentity?.address || "Jl. Pandaan, Jawa Timur";
    const logoSrc = schoolIdentity?.logo || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Rekap Bimbingan BK - ${studentName}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Inter', system-ui, sans-serif; padding: 25px; color: #1e293b; background: white; line-height: 1.5; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #0f172a; margin-bottom: 20px; padding-bottom: 10px; }
            .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
            .info-cell { text-align: center; vertical-align: middle; }
            .school-name { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
            .school-sub { font-size: 11px; margin: 3px 0 0 0; color: #475569; font-weight: 600; }
            .school-meta { font-size: 9px; margin: 3px 0 0 0; color: #64748b; font-style: italic; }
            .title-doc { text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 20px 0 15px 0; letter-spacing: 0.5px; text-decoration: underline; }
            
            .student-card { width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            .student-card th { background: #f8fafc; padding: 8px 12px; text-align: left; border: 1px solid #cbd5e1; width: 25%; font-weight: bold; }
            .student-card td { padding: 8px 12px; border: 1px solid #cbd5e1; }

            .log-box { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; overflow: hidden; page-break-inside: avoid; }
            .log-header { background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; display: flex; justify-content: space-between; }
            .log-body { padding: 12px; font-size: 11px; }
            .log-row { margin-bottom: 8px; }
            .log-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px; }
            .log-val { margin: 0; color: #334155; line-height: 1.5; white-space: pre-wrap; }
            .bk-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 6px; margin-top: 8px; }

            .signatures { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; font-size: 11px; page-break-inside: avoid; }
            .sig-space { height: 65px; }
            .sig-title { font-weight: bold; margin-bottom: 5px; }
            .footer-line { border-top: 1px solid #cbd5e1; font-size: 8px; font-style: italic; text-align: center; color: #94a3b8; margin-top: 30px; padding-top: 8px; }
          </style>
        </head>
        <body>
          ${schoolIdentity?.letterhead ? `
            <div style="width: 100%; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
              <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block;" />
            </div>
          ` : `
            <table class="header-table">
              <tr>
                ${logoSrc ? `<td class="logo-cell"><img src="${logoSrc}" style="max-height: 55px; max-width: 55px;" /></td>` : ''}
                <td class="info-cell">
                  <div class="school-name">${schoolName}</div>
                  <div class="school-sub">${subHeader} - Akreditasi: ${accreditation}</div>
                  <div class="school-meta">Alamat: ${address}</div>
                </td>
              </tr>
            </table>
          `}

          <div class="title-doc">REKAPITULASI DOKUMEN BIMBINGAN & KONSELING INDIVIDUAL SISWA</div>

          <table class="student-card">
            <tr>
              <th>Nama Lengkap Siswa</th>
              <td style="font-weight: bold; font-size: 12px; color: #0f172a;">${studentName}</td>
              <th>Tingkat / Kelas</th>
              <td>Kelas ${className || (studentLogs[0] ? studentLogs[0].className : "-")}</td>
            </tr>
            <tr>
              <th>NIS / NISN</th>
              <td>${nisn}</td>
              <th>Total Sesi Bimbingan</th>
              <td style="font-weight: bold;">${studentLogs.length} Sesi Terdata</td>
            </tr>
          </table>

          <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 12px; text-transform: uppercase;">RIWAYAT PERTEMUAN & INTERVENSI BIMBINGAN BK:</div>

          ${studentLogs.map((l, idx) => `
            <div class="log-box">
              <div class="log-header">
                <span>Sesi ${idx + 1} - Tanggal: ${l.date || "-"} (Diinput Wali Kelas ${l.className})</span>
                <span>Status: ${l.bkFeedback ? "✓ Disaran BK" : "⏳ Menunggu Solusi"}</span>
              </div>
              <div class="log-body">
                <div class="log-row">
                  <span class="log-label">I. Topik / Kronologi Permasalahan:</span>
                  <p class="log-val">"${l.topic || "-"}"</p>
                </div>
                <div class="log-row">
                  <span class="log-label">II. Upaya Advokasi & Mediasi Wali Kelas:</span>
                  <p class="log-val">"${l.actionPlan || "-"}"</p>
                </div>
                <div class="log-row">
                  <span class="log-label">III. Komitmen Perubahan Perilaku Siswa:</span>
                  <p class="log-val">"${l.result || "-"}"</p>
                </div>
                ${l.bkFeedback ? `
                  <div class="bk-box">
                    <span class="log-label" style="color: #166534;">IV. Solusi, Catatan Profesional & Intervensi Guru BK:</span>
                    <p class="log-val" style="color: #14532d; font-weight: bold;">"${l.bkFeedback}"</p>
                    ${l.bkFeedbackAt ? `<span style="font-size: 8px; color: #166534; display: block; margin-top: 4px;">Waktu Respon: ${new Date(l.bkFeedbackAt).toLocaleString('id-ID')}</span>` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}

          <div class="signatures">
            <div>
              <div class="sig-title">Guru Bimbingan Konseling (BK)</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Guru Konselor BK )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Konselor Terdaftar</div>
            </div>
            <div>
              <div class="sig-title">Wali Kelas ${className || (studentLogs[0] ? studentLogs[0].className : "")}</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Wali Kelas )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Wali Kelas</div>
            </div>
          </div>

          <div class="footer-line">
            Dokumen Bimbingan Konseling bersifat rahasia dan terlindungi di bawah kode etik Guru BK. Dilarang menyebarluaskan tanpa persetujuan resmi.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // High-performance precomputed index maps for O(1) instant student lookups
  const studentLookup = useMemo(() => {
    const byId = new Map<string, { name: string; className: string }>();
    const byName = new Map<string, { name: string; className: string }>();

    // 1. Seed with master students
    const masterList = allStudents.length > 0 ? allStudents : students;
    masterList.forEach(st => {
      if (!st) return;
      const info = { name: st.name?.trim() || 'Siswa', className: st.class || '7-A' };
      if (st.id) {
        byId.set(st.id, info);
        byId.set(String(st.id).toLowerCase().trim(), info);
      }
      if (st.nis) {
        byId.set(String(st.nis).trim(), info);
        byId.set(String(st.nis).toLowerCase().trim(), info);
      }
      if (st.nisn) {
        byId.set(String(st.nisn).trim(), info);
        byId.set(String(st.nisn).toLowerCase().trim(), info);
      }
      if (st.name) {
        byName.set(st.name.trim().toLowerCase(), info);
      }
    });

    // 2. Also map non-standard student names from teaching journals without linear search
    teachingJournals.forEach(j => {
      if (Array.isArray(j.attendance)) {
        j.attendance.forEach((att: any) => {
          if (att?.studentName && !att.studentName.startsWith("Siswa (std-")) {
            const lower = att.studentName.trim().toLowerCase();
            if (!byName.has(lower)) {
              const info = { name: att.studentName.trim(), className: j.className || "7-A" };
              byName.set(lower, info);
              if (att.studentId) byId.set(att.studentId, info);
            }
          }
        });
      }
    });

    // 3. Map any counseling or infraction entries
    logs.forEach(l => {
      if (l.studentName && !l.studentName.startsWith("Siswa (std-")) {
        const lower = l.studentName.trim().toLowerCase();
        if (!byName.has(lower)) {
          const info = { name: l.studentName.trim(), className: l.className || "7-A" };
          byName.set(lower, info);
          if (l.studentId) byId.set(l.studentId, info);
        }
      }
    });

    infractions.forEach(i => {
      if (i.studentName && !i.studentName.startsWith("Siswa (std-")) {
        const lower = i.studentName.trim().toLowerCase();
        if (!byName.has(lower)) {
          const info = { name: i.studentName.trim(), className: i.className || "7-A" };
          byName.set(lower, info);
          if (i.studentId) byId.set(i.studentId, info);
        }
      }
    });

    return { byId, byName };
  }, [allStudents, students, teachingJournals, logs, infractions]);

  // Instant O(1) resolution of student name and class
  const getStudentInfo = (studentId: string, fallbackName?: string) => {
    if (!studentId && !fallbackName) return { name: "Siswa Tidak Dikenal", className: "-" };

    const cleanId = String(studentId || "").trim();
    const cleanFallback = String(fallbackName || "").trim();

    if (cleanId) {
      const found = studentLookup.byId.get(cleanId) || studentLookup.byId.get(cleanId.toLowerCase());
      if (found) return found;
    }
    if (cleanFallback) {
      const found = studentLookup.byName.get(cleanFallback.toLowerCase());
      if (found) return found;
    }

    return {
      name: (cleanFallback && !cleanFallback.startsWith("Siswa (std-")) ? cleanFallback : (cleanFallback || `Siswa (${studentId})`),
      className: "7-A"
    };
  };

  // Unified attendance list combining /api/attendance and teachingJournals attendance (O(1) deduping via Set)
  const allAttendance = useMemo(() => {
    const list: AttendanceLog[] = [...attendance];
    const seenStudentDate = new Set<string>();

    list.forEach(a => {
      if (a.studentId && a.date) seenStudentDate.add(`${a.studentId}_${a.date}`);
      if (a.studentName && a.date) seenStudentDate.add(`${a.studentName.toLowerCase().trim()}_${a.date}`);
    });

    const existingIds = new Set(list.map(a => a.id));

    teachingJournals.forEach(j => {
      if (Array.isArray(j.attendance)) {
        j.attendance.forEach((att: any, idx: number) => {
          const generatedId = att.id || `tj-att-${j.id}-${att.studentId || idx}`;
          if (existingIds.has(generatedId)) return;

          const idKey = att.studentId && j.date ? `${att.studentId}_${j.date}` : null;
          const nameKey = att.studentName && j.date ? `${att.studentName.toLowerCase().trim()}_${j.date}` : null;

          if ((idKey && seenStudentDate.has(idKey)) || (nameKey && seenStudentDate.has(nameKey))) {
            return;
          }

          if (idKey) seenStudentDate.add(idKey);
          if (nameKey) seenStudentDate.add(nameKey);
          existingIds.add(generatedId);

          list.push({
            id: generatedId,
            studentId: att.studentId || "",
            studentName: att.studentName || "",
            className: j.className || "",
            date: j.date || "",
            status: att.status || "Hadir",
            notes: att.notes || (j.subject ? `Jurnal Mapel: ${j.subject}` : ""),
            subjectNotes: []
          });
        });
      }
    });

    return list;
  }, [attendance, teachingJournals]);

  // Get distinct classes from available logs for filters
  const uniqueClasses = useMemo(() => {
    const list = new Set<string>();
    const masterList = allStudents.length > 0 ? allStudents : students;
    masterList.forEach(s => {
      const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
      const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
      if (!isMut && !isLulus && s.class) list.add(s.class);
    });
    logs.forEach(l => {
      if (l.className) list.add(l.className);
    });
    allAttendance.forEach(a => {
      if (a.className && a.className !== "-") list.add(a.className);
    });
    infractions.forEach(i => {
      if (i.className) list.add(i.className);
    });
    teachingJournals.forEach(j => {
      if (j.className) list.add(j.className);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' }));
  }, [allStudents, students, logs, allAttendance, infractions, teachingJournals]);

  // Extract unique subject teachers for BK Journal Monitoring
  const uniqueSubjectTeacherNames = useMemo(() => {
    const set = new Set<string>();
    teachingJournals.forEach(j => {
      if ((j.teacherType === 'subject_teacher' || !j.teacherType) && j.teacherName) {
        set.add(j.teacherName);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [teachingJournals]);

  // Extract unique homeroom teachers for BK Journal Monitoring
  const uniqueHomeroomTeacherList = useMemo(() => {
    const map = new Map<string, { name: string; className?: string; label: string }>();
    teachingJournals.forEach(j => {
      if (j.teacherType === 'homeroom' && j.teacherName) {
        if (!map.has(j.teacherName)) {
          const label = j.className ? `${j.teacherName} (Wali Kelas ${j.className})` : j.teacherName;
          map.set(j.teacherName, { name: j.teacherName, className: j.className, label });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachingJournals]);

  // Filtered Teaching Journals for BK Monitoring
  const filteredTeachingJournals = useMemo(() => {
    return teachingJournals.filter(j => {
      // Teacher Type Filter
      if (journalTeacherTypeFilter === 'subject' && j.teacherType === 'homeroom') return false;
      if (journalTeacherTypeFilter === 'homeroom' && j.teacherType !== 'homeroom') return false;

      // Subject Teacher Filter
      if (selectedSubjectTeacherFilter !== 'all' && j.teacherName !== selectedSubjectTeacherFilter) return false;

      // Homeroom Teacher Filter
      if (selectedHomeroomTeacherFilter !== 'all' && j.teacherName !== selectedHomeroomTeacherFilter) return false;

      // Class Filter
      if (classFilter !== 'all' && j.className !== classFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTopic = (j.topic || '').toLowerCase().includes(q);
        const matchTeacher = (j.teacherName || '').toLowerCase().includes(q);
        const matchSubject = (j.subject || '').toLowerCase().includes(q);
        const matchNotes = (j.notes || '').toLowerCase().includes(q);
        const matchClass = (j.className || '').toLowerCase().includes(q);
        if (!matchTopic && !matchTeacher && !matchSubject && !matchNotes && !matchClass) return false;
      }

      // Date Range Filter
      if (journalStartDate || journalEndDate) {
        const d = j.date ? j.date.substring(0, 10) : "";
        if (journalStartDate && d < journalStartDate) return false;
        if (journalEndDate && d > journalEndDate) return false;
      }

      return true;
    });
  }, [
    teachingJournals, 
    journalTeacherTypeFilter, 
    selectedSubjectTeacherFilter, 
    selectedHomeroomTeacherFilter, 
    classFilter, 
    searchQuery, 
    journalStartDate, 
    journalEndDate
  ]);

  // Aggregate Attendance states grouping per student (Optimized O(1) Map matching)
  const aggregatedAttendance = useMemo(() => {
    const studentMap: { [key: string]: { id: string; name: string; className: string; hadir: number; sakit: number; izin: number; alpa: number; terlambat: number; total: number } } = {};

    // 1. Seed with all active master students
    const masterList = allStudents.length > 0 ? allStudents : students;
    masterList.forEach(st => {
      const isMut = !!st.mutationDate || (st.class && (st.class.toLowerCase() === 'mutasi' || st.class.toLowerCase() === 'mutasi keluar'));
      const isLulus = st.class && (st.class.toLowerCase() === 'lulus' || st.class.toLowerCase() === 'lulusan');
      if (isMut || isLulus) return;

      studentMap[st.id] = {
        id: st.id,
        name: st.name,
        className: st.class || "7-A",
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        terlambat: 0,
        total: 0
      };
    });

    // 2. Process all attendance records via O(1) studentLookup
    allAttendance.forEach(log => {
      if (attendanceStartDate || attendanceEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (attendanceStartDate && d < attendanceStartDate) return;
        if (attendanceEndDate && d > attendanceEndDate) return;
      }

      let key = log.studentId;
      if (!key || !studentMap[key]) {
        if (log.studentName) {
          const match = studentLookup.byName.get(log.studentName.trim().toLowerCase());
          if (match) {
            const stId = (masterList.find(s => s.name?.trim().toLowerCase() === log.studentName?.trim().toLowerCase()))?.id;
            if (stId && studentMap[stId]) {
              key = stId;
            }
          }
        }
      }

      if (!key || !studentMap[key]) {
        const info = getStudentInfo(log.studentId, log.studentName);
        const fallbackKey = log.studentId || (log.studentName ? `name-${log.studentName.trim().toLowerCase()}` : `std-unmapped-${Math.random()}`);
        if (!studentMap[fallbackKey]) {
          studentMap[fallbackKey] = {
            id: log.studentId || fallbackKey,
            name: info.name,
            className: info.className,
            hadir: 0,
            sakit: 0,
            izin: 0,
            alpa: 0,
            terlambat: 0,
            total: 0
          };
        }
        key = fallbackKey;
      }

      const status = log.status;
      if (status === 'Hadir') studentMap[key].hadir++;
      else if (status === 'Sakit') studentMap[key].sakit++;
      else if (status === 'Izin') studentMap[key].izin++;
      else if (status === 'Alpa') studentMap[key].alpa++;
      else if (status === 'Terlambat') studentMap[key].terlambat++;

      studentMap[key].total++;
    });

    return Object.values(studentMap);
  }, [allStudents, students, allAttendance, attendanceStartDate, attendanceEndDate, studentLookup]);

  // Aggregate Infractions (Leaderboard points)
  const aggregatedInfractions = useMemo(() => {
    const map: { [key: string]: { id: string; name: string; className: string; points: number; count: number; list: StudentInfractionLog[] } } = {};

    effectiveInfractions.forEach(log => {
      if (infractionStartDate || infractionEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (infractionStartDate && d < infractionStartDate) return;
        if (infractionEndDate && d > infractionEndDate) return;
      }

      const key = `${log.studentId}`;
      if (!map[key]) {
        map[key] = {
          id: log.studentId,
          name: log.studentName,
          className: log.className,
          points: 0,
          count: 0,
          list: []
        };
      }
      map[key].points = Number((map[key].points + (Number(log.points) || 0)).toFixed(2));
      if ((Number(log.points) || 0) > 0) {
        map[key].count++;
      }
      map[key].list.push(log);
    });

    Object.values(map).forEach(st => {
      if (st.points < 0) st.points = 0;
      st.list = sortInfractionRulesClient(st.list);
    });

    return Object.values(map).sort((a, b) => b.points - a.points);
  }, [effectiveInfractions, infractionStartDate, infractionEndDate]);

  // Warn Interventions: Students with high infractions (>10 pts) or High Alpa (>= 2 alpa)
  // Smart Radar Filtering: Optimized with pre-indexed Map lookups
  const interventionStudents = useMemo(() => {
    const candidateMap: { [key: string]: { id: string; name: string; className: string; alpaCount: number; infractionPoints: number; reason: string } } = {};

    // Check high infractions
    aggregatedInfractions.forEach(st => {
      if (st.points >= 15) {
        candidateMap[st.id] = {
          id: st.id,
          name: st.name,
          className: st.className,
          alpaCount: 0,
          infractionPoints: st.points,
          reason: `Poin pelanggaran kumulatif sangat tinggi (${st.points} poin). Butuh konseling moral bimbingan.`
        };
      }
    });

    // Check high alpa
    aggregatedAttendance.forEach(att => {
      if (att.alpa >= 2) {
        if (!candidateMap[att.id]) {
          candidateMap[att.id] = {
            id: att.id,
            name: att.name,
            className: att.className,
            alpaCount: att.alpa,
            infractionPoints: 0,
            reason: `Sering absen tanpa keterangan (${att.alpa} hari Alpa). Indikasi masalah pribadi.`
          };
        } else {
          candidateMap[att.id].alpaCount = att.alpa;
          candidateMap[att.id].reason = `Memiliki catatan ${att.alpa} hari Alpa & ${candidateMap[att.id].infractionPoints} poin pelanggaran disiplin. Urgen pembinaan keluarga!`;
        }
      }
    });

    const candidates = Object.values(candidateMap);
    if (candidates.length === 0) return [];

    // Pre-index latest counseling date by student (O(N))
    const latestCounselingByStudent = new Map<string, string>();
    logs.forEach(l => {
      const dateStr = (l.date || l.createdAt || "").substring(0, 10);
      if (!dateStr) return;
      if (l.studentId) {
        const cur = latestCounselingByStudent.get(l.studentId);
        if (!cur || dateStr > cur) latestCounselingByStudent.set(l.studentId, dateStr);
      }
      if (l.studentName) {
        const lower = l.studentName.trim().toLowerCase();
        const cur = latestCounselingByStudent.get(lower);
        if (!cur || dateStr > cur) latestCounselingByStudent.set(lower, dateStr);
      }
    });

    // Pre-index Alpa attendance dates by student (O(N))
    const alpasByStudent = new Map<string, string[]>();
    allAttendance.forEach(att => {
      if (att.status !== 'Alpa') return;
      const d = (att.date || "").substring(0, 10);
      if (!d) return;
      if (att.studentId) {
        let arr = alpasByStudent.get(att.studentId);
        if (!arr) { arr = []; alpasByStudent.set(att.studentId, arr); }
        arr.push(d);
      }
      if (att.studentName) {
        const lower = att.studentName.trim().toLowerCase();
        let arr = alpasByStudent.get(lower);
        if (!arr) { arr = []; alpasByStudent.set(lower, arr); }
        arr.push(d);
      }
    });

    const resultList: typeof candidates = [];

    candidates.forEach(st => {
      const sId = st.id;
      const sName = st.name;
      const sLowerName = sName ? sName.trim().toLowerCase() : '';

      const latestCounselingDate = (sId && latestCounselingByStudent.get(sId)) || (sLowerName && latestCounselingByStudent.get(sLowerName));

      if (latestCounselingDate) {
        const studentAlpas = (sId && alpasByStudent.get(sId)) || (sLowerName && alpasByStudent.get(sLowerName)) || [];
        const newAlpaCount = studentAlpas.filter(d => d > latestCounselingDate).length;

        if (newAlpaCount >= 2) {
          resultList.push({
            ...st,
            alpaCount: newAlpaCount,
            reason: `⚠️ Siswa kembali ALPA ${newAlpaCount} kali setelah Sesi Bimbingan BK terakhir (${latestCounselingDate}). Urgen dilakukan bimbingan ulang!`
          });
        }
      } else {
        const isInitiated = initiatedStudentIds.includes(sId) || (sName && initiatedStudentIds.includes(sName));
        if (!isInitiated) {
          resultList.push(st);
        }
      }
    });

    return resultList;
  }, [aggregatedAttendance, aggregatedInfractions, logs, allAttendance, initiatedStudentIds]);

  // Counseling list filters mapping
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log || typeof log !== 'object' || !log.studentName) return false;
      const sName = log.studentName || '';
      const sTopic = log.topic || '';
      const sClass = log.className || '';
      const searchMatch = 
        sName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        sTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sClass.toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch = 
        statusFilter === 'all' ? true :
        statusFilter === 'pending' ? !log.bkFeedback : !!log.bkFeedback;

      const classMatch = 
        classFilter === "all" ? true : log.className === classFilter;

      return searchMatch && statusMatch && classMatch;
    });
  }, [logs, searchQuery, statusFilter, classFilter]);

  // Attendance filter mapping
  const filteredAttendanceDiary = useMemo(() => {
    return allAttendance.filter(log => {
      const info = getStudentInfo(log.studentId, log.studentName);
      const name = info.name;
      const cName = info.className || log.className || "7-A";

      const searchMatch = 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cName.toLowerCase().includes(searchQuery.toLowerCase());

      const classMatch = 
        classFilter === "all" ? true : cName === classFilter;

      // Filter by status H S I A T
      const statusMatch = 
        attendanceStatusFilter === 'all' ? true : log.status === attendanceStatusFilter;

      // Filter by date range if provided
      if (attendanceStartDate || attendanceEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (attendanceStartDate && d < attendanceStartDate) return false;
        if (attendanceEndDate && d > attendanceEndDate) return false;
      }

      return searchMatch && classMatch && statusMatch;
    });
  }, [allAttendance, searchQuery, classFilter, attendanceStatusFilter, attendanceStartDate, attendanceEndDate]);

  const filteredAttendanceAggregate = useMemo(() => {
    const filtered = aggregatedAttendance.filter(st => {
      const searchMatch = st.name.toLowerCase().includes(searchQuery.toLowerCase());
      const classMatch = classFilter === "all" ? true : st.className === classFilter;

      let statusMatch = true;
      if (attendanceStatusFilter === 'Hadir') statusMatch = st.hadir > 0;
      else if (attendanceStatusFilter === 'Sakit') statusMatch = st.sakit > 0;
      else if (attendanceStatusFilter === 'Izin') statusMatch = st.izin > 0;
      else if (attendanceStatusFilter === 'Alpa') statusMatch = st.alpa > 0;
      else if (attendanceStatusFilter === 'Terlambat') statusMatch = st.terlambat > 0;

      return searchMatch && classMatch && statusMatch;
    });

    return [...filtered].sort((a, b) => {
      const compareClasses = (clsA: string = '', clsB: string = '') => {
        return clsA.localeCompare(clsB, 'id', { numeric: true, sensitivity: 'base' });
      };

      if (attendanceSortBy === 'name') {
        const classComp = compareClasses(a.className, b.className);
        if (classComp !== 0) {
          return attendanceSortOrder === 'asc' ? classComp : -classComp;
        }
        return attendanceSortOrder === 'asc'
          ? a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
          : b.name.localeCompare(a.name, 'id', { sensitivity: 'base' });
      }
      if (attendanceSortBy === 'class') {
        const classComp = compareClasses(a.className, b.className);
        if (classComp !== 0) {
          return attendanceSortOrder === 'asc' ? classComp : -classComp;
        }
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
      }

      let valA = 0;
      let valB = 0;

      if (attendanceSortBy === 'rate') {
        valA = a.total > 0 ? (a.hadir / a.total) * 100 : 0;
        valB = b.total > 0 ? (b.hadir / b.total) * 100 : 0;
      } else {
        valA = (a as any)[attendanceSortBy] || 0;
        valB = (b as any)[attendanceSortBy] || 0;
      }

      if (valA === valB) {
        const classComp = compareClasses(a.className, b.className);
        if (classComp !== 0) return classComp;
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
      }

      return attendanceSortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [aggregatedAttendance, searchQuery, classFilter, attendanceStatusFilter, attendanceSortBy, attendanceSortOrder]);

  // Infractions filter mapping
  const filteredInfractionsList = useMemo(() => {
    return effectiveInfractions.filter(log => {
      const searchMatch = 
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.infractionType.toLowerCase().includes(searchQuery.toLowerCase());

      const classMatch = 
        classFilter === "all" ? true : log.className === classFilter;

      // Filter by date range if provided
      if (infractionStartDate || infractionEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (infractionStartDate && d < infractionStartDate) return false;
        if (infractionEndDate && d > infractionEndDate) return false;
      }

      return searchMatch && classMatch;
    });
  }, [effectiveInfractions, searchQuery, classFilter, infractionStartDate, infractionEndDate]);

  const filteredInfractionsAggregate = useMemo(() => {
    return aggregatedInfractions.filter(st => {
      const searchMatch = st.name.toLowerCase().includes(searchQuery.toLowerCase());
      const classMatch = classFilter === "all" ? true : st.className === classFilter;
      return searchMatch && classMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [aggregatedInfractions, searchQuery, classFilter]);

  // Paginated slices to keep browser rendering lightweight and instantaneous
  const paginatedAttendanceAggregate = useMemo(() => {
    const start = (attendanceAggregatePage - 1) * attendanceAggregatePageSize;
    return filteredAttendanceAggregate.slice(start, start + attendanceAggregatePageSize);
  }, [filteredAttendanceAggregate, attendanceAggregatePage, attendanceAggregatePageSize]);

  const paginatedAttendanceDiary = useMemo(() => {
    const start = (attendanceDiaryPage - 1) * attendanceDiaryPageSize;
    return filteredAttendanceDiary.slice(start, start + attendanceDiaryPageSize);
  }, [filteredAttendanceDiary, attendanceDiaryPage, attendanceDiaryPageSize]);

  const paginatedTeachingJournals = useMemo(() => {
    const start = (journalsPage - 1) * journalsPageSize;
    return filteredTeachingJournals.slice(start, start + journalsPageSize);
  }, [filteredTeachingJournals, journalsPage, journalsPageSize]);

  const paginatedInfractionsList = useMemo(() => {
    const start = (infractionPage - 1) * infractionPageSize;
    return filteredInfractionsList.slice(start, start + infractionPageSize);
  }, [filteredInfractionsList, infractionPage, infractionPageSize]);

  const paginatedLogs = useMemo(() => {
    const start = (counselingPage - 1) * counselingPageSize;
    return filteredLogs.slice(start, start + counselingPageSize);
  }, [filteredLogs, counselingPage, counselingPageSize]);

  // Trigger quick counseling creation (to draft and save a new counseling log)
  const handleInitiateCounseling = (studentName: string, className: string, problemReason: string) => {
    const match = allStudents.find(s => s.name.trim().toLowerCase() === studentName.trim().toLowerCase());
    const targetId = match ? match.id : studentName;

    if (targetId) {
      setInitiatedStudentIds(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
    }

    if (match) {
      setDraftStudentId(match.id);
      setDraftStudentNisn(match.nisn || match.nis || '');
    } else {
      setDraftStudentId('');
      setDraftStudentNisn('');
    }
    setDraftStudentName(studentName);
    setDraftClassName(className);
    setDraftReason(`Hasil pantauan BK: Siswa mengalami ${problemReason}`);
    setDraftSuccess(false);
    setActiveTab('counseling');
    setSelectedLogId("draft_new");
  };

  const submitDraftCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      let targetId = draftStudentId;
      let targetNisn = draftStudentNisn;
      if (!targetId && draftStudentName) {
        const match = allStudents.find(s => s.name.trim().toLowerCase() === draftStudentName.trim().toLowerCase());
        if (match) {
          targetId = match.id;
          targetNisn = match.nisn || match.nis || '';
        }
      }

      const response = await fetch("/api/student-counseling-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: targetId || `ST-${Math.floor(Math.random() * 90000) + 10000}`,
          studentName: draftStudentName,
          studentNisn: targetNisn,
          className: draftClassName,
          date: new Date().toISOString().split('T')[0],
          topic: draftReason,
          actionPlan: "Dipanggil langsung ke ruang BK oleh Guru Bimbingan Konseling.",
          result: "Siswa telah diberikan layanan bimbingan konseling solutif.",
          bkFeedback: "Telah diberikan motivasi dan penanganan konseling terpadu oleh Guru BK."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const createdLog = data.newLog || (data.studentName ? data : null);
        if (createdLog) {
          setLogs(prev => [createdLog, ...prev.filter(l => l && l.id !== createdLog.id)]);
        } else if (Array.isArray(data.studentCounselingLogs)) {
          setLogs(data.studentCounselingLogs);
        }
        setSelectedLogId(null);
        setSuccessMsg(`Berhasil menjadwalkan dan mencatat bimbingan BK untuk ${draftStudentName}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        alert("Gagal menyimpan rekam bimbingan mandiri.");
      }
    } catch (e) {
      console.error(e);
      alert("Masalah komunikasi server.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Delete an infraction log 
  const handleDeleteInfraction = async (id: string) => {
    if (!window.confirm("Beneran ingin menghapus rekam pelanggaran siswa ini?")) return;
    try {
      const res = await fetch(`/api/student-infraction-logs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInfractions(prev => prev.filter(i => i.id !== id));
        setSuccessMsg("Berhasil menghapus rekam pelanggaran.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Statistics counters
  const stats = useMemo(() => {
    const totalC = logs.length;
    const resolvedC = logs.filter(l => !!l.bkFeedback).length;
    const pendingC = totalC - resolvedC;

    // Attendance stats of today / overall
    const totalAbsences = attendance.filter(a => a.status !== 'Hadir').length;
    const totalAlpa = attendance.filter(a => a.status === 'Alpa').length;

    // Infractions stats
    const totalI = infractions.length;
    const unresolvedI = infractions.filter(inf => inf.resolutionStatus !== 'Selesai').length;

    return { totalC, resolvedC, pendingC, totalAbsences, totalAlpa, totalI, unresolvedI };
  }, [logs, attendance, infractions]);

  // ================= EXCEL EXPORTS (Direct .xls creation matching Homeroom styles) =================
  const downloadExcelCounseling = () => {
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
        <x:Name>Riwayat Bimbingan BK</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; }
  .title { font-size: 14pt; font-weight: bold; color: #4f46e5; }
  .school { font-size: 11pt; font-weight: bold; color: #334155; }
  .table-header { background-color: #f1f5f9; font-weight: bold; text-align: center; border: 1.5pt solid #cbd5e1; height: 30px; }
  .cell { border: 0.5pt solid #cbd5e1; padding: 6px; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="7" class="title">REKAPITULASI RIWAYAT JURNAL BIMBINGAN & KONSELING (BK)</td></tr>
    <tr><td colspan="7" class="school">${schoolNameUpper}</td></tr>
    <tr><td colspan="7">Tanggal Penarikan Data: ${new Date().toLocaleDateString('id-ID')}</td></tr>
    <tr></tr>
    <tr>
      <td class="table-header">No</td>
      <td class="table-header">Tangal Bimbingan</td>
      <td class="table-header">Nama Siswa</td>
      <td class="table-header">Kelas</td>
      <td class="table-header">Topik &amp; Kasus Masalah</td>
      <td class="table-header">Rencana Tindakan (Wali Kelas)</td>
      <td class="table-header">Saran, Solusi &amp; Intervensi Guru BK</td>
    </tr>
`;

    filteredLogs.forEach((l, index) => {
      excelHtml += `
    <tr>
      <td class="cell text-center">${index + 1}</td>
      <td class="cell text-center">${l.date}</td>
      <td class="cell text-left" style="font-weight:bold;">${l.studentName}</td>
      <td class="cell text-center" style="font-weight:bold; color:#4f46e5;">${l.className}</td>
      <td class="cell text-left">${l.topic}</td>
      <td class="cell text-left">${l.actionPlan}</td>
      <td class="cell text-left" style="background-color:#f0fdf4; color:#166534; font-weight:550;">${l.bkFeedback || "Belum ada rekomendasi solusi Guru BK"}</td>
    </tr>
`;
    });

    excelHtml += `
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `REKAP_BIMBINGAN_BK_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelAttendance = () => {
    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();
    const periodStr = `Periode: ${attendanceStartDate ? attendanceStartDate : 'Awal'} s.d ${attendanceEndDate ? attendanceEndDate : 'Akhir'}`;
    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Rekap Presensi BK</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; }
  .title { font-size: 14.5pt; font-weight: bold; color: #10b981; }
  .table-header { background-color: #f1f5f9; font-weight: bold; text-align: center; border: 1.5pt solid #cbd5e1; height: 28px; }
  .cell { border: 0.5pt solid #cbd5e1; padding: 5px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="9" class="title">REKAPITULASI PRESENSI KETIDAKHADIRAN MAJEMUK SISWA</td></tr>
    <tr><td colspan="9" style="font-weight:bold;">${schoolNameUpper} - PORTAL BK</td></tr>
    <tr><td colspan="9" style="color:#475569; font-style:italic;">${periodStr}</td></tr>
    <tr></tr>
    <tr>
      <td class="table-header">No</td>
      <td class="table-header">Nama Siswa</td>
      <td class="table-header">Kelas</td>
      <td class="table-header" style="background:#ecfdf5;color:#047857;">Hadir (H)</td>
      <td class="table-header" style="background:#eff6ff;color:#1d4ed8;">Sakit (S)</td>
      <td class="table-header" style="background:#fef9c3;color:#a16207;">Izin (I)</td>
      <td class="table-header" style="background:#fef2f2;color:#b91c1c;">Alpa (A)</td>
      <td class="table-header" style="background:#faf5ff;color:#6b21a8;">Terlambat (T)</td>
      <td class="table-header">Presentase Hadir</td>
    </tr>
`;

    filteredAttendanceAggregate.forEach((st, index) => {
      const parentHasRecord = st.total > 0;
      const rate = parentHasRecord ? Math.round((st.hadir / st.total) * 100) : 0;
      excelHtml += `
    <tr>
      <td class="cell text-center">${index + 1}</td>
      <td class="cell text-left" style="font-weight:bold;">${st.name}</td>
      <td class="cell text-center" style="font-weight:bold;">Kelas ${st.className}</td>
      <td class="cell text-center" style="color:#047857; font-weight:bold;">${st.hadir}</td>
      <td class="cell text-center" style="color:#1d4ed8;">${st.sakit}</td>
      <td class="cell text-center" style="color:#a16207;">${st.izin}</td>
      <td class="cell text-center" style="color:#b91c1c; font-weight:bold; background:#fef2f2;">${st.alpa}</td>
      <td class="cell text-center" style="color:#6b21a8;">${st.terlambat}</td>
      <td class="cell text-center" style="font-weight:black; color:#10b981;">${rate}%</td>
    </tr>
`;
    });

    excelHtml += `
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const startFilename = attendanceStartDate || "AWAL";
    const endFilename = attendanceEndDate || "AKHIR";
    link.download = `REKAP_PRESENSI_SISWA_BK_${startFilename}_TO_${endFilename}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdfAttendance = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak dokumen.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const subHeader = schoolIdentity?.subheading || "Penilaian Karakter, Bimbingan & Kebiasaan Positif";
    const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
    const address = schoolIdentity?.address || "Jl. Pandaan, Jawa Timur";
    const logoSrc = schoolIdentity?.logo || "";
    const principalName = schoolIdentity?.principal || "Kepala Sekolah";

    const periodStr = attendanceStartDate && attendanceEndDate
      ? `${new Date(attendanceStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s.d ${new Date(attendanceEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : (attendanceStartDate ? `Mulai ${new Date(attendanceStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : "Semua Periode Tanggal");

    const filterClassStr = classFilter === "all" ? "Semua Kelas" : `Kelas ${classFilter}`;
    const filterStatusStr = attendanceStatusFilter === "all" ? "Semua Status (H, S, I, A, T)" : `Status: ${attendanceStatusFilter}`;

    const isAggregate = attendanceSubTab === 'aggregate';

    let totalRecords = 0;
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalTerlambat = 0;

    if (isAggregate) {
      totalRecords = filteredAttendanceAggregate.length;
      filteredAttendanceAggregate.forEach(s => {
        totalHadir += s.hadir;
        totalSakit += s.sakit;
        totalIzin += s.izin;
        totalAlpa += s.alpa;
        totalTerlambat += s.terlambat;
      });
    } else {
      totalRecords = filteredAttendanceDiary.length;
      filteredAttendanceDiary.forEach(a => {
        if (a.status === 'Hadir') totalHadir++;
        else if (a.status === 'Sakit') totalSakit++;
        else if (a.status === 'Izin') totalIzin++;
        else if (a.status === 'Alpa') totalAlpa++;
        else if (a.status === 'Terlambat') totalTerlambat++;
      });
    }

    let tableRowsHtml = "";

    if (isAggregate) {
      tableRowsHtml = filteredAttendanceAggregate.map((st, idx) => {
        const rate = st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0;
        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: bold; text-align: left;">${st.name}</td>
            <td style="text-align: center;">Kelas ${st.className}</td>
            <td style="text-align: center; color: #047857; font-weight: bold;">${st.hadir}</td>
            <td style="text-align: center; color: #1d4ed8;">${st.sakit}</td>
            <td style="text-align: center; color: #a16207;">${st.izin}</td>
            <td style="text-align: center; color: #b91c1c; font-weight: bold; ${st.alpa > 0 ? 'background-color: #fef2f2;' : ''}">${st.alpa}</td>
            <td style="text-align: center; color: #6b21a8;">${st.terlambat}</td>
            <td style="text-align: center; font-weight: bold; color: #059669;">${rate}%</td>
          </tr>
        `;
      }).join("");
    } else {
      tableRowsHtml = filteredAttendanceDiary.map((a, idx) => {
        const info = getStudentInfo(a.studentId, a.studentName);
        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="text-align: center; font-family: monospace;">${a.date}</td>
            <td style="font-weight: bold; text-align: left;">${info.name}</td>
            <td style="text-align: center;">Kelas ${info.className || a.className || '-'}</td>
            <td style="text-align: center; font-weight: bold; ${
              a.status === 'Alpa' ? 'color: #dc2626; background-color: #fef2f2;' :
              a.status === 'Hadir' ? 'color: #16a34a;' :
              a.status === 'Sakit' ? 'color: #2563eb;' :
              a.status === 'Izin' ? 'color: #d97706;' : 'color: #9333ea;'
            }">${a.status}</td>
            <td style="text-align: left; font-size: 10px;">${a.notes || '-'}</td>
          </tr>
        `;
      }).join("");
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Rekap Presensi BK - ${schoolName}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; color: #0f172a; background: white; line-height: 1.4; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #0f172a; margin-bottom: 15px; padding-bottom: 8px; }
            .logo-cell { width: 65px; text-align: center; vertical-align: middle; }
            .info-cell { text-align: center; vertical-align: middle; }
            .school-name { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
            .school-sub { font-size: 11px; margin: 3px 0 0 0; color: #334155; font-weight: 600; }
            .school-meta { font-size: 9px; margin: 2px 0 0 0; color: #64748b; font-style: italic; }
            .doc-title { text-align: center; font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 15px 0 5px 0; letter-spacing: 0.5px; color: #047857; }
            .doc-subtitle { text-align: center; font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 15px; }
            
            .summary-cards { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 15px; }
            .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; text-align: center; background: #f8fafc; }
            .card-val { font-size: 13px; font-weight: 800; margin-top: 2px; }
            .card-lbl { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }

            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; }
            .data-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; color: #0f172a; }
            .data-table tr:nth-child(even) { background-color: #f8fafc; }

            .signatures { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; font-size: 10px; }
            .sig-block { width: 200px; }
            .sig-space { height: 60px; }
            .sig-name { font-weight: bold; text-decoration: underline; }
            
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${schoolIdentity?.letterhead ? `
            <div style="width: 100%; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
              <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block;" />
            </div>
          ` : `
            <table class="header-table">
              <tr>
                ${logoSrc ? `<td class="logo-cell"><img src="${logoSrc}" style="max-height: 55px; max-width: 55px;" /></td>` : ''}
                <td class="info-cell">
                  <div class="school-name">${schoolName}</div>
                  <div class="school-sub">${subHeader} &bull; Akreditasi: ${accreditation}</div>
                  <div class="school-meta">Alamat: ${address}</div>
                </td>
              </tr>
            </table>
          `}

          <div class="doc-title">LAPORAN REKAPITULASI PRESENSI &amp; KETIDAKHADIRAN SISWA (BK)</div>
          <div class="doc-subtitle">
            Tampilan: ${isAggregate ? 'Akumulasi Status Presensi per Siswa' : 'Riwayat Harian Jurnal Presensi'} &bull; Filter: ${filterClassStr} &bull; ${filterStatusStr} &bull; Periode: ${periodStr}
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-lbl">Total Record</div>
              <div class="card-val" style="color: #0f172a;">${totalRecords}</div>
            </div>
            <div class="card" style="background-color: #ecfdf5; border-color: #a7f3d0;">
              <div class="card-lbl" style="color: #047857;">Hadir (H)</div>
              <div class="card-val" style="color: #047857;">${totalHadir}</div>
            </div>
            <div class="card" style="background-color: #eff6ff; border-color: #bfdbfe;">
              <div class="card-lbl" style="color: #1d4ed8;">Sakit (S)</div>
              <div class="card-val" style="color: #1d4ed8;">${totalSakit}</div>
            </div>
            <div class="card" style="background-color: #fef9c3; border-color: #fde047;">
              <div class="card-lbl" style="color: #a16207;">Izin (I)</div>
              <div class="card-val" style="color: #a16207;">${totalIzin}</div>
            </div>
            <div class="card" style="background-color: #fef2f2; border-color: #fecaca;">
              <div class="card-lbl" style="color: #b91c1c;">Alpa (A)</div>
              <div class="card-val" style="color: #b91c1c;">${totalAlpa}</div>
            </div>
            <div class="card" style="background-color: #faf5ff; border-color: #e9d5ff;">
              <div class="card-lbl" style="color: #6b21a8;">Terlambat (T)</div>
              <div class="card-val" style="color: #6b21a8;">${totalTerlambat}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              ${isAggregate ? `
                <tr>
                  <th style="width: 30px;">No</th>
                  <th>Nama Siswa</th>
                  <th style="width: 60px;">Kelas</th>
                  <th style="width: 50px; background-color: #d1fae5; color: #065f46;">Hadir</th>
                  <th style="width: 50px; background-color: #dbeafe; color: #1e40af;">Sakit</th>
                  <th style="width: 50px; background-color: #fef3c7; color: #92400e;">Izin</th>
                  <th style="width: 50px; background-color: #fee2e2; color: #991b1b;">Alpa</th>
                  <th style="width: 50px; background-color: #f3e8ff; color: #6b21a8;">Terlambat</th>
                  <th style="width: 55px;">Rasio (%)</th>
                </tr>
              ` : `
                <tr>
                  <th style="width: 30px;">No</th>
                  <th style="width: 80px;">Tanggal</th>
                  <th>Nama Siswa</th>
                  <th style="width: 60px;">Kelas</th>
                  <th style="width: 70px;">Status</th>
                  <th>Catatan Keterangan</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${tableRowsHtml || `<tr><td colspan="${isAggregate ? 9 : 6}" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Tidak ada data presensi siswa yang sesuai filter.</td></tr>`}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-block">
              <div>Mengetahui,</div>
              <div style="font-weight: bold; margin-top: 2px;">Guru Bimbingan Konseling (BK)</div>
              <div class="sig-space"></div>
              <div class="sig-name">( Tim Konselor BK )</div>
              <div style="font-size: 8px; color: #64748b;">NIP. Guru Bimbingan Konseling</div>
            </div>
            <div class="sig-block">
              <div>Pandaan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div style="font-weight: bold; margin-top: 2px;">Kepala Sekolah</div>
              <div class="sig-space"></div>
              <div class="sig-name">( ${principalName} )</div>
              <div style="font-size: 8px; color: #64748b;">NIP. Penanggung Jawab Lembaga</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadExcelInfractions = () => {
    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();
    const periodStr = `Periode: ${infractionStartDate ? infractionStartDate : 'Awal'} s.d ${infractionEndDate ? infractionEndDate : 'Akhir'}`;
    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Poin Pelanggaran Siswa</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; }
  .title { font-size: 14pt; font-weight: bold; color: #e11d48; }
  .table-header { background-color: #f1f5f9; font-weight: bold; text-align: center; border: 1.5pt solid #cbd5e1; height: 30px; }
  .cell { border: 0.5pt solid #cbd5e1; padding: 5px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="6" class="title">REKAPITULASI RIWAYAT POIN PELANGGARAN DISIPLIN SISWA</td></tr>
    <tr><td colspan="6" style="font-weight:bold;">${schoolNameUpper} - RUANG GURU BK</td></tr>
    <tr><td colspan="6" style="color:#475569; font-style:italic;">${periodStr}</td></tr>
    <tr></tr>
    <tr>
      <td class="table-header">No</td>
      <td class="table-header">Nama Siswa</td>
      <td class="table-header">Kelas</td>
      <td class="table-header">Jumlah Kasus Pelanggaran</td>
      <td class="table-header">Total Poin Akumulasi</td>
      <td class="table-header">Status Penanganan Terakhir</td>
    </tr>
`;

    filteredInfractionsAggregate.forEach((st, index) => {
      excelHtml += `
    <tr>
      <td class="cell text-center">${index + 1}</td>
      <td class="cell text-left" style="font-weight:bold;">${st.name}</td>
      <td class="cell text-center" style="font-weight:bold;">Kelas ${st.className}</td>
      <td class="cell text-center">${st.count} Kali</td>
      <td class="cell text-center" style="color:#e11d48; font-weight:bold; background:#faf5ff;">${st.points} Poin</td>
      <td class="cell text-center">${st.points >= 15 ? '⚠️ Butuh Panggilan Khusus' : 'Biasa'}</td>
    </tr>
`;
    });

    excelHtml += `
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const startFilename = infractionStartDate || "AWAL";
    const endFilename = infractionEndDate || "AKHIR";
    link.download = `REKAP_PELANGGARAN_POIN_BK_${startFilename}_TO_${endFilename}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6" id="counselor-panel-root">
      
      {/* ================= DESKTOP HEADER (Selaras & Responsif) ================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 hidden sm:block">
            <Brain size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-[9px] uppercase tracking-wider">
              👥 GURU BK / KONSELOR SEKOLAH
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
              Portal Terpadu Bimbingan Konseling
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Sinergi bimbingan siswa, rekap presensi alpa, dan pantauan poin pelanggaran disiplin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={() => {
              setShowPasswordTab(!showPasswordTab);
              setShowMoreMenu(false);
            }}
            className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border shadow-2xs ${
              showPasswordTab 
                ? "bg-slate-800 text-white border-slate-900" 
                : "bg-white text-slate-700 border-slate-250 hover:bg-slate-50"
            }`}
          >
            <Key size={13} />
            <span>Sandi Keamanan</span>
          </button>
          
          <button
            onClick={handleReload}
            disabled={loading}
            className="cursor-pointer bg-white text-slate-700 border border-slate-250 hover:bg-slate-50 p-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center h-[38px] w-[38px]"
            title="Muat Ulang Seluruh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-slate-400" : "text-slate-600"} />
          </button>

          <button
            onClick={onLogout}
            className="cursor-pointer bg-rose-50 hover:bg-rose-100/90 text-rose-700 font-bold border border-rose-200/80 rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* ================= DESKTOP SIDEBAR OR TABS MENU (Non-Mobile) ================= */}
      <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl max-w-4xl overflow-x-auto">
        <button
          onClick={() => { setActiveTab('home'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'home' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Home size={14} />
          <span>Home</span>
        </button>
        <button
          onClick={() => { setActiveTab('counseling'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'counseling' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare size={14} />
          <span>Jurnal Bimbingan</span>
        </button>
        <button
          onClick={() => { setActiveTab('journals'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'journals' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen size={14} />
          <span>Jurnal Walas & KBM</span>
        </button>
        <button
          onClick={() => { setActiveTab('jadwal'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'jadwal' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar size={14} />
          <span>Jadwal Pelajaran</span>
        </button>
        <button
          onClick={() => { setActiveTab('attendance'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'attendance' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar size={14} />
          <span>Rekap Absensi</span>
        </button>
        <button
          onClick={() => { setActiveTab('infractions'); setInfractionSubTab('student_points_table'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'infractions' && infractionSubTab === 'student_points_table' && !showPasswordTab ? "bg-white text-rose-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>Daftar/Tabel Point Pelanggaran Siswa</span>
        </button>
        <button
          onClick={() => { setActiveTab('infractions'); setInfractionSubTab('list'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'infractions' && infractionSubTab !== 'student_points_table' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle size={14} />
          <span>Kasus &amp; Rubrik Sanksi</span>
        </button>
        <button
          onClick={() => { setActiveTab('buku_induk'); setShowPasswordTab(false); }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'buku_induk' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={14} />
          <span>Buku Induk</span>
        </button>
      </div>

      {showPasswordTab ? (
        /* PASSWORD TAB SCREEN */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-xl mx-auto w-full">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
            <span className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Ubah Sandi Keamanan Akun BK</h2>
              <p className="text-slate-500 text-[11px]">Silakan perbarui sandi secara berkala untuk menjaga kerahasiaan kasus sosial murid.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sandi Lama Guru BK</label>
              <input
                type="password"
                required
                placeholder="Masukkan sandi saat ini (default: bk123)"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sandi Baru</label>
              <input
                type="password"
                required
                placeholder="Masukkan pola sandi kuat baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Konfirmasi Sandi Baru</label>
              <input
                type="password"
                required
                placeholder="Ulangi isian sandi baru Anda"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowPasswordTab(false)}
                className="cursor-pointer px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Tutup Form
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                className="cursor-pointer px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-750 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {changingPassword ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Perbarui Sandi Aktif</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* MAIN AREA: CONDITIONAL RENDERING OF THE ACTIVE TAB */
        <div>
          {/* 1. STATUS SUMMARY BANNER FOR THE ENTIRE PORTAL */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Jurnal BK Wali Kelas</span>
                <span className="text-xl font-black text-indigo-750">{stats.totalC} Catatan</span>
                <span className="text-[9px] text-slate-400 leading-normal mt-0.5">{stats.pendingC} belum dirumuskan BK</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <MessageSquare size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-emerald-600 uppercase tracking-widest">Saran Terselesaikan</span>
                <span className="text-xl font-black text-emerald-800">{stats.resolvedC} Kasus</span>
                <span className="text-[9px] text-emerald-650 leading-normal mt-0.5">Sudah tersinkron ke Wali Kelas</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckSquare size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-amber-600 uppercase tracking-widest">Total Ketidakhadiran</span>
                <span className="text-xl font-black text-amber-800">{stats.totalAbsences} Kalender</span>
                <span className="text-[9px] text-amber-650 leading-normal mt-0.5">Kumulatif Sakit, Izin, Alpa & Terlambat</span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-rose-600 uppercase tracking-widest">Total Disiplin Melanggar</span>
                <span className="text-xl font-black text-rose-800">{stats.totalI} Laporan</span>
                <span className="text-[9px] text-rose-650 leading-normal mt-0.5">Pelanggaran aturan tata tertib</span>
              </div>
              <div className="p-3 bg-rose-50 text-rose-605 rounded-xl">
                <AlertCircle size={18} />
              </div>
            </div>
          </div>

          {/* RENDERING DYNAMIC SECTION VIEWS */}
          {activeTab === 'home' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Welcome box */}
              <div className="bg-gradient-to-r from-indigo-750 to-indigo-600 text-white rounded-3xl p-6 shadow-sm text-left relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
                  <Brain size={250} />
                </div>
                <div className="relative z-10 max-w-2xl">
                  <span className="bg-indigo-500/50 text-indigo-50 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest">INTEGRATED BK SYSTEM</span>
                  <h2 className="text-xl font-black mt-2">Selamat Datang, Konselor Guru BK</h2>
                  <p className="text-indigo-100 text-xs mt-1.5 leading-relaxed">
                    Sistem kini menghubungkan otomatis rekam absensi mampet (Wali Kelas) dan poin pelanggaran moralitas di gawai siswa langsung ke portal ini. Sila monitor analisis peringatan di bawah ini untuk intervensi tanggap darurat bimbingan siswa.
                  </p>
                </div>
              </div>

              {/* INTEGRATIVE INTERVENTION SCREENING (Menghubungkan absolut absensi + pelanggaran) */}
              <div className="bg-white border border-indigo-150 rounded-3xl p-6 shadow-xs text-left">
                <div className="flex justify-between items-center pb-4 border-b border-indigo-50 mb-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-rose-600 animate-bounce" /> Radar Deteksi Intervensi BK Kreatif (Sistem Pintar)
                    </h3>
                    <p className="text-slate-450 text-[11px] mt-0.5">
                      Menyaring siswa dengan ketidakhadiran berulang maupun akumulasi poin denda paling tinggi di angkatan sekolah.
                    </p>
                  </div>
                  <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-3 py-1 rounded-xl uppercase tracking-wider border border-rose-200">
                    ⚠️ Urgen Diperhatikan
                  </span>
                </div>

                {interventionStudents.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 font-semibold text-xs italic">
                    Belum ada siswa urgen di radar intervensi, atau semua siswa terdeteksi telah dibuatkan sesi bimbingan & dipindahkan ke Jurnal Bimbingan BK.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {interventionStudents.map((st) => (
                      <div key={st.id} className="p-4 bg-slate-50 border border-slate-250 rounded-2xl flex flex-col justify-between gap-3 flex-1">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="font-black text-xs text-slate-900">{st.name}</span>
                            <span className="text-[9.5px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">Kelas {st.className}</span>
                          </div>
                          <p className="text-[11px] text-slate-650 leading-relaxed font-semibold mt-1 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                             {st.reason}
                          </p>
                        </div>

                        <button
                          onClick={() => handleInitiateCounseling(st.name, st.className, st.reason)}
                          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center inline-flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Brain size={12} />
                          <span>Buat Sesi Bimbingan Siswa BK ini 🧠</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RECENT RECORDS SNEAK PEEK */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* A. Recent Absences */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xxs text-left flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <Calendar size={14} className="text-amber-500" /> Kejadian Absen Terakhir
                    </span>
                    <button onClick={() => { setActiveTab('attendance'); setAttendanceSubTab('diary'); }} className="text-[10px] font-bold text-indigo-650 hover:underline">
                      Lihat Semua
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                    {attendance.slice(0, 5).map((a, i) => {
                      const statusColors: { [key: string]: string } = {
                        "Alpa": "bg-rose-50 text-rose-700 border-rose-200",
                        "Sakit": "bg-blue-50 text-blue-700 border-blue-200",
                        "Izin": "bg-amber-50 text-amber-700 border-amber-200",
                        "Terlambat": "bg-purple-50 text-purple-700 border-purple-200"
                      };
                      
                      // Find student info
                      const info = getStudentInfo(a.studentId);
                      const stdName = info.name;
                      const cName = info.className;

                      return (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-105 rounded-xl text-[11px]">
                          <div className="text-left font-semibold">
                            <span className="font-extrabold text-slate-800 block text-xs leading-none mb-1">{stdName}</span>
                            <span className="text-slate-400 font-mono">Tgl: {a.date} | Kls: {cName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${statusColors[a.status] || "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            {a.status}
                          </span>
                        </div>
                      );
                    })}
                    {attendance.length === 0 && <span className="text-[11px] text-slate-400 text-center py-4">Belum ada rekam presensi harian masuk.</span>}
                  </div>
                </div>

                {/* B. Recent Infractions */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xxs text-left flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <AlertTriangle size={14} className="text-rose-500" /> Pelanggaran Terakhir
                    </span>
                    <button onClick={() => { setActiveTab('infractions'); setInfractionSubTab('list'); }} className="text-[10px] font-bold text-indigo-650 hover:underline">
                      Lihat Semua
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                    {infractions.slice(0, 5).map((inf, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-105 rounded-xl text-[11px]">
                        <div className="text-left font-semibold flex-1 pr-2">
                          <span className="font-extrabold text-slate-800 block text-xs leading-none mb-1">{inf.studentName}</span>
                          <span className="text-slate-500 font-medium block truncate max-w-[180px]">{inf.infractionType}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 block text-[10.5px]">+{inf.points || 0} Pts</span>
                          <span className="text-[8px] text-slate-400 font-mono mt-0.5 block">{inf.date}</span>
                        </div>
                      </div>
                    ))}
                    {infractions.length === 0 && <span className="text-[11px] text-slate-400 text-center py-4">Belum ada rekam pelanggaran tertib masuk.</span>}
                  </div>
                </div>

                {/* C. Recent Teaching Journals (Walas & KBM) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xxs text-left flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <BookOpen size={14} className="text-teal-600" /> Jurnal Walas & KBM Terbaru
                    </span>
                    <button onClick={() => setActiveTab('journals')} className="text-[10px] font-bold text-teal-700 hover:underline">
                      Lihat Semua ({teachingJournals.length})
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                    {teachingJournals.slice(0, 5).map((j, i) => {
                      const isHomeroom = j.teacherType === 'homeroom';
                      return (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-105 rounded-xl text-[11px] flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              isHomeroom ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {j.subject || (isHomeroom ? 'Wali Kelas' : 'Mapel')}
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                              Kls {j.className} • {j.date}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900 leading-tight block truncate">
                            {j.topic || 'Topik Pengajaran'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 block truncate">
                            Guru: {j.teacherName}
                          </span>
                        </div>
                      );
                    })}
                    {teachingJournals.length === 0 && <span className="text-[11px] text-slate-400 text-center py-4">Belum ada jurnal pengajaran masuk.</span>}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* 2. TAB JURNAL BIMBINGAN GURU BK (Counseling List & Actions) */}
          {activeTab === 'counseling' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={16} className="text-indigo-600 font-bold" /> Jurnal Advokasi Sosial &amp; Bimbingan Konseling (BK)
                  </h2>
                  <p className="text-slate-450 text-[11px]">Gunakan form masukan solusi untuk secara instan menyinkronkan masukan bimbingan ke tabel portal Wali Kelas.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftStudentId('');
                      setDraftStudentNisn('');
                      setDraftStudentName('');
                      setDraftClassName('');
                      setDraftReason('');
                      setDraftSuccess(false);
                      setSelectedLogId('draft_new');
                    }}
                    className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Plus size={14} />
                    <span>Form Bimbingan BK Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintGlobalLogs}
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    title="Cetak Jurnal Bimbingan BK Seluruh Siswa / Sesuai Filter"
                  >
                    <Printer size={13} />
                    <span>Cetak Jurnal Global</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintStudentModal(true)}
                    className="cursor-pointer bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    title="Pilih Siswa & Cetak Rekap Bimbingan Individual"
                  >
                    <Printer size={13} />
                    <span>Cetak Per Siswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadExcelCounseling}
                    className="cursor-pointer bg-indigo-50 border border-indigo-250 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Ekspor Excel</span>
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS FOR COUNSELING LIST */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-5 mb-5 border-b border-slate-100">
                
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari bimbingan berdasarkan nama siswa, topik, rincian kasus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pointer-events-auto rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status filter selection */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="all">Semua Riwayat</option>
                    <option value="pending">Menunggu Rekomendasi (Pending)</option>
                    <option value="resolved">Telah Ditanggapi (Resolved)</option>
                  </select>

                  {/* Class selection filter */}
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="all">Semua Tingkat Kelas</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* INTEGRATED DRAFT CUSTOM/MANDATORY BIMBINGAN BK FORM */}
              {selectedLogId === "draft_new" && (
                <div className="mb-6 p-5 border border-indigo-200 bg-indigo-50/20 rounded-2xl">
                  <div className="flex justify-between items-center pb-2 mb-4 border-b border-indigo-100">
                    <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1">
                      <Brain size={14} /> INISIASI MANDIRI KASUS BIMBINGAN BK BARU
                    </span>
                    <button onClick={() => setSelectedLogId(null)} className="text-[10px] font-extrabold text-rose-600 hover:underline">Batal</button>
                  </div>
                  <form onSubmit={submitDraftCounseling} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-150">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-indigo-950 flex items-center gap-1">
                          👤 Cari &amp; Pilih Siswa Cepat (Dari Database Sekolah)
                        </label>
                        {draftStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setDraftStudentSearch('')}
                            className="text-[9px] text-rose-500 hover:underline font-bold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="🔍 Tulis nama siswa atau NIS untuk memfilter list..."
                        value={draftStudentSearch}
                        onChange={(e) => setDraftStudentSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold placeholder-slate-400 focus:outline-none mb-1 shadow-2xs"
                      />
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const stud = allStudents.find(s => s.id === val);
                            if (stud) {
                              setDraftStudentName(stud.name);
                              setDraftClassName(stud.class);
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-205 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none py-1.5 px-2"
                      >
                        <option value="">-- Pilih Siswa (atau isi/ubah kolom manual di bawah) --</option>
                        {allStudents
                          .filter(s => {
                            if (!draftStudentSearch) return true;
                            const term = draftStudentSearch.toLowerCase();
                            return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                          })
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Kelas {s.class}) - NIS: {s.nis}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Nama Siswa Terkait</label>
                      <input
                        type="text"
                        value={draftStudentName}
                        onChange={(e) => setDraftStudentName(e.target.value)}
                        className="p-2 border border-slate-250 rounded-xl bg-white focus:outline-none text-xs font-semibold text-slate-800"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Tingkat Kelas</label>
                      <input
                        type="text"
                        placeholder="Contoh: 7-A"
                        value={draftClassName}
                        onChange={(e) => setDraftClassName(e.target.value)}
                        className="p-2 border border-slate-250 rounded-xl bg-white focus:outline-none text-xs font-semibold text-slate-800"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">Uraian Alasan Hubungan Intervensi BK</label>
                      <textarea
                        value={draftReason}
                        onChange={(e) => setDraftReason(e.target.value)}
                        className="p-2.5 border border-slate-250 rounded-xl bg-white focus:outline-none text-xs font-semibold text-slate-800"
                        rows={2}
                        required
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-2 md:col-span-2">
                      <button type="button" onClick={() => setSelectedLogId(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs">Tutup</button>
                      <button type="submit" disabled={submittingFeedback} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95">
                        {submittingFeedback ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        <span>Jadwalkan Penanganan BK</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* LIST DISPLAY SECTION */}
              {loading ? (
                <div className="py-20 text-center flex flex-col justify-center items-center gap-3">
                  <Loader2 size={36} className="text-indigo-600 animate-spin" />
                  <span className="text-slate-450 text-xs font-extrabold tracking-widest uppercase">Sinkronisasi Jurnal Bimbingan Wali Kelas...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl py-14 px-4 text-center">
                  <MessageSquare size={24} className="text-slate-350 mx-auto mb-2" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tidak Ada Catatan Bimbingan</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Silakan coba sesuaikan pencarian atau pilih filter status bimbingan lainnya.</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-5">
                  {paginatedLogs.map((log) => {
                    const isSelected = selectedLogId === log.id;
                    return (
                      <div 
                        key={log.id} 
                        className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white text-left ${
                          log.bkFeedback 
                            ? "border-slate-200 shadow-xxs hover:border-slate-350" 
                            : "border-amber-200 shadow-xs hover:shadow-sm"
                        }`}
                      >
                        
                        {/* Header card info */}
                        <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b ${
                          log.bkFeedback ? "bg-slate-50/75 border-slate-105" : "bg-amber-50/45 border-amber-100"
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs ${
                              log.bkFeedback 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}>
                              {log.className}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">{log.studentName}</h3>
                              <div className="flex items-center gap-2 text-[10px] text-slate-450 font-semibold mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} />
                                  <span>{log.date}</span>
                                </span>
                                <span>•</span>
                                <span>Wali Kelas {log.className}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                            {log.bkFeedback ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-850 font-black text-[9px] uppercase tracking-wider select-none">
                                <CheckCircle2 size={10} className="text-emerald-700" />
                                <span>Disaran BK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-850 font-black text-[9px] uppercase tracking-wider animate-pulse select-none">
                                <AlertCircle size={10} className="text-amber-700" />
                                <span>Butuh Solusi</span>
                              </span>
                            )}

                            <button
                              onClick={() => handlePrintLog(log)}
                              className="cursor-pointer px-2 py-1 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1 bg-white text-[10.5px] font-bold"
                              title="Cetak Dokumentasi Sesi Ini"
                            >
                              <Printer size={12} />
                              <span>Cetak Sesi Ini</span>
                            </button>

                            <button
                              onClick={() => handlePrintStudentLogs(log.studentId || log.studentName)}
                              className="cursor-pointer px-2 py-1 hover:bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 shadow-2xs transition-colors flex items-center gap-1 bg-white text-[10.5px] font-bold"
                              title={`Cetak Rekap Seluruh Bimbingan Siswa (${log.studentName})`}
                            >
                              <Printer size={12} className="text-indigo-600" />
                              <span>Cetak Rekap Siswa</span>
                            </button>
                          </div>
                        </div>

                        {/* Content parts description */}
                        <div className="p-4 flex flex-col gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">📢 Kronologi Kejadian</span>
                              <p className="text-slate-700 text-xs leading-relaxed italic">"{log.topic}"</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">🧭 Upaya Wali Kelas</span>
                              <p className="text-slate-700 text-xs leading-relaxed italic">"{log.actionPlan}"</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">🏆 Komitmen Siswa</span>
                              <p className="text-slate-700 text-xs leading-relaxed italic">"{log.result}"</p>
                            </div>
                          </div>

                          {/* Suggested interventions/feedback section from Counselor */}
                          {log.bkFeedback && (
                            <div className="mt-1 p-3.5 bg-indigo-50/75 border border-indigo-150 rounded-xl flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>🧠 Rekomendasi Solusi Guru BK (Live di Wali Kelas)</span>
                                </span>
                                {log.bkFeedbackAt && (
                                  <span className="text-[9px] text-indigo-400 font-mono">
                                    {new Date(log.bkFeedbackAt).toLocaleString('id-ID')}
                                  </span>
                                )}
                              </div>
                              <p className="text-indigo-950 font-semibold text-xs leading-relaxed italic">
                                "{log.bkFeedback}"
                              </p>
                              <div className="flex justify-end mt-1.5 pt-1.5 border-t border-indigo-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(log.id);
                                    setBkFeedbackText(log.bkFeedback || "");
                                  }}
                                  className="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-805 transition-colors"
                                >
                                  📝 Edit Solusi / Saran BK
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Add counselor feedback form */}
                          {!log.bkFeedback && !isSelected && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLogId(log.id);
                                setBkFeedbackText("");
                              }}
                              className="cursor-pointer mt-1 py-2 px-3 border border-indigo-200 hover:border-indigo-350 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 w-full shadow-xxs"
                            >
                              <Brain size={13} />
                              <span>Uraikan Form Solusi &amp; Intervensi Guru BK untuk Wali Kelas</span>
                            </button>
                          )}

                          {/* Feedback Form (when active/selected) */}
                          {isSelected && (
                            <form 
                              onSubmit={(e) => handleSubmitFeedback(e, log.id)}
                              className="mt-2 text-left p-4 bg-slate-55 border border-slate-200 rounded-xl flex flex-col gap-3 shadow-inner bg-slate-50"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                  📝 FORM INPUT REKOMENDASI GURU BK
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(null);
                                    setBkFeedbackText("");
                                  }}
                                  className="cursor-pointer text-[10px] font-bold text-rose-600 hover:underline"
                                >
                                  Batal
                                </button>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-650">Saran, Solusi, atau Langkah Intervensi Profesional BK:</label>
                                <textarea
                                  value={bkFeedbackText}
                                  onChange={(e) => setBkFeedbackText(e.target.value)}
                                  placeholder="Contoh: Disarankan untuk memanggil orang tua siswa minggu depan, kami akan sediakan asesmen minat bakat terarah untuk menemukan problem belajarnya..."
                                  rows={3}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-550"
                                  required
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(null);
                                    setBkFeedbackText("");
                                  }}
                                  className="cursor-pointer py-1.5 px-3 bg-white text-slate-600 border border-slate-250 font-bold hover:bg-slate-100 rounded-lg text-xs"
                                >
                                  Tutup
                                </button>
                                <button
                                  type="submit"
                                  disabled={submittingFeedback}
                                  className="cursor-pointer py-1.5 px-4 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                  {submittingFeedback ? <Loader2 size={12} className="animate-spin" /> : null}
                                  <span>Simpan &amp; Kirim ke Wali Kelas</span>
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
                {filteredLogs.length > 0 && (
                  <Pagination
                    currentPage={counselingPage}
                    totalItems={filteredLogs.length}
                    pageSize={counselingPageSize}
                    onPageChange={setCounselingPage}
                    onPageSizeChange={(size) => { setCounselingPageSize(size); setCounselingPage(1); }}
                    pageSizeOptions={[10, 15, 25, 50]}
                    className="mt-4 rounded-2xl border"
                  />
                )}
              </>
              )}
            </motion.div>
          )}

          {/* 3. TAB MONITORING & REKAP ABSENSI SISWA ALPA */}
          {activeTab === 'attendance' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col gap-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={16} className="text-emerald-600 font-bold" /> Rekapitulasi Presensi &amp; Ketidakhadiran Kumulatif
                  </h2>
                  <p className="text-slate-450 text-[11px]">Amati siswa yang kerap mangkir kelas (Alpa) untuk diprioritaskan mendapat pembinaan mental bimbingan.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintPdfAttendance}
                    className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition-all"
                    title="Cetak PDF Rekapitulasi Presensi Siswa BK"
                  >
                    <Printer size={13} />
                    <span>Cetak PDF Rekap Absensi</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadExcelAttendance}
                    className="cursor-pointer bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Ekspor Excel Ketidakhadiran</span>
                  </button>
                </div>
              </div>

              {/* DUAL SELECTOR SUBTABS DIRECT ON SCREEN */}
              <div className="flex gap-2 border-b border-slate-100 pb-3">
                <button
                  onClick={() => setAttendanceSubTab('aggregate')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    attendanceSubTab === 'aggregate' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 bg-transparent hover:text-slate-700'
                  }`}
                >
                  Akumulasi Status per Siswa 📊
                </button>
                <button
                  onClick={() => setAttendanceSubTab('diary')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    attendanceSubTab === 'diary' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 bg-transparent hover:text-slate-700'
                  }`}
                >
                  Riwayat Harian Jurnal Presensi 📔
                </button>
              </div>

              {/* FILTERS PANEL */}
              <div className="flex flex-col gap-3 pb-2">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Masukkan nama siswa untuk melacak kehadiran..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pointer-events-auto rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
                    />
                  </div>
                  
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Kelas</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter H S I A T */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                  <div className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <Filter size={13} className="text-indigo-600" />
                    <span>Filter Status Presensi (H / S / I / A / T):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      translate="no"
                      onClick={() => {
                        setAttendanceStatusFilter('all');
                        setAttendanceSortBy('name');
                        setAttendanceSortOrder('asc');
                      }}
                      className={`notranslate px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        attendanceStatusFilter === 'all'
                          ? 'bg-slate-800 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      translate="no"
                      onClick={() => {
                        setAttendanceStatusFilter('Hadir');
                        setAttendanceSortBy('hadir');
                        setAttendanceSortOrder('desc');
                      }}
                      className={`notranslate px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        attendanceStatusFilter === 'Hadir'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title="Urutkan & Saring berdasarkan Hadir (H) Terbanyak"
                    >
                      H <span className="text-[10px] font-bold">(Hadir)</span>
                    </button>
                    <button
                      type="button"
                      translate="no"
                      onClick={() => {
                        setAttendanceStatusFilter('Sakit');
                        setAttendanceSortBy('sakit');
                        setAttendanceSortOrder('desc');
                      }}
                      className={`notranslate px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        attendanceStatusFilter === 'Sakit'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                      }`}
                      title="Urutkan & Saring berdasarkan Sakit (S) Terbanyak"
                    >
                      S <span className="text-[10px] font-bold">(Sakit)</span>
                    </button>
                    <button
                      type="button"
                      translate="no"
                      onClick={() => {
                        setAttendanceStatusFilter('Izin');
                        setAttendanceSortBy('izin');
                        setAttendanceSortOrder('desc');
                      }}
                      className={`notranslate px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        attendanceStatusFilter === 'Izin'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                      title="Urutkan & Saring berdasarkan Izin (I) Terbanyak"
                    >
                      I <span className="text-[10px] font-bold">(Izin)</span>
                    </button>
                    <button
                      type="button"
                      translate="no"
                      onClick={() => {
                        setAttendanceStatusFilter('Alpa');
                        setAttendanceSortBy('alpa');
                        setAttendanceSortOrder('desc');
                      }}
                      className={`notranslate px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        attendanceStatusFilter === 'Alpa'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Urutkan & Saring berdasarkan Alpa (A) Terbanyak"
                    >
                      A <span className="text-[10px] font-bold">(Alpa)</span>
                    </button>
                    <button
                      type="button"
                      translate="no"
                      onClick={() => {
                        setAttendanceStatusFilter('Terlambat');
                        setAttendanceSortBy('terlambat');
                        setAttendanceSortOrder('desc');
                      }}
                      className={`notranslate px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        attendanceStatusFilter === 'Terlambat'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                      }`}
                      title="Urutkan & Saring berdasarkan Terlambat (T) Terbanyak"
                    >
                      T <span className="text-[10px] font-bold">(Terlambat)</span>
                    </button>
                    {(attendanceStatusFilter !== 'all' || attendanceStartDate !== '' || attendanceEndDate !== '' || classFilter !== 'all' || searchQuery !== '' || attendanceSortBy !== 'name' || attendanceSortOrder !== 'asc') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatusFilter('all');
                          setClassFilter('all');
                          setSearchQuery('');
                          setAttendanceStartDate('');
                          setAttendanceEndDate('');
                          setAttendanceSortBy('name');
                          setAttendanceSortOrder('asc');
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-1"
                        title="Reset semua filter dan pengurutan ke default"
                      >
                        <RotateCcw size={12} />
                        <span>Reset Default</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Saringan Tanggal Export & Tampilan */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/30 border border-emerald-100 p-3 rounded-2xl">
                  <div className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>Filter Periode Tanggal BK:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">Mulai:</span>
                      <input
                        type="date"
                        value={attendanceStartDate}
                        onChange={(e) => setAttendanceStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">Sampai:</span>
                      <input
                        type="date"
                        value={attendanceEndDate}
                        onChange={(e) => setAttendanceEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    {(attendanceStartDate || attendanceEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStartDate("");
                          setAttendanceEndDate("");
                        }}
                        className="text-[10px] uppercase font-black tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Reset Saring Tanggal
                      </button>
                    )}
                  </div>
                </div>
                {/* Sorting Bar: Terbesar ke Terkecil / Terkecil ke Terbesar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-indigo-50/70 border border-indigo-150 p-3 rounded-2xl">
                  <div className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <ArrowUpDown size={13} className="text-indigo-600" />
                    <span>Urutkan Rekap Absensi BK (Sorting):</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-2.5 py-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Kriteria:</span>
                      <select
                        value={attendanceSortBy}
                        onChange={(e: any) => setAttendanceSortBy(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="name">Nama Siswa (A - Z)</option>
                        <option value="class">Kelas Siswa</option>
                        <option value="rate">Persentase Kehadiran (%)</option>
                        <option value="alpa">Jumlah Alpa (A)</option>
                        <option value="terlambat">Jumlah Terlambat (T)</option>
                        <option value="sakit">Jumlah Sakit (S)</option>
                        <option value="izin">Jumlah Izin (I)</option>
                        <option value="hadir">Jumlah Hadir (H)</option>
                        <option value="total">Total Hari Pencatatan</option>
                      </select>
                    </div>

                    <div className="flex items-center rounded-xl bg-white border border-indigo-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => setAttendanceSortOrder('desc')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          attendanceSortOrder === 'desc'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Urutkan dari angka terbesar ke terkecil (Descending)"
                      >
                        <span>⬇️ Terbesar → Terkecil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceSortOrder('asc')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          attendanceSortOrder === 'asc'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Urutkan dari angka terkecil ke terbesar (Ascending)"
                      >
                        <span>⬆️ Terkecil → Terbesar</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceStatusFilter('all');
                        setClassFilter('all');
                        setSearchQuery('');
                        setAttendanceStartDate('');
                        setAttendanceEndDate('');
                        setAttendanceSortBy('name');
                        setAttendanceSortOrder('asc');
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Reset semua filter status, kelas, pencarian, tanggal, dan pengurutan ke default"
                    >
                      <RotateCcw size={12} />
                      <span>Reset Filter & Urutan</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RENDER ACTIVE ATTENDANCE DISPLAY */}
              {loading ? (
                <div className="py-20 text-center flex flex-col justify-center animate-pulse gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Mengalkulasi rekap presensi seluruh angkatan...
                </div>
              ) : attendanceSubTab === 'aggregate' ? (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'name') setAttendanceSortOrder(attendanceSortOrder === 'asc' ? 'desc' : 'asc');
                            else { setAttendanceSortBy('name'); setAttendanceSortOrder('asc'); }
                          }}
                          className="py-3 px-4 font-black text-slate-800 cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>Nama Siswa</span>
                            {attendanceSortBy === 'name' && (<span>{attendanceSortOrder === 'asc' ? '▲' : '▼'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'class') setAttendanceSortOrder(attendanceSortOrder === 'asc' ? 'desc' : 'asc');
                            else { setAttendanceSortBy('class'); setAttendanceSortOrder('asc'); }
                          }}
                          className="py-3 px-4 font-black text-slate-850 text-center cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Kelas</span>
                            {attendanceSortBy === 'class' && (<span>{attendanceSortOrder === 'asc' ? '▲' : '▼'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'hadir') setAttendanceSortOrder(attendanceSortOrder === 'desc' ? 'asc' : 'desc');
                            else { setAttendanceSortBy('hadir'); setAttendanceSortOrder('desc'); }
                          }}
                          className="py-3 px-2 font-black text-emerald-700 text-center cursor-pointer hover:bg-emerald-100/60 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Hadir</span>
                            {attendanceSortBy === 'hadir' && (<span>{attendanceSortOrder === 'desc' ? '▼' : '▲'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'sakit') setAttendanceSortOrder(attendanceSortOrder === 'desc' ? 'asc' : 'desc');
                            else { setAttendanceSortBy('sakit'); setAttendanceSortOrder('desc'); }
                          }}
                          className="py-3 px-2 font-black text-indigo-700 text-center cursor-pointer hover:bg-indigo-100/60 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Sakit</span>
                            {attendanceSortBy === 'sakit' && (<span>{attendanceSortOrder === 'desc' ? '▼' : '▲'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'izin') setAttendanceSortOrder(attendanceSortOrder === 'desc' ? 'asc' : 'desc');
                            else { setAttendanceSortBy('izin'); setAttendanceSortOrder('desc'); }
                          }}
                          className="py-3 px-2 font-black text-amber-700 text-center cursor-pointer hover:bg-amber-100/60 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Izin</span>
                            {attendanceSortBy === 'izin' && (<span>{attendanceSortOrder === 'desc' ? '▼' : '▲'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'alpa') setAttendanceSortOrder(attendanceSortOrder === 'desc' ? 'asc' : 'desc');
                            else { setAttendanceSortBy('alpa'); setAttendanceSortOrder('desc'); }
                          }}
                          className="py-3 px-2 font-black text-rose-700 text-center cursor-pointer hover:bg-rose-100/60 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Alpa (A)</span>
                            {attendanceSortBy === 'alpa' && (<span>{attendanceSortOrder === 'desc' ? '▼' : '▲'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'terlambat') setAttendanceSortOrder(attendanceSortOrder === 'desc' ? 'asc' : 'desc');
                            else { setAttendanceSortBy('terlambat'); setAttendanceSortOrder('desc'); }
                          }}
                          className="py-3 px-2 font-black text-purple-700 text-center cursor-pointer hover:bg-purple-100/60 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Terlambat</span>
                            {attendanceSortBy === 'terlambat' && (<span>{attendanceSortOrder === 'desc' ? '▼' : '▲'}</span>)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (attendanceSortBy === 'rate') setAttendanceSortOrder(attendanceSortOrder === 'desc' ? 'asc' : 'desc');
                            else { setAttendanceSortBy('rate'); setAttendanceSortOrder('desc'); }
                          }}
                          className="py-3 px-2 font-black text-slate-800 text-center cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Rasio</span>
                            {attendanceSortBy === 'rate' && (<span>{attendanceSortOrder === 'desc' ? '▼' : '▲'}</span>)}
                          </div>
                        </th>
                        <th className="py-3 px-4 font-black text-indigo-650 text-center">Tindakan BK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {paginatedAttendanceAggregate.map((st, i) => {
                        const hasAlpaProblem = st.alpa >= 2;
                        return (
                          <tr key={i} className={`hover:bg-slate-50 bg-white ${hasAlpaProblem ? 'bg-rose-50/20' : ''}`}>
                            <td className="py-3 px-4 text-xs font-extrabold text-slate-900">{st.name}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">Kelas {st.className}</td>
                            <td className="py-3 px-2 text-center text-emerald-600 font-extrabold">{st.hadir}</td>
                            <td className="py-3 px-2 text-center text-indigo-600">{st.sakit}</td>
                            <td className="py-3 px-2 text-center text-amber-600">{st.izin}</td>
                            <td className={`py-3 px-2 text-center font-black ${st.alpa > 0 ? "text-rose-600 bg-rose-50" : "text-slate-400"}`}>{st.alpa}</td>
                            <td className="py-3 px-2 text-center text-purple-600">{st.terlambat}</td>
                            <td className="py-3 px-2 text-center font-black text-emerald-650 text-xs">
                              {st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {st.alpa > 0 || st.terlambat > 0 ? (
                                  <button
                                    onClick={() => handleInitiateCounseling(st.name, st.className, `${st.alpa} hari ALPA & ${st.terlambat} kali Terlambat`)}
                                    className="px-2 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-705 text-[10px] uppercase font-black tracking-wider rounded-lg transition-colors cursor-pointer"
                                  >
                                    Inisiasi BK 🧠
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 font-bold">Baik/Tertib ✅</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudentAttendance(st.id, st.name)}
                                  title={`Hapus seluruh rekap absensi ${st.name}`}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAttendanceAggregate.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 font-medium italic">Tidak ada siswa yang termonitor absensi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={attendanceAggregatePage}
                    totalItems={filteredAttendanceAggregate.length}
                    pageSize={attendanceAggregatePageSize}
                    onPageChange={setAttendanceAggregatePage}
                    onPageSizeChange={(size) => { setAttendanceAggregatePageSize(size); setAttendanceAggregatePage(1); }}
                    pageSizeOptions={[20, 25, 50, 100]}
                  />
                </div>
              ) : (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="py-3 px-4 font-black">Tanggal</th>
                        <th className="py-3 px-4 font-black">Nama Siswa</th>
                        <th className="py-3 px-4 font-black text-center">Kelas</th>
                        <th className="py-3 px-4 font-black text-center">Status</th>
                        <th className="py-3 px-4 font-black">Catatan Keterangan Sakit/Alpa</th>
                        <th className="py-3 px-3 font-black text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {paginatedAttendanceDiary.map((a, i) => {
                        const info = getStudentInfo(a.studentId, a.studentName);
                        const name = info.name;
                        const cName = info.className || a.className || "7-A";

                        return (
                          <tr key={i} className="hover:bg-slate-50 bg-white">
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">{a.date}</td>
                            <td className="py-3 px-4 font-extrabold text-slate-900">{name}</td>
                            <td className="py-3 px-4 text-center">Kelas {cName}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                                a.status === 'Alpa' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                a.status === 'Sakit' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                a.status === 'Izin' ? 'bg-amber-50 text-amber-750 border-amber-200' :
                                a.status === 'Terlambat' ? 'bg-purple-50 text-purple-750 border-purple-200' :
                                'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 italic text-[11px] font-medium">"{a.notes || "Tidak ada rincian daktili kelas"}"</td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleAttendance(a.id, name, a.date)}
                                title={`Hapus presensi tanggal ${a.date}`}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAttendanceDiary.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-medium italic">Belum ada riwayat presensi terekam saat ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={attendanceDiaryPage}
                    totalItems={filteredAttendanceDiary.length}
                    pageSize={attendanceDiaryPageSize}
                    onPageChange={setAttendanceDiaryPage}
                    onPageSizeChange={(size) => { setAttendanceDiaryPageSize(size); setAttendanceDiaryPage(1); }}
                    pageSizeOptions={[20, 25, 50, 100]}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* 4. TAB TRACING POIN PELANGGARAN DISIPLIN & RUBRIK SANKSI */}
          {activeTab === 'infractions' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col gap-4"
            >
              {/* Hidden File Inputs for Import Point & Import Rubrik */}
              <input
                ref={pointsFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportPointsFile}
                className="hidden"
              />
              <input
                ref={rubricFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportRubricFile}
                className="hidden"
              />

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-rose-600 font-bold" /> Portal Poin Pelanggaran Siswa &amp; Rubrik Sanksi BK (MySQL)
                  </h2>
                  <p className="text-slate-450 text-[11px]">
                    Terintegrasi langsung dengan database MySQL, Import Point ber-referensi Nomor Pelanggaran Rubrik, dan Otomatisasi +5 Poin saat siswa tercatat Alpa (A) pada Absensi Wali Kelas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPointsTemplateCsv}
                    className="cursor-pointer bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                    title="Unduh Template CSV Pemberian Poin (Otomatis Terisi Semua Siswa Aktif + Referensi Nomor Pelanggaran)"
                  >
                    <Download size={13} />
                    <span>Template CSV Point</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPointsTemplateExcel}
                    className="cursor-pointer bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                    title="Unduh Template Excel Pemberian Poin (Otomatis Terisi Semua Siswa Aktif + Referensi Nomor Pelanggaran)"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Template Excel Point</span>
                  </button>
                  <button
                    type="button"
                    disabled={importingPoints}
                    onClick={() => pointsFileInputRef.current?.click()}
                    className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    {importingPoints ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>Import Point (CSV/Excel)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadExcelInfractions}
                    className="cursor-pointer bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-800 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Ekspor Rekap</span>
                  </button>
                </div>
              </div>

              {/* SELECTOR SUBTABS DIRECT ON SCREEN */}
              <div className="flex gap-2 border-b border-slate-100 pb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('student_points_table')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    infractionSubTab === 'student_points_table'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 bg-rose-50/70 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  Daftar/Tabel Point Pelanggaran Siswa 📊
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('list')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    infractionSubTab === 'list' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Daftar Kejadian Kasus Masuk 🚨 ({infractions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('points')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    infractionSubTab === 'points' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 bg-transparent hover:text-slate-800'
                  }`}
                >
                  Kumulatif Poin Tata Tertib 🏆
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('add')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    infractionSubTab === 'add' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  ➕ Beri Poin Pelanggaran (BK)
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('reduction')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    infractionSubTab === 'reduction' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 bg-transparent hover:text-emerald-700'
                  }`}
                >
                  Input Pengurangan Poin (%) BK ❇️
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('rubric')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    infractionSubTab === 'rubric' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Kelola &amp; Import Rubrik Sanksi 📋 ({infractionRules.length})
                </button>
              </div>

              {/* PENGATURAN TANGGAL PEMBERLAKUAN POIN KHUSUS KELAS 7 */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shadow-2xs">
                <div className="flex flex-col gap-0.5 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      📅 Tanggal Pemberlakuan Poin Khusus Kelas 7
                    </span>
                    {grade7PointsEffectiveDate ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 text-[10px] font-black">
                        Aktif Mulai: {grade7PointsEffectiveDate}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                        Semua Tanggal Dihitung
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Khusus siswa <strong>Kelas 7</strong>: Jika kejadian tercatat <strong>sebelum tanggal pemberlakuan poin</strong> ini, maka <strong>poin Alpa dari absensi Wali Kelas maupun pelanggaran lainnya tidak dihitung</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    type="date"
                    value={grade7PointsEffectiveDate}
                    onChange={(e) => setGrade7PointsEffectiveDate(e.target.value)}
                    className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    disabled={savingGrade7Date}
                    onClick={() => handleSaveGrade7EffectiveDate(grade7PointsEffectiveDate)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {savingGrade7Date ? <Loader2 size={12} className="animate-spin" /> : null}
                    <span>Simpan Tanggal Kelas 7</span>
                  </button>
                  {grade7PointsEffectiveDate && (
                    <button
                      type="button"
                      disabled={savingGrade7Date}
                      onClick={() => handleSaveGrade7EffectiveDate("")}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* FILTERS PANEL */}
              {infractionSubTab !== 'reduction' && infractionSubTab !== 'rubric' && infractionSubTab !== 'add' && (
                <div className="flex flex-col gap-3 pb-2">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Masukkan kata kunci nama siswa, NIS, atau jenis pelanggaran..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pointer-events-auto rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Semua Kelas</option>
                      {uniqueClasses.map(c => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Saringan Tanggal Export & Tampilan */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50/30 border border-rose-100 p-3 rounded-2xl">
                    <div className="text-[11px] font-black text-rose-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Calendar size={13} className="text-rose-600" />
                      <span>Filter Periode Tanggal BK:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold">Mulai:</span>
                        <input
                          type="date"
                          value={infractionStartDate}
                          onChange={(e) => setInfractionStartDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold">Sampai:</span>
                        <input
                          type="date"
                          value={infractionEndDate}
                          onChange={(e) => setInfractionEndDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                      {(infractionStartDate || infractionEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setInfractionStartDate("");
                            setInfractionEndDate("");
                          }}
                          className="text-[10px] uppercase font-black tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Reset Saring
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENTS TO RENDER BASE ON INFRACTION SUBTAB */}
              {loading ? (
                <div className="py-20 text-center animate-pulse font-bold text-xs uppercase tracking-widest text-slate-400">
                  Mengalkulasi akumulasi poin kompilasi disiplin...
                </div>
              ) : infractionSubTab === 'student_points_table' ? (
                /* ================= TAB: DAFTAR / TABEL POINT PELANGGARAN SISWA ================= */
                <div className="flex flex-col gap-4">
                  {/* Info Banner & View Mode Selector */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span>📊 Daftar / Tabel Point Pelanggaran Siswa</span>
                        <span className="px-2 py-0.5 text-[9.5px] rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold">
                          MySQL Realtime
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Menampilkan seluruh catatan poin pelanggaran dari Import CSV/Excel BK, Input Manual BK, serta penambahan otomatis <strong>+5 Poin</strong> bagi siswa yang tercatat <strong>Alpa (A)</strong> pada Absensi Wali Kelas.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setStudentPointsViewMode('by_student')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          studentPointsViewMode === 'by_student'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Per Siswa (Multi-Pelanggaran)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentPointsViewMode('all_rows')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          studentPointsViewMode === 'all_rows'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Semua Baris Kejadian ({filteredInfractionsList.length})
                      </button>
                    </div>
                  </div>

                  {studentPointsViewMode === 'by_student' ? (
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4 font-black w-12">No</th>
                            <th className="py-3 px-4 font-black">NIS &amp; Nama Siswa</th>
                            <th className="py-3 px-4 font-black text-center w-24">Kelas</th>
                            <th className="py-3 px-4 font-black">Rincian Pelanggaran, Sanksi &amp; Keterangan Tambahan</th>
                            <th className="py-3 px-4 font-black text-center w-32">Total Poin</th>
                            <th className="py-3 px-4 font-black text-center w-36">Aksi BK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                          {filteredInfractionsAggregate.map((st, idx) => {
                            const matchedStudent = allStudents.find(
                              s => s.id === st.id || s.name.trim().toLowerCase() === st.name.trim().toLowerCase()
                            );
                            const nisDisplay = matchedStudent?.nis || st.id;
                            const isSevere = st.points >= 15;
                            const isMedium = st.points >= 5 && st.points < 15;
                            return (
                              <tr key={st.id || idx} className={`hover:bg-slate-50/70 align-top ${isSevere ? 'bg-rose-50/20' : 'bg-white'}`}>
                                <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                <td className="py-3.5 px-4">
                                  <div className="font-extrabold text-slate-900 text-xs">{st.name}</div>
                                  <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">NIS: {nisDisplay}</div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-[11px]">
                                    {st.className}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-col gap-2">
                                    {st.list.map((item, iIdx) => {
                                      const isAutoAlpa =
                                        item.source === 'auto_alpa_walas' ||
                                        (item.id && item.id.startsWith('sil-alpa-')) ||
                                        (item.infractionType && item.infractionType.toLowerCase().includes('alpa (a)'));
                                      const isImport = item.source === 'import_bk';
                                      return (
                                        <div
                                          key={item.id || iIdx}
                                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-[10px] font-black text-slate-500 font-mono">
                                                #{iIdx + 1} • {item.date}
                                              </span>
                                              {(item.bab || item.subBab) && (
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-150 text-[9.5px] font-bold">
                                                  {[item.bab, item.subBab].filter(Boolean).join(' › ')}
                                                </span>
                                              )}
                                              {isAutoAlpa && (
                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-250 text-[9px] font-black uppercase">
                                                  ⚡ Otomatis Alpa Absensi Wali Kelas (+5 Poin)
                                                </span>
                                              )}
                                              {isImport && (
                                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-black uppercase">
                                                  📤 Import CSV/Excel BK
                                                </span>
                                              )}
                                            </div>
                                            <div className="font-extrabold text-slate-900 text-xs mt-0.5">
                                              {item.infractionType}
                                            </div>
                                            {item.sanction && (
                                              <div className="text-[10.5px] text-rose-700 font-semibold">
                                                Sanksi: {item.sanction}
                                              </div>
                                            )}
                                            {item.notes && (
                                              <div className="text-[10.5px] text-slate-600 italic">
                                                Keterangan Tambahan: "{item.notes}"
                                              </div>
                                            )}
                                            {!item.notes && item.actionTaken && (
                                              <div className="text-[10.5px] text-slate-500">
                                                Tindak Lanjut: {item.actionTaken}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            <span
                                              className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs border ${
                                                (item.points || 0) < 0
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                                              }`}
                                            >
                                              {(item.points || 0) > 0 ? `+${item.points}` : item.points} Poin
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteInfraction(item.id)}
                                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                              title="Hapus item pelanggaran ini"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div
                                    className={`inline-block px-3 py-1 rounded-xl font-mono font-black text-xs border ${
                                      isSevere
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : isMedium
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {st.points} Poin
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-bold mt-1">
                                    {st.count} Pelanggaran
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewInfractionStudentId(matchedStudent?.id || st.id);
                                        setInfractionSubTab('add');
                                      }}
                                      className="px-2.5 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-[10px] uppercase font-black rounded-lg transition-all cursor-pointer"
                                    >
                                      + Tambah Poin
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReductionStudentId(matchedStudent?.id || st.id);
                                        setInfractionSubTab('reduction');
                                      }}
                                      className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black rounded-lg transition-all cursor-pointer"
                                    >
                                      ❇️ Kurangi Poin (%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleInitiateCounseling(
                                          st.name,
                                          st.className,
                                          `Total akumulasi ${st.points} Poin Pelanggaran tata tertib`
                                        )
                                      }
                                      className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[10px] uppercase font-black rounded-lg transition-all cursor-pointer"
                                    >
                                      Solusi BK
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredInfractionsAggregate.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">
                                Belum ada data poin pelanggaran siswa tercatat. Gunakan tombol <strong>Import Point (CSV/Excel)</strong> atau <strong>Beri Poin Pelanggaran</strong> di atas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-3 font-black">No</th>
                            <th className="py-3 px-3 font-black">Tanggal</th>
                            <th className="py-3 px-3 font-black">Nama Siswa</th>
                            <th className="py-3 px-3 font-black text-center">Kelas</th>
                            <th className="py-3 px-3 font-black">BAB / Sub Bab &amp; Jenis Pelanggaran</th>
                            <th className="py-3 px-3 font-black">Sanksi &amp; Keterangan Tambahan</th>
                            <th className="py-3 px-3 font-black text-center">Poin</th>
                            <th className="py-3 px-3 font-black text-center">Sumber</th>
                            <th className="py-3 px-3 font-black text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {paginatedInfractionsList.map((log, idx) => {
                            const isAutoAlpa =
                              log.source === 'auto_alpa_walas' ||
                              (log.id && log.id.startsWith('sil-alpa-')) ||
                              (log.infractionType && log.infractionType.toLowerCase().includes('alpa (a)'));
                            return (
                              <tr key={log.id} className="hover:bg-slate-50 bg-white">
                                <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                                  {(infractionPage - 1) * infractionPageSize + idx + 1}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                                  <div>{log.date}</div>
                                  <div className="text-[10px] text-slate-400">{log.time}</div>
                                </td>
                                <td className="py-3 px-3 font-extrabold text-slate-900">{log.studentName}</td>
                                <td className="py-3 px-3 text-center">Kelas {log.className}</td>
                                <td className="py-3 px-3">
                                  {(log.bab || log.subBab) && (
                                    <div className="text-[10px] font-bold text-indigo-700 mb-0.5">
                                      {[log.bab, log.subBab].filter(Boolean).join(' › ')}
                                    </div>
                                  )}
                                  <div className="font-extrabold text-slate-800">{log.infractionType}</div>
                                </td>
                                <td className="py-3 px-3">
                                  {log.sanction && (
                                    <div className="text-[11px] font-bold text-rose-700">Sanksi: {log.sanction}</div>
                                  )}
                                  {log.notes ? (
                                    <div className="text-[11px] text-slate-600 italic">Ket: "{log.notes}"</div>
                                  ) : (
                                    <div className="text-[11px] text-slate-500">{log.actionTaken}</div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-black text-rose-700">
                                  {(log.points || 0) > 0 ? `+${log.points}` : log.points} Poin
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isAutoAlpa ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-250 text-[9.5px] font-black uppercase">
                                      ⚡ Otomatis Alpa Walas
                                    </span>
                                  ) : log.source === 'import_bk' ? (
                                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[9.5px] font-black uppercase">
                                      📤 Import CSV/Excel
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9.5px] font-bold uppercase">
                                      Guru BK / Walas
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInfraction(log.id)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredInfractionsList.length === 0 && (
                            <tr>
                              <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                                Belum ada catatan poin pelanggaran siswa.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {filteredInfractionsList.length > 0 && (
                        <Pagination
                          currentPage={infractionPage}
                          totalItems={filteredInfractionsList.length}
                          pageSize={infractionPageSize}
                          onPageChange={setInfractionPage}
                          onPageSizeChange={(size) => {
                            setInfractionPageSize(size);
                            setInfractionPage(1);
                          }}
                          pageSizeOptions={[10, 25, 50]}
                          className="mt-2 rounded-b-2xl border-t"
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : infractionSubTab === 'points' ? (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="py-3 px-4 font-black">No</th>
                        <th className="py-3 px-4 font-black">Nama Siswa</th>
                        <th className="py-3 px-4 font-black text-center">Kelas</th>
                        <th className="py-3 px-4 font-black text-center">Frekuensi Melanggar</th>
                        <th className="py-3 px-4 font-black text-center">Akumulasi Poin Sanksi</th>
                        <th className="py-3 px-4 font-black text-center">Predikat / Bahaya</th>
                        <th className="py-3 px-4 font-black text-center">Tindakan Advokasi BK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredInfractionsAggregate.map((st, idx) => {
                        const isSevere = st.points >= 15;
                        const isMedium = st.points >= 5 && st.points < 15;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50 bg-white ${isSevere ? "bg-rose-50/20" : ""}`}>
                            <td className="py-3 px-4 font-mono text-slate-450 text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 font-extrabold text-slate-900">{st.name}</td>
                            <td className="py-3 px-4 text-center">Kelas {st.className}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-600">{st.count} Kali Kejadian</td>
                            <td className={`py-3 px-4 text-center font-black ${isSevere ? "text-rose-700 bg-rose-50" : isMedium ? "text-amber-700" : "text-slate-700"}`}>
                              {st.points} Poin denda
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isSevere ? (
                                <span className="px-2 py-0.5 font-bold text-[9px] bg-rose-100 text-rose-800 border border-rose-200 rounded uppercase">⚠️ Urgen Advokasi</span>
                              ) : isMedium ? (
                                <span className="px-2 py-0.5 font-bold text-[9px] bg-amber-100 text-amber-800 border border-amber-200 rounded uppercase">Peringatan Ringan</span>
                              ) : (
                                <span className="px-2 py-0.5 font-bold text-[9px] bg-slate-100 text-slate-650 border border-slate-200 rounded uppercase">Wajar / Normal</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleInitiateCounseling(st.name, st.className, `Total akumulasi ${st.points} Poin Pelanggaran tata tertib`)}
                                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-150 text-indigo-700 text-[10.5px] uppercase font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Brain size={11} /> Solusi BK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewInfractionStudentId(st.id);
                                    setInfractionSubTab('add');
                                  }}
                                  className="px-2.5 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-[10.5px] uppercase font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>🚨 Beri Poin</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReductionStudentId(st.id);
                                    setInfractionSubTab('reduction');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-150 hover:bg-emerald-100 text-emerald-800 text-[10.5px] uppercase font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>❇️ Kurangi Poin (%)</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredInfractionsAggregate.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 font-medium italic">Tidak ditemukan kejadian pelanggaran murid terdaftar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : infractionSubTab === 'add' ? (
                <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-6 shadow-xxs flex flex-col gap-5">
                  {/* Box Import Cepat via CSV / Excel */}
                  <div className="bg-white border border-indigo-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className="text-indigo-600" />
                        <span>Import Pemberian Point Pelanggaran via File CSV / Excel</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Template otomatis sudah terisi semua siswa aktif. Guru BK tinggal mengisi <strong>Nomor Pelanggaran</strong> (sesuai referensi Rubrik Poin) dan <strong>Keterangan Tambahan</strong> (1 siswa bisa diisi beberapa pelanggaran).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadPointsTemplateCsv}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Template CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPointsTemplateExcel}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Template Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={importingPoints}
                        onClick={() => pointsFileInputRef.current?.click()}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        {importingPoints ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>Upload File Import Point</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rose-200 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                        🚨
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-slate-900">Form Pemberian Poin Pelanggaran Siswa (Manual Guru BK)</h3>
                          <span className="text-[9.5px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-250 px-2 py-0.5 rounded-full">
                            💾 Langsung Simpan ke MySQL
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                          Pemberian poin sanksi ini langsung disimpan ke basis data MySQL sekolah secara realtime dan masuk ke Daftar/Tabel Point Pelanggaran Siswa.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfractionSubTab('student_points_table')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      ← Lihat Tabel Point Siswa
                    </button>
                  </div>

                  <form onSubmit={handleSubmitNewInfraction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pilih Siswa */}
                    <div className="flex flex-col gap-1.5 text-left md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                          👤 Pilih Siswa Terkait <span className="text-rose-500">*</span>
                        </label>
                        {newInfractionStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setNewInfractionStudentSearch('')}
                            className="text-[9px] text-rose-500 hover:underline font-bold cursor-pointer"
                          >
                            Reset Cari
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="🔍 Tulis nama murid atau NIS untuk memfilter pilihan..."
                        value={newInfractionStudentSearch}
                        onChange={(e) => setNewInfractionStudentSearch(e.target.value)}
                        className="p-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 mb-1"
                      />
                      <select
                        value={newInfractionStudentId}
                        onChange={(e) => setNewInfractionStudentId(e.target.value)}
                        className="p-2.5 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 pointer-events-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
                        required
                      >
                        <option value="">
                          {newInfractionStudentSearch
                            ? `-- Hasil Pencarian (${allStudents.filter(s => {
                                const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
                                const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
                                if (isMut || isLulus) return false;
                                return s.name.toLowerCase().includes(newInfractionStudentSearch.toLowerCase()) || (s.nis && s.nis.toLowerCase().includes(newInfractionStudentSearch.toLowerCase()));
                              }).length} siswa ditemukan) --`
                            : "-- Pilih Siswa Terdaftar --"}
                        </option>
                        {allStudents
                          .filter(s => {
                            const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
                            const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
                            if (isMut || isLulus) return false;
                            if (!newInfractionStudentSearch) return true;
                            const term = newInfractionStudentSearch.toLowerCase();
                            return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                          })
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Kelas {s.class}) - NIS: {s.nis}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Acuan Rubrik Sanksi (Opsional Otomatis) */}
                    <div className="flex flex-col gap-1.5 text-left md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        📋 Pilih Cepat dari Master Rubrik Sanksi (Otomatis Isi BAB, SUB BAB, Sanksi &amp; Poin)
                      </label>
                      <select
                        value={newInfractionRuleId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewInfractionRuleId(val);
                          const matched = infractionRules.find(r => r.id === val);
                          if (matched) {
                            setNewInfractionType(matched.name);
                            setNewInfractionBab(matched.bab || "");
                            setNewInfractionSubBab(matched.subBab || "");
                            setNewInfractionSanction(matched.sanction || "");
                            setNewInfractionPoints(matched.points || 2);
                            if (matched.sanction) {
                              setNewInfractionActionTaken(matched.sanction);
                            }
                          }
                        }}
                        className="p-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                      >
                        <option value="">-- Pilih Nomor / Jenis Pelanggaran dari Rubrik Sanksi --</option>
                        {infractionRules.map((r, idx) => (
                          <option key={r.id} value={r.id}>
                            [{getRuleDisplayNumber(r, idx)}] {r.bab ? `${r.bab} - ` : ''}{r.subBab ? `${r.subBab}: ` : ''}{r.name} — Sanksi: {r.sanction || '-'} (+{r.points} Poin)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Deskripsi Jenis Pelanggaran */}
                    <div className="flex flex-col gap-1.5 text-left md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        ⚠️ Jenis / Uraian Pelanggaran <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={newInfractionType}
                        onChange={(e) => setNewInfractionType(e.target.value)}
                        placeholder="Contoh: 1.1 Corat-coret topi, 1.2 Memakai topi tidak beridentitas sekolah..."
                        rows={2}
                        className="p-2.5 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-400"
                        required
                      />
                    </div>

                    {/* Keterangan Tambahan */}
                    <div className="flex flex-col gap-1.5 text-left md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        📝 Keterangan Tambahan tentang Pelanggaran (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newInfractionNotes}
                        onChange={(e) => setNewInfractionNotes(e.target.value)}
                        placeholder="Tambahkan keterangan tambahan terkait pelanggaran siswa tersebut jika ada..."
                        className="p-2.5 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-400"
                      />
                    </div>

                    {/* Besaran Poin Pelanggaran */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        🔢 Besaran Poin Pelanggaran (Positif) <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={newInfractionPoints}
                          onChange={(e) => setNewInfractionPoints(Number(e.target.value))}
                          className="flex-1 p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          required
                        />
                        <div className="flex gap-1">
                          {[2, 5, 10, 15, 25].map(pt => (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => setNewInfractionPoints(pt)}
                              className={`px-2 py-1 text-[10px] font-black rounded-lg border cursor-pointer ${
                                newInfractionPoints === pt ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              +{pt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Status Penanganan */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        📌 Status Penanganan / Mediasi
                      </label>
                      <select
                        value={newInfractionResolutionStatus}
                        onChange={(e) => setNewInfractionResolutionStatus(e.target.value as any)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                      >
                        <option value="Dalam Proses">Dalam Proses (Dipantau BK)</option>
                        <option value="Belum Selesai">Belum Selesai</option>
                        <option value="Butuh Mediasi">Butuh Mediasi (Panggilan Walas/Ortu)</option>
                        <option value="Selesai">Selesai (Sudah Diberi Tindakan/Sanksi)</option>
                      </select>
                    </div>

                    {/* Tanggal & Jam */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        📅 Tanggal Kejadian
                      </label>
                      <input
                        type="date"
                        value={newInfractionDate}
                        onChange={(e) => setNewInfractionDate(e.target.value)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        ⏱️ Waktu Kejadian (WIB)
                      </label>
                      <input
                        type="time"
                        value={newInfractionTime}
                        onChange={(e) => setNewInfractionTime(e.target.value)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        required
                      />
                    </div>

                    {/* Lokasi */}
                    <div className="flex flex-col gap-1.5 text-left md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        📍 Lokasi Kejadian
                      </label>
                      <input
                        type="text"
                        value={newInfractionLocation}
                        onChange={(e) => setNewInfractionLocation(e.target.value)}
                        placeholder="Contoh: Gerbang Masuk Sekolah, Ruang Kelas 8-B, Kantin, Lapangan..."
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    {/* Tindakan / Sanksi Pembinaan */}
                    <div className="flex flex-col gap-1.5 text-left md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                        ⚖️ Tindakan / Sanksi Pembinaan yang Diberikan Guru BK
                      </label>
                      <textarea
                        value={newInfractionActionTaken}
                        onChange={(e) => setNewInfractionActionTaken(e.target.value)}
                        placeholder="Contoh: Teguran Langsung, Peringatan lisan, pembuatan surat pernyataan komitmen disiplin..."
                        rows={2}
                        className="p-2.5 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        required
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 md:col-span-2 border-t border-rose-200 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setInfractionSubTab('student_points_table');
                          setNewInfractionType("");
                          setNewInfractionStudentId("");
                          setNewInfractionRuleId("");
                        }}
                        className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submittingInfraction}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {submittingInfraction ? <Loader2 size={12} className="animate-spin" /> : null}
                        <span>Simpan Poin Langsung ke MySQL 🚀</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : infractionSubTab === 'reduction' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xxs">
                  <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-205">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      ❇️
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">Form Pengurangan Poin Pelanggaran Siswa (Berbasis Persentase %)</h3>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight">
                        Pengurangan poin dihitung berdasarkan persentase (%) dari total akumulasi poin pelanggaran siswa saat ini dan tersimpan langsung ke MySQL.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitReduction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-slate-550 flex items-center gap-1">
                          👤 Pilih Siswa Terkait
                        </label>
                        {reductionStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setReductionStudentSearch('')}
                            className="text-[9px] text-rose-500 hover:underline font-bold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="🔍 Tulis nama murid atau NIS untuk mencari..."
                        value={reductionStudentSearch}
                        onChange={(e) => setReductionStudentSearch(e.target.value)}
                        className="p-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-1"
                      />
                      <select
                        value={reductionStudentId}
                        onChange={(e) => setReductionStudentId(e.target.value)}
                        className="p-2.5 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 pointer-events-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">
                          {reductionStudentSearch
                            ? `-- Hasil Pencarian (${allStudents.filter(s => {
                                const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
                                const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
                                if (isMut || isLulus) return false;
                                return s.name.toLowerCase().includes(reductionStudentSearch.toLowerCase()) || (s.nis && s.nis.toLowerCase().includes(reductionStudentSearch.toLowerCase()));
                              }).length} ditemukan) --`
                            : "-- Pilih Siswa --"}
                        </option>
                        {allStudents
                          .filter(s => {
                            const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
                            const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
                            if (isMut || isLulus) return false;
                            if (!reductionStudentSearch) return true;
                            const term = reductionStudentSearch.toLowerCase();
                            return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                          })
                          .sort((a, b) => {
                            const ptsA = studentPointsMapForReduction.get(a.id) || 0;
                            const ptsB = studentPointsMapForReduction.get(b.id) || 0;
                            if (ptsB !== ptsA) return ptsB - ptsA;
                            return a.name.localeCompare(b.name);
                          })
                          .map(s => {
                            const pts = studentPointsMapForReduction.get(s.id) || 0;
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} (Kelas {s.class}) - NIS: {s.nis} — [Poin Saat Ini: {pts} Poin]
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        📊 Persentase Pengurangan Poin (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="any"
                            value={reductionPercentage}
                            onChange={(e) => setReductionPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                            className="w-full p-2.5 pr-9 border border-slate-250 bg-white rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-700">%</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 mr-1">Pilih Cepat:</span>
                        {[10, 20, 25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setReductionPercentage(pct)}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black border transition-all cursor-pointer ${
                              Number(reductionPercentage) === pct
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ringkasan Kalkulasi Pengurangan Poin Berbasis Persentase */}
                    <div className="md:col-span-2 bg-white border border-emerald-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-2xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total Poin Siswa Saat Ini</span>
                        <span className="text-base font-black text-rose-700 font-mono mt-0.5">
                          {selectedReductionStudentCurrentPoints} Poin
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
                        <span className="text-[10px] font-black uppercase text-emerald-700">
                          Poin Dikurangi ({reductionPercentage || 0}%)
                        </span>
                        <span className="text-base font-black text-emerald-700 font-mono mt-0.5">
                          -{calculatedReductionPoints} Poin
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 flex flex-col">
                        <span className="text-[10px] font-black uppercase text-indigo-700">Sisa Poin Setelah Dikurangi</span>
                        <span className="text-base font-black text-indigo-800 font-mono mt-0.5">
                          {remainingPointsAfterReduction} Poin
                        </span>
                      </div>
                      {reductionStudentId && selectedReductionStudentCurrentPoints <= 0 && (
                        <div className="sm:col-span-3 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          ℹ️ Siswa yang dipilih saat ini memiliki <strong>0 Poin Pelanggaran</strong>, sehingga tidak ada poin yang perlu dikurangi.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 text-left font-semibold">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        📅 Tanggal Penyesuaian
                      </label>
                      <input
                        type="date"
                        value={reductionDate}
                        onChange={(e) => setReductionDate(e.target.value)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left font-semibold">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        ⏱️ Waktu (WIB / Setempat)
                      </label>
                      <input
                        type="time"
                        value={reductionTime}
                        onChange={(e) => setReductionTime(e.target.value)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left font-semibold md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        📝 Alasan Pengurangan Poin (Apresiasi / Perilaku Baik / Hasil Pembinaan BK)
                      </label>
                      <textarea
                        value={reductionReason}
                        onChange={(e) => setReductionReason(e.target.value)}
                        placeholder="Contoh: Siswa menunjukkan komitmen peningkatan kehadiran yang konsisten pasca pembinaan bimbingan konseling dan aktif membantu KBM kelas..."
                        className="p-3 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2 md:col-span-2 border-t border-slate-205 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setInfractionSubTab('student_points_table');
                          setReductionReason("");
                          setReductionStudentId("");
                        }}
                        className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReduction || (!!reductionStudentId && selectedReductionStudentCurrentPoints <= 0)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {submittingReduction ? <Loader2 size={12} className="animate-spin" /> : null}
                        <span>Simpan &amp; Kurangi {reductionPercentage || 0}% Poin Siswa</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : infractionSubTab === 'rubric' ? (
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-xxs flex flex-col gap-5">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-slate-205 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                        📋
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">Master Rubrik Sanksi &amp; Poin Pelanggaran (BAB &amp; SUB BAB — MySQL)</h3>
                        <p className="text-[11px] text-slate-500 font-medium leading-tight">
                          Mendukung Import File Excel/CSV dengan struktur BAB, SUB BAB, Nomor Butir (Contoh: 1.1, 1.2), Sanksi, dan Besar Poin langsung ke database MySQL.
                        </p>
                      </div>
                    </div>

                    {/* Toolbar Template & Import Rubrik Excel/CSV */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadRubricTemplateExcel}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Template Excel Rubrik</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadRubricTemplateCsv}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Template CSV Rubrik</span>
                      </button>
                      <select
                        value={rubricImportMode}
                        onChange={(e) => setRubricImportMode(e.target.value as 'append' | 'replace')}
                        className="bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer"
                        title="Mode Import Rubrik"
                      >
                        <option value="append">Mode: Tambahkan ke Rubrik</option>
                        <option value="replace">Mode: Ganti Seluruh Rubrik</option>
                      </select>
                      <button
                        type="button"
                        disabled={importingRubric}
                        onClick={() => rubricFileInputRef.current?.click()}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        {importingRubric ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>Import Rubrik (Excel/CSV)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Input Form */}
                    <form onSubmit={handleSaveRule} className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3.5 shadow-3xs text-left">
                      <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest block border-b border-slate-100 pb-2">
                        {editingRuleId ? "✏️ Edit Acuan Rubrik Sanksi" : "➕ Tambah Rubrik Sanksi Baru (MySQL)"}
                      </span>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-black text-slate-500 uppercase">BAB (Contoh: BAB 1 Kerapian)</label>
                        <input
                          type="text"
                          value={ruleBabInput}
                          onChange={(e) => setRuleBabInput(e.target.value)}
                          placeholder="Contoh: BAB 1 Kerapian"
                          className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-black text-slate-500 uppercase">SUB BAB (Contoh: SUB BAB 1 Seragam Murid)</label>
                        <input
                          type="text"
                          value={ruleSubBabInput}
                          onChange={(e) => setRuleSubBabInput(e.target.value)}
                          placeholder="Contoh: SUB BAB 1 Seragam Murid"
                          className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="flex flex-col gap-1 col-span-1">
                          <label className="text-[9.5px] font-black text-slate-500 uppercase">Nomor / Kode</label>
                          <input
                            type="text"
                            value={ruleCodeInput}
                            onChange={(e) => setRuleCodeInput(e.target.value)}
                            placeholder="1.1"
                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-[9.5px] font-black text-slate-500 uppercase">Sanksi</label>
                          <input
                            type="text"
                            value={ruleSanctionInput}
                            onChange={(e) => setRuleSanctionInput(e.target.value)}
                            placeholder="Contoh: Teguran Langsung"
                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-black text-slate-500 uppercase">Deskripsi Pelanggaran / Aturan <span className="text-rose-500">*</span></label>
                        <textarea
                          value={ruleNameInput}
                          onChange={(e) => setRuleNameInput(e.target.value)}
                          placeholder="Contoh: 1.1 Corat-coret topi"
                          rows={2}
                          className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-black text-slate-500 uppercase">Besar Poin <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            value={rulePointsInput}
                            onChange={(e) => setRulePointsInput(Number(e.target.value) || 0)}
                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                            min={1}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-black text-slate-500 uppercase">Tingkatan Kasus</label>
                          <select
                            value={ruleCategoryInput}
                            onChange={(e) => setRuleCategoryInput(e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="Ringan">Ringan</option>
                            <option value="Sedang">Sedang</option>
                            <option value="Berat">Berat</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-1">
                        <button
                          type="submit"
                          disabled={loadingRules}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          {editingRuleId ? "Simpan Perubahan ke MySQL" : "Simpan Rubrik ke MySQL"}
                        </button>
                        {editingRuleId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRuleId(null);
                              setRuleBabInput('');
                              setRuleSubBabInput('');
                              setRuleCodeInput('');
                              setRuleNameInput('');
                              setRuleSanctionInput('');
                              setRulePointsInput(2);
                              setRuleCategoryInput('Ringan');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </form>

                    {/* Right: Rules List */}
                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-655 uppercase font-black text-[9.5px] tracking-wide">
                              <th className="p-3 pl-4">No/Kode</th>
                              <th className="p-3">BAB &amp; SUB BAB</th>
                              <th className="p-3">Deskripsi Pelanggaran</th>
                              <th className="p-3">Sanksi</th>
                              <th className="p-3 text-center">Besar Poin</th>
                              <th className="p-3 text-right pr-4">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loadingRules ? (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-400 italic animate-pulse">Memperbarui data acuan dari MySQL...</td>
                              </tr>
                            ) : infractionRules.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-400 font-medium italic">
                                  Belum ada rubrik sanksi di database MySQL. Silakan tambah manual di sebelah kiri atau klik <strong>Import Rubrik (Excel/CSV)</strong> di atas!
                                </td>
                              </tr>
                            ) : (
                              infractionRules.map((rule, rIdx) => (
                                <tr key={rule.id} className="hover:bg-slate-50/50 bg-white transition-colors">
                                  <td className="p-3 pl-4 font-mono font-black text-indigo-700 text-xs whitespace-nowrap">
                                    {getRuleDisplayNumber(rule, rIdx)}
                                  </td>
                                  <td className="p-3 text-slate-600 text-[11px]">
                                    {rule.bab && <div className="font-extrabold text-slate-800">{rule.bab}</div>}
                                    {rule.subBab && <div className="text-slate-500">{rule.subBab}</div>}
                                    {!rule.bab && !rule.subBab && <span className="text-slate-400 italic">-</span>}
                                  </td>
                                  <td className="p-3 text-slate-800 font-bold max-w-xs">
                                    <span className="block" title={rule.name}>{rule.name}</span>
                                  </td>
                                  <td className="p-3 text-slate-700 font-semibold text-[11px]">
                                    {rule.sanction || "-"}
                                  </td>
                                  <td className="p-3 text-center whitespace-nowrap">
                                    <span className="font-black text-rose-600 font-mono text-xs bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                      {rule.points} Poin
                                    </span>
                                  </td>
                                  <td className="p-3 text-right pr-4 shrink-0 whitespace-nowrap font-black">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRuleId(rule.id);
                                        setRuleBabInput(rule.bab || '');
                                        setRuleSubBabInput(rule.subBab || '');
                                        setRuleCodeInput(rule.code || '');
                                        setRuleNameInput(rule.name || '');
                                        setRuleSanctionInput(rule.sanction || '');
                                        setRulePointsInput(rule.points || 2);
                                        setRuleCategoryInput(rule.category || 'Ringan');
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 font-extrabold mr-3 cursor-pointer hover:underline text-[11px]"
                                    >
                                      Sunting
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRule(rule.id)}
                                      className="text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:underline text-[11px]"
                                    >
                                      Hapus
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
                </div>
              ) : (
                /* ================= TAB: DAFTAR KEJADIAN KASUS MASUK ================= */
                <div className="flex flex-col gap-3">
                  {paginatedInfractionsList.map((log) => {
                    const isAutoAlpa =
                      log.source === 'auto_alpa_walas' ||
                      (log.id && log.id.startsWith('sil-alpa-')) ||
                      (log.infractionType && log.infractionType.toLowerCase().includes('alpa (a)'));
                    return (
                      <div key={log.id} className="p-4 bg-slate-50 border border-slate-220 rounded-2xl flex flex-col gap-2 relative">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            {log.points && log.points < 0 ? (
                              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded mr-2 inline-block">❇️ Apresiasi BK</span>
                            ) : isAutoAlpa ? (
                              <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-250 px-2 py-0.5 rounded mr-2 inline-block">
                                ⚡ Otomatis Absensi Alpa Wali Kelas (+5 Poin)
                              </span>
                            ) : log.source === 'import_bk' ? (
                              <span className="text-[9px] font-black uppercase text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded mr-2 inline-block">
                                📤 Import Point BK
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded mr-2 inline-block">🚨 Kasus Masuk</span>
                            )}
                            <span className="font-extrabold text-xs text-slate-905">{log.studentName} (Kelas {log.className})</span>
                            {(log.bab || log.subBab) && (
                              <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
                                {[log.bab, log.subBab].filter(Boolean).join(' › ')}
                              </div>
                            )}
                            <h4 className={`font-extrabold text-sm mt-1 mb-0.5 ${log.points && log.points < 0 ? 'text-emerald-800' : 'text-rose-900'}`}>{log.infractionType}</h4>
                            {log.sanction && (
                              <div className="text-[11px] font-bold text-rose-700">Sanksi: {log.sanction}</div>
                            )}
                            {log.notes && (
                              <div className="text-[11px] text-slate-600 italic">Keterangan Tambahan: "{log.notes}"</div>
                            )}
                          </div>
                          <div className="text-right">
                            {log.points && log.points < 0 ? (
                              <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded font-mono text-xs block text-center">
                                {log.points} pt
                              </span>
                            ) : (
                              <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 font-mono text-xs block text-center">
                                +{log.points || 0} pt
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium mt-1.5 block leading-none">{log.date} ({log.time})</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-150 pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-1 py-1 text-slate-650 text-xs">
                          <div>
                            <strong>Tindak Lanjut:</strong> <span className="italic">"{log.actionTaken}"</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider rounded border ${
                              log.resolutionStatus === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                              log.resolutionStatus === 'Dalam Proses' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                              'bg-slate-100 text-slate-500 border-slate-205'
                            }`}>
                              {log.resolutionStatus}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteInfraction(log.id)}
                              className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 p-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer"
                              title="Hapus Rekam"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredInfractionsList.length === 0 && (
                    <span className="text-slate-400 text-xs font-medium py-8 text-center bg-slate-50 border border-dashed rounded-2xl block">Tidak ada kasus melanggar terdaftar.</span>
                  )}
                  {filteredInfractionsList.length > 0 && (
                    <Pagination
                      currentPage={infractionPage}
                      totalItems={filteredInfractionsList.length}
                      pageSize={infractionPageSize}
                      onPageChange={setInfractionPage}
                      onPageSizeChange={(size) => { setInfractionPageSize(size); setInfractionPage(1); }}
                      pageSizeOptions={[10, 25, 50]}
                      className="mt-2 rounded-2xl border"
                    />
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* 5. TAB MONITORING JURNAL WALAS & KBM */}
          {activeTab === 'journals' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Header Banner */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden text-left">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="bg-teal-50 text-teal-800 border border-teal-200 font-extrabold text-[9.5px] px-2.5 py-1 rounded-full uppercase tracking-widest inline-block mb-1.5">
                      Oversight KBM & Presensi Harian
                    </span>
                    <h2 className="text-slate-900 font-black text-lg leading-tight">
                      📚 Monitoring Jurnal Walas & KBM (Guru Mapel)
                    </h2>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      Pantau seluruh rekaman jurnal pengajaran harian, materi pelajaran, aktivitas wali kelas, dan catatan ketidakhadiran siswa di setiap jam pelajaran. Terkoneksi dengan modul Bimbingan Konseling.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[85px]">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Jurnal</span>
                      <span className="text-base font-black text-slate-900">{teachingJournals.length}</span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-2xl text-center min-w-[85px]">
                      <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Guru Mapel</span>
                      <span className="text-base font-black text-indigo-700">
                        {teachingJournals.filter(j => j.teacherType === 'subject_teacher' || !j.teacherType).length}
                      </span>
                    </div>
                    <div className="bg-teal-50 border border-teal-150 p-3 rounded-2xl text-center min-w-[85px]">
                      <span className="block text-[10px] font-bold text-teal-600 uppercase tracking-wider">Wali Kelas</span>
                      <span className="text-base font-black text-teal-700">
                        {teachingJournals.filter(j => j.teacherType === 'homeroom').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Control Toolbar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-left flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Segment Tabs: Semua / Guru Mapel / Wali Kelas */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setJournalTeacherTypeFilter('all')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        journalTeacherTypeFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Semua Jurnal ({teachingJournals.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalTeacherTypeFilter('subject')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        journalTeacherTypeFilter === 'subject'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Guru Mapel ({teachingJournals.filter(j => j.teacherType === 'subject_teacher' || !j.teacherType).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalTeacherTypeFilter('homeroom')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        journalTeacherTypeFilter === 'homeroom'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Wali Kelas ({teachingJournals.filter(j => j.teacherType === 'homeroom').length})
                    </button>
                  </div>

                  {/* Filter Dropdowns & Search */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Guru Mapel */}
                    <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-xl">
                      <User size={13} className="text-indigo-600 shrink-0" />
                      <span className="text-[10px] font-black text-indigo-700 uppercase">Guru Mapel:</span>
                      <select
                        value={selectedSubjectTeacherFilter}
                        onChange={(e) => setSelectedSubjectTeacherFilter(e.target.value)}
                        className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
                      >
                        <option value="all">Semua Guru Mapel</option>
                        {uniqueSubjectTeacherNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Wali Kelas */}
                    <div className="flex items-center gap-1.5 bg-teal-50/70 border border-teal-100 px-3 py-1.5 rounded-xl">
                      <User size={13} className="text-teal-600 shrink-0" />
                      <span className="text-[10px] font-black text-teal-700 uppercase">Wali Kelas:</span>
                      <select
                        value={selectedHomeroomTeacherFilter}
                        onChange={(e) => setSelectedHomeroomTeacherFilter(e.target.value)}
                        className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer max-w-[180px] truncate"
                      >
                        <option value="all">Semua Wali Kelas</option>
                        {uniqueHomeroomTeacherList.map(item => (
                          <option key={item.name} value={item.name}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Class Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Kelas:</span>
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Semua Kelas</option>
                        {uniqueClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Box */}
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari materi, guru, mapel..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold flex-wrap">
                    <Calendar size={13} className="text-teal-600 shrink-0" />
                    <span>Rentang Tanggal Jurnal:</span>
                    <input
                      type="date"
                      value={journalStartDate}
                      onChange={(e) => setJournalStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                    />
                    <span>s.d.</span>
                    <input
                      type="date"
                      value={journalEndDate}
                      onChange={(e) => setJournalEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                    />
                    {(journalStartDate || journalEndDate || selectedSubjectTeacherFilter !== 'all' || selectedHomeroomTeacherFilter !== 'all' || classFilter !== 'all' || searchQuery) && (
                      <button
                        onClick={() => { 
                          setJournalStartDate(''); 
                          setJournalEndDate(''); 
                          setSelectedSubjectTeacherFilter('all');
                          setSelectedHomeroomTeacherFilter('all');
                          setClassFilter('all');
                          setSearchQuery('');
                        }}
                        className="text-[10px] font-extrabold text-rose-600 hover:underline ml-1 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-black uppercase tracking-wider">
                    {filteredTeachingJournals.length} Jurnal Ditemukan
                  </span>
                </div>
              </div>

              {/* Journal Cards List */}
              {filteredTeachingJournals.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-semibold text-xs leading-relaxed">
                  {teachingJournals.length === 0
                    ? "Belum ada rekam jurnal pengajaran atau jurnal walas terdaftar di server."
                    : "Tidak ada jurnal mengajar yang sesuai dengan kriteria pencarian/filter."}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                  {paginatedTeachingJournals.map((j) => {
                    const isHomeroom = j.teacherType === 'homeroom';
                    const attendanceList = Array.isArray(j.attendance) ? j.attendance : [];
                    const totalC = attendanceList.length;
                    const hadirC = attendanceList.filter((a: any) => a.status === 'Hadir').length;
                    const terlambatC = attendanceList.filter((a: any) => a.status === 'Terlambat').length;
                    const sakitC = attendanceList.filter((a: any) => a.status === 'Sakit').length;
                    const izinC = attendanceList.filter((a: any) => a.status === 'Izin').length;
                    const alpaC = attendanceList.filter((a: any) => a.status === 'Alpa').length;

                    const nonPresent = attendanceList.filter((a: any) => a.status !== 'Hadir' && a.status !== 'Terlambat');

                    return (
                      <div
                        key={j.id}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs transition-all relative overflow-hidden text-left flex flex-col gap-3"
                      >
                        {/* Color indicator bar */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isHomeroom ? 'bg-teal-500' : 'bg-indigo-600'}`} />

                        <div className="pl-2.5 flex flex-col gap-2">
                          {/* Header info */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                isHomeroom ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              }`}>
                                {j.subject || 'Mata Pelajaran'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold ${
                                isHomeroom ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                              }`}>
                                {isHomeroom ? '📂 Jurnal Wali Kelas' : '📖 Jurnal Guru Mapel'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                Kelas {j.className}
                              </span>
                            </div>

                            <div className="text-[11px] font-bold text-slate-400 font-mono">
                              📅 {j.date} {j.jamKe ? `| Jam ke-${j.jamKe}` : ''} {j.pertemuanKe ? `(P. ${j.pertemuanKe})` : ''}
                            </div>
                          </div>

                          {/* Teacher name & topic */}
                          <div className="mt-1">
                            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                              {j.topic || 'Topik Pembelajaran'}
                            </h3>
                            <div className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Pengajar: <strong className="text-slate-800">{j.teacherName}</strong></span>
                              {j.alokasiWaktu && <span className="text-slate-400">• {j.alokasiWaktu}</span>}
                              {j.fase && <span className="text-slate-400">• Fase {j.fase}</span>}
                            </div>
                          </div>

                          {/* Notes & Objectives */}
                          {(j.notes || j.tujuanPembelajaran) && (
                            <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl text-xs text-slate-700 flex flex-col gap-1.5 mt-1">
                              {j.tujuanPembelajaran && (
                                <div>
                                  <strong className="text-slate-800 text-[10.5px] uppercase tracking-wider block font-black">Tujuan Pembelajaran / KKTP:</strong>
                                  <p className="text-slate-600 mt-0.5">{j.tujuanPembelajaran}</p>
                                </div>
                              )}
                              {j.notes && (
                                <div>
                                  <strong className="text-slate-800 text-[10.5px] uppercase tracking-wider block font-black">Catatan KBM / Evaluasi Guru:</strong>
                                  <p className="text-slate-600 mt-0.5">{j.notes}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Presensi Summary Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 mt-1">
                            <div className="flex items-center gap-1.5 flex-wrap text-xs">
                              <span className="font-bold text-slate-500 text-[11px]">Rekap Presensi Siswa ({totalC}):</span>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold text-[10.5px]">
                                Hadir: {hadirC}
                              </span>
                              {terlambatC > 0 && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md font-bold text-[10.5px]">
                                  Terlambat: {terlambatC}
                                </span>
                              )}
                              {sakitC > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-bold text-[10.5px]">
                                  Sakit: {sakitC}
                                </span>
                              )}
                              {izinC > 0 && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold text-[10.5px]">
                                  Izin: {izinC}
                                </span>
                              )}
                              {alpaC > 0 && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md font-bold text-[10.5px]">
                                  Alpa: {alpaC}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Non-present list details */}
                          {nonPresent.length > 0 && (
                            <div className="mt-2 bg-rose-50/40 border border-rose-150 p-3 rounded-2xl flex flex-col gap-2">
                              <span className="text-[10.5px] font-black text-rose-900 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={12} className="text-rose-600" />
                                Siswa Tidak Hadir di Jam Mapel Ini ({nonPresent.length} Siswa):
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {nonPresent.map((st: any, idx: number) => {
                                  const statusColors: { [key: string]: string } = {
                                    "Alpa": "bg-rose-100 text-rose-800 border-rose-200",
                                    "Sakit": "bg-indigo-100 text-indigo-800 border-indigo-200",
                                    "Izin": "bg-amber-100 text-amber-800 border-amber-200"
                                  };

                                  const stdDisplayName = (st.studentName && !st.studentName.startsWith("Siswa (std-"))
                                    ? st.studentName
                                    : getStudentInfo(st.studentId).name;

                                  return (
                                    <div key={idx} className="bg-white border border-rose-100 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                                      <div className="min-w-0 flex-1">
                                        <span className="font-extrabold text-slate-800 text-xs block truncate">
                                          {stdDisplayName}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-extrabold border uppercase ${statusColors[st.status] || "bg-slate-100 text-slate-700"}`}>
                                            {st.status}
                                          </span>
                                          {st.notes && (
                                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                              ({st.notes})
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleInitiateCounseling(
                                          st.studentName,
                                          j.className,
                                          `Ketidakhadiran (${st.status}) pada mata pelajaran ${j.subject} tgl ${j.date}${st.notes ? `: ${st.notes}` : ''}`
                                        )}
                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                                        title="Buat Sesi Bimbingan BK"
                                      >
                                        <Brain size={10} />
                                        <span>BK 🧠</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredTeachingJournals.length > 0 && (
                  <Pagination
                    currentPage={journalsPage}
                    totalItems={filteredTeachingJournals.length}
                    pageSize={journalsPageSize}
                    onPageChange={setJournalsPage}
                    onPageSizeChange={(size) => { setJournalsPageSize(size); setJournalsPage(1); }}
                    pageSizeOptions={[10, 15, 25, 50]}
                    className="mt-4 rounded-2xl border"
                  />
                )}
              </>
              )}
            </motion.div>
          )}

          {/* TAB JADWAL PELAJARAN */}
          {activeTab === 'jadwal' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-left"
            >
              <ScheduleView
                role="bk"
                schedules={classSchedules}
                onRefreshSchedule={onRefresh}
                availableClasses={Array.from(new Set(students.map(s => s.class))).filter(Boolean).sort()}
                subjectTeachers={subjectTeachers}
                homerooms={homerooms}
                academicYear={schoolIdentity?.activeAcademicYear || '2026/2027'}
              />
            </motion.div>
          )}

          {/* 6. TAB BUKU INDUK SISWA INTEGRATED */}
          {activeTab === 'buku_induk' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <BukuIndukManagement
                students={allStudents}
                onUpdateStudent={onUpdateStudent}
                onRefresh={fetchAllData}
              />
            </motion.div>
          )}

        </div>
      )}

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div 
        style={{ contentVisibility: 'auto' }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'home' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Home size={20} className={activeTab === 'home' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'home' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('counseling');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'counseling' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <MessageSquare size={20} className={activeTab === 'counseling' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'counseling' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Bimbingan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('attendance');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'attendance' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Calendar size={20} className={activeTab === 'attendance' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'attendance' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Absensi</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('infractions');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'infractions' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <AlertTriangle size={20} className={activeTab === 'infractions' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'infractions' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Pelanggaran</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${(activeTab === 'jadwal' || showPasswordTab || showMoreMenu) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={(activeTab === 'jadwal' || showPasswordTab || showMoreMenu) ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${(activeTab === 'jadwal' || showPasswordTab || showMoreMenu) ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
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
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-16 left-0 right-0 z-45 bg-white border-t border-slate-200 rounded-t-3xl p-5 shadow-2xl text-left flex flex-col gap-2 max-h-[85vh] overflow-y-auto pb-8"
            >
              {/* Android Top Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 shrink-0" />

              {/* Minimal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h4 className="text-slate-900 font-bold text-sm tracking-tight">
                    Menu Lainnya
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* 3 Horizontal Columns Android App Drawer Grid */}
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 py-2">
                {/* 1. Jadwal */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('jadwal');
                    setShowPasswordTab(false);
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    🗓️
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Jadwal Pelajaran
                  </span>
                </button>

                {/* 2. Jurnal */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('journals');
                    setShowPasswordTab(false);
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    📚
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Jurnal KBM
                  </span>
                </button>

                {/* 3. Buku Induk */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('buku_induk');
                    setShowPasswordTab(false);
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 shadow-md shadow-emerald-600/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    📗
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Buku Induk
                  </span>
                </button>

                {/* 4. Password */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordTab(true);
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    🔑
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Atur Password
                  </span>
                </button>

                {/* 5. Excel Bimbingan */}
                <button
                  type="button"
                  onClick={() => {
                    downloadExcelCounseling();
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md shadow-purple-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    🧠
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Excel BK
                  </span>
                </button>

                {/* 6. Excel Absensi */}
                <button
                  type="button"
                  onClick={() => {
                    downloadExcelAttendance();
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    📊
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Excel Absensi
                  </span>
                </button>

                {/* 7. Excel Disiplin */}
                <button
                  type="button"
                  onClick={() => {
                    downloadExcelInfractions();
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md shadow-orange-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    🚨
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Excel Disiplin
                  </span>
                </button>

                {/* 8. Unduh APK */}
                <button
                  type="button"
                  onClick={() => {
                    if (schoolIdentity?.apkUrl) {
                      window.open(schoolIdentity.apkUrl, "_blank");
                    } else {
                      alert("Link unduhan Android belum disiapkan admin sekolah.");
                    }
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    <Smartphone className="w-7 h-7 text-white stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Unduh APK
                  </span>
                </button>

                {/* 9. Keluar */}
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center justify-start text-center p-2 rounded-2xl active:scale-90 transition-transform cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-rose-500/20 flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform">
                    🚪
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 text-center leading-tight mt-1.5 line-clamp-2 max-w-[85px]">
                    Keluar Sesi
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL CETAK REKAP BIMBINGAN PER SISWA */}
      <AnimatePresence>
        {showPrintStudentModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-left"
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                    <Printer size={18} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Cetak Rekap Bimbingan Per Siswa</h3>
                    <p className="text-[11px] text-slate-500">Pilih siswa untuk mengunduh/mencetak dokumen riwayat bimbingan BK individual.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrintStudentModal(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">🔍 Cari Nama Siswa / NIS</label>
                  <input
                    type="text"
                    placeholder="Tulis nama siswa atau NIS..."
                    value={printStudentSearch}
                    onChange={(e) => setPrintStudentSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">👤 Pilih Siswa Terdaftar</label>
                  <select
                    value={selectedStudentForPrint}
                    onChange={(e) => setSelectedStudentForPrint(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {allStudents
                      .filter(s => {
                        if (!printStudentSearch) return true;
                        const term = printStudentSearch.toLowerCase();
                        return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                      })
                      .map(s => {
                        // Count counseling logs for this student
                        const sLogCount = logs.filter(l => 
                          (l.studentId && l.studentId === s.id) || 
                          (l.studentName && s.name && l.studentName.trim().toLowerCase() === s.name.trim().toLowerCase())
                        ).length;
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} (Kelas {s.class}) — {sLogCount} Sesi Bimbingan
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 text-[11px] text-indigo-900 leading-relaxed font-semibold">
                  ℹ️ Dokumen cetak per siswa mencakup identitas siswa lengkap, daftar kronologi permasalahan, upaya advokasi wali kelas, komitmen siswa, dan masukan solusi resmi dari Guru BK.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPrintStudentModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedStudentForPrint) {
                        alert("Harap pilih siswa terlebih dahulu.");
                        return;
                      }
                      handlePrintStudentLogs(selectedStudentForPrint);
                      setShowPrintStudentModal(false);
                    }}
                    disabled={!selectedStudentForPrint}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    <Printer size={14} />
                    <span>Cetak Rekap Bimbingan</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safety spacing under content for fixed bottom offset on mobile viewports */}
      <div className="h-16 md:hidden"></div>

    </div>
  );
}
