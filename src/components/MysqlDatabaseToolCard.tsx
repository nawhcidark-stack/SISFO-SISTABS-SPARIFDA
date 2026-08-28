import React, { useState, useEffect } from "react";
import {
  Database,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  UploadCloud,
  FileCode2,
  Copy,
  Check,
  Eye,
  EyeOff,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MysqlConfigState {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  serverTime?: string;
  currentDatabase?: string;
  tables?: string[];
  latencyMs?: number;
  errorCode?: string;
  troubleshootingTip?: string;
}

interface MigrationResult {
  success: boolean;
  totalRecordsMigrated: number;
  tableDetails: {
    tableName: string;
    count: number;
    status: "success" | "error" | "skipped";
    message?: string;
  }[];
  durationMs: number;
  timestamp: string;
  error?: string;
}

interface MysqlDatabaseToolCardProps {
  studentsCount?: number;
  sppBillsCount?: number;
  treasurerCount?: number;
  attendanceCount?: number;
  schedulesCount?: number;
}

export const MysqlDatabaseToolCard: React.FC<MysqlDatabaseToolCardProps> = ({
  studentsCount = 0,
  sppBillsCount = 0,
  treasurerCount = 0,
  attendanceCount = 0,
  schedulesCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<"connect" | "migrate" | "export" | "guide">("connect");
  
  // Connection Form State
  const [config, setConfig] = useState<MysqlConfigState>({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "spp_db",
    ssl: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // SQL Copy State
  const [copiedSql, setCopiedSql] = useState(false);
  const [isDownloadingDump, setIsDownloadingDump] = useState(false);

  // Load existing configuration on mount
  useEffect(() => {
    fetch("/api/admin/mysql/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.host) {
          setConfig((prev) => ({
            ...prev,
            host: data.host || "localhost",
            port: data.port || 3306,
            user: data.user || "root",
            database: data.database || "spp_db",
            ssl: !!data.ssl,
          }));
        }
      })
      .catch(() => {
        // Default fallback
      });
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/mysql/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "Gagal memanggil endpoint pengujian koneksi: " + err.message,
        troubleshootingTip: "Pastikan server aplikasi aktif dan tidak ada firewall jaringan yang memblokir.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/mysql/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert("Gagal menyimpan konfigurasi MySQL.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleMigrateLiveData = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menyinkronkan seluruh data aplikasi ke MySQL sekarang? Tabel yang sudah ada akan diperbarui secara otomatis.")) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch("/api/admin/mysql/migrate-live-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setMigrationResult(data);
    } catch (err: any) {
      setMigrationResult({
        success: false,
        totalRecordsMigrated: 0,
        tableDetails: [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        error: "Gagal melakukan migrasi: " + err.message,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDownloadFullDump = () => {
    setIsDownloadingDump(true);
    window.location.href = "/api/admin/mysql/export-dump-sql";
    setTimeout(() => setIsDownloadingDump(false), 2000);
  };

  const handleCopyPhpMyAdminQuery = async () => {
    try {
      const res = await fetch("/api/admin/mysql/export-dump-sql");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (err) {
      alert("Gagal menyalin query SQL.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      id="mysql-database-migration-card"
      className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col text-slate-800"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-32 -bottom-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shadow-inner">
              <Database size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-lg text-white tracking-tight">
                  Alat Migrasi & Koneksi Database MySQL / phpMyAdmin
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  Hostinger Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Kelola pengujian koneksi, sinkronisasi tabel data secara otomatis, serta ekspor file SQL lengkap untuk diimport ke phpMyAdmin di Hostinger, cPanel, atau VPS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {testResult?.success ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-sm">
                <CheckCircle2 size={14} className="text-emerald-400" />
                MySQL Terhubung ({testResult.latencyMs}ms)
              </span>
            ) : testResult?.success === false ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 border border-rose-400/40 text-rose-300 shadow-sm">
                <AlertCircle size={14} className="text-rose-400" />
                Koneksi Terputus
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                <Activity size={14} className="text-indigo-400" />
                Siap Diuji
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 mt-6 border-b border-slate-800/80 pt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("connect")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "connect"
                ? "bg-slate-800/90 text-white border-indigo-400 shadow"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <Server size={14} />
            1. Uji & Konfigurasi Koneksi
          </button>
          <button
            onClick={() => setActiveTab("migrate")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "migrate"
                ? "bg-slate-800/90 text-white border-emerald-400 shadow"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <UploadCloud size={14} />
            2. Migrasi Data Langsung
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "export"
                ? "bg-slate-800/90 text-white border-cyan-400 shadow"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <Download size={14} />
            3. Ekspor File SQL phpMyAdmin
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "guide"
                ? "bg-slate-800/90 text-white border-amber-400 shadow"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <HelpCircle size={14} />
            4. Panduan Hostinger & Error
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6">
        {/* TAB 1: UJI & KONFIGURASI KONEKSI */}
        {activeTab === "connect" && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                <Server size={15} className="text-indigo-600" />
                Parameter Koneksi Database MySQL (Hostinger / Localhost / VPS)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Host */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">
                    Host Server Database <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="localhost atau IP Hostinger (misal: 103.123...)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400">Gunakan IP server Hostinger atau 'localhost'.</p>
                </div>

                {/* Port */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">
                    Port MySQL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: Number(e.target.value) || 3306 })}
                    placeholder="3306"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400">Port standar MySQL adalah 3306.</p>
                </div>

                {/* Database Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">
                    Nama Database <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => setConfig({ ...config, database: e.target.value })}
                    placeholder="u123456789_spp_db"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400">Sertakan prefix lengkap Hostinger (jika ada).</p>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">
                    Username Database <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.user}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    placeholder="u123456789_spp_user"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400">Username ber-prefix dari menu MySQL Hostinger.</p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">
                    Password Database
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={config.password || ""}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      placeholder="Password MySQL Anda"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Password saat pembuatan user di hPanel.</p>
                </div>

                {/* SSL Toggle & Actions */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={config.ssl}
                      onChange={(e) => setConfig({ ...config, ssl: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">Aktifkan SSL / TLS Connection</span>
                  </label>
                  <p className="text-[10px] text-slate-400">Centang jika server MySQL mewajibkan enkripsi SSL.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isTesting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Activity size={14} />
                    )}
                    {isTesting ? "Sedang Menguji Koneksi..." : "Uji Koneksi Langsung (Test Connection)"}
                  </button>

                  <button
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {saveSuccess ? <Check size={14} className="text-emerald-600" /> : <ShieldCheck size={14} />}
                    {saveSuccess ? "Tersimpan!" : "Simpan Konfigurasi"}
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 italic">
                  *Kredensial disimpan secara aman di backend server.
                </span>
              </div>
            </div>

            {/* Test Result Feedback Box */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded-2xl p-5 border shadow-sm ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-rose-50 border-rose-200 text-rose-950"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {testResult.success ? (
                      <div className="p-2 bg-emerald-500 text-white rounded-xl shadow">
                        <CheckCircle2 size={20} />
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-500 text-white rounded-xl shadow">
                        <AlertCircle size={20} />
                      </div>
                    )}

                    <div className="flex-1">
                      <h4 className="font-extrabold text-sm flex items-center gap-2">
                        {testResult.success ? "Koneksi Berhasil Terhubung!" : "Koneksi Database Gagal"}
                        {testResult.latencyMs && (
                          <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-white/60 border border-slate-300/40">
                            Latency: {testResult.latencyMs} ms
                          </span>
                        )}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed">{testResult.message}</p>

                      {testResult.success && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t border-emerald-200/80 text-xs">
                          <div>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Versi MySQL</span>
                            <span className="font-semibold text-emerald-900">{testResult.serverVersion}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Database Aktif</span>
                            <span className="font-semibold text-emerald-900">{testResult.currentDatabase}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Tabel Ditemukan</span>
                            <span className="font-semibold text-emerald-900">{testResult.tables?.length || 0} Tabel</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Waktu Server</span>
                            <span className="font-semibold text-emerald-900">{testResult.serverTime?.slice(0, 19)}</span>
                          </div>
                        </div>
                      )}

                      {!testResult.success && testResult.troubleshootingTip && (
                        <div className="mt-3 p-3 bg-white/80 border border-rose-200 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-rose-800 flex items-center gap-1.5">
                            <HelpCircle size={14} /> Solusi & Panduan Perbaikan:
                          </span>
                          <p className="text-rose-900 leading-relaxed font-medium">{testResult.troubleshootingTip}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 2: MIGRASI DATA LANGSUNG (ONE-CLICK MIGRATION) */}
        {activeTab === "migrate" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <UploadCloud size={20} className="text-emerald-600" />
                    Sinkronisasi & Migrasi Seluruh Data ke MySQL
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Fitur ini akan secara otomatis membuat struktur 16 tabel di database MySQL Anda (jika belum ada) dan memindahkan seluruh data aktif (Siswa, Tagihan SPP, Kas, Presensi, Jadwal, Penilaian Merdeka, dll) secara aman dan instan (*idempotent with ON DUPLICATE KEY UPDATE*).
                  </p>
                </div>

                <button
                  onClick={handleMigrateLiveData}
                  disabled={isMigrating}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {isMigrating ? <RefreshCw size={16} className="animate-spin" /> : <Layers size={16} />}
                  {isMigrating ? "Sedang Mentransfer Data..." : "Mulai Migrasi ke MySQL Sekarang"}
                </button>
              </div>

              {/* Data Summary Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Siswa & Buku Induk</span>
                  <span className="text-lg font-black text-slate-800">{studentsCount} Record</span>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tagihan SPP</span>
                  <span className="text-lg font-black text-slate-800">{sppBillsCount} Record</span>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Buku Kas Bendahara</span>
                  <span className="text-lg font-black text-slate-800">{treasurerCount} Transaksi</span>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Presensi Siswa</span>
                  <span className="text-lg font-black text-slate-800">{attendanceCount} Log</span>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Jadwal & KBM</span>
                  <span className="text-lg font-black text-slate-800">{schedulesCount} Data</span>
                </div>
              </div>
            </div>

            {/* Migration Result Table Feedback */}
            {migrationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border shadow-sm ${
                  migrationResult.success
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-rose-50 border-rose-200"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {migrationResult.success ? (
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={20} className="text-rose-600" />
                    )}
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {migrationResult.success
                        ? `Migrasi Selesai! Berhasil mentransfer ${migrationResult.totalRecordsMigrated} baris data (${migrationResult.durationMs}ms)`
                        : "Migrasi Gagal Sebagian / Seluruhnya"}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {new Date(migrationResult.timestamp).toLocaleTimeString("id-ID")} WIB
                  </span>
                </div>

                {migrationResult.error && (
                  <p className="text-xs text-rose-700 font-semibold mb-4 bg-white/70 p-3 rounded-xl border border-rose-200">
                    Pesan Kesalahan: {migrationResult.error}
                  </p>
                )}

                {migrationResult.tableDetails && migrationResult.tableDetails.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Nama Tabel MySQL</th>
                          <th className="p-3 text-center">Jumlah Baris</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {migrationResult.tableDetails.map((td, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-indigo-900">`{td.tableName}`</td>
                            <td className="p-3 text-center font-bold text-slate-700">{td.count} baris</td>
                            <td className="p-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check size={12} /> Sukses
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 3: EKSPOR FILE SQL PHPMYADMIN */}
        {activeTab === "export" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Option A: Full SQL Backup with Data */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider mb-2">
                    <FileCode2 size={16} />
                    Rekomendasi Utama
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Ekspor Lengkap (Skema Tabel + Seluruh Data)
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Menghasilkan file <code className="bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded text-[11px] font-mono">.sql</code> yang memuat perintah pembuatan 16 tabel sekaligus seluruh data siswa, tagihan, presensi, jadwal, dan buku kas saat ini. Siap diimport sekali klik di phpMyAdmin.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-indigo-200/60 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleDownloadFullDump}
                    disabled={isDownloadingDump}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    {isDownloadingDump ? "Mengunduh..." : "Unduh File .SQL Lengkap"}
                  </button>

                  <button
                    onClick={handleCopyPhpMyAdminQuery}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {copiedSql ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedSql ? "Query Disalin!" : "Salin Query SQL"}
                  </button>
                </div>
              </div>

              {/* Option B: Schema DDL Only */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-wider mb-2">
                    <Layers size={16} />
                    Struktur Kosong
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Skema Struktur Tabel Saja (`database_schema.sql`)
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Hanya membuat 16 tabel (DDL) dengan tipe data MySQL, Primary Key, Unique Constraints, dan Index yang dioptimalkan, tanpa memasukkan data siswa atau catatan transaksi.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-2.5">
                  <a
                    href="/database_schema.sql"
                    download="database_schema.sql"
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2"
                  >
                    <Download size={14} />
                    Unduh `database_schema.sql`
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Step Guide for phpMyAdmin */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 text-xs">
              <h5 className="font-bold text-slate-200 flex items-center gap-2 mb-3">
                <Terminal size={16} className="text-emerald-400" />
                Cara Mengimport File .SQL ke phpMyAdmin Hostinger:
              </h5>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed font-medium">
                <li>Buka <strong>hPanel Hostinger</strong> &gt; menu <strong>Databases</strong> &gt; klik tombol <strong>Enter phpMyAdmin</strong> pada database Anda.</li>
                <li>Klik nama database Anda di panel navigasi sebelah kiri phpMyAdmin.</li>
                <li>Klik tab menu <strong>Import</strong> di bagian atas.</li>
                <li>Klik tombol <strong>Choose File</strong> (Pilih Berkas) dan pilih file <code className="text-emerald-300">.sql</code> yang Anda unduh di atas.</li>
                <li>Biarkan format tetap <strong>SQL</strong>, lalu gulir ke bawah dan klik tombol <strong>Import</strong> (atau <strong>Go</strong>). Selesai!</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 4: PANDUAN HOSTINGER & ERROR TROUBLESHOOTING */}
        {activeTab === "guide" && (
          <div className="space-y-5 text-xs text-slate-700">
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5">
              <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-amber-600" />
                Mengapa Koneksi dari Server Deploy ke Hostinger Sering Gagal?
              </h4>
              <p className="text-amber-900 leading-relaxed">
                Secara default, Hostinger mengaktifkan firewall ketat yang memblokir semua koneksi port 3306 dari luar server (*Remote Database*). Jika aplikasi Anda di-deploy di Cloud Run, Vercel, Railway, atau VPS lain, koneksi akan ditolak (*ECONNREFUSED / ETIMEDOUT*) kecuali IP diizinkan di menu <strong>Remote MySQL</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Aktifkan Remote MySQL di Hostinger:
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed">
                  <li>Buka <strong>hPanel Hostinger</strong> &gt; cari menu <strong>Remote MySQL</strong>.</li>
                  <li>Di kolom <strong>IP (IPv4 atau IPv6)</strong>, masukkan karakter <code className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded font-mono font-bold">%</code> (tanda persen berarti mengizinkan akses dari sembarang IP).</li>
                  <li>Pilih nama database Anda pada dropdown.</li>
                  <li>Klik tombol <strong>Create</strong>.</li>
                </ol>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Prefix Nama Database &amp; User:
                </h5>
                <p className="text-slate-600 leading-relaxed">
                  Di Hostinger, semua database dan user memiliki prefix ID hosting (contoh: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">u123456789_</code>).
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Pastikan Anda memasukkan nama lengkap seperti <strong className="text-indigo-700">u123456789_spp_db</strong>, bukan hanya <em>spp_db</em>.
                </p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <h5 className="font-bold text-indigo-950">Ingin Menggunakan Database Lokal / XAMPP?</h5>
                <p className="text-indigo-800 text-[11px] mt-0.5">
                  Cukup masukkan Host: <code className="font-mono font-bold">localhost</code> atau <code className="font-mono font-bold">127.0.0.1</code>, Port: <code className="font-mono font-bold">3306</code>, User: <code className="font-mono font-bold">root</code>, dan Password kosong.
                </p>
              </div>
              <button
                onClick={() => {
                  setConfig({
                    host: "localhost",
                    port: 3306,
                    user: "root",
                    password: "",
                    database: "spp_db",
                    ssl: false,
                  });
                  setActiveTab("connect");
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer shadow"
              >
                Terapkan Default XAMPP
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
