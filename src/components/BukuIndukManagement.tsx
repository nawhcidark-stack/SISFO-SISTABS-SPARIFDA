import React, { useState, useRef, useMemo } from 'react';
import { Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Search, FileUp, FileDown, Edit, X, Check, Filter, 
  Users, CheckSquare, Square, AlertCircle, RefreshCw, UserCheck, 
  Trash2, ShieldAlert
} from 'lucide-react';

interface BukuIndukManagementProps {
  students: Student[];
  onUpdateStudent: (id: string, data: any) => Promise<boolean>;
  onRefresh: () => void;
}

export default function BukuIndukManagement({
  students,
  onUpdateStudent,
  onRefresh
}: BukuIndukManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Tabs inside edit/view modal: 'siswa' | 'ortu_ayah' | 'ortu_ibu' | 'wali'
  const [activeFormTab, setActiveFormTab] = useState<'siswa' | 'ayah' | 'ibu' | 'wali'>('siswa');
  
  // Local state for editing form
  const [formData, setFormData] = useState<Partial<Student>>({});
  
  // Import states
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; added: number; updated: number } | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // List of unique classes for class filter
  const classesList = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.class))).filter(Boolean);
    return ['ALL', ...list.sort()];
  }, [students]);

  // Handle opening of edit modal
  const handleOpenEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ ...student });
    setActiveFormTab('siswa');
    setIsEditModalOpen(true);
  };

  // Helper to calculate how many fields are filled for a student’s Buku Induk profile (Completeness Score)
  const calculateCompleteness = (student: Student) => {
    const fieldsToTrack: (keyof Student)[] = [
      'nis', 'nisn', 'name', 'nickname', 'nik', 'gender', 'birthPlace', 'birthDate', 
      'kkNumber', 'birthCertNumber', 'phone', 'address', 'livingWith', 
      'childOrder', 'siblingsCount', 'stepSiblingsCount', 'class',
      'fatherName', 'fatherNik', 'fatherBirthPlace', 'fatherBirthDate', 'fatherEducation', 'fatherOccupation', 'fatherIncome', 'fatherAddress', 'fatherPhone', 'fatherStatus',
      'motherName', 'motherNik', 'motherBirthPlace', 'motherBirthDate', 'motherEducation', 'motherOccupation', 'motherIncome', 'motherAddress', 'motherPhone', 'motherStatus'
    ];
    
    // Guardian details checked conditionally
    if (!student.guardianIsSameAsFather && student.guardianName) {
      fieldsToTrack.push(
        'guardianName', 'guardianNik', 'guardianBirthPlace', 'guardianBirthDate', 
        'guardianEducation', 'guardianOccupation', 'guardianIncome', 'guardianAddress', 'guardianPhone', 'guardianStatus'
      );
    }

    const filled = fieldsToTrack.filter(f => {
      const val = student[f];
      return val !== undefined && val !== null && String(val).trim() !== '';
    }).length;

    const total = fieldsToTrack.length;
    const pct = Math.round((filled / total) * 100);
    return { filled, total, pct };
  };

  // Filter students based on search and class selection
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.nisn && s.nisn.includes(searchTerm)) ||
        (s.nik && s.nik.includes(searchTerm)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.motherName && s.motherName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchClass = selectedClass === 'ALL' || s.class === selectedClass;
      return matchSearch && matchClass;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm, selectedClass]);

  // Handle changes in edit fields
  const handleInputChange = (field: keyof Student, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-copy Father's data to Guardian if "Wali Sama Dengan Ayah" is checked
      if (field === 'guardianIsSameAsFather' && value === true) {
        updated.guardianName = prev.fatherName || '';
        updated.guardianNik = prev.fatherNik || '';
        updated.guardianBirthPlace = prev.fatherBirthPlace || '';
        updated.guardianBirthDate = prev.fatherBirthDate || '';
        updated.guardianEducation = prev.fatherEducation || '';
        updated.guardianOccupation = prev.fatherOccupation || '';
        updated.guardianIncome = prev.fatherIncome || '';
        updated.guardianAddress = prev.fatherAddress || '';
        updated.guardianPhone = prev.fatherPhone || '';
        updated.guardianStatus = prev.fatherStatus || '';
      }
      return updated;
    });
  };

  // Submit edit form
  const handleSaveBukuInduk = async () => {
    if (!selectedStudent) return;
    try {
      const success = await onUpdateStudent(selectedStudent.id, formData);
      if (success) {
        setIsEditModalOpen(false);
        // Refresh page/system data
        onRefresh();
      } else {
        alert('Gagal memperbarui Buku Induk Siswa.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan data.');
    }
  };

  // Helper to escape CSV cell contents
  const escapeCsvVal = (val: any) => {
    const str = String(val === undefined || val === null ? '' : val).trim();
    // Prevent Excel from displaying long digit strings in scientific notation (e.g. NISN, NIK, KK, No HP)
    if (str.length >= 10 && /^\d+$/.test(str)) {
      return `"=""${str}"""`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Download CSV Import Template (Contoh Template)
  const downloadImportTemplate = () => {
    const headers = [
      'nis', 'nisn', 'nama_lengkap', 'nama_panggilan', 'nik', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
      'no_kk', 'no_akte_kelahiran', 'no_hp_siswa', 'alamat_siswa', 'tinggal_bersama', 'anak_ke',
      'jumlah_saudara_kandung', 'jumlah_saudara_tiri', 'kelas',
      'ayah_nama', 'ayah_nik', 'ayah_tempat_lahir', 'ayah_tanggal_lahir', 'ayah_pendidikan', 'ayah_pekerjaan', 'ayah_penghasilan', 'ayah_alamat', 'ayah_no_hp', 'ayah_status',
      'ibu_nama', 'ibu_nik', 'ibu_tempat_lahir', 'ibu_tanggal_lahir', 'ibu_pendidikan', 'ibu_pekerjaan', 'ibu_penghasilan', 'ibu_alamat', 'ibu_no_hp', 'ibu_status',
      'wali_nama', 'wali_nik', 'wali_tempat_lahir', 'wali_tanggal_lahir', 'wali_pendidikan', 'wali_pekerjaan', 'wali_penghasilan', 'wali_alamat', 'wali_no_hp', 'wali_status',
      'wali_sama_dengan_ayah'
    ].join(',');

    const exampleRow = [
      '20241001', '0112345678', 'Ahmad Fauzi', 'Ahmad', '35140212040003', 'Laki-laki', 'Pandaan', '2011-04-12',
      '35140012012001', '40532/DISDUK/2011', '081234567890', 'Jl. Kebon No. 4 Pandaan Pasuruan', 'Orang Tua', '1',
      '2', '0', '7-A',
      'Fauzi Sr', '351402101072002', 'Malang', '1972-05-18', 'S1', 'Wiraswasta', '4500000', 'Jl. Kebon No. 4 Pandaan Pasuruan', '081255556666', 'Hidup',
      'Siti Aminah', '351402102062002', 'Pasuruan', '1976-06-22', 'SMA', 'Ibu Rumah Tangga', '0', 'Jl. Kebon No. 4 Pandaan Pasuruan', '081277778888', 'Hidup',
      '', '', '', '', '', '', '', '', '', '', 'ya'
    ].map(escapeCsvVal).join(',');

    const blob = new Blob(['\ufeff' + headers + '\n' + exampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_buku_induk.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export existing Buku Induk Database for Updating
  const exportBukuIndukForUpdate = () => {
    const headers = [
      'nis', 'nisn', 'nama_lengkap', 'nama_panggilan', 'nik', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
      'no_kk', 'no_akte_kelahiran', 'no_hp_siswa', 'alamat_siswa', 'tinggal_bersama', 'anak_ke',
      'jumlah_saudara_kandung', 'jumlah_saudara_tiri', 'kelas',
      'ayah_nama', 'ayah_nik', 'ayah_tempat_lahir', 'ayah_tanggal_lahir', 'ayah_pendidikan', 'ayah_pekerjaan', 'ayah_penghasilan', 'ayah_alamat', 'ayah_no_hp', 'ayah_status',
      'ibu_nama', 'ibu_nik', 'ibu_tempat_lahir', 'ibu_tanggal_lahir', 'ibu_pendidikan', 'ibu_pekerjaan', 'ibu_penghasilan', 'ibu_alamat', 'ibu_no_hp', 'ibu_status',
      'wali_nama', 'wali_nik', 'wali_tempat_lahir', 'wali_tanggal_lahir', 'wali_pendidikan', 'wali_pekerjaan', 'wali_penghasilan', 'wali_alamat', 'wali_no_hp', 'wali_status',
      'wali_sama_dengan_ayah'
    ].join(',');

    const rows = students.map(s => {
      return [
        s.nis,
        s.nisn || '',
        s.name,
        s.nickname || '',
        s.nik || '',
        s.gender || 'Laki-laki',
        s.birthPlace || '',
        s.birthDate || '',
        s.kkNumber || '',
        s.birthCertNumber || '',
        s.phone || '',
        s.address || '',
        s.livingWith || '',
        s.childOrder || '',
        s.siblingsCount || '',
        s.stepSiblingsCount || '',
        s.class,
        s.fatherName || '',
        s.fatherNik || '',
        s.fatherBirthPlace || '',
        s.fatherBirthDate || '',
        s.fatherEducation || '',
        s.fatherOccupation || '',
        s.fatherIncome || '',
        s.fatherAddress || '',
        s.fatherPhone || '',
        s.fatherStatus || 'Hidup',
        s.motherName || '',
        s.motherNik || '',
        s.motherBirthPlace || '',
        s.motherBirthDate || '',
        s.motherEducation || '',
        s.motherOccupation || '',
        s.motherIncome || '',
        s.motherAddress || '',
        s.motherPhone || '',
        s.motherStatus || 'Hidup',
        s.guardianName || '',
        s.guardianNik || '',
        s.guardianBirthPlace || '',
        s.guardianBirthDate || '',
        s.guardianEducation || '',
        s.guardianOccupation || '',
        s.guardianIncome || '',
        s.guardianAddress || '',
        s.guardianPhone || '',
        s.guardianStatus || 'Hidup',
        s.guardianIsSameAsFather ? 'ya' : 'tidak'
      ].map(escapeCsvVal).join(',');
    }).join('\n');

    const blob = new Blob(['\ufeff' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Buku_Induk_Siswa_Backup_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Robust CSV Line parser to handle double quoted values with commas
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

  // Handle uploading and parsing of the CSV file
  const handleCSVImportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportResult(null);
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setImportError('File kosong atau rusak.');
          return;
        }

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setImportError('File CSV minimal harus berisi header & satu baris data.');
          return;
        }

        const clean = (val: string) => {
          let s = (val || "").trim();
          if (s.startsWith('"') && s.endsWith('"')) {
            s = s.substring(1, s.length - 1);
          }
          if (s.startsWith('=') && (s.substring(1).startsWith('"') || s.substring(1).startsWith("'"))) {
            s = s.substring(2, s.length - 1);
          }
          if (s.startsWith("'")) {
            s = s.substring(1);
          }
          return s.trim();
        };

        // Detect delimiter: comma (,) or semicolon (;)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = parseCSVLineRobust(firstLine, delimiter).map(h => clean(h).toLowerCase());

        // Validate required headers
        const nisIdx = headers.findIndex(h => h === 'nis');
        const namaIdx = headers.findIndex(h => h === 'nama_lengkap' || h === 'nama');
        const kelasIdx = headers.findIndex(h => h === 'kelas' || h === 'class');
        
        if (nisIdx === -1) {
          setImportError('Header "nis" tidak ditemukan pada file Anda.');
          return;
        }

        // Prepare raw parsed models
        const parsedRows: any[] = [];
        
        // Header mapping helper
        const fieldsMapping: Record<string, string> = {
          nisn: 'nisn',
          nama_lengkap: 'name',
          nama: 'name',
          nama_panggilan: 'nickname',
          nik: 'nik',
          jenis_kelamin: 'gender',
          jk: 'gender',
          tempat_lahir: 'birthPlace',
          tanggal_lahir: 'birthDate',
          no_kk: 'kkNumber',
          no_akte_kelahiran: 'birthCertNumber',
          no_hp_siswa: 'phone',
          alamat_siswa: 'address',
          tinggal_bersama: 'livingWith',
          anak_ke: 'childOrder',
          jumlah_saudara_kandung: 'siblingsCount',
          jumlah_saudara_tiri: 'stepSiblingsCount',
          kelas: 'class',
          // Ayah
          ayah_nama: 'fatherName',
          ayah_nik: 'fatherNik',
          ayah_tempat_lahir: 'fatherBirthPlace',
          ayah_tanggal_lahir: 'fatherBirthDate',
          ayah_pendidikan: 'fatherEducation',
          ayah_pekerjaan: 'fatherOccupation',
          ayah_penghasilan: 'fatherIncome',
          ayah_alamat: 'fatherAddress',
          ayah_no_hp: 'fatherPhone',
          ayah_status: 'fatherStatus',
          // Ibu
          ibu_nama: 'motherName',
          ibu_nik: 'motherNik',
          ibu_tempat_lahir: 'motherBirthPlace',
          ibu_tanggal_lahir: 'motherBirthDate',
          ibu_pendidikan: 'motherEducation',
          ibu_pekerjaan: 'motherOccupation',
          ibu_penghasilan: 'motherIncome',
          ibu_alamat: 'motherAddress',
          ibu_no_hp: 'motherPhone',
          ibu_status: 'motherStatus',
          // Wali
          wali_nama: 'guardianName',
          wali_nik: 'guardianNik',
          wali_tempat_lahir: 'guardianBirthPlace',
          wali_tanggal_lahir: 'guardianBirthDate',
          wali_pendidikan: 'guardianEducation',
          wali_pekerjaan: 'guardianOccupation',
          wali_penghasilan: 'guardianIncome',
          wali_alamat: 'guardianAddress',
          wali_no_hp: 'guardianPhone',
          wali_status: 'guardianStatus',
          wali_sama_dengan_ayah: 'guardianIsSameAsFather'
        };

        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLineRobust(lines[i], delimiter);
          if (cells.length < headers.length) continue; // Skip malformed rows
          
          const rowObj: any = {};
          headers.forEach((h, hIdx) => {
            const mappedField = fieldsMapping[h];
            if (mappedField) {
              const cleanedVal = clean(cells[hIdx]);
              if (mappedField === 'guardianIsSameAsFather') {
                rowObj[mappedField] = (cleanedVal.toLowerCase() === 'ya' || cleanedVal.toLowerCase() === 'true');
              } else {
                rowObj[mappedField] = cleanedVal;
              }
            }
          });

          // Extra validation: fallback for standard fields matching current app
          if (!rowObj.name && namaIdx !== -1) rowObj.name = clean(cells[namaIdx]);
          if (!rowObj.class && kelasIdx !== -1) rowObj.class = clean(cells[kelasIdx]);
          if (!rowObj.nis) rowObj.nis = clean(cells[nisIdx]);

          if (rowObj.nis && rowObj.name) {
            parsedRows.push(rowObj);
          }
        }

        if (parsedRows.length === 0) {
          setImportError('Tidak ada baris data siswa valid yang berhasil diproses.');
        } else {
          setPreviewData(parsedRows);
        }

      } catch (err: any) {
        setImportError(`Gagal membaca file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Submit the batch import data to the App backend
  const handleExecuteImport = async () => {
    if (previewData.length === 0) return;
    setIsImporting(true);
    setImportError('');
    try {
      const res = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentsList: previewData })
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult({
          success: true,
          added: data.addedCount || 0,
          updated: data.updatedCount || 0
        });
        onRefresh();
      } else {
        const errObj = await res.json().catch(() => ({}));
        setImportError(errObj.error || 'Server menolak berkas batch impor.');
      }
    } catch (err) {
      setImportError('Gagal mengirimkan data impor kolektif ke server.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div id="buku-induk-container" className="flex flex-col gap-6 text-slate-800 text-left">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-indigo-905 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-[-15px] top-[-15px] opacity-10">
          <BookOpen size={170} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 px-2.5 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-full text-[10px] font-mono tracking-widest font-extrabold uppercase">Administrasi Rapor</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight leading-none mb-2">Buku Induk Siswa (Master Ledger)</h1>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              Manajemen buku induk profil lengkap siswa Pasuruan yang terintegrasi langsung dengan akun murid, wali kelas, backup stempel virtual, dan sistem laporan rekapitulasi data periodik.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={downloadImportTemplate}
              className="px-3.5 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Unduh contoh template berkas excel/csv"
            >
              <FileDown size={14} className="text-indigo-400" /> Unduh Template
            </button>
            <button
              onClick={exportBukuIndukForUpdate}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Ekspor seluruh database buku induk siswa Pasuruan ke berkas CSV"
            >
              <FileUp size={14} /> Ekspor Buku Induk
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Statistics + Import Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Upload Board or Status Cards */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Quick Stats Panel */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Users size={15} className="text-indigo-505" /> Statistik Buku Induk
            </h3>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Total Murid</span>
                <span className="text-lg font-black font-mono text-slate-800">{students.length}</span>
              </div>
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/70 rounded-xl">
                <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider block mb-0.5">Terisi Lengkap</span>
                <span className="text-lg font-black font-mono text-indigo-800">
                  {students.filter(s => calculateCompleteness(s).pct > 80).length} <span className="text-[10px] text-indigo-600 font-bold">(&gt;80%)</span>
                </span>
              </div>
            </div>

            {/* Completeness Bar */}
            <div className="pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between mb-1.5">
                <span>Rata-rata Kelengkapan Data</span>
                <span className="text-slate-700 font-mono font-black">
                  {Math.round(students.reduce((acc, s) => acc + calculateCompleteness(s).pct, 0) / (students.length || 1))}%
                </span>
              </span>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-505 to-indigo-550 transition-all duration-500"
                  style={{ width: `${Math.round(students.reduce((acc, s) => acc + calculateCompleteness(s).pct, 0) / (students.length || 1))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Import Student Master Data Widget */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileUp size={15} className="text-indigo-505" /> Impor Berkas Buku Induk
            </h3>
            
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Unggah berkas spreadsheet CSV / Excel hasil update Anda. Sistem akan secara otomatis mendeteksi NIS siswa, memperbarui nomor NISN, biodata, rekam orang tua, dan mutasi wali.
            </p>

            <div className="border border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 text-center transition-all bg-slate-50/50 hover:bg-indigo-50/10 cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCSVImportUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileUp size={30} className="mx-auto text-slate-400 mb-2" />
              <span className="text-xs font-extrabold text-slate-700 block mb-0.5">Klik untuk Pilih Berkas CSV</span>
              <span className="text-[9.5px] text-slate-400 font-mono font-medium block">Format: UTF-8 CSV (nis, nama_lengkap, etc)</span>
            </div>

            {/* Error alerts */}
            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-1.5 text-[11px] text-red-700 leading-relaxed">
                <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Preview Area if parsed and waiting */}
            {previewData.length > 0 && !importResult && (
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-mono block">CONTOH PREVIEW DATA ({previewData.length} baris):</span>
                <div className="max-h-24 overflow-y-auto text-[10px] bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-600">
                  {previewData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="border-b border-slate-100 last:border-b-0 pb-1 mb-1">
                      [{item.nis}] {item.name || item.nama_lengkap} (Kelas {item.class})<br/>
                      <span className="text-[9px] text-slate-400">NISN: {item.nisn || '-'} | Ayah: {item.fatherName || '-'}</span>
                    </div>
                  ))}
                  {previewData.length > 3 && <span className="text-[9px] text-indigo-600 font-bold block mt-1">+ {previewData.length - 3} siswa lainnya...</span>}
                </div>
                <button
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className="w-full py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Eksekusi Unggah Impor</span>
                </button>
              </div>
            )}

            {/* Import results */}
            {importResult && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-150 rounded-xl flex flex-col gap-1.5 text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold mb-1">
                  <UserCheck size={15} /> Batch Impor Selesai!
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium font-mono">
                  <li>Siswa Baru Ditambahkan: {importResult.added}</li>
                  <li>Siswa Lama Diperbarui: {importResult.updated}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setPreviewData([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-2 text-center text-[10.5px] font-black text-indigo-600 hover:text-indigo-805 block tracking-wide uppercase transition"
                >
                  Impor Berkas Lainnya
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Tabular List view of Student Master profiles */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Filter and Search header */}
            <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
              
              {/* Search input */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3.5 top-2.5 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Cari NIS, Nama, NISN, Orangtua..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-medium focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Filter size={12} /> Filter Kelas
                </span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="p-1.5 px-3 border border-slate-200 bg-white text-xs font-bold rounded-xl focus:outline-none focus:border-indigo-500 shadow-xs"
                >
                  {classesList.map(cls => (
                    <option key={cls} value={cls}>{cls === 'ALL' ? 'Semua Kelas' : `Kelas ${cls}`}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Interactive Grid of student files */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 h-10 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <th className="pl-6 w-16">No</th>
                    <th className="w-48">Siswa & Kelas</th>
                    <th className="w-40">Identitas (NIS / NISN)</th>
                    <th className="w-48">Biodata Orang Tua (Ayah / Ibu)</th>
                    <th className="w-40">Kelengkapan Data</th>
                    <th className="pr-6 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <BookOpen size={24} className="mx-auto text-slate-300 mb-2" />
                        <span className="text-xs block">Tidak ada data profil buku induk siswa yang ditemukan.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const { filled, total, pct } = calculateCompleteness(student);
                      
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition duration-100">
                          <td className="pl-6 font-mono text-slate-400 text-[11px]">{index + 1}</td>
                          <td className="py-3">
                            <div>
                              <p className="font-extrabold text-slate-800 leading-snug">{student.name}</p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                                <span className="bg-indigo-50 text-indigo-650 px-1 py-0.5 rounded text-[8.5px] font-black uppercase font-sans">
                                  Kelas {student.class}
                                </span>
                                <span>• {student.gender || 'Laki-laki'}</span>
                              </p>
                            </div>
                          </td>
                          <td>
                            <div className="font-mono text-[10.5px]">
                              <p className="text-slate-700 font-bold"><span className="text-slate-400 mr-2 text-[9px] uppercase font-sans">NIS:</span>{student.nis}</p>
                              <p className="text-slate-500"><span className="text-slate-400 mr-1 text-[9px] uppercase font-sans">NISN:</span>{student.nisn || '-'}</p>
                            </div>
                          </td>
                          <td>
                            <div className="text-[10px] font-semibold text-slate-600 leading-normal">
                              <p><span className="text-slate-450 mr-1.5 font-sans font-bold text-[9px]">A:</span>{student.fatherName || '-'}</p>
                              <p><span className="text-slate-450 mr-1.5 font-sans font-bold text-[9px]">I:</span>{student.motherName || '-'}</p>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col gap-1 pr-4">
                              <div className="flex justify-between items-center text-[9.5px]">
                                <span className={`font-mono font-bold ${pct > 80 ? 'text-emerald-700' : pct > 45 ? 'text-indigo-700' : 'text-amber-700'}`}>
                                  {pct}% Terisi
                                </span>
                                <span className="text-slate-400 font-mono font-black">{filled}/{total} fld</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    pct > 80 ? 'bg-emerald-505' : pct > 45 ? 'bg-indigo-550' : 'bg-amber-505'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="pr-6 text-right">
                            <button
                              onClick={() => handleOpenEdit(student)}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-650 rounded-lg transition"
                              title="Sunting berkas buku induk murid"
                            >
                              <Edit size={13.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* List footer stats */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 text-[10.5px] text-slate-400 font-bold uppercase tracking-wider px-6 flex justify-between">
              <span>Menunjukkan {filteredStudents.length} siswa terfilter</span>
              <span>Total DB: {students.length} record siswa</span>
            </div>

          </div>
        </div>

      </div>

      {/* Modal: Sunting Buku Induk Model */}
      <AnimatePresence>
        {isEditModalOpen && selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800"
            >
              
              {/* Modal Banner */}
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 p-1 px-2.5 rounded-full text-[8.5px] font-mono tracking-widest font-black uppercase w-fit">
                    <BookOpen size={10} /> SUNS/E BUKU INDUK SISWA
                  </div>
                  <h2 className="text-base font-black font-display tracking-tight leading-none text-white">{selectedStudent.name}</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    ID Murid: <span className="text-indigo-400">{selectedStudent.id}</span> | NIS: {selectedStudent.nis} | Kelas: {selectedStudent.class}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Tab Navigation buttons */}
              <div className="bg-slate-50 border-b border-slate-150 p-2 flex gap-1 justify-start shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveFormTab('siswa')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFormTab === 'siswa'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-650 hover:bg-slate-150'
                  }`}
                >
                  🏫 I. Data Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('ayah')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFormTab === 'ayah'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-650 hover:bg-slate-150'
                  }`}
                >
                  👨🏼‍💼 II. Data Ayah
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('ibu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFormTab === 'ibu'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-650 hover:bg-slate-150'
                  }`}
                >
                  👩🏼‍💼 III. Data Ibu
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('wali')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFormTab === 'wali'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-650 hover:bg-slate-150'
                  }`}
                >
                  💼 IV. Data Wali (Opsional)
                </button>
              </div>

              {/* Form Fields Inputs with scroll */}
              <div className="p-6 overflow-y-auto space-y-4 max-h-[50vh] text-left">
                
                {/* Section I: Data Siswa */}
                {activeFormTab === 'siswa' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nama Lengkap (Sesuai Akte)</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Nama lengkap siswa"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nama Panggilan</label>
                      <input
                        type="text"
                        value={formData.nickname || ''}
                        onChange={(e) => handleInputChange('nickname', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Nama panggilan akrab"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">NIS (Nomor Induk Siswa)</label>
                      <input
                        type="text"
                        value={formData.nis || ''}
                        onChange={(e) => handleInputChange('nis', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-slate-50/70 rounded-xl text-xs font-mono font-bold outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">NISN (Nomor Induk Siswa Nasional)</label>
                      <input
                        type="text"
                        value={formData.nisn || ''}
                        onChange={(e) => handleInputChange('nisn', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="Minimal 10 digit angka"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">NIK Siswa / No KTP Siswa</label>
                      <input
                        type="text"
                        value={formData.nik || ''}
                        onChange={(e) => handleInputChange('nik', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="16 digit angka NIK"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Jenis Kelamin</label>
                      <select
                        value={formData.gender || 'Laki-laki'}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-505"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={formData.birthPlace || ''}
                        onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Kab Pasuruan, Surabaya, etc"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nomor Kartu Keluarga (KK)</label>
                      <input
                        type="text"
                        value={formData.kkNumber || ''}
                        onChange={(e) => handleInputChange('kkNumber', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="16 digit No KK"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nomor Registrasi Akte Kelahiran</label>
                      <input
                        type="text"
                        value={formData.birthCertNumber || ''}
                        onChange={(e) => handleInputChange('birthCertNumber', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="Contoh: 1215/AK/xxx"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">No. HP Siswa / WA Siswa</label>
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="Mulai dengan 08 / 62"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tinggal Bersama dengan</label>
                      <input
                        type="text"
                        value={formData.livingWith || ''}
                        onChange={(e) => handleInputChange('livingWith', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Orang Tua, Kost, Saudara, Panti"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Anak Ke- (dalam Keluarga)</label>
                      <input
                        type="text"
                        value={formData.childOrder || ''}
                        onChange={(e) => handleInputChange('childOrder', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"
                        placeholder="Contoh: 1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Jumlah Sdr Kandung</label>
                        <input
                          type="text"
                          value={formData.siblingsCount || ''}
                          onChange={(e) => handleInputChange('siblingsCount', e.target.value)}
                          className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Jumlah Sdr Tiri</label>
                        <input
                          type="text"
                          value={formData.stepSiblingsCount || ''}
                          onChange={(e) => handleInputChange('stepSiblingsCount', e.target.value)}
                          className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Alamat Domisili Siswa Lengkap</label>
                      <textarea
                        value={formData.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={2}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Nama jalan, RT/RW, Dusun, Desa/Kelurahan, Kecamatan, Kabupaten Pasuruan"
                      />
                    </div>
                  </div>
                )}

                {/* Section II: Data Ayah */}
                {activeFormTab === 'ayah' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nama Kandung Ayah</label>
                      <input
                        type="text"
                        value={formData.fatherName || ''}
                        onChange={(e) => handleInputChange('fatherName', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Nama lengkap ayah"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">NIK Ayah</label>
                      <input
                        type="text"
                        value={formData.fatherNik || ''}
                        onChange={(e) => handleInputChange('fatherNik', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="16 digit angka"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tempat Lahir Ayah</label>
                      <input
                        type="text"
                        value={formData.fatherBirthPlace || ''}
                        onChange={(e) => handleInputChange('fatherBirthPlace', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Kota / Kabupaten"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tanggal Lahir Ayah</label>
                      <input
                        type="date"
                        value={formData.fatherBirthDate || ''}
                        onChange={(e) => handleInputChange('fatherBirthDate', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pendidikan Terakhir Ayah</label>
                      <input
                        type="text"
                        value={formData.fatherEducation || ''}
                        onChange={(e) => handleInputChange('fatherEducation', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="SD, SMP, SMA, S1, S2, D3"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pekerjaan Ayah</label>
                      <input
                        type="text"
                        value={formData.fatherOccupation || ''}
                        onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Wiraswasta, PNS, Buruh, Petani"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Rata-rata Penghasilan Bulanan</label>
                      <input
                        type="text"
                        value={formData.fatherIncome || ''}
                        onChange={(e) => handleInputChange('fatherIncome', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="Contoh: 3500000"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nomor Kontak HP / WA</label>
                      <input
                        type="text"
                        value={formData.fatherPhone || ''}
                        onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Status Keberadaan Ayah</label>
                      <select
                        value={formData.fatherStatus || 'Hidup'}
                        onChange={(e) => handleInputChange('fatherStatus', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-505"
                      >
                        <option value="Hidup">Masih Hidup</option>
                        <option value="Meninggal">Sudah Meninggal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Alamat Tinggal Ayah</label>
                      <input
                        type="text"
                        value={formData.fatherAddress || ''}
                        onChange={(e) => handleInputChange('fatherAddress', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Kosongkan jika sama dengan siswa"
                      />
                    </div>
                  </div>
                )}

                {/* Section III: Data Ibu */}
                {activeFormTab === 'ibu' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nama Kandung Ibu</label>
                      <input
                        type="text"
                        value={formData.motherName || ''}
                        onChange={(e) => handleInputChange('motherName', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Nama lengkap ibu"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">NIK Ibu</label>
                      <input
                        type="text"
                        value={formData.motherName ? (formData.motherNik || '') : ''}
                        onChange={(e) => handleInputChange('motherNik', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="16 digit angka"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tempat Lahir Ibu</label>
                      <input
                        type="text"
                        value={formData.motherBirthPlace || ''}
                        onChange={(e) => handleInputChange('motherBirthPlace', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Kota / Kabupaten"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tanggal Lahir Ibu</label>
                      <input
                        type="date"
                        value={formData.motherBirthDate || ''}
                        onChange={(e) => handleInputChange('motherBirthDate', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pendidikan Terakhir Ibu</label>
                      <input
                        type="text"
                        value={formData.motherEducation || ''}
                        onChange={(e) => handleInputChange('motherEducation', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="SD, SMP, SMA, S1, S2, D3"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pekerjaan Ibu</label>
                      <input
                        type="text"
                        value={formData.motherOccupation || ''}
                        onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Wiraswasta, PNS, BUMN, IRT"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Rata-rata Penghasilan Ibu</label>
                      <input
                        type="text"
                        value={formData.motherIncome || ''}
                        onChange={(e) => handleInputChange('motherIncome', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="0 jika IRT"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nomor Kontak Ibu</label>
                      <input
                        type="text"
                        value={formData.motherPhone || ''}
                        onChange={(e) => handleInputChange('motherPhone', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Status Keberadaan Ibu</label>
                      <select
                        value={formData.motherStatus || 'Hidup'}
                        onChange={(e) => handleInputChange('motherStatus', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-505"
                      >
                        <option value="Hidup">Masih Hidup</option>
                        <option value="Meninggal">Sudah Meninggal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Alamat Tinggal Ibu</label>
                      <input
                        type="text"
                        value={formData.motherAddress || ''}
                        onChange={(e) => handleInputChange('motherAddress', e.target.value)}
                        className="w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Kosongkan jika sama dengan siswa"
                      />
                    </div>
                  </div>
                )}

                {/* Section IV: Data Wali (Dengan checklist copy Ayah) */}
                {activeFormTab === 'wali' && (
                  <div className="flex flex-col gap-4">
                    
                    {/* Checklist Sama dengan Ayah */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-xs font-extrabold text-indigo-900 block">Sama dengan Ayah Kandung?</span>
                        <span className="text-[10px] text-indigo-600 block">Centang kotak ini untuk menyalin seluruh data ayah sebagai wali secara otomatis.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInputChange('guardianIsSameAsFather', !formData.guardianIsSameAsFather)}
                        className="text-indigo-600 hover:text-indigo-800 transition"
                      >
                        {formData.guardianIsSameAsFather ? (
                          <CheckSquare size={22} className="stroke-[2.5px]" />
                        ) : (
                          <Square size={22} />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nama Lengkap Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianName || ''}
                          onChange={(e) => handleInputChange('guardianName', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                          placeholder="Nama lengkap wali"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">NIK Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianNik || ''}
                          onChange={(e) => handleInputChange('guardianNik', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                          placeholder="16 digit angka"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tempat Lahir Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianBirthPlace || ''}
                          onChange={(e) => handleInputChange('guardianBirthPlace', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                          placeholder="Kota / Kabupaten"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Tanggal Lahir Wali</label>
                        <input
                          type="date"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianBirthDate || ''}
                          onChange={(e) => handleInputChange('guardianBirthDate', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed font-mono' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pendidikan Terakhir Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianEducation || ''}
                          onChange={(e) => handleInputChange('guardianEducation', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                          placeholder="Pendidikan wali"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pekerjaan Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianOccupation || ''}
                          onChange={(e) => handleInputChange('guardianOccupation', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                          placeholder="Pekerjaan wali"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Rata-rata Penghasilan Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianIncome || ''}
                          onChange={(e) => handleInputChange('guardianIncome', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed font-mono' : ''}`}
                          placeholder="Wali income per bulan"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Nomor Kontak Wali</label>
                        <input
                          type="text"
                          disabled={!!formData.guardianIsSameAsFather}
                          value={formData.guardianPhone || ''}
                          onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
                          className={`w-full p-2.5 border border-slate-205 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 ${formData.guardianIsSameAsFather ? 'bg-slate-50 text-slate-500 cursor-not-allowed font-mono' : ''}`}
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal controls footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-between items-center shrink-0">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  ⚠️ Data di-sync ke Rapor Wali kelas & Akun Murid
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBukuInduk}
                    className="px-5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                  >
                    Simpan Buku Induk
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
