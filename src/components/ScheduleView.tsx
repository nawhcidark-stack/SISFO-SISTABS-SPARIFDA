import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ClassSchedule, SubjectTeacher, HomeroomTeacher } from '../types';
import { 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Layers, 
  UserCheck, 
  BarChart2, 
  RefreshCw,
  X,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  CheckSquare
} from 'lucide-react';

interface ScheduleViewProps {
  role: 'waka_kurikulum' | 'admin' | 'principal' | 'bk' | 'homeroom' | 'subject_teacher' | 'student';
  schedules: ClassSchedule[];
  onRefreshSchedule: () => void;
  availableClasses: string[];
  subjectTeachers: SubjectTeacher[];
  homerooms: HomeroomTeacher[];
  userClass?: string;
  userTeacherId?: string;
  userTeacherName?: string;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export function parseJamRange(jamStr: string): [number, number] {
  if (!jamStr) return [1, 1];
  const cleaned = String(jamStr).replace(/[^0-9-]/g, '');
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    if (parts.length >= 2) return [Math.min(parts[0], parts[1]), Math.max(parts[0], parts[1])];
    if (parts.length === 1) return [parts[0], parts[0]];
  }
  const num = parseInt(cleaned, 10);
  if (!isNaN(num)) return [num, num];
  return [1, 1];
}

export function doesJamOverlap(jamA: string, jamB: string): boolean {
  if (!jamA || !jamB) return false;
  if (jamA.trim() === jamB.trim()) return true;
  const [aStart, aEnd] = parseJamRange(jamA);
  const [bStart, bEnd] = parseJamRange(jamB);
  return Math.max(aStart, bStart) <= Math.min(aEnd, bEnd);
}

