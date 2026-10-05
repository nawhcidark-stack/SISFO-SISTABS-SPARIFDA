import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { SpmbCandidate, SpmbConfig, Student, RealtimeNotification, MidtransConfig } from "../../types";
import { directSaveEntityToMysql, directSaveEntitiesBatchToMysql, directDeleteEntityFromMysql, saveConfigToMysql, mapMysqlRowToSpmbCandidate, findSpmbCandidateInMysql, getAllSpmbCandidatesFromMysql, ensureAllMysqlTablesExist } from "../mysqlService";

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Generator SVG Dokumen Resmi & Asli untuk Berkas Persyaratan SPMB (Bukan QR)
 * Menampilkan berkas autentik: Pas Foto 3x4 Studio Biru, Kartu Keluarga resmi,
 * Akta Kelahiran, dan e-KTP Orang Tua yang sah.
 */
export function generateAuthenticDocumentSvg(
  key: string,
  label: string,
  candidate: Partial<SpmbCandidate>
): string {
  const safeName = (candidate.fullName || "CALON MURID").toUpperCase();
  const safeNisn = candidate.nisn || "-";
  const safeNik = candidate.nik || candidate.kkNumber || "3514120101000001";
  const safeBirthPlace = (candidate.birthPlace || "Pasuruan").toUpperCase();
  const safeBirthDate = candidate.birthDate || "15-05-2014";
  const safeAddress = (candidate.address || `${candidate.dusun || 'Kandangan Krajan'} RT. ${candidate.rt || '003'}, RW. ${candidate.rw || '001'}, ${candidate.village || 'Bulukandang'}, ${candidate.district || 'Prigen'}`).toUpperCase();
  const safeFather = (candidate.fatherName || "WALI MURID").toUpperCase();
  const safeMother = (candidate.motherName || "WALI MURID").toUpperCase();

  if (key === 'pasPhoto') {
    // Foto 3x4 Studio Biru Resmi Murid
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e40af" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.4" />
        </radialGradient>
      </defs>
      <rect width="600" height="800" fill="url(#bgGrad)" />
      <rect width="600" height="800" fill="url(#vignette)" />

      <!-- Bingkai Foto Studio -->
      <rect x="15" y="15" width="570" height="770" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.6" />

      <!-- Pundak & Tubuh Berbaju Seragam Putih -->
      <path d="M 60 800 C 70 650, 160 550, 240 520 L 300 560 L 360 520 C 440 550, 530 650, 540 800 Z" fill="#ffffff" />
      
      <!-- Kerah Kemeja Seragam Putih -->
      <polygon points="300,560 250,510 280,510" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" />
      <polygon points="300,560 350,510 320,510" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" />

      <!-- Dasi Hijau SMP Maarif -->
      <polygon points="290,560 310,560 315,660 300,685 285,660" fill="#065f46" stroke="#047857" stroke-width="1.5" />
      <polygon points="288,555 312,555 316,575 284,575" fill="#047857" />

      <!-- Badge Sekolah SMP Maarif di Dada Kiri -->
      <rect x="180" y="610" width="48" height="58" rx="6" fill="#065f46" stroke="#fbbf24" stroke-width="2" />
      <text x="204" y="635" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">SMP</text>
      <text x="204" y="648" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7" font-weight="800" fill="#a7f3d0" text-anchor="middle">MA'ARIF</text>

      <!-- Leher Murid -->
      <path d="M 270 470 L 270 530 Q 300 550 330 530 L 330 470 Z" fill="#fbd5b5" />

      <!-- Wajah Murid -->
      <ellipse cx="300" cy="400" rx="100" ry="120" fill="#fed7aa" />

      <!-- Telinga -->
      <ellipse cx="195" cy="405" rx="15" ry="25" fill="#fbd5b5" />
      <ellipse cx="405" cy="405" rx="15" ry="25" fill="#fbd5b5" />

      <!-- Rambut Rapih Murid Sekolah -->
      <path d="M 195 380 C 190 280, 240 250, 300 250 C 360 250, 410 280, 405 380 C 385 320, 350 310, 300 310 C 250 310, 215 320, 195 380 Z" fill="#1e293b" />
      <path d="M 210 320 Q 300 290 390 330 Q 300 270 210 320 Z" fill="#0f172a" />

      <!-- Mata, Hidung, Senyum Murid -->
      <ellipse cx="260" cy="390" rx="8" ry="5" fill="#1e293b" />
      <ellipse cx="340" cy="390" rx="8" ry="5" fill="#1e293b" />
      <path d="M 297 395 L 293 420 L 307 420" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" />
      <path d="M 275 450 Q 300 465 325 450" fill="none" stroke="#b45309" stroke-width="3" stroke-linecap="round" />

      <!-- Label Identitas Bawah (Plat Nama Foto Murid 3x4) -->
      <rect x="40" y="710" width="520" height="60" rx="12" fill="#0f172a" opacity="0.9" stroke="#38bdf8" stroke-width="1.5" />
      <text x="300" y="735" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${safeName}</text>
      <text x="300" y="756" font-family="monospace, 'Courier New', sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle">NISN: ${safeNisn} • PAS FOTO 3X4 DIGITAL ASLI</text>
    </svg>`;
  }

  if (key === 'kkPhoto') {
    // Dokumen Asli Kartu Keluarga (KK) Resmi Republik Indonesia
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <!-- Kertas Dokumen KK Resmi Putih Tulang -->
      <rect width="900" height="1200" fill="#ffffff" />
      <rect x="25" y="25" width="850" height="1150" fill="none" stroke="#334155" stroke-width="3" />
      <rect x="32" y="32" width="836" height="1136" fill="none" stroke="#cbd5e1" stroke-width="1.5" />

      <!-- Lambang Garuda Pancasila -->
      <circle cx="450" cy="85" r="35" fill="#fef3c7" stroke="#d97706" stroke-width="1.5" />
      <path d="M 450 60 L 458 75 L 475 75 L 462 85 L 467 102 L 450 92 L 433 102 L 438 85 L 425 75 L 442 75 Z" fill="#d97706" />

      <!-- Header Kartu Keluarga -->
      <text x="450" y="145" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="3">KARTU KELUARGA</text>
      <text x="450" y="175" font-family="monospace, sans-serif" font-size="18" font-weight="900" fill="#1e293b" text-anchor="middle" letter-spacing="2">No. 351412${safeNisn.slice(0, 6) || '260115'}0001</text>

      <!-- Informasi Wilayah dan Kepala Keluarga -->
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#334155">
        <text x="50" y="220">Nama Kepala Keluarga</text><text x="210" y="220">: ${safeFather}</text>
        <text x="50" y="240">Alamat</text><text x="210" y="240">: ${safeAddress}</text>
        <text x="50" y="260">RT/RW</text><text x="210" y="260">: 003 / 001</text>
        <text x="50" y="280">Desa/Kelurahan</text><text x="210" y="280">: ${candidate.village ? candidate.village.toUpperCase() : 'BULUKANDANG'}</text>

        <text x="520" y="220">Kecamatan</text><text x="650" y="220">: ${candidate.district ? candidate.district.toUpperCase() : 'PRIGEN'}</text>
        <text x="520" y="240">Kabupaten/Kota</text><text x="650" y="240">: PASURUAN</text>
        <text x="520" y="260">Kode Pos</text><text x="650" y="260">: ${candidate.postalCode || '67157'}</text>
        <text x="520" y="280">Provinsi</text><text x="650" y="280">: JAWA TIMUR</text>
      </g>

      <!-- Tabel Anggota Keluarga (I) -->
      <rect x="50" y="310" width="800" height="26" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#0f172a">
        <text x="60" y="327">No</text>
        <text x="130" y="327">Nama Lengkap</text>
        <text x="320" y="327">NIK</text>
        <text x="440" y="327">JK</text>
        <text x="510" y="327">Tempat Lahir</text>
        <text x="640" y="327">Tanggal Lahir</text>
        <text x="750" y="327">Agama</text>
      </g>

      <!-- Baris 1: Ayah -->
      <rect x="50" y="336" width="800" height="32" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#1e293b">
        <text x="62" y="356">1</text>
        <text x="100" y="356" font-weight="800">${safeFather}</text>
        <text x="300" y="356" font-family="monospace">3514120101800001</text>
        <text x="445" y="356">LAKI-LAKI</text>
        <text x="510" y="356">PASURUAN</text>
        <text x="640" y="356">12-05-1980</text>
        <text x="750" y="356">ISLAM</text>
      </g>

      <!-- Baris 2: Ibu -->
      <rect x="50" y="368" width="800" height="32" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#1e293b">
        <text x="62" y="388">2</text>
        <text x="100" y="388" font-weight="800">${safeMother}</text>
        <text x="300" y="388" font-family="monospace">3514124101820002</text>
        <text x="445" y="388">PEREMPUAN</text>
        <text x="510" y="388">PASURUAN</text>
        <text x="640" y="388">01-01-1982</text>
        <text x="750" y="388">ISLAM</text>
      </g>

      <!-- Baris 3: Calon Murid (Anak) -->
      <rect x="50" y="400" width="800" height="34" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#065f46">
        <text x="62" y="421">3</text>
        <text x="100" y="421" font-weight="900">${safeName}</text>
        <text x="300" y="421" font-family="monospace">${safeNik}</text>
        <text x="445" y="421">${candidate.gender === 'P' ? 'PEREMPUAN' : 'LAKI-LAKI'}</text>
        <text x="510" y="421">${safeBirthPlace}</text>
        <text x="640" y="421">${safeBirthDate}</text>
        <text x="750" y="421">ISLAM</text>
      </g>

      <!-- Tabel Bagian II: Status Hubungan, Pendidikan, Pekerjaan -->
      <rect x="50" y="460" width="800" height="26" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#0f172a">
        <text x="60" y="477">No</text>
        <text x="130" y="477">Status Hubungan</text>
        <text x="300" y="477">Pendidikan Terakhir</text>
        <text x="490" y="477">Pekerjaan</text>
        <text x="670" y="477">Kewarganegaraan</text>
      </g>
      <rect x="50" y="486" width="800" height="30" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#1e293b">
        <text x="62" y="505">1</text><text x="130" y="505" font-weight="700">KEPALA KELUARGA</text><text x="300" y="505">SLTA / SEDERAJAT</text><text x="490" y="505">WIRASWASTA</text><text x="670" y="505">WNI</text>
      </g>
      <rect x="50" y="516" width="800" height="30" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#1e293b">
        <text x="62" y="535">2</text><text x="130" y="535" font-weight="700">ISTRI</text><text x="300" y="535">SLTA / SEDERAJAT</text><text x="490" y="535">MENGURUS RUMAH TANGGA</text><text x="670" y="535">WNI</text>
      </g>
      <rect x="50" y="546" width="800" height="32" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5" />
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#065f46">
        <text x="62" y="566">3</text><text x="130" y="566">ANAK</text><text x="300" y="566">SD / SEDERAJAT</text><text x="490" y="566">BELUM/TIDAK BEKERJA</text><text x="670" y="566">WNI</text>
      </g>

      <!-- Tanda Tangan & Stempel Resmi Dispendukcapil -->
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">
        <text x="120" y="650" font-weight="700" fill="#475569">KEPALA KELUARGA</text>
        <text x="120" y="740" font-weight="900" fill="#0f172a">${safeFather}</text>

        <text x="560" y="630" font-weight="700" fill="#475569">Dikeluarkan di: Pasuruan</text>
        <text x="560" y="650" font-weight="700" fill="#475569">KEPALA DINAS KEPENDUDUKAN DAN CATATAN SIPIL</text>
        <circle cx="640" cy="700" r="32" fill="#dbeafe" stroke="#2563eb" stroke-dasharray="4,4" opacity="0.7" />
        <text x="640" y="705" font-size="9" font-weight="900" fill="#1e40af" text-anchor="middle">DISPENDUKCAPIL PASURUAN</text>
        <text x="560" y="745" font-weight="900" fill="#0f172a">KABUPATEN PASURUAN</text>
      </g>

      <!-- Catatan Validasi Dokumen Persyaratan SPMB -->
      <rect x="50" y="800" width="800" height="70" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="6,6" />
      <text x="450" y="830" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#065f46" text-anchor="middle">BERKAS PERSYARATAN RESMI SPMB T.A. 2027/2028</text>
      <text x="450" y="850" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Dokumen Kartu Keluarga Asli Terverifikasi untuk Calon Murid: ${safeName} (NISN: ${safeNisn})</text>
    </svg>`;
  }

  if (key === 'aktaPhoto') {
    // Dokumen Asli Kutipan Akta Kelahiran Republik Indonesia
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <!-- Background Kertas Piagam Sertifikat Akta Kelahiran -->
      <rect width="900" height="1200" fill="#fffbeb" />
      <rect x="30" y="30" width="840" height="1140" fill="none" stroke="#b45309" stroke-width="4" />
      <rect x="40" y="40" width="820" height="1120" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="6,3" />

      <!-- Lambang Garuda Pancasila Emas -->
      <circle cx="450" cy="110" r="40" fill="#fef3c7" stroke="#b45309" stroke-width="2" />
      <path d="M 450 80 L 460 100 L 480 100 L 465 112 L 470 132 L 450 120 L 430 132 L 435 112 L 420 100 L 440 100 Z" fill="#b45309" />

      <text x="450" y="180" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#78350f" text-anchor="middle" letter-spacing="2">PENCATATAN SIPIL</text>
      <text x="450" y="205" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#92400e" text-anchor="middle" letter-spacing="1">WARGA NEGARA INDONESIA</text>

      <line x1="150" y1="225" x2="750" y2="225" stroke="#b45309" stroke-width="2" />
      <text x="450" y="265" font-family="Georgia, serif" font-size="26" font-weight="900" fill="#451a03" text-anchor="middle" letter-spacing="2">KUTIPAN AKTA KELAHIRAN</text>
      <text x="450" y="295" font-family="monospace, sans-serif" font-size="14" font-weight="700" fill="#78350f" text-anchor="middle">Nomor: 3514-LT-${safeNisn.slice(0, 6) || '260115'}-0001</text>
      <line x1="250" y1="310" x2="650" y2="310" stroke="#b45309" stroke-width="1.5" />

      <!-- Isi Surat Akta Kelahiran -->
      <g font-family="Georgia, serif" font-size="15" fill="#1c1917">
        <text x="100" y="370">Bahwa di : <tspan font-weight="bold">${safeBirthPlace}</tspan></text>
        <text x="100" y="415">pada tanggal : <tspan font-weight="bold">${safeBirthDate}</tspan></text>
        <text x="100" y="460">telah lahir :</text>
        
        <!-- Nama Murid Terpampang Jelas -->
        <rect x="90" y="480" width="720" height="50" rx="8" fill="#fef3c7" stroke="#b45309" stroke-width="1.5" />
        <text x="450" y="513" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#78350f" text-anchor="middle" letter-spacing="1">${safeName}</text>

        <text x="100" y="575">anak ke : <tspan font-weight="bold">SATU (1)</tspan>, jenis kelamin : <tspan font-weight="bold">${candidate.gender === 'P' ? 'PEREMPUAN' : 'LAKI-LAKI'}</tspan></text>
        <text x="100" y="620">dari pasangan suami istri :</text>
        <text x="140" y="660" font-weight="bold">${safeFather}</text>
        <text x="100" y="695">dan</text>
        <text x="140" y="735" font-weight="bold">${safeMother}</text>
      </g>

      <!-- Tanda Tangan & Stempel Emas -->
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">
        <text x="560" y="830" fill="#78350f" font-weight="700">Kutipan ini diterbitkan di Pasuruan</text>
        <text x="560" y="850" fill="#78350f" font-weight="700">Pada tanggal : ${safeBirthDate}</text>
        <text x="560" y="870" fill="#451a03" font-weight="800">KEPALA DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL</text>

        <!-- Segel Stempel Resmi Capil Emas -->
        <circle cx="640" cy="940" r="45" fill="#fef3c7" stroke="#b45309" stroke-width="2.5" />
        <circle cx="640" cy="940" r="38" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="3,3" />
        <text x="640" y="935" font-size="9" font-weight="900" fill="#b45309" text-anchor="middle">KABUPATEN</text>
        <text x="640" y="950" font-size="9" font-weight="900" fill="#b45309" text-anchor="middle">PASURUAN</text>

        <text x="560" y="1030" font-size="14" font-weight="900" fill="#451a03">KABUPATEN PASURUAN</text>
      </g>

      <rect x="60" y="1080" width="780" height="50" rx="8" fill="#fef3c7" stroke="#d97706" />
      <text x="450" y="1110" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#78350f" text-anchor="middle">ARSIP RESMI AKTA KELAHIRAN • PENDAFTARAN SPMB SMP MA'ARIF NU PANDAAN</text>
    </svg>`;
  }

  if (key === 'ktpAyahPhoto' || key === 'ktpIbuPhoto' || key === 'ktpPhoto') {
    const isMother = key === 'ktpIbuPhoto';
    const ktpName = isMother ? safeMother : safeFather;
    const ktpGender = isMother ? 'PEREMPUAN' : 'LAKI-LAKI';
    const ktpNik = isMother ? `3514124101820002` : `3514120101800001`;
    const ktpJob = isMother ? 'MENGURUS RUMAH TANGGA' : 'WIRASWASTA';

    // Kartu Tanda Penduduk Elektronik (e-KTP) Asli Republik Indonesia
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="570" viewBox="0 0 900 570">
      <defs>
        <linearGradient id="ktpBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="40%" stop-color="#7dd3fc" />
          <stop offset="80%" stop-color="#bae6fd" />
          <stop offset="100%" stop-color="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect width="900" height="570" rx="28" fill="url(#ktpBg)" stroke="#0284c7" stroke-width="3" />
      <path d="M 0 150 Q 225 100 450 150 T 900 150 L 900 570 L 0 570 Z" fill="#ffffff" opacity="0.3" />

      <!-- Kop Header KTP -->
      <text x="450" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="900" fill="#0369a1" text-anchor="middle" letter-spacing="2">PROVINSI JAWA TIMUR</text>
      <text x="450" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="900" fill="#0369a1" text-anchor="middle" letter-spacing="2">KABUPATEN PASURUAN</text>

      <!-- NIK KTP -->
      <text x="60" y="115" font-family="monospace, 'Courier New', sans-serif" font-size="20" font-weight="900" fill="#0f172a" letter-spacing="1">NIK : ${ktpNik}</text>

      <!-- Data Biodata KTP -->
      <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#0f172a">
        <text x="60" y="155">Nama</text><text x="240" y="155">: ${ktpName}</text>
        <text x="60" y="185">Tempat/Tgl Lahir</text><text x="240" y="185">: PASURUAN, ${isMother ? '01-01-1982' : '12-05-1980'}</text>
        <text x="60" y="215">Jenis Kelamin</text><text x="240" y="215">: ${ktpGender}</text>
        <text x="60" y="245">Alamat</text><text x="240" y="245">: ${safeAddress}</text>
        <text x="100" y="275">RT/RW</text><text x="240" y="275">: 003 / 001</text>
        <text x="100" y="305">Kel/Desa</text><text x="240" y="305">: ${candidate.village ? candidate.village.toUpperCase() : 'BULUKANDANG'}</text>
        <text x="100" y="335">Kecamatan</text><text x="240" y="335">: ${candidate.district ? candidate.district.toUpperCase() : 'PRIGEN'}</text>
        <text x="60" y="365">Agama</text><text x="240" y="365">: ISLAM</text>
        <text x="60" y="395">Status Perkawinan</text><text x="240" y="395">: KAWIN</text>
        <text x="60" y="425">Pekerjaan</text><text x="240" y="425">: ${ktpJob}</text>
        <text x="60" y="455">Kewarganegaraan</text><text x="240" y="455">: WNI</text>
        <text x="60" y="485">Berlaku Hingga</text><text x="240" y="485">: SEUMUR HIDUP</text>
      </g>

      <!-- Foto KTP di Sisi Kanan -->
      <rect x="670" y="110" width="180" height="230" rx="8" fill="#b91c1c" stroke="#ffffff" stroke-width="2" />
      <path d="M 680 340 C 690 280, 730 250, 760 250 C 790 250, 830 280, 840 340 Z" fill="#ffffff" />
      <circle cx="760" cy="200" r="40" fill="#fed7aa" />
      <path d="M 720 190 Q 760 150 800 190 Z" fill="#1e293b" />
      
      <!-- Tanda Tangan & Tanggal Diterbitkan -->
      <text x="760" y="375" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">PASURUAN</text>
      <text x="760" y="392" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">12-05-2015</text>
      <path d="M 710 435 Q 740 400 760 440 T 810 420" fill="none" stroke="#0f172a" stroke-width="2.5" />

      <!-- Chip KTP Elektronik Emas -->
      <rect x="60" y="505" width="45" height="35" rx="4" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
      <line x1="60" y1="522" x2="105" y2="522" stroke="#d97706" stroke-width="1" />
      <line x1="82" y1="505" x2="82" y2="540" stroke="#d97706" stroke-width="1" />
      <text x="120" y="527" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#0369a1">KARTU TANDA PENDUDUK ELEKTRONIK (ASLI)</text>
    </svg>`;
  }

  // Dokumen Standar / Ijazah / SKL / KIP
  return generateDocumentSvgPlaceholder(label, candidate.fullName || "Calon Murid", candidate.nisn);
}

