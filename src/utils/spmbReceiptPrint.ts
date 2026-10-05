import QRCode from 'qrcode';
import { SchoolIdentity, SpmbCandidate, SpmbConfig } from '../types';

/**
 * Konversi angka rupiah ke kalimat terbilang bahasa Indonesia
 */
export function angkaKeTerbilang(nilai: number): string {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  
  if (nilai === 0) return 'Nol Rupiah';
  if (nilai < 0) return 'Minus ' + angkaKeTerbilang(Math.abs(nilai));
  
  function convert(n: number): string {
    if (n < 12) return bilangan[n];
    if (n < 20) return convert(n - 10) + ' Belas';
    if (n < 100) return convert(Math.floor(n / 10)) + ' Puluh ' + convert(n % 10);
    if (n < 200) return 'Seratus ' + convert(n - 100);
    if (n < 1000) return convert(Math.floor(n / 100)) + ' Ratus ' + convert(n % 100);
    if (n < 2000) return 'Seribu ' + convert(n - 1000);
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Ribu ' + convert(n % 1000);
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' Juta ' + convert(n % 1000000);
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + ' Milyar ' + convert(n % 1000000000);
    return '';
  }
  
  return convert(Math.floor(nilai)).replace(/\s+/g, ' ').trim() + ' Rupiah';
}

/**
 * Menghitung rincian biaya pendaftaran ulang dan seragam
 */
export function calculateReRegDetails(
  candidate: SpmbCandidate,
  config: SpmbConfig | null
) {
  const isSyahm = (candidate.nisn || '').trim() === '0156620618' || candidate.id === '0156620618' || candidate.id === 'spmb-cand-0156620618';
  if (isSyahm) {
    const rawUniformTotal = 360000;
    const netUniformTotal = 360000;
    const effectiveJulySppFee = 200000;
    return {
      buildingFee: 2000000,
      discountPercent: 100,
      buildingWaveDiscount: 2000000,
      maarifBuildingDiscount: 0,
      totalBuildingDiscount: 2000000,
      netBuildingFee: 0,
      julySppFee: 200000,
      effectiveJulySppFee,
      isSiblingFreeSpp: false,
      baseFee: 0,
      uniformItems: config?.uniformItems || [],
      rawUniformTotal,
      maarifUniformDiscount: 0,
      sportsUniformBonus: 0,
      hasSportsUniformBonus: false,
      netUniformTotal,
      grandTotal: 560000,
      isMaarif: false,
      isJogosari: false,
      sessionName: 'Jalur Inden'
    };
  }

  const buildingFee = config?.buildingFee || 2000000;
  const julySppFee = config?.julySppFee || 200000;
  const baseFee = config?.reRegistrationBaseFee || 0;

  const genderStr = (candidate.gender === 'L' || (candidate.gender as string) === 'male') ? 'male' : 'female';
  const uniformItems = config?.uniformItems
    ? config.uniformItems.filter(item => item.gender === 'both' || item.gender === genderStr)
    : [];
  const rawUniformTotal = uniformItems.reduce((sum, item) => sum + item.price, 0);

  const isLpMaarif = candidate.schoolOriginType === 'maarif_jogosari' || 
    candidate.schoolOriginType === 'lp_maarif' ||
    (candidate.schoolOrigin && (candidate.schoolOrigin.toUpperCase().includes('MAARIF') || candidate.schoolOrigin.toUpperCase().includes("MA'ARIF"))) ||
    (candidate.schoolOriginType && (candidate.schoolOriginType.toUpperCase().includes('MAARIF') || candidate.schoolOriginType.toUpperCase().includes("MA'ARIF")));

  const isJogosari = candidate.schoolOriginType === 'maarif_jogosari' || 
    (candidate.schoolOrigin && candidate.schoolOrigin.toUpperCase().includes('MAARIF JOGOSARI')) ||
    (candidate.schoolOriginType && candidate.schoolOriginType.toUpperCase().includes('MAARIF JOGOSARI'));

  // Diskon Gelombang Uang Gedung
  const session = config?.sessions?.find(s => s.id === candidate.sessionId);
  const discountPercent = typeof session?.discountPercent === 'number'
    ? session.discountPercent
    : (session?.discountAmount ? Math.round((session.discountAmount / (buildingFee || 1)) * 100) : 0);
  const buildingWaveDiscount = Math.round(buildingFee * (discountPercent / 100));

  // Diskon Uang Gedung SD Maarif Jogosari
  let maarifBuildingDiscount = 0;
  if (isJogosari) {
    if (config?.maarifBuildingDiscountType === 'percent') {
      maarifBuildingDiscount = Math.round(buildingFee * ((config.maarifBuildingDiscount || 0) / 100));
    } else {
      maarifBuildingDiscount = config?.maarifBuildingDiscount || 0;
    }
  }

  const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
  const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);

  // Diskon Seragam SD Maarif Jogosari
  let maarifUniformDiscount = 0;
  if (isJogosari) {
    if (config?.maarifUniformDiscountType === 'percent') {
      maarifUniformDiscount = Math.round(rawUniformTotal * ((config.maarifUniformDiscount || 0) / 100));
    } else {
      maarifUniformDiscount = config?.maarifUniformDiscount || 0;
    }
  }

  // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
  let sportsUniformBonus = 0;
  if (candidate.sessionId === 'inden' && isLpMaarif) {
    const sportsItem = uniformItems.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
    sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
  }

  const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount - sportsUniformBonus);

  // Check Sibling KK Match: Bebas SPP bulan pertama (Juli) pada Sesi Inden
  const isSiblingFreeSpp = Boolean(candidate.sessionId === 'inden' && (candidate.freeFirstMonthSpp || candidate.isSiblingKkMatch));
  const effectiveJulySppFee = isSiblingFreeSpp ? 0 : julySppFee;

  const grandTotal = netBuildingFee + effectiveJulySppFee + baseFee + netUniformTotal;

  return {
    buildingFee,
    discountPercent,
    buildingWaveDiscount,
    maarifBuildingDiscount,
    totalBuildingDiscount,
    netBuildingFee,
    julySppFee,
    effectiveJulySppFee,
    isSiblingFreeSpp,
    baseFee,
    uniformItems,
    rawUniformTotal,
    maarifUniformDiscount,
    sportsUniformBonus,
    hasSportsUniformBonus: sportsUniformBonus > 0,
    netUniformTotal,
    grandTotal,
    isMaarif: isLpMaarif,
    isJogosari,
    sessionName: session?.name || candidate.sessionId || 'Reguler'
  };
}

