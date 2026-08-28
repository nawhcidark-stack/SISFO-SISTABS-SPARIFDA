import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { MysqlDatabaseConfig, MysqlTestResult, MysqlSyncResult, Student, SppBill, SavingsTransaction, TreasurerTransaction, TeacherSalary, MiscBill } from '../types';

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
  // If password was omitted or empty in request, keep existing password if requested
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

// SQL Table Initialization script for automated sync
const INITIAL_TABLES_SQL = `
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
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`unique_nis\` (\`nis\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`treasurer_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`type\` ENUM('incoming', 'outgoing') NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`source\` VARCHAR(32) DEFAULT 'custom',
  \`created_by\` VARCHAR(100) DEFAULT NULL,
  \`recipient_name\` VARCHAR(150) DEFAULT NULL,
  \`funding_source\` VARCHAR(100) DEFAULT NULL,
  \`kode_rekening\` VARCHAR(64) DEFAULT NULL,
  \`no_bukti\` VARCHAR(64) DEFAULT NULL,
  \`payment_method\` ENUM('kas', 'bank') DEFAULT 'kas',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`spp_bills\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`year\` INT NOT NULL,
  \`amount\` DECIMAL(12,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending', 'waived') DEFAULT 'unpaid',
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`payment_method\` VARCHAR(64) DEFAULT NULL,
  \`order_id\` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
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
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`paid_by\` VARCHAR(100) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`savings_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`type\` ENUM('deposit', 'withdrawal') NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` VARCHAR(32) DEFAULT 'success',
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`misc_bills\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending') DEFAULT 'unpaid',
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`month\` VARCHAR(32) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Synchronize all application data into MySQL database
export async function syncDataToMysql(appState: {
  students: Student[];
  transactions: TreasurerTransaction[];
  sppBills: SppBill[];
  salaries: TeacherSalary[];
  savings: SavingsTransaction[];
  miscBills: MiscBill[];
}): Promise<MysqlSyncResult> {
  const startTime = Date.now();
  const pool = createPool();
  let connection: mysql.PoolConnection | null = null;

  try {
    connection = await pool.getConnection();

    // 1. Create tables if not existing
    const statements = INITIAL_TABLES_SQL.split(';').map(s => s.trim()).filter(Boolean);
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
          INSERT INTO \`students\` (\`id\`, \`nis\`, \`nisn\`, \`name\`, \`class\`, \`gender\`, \`email\`, \`phone\`, \`savings_balance\`, \`status\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`class\` = VALUES(\`class\`),
            \`savings_balance\` = VALUES(\`savings_balance\`),
            \`status\` = VALUES(\`status\`),
            \`phone\` = VALUES(\`phone\`)
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
          s.status || 'Aktif'
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
          (\`id\`, \`teacher_id\`, \`teacher_name\`, \`teacher_type\`, \`month\`, \`base_salary\`, \`homeroom_allowance\`, \`journal_count\`, \`journal_incentive\`, \`tunjangan_masa_kerja\`, \`vakasi\`, \`other_allowance\`, \`potongan_dana_sosial\`, \`potongan_absen\`, \`potongan_lain\`, \`deductions\`, \`total_amount\`, \`status\`, \`paid_at\`, \`paid_by\`, \`notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            \`paid_at\` = VALUES(\`paid_at\`),
            \`paid_by\` = VALUES(\`paid_by\`),
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
          null,
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

// Generate complete phpMyAdmin ready-to-import SQL script
export function generatePhpMyAdminSql(): string {
  return `-- ==========================================================
-- SKRIP DATABASE MYSQL / PHPMYADMIN (SMP MAARIF NU PANDAAN)
-- Dibuat Otomatis dari Portal Bendahara Keuangan
-- Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- 1. Tabel: students (Data Siswa & Profil)
-- --------------------------------------------------------
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
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`unique_nis\` (\`nis\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabel: treasurer_transactions (Buku Kas Terpadu BKU/BP)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`treasurer_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`type\` ENUM('incoming', 'outgoing') NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`source\` VARCHAR(32) DEFAULT 'custom',
  \`created_by\` VARCHAR(100) DEFAULT NULL,
  \`recipient_name\` VARCHAR(150) DEFAULT NULL,
  \`funding_source\` VARCHAR(100) DEFAULT NULL,
  \`kode_rekening\` VARCHAR(64) DEFAULT NULL,
  \`no_bukti\` VARCHAR(64) DEFAULT NULL,
  \`payment_method\` ENUM('kas', 'bank') DEFAULT 'kas',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabel: spp_bills (Tagihan & Pembayaran SPP)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`spp_bills\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`year\` INT NOT NULL,
  \`amount\` DECIMAL(12,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending', 'waived') DEFAULT 'unpaid',
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`payment_method\` VARCHAR(64) DEFAULT NULL,
  \`order_id\` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Tabel: teacher_salaries (Gaji & Insentif Guru/Staf)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`teacher_salaries\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`teacher_id\` VARCHAR(64) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`teacher_type\` VARCHAR(32) NOT NULL,
  \`month\` VARCHAR(32) NOT NULL,
  \`base_salary\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`homeroom_allowance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`journal_count\` INT NOT NULL DEFAULT 0,
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
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`paid_by\` VARCHAR(100) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Tabel: savings_transactions (Tabungan Siswa)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`savings_transactions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`type\` ENUM('deposit', 'withdrawal') NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` VARCHAR(32) DEFAULT 'success',
  \`created_at\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Tabel: misc_bills (Tagihan Non-SPP / Lainnya)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`misc_bills\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('paid', 'unpaid', 'pending') DEFAULT 'unpaid',
  \`paid_at\` VARCHAR(64) DEFAULT NULL,
  \`month\` VARCHAR(32) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
`;
}
