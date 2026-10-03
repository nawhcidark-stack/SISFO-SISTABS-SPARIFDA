import React, { useMemo, useState } from 'react';
import { INDONESIAN_MONTHS, parseDateParts, buildIsoDate, formatCombinedPlaceAndDate, formatIndonesianDate, toProperCase } from '../utils/dateUtils';
import { Calendar, MapPin } from 'lucide-react';

interface BirthDateSplitInputProps {
  idPrefix: string;
  birthDate?: string; // YYYY-MM-DD
  onBirthDateChange: (newDate: string) => void;
  birthPlace?: string;
  onBirthPlaceChange?: (newPlace: string) => void;
  dateLabel?: string;
  placeLabel?: string;
  combinedLabel?: string;
  required?: boolean;
  theme?: 'dark' | 'light';
  showPlaceInput?: boolean;
  placeholderPlace?: string;
  minYear?: number;
  maxYear?: number;
  helperText?: string;
  properCasePlace?: boolean;
  uppercasePlace?: boolean;
}

export default function BirthDateSplitInput({
  idPrefix,
  birthDate = '',
  onBirthDateChange,
  birthPlace = '',
  onBirthPlaceChange,
  dateLabel = 'Tanggal Lahir',
  placeLabel = 'Tempat Lahir (Besar Kecil / Proper)',
  combinedLabel = 'Tempat, Tgl Lahir (Otomatis)',
  required = false,
  theme = 'dark',
  showPlaceInput = false,
  placeholderPlace = 'Contoh: Pasuruan',
  minYear = 1940,
  maxYear = new Date().getFullYear(),
  helperText,
  properCasePlace = true,
  uppercasePlace = false,
}: BirthDateSplitInputProps) {
  const isDark = theme === 'dark';

  // Initial parsing from birthDate
  const initial = useMemo(() => parseDateParts(birthDate), []);
  const [localDay, setLocalDay] = useState(initial.day);
  const [localMonth, setLocalMonth] = useState(initial.month);
  const [localYear, setLocalYear] = useState(initial.year);

  // Keep a ref of the last value emitted to parent so typing year doesn't get wiped by external sync
  const lastEmittedRef = React.useRef(birthDate);

  // Sync from props only when parent updates externally
  React.useEffect(() => {
    if (birthDate && birthDate !== lastEmittedRef.current) {
      const parsed = parseDateParts(birthDate);
      if (parsed.day) setLocalDay(parsed.day);
      if (parsed.month) setLocalMonth(parsed.month);
      if (parsed.year) setLocalYear(parsed.year);
      lastEmittedRef.current = birthDate;
    } else if (!birthDate && lastEmittedRef.current) {
      setLocalDay('');
      setLocalMonth('');
      setLocalYear('');
      lastEmittedRef.current = '';
    }
  }, [birthDate]);

  // Handler for each split column
  const handlePartChange = (part: 'day' | 'month' | 'year', val: string) => {
    const nextDay = part === 'day' ? val : localDay;
    const nextMonth = part === 'month' ? val : localMonth;
    const nextYear = part === 'year' ? val : localYear;

    if (part === 'day') setLocalDay(val);
    if (part === 'month') setLocalMonth(val);
    if (part === 'year') setLocalYear(val);

    const cleanY = (nextYear || '').trim();
    const cleanM = (nextMonth || '').trim().padStart(2, '0');
    const cleanD = (nextDay || '').trim().padStart(2, '0');

    let emitted = '';
    if (cleanY && cleanM && cleanD) {
      emitted = `${cleanY}-${cleanM}-${cleanD}`;
    } else if (cleanY || cleanM || cleanD) {
      emitted = `${cleanY || '2014'}-${cleanM || '01'}-${cleanD || '01'}`;
    }

    lastEmittedRef.current = emitted;
    onBirthDateChange(emitted);
  };

  // Generate list of days 01 - 31
  const daysList = useMemo(() => {
    const list: string[] = [];
    for (let i = 1; i <= 31; i++) {
      list.push(String(i).padStart(2, '0'));
    }
    return list;
  }, []);

  // Compute combined preview
  const combinedText = useMemo(() => {
    const fullDate = (localYear && localMonth && localDay) 
      ? `${localYear}-${localMonth.padStart(2, '0')}-${localDay.padStart(2, '0')}`
      : birthDate;
    return formatCombinedPlaceAndDate(birthPlace, fullDate);
  }, [birthPlace, localYear, localMonth, localDay, birthDate]);

  const dateFormattedOnly = useMemo(() => {
    const fullDate = (localYear && localMonth && localDay)
      ? `${localYear}-${localMonth.padStart(2, '0')}-${localDay.padStart(2, '0')}`
      : birthDate;
    return formatIndonesianDate(fullDate);
  }, [localYear, localMonth, localDay, birthDate]);

  const inputBaseClasses = isDark
    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500 focus:border-emerald-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="space-y-3">
      {/* Optional: Tempat Lahir Input if showPlaceInput = true */}
      {showPlaceInput && onBirthPlaceChange && (
        <div>
          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {placeLabel} {required && <span className="text-rose-400">*</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin size={14} />
            </div>
            <input
              id={`${idPrefix}-place`}
              type="text"
              required={required}
              placeholder={placeholderPlace}
              value={birthPlace}
              onChange={(e) => {
                const val = e.target.value;
                if (onBirthPlaceChange) {
                  if (properCasePlace) {
                    onBirthPlaceChange(toProperCase(val));
                  } else if (uppercasePlace) {
                    onBirthPlaceChange(val.toUpperCase());
                  } else {
                    onBirthPlaceChange(val);
                  }
                }
              }}
              className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 ${inputBaseClasses} ${uppercasePlace ? 'uppercase font-bold tracking-wide' : ''}`}
            />
          </div>
        </div>
      )}

      {/* Tanggal Lahir: 3 Kolom Tersendiri | Tgl | | Bln | | Tahun | */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {dateLabel} {required && <span className="text-rose-400">*</span>}
          </label>
          {dateFormattedOnly && (
            <span className={`text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-indigo-600 font-bold'}`}>
              ({dateFormattedOnly})
            </span>
          )}
        </div>

        {/* 3 Separate Column Grid */}
        <div className="grid grid-cols-12 gap-2">
          {/* Kolom 1: | Tgl | */}
          <div className="col-span-3 sm:col-span-3">
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              | Tgl |
            </label>
            <select
              id={`${idPrefix}-day`}
              value={localDay}
              onChange={(e) => handlePartChange('day', e.target.value)}
              className={`w-full px-2 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 ${inputBaseClasses}`}
            >
              <option value="">Tgl</option>
              {daysList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Kolom 2: | Bln | */}
          <div className="col-span-5 sm:col-span-5">
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              | Bln |
            </label>
            <select
              id={`${idPrefix}-month`}
              value={localMonth}
              onChange={(e) => handlePartChange('month', e.target.value)}
              className={`w-full px-2 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 ${inputBaseClasses}`}
            >
              <option value="">-- Bulan --</option>
              {INDONESIAN_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value} - {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kolom 3: | Tahun | */}
          <div className="col-span-4 sm:col-span-4">
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              | Tahun |
            </label>
            <input
              id={`${idPrefix}-year`}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Contoh: 2014"
              value={localYear}
              onChange={(e) => {
                const cleanYear = e.target.value.replace(/\D/g, '').slice(0, 4);
                handlePartChange('year', cleanYear);
              }}
              className={`w-full px-2.5 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 ${inputBaseClasses}`}
            />
          </div>
        </div>

        {helperText && (
          <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {helperText}
          </p>
        )}
      </div>

      {/* Kolom Otomatis: Tempat, Tanggal Lahir Gabungan */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
        isDark 
          ? 'bg-slate-950/90 border-emerald-500/40 text-emerald-300' 
          : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar size={13} className={isDark ? 'text-emerald-400 shrink-0' : 'text-indigo-600 shrink-0'} />
          <span className="text-[10px] font-bold uppercase tracking-wider shrink-0">
            {combinedLabel}:
          </span>
          <span className={`text-xs font-bold font-mono truncate ${isDark ? 'text-white' : 'text-indigo-950'}`}>
            {combinedText !== '-' ? combinedText : '(Lengkapi Tempat & Tgl Lahir)'}
          </span>
        </div>

        {combinedText !== '-' && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase shrink-0 ${
            isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-200 text-indigo-800'
          }`}>
            Otomatis
          </span>
        )}
      </div>
    </div>
  );
}
