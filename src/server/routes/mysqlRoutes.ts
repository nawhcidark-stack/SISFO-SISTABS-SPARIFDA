import { Router } from 'express';
import { 
  getSanitizedConfig, 
  saveMysqlConfig, 
  testMysqlConnection, 
  syncDataToMysql, 
  generateFullPhpMyAdminSql,
  COMPLETE_TABLES_SQL 
} from '../mysqlService';

export interface MysqlRouteDataProviders {
  getFullSnapshot: () => Promise<{ snapshot: any; counts: Record<string, number> }> | { snapshot: any; counts: Record<string, number> };
  getStudents: () => any[];
  getTransactions: () => any[];
  getSppBills: () => any[];
  getSalaries: () => any[];
  getSavings: () => any[];
  getMiscBills: () => any[];
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
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan saat menguji koneksi database', 
        error: err.message 
      });
    }
  });

  // Perform full synchronization to MySQL tables
  router.post('/mysql-sync', async (req, res) => {
    try {
      const result = await syncDataToMysql({
        students: providers.getStudents(),
        transactions: providers.getTransactions(),
        sppBills: providers.getSppBills(),
        salaries: providers.getSalaries(),
        savings: providers.getSavings(),
        miscBills: providers.getMiscBills()
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ 
        success: false, 
        message: 'Gagal sinkronisasi data ke MySQL', 
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
