import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Sparkles, Check, ChevronRight, Plus, ExternalLink, RefreshCw, 
  Layers, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { SharedLearningObjective } from '../types';

export interface SharedTpQuickSelectorProps {
  selectedSubject: string;
  selectedClass?: string;
  gradeLevel?: string;
  semester?: string;
  academicYear?: string;
  tp1Id?: string;
  tp2Id?: string;
  tp3Id?: string;
  tp4Id?: string;
  tp1Name?: string;
  tp2Name?: string;
  tp3Name?: string;
  tp4Name?: string;
  onSelectTp: (tp: SharedLearningObjective, slot: 1 | 2 | 3 | 4) => void;
  onOpenFullBank: () => void;
  onOpenAddTpModal: () => void;
}

export const SharedTpQuickSelector: React.FC<SharedTpQuickSelectorProps> = ({
  selectedSubject,
  selectedClass = '',
  gradeLevel: propGrade,
  semester = 'Ganjil',
  academicYear = '2026/2027',
  tp1Id,
  tp2Id,
  tp3Id,
  tp4Id,
  tp1Name,
  tp2Name,
  tp3Name,
  tp4Name,
  onSelectTp,
  onOpenFullBank,
  onOpenAddTpModal
}) => {
  const [tps, setTps] = useState<SharedLearningObjective[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Extract grade level (e.g. "7-A" -> "7")
  const resolvedGrade = useMemo(() => {
    if (propGrade) return String(propGrade).trim();
    if (selectedClass) {
      const m = String(selectedClass).match(/\d+/);
      if (m) return m[0];
    }
    return '7';
  }, [propGrade, selectedClass]);

  // Fetch shared TPs from server
  const fetchTps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/curriculum/shared-tps');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.tps)) {
          setTps(data.tps);
        }
      }
    } catch (e) {
      console.warn("Gagal memuat TP bersama:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTps();
    // Poll every 25s for auto-sync across peer teachers
    const interval = setInterval(fetchTps, 25000);
    return () => clearInterval(interval);
  }, []);

  // Filter matching TPs for active subject & grade level
  const matchingTps = useMemo(() => {
    if (!selectedSubject) return [];
    const cleanSub = selectedSubject.toLowerCase().trim();

    return tps.filter(tp => {
      const matchSubject = 
        tp.subjectName.toLowerCase().includes(cleanSub) ||
        cleanSub.includes(tp.subjectName.toLowerCase()) ||
        tp.subjectId.toLowerCase() === cleanSub;

      const matchGrade = String(tp.gradeLevel).trim() === resolvedGrade;

      return matchSubject && matchGrade;
    }).sort((a, b) => (a.tpNumber || 0) - (b.tpNumber || 0));
  }, [tps, selectedSubject, resolvedGrade]);

  if (!selectedSubject) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white border border-indigo-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-all text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Layers size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs sm:text-sm text-indigo-950">
                Bank TP Bersama Terhubung: {selectedSubject} (Kelas {resolvedGrade})
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 text-[10px] font-black">
                {matchingTps.length} TP Tersedia
              </span>
            </div>
            <p className="text-[10.5px] text-indigo-700/80 font-medium">
              Satu sumber data terpadu antarguru serumpun. Klik tombol pada TP untuk memasangnya langsung ke form penilaian.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddTpModal}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            title="Tambah TP baru untuk mapel dan jenjang ini"
          >
            <Plus size={13} className="text-indigo-600" />
            <span>Tambah TP</span>
          </button>

          <button
            type="button"
            onClick={onOpenFullBank}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Buka seluruh Bank TP Bersama untuk melihat semua jenjang & mapel"
          >
            <BookOpen size={13} />
            <span>Buka Bank TP</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-indigo-500 hover:text-indigo-800 rounded-lg hover:bg-indigo-100/60 transition-colors cursor-pointer"
            title={isExpanded ? "Ciutkan" : "Bentangkan"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Matching TP Cards */}
      {isExpanded && (
        <div className="space-y-2.5 pt-1 border-t border-indigo-100/80 animate-in fade-in duration-150">
          {isLoading && matchingTps.length === 0 ? (
            <div className="py-4 text-center text-xs text-indigo-600 font-bold flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              <span>Menghubungkan ke Bank TP Bersama...</span>
            </div>
          ) : matchingTps.length === 0 ? (
            <div className="py-3 px-4 bg-white/70 rounded-2xl border border-indigo-100 flex items-center justify-between gap-3 text-xs text-indigo-900 font-semibold">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>
                  Belum ada TP tersimpan di Bank Bersama untuk <strong>{selectedSubject} Tingkat {resolvedGrade}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenAddTpModal}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              >
                + Buat TP Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matchingTps.map((tp) => {
                // Check if this TP is currently applied in any slot
                const isTp1 = tp1Id === tp.id || (tp1Name && tp1Name.trim() === tp.title.trim());
                const isTp2 = tp2Id === tp.id || (tp2Name && tp2Name.trim() === tp.title.trim());
                const isTp3 = tp3Id === tp.id || (tp3Name && tp3Name.trim() === tp.title.trim());
                const isTp4 = tp4Id === tp.id || (tp4Name && tp4Name.trim() === tp.title.trim());

                return (
                  <div
                    key={tp.id}
                    className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 ${
                      isTp1 || isTp2 || isTp3 || isTp4
                        ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                        : 'bg-white hover:bg-indigo-50/40 border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {tp.code}
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-500">
                            oleh {tp.creatorName}
                          </span>
                        </div>

                        {/* Used badge */}
                        {(isTp1 || isTp2 || isTp3 || isTp4) && (
                          <span className="px-2 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center gap-0.5">
                            <Check size={10} />
                            <span>
                              Digunakan di {isTp1 ? 'TP-1' : isTp2 ? 'TP-2' : isTp3 ? 'TP-3' : 'TP-4'}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                        {tp.title}
                      </p>
                    </div>

                    {/* Action buttons to assign to slot */}
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
                      <span className="font-bold text-slate-400">Gunakan di:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((slot) => {
                          const isCurrent = 
                            (slot === 1 && isTp1) ||
                            (slot === 2 && isTp2) ||
                            (slot === 3 && isTp3) ||
                            (slot === 4 && isTp4);

                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => onSelectTp(tp, slot as any)}
                              className={`px-2 py-0.5 rounded font-black transition-all cursor-pointer text-[9.5px] ${
                                isCurrent
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200/80'
                              }`}
                              title={`Terapkan ${tp.code} ke TP-${slot}`}
                            >
                              TP-{slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
