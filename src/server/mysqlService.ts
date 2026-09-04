import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { MysqlDatabaseConfig, MysqlTestResult, MysqlSyncResult } from '../types';

const CONFIG_FILE = path.join(process.cwd(), 'mysql_config.json');

// Default initial configuration based on Hostinger Remote MySQL
let currentConfig: MysqlDatabaseConfig = {
  host: process.env.MYSQL_HOST || 'srv1393.hstgr.io',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  database: process.env.MYSQL_DATABASE || 'u604170242_spp_db',
  user: process.env.MYSQL_USER || 'u604170242_spp_user',
  password: process.env.MYSQL_PASSWORD || '',
  hasPassword: Boolean(process.env.MYSQL_PASSWORD),
  ssl: false,
  phpmyadminUrl: process.env.MYSQL_PHPMYADMIN_URL || 'https://portal.smpmaarifpdn.sch.id:8443',
  charset: 'utf8mb4',
  connectionLimit: 10,
  connectTimeout: 10000,
  autoSyncEnabled: false,
  autoSyncIntervalHours: 1, // Default: 1 Jam (bisa 1 s/d 24 Jam)
  autoSyncDirection: 'push',
  status: 'disconnected'
};

// Load saved configuration on startup
export function loadMysqlConfig(): MysqlDatabaseConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const interval = Math.min(24, Math.max(1, Number(parsed.autoSyncIntervalHours) || 1));
      currentConfig = {
        ...currentConfig,
        ...parsed,
        autoSyncIntervalHours: interval,
        hasPassword: Boolean(parsed.password && parsed.password.length > 0)
      };
    }

    // Environment variables take precedence if explicitly provided
    if (process.env.MYSQL_HOST) currentConfig.host = process.env.MYSQL_HOST;
    if (process.env.MYSQL_PORT) currentConfig.port = parseInt(process.env.MYSQL_PORT, 10);
    if (process.env.MYSQL_DATABASE) currentConfig.database = process.env.MYSQL_DATABASE;
    if (process.env.MYSQL_USER) currentConfig.user = process.env.MYSQL_USER;
    if (process.env.MYSQL_PASSWORD !== undefined) {
      currentConfig.password = process.env.MYSQL_PASSWORD;
      currentConfig.hasPassword = Boolean(process.env.MYSQL_PASSWORD.length > 0);
    }
    if (process.env.MYSQL_PHPMYADMIN_URL) currentConfig.phpmyadminUrl = process.env.MYSQL_PHPMYADMIN_URL;
    if (process.env.MYSQL_PRIMARY === 'true' || process.env.MYSQL_AUTO_SYNC === 'true') {
      currentConfig.autoSyncEnabled = true;
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

  const intervalHours = newConfig.autoSyncIntervalHours !== undefined
    ? Math.min(24, Math.max(1, Math.round(Number(newConfig.autoSyncIntervalHours) || 1)))
    : (currentConfig.autoSyncIntervalHours || 1);

  const isEnabled = newConfig.autoSyncEnabled !== undefined 
    ? Boolean(newConfig.autoSyncEnabled) 
    : (currentConfig.autoSyncEnabled || false);

  let nextSyncAt = newConfig.nextAutoSyncAt !== undefined 
    ? newConfig.nextAutoSyncAt 
    : currentConfig.nextAutoSyncAt;

  if (isEnabled) {
    // If enabling or interval changed or nextAutoSyncAt was empty/past, calculate next schedule
    if (!nextSyncAt || (currentConfig.autoSyncIntervalHours !== intervalHours) || (!currentConfig.autoSyncEnabled && isEnabled)) {
      nextSyncAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();
    }
  } else {
    nextSyncAt = undefined;
  }

  currentConfig = {
    ...currentConfig,
    ...newConfig,
    port: Number(newConfig.port) || 3306,
    password,
    hasPassword: Boolean(password && password.length > 0),
    autoSyncEnabled: isEnabled,
    autoSyncIntervalHours: intervalHours,
    nextAutoSyncAt: nextSyncAt
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menulis file konfigurasi MySQL:', err);
  }

  // Reset any cached pool when configuration changes so the new parameters are used
  closeSharedPool();

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
    connectionLimit: currentConfig.connectionLimit || 4,
    connectTimeout: currentConfig.connectTimeout || 8000,
    autoSyncEnabled: currentConfig.autoSyncEnabled || false,
    autoSyncIntervalHours: currentConfig.autoSyncIntervalHours || 1,
    autoSyncDirection: currentConfig.autoSyncDirection || 'push',
    nextAutoSyncAt: currentConfig.nextAutoSyncAt,
    lastAutoSyncAt: currentConfig.lastAutoSyncAt,
    lastAutoSyncStatus: currentConfig.lastAutoSyncStatus,
    lastAutoSyncMessage: currentConfig.lastAutoSyncMessage,
    lastConnectedAt: currentConfig.lastConnectedAt,
    lastSyncAt: currentConfig.lastSyncAt,
    status: currentConfig.status || 'unconfigured'
  };
}

// ==========================================================
// PERSISTENT CONNECTION POOLING ENGINE
// Preserves sockets across queries to avoid exceeding hosting limits (e.g., max_connections_per_hour = 500)
// ==========================================================
let sharedPool: mysql.Pool | null = null;
let sharedPoolKey = '';

