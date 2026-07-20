import React, { useState, useEffect, useMemo } from 'react';
import { Student, SubjectTeacher, TeachingJournal, SchoolIdentity, SubjectAttendanceEntry, RealtimeNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Check, AlertCircle, Save, Loader2, Users, ClipboardCheck, 
  Sparkles, LogOut, ArrowRight, BookOpen, AlertCircle as ErrorIcon,
  Search, ShieldCheck, HelpCircle, History, CheckCircle2, ChevronRight, FileText, X, Printer,
  User, Bell, LayoutGrid, Home, Smartphone, Apple, Download, Edit, Trash2
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
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history' | 'notifications' | 'profile' | 'penilaian' | 'pkg'>('create');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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

  // Edit journal states for Subject Teacher panel
  const [editingJournal, setEditingJournal] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTopic, setEditTopic] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editFase, setEditFase] = useState<string>('D');
  const [editSemester, setEditSemester] = useState<string>('Genap');
  const [editAlokasiWaktu, setEditAlokasiWaktu] = useState<string>('2 JP');
  const [editJamKe, setEditJamKe] = useState<string>('');
  const [editPertemuanKe, setEditPertemuanKe] = useState<string>('');
  const [editTujuanPembelajaran, setEditTujuanPembelajaran] = useState<string>('');
  const [editPencapaianKktp, setEditPencapaianKktp] = useState<string>('Tercapai');
  const [editDailyStatusMap, setEditDailyStatusMap] = useState<Record<string, { status: string; notes: string }>>({});
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  
  // Realtime notification lists for Teacher panel view
  const [systemNotifications, setSystemNotifications] = useState<RealtimeNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);
  const [notifSearch, setNotifSearch] = useState<string>('');

  // Principal Work Programs state
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [loadingWorkPrograms, setLoadingWorkPrograms] = useState<boolean>(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState<boolean>(false);

  const fetchEvaluations = async () => {
    setLoadingEvaluations(true);
    try {
      const res = await fetch('/api/principal/teacher-evaluations');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((e: any) => e.teacherId === currentTeacher.id);
        setEvaluations(filtered);
      }
    } catch (err) {
      console.error("Gagal menjaring evaluasi guru:", err);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const handlePrintPkg = (ev: any) => {
    const pWin = window.open("", "_blank");
    if (!pWin) return;
    
    const avgScore = Math.round((Number(ev.pedagogicScore) + Number(ev.professionalScore) + Number(ev.personalScore) + Number(ev.socialScore)) / 4);

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
            ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}<br/>
            <span style="font-size:10px; font-weight:normal;">Address: ${schoolIdentity?.address || ""} | Phone: ${schoolIdentity?.phone || ""}</span>
          </div>
          
          <h3 style="text-align:center; text-transform:uppercase; text-decoration:underline;">LEMBAR HASIL PENILAIAN KINERJA GURU (PKG)</h3>
          <p style="text-align:center; font-weight:bold; font-size:10px; margin-top:-10px;">TAHUN AJARAN / AKADEMIK: ${ev.academicYear}</p>
          
          <table class="meta-grid">
            <tr><td style="width:20%; font-weight:bold;">Nama Pendidik</td><td>: <strong>${ev.teacherName}</strong></td></tr>
            <tr><td style="font-weight:bold;">Tugas Jabatan</td><td>: ${ev.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}</td></tr>
            <tr><td style="font-weight:bold;">Penilai / Jabatan</td><td>: ${schoolIdentity?.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"} / Kepala Sekolah</td></tr>
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
              <td>Mengetahui,<br/>Kepala Sekolah<div style="height:70px"></div><strong><u>${schoolIdentity?.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"}</u></strong><br/>NIP. Demonstration Creds</td>
            </tr>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    pWin.document.close();
  };

  const fetchPrincipalWorkPrograms = async () => {
    setLoadingWorkPrograms(true);
    try {
      const res = await fetch('/api/principal/work-programs');
      if (res.ok) {
        const data = await res.json();
        setWorkPrograms(data);
      }
    } catch (err) {
      console.error("Gagal menjaring program kerja kepala sekolah:", err);
    } finally {
      setLoadingWorkPrograms(false);
    }
  };
  
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

  // --- Kurikulum Merdeka State Settings ---
  const [merdekaAssessments, setMerdekaAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState<boolean>(false);
  const [selectedGradeClass, setSelectedGradeClass] = useState<string>('');
  const [selectedSemesterGrading, setSelectedSemesterGrading] = useState<string>('Genap');
  const [selectedYearGrading, setSelectedYearGrading] = useState<string>(schoolIdentity?.activeAcademicYear || '2025/2026');

  useEffect(() => {
    if (schoolIdentity?.activeAcademicYear) {
      setSelectedYearGrading(schoolIdentity.activeAcademicYear);
    }
  }, [schoolIdentity?.activeAcademicYear]);
  
  // High quality default TPs based on popular subjects
  const defaultTpsMap: Record<string, string[]> = {
    'Matematika': [
      'Memahami konsep & penyelesaian masalah relasi harian',
      'Menerapkan analisis logis persamaan nilai kompetensi',
      'Menyajikan representasi grafis hasil observasi',
      'Mengevaluasi hasil pemecahan masalah matematis kontekstual'
    ],
    'Bahasa Inggris': [
      'Identify main ideas in descriptive and narrative English texts',
      'Compose short conversations about expressing opinion and advice',
      'Use proper greeting, warning, and simple structures',
      'Construct simple reflective essays on daily topics'
    ],
    'Ilmu Pengetahuan Alam': [
      'Menjelaskan klasifikasi makhluk hidup dan ekosistem lokal',
      'Menganalisis konsep suhu, kalor, pemuaian, dan wujud benda',
      'Melakukan penyelidikan ilmiah tentang sifat zat kompleks',
      'Menyusun laporan hasil eksperimen sains secara sistematis'
    ],
    'Ilmu Pengetahuan Sosial': [
      'Menilai kontribusi interaksi sosial terhadap ruang geografis',
      'Mengidentifikasi kegiatan ekonomi masyarakat dan kebutuhan',
      'Menceritakan sejarah pembentukan budaya di wilayah Nusantara',
      'Menganalisis dampak perubahan sosial terhadap kearifan lokal'
    ],
    'Bahasa Indonesia': [
      'Menulis teks deskripsi deskriptif dari objek observasi',
      'Menelaah unsur buku fiksi dan non-fiksi secara obyektif',
      'Menyajikan teks prosedur dengan susunan kalimat efektif',
      'Menyusun naskah ulasan sastra dengan argumentasi kritis'
    ],
    'Pendidikan Agama Islam': [
      'Membaca dan melafalkan ayat Al-Quran mengenai adab',
      'Mendemonstrasikan rukun shalat fardhu dan khusyuk berniat',
      'Mengimplementasikan akhlakul karimah kepada guru dan teman',
      'Memahami nilai-nilai sejarah perjuangan dakwah Islamiah'
    ],
    'Pendidikan Jasmani & OR': [
      'Melakukan teknik dasar olahraga bersahabat koordinatif',
      'Menjaga kebugaran jasmani melalui senam ketangkasan terlatih',
      'Mengetahui pola makan seimbang pencegah penyakit menular',
      'Menerapkan pola hidup sehat dan kebiasaan berolahraga teratur'
    ]
  };

  const currentSubjectDefaultTps = useMemo(() => {
    return defaultTpsMap[currentTeacher.subject] || [
      'Mengidentifikasi elemen kompetensi dasar materi pembelajaran',
      'Menyelesaikan tugas analisis praktis secara mandiri berfikir',
      'Menyajikan hasil evaluasi materi dalam bentuk simpulan logis',
      'Merefleksikan hasil pencapaian belajar demi perbaikan berkelanjutan'
    ];
  }, [currentTeacher.subject]);

  const [tp1InputName, setTp1InputName] = useState<string>('');
  const [tp2InputName, setTp2InputName] = useState<string>('');
  const [tp3InputName, setTp3InputName] = useState<string>('');
  const [tp4InputName, setTp4InputName] = useState<string>('');

  useEffect(() => {
    if (currentSubjectDefaultTps) {
      setTp1InputName(currentSubjectDefaultTps[0] || '');
      setTp2InputName(currentSubjectDefaultTps[1] || '');
      setTp3InputName(currentSubjectDefaultTps[2] || '');
      setTp4InputName(currentSubjectDefaultTps[3] || '');
    }
  }, [currentSubjectDefaultTps]);

  const [gradeInputMap, setGradeInputMap] = useState<Record<string, {
    tp1Grade: string;
    tp2Grade: string;
    tp3Grade: string;
    tp4Grade: string;
    nilaiSumatifLM: string;
    nilaiSAS: string;
    deskripsiCapaian: string;
  }>>({});

  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [excelPasteContent, setExcelPasteContent] = useState<string>('');
  const [excelParseError, setExcelParseError] = useState<string | null>(null);
  const [excelParsedPreview, setExcelParsedPreview] = useState<any[]>([]);

  // Get distinct classes from students
  const availableClasses = useMemo(() => {
    const classesSet = new Set<string>();
    students.forEach(s => {
      if (s.class) classesSet.add(s.class.trim().toUpperCase());
    });
    return Array.from(classesSet).sort();
  }, [students]);

  useEffect(() => {
    if (!selectedGradeClass && availableClasses.length > 0) {
      setSelectedGradeClass(availableClasses[0]);
    }
  }, [availableClasses, selectedGradeClass]);

  // If no class is selected yet, default to the first available class
  useEffect(() => {
    if (!selectedClass && availableClasses.length > 0) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

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

  const handleOpenEditModal = (journal: any) => {
    setEditingJournal(journal);
    setEditTopic(journal.topic || '');
    setEditNotes(journal.notes || '');
    setEditDate(journal.date || '');
    setEditFase(journal.fase || 'D');
    setEditSemester(journal.semester || 'Genap');
    setEditAlokasiWaktu(journal.alokasiWaktu || '2 JP');
    setEditJamKe(journal.jamKe || '');
    setEditPertemuanKe(journal.pertemuanKe || '');
    setEditTujuanPembelajaran(journal.tujuanPembelajaran || '');
    setEditPencapaianKktp(journal.pencapaianKktp || 'Tercapai');

    const statusMap: Record<string, { status: string; notes: string }> = {};
    if (Array.isArray(journal.attendance)) {
      journal.attendance.forEach((att: any) => {
        statusMap[att.studentId] = {
          status: att.status || 'Hadir',
          notes: att.notes || ''
        };
      });
    }
    setEditDailyStatusMap(statusMap);
    setIsEditModalOpen(true);
  };

  const handleUpdateJournal = async () => {
    if (!editingJournal) return;
    if (!editTopic.trim()) {
      alert("Materi KBM / Topik Pembelajaran harus diisi.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const journalClassStudents = students
        .filter(s => s.class && s.class.toLowerCase() === editingJournal.className.toLowerCase())
        .sort((a, b) => a.name.localeCompare(b.name));

      const attendanceList = journalClassStudents.map(student => {
        const studentRecord = editDailyStatusMap[student.id] || { status: 'Hadir', notes: '' };
        return {
          studentId: student.id,
          studentName: student.name,
          status: studentRecord.status,
          notes: studentRecord.notes
        };
      });

      const response = await fetch(`/api/teaching-journals/${editingJournal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: editTopic.trim(),
          notes: editNotes.trim(),
          date: editDate,
          fase: editFase,
          semester: editSemester,
          alokasiWaktu: editAlokasiWaktu,
          jamKe: editJamKe,
          pertemuanKe: editPertemuanKe,
          tujuanPembelajaran: editTujuanPembelajaran,
          pencapaianKktp: editPencapaianKktp,
          attendance: attendanceList
        })
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        setEditingJournal(null);
        fetchJournals();
        if (onRefresh) onRefresh();
        alert("Jurnal KBM berhasil diperbarui!");
      } else {
        const errData = await response.json();
        alert(errData.error || "Gagal memperbarui Jurnal Pembelajaran.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal terhubung dengan server.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteJournalSubject = async (journalId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus jurnal pembelajaran ini beserta seluruh catatan absensi terkait?")) {
      return;
    }

    try {
      const res = await fetch(`/api/teaching-journals/${journalId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchJournals();
        if (onRefresh) onRefresh();
        alert("Jurnal pembelajaran berhasil dihapus.");
      } else {
        alert("Gagal menghapus jurnal.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal terhubung dengan server.");
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

  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    try {
      const res = await fetch('/api/merdeka-assessments');
      if (res.ok) {
        const data = await res.json();
        setMerdekaAssessments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    fetchJournals();
    fetchNotifications();
    fetchAssessments();
    fetchPrincipalWorkPrograms();
    fetchEvaluations();
  }, [currentTeacher]);

  const gradingClassStudents = useMemo(() => {
    if (!selectedGradeClass) return [];
    return students.filter(s => s.class.trim().toUpperCase() === selectedGradeClass.trim().toUpperCase())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedGradeClass]);

  useEffect(() => {
    const newMap: Record<string, {
      tp1Grade: string;
      tp2Grade: string;
      tp3Grade: string;
      tp4Grade: string;
      nilaiSumatifLM: string;
      nilaiSAS: string;
      deskripsiCapaian: string;
    }> = {};

    gradingClassStudents.forEach(s => {
      const match = merdekaAssessments.find(a => 
        a.studentId === s.id && 
        matchSubject(a.subject, currentTeacher.subject) && 
        a.semester === selectedSemesterGrading && 
        a.academicYear === selectedYearGrading
      );
      if (match) {
        newMap[s.id] = {
          tp1Grade: String(match.tp1Grade ?? ''),
          tp2Grade: match.tp2Grade !== undefined && match.tp2Grade !== null ? String(match.tp2Grade) : '',
          tp3Grade: match.tp3Grade !== undefined && match.tp3Grade !== null ? String(match.tp3Grade) : '',
          tp4Grade: match.tp4Grade !== undefined && match.tp4Grade !== null ? String(match.tp4Grade) : '',
          nilaiSumatifLM: String(match.nilaiSumatifLM ?? ''),
          nilaiSAS: String(match.nilaiSAS ?? ''),
          deskripsiCapaian: match.deskripsiCapaian ?? ''
        };
      } else {
        newMap[s.id] = {
          tp1Grade: '',
          tp2Grade: '',
          tp3Grade: '',
          tp4Grade: '',
          nilaiSumatifLM: '',
          nilaiSAS: '',
          deskripsiCapaian: ''
        };
      }
    });

    setGradeInputMap(newMap);
  }, [gradingClassStudents, merdekaAssessments, selectedSemesterGrading, selectedYearGrading, currentTeacher.subject]);

  function matchSubject(sub1: string, sub2: string): boolean {
    return (sub1 || '').trim().toLowerCase() === (sub2 || '').trim().toLowerCase();
  }

  const handleImportExcelData = () => {
    if (!excelPasteContent.trim()) {
      setExcelParseError("Silakan tempel data dari Excel atau unggah file terlebih dahulu.");
      return;
    }

    try {
      const rows = excelPasteContent.trim().split("\n");
      const parsedData: any[] = [];
      
      rows.forEach((row, idx) => {
        const cells = row.split(/\t|,/).map(c => c.trim().replace(/^["']|["']$/g, ''));
        
        if (idx === 0 && (
          cells[0].toLowerCase().includes("nis") || 
          cells[1].toLowerCase().includes("nama") || 
          (cells[2] && cells[2].toLowerCase().includes("tp")) ||
          (cells[2] && cells[2].toLowerCase().includes("nilai"))
        )) {
          return;
        }

        const rawNis = cells[0];
        const nameInput = cells[1];
        const tp1Str = cells[2];
        const tp2Str = cells[3] || "";
        const tp3Str = cells[4] || "";
        
        let tp4Str = "";
        let slmStr = "";
        let sasStr = "";

        if (cells.length >= 8) {
          tp4Str = cells[5] || "";
          slmStr = cells[6] || "";
          sasStr = cells[7] || "";
        } else {
          tp4Str = "";
          slmStr = cells[5] || "";
          sasStr = cells[6] || "";
        }

        if (!rawNis && !nameInput) return;

        // Try to match student
        const matched = students.find(s => 
          (rawNis && s.nis && String(s.nis).trim() === String(rawNis).trim()) || 
          (nameInput && s.name.toLowerCase() === nameInput.toLowerCase()) ||
          (nameInput && s.name.toLowerCase().includes(nameInput.toLowerCase()))
        );

        if (matched) {
          parsedData.push({
            studentId: matched.id,
            studentName: matched.name,
            nis: matched.nis,
            className: matched.class,
            tp1Grade: Number(tp1Str) || 0,
            tp2Grade: tp2Str !== "" ? Number(tp2Str) : undefined,
            tp3Grade: tp3Str !== "" ? Number(tp3Str) : undefined,
            tp4Grade: tp4Str !== "" ? Number(tp4Str) : undefined,
            nilaiSumatifLM: Number(slmStr) || 0,
            nilaiSAS: Number(sasStr) || 0,
            matched: true
          });
        } else {
          parsedData.push({
            nis: rawNis || "-",
            studentName: nameInput || "Siswa Tidak Ditemukan",
            matched: false,
            tp1Grade: Number(tp1Str) || 0,
            nilaiSumatifLM: Number(slmStr) || 0,
            nilaiSAS: Number(sasStr) || 0
          });
        }
      });

      const verifiedMatches = parsedData.filter(d => d.matched);
      if (verifiedMatches.length === 0) {
        setExcelParseError("Gagal mencocokkan data baris dengan siswa terdaftar. Pastikan NIS atau Nama sesuai.");
        setExcelParsedPreview([]);
      } else {
        setExcelParsedPreview(parsedData);
        setExcelParseError(null);
      }
    } catch (err: any) {
      setExcelParseError("Kesalahan saat memproses data: " + err.message);
    }
  };

  const applyExcelImportToState = () => {
    const updatedMap = { ...gradeInputMap };
    let importCount = 0;

    excelParsedPreview.forEach(item => {
      if (item.matched && item.studentId) {
        updatedMap[item.studentId] = {
          tp1Grade: String(item.tp1Grade),
          tp2Grade: item.tp2Grade !== undefined ? String(item.tp2Grade) : "",
          tp3Grade: item.tp3Grade !== undefined ? String(item.tp3Grade) : "",
          tp4Grade: item.tp4Grade !== undefined ? String(item.tp4Grade) : "",
          nilaiSumatifLM: String(item.nilaiSumatifLM),
          nilaiSAS: String(item.nilaiSAS),
          deskripsiCapaian: ""
        };
        importCount++;
      }
    });

    setGradeInputMap(updatedMap);
    setShowExcelModal(false);
    setExcelPasteContent('');
    setExcelParsedPreview([]);
    setFeedback({
      type: 'success',
      text: `Berhasil mencocokkan & memuat nilai untuk ${importCount} siswa dari Excel ke tabel.`
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setExcelPasteContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Class students roster
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.class.trim().toUpperCase() === selectedClass.trim().toUpperCase())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Pre-fill attendance statuses when selecting a class or changing date, getting default from wali kelas daily attendance
  useEffect(() => {
    if (classStudents.length > 0) {
      const initialMap: Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }> = {};
      classStudents.forEach(s => {
        const matchingLog = attendanceLogs.find(log => log.studentId === s.id && log.date === selectedDate);
        initialMap[s.id] = { 
          status: matchingLog ? matchingLog.status : 'Hadir', 
          notes: matchingLog && matchingLog.notes ? matchingLog.notes : ''
        };
      });
      setDailyStatusMap(initialMap);
    }
  }, [selectedClass, selectedDate, students, attendanceLogs, classStudents]);

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
          teacherType: 'subject_teacher',
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

      {/* Unduh Aplikasi Mobile Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <Smartphone size={20} className="text-indigo-600 shrink-0" />
          <div>
            <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wide">Aplikasi Mobile Resmi SMP Ma'arif</h4>
            <p className="text-[10px] text-slate-500 leading-normal">Unduh aplikasi mobile resmi sekolah untuk mengakses sistem akademik & kesiswaan langsung dari smartphone Anda.</p>
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
                ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800 border-emerald-250 shadow-3xs" 
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
                ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-800 border-sky-250 shadow-3xs" 
                : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
            }`}
          >
            <Apple size={14} className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`} />
            <span>iOS Apple</span>
          </a>
        </div>
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
          onClick={() => { setActiveSubTab('penilaian'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
            activeSubTab === 'penilaian'
              ? 'bg-indigo-600 text-white border border-indigo-600 shadow-sm font-black'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={13} />
          <span>Penilaian Merdeka</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('pkg'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
            activeSubTab === 'pkg'
              ? 'bg-amber-600 text-white border border-amber-600 shadow-sm font-black'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={13} />
          <span>Kinerja (PKG)</span>
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
                <label className="text-xs font-black text-indigo-750 flex items-center gap-1 bg-indigo-50/50 p-2 border border-indigo-100 rounded-lg w-fit">
                  <span>Catatan Khusus KBM / Agenda (Terhubung ke Rekap Wali Kelas)</span>
                </label>
                <textarea
                  placeholder="Tulis hambatan, tugas, catatan khusus di kelas, atau materi tambahan hari ini yang akan otomatis sinkron ke asisten rekap wali kelas..."
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 text-xs bg-white resize-none shadow-xs"
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

              {/* Desktop Roster Table View (hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto">
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

              {/* Mobile Touch-Friendly Card List View (hidden on desktop) */}
              <div className="block md:hidden flex flex-col gap-3 p-3 bg-slate-50/50">
                {filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold font-sans text-xs bg-white border border-slate-200 rounded-2xl">
                    {classStudents.length === 0 
                      ? 'Tidak ada data siswa untuk kelas ini.' 
                      : 'Tidak ada siswa yang cocok dengan pencarian.'
                    }
                  </div>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const studentRecord = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };
                    
                    // Dynamic color badge helper for active status text on mobile card
                    const statusPillColors = {
                      'Hadir': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      'Terlambat': 'bg-amber-50 text-amber-700 border-amber-200',
                      'Sakit': 'bg-sky-50 text-sky-700 border-sky-200',
                      'Izin': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      'Alpa': 'bg-rose-50 text-rose-700 border-rose-200'
                    };

                    return (
                      <div key={`mob-subject-att-${student.id}`} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex flex-col gap-3.5 relative">
                        {/* Card Header */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col text-left">
                            <span className="font-extrabold text-slate-900 text-[13px] leading-tight">{student.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">NIS: {student.nis}</span>
                          </div>
                          <span className="font-extrabold text-[9px] text-slate-400 font-mono bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Attendance Buttons selection on Mobile */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status Presensi:</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusPillColors[studentRecord.status]}`}>
                              {studentRecord.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 border border-slate-200 rounded-lg">
                            {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map(status => {
                              let bgClass = 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 font-bold';
                              if (studentRecord.status === status) {
                                if (status === 'Hadir') bgClass = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                                else if (status === 'Terlambat') bgClass = 'bg-amber-500 text-white border-amber-500 shadow-xs';
                                else if (status === 'Sakit') bgClass = 'bg-sky-500 text-white border-sky-500 shadow-xs';
                                else if (status === 'Izin') bgClass = 'bg-indigo-600 text-white border-indigo-600 shadow-xs';
                                else if (status === 'Alpa') bgClass = 'bg-rose-500 text-white border-rose-500 shadow-xs';
                              }
                              const shortLabel = status === 'Hadir' ? 'H' : status === 'Terlambat' ? 'T' : status === 'Sakit' ? 'S' : status === 'Izin' ? 'I' : 'A';
                              return (
                                <button
                                  key={status}
                                  translate="no"
                                  onClick={() => handleStatusChange(student.id, status)}
                                  type="button"
                                  className={`notranslate py-2 px-0.5 border text-xs font-black uppercase tracking-wider rounded-md text-center cursor-pointer transition-all ${bgClass}`}
                                  title={status}
                                >
                                  {shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notes input on Mobile */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Catatan Jam Mapel:</span>
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
                            className="w-full px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 bg-white placeholder:text-slate-300"
                          />
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

                      {/* Display of non-present student names */}
                      {(() => {
                        const nonPresent = (journal.attendance || []).filter((a: any) => a.status !== 'Hadir' && a.status !== 'Terlambat');
                        if (nonPresent.length > 0) {
                          return (
                            <div className="mt-2 text-xs text-slate-700 leading-relaxed bg-rose-50/20 border border-slate-150 rounded-xl p-2.5 max-w-xl">
                              <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider block mb-1">Daftar Siswa Tidak Hadir:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {nonPresent.map((a: any, i: number) => (
                                  <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    a.status === 'Sakit' ? 'bg-amber-50 text-amber-850 border-amber-100' :
                                    a.status === 'Izin' ? 'bg-sky-50 text-sky-850 border-sky-100' :
                                    'bg-rose-50 text-rose-850 border-rose-100'
                                  }`}>
                                    {a.studentName} ({a.status}{a.notes ? `: ${a.notes}` : ''})
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mt-2 text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50/40 border border-emerald-100 rounded-lg p-1.5 w-fit px-2.5">
                              ✓ Nihil (Semua siswa hadir)
                            </div>
                          );
                        }
                      })()}
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
                        onClick={() => handleOpenEditModal(journal)}
                        className="px-3 py-2 bg-amber-55 hover:bg-amber-100 border border-amber-202 text-amber-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Edit size={13} className="text-amber-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteJournalSubject(journal.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition-all flex items-center shadow-xs cursor-pointer"
                        title="Hapus Jurnal"
                      >
                        <Trash2 size={13} />
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

      {/* View: Evaluasi Kinerja (PKG) */}
      {activeSubTab === 'pkg' && (
        <div className="flex flex-col gap-6 text-left animate-fade-in mb-12">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-indigo-600" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Laporan Hasil Kinerja</span>
                <h2 className="font-extrabold text-lg text-slate-900 mt-1 flex items-center gap-2">
                  🎖️ Penilaian Kinerja Guru (PKG) Saya
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Hasil evaluasi dan penilaian kuantitatif kompetensi pendidik terintegrasi yang dirilis secara resmi oleh Kepala Sekolah.
                </p>
              </div>
            </div>

            {loadingEvaluations ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <span className="text-xs font-bold font-sans">Menjaring data penilaian resmi...</span>
              </div>
            ) : evaluations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mt-6 gap-3">
                <span className="text-4xl text-slate-300">📭</span>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Belum Ada Penilaian PKG</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-md">
                    Kepala Sekolah belum menerbitkan atau mensinkronkan penilaian kinerja (PKG) berkala untuk akun pendidik Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 mt-6">
                {evaluations.map((ev) => {
                  const avgScore = Math.round((Number(ev.pedagogicScore) + Number(ev.professionalScore) + Number(ev.personalScore) + Number(ev.socialScore)) / 4);
                  return (
                    <div key={ev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 hover:shadow-md transition-all">
                      {/* Top Header of evaluation */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-extrabold text-[9px] uppercase tracking-wider">
                            TA: {ev.academicYear}
                          </span>
                          <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">
                            Lembar PKG - {ev.teacherName}
                          </h3>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            Penilai: {schoolIdentity?.principal || ev.evaluatorName} (Kepala Sekolah) &bull; Synchronized: {ev.date}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePrintPkg(ev)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer w-fit"
                        >
                          <Printer size={13} />
                          Cetak Laporan Resmi
                        </button>
                      </div>

                      {/* Score metrics grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Pedagogik</span>
                          <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.pedagogicScore}</span>
                          <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Profesional</span>
                          <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.professionalScore}</span>
                          <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kepribadian</span>
                          <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.personalScore}</span>
                          <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Sosial</span>
                          <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.socialScore}</span>
                          <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                        </div>
                        <div className="col-span-2 md:col-span-1 bg-amber-500/10 border-2 border-amber-500/20 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                          <span className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider">Rata-Rata</span>
                          <span className="text-2xl font-black text-emerald-700 mt-1 font-mono">{avgScore}</span>
                          <span className="text-[9px] text-emerald-700 font-extrabold mt-1">
                            {avgScore >= 85 ? 'AMAT BAIK' : 'BAIK'}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Recommendations area */}
                      {ev.notes && (
                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-left">
                          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                            Catatan Khusus &amp; Rekomendasi Kepala Sekolah
                          </span>
                          <p className="text-xs text-slate-700 font-bold italic leading-relaxed font-sans">
                            "{ev.notes}"
                          </p>
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

              {currentTeacher.skUrl && (
                <a
                  href={currentTeacher.skUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mb-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download size={13} />
                  <span>Unduh SK Penugasan 📋</span>
                </a>
              )}

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

            {/* Program Kerja Kepala Sekolah Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">📢</span> Program Kerja Kepala Sekolah
                  </h3>
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    Instruksi Resmi Pendidik
                  </span>
                </div>
                <p className="text-xs text-slate-550 text-slate-500 mt-1">
                  Daftar kebijakan dan rancangan program strategis yang diturunkan oleh Kepala Sekolah ({schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}) demi koordinasi pendidik.
                </p>
              </div>

              <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-1">
                {loadingWorkPrograms ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs font-semibold">
                    <Loader2 size={16} className="animate-spin text-indigo-500 mb-2" />
                    Memuat program kerja Kepala Sekolah...
                  </div>
                ) : workPrograms.filter(p => p.syncWithStaff).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs italic">
                    Saat ini belum ada program kerja strategis yang dipublikasikan oleh Kepala Sekolah.
                  </div>
                ) : (
                  workPrograms.filter(p => p.syncWithStaff).map(p => {
                    const statusBgs = {
                      planned: 'bg-blue-50 text-blue-700 border-blue-100',
                      active: 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse',
                      completed: 'bg-slate-100 text-slate-600 border-slate-200'
                    };
                    const statusLabels = {
                      planned: 'Direncanakan',
                      active: 'Berjalan Aktif',
                      completed: 'Selesai'
                    };

                    return (
                      <div key={p.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col gap-2 shadow-xxs">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-extrabold text-slate-850 text-slate-800 text-xs leading-tight">{p.title}</h4>
                          <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-md shrink-0 ${statusBgs[p.status] || ''}`}>
                            {statusLabels[p.status] || p.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">{p.description}</p>
                        <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-bold border-t border-slate-200/50 pt-2 mt-1">
                          <span>📅 Batas Pelaksanaan: <span className="text-slate-705 font-mono">{p.targetDate}</span></span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View: Penilaian Kurikulum Merdeka */}
      {activeSubTab === 'penilaian' && (
        <div className="flex flex-col gap-6 text-left animate-fade-in mb-12">
          {/* Header & Filter Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-indigo-600" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Modul Guru Mata Pelajaran</span>
                <h2 className="font-extrabold text-lg text-slate-900 mt-1 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  Penilaian Rapor Kurikulum Merdeka ({currentTeacher.subject})
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Isi kriteria ketercapaian tujuan pembelajaran (KKTP), formatif harian, sumatif materi, dan SAS untuk nilai rapor akhir otomatis.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExcelPasteContent('');
                    setExcelParseError(null);
                    setExcelParsedPreview([]);
                    setShowExcelModal(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileText size={14} className="text-emerald-600" />
                  Import dari MS Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...gradeInputMap };
                    gradingClassStudents.forEach(s => {
                      if (!updated[s.id]?.tp1Grade) {
                        updated[s.id] = {
                          tp1Grade: String(Math.floor(Math.random() * 16) + 80),
                          tp2Grade: String(Math.floor(Math.random() * 16) + 78),
                          tp3Grade: String(Math.floor(Math.random() * 16) + 82),
                          tp4Grade: String(Math.floor(Math.random() * 16) + 84),
                          nilaiSumatifLM: String(Math.floor(Math.random() * 16) + 78),
                          nilaiSAS: String(Math.floor(Math.random() * 16) + 80),
                          deskripsiCapaian: ''
                        };
                      }
                    });
                    setGradeInputMap(updated);
                    setFeedback({ type: 'success', text: "Berhasil mengisi otomatis sampel nilai (80-95) yang kosong untuk demo penilaian!" });
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={13} className="text-slate-500" />
                  Isi Contoh Nilai
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Pilih Kelas</label>
                <select
                  value={selectedGradeClass}
                  onChange={(e) => setSelectedGradeClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  {availableClasses.length === 0 ? (
                    <option value="">Tidak ada kelas terdaftar</option>
                  ) : (
                    availableClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Semester</label>
                <select
                  value={selectedSemesterGrading}
                  onChange={(e) => setSelectedSemesterGrading(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tahun Ajaran</label>
                <select
                  value={selectedYearGrading}
                  onChange={(e) => setSelectedYearGrading(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  {Array.from(new Set([
                    ...(schoolIdentity?.activeAcademicYear ? [schoolIdentity.activeAcademicYear] : []),
                    '2025/2026',
                    '2024/2025',
                    '2023/2024'
                  ])).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TP Config / Kriteria Ketercapaian Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-600">
                Deskripsi Tujuan Pembelajaran (TP) yang Diujikan
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[9px] font-black uppercase text-indigo-500 mb-1.5 block">Tujuan Pembelajaran 1 (TP-1)</span>
                <textarea
                  value={tp1InputName}
                  onChange={(e) => setTp1InputName(e.target.value)}
                  rows={2}
                  maxLength={100}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl p-2.5 text-[11px] leading-relaxed font-bold text-slate-800 bg-slate-50/20"
                  placeholder="Isi uraian TP-1..."
                />
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[9px] font-black uppercase text-indigo-500 mb-1.5 block">Tujuan Pembelajaran 2 (TP-2) - Opsional</span>
                <textarea
                  value={tp2InputName}
                  onChange={(e) => setTp2InputName(e.target.value)}
                  rows={2}
                  maxLength={100}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl p-2.5 text-[11px] leading-relaxed font-bold text-slate-800 bg-slate-50/20"
                  placeholder="Isi uraian TP-2 (kosongkan jika tidak ada)..."
                />
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[9px] font-black uppercase text-indigo-500 mb-1.5 block">Tujuan Pembelajaran 3 (TP-3) - Opsional</span>
                <textarea
                  value={tp3InputName}
                  onChange={(e) => setTp3InputName(e.target.value)}
                  rows={2}
                  maxLength={100}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl p-2.5 text-[11px] leading-relaxed font-bold text-slate-800 bg-slate-50/20"
                  placeholder="Isi uraian TP-3 (kosongkan jika tidak ada)..."
                />
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[9px] font-black uppercase text-indigo-500 mb-1.5 block">Tujuan Pembelajaran 4 (TP-4) - Opsional</span>
                <textarea
                  value={tp4InputName}
                  onChange={(e) => setTp4InputName(e.target.value)}
                  rows={2}
                  maxLength={100}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl p-2.5 text-[11px] leading-relaxed font-bold text-slate-800 bg-slate-50/20"
                  placeholder="Isi uraian TP-4 (kosongkan jika tidak ada)..."
                />
              </div>
            </div>
          </div>

          {/* Student Grading Grid Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-[10px] text-center">
                    <th className="py-3 px-3 w-12 text-center rounded-tl-3xl">No</th>
                    <th className="py-3 px-4 text-left min-w-[160px]">Nama Siswa [NIS]</th>
                    <th className="py-3 px-2 w-20 text-indigo-300">TP-1</th>
                    <th className="py-3 px-2 w-20 text-indigo-300">TP-2</th>
                    <th className="py-3 px-2 w-20 text-indigo-300">TP-3</th>
                    <th className="py-3 px-2 w-20 text-indigo-300">TP-4</th>
                    <th className="py-3 px-2 w-24 bg-indigo-950 text-indigo-300">Avg Formatif</th>
                    <th className="py-3 px-2 w-24 text-amber-400">Sumatif LM</th>
                    <th className="py-3 px-2 w-20 text-amber-400">SAS</th>
                    <th className="py-3 px-2 w-24 bg-slate-950 text-emerald-400 font-black rounded-tr-3xl">Nilai Rapor</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingClassStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-slate-400 font-semibold text-xs">
                        Tidak ada data siswa ditemukan untuk kelas {selectedGradeClass}.
                      </td>
                    </tr>
                  ) : (
                    gradingClassStudents.map((s, idx) => {
                      const inputState = gradeInputMap[s.id] || {
                        tp1Grade: '',
                        tp2Grade: '',
                        tp3Grade: '',
                        tp4Grade: '',
                        nilaiSumatifLM: '',
                        nilaiSAS: '',
                        deskripsiCapaian: ''
                      };

                      // On-the-fly calculations
                      const tp1G = Number(inputState.tp1Grade) || 0;
                      const tp2G = inputState.tp2Grade !== '' ? Number(inputState.tp2Grade) : undefined;
                      const tp3G = inputState.tp3Grade !== '' ? Number(inputState.tp3Grade) : undefined;
                      const tp4G = inputState.tp4Grade !== '' ? Number(inputState.tp4Grade) : undefined;

                      let tpCount = 0;
                      let sumTp = 0;
                      if (inputState.tp1Grade !== '') { tpCount++; sumTp += tp1G; }
                      if (tp2G !== undefined) { tpCount++; sumTp += tp2G; }
                      if (tp3G !== undefined) { tpCount++; sumTp += tp3G; }
                      if (tp4G !== undefined) { tpCount++; sumTp += tp4G; }

                      const avgF = tpCount > 0 ? Math.round(sumTp / tpCount) : 0;
                      const slm = Number(inputState.nilaiSumatifLM) || 0;
                      const sas = Number(inputState.nilaiSAS) || 0;

                      // Final assessment weight (avgFormatif + sumatifLM + SAS)/3
                      const raporScore = tpCount > 0 || slm > 0 || sas > 0 ? Math.round((avgF + slm + sas) / 3) : 0;

                      const handleGradeChange = (field: string, val: string) => {
                        let cleanIdx = val;
                        if (val !== '') {
                          const numVal = parseInt(val);
                          if (isNaN(numVal)) cleanIdx = '';
                          else cleanIdx = String(Math.min(100, Math.max(0, numVal)));
                        }
                        setGradeInputMap(prev => ({
                          ...prev,
                          [s.id]: {
                            ...prev[s.id] || {
                              tp1Grade: '',
                              tp2Grade: '',
                              tp3Grade: '',
                              tp4Grade: '',
                              nilaiSumatifLM: '',
                              nilaiSAS: '',
                              deskripsiCapaian: ''
                            },
                            [field]: cleanIdx
                          }
                        }));
                      };

                      return (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 text-left">
                            <div className="font-extrabold text-slate-800 text-[12px]">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {s.nis}</div>
                          </td>
                          
                          {/* TP Grades Inputs */}
                          <td className="py-2.5 px-1.5 text-center">
                            <input
                              type="text"
                              maxLength={3}
                              value={inputState.tp1Grade}
                              onChange={(e) => handleGradeChange('tp1Grade', e.target.value)}
                              className="w-14 text-center border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-lg py-1 px-1 font-black text-slate-800 bg-slate-50/30"
                              placeholder="-"
                            />
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <input
                              type="text"
                              maxLength={3}
                              value={inputState.tp2Grade}
                              onChange={(e) => handleGradeChange('tp2Grade', e.target.value)}
                              className="w-14 text-center border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-lg py-1 px-1 font-black text-slate-800 bg-slate-50/30 disabled:opacity-50"
                              placeholder="-"
                              disabled={!tp2InputName.trim()}
                            />
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <input
                              type="text"
                              maxLength={3}
                              value={inputState.tp3Grade}
                              onChange={(e) => handleGradeChange('tp3Grade', e.target.value)}
                              className="w-14 text-center border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-lg py-1 px-1 font-black text-slate-800 bg-slate-50/30 disabled:opacity-50"
                              placeholder="-"
                              disabled={!tp3InputName.trim()}
                            />
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <input
                              type="text"
                              maxLength={3}
                              value={inputState.tp4Grade || ''}
                              onChange={(e) => handleGradeChange('tp4Grade', e.target.value)}
                              className="w-14 text-center border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-lg py-1 px-1 font-black text-slate-800 bg-slate-50/30 disabled:opacity-50"
                              placeholder="-"
                              disabled={!tp4InputName.trim()}
                            />
                          </td>

                          {/* Computed Formative Average */}
                          <td className="py-2.5 px-2 text-center font-black text-indigo-700 bg-indigo-50/10 text-[12px]">
                            {avgF || "-"}
                          </td>

                          {/* Sumatif LM & Final SAS */}
                          <td className="py-2.5 px-1.5 text-center">
                            <input
                              type="text"
                              maxLength={3}
                              value={inputState.nilaiSumatifLM}
                              onChange={(e) => handleGradeChange('nilaiSumatifLM', e.target.value)}
                              className="w-14 text-center border border-amber-200 focus:border-amber-600 focus:outline-none rounded-lg py-1 px-1 font-black text-slate-800 bg-amber-500/5"
                              placeholder="-"
                            />
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <input
                              type="text"
                              maxLength={3}
                              value={inputState.nilaiSAS}
                              onChange={(e) => handleGradeChange('nilaiSAS', e.target.value)}
                              className="w-14 text-center border border-amber-200 focus:border-amber-600 focus:outline-none rounded-lg py-1 px-1 font-black text-slate-800 bg-amber-500/5"
                              placeholder="-"
                            />
                          </td>

                          {/* Computed Final Report Score */}
                          <td className="py-2.5 px-2 text-center font-black text-slate-900 bg-slate-100 text-sm">
                            <span className={`px-2 py-0.5 rounded-md ${
                              raporScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 font-extrabold'
                            }`}>
                              {raporScore || "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Form Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500">
                Nilai akhir rapor Kurikulum Merdeka dihitung dengan bobot seimbang rata formatif, sumatif l/m dan SAS.
              </span>
              <button
                type="button"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const batchData = gradingClassStudents.map(s => {
                      const inputState = gradeInputMap[s.id] || {
                        tp1Grade: '',
                        tp2Grade: '',
                        tp3Grade: '',
                        tp4Grade: '',
                        nilaiSumatifLM: '',
                        nilaiSAS: '',
                        deskripsiCapaian: ''
                      };

                      return {
                        studentId: s.id,
                        studentName: s.name,
                        className: s.class,
                        subject: currentTeacher.subject,
                        teacherName: currentTeacher.name,
                        semester: selectedSemesterGrading,
                        academicYear: selectedYearGrading,
                        tp1Name: tp1InputName,
                        tp1Grade: inputState.tp1Grade || "0",
                        tp2Name: tp2InputName || undefined,
                        tp2Grade: inputState.tp2Grade !== "" ? inputState.tp2Grade : undefined,
                        tp3Name: tp3InputName || undefined,
                        tp3Grade: inputState.tp3Grade !== "" ? inputState.tp3Grade : undefined,
                        tp4Name: tp4InputName || undefined,
                        tp4Grade: inputState.tp4Grade !== "" ? inputState.tp4Grade : undefined,
                        nilaiSumatifLM: inputState.nilaiSumatifLM || "0",
                        nilaiSAS: inputState.nilaiSAS || "0"
                      };
                    });

                    const res = await fetch('/api/merdeka-assessments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(batchData)
                    });

                    if (res.ok) {
                      setFeedback({ type: 'success', text: `Seluruh penilaian Kurikulum Merdeka untuk Kelas ${selectedGradeClass} berhasil disimpan ke basis data!` });
                      fetchAssessments();
                      onRefresh();
                    } else {
                      setFeedback({ type: 'error', text: 'Gagal memproses penyimpanan penilaian.' });
                    }
                  } catch (err: any) {
                    setFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50"
                disabled={isSaving || gradingClassStudents.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>SIMPAN DATA PENILAIAN</span>
                  </>
                )}
              </button>
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

              {/* Rekap Absensi (Cukup Rekap Saja) */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">REKAPITULASI PRESENSI KBM</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase">Hadir</span>
                    <span className="block text-xl font-extrabold text-emerald-900 mt-1">
                      {historyDetailJournal.attendance.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length}
                    </span>
                  </div>
                  <div className="bg-sky-50 border border-sky-150 rounded-2xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-sky-800 uppercase">Sakit</span>
                    <span className="block text-xl font-extrabold text-sky-900 mt-1">
                      {historyDetailJournal.attendance.filter(a => a.status === 'Sakit').length}
                    </span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-indigo-800 uppercase">Izin</span>
                    <span className="block text-xl font-extrabold text-indigo-900 mt-1">
                      {historyDetailJournal.attendance.filter(a => a.status === 'Izin').length}
                    </span>
                  </div>
                  <div className="bg-rose-50 border border-rose-150 rounded-2xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-rose-800 uppercase">Alpa</span>
                    <span className="block text-xl font-extrabold text-rose-900 mt-1">
                      {historyDetailJournal.attendance.filter(a => a.status === 'Alpa').length}
                    </span>
                  </div>
                </div>

                {/* List of non-present students */}
                {(() => {
                  const nonPresent = historyDetailJournal.attendance.filter(a => a.status !== 'Hadir' && a.status !== 'Terlambat');
                  if (nonPresent.length > 0) {
                    return (
                      <div className="bg-white border border-slate-150 rounded-xl p-3 text-xs leading-relaxed text-slate-700">
                        <span className="font-extrabold text-slate-800 block mb-1">Rincian Siswa Tidak Hadir / Keterangan Khusus KBM:</span>
                        <div className="flex flex-col gap-1">
                          {nonPresent.map((a, i) => (
                            <div key={i} className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                              <span>{a.studentName}</span>
                              <span className="font-bold uppercase tracking-wider text-[10px]">
                                {a.status === 'Sakit' ? 'Sakit' : a.status === 'Izin' ? 'Izin' : 'Alpa'}
                                {a.notes ? ` (${a.notes})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 text-xs text-center text-emerald-800 font-semibold select-none">
                      Semua siswa hadir (Nihil Absensi).
                    </div>
                  );
                })()}

                {historyDetailJournal.notes && (
                  <div className="bg-amber-50 border border-amber-200/60 p-3.5 rounded-xl text-xs text-amber-900 font-medium leading-relaxed">
                    <strong className="text-amber-800 font-extrabold block mb-1">Catatan Khusus Pembelajaran KBM:</strong>
                    &ldquo;{historyDetailJournal.notes}&rdquo;
                  </div>
                )}
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

      {/* Edit Jurnal KBM & Presensi Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingJournal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md no-print p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-slate-50 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="text-left animate-fade-in">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-850 font-extrabold text-[9px] rounded-full uppercase tracking-wider">
                    Mode Edit Jurnal KBM Mapel
                  </span>
                  <h3 className="font-extrabold text-slate-950 text-base mt-0.5">
                    Edit Jurnal & Presensi Kelas {editingJournal.className}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingJournal(null);
                  }}
                  className="p-1 px-2.5 text-slate-400 hover:text-slate-800 font-bold transition-all hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
                >
                  Batal
                </button>
              </div>

              {/* Form Content Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:grid lg:grid-cols-12 gap-6">
                
                {/* Left side: Meta details */}
                <div className="lg:col-span-4 flex flex-col gap-4 text-left">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xs">
                    <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5 font-sans font-black">
                      <FileText size={14} className="text-amber-600" />
                      Detail KBM / Pelajaran
                    </h4>

                    {/* Subject/Class Info (Readonly) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Mata Pelajaran & Kelas</label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl font-extrabold text-xs text-slate-700">
                        {editingJournal.subject} - Kelas {editingJournal.className}
                      </div>
                    </div>

                    {/* Tanggal KBM */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tanggal KBM</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Fase */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Fase</label>
                        <select
                          value={editFase}
                          onChange={(e) => setEditFase(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-850 bg-white cursor-pointer"
                        >
                          <option value="A">Fase A (Kls 1-2)</option>
                          <option value="B">Fase B (Kls 3-4)</option>
                          <option value="C">Fase C (Kls 5-6)</option>
                          <option value="D">Fase D (Kls 7-9)</option>
                          <option value="E">Fase E (Kls 10)</option>
                          <option value="F">Fase F (Kls 11-12)</option>
                        </select>
                      </div>

                      {/* Semester */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Semester</label>
                        <select
                          value={editSemester}
                          onChange={(e) => setEditSemester(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-850 bg-white cursor-pointer"
                        >
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Jam Ke */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Jam Ke</label>
                        <input
                          type="text"
                          value={editJamKe}
                          onChange={(e) => setEditJamKe(e.target.value)}
                          placeholder="e.g. 1 - 2"
                          className="px-2 py-1.5 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 text-center bg-white"
                        />
                      </div>

                      {/* Pertemuan Ke */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Pertemuan Ke</label>
                        <input
                          type="text"
                          value={editPertemuanKe}
                          onChange={(e) => setEditPertemuanKe(e.target.value)}
                          placeholder="e.g. 1"
                          className="px-2 py-1.5 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 text-center bg-white"
                        />
                      </div>

                      {/* Alokasi Waktu */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Alokasi Waktu</label>
                        <select
                          value={editAlokasiWaktu}
                          onChange={(e) => setEditAlokasiWaktu(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="1 JP">1 JP (40 Menit)</option>
                          <option value="2 JP">2 JP (80 Menit)</option>
                          <option value="3 JP">3 JP (120 Menit)</option>
                          <option value="4 JP">4 JP (160 Menit)</option>
                        </select>
                      </div>
                    </div>

                    {/* Materi KBM / Topik Pembelajaran */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Materi KBM / Topik</label>
                      <input
                        type="text"
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        placeholder="e.g. Aljabar Linier & Matriks"
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-semibold text-xs text-slate-850 bg-white"
                      />
                    </div>

                    {/* Tujuan Pembelajaran */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tujuan Pembelajaran</label>
                      <textarea
                        value={editTujuanPembelajaran}
                        onChange={(e) => setEditTujuanPembelajaran(e.target.value)}
                        placeholder="Siswa dapat mendeskripsikan dan menyelesaikan..."
                        rows={2}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-semibold text-xs text-slate-850 resize-none font-sans bg-white"
                      />
                    </div>

                    {/* Pencapaian KKTP */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Pecapaian KKTP</label>
                      <select
                        value={editPencapaianKktp}
                        onChange={(e) => setEditPencapaianKktp(e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer"
                      >
                        <option value="Tercapai">Tercapai</option>
                        <option value="Sebagian Tercapai">Sebagian Tercapai</option>
                        <option value="Belum Tercapai">Belum Tercapai</option>
                      </select>
                    </div>

                    {/* Catatan KBM Tambahan */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Catatan Tambahan</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Hambatan, penugasan, atau rekap khusus..."
                        rows={2}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-semibold text-xs text-slate-850 resize-none font-sans bg-white"
                      />
                    </div>

                    {/* Update Action Button */}
                    <button
                      type="button"
                      onClick={handleUpdateJournal}
                      disabled={isSavingEdit}
                      className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-amber-50 border border-amber-700 flex items-center justify-center gap-1.5"
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Menyimpan Perubahan...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>Perbarui Jurnal & Absensi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right side: Student list for attendance */}
                <div className="lg:col-span-8 flex flex-col gap-4 text-left">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 select-none flex-wrap gap-2">
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-xs flex items-center gap-1.5 font-sans font-black">
                          <Users size={14} className="text-amber-600" />
                          Presensi KBM Siswa (Kelas {editingJournal.className})
                        </h4>
                        <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Ubah status kehadiran siswa untuk jam pelajaran ini.</p>
                      </div>

                      {/* Quick Bulk actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newMap: Record<string, { status: string; notes: string }> = {};
                            students
                              .filter(s => s.class && s.class.toLowerCase() === editingJournal.className.toLowerCase())
                              .forEach(s => {
                                newMap[s.id] = { status: 'Hadir', notes: '' };
                              });
                            setEditDailyStatusMap(newMap);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg cursor-pointer transition-all animate-fade-in"
                        >
                          Hadir Semua
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list/table of students */}
                    <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {students
                          .filter(s => s.class && s.class.toLowerCase() === editingJournal.className.toLowerCase())
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((student, idx) => {
                            const currentRecord = editDailyStatusMap[student.id] || { status: 'Hadir', notes: '' };
                            return (
                              <div
                                key={student.id}
                                className={`p-3 border rounded-xl transition-all flex flex-col gap-2 bg-slate-50/30 ${
                                  currentRecord.status === 'Hadir' ? 'border-slate-200 focus-within:border-slate-500' :
                                  currentRecord.status === 'Terlambat' ? 'border-amber-250 bg-amber-50/10' :
                                  currentRecord.status === 'Sakit' ? 'border-yellow-250 bg-yellow-50/10' :
                                  currentRecord.status === 'Izin' ? 'border-blue-250 bg-blue-50/10' :
                                  'border-rose-250 bg-rose-50/10'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px] flex items-center justify-center select-none font-mono font-black">
                                      {idx + 1}
                                    </span>
                                    <div className="text-left">
                                      <p className="font-extrabold text-xs text-slate-900 leading-tight font-black">
                                        {student.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold font-mono uppercase font-black">
                                        NISN: {student.nisn || student.id}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Status Radio Buttons */}
                                <div className="grid grid-cols-5 gap-1 select-none">
                                  {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map(st => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => {
                                        setEditDailyStatusMap(prev => ({
                                          ...prev,
                                          [student.id]: {
                                            ...prev[student.id],
                                            status: st
                                          }
                                        }));
                                      }}
                                      className={`py-1 text-[10px] font-extrabold rounded-lg border transition-all text-center cursor-pointer font-black ${
                                        currentRecord.status === st
                                          ? st === 'Hadir' ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs' :
                                            st === 'Terlambat' ? 'bg-amber-500 border-amber-600 text-white shadow-xs' :
                                            st === 'Sakit' ? 'bg-yellow-500 border-yellow-600 text-white shadow-xs' :
                                            st === 'Izin' ? 'bg-blue-600 border-blue-700 text-white shadow-xs' :
                                            'bg-rose-600 border-rose-700 text-white shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>

                                {/* Attendance Notes */}
                                <input
                                  type="text"
                                  placeholder="Keterangan (misal: Surat Sakit, telat 10m)..."
                                  value={currentRecord.notes || ''}
                                  onChange={(e) => {
                                    setEditDailyStatusMap(prev => ({
                                      ...prev,
                                      [student.id]: {
                                        ...prev[student.id],
                                        notes: e.target.value
                                      }
                                    }));
                                  }}
                                  className="px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-lg text-[10.5px] font-semibold text-slate-700 bg-white"
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

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
                        className="w-full h-auto block" 
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
                          <th className="border border-slate-900 px-1.5 py-3 text-[10px]" style={{ width: '15%', border: '1px solid #000' }}>Rekap Presensi KBM</th>
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
                          
                          {/* Absensi sub-table renderer reconstituted as a recap summary */}
                          <td className="border border-slate-900 px-2 py-2.5 text-center font-mono" style={{ border: '1px solid #000' }}>
                            {(() => {
                              const total = selectedJournalToPrint.attendance.length;
                              const h = selectedJournalToPrint.attendance.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length;
                              const s = selectedJournalToPrint.attendance.filter(a => a.status === 'Sakit').length;
                              const i = selectedJournalToPrint.attendance.filter(a => a.status === 'Izin').length;
                              const a = selectedJournalToPrint.attendance.filter(a => a.status === 'Alpa').length;

                              return (
                                <div className="text-[8px] leading-tight flex flex-col items-center">
                                  <span className="font-bold">Total: {total}</span>
                                  <span className="text-emerald-750 font-bold">H: {h}</span>
                                  {s > 0 && <span className="text-amber-600 font-medium">S: {s}</span>}
                                  {i > 0 && <span className="text-blue-600 font-medium">I: {i}</span>}
                                  {a > 0 && <span className="text-rose-600 font-bold">A: {a}</span>}
                                </div>
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

      {/* MODAL IMPORT EXCEL PENILAIAN */}
      <AnimatePresence>
        {showExcelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md no-print p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-w-4xl w-full text-left relative"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-emerald-700 text-white flex justify-between items-center select-none">
                <div>
                  <h4 className="font-extrabold text-sm uppercase text-white tracking-wider flex items-center gap-2">
                    <FileText size={16} />
                    Import Nilai Kurikulum Merdeka dari MS Excel
                  </h4>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    Memetakan data baris spreadsheet secara pintar berdasar NIS atau Nama Siswa.
                  </p>
                </div>
                <button
                  onClick={() => setShowExcelModal(false)}
                  className="p-1.5 hover:bg-emerald-800 rounded-lg text-emerald-100 hover:text-white transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[75vh] flex flex-col gap-4">
                {/* Instructions */}
                <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 text-[11px] leading-relaxed text-emerald-900">
                  <span className="font-black text-xs block mb-1">Panduan Penggunaan Template Excel:</span>
                  <ol className="list-decimal pl-4 flex flex-col gap-1">
                    <li>Gunakan software <strong>MS Excel</strong> atau <strong>Google Sheets</strong>.</li>
                    <li>
                      Buatlah tabel dengan kolom yang berurutan dari kiri ke kanan sebagai berikut:
                      <div className="py-1 px-2 border border-emerald-200 bg-emerald-150/40 rounded-lg font-mono text-[9px] mt-1 text-slate-700">
                        NIS | Nama Siswa | Nilai TP1 | Nilai TP2 | Nilai TP3 | Nilai Sumatif LM | Nilai SAS
                      </div>
                    </li>
                    <li>Sistem akan mendeteksi baris siswa berdasarkan <strong>NIS</strong> (disarankan) atau <strong>Nama Lengkap</strong> yang sesuai di kelas terpilih.</li>
                    <li>Cukup blok tabel nilai di Excel Anda, tekan <strong>Ctrl+C</strong> (salin), lalu tekan <strong>Ctrl+V</strong> (tempel) di kotak teks di bawah ini.</li>
                  </ol>
                </div>

                {/* Upload or Area Input */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Metode Tempel Data (Copy-Paste) atau Unggah CSV/TXT</span>
                    <label className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
                      <span>📁 Unggah Berkas</span>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={8}
                    value={excelPasteContent}
                    onChange={(e) => setExcelPasteContent(e.target.value)}
                    placeholder="NIS&#9;Nama&#9;Nilai TP1&#9;Nilai TP2&#9;Nilai TP3&#9;Nilai TP4&#9;Nilai LM&#9;Nilai SAS&#10;24001&#9;Achmad Fauzi&#9;85&#9;80&#9;90&#9;85&#9;88&#9;82"
                    className="w-full border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl p-3 font-mono text-xs bg-slate-50/50 leading-relaxed"
                  />
                </div>

                {excelParseError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-600 shrink-0" />
                    <span>{excelParseError}</span>
                  </div>
                )}

                {/* Parse Action Button */}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleImportExcelData}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    MOCK & REVIEW DATA COCOK
                  </button>
                </div>

                {/* Matches Preview */}
                {excelParsedPreview.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden mt-2">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Hasil Pemetaan Siswa ({excelParsedPreview.filter(p=>p.matched).length} matched)</span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto">
                      <table className="w-full text-[11px] border-collapse text-left">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-2 px-3">NIS</th>
                            <th className="py-2 px-3">Nama Input</th>
                            <th className="py-2 px-2 text-center">TP1</th>
                            <th className="py-2 px-2 text-center">TP2</th>
                            <th className="py-2 px-2 text-center">TP3</th>
                            <th className="py-2 px-2 text-center">TP4</th>
                            <th className="py-2 px-2 text-center">Sum LM</th>
                            <th className="py-2 px-2 text-center">SAS</th>
                            <th className="py-2 px-3 text-right">Status Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelParsedPreview.map((item, idx) => (
                            <tr key={idx} className={`border-b border-slate-100 ${item.matched ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
                              <td className="py-1.5 px-3 font-mono">{item.nis || "-"}</td>
                              <td className="py-1.5 px-3 font-bold text-slate-800">{item.studentName}</td>
                              <td className="py-1.5 px-2 text-center">{item.tp1Grade}</td>
                              <td className="py-1.5 px-2 text-center">{item.tp2Grade ?? "-"}</td>
                              <td className="py-1.5 px-2 text-center">{item.tp3Grade ?? "-"}</td>
                              <td className="py-1.5 px-2 text-center">{item.tp4Grade ?? "-"}</td>
                              <td className="py-1.5 px-2 text-center">{item.nilaiSumatifLM}</td>
                              <td className="py-1.5 px-2 text-center">{item.nilaiSAS}</td>
                              <td className="py-1.5 px-3 text-right">
                                {item.matched ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] rounded-md uppercase">Terdaftar</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-black text-[9px] rounded-md uppercase">Tidak Cocok</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExcelModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={excelParsedPreview.filter(p => p.matched).length === 0}
                  onClick={applyExcelImportToState}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>TERAPKAN NILAI SEKARANG</span>
                </button>
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
                        className="w-full h-auto block" 
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
                          <th className="border border-slate-900 px-1.5 py-3 text-[10px]" style={{ width: '15%', border: '1px solid #000' }}>Rekap Presensi KBM</th>
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
                            
                            {/* Absensi sub-table renderer reconstituted as a recap summary */}
                            <td className="border border-slate-900 px-2 py-2.5 text-center font-mono" style={{ border: '1px solid #000' }}>
                              {(() => {
                                const total = journalToPrint.attendance.length;
                                const h = journalToPrint.attendance.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length;
                                const s = journalToPrint.attendance.filter(a => a.status === 'Sakit').length;
                                const i = journalToPrint.attendance.filter(a => a.status === 'Izin').length;
                                const a = journalToPrint.attendance.filter(a => a.status === 'Alpa').length;

                                return (
                                  <div className="text-[8px] leading-tight flex flex-col items-center">
                                    <span className="font-bold">Total: {total}</span>
                                    <span className="text-emerald-750 font-bold">H: {h}</span>
                                    {s > 0 && <span className="text-amber-600 font-medium">S: {s}</span>}
                                    {i > 0 && <span className="text-blue-600 font-medium">I: {i}</span>}
                                    {a > 0 && <span className="text-rose-600 font-black">A: {a}</span>}
                                    {journalToPrint.attendance.filter(st => st.status === 'Sakit' || st.status === 'Izin' || st.status === 'Alpa').length > 0 && (
                                      <div className="text-[7.5px] leading-tight text-slate-500 mt-1 pb-0.5 font-sans border-t border-slate-200/40 pt-1 text-center font-normal">
                                        {journalToPrint.attendance
                                          .filter(st => st.status === 'Sakit' || st.status === 'Izin' || st.status === 'Alpa')
                                          .map(st => `${st.studentName} (${st.status.substring(0, 1)})`)
                                          .join(', ')
                                        }
                                      </div>
                                    )}
                                  </div>
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

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16 no-print select-none">
        {/* Menu 1 (Home - paling kiri) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('create');
            setFeedback(null);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'create' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Home size={20} className={activeSubTab === 'create' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'create' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Home</span>
        </button>

        {/* Menu 2 (Riwayat Jurnal) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('history');
            setFeedback(null);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'history' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <History size={20} className={activeSubTab === 'history' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'history' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Riwayat</span>
        </button>

        {/* Menu 3 (Notifikasi) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('notifications');
            setFeedback(null);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'notifications' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <div className="relative">
              <Bell size={20} className={activeSubTab === 'notifications' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
              {systemNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white leading-none">
                  {systemNotifications.length}
                </span>
              )}
            </div>
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'notifications' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Notifikasi</span>
        </button>

        {/* Menu 4 (Penilaian Merdeka) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('penilaian');
            setFeedback(null);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'penilaian' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <BookOpen size={20} className={activeSubTab === 'penilaian' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'penilaian' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Nilai</span>
        </button>

        {/* Menu 5 (Lainnya - 4 kotak, paling kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${(activeSubTab === 'profile' || showMoreMenu) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={(activeSubTab === 'profile' || showMoreMenu) ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${(activeSubTab === 'profile' || showMoreMenu) ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
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
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Guru Mapel</h4>
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
                    setActiveSubTab('profile');
                    setFeedback(null);
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeSubTab === 'profile'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-sky-50 rounded-xl text-sky-600 text-lg">👤</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Profil Saya</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Detail pendidik, verifikasi mata pelajaran, &amp; atur sandi</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('pkg');
                    setFeedback(null);
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeSubTab === 'pkg'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">🎖️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Evaluasi PKG</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Penilaian Kinerja Guru berkala dari Kepala Sekolah</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-rose-100 bg-rose-50/30 hover:bg-rose-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-rose-100 rounded-xl text-rose-600 text-lg">🚪</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-rose-800">Keluar Sesi</h5>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-tight">Akhiri sesi login guru mata pelajaran dengan aman</p>
                  </div>
                </button>
              </div>

              {/* Quick access to download Mobile Apps in the bottom sheet menu */}
              <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  📲 Unduh Aplikasi Mobile Resmi
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Gunakan aplikasi mobile resmi untuk kemudahan akses monitor seluruh kegiatan pengajaran &amp; pelaporan penilaian langsung lewat HP.
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
