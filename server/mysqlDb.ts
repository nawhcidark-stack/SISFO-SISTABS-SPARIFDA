import mysql from 'mysql2/promise';

export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  enabled: boolean;
}

let mysqlPool: mysql.Pool | null = null;
let lastMysqlStatus: {
  connected: boolean;
  message: string;
  lastChecked: string;
  tablesCount?: number;
  recordsCount?: number;
  latencyMs?: number;
} = {
  connected: false,
  message: 'Belum diinisialisasi',
  lastChecked: new Date().toISOString()
};

export function getMysqlConfig(): MysqlConfig {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'u604170242_root2',
    password: process.env.MYSQL_PASSWORD || 'Sparifda@92',
    database: process.env.MYSQL_DATABASE || 'u604170242_portal_maarif',
    enabled: process.env.MYSQL_ENABLED === 'true'
  };
}

export function getMysqlPool(): mysql.Pool | null {
  return mysqlPool;
}

export function getMysqlStatus() {
  return lastMysqlStatus;
}

/**
 * Creates MySQL connection pool
 */
export async function initMysqlPool(config?: Partial<MysqlConfig>): Promise<{ success: boolean; message: string }> {
  const currentConfig = { ...getMysqlConfig(), ...config };
  
  if (mysqlPool) {
    try {
      await mysqlPool.end();
    } catch (_) {}
    mysqlPool = null;
  }

  try {
    const startTime = Date.now();
    
    // Direct pool creation targeted at the specific database (best for Hostinger / cPanel)
    try {
      mysqlPool = mysql.createPool({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: currentConfig.password,
        database: currentConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 7000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      });

      // Test ping
      await mysqlPool.query('SELECT 1 + 1 AS result');
    } catch (directErr: any) {
      // If error indicates database not found and on local/root, try creating database
      if (directErr.code === 'ER_BAD_DB_ERROR') {
        const tempConn = await mysql.createConnection({
          host: currentConfig.host,
          port: currentConfig.port,
          user: currentConfig.user,
          password: currentConfig.password,
          connectTimeout: 5000
        });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${currentConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await tempConn.end();

        mysqlPool = mysql.createPool({
          host: currentConfig.host,
          port: currentConfig.port,
          user: currentConfig.user,
          password: currentConfig.password,
          database: currentConfig.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 7000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000
        });
      } else {
        throw directErr;
      }
    }
    const latency = Date.now() - startTime;

    // Run schema creation
    await initMysqlTables(mysqlPool);

    // Count tables
    const [tables]: any = await mysqlPool.query('SHOW TABLES');
    const tablesCount = Array.isArray(tables) ? tables.length : 0;

    lastMysqlStatus = {
      connected: true,
      message: `Terhubung ke MySQL (${currentConfig.host}:${currentConfig.port}/${currentConfig.database})`,
      lastChecked: new Date().toISOString(),
      tablesCount,
      latencyMs: latency
    };

    console.log(`[MYSQL] Berhasil terkoneksi ke database MySQL '${currentConfig.database}' (${latency}ms, ${tablesCount} tabel).`);
    return { success: true, message: lastMysqlStatus.message };
  } catch (err: any) {
    lastMysqlStatus = {
      connected: false,
      message: `Gagal terkoneksi ke MySQL: ${err.message || err}`,
      lastChecked: new Date().toISOString()
    };
    mysqlPool = null;
    return { success: false, message: lastMysqlStatus.message };
  }
}

/**
 * Creates all required application tables in MySQL
 */
export async function initMysqlTables(pool: mysql.Pool): Promise<void> {
  const tableSchemas = [
    // 1. Students
    `CREATE TABLE IF NOT EXISTS \`students\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`nis\` VARCHAR(50) NOT NULL UNIQUE,
      \`nisn\` VARCHAR(50) DEFAULT '',
      \`class\` VARCHAR(50) NOT NULL,
      \`gender\` VARCHAR(20) DEFAULT '',
      \`parentPhone\` VARCHAR(50) DEFAULT '',
      \`parentName\` VARCHAR(255) DEFAULT '',
      \`address\` TEXT,
      \`status\` VARCHAR(50) DEFAULT 'active',
      \`savingsBalance\` BIGINT DEFAULT 0,
      \`sppNominal\` INT DEFAULT 0,
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_nis\` (\`nis\`),
      INDEX \`idx_class\` (\`class\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 2. SPP Bills
    `CREATE TABLE IF NOT EXISTS \`spp_bills\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`studentId\` VARCHAR(100) NOT NULL,
      \`studentName\` VARCHAR(255) NOT NULL,
      \`nis\` VARCHAR(50) NOT NULL,
      \`class\` VARCHAR(50) NOT NULL,
      \`month\` VARCHAR(50) NOT NULL,
      \`year\` VARCHAR(20) NOT NULL,
      \`amount\` INT NOT NULL,
      \`status\` VARCHAR(50) DEFAULT 'unpaid',
      \`paymentMethod\` VARCHAR(50) DEFAULT '',
      \`paymentDate\` VARCHAR(50) DEFAULT '',
      \`receiptNo\` VARCHAR(100) DEFAULT '',
      \`orderId\` VARCHAR(100) DEFAULT '',
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_student_month\` (\`nis\`, \`month\`, \`year\`),
      INDEX \`idx_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 3. Misc Bills
    `CREATE TABLE IF NOT EXISTS \`misc_bills\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`studentId\` VARCHAR(100) NOT NULL,
      \`studentName\` VARCHAR(255) NOT NULL,
      \`nis\` VARCHAR(50) NOT NULL,
      \`class\` VARCHAR(50) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(100) DEFAULT '',
      \`amount\` INT NOT NULL,
      \`paidAmount\` INT DEFAULT 0,
      \`status\` VARCHAR(50) DEFAULT 'unpaid',
      \`paymentDate\` VARCHAR(50) DEFAULT '',
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_nis_misc\` (\`nis\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 4. Savings Transactions
    `CREATE TABLE IF NOT EXISTS \`savings_transactions\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`studentId\` VARCHAR(100) NOT NULL,
      \`studentName\` VARCHAR(255) NOT NULL,
      \`nis\` VARCHAR(50) NOT NULL,
      \`class\` VARCHAR(50) NOT NULL,
      \`type\` VARCHAR(20) NOT NULL,
      \`amount\` BIGINT NOT NULL,
      \`previousBalance\` BIGINT DEFAULT 0,
      \`currentBalance\` BIGINT DEFAULT 0,
      \`description\` TEXT,
      \`date\` VARCHAR(50) NOT NULL,
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_nis_savings\` (\`nis\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 5. Treasurer Transactions (Buku Kas Umum)
    `CREATE TABLE IF NOT EXISTS \`treasurer_transactions\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`type\` VARCHAR(20) NOT NULL,
      \`category\` VARCHAR(100) NOT NULL,
      \`amount\` BIGINT NOT NULL,
      \`description\` TEXT NOT NULL,
      \`date\` VARCHAR(50) NOT NULL,
      \`source\` VARCHAR(100) DEFAULT '',
      \`createdBy\` VARCHAR(255) DEFAULT '',
      \`noBukti\` VARCHAR(100) DEFAULT '',
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_date\` (\`date\`),
      INDEX \`idx_type\` (\`type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 6. Midtrans Transactions
    `CREATE TABLE IF NOT EXISTS \`midtrans_transactions\` (
      \`orderId\` VARCHAR(100) PRIMARY KEY,
      \`studentId\` VARCHAR(100) DEFAULT '',
      \`nis\` VARCHAR(50) DEFAULT '',
      \`billType\` VARCHAR(50) DEFAULT '',
      \`description\` TEXT,
      \`grossAmount\` INT NOT NULL,
      \`paymentType\` VARCHAR(100) DEFAULT '',
      \`transactionStatus\` VARCHAR(50) DEFAULT 'pending',
      \`settlementTime\` VARCHAR(50) DEFAULT '',
      \`snapToken\` TEXT,
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_status_midtrans\` (\`transactionStatus\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 7. Homeroom & Subject Teachers
    `CREATE TABLE IF NOT EXISTS \`teachers\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`type\` VARCHAR(50) NOT NULL, -- homeroom / subject
      \`name\` VARCHAR(255) NOT NULL,
      \`nip\` VARCHAR(50) DEFAULT '',
      \`phone\` VARCHAR(50) DEFAULT '',
      \`className\` VARCHAR(50) DEFAULT '',
      \`subject\` VARCHAR(100) DEFAULT '',
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 8. Attendance Logs
    `CREATE TABLE IF NOT EXISTS \`attendance_logs\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`date\` VARCHAR(50) NOT NULL,
      \`nis\` VARCHAR(50) NOT NULL,
      \`studentName\` VARCHAR(255) NOT NULL,
      \`class\` VARCHAR(50) NOT NULL,
      \`status\` VARCHAR(50) NOT NULL,
      \`notes\` TEXT,
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_date_att\` (\`date\`, \`class\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 9. Sarpras Items (Inventaris)
    `CREATE TABLE IF NOT EXISTS \`sarpras_items\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`code\` VARCHAR(100) NOT NULL,
      \`category\` VARCHAR(100) NOT NULL,
      \`location\` VARCHAR(100) NOT NULL,
      \`totalQty\` INT NOT NULL DEFAULT 1,
      \`availableQty\` INT NOT NULL DEFAULT 1,
      \`condition\` VARCHAR(50) DEFAULT 'Baik',
      \`purchaseYear\` VARCHAR(20) DEFAULT '',
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 10. Sarpras Loans (Peminjaman Aset)
    `CREATE TABLE IF NOT EXISTS \`sarpras_loans\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`itemId\` VARCHAR(100) NOT NULL,
      \`itemName\` VARCHAR(255) NOT NULL,
      \`borrowerId\` VARCHAR(100) NOT NULL,
      \`borrowerName\` VARCHAR(255) NOT NULL,
      \`qty\` INT NOT NULL DEFAULT 1,
      \`loanDate\` VARCHAR(50) NOT NULL,
      \`returnDate\` VARCHAR(50) DEFAULT '',
      \`status\` VARCHAR(50) DEFAULT 'dipinjam',
      \`notes\` TEXT,
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_loan_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 11. Sarpras Proposals (Usulan Belanja)
    `CREATE TABLE IF NOT EXISTS \`sarpras_proposals\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`itemName\` VARCHAR(255) NOT NULL,
      \`qty\` INT NOT NULL DEFAULT 1,
      \`estimatedPrice\` BIGINT NOT NULL DEFAULT 0,
      \`totalPrice\` BIGINT NOT NULL DEFAULT 0,
      \`date\` VARCHAR(50) NOT NULL,
      \`urgency\` VARCHAR(50) DEFAULT 'Biasa',
      \`status\` VARCHAR(50) DEFAULT 'pending',
      \`description\` TEXT,
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 12. SPMB Candidates (Penerimaan Siswa Baru)
    `CREATE TABLE IF NOT EXISTS \`spmb_candidates\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`token\` VARCHAR(50) NOT NULL UNIQUE,
      \`fullName\` VARCHAR(255) NOT NULL,
      \`nisn\` VARCHAR(50) DEFAULT '',
      \`nik\` VARCHAR(50) DEFAULT '',
      \`gender\` VARCHAR(20) DEFAULT '',
      \`originSchool\` VARCHAR(255) DEFAULT '',
      \`parentName\` VARCHAR(255) DEFAULT '',
      \`parentPhone\` VARCHAR(50) DEFAULT '',
      \`status\` VARCHAR(50) DEFAULT 'menunggu_verifikasi',
      \`raw_data\` JSON,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_token\` (\`token\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 13. System Configurations & App Metadata
    `CREATE TABLE IF NOT EXISTS \`system_configs\` (
      \`key_name\` VARCHAR(100) PRIMARY KEY,
      \`config_data\` JSON NOT NULL,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const sql of tableSchemas) {
    await pool.query(sql);
  }
}

/**
 * Synchronizes the entire state object to the connected MySQL database
 */
export async function syncStateToMysql(state: any): Promise<{ success: boolean; message: string }> {
  const pool = getMysqlPool();
  if (!pool) return { success: false, message: 'MySQL pool tidak aktif / belum terhubung' };
  
  try {
    // 1. Sync system_configs
    const configKeys = [
      'schoolIdentity', 'sppRates', 'midtransConfig', 'whatsappConfig', 
      'treasurerConfig', 'principalConfig', 'sarprasConfig', 'salaryConfig', 
      'backupConfig', 'bkConfig', 'curriculumConfig', 'adminConfig', 'spmbConfig'
    ];
    for (const k of configKeys) {
      if (state[k]) {
        await pool.query(
          `INSERT INTO \`system_configs\` (\`key_name\`, \`config_data\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`config_data\` = VALUES(\`config_data\`)`,
          [k, JSON.stringify(state[k])]
        );
      }
    }

    // 2. Sync students
    if (Array.isArray(state.students)) {
      for (const s of state.students) {
        await pool.query(
          `INSERT INTO \`students\` (\`id\`, \`name\`, \`nis\`, \`nisn\`, \`class\`, \`gender\`, \`parentPhone\`, \`parentName\`, \`address\`, \`status\`, \`savingsBalance\`, \`sppNominal\`, \`raw_data\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`name\` = VALUES(\`name\`),
             \`nisn\` = VALUES(\`nisn\`),
             \`class\` = VALUES(\`class\`),
             \`gender\` = VALUES(\`gender\`),
             \`parentPhone\` = VALUES(\`parentPhone\`),
             \`parentName\` = VALUES(\`parentName\`),
             \`address\` = VALUES(\`address\`),
             \`status\` = VALUES(\`status\`),
             \`savingsBalance\` = VALUES(\`savingsBalance\`),
             \`sppNominal\` = VALUES(\`sppNominal\`),
             \`raw_data\` = VALUES(\`raw_data\`)`,
          [
            s.id || s.nis, s.name, s.nis, s.nisn || '', s.class || '', s.gender || '',
            s.parentPhone || '', s.parentName || '', s.address || '', s.status || 'active',
            Number(s.savingsBalance) || 0, Number(s.sppNominal) || 0, JSON.stringify(s)
          ]
        );
      }
    }

    // 3. Sync spp_bills
    if (Array.isArray(state.sppBills)) {
      for (const b of state.sppBills) {
        await pool.query(
          `INSERT INTO \`spp_bills\` (\`id\`, \`studentId\`, \`studentName\`, \`nis\`, \`class\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paymentMethod\`, \`paymentDate\`, \`receiptNo\`, \`orderId\`, \`raw_data\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`studentName\` = VALUES(\`studentName\`),
             \`class\` = VALUES(\`class\`),
             \`amount\` = VALUES(\`amount\`),
             \`status\` = VALUES(\`status\`),
             \`paymentMethod\` = VALUES(\`paymentMethod\`),
             \`paymentDate\` = VALUES(\`paymentDate\`),
             \`receiptNo\` = VALUES(\`receiptNo\`),
             \`orderId\` = VALUES(\`orderId\`),
             \`raw_data\` = VALUES(\`raw_data\`)`,
          [
            b.id, b.studentId || '', b.studentName || '', b.nis || '', b.class || '',
            b.month || '', b.year || '', Number(b.amount) || 0, b.status || 'unpaid',
            b.paymentMethod || '', b.paymentDate || '', b.receiptNo || '', b.orderId || '',
            JSON.stringify(b)
          ]
        );
      }
    }

    // 4. Sync misc_bills
    if (Array.isArray(state.miscBills)) {
      for (const b of state.miscBills) {
        await pool.query(
          `INSERT INTO \`misc_bills\` (\`id\`, \`studentId\`, \`studentName\`, \`nis\`, \`class\`, \`title\`, \`category\`, \`amount\`, \`paidAmount\`, \`status\`, \`paymentDate\`, \`raw_data\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`title\` = VALUES(\`title\`),
             \`category\` = VALUES(\`category\`),
             \`amount\` = VALUES(\`amount\`),
             \`paidAmount\` = VALUES(\`paidAmount\`),
             \`status\` = VALUES(\`status\`),
             \`paymentDate\` = VALUES(\`paymentDate\`),
             \`raw_data\` = VALUES(\`raw_data\`)`,
          [
            b.id, b.studentId || '', b.studentName || '', b.nis || '', b.class || '',
            b.title || '', b.category || '', Number(b.amount) || 0, Number(b.paidAmount) || 0,
            b.status || 'unpaid', b.paymentDate || '', JSON.stringify(b)
          ]
        );
      }
    }

    // 5. Sync savings_transactions
    if (Array.isArray(state.savingsTransactions)) {
      for (const t of state.savingsTransactions) {
        await pool.query(
          `INSERT INTO \`savings_transactions\` (\`id\`, \`studentId\`, \`studentName\`, \`nis\`, \`class\`, \`type\`, \`amount\`, \`previousBalance\`, \`currentBalance\`, \`description\`, \`date\`, \`raw_data\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`amount\` = VALUES(\`amount\`),
             \`currentBalance\` = VALUES(\`currentBalance\`),
             \`description\` = VALUES(\`description\`),
             \`date\` = VALUES(\`date\`),
             \`raw_data\` = VALUES(\`raw_data\`)`,
          [
            t.id, t.studentId || '', t.studentName || '', t.nis || '', t.class || '',
            t.type || '', Number(t.amount) || 0, Number(t.previousBalance) || 0,
            Number(t.currentBalance) || 0, t.description || '', t.date || '', JSON.stringify(t)
          ]
        );
      }
    }

    // 6. Sync treasurer_transactions
    if (Array.isArray(state.treasurerTransactions)) {
      for (const t of state.treasurerTransactions) {
        await pool.query(
          `INSERT INTO \`treasurer_transactions\` (\`id\`, \`type\`, \`category\`, \`amount\`, \`description\`, \`date\`, \`source\`, \`createdBy\`, \`noBukti\`, \`raw_data\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`type\` = VALUES(\`type\`),
             \`category\` = VALUES(\`category\`),
             \`amount\` = VALUES(\`amount\`),
             \`description\` = VALUES(\`description\`),
             \`date\` = VALUES(\`date\`),
             \`source\` = VALUES(\`source\`),
             \`createdBy\` = VALUES(\`createdBy\`),
             \`noBukti\` = VALUES(\`noBukti\`),
             \`raw_data\` = VALUES(\`raw_data\`)`,
          [
            t.id, t.type || '', t.category || '', Number(t.amount) || 0,
            t.description || '', t.date || '', t.source || '', t.createdBy || '',
            t.noBukti || '', JSON.stringify(t)
          ]
        );
      }
    }

    return { success: true, message: 'Sinkronisasi ke basis data MySQL berhasil diselesaikan!' };
  } catch (err: any) {
    console.error('[MYSQL SYNC ERROR]', err);
    return { success: false, message: `Gagal sinkronisasi MySQL: ${err.message}` };
  }
}

