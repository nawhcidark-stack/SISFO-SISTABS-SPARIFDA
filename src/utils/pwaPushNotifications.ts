import { RealtimeNotification } from '../types';
import { getNotificationCategory } from './notificationUtils';

const SHOWN_PUSH_STORAGE_KEY = 'smp_maarif_shown_push_ids_v1';
const PUSH_ENABLED_STORAGE_KEY = 'smp_maarif_push_enabled_v1';

const shownPushIdsMemory = new Set<string>();

function loadShownPushIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SHOWN_PUSH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => shownPushIdsMemory.add(String(id)));
      }
    }
  } catch (_) {}
  return shownPushIdsMemory;
}

function markPushIdShown(id: string): boolean {
  if (!id) return false;
  loadShownPushIds();
  if (shownPushIdsMemory.has(id)) {
    return true; // Already shown
  }
  shownPushIdsMemory.add(id);
  if (shownPushIdsMemory.size > 300) {
    const oldest = shownPushIdsMemory.values().next().value;
    if (oldest) shownPushIdsMemory.delete(oldest);
  }
  try {
    sessionStorage.setItem(SHOWN_PUSH_STORAGE_KEY, JSON.stringify(Array.from(shownPushIdsMemory)));
  } catch (_) {}
  return false;
}

/**
 * Checks if a notification is a "Tagihan Terbit" broadcast (for SPP or Pembayaran Lain-lain)
 * which must be delivered to ALL accounts ("untuk tagihan terbit notifikasi untuk semuanya").
 */
export function isBillPublishedNotification(notif: RealtimeNotification): boolean {
  const idLower = (notif.id || '').toLowerCase();
  const titleLower = (notif.title || '').toLowerCase();
  const msgLower = (notif.message || '').toLowerCase();
  const combined = `${titleLower} ${msgLower}`;

  // Never classify a "Lunas" / "Dibatalkan" / "Dikoreksi" notification as Tagihan Terbit
  if (
    titleLower.includes('lunas') ||
    titleLower.includes('dibatalkan') ||
    titleLower.includes('dikoreksi') ||
    titleLower.includes('penarikan') ||
    titleLower.includes('setoran') ||
    idLower.includes('-paid-') ||
    idLower.includes('-cancel-') ||
    idLower.includes('-auto-')
  ) {
    return false;
  }

  return (
    idLower.startsWith('notif-bill-pub-') ||
    idLower.startsWith('notif-spp-pub-') ||
    idLower.startsWith('notif-misc-pub-') ||
    idLower.startsWith('notif-new-year-') ||
    idLower.startsWith('notif-promote-std-') ||
    titleLower.includes('tagihan terbit') ||
    titleLower.includes('tagihan spp terbit') ||
    titleLower.includes('tagihan baru') ||
    titleLower.includes('tagihan bulanan baru') ||
    titleLower.includes('tagihan pembayaran baru') ||
    titleLower.includes('tagihan lain-lain terbit') ||
    (combined.includes('tagihan') && (combined.includes('terbit') || combined.includes('diterbitkan')))
  );
}

/**
 * Checks if a notification is a personal payment / Lunas / Tabungan transaction
 * belonging to a specific student account ("misal siswa A lunas maka hanya siswa A tersebut yang mendapat notifikasi Lunas").
 */
export function isPersonalPaymentOrSavingsNotification(notif: RealtimeNotification): boolean {
  if (isBillPublishedNotification(notif)) {
    return false;
  }

  const idLower = (notif.id || '').toLowerCase();
  const titleLower = (notif.title || '').toLowerCase();
  const msgLower = (notif.message || '').toLowerCase();
  const combined = `${titleLower} ${msgLower}`;

  if (
    idLower.startsWith('notif-spp-') ||
    idLower.startsWith('notif-sav-') ||
    idLower.startsWith('notif-misc-paid-') ||
    idLower.startsWith('notif-misc-auto-') ||
    idLower.startsWith('notif-misc-cancelled-') ||
    idLower.startsWith('notif-cart-') ||
    idLower.startsWith('auto-recon-')
  ) {
    // Exclude global SPP rate config info if it's not a personal payment
    if (idLower.startsWith('notif-spp-config-')) return false;
    return true;
  }

  return (
    titleLower.includes('lunas') ||
    titleLower.includes('setoran tabungan') ||
    titleLower.includes('penarikan tabungan') ||
    titleLower.includes('tarik tabungan') ||
    titleLower.includes('bebas spp') ||
    titleLower.includes('pembatalan') ||
    titleLower.includes('dibatalkan') ||
    combined.includes('telah lunas') ||
    combined.includes('berhasil diverifikasi') ||
    combined.includes('saldo baru:') ||
    combined.includes('saldo saat ini:')
  );
}

