import mysql from 'mysql2/promise';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

export interface MySqlTestResult {
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

export interface MigrationSummary {
  success: boolean;
  totalRecordsMigrated: number;
  tableDetails: {
    tableName: string;
    count: number;
    status: 'success' | 'error' | 'skipped';
    message?: string;
  }[];
  durationMs: number;
  timestamp: string;
  error?: string;
}

// SQL Schema DDL definition for phpMyAdmin / MySQL
export const MYSQL_TABLE_SCHEMAS: { [key: string]: string } = {
  students: `CREATE TABLE IF NOT EXISTS \`students\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`nis\` VARCHAR(32) NOT NULL,
    \`nisn\` VARCHAR(32) DEFAULT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`nickname\` VARCHAR(64) DEFAULT NULL,
    \`class\` VARCHAR(32) NOT NULL,
    \`gender\` ENUM('Laki-laki', 'Perempuan') DEFAULT 'Laki-laki',
    \`email\` VARCHAR(120) DEFAULT NULL,
    \`phone\` VARCHAR(32) DEFAULT NULL,
    \`password\` VARCHAR(255) DEFAULT '123456',
    \`savings_balance\` DECIMAL(15,2) DEFAULT 0.00,
    \`status\` ENUM('Aktif', 'Lulus', 'Keluar', 'Mutasi') DEFAULT 'Aktif',
    \`nik\` VARCHAR(32) DEFAULT NULL,
    \`birth_place\` VARCHAR(64) DEFAULT NULL,
    \`birth_date\` VARCHAR(32) DEFAULT NULL,
    \`kk_number\` VARCHAR(32) DEFAULT NULL,
    \`birth_cert_number\` VARCHAR(64) DEFAULT NULL,
    \`living_with\` VARCHAR(64) DEFAULT NULL,
    \`child_order\` INT DEFAULT 1,
    \`siblings_count\` INT DEFAULT 0,
    \`step_siblings_count\` INT DEFAULT 0,
    \`address\` TEXT DEFAULT NULL,
    \`photo_url\` TEXT DEFAULT NULL,
    \`google_drive_link\` TEXT DEFAULT NULL,
    \`father_name\` VARCHAR(150) DEFAULT NULL,
    \`father_nik\` VARCHAR(32) DEFAULT NULL,
    \`father_birth_place\` VARCHAR(64) DEFAULT NULL,
    \`father_birth_date\` VARCHAR(32) DEFAULT NULL,
    \`father_education\` VARCHAR(64) DEFAULT NULL,
    \`father_occupation\` VARCHAR(64) DEFAULT NULL,
    \`father_income\` VARCHAR(64) DEFAULT NULL,
    \`father_address\` TEXT DEFAULT NULL,
    \`father_phone\` VARCHAR(32) DEFAULT NULL,
    \`father_status\` ENUM('Hidup', 'Meninggal') DEFAULT 'Hidup',
    \`mother_name\` VARCHAR(150) DEFAULT NULL,
    \`mother_nik\` VARCHAR(32) DEFAULT NULL,
    \`mother_birth_place\` VARCHAR(64) DEFAULT NULL,
    \`mother_birth_date\` VARCHAR(32) DEFAULT NULL,
    \`mother_education\` VARCHAR(64) DEFAULT NULL,
    \`mother_occupation\` VARCHAR(64) DEFAULT NULL,
    \`mother_income\` VARCHAR(64) DEFAULT NULL,
    \`mother_address\` TEXT DEFAULT NULL,
    \`mother_phone\` VARCHAR(32) DEFAULT NULL,
    \`mother_status\` ENUM('Hidup', 'Meninggal') DEFAULT 'Hidup',
    \`guardian_name\` VARCHAR(150) DEFAULT NULL,
    \`guardian_nik\` VARCHAR(32) DEFAULT NULL,
    \`guardian_occupation\` VARCHAR(64) DEFAULT NULL,
    \`guardian_phone\` VARCHAR(32) DEFAULT NULL,
    \`guardian_address\` TEXT DEFAULT NULL,
    \`is_spp_exempt\` TINYINT(1) DEFAULT 0,
    \`spp_exemption_reason\` TEXT DEFAULT NULL,
    \`spp_exemption_type\` VARCHAR(64) DEFAULT NULL,
    \`custom_spp_rate\` DECIMAL(12,2) DEFAULT NULL,
    \`mutation_date\` VARCHAR(32) DEFAULT NULL,
    \`mutation_reason\` TEXT DEFAULT NULL,
    \`mutation_destination\` VARCHAR(150) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_nis\` (\`nis\`),
    KEY \`idx_student_class\` (\`class\`),
    KEY \`idx_student_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  spp_bills: `CREATE TABLE IF NOT EXISTS \`spp_bills\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`month\` VARCHAR(32) NOT NULL,
    \`year\` INT NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`status\` ENUM('paid', 'unpaid', 'pending', 'waived') DEFAULT 'unpaid',
    \`paid_at\` DATETIME DEFAULT NULL,
    \`payment_method\` VARCHAR(64) DEFAULT NULL,
    \`order_id\` VARCHAR(100) DEFAULT NULL,
    \`transaction_id\` VARCHAR(100) DEFAULT NULL,
    \`achievement_type\` VARCHAR(64) DEFAULT NULL,
    \`achievement_detail\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_spp_student\` (\`student_id\`),
    KEY \`idx_spp_period\` (\`year\`, \`month\`),
    KEY \`idx_spp_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  savings_transactions: `CREATE TABLE IF NOT EXISTS \`savings_transactions\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`type\` ENUM('deposit', 'withdrawal') NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`status\` ENUM('success', 'pending', 'failed') DEFAULT 'success',
    \`payment_method\` VARCHAR(64) DEFAULT 'Tunai',
    \`order_id\` VARCHAR(100) DEFAULT NULL,
    \`transaction_id\` VARCHAR(100) DEFAULT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_savings_student\` (\`student_id\`),
    KEY \`idx_savings_type\` (\`type\`),
    KEY \`idx_savings_date\` (\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  misc_bills: `CREATE TABLE IF NOT EXISTS \`misc_bills\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`status\` ENUM('paid', 'unpaid', 'pending') DEFAULT 'unpaid',
    \`is_monthly\` TINYINT(1) DEFAULT 0,
    \`month\` VARCHAR(32) DEFAULT NULL,
    \`paid_at\` DATETIME DEFAULT NULL,
    \`payment_method\` VARCHAR(64) DEFAULT NULL,
    \`order_id\` VARCHAR(100) DEFAULT NULL,
    \`transaction_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_misc_student\` (\`student_id\`),
    KEY \`idx_misc_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  attendance_logs: `CREATE TABLE IF NOT EXISTS \`attendance_logs\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`student_name\` VARCHAR(150) DEFAULT NULL,
    \`class_name\` VARCHAR(32) DEFAULT NULL,
    \`date\` DATE NOT NULL,
    \`status\` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat') NOT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`subject_notes\` JSON DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_attendance_student_date\` (\`student_id\`, \`date\`),
    KEY \`idx_attendance_class_date\` (\`class_name\`, \`date\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  homeroom_teachers: `CREATE TABLE IF NOT EXISTS \`homeroom_teachers\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`username\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`class_name\` VARCHAR(32) NOT NULL,
    \`password\` VARCHAR(255) DEFAULT '123456',
    \`sk_url\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_homeroom_user\` (\`username\`),
    KEY \`idx_homeroom_class\` (\`class_name\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  subject_teachers: `CREATE TABLE IF NOT EXISTS \`subject_teachers\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`username\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`subject\` VARCHAR(100) NOT NULL,
    \`class_name\` VARCHAR(64) DEFAULT 'SEMUA KELAS',
    \`password\` VARCHAR(255) DEFAULT '123456',
    \`sk_url\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_subject_teacher_user\` (\`username\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  treasurer_transactions: `CREATE TABLE IF NOT EXISTS \`treasurer_transactions\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`type\` ENUM('incoming', 'outgoing') NOT NULL,
    \`category\` VARCHAR(64) NOT NULL,
    \`amount\` DECIMAL(15,2) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`date\` DATE NOT NULL,
    \`source\` VARCHAR(32) DEFAULT 'custom',
    \`student_name\` VARCHAR(150) DEFAULT NULL,
    \`student_id\` VARCHAR(64) DEFAULT NULL,
    \`nis\` VARCHAR(32) DEFAULT NULL,
    \`recipient_name\` VARCHAR(150) DEFAULT NULL,
    \`funding_source\` VARCHAR(100) DEFAULT NULL,
    \`payment_method\` VARCHAR(64) DEFAULT 'Tunai',
    \`kode_rekening\` VARCHAR(64) DEFAULT NULL,
    \`no_bukti\` VARCHAR(64) DEFAULT NULL,
    \`order_id\` VARCHAR(100) DEFAULT NULL,
    \`created_by\` VARCHAR(100) DEFAULT 'Bendahara',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_treasurer_type_date\` (\`type\`, \`date\`),
    KEY \`idx_treasurer_category\` (\`category\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  class_schedules: `CREATE TABLE IF NOT EXISTS \`class_schedules\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`day\` ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu') NOT NULL,
    \`class_name\` VARCHAR(32) NOT NULL,
    \`subject\` VARCHAR(100) NOT NULL,
    \`teacher_id\` VARCHAR(64) DEFAULT NULL,
    \`teacher_name\` VARCHAR(150) NOT NULL,
    \`jam_ke\` VARCHAR(32) NOT NULL,
    \`start_time\` VARCHAR(16) DEFAULT NULL,
    \`end_time\` VARCHAR(16) DEFAULT NULL,
    \`alokasi_waktu\` VARCHAR(32) DEFAULT '2 JP',
    \`academic_year\` VARCHAR(32) DEFAULT '2025/2026',
    \`semester\` VARCHAR(16) DEFAULT 'Ganjil',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_schedule_day_class\` (\`day\`, \`class_name\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  teaching_journals: `CREATE TABLE IF NOT EXISTS \`teaching_journals\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`teacher_id\` VARCHAR(64) NOT NULL,
    \`teacher_name\` VARCHAR(150) NOT NULL,
    \`teacher_type\` VARCHAR(32) DEFAULT 'subject_teacher',
    \`subject\` VARCHAR(100) NOT NULL,
    \`class_name\` VARCHAR(32) NOT NULL,
    \`date\` DATE NOT NULL,
    \`topic\` TEXT NOT NULL,
    \`attendance\` JSON DEFAULT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`fase\` VARCHAR(16) DEFAULT 'D',
    \`semester\` VARCHAR(16) DEFAULT 'Ganjil',
    \`alokasi_waktu\` VARCHAR(32) DEFAULT '2 JP',
    \`jam_ke\` VARCHAR(32) DEFAULT NULL,
    \`pertemuan_ke\` VARCHAR(32) DEFAULT NULL,
    \`tujuan_pembelajaran\` TEXT DEFAULT NULL,
    \`pencapaian_kktp\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_journal_teacher\` (\`teacher_id\`),
    KEY \`idx_journal_class_date\` (\`class_name\`, \`date\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  student_infraction_logs: `CREATE TABLE IF NOT EXISTS \`student_infraction_logs\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`student_name\` VARCHAR(150) NOT NULL,
    \`class_name\` VARCHAR(32) NOT NULL,
    \`date\` DATE NOT NULL,
    \`time\` VARCHAR(16) DEFAULT NULL,
    \`location\` VARCHAR(100) DEFAULT NULL,
    \`infraction_type\` TEXT NOT NULL,
    \`action_taken\` TEXT NOT NULL,
    \`resolution_status\` ENUM('Belum Selesai', 'Dalam Proses', 'Selesai') DEFAULT 'Belum Selesai',
    \`points\` INT DEFAULT 5,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_infraction_student\` (\`student_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  student_counseling_logs: `CREATE TABLE IF NOT EXISTS \`student_counseling_logs\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`student_name\` VARCHAR(150) NOT NULL,
    \`class_name\` VARCHAR(32) NOT NULL,
    \`date\` DATE NOT NULL,
    \`topic\` TEXT NOT NULL,
    \`action_plan\` TEXT NOT NULL,
    \`result\` TEXT NOT NULL,
    \`bk_feedback\` TEXT DEFAULT NULL,
    \`bk_feedback_at\` DATETIME DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_counseling_student\` (\`student_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  merdeka_assessments: `CREATE TABLE IF NOT EXISTS \`merdeka_assessments\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) NOT NULL,
    \`student_name\` VARCHAR(150) NOT NULL,
    \`class_name\` VARCHAR(32) NOT NULL,
    \`subject\` VARCHAR(100) NOT NULL,
    \`teacher_name\` VARCHAR(150) NOT NULL,
    \`semester\` VARCHAR(16) NOT NULL,
    \`academic_year\` VARCHAR(32) NOT NULL,
    \`tp1_name\` VARCHAR(150) DEFAULT NULL,
    \`tp1_tugas1\` DECIMAL(5,2) DEFAULT NULL,
    \`tp1_tugas2\` DECIMAL(5,2) DEFAULT NULL,
    \`tp1_uh\` DECIMAL(5,2) DEFAULT NULL,
    \`nilai_tp1\` DECIMAL(5,2) DEFAULT NULL,
    \`tp2_name\` VARCHAR(150) DEFAULT NULL,
    \`tp2_tugas1\` DECIMAL(5,2) DEFAULT NULL,
    \`tp2_tugas2\` DECIMAL(5,2) DEFAULT NULL,
    \`tp2_uh\` DECIMAL(5,2) DEFAULT NULL,
    \`nilai_tp2\` DECIMAL(5,2) DEFAULT NULL,
    \`nilai_sts\` DECIMAL(5,2) DEFAULT NULL,
    \`nilai_sas\` DECIMAL(5,2) DEFAULT NULL,
    \`nilai_akhir_rapor\` DECIMAL(5,2) DEFAULT NULL,
    \`capaian_kompetensi\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_assessment_student_subject\` (\`student_id\`, \`subject\`, \`semester\`, \`academic_year\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  midtrans_transactions: `CREATE TABLE IF NOT EXISTS \`midtrans_transactions\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`order_id\` VARCHAR(100) NOT NULL,
    \`transaction_id\` VARCHAR(100) DEFAULT NULL,
    \`student_id\` VARCHAR(64) DEFAULT NULL,
    \`student_name\` VARCHAR(150) DEFAULT NULL,
    \`student_nis\` VARCHAR(32) DEFAULT NULL,
    \`nisn\` VARCHAR(32) DEFAULT NULL,
    \`bill_type\` VARCHAR(32) DEFAULT 'spp',
    \`description\` TEXT DEFAULT NULL,
    \`gross_amount\` DECIMAL(12,2) NOT NULL,
    \`payment_type\` VARCHAR(64) DEFAULT NULL,
    \`transaction_status\` VARCHAR(32) NOT NULL,
    \`fraud_status\` VARCHAR(32) DEFAULT NULL,
    \`settlement_time\` VARCHAR(32) DEFAULT NULL,
    \`transaction_time\` VARCHAR(32) DEFAULT NULL,
    \`snap_token\` VARCHAR(255) DEFAULT NULL,
    \`raw_response\` JSON DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_order_id\` (\`order_id\`),
    KEY \`idx_midtrans_student\` (\`student_id\`),
    KEY \`idx_midtrans_status\` (\`transaction_status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  spmb_candidates: `CREATE TABLE IF NOT EXISTS \`spmb_candidates\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`registration_number\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`nisn\` VARCHAR(32) DEFAULT NULL,
    \`nik\` VARCHAR(32) DEFAULT NULL,
    \`gender\` ENUM('Laki-laki', 'Perempuan') DEFAULT 'Laki-laki',
    \`birth_place\` VARCHAR(64) DEFAULT NULL,
    \`birth_date\` VARCHAR(32) DEFAULT NULL,
    \`origin_school\` VARCHAR(150) DEFAULT NULL,
    \`phone\` VARCHAR(32) DEFAULT NULL,
    \`email\` VARCHAR(120) DEFAULT NULL,
    \`address\` TEXT DEFAULT NULL,
    \`status\` VARCHAR(32) DEFAULT 'Menunggu Verifikasi',
    \`session_id\` VARCHAR(64) DEFAULT NULL,
    \`payment_status\` VARCHAR(32) DEFAULT 'Belum Bayar',
    \`payment_amount\` DECIMAL(12,2) DEFAULT 0.00,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_reg_number\` (\`registration_number\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  sarpras_items: `CREATE TABLE IF NOT EXISTS \`sarpras_items\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`code\` VARCHAR(64) NOT NULL,
    \`category\` VARCHAR(100) DEFAULT NULL,
    \`condition\` VARCHAR(32) DEFAULT 'Baik',
    \`location\` VARCHAR(100) DEFAULT NULL,
    \`total_qty\` INT DEFAULT 1,
    \`available_qty\` INT DEFAULT 1,
    \`price\` DECIMAL(15,2) DEFAULT 0.00,
    \`purchase_year\` VARCHAR(16) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_item_code\` (\`code\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  realtime_notifications: `CREATE TABLE IF NOT EXISTS \`realtime_notifications\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`student_id\` VARCHAR(64) DEFAULT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`type\` ENUM('info', 'success', 'warning', 'payment') DEFAULT 'info',
    \`category\` VARCHAR(64) DEFAULT 'admin',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_notif_student\` (\`student_id\`),
    KEY \`idx_notif_created\` (\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  app_settings: `CREATE TABLE IF NOT EXISTS \`app_settings\` (
    \`key_name\` VARCHAR(64) NOT NULL,
    \`setting_value\` LONGTEXT NOT NULL,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`key_name\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
};

export class MySqlMigrationService {
  /**
   * Test direct connection to MySQL / phpMyAdmin server
   */
  static async testConnection(config: MySqlConfig): Promise<MySqlTestResult> {
    const startTime = Date.now();
    let conn: mysql.Connection | null = null;

    try {
      conn = await mysql.createConnection({
        host: config.host || 'localhost',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || undefined,
        connectTimeout: 10000,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      });

      const [versionRows]: any = await conn.query('SELECT VERSION() as version, NOW() as server_time, DATABASE() as current_db');
      const latencyMs = Date.now() - startTime;

      let tables: string[] = [];
      if (config.database) {
        const [tableRows]: any = await conn.query('SHOW TABLES');
        tables = tableRows.map((r: any) => Object.values(r)[0] as string);
      }

      await conn.end();

      const version = versionRows?.[0]?.version || 'Unknown';
      const serverTime = versionRows?.[0]?.server_time?.toString() || new Date().toISOString();
      const currentDb = versionRows?.[0]?.current_db || config.database;

      return {
        success: true,
        message: `Berhasil terhubung ke MySQL Server (${version}) di database "${currentDb}"!`,
        serverVersion: version,
        serverTime: serverTime,
        currentDatabase: currentDb,
        tables: tables,
        latencyMs: latencyMs,
      };
    } catch (err: any) {
      if (conn) {
        try { await conn.end(); } catch (_) {}
      }

      const latencyMs = Date.now() - startTime;
      let tip = 'Periksa kembali Host, Port, Username, Password, dan Nama Database.';

      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        tip = 'Akses ditolak oleh Firewall Hostinger. Buka hPanel Hostinger > "Remote MySQL" > Tambahkan IP server aplikasi atau tanda "%" (Any IP) untuk mengizinkan koneksi luar.';
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        tip = 'Kombinasi Username/Password salah. Di Hostinger, username database selalu diawali prefix (contoh: u123456789_namauser).';
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        tip = `Database "${config.database}" tidak ditemukan. Pastikan nama database lengkap ber-prefix (contoh: u123456789_${config.database}) atau buat database terlebih dahulu di hPanel/phpMyAdmin.`;
      }

      return {
        success: false,
        message: `Gagal terhubung: ${err.message}`,
        errorCode: err.code || 'UNKNOWN_ERROR',
        troubleshootingTip: tip,
        latencyMs: latencyMs,
      };
    }
  }

