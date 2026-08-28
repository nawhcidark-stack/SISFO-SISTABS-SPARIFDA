import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { MysqlDatabaseConfig, MysqlTestResult, MysqlSyncResult } from '../types';

const CONFIG_FILE = path.join(process.cwd(), 'mysql_config.json');

// Default initial configuration
let currentConfig: MysqlDatabaseConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  database: process.env.MYSQL_DATABASE || 'smp_maarif_keuangan',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  hasPassword: Boolean(process.env.MYSQL_PASSWORD),
  ssl: false,
  phpmyadminUrl: process.env.MYSQL_PHPMYADMIN_URL || 'http://localhost/phpmyadmin',
  charset: 'utf8mb4',
  connectionLimit: 10,
  connectTimeout: 8000,
  autoSyncEnabled: false,
  status: 'unconfigured'
};

// Load saved configuration on startup
export function loadMysqlConfig(): MysqlDatabaseConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      currentConfig = {
        ...currentConfig,
        ...parsed,
        hasPassword: Boolean(parsed.password && parsed.password.length > 0)
      };
    }
  } catch (err) {
    console.error('Gagal membaca file konfigurasi MySQL:', err);
  }
  return currentConfig;
}

export function saveMysqlConfig(newConfig: Partial<MysqlDatabaseConfig>): MysqlDatabaseConfig {
  const password = (newConfig.password !== undefined && newConfig.password !== '') 
    ? newConfig.password 
    : currentConfig.password;

  currentConfig = {
    ...currentConfig,
    ...newConfig,
    port: Number(newConfig.port) || 3306,
    password,
    hasPassword: Boolean(password && password.length > 0)
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menulis file konfigurasi MySQL:', err);
  }

  return getSanitizedConfig();
}

export function getSanitizedConfig(): MysqlDatabaseConfig {
  return {
    host: currentConfig.host,
    port: currentConfig.port,
    database: currentConfig.database,
    user: currentConfig.user,
    hasPassword: Boolean(currentConfig.password && currentConfig.password.length > 0),
    ssl: currentConfig.ssl,
    phpmyadminUrl: currentConfig.phpmyadminUrl,
    charset: currentConfig.charset || 'utf8mb4',
    connectionLimit: currentConfig.connectionLimit || 10,
    connectTimeout: currentConfig.connectTimeout || 8000,
    autoSyncEnabled: currentConfig.autoSyncEnabled || false,
    lastConnectedAt: currentConfig.lastConnectedAt,
    lastSyncAt: currentConfig.lastSyncAt,
    status: currentConfig.status || 'unconfigured'
  };
}

// Create MySQL connection pool
function createPool(overrideConfig?: Partial<MysqlDatabaseConfig>) {
  const cfg = {
    ...currentConfig,
    ...overrideConfig
  };

  return mysql.createPool({
    host: cfg.host,
    port: Number(cfg.port) || 3306,
    user: cfg.user,
    password: cfg.password || '',
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: cfg.connectionLimit || 5,
    connectTimeout: cfg.connectTimeout || 8000,
    charset: cfg.charset || 'utf8mb4',
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined
  });
}

// Test MySQL & phpMyAdmin database connection
export async function testMysqlConnection(customConfig?: Partial<MysqlDatabaseConfig>): Promise<MysqlTestResult> {
  const startTime = Date.now();
  const cfgToUse: MysqlDatabaseConfig = {
    ...currentConfig,
    ...(customConfig || {}),
    password: (customConfig?.password !== undefined && customConfig.password !== '') 
      ? customConfig.password 
      : currentConfig.password
  };

  if (!cfgToUse.host || !cfgToUse.database || !cfgToUse.user) {
    return {
      success: false,
      message: 'Parameter konfigurasi belum lengkap. Mohon isi Host, Nama Database, dan User.',
      hint: 'Periksa kembali isian Host (misal localhost atau nama IP server), Nama Database, dan User MySQL Anda.'
    };
  }

  let connection: mysql.PoolConnection | null = null;
  const pool = createPool(cfgToUse);

  try {
    connection = await pool.getConnection();
    const pingMs = Date.now() - startTime;

    // Query version, current database, server time
    const [verRows]: any = await connection.query('SELECT VERSION() as version, DATABASE() as current_db, NOW() as server_time');
    const serverVersion = verRows?.[0]?.version || 'MySQL / MariaDB';
    const databaseName = verRows?.[0]?.current_db || cfgToUse.database;
    const serverTime = verRows?.[0]?.server_time ? new Date(verRows[0].server_time).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');

    // Query existing tables
    const [tableRows]: any = await connection.query('SHOW TABLES');
    const tables: string[] = tableRows.map((r: any) => Object.values(r)[0] as string);

    // Update status
    currentConfig.status = 'connected';
    currentConfig.lastConnectedAt = new Date().toISOString();
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch {}

    return {
      success: true,
      message: `Koneksi ke MySQL database "${databaseName}" via phpMyAdmin/Server berhasil terhubung!`,
      pingMs,
      serverVersion,
      databaseName,
      serverTime,
      tablesCount: tables.length,
      tables
    };
  } catch (err: any) {
    const pingMs = Date.now() - startTime;
    currentConfig.status = 'error';
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch {}

    let hint = 'Pastikan server database MySQL aktif dan dapat diakses dari host ini.';
    const code = err.code || '';
    const errMessage = err.message || 'Gagal tersambung ke database.';

    if (code === 'ECONNREFUSED') {
      hint = `Tidak dapat terhubung ke ${cfgToUse.host}:${cfgToUse.port}. Pastikan service MySQL/MariaDB aktif di XAMPP/cPanel/VPS dan port 3306 terbuka.`;
    } else if (code === 'ER_ACCESS_DENIED_ERROR') {
      hint = `Akses ditolak untuk user "${cfgToUse.user}". Pastikan kata sandi (password) dan hak akses (Privileges) user di phpMyAdmin sudah benar.`;
    } else if (code === 'ER_BAD_DB_ERROR') {
      hint = `Database "${cfgToUse.database}" tidak ditemukan di server MySQL. Silakan buat database terlebih dahulu di menu phpMyAdmin / cPanel MySQL Databases.`;
    } else if (code === 'ETIMEDOUT' || code === 'EHOSTUNREACH') {
      hint = `Koneksi timeout. Jika menggunakan hosting remote (cPanel/Hostinger/VPS), pastikan menu "Remote MySQL" di cPanel sudah menambahkan wildcard '%' atau IP server ini.`;
    }

    return {
      success: false,
      message: `Gagal terhubung ke MySQL (${code || 'ERROR'})`,
      error: errMessage,
      pingMs,
      hint
    };
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end().catch(() => {});
  }
}

