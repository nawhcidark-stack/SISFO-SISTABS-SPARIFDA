import fs from 'fs';
import path from 'path';
import mysql, { PoolOptions, RowDataPacket } from 'mysql2/promise';
import { MySQLConfig, MySQLTestResult, MySQLSyncResult, MySQLQueryResult } from '../types';

const CONFIG_FILE = path.join(process.cwd(), 'mysql_config.json');
const SCHEMA_FILE = path.join(process.cwd(), 'database_schema.sql');

// Default initial configuration
let currentConfig: MySQLConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'db_smp_maarif',
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  tablePrefix: '',
  charset: 'utf8mb4',
  sslMode: 'none',
  socketPath: '',
  enabled: false,
  autoSync: false,
  status: 'disconnected',
};

// Load saved config on startup if present
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    currentConfig = { ...currentConfig, ...parsed };
  }
} catch (err) {
  console.warn('[MySQL Service] Failed to load mysql_config.json, using defaults:', err);
}

export function getMySQLConfig(): MySQLConfig {
  return { ...currentConfig };
}

export function saveMySQLConfig(config: Partial<MySQLConfig>): MySQLConfig {
  currentConfig = {
    ...currentConfig,
    ...config,
    port: Number(config.port) || 3306,
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('[MySQL Service] Error saving config file:', err);
  }

  return { ...currentConfig };
}

// Helper to create connection options
function createConnectionOptions(cfg: MySQLConfig): PoolOptions {
  const options: PoolOptions = {
    host: cfg.host || 'localhost',
    port: Number(cfg.port) || 3306,
    user: cfg.user || 'root',
    password: cfg.password || '',
    database: cfg.database || undefined,
    charset: cfg.charset ? cfg.charset.toUpperCase() : 'UTF8MB4_UNICODE_CI',
    connectTimeout: 10000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    multipleStatements: true,
  };

  if (cfg.socketPath && cfg.socketPath.trim()) {
    options.socketPath = cfg.socketPath.trim();
  }

  if (cfg.sslMode === 'required') {
    options.ssl = { rejectUnauthorized: false };
  }

  return options;
}

// Live connection test
export async function testMySQLConnection(overrideConfig?: Partial<MySQLConfig>): Promise<MySQLTestResult> {
  const cfg = overrideConfig ? { ...currentConfig, ...overrideConfig } : currentConfig;
  const startTime = Date.now();

  try {
    const pool = mysql.createPool(createConnectionOptions(cfg));
    const conn = await pool.getConnection();
    const latencyMs = Date.now() - startTime;

    // Get Server Version
    const [versionRows] = await conn.query<RowDataPacket[]>('SELECT VERSION() as version, DATABASE() as current_db');
    const serverVersion = (versionRows[0] as any)?.version || 'MySQL / MariaDB';
    const activeDb = (versionRows[0] as any)?.current_db || cfg.database;

    // Get Tables & Row counts
    let tables: Array<{ name: string; rows: number; engine?: string; collation?: string }> = [];
    if (activeDb) {
      const [tableRows] = await conn.query<RowDataPacket[]>(
        `SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION 
         FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = ?`,
        [activeDb]
      );

      tables = (tableRows as any[]).map((t) => ({
        name: t.TABLE_NAME,
        rows: Number(t.TABLE_ROWS || 0),
        engine: t.ENGINE || 'InnoDB',
        collation: t.TABLE_COLLATION || 'utf8mb4_unicode_ci',
      }));
    }

    conn.release();
    await pool.end();

    // Update status in config
    currentConfig.status = 'connected';
    currentConfig.lastConnectedAt = new Date().toISOString();
    saveMySQLConfig(currentConfig);

    return {
      success: true,
      message: `Berhasil terhubung ke database MySQL di ${cfg.host}:${cfg.port}!`,
      latencyMs,
      serverVersion,
      databaseName: activeDb,
      tablesCount: tables.length,
      tables,
    };
  } catch (err: any) {
    currentConfig.status = 'error';
    saveMySQLConfig(currentConfig);

    let friendlyMsg = err.message || 'Gagal terhubung ke database MySQL.';
    if (err.code === 'ECONNREFUSED') {
      friendlyMsg = `Koneksi ditolak (Connection Refused). Pastikan server MySQL aktif di ${cfg.host}:${cfg.port} dan menerima koneksi jaringan.`;
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      friendlyMsg = `Akses ditolak untuk user '${cfg.user}' (Password salah atau user tidak memiliki hak akses/privilege).`;
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      friendlyMsg = `Database '${cfg.database}' belum ada di phpMyAdmin/MySQL server. Anda dapat membuatnya terlebih dahulu melalui phpMyAdmin atau cPanel.`;
    } else if (err.code === 'ETIMEDOUT') {
      friendlyMsg = `Koneksi timed out. Pastikan IP/Port server tidak diblokir oleh firewall hosting cPanel (Remote MySQL).`;
    }

    return {
      success: false,
      message: friendlyMsg,
      error: err.code || err.message,
    };
  }
}