export function getSharedPool(overrideConfig?: Partial<MysqlDatabaseConfig>): mysql.Pool {
  const cfg = {
    ...currentConfig,
    ...overrideConfig
  };

  const key = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.database}:${cfg.password || ''}:${cfg.ssl ? '1' : '0'}`;

  if (!sharedPool || sharedPoolKey !== key) {
    if (sharedPool) {
      sharedPool.end().catch(() => {});
    }
    sharedPoolKey = key;
    sharedPool = mysql.createPool({
      host: cfg.host,
      port: Number(cfg.port) || 3306,
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database,
      waitForConnections: true,
      // Keep low connection limit for shared hosting (Hostinger / cPanel)
      connectionLimit: 4,
      maxIdle: 2,
      idleTimeout: 300000, // 5 minutes idle socket reuse
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: cfg.connectTimeout || 10000,
      charset: cfg.charset || 'utf8mb4',
      multipleStatements: true,
      ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined
    });
  }

  return sharedPool;
}

export function closeSharedPool(): void {
  if (sharedPool) {
    sharedPool.end().catch(() => {});
    sharedPool = null;
    sharedPoolKey = '';
  }
}

// Backward-compatibility wrapper for pool creation
function createPool(overrideConfig?: Partial<MysqlDatabaseConfig>) {
  return getSharedPool(overrideConfig);
}

// Save or update an individual configuration into the app_configs MySQL table
export async function saveConfigToMysql(configId: string, data: any, overrideConfig?: Partial<MysqlDatabaseConfig>): Promise<boolean> {
  const pool = getSharedPool(overrideConfig);
  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`app_configs\` (
        \`id\` VARCHAR(64) NOT NULL,
        \`data\` LONGTEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    await connection.query(`
      INSERT INTO \`app_configs\` (\`id\`, \`data\`)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`)
    `, [configId, jsonStr]);
    return true;
  } catch (err: any) {
    console.warn(`[MySQL Config Sync] Gagal menyimpan config "${configId}" ke MySQL:`, err.message || err);
    return false;
  } finally {
    if (connection) connection.release();
    // Do NOT end pool here - persistent connection pooling reuses the connection!
  }
}

// Save or update multiple configurations into the app_configs MySQL table in a SINGLE query
export async function saveConfigsBatchToMysql(configs: { id: string; data: any }[], overrideConfig?: Partial<MysqlDatabaseConfig>): Promise<boolean> {
  if (!Array.isArray(configs) || configs.length === 0) return true;
  const pool = getSharedPool(overrideConfig);
  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`app_configs\` (
        \`id\` VARCHAR(64) NOT NULL,
        \`data\` LONGTEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const values = configs.map(c => [c.id, typeof c.data === 'string' ? c.data : JSON.stringify(c.data)]);
    await connection.query(`
      INSERT INTO \`app_configs\` (\`id\`, \`data\`)
      VALUES ?
      ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`)
    `, [values]);
    return true;
  } catch (err: any) {
    console.warn(`[MySQL Config Batch Sync] Gagal menyimpan batch configs ke MySQL:`, err.message || err);
    return false;
  } finally {
    if (connection) connection.release();
    // Do NOT end pool here - reuse connection
  }
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
  const pool = getSharedPool(cfgToUse);

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

    if (code === 'ER_USER_LIMIT_REACHED' || errMessage.includes('max_connections_per_hour')) {
      hint = `Batas koneksi per jam MySQL pada hosting Hostinger/cPanel telah tercapai (max_connections_per_hour = 500).\n\nSOLUSI CEPAT:\n1. Buat MySQL User baru di Hostinger hPanel (misal: ${cfgToUse.user}_2) dan berikan All Privileges ke database "${cfgToUse.database}", lalu ubah nama User di form ini agar langsung aktif tanpa menunggu!\n2. ATAU tunggu sekitar 30–60 menit hingga server hosting mereset hitungan kuota jamannya.\n\nSistem saat ini telah dioptimalkan dengan Persistent Connection Pooling (Connection Reuse) sehingga ke depannya tidak akan lagi memboroskan koneksi.`;
    } else if (code === 'ECONNREFUSED') {
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
    // Do NOT end pool here - persistent connection pooling reuses the connection!
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

    // 1. Generate full PHPMyAdmin-compatible SQL script covering all 26+ tables & all app_configs
    const fullSql = generateFullPhpMyAdminSql(appState);

    // 2. Execute the entire SQL script (with multi-statements enabled)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query(fullSql);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    const durationMs = Date.now() - startTime;
    const nowIso = new Date().toISOString();

    const studentsSynced = Array.isArray(appState.students) ? appState.students.length : 0;
    const transactionsSynced = Array.isArray(appState.transactions || appState.treasurerTransactions) ? (appState.transactions || appState.treasurerTransactions).length : 0;
    const sppSynced = Array.isArray(appState.sppBills) ? appState.sppBills.length : 0;
    const salariesSynced = Array.isArray(appState.salaries || appState.teacherSalaries) ? (appState.salaries || appState.teacherSalaries).length : 0;
    const savingsSynced = Array.isArray(appState.savings || appState.savingsTransactions) ? (appState.savings || appState.savingsTransactions).length : 0;
    const miscSynced = Array.isArray(appState.miscBills) ? appState.miscBills.length : 0;

    const configKeys = [
      'schoolIdentity', 'sppRates', 'salaryConfig', 'midtransConfig',
      'whatsappConfig', 'treasurerConfig', 'principalConfig', 'sarprasConfig',
      'bkConfig', 'curriculumConfig', 'adminConfig', 'spmbConfig', 'backupConfig'
    ];
    const configsSynced = configKeys.filter(k => appState[k] !== undefined).length;
    const totalRows = studentsSynced + transactionsSynced + sppSynced + salariesSynced + savingsSynced + miscSynced + configsSynced;

    // Update config sync timestamp and calculate next schedule if auto-sync is enabled
    currentConfig.lastSyncAt = nowIso;
    currentConfig.lastAutoSyncAt = nowIso;
    currentConfig.lastAutoSyncStatus = 'success';
    currentConfig.lastAutoSyncMessage = `Berhasil menyinkronkan ${totalRows} baris data & konfigurasi lengkap`;
    currentConfig.status = 'connected';
    if (currentConfig.autoSyncEnabled) {
      const interval = currentConfig.autoSyncIntervalHours || 1;
      currentConfig.nextAutoSyncAt = new Date(Date.now() + interval * 60 * 60 * 1000).toISOString();
    }
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch {}

    return {
      success: true,
      message: `Sinkronisasi lengkap (26+ tabel & konfigurasi master) ke MySQL database "${currentConfig.database}" berhasil selesai dalam ${durationMs}ms!`,
      syncedAt: nowIso,
      stats: {
        students: studentsSynced,
        transactions: transactionsSynced,
        sppBills: sppSynced,
        salaries: salariesSynced,
        savings: savingsSynced,
        miscBills: miscSynced,
        configs: configsSynced,
        totalRows
      },
      durationMs
    };
  } catch (err: any) {
    console.error('[MySQL Sync Error]:', err);
    currentConfig.lastAutoSyncStatus = 'error';
    currentConfig.lastAutoSyncMessage = err.message || 'Gagal query sinkronisasi';
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch {}

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
        miscBills: 0,
        configs: 0
      },
      durationMs: Date.now() - startTime
    };
  } finally {
    if (connection) connection.release();
  }
}

// Pull / Import all live data from MySQL database into application state
export async function pullDataFromMysql(): Promise<{
  success: boolean;
  message: string;
  data?: any;
  counts?: Record<string, number>;
  error?: string;
  durationMs?: number;
}> {
  const startTime = Date.now();
  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();

    // Check existing tables
    const [tableRows]: any = await connection.query('SHOW TABLES');
    const existingTables: string[] = tableRows.map((r: any) => Object.values(r)[0] as string);

    const hasTable = (name: string) => existingTables.includes(name);

    const resultData: any = {};
    const counts: Record<string, number> = {};

    // 1. Students
    if (hasTable('students')) {
      const [rows]: any = await connection.query('SELECT * FROM `students`');
      resultData.students = rows.map((r: any) => ({
        id: r.id,
        nis: r.nis || '',
        nisn: r.nisn || undefined,
        name: r.name,
        class: r.class,
        gender: r.gender || 'Laki-laki',
        email: r.email || undefined,
        phone: r.phone || undefined,
        savingsBalance: Number(r.savings_balance) || 0,
        status: r.status || 'Aktif',
        password: r.password || (r.nis ? String(r.nis).trim() : undefined),
        nickname: r.nickname || undefined,
        nik: r.nik || undefined,
        birthPlace: r.birth_place || undefined,
        birthDate: r.birth_date || undefined,
        kkNumber: r.kk_number || undefined,
        birthCertNumber: r.birth_cert_number || undefined,
        livingWith: r.living_with || undefined,
        childOrder: r.child_order || undefined,
        siblingsCount: r.siblings_count || undefined,
        stepSiblingsCount: r.step_siblings_count || undefined,
        address: r.address || undefined,
        photoUrl: r.photo_url || undefined,
        parentName: r.parent_name || undefined,
        googleDriveLink: r.google_drive_link || undefined,
        fatherName: r.father_name || undefined,
        fatherNik: r.father_nik || undefined,
        fatherBirthPlace: r.father_birth_place || undefined,
        fatherBirthDate: r.father_birth_date || undefined,
        fatherEducation: r.father_education || undefined,
        fatherOccupation: r.father_occupation || undefined,
        fatherIncome: r.father_income || undefined,
        fatherAddress: r.father_address || undefined,
        fatherPhone: r.father_phone || undefined,
        fatherStatus: r.father_status || undefined,
        motherName: r.mother_name || undefined,
        motherNik: r.mother_nik || undefined,
        motherBirthPlace: r.mother_birth_place || undefined,
        motherBirthDate: r.mother_birth_date || undefined,
        motherEducation: r.mother_education || undefined,
        motherOccupation: r.mother_occupation || undefined,
        motherIncome: r.mother_income || undefined,
        motherAddress: r.mother_address || undefined,
        motherPhone: r.mother_phone || undefined,
        motherStatus: r.mother_status || undefined,
        guardianName: r.guardian_name || undefined,
        guardianNik: r.guardian_nik || undefined,
        guardianBirthPlace: r.guardian_birth_place || undefined,
        guardianBirthDate: r.guardian_birth_date || undefined,
        guardianEducation: r.guardian_education || undefined,
        guardianOccupation: r.guardian_occupation || undefined,
        guardianIncome: r.guardian_income || undefined,
        guardianAddress: r.guardian_address || undefined,
        guardianPhone: r.guardian_phone || undefined,
        guardianStatus: r.guardian_status || undefined,
        isSppExempt: Boolean(r.is_spp_exempt),
        sppExemptionReason: r.spp_exemption_reason || undefined,
        sppExemptionType: r.spp_exemption_type || undefined,
        customSppRate: r.custom_spp_rate !== null ? Number(r.custom_spp_rate) : undefined,
        mutationDate: r.mutation_date || undefined,
        mutationReason: r.mutation_reason || undefined,
        mutationDestination: r.mutation_destination || undefined
      }));
      counts.students = resultData.students.length;
    }

    // 2. SPP Bills
    if (hasTable('spp_bills')) {
      const [rows]: any = await connection.query('SELECT * FROM `spp_bills`');
      resultData.sppBills = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        month: r.month,
        year: Number(r.year) || 2026,
        amount: Number(r.amount) || 0,
        status: r.status || 'unpaid',
        paidAt: r.paid_at || undefined,
        paymentMethod: r.payment_method || undefined,
        orderId: r.order_id || undefined,
        transactionId: r.transaction_id || undefined,
        achievementType: r.achievement_type || undefined,
        achievementDetail: r.achievement_detail || undefined
      }));
      counts.sppBills = resultData.sppBills.length;
    }

    // 3. Misc Bills
    if (hasTable('misc_bills')) {
      const [rows]: any = await connection.query('SELECT * FROM `misc_bills`');
      resultData.miscBills = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        title: r.title,
        amount: Number(r.amount) || 0,
        status: r.status || 'unpaid',
        createdAt: r.created_at || new Date().toISOString(),
        paidAt: r.paid_at || undefined,
        paymentMethod: r.payment_method || undefined,
        orderId: r.order_id || undefined,
        transactionId: r.transaction_id || undefined,
        isMonthly: Boolean(r.is_monthly),
        month: r.month || undefined
      }));
      counts.miscBills = resultData.miscBills.length;
    }

    // 4. Savings Transactions
    if (hasTable('savings_transactions')) {
      const [rows]: any = await connection.query('SELECT * FROM `savings_transactions`');
      resultData.savingsTransactions = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentNis: r.student_nis || undefined,
        type: r.type,
        amount: Number(r.amount) || 0,
        status: r.status || 'success',
        createdAt: r.created_at || new Date().toISOString(),
        paymentMethod: r.payment_method || undefined,
        orderId: r.order_id || undefined,
        transactionId: r.transaction_id || undefined,
        notes: r.notes || undefined
      }));
      counts.savingsTransactions = resultData.savingsTransactions.length;
    }

    // 5. Treasurer Transactions (Buku Kas Umum)
    if (hasTable('treasurer_transactions')) {
      const [rows]: any = await connection.query('SELECT * FROM `treasurer_transactions` ORDER BY `date` DESC, `id` DESC');
      resultData.treasurerTransactions = rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        category: r.category,
        amount: Number(r.amount) || 0,
        description: r.description,
        date: r.date,
        source: r.source || 'custom',
        studentName: r.student_name || undefined,
        studentId: r.student_id || undefined,
        nis: r.nis || undefined,
        createdBy: r.created_by || 'Bendahara',
        recipientName: r.recipient_name || undefined,
        fundingSource: r.funding_source || undefined,
        paymentMethod: r.payment_method === 'bank' ? 'bank' : 'kas',
        kodeRekening: r.kode_rekening || undefined,
        noBukti: r.no_bukti || undefined,
        orderId: r.order_id || undefined,
        transactionId: r.transaction_id || undefined
      }));
      counts.treasurerTransactions = resultData.treasurerTransactions.length;
    }

    // 6. Teacher Salaries
    if (hasTable('teacher_salaries')) {
      const [rows]: any = await connection.query('SELECT * FROM `teacher_salaries`');
      resultData.teacherSalaries = rows.map((r: any) => ({
        id: r.id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        teacherType: r.teacher_type,
        month: r.month,
        baseSalary: Number(r.base_salary) || 0,
        homeroomAllowance: Number(r.homeroom_allowance) || 0,
        journalCount: Number(r.journal_count) || 0,
        journalRate: Number(r.journal_rate) || 0,
        journalIncentive: Number(r.journal_incentive) || 0,
        tunjanganMasaKerja: Number(r.tunjangan_masa_kerja) || 0,
        vakasi: Number(r.vakasi) || 0,
        otherAllowance: Number(r.other_allowance) || 0,
        potonganDanaSosial: Number(r.potongan_dana_sosial) || 0,
        potonganAbsen: Number(r.potongan_absen) || 0,
        potonganLain: Number(r.potongan_lain) || 0,
        deductions: Number(r.deductions) || 0,
        totalAmount: Number(r.total_amount) || 0,
        status: r.status || 'unpaid',
        paymentDate: r.payment_date || undefined,
        notes: r.notes || undefined
      }));
      counts.teacherSalaries = resultData.teacherSalaries.length;
    }

    // 7. Homeroom Teachers
    if (hasTable('homeroom_teachers')) {
      const [rows]: any = await connection.query('SELECT * FROM `homeroom_teachers`');
      resultData.homeroomTeachers = rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        className: r.class_name,
        password: r.password || undefined,
        skUrl: r.sk_url || undefined
      }));
      counts.homeroomTeachers = resultData.homeroomTeachers.length;
    }

    // 8. Subject Teachers
    if (hasTable('subject_teachers')) {
      const [rows]: any = await connection.query('SELECT * FROM `subject_teachers`');
      resultData.subjectTeachers = rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        subject: r.subject,
        className: r.class_name || 'SEMUA KELAS',
        password: r.password || undefined,
        skUrl: r.sk_url || undefined
      }));
      counts.subjectTeachers = resultData.subjectTeachers.length;
    }

    // 9. Teaching Journals
    if (hasTable('teaching_journals')) {
      const [rows]: any = await connection.query('SELECT * FROM `teaching_journals`');
      resultData.teachingJournals = rows.map((r: any) => {
        let attendanceData = undefined;
        if (r.attendance_data) {
          try {
            attendanceData = typeof r.attendance_data === 'string' ? JSON.parse(r.attendance_data) : r.attendance_data;
          } catch {}
        }
        return {
          id: r.id,
          teacherId: r.teacher_id,
          teacherName: r.teacher_name,
          teacherType: r.teacher_type || undefined,
          subject: r.subject,
          className: r.class_name,
          date: r.date,
          topic: r.topic,
          attendanceData,
          notes: r.notes || undefined,
          fase: r.fase || undefined,
          semester: r.semester || undefined,
          alokasiWaktu: r.alokasi_waktu || undefined,
          jamKe: r.jam_ke || undefined,
          pertemuanKe: r.pertemuan_ke || undefined,
          tujuanPembelajaran: r.tujuan_pembelajaran || undefined,
          pencapaianKktp: r.pencapaian_kktp || undefined,
          createdAt: r.created_at || new Date().toISOString()
        };
      });
      counts.teachingJournals = resultData.teachingJournals.length;
    }

    // 10. Attendance Logs
    if (hasTable('attendance_logs')) {
      const [rows]: any = await connection.query('SELECT * FROM `attendance_logs`');
      resultData.attendanceLogs = rows.map((r: any) => {
        let subjectNotes = undefined;
        if (r.subject_notes) {
          try {
            subjectNotes = typeof r.subject_notes === 'string' ? JSON.parse(r.subject_notes) : r.subject_notes;
          } catch {}
        }
        return {
          id: r.id,
          studentId: r.student_id,
          studentName: r.student_name || undefined,
          className: r.class_name || undefined,
          date: r.date,
          status: r.status,
          notes: r.notes || undefined,
          subjectNotes
        };
      });
      counts.attendanceLogs = resultData.attendanceLogs.length;
    }

    // 11. Merdeka Assessments
    if (hasTable('merdeka_assessments')) {
      const [rows]: any = await connection.query('SELECT * FROM `merdeka_assessments`');
      resultData.merdekaAssessments = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        className: r.class_name,
        subject: r.subject,
        teacherName: r.teacher_name,
        semester: r.semester,
        academicYear: r.academic_year,
        tp1Name: r.tp1_name || undefined,
        tp1Tugas1: r.tp1_tugas1 || undefined,
        tp1Tugas2: r.tp1_tugas2 || undefined,
        tp1Uh: r.tp1_uh || undefined,
        nilaiTp1: r.nilai_tp1 !== null ? Number(r.nilai_tp1) : undefined,
        tp2Name: r.tp2_name || undefined,
        tp2Tugas1: r.tp2_tugas1 || undefined,
        tp2Tugas2: r.tp2_tugas2 || undefined,
        tp2Uh: r.tp2_uh || undefined,
        nilaiTp2: r.nilai_tp2 !== null ? Number(r.nilai_tp2) : undefined,
        tp3Name: r.tp3_name || undefined,
        tp3Tugas1: r.tp3_tugas1 || undefined,
        tp3Tugas2: r.tp3_tugas2 || undefined,
        tp3Uh: r.tp3_uh || undefined,
        nilaiTp3: r.nilai_tp3 !== null ? Number(r.nilai_tp3) : undefined,
        tp4Name: r.tp4_name || undefined,
        tp4Tugas1: r.tp4_tugas1 || undefined,
        tp4Tugas2: r.tp4_tugas2 || undefined,
        tp4Uh: r.tp4_uh || undefined,
        nilaiTp4: r.nilai_tp4 !== null ? Number(r.nilai_tp4) : undefined,
        nilaiRataTp: r.nilai_rata_tp !== null ? Number(r.nilai_rata_tp) : undefined,
        nilaiKokurikuler: r.nilai_kokurikuler !== null ? Number(r.nilai_kokurikuler) : undefined,
        nilaiPts: r.nilai_pts !== null ? Number(r.nilai_pts) : undefined,
        nilaiPas: r.nilai_pas !== null ? Number(r.nilai_pas) : undefined,
        nilaiAkhirMapel: r.nilai_akhir_mapel !== null ? Number(r.nilai_akhir_mapel) : undefined,
        nilaiFormatif: r.nilai_formatif !== null ? Number(r.nilai_formatif) : undefined,
        nilaiSumatifLm: r.nilai_sumatif_lm !== null ? Number(r.nilai_sumatif_lm) : undefined,
        nilaiSas: r.nilai_sas !== null ? Number(r.nilai_sas) : undefined,
        nilaiRapor: r.nilai_rapor !== null ? Number(r.nilai_rapor) : undefined,
        deskripsiCapaian: r.deskripsi_capaian || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || undefined
      }));
      counts.merdekaAssessments = resultData.merdekaAssessments.length;
    }

    // 12. Class Schedules
    if (hasTable('class_schedules')) {
      const [rows]: any = await connection.query('SELECT * FROM `class_schedules`');
      resultData.classSchedules = rows.map((r: any) => ({
        id: r.id,
        day: r.day,
        className: r.class_name,
        subject: r.subject,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        jamKe: r.jam_ke,
        startTime: r.start_time || undefined,
        endTime: r.end_time || undefined,
        alokasiWaktu: r.alokasi_waktu || undefined,
        academicYear: r.academic_year || undefined,
        semester: r.semester || undefined,
        createdAt: r.created_at || undefined
      }));
      counts.classSchedules = resultData.classSchedules.length;
    }

    // 13. Student Development Logs
    if (hasTable('student_development_logs')) {
      const [rows]: any = await connection.query('SELECT * FROM `student_development_logs`');
      resultData.studentDevelopmentLogs = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        className: r.class_name,
        date: r.date,
        category: r.category,
        notes: r.notes,
        createdAt: r.created_at
      }));
      counts.studentDevelopmentLogs = resultData.studentDevelopmentLogs.length;
    }

    // 14. Student Infraction Logs
    if (hasTable('student_infraction_logs')) {
      const [rows]: any = await connection.query('SELECT * FROM `student_infraction_logs`');
      resultData.studentInfractionLogs = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        className: r.class_name,
        date: r.date,
        time: r.time,
        location: r.location,
        infractionType: r.infraction_type,
        actionTaken: r.action_taken,
        resolutionStatus: r.resolution_status,
        points: Number(r.points) || 0,
        createdAt: r.created_at
      }));
      counts.studentInfractionLogs = resultData.studentInfractionLogs.length;
    }

    // 15. Infraction Rules
    if (hasTable('infraction_rules')) {
      const [rows]: any = await connection.query('SELECT * FROM `infraction_rules`');
      resultData.infractionRules = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        points: Number(r.points) || 0,
        category: r.category
      }));
      counts.infractionRules = resultData.infractionRules.length;
    }

    // 16. Student Counseling Logs
    if (hasTable('student_counseling_logs')) {
      const [rows]: any = await connection.query('SELECT * FROM `student_counseling_logs`');
      resultData.studentCounselingLogs = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        className: r.class_name,
        date: r.date,
        topic: r.topic,
        actionPlan: r.action_plan,
        result: r.result,
        bkFeedback: r.bk_feedback || undefined,
        bkFeedbackAt: r.bk_feedback_at || undefined,
        createdAt: r.created_at
      }));
      counts.studentCounselingLogs = resultData.studentCounselingLogs.length;
    }

    // 17. Class Announcements
    if (hasTable('class_announcements')) {
      const [rows]: any = await connection.query('SELECT * FROM `class_announcements`');
      resultData.classAnnouncements = rows.map((r: any) => ({
        id: r.id,
        className: r.class_name,
        title: r.title,
        content: r.content,
        date: r.date,
        targetRecipient: r.target_recipient,
        confirmationStatus: r.confirmation_status || 'Belum Dibaca',
        createdAt: r.created_at
      }));
      counts.classAnnouncements = resultData.classAnnouncements.length;
    }

    // 18. Class Meeting Logs
    if (hasTable('class_meeting_logs')) {
      const [rows]: any = await connection.query('SELECT * FROM `class_meeting_logs`');
      resultData.classMeetingLogs = rows.map((r: any) => ({
        id: r.id,
        className: r.class_name,
        meetingType: r.meeting_type,
        date: r.date,
        attendees: r.attendees,
        agenda: r.agenda,
        followUp: r.follow_up,
        createdAt: r.created_at
      }));
      counts.classMeetingLogs = resultData.classMeetingLogs.length;
    }

    // 19. Principal Work Programs
    if (hasTable('principal_work_programs')) {
      const [rows]: any = await connection.query('SELECT * FROM `principal_work_programs`');
      resultData.principalWorkPrograms = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        targetDate: r.target_date,
        status: r.status,
        syncWithStaff: Boolean(r.sync_with_staff),
        createdAt: r.created_at
      }));
      counts.principalWorkPrograms = resultData.principalWorkPrograms.length;
    }

    // 20. Teacher Evaluations
    if (hasTable('teacher_evaluations')) {
      const [rows]: any = await connection.query('SELECT * FROM `teacher_evaluations`');
      resultData.teacherEvaluations = rows.map((r: any) => ({
        id: r.id,
        teacherType: r.teacher_type,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        evaluatorName: r.evaluator_name,
        date: r.date,
        academicYear: r.academic_year,
        pedagogicScore: Number(r.pedagogic_score) || 0,
        professionalScore: Number(r.professional_score) || 0,
        personalScore: Number(r.personal_score) || 0,
        socialScore: Number(r.social_score) || 0,
        notes: r.notes,
        createdAt: r.created_at
      }));
      counts.teacherEvaluations = resultData.teacherEvaluations.length;
    }

    // 21. Sarpras Items
    if (hasTable('sarpras_items')) {
      const [rows]: any = await connection.query('SELECT * FROM `sarpras_items`');
      resultData.sarprasItems = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        category: r.category,
        conditionStatus: r.condition_status,
        location: r.location,
        totalQty: Number(r.total_qty) || 0,
        availableQty: Number(r.available_qty) || 0,
        price: r.price !== null ? Number(r.price) : undefined,
        purchaseYear: r.purchase_year || undefined
      }));
      counts.sarprasItems = resultData.sarprasItems.length;
    }

    // 22. Sarpras Proposals
    if (hasTable('sarpras_proposals')) {
      const [rows]: any = await connection.query('SELECT * FROM `sarpras_proposals`');
      resultData.sarprasProposals = rows.map((r: any) => ({
        id: r.id,
        itemName: r.item_name,
        qty: Number(r.qty) || 1,
        estimatedPrice: Number(r.estimated_price) || 0,
        totalPrice: Number(r.total_price) || 0,
        proposedBy: r.proposed_by,
        date: r.date,
        reason: r.reason,
        status: r.status,
        notes: r.notes || undefined,
        imageUrl: r.image_url || undefined,
        createdAt: r.created_at
      }));
      counts.sarprasProposals = resultData.sarprasProposals.length;
    }

    // 23. Sarpras Loans
    if (hasTable('sarpras_loans')) {
      const [rows]: any = await connection.query('SELECT * FROM `sarpras_loans`');
      resultData.sarprasLoans = rows.map((r: any) => ({
        id: r.id,
        itemId: r.item_id,
        itemName: r.item_name,
        borrowerId: r.borrower_id,
        borrowerName: r.borrower_name,
        qty: Number(r.qty) || 1,
        loanDate: r.loan_date,
        returnDate: r.return_date || undefined,
        status: r.status,
        notes: r.notes || undefined
      }));
      counts.sarprasLoans = resultData.sarprasLoans.length;
    }

    // 24. SPMB Candidates
    if (hasTable('spmb_candidates')) {
      const [rows]: any = await connection.query('SELECT * FROM `spmb_candidates`');
      resultData.spmbCandidates = rows.map((r: any) => {
        let transferHistory = undefined;
        if (r.transfer_history) {
          try {
            transferHistory = typeof r.transfer_history === 'string' ? JSON.parse(r.transfer_history) : r.transfer_history;
          } catch {}
        }
        let uniformOrders = undefined;
        if (r.uniform_orders) {
          try {
            uniformOrders = typeof r.uniform_orders === 'string' ? JSON.parse(r.uniform_orders) : r.uniform_orders;
          } catch {}
        }
        return {
          id: r.id,
          registrationNo: r.registration_no,
          nisn: r.nisn,
          nik: r.nik,
          fullName: r.full_name,
          gender: r.gender,
          birthPlace: r.birth_place,
          birthDate: r.birth_date,
          phone: r.phone,
          schoolOriginType: r.school_origin_type,
          schoolOrigin: r.school_origin,
          registrationType: r.registration_type,
          sessionId: r.session_id,
          createdAt: r.created_at,
          originalSessionId: r.original_session_id || undefined,
          previousSessionId: r.previous_session_id || undefined,
          isTransferredSession: Boolean(r.is_transferred_session),
          transferredAt: r.transferred_at || undefined,
          transferReason: r.transfer_reason || undefined,
          transferHistory,
          tokenPaymentStatus: r.token_payment_status || 'unpaid',
          tokenPaymentOrderId: r.token_payment_order_id || undefined,
          tokenPaidAt: r.token_paid_at || undefined,
          tokenPaymentMethod: r.token_payment_method || undefined,
          tokenAmount: r.token_amount !== null ? Number(r.token_amount) : undefined,
          collectiveRefundStatus: r.collective_refund_status || 'none',
          collectiveRefundAmount: r.collective_refund_amount !== null ? Number(r.collective_refund_amount) : undefined,
          collectiveRefundedAt: r.collective_refunded_at || undefined,
          collectiveRefundedBy: r.collective_refunded_by || undefined,
          collectiveRefundRecipient: r.collective_refund_recipient || undefined,
          collectiveRefundNote: r.collective_refund_note || undefined,
          collectiveRefundReceiptNo: r.collective_refund_receipt_no || undefined,
          isFormCompleted: Boolean(r.is_form_completed),
          formCompletedAt: r.form_completed_at || undefined,
          nickname: r.nickname || undefined,
          kkNumber: r.kk_number || undefined,
          birthCertNumber: r.birth_cert_number || undefined,
          religion: r.religion || undefined,
          address: r.address || undefined,
          dusun: r.dusun || undefined,
          rt: r.rt || undefined,
          rw: r.rw || undefined,
          village: r.village || undefined,
          district: r.district || undefined,
          city: r.city || undefined,
          postalCode: r.postal_code || undefined,
          livingWith: r.living_with || undefined,
          childOrder: r.child_order || undefined,
          siblingsCount: r.siblings_count || undefined,
          stepSiblingsCount: r.step_siblings_count || undefined,
          transportation: r.transportation || undefined,
          specialNeeds: r.special_needs || undefined,
          height: r.height !== null ? Number(r.height) : undefined,
          weight: r.weight !== null ? Number(r.weight) : undefined,
          distanceToSchool: r.distance_to_school || undefined,
          travelTime: r.travel_time || undefined,
          fatherName: r.father_name || undefined,
          fatherNik: r.father_nik || undefined,
          fatherBirthPlace: r.father_birth_place || undefined,
          fatherBirthDate: r.father_birth_date || undefined,
          fatherEducation: r.father_education || undefined,
          fatherOccupation: r.father_occupation || undefined,
          fatherIncome: r.father_income || undefined,
          fatherPhone: r.father_phone || undefined,
          fatherStatus: r.father_status || undefined,
          fatherAddress: r.father_address || undefined,
          motherName: r.mother_name || undefined,
          motherNik: r.mother_nik || undefined,
          motherBirthPlace: r.mother_birth_place || undefined,
          motherBirthDate: r.mother_birth_date || undefined,
          motherEducation: r.mother_education || undefined,
          motherOccupation: r.mother_occupation || undefined,
          motherIncome: r.mother_income || undefined,
          motherPhone: r.mother_phone || undefined,
          motherStatus: r.mother_status || undefined,
          motherAddress: r.mother_address || undefined,
          guardianName: r.guardian_name || undefined,
          guardianNik: r.guardian_nik || undefined,
          guardianBirthPlace: r.guardian_birth_place || undefined,
          guardianBirthDate: r.guardian_birth_date || undefined,
          guardianEducation: r.guardian_education || undefined,
          guardianOccupation: r.guardian_occupation || undefined,
          guardianIncome: r.guardian_income || undefined,
          guardianPhone: r.guardian_phone || undefined,
          guardianStatus: r.guardian_status || undefined,
          guardianAddress: r.guardian_address || undefined,
          guardianRelationship: r.guardian_relationship || undefined,
          guardianIsSameAsFather: Boolean(r.guardian_is_same_as_father),
          reRegistrationPaidAt: r.re_registration_paid_at || undefined,
          reRegistrationMethod: r.re_registration_method || undefined,
          reRegistrationOrderId: r.re_registration_order_id || undefined,
          reRegistrationStatus: r.re_registration_status || 'unpaid',
          buildingFeePaid: Number(r.building_fee_paid) || 0,
          julySppPaid: Number(r.july_spp_paid) || 0,
          uniformFeePaid: Number(r.uniform_fee_paid) || 0,
          totalReRegistrationPaid: Number(r.total_re_registration_paid) || 0,
          uniformOrders
        };
      });
      counts.spmbCandidates = resultData.spmbCandidates.length;
    }

    // 25. Midtrans Transactions
    if (hasTable('midtrans_transactions')) {
      const [rows]: any = await connection.query('SELECT * FROM `midtrans_transactions`');
      resultData.midtransTransactions = rows.map((r: any) => {
        let rawResponse = undefined;
        if (r.raw_response) {
          try {
            rawResponse = typeof r.raw_response === 'string' ? JSON.parse(r.raw_response) : r.raw_response;
          } catch {}
        }
        return {
          id: r.id,
          orderId: r.order_id,
          transactionId: r.transaction_id || undefined,
          studentId: r.student_id || undefined,
          studentName: r.student_name || undefined,
          studentNis: r.student_nis || undefined,
          nisn: r.nisn || undefined,
          billType: r.bill_type,
          description: r.description,
          grossAmount: Number(r.gross_amount) || 0,
          paymentType: r.payment_type,
          transactionStatus: r.transaction_status,
          fraudStatus: r.fraud_status || undefined,
          settlementTime: r.settlement_time || undefined,
          transactionTime: r.transaction_time || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          snapToken: r.snap_token || undefined,
          rawResponse
        };
      });
      counts.midtransTransactions = resultData.midtransTransactions.length;
    }

    // 26. Notifications
    if (hasTable('notifications')) {
      const [rows]: any = await connection.query('SELECT * FROM `notifications` ORDER BY `created_at` DESC LIMIT 100');
      resultData.notifications = rows.map((r: any) => ({
        id: r.id,
        studentId: r.student_id || undefined,
        title: r.title,
        message: r.message,
        type: r.type || 'info',
        category: r.category || 'admin',
        createdAt: r.created_at
      }));
      counts.notifications = resultData.notifications.length;
    }

    // 27. App Configs
    if (hasTable('app_configs')) {
      const [rows]: any = await connection.query('SELECT * FROM `app_configs`');
      resultData.configs = {};
      for (const r of rows) {
        try {
          resultData.configs[r.id] = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        } catch {}
      }
      counts.appConfigs = rows.length;
    }

    const durationMs = Date.now() - startTime;
    currentConfig.status = 'connected';
    currentConfig.lastSyncAt = new Date().toISOString();

    return {
      success: true,
      message: `Berhasil memuat seluruh data dari MySQL database "${currentConfig.database}" (${Object.values(counts).reduce((a, b) => a + b, 0)} total records)!`,
      data: resultData,
      counts,
      durationMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal menarik data dari database MySQL.',
      error: err.message || 'Kesalahan koneksi / query MySQL',
      durationMs: Date.now() - startTime
    };
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================================
// DIRECT MYSQL STORAGE & PERSISTENCE ENGINE
// ==========================================================

// Ensure all 26+ tables and configs exist in MySQL database without wiping existing data
export async function ensureAllMysqlTablesExist(): Promise<{ success: boolean; message: string; error?: string }> {
  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query(COMPLETE_TABLES_SQL);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    return {
      success: true,
      message: 'Semua struktur tabel MySQL berhasil diverifikasi dan diinisialisasi.'
    };
  } catch (err: any) {
    console.error('[MySQL Init Tables Error]:', err.message || err);
    return {
      success: false,
      message: 'Gagal menginisialisasi struktur tabel MySQL',
      error: err.message || String(err)
    };
  } finally {
    if (connection) connection.release();
  }
}

// Direct single entity save / upsert into MySQL table with proper UTF8 escaping
export async function directSaveEntityToMysql(entityType: string, data: any): Promise<{ success: boolean; message: string; error?: string }> {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Data entitas tidak valid.' };
  }

  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    const typeKey = entityType.toLowerCase().trim();

    // 1. Students
    if (typeKey === 'student' || typeKey === 'students') {
      const s = data;
      await connection.query(`
        INSERT INTO \`students\` (
          \`id\`, \`nis\`, \`nisn\`, \`name\`, \`class\`, \`gender\`, \`email\`, \`phone\`, \`savings_balance\`,
          \`status\`, \`password\`, \`nickname\`, \`nik\`, \`birth_place\`, \`birth_date\`, \`kk_number\`,
          \`birth_cert_number\`, \`living_with\`, \`child_order\`, \`siblings_count\`, \`step_siblings_count\`,
          \`address\`, \`photo_url\`, \`parent_name\`, \`google_drive_link\`, \`father_name\`, \`father_nik\`,
          \`father_birth_place\`, \`father_birth_date\`, \`father_education\`, \`father_occupation\`, \`father_income\`,
          \`father_address\`, \`father_phone\`, \`father_status\`, \`mother_name\`, \`mother_nik\`, \`mother_birth_place\`,
          \`mother_birth_date\`, \`mother_education\`, \`mother_occupation\`, \`mother_income\`, \`mother_address\`,
          \`mother_phone\`, \`mother_status\`, \`guardian_name\`, \`guardian_nik\`, \`guardian_birth_place\`,
          \`guardian_birth_date\`, \`guardian_education\`, \`guardian_occupation\`, \`guardian_income\`, \`guardian_address\`,
          \`guardian_phone\`, \`guardian_status\`, \`is_spp_exempt\`, \`spp_exemption_reason\`, \`spp_exemption_type\`,
          \`custom_spp_rate\`, \`mutation_date\`, \`mutation_reason\`, \`mutation_destination\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`nis\`=VALUES(\`nis\`), \`nisn\`=VALUES(\`nisn\`), \`name\`=VALUES(\`name\`), \`class\`=VALUES(\`class\`),
          \`gender\`=VALUES(\`gender\`), \`email\`=VALUES(\`email\`), \`phone\`=VALUES(\`phone\`),
          \`savings_balance\`=VALUES(\`savings_balance\`), \`status\`=VALUES(\`status\`), \`password\`=VALUES(\`password\`),
          \`nickname\`=VALUES(\`nickname\`), \`nik\`=VALUES(\`nik\`), \`birth_place\`=VALUES(\`birth_place\`),
          \`birth_date\`=VALUES(\`birth_date\`), \`kk_number\`=VALUES(\`kk_number\`), \`birth_cert_number\`=VALUES(\`birth_cert_number\`),
          \`living_with\`=VALUES(\`living_with\`), \`child_order\`=VALUES(\`child_order\`), \`siblings_count\`=VALUES(\`siblings_count\`),
          \`step_siblings_count\`=VALUES(\`step_siblings_count\`), \`address\`=VALUES(\`address\`), \`photo_url\`=VALUES(\`photo_url\`),
          \`parent_name\`=VALUES(\`parent_name\`), \`google_drive_link\`=VALUES(\`google_drive_link\`),
          \`father_name\`=VALUES(\`father_name\`), \`father_nik\`=VALUES(\`father_nik\`), \`father_birth_place\`=VALUES(\`father_birth_place\`),
          \`father_birth_date\`=VALUES(\`father_birth_date\`), \`father_education\`=VALUES(\`father_education\`),
          \`father_occupation\`=VALUES(\`father_occupation\`), \`father_income\`=VALUES(\`father_income\`),
          \`father_address\`=VALUES(\`father_address\`), \`father_phone\`=VALUES(\`father_phone\`), \`father_status\`=VALUES(\`father_status\`),
          \`mother_name\`=VALUES(\`mother_name\`), \`mother_nik\`=VALUES(\`mother_nik\`), \`mother_birth_place\`=VALUES(\`mother_birth_place\`),
          \`mother_birth_date\`=VALUES(\`mother_birth_date\`), \`mother_education\`=VALUES(\`mother_education\`),
          \`mother_occupation\`=VALUES(\`mother_occupation\`), \`mother_income\`=VALUES(\`mother_income\`),
          \`mother_address\`=VALUES(\`mother_address\`), \`mother_phone\`=VALUES(\`mother_phone\`), \`mother_status\`=VALUES(\`mother_status\`),
          \`guardian_name\`=VALUES(\`guardian_name\`), \`guardian_nik\`=VALUES(\`guardian_nik\`),
          \`guardian_birth_place\`=VALUES(\`guardian_birth_place\`), \`guardian_birth_date\`=VALUES(\`guardian_birth_date\`),
          \`guardian_education\`=VALUES(\`guardian_education\`), \`guardian_occupation\`=VALUES(\`guardian_occupation\`),
          \`guardian_income\`=VALUES(\`guardian_income\`), \`guardian_address\`=VALUES(\`guardian_address\`),
          \`guardian_phone\`=VALUES(\`guardian_phone\`), \`guardian_status\`=VALUES(\`guardian_status\`),
          \`is_spp_exempt\`=VALUES(\`is_spp_exempt\`), \`spp_exemption_reason\`=VALUES(\`spp_exemption_reason\`),
          \`spp_exemption_type\`=VALUES(\`spp_exemption_type\`), \`custom_spp_rate\`=VALUES(\`custom_spp_rate\`),
          \`mutation_date\`=VALUES(\`mutation_date\`), \`mutation_reason\`=VALUES(\`mutation_reason\`),
          \`mutation_destination\`=VALUES(\`mutation_destination\`), \`updated_at\`=NOW()
      `, [
        s.id, s.nis || '', s.nisn || null, s.name || '', s.class || '', s.gender || 'Laki-laki', s.email || null,
        s.phone || null, Number(s.savingsBalance) || 0, s.status || 'Aktif', s.password || null, s.nickname || null,
        s.nik || null, s.birthPlace || null, s.birthDate || null, s.kkNumber || null, s.birthCertNumber || null,
        s.livingWith || null, s.childOrder || null, s.siblingsCount || null, s.stepSiblingsCount || null,
        s.address || null, s.photoUrl || null, s.parentName || null, s.googleDriveLink || null, s.fatherName || null,
        s.fatherNik || null, s.fatherBirthPlace || null, s.fatherBirthDate || null, s.fatherEducation || null,
        s.fatherOccupation || null, s.fatherIncome || null, s.fatherAddress || null, s.fatherPhone || null,
        s.fatherStatus || null, s.motherName || null, s.motherNik || null, s.motherBirthPlace || null,
        s.motherBirthDate || null, s.motherEducation || null, s.motherOccupation || null, s.motherIncome || null,
        s.motherAddress || null, s.motherPhone || null, s.motherStatus || null, s.guardianName || null,
        s.guardianNik || null, s.guardianBirthPlace || null, s.guardianBirthDate || null, s.guardianEducation || null,
        s.guardianOccupation || null, s.guardianIncome || null, s.guardianAddress || null, s.guardianPhone || null,
        s.guardianStatus || null, s.isSppExempt ? 1 : 0, s.sppExemptionReason || null, s.sppExemptionType || null,
        s.customSppRate !== undefined ? Number(s.customSppRate) : null, s.mutationDate || null, s.mutationReason || null,
        s.mutationDestination || null
      ]);
      return { success: true, message: `Data siswa "${s.name}" (${s.nis}) langsung tersimpan ke MySQL.` };
    }

    // 2. SPP Bills
    else if (typeKey === 'spp' || typeKey === 'spp_bill' || typeKey === 'sppbills') {
      const b = data;
      await connection.query(`
        INSERT INTO \`spp_bills\` (
          \`id\`, \`student_id\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paid_at\`, \`payment_method\`,
          \`order_id\`, \`transaction_id\`, \`achievement_type\`, \`achievement_detail\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`), \`paid_at\`=VALUES(\`paid_at\`),
          \`payment_method\`=VALUES(\`payment_method\`), \`order_id\`=VALUES(\`order_id\`), \`transaction_id\`=VALUES(\`transaction_id\`),
          \`achievement_type\`=VALUES(\`achievement_type\`), \`achievement_detail\`=VALUES(\`achievement_detail\`)
      `, [
        b.id, b.studentId, b.month, Number(b.year) || 2026, Number(b.amount) || 0, b.status || 'unpaid',
        b.paidAt || null, b.paymentMethod || null, b.orderId || null, b.transactionId || null,
        b.achievementType || null, b.achievementDetail || null
      ]);
      return { success: true, message: `Data tagihan SPP "${b.month} ${b.year}" langsung tersimpan ke MySQL.` };
    }

    // 3. Misc Bills
    else if (typeKey === 'misc' || typeKey === 'misc_bill' || typeKey === 'miscbills') {
      const m = data;
      await connection.query(`
        INSERT INTO \`misc_bills\` (
          \`id\`, \`student_id\`, \`title\`, \`amount\`, \`status\`, \`created_at\`, \`paid_at\`,
          \`payment_method\`, \`order_id\`, \`transaction_id\`, \`is_monthly\`, \`month\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`title\`=VALUES(\`title\`), \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`),
          \`paid_at\`=VALUES(\`paid_at\`), \`payment_method\`=VALUES(\`payment_method\`), \`order_id\`=VALUES(\`order_id\`),
          \`transaction_id\`=VALUES(\`transaction_id\`), \`is_monthly\`=VALUES(\`is_monthly\`), \`month\`=VALUES(\`month\`)
      `, [
        m.id, m.studentId, m.title || '', Number(m.amount) || 0, m.status || 'unpaid',
        m.createdAt || new Date().toISOString(), m.paidAt || null, m.paymentMethod || null,
        m.orderId || null, m.transactionId || null, m.isMonthly ? 1 : 0, m.month || null
      ]);
      return { success: true, message: `Data tagihan non-SPP "${m.title}" langsung tersimpan ke MySQL.` };
    }

    // 4. Savings Transactions
    else if (typeKey === 'savings' || typeKey === 'savings_transaction' || typeKey === 'savingstransactions') {
      const s = data;
      await connection.query(`
        INSERT INTO \`savings_transactions\` (
          \`id\`, \`student_id\`, \`student_nis\`, \`type\`, \`amount\`, \`status\`, \`created_at\`,
          \`payment_method\`, \`order_id\`, \`transaction_id\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`status\`=VALUES(\`status\`), \`amount\`=VALUES(\`amount\`), \`notes\`=VALUES(\`notes\`),
          \`payment_method\`=VALUES(\`payment_method\`), \`order_id\`=VALUES(\`order_id\`), \`transaction_id\`=VALUES(\`transaction_id\`)
      `, [
        s.id, s.studentId, s.studentNis || null, s.type || 'deposit', Number(s.amount) || 0,
        s.status || 'success', s.createdAt || new Date().toISOString(), s.paymentMethod || null,
        s.orderId || null, s.transactionId || null, s.notes || null
      ]);
      return { success: true, message: `Transaksi tabungan Rp ${Number(s.amount).toLocaleString('id-ID')} langsung tersimpan ke MySQL.` };
    }

    // 5. Treasurer Transactions (Kas Umum)
    else if (typeKey === 'transaction' || typeKey === 'treasurer_transaction' || typeKey === 'treasurertransactions') {
      const t = data;
      await connection.query(`
        INSERT INTO \`treasurer_transactions\` (
          \`id\`, \`type\`, \`category\`, \`amount\`, \`description\`, \`date\`, \`source\`,
          \`student_name\`, \`student_id\`, \`nis\`, \`created_by\`, \`recipient_name\`,
          \`funding_source\`, \`payment_method\`, \`kode_rekening\`, \`no_bukti\`, \`order_id\`, \`transaction_id\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`amount\`=VALUES(\`amount\`), \`description\`=VALUES(\`description\`), \`category\`=VALUES(\`category\`),
          \`date\`=VALUES(\`date\`), \`payment_method\`=VALUES(\`payment_method\`), \`no_bukti\`=VALUES(\`no_bukti\`)
      `, [
        t.id, t.type || 'incoming', t.category || 'Lain-lain', Number(t.amount) || 0, t.description || '',
        t.date || new Date().toISOString().substring(0, 10), t.source || 'custom', t.studentName || null,
        t.studentId || null, t.nis || null, t.createdBy || 'Bendahara', t.recipientName || null,
        t.fundingSource || null, t.paymentMethod === 'bank' ? 'bank' : 'kas', t.kodeRekening || null,
        t.noBukti || null, t.orderId || null, t.transactionId || null
      ]);
      return { success: true, message: `Transaksi kas "${t.description}" langsung tersimpan ke MySQL.` };
    }

    // 6. Teacher Salaries
    else if (typeKey === 'salary' || typeKey === 'teacher_salary' || typeKey === 'teachersalaries') {
      const sal = data;
      await connection.query(`
        INSERT INTO \`teacher_salaries\` (
          \`id\`, \`teacher_id\`, \`teacher_name\`, \`teacher_type\`, \`month\`, \`base_salary\`,
          \`homeroom_allowance\`, \`journal_count\`, \`journal_rate\`, \`journal_incentive\`,
          \`tunjangan_masa_kerja\`, \`vakasi\`, \`other_allowance\`, \`potongan_dana_sosial\`,
          \`potongan_absen\`, \`potongan_lain\`, \`deductions\`, \`total_amount\`, \`status\`,
          \`payment_date\`, \`notes\`, \`created_at\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`total_amount\`=VALUES(\`total_amount\`), \`status\`=VALUES(\`status\`), \`payment_date\`=VALUES(\`payment_date\`),
          \`notes\`=VALUES(\`notes\`)
      `, [
        sal.id, sal.teacherId, sal.teacherName || '', sal.teacherType || 'subject', sal.month || '',
        Number(sal.baseSalary) || 0, Number(sal.homeroomAllowance) || 0, Number(sal.journalCount) || 0,
        Number(sal.journalRate) || 0, Number(sal.journalIncentive) || 0, Number(sal.tunjanganMasaKerja) || 0,
        Number(sal.vakasi) || 0, Number(sal.otherAllowance) || 0, Number(sal.potonganDanaSosial) || 0,
        Number(sal.potonganAbsen) || 0, Number(sal.potonganLain) || 0, Number(sal.deductions) || 0,
        Number(sal.totalAmount) || 0, sal.status || 'unpaid', sal.paymentDate || null, sal.notes || null,
        sal.createdAt || new Date().toISOString()
      ]);
      return { success: true, message: `Data slip gaji "${sal.teacherName}" langsung tersimpan ke MySQL.` };
    }

    // 7. Teaching Journals
    else if (typeKey === 'journal' || typeKey === 'teaching_journal' || typeKey === 'teachingjournals') {
      const j = data;
      await connection.query(`
        INSERT INTO \`teaching_journals\` (
          \`id\`, \`teacher_id\`, \`teacher_name\`, \`teacher_type\`, \`subject\`, \`class_name\`,
          \`date\`, \`topic\`, \`attendance_data\`, \`notes\`, \`fase\`, \`semester\`,
          \`alokasi_waktu\`, \`jam_ke\`, \`pertemuan_ke\`, \`tujuan_pembelajaran\`, \`pencapaian_kktp\`, \`created_at\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`topic\`=VALUES(\`topic\`), \`attendance_data\`=VALUES(\`attendance_data\`),
          \`notes\`=VALUES(\`notes\`), \`tujuan_pembelajaran\`=VALUES(\`tujuan_pembelajaran\`),
          \`pencapaian_kktp\`=VALUES(\`pencapaian_kktp\`)
      `, [
        j.id, j.teacherId || '', j.teacherName || '', j.teacherType || null, j.subject || '', j.className || '',
        j.date || new Date().toISOString().substring(0, 10), j.topic || '',
        typeof j.attendance === 'string' ? j.attendance : JSON.stringify(j.attendance || []),
        j.notes || null, j.fase || null, j.semester || null, j.alokasiWaktu || null, j.jamKe || null,
        j.pertemuanKe || null, j.tujuanPembelajaran || null, j.pencapaianKktp || null,
        j.createdAt || new Date().toISOString()
      ]);
      return { success: true, message: `Jurnal mengajar "${j.topic}" langsung tersimpan ke MySQL.` };
    }

    // 8. Attendance Logs
    else if (typeKey === 'attendance' || typeKey === 'attendance_log' || typeKey === 'attendancelogs') {
      const att = data;
      await connection.query(`
        INSERT INTO \`attendance_logs\` (
          \`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`date\`, \`status\`, \`notes\`, \`subject_notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`status\`=VALUES(\`status\`), \`notes\`=VALUES(\`notes\`), \`subject_notes\`=VALUES(\`subject_notes\`)
      `, [
        att.id, att.studentId || '', att.studentName || null, att.className || null,
        att.date || new Date().toISOString().substring(0, 10), att.status || 'Hadir',
        att.notes || null, att.subjectNotes ? JSON.stringify(att.subjectNotes) : null
      ]);
      return { success: true, message: `Log absensi siswa langsung tersimpan ke MySQL.` };
    }

    // 9. SPMB Candidates
    else if (typeKey === 'spmb' || typeKey === 'spmb_candidate' || typeKey === 'spmbcandidates') {
      const c = data;
      await connection.query(`
        INSERT INTO \`spmb_candidates\` (
          \`id\`, \`nisn\`, \`nik\`, \`full_name\`, \`gender\`, \`birth_place\`, \`birth_date\`,
          \`school_origin\`, \`address\`, \`parent_name\`, \`parent_phone\`, \`chosen_major\`,
          \`status\`, \`registration_date\`, \`test_score\`, \`interview_notes\`,
          \`token_paid\`, \`re_registration_paid\`, \`documents_verified\`, \`created_at\`, \`updated_at\`,
          \`uniform_size\`, \`uniform_details\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`full_name\`=VALUES(\`full_name\`), \`status\`=VALUES(\`status\`),
          \`token_paid\`=VALUES(\`token_paid\`), \`re_registration_paid\`=VALUES(\`re_registration_paid\`),
          \`documents_verified\`=VALUES(\`documents_verified\`), \`updated_at\`=NOW()
      `, [
        c.id, c.nisn || '', c.nik || null, c.fullName || '', c.gender || 'Laki-laki',
        c.birthPlace || null, c.birthDate || null, c.schoolOrigin || '', c.address || '',
        c.parentName || '', c.parentPhone || '', c.chosenMajor || 'Reguler',
        c.status || 'submitted', c.registrationDate || new Date().toISOString(),
        c.testScore !== undefined ? Number(c.testScore) : null, c.interviewNotes || null,
        c.tokenPaid ? 1 : 0, c.reRegistrationPaid ? 1 : 0, c.documentsVerified ? 1 : 0,
        c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString(),
        c.uniformSize || null, c.uniformDetails ? JSON.stringify(c.uniformDetails) : null
      ]);
      return { success: true, message: `Calon siswa SPMB "${c.fullName}" langsung tersimpan ke MySQL.` };
    }

    // 10. Merdeka Assessments (Nilai Rapor)
    else if (typeKey === 'assessment' || typeKey === 'merdeka' || typeKey === 'merdeka_assessment' || typeKey === 'merdekaassessments') {
      const a = data;
      await connection.query(`
        INSERT INTO \`merdeka_assessments\` (
          \`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`subject\`, \`teacher_name\`,
          \`semester\`, \`academic_year\`, \`tp1_name\`, \`tp1_tugas1\`, \`tp1_tugas2\`, \`tp1_uh\`, \`nilai_tp1\`,
          \`tp2_name\`, \`tp2_tugas1\`, \`tp2_tugas2\`, \`tp2_uh\`, \`nilai_tp2\`,
          \`tp3_name\`, \`tp3_tugas1\`, \`tp3_tugas2\`, \`tp3_uh\`, \`nilai_tp3\`,
          \`tp4_name\`, \`tp4_tugas1\`, \`tp4_tugas2\`, \`tp4_uh\`, \`nilai_tp4\`,
          \`nilai_rata_tp\`, \`nilai_kokurikuler\`, \`nilai_pts\`, \`nilai_pas\`, \`nilai_akhir_mapel\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`tp1_uh\`=VALUES(\`tp1_uh\`), \`nilai_tp1\`=VALUES(\`nilai_tp1\`),
          \`nilai_rata_tp\`=VALUES(\`nilai_rata_tp\`), \`nilai_akhir_mapel\`=VALUES(\`nilai_akhir_mapel\`)
      `, [
        a.id, a.studentId || '', a.studentName || '', a.className || '', a.subject || '', a.teacherName || '',
        a.semester || 'Ganjil', a.academicYear || '2026/2027',
        a.tp1Name || null, a.tp1Tugas1 || null, a.tp1Tugas2 || null, a.tp1Uh || null, Number(a.nilaiTp1) || null,
        a.tp2Name || null, a.tp2Tugas1 || null, a.tp2Tugas2 || null, a.tp2Uh || null, Number(a.nilaiTp2) || null,
        a.tp3Name || null, a.tp3Tugas1 || null, a.tp3Tugas2 || null, a.tp3Uh || null, Number(a.nilaiTp3) || null,
        a.tp4Name || null, a.tp4Tugas1 || null, a.tp4Tugas2 || null, a.tp4Uh || null, Number(a.nilaiTp4) || null,
        Number(a.nilaiRataTp) || null, Number(a.nilaiKokurikuler) || null, Number(a.nilaiPts) || null,
        Number(a.nilaiPas) || null, Number(a.nilaiAkhirMapel) || null
      ]);
      return { success: true, message: `Nilai rapor Merdeka langsung tersimpan ke MySQL.` };
    }

    // 11. Class Schedules (Jadwal Pelajaran)
    else if (typeKey === 'schedule' || typeKey === 'class_schedule' || typeKey === 'classschedules') {
      const sch = data;
      await connection.query(`
        INSERT INTO \`class_schedules\` (
          \`id\`, \`class_name\`, \`academic_year\`, \`semester\`, \`created_at\`, \`schedule_data\`
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`schedule_data\`=VALUES(\`schedule_data\`)
      `, [
        sch.id, sch.className || '', sch.academicYear || '2026/2027', sch.semester || 'Ganjil',
        sch.createdAt || new Date().toISOString(),
        typeof sch.schedule === 'string' ? sch.schedule : JSON.stringify(sch.schedule || sch)
      ]);
      return { success: true, message: `Jadwal pelajaran kelas "${sch.className}" langsung tersimpan ke MySQL.` };
    }

    // 12. Homeroom Teachers
    else if (typeKey === 'homeroom' || typeKey === 'homeroom_teacher' || typeKey === 'homeroomteachers') {
      const hr = data;
      await connection.query(`
        INSERT INTO \`homeroom_teachers\` (
          \`id\`, \`username\`, \`name\`, \`class_name\`, \`password\`, \`sk_url\`
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`name\`=VALUES(\`name\`), \`class_name\`=VALUES(\`class_name\`), \`password\`=VALUES(\`password\`), \`sk_url\`=VALUES(\`sk_url\`)
      `, [hr.id, hr.username || '', hr.name || '', hr.className || '', hr.password || null, hr.skUrl || null]);
      return { success: true, message: `Wali kelas "${hr.name}" langsung tersimpan ke MySQL.` };
    }

    // 13. Subject Teachers
    else if (typeKey === 'subject_teacher' || typeKey === 'subjectteachers') {
      const st = data;
      await connection.query(`
        INSERT INTO \`subject_teachers\` (
          \`id\`, \`username\`, \`name\`, \`subject\`, \`class_name\`, \`password\`, \`sk_url\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`name\`=VALUES(\`name\`), \`subject\`=VALUES(\`subject\`), \`password\`=VALUES(\`password\`), \`sk_url\`=VALUES(\`sk_url\`)
      `, [st.id, st.username || '', st.name || '', st.subject || '', st.className || 'SEMUA KELAS', st.password || null, st.skUrl || null]);
      return { success: true, message: `Guru mapel "${st.name}" langsung tersimpan ke MySQL.` };
    }

    // 14. Sarpras Items
    else if (typeKey === 'sarpras_item' || typeKey === 'sarprasitems') {
      const s = data;
      await connection.query(`
        INSERT INTO \`sarpras_items\` (
          \`id\`, \`name\`, \`code\`, \`category\`, \`room\`, \`condition_status\`,
          \`quantity\`, \`unit\`, \`source\`, \`acquisition_date\`, \`price\`,
          \`description\`, \`photo_url\`, \`created_at\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`name\`=VALUES(\`name\`), \`room\`=VALUES(\`room\`), \`condition_status\`=VALUES(\`condition_status\`),
          \`quantity\`=VALUES(\`quantity\`), \`description\`=VALUES(\`description\`)
      `, [
        s.id, s.name || '', s.code || '', s.category || '', s.room || '', s.conditionStatus || 'Baik',
        Number(s.quantity) || 0, s.unit || 'unit', s.source || '', s.acquisitionDate || '',
        Number(s.price) || 0, s.description || null, s.photoUrl || null, s.createdAt || new Date().toISOString()
      ]);
      return { success: true, message: `Inventaris Sarpras "${s.name}" langsung tersimpan ke MySQL.` };
    }

    // 15. Configs / Master settings
    else if (typeKey === 'config' || typeKey === 'app_config' || typeKey === 'appconfigs') {
      const configId = data.id || data.key || 'config';
      const configData = data.data !== undefined ? data.data : data;
      const jsonStr = typeof configData === 'string' ? configData : JSON.stringify(configData);
      await connection.query(`
        INSERT INTO \`app_configs\` (\`id\`, \`data\`) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE \`data\`=VALUES(\`data\`)
      `, [configId, jsonStr]);
      return { success: true, message: `Konfigurasi "${configId}" langsung tersimpan ke MySQL.` };
    }

    // Generic fallback into app_configs
    else {
      const entityId = data.id || `${typeKey}_${Date.now()}`;
      await connection.query(`
        INSERT INTO \`app_configs\` (\`id\`, \`data\`) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE \`data\`=VALUES(\`data\`)
      `, [`entity_${typeKey}_${entityId}`, JSON.stringify(data)]);
      return { success: true, message: `Entitas "${typeKey}" (#${entityId}) langsung tersimpan ke MySQL (app_configs).` };
    }
  } catch (err: any) {
    console.error(`[MySQL Direct Save Error - ${entityType}]:`, err.message || err);
    return {
      success: false,
      message: `Gagal menyimpan entitas "${entityType}" ke MySQL`,
      error: err.message || String(err)
    };
  } finally {
    if (connection) connection.release();
  }
}

