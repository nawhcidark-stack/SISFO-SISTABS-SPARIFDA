import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, Trash2, Search, Filter, Check, X, GraduationCap, ChevronRight, RefreshCw, UserPlus, Upload, Download, FileSpreadsheet, FileUp, AlertTriangle } from 'lucide-react';

interface StudentManagementProps {
  students: Student[];
  onCreateStudent: (data: { nis: string; name: string; class: string; email: string; phone: string; initialSavings: number; gender?: string }) => Promise<boolean>;
  onUpdateStudent: (id: string, data: { nis: string; name: string; class: string; email: string; phone: string; password?: string; gender?: string; mutationDate?: string; mutationReason?: string; mutationDestination?: string }) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onImportStudents: (
    list: Array<{
      nis: string;
      name: string;
      class: string;
      email: string;
      phone: string;
      initialSavings: number;
      gender?: string;
      password?: string;
    }>,
  ) => Promise<{ success: boolean; addedCount: number; updatedCount: number }>;
  onRefresh: () => void;
}

export default function StudentManagement({
  students,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportStudents,
  onRefresh
}: StudentManagementProps) {
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  // Interactive Form Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    class: '7-A',
    email: '',
    phone: '',
    initialSavings: '0',
    password: '',
    gender: 'Laki-laki'
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // CSV Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [previewImportData, setPreviewImportData] = useState<Array<{
    nis: string;
    name: string;
    class: string;
    email: string;
    phone: string;
    initialSavings: number;
    gender?: string;
    password?: string;
    isExisting: boolean;
  }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; added: number; updated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = "nis,nama,kelas,jenis_kelamin,email,telepon,password,saldo_awal\n";
    const rows = [
      "20261010,Budi Santoso,7-A,Laki-laki,budi@example.com,081234567812,budi123,100000",
      "20261011,Aisyah Putri,7-B,Perempuan,aisyah@example.com,081234567813,aisyah77,0",
      "20241001,Ahmad Fauzi,7-A,Laki-laki,ahmad.new_email@example.org,081234567890,fauzi321,0"
    ].join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_siswa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export all students to CSV format compatible with the import structure
  const handleExportStudentsCSV = () => {
    const headers = "nis,nama,kelas,jenis_kelamin,email,telepon,password,saldo_awal\r\n";
    
    const escapeCsv = (val: string | number) => {
      const str = String(val === undefined || val === null ? '' : val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(';')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = students.map(s => {
      return [
        escapeCsv(s.nis),
        escapeCsv(s.name),
        escapeCsv(s.class),
        escapeCsv(s.gender || 'Laki-laki'),
        escapeCsv(s.email),
        escapeCsv(s.phone),
        escapeCsv(s.password || s.nis), // Fallback to NIS as password if not yet custom set
        escapeCsv(s.savingsBalance || 0)
      ].join(',');
    }).join("\r\n");

    const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `data_kolektif_siswa_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File on upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setImportError('File kosong atau rusak.');
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setImportError('File CSV minimal harus berisi header & satu baris data.');
          return;
        }

        // Clean quotes helper
        const clean = (val: string) => (val || "").replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim();

        // Helper function to split a string by delimiter while ignoring delimiters inside double quotes
        const parseCSVLineRobust = (rawLine: string, delim: string): string[] => {
          const result: string[] = [];
          let currentVal = '';
          let insideQuotes = false;
          
          for (let idx = 0; idx < rawLine.length; idx++) {
            const char = rawLine[idx];
            
            if (char === '"') {
              if (idx + 1 < rawLine.length && rawLine[idx + 1] === '"') {
                currentVal += '"';
                idx++; // skip the escaped quote
              } else {
                insideQuotes = !insideQuotes;
              }
            } else if (char === delim && !insideQuotes) {
              result.push(currentVal);
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          result.push(currentVal);
          return result;
        };

        // Detect delimiter: comma (,) or semicolon (;)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = parseCSVLineRobust(firstLine, delimiter).map(h => clean(h).toLowerCase());

        // Find matches for column indexes
        const nisIdx = headers.findIndex(h => h.includes('nis'));
        const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
        const classIdx = headers.findIndex(h => h.includes('kelas') || h.includes('class'));
        const genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('jenis_kelamin') || h.includes('jk') || h.includes('kelamin') || h.includes('sex'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('telepon') || h.includes('hp'));
        const passwordIdx = headers.findIndex(h => h.includes('password') || h.includes('pass') || h.includes('sandi'));
        const savingsIdx = headers.findIndex(h => h.includes('saldo') || h.includes('savings') || h.includes('tabungan') || h.includes('awal'));

        if (nisIdx === -1 || nameIdx === -1 || classIdx === -1) {
          setImportError('Tag header CSV tidak sesuai! Pastikan CSV memiliki kolom "nis", "nama" (atau "name"), dan "kelas" (atau "class").');
          return;
        }

        const parsedRows: Array<{
          nis: string;
          name: string;
          class: string;
          email: string;
          phone: string;
          initialSavings: number;
          gender?: string;
          password?: string;
          isExisting: boolean;
        }> = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = parseCSVLineRobust(line, delimiter).map(c => clean(c));
          if (cols.length < 3) continue;

          const nisVal = cols[nisIdx];
          const nameVal = cols[nameIdx];
          const classVal = cols[classIdx];
          const genderVal = genderIdx !== -1 ? cols[genderIdx] : '';
          const emailVal = emailIdx !== -1 ? cols[emailIdx] : '';
          const phoneVal = phoneIdx !== -1 ? cols[phoneIdx] : '';
          const passwordVal = passwordIdx !== -1 ? cols[passwordIdx] : '';
          const initSalVal = savingsIdx !== -1 ? (Number(cols[savingsIdx]) || 0) : 0;

          if (!nisVal || !nameVal || !classVal) continue;

          // Check duplicate NIS
          const isExist = students.some(s => s.nis.toString().trim() === nisVal.toString().trim());

          // Normalize gender
          let resolvedGender = 'Laki-laki';
          if (genderVal) {
            const cleanGen = genderVal.trim().toLowerCase();
            if (cleanGen === 'p' || cleanGen.startsWith('perem') || cleanGen === 'female' || cleanGen === 'wita' || cleanGen === 'wanita') {
              resolvedGender = 'Perempuan';
            } else if (cleanGen === 'l' || cleanGen.startsWith('laki') || cleanGen === 'male' || cleanGen === 'pria') {
              resolvedGender = 'Laki-laki';
            } else {
              resolvedGender = genderVal; // fallback
            }
          }

          parsedRows.push({
            nis: nisVal.trim(),
            name: nameVal.trim(),
            class: classVal.trim(),
            email: emailVal.trim(),
            phone: phoneVal.trim(),
            initialSavings: initSalVal,
            gender: resolvedGender,
            password: passwordVal.trim(),
            isExisting: isExist
          });
        }

        if (parsedRows.length === 0) {
          setImportError('Tidak ada data siswa valid yang terbaca.');
          return;
        }

        setPreviewImportData(parsedRows);
      } catch (err) {
        console.error(err);
        setImportError('Gagal memproses file CSV.');
      }
    };

    reader.readAsText(file);
  };

  // Execute processing of import data
  const handleExecuteImport = async () => {
    if (previewImportData.length === 0) return;
    setIsImporting(true);
    setImportError('');
    try {
      const resp = await onImportStudents(previewImportData);
      if (resp.success) {
        setImportResult({ success: true, added: resp.addedCount, updated: resp.updatedCount });
        setPreviewImportData([]);
        onRefresh();
      } else {
        setImportError('Gagal melakukan import data ke server.');
      }
    } catch (err) {
      setImportError('Terjadi kesalahan koneksi saat import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetImportModal = () => {
    setImportError('');
    setPreviewImportData([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle inputs
  const resetForm = () => {
    setFormData({
      nis: '',
      name: '',
      class: '7-A',
      email: '',
      phone: '',
      initialSavings: '0',
      password: '',
      gender: 'Laki-laki'
    });
    setErrorMsg('');
  };

  // Class selection list (dynamically generated from active students data with sensible fallback defaults)
  const classes = React.useMemo(() => {
    const baseClasses = ['7-A', '7-B', '7-C', '8-A', '8-B', '8-C', '9-A', '9-B', '9-C'];
    const activeStudentClasses = students
      .map(s => s.class ? s.class.trim() : '')
      .filter(cls => {
        if (!cls) return false;
        const lower = cls.toLowerCase();
        return !(lower === 'lulus' || lower === 'lulusan' || lower === 'mutasi' || lower === 'mutasi keluar' || lower === 'all');
      });
    
    // Merge base classes and classes found in students to ensure nothing is missed
    const allUniqueClasses = Array.from(new Set([...baseClasses, ...activeStudentClasses]));
    
    // Sort classes naturally (e.g. 7-A, 7-B, 8-A, 9-A)
    return allUniqueClasses.sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!formData.nis.trim() || !formData.name.trim() || !formData.class.trim()) {
      setErrorMsg('NIS, Nama Lengkap, dan Kelas wajib diisi!');
      return;
    }

    setSaving(true);
    try {
      const success = await onCreateStudent({
        nis: formData.nis.trim(),
        name: formData.name.trim(),
        class: formData.class.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        initialSavings: Number(formData.initialSavings) || 0,
        gender: formData.gender
      });

      if (success) {
        setIsCreateOpen(false);
        resetForm();
        onRefresh();
      } else {
        setErrorMsg('Gagal menambahkan siswa. Mungkin NIS sudah terdaftar.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan atau server.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Update Submit
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setErrorMsg('');

    if (!formData.nis.trim() || !formData.name.trim() || !formData.class.trim()) {
      setErrorMsg('NIS, Nama Lengkap, dan Kelas wajib diisi!');
      return;
    }

    if (formData.password && formData.password.trim().length > 0 && formData.password.trim().length < 6) {
      setErrorMsg('Kata sandi baru harus minimal 6 karakter!');
      return;
    }

    setSaving(true);
    try {
      const success = await onUpdateStudent(editingStudent.id, {
        nis: formData.nis.trim(),
        name: formData.name.trim(),
        class: formData.class.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        password: formData.password && formData.password.trim().length >= 6 ? formData.password.trim() : undefined
      });

      if (success) {
        setEditingStudent(null);
        resetForm();
        onRefresh();
      } else {
        setErrorMsg('Gagal memperbarui data siswa. NIS mungkin bertabrakan.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan atau server.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete CONFIRMED
  const handleDeleteSubmit = async () => {
    if (!deletingStudent) return;
    setSaving(true);
    try {
      const success = await onDeleteStudent(deletingStudent.id);
      if (success) {
        setDeletingStudent(null);
        onRefresh();
      } else {
        alert('Gagal menghapus siswa. Silakan hubungi pengelola IT.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nis: student.nis,
      name: student.name,
      class: student.class,
      email: student.email || '',
      phone: student.phone || '',
      initialSavings: '0', // Not editable
      password: '',
      gender: student.gender || 'Laki-laki'
    });
  };

  // Filter students list
  const filteredStudents = students.filter(student => {
    if (student.class && (
      student.class.toLowerCase() === 'lulus' || 
      student.class.toLowerCase() === 'lulusan' || 
      student.class.toLowerCase() === 'mutasi' || 
      student.class.toLowerCase() === 'mutasi keluar'
    )) {
      return false; // exclude alumni and mutated students from general student management list
    }
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.nis.includes(searchQuery);
    
    const matchesClass = classFilter === 'ALL' || student.class === classFilter;
    
    return matchesSearch && matchesClass;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Statistics Calculations
  const activeStudentsList = students.filter(student => {
    return student.class && !(
      student.class.toLowerCase() === 'lulus' || 
      student.class.toLowerCase() === 'lulusan' || 
      student.class.toLowerCase() === 'mutasi' || 
      student.class.toLowerCase() === 'mutasi keluar'
    );
  });

  const totalActive = activeStudentsList.length;

  let maleCount = 0;
  let femaleCount = 0;
  activeStudentsList.forEach(s => {
    const g = (s.gender || 'Laki-laki').trim().toLowerCase();
    if (g.startsWith('p') || g === 'perempuan') {
      femaleCount++;
    } else {
      maleCount++;
    }
  });

  const classCounts = classes.reduce((acc, cls) => {
    acc[cls] = activeStudentsList.filter(s => s.class === cls).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div id="student-crud-root" className="flex flex-col gap-5 text-slate-800">
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 ms-1">
            <GraduationCap className="text-emerald-800" size={17} />
            Pengaturan & CRUD Manajemen Siswa
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
            Tambahkan murid baru, perbarui data profil wali murid, atau lakukan penghapusan siswa beserta riwayat pembukuannya secara aman.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Unduh Template CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span>Unduh Templat</span>
          </button>

          <button
            type="button"
            onClick={handleExportStudentsCSV}
            className="px-3 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Ekspor Seluruh Siswa ke Excel (CSV)"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleResetImportModal();
              setIsImportOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Import Kolektif dari CSV File"
          >
            <FileSpreadsheet size={14} className="text-indigo-600" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            id="btn-add-student-trigger"
            className="px-4 py-2 bg-emerald-850 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wide"
          >
            <UserPlus size={14} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-850 shrink-0">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 leading-none">Total Siswa Aktif</p>
              <h4 className="text-xl font-bold text-slate-800 mt-1 leading-none">{totalActive} <span className="text-[11px] font-normal text-slate-500">Siswa</span></h4>
            </div>
          </div>
        </div>

        {/* Card 2: Laki-laki */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0 border border-indigo-100">
              L
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 leading-none">Siswa Laki-laki (L)</p>
              <h4 className="text-xl font-bold text-slate-800 mt-1 leading-none">{maleCount} <span className="text-[11px] font-normal text-slate-500">Siswa</span></h4>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {totalActive > 0 ? ((maleCount / totalActive) * 100).toFixed(0) : 0}%
          </span>
        </div>

        {/* Card 3: Perempuan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-black text-xs shrink-0 border border-rose-100">
              P
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 leading-none">Siswa Perempuan (P)</p>
              <h4 className="text-xl font-bold text-slate-800 mt-1 leading-none">{femaleCount} <span className="text-[11px] font-normal text-slate-500">Siswa</span></h4>
            </div>
          </div>
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            {totalActive > 0 ? ((femaleCount / totalActive) * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>

      {/* Rincian Per Kelas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Distribusi Jumlah Siswa per-Kelas</h4>
          <span className="text-[9px] bg-slate-100 text-slate-550 px-2 py-0.5 rounded font-extrabold tracking-wider uppercase">Tahun Ajaran Aktif</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
          {classes.map((cls) => {
            const count = classCounts[cls] || 0;
            const classMale = activeStudentsList.filter(s => s.class === cls && (!s.gender || s.gender.toLowerCase().startsWith('l') || s.gender === 'Laki-laki')).length;
            const classFemale = activeStudentsList.filter(s => s.class === cls && s.gender && (s.gender.toLowerCase().startsWith('p') || s.gender === 'Perempuan')).length;
            return (
              <div key={cls} className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-150 hover:border-slate-305 transition-all text-center flex flex-col justify-between min-h-[64px]">
                <p className="text-[11px] font-extrabold text-slate-700">Kelas {cls}</p>
                <div className="mt-1">
                  <span className="text-sm font-black text-slate-800 block leading-tight">{count}</span>
                  <div className="flex items-center justify-center gap-1 text-[8.5px] text-slate-405 font-bold mt-0.5 leading-none">
                    <span className="text-indigo-600 font-extrabold">L:{classMale}</span>
                    <span>&bull;</span>
                    <span className="text-rose-500 font-extrabold">P:{classFemale}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roster list controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filter bars */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-grow">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              id="student-crud-search"
              placeholder="Cari berdasarkan Nama atau NIS siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-slate-850 focus:ring-1 focus:ring-slate-850 outline-none transition-all"
            />
          </div>

          {/* Class Filter dropdown */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <span className="text-slate-400">
              <Filter size={13} />
            </span>
            <select
              id="student-crud-filter-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-850 appearance-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Table */}
        <div className="overflow-x-auto text-[11px] sm:text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-150">
                <th className="px-5 py-3">NIS</th>
                <th className="px-5 py-3">Nama Siswa</th>
                <th className="px-5 py-3">L/P</th>
                <th className="px-5 py-3">Kelas</th>
                <th className="px-5 py-3">Email Wali</th>
                <th className="px-5 py-3">Telepon</th>
                <th className="px-5 py-3 text-right">Saldo Tabungan</th>
                <th className="px-5 py-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{std.nis}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{std.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${std.gender === 'Laki-laki' ? 'bg-indigo-50 text-indigo-705 border border-indigo-100' : std.gender === 'Perempuan' ? 'bg-rose-50 text-rose-705 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                        {std.gender === 'Laki-laki' ? 'L' : std.gender === 'Perempuan' ? 'P' : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold">
                        {std.class}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{std.email || '-'}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{std.phone || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-800">
                      Rp {std.savingsBalance.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => startEdit(std)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-150 rounded transition-colors cursor-pointer"
                          title="Sunting data siswa"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => setDeletingStudent(std)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-150 rounded transition-colors cursor-pointer"
                          title="Hapus siswa dari sistem"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 font-medium">
                    Tidak ada siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footnote count */}
        <div className="p-3 bg-slate-50 border-t border-slate-150 flex justify-between items-center text-[10px] text-slate-400 font-bold">
          <span>MENAMPILKAN {filteredStudents.length} DARI {students.length} SISWA AKTIF</span>
          <span className="uppercase tracking-wider">Sistem Akademik Terintegrasi 🇮🇩</span>
        </div>
      </div>

      {/* CREATE STUDENT FORM DIALOG MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-emerald-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-emerald-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Tambah Siswa & Wali Baru</h4>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg hover:bg-emerald-800 text-emerald-100 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-4 text-xs">
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-250 text-rose-700 rounded-lg font-bold">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">NIS (Nomor Induk Siswa) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 20241005"
                      value={formData.nis}
                      onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Kelas *</label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white"
                    >
                      {classes.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Nama Lengkap Murid *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Akhyar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Jenis Kelamin *</label>
                    <select
                      value={formData.gender || 'Laki-laki'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white font-sans"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Email Wali Murid</label>
                    <input
                      type="email"
                      placeholder="wali@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Nomor Telepon/WA</label>
                    <input
                      type="text"
                      placeholder="0812xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-150 flex flex-col gap-1.5 mt-1">
                  <label className="font-bold text-emerald-800 uppercase text-[9px] tracking-wide">Saldo Tabungan Masuk Sekolah (Opsional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-800">Rp</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.initialSavings}
                      onChange={(e) => setFormData({ ...formData, initialSavings: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-700/85 italic leading-snug">
                    *Uang setoran awal tabungan siswa akan otomatis tercatat sebagai transaksi &quot;Setoran Awal&quot; di teller sekolah.
                  </p>
                </div>

                <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-150 mt-2">
                  <span className="text-[10px] text-slate-400 italic">
                    *Murid otomatis dibebani tagihan SPP bulanan.
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-3.5 py-2 border border-slate-200 rounded-lg font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : 'Registrasikan'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT STUDENT PROFILE DIALOG MODAL */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Edit size={16} className="text-yellow-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Sunting Profil Murid & Wali</h4>
                </div>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleUpdateSubmit} className="p-5 flex flex-col gap-4 text-xs">
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-250 text-rose-700 rounded-lg font-bold">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">NIS (Nomor Induk Siswa) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 20241005"
                      value={formData.nis}
                      onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Kelas *</label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white"
                    >
                      {classes.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Nama Lengkap Murid *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Akhyar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Jenis Kelamin *</label>
                    <select
                      value={formData.gender || 'Laki-laki'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white font-sans"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Email Wali Murid</label>
                    <input
                      type="email"
                      placeholder="wali@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">Nomor Telepon/WA</label>
                    <input
                      type="text"
                      placeholder="0812xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 bg-amber-50/60 p-3 rounded-lg border border-amber-200/80 mt-1">
                  <label className="font-extrabold text-amber-800 uppercase text-[9px] tracking-wider">Atur Ulang Sandi Akun Wali/Siswa (Opsional)</label>
                  <input
                    type="password"
                    placeholder="Masukkan sandi baru (kosongkan jika tidak ingin diubah)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-700/85 italic leading-snug font-medium">
                    *Kosongkan untuk tetap memakai sandi lama yang sudah aktif. Isi minimal 6 karakter untuk memperbarui sandi login portal.
                  </p>
                </div>

                <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-150 mt-2">
                  <span className="text-[10px] text-slate-450 italic">
                    *Penyuntingan profil langsung tercermin di portal wali murid.
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingStudent(null)}
                      className="px-3.5 py-2 border border-slate-200 rounded-lg font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE WARNING CONFIRM DIALOG MODAL */}
      <AnimatePresence>
        {deletingStudent && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="bg-rose-900 text-white p-4 flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  ⚠️ Tindakan Kritis: Hapus Siswa
                </h4>
                <button
                  onClick={() => setDeletingStudent(null)}
                  className="p-1 rounded-lg hover:bg-rose-850 text-rose-100 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4 text-xs font-sans">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 leading-relaxed">
                  <p className="font-bold mb-1">Apakah Anda benar-benar yakin ingin menghapus siswa ini?</p>
                  <ul className="list-disc pl-4 mt-1.5 flex flex-col gap-1 font-semibold text-[11px] text-rose-800">
                    <li>Nama Siswa: <span className="font-bold underline">{deletingStudent.name}</span></li>
                    <li>NIS: {deletingStudent.nis}</li>
                    <li>Seluruh tagihan bulanan SPP (Lunas/Unpaid) akan dihapus.</li>
                    <li>Seluruh riwayat mutasi tabungan/rekening akan dihanguskan.</li>
                  </ul>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  *Tindakan ini permanen dan tidak dapat diubah kembali. SSE akan memberi tahu wali murid bahwa akun telah dibekukan / dihapus.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setDeletingStudent(null)}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg cursor-pointer text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDeleteSubmit}
                    className="px-5 py-1.5 bg-rose-700 hover:bg-rose-850 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    {saving ? 'Menghapus...' : 'Ya, Hapus Permanen 🚨'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV IMPORT DIALOG MODAL */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-indigo-950 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-indigo-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Kolektif Import Siswa via CSV</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="p-1 rounded-lg hover:bg-indigo-900 text-indigo-100 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs font-sans text-slate-800">
                {/* Intro guide */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 leading-normal">
                  <p className="font-bold text-slate-800 mb-1">Panduan Pengaturan Format File CSV:</p>
                  <p className="mb-2 text-[11px] leading-relaxed">
                    Gunakan file Excel atau CSV standar dengan tanda pemisah koma (,) atau titik-koma (;). Header kolom baris pertama harus berisi kolom berikut:
                  </p>
                  <code className="block bg-slate-100 p-2 rounded font-mono font-bold text-indigo-900 text-[10px] break-all border border-slate-200 shadow-inner">
                    nis,nama,kelas,jenis_kelamin,email,telepon,password,saldo_awal
                  </code>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[10px] font-bold uppercase tracking-wide">
                    <button type="button" onClick={handleDownloadTemplate} className="hover:underline flex items-center gap-1 text-indigo-800 cursor-pointer">
                      <Download size={11} /> Unduh Contoh File CSV
                    </button>
                    <span className="text-slate-300 hidden sm:inline">|</span>
                    <button type="button" onClick={handleExportStudentsCSV} className="hover:underline flex items-center gap-1 text-emerald-800 hover:text-emerald-950 cursor-pointer">
                      <FileSpreadsheet size={11} /> Ekspor Data Siswa Aktif (Excel)
                    </button>
                  </div>
                </div>

                {importError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-250 text-rose-700 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle size={14} /> {importError}
                  </div>
                )}

                {importResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-950 rounded-lg">
                    <p className="font-bold text-emerald-800 text-sm mb-1">🎉 Import Selesai Berhasil!</p>
                    <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[11px] font-bold">
                      <li className="text-emerald-800">Siswa Baru Ditambahkan: {importResult.added}</li>
                      <li className="text-emerald-800">Siswa Lama Diperbarui (NIS Sama): {importResult.updated}</li>
                    </ul>
                    <p className="text-[10px] mt-2.5 text-slate-500 italic leading-snug">
                      *Daftar tagihan SPP bulanan otomatis disiapkan untuk siswa baru. Mutasi tabungan juga tercatat jika memiliki saldo masuk awal.
                    </p>
                  </div>
                )}

                {/* File picker */}
                {!importResult && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-550 uppercase text-[9px] tracking-wide">Pilih File CSV (*.csv) *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all text-xs"
                      >
                        <FileUp size={14} /> Seleksi Berkas CSV
                      </button>
                      <span className="text-slate-500 text-[11px] font-semibold truncate max-w-xs">
                        {fileInputRef.current?.files?.[0]?.name || 'Belum ada file terpilih'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Data Preview */}
                {previewImportData.length > 0 && !importResult && (
                  <div className="flex flex-col gap-2 border-t border-slate-150 pt-3">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700">Ditemukan {previewImportData.length} Baris Data:</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded">
                          Baru: {previewImportData.filter(p => !p.isExisting).length}
                        </span>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded">
                          Update: {previewImportData.filter(p => p.isExisting).length}
                        </span>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-250 sticky top-0">
                            <th className="px-3 py-2">NIS</th>
                            <th className="px-3 py-2">Nama</th>
                            <th className="px-3 py-2">Kelas</th>
                            <th className="px-3 py-2">JK</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Sandi/Pass</th>
                            <th className="px-3 py-2 text-right">Saldo Awal</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 bg-white">
                          {previewImportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{row.nis}</td>
                              <td className="px-3 py-2 font-semibold text-slate-900">{row.name}</td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold">{row.class}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.gender === 'Laki-laki' ? 'bg-indigo-50 text-indigo-705 border border-indigo-100' : row.gender === 'Perempuan' ? 'bg-rose-50 text-rose-705 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                  {row.gender === 'Laki-laki' ? 'L' : row.gender === 'Perempuan' ? 'P' : row.gender || '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{row.email || '-'}</td>
                              <td className="px-3 py-2 font-mono text-slate-600 font-medium">{row.password || '-'}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">
                                {row.initialSavings > 0 ? `Rp ${row.initialSavings.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {row.isExisting ? (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-850 border border-yellow-200 rounded font-bold text-[9px] uppercase tracking-wide">
                                    Update
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-850 border border-emerald-200 rounded font-bold text-[9px] uppercase tracking-wide">
                                    Baru
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-150 mt-1">
                  <span className="text-[10px] text-slate-400 italic">
                    *Sistem secara otomatis menyesuaikan status berdasarkan keunikan NIS siswa.
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetImportModal();
                        setIsImportOpen(false);
                      }}
                      className="px-3.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                    >
                      {importResult ? 'Tutup & Selesai' : 'Batal'}
                    </button>
                    {previewImportData.length > 0 && !importResult && (
                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={handleExecuteImport}
                        className="px-5 py-1.5 bg-indigo-700 hover:bg-indigo-850 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50 font-sans"
                      >
                        {isImporting ? 'Mengimpor...' : `Proses Impor ${previewImportData.length} Siswa 🚀`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
