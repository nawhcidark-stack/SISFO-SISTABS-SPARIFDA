import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, SubjectTeacher, HomeroomTeacher, MerdekaAssessment, SchoolIdentity, ClassSchedule } from '../types';
import ScheduleView from './ScheduleView';
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
  ClipboardCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface WakaKurikulumPanelProps {
  students: Student[];
  subjectTeachers: SubjectTeacher[];
  homerooms: HomeroomTeacher[];
  merdekaAssessments: MerdekaAssessment[];
  classSchedules?: ClassSchedule[];
  schoolIdentity?: SchoolIdentity;
  onRefreshData?: () => void;
}

export default function WakaKurikulumPanel({
  students,
  subjectTeachers,
  homerooms,
  merdekaAssessments,
  classSchedules = [],
  schoolIdentity,
  onRefreshData
}: WakaKurikulumPanelProps) {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'schedules' | 'import_pts_pas' | 'rekap_nilai' | 'detail_nilai' | 'password'>('monitoring');
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Detail Nilai Guru & Wali Kelas States
  const [detailRoleFilter, setDetailRoleFilter] = useState<'all' | 'subject_teacher' | 'homeroom'>('all');
  const [detailTeacherFilter, setDetailTeacherFilter] = useState<string>('all');
  const [detailSubjectFilter, setDetailSubjectFilter] = useState<string>('all');
  const [detailClassFilter, setDetailClassFilter] = useState<string>('all');
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Selected Student for Modal View
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filter States
  const [selectedSemester, setSelectedSemester] = useState<string>(
    schoolIdentity?.activeSemester || 'Genap'
  );
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    schoolIdentity?.activeAcademicYear || '2025/2026'
  );

  React.useEffect(() => {
    if (schoolIdentity?.activeAcademicYear) {
      setSelectedAcademicYear(schoolIdentity.activeAcademicYear);
    }
    if (schoolIdentity?.activeSemester) {
      setSelectedSemester(schoolIdentity.activeSemester);
    }
  }, [schoolIdentity?.activeAcademicYear, schoolIdentity?.activeSemester]);

  const academicYearOptions = useMemo(() => {
    const list = [
      schoolIdentity?.activeAcademicYear,
      '2025/2026',
      '2024/2025',
      '2023/2024'
    ].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [schoolIdentity?.activeAcademicYear]);
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

  // Available Classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach(s => {
      if (s.class) set.add(s.class.trim().toUpperCase());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [activeStudents]);

  // Distinct Subjects
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    subjectTeachers.forEach(t => {
      if (t.subject) set.add(t.subject.trim());
    });
    merdekaAssessments.forEach(a => {
      if (a.subject) set.add(a.subject.trim());
    });
    return Array.from(set).sort();
  }, [subjectTeachers, merdekaAssessments]);

  // Assessment matching current sem & year
  const filteredAssessments = useMemo(() => {
    return merdekaAssessments.filter(
      a => a.semester === selectedSemester && a.academicYear === selectedAcademicYear
    );
  }, [merdekaAssessments, selectedSemester, selectedAcademicYear]);

  // List of all distinct teacher names
  const allTeacherNames = useMemo(() => {
    const list: string[] = [];
    subjectTeachers.forEach(t => { if (t.name) list.push(t.name.trim()); });
    homerooms.forEach(h => { if (h.name) list.push(h.name.trim()); });
    merdekaAssessments.forEach(a => { if (a.teacherName) list.push(a.teacherName.trim()); });
    return Array.from(new Set(list)).sort();
  }, [subjectTeachers, homerooms, merdekaAssessments]);

  // Detailed Filtered Assessments for Waka Kurikulum Inspection
  const detailedAssessmentsList = useMemo(() => {
    return filteredAssessments.filter(a => {
      // Role filter
      if (detailRoleFilter === 'subject_teacher') {
        const hasTp = (a.nilaiRataTp && a.nilaiRataTp > 0) || a.tp1Uh || a.tp1Tugas1;
        if (!hasTp) return false;
      } else if (detailRoleFilter === 'homeroom') {
        const hasKoku = a.nilaiKokurikuler && a.nilaiKokurikuler > 0;
        if (!hasKoku) return false;
      }

      // Teacher filter
      if (detailTeacherFilter !== 'all') {
        const isMatchTeacher = a.teacherName?.toLowerCase() === detailTeacherFilter.toLowerCase();
        const studentCls = a.className?.trim().toUpperCase();
        const hrTeacher = homerooms.find(h => h.className && h.className.trim().toUpperCase() === studentCls);
        const isMatchHomeroom = hrTeacher && hrTeacher.name.toLowerCase() === detailTeacherFilter.toLowerCase();
        if (!isMatchTeacher && !isMatchHomeroom) return false;
      }

      // Subject filter
      if (detailSubjectFilter !== 'all') {
        if (a.subject?.toLowerCase() !== detailSubjectFilter.toLowerCase()) return false;
      }

      // Class filter
      if (detailClassFilter !== 'all') {
        if (a.className?.trim().toUpperCase() !== detailClassFilter.trim().toUpperCase()) return false;
      }

      // Status filter
      const isComplete = (a.nilaiRataTp && a.nilaiRataTp > 0) && (a.nilaiKokurikuler && a.nilaiKokurikuler > 0);
      if (detailStatusFilter === 'complete' && !isComplete) return false;
      if (detailStatusFilter === 'incomplete' && isComplete) return false;

      // Text Search
      if (detailSearchQuery.trim()) {
        const q = detailSearchQuery.toLowerCase();
        const nameMatch = a.studentName?.toLowerCase().includes(q);
        const idMatch = a.studentId?.toLowerCase().includes(q);
        const subjMatch = a.subject?.toLowerCase().includes(q);
        const teacherMatch = a.teacherName?.toLowerCase().includes(q);
        const classMatch = a.className?.toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !subjMatch && !teacherMatch && !classMatch) return false;
      }

      return true;
    });
  }, [filteredAssessments, detailRoleFilter, detailTeacherFilter, detailSubjectFilter, detailClassFilter, detailStatusFilter, detailSearchQuery, homerooms]);

  // Monitoring Stats for Subject Teachers
  const teacherProgressList = useMemo(() => {
    return subjectTeachers.map(teacher => {
      const targetClass = teacher.className ? teacher.className.trim().toUpperCase() : 'SEMUA KELAS';
      
      let classStudentsList = activeStudents;
      if (targetClass !== 'SEMUA KELAS') {
        classStudentsList = activeStudents.filter(s => s.class && s.class.trim().toUpperCase() === targetClass);
      }

      const totalStudentsInClass = classStudentsList.length;

      // Count students with assessment completed for this teacher's subject
      const assessedCount = classStudentsList.filter(s => {
        return filteredAssessments.some(a => 
          a.studentId === s.id && 
          a.subject.toLowerCase() === teacher.subject.toLowerCase() &&
          a.nilaiRataTp !== undefined && a.nilaiRataTp > 0
        );
      }).length;

      const percentage = totalStudentsInClass > 0 ? Math.round((assessedCount / totalStudentsInClass) * 100) : 0;

      let status: 'selesai' | 'sebagian' | 'belum' = 'belum';
      if (percentage === 100) status = 'selesai';
      else if (percentage > 0) status = 'sebagian';

      return {
        id: teacher.id,
        teacherName: teacher.name,
        subject: teacher.subject,
        className: targetClass,
        totalStudents: totalStudentsInClass,
        assessedCount,
        percentage,
        status
      };
    });
  }, [subjectTeachers, students, filteredAssessments]);

  // Monitoring Stats for Wali Kelas (Kokurikuler & Penilaian Lintas Kelas)
  const homeroomProgressList = useMemo(() => {
    const allClassesSet = new Set<string>();
    homerooms.forEach(hr => {
      if (hr.className) allClassesSet.add(hr.className.trim().toUpperCase());
    });
    availableClasses.forEach(cls => {
      if (cls) allClassesSet.add(cls.trim().toUpperCase());
    });

    return Array.from(allClassesSet).sort().map(clsName => {
      const primaryHr = homerooms.find(hr => hr.className && hr.className.trim().toUpperCase() === clsName);
      const clsStudents = activeStudents.filter(s => s.class && s.class.trim().toUpperCase() === clsName);
      const totalStudents = clsStudents.length;

      // Count students with Kokurikuler score inputted (> 0)
      const kokuCount = clsStudents.filter(s => {
        return filteredAssessments.some(a => a.studentId === s.id && a.nilaiKokurikuler !== undefined && a.nilaiKokurikuler > 0);
      }).length;

      // Count distinct subjects evaluated for this class
      const evaluatedSubjects = new Set<string>();
      const assessedStudentIds = new Set<string>();
      filteredAssessments.forEach(a => {
        if (clsStudents.some(s => s.id === a.studentId)) {
          if ((a.nilaiRataTp && a.nilaiRataTp > 0) || (a.nilaiKokurikuler && a.nilaiKokurikuler > 0)) {
            assessedStudentIds.add(a.studentId);
            if (a.subject) evaluatedSubjects.add(a.subject);
          }
        }
      });

      const percentage = totalStudents > 0 ? Math.round((kokuCount / totalStudents) * 100) : 0;
      const totalAssessedPercentage = totalStudents > 0 ? Math.round((assessedStudentIds.size / totalStudents) * 100) : 0;

      return {
        id: primaryHr ? primaryHr.id : `cls-${clsName}`,
        teacherName: primaryHr ? primaryHr.name : 'Wali Kelas Lintas Kelas / Pengampu',
        className: clsName,
        totalStudents,
        kokuCount,
        percentage,
        totalAssessedPercentage,
        evaluatedSubjectsCount: evaluatedSubjects.size,
        hasPrimaryTeacher: !!primaryHr,
        isCrossClass: !primaryHr || (primaryHr && evaluatedSubjects.size > 0)
      };
    });
  }, [homerooms, availableClasses, students, filteredAssessments]);

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
              onClick={() => onRefreshData && onRefreshData()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Muat Ulang Data</span>
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
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tahun Ajaran</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            >
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
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
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
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Tersimpan di Sistem</p>
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
                        <td className="py-3 px-4 font-bold text-slate-900">{t.teacherName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-bold text-slate-800 text-[11px]">
                            {t.subject}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{t.className}</td>
                        <td className="py-3 px-4 text-center font-bold">
                          {t.assessedCount} / {t.totalStudents} Siswa
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
                              setDetailTeacherFilter(t.teacherName);
                              setDetailSubjectFilter(t.subject);
                              if (t.className !== 'SEMUA KELAS') setDetailClassFilter(t.className);
                              setDetailRoleFilter('subject_teacher');
                              setActiveTab('detail_nilai');
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 mx-auto cursor-pointer"
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
                      <span className="text-xs font-black text-slate-700 shrink-0">{hr.percentage}%</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Progres Kokurikuler</span>
                        <span>{hr.kokuCount}/{hr.totalStudents} Siswa</span>
                      </div>
                      <div className="bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            hr.percentage === 100 ? 'bg-emerald-500' : hr.percentage > 0 ? 'bg-violet-600' : 'bg-slate-300'
                          }`}
                          style={{ width: `${hr.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10.5px] font-semibold text-slate-500">
                      <span>Progres Penilaian Siswa:</span>
                      <strong className="text-indigo-700">{hr.totalAssessedPercentage}% Terisi</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDetailClassFilter(hr.className);
                        if (hr.teacherName && hr.teacherName !== 'Wali Kelas Lintas Kelas / Pengampu') {
                          setDetailTeacherFilter(hr.teacherName);
                        } else {
                          setDetailTeacherFilter('all');
                        }
                        setDetailRoleFilter('all');
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
                Formula resmi: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">NILAI AKHIR = ((Rata2 TP × 2) + Kokurikuler + PTS + PAS) / 5</code>
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
                    .filter(a => selectedClassFilter === 'all' || (a.className && a.className.trim().toUpperCase() === selectedClassFilter))
                    .map(a => {
                      const finalVal = a.nilaiAkhirMapel ?? a.nilaiRapor ?? 0;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{a.studentId}</td>
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

              {/* Filter Nama Guru */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Guru / Wali</label>
                <select
                  value={detailTeacherFilter}
                  onChange={(e) => setDetailTeacherFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Semua Guru / Wali</option>
                  {allTeacherNames.map(name => (
                    <option key={name} value={name}>{name}</option>
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
                      Tidak ada data penilaian yang cocok dengan kriteria filter Anda.
                    </td>
                  </tr>
                ) : (
                  detailedAssessmentsList.map((a, idx) => {
                    const finalVal = a.nilaiAkhirMapel ?? a.nilaiRapor ?? 0;
                    const isExpanded = expandedRowId === a.id;
                    const matchedStudent = students.find(s => s.id === a.studentId || s.nis === a.studentId);
                    const hrTeacher = homerooms.find(h => h.className && h.className.trim().toUpperCase() === a.className?.trim().toUpperCase());

                    return (
                      <React.Fragment key={a.id || idx}>
                        <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-slate-500 text-[10px]">#{a.studentId}</span>
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
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{a.teacherName || 'Guru Mapel'}</span>
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
                                      <p>Tugas 1: <strong className="text-slate-900">{a.tp1Tugas1 ?? '-'}</strong></p>
                                      <p>Tugas 2: <strong className="text-slate-900">{a.tp1Tugas2 ?? '-'}</strong></p>
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
                                      <p>Tugas 1: <strong className="text-slate-900">{a.tp2Tugas1 ?? '-'}</strong></p>
                                      <p>Tugas 2: <strong className="text-slate-900">{a.tp2Tugas2 ?? '-'}</strong></p>
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
                                      <p>Tugas 1: <strong className="text-slate-900">{a.tp3Tugas1 ?? '-'}</strong></p>
                                      <p>Tugas 2: <strong className="text-slate-900">{a.tp3Tugas2 ?? '-'}</strong></p>
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
                                      <p>Tugas 1: <strong className="text-slate-900">{a.tp4Tugas1 ?? '-'}</strong></p>
                                      <p>Tugas 2: <strong className="text-slate-900">{a.tp4Tugas2 ?? '-'}</strong></p>
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
                                      ((Rata2 TP: {a.nilaiRataTp || 0} × 2) + Kokurikuler: {a.nilaiKokurikuler || 0} + PTS: {a.nilaiPts || 0} + PAS: {a.nilaiPas || 0}) / 5
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