// Run Migration from database_schema.sql
export async function runMySQLMigration(overrideConfig?: Partial<MySQLConfig>): Promise<MySQLSyncResult> {
  const cfg = overrideConfig ? { ...currentConfig, ...overrideConfig } : currentConfig;
  const startTime = Date.now();

  try {
    if (!fs.existsSync(SCHEMA_FILE)) {
      throw new Error(`File skema tidak ditemukan di: ${SCHEMA_FILE}`);
    }

    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const pool = mysql.createPool(createConnectionOptions(cfg));
    const conn = await pool.getConnection();

    // Split SQL by semicolon safely or run multiple statements
    await conn.query(schemaSql);

    // Verify created tables
    const [tables] = await conn.query<RowDataPacket[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [cfg.database]
    );

    conn.release();
    await pool.end();

    const durationMs = Date.now() - startTime;
    return {
      success: true,
      message: `Migrasi skema database berhasil dieksekusi! ${tables.length} tabel siap digunakan di phpMyAdmin.`,
      tablesCreated: tables.length,
      durationMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menjalankan migrasi skema SQL: ${err.message}`,
      error: err.message,
      durationMs: Date.now() - startTime,
    };
  }
}

// Synchronize all application data into MySQL tables
export async function syncAppDataToMySQL(appData: {
  students?: any[];
  sppBills?: any[];
  savingsTransactions?: any[];
  schoolIdentity?: any;
  homeroomTeachers?: any[];
  subjectTeachers?: any[];
  classSchedules?: any[];
  teachingJournals?: any[];
  miscBills?: any[];
  spmbRegistrations?: any[];
}): Promise<MySQLSyncResult> {
  const startTime = Date.now();
  const recordsSynced: Record<string, number> = {};

  try {
    const pool = mysql.createPool(createConnectionOptions(currentConfig));
    const conn = await pool.getConnection();

    // 1. Sync School Identity
    if (appData.schoolIdentity) {
      const si = appData.schoolIdentity;
      await conn.query(
        `INSERT INTO school_identity (id, name, npsn, address, phone, email, website, principal_name, principal_nip, academic_year, semester)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          name = VALUES(name), npsn = VALUES(npsn), address = VALUES(address), phone = VALUES(phone),
          email = VALUES(email), website = VALUES(website), principal_name = VALUES(principal_name),
          principal_nip = VALUES(principal_nip), academic_year = VALUES(academic_year), semester = VALUES(semester)`,
        [
          si.name || '',
          si.npsn || '',
          si.address || '',
          si.phone || '',
          si.email || '',
          si.website || '',
          si.principalName || '',
          si.principalNip || '',
          si.academicYear || '',
          si.semester || 'Ganjil',
        ]
      );
      recordsSynced.school_identity = 1;
    }

    // 2. Sync Students
    if (Array.isArray(appData.students) && appData.students.length > 0) {
      let studentCount = 0;
      for (const s of appData.students) {
        await conn.query(
          `INSERT INTO students (
            id, nis, nisn, name, nickname, class, gender, email, phone, password,
            savings_balance, status, nik, birth_place, birth_date, kk_number,
            birth_cert_number, living_with, child_order, siblings_count, step_siblings_count,
            address, photo_url, google_drive_link, father_name, father_nik, father_occupation,
            father_phone, mother_name, mother_nik, mother_occupation, mother_phone,
            is_spp_exempt, custom_spp_rate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nis = VALUES(nis), nisn = VALUES(nisn), name = VALUES(name), nickname = VALUES(nickname),
            class = VALUES(class), gender = VALUES(gender), email = VALUES(email), phone = VALUES(phone),
            password = VALUES(password), savings_balance = VALUES(savings_balance), status = VALUES(status),
            nik = VALUES(nik), birth_place = VALUES(birth_place), birth_date = VALUES(birth_date),
            kk_number = VALUES(kk_number), birth_cert_number = VALUES(birth_cert_number),
            living_with = VALUES(living_with), child_order = VALUES(child_order), siblings_count = VALUES(siblings_count),
            step_siblings_count = VALUES(step_siblings_count), address = VALUES(address), photo_url = VALUES(photo_url),
            google_drive_link = VALUES(google_drive_link), father_name = VALUES(father_name), father_nik = VALUES(father_nik),
            father_occupation = VALUES(father_occupation), father_phone = VALUES(father_phone),
            mother_name = VALUES(mother_name), mother_nik = VALUES(mother_nik), mother_occupation = VALUES(mother_occupation),
            mother_phone = VALUES(mother_phone), is_spp_exempt = VALUES(is_spp_exempt), custom_spp_rate = VALUES(custom_spp_rate)`,
          [
            s.id,
            s.nis,
            s.nisn || null,
            s.name,
            s.nickname || null,
            s.class,
            s.gender || 'Laki-laki',
            s.email || null,
            s.phone || null,
            s.password || '123456',
            s.savingsBalance || 0,
            s.status || 'Aktif',
            s.nik || null,
            s.birthPlace || null,
            s.birthDate || null,
            s.kkNumber || null,
            s.birthCertNumber || null,
            s.livingWith || null,
            Number(s.childOrder) || 1,
            Number(s.siblingsCount) || 0,
            Number(s.stepSiblingsCount) || 0,
            s.address || null,
            s.photoUrl || null,
            s.googleDriveLink || null,
            s.fatherName || null,
            s.fatherNik || null,
            s.fatherOccupation || null,
            s.fatherPhone || null,
            s.motherName || null,
            s.motherNik || null,
            s.motherOccupation || null,
            s.motherPhone || null,
            s.isSppExempt ? 1 : 0,
            s.customSppRate || null,
          ]
        );
        studentCount++;
      }
      recordsSynced.students = studentCount;
    }

    // 3. Sync SPP Bills
    if (Array.isArray(appData.sppBills) && appData.sppBills.length > 0) {
      let billCount = 0;
      for (const b of appData.sppBills) {
        await conn.query(
          `INSERT INTO spp_bills (id, student_id, month, year, amount, status, paid_at, payment_method, order_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            amount = VALUES(amount), status = VALUES(status), paid_at = VALUES(paid_at),
            payment_method = VALUES(payment_method), order_id = VALUES(order_id)`,
          [
            b.id,
            b.studentId,
            b.month,
            b.year,
            b.amount,
            b.status,
            b.paidAt ? new Date(b.paidAt) : null,
            b.paymentMethod || null,
            b.orderId || null,
          ]
        );
        billCount++;
      }
      recordsSynced.spp_bills = billCount;
    }

    // 4. Sync Savings Transactions
    if (Array.isArray(appData.savingsTransactions) && appData.savingsTransactions.length > 0) {
      let txCount = 0;
      for (const t of appData.savingsTransactions) {
        await conn.query(
          `INSERT INTO savings_transactions (id, student_id, type, amount, status, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            amount = VALUES(amount), status = VALUES(status), note = VALUES(note)`,
          [
            t.id,
            t.studentId,
            t.type,
            t.amount,
            t.status || 'success',
            t.note || null,
            t.createdAt ? new Date(t.createdAt) : new Date(),
          ]
        );
        txCount++;
      }
      recordsSynced.savings_transactions = txCount;
    }

    // 5. Sync Homerooms
    if (Array.isArray(appData.homeroomTeachers) && appData.homeroomTeachers.length > 0) {
      let hrCount = 0;
      for (const hr of appData.homeroomTeachers) {
        await conn.query(
          `INSERT INTO homeroom_teachers (id, name, class_name, username, password, phone, sk_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            name = VALUES(name), class_name = VALUES(class_name), username = VALUES(username),
            password = VALUES(password), phone = VALUES(phone), sk_url = VALUES(sk_url)`,
          [
            hr.id,
            hr.name,
            hr.className,
            hr.username,
            hr.password || '123456',
            hr.phone || null,
            hr.skUrl || null,
          ]
        );
        hrCount++;
      }
      recordsSynced.homerooms = hrCount;
    }

    // 6. Sync Subject Teachers
    if (Array.isArray(appData.subjectTeachers) && appData.subjectTeachers.length > 0) {
      let stCount = 0;
      for (const st of appData.subjectTeachers) {
        await conn.query(
          `INSERT INTO subject_teachers (id, name, nip, subject, username, password, phone, assigned_classes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            name = VALUES(name), nip = VALUES(nip), subject = VALUES(subject),
            username = VALUES(username), password = VALUES(password), phone = VALUES(phone),
            assigned_classes = VALUES(assigned_classes)`,
          [
            st.id,
            st.name,
            st.nip || null,
            st.subject,
            st.username,
            st.password || '123456',
            st.phone || null,
            JSON.stringify(st.assignedClasses || []),
          ]
        );
        stCount++;
      }
      recordsSynced.subject_teachers = stCount;
    }

    // 7. Sync Miscellaneous Bills
    if (Array.isArray(appData.miscBills) && appData.miscBills.length > 0) {
      let miscCount = 0;
      for (const m of appData.miscBills) {
        await conn.query(
          `INSERT INTO misc_bills (id, student_id, title, category, amount, status, due_date, paid_at, payment_method, order_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            title = VALUES(title), category = VALUES(category), amount = VALUES(amount),
            status = VALUES(status), due_date = VALUES(due_date), paid_at = VALUES(paid_at),
            payment_method = VALUES(payment_method), order_id = VALUES(order_id)`,
          [
            m.id,
            m.studentId,
            m.title,
            m.category || 'Lainnya',
            m.amount,
            m.status,
            m.dueDate || null,
            m.paidAt ? new Date(m.paidAt) : null,
            m.paymentMethod || null,
            m.orderId || null,
          ]
        );
        miscCount++;
      }
      recordsSynced.misc_bills = miscCount;
    }

    // 8. Sync SPMB Registrations
    if (Array.isArray(appData.spmbRegistrations) && appData.spmbRegistrations.length > 0) {
      let spmbCount = 0;
      for (const sp of appData.spmbRegistrations) {
        await conn.query(
          `INSERT INTO spmb_registrations (
            id, registration_number, full_name, nickname, gender, nisn, nik, birth_place,
            birth_date, phone, address, previous_school, wave, parent_name, parent_phone,
            status, re_registration_status, re_registration_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name), nickname = VALUES(nickname), gender = VALUES(gender),
            phone = VALUES(phone), address = VALUES(address), previous_school = VALUES(previous_school),
            status = VALUES(status), re_registration_status = VALUES(re_registration_status),
            re_registration_amount = VALUES(re_registration_amount)`,
          [
            sp.id,
            sp.registrationNumber || sp.id,
            sp.fullName || sp.name || '',
            sp.nickname || null,
            sp.gender || 'Laki-laki',
            sp.nisn || null,
            sp.nik || null,
            sp.birthPlace || null,
            sp.birthDate || null,
            sp.phone || null,
            sp.address || null,
            sp.previousSchool || null,
            sp.wave || 'Gelombang 1',
            sp.parentName || sp.fatherName || null,
            sp.parentPhone || sp.phone || null,
            sp.status || 'registered',
            sp.reRegistrationStatus || 'unpaid',
            sp.reRegistrationAmount || 0,
          ]
        );
        spmbCount++;
      }
      recordsSynced.spmb_registrations = spmbCount;
    }

    conn.release();
    await pool.end();

    currentConfig.lastSyncAt = new Date().toISOString();
    saveMySQLConfig(currentConfig);

    return {
      success: true,
      message: 'Sinkronisasi seluruh data ke database MySQL/phpMyAdmin berhasil diselesaikan!',
      recordsSynced,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal sinkronisasi data ke MySQL: ${err.message}`,
      error: err.message,
      recordsSynced,
      durationMs: Date.now() - startTime,
    };
  }
}

// Execute safe administrative SQL query from Admin UI
export async function executeMySQLQuery(sql: string): Promise<MySQLQueryResult> {
  const startTime = Date.now();
  try {
    const trimmed = sql.trim();
    if (!trimmed) {
      return { success: false, message: 'Query SQL tidak boleh kosong.' };
    }

    // Safety checks for dangerous commands
    const upper = trimmed.toUpperCase();
    if (upper.startsWith('DROP DATABASE') || upper.startsWith('SHUTDOWN')) {
      return { success: false, message: 'Perintah berbahaya tidak diizinkan melalui konsol admin.' };
    }

    const pool = mysql.createPool(createConnectionOptions(currentConfig));
    const conn = await pool.getConnection();

    const [results, fields] = await conn.query<any>(trimmed);
    const executionTimeMs = Date.now() - startTime;

    conn.release();
    await pool.end();

    if (Array.isArray(results)) {
      const fieldNames = fields ? (fields as any[]).map((f) => f.name) : Object.keys(results[0] || {});
      return {
        success: true,
        message: `Query berhasil dieksekusi (${results.length} baris, ${executionTimeMs} ms).`,
        query: trimmed,
        rows: results.slice(0, 100), // limit to max 100 rows preview
        fields: fieldNames,
        affectedRows: results.length,
        executionTimeMs,
      };
    } else {
      return {
        success: true,
        message: `Query berhasil (${results.affectedRows || 0} baris terpengaruh, ${executionTimeMs} ms).`,
        query: trimmed,
        affectedRows: results.affectedRows || 0,
        executionTimeMs,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Error SQL: ${err.message}`,
      error: err.code || err.message,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

// Generate code snippets for various languages and phpMyAdmin
export function generateConnectionSnippets(cfg: MySQLConfig) {
  const host = cfg.host || 'localhost';
  const port = cfg.port || 3306;
  const db = cfg.database || 'db_smp_maarif';
  const user = cfg.user || 'root';
  const pass = cfg.password || '';
  const charset = cfg.charset || 'utf8mb4';

  return {
    // 1. PHP PDO (Modern Standard for phpMyAdmin / cPanel PHP)
    phpPdo: `<?php
// Koneksi Database SMP Maarif NU Pandaan (PDO PHP)
$db_host = '${host}';
$db_port = ${port};
$db_name = '${db}';
$db_user = '${user}';
$db_pass = '${pass}';
$charset = '${charset}';

$dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
    // Koneksi Berhasil
} catch (\\PDOException $e) {
    die("Koneksi MySQL Gagal: " . $e->getMessage());
}
?>`,

    // 2. PHP mysqli Procedural & OOP
    phpMysqli: `<?php
// Koneksi Database SMP Maarif NU Pandaan (mysqli)
$conn = mysqli_connect('${host}', '${user}', '${pass}', '${db}', ${port});

if (!$conn) {
    die("Koneksi Gagal: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "${charset}");
?>`,

    // 3. .env format
    envConfig: `# Konfigurasi Database MySQL / phpMyAdmin SMP Maarif NU
DB_HOST=${host}
DB_PORT=${port}
DB_NAME=${db}
DB_USER=${user}
DB_PASSWORD=${pass}
DB_CHARSET=${charset}
`,

    // 4. cPanel config.php standard
    cpanelConfig: `<?php
/**
 * Konfigurasi Database phpMyAdmin / cPanel
 * SMP Maarif NU Pandaan
 */
define('DB_SERVER', '${host}');
define('DB_PORT', ${port});
define('DB_USERNAME', '${user}');
define('DB_PASSWORD', '${pass}');
define('DB_NAME', '${db}');

$db = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT);
if ($db->connect_error) {
    die("ERROR: Tidak dapat terhubung ke MySQL. " . $db->connect_error);
}
?>`,
  };
}
