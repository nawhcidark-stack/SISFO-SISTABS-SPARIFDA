import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Search, Sparkles, Check, ChevronDown, Calendar, Hash, X, Link2, Filter, Lock, Unlock, User } from 'lucide-react';
import { TeachingJournal } from '../types';

export interface TpJournalSelectorProps {
  id?: string;
  label: string;
  tpNumber: number;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  journals: TeachingJournal[] | any[];
  selectedSubject?: string;
  selectedClass?: string;
  required?: boolean;
  onAutoFillAll?: () => void;
  isLocked?: boolean;
  filledBy?: string;
  filledAt?: string;
  onUnlock?: () => void;
}

export const TpJournalSelector: React.FC<TpJournalSelectorProps> = ({
  id,
  label,
  tpNumber,
  value,
  onChange,
  placeholder,
  journals = [],
  selectedSubject = '',
  selectedClass = '',
  required = false,
  isLocked = false,
  filledBy,
  filledAt,
  onUnlock
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'class_match' | 'subject_all' | 'all'>('class_match');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Normalized matching
  const norm = (str?: string) => (str || '').toLowerCase().trim();

  // Filter journals based on scope and search query
  const filteredJournals = useMemo(() => {
    if (!Array.isArray(journals)) return [];

    let list = [...journals];

    // Filter by subject & class scope
    if (filterScope === 'class_match') {
      list = list.filter(j => {
        const matchSubj = selectedSubject ? norm(j.subject) === norm(selectedSubject) : true;
        const matchClass = selectedClass ? norm(j.className) === norm(selectedClass) : true;
        return matchSubj && matchClass;
      });
    } else if (filterScope === 'subject_all') {
      list = list.filter(j => {
        return selectedSubject ? norm(j.subject) === norm(selectedSubject) : true;
      });
    }

    // Keyword search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(j => {
        const topic = norm(j.topic);
        const tp = norm(j.tujuanPembelajaran);
        const notes = norm(j.notes);
        const date = norm(j.date);
        const pert = norm(j.pertemuanKe ? String(j.pertemuanKe) : '');
        const cls = norm(j.className);
        const subj = norm(j.subject);
        return topic.includes(q) || tp.includes(q) || notes.includes(q) || date.includes(q) || pert.includes(q) || cls.includes(q) || subj.includes(q);
      });
    }

    // Sort: newest first or chronological
    return list.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (Number(b.pertemuanKe) || 0) - (Number(a.pertemuanKe) || 0);
    });
  }, [journals, selectedSubject, selectedClass, filterScope, searchQuery]);

  // Count available journals for current class & subject
  const relevantCount = useMemo(() => {
    if (!Array.isArray(journals)) return 0;
    return journals.filter(j => {
      const matchSubj = selectedSubject ? norm(j.subject) === norm(selectedSubject) : true;
      const matchClass = selectedClass ? norm(j.className) === norm(selectedClass) : true;
      return matchSubj && matchClass;
    }).length;
  }, [journals, selectedSubject, selectedClass]);

  const handleSelectTp = (journal: any, preferTopic: boolean = false) => {
    let textToUse = '';
    if (preferTopic) {
      textToUse = journal.topic || journal.tujuanPembelajaran || '';
    } else {
      textToUse = journal.tujuanPembelajaran || journal.topic || '';
    }
    if (textToUse) {
      onChange(textToUse.trim());
      setIsOpen(false);
    }
  };

  return (
    <div id={id} className="relative flex flex-col gap-1.5" ref={dropdownRef}>
      {/* Header Label and Action Link */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
          {isLocked && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[8.5px] font-extrabold normal-case">
              <Lock size={9} /> Terkunci
            </span>
          )}
        </label>

        <div className="flex items-center gap-1">
          {/* If locked, show Edit button */}
          {isLocked && onUnlock && (
            <button
              type="button"
              onClick={onUnlock}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer shadow-2xs"
              title="Buka kunci untuk mengedit Judul TP"
            >
              <Unlock size={10} className="text-amber-600" />
              <span>Edit TP</span>
            </button>
          )}

          {/* Button to open Journal Dropdown (only if not locked) */}
          {!isLocked && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer shadow-2xs ${
                isOpen
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
              title="Pilih dari Jurnal Pembelajaran yang sudah diisi"
            >
              <Link2 size={11} className={isOpen ? 'text-white' : 'text-indigo-600'} />
              <span>Link Jurnal</span>
              {relevantCount > 0 && (
                <span className={`px-1 py-0.2 rounded-full text-[8.5px] font-black ${
                  isOpen ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-200 text-indigo-800'
                }`}>
                  {relevantCount}
                </span>
              )}
              <ChevronDown size={10} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Text Input / Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => !isLocked && onChange(e.target.value)}
          readOnly={isLocked}
          rows={2}
          maxLength={150}
          className={`w-full border rounded-xl p-2.5 text-[11px] leading-relaxed font-bold transition-colors ${
            isLocked
              ? 'border-amber-200/80 bg-amber-50/20 text-slate-800 cursor-not-allowed select-none'
              : 'border-slate-200 focus:border-indigo-600 focus:outline-none text-slate-800 bg-slate-50/30 hover:bg-white focus:bg-white placeholder:text-slate-400'
          }`}
          placeholder={isLocked ? '(Terkunci - klik Edit TP untuk mengubah)' : (placeholder || `Isi uraian ${label}...`)}
        />
      </div>

      {/* Teacher Attribution info */}
      {filledBy && (
        <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold px-0.5">
          <span className="flex items-center gap-1 truncate" title={`Diisi oleh: ${filledBy}`}>
            <User size={10} className="text-indigo-600 shrink-0" />
            <span>Keterangan: <strong className="text-slate-800 font-bold">{filledBy}</strong></span>
          </span>
          {filledAt && (
            <span className="text-[8px] text-slate-400 shrink-0">
              {new Date(filledAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}

      {/* Dropdown Popover with Keyword Search */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-indigo-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 min-w-[300px] sm:min-w-[340px]">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-800">
              <BookOpen size={13} className="text-indigo-600" />
              <span className="font-extrabold text-xs">Pilih TP dari Jurnal Pembelajaran</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Search Input with Keyword Filter */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci (materi, TP, pertemuan, tanggal)..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-[11px] font-semibold text-slate-800 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Scope Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[9px] font-bold">
            <button
              type="button"
              onClick={() => setFilterScope('class_match')}
              className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer ${
                filterScope === 'class_match'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Kelas {selectedClass || 'Ini'} ({relevantCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('subject_all')}
              className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer ${
                filterScope === 'subject_all'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Kelas Mapel Ini
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Jurnal
            </button>
          </div>

          {/* Journal Entries List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-0.5 space-y-1">
            {filteredJournals.length === 0 ? (
              <div className="py-6 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <BookOpen size={20} className="text-slate-300 stroke-[1.5]" />
                <span className="text-[10.5px] font-bold">Tidak ada jurnal pembelajaran yang cocok.</span>
                <span className="text-[9px] text-slate-400 max-w-[240px]">
                  {searchQuery
                    ? `Coba ubah kata kunci "${searchQuery}" atau ganti tab filter.`
                    : `Belum ada riwayat jurnal yang tersimpan untuk filter ini.`}
                </span>
              </div>
            ) : (
              filteredJournals.map((journal: any, idx: number) => {
                const isSelected =
                  value && (
                    norm(value) === norm(journal.tujuanPembelajaran) ||
                    norm(value) === norm(journal.topic)
                  );

                const hasTp = Boolean(journal.tujuanPembelajaran && journal.tujuanPembelajaran.trim());

                return (
                  <div
                    key={journal.id || idx}
                    className={`p-2 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : 'hover:bg-indigo-50/50 border-transparent hover:border-indigo-100'
                    }`}
                  >
                    {/* Badge Row */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        {journal.pertemuanKe && (
                          <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-black text-[8.5px]">
                            Pertemuan {journal.pertemuanKe}
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold text-[8.5px] flex items-center gap-0.5">
                          <Calendar size={8} />
                          {journal.date}
                        </span>
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded font-bold text-[8.5px]">
                          {journal.className || selectedClass}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="text-emerald-700 text-[8.5px] font-black flex items-center gap-0.5">
                          <Check size={10} /> Terpilih
                        </span>
                      )}
                    </div>

                    {/* Tujuan Pembelajaran Content */}
                    {hasTp ? (
                      <div className="mb-1">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block">
                          Tujuan Pembelajaran (TP):
                        </span>
                        <p className="text-[10.5px] font-bold text-slate-800 line-clamp-2 leading-snug">
                          {journal.tujuanPembelajaran}
                        </p>
                      </div>
                    ) : null}

                    {/* Materi / Topik */}
                    <div className="mb-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                        Materi / Topik:
                      </span>
                      <p className="text-[10px] font-semibold text-slate-600 line-clamp-1">
                        {journal.topic}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100/80">
                      {hasTp && (
                        <button
                          type="button"
                          onClick={() => handleSelectTp(journal, false)}
                          className="flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Check size={10} />
                          <span>Gunakan TP Ini</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectTp(journal, true)}
                        className={`${
                          hasTp
                            ? 'px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white'
                        } rounded-lg text-[9px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1`}
                        title="Gunakan materi/topik jurnal sebagai judul TP"
                      >
                        <span>Gunakan Topik</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[8.5px] text-slate-400">
            <span>Menampilkan {filteredJournals.length} entri jurnal</span>
            <span className="text-indigo-600 font-semibold">Bisa diedit manual setelah dipilih</span>
          </div>
        </div>
      )}
    </div>
  );
};
