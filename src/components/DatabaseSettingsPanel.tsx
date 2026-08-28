import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Server,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  Check,
  HardDrive,
  FileCode,
  Table,
  Layers,
  Terminal,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  Activity,
  ArrowDownToLine,
  Zap,
} from 'lucide-react';
import { MySQLConfig, MySQLTestResult, MySQLSyncResult, MySQLQueryResult } from '../types';

interface DatabaseSettingsPanelProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const DatabaseSettingsPanel: React.FC<DatabaseSettingsPanelProps> = ({ onClose, isModal = false }) => {
  // Config state
  const [config, setConfig] = useState<MySQLConfig>({
    host: 'localhost',
    port: 3306,
    database: 'db_smp_maarif',
    user: 'root',
    password: '',
    tablePrefix: '',
    charset: 'utf8mb4',
    sslMode: 'none',
    socketPath: '',
    enabled: false,
    autoSync: false,
    status: 'disconnected',
  });

  const [snippets, setSnippets] = useState<{
    phpPdo?: string;
    phpMysqli?: string;
    envConfig?: string;
    cpanelConfig?: string;
  }>({});

  // UI state
  const [activeTab, setActiveTab] = useState<'koneksi' | 'skema' | 'sinkronisasi' | 'konsol' | 'panduan'>('koneksi');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Test & Diagnostic Result
  const [testResult, setTestResult] = useState<MySQLTestResult | null>(null);
  const [syncResult, setSyncResult] = useState<MySQLSyncResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MySQLSyncResult | null>(null);

  // SQL Console state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM students LIMIT 10;');
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [queryResult, setQueryResult] = useState<MySQLQueryResult | null>(null);

