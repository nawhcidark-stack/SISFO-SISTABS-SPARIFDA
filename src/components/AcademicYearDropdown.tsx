import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check, Archive, Clock, Sparkles } from "lucide-react";

interface AcademicYearDropdownProps {
  selectedYear: string;
  activeYear?: string;
  availableYears: string[];
  onSelectYear: (year: string) => void;
  compact?: boolean;
}

export default function AcademicYearDropdown({
  selectedYear,
  activeYear = "2026/2027",
  availableYears,
  onSelectYear,
  compact = false,
}: AcademicYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCurrentActive = selectedYear === activeYear;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="btn-select-academic-year"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-xs cursor-pointer select-none ${
          isCurrentActive
            ? "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-900 border-indigo-200"
            : "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/30 animate-pulse"
        }`}
        title="Klik untuk beralih tahun ajaran & melihat data histori periodik"
      >
        <Calendar
          size={13}
          className={isCurrentActive ? "text-indigo-650" : "text-amber-600"}
        />

        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Tahun Ajaran:</span>
          <span className="font-extrabold tracking-tight">{selectedYear}</span>
        </div>

        {/* Status Indicator Badge */}
        {isCurrentActive ? (
          <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100/90 text-emerald-800 border border-emerald-200/60">
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
            <Archive size={9} />
            Arsip
          </span>
        )}

        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isCurrentActive ? "text-indigo-600" : "text-amber-700"
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pilih Tahun Ajaran</span>
              <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                <Clock size={11} /> Periode Histori
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
              Beralih ke tahun sebelumnya untuk melihat arsip anggota kelas, wali kelas, pembayaran &amp; tabungan siswa.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {availableYears.map(year => {
              const isSelected = year === selectedYear;
              const isActiveYear = year === activeYear;

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    onSelectYear(year);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : isActiveYear ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="font-extrabold text-[12.5px]">{year}</span>
                    {isActiveYear && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-indigo-800 text-indigo-100" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        Tahun Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isActiveYear && (
                      <span className={`text-[9.5px] font-medium ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                        Histori
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {!isCurrentActive && (
            <div className="px-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onSelectYear(activeYear);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Sparkles size={12} className="text-indigo-600" />
                <span>Kembali ke Tahun Ajaran Aktif ({activeYear})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
