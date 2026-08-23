// Utilities for Indonesian Date formatting and Tempat, Tgl Lahir combination

export const INDONESIAN_MONTHS = [
  { value: '01', name: 'Januari', short: 'Jan' },
  { value: '02', name: 'Februari', short: 'Feb' },
  { value: '03', name: 'Maret', short: 'Mar' },
  { value: '04', name: 'April', short: 'Apr' },
  { value: '05', name: 'Mei', short: 'Mei' },
  { value: '06', name: 'Juni', short: 'Jun' },
  { value: '07', name: 'Juli', short: 'Jul' },
  { value: '08', name: 'Agustus', short: 'Agu' },
  { value: '09', name: 'September', short: 'Sep' },
  { value: '10', name: 'Oktober', short: 'Okt' },
  { value: '11', name: 'November', short: 'Nov' },
  { value: '12', name: 'Desember', short: 'Des' },
];

/**
 * Parses any date string (YYYY-MM-DD or DD/MM/YYYY) into { day: '18', month: '05', year: '1989' }
 */
export function parseDateParts(dateStr?: string): { day: string; month: string; year: string } {
  if (!dateStr) return { day: '', month: '', year: '' };
  
  const clean = String(dateStr).trim();
  
  // Format YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return {
      year: isoMatch[1],
      month: isoMatch[2].padStart(2, '0'),
      day: isoMatch[3].padStart(2, '0'),
    };
  }

  // Format DD-MM-YYYY or DD/MM/YYYY
  const idMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (idMatch) {
    return {
      day: idMatch[1].padStart(2, '0'),
      month: idMatch[2].padStart(2, '0'),
      year: idMatch[3],
    };
  }

  return { day: '', month: '', year: '' };
}

/**
 * Builds ISO date string YYYY-MM-DD from { day, month, year }
 */
export function buildIsoDate(day: string, month: string, year: string): string {
  if (!year || !month || !day) return '';
  const cleanY = year.trim();
  const cleanM = month.trim().padStart(2, '0');
  const cleanD = day.trim().padStart(2, '0');
  if (cleanY.length !== 4) return '';
  return `${cleanY}-${cleanM}-${cleanD}`;
}

/**
 * Formats date into Indonesian text: e.g. "18 Mei 1989"
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '';
  const { day, month, year } = parseDateParts(dateStr);
  if (!day || !month || !year) return dateStr;

  const monthObj = INDONESIAN_MONTHS.find(m => m.value === month);
  const monthName = monthObj ? monthObj.name : month;
  const dayNum = parseInt(day, 10);

  return `${dayNum} ${monthName} ${year}`;
}

/**
 * Formats combined Tempat, Tanggal Lahir into e.g. "Pasuruan, 18 Mei 1989"
 */
export function formatCombinedPlaceAndDate(place?: string, dateStr?: string): string {
  const cleanPlace = (place || '').trim();
  const dateFormatted = formatIndonesianDate(dateStr);

  if (cleanPlace && dateFormatted) {
    return `${cleanPlace}, ${dateFormatted}`;
  }
  if (cleanPlace) return cleanPlace;
  if (dateFormatted) return dateFormatted;
  return '-';
}