/**
 * Checks if a notification is an Admin-only operational log that should not appear on student accounts.
 */
function isAdminOnlyOperationalNotification(notif: RealtimeNotification): boolean {
  const idLower = (notif.id || '').toLowerCase();
  return (
    idLower.startsWith('notif-bulk-sav-sch-') ||
    idLower.startsWith('notif-rep-') ||
    idLower.startsWith('notif-import-std-') ||
    idLower.startsWith('notif-undo-import-') ||
    idLower.startsWith('notif-teachers-import-') ||
    idLower.startsWith('notif-delete-std-') ||
    idLower.startsWith('notif-sal-paid-') ||
    idLower.startsWith('notif-sys-')
  );
}

/**
 * Determines whether a notification belongs to the currently active account.
 * - Student A only receives:
 *   1. Personal notifications (SPP Lunas, Tabungan, Pembayaran Lain-lain Lunas, BK) where `notif.studentId === studentA.id`
 *   2. Broadcast notifications for all students (such as "Tagihan Terbit" for SPP & Pembayaran Lain-lain) where `notif.studentId` is empty/undefined.
 * - Student A NEVER receives Student B's "Lunas" or "Tabungan" notifications.
 */
export function isNotificationForAccount(
  notif: RealtimeNotification,
  role: string,
  currentStudent?: { id: string; name?: string; nis?: string; class?: string } | null
): boolean {
  if (!notif) return false;

  if (role === 'student') {
    if (!currentStudent || !currentStudent.id) {
      return false;
    }

    const currentId = String(currentStudent.id).trim();
    const currentNis = currentStudent.nis ? String(currentStudent.nis).trim() : '';
    const notifStudentId = notif.studentId ? String(notif.studentId).trim() : '';

    // 1. Hide Admin-only operational summary notifications from students
    if (isAdminOnlyOperationalNotification(notif)) {
      return false;
    }

    // 2. BK / Konseling notifications MUST match this exact student
    const idLower = (notif.id || '').toLowerCase();
    const titleLower = (notif.title || '').toLowerCase();
    const msgLower = (notif.message || '').toLowerCase();
    const isBK =
      notif.category === 'bk' ||
      idLower.includes('-scl-') ||
      idLower.includes('-bk-') ||
      idLower.includes('-sil-') ||
      idLower.includes('-sdl-') ||
      titleLower.includes('bimbingan') ||
      titleLower.includes('konseling') ||
      msgLower.includes('bimbingan') ||
      msgLower.includes('konseling');

    if (isBK) {
      return Boolean(notifStudentId && (notifStudentId === currentId || (currentNis && notifStudentId === currentNis)));
    }

    // 3. Tagihan Terbit (SPP / Pembayaran Lain-lain) -> Tampil untuk semua akun jika broadcast (!notifStudentId),
    //    atau untuk siswa spesifik jika diterbitkan khusus 1 siswa
    if (isBillPublishedNotification(notif)) {
      if (!notifStudentId) {
        return true;
      }
      return notifStudentId === currentId || Boolean(currentNis && notifStudentId === currentNis);
    }

    // 4. If notification has an explicit studentId, it MUST match the logged-in student
    if (notifStudentId) {
      return notifStudentId === currentId || Boolean(currentNis && notifStudentId === currentNis);
    }

    // 5. If notification is a personal Payment Lunas / Tabungan notification WITHOUT studentId (e.g. legacy DB record),
    //    strictly verify whether the student's full name is explicitly in the message; otherwise block it so Student B never sees Student A's Lunas!
    if (isPersonalPaymentOrSavingsNotification(notif)) {
      const studentNameClean = (currentStudent.name || '').trim().toLowerCase();
      if (studentNameClean.length >= 3 && msgLower.includes(studentNameClean)) {
        return true;
      }
      return false;
    }

    // 6. General school broadcast (KBM / Pengumuman Umum) without studentId
    return true;
  }

  // Admin, Bendahara, Kepala Sekolah, Guru can view notifications
  return true;
}

