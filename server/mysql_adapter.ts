import mysql from 'mysql2/promise';

export interface MySQLConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectTimeout?: number;
}

// Default credentials based on user Hostinger setup
export const DEFAULT_HOSTINGER_MYSQL_CONFIG: MySQLConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.DB_USER || 'u604170242_root2',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'Sparifda@92',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'u604170242_portal_maarif',
  connectTimeout: 8000,
};

// All table names used by the application
export const MYSQL_TABLES = [
  'students',
  'spp_bills',
  'misc_bills',
  'savings_transactions',
  'midtrans_transactions',
  'realtime_notifications',
  'attendance_logs',
  'homeroom_teachers',
  'subject_teachers',
  'teaching_journals',
  'treasurer_transactions',
  'student_development_logs',
  'student_infraction_logs',
  'student_counseling_logs',
  'class_announcements',
  'class_meeting_logs',
  'merdeka_assessments',
  'class_schedules',
  'principal_work_programs',
  'teacher_evaluations',
  'infraction_rules',
  'sarpras_items',
  'sarpras_proposals',
  'sarpras_loans',
  'teacher_salaries',
  'spmb_candidates',
  'configs',
  'database_backups'
] as const;

export type MySQLTableName = typeof MYSQL_TABLES[number];

// Mapping between camelCase collection names and snake_case MySQL table names
export const COLLECTION_TO_TABLE_MAP: Record<string, MySQLTableName> = {
  students: 'students',
  sppBills: 'spp_bills',
  miscBills: 'misc_bills',
  savingsTransactions: 'savings_transactions',
  midtransTransactions: 'midtrans_transactions',
  realtimeNotifications: 'realtime_notifications',
  attendanceLogs: 'attendance_logs',
  homeroomTeachers: 'homeroom_teachers',
  subjectTeachers: 'subject_teachers',
  teachingJournals: 'teaching_journals',
  treasurerTransactions: 'treasurer_transactions',
  studentDevelopmentLogs: 'student_development_logs',
  studentInfractionLogs: 'student_infraction_logs',
  studentCounselingLogs: 'student_counseling_logs',
  classAnnouncements: 'class_announcements',
  classMeetingLogs: 'class_meeting_logs',
  merdekaAssessments: 'merdeka_assessments',
  classSchedules: 'class_schedules',
  principalWorkPrograms: 'principal_work_programs',
  teacherEvaluations: 'teacher_evaluations',
  infractionRules: 'infraction_rules',
  sarprasItems: 'sarpras_items',
  sarprasProposals: 'sarpras_proposals',
  sarprasLoans: 'sarpras_loans',
  teacherSalaries: 'teacher_salaries',
  spmbCandidates: 'spmb_candidates',
  configs: 'configs',
  databaseBackups: 'database_backups'
};

class MySQLAdapter {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private lastError: string | null = null;
  private lastConnectedAt: string | null = null;
  private initPromise: Promise<boolean> | null = null;