// SQL Table Schemas covering all 26+ collections and application data
export const COMPLETE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS \`students\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`nis\` VARCHAR(32) NOT NULL,
  \`nisn\` VARCHAR(32) DEFAULT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`class\` VARCHAR(32) NOT NULL,
  \`gender\` VARCHAR(20) DEFAULT 'Laki-laki',
  \`email\` VARCHAR(120) DEFAULT NULL,
  \`phone\` VARCHAR(32) DEFAULT NULL,
  \`savings_balance\` DECIMAL(15,2) DEFAULT 0.00,
  \`status\` VARCHAR(32) DEFAULT 'Aktif',
  \`password\` VARCHAR(128) DEFAULT NULL,
  \`nickname\` VARCHAR(64) DEFAULT NULL,
  \`nik\` VARCHAR(32) DEFAULT NULL,
  \`birth_place\` VARCHAR(100) DEFAULT NULL,
  \`birth_date\` VARCHAR(32) DEFAULT NULL,
  \`kk_number\` VARCHAR(32) DEFAULT NULL,
  \`birth_cert_number\` VARCHAR(64) DEFAULT NULL,
  \`living_with\` VARCHAR(64) DEFAULT NULL,
  \`child_order\` VARCHAR(16) DEFAULT NULL,
  \`siblings_count\` VARCHAR(16) DEFAULT NULL,
  \`step_siblings_count\` VARCHAR(16) DEFAULT NULL,
  \`address\` TEXT DEFAULT NULL,
  \`photo_url\` TEXT DEFAULT NULL,
  \`parent_name\` VARCHAR(150) DEFAULT NULL,
  \`google_drive_link\` TEXT DEFAULT NULL,
  \`father_name\` VARCHAR(150) DEFAULT NULL,
  \`father_nik\` VARCHAR(32) DEFAULT NULL,
  \`father_birth_place\` VARCHAR(100) DEFAULT NULL,
  \`father_birth_date\` VARCHAR(32) DEFAULT NULL,
  \`father_education\` VARCHAR(64) DEFAULT NULL,
  \`father_occupation\` VARCHAR(100) DEFAULT NULL,
  \`father_income\` VARCHAR(64) DEFAULT NULL,
  \`father_address\` TEXT DEFAULT NULL,
  \`father_phone\` VARCHAR(32) DEFAULT NULL,
  \`father_status\` VARCHAR(32) DEFAULT NULL,
  \`mother_name\` VARCHAR(150) DEFAULT NULL,
  \`mother_nik\` VARCHAR(32) DEFAULT NULL,
  \`mother_birth_place\` VARCHAR(100) DEFAULT NULL,
  \`mother_birth_date\` VARCHAR(32) DEFAULT NULL,
  \`mother_education\` VARCHAR(64) DEFAULT NULL,
  \`mother_occupation\` VARCHAR(100) DEFAULT NULL,
  \`mother_income\` VARCHAR(64) DEFAULT NULL,
  \`mother_address\` TEXT DEFAULT NULL,
  \`mother_phone\` VARCHAR(32) DEFAULT NULL,
  \`mother_status\` VARCHAR(32) DEFAULT NULL,
  \`guardian_name\` VARCHAR(150) DEFAULT NULL,
  \`guardian_nik\` VARCHAR(32) DEFAULT NULL,
  \`guardian_birth_place\` VARCHAR(100) DEFAULT NULL,
  \`guardian_birth_date\` VARCHAR(32) DEFAULT NULL,
  \`guardian_education\` VARCHAR(64) DEFAULT NULL,
  \`guardian_occupation\` VARCHAR(100) DEFAULT NULL,
  \`guardian_income\` VARCHAR(64) DEFAULT NULL,
  \`guardian_address\` TEXT DEFAULT NULL,
  \`guardian_phone\` VARCHAR(32) DEFAULT NULL,
  \`guardian_status\` VARCHAR(32) DEFAULT NULL,
  \`is_spp_exempt\` TINYINT(1) DEFAULT 0,
  \`spp_exemption_reason\` TEXT DEFAULT NULL,
  \`spp_exemption_type\` VARCHAR(64) DEFAULT NULL,
  \`custom_spp_rate\` DECIMAL(15,2) DEFAULT NULL,
  \`mutation_date\` VARCHAR(32) DEFAULT NULL,
  \`mutation_reason\` TEXT DEFAULT NULL,
  \`mutation_destination\` VARCHAR(150) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_nis\` (\`nis\`),
  KEY \`idx_class\` (\`class\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`spp_bills\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`year\` INT NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending', 'waived') DEFAULT 'unpaid',
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`payment_method\` VARCHAR(64) DEFAULT NULL,
  \`order_id\` VARCHAR(100) DEFAULT NULL,
  \`transaction_id\` VARCHAR(100) DEFAULT NULL,
  \`achievement_type\` VARCHAR(64) DEFAULT NULL,
  \`achievement_detail\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_student_id\` (\`student_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_month_year\` (\`month\`, \`year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`misc_bills\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending') DEFAULT 'unpaid',
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`payment_method\` VARCHAR(64) DEFAULT NULL,
  \`order_id\` VARCHAR(100) DEFAULT NULL,
  \`transaction_id\` VARCHAR(100) DEFAULT NULL,
  \`is_monthly\` TINYINT(1) DEFAULT 0,
  \`month\` VARCHAR(32) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_misc_student\` (\`student_id\`),
  KEY \`idx_misc_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`savings_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_nis\` VARCHAR(32) DEFAULT NULL,
  \`type\` ENUM('deposit', 'withdrawal') NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` VARCHAR(32) DEFAULT 'success',
  \`created_at\` VARCHAR(64) NOT NULL,
  \`payment_method\` VARCHAR(64) DEFAULT NULL,
  \`order_id\` VARCHAR(100) DEFAULT NULL,
  \`transaction_id\` VARCHAR(100) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sav_student\` (\`student_id\`),
  KEY \`idx_sav_type\` (\`type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`treasurer_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`type\` ENUM('incoming', 'outgoing') NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`source\` VARCHAR(32) DEFAULT 'custom',
  \`student_name\` VARCHAR(150) DEFAULT NULL,
  \`student_id\` VARCHAR(64) DEFAULT NULL,
  \`nis\` VARCHAR(32) DEFAULT NULL,
  \`created_by\` VARCHAR(100) DEFAULT NULL,
  \`recipient_name\` VARCHAR(150) DEFAULT NULL,
  \`funding_source\` VARCHAR(100) DEFAULT NULL,
  \`payment_method\` ENUM('kas', 'bank') DEFAULT 'kas',
  \`kode_rekening\` VARCHAR(64) DEFAULT NULL,
  \`no_bukti\` VARCHAR(64) DEFAULT NULL,
  \`order_id\` VARCHAR(100) DEFAULT NULL,
  \`transaction_id\` VARCHAR(100) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_tr_type\` (\`type\`),
  KEY \`idx_tr_category\` (\`category\`),
  KEY \`idx_tr_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`teacher_salaries\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`teacher_id\` VARCHAR(64) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`teacher_type\` VARCHAR(32) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`base_salary\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`homeroom_allowance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`journal_count\` INT NOT NULL DEFAULT 0,
  \`journal_rate\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`journal_incentive\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`tunjangan_masa_kerja\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`vakasi\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`other_allowance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`potongan_dana_sosial\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`potongan_absen\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`potongan_lain\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`deductions\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`total_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`status\` ENUM('unpaid', 'paid') DEFAULT 'unpaid',
  \`payment_date\` VARCHAR(64) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sal_teacher\` (\`teacher_id\`),
  KEY \`idx_sal_month\` (\`month\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`homeroom_teachers\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`username\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`password\` VARCHAR(128) DEFAULT NULL,
  \`sk_url\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_hr_class\` (\`class_name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`subject_teachers\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`username\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`subject\` VARCHAR(100) NOT NULL,
  \`class_name\` VARCHAR(64) DEFAULT 'SEMUA KELAS',
  \`password\` VARCHAR(128) DEFAULT NULL,
  \`sk_url\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_subj_teacher\` (\`subject\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`teaching_journals\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`teacher_id\` VARCHAR(64) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`teacher_type\` VARCHAR(32) DEFAULT NULL,
  \`subject\` VARCHAR(100) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`topic\` TEXT NOT NULL,
  \`attendance_data\` LONGTEXT DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`fase\` VARCHAR(32) DEFAULT NULL,
  \`semester\` VARCHAR(32) DEFAULT NULL,
  \`alokasi_waktu\` VARCHAR(32) DEFAULT NULL,
  \`jam_ke\` VARCHAR(32) DEFAULT NULL,
  \`pertemuan_ke\` VARCHAR(32) DEFAULT NULL,
  \`tujuan_pembelajaran\` TEXT DEFAULT NULL,
  \`pencapaian_kktp\` TEXT DEFAULT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_tj_teacher\` (\`teacher_id\`),
  KEY \`idx_tj_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`attendance_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_name\` VARCHAR(150) DEFAULT NULL,
  \`class_name\` VARCHAR(32) DEFAULT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`status\` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat') NOT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`subject_notes\` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_att_student\` (\`student_id\`),
  KEY \`idx_att_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`merdeka_assessments\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_name\` VARCHAR(150) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`subject\` VARCHAR(100) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`semester\` VARCHAR(32) NOT NULL,
  \`academic_year\` VARCHAR(32) NOT NULL,
  \`tp1_name\` VARCHAR(150) DEFAULT NULL,
  \`tp1_tugas1\` VARCHAR(16) DEFAULT NULL,
  \`tp1_tugas2\` VARCHAR(16) DEFAULT NULL,
  \`tp1_uh\` VARCHAR(16) DEFAULT NULL,
  \`nilai_tp1\` DECIMAL(6,2) DEFAULT NULL,
  \`tp2_name\` VARCHAR(150) DEFAULT NULL,
  \`tp2_tugas1\` VARCHAR(16) DEFAULT NULL,
  \`tp2_tugas2\` VARCHAR(16) DEFAULT NULL,
  \`tp2_uh\` VARCHAR(16) DEFAULT NULL,
  \`nilai_tp2\` DECIMAL(6,2) DEFAULT NULL,
  \`tp3_name\` VARCHAR(150) DEFAULT NULL,
  \`tp3_tugas1\` VARCHAR(16) DEFAULT NULL,
  \`tp3_tugas2\` VARCHAR(16) DEFAULT NULL,
  \`tp3_uh\` VARCHAR(16) DEFAULT NULL,
  \`nilai_tp3\` DECIMAL(6,2) DEFAULT NULL,
  \`tp4_name\` VARCHAR(150) DEFAULT NULL,
  \`tp4_tugas1\` VARCHAR(16) DEFAULT NULL,
  \`tp4_tugas2\` VARCHAR(16) DEFAULT NULL,
  \`tp4_uh\` VARCHAR(16) DEFAULT NULL,
  \`nilai_tp4\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_rata_tp\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_kokurikuler\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_pts\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_pas\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_akhir_mapel\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_formatif\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_sumatif_lm\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_sas\` DECIMAL(6,2) DEFAULT NULL,
  \`nilai_rapor\` DECIMAL(6,2) DEFAULT NULL,
  \`deskripsi_capaian\` TEXT DEFAULT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  \`updated_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_ma_student\` (\`student_id\`),
  KEY \`idx_ma_class\` (\`class_name\`),
  KEY \`idx_ma_subj\` (\`subject\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`class_schedules\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`day\` ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu') NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`subject\` VARCHAR(100) NOT NULL,
  \`teacher_id\` VARCHAR(64) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`jam_ke\` VARCHAR(32) NOT NULL,
  \`start_time\` VARCHAR(16) DEFAULT NULL,
  \`end_time\` VARCHAR(16) DEFAULT NULL,
  \`alokasi_waktu\` VARCHAR(32) DEFAULT NULL,
  \`academic_year\` VARCHAR(32) DEFAULT NULL,
  \`semester\` VARCHAR(32) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sched_class\` (\`class_name\`),
  KEY \`idx_sched_teacher\` (\`teacher_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`student_development_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_name\` VARCHAR(150) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`category\` ENUM('Akademik', 'Sikap', 'Prestasi', 'Minat', 'Catatan Khusus') NOT NULL,
  \`notes\` TEXT NOT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_dev_student\` (\`student_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`student_infraction_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_name\` VARCHAR(150) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`time\` VARCHAR(16) NOT NULL,
  \`location\` VARCHAR(150) NOT NULL,
  \`infraction_type\` VARCHAR(150) NOT NULL,
  \`action_taken\` TEXT NOT NULL,
  \`resolution_status\` ENUM('Belum Selesai', 'Dalam Proses', 'Selesai') NOT NULL DEFAULT 'Belum Selesai',
  \`points\` INT DEFAULT 0,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_infr_student\` (\`student_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`infraction_rules\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`points\` INT NOT NULL DEFAULT 0,
  \`category\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`student_counseling_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_name\` VARCHAR(150) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`topic\` TEXT NOT NULL,
  \`action_plan\` TEXT NOT NULL,
  \`result\` TEXT NOT NULL,
  \`bk_feedback\` TEXT DEFAULT NULL,
  \`bk_feedback_at\` VARCHAR(64) DEFAULT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_couns_student\` (\`student_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`class_announcements\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`content\` TEXT NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`target_recipient\` VARCHAR(64) NOT NULL,
  \`confirmation_status\` VARCHAR(64) DEFAULT 'Belum Dibaca',
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`class_meeting_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`class_name\` VARCHAR(32) NOT NULL,
  \`meeting_type\` VARCHAR(100) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`attendees\` TEXT NOT NULL,
  \`agenda\` TEXT NOT NULL,
  \`follow_up\` TEXT NOT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`principal_work_programs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`target_date\` VARCHAR(32) NOT NULL,
  \`status\` ENUM('planned', 'active', 'completed') NOT NULL DEFAULT 'planned',
  \`sync_with_staff\` TINYINT(1) DEFAULT 0,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`teacher_evaluations\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`teacher_type\` VARCHAR(32) NOT NULL,
  \`teacher_id\` VARCHAR(64) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`evaluator_name\` VARCHAR(150) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`academic_year\` VARCHAR(32) NOT NULL,
  \`pedagogic_score\` INT NOT NULL DEFAULT 0,
  \`professional_score\` INT NOT NULL DEFAULT 0,
  \`personal_score\` INT NOT NULL DEFAULT 0,
  \`social_score\` INT NOT NULL DEFAULT 0,
  \`notes\` TEXT NOT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`sarpras_items\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`code\` VARCHAR(64) NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`condition_status\` ENUM('Baik', 'Rusak Ringan', 'Rusak Berat') NOT NULL DEFAULT 'Baik',
  \`location\` VARCHAR(150) NOT NULL,
  \`total_qty\` INT NOT NULL DEFAULT 0,
  \`available_qty\` INT NOT NULL DEFAULT 0,
  \`price\` DECIMAL(15,2) DEFAULT NULL,
  \`purchase_year\` VARCHAR(32) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sarp_code\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`sarpras_proposals\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`item_name\` VARCHAR(150) NOT NULL,
  \`qty\` INT NOT NULL DEFAULT 1,
  \`estimated_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`total_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`proposed_by\` VARCHAR(150) NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`reason\` TEXT NOT NULL,
  \`status\` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  \`notes\` TEXT DEFAULT NULL,
  \`image_url\` TEXT DEFAULT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`sarpras_loans\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`item_id\` VARCHAR(64) NOT NULL,
  \`item_name\` VARCHAR(150) NOT NULL,
  \`borrower_id\` VARCHAR(64) NOT NULL,
  \`borrower_name\` VARCHAR(150) NOT NULL,
  \`qty\` INT NOT NULL DEFAULT 1,
  \`loan_date\` VARCHAR(32) NOT NULL,
  \`return_date\` VARCHAR(32) DEFAULT NULL,
  \`status\` ENUM('dipinjam', 'kembali') NOT NULL DEFAULT 'dipinjam',
  \`notes\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_loan_item\` (\`item_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`spmb_candidates\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`registration_no\` VARCHAR(64) NOT NULL,
  \`nisn\` VARCHAR(32) NOT NULL,
  \`nik\` VARCHAR(32) NOT NULL,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`gender\` ENUM('L', 'P') NOT NULL,
  \`birth_place\` VARCHAR(100) NOT NULL,
  \`birth_date\` VARCHAR(32) NOT NULL,
  \`phone\` VARCHAR(32) NOT NULL,
  \`school_origin_type\` VARCHAR(64) DEFAULT 'other',
  \`school_origin\` VARCHAR(150) NOT NULL,
  \`registration_type\` VARCHAR(64) DEFAULT 'online_individual',
  \`session_id\` VARCHAR(64) NOT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  \`original_session_id\` VARCHAR(64) DEFAULT NULL,
  \`previous_session_id\` VARCHAR(64) DEFAULT NULL,
  \`is_transferred_session\` TINYINT(1) DEFAULT 0,
  \`transferred_at\` VARCHAR(64) DEFAULT NULL,
  \`transfer_reason\` TEXT DEFAULT NULL,
  \`transfer_history\` LONGTEXT DEFAULT NULL,
  \`token_payment_status\` VARCHAR(32) DEFAULT 'unpaid',
  \`token_payment_order_id\` VARCHAR(100) DEFAULT NULL,
  \`token_paid_at\` VARCHAR(64) DEFAULT NULL,
  \`token_payment_method\` VARCHAR(64) DEFAULT NULL,
  \`token_amount\` DECIMAL(15,2) DEFAULT NULL,
  \`collective_refund_status\` VARCHAR(32) DEFAULT 'none',
  \`collective_refund_amount\` DECIMAL(15,2) DEFAULT NULL,
  \`collective_refunded_at\` VARCHAR(64) DEFAULT NULL,
  \`collective_refunded_by\` VARCHAR(100) DEFAULT NULL,
  \`collective_refund_recipient\` VARCHAR(150) DEFAULT NULL,
  \`collective_refund_note\` TEXT DEFAULT NULL,
  \`collective_refund_receipt_no\` VARCHAR(64) DEFAULT NULL,
  \`is_form_completed\` TINYINT(1) DEFAULT 0,
  \`form_completed_at\` VARCHAR(64) DEFAULT NULL,
  \`nickname\` VARCHAR(64) DEFAULT NULL,
  \`kk_number\` VARCHAR(32) DEFAULT NULL,
  \`birth_cert_number\` VARCHAR(64) DEFAULT NULL,
  \`religion\` VARCHAR(32) DEFAULT NULL,
  \`address\` TEXT DEFAULT NULL,
  \`dusun\` VARCHAR(100) DEFAULT NULL,
  \`rt\` VARCHAR(16) DEFAULT NULL,
  \`rw\` VARCHAR(16) DEFAULT NULL,
  \`village\` VARCHAR(100) DEFAULT NULL,
  \`district\` VARCHAR(100) DEFAULT NULL,
  \`city\` VARCHAR(100) DEFAULT NULL,
  \`postal_code\` VARCHAR(16) DEFAULT NULL,
  \`living_with\` VARCHAR(64) DEFAULT NULL,
  \`child_order\` VARCHAR(16) DEFAULT NULL,
  \`siblings_count\` VARCHAR(16) DEFAULT NULL,
  \`step_siblings_count\` VARCHAR(16) DEFAULT NULL,
  \`transportation\` VARCHAR(64) DEFAULT NULL,
  \`special_needs\` VARCHAR(100) DEFAULT NULL,
  \`height\` INT DEFAULT NULL,
  \`weight\` INT DEFAULT NULL,
  \`distance_to_school\` VARCHAR(64) DEFAULT NULL,
  \`travel_time\` VARCHAR(64) DEFAULT NULL,
  \`father_name\` VARCHAR(150) DEFAULT NULL,
  \`father_nik\` VARCHAR(32) DEFAULT NULL,
  \`father_birth_place\` VARCHAR(100) DEFAULT NULL,
  \`father_birth_date\` VARCHAR(32) DEFAULT NULL,
  \`father_education\` VARCHAR(64) DEFAULT NULL,
  \`father_occupation\` VARCHAR(100) DEFAULT NULL,
  \`father_income\` VARCHAR(64) DEFAULT NULL,
  \`father_phone\` VARCHAR(32) DEFAULT NULL,
  \`father_status\` VARCHAR(32) DEFAULT NULL,
  \`father_address\` TEXT DEFAULT NULL,
  \`mother_name\` VARCHAR(150) DEFAULT NULL,
  \`mother_nik\` VARCHAR(32) DEFAULT NULL,
  \`mother_birth_place\` VARCHAR(100) DEFAULT NULL,
  \`mother_birth_date\` VARCHAR(32) DEFAULT NULL,
  \`mother_education\` VARCHAR(64) DEFAULT NULL,
  \`mother_occupation\` VARCHAR(100) DEFAULT NULL,
  \`mother_income\` VARCHAR(64) DEFAULT NULL,
  \`mother_phone\` VARCHAR(32) DEFAULT NULL,
  \`mother_status\` VARCHAR(32) DEFAULT NULL,
  \`mother_address\` TEXT DEFAULT NULL,
  \`guardian_name\` VARCHAR(150) DEFAULT NULL,
  \`guardian_nik\` VARCHAR(32) DEFAULT NULL,
  \`guardian_birth_place\` VARCHAR(100) DEFAULT NULL,
  \`guardian_birth_date\` VARCHAR(32) DEFAULT NULL,
  \`guardian_education\` VARCHAR(64) DEFAULT NULL,
  \`guardian_occupation\` VARCHAR(100) DEFAULT NULL,
  \`guardian_income\` VARCHAR(64) DEFAULT NULL,
  \`guardian_phone\` VARCHAR(32) DEFAULT NULL,
  \`guardian_status\` VARCHAR(32) DEFAULT NULL,
  \`guardian_address\` TEXT DEFAULT NULL,
  \`guardian_relationship\` VARCHAR(64) DEFAULT NULL,
  \`guardian_is_same_as_father\` TINYINT(1) DEFAULT 0,
  \`re_registration_paid_at\` VARCHAR(64) DEFAULT NULL,
  \`re_registration_method\` VARCHAR(64) DEFAULT NULL,
  \`re_registration_order_id\` VARCHAR(100) DEFAULT NULL,
  \`re_registration_status\` VARCHAR(32) DEFAULT 'unpaid',
  \`building_fee_paid\` DECIMAL(15,2) DEFAULT 0.00,
  \`july_spp_paid\` DECIMAL(15,2) DEFAULT 0.00,
  \`uniform_fee_paid\` DECIMAL(15,2) DEFAULT 0.00,
  \`total_re_registration_paid\` DECIMAL(15,2) DEFAULT 0.00,
  \`uniform_orders\` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_spmb_regno\` (\`registration_no\`),
  KEY \`idx_spmb_nisn\` (\`nisn\`),
  KEY \`idx_spmb_session\` (\`session_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`midtrans_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`order_id\` VARCHAR(100) NOT NULL,
  \`transaction_id\` VARCHAR(100) DEFAULT NULL,
  \`student_id\` VARCHAR(64) DEFAULT NULL,
  \`student_name\` VARCHAR(150) DEFAULT NULL,
  \`student_nis\` VARCHAR(32) DEFAULT NULL,
  \`nisn\` VARCHAR(32) DEFAULT NULL,
  \`bill_type\` VARCHAR(64) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`gross_amount\` DECIMAL(15,2) NOT NULL,
  \`payment_type\` VARCHAR(64) NOT NULL,
  \`transaction_status\` VARCHAR(64) NOT NULL,
  \`fraud_status\` VARCHAR(64) DEFAULT NULL,
  \`settlement_time\` VARCHAR(64) DEFAULT NULL,
  \`transaction_time\` VARCHAR(64) DEFAULT NULL,
  \`created_at\` VARCHAR(64) NOT NULL,
  \`updated_at\` VARCHAR(64) NOT NULL,
  \`snap_token\` TEXT DEFAULT NULL,
  \`raw_response\` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_mid_order\` (\`order_id\`),
  KEY \`idx_mid_student\` (\`student_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`notifications\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) DEFAULT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`type\` VARCHAR(32) NOT NULL DEFAULT 'info',
  \`category\` VARCHAR(64) DEFAULT 'admin',
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_notif_student\` (\`student_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`app_configs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`data\` LONGTEXT NOT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Helper: Escape SQL string literals safely
export function sqlEscape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    if (isNaN(val)) return '0';
    return String(val);
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%': return '\\' + char;
        default: return char;
      }
    })}'`;
  }
  const str = String(val);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\x08': return '\\b';
      case '\x09': return '\\t';
      case '\x1a': return '\\z';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%': return '\\' + char;
      default: return char;
    }
  })}'`;
}