  /**
   * Migrate all live in-memory data to MySQL tables directly
   */
  static async migrateAllData(
    config: MySqlConfig,
    dataStore: {
      students: any[];
      sppBills: any[];
      savingsTransactions: any[];
      miscBills: any[];
      attendanceLogs: any[];
      homeroomTeachers: any[];
      subjectTeachers: any[];
      treasurerTransactions: any[];
      classSchedules: any[];
      teachingJournals: any[];
      studentInfractionLogs: any[];
      studentCounselingLogs: any[];
      merdekaAssessments: any[];
      midtransTransactions: any[];
      spmbCandidates?: any[];
      sarprasItems?: any[];
      notifications: any[];
      configs: { [key: string]: any };
    }
  ): Promise<MigrationSummary> {
    const startTime = Date.now();
    let conn: mysql.Connection | null = null;
    const tableDetails: MigrationSummary['tableDetails'] = [];
    let totalRecordsMigrated = 0;

    try {
      conn = await mysql.createConnection({
        host: config.host || 'localhost',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database,
        connectTimeout: 15000,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      });

      // 1. Ensure foreign key checks are temporarily disabled during migration
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      // 2. Create tables if they do not exist
      for (const [tableName, createSql] of Object.entries(MYSQL_TABLE_SCHEMAS)) {
        await conn.query(createSql);
      }

      // Helper function to safely format dates
      const toSqlDate = (d: any): string | null => {
        if (!d) return null;
        try {
          const date = new Date(d);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().slice(0, 19).replace('T', ' ');
        } catch (_) {
          return null;
        }
      };

      const toSqlDateOnly = (d: any): string | null => {
        if (!d) return null;
        try {
          const date = new Date(d);
          if (isNaN(date.getTime())) return typeof d === 'string' ? d.slice(0, 10) : null;
          return date.toISOString().slice(0, 10);
        } catch (_) {
          return typeof d === 'string' ? d.slice(0, 10) : null;
        }
      };

      // 3. Migrate: students
      if (dataStore.students && dataStore.students.length > 0) {
        let count = 0;
        for (const s of dataStore.students) {
          const sql = `INSERT INTO \`students\` (
            \`id\`, \`nis\`, \`nisn\`, \`name\`, \`nickname\`, \`class\`, \`gender\`, \`email\`, \`phone\`, \`password\`,
            \`savings_balance\`, \`status\`, \`nik\`, \`birth_place\`, \`birth_date\`, \`kk_number\`, \`birth_cert_number\`,
            \`living_with\`, \`child_order\`, \`siblings_count\`, \`step_siblings_count\`, \`address\`, \`photo_url\`,
            \`father_name\`, \`father_nik\`, \`father_occupation\`, \`father_phone\`,
            \`mother_name\`, \`mother_nik\`, \`mother_occupation\`, \`mother_phone\`,
            \`guardian_name\`, \`guardian_phone\`, \`is_spp_exempt\`, \`spp_exemption_reason\`, \`custom_spp_rate\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`class\` = VALUES(\`class\`), \`savings_balance\` = VALUES(\`savings_balance\`),
            \`status\` = VALUES(\`status\`), \`phone\` = VALUES(\`phone\`), \`address\` = VALUES(\`address\`);`;

          const values = [
            s.id || `std-${s.nis}`,
            String(s.nis || ''),
            s.nisn || null,
            s.name || 'Siswa',
            s.nickname || null,
            s.class || '7-A',
            s.gender || 'Laki-laki',
            s.email || null,
            s.phone || null,
            s.password || s.nis || '123456',
            Number(s.savingsBalance || s.savings_balance || 0),
            s.status || 'Aktif',
            s.nik || null,
            s.birthPlace || s.birth_place || null,
            s.birthDate || s.birth_date || null,
            s.kkNumber || s.kk_number || null,
            s.birthCertNumber || s.birth_cert_number || null,
            s.livingWith || s.living_with || null,
            Number(s.childOrder || s.child_order || 1),
            Number(s.siblingsCount || s.siblings_count || 0),
            Number(s.stepSiblingsCount || s.step_siblings_count || 0),
            s.address || null,
            s.photoUrl || s.photo_url || null,
            s.fatherName || s.father_name || null,
            s.fatherNik || s.father_nik || null,
            s.fatherOccupation || s.father_occupation || null,
            s.fatherPhone || s.father_phone || null,
            s.motherName || s.mother_name || null,
            s.motherNik || s.mother_nik || null,
            s.motherOccupation || s.mother_occupation || null,
            s.motherPhone || s.mother_phone || null,
            s.guardianName || s.guardian_name || null,
            s.guardianPhone || s.guardian_phone || null,
            s.isSppExempt || s.is_spp_exempt ? 1 : 0,
            s.sppExemptionReason || s.spp_exemption_reason || null,
            s.customSppRate ? Number(s.customSppRate) : null
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'students', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 4. Migrate: spp_bills
      if (dataStore.sppBills && dataStore.sppBills.length > 0) {
        let count = 0;
        for (const b of dataStore.sppBills) {
          const sql = `INSERT INTO \`spp_bills\` (
            \`id\`, \`student_id\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`paid_at\`, \`payment_method\`, \`order_id\`, \`transaction_id\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`), \`paid_at\` = VALUES(\`paid_at\`), \`amount\` = VALUES(\`amount\`);`;

          const values = [
            b.id || `spp-${b.studentId}-${b.month}-${b.year}`,
            b.studentId || b.student_id,
            b.month,
            Number(b.year || 2026),
            Number(b.amount || 0),
            b.status || 'unpaid',
            toSqlDate(b.paidAt || b.paid_at),
            b.paymentMethod || b.payment_method || null,
            b.orderId || b.order_id || null,
            b.transactionId || b.transaction_id || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'spp_bills', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 5. Migrate: savings_transactions
      if (dataStore.savingsTransactions && dataStore.savingsTransactions.length > 0) {
        let count = 0;
        for (const st of dataStore.savingsTransactions) {
          const sql = `INSERT INTO \`savings_transactions\` (
            \`id\`, \`student_id\`, \`type\`, \`amount\`, \`status\`, \`payment_method\`, \`order_id\`, \`transaction_id\`, \`notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`);`;

          const values = [
            st.id || `sav-${Math.random()}`,
            st.studentId || st.student_id,
            st.type || 'deposit',
            Number(st.amount || 0),
            st.status || 'success',
            st.paymentMethod || st.payment_method || 'Tunai',
            st.orderId || st.order_id || null,
            st.transactionId || st.transaction_id || null,
            st.notes || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'savings_transactions', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 6. Migrate: misc_bills
      if (dataStore.miscBills && dataStore.miscBills.length > 0) {
        let count = 0;
        for (const mb of dataStore.miscBills) {
          const sql = `INSERT INTO \`misc_bills\` (
            \`id\`, \`student_id\`, \`title\`, \`amount\`, \`status\`, \`is_monthly\`, \`month\`, \`paid_at\`, \`payment_method\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`paid_at\` = VALUES(\`paid_at\`);`;

          const values = [
            mb.id || `misc-${Math.random()}`,
            mb.studentId || mb.student_id,
            mb.title || 'Tagihan Lain',
            Number(mb.amount || 0),
            mb.status || 'unpaid',
            mb.isMonthly || mb.is_monthly ? 1 : 0,
            mb.month || null,
            toSqlDate(mb.paidAt || mb.paid_at),
            mb.paymentMethod || mb.payment_method || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'misc_bills', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 7. Migrate: attendance_logs
      if (dataStore.attendanceLogs && dataStore.attendanceLogs.length > 0) {
        let count = 0;
        for (const att of dataStore.attendanceLogs) {
          const sql = `INSERT INTO \`attendance_logs\` (
            \`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`date\`, \`status\`, \`notes\`, \`subject_notes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`);`;

          const values = [
            att.id || `att-${Math.random()}`,
            att.studentId || att.student_id,
            att.studentName || att.student_name || null,
            att.className || att.class_name || null,
            toSqlDateOnly(att.date) || new Date().toISOString().slice(0, 10),
            att.status || 'Hadir',
            att.notes || null,
            att.subjectNotes ? JSON.stringify(att.subjectNotes) : null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'attendance_logs', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 8. Migrate: homeroom_teachers
      if (dataStore.homeroomTeachers && dataStore.homeroomTeachers.length > 0) {
        let count = 0;
        for (const ht of dataStore.homeroomTeachers) {
          const sql = `INSERT INTO \`homeroom_teachers\` (
            \`id\`, \`username\`, \`name\`, \`class_name\`, \`password\`, \`sk_url\`
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`class_name\` = VALUES(\`class_name\`);`;

          const values = [
            ht.id || `ht-${ht.username}`,
            ht.username,
            ht.name,
            ht.className || ht.class_name || '7-A',
            ht.password || '123456',
            ht.skUrl || ht.sk_url || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'homeroom_teachers', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 9. Migrate: subject_teachers
      if (dataStore.subjectTeachers && dataStore.subjectTeachers.length > 0) {
        let count = 0;
        for (const st of dataStore.subjectTeachers) {
          const sql = `INSERT INTO \`subject_teachers\` (
            \`id\`, \`username\`, \`name\`, \`subject\`, \`class_name\`, \`password\`, \`sk_url\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`subject\` = VALUES(\`subject\`);`;

          const values = [
            st.id || `st-${st.username}`,
            st.username,
            st.name,
            st.subject,
            st.className || st.class_name || 'SEMUA KELAS',
            st.password || '123456',
            st.skUrl || st.sk_url || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'subject_teachers', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 10. Migrate: treasurer_transactions
      if (dataStore.treasurerTransactions && dataStore.treasurerTransactions.length > 0) {
        let count = 0;
        for (const tt of dataStore.treasurerTransactions) {
          const sql = `INSERT INTO \`treasurer_transactions\` (
            \`id\`, \`type\`, \`category\`, \`amount\`, \`description\`, \`date\`, \`source\`, \`student_name\`, \`student_id\`, \`recipient_name\`, \`payment_method\`, \`kode_rekening\`, \`no_bukti\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`amount\` = VALUES(\`amount\`), \`description\` = VALUES(\`description\`);`;

          const values = [
            tt.id || `tt-${Math.random()}`,
            tt.type || 'incoming',
            tt.category || 'Operasional',
            Number(tt.amount || 0),
            tt.description || '-',
            toSqlDateOnly(tt.date) || new Date().toISOString().slice(0, 10),
            tt.source || 'custom',
            tt.studentName || tt.student_name || null,
            tt.studentId || tt.student_id || null,
            tt.recipientName || tt.recipient_name || null,
            tt.paymentMethod || tt.payment_method || 'Tunai',
            tt.kodeRekening || tt.kode_rekening || null,
            tt.noBukti || tt.no_bukti || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'treasurer_transactions', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 11. Migrate: class_schedules
      if (dataStore.classSchedules && dataStore.classSchedules.length > 0) {
        let count = 0;
        for (const cs of dataStore.classSchedules) {
          const sql = `INSERT INTO \`class_schedules\` (
            \`id\`, \`day\`, \`class_name\`, \`subject\`, \`teacher_id\`, \`teacher_name\`, \`jam_ke\`, \`start_time\`, \`end_time\`, \`alokasi_waktu\`, \`academic_year\`, \`semester\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`subject\` = VALUES(\`subject\`), \`teacher_name\` = VALUES(\`teacher_name\`);`;

          const values = [
            cs.id || `sch-${Math.random()}`,
            cs.day || 'Senin',
            cs.className || cs.class_name,
            cs.subject,
            cs.teacherId || cs.teacher_id || null,
            cs.teacherName || cs.teacher_name,
            cs.jamKe || cs.jam_ke || '1',
            cs.startTime || cs.start_time || null,
            cs.endTime || cs.end_time || null,
            cs.alokasiWaktu || cs.alokasi_waktu || '2 JP',
            cs.academicYear || cs.academic_year || '2025/2026',
            cs.semester || 'Ganjil',
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'class_schedules', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 12. Migrate: teaching_journals
      if (dataStore.teachingJournals && dataStore.teachingJournals.length > 0) {
        let count = 0;
        for (const tj of dataStore.teachingJournals) {
          const sql = `INSERT INTO \`teaching_journals\` (
            \`id\`, \`teacher_id\`, \`teacher_name\`, \`subject\`, \`class_name\`, \`date\`, \`topic\`, \`attendance\`, \`notes\`, \`fase\`, \`semester\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`topic\` = VALUES(\`topic\`);`;

          const values = [
            tj.id || `tj-${Math.random()}`,
            tj.teacherId || tj.teacher_id || 'st-general',
            tj.teacherName || tj.teacher_name || 'Guru',
            tj.subject || 'Pelajaran',
            tj.className || tj.class_name || '7-A',
            toSqlDateOnly(tj.date) || new Date().toISOString().slice(0, 10),
            tj.topic || '-',
            tj.attendance ? JSON.stringify(tj.attendance) : null,
            tj.notes || null,
            tj.fase || 'D',
            tj.semester || 'Ganjil',
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'teaching_journals', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 13. Migrate: merdeka_assessments
      if (dataStore.merdekaAssessments && dataStore.merdekaAssessments.length > 0) {
        let count = 0;
        for (const ma of dataStore.merdekaAssessments) {
          const sql = `INSERT INTO \`merdeka_assessments\` (
            \`id\`, \`student_id\`, \`student_name\`, \`class_name\`, \`subject\`, \`teacher_name\`, \`semester\`, \`academic_year\`,
            \`nilai_tp1\`, \`nilai_tp2\`, \`nilai_sts\`, \`nilai_sas\`, \`nilai_akhir_rapor\`, \`capaian_kompetensi\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE \`nilai_akhir_rapor\` = VALUES(\`nilai_akhir_rapor\`);`;

          const values = [
            ma.id || `ma-${Math.random()}`,
            ma.studentId || ma.student_id,
            ma.studentName || ma.student_name || 'Siswa',
            ma.className || ma.class_name || '7-A',
            ma.subject || 'Mata Pelajaran',
            ma.teacherName || ma.teacher_name || 'Guru',
            ma.semester || 'Ganjil',
            ma.academicYear || ma.academic_year || '2025/2026',
            ma.nilaiTp1 || ma.nilai_tp1 ? Number(ma.nilaiTp1 || ma.nilai_tp1) : null,
            ma.nilaiTp2 || ma.nilai_tp2 ? Number(ma.nilaiTp2 || ma.nilai_tp2) : null,
            ma.nilaiSts || ma.nilai_sts ? Number(ma.nilaiSts || ma.nilai_sts) : null,
            ma.nilaiSas || ma.nilai_sas ? Number(ma.nilaiSas || ma.nilai_sas) : null,
            ma.nilaiAkhirRapor || ma.nilai_akhir_rapor ? Number(ma.nilaiAkhirRapor || ma.nilai_akhir_rapor) : null,
            ma.capaianKompetensi || ma.capaian_kompetensi || null,
          ];

          await conn.query(sql, values);
          count++;
        }
        tableDetails.push({ tableName: 'merdeka_assessments', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // 14. Migrate: app_settings (Config and Identities)
      if (dataStore.configs) {
        let count = 0;
        for (const [key, value] of Object.entries(dataStore.configs)) {
          const sql = `INSERT INTO \`app_settings\` (\`key_name\`, \`setting_value\`) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`);`;

          await conn.query(sql, [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
          count++;
        }
        tableDetails.push({ tableName: 'app_settings', count, status: 'success' });
        totalRecordsMigrated += count;
      }

      // Re-enable foreign key checks
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      await conn.end();

      return {
        success: true,
        totalRecordsMigrated,
        tableDetails,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      if (conn) {
        try { await conn.end(); } catch (_) {}
      }

      return {
        success: false,
        totalRecordsMigrated,
        tableDetails,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  /**
   * Generates a complete SQL Dump file (.sql) containing schema DDL + INSERT statements for all active data
   */
  static generateSqlDump(dataStore: {
    students: any[];
    sppBills: any[];
    savingsTransactions: any[];
    miscBills: any[];
    attendanceLogs: any[];
    homeroomTeachers: any[];
    subjectTeachers: any[];
    treasurerTransactions: any[];
    classSchedules: any[];
    teachingJournals: any[];
    studentInfractionLogs: any[];
    studentCounselingLogs: any[];
    merdekaAssessments: any[];
    midtransTransactions: any[];
    spmbCandidates?: any[];
    sarprasItems?: any[];
    notifications: any[];
    configs: { [key: string]: any };
  }): string {
    const escapeSql = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (typeof val === 'object') {
        const jsonStr = JSON.stringify(val);
        return `'${jsonStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      }
      return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
    };

    let sql = `-- ==========================================================
-- DUMP BACKUP DATABASE MYSQL LENGKAP + DATA REAL-TIME
-- Aplikasi: SMP Maarif NU Pandaan - Sistem Administrasi, SPP & Buku Induk
-- Dibuat Pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
-- Kompatibel: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+ (phpMyAdmin Hostinger / cPanel)
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

`;

    // 1. Append table schemas
    for (const [tableName, ddl] of Object.entries(MYSQL_TABLE_SCHEMAS)) {
      sql += `-- --------------------------------------------------------\n-- Struktur Tabel: \`${tableName}\`\n-- --------------------------------------------------------\n${ddl}\n\n`;
    }

    // 2. Append INSERTs: students
    if (dataStore.students && dataStore.students.length > 0) {
      sql += `-- Data Tabel: \`students\` (${dataStore.students.length} baris)\n`;
      sql += `INSERT INTO \`students\` (\`id\`, \`nis\`, \`nisn\`, \`name\`, \`class\`, \`gender\`, \`phone\`, \`password\`, \`savings_balance\`, \`status\`, \`address\`, \`father_name\`, \`mother_name\`, \`is_spp_exempt\`) VALUES\n`;
      const rows = dataStore.students.map(s => {
        return `(${escapeSql(s.id || `std-${s.nis}`)}, ${escapeSql(String(s.nis || ''))}, ${escapeSql(s.nisn)}, ${escapeSql(s.name)}, ${escapeSql(s.class || '7-A')}, ${escapeSql(s.gender || 'Laki-laki')}, ${escapeSql(s.phone)}, ${escapeSql(s.password || s.nis || '123456')}, ${escapeSql(Number(s.savingsBalance || 0))}, ${escapeSql(s.status || 'Aktif')}, ${escapeSql(s.address)}, ${escapeSql(s.fatherName)}, ${escapeSql(s.motherName)}, ${escapeSql(s.isSppExempt ? 1 : 0)})`;
      });
      sql += rows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`savings_balance\` = VALUES(\`savings_balance\`);\n\n`;
    }

    // 3. Append INSERTs: spp_bills
    if (dataStore.sppBills && dataStore.sppBills.length > 0) {
      sql += `-- Data Tabel: \`spp_bills\` (${dataStore.sppBills.length} baris)\n`;
      sql += `INSERT INTO \`spp_bills\` (\`id\`, \`student_id\`, \`month\`, \`year\`, \`amount\`, \`status\`, \`payment_method\`) VALUES\n`;
      const rows = dataStore.sppBills.map(b => {
        return `(${escapeSql(b.id)}, ${escapeSql(b.studentId)}, ${escapeSql(b.month)}, ${escapeSql(Number(b.year || 2026))}, ${escapeSql(Number(b.amount || 0))}, ${escapeSql(b.status || 'unpaid')}, ${escapeSql(b.paymentMethod || null)})`;
      });
      sql += rows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`);\n\n`;
    }

    // 4. Append INSERTs: homeroom_teachers
    if (dataStore.homeroomTeachers && dataStore.homeroomTeachers.length > 0) {
      sql += `-- Data Tabel: \`homeroom_teachers\` (${dataStore.homeroomTeachers.length} baris)\n`;
      sql += `INSERT INTO \`homeroom_teachers\` (\`id\`, \`username\`, \`name\`, \`class_name\`, \`password\`) VALUES\n`;
      const rows = dataStore.homeroomTeachers.map(ht => {
        return `(${escapeSql(ht.id)}, ${escapeSql(ht.username)}, ${escapeSql(ht.name)}, ${escapeSql(ht.className || '7-A')}, ${escapeSql(ht.password || '123456')})`;
      });
      sql += rows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n\n`;
    }

    // 5. Append INSERTs: subject_teachers
    if (dataStore.subjectTeachers && dataStore.subjectTeachers.length > 0) {
      sql += `-- Data Tabel: \`subject_teachers\` (${dataStore.subjectTeachers.length} baris)\n`;
      sql += `INSERT INTO \`subject_teachers\` (\`id\`, \`username\`, \`name\`, \`subject\`, \`class_name\`, \`password\`) VALUES\n`;
      const rows = dataStore.subjectTeachers.map(st => {
        return `(${escapeSql(st.id)}, ${escapeSql(st.username)}, ${escapeSql(st.name)}, ${escapeSql(st.subject)}, ${escapeSql(st.className || 'SEMUA KELAS')}, ${escapeSql(st.password || '123456')})`;
      });
      sql += rows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n\n`;
    }

    // 6. Append INSERTs: class_schedules
    if (dataStore.classSchedules && dataStore.classSchedules.length > 0) {
      sql += `-- Data Tabel: \`class_schedules\` (${dataStore.classSchedules.length} baris)\n`;
      sql += `INSERT INTO \`class_schedules\` (\`id\`, \`day\`, \`class_name\`, \`subject\`, \`teacher_id\`, \`teacher_name\`, \`jam_ke\`, \`start_time\`, \`end_time\`) VALUES\n`;
      const rows = dataStore.classSchedules.map(cs => {
        return `(${escapeSql(cs.id)}, ${escapeSql(cs.day)}, ${escapeSql(cs.className)}, ${escapeSql(cs.subject)}, ${escapeSql(cs.teacherId)}, ${escapeSql(cs.teacherName)}, ${escapeSql(cs.jamKe)}, ${escapeSql(cs.startTime)}, ${escapeSql(cs.endTime)})`;
      });
      sql += rows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`subject\` = VALUES(\`subject\`);\n\n`;
    }

    // 7. Append INSERTs: app_settings
    if (dataStore.configs) {
      sql += `-- Data Tabel: \`app_settings\`\n`;
      sql += `INSERT INTO \`app_settings\` (\`key_name\`, \`setting_value\`) VALUES\n`;
      const rows = Object.entries(dataStore.configs).map(([k, v]) => {
        return `(${escapeSql(k)}, ${escapeSql(typeof v === 'object' ? JSON.stringify(v) : v)})`;
      });
      sql += rows.join(',\n') + `\nON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`);\n\n`;
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n`;
    return sql;
  }
}