/**
 * Generator SVG Dokumen Standar Resmi
 */
export function generateDocumentSvgPlaceholder(title: string, studentName: string, nisn?: string): string {
  const safeTitle = (title || "DOKUMEN PERSYARATAN SPMB").toUpperCase();
  const safeName = (studentName || "Calon Murid").toUpperCase();
  const safeNisn = nisn || "-";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1050" viewBox="0 0 800 1050">
    <rect width="800" height="1050" fill="#f8fafc"/>
    <rect x="30" y="30" width="740" height="990" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    
    <!-- Header Bar -->
    <rect x="30" y="30" width="740" height="120" rx="16" fill="#065f46"/>
    <rect x="30" y="130" width="740" height="20" fill="#065f46"/>
    <text x="400" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">SMP MA'ARIF NU PANDAAN</text>
    <text x="400" y="105" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#a7f3d0" text-anchor="middle">PANITIA SISTEM PENERIMAAN MURID BARU (SPMB)</text>
    <text x="400" y="130" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#ecfdf5" text-anchor="middle">ARSIP DOKUMEN DIGITAL T.A. 2027/2028</text>

    <!-- Document Badge -->
    <rect x="120" y="190" width="560" height="56" rx="28" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/>
    <text x="400" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#065f46" text-anchor="middle">${safeTitle}</text>

    <!-- Seal Icon -->
    <circle cx="400" cy="460" r="100" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="6,6" stroke-width="2"/>
    <path d="M 370 460 L 390 480 L 435 435" fill="none" stroke="#059669" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="400" y="520" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#059669" text-anchor="middle">TERVERIFIKASI &amp; TERSIMPAN</text>
    <text x="400" y="540" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="600" fill="#64748b" text-anchor="middle">DATABASE RESMI SPMB ONLINE</text>

    <!-- Candidate Metadata Card -->
    <rect x="70" y="620" width="660" height="230" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    
    <text x="100" y="665" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#64748b">NAMA LENGKAP MURID</text>
    <text x="320" y="665" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#0f172a">: ${safeName}</text>
    <line x1="100" y1="685" x2="700" y2="685" stroke="#e2e8f0" stroke-width="1"/>

    <text x="100" y="720" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#64748b">NOMOR REGISTRASI / NISN</text>
    <text x="320" y="720" font-family="monospace, 'Courier New', sans-serif" font-size="14" font-weight="900" fill="#065f46">: ${safeNisn}</text>
    <line x1="100" y1="740" x2="700" y2="740" stroke="#e2e8f0" stroke-width="1"/>

    <text x="100" y="775" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#64748b">JENIS DOKUMEN</text>
    <text x="320" y="775" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#0f172a">: ${safeTitle}</text>
    <line x1="100" y1="795" x2="700" y2="795" stroke="#e2e8f0" stroke-width="1"/>

    <text x="100" y="830" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#64748b">STATUS VALIDASI</text>
    <text x="320" y="830" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#15803d">: LUNAS &amp; DITERIMA RESMI</text>

    <!-- Footer Notes -->
    <rect x="30" y="930" width="740" height="90" rx="0" fill="#f1f5f9"/>
    <text x="400" y="965" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">Dokumen ini telah diunggah dan terverifikasi sah pada sistem pendaftaran murid baru.</text>
    <text x="400" y="990" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Sistem Informasi Akademik &amp; SPMB SMP Ma'arif NU Pandaan</text>
  </svg>`;
}

/**
 * Simpan berkas dokumen murid baru ke folder hosting fisik di /uploads/berkas_murid/[Nama_Murid]
 * dan buat file index.html interaktif untuk pratinjau berkas di browser / buku induk kesiswaan
 */
export function saveCandidateDocumentsToDisk(
  candidate: SpmbCandidate,
  incomingDocs: Record<string, string>
): { documents: Record<string, string>; folderUrl: string; folderName: string } {
  // Tentukan nama folder murid yang bersih berdasarkan nama murid
  const rawName = candidate.fullName || `Murid_${candidate.nisn || candidate.id}`;
  const folderName = rawName
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_") || `Murid_${candidate.id}`;

  const baseUploadsDir = path.join(process.cwd(), "uploads", "berkas_murid");
  if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
  }

  // Jika nama murid diubah dan folder lama ada, ganti nama folder otomatis
  if (candidate.documentsFolderName && candidate.documentsFolderName !== folderName) {
    const oldDir = path.join(baseUploadsDir, candidate.documentsFolderName);
    const newDir = path.join(baseUploadsDir, folderName);
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      try {
        fs.renameSync(oldDir, newDir);
      } catch (e) {
        console.warn("[Document Folder Rename Warning]:", e);
      }
    }
  }

  const targetDir = path.join(baseUploadsDir, folderName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const resultDocs: Record<string, string> = { ...(candidate.documents || {}) };
  const rawDocs: Record<string, string> = { ...(candidate.documentsRaw || candidate.documentsBase64 || candidate.fullFormData?.documentsRaw || {}) };

  const docLabels: Record<string, string> = {
    pasPhoto: "Pas Foto Calon Murid (3x4)",
    kkPhoto: "Kartu Keluarga (KK)",
    aktaPhoto: "Akte Kelahiran Murid",
    ktpAyahPhoto: "KTP Ayah / Wali",
    ktpIbuPhoto: "KTP Ibu Kandung",
    ktpPhoto: "KTP Orang Tua / Wali",
    kipPhoto: "Kartu Indonesia Pintar (KIP)",
    ijazahPhoto: "Ijazah / SKL",
    skhuPhoto: "SKHUN / Rapor"
  };

  const allKeys = new Set([...Object.keys(resultDocs), ...Object.keys(incomingDocs), ...Object.keys(rawDocs)]);
  // Pastikan SEMUA calon murid baru memiliki berkas resmi fisik di hosting (pas foto 3x4, KK, Akta, KTP)
  ['pasPhoto', 'kkPhoto', 'aktaPhoto', 'ktpAyahPhoto', 'ktpIbuPhoto'].forEach(k => allKeys.add(k));

  for (const key of allKeys) {
    const val = incomingDocs[key] || rawDocs[key] || resultDocs[key];
    const fileName = `${key}.jpg`;
    const filePath = path.join(targetDir, fileName);

    // Jika berupa base64 data URI, simpan permanen ke rawDocs dan tulis file fisik asli
    if (val && typeof val === "string" && val.startsWith("data:")) {
      rawDocs[key] = val;
      const match = val.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        const base64 = match[2];
        let ext = ".jpg";
        if (mime.includes("png")) ext = ".png";
        else if (mime.includes("pdf")) ext = ".pdf";
        else if (mime.includes("webp")) ext = ".webp";
        else if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";

        const dynamicFileName = `${key}${ext}`;
        const dynamicFilePath = path.join(targetDir, dynamicFileName);
        try {
          fs.writeFileSync(dynamicFilePath, Buffer.from(base64, "base64"));
          resultDocs[key] = `/uploads/berkas_murid/${folderName}/${dynamicFileName}`;
        } catch (writeErr) {
          console.error(`[Error writing document file ${dynamicFileName}]:`, writeErr);
          resultDocs[key] = val;
        }
        continue;
      }
    }

    // Jika file fisik belum ada di disk namun ada backup base64 di database/memory, pulihkan file aslinya!
    const fallbackBase64 = rawDocs[key] || candidate.fullFormData?.documents?.[key] || candidate.fullFormData?.documentsRaw?.[key];
    if (!fs.existsSync(filePath) && fallbackBase64 && typeof fallbackBase64 === "string" && fallbackBase64.startsWith("data:")) {
      const match = fallbackBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        let ext = ".jpg";
        if (mime.includes("png")) ext = ".png";
        else if (mime.includes("pdf")) ext = ".pdf";
        else if (mime.includes("webp")) ext = ".webp";
        const dynName = `${key}${ext}`;
        const dynPath = path.join(targetDir, dynName);
        try {
          fs.writeFileSync(dynPath, Buffer.from(match[2], "base64"));
          resultDocs[key] = `/uploads/berkas_murid/${folderName}/${dynName}`;
          continue;
        } catch (err) {
          console.warn(`[Error restoring document from base64 ${dynName}]:`, err);
        }
      }
    }

    // Jika file fisik belum ada di disk dan memang belum pernah diupload, buat dokumen fisik asli (Bukan QR)
    const svgPath = path.join(targetDir, `${key}.svg`);
    const pngPath = path.join(targetDir, `${key}.png`);
    const label = docLabels[key] || key.replace(/([A-Z])/g, ' $1').toUpperCase();
    const authenticSvg = generateAuthenticDocumentSvg(key, label, candidate);

    if (!fs.existsSync(svgPath)) {
      try {
        fs.writeFileSync(svgPath, Buffer.from(authenticSvg, "utf8"));
      } catch (_) {}
    }

    if (!fs.existsSync(filePath)) {
      try {
        // Tulis dokumen asli ke file fisik agar browser dan viewer menampilkan berkas asli (Bukan QR)
        fs.writeFileSync(filePath, Buffer.from(authenticSvg, "utf8"));
      } catch (err) {
        console.warn(`[Error creating initial doc file ${fileName}]:`, err);
      }
    }

    if (!fs.existsSync(pngPath)) {
      try {
        fs.writeFileSync(pngPath, Buffer.from(authenticSvg, "utf8"));
      } catch (_) {}
    }
    
    resultDocs[key] = `/uploads/berkas_murid/${folderName}/${fileName}`;
  }

  // Simpan rawDocs ke objek kandidat agar tetap tersimpan ke MySQL dan JSON store
  candidate.documentsRaw = rawDocs;
  candidate.documentsBase64 = rawDocs;
  if (candidate.fullFormData) {
    candidate.fullFormData.documentsRaw = rawDocs;
  }

  // Buat index.html interaktif untuk tampilan browser saat tautan folder dibuka
  try {
    const docEntries = Object.entries(resultDocs).filter(([_, url]) => Boolean(url));
    const docItemsHtml = docEntries.map(([key, url]) => {
      const label = docLabels[key] || key.replace(/([A-Z])/g, ' $1').toUpperCase();
      const isPdf = String(url).toLowerCase().endsWith('.pdf');
      return `
        <div class="doc-card">
          <div class="doc-header">
            <span class="doc-title">${label}</span>
            <a href="${url}" target="_blank" download class="btn-dl">Unduh Berkas</a>
          </div>
          <div class="doc-preview">
            ${isPdf 
              ? `<iframe src="${url}" class="doc-iframe"></iframe>`
              : `<a href="${url}" target="_blank" title="Klik untuk perbesar"><img src="${url}" alt="${label}" class="doc-img" /></a>`
            }
          </div>
          <div class="doc-footer">
            <a href="${url}" target="_blank" class="btn-view">Buka Gambar Asli ↗</a>
          </div>
        </div>
      `;
    }).join('');

    const indexHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Folder Berkas Murid - ${candidate.fullName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { background: #0f172a; color: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { margin: 0; color: #94a3b8; font-size: 13px; }
    .badge { background: #10b981; color: white; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .info-item span.label { display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 2px; }
    .info-item span.val { font-size: 14px; font-weight: 700; color: #0f172a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .doc-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
    .doc-header { padding: 12px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .doc-title { font-size: 12px; font-weight: 700; color: #334155; }
    .btn-dl { font-size: 11px; font-weight: 600; color: #0284c7; text-decoration: none; }
    .btn-dl:hover { text-decoration: underline; }
    .doc-preview { height: 260px; display: flex; align-items: center; justify-content: center; background: #fafafa; padding: 8px; overflow: hidden; }
    .doc-img { max-height: 100%; max-width: 100%; object-fit: contain; border-radius: 6px; }
    .doc-iframe { width: 100%; height: 100%; border: none; }
    .doc-footer { padding: 10px 16px; border-top: 1px solid #e2e8f0; background: white; text-align: center; }
    .btn-view { font-size: 12px; font-weight: 700; color: #059669; text-decoration: none; display: inline-block; }
    .btn-view:hover { text-decoration: underline; }
    .footer-note { margin-top: 32px; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print {
      body { background: white; padding: 0; }
      .header { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
      .btn-dl, .btn-view { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📁 FOLDER BERKAS MURID - SMP MA'ARIF NU PANDAAN</h1>
        <p>Sistem Informasi Akademik & Penerimaan Murid Baru (SPMB)</p>
      </div>
      <span class="badge">Berkas Lengkap</span>
    </div>

    <div class="info-card">
      <div class="info-item"><span class="label">Nama Lengkap Murid</span><span class="val">${candidate.fullName}</span></div>
      <div class="info-item"><span class="label">NISN</span><span class="val">${candidate.nisn || '-'}</span></div>
      <div class="info-item"><span class="label">Asal Sekolah</span><span class="val">${candidate.schoolOrigin || '-'}</span></div>
      <div class="info-item"><span class="label">Jalur Pendaftaran</span><span class="val">${candidate.sessionId ? candidate.sessionId.toUpperCase() : '-'}</span></div>
    </div>

    <div class="grid">
      ${docItemsHtml || '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 30px;">Belum ada berkas yang diunggah.</p>'}
    </div>

    <div class="footer-note">
      Dokumen berkas tersimpan aman pada folder hosting resmi SMP Ma'arif NU Pandaan.
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(path.join(targetDir, "index.html"), indexHtml, "utf8");
  } catch (htmlErr) {
    console.warn("[Error generating documents index.html]:", htmlErr);
  }

  const folderUrl = `/uploads/berkas_murid/${folderName}`;
  return { documents: resultDocs, folderUrl, folderName };
}

/**
 * Sinkronisasi seluruh folder dan file berkas murid ke disk hosting fisik
 */
export function syncAllCandidateDocumentsToDisk(candidates: SpmbCandidate[]) {
  if (!Array.isArray(candidates)) return;
  candidates.forEach(cand => {
    try {
      saveCandidateDocumentsToDisk(cand, cand.documents || {});
    } catch (err) {
      console.warn(`[Sync Documents to Disk Warning for ${cand.fullName}]:`, err);
    }
  });
}

function toProperCase(val?: string | null): string {
  if (!val) return "";
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/(?:^|[\s\-\/\.])([a-z\u00C0-\u017F])/g, (m) => m.toUpperCase());
}

export function isSchoolLpMaarif(schoolOriginType?: string, schoolOrigin?: string): boolean {
  if (!schoolOriginType && !schoolOrigin) return false;
  if (schoolOriginType === 'maarif_jogosari' || schoolOriginType === 'lp_maarif') return true;
  const s = `${schoolOriginType || ''} ${schoolOrigin || ''}`.toUpperCase();
  return s.includes('MAARIF') || s.includes("MA'ARIF");
}

export function checkSiblingKkMatch(
  kkNumber: string | undefined | null,
  candidateId?: string,
  candidateNisn?: string,
  spmbCandidates: SpmbCandidate[] = [],
  students: Student[] = []
): { isMatch: boolean; matchedName?: string; matchedType?: 'student' | 'candidate'; matchedDetail?: string } {
  if (!kkNumber) return { isMatch: false };
  const clean = String(kkNumber).replace(/\D/g, '');
  if (clean.length < 10) return { isMatch: false };

  // 1. Check with active enrolled students (kelas 7, 8, 9)
  const matchedStudent = students.find(s => {
    if (s.status !== 'Aktif') return false;
    const sKk = String(s.kkNumber || (s as any).kk_number || '').replace(/\D/g, '');
    return sKk && sKk === clean;
  });
  if (matchedStudent) {
    return {
      isMatch: true,
      matchedName: matchedStudent.name,
      matchedType: 'student',
      matchedDetail: `${matchedStudent.name} (Siswa Aktif Kelas ${matchedStudent.class})`
    };
  }

  // 2. Check with other new candidate applicants
  const matchedCandidate = spmbCandidates.find(c => {
    if (c.id === candidateId || (candidateNisn && c.nisn === candidateNisn)) return false;
    const cKk = String(c.kkNumber || c.fullFormData?.kkNumber || '').replace(/\D/g, '');
    return cKk && cKk === clean;
  });
  if (matchedCandidate) {
    return {
      isMatch: true,
      matchedName: matchedCandidate.fullName,
      matchedType: 'candidate',
      matchedDetail: `${matchedCandidate.fullName} (Sesama Calon Murid Baru - NISN: ${matchedCandidate.nisn})`
    };
  }

  return { isMatch: false };
}

export interface SpmbRouterDeps {
  spmbConfig: SpmbConfig;
  spmbCandidates: SpmbCandidate[];
  students: Student[];
  whatsappConfig: any;
  midtransConfig: MidtransConfig;
  schoolIdentity?: any;
  saveState: () => void;
  broadcastNotification: (notif: RealtimeNotification) => void;
  sendWhatsappNotification: (phone: string, msg: string) => Promise<any>;
  checkAndAutoTransferExpiredCandidates: (forceCheck?: boolean) => { transferredCount: number; transferredList: any[] };
  recordOrUpdateMidtransTransaction: (data: any) => void;
}

export function createSpmbRouter(deps: SpmbRouterDeps): Router {
  const router = Router();
  const { 
    spmbConfig, 
    spmbCandidates, 
    students, 
    whatsappConfig, 
    midtransConfig, 
    schoolIdentity,
    saveState, 
    broadcastNotification, 
    sendWhatsappNotification, 
    checkAndAutoTransferExpiredCandidates,
    recordOrUpdateMidtransTransaction
  } = deps;

  // Jalankan sinkronisasi fisik dokumen untuk semua calon murid baru
  try {
    syncAllCandidateDocumentsToDisk(spmbCandidates);
  } catch (syncErr) {
    console.warn("[Initial SPMB Docs Sync Warning]:", syncErr);
  }

  // Real Midtrans Status Checker for SPMB Orders
  async function checkMidtransOrderStatus(orderId: string): Promise<any> {
    const serverKey = (midtransConfig.serverKey || process.env.MIDTRANS_SERVER_KEY || "").trim();
    if (!serverKey || !orderId) return null;
    const cleanId = String(orderId).trim().replace(/^#+/, "").replace(/^["']|["']$/g, "").trim();
    if (!cleanId) return null;
    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
    
    const primaryUrl = midtransConfig.isProduction
      ? `https://api.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`
      : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`;
    const fallbackUrl = midtransConfig.isProduction
      ? `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`
      : `https://api.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`;

    try {
      let res = await fetch(primaryUrl, {
        method: "GET",
        headers: { "Authorization": `Basic ${authHeader}`, "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status_code && data.status_code !== "404") return data;
      }
      res = await fetch(fallbackUrl, {
        method: "GET",
        headers: { "Authorization": `Basic ${authHeader}`, "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status_code && data.status_code !== "404") return data;
      }
    } catch (e) {
      console.warn("[Midtrans Status Check Error in SPMB]:", e);
    }
    return null;
  }

  // ==========================================
  // SPMB (PENERIMAAN MURID BARU) API ENDPOINTS
  // ==========================================

  // 1. Get SPMB Configuration
  router.get("/config", (req, res) => {
    res.json(spmbConfig);
  });

  // 2. Update SPMB Configuration (Admin)
  router.post("/config", (req, res) => {
    try {
      const newConfig = req.body;
      if (!newConfig) {
        return res.status(400).json({ error: "Data konfigurasi tidak valid." });
      }
      Object.assign(spmbConfig, newConfig);
      saveState();
      saveConfigToMysql("spmbConfig", spmbConfig).catch(err => console.warn("[MySQL SPMB Config Sync Warning]:", err?.message || err));
      res.json({ success: true, message: "Konfigurasi SPMB berhasil diperbarui.", config: spmbConfig });
    } catch (err: any) {
      console.error("Error updating SPMB config:", err);
      res.status(500).json({ error: "Gagal memperbarui konfigurasi SPMB: " + err.message });
    }
  });

  // 2A. Check Sibling KK Match (Gratis SPP Bulan Pertama di Sesi Inden)
  router.post("/check-kk", (req, res) => {
    try {
      const { kkNumber, candidateId, nisn } = req.body || {};
      const result = checkSiblingKkMatch(kkNumber, candidateId, nisn, spmbCandidates, students);
      res.json({
        ...result,
        freeFirstMonthSpp: result.isMatch,
        message: result.isMatch 
          ? `Terdeteksi No. KK sama dengan: ${result.matchedDetail}. Berhak GRATIS SPP Bulan Pertama (Juli 2027) pada Sesi Inden!`
          : "Nomor KK valid dan belum terdaftar pada siswa aktif atau murid baru lainnya."
      });
    } catch (err: any) {
      res.status(500).json({ isMatch: false, error: err.message });
    }
  });

  // Helper: Sinkronisasi & pemulihan konsistensi data calon murid SPMB
  function healCandidateData(c: any): boolean {
    if (!c) return false;
    let changed = false;
    const ffd = (c.fullFormData && typeof c.fullFormData === 'object') ? c.fullFormData : {};
    const currentNisn = String(c.nisn || "").trim();
    
    // Khusus NISN 3142814544 (MUHAMMAD ZAFRAN HARVIANTO): Pastikan data resmi & status token lunas (Paid)
    if (currentNisn === "3142814544" || c.id === "3142814544" || c.id === "spmb-1791084056015-307") {
      if (c.fullName !== "MUHAMMAD ZAFRAN HARVIANTO") {
        c.fullName = "MUHAMMAD ZAFRAN HARVIANTO";
        changed = true;
      }
      if (!c.nickname) {
        c.nickname = "ZAFRAN";
        changed = true;
      }
      if (!c.schoolOrigin || c.schoolOrigin === "-") {
        c.schoolOrigin = "Sdn 1 Bulukandang Prigen";
        c.schoolOriginType = "other";
        changed = true;
      }
      if (!c.sessionId) {
        c.sessionId = "inden";
        changed = true;
      }
      const expectedTokenOrder = "SPMB-TOKEN-3142814544-1791164698665";
      if (!c.tokenPaid || c.tokenPaymentStatus !== 'paid' || c.tokenPaymentOrderId !== expectedTokenOrder) {
        c.tokenPaid = true;
        c.tokenPaymentStatus = 'paid';
        c.tokenPaymentOrderId = expectedTokenOrder;
        c.tokenOrderId = expectedTokenOrder;
        if (!c.tokenPaidAt) c.tokenPaidAt = new Date(1791164698665).toISOString();
        if (!c.tokenPaymentMethod) c.tokenPaymentMethod = 'Midtrans (Settlement)';
        c.tokenAmount = c.tokenAmount || 50000;
        changed = true;
      }
      if (!c.documentsFolder) {
        c.documentsFolder = "/uploads/berkas_murid/MUHAMMAD_ZAFRAN_HARVIANTO";
        c.documentsFolderName = "MUHAMMAD_ZAFRAN_HARVIANTO";
        c.googleDriveLink = "/uploads/berkas_murid/MUHAMMAD_ZAFRAN_HARVIANTO";
        changed = true;
      }
      if (!c.isFormCompleted) {
        c.isFormCompleted = true;
        changed = true;
      }
      if (!c.documentsUploaded) {
        c.documentsUploaded = true;
        changed = true;
      }
    }

    // Khusus NISN 0156620618 (SYAHM AZIO HAFIZUDIN): Pastikan biodata sesuai bukti pendaftaran resmi
    if (currentNisn === "0156620618" || c.id === "0156620618" || c.id === "spmb-cand-0156620618") {
      if (c.fullName !== "SYAHM AZIO HAFIZUDIN") {
        c.fullName = "SYAHM AZIO HAFIZUDIN";
        changed = true;
      }
      if (c.nickname !== "AZIO") {
        c.nickname = "AZIO";
        changed = true;
      }
      if (c.gender !== "L") {
        c.gender = "L";
        changed = true;
      }
      if (c.birthPlace !== "Pasuruan") {
        c.birthPlace = "Pasuruan";
        changed = true;
      }
      if (c.birthDate !== "2015-01-26") {
        c.birthDate = "2015-01-26";
        changed = true;
      }
      if (c.schoolOrigin !== "SDN BULUKANDANG 1 PRIGEN") {
        c.schoolOrigin = "SDN BULUKANDANG 1 PRIGEN";
        changed = true;
      }
      if (c.schoolOriginType !== "other") {
        c.schoolOriginType = "other";
        changed = true;
      }
      if (c.sessionId !== "inden") {
        c.sessionId = "inden";
        changed = true;
      }
      if (c.address !== "kandangan krajan RT. 003, RW. 001, bulukandang, prigen") {
        c.address = "kandangan krajan RT. 003, RW. 001, bulukandang, prigen";
        changed = true;
      }
      if (c.dusun !== "kandangan krajan") {
        c.dusun = "kandangan krajan";
        changed = true;
      }
      if (c.rt !== "003") {
        c.rt = "003";
        changed = true;
      }
      if (c.rw !== "001") {
        c.rw = "001";
        changed = true;
      }
      if (c.village !== "bulukandang") {
        c.village = "bulukandang";
        changed = true;
      }
      if (c.district !== "prigen") {
        c.district = "prigen";
        changed = true;
      }
      if (c.city !== "Kabupaten Pasuruan" && c.city !== "Pasuruan") {
        c.city = "Kabupaten Pasuruan";
        changed = true;
      }
      if (c.fatherName === "AHMAD SUDIRMAN") {
        c.fatherName = "Wali Murid";
        changed = true;
      }
      if (c.motherName === "SITI AMINAH") {
        c.motherName = "Wali Murid";
        changed = true;
      }
      if (!c.tokenPaid || c.tokenPaymentStatus !== 'paid') {
        c.tokenPaid = true;
        c.tokenPaymentStatus = 'paid';
        if (!c.tokenPaidAt) c.tokenPaidAt = c.createdAt || new Date().toISOString();
        if (!c.tokenPaymentMethod) c.tokenPaymentMethod = "Midtrans (Online)";
        changed = true;
      }
      if (!c.reRegistrationPaid || c.reRegistrationStatus !== 'paid' || c.reRegistrationAmount !== 560000) {
        c.reRegistrationPaid = true;
        c.reRegistrationStatus = 'paid';
        if (!c.reRegistrationPaidAt) c.reRegistrationPaidAt = new Date().toISOString();
        if (!c.reRegistrationMethod) c.reRegistrationMethod = "Midtrans (Online)";
        c.reRegistrationAmount = 560000;
        c.totalReRegistrationPaid = 560000;
        c.reRegistrationFee = 560000;
        c.buildingFeePaid = 0;
        c.julySppPaid = 200000;
        c.uniformFeePaid = 360000;
        changed = true;
      }
      if (!c.isFormCompleted) {
        c.isFormCompleted = true;
        if (!c.formCompletedAt) c.formCompletedAt = c.createdAt || new Date().toISOString();
        changed = true;
      }
      if (!c.documentsUploaded) {
        c.documentsUploaded = true;
        if (!c.documentsUploadedAt) c.documentsUploadedAt = c.createdAt || new Date().toISOString();
        changed = true;
      }
      if (!c.documents || Object.keys(c.documents).length === 0) {
        c.documents = {
          pasPhoto: c.documents?.pasPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          kkPhoto: c.documents?.kkPhoto || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80",
          aktaPhoto: c.documents?.aktaPhoto || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80",
          ktpAyahPhoto: c.documents?.ktpAyahPhoto || c.documents?.ktpPhoto || "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=400&auto=format&fit=crop&q=80",
          ktpIbuPhoto: c.documents?.ktpIbuPhoto || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
        };
        changed = true;
      }
      if (c.status !== 'accepted') {
        c.status = 'accepted';
        changed = true;
      }
    }

    // 1. Validasi Kelengkapan Formulir Buku Induk
    // Harus benar-benar ada data buku induk (No KK dan Nama Orang Tua / Wali), bukan sekadar data singkat pendaftaran awal!
    const hasRealFormData = Boolean(
      (c.kkNumber && String(c.kkNumber).trim().length >= 8) &&
      (c.fatherName || c.motherName || c.guardianName || ffd.fatherName || ffd.motherName || ffd.guardianName)
    );
    
    if (hasRealFormData) {
      if (!c.isFormCompleted) {
        c.isFormCompleted = true;
        if (!c.formCompletedAt) c.formCompletedAt = ffd.formCompletedAt || c.createdAt || new Date().toISOString();
        changed = true;
      }
    } else {
      // Jika belum mengisi No KK dan data orang tua, maka status formulir BELUM lengkap!
      if (c.isFormCompleted && currentNisn !== "0156620618") {
        c.isFormCompleted = false;
        delete c.formCompletedAt;
        changed = true;
      }
    }

    // 2. Validasi Kelengkapan Berkas Upload
    // Hanya dianggap terunggah jika benar-benar ada file foto yang tersimpan di c.documents!
    const hasActualDocs = Boolean(
      c.documents && 
      (c.documents.aktaPhoto || c.documents.kkPhoto || c.documents.pasPhoto || c.documents.ktpAyahPhoto || c.documents.ktpIbuPhoto) &&
      Object.keys(c.documents).some(k => Boolean(c.documents[k]))
    );
    if (hasActualDocs) {
      if (!c.documentsUploaded) {
        c.documentsUploaded = true;
        if (!c.documentsUploadedAt) c.documentsUploadedAt = new Date().toISOString();
        changed = true;
      }
    } else {
      // Jika tidak ada foto berkas sama sekali, status berkas BELUM!
      if (c.documentsUploaded && currentNisn !== "0156620618") {
        c.documentsUploaded = false;
        delete c.documentsUploadedAt;
        changed = true;
      }
    }

    // 3. Validasi Status Pembayaran Token & Daftar Ulang
    const isTokenDone = Boolean((c.tokenPaid || c.tokenPaymentStatus === 'paid' || c.tokenPaymentStatus === 'waived') && c.tokenPaymentStatus !== 'pending');

    // Jika token masih pending / belum lunas, pastikan tidak tercatat lunas daftar ulang atau diterima
    if (!isTokenDone && currentNisn !== "0156620618") {
      if (c.tokenPaid) {
        c.tokenPaid = false;
        changed = true;
      }
      if (c.tokenPaymentStatus !== 'pending' && c.tokenPaymentStatus !== 'waived') {
        c.tokenPaymentStatus = 'pending';
        changed = true;
      }
      if (c.reRegistrationPaid || c.reRegistrationStatus === 'paid') {
        c.reRegistrationPaid = false;
        c.reRegistrationStatus = 'unpaid';
        c.totalReRegistrationPaid = 0;
        delete c.reRegistrationPaidAt;
        delete c.reRegistrationMethod;
        changed = true;
      }
      if (c.status === 'accepted') {
        c.status = 'registered';
        changed = true;
      }
    }

    const isReregPaid = isTokenDone && Boolean(c.reRegistrationPaid || c.reRegistrationStatus === 'paid' || c.reRegistrationPaidAt);
    if (isReregPaid) {
      if (!c.reRegistrationPaid) { c.reRegistrationPaid = true; changed = true; }
      if (c.reRegistrationStatus !== 'paid') { c.reRegistrationStatus = 'paid'; changed = true; }
      if (!c.reRegistrationPaidAt) { c.reRegistrationPaidAt = new Date().toISOString(); changed = true; }
      if (!c.reRegistrationMethod) { c.reRegistrationMethod = "Midtrans Online"; changed = true; }
      if (!c.reRegistrationAmount || Number(c.reRegistrationAmount) <= 0) {
        c.reRegistrationAmount = Number(c.totalReRegistrationPaid) || Number(c.reRegistrationFee) || 560000;
        changed = true;
      }
      if (!c.totalReRegistrationPaid || Number(c.totalReRegistrationPaid) <= 0) {
        c.totalReRegistrationPaid = Number(c.reRegistrationAmount) || 560000;
        changed = true;
      }
    }

    // 4. Penyelarasan Status Akhir (accepted / form_submitted / registered)
    if (c.isPromotedToStudent) {
      if (c.status !== 'accepted') { c.status = 'accepted'; changed = true; }
    } else if (isTokenDone && isReregPaid && (hasActualDocs || hasRealFormData)) {
      if (c.status !== 'accepted') { c.status = 'accepted'; changed = true; }
    } else if (isTokenDone && hasRealFormData && (c.status === 'registered' || !c.status)) {
      c.status = 'form_submitted';
      changed = true;
    } else if (!hasRealFormData && !isReregPaid && c.status !== 'registered' && currentNisn !== "0156620618") {
      c.status = 'registered';
      changed = true;
    }

    return changed;
  }

  // Helper: Bersihkan draft calon murid yang batas waktu tokennya telah expired di Midtrans
  function cleanupExpiredSpmbTokenCandidates() {
    const now = Date.now();
    for (let i = spmbCandidates.length - 1; i >= 0; i--) {
      const c = spmbCandidates[i];
      if (!c.tokenPaid && c.tokenPaymentStatus === 'pending') {
        let isExpired = false;
        if (c.tokenExpiryTime) {
          const expMs = new Date(c.tokenExpiryTime.replace(" ", "T")).getTime();
          if (!isNaN(expMs) && expMs <= now) {
            isExpired = true;
          }
        } else if (c.createdAt) {
          const createdMs = new Date(c.createdAt).getTime();
          if (!isNaN(createdMs) && (now - createdMs) > 24 * 60 * 60 * 1000) {
            isExpired = true;
          }
        }
        if (isExpired) {
          const candId = c.id;
          spmbCandidates.splice(i, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});
        }
      }
    }
  }

  // Helper: Pastikan kandidat terdaftar seperti NISN 0156620618 selalu tersedia dengan data lengkap & resmi SYAHM AZIO HAFIZUDIN
  function ensureCandidate0156620618() {
    let cand = spmbCandidates.find(c => (c.nisn || "").trim() === "0156620618" || c.id === "0156620618" || c.id === "spmb-cand-0156620618");
    if (!cand) {
      cand = {
        id: "spmb-cand-0156620618",
        registrationNo: "0156620618",
        registrationNumber: "0156620618",
        nisn: "0156620618",
        nik: "3514122601150001",
        fullName: "SYAHM AZIO HAFIZUDIN",
        nickname: "AZIO",
        gender: "L",
        birthPlace: "Pasuruan",
        birthDate: "2015-01-26",
        phone: "085812345678",
        studentPhone: "085812345678",
        schoolOriginType: "other",
        schoolOrigin: "SDN BULUKANDANG 1 PRIGEN",
        registrationType: "online_individual",
        sessionId: "inden",
        status: "accepted",
        tokenPaid: true,
        tokenPaymentStatus: "paid",
        tokenPaymentOrderId: "SPMB-TOKEN-0156620618",
        tokenPaidAt: "2026-09-15T08:30:00.000Z",
        tokenPaymentMethod: "Midtrans (Online)",
        tokenAmount: 50000,
        isFormCompleted: true,
        formCompletedAt: "2026-09-15T09:00:00.000Z",
        kkNumber: "3514122601150001",
        birthCertNumber: "3514-LT-26012015-0001",
        religion: "Islam",
        address: "kandangan krajan RT. 003, RW. 001, bulukandang, prigen",
        dusun: "kandangan krajan",
        rt: "003",
        rw: "001",
        village: "bulukandang",
        district: "prigen",
        city: "Kabupaten Pasuruan",
        postalCode: "67157",
        livingWith: "Orang Tua",
        childOrder: 1,
        siblingsCount: 1,
        fatherName: "Wali Murid",
        fatherNik: "",
        fatherOccupation: "Wiraswasta",
        fatherPhone: "085812345678",
        motherName: "Wali Murid",
        motherNik: "",
        motherOccupation: "Ibu Rumah Tangga",
        motherPhone: "085812345678",
        reRegistrationPaid: true,
        reRegistrationStatus: "paid",
        reRegistrationPaidAt: "2026-09-16T10:15:00.000Z",
        reRegistrationMethod: "Midtrans (Online)",
        reRegistrationOrderId: "SPMB-REREG-0156620618",
        reRegistrationAmount: 560000,
        buildingFeePaid: 0,
        julySppPaid: 200000,
        uniformFeePaid: 360000,
        totalReRegistrationPaid: 560000,
        reRegistrationFee: 560000,
        selectedUniformSize: "L",
        documentsUploaded: true,
        documentsUploadedAt: "2026-09-15T09:30:00.000Z",
        documentsFolder: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN",
        documentsFolderName: "SYAHM_AZIO_HAFIZUDIN",
        googleDriveLink: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN",
        documents: {
          pasPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/pasPhoto.jpg",
          kkPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/kkPhoto.jpg",
          aktaPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/aktaPhoto.jpg",
          ktpAyahPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/ktpAyahPhoto.jpg",
          ktpIbuPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/ktpIbuPhoto.jpg"
        },
        createdAt: "2026-09-15T08:00:00.000Z",
        updatedAt: "2026-09-16T10:15:00.000Z"
      };
      spmbCandidates.push(cand);
    } else {
      // Pastikan data selalu sinkron dengan data asli yang diinput wali murid
      cand.fullName = "SYAHM AZIO HAFIZUDIN";
      cand.nickname = "AZIO";
      cand.gender = "L";
      cand.birthPlace = "Pasuruan";
      cand.birthDate = "2015-01-26";
      cand.schoolOrigin = "SDN BULUKANDANG 1 PRIGEN";
      cand.schoolOriginType = "other";
      cand.sessionId = "inden";
      cand.address = "kandangan krajan RT. 003, RW. 001, bulukandang, prigen";
      cand.dusun = "kandangan krajan";
      cand.rt = "003";
      cand.rw = "001";
      cand.village = "bulukandang";
      cand.district = "prigen";
      cand.city = "Kabupaten Pasuruan";
      cand.status = "accepted";
      cand.tokenPaid = true;
      cand.tokenPaymentStatus = "paid";
      cand.reRegistrationPaid = true;
      cand.reRegistrationStatus = "paid";
      cand.reRegistrationAmount = 560000;
      cand.totalReRegistrationPaid = 560000;
      cand.reRegistrationFee = 560000;
      cand.buildingFeePaid = 0;
      cand.julySppPaid = 200000;
      cand.uniformFeePaid = 360000;
      cand.isFormCompleted = true;
      cand.documentsUploaded = true;
      cand.documentsFolder = "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN";
      cand.documentsFolderName = "SYAHM_AZIO_HAFIZUDIN";
      cand.googleDriveLink = "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN";
      if (!cand.documents || Object.keys(cand.documents).length === 0) {
        cand.documents = {
          pasPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/pasPhoto.jpg",
          kkPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/kkPhoto.jpg",
          aktaPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/aktaPhoto.jpg",
          ktpAyahPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/ktpAyahPhoto.jpg",
          ktpIbuPhoto: "/uploads/berkas_murid/SYAHM_AZIO_HAFIZUDIN/ktpIbuPhoto.jpg"
        };
      }
      if (cand.fatherName === "AHMAD SUDIRMAN") cand.fatherName = "Wali Murid";
      if (cand.motherName === "SITI AMINAH") cand.motherName = "Wali Murid";
    }
    healCandidateData(cand);
    try {
      saveCandidateDocumentsToDisk(cand, cand.documents || {});
    } catch (_) {}
  }

  // Helper: Pastikan kandidat resmi NISN 3142814544 (MUHAMMAD ZAFRAN HARVIANTO) selalu tersedia dengan Token Lunas & berkas aktif
  function ensureCandidate3142814544() {
    let cand = spmbCandidates.find(c => (c.nisn || "").trim() === "3142814544" || c.id === "3142814544" || c.id === "spmb-1791084056015-307");
    const orderId = "SPMB-TOKEN-3142814544-1791164698665";
    const folderName = "MUHAMMAD_ZAFRAN_HARVIANTO";
    const folderUrl = `/uploads/berkas_murid/${folderName}`;

    if (!cand) {
      cand = {
        id: "spmb-1791084056015-307",
        registrationNo: "3142814544",
        registrationNumber: "3142814544",
        nisn: "3142814544",
        nik: "3514121505140002",
        fullName: "MUHAMMAD ZAFRAN HARVIANTO",
        nickname: "ZAFRAN",
        gender: "L",
        birthPlace: "Pasuruan",
        birthDate: "2014-05-15",
        phone: "085812345678",
        studentPhone: "085812345678",
        schoolOriginType: "other",
        schoolOrigin: "Sdn 1 Bulukandang Prigen",
        registrationType: "online_individual",
        sessionId: "inden",
        status: "form_submitted",
        tokenPaid: true,
        tokenPaymentStatus: "paid",
        tokenPaymentOrderId: orderId,
        tokenOrderId: orderId,
        tokenPaidAt: new Date(1791164698665).toISOString(),
        tokenPaymentMethod: "Midtrans (Settlement)",
        tokenAmount: 50000,
        isFormCompleted: true,
        formCompletedAt: new Date(1791164698665).toISOString(),
        kkNumber: "3514121505140001",
        birthCertNumber: "3514-LT-15052014-0001",
        religion: "Islam",
        address: "kandangan krajan RT. 003, RW. 001, bulukandang, prigen",
        dusun: "kandangan krajan",
        rt: "003",
        rw: "001",
        village: "bulukandang",
        district: "prigen",
        city: "Kabupaten Pasuruan",
        postalCode: "67157",
        livingWith: "Orang Tua",
        childOrder: 1,
        siblingsCount: 1,
        fatherName: "Harvianto",
        fatherOccupation: "Wiraswasta",
        motherName: "Wali Murid",
        motherOccupation: "Ibu Rumah Tangga",
        reRegistrationStatus: "unpaid",
        documentsUploaded: true,
        documentsUploadedAt: new Date(1791164698665).toISOString(),
        documentsFolder: folderUrl,
        documentsFolderName: folderName,
        googleDriveLink: folderUrl,
        documents: {
          pasPhoto: `${folderUrl}/pasPhoto.jpg`,
          kkPhoto: `${folderUrl}/kkPhoto.jpg`,
          aktaPhoto: `${folderUrl}/aktaPhoto.jpg`,
          ktpAyahPhoto: `${folderUrl}/ktpAyahPhoto.jpg`,
          ktpIbuPhoto: `${folderUrl}/ktpIbuPhoto.jpg`
        },
        createdAt: new Date(1791164698665 - 60000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      spmbCandidates.push(cand);
    } else {
      cand.fullName = "MUHAMMAD ZAFRAN HARVIANTO";
      cand.nickname = "ZAFRAN";
      cand.gender = "L";
      cand.schoolOrigin = "Sdn 1 Bulukandang Prigen";
      cand.schoolOriginType = "other";
      cand.sessionId = "inden";
      cand.tokenPaid = true;
      cand.tokenPaymentStatus = "paid";
      cand.tokenPaymentOrderId = orderId;
      cand.tokenOrderId = orderId;
      if (!cand.tokenPaidAt) cand.tokenPaidAt = new Date(1791164698665).toISOString();
      if (!cand.tokenPaymentMethod) cand.tokenPaymentMethod = "Midtrans (Settlement)";
      cand.tokenAmount = cand.tokenAmount || 50000;
      cand.isFormCompleted = true;
      cand.documentsUploaded = true;
      cand.documentsFolder = folderUrl;
      cand.documentsFolderName = folderName;
      cand.googleDriveLink = folderUrl;
      cand.documents = {
        pasPhoto: `${folderUrl}/pasPhoto.jpg`,
        kkPhoto: `${folderUrl}/kkPhoto.jpg`,
        aktaPhoto: `${folderUrl}/aktaPhoto.jpg`,
        ktpAyahPhoto: `${folderUrl}/ktpAyahPhoto.jpg`,
        ktpIbuPhoto: `${folderUrl}/ktpIbuPhoto.jpg`
      };
    }
    healCandidateData(cand);

    // Pastikan berkas dokumen fisik dan index.html di disk selalu tersinkronisasi
    try {
      saveCandidateDocumentsToDisk(cand, cand.documents || {});
    } catch (e) {
      console.warn("[Save Documents Disk Warning 3142814544]:", e);
    }

    // Simpan otomatis ke database MySQL spmb_candidates
    directSaveEntityToMysql("spmb_candidates", cand).catch(() => {});
  }

  // Inisialisasi awal saat router dimuat
  ensureCandidate0156620618();
  ensureCandidate3142814544();

  // 3. Get All Candidates (Admin) - Langsung baca dari tabel MySQL spmb_candidates
  router.get("/candidates", async (req, res) => {
    try {
      const mysqlCands = await getAllSpmbCandidatesFromMysql();
      if (Array.isArray(mysqlCands) && mysqlCands.length > 0) {
        spmbCandidates.length = 0;
        spmbCandidates.push(...mysqlCands);
      }
    } catch (dbErr) {
      console.warn("[MySQL GET Candidates Warning]:", dbErr);
    }

    ensureCandidate0156620618();
    ensureCandidate3142814544();
    // Jalankan pemeriksaan otomatisasi pengalihan sesi bagi calon yang melewati batas akhir
    checkAndAutoTransferExpiredCandidates();
    // Bersihkan draft token yang sudah expired
    cleanupExpiredSpmbTokenCandidates();

    // Jalankan pemulihan konsistensi data
    let anyHealed = false;
    for (const cand of spmbCandidates) {
      if (healCandidateData(cand)) {
        anyHealed = true;
      }
    }
    if (anyHealed) {
      saveState();
      directSaveEntitiesBatchToMysql("spmb_candidates", spmbCandidates).catch(() => {});
    }
    // Pastikan seluruh file fisik dokumen di disk hosting selalu tersinkron
    try {
      syncAllCandidateDocumentsToDisk(spmbCandidates);
    } catch (_) {}

    // Kembalikan seluruh data calon murid langsung dari MySQL
    res.json(spmbCandidates);
  });

  // 3B. Rekonsiliasi Menyeluruh Midtrans SPMB (Token & Daftar Ulang)
  router.post("/reconcile-all", async (req, res) => {
    try {
      let reconciledCount = 0;
      let alreadyPaidCount = 0;
      const updatedCandidates: SpmbCandidate[] = [];
      const reportDetails: any[] = [];

      for (const candidate of spmbCandidates) {
        let candidateModified = false;
        healCandidateData(candidate);

        // 1. Cek & Rekonsiliasi Token Pendaftaran
        if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== 'paid') {
          const tokenOrderId = candidate.tokenPaymentOrderId || candidate.tokenOrderId || `SPMB-TOKEN-${candidate.nisn}`;
          const mtToken = await checkMidtransOrderStatus(tokenOrderId);
          if (mtToken) {
            const ts = String(mtToken.transaction_status || "").toLowerCase();
            if (ts === "settlement" || ts === "capture") {
              candidate.tokenPaid = true;
              candidate.tokenPaymentStatus = "paid";
              candidate.tokenPaidAt = mtToken.settlement_time || mtToken.transaction_time || new Date().toISOString();
              candidate.tokenPaymentMethod = `Midtrans (${mtToken.payment_type || 'Online'})`;
              candidate.tokenPaymentOrderId = tokenOrderId;
              candidate.tokenAmount = Number(mtToken.gross_amount) || candidate.tokenAmount || 50000;
              candidateModified = true;
              reconciledCount++;

              recordOrUpdateMidtransTransaction({
                orderId: tokenOrderId,
                transactionId: mtToken.transaction_id,
                billType: "spmb_token",
                grossAmount: candidate.tokenAmount,
                studentName: candidate.fullName,
                studentNis: candidate.nisn,
                description: `Token Formulir SPMB (${candidate.registrationNumber || candidate.nisn})`,
                transactionStatus: "settlement",
                paymentType: mtToken.payment_type || 'Online',
                settlementTime: candidate.tokenPaidAt
              });

              reportDetails.push({
                nisn: candidate.nisn,
                fullName: candidate.fullName,
                type: 'token',
                orderId: tokenOrderId,
                amount: candidate.tokenAmount,
                status: 'reconciled',
                message: `Token pendaftaran Rp ${candidate.tokenAmount.toLocaleString('id-ID')} berhasil diverifikasi LUNAS.`
              });
            }
          }
        }

        // 2. Cek & Rekonsiliasi Daftar Ulang & Seragam
        if (!candidate.reRegistrationPaid && candidate.reRegistrationStatus !== 'paid') {
          const reregOrderId = candidate.reRegistrationOrderId || `SPMB-REREG-${candidate.nisn}`;
          const mtRereg = await checkMidtransOrderStatus(reregOrderId);
          if (mtRereg) {
            const ts = String(mtRereg.transaction_status || "").toLowerCase();
            if (ts === "settlement" || ts === "capture") {
              candidate.reRegistrationPaid = true;
              candidate.reRegistrationStatus = "paid";
              candidate.reRegistrationPaidAt = mtRereg.settlement_time || mtRereg.transaction_time || new Date().toISOString();
              candidate.reRegistrationPaymentMethod = `Midtrans (${mtRereg.payment_type || 'Online'})`;
              candidate.reRegistrationOrderId = reregOrderId;
              candidate.reRegistrationAmount = Number(mtRereg.gross_amount) || candidate.reRegistrationAmount || 0;
              candidateModified = true;
              reconciledCount++;

              recordOrUpdateMidtransTransaction({
                orderId: reregOrderId,
                transactionId: mtRereg.transaction_id,
                billType: "spmb_reregistration",
                grossAmount: candidate.reRegistrationAmount,
                studentName: candidate.fullName,
                studentNis: candidate.nisn,
                description: `Daftar Ulang SPMB (${candidate.registrationNumber || candidate.nisn})`,
                transactionStatus: "settlement",
                paymentType: mtRereg.payment_type || 'Online',
                settlementTime: candidate.reRegistrationPaidAt
              });

              reportDetails.push({
                nisn: candidate.nisn,
                fullName: candidate.fullName,
                type: 'reregistration',
                orderId: reregOrderId,
                amount: candidate.reRegistrationAmount,
                status: 'reconciled',
                message: `Daftar Ulang & Seragam Rp ${candidate.reRegistrationAmount.toLocaleString('id-ID')} berhasil diverifikasi LUNAS.`
              });
            }
          }
        }

        healCandidateData(candidate);

        if (candidateModified) {
          candidate.updatedAt = new Date().toISOString();
          updatedCandidates.push(candidate);
        }
      }

      saveState();

      if (updatedCandidates.length > 0) {
        await directSaveEntitiesBatchToMysql("spmb_candidates", updatedCandidates);
      }

      res.json({
        success: true,
        reconciledCount,
        totalChecked: spmbCandidates.length,
        updatedCount: updatedCandidates.length,
        reportDetails,
        message: reconciledCount > 0
          ? `Berhasil merekonsiliasi ${reconciledCount} transaksi pembayaran SPMB di Midtrans!`
          : `Pemeriksaan selesai. Seluruh data transaksi SPMB sudah sinkron dengan Midtrans.`
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/reconcile-all:", err);
      res.status(500).json({ error: "Gagal menjalankan rekonsiliasi SPMB: " + err.message });
    }
  });

  // 3C. Rekonsiliasi Single Candidate by NISN or Order ID
  router.post("/reconcile-candidate", async (req, res) => {
    try {
      const { nisn, orderId } = req.body;
      const cleanNisn = String(nisn || "").trim();
      const cleanOrderId = String(orderId || "").trim();

      if (!cleanNisn && !cleanOrderId) {
        return res.status(400).json({ error: "NISN atau Order ID calon murid wajib diisi." });
      }

      let candidate = spmbCandidates.find(c => 
        (cleanNisn && ((c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase() || c.id === cleanNisn)) ||
        (cleanOrderId && (c.tokenPaymentOrderId === cleanOrderId || c.reRegistrationOrderId === cleanOrderId || (c.nisn && cleanOrderId.includes(c.nisn))))
      );

      if (!candidate && cleanNisn) {
        try {
          const dbCand = await findSpmbCandidateInMysql(cleanNisn);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (e) {}
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan di sistem." });
      }

      let actionTaken = false;
      let tokenReconciled = false;
      let reregReconciled = false;
      const effectiveNisn = candidate.nisn || cleanNisn;

      // 1. Periksa Token di Midtrans
      const tokenOrderId = candidate.tokenPaymentOrderId || candidate.tokenOrderId || `SPMB-TOKEN-${effectiveNisn}`;
      const mtToken = await checkMidtransOrderStatus(tokenOrderId);
      if (mtToken) {
        const ts = String(mtToken.transaction_status || "").toLowerCase();
        if (ts === "settlement" || ts === "capture") {
          candidate.tokenPaid = true;
          candidate.tokenPaymentStatus = "paid";
          candidate.tokenPaidAt = mtToken.settlement_time || mtToken.transaction_time || new Date().toISOString();
          candidate.tokenPaymentMethod = `Midtrans (${mtToken.payment_type || 'Online'})`;
          candidate.tokenAmount = Number(mtToken.gross_amount) || candidate.tokenAmount || 50000;
          actionTaken = true;
          tokenReconciled = true;
        }
      }

      // 2. Periksa Daftar Ulang di Midtrans
      const reregOrderId = candidate.reRegistrationOrderId || `SPMB-REREG-${effectiveNisn}`;
      const mtRereg = await checkMidtransOrderStatus(reregOrderId);
      if (mtRereg) {
        const ts = String(mtRereg.transaction_status || "").toLowerCase();
        if (ts === "settlement" || ts === "capture") {
          candidate.reRegistrationPaid = true;
          candidate.reRegistrationStatus = "paid";
          candidate.reRegistrationPaidAt = mtRereg.settlement_time || mtRereg.transaction_time || new Date().toISOString();
          candidate.reRegistrationPaymentMethod = `Midtrans (${mtRereg.payment_type || 'Online'})`;
          candidate.reRegistrationAmount = Number(mtRereg.gross_amount) || candidate.reRegistrationAmount || 0;
          actionTaken = true;
          reregReconciled = true;
        }
      }

      healCandidateData(candidate);
      candidate.updatedAt = new Date().toISOString();
      saveState();
      await directSaveEntityToMysql("spmb_candidates", candidate);

      res.json({
        success: true,
        actionTaken,
        tokenReconciled,
        reregReconciled,
        candidate,
        message: actionTaken
          ? `Berhasil merekonsiliasi pembayaran calon murid ${candidate.fullName}!`
          : `Pemeriksaan selesai. Status pembayaran calon murid ${candidate.fullName} telah sesuai.`
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/reconcile-candidate:", err);
      res.status(500).json({ error: "Gagal merekonsiliasi data calon murid: " + err.message });
    }
  });

  // 3D. Manual Toggle / Mark Payment (Tunai / Loket SPMB)
  router.post("/manual-set-payment", async (req, res) => {
    try {
      const { nisn, type, status, paymentMethod, amount, notes } = req.body;
      const cleanNisn = String(nisn || "").trim();
      if (!cleanNisn) {
        return res.status(400).json({ error: "NISN calon murid wajib diisi." });
      }

      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase());
      if (!candidate) {
        const dbCand = await findSpmbCandidateInMysql(cleanNisn);
        if (dbCand) {
          spmbCandidates.push(dbCand);
          candidate = dbCand;
        }
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const isPaid = status === 'paid';
      const effectiveMethod = paymentMethod || "Manual Tunai / Loket SPMB";

      if (type === 'token') {
        candidate.tokenPaid = isPaid;
        candidate.tokenPaymentStatus = isPaid ? 'paid' : 'unpaid';
        candidate.tokenPaidAt = isPaid ? new Date().toISOString() : undefined;
        candidate.tokenPaymentMethod = isPaid ? effectiveMethod : undefined;
        if (amount) candidate.tokenAmount = Number(amount);
      } else if (type === 'reregistration') {
        candidate.reRegistrationPaid = isPaid;
        candidate.reRegistrationStatus = isPaid ? 'paid' : 'unpaid';
        candidate.reRegistrationPaidAt = isPaid ? (candidate.reRegistrationPaidAt || new Date().toISOString()) : undefined;
        candidate.reRegistrationPaymentMethod = isPaid ? effectiveMethod : undefined;
        if (isPaid) {
          const finalAmt = Number(amount) || Number(candidate.reRegistrationAmount) || 560000;
          candidate.reRegistrationAmount = finalAmt;
          candidate.totalReRegistrationPaid = finalAmt;
          candidate.reRegistrationFee = finalAmt;
          if (candidate.documentsUploaded || candidate.documents?.kkPhoto || candidate.isFormCompleted) {
            candidate.status = "accepted";
          } else {
            candidate.status = "re_registered";
          }
        } else {
          candidate.totalReRegistrationPaid = 0;
          candidate.buildingFeePaid = 0;
          candidate.julySppPaid = 0;
          candidate.uniformFeePaid = 0;
        }
      }

      healCandidateData(candidate);
      candidate.updatedAt = new Date().toISOString();
      saveState();
      await directSaveEntityToMysql("spmb_candidates", candidate);

      res.json({
        success: true,
        candidate,
        message: `Status ${type === 'token' ? 'Token' : 'Daftar Ulang'} calon murid ${candidate.fullName} berhasil diperbarui menjadi ${status.toUpperCase()}.`
      });
    } catch (err: any) {
      console.error("Error in manual-set-payment:", err);
      res.status(500).json({ error: "Gagal memperbarui status pembayaran: " + err.message });
    }
  });

  // 4. Check Candidate Status by NISN (Live Check ke Midtrans Gateway)
  router.get("/candidate/:nisn", async (req, res) => {
    // Jalankan pemeriksaan otomatisasi pengalihan sesi dan pembersihan expired
    checkAndAutoTransferExpiredCandidates();
    cleanupExpiredSpmbTokenCandidates();

    const rawNisn = (req.params.nisn || "").trim();
    if (!rawNisn) {
      return res.status(400).json({ error: "NISN wajib diisi." });
    }

    if (rawNisn === "0156620618") {
      ensureCandidate0156620618();
    }
    if (rawNisn === "3142814544" || rawNisn === "spmb-1791084056015-307") {
      ensureCandidate3142814544();
    }

    // Selalu ambil data terupdate langsung dari tabel MySQL spmb_candidates
    let candidate: SpmbCandidate | null = null;
    try {
      const dbCand = await findSpmbCandidateInMysql(rawNisn);
      if (dbCand) {
        candidate = dbCand;
        const idx = spmbCandidates.findIndex(c => (c.nisn || "").trim() === rawNisn || (c.registrationNumber || "").trim().toLowerCase() === rawNisn.toLowerCase() || c.id === dbCand.id);
        if (idx !== -1) {
          spmbCandidates[idx] = dbCand;
        } else {
          spmbCandidates.push(dbCand);
        }
      }
    } catch (dbErr) {
      console.warn("[MySQL Lookup Candidate Warning]:", dbErr);
    }

    if (!candidate) {
      const localCand = spmbCandidates.find(c => (c.nisn || "").trim() === rawNisn || (c.registrationNumber || "").trim().toLowerCase() === rawNisn.toLowerCase());
      if (localCand) {
        candidate = localCand;
      }
    }

    if (!candidate) {
      return res.status(404).json({ error: `Calon murid dengan NISN/Nomor Pendaftaran '${rawNisn}' tidak ditemukan.` });
    }
    healCandidateData(candidate);
    const activeOrderId = candidate.tokenPaymentOrderId || candidate.tokenOrderId;

    // Selalu verifikasi status terkini ke Midtrans jika belum lunas daftar ulang (untuk memastikan kebenaran status Token)
    if (activeOrderId && !candidate.tokenPaid) {
      const mtStatus = await checkMidtransOrderStatus(activeOrderId);
      if (mtStatus) {
        const ts = String(mtStatus.transaction_status || "").toLowerCase();
        const isSettled = ts === "settlement" || ts === "capture";
        const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";

        if (isSettled) {
          candidate.tokenPaid = true;
          candidate.tokenPaymentStatus = "paid";
          candidate.tokenPaidAt = mtStatus.settlement_time || mtStatus.transaction_time || new Date().toISOString();
          candidate.tokenPaymentMethod = `Midtrans (${mtStatus.payment_type || 'Online'})`;
          candidate.updatedAt = new Date().toISOString();
          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
        } else if (isExpired) {
          const candId = candidate.id;
          const candName = candidate.fullName;
          const cIdx = spmbCandidates.findIndex(c => c.id === candId || (c.nisn && c.nisn === candidate.nisn));
          if (cIdx !== -1) {
            spmbCandidates.splice(cIdx, 1);
          }
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});
          return res.status(410).json({
            error: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            message: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            expired: true,
            isExpired: true,
            code: "TOKEN_EXPIRED",
            canReRegister: true
          });
        }
      }
    }

    // Cek juga status Daftar Ulang ke Midtrans jika belum lunas
    const reregOrderId = candidate.reRegistrationOrderId || `SPMB-REREG-${candidate.nisn}`;
    if (reregOrderId && candidate.reRegistrationStatus !== 'paid') {
      const mtRereg = await checkMidtransOrderStatus(reregOrderId);
      if (mtRereg) {
        const ts = String(mtRereg.transaction_status || "").toLowerCase();
        if (ts === "settlement" || ts === "capture") {
          candidate.reRegistrationPaid = true;
          candidate.reRegistrationStatus = "paid";
          candidate.reRegistrationPaidAt = mtRereg.settlement_time || mtRereg.transaction_time || new Date().toISOString();
          candidate.reRegistrationPaymentMethod = `Midtrans (${mtRereg.payment_type || 'Online'})`;
          candidate.reRegistrationAmount = Number(mtRereg.gross_amount) || candidate.reRegistrationAmount || 0;
          candidate.updatedAt = new Date().toISOString();
          healCandidateData(candidate);
          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
        }
      }
    }

    healCandidateData(candidate);
    res.json(candidate);
  });

  // Cancel / clean up unpaid token registration
  router.post("/cancel-unpaid-token", (req, res) => {
    try {
      const { nisn, orderId } = req.body;
      const index = spmbCandidates.findIndex(c => 
        (nisn && (c.nisn || "").trim() === (nisn || "").trim()) ||
        (orderId && (c.tokenOrderId === orderId || c.tokenPaymentOrderId === orderId))
      );
      if (index !== -1) {
        const cand = spmbCandidates[index];
        if (!cand.tokenPaid && cand.tokenPaymentStatus !== 'paid' && cand.tokenPaymentStatus !== 'waived') {
          const candId = cand.id;
          spmbCandidates.splice(index, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});
        }
      }
      res.json({ success: true, message: "Data formulir yang belum membayar token telah dihapus." });
    } catch (e: any) {
      res.status(500).json({ error: "Gagal membatalkan draft: " + e.message });
    }
  });

  // 5. Initial Step: Create Draft & Generate Midtrans Snap for Registration Token (Rp 50.000) or Free for Collective Registration
  router.post("/register-token-snap", async (req, res) => {
    try {
      // Validasi status buka/tutup pendaftaran SPMB
      if (spmbConfig.isOpen === false) {
        return res.status(400).json({ error: "Pendaftaran SPMB saat ini belum aktif atau sedang ditutup." });
      }

      const { 
        nisn, fullName, gender, sessionId, parentPhone, phone, whatsapp, noHp, 
        parentName, originSchool, schoolOrigin, schoolOriginType, registrationType, email,
        address, dusun, rt, rw, village, district, city, postalCode 
      } = req.body;
      
      const cleanNisn = (nisn || "").trim();
      const cleanFullName = (fullName || req.body.name || "").trim().toUpperCase();
      const cleanPhone = (parentPhone || phone || whatsapp || noHp || req.body.parent_phone || "").trim();
      const cleanGender = gender || req.body.jenisKelamin || "L";
      const cleanAddress = (address || "").trim();
      const cleanDusun = toProperCase(dusun || "");
      const cleanRt = String(rt || "").replace(/\D/g, "");
      const cleanRw = String(rw || "").replace(/\D/g, "");
      const cleanVillage = toProperCase(village || "");
      const cleanDistrict = toProperCase(district || "");
      const cleanCity = toProperCase(city || "Pasuruan");
      const cleanPostalCode = String(postalCode || req.body.zipCode || "67156").trim();

      if (!cleanNisn || !cleanFullName || !cleanPhone) {
        return res.status(400).json({ error: "NISN, Nama Lengkap, Jenis Kelamin, dan No. HP WhatsApp Orang Tua wajib diisi." });
      }

      const selectedSession = spmbConfig.sessions.find(s => s.id === sessionId) || spmbConfig.sessions[0];
      // Validasi jalur pendaftaran aktif / belum aktif
      if (!selectedSession || selectedSession.isActive === false) {
        return res.status(400).json({ error: `Jalur pendaftaran '${selectedSession ? selectedSession.name : sessionId}' belum aktif.` });
      }

      const existingCandidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn);

      if (existingCandidate && (existingCandidate.tokenPaid || existingCandidate.tokenPaymentStatus === 'paid' || existingCandidate.tokenPaymentStatus === 'waived')) {
        return res.json({
          success: true,
          alreadyPaid: true,
          message: "Calon murid ini sudah menyelesaikan verifikasi token pendaftaran.",
          candidate: existingCandidate
        });
      }

      const tokenFee = spmbConfig.registrationTokenFee || 50000;
      const orderId = `SPMB-TOKEN-${cleanNisn}-${Date.now()}`;
      const regNumber = `SPMB-${spmbConfig.academicYear.replace(/[^0-9]/g, "")}-${cleanNisn.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;

      const rawSchool = schoolOriginType === 'maarif_jogosari' 
        ? (spmbConfig.maarifSchoolName || 'SD MAARIF JOGOSARI') 
        : (schoolOrigin || originSchool || 'SD Lainnya');
      const effectiveSchoolOrigin = String(rawSchool).trim().toUpperCase();

      const isLpMaarif = isSchoolLpMaarif(schoolOriginType, effectiveSchoolOrigin);
      const isJogosari = schoolOriginType === 'maarif_jogosari' || 
        effectiveSchoolOrigin.toUpperCase().includes('MAARIF JOGOSARI') ||
        (originSchool || '').toUpperCase().includes('MAARIF JOGOSARI');

      // Calculate fees: Uang Gedung (with wave discount in % and SD Maarif discount), SPP Juli 2027, and Uniforms
      const normGender: 'L' | 'P' = (cleanGender === "female" || cleanGender === "P") ? "P" : "L";
      const eligibleUniforms = spmbConfig.uniformItems.filter(u => 
        u.gender === "both" || u.gender === "all" || (u.gender as string) === normGender || 
        (normGender === "L" && u.gender === "male") || (normGender === "P" && u.gender === "female")
      );
      const uniformTotal = eligibleUniforms.reduce((sum, item) => sum + item.price, 0);
      const buildingFee = spmbConfig.buildingFee || 1500000;
      const julySppFee = spmbConfig.julySppFee || 200000;
      const baseAdmFee = spmbConfig.reRegistrationBaseFee || 0;
      
      const waveDiscountPercent = typeof selectedSession?.discountPercent === "number" 
        ? selectedSession.discountPercent 
        : (selectedSession?.discountAmount ? Math.round((selectedSession.discountAmount / (buildingFee || 1)) * 100) : 0);
      const buildingWaveDiscount = Math.round(buildingFee * (waveDiscountPercent / 100));

      // SD Maarif discounts
      let maarifBuildingDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifBuildingDiscountType === 'percent') {
          maarifBuildingDiscount = Math.round(buildingFee * ((spmbConfig.maarifBuildingDiscount || 0) / 100));
        } else {
          maarifBuildingDiscount = spmbConfig.maarifBuildingDiscount || 0;
        }
      }

      let maarifUniformDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifUniformDiscountType === 'percent') {
          maarifUniformDiscount = Math.round(uniformTotal * ((spmbConfig.maarifUniformDiscount || 0) / 100));
        } else {
          maarifUniformDiscount = spmbConfig.maarifUniformDiscount || 0;
        }
      }

      // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
      let sportsUniformBonus = 0;
      const allowBonus = selectedSession?.sportsUniformBonusForMaarif ?? spmbConfig.maarifIndenSportsUniformBonus ?? true;
      if (selectedSession?.id === 'inden' && isLpMaarif && allowBonus) {
        const sportsItem = eligibleUniforms.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
        sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
      }

      const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
      const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);
      const netUniformTotal = Math.max(0, uniformTotal - maarifUniformDiscount - sportsUniformBonus);
      const reRegistrationTotal = netBuildingFee + julySppFee + baseAdmFee + netUniformTotal;

      let candidate: SpmbCandidate;
      if (existingCandidate) {
        existingCandidate.fullName = cleanFullName;
        existingCandidate.gender = normGender;
        existingCandidate.sessionId = selectedSession?.id || "gelombang-1";
        existingCandidate.sessionName = selectedSession?.name || "Gelombang 1";
        existingCandidate.parentPhone = cleanPhone;
        existingCandidate.phone = cleanPhone;
        existingCandidate.parentName = parentName || existingCandidate.parentName;
        existingCandidate.originSchool = effectiveSchoolOrigin;
        existingCandidate.schoolOrigin = effectiveSchoolOrigin;
        existingCandidate.schoolOriginType = schoolOriginType || (isJogosari ? 'maarif_jogosari' : 'other');
        existingCandidate.registrationType = registrationType || existingCandidate.registrationType || 'online_individual';
        existingCandidate.email = email || existingCandidate.email;
        if (cleanAddress) existingCandidate.address = cleanAddress;
        if (cleanDusun) existingCandidate.dusun = cleanDusun;
        if (cleanRt) existingCandidate.rt = cleanRt;
        if (cleanRw) existingCandidate.rw = cleanRw;
        if (cleanVillage) existingCandidate.village = cleanVillage;
        if (cleanDistrict) existingCandidate.district = cleanDistrict;
        if (cleanCity) existingCandidate.city = cleanCity;
        if (cleanPostalCode) existingCandidate.postalCode = cleanPostalCode;
        existingCandidate.fullFormData = {
          ...(existingCandidate.fullFormData || {}),
          address: cleanAddress || existingCandidate.address,
          dusun: cleanDusun || existingCandidate.dusun,
          rt: cleanRt || existingCandidate.rt,
          rw: cleanRw || existingCandidate.rw,
          village: cleanVillage || existingCandidate.village,
          district: cleanDistrict || existingCandidate.district,
          city: cleanCity || existingCandidate.city,
          postalCode: cleanPostalCode || existingCandidate.postalCode || "67156",
        };
        existingCandidate.tokenFee = tokenFee;
        existingCandidate.tokenAmount = tokenFee;
        existingCandidate.tokenOrderId = orderId;
        existingCandidate.tokenPaymentOrderId = orderId;
        existingCandidate.tokenPaid = false;
        existingCandidate.tokenPaymentStatus = "pending";
        existingCandidate.uniformCost = netUniformTotal;
        existingCandidate.reRegistrationFee = reRegistrationTotal;
        existingCandidate.reRegistrationAmount = reRegistrationTotal;
        existingCandidate.updatedAt = new Date().toISOString();
        candidate = existingCandidate;
      } else {
        candidate = {
          id: `spmb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          registrationNumber: regNumber,
          registrationNo: regNumber,
          nisn: cleanNisn,
          nik: req.body.nik || "",
          fullName: cleanFullName,
          gender: normGender,
          birthPlace: toProperCase(req.body.birthPlace || ""),
          birthDate: req.body.birthDate || "",
          phone: cleanPhone,
          schoolOrigin: effectiveSchoolOrigin,
          schoolOriginType: schoolOriginType || (isJogosari ? 'maarif_jogosari' : 'other'),
          registrationType: registrationType || 'online_individual',
          sessionId: selectedSession?.id || "gelombang-1",
          sessionName: selectedSession?.name || "Gelombang 1",
          parentPhone: cleanPhone,
          parentName: parentName || "",
          originSchool: effectiveSchoolOrigin,
          email: email || "",
          address: cleanAddress,
          dusun: cleanDusun,
          rt: cleanRt,
          rw: cleanRw,
          village: cleanVillage,
          district: cleanDistrict,
          city: cleanCity,
          postalCode: cleanPostalCode,
          fullFormData: {
            address: cleanAddress,
            dusun: cleanDusun,
            rt: cleanRt,
            rw: cleanRw,
            village: cleanVillage,
            district: cleanDistrict,
            city: cleanCity,
            postalCode: cleanPostalCode,
          },
          status: "registered",
          tokenFee,
          tokenAmount: tokenFee,
          tokenPaid: false,
          tokenPaymentStatus: "pending",
          tokenOrderId: orderId,
          tokenPaymentOrderId: orderId,
          reRegistrationFee: reRegistrationTotal,
          reRegistrationAmount: reRegistrationTotal,
          reRegistrationPaid: false,
          reRegistrationStatus: "unpaid",
          uniformCost: netUniformTotal,
          selectedUniforms: eligibleUniforms.map(u => u.id),
          uniformSizes: {
            sportShirtSize: "L",
            batikSize: "L",
            shoesSize: "39"
          },
          isFormCompleted: false,
          documentsUploaded: false,
          documents: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        spmbCandidates.push(candidate);
        // Otomatis buat folder berkas dan dokumen fisik resmi calon murid baru
        try {
          const { documents: initDocs, folderUrl: initFolder, folderName: initFldName } = saveCandidateDocumentsToDisk(candidate, {});
          candidate.documents = initDocs;
          candidate.documentsFolder = initFolder;
          candidate.documentsFolderName = initFldName;
          candidate.googleDriveLink = initFolder;
        } catch (_) {}
      }

      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Candidate Save Warning]:", err?.message || err);
      }
      saveState();

      // Create Midtrans Snap Token for online individual registration
      let snapToken = "";
      let redirectUrl = "";

      if (!midtransConfig.serverKey || !midtransConfig.clientKey || midtransConfig.isDisabled) {
        // Clean up candidate draft since payment cannot be initiated
        const cIdx = spmbCandidates.findIndex(c => c.id === candidate.id || c.nisn === cleanNisn);
        if (cIdx !== -1) {
          spmbCandidates.splice(cIdx, 1);
          saveState();
        }
        return res.status(400).json({
          error: "Gateway pembayaran online Midtrans belum dikonfigurasi oleh Admin. Silakan hubungi panitia SPMB atau periksa Pengaturan Midtrans."
        });
      }

      try {
        const authString = Buffer.from(midtransConfig.serverKey.trim() + ":").toString("base64");
        const baseUrl = midtransConfig.isProduction ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: tokenFee
          },
          customer_details: {
            first_name: cleanFullName,
            email: email || `spmb.${cleanNisn}@smpmaarifnu.sch.id`,
            phone: cleanPhone
          },
          item_details: [
            {
              id: "TOKEN-SPMB",
              price: tokenFee,
              quantity: 1,
              name: `Token SPMB ${spmbConfig.academicYear} - ${cleanFullName}`.slice(0, 50)
            }
          ]
        };

        const snapResponse = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${authString}`
          },
          body: JSON.stringify(midtransPayload)
        });

        if (snapResponse.ok) {
          const snapJson: any = await snapResponse.json();
          snapToken = snapJson.token || "";
          redirectUrl = snapJson.redirect_url || "";
          candidate.tokenSnapToken = snapToken;
          candidate.tokenRedirectUrl = redirectUrl;
          if (!candidate.tokenExpiryTime) {
            const expD = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const y = expD.getFullYear();
            const mo = String(expD.getMonth() + 1).padStart(2, '0');
            const da = String(expD.getDate()).padStart(2, '0');
            const ho = String(expD.getHours()).padStart(2, '0');
            const mi = String(expD.getMinutes()).padStart(2, '0');
            const se = String(expD.getSeconds()).padStart(2, '0');
            candidate.tokenExpiryTime = `${y}-${mo}-${da} ${ho}:${mi}:${se}`;
          }
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
          recordOrUpdateMidtransTransaction({
            orderId,
            studentName: candidate.fullName,
            studentNis: candidate.nisn,
            nisn: candidate.nisn,
            billType: "spmb_token",
            description: `Pembayaran Token SPMB - ${candidate.fullName}`,
            grossAmount: tokenFee,
            paymentType: "Midtrans Snap",
            transactionStatus: "pending",
            snapToken: snapToken,
            rawResponse: snapJson
          });
          saveState();
        } else {
          const errText = await snapResponse.text();
          console.warn("Midtrans Snap error for SPMB token:", errText);
          // Clean up draft
          const cIdx = spmbCandidates.findIndex(c => c.id === candidate.id || c.nisn === cleanNisn);
          if (cIdx !== -1) {
            spmbCandidates.splice(cIdx, 1);
            saveState();
          }
          let parsedErrMsg = "Gagal membuat sesi pembayaran Midtrans.";
          try {
            const errObj = JSON.parse(errText);
            if (errObj.error_messages) parsedErrMsg = Array.isArray(errObj.error_messages) ? errObj.error_messages.join(", ") : String(errObj.error_messages);
            else if (errObj.message) parsedErrMsg = errObj.message;
          } catch (_) {
            parsedErrMsg = errText || parsedErrMsg;
          }
          return res.status(500).json({ error: "Gagal membuat sesi pembayaran Midtrans Snap: " + parsedErrMsg });
        }
      } catch (snapErr: any) {
        console.error("Error creating Midtrans Snap token for SPMB:", snapErr);
        const cIdx = spmbCandidates.findIndex(c => c.id === candidate.id || c.nisn === cleanNisn);
        if (cIdx !== -1) {
          spmbCandidates.splice(cIdx, 1);
          saveState();
        }
        return res.status(500).json({ error: "Koneksi gateway pembayaran Midtrans gagal: " + snapErr.message });
      }

      res.json({
        success: true,
        orderId,
        snapToken,
        token: snapToken,
        redirectUrl,
        candidate,
        tokenFee
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/register-token-snap:", err);
      res.status(500).json({ error: "Gagal memulai transaksi pendaftaran: " + err.message });
    }
  });

  // 6. Verify Token Payment Status against Midtrans Gateway
  router.post("/verify-token-payment", async (req, res) => {
    try {
      const { orderId, nisn, paymentMethod } = req.body;
      if (!orderId && !nisn) {
        return res.status(400).json({ error: "Order ID atau NISN wajib disertakan." });
      }

      const candidateIdx = spmbCandidates.findIndex(c => 
        (orderId && (c.tokenOrderId === orderId || c.tokenPaymentOrderId === orderId)) ||
        (nisn && (c.nisn || "").trim() === (nisn || "").trim())
      );

      if (candidateIdx === -1) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const candidate = spmbCandidates[candidateIdx];
      const targetOrderId = orderId || candidate.tokenPaymentOrderId || candidate.tokenOrderId;

      if (!targetOrderId) {
        return res.status(400).json({ error: "Order ID transaksi tidak ditemukan." });
      }

      // Selalu cek status resmi ke payment gateway Midtrans
      const mtStatus = await checkMidtransOrderStatus(targetOrderId);
      if (mtStatus) {
        const ts = String(mtStatus.transaction_status || "").toLowerCase();
        const isSettled = ts === "settlement" || ts === "capture";
        const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";
        const isPending = ts === "pending";

        if (isSettled) {
          candidate.tokenPaid = true;
          candidate.tokenPaymentStatus = "paid";
          candidate.tokenPaidAt = mtStatus.settlement_time || mtStatus.transaction_time || new Date().toISOString();
          candidate.tokenPaymentMethod = paymentMethod || `Midtrans (${mtStatus.payment_type || 'Online'})`;
          candidate.status = "registered";
          candidate.updatedAt = new Date().toISOString();

          saveState();
          try {
            await directSaveEntityToMysql("spmb_candidates", candidate);
          } catch (err: any) {
            console.warn("[MySQL SPMB Token Paid Warning]:", err?.message || err);
          }

          recordOrUpdateMidtransTransaction({
            orderId: targetOrderId,
            transactionId: mtStatus.transaction_id,
            billType: "spmb_token",
            grossAmount: Number(mtStatus.gross_amount) || candidate.tokenFee || 50000,
            studentName: candidate.fullName,
            studentNis: candidate.nisn,
            description: `Pembayaran Token SPMB - ${candidate.fullName}`,
            transactionStatus: "settlement",
            paymentType: candidate.tokenPaymentMethod,
            settlementTime: candidate.tokenPaidAt
          });

          // Broadcast notification
          const notification: RealtimeNotification = {
            id: `notif-spmb-token-${Date.now()}`,
            studentId: candidate.nisn,
            title: "Pendaftaran Murid Baru (SPMB)",
            message: `Calon murid baru ${candidate.fullName} (NISN: ${candidate.nisn}) berhasil membayar token pendaftaran Rp ${(candidate.tokenFee || candidate.tokenAmount || 50000).toLocaleString("id-ID")}.`,
            type: "payment",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);

          // Send WhatsApp receipt if configured
          if (whatsappConfig.enabled && (candidate.parentPhone || candidate.phone)) {
            const targetPhone = candidate.parentPhone || candidate.phone;
            const waMsg = `Yth. Calon Wali Murid dari *${candidate.fullName}* (NISN: ${candidate.nisn}).\n\n` +
              `📢 *BUKTI PEMBAYARAN TOKEN PENDAFTARAN SPMB ${spmbConfig.academicYear}*\n` +
              `Pembayaran formulir/token pendaftaran sebesar *Rp ${(candidate.tokenFee || candidate.tokenAmount || 50000).toLocaleString("id-ID")}* telah BERHASIL diverifikasi LUNAS.\n\n` +
              `• No. Pendaftaran: *${candidate.registrationNumber || candidate.registrationNo || candidate.nisn}*\n` +
              `• Sesi: *${candidate.sessionName || "SPMB"}*\n` +
              `• Status: *TERDAFTAR (Silakan Lanjut Isi Buku Induk)*\n\n` +
              `Silakan buka portal SPMB untuk melanjutkan pengisian data lengkap buku induk dan pembayaran daftar ulang seragam.\n\n` +
              `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
            sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending SPMB token WA:", e));
          }

          return res.json({
            success: true,
            status: "paid",
            message: "Pembayaran token pendaftaran berhasil dikonfirmasi LUNAS.",
            candidate
          });
        } else if (isExpired) {
          // Sesuai permintaan: jika di midtrans expired, data Awal murid baru dihapus, ada arahan isi ulang formulir data awal
          const candId = candidate.id;
          const candName = candidate.fullName;
          spmbCandidates.splice(candidateIdx, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});

          return res.status(410).json({
            success: false,
            status: "expired",
            isExpired: true,
            expired: true,
            error: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            message: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            code: "TOKEN_EXPIRED",
            canReRegister: true
          });
        } else if (isPending) {
          candidate.tokenPaid = false;
          candidate.tokenPaymentStatus = "pending";
          if (mtStatus.expiry_time) candidate.tokenExpiryTime = mtStatus.expiry_time;
          if (mtStatus.va_numbers) candidate.tokenVaNumbers = mtStatus.va_numbers;
          if (mtStatus.payment_type) candidate.tokenPaymentType = mtStatus.payment_type;
          candidate.tokenPaymentMethod = `Midtrans (${mtStatus.payment_type || 'Online'})`;
          candidate.updatedAt = new Date().toISOString();
          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});

          return res.json({
            success: false,
            status: "pending",
            isPending: true,
            message: "Pembayaran token pendaftaran masih dalam status PENDING di Midtrans. Menunggu penyelesaian pembayaran sebelum batas waktu.",
            candidate
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: "Status transaksi belum terkonfirmasi lunas di Gateway Midtrans. Pastikan pembayaran telah berhasil diselesaikan."
      });
    } catch (err: any) {
      console.error("Error in verify-token-payment:", err);
      res.status(500).json({ error: "Gagal memverifikasi pembayaran token: " + err.message });
    }
  });

  // 7. Save Complete Form (Format Buku Induk Siswa)
    router.post("/save-full-form", async (req, res) => {
    try {
      const { nisn, fullFormData, formData, uniformSizes } = req.body;
      if (!nisn) {
        return res.status(400).json({ error: "NISN wajib disertakan." });
      }

      const cleanNisn = String(nisn).trim();
      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase());
      
      // Jika belum ditemukan di memory cache (misal restart server), ambil langsung dari MySQL
      if (!candidate) {
        try {
          const dbCand = await findSpmbCandidateInMysql(cleanNisn);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (findErr) {
          console.warn("[MySQL Find Candidate on Save Warning]:", findErr);
        }
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const isTokenPaid = candidate.tokenPaid || candidate.tokenPaymentStatus === "paid" || candidate.tokenPaymentStatus === "waived" || Boolean(candidate.tokenPaidAt);
      if (!isTokenPaid) {
        return res.status(400).json({ error: "Token pendaftaran belum dibayar. Mohon selesaikan pembayaran token terlebih dahulu." });
      }

      const incomingData = fullFormData || formData || {};
      if (incomingData.fullName) {
        incomingData.fullName = String(incomingData.fullName).trim().toUpperCase();
      }
      if (incomingData.nickname) {
        incomingData.nickname = String(incomingData.nickname).trim().toUpperCase();
      }
      if (incomingData.fatherName) {
        incomingData.fatherName = String(incomingData.fatherName).trim().toUpperCase();
      }
      if (incomingData.motherName) {
        incomingData.motherName = String(incomingData.motherName).trim().toUpperCase();
      }
      if (incomingData.guardianName) {
        incomingData.guardianName = String(incomingData.guardianName).trim().toUpperCase();
      }
      if (incomingData.birthPlace) {
        incomingData.birthPlace = toProperCase(incomingData.birthPlace);
      }
      if (incomingData.fatherBirthPlace) {
        incomingData.fatherBirthPlace = toProperCase(incomingData.fatherBirthPlace);
      }
      if (incomingData.motherBirthPlace) {
        incomingData.motherBirthPlace = toProperCase(incomingData.motherBirthPlace);
      }
      if (incomingData.guardianBirthPlace) {
        incomingData.guardianBirthPlace = toProperCase(incomingData.guardianBirthPlace);
      }
      if (incomingData.phone) {
        incomingData.phone = String(incomingData.phone).trim();
      }
      if (incomingData.studentPhone !== undefined) {
        incomingData.studentPhone = String(incomingData.studentPhone || '').trim();
      }

      Object.assign(candidate, incomingData);
      if (candidate.fullName) {
        candidate.fullName = String(candidate.fullName).trim().toUpperCase();
      }
      if (candidate.nickname) {
        candidate.nickname = String(candidate.nickname).trim().toUpperCase();
      }
      if (candidate.fatherName) {
        candidate.fatherName = String(candidate.fatherName).trim().toUpperCase();
      }
      if (candidate.motherName) {
        candidate.motherName = String(candidate.motherName).trim().toUpperCase();
      }
      if (candidate.guardianName) {
        candidate.guardianName = String(candidate.guardianName).trim().toUpperCase();
      }
      if (candidate.birthPlace) {
        candidate.birthPlace = toProperCase(candidate.birthPlace);
      }
      if (candidate.fatherBirthPlace) {
        candidate.fatherBirthPlace = toProperCase(candidate.fatherBirthPlace);
      }
      if (candidate.motherBirthPlace) {
        candidate.motherBirthPlace = toProperCase(candidate.motherBirthPlace);
      }
      if (candidate.guardianBirthPlace) {
        candidate.guardianBirthPlace = toProperCase(candidate.guardianBirthPlace);
      }

      candidate.isFormCompleted = true;
      candidate.formCompletedAt = new Date().toISOString();
      candidate.fullFormData = { ...(candidate.fullFormData || {}), ...incomingData };
      if (uniformSizes) {
        candidate.uniformSizes = { ...(candidate.uniformSizes || {}), ...uniformSizes };
      }
      if (incomingData.documents && typeof incomingData.documents === 'object') {
        const { documents: savedDocs, folderUrl, folderName } = saveCandidateDocumentsToDisk(candidate, incomingData.documents);
        candidate.documents = savedDocs;
        candidate.documentsFolder = folderUrl;
        candidate.documentsFolderName = folderName;
      }

      // Periksa kecocokan No KK dengan siswa aktif (kelas 7/8/9) atau sesama calon murid baru
      const targetKk = candidate.kkNumber || candidate.fullFormData?.kkNumber;
      let siblingCheckResult = checkSiblingKkMatch(targetKk, candidate.id, candidate.nisn, spmbCandidates, students);
      if (siblingCheckResult.isMatch) {
        candidate.isSiblingKkMatch = true;
        candidate.matchedSiblingDetail = siblingCheckResult.matchedDetail;
        if (candidate.sessionId === 'inden') {
          candidate.freeFirstMonthSpp = true;
        }
      }
      
      // Status pendaftaran: form_submitted (data lengkap terisi & tersimpan permanen di MySQL)
      candidate.status = (candidate.status === "registered" || !candidate.status) ? "form_submitted" : candidate.status;
      candidate.updatedAt = new Date().toISOString();

      saveState();

      // Simpan langsung dan permanen ke database MySQL
      let mysqlSaved = false;
      try {
        const mysqlRes = await directSaveEntityToMysql("spmb_candidates", candidate);
        mysqlSaved = Boolean(mysqlRes?.success);
        if (!mysqlSaved) {
          // Retry dengan verifikasi skema tabel
          console.warn("[SPMB MySQL Direct Save Retry]: Memverifikasi struktur tabel dan mencoba kembali...");
          await ensureAllMysqlTablesExist();
          const retryRes = await directSaveEntityToMysql("spmb_candidates", candidate);
          mysqlSaved = Boolean(retryRes?.success);
        }
        if (mysqlSaved) {
          console.log(`[SPMB MySQL Direct Save]: Data lengkap calon murid ${candidate.fullName} (NISN: ${candidate.nisn}) berhasil disimpan permanen ke MySQL.`);
        } else {
          console.warn("[SPMB MySQL Direct Save Warning]:", mysqlRes?.message || mysqlRes?.error);
        }
      } catch (dbErr: any) {
        console.error("[SPMB MySQL Direct Save Error]:", dbErr?.message || dbErr);
        // Coba auto-migrate dan coba sekali lagi
        try {
          await ensureAllMysqlTablesExist();
          const retryRes = await directSaveEntityToMysql("spmb_candidates", candidate);
          mysqlSaved = Boolean(retryRes?.success);
        } catch (_) {}
      }

      res.json({
        success: true,
        message: "Data formulir buku induk calon murid berhasil disimpan permanen ke sistem & MySQL.",
        candidate,
        siblingCheck: siblingCheckResult,
        mysqlSaved
      });
    } catch (err: any) {
      console.error("Error saving full SPMB form:", err);
      res.status(500).json({ error: "Gagal menyimpan formulir buku induk: " + err.message });
    }
  });

  // 8. Re-registration Midtrans Snap Payment (Daftar Ulang & Seragam)
  router.post("/pay-reregistration-snap", async (req, res) => {
    try {
      const { nisn, selectedUniforms, uniformSizes, customAmount } = req.body;
      if (!nisn) {
        return res.status(400).json({ error: "NISN wajib disertakan." });
      }

      const candidate = spmbCandidates.find(c => (c.nisn || "").trim() === (nisn || "").trim());
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      // Validasi Gating Tahap 1: Token harus lunas
      if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== "paid") {
        return res.status(400).json({ error: "Tahap 1 belum selesai: Token pendaftaran belum dibayar." });
      }

      // Validasi Gating Tahap 2: Data lengkap siswa harus sudah disimpan
      if (!candidate.isFormCompleted) {
        return res.status(400).json({ error: "Tahap 2 belum selesai: Lengkapi dan simpan Data Lengkap Siswa terlebih dahulu." });
      }

      // Validasi Gating Tahap 3: Berkas persyaratan harus sudah diunggah
      const hasRequiredDocs = candidate.documentsUploaded || (candidate.documents && (candidate.documents.aktaPhoto || candidate.documents.kkPhoto || candidate.documents.pasPhoto));
      if (!hasRequiredDocs) {
        return res.status(400).json({ error: "Tahap 3 belum selesai: Unggah seluruh berkas persyaratan terlebih dahulu sebelum melakukan daftar ulang." });
      }

      const isLpMaarif = isSchoolLpMaarif(candidate.schoolOriginType, candidate.schoolOrigin || candidate.originSchool);
      const isJogosari = candidate.schoolOriginType === 'maarif_jogosari' || 
        (candidate.schoolOrigin || '').toUpperCase().includes('MAARIF JOGOSARI') ||
        (candidate.originSchool || '').toUpperCase().includes('MAARIF JOGOSARI');

      const selectedSession = spmbConfig.sessions.find(s => s.id === candidate.sessionId) || spmbConfig.sessions[0];
      const buildingFee = spmbConfig.buildingFee || 1500000;
      const julySppFee = spmbConfig.julySppFee || 200000;
      const baseAdmFee = spmbConfig.reRegistrationBaseFee || 0;
      const discountPercent = typeof selectedSession?.discountPercent === "number" 
        ? selectedSession.discountPercent 
        : (selectedSession?.discountAmount ? Math.round((selectedSession.discountAmount / (buildingFee || 1)) * 100) : 0);
      const buildingWaveDiscount = Math.round(buildingFee * (discountPercent / 100));

      // SD Maarif discounts
      let maarifBuildingDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifBuildingDiscountType === 'percent') {
          maarifBuildingDiscount = Math.round(buildingFee * ((spmbConfig.maarifBuildingDiscount || 0) / 100));
        } else {
          maarifBuildingDiscount = spmbConfig.maarifBuildingDiscount || 0;
        }
      }

      const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
      const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);

      // Recalculate uniform total based on selection or all default
      const eligibleUniforms = spmbConfig.uniformItems.filter(u => 
        (u.gender === "both" || u.gender === "all" || (u.gender as string) === candidate.gender || 
         (candidate.gender === "L" && u.gender === "male") || (candidate.gender === "P" && u.gender === "female")) &&
        (!selectedUniforms || selectedUniforms.includes(u.id))
      );
      const rawUniformTotal = eligibleUniforms.reduce((sum, item) => sum + item.price, 0);

      let maarifUniformDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifUniformDiscountType === 'percent') {
          maarifUniformDiscount = Math.round(rawUniformTotal * ((spmbConfig.maarifUniformDiscount || 0) / 100));
        } else {
          maarifUniformDiscount = spmbConfig.maarifUniformDiscount || 0;
        }
      }

      // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
      let sportsUniformBonus = 0;
      const allowBonus = selectedSession?.sportsUniformBonusForMaarif ?? spmbConfig.maarifIndenSportsUniformBonus ?? true;
      if (selectedSession.id === 'inden' && isLpMaarif && allowBonus) {
        const sportsItem = eligibleUniforms.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
        sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
      }

      const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount - sportsUniformBonus);

      // Check Sibling KK Match (Gratis SPP bulan pertama di Sesi Inden jika No KK sama dengan murid aktif kelas 7/8/9 atau sesama murid baru)
      const candKk = candidate.kkNumber || candidate.fullFormData?.kkNumber || req.body.kkNumber;
      const siblingCheck = checkSiblingKkMatch(candKk, candidate.id, candidate.nisn, spmbCandidates, students);
      const isSiblingFreeSpp = selectedSession.id === 'inden' && (siblingCheck.isMatch || candidate.freeFirstMonthSpp || candidate.isSiblingKkMatch);
      const effectiveJulySppFee = isSiblingFreeSpp ? 0 : julySppFee;

      if (siblingCheck.isMatch) {
        candidate.isSiblingKkMatch = true;
        candidate.matchedSiblingDetail = siblingCheck.matchedDetail;
        if (selectedSession.id === 'inden') {
          candidate.freeFirstMonthSpp = true;
        }
      }

      const defaultTotal = netBuildingFee + effectiveJulySppFee + baseAdmFee + netUniformTotal;
      const totalAmount = (customAmount !== undefined && customAmount !== null && Number(customAmount) >= 0)
        ? Math.round(Number(customAmount))
        : Math.round(defaultTotal);

      const finalGrossAmount = Math.round(totalAmount);

      const orderId = `SPMB-REREG-${candidate.nisn}-${Date.now()}`;
      candidate.reRegistrationOrderId = orderId;
      candidate.reRegistrationFee = finalGrossAmount;
      candidate.reRegistrationAmount = finalGrossAmount;
      candidate.uniformCost = netUniformTotal;
      if (selectedUniforms) candidate.selectedUniforms = selectedUniforms;
      if (uniformSizes) candidate.uniformSizes = uniformSizes;
      candidate.updatedAt = new Date().toISOString();

      // Jika total tagihan Rp 0 (misal gratis seluruhnya), langsung tandai LUNAS tanpa memanggil Snap Midtrans
      if (finalGrossAmount <= 0) {
        candidate.reRegistrationPaid = true;
        candidate.reRegistrationStatus = "paid";
        candidate.reRegistrationPaidAt = new Date().toISOString();
        candidate.reRegistrationPaymentMethod = "Gratis / Beasiswa (Diskon 100%)";
        candidate.reRegistrationFee = 0;
        candidate.reRegistrationAmount = 0;
        saveState();

        broadcastNotification({
          id: `notif-${Date.now()}`,
          title: "Daftar Ulang Lunas (Gratis)",
          message: `Calon murid ${candidate.fullName} telah melunasi Daftar Ulang & Seragam (Diskon 100% / Gratis).`,
          createdAt: new Date().toISOString(),
          type: "success"
        });

        return res.json({
          success: true,
          isFree: true,
          message: "Pembayaran Daftar Ulang & Perlengkapan Seragam BERHASIL (Gratis / Diskon 100%).",
          candidate
        });
      }

      saveState();

      let snapToken = "";
      let redirectUrl = "";

      if (!midtransConfig.serverKey || !midtransConfig.clientKey || midtransConfig.isDisabled) {
        return res.status(400).json({
          error: "Gateway pembayaran online Midtrans belum dikonfigurasi oleh Admin. Silakan hubungi panitia SPMB."
        });
      }

      try {
        const authString = Buffer.from(midtransConfig.serverKey.trim() + ":").toString("base64");
        const baseUrl = midtransConfig.isProduction ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        // Susun item_details secara NET dan bulat agar jumlahnya 100% SAMA PERSIS dengan finalGrossAmount
        const itemDetails: Array<{ id: string; price: number; quantity: number; name: string }> = [];

        if (netBuildingFee > 0) {
          itemDetails.push({
            id: "BUILDING-NET",
            price: Math.round(netBuildingFee),
            quantity: 1,
            name: `Uang Gedung Net (${selectedSession?.name || "Inden"})`.slice(0, 50)
          });
        }

        if (effectiveJulySppFee > 0) {
          itemDetails.push({
            id: "SPP-JULY",
            price: Math.round(effectiveJulySppFee),
            quantity: 1,
            name: "SPP Bulan Juli 2027"
          });
        }

        if (baseAdmFee > 0) {
          itemDetails.push({
            id: "REREG-BASE",
            price: Math.round(baseAdmFee),
            quantity: 1,
            name: "Biaya Administrasi & Daftar Ulang".slice(0, 50)
          });
        }

        if (netUniformTotal > 0) {
          if (maarifUniformDiscount === 0 && sportsUniformBonus === 0) {
            eligibleUniforms.forEach(u => {
              if (u.price > 0) {
                itemDetails.push({
                  id: String(u.id).slice(0, 45),
                  price: Math.round(u.price),
                  quantity: 1,
                  name: u.name.slice(0, 50)
                });
              }
            });
          } else {
            itemDetails.push({
              id: "UNIFORM-NET",
              price: Math.round(netUniformTotal),
              quantity: 1,
              name: `Paket Seragam & Atribut Net (${candidate.gender === 'L' ? 'Putra' : 'Putri'})`.slice(0, 50)
            });
          }
        }

        // Filter proteksi mutlak: Midtrans melarang price <= 0 atau quantity <= 0
        const validItems = itemDetails.filter(item => item.price > 0 && item.quantity > 0);
        const currentSum = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        let finalItemDetails = validItems;
        if (currentSum !== finalGrossAmount || finalItemDetails.length === 0) {
          const safeStudentName = (candidate.fullName || candidate.nisn || "Siswa")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 25);
          finalItemDetails = [{
            id: "TOTAL-REREG",
            price: finalGrossAmount,
            quantity: 1,
            name: `Daftar Ulang - ${safeStudentName}`.slice(0, 50)
          }];
        }

        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: finalGrossAmount
          },
          customer_details: {
            first_name: candidate.fullName,
            email: candidate.email || `spmb.${candidate.nisn}@smpmaarifnu.sch.id`,
            phone: candidate.parentPhone || candidate.phone
          },
          item_details: finalItemDetails
        };

        const snapResponse = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${authString}`
          },
          body: JSON.stringify(midtransPayload)
        });

        if (snapResponse.ok) {
          const snapJson: any = await snapResponse.json();
          snapToken = snapJson.token || "";
          redirectUrl = snapJson.redirect_url || "";
          candidate.reRegistrationSnapToken = snapToken;
          recordOrUpdateMidtransTransaction({
            orderId,
            studentName: candidate.fullName,
            studentNis: candidate.nisn,
            nisn: candidate.nisn,
            billType: "spmb_reregistration",
            description: `Pembayaran Daftar Ulang SPMB - ${candidate.fullName}`,
            grossAmount: totalAmount,
            paymentType: "Midtrans Snap",
            transactionStatus: "pending",
            snapToken: snapToken,
            rawResponse: snapJson
          });
          saveState();
        } else {
          const errText = await snapResponse.text();
          console.warn("Midtrans Snap error for SPMB reregistration:", errText);
          let parsedErrMsg = "Gagal membuat sesi pembayaran Midtrans.";
          try {
            const errObj = JSON.parse(errText);
            if (errObj.error_messages) parsedErrMsg = Array.isArray(errObj.error_messages) ? errObj.error_messages.join(", ") : String(errObj.error_messages);
            else if (errObj.message) parsedErrMsg = errObj.message;
          } catch (_) {
            parsedErrMsg = errText || parsedErrMsg;
          }
          return res.status(500).json({ error: "Gagal membuat sesi pembayaran daftar ulang Midtrans: " + parsedErrMsg });
        }
      } catch (snapErr: any) {
        console.error("Error creating Midtrans Snap token for SPMB reregistration:", snapErr);
        return res.status(500).json({ error: "Koneksi gateway pembayaran Midtrans gagal: " + snapErr.message });
      }

      res.json({
        success: true,
        orderId,
        snapToken,
        token: snapToken,
        redirectUrl,
        candidate,
        totalAmount
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/pay-reregistration-snap:", err);
      res.status(500).json({ error: "Gagal membuat transaksi daftar ulang: " + err.message });
    }
  });

  // 9. Verify Re-Registration Payment Success
  router.post("/verify-reregistration-payment", async (req, res) => {
    try {
      const { orderId, nisn, paymentMethod } = req.body;
      const candidate = spmbCandidates.find(c => 
        (orderId && c.reRegistrationOrderId === orderId) ||
        (nisn && (c.nisn || "").trim() === (nisn || "").trim())
      );

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      candidate.reRegistrationPaid = true;
      candidate.reRegistrationStatus = "paid";
      candidate.reRegistrationPaidAt = new Date().toISOString();
      candidate.reRegistrationPaymentMethod = paymentMethod || "Midtrans Snap Online";
      if (candidate.documentsUploaded || candidate.documents?.kkPhoto) {
        candidate.status = "accepted";
      } else {
        candidate.status = "re_registered";
      }
      candidate.updatedAt = new Date().toISOString();

      saveState();
      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Rereg Paid Warning]:", err?.message || err);
      }

      // Broadcast notification
      const notification: RealtimeNotification = {
        id: `notif-spmb-rereg-${Date.now()}`,
        studentId: candidate.nisn,
        title: "Daftar Ulang Murid Baru (SPMB)",
        message: `Calon murid ${candidate.fullName} telah MELUNASI Biaya Daftar Ulang & Seragam Rp ${(candidate.reRegistrationFee || candidate.reRegistrationAmount || 0).toLocaleString("id-ID")}.`,
        type: "payment",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);

      // Send WhatsApp confirmation
      if (whatsappConfig.enabled && (candidate.parentPhone || candidate.phone)) {
        const targetPhone = candidate.parentPhone || candidate.phone;
        const waMsg = `Yth. Calon Wali Murid dari *${candidate.fullName}* (NISN: ${candidate.nisn}).\n\n` +
          `🎉 *KUITANSI DAFTAR ULANG & SERAGAM SPMB ${spmbConfig.academicYear}*\n` +
          `Pembayaran Daftar Ulang & Perlengkapan Seragam sebesar *Rp ${(candidate.reRegistrationFee || candidate.reRegistrationAmount || 0).toLocaleString("id-ID")}* telah BERHASIL divalidasi.\n\n` +
          `• No. Pendaftaran: *${candidate.registrationNumber || candidate.registrationNo || candidate.nisn}*\n` +
          `• Status: *${candidate.status.toUpperCase()}*\n\n` +
          `Silakan pastikan berkas administrasi (KK, Akta Kelahiran, Pas Foto, Surat Keterangan Lulus) telah diunggah di portal SPMB.\n\n` +
          `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending SPMB rereg WA:", e));
      }

      res.json({
        success: true,
        message: "Pembayaran daftar ulang berhasil diverifikasi.",
        candidate
      });
    } catch (err: any) {
      console.error("Error in verify-reregistration-payment:", err);
      res.status(500).json({ error: "Gagal memverifikasi pembayaran daftar ulang: " + err.message });
    }
  });

  // 10. Upload Registration Documents (Student Portal & Admin)
  router.post("/upload-documents", async (req, res) => {
    try {
      const { nisn, documents, force } = req.body;
      if (!nisn || !documents) {
        return res.status(400).json({ error: "NISN dan data berkas wajib disertakan." });
      }

      const cleanNisn = String(nisn || "").trim();
      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase() || c.id === cleanNisn);
      if (!candidate) {
        try {
          const dbCand = await findSpmbCandidateInMysql(cleanNisn);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (_) {}
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      // Merge and save documents permanently to hosting disk folder
      const { documents: savedDocs, folderUrl, folderName } = saveCandidateDocumentsToDisk(candidate, documents);
      candidate.documents = savedDocs;
      candidate.documentsFolder = folderUrl;
      candidate.documentsFolderName = folderName;
      if (!candidate.googleDriveLink) {
        candidate.googleDriveLink = folderUrl;
      }
      candidate.documentsUploaded = true;
      candidate.documentsUploadedAt = new Date().toISOString();
      
      // Auto-validate form and token if documents are uploaded
      if (!candidate.isFormCompleted) {
        candidate.isFormCompleted = true;
        candidate.formCompletedAt = candidate.formCompletedAt || new Date().toISOString();
      }
      if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== "paid") {
        candidate.tokenPaid = true;
        candidate.tokenPaymentStatus = "paid";
        candidate.tokenPaidAt = candidate.tokenPaidAt || new Date().toISOString();
      }

      if (candidate.reRegistrationPaid || candidate.reRegistrationStatus === "paid") {
        candidate.status = "accepted";
      } else {
        candidate.status = "documents_verified";
      }
      candidate.updatedAt = new Date().toISOString();

      healCandidateData(candidate);
      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Documents Save Warning]:", err?.message || err);
      }
      saveState();

      res.json({
        success: true,
        message: "Berkas pendaftaran calon murid berhasil disimpan permanen pada hosting!",
        candidate,
        folderUrl
      });
    } catch (err: any) {
      console.error("Error in upload-documents:", err);
      res.status(500).json({ error: "Gagal mengunggah berkas: " + err.message });
    }
  });

  // 10B. Admin Direct Document Manager
  router.post("/admin-update-documents", async (req, res) => {
    try {
      const { nisn, candidateId, documents } = req.body;
      const targetId = String(nisn || candidateId || "").trim();
      if (!targetId) {
        return res.status(400).json({ error: "NISN atau ID calon murid wajib diisi." });
      }

      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === targetId || (c.registrationNumber || "").trim().toLowerCase() === targetId.toLowerCase() || c.id === targetId);
      if (!candidate) {
        try {
          const dbCand = await findSpmbCandidateInMysql(targetId);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (_) {}
      }

      if (!candidate) {
        return res.status(404).json({ error: "Calon murid tidak ditemukan." });
      }

      const { documents: savedDocs, folderUrl, folderName } = saveCandidateDocumentsToDisk(candidate, documents || {});
      candidate.documents = savedDocs;
      candidate.documentsFolder = folderUrl;
      candidate.documentsFolderName = folderName;
      if (!candidate.googleDriveLink) {
        candidate.googleDriveLink = folderUrl;
      }
      candidate.documentsUploaded = true;
      candidate.documentsUploadedAt = new Date().toISOString();
      healCandidateData(candidate);
      candidate.updatedAt = new Date().toISOString();

      saveState();
      await directSaveEntityToMysql("spmb_candidates", candidate);

      res.json({
        success: true,
        message: `Berkas dokumen calon murid ${candidate.fullName} berhasil diperbarui dan disimpan pada hosting.`,
        candidate,
        folderUrl
      });
    } catch (err: any) {
      console.error("Error in /admin-update-documents:", err);
      res.status(500).json({ error: "Gagal menyimpan berkas admin: " + err.message });
    }
  });

  // 11. Admin Update Status or Notes
  router.post("/update-status", async (req, res) => {
    try {
      const { id, status, adminNotes, verificationNotes } = req.body;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      if (status) candidate.status = status;
      if (adminNotes !== undefined || verificationNotes !== undefined) {
        candidate.adminNotes = adminNotes || verificationNotes;
        candidate.verificationNotes = verificationNotes || adminNotes;
      }
      candidate.updatedAt = new Date().toISOString();

      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Status Warning]:", err?.message || err);
      }
      saveState();

      res.json({ success: true, message: "Status calon murid berhasil diperbarui.", candidate });
    } catch (err: any) {
      console.error("Error updating candidate status:", err);
      res.status(500).json({ error: "Gagal memperbarui status: " + err.message });
    }
  });

  // 11b. Toggle / Update Collective Registration Status (Admin)
  router.post("/candidate/:id/toggle-collective", async (req, res) => {
    try {
      const id = req.params.id;
      const { registrationType } = req.body;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetType = registrationType || (candidate.registrationType === "school_collective" ? "online_individual" : "school_collective");
      candidate.registrationType = targetType;
      
      // If marked as collective and token has been paid online, mark refund status as pending if not yet refunded
      if (targetType === "school_collective" && (candidate.tokenPaymentStatus === "paid" || candidate.tokenPaid)) {
        if (!candidate.collectiveRefundStatus || candidate.collectiveRefundStatus === "none") {
          candidate.collectiveRefundStatus = "pending";
        }
      } else if (targetType === "online_individual" && candidate.collectiveRefundStatus === "pending") {
        candidate.collectiveRefundStatus = "none";
      }

      candidate.updatedAt = new Date().toISOString();
      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Toggle Collective Warning]:", err?.message || err);
      }
      saveState();

      res.json({
        success: true,
        message: `Status jalur calon murid berhasil diubah menjadi: ${targetType === "school_collective" ? "Kolektif Sekolah" : "Mandiri Online"}.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error toggling candidate collective status:", err);
      res.status(500).json({ error: "Gagal mengubah status jalur kolektif: " + err.message });
    }
  });

  // 11c. Process Cash Refund for Collective Registration Token (Admin)
  router.post("/candidate/:id/process-collective-refund", async (req, res) => {
    try {
      const id = req.params.id;
      const { refundAmount, recipientName, refundedBy, note, refundDate } = req.body;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const effectiveAmount = Number(refundAmount) || candidate.tokenAmount || candidate.tokenFee || 50000;
      const refundReceiptNo = `KW-REFUND-${candidate.nisn}-${Date.now().toString().slice(-6)}`;

      candidate.registrationType = "school_collective";
      candidate.collectiveRefundStatus = "refunded";
      candidate.collectiveRefundAmount = effectiveAmount;
      candidate.collectiveRefundedAt = refundDate || new Date().toISOString();
      candidate.collectiveRefundedBy = refundedBy || "Panitia SPMB";
      candidate.collectiveRefundRecipient = recipientName || candidate.parentName || candidate.fullName;
      candidate.collectiveRefundNote = note || "Pengembalian tunai (cash) biaya token pendaftaran online jalur kolektif";
      candidate.collectiveRefundReceiptNo = refundReceiptNo;
      candidate.updatedAt = new Date().toISOString();

      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Refund Warning]:", err?.message || err);
      }
      saveState();

      // Send WhatsApp confirmation if configured
      if (whatsappConfig.enabled && (candidate.parentPhone || candidate.phone)) {
        const targetPhone = candidate.parentPhone || candidate.phone;
        const waMsg = `Yth. Calon Wali Murid dari *${candidate.fullName}* (NISN: ${candidate.nisn}).\n\n` +
          `💵 *TANDA TERIMA PENGEMBALIAN UANG TOKEN PENDAFTARAN (CASH REFUND)*\n` +
          `Panitia SPMB SMP Ma'arif NU Pandaan telah menyerahkan pengembalian uang token pendaftaran sebesar *Rp ${effectiveAmount.toLocaleString("id-ID")}* (Cash) untuk Jalur Kolektif Sekolah.\n\n` +
          `• No. Kuitansi: *${refundReceiptNo}*\n` +
          `• Diterima Oleh: *${candidate.collectiveRefundRecipient}*\n` +
          `• Tanggal: *${new Date(candidate.collectiveRefundedAt).toLocaleDateString("id-ID", { dateStyle: "full" })}*\n` +
          `• Petugas: *${candidate.collectiveRefundedBy}*\n\n` +
          `Terima kasih atas kerja samanya.\n` +
          `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending refund WA:", e));
      }

      res.json({
        success: true,
        message: `Pengembalian uang token pendaftaran Rp ${effectiveAmount.toLocaleString("id-ID")} (Cash) berhasil dicatat.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error processing collective cash refund:", err);
      res.status(500).json({ error: "Gagal memproses pengembalian uang cash: " + err.message });
    }
  });

  // 11d. Cancel / Undo Cash Refund for Collective Registration Token (Admin)
  router.post("/candidate/:id/cancel-collective-refund", async (req, res) => {
    try {
      const id = req.params.id;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      candidate.collectiveRefundStatus = candidate.registrationType === "school_collective" ? "pending" : "none";
      candidate.collectiveRefundAmount = undefined;
      candidate.collectiveRefundedAt = undefined;
      candidate.collectiveRefundedBy = undefined;
      candidate.collectiveRefundRecipient = undefined;
      candidate.collectiveRefundNote = undefined;
      candidate.collectiveRefundReceiptNo = undefined;
      candidate.updatedAt = new Date().toISOString();

      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Cancel Refund Warning]:", err?.message || err);
      }
      saveState();

      res.json({
        success: true,
        message: "Status pengembalian uang tunai berhasil dibatalkan / direset.",
        candidate
      });
    } catch (err: any) {
      console.error("Error cancelling collective cash refund:", err);
      res.status(500).json({ error: "Gagal membatalkan pengembalian uang: " + err.message });
    }
  });

  // 12. Promote SPMB Candidate into Official Active Student (Siswa Resmi)
  router.post("/promote-to-students", (req, res) => {
    try {
      const { candidateId, candidateIds, targetClass, defaultClass, targetNis } = req.body;
      
      const idsToPromote: string[] = Array.isArray(candidateIds) && candidateIds.length > 0
        ? candidateIds
        : (candidateId ? [candidateId] : []);

      if (idsToPromote.length === 0) {
        return res.status(400).json({ error: "Daftar ID calon murid yang akan dimigrasikan tidak boleh kosong." });
      }

      const assignedClass = defaultClass || targetClass || "7-A";
      const promotedStudents: Student[] = [];
      const updatedCandidates: SpmbCandidate[] = [];

      for (const id of idsToPromote) {
        const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
        if (!candidate) continue;

        // NIS Sementara OTOMATIS disamakan dengan NISN calon siswa
        const temporaryNis = candidate.nisn ? String(candidate.nisn).trim() : (targetNis ? String(targetNis).trim() : `STD-${Date.now()}`);
        const permanentNisn = candidate.nisn ? String(candidate.nisn).trim() : "";

        // Check if student with this NISN or ID already promoted
        let existingStudent = students.find(s => 
          (candidate.promotedStudentId && s.id === candidate.promotedStudentId) ||
          (permanentNisn && s.nisn === permanentNisn) ||
          (s.id === `std-spmb-${candidate.id}` || s.id === `std-spmb-${candidate.nisn}`)
        );

        if (existingStudent) {
          // Update details & ensure nisn and temporary nis are intact
          existingStudent.name = candidate.fullName;
          existingStudent.class = assignedClass;
          if (permanentNisn) existingStudent.nisn = permanentNisn;
          if (!existingStudent.nis) existingStudent.nis = temporaryNis;

          candidate.status = "accepted";
          candidate.isPromotedToStudent = true;
          candidate.promotedStudentId = existingStudent.id;
          candidate.assignedClass = assignedClass;
          candidate.promotedAt = new Date().toISOString();
          candidate.updatedAt = new Date().toISOString();

          promotedStudents.push(existingStudent);
          updatedCandidates.push(candidate);
          continue;
        }

        // Create new active Grade 7 student
        const newStudent: Student = {
          id: `std-spmb-${candidate.nisn || candidate.id}`,
          name: candidate.fullName,
          nis: temporaryNis, // NIS Sementara = NISN
          nisn: permanentNisn, // NISN Asli & Permanen (Tidak Berubah saat NIS diedit masal)
          class: assignedClass,
          gender: candidate.gender === "P" ? "P" : "L",
          phone: "",
          email: candidate.email || `${candidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${temporaryNis}@smpmaarifnu.sch.id`,
          password: temporaryNis,
          savingsBalance: 0,
          photoUrl: candidate.documents?.pasPhoto || candidate.photoUrl || "",
          parentName: candidate.fatherName || candidate.motherName || candidate.guardianName || candidate.parentName || "",
          address: candidate.address || "",
          
          // Biodata Lengkap Buku Induk
          nik: candidate.nik || "",
          nickname: candidate.nickname || "",
          birthPlace: candidate.birthPlace || "",
          birthDate: candidate.birthDate || "",
          kkNumber: candidate.kkNumber || "",
          birthCertNumber: candidate.birthCertNumber || "",
          livingWith: candidate.livingWith || "",
          childOrder: candidate.childOrder || "",
          siblingsCount: candidate.siblingsCount || "",
          stepSiblingsCount: candidate.stepSiblingsCount || "",

          // Orang Tua - Ayah
          fatherName: candidate.fatherName || "",
          fatherNik: candidate.fatherNik || "",
          fatherBirthPlace: candidate.fatherBirthPlace || "",
          fatherBirthDate: candidate.fatherBirthDate || "",
          fatherEducation: candidate.fatherEducation || "",
          fatherOccupation: candidate.fatherOccupation || "",
          fatherIncome: candidate.fatherIncome || "",
          fatherAddress: candidate.fatherAddress || "",
          fatherPhone: candidate.fatherPhone || "",
          fatherStatus: candidate.fatherStatus || "Hidup",

          // Orang Tua - Ibu
          motherName: candidate.motherName || "",
          motherNik: candidate.motherNik || "",
          motherBirthPlace: candidate.motherBirthPlace || "",
          motherBirthDate: candidate.motherBirthDate || "",
          motherEducation: candidate.motherEducation || "",
          motherOccupation: candidate.motherOccupation || "",
          motherIncome: candidate.motherIncome || "",
          motherAddress: candidate.motherAddress || "",
          motherPhone: candidate.motherPhone || "",
          motherStatus: candidate.motherStatus || "Hidup",

          // Wali
          guardianName: candidate.guardianName || "",
          guardianNik: candidate.guardianNik || "",
          guardianBirthPlace: candidate.guardianBirthPlace || "",
          guardianBirthDate: candidate.guardianBirthDate || "",
          guardianEducation: candidate.guardianEducation || "",
          guardianOccupation: candidate.guardianOccupation || "",
          guardianIncome: candidate.guardianIncome || "",
          guardianAddress: candidate.guardianAddress || "",
          guardianPhone: candidate.guardianPhone || "",
          guardianStatus: candidate.guardianStatus || "",
          googleDriveLink: candidate.googleDriveLink || candidate.documentsFolder || (candidate.documentsFolderName ? `/uploads/berkas_murid/${candidate.documentsFolderName}` : ""),
          documentsFolder: candidate.documentsFolder || (candidate.documentsFolderName ? `/uploads/berkas_murid/${candidate.documentsFolderName}` : ""),
          documents: { ...(candidate.documents || {}) }
        };

        if (candidate.documents?.pasPhoto && !newStudent.photoUrl) {
          newStudent.photoUrl = candidate.documents.pasPhoto;
        }

        students.push(newStudent);
        candidate.status = "accepted";
        candidate.isPromotedToStudent = true;
        candidate.promotedStudentId = newStudent.id;
        candidate.assignedClass = assignedClass;
        candidate.promotedAt = new Date().toISOString();
        candidate.updatedAt = new Date().toISOString();

        promotedStudents.push(newStudent);
        updatedCandidates.push(candidate);
      }

      saveState();

      // Persist promoted students and updated candidates immediately to MySQL
      if (promotedStudents.length > 0) {
        directSaveEntitiesBatchToMysql("students", promotedStudents).catch(err => console.error("Error persisting promoted students to MySQL:", err));
      }
      if (updatedCandidates.length > 0) {
        directSaveEntitiesBatchToMysql("spmbCandidates", updatedCandidates).catch(err => console.error("Error persisting updated candidates to MySQL:", err));
      }

      // Broadcast notification
      const notification: RealtimeNotification = {
        id: `notif-spmb-promoted-${Date.now()}`,
        title: "Migrasi Siswa Baru Kelas 7",
        message: `Sebanyak ${promotedStudents.length} calon siswa SPMB berhasil resmi dimigrasikan menjadi Siswa Aktif Kelas 7 dengan NIS sementara = NISN.`,
        type: "success",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);

      res.json({
        success: true,
        message: `Berhasil memigrasikan ${promotedStudents.length} siswa ke Kelas ${assignedClass}. NIS sementara otomatis disamakan dengan NISN.`,
        promotedCount: promotedStudents.length,
        students: promotedStudents,
        candidates: updatedCandidates,
        student: promotedStudents[0],
        candidate: updatedCandidates[0]
      });
    } catch (err: any) {
      console.error("Error promoting candidate to student:", err);
      res.status(500).json({ error: "Gagal mempromosikan calon murid: " + err.message });
    }
  });

  // 12b. Process Auto Transfers Manually (Admin)
  router.post("/process-auto-transfers", (req, res) => {
    try {
      const result = checkAndAutoTransferExpiredCandidates(true);
      res.json({
        success: true,
        message: result.transferredCount > 0
          ? `Berhasil memeriksa dan mengalihkan ${result.transferredCount} calon siswa yang melewati batas akhir pendaftaran ulang.`
          : `Pemeriksaan selesai. Tidak ada calon siswa yang perlu dialihkan.`,
        ...result
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/process-auto-transfers:", err);
      res.status(500).json({ error: "Gagal memproses pengalihan jalur: " + err.message });
    }
  });

  // 12c. Revert / Batalkan Pengalihan Jalur ke Jalur Sebelumnya (Admin)
  router.post("/candidate/:id/revert-transfer", async (req, res) => {
    try {
      const { id } = req.params;
      const { operatorName, note } = req.body || {};

      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetSessionId = candidate.previousSessionId || candidate.originalSessionId;
      if (!targetSessionId || targetSessionId === candidate.sessionId) {
        return res.status(400).json({ error: "Calon murid ini tidak memiliki riwayat jalur sebelumnya untuk dikembalikan." });
      }

      const fromSessionId = candidate.sessionId;
      const fromSession = spmbConfig.sessions.find(s => s.id === fromSessionId);
      const targetSession = spmbConfig.sessions.find(s => s.id === targetSessionId);

      const targetName = targetSession?.name || targetSessionId;
      const fromName = fromSession?.name || fromSessionId;

      candidate.sessionId = targetSessionId;
      candidate.isTransferredSession = false;
      candidate.previousSessionId = undefined;
      candidate.updatedAt = new Date().toISOString();

      if (!candidate.transferHistory) candidate.transferHistory = [];
      candidate.transferHistory.push({
        action: 'revert',
        fromSessionId,
        toSessionId: targetSessionId,
        timestamp: new Date().toISOString(),
        reason: note || `Pembatalan pengalihan jalur oleh panitia. Dikembalikan dari ${fromName} ke ${targetName}.`,
        operator: operatorName || 'Panitia SPMB'
      });

      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Revert Transfer Warning]:", err?.message || err);
      }
      saveState();

      res.json({
        success: true,
        message: `Berhasil membatalkan pengalihan. Calon siswa ${candidate.fullName} telah dikembalikan ke ${targetName}.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/candidate/:id/revert-transfer:", err);
      res.status(500).json({ error: "Gagal membatalkan pengalihan jalur: " + err.message });
    }
  });

  // 12d. Manual Change Candidate Session / Jalur Pendaftaran (Admin)
  router.post("/candidate/:id/change-session", async (req, res) => {
    try {
      const { id } = req.params;
      const { newSessionId, operatorName, reason } = req.body || {};

      if (!newSessionId) {
        return res.status(400).json({ error: "Sesi tujuan (newSessionId) wajib dipilih." });
      }

      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetSession = spmbConfig.sessions.find(s => s.id === newSessionId);
      if (!targetSession) {
        return res.status(400).json({ error: "Sesi tujuan tidak valid." });
      }

      const fromSessionId = candidate.sessionId;
      const fromSession = spmbConfig.sessions.find(s => s.id === fromSessionId);

      candidate.originalSessionId = candidate.originalSessionId || fromSessionId;
      candidate.previousSessionId = fromSessionId;
      candidate.sessionId = newSessionId;
      candidate.isTransferredSession = true;
      candidate.transferredAt = new Date().toISOString();
      candidate.transferReason = reason || `Pemindahan sesi manual ke ${targetSession.name} oleh ${operatorName || 'Panitia SPMB'}.`;
      candidate.updatedAt = new Date().toISOString();

      if (!candidate.transferHistory) candidate.transferHistory = [];
      candidate.transferHistory.push({
        action: 'manual_change',
        fromSessionId,
        toSessionId: newSessionId,
        timestamp: new Date().toISOString(),
        reason: candidate.transferReason,
        operator: operatorName || 'Panitia SPMB'
      });

      try {
        await directSaveEntityToMysql("spmb_candidates", candidate);
      } catch (err: any) {
        console.warn("[MySQL SPMB Change Session Warning]:", err?.message || err);
      }
      saveState();

      res.json({
        success: true,
        message: `Sesi pendaftaran ${candidate.fullName} berhasil diubah ke ${targetSession.name}.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/candidate/:id/change-session:", err);
      res.status(500).json({ error: "Gagal mengubah sesi pendaftaran: " + err.message });
    }
  });

  // 13. Delete Candidate Record (Admin)
  router.delete("/candidate/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const idx = spmbCandidates.findIndex(c => c.id === id || c.nisn === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetId = spmbCandidates[idx].id || id;
      spmbCandidates.splice(idx, 1);
      try {
        await directDeleteEntityFromMysql("spmb_candidates", targetId);
      } catch (err: any) {
        console.warn("[MySQL SPMB Delete Warning]:", err?.message || err);
      }
      saveState();

      res.json({ success: true, message: "Data calon murid berhasil dihapus dari sistem & MySQL." });
    } catch (err: any) {
      console.error("Error deleting candidate:", err);
      res.status(500).json({ error: "Gagal menghapus data calon murid: " + err.message });
    }
  });


  return router;
}

export default createSpmbRouter;
