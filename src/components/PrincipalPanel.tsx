import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Student, 
  SppBill, 
  AttendanceLog, 
  HomeroomTeacher, 
  SubjectTeacher, 
  SchoolIdentity,
  PrincipalWorkProgram,
  TeacherEvaluation,
  TeachingJournal,
  StudentCounselingLog,
  StudentInfractionLog,
  isSppBillOverdue,
  sortSppBills,
  ClassSchedule,
  GuestBookEntry
} from '../types';
import QRCode from 'qrcode';
import ScheduleView from './ScheduleView';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  GraduationCap, 
  Users, 
  User,
  BookOpen, 
  ClipboardCheck, 
  Landmark, 
  FileText, 
  Calendar, 
  Award, 
  Settings, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Search, 
  Edit3, 
  Filter, 
  HelpCircle, 
  TrendingUp, 
  ShieldAlert, 
  Heart,
  ChevronRight,
  Info,
  DollarSign,
  LayoutGrid,
  Home,
  Smartphone,
  Apple,
  Download,
  ArrowUpDown,
  Building2,
  QrCode,
  Phone,
  Briefcase,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';

interface PrincipalPanelProps {
  students: Student[];
  bills: SppBill[];
  attendanceLogs: AttendanceLog[];
  homerooms: HomeroomTeacher[];
  subjectTeachers: SubjectTeacher[];
  schoolIdentity: SchoolIdentity;
  onUpdateSchoolIdentity: (newIdentity: SchoolIdentity) => void;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  classSchedules?: ClassSchedule[];
}

