-- ============================================================================
-- SKRIP STRUKTUR BASIS DATA MYSQL: SISTEM AKADEMIK & KEUANGAN SEKOLAH
-- Lembaga: SMP Maarif NU Pandaan
-- Database Hostinger: u604170242_portal_maarif
-- User Hostinger: u604170242_root2
-- Kompatibilitas: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, Hostinger hPanel, cPanel, phpMyAdmin
-- Karakter Set: utf8mb4 (Mendukung Teks Panjang, Simbol, Emoji & Karakter Arab)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- 1. Inisialisasi Database
CREATE DATABASE IF NOT EXISTS `u604170242_portal_maarif` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `u604170242_portal_maarif`;

-- ----------------------------------------------------------------------------
-- TABEL 1: students (Master Data Siswa)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `nis` VARCHAR(50) NOT NULL UNIQUE,
  `nisn` VARCHAR(50) DEFAULT '',
  `class` VARCHAR(50) NOT NULL,
  `gender` VARCHAR(20) DEFAULT '',
  `parentPhone` VARCHAR(50) DEFAULT '',
  `parentName` VARCHAR(255) DEFAULT '',
  `address` TEXT,
  `status` VARCHAR(50) DEFAULT 'active',
  `savingsBalance` BIGINT DEFAULT 0,
  `sppNominal` INT DEFAULT 0,
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_nis` (`nis`),
  INDEX `idx_class` (`class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 2: spp_bills (Tagihan dan Riwayat Pembayaran SPP Bulanan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `spp_bills` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(100) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `nis` VARCHAR(50) NOT NULL,
  `class` VARCHAR(50) NOT NULL,
  `month` VARCHAR(50) NOT NULL,
  `year` VARCHAR(20) NOT NULL,
  `amount` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'unpaid', -- unpaid / paid / pending
  `paymentMethod` VARCHAR(50) DEFAULT '',
  `paymentDate` VARCHAR(50) DEFAULT '',
  `receiptNo` VARCHAR(100) DEFAULT '',
  `orderId` VARCHAR(100) DEFAULT '',
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_student_month` (`nis`, `month`, `year`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 3: misc_bills (Tagihan Pembayaran Lain-lain / Seragam / Gedung / dll)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `misc_bills` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(100) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `nis` VARCHAR(50) NOT NULL,
  `class` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT '',
  `amount` INT NOT NULL,
  `paidAmount` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'unpaid',
  `paymentDate` VARCHAR(50) DEFAULT '',
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nis_misc` (`nis`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 4: savings_transactions (Buku Transaksi Tabungan Siswa)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `savings_transactions` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(100) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `nis` VARCHAR(50) NOT NULL,
  `class` VARCHAR(50) NOT NULL,
  `type` VARCHAR(20) NOT NULL, -- deposit / withdrawal
  `amount` BIGINT NOT NULL,
  `previousBalance` BIGINT DEFAULT 0,
  `currentBalance` BIGINT DEFAULT 0,
  `description` TEXT,
  `date` VARCHAR(50) NOT NULL,
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nis_savings` (`nis`),
  INDEX `idx_date_savings` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 5: treasurer_transactions (Buku Kas Umum Bendahara Sekolah)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `treasurer_transactions` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `type` VARCHAR(20) NOT NULL, -- incoming / outgoing
  `category` VARCHAR(100) NOT NULL,
  `amount` BIGINT NOT NULL,
  `description` TEXT NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `source` VARCHAR(100) DEFAULT '',
  `createdBy` VARCHAR(255) DEFAULT '',
  `noBukti` VARCHAR(100) DEFAULT '',
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_date` (`date`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 6: midtrans_transactions (Log Transaksi Pembayaran Online Gateway)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `midtrans_transactions` (
  `orderId` VARCHAR(100) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(100) DEFAULT '',
  `nis` VARCHAR(50) DEFAULT '',
  `billType` VARCHAR(50) DEFAULT '',
  `description` TEXT,
  `grossAmount` INT NOT NULL,
  `paymentType` VARCHAR(100) DEFAULT '',
  `transactionStatus` VARCHAR(50) DEFAULT 'pending',
  `settlementTime` VARCHAR(50) DEFAULT '',
  `snapToken` TEXT,
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_status_midtrans` (`transactionStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 7: sarpras_items (Master Data Inventaris Sarana & Prasarana)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sarpras_items` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `totalQty` INT NOT NULL DEFAULT 1,
  `availableQty` INT NOT NULL DEFAULT 1,
  `condition` VARCHAR(50) DEFAULT 'Baik',
  `purchaseYear` VARCHAR(20) DEFAULT '',
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 8: sarpras_loans (Riwayat Peminjaman Aset & Logistik)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sarpras_loans` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `itemId` VARCHAR(100) NOT NULL,
  `itemName` VARCHAR(255) NOT NULL,
  `borrowerId` VARCHAR(100) NOT NULL,
  `borrowerName` VARCHAR(255) NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `loanDate` VARCHAR(50) NOT NULL,
  `returnDate` VARCHAR(50) DEFAULT '',
  `status` VARCHAR(50) DEFAULT 'dipinjam', -- dipinjam / dikembalikan
  `notes` TEXT,
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_loan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 9: sarpras_proposals (Usulan Pengadaan / Belanja Sarpras)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sarpras_proposals` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `itemName` VARCHAR(255) NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `estimatedPrice` BIGINT NOT NULL DEFAULT 0,
  `totalPrice` BIGINT NOT NULL DEFAULT 0,
  `date` VARCHAR(50) NOT NULL,
  `urgency` VARCHAR(50) DEFAULT 'Biasa',
  `status` VARCHAR(50) DEFAULT 'pending', -- pending / disetujui / ditolak
  `description` TEXT,
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 10: spmb_candidates (Penerimaan Siswa Baru / SPMB Online)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `spmb_candidates` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `token` VARCHAR(50) NOT NULL UNIQUE,
  `fullName` VARCHAR(255) NOT NULL,
  `nisn` VARCHAR(50) DEFAULT '',
  `nik` VARCHAR(50) DEFAULT '',
  `gender` VARCHAR(20) DEFAULT '',
  `originSchool` VARCHAR(255) DEFAULT '',
  `parentName` VARCHAR(255) DEFAULT '',
  `parentPhone` VARCHAR(50) DEFAULT '',
  `status` VARCHAR(50) DEFAULT 'menunggu_verifikasi',
  `raw_data` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABEL 11: system_configs (Pengaturan Global & Konfigurasi Sekolah)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_configs` (
  `key_name` VARCHAR(100) NOT NULL PRIMARY KEY,
  `config_data` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- STRUKTUR TABEL SELESAI DIBUAT.
-- Anda dapat meng-import file ini ke phpMyAdmin atau MySQL Hosting.
-- ============================================================================