// Generate COMPLETE, ready-to-import phpMyAdmin .SQL dump containing all schema & data
export function generateFullPhpMyAdminSql(snapshot: any): string {
  const exportDate = new Date().toLocaleString('id-ID');
  const counts: Record<string, number> = {};

  let out = `-- ==========================================================
-- SKRIP EKSPOR LENGKAP MYSQL / PHPMYADMIN (SMP MA'ARIF NU PANDAAN)
-- Format: Standar MySQL 5.7+ / 8.0+ / MariaDB 10.x
-- Tanggal Ekspor: ${exportDate}
-- Sistem: SiPAS & Portal Bendahara Keuangan Terpadu
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- STRUKTUR LENGKAP TABEL SISTEM
-- --------------------------------------------------------
${COMPLETE_TABLES_SQL.trim()}

-- --------------------------------------------------------
-- EKSPOR DATA LENGKAP (INSERT INTO)
-- --------------------------------------------------------
`;

  // 1. Students
  const students = snapshot.students || [];
  counts['students'] = students.length;
  if (students.length > 0) {
    out += `\n-- Data Siswa (${students.length} baris)\n`;
    for (const s of students) {
      out += `INSERT INTO \`students\` (\`id\`, \`nis\`, \`nisn\`, \`name\`, \`class\`, \`gender\`, \`email\`, \`phone\`, \`savings_balance\`, \`status\`, \`password\`, \`nickname\`, \`nik\`, \`birth_place\`, \`birth_date\`, \`kk_number\`, \`birth_cert_number\`, \`living_with\`, \`child_order\`, \`siblings_count\`, \`step_siblings_count\`, \`address\`, \`photo_url\`, \`parent_name\`, \`google_drive_link\`, \`father_name\`, \`father_nik\`, \`father_birth_place\`, \`father_birth_date\`, \`father_education\`, \`father_occupation\`, \`father_income\`, \`father_address\`, \`father_phone\`, \`father_status\`, \`mother_name\`, \`mother_nik\`, \`mother_birth_place\`, \`mother_birth_date\`, \`mother_education\`, \`mother_occupation\`, \`mother_income\`, \`mother_address\`, \`mother_phone\`, \`mother_status\`, \`guardian_name\`, \`guardian_nik\`, \`guardian_birth_place\`, \`guardian_birth_date\`, \`guardian_education\`, \`guardian_occupation\`, \`guardian_income\`, \`guardian_address\`, \`guardian_phone\`, \`guardian_status\`, \`is_spp_exempt\`, \`spp_exemption_reason\`, \`spp_exemption_type\`, \`custom_spp_rate\`, \`mutation_date\`, \`mutation_reason\`, \`mutation_destination\`) VALUES (${sqlEscape(s.id)}, ${sqlEscape(s.nis)}, ${sqlEscape(s.nisn)}, ${sqlEscape(s.name)}, ${sqlEscape(s.class)}, ${sqlEscape(s.gender || 'Laki-laki')}, ${sqlEscape(s.email)}, ${sqlEscape(s.phone)}, ${sqlEscape(s.savingsBalance || 0)}, ${sqlEscape(s.status || 'Aktif')}, ${sqlEscape(s.password)}, ${sqlEscape(s.nickname)}, ${sqlEscape(s.nik)}, ${sqlEscape(s.birthPlace)}, ${sqlEscape(s.birthDate)}, ${sqlEscape(s.kkNumber)}, ${sqlEscape(s.birthCertNumber)}, ${sqlEscape(s.livingWith)}, ${sqlEscape(s.childOrder)}, ${sqlEscape(s.siblingsCount)}, ${sqlEscape(s.stepSiblingsCount)}, ${sqlEscape(s.address)}, ${sqlEscape(s.photoUrl)}, ${sqlEscape(s.parentName)}, ${sqlEscape(s.googleDriveLink)}, ${sqlEscape(s.fatherName)}, ${sqlEscape(s.fatherNik)}, ${sqlEscape(s.fatherBirthPlace)}, ${sqlEscape(s.fatherBirthDate)}, ${sqlEscape(s.fatherEducation)}, ${sqlEscape(s.fatherOccupation)}, ${sqlEscape(s.fatherIncome)}, ${sqlEscape(s.fatherAddress)}, ${sqlEscape(s.fatherPhone)}, ${sqlEscape(s.fatherStatus)}, ${sqlEscape(s.motherName)}, ${sqlEscape(s.motherNik)}, ${sqlEscape(s.motherBirthPlace)}, ${sqlEscape(s.motherBirthDate)}, ${sqlEscape(s.motherEducation)}, ${sqlEscape(s.motherOccupation)}, ${sqlEscape(s.motherIncome)}, ${sqlEscape(s.motherAddress)}, ${sqlEscape(s.motherPhone)}, ${sqlEscape(s.motherStatus)}, ${sqlEscape(s.guardianName)}, ${sqlEscape(s.guardianNik)}, ${sqlEscape(s.guardianBirthPlace)}, ${sqlEscape(s.guardianBirthDate)}, ${sqlEscape(s.guardianEducation)}, ${sqlEscape(s.guardianOccupation)}, ${sqlEscape(s.guardianIncome)}, ${sqlEscape(s.guardianAddress)}, ${sqlEscape(s.guardianPhone)}, ${sqlEscape(s.guardianStatus)}, ${sqlEscape(s.isSppExempt ? 1 : 0)}, ${sqlEscape(s.sppExemptionReason)}, ${sqlEscape(s.sppExemptionType)}, ${sqlEscape(s.customSppRate)}, ${sqlEscape(s.mutationDate)}, ${sqlEscape(s.mutationReason)}, ${sqlEscape(s.mutationDestination)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`class\`=VALUES(\`class\`), \`savings_balance\`=VALUES(\`savings_balance\`), \`status\`=VALUES(\`status\`);\n`;
    }
  }

  // 2. SPP Bills
  const sppBills = snapshot.sppBills || [];
  counts['sppBills'] = sppBills.length;
  if (sppBills.length > 0) {
    out += `\n-- Data Tagihan SPP (${sppBills.length} baris)\n`;
    for (const b of sppBills) {
      out += `INSERT INTO \`spp_bills\` (\`id\`, \`student_id\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paid_at\`, \`payment_method\`, \`order_id\`, \`transaction_id\`, \`achievement_type\`, \`achievement_detail\`) VALUES (${sqlEscape(b.id)}, ${sqlEscape(b.studentId)}, ${sqlEscape(b.month)}, ${sqlEscape(b.year || 2026)}, ${sqlEscape(b.amount || 0)}, ${sqlEscape(b.status || 'unpaid')}, ${sqlEscape(b.paidAt)}, ${sqlEscape(b.paymentMethod)}, ${sqlEscape(b.orderId)}, ${sqlEscape(b.transactionId)}, ${sqlEscape(b.achievementType)}, ${sqlEscape(b.achievementDetail)}) ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`), \`paid_at\`=VALUES(\`paid_at\`);\n`;
    }
  }

  // 3. Misc Bills
  const miscBills = snapshot.miscBills || [];
  counts['miscBills'] = miscBills.length;
  if (miscBills.length > 0) {
    out += `\n-- Data Tagihan Non-SPP / Lainnya (${miscBills.length} baris)\n`;
    for (const m of miscBills) {
      out += `INSERT INTO \`misc_bills\` (\`id\`, \`student_id\`, \`title\`, \`amount\`, \`status\`, \`created_at\`, \`paid_at\`, \`payment_method\`, \`order_id\`, \`transaction_id\`, \`is_monthly\`, \`month\`) VALUES (${sqlEscape(m.id)}, ${sqlEscape(m.studentId)}, ${sqlEscape(m.title)}, ${sqlEscape(m.amount || 0)}, ${sqlEscape(m.status || 'unpaid')}, ${sqlEscape(m.createdAt)}, ${sqlEscape(m.paidAt)}, ${sqlEscape(m.paymentMethod)}, ${sqlEscape(m.orderId)}, ${sqlEscape(m.transactionId)}, ${sqlEscape(m.isMonthly ? 1 : 0)}, ${sqlEscape(m.month)}) ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`), \`paid_at\`=VALUES(\`paid_at\`);\n`;
    }
  }

  // 4. Savings Transactions
  const savings = snapshot.savingsTransactions || [];
  counts['savingsTransactions'] = savings.length;
  if (savings.length > 0) {
    out += `\n-- Data Transaksi Tabungan Siswa (${savings.length} baris)\n`;
    for (const s of savings) {
      out += `INSERT INTO \`savings_transactions\` (\`id\`, \`student_id\`, \`student_nis\`, \`type\`, \`amount\`, \`status\`, \`created_at\`, \`payment_method\`, \`order_id\`, \`transaction_id\`, \`notes\`) VALUES (${sqlEscape(s.id)}, ${sqlEscape(s.studentId)}, ${sqlEscape(s.studentNis)}, ${sqlEscape(s.type)}, ${sqlEscape(s.amount || 0)}, ${sqlEscape(s.status || 'success')}, ${sqlEscape(s.createdAt)}, ${sqlEscape(s.paymentMethod)}, ${sqlEscape(s.orderId)}, ${sqlEscape(s.transactionId)}, ${sqlEscape(s.notes)}) ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`);\n`;
    }
  }

  // 5. Treasurer Transactions
  const transactions = snapshot.treasurerTransactions || [];
  counts['treasurerTransactions'] = transactions.length;
  if (transactions.length > 0) {
    out += `\n-- Data Mutasi Buku Kas Umum Bendahara (${transactions.length} baris)\n`;
    for (const t of transactions) {
      out += `INSERT INTO \`treasurer_transactions\` (\`id\`, \`type\`, \`category\`, \`amount\`, \`description\`, \`date\`, \`source\`, \`student_name\`, \`student_id\`, \`nis\`, \`created_by\`, \`recipient_name\`, \`funding_source\`, \`payment_method\`, \`kode_rekening\`, \`no_bukti\`, \`order_id\`, \`transaction_id\`) VALUES (${sqlEscape(t.id)}, ${sqlEscape(t.type)}, ${sqlEscape(t.category)}, ${sqlEscape(t.amount || 0)}, ${sqlEscape(t.description)}, ${sqlEscape(t.date)}, ${sqlEscape(t.source || 'custom')}, ${sqlEscape(t.studentName)}, ${sqlEscape(t.studentId)}, ${sqlEscape(t.nis)}, ${sqlEscape(t.createdBy || 'Bendahara')}, ${sqlEscape(t.recipientName)}, ${sqlEscape(t.fundingSource)}, ${sqlEscape(t.paymentMethod === 'bank' ? 'bank' : 'kas')}, ${sqlEscape(t.kodeRekening)}, ${sqlEscape(t.noBukti)}, ${sqlEscape(t.orderId)}, ${sqlEscape(t.transactionId)}) ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`), \`category\`=VALUES(\`category\`), \`description\`=VALUES(\`description\`);\n`;
    }
  }

  // 6. Teacher Salaries
  const salaries = snapshot.teacherSalaries || [];
  counts['teacherSalaries'] = salaries.length;
  if (salaries.length > 0) {
    out += `\n-- Data Gaji Guru & Karyawan (${salaries.length} baris)\n`;
    for (const sal of salaries) {
      out += `INSERT INTO \`teacher_salaries\` (\`id\`, \`teacher_id\`, \`teacher_name\`, \`teacher_type\`, \`month\`, \`base_salary\`, \`homeroom_allowance\`, \`journal_count\`, \`journal_rate\`, \`journal_incentive\`, \`tunjangan_masa_kerja\`, \`vakasi\`, \`other_allowance\`, \`potongan_dana_sosial\`, \`potongan_absen\`, \`potongan_lain\`, \`deductions\`, \`total_amount\`, \`status\`, \`payment_date\`, \`notes\`, \`created_at\`) VALUES (${sqlEscape(sal.id)}, ${sqlEscape(sal.teacherId)}, ${sqlEscape(sal.teacherName)}, ${sqlEscape(sal.teacherType)}, ${sqlEscape(sal.month)}, ${sqlEscape(sal.baseSalary || 0)}, ${sqlEscape(sal.homeroomAllowance || 0)}, ${sqlEscape(sal.journalCount || 0)}, ${sqlEscape(sal.journalRate || 0)}, ${sqlEscape((sal.journalCount || 0) * (sal.journalRate || 0))}, ${sqlEscape(sal.tunjanganMasaKerja || 0)}, ${sqlEscape(sal.vakasi || 0)}, ${sqlEscape(sal.otherAllowance || 0)}, ${sqlEscape(sal.potonganDanaSosial || 0)}, ${sqlEscape(sal.potonganAbsen || 0)}, ${sqlEscape(sal.potonganLain || 0)}, ${sqlEscape(sal.deductions || 0)}, ${sqlEscape(sal.totalAmount || 0)}, ${sqlEscape(sal.status || 'unpaid')}, ${sqlEscape(sal.paymentDate)}, ${sqlEscape(sal.notes)}, ${sqlEscape(sal.createdAt)}) ON DUPLICATE KEY UPDATE \`total_amount\`=VALUES(\`total_amount\`), \`status\`=VALUES(\`status\`);\n`;
    }
  }

  // 7. Homeroom Teachers
  const homeroomTeachers = snapshot.homeroomTeachers || [];
  counts['homeroomTeachers'] = homeroomTeachers.length;
  if (homeroomTeachers.length > 0) {
    out += `\n-- Data Wali Kelas (${homeroomTeachers.length} baris)\n`;
    for (const hr of homeroomTeachers) {
      out += `INSERT INTO \`homeroom_teachers\` (\`id\`, \`username\`, \`name\`, \`class_name\`, \`password\`, \`sk_url\`) VALUES (${sqlEscape(hr.id)}, ${sqlEscape(hr.username)}, ${sqlEscape(hr.name)}, ${sqlEscape(hr.className)}, ${sqlEscape(hr.password)}, ${sqlEscape(hr.skUrl)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`class_name\`=VALUES(\`class_name\`);\n`;
    }
  }

  // 8. Subject Teachers
  const subjectTeachers = snapshot.subjectTeachers || [];
  counts['subjectTeachers'] = subjectTeachers.length;
  if (subjectTeachers.length > 0) {
    out += `\n-- Data Guru Mata Pelajaran (${subjectTeachers.length} baris)\n`;
    for (const st of subjectTeachers) {
      out += `INSERT INTO \`subject_teachers\` (\`id\`, \`username\`, \`name\`, \`subject\`, \`class_name\`, \`password\`, \`sk_url\`) VALUES (${sqlEscape(st.id)}, ${sqlEscape(st.username)}, ${sqlEscape(st.name)}, ${sqlEscape(st.subject)}, ${sqlEscape(st.className || 'SEMUA KELAS')}, ${sqlEscape(st.password)}, ${sqlEscape(st.skUrl)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`subject\`=VALUES(\`subject\`);\n`;
    }
  }

  // 9. Teaching Journals
  const teachingJournals = snapshot.teachingJournals || [];
  counts['teachingJournals'] = teachingJournals.length;
  if (teachingJournals.length > 0) {
    out += `\n-- Data Jurnal Mengajar (${teachingJournals.length} baris)\n`;
    for (const tj of teachingJournals) {
      out += `INSERT INTO \`teaching_journals\` (\`id\`, \`teacher_id\`, \`teacher_name\`, \`teacher_type\`, \`subject\`, \`class_name\`, \`date\`, \`topic\`, \`attendance_data\`, \`notes\`, \`fase\`, \`semester\`, \`alokasi_waktu\`, \`jam_ke\`, \`pertemuan_ke\`, \`tujuan_pembelajaran\`, \`pencapaian_kktp\`, \`created_at\`) VALUES (${sqlEscape(tj.id)}, ${sqlEscape(tj.teacherId)}, ${sqlEscape(tj.teacherName)}, ${sqlEscape(tj.teacherType)}, ${sqlEscape(tj.subject)}, ${sqlEscape(tj.className)}, ${sqlEscape(tj.date)}, ${sqlEscape(tj.topic)}, ${sqlEscape(tj.attendance)}, ${sqlEscape(tj.notes)}, ${sqlEscape(tj.fase)}, ${sqlEscape(tj.semester)}, ${sqlEscape(tj.alokasiWaktu)}, ${sqlEscape(tj.jamKe)}, ${sqlEscape(tj.pertemuanKe)}, ${sqlEscape(tj.tujuanPembelajaran)}, ${sqlEscape(tj.pencapaianKktp)}, ${sqlEscape(tj.createdAt)}) ON DUPLICATE KEY UPDATE \`topic\`=VALUES(\`topic\`);\n`;
    }
  }

  // 10. Attendance Logs
  const attendanceLogs = snapshot.attendanceLogs || [];
  counts['attendanceLogs'] = attendanceLogs.length;
  if (attendanceLogs.length > 0) {
    out += `\n-- Data Presensi Siswa (${attendanceLogs.length} baris)\n`;
    for (const att of attendanceLogs) {
      out += `INSERT INTO \`attendance_logs\` (\`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`date\`, \`status\`, \`notes\`, \`subject_notes\`) VALUES (${sqlEscape(att.id)}, ${sqlEscape(att.studentId)}, ${sqlEscape(att.studentName)}, ${sqlEscape(att.className)}, ${sqlEscape(att.date)}, ${sqlEscape(att.status)}, ${sqlEscape(att.notes)}, ${sqlEscape(att.subjectNotes)}) ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`);\n`;
    }
  }

  // 11. Merdeka Assessments
  const merdekaAssessments = snapshot.merdekaAssessments || [];
  counts['merdekaAssessments'] = merdekaAssessments.length;
  if (merdekaAssessments.length > 0) {
    out += `\n-- Data Penilaian Kurikulum Merdeka (${merdekaAssessments.length} baris)\n`;
    for (const ma of merdekaAssessments) {
      out += `INSERT INTO \`merdeka_assessments\` (\`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`subject\`, \`teacher_name\`, \`semester\`, \`academic_year\`, \`tp1_name\`, \`tp1_tugas1\`, \`tp1_tugas2\`, \`tp1_uh\`, \`nilai_tp1\`, \`tp2_name\`, \`tp2_tugas1\`, \`tp2_tugas2\`, \`tp2_uh\`, \`nilai_tp2\`, \`tp3_name\`, \`tp3_tugas1\`, \`tp3_tugas2\`, \`tp3_uh\`, \`nilai_tp3\`, \`tp4_name\`, \`tp4_tugas1\`, \`tp4_tugas2\`, \`tp4_uh\`, \`nilai_tp4\`, \`nilai_rata_tp\`,\`nilai_kokurikuler\`, \`nilai_pts\`, \`nilai_pas\`, \`nilai_akhir_mapel\`, \`nilai_formatif\`, \`nilai_sumatif_lm\`, \`nilai_sas\`, \`nilai_rapor\`, \`deskripsi_capaian\`, \`created_at\`, \`updated_at\`) VALUES (${sqlEscape(ma.id)}, ${sqlEscape(ma.studentId)}, ${sqlEscape(ma.studentName)}, ${sqlEscape(ma.className)}, ${sqlEscape(ma.subject)}, ${sqlEscape(ma.teacherName)}, ${sqlEscape(ma.semester)}, ${sqlEscape(ma.academicYear)}, ${sqlEscape(ma.tp1Name)}, ${sqlEscape(ma.tp1Tugas1)}, ${sqlEscape(ma.tp1Tugas2)}, ${sqlEscape(ma.tp1Uh)}, ${sqlEscape(ma.nilaiTp1)}, ${sqlEscape(ma.tp2Name)}, ${sqlEscape(ma.tp2Tugas1)}, ${sqlEscape(ma.tp2Tugas2)}, ${sqlEscape(ma.tp2Uh)}, ${sqlEscape(ma.nilaiTp2)}, ${sqlEscape(ma.tp3Name)}, ${sqlEscape(ma.tp3Tugas1)}, ${sqlEscape(ma.tp3Tugas2)}, ${sqlEscape(ma.tp3Uh)}, ${sqlEscape(ma.nilaiTp3)}, ${sqlEscape(ma.tp4Name)}, ${sqlEscape(ma.tp4Tugas1)}, ${sqlEscape(ma.tp4Tugas2)}, ${sqlEscape(ma.tp4Uh)}, ${sqlEscape(ma.nilaiTp4)}, ${sqlEscape(ma.nilaiRataTp)}, ${sqlEscape(ma.nilaiKokurikuler)}, ${sqlEscape(ma.nilaiPts)}, ${sqlEscape(ma.nilaiPas)}, ${sqlEscape(ma.nilaiAkhirMapel)}, ${sqlEscape(ma.nilaiFormatif)}, ${sqlEscape(ma.nilaiSumatifLM)}, ${sqlEscape(ma.nilaiSAS)}, ${sqlEscape(ma.nilaiRapor)}, ${sqlEscape(ma.deskripsiCapaian)}, ${sqlEscape(ma.createdAt)}, ${sqlEscape(ma.updatedAt)}) ON DUPLICATE KEY UPDATE \`nilai_akhir_mapel\`=VALUES(\`nilai_akhir_mapel\`);\n`;
    }
  }

  // 12. Class Schedules
  const schedules = snapshot.classSchedules || [];
  counts['classSchedules'] = schedules.length;
  if (schedules.length > 0) {
    out += `\n-- Data Jadwal Pelajaran (${schedules.length} baris)\n`;
    for (const sc of schedules) {
      out += `INSERT INTO \`class_schedules\` (\`id\`, \`day\`, \`class_name\`, \`subject\`, \`teacher_id\`, \`teacher_name\`, \`jam_ke\`, \`start_time\`, \`end_time\`, \`alokasi_waktu\`, \`academic_year\`, \`semester\`, \`created_at\`) VALUES (${sqlEscape(sc.id)}, ${sqlEscape(sc.day)}, ${sqlEscape(sc.className)}, ${sqlEscape(sc.subject)}, ${sqlEscape(sc.teacherId)}, ${sqlEscape(sc.teacherName)}, ${sqlEscape(sc.jamKe)}, ${sqlEscape(sc.startTime)}, ${sqlEscape(sc.endTime)}, ${sqlEscape(sc.alokasiWaktu)}, ${sqlEscape(sc.academicYear)}, ${sqlEscape(sc.semester)}, ${sqlEscape(sc.createdAt)}) ON DUPLICATE KEY UPDATE \`subject\`=VALUES(\`subject\`);\n`;
    }
  }

  // 13. Student Development Logs
  const devLogs = snapshot.studentDevelopmentLogs || [];
  counts['studentDevelopmentLogs'] = devLogs.length;
  if (devLogs.length > 0) {
    out += `\n-- Data Catatan Perkembangan Siswa (${devLogs.length} baris)\n`;
    for (const dl of devLogs) {
      out += `INSERT INTO \`student_development_logs\` (\`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`date\`, \`category\`, \`notes\`, \`created_at\`) VALUES (${sqlEscape(dl.id)}, ${sqlEscape(dl.studentId)}, ${sqlEscape(dl.studentName)}, ${sqlEscape(dl.className)}, ${sqlEscape(dl.date)}, ${sqlEscape(dl.category)}, ${sqlEscape(dl.notes)}, ${sqlEscape(dl.createdAt)}) ON DUPLICATE KEY UPDATE \`notes\`=VALUES(\`notes\`);\n`;
    }
  }

  // 14. Student Infractions & Rules
  const infractions = snapshot.studentInfractionLogs || [];
  counts['studentInfractionLogs'] = infractions.length;
  if (infractions.length > 0) {
    out += `\n-- Data Pelanggaran Siswa (${infractions.length} baris)\n`;
    for (const inf of infractions) {
      out += `INSERT INTO \`student_infraction_logs\` (\`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`date\`, \`time\`, \`location\`, \`infraction_type\`, \`action_taken\`, \`resolution_status\`, \`points\`, \`created_at\`) VALUES (${sqlEscape(inf.id)}, ${sqlEscape(inf.studentId)}, ${sqlEscape(inf.studentName)}, ${sqlEscape(inf.className)}, ${sqlEscape(inf.date)}, ${sqlEscape(inf.time)}, ${sqlEscape(inf.location)}, ${sqlEscape(inf.infractionType)}, ${sqlEscape(inf.actionTaken)}, ${sqlEscape(inf.resolutionStatus)}, ${sqlEscape(inf.points || 0)}, ${sqlEscape(inf.createdAt)}) ON DUPLICATE KEY UPDATE \`resolution_status\`=VALUES(\`resolution_status\`);\n`;
    }
  }

  const infractionRules = snapshot.infractionRules || [];
  counts['infractionRules'] = infractionRules.length;
  if (infractionRules.length > 0) {
    out += `\n-- Data Aturan Poin Pelanggaran (${infractionRules.length} baris)\n`;
    for (const rule of infractionRules) {
      out += `INSERT INTO \`infraction_rules\` (\`id\`, \`name\`, \`points\`, \`category\`) VALUES (${sqlEscape(rule.id)}, ${sqlEscape(rule.name)}, ${sqlEscape(rule.points || 0)}, ${sqlEscape(rule.category)}) ON DUPLICATE KEY UPDATE \`points\`=VALUES(\`points\`);\n`;
    }
  }

  // 15. Counseling Logs
  const counselLogs = snapshot.studentCounselingLogs || [];
  counts['studentCounselingLogs'] = counselLogs.length;
  if (counselLogs.length > 0) {
    out += `\n-- Data Bimbingan Konseling (BK) (${counselLogs.length} baris)\n`;
    for (const cl of counselLogs) {
      out += `INSERT INTO \`student_counseling_logs\` (\`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`date\`, \`topic\`, \`action_plan\`, \`result\`, \`bk_feedback\`, \`bk_feedback_at\`, \`created_at\`) VALUES (${sqlEscape(cl.id)}, ${sqlEscape(cl.studentId)}, ${sqlEscape(cl.studentName)}, ${sqlEscape(cl.className)}, ${sqlEscape(cl.date)}, ${sqlEscape(cl.topic)}, ${sqlEscape(cl.actionPlan)}, ${sqlEscape(cl.result)}, ${sqlEscape(cl.bkFeedback)}, ${sqlEscape(cl.bkFeedbackAt)}, ${sqlEscape(cl.createdAt)}) ON DUPLICATE KEY UPDATE \`result\`=VALUES(\`result\`);\n`;
    }
  }

  // 16. Class Announcements & Meetings
  const announcements = snapshot.classAnnouncements || [];
  counts['classAnnouncements'] = announcements.length;
  if (announcements.length > 0) {
    out += `\n-- Data Pengumuman Kelas (${announcements.length} baris)\n`;
    for (const ca of announcements) {
      out += `INSERT INTO \`class_announcements\` (\`id\`, \`class_name\`, \`title\`, \`content\`, \`date\`, \`target_recipient\`, \`confirmation_status\`, \`created_at\`) VALUES (${sqlEscape(ca.id)}, ${sqlEscape(ca.className)}, ${sqlEscape(ca.title)}, ${sqlEscape(ca.content)}, ${sqlEscape(ca.date)}, ${sqlEscape(ca.targetRecipient)}, ${sqlEscape(ca.confirmationStatus)}, ${sqlEscape(ca.createdAt)}) ON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`);\n`;
    }
  }

  const meetings = snapshot.classMeetingLogs || [];
  counts['classMeetingLogs'] = meetings.length;
  if (meetings.length > 0) {
    out += `\n-- Data Notulen Rapat Kelas (${meetings.length} baris)\n`;
    for (const cm of meetings) {
      out += `INSERT INTO \`class_meeting_logs\` (\`id\`, \`class_name\`, \`meeting_type\`, \`date\`, \`attendees\`, \`agenda\`, \`follow_up\`, \`created_at\`) VALUES (${sqlEscape(cm.id)}, ${sqlEscape(cm.className)}, ${sqlEscape(cm.meetingType)}, ${sqlEscape(cm.date)}, ${sqlEscape(cm.attendees)}, ${sqlEscape(cm.agenda)}, ${sqlEscape(cm.followUp)}, ${sqlEscape(cm.createdAt)}) ON DUPLICATE KEY UPDATE \`agenda\`=VALUES(\`agenda\`);\n`;
    }
  }

  // 17. Principal Programs & Evaluations
  const programs = snapshot.principalWorkPrograms || [];
  counts['principalWorkPrograms'] = programs.length;
  if (programs.length > 0) {
    out += `\n-- Data Program Kerja Kepala Sekolah (${programs.length} baris)\n`;
    for (const p of programs) {
      out += `INSERT INTO \`principal_work_programs\` (\`id\`, \`title\`, \`description\`, \`target_date\`, \`status\`, \`sync_with_staff\`, \`created_at\`) VALUES (${sqlEscape(p.id)}, ${sqlEscape(p.title)}, ${sqlEscape(p.description)}, ${sqlEscape(p.targetDate)}, ${sqlEscape(p.status)}, ${sqlEscape(p.syncWithStaff ? 1 : 0)}, ${sqlEscape(p.createdAt)}) ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`);\n`;
    }
  }

  const evaluations = snapshot.teacherEvaluations || [];
  counts['teacherEvaluations'] = evaluations.length;
  if (evaluations.length > 0) {
    out += `\n-- Data Evaluasi Kinerja Guru (${evaluations.length} baris)\n`;
    for (const ev of evaluations) {
      out += `INSERT INTO \`teacher_evaluations\` (\`id\`, \`teacher_type\`, \`teacher_id\`, \`teacher_name\`, \`evaluator_name\`, \`date\`, \`academic_year\`, \`pedagogic_score\`, \`professional_score\`, \`personal_score\`, \`social_score\`, \`notes\`, \`created_at\`) VALUES (${sqlEscape(ev.id)}, ${sqlEscape(ev.teacherType)}, ${sqlEscape(ev.teacherId)}, ${sqlEscape(ev.teacherName)}, ${sqlEscape(ev.evaluatorName)}, ${sqlEscape(ev.date)}, ${sqlEscape(ev.academicYear)}, ${sqlEscape(ev.pedagogicScore || 0)}, ${sqlEscape(ev.professionalScore || 0)}, ${sqlEscape(ev.personalScore || 0)}, ${sqlEscape(ev.socialScore || 0)}, ${sqlEscape(ev.notes)}, ${sqlEscape(ev.createdAt)}) ON DUPLICATE KEY UPDATE \`notes\`=VALUES(\`notes\`);\n`;
    }
  }

  // 18. Sarpras (Items, Proposals, Loans)
  const sarprasItems = snapshot.sarprasItems || [];
  counts['sarprasItems'] = sarprasItems.length;
  if (sarprasItems.length > 0) {
    out += `\n-- Data Inventaris Sarana & Prasarana (${sarprasItems.length} baris)\n`;
    for (const si of sarprasItems) {
      out += `INSERT INTO \`sarpras_items\` (\`id\`, \`name\`, \`code\`, \`category\`, \`condition_status\`, \`location\`, \`total_qty\`, \`available_qty\`, \`price\`, \`purchase_year\`) VALUES (${sqlEscape(si.id)}, ${sqlEscape(si.name)}, ${sqlEscape(si.code)}, ${sqlEscape(si.category)}, ${sqlEscape(si.condition || 'Baik')}, ${sqlEscape(si.location)}, ${sqlEscape(si.totalQty || 0)}, ${sqlEscape(si.availableQty || 0)}, ${sqlEscape(si.price)}, ${sqlEscape(si.purchaseYear)}) ON DUPLICATE KEY UPDATE \`available_qty\`=VALUES(\`available_qty\`);\n`;
    }
  }

  const sarprasProposals = snapshot.sarprasProposals || [];
  counts['sarprasProposals'] = sarprasProposals.length;
  if (sarprasProposals.length > 0) {
    out += `\n-- Data Pengajuan Pengadaan Sarpras (${sarprasProposals.length} baris)\n`;
    for (const sp of sarprasProposals) {
      out += `INSERT INTO \`sarpras_proposals\` (\`id\`, \`item_name\`, \`qty\`, \`estimated_price\`, \`total_price\`, \`proposed_by\`, \`date\`, \`reason\`, \`status\`, \`notes\`, \`image_url\`, \`created_at\`) VALUES (${sqlEscape(sp.id)}, ${sqlEscape(sp.itemName)}, ${sqlEscape(sp.qty || 1)}, ${sqlEscape(sp.estimatedPrice || 0)}, ${sqlEscape(sp.totalPrice || 0)}, ${sqlEscape(sp.proposedBy)}, ${sqlEscape(sp.date)}, ${sqlEscape(sp.reason)}, ${sqlEscape(sp.status || 'pending')}, ${sqlEscape(sp.notes)}, ${sqlEscape(sp.imageUrl)}, ${sqlEscape(sp.createdAt)}) ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`);\n`;
    }
  }

  const sarprasLoans = snapshot.sarprasLoans || [];
  counts['sarprasLoans'] = sarprasLoans.length;
  if (sarprasLoans.length > 0) {
    out += `\n-- Data Peminjaman Sarpras (${sarprasLoans.length} baris)\n`;
    for (const sl of sarprasLoans) {
      out += `INSERT INTO \`sarpras_loans\` (\`id\`, \`item_id\`, \`item_name\`, \`borrower_id\`, \`borrower_name\`, \`qty\`, \`loan_date\`, \`return_date\`, \`status\`, \`notes\`) VALUES (${sqlEscape(sl.id)}, ${sqlEscape(sl.itemId)}, ${sqlEscape(sl.itemName)}, ${sqlEscape(sl.borrowerId)}, ${sqlEscape(sl.borrowerName)}, ${sqlEscape(sl.qty || 1)}, ${sqlEscape(sl.loanDate)}, ${sqlEscape(sl.returnDate)}, ${sqlEscape(sl.status || 'dipinjam')}, ${sqlEscape(sl.notes)}) ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`);\n`;
    }
  }

  // 19. SPMB Candidates (Penerimaan Murid Baru)
  const spmbCandidates = snapshot.spmbCandidates || [];
  counts['spmbCandidates'] = spmbCandidates.length;
  if (spmbCandidates.length > 0) {
    out += `\n-- Data Calon Siswa Baru / SPMB (${spmbCandidates.length} baris)\n`;
    for (const c of spmbCandidates) {
      out += `INSERT INTO \`spmb_candidates\` (\`id\`, \`registration_no\`, \`nisn\`, \`nik\`, \`full_name\`, \`gender\`, \`birth_place\`, \`birth_date\`, \`phone\`, \`school_origin_type\`, \`school_origin\`, \`registration_type\`, \`session_id\`, \`created_at\`, \`original_session_id\`, \`previous_session_id\`, \`is_transferred_session\`, \`transferred_at\`, \`transfer_reason\`, \`transfer_history\`, \`token_payment_status\`, \`token_payment_order_id\`, \`token_paid_at\`, \`token_payment_method\`, \`token_amount\`, \`collective_refund_status\`, \`collective_refund_amount\`, \`collective_refunded_at\`, \`collective_refunded_by\`, \`collective_refund_recipient\`, \`collective_refund_note\`, \`collective_refund_receipt_no\`, \`is_form_completed\`, \`form_completed_at\`, \`nickname\`, \`kk_number\`, \`birth_cert_number\`, \`religion\`, \`address\`, \`dusun\`, \`rt\`, \`rw\`, \`village\`, \`district\`, \`city\`, \`postal_code\`, \`living_with\`, \`child_order\`, \`siblings_count\`, \`step_siblings_count\`, \`transportation\`, \`special_needs\`, \`height\`, \`weight\`, \`distance_to_school\`, \`travel_time\`, \`father_name\`, \`father_nik\`, \`father_birth_place\`, \`father_birth_date\`, \`father_education\`, \`father_occupation\`, \`father_income\`, \`father_phone\`, \`father_status\`, \`father_address\`, \`mother_name\`, \`mother_nik\`, \`mother_birth_place\`, \`mother_birth_date\`, \`mother_education\`, \`mother_occupation\`, \`mother_income\`, \`mother_phone\`, \`mother_status\`, \`mother_address\`, \`guardian_name\`, \`guardian_nik\`, \`guardian_birth_place\`, \`guardian_birth_date\`, \`guardian_education\`, \`guardian_occupation\`, \`guardian_income\`, \`guardian_phone\`, \`guardian_status\`, \`guardian_address\`, \`guardian_relationship\`, \`guardian_is_same_as_father\`, \`re_registration_paid_at\`, \`re_registration_method\`, \`re_registration_order_id\`, \`re_registration_status\`, \`building_fee_paid\`, \`july_spp_paid\`, \`uniform_fee_paid\`, \`total_re_registration_paid\`, \`uniform_orders\`) VALUES (${sqlEscape(c.id)}, ${sqlEscape(c.registrationNo)}, ${sqlEscape(c.nisn)}, ${sqlEscape(c.nik)}, ${sqlEscape(c.fullName)}, ${sqlEscape(c.gender)}, ${sqlEscape(c.birthPlace)}, ${sqlEscape(c.birthDate)}, ${sqlEscape(c.phone)}, ${sqlEscape(c.schoolOriginType || 'other')}, ${sqlEscape(c.schoolOrigin)}, ${sqlEscape(c.registrationType || 'online_individual')}, ${sqlEscape(c.sessionId)}, ${sqlEscape(c.createdAt)}, ${sqlEscape(c.originalSessionId)}, ${sqlEscape(c.previousSessionId)}, ${sqlEscape(c.isTransferredSession ? 1 : 0)}, ${sqlEscape(c.transferredAt)}, ${sqlEscape(c.transferReason)}, ${sqlEscape(c.transferHistory)}, ${sqlEscape(c.tokenPaymentStatus || 'unpaid')}, ${sqlEscape(c.tokenPaymentOrderId)}, ${sqlEscape(c.tokenPaidAt)}, ${sqlEscape(c.tokenPaymentMethod)}, ${sqlEscape(c.tokenAmount)}, ${sqlEscape(c.collectiveRefundStatus || 'none')}, ${sqlEscape(c.collectiveRefundAmount)}, ${sqlEscape(c.collectiveRefundedAt)}, ${sqlEscape(c.collectiveRefundedBy)}, ${sqlEscape(c.collectiveRefundRecipient)}, ${sqlEscape(c.collectiveRefundNote)}, ${sqlEscape(c.collectiveRefundReceiptNo)}, ${sqlEscape(c.isFormCompleted ? 1 : 0)}, ${sqlEscape(c.formCompletedAt)}, ${sqlEscape(c.nickname)}, ${sqlEscape(c.kkNumber)}, ${sqlEscape(c.birthCertNumber)}, ${sqlEscape(c.religion)}, ${sqlEscape(c.address)}, ${sqlEscape(c.dusun)}, ${sqlEscape(c.rt)}, ${sqlEscape(c.rw)}, ${sqlEscape(c.village)}, ${sqlEscape(c.district)}, ${sqlEscape(c.city)}, ${sqlEscape(c.postalCode)}, ${sqlEscape(c.livingWith)}, ${sqlEscape(c.childOrder)}, ${sqlEscape(c.siblingsCount)}, ${sqlEscape(c.stepSiblingsCount)}, ${sqlEscape(c.transportation)}, ${sqlEscape(c.specialNeeds)}, ${sqlEscape(c.height)}, ${sqlEscape(c.weight)}, ${sqlEscape(c.distanceToSchool)}, ${sqlEscape(c.travelTime)}, ${sqlEscape(c.fatherName)}, ${sqlEscape(c.fatherNik)}, ${sqlEscape(c.fatherBirthPlace)}, ${sqlEscape(c.fatherBirthDate)}, ${sqlEscape(c.fatherEducation)}, ${sqlEscape(c.fatherOccupation)}, ${sqlEscape(c.fatherIncome)}, ${sqlEscape(c.fatherPhone)}, ${sqlEscape(c.fatherStatus)}, ${sqlEscape(c.fatherAddress)}, ${sqlEscape(c.motherName)}, ${sqlEscape(c.motherNik)}, ${sqlEscape(c.motherBirthPlace)}, ${sqlEscape(c.motherBirthDate)}, ${sqlEscape(c.motherEducation)}, ${sqlEscape(c.motherOccupation)}, ${sqlEscape(c.motherIncome)}, ${sqlEscape(c.motherPhone)}, ${sqlEscape(c.motherStatus)}, ${sqlEscape(c.motherAddress)}, ${sqlEscape(c.guardianName)}, ${sqlEscape(c.guardianNik)}, ${sqlEscape(c.guardianBirthPlace)}, ${sqlEscape(c.guardianBirthDate)}, ${sqlEscape(c.guardianEducation)}, ${sqlEscape(c.guardianOccupation)}, ${sqlEscape(c.guardianIncome)}, ${sqlEscape(c.guardianPhone)}, ${sqlEscape(c.guardianStatus)}, ${sqlEscape(c.guardianAddress)}, ${sqlEscape(c.guardianRelationship)}, ${sqlEscape(c.guardianIsSameAsFather ? 1 : 0)}, ${sqlEscape(c.reRegistrationPaidAt)}, ${sqlEscape(c.reRegistrationMethod)}, ${sqlEscape(c.reRegistrationOrderId)}, ${sqlEscape(c.reRegistrationStatus || 'unpaid')}, ${sqlEscape(c.buildingFeePaid || 0)}, ${sqlEscape(c.julySppPaid || 0)}, ${sqlEscape(c.uniformFeePaid || 0)}, ${sqlEscape(c.totalReRegistrationPaid || 0)}, ${sqlEscape(c.uniformOrders)}) ON DUPLICATE KEY UPDATE \`full_name\`=VALUES(\`full_name\`), \`session_id\`=VALUES(\`session_id\`);\n`;
    }
  }

  // 20. Midtrans Transactions
  const midtrans = snapshot.midtransTransactions || [];
  counts['midtransTransactions'] = midtrans.length;
  if (midtrans.length > 0) {
    out += `\n-- Data Transaksi Midtrans / Payment Gateway (${midtrans.length} baris)\n`;
    for (const md of midtrans) {
      out += `INSERT INTO \`midtrans_transactions\` (\`id\`, \`order_id\`, \`transaction_id\`, \`student_id\`, \`student_name\`, \`student_nis\`, \`nisn\`, \`bill_type\`, \`description\`, \`gross_amount\`, \`payment_type\`, \`transaction_status\`, \`fraud_status\`, \`settlement_time\`, \`transaction_time\`, \`created_at\`, \`updated_at\`, \`snap_token\`, \`raw_response\`) VALUES (${sqlEscape(md.id)}, ${sqlEscape(md.orderId)}, ${sqlEscape(md.transactionId)}, ${sqlEscape(md.studentId)}, ${sqlEscape(md.studentName)}, ${sqlEscape(md.studentNis)}, ${sqlEscape(md.nisn)}, ${sqlEscape(md.billType)}, ${sqlEscape(md.description)}, ${sqlEscape(md.grossAmount || 0)}, ${sqlEscape(md.paymentType)}, ${sqlEscape(md.transactionStatus)}, ${sqlEscape(md.fraudStatus)}, ${sqlEscape(md.settlementTime)}, ${sqlEscape(md.transactionTime)}, ${sqlEscape(md.createdAt)}, ${sqlEscape(md.updatedAt)}, ${sqlEscape(md.snapToken)}, ${sqlEscape(md.rawResponse)}) ON DUPLICATE KEY UPDATE \`transaction_status\`=VALUES(\`transaction_status\`);\n`;
    }
  }

  // 21. Realtime Notifications
  const notifs = snapshot.notifications || [];
  counts['notifications'] = notifs.length;
  if (notifs.length > 0) {
    out += `\n-- Data Notifikasi Realtime (${notifs.length} baris)\n`;
    for (const n of notifs) {
      out += `INSERT INTO \`notifications\` (\`id\`, \`student_id\`, \`title\`, \`message\`, \`type\`, \`category\`, \`created_at\`) VALUES (${sqlEscape(n.id)}, ${sqlEscape(n.studentId)}, ${sqlEscape(n.title)}, ${sqlEscape(n.message)}, ${sqlEscape(n.type || 'info')}, ${sqlEscape(n.category || 'admin')}, ${sqlEscape(n.createdAt)}) ON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`);\n`;
    }
  }

  // 22. System Application Configs & Master Data
  const configKeys = [
    'schoolIdentity', 'sppRates', 'salaryConfig', 'midtransConfig',
    'whatsappConfig', 'treasurerConfig', 'principalConfig', 'sarprasConfig',
    'bkConfig', 'curriculumConfig', 'adminConfig', 'spmbConfig'
  ];

  out += `\n-- Data Konfigurasi Master & Pengaturan Aplikasi\n`;
  for (const key of configKeys) {
    if (snapshot[key]) {
      out += `INSERT INTO \`app_configs\` (\`id\`, \`data\`) VALUES (${sqlEscape(key)}, ${sqlEscape(snapshot[key])}) ON DUPLICATE KEY UPDATE \`data\`=VALUES(\`data\`);\n`;
    }
  }

  out += `
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- ==========================================================
-- SINKRONISASI SELESAI: Seluruh tabel dan data siap digunakan di phpMyAdmin!
-- ==========================================================
`;

  return out;
}