// Batch entity save into MySQL table using a single database connection
export async function directSaveEntitiesBatchToMysql(entityType: string, items: any[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, count: 0 };
  }

  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;
  let savedCount = 0;

  try {
    connection = await pool.getConnection();
    const typeKey = entityType.toLowerCase().trim();

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      if (typeKey === 'student' || typeKey === 'students') {
        const s = item;
        await connection.query(`
          INSERT INTO \`students\` (
            \`id\`, \`nis\`, \`nisn\`, \`name\`, \`class\`, \`gender\`, \`email\`, \`phone\`, \`savings_balance\`,
            \`status\`, \`password\`, \`nickname\`, \`nik\`, \`birth_place\`, \`birth_date\`, \`kk_number\`,
            \`birth_cert_number\`, \`living_with\`, \`child_order\`, \`siblings_count\`, \`step_siblings_count\`,
            \`address\`, \`photo_url\`, \`parent_name\`, \`google_drive_link\`, \`father_name\`, \`father_nik\`,
            \`father_birth_place\`, \`father_birth_date\`, \`father_education\`, \`father_occupation\`, \`father_income\`,
            \`father_address\`, \`father_phone\`, \`father_status\`, \`mother_name\`, \`mother_nik\`, \`mother_birth_place\`,
            \`mother_birth_date\`, \`mother_education\`, \`mother_occupation\`, \`mother_income\`, \`mother_address\`,
            \`mother_phone\`, \`mother_status\`, \`guardian_name\`, \`guardian_nik\`, \`guardian_birth_place\`,
            \`guardian_birth_date\`, \`guardian_education\`, \`guardian_occupation\`, \`guardian_income\`, \`guardian_address\`,
            \`guardian_phone\`, \`guardian_status\`, \`is_spp_exempt\`, \`spp_exemption_reason\`, \`spp_exemption_type\`,
            \`custom_spp_rate\`, \`mutation_date\`, \`mutation_reason\`, \`mutation_destination\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`nis\`=VALUES(\`nis\`), \`nisn\`=VALUES(\`nisn\`), \`name\`=VALUES(\`name\`), \`class\`=VALUES(\`class\`),
            \`gender\`=VALUES(\`gender\`), \`email\`=VALUES(\`email\`), \`phone\`=VALUES(\`phone\`),
            \`savings_balance\`=VALUES(\`savings_balance\`), \`status\`=VALUES(\`status\`), \`password\`=VALUES(\`password\`),
            \`nickname\`=VALUES(\`nickname\`), \`nik\`=VALUES(\`nik\`), \`birth_place\`=VALUES(\`birth_place\`),
            \`birth_date\`=VALUES(\`birth_date\`), \`kk_number\`=VALUES(\`kk_number\`), \`birth_cert_number\`=VALUES(\`birth_cert_number\`),
            \`living_with\`=VALUES(\`living_with\`), \`child_order\`=VALUES(\`child_order\`), \`siblings_count\`=VALUES(\`siblings_count\`),
            \`step_siblings_count\`=VALUES(\`step_siblings_count\`), \`address\`=VALUES(\`address\`), \`photo_url\`=VALUES(\`photo_url\`),
            \`parent_name\`=VALUES(\`parent_name\`), \`google_drive_link\`=VALUES(\`google_drive_link\`),
            \`father_name\`=VALUES(\`father_name\`), \`father_nik\`=VALUES(\`father_nik\`), \`father_birth_place\`=VALUES(\`father_birth_place\`),
            \`father_birth_date\`=VALUES(\`father_birth_date\`), \`father_education\`=VALUES(\`father_education\`),
            \`father_occupation\`=VALUES(\`father_occupation\`), \`father_income\`=VALUES(\`father_income\`),
            \`father_address\`=VALUES(\`father_address\`), \`father_phone\`=VALUES(\`father_phone\`), \`father_status\`=VALUES(\`father_status\`),
            \`mother_name\`=VALUES(\`mother_name\`), \`mother_nik\`=VALUES(\`mother_nik\`), \`mother_birth_place\`=VALUES(\`mother_birth_place\`),
            \`mother_birth_date\`=VALUES(\`mother_birth_date\`), \`mother_education\`=VALUES(\`mother_education\`),
            \`mother_occupation\`=VALUES(\`mother_occupation\`), \`mother_income\`=VALUES(\`mother_income\`),
            \`mother_address\`=VALUES(\`mother_address\`), \`mother_phone\`=VALUES(\`mother_phone\`), \`mother_status\`=VALUES(\`mother_status\`),
            \`guardian_name\`=VALUES(\`guardian_name\`), \`guardian_nik\`=VALUES(\`guardian_nik\`),
            \`guardian_birth_place\`=VALUES(\`guardian_birth_place\`), \`guardian_birth_date\`=VALUES(\`guardian_birth_date\`),
            \`guardian_education\`=VALUES(\`guardian_education\`), \`guardian_occupation\`=VALUES(\`guardian_occupation\`),
            \`guardian_income\`=VALUES(\`guardian_income\`), \`guardian_address\`=VALUES(\`guardian_address\`),
            \`guardian_phone\`=VALUES(\`guardian_phone\`), \`guardian_status\`=VALUES(\`guardian_status\`),
            \`is_spp_exempt\`=VALUES(\`is_spp_exempt\`), \`spp_exemption_reason\`=VALUES(\`spp_exemption_reason\`),
            \`spp_exemption_type\`=VALUES(\`spp_exemption_type\`), \`custom_spp_rate\`=VALUES(\`custom_spp_rate\`),
            \`mutation_date\`=VALUES(\`mutation_date\`), \`mutation_reason\`=VALUES(\`mutation_reason\`),
            \`mutation_destination\`=VALUES(\`mutation_destination\`), \`updated_at\`=NOW()
        `, [
          s.id, s.nis || '', s.nisn || null, s.name || '', s.class || '', s.gender || 'Laki-laki', s.email || null,
          s.phone || null, Number(s.savingsBalance) || 0, s.status || 'Aktif', s.password || null, s.nickname || null,
          s.nik || null, s.birthPlace || null, s.birthDate || null, s.kkNumber || null, s.birthCertNumber || null,
          s.livingWith || null, s.childOrder || null, s.siblingsCount || null, s.stepSiblingsCount || null,
          s.address || null, s.photoUrl || null, s.parentName || null, s.googleDriveLink || null, s.fatherName || null,
          s.fatherNik || null, s.fatherBirthPlace || null, s.fatherBirthDate || null, s.fatherEducation || null,
          s.fatherOccupation || null, s.fatherIncome || null, s.fatherAddress || null, s.fatherPhone || null,
          s.fatherStatus || null, s.motherName || null, s.motherNik || null, s.motherBirthPlace || null,
          s.motherBirthDate || null, s.motherEducation || null, s.motherOccupation || null, s.motherIncome || null,
          s.motherAddress || null, s.motherPhone || null, s.motherStatus || null, s.guardianName || null,
          s.guardianNik || null, s.guardianBirthPlace || null, s.guardianBirthDate || null, s.guardianEducation || null,
          s.guardianOccupation || null, s.guardianIncome || null, s.guardianAddress || null, s.guardianPhone || null,
          s.guardianStatus || null, s.isSppExempt ? 1 : 0, s.sppExemptionReason || null, s.sppExemptionType || null,
          s.customSppRate !== undefined ? Number(s.customSppRate) : null, s.mutationDate || null, s.mutationReason || null,
          s.mutationDestination || null
        ]);
        savedCount++;
      } else if (typeKey === 'spp' || typeKey === 'spp_bill' || typeKey === 'sppbills') {
        const b = item;
        await connection.query(`
          INSERT INTO \`spp_bills\` (
            \`id\`, \`student_id\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paid_at\`, \`payment_method\`,
            \`order_id\`, \`transaction_id\`, \`achievement_type\`, \`achievement_detail\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`), \`paid_at\`=VALUES(\`paid_at\`),
            \`payment_method\`=VALUES(\`payment_method\`), \`order_id\`=VALUES(\`order_id\`), \`transaction_id\`=VALUES(\`transaction_id\`),
            \`achievement_type\`=VALUES(\`achievement_type\`), \`achievement_detail\`=VALUES(\`achievement_detail\`)
        `, [
          b.id, b.studentId, b.month, Number(b.year) || 2026, Number(b.amount) || 0, b.status || 'unpaid',
          b.paidAt || null, b.paymentMethod || null, b.orderId || null, b.transactionId || null,
          b.achievementType || null, b.achievementDetail || null
        ]);
        savedCount++;
      } else if (typeKey === 'misc' || typeKey === 'misc_bill' || typeKey === 'miscbills') {
        const m = item;
        await connection.query(`
          INSERT INTO \`misc_bills\` (
            \`id\`, \`student_id\`, \`title\`, \`amount\`, \`status\`, \`created_at\`, \`paid_at\`,
            \`payment_method\`, \`order_id\`, \`transaction_id\`, \`is_monthly\`, \`month\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`title\`=VALUES(\`title\`), \`amount\`=VALUES(\`amount\`), \`status\`=VALUES(\`status\`),
            \`paid_at\`=VALUES(\`paid_at\`), \`payment_method\`=VALUES(\`payment_method\`), \`order_id\`=VALUES(\`order_id\`),
            \`transaction_id\`=VALUES(\`transaction_id\`), \`is_monthly\`=VALUES(\`is_monthly\`), \`month\`=VALUES(\`month\`)
        `, [
          m.id, m.studentId, m.title || '', Number(m.amount) || 0, m.status || 'unpaid',
          m.createdAt || new Date().toISOString(), m.paidAt || null, m.paymentMethod || null,
          m.orderId || null, m.transactionId || null, m.isMonthly ? 1 : 0, m.month || null
        ]);
        savedCount++;
      } else if (typeKey === 'savings' || typeKey === 'savings_transaction' || typeKey === 'savingstransactions') {
        const s = item;
        await connection.query(`
          INSERT INTO \`savings_transactions\` (
            \`id\`, \`student_id\`, \`student_nis\`, \`type\`, \`amount\`, \`status\`, \`created_at\`,
            \`payment_method\`, \`order_id\`, \`transaction_id\`, \`notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\`=VALUES(\`status\`), \`amount\`=VALUES(\`amount\`), \`notes\`=VALUES(\`notes\`),
            \`payment_method\`=VALUES(\`payment_method\`), \`order_id\`=VALUES(\`order_id\`), \`transaction_id\`=VALUES(\`transaction_id\`)
        `, [
          s.id, s.studentId, s.studentNis || null, s.type || 'deposit', Number(s.amount) || 0,
          s.status || 'success', s.createdAt || new Date().toISOString(), s.paymentMethod || null,
          s.orderId || null, s.transactionId || null, s.notes || null
        ]);
        savedCount++;
      } else {
        // Fallback to directSaveEntityToMysql
        await directSaveEntityToMysql(entityType, item);
        savedCount++;
      }
    }

    return { success: true, count: savedCount };
  } catch (err: any) {
    console.error(`[MySQL Batch Save Error - ${entityType}]:`, err.message || err);
    return { success: false, count: savedCount, error: err.message || String(err) };
  } finally {
    if (connection) connection.release();
  }
}