  // Notification / Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('info', 'Berhasil disalin ke papan klip!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/mysql/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        if (data.snippets) setSnippets(data.snippets);
      }
    } catch (err: any) {
      console.warn('Gagal memuat konfigurasi MySQL:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/mysql/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        if (data.snippets) setSnippets(data.snippets);
        showToast('success', 'Pengaturan koneksi database MySQL & phpMyAdmin berhasil disimpan!');
      } else {
        showToast('error', data.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err: any) {
      showToast('error', `Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mysql/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: MySQLTestResult = await res.json();
      setTestResult(data);
      if (data.success) {
        setConfig((prev) => ({ ...prev, status: 'connected', lastConnectedAt: new Date().toISOString() }));
        showToast('success', data.message || 'Koneksi ke MySQL / phpMyAdmin berhasil!');
      } else {
        setConfig((prev) => ({ ...prev, status: 'error' }));
        showToast('error', data.message || 'Gagal terhubung ke MySQL');
      }
    } catch (err: any) {
      const errRes: MySQLTestResult = {
        success: false,
        message: `Terjadi kendala jaringan/server: ${err.message}`,
      };
      setTestResult(errRes);
      showToast('error', errRes.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunMigration = async () => {
    if (!window.confirm('Jalankan migrasi skema tabel SQL sekarang? Ini akan membuat struktur tabel di database phpMyAdmin Anda.')) {
      return;
    }
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/mysql/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: MySQLSyncResult = await res.json();
      setMigrationResult(data);
      if (data.success) {
        showToast('success', data.message);
        handleTestConnection(); // refresh table counts
      } else {
        showToast('error', data.message || 'Gagal migrasi skema SQL');
      }
    } catch (err: any) {
      showToast('error', `Gagal eksekusi migrasi: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/mysql/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: MySQLSyncResult = await res.json();
      setSyncResult(data);
      if (data.success) {
        showToast('success', data.message);
        handleTestConnection(); // refresh rows count
      } else {
        showToast('error', data.message || 'Gagal sinkronisasi data');
      }
    } catch (err: any) {
      showToast('error', `Gagal sinkronisasi: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecutingSql(true);
    setQueryResult(null);
    try {
      const res = await fetch('/api/mysql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const data: MySQLQueryResult = await res.json();
      setQueryResult(data);
      if (data.success) {
        showToast('success', data.message);
      } else {
        showToast('error', data.message || 'Query gagal dieksekusi');
      }
    } catch (err: any) {
      showToast('error', `Gagal menjalankan query: ${err.message}`);
    } finally {
      setIsExecutingSql(false);
    }
  };

  return (
    <div id="mysql_database_settings_panel" className="flex flex-col w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden text-slate-800">
      {/* Top Banner / Header */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
            <Database className="w-6 h-6 stroke-[2.2px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Koneksi Database phpMyAdmin & MySQL</h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-full">
                Relasional SQL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Integrasikan sistem akademik SMP Ma'arif NU Pandaan dengan hosting cPanel, phpMyAdmin, dan server database MySQL.
            </p>
          </div>
        </div>

        {/* Quick Connection Badge */}
        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                config.status === 'connected' ? 'bg-emerald-400 shadow-emerald-500/50 shadow-md' : config.status === 'error' ? 'bg-rose-500' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium text-slate-200">
              {config.status === 'connected'
                ? 'Terhubung ke MySQL'
                : config.status === 'error'
                ? 'Koneksi Terputus / Error'
                : 'Belum Teruji'}
            </span>
          </div>

          {onClose && (
            <button
              id="btn_close_mysql_panel"
              type="button"
              onClick={onClose}
              className="ml-3 text-slate-400 hover:text-white transition-colors text-sm px-2 py-0.5 rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast Alert */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mx-5 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="opacity-70 hover:opacity-100 text-xs px-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Sub-Tabs */}
      <div className="px-5 pt-4 border-b border-slate-200 bg-slate-50/70 flex gap-2 overflow-x-auto scrollbar-none text-xs font-semibold">
        <button
          id="tab_mysql_koneksi"
          type="button"
          onClick={() => setActiveTab('koneksi')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'koneksi'
              ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Pengaturan Server & Parameter</span>
        </button>

        <button
          id="tab_mysql_skema"
          type="button"
          onClick={() => setActiveTab('skema')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'skema'
              ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Struktur Tabel & Skema SQL</span>
        </button>

        <button
          id="tab_mysql_sinkronisasi"
          type="button"
          onClick={() => setActiveTab('sinkronisasi')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'sinkronisasi'
              ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sinkronisasi Data Realtime</span>
        </button>

        <button
          id="tab_mysql_konsol"
          type="button"
          onClick={() => setActiveTab('konsol')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'konsol'
              ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Konsol Kueri SQL</span>
        </button>

        <button
          id="tab_mysql_panduan"
          type="button"
          onClick={() => setActiveTab('panduan')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === 'panduan'
              ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Cuplikan Kode & phpMyAdmin</span>
        </button>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="p-5 md:p-6 flex flex-col gap-6">
        {/* ========================================================
            TAB 1: PENGATURAN KONEKSI & PARAMETER
        ======================================================== */}
        {activeTab === 'koneksi' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Host & Port */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Host / Server MySQL</span>
                  <span className="text-[11px] font-normal text-slate-400">Contoh: localhost / IP cPanel</span>
                </label>
                <div className="relative">
                  <input
                    id="input_mysql_host"
                    type="text"
                    required
                    placeholder="localhost atau 103.xxx.xxx.xxx"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Port Database</span>
                  <span className="text-[11px] font-normal text-slate-400">Default MySQL: 3306</span>
                </label>
                <input
                  id="input_mysql_port"
                  type="number"
                  required
                  placeholder="3306"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 3306 })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Database Name & Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Nama Database (Database Name)</span>
                  <span className="text-[11px] font-normal text-slate-400">Di phpMyAdmin</span>
                </label>
                <input
                  id="input_mysql_database"
                  type="text"
                  required
                  placeholder="db_smp_maarif"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Pengguna Database (User)</span>
                  <span className="text-[11px] font-normal text-slate-400">Username phpMyAdmin/cPanel</span>
                </label>
                <input
                  id="input_mysql_user"
                  type="text"
                  required
                  placeholder="root atau user_db"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Password & Charset */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Kata Sandi (Password)</span>
                  <span className="text-[11px] font-normal text-slate-400">Kosongkan jika di localhost</span>
                </label>
                <div className="relative">
                  <input
                    id="input_mysql_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan sandi database MySQL"
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Karakter Enkoding (Charset)</span>
                  <span className="text-[11px] font-normal text-slate-400">Standar Unicode</span>
                </label>
                <select
                  id="select_mysql_charset"
                  value={config.charset || 'utf8mb4'}
                  onChange={(e) => setConfig({ ...config, charset: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="utf8mb4">utf8mb4 (Rekomendasi - Dukung Emoji & Unicode Lengkap)</option>
                  <option value="utf8">utf8 (Standar UTF-8)</option>
                  <option value="latin1">latin1 (ISO-8859-1)</option>
                </select>
              </div>

              {/* Extra Toggles */}
              <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-3">
                  <input
                    id="checkbox_mysql_autosync"
                    type="checkbox"
                    checked={config.autoSync || false}
                    onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="checkbox_mysql_autosync" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Sinkronisasi Otomatis Setiap Ada Perubahan
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Menyimpan langsung data siswa, transaksi tabungan, pembayaran SPP, dan SPMB ke MySQL secara berkala.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn_test_mysql_conn"
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestConnection}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Activity className={`w-4 h-4 text-emerald-600 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi'}</span>
                  </button>

                  <button
                    id="btn_save_mysql_config"
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[2.5px]" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Live Test Diagnostic Output Card */}
            {testResult && (
              <div
                id="mysql_test_diagnostic_card"
                className={`p-4 rounded-xl border text-xs flex flex-col gap-3 ${
                  testResult.success
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Koneksi Berhasil! Database Terhubung Sempurna</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <span>Gagal Menghubungi Database MySQL</span>
                      </>
                    )}
                  </div>
                  {testResult.latencyMs !== undefined && (
                    <span className="px-2 py-0.5 bg-white/70 rounded-full font-mono text-[11px] border border-slate-200 text-slate-700">
                      Latency: {testResult.latencyMs} ms
                    </span>
                  )}
                </div>

                <p className="leading-relaxed font-medium">{testResult.message}</p>

                {testResult.success && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                    <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">Server Version</span>
                      <span className="font-bold text-slate-800">{testResult.serverVersion || '-'}</span>
                    </div>
                    <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">Database Aktif</span>
                      <span className="font-bold text-slate-800">{testResult.databaseName || '-'}</span>
                    </div>
                    <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">Jumlah Tabel</span>
                      <span className="font-bold text-emerald-700">{testResult.tablesCount || 0} Tabel</span>
                    </div>
                    <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">Status Operasi</span>
                      <span className="font-bold text-emerald-600">Siap Digunakan</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================
            TAB 2: STRUKTUR TABEL & MIGRASI SKEMA SQL
        ======================================================== */}
        {activeTab === 'skema' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Skema Database SMP Ma'arif NU (database_schema.sql)</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Termasuk tabel identitas sekolah, data siswa buku induk, tagihan SPP, tabungan, jadwal, jurnal guru, dan SPMB.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn_run_mysql_migration"
                  type="button"
                  disabled={isMigrating}
                  onClick={handleRunMigration}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>{isMigrating ? 'Mengeksekusi Skema...' : 'Jalankan Migrasi Skema Sekarang'}</span>
                </button>
              </div>
            </div>

            {/* Migration Result Banner */}
            {migrationResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  migrationResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}
              >
                {migrationResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{migrationResult.message}</span>
              </div>
            )}

            {/* Table Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: 'school_identity', desc: 'Identitas lembaga, NPSN, akreditasi, & kepsek', icon: Server },
                { name: 'students', desc: 'Buku induk siswa, NIS, NISN, NIK, orang tua, & saldo', icon: Table },
                { name: 'spp_bills', desc: 'Tagihan SPP bulanan, status lunas, order ID Midtrans', icon: Table },
                { name: 'savings_transactions', desc: 'Transaksi setoran & penarikan tabungan siswa', icon: Table },
                { name: 'homeroom_teachers', desc: 'Akun wali kelas, pembagian kelas, & SK penugasan', icon: Table },
                { name: 'subject_teachers', desc: 'Akun guru mapel, NIP, & kelas yang diampu', icon: Table },
                { name: 'class_schedules', desc: 'Jadwal pelajaran mingguan kelas 7, 8, 9', icon: Table },
                { name: 'teaching_journals', desc: 'Jurnal mengajar guru, materi TP, & absensi', icon: Table },
                { name: 'misc_bills', desc: 'Tagihan non-SPP (Ujian, Seragam, Kegiatan)', icon: Table },
                { name: 'spmb_registrations', desc: 'Pendaftaran PPDB siswa baru online & daftar ulang', icon: Table },
                { name: 'attendance_logs', desc: 'Presensi harian siswa (Hadir, Sakit, Izin, Alpha)', icon: Table },
                { name: 'student_infractions', desc: 'Poin kedisiplinan & catatan pelanggaran BK', icon: Table },
              ].map((tbl, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                      <tbl.icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800">{tbl.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">{tbl.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ========================================================
            TAB 3: SINKRONISASI DATA REALTIME
        ======================================================== */}
        {activeTab === 'sinkronisasi' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-emerald-950 text-sm">Sinkronisasi Penuh ke Database MySQL & phpMyAdmin</h3>
                <p className="text-emerald-800 text-xs mt-1 max-w-xl">
                  Tekan tombol di bawah untuk menyalin seluruh data siswa aktif, riwayat tabungan, pembayaran SPP, akun guru, dan pendaftaran SPMB langsung ke tabel MySQL Anda.
                </p>
              </div>

              <button
                id="btn_sync_data_to_mysql"
                type="button"
                disabled={isSyncing}
                onClick={handleSyncData}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan Data...' : 'Sinkronkan Seluruh Data Sekarang'}</span>
              </button>
            </div>

            {/* Sync Result Output */}
            {syncResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex flex-col gap-3 ${
                  syncResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {syncResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                  <span>{syncResult.message}</span>
                </div>

                {syncResult.recordsSynced && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                    {Object.entries(syncResult.recordsSynced).map(([key, val]) => (
                      <div key={key} className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex justify-between items-center">
                        <span className="text-slate-600 capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-bold text-emerald-700">{val} baris</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================
            TAB 4: KONSOL KUERI SQL
        ======================================================== */}
        {activeTab === 'konsol' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>Kueri SQL Interaktif (MySQL Console)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSqlQuery('SELECT * FROM students LIMIT 10;')}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono"
                  >
                    10 Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlQuery('SELECT * FROM spp_bills ORDER BY created_at DESC LIMIT 10;')}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono"
                  >
                    Tagihan SPP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlQuery('SHOW TABLES;')}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono"
                  >
                    Daftar Tabel
                  </button>
                </div>
              </div>

              <textarea
                id="textarea_sql_query"
                rows={4}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Tuliskan query SQL, contoh: SELECT * FROM students WHERE class = '7-A';"
                className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
              />

              <div className="flex justify-end">
                <button
                  id="btn_execute_sql"
                  type="button"
                  disabled={isExecutingSql || !sqlQuery.trim()}
                  onClick={handleExecuteSql}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecutingSql ? 'Menjalankan Query...' : 'Eksekusi Query SQL'}</span>
                </button>
              </div>
            </div>

            {/* Query Results Table */}
            {queryResult && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={queryResult.success ? 'text-emerald-700' : 'text-rose-700'}>
                    {queryResult.message}
                  </span>
                  {queryResult.executionTimeMs !== undefined && (
                    <span className="text-[11px] text-slate-400 font-mono">{queryResult.executionTimeMs} ms</span>
                  )}
                </div>

                {queryResult.rows && queryResult.rows.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          {queryResult.fields?.map((field, idx) => (
                            <th key={idx} className="px-3 py-2 border-r border-slate-200">
                              {field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono">
                        {queryResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-emerald-50/50">
                            {queryResult.fields?.map((field, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 border-r border-slate-100 text-slate-800 truncate max-w-xs">
                                {typeof row[field] === 'object' ? JSON.stringify(row[field]) : String(row[field] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================
            TAB 5: CUPLIKAN KODE & PANDUAN PHPMYADMIN
        ======================================================== */}
        {activeTab === 'panduan' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-xs">
            {/* Step-by-step cPanel / phpMyAdmin guide */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                <span>Panduan Menghubungkan ke phpMyAdmin / cPanel Hosting</span>
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed font-medium">
                <li>
                  <strong className="text-slate-900">Buat Database & Pengguna di cPanel:</strong> Buka cPanel &gt;
                  MySQL Database Wizard. Buat database (contoh: <code className="bg-slate-200 px-1 rounded font-mono">{config.database}</code>) dan pengguna baru, lalu beri hak akses <em>ALL PRIVILEGES</em>.
                </li>
                <li>
                  <strong className="text-slate-900">Izinkan Remote MySQL (Jika Server Berbeda):</strong> Buka cPanel &gt;
                  Remote MySQL &gt; Tambahkan IP server ini atau <code className="bg-slate-200 px-1 rounded font-mono">%</code> (Wildcard untuk pengujian).
                </li>
                <li>
                  <strong className="text-slate-900">Impor database_schema.sql di phpMyAdmin:</strong> Buka phpMyAdmin &gt; Pilih Database &gt; Tab <em>Import</em> &gt; Pilih file <code className="bg-slate-200 px-1 rounded font-mono">database_schema.sql</code> atau gunakan tombol <em>"Jalankan Migrasi Skema"</em> di tab Skema.
                </li>
              </ol>
            </div>

            {/* Code Snippets Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PHP PDO Snippet */}
              <div className="flex flex-col gap-2 bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-[11px] shadow-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-emerald-400">Koneksi PHP (PDO Standard)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(snippets.phpPdo || '', 'pdo')}
                    className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-white/10"
                  >
                    {copiedKey === 'pdo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'pdo' ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto p-2 bg-black/40 rounded-lg text-emerald-300">
                  {snippets.phpPdo || '// Memuat cuplikan kode...'}
                </pre>
              </div>

              {/* .env Environment Snippet */}
              <div className="flex flex-col gap-2 bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-[11px] shadow-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-emerald-400">Variabel Lingkungan (.env)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(snippets.envConfig || '', 'env')}
                    className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-white/10"
                  >
                    {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'env' ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto p-2 bg-black/40 rounded-lg text-emerald-300">
                  {snippets.envConfig || '// Memuat cuplikan .env...'}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSettingsPanel;
