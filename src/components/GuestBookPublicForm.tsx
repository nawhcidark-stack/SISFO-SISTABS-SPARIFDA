import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  User, 
  Briefcase, 
  Calendar, 
  Clock, 
  Phone, 
  FileText, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft,
  ShieldCheck,
  QrCode,
  MapPin,
  RefreshCw,
  Award,
  BookOpen,
  Check,
  Lightbulb,
  Search
} from 'lucide-react';
import { SchoolIdentity, GuestBookEntry, GuestBookCategory } from '../types';

interface GuestBookPublicFormProps {
  schoolIdentity?: SchoolIdentity;
  onBackToLogin?: () => void;
}

const COACHING_SUBJECT_PRESETS = [
  'Supervisi Akademik & Pembelajaran Guru',
  'Manajerial & Tata Kelola Lembaga Sekolah',
  'Implementasi Kurikulum & Perangkat Ajar',
  'Administrasi Kesiswaan & Standar Penilaian',
  'Sarana Prasarana & Tata Kelola Keuangan',
  'Monitoring, Evaluasi (Monev) & Akreditasi'
];

export default function GuestBookPublicForm({
  schoolIdentity,
  onBackToLogin
}: GuestBookPublicFormProps) {
  const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getCurrentTime = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Determine initial category from URL query parameter
  const getInitialCategory = (): GuestBookCategory => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const cat = urlParams.get('type') || hashParams.get('type') || urlParams.get('category') || hashParams.get('category');
      if (cat === 'pembinaan') return 'pembinaan';
    } catch (_) {}
    return 'umum';
  };

  const [category, setCategory] = useState<GuestBookCategory>(getInitialCategory);
  const [date, setDate] = useState<string>(getTodayDate());
  const [time, setTime] = useState<string>(getCurrentTime());
  const [name, setName] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Specific fields for Buku Tamu Pembinaan
  const [supervisorNip, setSupervisorNip] = useState<string>('');
  const [coachingSubject, setCoachingSubject] = useState<string>('');
  const [findings, setFindings] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submittedEntry, setSubmittedEntry] = useState<GuestBookEntry | null>(null);

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage(category === 'pembinaan' ? 'Silakan isi Nama Pembina / Pengawas.' : 'Silakan isi Nama Lengkap Anda.');
      return;
    }
    if (!institution.trim()) {
      setErrorMessage(category === 'pembinaan' ? 'Silakan isi Instansi Pembina (misal: Disdik / LP Ma\'arif / Kemenag).' : 'Silakan isi Asal Instansi atau Organisasi.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Silakan isi No. Handphone / WhatsApp yang dapat dihubungi.');
      return;
    }

    if (category === 'umum' && !purpose.trim()) {
      setErrorMessage('Silakan isi Keperluan Kunjungan Anda.');
      return;
    }

    if (category === 'pembinaan') {
      if (!coachingSubject.trim()) {
        setErrorMessage('Silakan isi atau pilih Aspek / Materi Pembinaan.');
        return;
      }
      if (!findings.trim() && !recommendations.trim()) {
        setErrorMessage('Silakan isi Temuan Pembinaan atau Rekomendasi / Saran Tindak Lanjut.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<GuestBookEntry> = {
        category,
        date,
        time,
        name: name.trim(),
        position: position.trim(),
        institution: institution.trim(),
        purpose: category === 'pembinaan' ? (purpose.trim() || coachingSubject.trim() || 'Pembinaan & Supervisi') : purpose.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        supervisorNip: category === 'pembinaan' ? supervisorNip.trim() : undefined,
        coachingSubject: category === 'pembinaan' ? coachingSubject.trim() : undefined,
        findings: category === 'pembinaan' ? findings.trim() : undefined,
        recommendations: category === 'pembinaan' ? recommendations.trim() : undefined,
        followUpStatus: category === 'pembinaan' ? 'Belum' : undefined,
        status: 'Diterima'
      };

      const res = await fetch('/api/guest-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan data buku tamu.');
      }

      setSubmittedEntry(data.item || { ...payload, id: 'gb-saved' });
    } catch (err: any) {
      console.error('Error saving guest book:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mengirim data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setPosition('');
    setInstitution('');
    setPurpose('');
    setPhone('');
    setNotes('');
    setSupervisorNip('');
    setCoachingSubject('');
    setFindings('');
    setRecommendations('');
    setDate(getTodayDate());
    setTime(getCurrentTime());
    setSubmittedEntry(null);
    setErrorMessage('');
  };

  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolAddress = schoolIdentity?.address || "Jl. Raya Kasri No. 19 Pandaan, Pasuruan";
  const schoolLogo = schoolIdentity?.logo || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between py-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo Sekolah" className="h-full w-full object-contain rounded-xl" />
            ) : (
              <Building2 className="text-emerald-400" size={24} />
            )}
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wide text-white leading-tight uppercase">
              {schoolName}
            </h1>
            <p className="text-[11px] text-indigo-200/80 flex items-center gap-1 font-medium">
              <MapPin size={11} className="text-emerald-400" />
              <span className="truncate max-w-[220px] sm:max-w-sm">{schoolAddress}</span>
            </p>
          </div>
        </div>

        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Kembali ke Portal</span>
          </button>
        )}
      </header>

      {/* Main Content Card */}
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {submittedEntry ? (
            /* SUCCESS CONFIRMATION VIEW */
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-center space-y-6 relative overflow-hidden"
            >
              <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${submittedEntry.category === 'pembinaan' ? 'from-amber-500 via-orange-500 to-amber-600' : 'from-emerald-500 via-teal-500 to-indigo-600'}`} />

              <div className={`inline-flex p-4 rounded-3xl ${submittedEntry.category === 'pembinaan' ? 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/50' : 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50'} shadow-inner`}>
                <CheckCircle2 size={48} className="animate-bounce" />
              </div>

              <div>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${submittedEntry.category === 'pembinaan' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'} inline-block mb-2`}>
                  {submittedEntry.category === 'pembinaan' ? 'Buku Tamu Pembinaan Resmi ✓' : 'Buku Tamu Umum Tercatat ✓'}
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {submittedEntry.category === 'pembinaan' ? 'Catatan Pembinaan Berhasil Dicatat!' : 'Terima Kasih atas Kunjungan Anda!'}
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto mt-1">
                  {submittedEntry.category === 'pembinaan'
                    ? 'Data kunjungan supervisi dan rekomendasi pembinaan Anda telah tersimpan langsung di Database Resmi Kepala Sekolah.'
                    : 'Data kunjungan Anda telah resmi tersimpan langsung di Buku Tamu Digital Kepala Sekolah.'}
                </p>
              </div>

              {/* Summary Receipt Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 font-bold text-slate-600">
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider">
                    {submittedEntry.category === 'pembinaan' ? 'Ringkasan Pembinaan' : 'Ringkasan Tamu'}
                  </span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    {submittedEntry.date} • {submittedEntry.time || time} WIB
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-slate-500 font-medium">
                    {submittedEntry.category === 'pembinaan' ? 'Nama Pembina' : 'Nama Tamu'}
                  </span>
                  <span className="col-span-2 font-bold text-slate-900">
                    {submittedEntry.name}
                    {submittedEntry.supervisorNip && (
                      <span className="block text-[11px] font-mono text-slate-500 font-normal">NIP/NUPTK: {submittedEntry.supervisorNip}</span>
                    )}
                  </span>
                </div>

                {submittedEntry.position && (
                  <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Jabatan</span>
                    <span className="col-span-2 font-semibold text-slate-800">{submittedEntry.position}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Asal Instansi</span>
                  <span className="col-span-2 font-extrabold text-indigo-700">{submittedEntry.institution}</span>
                </div>

                {submittedEntry.category === 'pembinaan' ? (
                  <>
                    {submittedEntry.coachingSubject && (
                      <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Aspek Pembinaan</span>
                        <span className="col-span-2 font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg">
                          {submittedEntry.coachingSubject}
                        </span>
                      </div>
                    )}
                    {submittedEntry.findings && (
                      <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Temuan / Catatan</span>
                        <span className="col-span-2 text-slate-800 leading-relaxed font-medium">
                          {submittedEntry.findings}
                        </span>
                      </div>
                    )}
                    {submittedEntry.recommendations && (
                      <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Rekomendasi</span>
                        <span className="col-span-2 text-slate-800 leading-relaxed font-semibold text-emerald-800 bg-emerald-50/70 p-2 rounded-lg">
                          {submittedEntry.recommendations}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Keperluan</span>
                    <span className="col-span-2 font-semibold text-slate-800 leading-relaxed">{submittedEntry.purpose}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">No. WhatsApp</span>
                  <span className="col-span-2 font-mono font-bold text-slate-700">{submittedEntry.phone}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium text-left flex items-start gap-2.5">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {submittedEntry.category === 'pembinaan'
                    ? 'Instrumen pembinaan ini akan otomatis tercatat pada Laporan Supervisi dan Pembinaan Resmi Kepala Sekolah.'
                    : 'Silakan menunggu sebentar di ruang tamu atau melapor kepada resepsionis / guru piket untuk dipersilakan menemui pihak yang dituju.'}
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  <span>Isi Formulir Tamu Lainnya</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* GUEST BOOK ENTRY FORM */
            <motion.div
              key="form-card"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              className="bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 relative overflow-hidden"
            >
              <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${category === 'pembinaan' ? 'from-amber-500 via-orange-500 to-indigo-600' : 'from-emerald-500 via-teal-500 to-indigo-600'}`} />

              {/* Title & Badges */}
              <div className="mb-5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  <QrCode size={13} />
                  <span>Buku Tamu Digital Resmi</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Formulir Kunjungan Buku Tamu
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Selamat datang di {schoolName}. Silakan pilih jenis kunjungan Anda di bawah ini:
                </p>
              </div>

              {/* 2 JENIS BUKU TAMU SELECTOR (TABS) */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-5 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('umum');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    category === 'umum'
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen size={15} className={category === 'umum' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>1. Buku Tamu Umum</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCategory('pembinaan');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    category === 'pembinaan'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 border border-amber-400'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award size={15} className={category === 'pembinaan' ? 'text-white' : 'text-amber-500'} />
                  <span>2. Buku Tamu Pembinaan</span>
                </button>
              </div>

              {/* Banner Penjelasan Jenis */}
              {category === 'pembinaan' ? (
                <div className="mb-5 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                  <Award size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Buku Tamu Pembinaan / Supervisi:</span>
                    <span className="text-[11.5px] text-amber-800 font-medium">
                      Khusus Pengawas Pembina Sekolah, Pejabat Dinas Pendidikan, Pengurus LP Ma&apos;arif NU, Pengawas Manajerial/Akademik, Asesor Akreditasi, atau Tim Monev.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-5 p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-950 flex items-start gap-2.5">
                  <BookOpen size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Buku Tamu Umum:</span>
                    <span className="text-[11.5px] text-indigo-800 font-medium">
                      Untuk wali murid, dinas non-supervisi, instansi kemitraan, vendor/rekanan, tamu kedinasan, atau masyarakat umum.
                    </span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-shake">
                  <div className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Tanggal & Waktu Kunjungan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      <span>Tanggal Kunjungan</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      <span>Waktu / Jam (WIB)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="09:30"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Nama Lengkap Tamu / Pembina */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={category === 'pembinaan' ? 'sm:col-span-2' : 'sm:col-span-3'}>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <User size={13} className="text-indigo-600" />
                      <span>{category === 'pembinaan' ? 'Nama Pembina / Pengawas' : 'Nama Lengkap Tamu'}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={category === 'pembinaan' ? 'Contoh: Drs. H. Bambang Sutrisno, M.Pd' : 'Contoh: Drs. H. Ahmad Fauzi'}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none"
                    />
                  </div>

                  {category === 'pembinaan' && (
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                        NIP / NUPTK (Opsional)
                      </label>
                      <input
                        type="text"
                        value={supervisorNip}
                        onChange={(e) => setSupervisorNip(e.target.value)}
                        placeholder="197508..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Jabatan & Asal Instansi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Briefcase size={13} className="text-indigo-600" />
                      <span>Jabatan / Profesi</span>
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder={category === 'pembinaan' ? 'Contoh: Pengawas Pembina SMP / Tim Monev' : 'Contoh: Wali Murid / Pimpinan Instansi'}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Building2 size={13} className="text-indigo-600" />
                      <span>{category === 'pembinaan' ? 'Lembaga / Instansi Pembina' : 'Asal Instansi / Organisasi'}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder={category === 'pembinaan' ? 'Contoh: Disdik Kab. Pasuruan / LP Ma\'arif NU' : 'Contoh: Dinas / Puskesmas / Umum'}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none"
                    />
                  </div>
                </div>

                {/* No. HP / WhatsApp */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-600" />
                    <span>No. Handphone / WhatsApp</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none font-mono"
                  />
                </div>

                {/* KHUSUS BUKU TAMU PEMBINAAN: ASPEK, TEMUAN, & REKOMENDASI */}
                {category === 'pembinaan' ? (
                  <div className="space-y-4 pt-1 border-t border-slate-100">
                    {/* Aspek Pembinaan */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1.5">
                        <Award size={13} className="text-amber-600" />
                        <span>Aspek / Materi Pembinaan</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={coachingSubject}
                        onChange={(e) => setCoachingSubject(e.target.value)}
                        placeholder="Pilih dari preset di bawah atau ketik langsung aspek pembinaan..."
                        required
                        className="w-full bg-amber-50/50 border border-amber-300 focus:border-amber-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors focus:outline-none"
                      />

                      {/* Quick chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {COACHING_SUBJECT_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCoachingSubject(preset)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                              coachingSubject === preset
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-slate-50 hover:bg-amber-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Temuan / Hasil Pemantauan Pembinaan */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Search size={13} className="text-amber-600" />
                        <span>Temuan / Catatan Hasil Pembinaan</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="Tuliskan temuan di lapangan, evaluasi, aspek positif, atau kendala yang ditemukan..."
                        required
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-colors focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    {/* Saran & Rekomendasi Tindak Lanjut */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
                        <Lightbulb size={13} className="text-emerald-600" />
                        <span>Saran &amp; Rekomendasi Tindak Lanjut</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        placeholder="Tuliskan saran, rekomendasi langkah perbaikan, atau arahan tindak lanjut untuk kepala sekolah dan guru..."
                        required
                        className="w-full bg-emerald-50/30 border border-emerald-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-colors focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  /* BUKU TAMU UMUM: KEPERLUAN */
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-600" />
                      <span>Keperluan Kunjungan</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Jelaskan maksud dan tujuan kunjungan, atau pihak yang ingin ditemui..."
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-colors focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Catatan Tambahan (Opsional) */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan tambahan jika ada..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors focus:outline-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3.5 ${
                      category === 'pembinaan'
                        ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 shadow-amber-600/25'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 shadow-emerald-600/25'
                    } disabled:opacity-50 text-white rounded-2xl font-black text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan Langsung ke Database MySQL...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>
                          {category === 'pembinaan' ? 'Kirim & Catat di Buku Tamu Pembinaan' : 'Kirim & Catat di Buku Tamu Umum'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span>Data tersimpan langsung secara permanen di database MySQL sekolah</span>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center py-4 text-[11px] text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} {schoolName} • Sistem Informasi Buku Tamu Digital &amp; Supervisi Pembinaan
      </footer>
    </div>
  );
}
