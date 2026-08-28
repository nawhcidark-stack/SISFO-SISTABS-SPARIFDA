-- ==========================================================
-- SKRIP MIGRASI DATABASE MYSQL / PHPMYADMIN
-- Aplikasi: SMP Maarif NU Pandaan - Portal Administrasi & SPP
-- Kompatibilitas: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+ (Hostinger / cPanel / VPS)
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- 1. Tabel: students (Data Siswa & Buku Induk)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(64) NOT NULL,
  `nis` VARCHAR(32) NOT NULL,
  `nisn` VARCHAR(32) DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `nickname` VARCHAR(64) DEFAULT NULL,
  `class` VARCHAR(32) NOT NULL,
  `gender` ENUM('Laki-laki', 'Perempuan') DEFAULT 'Laki-laki',
  `email` VARCHAR(120) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `password` VARCHAR(255) DEFAULT '123456',
  `savings_balance` DECIMAL(15,2) DEFAULT 0.00,
  `status` ENUM('Aktif', 'Lulus', 'Keluar', 'Mutasi') DEFAULT 'Aktif',
  `nik` VARCHAR(32) DEFAULT NULL,
  `birth_place` VARCHAR(64) DEFAULT NULL,
  `birth_date` VARCHAR(32) DEFAULT NULL,
  `kk_number` VARCHAR(32) DEFAULT NULL,
  `birth_cert_number` VARCHAR(64) DEFAULT NULL,
  `living_with` VARCHAR(64) DEFAULT NULL,
  `child_order` INT DEFAULT 1,
  `siblings_count` INT DEFAULT 0,
  `step_siblings_count` INT DEFAULT 0,
  `address` TEXT DEFAULT NULL,
  `photo_url` TEXT DEFAULT NULL,
  `google_drive_link` TEXT DEFAULT NULL,
  
  -- Data Orang Tua / Ayah
  `father_name` VARCHAR(150) DEFAULT NULL,
  `father_nik` VARCHAR(32) DEFAULT NULL,
  `father_birth_place` VARCHAR(64) DEFAULT NULL,
  `father_birth_date` VARCHAR(32) DEFAULT NULL,
  `father_education` VARCHAR(64) DEFAULT NULL,
  `father_occupation` VARCHAR(64) DEFAULT NULL,
  `father_income` VARCHAR(64) DEFAULT NULL,
  `father_address` TEXT DEFAULT NULL,
  `father_phone` VARCHAR(32) DEFAULT NULL,
  `father_status` ENUM('Hidup', 'Meninggal') DEFAULT 'Hidup',
  
  -- Data Orang Tua / Ibu
  `mother_name` VARCHAR(150) DEFAULT NULL,
  `mother_nik` VARCHAR(32) DEFAULT NULL,
  `mother_birth_place` VARCHAR(64) DEFAULT NULL,
  `mother_birth_date` VARCHAR(32) DEFAULT NULL,
  `mother_education` VARCHAR(64) DEFAULT NULL,
  `mother_occupation` VARCHAR(64) DEFAULT NULL,
  `mother_income` VARCHAR(64) DEFAULT NULL,
  `mother_address` TEXT DEFAULT NULL,
  `mother_phone` VARCHAR(32) DEFAULT NULL,
  `mother_status` ENUM('Hidup', 'Meninggal') DEFAULT 'Hidup',
  
  -- Data Wali
  `guardian_name` VARCHAR(150) DEFAULT NULL,
  `guardian_nik` VARCHAR(32) DEFAULT NULL,
  `guardian_occupation` VARCHAR(64) DEFAULT NULL,
  `guardian_phone` VARCHAR(32) DEFAULT NULL,
  `guardian_address` TEXT DEFAULT NULL,
  
  -- Keringanan SPP & Mutasi
  `is_spp_exempt` TINYINT(1) DEFAULT 0,
  `spp_exemption_reason` TEXT DEFAULT NULL,
  `spp_exemption_type` VARCHAR(64) DEFAULT NULL,
  `custom_spp_rate` DECIMAL(12,2) DEFAULT NULL,
  `mutation_date` VARCHAR(32) DEFAULT NULL,
  `mutation_reason` TEXT DEFAULT NULL,
  `mutation_destination` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nis` (`nis`),
  KEY `idx_student_class` (`class`),
  KEY `idx_student_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabel: spp_bills (Tagihan SPP Bulanan)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `spp_bills` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `month` VARCHAR(32) NOT NULL,
  `year` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('paid', 'unpaid', 'pending', 'waived') DEFAULT 'unpaid',
  `paid_at` DATETIME DEFAULT NULL,
  `payment_method` VARCHAR(64) DEFAULT NULL,
  `order_id` VARCHAR(100) DEFAULT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `achievement_type` VARCHAR(64) DEFAULT NULL,
  `achievement_detail` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_spp_student` (`student_id`),
  KEY `idx_spp_period` (`year`, `month`),
  KEY `idx_spp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabel: savings_transactions (Mutasi Tabungan Siswa)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `savings_transactions` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `type` ENUM('deposit', 'withdrawal') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('success', 'pending', 'failed') DEFAULT 'success',
  `payment_method` VARCHAR(64) DEFAULT 'Tunai',
  `order_id` VARCHAR(100) DEFAULT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_savings_student` (`student_id`),
  KEY `idx_savings_type` (`type`),
  KEY `idx_savings_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Tabel: misc_bills (Tagihan Lain-lain / Non-SPP)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `misc_bills` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('paid', 'unpaid', 'pending') DEFAULT 'unpaid',
  `is_monthly` TINYINT(1) DEFAULT 0,
  `month` VARCHAR(32) DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `payment_method` VARCHAR(64) DEFAULT NULL,
  `order_id` VARCHAR(100) DEFAULT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_misc_student` (`student_id`),
  KEY `idx_misc_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Tabel: attendance_logs (Presensi Harian & Mata Pelajaran)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance_logs` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `student_name` VARCHAR(150) DEFAULT NULL,
  `class_name` VARCHAR(32) DEFAULT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat') NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `subject_notes` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_student_date` (`student_id`, `date`),
  KEY `idx_attendance_class_date` (`class_name`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Tabel: homeroom_teachers (Guru Wali Kelas)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `homeroom_teachers` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `class_name` VARCHAR(32) NOT NULL,
  `password` VARCHAR(255) DEFAULT '123456',
  `sk_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_homeroom_user` (`username`),
  KEY `idx_homeroom_class` (`class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Tabel: subject_teachers (Guru Mata Pelajaran)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subject_teachers` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `class_name` VARCHAR(64) DEFAULT 'SEMUA KELAS',
  `password` VARCHAR(255) DEFAULT '123456',
  `sk_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subject_teacher_user` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Tabel: treasurer_transactions (Buku Kas Masuk / Keluar Bendahara)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `treasurer_transactions` (
  `id` VARCHAR(64) NOT NULL,
  `type` ENUM('incoming', 'outgoing') NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `description` TEXT NOT NULL,
  `date` DATE NOT NULL,
  `source` VARCHAR(32) DEFAULT 'custom',
  `student_name` VARCHAR(150) DEFAULT NULL,
  `student_id` VARCHAR(64) DEFAULT NULL,
  `nis` VARCHAR(32) DEFAULT NULL,
  `recipient_name` VARCHAR(150) DEFAULT NULL,
  `funding_source` VARCHAR(100) DEFAULT NULL,
  `payment_method` VARCHAR(64) DEFAULT 'Tunai',
  `kode_rekening` VARCHAR(64) DEFAULT NULL,
  `no_bukti` VARCHAR(64) DEFAULT NULL,
  `order_id` VARCHAR(100) DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT 'Bendahara',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_treasurer_type_date` (`type`, `date`),
  KEY `idx_treasurer_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Tabel: class_schedules (Jadwal Pelajaran)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `class_schedules` (
  `id` VARCHAR(64) NOT NULL,
  `day` ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu') NOT NULL,
  `class_name` VARCHAR(32) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `teacher_id` VARCHAR(64) DEFAULT NULL,
  `teacher_name` VARCHAR(150) NOT NULL,
  `jam_ke` VARCHAR(32) NOT NULL,
  `start_time` VARCHAR(16) DEFAULT NULL,
  `end_time` VARCHAR(16) DEFAULT NULL,
  `alokasi_waktu` VARCHAR(32) DEFAULT '2 JP',
  `academic_year` VARCHAR(32) DEFAULT '2025/2026',
  `semester` VARCHAR(16) DEFAULT 'Ganjil',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedule_day_class` (`day`, `class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Tabel: teaching_journals (Jurnal Mengajar Guru)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teaching_journals` (
  `id` VARCHAR(64) NOT NULL,
  `teacher_id` VARCHAR(64) NOT NULL,
  `teacher_name` VARCHAR(150) NOT NULL,
  `teacher_type` VARCHAR(32) DEFAULT 'subject_teacher',
  `subject` VARCHAR(100) NOT NULL,
  `class_name` VARCHAR(32) NOT NULL,
  `date` DATE NOT NULL,
  `topic` TEXT NOT NULL,
  `attendance` JSON DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `fase` VARCHAR(16) DEFAULT 'D',
  `semester` VARCHAR(16) DEFAULT 'Ganjil',
  `alokasi_waktu` VARCHAR(32) DEFAULT '2 JP',
  `jam_ke` VARCHAR(32) DEFAULT NULL,
  `pertemuan_ke` VARCHAR(32) DEFAULT NULL,
  `tujuan_pembelajaran` TEXT DEFAULT NULL,
  `pencapaian_kktp` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_teacher` (`teacher_id`),
  KEY `idx_journal_class_date` (`class_name`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Tabel: student_infraction_logs (Pelanggaran & Poin Siswa)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_infraction_logs` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `class_name` VARCHAR(32) NOT NULL,
  `date` DATE NOT NULL,
  `time` VARCHAR(16) DEFAULT NULL,
  `location` VARCHAR(100) DEFAULT NULL,
  `infraction_type` TEXT NOT NULL,
  `action_taken` TEXT NOT NULL,
  `resolution_status` ENUM('Belum Selesai', 'Dalam Proses', 'Selesai') DEFAULT 'Belum Selesai',
  `points` INT DEFAULT 5,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_infraction_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Tabel: student_counseling_logs (Bimbingan Konseling / BK)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_counseling_logs` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `class_name` VARCHAR(32) NOT NULL,
  `date` DATE NOT NULL,
  `topic` TEXT NOT NULL,
  `action_plan` TEXT NOT NULL,
  `result` TEXT NOT NULL,
  `bk_feedback` TEXT DEFAULT NULL,
  `bk_feedback_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_counseling_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. Tabel: merdeka_assessments (Penilaian Kurikulum Merdeka)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `merdeka_assessments` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `class_name` VARCHAR(32) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `teacher_name` VARCHAR(150) NOT NULL,
  `semester` VARCHAR(16) NOT NULL,
  `academic_year` VARCHAR(32) NOT NULL,
  `tp1_name` VARCHAR(150) DEFAULT NULL,
  `tp1_tugas1` DECIMAL(5,2) DEFAULT NULL,
  `tp1_tugas2` DECIMAL(5,2) DEFAULT NULL,
  `tp1_uh` DECIMAL(5,2) DEFAULT NULL,
  `nilai_tp1` DECIMAL(5,2) DEFAULT NULL,
  `tp2_name` VARCHAR(150) DEFAULT NULL,
  `tp2_tugas1` DECIMAL(5,2) DEFAULT NULL,
  `tp2_tugas2` DECIMAL(5,2) DEFAULT NULL,
  `tp2_uh` DECIMAL(5,2) DEFAULT NULL,
  `nilai_tp2` DECIMAL(5,2) DEFAULT NULL,
  `nilai_sts` DECIMAL(5,2) DEFAULT NULL,
  `nilai_sas` DECIMAL(5,2) DEFAULT NULL,
  `nilai_akhir_rapor` DECIMAL(5,2) DEFAULT NULL,
  `capaian_kompetensi` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assessment_student_subject` (`student_id`, `subject`, `semester`, `academic_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14. Tabel: midtrans_transactions (Log Transaksi Payment Gateway)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `midtrans_transactions` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(100) NOT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `student_id` VARCHAR(64) DEFAULT NULL,
  `student_name` VARCHAR(150) DEFAULT NULL,
  `student_nis` VARCHAR(32) DEFAULT NULL,
  `nisn` VARCHAR(32) DEFAULT NULL,
  `bill_type` VARCHAR(32) DEFAULT 'spp',
  `description` TEXT DEFAULT NULL,
  `gross_amount` DECIMAL(12,2) NOT NULL,
  `payment_type` VARCHAR(64) DEFAULT NULL,
  `transaction_status` VARCHAR(32) NOT NULL,
  `fraud_status` VARCHAR(32) DEFAULT NULL,
  `settlement_time` VARCHAR(32) DEFAULT NULL,
  `transaction_time` VARCHAR(32) DEFAULT NULL,
  `snap_token` VARCHAR(255) DEFAULT NULL,
  `raw_response` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_id` (`order_id`),
  KEY `idx_midtrans_student` (`student_id`),
  KEY `idx_midtrans_status` (`transaction_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 15. Tabel: realtime_notifications (Notifikasi & Pengumuman)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `realtime_notifications` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'success', 'warning', 'payment') DEFAULT 'info',
  `category` VARCHAR(64) DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_student` (`student_id`),
  KEY `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 16. Tabel: app_settings (Identitas Sekolah, Midtrans, WA Gateway)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_settings` (
  `key_name` VARCHAR(64) NOT NULL,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Data Awal (Seed Data Dasar)
-- --------------------------------------------------------
INSERT INTO `app_settings` (`key_name`, `setting_value`) VALUES
('schoolIdentity', '{"name":"SMP MAARIF NU PANDAAN","subheading":"Membentuk Generasi Berakhlakul Karimah dan Berprestasi","accreditation":"Akreditasi A","address":"Jl. Raya Pandaan No. 45, Pandaan, Pasuruan, Jawa Timur","phone":"(0343) 631234","email":"smpmaarifnupandaan@gmail.com","npsn":"20512345","principal":"H. Achmad Fauzi, S.Pd.I, M.Pd","treasurer":"Siti Aminah, S.E","activeAcademicYear":"2025/2026","activeSemester":"Ganjil","sppRates":{"grade7":150000,"grade8":150000,"grade9":150000}}')
ON DUPLICATE KEY UPDATE `key_name` = VALUES(`key_name`);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
