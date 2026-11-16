import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Award,
  HeartPulse,
  FileText,
  Users,
  Database,
  Navigation,
  Search
} from 'lucide-react';
import {
  CurriculumSubject,
  OnlineExamPacket,
  OnlineExamSchedule,
  OnlineExamSubmission,
  OnlineExamSickStudentOverride,
  Student,
  AttendanceLog
} from '../types';
import { OnlineExamWordEditor } from './OnlineExamWordEditor';

interface OnlineExamWakaManagerProps {
  curriculumSubjects: CurriculumSubject[];
  students: Student[];
  attendanceLogs?: AttendanceLog[];
  defaultView?: 'bank_soal' | 'jadwal_skor' | 'hasil_sas';
  onSasScoreSynced?: () => void;
}

export const OnlineExamWakaManager: React.FC<OnlineExamWakaManagerProps> = ({
  curriculumSubjects,
  students,
  attendanceLogs = [],
  defaultView = 'bank_soal',
  onSasScoreSynced
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bank_soal' | 'jadwal_skor' | 'hasil_sas' | 'word_editor'>(
    defaultView
  );
  const [packets, setPackets] = useState<OnlineExamPacket[]>([]);
  const [schedules, setSchedules] = useState<(OnlineExamSchedule & {
    isCurrentlyOpenWib?: boolean;
    scheduleStatusWib?: string;
  })[]>([]);
  const [submissions, setSubmissions] = useState<OnlineExamSubmission[]>([]);
  const [currentWibStr, setCurrentWibStr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [editingPacketId, setEditingPacketId] = useState<string | undefined>(undefined);
  const [selectedScheduleForResults, setSelectedScheduleForResults] = useState<string>('ALL');

  // Schedule & GPS & Scoring Form State
  const todayWib = useMemo(() => {
    const d = new Date(Date.now() + 7 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }, []);

  const [scheduleForm, setScheduleForm] = useState<OnlineExamSchedule>({
    id: '',
    packetId: '',
    packetTitle: '',
    subjectId: '',
    subjectName: '',
    gradeLevel: '7',
    targetClasses: [],
    semester: 'Genap',
    academicYear: '2025/2026',
    examDate: todayWib,
    startTimeWib: '07:30',
    endTimeWib: '09:30',
    durationMinutes: 90,
    isActive: true,
    tokenCode: '',
    gpsLockEnabled: true,
    schoolLatitude: -7.9096,
    schoolLongitude: 110.2966,
    schoolRadiusMeters: 150,
    sickStudentDefaultRadiusMeters: 15000,
    sickStudentsHomeOverrides: [],
    scoringConfig: {
      pgWeight: 1,
      pgKompleksWeight: 2,
      menjodohkanWeight: 2,
      benarSalahWeight: 1,
      uraianWeight: 4,
      maxScaleScore: 100,
      useQuestionCustomScore: true,
      autoSyncToSas: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [sickStudentSearch, setSickStudentSearch] = useState('');
  const [customSickRadius, setCustomSickRadius] = useState<number>(15000);
  const [customSickReason, setCustomSickReason] = useState<string>('Sakit - Mengerjakan dari Rumah');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [pktRes, schRes, subRes] = await Promise.all([
        fetch('/api/online-exams/packets?summary=1&purpose=bank_soal'),
        fetch('/api/online-exams/schedules'),
        fetch('/api/online-exams/submissions')
      ]);
      const [pktData, schData, subData] = await Promise.all([
        pktRes.json(),
        schRes.json(),
        subRes.json()
      ]);
      if (pktData.success && Array.isArray(pktData.packets)) {
        setPackets(pktData.packets);
      }
      if (schData.success && Array.isArray(schData.schedules)) {
        setSchedules(schData.schedules);
      }
      if (schData.currentWib?.isoWib) {
        setCurrentWibStr(schData.currentWib.isoWib);
      }
      if (subData.success && Array.isArray(subData.submissions)) {
        setSubmissions(subData.submissions);
      }
    } catch (_err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    setActiveSubTab(defaultView);
  }, [defaultView]);

  // Live WIB Clock ticker
  useEffect(() => {
    const updateWibClock = () => {
      const wib = new Date(Date.now() + 7 * 3600 * 1000);
      const iso = wib.toISOString();
      setCurrentWibStr(`${iso.slice(0, 10)} ${iso.slice(11, 19)} WIB`);
    };
    updateWibClock();
    const timer = setInterval(updateWibClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredPackets = useMemo(() => {
    return packets.filter(p => {
      if (
        selectedSubjectFilter !== 'ALL' &&
        p.subjectId !== selectedSubjectFilter &&
        p.subjectName.toLowerCase() !== selectedSubjectFilter.toLowerCase()
      ) {
        return false;
      }
      if (selectedGradeFilter !== 'ALL' && String(p.gradeLevel) !== selectedGradeFilter) {
        return false;
      }
      return true;
    });
  }, [packets, selectedSubjectFilter, selectedGradeFilter]);

  // Automatically detected sick students from today's or schedule's attendance logs
  const autoDetectedSickStudents = useMemo(() => {
    const targetDate = scheduleForm.examDate || todayWib;
    return (attendanceLogs || []).filter(
      l => l.status === 'Sakit' && l.date === targetDate
    );
  }, [attendanceLogs, scheduleForm.examDate, todayWib]);

  const handleSelectPacketForSchedule = (packetId: string) => {
    const found = packets.find(p => p.id === packetId);
    if (!found) {
      setScheduleForm(prev => ({ ...prev, packetId: '' }));
      return;
    }
    setScheduleForm(prev => ({
      ...prev,
      packetId: found.id,
      packetTitle: found.title,
      subjectId: found.subjectId,
      subjectName: found.subjectName,
      gradeLevel: found.gradeLevel,
      targetClasses: found.targetClasses || [],
      semester: found.semester,
      academicYear: found.academicYear
    }));
  };

  const handleUseCurrentGpsAsSchoolCenter = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Browser perangkat ini tidak mendukung Geolocation GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setScheduleForm(prev => ({
          ...prev,
          schoolLatitude: Number(pos.coords.latitude.toFixed(6)),
          schoolLongitude: Number(pos.coords.longitude.toFixed(6))
        }));
        showToast('success', 'Koordinat lokasi sekolah berhasil diambil dari titik GPS saat ini.');
      },
      err => {
        showToast('error', `Gagal mengambil lokasi GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddSickStudentOverride = (student: Student) => {
    setScheduleForm(prev => {
      const exists = (prev.sickStudentsHomeOverrides || []).some(o => o.studentId === student.id);
      if (exists) return prev;
      const item: OnlineExamSickStudentOverride = {
        studentId: student.id,
        studentNis: student.nis,
        studentName: student.name,
        className: student.class,
        allowedRadiusMeters: customSickRadius || prev.sickStudentDefaultRadiusMeters || 15000,
        reason: customSickReason || 'Sakit - Mengerjakan dari Rumah'
      };
      return {
        ...prev,
        sickStudentsHomeOverrides: [...(prev.sickStudentsHomeOverrides || []), item]
      };
    });
    setSickStudentSearch('');
  };

  const handleRemoveSickStudentOverride = (studentId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      sickStudentsHomeOverrides: (prev.sickStudentsHomeOverrides || []).filter(
        o => o.studentId !== studentId
      )
    }));
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.packetId) {
      showToast('error', 'Pilih paket soal dari Bank Soal terlebih dahulu.');
      return;
    }
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/online-exams/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Jadwal ujian, kunci GPS, dan bobot skor berhasil disimpan ke MySQL.');
        fetchAllData();
        setScheduleForm(prev => ({ ...prev, id: '' }));
      } else {
        showToast('error', data.message || 'Gagal menyimpan jadwal ujian.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghubungi server.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/online-exams/schedules/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Jadwal ujian berhasil dihapus dari MySQL.');
        fetchAllData();
      }
    } catch (_err) {
      showToast('error', 'Gagal menghapus jadwal ujian.');
    }
  };

  const handleDeletePacket = async (id: string) => {
    try {
      const res = await fetch(`/api/online-exams/packets/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Paket soal berhasil dihapus dari Bank Soal MySQL.');
        fetchAllData();
      }
    } catch (_err) {
      showToast('error', 'Gagal menghapus paket soal.');
    }
  };

  const handleResyncSubmissionToSas = async (sub: OnlineExamSubmission) => {
    try {
      const res = await fetch('/api/online-exams/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: sub.id,
          scheduleId: sub.scheduleId,
          studentId: sub.studentId,
          manualQuestionScores: sub.questionScores
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          `Nilai SAS ${sub.studentName} (${data.submission?.finalScoreSas}) berhasil disinkronkan langsung ke MySQL!`
        );
        fetchAllData();
        if (onSasScoreSynced) onSasScoreSynced();
      } else {
        showToast('error', data.message || 'Gagal menyinkronkan nilai SAS.');
      }
    } catch (_err) {
      showToast('error', 'Gagal menghubungi server MySQL.');
    }
  };

  const matchingSearchStudents = useMemo(() => {
    const q = sickStudentSearch.trim().toLowerCase();
    if (!q) return [];
    return (students || [])
      .filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.class.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [students, sickStudentSearch]);

  const filteredSubmissions = useMemo(() => {
    if (selectedScheduleForResults === 'ALL') return submissions;
    return submissions.filter(s => s.scheduleId === selectedScheduleForResults);
  }, [submissions, selectedScheduleForResults]);

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between shadow ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="text-xs underline ml-4">
            Tutup
          </button>
        </div>
      )}

      {/* Top Navigation & Live WIB Clock Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('bank_soal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeSubTab === 'bank_soal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Bank Soal Master Data Mapel ({packets.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('jadwal_skor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeSubTab === 'jadwal_skor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Jadwal Ujian (WIB), Kunci GPS & Setting Skor ({schedules.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('hasil_sas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeSubTab === 'hasil_sas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Hasil Ujian & Integrasi Nilai SAS MySQL ({submissions.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPacketId(undefined);
              setActiveSubTab('word_editor');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeSubTab === 'word_editor'
                ? 'bg-[#185abd] text-white shadow-sm'
                : 'bg-blue-50 text-[#185abd] border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Editor Soal MS Word
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Waktu Server: {currentWibStr || 'Memuat WIB...'}</span>
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            title="Segarkan Data dari MySQL"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: BANK SOAL MASTER DATA MAPEL */}
      {activeSubTab === 'bank_soal' && (
        <div className="space-y-4">
          {/* Subject Summary Cards (Master Data Mapel Integration) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bank Soal Terintegrasi Master Data Mata Pelajaran (Direct MySQL)
                </h3>
                <p className="text-xs text-slate-500">
                  Seluruh soal yang dibuat dari akun Guru Mapel dan Wali Kelas otomatis tersimpan di Bank Soal Mata Pelajaran ini.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedGradeFilter}
                  onChange={e => setSelectedGradeFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                >
                  <option value="ALL">Semua Kelas (7, 8, 9)</option>
                  <option value="7">Kelas 7</option>
                  <option value="8">Kelas 8</option>
                  <option value="9">Kelas 9</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPacketId(undefined);
                    setActiveSubTab('word_editor');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#185abd] hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Buat Paket Soal Baru (MS Word)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('ALL')}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedSubjectFilter === 'ALL'
                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-bold text-indigo-700">SEMUA MAPEL</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{packets.length} Paket</div>
              </button>

              {curriculumSubjects.map(sub => {
                const count = packets.filter(
                  p => p.subjectId === sub.id || p.subjectName.toLowerCase() === sub.name.toLowerCase()
                ).length;
                const isSelected = selectedSubjectFilter === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(isSelected ? 'ALL' : sub.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-slate-800 truncate" title={sub.name}>
                      {sub.name}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-500">{sub.code}</span>
                      <span
                        className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                          count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count} Paket
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Packets Table in Bank Soal */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Daftar Naskah Soal di Bank Soal ({filteredPackets.length} Paket)
              </span>
            </div>

            {filteredPackets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada paket soal pada filter mata pelajaran ini. Guru Mapel dan Wali Kelas dapat membuat soal melalui Lembar Kerja Microsoft Word.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Judul Naskah Soal</th>
                      <th className="px-4 py-3">Mata Pelajaran</th>
                      <th className="px-4 py-3">Kelas / Smt</th>
                      <th className="px-4 py-3">Pembuat Soal</th>
                      <th className="px-4 py-3 text-center">Jumlah Soal</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPackets.map(pkt => (
                      <tr key={pkt.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div>{pkt.title}</div>
                          <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Kategori: {pkt.examCategory}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{pkt.subjectName}</td>
                        <td className="px-4 py-3 text-slate-600">
                          Kelas {pkt.gradeLevel} • {pkt.semester} ({pkt.academicYear})
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{pkt.creatorName}</div>
                          <div className="text-[11px] text-slate-500">{pkt.creatorRole}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            {pkt.questionCount} Butir
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPacketId(pkt.id);
                                setActiveSubTab('word_editor');
                              }}
                              className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#185abd] font-semibold border border-blue-200 flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Buka di MS Word
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectPacketForSchedule(pkt.id);
                                setActiveSubTab('jadwal_skor');
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 flex items-center gap-1"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Jadwalkan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePacket(pkt.id)}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                              title="Hapus Paket Soal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* TAB 2: JADWAL UJIAN (WIB), KUNCI LOKASI GPS, & SETTING SKOR */}
      {activeSubTab === 'jadwal_skor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form: Input Jadwal WIB, GPS Lock & Sick Student Radius, and Scoring Config */}
          <form
            onSubmit={handleSaveSchedule}
            className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5"
          >
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {scheduleForm.id ? 'Edit Jadwal, Kunci GPS & Skor Ujian' : 'Buat Jadwal Ujian Online Baru (WIB)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Soal otomatis aktif pada tanggal dan jam WIB yang ditentukan dan langsung terkunci di luar jadwal/radius.
                </p>
              </div>
              {scheduleForm.id && (
                <button
                  type="button"
                  onClick={() => setScheduleForm(prev => ({ ...prev, id: '' }))}
                  className="text-xs text-slate-600 underline"
                >
                  Mode Buat Baru
                </button>
              )}
            </div>

            {/* Section 1: Jadwal & Paket Soal */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                1. Pilih Paket Bank Soal & Waktu Aktif Otomatis (Zona Waktu WIB)
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paket Soal dari Bank Soal Mapel:</label>
                <select
                  required
                  value={scheduleForm.packetId}
                  onChange={e => handleSelectPacketForSchedule(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold text-slate-900"
                >
                  <option value="">-- Pilih Paket Soal di Bank Soal ({packets.length} tersedia) --</option>
                  {packets.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.subjectName} - Kelas {p.gradeLevel}] {p.title} ({p.questionCount} Soal)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Ujian (WIB):</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.examDate}
                    onChange={e => setScheduleForm(prev => ({ ...prev, examDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Mulai (WIB):</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.startTimeWib}
                    onChange={e => setScheduleForm(prev => ({ ...prev, startTimeWib: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Selesai (WIB):</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.endTimeWib}
                    onChange={e => setScheduleForm(prev => ({ ...prev, endTimeWib: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durasi (Menit):</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={scheduleForm.durationMinutes}
                    onChange={e =>
                      setScheduleForm(prev => ({ ...prev, durationMinutes: Number(e.target.value) || 90 }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Filter Kelas Target (Kosongkan = Semua Kelas {scheduleForm.gradeLevel}):
                  </label>
                  <input
                    type="text"
                    value={(scheduleForm.targetClasses || []).join(', ')}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        targetClasses: e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                      }))
                    }
                    placeholder="Contoh: 7A, 7B, 7C"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Token Ujian (Opsional, kosongkan jika tanpa token):
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.tokenCode || ''}
                    onChange={e =>
                      setScheduleForm(prev => ({ ...prev, tokenCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="Contoh: SAS2026"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Fitur Kunci Lokasi / GPS & Radius Khusus Siswa Sakit di Rumah */}
            <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  2. Kunci Lokasi / GPS & Radius Khusus Siswa Sakit (Mengerjakan di Rumah)
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={scheduleForm.gpsLockEnabled}
                    onChange={e =>
                      setScheduleForm(prev => ({ ...prev, gpsLockEnabled: e.target.checked }))
                    }
                    className="rounded text-emerald-600"
                  />
                  Aktifkan Kunci Lokasi GPS
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude Sekolah:</label>
                  <input
                    type="number"
                    step="any"
                    value={scheduleForm.schoolLatitude}
                    onChange={e =>
                      setScheduleForm(prev => ({ ...prev, schoolLatitude: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude Sekolah:</label>
                  <input
                    type="number"
                    step="any"
                    value={scheduleForm.schoolLongitude}
                    onChange={e =>
                      setScheduleForm(prev => ({ ...prev, schoolLongitude: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleUseCurrentGpsAsSchoolCenter}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Titik Lokasi Saat Ini
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                  <label className="block font-bold text-slate-800 mb-1">
                    Radius Normal di Lingkungan Sekolah (Meter):
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={5000}
                    value={scheduleForm.schoolRadiusMeters}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        schoolRadiusMeters: Math.max(20, Number(e.target.value) || 150)
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold text-emerald-800"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Siswa reguler hanya bisa membuka soal jika berada dalam radius ini dari titik sekolah.
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-amber-300">
                  <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    Radius Khusus Siswa Sakit di Rumah (Meter):
                  </label>
                  <input
                    type="number"
                    min={500}
                    max={100000}
                    value={scheduleForm.sickStudentDefaultRadiusMeters}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        sickStudentDefaultRadiusMeters: Math.max(500, Number(e.target.value) || 15000)
                      }))
                    }
                    className="w-full border border-amber-300 rounded px-2.5 py-1.5 font-bold text-amber-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Otomatis berlaku bagi siswa yang tercatat <b>Sakit</b> di absensi atau ditambahkan pada daftar siswa sakit di bawah.
                  </p>
                </div>
              </div>

              {/* Sick Students Home Override List */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Daftar Siswa Sakit (Diizinkan Mengerjakan dari Rumah dengan Radius Khusus):</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Otomatis Absensi Sakit Hari Ujian: {autoDetectedSickStudents.length} siswa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 relative">
                    <input
                      type="text"
                      value={sickStudentSearch}
                      onChange={e => setSickStudentSearch(e.target.value)}
                      placeholder="Ketik nama atau NIS siswa yang sakit di rumah..."
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    />
                    {matchingSearchStudents.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                        {matchingSearchStudents.map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleAddSickStudentOverride(st)}
                            className="w-full px-3 py-1.5 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-100"
                          >
                            <span className="font-semibold text-slate-800">
                              {st.name} ({st.class})
                            </span>
                            <span className="text-[11px] text-blue-600 font-bold">+ Tambahkan</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      value={customSickRadius}
                      onChange={e => setCustomSickRadius(Number(e.target.value) || 15000)}
                      placeholder="Radius Rumah (m)"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      title="Radius khusus rumah siswa (meter)"
                    />
                  </div>
                </div>

                {(scheduleForm.sickStudentsHomeOverrides || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {scheduleForm.sickStudentsHomeOverrides.map(ov => (
                      <span
                        key={ov.studentId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[11px]"
                      >
                        <HeartPulse className="w-3 h-3 text-rose-600" />
                        {ov.studentName} ({ov.className}) • Radius {ov.allowedRadiusMeters}m
                        <button
                          type="button"
                          onClick={() => handleRemoveSickStudentOverride(ov.studentId)}
                          className="text-rose-600 hover:text-rose-900 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Setting Skor di Waka Kurikulum & Auto Sync SAS */}
            <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200 text-xs">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                3. Setting Skor Waka Kurikulum & Sinkronisasi Otomatis ke Nilai SAS MySQL
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bobot PG:</label>
                  <input
                    type="number"
                    min={1}
                    value={scheduleForm.scoringConfig.pgWeight}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: { ...prev.scoringConfig, pgWeight: Number(e.target.value) || 1 }
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">PG Kompleks:</label>
                  <input
                    type="number"
                    min={1}
                    value={scheduleForm.scoringConfig.pgKompleksWeight}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          pgKompleksWeight: Number(e.target.value) || 2
                        }
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Menjodohkan:</label>
                  <input
                    type="number"
                    min={1}
                    value={scheduleForm.scoringConfig.menjodohkanWeight}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          menjodohkanWeight: Number(e.target.value) || 2
                        }
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Benar/Salah:</label>
                  <input
                    type="number"
                    min={1}
                    value={scheduleForm.scoringConfig.benarSalahWeight}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          benarSalahWeight: Number(e.target.value) || 1
                        }
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bobot Uraian:</label>
                  <input
                    type="number"
                    min={1}
                    value={scheduleForm.scoringConfig.uraianWeight}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: { ...prev.scoringConfig, uraianWeight: Number(e.target.value) || 4 }
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Skala Maks:</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={scheduleForm.scoringConfig.maxScaleScore}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          maxScaleScore: Number(e.target.value) || 100
                        }
                      }))
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold text-indigo-700"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={scheduleForm.scoringConfig.useQuestionCustomScore}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          useQuestionCustomScore: e.target.checked
                        }
                      }))
                    }
                  />
                  Utamakan bobot skor per nomor dari pembuat soal jika diatur
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900">
                  <input
                    type="checkbox"
                    checked={scheduleForm.scoringConfig.autoSyncToSas}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          autoSyncToSas: e.target.checked
                        }
                      }))
                    }
                  />
                  Otomatis masukkan hasil ujian ke Nilai SAS (Sistem Penilaian MySQL)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSchedule}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {savingSchedule
                ? 'Menyimpan Jadwal & Pengaturan ke MySQL...'
                : 'Simpan Jadwal Ujian (WIB), Kunci GPS & Setting Skor ke MySQL'}
            </button>
          </form>

          {/* Right List: Active & Scheduled Exams */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
              Daftar Jadwal Ujian Online Terdaftar ({schedules.length})
            </h3>

            {schedules.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada jadwal ujian yang diatur. Pilih paket soal di sebelah kiri untuk mengaktifkan jadwal ujian.
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {schedules.map(sch => {
                  const isOpen = sch.isCurrentlyOpenWib;
                  return (
                    <div
                      key={sch.id}
                      className={`p-3.5 rounded-xl border transition ${
                        isOpen
                          ? 'bg-emerald-50/60 border-emerald-400'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded uppercase mb-1 ${
                              isOpen
                                ? 'bg-emerald-600 text-white'
                                : sch.scheduleStatusWib === 'belum_mulai'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isOpen
                              ? '● AKTIF OTOMATIS (WIB)'
                              : sch.scheduleStatusWib === 'belum_mulai'
                              ? 'MENUNGGU JADWAL WIB'
                              : 'SELESAI / DITUTUP'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{sch.packetTitle}</h4>
                          <p className="text-[11px] font-semibold text-indigo-700">
                            {sch.subjectName} • Kelas {sch.gradeLevel} ({sch.semester})
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setScheduleForm(sch)}
                            className="p-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                            title="Edit Jadwal & GPS"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sch.id)}
                            className="p-1.5 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                        <div>
                          <b>Tanggal:</b> {sch.examDate}
                        </div>
                        <div>
                          <b>Waktu:</b> {sch.startTimeWib} - {sch.endTimeWib} WIB
                        </div>
                        <div>
                          <b>Radius Sekolah:</b>{' '}
                          {sch.gpsLockEnabled ? `${sch.schoolRadiusMeters}m` : 'Tanpa Kunci GPS'}
                        </div>
                        <div>
                          <b>Radius Sakit Rumah:</b> {sch.sickStudentDefaultRadiusMeters}m (
                          {(sch.sickStudentsHomeOverrides || []).length} siswa khusus)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HASIL UJIAN & SINKRONISASI NILAI SAS MYSQL */}
      {activeSubTab === 'hasil_sas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Hasil Ujian Siswa & Integrasi Langsung ke Nilai SAS (MySQL)
              </h3>
              <p className="text-xs text-slate-500">
                Setiap siswa yang menyelesaikan ujian otomatis dinilai dan nilainya langsung masuk ke kolom SAS (Nilai PAS/SAS) pada tabel penilaian MySQL tanpa penyimpanan lokal.
              </p>
            </div>

            <select
              value={selectedScheduleForResults}
              onChange={e => setSelectedScheduleForResults(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
            >
              <option value="ALL">Semua Jadwal Ujian ({submissions.length} peserta)</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.subjectName} - Kls {s.gradeLevel}] {s.packetTitle} ({s.examDate})
                </option>
              ))}
            </select>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada data pengerjaan ujian siswa di MySQL untuk jadwal ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Nama Siswa / Kelas</th>
                    <th className="px-4 py-3">Mata Pelajaran</th>
                    <th className="px-4 py-3">Status Lokasi GPS</th>
                    <th className="px-4 py-3 text-center">Skor Mentah</th>
                    <th className="px-4 py-3 text-center">Nilai SAS (Skala 100)</th>
                    <th className="px-4 py-3 text-center">Sinkron Penilaian SAS</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{sub.studentName}</div>
                        <div className="text-[11px] text-slate-500">
                          Kelas {sub.className} • NIS: {sub.studentNis || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{sub.subjectName}</div>
                        <div className="text-[11px] text-slate-500">
                          {sub.semester} • {sub.academicYear}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {sub.isSickHomeMode ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                            <HeartPulse className="w-3 h-3 text-rose-500" />
                            Mode Sakit di Rumah ({sub.gpsDistanceMeters ?? 0}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            Radius Sekolah ({sub.gpsDistanceMeters ?? 0}m)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold">
                        {sub.rawScore} / {sub.maxRawScore}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-extrabold text-sm border border-indigo-200">
                          {sub.finalScoreSas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sub.syncedToSas ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Masuk Nilai SAS MySQL
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold text-[11px]">
                            Sedang Dikerjakan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleResyncSubmissionToSas(sub)}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px]"
                        >
                          Sinkron Ulang SAS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EMBEDDED MS WORD QUESTION EDITOR FOR WAKA KURIKULUM */}
      {activeSubTab === 'word_editor' && (
        <OnlineExamWordEditor
          creatorId="waka-kurikulum"
          creatorName="Waka Kurikulum"
          creatorRole="Waka Kurikulum"
          curriculumSubjects={curriculumSubjects}
          initialPacketId={editingPacketId}
          onPacketSaved={() => {
            fetchAllData();
          }}
        />
      )}
    </div>
  );
};
