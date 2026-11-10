import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Database
} from 'lucide-react';
import { Student } from '../types';
import {
  ExtracurricularMasterItem,
  buildExtracurricularDescription
} from '../utils/raporAkhirPrint';

interface MysqlExtracurricularGradeRow {
  id: string;
  student_id: string;
  nis: string;
  student_name: string;
  class_name?: string;
  id_ekstra: string;
  nama_ekstra: string;
  predikat: string;
  keterangan: string;
  no_urut: number;
  semester: string;
  academic_year: string;
  updated_at?: string;
}

interface StudentEkstraSlot {
  id_ekstra: string;
  nama_ekstra: string;
  predikat: string;
  keterangan: string;
}

interface WakaExtracurricularViewProps {
  students: Student[];
  availableClasses: string[];
  selectedSemester: string;
  selectedAcademicYear: string;
  onRefreshRaporData?: () => Promise<void> | void;
}

const normClass = (cls?: string): string => {
  if (!cls) return '';
  return cls.replace(/[\s-]/g, '').toUpperCase();
};

export const WakaExtracurricularView: React.FC<WakaExtracurricularViewProps> = ({
  students,
  availableClasses,
  selectedSemester,
  selectedAcademicYear,
  onRefreshRaporData
}) => {
  // Data Master & Nilai Ekstrakurikuler (Murni dari MySQL tanpa penyimpanan lokal)
  const [masterList, setMasterList] = useState<ExtracurricularMasterItem[]>([]);
  const [gradeRows, setGradeRows] = useState<MysqlExtracurricularGradeRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingMaster, setIsSavingMaster] = useState<boolean>(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Form Input Daftar Ekstrakurikuler
  const [formIdEkstra, setFormIdEkstra] = useState<string>('');
  const [formNamaEkstra, setFormNamaEkstra] = useState<string>('');
  const [editingOldIdEkstra, setEditingOldIdEkstra] = useState<string | null>(null);

  // Filter Input Nilai Ekstrakurikuler
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterEkstra, setFilterEkstra] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Draft perubahan nilai per siswa di UI sebelum/saat disimpan ke MySQL
  const [draftStudentSlots, setDraftStudentSlots] = useState<Record<string, StudentEkstraSlot[]>>({});

  // Notifikasi status
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchMysqlExtracurricularData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        semester: selectedSemester,
        academicYear: selectedAcademicYear
      });
      const res = await fetch(`/api/curriculum/extracurricular?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const loadedMaster: ExtracurricularMasterItem[] = Array.isArray(json.master) ? json.master : [];
        const loadedGrades: MysqlExtracurricularGradeRow[] = Array.isArray(json.grades) ? json.grades : [];
        setMasterList(loadedMaster);
        setGradeRows(loadedGrades);

        // Bangun map slot per siswa dari data MySQL
        const nextDrafts: Record<string, StudentEkstraSlot[]> = {};
        for (const g of loadedGrades) {
          const stObj = students.find(
            s => s.id === g.student_id || String(s.nis).trim() === String(g.nis).trim()
          );
          const key = stObj ? stObj.id : g.student_id;
          if (!nextDrafts[key]) nextDrafts[key] = [];
          if (nextDrafts[key].length < 3) {
            nextDrafts[key].push({
              id_ekstra: g.id_ekstra,
              nama_ekstra: g.nama_ekstra,
              predikat: g.predikat || 'A',
              keterangan:
                g.keterangan ||
                buildExtracurricularDescription(g.predikat || 'A', g.nama_ekstra)
            });
          }
        }
        setDraftStudentSlots(nextDrafts);
      } else {
        showToast('error', json.error || 'Gagal memuat data ekstrakurikuler dari MySQL.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal terhubung ke server MySQL: ' + (err?.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [selectedSemester, selectedAcademicYear, students, showToast]);

  useEffect(() => {
    fetchMysqlExtracurricularData();
  }, [fetchMysqlExtracurricularData]);

  // Map referensi cepat id_ekstra -> nama_ekstra
  const masterMap = useMemo(() => {
    const map = new Map<string, string>();
    masterList.forEach(item => {
      map.set(item.id_ekstra.trim().toLowerCase(), item.nama_ekstra.trim());
    });
    return map;
  }, [masterList]);

  const resolveMasterItem = useCallback(
    (idOrName: string): ExtracurricularMasterItem | null => {
      const raw = String(idOrName || '').trim();
      if (!raw) return null;
      const lower = raw.toLowerCase();
      const byId = masterList.find(m => m.id_ekstra.trim().toLowerCase() === lower);
      if (byId) return byId;
      const byName = masterList.find(m => m.nama_ekstra.trim().toLowerCase() === lower);
      if (byName) return byName;
      return null;
    },
    [masterList]
  );

  // Simpan Daftar Ekstrakurikuler langsung ke MySQL
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = formIdEkstra.trim();
    const cleanNama = formNamaEkstra.trim();
    if (!cleanId || !cleanNama) {
      showToast('error', 'Mohon isi id_ekstra dan nama_ekstra terlebih dahulu.');
      return;
    }

    setIsSavingMaster(true);
    try {
      const res = await fetch('/api/curriculum/extracurricular/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_ekstra: cleanId,
          nama_ekstra: cleanNama,
          old_id_ekstra: editingOldIdEkstra || undefined
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMasterList(Array.isArray(json.master) ? json.master : []);
        setFormIdEkstra('');
        setFormNamaEkstra('');
        setEditingOldIdEkstra(null);
        showToast('success', `Ekstrakurikuler "${cleanNama}" (${cleanId}) berhasil disimpan di MySQL.`);
        await fetchMysqlExtracurricularData();
        if (onRefreshRaporData) await onRefreshRaporData();
      } else {
        showToast('error', json.error || 'Gagal menyimpan daftar ekstrakurikuler ke MySQL.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan ke MySQL: ' + (err?.message || String(err)));
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleEditMasterClick = (item: ExtracurricularMasterItem) => {
    setFormIdEkstra(item.id_ekstra);
    setFormNamaEkstra(item.nama_ekstra);
    setEditingOldIdEkstra(item.id_ekstra);
  };

  const handleDeleteMaster = async (id_ekstra: string, nama_ekstra: string) => {
    setIsSavingMaster(true);
    try {
      const res = await fetch(`/api/curriculum/extracurricular/master/${encodeURIComponent(id_ekstra)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMasterList(Array.isArray(json.master) ? json.master : []);
        if (editingOldIdEkstra === id_ekstra) {
          setEditingOldIdEkstra(null);
          setFormIdEkstra('');
          setFormNamaEkstra('');
        }
        showToast('success', `Ekstrakurikuler "${nama_ekstra}" (${id_ekstra}) dihapus dari MySQL.`);
        await fetchMysqlExtracurricularData();
        if (onRefreshRaporData) await onRefreshRaporData();
      } else {
        showToast('error', json.error || 'Gagal menghapus ekstrakurikuler dari MySQL.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal menghapus dari MySQL: ' + (err?.message || String(err)));
    } finally {
      setIsSavingMaster(false);
    }
  };

  // Simpan nilai ekstrakurikuler 1 siswa langsung ke MySQL
  const saveStudentSlotsToMysql = async (student: Student, slots: StudentEkstraSlot[]) => {
    setSavingStudentId(student.id);
    try {
      const validSlots = slots
        .filter(s => s.id_ekstra.trim() !== '' || s.nama_ekstra.trim() !== '')
        .slice(0, 3)
        .map((s, idx) => {
          const matched = resolveMasterItem(s.id_ekstra || s.nama_ekstra);
          const idEkstra = matched ? matched.id_ekstra : s.id_ekstra.trim();
          const namaEkstra = matched ? matched.nama_ekstra : (s.nama_ekstra.trim() || idEkstra);
          const predikat = (s.predikat || 'A').trim().toUpperCase();
          const keterangan = buildExtracurricularDescription(predikat, namaEkstra, s.keterangan);
          return {
            id_ekstra: idEkstra,
            nama_ekstra: namaEkstra,
            predikat,
            keterangan,
            no_urut: idx + 1
          };
        });

      const res = await fetch('/api/curriculum/extracurricular/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: selectedSemester,
          academicYear: selectedAcademicYear,
          entries: [
            {
              student_id: student.id,
              nis: String(student.nis || '').trim(),
              student_name: student.name,
              class_name: student.class,
              semester: selectedSemester,
              academic_year: selectedAcademicYear,
              items: validSlots
            }
          ]
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (Array.isArray(json.grades)) {
          setGradeRows(json.grades);
        }
        setDraftStudentSlots(prev => ({
          ...prev,
          [student.id]: validSlots
        }));
        if (onRefreshRaporData) await onRefreshRaporData();
      } else {
        showToast('error', json.error || 'Gagal menyimpan nilai ekstrakurikuler siswa ke MySQL.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan nilai ke MySQL: ' + (err?.message || String(err)));
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSlotChange = async (
    student: Student,
    slotIndex: number,
    field: 'id_ekstra' | 'predikat',
    value: string
  ) => {
    const currentSlots = [...(draftStudentSlots[student.id] || [])];
    while (currentSlots.length <= slotIndex) {
      currentSlots.push({ id_ekstra: '', nama_ekstra: '', predikat: 'A', keterangan: '' });
    }

    const updated = { ...currentSlots[slotIndex] };
    if (field === 'id_ekstra') {
      const matched = resolveMasterItem(value);
      updated.id_ekstra = matched ? matched.id_ekstra : value;
      updated.nama_ekstra = matched ? matched.nama_ekstra : value;
      updated.predikat = updated.predikat || 'A';
      updated.keterangan = updated.nama_ekstra
        ? buildExtracurricularDescription(updated.predikat, updated.nama_ekstra)
        : '';
    } else if (field === 'predikat') {
      updated.predikat = value.toUpperCase();
      const matched = resolveMasterItem(updated.id_ekstra || updated.nama_ekstra);
      const eksName = matched ? matched.nama_ekstra : updated.nama_ekstra;
      updated.keterangan = eksName
        ? buildExtracurricularDescription(updated.predikat, eksName)
        : '';
    }

    currentSlots[slotIndex] = updated;
    setDraftStudentSlots(prev => ({
      ...prev,
      [student.id]: currentSlots
    }));

    // Jika id_ekstra sudah dipilih, langsung simpan ke MySQL
    if (updated.id_ekstra) {
      await saveStudentSlotsToMysql(student, currentSlots);
    }
  };

  const handleAddSlotForStudent = (student: Student) => {
    const currentSlots = [...(draftStudentSlots[student.id] || [])];
    if (currentSlots.length >= 3) {
      showToast('error', '1 Siswa maksimal mengikuti 3 Ekstrakurikuler.');
      return;
    }
    const defaultMaster = masterList[0];
    const nextSlot: StudentEkstraSlot = {
      id_ekstra: defaultMaster ? defaultMaster.id_ekstra : '',
      nama_ekstra: defaultMaster ? defaultMaster.nama_ekstra : '',
      predikat: 'A',
      keterangan: defaultMaster ? buildExtracurricularDescription('A', defaultMaster.nama_ekstra) : ''
    };
    const nextSlots = [...currentSlots, nextSlot];
    setDraftStudentSlots(prev => ({
      ...prev,
      [student.id]: nextSlots
    }));
    if (defaultMaster) {
      saveStudentSlotsToMysql(student, nextSlots);
    }
  };

  const handleRemoveSlotForStudent = async (student: Student, slotIndex: number) => {
    const currentSlots = [...(draftStudentSlots[student.id] || [])];
    currentSlots.splice(slotIndex, 1);
    setDraftStudentSlots(prev => ({
      ...prev,
      [student.id]: currentSlots
    }));
    await saveStudentSlotsToMysql(student, currentSlots);
  };

  // Filter daftar siswa
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter(s => s.status !== 'Lulus' && s.status !== 'Keluar' && s.status !== 'Mutasi')
      .filter(s => {
        if (filterGrade !== 'all' && !normClass(s.class).startsWith(filterGrade)) return false;
        if (filterClass !== 'all' && normClass(s.class) !== normClass(filterClass)) return false;
        if (filterEkstra !== 'all') {
          const slots = draftStudentSlots[s.id] || [];
          const hasEkstra = slots.some(
            sl => sl.id_ekstra.trim().toLowerCase() === filterEkstra.trim().toLowerCase()
          );
          if (!hasEkstra) return false;
        }
        if (q) {
          const matchName = (s.name || '').toLowerCase().includes(q);
          const matchNis = String(s.nis || '').toLowerCase().includes(q);
          const matchClass = (s.class || '').toLowerCase().includes(q);
          if (!matchName && !matchNis && !matchClass) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmpClass = normClass(a.class).localeCompare(normClass(b.class), 'id', { numeric: true });
        if (cmpClass !== 0) return cmpClass;
        return (a.name || '').localeCompare(b.name || '', 'id');
      });
  }, [students, filterGrade, filterClass, filterEkstra, searchQuery, draftStudentSlots]);

  // Download Template Excel (Tabel: NIS, Nama Siswa, id_ekstra, Predikat, Keterangan + Referensi id_ekstra & nama_ekstra)
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const targetStudents = filteredStudents.length > 0 ? filteredStudents : students;

    // Header utama di kolom A-E dan Referensi di kolom G-I pada Sheet 1
    const aoa: any[][] = [
      [
        'NIS',
        'Nama Siswa',
        'id_ekstra',
        'Predikat',
        'Keterangan',
        '',
        'REFERENSI ID_EKSTRA',
        'NAMA EKSTRAKURIKULER',
        'PANDUAN PREDIKAT & KETERANGAN OTOMATIS'
      ]
    ];

    const refMasterRows: Array<[string, string, string]> = [];
    const guideTexts = [
      'A = Sangat Baik (Contoh: Sangat Baik dalam mengikuti Materi Ekstrakurikuler Pramuka.)',
      'B = Baik (Contoh: Baik dalam mengikuti Materi Ekstrakurikuler Pramuka.)',
      'C = Cukup Baik (Contoh: Cukup Baik dalam mengikuti Materi Ekstrakurikuler Pramuka.)',
      'D = Kurang (Contoh: Kurang dalam mengikuti Materi Ekstrakurikuler Pramuka.)',
      'Catatan: 1 Siswa maksimal mengikuti 3 Ekstrakurikuler (Tambahkan baris dengan NIS sama jika ikut 2 atau 3 ekstra).',
      'Kolom Keterangan akan terisi otomatis berdasarkan Predikat dan id_ekstra.'
    ];

    const maxRefLen = Math.max(masterList.length, guideTexts.length, 1);
    for (let i = 0; i < maxRefLen; i++) {
      const m = masterList[i];
      const g = guideTexts[i] || '';
      refMasterRows.push([m ? m.id_ekstra : '', m ? m.nama_ekstra : '', g]);
    }

    // Baris data siswa (jika sudah punya nilai di MySQL tampilkan semua slotnya 1..3, jika belum tampilkan 1 baris kosong)
    const studentDataRows: Array<[string, string, string, string, string]> = [];
    targetStudents.forEach(st => {
      const slots = (draftStudentSlots[st.id] || []).filter(s => s.id_ekstra);
      if (slots.length > 0) {
        slots.slice(0, 3).forEach(sl => {
          const matched = resolveMasterItem(sl.id_ekstra || sl.nama_ekstra);
          const eksId = matched ? matched.id_ekstra : sl.id_ekstra;
          const eksNama = matched ? matched.nama_ekstra : sl.nama_ekstra;
          const pred = (sl.predikat || 'A').toUpperCase();
          const ket = buildExtracurricularDescription(pred, eksNama, sl.keterangan);
          studentDataRows.push([String(st.nis || ''), st.name, eksId, pred, ket]);
        });
      } else {
        const sampleId = masterList[0]?.id_ekstra || '';
        const sampleNama = masterList[0]?.nama_ekstra || '';
        studentDataRows.push([
          String(st.nis || ''),
          st.name,
          '',
          '',
          sampleId && sampleNama
            ? ''
            : ''
        ]);
      }
    });

    const totalRows = Math.max(studentDataRows.length, refMasterRows.length);
    for (let r = 0; r < totalRows; r++) {
      const sRow = studentDataRows[r] || ['', '', '', '', ''];
      const refRow = refMasterRows[r] || ['', '', ''];
      aoa.push([
        sRow[0],
        sRow[1],
        sRow[2],
        sRow[3],
        sRow[4],
        '',
        refRow[0],
        refRow[1],
        refRow[2]
      ]);
    }

    const wsInput = XLSX.utils.aoa_to_sheet(aoa);
    wsInput['!cols'] = [
      { wch: 15 }, // NIS
      { wch: 32 }, // Nama Siswa
      { wch: 16 }, // id_ekstra
      { wch: 12 }, // Predikat
      { wch: 58 }, // Keterangan
      { wch: 4 },  // Spacer
      { wch: 22 }, // Referensi id_ekstra
      { wch: 28 }, // Referensi nama_ekstra
      { wch: 68 }  // Panduan Predikat
    ];
    XLSX.utils.book_append_sheet(wb, wsInput, 'Template_Nilai_Ekstra');

    // Sheet 2: Referensi Daftar Ekstrakurikuler & Predikat
    const refSheetAoa: any[][] = [
      ['DAFTAR REFERENSI EKSTRAKURIKULER'],
      ['id_ekstra', 'nama_ekstra'],
      ...(masterList.length > 0
        ? masterList.map(m => [m.id_ekstra, m.nama_ekstra])
        : [['EKS-01', 'Pramuka (Contoh - Silakan input di Daftar Ekstrakurikuler)']]),
      [],
      ['REFERENSI PREDIKAT & KETERANGAN OTOMATIS'],
      ['Predikat', 'Arti Predikat', 'Contoh Kalimat Keterangan Otomatis'],
      ['A', 'Sangat Baik', 'Sangat Baik dalam mengikuti Materi Ekstrakurikuler (Nama ekstra).'],
      ['B', 'Baik', 'Baik dalam mengikuti Materi Ekstrakurikuler (Nama ekstra).'],
      ['C', 'Cukup Baik', 'Cukup Baik dalam mengikuti Materi Ekstrakurikuler (Nama ekstra).'],
      ['D', 'Kurang', 'Kurang dalam mengikuti Materi Ekstrakurikuler (Nama ekstra).']
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refSheetAoa);
    wsRef['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 65 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi_Ekstra');

    const classSuffix = filterClass !== 'all' ? `_Kelas_${filterClass}` : '';
    XLSX.writeFile(
      wb,
      `Template_Nilai_Ekstrakurikuler_${selectedSemester}_${selectedAcademicYear.replace('/', '-')}${classSuffix}.xlsx`
    );
  };

  // Export Nilai Ekstrakurikuler ke Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const exportRows: any[] = [];

    filteredStudents.forEach(st => {
      const slots = (draftStudentSlots[st.id] || []).filter(s => s.id_ekstra || s.nama_ekstra);
      if (slots.length === 0) {
        exportRows.push({
          NIS: String(st.nis || ''),
          'Nama Siswa': st.name,
          Kelas: st.class,
          id_ekstra: '-',
          nama_ekstra: '-',
          Predikat: '-',
          Keterangan: '-'
        });
      } else {
        slots.slice(0, 3).forEach(sl => {
          const matched = resolveMasterItem(sl.id_ekstra || sl.nama_ekstra);
          const idEks = matched ? matched.id_ekstra : sl.id_ekstra;
          const namaEks = matched ? matched.nama_ekstra : (sl.nama_ekstra || sl.id_ekstra);
          const pred = (sl.predikat || 'A').toUpperCase();
          const ket = buildExtracurricularDescription(pred, namaEks, sl.keterangan);
          exportRows.push({
            NIS: String(st.nis || ''),
            'Nama Siswa': st.name,
            Kelas: st.class,
            id_ekstra: idEks,
            nama_ekstra: namaEks,
            Predikat: pred,
            Keterangan: ket
          });
        });
      }
    });

    const wsData = XLSX.utils.json_to_sheet(exportRows);
    wsData['!cols'] = [
      { wch: 15 },
      { wch: 32 },
      { wch: 10 },
      { wch: 16 },
      { wch: 26 },
      { wch: 12 },
      { wch: 60 }
    ];
    XLSX.utils.book_append_sheet(wb, wsData, 'Nilai_Ekstrakurikuler');

    const wsRef = XLSX.utils.json_to_sheet(
      masterList.map(m => ({
        id_ekstra: m.id_ekstra,
        nama_ekstra: m.nama_ekstra
      }))
    );
    wsRef['!cols'] = [{ wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi_Ekstra');

    const classSuffix = filterClass !== 'all' ? `_Kelas_${filterClass}` : '';
    XLSX.writeFile(
      wb,
      `Data_Nilai_Ekstrakurikuler_${selectedSemester}_${selectedAcademicYear.replace('/', '-')}${classSuffix}.xlsx`
    );
  };

  // Import Excel langsung ke MySQL
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showToast('error', 'File Excel kosong atau tidak terbaca.');
        return;
      }

      // Kelompokkan per siswa (maksimal 3 ekstrakurikuler per siswa)
      const groupedByStudentId = new Map<
        string,
        {
          student: Student;
          items: Array<{
            id_ekstra: string;
            nama_ekstra: string;
            predikat: string;
            keterangan: string;
          }>;
        }
      >();

      let matchedRowCount = 0;
      for (const row of rawRows) {
        const getCol = (candidates: string[]): string => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
            if (candidates.includes(cleanKey)) {
              return String(row[key] ?? '').trim();
            }
          }
          return '';
        };

        const rawNis = getCol(['nis', 'nomorinduk', 'nisn']);
        const rawNama = getCol(['namasiswa', 'nama', 'namamurid', 'studentname']);
        const rawIdEkstra = getCol(['idekstra', 'kodeekstra', 'id', 'ekstrakurikuler', 'namaekstra']);
        const rawPredikat = getCol(['predikat', 'nilai', 'grade']) || 'A';

        if (!rawNis && !rawNama) continue;
        if (!rawIdEkstra || rawIdEkstra === '-') continue;

        const studentObj = students.find(s => {
          if (rawNis && String(s.nis || '').trim() === rawNis) return true;
          if (rawNama && s.name.trim().toLowerCase() === rawNama.toLowerCase()) return true;
          return false;
        });

        if (!studentObj) continue;

        const matchedMaster = resolveMasterItem(rawIdEkstra);
        const idEkstra = matchedMaster ? matchedMaster.id_ekstra : rawIdEkstra;
        const namaEkstra = matchedMaster
          ? matchedMaster.nama_ekstra
          : masterMap.get(rawIdEkstra.toLowerCase()) || rawIdEkstra;

        const normPred = ['A', 'B', 'C', 'D'].includes(rawPredikat.toUpperCase())
          ? rawPredikat.toUpperCase()
          : 'A';

        const autoKeterangan = buildExtracurricularDescription(normPred, namaEkstra);

        if (!groupedByStudentId.has(studentObj.id)) {
          groupedByStudentId.set(studentObj.id, {
            student: studentObj,
            items: []
          });
        }
        const bucket = groupedByStudentId.get(studentObj.id)!;
        // Cegah duplikasi id_ekstra pada siswa yang sama dan batasi maksimal 3 ekstra
        const existingIdx = bucket.items.findIndex(
          it => it.id_ekstra.toLowerCase() === idEkstra.toLowerCase()
        );
        if (existingIdx >= 0) {
          bucket.items[existingIdx] = {
            id_ekstra: idEkstra,
            nama_ekstra: namaEkstra,
            predikat: normPred,
            keterangan: autoKeterangan
          };
          matchedRowCount++;
        } else if (bucket.items.length < 3) {
          bucket.items.push({
            id_ekstra: idEkstra,
            nama_ekstra: namaEkstra,
            predikat: normPred,
            keterangan: autoKeterangan
          });
          matchedRowCount++;
        }
      }

      if (groupedByStudentId.size === 0) {
        showToast(
          'error',
          'Tidak ada baris nilai ekstrakurikuler valid yang cocok dengan NIS/Nama Siswa dan id_ekstra.'
        );
        return;
      }

      const entriesPayload = Array.from(groupedByStudentId.values()).map(({ student, items }) => ({
        student_id: student.id,
        nis: String(student.nis || '').trim(),
        student_name: student.name,
        class_name: student.class,
        semester: selectedSemester,
        academic_year: selectedAcademicYear,
        items: items.slice(0, 3).map((it, idx) => ({
          ...it,
          no_urut: idx + 1
        }))
      }));

      const res = await fetch('/api/curriculum/extracurricular/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: selectedSemester,
          academicYear: selectedAcademicYear,
          entries: entriesPayload
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          'success',
          `Berhasil mengimpor ${matchedRowCount} nilai ekstrakurikuler untuk ${groupedByStudentId.size} siswa langsung ke database MySQL.`
        );
        await fetchMysqlExtracurricularData();
        if (onRefreshRaporData) await onRefreshRaporData();
      } else {
        showToast('error', json.error || 'Gagal menyimpan hasil impor ke database MySQL.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal memproses file Excel: ' + (err?.message || String(err)));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hitung statistik ringkas
  const totalStudentsWithEkstra = useMemo(() => {
    let count = 0;
    Object.values(draftStudentSlots).forEach(slots => {
      if (slots.some(s => s.id_ekstra)) count++;
    });
    return count;
  }, [draftStudentSlots]);

  return (
    <div className="space-y-6">
      {/* Banner Informasi Penyimpanan Murni MySQL */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
            <Award className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold tracking-tight">
                Manajemen & Input Nilai Ekstrakurikuler
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                <Database className="w-3 h-3" /> Tersimpan Langsung di MySQL
              </span>
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              Semester <span className="font-bold text-white">{selectedSemester}</span> • Tahun Ajaran{' '}
              <span className="font-bold text-white">{selectedAcademicYear}</span> • Maksimal 3 Ekstrakurikuler per Murid (Otomatis tampil 1, 2, atau 3 baris di Rapor Akhir Semester).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <div className="bg-white/10 border border-white/15 rounded-xl px-3.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">
              Daftar Ekstra
            </div>
            <div className="text-base font-extrabold text-white">{masterList.length}</div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl px-3.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">
              Murid Terinput
            </div>
            <div className="text-base font-extrabold text-amber-300">{totalStudentsWithEkstra}</div>
          </div>
          <button
            type="button"
            onClick={fetchMysqlExtracurricularData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
            title="Muat Ulang dari Database MySQL"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
             Sinkron MySQL
          </button>
        </div>
      </div>

      {/* Notifikasi Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-semibold shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BAGIAN 1: INPUT DAFTAR EKSTRAKURIKULER (id_ekstra & nama_ekstra) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center text-xs font-black">
                1
              </span>
              Input Daftar Ekstrakurikuler (Master Ekstrakurikuler)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola referensi <code className="font-mono font-bold text-slate-700">id_ekstra</code> dan{' '}
              <code className="font-mono font-bold text-slate-700">nama_ekstra</code> yang digunakan pada tabel nilai dan template Excel.
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Input id_ekstra & nama_ekstra */}
          <form onSubmit={handleSaveMaster} className="lg:col-span-5 space-y-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{editingOldIdEkstra ? `Edit Ekstrakurikuler (${editingOldIdEkstra})` : 'Tambah Ekstrakurikuler Baru'}</span>
              {editingOldIdEkstra && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingOldIdEkstra(null);
                    setFormIdEkstra('');
                    setFormNamaEkstra('');
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  Batal Edit
                </button>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                ID Ekstrakurikuler (<code className="font-mono">id_ekstra</code>)
              </label>
              <input
                type="text"
                value={formIdEkstra}
                onChange={e => setFormIdEkstra(e.target.value)}
                placeholder="Contoh: EKS-01"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-mono font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nama Ekstrakurikuler (<code className="font-mono">nama_ekstra</code>)
              </label>
              <input
                type="text"
                value={formNamaEkstra}
                onChange={e => setFormNamaEkstra(e.target.value)}
                placeholder="Contoh: Pramuka / Banjari / Futsal"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-semibold"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSavingMaster}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {editingOldIdEkstra ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isSavingMaster
                ? 'Menyimpan ke MySQL...'
                : editingOldIdEkstra
                ? 'Simpan Perubahan ke MySQL'
                : 'Simpan ke Daftar Ekstrakurikuler'}
            </button>
          </form>

          {/* Tabel Daftar Ekstrakurikuler */}
          <div className="lg:col-span-7">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-extrabold uppercase">
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 w-36">id_ekstra</th>
                    <th className="py-2.5 px-3">nama_ekstra</th>
                    <th className="py-2.5 px-3 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {masterList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Belum ada daftar ekstrakurikuler di database MySQL. Silakan tambahkan di formulir samping.
                      </td>
                    </tr>
                  ) : (
                    masterList.map((item, idx) => (
                      <tr key={item.id_ekstra} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">{item.id_ekstra}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.nama_ekstra}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditMasterClick(item)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                              title="Edit Ekstrakurikuler"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaster(item.id_ekstra, item.nama_ekstra)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Ekstrakurikuler"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {/* BAGIAN 2: INPUT NILAI EKSTRAKURIKULER (IMPORT, EXPORT, TEMPLATE & TABEL INTERAKTIF) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center text-xs font-black">
                2
              </span>
              Input Nilai Ekstrakurikuler Siswa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Keterangan otomatis: <span className="font-semibold text-slate-700">A = Sangat Baik</span>,{' '}
              <span className="font-semibold text-slate-700">B = Baik</span>,{' '}
              <span className="font-semibold text-slate-700">C = Cukup Baik</span>,{' '}
              <span className="font-semibold text-slate-700">D = Kurang</span>. (Maksimal 3 Ekstrakurikuler per Siswa).
            </p>
          </div>

          {/* Tombol Template, Import, Export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Template
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Mengimpor ke MySQL...' : 'Import Excel'}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Baris Filter Kelas, Ekstra, dan Pencarian */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tingkat Kelas</label>
            <select
              value={filterGrade}
              onChange={e => {
                setFilterGrade(e.target.value);
                setFilterClass('all');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50"
            >
              <option value="all">Semua Tingkat (7, 8, 9)</option>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Rombel / Kelas</label>
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses
                .filter(c => filterGrade === 'all' || normClass(c).startsWith(filterGrade))
                .map(c => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Ekstrakurikuler</label>
            <select
              value={filterEkstra}
              onChange={e => setFilterEkstra(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50"
            >
              <option value="all">Semua Ekstrakurikuler</option>
              {masterList.map(m => (
                <option key={m.id_ekstra} value={m.id_ekstra}>
                  {m.id_ekstra} - {m.nama_ekstra}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Cari NIS / Nama Siswa</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik NIS atau Nama Siswa..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Tabel Input Nilai Ekstrakurikuler: NIS, Nama Siswa, id_ekstra, Predikat, Keterangan */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-28">NIS</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Siswa</th>
                <th className="py-3 px-3 w-20 text-center">Kelas</th>
                <th className="py-3 px-3 w-64">id_ekstra (Pilih Ekstra)</th>
                <th className="py-3 px-3 w-36 text-center">Predikat</th>
                <th className="py-3 px-3 min-w-[280px]">Keterangan (Otomatis)</th>
                <th className="py-3 px-3 w-36 text-center">Aksi (Maks 3)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                    Tidak ada data siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, stIdx) => {
                  const slots = draftStudentSlots[student.id] || [];
                  const displaySlots: StudentEkstraSlot[] =
                    slots.length > 0
                      ? slots.slice(0, 3)
                      : [{ id_ekstra: '', nama_ekstra: '', predikat: 'A', keterangan: '' }];
                  const isSavingThisStudent = savingStudentId === student.id;

                  return displaySlots.map((slot, slotIdx) => {
                    const matchedMaster = resolveMasterItem(slot.id_ekstra || slot.nama_ekstra);
                    const currentIdEkstra = matchedMaster ? matchedMaster.id_ekstra : slot.id_ekstra;
                    const currentNamaEkstra = matchedMaster ? matchedMaster.nama_ekstra : slot.nama_ekstra;
                    const autoKeterangan = currentNamaEkstra
                      ? buildExtracurricularDescription(slot.predikat || 'A', currentNamaEkstra, slot.keterangan)
                      : '-';

                    return (
                      <tr
                        key={`${student.id}_slot_${slotIdx}`}
                        className={`hover:bg-emerald-50/30 transition ${
                          slotIdx > 0 ? 'bg-slate-50/50' : ''
                        }`}
                      >
                        {slotIdx === 0 && (
                          <>
                            <td
                              rowSpan={displaySlots.length}
                              className="py-2.5 px-3 text-center font-bold text-slate-500 align-top border-r border-slate-100"
                            >
                              {stIdx + 1}
                            </td>
                            <td
                              rowSpan={displaySlots.length}
                              className="py-2.5 px-3 font-mono font-bold text-slate-700 align-top border-r border-slate-100"
                            >
                              {student.nis}
                            </td>
                            <td
                              rowSpan={displaySlots.length}
                              className="py-2.5 px-3 font-bold text-slate-800 align-top border-r border-slate-100"
                            >
                              <div>{student.name}</div>
                              {slots.filter(s => s.id_ekstra).length > 0 && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Mengikuti {slots.filter(s => s.id_ekstra).length} Ekstra
                                </span>
                              )}
                            </td>
                            <td
                              rowSpan={displaySlots.length}
                              className="py-2.5 px-3 text-center font-bold text-slate-600 align-top border-r border-slate-100"
                            >
                              {student.class}
                            </td>
                          </>
                        )}

                        {/* Pilihan id_ekstra */}
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold inline-flex items-center justify-center shrink-0">
                              {slotIdx + 1}
                            </span>
                            <select
                              value={currentIdEkstra}
                              onChange={e =>
                                handleSlotChange(student, slotIdx, 'id_ekstra', e.target.value)
                              }
                              disabled={isSavingThisStudent}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Pilih id_ekstra --</option>
                              {masterList.map(m => (
                                <option key={m.id_ekstra} value={m.id_ekstra}>
                                  {m.id_ekstra} — {m.nama_ekstra}
                                </option>
                              ))}
                              {currentIdEkstra &&
                                !masterList.some(
                                  m => m.id_ekstra.toLowerCase() === currentIdEkstra.toLowerCase()
                                ) && (
                                  <option value={currentIdEkstra}>
                                    {currentIdEkstra} — {currentNamaEkstra}
                                  </option>
                                )}
                            </select>
                          </div>
                        </td>

                        {/* Pilihan Predikat */}
                        <td className="py-2 px-3 text-center align-middle">
                          <select
                            value={(slot.predikat || 'A').toUpperCase()}
                            onChange={e =>
                              handleSlotChange(student, slotIdx, 'predikat', e.target.value)
                            }
                            disabled={!currentIdEkstra || isSavingThisStudent}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="A">A (Sangat Baik)</option>
                            <option value="B">B (Baik)</option>
                            <option value="C">C (Cukup Baik)</option>
                            <option value="D">D (Kurang)</option>
                          </select>
                        </td>

                        {/* Keterangan Otomatis */}
                        <td className="py-2 px-3 align-middle text-slate-700 font-medium">
                          {currentIdEkstra ? (
                            <span className="text-slate-800">{autoKeterangan}</span>
                          ) : (
                            <span className="text-slate-400 italic">
                              Pilih id_ekstra untuk menampilkan keterangan otomatis
                            </span>
                          )}
                        </td>

                        {/* Aksi Tambah/Hapus Slot Ekstra (Maksimal 3) */}
                        <td className="py-2 px-3 text-center align-middle">
                          <div className="inline-flex items-center gap-1">
                            {currentIdEkstra && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlotForStudent(student, slotIdx)}
                                disabled={isSavingThisStudent}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                                title="Hapus Ekstrakurikuler Ini"
                              >
                                Hapus
                              </button>
                            )}
                            {slotIdx === displaySlots.length - 1 &&
                              displaySlots.length < 3 &&
                              currentIdEkstra && (
                                <button
                                  type="button"
                                  onClick={() => handleAddSlotForStudent(student)}
                                  disabled={isSavingThisStudent}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                                  title="Tambah Ekstrakurikuler Ke-2 / Ke-3"
                                >
                                  + Ekstra ({displaySlots.length}/3)
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default WakaExtracurricularView;
