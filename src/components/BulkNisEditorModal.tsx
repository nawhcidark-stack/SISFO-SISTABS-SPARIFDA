import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, AlertCircle, Hash, ArrowUpDown, Sparkles,
  ShieldCheck, RefreshCw, Filter, Search, UserCheck, AlertTriangle
} from 'lucide-react';
import { Student } from '../types';

interface BulkNisEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onRefresh: () => void;
  initialClassFilter?: string;
}

export default function BulkNisEditorModal({
  isOpen,
  onClose,
  students,
  onRefresh,
  initialClassFilter = 'ALL'
}: BulkNisEditorModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>(initialClassFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOnlyTemporary, setFilterOnlyTemporary] = useState<boolean>(false);
  const [startNisInput, setStartNisInput] = useState<string>('2701');
  const [sortOrder, setSortOrder] = useState<'name' | 'current'>('name');
  
  // Map of student id to new NIS string
  const [nisDrafts, setNisDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract available classes
  const classesList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.class) set.add(s.class.trim());
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let list = [...students];

    // Filter active classes (exclude graduated/mutated if needed, but allow all)
    if (selectedClass !== 'ALL') {
      if (selectedClass === 'GRADE_7') {
        list = list.filter(s => (s.class || '').startsWith('7') || (s.class || '').toUpperCase().startsWith('VII'));
      } else {
        list = list.filter(s => s.class === selectedClass);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
        (s.class && s.class.toLowerCase().includes(q))
      );
    }

    if (filterOnlyTemporary) {
      list = list.filter(s => s.nis && s.nisn && String(s.nis).trim() === String(s.nisn).trim());
    }

    // Sort
    if (sortOrder === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }

    return list;
  }, [students, selectedClass, searchQuery, filterOnlyTemporary, sortOrder]);

  // Sync draft state when students change or modal opens
  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, string> = {};
      students.forEach(s => {
        initialMap[s.id] = s.nis || '';
      });
      setNisDrafts(initialMap);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, students]);

  // Auto-numbering generator
  const handleApplyAutoNumbering = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const rawStart = startNisInput.trim();
    if (!rawStart) {
      setErrorMsg('Masukkan nomor awal NIS terlebih dahulu (misal: 2701).');
      return;
    }

    // Determine numeric base and padding length
    const numericMatch = rawStart.match(/\d+$/);
    if (!numericMatch) {
      setErrorMsg('Nomor awal NIS harus mengandung angka (contoh: 2701 atau NIS-001).');
      return;
    }

    const prefix = rawStart.substring(0, rawStart.length - numericMatch[0].length);
    const startNum = parseInt(numericMatch[0], 10);
    const padLength = numericMatch[0].length;

    const newDrafts = { ...nisDrafts };
    filteredStudents.forEach((student, index) => {
      const nextNum = startNum + index;
      const formattedNum = String(nextNum).padStart(padLength, '0');
      newDrafts[student.id] = `${prefix}${formattedNum}`;
    });

    setNisDrafts(newDrafts);
    setSuccessMsg(`Berhasil mengisi otomatis urutan NIS untuk ${filteredStudents.length} siswa.`);
  };

  // Reset drafts for visible students
  const handleResetToCurrent = () => {
    const newDrafts = { ...nisDrafts };
    filteredStudents.forEach(s => {
      newDrafts[s.id] = s.nis || '';
    });
    setNisDrafts(newDrafts);
    setErrorMsg('');
    setSuccessMsg('NIS dikembalikan ke nomor saat ini.');
  };

  // Count changed items
  const changedCount = useMemo(() => {
    let count = 0;
    students.forEach(s => {
      const draft = nisDrafts[s.id];
      if (draft !== undefined && draft.trim() !== (s.nis || '').trim()) {
        count++;
      }
    });
    return count;
  }, [students, nisDrafts]);

  // Duplication checking
  const duplicateNisErrors = useMemo(() => {
    const seen: Record<string, string[]> = {};
    (Object.entries(nisDrafts) as [string, string][]).forEach(([id, nis]) => {
      const clean = (nis || '').trim();
      if (!clean) return;
      if (!seen[clean]) seen[clean] = [];
      seen[clean].push(id);
    });

    const duplicates = new Set<string>();
    Object.entries(seen).forEach(([nis, ids]) => {
      if (ids.length > 1) {
        duplicates.add(nis);
      }
    });
    return duplicates;
  }, [nisDrafts]);

  // Save changes
  const handleSaveChanges = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (changedCount === 0) {
      setErrorMsg('Tidak ada perubahan NIS yang dilakukan.');
      return;
    }

    if (duplicateNisErrors.size > 0) {
      setErrorMsg(`Terdapat nomor NIS ganda di dalam daftar: ${Array.from(duplicateNisErrors).join(', ')}. Setiap siswa harus memiliki NIS yang unik.`);
      return;
    }

    // Collect updates
    const updates: Array<{ studentId: string; newNis: string }> = [];
    students.forEach(s => {
      const draft = (nisDrafts[s.id] || '').trim();
      if (draft && draft !== (s.nis || '').trim()) {
        updates.push({
          studentId: s.id,
          newNis: draft
        });
      }
    });

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/students/bulk-update-nis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan perubahan NIS');
      }

      setSuccessMsg(`Berhasil! ${data.updatedCount} nomor NIS siswa telah diperbarui. NISN tetap utuh.`);
      onRefresh();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Edit Massal NIS Siswa
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-300/30">
                    NISN Tetap & Aman
                  </span>
                </h3>
                <p className="text-xs text-emerald-100">
                  Sesuaikan Nomor Induk Siswa (NIS) secara individual atau berurutan otomatis tanpa mengubah NISN.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Guarantee Banner */}
          <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Perlindungan Data:</strong> Fitur ini secara eksklusif hanya memodifikasi atribut <strong>NIS</strong> (Nomor Induk Siswa). <strong>NISN</strong> siswa tetap tersimpan permanen dan tidak akan pernah berubah.
            </span>
          </div>

          {/* Controls & Generator Toolbar */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-4">
            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter Kelas
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Semua Kelas</option>
                  <option value="GRADE_7">Semua Kelas 7 (Siswa Baru)</option>
                  {classesList.filter(c => c !== 'ALL').map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" /> Cari Siswa / NIS / NISN
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama / nomor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Urutan Siswa
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                >
                  <option value="name">Nama Alfabetis (A - Z)</option>
                  <option value="current">Urutan Daftar Asli</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-800 p-2 border border-slate-300 dark:border-slate-700 rounded-lg w-full">
                  <input
                    type="checkbox"
                    checked={filterOnlyTemporary}
                    onChange={(e) => setFilterOnlyTemporary(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Hanya NIS = NISN (SPMB)</span>
                </label>
              </div>
            </div>

            {/* Quick Generator Box */}
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Auto-Numbering NIS:
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Mulai dari:</span>
                  <input
                    type="text"
                    value={startNisInput}
                    onChange={(e) => setStartNisInput(e.target.value)}
                    placeholder="Contoh: 2701"
                    className="w-28 text-xs font-mono font-bold px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyAutoNumbering}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Terapkan Penomoran Berurutan ({filteredStudents.length} Siswa)
                </button>
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span>Total Tampil: <strong>{filteredStudents.length}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className={changedCount > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                  Diubah: <strong>{changedCount}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Table of Students */}
          <div className="flex-1 overflow-y-auto px-6 py-3">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Tidak ada siswa yang sesuai dengan filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3 w-24 text-center">Kelas</th>
                      <th className="py-2.5 px-3 w-40">
                        NISN <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 lowercase">(tetap)</span>
                      </th>
                      <th className="py-2.5 px-3 w-40">NIS Saat Ini</th>
                      <th className="py-2.5 px-3 w-48">NIS Baru (Definitif)</th>
                      <th className="py-2.5 px-3 w-28 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredStudents.map((student, idx) => {
                      const currentNis = student.nis || '';
                      const draftNis = nisDrafts[student.id] ?? currentNis;
                      const isChanged = draftNis.trim() !== currentNis.trim();
                      const isTemporaryFromSpmb = student.nisn && student.nis && String(student.nis).trim() === String(student.nisn).trim();
                      const isDuplicate = draftNis.trim() && duplicateNisErrors.has(draftNis.trim());

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${
                            isChanged ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              {student.name}
                              {student.gender && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  student.gender === 'L' || student.gender === 'Laki-laki'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                                }`}>
                                  {student.gender === 'L' || student.gender === 'Laki-laki' ? 'L' : 'P'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                              {student.class || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {student.nisn ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{student.nisn}</span>
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded">
                                  TETAP
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-600 dark:text-slate-300">{currentNis || '-'}</span>
                              {isTemporaryFromSpmb && (
                                <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                                  = NISN (SPMB)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={draftNis}
                              onChange={(e) => {
                                setNisDrafts(prev => ({
                                  ...prev,
                                  [student.id]: e.target.value
                                }));
                              }}
                              placeholder="Ketik NIS baru..."
                              className={`w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border focus:ring-2 transition ${
                                isDuplicate
                                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 focus:ring-rose-500'
                                  : isChanged
                                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 focus:ring-amber-500'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-emerald-500'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isDuplicate ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 text-[10px] font-bold">
                                Duplikat!
                              </span>
                            ) : isChanged ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] font-bold">
                                Diubah
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px]">
                                Sama
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {changedCount > 0 ? (
                <span><strong>{changedCount}</strong> siswa akan diperbarui nomor NIS-nya.</span>
              ) : (
                <span>Belum ada perubahan NIS.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving || changedCount === 0 || duplicateNisErrors.size > 0}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md transition ${
                  isSaving || changedCount === 0 || duplicateNisErrors.size > 0
                    ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Simpan Perubahan NIS ({changedCount})
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
