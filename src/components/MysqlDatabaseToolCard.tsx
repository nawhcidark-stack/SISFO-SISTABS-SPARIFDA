import React, { useState, useEffect } from "react";
import {
  Database,
  CheckCircle,
  Download,
  FileCode2,
  Copy,
  Check,
  Eye,
  EyeOff,
  DollarSign,
  ShieldCheck,
  Play,
  FileText,
  AlertCircle,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MysqlConfigState {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
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
  // Connection Form State matching the screenshot
  const [config, setConfig] = useState<MysqlConfigState>({
    host: "localhost",
    port: 3306,
    user: "u604170242_root",
    password: "",
    database: "u604170242_perpus_maarif",
    ssl: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [isExportingLive, setIsExportingLive] = useState(false);
  const [isDownloadingSchema, setIsDownloadingSchema] = useState(false);

  // Fetch initial config if available from server
  useEffect(() => {
    fetch("/api/admin/mysql/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.host) {
          setConfig((prev) => ({
            ...prev,
            host: data.host || "localhost",
            port: data.port || 3306,
            user: data.user || "u604170242_root",
            database: data.database || "u604170242_perpus_maarif",
          }));
        }
      })
      .catch(() => {});
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
        message: "Gagal memanggil endpoint pengujian: " + err.message,
        troubleshootingTip: "Pastikan server aktif dan IP/Host database mengizinkan koneksi remote.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadSchemaSql = () => {
    setIsDownloadingSchema(true);
    const link = document.createElement("a");
    link.href = "/database_schema.sql";
    link.download = "perpus_maarif.sql";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloadingSchema(false), 2000);
  };

  const handleExportLiveData = () => {
    setIsExportingLive(true);
    window.location.href = "/api/admin/mysql/export-dump-sql";
    setTimeout(() => setIsExportingLive(false), 2000);
  };

  const handleCopyEnvFormat = async () => {
    const envString = `# Konfigurasi Database MySQL Mandiri (Hosting / Localhost)
DB_HOST=${config.host || "localhost"}
DB_PORT=${config.port || 3306}
DB_NAME=${config.database || "u604170242_perpus_maarif"}
DB_USER=${config.user || "u604170242_root"}
DB_PASSWORD=${config.password || ""}
`;
    try {
      await navigator.clipboard.writeText(envString);
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 3000);
    } catch (err) {
      alert("Gagal menyalin format .env ke clipboard.");
    }
  };

  return (
    <div
      id="mysql-database-mandiri-card"
      className="bg-white rounded-2xl border border-emerald-100 shadow-lg p-6 md:p-8 flex flex-col gap-6 text-slate-800"
    >
      {/* 1. Header Section with Title, Badge, Description & Top-Right Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#064e3b] text-amber-400 flex items-center justify-center shadow-md shrink-0">
            <Database size={24} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                Database MySQL Mandiri (Hosting &amp; Localhost)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 border border-amber-300 text-amber-900 shadow-xs">
                HEMAT BIAYA / 100% GRATIS
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Gunakan MySQL lokal atau hosting cPanel/phpMyAdmin milik sekolah tanpa ketergantungan biaya cloud bulanan.
            </p>
          </div>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadSchemaSql}
            disabled={isDownloadingSchema}
            className="px-4 py-2.5 bg-[#065f46] hover:bg-[#044e39] text-white font-bold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download size={16} />
            {isDownloadingSchema ? "Mengunduh..." : "Unduh File .SQL Siap Import"}
          </button>

          <button
            onClick={handleExportLiveData}
            disabled={isExportingLive}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#065f46] border border-[#065f46] font-bold text-xs md:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText size={16} />
            {isExportingLive ? "Mengekspor..." : "Ekspor Data Live ke .SQL"}
          </button>
        </div>
      </div>

      {/* 2. Three Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Kompatibilitas Standar */}
        <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/20 p-4 flex flex-col justify-start">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs md:text-sm mb-1.5">
            <CheckCircle size={17} className="text-emerald-600 shrink-0" />
            <span>Kompatibilitas Standar</span>
          </div>
          <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
            Cocok untuk phpMyAdmin di cPanel hosting (Niagahoster, Hostinger, DomaiNesia, IDCloudHost) dan localhost (XAMPP/Laragon).
          </p>
        </div>

        {/* Card 2: Bebas Biaya Tambahan */}
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/20 p-4 flex flex-col justify-start">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs md:text-sm mb-1.5">
            <DollarSign size={17} className="text-amber-600 shrink-0" />
            <span>Bebas Biaya Tambahan</span>
          </div>
          <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
            Database berjalan di server web hosting sekolah yang sudah ada, tanpa perlu kartu kredit atau kuota bayar per transaksi cloud.
          </p>
        </div>

        {/* Card 3: Kepemilikan Data Penuh */}
        <div className="rounded-xl border border-teal-300/80 bg-teal-50/20 p-4 flex flex-col justify-start">
          <div className="flex items-center gap-2 text-teal-900 font-bold text-xs md:text-sm mb-1.5">
            <ShieldCheck size={17} className="text-teal-600 shrink-0" />
            <span>Kepemilikan Data Penuh</span>
          </div>
          <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
            Seluruh katalog buku, data siswa/guru, dan riwayat presensi tersimpan aman di server sekolah dan bisa di-backup kapan saja.
          </p>
        </div>
      </div>

      {/* 3. Section: UJI KONEKTIVITAS MYSQL DATABASE */}
      <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs md:text-sm font-extrabold text-slate-800 tracking-wider font-mono">
            <span className="text-[#065f46] font-black">&gt;_</span> UJI KONEKTIVITAS MYSQL DATABASE
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Port default: 3306</span>
        </div>

        {/* Input Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Host / Server */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Host / Server</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="localhost"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all shadow-xs"
            />
          </div>

          {/* Port */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Port</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: Number(e.target.value) || 3306 })}
              placeholder="3306"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all shadow-xs"
            />
          </div>

          {/* Nama Database */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Nama Database</label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => setConfig({ ...config, database: e.target.value })}
              placeholder="u604170242_perpus_maarif"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all shadow-xs"
            />
          </div>

          {/* Username Database */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Username Database</label>
            <input
              type="text"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              placeholder="u604170242_root"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all shadow-xs"
            />
          </div>

          {/* Password Database */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Password Database</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.password || ""}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder="Kosongkan jika di XAMPP lokal default"
                className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Buttons & Cloud Disclaimer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#033b2c] disabled:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={13} className="fill-current" />}
              {isTesting ? "Sedang Menguji..." : "Uji Koneksi Sekarang"}
            </button>

            <button
              onClick={handleCopyEnvFormat}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copiedEnv ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedEnv ? "Tersalin!" : "Salin Format .env"}
            </button>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            *Saat dijalankan di AI Studio Cloud, pengujian akan menggunakan koneksi server internal.
          </span>
        </div>

        {/* Test Result Feedback Box */}
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-xl p-4 border text-xs ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-rose-50 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-extrabold block">
                    {testResult.success
                      ? `Koneksi Berhasil (${testResult.latencyMs} ms) - Versi: ${testResult.serverVersion || "MySQL"}`
                      : "Koneksi Database Gagal"}
                  </span>
                  <p className="mt-0.5 text-slate-600">{testResult.message}</p>
                  {testResult.troubleshootingTip && (
                    <p className="mt-1 text-slate-700 font-medium bg-white/60 p-2 rounded-lg border border-slate-200">
                      💡 <strong>Solusi:</strong> {testResult.troubleshootingTip}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Section: PANDUAN PRAKTIS IMPORT DATABASE KE HOSTING / PHPMYADMIN */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-xs md:text-sm font-extrabold text-[#065f46] tracking-wider uppercase">
          <FileCode2 size={16} />
          <span>PANDUAN PRAKTIS IMPORT DATABASE KE HOSTING / PHPMYADMIN</span>
        </div>

        {/* 4 Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Step 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-start shadow-xs">
            <div className="w-6 h-6 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-black mb-3">
              1
            </div>
            <h5 className="font-extrabold text-xs text-slate-900 mb-1">Unduh File SQL</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Klik tombol &quot;Unduh File .SQL Siap Import&quot; di atas untuk mendapatkan berkas{" "}
              <code className="bg-slate-100 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold text-[10px]">
                perpus_maarif.sql
              </code>
              .
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-start shadow-xs">
            <div className="w-6 h-6 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-black mb-3">
              2
            </div>
            <h5 className="font-extrabold text-xs text-slate-900 mb-1">Buka phpMyAdmin Hostinger</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Di Hostinger hPanel, klik tombol &quot;Buka phpMyAdmin&quot; pada database{" "}
              <code className="bg-slate-100 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold text-[10px]">
                u604170242_perpus_maarif
              </code>
              .
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-start shadow-xs">
            <div className="w-6 h-6 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-black mb-3">
              3
            </div>
            <h5 className="font-extrabold text-xs text-slate-900 mb-1">Eksekusi Import</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Klik tab &quot;Import&quot; di phpMyAdmin, pilih file yang sudah diunduh tadi, lalu klik tombol &quot;Kirim / Go&quot; di bagian bawah.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-start shadow-xs">
            <div className="w-6 h-6 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-black mb-3">
              4
            </div>
            <h5 className="font-extrabold text-xs text-slate-900 mb-1">Atur File .env</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Masukkan kredensial{" "}
              <code className="bg-slate-100 text-teal-800 px-1 py-0.5 rounded font-mono font-bold text-[10px]">
                DB_USER
              </code>{" "}
              dan{" "}
              <code className="bg-slate-100 text-teal-800 px-1 py-0.5 rounded font-mono font-bold text-[10px]">
                DB_PASSWORD
              </code>{" "}
              hosting pada file .env aplikasi Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