/**
 * Generates an all-in-one pure MySQL .sql dump file ready for phpMyAdmin / cPanel import
 */
export function generateMysqlSqlDump(state: any): string {
  const dbName = process.env.MYSQL_DATABASE || 'u604170242_portal_maarif';
  const nowStr = new Date().toISOString();

  let dump = `-- =========================================================================
-- DATABASE DUMP MYSQL: ${dbName.toUpperCase()}
-- Generated at: ${nowStr}
-- Sistem Informasi Manajemen & Keuangan SMP Maarif NU Pandaan
-- Compatible with: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, phpMyAdmin, cPanel
-- =========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${dbName}\`;

-- --------------------------------------------------------
-- Struktur Tabel: \`system_configs\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`system_configs\`;
CREATE TABLE \`system_configs\` (
  \`key_name\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`config_data\` LONGTEXT NOT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`students\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`students\`;
CREATE TABLE \`students\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`nis\` VARCHAR(50) NOT NULL UNIQUE,
  \`nisn\` VARCHAR(50) DEFAULT '',
  \`class\` VARCHAR(50) NOT NULL,
  \`gender\` VARCHAR(20) DEFAULT '',
  \`parentPhone\` VARCHAR(50) DEFAULT '',
  \`parentName\` VARCHAR(255) DEFAULT '',
  \`address\` TEXT,
  \`status\` VARCHAR(50) DEFAULT 'active',
  \`savingsBalance\` BIGINT DEFAULT 0,
  \`sppNominal\` INT DEFAULT 0,
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_nis\` (\`nis\`),
  INDEX \`idx_class\` (\`class\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`spp_bills\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`spp_bills\`;
CREATE TABLE \`spp_bills\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`studentId\` VARCHAR(100) NOT NULL,
  \`studentName\` VARCHAR(255) NOT NULL,
  \`nis\` VARCHAR(50) NOT NULL,
  \`class\` VARCHAR(50) NOT NULL,
  \`month\` VARCHAR(50) NOT NULL,
  \`year\` VARCHAR(20) NOT NULL,
  \`amount\` INT NOT NULL,
  \`status\` VARCHAR(50) DEFAULT 'unpaid',
  \`paymentMethod\` VARCHAR(50) DEFAULT '',
  \`paymentDate\` VARCHAR(50) DEFAULT '',
  \`receiptNo\` VARCHAR(100) DEFAULT '',
  \`orderId\` VARCHAR(100) DEFAULT '',
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_student_month\` (\`nis\`, \`month\`, \`year\`),
  INDEX \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`misc_bills\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`misc_bills\`;
CREATE TABLE \`misc_bills\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`studentId\` VARCHAR(100) NOT NULL,
  \`studentName\` VARCHAR(255) NOT NULL,
  \`nis\` VARCHAR(50) NOT NULL,
  \`class\` VARCHAR(50) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`category\` VARCHAR(100) DEFAULT '',
  \`amount\` INT NOT NULL,
  \`paidAmount\` INT DEFAULT 0,
  \`status\` VARCHAR(50) DEFAULT 'unpaid',
  \`paymentDate\` VARCHAR(50) DEFAULT '',
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_nis_misc\` (\`nis\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`savings_transactions\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`savings_transactions\`;
CREATE TABLE \`savings_transactions\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`studentId\` VARCHAR(100) NOT NULL,
  \`studentName\` VARCHAR(255) NOT NULL,
  \`nis\` VARCHAR(50) NOT NULL,
  \`class\` VARCHAR(50) NOT NULL,
  \`type\` VARCHAR(20) NOT NULL,
  \`amount\` BIGINT NOT NULL,
  \`previousBalance\` BIGINT DEFAULT 0,
  \`currentBalance\` BIGINT DEFAULT 0,
  \`description\` TEXT,
  \`date\` VARCHAR(50) NOT NULL,
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_nis_savings\` (\`nis\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`treasurer_transactions\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`treasurer_transactions\`;
CREATE TABLE \`treasurer_transactions\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`type\` VARCHAR(20) NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`amount\` BIGINT NOT NULL,
  \`description\` TEXT NOT NULL,
  \`date\` VARCHAR(50) NOT NULL,
  \`source\` VARCHAR(100) DEFAULT '',
  \`createdBy\` VARCHAR(255) DEFAULT '',
  \`noBukti\` VARCHAR(100) DEFAULT '',
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_date\` (\`date\`),
  INDEX \`idx_type\` (\`type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`midtrans_transactions\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`midtrans_transactions\`;
CREATE TABLE \`midtrans_transactions\` (
  \`orderId\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`studentId\` VARCHAR(100) DEFAULT '',
  \`nis\` VARCHAR(50) DEFAULT '',
  \`billType\` VARCHAR(50) DEFAULT '',
  \`description\` TEXT,
  \`grossAmount\` INT NOT NULL,
  \`paymentType\` VARCHAR(100) DEFAULT '',
  \`transactionStatus\` VARCHAR(50) DEFAULT 'pending',
  \`settlementTime\` VARCHAR(50) DEFAULT '',
  \`snapToken\` TEXT,
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_status_midtrans\` (\`transactionStatus\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`sarpras_items\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sarpras_items\`;
CREATE TABLE \`sarpras_items\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`code\` VARCHAR(100) NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`location\` VARCHAR(100) NOT NULL,
  \`totalQty\` INT NOT NULL DEFAULT 1,
  \`availableQty\` INT NOT NULL DEFAULT 1,
  \`condition\` VARCHAR(50) DEFAULT 'Baik',
  \`purchaseYear\` VARCHAR(20) DEFAULT '',
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`sarpras_loans\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sarpras_loans\`;
CREATE TABLE \`sarpras_loans\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`itemId\` VARCHAR(100) NOT NULL,
  \`itemName\` VARCHAR(255) NOT NULL,
  \`borrowerId\` VARCHAR(100) NOT NULL,
  \`borrowerName\` VARCHAR(255) NOT NULL,
  \`qty\` INT NOT NULL DEFAULT 1,
  \`loanDate\` VARCHAR(50) NOT NULL,
  \`returnDate\` VARCHAR(50) DEFAULT '',
  \`status\` VARCHAR(50) DEFAULT 'dipinjam',
  \`notes\` TEXT,
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_loan_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`sarpras_proposals\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sarpras_proposals\`;
CREATE TABLE \`sarpras_proposals\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`itemName\` VARCHAR(255) NOT NULL,
  \`qty\` INT NOT NULL DEFAULT 1,
  \`estimatedPrice\` BIGINT NOT NULL DEFAULT 0,
  \`totalPrice\` BIGINT NOT NULL DEFAULT 0,
  \`date\` VARCHAR(50) NOT NULL,
  \`urgency\` VARCHAR(50) DEFAULT 'Biasa',
  \`status\` VARCHAR(50) DEFAULT 'pending',
  \`description\` TEXT,
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Struktur Tabel: \`spmb_candidates\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`spmb_candidates\`;
CREATE TABLE \`spmb_candidates\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`token\` VARCHAR(50) NOT NULL UNIQUE,
  \`fullName\` VARCHAR(255) NOT NULL,
  \`nisn\` VARCHAR(50) DEFAULT '',
  \`nik\` VARCHAR(50) DEFAULT '',
  \`gender\` VARCHAR(20) DEFAULT '',
  \`originSchool\` VARCHAR(255) DEFAULT '',
  \`parentName\` VARCHAR(255) DEFAULT '',
  \`parentPhone\` VARCHAR(50) DEFAULT '',
  \`status\` VARCHAR(50) DEFAULT 'menunggu_verifikasi',
  \`raw_data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_token\` (\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
\n`;

  // Helper to escape SQL values
  const sqlEscape = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'object') val = JSON.stringify(val);
    return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  };

  // Dump students
  if (Array.isArray(state.students) && state.students.length > 0) {
    dump += `-- Data untuk tabel \`students\`\n`;
    dump += `INSERT INTO \`students\` (\`id\`, \`name\`, \`nis\`, \`nisn\`, \`class\`, \`gender\`, \`parentPhone\`, \`parentName\`, \`address\`, \`status\`, \`savingsBalance\`, \`sppNominal\`, \`raw_data\`) VALUES\n`;
    const studentRows = state.students.map((s: any) => {
      return `(${sqlEscape(s.id || s.nis)}, ${sqlEscape(s.name)}, ${sqlEscape(s.nis)}, ${sqlEscape(s.nisn || '')}, ${sqlEscape(s.class || '')}, ${sqlEscape(s.gender || '')}, ${sqlEscape(s.parentPhone || '')}, ${sqlEscape(s.parentName || '')}, ${sqlEscape(s.address || '')}, ${sqlEscape(s.status || 'active')}, ${Number(s.savingsBalance) || 0}, ${Number(s.sppNominal) || 0}, ${sqlEscape(s)})`;
    });
    dump += studentRows.join(',\n') + ';\n\n';
  }

  // Dump spp_bills
  if (Array.isArray(state.sppBills) && state.sppBills.length > 0) {
    dump += `-- Data untuk tabel \`spp_bills\`\n`;
    dump += `INSERT INTO \`spp_bills\` (\`id\`, \`studentId\`, \`studentName\`, \`nis\`, \`class\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paymentMethod\`, \`paymentDate\`, \`receiptNo\`, \`orderId\`, \`raw_data\`) VALUES\n`;
    const rows = state.sppBills.map((b: any) => {
      return `(${sqlEscape(b.id)}, ${sqlEscape(b.studentId || '')}, ${sqlEscape(b.studentName || '')}, ${sqlEscape(b.nis || '')}, ${sqlEscape(b.class || '')}, ${sqlEscape(b.month || '')}, ${sqlEscape(b.year || '')}, ${Number(b.amount) || 0}, ${sqlEscape(b.status || 'unpaid')}, ${sqlEscape(b.paymentMethod || '')}, ${sqlEscape(b.paymentDate || '')}, ${sqlEscape(b.receiptNo || '')}, ${sqlEscape(b.orderId || '')}, ${sqlEscape(b)})`;
    });
    dump += rows.join(',\n') + ';\n\n';
  }

  // Dump misc_bills
  if (Array.isArray(state.miscBills) && state.miscBills.length > 0) {
    dump += `-- Data untuk tabel \`misc_bills\`\n`;
    dump += `INSERT INTO \`misc_bills\` (\`id\`, \`studentId\`, \`studentName\`, \`nis\`, \`class\`, \`title\`, \`category\`, \`amount\`, \`paidAmount\`, \`status\`, \`paymentDate\`, \`raw_data\`) VALUES\n`;
    const rows = state.miscBills.map((b: any) => {
      return `(${sqlEscape(b.id)}, ${sqlEscape(b.studentId || '')}, ${sqlEscape(b.studentName || '')}, ${sqlEscape(b.nis || '')}, ${sqlEscape(b.class || '')}, ${sqlEscape(b.title || '')}, ${sqlEscape(b.category || '')}, ${Number(b.amount) || 0}, ${Number(b.paidAmount) || 0}, ${sqlEscape(b.status || 'unpaid')}, ${sqlEscape(b.paymentDate || '')}, ${sqlEscape(b)})`;
    });
    dump += rows.join(',\n') + ';\n\n';
  }

  // Dump savings_transactions
  if (Array.isArray(state.savingsTransactions) && state.savingsTransactions.length > 0) {
    dump += `-- Data untuk tabel \`savings_transactions\`\n`;
    dump += `INSERT INTO \`savings_transactions\` (\`id\`, \`studentId\`, \`studentName\`, \`nis\`, \`class\`, \`type\`, \`amount\`, \`previousBalance\`, \`currentBalance\`, \`description\`, \`date\`, \`raw_data\`) VALUES\n`;
    const rows = state.savingsTransactions.map((t: any) => {
      return `(${sqlEscape(t.id)}, ${sqlEscape(t.studentId || '')}, ${sqlEscape(t.studentName || '')}, ${sqlEscape(t.nis || '')}, ${sqlEscape(t.class || '')}, ${sqlEscape(t.type || '')}, ${Number(t.amount) || 0}, ${Number(t.previousBalance) || 0}, ${Number(t.currentBalance) || 0}, ${sqlEscape(t.description || '')}, ${sqlEscape(t.date || '')}, ${sqlEscape(t)})`;
    });
    dump += rows.join(',\n') + ';\n\n';
  }

  // Dump treasurer_transactions
  if (Array.isArray(state.treasurerTransactions) && state.treasurerTransactions.length > 0) {
    dump += `-- Data untuk tabel \`treasurer_transactions\`\n`;
    dump += `INSERT INTO \`treasurer_transactions\` (\`id\`, \`type\`, \`category\`, \`amount\`, \`description\`, \`date\`, \`source\`, \`createdBy\`, \`noBukti\`, \`raw_data\`) VALUES\n`;
    const rows = state.treasurerTransactions.map((t: any) => {
      return `(${sqlEscape(t.id)}, ${sqlEscape(t.type || '')}, ${sqlEscape(t.category || '')}, ${Number(t.amount) || 0}, ${sqlEscape(t.description || '')}, ${sqlEscape(t.date || '')}, ${sqlEscape(t.source || '')}, ${sqlEscape(t.createdBy || '')}, ${sqlEscape(t.noBukti || '')}, ${sqlEscape(t)})`;
    });
    dump += rows.join(',\n') + ';\n\n';
  }

  // Dump sarpras_items
  if (Array.isArray(state.sarprasItems) && state.sarprasItems.length > 0) {
    dump += `-- Data untuk tabel \`sarpras_items\`\n`;
    dump += `INSERT INTO \`sarpras_items\` (\`id\`, \`name\`, \`code\`, \`category\`, \`location\`, \`totalQty\`, \`availableQty\`, \`condition\`, \`purchaseYear\`, \`raw_data\`) VALUES\n`;
    const rows = state.sarprasItems.map((s: any) => {
      return `(${sqlEscape(s.id)}, ${sqlEscape(s.name || '')}, ${sqlEscape(s.code || '')}, ${sqlEscape(s.category || '')}, ${sqlEscape(s.location || '')}, ${Number(s.totalQty) || 1}, ${Number(s.availableQty) || 1}, ${sqlEscape(s.condition || 'Baik')}, ${sqlEscape(s.purchaseYear || '')}, ${sqlEscape(s)})`;
    });
    dump += rows.join(',\n') + ';\n\n';
  }

  // Dump sarpras_loans
  if (Array.isArray(state.sarprasLoans) && state.sarprasLoans.length > 0) {
    dump += `-- Data untuk tabel \`sarpras_loans\`\n`;
    dump += `INSERT INTO \`sarpras_loans\` (\`id\`, \`itemId\`, \`itemName\`, \`borrowerId\`, \`borrowerName\`, \`qty\`, \`loanDate\`, \`returnDate\`, \`status\`, \`notes\`, \`raw_data\`) VALUES\n`;
    const rows = state.sarprasLoans.map((l: any) => {
      return `(${sqlEscape(l.id)}, ${sqlEscape(l.itemId || '')}, ${sqlEscape(l.itemName || '')}, ${sqlEscape(l.borrowerId || '')}, ${sqlEscape(l.borrowerName || '')}, ${Number(l.qty) || 1}, ${sqlEscape(l.loanDate || '')}, ${sqlEscape(l.returnDate || '')}, ${sqlEscape(l.status || 'dipinjam')}, ${sqlEscape(l.notes || '')}, ${sqlEscape(l)})`;
    });
    dump += rows.join(',\n') + ';\n\n';
  }

  // Dump system_configs
  const configKeys = [
    'schoolIdentity', 'sppRates', 'midtransConfig', 'whatsappConfig', 
    'treasurerConfig', 'principalConfig', 'sarprasConfig', 'salaryConfig', 
    'backupConfig', 'bkConfig', 'curriculumConfig', 'adminConfig', 'spmbConfig'
  ];
  const configRows: string[] = [];
  for (const k of configKeys) {
    if (state[k]) {
      configRows.push(`(${sqlEscape(k)}, ${sqlEscape(JSON.stringify(state[k]))})`);
    }
  }
  if (configRows.length > 0) {
    dump += `-- Data untuk tabel \`system_configs\`\n`;
    dump += `INSERT INTO \`system_configs\` (\`key_name\`, \`config_data\`) VALUES\n` + configRows.join(',\n') + ';\n\n';
  }

  dump += `SET FOREIGN_KEY_CHECKS = 1;\n-- Selesai diekspor!\n`;
  return dump;
}