// Direct single entity delete from MySQL table
export async function directDeleteEntityFromMysql(entityType: string, id: string): Promise<{ success: boolean; message: string; error?: string }> {
  if (!id) {
    return { success: false, message: 'ID entitas wajib diisi untuk penghapusan.' };
  }

  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    const typeKey = entityType.toLowerCase().trim();

    const tableMap: Record<string, string> = {
      student: 'students',
      students: 'students',
      spp: 'spp_bills',
      spp_bill: 'spp_bills',
      sppbills: 'spp_bills',
      misc: 'misc_bills',
      misc_bill: 'misc_bills',
      miscbills: 'misc_bills',
      savings: 'savings_transactions',
      savings_transaction: 'savings_transactions',
      savingstransactions: 'savings_transactions',
      transaction: 'treasurer_transactions',
      treasurer_transaction: 'treasurer_transactions',
      treasurertransactions: 'treasurer_transactions',
      salary: 'teacher_salaries',
      teacher_salary: 'teacher_salaries',
      teachersalaries: 'teacher_salaries',
      homeroom: 'homeroom_teachers',
      homeroom_teacher: 'homeroom_teachers',
      homeroomteachers: 'homeroom_teachers',
      subject_teacher: 'subject_teachers',
      subjectteachers: 'subject_teachers',
      journal: 'teaching_journals',
      teaching_journal: 'teaching_journals',
      teachingjournals: 'teaching_journals',
      attendance: 'attendance_logs',
      attendance_log: 'attendance_logs',
      attendancelogs: 'attendance_logs',
      assessment: 'merdeka_assessments',
      merdeka: 'merdeka_assessments',
      merdeka_assessment: 'merdeka_assessments',
      merdekaassessments: 'merdeka_assessments',
      schedule: 'class_schedules',
      class_schedule: 'class_schedules',
      classschedules: 'class_schedules',
      spmb: 'spmb_candidates',
      spmb_candidate: 'spmb_candidates',
      spmbcandidates: 'spmb_candidates',
      sarpras_item: 'sarpras_items',
      sarprasitems: 'sarpras_items',
      sarpras_proposal: 'sarpras_proposals',
      sarprasproposals: 'sarpras_proposals',
      sarpras_loan: 'sarpras_loans',
      sarprasloans: 'sarpras_loans',
      student_development_log: 'student_development_logs',
      studentdevelopmentlogs: 'student_development_logs',
      student_infraction_log: 'student_infraction_logs',
      studentinfractionlogs: 'student_infraction_logs',
      student_counseling_log: 'student_counseling_logs',
      studentcounselinglogs: 'student_counseling_logs',
      infraction_rule: 'infraction_rules',
      infractionrules: 'infraction_rules',
      class_announcement: 'class_announcements',
      classannouncements: 'class_announcements',
      class_meeting_log: 'class_meeting_logs',
      classmeetinglogs: 'class_meeting_logs',
      principal_work_program: 'principal_work_programs',
      principalworkprograms: 'principal_work_programs',
      teacher_evaluation: 'teacher_evaluations',
      teacherevaluations: 'teacher_evaluations',
      notification: 'notifications',
      notifications: 'notifications',
      config: 'app_configs'
    };

    const tableName = tableMap[typeKey] || typeKey;
    await connection.query(`DELETE FROM \`${tableName}\` WHERE \`id\` = ?`, [id]);
    return {
      success: true,
      message: `Data ID "${id}" pada tabel "${tableName}" berhasil dihapus langsung dari MySQL.`
    };
  } catch (err: any) {
    console.error(`[MySQL Direct Delete Error - ${entityType}]:`, err.message || err);
    return {
      success: false,
      message: `Gagal menghapus data dari MySQL`,
      error: err.message || String(err)
    };
  } finally {
    if (connection) connection.release();
  }
}

