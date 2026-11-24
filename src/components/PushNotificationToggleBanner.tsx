import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, Smartphone } from 'lucide-react';
import {
  getBrowserNotificationPermission,
  isPushNotificationEnabledByUser,
  setPushNotificationEnabledByUser,
  requestBrowserAndPwaPushPermission,
  triggerBrowserAndPwaPushNotification
} from '../utils/pwaPushNotifications';

interface PushNotificationToggleBannerProps {
  variant?: 'header' | 'card';
  accountName?: string;
  studentId?: string;
  schoolLogo?: string;
}

export const PushNotificationToggleBanner: React.FC<PushNotificationToggleBannerProps> = ({
  variant = 'card',
  accountName,
  studentId,
  schoolLogo
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserNotificationPermission()
  );
  const [enabled, setEnabled] = useState<boolean>(() => isPushNotificationEnabledByUser());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncState = () => {
      setPermission(getBrowserNotificationPermission());
      setEnabled(isPushNotificationEnabledByUser());
    };
    window.addEventListener('focus', syncState);
    window.addEventListener('push-pref-changed', syncState);
    return () => {
      window.removeEventListener('focus', syncState);
      window.removeEventListener('push-pref-changed', syncState);
    };
  }, []);

  const notifyPrefChanged = () => {
    window.dispatchEvent(new Event('push-pref-changed'));
  };

  const handleToggleOrRequest = async () => {
    const currentPerm = getBrowserNotificationPermission();
    if (currentPerm === 'unsupported') {
      setStatusMessage('Browser perangkat ini belum mendukung Web Push Notification.');
      return;
    }

    if (currentPerm !== 'granted') {
      const result = await requestBrowserAndPwaPushPermission();
      setPermission(result);
      if (result === 'granted') {
        setPushNotificationEnabledByUser(true);
        setEnabled(true);
        notifyPrefChanged();
        setStatusMessage('Push Notifikasi Browser & PWA berhasil diaktifkan!');
        await triggerBrowserAndPwaPushNotification(
          {
            id: `notif-push-welcome-${Date.now()}`,
            studentId,
            title: 'Push Notifikasi Aktif 🔔',
            message: accountName
              ? `Notifikasi Pembayaran SPP, Tabungan & Pembayaran Lain-lain (Tagihan Terbit & Lunas) aktif untuk akun ${accountName}.`
              : 'Notifikasi Pembayaran SPP, Tabungan & Pembayaran Lain-lain (Tagihan Terbit & Lunas) telah aktif.',
            type: 'payment',
            category: 'pembayaran',
            createdAt: new Date().toISOString()
          },
          { force: true, schoolLogo }
        );
      } else if (result === 'denied') {
        setStatusMessage('Izin notifikasi diblokir di pengaturan browser. Silakan izinkan notifikasi pada ikon gembok URL browser.');
      }
      return;
    }

    // Toggle preference when permission is already granted
    const nextEnabled = !enabled;
    setPushNotificationEnabledByUser(nextEnabled);
    setEnabled(nextEnabled);
    notifyPrefChanged();
    setStatusMessage(
      nextEnabled
        ? 'Push Notifikasi Browser & PWA diaktifkan.'
        : 'Push Notifikasi Browser & PWA dinonaktifkan sementara.'
    );

    if (nextEnabled) {
      await triggerBrowserAndPwaPushNotification(
        {
          id: `notif-push-reenabled-${Date.now()}`,
          studentId,
          title: 'Push Notifikasi Diaktifkan Kembali 🔔',
          message: accountName
            ? `Notifikasi SPP, Tabungan & Pembayaran Lain-lain aktif untuk akun ${accountName}.`
            : 'Notifikasi SPP, Tabungan & Pembayaran Lain-lain aktif.',
          type: 'payment',
          category: 'pembayaran',
          createdAt: new Date().toISOString()
        },
        { force: true, schoolLogo }
      );
    }
  };

  const handleTestPush = async () => {
    if (permission !== 'granted') {
      await handleToggleOrRequest();
      return;
    }
    if (!enabled) {
      setPushNotificationEnabledByUser(true);
      setEnabled(true);
      notifyPrefChanged();
    }
    const ok = await triggerBrowserAndPwaPushNotification(
      {
        id: `notif-push-test-${Date.now()}`,
        studentId,
        title: `Pembayaran SPP Lunas ✅ (Simulasi Akun ${accountName || 'Anda'})`,
        message: accountName
          ? `Contoh Push Notifikasi Browser & PWA khusus akun ${accountName}: Pembayaran SPP, Tabungan & Tagihan Lain-lain (Tagihan Terbit & Lunas).`
          : 'Contoh Push Notifikasi Browser & PWA: Pembayaran SPP, Tabungan & Tagihan Lain-lain (Tagihan Terbit & Lunas).',
        type: 'payment',
        category: 'pembayaran',
        createdAt: new Date().toISOString()
      },
      { force: true, schoolLogo }
    );
    if (ok) {
      setStatusMessage('Push notifikasi uji coba berhasil dikirim ke Browser / Aplikasi PWA Anda!');
    }
  };

  if (permission === 'unsupported') {
    return null;
  }

  const isActive = permission === 'granted' && enabled;

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleToggleOrRequest}
        className={`px-2.5 py-1.5 rounded-lg border transition-all text-xs flex items-center gap-1.5 cursor-pointer font-bold ${
          isActive
            ? 'bg-emerald-800 border-emerald-600 text-emerald-100 hover:bg-emerald-700'
            : permission === 'denied'
            ? 'bg-rose-950/80 border-rose-800 text-rose-200 hover:bg-rose-900'
            : 'bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/30 animate-pulse'
        }`}
        title={
          isActive
            ? 'Push Notifikasi Browser & PWA Aktif (Klik untuk nonaktifkan)'
            : 'Aktifkan Push Notifikasi Browser & Aplikasi PWA untuk SPP, Tabungan & Tagihan Lain-lain'
        }
      >
        {isActive ? <BellRing size={13} className="text-yellow-300" /> : <Bell size={13} />}
        <span className="text-[9.5px] uppercase tracking-wider whitespace-nowrap">
          {isActive ? 'Push PWA: ON' : 'Aktifkan Push Notif'}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all text-left shadow-xs ${
        isActive
          ? 'bg-emerald-50/80 border-emerald-200'
          : permission === 'denied'
          ? 'bg-rose-50 border-rose-200'
          : 'bg-amber-50/90 border-amber-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isActive
                ? 'bg-emerald-600 text-white'
                : permission === 'denied'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {isActive ? <BellRing size={16} /> : permission === 'denied' ? <BellOff size={16} /> : <Smartphone size={16} />}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-slate-900 text-xs">
                Push Notifikasi Browser &amp; Aplikasi PWA
              </h4>
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : permission === 'denied'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isActive ? 'AKTIF' : permission === 'denied' ? 'DIBLOKIR BROWSER' : 'BELUM AKTIF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
              Notifikasi otomatis untuk <strong>Pembayaran SPP</strong>, <strong>Tabungan</strong>, dan <strong>Pembayaran Lain-lain</strong>:
              status <strong>Lunas</strong> tampil khusus sesuai akun{' '}
              {accountName ? <strong>({accountName})</strong> : 'masing-masing'}, sedangkan{' '}
              <strong>Tagihan Terbit</strong> tampil untuk seluruh akun.
            </p>
            {statusMessage && (
              <p className="text-[10.5px] font-bold text-emerald-800 mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} className="shrink-0" />
                <span>{statusMessage}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleToggleOrRequest}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs ${
              isActive
                ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isActive ? 'Matikan Push' : 'Aktifkan Push Notif'}
          </button>
          <button
            type="button"
            onClick={handleTestPush}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs"
          >
            Tes Notif
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationToggleBanner;
