import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Student, SubjectTeacher, HomeroomTeacher, MerdekaAssessment, SchoolIdentity } from '../types';
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
  ShieldCheck,
  Check,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface WakaKurikulumPanelProps {
  students: Student[];
  subjectTeachers: SubjectTeacher[];
  homerooms: HomeroomTeacher[];
  merdekaAssessments: MerdekaAssessment[];
  schoolIdentity?: SchoolIdentity;
  onRefreshData?: () => void;
}

export default function WakaKurikulumPanel({
  students,
  subjectTeachers,
  homerooms,
  merdekaAssessments,
  schoolIdentity,
  onRefreshData
}: WakaKurikulumPanelProps) {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'import_pts_pas' | 'rekap_nilai' | 'password'>('monitoring');

  // Filter States
  const [selectedSemester, setSelectedSemester] = useState<string>('Genap');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    schoolIdentity?.activeAcademicYear || '2025/2026'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
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

  // Available Classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.class) set.add(s.class.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [students]);

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

  // Monitoring Stats for Subject Teachers
  const teacherProgressList = useMemo(() => {
    return subjectTeachers.map(teacher => {
      const targetClass = teacher.className ? teacher.className.trim().toUpperCase() : 'SEMUA KELAS';
      
      let classStudentsList = students;
      if (targetClass !== 'SEMUA KELAS') {
        classStudentsList = students.filter(s => s.class && s.class.trim().toUpperCase() === targetClass);
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

  // Monitoring Stats for Wali Kelas (Kokurikuler)
  const homeroomProgressList = useMemo(() => {
    return homerooms.map(hr => {
      const clsName = hr.className ? hr.className.trim().toUpperCase() : '';
      const clsStudents = students.filter(s => s.class && s.class.trim().toUpperCase() === clsName);
      const totalStudents = clsStudents.length;

      // Count students with Kokurikuler score inputted (> 0)
      const kokuCount = clsStudents.filter(s => {
        return filteredAssessments.some(a => a.studentId === s.id && a.nilaiKokurikuler !== undefined && a.nilaiKokurikuler > 0);
      }).length;

      const percentage = totalStudents > 0 ? Math.round((kokuCount / totalStudents) * 100) : 0;

      return {
        id: hr.id,
        teacherName: hr.name,
        className: clsName,
        totalStudents,
        kokuCount,
        percentage
      };
    });
  }, [homerooms, students, filteredAssessments]);

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
    students.forEach(s => {
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
    let listStudents = students;
    if (selectedClassFilter !== 'all') {
      listStudents = students.filter(s => s.class && s.class.trim().toUpperCase() === selectedClassFilter);
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 text-left">
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

          <div className="flex flex-wrap gap-2.5 shrink-0">
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
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Filter Kelas</label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Semua Kelas ({students.length} Siswa)</option>
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
                <h3 className="text-2xl font-black text-slate-900 mt-1">{students.length}</h3>
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
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Progress Wali Kelas (Kokurikuler) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <GraduationCap size={18} className="text-violet-600" />
                <span>Progres Input Nilai Kokurikuler oleh Wali Kelas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai Kokurikuler yang diinput Wali Kelas terhubung otomatis ke seluruh Guru Mapel siswa
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {homeroomProgressList.map(hr => (
                <div key={hr.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-md font-black text-[10px] uppercase">
                        Kelas {hr.className}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{hr.teacherName}</h4>
                    </div>
                    <span className="text-xs font-black text-slate-700">{hr.percentage}%</span>
                  </div>

                  <div className="bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        hr.percentage === 100 ? 'bg-emerald-500' : hr.percentage > 0 ? 'bg-violet-600' : 'bg-slate-300'
                      }`}
                      style={{ width: `${hr.percentage}%` }}
                    />
                  </div>

                  <p className="text-[11px] font-semibold text-slate-500">
                    Nilai Kokurikuler Terisi: <strong className="text-slate-800">{hr.kokuCount}</strong> dari {hr.totalStudents} siswa
                  </p>
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

            <button
              onClick={handleExportFinalGradesExcel}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <FileSpreadsheet size={16} />
              <span>Export Excel Rapi (.xlsx)</span>
            </button>
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
    </div>
  );
}
