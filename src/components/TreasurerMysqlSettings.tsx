import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Database,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Copy,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Save,
  Play,
  Check,
  Globe,
  Info,
  Shield,
  Layers,
  FileCode2,
  HelpCircle,
  FolderSync,
  FileSpreadsheet,
  ArrowDownToLine,
  CheckCircle
} from 'lucide-react';
import { MysqlDatabaseConfig, MysqlTestResult, MysqlSyncResult, SchoolIdentity } from '../types';

interface TreasurerMysqlSettingsProps {
  schoolIdentity: SchoolIdentity;
}

export default function TreasurerMysqlSettings({ schoolIdentity }: TreasurerMysqlSettingsProps) {
  // Config state
  const [config, setConfig] = useState<MysqlDatabaseConfig>({
    host: 'srv1393.hstgr.io',
    port: 3306,
    database: 'u604170242_spp_db',
    user: 'u604170242_spp_user',
    password: '',
    hasPassword: false,
    ssl: false,
    phpmyadminUrl: 'https://portal.smpmaarifpdn.sch.id:8443',
    charset: 'utf8mb4',
    connectionLimit: 10,
    connectTimeout: 10000,
    autoSyncEnabled: false,
    status: 'disconnected'
  });

  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [testResult, setTestResult] = useState<MysqlTestResult | null>(null);
  const [syncResult, setSyncResult] = useState<MysqlSyncResult | null>(null);
  const [pullResult, setPullResult] = useState<{
    success: boolean;
    message: string;
    counts?: Record<string, number>;
  } | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [countsData, setCountsData] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'export' | 'sync' | 'schema' | 'guide'>('config');

  // Fetch initial config
  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/treasurer/mysql-config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Gagal memuat konfigurasi MySQL:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch stats of all collections
  const fetchCounts = async () => {
    setIsLoadingCounts(true);
    try {
      const res = await fetch('/api/treasurer/mysql-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.counts) {
          setCountsData(data.counts);
        }
      }
    } catch (err) {
      console.error('Gagal memuat data hitungan tabel:', err);
    } finally {
      setIsLoadingCounts(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchCounts();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotification(null);

    try {
      const payload: Partial<MysqlDatabaseConfig> = {
        host: config.host.trim(),
        port: Number(config.port) || 3306,
        database: config.database.trim(),
        user: config.user.trim(),
        ssl: Boolean(config.ssl),
        phpmyadminUrl: config.phpmyadminUrl?.trim(),
        charset: config.charset || 'utf8mb4',
        connectionLimit: Number(config.connectionLimit) || 10,
        connectTimeout: Number(config.connectTimeout) || 8000
      };

      if (inputPassword) {
        payload.password = inputPassword;
      }

      const res = await fetch('/api/treasurer/mysql-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setInputPassword('');
        setNotification({
          type: 'success',
          message: 'Konfigurasi database MySQL & phpMyAdmin berhasil disimpan.'
        });
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Gagal menyimpan konfigurasi.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Koneksi jaringan terputus saat menyimpan konfigurasi.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setNotification(null);

    try {
      const payload: Partial<MysqlDatabaseConfig> = {
        host: config.host.trim(),
        port: Number(config.port) || 3306,
        database: config.database.trim(),
        user: config.user.trim(),
        ssl: Boolean(config.ssl),
        charset: config.charset || 'utf8mb4'
      };

      if (inputPassword) {
        payload.password = inputPassword;
      }

      const res = await fetch('/api/treasurer/mysql-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data: MysqlTestResult = await res.json();
      setTestResult(data);

      if (data.success) {
        setConfig(prev => ({ ...prev, status: 'connected', lastConnectedAt: new Date().toISOString() }));
      } else {
        setConfig(prev => ({ ...prev, status: 'error' }));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Gagal menghubungi server untuk pengujian koneksi.',
        error: err.message || 'Network error',
        hint: 'Pastikan dev server atau backend aktif dan dapat menerima request.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncData = async () => {
    if (!window.confirm('Mulai sinkronisasi data seluruh sistem (Siswa, Kas BKU, SPP, Gaji, Tabungan) ke database MySQL?')) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);
    setNotification(null);

    try {
      const res = await fetch('/api/treasurer/mysql-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data: MysqlSyncResult = await res.json();
      setSyncResult(data);

      if (data.success) {
        setConfig(prev => ({
          ...prev,
          status: 'connected',
          lastSyncAt: data.syncedAt
        }));
        setNotification({
          type: 'success',
          message: data.message
        });
        fetchCounts();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Gagal sinkronisasi data ke MySQL.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Gagal menghubungi server saat sinkronisasi.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullData = async () => {
    if (!window.confirm('Muat dan tampilkan seluruh data dari database MySQL / phpMyAdmin ke dalam aplikasi?')) {
      return;
    }

    setIsPulling(true);
    setPullResult(null);
    setNotification(null);

    try {
      const res = await fetch('/api/treasurer/mysql-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      setPullResult(data);

      if (data.success) {
        setConfig(prev => ({
          ...prev,
          status: 'connected',
          lastSyncAt: new Date().toISOString()
        }));
        setNotification({
          type: 'success',
          message: data.message || 'Seluruh data berhasil ditarik dari database MySQL dan langsung ditampilkan di aplikasi!'
        });
        fetchCounts();
      } else {
        setNotification({
          type: 'error',
          message: data.message || data.error || 'Gagal memuat data dari database MySQL.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Gagal menghubungi server saat memuat data MySQL.'
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleDownloadFullSql = () => {
    window.location.href = '/api/treasurer/mysql-export-full-sql';
  };

  const handleDownloadSchemaSql = () => {
    window.location.href = '/api/treasurer/mysql-export-sql';
  };

  const sampleSqlSchema = `-- SKRIP DATABASE MYSQL / PHPMYADMIN (SMP MAARIF NU PANDAAN)
CREATE TABLE IF NOT EXISTS \`students\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`nis\` VARCHAR(32) NOT NULL UNIQUE,
  \`name\` VARCHAR(150) NOT NULL,
  \`class\` VARCHAR(32) NOT NULL,
  \`savings_balance\` DECIMAL(15,2) DEFAULT 0.00,
  \`status\` VARCHAR(32) DEFAULT 'Aktif'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`treasurer_transactions\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`type\` ENUM('incoming', 'outgoing') NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`payment_method\` ENUM('kas', 'bank') DEFAULT 'kas'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`spp_bills\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`year\` INT NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending', 'waived') DEFAULT 'unpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`teacher_salaries\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`teacher_id\` VARCHAR(64) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`total_amount\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('unpaid', 'paid') DEFAULT 'unpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sampleSqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const totalRecords = Object.values(countsData).reduce<number>((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shrink-0">
              <Database size={28} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/80">
                  Migrasi &amp; Database MySQL
                </span>
                {config.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-700/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Terhubung
                  </span>
                ) : config.status === 'error' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-900/40 px-2 py-0.5 rounded-full border border-rose-700/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Error Koneksi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    Belum Dites
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white mt-1">Ekspor &amp; Sinkronisasi Database MySQL / phpMyAdmin</h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
                Pindahkan seluruh data sistem (Siswa, Kas BKU, SPP, Mutasi Tabungan, SPMB, Gaji, dll.) langsung ke database MySQL phpMyAdmin Anda tanpa ketergantungan MongoDB.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {config.phpmyadminUrl && (
              <a
                href={config.phpmyadminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Globe size={13} className="text-sky-400" />
                <span>Buka phpMyAdmin</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
            )}
            <button
              type="button"
              onClick={handleDownloadFullSql}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
              title="Unduh file SQL lengkap berisi seluruh data dan skema untuk langsung diimpor ke phpMyAdmin"
            >
              <ArrowDownToLine size={15} />
              <span>Ekspor Full SQL (Data Lengkap)</span>
            </button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Host &amp; Port</span>
            <span className="font-mono text-slate-200 font-bold">{config.host}:{config.port}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Nama Database</span>
            <span className="font-mono text-emerald-400 font-bold">{config.database}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">User MySQL</span>
            <span className="font-mono text-slate-200 font-bold">{config.user}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Record Siap Migrasi</span>
            <span className="font-mono text-amber-300 font-bold">{totalRecords} baris data</span>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            ) : (
              <Info size={16} className="text-sky-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            Tutup
          </button>
        </motion.div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('config')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'config'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Server size={14} />
          <span>Pengaturan Koneksi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('export')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'export'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Download size={14} />
          <span>Ekspor Data Lengkap (phpMyAdmin)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sync')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'sync'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <FolderSync size={14} />
          <span>Sinkronisasi Langsung ke MySQL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('schema')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'schema'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <FileCode2 size={14} />
          <span>Struktur Skema SQL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('guide')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'guide'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <HelpCircle size={14} />
          <span>Panduan Import phpMyAdmin</span>
        </button>
      </div>

      {/* TAB 1: FORM KONFIGURASI KONEKSI */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Parameter Koneksi MySQL Database</h3>
                <p className="text-xs text-slate-500 mt-0.5">Konfigurasikan detail akses server database MySQL / MariaDB Anda.</p>
              </div>
              <span className="p-1 px-2 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded-lg border border-slate-200">
                Port Standar: 3306
              </span>
            </div>

            <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Host */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Server size={13} className="text-indigo-600" />
                    <span>Host / Server MySQL</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="localhost atau 127.0.0.1 atau IP Server VPS"
                    className="p-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400">Gunakan <code>localhost</code> jika berjalan bersama XAMPP/Laragon, atau IP/domain host database.</span>
                </div>

                {/* Port */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    <span>Port</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 3306 })}
                    placeholder="3306"
                    className="p-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Database Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Database size={13} className="text-emerald-600" />
                    <span>Nama Database</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.database}
                    onChange={(e) => setConfig({ ...config, database: e.target.value })}
                    placeholder="smp_maarif_keuangan"
                    className="p-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400">Database yang sudah dibuat di phpMyAdmin / cPanel.</span>
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Key size={13} className="text-amber-600" />
                    <span>Username MySQL</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.user}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    placeholder="root atau user_db"
                    className="p-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400">User dengan hak akses ALL PRIVILEGES pada database.</span>
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">
                    <span>Password Database</span>
                  </label>
                  {config.hasPassword && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ Password tersimpan aman
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder={config.hasPassword ? '•••••••• (Biarkan kosong jika tidak diubah)' : 'Masukkan password MySQL (kosongkan jika default XAMPP tanpa sandi)'}
                    className="p-3 pr-10 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">Untuk XAMPP default, password biasanya kosong. Untuk cPanel/hosting gunakan password database yang dibuat.</span>
              </div>

              {/* phpMyAdmin Web URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Globe size={13} className="text-sky-600" />
                  <span>URL Web phpMyAdmin</span>
                </label>
                <input
                  type="url"
                  value={config.phpmyadminUrl || ''}
                  onChange={(e) => setConfig({ ...config, phpmyadminUrl: e.target.value })}
                  placeholder="http://localhost/phpmyadmin atau https://cpanel.domain.sch.id:2083/cpsess.../3rdparty/phpMyAdmin"
                  className="p-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-sans text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <span className="text-[10px] text-slate-400">Tautan pintasan cepat untuk membuka antarmuka GUI phpMyAdmin di browser.</span>
              </div>

              {/* Advanced Options Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.ssl)}
                    onChange={(e) => setConfig({ ...config, ssl: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-700 block">Enkripsi SSL / TLS</span>
                    <span className="text-[9px] text-slate-400">Gunakan untuk Cloud SQL / Aiven</span>
                  </div>
                </label>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Karakter Set</span>
                  <span className="font-mono text-xs font-bold text-slate-700">utf8mb4 (Unicode)</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Pool Connection</span>
                  <span className="font-mono text-xs font-bold text-slate-700">{config.connectionLimit || 10} Connections</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Play size={13} className={isTesting ? 'animate-spin' : ''} />
                  <span>{isTesting ? 'Sedang Menguji Koneksi...' : '🔌 Uji Koneksi Database'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
                >
                  <Save size={14} className={isSaving ? 'animate-spin' : ''} />
                  <span>{isSaving ? 'Menyimpan...' : '💾 Simpan Konfigurasi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar Test Result & Health Status */}
          <div className="flex flex-col gap-4">
            {/* Live Connection Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Hasil Uji Koneksi</h4>

              {isTesting ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <RefreshCw size={28} className="text-indigo-600 animate-spin" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Menghubungi MySQL Host...</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Memverifikasi handshake socket &amp; kredensial.</p>
                  </div>
                </div>
              ) : testResult ? (
                <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  testResult.success ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h5 className={`text-xs font-black ${testResult.success ? 'text-emerald-950' : 'text-rose-950'}`}>
                        {testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                      </h5>
                      <p className={`text-[11px] mt-0.5 leading-normal ${testResult.success ? 'text-emerald-850 font-medium' : 'text-rose-850'}`}>
                        {testResult.message}
                      </p>
                    </div>
                  </div>

                  {testResult.success && (
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-150 flex flex-col gap-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Latency / Ping:</span>
                        <span className="font-mono font-bold text-emerald-700">{testResult.pingMs} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Versi Server:</span>
                        <span className="font-mono font-bold text-slate-800">{testResult.serverVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Database Aktif:</span>
                        <span className="font-mono font-bold text-indigo-700">{testResult.databaseName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Tabel Terdeteksi:</span>
                        <span className="font-mono font-bold text-slate-800">{testResult.tablesCount} tabel</span>
                      </div>
                    </div>
                  )}

                  {testResult.error && (
                    <div className="p-2.5 bg-white/90 border border-rose-200 rounded-xl text-[10px] font-mono text-rose-800 break-words">
                      <strong>Detail Error:</strong> {testResult.error}
                    </div>
                  )}

                  {testResult.hint && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-900 leading-normal">
                      <strong>💡 Solusi / Petunjuk:</strong> {testResult.hint}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <Database size={24} className="text-slate-300" />
                  <span>Klik tombol <strong>"🔌 Uji Koneksi Database"</strong> untuk memeriksa apakah MySQL &amp; phpMyAdmin Anda dapat diakses.</span>
                </div>
              )}
            </div>

            {/* Quick Helper Card */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-xs flex flex-col gap-3">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shield size={12} className="text-emerald-600" /> Keamanan &amp; Perlindungan Data
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Kredensial disimpan aman. Ekspor file <code>.sql</code> berisi seluruh baris data siswa, kas, SPP, tabungan, SPMB, dan modul sekolah untuk dipindahkan ke MySQL phpMyAdmin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EKSPOR DATA LENGKAP KE PHPMYADMIN (FULL DUMP) */}
      {activeSubTab === 'export' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-lg mb-1.5">
                <FileSpreadsheet size={12} /> Ekspor Lengkap (Data + Skema Tabel)
              </div>
              <h3 className="text-base font-black text-slate-900">Download File SQL Lengkap untuk phpMyAdmin</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                File SQL ini berisi perintah <code>CREATE TABLE</code> untuk seluruh 22+ tabel serta seluruh perintah <code>INSERT INTO</code> data aktual yang ada di sistem (Siswa, Kas, SPP, Tabungan, Gaji, SPMB, dll.) tanpa ada data yang tertinggal.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadFullSql}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-700/20 shrink-0"
            >
              <ArrowDownToLine size={16} />
              <span>Download SQL Dump Full Data (.sql)</span>
            </button>
          </div>

          {/* Table Counts Overview */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-600" /> Ringkasan Data Yang Akan Diekspor ({totalRecords} Total Baris)
              </span>
              <button
                type="button"
                onClick={fetchCounts}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={isLoadingCounts ? 'animate-spin' : ''} /> Segarkan Hitungan
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { key: 'students', label: 'Data Siswa', color: 'text-slate-900', bg: 'bg-slate-50' },
                { key: 'treasurerTransactions', label: 'Buku Kas (BKU)', color: 'text-emerald-700', bg: 'bg-emerald-50/50' },
                { key: 'sppBills', label: 'Tagihan SPP', color: 'text-blue-700', bg: 'bg-blue-50/50' },
                { key: 'savingsTransactions', label: 'Tabungan Siswa', color: 'text-amber-700', bg: 'bg-amber-50/50' },
                { key: 'teacherSalaries', label: 'Gaji Guru', color: 'text-purple-700', bg: 'bg-purple-50/50' },
                { key: 'spmbCandidates', label: 'Pendaftar SPMB', color: 'text-teal-700', bg: 'bg-teal-50/50' },
                { key: 'miscBills', label: 'Tagihan Lain', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'teachingJournals', label: 'Jurnal Mengajar', color: 'text-indigo-700', bg: 'bg-indigo-50/50' },
                { key: 'attendanceLogs', label: 'Presensi Siswa', color: 'text-sky-700', bg: 'bg-sky-50/50' },
                { key: 'merdekaAssessments', label: 'Penilaian Rapor', color: 'text-rose-700', bg: 'bg-rose-50/50' },
                { key: 'homeroomTeachers', label: 'Wali Kelas', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'subjectTeachers', label: 'Guru Mapel', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'sarprasItems', label: 'Inventaris Sarpras', color: 'text-amber-800', bg: 'bg-amber-50/30' },
                { key: 'sarprasProposals', label: 'Proposal Sarpras', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'sarprasLoans', label: 'Peminjaman Sarpras', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'studentDevelopmentLogs', label: 'Catatan Siswa', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'studentInfractionLogs', label: 'Pelanggaran Siswa', color: 'text-rose-800', bg: 'bg-rose-50/30' },
                { key: 'studentCounselingLogs', label: 'Bimbingan Konseling', color: 'text-teal-800', bg: 'bg-teal-50/30' },
                { key: 'classAnnouncements', label: 'Pengumuman Kelas', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'classMeetingLogs', label: 'Notulen Rapat', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'principalWorkPrograms', label: 'Program Kepsek', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'teacherEvaluations', label: 'Evaluasi Guru', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'classSchedules', label: 'Jadwal Pelajaran', color: 'text-slate-700', bg: 'bg-slate-50' },
                { key: 'infractionRules', label: 'Aturan Poin', color: 'text-slate-700', bg: 'bg-slate-50' }
              ].map((item) => (
                <div key={item.key} className={`p-3 rounded-2xl border border-slate-200 ${item.bg} flex flex-col justify-between`}>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block truncate">{item.label}</span>
                  <span className={`text-base font-black font-mono mt-1 ${item.color}`}>
                    {countsData[item.key] !== undefined ? `${countsData[item.key]} data` : '0 data'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Migration Steps Instruction */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle size={15} /> 3 Langkah Mudah Memindahkan Data ke phpMyAdmin
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-200">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1.5">
                <span className="font-extrabold text-emerald-300">1. Unduh File SQL</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Klik tombol <strong>"Download SQL Dump Full Data"</strong> di atas untuk menyimpan file berkas <code>smp_maarif_full_database_dump.sql</code>.
                </p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1.5">
                <span className="font-extrabold text-emerald-300">2. Buka phpMyAdmin</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Buka phpMyAdmin di XAMPP / cPanel sekolah Anda. Buat database baru (misal: <code>smp_maarif_keuangan</code>) lalu pilih database tersebut.
                </p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1.5">
                <span className="font-extrabold text-emerald-300">3. Impor File SQL</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Buka menu <strong>"Import / Impor"</strong> pada menu atas phpMyAdmin, pilih file yang sudah diunduh, lalu klik <strong>"Kirim / Import"</strong>. Selesai!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SINKRONISASI DATA */}
      {activeSubTab === 'sync' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-6">
          {/* Bi-directional Sync Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Pull from MySQL */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-sky-50/50 rounded-2xl border border-indigo-150 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-600 text-white rounded-xl">
                    <ArrowDownToLine size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Tarik / Muat Data Dari MySQL</h3>
                    <span className="text-[10px] text-indigo-700 font-bold">MySQL &rarr; Aplikasi SMP Ma'arif</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  Mengambil seluruh data terbaru yang tersimpan di database MySQL / phpMyAdmin (560 siswa, 6.687 SPP, 788 transaksi kas, dll.) dan memuatnya langsung ke aplikasi.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePullData}
                disabled={isPulling}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isPulling ? 'animate-spin' : ''} />
                <span>{isPulling ? 'Sedang Menarik Data...' : '📥 Muat Seluruh Data Dari MySQL'}</span>
              </button>
            </div>

            {/* Box 2: Push to MySQL */}
            <div className="p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-2xl border border-emerald-150 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-600 text-white rounded-xl">
                    <FolderSync size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Kirim / Simpan ke MySQL</h3>
                    <span className="text-[10px] text-emerald-700 font-bold">Aplikasi &rarr; MySQL Database</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  Mengirimkan seluruh perubahan data lokal ke database MySQL phpMyAdmin dengan skema <code>ON DUPLICATE KEY UPDATE</code> tanpa risiko duplikasi.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncData}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Sedang Menyimpan ke MySQL...' : '⚡ Kirim Data ke MySQL'}</span>
              </button>
            </div>
          </div>

          {/* Pull Result Box */}
          {pullResult && (
            <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
              pullResult.success ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {pullResult.success ? (
                  <CheckCircle2 size={20} className="text-indigo-600 shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className={`text-xs font-black ${pullResult.success ? 'text-indigo-950' : 'text-rose-950'}`}>
                    {pullResult.success ? 'Data Berhasil Ditarik Dari Database MySQL!' : 'Gagal Memuat Data Dari MySQL'}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {pullResult.message}
                  </p>
                </div>
              </div>

              {pullResult.success && pullResult.counts && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-indigo-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Data Siswa</span>
                    <span className="text-base font-black font-mono text-slate-800">{pullResult.counts.students || 0} siswa</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Buku Kas (BKU)</span>
                    <span className="text-base font-black font-mono text-emerald-700">{pullResult.counts.treasurerTransactions || 0} mutasi</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Tagihan SPP</span>
                    <span className="text-base font-black font-mono text-blue-700">{pullResult.counts.sppBills || 0} tagihan</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Gaji Guru</span>
                    <span className="text-base font-black font-mono text-purple-700">{pullResult.counts.teacherSalaries || 0} berkas</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Tabungan Siswa</span>
                    <span className="text-base font-black font-mono text-amber-700">{pullResult.counts.savingsTransactions || 0} transaksi</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Tagihan Lain</span>
                    <span className="text-base font-black font-mono text-slate-700">{pullResult.counts.miscBills || 0} item</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Result Box */}
          {syncResult && (
            <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
              syncResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {syncResult.success ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className={`text-xs font-black ${syncResult.success ? 'text-emerald-950' : 'text-rose-950'}`}>
                    {syncResult.success ? 'Sinkronisasi Berhasil Selesai!' : 'Sinkronisasi Gagal'}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {syncResult.message} &bull; Waktu: {new Date(syncResult.syncedAt).toLocaleString('id-ID')} ({syncResult.durationMs}ms)
                  </p>
                </div>
              </div>

              {syncResult.success && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-emerald-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Data Siswa</span>
                    <span className="text-base font-black font-mono text-slate-800">{syncResult.stats.students} baris</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Buku Kas (BKU)</span>
                    <span className="text-base font-black font-mono text-emerald-700">{syncResult.stats.transactions} mutasi</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Tagihan SPP</span>
                    <span className="text-base font-black font-mono text-blue-700">{syncResult.stats.sppBills} tagihan</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Gaji Guru</span>
                    <span className="text-base font-black font-mono text-purple-700">{syncResult.stats.salaries} berkas</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Tabungan Siswa</span>
                    <span className="text-base font-black font-mono text-amber-700">{syncResult.stats.savings} transaksi</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-150 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">Tagihan Lain</span>
                    <span className="text-base font-black font-mono text-slate-700">{syncResult.stats.miscBills} item</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                <span>Tabel Yang Dikelola di MySQL</span>
              </span>
              <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside">
                <li><code>students</code> &mdash; Master data siswa, NIS, kelas, saldo tabungan</li>
                <li><code>treasurer_transactions</code> &mdash; Mutasi Buku Kas Umum, debit &amp; kredit</li>
                <li><code>spp_bills</code> &mdash; Pembayaran SPP siswa dan status lunas</li>
                <li><code>teacher_salaries</code> &mdash; Rekap gaji bulanan guru dan insentif</li>
                <li><code>savings_transactions</code> &mdash; Riwayat setoran dan penarikan tabungan</li>
                <li><code>misc_bills</code> &mdash; Tagihan atribut, seragam, dan kegiatan</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Mekanisme ON DUPLICATE KEY UPDATE</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sinkronisasi aman dijalankan berulang kali tanpa risiko data ganda (duplikat). Data yang sudah ada di database MySQL akan diperbarui (update) sesuai status mutasi terbaru di sistem bendahara.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SKEMA SQL */}
      {activeSubTab === 'schema' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Skrip Skema Tabel SQL untuk phpMyAdmin</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Salin skrip SQL di bawah ini atau unduh file <code>.sql</code> untuk dieksekusi langsung di menu "SQL" pada phpMyAdmin.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedSql ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSchemaSql}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Download size={13} />
                <span>Unduh Skema .sql</span>
              </button>
            </div>
          </div>

          {/* SQL Code Box */}
          <div className="relative bg-slate-950 text-slate-200 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] overflow-x-auto max-h-[380px] overflow-y-auto leading-relaxed select-all">
            <pre>{sampleSqlSchema}</pre>
          </div>
        </div>
      )}

      {/* TAB 5: PANDUAN PHPMYADMIN */}
      {activeSubTab === 'guide' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: XAMPP Localhost */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 w-fit rounded-xl border border-amber-200">
              <Server size={18} />
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase">1. Penggunaan di XAMPP / Laragon (Localhost)</h4>
            <ol className="text-[11px] text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Buka XAMPP Control Panel dan aktifkan modul <strong>Apache</strong> dan <strong>MySQL</strong>.</li>
              <li>Buka browser dan buka alamat <code>http://localhost/phpmyadmin</code>.</li>
              <li>Klik menu <strong>"New / Baru"</strong> di bilah kiri dan buat database bernama <code>smp_maarif_keuangan</code>.</li>
              <li>Di panel bendahara ini, buka tab <strong>"Ekspor Data Lengkap"</strong> dan klik <strong>"Download SQL Dump Full Data"</strong>.</li>
              <li>Buka menu <strong>"Import"</strong> di phpMyAdmin dan pilih file <code>.sql</code> tersebut.</li>
            </ol>
          </div>

          {/* Card 2: cPanel Hosting */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 w-fit rounded-xl border border-blue-200">
              <Globe size={18} />
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase">2. Penggunaan di Hosting cPanel</h4>
            <ol className="text-[11px] text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Login ke cPanel web sekolah, masuk ke menu <strong>"MySQL® Databases"</strong>.</li>
              <li>Buat database baru (misal: <code>username_keuangan</code>) dan buat MySQL User beserta password.</li>
              <li>Tambahkan User ke Database dan berikan <strong>"ALL PRIVILEGES"</strong>.</li>
              <li>Buka menu <strong>"phpMyAdmin"</strong> di cPanel, pilih database yang baru dibuat.</li>
              <li>Klik tab <strong>"Import"</strong> dan masukkan file full dump <code>.sql</code>.</li>
            </ol>
          </div>

          {/* Card 3: Impor Manual via phpMyAdmin */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 w-fit rounded-xl border border-emerald-200">
              <FileCode2 size={18} />
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase">3. Pemeliharaan &amp; Backup Rutin</h4>
            <ol className="text-[11px] text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Setiap kali Anda ingin melakukan sinkronisasi atau cadangan, cukup unduh file SQL dump baru.</li>
              <li>Semua query menggunakan sintaks <code>ON DUPLICATE KEY UPDATE</code> sehingga aman diimpor ulang tanpa merusak data lama.</li>
              <li>Database MySQL phpMyAdmin kini siap menjadi pusat data mandiri sekolah Anda.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
