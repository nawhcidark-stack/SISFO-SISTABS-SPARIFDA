import { Router } from 'express';
import { 
  getSanitizedConfig, 
  saveMysqlConfig, 
  testMysqlConnection, 
  syncDataToMysql, 
  generatePhpMyAdminSql 
} from '../mysqlService';

export interface MysqlRouteDataProviders {
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

  // Export full SQL schema file for manual import to phpMyAdmin
  router.get('/mysql-export-sql', (req, res) => {
    try {
      const sql = generatePhpMyAdminSql();
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', 'attachment; filename=smp_maarif_database_schema.sql');
      res.send(sql);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal menghasilkan skrip SQL' });
    }
  });

  return router;
}

export default createMysqlRouter;