// Synchronize all application data into MySQL database
export async function syncDataToMysql(appState: any): Promise<MysqlSyncResult> {
  const startTime = Date.now();
  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();

    // 1. Create tables if not existing
    const statements = COMPLETE_TABLES_SQL.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await connection.query(stmt);
    }

    let studentsSynced = 0;
    let transactionsSynced = 0;
    let sppSynced = 0;
    let salariesSynced = 0;
    let savingsSynced = 0;
    let miscSynced = 0;

    // 2. Sync Students
    if (appState.students && appState.students.length > 0) {
      for (const s of appState.students) {
        await connection.query(`
          INSERT INTO \`students\` (\`id\`, \`nis\`, \`nisn\`, \`name\`, \`class\`, \`gender\`, \`email\`, \`phone\`, \`savings_balance\`, \`status\`, \`password\`, \`nik\`, \`address\`, \`parent_name\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`class\` = VALUES(\`class\`),
            \`savings_balance\` = VALUES(\`savings_balance\`),
            \`status\` = VALUES(\`status\`),
            \`phone\` = VALUES(\`phone\`),
            \`address\` = VALUES(\`address\`)
        `, [
          s.id,
          s.nis || '',
          s.nisn || null,
          s.name || 'Siswa',
          s.class || '7-A',
          s.gender || 'Laki-laki',
          s.email || null,
          s.phone || null,
          Number(s.savingsBalance) || 0,
          s.status || 'Aktif',
          s.password || null,
          s.nik || null,
          s.address || null,
          s.parentName || null
        ]);
        studentsSynced++;
      }
    }

    // 3. Sync Treasurer Transactions (Buku Kas)
    if (appState.transactions && appState.transactions.length > 0) {
      for (const t of appState.transactions) {
        await connection.query(`
          INSERT INTO \`treasurer_transactions\` 
          (\`id\`, \`type\`, \`category\`, \`amount\`, \`description\`, \`date\`, \`source\`, \`created_by\`, \`recipient_name\`, \`funding_source\`, \`kode_rekening\`, \`no_bukti\`, \`payment_method\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\` = VALUES(\`amount\`),
            \`category\` = VALUES(\`category\`),
            \`description\` = VALUES(\`description\`),
            \`date\` = VALUES(\`date\`),
            \`payment_method\` = VALUES(\`payment_method\`),
            \`recipient_name\` = VALUES(\`recipient_name\`),
            \`funding_source\` = VALUES(\`funding_source\`),
            \`kode_rekening\` = VALUES(\`kode_rekening\`),
            \`no_bukti\` = VALUES(\`no_bukti\`)
        `, [
          t.id,
          t.type,
          t.category || 'Operasional',
          Number(t.amount) || 0,
          t.description || '',
          t.date || new Date().toISOString().substring(0, 10),
          t.source || 'custom',
          t.createdBy || 'Bendahara',
          t.recipientName || null,
          t.fundingSource || null,
          t.kodeRekening || null,
          t.noBukti || null,
          t.paymentMethod === 'bank' ? 'bank' : 'kas'
        ]);
        transactionsSynced++;
      }
    }

    // 4. Sync SPP Bills
    if (appState.sppBills && appState.sppBills.length > 0) {
      for (const bill of appState.sppBills) {
        await connection.query(`
          INSERT INTO \`spp_bills\` (\`id\`, \`student_id\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paid_at\`, \`payment_method\`, \`order_id\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\` = VALUES(\`amount\`),
            \`status\` = VALUES(\`status\`),
            \`paid_at\` = VALUES(\`paid_at\`),
            \`payment_method\` = VALUES(\`payment_method\`),
            \`order_id\` = VALUES(\`order_id\`)
        `, [
          bill.id,
          bill.studentId,
          bill.month,
          bill.year || 2026,
          Number(bill.amount) || 0,
          bill.status || 'unpaid',
          bill.paidAt || null,
          bill.paymentMethod || null,
          bill.orderId || null
        ]);
        sppSynced++;
      }
    }

    // 5. Sync Teacher Salaries
    if (appState.salaries && appState.salaries.length > 0) {
      for (const sal of appState.salaries) {
        await connection.query(`
          INSERT INTO \`teacher_salaries\`
          (\`id\`, \`teacher_id\`, \`teacher_name\`, \`teacher_type\`, \`month\`, \`base_salary\`, \`homeroom_allowance\`, \`journal_count\`, \`journal_incentive\`, \`tunjangan_masa_kerja\`, \`vakasi\`, \`other_allowance\`, \`potongan_dana_sosial\`, \`potongan_absen\`, \`potongan_lain\`, \`deductions\`, \`total_amount\`, \`status\`, \`payment_date\`, \`notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`base_salary\` = VALUES(\`base_salary\`),
            \`homeroom_allowance\` = VALUES(\`homeroom_allowance\`),
            \`journal_count\` = VALUES(\`journal_count\`),
            \`journal_incentive\` = VALUES(\`journal_incentive\`),
            \`tunjangan_masa_kerja\` = VALUES(\`tunjangan_masa_kerja\`),
            \`vakasi\` = VALUES(\`vakasi\`),
            \`other_allowance\` = VALUES(\`other_allowance\`),
            \`potongan_dana_sosial\` = VALUES(\`potongan_dana_sosial\`),
            \`potongan_absen\` = VALUES(\`potongan_absen\`),
            \`potongan_lain\` = VALUES(\`potongan_lain\`),
            \`deductions\` = VALUES(\`deductions\`),
            \`total_amount\` = VALUES(\`total_amount\`),
            \`status\` = VALUES(\`status\`),
            \`payment_date\` = VALUES(\`payment_date\`),
            \`notes\` = VALUES(\`notes\`)
        `, [
          sal.id,
          sal.teacherId,
          sal.teacherName,
          sal.teacherType,
          sal.month,
          sal.baseSalary || 0,
          sal.homeroomAllowance || 0,
          sal.journalCount || 0,
          ((sal.journalCount || 0) * (sal.journalRate || 0)),
          sal.tunjanganMasaKerja || 0,
          sal.vakasi || 0,
          sal.otherAllowance || 0,
          sal.potonganDanaSosial || 0,
          sal.potonganAbsen || 0,
          sal.potonganLain || 0,
          sal.deductions || 0,
          sal.totalAmount || 0,
          sal.status || 'unpaid',
          sal.paymentDate || null,
          sal.notes || null
        ]);
        salariesSynced++;
      }
    }

    // 6. Sync Savings Transactions
    if (appState.savings && appState.savings.length > 0) {
      for (const sav of appState.savings) {
        await connection.query(`
          INSERT INTO \`savings_transactions\` (\`id\`, \`student_id\`, \`type\`, \`amount\`, \`status\`, \`created_at\`)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\` = VALUES(\`amount\`),
            \`status\` = VALUES(\`status\`)
        `, [
          sav.id,
          sav.studentId,
          sav.type,
          Number(sav.amount) || 0,
          sav.status || 'success',
          sav.createdAt || new Date().toISOString()
        ]);
        savingsSynced++;
      }
    }

    // 7. Sync Misc Bills
    if (appState.miscBills && appState.miscBills.length > 0) {
      for (const m of appState.miscBills) {
        await connection.query(`
          INSERT INTO \`misc_bills\` (\`id\`, \`student_id\`, \`title\`, \`amount\`, \`status\`, \`paid_at\`, \`month\`, \`created_at\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\` = VALUES(\`amount\`),
            \`status\` = VALUES(\`status\`),
            \`paid_at\` = VALUES(\`paid_at\`)
        `, [
          m.id,
          m.studentId,
          m.title,
          Number(m.amount) || 0,
          m.status || 'unpaid',
          m.paidAt || null,
          m.month || null,
          m.createdAt || new Date().toISOString()
        ]);
        miscSynced++;
      }
    }

    const durationMs = Date.now() - startTime;
    const nowIso = new Date().toISOString();

    // Update config sync timestamp
    currentConfig.lastSyncAt = nowIso;
    currentConfig.status = 'connected';
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch {}

    return {
      success: true,
      message: `Sinkronisasi ke MySQL database "${currentConfig.database}" berhasil selesai dalam ${durationMs}ms!`,
      syncedAt: nowIso,
      stats: {
        students: studentsSynced,
        transactions: transactionsSynced,
        sppBills: sppSynced,
        salaries: salariesSynced,
        savings: savingsSynced,
        miscBills: miscSynced
      },
      durationMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal melakukan sinkronisasi data ke MySQL.',
      error: err.message || 'Kesalahan query MySQL',
      syncedAt: new Date().toISOString(),
      stats: {
        students: 0,
        transactions: 0,
        sppBills: 0,
        salaries: 0,
        savings: 0,
        miscBills: 0
      },
      durationMs: Date.now() - startTime
    };
  } finally {
    if (connection) connection.release();
    await pool.end().catch(() => {});
  }
}
