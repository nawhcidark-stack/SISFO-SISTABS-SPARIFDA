import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceLog, HomeroomTeacher, SchoolIdentity, SppBill, StudentDevelopmentLog, StudentInfractionLog, StudentCounselingLog, ClassAnnouncement, ClassMeetingLog, isSppBillOverdue, MiscBill } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import BukuIndukManagement from './BukuIndukManagement';
import { 
  exportSppRecapToExcel, 
  exportMiscRecapToExcel, 
  exportSavingsRecapToExcel 
} from '../utils/excelExport';
import { 
  Calendar, Check, AlertCircle, Save, Loader2, Users, ClipboardCheck, 
  Sparkles, LogOut, ArrowRight, ArrowLeft, BookOpen, AlertCircle as ErrorIcon,
  Download, Copy, Search, Wallet, CreditCard, CheckCircle, Clock, User, Key,
  Printer, FileText, Plus, Trash2, Edit, Award, Heart, Smile, Megaphone, AlertTriangle,
  LayoutGrid, Home, Smartphone, Apple
} from 'lucide-react';

// Standalone Type-Safe Print Helper Functions (Isolated from JSX rendering context)
function printSingleAnnouncement(log: ClassAnnouncement, schoolIdentity?: SchoolIdentity, currentClassName?: string, currentTeacherName?: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolPhone = schoolIdentity?.phone || "-";
  printWin.document.write(`
    <html>
      <head>
        <title>PENGUMUMAN EDARAN RESMI - ${log.title}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 35px; }
          .title { font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; text-align: center; background: #e2e8f0; padding: 10px;}
          .date { text-align: right; font-size: 11px; margin-bottom: 30px; font-weight: bold; }
          .body-text { border: 1px solid #94a3b8; border-radius: 8px; padding: 25px; line-height: 1.8; font-size: 12.5px; background: #fff; text-align: left; }
          .sig { float: right; width: 35%; text-align: center; font-size: 12.5px; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan | Telp: ${schoolPhone}</p>
        </div>
        <div class="title">SURAT EDARAN &amp; MAKLUMAT KELAS ${currentClassName}</div>
        <div class="date">Pandaan, ${log.date}</div>
        <div style="font-size:12px; margin-bottom:15px">Kepada Yth.<br/><b>Bapak/Ibu Orang Tua Wali / Siswa Kelas ${currentClassName}</b><br/>Di Tempat</div>
        <div class="body-text">
          <strong>Perihal: ${log.title}</strong><br/><br/>
          ${log.content.replace(/\n/g, "<br/>")}
        </div>
        <div class="sig">
          <p>Wali Kelas ${currentClassName}</p>
          <div style="height:65px"></div>
          <p><strong><u>${currentTeacherName}</u></strong></p>
        </div>
        <script>window.print(); setTimeout(function(){window.close();},5000);</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printSingleMeetingLog(log: ClassMeetingLog, schoolIdentity?: SchoolIdentity, currentClassName?: string, currentTeacherName?: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  printWin.document.write(`
    <html>
      <head>
        <title>NOTULENSI RAPAT KOORDINASI - KELAS ${currentClassName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
          .title { text-align: center; font-size: 14px; font-weight: bold; background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 30px; }
          .meta { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
          .meta td { padding: 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          .meta td.label { font-weight: bold; width: 25%; }
          .block { border: 1px solid #94a3b8; padding: 15px; border-radius: 8px; font-size: 12px; margin-bottom: 15px; }
          .block h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #475569; }
          .footer { width: 100%; margin-top: 50px; }
          .footer td { text-align: center; font-size: 12.5px; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>JURNAL RAPAT, KOORDINASI, DAN NOTULENSI FASILITATOR</p>
        </div>
        <div class="title">NOTULENSI JURNAL KOORDINASI WALI KELAS</div>
        <table class="meta">
          <tr><td class="label">Jenis Pertemuan / Rapat</td><td>${log.meetingType}</td><td class="label">Hari / Tanggal Rapat</td><td>${log.date}</td></tr>
          <tr><td class="label">Kelas Terkait</td><td>Kelas ${currentClassName}</td><td class="label">Inisiator / Wali Kelas</td><td>${currentTeacherName}</td></tr>
          <tr><td class="label">Peserta / Kehadiran</td><td colspan="3">${log.attendees}</td></tr>
        </table>
        <div class="block">
          <h4>I. Pembahasan Agenda Rapat &amp; Hasil Keputusan Resmi</h4>
          <div style="white-space: pre-wrap;">${log.agenda.replace(/\n/g, "<br/>")}</div>
        </div>
        <div class="block">
          <h4>II. Rencana Tindak Lanjut Program</h4>
          <div style="white-space: pre-wrap;">${log.followUp.replace(/\n/g, "<br/>")}</div>
        </div>
        <table class="footer">
          <tr>
            <td style="width:40%">Pencatat / Notulis Rapat<div style="height:70px"></div><strong><u>${currentTeacherName}</u></strong><br/>Wali Kelas Kelas ${currentClassName}</td>
            <td style="width:20%"></td>
            <td style="width:40%">Diketahui / Verifikator<div style="height:70px"></div>( .................................. )<br/>Kepala Sekolah / Perwakilan Komite</td>
          </tr>
        </table>
        <script>window.print(); setTimeout(function(){window.close();},5000);</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printSingleDevelopmentLog(log: StudentDevelopmentLog, schoolIdentity?: SchoolIdentity, currentTeacherName?: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolSubheading = schoolIdentity?.subheading || "";
  const schoolPhone = schoolIdentity?.phone || "-";
  const schoolAddress = schoolIdentity?.address || "";
  printWin.document.write(`
    <html>
      <head>
        <title>JURNAL CATATAN PERKEMBANGAN SISWA - ${log.studentName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
          .title { text-align: center; font-size: 14px; font-weight: bold; background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 30px; }
          .meta { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
          .meta td { padding: 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          .meta td.label { font-weight: bold; width: 20%; }
          .content { border: 1px solid #94a3b8; padding: 20px; border-radius: 8px; background: #fafafa; min-height: 120px; font-size: 12px; margin-bottom: 40px; }
          .sig { float: right; width: 35%; text-align: center; font-size: 12px; margin-top: 35px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>${schoolSubheading} | Telp: ${schoolPhone}</p>
          <p>${schoolAddress}</p>
        </div>
        <div class="title">JURNAL CATATAN PERKEMBANGAN SISWA</div>
        <table class="meta">
          <tr><td class="label">Siswa</td><td>${log.studentName}</td><td class="label">Tanggal</td><td>${log.date}</td></tr>
          <tr><td class="label">Kelas Asal</td><td>Kelas ${log.className}</td><td class="label">Kategori</td><td><strong>${log.category}</strong></td></tr>
          <tr><td class="label">Wali Kelas</td><td colspan="3">${currentTeacherName}</td></tr>
        </table>
        <div class="content"><strong>Uraian Temuan Perkembangan:</strong><br/><br/>"${log.notes}"</div>
        <div class="sig">
          <p>Pandaan, ${log.date}</p>
          <p>Wali Kelas</p>
          <div style="height:60px;"></div>
          <p><strong><u>${currentTeacherName}</u></strong></p>
        </div>
        <script>window.print(); setTimeout(function(){window.close();},5000);</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printSingleInfractionLog(log: StudentInfractionLog, schoolIdentity?: SchoolIdentity, currentTeacherName?: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  printWin.document.write(`
    <html>
      <head>
        <title>LEMBAR PENANGANAN PELANGGARAN TATA TERTIB - ${log.studentName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
          .title { text-align: center; font-size: 14px; font-weight: bold; background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 30px; }
          .meta { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
          .meta td { padding: 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          .meta td.label { font-weight: bold; width: 22%; }
          .block { border: 1px solid #94a3b8; padding: 15px; border-radius: 8px; font-size: 12px; margin-bottom: 20px; }
          .block h4 { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; color: #475569; }
          .footer { width: 100%; margin-top: 40px; }
          .footer td { text-align: center; font-size: 12px; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>LEMBAR PENANGANAN KEDISIPLINAN DAN KETERTIBAN SISWA</p>
        </div>
        <div class="title">BAP PERILAKU DAN KETERTIBAN SISWA</div>
        <table class="meta">
          <tr><td class="label">Nama Siswa / NIS</td><td>${log.studentName}</td><td class="label">Hari / Tanggal</td><td>${log.date}</td></tr>
          <tr><td class="label">Jam / Lokasi Kejadian</td><td>Pukul ${log.time} di ${log.location}</td><td class="label">Status Kasus</td><td><strong>${log.resolutionStatus}</strong></td></tr>
          <tr><td class="label">Wali Kelas Pemroses</td><td colspan="3">${currentTeacherName}</td></tr>
        </table>
        <div class="block">
          <h4>[1] Kronologi / Jenis Pelanggaran Tata Tertib</h4>
          <div>"${log.infractionType}"</div>
        </div>
        <div class="block">
          <h4>[2] Langkah Tindak Lanjut &amp; Sanksi Pembinaan Wali Kelas</h4>
          <div>"${log.actionTaken}"</div>
        </div>
        <table class="footer">
          <tr>
            <td style="width:40%">Disetujui Orang Tua/Wali Murid<div style="height:65px"></div>( .................................. )</td>
            <td style="width:20%"></td>
            <td style="width:40%">Pandaan, ${log.date}<br/>Wali Kelas<div style="height:65px"></div><strong><u>${currentTeacherName}</u></strong></td>
          </tr>
        </table>
        <script>window.print(); setTimeout(function(){window.close();},5000);</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printSingleCounselingLog(log: StudentCounselingLog, schoolIdentity?: SchoolIdentity, currentTeacherName?: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  printWin.document.write(`
    <html>
      <head>
        <title>REKAP SESI BIMBINGAN KONSELING WALI KELAS - ${log.studentName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
          .title { text-align: center; font-size: 14px; font-weight: bold; background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 30px; }
          .meta { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
          .meta td { padding: 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          .meta td.label { font-weight: bold; width: 25%; }
          .block { border: 1px solid #94a3b8; padding: 15px; border-radius: 8px; font-size: 12px; margin-bottom: 15px; }
          .block h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #475569; }
          .footer { width: 100%; margin-top: 40px; }
          .footer td { text-align: center; font-size: 12px; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>JURNAL LAYANAN KONSELING &amp; KELUARGA</p>
        </div>
        <div class="title">BERKAS BIMBINGAN SISWA WALI KELAS</div>
        <table class="meta">
          <tr><td class="label">Nama Siswa / NIS</td><td>${log.studentName}</td><td class="label">Tanggal Konseling</td><td>${log.date}</td></tr>
          <tr><td class="label">Kelas Asal Siswa</td><td>Kelas ${log.className}</td><td class="label">Konselor / Wali Kelas</td><td>${currentTeacherName}</td></tr>
        </table>
        <div class="block">
          <h4>I. Indikasi Permasalahan / Topik Keluhan</h4>
          <div>"${log.topic}"</div>
        </div>
        <div class="block">
          <h4>II. Rencana Solusi / Solusi Alternatif</h4>
          <div>"${log.actionPlan}"</div>
        </div>
        <div class="block">
          <h4>III. Hasil Konseling Serta Komitmen Siswa</h4>
          <div>"${log.result}"</div>
        </div>
        ${log.bkFeedback ? `
        <div class="block" style="border-color: #10b981; background-color: #f0fdf4;">
          <h4 style="color: #047857;">IV. Saran Profesional, Intervensi &amp; Solusi Rekomendatif Guru BK</h4>
          <div style="font-weight: bold; color: #065f46;">"${log.bkFeedback}"</div>
          ${log.bkFeedbackAt ? `<div style="font-size: 10px; color: #047857; margin-top: 5px;">Diselesaikan pada: ${new Date(log.bkFeedbackAt).toLocaleString('id-ID')}</div>` : ''}
        </div>
        ` : ''}
        <table class="footer">
          <tr>
            <td style="width:40%">Siswa Bersangkutan<div style="height:65px"></div>( <u>${log.studentName}</u> )</td>
            <td style="width:20%"></td>
            <td style="width:40%">Pandaan, ${log.date}<br/>Wali Kelas<div style="height:65px"></div><strong><u>${currentTeacherName}</u></strong></td>
          </tr>
        </table>
        <script>window.print(); setTimeout(function(){window.close();},5000);</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printStudentDevelopmentRecap(student: any, logs: StudentDevelopmentLog[], schoolIdentity?: SchoolIdentity, currentTeacherName?: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolSubheading = schoolIdentity?.subheading || "KABUPATEN PASURUAN";
  const schoolPhone = schoolIdentity?.phone || "-";
  const schoolAddress = schoolIdentity?.address || "";
  const schoolPrincipal = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";

  const rowsHtml = logs.map((log, index) => {
    return `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-size: 11px; font-weight: bold; font-family: monospace;">${index + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; font-weight: bold; white-space: nowrap;">${log.date}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase; background-color: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;">
            ${log.category}
          </span>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; line-height: 1.5; text-align: left; font-style: italic;">"${log.notes}"</td>
      </tr>
    `;
  }).join("");

  printWin.document.write(`
    <html>
      <head>
        <title>REKAP JURNAL PERKEMBANGAN SISWA - ${student.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; font-weight: bold; margin-bottom: 30px; }
          .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { margin: 5px 0 0 0; font-size: 11px; color: #475569; font-weight: normal; }
          .title { text-align: center; font-size: 14px; font-weight: bold; background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 0.5px;}
          .info-grid { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
          .info-grid td { padding: 6px 10px; font-size: 12px; }
          .info-grid td.label { font-weight: bold; width: 15%; border-bottom: 1px solid #f1f5f9; }
          .info-grid td.value { width: 35%; border-bottom: 1px solid #f1f5f9; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .data-table th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 11px 10px; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: left; }
          .signature-container { width: 100%; margin-top: 50px; page-break-inside: avoid; display: flex; justify-content: space-between; gap: 40px;}
          .signature-box { width: 45%; text-align: center; font-size: 12px; }
          .sig-space { height: 80px; }
          .sig-underline { font-weight: bold; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>${schoolSubheading} | Telp: ${schoolPhone}</p>
          <p>${schoolAddress}</p>
        </div>
        
        <div class="title">REKAPITULASI CATATAN PERKEMBANGAN PER SISWA</div>

        <table class="info-grid">
          <tr>
            <td class="label">Nama Lengkap</td>
            <td class="value">: <strong>${student.name}</strong></td>
            <td class="label">Wali Kelas</td>
            <td class="value">: ${currentTeacherName}</td>
          </tr>
          <tr>
            <td class="label">NIS / NISN</td>
            <td class="value">: ${student.nis} / -</td>
            <td class="label">Tahun Ajaran</td>
            <td class="value">: 2025 / 2026</td>
          </tr>
          <tr>
            <td class="label">Kelas Asal</td>
            <td class="value">: Kelas ${student.class}</td>
            <td class="label font-bold">Total Catatan</td>
            <td class="value">: <strong>${logs.length} Entri</strong></td>
          </tr>
        </table>

        <table class="data-table" style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-top: 15px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; width: 5%; text-align: center;">No</th>
              <th style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; width: 15%;">Tanggal</th>
              <th style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; width: 20%;">Kategori</th>
              <th style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; width: 60%;">Uraian Catatan Perkembangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <table style="width: 100%; border: none; margin-top: 50px; page-break-inside: avoid;">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top; font-size: 12px; border: none;">
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div class="sig-space" style="height: 70px;"></div>
              <p class="sig-underline">${schoolPrincipal}</p>
              <p>NIP. / PegID. -</p>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top; font-size: 12px; border: none;">
              <p>Pandaan, ${new Date().toISOString().substring(0, 10)}</p>
              <p>Wali Kelas Kelas ${student.class}</p>
              <div class="sig-space" style="height: 70px;"></div>
              <p class="sig-underline">${currentTeacherName}</p>
              <p>NIP. / PegID. -</p>
            </td>
          </tr>
        </table>

        <script>
          window.print();
          setTimeout(function() { window.close(); }, 5000);
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printStudentCombinedRecap(
  student: any,
  devLogs: StudentDevelopmentLog[],
  infractionLogs: StudentInfractionLog[],
  counselingLogs: StudentCounselingLog[],
  schoolIdentity?: SchoolIdentity,
  currentTeacherName?: string
) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolSubheading = schoolIdentity?.subheading || "KABUPATEN PASURUAN";
  const schoolPhone = schoolIdentity?.phone || "-";
  const schoolAddress = schoolIdentity?.address || "";
  const schoolPrincipal = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";

  // Build rows for each journal section
  const devRowsHtml = devLogs.length === 0 
    ? `<tr><td colspan="4" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; text-align: center; color: #64748b; font-style: italic;">Tidak ada catatan perkembangan siswa</td></tr>`
    : devLogs.map((log, index) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; font-family: monospace;">${index + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: bold; white-space: nowrap;">${log.date}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${log.category}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; line-height: 1.4;">${log.notes}</td>
      </tr>
    `).join("");

  const infRowsHtml = infractionLogs.length === 0
    ? `<tr><td colspan="6" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; text-align: center; color: #64748b; font-style: italic;">Tidak ada catatan pelanggaran</td></tr>`
    : infractionLogs.map((log, index) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; font-family: monospace;">${index + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: bold; white-space: nowrap;">${log.date} ${log.time}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px;">${log.location}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: 550;">${log.infractionType}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-style: italic;">${log.actionTaken}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; text-align: center; font-weight: bold;">${log.resolutionStatus}</td>
      </tr>
    `).join("");

  const counRowsHtml = counselingLogs.length === 0
    ? `<tr><td colspan="5" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; text-align: center; color: #64748b; font-style: italic;">Tidak ada catatan bimbingan & konseling</td></tr>`
    : counselingLogs.map((log, index) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; font-family: monospace;">${index + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: bold; white-space: nowrap;">${log.date}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: 550;">${log.topic}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px;">${log.actionPlan}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-style: italic;">${log.result}</td>
      </tr>
    `).join("");

  printWin.document.write(`
    <html>
      <head>
        <title>REKAPITULASI JURNAL GABUNGAN SISWA - ${student.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 25px; }
          .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0 0; font-size: 11px; color: #475569; font-weight: normal; }
          .title { text-align: center; font-size: 13px; font-weight: bold; background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;}
          .info-grid { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
          .info-grid td { padding: 5px 8px; font-size: 11.5px; }
          .info-grid td.label { font-weight: bold; width: 15%; border-bottom: 1px solid #f1f5f9; }
          .info-grid td.value { width: 35%; border-bottom: 1px solid #f1f5f9; }
          
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 25px; margin-bottom: 8px; color: #0f172a; border-bottom: 1px solid #94a3b8; padding-bottom: 3px; }
          
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .data-table th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; font-size: 10px; text-transform: uppercase; font-weight: bold; text-align: left; }
          .data-table td { font-size: 10.5px; }
          
          .sig-space { height: 60px; }
          .sig-underline { font-weight: bold; text-decoration: underline; }
          @media print {
            .section-block { page-break-inside: avoid; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schoolName}</h2>
          <p>${schoolSubheading} | Telp: ${schoolPhone}</p>
          <p>${schoolAddress}</p>
        </div>
        
        <div class="title">REKAPITULASI JURNAL GABUNGAN SISWA WALI KELAS</div>

        <table class="info-grid">
          <tr>
            <td class="label">Nama Lengkap</td>
            <td class="value">: <strong>${student.name}</strong></td>
            <td class="label">Wali Kelas</td>
            <td class="value">: ${currentTeacherName}</td>
          </tr>
          <tr>
            <td class="label">NIS / NISN</td>
            <td class="value">: ${student.nis} / -</td>
            <td class="label">Tahun Ajaran</td>
            <td class="value">: 2025 / 2026</td>
          </tr>
          <tr>
            <td class="label">Kelas Asal</td>
            <td class="value">: Kelas ${student.class}</td>
            <td class="label font-bold">Tanggal Cetak</td>
            <td class="value">: ${new Date().toISOString().substring(0, 10)}</td>
          </tr>
        </table>

        <!-- SECTION 1: Catatan Perkembangan -->
        <div class="section-block">
          <div class="section-title">I. Jurnal Perkembangan Siswa</div>
          <table class="data-table">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; width: 5%; text-align: center;">No</th>
                <th style="border: 1px solid #cbd5e1; width: 15%;">Tanggal</th>
                <th style="border: 1px solid #cbd5e1; width: 20%;">Kategori</th>
                <th style="border: 1px solid #cbd5e1; width: 60%;">Uraian Catatan Perkembangan</th>
              </tr>
            </thead>
            <tbody>
              ${devRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- SECTION 2: Pelanggaran -->
        <div class="section-block">
          <div class="section-title">II. Jurnal Pelanggaran & Tindak Lanjut</div>
          <table class="data-table">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; width: 5%; text-align: center;">No</th>
                <th style="border: 1px solid #cbd5e1; width: 18%;">Waktu & Tanggal</th>
                <th style="border: 1px solid #cbd5e1; width: 15%;">Lokasi</th>
                <th style="border: 1px solid #cbd5e1; width: 25%;">Pelanggaran Tata Tertib</th>
                <th style="border: 1px solid #cbd5e1; width: 25%;">Tindak Lanjut / Sanksi</th>
                <th style="border: 1px solid #cbd5e1; width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${infRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- SECTION 3: Bimbingan & Konseling -->
        <div class="section-block">
          <div class="section-title">III. Jurnal Bimbingan & Konseling</div>
          <table class="data-table">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; width: 5%; text-align: center;">No</th>
                <th style="border: 1px solid #cbd5e1; width: 15%;">Tanggal</th>
                <th style="border: 1px solid #cbd5e1; width: 25%;">Topik / Masalah</th>
                <th style="border: 1px solid #cbd5e1; width: 25%;">Rencana Solusi</th>
                <th style="border: 1px solid #cbd5e1; width: 30%;">Hasil Konseling & Komitmen</th>
              </tr>
            </thead>
            <tbody>
              ${counRowsHtml}
            </tbody>
          </table>
        </div>

        <table style="width: 100%; border: none; margin-top: 35px; page-break-inside: avoid;">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top; font-size: 11.5px; border: none; padding: 0;">
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div class="sig-space" style="height: 60px;"></div>
              <p class="sig-underline">${schoolPrincipal}</p>
              <p>NIP. / PegID. -</p>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top; font-size: 11.5px; border: none; padding: 0;">
              <p>Pandaan, ${new Date().toISOString().substring(0, 10)}</p>
              <p>Wali Kelas Kelas ${student.class}</p>
              <div class="sig-space" style="height: 60px;"></div>
              <p class="sig-underline">${currentTeacherName}</p>
              <p>NIP. / PegID. -</p>
            </td>
          </tr>
        </table>

        <script>
          window.print();
          setTimeout(function() { window.close(); }, 5000);
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

const getSemesterFromDate = (dateStr: string): 'Ganjil' | 'Genap' => {
  if (!dateStr) return 'Genap';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Genap';
  const month = d.getMonth(); // 0 = Jan, 11 = Dec
  return (month >= 6 && month <= 11) ? 'Ganjil' : 'Genap';
};

interface HomeroomPanelProps {
  currentTeacher: HomeroomTeacher;
  students: Student[];
  attendanceLogs: AttendanceLog[];
  bills: SppBill[];
  schoolIdentity?: SchoolIdentity;
  onLogout: () => void;
  onSaveBatchAttendance: (logs: { studentId: string; date: string; status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }[]) => Promise<boolean>;
  onRefresh: () => void;
  isLoading: boolean;
  onUpdateStudent?: (id: string, data: any) => Promise<boolean>;
  scannedStudentNis?: string | null;
  scannedStudentAt?: number | null;
  miscBills?: MiscBill[];
}

export default function HomeroomPanel({
  currentTeacher,
  students,
  attendanceLogs,
  bills,
  schoolIdentity,
  onLogout,
  onSaveBatchAttendance,
  onRefresh,
  isLoading,
  onUpdateStudent,
  scannedStudentNis,
  scannedStudentAt,
  miscBills = []
}: HomeroomPanelProps) {
  const todayStr = new Date().toISOString().substring(0, 10);

  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'history' | 'rekap_absensi' | 'finance' | 'profile' | 'perkembangan' | 'rapor_merdeka' | 'pkg' | 'buku_induk'>('record');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [merdekaAssessments, setMerdekaAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState<boolean>(false);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);

  // Filter students who are in this homeroom teacher's class
  const classStudents = useMemo(() => {
    return students
      .filter(
        (s) => s.class.toLowerCase() === currentTeacher.className.toLowerCase()
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, currentTeacher.className]);

  useEffect(() => {
    if (scannedStudentNis) {
      const match = classStudents.find(s => s.nis?.toLowerCase() === scannedStudentNis.toLowerCase() || s.id === scannedStudentNis);
      if (match) {
        setSelectedReportStudentId(match.id);
        setActiveSubTab('profile');
      }
    }
  }, [scannedStudentNis, scannedStudentAt, classStudents]);
  const [selectedReportSemester, setSelectedReportSemester] = useState<string>('Genap');
  const [selectedReportYear, setSelectedReportYear] = useState<string>(schoolIdentity?.activeAcademicYear || '2025/2026');

  useEffect(() => {
    if (schoolIdentity?.activeAcademicYear) {
      setSelectedReportYear(schoolIdentity.activeAcademicYear);
    }
  }, [schoolIdentity?.activeAcademicYear]);
  const [waliKelasNotes, setWaliKelasNotes] = useState<Record<string, string>>({
    "default": "Pertahankan prestasi belajarmu, tingkatkan disiplin dan rajin beribadah."
  });
  const [rekapStartDate, setRekapStartDate] = useState(getFirstDayOfMonth());
  const [rekapEndDate, setRekapEndDate] = useState(todayStr);
  const [financeSearch, setFinanceSearch] = useState('');
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Excel export functions for homeroom class payments
  const handleExportSppExcel = () => {
    const rekapSppYearFilter = schoolIdentity?.activeAcademicYear || "all";
    
    const getAcademicYearOfBill = (bill: SppBill) => {
      const startYear = [
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ].includes(bill.month)
        ? bill.year
        : bill.year - 1;
      return `${startYear}/${startYear + 1}`;
    };

    const summaryMatrix = classStudents.map((student) => {
      const sBills = bills.filter(
        (b) =>
          b.studentId === student.id &&
          (rekapSppYearFilter === "all" ||
            getAcademicYearOfBill(b) === rekapSppYearFilter),
      );
      const paid = sBills.filter((b) => b.status === "paid");
      const unpaid = sBills.filter((b) => b.status === "unpaid");
      const totalPaidNominal = paid.reduce((sum, b) => sum + b.amount, 0);
      const totalUnpaidNominal = unpaid.reduce((sum, b) => sum + b.amount, 0);
      const pct = sBills.length > 0 ? Math.round((paid.length / sBills.length) * 100) : 0;
      return {
        student,
        totalBillsCount: sBills.length,
        paidCount: paid.length,
        unpaidCount: unpaid.length,
        totalPaidNominal,
        totalUnpaidNominal,
        pct,
      };
    });

    const globalTotalPaid = summaryMatrix.reduce((acc, current) => acc + current.totalPaidNominal, 0);
    const globalTotalUnpaid = summaryMatrix.reduce((acc, current) => acc + current.totalUnpaidNominal, 0);

    exportSppRecapToExcel({
      rekapSppGradeFilter: currentTeacher.className.substring(0, 1) || "all",
      rekapSppClassFilter: currentTeacher.className,
      rekapSppYearFilter,
      summaryMatrix,
      globalTotalPaid,
      globalTotalUnpaid,
    });
  };

  const handleExportMiscExcel = () => {
    const rekapMiscGradeFilter = currentTeacher.className.substring(0, 1) || "all";
    const rekapMiscClassFilter = currentTeacher.className;

    const studentIdsSet = new Set(classStudents.map(s => s.id));
    const activeMiscBills = (miscBills || []).filter(b => studentIdsSet.has(b.studentId));

    const totalMiscTarget = activeMiscBills.reduce((sum, b) => sum + b.amount, 0);
    const totalMiscPaid = activeMiscBills.filter(b => b.status === "paid").reduce((sum, b) => sum + b.amount, 0);
    const totalMiscUnpaid = activeMiscBills.filter(b => b.status !== "paid").reduce((sum, b) => sum + b.amount, 0);

    const groupedMiscMap: { [title: string]: { targetCount: number, paidCount: number, targetNominal: number, paidNominal: number } } = {};
    activeMiscBills.forEach((bill) => {
      const title = bill.title;
      if (!groupedMiscMap[title]) {
        groupedMiscMap[title] = {
          targetCount: 0,
          paidCount: 0,
          targetNominal: 0,
          paidNominal: 0
        };
      }
      groupedMiscMap[title].targetCount += 1;
      groupedMiscMap[title].targetNominal += bill.amount;
      if (bill.status === "paid") {
        groupedMiscMap[title].paidCount += 1;
        groupedMiscMap[title].paidNominal += bill.amount;
      }
    });

    const groupedMiscList = Object.entries(groupedMiscMap).map(([title, stats]) => ({
      title,
      ...stats,
      pct: stats.targetNominal > 0 ? Math.round((stats.paidNominal / stats.targetNominal) * 100) : 0
    })).sort((a, b) => a.title.localeCompare(b.title));

    const studentMiscDetails = classStudents.map(student => {
      const sBills = activeMiscBills.filter(b => b.studentId === student.id);
      const totalBilled = sBills.reduce((sum, b) => sum + b.amount, 0);
      const totalPaid = sBills.filter(b => b.status === "paid").reduce((sum, b) => sum + b.amount, 0);
      const totalUnpaid = sBills.filter(b => b.status !== "paid").reduce((sum, b) => sum + b.amount, 0);
      return {
        student,
        bills: sBills,
        totalBilled,
        totalPaid,
        totalUnpaid
      };
    }).filter(item => item.bills.length > 0).sort((a, b) => a.student.name.localeCompare(b.student.name));

    exportMiscRecapToExcel({
      rekapMiscGradeFilter,
      rekapMiscClassFilter,
      totalMiscTarget,
      totalMiscPaid,
      totalMiscUnpaid,
      groupedMiscList,
      studentMiscDetails,
    });
  };

  const handleExportSavingsExcel = () => {
    const rekapTabunganGradeFilter = currentTeacher.className.substring(0, 1) || "all";
    const rekapTabunganClassFilter = currentTeacher.className;

    const orderedStudentsBySavings = [...classStudents].sort((a, b) => (b.savingsBalance || 0) - (a.savingsBalance || 0));
    const totalGlobalSavings = orderedStudentsBySavings.reduce((sum, s) => sum + (s.savingsBalance || 0), 0);
    const countActiveAccounts = orderedStudentsBySavings.filter(s => (s.savingsBalance || 0) > 0).length;
    const filteredTabunganStudentsLength = orderedStudentsBySavings.length;

    exportSavingsRecapToExcel({
      rekapTabunganGradeFilter,
      rekapTabunganClassFilter,
      orderedStudentsBySavings,
      totalGlobalSavings,
      countActiveAccounts,
      filteredTabunganStudentsLength,
    });
  };

  // Active workspace for Homeroom Journals
  const [selectedJournalTab, setSelectedJournalTab] = useState<'menu' | 'development' | 'infraction' | 'counseling' | 'announcement' | 'meeting'>('menu');

  // Student Development Logs states
  const [devLogsList, setDevLogsList] = useState<StudentDevelopmentLog[]>([]);
  const [loadingDevLogs, setLoadingDevLogs] = useState(false);
  const [selectedLogStudentId, setSelectedLogStudentId] = useState('');
  const [logDate, setLogDate] = useState(todayStr);
  const [logCategory, setLogCategory] = useState<'Akademik' | 'Sikap' | 'Prestasi' | 'Minat' | 'Catatan Khusus'>('Akademik');
  const [logNotes, setLogNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [devLogSearch, setDevLogSearch] = useState('');
  const [devLogFilterCategory, setDevLogFilterCategory] = useState<string>('All');

  // Print Per Siswa States
  const [showPrintPerStudentPanel, setShowPrintPerStudentPanel] = useState(false);
  const [printTargetStudentId, setPrintTargetStudentId] = useState('');

  // Jurnal Pelanggaran states
  const [infractionList, setInfractionList] = useState<StudentInfractionLog[]>([]);
  const [loadingInfractions, setLoadingInfractions] = useState(false);
  const [selectedInfStudentId, setSelectedInfStudentId] = useState('');
  const [infDate, setInfDate] = useState(todayStr);
  const [infTime, setInfTime] = useState('07:15');
  const [infLocation, setInfLocation] = useState('');
  const [infType, setInfType] = useState('');
  const [infAction, setInfAction] = useState('');
  const [infResolution, setInfResolution] = useState<'Belum Selesai' | 'Dalam Proses' | 'Selesai'>('Selesai');
  const [savingInfraction, setSavingInfraction] = useState(false);
  const [infSearch, setInfSearch] = useState('');
  const [infFilterStatus, setInfFilterStatus] = useState<string>('All');

  // Master Infraction Rules CRUD States
  const [infractionRules, setInfractionRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [ruleNameInput, setRuleNameInput] = useState('');
  const [rulePointsInput, setRulePointsInput] = useState<number>(5);
  const [ruleCategoryInput, setRuleCategoryInput] = useState('Ringan');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showRuleCrudPanel, setShowRuleCrudPanel] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [infPoints, setInfPoints] = useState<number>(5);

  // Jurnal Bimbingan & Konseling states
  const [counselingList, setCounselingList] = useState<StudentCounselingLog[]>([]);
  const [loadingCounseling, setLoadingCounseling] = useState(false);
  const [selectedCounStudentId, setSelectedCounStudentId] = useState('');
  const [counStudentSearch, setCounStudentSearch] = useState('');
  const [counDate, setCounDate] = useState(todayStr);
  const [counTopic, setCounTopic] = useState('');
  const [counActionPlan, setCounActionPlan] = useState('');
  const [counResult, setCounResult] = useState('');
  const [savingCounseling, setSavingCounseling] = useState(false);
  const [counSearch, setCounSearch] = useState('');

  // Jurnal Informasi & Pengumuman Kelas states
  const [announcementsList, setAnnouncementsList] = useState<ClassAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annDate, setAnnDate] = useState(todayStr);
  const [annTarget, setAnnTarget] = useState('Semua');
  const [annConfirmation, setAnnConfirmation] = useState<'Belum Dibaca' | 'Sebagian Terbaca' | 'Telah Dikonfirmasi'>('Belum Dibaca');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [annSearch, setAnnSearch] = useState('');

  // Jurnal Rapat / Koordinasi states
  const [meetingsList, setMeetingsList] = useState<ClassMeetingLog[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetType, setMeetType] = useState('Rapat Orang Tua');
  const [meetDate, setMeetDate] = useState(todayStr);
  const [meetAttendees, setMeetAttendees] = useState('');
  const [meetAgenda, setMeetAgenda] = useState('');
  const [meetFollowUp, setMeetFollowUp] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetSearch, setMeetSearch] = useState('');

  // Homeroom Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Principal Work Programs state
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [loadingWorkPrograms, setLoadingWorkPrograms] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);

  const fetchEvaluations = async () => {
    setLoadingEvaluations(true);
    try {
      const res = await fetch('/api/principal/teacher-evaluations');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((e: any) => e.teacherId === currentTeacher.id);
        setEvaluations(filtered);
      }
    } catch (err) {
      console.error("Gagal menjaring evaluasi guru:", err);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const handlePrintPkg = (ev: any) => {
    const pWin = window.open("", "_blank");
    if (!pWin) return;
    
    const avgScore = Math.round((Number(ev.pedagogicScore) + Number(ev.professionalScore) + Number(ev.personalScore) + Number(ev.socialScore)) / 4);

    const rowG = `
      <tr><td>Kompetensi Pedagogis (KBM & Psikologi)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.pedagogicScore}</td></tr>
      <tr><td>Kompetensi Profesional (Materi Ajar)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.professionalScore}</td></tr>
      <tr><td>Kompetensi Kepribadian (Budi Pekerti/Sikap)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.personalScore}</td></tr>
      <tr><td>Kompetensi Sosial (Paguyuban/Interaksi)</td><td style="text-align:center;">80</td><td style="text-align:center; font-weight:bold;">${ev.socialScore}</td></tr>
      <tr style="background:#f1f5f9; font-weight:bold;"><td>NILAI RATA-RATA EVALUASI</td><td style="text-align:center;">80</td><td style="text-align:center; color:#10b981;">${avgScore}</td></tr>
    `;

    pWin.document.write(`
      <html>
        <head>
          <title>OFFICIAL PKG - ${ev.teacherName}</title>
          <style>
            body { font-family: sans-serif; padding:40px; color:#333; font-size:12px; line-height:1.6; }
            .head-school { text-align:center; font-weight:bold; font-size:15px; border-bottom:3px double #000; padding-bottom:12px; margin-bottom:20px; }
            .meta-grid { width:100%; border-collapse:collapse; margin-bottom:20px; }
            .meta-grid td { padding:5px; }
            .rep-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
            .rep-table th, .rep-table td { border:1px solid #64748b; padding:8px; }
            .recom-box { border: 1px solid #000; padding:15px; background:#f8fafc; font-weight:bold; margin-bottom:40px; }
            .sigs { width:100%; margin-top:50px; }
            .sigs td { text-align:center; width:50%; }
          </style>
        </head>
        <body>
          <div class="head-school">
            ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}<br/>
            <span style="font-size:10px; font-weight:normal;">Address: ${schoolIdentity?.address || ""} | Phone: ${schoolIdentity?.phone || ""}</span>
          </div>
          
          <h3 style="text-align:center; text-transform:uppercase; text-decoration:underline;">LEMBAR HASIL PENILAIAN KINERJA GURU (PKG)</h3>
          <p style="text-align:center; font-weight:bold; font-size:10px; margin-top:-10px;">TAHUN AJARAN / AKADEMIK: ${ev.academicYear}</p>
          
          <table class="meta-grid">
            <tr><td style="width:20%; font-weight:bold;">Nama Pendidik</td><td>: <strong>${ev.teacherName}</strong></td></tr>
            <tr><td style="font-weight:bold;">Tugas Jabatan</td><td>: ${ev.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}</td></tr>
            <tr><td style="font-weight:bold;">Penilai / Jabatan</td><td>: ${schoolIdentity?.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"} / Kepala Sekolah</td></tr>
            <tr><td style="font-weight:bold;">Tanggal Sinkron</td><td>: ${ev.date}</td></tr>
          </table>

          <h4>A. INDEKS KOMPETENSI RUJUKAN</h4>
          <table class="rep-table">
            <thead>
              <tr style="background:#f1f5f9;"><th>Aspek Kompetensi Utama</th><th style="width:15%">KKM Min</th><th style="width:15%">Nilai Dicapai</th></tr>
            </thead>
            <tbody>
              ${rowG}
            </tbody>
          </table>

          <h4>B. REKOMENDASI KARIR & CATATAN KHUSUS</h4>
          <div class="recom-box">
            "${ev.notes}"
          </div>

          <table class="sigs">
            <tr>
              <td>Guru yang Dinilai<div style="height:70px"></div><strong>( ${ev.teacherName} )</strong></td>
              <td>Mengetahui,<br/>Kepala Sekolah<div style="height:70px"></div><strong><u>${schoolIdentity?.principal || ev.evaluatorName || "H. Ahmad Fuad, S.Pd, M.PdI"}</u></strong><br/>NIP. Demonstration Creds</td>
            </tr>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    pWin.document.close();
  };

  const fetchPrincipalWorkPrograms = async () => {
    setLoadingWorkPrograms(true);
    try {
      const res = await fetch('/api/principal/work-programs');
      if (res.ok) {
        const data = await res.json();
        setWorkPrograms(data);
      }
    } catch (err) {
      console.error("Gagal menjaring program kerja kepala sekolah:", err);
    } finally {
      setLoadingWorkPrograms(false);
    }
  };

  // Teaching Journals state and printing systems
  const [teachingJournalsList, setTeachingJournalsList] = useState<any[]>([]);
  const [loadingJournals, setLoadingJournals] = useState(false);
  const [journalViewMode, setJournalViewMode] = useState<'presensi' | 'kbm'>('presensi');
  const [kbmJournalSubTab, setKbmJournalSubTab] = useState<'binaan' | 'kelas_lain'>('binaan');
  const [selectedJournalToPrint, setSelectedJournalToPrint] = useState<any | null>(null);
  const [compiledJournalPrint, setCompiledJournalPrint] = useState<boolean>(false);
  const [compiledJournalPrintType, setCompiledJournalPrintType] = useState<'binaan' | 'kelas_lain'>('binaan');

  // Compute separated journals for Wali Kelas (Guided class binaan vs Subject teaching in other classes)
  const binaanJournals = useMemo(() => {
    return teachingJournalsList.filter((j: any) => 
      j.className && j.className.toLowerCase() === currentTeacher.className.toLowerCase()
    );
  }, [teachingJournalsList, currentTeacher.className]);

  const kelasLainJournals = useMemo(() => {
    return teachingJournalsList.filter((j: any) => 
      j.teacherId === currentTeacher.id && 
      j.className && j.className.toLowerCase() !== currentTeacher.className.toLowerCase()
    );
  }, [teachingJournalsList, currentTeacher.id, currentTeacher.className]);

  // Create Journal For Homeroom state
  const [isAddJournalOpen, setIsAddJournalOpen] = useState(false);
  const [journalSubject, setJournalSubject] = useState('Bimbingan Wali Kelas');
  const [journalDate, setJournalDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [journalTopic, setJournalTopic] = useState('');
  const [journalFase, setJournalFase] = useState('D');
  const [journalSemester, setJournalSemester] = useState(() => getSemesterFromDate(new Date().toISOString().substring(0, 10)));
  const [journalPertemuanKe, setJournalPertemuanKe] = useState('');
  const [journalJamKe, setJournalJamKe] = useState('');
  const [journalAlokasiWaktu, setJournalAlokasiWaktu] = useState('2');
  const [journalTujuanPembelajaran, setJournalTujuanPembelajaran] = useState('');
  const [journalPencapaianKktp, setJournalPencapaianKktp] = useState('Tercapai');
  const [journalNotes, setJournalNotes] = useState('');
  const [journalAttendanceMap, setJournalAttendanceMap] = useState<Record<string, { status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }>>({});
  const [savingJournal, setSavingJournal] = useState(false);
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [journalClassName, setJournalClassName] = useState<string>(currentTeacher.className);

  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  // Get all unique classes taught in school
  const allClassNames = useMemo(() => {
    const classes = new Set<string>();
    if (currentTeacher?.className) {
      classes.add(currentTeacher.className);
    }
    students.forEach(s => {
      if (s.class) {
        classes.add(s.class);
      }
    });
    return Array.from(classes).sort();
  }, [students, currentTeacher?.className]);

  // Dynamic journalStudents list based on selected class in the modal
  const journalStudents = useMemo(() => {
    const targetClass = journalClassName || currentTeacher.className;
    return students
      .filter(
        (s) => s.class.toLowerCase() === targetClass.toLowerCase()
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, journalClassName, currentTeacher.className]);

  // Automatically reset the attendance map when the selected journal class changes
  useEffect(() => {
    if (isAddJournalOpen && journalStudents.length > 0 && !editingJournalId) {
      const initialMap: Record<string, { status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }> = {};
      journalStudents.forEach(st => {
        initialMap[st.id] = { status: 'Hadir', notes: '' };
      });
      setJournalAttendanceMap(initialMap);
    }
  }, [journalStudents, isAddJournalOpen, editingJournalId]);

  const handleOpenAddJournalModal = () => {
    setEditingJournalId(null);
    setJournalClassName(currentTeacher.className);
    const initialMap: Record<string, { status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }> = {};
    const defaultStudents = students
      .filter((s) => s.class.toLowerCase() === currentTeacher.className.toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name));
    defaultStudents.forEach(st => {
      initialMap[st.id] = { status: 'Hadir', notes: '' };
    });
    setJournalAttendanceMap(initialMap);
    setJournalSubject('Bimbingan Wali Kelas');
    setIsCustomSubject(false);
    const todayStr = new Date().toISOString().substring(0, 10);
    setJournalDate(todayStr);
    setJournalSemester(getSemesterFromDate(todayStr));
    setJournalFase('D');
    setJournalTopic('');
    setJournalPertemuanKe('');
    setJournalJamKe('');
    setJournalAlokasiWaktu('2');
    setJournalTujuanPembelajaran('');
    setJournalPencapaianKktp('Tercapai');
    setJournalNotes('');
    setIsAddJournalOpen(true);
  };

  const handleOpenEditJournalModal = (journal: any) => {
    setEditingJournalId(journal.id);
    setJournalClassName(journal.className || currentTeacher.className);
    setJournalSubject(journal.subject || 'Bimbingan Wali Kelas');
    
    const isPredefined = [
      'Bimbingan Wali Kelas', 
      'Matematika', 
      'IPA', 
      'IPS', 
      'Bahasa Indonesia', 
      'Bahasa Inggris', 
      'PJOK', 
      'Pendidikan Agama Islam', 
      'Seni Budaya', 
      'Informatika', 
      'Pendidikan Pancasila', 
      'Prakarya',
      'Jam Kelas/Koordinasi', 
      'Pendidikan Karakter', 
      'Literasi Mandiri'
    ].includes(journal.subject || 'Bimbingan Wali Kelas');
    setIsCustomSubject(!isPredefined);

    setJournalDate(journal.date || new Date().toISOString().substring(0, 10));
    setJournalSemester(journal.semester || getSemesterFromDate(journal.date || ''));
    setJournalFase(journal.fase || 'D');
    setJournalTopic(journal.topic || '');

    const cleanPertemuan = journal.pertemuanKe ? String(journal.pertemuanKe).replace(/\D/g, '') : '';
    const cleanJam = journal.jamKe ? String(journal.jamKe) : '';
    const cleanAlokasi = journal.alokasiWaktu ? String(journal.alokasiWaktu).replace(/\D/g, '') : '2';

    setJournalPertemuanKe(cleanPertemuan);
    setJournalJamKe(cleanJam);
    setJournalAlokasiWaktu(cleanAlokasi);

    setJournalTujuanPembelajaran(journal.tujuanPembelajaran || '');
    setJournalPencapaianKktp(journal.pencapaianKktp || 'Tercapai');
    setJournalNotes(journal.notes || '');

    // Initialize attendance map from the existing journal record
    const initialMap: Record<string, { status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }> = {};
    if (Array.isArray(journal.attendance)) {
      journal.attendance.forEach((att: any) => {
        initialMap[att.studentId] = {
          status: att.status || 'Hadir',
          notes: att.notes || ''
        };
      });
    }
    setJournalAttendanceMap(initialMap);
    setIsAddJournalOpen(true);
  };

  const handleSaveHomeroomJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalSubject.trim()) {
      setNotifMsg({ type: 'error', text: 'Nama Mata Pelajaran atau Bimbingan tidak boleh kosong.' });
      return;
    }
    if (!journalTopic.trim()) {
      setNotifMsg({ type: 'error', text: 'Materi KBM / Topik Pembelajaran harus diisi.' });
      return;
    }

    setSavingJournal(true);
    try {
      const attendanceList = journalStudents.map(student => {
        const record = journalAttendanceMap[student.id] || { status: 'Hadir', notes: '' };
        return {
          studentId: student.id,
          studentName: student.name,
          status: record.status,
          notes: record.notes
        };
      });

      const url = editingJournalId ? `/api/teaching-journals/${editingJournalId}` : '/api/teaching-journals';
      const method = editingJournalId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: currentTeacher.id,
          teacherName: currentTeacher.name,
          teacherType: 'homeroom',
          subject: journalSubject.trim(),
          className: journalClassName,
          date: journalDate,
          topic: journalTopic.trim(),
          notes: journalNotes.trim(),
          fase: journalFase,
          semester: journalSemester,
          alokasiWaktu: journalAlokasiWaktu,
          jamKe: journalJamKe,
          pertemuanKe: journalPertemuanKe,
          tujuanPembelajaran: journalTujuanPembelajaran,
          pencapaianKktp: journalPencapaianKktp,
          attendance: attendanceList
        })
      });

      if (response.ok) {
        setNotifMsg({ type: 'success', text: 'Jurnal KBM & Absensi Wali Kelas berhasil disimpan!' });
        setIsAddJournalOpen(false);
        fetchTeachingJournals();
      } else {
        const errData = await response.json();
        setNotifMsg({ type: 'error', text: errData.error || 'Gagal menyimpan Jurnal Pembelajaran.' });
      }
    } catch (err) {
      console.error(err);
      setNotifMsg({ type: 'error', text: 'Koneksi gagal saat menyimpan jurnal.' });
    } finally {
      setSavingJournal(false);
    }
  };

  const fetchTeachingJournals = async () => {
    setLoadingJournals(true);
    try {
      const res = await fetch('/api/teaching-journals');
      if (res.ok) {
        const data = await res.json();
        // Filter journals that belong to current homeroom teacher's class OR are taught by this teacher
        const filtered = data.filter((j: any) => 
          j.className.toLowerCase() === currentTeacher.className.toLowerCase() || 
          j.teacherId === currentTeacher.id
        );
        setTeachingJournalsList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat jurnal pembelajaran guru", err);
    } finally {
      setLoadingJournals(false);
    }
  };

  const fetchDevLogs = async () => {
    setLoadingDevLogs(true);
    try {
      const res = await fetch('/api/student-development-logs');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((log: any) => log.className.toLowerCase() === currentTeacher.className.toLowerCase());
        setDevLogsList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat catatan perkembangan siswa", err);
    } finally {
      setLoadingDevLogs(false);
    }
  };

  const handleSaveDevLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogStudentId || !logCategory || !logNotes.trim()) {
      setNotifMsg({ type: 'error', text: 'Mohon lengkapi seluruh field input catatan perkembangan.' });
      return;
    }
    const student = classStudents.find(s => s.id === selectedLogStudentId);
    if (!student) return;

    setSavingLog(true);
    try {
      const res = await fetch('/api/student-development-logs', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           studentId: student.id,
           studentName: student.name,
           className: currentTeacher.className,
           date: logDate,
           category: logCategory,
           notes: logNotes
         })
       });
       if (res.ok) {
         setNotifMsg({ type: 'success', text: `🎉 Berhasil menyimpan catatan Jurnal Perkembangan untuk ${student.name}!` });
         setShowSuccessCheck(true);
         // Reset form notes
         setLogNotes('');
         // Keep student selection for rapid multi-records or reset based on user convenience
         fetchDevLogs();
       } else {
         const d = await res.json();
         setNotifMsg({ type: 'error', text: d.error || 'Gagal menyimpan catatan perkembangan.' });
       }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Kesalahan jaringan server.' });
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteDevLog = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan jurnal perkembangan ini?')) return;
    try {
      const res = await fetch(`/api/student-development-logs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: 'Catatan perkembangan berhasil dihapus.' });
        fetchDevLogs();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal menghapus catatan perkembangan.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    }
  };

  // Infractions CRUD
  const fetchInfractionRules = async () => {
    setLoadingRules(true);
    try {
      const res = await fetch('/api/infraction-rules');
      if (res.ok) {
        const data = await res.json();
        setInfractionRules(data);
      }
    } catch (err) {
      console.error("Gagal memuat aturan pelanggaran", err);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleNameInput.trim() || rulePointsInput === undefined) {
      setNotifMsg({ type: 'error', text: 'Nama aturan dan poin wajib diisi.' });
      return;
    }
    try {
      const url = editingRuleId ? `/api/infraction-rules/${editingRuleId}` : '/api/infraction-rules';
      const method = editingRuleId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleNameInput.trim(),
          points: Number(rulePointsInput),
          category: ruleCategoryInput
        })
      });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: editingRuleId ? 'Behasil memperbarui acuan aturan!' : 'Berhasil menambahkan acuan aturan baru!' });
        setRuleNameInput('');
        setRulePointsInput(5);
        setRuleCategoryInput('Ringan');
        setEditingRuleId(null);
        fetchInfractionRules();
      } else {
        const d = await res.json();
        setNotifMsg({ type: 'error', text: d.error || 'Gagal menyimpan aturan.' });
      }
    } catch {
      setNotifMsg({ type: 'error', text: 'Kesalahan jaringan server.' });
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus acuan rules pelanggaran ini?')) return;
    try {
      const res = await fetch(`/api/infraction-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: 'Acuan rules berhasil dihapus.' });
        fetchInfractionRules();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal menghapus acuan.' });
      }
    } catch {
      setNotifMsg({ type: 'error', text: 'Komunikasi server gagal.' });
    }
  };

  const fetchInfractions = async () => {
    setLoadingInfractions(true);
    try {
      const res = await fetch('/api/student-infraction-logs');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((log: any) => log.className.toLowerCase() === currentTeacher.className.toLowerCase());
        setInfractionList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat catatan pelanggaran", err);
    } finally {
      setLoadingInfractions(false);
    }
  };

  const handleSaveInfraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInfStudentId || !infType.trim() || !infAction.trim()) {
      setNotifMsg({ type: 'error', text: 'Mohon lengkapi seluruh field input pelanggaran.' });
      return;
    }
    const student = classStudents.find(s => s.id === selectedInfStudentId);
    if (!student) return;

    setSavingInfraction(true);
    try {
      const res = await fetch('/api/student-infraction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          className: currentTeacher.className,
          date: infDate,
          time: infTime,
          location: infLocation || "Lingkungan Sekolah",
          infractionType: infType,
          actionTaken: infAction,
          resolutionStatus: infResolution,
          points: Number(infPoints)
        })
      });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: `🎉 Berhasil mencatat pelanggaran dengan poin ${infPoints} untuk ${student.name}!` });
        setShowSuccessCheck(true);
        setInfType('');
        setSelectedRuleId('');
        setInfPoints(5);
        setInfAction('');
        fetchInfractions();
      } else {
        const d = await res.json();
        setNotifMsg({ type: 'error', text: d.error || 'Gagal menyimpan catatan pelanggaran.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Kesalahan jaringan server.' });
    } finally {
      setSavingInfraction(false);
    }
  };

  const handleDeleteInfraction = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan pelanggaran ini?')) return;
    try {
      const res = await fetch(`/api/student-infraction-logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: 'Catatan pelanggaran berhasil dihapus.' });
        fetchInfractions();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal menghapus catatan pelanggaran.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    }
  };

  // Counseling CRUD
  const fetchCounseling = async () => {
    setLoadingCounseling(true);
    try {
      const res = await fetch('/api/student-counseling-logs');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((log: any) => log.className.toLowerCase() === currentTeacher.className.toLowerCase());
        setCounselingList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat catatan bimbingan", err);
    } finally {
      setLoadingCounseling(false);
    }
  };

  const handleSaveCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounStudentId || !counTopic.trim() || !counActionPlan.trim() || !counResult.trim()) {
      setNotifMsg({ type: 'error', text: 'Mohon lengkapi seluruh field input bimbingan/konseling.' });
      return;
    }
    const student = classStudents.find(s => s.id === selectedCounStudentId);
    if (!student) return;

    setSavingCounseling(true);
    try {
      const res = await fetch('/api/student-counseling-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          className: currentTeacher.className,
          date: counDate,
          topic: counTopic,
          actionPlan: counActionPlan,
          result: counResult
        })
      });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: `🎉 Berhasil mencatat sesi bimbingan konseling untuk ${student.name}!` });
        setShowSuccessCheck(true);
        setCounTopic('');
        setCounActionPlan('');
        setCounResult('');
        fetchCounseling();
      } else {
        const d = await res.json();
        setNotifMsg({ type: 'error', text: d.error || 'Gagal menyimpan catatan bimbingan.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Kesalahan jaringan server.' });
    } finally {
      setSavingCounseling(false);
    }
  };

  const handleDeleteCounseling = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan bimbingan konseling ini?')) return;
    try {
      const res = await fetch(`/api/student-counseling-logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: 'Catatan bimbingan berhasil dihapus.' });
        fetchCounseling();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal menghapus catatan bimbingan.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    }
  };

  // Announcements CRUD
  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch('/api/class-announcements');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((log: any) => log.className.toLowerCase() === currentTeacher.className.toLowerCase());
        setAnnouncementsList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat pengumuman kelas", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      setNotifMsg({ type: 'error', text: 'Mohon lengkapi judul dan isi pengumuman kelas.' });
      return;
    }
    setSavingAnnouncement(true);
    try {
      const res = await fetch('/api/class-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: currentTeacher.className,
          title: annTitle,
          content: annContent,
          date: annDate,
          targetRecipient: annTarget,
          confirmationStatus: 'Belum Dibaca'
        })
      });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: '🎉 Berhasil memposting pengumuman kelas baru!' });
        setShowSuccessCheck(true);
        setAnnTitle('');
        setAnnContent('');
        fetchAnnouncements();
      } else {
        const d = await res.json();
        setNotifMsg({ type: 'error', text: d.error || 'Gagal menyimpan pengumuman.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Kesalahan jaringan server.' });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleToggleAnnConfirmation = async (id: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      'Belum Dibaca': 'Sebagian Terbaca',
      'Sebagian Terbaca': 'Telah Dikonfirmasi',
      'Telah Dikonfirmasi': 'Belum Dibaca'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'Belum Dibaca';
    try {
      const res = await fetch(`/api/class-announcements/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationStatus: nextStatus })
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.error("Gagal memperbarui status baca pengumuman", err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;
    try {
      const res = await fetch(`/api/class-announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: 'Pengumuman kelas berhasil dihapus.' });
        fetchAnnouncements();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal menghapus pengumuman.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    }
  };

  // Meetings CRUD
  const fetchMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const res = await fetch('/api/class-meeting-logs');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((log: any) => log.className.toLowerCase() === currentTeacher.className.toLowerCase());
        setMeetingsList(filtered);
      }
    } catch (err) {
      console.error("Gagal memuat catatan rapat", err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetAttendees.trim() || !meetAgenda.trim() || !meetFollowUp.trim()) {
      setNotifMsg({ type: 'error', text: 'Mohon lengkapi seluruh field rincian rapat atau koordinasi.' });
      return;
    }
    setSavingMeeting(true);
    try {
      const res = await fetch('/api/class-meeting-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: currentTeacher.className,
          meetingType: meetType,
          date: meetDate,
          attendees: meetAttendees,
          agenda: meetAgenda,
          followUp: meetFollowUp
        })
      });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: '🎉 Berhasil menyimpan dokumen jurnal rapat/koordinasi!' });
        setShowSuccessCheck(true);
        setMeetAttendees('');
        setMeetAgenda('');
        setMeetFollowUp('');
        fetchMeetings();
      } else {
        const d = await res.json();
        setNotifMsg({ type: 'error', text: d.error || 'Gagal menyimpan Jurnal Rapat.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Kesalahan jaringan server.' });
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan rapat ini?')) return;
    try {
      const res = await fetch(`/api/class-meeting-logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifMsg({ type: 'success', text: 'Dokumen jurnal rapat berhasil dihapus.' });
        fetchMeetings();
      } else {
        setNotifMsg({ type: 'error', text: 'Gagal menghapus dokumen rapat.' });
      }
    } catch (err) {
      setNotifMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    }
  };

  const handlePrintPerStudent = () => {
    if (!printTargetStudentId) return;
    const student = classStudents.find(s => s.id === printTargetStudentId);
    if (!student) {
      setNotifMsg({ type: 'error', text: 'Siswa tidak ditemukan.' });
      return;
    }

    const studentLogs = devLogsList.filter(log => log.studentId === student.id)
                                  .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (studentLogs.length === 0) {
      setNotifMsg({ type: 'error', text: `Belum ada catatan jurnal perkembangan untuk ${student.name}.` });
      return;
    }

    printStudentDevelopmentRecap(student, studentLogs, schoolIdentity, currentTeacher.name);
  };

  const handlePrintCombinedPerStudent = () => {
    if (!printTargetStudentId) return;
    const student = classStudents.find(s => s.id === printTargetStudentId);
    if (!student) {
      setNotifMsg({ type: 'error', text: 'Siswa tidak ditemukan.' });
      return;
    }

    const studentDevLogs = devLogsList.filter(log => log.studentId === student.id)
                                      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const studentInfractionLogs = infractionList.filter(log => log.studentId === student.id)
                                                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const studentCounselingLogs = counselingList.filter(log => log.studentId === student.id)
                                                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const studentAnnouncements = announcementsList.filter(log => log.className.toLowerCase() === student.class.toLowerCase())
                                                   .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const studentMeetings = meetingsList.filter(log => log.className.toLowerCase() === student.class.toLowerCase())
                                        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    printStudentCombinedRecap(
      student,
      studentDevLogs,
      studentInfractionLogs,
      studentCounselingLogs,
      schoolIdentity,
      currentTeacher.name
    );
  };

  const fetchMerdekaAssessments = async () => {
    setLoadingAssessments(true);
    try {
      const res = await fetch('/api/merdeka-assessments');
      if (res.ok) {
        const data = await res.json();
        setMerdekaAssessments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchTeachingJournals();
    } else if (activeSubTab === 'perkembangan') {
      fetchDevLogs();
      fetchInfractions();
      fetchInfractionRules();
      fetchCounseling();
      fetchAnnouncements();
      fetchMeetings();
    } else if (activeSubTab === 'rapor_merdeka') {
      fetchMerdekaAssessments();
    } else if (activeSubTab === 'profile') {
      fetchPrincipalWorkPrograms();
    } else if (activeSubTab === 'pkg') {
      fetchEvaluations();
    }
  }, [activeSubTab, currentTeacher.className]);

  useEffect(() => {
    if (classStudents.length > 0 && !selectedReportStudentId) {
      setSelectedReportStudentId(classStudents[0].id);
    }
  }, [classStudents, selectedReportStudentId]);

  const selectedStudent = useMemo(() => {
    return classStudents.find(s => s.id === selectedReportStudentId) || classStudents[0] || null;
  }, [classStudents, selectedReportStudentId]);

  // In-memory state for active edits of attendance for the selected date
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState<boolean>(false);

  // Sync state when date changes or logs/students change
  useEffect(() => {
    const statusMap: Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }> = {};
    
    classStudents.forEach((student) => {
      const existing = attendanceLogs.find(
        (log) => log.studentId === student.id && log.date === selectedDate
      );
      if (existing) {
        statusMap[student.id] = {
          status: existing.status,
          notes: existing.notes || ''
        };
      } else {
        // default status is "Hadir"
        statusMap[student.id] = {
          status: 'Hadir',
          notes: ''
        };
      }
    });

    setDailyStatusMap(statusMap);
    setNotifMsg(null);
  }, [selectedDate, attendanceLogs, students]);

  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat') => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotifMsg(null);

    const logsToSave = classStudents.map((s) => ({
      studentId: s.id,
      date: selectedDate,
      status: dailyStatusMap[s.id]?.status || 'Hadir',
      notes: dailyStatusMap[s.id]?.notes || ''
    }));

    try {
       const success = await onSaveBatchAttendance(logsToSave);
       if (success) {
         setNotifMsg({ type: 'success', text: `🎉 Berhasil menyimpan absensi Kelas ${currentTeacher.className} tanggal ${selectedDate}!` });
         setShowSuccessCheck(true);
       } else {
         setNotifMsg({ type: 'error', text: 'Gagal menghubungkan ke server untuk menyimpan absensi.' });
       }
     } catch (err) {
       setNotifMsg({ type: 'error', text: 'Terjadi kesalahan sistem.' });
     } finally {
       setIsSaving(false);
     }
  };

  const handleTeacherPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Sandi baru harus berjumlah minimal 6 karakter.');
      return;
    }
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const res = await fetch('/api/homerooms/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: currentTeacher.id,
          oldPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordSuccess('🎉 Kata sandi berhasil diperbarui secara aman.');
        setOldPassword('');
        setNewPassword('');
      } else {
        setPasswordError(data.error || 'Gagal memperbarui sandi.');
      }
    } catch (err) {
      setPasswordError('Kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Pre-calculate today's statistics
  const currentFilteredLogs = attendanceLogs.filter(l => l.date === selectedDate && classStudents.some(s => s.id === l.studentId));
  const stats = {
    total: classStudents.length,
    hadir: currentFilteredLogs.filter(l => l.status === 'Hadir').length,
    terlambat: currentFilteredLogs.filter(l => l.status === 'Terlambat').length,
    sakit: currentFilteredLogs.filter(l => l.status === 'Sakit').length,
    izin: currentFilteredLogs.filter(l => l.status === 'Izin').length,
    alpa: currentFilteredLogs.filter(l => l.status === 'Alpa').length,
  };

  const currentDailyStats = useMemo(() => {
    const values = Object.values(dailyStatusMap) as { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }[];
    return {
      total: classStudents.length,
      hadir: values.filter(v => v.status === 'Hadir').length,
      terlambat: values.filter(v => v.status === 'Terlambat').length,
      sakit: values.filter(v => v.status === 'Sakit').length,
      izin: values.filter(v => v.status === 'Izin').length,
      alpa: values.filter(v => v.status === 'Alpa').length,
    };
  }, [dailyStatusMap, classStudents]);

  // All time class stats
  const classLogs = attendanceLogs.filter(l => classStudents.some(s => s.id === l.studentId));

  // Filtered Student Development Logs
  const filteredDevLogs = useMemo(() => {
    return devLogsList.filter(log => {
      const matchSearch = log.studentName.toLowerCase().includes(devLogSearch.toLowerCase()) || 
                          log.notes.toLowerCase().includes(devLogSearch.toLowerCase());
      const matchCategory = devLogFilterCategory === 'All' || log.category === devLogFilterCategory;
      return matchSearch && matchCategory;
    });
  }, [devLogsList, devLogSearch, devLogFilterCategory]);

  // Filtered Infraction Logs
  const filteredInfractionLogs = useMemo(() => {
    return infractionList.filter(log => {
      const matchSearch = log.studentName.toLowerCase().includes(infSearch.toLowerCase()) || 
                          log.infractionType.toLowerCase().includes(infSearch.toLowerCase()) ||
                          log.actionTaken.toLowerCase().includes(infSearch.toLowerCase()) ||
                          (log.location && log.location.toLowerCase().includes(infSearch.toLowerCase()));
      const matchStatus = infFilterStatus === 'All' || log.resolutionStatus === infFilterStatus;
      return matchSearch && matchStatus;
    });
  }, [infractionList, infSearch, infFilterStatus]);

  // Filtered Counseling Logs
  const filteredCounselingLogs = useMemo(() => {
    return counselingList.filter(log => {
      const matchSearch = log.studentName.toLowerCase().includes(counSearch.toLowerCase()) || 
                          log.topic.toLowerCase().includes(counSearch.toLowerCase()) ||
                          log.actionPlan.toLowerCase().includes(counSearch.toLowerCase()) ||
                          log.result.toLowerCase().includes(counSearch.toLowerCase());
      return matchSearch;
    });
  }, [counselingList, counSearch]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcementsList.filter(log => {
      const matchSearch = log.title.toLowerCase().includes(annSearch.toLowerCase()) || 
                          log.content.toLowerCase().includes(annSearch.toLowerCase()) ||
                          log.targetRecipient.toLowerCase().includes(annSearch.toLowerCase());
      return matchSearch;
    });
  }, [announcementsList, annSearch]);

  // Filtered Rapat / Koordinasi Logs
  const filteredMeetings = useMemo(() => {
    return meetingsList.filter(log => {
      const matchSearch = log.meetingType.toLowerCase().includes(meetSearch.toLowerCase()) || 
                          log.attendees.toLowerCase().includes(meetSearch.toLowerCase()) ||
                          log.agenda.toLowerCase().includes(meetSearch.toLowerCase()) ||
                          log.followUp.toLowerCase().includes(meetSearch.toLowerCase());
      return matchSearch;
    });
  }, [meetingsList, meetSearch]);

  // Copy WhatsApp Reminder for parents regarding outstanding bills
  const copyWaReminder = (student: Student, unpaidBills: SppBill[], unpaidMisc: MiscBill[] = []) => {
    const formattedSavings = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(student.savingsBalance || 0);

    const totalUnpaid = unpaidBills.reduce((acc, curr) => acc + curr.amount, 0);
    const formattedUnpaid = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(totalUnpaid);

    const totalUnpaidMisc = unpaidMisc.reduce((acc, curr) => acc + curr.amount, 0);
    const formattedUnpaidMisc = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(totalUnpaidMisc);

    const totalAllUnpaid = totalUnpaid + totalUnpaidMisc;
    const formattedAllUnpaid = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(totalAllUnpaid);

    const monthsStr = unpaidBills.map(b => `${b.month} ${b.year}`).join(', ');
    const miscsStr = unpaidMisc.map(b => `${b.title} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(b.amount)})`).join(', ');
    const schoolName = schoolIdentity?.name || "SMP Maarif";

    let billDetails = '';
    if (unpaidBills.length > 0) {
      billDetails += `\n*Tunggakan SPP Belum Lunas:* ${formattedUnpaid} (${monthsStr})`;
    }
    if (unpaidMisc.length > 0) {
      billDetails += `\n*Tunggakan Iuran Lain-lain:* ${formattedUnpaidMisc} (${miscsStr})`;
    }
    if (unpaidBills.length > 0 && unpaidMisc.length > 0) {
      billDetails += `\n*Total Seluruh Tunggakan:* ${formattedAllUnpaid}`;
    }

    const text = `Assalamualaikum Wr. Wb. Bapak/Ibu Wali Murid dari *${student.name}* (NIS: *${student.nis}*).

Kami dari pihak Wali Kelas *${currentTeacher.className}* ${schoolName} ingin menginfokan bahwa saat ini terdapat tagihan siswa yang belum dilunasi dengan rincian sebagai berikut:
${billDetails}
*Saldo Tabungan Saat Ini:* ${formattedSavings}

Bapak/Ibu dapat melakukan pelunasan tagihan ini secara online via Portal Pembayaran Siswa, atau dengan menyetorkan secara tunai melalui staf sekolah / teller keuangan.

Terima kasih banyak atas perhatian, kerja sama, dan support Bapak/Ibu sekalian.
Wassalamualaikum Wr. Wb.

-- Hormat kami,
*${currentTeacher.name}*
(Wali Kelas ${currentTeacher.className})`;

    navigator.clipboard.writeText(text);
    setCopiedStudentId(student.id);
    setTimeout(() => {
      setCopiedStudentId(null);
    }, 2000);
  };

  // Memoized Attendance Recap calculation in selected duration
  const rekapData = useMemo(() => {
    return classStudents.map((student, idx) => {
      // Filter logs for this student within date range
      const sLogs = attendanceLogs.filter(
        l => l.studentId === student.id &&
             l.date >= rekapStartDate &&
             l.date <= rekapEndDate
      );

      const countHadir = sLogs.filter(l => l.status === 'Hadir').length;
      const countTerlambat = sLogs.filter(l => l.status === 'Terlambat').length;
      const countSakit = sLogs.filter(l => l.status === 'Sakit').length;
      const countIzin = sLogs.filter(l => l.status === 'Izin').length;
      const countAlpa = sLogs.filter(l => l.status === 'Alpa').length;
      const totalDays = sLogs.length;

      // Rate of attendance (hadir and terlambat ratio of total sessions logged)
      const attendanceRate = totalDays > 0 
        ? Math.round(((countHadir + countTerlambat) / totalDays) * 100) 
        : 100;

      return {
        index: idx + 1,
        student,
        hadir: countHadir,
        terlambat: countTerlambat,
        sakit: countSakit,
        izin: countIzin,
        alpa: countAlpa,
        total: totalDays,
        rate: attendanceRate
      };
    });
  }, [classStudents, attendanceLogs, rekapStartDate, rekapEndDate]);

  // Excel (.xls format with clean XML and styles optimized for Microsoft Excel)
  const downloadExcelRekap = () => {
    const totalHadirClass = rekapData.reduce((acc, r) => acc + r.hadir, 0);
    const totalTerlambatClass = rekapData.reduce((acc, r) => acc + r.terlambat, 0);
    const totalSakitClass = rekapData.reduce((acc, r) => acc + r.sakit, 0);
    const totalIzinClass = rekapData.reduce((acc, r) => acc + r.izin, 0);
    const totalAlpaClass = rekapData.reduce((acc, r) => acc + r.alpa, 0);
    const totalPencatatanClass = rekapData.reduce((acc, r) => acc + r.total, 0);
    const avgRateClass = rekapData.length > 0
      ? Math.round(rekapData.reduce((acc, r) => acc + r.rate, 0) / rekapData.length)
      : 0;

    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();

    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Rekap Presensi</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #1e293b;
  }
  .title-school {
    font-size: 15pt;
    font-weight: bold;
    color: #15803d; /* Emerald-700 green */
    text-align: left;
    height: 30px;
  }
  .title-report {
    font-size: 11pt;
    font-weight: bold;
    color: #334155;
    text-align: left;
    height: 22px;
  }
  .meta-label {
    font-size: 9pt;
    font-weight: bold;
    color: #475569;
    height: 18px;
  }
  .meta-value {
    font-size: 9pt;
    color: #0f172a;
    height: 18px;
  }
  .th-header {
    background-color: #1e293b; /* Slate-800 */
    color: #ffffff;
    font-weight: bold;
    font-size: 9.5pt;
    text-align: center;
    border: 1px solid #cbd5e1;
    height: 28px;
    vertical-align: middle;
  }
  .td-data {
    font-size: 9.5pt;
    border: 1px solid #e2e8f0;
    height: 22px;
    vertical-align: middle;
    padding: 2px 6px;
  }
  .td-center {
    text-align: center;
  }
  .td-left {
    text-align: left;
  }
  .zebra-even {
    background-color: #f8fafc; /* Slate-50 zebra pattern */
  }
  .summary-row {
    background-color: #f1f5f9; /* Slate-100 */
    font-weight: bold;
    font-size: 9.5pt;
    height: 24px;
  }
</style>
</head>
<body>
  <table>
    <!-- Header identity info block -->
    <tr>
      <td colspan="11" class="title-school">${schoolNameUpper}</td>
    </tr>
    <tr>
      <td colspan="11" class="title-report">LAPORAN REKAPITULASI PRESENSI KEHADIRAN SISWA</td>
    </tr>
    <tr>
      <td colspan="11" style="height: 6px;"></td>
    </tr>
    
    <!-- Meta/Context Details -->
    <tr>
      <td colspan="2" class="meta-label">Kelas:</td>
      <td colspan="9" class="meta-value">${currentTeacher.className}</td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Wali Kelas:</td>
      <td colspan="9" class="meta-value">${currentTeacher.name}</td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Rentang Waktu:</td>
      <td colspan="9" class="meta-value">${rekapStartDate} s.d. ${rekapEndDate}</td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Tanggal Ekspor:</td>
      <td colspan="9" class="meta-value">${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB</td>
    </tr>
    <tr>
      <td colspan="11" style="height: 12px;"></td>
    </tr>

    <!-- Table Grid Heads -->
    <thead>
      <tr>
        <th class="th-header" style="width: 40px; background-color: #334155;">No</th>
        <th class="th-header" style="width: 100px; background-color: #334155;">NIS</th>
        <th class="th-header" style="width: 250px; background-color: #334155;">Nama Siswa</th>
        <th class="th-header" style="width: 70px; background-color: #334155;">Kelas</th>
        <th class="th-header" style="width: 85px; background-color: #16a34a;">Hadir (H)</th>
        <th class="th-header" style="width: 90px; background-color: #ca8a04;">Terlambat (T)</th>
        <th class="th-header" style="width: 85px; background-color: #2563eb;">Sakit (S)</th>
        <th class="th-header" style="width: 85px; background-color: #7c3aed;">Izin (I)</th>
        <th class="th-header" style="width: 90px; background-color: #db2777;">Alpa (A)</th>
        <th class="th-header" style="width: 100px; background-color: #475569;">Total Hari</th>
        <th class="th-header" style="width: 100px; background-color: #0f766e;">Persentase</th>
      </tr>
    </thead>
    <tbody>
`;

    rekapData.forEach((row, idx) => {
      const isEven = idx % 2 === 1;
      const zebraClass = isEven ? 'zebra-even' : '';
      const percentValue = row.rate / 100;
      
      excelHtml += `
      <tr class="${zebraClass}">
        <td class="td-data td-center">${idx + 1}</td>
        <!-- Force text formatting for NIS so leading zeroes are NOT dropped -->
        <td class="td-data td-center" style="mso-number-format:'@';">${row.student.nis}</td>
        <td class="td-data td-left" style="font-weight: 500;">${row.student.name}</td>
        <td class="td-data td-center">${currentTeacher.className}</td>
        <td class="td-data td-center" style="color: #16a34a; font-weight: bold;">${row.hadir}</td>
        <td class="td-data td-center" style="color: #ca8a04;">${row.terlambat}</td>
        <td class="td-data td-center" style="color: #2563eb;">${row.sakit}</td>
        <td class="td-data td-center" style="color: #7c3aed;">${row.izin}</td>
        <td class="td-data td-center" style="color: #db2777;">${row.alpa}</td>
        <td class="td-data td-center">${row.total}</td>
        <td class="td-data td-center" style="font-weight: bold; mso-number-format:'0%';">${percentValue}</td>
      </tr>
`;
    });

    excelHtml += `
      <!-- Table Footer Summary for Class averages and absolute totals -->
      <tr class="summary-row" style="background-color: #e2e8f0; font-weight: bold;">
        <td colspan="4" class="td-data" style="text-align: right; background-color: #cbd5e1; border-top: 2px solid #475569; padding-right: 12px;">TOTAL / RATA-RATA KELAS</td>
        <td class="td-data td-center" style="color: #16a34a; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalHadirClass}</td>
        <td class="td-data td-center" style="color: #ca8a04; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalTerlambatClass}</td>
        <td class="td-data td-center" style="color: #2563eb; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalSakitClass}</td>
        <td class="td-data td-center" style="color: #7c3aed; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalIzinClass}</td>
        <td class="td-data td-center" style="color: #db2777; background-color: #e2e8f0; border-top: 2px solid #475569;">${totalAlpaClass}</td>
        <td class="td-data td-center" style="background-color: #e2e8f0; border-top: 2px solid #475569;">${totalPencatatanClass}</td>
        <td class="td-data td-center" style="background-color: #cbd5e1; border-top: 2px solid #475569; mso-number-format:'0%';">${avgRateClass / 100}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Presensi_Kelas_${currentTeacher.className}_${rekapStartDate}_to_${rekapEndDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized school / student finance aggregate statistics for this class
  const classFinanceStats = useMemo(() => {
    let totalSavings = 0;
    let totalUnpaidSpp = 0;
    let totalInArrearsCount = 0;
    let totalUnpaidMisc = 0;
    let totalInArrearsMiscCount = 0;

    classStudents.forEach(student => {
      totalSavings += student.savingsBalance || 0;
      
      const sBills = bills.filter(b => b.studentId === student.id && b.status === 'unpaid' && isSppBillOverdue(b));
      const unpaidSum = sBills.reduce((acc, curr) => acc + curr.amount, 0);
      totalUnpaidSpp += unpaidSum;
      if (sBills.length > 0) {
        totalInArrearsCount++;
      }

      const sMiscBills = (miscBills || []).filter(b => b.studentId === student.id && b.status !== 'paid');
      const unpaidMiscSum = sMiscBills.reduce((acc, curr) => acc + curr.amount, 0);
      totalUnpaidMisc += unpaidMiscSum;
      if (sMiscBills.length > 0) {
        totalInArrearsMiscCount++;
      }
    });

    return {
      totalSavings,
      totalUnpaidSpp,
      totalInArrearsCount,
      totalUnpaidMisc,
      totalInArrearsMiscCount
    };
  }, [classStudents, bills, miscBills]);

  return (
    <div id="homeroom-dashboard-root" className="flex flex-col gap-6 pb-24 md:pb-0 animate-fade-in">
      {/* Top Welcome Title Bar */}
      <div className={`bg-gradient-to-r from-emerald-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-emerald-950 relative overflow-hidden animate-fade-in ${
        activeSubTab === 'record' ? 'hidden md:block' : 'hidden'
      }`}>
        {/* Abstract shapes */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/5 rounded-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-450/20 text-emerald-300 font-bold text-[10px] w-fit uppercase tracking-widest border border-emerald-500/30">
              <Sparkles size={11} className="text-yellow-400 animate-pulse" /> Portal Wali Kelas Resmi
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Selamat Bertugas, {currentTeacher.name}!
            </h1>
            <p className="text-xs text-slate-300 max-w-xl">
              Anda berhak mengontrol dan memasukkan rekaman kehadiran harian kelas <strong>{currentTeacher.className}</strong>. Data absensi ini langsung terhubung dengan login dashboard profil murid masing-masing.
            </p>
          </div>

          <div className="flex shrink-0 gap-3 items-center">
            <button
              onClick={onRefresh}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-1.5 cursor-pointer"
            >
              🔄 Muat Ulang
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-1.5 border border-rose-700 shadow-sm shadow-rose-950 cursor-pointer"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Class Overview Cards - Compact & Clean Layout */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in ${
        activeSubTab === 'record' ? 'grid' : 'hidden'
      }`}>
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
            <Users size={16} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Murid</span>
            <span className="block text-sm md:text-base font-black text-slate-800 mt-0.5 whitespace-nowrap">{classStudents.length} Anak</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
            <ClipboardCheck size={16} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Hadir Hari Ini</span>
            <span className="block text-sm md:text-base font-black text-slate-800 mt-0.5 whitespace-nowrap">{(stats.hadir + stats.terlambat)} / {stats.total}</span>
            {stats.terlambat > 0 && (
              <span className="block text-[8px] text-purple-600 font-bold leading-none mt-0.5">({stats.terlambat} Tlk)</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
            <Calendar size={16} />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Izin & Sakit</span>
            <span className="block text-sm md:text-base font-black text-slate-800 mt-0.5 whitespace-nowrap">{stats.sakit + stats.izin} Anak</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 text-white shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Log</span>
            <span className="block text-sm md:text-base font-black text-emerald-600 mt-0.5 whitespace-nowrap">{classLogs.length} Entri</span>
          </div>
        </div>
      </div>

      {/* Primary Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Control Column (Date and Subtabs selector) - Hidden on mobile, controlled via bottom nav */}
        <div className="hidden md:flex md:col-span-3 flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-inner flex flex-col gap-5 text-left">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atur Parameter</span>
              <h3 className="text-slate-900 font-extrabold text-sm mt-1">Absensi Kelas {currentTeacher.className}</h3>
            </div>

            {/* Subtab selection */}
            <div className="flex flex-col gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
              <button
                _id="tab-btn-record"
                onClick={() => setActiveSubTab('record')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'record'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Pengisian Absensi"
              >
                <span className="text-sm">📝</span>
                <span className="hidden md:inline">Pengisian Absensi</span>
              </button>
              <button
                _id="tab-btn-history"
                onClick={() => setActiveSubTab('history')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'history'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Riwayat Jurnal Kelas"
              >
                <span className="text-sm">📊</span>
                <span className="hidden md:inline">Riwayat Jurnal</span>
              </button>
              <button
                _id="tab-btn-rekap"
                onClick={() => setActiveSubTab('rekap_absensi')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'rekap_absensi'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Rekap Absensi Kelas"
              >
                <span className="text-sm">📉</span>
                <span className="hidden md:inline">Rekap Absensi</span>
              </button>
              <button
                _id="tab-btn-finance"
                onClick={() => setActiveSubTab('finance')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'finance'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Tabungan & Tagihan SPP"
              >
                <span className="text-sm">💳</span>
                <span className="hidden md:inline">Tabungan & SPP</span>
              </button>
              <button
                _id="tab-btn-perkembangan"
                onClick={() => setActiveSubTab('perkembangan')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'perkembangan'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Jurnal Perkembangan Siswa"
              >
                <span className="text-sm">📈</span>
                <span className="hidden md:inline">Jurnal Perkembangan</span>
              </button>
              <button
                _id="tab-btn-profile"
                onClick={() => setActiveSubTab('profile')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'profile'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Profil Wali Kelas & Ubah Sandi"
              >
                <span className="text-sm">👤</span>
                <span className="hidden md:inline">Profil & Sandi</span>
              </button>

              <button
                _id="tab-btn-rapor"
                onClick={() => setActiveSubTab('rapor_merdeka')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'rapor_merdeka'
                    ? 'bg-indigo-650 text-white shadow-md'
                    : 'text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50'
                }`}
                title="Halaman Rapor Kurikulum Merdeka Siswa"
              >
                <span className="text-sm">🎓</span>
                <span className="hidden md:inline">Rapor Merdeka</span>
              </button>

              <button
                _id="tab-btn-pkg"
                onClick={() => setActiveSubTab('pkg')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'pkg'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
                title="Evaluasi Penilaian Kinerja Guru oleh Kepala Sekolah"
              >
                <span className="text-sm">🎖️</span>
                <span className="hidden md:inline">Kinerja (PKG)</span>
              </button>

              <button
                _id="tab-btn-buku-induk"
                onClick={() => setActiveSubTab('buku_induk')}
                className={`py-2 px-3 flex-1 md:flex-none justify-center md:justify-start text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeSubTab === 'buku_induk'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-650 bg-slate-100 hover:bg-slate-200'
                }`}
                title="Buku Induk Kesiswaan Digital Kelas Binaan"
              >
                <span className="text-sm">📗</span>
                <span className="hidden md:inline">Buku Induk Kelas</span>
              </button>
            </div>

            {/* Date Picker input widget */}
            {activeSubTab === 'record' && (
              <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Kalender</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={todayStr}
                    className="w-full px-3 py-2 border border-slate-250 border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <span className="text-[8.5px] text-slate-400">Pilih tanggal untuk melihat/menulis rekaman presensi.</span>
              </div>
            )}
          </div>

          {/* Unduh Aplikasi Mobile Block */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs flex flex-col gap-2 text-left">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-emerald-700" /> Aplikasi Mobile Sekolah
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <a
                href={schoolIdentity?.apkUrl || "#"}
                target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!schoolIdentity?.apkUrl) {
                    e.preventDefault();
                    alert("Link unduhan Android belum diatur oleh Administrator.");
                  }
                }}
                className={`px-1.5 py-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer select-none group font-bold ${
                  schoolIdentity?.apkUrl 
                    ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800 border-emerald-250 shadow-3xs" 
                    : "bg-slate-50/50 text-slate-400 border-slate-100 opacity-70"
                }`}
              >
                <Smartphone size={16} className={`${schoolIdentity?.apkUrl ? "text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)] group-hover:scale-110" : "text-emerald-300/60"} transition-transform stroke-[2.5]`} />
                <span className="text-[8.5px]">Android APK</span>
              </a>
              <a
                href={schoolIdentity?.iosUrl || "#"}
                target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!schoolIdentity?.iosUrl) {
                    e.preventDefault();
                    alert("Link unduhan iOS belum diatur oleh Administrator.");
                  }
                }}
                className={`px-1.5 py-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer select-none group font-bold ${
                  schoolIdentity?.iosUrl 
                    ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-800 border-sky-250 shadow-3xs" 
                    : "bg-slate-50/50 text-slate-400 border-slate-100 opacity-70"
                }`}
              >
                <Apple size={16} className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`} />
                <span className="text-[8.5px]">iOS Apple</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Details/List/Form Column */}
        <div className="md:col-span-9 font-sans">
          {activeSubTab === 'record' && (
            <form onSubmit={handleSubmitAttendance} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2 select-none">
                <div>
                  <h2 className="font-extrabold text-slate-800 text-sm">Lembar Absensi Harian Kelas</h2>
                  <p className="text-slate-450 text-[11px] mt-0.5 font-bold text-indigo-700">Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400 border border-slate-250 bg-white px-2.5 py-1 rounded-lg">
                  <span>H:{stats.hadir}</span> &bull; <span>T:{stats.terlambat}</span> &bull; <span>S:{stats.sakit}</span> &bull; <span>I:{stats.izin}</span> &bull; <span>A:{stats.alpa}</span>
                </div>
              </div>

              {/* Compact Date Picker for Mobile Screens inside Right Panel when sidebar is hidden */}
              <div className="md:hidden px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-col gap-1.5 text-left">
                <label className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Kalender Absensi:</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={todayStr}
                  className="px-3.5 py-2 w-full bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Status Alert or notification inside form code */}
              {notifMsg && (
                <div className={`m-6 mb-2 p-3 font-semibold text-xs rounded-xl flex items-center gap-2.5 animate-fade-in ${
                  notifMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100 border'
                    : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{notifMsg.text}</span>
                </div>
              )}

              {/* Students attendance rows list */}
              {classStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <ErrorIcon size={24} />
                  <p className="font-bold text-xs text-slate-700">Belum Ada Siswa Di Kelas Ini</p>
                  <p className="text-[11px] text-slate-440 max-w-xs mt-0.5">Silakan tambahkan data murid ke kualifikasi kelas &ldquo;{currentTeacher.className}&rdquo; terlebih dahulu via panel Admin sekolah Anda.</p>
                </div>
              ) : (
                <div className="p-6 flex flex-col gap-4">
                  {/* Desktop Table View */}
                  <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase tracking-wider select-none">
                          <th className="py-2.5 px-4">Informasi Murid</th>
                          <th className="py-2.5 px-4 text-center">Status Kehadiran</th>
                          <th className="py-2.5 px-4">Keterangan / Alasan Surat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((student) => {
                          const currentData = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{student.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {student.nis}</div>
                                {(() => {
                                  const matchingLog = attendanceLogs.find(
                                    (log) => log.studentId === student.id && log.date === selectedDate
                                  );
                                  const subjectNotesList = matchingLog?.subjectNotes || [];
                                  if (subjectNotesList.length === 0) return null;
                                  return (
                                    <div className="mt-2 flex flex-col gap-1 max-w-sm">
                                      <div className="text-[9px] font-black uppercase text-amber-600 tracking-wider">Catatan Guru Mapel:</div>
                                      {subjectNotesList.map((sn, sIdx) => (
                                        <div key={sIdx} className="bg-amber-50/60 border border-amber-100 rounded-lg p-2 text-[10px] text-amber-900 leading-tight">
                                          <div className="font-bold flex items-center justify-between gap-2">
                                            <span>{sn.subject} <span className="font-normal text-slate-500">({sn.status})</span></span>
                                            <span className="text-[8.5px] text-slate-400 font-normal">{sn.teacherName}</span>
                                          </div>
                                          {sn.notes && <div className="mt-1 text-slate-750 italic">" {sn.notes} "</div>}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </td>
                              
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-1 bg-slate-50 p-1.5 border border-slate-200 rounded-lg w-fit mx-auto">
                                  {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                    const activeColors = {
                                      'Hadir': 'bg-emerald-600 border-emerald-700 text-white shadow-xs',
                                      'Terlambat': 'bg-purple-600 border-purple-700 text-white shadow-xs',
                                      'Sakit': 'bg-amber-500 border-amber-600 text-white shadow-xs',
                                      'Izin': 'bg-indigo-600 border-indigo-700 text-white shadow-xs',
                                      'Alpa': 'bg-rose-650 bg-rose-600 border-rose-700 text-white shadow-xs'
                                    };
                                    const defaultColors = 'bg-white hover:bg-slate-100 border-slate-200 text-slate-650 font-bold';
                                    const isActive = currentData.status === st;

                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleStatusChange(student.id, st)}
                                        className={`px-2 py-1 text-[10px] border font-bold uppercase tracking-wider rounded-md cursor-pointer transition-all min-w-[50px] text-center ${isActive ? activeColors[st] : defaultColors}`}
                                      >
                                        {st}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={currentData.notes}
                                  onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                  placeholder="Sakit demam, izin keluar kota, alpa, dll"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs placeholder:text-slate-300 focus:outline-none focus:border-slate-700 font-semibold"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Touch-Friendly Card List View */}
                  <div className="block md:hidden flex flex-col gap-4">
                    {classStudents.map((student) => {
                      const currentData = dailyStatusMap[student.id] || { status: 'Hadir', notes: '' };

                      return (
                        <div key={`mob-att-${student.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">NIS: {student.nis}</span>
                            {(() => {
                              const matchingLog = attendanceLogs.find(
                                (log) => log.studentId === student.id && log.date === selectedDate
                              );
                              const subjectNotesList = matchingLog?.subjectNotes || [];
                              if (subjectNotesList.length === 0) return null;
                              return (
                                <div className="mt-2 flex flex-col gap-1">
                                  <div className="text-[9px] font-black uppercase text-amber-600 tracking-wider">Catatan Guru Mapel:</div>
                                  {subjectNotesList.map((sn, sIdx) => (
                                    <div key={sIdx} className="bg-amber-50/60 border border-amber-100 rounded-lg p-2 text-[10px] text-amber-900 leading-tight">
                                      <div className="font-bold flex items-center justify-between gap-2">
                                        <span>{sn.subject} <span className="font-normal text-slate-500">({sn.status})</span></span>
                                        <span className="text-[8.5px] text-slate-400 font-normal">{sn.teacherName}</span>
                                      </div>
                                      {sn.notes && <div className="mt-1 text-slate-755 italic">" {sn.notes} "</div>}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status Kehadiran:</span>
                              {(() => {
                                const activePillColors = {
                                  'Hadir': 'bg-emerald-50 text-emerald-700 border-emerald-250 text-[10px]',
                                  'Terlambat': 'bg-purple-50 text-purple-700 border-purple-250 text-[10px]',
                                  'Sakit': 'bg-amber-50 text-amber-700 border-amber-250 text-[10px]',
                                  'Izin': 'bg-indigo-50 text-indigo-700 border-indigo-250 text-[10px]',
                                  'Alpa': 'bg-rose-50 text-rose-700 border-rose-250 text-[10px]'
                                };
                                return (
                                  <span className={`font-black px-2 py-0.5 rounded-full border ${activePillColors[currentData.status]}`}>
                                    {currentData.status}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 border border-slate-200 rounded-lg">
                              {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                const activeColors = {
                                  'Hadir': 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
                                  'Terlambat': 'bg-purple-600 text-white border-purple-600 shadow-xs',
                                  'Sakit': 'bg-amber-500 text-white border-amber-500 shadow-xs',
                                  'Izin': 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
                                  'Alpa': 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                };
                                const defaultColors = 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 font-bold';
                                const isActive = currentData.status === st;
                                const shortLabel = st === 'Hadir' ? 'H' : st === 'Terlambat' ? 'T' : st === 'Sakit' ? 'S' : st === 'Izin' ? 'I' : 'A';

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    translate="no"
                                    onClick={() => handleStatusChange(student.id, st)}
                                    className={`notranslate py-2 px-0.5 text-xs border font-black uppercase tracking-wider rounded-md text-center cursor-pointer transition-all ${isActive ? activeColors[st] : defaultColors}`}
                                    title={st}
                                  >
                                    {shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Keterangan / Alasan Surat:</span>
                            <input
                              type="text"
                              value={currentData.notes}
                              onChange={(e) => handleNotesChange(student.id, e.target.value)}
                              placeholder="Sakit demam, izin keluar kota, dll"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs placeholder:text-slate-300 focus:outline-none focus:border-slate-700 font-semibold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="self-end mt-2 px-6 py-2.5 bg-emerald-650 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Simpan Rekap Absensi Kelas</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {activeSubTab === 'history' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-sm">Jurnal &amp; Riwayat Presensi Kelas / KBM</h3>
                  <p className="text-slate-450 text-xs mt-0.5">Koleksi ringkasan kehadiran seluruh siswa kelas {currentTeacher.className} dari waktu ke waktu dan log kegiatan pembelajaran harian.</p>
                </div>
                
                {/* Switcher Mode / Segmented Control */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setJournalViewMode('presensi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${journalViewMode === 'presensi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    📝 Kehadiran Harian
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJournalViewMode('kbm');
                      fetchTeachingJournals();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${journalViewMode === 'kbm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    📖 Jurnal Pembelajaran (KBM)
                  </button>
                </div>
              </div>

              {journalViewMode === 'presensi' ? (
                classLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    Belum ada sejarah pengisian jurnal absensi di kelas ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Aggregate stats breakdown of current class logs ratio */}
                    {(() => {
                      const uniqueDates = Array.from(new Set(classLogs.map(l => l.date)));
                      const totalEntries = classLogs.length;
                      const h_total = classLogs.filter(l => l.status === 'Hadir').length;
                      const t_total = classLogs.filter(l => l.status === 'Terlambat').length;
                      const s_total = classLogs.filter(l => l.status === 'Sakit').length;
                      const i_total = classLogs.filter(l => l.status === 'Izin').length;
                      const a_total = classLogs.filter(l => l.status === 'Alpa').length;

                      return (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between flex-wrap gap-4 select-none">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Kehadiran Kumulatif</span>
                            <span className="block text-xl font-black text-slate-800 mt-1">{totalEntries > 0 ? Math.round(((h_total + t_total) / totalEntries) * 100) : 100}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-emerald-600 uppercase">Hadir</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{h_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-purple-600 uppercase">Terlambat</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{t_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-amber-600 uppercase">Sakit</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{s_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-blue-600 uppercase">Izin</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{i_total}</span>
                            </div>
                            <div className="border-l border-slate-200 h-6 shrink-0" />
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-rose-600 uppercase">Alpa</span>
                              <span className="block text-sm font-semibold text-slate-700 mt-0.5">{a_total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Date-wise journals listing */}
                    {(() => {
                      const uniqueDatesSorted = Array.from(new Set(classLogs.map(l => l.date))).sort((a,b) => b.localeCompare(a));

                      return (
                        <div className="flex flex-col gap-4">
                          {uniqueDatesSorted.map((date) => {
                            const dateLogs = classLogs.filter(l => l.date === date);
                            const total = classStudents.length;
                            const h = dateLogs.filter(l => l.status === 'Hadir').length;
                            const t = dateLogs.filter(l => l.status === 'Terlambat').length;
                            const s = dateLogs.filter(l => l.status === 'Sakit').length;
                            const i = dateLogs.filter(l => l.status === 'Izin').length;
                            const a = dateLogs.filter(l => l.status === 'Alpa').length;
                            const attendanceRate = total > 0 ? Math.round(((h + t) / total) * 100) : 100;

                            return (
                              <div key={date} className="bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-col gap-1 text-left">
                                  <span className="text-xs font-black text-slate-800">
                                    {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-semibold uppercase font-mono tracking-wider">
                                    Persentase: {attendanceRate}% Hadir ({h + t} dari {total} Siswa)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <div className="flex gap-1">
                                    {h > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded">H: {h}</span>}
                                    {t > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 rounded">T: {t}</span>}
                                    {s > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 rounded">S: {s}</span>}
                                    {i > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-50 rounded">I: {i}</span>}
                                    {a > 0 && <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 rounded">A: {a}</span>}
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDate(date);
                                      setActiveSubTab('record');
                                    }}
                                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer text-center"
                                  >
                                    Edit Jurnal
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : (
                /* JOURNAL KBM FROM SUBJECT TEACHERS (LES / MAPEL) */
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex-wrap gap-4 select-none">
                    <div className="text-left">
                      <h4 className="text-indigo-950 font-black text-xs uppercase tracking-wider">
                        {kbmJournalSubTab === 'binaan' 
                          ? `Jurnal Kegiatan Belajar Mengajar (KBM) Kelas Binaan ${currentTeacher.className}`
                          : 'Jurnal KBM Mengajar di Kelas Lain'
                        }
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5 font-semibold">
                        {kbmJournalSubTab === 'binaan'
                          ? `Berikut adalah rincian materi pembelajaran dan administrasi presensi harian per jam mata pelajaran dari guru bidang studi di kelas binaan Anda (${currentTeacher.className}).`
                          : 'Berikut adalah rincian materi pelajaran yang Anda ampu sebagai guru mata pelajaran di kelas lain.'
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchTeachingJournals}
                        disabled={loadingJournals}
                        className="px-3.5 py-2 border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all bg-white/70"
                      >
                        🔄 {loadingJournals ? 'Memuat...' : 'Muat Ulang'}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddJournalModal}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-700 transition-all font-sans"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Isi Jurnal Mengajar</span>
                      </button>
                      {kbmJournalSubTab === 'binaan' && binaanJournals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompiledJournalPrintType('binaan');
                            setCompiledJournalPrint(true);
                            // Trigger native browser printing immediately
                            setTimeout(() => {
                              window.print();
                            }, 350);
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-700 transition-all"
                        >
                          <Printer size={13} strokeWidth={2.5} />
                          <span>Cetak Buku KBM Kelas</span>
                        </button>
                      )}
                      {kbmJournalSubTab === 'kelas_lain' && kelasLainJournals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompiledJournalPrintType('kelas_lain');
                            setCompiledJournalPrint(true);
                            // Trigger native browser printing immediately
                            setTimeout(() => {
                              window.print();
                            }, 350);
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-700 transition-all"
                        >
                          <Printer size={13} strokeWidth={2.5} />
                          <span>Cetak Buku Jurnal Mengajar di Kelas Lain</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub Tab Switcher for KBM Journal Types */}
                  <div className="flex border-b border-slate-200 select-none mb-2">
                    <button
                      type="button"
                      onClick={() => setKbmJournalSubTab('binaan')}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                        kbmJournalSubTab === 'binaan'
                          ? 'border-indigo-600 text-indigo-600 font-extrabold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Home size={14} />
                      <span>Jurnal KBM Kelas Binaan ({binaanJournals.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKbmJournalSubTab('kelas_lain')}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                        kbmJournalSubTab === 'kelas_lain'
                          ? 'border-indigo-600 text-indigo-600 font-extrabold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <BookOpen size={14} />
                      <span>Jurnal Mengajar di Kelas Lain ({kelasLainJournals.length})</span>
                    </button>
                  </div>

                  {(() => {
                    const currentJournals = kbmJournalSubTab === 'binaan' ? binaanJournals : kelasLainJournals;

                    if (loadingJournals) {
                      return (
                        <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-3">
                          <Loader2 className="animate-spin text-indigo-600" size={26} />
                          <p className="text-xs">Menghubungkan ke pusat data KBM...</p>
                        </div>
                      );
                    }

                    if (currentJournals.length === 0) {
                      return (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl">
                          <BookOpen size={28} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-700">
                            {kbmJournalSubTab === 'binaan'
                              ? 'Belum ada Rekaman Jurnal Pembelajaran Kelas Binaan'
                              : 'Belum ada Rekaman Jurnal Mengajar Anda di Kelas Lain'
                            }
                          </p>
                          <p className="text-[11px] text-slate-440 max-w-sm mx-auto mt-0.5">
                            {kbmJournalSubTab === 'binaan'
                              ? `Guru bidang studi belum mengisi Jurnal KBM maupun absensi khusus jam pelajaran di kelas binaan Anda (${currentTeacher.className}).`
                              : 'Anda belum mencatatkan Jurnal KBM maupun presensi jam mata pelajaran yang Anda ampu di kelas lain.'
                            }
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-4">
                        {currentJournals
                          .sort((a,b) => b.date.localeCompare(a.date))
                          .map((journal) => {
                            const totalSiswa = journal.attendance?.length || 0;
                            const hadirCount = journal.attendance?.filter((a: any) => a.status === 'Hadir').length || 0;
                            const terlambatCount = journal.attendance?.filter((a: any) => a.status === 'Terlambat').length || 0;
                            const sakitCount = journal.attendance?.filter((a: any) => a.status === 'Sakit').length || 0;
                            const izinCount = journal.attendance?.filter((a: any) => a.status === 'Izin').length || 0;
                            const alpaCount = journal.attendance?.filter((a: any) => a.status === 'Alpa').length || 0;
                            const totalHadir = hadirCount + terlambatCount;
                            const totalAbsen = sakitCount + izinCount + alpaCount;

                            return (
                              <div key={journal.id} className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-grow min-w-0 flex gap-3 text-left">
                                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl hidden sm:block h-fit shrink-0">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex flex-col gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-extrabold text-sm text-slate-900">{journal.subject}</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {journal.teacherName}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                                        {new Date(journal.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-700 font-semibold leading-tight"><strong className="text-slate-400 font-extrabold text-[10px] uppercase">Materi KBM:</strong> {journal.topic}</p>
                                    {journal.notes && (
                                      <p className="text-[11px] text-slate-500 italic mt-0.5">Catatan: &ldquo;{journal.notes}&rdquo;</p>
                                    )}
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">Hadir: {totalHadir}</span>
                                      {totalAbsen > 0 && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-rose-50 text-rose-800 border border-rose-100 uppercase">Absen: {totalAbsen}</span>
                                      )}
                                      {sakitCount > 0 && <span className="px-1 py-0.5 text-[8.5px] font-semibold text-amber-600 font-mono">Sakit: {sakitCount}</span>}
                                      {izinCount > 0 && <span className="px-1 py-0.5 text-[8.5px] font-semibold text-blue-600 font-mono">Izin: {izinCount}</span>}
                                      {alpaCount > 0 && <span className="px-1 py-0.5 text-[8.5px] font-bold text-rose-600 font-mono">Alpa: {alpaCount}</span>}
                                    </div>

                                    {/* List of absent students */}
                                    {(() => {
                                      const nonPresent = (journal.attendance || []).filter((a: any) => a.status !== 'Hadir' && a.status !== 'Terlambat');
                                      if (nonPresent.length > 0) {
                                        return (
                                          <div className="mt-2 text-xs text-slate-700 leading-relaxed bg-rose-50/20 border border-slate-150 rounded-xl p-2.5 max-w-xl">
                                            <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider block mb-1">Daftar Siswa Tidak Hadir:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                              {nonPresent.map((a: any, i: number) => (
                                                <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                  a.status === 'Sakit' ? 'bg-amber-50 text-amber-850 border-amber-100' :
                                                  a.status === 'Izin' ? 'bg-sky-50 text-sky-850 border-sky-100' :
                                                  'bg-rose-50 text-rose-850 border-rose-100'
                                                }`}>
                                                  {a.studentName} ({a.status}{a.notes ? `: ${a.notes}` : ''})
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="mt-2 text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50/40 border border-emerald-100 rounded-lg p-1.5 w-fit px-2.5">
                                            ✓ Nihil (Semua siswa hadir)
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start md:self-center flex-wrap select-none">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditJournalModal(journal)}
                                    className="px-3 py-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Edit size={13} className="text-amber-600" />
                                    <span>Edit Jurnal</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm("Apakah Anda yakin ingin menghapus jurnal pembelajaran ini?")) {
                                        try {
                                          const res = await fetch(`/api/teaching-journals/${journal.id}`, { method: 'DELETE' });
                                          if (res.ok) {
                                            setNotifMsg({ type: 'success', text: 'Jurnal pembelajaran berhasil dihapus.' });
                                            fetchTeachingJournals();
                                          } else {
                                            setNotifMsg({ type: 'error', text: 'Gagal menghapus jurnal.' });
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          setNotifMsg({ type: 'error', text: 'Koneksi gagal saat menghapus jurnal.' });
                                        }
                                      }
                                    }}
                                    className="p-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-xl transition-all flex items-center shadow-2xs cursor-pointer"
                                    title="Hapus Jurnal"
                                  >
                                    <Trash2 size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedJournalToPrint(journal);
                                      setTimeout(() => {
                                        window.print();
                                      }, 350);
                                    }}
                                    className="px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <Printer size={13} />
                                    <span>Cetak Jurnal PDF</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'rekap_absensi' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-sm">Rekapitulasi Presensi Kehadiran Siswa</h3>
                  <p className="text-slate-450 text-xs mt-0.5">Pantau rasio persentase absensi kelas {currentTeacher.className} pada rentang waktu terpilih.</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={downloadExcelRekap}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-emerald-200 cursor-pointer"
                  >
                    <Download size={14} />
                    Unduh Laporan Excel (.xls)
                  </button>
                </div>
              </div>

              {/* Date pickers for rekapitulasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl col-span-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={rekapStartDate}
                    onChange={(e) => setRekapStartDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-250 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={rekapEndDate}
                    onChange={(e) => setRekapEndDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-250 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {rekapData.length === 0 ? (
                <div className="p-12 text-center text-slate-450 text-xs">
                  Tidak ada data siswa untuk kelas ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">No</th>
                        <th className="py-2.5 px-3">NIS</th>
                        <th className="py-2.5 px-3">Nama Siswa</th>
                        <th className="py-2.5 px-3 text-center text-emerald-700 bg-emerald-50/50">Hadir</th>
                        <th className="py-2.5 px-3 text-center text-purple-700 bg-purple-50/50">Terlambat</th>
                        <th className="py-2.5 px-3 text-center text-amber-700 bg-amber-50/50">Sakit</th>
                        <th className="py-2.5 px-3 text-center text-blue-700 bg-blue-50/50">Izin</th>
                        <th className="py-2.5 px-3 text-center text-rose-700 bg-rose-50/50">Alpa</th>
                        <th className="py-2.5 px-3 text-center">Total Hari</th>
                        <th className="py-2.5 px-3 text-right">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rekapData.map((row) => (
                        <tr key={row.student.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="py-2 px-3 text-center font-semibold text-slate-400">{row.index}</td>
                          <td className="py-2 px-3 font-mono text-slate-500 font-bold">{row.student.nis}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.student.name}</td>
                          <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/20 font-bold">{row.hadir}</td>
                          <td className="py-2 px-3 text-center text-purple-800 bg-purple-50/20 font-bold">{row.terlambat}</td>
                          <td className="py-2 px-3 text-center text-amber-800 bg-amber-50/20 font-bold">{row.sakit}</td>
                          <td className="py-2 px-3 text-center text-blue-800 bg-blue-50/20 font-bold">{row.izin}</td>
                          <td className="py-2 px-3 text-center text-rose-800 bg-rose-50/20 font-bold">{row.alpa}</td>
                          <td className="py-2 px-3 text-center text-slate-500 font-medium">{row.total}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              row.rate >= 90 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : row.rate >= 75 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {row.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'finance' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left p-6">
              <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-sm">Monitoring Administrasi & Keuangan Kelas</h3>
                  <p className="text-slate-450 text-xs mt-0.5">Informasi rincian saldo tabungan, tunggakan tagihan SPP, dan iuran lain-lain murid untuk sinkronisasi pengingat (Reminder).</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExportSppExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shadow-xs uppercase tracking-wider font-sans"
                      title="Export Rekap SPP Kelas ke Excel"
                    >
                      <Download size={12} /> Rekap SPP 📊
                    </button>
                    <button
                      type="button"
                      onClick={handleExportMiscExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shadow-xs uppercase tracking-wider font-sans"
                      title="Export Rekap Iuran Lain-lain ke Excel"
                    >
                      <Download size={12} /> Rekap Iuran 📊
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSavingsExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shadow-xs uppercase tracking-wider font-sans"
                      title="Export Rekap Tabungan Kelas ke Excel"
                    >
                      <Download size={12} /> Rekap Tabungan 📊
                    </button>
                  </div>
                  {/* Search input inside Tab */}
                  <div className="relative w-full sm:w-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama atau NIS siswa..."
                      value={financeSearch}
                      onChange={(e) => setFinanceSearch(e.target.value)}
                      className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Class Aggregate widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50/55 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest">Total Tabungan Kelas</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Wallet size={16} className="text-emerald-600" />
                    <span className="block text-base font-black text-slate-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(classFinanceStats.totalSavings)}
                    </span>
                  </div>
                </div>

                <div className="bg-rose-50/55 border border-rose-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-rose-700 uppercase tracking-widest">Tunggakan SPP Kelas</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <CreditCard size={16} className="text-rose-600" />
                    <span className="block text-base font-black text-rose-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(classFinanceStats.totalUnpaidSpp)}
                    </span>
                  </div>
                </div>

                <div className="bg-indigo-50/55 border border-indigo-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-indigo-700 uppercase tracking-widest">Tunggakan Lain-lain Kelas</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <CreditCard size={16} className="text-indigo-600" />
                    <span className="block text-base font-black text-indigo-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(classFinanceStats.totalUnpaidMisc)}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/55 border border-amber-100 rounded-xl p-4 flex flex-col justify-between">
                  <span className="block text-[9px] font-extrabold text-amber-700 uppercase tracking-widest">Siswa Menunggak SPP / Iuran</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Users size={16} className="text-amber-600" />
                    <span className="block text-base font-black text-slate-800">
                      {classFinanceStats.totalInArrearsCount} / {classFinanceStats.totalInArrearsMiscCount} <span className="text-xs font-normal text-slate-500">Siswa</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Students administration table */}
              {(() => {
                const filteredClassStudents = classStudents.filter(
                  s => s.name.toLowerCase().includes(financeSearch.toLowerCase()) || 
                       s.nis.includes(financeSearch)
                );

                if (filteredClassStudents.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-450 text-xs">
                      Tidak ada data siswa yang cocok dengan filter pencarian.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Desktop View (Table) */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3">Nama Lengkap & NIS</th>
                            <th className="py-2.5 px-3">Saldo Tabungan</th>
                            <th className="py-2.5 px-3">Status Tagihan SPP (Unpaid)</th>
                            <th className="py-2.5 px-3">Tagihan Lain-lain (Misc)</th>
                            <th className="py-2.5 px-3">Bulan SPP Lunas</th>
                            <th className="py-2.5 px-3 text-right">Tindakan Pengingat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredClassStudents.map((student) => {
                            const overdueBills = bills.filter(b => b.studentId === student.id && b.status === 'unpaid' && isSppBillOverdue(b));
                            const totalUnpaid = overdueBills.reduce((sum, b) => sum + b.amount, 0);
                            const paidBills = bills.filter(b => b.studentId === student.id && b.status === 'paid');

                            const studentMiscBills = (miscBills || []).filter(b => b.studentId === student.id);
                            const unpaidMisc = studentMiscBills.filter(b => b.status !== 'paid');
                            const totalUnpaidMisc = unpaidMisc.reduce((sum, b) => sum + b.amount, 0);

                            return (
                              <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-800">{student.name}</div>
                                  <div className="text-[10px] text-slate-400 font-bold font-mono">NIS: {student.nis}</div>
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-700">
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(student.savingsBalance || 0)}
                                </td>
                                <td className="py-3 px-3">
                                  {overdueBills.length === 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                      <CheckCircle size={10} /> Lunas SPP
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full w-max animate-pulse">
                                        ⚠️ Menunggak SPP
                                      </span>
                                      <span className="font-mono text-rose-700 font-semibold text-[10.5px]">
                                        Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalUnpaid)}
                                      </span>
                                      <span className="text-[9px] text-rose-500 font-medium">
                                        Tunggakan: {overdueBills.map(b => `${b.month} ${b.year}`).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {unpaidMisc.length === 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                      <CheckCircle size={10} /> Lunas Iuran
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-max">
                                        ⚠️ {unpaidMisc.length} Tertunda
                                      </span>
                                      <span className="font-mono text-indigo-700 font-semibold text-[10.5px]">
                                        Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalUnpaidMisc)}
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-medium truncate max-w-[150px]" title={unpaidMisc.map(b => b.title).join(', ')}>
                                        Iuran: {unpaidMisc.map(b => b.title).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {paidBills.length === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                      {paidBills.map(b => (
                                        <span key={b.id} className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded-md">
                                          ✓ {b.month} {b.year}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {(overdueBills.length > 0 || unpaidMisc.length > 0) ? (
                                    <button
                                      type="button"
                                      onClick={() => copyWaReminder(student, overdueBills, unpaidMisc)}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold shadow-xs transition-all cursor-pointer ${
                                        copiedStudentId === student.id
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse'
                                          : 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-150 text-indigo-700 hover:text-indigo-850'
                                      }`}
                                    >
                                      {copiedStudentId === student.id ? (
                                        <>
                                          <Check size={12} className="text-emerald-600 font-black" />
                                          Reminder Tersalin!
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={12} />
                                          Salin WA Reminder
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium italic">Tidak ada tunggakan</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View (Bento Cards to avoid scroll completely) */}
                    <div className="block md:hidden space-y-4">
                      {filteredClassStudents.map((student) => {
                        const overdueBills = bills.filter(b => b.studentId === student.id && b.status === 'unpaid' && isSppBillOverdue(b));
                        const totalUnpaid = overdueBills.reduce((sum, b) => sum + b.amount, 0);
                        const paidBills = bills.filter(b => b.studentId === student.id && b.status === 'paid');

                        const studentMiscBills = (miscBills || []).filter(b => b.studentId === student.id);
                        const unpaidMisc = studentMiscBills.filter(b => b.status !== 'paid');
                        const totalUnpaidMisc = unpaidMisc.reduce((sum, b) => sum + b.amount, 0);

                        return (
                          <div key={student.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                            {/* Header: Name and NIS */}
                            <div className="flex justify-between items-start gap-2 pb-2.5 border-b border-rose-100">
                              <div>
                                <div className="font-extrabold text-slate-800 text-xs sm:text-sm">{student.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">NIS: {student.nis}</div>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                {overdueBills.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    ✓ Lunas SPP
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                                    ⚠️ Tunggakan SPP
                                  </span>
                                )}
                                {unpaidMisc.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    ✓ Lunas Iuran
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                    ⚠️ {unpaidMisc.length} Iuran Tertunda
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3.5 text-left">
                              <div>
                                <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Saldo Tabungan</span>
                                <span className="block font-mono font-bold text-xs text-slate-700 mt-1">
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(student.savingsBalance || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Total Belum Bayar</span>
                                {overdueBills.length === 0 && unpaidMisc.length === 0 ? (
                                  <span className="block font-mono font-bold text-xs text-emerald-600 mt-1">Rp 0</span>
                                ) : (
                                  <span className="block font-mono font-bold text-xs text-rose-700 mt-1">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalUnpaid + totalUnpaidMisc)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Month details if overdue */}
                            {overdueBills.length > 0 && (
                              <div className="bg-rose-50/40 border border-rose-100/60 rounded-lg p-2 text-left">
                                <span className="block text-[8px] font-black text-rose-500 uppercase tracking-wider mb-0.5">Detail Bulan Menunggak:</span>
                                <p className="text-[9.5px] text-rose-650 font-semibold leading-relaxed">
                                  {overdueBills.map(b => `${b.month} ${b.year}`).join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Unpaid Misc details if overdue */}
                            {unpaidMisc.length > 0 && (
                              <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-lg p-2 text-left">
                                <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-wider mb-0.5">Iuran Lain-lain Belum Lunas:</span>
                                <p className="text-[9.5px] text-indigo-650 font-semibold leading-relaxed">
                                  {unpaidMisc.map(b => `${b.title} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(b.amount)})`).join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Paid Months Section */}
                            <div>
                              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Bulan SPP Lunas:</span>
                              {paidBills.length === 0 ? (
                                <span className="text-[10px] text-slate-400 italic">Belum ada bulan lunas</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {paidBills.map(b => (
                                    <span key={b.id} className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-emerald-700 bg-emerald-50/80 border border-emerald-150 px-1.5 py-0.5 rounded-md">
                                      ✓ {b.month} {b.year}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action WA Reminder */}
                            {(overdueBills.length > 0 || unpaidMisc.length > 0) && (
                              <div className="mt-1 pt-2.5 border-t border-slate-150">
                                <button
                                  type="button"
                                  onClick={() => copyWaReminder(student, overdueBills, unpaidMisc)}
                                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer ${
                                    copiedStudentId === student.id
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                                      : 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-150 text-indigo-700 hover:text-indigo-850'
                                  }`}
                                >
                                  {copiedStudentId === student.id ? (
                                    <>
                                      <Check size={12} className="text-emerald-600 font-bold" />
                                      WA Reminder Tersalin!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      Salin Pesan WA Reminder
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeSubTab === 'perkembangan' && (
            <div className="flex flex-col gap-6 text-left">
              {selectedJournalTab === 'menu' ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                        <span>📋</span> Sistem Jurnal & Layanan Kerja Wali Kelas
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Pencatatan perkembangan, ketertiban, bimbingan, penyebaran informasi, dan aktivitas koordinasi kelas {currentTeacher.className}.
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                      Kelas: {currentTeacher.className} • Wali: {currentTeacher.name}
                    </div>
                  </div>

                  {/* Visual list of 5 Journals resembling the requested screenshot */}
                  <div className="mt-6 flex flex-col divide-y divide-slate-150 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/20">
                    
                    {/* JOURNAL 1: Catatan Perkembangan Siswa */}
                    <div className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-5 items-start">
                      <div className="w-11 h-11 rounded-xl bg-orange-100/80 text-orange-600 flex items-center justify-center font-bold text-xl shrink-0 mt-1">
                        📈
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => setSelectedJournalTab('development')}>
                            Jurnal Catatan Perkembangan Siswa
                          </h4>
                          <span className="bg-green-600 text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded tracking-wide font-sans">
                            Wali Kelas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
                          Mencatat perkembangan akademik, sikap, prestasi, minat, serta catatan kompetensi khusus siswa kelas secara periodik. Dilengkapi fitur rekap print per siswa.
                        </p>
                      </div>
                      <div className="w-full md:w-56 shrink-0 text-slate-600 text-[11px] leading-relaxed select-none">
                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                          <li>Nama siswa & NIS</li>
                          <li>Kategori (Sikap/Akademik)</li>
                          <li>Saran/Uraian perkembangan</li>
                          <li><strong>Cetak Gabungan Per Siswa</strong></li>
                        </ul>
                      </div>
                      <div className="shrink-0 mt-1">
                        <button
                          onClick={() => setSelectedJournalTab('development')}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Masuk Jurnal →
                        </button>
                      </div>
                    </div>

                    {/* JOURNAL 2: Pelanggaran & Tindak Lanjut */}
                    <div className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-5 items-start">
                      <div className="w-11 h-11 rounded-xl bg-amber-100/85 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0 mt-1">
                        ⚠️
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => setSelectedJournalTab('infraction')}>
                            Jurnal Pelanggaran & Tindak Lanjut
                          </h4>
                          <span className="bg-green-600 text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded tracking-wide font-sans">
                            Wali Kelas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
                          Mencatat pelanggaran tata tertib sekolah, detail waktu/lokasi peristiwa, sanksi atau pembinaan yang diberikan, serta memantau status penyelesaiannya.
                        </p>
                      </div>
                      <div className="w-full md:w-56 shrink-0 text-slate-600 text-[11px] leading-relaxed select-none">
                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                          <li>Jenis Pelanggaran</li>
                          <li>Tanggal, Waktu, Tempat</li>
                          <li>Tindak Lanjut / Sanksi / Pembinaan</li>
                          <li>Status Penyelesaian</li>
                        </ul>
                      </div>
                      <div className="shrink-0 mt-1">
                        <button
                          onClick={() => setSelectedJournalTab('infraction')}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Masuk Jurnal →
                        </button>
                      </div>
                    </div>

                    {/* JOURNAL 3: Bimbingan & Konseling */}
                    <div className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-5 items-start">
                      <div className="w-11 h-11 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0 mt-1">
                        👥
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => setSelectedJournalTab('counseling')}>
                            Jurnal Bimbingan & Konseling
                          </h4>
                          <span className="bg-green-600 text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded tracking-wide font-sans">
                            Wali Kelas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
                          Medokumentasikan jalannya bimbingan atau konseling personal yang diberikan kepada siswa bermasalah maupun konsultasi regulasi belajarnya.
                        </p>
                      </div>
                      <div className="w-full md:w-56 shrink-0 text-slate-600 text-[11px] leading-relaxed select-none">
                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                          <li>Nama Siswa Bimbingan</li>
                          <li>Topik / Permasalahan Utama</li>
                          <li>Tindakan / Solusi Solutif</li>
                          <li>Hasil dan Tindak Lanjut Nyata</li>
                        </ul>
                      </div>
                      <div className="shrink-0 mt-1">
                        <button
                          onClick={() => setSelectedJournalTab('counseling')}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Masuk Jurnal →
                        </button>
                      </div>
                    </div>

                    {/* JOURNAL 4: Informasi & Pengumuman Kelas */}
                    <div className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-5 items-start">
                      <div className="w-11 h-11 rounded-xl bg-teal-100/80 text-teal-600 flex items-center justify-center font-bold text-xl shrink-0 mt-1">
                        📢
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => setSelectedJournalTab('announcement')}>
                            Jurnal Informasi & Pengumuman Kelas
                          </h4>
                          <span className="bg-green-600 text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded tracking-wide font-sans">
                            Wali Kelas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
                          Menyimpan dan mempublikasi pengumuman penting/studi wisata/edukasi bagi siswa dewan kelas maupun informasi koordinasi langsung dengan wali murid.
                        </p>
                      </div>
                      <div className="w-full md:w-56 shrink-0 text-slate-600 text-[11px] leading-relaxed select-none">
                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                          <li>Judul & Isi Informasi Ringkas</li>
                          <li>Tanggal Efektif/Batas Kirim</li>
                          <li>Target Penerima (Siswa/Ortu/Semua)</li>
                          <li>Status Dibaca & Konfirmasi</li>
                        </ul>
                      </div>
                      <div className="shrink-0 mt-1">
                        <button
                          onClick={() => setSelectedJournalTab('announcement')}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Masuk Jurnal →
                        </button>
                      </div>
                    </div>

                    {/* JOURNAL 5: Rapat / Koordinasi */}
                    <div className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-5 items-start">
                      <div className="w-11 h-11 rounded-xl bg-yellow-100/90 text-yellow-700 flex items-center justify-center font-bold text-xl shrink-0 mt-1">
                        📁
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => setSelectedJournalTab('meeting')}>
                            Jurnal Rapat / Koordinasi
                          </h4>
                          <span className="bg-green-600 text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded tracking-wide font-sans">
                            Wali Kelas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
                          Mencatat notulensi rapat paguyuban, kordinasi komite sekolah, maupun rapat koordinasi dewan guru kelas untuk melacak kesepakatan eksternal.
                        </p>
                      </div>
                      <div className="w-full md:w-56 shrink-0 text-slate-600 text-[11px] leading-relaxed select-none">
                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                          <li>Jenis Rapat (Ortu, Guru, Komite, dll)</li>
                          <li>Tanggal & Jumlah Peserta</li>
                          <li>Agenda Utama & Hasil Keputusan</li>
                          <li>Rencana Tindak Lanjut Rapat</li>
                        </ul>
                      </div>
                      <div className="shrink-0 mt-1">
                        <button
                          onClick={() => setSelectedJournalTab('meeting')}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Masuk Jurnal →
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ) : null}

              {/* SECTION 1 WORKSPACE: Catatan Perkembangan Siswa */}
              {selectedJournalTab === 'development' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <button
                        onClick={() => setSelectedJournalTab('menu')}
                        className="mb-2 px-2.5 py-1 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Kembali ke Hub Jurnal Wali Kelas</span>
                      </button>
                      <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mt-1">
                        <span className="p-1 px-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs">📈</span>
                        Jurnal Catatan Perkembangan Siswa
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Mencatat perkembangan akademik, sikap, prestasi, minat, serta catatan penting khusus secara terpadu.
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 select-none">
                      Wali Kelas: {currentTeacher.name} ({currentTeacher.className})
                    </div>
                  </div>

                  {/* COMPOSITE PRINT PER SISWA BANNER */}
                  <div className="mt-5 bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black text-orange-905 flex items-center gap-1.5">
                        🖨️ Cetak Jurnal Gabungan per Siswa
                      </h4>
                      <p className="text-[11px] text-orange-700 mt-1 leading-relaxed">
                        Pilih nama siswa dibawah ini untuk mengompilasi seluruh catatan jurnal perkembangan bersangkutan, memformat, dan mengunduh laporan rekap resmi secara instan.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-1 md:mt-0">
                      <select
                        value={printTargetStudentId}
                        onChange={(e) => setPrintTargetStudentId(e.target.value)}
                        className="bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full md:w-48 shadow-xxs"
                      >
                        <option value="">-- Pilih Nama Siswa --</option>
                        {classStudents.sort((a,b)=>a.name.localeCompare(b.name)).map(student => (
                          <option key={student.id} value={student.id}>{student.name} ({student.nis})</option>
                        ))}
                      </select>
                      <button
                        onClick={handlePrintCombinedPerStudent}
                        disabled={!printTargetStudentId}
                        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Printer size={12} />
                        <span>Cetak Laporan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                    {/* Form Perkembangan */}
                    <form onSubmit={handleSaveDevLog} className="lg:col-span-5 flex flex-col gap-4 border border-slate-200 bg-slate-50/50 p-5 rounded-2xl shadow-inner">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block pb-1 border-b border-slate-200">
                        📝 Buat Catatan Jurnal Baru
                      </span>

                      {/* Siswa */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nama Siswa Bimbingan</label>
                        <select
                          value={selectedLogStudentId}
                          onChange={(e) => setSelectedLogStudentId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none cursor-pointer"
                          required
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {classStudents
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(student => (
                              <option key={student.id} value={student.id}>
                                {student.name} ({student.nis})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Tanggal & Kategori */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tanggal</label>
                          <input
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            max={todayStr}
                            required
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Kategori Perkembangan</label>
                          <select
                            value={logCategory}
                            onChange={(e) => setLogCategory(e.target.value as any)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none cursor-pointer"
                          >
                            <option value="Akademik">Akademik</option>
                            <option value="Sikap">Sikap / Perilaku</option>
                            <option value="Prestasi">Prestasi</option>
                            <option value="Minat">Minat & Bakat</option>
                            <option value="Catatan Khusus">Catatan Khusus</option>
                          </select>
                        </div>
                      </div>

                      {/* Rincian Notes */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Uraian / Rincian Catatan Jurnal</label>
                        <textarea
                          value={logNotes}
                          onChange={(e) => setLogNotes(e.target.value)}
                          placeholder="Uraikan catatan perkembangan, prestasi, atau evaluasi peristiwa..."
                          rows={4}
                          required
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none leading-relaxed"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingLog}
                        className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {savingLog ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} className="stroke-[2.5px]" />
                            <span>Simpan Jurnal Perkembangan</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Historical Logs List */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                      {/* Search & Filter bar perkembangan */}
                      <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={devLogSearch}
                            onChange={(e) => setDevLogSearch(e.target.value)}
                            placeholder="Cari nama siswa..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                        <select
                          value={devLogFilterCategory}
                          onChange={(e) => setDevLogFilterCategory(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="All">Semua Kategori</option>
                          <option value="Akademik">Akademik</option>
                          <option value="Sikap">Sikap</option>
                          <option value="Prestasi">Prestasi</option>
                          <option value="Minat">Minat</option>
                          <option value="Catatan Khusus">Catatan Khusus</option>
                        </select>
                      </div>

                      {loadingDevLogs ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="animate-spin" size={24} />
                          <span className="text-xs font-bold">Memuat riwayat...</span>
                        </div>
                      ) : filteredDevLogs.length === 0 ? (
                        <div className="p-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center flex flex-col items-center justify-center gap-2 select-none">
                          <span className="text-2xl">📭</span>
                          <h4 className="text-slate-800 font-bold text-xs">Belum ada catatan ditemukan</h4>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                          {filteredDevLogs.map((log) => {
                            const badgeClasses: Record<string, string> = {
                              'Akademik': 'bg-blue-50 text-blue-700 border-blue-200',
                              'Sikap': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              'Prestasi': 'bg-amber-50 text-amber-700 border-amber-200',
                              'Minat': 'bg-purple-50 text-purple-700 border-purple-200',
                              'Catatan Khusus': 'bg-rose-50 text-rose-700 border-rose-200'
                            };
                            return (
                              <div key={log.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all flex flex-col gap-2 relative shadow-xxs">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-700 text-xs">
                                      {log.studentName.slice(0, 2)}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-slate-900">{log.studentName}</h4>
                                      <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5">Kelas {log.className} • {log.date}</span>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full border text-[8.5px] font-extrabold uppercase ${badgeClasses[log.category] || 'bg-slate-50'}`}>
                                    {log.category}
                                  </span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                                  &ldquo;{log.notes}&rdquo;
                                </p>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 pb-1 mt-1">
                                  <button
                                    onClick={() => printSingleDevelopmentLog(log, schoolIdentity, currentTeacher.name)}
                                    className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-[10px] rounded font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer size={11} /> Cetak
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDevLog(log.id)}
                                    className="px-2 py-1 border border-rose-100 hover:bg-rose-50 text-[10px] rounded font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 size={11} /> Hapus
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2 WORKSPACE: Jurnal Pelanggaran & Tindak Lanjut */}
              {selectedJournalTab === 'infraction' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <button
                        onClick={() => setSelectedJournalTab('menu')}
                        className="mb-2 px-2.5 py-1 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Kembali ke Hub Jurnal Wali Kelas</span>
                      </button>
                      <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mt-1">
                        <span className="p-1 px-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs">⚠️</span>
                        Jurnal Pelanggaran & Tindak Lanjut Siswa
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Mendata pelanggaran tata tertib harian kelas beserta poin pelanggaran harian serta skema bimbingan kedisiplinan wali kelas.
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 select-none">
                      Kelas: {currentTeacher.className}
                    </div>
                  </div>

                  {/* COMPOSITE PRINT PER SISWA BANNER */}
                  <div className="mt-5 bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                        🖨️ Cetak Jurnal Gabungan per Siswa
                      </h4>
                      <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                        Pilih nama siswa di bawah ini untuk mengompilasi seluruh catatan jurnal gabungan perkembangan, pelanggaran, bimbingan, pengumuman, dan rapat secara instan.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-1 md:mt-0">
                      <select
                        value={printTargetStudentId}
                        onChange={(e) => setPrintTargetStudentId(e.target.value)}
                        className="bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full md:w-48 shadow-xxs"
                      >
                        <option value="">-- Pilih Nama Siswa --</option>
                        {classStudents.sort((a,b)=>a.name.localeCompare(b.name)).map(student => (
                          <option key={student.id} value={student.id}>{student.name} ({student.nis})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handlePrintCombinedPerStudent}
                        disabled={!printTargetStudentId}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Printer size={12} />
                        <span>Cetak Laporan</span>
                      </button>
                    </div>
                  </div>

                  {/* Toggle referensi aturan panel */}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRuleCrudPanel(!showRuleCrudPanel);
                        fetchInfractionRules();
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{showRuleCrudPanel ? "❌ Tutup Rubrik Poin CRUD" : "⚙️ Kelola Rubrik Poin Pelanggaran (CRUD)"}</span>
                    </button>
                  </div>

                  {/* Panel CRUD Master Aturan Pelanggaran */}
                  {showRuleCrudPanel && (
                    <div className="mt-4 border border-rose-200 bg-rose-50/20 p-5 rounded-2xl shadow-xs flex flex-col gap-4">
                      <div className="flex justify-between items-center pb-2 border-b border-rose-100">
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          ⚙️ Konfigurasi Rubrik & Referensi Poin Pelanggaran (CRUD)
                        </h4>
                        <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-bold">
                          {infractionRules.length} Aturan Aktif
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        {/* Form Tambah/Edit Aturan */}
                        <form onSubmit={handleSaveRule} className="md:col-span-4 bg-white border border-slate-100 p-4 rounded-xl flex flex-col gap-3 shadow-2xs">
                          <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest block border-b border-slate-100 pb-1">
                            {editingRuleId ? "✏️ Edit Aturan" : "➕ Tambah Referensi Baru"}
                          </span>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase">Deskripsi Pelanggaran</label>
                            <textarea
                              value={ruleNameInput}
                              onChange={(e) => setRuleNameInput(e.target.value)}
                              placeholder="Misal: Tidak memakai atribut upacara lengkap..."
                              rows={2}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase">Bobot Poin</label>
                              <input
                                type="number"
                                value={rulePointsInput}
                                onChange={(e) => setRulePointsInput(Number(e.target.value) || 0)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                min={1}
                                required
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase">Tingkatan</label>
                              <select
                                value={ruleCategoryInput}
                                onChange={(e) => setRuleCategoryInput(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                              >
                                <option value="Ringan">Ringan</option>
                                <option value="Sedang">Sedang</option>
                                <option value="Berat">Berat</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <button
                              type="submit"
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {editingRuleId ? "Simpan Perubahan" : "Simpan Aturan"}
                            </button>
                            {editingRuleId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRuleId(null);
                                  setRuleNameInput('');
                                  setRulePointsInput(5);
                                  setRuleCategoryInput('Ringan');
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </form>

                        {/* Tabel / List Referensi */}
                        <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black text-[9px]">
                                <th className="p-2.5 pl-4">Deskripsi Pelanggaran / Aturan</th>
                                <th className="p-2.5 text-center">Poin</th>
                                <th className="p-2.5 text-center">Tingkat</th>
                                <th className="p-2.5 text-right pr-4">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loadingRules ? (
                                <tr>
                                  <td colSpan={4} className="p-8 text-center text-slate-400">Memuat acuan...</td>
                                </tr>
                              ) : infractionRules.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-8 text-center text-slate-400">Belum ada acuan aturan.</td>
                                </tr>
                              ) : (
                                infractionRules.map(rule => (
                                  <tr key={rule.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                    <td className="p-2.5 pl-4 font-medium text-slate-800 max-w-xs truncate">{rule.name}</td>
                                    <td className="p-2.5 text-center font-bold text-rose-600 font-mono">{rule.points} pt</td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                        rule.category === 'Ringan' ? 'bg-slate-100 text-slate-600' :
                                        rule.category === 'Sedang' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-red-50 text-red-600 border border-red-100'
                                      }`}>
                                        {rule.category}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-right pr-4 shrink-0 whitespace-nowrap font-bold">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingRuleId(rule.id);
                                          setRuleNameInput(rule.name);
                                          setRulePointsInput(rule.points);
                                          setRuleCategoryInput(rule.category);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 font-extrabold mr-2 cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer"
                                      >
                                        Hapus
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                    {/* Form Input Pelanggaran */}
                    <form onSubmit={handleSaveInfraction} className="lg:col-span-5 flex flex-col gap-4 border border-slate-200 bg-slate-50/50 p-5 rounded-2xl shadow-inner">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block pb-1 border-b border-slate-200">
                        🚨 Catat Kejadian Pelanggaran & Poin
                      </span>

                      {/* Siswa */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nama Siswa Terkait</label>
                        <select
                          value={selectedInfStudentId}
                          onChange={(e) => setSelectedInfStudentId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                          required
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {classStudents.sort((a,b)=>a.name.localeCompare(b.name)).map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                          ))}
                        </select>
                      </div>

                      {/* Tanggal & Waktu */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tanggal</label>
                          <input
                            type="date"
                            value={infDate}
                            onChange={(e) => setInfDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none h-8.5"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Waktu (Jam)</label>
                          <input
                            type="text"
                            value={infTime}
                            onChange={(e) => setInfTime(e.target.value)}
                            placeholder="07:15"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none h-8.5"
                            required
                          />
                        </div>
                      </div>

                      {/* Lokasi Kejadian */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tempat / Lokasi Kejadian</label>
                        <input
                          type="text"
                          value={infLocation}
                          onChange={(e) => setInfLocation(e.target.value)}
                          placeholder="Contoh: Kelas 7-A, Kantin, Gerbang Depan..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                          required
                        />
                      </div>

                      {/* Referensi Aturan Pelanggaran */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pilih Acuan Tata Tertib</label>
                        <select
                          value={selectedRuleId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedRuleId(val);
                            if (val) {
                              const rule = infractionRules.find(r => r.id === val);
                              if (rule) {
                                setInfType(rule.name);
                                setInfPoints(rule.points);
                              }
                            } else {
                              setInfType('');
                              setInfPoints(0);
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Tulis Kustom / Tanpa Acuan --</option>
                          {infractionRules.map(rule => (
                            <option key={rule.id} value={rule.id}>
                              [{rule.category}] {rule.name} | {rule.points} pt
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Jenis Pelanggaran */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Jenis Pelanggaran / Kronik Perilaku</label>
                        <textarea
                          value={infType}
                          onChange={(e) => setInfType(e.target.value)}
                          placeholder="Sebutkan jenis tindakan pelanggaran siswa..."
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      {/* Batas Poin Penalti */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Alokasi Poin Pelanggaran</label>
                        <input
                          type="number"
                          value={infPoints}
                          onChange={(e) => setInfPoints(Number(e.target.value) || 0)}
                          placeholder="Contoh: 10, 25..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                          min={0}
                          required
                        />
                      </div>

                      {/* Tindak Lanjut Wali Kelas */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tindak Lanjut / Sanksi / Pembinaan</label>
                        <textarea
                          value={infAction}
                          onChange={(e) => setInfAction(e.target.value)}
                          placeholder="Uraikan tindak lanjut, sanksi logis, konsultasi BK, pemanggilan ortu, atau skema mediasi..."
                          rows={3}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      {/* Status Penyelesaian */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status Penyelesaian Tindak Lanjut</label>
                        <select
                          value={infResolution}
                          onChange={(e) => setInfResolution(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="Selesai">Selesai (Kasus Ditutup)</option>
                          <option value="Dalam Proses">Dalam Proses (Tindak Lanjut Lanjutan)</option>
                          <option value="Belum Selesai">Belum Selesai (Menunggu Tindakan)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={savingInfraction}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {savingInfraction ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        <span>Simpan Jurnal Pelanggaran</span>
                      </button>
                    </form>

                    {/* Riwayat Pelanggaran */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                      {/* Search & Filter status */}
                      <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={infSearch}
                            onChange={(e) => setInfSearch(e.target.value)}
                            placeholder="Cari pelanggaran atau nama siswa..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                        <select
                          value={infFilterStatus}
                          onChange={(e) => setInfFilterStatus(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="All">Semua Status</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Dalam Proses">Dalam Proses</option>
                          <option value="Belum Selesai">Belum Selesai</option>
                        </select>
                      </div>

                      {loadingInfractions ? (
                        <div className="py-12 text-center text-slate-400 font-bold text-xs">Memuat data...</div>
                      ) : filteredInfractionLogs.length === 0 ? (
                        <div className="p-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 font-bold text-xs">
                          Tidak ada catatan pelanggaran yang sesuai filter.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto">
                          {filteredInfractionLogs.map(log => {
                            const statusColorColors: Record<string, string> = {
                              'Selesai': 'bg-green-50 text-green-700 border-green-200',
                              'Dalam Proses': 'bg-yellow-50 text-yellow-700 border-yellow-200',
                              'Belum Selesai': 'bg-red-50 text-red-700 border-red-200'
                            };
                            const isReduction = log.points !== undefined && log.points < 0;
                            return (
                              <div key={log.id} className={`border border-slate-200 rounded-xl p-4 bg-white flex flex-col gap-2 shadow-xxs ${isReduction ? 'bg-emerald-50/5 border-emerald-250' : ''}`}>
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                      <span>{log.studentName}</span>
                                      {log.points !== undefined && (
                                        <span className={`px-2 py-0.5 text-[9px] rounded-full font-black font-mono shrink-0 border ${isReduction ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                          {isReduction ? 'Pengurangan:' : 'Poin:'} {log.points} pt
                                        </span>
                                      )}
                                    </h4>
                                    <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5">
                                      📍 {log.location} • {log.date} @ {log.time}
                                    </span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full border text-[8.5px] font-extrabold uppercase ${statusColorColors[log.resolutionStatus]}`}>
                                    {log.resolutionStatus}
                                  </span>
                                </div>
                                <div className="text-[11px] leading-relaxed mt-1 text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                                  <div>
                                    <span className={`text-[9.5px] font-bold block mb-0.5 ${isReduction ? 'text-emerald-700' : 'text-rose-600'}`}>
                                      {isReduction ? '❇️ ALASAN PENGURANGAN BK' : '⚠️ JENIS PELANGGARAN'}
                                    </span>
                                    {log.infractionType}
                                  </div>
                                  <div>
                                    <span className={`text-[9.5px] font-bold block mb-0.5 ${isReduction ? 'text-emerald-750' : 'text-emerald-600'}`}>
                                      {isReduction ? '🤝 STATUS APRESIASI' : '🤝 TINDAK LANJUT / SANKSI'}
                                    </span>
                                    {log.actionTaken}
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 pb-1 mt-1">
                                  <button
                                    onClick={() => printSingleInfractionLog(log, schoolIdentity, currentTeacher.name)}
                                    className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-[10px] rounded font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer size={11} /> Cetak
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInfraction(log.id)}
                                    className="px-2 py-1 border border-rose-100 hover:bg-rose-50 text-[10px] rounded font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 size={11} /> Hapus
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3 WORKSPACE: Jurnal Bimbingan & Konseling */}
              {selectedJournalTab === 'counseling' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <button
                        onClick={() => setSelectedJournalTab('menu')}
                        className="mb-2 px-2.5 py-1 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Kembali ke Hub Jurnal Wali Kelas</span>
                      </button>
                      <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mt-1">
                        <span className="p-1 px-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs">👥</span>
                        Jurnal Bimbingan & Konseling (BK)
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Merekam proses konseling interaktif wali kelas bersama siswa dewan bimbingan secara solutif.
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 select-none">
                      Kelas: {currentTeacher.className}
                    </div>
                  </div>

                  {/* COMPOSITE PRINT PER SISWA BANNER */}
                  <div className="mt-5 bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                        🖨️ Cetak Jurnal Gabungan per Siswa
                      </h4>
                      <p className="text-[11px] text-purple-700 mt-1 leading-relaxed">
                        Pilih nama siswa di bawah ini untuk mengompilasi seluruh catatan jurnal gabungan perkembangan, pelanggaran, bimbingan, pengumuman, dan rapat secara instan.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-1 md:mt-0">
                      <select
                        value={printTargetStudentId}
                        onChange={(e) => setPrintTargetStudentId(e.target.value)}
                        className="bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full md:w-48 shadow-xxs"
                      >
                        <option value="">-- Pilih Nama Siswa --</option>
                        {classStudents.sort((a,b)=>a.name.localeCompare(b.name)).map(student => (
                          <option key={student.id} value={student.id}>{student.name} ({student.nis})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handlePrintCombinedPerStudent}
                        disabled={!printTargetStudentId}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Printer size={12} />
                        <span>Cetak Laporan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                    {/* Form Bimbingan */}
                    <form onSubmit={handleSaveCounseling} className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4 border border-slate-200 bg-slate-50/50 p-5 rounded-2xl shadow-inner">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block pb-1 border-b border-slate-200">
                        🤝 Catat Sesi Layanan Bimbingan Siswa
                      </span>

                      {/* Siswa */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pilih Siswa Terkonseling</label>
                          {counStudentSearch && (
                            <button
                              type="button"
                              onClick={() => setCounStudentSearch('')}
                              className="text-[9px] text-rose-500 hover:underline font-bold cursor-pointer"
                            >
                              Reset Pencarian
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="🔍 Tulis nama siswa atau NIS untuk mencari..."
                          value={counStudentSearch}
                          onChange={(e) => setCounStudentSearch(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-[11px] font-semibold placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <select
                          value={selectedCounStudentId}
                          onChange={(e) => setSelectedCounStudentId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer"
                          required
                        >
                          <option value="">
                            {counStudentSearch 
                              ? `-- Pilih Hasil Pencarian (${classStudents.filter(s => s.name.toLowerCase().includes(counStudentSearch.toLowerCase()) || (s.nis && s.nis.toLowerCase().includes(counStudentSearch.toLowerCase()))).length} ditemukan) --` 
                              : "-- Pilih Siswa --"}
                          </option>
                          {classStudents
                            .filter(s => {
                              if (!counStudentSearch) return true;
                              const term = counStudentSearch.toLowerCase();
                              return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                            })
                            .sort((a,b)=>a.name.localeCompare(b.name)).map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                            ))}
                        </select>
                      </div>

                      {/* Tanggal */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tanggal Bimbingan</label>
                        <input
                          type="date"
                          value={counDate}
                          onChange={(e) => setCounDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
                          required
                        />
                      </div>

                      {/* Permasalahan */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Topik Permasalahan / Pengaduan</label>
                        <textarea
                          value={counTopic}
                          onChange={(e) => setCounTopic(e.target.value)}
                          placeholder="Uraikan keluhan belajar, perselisihan pertemanan, masalah kehadiran, maupun topik krusial..."
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      {/* Solusi/Tindakan */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tindakan Advokasi / Rencana Solusi</label>
                        <textarea
                          value={counActionPlan}
                          onChange={(e) => setCounActionPlan(e.target.value)}
                          placeholder="Uraikan mediasi yang ditawarkan oleh guru wali kelas..."
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      {/* Hasil bimbingan */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-extrabold text-slate-800">Hasil Sesi &amp; Komitmen Siswa</label>
                        <textarea
                          value={counResult}
                          onChange={(e) => setCounResult(e.target.value)}
                          placeholder="Bagaimana kesimpulan sesi bimbingan? Contoh: Siswa bersedia menandatangani sanksi, memperbaiki tingkat kehadirannya mulai besok..."
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingCounseling}
                        className="w-full bg-purple-600 hover:bg-purple-750 text-white rounded-xl py-2 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {savingCounseling ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        <span>Simpan Jurnal Bimbingan</span>
                      </button>
                    </form>

                    {/* Riwayat Bimbingan */}
                    <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4">
                      {/* Search bar */}
                      <div className="flex bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={counSearch}
                            onChange={(e) => setCounSearch(e.target.value)}
                            placeholder="Cari topik bimbingan atau nama bimbingan siswa..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      {loadingCounseling ? (
                        <div className="py-12 text-center text-slate-400 font-bold text-xs">Memuat riwayat bimbingan...</div>
                      ) : filteredCounselingLogs.length === 0 ? (
                        <div className="p-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 font-bold text-xs">
                          Belum ada catatan bimbingan konseling terdokumentasikan.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                          {filteredCounselingLogs.map(log => (
                            <div key={log.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all flex flex-col gap-2 shadow-xxs">
                              <div>
                                <h4 className="text-xs font-black text-slate-900">{log.studentName}</h4>
                                <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5">📅 Tanggal Bimbingan: {log.date}</span>
                              </div>
                              <div className="text-[11px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col gap-2">
                                <div><strong>🤝 Masalah Bimbingan:</strong> "{log.topic}"</div>
                                <div><strong>🧭 Rencana tindakan:</strong> "{log.actionPlan}"</div>
                                <div><strong>🏆 Hasil &amp; Komitmen siswa:</strong> "{log.result}"</div>
                              </div>
                              {log.bkFeedback && (
                                <div className="mt-1 p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex flex-col gap-1.5 animate-fade-in text-left">
                                  <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 tracking-wide uppercase">
                                    <span className="flex items-center gap-1">🧠 SARAN &amp; INTERVENSI GURU BK:</span>
                                    {log.bkFeedbackAt && (
                                      <span className="text-[9px] text-indigo-400 font-mono font-medium lowercase">
                                        ({new Date(log.bkFeedbackAt).toLocaleDateString('id-ID')} {new Date(log.bkFeedbackAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-indigo-950 font-bold text-[11px] leading-relaxed italic">
                                    "{log.bkFeedback}"
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 pb-1 mt-1">
                                <button
                                  onClick={() => printSingleCounselingLog(log, schoolIdentity, currentTeacher.name)}
                                  className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-[10px] rounded font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer size={11} /> Cetak
                                </button>
                                <button
                                  onClick={() => handleDeleteCounseling(log.id)}
                                  className="px-2 py-1 border border-rose-100 hover:bg-rose-50 text-[10px] rounded font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={11} /> Hapus
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4 WORKSPACE: Jurnal Informasi & Pengumuman Kelas */}
              {selectedJournalTab === 'announcement' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <button
                        onClick={() => setSelectedJournalTab('menu')}
                        className="mb-2 px-2.5 py-1 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Kembali ke Hub Jurnal Wali Kelas</span>
                      </button>
                      <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mt-1">
                        <span className="p-1 px-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs">📢</span>
                        Jurnal Informasi &amp; Pengumuman Kelas
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Menyiarkan agenda pengumuman atau pengumpulan berkas penting bagi siswa dewan kelas maupun wali murid.
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 select-none">
                      Kelas: {currentTeacher.className}
                    </div>
                  </div>

                  {/* COMPOSITE PRINT PER SISWA BANNER */}
                  <div className="mt-5 bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                        🖨️ Cetak Jurnal Gabungan per Siswa
                      </h4>
                      <p className="text-[11px] text-teal-700 mt-1 leading-relaxed">
                        Pilih nama siswa di bawah ini untuk mengompilasi seluruh catatan jurnal gabungan perkembangan, pelanggaran, bimbingan, pengumuman, dan rapat secara instan.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-1 md:mt-0">
                      <select
                        value={printTargetStudentId}
                        onChange={(e) => setPrintTargetStudentId(e.target.value)}
                        className="bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full md:w-48 shadow-xxs"
                      >
                        <option value="">-- Pilih Nama Siswa --</option>
                        {classStudents.sort((a,b)=>a.name.localeCompare(b.name)).map(student => (
                          <option key={student.id} value={student.id}>{student.name} ({student.nis})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handlePrintCombinedPerStudent}
                        disabled={!printTargetStudentId}
                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Printer size={12} />
                        <span>Cetak Laporan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                    {/* Form Post Pengumuman */}
                    <form onSubmit={handleSaveAnnouncement} className="lg:col-span-5 flex flex-col gap-4 border border-slate-200 bg-slate-50/50 p-5 rounded-2xl shadow-inner bg-slate-50">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block pb-1 border-b border-slate-200">
                        📣 Posting Pengumuman Kelas Baru
                      </span>

                      {/* Judul */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Judul Pengumuman</label>
                        <input
                          type="text"
                          value={annTitle}
                          onChange={(e) => setAnnTitle(e.target.value)}
                          placeholder="Contoh: Jadwal Study Tour, Persiapan Try Out..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                          required
                        />
                      </div>

                      {/* Konten */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Isi lengkap Pengumuman</label>
                        <textarea
                          value={annContent}
                          onChange={(e) => setAnnContent(e.target.value)}
                          placeholder="Uraikan perihal syarat-syarat, batas maksimal pengumpulan, penugasan penting untuk murid dewan kelas..."
                          rows={4}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      {/* Tanggal & Penerima */}
                      <div className="grid grid-cols-2 gap-35">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tanggal Siar</label>
                          <input
                            type="date"
                            value={annDate}
                            onChange={(e) => setAnnDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Target Penerima</label>
                          <select
                            value={annTarget}
                            onChange={(e) => setAnnTarget(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-850 cursor-pointer focus:outline-none"
                          >
                            <option value="Semua">Semua Siswa &amp; Ortu</option>
                            <option value="Siswa">Hanya Siswa Kelas</option>
                            <option value="Orang Tua">Khusus Orang Tua</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={savingAnnouncement}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {savingAnnouncement ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />}
                        <span>Siarkan Pengumuman</span>
                      </button>
                    </form>

                    {/* Riwayat Pengumuman */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                      {/* Search Bar */}
                      <div className="flex bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={annSearch}
                            onChange={(e) => setAnnSearch(e.target.value)}
                            placeholder="Cari pengumuman..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      {loadingAnnouncements ? (
                        <div className="py-12 text-center text-slate-400 font-bold text-xs">Memuat pengumuman...</div>
                      ) : filteredAnnouncements.length === 0 ? (
                        <div className="p-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 font-bold text-xs">
                          Belum ada pengumuman kelas tersiar.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                          {filteredAnnouncements.map(log => {
                            const statusColorColors: Record<string, string> = {
                              'Belum Dibaca': 'bg-slate-100 text-slate-600',
                              'Sebagian Terbaca': 'bg-amber-50 text-amber-700 border-amber-200',
                              'Telah Dikonfirmasi': 'bg-green-50 text-green-700 border-green-200'
                            };
                            return (
                              <div key={log.id} className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col gap-2 shadow-xxs">
                                <div className="flex justify-between items-start gap-3">
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900">{log.title}</h4>
                                    <span className="text-[9px] text-slate-400 font-bold font-mono">📅 Tanggal: {log.date} • Penerima: <span className="text-indigo-600 font-extrabold uppercase">{log.targetRecipient}</span></span>
                                  </div>
                                  <button
                                    onClick={() => handleToggleAnnConfirmation(log.id, log.confirmationStatus)}
                                    className={`px-2 py-0.5 rounded border text-[8.5px] font-extrabold cursor-pointer hover:opacity-85 select-none transition-transform active:scale-95 ${statusColorColors[log.confirmationStatus]}`}
                                    title="Klik untuk mengubah status konfirmasi baca"
                                  >
                                    {log.confirmationStatus} 🔄
                                  </button>
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-700 font-medium whitespace-pre-wrap pl-2 border-l-2 border-teal-500 bg-teal-50/15 p-2 rounded-r-lg mt-1">
                                  {log.content}
                                </p>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 pb-1 mt-1">
                                  <button
                                    onClick={() => printSingleAnnouncement(log, schoolIdentity, currentTeacher.className, currentTeacher.name)}
                                    className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-[10px] rounded font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer size={11} /> Cetak Edaran
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAnnouncement(log.id)}
                                    className="px-2 py-1 border border-rose-100 hover:bg-rose-50 text-[10px] rounded font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 size={11} /> Hapus
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5 WORKSPACE: Jurnal Rapat / Koordinasi */}
              {selectedJournalTab === 'meeting' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <button
                        onClick={() => setSelectedJournalTab('menu')}
                        className="mb-2 px-2.5 py-1 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Kembali ke Hub Jurnal Wali Kelas</span>
                      </button>
                      <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mt-1">
                        <span className="p-1 px-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs">📁</span>
                        Jurnal Rapat &amp; Koordinasi Wali Kelas
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Mendokumentasikan agenda kesepakatan rapat komite sekolah, paguyuban orang tua kelas, dan koordinasi intern dewan guru.
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 select-none">
                      Wali Kelas: {currentTeacher.name}
                    </div>
                  </div>

                  {/* COMPOSITE PRINT PER SISWA BANNER */}
                  <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black text-yellow-950 flex items-center gap-1.5">
                        🖨️ Cetak Jurnal Gabungan per Siswa
                      </h4>
                      <p className="text-[11px] text-yellow-700 mt-1 leading-relaxed">
                        Pilih nama siswa di bawah ini untuk mengompilasi seluruh catatan jurnal gabungan perkembangan, pelanggaran, bimbingan, pengumuman, dan rapat secara instan.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-1 md:mt-0">
                      <select
                        value={printTargetStudentId}
                        onChange={(e) => setPrintTargetStudentId(e.target.value)}
                        className="bg-white border border-yellow-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full md:w-48 shadow-xxs"
                      >
                        <option value="">-- Pilih Nama Siswa --</option>
                        {classStudents.sort((a,b)=>a.name.localeCompare(b.name)).map(student => (
                          <option key={student.id} value={student.id}>{student.name} ({student.nis})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handlePrintCombinedPerStudent}
                        disabled={!printTargetStudentId}
                        className="bg-yellow-600 hover:bg-yellow-750 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Printer size={12} />
                        <span>Cetak Laporan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                    {/* Form Jurnal Rapat */}
                    <form onSubmit={handleSaveMeeting} className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4 border border-slate-200 bg-slate-50/50 p-5 rounded-2xl shadow-inner bg-slate-50">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block pb-1 border-b border-slate-200">
                        📄 Dokumentasi Jurnal Rapat Terdahulu
                      </span>

                      {/* Jenis Rapat */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Jenis / Kategori Pertemuan</label>
                        <select
                          value={meetType}
                          onChange={(e) => setMeetType(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Rapat Orang Tua">Rapat Paguyuban Orang Tua Murid</option>
                          <option value="Rapat Dewan Guru">Rapat Koordinasi Dewan Kelas</option>
                          <option value="Koordinasi Komite">Koordinasi Komite Sekolah</option>
                          <option value="Lainnya">Lainnya / Ekstrakurikuler</option>
                        </select>
                      </div>

                      {/* Tanggal */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tanggal Pelaksanaan</label>
                        <input
                          type="date"
                          value={meetDate}
                          onChange={(e) => setMeetDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                          required
                        />
                      </div>

                      {/* Peserta */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Peserta / Kehadiran Rapat</label>
                        <input
                          type="text"
                          value={meetAttendees}
                          onChange={(e) => setMeetAttendees(e.target.value)}
                          placeholder="Contoh: Wali Kelas 7-A, Kepala Sekolah & 20 Orang Tua Murid..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                          required
                        />
                      </div>

                      {/* Agenda & Hasil */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Agenda &amp; Hasil Keputusan Rapat</label>
                        <textarea
                          value={meetAgenda}
                          onChange={(e) => setMeetAgenda(e.target.value)}
                          placeholder="Uraikan dengan jelas hal-hal apa saja yang dibahas serta keputusan final rapat..."
                          rows={3}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      {/* Tindak Lanjut Rapat */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Poin Rencana Tindak Lanjut Rapat</label>
                        <textarea
                          value={meetFollowUp}
                          onChange={(e) => setMeetFollowUp(e.target.value)}
                          placeholder="Siapa pelaksana solusi dan target selesainya..."
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingMeeting}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl py-2 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {savingMeeting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        <span>Simpan Notulensi Rapat</span>
                      </button>
                    </form>

                    {/* Riwayat Pertemuan / Rapat */}
                    <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4">
                      {/* Search bar */}
                      <div className="flex bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={meetSearch}
                            onChange={(e) => setMeetSearch(e.target.value)}
                            placeholder="Cari agenda atau peserta..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      {loadingMeetings ? (
                        <div className="py-12 text-center text-slate-400 font-bold text-xs">Memuat dokumen rapat...</div>
                      ) : filteredMeetings.length === 0 ? (
                        <div className="p-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 font-bold text-xs">
                          Belum ada jurnal rapat yang direkam kelas ini.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                          {filteredMeetings.map(log => (
                            <div key={log.id} className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col gap-2 shadow-xxs">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h4 className="text-xs font-black text-slate-950">{log.meetingType}</h4>
                                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">📅 Tanggal: {log.date} • Peserta: {log.attendees}</span>
                                </div>
                              </div>
                              <div className="text-[11px] leading-relaxed mt-1 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col gap-2">
                                <div><strong>📋 Agenda Utama &amp; Keputusan:</strong><br/>{log.agenda}</div>
                                <div className="border-t border-slate-200 pt-1.5 mt-1.5"><strong>🚀 Rencana Tindak Lanjut:</strong><br/>{log.followUp}</div>
                              </div>
                              <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 pb-1 mt-1">
                                <button
                                  onClick={() => printSingleMeetingLog(log, schoolIdentity, currentTeacher.className, currentTeacher.name)}
                                  className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-[10px] rounded font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer size={11} /> Cetak Lembar Rapat
                                </button>
                                <button
                                  onClick={() => handleDeleteMeeting(log.id)}
                                  className="px-2 py-1 border border-rose-100 hover:bg-rose-50 text-[10px] rounded font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={11} /> Hapus
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {activeSubTab === 'pkg' && (
            <div className="flex flex-col gap-6 text-left animate-fade-in mb-12">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-indigo-600" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Hasil Evaluasi Resmi</span>
                    <h2 className="font-extrabold text-lg text-slate-900 mt-1 flex items-center gap-2">
                      🎖️ Penilaian Kinerja Guru (PKG) Saya
                    </h2>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Hasil evaluasi kompetensi pendidik dan penilaian kinerja terintegrasi yang dirilis secara resmi oleh Kepala Sekolah.
                    </p>
                  </div>
                </div>

                {loadingEvaluations ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <span className="text-xs font-bold">Menjaring data penilaian resmi...</span>
                  </div>
                ) : evaluations.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-6 gap-3">
                    <span className="text-4xl text-slate-300">📭</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Belum Ada Penilaian PKG</h4>
                      <p className="text-slate-500 text-xs mt-1 max-w-md">
                        Kepala Sekolah belum menerbitkan atau mensinkronkan laporan penilaian kinerja (PKG) berkala untuk akun pendidik Anda.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 mt-6">
                    {evaluations.map((ev) => {
                      const avgScore = Math.round((Number(ev.pedagogicScore) + Number(ev.professionalScore) + Number(ev.personalScore) + Number(ev.socialScore)) / 4);
                      return (
                        <div key={ev.id} className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-6 hover:shadow-md transition-all">
                          {/* Header section of evaluation */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                            <div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-extrabold text-[9px] uppercase tracking-wider">
                                TA: {ev.academicYear}
                              </span>
                              <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">
                                Lembar PKG - {ev.teacherName}
                              </h3>
                              <span className="block text-[10px] text-slate-500 mt-0.5">
                                Penilai: {schoolIdentity?.principal || ev.evaluatorName} (Kepala Sekolah) &bull; Synchronized: {ev.date}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePrintPkg(ev)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer w-fit"
                            >
                              <Printer size={13} />
                              Cetak Laporan Resmi
                            </button>
                          </div>

                          {/* Score grid metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Pedagogik</span>
                              <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.pedagogicScore}</span>
                              <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Profesional</span>
                              <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.professionalScore}</span>
                              <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kepribadian</span>
                              <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.personalScore}</span>
                              <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Sosial</span>
                              <span className="text-2xl font-black text-indigo-600 mt-1 font-mono">{ev.socialScore}</span>
                              <span className="text-[9px] text-slate-500 mt-1">KKM: 80</span>
                            </div>
                            <div className="col-span-2 md:col-span-1 bg-amber-500/10 border-2 border-amber-500/20 p-4 rounded-xl text-center flex flex-col justify-center shadow-xs">
                              <span className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider">Rata-Rata</span>
                              <span className="text-2xl font-black text-emerald-700 mt-1 font-mono">{avgScore}</span>
                              <span className="text-[9px] text-emerald-700 font-extrabold mt-1">
                                {avgScore >= 85 ? 'AMAT BAIK' : 'BAIK'}
                              </span>
                            </div>
                          </div>

                          {/* Notes recommendations */}
                          {ev.notes && (
                            <div className="bg-white border border-slate-200 p-4 rounded-xl text-left">
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                                Catatan Khusus &amp; Rekomendasi Kepala Sekolah
                              </span>
                              <p className="text-xs text-slate-700 font-bold italic leading-relaxed font-sans">
                                "{ev.notes}"
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'buku_induk' && (
            <div className="w-full">
              <BukuIndukManagement
                students={classStudents}
                onUpdateStudent={async (id, data) => {
                  if (onUpdateStudent) {
                    return await onUpdateStudent(id, data);
                  }
                  return false;
                }}
                onRefresh={onRefresh}
              />
            </div>
          )}


          {activeSubTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start text-left">
              {/* Left Column: Profil & password */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-slate-900 font-extrabold text-lg flex items-center gap-2">
                    <span className="p-1 px-2 rounded-lg bg-indigo-50 text-indigo-700">👤</span> Profil Wali Kelas
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Detail informasi akun kedinasan Anda dan pengaturan privasi kata sandi.
                  </p>
                </div>

                {/* Profile Card details */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-950 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
                    <User size={150} />
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-3xl font-extrabold">
                      🏫
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Wali Kelas Aktif</span>
                      <h4 className="text-lg font-bold tracking-tight">{currentTeacher.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-150 mt-1 border-t border-white/10 pt-1.5 font-medium">
                        <span>Kelas Binaan: <strong className="text-white font-extrabold">{currentTeacher.className}</strong></span>
                        <span className="opacity-40">•</span>
                        <span>Username: <strong className="text-white font-mono font-bold">@{currentTeacher.username}</strong></span>
                      </div>
                      {currentTeacher.skUrl && (
                        <div className="mt-3">
                          <a
                            href={currentTeacher.skUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all shadow-xs"
                          >
                            <Download size={12} />
                            Unduh SK Penugasan 📋
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Change Form Section */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-slate-900 font-extrabold text-sm flex items-center gap-2 mb-4">
                    <span className="p-1 rounded-md bg-amber-50 text-amber-700">🔐</span> Ubah Kata Sandi Akun
                  </h4>

                  <form onSubmit={handleTeacherPasswordChange} className="flex flex-col gap-4">
                    {passwordError && (
                      <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-150 border-emerald-200 text-emerald-850 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                        <Check size={14} className="shrink-0" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Kata Sandi Saat Ini</label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          placeholder="Masukkan sandi lama wali kelas"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                        />
                        <Key size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          placeholder="Masukkan sandi baru (minimal 6 karakter)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                        />
                        <Key size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="mt-2 w-full sm:w-auto self-start px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Sedang Menyimpan...
                        </>
                      ) : (
                        <>Ubah Sandi Akun 🔐</>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Program Kerja Kepala Sekolah synced with staff */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-slate-900 font-extrabold text-lg flex items-center gap-2">
                      <span className="p-1 px-2 rounded-lg bg-teal-50 text-teal-700">📢</span> Program Kerja Kepala Sekolah
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                      Instruksi Resmi Pendidik
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Berikut adalah daftar rencana strategis &amp; program kerja yang disinkronkan langsung oleh Kepala Sekolah ({schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}).
                  </p>
                </div>

                <div className="flex flex-col gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {loadingWorkPrograms ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs font-semibold">
                      <Loader2 size={16} className="animate-spin text-indigo-500 mb-2" />
                      Memuat program kerja Kepala Sekolah...
                    </div>
                  ) : workPrograms.filter(p => p.syncWithStaff).length === 0 ? (
                    <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs italic">
                      Saat ini belum ada program kerja strategis yang dipublikasikan oleh Kepala Sekolah.
                    </div>
                  ) : (
                    workPrograms.filter(p => p.syncWithStaff).map(p => {
                      const statusBgs = {
                        planned: 'bg-blue-50 text-blue-700 border-blue-100',
                        active: 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse',
                        completed: 'bg-slate-100 text-slate-600 border-slate-200'
                      };
                      const statusLabels = {
                        planned: 'Direncanakan',
                        active: 'Berjalan Aktif',
                        completed: 'Selesai'
                      };

                      return (
                        <div key={p.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col gap-2 shadow-xxs text-left">
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-extrabold text-slate-900 text-xs leading-tight">{p.title}</h4>
                            <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-md shrink-0 ${statusBgs[p.status] || ''}`}>
                              {statusLabels[p.status] || p.status}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">{p.description}</p>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-bold border-t border-slate-200/50 pt-2 mt-1">
                            <span>📅 Batas Pelaksanaan: <span className="text-slate-705 font-mono">{p.targetDate}</span></span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'rapor_merdeka' && (
            <div className="flex flex-col gap-6 text-left animate-fade-in mb-12">
              {/* Page Title Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600" />
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Modul Wali Kelas (Homeroom Teacher)</span>
                <h2 className="font-extrabold text-lg text-slate-900 mt-1 flex items-center gap-2">
                  🎓 Rekap Rapor Akhir Siswa (Kurikulum Merdeka)
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Kolektif nilai rapor hasil asessment mata pelajaran. Cetak lembar rapor resmi per individu dengan format standar kementerian pendidikan.
                </p>

                {/* Filter Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Semester</label>
                    <select
                      value={selectedReportSemester}
                      onChange={(e) => setSelectedReportSemester(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tahun Ajaran</label>
                    <select
                      value={selectedReportYear}
                      onChange={(e) => setSelectedReportYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-colors"
                    >
                      {Array.from(new Set([
                        ...(schoolIdentity?.activeAcademicYear ? [schoolIdentity.activeAcademicYear] : []),
                        '2025/2026',
                        '2024/2025',
                        '2023/2024'
                      ])).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Core Grid Column Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Student Selector Roster (4 Cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daftar Siswa Kelas {currentTeacher.className}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
                      {classStudents.map((s, idx) => {
                        const isSelected = selectedReportStudentId === s.id;
                        
                        // Find average grade for this student
                        const scores = merdekaAssessments.filter(a => 
                          a.studentId === s.id && 
                          a.semester === selectedReportSemester && 
                          a.academicYear === selectedReportYear
                        );

                        let sumFinal = 0;
                        scores.forEach(a => {
                          const avgF = a.nilaiFormatif !== undefined ? Number(a.nilaiFormatif) : Math.round((Number(a.tp1Grade || 0) + Number(a.tp2Grade || a.tp1Grade || 0) + Number(a.tp3Grade || a.tp1Grade || 0) + (a.tp4Grade !== undefined ? Number(a.tp4Grade) : Number(a.tp1Grade || 0))) / 4);
                          const finalSc = a.nilaiRapor !== undefined ? Number(a.nilaiRapor) : Math.round((avgF + Number(a.nilaiSumatifLM || 0) + Number(a.nilaiSAS || 0)) / 3);
                          sumFinal += finalSc;
                        });

                        const meanScore = scores.length > 0 ? Math.round(sumFinal / scores.length) : 0;

                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedReportStudentId(s.id)}
                            className={`w-full text-left p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-slate-900 border border-slate-900 shadow-sm text-white' 
                                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-6 w-6 shrink-0 rounded-lg text-[10px] font-black flex items-center justify-center ${
                                isSelected ? 'bg-indigo-650 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-extrabold text-xs truncate leading-tight">{s.name}</div>
                                <div className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>NIS: {s.nis}</div>
                              </div>
                            </div>
                            {meanScore > 0 ? (
                              <span className={`px-2 py-0.5 rounded-md font-sans text-[10px] font-black shrink-0 ${
                                isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                {meanScore} Avg
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400">Belum Ada</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Student Report Card Preview Panel (8 Cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {selectedStudent ? (() => {
                    const scores = merdekaAssessments.filter(a => 
                      a.studentId === selectedStudent.id && 
                      a.semester === selectedReportSemester && 
                      a.academicYear === selectedReportYear
                    );

                    const att = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
                    attendanceLogs.forEach(l => {
                      if (l.studentId === selectedStudent.id) {
                        if (att[l.status] !== undefined) att[l.status]++;
                      }
                    });

                    const noteText = waliKelasNotes[selectedStudent.id] || "Ananda menunjukkan keseriusan belajar yang konsisten. Terus tingkatkan kemampuan di semua rumpun keilmuan.";

                    return (
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                        
                        {/* Toolbar Actions */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                          <div>
                            <h3 className="font-black text-xs text-slate-400 uppercase tracking-wider">Halaman Pratinjau Rapor</h3>
                            <p className="font-black text-slate-900 text-base leading-none mt-1">{selectedStudent.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const printWin = window.open("", "_blank");
                              if (!printWin) return;
                              
                              const officialHeaderKop = schoolIdentity?.letterhead 
                                ? `<img src="${schoolIdentity.letterhead}" class="kop-img" referrerPolicy="no-referrer" />`
                                : `<div class="p-4 border-b-2 border-black text-center" style="margin-bottom:20px;">
                                     <h2 style="margin:0; font-size:16px; font-weight:bold;">${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</h2>
                                     <p style="margin:2px 0 0; font-size:11px;">Jl. Dr. Sutomo No.1 Pandaan Pasuruan | Telp: ${schoolIdentity?.phone || "-"}</p>
                                   </div>`;

                              const rowGrids = scores.length === 0 
                                ? `<tr><td colspan="7" style="text-align:center; padding: 20px;">Belum ada asessment mata pelajaran terdaftar untuk semester ini</td></tr>`
                                : scores.map((a, idx) => {
                                    const avgF = a.nilaiFormatif !== undefined ? Number(a.nilaiFormatif) : Math.round((Number(a.tp1Grade || 0) + Number(a.tp2Grade || a.tp1Grade || 0) + Number(a.tp3Grade || a.tp1Grade || 0) + (a.tp4Grade !== undefined ? Number(a.tp4Grade) : Number(a.tp1Grade || 0))) / 4);
                                    const finalSc = a.nilaiRapor !== undefined ? Number(a.nilaiRapor) : Math.round((avgF + Number(a.nilaiSumatifLM || 0) + Number(a.nilaiSAS || 0)) / 3);
                                    
                                    let capNotes = "";
                                    if (finalSc >= 85) {
                                      capNotes = `Menunjukkan pemahaman prima dalam ${a.tp1Name}. Konsisten mempertahankan nilai istimewa.`;
                                    } else if (finalSc >= 75) {
                                      capNotes = `Menunjukkan pemahaman tuntas dalam ${a.tp1Name}. Perlu pendalaman lanjut pada materi sumatif.`;
                                    } else {
                                      capNotes = `Menunjukkan perlu bimbingan khusus dalam ${a.tp1Name}. Butuh intervensi remedial berkala.`;
                                    }

                                    return `
                                      <tr>
                                        <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1;">${idx + 1}</td>
                                        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight:bold;">${a.subject}</td>
                                        <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1;">${avgF}</td>
                                        <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1;">${a.nilaiSumatifLM || 0}</td>
                                        <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1;">${a.nilaiSAS || 0}</td>
                                        <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1; font-weight:bold; background:#f8fafc;">${finalSc}</td>
                                        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size:10px; line-height:1.4;">${capNotes}</td>
                                      </tr>
                                    `;
                                  }).join('');

                              printWin.document.write(`
                                <html>
                                  <head>
                                    <title>RAPOR AKHIR - ${selectedStudent.name}</title>
                                    <style>
                                      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; padding: 30px; color: #000; font-size: 11.5px; line-height:1.5; }
                                      .kop-img { width:100%; height:auto; display:block; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:20px; }
                                      .meta-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
                                      .meta-table td { padding: 4px 0; font-size: 11px; }
                                      .meta-table td.label { font-weight:bold; width: 15%; }
                                      .meta-table td.val { width: 35%; }
                                      .main-report { width:100%; border-collapse:collapse; margin-bottom:25px; }
                                      .main-report th { background:#f1f5f9; padding:8px; border:1px solid #64748b; font-weight:bold; font-size:10.5px; text-transform:uppercase; text-align:center;}
                                      .main-report td { border:1px solid #64748b; }
                                      .att-table { width:45%; border-collapse:collapse; margin-bottom:25px; }
                                      .att-table td, .att-table th { border:1px solid #64748b; padding:6px; }
                                      .notes-box { border:1px solid #64748b; padding:12px; border-radius:4px; font-style:italic; margin-bottom:30px; font-weight:bold;}
                                      .sig-grid { width:100%; margin-top:40px; border-collapse:collapse; }
                                      .sig-grid td { text-align:center; width:33%; padding:10px 0; font-weight:bold;}
                                    </style>
                                  </head>
                                  <body>
                                    ${officialHeaderKop}
                                    <div style="text-align:center; font-size:13px; font-weight:bold; text-transform:uppercase; margin-bottom:20px; text-decoration:underline;">LAPOR HASIL BELAJAR AKHIR (RAPOR MERDEKA)</div>
                                    
                                    <table class="meta-table">
                                      <tr>
                                        <td class="label">Nama Siswa</td><td class="val">: <strong>${selectedStudent.name}</strong></td>
                                        <td class="label">Kelas / Fase</td><td class="val">: ${selectedStudent.class} / Fase D</td>
                                      </tr>
                                      <tr>
                                        <td class="label">NIS / NISN</td><td class="val">: ${selectedStudent.nis || "-"}</td>
                                        <td class="label">Semester</td><td class="val">: ${selectedReportSemester}</td>
                                      </tr>
                                      <tr>
                                        <td class="label">Sekolah</td><td class="val">: ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</td>
                                        <td class="label">Tahun Ajaran</td><td class="val">: ${selectedReportYear}</td>
                                      </tr>
                                    </table>

                                    <h3 style="margin: 0 0 8px; font-size:11px; text-transform:uppercase; text-decoration:underline;">A. LAPORAN NILAI KOMPETENSI REKAP MATA PELAJARAN</h3>
                                    <table class="main-report">
                                      <thead>
                                        <tr>
                                          <th style="width:5%">No</th>
                                          <th style="width:25%">Mata Pelajaran</th>
                                          <th style="width:10%">Formatif (TP)</th>
                                          <th style="width:10%">Sumatif LM</th>
                                          <th style="width:10%">Sumatif SAS</th>
                                          <th style="width:10%">Nilai Rapor</th>
                                          <th style="width:30%">Capaian Kompetensi / Deskripsi Merdeka</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${rowGrids}
                                      </tbody>
                                    </table>

                                    <div style="display:flex; justify-content:space-between; gap:20px;">
                                      <table class="att-table">
                                        <thead>
                                          <tr style="background:#f1f5f9;"><th colspan="2" style="font-weight:bold; font-size:10px; text-transform:uppercase;">B. REKAPITULASI KEHADIRAN</th></tr>
                                        </thead>
                                        <tbody>
                                          <tr><td>Sakit (S)</td><td style="text-align:center; font-weight:bold;">${att.Sakit} Hari</td></tr>
                                          <tr><td>Izin (I)</td><td style="text-align:center; font-weight:bold;">${att.Izin} Hari</td></tr>
                                          <tr><td>Alpa / Tanpa Keterangan (A)</td><td style="text-align:center; font-weight:bold;">${att.Alpa} Hari</td></tr>
                                        </tbody>
                                      </table>

                                      <div style="width:50%;">
                                        <h3 style="margin: 0 0 6px; font-size:11px; text-transform:uppercase; text-decoration:underline;">C. CATATAN WALI KELAS</h3>
                                        <div class="notes-box">
                                          "${noteText}"
                                        </div>
                                      </div>
                                    </div>

                                    <table class="sig-grid">
                                      <tr>
                                        <td>Orang Tua / Wali Siswa<div style="height:60px"></div>( ..................................... )</td>
                                        <td>Wali Kelas Kelas ${selectedStudent.class}<div style="height:60px"></div><u><strong>${currentTeacher.name}</strong></u></td>
                                        <td>Mengetahui,<br/>Kepala Sekolah<div style="height:60px"></div><u><strong>${schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</strong></u></td>
                                      </tr>
                                    </table>
                                    <script>window.print(); setTimeout(function(){window.close();},5000);</script>
                                  </body>
                                </html>
                              `);
                              printWin.document.close();
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                          >
                            <Printer size={13} />
                            Print Rapor Lembar Cetak
                          </button>
                        </div>

                        {/* Student Metadata Panel */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">NIS</span>
                            <span className="font-extrabold text-slate-800 font-mono">{selectedStudent.nis || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Kelas / Fase</span>
                            <span className="font-extrabold text-slate-800">{selectedStudent.class} / Fase D</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Semester</span>
                            <span className="font-extrabold text-slate-800">{selectedReportSemester}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Mata Pelajaran Dinilai</span>
                            <span className="font-extrabold text-slate-800">{scores.length} Subjects</span>
                          </div>
                        </div>

                        {/* Matched Assessments Table */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Laporan Nilai Rekap Pembelajaran Komparatif</span>
                          <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
                            <table className="w-full border-collapse text-xs select-none">
                              <thead>
                                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[9px] text-center">
                                  <th className="py-2.5 px-3 text-center w-10">No</th>
                                  <th className="py-2.5 px-3 text-left">Mata Pelajaran</th>
                                  <th className="py-2.5 px-2">Avg Formatif (TP)</th>
                                  <th className="py-2.5 px-2">Sumatif M/L</th>
                                  <th className="py-2.5 px-2">SAS</th>
                                  <th className="py-2.5 px-3 bg-slate-950 text-emerald-400">Total Akhir</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scores.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                                      Belum ada rekap nilai kualifikasi Kurikulum Merdeka pelajaran untuk siswa ini.
                                    </td>
                                  </tr>
                                ) : (
                                  scores.map((a, idx) => {
                                    const avgF = a.nilaiFormatif !== undefined ? Number(a.nilaiFormatif) : Math.round((Number(a.tp1Grade || 0) + Number(a.tp2Grade || a.tp1Grade || 0) + Number(a.tp3Grade || a.tp1Grade || 0) + (a.tp4Grade !== undefined ? Number(a.tp4Grade) : Number(a.tp1Grade || 0))) / 4);
                                    const finalSc = a.nilaiRapor !== undefined ? Number(a.nilaiRapor) : Math.round((avgF + Number(a.nilaiSumatifLM || 0) + Number(a.nilaiSAS || 0)) / 3);

                                    return (
                                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="py-2.5 px-3 text-left font-black text-slate-800">{a.subject}</td>
                                        <td className="py-2.5 px-2 text-center font-bold text-indigo-600">{avgF}</td>
                                        <td className="py-2.5 px-2 text-center text-slate-700">{a.nilaiSumatifLM || 0}</td>
                                        <td className="py-2.5 px-2 text-center text-slate-700">{a.nilaiSAS || 0}</td>
                                        <td className="py-2.5 px-3 text-center bg-slate-50 font-black text-slate-900 leading-none">
                                          <span className={`px-2 py-0.5 rounded ${
                                            finalSc >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-850'
                                          }`}>
                                            {finalSc}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bottom Attendance Card & Wali Kelas Note Edit */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                          {/* Attendance Summary */}
                          <div className="bg-slate-50/40 p-4 rounded-3xl border border-slate-200 text-xs flex flex-col gap-3">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rekap Kehadiran Presensi Pelajaran</span>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              <div className="bg-white p-3 rounded-2xl border border-slate-150 text-center">
                                <span className="text-[10px] text-slate-400 block font-bold">Sakit (S)</span>
                                <span className="text-sm font-black text-amber-600 font-mono">{att.Sakit}</span>
                              </div>
                              <div className="bg-white p-3 rounded-2xl border border-slate-150 text-center">
                                <span className="text-[10px] text-slate-400 block font-bold">Izin (I)</span>
                                <span className="text-sm font-black text-indigo-600 font-mono">{att.Izin}</span>
                              </div>
                              <div className="bg-white p-3 rounded-2xl border border-slate-150 text-center">
                                <span className="text-[10px] text-slate-400 block font-bold">Alpa (A)</span>
                                <span className="text-sm font-black text-rose-600 font-mono">{att.Alpa}</span>
                              </div>
                            </div>
                          </div>

                          {/* Homeroom Notes Form */}
                          <div className="bg-slate-50/40 p-4 rounded-3xl border border-slate-200 flex flex-col gap-2.5">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Catatan Khusus Wali Kelas</span>
                            <textarea
                              rows={2}
                              value={waliKelasNotes[selectedStudent.id] || ''}
                              onChange={(e) => {
                                const txt = e.target.value;
                                setWaliKelasNotes(prev => ({
                                  ...prev,
                                  [selectedStudent.id]: txt
                                }));
                              }}
                              placeholder="Wali kelas silakan menulis arahan rujukan peningkatan belajar siswa..."
                              className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl p-2.5 font-bold text-slate-800 text-[11px] leading-relaxed"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setNotifMsg({ type: 'success', text: "Catatan wali kelas disinkronkan ke rapor" });
                                  setShowSuccessCheck(true);
                                  setTimeout(() => setShowSuccessCheck(false), 2000);
                                }}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Update Catatan
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="py-20 text-center text-slate-400 font-semibold bg-white border border-slate-200 rounded-3xl shadow-sm text-xs">
                      Pilih siswa di atas untuk memuat data rapor kurikulum merdeka.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div 
        style={{ contentVisibility: 'auto' }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16"
      >
        {/* Menu 1 (Home - paling kiri) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('record');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'record' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Home size={20} className={activeSubTab === 'record' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'record' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Home</span>
        </button>

        {/* Menu 2 (Jurnal Kelas) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('history');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'history' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <BookOpen size={20} className={activeSubTab === 'history' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'history' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Jurnal</span>
        </button>

        {/* Menu 3 (Rekap Absensi) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('rekap_absensi');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'rekap_absensi' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Calendar size={20} className={activeSubTab === 'rekap_absensi' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'rekap_absensi' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Rekap</span>
        </button>

        {/* Menu 4 (Keuangan SPP & Tabungan) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('finance');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeSubTab === 'finance' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Wallet size={20} className={activeSubTab === 'finance' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeSubTab === 'finance' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Keuangan</span>
        </button>

        {/* Menu 5 (Lainnya - 4 kotak, paling kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${(['perkembangan', 'rapor_merdeka', 'profile', 'pkg'].includes(activeSubTab) || showMoreMenu) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={(['perkembangan', 'rapor_merdeka', 'profile', 'pkg'].includes(activeSubTab) || showMoreMenu) ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${(['perkembangan', 'rapor_merdeka', 'profile', 'pkg'].includes(activeSubTab) || showMoreMenu) ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
        </button>
      </div>

      {/* Slide-over menu bottom sheet overlay for "Lainnya" */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Lainnya</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Wali Kelas</h4>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('perkembangan');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeSubTab === 'perkembangan'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-orange-50 rounded-xl text-orange-600 text-lg">📈</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Perkembangan Siswa</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Pantau kepribadian, pelanggaran, &amp; konseling siswa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('rapor_merdeka');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeSubTab === 'rapor_merdeka'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-700 text-lg">🎓</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Rapor Merdeka</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Pengelolaan rapor kurikulum merdeka terintegrasi</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('profile');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeSubTab === 'profile'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-sky-50 rounded-xl text-sky-600 text-lg">👤</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Profil Saya</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Detail akun pendidik dan pengaturan kata sandi privat</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('pkg');
                    setShowMoreMenu(false);
                  }}
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all ${
                    activeSubTab === 'pkg'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <span className="p-2 w-fit bg-amber-50 rounded-xl text-amber-600 text-lg">🎖️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Evaluasi PKG</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Penilaian Kinerja Guru oleh Kepala Sekolah</p>
                  </div>
                </button>
              </div>

              {/* Quick access to download Mobile Apps in the bottom sheet menu */}
              <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  📲 Unduh Aplikasi Mobile Resmi
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Gunakan aplikasi mobile resmi untuk kemudahan akses monitor seluruh kegiatan kelas, presensi, &amp; dana tabungan wali murid langsung lewat HP.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a
                    href={schoolIdentity?.apkUrl || "#"}
                    target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.apkUrl) {
                        e.preventDefault();
                        alert("Link unduhan Android belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.apkUrl 
                        ? "bg-emerald-50 hover:bg-emerald-105 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Smartphone size={13} className={schoolIdentity?.apkUrl ? "text-emerald-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">Android APK</span>
                  </a>

                  <a
                    href={schoolIdentity?.iosUrl || "#"}
                    target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.iosUrl) {
                        e.preventDefault();
                        alert("Link unduhan iOS belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.iosUrl 
                        ? "bg-sky-50 hover:bg-sky-105 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Apple size={13} className={schoolIdentity?.iosUrl ? "text-sky-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">iOS Apple</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Visual Checklist / Success Animation Modal */}
      <AnimatePresence>
        {showSuccessCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md no-print p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-150 flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Subtle green pattern background */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-50 rounded-full opacity-40 pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-slate-50 rounded-full opacity-40 pointer-events-none" />

              {/* Draw-in animated SVG checkmark */}
              <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100 flex items-center justify-center mb-5 mt-2 shadow-inner">
                <svg className="w-11 h-11 text-emerald-600" viewBox="0 0 52 52" fill="none" stroke="currentColor">
                  <motion.circle 
                    cx="26" 
                    cy="26" 
                    r="23" 
                    strokeWidth="3.5" 
                    stroke="currentColor" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                  <motion.path 
                    d="M16 27l7 7 15-15" 
                    strokeWidth="4.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                  />
                </svg>
              </div>

              <h3 className="font-extrabold text-slate-950 text-base subpixel-antialiased tracking-tight">
                Absensi Berhasil Disimpan!
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-2 px-1">
                Rekap absensi kelas <span className="font-extrabold text-slate-800">Kelas {currentTeacher.className}</span> untuk tanggal <span className="font-bold text-slate-800">{new Date(selectedDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span> telah sukses disimpan & disinkronkan.
              </p>

              {/* Micro stats review */}
              <div className="mt-5 w-full bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-2 relative z-10">
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Hadir
                  </span>
                  <span className="font-black text-slate-900 font-sans">{currentDailyStats.hadir} Siswa</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Terlambat
                  </span>
                  <span className="font-black text-slate-900 font-sans">{currentDailyStats.terlambat} Siswa</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Sakit / Izin
                  </span>
                  <span className="font-black text-slate-900 font-sans">{currentDailyStats.sakit + currentDailyStats.izin} Siswa</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Tanpa Keterangan
                  </span>
                  <span className="font-black text-rose-600 font-sans">{currentDailyStats.alpa} Siswa</span>
                </div>
                <div className="border-t border-slate-200/60 my-0.5 pt-1.5 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Total Murid</span>
                  <span className="font-black font-sans">{currentDailyStats.total} Anak</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowSuccessCheck(false)}
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md border border-slate-950 flex items-center justify-center gap-2 relative z-10"
              >
                <Check size={14} className="stroke-[3px]" />
                Selesai & Tutup
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PRINT OUT JURNAL INDIVIDUAL */}
      <AnimatePresence>
        {selectedJournalToPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-4xl w-full text-slate-900 flex flex-col gap-4 relative my-8"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-indigo-600" />
                  <span className="font-extrabold text-slate-800 text-sm">Pratinjau PDF Jurnal Pembelajaran KBM</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-indigo-700 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>Cetak Jurnal (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJournalToPrint(null)}
                    className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-slate-605 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Core report print canvas section */}
              <div className="overflow-y-auto pr-1 max-h-[70vh]">
                <div id="print-report-section" className="bg-white text-slate-950 p-6 rounded-lg font-sans border border-slate-150 flex flex-col gap-6 text-[11px] leading-relaxed relative text-left">
                  
                  {/* Official School Header - Kop Surat */}
                  {schoolIdentity?.letterhead ? (
                    <div className="w-full border-b-4 border-double border-slate-900 pb-2 flex flex-col items-center text-left select-none">
                      <img 
                        src={schoolIdentity.letterhead} 
                        className="w-full h-auto block" 
                        alt="Kop Surat" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-800">DOKUMEN JURNAL PEMBELAJARAN (KBM)</span>
                        <span>Diunduh: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b-4 border-double border-slate-900 pb-3 flex justify-between items-center gap-4 text-left">
                      <div className="flex items-center gap-3">
                        {schoolIdentity?.logo && (
                          <img 
                            src={schoolIdentity.logo} 
                            className="w-12 h-12 object-contain" 
                            alt="Logo" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col gap-0.5 text-left font-sans">
                          <span className="text-sm font-black uppercase tracking-wider text-slate-900">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold mt-1">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 font-mono shrink-0">
                        <span className="text-xs font-black text-slate-800">DOKUMEN RESMI</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Dihasilkan: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  )}

                  {/* Title of Document */}
                  <div className="text-center my-1 text-slate-900">
                    <h2 className="text-sm font-extrabold uppercase tracking-widest underline">
                      Jurnal Pembelajaran &amp; Presensi Mata Pelajaran
                    </h2>
                    <p className="text-[9px] text-slate-500 font-semibold font-mono mt-1">
                      Kelas: {selectedJournalToPrint.className} &bull; Semester {selectedJournalToPrint.semester || "Genap"} &bull; Tahun Ajaran 2025/2026
                    </p>
                  </div>

                  {/* Meta Information Field */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Mata Pelajaran</span>
                        <span>:</span>
                        <span className="font-extrabold text-slate-900">{selectedJournalToPrint.subject}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Guru Pengampu</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">{selectedJournalToPrint.teacherName}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Hari &amp; Tanggal</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">
                          {new Date(selectedJournalToPrint.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Pertemuan Ke</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">{selectedJournalToPrint.pertemuanKe || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Jam Ke</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">{selectedJournalToPrint.jamKe || "-"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Materi / Bahasan</span>
                        <span>:</span>
                        <span className="font-bold text-slate-900">{selectedJournalToPrint.topic}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Catatan KBM</span>
                        <span>:</span>
                        <span className="font-medium text-slate-700 italic">{selectedJournalToPrint.notes || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Alokasi Waktu</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">
                          {selectedJournalToPrint.alokasiWaktu 
                            ? (String(selectedJournalToPrint.alokasiWaktu).toLowerCase().includes('jp')
                              ? selectedJournalToPrint.alokasiWaktu 
                              : `${selectedJournalToPrint.alokasiWaktu} JP`)
                            : "-"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] text-[11px]">
                        <span className="font-bold text-slate-500">Tingkat Absensi</span>
                        <span>:</span>
                        <span className="font-bold text-slate-800">
                          {(() => {
                            const total = selectedJournalToPrint.attendance?.length || 0;
                            const hadir = selectedJournalToPrint.attendance?.filter((a: any) => a.status === 'Hadir' || a.status === 'Terlambat').length || 0;
                            return `${hadir} dari ${total} Siswa Hadir (${total > 0 ? Math.round((hadir / total) * 100) : 100}%)`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Recap */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Rekapitulasi Kehadiran Siswa Jam Pelajaran:
                    </span>
                    <div className="grid grid-cols-4 gap-4 p-4 border border-slate-300 rounded-xl bg-slate-50/50">
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-emerald-800 uppercase">Hadir</span>
                        <span className="block text-base font-extrabold text-emerald-950 mt-1">
                          {selectedJournalToPrint.attendance?.filter((a: any) => a.status === 'Hadir' || a.status === 'Terlambat').length || 0}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-amber-800 uppercase">Sakit</span>
                        <span className="block text-base font-extrabold text-amber-950 mt-1">
                          {selectedJournalToPrint.attendance?.filter((a: any) => a.status === 'Sakit').length || 0}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-indigo-800 uppercase">Izin</span>
                        <span className="block text-base font-extrabold text-indigo-950 mt-1">
                          {selectedJournalToPrint.attendance?.filter((a: any) => a.status === 'Izin').length || 0}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-rose-800 uppercase">Alpa</span>
                        <span className="block text-base font-extrabold text-rose-950 mt-1">
                          {selectedJournalToPrint.attendance?.filter((a: any) => a.status === 'Alpa').length || 0}
                        </span>
                      </div>
                    </div>

                    {/* Non-present list for the printout */}
                    {(() => {
                      const nonPresent = selectedJournalToPrint.attendance?.filter((a: any) => a.status !== 'Hadir' && a.status !== 'Terlambat') || [];
                      if (nonPresent.length > 0) {
                        return (
                          <div className="p-3 border border-slate-300 rounded-xl bg-white text-[10px] leading-relaxed text-slate-750">
                            <span className="font-extrabold text-slate-800 block mb-1">Rincian Siswa Tidak Hadir:</span>
                            {nonPresent.map((a: any, i: number) => (
                              <div key={i} className="flex justify-between border-b border-dashed border-slate-100 py-0.5">
                                <span>{a.studentName}</span>
                                <span className="font-bold text-slate-900 uppercase">
                                  {a.status} {a.notes ? `(${a.notes})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 border border-slate-300 rounded-xl bg-emerald-50 text-emerald-800 text-[10px] text-center font-bold">
                          Nihil (Semua siswa hadir penuh pada jam pelajaran).
                        </div>
                      );
                    })()}
                  </div>

                  {/* Signatures section */}
                  <div className="grid grid-cols-2 gap-8 mt-12 mb-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengetahui,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Wali Kelas {selectedJournalToPrint.className}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{currentTeacher.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">WALI KELAS RESMI</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Tanda Tangan,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Guru Mata Pelajaran</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{selectedJournalToPrint.teacherName}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">GURU MATA PELAJARAN</span>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PRINT OUT JURNAL REKAPITULASI COMPILED */}
      <AnimatePresence>
        {compiledJournalPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-5xl w-full text-slate-900 flex flex-col gap-4 relative my-8"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-indigo-600" />
                  <span className="font-extrabold text-slate-800 text-sm">
                    {compiledJournalPrintType === 'binaan' 
                      ? 'Pratinjau PDF Buku Rekap Jurnal Pembelajaran KBM Kelas' 
                      : 'Pratinjau PDF Buku Rekap Jurnal Mengajar di Kelas Lain'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-950 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>Cetak Sekarang (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompiledJournalPrint(false)}
                    className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-slate-605 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Core report print canvas section */}
              <div className="overflow-y-auto pr-1 max-h-[70vh]">
                <div id="print-report-section" className="bg-white text-slate-950 p-6 rounded-lg font-sans border border-slate-150 flex flex-col gap-6 text-[11px] leading-relaxed relative text-left">
                  
                  {/* Official School Header - Kop Surat */}
                  {schoolIdentity?.letterhead ? (
                    <div className="w-full border-b-4 border-double border-slate-900 pb-2 flex flex-col items-center text-left select-none">
                      <img 
                        src={schoolIdentity.letterhead} 
                        className="w-full h-auto block" 
                        alt="Kop Surat" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="w-full text-right font-mono mt-1 text-[8px] text-slate-400 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-800">
                          {compiledJournalPrintType === 'binaan' 
                            ? 'REKAPITULASI JURNAL MENGAJAR KBM KELAS' 
                            : 'REKAPITULASI JURNAL MENGAJAR KELAS LAIN'
                          }
                        </span>
                        <span>Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b-4 border-double border-slate-900 pb-3 flex justify-between items-center gap-4 text-left">
                      <div className="flex items-center gap-3">
                        {schoolIdentity?.logo && (
                          <img 
                            src={schoolIdentity.logo} 
                            className="w-12 h-12 object-contain" 
                            alt="Logo" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col gap-0.5 text-left font-sans">
                          <span className="text-sm font-black uppercase tracking-wider text-slate-900">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none block">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold mt-1">{schoolIdentity?.accreditation || "Terakreditasi A"} &bull; {schoolIdentity?.address || "Pasuruan, Jawa Timur, Indonesia"}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 font-mono shrink-0">
                        <span className="text-xs font-black text-slate-800">
                          {compiledJournalPrintType === 'binaan' ? 'BUKU KBM KELAS' : 'BUKU JURNAL MENGAJAR'}
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-1">Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  )}

                  {/* Title of Document */}
                  <div className="text-center my-1 text-slate-900">
                    <h2 className="text-sm font-extrabold uppercase tracking-widest underline">
                      {compiledJournalPrintType === 'binaan' 
                        ? 'Buku Rekapitulasi Jurnal Mengajar & KBM Kelas' 
                        : 'Buku Rekapitulasi Jurnal Mengajar di Kelas Lain'
                      }
                    </h2>
                    <p className="text-[9px] text-slate-500 font-semibold font-mono mt-1">
                      {compiledJournalPrintType === 'binaan'
                        ? `Kelas Rujukan: ${currentTeacher.className} • Wali Kelas: ${currentTeacher.name} • Semester Genap • Tahun Ajaran 2025/2026`
                        : `Guru Pengampu: ${currentTeacher.name} • Wali Kelas Rujukan • Semester Genap • Tahun Ajaran 2025/2026`
                      }
                    </p>
                  </div>

                  {/* Summary counts panel */}
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex justify-between items-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    {compiledJournalPrintType === 'binaan' ? (
                      <>
                        <span>Nama Kelas: {currentTeacher.className}</span>
                        <span>Total Jurnal Terdaftar: {binaanJournals.length} Entri Kegiatan</span>
                      </>
                    ) : (
                      <>
                        <span>Guru Pengampu: {currentTeacher.name}</span>
                        <span>Total Jurnal Terdaftar: {kelasLainJournals.length} Entri Kegiatan</span>
                      </>
                    )}
                    <span>Tanggal Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                  </div>

                  {/* Rationale and Instruction */}
                  <div className="flex flex-col gap-2">
                    <table className="w-full border-collapse border border-slate-300 text-[10px] text-slate-800">
                      <thead>
                        <tr className="bg-slate-100 font-extrabold uppercase tracking-wider text-slate-700 text-center">
                          <th className="border border-slate-300 px-2 py-2" style={{ width: '4%' }}>No</th>
                          <th className="border border-slate-300 px-2 py-2" style={{ width: '12%' }}>Hari &amp; Tanggal</th>
                          {compiledJournalPrintType === 'binaan' ? (
                            <>
                              <th className="border border-slate-300 px-2 py-2" style={{ width: '15%' }}>Mata Pelajaran</th>
                              <th className="border border-slate-300 px-2 py-2" style={{ width: '15%' }}>Guru Pengampu</th>
                            </>
                          ) : (
                            <>
                              <th className="border border-slate-300 px-2 py-2" style={{ width: '10%' }}>Kelas</th>
                              <th className="border border-slate-300 px-2 py-2" style={{ width: '17%' }}>Mata Pelajaran</th>
                            </>
                          )}
                          <th className="border border-slate-300 px-1 py-2" style={{ width: '5%' }}>Jam Ke</th>
                          <th className="border border-slate-300 px-1 py-2" style={{ width: '6%' }}>Alokasi</th>
                          <th className="border border-slate-300 px-1 py-2" style={{ width: '7%' }}>Pertemuan Ke</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left" style={{ width: '23%' }}>Materi / Pembahasan Belajar</th>
                          <th className="border border-slate-300 px-2 py-2" style={{ width: '13%' }}>Kehadiran Jam Mapel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(compiledJournalPrintType === 'binaan' ? binaanJournals : kelasLainJournals)
                          .sort((a,b) => b.date.localeCompare(a.date))
                          .map((journal, idx) => {
                            const total = journal.attendance?.length || 0;
                            const h = journal.attendance?.filter((a: any) => a.status === 'Hadir').length || 0;
                            const t = journal.attendance?.filter((a: any) => a.status === 'Terlambat').length || 0;
                            const sakit = journal.attendance?.filter((a: any) => a.status === 'Sakit').length || 0;
                            const izin = journal.attendance?.filter((a: any) => a.status === 'Izin').length || 0;
                            const alpa = journal.attendance?.filter((a: any) => a.status === 'Alpa').length || 0;

                            const isAllHadir = sakit + izin + alpa === 0;

                            return (
                              <tr key={journal.id} className="hover:bg-slate-50/50">
                                <td className="border border-slate-300 px-3 py-1.5 text-center">{idx + 1}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-center font-bold">
                                  {new Date(journal.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                                </td>
                                {compiledJournalPrintType === 'binaan' ? (
                                  <>
                                    <td className="border border-slate-300 px-3 py-1.5 text-center font-extrabold text-slate-900">{journal.subject}</td>
                                    <td className="border border-slate-300 px-3 py-1.5 text-center font-medium text-slate-700">{journal.teacherName}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="border border-slate-300 px-3 py-1.5 text-center font-extrabold text-indigo-950 uppercase">{journal.className}</td>
                                    <td className="border border-slate-300 px-3 py-1.5 text-center font-bold text-slate-900">{journal.subject}</td>
                                  </>
                                )}
                                <td className="border border-slate-300 px-1 py-1.5 text-center font-mono">{journal.jamKe || "-"}</td>
                                <td className="border border-slate-300 px-1 py-1.5 text-center font-mono">
                                  {journal.alokasiWaktu 
                                    ? (String(journal.alokasiWaktu).toLowerCase().includes('jp') 
                                      ? journal.alokasiWaktu 
                                      : `${journal.alokasiWaktu} JP`)
                                    : "-"}
                                </td>
                                <td className="border border-slate-300 px-1 py-1.5 text-center font-mono">{journal.pertemuanKe || "-"}</td>
                                <td className="border border-slate-300 px-3 py-1.5 text-left leading-relaxed font-semibold">
                                  <div>{journal.topic}</div>
                                  {journal.notes && <div className="text-[8.5px] italic text-slate-400 mt-0.5">Note: &ldquo;{journal.notes}&rdquo;</div>}
                                </td>
                                <td className="border border-slate-300 px-2 py-1.5 text-center font-mono text-[9px]">
                                  {isAllHadir ? (
                                    <span className="text-emerald-700 font-bold">LENGKAP ({total})</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mx-auto">
                                      {h + t > 0 && <span className="text-emerald-600 font-semibold text-[8px]">H:{h+t}</span>}
                                      {sakit > 0 && <span className="text-amber-500 font-semibold text-[8px]">S:{sakit}</span>}
                                      {izin > 0 && <span className="text-blue-600 font-semibold text-[8px]">I:{izin}</span>}
                                      {alpa > 0 && <span className="text-rose-600 font-bold text-[8.5px]">A:{alpa}</span>}
                                      {journal.attendance && journal.attendance.filter((st: any) => st.status === 'Sakit' || st.status === 'Izin' || st.status === 'Alpa').length > 0 && (
                                        <div className="w-full text-[7.5px] leading-tight text-slate-500 mt-1 pb-0.5 font-sans border-t border-slate-200/40 pt-1 text-center font-normal">
                                          {journal.attendance
                                            .filter((st: any) => st.status === 'Sakit' || st.status === 'Izin' || st.status === 'Alpa')
                                            .map((st: any) => `${st.studentName} (${st.status.substring(0, 1)})`)
                                            .join(', ')
                                          }
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures section */}
                  <div className="grid grid-cols-2 gap-8 mt-12 mb-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengesahkan Rekap,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">
                        {compiledJournalPrintType === 'binaan' 
                          ? `Wali Kelas ${currentTeacher.className}`
                          : "Guru Mata Pelajaran"
                        }
                      </span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{currentTeacher.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">
                        {compiledJournalPrintType === 'binaan' ? 'WALI KELAS KBM RESMI' : 'GURU MATA PELAJARAN'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">Mengetahui,</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5">Kepala Sekolah {schoolIdentity?.name || "SMP Maarif NU Pandaan"}</span>
                      <div className="h-16" />
                      <span className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-0.5 min-w-[180px]">{schoolIdentity?.principal || "H. Achmad Fauzi, M.Pd"}</span>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">KEPALA SEKOLAH</span>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TAMBAH JURNAL MENGAJAR WALI KELAS */}
      <AnimatePresence>
        {isAddJournalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-slate-50 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="text-left animate-fade-in">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[9px] rounded-full uppercase tracking-wider">
                    Jurnal Mengajar Wali Kelas
                  </span>
                  <h3 className="font-extrabold text-slate-950 text-base mt-0.5">
                    {editingJournalId ? "Edit Jurnal & Presensi Kelas" : "Buat Jurnal & Presensi Kelas"} {journalClassName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddJournalOpen(false)}
                  className="p-1 px-2.5 text-slate-400 hover:text-slate-800 font-bold transition-all hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
                >
                  Tutup
                </button>
              </div>

              {/* Form Content Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:grid lg:grid-cols-12 gap-6">
                
                {/* Left side: Meta details */}
                <div className="lg:col-span-4 flex flex-col gap-4 text-left">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xs">
                    <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <FileText size={14} className="text-emerald-600" />
                      Detail KBM / Bimbingan
                    </h4>

                    {/* Kelas yang Diajarkan */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Kelas yang Diajarkan</label>
                      <select
                        value={journalClassName}
                        onChange={(e) => setJournalClassName(e.target.value)}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer shadow-2xs"
                      >
                        {allClassNames.map(cls => (
                          <option key={cls} value={cls}>
                            Kelas {cls} {cls === currentTeacher.className ? "(Kelas Binaan)" : "(Kelas Lain)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mata Pelajaran / Kegiatan */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Mata Pelajaran / Kegiatan</label>
                      {!isCustomSubject ? (
                        <select
                          value={journalSubject}
                          onChange={(e) => setJournalSubject(e.target.value)}
                          className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer shadow-2xs"
                        >
                          {[
                            'Bimbingan Wali Kelas', 
                            'Matematika', 
                            'IPA', 
                            'IPS', 
                            'Bahasa Indonesia', 
                            'Bahasa Inggris', 
                            'PJOK', 
                            'Pendidikan Agama Islam', 
                            'Seni Budaya', 
                            'Informatika', 
                            'Pendidikan Pancasila', 
                            'Prakarya',
                            'Jam Kelas/Koordinasi', 
                            'Pendidikan Karakter', 
                            'Literasi Mandiri'
                          ].map(tag => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={journalSubject}
                          onChange={(e) => setJournalSubject(e.target.value)}
                          placeholder="Contoh: Bimbingan Wali Kelas, Bahasa Indonesia..."
                          className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 bg-white shadow-2xs"
                        />
                      )}
                      <label className="flex items-center gap-2 mt-1 select-none cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={isCustomSubject}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsCustomSubject(checked);
                            if (!checked) {
                              setJournalSubject('Bimbingan Wali Kelas');
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-300"
                        />
                        <span className="text-[10px] font-bold text-slate-600">Tulis Manual Mata Pelajaran / Kegiatan</span>
                      </label>
                    </div>

                    {/* Tanggal */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tanggal</label>
                      <input
                        type="date"
                        value={journalDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJournalDate(val);
                          setJournalSemester(getSemesterFromDate(val));
                        }}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 bg-white"
                      />
                    </div>

                    {/* Grid Meta */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Fase</label>
                        <select
                          value={journalFase}
                          onChange={(e) => setJournalFase(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D (SMP)</option>
                          <option value="E">E</option>
                          <option value="F">F</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Semester</label>
                        <select
                          value={journalSemester}
                          onChange={(e) => setJournalSemester(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                    </div>

                    {/* Meta Numbers */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Pertemuan Ke</label>
                        <select
                          value={journalPertemuanKe}
                          onChange={(e) => setJournalPertemuanKe(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-805 bg-white cursor-pointer text-center"
                        >
                          <option value="">Pilih</option>
                          {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={String(num)}>{num}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Jam Ke</label>
                        <input
                          type="text"
                          placeholder="misal: 1"
                          value={journalJamKe}
                          onChange={(e) => setJournalJamKe(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-850 bg-white text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Alokasi (JP)</label>
                        <select
                          value={journalAlokasiWaktu}
                          onChange={(e) => setJournalAlokasiWaktu(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-805 bg-white cursor-pointer text-center"
                        >
                          <option value="">Pilih</option>
                          {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={String(num)}>{num} JP</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Topic */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <span>Topik / Pokok Bahasan</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={journalTopic}
                        onChange={(e) => setJournalTopic(e.target.value)}
                        placeholder="Materi utama atau pembahasan..."
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-bold text-xs text-slate-800 bg-white"
                        required
                      />
                    </div>

                    {/* Tujuan Pembelajaran */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tujuan Pembelajaran</label>
                      <textarea
                        value={journalTujuanPembelajaran}
                        onChange={(e) => setJournalTujuanPembelajaran(e.target.value)}
                        placeholder="Tuliskan tujuan pencapaian KBM hari ini..."
                        rows={2}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-semibold text-xs text-slate-805 resize-none font-sans bg-white"
                      />
                    </div>

                    {/* Pencapaian KKTP */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Pecapaian KKTP</label>
                      <select
                        value={journalPencapaianKktp}
                        onChange={(e) => setJournalPencapaianKktp(e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 bg-white cursor-pointer"
                      >
                        <option value="Tercapai">Tercapai</option>
                        <option value="Sebagian Tercapai">Sebagian Tercapai</option>
                        <option value="Belum Tercapai">Belum Tercapai</option>
                      </select>
                    </div>

                    {/* Catatan / Notes */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Catatan KBM Tambahan</label>
                      <textarea
                        value={journalNotes}
                        onChange={(e) => setJournalNotes(e.target.value)}
                        placeholder="Hambatan, tugas, atau rekap khusus..."
                        rows={2}
                        className="px-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-xl font-semibold text-xs text-slate-805 resize-none font-sans bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveHomeroomJournal}
                      disabled={savingJournal || journalStudents.length === 0}
                      className="w-full mt-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-50 border border-emerald-700 flex items-center justify-center gap-1.5"
                    >
                      {savingJournal ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Menyimpan Jurnal...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>{editingJournalId ? "Update Jurnal & Absensi" : "Simpan Jurnal & Absensi"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right side: Student Roster with attendance choices */}
                <div className="lg:col-span-8 flex flex-col gap-4 text-left">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden h-fit flex flex-col">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4 select-none">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <Users size={14} className="text-emerald-500" />
                          Roster Absensi Presensi Siswa
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Tentukan status kehadiran untuk {journalStudents.length} siswa kelas {journalClassName}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const initialMap: Record<string, { status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }> = {};
                          journalStudents.forEach(st => {
                            initialMap[st.id] = { status: 'Hadir', notes: '' };
                          });
                          setJournalAttendanceMap(initialMap);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Check size={11} strokeWidth={3} />
                        Hadir Semua
                      </button>
                    </div>

                    {/* Simple search bar */}
                    <div className="p-3 border-b border-slate-100 bg-white">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari nama siswa..."
                          value={journalSearchQuery}
                          onChange={(e) => setJournalSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-[11px] font-semibold text-slate-805"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Search size={11} />
                        </div>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 bg-white">
                      {journalStudents
                        .filter(s => s.name?.toLowerCase().includes(journalSearchQuery.toLowerCase()) || s.nis?.toLowerCase().includes(journalSearchQuery.toLowerCase()))
                        .map((student, idx) => {
                          const record = journalAttendanceMap[student.id] || { status: 'Hadir', notes: '' };
                          
                          const changeStatus = (newStatus: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa') => {
                            setJournalAttendanceMap(prev => ({
                              ...prev,
                              [student.id]: {
                                ...record,
                                status: newStatus
                              }
                            }));
                          };

                          const changeNote = (newNote: string) => {
                            setJournalAttendanceMap(prev => ({
                              ...prev,
                              [student.id]: {
                                ...record,
                                notes: newNote
                              }
                            }));
                          };

                          return (
                            <div key={student.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/40 transition-colors">
                              <div className="flex items-start gap-2.5 min-w-0 md:w-1/3">
                                <span className="font-bold text-slate-300 text-[10px] w-4 mt-0.5 shrink-0">{idx + 1}</span>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 text-xs truncate leading-tight">{student.name}</p>
                                  <p className="text-[9.5px] text-slate-400 font-mono font-bold mt-0.5">NIS: {student.nis}</p>
                                </div>
                              </div>

                              {/* Toggle items */}
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-150 p-1 rounded-xl w-fit shrink-0">
                                {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map(st => {
                                  let bgClass = 'hover:bg-white text-slate-600';
                                  if (record.status === st) {
                                    if (st === 'Hadir') bgClass = 'bg-emerald-600 text-white shadow-xs';
                                    else if (st === 'Terlambat') bgClass = 'bg-amber-500 text-white shadow-xs';
                                    else if (st === 'Sakit') bgClass = 'bg-sky-500 text-white shadow-xs';
                                    else if (st === 'Izin') bgClass = 'bg-indigo-600 text-white shadow-xs';
                                    else if (st === 'Alpa') bgClass = 'bg-rose-500 text-white shadow-xs';
                                  }
                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => changeStatus(st)}
                                      className={`px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${bgClass}`}
                                    >
                                      {st}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Notes Input */}
                              <div className="md:w-1/3 min-w-0">
                                <input
                                  type="text"
                                  value={record.notes}
                                  onChange={(e) => changeNote(e.target.value)}
                                  placeholder={
                                    record.status === 'Sakit' ? 'Sakit apa (demam dll)...' :
                                    record.status === 'Izin' ? 'Keterangan izin...' :
                                    record.status === 'Terlambat' ? 'Alasan terlambat...' :
                                    'Catatan opsional...'
                                  }
                                  className="w-full px-2.5 py-1 border border-slate-200 focus:outline-none focus:border-slate-800 rounded-lg text-[10px] text-slate-800 bg-white"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