  public getConfig(): MySQLConfig {
    return {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || DEFAULT_HOSTINGER_MYSQL_CONFIG.host,
      port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || DEFAULT_HOSTINGER_MYSQL_CONFIG.port),
      user: process.env.MYSQL_USER || process.env.DB_USER || DEFAULT_HOSTINGER_MYSQL_CONFIG.user,
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || DEFAULT_HOSTINGER_MYSQL_CONFIG.password,
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || DEFAULT_HOSTINGER_MYSQL_CONFIG.database,
      connectTimeout: 8000,
    };
  }

  public getStatus() {
    const config = this.getConfig();
    return {
      connected: this.isConnected,
      error: this.lastError,
      lastConnectedAt: this.lastConnectedAt,
      database: config.database,
      user: config.user,
      host: config.host,
      port: config.port,
      configured: Boolean(config.host && config.user && config.database),
    };
  }

  public async connect(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const config = this.getConfig();
      try {
        console.log(`[MySQL] Mencoba menghubungkan ke database MySQL Hostinger (${config.host}:${config.port}/${config.database})...`);

        if (this.pool) {
          try {
            await this.pool.end();
          } catch (e) {}
          this.pool = null;
        }

        this.pool = mysql.createPool({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 6000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
          charset: 'utf8mb4',
        });

        // Test connection
        const [rows] = await this.pool.query('SELECT 1 as is_alive');
        if (Array.isArray(rows) && rows.length > 0) {
          this.isConnected = true;
          this.lastError = null;
          this.lastConnectedAt = new Date().toISOString();
          console.log(`[MySQL] ✅ Berhasil terhubung ke database Hostinger '${config.database}'!`);
          
          // Auto-initialize tables
          await this.ensureTables();
          return true;
        }
        throw new Error('Kueri verifikasi MySQL tidak mengembalikan hasil.');
      } catch (err: any) {
        this.isConnected = false;
        this.lastError = err?.message || String(err);
        console.warn(`[MySQL] ⚠️ Tidak dapat terhubung ke MySQL Hostinger (${config.host}): ${this.lastError}`);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async ensureTables(): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    try {
      console.log('[MySQL] Memverifikasi dan membuat skema tabel jika belum ada...');
      for (const table of MYSQL_TABLES) {
        const query = `
          CREATE TABLE IF NOT EXISTS \`${table}\` (
            \`id\` VARCHAR(128) NOT NULL PRIMARY KEY,
            \`data\` LONGTEXT NOT NULL,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await this.pool.query(query);
      }
      console.log('[MySQL] ✅ Semua skema tabel berhasil diverifikasi/dibuat.');
    } catch (err: any) {
      console.error('[MySQL] Gagal membuat tabel:', err?.message || err);
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string; version?: string; latencyMs?: number }> {
    const start = Date.now();
    const config = this.getConfig();
    try {
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 5000,
      });

      const [res]: any = await conn.query('SELECT VERSION() as version');
      await conn.end();
      const latencyMs = Date.now() - start;
      const version = res && res[0] ? res[0].version : 'MySQL 8.x';

      this.isConnected = true;
      this.lastError = null;
      this.lastConnectedAt = new Date().toISOString();

      return {
        success: true,
        message: `Koneksi MySQL Hostinger Aktif (${config.host}:${config.port}/${config.database})`,
        version,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      this.lastError = err?.message || String(err);
      return {
        success: false,
        message: `Koneksi Gagal: ${this.lastError}`,
        latencyMs,
      };
    }
  }

  public async loadCollection<T = any>(collectionName: string): Promise<T[]> {
    if (!this.pool || !this.isConnected) return [];
    const table = COLLECTION_TO_TABLE_MAP[collectionName] || collectionName;
    try {
      const [rows]: any = await this.pool.query(`SELECT \`data\` FROM \`${table}\``);
      if (!Array.isArray(rows)) return [];
      const results: T[] = [];
      for (const r of rows) {
        try {
          if (r.data) {
            const parsed = JSON.parse(r.data);
            results.push(parsed);
          }
        } catch (e) {
          // ignore corrupted single json
        }
      }
      return results;
    } catch (err: any) {
      console.warn(`[MySQL] Gagal memuat koleksi '${table}':`, err?.message || err);
      return [];
    }
  }

  public async loadAllConfigs(): Promise<Record<string, any>> {
    if (!this.pool || !this.isConnected) return {};
    try {
      const [rows]: any = await this.pool.query('SELECT `id`, `data` FROM `configs`');
      if (!Array.isArray(rows)) return {};
      const configs: Record<string, any> = {};
      for (const r of rows) {
        try {
          if (r.id && r.data) {
            configs[r.id] = JSON.parse(r.data);
          }
        } catch (e) {}
      }
      return configs;
    } catch (err: any) {
      console.warn('[MySQL] Gagal memuat konfigurasi dari MySQL:', err?.message || err);
      return {};
    }
  }

  public async upsertDoc(collectionName: string, doc: any): Promise<boolean> {
    if (!this.pool || !this.isConnected || !doc) return false;
    const table = COLLECTION_TO_TABLE_MAP[collectionName] || collectionName;
    const docId = String(doc.id || doc._id || '');
    if (!docId) return false;

    try {
      const jsonStr = JSON.stringify(doc);
      const query = `
        INSERT INTO \`${table}\` (\`id\`, \`data\`, \`updated_at\`)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`), \`updated_at\` = NOW()
      `;
      await this.pool.query(query, [docId, jsonStr]);
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Gagal upsert dokumen ${docId} pada '${table}':`, err?.message || err);
      return false;
    }
  }

  public async upsertConfig(configKey: string, configData: any): Promise<boolean> {
    if (!this.pool || !this.isConnected || !configData) return false;
    try {
      const jsonStr = JSON.stringify(configData);
      const query = `
        INSERT INTO \`configs\` (\`id\`, \`data\`, \`updated_at\`)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`), \`updated_at\` = NOW()
      `;
      await this.pool.query(query, [configKey, jsonStr]);
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Gagal menyimpan config '${configKey}':`, err?.message || err);
      return false;
    }
  }

  public async deleteDoc(collectionName: string, docId: string): Promise<boolean> {
    if (!this.pool || !this.isConnected || !docId) return false;
    const table = COLLECTION_TO_TABLE_MAP[collectionName] || collectionName;
    try {
      await this.pool.query(`DELETE FROM \`${table}\` WHERE \`id\` = ?`, [docId]);
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Gagal menghapus dokumen ${docId} pada '${table}':`, err?.message || err);
      return false;
    }
  }

  public async syncAllCollections(
    collections: Array<[string, any[]]>,
    configs: Array<[string, any]>
  ): Promise<{ writtenCount: number; errorCount: number }> {
    if (!this.pool || !this.isConnected) {
      return { writtenCount: 0, errorCount: 0 };
    }

    let writtenCount = 0;
    let errorCount = 0;

    for (const [colName, list] of collections) {
      if (!Array.isArray(list) || list.length === 0) continue;
      const table = COLLECTION_TO_TABLE_MAP[colName] || colName;
      for (const item of list) {
        const id = String(item.id || item._id || '');
        if (!id) continue;
        const success = await this.upsertDoc(table, item);
        if (success) writtenCount++;
        else errorCount++;
      }
    }

    for (const [cfgKey, cfgData] of configs) {
      if (!cfgData) continue;
      const success = await this.upsertConfig(cfgKey, cfgData);
      if (success) writtenCount++;
      else errorCount++;
    }

    return { writtenCount, errorCount };
  }

  public async hasAnyData(): Promise<boolean> {
    if (!this.pool || !this.isConnected) return false;
    try {
      const [rows]: any = await this.pool.query('SELECT COUNT(*) as count FROM `students`');
      if (rows && rows[0] && rows[0].count > 0) return true;
      const [cfgRows]: any = await this.pool.query('SELECT COUNT(*) as count FROM `configs`');
      if (cfgRows && cfgRows[0] && cfgRows[0].count > 0) return true;
      return false;
    } catch (e) {
      return false;
    }
  }
}

export const mysqlAdapter = new MySQLAdapter();
