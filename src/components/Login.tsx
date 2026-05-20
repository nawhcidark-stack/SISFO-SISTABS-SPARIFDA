import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Student, SchoolIdentity, HomeroomTeacher } from '../types';
import { ShieldCheck, User, Key, GraduationCap, ArrowRight, AlertCircle, Sparkles, ClipboardCheck } from 'lucide-react';

interface LoginProps {
  students: Student[];
  onLoginSuccess: (role: 'student' | 'admin' | 'homeroom', student: Student | null, homeroom: HomeroomTeacher | null) => void;
  schoolIdentity?: SchoolIdentity;
}

export default function Login({ students, onLoginSuccess, schoolIdentity }: LoginProps) {
  const [activeRole, setActiveRole] = useState<'student' | 'admin' | 'homeroom'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleQuickFill = (role: 'student' | 'admin' | 'homeroom', userVal: string, passVal: string) => {
    setActiveRole(role);
    setUsername(userVal);
    setPassword(passVal);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Harap isi username / NIS dan kata sandi.');
      return;
    }

    setIsValidating(true);

    try {
      if (activeRole === 'admin') {
        // Admin Validation
        if (username.toLowerCase() === 'admin' && password === 'admin123') {
          // Success
          setTimeout(() => {
            setIsValidating(false);
            onLoginSuccess('admin', null, null);
          }, 600);
        } else {
          setIsValidating(false);
          setErrorMsg('Username atau Password Kepala/Staf Administrasi salah.');
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
                onLoginSuccess('homeroom', null, found);
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
      } else {
        // Student/Parent Validation
        const cleanNIS = username.trim();
        const found = students.find((s) => s.nis === cleanNIS);

        if (found) {
          const expectedPassword = found.password || '123456';
          // Standard security checking: Allow their customized password, or '123456' or cleanNIS
          if (password === expectedPassword || password === '123456' || password === cleanNIS) {
            setTimeout(() => {
              setIsValidating(false);
              onLoginSuccess('student', found, null);
            }, 600);
          } else {
            setIsValidating(false);
            setErrorMsg(found.password ? 'Sandi Anda salah.' : 'Sandinya salah. Coba gunakan: 123456');
          }
        } else {
          // Hit the active NIS API just in case there's a fresh server-side entry
          const res = await fetch(`/api/students/nis/${cleanNIS}`);
          if (res.ok) {
            const data = await res.json();
            const loadedStudent = data.student as Student;
            const expectedPassword = loadedStudent?.password || '123456';
            if (password === expectedPassword || password === '123456' || password === cleanNIS) {
              setIsValidating(false);
              onLoginSuccess('student', loadedStudent, null);
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
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Welcoming brand message & guide info */}
        <div className="md:col-span-5 flex flex-col gap-6 text-slate-800">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-150 text-emerald-800 font-bold text-[10px] w-fit uppercase tracking-wider">
              <Sparkles size={11} className="text-emerald-700 animate-pulse" /> LP MA'ARIF NU PANDAAN
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Selamat Datang di Portal Kas & SPP Terpadu
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem informasi monitoring kas tabungan mandiri siswa dan pembayaran SPP bulanan instan dengan integrasi Payment Gateway Midtrans Sandbox.
            </p>
          </div>

          <div className="border border-slate-200 bg-white/70 backdrop-blur-sm rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
              Kredensial Demo Cepat (Klik untuk masuk)
            </h4>

            {/* Student Account chips */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400">Portal Wali Murid & Siswa (NIS + Sandi):</span>
              <div className="flex flex-wrap gap-1.5">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleQuickFill('student', s.nis, '123456')}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 rounded-lg text-left text-[10px] text-slate-700 transition-all font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <User size={10} className="text-emerald-600" />
                    <span>{s.name.split(' ')[0]} ({s.nis})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Admin and Homeroom account chips */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">Staf Administrasi / Teller:</span>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', 'admin', 'admin123')}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-55 rounded-lg text-left text-[10px] text-slate-700 transition-all font-bold flex items-center gap-1.5 shadow-sm cursor-pointer w-fit"
                >
                  <ShieldCheck size={11} className="text-indigo-600" />
                  <span>Admin Sekolah (admin / admin123)</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">Wali Kelas (Bimbingan Absensi):</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('homeroom', 'wali7a', 'wali123')}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 rounded-lg text-left text-[10px] whitespace-nowrap text-slate-700 transition-all font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <ClipboardCheck size={11} className="text-amber-500" />
                    <span>Wali 7-A (wali7a / wali123)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('homeroom', 'wali7b', 'wali123')}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 rounded-lg text-left text-[10px] whitespace-nowrap text-slate-700 transition-all font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <ClipboardCheck size={11} className="text-amber-500" />
                    <span>Wali 7-B (wali7b / wali123)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Professional interactive login form */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          
          <div className="bg-emerald-900 border-b border-emerald-950 p-6 text-white text-center flex flex-col gap-1 items-center justify-center">
            <div className="p-1 bg-white text-emerald-950 rounded-xl w-12 h-12 shadow-md flex items-center justify-center overflow-hidden">
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
            <h3 className="font-extrabold text-xs tracking-tight uppercase text-yellow-400 mt-2">
              SISTEM LOGIN PORTAL
            </h3>
            <p className="text-[11px] text-emerald-100 font-bold uppercase tracking-wide">
              {schoolIdentity?.name || "SMP MAARIF NU PANDAAN"}
            </p>
          </div>

          <div className="p-8">
            {/* Tab switchers */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveRole('student');
                  setErrorMsg(null);
                }}
                className={`py-2 text-[10px] md:text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeRole === 'student'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Wali Murid / Siswa
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRole('admin');
                  setErrorMsg(null);
                }}
                className={`py-2 text-[10px] md:text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeRole === 'admin'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Staf Administrasi
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRole('homeroom');
                  setErrorMsg(null);
                }}
                className={`py-2 text-[10px] md:text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeRole === 'homeroom'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Wali Kelas
              </button>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 align-left text-left">
                  {activeRole === 'student' ? 'Nomor Induk Siswa (NIS)' : activeRole === 'admin' ? 'Username Staf' : 'Username Wali Kelas'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={
                      activeRole === 'student' 
                        ? 'Masukkan NIS Anda (cth: 20241001)' 
                        : activeRole === 'admin' 
                          ? 'Masukkan username staf' 
                          : 'Masukkan username bimbingan kelas Anda'
                    }
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-semibold text-slate-800"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 text-slate-400">
                    <User size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi (default: 123456 atau admin123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs text-slate-800 font-semibold"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 text-slate-400">
                    <Key size={14} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isValidating}
                className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-indigo-100 cursor-pointer flex items-center justify-center gap-2"
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