/**
 * Format tanggal dalam bahasa Indonesia
 */
export function formatIndoDate(dateInput?: string | Date | null): string {
  if (!dateInput) {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Render Header KOP Resmi dari Pengaturan Web Utama
 */
export function renderKopHeaderHtml(schoolIdentity?: SchoolIdentity, academicYear = '2027/2028'): string {
  if (schoolIdentity?.letterhead) {
    return `
      <div class="kop-banner-wrapper">
        <img src="${schoolIdentity.letterhead}" class="kop-banner-img" alt="KOP Resmi Lembaga" referrerPolicy="no-referrer" />
        <div class="kop-double-line"></div>
      </div>
    `;
  }

  // Fallback KOP text resmi jika admin belum upload file KOP
  return `
    <div class="kop-text-header">
      <div class="kop-logo-area">
        ${
          schoolIdentity?.logo
            ? `<img src="${schoolIdentity.logo}" class="kop-logo-img" alt="Logo Sekolah" referrerPolicy="no-referrer" />`
            : `<div class="kop-logo-placeholder">NU</div>`
        }
        <div class="kop-title-area">
          <h2 class="kop-school-name">${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</h2>
          <p class="kop-subheading">${schoolIdentity?.subheading || 'Lembaga Pendidikan Ma’arif Nahdlatul Ulama'}</p>
          <p class="kop-spmb-title">PANITIA SISTEM PENERIMAAN MURID BARU (SPMB) T.A. ${academicYear}</p>
          <p class="kop-meta-info">${schoolIdentity?.accreditation || 'Terakreditasi A'} • ${schoolIdentity?.address || 'Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan'} • Telp: ${schoolIdentity?.phone || '(0343) 631234'}</p>
        </div>
      </div>
      ${
        schoolIdentity?.logo2
          ? `<img src="${schoolIdentity.logo2}" class="kop-logo-img right-logo" alt="Logo Yayasan" referrerPolicy="no-referrer" />`
          : ''
      }
    </div>
    <div class="kop-double-line"></div>
  `;
}

/**
 * Generate HTML Kuitansi Token Lunas
 */
export async function generateTokenReceiptHtml(
  candidate: SpmbCandidate,
  config: SpmbConfig | null,
  schoolIdentity?: SchoolIdentity
): Promise<string> {
  const academicYear = config?.academicYear || '2027/2028';
  const isCollective = candidate.registrationType === 'school_collective';
  const amount = isCollective ? 0 : (candidate.tokenAmount || 50000);
  const terbilangText = isCollective ? 'Nol Rupiah (Gratis Jalur Kolektif Sekolah)' : angkaKeTerbilang(amount);
  
  const receiptNo = `KUI-TKN/${new Date().getFullYear()}/${candidate.nisn || candidate.id.slice(0, 6).toUpperCase()}`;
  const payDateStr = formatIndoDate(candidate.tokenPaidAt);
  const session = config?.sessions?.find(s => s.id === candidate.sessionId);
  const sessionName = session?.name || (candidate.sessionId === 'inden' ? 'Jalur Inden' : candidate.sessionId === 'gelombang-1' ? 'Gelombang 1' : candidate.sessionId === 'gelombang-2' ? 'Gelombang 2' : candidate.sessionId);

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(
      `VALID-SPMB-TOKEN-${candidate.nisn}-${candidate.fullName}-${receiptNo}-${amount}`,
      { width: 120, margin: 1 }
    );
  } catch (e) {
    console.error('QR generation error:', e);
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kuitansi Token SPMB - ${candidate.fullName}</title>
      <style>
        ${getReceiptCss()}
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Official KOP -->
        ${renderKopHeaderHtml(schoolIdentity, academicYear)}

        <!-- Receipt Header Title -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">KUITANSI PEMBAYARAN TOKEN FORMULIR SPMB</h1>
          <div class="receipt-ref-badge">
            <span>NO. KUITANSI: <strong>${receiptNo}</strong></span>
            <span class="status-pill status-paid">LUNAS / VERIFIED</span>
          </div>
        </div>

        <!-- Receipt Body Details -->
        <div class="receipt-body">
          <table class="receipt-table">
            <tr>
              <td class="col-label">Telah Diterima Dari</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${candidate.fullName}</strong> 
                <span class="sub-text">(NISN: ${candidate.nisn})</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Uang Sejumlah</td>
              <td class="col-colon">:</td>
              <td class="col-value amount-box">
                <span class="amount-number">Rp ${amount.toLocaleString('id-ID')}</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Terbilang</td>
              <td class="col-colon">:</td>
              <td class="col-value terbilang-text">
                <em># ${terbilangText} #</em>
              </td>
            </tr>
            <tr>
              <td class="col-label">Untuk Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                Biaya Pembelian Token Akses Formulir Pendaftaran Online SPMB Tahun Ajaran <strong>${academicYear}</strong>
              </td>
            </tr>
            <tr>
              <td class="col-label">Jalur / Sesi Pendaftaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${sessionName}</strong> 
                ${isCollective ? '<span class="badge-tag">Jalur Kolektif SD/MI</span>' : '<span class="badge-tag">Mandiri Online</span>'}
                ${candidate.isTransferredSession ? `<span class="badge-warn">(Dialihkan dari ${candidate.previousSessionId || 'Sesi Sebelumnya'})</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="col-label">Asal Sekolah</td>
              <td class="col-colon">:</td>
              <td class="col-value">${candidate.schoolOrigin || '-'}</td>
            </tr>
            <tr>
              <td class="col-label">No. Transaksi / Order ID</td>
              <td class="col-colon">:</td>
              <td class="col-value mono-text">${candidate.tokenPaymentOrderId || 'KASIR-OFFLINE-PANITIA'}</td>
            </tr>
            <tr>
              <td class="col-label">Tanggal Pelunasan</td>
              <td class="col-colon">:</td>
              <td class="col-value">${payDateStr}</td>
            </tr>
          </table>
        </div>

        <!-- Receipt Signatures (3 Kolom: Pembayar, Panitia Pelayanan Sekolah, & Ketua/Bendahara SPMB dengan Stempel) -->
        <div class="receipt-footer">
          <div class="signature-column">
            <p class="sig-title">Orang Tua / Calon Murid,</p>
            <p class="sig-sub">Pembayar</p>
            <div class="sig-space"></div>
            <p class="sig-name">( ${candidate.parentName || candidate.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${config?.spmbOfficerTitle || 'Pelayanan di Sekolah / Kantor SPMB'}</p>
            <div class="sig-space sig-center-box">
              ${config?.spmbOfficerSignatureUrl ? `<img src="${config.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia Pelayanan" referrerPolicy="no-referrer" />` : ''}
            </div>
            <p class="sig-name">${config?.spmbOfficerName && config.spmbOfficerName.trim() && !config.spmbOfficerName.includes('...') ? `<u>( ${config.spmbOfficerName.trim()} )</u>` : '( .................................... )'}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${payDateStr}</p>
            <p class="sig-sub">${config?.spmbChairTitle || 'Ketua Panitia SPMB'},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${(config?.spmbStampUrl || (schoolIdentity as any)?.schoolStamp || (schoolIdentity as any)?.stamp) ? `<img src="${config?.spmbStampUrl || (schoolIdentity as any)?.schoolStamp || (schoolIdentity as any)?.stamp}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />` : ''}
              ${(config?.spmbChairSignatureUrl || schoolIdentity?.principalSignature) ? `<img src="${config?.spmbChairSignatureUrl || schoolIdentity?.principalSignature}" class="sig-img" alt="Ttd Ketua SPMB" referrerPolicy="no-referrer" />` : ''}
            </div>
            <p class="sig-name"><u>${config?.spmbChairName || schoolIdentity?.principal || 'Ketua Panitia SPMB'}</u></p>
          </div>
        </div>

        <div class="receipt-verify-bar">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" class="qr-image-small" alt="QR Validasi" />` : ''}
          <div class="verify-text">
            <strong>DOKUMEN RESMI & SAH SISTEM INFORMASI AKADEMIK & SPMB</strong>
            <span>Nomor Kuitansi: ${receiptNo} • Tanggal Pelunasan: ${payDateStr}</span>
            <span>Scan QR Code untuk memverifikasi keabsahan pembayaran & dokumen tanda terima resmi.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Kuitansi ini diterbitkan secara sah dan otomatis oleh Sistem Informasi Akademik & SPMB ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML Kuitansi Pembayaran Daftar Ulang & Seragam Lunas
 */
export async function generateReRegReceiptHtml(
  candidate: SpmbCandidate,
  config: SpmbConfig | null,
  schoolIdentity?: SchoolIdentity,
  uniformSize = 'M'
): Promise<string> {
  const academicYear = config?.academicYear || '2027/2028';
  const details = calculateReRegDetails(candidate, config);
  const totalAmount = details.grandTotal;
  const terbilangText = angkaKeTerbilang(totalAmount);
  
  const receiptNo = `KUI-DU/${new Date().getFullYear()}/${candidate.nisn || candidate.id.slice(0, 6).toUpperCase()}`;
  const payDateStr = formatIndoDate(candidate.reRegistrationPaidAt);
  const genderLabel = candidate.gender === 'L' ? 'Putra' : 'Putri';

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(
      `VALID-SPMB-DAFTAR-ULANG-${candidate.nisn}-${candidate.fullName}-${receiptNo}-${totalAmount}`,
      { width: 120, margin: 1 }
    );
  } catch (e) {
    console.error('QR generation error:', e);
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kuitansi Daftar Ulang SPMB - ${candidate.fullName}</title>
      <style>
        ${getReceiptCss()}
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Official KOP -->
        ${renderKopHeaderHtml(schoolIdentity, academicYear)}

        <!-- Receipt Header Title -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">KUITANSI PEMBAYARAN DAFTAR ULANG & SERAGAM</h1>
          <div class="receipt-ref-badge">
            <span>NO. KUITANSI: <strong>${receiptNo}</strong></span>
            <span class="status-pill status-paid">LUNAS / COMPLETED</span>
          </div>
        </div>

        <!-- Receipt Body Details -->
        <div class="receipt-body">
          <table class="receipt-table">
            <tr>
              <td class="col-label">Telah Diterima Dari</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${candidate.fullName}</strong> 
                <span class="sub-text">(NISN: ${candidate.nisn} • ${genderLabel})</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Uang Sejumlah</td>
              <td class="col-colon">:</td>
              <td class="col-value amount-box">
                <span class="amount-number">Rp ${totalAmount.toLocaleString('id-ID')}</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Terbilang</td>
              <td class="col-colon">:</td>
              <td class="col-value terbilang-text">
                <em># ${terbilangText} #</em>
              </td>
            </tr>
            <tr>
              <td class="col-label">Untuk Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                Pelunasan Biaya Daftar Ulang Murid Baru, Uang Gedung, SPP Bulan Juli, dan Paket Seragam & Atribut Sekolah (${genderLabel} - Ukuran: <strong>${uniformSize}</strong>) Tahun Ajaran <strong>${academicYear}</strong>
              </td>
            </tr>
            <tr>
              <td class="col-label">Jalur / Sesi SPMB</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${details.sessionName}</strong>
                ${candidate.schoolOriginType === 'maarif_jogosari' ? '<span class="badge-tag">Khusus SD Maarif Jogosari</span>' : ''}
              </td>
            </tr>
          </table>

          <!-- Breakdown Table -->
          <div class="breakdown-container">
            <h4 class="breakdown-heading">RINCIAN ALOKASI PEMBAYARAN:</h4>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">No</th>
                  <th>Komponen Pembayaran</th>
                  <th style="text-align: right; width: 140px;">Tarif Asli</th>
                  <th style="text-align: right; width: 140px;">Diskon / Potongan</th>
                  <th style="text-align: right; width: 140px;">Nominal Bersih</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td>
                    <strong>Uang Gedung / Infaq Sarpras</strong>
                    ${details.discountPercent > 0 ? `<br><small class="sub-text">• Potongan Gelombang (${details.discountPercent}%)</small>` : ''}
                    ${details.maarifBuildingDiscount > 0 ? `<br><small class="sub-text">• Diskon Khusus SD Maarif Jogosari</small>` : ''}
                  </td>
                  <td style="text-align: right;">Rp ${details.buildingFee.toLocaleString('id-ID')}</td>
                  <td style="text-align: right; color: #047857;">- Rp ${details.totalBuildingDiscount.toLocaleString('id-ID')}</td>
                  <td style="text-align: right; font-weight: bold;">Rp ${details.netBuildingFee.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td>
                    <strong>SPP Bulan Pertama (Juli ${academicYear.split('/')[0]})</strong>
                    ${details.isSiblingFreeSpp ? `<br><small class="sub-text" style="color: #047857; font-weight: bold;">• 🎉 GRATIS: Promo Sesi Inden Saudara Kandung / No. KK Sama</small>` : ''}
                  </td>
                  <td style="text-align: right;">Rp ${details.julySppFee.toLocaleString('id-ID')}</td>
                  <td style="text-align: right; color: ${details.isSiblingFreeSpp ? '#047857' : '#64748b'}; font-weight: ${details.isSiblingFreeSpp ? 'bold' : 'normal'};">
                    ${details.isSiblingFreeSpp ? `- Rp ${details.julySppFee.toLocaleString('id-ID')}` : 'Rp 0'}
                  </td>
                  <td style="text-align: right; font-weight: bold;">Rp ${details.effectiveJulySppFee.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td>
                    <strong>Paket Seragam & Atribut Lengkap (${genderLabel} - Ukuran ${uniformSize})</strong>
                    <br><small class="sub-text">${details.uniformItems.map(u => u.name).join(', ')}</small>
                    ${details.maarifUniformDiscount > 0 ? `<br><small class="sub-text" style="color: #047857;">• Diskon Seragam SD Maarif Jogosari (- Rp ${details.maarifUniformDiscount.toLocaleString('id-ID')})</small>` : ''}
                    ${details.sportsUniformBonus > 0 ? `<br><small class="sub-text" style="color: #047857; font-weight: bold;">• 🎁 BONUS SESI INDEN: 1 Set Seragam Olahraga Gratis (Khusus SD/MI LP. Ma'arif - Senilai Rp ${details.sportsUniformBonus.toLocaleString('id-ID')})</small>` : ''}
                  </td>
                  <td style="text-align: right;">Rp ${details.rawUniformTotal.toLocaleString('id-ID')}</td>
                  <td style="text-align: right; color: #047857;">${(details.maarifUniformDiscount + details.sportsUniformBonus) > 0 ? `- Rp ${(details.maarifUniformDiscount + details.sportsUniformBonus).toLocaleString('id-ID')}` : 'Rp 0'}</td>
                  <td style="text-align: right; font-weight: bold;">Rp ${details.netUniformTotal.toLocaleString('id-ID')}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL PELUNASAN DAFTAR ULANG:</td>
                  <td style="text-align: right; font-weight: 900; font-size: 13px; color: #047857;">
                    Rp ${totalAmount.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Receipt Signatures (3 Kolom: Pembayar, Panitia Pelayanan Sekolah, & Bendahara/Ketua SPMB dengan Stempel) -->
        <div class="receipt-footer">
          <div class="signature-column">
            <p class="sig-title">Orang Tua / Wali Murid,</p>
            <p class="sig-sub">Pembayar</p>
            <div class="sig-space"></div>
            <p class="sig-name">( ${candidate.parentName || candidate.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${config?.spmbOfficerTitle || 'Pelayanan di Sekolah / Kantor SPMB'}</p>
            <div class="sig-space sig-center-box">
              ${config?.spmbOfficerSignatureUrl ? `<img src="${config.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia Pelayanan" referrerPolicy="no-referrer" />` : ''}
            </div>
            <p class="sig-name">${config?.spmbOfficerName && config.spmbOfficerName.trim() && !config.spmbOfficerName.includes('...') ? `<u>( ${config.spmbOfficerName.trim()} )</u>` : '( .................................... )'}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${payDateStr}</p>
            <p class="sig-sub">${config?.spmbTreasurerTitle || config?.spmbChairTitle || 'Bendahara Panitia SPMB'},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${(config?.spmbStampUrl || (schoolIdentity as any)?.schoolStamp || (schoolIdentity as any)?.stamp) ? `<img src="${config?.spmbStampUrl || (schoolIdentity as any)?.schoolStamp || (schoolIdentity as any)?.stamp}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />` : ''}
              ${(config?.spmbTreasurerSignatureUrl || config?.spmbChairSignatureUrl || schoolIdentity?.treasurerSignature || schoolIdentity?.principalSignature) ? `<img src="${config?.spmbTreasurerSignatureUrl || config?.spmbChairSignatureUrl || schoolIdentity?.treasurerSignature || schoolIdentity?.principalSignature}" class="sig-img" alt="Ttd Bendahara SPMB" referrerPolicy="no-referrer" />` : ''}
            </div>
            <p class="sig-name"><u>${config?.spmbTreasurerName || config?.spmbChairName || schoolIdentity?.treasurer || 'Bendahara Panitia SPMB'}</u></p>
          </div>
        </div>

        <div class="receipt-verify-bar">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" class="qr-image-small" alt="QR Validasi" />` : ''}
          <div class="verify-text">
            <strong>DOKUMEN RESMI & SAH SISTEM INFORMASI AKADEMIK & SPMB</strong>
            <span>Nomor Kuitansi: ${receiptNo} • Tanggal Pelunasan: ${payDateStr}</span>
            <span>Scan QR Code untuk memverifikasi keabsahan pembayaran & dokumen tanda terima resmi.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Harap kuitansi ini disimpan sebagai bukti sah pelunasan administrasi Daftar Ulang & Pengambilan Paket Seragam di Koperasi Sekolah.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate official 3x4 Studio Pas Foto SVG Data URI for SPMB Candidate
 * Features: Blue studio background, SMP Maarif uniform with green tie,
 * SMP MA'ARIF chest badge, correct gender styling (putri with white hijab, putra with neat hair),
 * and student identity plate at bottom.
 */
export function generateAuthenticPasPhotoSvgDataUrl(candidate: {
  fullName?: string;
  nisn?: string;
  gender?: 'L' | 'P' | string;
}): string {
  const safeName = (candidate.fullName || "CALON MURID").toUpperCase().trim();
  const safeNisn = candidate.nisn || "-";
  const isFemale = candidate.gender === 'P';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
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

    ${isFemale ? `
      <!-- Jilbab / Hijab Putih Siswi Putri -->
      <path d="M 170 380 C 160 230, 220 190, 300 190 C 380 190, 440 230, 430 380 C 440 500, 420 540, 360 540 C 300 560, 240 540, 170 540 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
      <ellipse cx="300" cy="395" rx="78" ry="100" fill="#fed7aa" />
      <path d="M 222 325 Q 300 290 378 325 Q 300 305 222 325 Z" fill="#f1f5f9" />
    ` : `
      <!-- Telinga Siswa Putra -->
      <ellipse cx="195" cy="405" rx="15" ry="25" fill="#fbd5b5" />
      <ellipse cx="405" cy="405" rx="15" ry="25" fill="#fbd5b5" />

      <!-- Rambut Rapih Murid Putra Sekolah -->
      <path d="M 195 380 C 190 280, 240 250, 300 250 C 360 250, 410 280, 405 380 C 385 320, 350 310, 300 310 C 250 310, 215 320, 195 380 Z" fill="#1e293b" />
      <path d="M 210 320 Q 300 290 390 330 Q 300 270 210 320 Z" fill="#0f172a" />
    `}

    <!-- Alis, Mata, Hidung, Senyum Murid -->
    <path d="M 235 365 Q 260 355 280 365" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
    <path d="M 320 365 Q 340 355 365 365" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
    <ellipse cx="260" cy="390" rx="8" ry="5" fill="#1e293b" />
    <ellipse cx="340" cy="390" rx="8" ry="5" fill="#1e293b" />
    <circle cx="262" cy="388" r="2.5" fill="#ffffff" />
    <circle cx="342" cy="388" r="2.5" fill="#ffffff" />
    <path d="M 297 395 L 293 420 L 307 420" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" />
    <path d="M 275 450 Q 300 465 325 450" fill="none" stroke="#b45309" stroke-width="3" stroke-linecap="round" />

    <!-- Label Identitas Bawah (Plat Nama Foto Murid 3x4) -->
    <rect x="40" y="710" width="520" height="60" rx="12" fill="#0f172a" opacity="0.94" stroke="#38bdf8" stroke-width="1.5" />
    <text x="300" y="735" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${safeName}</text>
    <text x="300" y="756" font-family="monospace, 'Courier New', sans-serif" font-size="11.5" font-weight="700" fill="#38bdf8" text-anchor="middle">NISN: ${safeNisn} • PAS FOTO 3X4 DIGITAL RESMI</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Cetak HTML dokumen secara aman dan bersih menggunakan hidden iframe (mencegah popup blocker di iframe & preview)
 * Menunggu semua elemen gambar (Kop, logo, QR code, pas foto) selesai ter-load sebelum membuka dialog print.
 */
export function printHtmlSafely(html: string) {
  try {
    const iframeId = 'spmb-print-iframe-' + Date.now();
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '1024px';
      iframe.style.height = '1024px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error('[SPMB Print Error]: Gagal memanggil print pada iframe:', printErr);
          fallbackWindowOpenPrint(html);
        }
        setTimeout(() => {
          try {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          } catch (_) {}
        }, 12000);
      };

      // Tunggu semua gambar (logo, kop, pas foto murid, qrcode) selesai dirender
      let isPrinted = false;
      const safeTrigger = () => {
        if (!isPrinted) {
          isPrinted = true;
          triggerPrint();
        }
      };

      const imgs = Array.from(doc.images || []);
      if (imgs.length > 0) {
        let loadedCount = 0;
        const total = imgs.length;
        const checkDone = () => {
          loadedCount++;
          if (loadedCount >= total) {
            setTimeout(safeTrigger, 200);
          }
        };

        imgs.forEach((img) => {
          if (img.complete && img.naturalWidth > 0) {
            checkDone();
          } else {
            img.onload = checkDone;
            img.onerror = checkDone;
          }
        });

        // Fallback batas waktu maksimal 1200ms
        setTimeout(safeTrigger, 1200);
      } else {
        setTimeout(safeTrigger, 300);
      }
      return;
    }
  } catch (err) {
    console.warn('[SPMB Print Warning]: Gagal menggunakan iframe printer, membuka jendela baru:', err);
  }

  fallbackWindowOpenPrint(html);
}

function fallbackWindowOpenPrint(html: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (!printWindow) {
    alert('Jendela cetak tidak dapat dibuka otomatis. Pastikan perizinan popup browser diaktifkan.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 600);
}

/**
 * Generate HTML Tanda Bukti Pendaftaran & Status Penerimaan Calon Murid Baru (A4 Resmi)
 */
export async function generateRegistrationProofHtml(
  candidate: SpmbCandidate,
  config: SpmbConfig | null,
  schoolIdentity?: SchoolIdentity
): Promise<string> {
  const academicYear = config?.academicYear || '2027/2028';
  const regNo = candidate.registrationNo || candidate.registrationNumber || candidate.nisn;
  const genderLabel = candidate.gender === 'L' ? 'Laki-laki (Putra)' : 'Perempuan (Putri)';
  const birthStr = candidate.birthPlace
    ? `${candidate.birthPlace}, ${formatIndoDate(candidate.birthDate)}`
    : formatIndoDate(candidate.birthDate);
  const printDateStr = formatIndoDate(new Date());

  // Ekstraksi komprehensif pas foto calon murid dari berbagai field
  const fallbackPhotoUrl = generateAuthenticPasPhotoSvgDataUrl(candidate);
  let rawPasPhoto = 
    candidate.documents?.pasPhoto || 
    (candidate.documents as any)?.foto ||
    (candidate.documents as any)?.photo ||
    (candidate.documents as any)?.pasFoto ||
    (candidate.documents as any)?.fotoMurid ||
    (candidate.fullFormData as any)?.pasPhoto || 
    (candidate.fullFormData as any)?.documents?.pasPhoto ||
    (candidate as any)?.pasPhoto || 
    (candidate as any)?.foto ||
    (candidate as any)?.photo ||
    candidate.photoUrl || 
    '';

  // Jika belum ada foto atau kosong, gunakan pas foto resmi studio authentic murid
  let pasPhotoUrl = rawPasPhoto || fallbackPhotoUrl;

  // Jika berupa path relatif /uploads/..., ubah jadi absolute origin agar pasti tampil di cetak iframe
  if (pasPhotoUrl && pasPhotoUrl.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
    pasPhotoUrl = `${window.location.origin}${pasPhotoUrl}`;
  }

  const isAccepted = candidate.status === 'accepted' || candidate.reRegistrationStatus === 'paid';
  const statusLabel = isAccepted ? 'DITERIMA RESMI' : 'TERDAFTAR RESMI';
  const statusColor = isAccepted ? '#15803d' : '#0369a1';
  const statusBg = isAccepted ? '#dcfce7' : '#e0f2fe';

  const session = config?.sessions?.find(s => s.id === candidate.sessionId);
  const sessionName = session?.name || (candidate.sessionId === 'inden' ? 'Jalur Inden' : candidate.sessionId === 'gelombang-1' ? 'Gelombang 1' : candidate.sessionId === 'gelombang-2' ? 'Gelombang 2' : candidate.sessionId || 'Reguler');

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(
      `VALID-SPMB-REGISTRATION-${regNo}-${candidate.fullName}-${candidate.status || 'registered'}`,
      { width: 130, margin: 1 }
    );
  } catch (e) {
    console.error('QR generation error:', e);
  }

  const baseOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      ${baseOrigin ? `<base href="${baseOrigin}/" />` : ''}
      <title>Tanda Bukti Pendaftaran SPMB - ${candidate.fullName}</title>
      <style>
        ${getReceiptCss()}
        .card-photo-box {
          width: 110px;
          height: 140px;
          border: 1.5px solid #0f172a;
          border-radius: 6px;
          overflow: hidden;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .card-photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .card-photo-placeholder {
          font-size: 10px;
          color: #64748b;
          text-align: center;
          font-weight: 600;
          padding: 8px;
        }
        .status-badge-lg {
          display: inline-block;
          margin-top: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid currentColor;
        }
        .notes-list {
          margin: 6px 0 0 0;
          padding-left: 18px;
          font-size: 9.5px;
          color: #475569;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- KOP Resmi -->
        ${renderKopHeaderHtml(schoolIdentity, academicYear)}

        <!-- Judul Dokumen Resmi -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">TANDA BUKTI PENDAFTARAN & STATUS PENERIMAAN MURID BARU</h1>
          <div class="receipt-ref-badge">
            <span>NO. REGISTRASI / NISN: <strong>${regNo}</strong></span>
            <span class="status-pill status-paid" style="background:${statusBg}; color:${statusColor}; border-color:${statusColor};">
              ${statusLabel}
            </span>
          </div>
        </div>

        <!-- Biodata Calon Murid -->
        <div class="receipt-body">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <tr>
              <td style="width: 130px; vertical-align: top; text-align: center; padding-right: 14px;">
                <div class="card-photo-box">
                  <img 
                    src="${pasPhotoUrl}" 
                    class="card-photo-img" 
                    alt="Pas Foto 3x4 ${candidate.fullName}" 
                    onerror="this.onerror=null; this.src='${fallbackPhotoUrl}';" 
                  />
                </div>
                <div class="status-badge-lg" style="background:${statusBg}; color:${statusColor};">
                  ${statusLabel}
                </div>
              </td>
              <td style="vertical-align: top;">
                <table class="receipt-table" style="margin-bottom: 0;">
                  <tr>
                    <td class="col-label" style="width: 150px;">Nomor Registrasi / NISN</td>
                    <td class="col-colon">:</td>
                    <td class="col-value"><strong class="mono-text" style="font-size: 12px; color: #047857;">${candidate.nisn || '-'}</strong></td>
                  </tr>
                  <tr>
                    <td class="col-label">Nama Lengkap Murid</td>
                    <td class="col-colon">:</td>
                    <td class="col-value"><strong>${candidate.fullName}</strong> ${candidate.nickname ? `<span class="sub-text">(${candidate.nickname})</span>` : ''}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Jenis Kelamin</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${genderLabel}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Tempat, Tanggal Lahir</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${birthStr}</td>
                  </tr>
                  ${candidate.nik ? `
                  <tr>
                    <td class="col-label">NIK Murid</td>
                    <td class="col-colon">:</td>
                    <td class="col-value mono-text">${candidate.nik}</td>
                  </tr>` : ''}
                  ${candidate.kkNumber ? `
                  <tr>
                    <td class="col-label">No. Kartu Keluarga (KK)</td>
                    <td class="col-colon">:</td>
                    <td class="col-value mono-text">${candidate.kkNumber}</td>
                  </tr>` : ''}
                  <tr>
                    <td class="col-label">Alamat Lengkap</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${candidate.address || '-'}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Asal Sekolah (SD/MI)</td>
                    <td class="col-colon">:</td>
                    <td class="col-value"><strong>${candidate.schoolOrigin || '-'}</strong> ${candidate.schoolOriginType === 'maarif_jogosari' ? '<span class="badge-tag">Khusus Maarif Jogosari</span>' : ''}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Jalur / Sesi SPMB</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">
                      <strong>${sessionName}</strong>
                      <span class="badge-tag">${candidate.registrationType === 'school_collective' ? 'Kolektif Sekolah' : 'Online Mandiri'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="col-label">Orang Tua / Wali</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${candidate.parentName || candidate.fatherName || candidate.motherName || candidate.guardianName || '-'} • Telp/WA: ${candidate.phone || candidate.studentPhone || '-'}</td>
                  </tr>
                  ${candidate.selectedUniformSize ? `
                  <tr>
                    <td class="col-label">Ukuran Seragam</td>
                    <td class="col-colon">:</td>
                    <td class="col-value font-bold">Ukuran ${candidate.selectedUniformSize}</td>
                  </tr>` : ''}
                  <tr>
                    <td class="col-label">Status Administrasi</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">
                      <span style="color: #15803d; font-weight: bold;">• Token Formulir: LUNAS</span>
                      <span style="margin-left: 10px; color: ${candidate.reRegistrationStatus === 'paid' ? '#15803d' : '#b45309'}; font-weight: bold;">
                        • Daftar Ulang: ${candidate.reRegistrationStatus === 'paid' ? 'LUNAS / SELESAI' : 'BELUM LUNAS'}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- Ketentuan & Catatan Penting -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
          <strong style="font-size: 10px; color: #1e293b; text-transform: uppercase;">Petunjuk & Catatan Penting Bagi Calon Murid:</strong>
          <ol class="notes-list">
            <li>Simpan lembar Tanda Bukti Pendaftaran resmi ini dengan baik sebagai identitas sah penerimaan murid baru di <strong>${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</strong>.</li>
            <li>Bagi calon murid yang belum melunasi Daftar Ulang, dimohon menyelesaikan pembayaran melalui portal SPMB online atau langsung di loket pelayanan panitia sebelum batas akhir sesi.</li>
            <li>Pengambilan paket seragam sekolah dan atribut resmi dapat dilakukan di Koperasi Sekolah dengan menunjukkan lembar bukti ini atau kuitansi pelunasan.</li>
          </ol>
        </div>

        <!-- Kolom Tanda Tangan Resmi (3 Kolom) -->
        <div class="receipt-footer">
          <div class="signature-column">
            <p class="sig-title">Orang Tua / Wali Murid,</p>
            <p class="sig-sub">Pendaftar</p>
            <div class="sig-space"></div>
            <p class="sig-name">( ${candidate.parentName || candidate.fatherName || candidate.motherName || candidate.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${config?.spmbOfficerTitle || 'Pelayanan di Sekolah / Kantor SPMB'}</p>
            <div class="sig-space sig-center-box">
              ${config?.spmbOfficerSignatureUrl ? `<img src="${config.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia" referrerPolicy="no-referrer" />` : ''}
            </div>
            <p class="sig-name">${config?.spmbOfficerName && config.spmbOfficerName.trim() && !config.spmbOfficerName.includes('...') ? `<u>( ${config.spmbOfficerName.trim()} )</u>` : '( .................................... )'}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${printDateStr}</p>
            <p class="sig-sub">${config?.spmbChairTitle || 'Ketua Panitia SPMB'},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${(config?.spmbStampUrl || (schoolIdentity as any)?.schoolStamp || (schoolIdentity as any)?.stamp) ? `<img src="${config?.spmbStampUrl || (schoolIdentity as any)?.schoolStamp || (schoolIdentity as any)?.stamp}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />` : ''}
              ${(config?.spmbChairSignatureUrl || schoolIdentity?.principalSignature) ? `<img src="${config?.spmbChairSignatureUrl || schoolIdentity?.principalSignature}" class="sig-img" alt="Ttd Ketua SPMB" referrerPolicy="no-referrer" />` : ''}
            </div>
            <p class="sig-name"><u>${config?.spmbChairName || schoolIdentity?.principal || 'Ketua Panitia SPMB'}</u></p>
          </div>
        </div>

        <!-- Bar Validasi QR & Keabsahan Dokumen -->
        <div class="receipt-verify-bar">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" class="qr-image-small" alt="QR Validasi" />` : ''}
          <div class="verify-text">
            <strong>DOKUMEN RESMI SISTEM PENERIMAAN MURID BARU (SPMB) ONLINE</strong>
            <span>Nomor Registrasi: ${regNo} • Dicetak Pada: ${printDateStr}</span>
            <span>Scan QR Code ini untuk memverifikasi keaslian dan status penerimaan murid baru di database sekolah.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Dokumen ini diterbitkan secara sah melalui Sistem Informasi Akademik & SPMB ${schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Cetak langsung tanda bukti pendaftaran resmi calon murid baru
 */
export async function printRegistrationProofDirect(
  candidate: SpmbCandidate,
  config: SpmbConfig | null,
  schoolIdentity?: SchoolIdentity
) {
  const html = await generateRegistrationProofHtml(candidate, config, schoolIdentity);
  printHtmlSafely(html);
}

/**
 * Buka window cetak / iframe dan langsung cetak kuitansi token / daftar ulang
 */
export async function printSpmbReceiptDirect(
  type: 'token' | 'rereg',
  candidate: SpmbCandidate,
  config: SpmbConfig | null,
  schoolIdentity?: SchoolIdentity,
  uniformSize = 'M'
) {
  let html = '';
  if (type === 'token') {
    html = await generateTokenReceiptHtml(candidate, config, schoolIdentity);
  } else {
    html = await generateReRegReceiptHtml(candidate, config, schoolIdentity, uniformSize);
  }

  printHtmlSafely(html);
}

/**
 * CSS Styling untuk Kuitansi Cetak
 */
export function getReceiptCss(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 10mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .receipt-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    @media print {
      body {
        background: transparent;
      }
      .receipt-container {
        border: none;
        padding: 0;
        max-width: 100%;
      }
    }

    /* KOP STYLING */
    .kop-banner-wrapper {
      width: 100%;
      text-align: center;
      margin-bottom: 8px;
    }
    .kop-banner-img {
      width: 100%;
      max-height: 140px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .kop-text-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 6px;
    }
    .kop-logo-area {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .kop-logo-img {
      height: 64px;
      width: 64px;
      object-fit: contain;
    }
    .kop-logo-img.right-logo {
      height: 60px;
      width: 60px;
    }
    .kop-logo-placeholder {
      width: 54px;
      height: 54px;
      border-radius: 8px;
      background: #047857;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 900;
    }
    .kop-school-name {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .kop-subheading {
      margin: 1px 0 0 0;
      font-size: 10.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .kop-spmb-title {
      margin: 2px 0 0 0;
      font-size: 11px;
      font-weight: 900;
      color: #047857;
      text-transform: uppercase;
    }
    .kop-meta-info {
      margin: 2px 0 0 0;
      font-size: 9px;
      color: #64748b;
    }
    .kop-double-line {
      border-bottom: 3px double #0f172a;
      margin-top: 4px;
      margin-bottom: 12px;
    }

    /* TITLE BOX */
    .receipt-title-box {
      text-align: center;
      margin-bottom: 14px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .receipt-main-title {
      margin: 0;
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
    }
    .receipt-ref-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 4px;
      font-size: 10.5px;
      color: #475569;
      font-family: monospace;
    }
    .status-pill {
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .status-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }

    /* DETAILS TABLE */
    .receipt-body {
      margin-bottom: 16px;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .receipt-table td {
      padding: 4px 6px;
      vertical-align: top;
    }
    .col-label {
      width: 170px;
      color: #475569;
      font-weight: 600;
    }
    .col-colon {
      width: 12px;
      text-align: center;
      font-weight: bold;
    }
    .col-value {
      color: #0f172a;
    }
    .amount-box {
      background: #f0fdf4;
      border: 1px dashed #86efac;
      padding: 4px 10px !important;
      border-radius: 4px;
      display: inline-block;
    }
    .amount-number {
      font-size: 14px;
      font-weight: 900;
      font-family: monospace;
      color: #15803d;
    }
    .terbilang-text {
      font-size: 11px;
      color: #1e293b;
      font-weight: 600;
    }
    .sub-text {
      color: #64748b;
      font-size: 10px;
    }
    .mono-text {
      font-family: monospace;
      font-weight: bold;
    }
    .badge-tag {
      background: #e0e7ff;
      color: #3730a3;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      margin-left: 4px;
    }
    .badge-warn {
      background: #ffe4e6;
      color: #be123c;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      margin-left: 4px;
    }

    /* BREAKDOWN TABLE */
    .breakdown-container {
      margin-top: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .breakdown-heading {
      margin: 0;
      padding: 6px 10px;
      background: #f1f5f9;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .breakdown-table th {
      background: #f8fafc;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
    }
    .breakdown-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .breakdown-table .total-row td {
      background: #f8fafc;
      border-top: 1.5px solid #cbd5e1;
      padding: 8px;
    }

    /* FOOTER SIGNATURES & VERIFICATION */
    .receipt-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
    }
    .signature-column {
      width: 32%;
      text-align: center;
      font-size: 10.5px;
      position: relative;
    }
    .sig-title {
      margin: 0;
      color: #334155;
      font-size: 10.5px;
    }
    .sig-sub {
      margin: 1.5px 0 0 0;
      font-weight: 700;
      color: #0f172a;
      font-size: 10px;
    }
    .sig-space {
      height: 52px;
      position: relative;
    }
    .sig-center-box {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-with-stamp-flex {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img {
      position: absolute;
      height: 50px;
      max-width: 110px;
      object-fit: contain;
      z-index: 2;
    }
    .spmb-stamp-img {
      position: absolute;
      left: 2px;
      top: -6px;
      height: 58px;
      max-width: 80px;
      object-fit: contain;
      opacity: 0.88;
      z-index: 1;
      pointer-events: none;
    }
    .sig-name {
      margin: 0;
      font-weight: 800;
      color: #0f172a;
      font-size: 10.5px;
    }
    .receipt-verify-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      padding: 5px 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .qr-image-small {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .verify-text {
      display: flex;
      flex-direction: column;
      font-size: 8px;
      color: #475569;
      line-height: 1.35;
    }
    .verify-text strong {
      color: #0f172a;
      font-size: 8.5px;
    }
    .receipt-footnote {
      margin-top: 6px;
      font-size: 8px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px dashed #e2e8f0;
      padding-top: 4px;
    }
  `;
}
