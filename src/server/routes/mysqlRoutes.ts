import { Router } from 'express';
import { 
  getSanitizedConfig, 
  saveMysqlConfig, 
  testMysqlConnection, 
  syncDataToMysql, 
  pullDataFromMysql,
  generateFullPhpMyAdminSql,
  COMPLETE_TABLES_SQL,
  ensureAllMysqlTablesExist,
  directSaveEntityToMysql,
  directDeleteEntityFromMysql,
  triggerDebouncedMysqlSync
} from '../mysqlService';

export interface MysqlRouteDataProviders {
  getFullSnapshot: () => Promise<{ snapshot: any; counts: Record<string, number> }> | { snapshot: any; counts: Record<string, number> };
  getStudents: () => any[];
  getTransactions: () => any[];
  getSppBills: () => any[];
  getSalaries: () => any[];
  getSavings: () => any[];
  getMiscBills: () => any[];
  applyLoadedData?: (data: any) => Promise<any> | any;
  onStatusChange?: (status: "ONLINE" | "OFFLINE", error?: string | null) => void;
}

export function createMysqlRouter(providers: MysqlRouteDataProviders): Router {
  const router = Router();

  // Get current MySQL configuration (safe, without raw password)
  router.get('/mysql-config', (req, res) => {
    try {
      const config = getSanitizedConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil konfigurasi MySQL' });
    }
  });

  // Save MySQL database configuration
  router.post('/mysql-config', (req, res) => {
    try {
      const updated = saveMysqlConfig(req.body);
      res.json({ 
        success: true, 
        message: 'Konfigurasi MySQL & phpMyAdmin berhasil disimpan.', 
        config: updated 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal menyimpan konfigurasi MySQL' });
    }
  });

  // Test live connection to MySQL / MariaDB host
  router.post('/mysql-test', async (req, res) => {
    try {
      const result = await testMysqlConnection(req.body);
      if (providers.onStatusChange) {
        providers.onStatusChange(result.success ? "ONLINE" : "OFFLINE", result.success ? null : (result.message + (result.hint ? ` (${result.hint})` : "")));
      }
      res.json(result);
    } catch (err: any) {
      if (providers.onStatusChange) {
        providers.onStatusChange("OFFLINE", err.message);
      }
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan saat menguji koneksi database', 
        error: err.message 
      });
    }
  });

  // Perform full synchronization to MySQL tables (Push to MySQL)
  router.post('/mysql-sync', async (req, res) => {
    try {
      const fullSnapshot = await providers.getFullSnapshot();
      const snapshot = fullSnapshot?.snapshot || fullSnapshot || {
        students: providers.getStudents(),
        transactions: providers.getTransactions(),
        sppBills: providers.getSppBills(),
        salaries: providers.getSalaries(),
        savings: providers.getSavings(),
        miscBills: providers.getMiscBills()
      };
      const result = await syncDataToMysql(snapshot);
      if (providers.onStatusChange && result.success) {
        providers.onStatusChange("ONLINE", null);
      }
      res.json(result);
    } catch (err: any) {
      if (providers.onStatusChange) {
        providers.onStatusChange("OFFLINE", err.message);
      }
      res.status(500).json({ 
        success: false, 
        message: 'Gagal sinkronisasi data ke MySQL', 
        error: err.message 
      });
    }
  });

  // Pull / Import full data directly from MySQL tables (Pull from MySQL to App)
  router.post('/mysql-pull', async (req, res) => {
    try {
      const result = await pullDataFromMysql();
      if (result.success && result.data && providers.applyLoadedData) {
        await providers.applyLoadedData(result.data);
      }
      if (providers.onStatusChange && result.success) {
        providers.onStatusChange("ONLINE", null);
      }
      res.json(result);
    } catch (err: any) {
      if (providers.onStatusChange) {
        providers.onStatusChange("OFFLINE", err.message);
      }
      res.status(500).json({ 
        success: false, 
        message: 'Gagal memuat data dari database MySQL', 
        error: err.message 
      });
    }
  });

  // ==========================================================
  // DIRECT STORAGE & ENTITY PERSISTENCE ROUTES
  // ==========================================================

  // Direct single entity save (insert/update) into MySQL database
  router.post('/mysql-save-entity', async (req, res) => {
    try {
      const { entityType, data } = req.body;
      if (!entityType || !data) {
        return res.status(400).json({ success: false, message: 'Parameter entityType dan data wajib dikirim.' });
      }
      const result = await directSaveEntityToMysql(entityType, data);
      
      // Also trigger debounced full-sync in background to ensure database integrity
      triggerDebouncedMysqlSync(providers.getFullSnapshot, 2000);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal menyimpan entitas langsung ke MySQL',
        error: err.message
      });
    }
  });

  // Direct single entity delete from MySQL database
  router.post('/mysql-delete-entity', async (req, res) => {
    try {
      const { entityType, id } = req.body;
      if (!entityType || !id) {
        return res.status(400).json({ success: false, message: 'Parameter entityType dan id wajib dikirim.' });
      }
      const result = await directDeleteEntityFromMysql(entityType, id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus entitas dari MySQL',
        error: err.message
      });
    }
  });

  // Direct full-state snapshot immediate save to MySQL
  router.post('/mysql-direct-save', async (req, res) => {
    try {
      const fullSnapshot = await providers.getFullSnapshot();
      const snapshot = fullSnapshot?.snapshot || fullSnapshot;
      const result = await syncDataToMysql(snapshot);
      res.json({
        success: result.success,
        message: result.message || 'Penyimpanan langsung ke MySQL berhasil.',
        syncedAt: result.syncedAt,
        stats: result.stats,
        durationMs: result.durationMs
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal melakukan penyimpanan langsung ke MySQL',
        error: err.message
      });
    }
  });

  // Verify and initialize all tables in MySQL
  router.post('/mysql-init-tables', async (req, res) => {
    try {
      const result = await ensureAllMysqlTablesExist();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal inisialisasi tabel MySQL',
        error: err.message
      });
    }
  });

  // Live status of MySQL connection, ping, tables count
  router.get('/mysql-status', async (req, res) => {
    try {
      const config = getSanitizedConfig();
      let liveTest = null;
      if (config.hasPassword && config.host && config.database) {
        liveTest = await testMysqlConnection();
      }
      res.json({
        success: true,
        config,
        liveTest
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Export full SQL schema file (Structure only)
  router.get('/mysql-export-sql', (req, res) => {
    try {
      const sql = `-- SKRIP SKEMA TABEL DATABASE MYSQL / PHPMYADMIN
-- SMP MA'ARIF NU PANDAAN
-- Waktu: ${new Date().toLocaleString('id-ID')}

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

${COMPLETE_TABLES_SQL.trim()}

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
`;
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', 'attachment; filename=smp_maarif_skema_database.sql');
      res.send(sql);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal menghasilkan skrip skema SQL' });
    }
  });

  // Export COMPLETE FULL DATA SQL DUMP (All tables + All rows + Configs) for phpMyAdmin
  router.get('/mysql-export-full-sql', async (req, res) => {
    try {
      const { snapshot, counts } = await providers.getFullSnapshot();
      const sqlDump = generateFullPhpMyAdminSql(snapshot);
      const dateStr = new Date().toISOString().substring(0, 10);
      const filename = `smp_maarif_full_database_dump_${dateStr}.sql`;

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(sqlDump);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal menghasilkan ekspor database lengkap' });
    }
  });

  // API endpoint returning stats of all collections ready for MySQL export
  router.get('/mysql-stats', async (req, res) => {
    try {
      const { counts } = await providers.getFullSnapshot();
      res.json({ success: true, counts, totalCollections: Object.keys(counts).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil ringkasan data' });
    }
  });

  return router;
}

export default createMysqlRouter;