/**
 * Checks if a notification is a financial event (Pembayaran SPP, Tabungan, Pembayaran Lain-lain - Tagihan Terbit / Lunas)
 * that should trigger a Browser & PWA Push Notification.
 */
export function isFinancialPushNotification(notif: RealtimeNotification): boolean {
  if (!notif) return false;
  if (isBillPublishedNotification(notif) || isPersonalPaymentOrSavingsNotification(notif)) {
    return true;
  }
  const cat = getNotificationCategory(notif);
  return cat === 'pembayaran' || notif.type === 'payment';
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export function isPushNotificationEnabledByUser(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (window.Notification.permission !== 'granted') return false;
  try {
    const pref = localStorage.getItem(PUSH_ENABLED_STORAGE_KEY);
    // Default to true once permission is granted unless explicitly turned off
    return pref !== 'false';
  } catch (_) {
    return true;
  }
}

export function setPushNotificationEnabledByUser(enabled: boolean): void {
  try {
    localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (_) {}
}

export async function requestBrowserAndPwaPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      setPushNotificationEnabledByUser(true);
    }
    return permission;
  } catch (_) {
    return window.Notification.permission;
  }
}

/**
 * Triggers a native OS / Browser / Installed PWA Push Notification via Service Worker
 * (with fallback to window.Notification).
 */
export async function triggerBrowserAndPwaPushNotification(
  notif: RealtimeNotification,
  options?: { force?: boolean; schoolLogo?: string }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (window.Notification.permission !== 'granted') {
    return false;
  }

  if (!options?.force && !isPushNotificationEnabledByUser()) {
    return false;
  }

  const tag = notif.id || `notif-${Date.now()}`;
  if (!options?.force && markPushIdShown(tag)) {
    return false; // Prevent duplicate push popup for the same notification ID
  }

  const iconUrl = options?.schoolLogo || '/pwa-192x192.png';
  const badgeUrl = '/pwa-192x192.png';
  const title = notif.title || 'Notifikasi Pembayaran Sekolah';
  const body = notif.message || 'Terdapat pembaruan informasi tagihan / pembayaran pada akun Anda.';
  const category = getNotificationCategory(notif);

  // 1. Prefer Service Worker showNotification (required for installed Android/Desktop PWAs and background tabs)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, {
          body,
          icon: iconUrl,
          badge: badgeUrl,
          tag,
          renotify: false,
          vibrate: [200, 100, 200],
          data: {
            url: '/',
            id: tag,
            studentId: notif.studentId,
            category
          }
        } as NotificationOptions);
        return true;
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_PWA_NOTIFICATION',
          payload: {
            id: tag,
            tag,
            title,
            body,
            icon: iconUrl,
            badge: badgeUrl,
            url: '/',
            studentId: notif.studentId,
            category
          }
        });
        return true;
      }
    } catch (swErr) {
      console.warn('[PWA Push Notification] ServiceWorker showNotification fallback:', swErr);
    }
  }

  // 2. Fallback to standard Browser Notification API
  try {
    const browserNotif = new window.Notification(title, {
      body,
      icon: iconUrl,
      badge: badgeUrl,
      tag
    });
    browserNotif.onclick = () => {
      window.focus();
      browserNotif.close();
    };
    return true;
  } catch (err) {
    console.warn('[Browser Push Notification] Failed to construct Notification:', err);
    return false;
  }
}