export default function PrincipalPanel({
  students,
  bills,
  attendanceLogs,
  homerooms,
  subjectTeachers,
  schoolIdentity,
  onUpdateSchoolIdentity,
  onLogout,
  onRefresh,
  isLoading,
  classSchedules = []
}: PrincipalPanelProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'work_programs' | 'evaluations' | 'journals' | 'bk_monitoring' | 'attendance_recap' | 'finance_monitoring' | 'school_profile' | 'sarpras_monitoring' | 'jadwal' | 'buku_tamu'>('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Guest Book (Buku Tamu) State
  const [guestBooks, setGuestBooks] = useState<GuestBookEntry[]>([]);
  const [loadingGuestBooks, setLoadingGuestBooks] = useState<boolean>(false);
  const [guestBookSearch, setGuestBookSearch] = useState<string>('');
  const [guestBookDateFilter, setGuestBookDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
  const [guestBookStartDate, setGuestBookStartDate] = useState<string>('');
  const [guestBookEndDate, setGuestBookEndDate] = useState<string>('');
  const [guestBookStatusFilter, setGuestBookStatusFilter] = useState<string>('all');
  const [guestBookCategoryTab, setGuestBookCategoryTab] = useState<'all' | 'umum' | 'pembinaan'>('all');
  
  // Modals for Guest Book
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrTypeSelection, setQrTypeSelection] = useState<'all' | 'umum' | 'pembinaan'>('all');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopiedQrLink, setIsCopiedQrLink] = useState<boolean>(false);
  const [isGuestBookModalOpen, setIsGuestBookModalOpen] = useState<boolean>(false);
  const [selectedGuestBookForDetail, setSelectedGuestBookForDetail] = useState<GuestBookEntry | null>(null);
  const [editingGuestBook, setEditingGuestBook] = useState<GuestBookEntry | null>(null);
  const [guestBookFormCategory, setGuestBookFormCategory] = useState<'umum' | 'pembinaan'>('umum');
  const [guestBookFormDate, setGuestBookFormDate] = useState<string>('');
  const [guestBookFormTime, setGuestBookFormTime] = useState<string>('');
  const [guestBookFormName, setGuestBookFormName] = useState<string>('');
  const [guestBookFormPosition, setGuestBookFormPosition] = useState<string>('');
  const [guestBookFormInstitution, setGuestBookFormInstitution] = useState<string>('');
  const [guestBookFormPurpose, setGuestBookFormPurpose] = useState<string>('');
  const [guestBookFormPhone, setGuestBookFormPhone] = useState<string>('');
  const [guestBookFormNotes, setGuestBookFormNotes] = useState<string>('');
  const [guestBookFormSupervisorNip, setGuestBookFormSupervisorNip] = useState<string>('');
  const [guestBookFormCoachingSubject, setGuestBookFormCoachingSubject] = useState<string>('');
  const [guestBookFormFindings, setGuestBookFormFindings] = useState<string>('');
  const [guestBookFormRecommendations, setGuestBookFormRecommendations] = useState<string>('');
  const [guestBookFormFollowUpStatus, setGuestBookFormFollowUpStatus] = useState<string>('Belum');
  const [guestBookFormFollowUpNotes, setGuestBookFormFollowUpNotes] = useState<string>('');
  const [guestBookFormStatus, setGuestBookFormStatus] = useState<string>('Selesai');
  const [isSavingGuestBook, setIsSavingGuestBook] = useState<boolean>(false);

  const fetchGuestBooks = async () => {
    setLoadingGuestBooks(true);
    try {
      const res = await fetch('/api/guest-book');
      if (res.ok) {
        const data = await res.json();
        setGuestBooks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load guest books from MySQL:', err);
    } finally {
      setLoadingGuestBooks(false);
    }
  };

  useEffect(() => {
    fetchGuestBooks();
  }, []);

  // Live QR Code Generator for Front Desk (with dynamic category parameter)
  useEffect(() => {
    if (isQrModalOpen) {
      const param = qrTypeSelection === 'all' ? '' : `&type=${qrTypeSelection}`;
      const targetUrl = `${window.location.origin}/?page=bukutamu${param}`;
      QRCode.toDataURL(targetUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).then(url => {
        setQrDataUrl(url);
      }).catch(err => {
        console.error('Failed to generate QR code for Guest Book:', err);
      });
    }
  }, [isQrModalOpen, qrTypeSelection]);

  // Open Add/Edit Guest Book Modal
  const handleOpenAddGuestBook = (defaultCategory: 'umum' | 'pembinaan' = 'umum') => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    setEditingGuestBook(null);
    setGuestBookFormCategory(defaultCategory);
    setGuestBookFormDate(`${y}-${m}-${day}`);
    setGuestBookFormTime(`${h}:${min}`);
    setGuestBookFormName('');
    setGuestBookFormPosition('');
    setGuestBookFormInstitution('');
    setGuestBookFormPurpose('');
    setGuestBookFormPhone('');
    setGuestBookFormNotes('');
    setGuestBookFormSupervisorNip('');
    setGuestBookFormCoachingSubject('');
    setGuestBookFormFindings('');
    setGuestBookFormRecommendations('');
    setGuestBookFormFollowUpStatus('Belum');
    setGuestBookFormFollowUpNotes('');
    setGuestBookFormStatus('Selesai');
    setIsGuestBookModalOpen(true);
  };

  const handleOpenEditGuestBook = (entry: GuestBookEntry) => {
    setEditingGuestBook(entry);
    setGuestBookFormCategory(entry.category === 'pembinaan' ? 'pembinaan' : 'umum');
    setGuestBookFormDate(entry.date || '');
    setGuestBookFormTime(entry.time || '');
    setGuestBookFormName(entry.name || '');
    setGuestBookFormPosition(entry.position || '');
    setGuestBookFormInstitution(entry.institution || '');
    setGuestBookFormPurpose(entry.purpose || '');
    setGuestBookFormPhone(entry.phone || '');
    setGuestBookFormNotes(entry.notes || '');
    setGuestBookFormSupervisorNip(entry.supervisorNip || '');
    setGuestBookFormCoachingSubject(entry.coachingSubject || '');
    setGuestBookFormFindings(entry.findings || '');
    setGuestBookFormRecommendations(entry.recommendations || '');
    setGuestBookFormFollowUpStatus(entry.followUpStatus || 'Belum');
    setGuestBookFormFollowUpNotes(entry.followUpNotes || '');
    setGuestBookFormStatus(entry.status || 'Selesai');
    setIsGuestBookModalOpen(true);
  };

  const handleSaveGuestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestBookFormName.trim() || !guestBookFormInstitution.trim()) {
      alert('Nama dan Asal Instansi wajib diisi.');
      return;
    }
    if (guestBookFormCategory === 'umum' && !guestBookFormPurpose.trim()) {
      alert('Keperluan Kunjungan wajib diisi untuk Buku Tamu Umum.');
      return;
    }
    if (guestBookFormCategory === 'pembinaan' && !guestBookFormCoachingSubject.trim()) {
      alert('Aspek/Materi Pembinaan wajib diisi untuk Buku Tamu Pembinaan.');
      return;
    }

    setIsSavingGuestBook(true);
    try {
      const payload: Partial<GuestBookEntry> = {
        category: guestBookFormCategory,
        date: guestBookFormDate,
        time: guestBookFormTime,
        name: guestBookFormName.trim(),
        position: guestBookFormPosition.trim(),
        institution: guestBookFormInstitution.trim(),
        purpose: guestBookFormCategory === 'pembinaan' ? (guestBookFormPurpose.trim() || guestBookFormCoachingSubject.trim()) : guestBookFormPurpose.trim(),
        phone: guestBookFormPhone.trim(),
        notes: guestBookFormNotes.trim(),
        supervisorNip: guestBookFormSupervisorNip.trim(),
        coachingSubject: guestBookFormCoachingSubject.trim(),
        findings: guestBookFormFindings.trim(),
        recommendations: guestBookFormRecommendations.trim(),
        followUpStatus: guestBookFormFollowUpStatus,
        followUpNotes: guestBookFormFollowUpNotes.trim(),
        status: guestBookFormStatus
      };

      let res: Response;
      if (editingGuestBook) {
        res = await fetch(`/api/guest-book/${editingGuestBook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/guest-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan ke database MySQL.');
      }

      await fetchGuestBooks();
      setIsGuestBookModalOpen(false);
      setNotifMsg({ 
        type: 'success', 
        text: `Data ${guestBookFormCategory === 'pembinaan' ? 'Buku Tamu Pembinaan' : 'Buku Tamu Umum'} berhasil disimpan langsung ke database MySQL!` 
      });
    } catch (err: any) {
      console.error('Error saving guest book to MySQL:', err);
      alert(err.message || 'Gagal menyimpan data buku tamu.');
    } finally {
      setIsSavingGuestBook(false);
    }
  };

  const handleDeleteGuestBook = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan tamu ini dari database MySQL?')) {
      return;
    }

    try {
      const res = await fetch(`/api/guest-book/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus dari MySQL.');
      }

      setGuestBooks(prev => prev.filter(g => g.id !== id));
      setNotifMsg({ type: 'success', text: 'Catatan buku tamu berhasil dihapus dari database MySQL!' });
    } catch (err: any) {
      console.error('Error deleting guest book from MySQL:', err);
      alert(err.message || 'Gagal menghapus data.');
    }
  };

  // Local state for Principal endpoints
  const [workPrograms, setWorkPrograms] = useState<PrincipalWorkProgram[]>([]);
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);

  // Additional data fetched from endpoints
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [journalFilter, setJournalFilter] = useState<'all' | 'subject' | 'homeroom' | 'absent'>('all');
  const [isSyncingAbsentJournals, setIsSyncingAbsentJournals] = useState(false);
  const [selectedSubjectTeacherFilter, setSelectedSubjectTeacherFilter] = useState<string>('all');
  const [selectedHomeroomTeacherFilter, setSelectedHomeroomTeacherFilter] = useState<string>('all');
  const [journalClassFilter, setJournalClassFilter] = useState<string>('all');
  const [journalSearchQuery, setJournalSearchQuery] = useState<string>('');
  const [journalStartDate, setJournalStartDate] = useState<string>('');
  const [journalEndDate, setJournalEndDate] = useState<string>('');

  // Extract unique subject teachers
  const uniqueSubjectTeacherNames = useMemo(() => {
    const set = new Set<string>();
    if (subjectTeachers) {
      subjectTeachers.forEach(st => { if (st.name) set.add(st.name); });
    }
    journals.forEach(j => {
      if ((j.teacherType === 'subject_teacher' || !j.teacherType) && j.teacherName) {
        set.add(j.teacherName);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subjectTeachers, journals]);

  // Extract unique homeroom teachers
  const uniqueHomeroomTeacherList = useMemo(() => {
    const map = new Map<string, { name: string; className?: string; label: string }>();
    if (homerooms) {
      homerooms.forEach(ht => {
        if (ht.name) {
          const label = ht.className ? `${ht.name} (Wali Kelas ${ht.className})` : ht.name;
          map.set(ht.name, { name: ht.name, className: ht.className, label });
        }
      });
    }
    journals.forEach(j => {
      if (j.teacherType === 'homeroom' && j.teacherName) {
        if (!map.has(j.teacherName)) {
          const label = j.className ? `${j.teacherName} (Wali Kelas ${j.className})` : j.teacherName;
          map.set(j.teacherName, { name: j.teacherName, className: j.className, label });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [homerooms, journals]);

  // Extract unique classes
  const uniqueJournalClasses = useMemo(() => {
    const set = new Set<string>();
    journals.forEach(j => {
      if (j.className) set.add(j.className);
    });
    return Array.from(set).sort();
  }, [journals]);

  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const isAbsent = (j.topic || '').includes('Tidak Hadir') || (j.notes || '') === 'Tidak Hadir';
      if (journalFilter === 'subject' && (j.teacherType === 'homeroom' || isAbsent)) return false;
      if (journalFilter === 'homeroom' && j.teacherType !== 'homeroom') return false;
      if (journalFilter === 'absent' && !isAbsent) return false;

      // Subject Teacher Filter
      if (selectedSubjectTeacherFilter !== 'all' && j.teacherName !== selectedSubjectTeacherFilter) return false;

      // Homeroom Teacher Filter
      if (selectedHomeroomTeacherFilter !== 'all' && j.teacherName !== selectedHomeroomTeacherFilter) return false;

      // Class Filter
      if (journalClassFilter !== 'all' && j.className !== journalClassFilter) return false;

      // Search Query
      if (journalSearchQuery.trim()) {
        const q = journalSearchQuery.toLowerCase();
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
    journals, 
    journalFilter, 
    selectedSubjectTeacherFilter, 
    selectedHomeroomTeacherFilter, 
    journalClassFilter, 
    journalSearchQuery, 
    journalStartDate, 
    journalEndDate
  ]);
  const [counselingLogs, setCounselingLogs] = useState<StudentCounselingLog[]>([]);
  const [infractionLogs, setInfractionLogs] = useState<StudentInfractionLog[]>([]);
  const [loadingSecondaryData, setLoadingSecondaryData] = useState(false);

  // Sarpras Monitoring States
  const [sarprasProposals, setSarprasProposals] = useState<any[]>([]);
  const [sarprasItems, setSarprasItems] = useState<any[]>([]);
  const [sarprasLoans, setSarprasLoans] = useState<any[]>([]);
  const [loadingSarpras, setLoadingSarpras] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState<{[key: string]: string}>({});
  const [loanSearchQuery, setLoanSearchQuery] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('Semua');

  const fetchSarprasData = async () => {
    setLoadingSarpras(true);
    try {
      const [resProposals, resItems, resLoans] = await Promise.all([
        fetch('/api/sarpras/proposals').then(r => r.ok ? r.json() : []),
        fetch('/api/sarpras/items').then(r => r.ok ? r.json() : []),
        fetch('/api/sarpras/loans').then(r => r.ok ? r.json() : [])
      ]);
      setSarprasProposals(resProposals);
      setSarprasItems(resItems);
      setSarprasLoans(resLoans);
    } catch (e) {
      console.error("Gagal menjaring data sarpras untuk kepala:", e);
    } finally {
      setLoadingSarpras(false);
    }
  };

  const handleUpdateProposalStatus = async (id: string, status: 'approved' | 'rejected') => {
    const notes = approvalNotes[id] || '';
    if (status === 'rejected' && !notes.trim()) {
      alert('Harap berikan catatan alasan penolakan.');
      return;
    }
    
    try {
      const res = await fetch(`/api/sarpras/proposals/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        const data = await res.json();
        setSarprasProposals(data.sarprasProposals);
        if (status === 'approved') {
          fetchFinancialTransactions();
        }
        alert(`Berhasil! Pengajuan telah ${status === 'approved' ? 'disetujui dan kas keluar otomatis dicatat' : 'ditolak'}.`);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal memproses pengajuan.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi ke server.");
    }
  };

  // Financial Monitoring States
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [financeSearch, setFinanceSearch] = useState('');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState('all');
  const [financeSourceFilter, setFinanceSourceFilter] = useState<'all' | 'spp' | 'savings' | 'custom'>('all');

  // Password update states
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // UI state
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Work program edit modal/form state
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programTitle, setProgramTitle] = useState('');
  const [programDesc, setProgramDesc] = useState('');
  const [programDate, setProgramDate] = useState('');
  const [programStatus, setProgramStatus] = useState<'planned' | 'active' | 'completed'>('planned');
  const [programSync, setProgramSync] = useState(true);

  // Evaluation form state
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [evalPedagogic, setEvalPedagogic] = useState(85);
  const [evalProfessional, setEvalProfessional] = useState(85);
  const [evalPersonal, setEvalPersonal] = useState(85);
  const [evalSocial, setEvalSocial] = useState(85);
  const [evalNotes, setEvalNotes] = useState('');
  const [evalAcademicYear, setEvalAcademicYear] = useState(schoolIdentity?.activeAcademicYear || '2026/2027');
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (schoolIdentity?.activeAcademicYear) {
      setEvalAcademicYear(schoolIdentity.activeAcademicYear);
    }
  }, [schoolIdentity?.activeAcademicYear]);

  // Student specific inspection state (Lookup Roster)
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // School identity editing states
  const [idName, setIdName] = useState(schoolIdentity.name);
  const [idSubheading, setIdSubheading] = useState(schoolIdentity.subheading);
  const [idAccreditation, setIdAccreditation] = useState(schoolIdentity.accreditation);
  const [idAddress, setIdAddress] = useState(schoolIdentity.address);
  const [idPhone, setIdPhone] = useState(schoolIdentity.phone);
  const [idPrincipal, setIdPrincipal] = useState(schoolIdentity.principal);
  const [idTreasurer, setIdTreasurer] = useState(schoolIdentity.treasurer);
  const [idLetterhead, setIdLetterhead] = useState(schoolIdentity.letterhead || '');
  const [idLogo, setIdLogo] = useState(schoolIdentity.logo || '');
  const [idStamp, setIdStamp] = useState(schoolIdentity.schoolStamp || '');
  const [idFavicon, setIdFavicon] = useState(schoolIdentity.favicon || '');

  // Fetch Principal Work Programs
  const fetchWorkPrograms = async () => {
    setLoadingPrograms(true);
    try {
      const res = await fetch('/api/principal/work-programs');
      if (res.ok) {
        const data = await res.json();
        setWorkPrograms(data);
      }
    } catch (e) {
      console.error("Gagal menjaring program kerja:", e);
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Fetch Teacher evaluations
  const fetchEvaluations = async () => {
    setLoadingEvaluations(true);
    try {
      const res = await fetch('/api/principal/teacher-evaluations');
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data);
      }
    } catch (e) {
      console.error("Gagal menjaring data penilaian guru:", e);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  // Fetch financial transactions for Treasurer monitoring
  const fetchFinancialTransactions = async () => {
    setLoadingFinance(true);
    try {
      const res = await fetch('/api/treasurer/transactions');
      if (res.ok) {
        const data = await res.json();
        setFinancialTransactions(data);
      }
    } catch (e) {
      console.error("Gagal menjaring data transaksi keuangan:", e);
    } finally {
      setLoadingFinance(false);
    }
  };

  // Fetch related monitoring data
  const fetchSecondaryMonitoringData = async () => {
    setLoadingSecondaryData(true);
    try {
      const [resJournals, resCounsel, resInfract] = await Promise.all([
        fetch('/api/teaching-journals').then(r => r.ok ? r.json() : []),
        fetch('/api/student-counseling-logs').then(r => r.ok ? r.json() : []),
        fetch('/api/student-infraction-logs').then(r => r.ok ? r.json() : [])
      ]);
      setJournals(resJournals);
      setCounselingLogs(resCounsel);
      setInfractionLogs(resInfract);
    } catch (e) {
      console.error("Gagal menjaring data pelengkap monitoring:", e);
    } finally {
      setLoadingSecondaryData(false);
    }
  };

  const handleSyncAbsentJournals = async () => {
    setIsSyncingAbsentJournals(true);
    try {
      const res = await fetch('/api/curriculum/restore-missing-data-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: '2026-09-11', endDate: '2026-09-19' })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Sinkronisasi berhasil dijalankan.');
        await fetchSecondaryMonitoringData();
      } else {
        alert(data.error || 'Gagal melakukan sinkronisasi data.');
      }
    } catch (e: any) {
      alert('Kesalahan koneksi: ' + (e?.message || e));
    } finally {
      setIsSyncingAbsentJournals(false);
    }
  };

  useEffect(() => {
    fetchWorkPrograms();
    fetchEvaluations();
    fetchSecondaryMonitoringData();
    fetchFinancialTransactions();
    fetchSarprasData();
  }, []);

  // Set default student if search matching is clear
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students]);

  // Form Reset Helpers
  const resetProgramForm = () => {
    setEditingProgramId(null);
    setProgramTitle('');
    setProgramDesc('');
    setProgramDate(new Date().toISOString().split('T')[0]);
    setProgramStatus('planned');
    setProgramSync(true);
    setShowProgramForm(false);
  };

  const resetEvalForm = () => {
    setSelectedTeacherId(homerooms[0]?.id || subjectTeachers[0]?.id || '');
    setEvalPedagogic(85);
    setEvalProfessional(85);
    setEvalPersonal(85);
    setEvalSocial(85);
    setEvalNotes('');
    setShowEvalForm(false);
  };

  // CRUD program kerja
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programTitle.trim() || !programDesc.trim()) {
      setNotifMsg({ type: 'error', text: 'Judul dan Deskripsi wajib dilengkapi.' });
      return;
    }

    try {
      const payload = {
        id: editingProgramId || undefined,
        title: programTitle,
        description: programDesc,
        targetDate: programDate || new Date().toISOString().split('T')[0],
        status: programStatus,
        syncWithStaff: programSync
      };

      const res = await fetch('/api/principal/work-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setWorkPrograms(result.principalWorkPrograms);
        setNotifMsg({ 
          type: 'success', 
          text: editingProgramId ? 'Program kerja berhasil diperbarui.' : 'Program kerja baru berhasil ditambahkan.' 
        });
        resetProgramForm();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal memproses program kerja ke server.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Koneksi bermasalah. Gagal menyimpan.' });
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm('Hapus program kerja kepala sekolah ini?')) return;
    try {
      const res = await fetch(`/api/principal/work-programs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const result = await res.json();
        setWorkPrograms(result.principalWorkPrograms);
        setNotifMsg({ type: 'success', text: 'Program kerja berhasil terhapus.' });
      }
    } catch (e) {
      setNotifMsg({ type: 'error', text: 'Gagal menghapus dari server.' });
    }
  };

  const handleEditProgramClick = (p: PrincipalWorkProgram) => {
    setEditingProgramId(p.id);
    setProgramTitle(p.title);
    setProgramDesc(p.description);
    setProgramDate(p.targetDate);
    setProgramStatus(p.status);
    setProgramSync(p.syncWithStaff);
    setShowProgramForm(true);
  };

  // CRUD Penilaian Kinerja Guru
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setNotifMsg({ type: 'error', text: 'Harap pilih guru terlebih dahulu.' });
      return;
    }

    // Identify teacher name and type
    const hr = homerooms.find(t => t.id === selectedTeacherId);
    const st = subjectTeachers.find(t => t.id === selectedTeacherId);
    const teacherName = hr ? hr.name : (st ? st.name : 'Unknown Guru');
    const teacherType = hr ? 'homeroom' : 'subject_teacher';

    try {
      const payload = {
        teacherId: selectedTeacherId,
        teacherName,
        teacherType,
        evaluatorName: schoolIdentity.principal || "H. Ahmad Fuad, S.Pd, M.PdI",
        date: evalDate,
        academicYear: evalAcademicYear,
        pedagogicScore: evalPedagogic,
        professionalScore: evalProfessional,
        personalScore: evalPersonal,
        socialScore: evalSocial,
        notes: evalNotes
      };

      const res = await fetch('/api/principal/teacher-evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setEvaluations(result.teacherEvaluations);
        setNotifMsg({ type: 'success', text: 'Penilaian Kinerja Guru berhasil disimpan!' });
        resetEvalForm();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal memproses penilaian guru ke server.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Koneksi lambat. Gagal menyimpan penilaian.' });
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (!window.confirm('Hapus riwayat penilaian kinerja guru ini?')) return;
    try {
      const res = await fetch(`/api/principal/teacher-evaluations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const result = await res.json();
        setEvaluations(result.teacherEvaluations);
        setNotifMsg({ type: 'success', text: 'Penilaian terhapus.' });
      }
    } catch (e) {
      setNotifMsg({ type: 'error', text: 'Gagal menghapus penilaian dari server.' });
    }
  };

  // Save school profile identity info
  const handleSaveSchoolIdentity = () => {
    const updated = {
      ...schoolIdentity,
      name: idName,
      subheading: idSubheading,
      accreditation: idAccreditation,
      address: idAddress,
      phone: idPhone,
      principal: idPrincipal,
      treasurer: idTreasurer,
      logo: idLogo,
      letterhead: idLetterhead,
      schoolStamp: idStamp,
      favicon: idFavicon
    };
    onUpdateSchoolIdentity(updated);
    setNotifMsg({ type: 'success', text: 'Identitas Sekolah berhasil diperbarui secara komprehensif!' });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!oldPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      setPwdMsg({ type: 'error', text: 'Semua kolom kata sandi wajib diisi.' });
      return;
    }
    if (newPasswordInput.length < 5) {
      setPwdMsg({ type: 'error', text: 'Sandi baru minimal harus 5 karakter.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPwdMsg({ type: 'error', text: 'Konfirmasi sandi baru tidak cocok dengan kata sandi baru.' });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/principal/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: oldPasswordInput,
          newPassword: newPasswordInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg({ type: 'success', text: 'Sandi Kepala Sekolah berhasil diperbarui secara aman!' });
        setOldPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        setPwdMsg({ type: 'error', text: data.error || 'Gagal merubah kata sandi Kepala Sekolah.' });
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'Gagal terhubung dengan server.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Active students excluding mutasi and alumni
  const activeStudents = useMemo(() => {
    return students.filter(s => {
      const isMut = !!s.mutationDate || (s.class && (s.class.toLowerCase() === 'mutasi' || s.class.toLowerCase() === 'mutasi keluar'));
      const isLulus = s.class && (s.class.toLowerCase() === 'lulus' || s.class.toLowerCase() === 'lulusan');
      return !isMut && !isLulus;
    });
  }, [students]);

  // Global statistics and metrics calculations
  const totalStudents = activeStudents.length;

  // Gender stats
  const genderStats = useMemo(() => {
    let laki = 0;
    let perempuan = 0;
    let unspecified = 0;
    activeStudents.forEach(s => {
      const g = (s.gender || '').trim().toLowerCase();
      if (g === 'laki-laki' || g === 'l' || g.startsWith('laki') || g === 'laki laki') {
        laki++;
      } else if (g === 'perempuan' || g === 'p' || g.startsWith('perem')) {
        perempuan++;
      } else {
        unspecified++;
      }
    });
    return { laki, perempuan, unspecified };
  }, [activeStudents]);

  // Class stats
  const classStats = useMemo(() => {
    const counts: { [className: string]: { total: number; laki: number; perempuan: number } } = {};
    activeStudents.forEach(s => {
      const cls = s.class || 'Tanpa Kelas';
      if (!counts[cls]) {
        counts[cls] = { total: 0, laki: 0, perempuan: 0 };
      }
      counts[cls].total++;
      const g = (s.gender || '').trim().toLowerCase();
      if (g === 'laki-laki' || g === 'l' || g.startsWith('laki') || g === 'laki laki') {
        counts[cls].laki++;
      } else if (g === 'perempuan' || g === 'p' || g.startsWith('perem')) {
        counts[cls].perempuan++;
      }
    });

    // Sort classes
    const sortedClasses = Object.keys(counts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return sortedClasses.map(className => ({
      class: className,
      total: counts[className].total,
      laki: counts[className].laki,
      perempuan: counts[className].perempuan
    }));
  }, [activeStudents]);
  
  // SPP statistics
  const sppTotalInvoiced = bills.length;
  const sppPaidBillList = bills.filter(b => b.status === 'paid');
  const sppPaidCount = sppPaidBillList.length;
  const sppUnpaidBillList = bills.filter(b => b.status === 'unpaid');
  const sppPendingBillList = bills.filter(b => b.status === 'pending');

  const totalSppRevenue = useMemo(() => {
    return sppPaidBillList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [sppPaidBillList]);

  // Student savings metrics
  const totalSavingsBalance = useMemo(() => {
    return activeStudents.reduce((sum, s) => sum + (Number(s.savingsBalance) || 0), 0);
  }, [activeStudents]);

  // Attendance metrics
  const attendanceRate = useMemo(() => {
    if (attendanceLogs.length === 0) return 0;
    const presentCount = attendanceLogs.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length;
    return Math.round((presentCount / attendanceLogs.length) * 100);
  }, [attendanceLogs]);

  // Teacher Counts
  const totalTeachers = homerooms.length + subjectTeachers.length;

  // Monthly revenue chart mapping (from SPP paid bills)
  const monthlyRevenueData = useMemo(() => {
    const monthsOrder = ["Juli", "Agustus", "September", "Oktober", "November", "Desember", "Januari", "Februari", "Maret", "April", "Mei", "Juni"];
    const mapper: Record<string, number> = {};
    monthsOrder.forEach(m => { mapper[m] = 0; });

    sppPaidBillList.forEach(b => {
      if (mapper[b.month] !== undefined) {
        mapper[b.month] += Number(b.amount) || 0;
      }
    });

    return monthsOrder.map(month => ({
      Bulan: month,
      Pendapatan: mapper[month]
    }));
  }, [sppPaidBillList]);

  // Grade Attendance counts
  const attendancePieData = useMemo(() => {
    const statusMap = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
    attendanceLogs.forEach(l => {
      if (statusMap[l.status] !== undefined) statusMap[l.status]++;
    });

    return [
      { name: 'Hadir', value: statusMap.Hadir, color: '#10b981' },
      { name: 'Terlambat', value: statusMap.Terlambat, color: '#f59e0b' },
      { name: 'Izin', value: statusMap.Izin, color: '#6366f1' },
      { name: 'Sakit', value: statusMap.Sakit, color: '#8b5cf6' },
      { name: 'Alpa (A)', value: statusMap.Alpa, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [attendanceLogs]);

  // Filter students based on lookup query
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
      s.nis.includes(searchStudentQuery) ||
      s.class.toLowerCase().includes(searchStudentQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchStudentQuery]);

  // Inspected student data
  const inspectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  const inspectedStudentBills = useMemo(() => {
    if (!inspectedStudent) return [];
    return sortSppBills(bills.filter(b => b.studentId === inspectedStudent.id));
  }, [inspectedStudent, bills]);

  const inspectedStudentAttendance = useMemo(() => {
    if (!inspectedStudent) return [];
    return attendanceLogs.filter(l => l.studentId === inspectedStudent.id);
  }, [inspectedStudent, attendanceLogs]);

  const inspectedStudentCounseling = useMemo(() => {
    if (!inspectedStudent) return [];
    return counselingLogs.filter(l => l.studentId === inspectedStudent.id);
  }, [inspectedStudent, counselingLogs]);

  const inspectedStudentInfractions = useMemo(() => {
    if (!inspectedStudent) return [];
    return infractionLogs.filter(l => l.studentId === inspectedStudent.id);
  }, [inspectedStudent, infractionLogs]);

  const filteredLoans = useMemo(() => {
    return sarprasLoans.filter((l) => {
      const matchStatus = loanStatusFilter === 'Semua' || l.status === loanStatusFilter;
      const cleanBorrower = String(l.borrowerName || '').toLowerCase();
      const cleanItem = String(l.itemName || '').toLowerCase();
      const cleanId = String(l.borrowerId || '').toLowerCase();
      const query = loanSearchQuery.toLowerCase().trim();
      const matchSearch = !query || cleanBorrower.includes(query) || cleanItem.includes(query) || cleanId.includes(query);
      return matchStatus && matchSearch;
    });
  }, [sarprasLoans, loanSearchQuery, loanStatusFilter]);

  const totalAssetValue = useMemo(() => {
    return sarprasItems.reduce((acc, item) => {
      const p = Number(item.price || 0);
      const q = Number(item.totalQty || 0);
      return acc + (p * q);
    }, 0);
  }, [sarprasItems]);

  // Format Helper
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Attendance Recap State for Principal
  const [rekapStartDate, setRekapStartDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [rekapEndDate, setRekapEndDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [rekapClassFilter, setRekapClassFilter] = useState<string>('all');
  const [rekapSearchQuery, setRekapSearchQuery] = useState<string>('');
  const [rekapStatusFilter, setRekapStatusFilter] = useState<string>('all');
  const [rekapSortBy, setRekapSortBy] = useState<'name' | 'class' | 'hadir' | 'sakit' | 'izin' | 'alpha' | 'terlambat' | 'pct'>('class');
  const [rekapSortOrder, setRekapSortOrder] = useState<'asc' | 'desc'>('asc');

  const availableClassesForPrincipal = useMemo(() => {
    const set = new Set<string>();
    (homerooms || []).forEach(h => { if (h.className) set.add(h.className.trim()); });
    (students || []).forEach(s => { if (s.class) set.add(s.class.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [homerooms, students]);

  const filteredRekapLogsPrincipal = useMemo(() => {
    return (attendanceLogs || []).filter(l => {
      if (!l) return false;
      let logDate = l.date ? l.date.substring(0, 10) : '';
      if (logDate.includes('/')) {
        const parts = logDate.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
          logDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      if (rekapStartDate && logDate < rekapStartDate) return false;
      if (rekapEndDate && logDate > rekapEndDate) return false;
      return true;
    });
  }, [attendanceLogs, rekapStartDate, rekapEndDate]);

  const rekapSiswaPrincipalList = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];

    const logsByStudentMap = new Map<string, AttendanceLog[]>();
    filteredRekapLogsPrincipal.forEach(log => {
      if (!log.studentId) return;
      const key = log.studentId.trim().toLowerCase();
      if (!logsByStudentMap.has(key)) {
        logsByStudentMap.set(key, []);
      }
      logsByStudentMap.get(key)!.push(log);
    });

    const list = students.filter(s => {
      if (!s || s.status === 'Lulus' || s.status === 'Keluar' || s.status === 'Mutasi') return false;
      if (rekapClassFilter !== 'all') {
        const sClass = (s.class || '').trim().toLowerCase();
        const targetClass = rekapClassFilter.trim().toLowerCase();
        if (sClass !== targetClass) return false;
      }
      if (rekapSearchQuery.trim()) {
        const q = rekapSearchQuery.toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchNis = (s.nis || '').toLowerCase().includes(q);
        if (!matchName && !matchNis) return false;
      }
      return true;
    }).map(student => {
      const sId = (student.id || '').trim().toLowerCase();
      const sNis = (student.nis || '').trim().toLowerCase();

      const logs = [
        ...(logsByStudentMap.get(sId) || []),
        ...(sNis && sNis !== sId ? (logsByStudentMap.get(sNis) || []) : [])
      ];

      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpha = 0;
      let terlambat = 0;

      const dateSeen = new Set<string>();
      logs.forEach(l => {
        const d = l.date ? l.date.substring(0, 10) : '';
        if (d && dateSeen.has(d)) return;
        if (d) dateSeen.add(d);

        const st = (l.status || '').toLowerCase();
        if (st.includes('hadir') || st === 'h') {
          hadir++;
        } else if (st.includes('sakit') || st === 's') {
          sakit++;
        } else if (st.includes('izin') || st === 'i') {
          izin++;
        } else if (st.includes('alpha') || st.includes('alpa') || st === 'a') {
          alpha++;
        } else if (st.includes('terlambat') || st === 't') {
          terlambat++;
        } else {
          hadir++;
        }
      });

      const totalHari = hadir + sakit + izin + alpha + terlambat;
      const totalHadirEffective = hadir + terlambat;
      const pct = totalHari > 0 ? Math.round((totalHadirEffective / totalHari) * 100) : 100;

      return {
        student,
        hadir,
        sakit,
        izin,
        alpha,
        terlambat,
        totalHari,
        pct
      };
    });

    let filtered = list;
    if (rekapStatusFilter === 'Hadir') filtered = list.filter(r => r.hadir > 0);
    else if (rekapStatusFilter === 'Sakit') filtered = list.filter(r => r.sakit > 0);
    else if (rekapStatusFilter === 'Izin') filtered = list.filter(r => r.izin > 0);
    else if (rekapStatusFilter === 'Alpha') filtered = list.filter(r => r.alpha > 0);
    else if (rekapStatusFilter === 'Terlambat') filtered = list.filter(r => r.terlambat > 0);

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (rekapSortBy === 'name') {
        cmp = (a.student.name || '').localeCompare(b.student.name || '');
      } else if (rekapSortBy === 'class') {
        cmp = (a.student.class || '').localeCompare(b.student.class || '', 'id', { numeric: true });
        if (cmp === 0) cmp = (a.student.name || '').localeCompare(b.student.name || '');
      } else if (rekapSortBy === 'hadir') {
        cmp = a.hadir - b.hadir;
      } else if (rekapSortBy === 'sakit') {
        cmp = a.sakit - b.sakit;
      } else if (rekapSortBy === 'izin') {
        cmp = a.izin - b.izin;
      } else if (rekapSortBy === 'alpha') {
        cmp = a.alpha - b.alpha;
      } else if (rekapSortBy === 'terlambat') {
        cmp = a.terlambat - b.terlambat;
      } else if (rekapSortBy === 'pct') {
        cmp = a.pct - b.pct;
      }
      return rekapSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [students, filteredRekapLogsPrincipal, rekapClassFilter, rekapSearchQuery, rekapStatusFilter, rekapSortBy, rekapSortOrder]);

  const totalRekapHadir = useMemo(() => rekapSiswaPrincipalList.reduce((acc, curr) => acc + curr.hadir, 0), [rekapSiswaPrincipalList]);
  const totalRekapSakit = useMemo(() => rekapSiswaPrincipalList.reduce((acc, curr) => acc + curr.sakit, 0), [rekapSiswaPrincipalList]);
  const totalRekapIzin = useMemo(() => rekapSiswaPrincipalList.reduce((acc, curr) => acc + curr.izin, 0), [rekapSiswaPrincipalList]);
  const totalRekapAlpha = useMemo(() => rekapSiswaPrincipalList.reduce((acc, curr) => acc + curr.alpha, 0), [rekapSiswaPrincipalList]);
  const totalRekapTerlambat = useMemo(() => rekapSiswaPrincipalList.reduce((acc, curr) => acc + curr.terlambat, 0), [rekapSiswaPrincipalList]);
  const avgPctKehadiran = rekapSiswaPrincipalList.length > 0
    ? Math.round(rekapSiswaPrincipalList.reduce((acc, curr) => acc + curr.pct, 0) / rekapSiswaPrincipalList.length)
    : 100;

  const rekapPerKelasSummary = useMemo(() => {
    const map = new Map<string, { className: string; waliKelas: string; totalSiswa: number; hadir: number; sakit: number; izin: number; alpha: number; terlambat: number }>();

    availableClassesForPrincipal.forEach(cls => {
      const ht = homerooms?.find(h => (h.className || '').trim().toLowerCase() === cls.trim().toLowerCase());
      map.set(cls, {
        className: cls,
        waliKelas: ht?.name || '-',
        totalSiswa: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        terlambat: 0
      });
    });

    rekapSiswaPrincipalList.forEach(item => {
      const cls = item.student.class || 'Lainnya';
      if (!map.has(cls)) {
        map.set(cls, {
          className: cls,
          waliKelas: '-',
          totalSiswa: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
          terlambat: 0
        });
      }
      const entry = map.get(cls)!;
      entry.totalSiswa += 1;
      entry.hadir += item.hadir;
      entry.sakit += item.sakit;
      entry.izin += item.izin;
      entry.alpha += item.alpha;
      entry.terlambat += item.terlambat;
    });

    return Array.from(map.values()).filter(c => c.totalSiswa > 0 || rekapClassFilter === 'all').sort((a, b) => a.className.localeCompare(b.className, 'id', { numeric: true }));
  }, [availableClassesForPrincipal, homerooms, rekapSiswaPrincipalList, rekapClassFilter]);

  const handlePrintPdfPrincipalAttendance = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup diblokir oleh browser. Izinkan popup untuk mencetak laporan.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP Maarif";
    const schoolAddress = schoolIdentity?.address || "";
    const principalName = schoolIdentity?.principal || "Kepala Sekolah";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rekapitulasi Presensi Siswa - ${schoolName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; color: #0f172a; }
            .header p { margin: 2px 0; font-size: 11px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; text-align: center; font-size: 10px; text-transform: uppercase; }
            .text-center { text-align: center; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature-box { text-align: center; width: 220px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${schoolIdentity?.letterhead ? `
            <div style="width: 100%; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
              <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block;" />
            </div>
          ` : `
            <div class="header">
              <h2>${schoolName}</h2>
              <p>${schoolAddress}</p>
            </div>
          `}
          <h3 style="text-align: center; margin-top: 8px; font-size: 13px; font-weight: bold; text-transform: uppercase;">REKAPITULASI PRESENSI & KEHADIRAN SISWA</h3>
          <p style="text-align: center;">Periode: ${rekapStartDate} s.d. ${rekapEndDate} ${rekapClassFilter !== 'all' ? `| Kelas: ${rekapClassFilter}` : '| Semua Kelas'}</p>

          <div style="margin-bottom: 10px; font-weight: bold; font-size: 11px;">
            Ringkasan: Total Siswa (${rekapSiswaPrincipalList.length}) | Total Hadir (${totalRekapHadir}) | Sakit (${totalRekapSakit}) | Izin (${totalRekapIzin}) | Alpha (${totalRekapAlpha}) | Terlambat (${totalRekapTerlambat}) | Rata-rata Kehadiran (${avgPctKehadiran}%)
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th style="width: 80px;">NIS</th>
                <th>Nama Siswa</th>
                <th style="width: 60px;">Kelas</th>
                <th style="width: 45px;">Hadir</th>
                <th style="width: 45px;">Sakit</th>
                <th style="width: 45px;">Izin</th>
                <th style="width: 45px;">Alpha</th>
                <th style="width: 45px;">Terlambat</th>
                <th style="width: 60px;">Total Hari</th>
                <th style="width: 60px;">% Hadir</th>
              </tr>
            </thead>
            <tbody>
              ${rekapSiswaPrincipalList.map((item, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center">${item.student.nis || '-'}</td>
                  <td><strong>${item.student.name}</strong></td>
                  <td class="text-center">${item.student.class || '-'}</td>
                  <td class="text-center" style="color: #059669; font-weight: bold;">${item.hadir}</td>
                  <td class="text-center" style="color: #2563eb;">${item.sakit}</td>
                  <td class="text-center" style="color: #d97706;">${item.izin}</td>
                  <td class="text-center" style="color: #dc2626; font-weight: bold;">${item.alpha}</td>
                  <td class="text-center" style="color: #7c3aed;">${item.terlambat}</td>
                  <td class="text-center">${item.totalHari}</td>
                  <td class="text-center" style="font-weight: bold;">${item.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div></div>
            <div class="signature-box">
              <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin-bottom: 60px;">Kepala Sekolah</p>
              <p><strong>${principalName}</strong></p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleDownloadPrincipalAttendanceXLS = () => {
    let content = "No\tNIS\tNama Siswa\tKelas\tHadir\tSakit\tIzin\tAlpha\tTerlambat\tTotal Hari\t% Kehadiran\n";
    rekapSiswaPrincipalList.forEach((item, idx) => {
      content += `${idx + 1}\t${item.student.nis || '-'}\t${item.student.name}\t${item.student.class || '-'}\t${item.hadir}\t${item.sakit}\t${item.izin}\t${item.alpha}\t${item.terlambat}\t${item.totalHari}\t${item.pct}%\n`;
    });

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Presensi_KepalaSekolah_${rekapStartDate}_to_${rekapEndDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered guest book entries
  const filteredGuestBooks = useMemo(() => {
    return guestBooks.filter(item => {
      // 0. Category filter
      if (guestBookCategoryTab !== 'all') {
        const itemCat = item.category || 'umum';
        if (itemCat !== guestBookCategoryTab) return false;
      }

      // 1. Search Query
      if (guestBookSearch.trim()) {
        const q = guestBookSearch.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchInst = (item.institution || '').toLowerCase().includes(q);
        const matchPurp = (item.purpose || '').toLowerCase().includes(q);
        const matchPos = (item.position || '').toLowerCase().includes(q);
        const matchPhone = (item.phone || '').toLowerCase().includes(q);
        const matchSubj = (item.coachingSubject || '').toLowerCase().includes(q);
        const matchFindings = (item.findings || '').toLowerCase().includes(q);
        const matchRecom = (item.recommendations || '').toLowerCase().includes(q);
        if (!matchName && !matchInst && !matchPurp && !matchPos && !matchPhone && !matchSubj && !matchFindings && !matchRecom) {
          return false;
        }
      }

      // 2. Status Filter
      if (guestBookStatusFilter !== 'all' && item.status !== guestBookStatusFilter) {
        return false;
      }

      // 3. Date Filter
      if (guestBookDateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (item.date !== todayStr) return false;
      } else if (guestBookDateFilter === 'this_week') {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (item.date < sevenDaysAgo) return false;
      } else if (guestBookDateFilter === 'this_month') {
        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!item.date.startsWith(monthPrefix)) return false;
      } else if (guestBookDateFilter === 'custom') {
        if (guestBookStartDate && item.date < guestBookStartDate) return false;
        if (guestBookEndDate && item.date > guestBookEndDate) return false;
      }

      return true;
    });
  }, [guestBooks, guestBookCategoryTab, guestBookSearch, guestBookStatusFilter, guestBookDateFilter, guestBookStartDate, guestBookEndDate]);

  // Cetak Laporan Rekapitulasi Buku Tamu PDF (Umum, Pembinaan, atau Semua)
  const handlePrintGuestBookReport = (categoryOverride?: 'umum' | 'pembinaan' | 'all') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup diblokir oleh browser. Izinkan popup untuk mencetak laporan buku tamu.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const schoolAddress = schoolIdentity?.address || "Jl. Raya Kasri No. 19 Pandaan, Pasuruan";
    const principalName = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";

    const activeCat = categoryOverride || guestBookCategoryTab;

    // Filter items according to target category
    const entriesToPrint = guestBooks.filter(item => {
      if (activeCat !== 'all') {
        const itemCat = item.category || 'umum';
        if (itemCat !== activeCat) return false;
      }
      // Apply date filter
      if (guestBookDateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (item.date !== todayStr) return false;
      } else if (guestBookDateFilter === 'this_week') {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (item.date < sevenDaysAgo) return false;
      } else if (guestBookDateFilter === 'this_month') {
        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!item.date.startsWith(monthPrefix)) return false;
      } else if (guestBookDateFilter === 'custom') {
        if (guestBookStartDate && item.date < guestBookStartDate) return false;
        if (guestBookEndDate && item.date > guestBookEndDate) return false;
      }
      return true;
    });

    let periodLabel = "Semua Riwayat Kunjungan";
    if (guestBookDateFilter === 'today') periodLabel = `Hari Ini (${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })})`;
    else if (guestBookDateFilter === 'this_week') periodLabel = "7 Hari Terakhir";
    else if (guestBookDateFilter === 'this_month') periodLabel = `Bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    else if (guestBookDateFilter === 'custom') periodLabel = `Periode: ${guestBookStartDate || 'Awal'} s.d. ${guestBookEndDate || 'Sekarang'}`;

    const dateTodayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let reportTitle = "LAPORAN REKAPITULASI BUKU TAMU KUNJUNGAN SEKOLAH";
    if (activeCat === 'pembinaan') {
      reportTitle = "BUKU CATATAN PEMBINAAN & SUPERVISI KEPALA SEKOLAH";
    } else if (activeCat === 'umum') {
      reportTitle = "BUKU TAMU UMUM KUNJUNGAN SEKOLAH";
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - ${schoolName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 10.5px;
              color: #0f172a;
              background: #fff;
            }
            .header-kop {
              width: 100%;
              text-align: center;
              margin: 0 0 12px 0;
              padding: 0;
            }
            .header-kop img.kop-img {
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              display: block !important;
              margin: 0 auto !important;
              border: none !important;
            }
            .kop-text-box {
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              border-bottom: 3.5px double #0f172a;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .kop-text-box h2 {
              margin: 0;
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop-text-box p {
              margin: 2px 0 0 0;
              font-size: 11px;
              color: #334155;
            }
            .report-title {
              text-align: center;
              margin: 10px 0 6px 0;
            }
            .report-title h3 {
              margin: 0;
              font-size: 13.5px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .report-title p {
              margin: 3px 0 0 0;
              font-size: 10.5px;
              color: #475569;
              font-weight: 600;
            }
            .meta-bar {
              display: flex;
              justify-content: space-between;
              margin: 10px 0 6px 0;
              font-size: 10px;
              color: #334155;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 9.5px;
            }
            th, td {
              border: 1px solid #94a3b8;
              padding: 5px 6px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 800;
              text-align: center;
              text-transform: uppercase;
              font-size: 9px;
              color: #0f172a;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .text-center { text-align: center; }
            .badge-cat {
              display: inline-block;
              padding: 2px 5px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 8.5px;
              text-transform: uppercase;
            }
            .badge-pembinaan { background: #fef3c7; color: #92400e; }
            .badge-umum { background: #e0e7ff; color: #3730a3; }
            .signature-section {
              margin-top: 25px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .signature-box {
              text-align: center;
              width: 260px;
              font-size: 10.5px;
            }
            .signature-space {
              height: 60px;
            }
            .signature-name {
              font-weight: 900;
              text-decoration: underline;
              font-size: 11px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-kop">
            ${schoolIdentity?.letterhead ? `
              <img class="kop-img" src="${schoolIdentity.letterhead}" alt="KOP Sekolah" />
            ` : `
              <div class="kop-text-box">
                ${schoolIdentity?.logo ? `<img src="${schoolIdentity.logo}" style="width: 65px; height: 65px; object-fit: contain;" />` : ''}
                <div style="text-align: center; flex: 1;">
                  <h2>${schoolName}</h2>
                  <p>${schoolAddress}</p>
                  <p style="font-size: 10px; color: #64748b;">NPSN: ${schoolIdentity?.npsn || '20519300'} • Status: ${schoolIdentity?.accreditation || 'Terakreditasi A'}</p>
                </div>
              </div>
            `}
          </div>

          <div class="report-title">
            <h3>${reportTitle}</h3>
            <p>Periode: ${periodLabel} | Total: ${entriesToPrint.length} Data Terdaftar</p>
          </div>

          <div class="meta-bar">
            <span><strong>Dicetak pada:</strong> ${dateTodayFormatted}</span>
            <span><strong>Sistem Informasi:</strong> Database MySQL (Tersimpan Permanen)</span>
          </div>

          ${activeCat === 'pembinaan' ? `
            <!-- TABEL KHUSUS BUKU TAMU PEMBINAAN -->
            <table>
              <thead>
                <tr>
                  <th style="width: 25px;">No</th>
                  <th style="width: 80px;">Hari/Tanggal &amp; Waktu</th>
                  <th style="width: 140px;">Nama &amp; NIP Pembina</th>
                  <th style="width: 120px;">Jabatan &amp; Instansi</th>
                  <th style="width: 140px;">Aspek / Materi Pembinaan</th>
                  <th>Temuan &amp; Catatan Pembinaan</th>
                  <th>Saran &amp; Rekomendasi Tindak Lanjut</th>
                  <th style="width: 85px;">Tindak Lanjut Sekolah</th>
                  <th style="width: 60px;">Paraf</th>
                </tr>
              </thead>
              <tbody>
                ${entriesToPrint.length === 0 ? `
                  <tr>
                    <td colspan="9" class="text-center" style="padding: 20px; color: #64748b;">
                      Tidak ada catatan buku tamu pembinaan pada periode ini.
                    </td>
                  </tr>
                ` : entriesToPrint.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center">
                      <strong>${item.date}</strong><br/>
                      <span style="color: #64748b; font-size: 8.5px;">${item.time || '-'} WIB</span>
                    </td>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.supervisorNip ? `<br/><span style="color: #475569; font-size: 8.5px; font-family: monospace;">NIP. ${item.supervisorNip}</span>` : ''}
                      ${item.phone ? `<br/><span style="color: #059669; font-size: 8px;">WA: ${item.phone}</span>` : ''}
                    </td>
                    <td>
                      <strong>${item.position || 'Pembina / Pengawas'}</strong><br/>
                      <span>${item.institution}</span>
                    </td>
                    <td>
                      <strong style="color: #92400e;">${item.coachingSubject || item.purpose}</strong>
                    </td>
                    <td>${item.findings || item.notes || '-'}</td>
                    <td>${item.recommendations || '-'}</td>
                    <td class="text-center">
                      <span style="font-weight: bold; color: ${item.followUpStatus === 'Selesai' ? '#059669' : item.followUpStatus === 'Proses' ? '#d97706' : '#dc2626'};">
                        ${item.followUpStatus || 'Belum'}
                      </span>
                      ${item.followUpNotes ? `<br/><span style="font-size: 8px; color: #475569;">${item.followUpNotes}</span>` : ''}
                    </td>
                    <td class="text-center" style="height: 35px;"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : activeCat === 'umum' ? `
            <!-- TABEL KHUSUS BUKU TAMU UMUM -->
            <table>
              <thead>
                <tr>
                  <th style="width: 28px;">No</th>
                  <th style="width: 90px;">Tanggal &amp; Waktu</th>
                  <th style="width: 150px;">Nama Lengkap Tamu</th>
                  <th style="width: 120px;">Jabatan / Profesi</th>
                  <th style="width: 140px;">Asal Instansi</th>
                  <th>Keperluan Kunjungan</th>
                  <th style="width: 95px;">No. WhatsApp</th>
                  <th style="width: 70px;">Status</th>
                  <th style="width: 70px;">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                ${entriesToPrint.length === 0 ? `
                  <tr>
                    <td colspan="9" class="text-center" style="padding: 20px; color: #64748b;">
                      Tidak ada data buku tamu umum pada periode ini.
                    </td>
                  </tr>
                ` : entriesToPrint.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center">
                      <strong>${item.date}</strong><br/>
                      <span style="color: #64748b; font-size: 9px;">${item.time || '-'} WIB</span>
                    </td>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.notes ? `<br/><span style="color: #64748b; font-size: 8.5px;">Ket: ${item.notes}</span>` : ''}
                    </td>
                    <td>${item.position || '-'}</td>
                    <td><strong>${item.institution}</strong></td>
                    <td>${item.purpose}</td>
                    <td class="text-center font-mono">${item.phone}</td>
                    <td class="text-center font-semibold">${item.status || 'Selesai'}</td>
                    <td class="text-center" style="height: 32px;"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <!-- TABEL GABUNGAN SEMUA TAMU -->
            <table>
              <thead>
                <tr>
                  <th style="width: 25px;">No</th>
                  <th style="width: 60px;">Jenis</th>
                  <th style="width: 85px;">Tgl &amp; Waktu</th>
                  <th style="width: 140px;">Nama Tamu / Pembina</th>
                  <th style="width: 110px;">Jabatan</th>
                  <th style="width: 120px;">Asal Instansi</th>
                  <th>Keperluan / Aspek Pembinaan</th>
                  <th style="width: 90px;">No. WhatsApp</th>
                  <th style="width: 70px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${entriesToPrint.length === 0 ? `
                  <tr>
                    <td colspan="9" class="text-center" style="padding: 20px; color: #64748b;">
                      Tidak ada data tamu pada periode ini.
                    </td>
                  </tr>
                ` : entriesToPrint.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center">
                      <span class="badge-cat ${item.category === 'pembinaan' ? 'badge-pembinaan' : 'badge-umum'}">
                        ${item.category === 'pembinaan' ? 'Pembinaan' : 'Umum'}
                      </span>
                    </td>
                    <td class="text-center">
                      <strong>${item.date}</strong><br/>
                      <span style="color: #64748b; font-size: 8.5px;">${item.time || '-'} WIB</span>
                    </td>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.supervisorNip ? `<br/><span style="color: #475569; font-size: 8.5px; font-family: monospace;">NIP: ${item.supervisorNip}</span>` : ''}
                    </td>
                    <td>${item.position || '-'}</td>
                    <td><strong>${item.institution}</strong></td>
                    <td>
                      <strong>${item.category === 'pembinaan' ? (item.coachingSubject || item.purpose) : item.purpose}</strong>
                      ${item.recommendations ? `<br/><span style="color: #059669; font-size: 8.5px;">Saran: ${item.recommendations}</span>` : ''}
                    </td>
                    <td class="text-center font-mono">${item.phone}</td>
                    <td class="text-center font-semibold">${item.status || 'Selesai'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <div class="signature-section">
            ${activeCat === 'pembinaan' ? `
              <div class="signature-box">
                <div>Pandaan, ${dateTodayFormatted}</div>
                <div>Pengawas / Pembina Sekolah,</div>
                <div class="signature-space"></div>
                <div class="signature-name">( .................................................... )</div>
                <div style="font-size: 10px; color: #475569;">NIP. .............................................</div>
              </div>
            ` : `<div></div>`}

            <div class="signature-box">
              <div>Pandaan, ${dateTodayFormatted}</div>
              <div>Mengetahui,</div>
              <div style="font-weight: bold; margin-top: 2px;">Kepala SMP Ma'arif NU Pandaan</div>
              <div class="signature-space"></div>
              <div class="signature-name">${principalName}</div>
              <div style="font-size: 10px; color: #475569;">NIP/NIK. ${schoolIdentity?.principalNip || '-'}</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Cetak Stand Meja / Akrilik QR Code Buku Tamu
  const handlePrintQrStandBanner = (qrType: 'all' | 'umum' | 'pembinaan' = qrTypeSelection) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup diblokir oleh browser. Izinkan popup untuk mencetak stand banner QR Code.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const schoolAddress = schoolIdentity?.address || "Jl. Raya Kasri No. 19 Pandaan, Pasuruan";
    const schoolLogo = schoolIdentity?.logo || "";

    const bannerTitle = qrType === 'pembinaan' 
      ? 'BUKU TAMU PEMBINAAN & SUPERVISI' 
      : qrType === 'umum' 
      ? 'BUKU TAMU UMUM KUNJUNGAN' 
      : 'BUKU TAMU DIGITAL RESMI';

    const bannerSubtitle = qrType === 'pembinaan'
      ? 'Khusus Pengawas Pembina, Tim Monev, Asesor & Tamu Kedinasan'
      : qrType === 'umum'
      ? 'Selamat Datang Tamu, Wali Murid & Mitra Sekolah'
      : 'Buku Tamu Umum & Buku Tamu Pembinaan Supervisi';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stand Banner QR Buku Tamu - ${schoolName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              text-align: center;
            }
            .card-stand {
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 30px 24px;
              max-width: 520px;
              width: 100%;
              box-sizing: border-box;
            }
            .school-logo {
              width: 70px;
              height: 70px;
              object-fit: contain;
              margin-bottom: 8px;
            }
            h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .sub {
              font-size: 11px;
              color: #475569;
              margin-top: 3px;
              font-weight: 600;
            }
            .badge-buku-tamu {
              display: inline-block;
              margin: 16px 0 8px 0;
              padding: 6px 18px;
              background-color: ${qrType === 'pembinaan' ? '#d97706' : '#059669'};
              color: #fff;
              font-size: 12px;
              font-weight: 900;
              border-radius: 9999px;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .qr-container {
              background: #fff;
              padding: 12px;
              border: 2px dashed #94a3b8;
              border-radius: 20px;
              display: inline-block;
              margin: 10px 0;
            }
            .qr-container img {
              width: 260px;
              height: 260px;
              display: block;
            }
            .instruction-box {
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 14px;
              padding: 12px;
              margin-top: 14px;
              font-size: 11px;
              line-height: 1.5;
            }
            .instruction-box ol {
              text-align: left;
              margin: 6px 0 0 18px;
              padding: 0;
            }
            .instruction-box li {
              margin-bottom: 3px;
              font-weight: 600;
            }
            .footer-note {
              margin-top: 16px;
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
            }
            @media print {
              body { min-height: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="card-stand">
            ${schoolLogo ? `<img class="school-logo" src="${schoolLogo}" alt="Logo Sekolah" />` : ''}
            <h1>${schoolName}</h1>
            <div class="sub">${schoolAddress}</div>

            <div class="badge-buku-tamu">${bannerTitle}</div>

            <p style="font-size: 12px; margin: 4px 0 2px 0; font-weight: bold; color: #334155;">
              SELAMAT DATANG BAPAK / IBU TAMU
            </p>
            <p style="font-size: 10.5px; color: #64748b; margin: 0 0 10px 0;">
              ${bannerSubtitle}
            </p>

            <div class="qr-container">
              <img src="${qrDataUrl}" alt="QR Code Buku Tamu" />
            </div>

            <div class="instruction-box">
              <div style="font-weight: bold; color: #0f172a; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">
                Cara Pengisian Praktis (Tanpa Perlu Login):
              </div>
              <div style="font-size: 9.5px; color: #475569; margin-bottom: 6px; line-height: 1.4;">
                Dapat dipindai menggunakan <strong>Kamera Bawaan HP</strong>, <strong>Google Lens</strong>, atau <strong>Aplikasi QR Scanner apa saja</strong> yang diunduh dari <strong>Google Play Store / Apple App Store</strong>.
              </div>
              <ol>
                <li>Buka aplikasi Pemindai QR atau Kamera HP Anda.</li>
                <li>Arahkan kamera ke Kode QR di atas sampai muncul tautan/link formulir.</li>
                <li>Klik buka link (langsung terbuka di browser tanpa perlu login akun).</li>
                <li>Pilih jenis buku tamu (1. Buku Tamu Umum / 2. Buku Tamu Pembinaan), isi data kehadiran Anda, lalu tekan <strong>"Kirim &amp; Catat di Buku Tamu"</strong>. Selesai!</li>
              </ol>
            </div>

            <div class="footer-note">
              Terima kasih atas kerja sama dan kunjungan Anda di SMP Ma'arif NU Pandaan.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleDownloadGuestBookXLS = () => {
    let content = "No\tKategori\tTanggal\tWaktu\tNama Tamu / Pembina\tNIP Pembina\tJabatan\tAsal Instansi\tKeperluan / Aspek Pembinaan\tTemuan Pembinaan\tRekomendasi Tindak Lanjut\tStatus Tindak Lanjut\tNo. HP / WhatsApp\tStatus\tCatatan\n";
    filteredGuestBooks.forEach((item, idx) => {
      content += `${idx + 1}\t${item.category === 'pembinaan' ? 'Pembinaan' : 'Umum'}\t${item.date}\t${item.time || '-'}\t${item.name}\t${item.supervisorNip || '-'}\t${item.position || '-'}\t${item.institution}\t${item.category === 'pembinaan' ? (item.coachingSubject || item.purpose) : item.purpose}\t${(item.findings || '-').replace(/\n/g, ' ')}\t${(item.recommendations || '-').replace(/\n/g, ' ')}\t${item.followUpStatus || '-'}\t${item.phone}\t${item.status || 'Selesai'}\t${(item.notes || '-').replace(/\n/g, ' ')}\n`;
    });

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Buku_Tamu_SMP_Maarif_${guestBookCategoryTab}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 text-left animate-fade-in pb-16">
      
      {/* Title Header Copy */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent hidden md:block" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-indigo-650 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
              <GraduationCap size={32} className="stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-900/30">
                Akses Eksklusif Kepala Sekolah
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                Portal Komando Kepala Sekolah
              </h1>
              <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
                Selamat Datang, <strong>{schoolIdentity.principal}</strong>. Pantau semua keuangan, absensi KBM, rekapitulasi penilaian guru, dan program kerja SMP Ma'arif NU Pandaan secara satu pintu.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                fetchWorkPrograms();
                fetchEvaluations();
                fetchSecondaryMonitoringData();
                fetchFinancialTransactions();
                onRefresh();
                setNotifMsg({ type: 'success', text: 'Seluruh lini data sekolah disinkronkan berkala!' });
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white border border-slate-705 border-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Refresh Data Terkini"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sinkron</span>
            </button>
            
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-650 hover:bg-rose-600 border border-rose-700 hover:border-rose-900 font-extrabold text-xs rounded-xl transition-all text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              Keluar Sesi
            </button>
          </div>
        </div>
      </div>

      {/* Unduh Aplikasi Mobile Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <Smartphone size={20} className="text-emerald-700 shrink-0" />
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Aplikasi Mobile Resmi Portal Sekolah</h4>
            <p className="text-[10px] text-slate-500 leading-normal">Unduh aplikasi mobile resmi sekolah untuk mengakses peninjauan kinerja guru, program kerja & laporan statistik sekolah langsung dari smartphone Anda.</p>
          </div>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <a
            href={schoolIdentity?.apkUrl || "#"}
            target={schoolIdentity?.apkUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!schoolIdentity?.apkUrl) {
                e.preventDefault();
                alert("Link unduhan Android belum diatur oleh Administrator.");
              }
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none group ${
              schoolIdentity?.apkUrl 
                ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-855 border-emerald-250 shadow-3xs" 
                : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
            }`}
          >
            <Smartphone size={14} className={`${schoolIdentity?.apkUrl ? "text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)] group-hover:scale-110" : "text-emerald-300/60"} transition-transform stroke-[2.5]`} />
            <span>Android APK</span>
          </a>
          <a
            href={schoolIdentity?.iosUrl || "#"}
            target={schoolIdentity?.iosUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!schoolIdentity?.iosUrl) {
                e.preventDefault();
                alert("Link unduhan iOS belum diatur oleh Administrator.");
              }
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none group ${
              schoolIdentity?.iosUrl 
                ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-855 border-sky-250 shadow-3xs" 
                : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
            }`}
          >
            <Apple size={14} className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`} />
            <span>iOS Apple</span>
          </a>
        </div>
      </div>

      {/* Global Toast Alerts */}
      <AnimatePresence>
        {notifMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 border rounded-2xl text-xs font-bold shadow-sm flex items-center gap-3 ${
              notifMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                : 'bg-rose-50 border-rose-150 text-rose-800'
            }`}
          >
            {notifMsg.type === 'success' ? (
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            )}
            <div className="flex-grow">{notifMsg.text}</div>
            <button 
              onClick={() => setNotifMsg(null)} 
              className="px-2 py-1 hover:bg-slate-100 rounded-lg text-[10px] uppercase font-black tracking-wider cursor-pointer font-sans"
            >
              Tutup
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Custom Tab Bar (Desktop: flex, Mobile: hidden) */}
      <div className="hidden md:flex bg-white border border-slate-200 rounded-3xl p-1.5 flex-wrap gap-1 shadow-xs items-center justify-between">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            📊 Command Dashboard
          </button>
          <button
            onClick={() => {
              setActiveTab('buku_tamu');
              fetchGuestBooks();
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'buku_tamu' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60'
            }`}
          >
            <span>📖 Buku Tamu</span>
            {guestBooks.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'buku_tamu' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-800'
              }`}>
                {guestBooks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('work_programs')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'work_programs' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            📋 Program Kerja Kepsek
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'evaluations' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            🏆 Penilaian Kinerja Guru (PKG)
          </button>
          <button
            onClick={() => setActiveTab('journals')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'journals' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            📚 Jurnal KBM Guru
          </button>
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'jadwal' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/60'
            }`}
          >
            🗓️ Matriks Jadwal
          </button>
          <button
            onClick={() => setActiveTab('bk_monitoring')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'bk_monitoring' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            🛡️ Monitoring BK & Moral
          </button>
          <button
            onClick={() => setActiveTab('attendance_recap')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'attendance_recap' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            📅 Rekap Presensi
          </button>
          <button
            onClick={() => setActiveTab('finance_monitoring')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'finance_monitoring' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            💰 Monitoring Keuangan
          </button>
          <button
            onClick={() => {
              setActiveTab('sarpras_monitoring');
              fetchSarprasData();
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'sarpras_monitoring' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-650 hover:bg-slate-50'
            }`}
          >
            📦 Monitoring Sarpras
          </button>
        </div>

        <button
          onClick={() => setActiveTab('school_profile')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
            activeTab === 'school_profile' 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          ⚙️ Identitas Sekolah
        </button>
      </div>

      {/* Mobile Tab Selector */}
      <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs">
        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Pilih Menu Panel</label>
        <select
          value={activeTab}
          onChange={(e) => {
            const val = e.target.value as any;
            setActiveTab(val);
            if (val === 'buku_tamu') fetchGuestBooks();
            if (val === 'sarpras_monitoring') fetchSarprasData();
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 cursor-pointer"
        >
          <option value="dashboard">📊 Command Dashboard</option>
          <option value="buku_tamu">📖 Buku Tamu Kunjungan ({guestBooks.length})</option>
          <option value="work_programs">📋 Program Kerja Kepsek</option>
          <option value="evaluations">🏆 Penilaian Kinerja Guru (PKG)</option>
          <option value="journals">📚 Jurnal KBM Guru</option>
          <option value="jadwal">🗓️ Matriks Jadwal</option>
          <option value="bk_monitoring">🛡️ Monitoring BK & Moral</option>
          <option value="attendance_recap">📅 Rekap Presensi</option>
          <option value="finance_monitoring">💰 Monitoring Keuangan</option>
          <option value="sarpras_monitoring">📦 Monitoring Sarpras</option>
          <option value="school_profile">⚙️ Identitas Sekolah</option>
        </select>
      </div>

      {/* CORE SCREENS VIEW ROUTINGS */}

      {/* 1. DASHBOARD & MONITORING WORKSPACE */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          
          {/* Key Executive KPIs Indicators Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Siswa Terdaftar</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">{totalStudents}</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Aktif</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">SPP Revenue Lunas</span>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 mt-1 truncate">{formatIDR(totalSppRevenue)}</span>
                <span className="text-[9px] font-bold text-emerald-600 mt-1">
                  ✓ {sppPaidCount} Tagihan Lunas
                </span>
              </div>
              <div className="text-[8px] text-slate-400 leading-none">Dari kas pembayaran SPP</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Dana Tabungan</span>
              <div className="flex flex-col">
                <span className="text-xl font-black text-indigo-700 mt-1 truncate">{formatIDR(totalSavingsBalance)}</span>
                <span className="text-[9px] font-bold text-indigo-500 mt-1">Kolektif tabungan mandiri</span>
              </div>
              <div className="text-[8px] text-slate-400 leading-none">Sistem Tabungan Aman</div>
            </div>

            <div 
              onClick={() => setActiveTab('attendance_recap')}
              className="bg-white border border-slate-200 hover:border-indigo-400 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tingkat Absensi KBM</span>
                <span className="text-[9px] font-bold text-indigo-600 group-hover:underline">Rekap →</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-2xl font-black ${attendanceRate >= 85 ? 'text-emerald-700' : 'text-amber-600'}`}>{attendanceRate}%</span>
                <span className="text-[9px] font-bold uppercase text-slate-400">Hadir</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden animate-pulse">
                <div 
                  className={`h-full ${attendanceRate >= 85 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full`} 
                  style={{ width: `${attendanceRate}%` }} 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 col-span-2 md:col-span-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sumber Daya Pendidik</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">{totalTeachers}</span>
                <span className="text-[10px] font-mono font-bold text-indigo-600">Staff</span>
              </div>
              <p className="text-[9px] text-slate-500 font-extrabold">{homerooms.length} Wali / {subjectTeachers.length} Mapel</p>
            </div>

          </div>

          {/* Statistik Siswa Lengkap (Jenis Kelamin & Per Kelas) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Ringkasan Demografi Laki-laki / Perempuan (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                  🚻 Statistik Jenis Kelamin Siswa
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Ringkasan total murid berdasarkan gender di seluruh tingkat kelas.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider block">Laki-laki (L)</span>
                  <div className="text-3xl font-black text-indigo-900 mt-1">{genderStats.laki}</div>
                  <span className="text-[9px] font-bold text-slate-500 block mt-1">
                    {totalStudents > 0 ? ((genderStats.laki/totalStudents)*100).toFixed(1) : 0}% dari siswa
                  </span>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-wider block">Perempuan (P)</span>
                  <div className="text-3xl font-black text-rose-900 mt-1">{genderStats.perempuan}</div>
                  <span className="text-[9px] font-bold text-slate-500 block mt-1">
                    {totalStudents > 0 ? ((genderStats.perempuan/totalStudents)*100).toFixed(1) : 0}% dari siswa
                  </span>
                </div>
              </div>

              {genderStats.unspecified > 0 ? (
                <div className="text-[10px] text-slate-400 text-center font-medium">
                  *Terdapat {genderStats.unspecified} siswa belum ditentukan jenis kelaminnya.
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 text-center font-bold text-emerald-800">
                  ✓ Semua data jenis kelamin siswa tersinkronisasi murni
                </div>
              )}
            </div>

            {/* Statistik Detil Distribusi Per Kelas (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-3 min-h-[300px]">
              <div>
                <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                  🏫 Jumlah Siswa Aktif Per Kelas
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Proporsi dan perincian jenis kelamin (L/P) di masing-masing rombongan belajar (rombel).</p>
              </div>

              <div className="overflow-y-auto max-h-[220px] pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2 px-3">Rombel / Kelas</th>
                      <th className="py-2 px-3 text-center">Laki-laki (L)</th>
                      <th className="py-2 px-3 text-center">Perempuan (P)</th>
                      <th className="py-2 px-3 text-right">Total Murid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-[11px]">
                    {classStats.length > 0 ? (
                      classStats.map((cStat, index) => (
                        <tr key={index} className="hover:bg-slate-50/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            Kelas {cStat.class}
                          </td>
                          <td className="py-2.5 px-3 text-center text-indigo-700 font-bold">{cStat.laki} siswa</td>
                          <td className="py-2.5 px-3 text-center text-rose-700 font-bold">{cStat.perempuan} siswa</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-black text-sm">{cStat.total} siswa</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">Belum ada data siswa aktif terdaftar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Graphical Analytics Row (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* SPP Budget Revenue collection trend (8 Cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                  📈 Grafik Keberhasilan Collection Tarif SPP
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Real-time agregat penerimaan dana SPP yang lunas disisir per bulan anggaran ajaran.</p>
              </div>

              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="Bulan" stroke="#94a3b8" fontSize={9} className="font-semibold" />
                    <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(val) => `Rp ${val/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatIDR(value), "Pendapatan SPP"]} 
                      contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="Pendapatan" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={34}>
                      {monthlyRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Pendapatan > 0 ? '#4f46e5' : '#e2e8f0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance rate summary & distribution statistics (4 Cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                  📊 Distribusi Presensi KBM
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Proporsi kehadiran, izin keterlambatan, atau ketidakhadiran darurat siswa SMP Maarif NU Pandaan.</p>
              </div>

              <div className="h-44 flex items-center justify-center relative">
                {attendancePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendancePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {attendancePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-450 text-slate-400 text-xs font-semibold">Belum ada absen diinput hari ini</span>
                )}
                
                <div className="absolute text-center flex flex-col pointer-events-none">
                  <span className="text-[9px] font-black uppercase text-slate-400">Rate Kehadiran</span>
                  <span className="text-xl font-black text-slate-950 leading-none">{attendanceRate}%</span>
                </div>
              </div>

              {/* Pie Grid indicators Legend */}
              <div className="flex flex-col gap-1.5 text-[10px] mt-1 text-slate-600">
                {attendancePieData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-none">
                    <span className="font-extrabold flex items-center gap-1.5 leading-none">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-black">{item.value} Record</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Student Lookup Hub & Individual Audit (Full monitoring integration) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-base leading-tight flex items-center gap-1.5">
                  🔍 Pusat Pemantauan & Lookup Siswa Mandiri
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">Cari profil siswa, audit langsung buku tabungan saldo siswa, tunggakan SPP bulanan, riwayat BK/Pelanggaran secara integratif.</p>
              </div>

              {/* Dynamic Search Box Input */}
              <div className="relative w-full md:w-80 shrink-0">
                <input
                  type="text"
                  placeholder="Cari berdasarkan Nama, NIS, atau Kelas..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 transition-colors"
                />
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left filter selection list (4 Cols) */}
              <div className="lg:col-span-4 border border-slate-200 rounded-2xl h-[420px] overflow-y-auto p-2 bg-slate-50 flex flex-col gap-1">
                {filteredStudents.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-semibold text-xs leading-relaxed">
                    Siswa tidak ditemukan.<br/>Silakan ketik ulang kata kunci.
                  </div>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const isSelected = selectedStudentId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full px-3 py-2.5 rounded-xl cursor-pointer text-left transition-all flex items-center justify-between border ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-950 text-white shadow-sm' 
                            : 'bg-white hover:bg-slate-100/50 border-slate-200 text-slate-800 font-medium'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs truncate leading-normal">{s.name}</p>
                          <div className="flex gap-2 items-center text-[9px] text-slate-400 mt-0.5 font-mono">
                            <span>NIS: {s.nis}</span>
                            <span>•</span>
                            <span>Kls {s.class}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          isSelected ? 'bg-indigo-650 text-indigo-100 bg-indigo-650' : 'bg-slate-100 text-slate-700'
                        }`}>
                          Audit
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Profile Auditing Hub (8 Cols) */}
              <div className="lg:col-span-8">
                {inspectedStudent ? (
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white flex flex-col gap-6">
                    
                    {/* Header profile name cards */}
                    <div className="flex md:items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600">Lembar Audit Profil Siswa</span>
                        <h4 className="font-black text-slate-900 text-lg leading-tight mt-0.5">{inspectedStudent.name}</h4>
                        <p className="text-[10px] text-slate-405 text-slate-500 font-mono mt-0.5">
                          NIS: {inspectedStudent.nis} | Kelas/Rombel: {inspectedStudent.class} | Email: {inspectedStudent.email || '-'}
                        </p>
                      </div>
                      
                      <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl text-right">
                        <span className="text-[9px] text-indigo-500 font-bold block uppercase tracking-wider">Saldo Tabungan Saat Ini</span>
                        <span className="text-base font-black text-indigo-900 font-mono">{formatIDR(inspectedStudent.savingsBalance)}</span>
                      </div>
                    </div>

                    {/* Mini sub monitoring blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Sub-block A: SPP Tuitions Status */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1">
                          💰 Tunggakan & Pembayaran SPP
                        </span>
                        
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500">
                                <th className="px-3 py-2">Bulan Anggaran</th>
                                <th className="px-2 py-2">Jumlah</th>
                                <th className="px-3 py-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inspectedStudentBills.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="py-8 text-center text-slate-405 text-slate-400 font-semibold">Tunggakan belum dibuat staf admin.</td>
                                </tr>
                              ) : (
                                inspectedStudentBills.map((b) => (
                                  <tr key={b.id} className="border-b last:border-none border-slate-100">
                                    <td className="px-3 py-2 font-black text-slate-800">{b.month} {b.year}</td>
                                    <td className="px-2 py-2 font-mono">{formatIDR(b.amount)}</td>
                                    <td className="px-3 py-2 text-right font-black">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] leading-tight ${
                                        b.status === 'paid' 
                                          ? 'bg-emerald-100 text-emerald-800' 
                                          : b.status === 'pending' 
                                            ? 'bg-amber-150 bg-amber-100 text-amber-800'
                                            : isSppBillOverdue(b)
                                              ? 'bg-rose-100 text-rose-800 font-black'
                                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                                      }`}>
                                        {b.status === 'paid' 
                                          ? 'Lunas' 
                                          : b.status === 'pending' 
                                            ? 'Pending' 
                                            : isSppBillOverdue(b) 
                                              ? 'Tunggakan ⚠️' 
                                              : 'Belum Bayar'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Sub-block B: Attendance Logs summary */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1">
                          📅 Riwayat Presensi Absensi
                        </span>

                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex flex-col gap-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-2 border border-slate-100 rounded-xl text-center">
                              <span className="text-[9px] block text-slate-400 font-bold">Hadir</span>
                              <span className="text-xs font-black text-emerald-600 font-mono">
                                {inspectedStudentAttendance.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length} Hari
                              </span>
                            </div>
                            <div className="bg-white p-2 border border-slate-100 rounded-xl text-center">
                              <span className="text-[9px] block text-slate-400 font-bold">Izin/Sakit</span>
                              <span className="text-xs font-black text-indigo-600 font-mono">
                                {inspectedStudentAttendance.filter(a => a.status === 'Izin' || a.status === 'Sakit').length} Hari
                              </span>
                            </div>
                            <div className="bg-white p-2 border border-slate-100 rounded-xl text-center">
                              <span className="text-[9px] block text-slate-400 font-bold">Alpa (Tanpa Ket)</span>
                              <span className="text-xs font-black text-rose-700 font-mono animate-pulse">
                                {inspectedStudentAttendance.filter(a => a.status === 'Alpa').length} Hari
                              </span>
                            </div>
                          </div>

                          <div className="max-h-24 overflow-y-auto text-[10px] flex flex-col gap-1 pr-1 font-semibold text-slate-600">
                            {inspectedStudentAttendance.slice(-4).reverse().map((a, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1 border-b border-white last:border-none">
                                <span className="font-mono">{a.date}</span>
                                <span className={`px-1.5 py-0.5 rounded font-black text-[8px] ${
                                  a.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {a.status}
                                </span>
                              </div>
                            ))}
                            {inspectedStudentAttendance.length === 0 && (
                              <p className="text-center py-4 text-slate-400">Belum ada absensi terdaftar.</p>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* BK counseling & Infractions monitor for inspected student */}
                    <div className="border-t border-slate-100 pt-5 flex flex-col gap-3.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        🛡️ Layanan Bimbingan Konseling (BK) & Kasus Disiplin Siswa
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-slate-150 p-3.5 rounded-xl bg-slate-50/55 text-xs flex flex-col gap-2 leading-relaxed">
                          <span className="font-extrabold text-[10px] text-indigo-700">Kasus Konseling BK Terkait</span>
                          <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5 font-semibold text-slate-700 pr-1 text-[10px]">
                            {inspectedStudentCounseling.length === 0 ? (
                              <p className="text-slate-400 py-4 italic">Bersih. Tidak ada kasus bimbingan terdaftar.</p>
                            ) : (
                              inspectedStudentCounseling.map((c, idx) => (
                                <div key={idx} className="bg-white border border-slate-201 border-slate-200 p-2 rounded-lg">
                                  <div className="flex justify-between font-bold text-[9px] text-slate-400 mb-0.5 font-mono">
                                    <span>Tgl: {c.date}</span>
                                  </div>
                                  <strong className="text-slate-800 block text-[10px]">Topik: {c.topic}</strong>
                                  <p className="text-[9px] text-slate-450 text-slate-500 mt-0.5">Solusi: {c.actionPlan}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="border border-slate-150 p-3.5 rounded-xl bg-rose-50/30 text-xs flex flex-col gap-2 leading-relaxed">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-[10px] text-rose-700">Catatan Pelanggaran Disiplin</span>
                            {inspectedStudentInfractions.length > 0 && (
                              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[8.5px] font-black font-mono shrink-0">
                                Akumulasi: {inspectedStudentInfractions.reduce((acc, log) => acc + (log.points || 0), 0)} Poin
                              </span>
                            )}
                          </div>
                          <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5 font-semibold text-slate-700 pr-1 text-[10px]">
                            {inspectedStudentInfractions.length === 0 ? (
                              <p className="text-slate-400 py-4 italic text-emerald-700">Sempurna. Tidak ada riwayat pelanggaran.</p>
                            ) : (
                              inspectedStudentInfractions.map((i, idx) => {
                                const isReduction = i.points !== undefined && i.points < 0;
                                return (
                                  <div key={idx} className={`border p-2 rounded-lg ${isReduction ? 'bg-emerald-50/5 border-emerald-150 bg-white' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between font-bold text-[9px] text-slate-400 mb-0.5 font-mono">
                                      <span>Tgl: {i.date} | Status: {i.resolutionStatus}</span>
                                    </div>
                                    <strong className={`block text-[10px] flex items-center justify-between gap-1 ${isReduction ? 'text-emerald-800' : 'text-rose-800'}`}>
                                      <span>Jenis: {i.infractionType}</span>
                                      {i.points !== undefined && (
                                        <span className={`px-1 py-0.5 border rounded text-[8px] font-black font-mono uppercase ${isReduction ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                          {isReduction ? '' : '+'}{i.points} pt
                                        </span>
                                      )}
                                    </strong>
                                    <p className="text-[9px] text-slate-500 mt-0.5">Sanksi/Hasil: {i.actionTaken}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-400 font-semibold text-xs bg-white border border-slate-200 rounded-3xl shadow-sm">
                    Silakan pilih siswa dari roster untuk dikoordinasikan.
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* 2. PRINCIPAL WORK PROGRAMS (CRUD with Staff Sync) */}
      {activeTab === 'work_programs' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-600" />
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Dashboard Program Kerja</span>
              <h2 className="text-slate-900 font-black text-lg leading-tight mt-1">📋 Program Kerja Strategis Kepala Sekolah (PWP)</h2>
              <p className="text-slate-500 text-xs mt-0.5 max-w-2xl leading-relaxed">
                Tulis rencana aksi kerja kepala sekolah. Ringkasan program kerja ini **otomatis disinkronkan langsung** ke dasbor portal guru dan wali kelas untuk koordinasi terintegrasi.
              </p>
            </div>
            
            <button
              onClick={() => {
                resetProgramForm();
                setShowProgramForm(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-extrabold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <Plus size={14} className="stroke-[3]" />
              Tambah Program
            </button>
          </div>

          {/* New / Edit program form panel block rendering */}
          <AnimatePresence>
            {showProgramForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-55 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner relative overflow-hidden"
              >
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-5 text-slate-900">
                  <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-2">
                    <Edit3 size={15} className="text-indigo-600" />
                    {editingProgramId ? 'Edit Program Kerja Strategis' : 'Buat Program Kerja Strategis Baru'}
                  </h3>
                  <button 
                    onClick={resetProgramForm} 
                    className="px-2 py-1 text-[10px] font-black tracking-widest text-slate-400 hover:text-slate-800 uppercase cursor-pointer"
                  >
                    Batal (Tutup)
                  </button>
                </div>

                <form onSubmit={handleSaveProgram} className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs text-left">
                  
                  {/* Title */}
                  <div className="md:col-span-8 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Nama Program Kerja</label>
                    <input
                      type="text"
                      placeholder="Cth: Digitalisasi Rapor Merdeka & Audit LMS..."
                      required
                      value={programTitle}
                      onChange={(e) => setProgramTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Target Date */}
                  <div className="md:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Target Pelaksanaan</label>
                    <input
                      type="date"
                      required
                      value={programDate}
                      onChange={(e) => setProgramDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Desc */}
                  <div className="md:col-span-12 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Deskripsi Detail & Sasaran</label>
                    <textarea
                      placeholder="Uraian ringkas sasaran program kerja, target audiens, dan koordinasi yang dibutuhkan pendidik..."
                      rows={3}
                      required
                      value={programDesc}
                      onChange={(e) => setProgramDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-800 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Status and Sync toggle */}
                  <div className="md:col-span-6 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Status Progres</label>
                    <select
                      value={programStatus}
                      onChange={(e: any) => setProgramStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-850 text-slate-800 focus:outline-none"
                    >
                      <option value="planned">Direncanakan (Planned)</option>
                      <option value="active">Berjalan (Active)</option>
                      <option value="completed">Selesai (Completed)</option>
                    </select>
                  </div>

                  <div className="md:col-span-6 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 mt-2">
                    <div className="flex flex-col text-left gap-0.5">
                      <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">Sinkronisasi ke Guru</span>
                      <span className="text-[9px] text-slate-450 text-slate-400">Publikasi data ke dasbor guru & wali kelas instan.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={programSync}
                      onChange={(e) => setProgramSync(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="md:col-span-12 flex justify-end gap-2.5 pt-2 border-t border-slate-205 border-slate-200 mt-2">
                    <button
                      type="button"
                      onClick={resetProgramForm}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-350 hover:bg-slate-300 text-slate-750 text-slate-700 font-extrabold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-755 hover:bg-indigo-700 text-white font-extrabold rounded-xl cursor-pointer shadow-sm"
                    >
                      {editingProgramId ? 'Simpan Perubahan' : 'Publish Program Kerja'}
                    </button>
                  </div>

                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid display of Work Programs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Planned container */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-450 text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-401 bg-slate-400" />
                  Direncanakan ({workPrograms.filter(p => p.status === 'planned').length})
                </span>
              </div>
              
              <div className="flex flex-col gap-3 min-h-[300px] h-[450px] overflow-y-auto pr-1">
                {workPrograms.filter(p => p.status === 'planned').map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-left flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-slate-850 text-slate-800 text-[11px] leading-tight flex-grow">{p.title}</h4>
                        {p.syncWithStaff && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-black text-emerald-800 uppercase tracking-widest shrink-0">Staff Sync</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed line-clamp-4">{p.description}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {p.targetDate}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEditProgramClick(p)} className="text-slate-600 hover:text-slate-900 cursor-pointer">Edit</button>
                        <span>•</span>
                        <button onClick={() => handleDeleteProgram(p.id)} className="text-rose-600 hover:text-rose-900 cursor-pointer">Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
                {workPrograms.filter(p => p.status === 'planned').length === 0 && (
                  <p className="text-center text-slate-400 py-15 italic text-[10px] font-semibold">Belum ada program direncanakan.</p>
                )}
              </div>
            </div>

            {/* Active container */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                  Berjalan Aktif ({workPrograms.filter(p => p.status === 'active').length})
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[300px] h-[450px] overflow-y-auto pr-1">
                {workPrograms.filter(p => p.status === 'active').map((p) => (
                  <div key={p.id} className="bg-white border-l-4 border-l-indigo-600 border border-slate-200 p-4 rounded-xl shadow-xs text-left flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-slate-850 text-slate-800 text-[11px] leading-tight flex-grow">{p.title}</h4>
                        {p.syncWithStaff && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-black text-emerald-800 uppercase tracking-widest shrink-0">Staff Sync</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-505 text-slate-500 font-semibold leading-relaxed line-clamp-4">{p.description}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-indigo-700">
                        <Clock size={11} /> {p.targetDate}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEditProgramClick(p)} className="text-slate-650 hover:text-slate-900 cursor-pointer">Edit</button>
                        <span>•</span>
                        <button onClick={() => handleDeleteProgram(p.id)} className="text-rose-600 hover:text-rose-900 cursor-pointer">Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
                {workPrograms.filter(p => p.status === 'active').length === 0 && (
                  <p className="text-center text-slate-400 py-15 italic text-[10px] font-semibold">Belum ada program berjalan aktif.</p>
                )}
              </div>
            </div>

            {/* Completed container */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Selesai ({workPrograms.filter(p => p.status === 'completed').length})
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[300px] h-[450px] overflow-y-auto pr-1">
                {workPrograms.filter(p => p.status === 'completed').map((p) => (
                  <div key={p.id} className="bg-white border-l-4 border-l-emerald-600 border border-slate-200 p-4 rounded-xl shadow-xs text-left flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-slate-850 text-slate-800 text-[11px] leading-tight flex-grow line-through text-slate-400">{p.title}</h4>
                        {p.syncWithStaff && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-black text-emerald-800 uppercase tracking-widest shrink-0">Staff Sync</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-4">{p.description}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-750">
                        <CheckCircle size={11} /> {p.targetDate}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEditProgramClick(p)} className="text-slate-650 hover:text-slate-900 cursor-pointer">Edit</button>
                        <span>•</span>
                        <button onClick={() => handleDeleteProgram(p.id)} className="text-rose-600 hover:text-rose-900 cursor-pointer">Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
                {workPrograms.filter(p => p.status === 'completed').length === 0 && (
                  <p className="text-center text-slate-400 py-15 italic text-[10px] font-semibold">Belum ada program selesai.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. TEACHER EVALUATION RUBRIC (PKG) */}
      {activeTab === 'evaluations' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
            <div>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Modul Pengukuran Guru</span>
              <h2 className="text-slate-900 font-black text-lg leading-tight mt-1">🏆 Penilaian Kinerja Guru (PKG / Evaluasi Rubrik)</h2>
              <p className="text-slate-500 text-xs mt-0.5 max-w-2xl leading-relaxed">
                Evaluasi kinerja guru berlandaskan 4 kompetensi mutlak kementerian: Pedagogis, Profesional, Sosial, dan Kepribadian. Rekam penilaian kinerja ini untuk peruntukan sertifikasi & audit internal.
              </p>
            </div>

            <button
              onClick={() => {
                resetEvalForm();
                setShowEvalForm(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <Plus size={14} className="stroke-[3]" />
              Buat Penilaian Baru
            </button>
          </div>

          {/* Form input assessment */}
          <AnimatePresence>
            {showEvalForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner relative overflow-hidden"
              >
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-5 text-slate-900">
                  <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                    <Award size={15} className="text-indigo-650" />
                    Lembar Form Rubrik Penilaian Guru Resmi
                  </h3>
                  <button 
                    onClick={resetEvalForm} 
                    className="px-2 py-1 text-[10px] font-black tracking-widest text-slate-400 hover:text-slate-800 uppercase cursor-pointer"
                  >
                    Tutup Rubrik
                  </button>
                </div>

                <form onSubmit={handleSaveEvaluation} className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs text-left">
                  
                  {/* Select Teacher */}
                  <div className="md:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Daftar Guru</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="">-- Pilih Guru di Sekolah --</option>
                      <optgroup label="Wali Kelas (Homeroom Teachers)">
                        {homerooms.map(h => (
                          <option key={h.id} value={h.id}>{h.name} (Kelas {h.className})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Guru Mata Pelajaran (Subject Teachers)">
                        {subjectTeachers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.subject})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Tahun Akademik</label>
                    <input
                      type="text"
                      required
                      value={evalAcademicYear}
                      onChange={(e) => setEvalAcademicYear(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Tanggal Penilaian</label>
                    <input
                      type="date"
                      required
                      value={evalDate}
                      onChange={(e) => setEvalDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-800"
                    />
                  </div>

                  {/* Rating parameters */}
                  <div className="md:col-span-3 bg-white p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">A. Pedagogis</span>
                      <strong className="text-sm font-mono text-indigo-700">{evalPedagogic}</strong>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">Pengelolaan KBM kelas, pemahaman psikologis siswa.</p>
                    <input 
                      type="range" min="50" max="100" 
                      value={evalPedagogic} 
                      onChange={(e) => setEvalPedagogic(Number(e.target.value))}
                      className="w-full accent-indigo-600 mt-2 shrink-0 cursor-pointer" 
                    />
                  </div>

                  <div className="md:col-span-3 bg-white p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">B. Profesional</span>
                      <strong className="text-sm font-mono text-indigo-700">{evalProfessional}</strong>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">Penguasaan materi subjek, perangkat pembelajaran (RPP).</p>
                    <input 
                      type="range" min="50" max="100" 
                      value={evalProfessional} 
                      onChange={(e) => setEvalProfessional(Number(e.target.value))}
                      className="w-full accent-indigo-600 mt-2 shrink-0 cursor-pointer" 
                    />
                  </div>

                  <div className="md:col-span-3 bg-white p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">C. Kepribadian</span>
                      <strong className="text-sm font-mono text-indigo-700">{evalPersonal}</strong>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">Kewibawaan, kedisiplinan administrasi, budi pekerti.</p>
                    <input 
                      type="range" min="50" max="100" 
                      value={evalPersonal} 
                      onChange={(e) => setEvalPersonal(Number(e.target.value))}
                      className="w-full accent-indigo-600 mt-2 shrink-0 cursor-pointer" 
                    />
                  </div>

                  <div className="md:col-span-3 bg-white p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">D. Sosial</span>
                      <strong className="text-sm font-mono text-indigo-700">{evalSocial}</strong>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">Komunikasi dengan orang tua murid, paguyuban, & kolega.</p>
                    <input 
                      type="range" min="50" max="100" 
                      value={evalSocial} 
                      onChange={(e) => setEvalSocial(Number(e.target.value))}
                      className="w-full accent-indigo-600 mt-2 shrink-0 cursor-pointer" 
                    />
                  </div>

                  {/* Comments notes */}
                  <div className="md:col-span-12 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Ulasan Rekomendasi Karir & Catatan Khusus</label>
                    <textarea
                      placeholder="Wajib diisi oleh kepala sekolah. Cth: Guru berpotensi besar, asessment tp1 prima namun butuh integrasi presentasi LCD interaktif..."
                      rows={3}
                      required
                      value={evalNotes}
                      onChange={(e) => setEvalNotes(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-650 rounded-xl p-3 font-bold text-slate-850 text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-12 flex justify-end gap-2 pt-2 border-t border-slate-200 mt-2">
                    <button
                      type="button"
                      onClick={resetEvalForm}
                      className="px-4 py-2 bg-slate-205 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-slate-900 border border-slate-950 hover:bg-slate-850 text-white font-extrabold rounded-xl shadow-xs"
                    >
                      Simpan Penilaian
                    </button>
                  </div>

                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evaluations list tables */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Histori Hasil Penilaian Guru Resmi</span>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs border-collapse font-medium">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[9px] tracking-wide">
                    <th className="px-4 py-3">Nama Guru</th>
                    <th className="px-3 py-3 text-center">Pedagogis</th>
                    <th className="px-3 py-3 text-center">Profesional</th>
                    <th className="px-3 py-3 text-center">Kepribadian</th>
                    <th className="px-3 py-3 text-center">Sosial</th>
                    <th className="px-3 py-3 text-center">Total Rata²</th>
                    <th className="px-4 py-3">Catatan / Arahan</th>
                    <th className="px-4 py-3 text-right">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold italic">Belum ada evaluasi guru terdaftar.</td>
                    </tr>
                  ) : (
                    evaluations.map((ev) => {
                      const avgScore = Math.round((ev.pedagogicScore + ev.professionalScore + ev.personalScore + ev.socialScore) / 4);
                      return (
                        <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-slate-800">
                          <td className="px-4 py-3 font-black text-slate-900 leading-none">
                            {ev.teacherName}
                            <span className="block text-[8px] uppercase tracking-wider text-indigo-650 font-bold mt-1">
                              {ev.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mapel'} • TA: {ev.academicYear}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold">{ev.pedagogicScore}</td>
                          <td className="px-3 py-3 text-center font-mono font-bold">{ev.professionalScore}</td>
                          <td className="px-3 py-3 text-center font-mono font-bold">{ev.personalScore}</td>
                          <td className="px-3 py-3 text-center font-mono font-bold">{ev.socialScore}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-mono font-black text-[10px] ${
                              avgScore >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {avgScore}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[10px] font-semibold max-w-xs truncate" title={ev.notes}>{ev.notes}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 inline-flex">
                              <button
                                onClick={() => {
                                  const pWin = window.open("", "_blank");
                                  if (!pWin) return;
                                  
                                  const rowG = `
                                    <tr><td>Kompetensi Pedagogis (KBM & Psikologi)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.pedagogicScore}</td></tr>
                                    <tr><td>Kompetensi Profesional (Materi Ajar)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.professionalScore}</td></tr>
                                    <tr><td>Kompetensi Kepribadian (Budi Pekerti/Sikap)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.personalScore}</td></tr>
                                    <tr><td>Kompetensi Sosial (Paguyuban/Interaksi)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.socialScore}</td></tr>
                                    <tr style="background:#f1f5f9; font-weight:bold;"><td>NILAI RATA-RATA EVALUASI</td><td style="text-align:center;">80</td><td style="text-align:center; color:#10b981;">${avgScore}</td></tr>
                                  `;

                                  pWin.document.write(`
                                    <html>
                                      <head>
                                        <title>OFFICIAL PKG - ${ev.teacherName}</title>
                                        <style>
                                          body { font-family: sans-serif; padding:40px; color:#333; font-size:12px; line-height:1.6; }
                                          .head-school { text-align:center; font-weight:bold; font-size:15px; border-bottom:3px double #000; padding-bottom:12px; margin-bottom:20px; }
                                          .meta-grid { width:100%; border-collapse:collapse; margin-bottom:20px; }
                                          .meta-grid td { padding:5px; }
                                          .rep-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
                                          .rep-table th, .rep-table td { border:1px solid #64748b; padding:8px; }
                                          .recom-box { border: 1px solid #000; padding:15px; background:#f8fafc; font-weight:bold; margin-bottom:40px; }
                                          .sigs { width:100%; margin-top:50px; }
                                          .sigs td { text-align:center; width:50%; }
                                        </style>
                                      </head>
                                      <body>
                                        ${schoolIdentity?.letterhead ? `
                                          <div style="width: 100%; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
                                            <img src="${schoolIdentity.letterhead}" style="width: 100%; height: auto; display: block;" />
                                          </div>
                                        ` : `
                                          <div class="head-school">
                                            ${schoolIdentity.name}<br/>
                                            <span style="font-size:10px; font-weight:normal;">Address: ${schoolIdentity.address} | Phone: ${schoolIdentity.phone}</span>
                                          </div>
                                        `}
                                        
                                        <h3 style="text-align:center; text-transform:uppercase; text-decoration:underline;">LEMBAR HASIL PENILAIAN KINERJA GURU (PKG)</h3>
                                        <p style="text-align:center; font-weight:bold; font-size:10px; margin-top:-10px;">TAHUN AJARAN / AKADEMIK: ${ev.academicYear}</p>
                                        
                                        <table class="meta-grid">
                                          <tr><td style="width:20%; font-weight:bold;">Nama Pendidik</td><td>: <strong>${ev.teacherName}</strong></td></tr>
                                          <tr><td style="font-weight:bold;">Tugas Jabatan</td><td>: ${ev.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}</td></tr>
                                          <tr><td style="font-weight:bold;">Penilai / Jabatan</td><td>: ${schoolIdentity.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"} / Kepala Sekolah</td></tr>
                                          <tr><td style="font-weight:bold;">Tanggal Sinkron</td><td>: ${ev.date}</td></tr>
                                        </table>

                                        <h4>A. INDEKS KOMPETENSI RUJUKAN</h4>
                                        <table class="rep-table">
                                          <thead>
                                            <tr style="background:#f1f5f9;"><th>Aspek Kompetensi Utama</th><th style="width:15%">KKM Min</th><th style="width:15%">Nilai Dicapai</th></tr>
                                          </thead>
                                          <tbody>
                                            ${rowG}
                                          </tbody>
                                        </table>

                                        <h4>B. REKOMENDASI KARIR & CATATAN KHUSUS</h4>
                                        <div class="recom-box">
                                          "${ev.notes}"
                                        </div>

                                        <table class="sigs">
                                          <tr>
                                            <td>Guru yang Dinilai<div style="height:70px"></div><strong>( ${ev.teacherName} )</strong></td>
                                            <td>Mengetahui,<br/>Kepala Sekolah<div style="height:70px"></div><strong><u>${schoolIdentity.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"}</u></strong><br/>NIP. Demonstration Creds</td>
                                          </tr>
                                        </table>
                                        <script>window.print();</script>
                                      </body>
                                    </html>
                                  `);
                                  pWin.document.close();
                                }}
                                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 rounded text-[9.5px] font-black text-slate-800 cursor-pointer inline-flex items-center gap-1 leading-none shadow-3xs"
                                title="Print Hasil Rubrik"
                              >
                                <Printer size={10} /> Print
                              </button>
                              <button
                                onClick={() => handleDeleteEvaluation(ev.id)}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded cursor-pointer shrink-0"
                                title="Detele Record"
                              >
                                <Trash2 size={11} />
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

            {/* Mobile View - Card Layout */}
            <div className="block md:hidden">
              {evaluations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold italic border-t border-slate-100">
                  Belum ada evaluasi guru terdaftar.
                </div>
              ) : (
                <div className="flex flex-col gap-4 p-4 border-t border-slate-100 bg-slate-50/30">
                  {evaluations.map((ev) => {
                    const avgScore = Math.round((ev.pedagogicScore + ev.professionalScore + ev.personalScore + ev.socialScore) / 4);
                    return (
                      <div
                        key={`mob-ev-${ev.id}`}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3 hover:border-slate-300 transition-colors text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            <span className="font-extrabold text-slate-900 text-sm leading-tight">
                              {ev.teacherName}
                            </span>
                            <span className="inline-block text-[9px] uppercase tracking-wider text-indigo-600 font-bold mt-1">
                              {ev.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mapel'} • TA: {ev.academicYear}
                            </span>
                          </div>
                          <div className="text-right flex flex-col items-end shrink-0">
                            <span className={`px-2 py-1 rounded font-mono font-black text-xs ${
                              avgScore >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {avgScore}
                            </span>
                            <span className="text-[7.5px] text-slate-400 uppercase tracking-widest font-bold mt-1">
                              Rata-Rata
                            </span>
                          </div>
                        </div>

                        {/* Rating Parameters Grid */}
                        <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-[10px] select-none">
                          <div className="flex justify-between items-center pr-2 border-r border-slate-200/60">
                            <span className="text-slate-500 font-semibold">Pedagogis</span>
                            <span className="font-mono font-bold text-slate-900">{ev.pedagogicScore}</span>
                          </div>
                          <div className="flex justify-between items-center pl-2">
                            <span className="text-slate-500 font-semibold">Profesional</span>
                            <span className="font-mono font-bold text-slate-900">{ev.professionalScore}</span>
                          </div>
                          <div className="flex justify-between items-center pr-2 border-r border-slate-200/60 pt-2 border-t border-slate-200/40">
                            <span className="text-slate-500 font-semibold">Kepribadian</span>
                            <span className="font-mono font-bold text-slate-900">{ev.personalScore}</span>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-2 border-t border-slate-200/40">
                            <span className="text-slate-500 font-semibold">Sosial</span>
                            <span className="font-mono font-bold text-slate-900">{ev.socialScore}</span>
                          </div>
                        </div>

                        {/* Note Section */}
                        {ev.notes && (
                          <div className="text-[10px] text-slate-600 italic bg-amber-50/20 p-2.5 rounded-lg border border-amber-100/50 leading-relaxed font-sans">
                            <span className="font-extrabold text-[8px] uppercase tracking-wider text-amber-700 block mb-0.5 not-italic">Catatan Kepala Sekolah</span>
                            &ldquo;{ev.notes}&rdquo;
                          </div>
                        )}

                        {/* Divider and Actions */}
                        <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                          <span className="text-[8.5px] font-mono text-slate-400">
                            Tgl: {ev.date}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const pWin = window.open("", "_blank");
                                if (!pWin) return;
                                
                                const rowG = `
                                  <tr><td>Kompetensi Pedagogis (KBM & Psikologi)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.pedagogicScore}</td></tr>
                                  <tr><td>Kompetensi Profesional (Materi Ajar)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.professionalScore}</td></tr>
                                  <tr><td>Kompetensi Kepribadian (Budi Pekerti/Sikap)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.personalScore}</td></tr>
                                  <tr><td>Kompetensi Sosial (Paguyuban/Interaksi)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.socialScore}</td></tr>
                                  <tr style="background:#f1f5f9; font-weight:bold;"><td>NILAI RATA-RATA EVALUASI</td><td style="text-align:center;">80</td><td style="text-align:center; color:#10b981;">${avgScore}</td></tr>
                                `;

                                pWin.document.write(`
                                  <html>
                                    <head>
                                      <title>OFFICIAL PKG - ${ev.teacherName}</title>
                                      <style>
                                        body { font-family: sans-serif; padding:40px; color:#333; font-size:12px; line-height:1.6; }
                                        .head-school { text-align:center; font-weight:bold; font-size:15px; border-bottom:3px double #000; padding-bottom:12px; margin-bottom:20px; }
                                        .meta-grid { width:100%; border-collapse:collapse; margin-bottom:20px; }
                                        .meta-grid td { padding:5px; }
                                        .rep-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
                                        .rep-table th, .rep-table td { border:1px solid #64748b; padding:8px; }
                                        .recom-box { border: 1px solid #000; padding:15px; background:#f8fafc; font-weight:bold; margin-bottom:40px; }
                                        .sigs { width:100%; margin-top:50px; }
                                        .sigs td { text-align:center; width:50%; }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="head-school">
                                        ${schoolIdentity.name}<br/>
                                        <span style="font-size:10px; font-weight:normal;">Address: ${schoolIdentity.address} | Phone: ${schoolIdentity.phone}</span>
                                      </div>
                                      
                                      <h3 style="text-align:center; text-transform:uppercase; text-decoration:underline;">LEMBAR HASIL PENILAIAN KINERJA GURU (PKG)</h3>
                                      <p style="text-align:center; font-weight:bold; font-size:10px; margin-top:-10px;">TAHUN AJARAN / AKADEMIK: ${ev.academicYear}</p>
                                      
                                      <table class="meta-grid">
                                        <tr><td style="width:20%; font-weight:bold;">Nama Pendidik</td><td>: <strong>${ev.teacherName}</strong></td></tr>
                                        <tr><td style="font-weight:bold;">Tugas Jabatan</td><td>: ${ev.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}</td></tr>
                                        <tr><td style="font-weight:bold;">Penilai / Jabatan</td><td>: ${schoolIdentity.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"} / Kepala Sekolah</td></tr>
                                        <tr><td style="font-weight:bold;">Tanggal Sinkron</td><td>: ${ev.date}</td></tr>
                                      </table>

                                      <h4>A. INDEKS KOMPETENSI RUJUKAN</h4>
                                      <table class="rep-table">
                                        <thead>
                                          <tr style="background:#f1f5f9;"><th>Aspek Kompetensi Utama</th><th style="width:15%">KKM Min</th><th style="width:15%">Nilai Dicapai</th></tr>
                                        </thead>
                                        <tbody>
                                          ${rowG}
                                        </tbody>
                                      </table>

                                      <h4>B. REKOMENDASI KARIR & CATATAN KHUSUS</h4>
                                      <div class="recom-box">
                                        "${ev.notes}"
                                      </div>

                                      <table class="sigs">
                                        <tr>
                                          <td>Guru yang Dinilai<div style="height:70px"></div><strong>( ${ev.teacherName} )</strong></td>
                                          <td>Mengetahui,<br/>Kepala Sekolah<div style="height:70px"></div><strong><u>${schoolIdentity.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"}</u></strong><br/>NIP. Demonstration Creds</td>
                                        </tr>
                                      </table>
                                      <script>window.print();</script>
                                    </body>
                                  </html>
                                `);
                                pWin.document.close();
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-lg border border-slate-200 shadow-3xs cursor-pointer flex items-center justify-center gap-1 transition-colors"
                            >
                              <Printer size={11} className="text-slate-600" /> Web Cetak
                            </button>
                            <button
                              onClick={() => handleDeleteEvaluation(ev.id)}
                              className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded border border-rose-200 cursor-pointer flex items-center justify-center transition-colors"
                              title="Hapus Penilaian"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TEACHING JOURNAL LOGS PREVIEWS */}
      {activeTab === 'journals' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <h2 className="text-slate-900 font-black text-lg leading-tight">📚 Jurnal Mengajar & Presensi (Guru Mapel & Wali Kelas)</h2>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Oversight KBM harian di SMP Maarif NU Pandaan. Pantau materi ajar yang dibawakan ditiap tatap muka pelajaran maupun bimbingan wali kelas lengkap dengan rekap absensi harian secara transparan.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-left">
            {/* Filter segments & Toolbar */}
            <div className="flex flex-col gap-4 pb-4 border-b border-slate-100 mb-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setJournalFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      journalFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Semua ({journals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setJournalFilter('subject')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      journalFilter === 'subject'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Guru Mapel ({journals.filter(j => (j.teacherType === 'subject_teacher' || !j.teacherType) && !((j.topic || '').includes('Tidak Hadir') || (j.notes || '') === 'Tidak Hadir')).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setJournalFilter('homeroom')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      journalFilter === 'homeroom'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Wali Kelas ({journals.filter(j => j.teacherType === 'homeroom').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setJournalFilter('absent')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      journalFilter === 'absent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span>⚠️ Guru Tidak Hadir ({journals.filter(j => (j.topic || '').includes('Tidak Hadir') || (j.notes || '') === 'Tidak Hadir').length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSyncAbsentJournals}
                    disabled={isSyncingAbsentJournals}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    title="Sinkronkan otomatis guru yang belum mengisi jurnal sesuai jadwal ke database MySQL"
                  >
                    <RefreshCw size={12} className={isSyncingAbsentJournals ? 'animate-spin' : ''} />
                    <span>{isSyncingAbsentJournals ? 'Menyinkronkan...' : 'Sinkronkan Guru Tidak Hadir'}</span>
                  </button>

                  {/* Search Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari materi, guru, mapel, kelas..."
                      value={journalSearchQuery}
                      onChange={(e) => setJournalSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Filter Row: Filter Guru Mapel, Filter Wali Kelas, Filter Kelas */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                {/* Filter Guru Mapel */}
                <div className="flex items-center gap-1.5 bg-indigo-50/60 border border-indigo-100 px-3 py-1.5 rounded-xl">
                  <User size={13} className="text-indigo-600 shrink-0" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase">Guru Mapel:</span>
                  <select
                    value={selectedSubjectTeacherFilter}
                    onChange={(e) => setSelectedSubjectTeacherFilter(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer max-w-[170px] truncate"
                  >
                    <option value="all">Semua Guru Mapel</option>
                    {uniqueSubjectTeacherNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Wali Kelas */}
                <div className="flex items-center gap-1.5 bg-emerald-50/60 border border-emerald-100 px-3 py-1.5 rounded-xl">
                  <User size={13} className="text-emerald-600 shrink-0" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase">Wali Kelas:</span>
                  <select
                    value={selectedHomeroomTeacherFilter}
                    onChange={(e) => setSelectedHomeroomTeacherFilter(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="all">Semua Wali Kelas</option>
                    {uniqueHomeroomTeacherList.map(item => (
                      <option key={item.name} value={item.name}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Kelas:</span>
                  <select
                    value={journalClassFilter}
                    onChange={(e) => setJournalClassFilter(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Kelas</option>
                    {uniqueJournalClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                {(selectedSubjectTeacherFilter !== 'all' || selectedHomeroomTeacherFilter !== 'all' || journalClassFilter !== 'all' || journalSearchQuery || journalStartDate || journalEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectTeacherFilter('all');
                      setSelectedHomeroomTeacherFilter('all');
                      setJournalClassFilter('all');
                      setJournalSearchQuery('');
                      setJournalStartDate('');
                      setJournalEndDate('');
                    }}
                    className="text-[10px] font-extrabold text-rose-600 hover:underline px-2 py-1 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Date Range & Total Count */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold flex-wrap">
                  <Calendar size={13} className="text-teal-600 shrink-0" />
                  <span>Tanggal:</span>
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
                </div>

                <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-extrabold font-mono uppercase tracking-wider">
                  {filteredJournals.length} Jurnal Ditampilkan
                </span>
              </div>
            </div>

            {filteredJournals.length === 0 ? (
              <div className="py-24 text-center text-slate-400 font-semibold italic text-xs leading-relaxed">
                {journals.length === 0
                  ? "Belum ada guru mapel maupun wali kelas yang mengisi jurnal pengajaran hari ini di server."
                  : "Tidak ada jurnal mengajar yang sesuai dengan kriteria filter."}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredJournals.map((j) => {
                  const presentC = j.attendance ? j.attendance.filter((a: any) => a.status === 'Hadir' || a.status === 'Terlambat').length : 0;
                  const totalC = j.attendance ? j.attendance.length : 0;
                  const isHomeroom = j.teacherType === 'homeroom';
                  const isAbsentTeacher = (j.topic || '').includes('Tidak Hadir') || (j.notes || '') === 'Tidak Hadir';

                  return (
                    <div key={j.id} className={`border rounded-2xl p-4 transition-colors flex flex-col gap-3 relative overflow-hidden ${
                      isAbsentTeacher 
                        ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                      
                      {/* Left color bar indicator */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                        isAbsentTeacher ? 'bg-rose-500' : (isHomeroom ? 'bg-emerald-500' : 'bg-indigo-500')
                      }`} />

                      {/* Journal Header meta */}
                      <div className="flex items-start justify-between flex-wrap gap-2 text-xs pl-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md font-sans text-[8px] font-black tracking-wider uppercase ${
                              isAbsentTeacher
                                ? 'bg-rose-100 text-rose-800'
                                : (isHomeroom ? 'bg-emerald-150 text-emerald-800' : 'bg-indigo-50 text-indigo-800')
                            }`}>
                              {j.subject}
                            </span>
                            
                            <span className={`px-1.5 py-0.5 rounded-md font-sans text-[8px] font-extrabold ${
                              isAbsentTeacher
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : (isHomeroom ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-blue-50 text-blue-800 border border-blue-200')
                            }`}>
                              {isAbsentTeacher ? '⚠️ Guru Tidak Hadir' : (isHomeroom ? '📂 Jurnal Wali Kelas' : '📖 Jurnal Guru Mapel')}
                            </span>
                          </div>

                          <h4 className={`font-extrabold text-sm leading-tight mt-1.5 ${isAbsentTeacher ? 'text-rose-950' : 'text-slate-900'}`}>
                            Materi: {j.topic}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap text-slate-500 text-[10px] mt-1 font-semibold">
                            <span>Nama Guru: {j.teacherName}</span>
                            <span>•</span>
                            <span>Kelas: {j.className}</span>
                            {j.jamKe && (
                              <>
                                <span>•</span>
                                <span>Jam Ke: {j.jamKe}</span>
                              </>
                            )}
                            {j.pertemuanKe && (
                              <>
                                <span>•</span>
                                <span>Pertemuan Ke: {j.pertemuanKe}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-[10px] font-semibold text-slate-400 shrink-0">
                          <span className="font-mono block">Sinkron: {j.date}</span>
                          <span className="text-emerald-600 font-bold block mt-0.5">
                            Presensi: {presentC} / {totalC} Siswa Hadir
                          </span>
                        </div>
                      </div>

                      {/* Topic goals detail description */}
                      {(j.tujuanPembelajaran || j.notes || j.pencapaianKktp) && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 leading-relaxed font-medium ml-2.5">
                          {j.tujuanPembelajaran && (
                            <div>
                              <strong className="text-slate-900 block text-[9px] uppercase tracking-wider font-extrabold text-slate-405">Tujuan Pembelajaran / Bimbingan</strong>
                              <p className="mt-0.5 italic">{j.tujuanPembelajaran}</p>
                            </div>
                          )}
                          {j.notes && (
                            <div>
                              <strong className="text-slate-900 block text-[9px] uppercase tracking-wider font-extrabold text-slate-405">Catatan & Kejadian KBM</strong>
                              <p className="mt-0.5">{j.notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BK GUIDANCE & moral MONITORING LOGS */}
      {activeTab === 'bk_monitoring' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 to-amber-500" />
            <h2 className="text-slate-900 font-black text-lg leading-tight flex items-center gap-1.5">
              🛡️ Log Konseling BK & Kedisiplinan Pelanggaran Moral
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Pantau langsung log asessment konseling (BK) dan data pelanggaran disiplin moral harian yang dicatat oleh wali kelas ditiap jenjang.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* BK Counseling column pane */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4 text-xs font-semibold text-slate-450 text-slate-500">
                <span>Riwayat Bimbingan Konseling (BK)</span>
                <span className="text-[9px] bg-slate-150 bg-slate-100 text-slate-705 px-2 py-0.5 rounded text-slate-700">{counselingLogs.length} Kasus</span>
              </div>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                {counselingLogs.length === 0 ? (
                  <p className="text-slate-400 py-12 italic text-center text-xs">Belum ada catatan BK siswa dilaporkan wali kelas.</p>
                ) : (
                  counselingLogs.map((c) => (
                    <div key={c.id} className="border border-slate-200 p-4 rounded-2xl flex flex-col gap-2.5 hover:border-slate-300 transition-colors">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                        <span>Tgl: {c.date} | Kelas: {c.className}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-[12px] leading-tight">Siswa: {c.studentName}</h4>
                      <p className="text-[11px] text-slate-800 font-bold bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-normal">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Topik Hambatan:</span>
                        {c.topic}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] leading-normal font-medium text-slate-500 mt-1">
                        <div>
                          <strong className="text-indigo-801 text-indigo-700 block text-[9px] font-black uppercase">Solusi Tindakan</strong>
                          <p>{c.actionPlan || '-'}</p>
                        </div>
                        <div>
                          <strong className="text-emerald-801 text-emerald-700 block text-[9px] font-black uppercase">Hasil / Status</strong>
                          <p>{c.result || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Infractions column pane */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4 text-xs font-semibold text-slate-450 text-slate-500">
                <span>Histori Kasus Pelanggaran Disiplin</span>
                <span className="text-[9px] bg-rose-50 text-rose-805 px-2 py-0.5 rounded text-rose-700 font-bold">{infractionLogs.length} Laporan</span>
              </div>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                {infractionLogs.length === 0 ? (
                  <p className="text-slate-405 text-slate-400 py-12 italic text-center text-xs">Bersih. Tidak ada kasus kedisiplinan dilaporkan.</p>
                ) : (
                  infractionLogs.map((i) => {
                    const isReduction = i.points !== undefined && i.points < 0;
                    return (
                      <div key={i.id} className={`border p-4 rounded-2xl flex flex-col gap-2.5 transition-colors ${
                        isReduction 
                          ? 'bg-emerald-50/10 border-emerald-200/50 hover:border-emerald-350' 
                          : 'bg-rose-50/10 border-rose-200/50 hover:border-rose-300'
                      }`}>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                          <span>Tgl: {i.date} | Jam Ke: {i.time || '-'}</span>
                          <span className={`px-1 rounded-sm text-[8px] uppercase font-black tracking-widest ${
                            i.resolutionStatus === 'Selesai' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800 animate-pulse'
                          }`}>
                            {i.resolutionStatus}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-[12px] leading-tight flex items-center justify-between gap-2">
                          <span>Pelanggar: {i.studentName} (Kelas {i.className})</span>
                          {i.points !== undefined && (
                            <span className={`px-1.5 py-0.5 border text-[9px] rounded-md font-black font-mono shrink-0 ${
                              isReduction ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-700 border-rose-200'
                            }`}>
                              {isReduction ? 'Pengurangan:' : 'Poin:'} {i.points} pt
                            </span>
                          )}
                        </h4>
                        
                        <div className={`border-l-2 pl-3 py-1 text-[11px] leading-relaxed ${isReduction ? 'border-emerald-500' : 'border-rose-500'}`}>
                          <span className={`block text-[8.5px] uppercase tracking-wider font-extrabold ${isReduction ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isReduction ? 'Pengurangan Poin oleh Guru BK' : 'Jenis Pelanggaran Disiplin'}
                          </span>
                          <p className="font-bold text-slate-800 mt-0.5">{i.infractionType}</p>
                        </div>

                        <div className="text-[10px] text-slate-600 leading-normal font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                          <strong className="text-slate-900 block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {isReduction ? 'Hasil Pembinaan & Pembiasaan Selesai' : 'Tindak Lanjut & Sanksi Diberikan'}
                          </strong>
                          <p className="mt-0.5">{i.actionTaken}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'jadwal' && (
        <div className="w-full text-left">
          <ScheduleView
            role="principal"
            schedules={classSchedules}
            onRefreshSchedule={onRefresh}
            availableClasses={Array.from(new Set(students.map(s => s.class))).filter(Boolean).sort()}
            subjectTeachers={subjectTeachers}
            homerooms={homerooms}
          />
        </div>
      )}

      {/* 5.5 ATTENDANCE RECAP VIEW */}
      {activeTab === 'attendance_recap' && (
        <div className="flex flex-col gap-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            <div>
              <h2 className="text-slate-900 font-black text-lg leading-tight flex items-center gap-2">
                📅 Rekapitulasi Presensi & Kehadiran Siswa
              </h2>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-3xl">
                Pantau statistik kehadiran harian siswa per kelas maupun seluruh sekolah berdasarkan rentang tanggal. Hasil rekapitulasi dapat dicetak atau diekspor langsung.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrintPdfPrincipalAttendance}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs cursor-pointer transition-all shadow-xs"
              >
                <Printer size={14} /> Cetak PDF (.pdf)
              </button>
              <button
                type="button"
                onClick={handleDownloadPrincipalAttendanceXLS}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs cursor-pointer transition-all shadow-xs"
              >
                <Download size={14} /> Ekspor Excel (.xls)
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-xs flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Tanggal Mulai */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={rekapStartDate}
                  onChange={(e) => setRekapStartDate(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full"
                />
              </div>

              {/* Tanggal Selesai */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={rekapEndDate}
                  onChange={(e) => setRekapEndDate(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full"
                />
              </div>

              {/* Filter Kelas */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Pilih Kelas
                </label>
                <select
                  value={rekapClassFilter}
                  onChange={(e) => setRekapClassFilter(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full"
                >
                  <option value="all">Semua Kelas ({availableClassesForPrincipal.length} Kelas)</option>
                  {availableClassesForPrincipal.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Status Presensi
                </label>
                <select
                  value={rekapStatusFilter}
                  onChange={(e) => setRekapStatusFilter(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full"
                >
                  <option value="all">Semua Status Presensi</option>
                  <option value="Hadir">Ada Catatan Hadir (H)</option>
                  <option value="Sakit">Ada Catatan Sakit (S)</option>
                  <option value="Izin">Ada Catatan Izin (I)</option>
                  <option value="Alpha">Ada Catatan Alpha (A)</option>
                  <option value="Terlambat">Ada Catatan Terlambat (T)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa atau NIS..."
                  value={rekapSearchQuery}
                  onChange={(e) => setRekapSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Quick Preset Date Filters */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    setRekapStartDate(`${y}-${m}-01`);
                    setRekapEndDate(`${y}-${m}-${d}`);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const startObj = new Date();
                    startObj.setDate(startObj.getDate() - 7);
                    const start = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
                    setRekapStartDate(start);
                    setRekapEndDate(end);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const startObj = new Date();
                    startObj.setDate(startObj.getDate() - 30);
                    const start = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
                    setRekapStartDate(start);
                    setRekapEndDate(end);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  30 Hari Terakhir
                </button>
              </div>
            </div>
          </div>

          {/* Metric Cards Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 border border-slate-200 rounded-3xl flex flex-col justify-center shadow-xs">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Siswa</span>
              <span className="text-xl font-black text-slate-900 mt-1 font-mono">{rekapSiswaPrincipalList.length}</span>
              <span className="text-[9px] text-slate-400 font-bold mt-0.5">{rekapClassFilter === 'all' ? 'Seluruh Kelas' : `Kelas ${rekapClassFilter}`}</span>
            </div>

            <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-3xl flex flex-col justify-center shadow-xs">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Hadir (H)</span>
              <span className="text-xl font-black text-emerald-700 mt-1 font-mono">{totalRekapHadir}</span>
              <span className="text-[9px] text-emerald-600 font-bold mt-0.5">Catatan Hadir</span>
            </div>

            <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-3xl flex flex-col justify-center shadow-xs">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Sakit (S)</span>
              <span className="text-xl font-black text-blue-700 mt-1 font-mono">{totalRekapSakit}</span>
              <span className="text-[9px] text-blue-600 font-bold mt-0.5">Izin Sakit</span>
            </div>

            <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-3xl flex flex-col justify-center shadow-xs">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Izin (I)</span>
              <span className="text-xl font-black text-amber-700 mt-1 font-mono">{totalRekapIzin}</span>
              <span className="text-[9px] text-amber-600 font-bold mt-0.5">Izin Keperluan</span>
            </div>

            <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-3xl flex flex-col justify-center shadow-xs">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider">Alpha (A)</span>
              <span className="text-xl font-black text-rose-700 mt-1 font-mono">{totalRekapAlpha}</span>
              <span className="text-[9px] text-rose-600 font-bold mt-0.5">Tanpa Keterangan</span>
            </div>

            <div className="bg-purple-50/50 p-4 border border-purple-100 rounded-3xl flex flex-col justify-center shadow-xs">
              <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider">Rata-rata Kehadiran</span>
              <span className="text-xl font-black text-purple-700 mt-1 font-mono">{avgPctKehadiran}%</span>
              <span className="text-[9px] text-purple-600 font-bold mt-0.5">Tingkat Kehadiran</span>
            </div>
          </div>

          {/* Class Breakdown Overview */}
          {rekapClassFilter === 'all' && rekapPerKelasSummary.length > 0 && (
            <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">📊 Ringkasan Kehadiran per Kelas</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Klik salah satu kelas untuk memfilter detail siswa di bawah ini.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {rekapPerKelasSummary.map(c => {
                  const classHariTotal = c.hadir + c.sakit + c.izin + c.alpha + c.terlambat;
                  const classPct = classHariTotal > 0 ? Math.round(((c.hadir + c.terlambat) / classHariTotal) * 100) : 100;
                  return (
                    <div
                      key={c.className}
                      onClick={() => setRekapClassFilter(c.className)}
                      className="p-3.5 border border-slate-200 hover:border-indigo-400 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900">Kelas {c.className}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono ${
                          classPct >= 90 ? 'bg-emerald-100 text-emerald-800' : classPct >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {classPct}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Wali: <span className="font-bold text-slate-700">{c.waliKelas}</span></p>
                      <div className="grid grid-cols-5 gap-1 mt-3 text-center text-[9px] font-mono font-black pt-2 border-t border-slate-200/60">
                        <div className="text-emerald-700">H: {c.hadir}</div>
                        <div className="text-blue-700">S: {c.sakit}</div>
                        <div className="text-amber-700">I: {c.izin}</div>
                        <div className="text-rose-700">A: {c.alpha}</div>
                        <div className="text-purple-700">T: {c.terlambat}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rincian Table per Siswa */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">📋 Detail Rekap Presensi Siswa</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Menampilkan {rekapSiswaPrincipalList.length} siswa berdasarkan filter terpilih.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Urutkan:</span>
                <select
                  value={rekapSortBy}
                  onChange={(e) => setRekapSortBy(e.target.value as any)}
                  className="px-2.5 py-1 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="class">Kelas</option>
                  <option value="name">Nama Siswa</option>
                  <option value="hadir">Hadir (H)</option>
                  <option value="sakit">Sakit (S)</option>
                  <option value="izin">Izin (I)</option>
                  <option value="alpha">Alpha (A)</option>
                  <option value="terlambat">Terlambat (T)</option>
                  <option value="pct">% Kehadiran</option>
                </select>
                <button
                  type="button"
                  onClick={() => setRekapSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Balik Urutan"
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>

            {rekapSiswaPrincipalList.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center p-4">
                <Calendar size={32} className="text-slate-300 mb-2" />
                <span className="text-xs font-extrabold text-slate-600">Tidak ada data rekap presensi ditemukan</span>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">Ubah rentang tanggal, filter kelas, atau kata kunci pencarian Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3 text-center w-10">No</th>
                      <th className="py-3 px-3">NIS</th>
                      <th className="py-3 px-3">Nama Lengkap Siswa</th>
                      <th className="py-3 px-3 text-center">Kelas</th>
                      <th className="py-3 px-3 text-center text-emerald-700">Hadir (H)</th>
                      <th className="py-3 px-3 text-center text-blue-700">Sakit (S)</th>
                      <th className="py-3 px-3 text-center text-amber-700">Izin (I)</th>
                      <th className="py-3 px-3 text-center text-rose-700">Alpha (A)</th>
                      <th className="py-3 px-3 text-center text-purple-700">Terlambat (T)</th>
                      <th className="py-3 px-3 text-center">Total Hari</th>
                      <th className="py-3 px-3 text-center">% Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rekapSiswaPrincipalList.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.student.nis || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-slate-900 block">{item.student.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[10px]">
                            {item.student.class || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-emerald-700">{item.hadir}</td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-blue-700">{item.sakit}</td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-amber-700">{item.izin}</td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-rose-700">{item.alpha}</td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-purple-700">{item.terlambat}</td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-700">{item.totalHari}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono inline-block ${
                            item.pct >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.pct >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800 animate-pulse'
                          }`}>
                            {item.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5.5 FINANCE MONITORING TAB */}
      {activeTab === 'finance_monitoring' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            <h2 className="text-slate-900 font-black text-lg leading-tight flex items-center gap-1.5">
              💰 Portal Monitoring Transaksi & Pos Keuangan Sekolah (Bendahara)
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Pantau arus kas masuk (pembayaran SPP, deposit tabungan, hibahan BOS/Yayasan) dan arus kas keluar (gaji, operasional, penarikan tabungan) secara real-time langsung dari pembukuan Bendahara Sekolah.
            </p>
          </div>

          {/* Quick Metrics Section */}
          {(() => {
            let totalSpp = 0;
            let totalSavingsDeposit = 0;
            let totalSavingsWithdrawal = 0;
            let totalCustomIncoming = 0;
            let totalCustomOutgoing = 0;

            financialTransactions.forEach(t => {
              if (t.source === 'spp') {
                totalSpp += Number(t.amount) || 0;
              } else if (t.source === 'savings') {
                if (t.type === 'incoming') totalSavingsDeposit += Number(t.amount) || 0;
                else totalSavingsWithdrawal += Number(t.amount) || 0;
              } else {
                if (t.type === 'incoming') totalCustomIncoming += Number(t.amount) || 0;
                else totalCustomOutgoing += Number(t.amount) || 0;
              }
            });

            const totalInflow = totalSpp + totalSavingsDeposit + totalCustomIncoming;
            const totalOutflow = totalSavingsWithdrawal + totalCustomOutgoing;
            const netBalance = totalInflow - totalOutflow;
            const netSavings = totalSavingsDeposit - totalSavingsWithdrawal;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Main cash balance */}
                <div className="bg-slate-950 text-white p-5 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col justify-between h-36 shadow-lg text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Buku Kas Sekolah</span>
                    <span className="p-1 px-1.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-lg text-[9px] font-bold tracking-wider uppercase">Lembaga Terpadu</span>
                  </div>
                  <div className="my-2 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold">Net Cash Balance</span>
                    <span className="text-xl font-black text-yellow-300 font-mono">{formatIDR(netBalance)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-850 pt-2.5 mt-1 font-semibold leading-none">
                    <span className="text-emerald-400 text-xs">●</span>
                    <span>Total Modal & Kas Terkumpul</span>
                  </div>
                </div>

                {/* Card 2: Total automatically integrated SPP Payment */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col justify-between h-36 shadow-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pemasukan SPP Otomatis</span>
                    <span className="p-1 px-1.5 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-bold tracking-wider uppercase">Teller & Online</span>
                  </div>
                  <div className="my-2 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold">Tagihan SPP Lunas</span>
                    <span className="text-xl font-extrabold text-blue-700 font-mono">{formatIDR(totalSpp)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-550 border-t border-slate-100 pt-2.5 mt-1 font-semibold leading-none">
                    <span className="text-blue-500 text-xs">●</span>
                    <span>Sistem Realtime Terintegrasi</span>
                  </div>
                </div>

                {/* Card 3: Tabungan mutasi integration */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col justify-between h-36 shadow-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mutasi Tabungan Siswa</span>
                    <span className="p-1 px-1.5 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-bold tracking-wider uppercase">Saldo Titipan</span>
                  </div>
                  <div className="my-2 flex flex-col">
                    <span className="text-[10px] text-slate-550 font-bold">Tabungan Neto (Ledger)</span>
                    <span className="text-xl font-extrabold text-amber-700 font-mono">{formatIDR(netSavings)}</span>
                    <div className="flex justify-between items-center text-[9px] text-slate-450 font-bold mt-1.5 leading-none">
                      <span>S: <b className="text-emerald-600 font-black">+{formatIDR(totalSavingsDeposit)}</b></span>
                      <span>T: <b className="text-rose-600 font-black">-{formatIDR(totalSavingsWithdrawal)}</b></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-550 border-t border-slate-100 pt-2.5 mt-1 font-semibold leading-none">
                    <span className="text-amber-500 text-xs">●</span>
                    <span>Deposit & Tarik Otomatis</span>
                  </div>
                </div>

                {/* Card 4: Other tactical cashbook items */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col justify-between h-36 shadow-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kas Operasional Utama</span>
                    <span className="p-1 px-1.5 bg-purple-50 text-purple-700 rounded-lg text-[9px] font-bold tracking-wider uppercase">Manual</span>
                  </div>
                  <div className="my-2 flex flex-col gap-1 justify-center">
                    <div className="flex justify-between items-baseline leading-none">
                      <span className="text-[10px] text-slate-400 font-semibold">Masuk:</span>
                      <span className="text-xs font-bold font-mono text-emerald-600">+{formatIDR(totalCustomIncoming)}</span>
                    </div>
                    <div className="flex justify-between items-baseline leading-none">
                      <span className="text-[10px] text-slate-400 font-semibold">Keluar:</span>
                      <span className="text-xs font-bold font-mono text-rose-600">-{formatIDR(totalCustomOutgoing)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-550 border-t border-slate-100 pt-2.5 mt-1 font-semibold leading-none">
                    <span className="text-purple-500 text-xs">●</span>
                    <span>Dana BOS, Gaji, Renovasi, dll</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Graphical Trends Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cash Flow Trends Graph */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs lg:col-span-2">
              <h3 className="text-slate-800 text-xs font-black uppercase tracking-wider pb-2 border-b border-slate-100 mb-4">
                📈 Tren Pergerakan Kas Masuk vs Keluar Harian-Bauran
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(() => {
                      const days: { [key: string]: { date: string, income: number, expense: number } } = {};
                      financialTransactions.forEach(t => {
                        const dateStr = t.date || 'Unknown';
                        if (!days[dateStr]) {
                          days[dateStr] = { date: dateStr, income: 0, expense: 0 };
                        }
                        if (t.type === 'incoming') {
                          days[dateStr].income += t.amount || 0;
                        } else {
                          days[dateStr].expense += t.amount || 0;
                        }
                      });
                      return Object.values(days).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
                    })()}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} formatter={(val) => formatIDR(Number(val))} />
                    <Line type="monotone" dataKey="income" name="Penerimaan" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Income Distribution by Category */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
              <h3 className="text-slate-800 text-xs font-black uppercase tracking-wider pb-2 border-b border-slate-100 mb-4">
                🍩 Distribusi Inflow Berdasarkan Kategori
              </h3>
              <div className="h-64 flex flex-col justify-between">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const categories: { [key: string]: number } = {};
                        financialTransactions.filter(t => t.type === 'incoming').forEach(t => {
                          const cat = t.category || 'Utama';
                          categories[cat] = (categories[cat] || 0) + Number(t.amount);
                        });
                        return Object.entries(categories).map(([name, value]) => ({ name, value }));
                      })()}
                      cx="51%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(val) => formatIDR(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Custom Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-2">
                  {(() => {
                    const categories: { [key: string]: number } = {};
                    financialTransactions.filter(t => t.type === 'incoming').forEach(t => {
                      const cat = t.category || 'Utama';
                      categories[cat] = (categories[cat] || 0) + Number(t.amount);
                    });
                    const colorPalette = ['text-emerald-500', 'text-blue-500', 'text-amber-500', 'text-purple-500', 'text-pink-500', 'text-teal-500'];
                    return Object.entries(categories).map(([name, val], index) => (
                      <span key={name} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-650">
                        <span className={`text-[12px] ${colorPalette[index % colorPalette.length]}`}>●</span> {name} ({formatIDR(val)})
                      </span>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger table card list */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">📖 Detail Jurnal Ledger Arus Kas Internal</h3>
                <p className="text-slate-500 text-[11px] mt-0.5 font-medium leading-relaxed">
                  Menyajikan semua transaksi yang tercatat didalam ledger keuangan pusat sekolah. Klik tombol sinkronisasi jika ada transaksi baru.
                </p>
              </div>

              {/* Filtering layout bar */}
              <div className="flex flex-wrap gap-2 items-center">
                
                {/* Search query input */}
                <div className="relative">
                  <input
                    type="text"
                    value={financeSearch}
                    onChange={(e) => setFinanceSearch(e.target.value)}
                    placeholder="Cari deskripsi..."
                    className="pl-8 pr-3 py-2 border border-slate-200 focus:border-slate-850 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none w-44"
                  />
                  <Search size={12} className="absolute left-3 top-3 text-slate-400" />
                </div>

                {/* Filter Type */}
                <select
                  value={financeTypeFilter}
                  onChange={(e) => setFinanceTypeFilter(e.target.value as any)}
                  className="p-2 border border-slate-200 focus:border-slate-850 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="incoming">Pemasukan (+)</option>
                  <option value="outgoing">Pengeluaran (-)</option>
                </select>

                {/* Filter Source */}
                <select
                  value={financeSourceFilter}
                  onChange={(e) => setFinanceSourceFilter(e.target.value as any)}
                  className="p-2 border border-slate-200 focus:border-slate-850 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="all">Semua Asal</option>
                  <option value="spp">Arus SPP</option>
                  <option value="savings">Arus Tabungan</option>
                  <option value="custom">Arus Operasional</option>
                </select>

              </div>
            </div>

            {loadingFinance ? (
              <div className="text-center py-16 text-slate-400 font-extrabold text-xs">
                <RefreshCw className="animate-spin h-5 w-5 mx-auto mb-3 text-indigo-750" />
                <span>Memuat Ledger Transaksi...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-extrabold text-[9px] tracking-wider">
                      <th className="pb-3 text-center w-12">No</th>
                      <th className="pb-3">Tanggal</th>
                      <th className="pb-3">Asal/Tipe</th>
                      <th className="pb-3">Kategori</th>
                      <th className="pb-3 w-1/3">Keterangan</th>
                      <th className="pb-3 text-right">Jumlah (IDR)</th>
                      <th className="pb-3 text-right">Petugas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = financialTransactions.filter(item => {
                        const descMatches = (item.description || '').toLowerCase().includes(financeSearch.toLowerCase()) ||
                                            (item.createdBy || '').toLowerCase().includes(financeSearch.toLowerCase());
                        const typeMatches = financeTypeFilter === 'all' || item.type === financeTypeFilter;
                        const sourceMatches = financeSourceFilter === 'all' || item.source === financeSourceFilter;
                        return descMatches && typeMatches && sourceMatches;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="text-slate-400 italic py-16 text-center text-xs">
                              Tidak ada transaksi yang cocok dengan filter kriteria Anda.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((item, index) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-1 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 font-mono font-semibold text-slate-650 text-slate-600">{item.date}</td>
                          <td className="py-3 font-bold">
                            <span className={`px-2 py-0.5 rounded-full text-[8.5px] uppercase font-black tracking-wider ${
                              item.type === 'incoming' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {item.type === 'incoming' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="py-3 font-extrabold text-slate-900">{item.category}</td>
                          <td className="py-3 font-semibold text-slate-700 leading-normal">
                            <div>{item.description}</div>
                            {item.type === 'outgoing' && (item.recipientName || item.studentName) && (
                              <div className="mt-1 inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold">
                                <User size={10} className="stroke-[2.5px] text-amber-700" />
                                <span>Penerima: {item.recipientName || item.studentName}</span>
                              </div>
                            )}
                          </td>
                          <td className={`py-3 text-right font-black text-[12px] font-mono ${
                            item.type === 'incoming' ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {item.type === 'incoming' ? '+' : '-'}{formatIDR(item.amount)}
                          </td>
                          <td className="py-3 text-right font-bold text-slate-450 text-slate-500 font-mono text-[10px]">{item.createdBy || 'Bendahara'}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. SARPRAS MONITORING AND PROCUREMENT APPROVALS */}
      {activeTab === 'sarpras_monitoring' && (
        <div className="flex flex-col gap-6 text-left">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-indigo-600" />
            <h2 className="text-slate-900 font-black text-lg">📦 Monitoring Sarana, Prasarana &amp; Procurement</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Kelola persetujuan pengadaan barang, pantau kelayakan aset sekolah, dan monitor peminjaman fasilitas sekolah oleh pendidik secara real-time.
            </p>
          </div>

          {/* KPI Mini-grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Menunggu Persetujuan Kepala</span>
              <h4 className="text-2xl font-black text-orange-600 mt-2 font-mono">
                {sarprasProposals.filter(p => p.status === 'pending').length} Proposal
              </h4>
              <p className="text-[11px] text-slate-455 mt-1 font-semibold">
                Estimasi biaya: Rp {sarprasProposals.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalPrice, 0).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Pengadaan Disetujui (Sinkron Kas)</span>
              <h4 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {sarprasProposals.filter(p => p.status === 'approved').length} Disetujui
              </h4>
              <p className="text-[11px] text-indigo-600 mt-1 font-bold font-mono">
                Dana terealisasi: Rp {sarprasProposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.totalPrice, 0).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Total Jenis Aset Terdaftar</span>
              <h4 className="text-2xl font-black text-emerald-700 mt-2 font-mono">
                {sarprasItems.length} Ragam Aset
              </h4>
              <p className="text-[11px] text-slate-455 mt-1 font-semibold">
                Kondisi Baik: {sarprasItems.filter(i => i.condition === 'Baik').length} Aset
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider font-sans">Total Nilai Sensus Aset</span>
              <h4 className="text-2xl font-black text-indigo-700 mt-2 font-mono">
                {formatIDR(totalAssetValue)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                Akumulasi: {sarprasItems.reduce((sum, i) => sum + (i.totalQty || 0), 0)} unit fisik
              </p>
            </div>
          </div>

          {/* Section 1: Purchase Proposals pending approval */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-6">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 pb-3 border-b border-slate-100">
              📥 Daftar Pengajuan Belanja Sarpras (Menunggu Tindak Lanjut)
            </h3>

            {loadingSarpras ? (
              <div className="py-8 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="animate-spin text-slate-800" size={18} />
                <span>Memuat data pengadaan terbaru...</span>
              </div>
            ) : sarprasProposals.filter(p => p.status === 'pending').length === 0 ? (
              <div className="py-8 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                <p className="text-xs font-bold">🎉 Bersih! Tidak ada proposal pembelian tertunda saat ini.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sarprasProposals.filter(p => p.status === 'pending').map((p) => (
                  <div key={p.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/20 hover:border-slate-300 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start gap-3">
                        {p.imageUrl && (
                          <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-white">
                            <img 
                              src={p.imageUrl} 
                              alt={p.itemName} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div>
                          <span className="px-2 py-0.5 rounded bg-slate-150 text-slate-700 font-mono text-[9px] font-bold">
                            KODE PROP: {p.id} &bull; Tanggal: {p.date}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 mt-1">{p.itemName}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-450 block font-semibold">ESTIMASI TOTAL BIAYA:</span>
                        <span className="font-black text-rose-600 font-mono text-base">Rp {p.totalPrice.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 text-xs text-slate-650">
                      <div>
                        <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Kuantitas Unit:</span>
                        <span className="font-bold text-slate-800">{p.qty} unit</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Estimasi Harga Satuan:</span>
                        <span className="font-bold text-slate-800 font-mono">Rp {p.estimatedPrice.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Diusulkan Oleh:</span>
                        <span className="font-bold text-slate-800">{p.proposedBy || 'Waka Sarpras'}</span>
                      </div>
                    </div>

                    <div className="mt-3 bg-white p-3 border border-slate-150 rounded-xl text-xs">
                      <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wider mb-1">Alasan Pengadaan &amp; Urgensi</span>
                      <p className="text-slate-700 font-medium italic">"{p.reason || '-'}"</p>
                    </div>

                    {/* Interactive Approval / Rejection tools */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                      <div className="w-full md:max-w-md">
                        <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Catatan Kepala Sekolah / Memo Disposisi</label>
                        <input 
                          type="text"
                          value={approvalNotes[p.id] || ''}
                          onChange={(e) => setApprovalNotes({ ...approvalNotes, [p.id]: e.target.value })}
                          placeholder="Misal: Disetujui ambil dana BOS, atau berikan argumen pemotongan kuantitas..."
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-indigo-650 text-xs text-slate-805"
                        />
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handleUpdateProposalStatus(p.id, 'rejected')}
                          className="flex-1 md:flex-initial px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-500 hover:text-white border border-rose-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                        >
                          ❌ Tolak
                        </button>
                        <button
                          onClick={() => handleUpdateProposalStatus(p.id, 'approved')}
                          className="flex-1 md:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                        >
                          ✅ Setujui &amp; Ambil Kas
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Approved History & Rejected notes log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-800 pb-3 border-b border-slate-100 mb-4">
              📝 Arsip Keputusan &amp; Transparansi Memo Sarpras
            </h3>

            {sarprasProposals.filter(p => p.status !== 'pending').length === 0 ? (
              <p className="text-slate-400 text-xs italic text-center py-4">Belum ada rekam jejak keputusan anggaran terbaru.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-2">Kebutuhan Barang</th>
                      <th className="pb-3 px-2 text-right">Total Anggaran</th>
                      <th className="pb-3 px-2">Tanggal</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2">Memo Kepala Sekolah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sarprasProposals.filter(p => p.status !== 'pending').map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            {p.imageUrl && (
                              <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden shrink-0 bg-white">
                                <img 
                                  src={p.imageUrl} 
                                  alt={p.itemName} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-800">{p.itemName}</div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Oleh: {p.proposedBy || 'Waka Sarpras'} ({p.qty} unit)</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-slate-755 text-[12.5px]">
                          Rp {p.totalPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-500 font-bold">{p.date}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                            p.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-250' 
                              : 'bg-rose-50 text-rose-800 border border-rose-250'
                          }`}>
                            {p.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </span>
                        </td>
                        <td className="py-3 px-2 italic text-slate-600 font-medium">
                          {p.notes || <span className="text-slate-300">Tanpa memo tambahan</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Physical items catalog sensus view */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-800 pb-3 border-b border-slate-100 mb-4 flex justify-between items-center">
              <span>📊 Real-time Monitoring Fisik &amp; Ketersediaan Unit Aset</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-750 p-1.5 rounded-md font-mono">STABILISASI TOTAL UNIT</span>
            </h3>

            {sarprasItems.length === 0 ? (
              <p className="text-slate-400 text-xs italic text-center py-4">Belum ada barang terdaftar dalam katalog inventaris sarpras.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider font-mono">
                      <th className="pb-3 px-2">Kode / Nama Barang</th>
                      <th className="pb-3 px-2">Kategori</th>
                      <th className="pb-3 px-2">Keadaan Fisik</th>
                      <th className="pb-3 px-2 text-right">Nilai Estimasi Unit</th>
                      <th className="pb-3 px-2 text-center">Kapasitas Stok</th>
                      <th className="pb-3 px-2 text-right">Lokasi Penyimpanan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sarprasItems.map((it) => (
                      <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all font-sans">
                        <td className="py-3 px-2">
                          <div className="font-extrabold text-slate-850">{it.name}</div>
                          <span className="text-[10px] text-slate-405 font-mono block mt-0.5">{it.code}</span>
                        </td>
                        <td className="py-3 px-2 font-bold text-slate-605">{it.category}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            it.condition === 'Baik'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                              : it.condition === 'Rusak Ringan'
                                ? 'bg-amber-50 text-amber-800 border border-amber-250'
                                : 'bg-rose-50 text-rose-800 border border-rose-250'
                          }`}>
                            {it.condition}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="font-mono font-extrabold text-slate-900">{formatIDR(it.price || 0)}</div>
                          <span className="text-[9.5px] text-slate-450 font-bold block font-mono">
                            Total: {formatIDR((it.price || 0) * (it.totalQty || 0))}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-mono font-extrabold text-slate-900">{it.availableQty}</span>
                          <span className="text-slate-400"> / {it.totalQty} unit</span>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-slate-500">
                          {it.location || 'Laboratorium / R. Utama'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Sarpras Loans Monitoring */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>🔑</span> Monitoring Peminjaman Sarpras Sekolah
                </h3>
                <p className="text-slate-500 text-[11px] font-semibold mt-0.5">Dafar guru/staf yang meminjam fasilitas atau alat sekolah secara aktif maupun yang sudah dikembalikan.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-1 rounded border border-amber-250 font-mono">
                  ACTIVE: {sarprasLoans.filter(l => l.status === 'dipinjam').length} unit pinjam
                </span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-250 font-mono">
                  DONE: {sarprasLoans.filter(l => l.status === 'kembali').length} selesai
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="relative md:col-span-8">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari peminjam atau nama barang..."
                  value={loanSearchQuery}
                  onChange={(e) => setLoanSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>
              <div className="md:col-span-4">
                <select
                  value={loanStatusFilter}
                  onChange={(e) => setLoanStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 cursor-pointer font-medium text-slate-700"
                >
                  <option value="Semua">Semua Status Peminjaman</option>
                  <option value="dipinjam">🚨 Aktif (Dipinjam)</option>
                  <option value="kembali">✅ Sudah Kembali</option>
                </select>
              </div>
            </div>

            {/* Loans Table */}
            {filteredLoans.length === 0 ? (
              <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                <p className="text-xs font-bold">Tidak ada data peminjam sarpras yang cocok.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider font-mono">
                      <th className="pb-3 px-2">Nama Peminjam</th>
                      <th className="pb-3 px-2">Barang Yang Dipinjam</th>
                      <th className="pb-3 px-2 text-center">Jumlah</th>
                      <th className="pb-3 px-2">Tanggal Pinjam</th>
                      <th className="pb-3 px-2">Tanggal Kembali</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">Urgensi / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all font-sans">
                        <td className="py-4 px-2">
                          <div className="font-extrabold text-slate-800">{l.borrowerName}</div>
                          <span className="text-[9.5px] text-indigo-600 font-bold block mt-0.5 font-mono">NIP/ID: {l.borrowerId}</span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="font-extrabold text-slate-800">📦 {l.itemName || "Barang"}</div>
                          <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5">ID: {l.itemId}</span>
                        </td>
                        <td className="py-4 px-2 text-center font-bold text-slate-900 font-mono">
                          {l.qty} unit
                        </td>
                        <td className="py-4 px-2 text-slate-500 font-bold font-mono">
                          {l.loanDate || '-'}
                        </td>
                        <td className="py-4 px-2 text-slate-500 font-bold font-mono">
                          {l.status === 'kembali' ? (l.returnDate || '-') : <span className="text-amber-600 font-bold italic border border-amber-200 bg-amber-50 rounded px-1.5 py-0.5">Sedang Dipakai</span>}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                            l.status === 'dipinjam'
                              ? 'bg-amber-50 text-amber-800 border border-amber-250 animate-pulse'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                          }`}>
                            {l.status === 'dipinjam' ? '⚠️ Dipinjam' : '✅ Selesai'}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right italic text-slate-600 font-medium">
                          {l.notes || <span className="text-slate-300">Tidak ada catatan</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SCHOOL PROFILE/IDENTITY CONFIG (Suits Principal role perfectly) */}
      {activeTab === 'school_profile' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500" />
            <h2 className="text-slate-900 font-black text-lg leading-tight">⚙️ Pengaturan Identitas Mandiri & Informasi Sekolah</h2>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Sesuaikan data kop surat lembaga, logo yayasan, penandatangan bendahara kas, atau nama kepala sekolah yang akan tercetak otomatis ditiap bon transaksi & kuitansi SPP.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left text-xs text-slate-700 flex flex-col gap-6">
            
            {/* Form row metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Sekolah Resmi</label>
                <input
                  type="text"
                  value={idName}
                  onChange={(e) => setIdName(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subheading / Yayasan</label>
                <input
                  type="text"
                  value={idSubheading}
                  onChange={(e) => setIdSubheading(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Akreditasi</label>
                <input
                  type="text"
                  value={idAccreditation}
                  onChange={(e) => setIdAccreditation(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nomor Telepon Sekolah (Kop)</label>
                <input
                  type="text"
                  value={idPhone}
                  onChange={(e) => setIdPhone(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Kepala Sekolah Penanggung Jawab</label>
                <input
                  type="text"
                  value={idPrincipal}
                  onChange={(e) => setIdPrincipal(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Bendahara / Kasir Kuitansi</label>
                <input
                  type="text"
                  value={idTreasurer}
                  onChange={(e) => setIdTreasurer(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alamat Lengkap Lembaga</label>
                <input
                  type="text"
                  value={idAddress}
                  onChange={(e) => setIdAddress(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-bold text-slate-850"
                />
              </div>

            </div>

            {/* Custom school brand asset logos */}
            <div className="border-t border-slate-100 pt-5 flex flex-col gap-5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Kop Lembaga & Logo Dokumen</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div className="flex flex-col gap-2">
                  <span className="font-extrabold text-[11px] text-slate-850">Banner KOP Surat URL</span>
                  <input
                    type="text"
                    value={idLetterhead}
                    onChange={(e) => setIdLetterhead(e.target.value)}
                    placeholder="Masukkan URL foto KOP resmi (kosongkan untuk KOP Teks default)..."
                    className="w-full bg-slate-55 bg-slate-55 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-800 focus:outline-none"
                  />
                  {idLetterhead && (
                    <img src={idLetterhead} className="max-h-12 w-full object-contain border border-slate-200 rounded-lg p-1 bg-slate-50 m-1 shrink-0" referrerPolicy="no-referrer" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-extrabold text-[11px] text-slate-850">Logo Lambang Lembaga URL</span>
                  <input
                    type="text"
                    value={idLogo}
                    onChange={(e) => setIdLogo(e.target.value)}
                    placeholder="Masukkan URL logo bundar lembaga (bisa base64)..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-800"
                  />
                  {idLogo && (
                    <img src={idLogo} className="h-10 w-10 object-contain border border-slate-200 rounded-lg p-1 bg-white m-1 shrink-0" referrerPolicy="no-referrer" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-extrabold text-[11px] text-slate-850">Favicon Portal URL</span>
                  <input
                    type="text"
                    value={idFavicon}
                    onChange={(e) => setIdFavicon(e.target.value)}
                    placeholder="Masukkan URL / base64 ikon (.png / .ico) tab browser..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-800"
                  />
                  {idFavicon && (
                    <img src={idFavicon} className="h-8 w-8 object-contain border border-slate-200 rounded-lg p-1 bg-white m-1 shrink-0" referrerPolicy="no-referrer" />
                  )}
                </div>
              </div>
            </div>

            {/* Submit changes button */}
            <div className="border-t border-slate-150 pt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSchoolIdentity}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl cursor-pointer text-xs uppercase tracking-wider shadow-md shadow-indigo-100"
              >
                Simpan Perubahan Identitas Sekolah
              </button>
            </div>

          </div>

          {/* Ganti Password Kepala Sekolah Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left text-xs text-slate-700 flex flex-col gap-5 mt-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                🔒 Pengaturan Sandi Keamanan Akun Kepala Sekolah
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Ubah kata sandi aktif untuk membatasi akses login portal komando. Kami menyarankan kombinasi minimal 5 karakter unik.
              </p>
            </div>

            {pwdMsg && (
              <div className={`p-4 border font-bold text-xs rounded-xl ${
                pwdMsg.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
              }`}>
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kata Sandi Lama</label>
                <input
                  type="password"
                  placeholder="Masukkan sandi saat ini"
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-semibold focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kata Sandi Baru</label>
                <input
                  type="password"
                  placeholder="Minimal 5 Karakter"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-semibold focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  placeholder="Ulangi sandi baru"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl p-3 font-semibold focus:outline-none"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl cursor-pointer text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Menyimpan...' : 'Perbarui Sandi Kepala Sekolah 🔑'}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB BUKU TAMU & PEMBINAAN DIGITAL KEPALA SEKOLAH         */}
      {/* Disimpan langsung di Database MySQL tanpa simpan lokal  */}
      {/* 2 Jenis: 1 Buku Tamu Umum, 2 Buku Tamu Pembinaan         */}
      {/* ======================================================== */}
      {activeTab === 'buku_tamu' && (
        <div className="flex flex-col gap-6 animate-fade-in text-left">
          
          {/* Header Card & Quick Actions */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-indigo-500 to-transparent hidden md:block" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-gradient-to-br from-amber-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                  <BookOpen size={28} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-wider uppercase mb-1 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Database MySQL Langsung (Tanpa Simpan Lokal)
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    Buku Tamu Digital &amp; Pembinaan Sekolah
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Arsip digital resmi penerimaan tamu: <strong>1. Buku Tamu Umum</strong> (wali murid, vendor, mitra) dan <strong>2. Buku Tamu Pembinaan</strong> (Pengawas Pembina, Tim Monev, Asesor &amp; Dinas Pendidikan).
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <QrCode size={16} />
                  <span>QR Meja Tamu</span>
                </button>

                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => handlePrintGuestBookReport(guestBookCategoryTab)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Printer size={16} />
                    <span>Cetak PDF Laporan</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddGuestBook(guestBookCategoryTab === 'pembinaan' ? 'pembinaan' : 'umum')}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus size={16} />
                  <span>Catat Tamu Manual</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGuestBookXLS}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 cursor-pointer"
                  title="Unduh Data Excel (.xls)"
                >
                  <Download size={16} />
                </button>

                <button
                  type="button"
                  onClick={fetchGuestBooks}
                  disabled={loadingGuestBooks}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 cursor-pointer disabled:opacity-50"
                  title="Segarkan dari Database MySQL"
                >
                  <RefreshCw size={16} className={loadingGuestBooks ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* 2 JENIS BUKU TAMU SELECTOR TABS */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setGuestBookCategoryTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                  guestBookCategoryTab === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Semua Kategori</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${guestBookCategoryTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {guestBooks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGuestBookCategoryTab('umum')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                  guestBookCategoryTab === 'umum'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                <BookOpen size={14} />
                <span>1. Buku Tamu Umum</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${guestBookCategoryTab === 'umum' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                  {guestBooks.filter(g => (g.category || 'umum') === 'umum').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGuestBookCategoryTab('pembinaan')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                  guestBookCategoryTab === 'pembinaan'
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/25'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <Award size={14} />
                <span>2. Buku Tamu Pembinaan</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${guestBookCategoryTab === 'pembinaan' ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-900'}`}>
                  {guestBooks.filter(g => g.category === 'pembinaan').length}
                </span>
              </button>
            </div>

            {/* Quick Print buttons for the active view */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {guestBookCategoryTab === 'pembinaan' ? (
                <button
                  type="button"
                  onClick={() => handlePrintGuestBookReport('pembinaan')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Cetak Buku Pembinaan (Format Resmi)</span>
                </button>
              ) : guestBookCategoryTab === 'umum' ? (
                <button
                  type="button"
                  onClick={() => handlePrintGuestBookReport('umum')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Cetak Buku Tamu Umum (PDF)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span>Cetak:</span>
                  <button
                    type="button"
                    onClick={() => handlePrintGuestBookReport('umum')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 cursor-pointer"
                  >
                    Buku Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintGuestBookReport('pembinaan')}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg text-[10.5px] font-bold text-amber-900 cursor-pointer"
                  >
                    Buku Pembinaan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Kunjungan</span>
                <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Users size={16} />
                </span>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {guestBooks.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">tamu</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                {guestBooks.filter(g => (g.category || 'umum') === 'umum').length} Umum • {guestBooks.filter(g => g.category === 'pembinaan').length} Pembinaan
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Kunjungan Hari Ini</span>
                <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Calendar size={16} />
                </span>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-black text-emerald-700 tracking-tight">
                  {guestBooks.filter(g => g.date === new Date().toISOString().split('T')[0]).length}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium ml-1">tamu hari ini</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                {new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Buku Tamu Pembinaan</span>
                <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Award size={16} />
                </span>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-black text-amber-600 tracking-tight">
                  {guestBooks.filter(g => g.category === 'pembinaan').length}
                </span>
                <span className="text-[11px] text-amber-700 font-medium ml-1">kunjungan</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                {guestBooks.filter(g => g.category === 'pembinaan' && g.followUpStatus === 'Selesai').length} Selesai Ditindaklanjuti
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Instansi Mitra</span>
                <span className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <Building2 size={16} />
                </span>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {new Set(guestBooks.map(g => (g.institution || '').trim().toLowerCase()).filter(Boolean)).size}
                </span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">lembaga</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                Mitra, dinas, komite &amp; rekanan
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={guestBookSearch}
                onChange={(e) => setGuestBookSearch(e.target.value)}
                placeholder="Cari nama, instansi, keperluan, jabatan, NIP, aspek..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800 transition-colors"
              />
              {guestBookSearch && (
                <button
                  type="button"
                  onClick={() => setGuestBookSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Date Filter Select */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Calendar size={13} className="text-slate-500" />
                <select
                  value={guestBookDateFilter}
                  onChange={(e: any) => setGuestBookDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="this_week">7 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="custom">Rentang Kustom</option>
                </select>
              </div>

              {guestBookDateFilter === 'custom' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={guestBookStartDate}
                    onChange={(e) => setGuestBookStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-bold">-</span>
                  <input
                    type="date"
                    value={guestBookEndDate}
                    onChange={(e) => setGuestBookEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Filter size={13} className="text-slate-500" />
                <select
                  value={guestBookStatusFilter}
                  onChange={(e) => setGuestBookStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Diterima">Diterima</option>
                  <option value="Menunggu">Menunggu</option>
                </select>
              </div>
            </div>
          </div>

          {/* MAIN DATA TABLE VIEW */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  {guestBookCategoryTab === 'pembinaan' ? 'Daftar Buku Tamu Pembinaan / Supervisi' : guestBookCategoryTab === 'umum' ? 'Daftar Buku Tamu Umum' : 'Seluruh Daftar Kunjungan Buku Tamu'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
                  {filteredGuestBooks.length} data
                </span>
              </div>

              {loadingGuestBooks && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <div className="h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  <span>Memuat dari MySQL...</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[10.5px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    {guestBookCategoryTab === 'all' && (
                      <th className="py-3.5 px-3 w-28">Kategori</th>
                    )}
                    <th className="py-3.5 px-3 w-36">Waktu Kunjungan</th>
                    <th className="py-3.5 px-4">
                      {guestBookCategoryTab === 'pembinaan' ? 'Nama Pembina / Pengawas' : 'Nama Tamu'}
                    </th>
                    <th className="py-3.5 px-4">Jabatan &amp; Instansi</th>
                    <th className="py-3.5 px-4">
                      {guestBookCategoryTab === 'pembinaan' ? 'Aspek Pembinaan & Temuan' : 'Keperluan Kunjungan'}
                    </th>
                    <th className="py-3.5 px-3 w-32">WhatsApp</th>
                    <th className="py-3.5 px-3 w-28 text-center">
                      {guestBookCategoryTab === 'pembinaan' ? 'Tindak Lanjut' : 'Status'}
                    </th>
                    <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {filteredGuestBooks.length === 0 ? (
                    <tr>
                      <td colSpan={guestBookCategoryTab === 'all' ? 9 : 8} className="py-12 text-center text-slate-400">
                        <BookOpen size={36} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <p className="font-bold text-slate-600">Belum ada catatan buku tamu.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tamu dapat scan QR Code di meja resepsionis atau Anda dapat mencatat manual melalui tombol di atas.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredGuestBooks.map((item, idx) => {
                      const isPembinaan = item.category === 'pembinaan';
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/70 transition-colors ${isPembinaan ? 'bg-amber-50/20' : ''}`}
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-bold text-[11px]">
                            {idx + 1}
                          </td>

                          {guestBookCategoryTab === 'all' && (
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPembinaan
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {isPembinaan ? <Award size={11} /> : <BookOpen size={11} />}
                                <span>{isPembinaan ? 'Pembinaan' : 'Umum'}</span>
                              </span>
                            </td>
                          )}

                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{item.date}</span>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              <span>{item.time || '-'} WIB</span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-black text-slate-900 text-xs">
                              {item.name}
                            </div>
                            {item.supervisorNip && (
                              <span className="text-[10.5px] font-mono text-slate-500 block">
                                NIP: {item.supervisorNip}
                              </span>
                            )}
                            {item.notes && (
                              <span className="text-[10px] text-slate-400 italic block mt-0.5 truncate max-w-xs">
                                Ket: {item.notes}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {item.position && (
                              <span className="text-[11px] font-semibold text-slate-600 block">
                                {item.position}
                              </span>
                            )}
                            <span className="font-bold text-indigo-700 text-xs">
                              {item.institution}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            {isPembinaan ? (
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  {item.coachingSubject || item.purpose}
                                </span>
                                {item.findings && (
                                  <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                                    <strong className="text-slate-900">Temuan:</strong> {item.findings}
                                  </p>
                                )}
                                {item.recommendations && (
                                  <p className="text-[11px] text-emerald-800 line-clamp-2 leading-relaxed bg-emerald-50/60 p-1 rounded-md">
                                    <strong className="text-emerald-950">Saran:</strong> {item.recommendations}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                                {item.purpose}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {item.phone ? (
                              <a
                                href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-mono text-[11px] font-bold transition-colors"
                                title="Kirim Pesan WhatsApp"
                              >
                                <Phone size={11} className="text-emerald-600" />
                                <span>{item.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {isPembinaan ? (
                              <button
                                type="button"
                                onClick={() => setSelectedGuestBookForDetail(item)}
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all border ${
                                  item.followUpStatus === 'Selesai'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : item.followUpStatus === 'Proses'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                }`}
                                title="Klik untuk update tindak lanjut"
                              >
                                {item.followUpStatus || 'Belum'}
                              </button>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700">
                                {item.status || 'Selesai'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isPembinaan && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedGuestBookForDetail(item)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  title="Lihat Detail & Tindak Lanjut"
                                >
                                  <FileText size={13} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditGuestBook(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                                title="Edit Data Kunjungan"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Hapus kunjungan tamu "${item.name}" dari database MySQL secara permanen?`)) {
                                    try {
                                      const res = await fetch(`/api/guest-book/${item.id}`, { method: 'DELETE' });
                                      if (res.ok) {
                                        await fetchGuestBooks();
                                        setNotifMsg({ type: 'success', text: 'Data buku tamu berhasil dihapus dari database MySQL!' });
                                      } else {
                                        alert('Gagal menghapus data dari database MySQL.');
                                      }
                                    } catch (err: any) {
                                      alert(err.message || 'Gagal menghapus data.');
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Hapus Data Tamu"
                              >
                                <Trash2 size={13} />
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

      {/* ======================================================== */}
      {/* MODAL 1: QR CODE MEJA RESEPSIONIS & PRINT STAND AKRILIK  */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                      QR Code Meja Resepsionis
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Tamu scan QR ini di meja piket untuk mengisi buku tamu
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* QR Code Target Selector */}
              <div className="mb-4">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Pilihan Formulir Tujuan QR Code:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQrTypeSelection('all')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      qrTypeSelection === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua (Pilihan)
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrTypeSelection('umum')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      qrTypeSelection === 'umum'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1. Buku Umum
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrTypeSelection('pembinaan')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      qrTypeSelection === 'pembinaan'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2. Pembinaan
                  </button>
                </div>
              </div>

              {/* QR Image Container */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Buku Tamu"
                    className="w-56 h-56 rounded-2xl bg-white p-2 shadow-sm border border-slate-200"
                  />
                ) : (
                  <div className="w-56 h-56 rounded-2xl bg-white flex items-center justify-center text-slate-400">
                    <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <span className="font-mono text-[11px] text-slate-500 mt-2 break-all max-w-xs">
                  {`${window.location.origin}/?page=bukutamu${qrTypeSelection === 'all' ? '' : `&type=${qrTypeSelection}`}`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/?page=bukutamu${qrTypeSelection === 'all' ? '' : `&type=${qrTypeSelection}`}`;
                    navigator.clipboard.writeText(link);
                    setIsCopiedQrLink(true);
                    setTimeout(() => setIsCopiedQrLink(false), 2000);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>{isCopiedQrLink ? 'Link Tersalin! ✓' : 'Salin Link Formulir'}</span>
                </button>

                <a
                  href={`/?page=bukutamu${qrTypeSelection === 'all' ? '' : `&type=${qrTypeSelection}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Buka Form di Tab Baru</span>
                </a>
              </div>

              <div className="mt-3 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-150 text-[11px] text-indigo-900 leading-relaxed">
                <span className="font-extrabold block text-indigo-950 mb-0.5">💡 Tanpa Perlu Login &amp; Kompatibel Semua Scanner:</span>
                Tamu dapat memindai QR ini memakai <strong>Kamera Bawaan HP</strong>, <strong>Google Lens</strong>, atau <strong>Aplikasi QR Scanner apa saja</strong> yang diunduh dari Google Play Store / Apple App Store. Form langsung terbuka di browser, tamu isi data lalu tekan Simpan.
              </div>

              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => handlePrintQrStandBanner(qrTypeSelection)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Cetak Stand Meja / Akrilik (Format A4)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: DETAIL & UPDATE TINDAK LANJUT BUKU PEMBINAAN    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedGuestBookForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-left relative overflow-hidden space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <Award size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                      Detail Kunjungan Pembinaan &amp; Supervisi
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedGuestBookForDetail.date} • {selectedGuestBookForDetail.time || '-'} WIB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedGuestBookForDetail(null)}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Pembina Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Nama Pembina</span>
                  <span className="col-span-2 font-bold text-slate-900">{selectedGuestBookForDetail.name}</span>
                </div>
                {selectedGuestBookForDetail.supervisorNip && (
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-1.5">
                    <span className="text-slate-400 font-semibold">NIP / NUPTK</span>
                    <span className="col-span-2 font-mono font-bold text-slate-800">{selectedGuestBookForDetail.supervisorNip}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-1.5">
                  <span className="text-slate-400 font-semibold">Jabatan &amp; Instansi</span>
                  <span className="col-span-2 font-semibold text-slate-800">
                    {selectedGuestBookForDetail.position || '-'} • <strong className="text-indigo-700">{selectedGuestBookForDetail.institution}</strong>
                  </span>
                </div>
                {selectedGuestBookForDetail.phone && (
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-1.5">
                    <span className="text-slate-400 font-semibold">WhatsApp</span>
                    <span className="col-span-2 font-mono font-bold text-emerald-700">{selectedGuestBookForDetail.phone}</span>
                  </div>
                )}
              </div>

              {/* Aspek Pembinaan */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-1">
                  Aspek / Sasaran Pembinaan:
                </label>
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-black text-amber-900">
                  {selectedGuestBookForDetail.coachingSubject || selectedGuestBookForDetail.purpose}
                </div>
              </div>

              {/* Temuan */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Temuan &amp; Hasil Pemantauan:
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-medium">
                  {selectedGuestBookForDetail.findings || selectedGuestBookForDetail.notes || 'Tidak ada catatan temuan tertulis.'}
                </div>
              </div>

              {/* Rekomendasi */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">
                  Saran &amp; Rekomendasi Tindak Lanjut Pengawas:
                </label>
                <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl text-xs text-emerald-950 leading-relaxed font-semibold">
                  {selectedGuestBookForDetail.recommendations || 'Tidak ada rekomendasi tertulis.'}
                </div>
              </div>

              {/* Quick Update Follow-up Section */}
              <div className="border-t border-slate-100 pt-3">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-2">
                  Tindak Lanjut &amp; Realisasi Kepala Sekolah:
                </label>

                <div className="flex items-center gap-2 mb-2">
                  {(['Belum', 'Proses', 'Selesai'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedGuestBookForDetail(prev => prev ? { ...prev, followUpStatus: st } : null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        selectedGuestBookForDetail.followUpStatus === st
                          ? st === 'Selesai'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'Proses'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'Selesai' ? '✓ Selesai Ditindaklanjuti' : st === 'Proses' ? '⏳ Dalam Proses' : '✕ Belum Ditindaklanjuti'}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={selectedGuestBookForDetail.followUpNotes || ''}
                  onChange={(e) => setSelectedGuestBookForDetail(prev => prev ? { ...prev, followUpNotes: e.target.value } : null)}
                  placeholder="Tuliskan catatan realisasi langkah tindak lanjut yang telah diambil sekolah..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800"
                />

                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGuestBookForDetail(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedGuestBookForDetail) return;
                      try {
                        const res = await fetch(`/api/guest-book/${selectedGuestBookForDetail.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(selectedGuestBookForDetail)
                        });
                        if (res.ok) {
                          await fetchGuestBooks();
                          setSelectedGuestBookForDetail(null);
                          setNotifMsg({ type: 'success', text: 'Tindak lanjut pembinaan berhasil diperbarui di MySQL!' });
                        } else {
                          alert('Gagal memperbarui status tindak lanjut.');
                        }
                      } catch (err: any) {
                        alert(err.message || 'Gagal menyimpan perubahan.');
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                  >
                    Simpan Tindak Lanjut
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: TAMBAH / EDIT KUNJUNGAN BUKU TAMU MANUAL        */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isGuestBookModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-left relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${guestBookFormCategory === 'pembinaan' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                    {guestBookFormCategory === 'pembinaan' ? <Award size={20} /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                      {editingGuestBook ? 'Perbarui Data Tamu' : 'Catat Kunjungan Tamu Baru'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Simpan langsung ke database MySQL resmi sekolah
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGuestBookModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* 2 JENIS BUKU TAMU SELECTOR */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setGuestBookFormCategory('umum')}
                  className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    guestBookFormCategory === 'umum'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen size={13} />
                  <span>1. Buku Tamu Umum</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGuestBookFormCategory('pembinaan')}
                  className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    guestBookFormCategory === 'pembinaan'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award size={13} />
                  <span>2. Buku Tamu Pembinaan</span>
                </button>
              </div>

              <form onSubmit={handleSaveGuestBook} className="space-y-3.5">
                {/* Tanggal & Waktu */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Tanggal Kunjungan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={guestBookFormDate}
                      onChange={(e) => setGuestBookFormDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Waktu / Jam (WIB) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestBookFormTime}
                      onChange={(e) => setGuestBookFormTime(e.target.value)}
                      placeholder="09:30"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Nama Lengkap & NIP */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={guestBookFormCategory === 'pembinaan' ? 'sm:col-span-2' : 'sm:col-span-3'}>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {guestBookFormCategory === 'pembinaan' ? 'Nama Pembina / Pengawas' : 'Nama Lengkap Tamu'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestBookFormName}
                      onChange={(e) => setGuestBookFormName(e.target.value)}
                      placeholder={guestBookFormCategory === 'pembinaan' ? 'Contoh: Drs. H. Bambang Sutrisno, M.Pd' : 'Contoh: Drs. H. Ahmad Fauzi'}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  {guestBookFormCategory === 'pembinaan' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                        NIP / NUPTK
                      </label>
                      <input
                        type="text"
                        value={guestBookFormSupervisorNip}
                        onChange={(e) => setGuestBookFormSupervisorNip(e.target.value)}
                        placeholder="197508..."
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Jabatan & Asal Instansi */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Jabatan / Profesi
                    </label>
                    <input
                      type="text"
                      value={guestBookFormPosition}
                      onChange={(e) => setGuestBookFormPosition(e.target.value)}
                      placeholder={guestBookFormCategory === 'pembinaan' ? 'Pengawas Pembina' : 'Wali Murid / Mitra'}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {guestBookFormCategory === 'pembinaan' ? 'Lembaga / Instansi Pembina' : 'Asal Instansi'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestBookFormInstitution}
                      onChange={(e) => setGuestBookFormInstitution(e.target.value)}
                      placeholder={guestBookFormCategory === 'pembinaan' ? 'Dinas Pendidikan Kab. Pasuruan' : 'Umum / Perusahaan'}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* No. HP / WhatsApp */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={guestBookFormPhone}
                    onChange={(e) => setGuestBookFormPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none font-mono"
                  />
                </div>

                {/* KHUSUS BUKU PEMBINAAN */}
                {guestBookFormCategory === 'pembinaan' ? (
                  <div className="space-y-3 pt-1 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-1">
                        Aspek / Materi Pembinaan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={guestBookFormCoachingSubject}
                        onChange={(e) => setGuestBookFormCoachingSubject(e.target.value)}
                        placeholder="Contoh: Supervisi Akademik & Perangkat Ajar Kurikulum Merdeka"
                        required
                        className="w-full bg-amber-50/50 border border-amber-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1">
                        Temuan &amp; Hasil Pemantauan Pembinaan
                      </label>
                      <textarea
                        rows={2}
                        value={guestBookFormFindings}
                        onChange={(e) => setGuestBookFormFindings(e.target.value)}
                        placeholder="Catatan temuan di lapangan..."
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">
                        Saran &amp; Rekomendasi Tindak Lanjut
                      </label>
                      <textarea
                        rows={2}
                        value={guestBookFormRecommendations}
                        onChange={(e) => setGuestBookFormRecommendations(e.target.value)}
                        placeholder="Arahan tindak lanjut untuk sekolah..."
                        className="w-full bg-emerald-50/40 border border-emerald-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Status Tindak Lanjut
                        </label>
                        <select
                          value={guestBookFormFollowUpStatus}
                          onChange={(e) => setGuestBookFormFollowUpStatus(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="Belum">Belum Ditindaklanjuti</option>
                          <option value="Proses">Dalam Proses</option>
                          <option value="Selesai">Selesai Ditindaklanjuti</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Realisasi Tindak Lanjut
                        </label>
                        <input
                          type="text"
                          value={guestBookFormFollowUpNotes}
                          onChange={(e) => setGuestBookFormFollowUpNotes(e.target.value)}
                          placeholder="Catatan realisasi langkah..."
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* BUKU TAMU UMUM */
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Keperluan Kunjungan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={guestBookFormPurpose}
                      onChange={(e) => setGuestBookFormPurpose(e.target.value)}
                      placeholder="Tujuan kunjungan atau pihak yang ditemui..."
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>
                )}

                {/* Catatan Tambahan */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={guestBookFormNotes}
                    onChange={(e) => setGuestBookFormNotes(e.target.value)}
                    placeholder="Keterangan tambahan jika ada..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGuestBookModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingGuestBook}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    {isSavingGuestBook ? (
                      <>
                        <div className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16">
        {/* Menu 1 (Home - paling kiri) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <Home size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'dashboard' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Home</span>
        </button>

        {/* Menu 2 (Program Kerja) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('work_programs');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'work_programs' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <ClipboardCheck size={20} className={activeTab === 'work_programs' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'work_programs' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Program</span>
        </button>

        {/* Menu 3 (Kinerja Guru PKG) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('evaluations');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'evaluations' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <Award size={20} className={activeTab === 'evaluations' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'evaluations' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Kinerja</span>
        </button>

        {/* Menu 4 (Monitoring BK) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('bk_monitoring');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'bk_monitoring' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <ShieldAlert size={20} className={activeTab === 'bk_monitoring' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'bk_monitoring' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Disiplin</span>
        </button>

        {/* Menu 5 (Lainnya - 4 kotak, paling kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${(['journals', 'finance_monitoring', 'school_profile'].includes(activeTab) || showMoreMenu) ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={(['journals', 'finance_monitoring', 'school_profile'].includes(activeTab) || showMoreMenu) ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${(['journals', 'finance_monitoring', 'school_profile'].includes(activeTab) || showMoreMenu) ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
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
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Lainnya</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Kepala Sekolah</h4>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('jadwal');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'jadwal'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-600 text-lg">🗓️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Matriks Jadwal</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Lihat matriks jadwal pelajaran seluruh kelas &amp; guru</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('journals');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'journals'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-600 text-lg">📚</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Jurnal KBM Guru</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Pantau seluruh catatan KBM &amp; ketidakhadiran</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('attendance_recap');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'attendance_recap'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-600 text-lg">📅</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Rekap Presensi Siswa</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Rekapitulasi tingkat kehadiran harian per kelas &amp; siswa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('finance_monitoring');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'finance_monitoring'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-600 text-lg">💰</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Monitoring Keuangan</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Pantau SPP, Tabungan, &amp; buku kas bendahara</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('sarpras_monitoring');
                    setShowMoreMenu(false);
                    fetchSarprasData();
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'sarpras_monitoring'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">📦</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Monitoring Sarpras</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Pengajuan belanja, stok barang &amp; peminjaman</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('school_profile');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'school_profile'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">⚙️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Identitas Sekolah</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Perbarui identitas kop surat &amp; nama lembaga</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('buku_tamu');
                    setShowMoreMenu(false);
                    fetchGuestBooks();
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeTab === 'buku_tamu'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-600 text-lg">📖</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Buku Tamu Digital</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">1. Tamu Umum &amp; 2. Pembinaan Pengawas (MySQL Langsung)</p>
                  </div>
                </button>
              </div>

              {/* Quick access to download Mobile Apps in the bottom sheet menu */}
              <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  📲 Unduh Aplikasi Mobile Resmi
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Gunakan aplikasi mobile resmi untuk kemudahan akses monitor seluruh kegiatan pengajaran &amp; pelaporan keuangan langsung lewat HP.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a
                    href={schoolIdentity?.apkUrl || "#"}
                    target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.apkUrl) {
                        e.preventDefault();
                        alert("Link unduhan Android belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.apkUrl 
                        ? "bg-emerald-50 hover:bg-emerald-105 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Smartphone size={13} className={schoolIdentity?.apkUrl ? "text-emerald-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">Android APK</span>
                  </a>

                  <a
                    href={schoolIdentity?.iosUrl || "#"}
                    target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.iosUrl) {
                        e.preventDefault();
                        alert("Link unduhan iOS belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.iosUrl 
                        ? "bg-sky-50 hover:bg-sky-105 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Apple size={13} className={schoolIdentity?.iosUrl ? "text-sky-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">iOS Apple</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