export default function ScheduleView({
  role,
  schedules,
  onRefreshSchedule,
  availableClasses,
  subjectTeachers,
  homerooms,
  userClass,
  userTeacherId,
  userTeacherName
}: ScheduleViewProps) {
  const isEditable = role === 'waka_kurikulum';

  // Sub tab: 'class_matrix' | 'teacher_workload' | 'teacher_mapping' | 'my_schedule' | 'manage'
  const [viewSubTab, setViewSubTab] = useState<'class_matrix' | 'teacher_workload' | 'teacher_mapping' | 'my_schedule' | 'manage'>(
    'class_matrix'
  );

  React.useEffect(() => {
    if (role !== 'waka_kurikulum') {
      setViewSubTab('class_matrix');
    }
  }, [role]);

  const [selectedClass, setSelectedClass] = useState<string>(
    userClass || (availableClasses.length > 0 ? availableClasses[0] : '7-A')
  );
  
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Matrix View Column Slot Mode: 'single' (0, 1, 2, 3 ... 10)
  const [matrixJamMode, setMatrixJamMode] = useState<'single'>('single');

  const activeJamSlots = useMemo(() => {
    if (matrixJamMode === 'single') {
      return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    }
    if (matrixJamMode === 'all_pairs') {
      return ['0', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'];
    }
    return ['0', '1-2', '3-4', '5-6', '7-8', '9-10'];
  }, [matrixJamMode]);

  // Form Modal States for Waka Kurikulum
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formDay, setFormDay] = useState<typeof DAYS[number]>('Senin');
  const [formClassName, setFormClassName] = useState<string>(availableClasses[0] || '7-A');
  const [formSubject, setFormSubject] = useState<string>('Matematika');
  const [formTeacher, setFormTeacher] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [formJamKe, setFormJamKe] = useState<string>('1-2');
  const [customJamInput, setCustomJamInput] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('07:00');
  const [formEndTime, setFormEndTime] = useState<string>('08:20');
  const [formAlokasi, setFormAlokasi] = useState<string>('2 JP');

  // Clash Error Modal
  const [clashError, setClashError] = useState<string | null>(null);
  const [pendingClashPayload, setPendingClashPayload] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Excel / CSV Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'update' | 'replace' | 'append'>('update');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Multi-select & Search States for Manage All Schedules
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [manageSearchQuery, setManageSearchQuery] = useState<string>('');

  // Combined teacher list (Subject Teachers + Homerooms)
  const allTeachersList = useMemo(() => {
    const list: { id: string; username: string; name: string; roleStr: string; mainSubject: string }[] = [];
    const seenKeys = new Set<string>();

    subjectTeachers.forEach(st => {
      const key = (st.id || st.username || st.name).trim().toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          id: st.id || st.username || `st-${Date.now()}`,
          username: st.username || st.id || '',
          name: st.name,
          roleStr: 'Guru Mapel',
          mainSubject: st.subject || 'Mapel'
        });
      }
    });

    homerooms.forEach(hr => {
      const key = (hr.id || hr.username || hr.name).trim().toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          id: hr.id || hr.username || `hr-${Date.now()}`,
          username: hr.username || hr.id || '',
          name: hr.name,
          roleStr: `Wali Kelas ${hr.className}`,
          mainSubject: 'Tematik/Mapel'
        });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [subjectTeachers, homerooms]);

  // Filtered schedules for Manage view
  const filteredManageSchedules = useMemo(() => {
    if (!manageSearchQuery.trim()) return schedules;
    const q = manageSearchQuery.toLowerCase().trim();
    return schedules.filter(s =>
      s.day.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      s.teacherName.toLowerCase().includes(q) ||
      (s.teacherId && s.teacherId.toLowerCase().includes(q)) ||
      s.jamKe.toLowerCase().includes(q)
    );
  }, [schedules, manageSearchQuery]);

  const isAllSelected = useMemo(() => {
    if (filteredManageSchedules.length === 0) return false;
    return filteredManageSchedules.every(s => selectedScheduleIds.includes(s.id));
  }, [filteredManageSchedules, selectedScheduleIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedScheduleIds(prev => prev.filter(id => !filteredManageSchedules.some(s => s.id === id)));
    } else {
      const newIds = new Set([...selectedScheduleIds, ...filteredManageSchedules.map(s => s.id)]);
      setSelectedScheduleIds(Array.from(newIds));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedScheduleIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSchedules = async () => {
    if (selectedScheduleIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedScheduleIds.length} jadwal pelajaran yang dipilih?`)) return;

    try {
      const res = await fetch('/api/curriculum/schedules/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedScheduleIds })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus jadwal terpilih.');
      }
      setSelectedScheduleIds([]);
      onRefreshSchedule();
      setFeedback({ type: 'success', text: `Berhasil menghapus ${data.deletedCount || selectedScheduleIds.length} jadwal pelajaran.` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menghapus jadwal.' });
    }
  };

  // --- TEMPLATE EXCEL / CSV DOWNLOAD & IMPORT HANDLERS ---
  const SAMPLE_SCHEDULE_ROWS = useMemo(() => {
    const t0 = allTeachersList[0] || { name: 'Budi Santoso, S.Pd.', username: 'budi_santoso', id: 'budi_santoso' };
    const t1 = allTeachersList[1] || { name: 'Siti Aminah, M.Pd.', username: 'siti_aminah', id: 'siti_aminah' };
    const t2 = allTeachersList[2] || { name: 'Ahmad Dahlan, S.Pd.', username: 'ahmad_dahlan', id: 'ahmad_dahlan' };
    const t3 = allTeachersList[3] || { name: 'Dedi Kurniawan, S.Kom.', username: 'dedi_kurniawan', id: 'dedi_kurniawan' };
    const t4 = allTeachersList[4] || { name: 'Drs. H. Abdullah', username: 'abdullah', id: 'abdullah' };
    const t5 = allTeachersList[5] || { name: 'NUR AINI, S.Pd.', username: 'nur_aini', id: 'nur_aini' };

    return [
      ['Hari', 'Kelas', 'Mata Pelajaran', 'Nama Guru', 'ID / Username Guru', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Alokasi JP'],
      ['Senin', '7-A', 'Matematika', t0.name, t0.username || t0.id, '1-2', '07:00', '08:20', '2 JP'],
      ['Senin', '7-A', 'IPA', t1.name, t1.username || t1.id, '3-4', '08:20', '09:40', '2 JP'],
      ['Selasa', '8-B', 'Bahasa Indonesia', t2.name, t2.username || t2.id, '1-2', '07:00', '08:20', '2 JP'],
      ['Rabu', '9-C', 'Informatika', t3.name, t3.username || t3.id, '5-6', '10:00', '11:20', '2 JP'],
      ['Kamis', '7-B', 'Pendidikan Agama', t4.name, t4.username || t4.id, '1-2', '07:00', '08:20', '2 JP'],
      ['Jumat', '8-A', 'Pendidikan Pancasila', t5.name, t5.username || t5.id, '1-2', '07:00', '08:20', '2 JP']
    ];
  }, [allTeachersList]);

  const downloadTemplateExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Jadwal Pelajaran
    const wsJadwal = XLSX.utils.aoa_to_sheet(SAMPLE_SCHEDULE_ROWS);
    const range = XLSX.utils.decode_range(wsJadwal['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (wsJadwal[cell_address]) {
          wsJadwal[cell_address].t = 's';
          wsJadwal[cell_address].z = '@';
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, wsJadwal, "Template Jadwal");

    // Sheet 2: Reference List of Teachers (Guru & Wali Kelas)
    const teacherRefRows = [
      ['No', 'Nama Guru / Wali Kelas', 'ID / Username Guru', 'Peran / Jabatan', 'Mata Pelajaran / Kelas Utama'],
      ...allTeachersList.map((t, idx) => [
        idx + 1,
        t.name,
        t.username || t.id,
        t.roleStr,
        t.mainSubject
      ])
    ];

    const wsGuru = XLSX.utils.aoa_to_sheet(teacherRefRows);
    XLSX.utils.book_append_sheet(wb, wsGuru, "Daftar ID Guru (Referensi)");

    XLSX.writeFile(wb, "template_import_jadwal_pelajaran.xlsx");
  };

  const downloadTemplateCSV = () => {
    let csvRows = SAMPLE_SCHEDULE_ROWS.map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(","));

    // Add reference section in CSV
    csvRows.push("");
    csvRows.push('"--- DAFTAR REFERENSI ID / USERNAME GURU TERDAFTAR ---"');
    csvRows.push('"No","Nama Guru / Wali Kelas","ID / Username Guru","Peran","Mapel / Kelas"');

    allTeachersList.forEach((t, idx) => {
      csvRows.push(`"${idx + 1}","${t.name.replace(/"/g, '""')}","${(t.username || t.id).replace(/"/g, '""')}","${t.roleStr.replace(/"/g, '""')}","${t.mainSubject.replace(/"/g, '""')}"`);
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_jadwal_pelajaran.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActiveSchedulesExcel = () => {
    const wb = XLSX.utils.book_new();

    const dataRows = [
      ['Hari', 'Kelas', 'Mata Pelajaran', 'Nama Guru', 'ID / Username Guru', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Alokasi JP'],
      ...schedules.map(sch => {
        const teacherObj = allTeachersList.find(t =>
          (t.id && sch.teacherId && t.id.toLowerCase() === sch.teacherId.toLowerCase()) ||
          (t.username && sch.teacherId && t.username.toLowerCase() === sch.teacherId.toLowerCase()) ||
          (t.name && sch.teacherName && t.name.trim().toLowerCase() === sch.teacherName.trim().toLowerCase())
        );
        const username = teacherObj?.username || teacherObj?.id || sch.teacherId || '-';
        return [
          sch.day,
          sch.className,
          sch.subject,
          sch.teacherName,
          username,
          sch.jamKe,
          sch.startTime || '07:00',
          sch.endTime || '08:20',
          sch.alokasiWaktu || '2 JP'
        ];
      })
    ];

    const wsJadwal = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, wsJadwal, "Data Jadwal Pelajaran");

    const teacherRefRows = [
      ['No', 'Nama Guru / Wali Kelas', 'ID / Username Guru', 'Peran / Jabatan', 'Mata Pelajaran / Kelas Utama'],
      ...allTeachersList.map((t, idx) => [
        idx + 1,
        t.name,
        t.username || t.id,
        t.roleStr,
        t.mainSubject
      ])
    ];

    const wsGuru = XLSX.utils.aoa_to_sheet(teacherRefRows);
    XLSX.utils.book_append_sheet(wb, wsGuru, "Daftar ID Guru (Referensi)");

    XLSX.writeFile(wb, `export_jadwal_pelajaran_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const exportActiveSchedulesCSV = () => {
    let csvRows = [
      ['Hari', 'Kelas', 'Mata Pelajaran', 'Nama Guru', 'ID / Username Guru', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Alokasi JP'].join(",")
    ];

    schedules.forEach(sch => {
      const teacherObj = allTeachersList.find(t =>
        (t.id && sch.teacherId && t.id.toLowerCase() === sch.teacherId.toLowerCase()) ||
        (t.username && sch.teacherId && t.username.toLowerCase() === sch.teacherId.toLowerCase()) ||
        (t.name && sch.teacherName && t.name.trim().toLowerCase() === sch.teacherName.trim().toLowerCase())
      );
      const username = teacherObj?.username || teacherObj?.id || sch.teacherId || '-';

      const row = [
        `"${sch.day}"`,
        `"${sch.className}"`,
        `"${sch.subject}"`,
        `"${sch.teacherName.replace(/"/g, '""')}"`,
        `"${username.replace(/"/g, '""')}"`,
        `"${sch.jamKe}"`,
        `"${sch.startTime || '07:00'}"`,
        `"${sch.endTime || '08:20'}"`,
        `"${sch.alokasiWaktu || '2 JP'}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export_jadwal_pelajaran_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTeacherWorkloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Sheet 1: Rekap Jam Mengajar Guru (JP/Minggu)
    const summaryRows: any[][] = [
      ["LAPORAN MONITORING JUMLAH JAM MENGAJAR GURU"],
      ["SEKOLAH: SMP MA'ARIF NU PANDAAN"],
      [`PERIODE: TAHUN AJARAN 2025/2026 - SEMESTER GENAP`],
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

    teacherWorkloadSummary.forEach((item, idx) => {
      const teacherObj = allTeachersList.find(t =>
        (t.id && item.teacherId && t.id.toLowerCase() === item.teacherId.toLowerCase()) ||
        (t.name && item.teacherName && t.name.trim().toLowerCase() === item.teacherName.trim().toLowerCase())
      );
      const username = teacherObj?.username || teacherObj?.id || item.teacherId || '-';
      const roleStr = teacherObj?.roleStr || (item.teacherName.toLowerCase().includes('wali') ? 'Wali Kelas' : 'Guru Pengampu');

      const dayJp: Record<string, number> = {
        'Senin': 0,
        'Selasa': 0,
        'Rabu': 0,
        'Kamis': 0,
        'Jumat': 0,
        'Sabtu': 0
      };

      schedules.forEach(sch => {
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
        username,
        roleStr,
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

    const totalJpAll = teacherWorkloadSummary.reduce((acc, t) => acc + t.totalJp, 0);
    const totalSesiAll = teacherWorkloadSummary.reduce((acc, t) => acc + t.schedulesCount, 0);
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
      { wch: 18 },
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

    // Sheet 2: Rincian Jadwal Pelajaran
    const detailRows: any[][] = [
      ['No', 'Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Nama Guru Pengampu', 'ID / Username Guru', 'Alokasi JP'],
      ...schedules
        .slice()
        .sort((a, b) => {
          const dayA = daysOrder.indexOf(a.day) >= 0 ? daysOrder.indexOf(a.day) : 99;
          const dayB = daysOrder.indexOf(b.day) >= 0 ? daysOrder.indexOf(b.day) : 99;
          if (dayA !== dayB) return dayA - dayB;
          return a.className.localeCompare(b.className);
        })
        .map((sch, idx) => {
          const teacherObj = allTeachersList.find(t =>
            (t.id && sch.teacherId && t.id.toLowerCase() === sch.teacherId.toLowerCase()) ||
            (t.username && sch.teacherId && t.username.toLowerCase() === sch.teacherId.toLowerCase()) ||
            (t.name && sch.teacherName && t.name.trim().toLowerCase() === sch.teacherName.trim().toLowerCase())
          );
          const username = teacherObj?.username || teacherObj?.id || sch.teacherId || '-';
          return [
            idx + 1,
            sch.day,
            sch.jamKe,
            `${sch.startTime || '07:00'} - ${sch.endTime || '08:20'}`,
            sch.className,
            sch.subject,
            sch.teacherName,
            username,
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

    XLSX.writeFile(wb, `monitoring_jam_mengajar_guru_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length < 2) {
          setImportError("File kosong atau tidak memiliki baris data jadwal.");
          setImportData([]);
          return;
        }

        const headers = json[0].map((h: any) => (h || '').toString().trim().toLowerCase());

        const dayIdx = headers.findIndex((h: string) => h.includes('hari') || h.includes('day'));
        const classIdx = headers.findIndex((h: string) => h.includes('kelas') || h.includes('class'));
        const subjectIdx = headers.findIndex((h: string) => h.includes('mapel') || h.includes('mata pelajaran') || h.includes('subject'));
        const teacherNameIdx = headers.findIndex((h: string) => (h.includes('nama guru') || h.includes('guru') || h.includes('teacher')) && !h.includes('id') && !h.includes('username'));
        const teacherIdIdx = headers.findIndex((h: string) => h.includes('id') || h.includes('username') || h.includes('nip'));
        const jamIdx = headers.findIndex((h: string) => h.includes('jam') || h.includes('slot'));
        const startIdx = headers.findIndex((h: string) => h.includes('mulai') || h.includes('start'));
        const endIdx = headers.findIndex((h: string) => h.includes('selesai') || h.includes('end'));
        const alokasiIdx = headers.findIndex((h: string) => h.includes('alokasi') || h.includes('jp'));

        const parsedRows: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const dayVal = (dayIdx !== -1 && row[dayIdx] !== undefined) ? row[dayIdx].toString().trim() : '';
          const classVal = (classIdx !== -1 && row[classIdx] !== undefined) ? row[classIdx].toString().trim().toUpperCase() : '';
          const subjectVal = (subjectIdx !== -1 && row[subjectIdx] !== undefined) ? row[subjectIdx].toString().trim() : '';
          
          let teacherVal = (teacherNameIdx !== -1 && row[teacherNameIdx] !== undefined) ? row[teacherNameIdx].toString().trim() : '';
          let teacherIdVal = (teacherIdIdx !== -1 && row[teacherIdIdx] !== undefined) ? row[teacherIdIdx].toString().trim() : '';

          // Fallback if header search didn't differentiate
          if (!teacherVal && teacherNameIdx === -1) {
            const fallbackTeacherIdx = headers.findIndex((h: string) => h.includes('guru') || h.includes('teacher'));
            if (fallbackTeacherIdx !== -1 && row[fallbackTeacherIdx] !== undefined) {
              teacherVal = row[fallbackTeacherIdx].toString().trim();
            }
          }

          const jamVal = (jamIdx !== -1 && row[jamIdx] !== undefined) ? row[jamIdx].toString().trim() : '1-2';
          const startVal = (startIdx !== -1 && row[startIdx] !== undefined) ? row[startIdx].toString().trim() : '07:00';
          const endVal = (endIdx !== -1 && row[endIdx] !== undefined) ? row[endIdx].toString().trim() : '08:20';
          const alokasiVal = (alokasiIdx !== -1 && row[alokasiIdx] !== undefined) ? row[alokasiIdx].toString().trim() : '2 JP';

          if (!dayVal && !classVal && !subjectVal && !teacherVal && !teacherIdVal) continue;

          // Match teacher by ID / Username or Name
          let matchedTeacher = allTeachersList.find(t =>
            teacherIdVal && (
              t.id.toLowerCase() === teacherIdVal.toLowerCase() ||
              t.username.toLowerCase() === teacherIdVal.toLowerCase()
            )
          );

          if (!matchedTeacher && teacherVal) {
            matchedTeacher = allTeachersList.find(t =>
              t.name.trim().toLowerCase() === teacherVal.toLowerCase() ||
              t.username.toLowerCase() === teacherVal.toLowerCase() ||
              t.id.toLowerCase() === teacherVal.toLowerCase()
            );
          }

          const finalTeacherName = matchedTeacher ? matchedTeacher.name : (teacherVal || 'Guru Pengampu');
          const finalTeacherId = matchedTeacher ? matchedTeacher.id : (teacherIdVal || teacherVal || '');

          const isValid = Boolean(dayVal && classVal && subjectVal && (teacherVal || teacherIdVal));

          parsedRows.push({
            rowNum: i + 1,
            day: dayVal || 'Senin',
            className: classVal || '7-A',
            subject: subjectVal || 'Mapel',
            teacherName: finalTeacherName,
            teacherId: finalTeacherId,
            teacherUsername: matchedTeacher ? matchedTeacher.username : (teacherIdVal || ''),
            jamKe: jamVal,
            startTime: startVal,
            endTime: endVal,
            alokasiWaktu: alokasiVal,
            isValid,
            validationMsg: isValid ? 'Valid' : 'Hari, Kelas, Mapel, atau Guru/ID Guru wajib diisi'
          });
        }

        if (parsedRows.length === 0) {
          setImportError("Tidak ditemukan data jadwal valid pada file.");
        }
        setImportData(parsedRows);
      } catch (err) {
        console.error(err);
        setImportError("Gagal membaca file Excel/CSV. Silakan periksa kembali format file Anda.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    if (importData.length === 0) return;
    const validRows = importData.filter(d => d.isValid);
    if (validRows.length === 0) {
      setImportError("Tidak ada baris jadwal yang valid untuk diimport.");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/api/curriculum/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validRows, mode: importMode })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal menyimpan data import jadwal.');
      }

      if (resData.updatedCount > 0 || resData.addedCount > 0) {
        setImportSuccess(`Berhasil memproses import! ${resData.updatedCount ? `${resData.updatedCount} jadwal diperbarui (cegah ganda), ` : ''}${resData.addedCount || 0} jadwal baru ditambahkan.`);
      } else {
        setImportSuccess(`Berhasil mengimport ${resData.count} data jadwal pelajaran!`);
      }
      onRefreshSchedule();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportData([]);
        setImportFile(null);
        setImportSuccess(null);
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || 'Terjadi kesalahan saat mengimport data.');
    } finally {
      setIsImporting(false);
    }
  };

  // Set default teacher form if empty
  React.useEffect(() => {
    if (!formTeacher.name && allTeachersList.length > 0) {
      setFormTeacher({ id: allTeachersList[0].id, name: allTeachersList[0].name });
    }
  }, [allTeachersList, formTeacher.name]);

  // Calculate Total Teaching Hours (Total JP) per teacher
  const teacherWorkloadSummary = useMemo(() => {
    const summaryMap: Record<string, {
      teacherId: string;
      teacherName: string;
      subjects: Set<string>;
      classes: Set<string>;
      totalJp: number;
      schedulesCount: number;
    }> = {};

    // Initialize map with all teachers
    allTeachersList.forEach(t => {
      summaryMap[t.name.trim().toLowerCase()] = {
        teacherId: t.id,
        teacherName: t.name,
        subjects: new Set(),
        classes: new Set(),
        totalJp: 0,
        schedulesCount: 0
      };
    });

    // Accumulate from schedules
    schedules.forEach(sch => {
      const key = (sch.teacherName || '').trim().toLowerCase();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          teacherId: sch.teacherId || '',
          teacherName: sch.teacherName,
          subjects: new Set(),
          classes: new Set(),
          totalJp: 0,
          schedulesCount: 0
        };
      }

      if (sch.subject) summaryMap[key].subjects.add(sch.subject);
      if (sch.className) summaryMap[key].classes.add(sch.className);

      // Parse JP from alokasiWaktu e.g. "2 JP" or jamKe "1-2"
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

    return Object.values(summaryMap).sort((a, b) => b.totalJp - a.totalJp);
  }, [allTeachersList, schedules]);

  // Filtered schedules for my_schedule
  const mySchedules = useMemo(() => {
    if (role === 'student' && userClass) {
      return schedules.filter(s => s.className.trim().toUpperCase() === userClass.trim().toUpperCase());
    }

    if (userTeacherName || userTeacherId) {
      return schedules.filter(s => {
        const matchId = userTeacherId && s.teacherId === userTeacherId;
        const matchName = userTeacherName && s.teacherName.trim().toLowerCase() === userTeacherName.trim().toLowerCase();
        const matchClass = userClass && s.className.trim().toUpperCase() === userClass.trim().toUpperCase();
        return matchId || matchName || matchClass;
      });
    }

    return schedules;
  }, [schedules, role, userClass, userTeacherId, userTeacherName]);

  const STANDARD_JAM_OPTIONS = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ];

  const handleJamKePresetChange = (val: string) => {
    setFormJamKe(val);
    if (val !== 'custom') {
      setCustomJamInput('');
      setFormAlokasi('1 JP');

      const timeMap: Record<string, { start: string; end: string }> = {
        '0': { start: '06:45', end: '07:15' },
        '1': { start: '07:15', end: '07:55' },
        '2': { start: '07:55', end: '08:35' },
        '3': { start: '08:35', end: '09:15' },
        '4': { start: '09:15', end: '09:55' },
        '5': { start: '10:30', end: '11:10' },
        '6': { start: '11:10', end: '11:50' },
        '7': { start: '11:50', end: '12:30' },
        '8': { start: '12:30', end: '13:10' },
        '9': { start: '13:10', end: '13:50' },
        '10': { start: '13:50', end: '14:30' },
      };

      if (timeMap[val]) {
        setFormStartTime(timeMap[val].start);
        setFormEndTime(timeMap[val].end);
      }
    }
  };

  // Open Form modal
  const handleOpenAddModal = (prefillTeacher?: { id: string; name: string; mainSubject?: string }) => {
    setEditingId(null);
    setFormDay('Senin');
    setFormClassName(selectedClass || availableClasses[0] || '7-A');
    setFormJamKe('1');
    setCustomJamInput('');
    setFormStartTime('07:15');
    setFormEndTime('07:55');
    setFormAlokasi('1 JP');
    setClashError(null);
    setPendingClashPayload(null);

    if (prefillTeacher) {
      setFormTeacher({ id: prefillTeacher.id, name: prefillTeacher.name });
      setFormSubject(prefillTeacher.mainSubject && prefillTeacher.mainSubject !== 'Tematik/Mapel' && prefillTeacher.mainSubject !== 'Mapel' ? prefillTeacher.mainSubject : 'Matematika');
    } else if (allTeachersList.length > 0) {
      const firstTeacher = allTeachersList[0];
      setFormTeacher({ id: firstTeacher.id, name: firstTeacher.name });
      setFormSubject(firstTeacher.mainSubject && firstTeacher.mainSubject !== 'Tematik/Mapel' && firstTeacher.mainSubject !== 'Mapel' ? firstTeacher.mainSubject : 'Matematika');
    } else {
      setFormSubject('Matematika');
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sch: ClassSchedule) => {
    setEditingId(sch.id);
    setFormDay(sch.day);
    setFormClassName(sch.className);
    setFormSubject(sch.subject);
    setFormTeacher({ id: sch.teacherId || '', name: sch.teacherName });
    
    if (STANDARD_JAM_OPTIONS.includes(sch.jamKe)) {
      setFormJamKe(sch.jamKe);
      setCustomJamInput('');
    } else {
      setFormJamKe('custom');
      setCustomJamInput(sch.jamKe);
    }

    setFormStartTime(sch.startTime || '07:00');
    setFormEndTime(sch.endTime || '08:20');
    setFormAlokasi(sch.alokasiWaktu || '2 JP');
    setClashError(null);
    setPendingClashPayload(null);
    setIsModalOpen(true);
  };

  // Submit Schedule to API
  const handleSaveSchedule = async (forceSave: boolean = false) => {
    setIsSaving(true);
    setFeedback(null);
    setClashError(null);

    const finalJamKe = formJamKe === 'custom' ? (customJamInput.trim() || '1') : formJamKe;

    const payload = {
      day: formDay,
      className: formClassName,
      subject: formSubject,
      teacherId: formTeacher.id,
      teacherName: formTeacher.name,
      jamKe: finalJamKe,
      startTime: formStartTime,
      endTime: formEndTime,
      alokasiWaktu: formAlokasi,
      force: forceSave
    };

    try {
      const url = editingId ? `/api/curriculum/schedules/${editingId}` : '/api/curriculum/schedules';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isClash) {
          setClashError(data.error || 'Terdeteksi Benturan Jam Mengajar!');
          setPendingClashPayload(payload);
          return;
        }
        throw new Error(data.error || 'Gagal menyimpan jadwal');
      }

      setFeedback({ type: 'success', text: editingId ? 'Jadwal berhasil diperbarui!' : 'Jadwal baru berhasil ditambahkan!' });
      setIsModalOpen(false);
      setPendingClashPayload(null);
      onRefreshSchedule();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;

    try {
      const res = await fetch(`/api/curriculum/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus jadwal');
      setFeedback({ type: 'success', text: 'Jadwal berhasil dihapus.' });
      onRefreshSchedule();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message || 'Gagal menghapus jadwal' });
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Top Banner & Control Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider mb-2">
              <Calendar size={12} className="text-indigo-400" />
              Sistem Jadwal Mengajar & Beban Mengajar Terintegrasi
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Jadwal Pelajaran & Alokasi Mengajar Guru</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Deteksi otomatis benturan jadwal, sinkronisasi pengisian Jurnal KBM, dan pemantauan jumlah jam mengajar (JP/minggu) secara komprehensif.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRefreshSchedule}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Muat Ulang</span>
            </button>

            {isEditable && (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Plus size={15} />
                <span>Tambah Jadwal Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* View Sub-Tabs (Waka Kurikulum Only) */}
        {role === 'waka_kurikulum' && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
            <button
              onClick={() => setViewSubTab('class_matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                viewSubTab === 'class_matrix'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers size={14} />
              <span>Matriks Jadwal Per Kelas</span>
            </button>

            <button
              onClick={() => setViewSubTab('teacher_mapping')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                viewSubTab === 'teacher_mapping'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BookOpen size={14} />
              <span>Guru & Mapel Diampu</span>
            </button>

            <button
              onClick={() => setViewSubTab('teacher_workload')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                viewSubTab === 'teacher_workload'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart2 size={14} />
              <span>Monitoring Jam Mengajar (JP Guru)</span>
            </button>

            <button
              onClick={() => setViewSubTab('manage')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                viewSubTab === 'manage'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Edit3 size={14} />
              <span>Kelola Seluruh Daftar Jadwal ({schedules.length})</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* VIEW 1: MY SCHEDULE / JADWAL SAYA */}
      {viewSubTab === 'my_schedule' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-indigo-600" />
                  <span>{role === 'student' ? `Jadwal Pelajaran Kelas ${userClass || ''}` : `Jadwal Mengajar Pribadi (${userTeacherName || 'Guru'})`}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftar jam pelajaran mingguan Anda secara terstruktur.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter Hari:</span>
                <select
                  value={selectedDayFilter}
                  onChange={(e) => setSelectedDayFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="all">Semua Hari (Senin - Sabtu)</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Grid Schedule for My Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAYS.filter(d => selectedDayFilter === 'all' || selectedDayFilter === d).map(dayName => {
                const daySchedules = mySchedules.filter(s => s.day === dayName).sort((a, b) => a.jamKe.localeCompare(b.jamKe, undefined, { numeric: true }));

                return (
                  <div key={dayName} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                        <Calendar size={14} className="text-indigo-600" />
                        {dayName}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100/80 text-indigo-700 rounded-md text-[10px] font-black">
                        {daySchedules.length} Sesi
                      </span>
                    </div>

                    {daySchedules.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-4 text-center">Tidak ada jam mengajar / pelajaran.</p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map(item => (
                          <div key={item.id} className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-1 hover:border-indigo-300 transition-all">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                Jam Ke-{item.jamKe}
                              </span>
                              <span className="font-bold text-slate-500 flex items-center gap-1 text-[10px]">
                                <Clock size={11} />
                                {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : item.alokasiWaktu || '2 JP'}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-xs text-slate-900 pt-0.5">
                              {item.subject}
                            </h4>

                            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100 mt-1">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                <BookOpen size={11} className="text-indigo-500" />
                                Kelas {item.className}
                              </span>
                              <span className="text-slate-500 truncate max-w-[140px]" title={item.teacherName}>
                                {item.teacherName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CLASS MATRIX / MATRIKS JADWAL PER KELAS */}
      {viewSubTab === 'class_matrix' && (() => {
        const activeClass = (role === 'student' && userClass) ? userClass : selectedClass;

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  <span>Matriks Jadwal Pelajaran {role === 'student' ? `Kelas ${activeClass}` : 'Per Kelas'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {role === 'student' 
                    ? `Jadwal pelajaran mingguan resmi untuk Kelas ${activeClass}.`
                    : 'Pilih kelas untuk melihat jadwal pelajaran lengkap sepekan.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {role !== 'student' && (
                  <div className="flex items-center gap-2 mr-2">
                    <label className="text-xs font-bold text-slate-600">Pilih Kelas:</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-extrabold rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200 text-[11px] font-bold text-indigo-900">
                  <span className="text-indigo-600 mr-2 font-black uppercase text-[10px] tracking-wider">Tampilan Jam:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-extrabold shadow-2xs">
                    Per Jam (0 s.d 10)
                  </span>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold text-center">
                    <th className="py-3 px-3 border-r border-slate-800 w-28 shrink-0">Hari</th>
                    {activeJamSlots.map(jam => (
                      <th key={jam} className="py-3 px-3 border-r border-slate-800 min-w-[150px]">
                        Jam {jam.includes('-') ? jam : `Ke-${jam}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {DAYS.map((dayName, idx) => {
                    const dayItems = schedules.filter(s => s.day === dayName && s.className.trim().toUpperCase() === activeClass.trim().toUpperCase());

                    return (
                      <tr key={dayName} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-3.5 px-3 font-extrabold text-slate-900 bg-slate-100/80 text-center border-r border-slate-200">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs">{dayName}</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-0.5">
                              {dayItems.length} Mapel
                            </span>
                          </div>
                        </td>

                        {activeJamSlots.map(jamSlot => {
                          const matchedList = dayItems.filter(s => doesJamOverlap(s.jamKe, jamSlot));

                          return (
                            <td key={jamSlot} className="py-3 px-3 border-r border-slate-200 align-top">
                              {matchedList.length > 0 ? (
                                <div className="space-y-2">
                                  {matchedList.map(matched => (
                                    <div key={matched.id} className="bg-indigo-50/80 border border-indigo-200/90 rounded-xl p-2.5 space-y-1 relative group hover:shadow-sm transition-all">
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-extrabold text-indigo-700 uppercase">
                                          Jam {matched.jamKe}
                                        </span>
                                        {matched.startTime && (
                                          <span className="text-slate-500 font-bold">{matched.startTime}</span>
                                        )}
                                      </div>
                                      
                                      <div className="font-black text-xs text-slate-900 leading-tight">
                                        {matched.subject}
                                      </div>

                                      <div className="text-[11px] font-semibold text-slate-600 truncate flex items-center gap-1 pt-0.5" title={matched.teacherName}>
                                        <User size={10} className="text-indigo-500 shrink-0" />
                                        <span className="truncate">{matched.teacherName}</span>
                                      </div>

                                      {isEditable && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-slate-200 shadow-sm">
                                          <button
                                            onClick={() => handleOpenEditModal(matched)}
                                            className="p-1 hover:bg-slate-100 rounded text-indigo-600 cursor-pointer"
                                            title="Edit"
                                          >
                                            <Edit3 size={11} />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSchedule(matched.id)}
                                            className="p-1 hover:bg-rose-50 rounded text-rose-600 cursor-pointer"
                                            title="Hapus"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                              <div className="h-16 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300 font-bold">
                                kosong
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* VIEW: TEACHER & SUBJECT MAPPING (PENGATURAN GURU & MAPEL DIAMPU) */}
      {viewSubTab === 'teacher_mapping' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                <span>Pengaturan Guru & Mata Pelajaran yang Diampu</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mata pelajaran yang diampu oleh setiap guru akan otomatis terisi saat memilih nama Guru pada pembuatan/pengaturan jadwal pelajaran.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari guru atau mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTeachersList
              .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.mainSubject.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((t) => {
                const teacherSchedules = schedules.filter(s => (s.teacherId && s.teacherId === t.id) || s.teacherName.trim().toLowerCase() === t.name.trim().toLowerCase());
                
                return (
                  <div key={t.id} className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{t.name}</h4>
                          <span className="text-[11px] font-bold text-slate-500">{t.roleStr}</span>
                        </div>
                        <span className="bg-indigo-100/80 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0">
                          {teacherSchedules.length} Sesi Jadwal
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Mata Pelajaran Utama Diampu
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-white border border-indigo-200 px-3 py-1 rounded-xl shadow-2xs">
                          <Sparkles size={12} className="text-indigo-600 shrink-0" />
                          <span className="font-extrabold text-xs text-indigo-950">{t.mainSubject}</span>
                        </div>
                      </div>
                    </div>

                    {isEditable && (
                      <button
                        onClick={() => handleOpenAddModal({ id: t.id, name: t.name, mainSubject: t.mainSubject })}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Plus size={13} />
                        <span>Atur Jadwal untuk Guru Ini</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 3: TEACHER WORKLOAD / MONITORING JAM MENGAJAR */}
      {viewSubTab === 'teacher_workload' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <BarChart2 size={18} className="text-indigo-600" />
                <span>Monitoring Jumlah Jam Mengajar Guru (Total JP/Minggu)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statistik beban jam mengajar tiap guru otomatis terhitung berdasarkan jadwal pelajaran yang diatur oleh Waka Kurikulum.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama guru..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <button
                type="button"
                onClick={exportTeacherWorkloadExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer"
                title="Export Rekapitulasi & Rincian Monitoring Jam Mengajar Guru ke File Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Workload Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Guru & Status</th>
                  <th className="py-3 px-4">Mata Pelajaran yang Diampu</th>
                  <th className="py-3 px-4">Kelas yang Diajar</th>
                  <th className="py-3 px-4 text-center">Jumlah Sesi</th>
                  <th className="py-3 px-4 text-center">Total Jam Mengajar (JP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {teacherWorkloadSummary
                  .filter(t => t.teacherName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item, idx) => {
                    const subjectsArr = Array.from(item.subjects);
                    const classesArr = Array.from(item.classes);

                    return (
                      <tr key={item.teacherName} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{item.teacherName}</div>
                          <span className="text-[10px] font-bold text-slate-500">ID: {item.teacherId || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          {subjectsArr.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {subjectsArr.map(s => (
                                <span key={s} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-indigo-100">
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {classesArr.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {classesArr.map(c => (
                                <span key={c} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {item.schedulesCount} Sesi
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-xs ${
                            item.totalJp >= 24
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.totalJp > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.totalJp} JP / Mgg
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: MANAGE ALL SCHEDULES (FOR WAKA KURIKULUM & ADMIN) */}
      {viewSubTab === 'manage' && isEditable && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-600" />
                <span>Kelola Seluruh Daftar Jadwal Pelajaran</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tambah, ubah, atau hapus entri jadwal mengajar secara terpusat.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
              <button
                onClick={exportActiveSchedulesExcel}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Export Jadwal ke File Excel (.xlsx)"
              >
                <Download size={14} />
                <span>Export Excel</span>
              </button>

              <button
                onClick={exportActiveSchedulesCSV}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Export Jadwal ke File CSV (.csv)"
              >
                <FileText size={14} />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => {
                  setIsImportModalOpen(true);
                  setImportError(null);
                  setImportSuccess(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet size={15} />
                <span>Import Excel / CSV</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Tambah Jadwal</span>
              </button>
            </div>
          </div>

          {/* FILTER SEARCH & BULK ACTION BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan kelas, mapel, guru, ID guru, atau hari..."
                value={manageSearchQuery}
                onChange={(e) => setManageSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {manageSearchQuery && (
                <button
                  onClick={() => setManageSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedScheduleIds.length > 0 ? (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-900 animate-fade-in shadow-xs">
                <CheckSquare size={16} className="text-rose-600 shrink-0" />
                <span>Terpilih {selectedScheduleIds.length} jadwal</span>
                <button
                  onClick={handleBulkDeleteSchedules}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 size={13} />
                  <span>Hapus ({selectedScheduleIds.length}) Terpilih</span>
                </button>
                <button
                  onClick={() => setSelectedScheduleIds([])}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                <span>Menampilkan <strong className="text-slate-800">{filteredManageSchedules.length}</strong> dari <strong className="text-slate-800">{schedules.length}</strong> entri jadwal</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      title="Pilih / Batal Semua Baris Terlihat"
                    />
                  </th>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4">Guru Pengampu</th>
                  <th className="py-3 px-4">ID / Username Guru</th>
                  <th className="py-3 px-4">Jam Ke</th>
                  <th className="py-3 px-4">Waktu / JP</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredManageSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 italic">
                      {manageSearchQuery ? 'Tidak ditemukan jadwal yang cocok dengan kata kunci pencarian.' : 'Belum ada data jadwal pelajaran yang tersimpan.'}
                    </td>
                  </tr>
                ) : (
                  filteredManageSchedules.map((sch, idx) => {
                    const teacherObj = allTeachersList.find(t =>
                      (t.id && sch.teacherId && t.id.toLowerCase() === sch.teacherId.toLowerCase()) ||
                      (t.username && sch.teacherId && t.username.toLowerCase() === sch.teacherId.toLowerCase()) ||
                      (t.name && sch.teacherName && t.name.trim().toLowerCase() === sch.teacherName.trim().toLowerCase())
                    );
                    const teacherUsername = teacherObj?.username || teacherObj?.id || sch.teacherId || '-';
                    const isRowSelected = selectedScheduleIds.includes(sch.id);

                    return (
                      <tr key={sch.id} className={isRowSelected ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleSelectRow(sch.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{sch.day}</td>
                        <td className="py-3 px-4 font-extrabold text-indigo-700 bg-indigo-50/40">{sch.className}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-800">{sch.subject}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-bold text-slate-900">{sch.teacherName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-extrabold inline-block">
                            {teacherUsername}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-indigo-600">Jam {sch.jamKe}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {sch.startTime && sch.endTime ? `${sch.startTime} - ${sch.endTime}` : sch.alokasiWaktu || '2 JP'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(sch)}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sch.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-lg transition-all cursor-pointer"
                              title="Hapus"
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
      )}

      {/* FORM MODAL FOR ADD/EDIT SCHEDULE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <span>{editingId ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Clash Alert Inside Modal */}
            {clashError && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs space-y-2 animate-shake">
                <div className="font-extrabold flex items-center gap-2 text-rose-900">
                  <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                  <span>BENTURAN JADWAL TERDETEKSI!</span>
                </div>
                <p className="font-semibold leading-relaxed">{clashError}</p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleSaveSchedule(true)}
                    className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Tetap Simpan (Abaikan Benturan)
                  </button>
                  <button
                    onClick={() => setClashError(null)}
                    className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
                  >
                    Ubah Input
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Hari</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Kelas Target</label>
                  <select
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {availableClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Guru Pengampu</label>
                <select
                  value={formTeacher.id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const found = allTeachersList.find(t => t.id === selectedId);
                    if (found) {
                      setFormTeacher({ id: found.id, name: found.name });
                      if (found.mainSubject && found.mainSubject !== 'Tematik/Mapel' && found.mainSubject !== 'Mapel') {
                        setFormSubject(found.mainSubject);
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {allTeachersList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — [Mapel: {t.mainSubject}] ({t.roleStr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-black uppercase text-slate-500">Mata Pelajaran</label>
                  {(() => {
                    const activeT = allTeachersList.find(t => t.id === formTeacher.id);
                    if (activeT?.mainSubject && activeT.mainSubject !== 'Tematik/Mapel' && activeT.mainSubject !== 'Mapel') {
                      return (
                        <button
                          type="button"
                          onClick={() => setFormSubject(activeT.mainSubject)}
                          className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Sparkles size={10} /> Sync: {activeT.mainSubject}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contoh: Matematika, IPA, Bahasa Inggris..."
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-500 shrink-0" />
                  <span>Mata pelajaran otomatis terisi saat Anda memilih Nama Guru.</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Jam Ke</label>
                  <select
                    value={formJamKe}
                    onChange={(e) => handleJamKePresetChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="0">Jam Ke-0 (Jam Wali Kelas)</option>
                    <option value="1">Jam Ke-1</option>
                    <option value="2">Jam Ke-2</option>
                    <option value="3">Jam Ke-3</option>
                    <option value="4">Jam Ke-4</option>
                    <option value="5">Jam Ke-5</option>
                    <option value="6">Jam Ke-6</option>
                    <option value="7">Jam Ke-7</option>
                    <option value="8">Jam Ke-8</option>
                    <option value="9">Jam Ke-9</option>
                    <option value="10">Jam Ke-10</option>
                    <option value="custom">Input Manual / Kustom...</option>
                  </select>

                  {formJamKe === 'custom' && (
                    <input
                      type="text"
                      value={customJamInput}
                      onChange={(e) => setCustomJamInput(e.target.value)}
                      placeholder="Contoh: 1-5 atau 2-6..."
                      className="w-full mt-2 bg-amber-50 border border-amber-300 rounded-xl p-2 text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Alokasi Waktu (JP)</label>
                  <input
                    type="text"
                    value={formAlokasi}
                    onChange={(e) => setFormAlokasi(e.target.value)}
                    placeholder="Contoh: 2 JP"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveSchedule(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Jadwal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL / CSV JADWAL PELAJARAN */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Import Jadwal Pelajaran via Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unduh template, isi data jadwal pelajaran, lalu upload file untuk memuat jadwal sekaligus.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP 1: DOWNLOAD TEMPLATE & EXAMPLES */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-emerald-700" />
                  <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
                    1. Unduh Template Format & Contoh Isian
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadTemplateExcel}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadTemplateCSV}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-emerald-900/80 leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-100/80 space-y-1.5">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Info size={13} className="text-emerald-600" />
                  Struktur Kolom Wajib pada File Template:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[10px] text-slate-700 pt-1">
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">1. Hari (Senin-Sabtu)</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">2. Kelas (7-A, 8-B)</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">3. Mata Pelajaran</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">4. Nama Guru</div>
                  <div className="bg-emerald-100 text-emerald-900 font-extrabold p-1.5 rounded border border-emerald-300">5. ID / Username Guru ★</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">6. Jam Ke (0, 1, 2, dst)</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">7. Waktu Mulai (07:00)</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">8. Waktu Selesai (08:20)</div>
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">9. Alokasi JP (2 JP)</div>
                </div>
                <p className="text-[10px] text-emerald-800 font-bold italic pt-1">
                  * Petunjuk: Sheet ke-2 file Excel berisikan daftar seluruh ID / Username Guru & Wali Kelas terdaftar agar form jurnal mengajar otomatis terisi.
                </p>
              </div>
            </div>

            {/* STEP 2: FILE UPLOAD AREA */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Upload size={15} className="text-indigo-600" />
                <span>2. Upload File Excel / CSV Hasil Isian</span>
              </h4>

              <div className="border-2 border-dashed border-slate-250 hover:border-indigo-400 rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload size={28} className="text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">
                    {importFile ? importFile.name : 'Klik atau seret file Excel (.xlsx) / CSV (.csv) ke sini'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Mendukung format .xlsx, .xls, dan .csv'}
                  </p>
                </div>
              </div>
            </div>

            {/* FEEDBACK MESSAGES */}
            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* STEP 3: PREVIEW DATA & IMPORT MODE */}
            {importData.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Terdeteksi {importData.length} Baris Jadwal ({importData.filter(d => d.isValid).length} Valid)</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs font-bold text-slate-700">
                    <span className="text-[11px] text-slate-500 font-semibold shrink-0">Mode Import:</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200">
                        <input
                          type="radio"
                          name="importMode"
                          value="update"
                          checked={importMode === 'update'}
                          onChange={() => setImportMode('update')}
                          className="text-indigo-600 cursor-pointer accent-indigo-600"
                        />
                        <span>Update / Timpa Slot Sama (Cegah Ganda) ★</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="text-slate-600 cursor-pointer accent-slate-600"
                        />
                        <span>Tambahkan</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-rose-700">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-rose-600 cursor-pointer accent-rose-600"
                        />
                        <span>Timpa Semua Data</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-800 text-white font-extrabold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Baris</th>
                        <th className="py-2 px-3">Hari</th>
                        <th className="py-2 px-3">Kelas</th>
                        <th className="py-2 px-3">Mata Pelajaran</th>
                        <th className="py-2 px-3">Nama Guru</th>
                        <th className="py-2 px-3">ID / Username</th>
                        <th className="py-2 px-3">Jam Ke</th>
                        <th className="py-2 px-3">Waktu</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium bg-white">
                      {importData.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/60'}>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">#{row.rowNum}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.day}</td>
                          <td className="py-2 px-3 font-extrabold text-indigo-700">{row.className}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{row.subject}</td>
                          <td className="py-2 px-3 text-slate-700">{row.teacherName}</td>
                          <td className="py-2 px-3 font-mono text-[10px]">
                            {row.teacherUsername || row.teacherId ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-bold">
                                {row.teacherUsername || row.teacherId}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Auto-match</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-black text-indigo-600">Jam {row.jamKe}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">
                            {row.startTime && row.endTime ? `${row.startTime}-${row.endTime}` : row.alokasiWaktu}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                <CheckCircle size={10} /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold" title={row.validationMsg}>
                                <AlertCircle size={10} /> Tidak Lengkap
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

            {/* ACTION BUTTONS */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportData([]);
                  setImportFile(null);
                  setImportError(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting || importData.filter(d => d.isValid).length === 0}
                onClick={handleExecuteImport}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                  importData.filter(d => d.isValid).length === 0 || isImporting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                <Upload size={14} />
                <span>
                  {isImporting
                    ? 'Mengimport...'
                    : `Proses Import (${importData.filter(d => d.isValid).length} Jadwal)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