// Direct batch entities delete from MySQL table
export async function directDeleteEntitiesBatchFromMysql(entityType: string, ids: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: true, count: 0 };
  }

  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    const typeKey = entityType.toLowerCase().trim();

    const tableMap: Record<string, string> = {
      student: 'students',
      students: 'students',
      spp: 'spp_bills',
      spp_bill: 'spp_bills',
      sppbills: 'spp_bills',
      misc: 'misc_bills',
      misc_bill: 'misc_bills',
      miscbills: 'misc_bills',
      savings: 'savings_transactions',
      savings_transaction: 'savings_transactions',
      savingstransactions: 'savings_transactions',
      transaction: 'treasurer_transactions',
      treasurer_transaction: 'treasurer_transactions',
      treasurertransactions: 'treasurer_transactions',
      salary: 'teacher_salaries',
      teacher_salary: 'teacher_salaries',
      teachersalaries: 'teacher_salaries',
      spmb: 'spmb_candidates',
      spmb_candidate: 'spmb_candidates',
      spmbcandidates: 'spmb_candidates',
      notification: 'notifications',
      notifications: 'notifications'
    };

    const tableName = tableMap[typeKey] || typeKey;
    let totalDeleted = 0;
    const chunkSize = 200;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const [res]: any = await connection.query(`DELETE FROM \`${tableName}\` WHERE \`id\` IN (${placeholders})`, chunk);
      totalDeleted += (res?.affectedRows || 0);
    }

    return { success: true, count: totalDeleted };
  } catch (err: any) {
    console.error(`[MySQL Batch Delete Error - ${entityType}]:`, err.message || err);
    return { success: false, count: 0, error: err.message || String(err) };
  } finally {
    if (connection) connection.release();
  }
}

