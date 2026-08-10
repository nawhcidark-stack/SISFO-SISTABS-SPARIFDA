import { RealtimeNotification } from '../types';

export type NotifTabCategory = 'semua' | 'kbm' | 'pembayaran' | 'bk' | 'admin';

export interface CategoryTabConfig {
  id: NotifTabCategory;
  label: string;
  shortLabel: string;
  iconName: string;
  badgeBg: string;
  activeClass: string;
  inactiveClass: string;
  badgePillClass: string;
}

export const CATEGORY_TABS: CategoryTabConfig[] = [
  {
    id: 'semua',
    label: 'Semua Notifikasi',
    shortLabel: 'Semua',
    iconName: 'Bell',
    badgeBg: 'bg-slate-100 text-slate-700',
    activeClass: 'bg-slate-900 text-white border-slate-900 shadow-sm',
    inactiveClass: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
    badgePillClass: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  {
    id: 'kbm',
    label: 'KBM & Akademik',
    shortLabel: 'KBM',
    iconName: 'BookOpen',
    badgeBg: 'bg-sky-100 text-sky-800',
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-sm',
    inactiveClass: 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50/50 hover:text-sky-700',
    badgePillClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  {
    id: 'pembayaran',
    label: 'Keuangan & SPP',
    shortLabel: 'Pembayaran',
    iconName: 'CreditCard',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    inactiveClass: 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50/50 hover:text-emerald-700',
    badgePillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'bk',
    label: 'BK & Kedisiplinan',
    shortLabel: 'BK',
    iconName: 'ShieldAlert',
    badgeBg: 'bg-purple-100 text-purple-800',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm',
    inactiveClass: 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50/50 hover:text-purple-700',
    badgePillClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'admin',
    label: 'Admin & Pengumuman',
    shortLabel: 'Admin / Lainnya',
    iconName: 'Megaphone',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
    inactiveClass: 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50/50 hover:text-indigo-700',
    badgePillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
];

export function getNotificationCategory(notif: RealtimeNotification): 'kbm' | 'pembayaran' | 'bk' | 'admin' {
  if (notif.category) {
    const c = notif.category.toLowerCase();
    if (c === 'kbm') return 'kbm';
    if (c === 'pembayaran' || c === 'payment') return 'pembayaran';
    if (c === 'bk' || c === 'counseling') return 'bk';
    if (c === 'admin' || c === 'system' || c === 'lainnya') return 'admin';
  }

  if (notif.type === 'payment') return 'pembayaran';

  const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();

  // 1. BK & Kedisiplinan
  if (/\b(bk|konseling|pelanggaran|poin|prestasi|pembinaan|sanksi|sikap|kedisiplinan|panggilan|kasus|pembimbingan|bimbingan|tatib|tata tertib)\b/i.test(text)) {
    return 'bk';
  }

  // 2. Pembayaran & Keuangan
  if (/\b(spp|bayar|pembayaran|lunas|kuitansi|tagihan|tabungan|setoran|tarik|transaksi|waive|bebas|midtrans|rekening|biaya|iuran|kas|teller|sandi|beasiswa|kantin|deposito)\b/i.test(text)) {
    return 'pembayaran';
  }

  // 3. KBM & Akademik
  if (/\b(kbm|jurnal|absensi|hadir|izin|sakit|alpa|jadwal|pelajaran|mengajar|nilai|rapor|presensi|pertemuan|materi|tugas|akademik|ulangan|ujian|pas|pts|pr|semester|rekap absensi)\b/i.test(text)) {
    return 'kbm';
  }

  // 4. Admin & Pengumuman Sekolah
  return 'admin';
}

export function filterNotificationsByCategory(
  notifications: RealtimeNotification[],
  category: NotifTabCategory,
  searchQuery: string = ''
): RealtimeNotification[] {
  const query = searchQuery.toLowerCase().trim();

  return notifications.filter((notif) => {
    // Check search query match
    const titleMatch = (notif.title || '').toLowerCase().includes(query);
    const messageMatch = (notif.message || '').toLowerCase().includes(query);
    const matchesSearch = !query || titleMatch || messageMatch;

    if (!matchesSearch) return false;

    if (category === 'semua') return true;

    const notifCat = getNotificationCategory(notif);
    return notifCat === category;
  });
}

export function getCategoryCounts(
  notifications: RealtimeNotification[],
  searchQuery: string = ''
): Record<NotifTabCategory, number> {
  const counts: Record<NotifTabCategory, number> = {
    semua: 0,
    kbm: 0,
    pembayaran: 0,
    bk: 0,
    admin: 0
  };

  const query = searchQuery.toLowerCase().trim();

  notifications.forEach((notif) => {
    const titleMatch = (notif.title || '').toLowerCase().includes(query);
    const messageMatch = (notif.message || '').toLowerCase().includes(query);
    if (query && !titleMatch && !messageMatch) return;

    counts.semua += 1;
    const cat = getNotificationCategory(notif);
    counts[cat] += 1;
  });

  return counts;
}
