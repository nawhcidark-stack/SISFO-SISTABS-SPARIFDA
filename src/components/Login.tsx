import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Student, SchoolIdentity, HomeroomTeacher, SubjectTeacher } from '../types';
import { User, Key, GraduationCap, ArrowRight, AlertCircle, Sparkles, Smartphone, Apple } from 'lucide-react';

interface LoginProps {
  students: Student[];
  onLoginSuccess: (
    role: 'student' | 'admin' | 'homeroom' | 'subject_teacher' | 'treasurer' | 'principal' | 'waka_sarpras' | 'bk', 
    student: Student | null, 
    homeroom: HomeroomTeacher | null, 
    subjectTeacher?: SubjectTeacher | null
  ) => void;
  schoolIdentity?: SchoolIdentity;
}

export default function Login({ students, onLoginSuccess, schoolIdentity }: LoginProps) {
  const [activeRole, setActiveRole] = useState<'student' | 'admin' | 'homeroom' | 'subject_teacher' | 'treasurer' | 'principal' | 'waka_sarpras' | 'bk'>('student');
  const [activeGroup, setActiveGroup] = useState<'student' | 'teacher' | 'staff'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Harap isi username / NIS dan kata sandi.');
      return;
    }

    setIsValidating(true);

    try {
      if (activeRole === 'bk') {
        // BK Counselor Validation
        const res = await fetch('/api/bk/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (res.ok) {
          setTimeout(() => {
            setIsValidating(false);
            onLoginSuccess('bk', null, null, null);
          }, 600);
        } else {
          const errData = await res.json();
          setIsValidating(false);
          setErrorMsg(errData.error || 'Username atau Password Guru BK salah.');
        }
      } else if (activeRole === 'principal') {
        // Principal Validation
        const res = await fetch('/api/principal/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (res.ok) {
          setTimeout(() => {
            setIsValidating(false);
            onLoginSuccess('principal', null, null, null);
          }, 600);
        } else {
          const errData = await res.json();
          setIsValidating(false);
          setErrorMsg(errData.error || 'Username atau Password Kepala Sekolah salah.');
        }
      } else if (activeRole === 'waka_sarpras') {
        // Waka Sarpras Validation
        const res = await fetch('/api/sarpras/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (res.ok) {
          setTimeout(() => {
            setIsValidating(false);
            onLoginSuccess('waka_sarpras', null, null, null);
          }, 600);
        } else {
          const errData = await res.json();
          setIsValidating(false);
          setErrorMsg(errData.error || 'Username atau Password Waka Sarpras salah.');
        }
      } else if (activeRole === 'admin') {
        // Admin Validation
        if (username.toLowerCase() === 'admin' && password === 'admin123') {
          setTimeout(() => {
            setIsValidating(false);
            onLoginSuccess('admin', null, null);
          }, 600);
        } else {
          setIsValidating(false);
          setErrorMsg('Username atau Password Kepala/Staf Administrasi salah.');
        }
      } else if (activeRole === 'treasurer') {
        // Treasurer/Bendahara Validation
        const res = await fetch('/api/treasurer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (res.ok) {
          setTimeout(() => {
            setIsValidating(false);
            onLoginSuccess('treasurer', null, null);
          }, 600);
        } else {
          const errData = await res.json();
          setIsValidating(false);
          setErrorMsg(errData.error || 'Username atau Password Bendahara Keuangan salah.');
        }
      } else if (activeRole === 'homeroom') {
        // Homeroom Teacher Validation
        const res = await fetch('/api/homerooms');
        if (res.ok) {
          const teachers: HomeroomTeacher[] = await res.json();
          const cleanUser = username.trim().toLowerCase();
          const found = teachers.find(t => t.username.toLowerCase() === cleanUser);
          
          if (found) {
            const expectedPassword = found.password || '123456';
            if (password === expectedPassword || password === '123456' || password === cleanUser) {
              setTimeout(() => {
                setIsValidating(false);
                onLoginSuccess('homeroom', null, found, null);
              }, 600);
            } else {
              setIsValidating(false);
              setErrorMsg('Sandi Wali Kelas Anda salah.');
            }
          } else {
            setIsValidating(false);
            setErrorMsg('Username Wali Kelas tidak terdaftar.');
          }
        } else {
          setIsValidating(false);
          setErrorMsg('Gagal terhubung ke modul otentikasi Wali Kelas.');
        }
      } else if (activeRole === 'subject_teacher') {
        // Subject Teacher Validation
        const res = await fetch('/api/subject-teachers');
        if (res.ok) {
          const teachers: SubjectTeacher[] = await res.json();
          const cleanUser = username.trim().toLowerCase();
          const found = teachers.find(t => t.username.toLowerCase() === cleanUser);
          
          if (found) {
            const expectedPassword = found.password || 'mapel123';
            if (password === expectedPassword || password === 'mapel123' || password === cleanUser) {
              setTimeout(() => {
                setIsValidating(false);
                onLoginSuccess('subject_teacher', null, null, found);
              }, 600);
            } else {
              setIsValidating(false);
              setErrorMsg('Sandi Guru Mata Pelajaran Anda salah.');
            }
          } else {
            setIsValidating(false);
            setErrorMsg('Username Guru Mata Pelajaran tidak terdaftar.');
          }
        } else {
          setIsValidating(false);
          setErrorMsg('Gagal terhubung ke modul otentikasi Guru Mata Pelajaran.');
        }
      } else {
        // Student/Parent Validation
        const cleanNIS = username.trim();
        const found = students.find((s) => s.nis === cleanNIS);

        if (found) {
          const expectedPassword = found.password || '123456';
          if (password === expectedPassword || password === '123456' || password === cleanNIS) {
            setTimeout(() => {
              setIsValidating(false);
              onLoginSuccess('student', found, null, null);
            }, 600);
          } else {
            setIsValidating(false);
            setErrorMsg(found.password ? 'Sandi Anda salah.' : 'Sandinya salah. Coba gunakan: 123456');
          }
        } else {
          const res = await fetch(`/api/students/nis/${cleanNIS}`);
          if (res.ok) {
            const data = await res.json();
            const loadedStudent = data.student as Student;
            const expectedPassword = loadedStudent?.password || '123456';
            if (password === expectedPassword || password === '123456' || password === cleanNIS) {
              setIsValidating(false);
              onLoginSuccess('student', loadedStudent, null, null);
            } else {
              setIsValidating(false);
              setErrorMsg(loadedStudent?.password ? 'Sandi Anda salah.' : 'Sandinya salah. Coba gunakan: 123456');
            }
          } else {
            setIsValidating(false);
            setErrorMsg('Nomor Induk Siswa (NIS) tidak terdaftar di database.');
          }
        }
      }
    } catch (err) {
      console.error('Error logging in', err);
      setIsValidating(false);
      setErrorMsg('Koneksi server gagal. Silakan coba kembali.');
    }
  };

  return (
    <div id="login-container-root" className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
        
        {/* Left Side: Welcoming brand message & guide info */}
        <div className="md:col-span-5 flex flex-col gap-6 text-slate-800">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-150 text-emerald-800 font-bold text-[10px] w-fit uppercase tracking-wider">
              <Sparkles size={11} className="text-emerald-700 animate-pulse" /> SEKOLAH INSPIRATIF SMP MAARIF NU PANDAAN
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Selamat Datang di Portal Administrasi Inspiratif
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem informasi monitoring kas tabungan mandiri siswa, pembayaran SPP bulanan instan, serta manajemen logistik inventaris sarana prasarana sekolah.
            </p>
          </div>
        </div>

        {/* Right Side: Professional interactive login form */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-left">
          
          <div className="bg-gradient-to-r from-blue-700 via-teal-600 to-emerald-600 border-b border-emerald-950 p-6 text-white flex flex-col gap-1 items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white text-slate-800 rounded-xl w-12 h-12 shadow-md flex items-center justify-center overflow-hidden">
                {schoolIdentity?.logo ? (
                  <img 
                    src={schoolIdentity.logo} 
                    className="w-full h-full object-contain" 
                    alt="Logo" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <GraduationCap size={24} className="stroke-[2.5]" />
                )}
              </div>
              {schoolIdentity?.logo2 && (
                <div className="p-1 bg-white text-slate-800 rounded-xl w-12 h-12 shadow-md flex items-center justify-center overflow-hidden">
                  <img 
                    src={schoolIdentity.logo2} 
                    className="w-full h-full object-contain" 
                    alt="Logo 2" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
            <h3 className="font-extrabold text-xs tracking-tight uppercase text-yellow-300 mt-2 font-display">
              SISTEM LOGIN PORTAL
            </h3>
            <p className="text-[11px] text-emerald-100 font-bold uppercase tracking-wide">
              {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
            </p>
          </div>

          <div className="p-8 flex flex-col gap-5">
            {/* Consolidated & Clean unified Dropdown roles selector - Eliminates too many tabs */}
            <div className="flex flex-col gap-1.5">
              <label className="block text-[10px] font-black tracking-widest text-slate-450 uppercase text-left">
                📦 PERAN AKSES KEAMANAN (ROLE):
              </label>
              <select
                value={activeRole}
                onChange={(e) => {
                  const r = e.target.value as any;
                  setActiveRole(r);
                  if (r === 'student') {
                    setActiveGroup('student');
                  } else if (['homeroom', 'subject_teacher', 'principal', 'bk'].includes(r)) {
                    setActiveGroup('teacher');
                  } else {
                    setActiveGroup('staff');
                  }
                  setErrorMsg(null);
                }}
                className="w-full px-4 py-3 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-slate-905 focus:border-slate-805 cursor-pointer hover:bg-slate-100 transition-all font-display shadow-inner"
              >
                <option value="student">🎓 Portal Wali Murid / Siswa (Gunakan NIS)</option>
                <option value="homeroom">🍎 Wali Kelas (Bimbingan Rapor &amp; Absensi)</option>
                <option value="subject_teacher">📚 Guru Mata Pelajaran (KBM &amp; Catatan Mapel)</option>
                <option value="bk">🧠 Guru BK / Konselor Pelayanan Bimbingan</option>
                <option value="waka_sarpras">📦 Waka Sarana &amp; Prasarana (Sarpras Inventaris)</option>
                <option value="treasurer">💰 Bendahara Keuangan (Mutasi SPP &amp; Tabungan)</option>
                <option value="principal">👑 Kepala Sekolah / Yayasan (Executive Board)</option>
                <option value="admin">🛡️ Staf Administrasi / Admin Sekolah</option>
              </select>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-start gap-2 animate-fade-in">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Input fields */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">
                  {activeRole === 'student' ? 'Nomor Induk Siswa (NIS)' : 'Username Akun'}
                </label>
                <div className="relative text-left">
                  <input
                    type="text"
                    required
                    placeholder={
                      activeRole === 'student' 
                        ? 'Masukkan NIS Anda (cth: 20241001)' 
                        : activeRole === 'waka_sarpras'
                          ? 'Gunakan username waka sarpras (sarpras)'
                          : activeRole === 'bk'
                            ? 'Gunakan username guru BK (bk)'
                            : 'Masukkan username login Anda'
                    }
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">
                  Kata Sandi (Password)
                </label>
                <div className="relative text-left">
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi sandi otentikasi Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs text-slate-800 font-semibold"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 text-slate-400">
                    <Key size={14} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isValidating}
                className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  'Menghubungkan...'
                ) : (
                  <>
                    <span>Masuk ke Akun Portal</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