// Debounced background direct snapshot sync runner
let debouncedSyncTimer: NodeJS.Timeout | null = null;
let isSyncInProgress = false;

export function triggerDebouncedMysqlSync(snapshotProvider: () => Promise<any> | any, delayMs: number = 1000) {
  if (debouncedSyncTimer) {
    clearTimeout(debouncedSyncTimer);
  }

  debouncedSyncTimer = setTimeout(async () => {
    if (isSyncInProgress) return;
    try {
      isSyncInProgress = true;
      const snapshotData = await snapshotProvider();
      const snapshot = snapshotData?.snapshot || snapshotData;
      const isConfigured = Boolean(
        currentConfig.host &&
        currentConfig.database &&
        currentConfig.user &&
        (currentConfig.hasPassword || (currentConfig.password !== undefined && currentConfig.password !== '') || Boolean(process.env.MYSQL_PASSWORD))
      );
      if (snapshot && isConfigured) {
        await syncDataToMysql(snapshot);
        console.log('[MySQL Direct Background Sync] Berhasil melakukan autosave langsung ke MySQL.');
      }
    } catch (err: any) {
      console.warn('[MySQL Direct Background Sync] Warning:', err.message || err);
    } finally {
      isSyncInProgress = false;
    }
  }, delayMs);
}


