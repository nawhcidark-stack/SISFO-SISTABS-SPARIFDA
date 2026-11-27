export interface CalendarHolidayInfo {
  date: string; // YYYY-MM-DD
  name: string;
  category: 'Libur Nasional' | 'Cuti Bersama' | 'Hari Minggu';
}

/**
 * Daftar Hari Libur Nasional & Cuti Bersama Kalender Masehi Indonesia (SKB 3 Menteri 2025 - 2027)
 */
const INDONESIAN_MASEHI_HOLIDAYS: Record<string, { name: string; category: 'Libur Nasional' | 'Cuti Bersama' }> = {
  // === 2025 ===
  '2025-01-01': { name: 'Tahun Baru 2025 Masehi', category: 'Libur Nasional' },
  '2025-01-27': { name: 'Isra Mikraj Nabi Muhammad SAW', category: 'Libur Nasional' },
  '2025-01-28': { name: 'Cuti Bersama Tahun Baru Imlek 2576 Kongzili', category: 'Cuti Bersama' },
  '2025-01-29': { name: 'Tahun Baru Imlek 2576 Kongzili', category: 'Libur Nasional' },
  '2025-03-28': { name: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1947', category: 'Cuti Bersama' },
  '2025-03-29': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1947)', category: 'Libur Nasional' },
  '2025-03-31': { name: 'Hari Raya Idul Fitri 1446 Hijriah', category: 'Libur Nasional' },
  '2025-04-01': { name: 'Hari Raya Idul Fitri 1446 Hijriah (Hari Kedua)', category: 'Libur Nasional' },
  '2025-04-02': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriah', category: 'Cuti Bersama' },
  '2025-04-03': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriah', category: 'Cuti Bersama' },
  '2025-04-04': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriah', category: 'Cuti Bersama' },
  '2025-04-07': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriah', category: 'Cuti Bersama' },
  '2025-04-18': { name: 'Wafat Yesus Kristus (Jumat Agung)', category: 'Libur Nasional' },
  '2025-04-20': { name: 'Kebangkitan Yesus Kristus (Hari Paskah)', category: 'Libur Nasional' },
  '2025-05-01': { name: 'Hari Buruh Internasional', category: 'Libur Nasional' },
  '2025-05-12': { name: 'Hari Raya Waisak 2569 BE', category: 'Libur Nasional' },
  '2025-05-13': { name: 'Cuti Bersama Hari Raya Waisak 2569 BE', category: 'Cuti Bersama' },
  '2025-05-29': { name: 'Kenaikan Yesus Kristus', category: 'Libur Nasional' },
  '2025-05-30': { name: 'Cuti Bersama Kenaikan Yesus Kristus', category: 'Cuti Bersama' },
  '2025-06-01': { name: 'Hari Lahir Pancasila', category: 'Libur Nasional' },
  '2025-06-06': { name: 'Hari Raya Idul Adha 1446 Hijriah', category: 'Libur Nasional' },
  '2025-06-09': { name: 'Cuti Bersama Hari Raya Idul Adha 1446 Hijriah', category: 'Cuti Bersama' },
  '2025-06-27': { name: '1 Muharam Tahun Baru Islam 1447 Hijriah', category: 'Libur Nasional' },
  '2025-08-17': { name: 'Hari Kemerdekaan Republik Indonesia (HUT RI)', category: 'Libur Nasional' },
  '2025-09-05': { name: 'Maulid Nabi Muhammad SAW', category: 'Libur Nasional' },
  '2025-12-25': { name: 'Kelahiran Yesus Kristus (Hari Raya Natal)', category: 'Libur Nasional' },
  '2025-12-26': { name: 'Cuti Bersama Hari Raya Natal', category: 'Cuti Bersama' },

  // === 2026 ===
  '2026-01-01': { name: 'Tahun Baru 2026 Masehi', category: 'Libur Nasional' },
  '2026-01-16': { name: 'Isra Mikraj Nabi Muhammad SAW', category: 'Libur Nasional' },
  '2026-02-16': { name: 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili', category: 'Cuti Bersama' },
  '2026-02-17': { name: 'Tahun Baru Imlek 2577 Kongzili', category: 'Libur Nasional' },
  '2026-03-18': { name: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948', category: 'Cuti Bersama' },
  '2026-03-19': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', category: 'Libur Nasional' },
  '2026-03-20': { name: 'Hari Raya Idul Fitri 1447 Hijriah', category: 'Libur Nasional' },
  '2026-03-21': { name: 'Hari Raya Idul Fitri 1447 Hijriah (Hari Kedua)', category: 'Libur Nasional' },
  '2026-03-23': { name: 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah', category: 'Cuti Bersama' },
  '2026-03-24': { name: 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah', category: 'Cuti Bersama' },
  '2026-03-25': { name: 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah', category: 'Cuti Bersama' },
  '2026-04-03': { name: 'Wafat Yesus Kristus (Jumat Agung)', category: 'Libur Nasional' },
  '2026-04-05': { name: 'Kebangkitan Yesus Kristus (Hari Paskah)', category: 'Libur Nasional' },
  '2026-05-01': { name: 'Hari Buruh Internasional', category: 'Libur Nasional' },
  '2026-05-14': { name: 'Kenaikan Yesus Kristus', category: 'Libur Nasional' },
  '2026-05-15': { name: 'Cuti Bersama Kenaikan Yesus Kristus', category: 'Cuti Bersama' },
  '2026-05-27': { name: 'Hari Raya Idul Adha 1447 Hijriah', category: 'Libur Nasional' },
  '2026-05-28': { name: 'Cuti Bersama Hari Raya Idul Adha 1447 Hijriah', category: 'Cuti Bersama' },
  '2026-05-31': { name: 'Hari Raya Waisak 2570 BE', category: 'Libur Nasional' },
  '2026-06-01': { name: 'Hari Lahir Pancasila', category: 'Libur Nasional' },
  '2026-06-16': { name: '1 Muharam Tahun Baru Islam 1448 Hijriah', category: 'Libur Nasional' },
  '2026-08-17': { name: 'Hari Kemerdekaan Republik Indonesia ke-81', category: 'Libur Nasional' },
  '2026-08-25': { name: 'Maulid Nabi Muhammad SAW 1448 Hijriah', category: 'Libur Nasional' },
  '2026-12-24': { name: 'Cuti Bersama Hari Raya Natal', category: 'Cuti Bersama' },
  '2026-12-25': { name: 'Kelahiran Yesus Kristus (Hari Raya Natal)', category: 'Libur Nasional' },

  // === 2027 ===
  '2027-01-01': { name: 'Tahun Baru 2027 Masehi', category: 'Libur Nasional' },
  '2027-01-05': { name: 'Isra Mikraj Nabi Muhammad SAW', category: 'Libur Nasional' },
  '2027-02-05': { name: 'Cuti Bersama Tahun Baru Imlek 2578 Kongzili', category: 'Cuti Bersama' },
  '2027-02-06': { name: 'Tahun Baru Imlek 2578 Kongzili', category: 'Libur Nasional' },
  '2027-03-08': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', category: 'Libur Nasional' },
  '2027-03-09': { name: 'Cuti Bersama Hari Raya Idul Fitri 1448 Hijriah', category: 'Cuti Bersama' },
  '2027-03-10': { name: 'Hari Raya Idul Fitri 1448 Hijriah', category: 'Libur Nasional' },
  '2027-03-11': { name: 'Hari Raya Idul Fitri 1448 Hijriah (Hari Kedua)', category: 'Libur Nasional' },
  '2027-03-12': { name: 'Cuti Bersama Hari Raya Idul Fitri 1448 Hijriah', category: 'Cuti Bersama' },
  '2027-03-26': { name: 'Wafat Yesus Kristus (Jumat Agung)', category: 'Libur Nasional' },
  '2027-03-28': { name: 'Kebangkitan Yesus Kristus (Hari Paskah)', category: 'Libur Nasional' },
  '2027-05-01': { name: 'Hari Buruh Internasional', category: 'Libur Nasional' },
  '2027-05-06': { name: 'Kenaikan Yesus Kristus', category: 'Libur Nasional' },
  '2027-05-17': { name: 'Hari Raya Idul Adha 1448 Hijriah', category: 'Libur Nasional' },
  '2027-05-20': { name: 'Hari Raya Waisak 2571 BE', category: 'Libur Nasional' },
  '2027-06-01': { name: 'Hari Lahir Pancasila', category: 'Libur Nasional' },
  '2027-06-06': { name: '1 Muharam Tahun Baru Islam 1449 Hijriah', category: 'Libur Nasional' },
  '2027-08-15': { name: 'Maulid Nabi Muhammad SAW 1449 Hijriah', category: 'Libur Nasional' },
  '2027-08-17': { name: 'Hari Kemerdekaan Republik Indonesia ke-82', category: 'Libur Nasional' },
  '2027-12-25': { name: 'Kelahiran Yesus Kristus (Hari Raya Natal)', category: 'Libur Nasional' },
};

/**
 * Fallback hari libur tetap tahunan pada Kalender Masehi (jika tahun di luar daftar spesifik)
 */
const FIXED_ANNUAL_MASEHI_HOLIDAYS: Record<string, string> = {
  '01-01': 'Tahun Baru Masehi',
  '05-01': 'Hari Buruh Internasional',
  '06-01': 'Hari Lahir Pancasila',
  '08-17': 'Hari Kemerdekaan Republik Indonesia (HUT RI)',
  '12-25': 'Hari Raya Natal',
};

/**
 * Memeriksa apakah suatu tanggal YYYY-MM-DD pada Kalender Masehi merupakan Tanggal Merah
 * (Hari Libur Nasional, Cuti Bersama, atau Hari Minggu).
 */
export function getIndonesianCalendarHoliday(
  dateStr: string,
  options?: { includeSunday?: boolean }
): CalendarHolidayInfo | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  // 1. Cek daftar spesifik Hari Libur Nasional & Cuti Bersama
  const exactMatch = INDONESIAN_MASEHI_HOLIDAYS[trimmed];
  if (exactMatch) {
    return {
      date: trimmed,
      name: exactMatch.name,
      category: exactMatch.category,
    };
  }

  // 2. Cek tanggal merah tetap tahunan (MM-DD)
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const mmDd = `${parts[1]}-${parts[2]}`;
    if (FIXED_ANNUAL_MASEHI_HOLIDAYS[mmDd]) {
      return {
        date: trimmed,
        name: FIXED_ANNUAL_MASEHI_HOLIDAYS[mmDd],
        category: 'Libur Nasional',
      };
    }

    // 3. Opsional: Cek apakah jatuh pada Hari Minggu di kalender Masehi
    if (options?.includeSunday) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (y && m && d) {
        const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        if (dt.getUTCDay() === 0) {
          return {
            date: trimmed,
            name: 'Libur Akhir Pekan (Hari Minggu)',
            category: 'Hari Minggu',
          };
        }
      }
    }
  }

  return null;
}
