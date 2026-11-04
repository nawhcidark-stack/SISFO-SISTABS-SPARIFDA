import{o as e}from"./rolldown-runtime-C0FnF6B9.js";import{Et as t,I as n,Qt as r,X as i,gn as a,mt as o,n as s}from"./vendor-icons-U7zM1c1g.js";import{r as c}from"./vendor-motion-CbPBqh3c.js";import{t as l}from"./browser-VJeGqe__.js";var u=e(a(),1),d=e(l(),1);function f(e){let t=[``,`Satu`,`Dua`,`Tiga`,`Empat`,`Lima`,`Enam`,`Tujuh`,`Delapan`,`Sembilan`,`Sepuluh`,`Sebelas`];if(e===0)return`Nol Rupiah`;if(e<0)return`Minus `+f(Math.abs(e));function n(e){return e<12?t[e]:e<20?n(e-10)+` Belas`:e<100?n(Math.floor(e/10))+` Puluh `+n(e%10):e<200?`Seratus `+n(e-100):e<1e3?n(Math.floor(e/100))+` Ratus `+n(e%100):e<2e3?`Seribu `+n(e-1e3):e<1e6?n(Math.floor(e/1e3))+` Ribu `+n(e%1e3):e<1e9?n(Math.floor(e/1e6))+` Juta `+n(e%1e6):e<0xe8d4a51000?n(Math.floor(e/1e9))+` Milyar `+n(e%1e9):``}return n(Math.floor(e)).replace(/\s+/g,` `).trim()+` Rupiah`}function p(e,t){let n=(e||``).toUpperCase().replace(/['’`]/g,``),r=(t||``).toUpperCase().replace(/['’`]/g,``);return t===`alumni`||r===`ALUMNI`?{type:`alumni`,isJogosari:!1,isLpMaarif:!1,isAlumni:!0,displayName:e&&e.trim().length>0?e.trim():`Alumni Ma'arif`,categoryTag:`Alumni`}:n.includes(`MAARIF JOGOSARI`)||!n&&r.includes(`MAARIF_JOGOSARI`)?{type:`maarif_jogosari`,isJogosari:!0,isLpMaarif:!0,isAlumni:!1,displayName:e&&e.trim().length>0?e.trim():`SD Ma'arif Jogosari`,categoryTag:`Afiliasi Jogosari`}:n.includes(`MAARIF`)||r.includes(`LP_MAARIF`)||r===`MAARIF`?{type:`lp_maarif`,isJogosari:!1,isLpMaarif:!0,isAlumni:!1,displayName:e&&e.trim().length>0?e.trim():`SD/MI LP. Ma'arif`,categoryTag:`LP. Ma'arif`}:{type:`other`,isJogosari:!1,isLpMaarif:!1,isAlumni:!1,displayName:e&&e.trim().length>0?e.trim():`SD Lainnya (Umum)`,categoryTag:`SD Umum`}}function m(e,t){if((e.nisn||``).trim()===`0156620618`||(e.nisn||``).includes(`156620618`)||e.id===`0156620618`||e.id===`spmb-cand-0156620618`||(e.registrationNo||``).trim()===`0156620618`||(e.registrationNumber||``).trim()===`0156620618`||(e.fullName||``).toUpperCase().includes(`SYAHM AZIO`))return{buildingFee:2e6,discountPercent:100,buildingWaveDiscount:2e6,maarifBuildingDiscount:0,totalBuildingDiscount:2e6,netBuildingFee:0,julySppFee:2e5,effectiveJulySppFee:2e5,isSiblingFreeSpp:!1,baseFee:0,uniformItems:t?.uniformItems||[],rawUniformTotal:36e4,maarifUniformDiscount:0,sportsUniformBonus:0,hasSportsUniformBonus:!1,netUniformTotal:36e4,grandTotal:56e4,isMaarif:!1,isJogosari:!1,sessionName:`Jalur Inden`};let n=t?.buildingFee||2e6,r=t?.julySppFee||2e5,i=t?.reRegistrationBaseFee||0,a=e.gender===`L`||e.gender===`male`?`male`:`female`,o=t?.uniformItems?t.uniformItems.filter(e=>e.gender===`both`||e.gender===a):[],s=o.reduce((e,t)=>e+t.price,0),c=p(e.schoolOrigin,e.schoolOriginType),l=c.isLpMaarif,u=c.isJogosari,d=t?.sessions?.find(t=>t.id===e.sessionId),f=typeof d?.discountPercent==`number`?d.discountPercent:d?.discountAmount?Math.round(d.discountAmount/(n||1)*100):0,m=Math.round(f/100*n),h=0;u&&(h=t?.maarifBuildingDiscountType===`percent`?Math.round(n*((t.maarifBuildingDiscount||0)/100)):t?.maarifBuildingDiscount||0);let g=Math.min(n,m+h),_=Math.max(0,n-g),v=0;u&&(v=t?.maarifUniformDiscountType===`percent`?Math.round(s*((t.maarifUniformDiscount||0)/100)):t?.maarifUniformDiscount||0);let y=0;if(e.sessionId===`inden`&&l){let e=o.find(e=>e.id===`u-1`||e.name.toLowerCase().includes(`olahraga`));y=e?e.price:125e3}let b=Math.max(0,s-v-y),x=!!(e.sessionId===`inden`&&(e.freeFirstMonthSpp||e.isSiblingKkMatch)),S=x?0:r,C=_+S+i+b;return{buildingFee:n,discountPercent:f,buildingWaveDiscount:m,maarifBuildingDiscount:h,totalBuildingDiscount:g,netBuildingFee:_,julySppFee:r,effectiveJulySppFee:S,isSiblingFreeSpp:x,baseFee:i,uniformItems:o,rawUniformTotal:s,maarifUniformDiscount:v,sportsUniformBonus:y,hasSportsUniformBonus:y>0,netUniformTotal:b,grandTotal:C,isMaarif:l,isJogosari:u,sessionName:d?.name||e.sessionId||`Reguler`}}function h(e){if(!e)return new Date().toLocaleDateString(`id-ID`,{day:`numeric`,month:`long`,year:`numeric`});let t=new Date(e);return isNaN(t.getTime())?new Date().toLocaleDateString(`id-ID`,{day:`numeric`,month:`long`,year:`numeric`}):t.toLocaleDateString(`id-ID`,{day:`numeric`,month:`long`,year:`numeric`})}function g(e,t=`2027/2028`){return e?.letterhead?`
      <div class="kop-banner-wrapper">
        <img src="${e.letterhead}" class="kop-banner-img" alt="KOP Resmi Lembaga" referrerPolicy="no-referrer" />
        <div class="kop-double-line"></div>
      </div>
    `:`
    <div class="kop-text-header">
      <div class="kop-logo-area">
        ${e?.logo?`<img src="${e.logo}" class="kop-logo-img" alt="Logo Sekolah" referrerPolicy="no-referrer" />`:`<div class="kop-logo-placeholder">NU</div>`}
        <div class="kop-title-area">
          <h2 class="kop-school-name">${e?.name||`SMP MA'ARIF NU PANDAAN`}</h2>
          <p class="kop-subheading">${e?.subheading||`Lembaga Pendidikan Ma’arif Nahdlatul Ulama`}</p>
          <p class="kop-spmb-title">PANITIA SISTEM PENERIMAAN MURID BARU (SPMB) T.A. ${t}</p>
          <p class="kop-meta-info">${e?.accreditation||`Terakreditasi A`} • ${e?.address||`Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan`} • Telp: ${e?.phone||`(0343) 631234`}</p>
        </div>
      </div>
      ${e?.logo2?`<img src="${e.logo2}" class="kop-logo-img right-logo" alt="Logo Yayasan" referrerPolicy="no-referrer" />`:``}
    </div>
    <div class="kop-double-line"></div>
  `}function _(e,t,n){let r=(e||``).trim(),i=(t||``).trim().toLowerCase(),a=(n?.orderId||``).trim().toUpperCase();if(n?.isCollective&&(!r||r.toLowerCase().includes(`kolektif`)||r.toLowerCase().includes(`gratis`)))return{displayMethod:`Gratis (Jalur Kolektif SD/MI)`,isCash:!1,isOnline:!1,isFree:!0};if(r.toLowerCase().includes(`beasiswa`)||r.toLowerCase().includes(`diskon 100%`))return{displayMethod:`Beasiswa Penuh (Diskon 100%)`,isCash:!1,isOnline:!1,isFree:!0};if(n?.isCashAtSchool||i===`cash_school`||i===`cash`||r.toLowerCase().includes(`tunai`)||r.toLowerCase().includes(`cash`)||r.toLowerCase().includes(`loket`)||r.toLowerCase().includes(`sekolah`)||a.startsWith(`TUNAI-`)||a.startsWith(`KASIR-`))return{displayMethod:`Tunai (Pembayaran di Sekolah)`,isCash:!0,isOnline:!1,isFree:!1};if(r){let e=r.toLowerCase(),t=``;if(n?.vaNumbers&&n.vaNumbers.length>0&&n.vaNumbers[0].bank&&(t=n.vaNumbers[0].bank.toUpperCase()),e.includes(`qris`)||i===`qris`)return{displayMethod:`Midtrans (QRIS)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`gopay`)||i===`gopay`)return{displayMethod:`Midtrans (GoPay / QRIS)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`shopeepay`)||i===`shopeepay`)return{displayMethod:`Midtrans (ShopeePay)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`bca`)||i===`bca_va`)return{displayMethod:`Midtrans (BCA Virtual Account)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`bni`)||i===`bni_va`)return{displayMethod:`Midtrans (BNI Virtual Account)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`bri`)||i===`bri_va`)return{displayMethod:`Midtrans (BRI Virtual Account)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`mandiri`)||e.includes(`echannel`)||i===`echannel`)return{displayMethod:`Midtrans (Mandiri Bill / VA)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`permata`)||i===`permata_va`)return{displayMethod:`Midtrans (Permata Virtual Account)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`cimb`)||i===`cimb_va`)return{displayMethod:`Midtrans (CIMB Niaga VA)`,isCash:!1,isOnline:!0,isFree:!1};if(e.includes(`bank_transfer`)||e.includes(`virtual account`)||e.includes(`va`)){let e=[`BCA`,`BNI`,`BRI`,`MANDIRI`,`PERMATA`,`CIMB`].find(e=>r.toUpperCase().includes(e))||t;return{displayMethod:`Midtrans${e?` (${e} Virtual Account)`:` (Bank Transfer / VA)`}`,isCash:!1,isOnline:!0,isFree:!1}}return e.includes(`cstore`)||e.includes(`indomaret`)||e.includes(`alfamart`)?{displayMethod:`Midtrans (${e.includes(`indomaret`)?`Indomaret`:e.includes(`alfamart`)?`Alfamart`:`Gerai Retail`})`,isCash:!1,isOnline:!0,isFree:!1}:e.includes(`credit_card`)||e.includes(`kartu kredit`)?{displayMethod:`Midtrans (Kartu Kredit / Debit Online)`,isCash:!1,isOnline:!0,isFree:!1}:r.startsWith(`Midtrans (`)||e.includes(`midtrans`)?{displayMethod:r,isCash:!1,isOnline:!0,isFree:!1}:{displayMethod:`Midtrans (${r})`,isCash:!1,isOnline:!0,isFree:!1}}return a.startsWith(`SPMB-`)||a.startsWith(`TRX-`)?{displayMethod:`Midtrans Online`,isCash:!1,isOnline:!0,isFree:!1}:{displayMethod:n?.defaultLabel||`Tunai (Pembayaran di Sekolah)`,isCash:!0,isOnline:!1,isFree:!1}}async function v(e,t,n){let r=t?.academicYear||`2027/2028`,i=e.registrationType===`school_collective`,a=i?0:e.tokenAmount||5e4,o=i?`Nol Rupiah (Gratis Jalur Kolektif Sekolah)`:f(a),s=`KUI-TKN/${new Date().getFullYear()}/${e.nisn||e.id.slice(0,6).toUpperCase()}`,c=h(e.tokenPaidAt),l=t?.sessions?.find(t=>t.id===e.sessionId)?.name||(e.sessionId===`inden`?`Jalur Inden`:e.sessionId===`gelombang-1`?`Gelombang 1`:e.sessionId===`gelombang-2`?`Gelombang 2`:e.sessionId),u=_(e.tokenPaymentMethod,e.tokenPaymentType,{isCollective:i,orderId:e.tokenPaymentOrderId,vaNumbers:e.tokenVaNumbers,defaultLabel:`Tunai (Pembayaran di Sekolah)`}),p=``;try{p=await d.toDataURL(`VALID-SPMB-TOKEN-${e.nisn}-${e.fullName}-${s}-${a}-${u.displayMethod}`,{width:120,margin:1})}catch(e){console.error(`QR generation error:`,e)}return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kuitansi Token SPMB - ${e.fullName}</title>
      <style>
        ${D()}
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Official KOP -->
        ${g(n,r)}

        <!-- Receipt Header Title -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">KUITANSI PEMBAYARAN TOKEN FORMULIR SPMB</h1>
          <div class="receipt-ref-badge">
            <span>NO. KUITANSI: <strong>${s}</strong></span>
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
                <strong>${e.fullName}</strong> 
                <span class="sub-text">(NISN: ${e.nisn})</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Uang Sejumlah</td>
              <td class="col-colon">:</td>
              <td class="col-value amount-box">
                <span class="amount-number">Rp ${a.toLocaleString(`id-ID`)}</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Terbilang</td>
              <td class="col-colon">:</td>
              <td class="col-value terbilang-text">
                <em># ${o} #</em>
              </td>
            </tr>
            <tr>
              <td class="col-label">Untuk Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                Biaya Pembelian Token Akses Formulir Pendaftaran Online SPMB Tahun Ajaran <strong>${r}</strong>
              </td>
            </tr>
            <tr>
              <td class="col-label">Metode Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong style="color: ${u.isCash?`#047857`:`#1d4ed8`};">${u.displayMethod}</strong>
                ${u.isCash?`<span class="badge-tag" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; margin-left:6px; font-size:9.5px;">PEMBAYARAN TUNAI DI SEKOLAH</span>`:`<span class="badge-tag" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; margin-left:6px; font-size:9.5px;">MIDTRANS ONLINE</span>`}
              </td>
            </tr>
            <tr>
              <td class="col-label">Jalur / Sesi Pendaftaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${l}</strong> 
                ${i?`<span class="badge-tag">Jalur Kolektif SD/MI</span>`:`<span class="badge-tag">Mandiri Online</span>`}
                ${e.isTransferredSession?`<span class="badge-warn">(Dialihkan dari ${e.previousSessionId||`Sesi Sebelumnya`})</span>`:``}
              </td>
            </tr>
            <tr>
              <td class="col-label">Asal Sekolah</td>
              <td class="col-colon">:</td>
              <td class="col-value">${e.schoolOrigin||`-`}</td>
            </tr>
            <tr>
              <td class="col-label">No. Transaksi / Order ID</td>
              <td class="col-colon">:</td>
              <td class="col-value mono-text">${e.tokenPaymentOrderId||(u.isCash?`KASIR-TUNAI-SEKOLAH`:`MIDTRANS-GATEWAY`)}</td>
            </tr>
            <tr>
              <td class="col-label">Tanggal Pelunasan</td>
              <td class="col-colon">:</td>
              <td class="col-value">${c}</td>
            </tr>
          </table>
        </div>

        <!-- Receipt Signatures (3 Kolom: Pembayar, Panitia Pelayanan Sekolah, & Ketua/Bendahara SPMB dengan Stempel) -->
        <div class="receipt-footer">
          <div class="signature-column">
            <p class="sig-title">Orang Tua / Calon Murid,</p>
            <p class="sig-sub">Pembayar</p>
            <div class="sig-space"></div>
            <p class="sig-name">( ${e.parentName||e.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${t?.spmbOfficerTitle||`Pelayanan di Sekolah / Kantor SPMB`}</p>
            <div class="sig-space sig-center-box">
              ${t?.spmbOfficerSignatureUrl?`<img src="${t.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia Pelayanan" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name">${t?.spmbOfficerName&&t.spmbOfficerName.trim()&&!t.spmbOfficerName.includes(`...`)?`<u>( ${t.spmbOfficerName.trim()} )</u>`:`( .................................... )`}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${c}</p>
            <p class="sig-sub">${t?.spmbChairTitle||`Ketua Panitia SPMB`},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${t?.spmbStampUrl||n?.schoolStamp||n?.stamp?`<img src="${t?.spmbStampUrl||n?.schoolStamp||n?.stamp}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />`:``}
              ${t?.spmbChairSignatureUrl||n?.principalSignature?`<img src="${t?.spmbChairSignatureUrl||n?.principalSignature}" class="sig-img" alt="Ttd Ketua SPMB" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name"><u>${t?.spmbChairName||n?.principal||`Ketua Panitia SPMB`}</u></p>
          </div>
        </div>

        <div class="receipt-verify-bar">
          ${p?`<img src="${p}" class="qr-image-small" alt="QR Validasi" />`:``}
          <div class="verify-text">
            <strong>DOKUMEN RESMI & SAH SISTEM INFORMASI AKADEMIK & SPMB</strong>
            <span>Nomor Kuitansi: ${s} • Tanggal Pelunasan: ${c}</span>
            <span>Scan QR Code untuk memverifikasi keabsahan pembayaran & dokumen tanda terima resmi.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Kuitansi ini diterbitkan secara sah dan otomatis oleh Sistem Informasi Akademik & SPMB ${n?.name||`SMP MA'ARIF NU PANDAAN`}.</em></p>
        </div>
      </div>
    </body>
    </html>
  `}async function y(e,t,n){let r=t?.academicYear||`2027/2028`,i=e.tokenAmount||e.tokenFee||5e4,a=f(i),o=`TGH-TKN/${new Date().getFullYear()}/${e.nisn||e.id.slice(0,6).toUpperCase()}`,s=t?.sessions?.find(t=>t.id===e.sessionId)?.name||(e.sessionId===`inden`?`Jalur Inden`:e.sessionId===`gelombang-1`?`Gelombang 1`:e.sessionId===`gelombang-2`?`Gelombang 2`:e.sessionId),c=e.cashPaymentDeadline||e.tokenExpiryTime?e.cashPaymentDeadline||e.tokenExpiryTime:`3 Hari Sejak Pemilihan Bayar Tunai`,l=``;try{l=await d.toDataURL(`TAGIHAN-SPMB-TOKEN-${e.nisn}-${e.fullName}-${o}-${i}-TUNAI-SEKOLAH`,{width:120,margin:1})}catch(e){console.error(`QR generation error:`,e)}return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Tagihan Token SPMB - ${e.fullName}</title>
      <style>
        ${D()}
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Official KOP -->
        ${g(n,r)}

        <!-- Receipt Header Title -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">BUKTI PENDAFTARAN & TAGIHAN PEMBAYARAN TOKEN FORMULIR SPMB</h1>
          <div class="receipt-ref-badge">
            <span>NO. TAGIHAN: <strong>${o}</strong></span>
            <span class="status-pill" style="background:#fef3c7; color:#92400e; border:1px solid #f59e0b; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 10px;">MENUNGGU PEMBAYARAN TUNAI DI SEKOLAH</span>
          </div>
        </div>

        <!-- Receipt Body Details -->
        <div class="receipt-body">
          <table class="receipt-table">
            <tr>
              <td class="col-label">Nama Calon Murid</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${e.fullName}</strong> 
                <span class="sub-text">(NISN: ${e.nisn})</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Asal Sekolah (SD/MI)</td>
              <td class="col-colon">:</td>
              <td class="col-value">${e.schoolOrigin||e.originSchool||`-`}</td>
            </tr>
            <tr>
              <td class="col-label">Jalur / Gelombang</td>
              <td class="col-colon">:</td>
              <td class="col-value"><strong>${s}</strong></td>
            </tr>
            <tr>
              <td class="col-label">Total Tagihan Token</td>
              <td class="col-colon">:</td>
              <td class="col-value amount-box">
                <span class="amount-number">Rp ${i.toLocaleString(`id-ID`)}</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Terbilang</td>
              <td class="col-colon">:</td>
              <td class="col-value terbilang-text">
                <em># ${a} #</em>
              </td>
            </tr>
            <tr>
              <td class="col-label">Metode Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong style="color: #047857;">Tunai (Pembayaran di Loket SPMB Sekolah)</strong>
                <span class="badge-tag" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; margin-left:6px; font-size:9.5px; padding: 2px 6px; border-radius: 4px;">TENGGANG WAKTU 3 HARI</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Batas Waktu Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value" style="color: #b45309; font-weight: 800;">
                ${c?c.replace(` `,` • Jam `)+` WIB`:`3 Hari Sejak Registrasi`}
                <div style="font-size: 10px; color: #dc2626; font-weight: 600; margin-top: 3px;">
                  * Perhatian: Pembayaran harus diselesaikan maksimal dalam 3 hari. Jika setelah 3 hari belum dibayar, data pendaftaran akan otomatis dihapus oleh sistem.
                </div>
              </td>
            </tr>
            <tr>
              <td class="col-label">Tempat Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>Kantor / Loket SPMB SMP Ma'arif NU Pandaan</strong><br/>
                <span style="font-size: 10.5px; color: #475569;">${n?.address||`Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan`} (Pelayanan: Senin - Sabtu, 07.30 - 14.00 WIB)</span>
              </td>
            </tr>
          </table>

          <div style="margin-top: 14px; padding: 10px 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 10.5px; line-height: 1.5; color: #334155;">
            <strong style="color: #0f172a;">Petunjuk Pembayaran di Sekolah:</strong>
            <ol style="margin: 4px 0 0 16px; padding: 0;">
              <li>Cetak lembar bukti/tagihan ini atau simpan tangkapan layarnya pada ponsel Anda.</li>
              <li>Tunjukkan bukti/tagihan ini atau sebutkan <strong>NISN: ${e.nisn}</strong> kepada Petugas Loket SPMB.</li>
              <li>Bayarkan uang tunai sejumlah <strong>Rp ${i.toLocaleString(`id-ID`)}</strong> kepada Petugas Loket SPMB sebelum batas waktu 3 hari berakhir.</li>
              <li>Petugas SPMB akan mengkonfirmasi pelunasan dan mengaktifkan akun Anda untuk pengisian formulir biodata lengkap dan berkas fisik.</li>
            </ol>
          </div>
        </div>

        <!-- Receipt Signatures -->
        <div class="receipt-footer">
          <div class="signature-column">
            <p class="sig-title">Orang Tua / Calon Murid,</p>
            <p class="sig-sub">Pendaftar</p>
            <div class="sig-space"></div>
            <p class="sig-name">( ${e.parentName||e.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${t?.spmbOfficerTitle||`Pelayanan di Sekolah / Kantor SPMB`}</p>
            <div class="sig-space sig-center-box">
              ${t?.spmbOfficerSignatureUrl?`<img src="${t.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name">${t?.spmbOfficerName&&t.spmbOfficerName.trim()&&!t.spmbOfficerName.includes(`...`)?`<u>( ${t.spmbOfficerName.trim()} )</u>`:`( Petugas Loket SPMB )`}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${h(new Date().toISOString())}</p>
            <p class="sig-sub">${t?.spmbChairTitle||`Ketua Panitia SPMB`},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${t?.spmbStampUrl||n?.schoolStamp||n?.stamp?`<img src="${t?.spmbStampUrl||n?.schoolStamp||n?.stamp}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />`:``}
              ${t?.spmbChairSignatureUrl||n?.principalSignature?`<img src="${t?.spmbChairSignatureUrl||n?.principalSignature}" class="sig-img" alt="Ttd Ketua SPMB" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name"><u>${t?.spmbChairName||n?.principal||`Ketua Panitia SPMB`}</u></p>
          </div>
        </div>

        <div class="receipt-verify-bar">
          ${l?`<img src="${l}" class="qr-image-small" alt="QR Validasi" />`:``}
          <div class="verify-text">
            <strong>DOKUMEN RESMI BUKTI PENDAFTARAN & TAGIHAN SPMB</strong>
            <span>Nomor Tagihan: ${o} • NISN: ${e.nisn}</span>
            <span>Bawa dokumen ini ke Loket SPMB Sekolah untuk menyelesaikan pembayaran token pendaftaran.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Dokumen tagihan ini diterbitkan secara resmi oleh Sistem Informasi Akademik & SPMB ${n?.name||`SMP MA'ARIF NU PANDAAN`}.</em></p>
        </div>
      </div>
    </body>
    </html>
  `}async function b(e,t,n,r=`M`){let i=n;if((!i||!i.treasurerSignature)&&typeof window<`u`)try{let e=await fetch(`/api/school-identity?_t=${Date.now()}`);if(e.ok){let t=await e.json();i={...i||{},...t}}}catch{}let a=i?.treasurerSignature||t?.spmbTreasurerSignatureUrl||t?.spmbChairSignatureUrl||i?.principalSignature||``,o=i?.treasurer||t?.spmbTreasurerName||t?.spmbChairName||`Bendahara Sekolah`,s=t?.spmbTreasurerStampUrl||t?.spmbStampUrl||i?.schoolStamp||i?.stamp||``,c=t?.academicYear||`2027/2028`,l=m(e,t),u=l.grandTotal,p=f(u),v=`KUI-DU/${new Date().getFullYear()}/${e.nisn||e.id.slice(0,6).toUpperCase()}`,y=h(e.reRegistrationPaidAt),b=e.gender===`L`?`Putra`:`Putri`,x=_(e.reRegistrationPaymentMethod||e.reRegistrationMethod,void 0,{orderId:e.reRegistrationOrderId,defaultLabel:`Tunai (Pembayaran di Sekolah)`}),S=``;try{S=await d.toDataURL(`VALID-SPMB-DAFTAR-ULANG-${e.nisn}-${e.fullName}-${v}-${u}-${x.displayMethod}`,{width:120,margin:1})}catch(e){console.error(`QR generation error:`,e)}return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kuitansi Daftar Ulang SPMB - ${e.fullName}</title>
      <style>
        ${D()}
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Official KOP -->
        ${g(n,c)}

        <!-- Receipt Header Title -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">KUITANSI PEMBAYARAN DAFTAR ULANG & SERAGAM</h1>
          <div class="receipt-ref-badge">
            <span>NO. KUITANSI: <strong>${v}</strong></span>
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
                <strong>${e.fullName}</strong> 
                <span class="sub-text">(NISN: ${e.nisn} • ${b})</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Uang Sejumlah</td>
              <td class="col-colon">:</td>
              <td class="col-value amount-box">
                <span class="amount-number">Rp ${u.toLocaleString(`id-ID`)}</span>
              </td>
            </tr>
            <tr>
              <td class="col-label">Terbilang</td>
              <td class="col-colon">:</td>
              <td class="col-value terbilang-text">
                <em># ${p} #</em>
              </td>
            </tr>
            <tr>
              <td class="col-label">Untuk Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                Pelunasan Biaya Daftar Ulang Murid Baru, Uang Gedung, SPP Bulan Juli, dan Paket Seragam & Atribut Sekolah (${b}) Tahun Ajaran <strong>${c}</strong>
              </td>
            </tr>
            <tr>
              <td class="col-label">Metode Pembayaran</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong style="color: ${x.isCash?`#047857`:`#1d4ed8`};">${x.displayMethod}</strong>
                ${x.isCash?`<span class="badge-tag" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; margin-left:6px; font-size:9.5px;">PEMBAYARAN TUNAI DI SEKOLAH</span>`:`<span class="badge-tag" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; margin-left:6px; font-size:9.5px;">MIDTRANS ONLINE</span>`}
              </td>
            </tr>
            <tr>
              <td class="col-label">Jalur / Sesi SPMB</td>
              <td class="col-colon">:</td>
              <td class="col-value">
                <strong>${l.sessionName}</strong>
                ${l.isJogosari?`<span class="badge-tag">Khusus SD Maarif Jogosari</span>`:l.isMaarif?`<span class="badge-tag" style="background:#e0f2fe;color:#0369a1;">LP. Ma'arif</span>`:``}
              </td>
            </tr>
            <tr>
              <td class="col-label">No. Transaksi / Order ID</td>
              <td class="col-colon">:</td>
              <td class="col-value mono-text">${e.reRegistrationOrderId||(x.isCash?`KASIR-TUNAI-SEKOLAH`:`MIDTRANS-GATEWAY`)}</td>
            </tr>
            <tr>
              <td class="col-label">Tanggal Pelunasan</td>
              <td class="col-colon">:</td>
              <td class="col-value">${y}</td>
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
                    ${l.discountPercent>0?`<br><small class="sub-text">• Potongan Gelombang (${l.discountPercent}%)</small>`:``}
                    ${l.maarifBuildingDiscount>0?`<br><small class="sub-text">• Diskon Khusus SD Maarif Jogosari</small>`:``}
                  </td>
                  <td style="text-align: right;">Rp ${l.buildingFee.toLocaleString(`id-ID`)}</td>
                  <td style="text-align: right; color: #047857;">- Rp ${l.totalBuildingDiscount.toLocaleString(`id-ID`)}</td>
                  <td style="text-align: right; font-weight: bold;">Rp ${l.netBuildingFee.toLocaleString(`id-ID`)}</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td>
                    <strong>SPP Bulan Pertama (Juli ${c.split(`/`)[0]})</strong>
                    ${l.isSiblingFreeSpp?`<br><small class="sub-text" style="color: #047857; font-weight: bold;">• 🎉 GRATIS: Promo Sesi Inden Saudara Kandung / No. KK Sama</small>`:``}
                  </td>
                  <td style="text-align: right;">Rp ${l.julySppFee.toLocaleString(`id-ID`)}</td>
                  <td style="text-align: right; color: ${l.isSiblingFreeSpp?`#047857`:`#64748b`}; font-weight: ${l.isSiblingFreeSpp?`bold`:`normal`};">
                    ${l.isSiblingFreeSpp?`- Rp ${l.julySppFee.toLocaleString(`id-ID`)}`:`Rp 0`}
                  </td>
                  <td style="text-align: right; font-weight: bold;">Rp ${l.effectiveJulySppFee.toLocaleString(`id-ID`)}</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td>
                    <strong>Paket Seragam & Atribut Lengkap (${b})</strong>
                    <br><small class="sub-text">${l.uniformItems.map(e=>e.name).join(`, `)}</small>
                    ${l.maarifUniformDiscount>0?`<br><small class="sub-text" style="color: #047857;">• Diskon Seragam SD Maarif Jogosari (- Rp ${l.maarifUniformDiscount.toLocaleString(`id-ID`)})</small>`:``}
                    ${l.sportsUniformBonus>0?`<br><small class="sub-text" style="color: #047857; font-weight: bold;">• 🎁 BONUS SESI INDEN: 1 Set Seragam Olahraga Gratis (Khusus SD/MI LP. Ma'arif - Senilai Rp ${l.sportsUniformBonus.toLocaleString(`id-ID`)})</small>`:``}
                  </td>
                  <td style="text-align: right;">Rp ${l.rawUniformTotal.toLocaleString(`id-ID`)}</td>
                  <td style="text-align: right; color: #047857;">${l.maarifUniformDiscount+l.sportsUniformBonus>0?`- Rp ${(l.maarifUniformDiscount+l.sportsUniformBonus).toLocaleString(`id-ID`)}`:`Rp 0`}</td>
                  <td style="text-align: right; font-weight: bold;">Rp ${l.netUniformTotal.toLocaleString(`id-ID`)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL PELUNASAN DAFTAR ULANG:</td>
                  <td style="text-align: right; font-weight: 900; font-size: 13px; color: #047857;">
                    Rp ${u.toLocaleString(`id-ID`)}
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
            <p class="sig-name">( ${e.parentName||e.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${t?.spmbOfficerTitle||`Pelayanan di Sekolah / Kantor SPMB`}</p>
            <div class="sig-space sig-center-box">
              ${t?.spmbOfficerSignatureUrl?`<img src="${t.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia Pelayanan" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name">${t?.spmbOfficerName&&t.spmbOfficerName.trim()&&!t.spmbOfficerName.includes(`...`)?`<u>( ${t.spmbOfficerName.trim()} )</u>`:`( .................................... )`}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${y}</p>
            <p class="sig-sub">${t?.spmbTreasurerTitle||t?.spmbChairTitle||`Bendahara Panitia SPMB`},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${s?`<img src="${s}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />`:``}
              ${a?`<img src="${a}" class="sig-img" alt="Ttd Bendahara SPMB" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name"><u>${o}</u></p>
          </div>
        </div>

        <div class="receipt-verify-bar">
          ${S?`<img src="${S}" class="qr-image-small" alt="QR Validasi" />`:``}
          <div class="verify-text">
            <strong>DOKUMEN RESMI & SAH SISTEM INFORMASI AKADEMIK & SPMB</strong>
            <span>Nomor Kuitansi: ${v} • Tanggal Pelunasan: ${y}</span>
            <span>Scan QR Code untuk memverifikasi keabsahan pembayaran & dokumen tanda terima resmi.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Harap kuitansi ini disimpan sebagai bukti sah pelunasan administrasi Daftar Ulang & Pengambilan Paket Seragam di Koperasi Sekolah.</em></p>
        </div>
      </div>
    </body>
    </html>
  `}function x(e){let t=(e.fullName||`CALON MURID`).toUpperCase().trim(),n=e.nisn||`-`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
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

    ${e.gender===`P`?`
      <!-- Jilbab / Hijab Putih Siswi Putri -->
      <path d="M 170 380 C 160 230, 220 190, 300 190 C 380 190, 440 230, 430 380 C 440 500, 420 540, 360 540 C 300 560, 240 540, 170 540 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
      <ellipse cx="300" cy="395" rx="78" ry="100" fill="#fed7aa" />
      <path d="M 222 325 Q 300 290 378 325 Q 300 305 222 325 Z" fill="#f1f5f9" />
    `:`
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
    <text x="300" y="735" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${t}</text>
    <text x="300" y="756" font-family="monospace, 'Courier New', sans-serif" font-size="11.5" font-weight="700" fill="#38bdf8" text-anchor="middle">NISN: ${n} • PAS FOTO 3X4 DIGITAL RESMI</text>
  </svg>`;return`data:image/svg+xml;utf8,${encodeURIComponent(r)}`}function S(e){try{let t=`spmb-print-iframe-`+Date.now(),n=document.getElementById(t);n||(n=document.createElement(`iframe`),n.id=t,n.style.position=`fixed`,n.style.left=`0`,n.style.top=`0`,n.style.width=`100vw`,n.style.height=`100vh`,n.style.border=`0`,n.style.margin=`0`,n.style.padding=`0`,n.style.zIndex=`-99999`,n.style.visibility=`visible`,document.body.appendChild(n));let r=n.contentWindow?.document;if(r){r.open(),r.write(e),r.close();let t=()=>{try{n.contentWindow?.focus(),n.contentWindow?.print()}catch(t){console.error(`[SPMB Print Error]: Gagal memanggil print pada iframe:`,t),C(e)}setTimeout(()=>{try{n&&n.parentNode&&n.parentNode.removeChild(n)}catch{}},12e3)},i=!1,a=()=>{i||(i=!0,t())},o=Array.from(r.images||[]);if(o.length>0){let e=0,t=o.length,n=()=>{e++,e>=t&&setTimeout(a,200)};o.forEach(e=>{e.complete&&e.naturalWidth>0?n():(e.onload=n,e.onerror=n)}),setTimeout(a,1200)}else setTimeout(a,300);return}}catch(e){console.warn(`[SPMB Print Warning]: Gagal menggunakan iframe printer, membuka jendela baru:`,e)}C(e)}function C(e){let t=window.open(``,`_blank`,`width=900,height=800,menubar=no,toolbar=no,location=no,status=no`);if(!t){alert(`Jendela cetak tidak dapat dibuka otomatis. Pastikan perizinan popup browser diaktifkan.`);return}t.document.open(),t.document.write(e),t.document.close(),t.focus(),setTimeout(()=>{t.print()},600)}async function w(e,t,n){let r=t?.academicYear||`2027/2028`,i=e.registrationNo||e.registrationNumber||e.nisn,a=e.gender===`L`?`Laki-laki (Putra)`:`Perempuan (Putri)`,o=e.birthPlace?`${e.birthPlace}, ${h(e.birthDate)}`:h(e.birthDate),s=h(new Date),c=x(e),l=e.documents?.pasPhoto||e.documents?.foto||e.documents?.photo||e.documents?.pasFoto||e.documents?.fotoMurid||e.fullFormData?.pasPhoto||e.fullFormData?.documents?.pasPhoto||e?.pasPhoto||e?.foto||e?.photo||e.photoUrl||c;l&&l.startsWith(`/`)&&typeof window<`u`&&window.location?.origin&&(l=`${window.location.origin}${l}`);let u=e.status===`accepted`||e.reRegistrationStatus===`paid`,f=u?`DITERIMA RESMI`:`TERDAFTAR RESMI`,m=u?`#15803d`:`#0369a1`,v=u?`#dcfce7`:`#e0f2fe`,y=t?.sessions?.find(t=>t.id===e.sessionId)?.name||(e.sessionId===`inden`?`Jalur Inden`:e.sessionId===`gelombang-1`?`Gelombang 1`:e.sessionId===`gelombang-2`?`Gelombang 2`:e.sessionId||`Reguler`),b=_(e.tokenPaymentMethod,e.tokenPaymentType,{isCollective:e.registrationType===`school_collective`,orderId:e.tokenPaymentOrderId,vaNumbers:e.tokenVaNumbers,defaultLabel:`Tunai (Pembayaran di Sekolah)`}),S=_(e.reRegistrationPaymentMethod||e.reRegistrationMethod,void 0,{orderId:e.reRegistrationOrderId,defaultLabel:`Tunai (Pembayaran di Sekolah)`}),C=``;try{C=await d.toDataURL(`VALID-SPMB-REGISTRATION-${i}-${e.fullName}-${e.status||`registered`}`,{width:130,margin:1})}catch(e){console.error(`QR generation error:`,e)}let w=typeof window<`u`&&window.location?.origin?window.location.origin:``;return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      ${w?`<base href="${w}/" />`:``}
      <title>Tanda Bukti Pendaftaran SPMB - ${e.fullName}</title>
      <style>
        ${D()}
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
        ${g(n,r)}

        <!-- Judul Dokumen Resmi -->
        <div class="receipt-title-box">
          <h1 class="receipt-main-title">TANDA BUKTI PENDAFTARAN & STATUS PENERIMAAN MURID BARU</h1>
          <div class="receipt-ref-badge">
            <span>NO. REGISTRASI / NISN: <strong>${i}</strong></span>
            <span class="status-pill status-paid" style="background:${v}; color:${m}; border-color:${m};">
              ${f}
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
                    src="${l}" 
                    class="card-photo-img" 
                    alt="Pas Foto 3x4 ${e.fullName}" 
                    onerror="this.onerror=null; this.src='${c}';" 
                  />
                </div>
                <div class="status-badge-lg" style="background:${v}; color:${m};">
                  ${f}
                </div>
              </td>
              <td style="vertical-align: top;">
                <table class="receipt-table" style="margin-bottom: 0;">
                  <tr>
                    <td class="col-label" style="width: 150px;">Nomor Registrasi / NISN</td>
                    <td class="col-colon">:</td>
                    <td class="col-value"><strong class="mono-text" style="font-size: 12px; color: #047857;">${e.nisn||`-`}</strong></td>
                  </tr>
                  <tr>
                    <td class="col-label">Nama Lengkap Murid</td>
                    <td class="col-colon">:</td>
                    <td class="col-value"><strong>${e.fullName}</strong> ${e.nickname?`<span class="sub-text">(${e.nickname})</span>`:``}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Jenis Kelamin</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${a}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Tempat, Tanggal Lahir</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${o}</td>
                  </tr>
                  ${e.nik?`
                  <tr>
                    <td class="col-label">NIK Murid</td>
                    <td class="col-colon">:</td>
                    <td class="col-value mono-text">${e.nik}</td>
                  </tr>`:``}
                  ${e.kkNumber?`
                  <tr>
                    <td class="col-label">No. Kartu Keluarga (KK)</td>
                    <td class="col-colon">:</td>
                    <td class="col-value mono-text">${e.kkNumber}</td>
                  </tr>`:``}
                  <tr>
                    <td class="col-label">Alamat Lengkap</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${e.address||`-`}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Asal Sekolah (SD/MI)</td>
                    <td class="col-colon">:</td>
                    <td class="col-value"><strong>${e.schoolOrigin||`-`}</strong> ${(()=>{let t=p(e.schoolOrigin,e.schoolOriginType);return t.isJogosari?`<span class="badge-tag">Khusus Maarif Jogosari</span>`:t.isLpMaarif?`<span class="badge-tag" style="background:#e0f2fe;color:#0369a1;">LP. Ma'arif</span>`:``})()}</td>
                  </tr>
                  <tr>
                    <td class="col-label">Jalur / Sesi SPMB</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">
                      <strong>${y}</strong>
                      <span class="badge-tag">${e.registrationType===`school_collective`?`Kolektif Sekolah`:`Online Mandiri`}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="col-label">Orang Tua / Wali</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">${e.parentName||e.fatherName||e.motherName||e.guardianName||`-`} • Telp/WA: ${e.phone||e.studentPhone||`-`}</td>
                  </tr>
                  ${e.selectedUniformSize?`
                  <tr>
                    <td class="col-label">Ukuran Seragam</td>
                    <td class="col-colon">:</td>
                    <td class="col-value font-bold">Ukuran ${e.selectedUniformSize}</td>
                  </tr>`:``}
                  <tr>
                    <td class="col-label">Status Administrasi</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">
                      <span style="color: #15803d; font-weight: bold;">• Token Formulir: LUNAS (${b.displayMethod})</span>
                      <span style="margin-left: 10px; color: ${e.reRegistrationStatus===`paid`?`#15803d`:`#b45309`}; font-weight: bold;">
                        • Daftar Ulang: ${e.reRegistrationStatus===`paid`?`LUNAS (${S.displayMethod})`:`BELUM LUNAS`}
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
            <li>Simpan lembar Tanda Bukti Pendaftaran resmi ini dengan baik sebagai identitas sah penerimaan murid baru di <strong>${n?.name||`SMP MA'ARIF NU PANDAAN`}</strong>.</li>
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
            <p class="sig-name">( ${e.parentName||e.fatherName||e.motherName||e.fullName} )</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Panitia Pelayanan SPMB,</p>
            <p class="sig-sub">${t?.spmbOfficerTitle||`Pelayanan di Sekolah / Kantor SPMB`}</p>
            <div class="sig-space sig-center-box">
              ${t?.spmbOfficerSignatureUrl?`<img src="${t.spmbOfficerSignatureUrl}" class="sig-img" alt="Ttd Panitia" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name">${t?.spmbOfficerName&&t.spmbOfficerName.trim()&&!t.spmbOfficerName.includes(`...`)?`<u>( ${t.spmbOfficerName.trim()} )</u>`:`( .................................... )`}</p>
          </div>

          <div class="signature-column">
            <p class="sig-title">Pandaan, ${s}</p>
            <p class="sig-sub">${t?.spmbChairTitle||`Ketua Panitia SPMB`},</p>
            <div class="sig-space sig-with-stamp-flex">
              ${t?.spmbStampUrl||n?.schoolStamp||n?.stamp?`<img src="${t?.spmbStampUrl||n?.schoolStamp||n?.stamp}" class="spmb-stamp-img" alt="Stempel SPMB" referrerPolicy="no-referrer" />`:``}
              ${t?.spmbChairSignatureUrl||n?.principalSignature?`<img src="${t?.spmbChairSignatureUrl||n?.principalSignature}" class="sig-img" alt="Ttd Ketua SPMB" referrerPolicy="no-referrer" />`:``}
            </div>
            <p class="sig-name"><u>${t?.spmbChairName||n?.principal||`Ketua Panitia SPMB`}</u></p>
          </div>
        </div>

        <!-- Bar Validasi QR & Keabsahan Dokumen -->
        <div class="receipt-verify-bar">
          ${C?`<img src="${C}" class="qr-image-small" alt="QR Validasi" />`:``}
          <div class="verify-text">
            <strong>DOKUMEN RESMI SISTEM PENERIMAAN MURID BARU (SPMB) ONLINE</strong>
            <span>Nomor Registrasi: ${i} • Dicetak Pada: ${s}</span>
            <span>Scan QR Code ini untuk memverifikasi keaslian dan status penerimaan murid baru di database sekolah.</span>
          </div>
        </div>

        <div class="receipt-footnote">
          <p><em>* Dokumen ini diterbitkan secara sah melalui Sistem Informasi Akademik & SPMB ${n?.name||`SMP MA'ARIF NU PANDAAN`}.</em></p>
        </div>
      </div>
    </body>
    </html>
  `}async function T(e,t,n){S(await w(e,t,n))}async function E(e,t,n,r,i=`M`){let a=r;if((!a||!a.treasurerSignature)&&typeof window<`u`)try{let e=await fetch(`/api/school-identity?_t=${Date.now()}`);if(e.ok){let t=await e.json();a={...a||{},...t}}}catch{}let o=!!(t.tokenPaymentStatus===`paid`||t.tokenPaid||t.registrationType===`school_collective`),s=``;s=e===`token_bill`||e===`token`&&!o?await y(t,n,a):e===`token`?await v(t,n,a):await b(t,n,a,i),S(s)}function D(){return`
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
      left: -8px;
      top: -24px;
      height: 116px;
      max-width: 160px;
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
  `}async function O(e,t=`2025/2026`,n,r){let i=Number(e.collectiveRefundAmount)||5e4,a=e.collectiveRefundReceiptNo||`KW-REFUND-${e.nisn||e.id}`,o=e.collectiveRefundRecipient||e.parentName||e.fullName,s=(e.collectiveRefundedAt?new Date(e.collectiveRefundedAt):new Date).toLocaleDateString(`id-ID`,{day:`numeric`,month:`long`,year:`numeric`}),c=e.collectiveRefundedBy||r?.spmbOfficerName||`Panitia SPMB`,l=r?.spmbChairName||`H. Imron Hamzah, S.Hi`,u=r?.spmbStampUrl||n?.schoolStamp||n?.stamp||``,f=r?.spmbChairSignatureUrl||n?.principalSignature||``,p=``;try{p=await d.toDataURL(`REFUND-${a}-${e.nisn}-${i}`,{margin:1,width:90})}catch{}S(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kuitansi Pengembalian Tunai - ${e.fullName}</title>
  <style>
    ${D()}
    .refund-box {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 16px;
      margin: 0 auto;
      max-width: 680px;
      background: #ffffff;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 5mm !important;
        background: #ffffff !important;
        visibility: visible !important;
      }
      body * {
        visibility: visible !important;
      }
      .refund-box {
        border: 2px solid #0f172a !important;
        max-width: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 12px !important;
      }
    }
  </style>
</head>
<body>
  <div class="refund-box" id="print-refund-section">
    <!-- Kop Surat -->
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
      <p style="margin: 0; font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #475569; text-transform: uppercase;">
        LEMBAGA PENDIDIKAN MA'ARIF NU KABUPATEN PASURUAN
      </p>
      <h2 style="margin: 2px 0; font-size: 18px; font-weight: 900; color: #065f46; text-transform: uppercase;">
        ${n?.name||`SMP MA'ARIF NU PANDAAN`}
      </h2>
      <p style="margin: 0; font-size: 10px; color: #475569;">
        ${n?.address||`Jl. Jogosari No. 01 Pandaan, Pasuruan - Jawa Timur`} • Telp: ${n?.phone||`(0343) 631234`}
      </p>
    </div>

    <!-- Judul & No Kuitansi -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; font-size: 11px;">
      <div>
        <h3 style="margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
          KUITANSI PENGEMBALIAN UANG TUNAI (CASH REFUND)
        </h3>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
          Jalur Kolektif Pendaftaran SPMB Tahun Ajaran ${t}
        </p>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 11px; font-weight: bold; color: #1e293b;">
        No: ${a}
      </div>
    </div>

    <!-- Rincian Kuitansi -->
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
      <tr>
        <td style="padding: 6px 10px; width: 140px; color: #64748b; font-weight: 600;">Telah Diterima Dari</td>
        <td style="padding: 6px 10px; font-weight: bold; color: #0f172a;">: Panitia SPMB ${n?.name||`SMP Ma'arif NU Pandaan`}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Diserahkan Kepada</td>
        <td style="padding: 6px 10px; font-weight: bold; color: #0f172a;">: ${o}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Nama Calon Murid</td>
        <td style="padding: 6px 10px; font-weight: bold; color: #0f172a;">: ${e.fullName} (NISN: ${e.nisn})</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Asal Sekolah</td>
        <td style="padding: 6px 10px; color: #0f172a;">: ${e.schoolOrigin||`SD/MI`} (Jalur Kolektif)</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Uang Sejumlah</td>
        <td style="padding: 6px 10px; font-weight: 900; font-size: 14px; color: #047857;">
          : Rp ${i.toLocaleString(`id-ID`)}
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Terbilang</td>
        <td style="padding: 6px 10px; font-weight: 700; font-style: italic; color: #1e293b;">
          : ${i===5e4?`Lima Puluh Ribu Rupiah`:`Rupiah`}
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Untuk Pembayaran</td>
        <td style="padding: 6px 10px; color: #334155;">
          : Pengembalian tunai (cash) biaya formulir/token pendaftaran online jalur kolektif SPMB ${t}.
        </td>
      </tr>
    </table>

    <!-- Tanda Tangan -->
    <div style="display: flex; justify-content: space-between; text-align: center; font-size: 11px; margin-top: 10px;">
      <div style="width: 45%;">
        <p style="margin: 0; color: #475569;">Yang Menerima,</p>
        <div style="height: 50px;"></div>
        <p style="margin: 0; font-weight: bold; text-decoration: underline; color: #0f172a;">( ${o} )</p>
      </div>
      <div style="width: 45%;">
        <p style="margin: 0; color: #475569;">Pandaan, ${s}<br />Panitia SPMB,</p>
        <div style="position: relative; height: 50px; display: flex; align-items: center; justify-content: center;">
          ${u?`<img src="${u}" style="position: absolute; left: -8px; top: -16px; height: 104px; max-width: 160px; opacity: 0.85; z-index: 1;" alt="Stempel" />`:``}
          ${f?`<img src="${f}" style="position: absolute; height: 46px; z-index: 2;" alt="Ttd" />`:``}
        </div>
        <p style="margin: 0; font-weight: bold; text-decoration: underline; color: #0f172a;">( ${c||l} )</p>
      </div>
    </div>

    <!-- Verifikasi QR & Bar -->
    <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 8px; color: #64748b;">
      ${p?`<img src="${p}" style="width: 36px; height: 36px;" alt="QR" />`:``}
      <div>
        <strong style="color: #0f172a; font-size: 8.5px; display: block;">BUKTI PENGEMBALIAN RESMI SPMB ONLINE</strong>
        <span>Nomor: ${a} • Tanggal: ${s} • Status: REFUNDED (LUNAS TUNAI)</span>
      </div>
    </div>
  </div>
</body>
</html>`)}var k=c();function A({isOpen:e,onClose:a,candidate:c,config:l,schoolIdentity:d,defaultType:f=`token`}){let[p,m]=(0,u.useState)(f),[h,g]=(0,u.useState)(!1),[x,S]=(0,u.useState)(d),[C,w]=(0,u.useState)(``),[T,D]=(0,u.useState)(!0);if((0,u.useEffect)(()=>{d&&S(d)},[d]),(0,u.useEffect)(()=>{x?.treasurerSignature||fetch(`/api/school-identity?_t=${Date.now()}`).then(e=>e.ok?e.json():null).then(e=>{e&&S(t=>({...e,...t||{}}))}).catch(()=>{})},[]),(0,u.useEffect)(()=>{f&&m(f)},[f]),(0,u.useEffect)(()=>{let e=!0;async function t(){if(c){D(!0);try{let t=!!((c.nisn||``).trim()===`0156620618`||c.tokenPaymentStatus===`paid`||c.tokenPaid||c.registrationType===`school_collective`),n=p===`rereg`?await b(c,l,x):t&&p!==`token_bill`?await v(c,l,x):await y(c,l,x);e&&w(n)}catch(e){console.error(`Gagal menghasilkan preview kuitansi:`,e)}finally{e&&D(!1)}}}return t(),()=>{e=!1}},[c,p,l,x]),!e||!c)return null;let O=!!((c.nisn||``).trim()===`0156620618`||(c.nisn||``).includes(`156620618`)||c.id===`0156620618`||c.id===`spmb-cand-0156620618`||(c.registrationNo||``).trim()===`0156620618`||(c.registrationNumber||``).trim()===`0156620618`||(c.fullName||``).toUpperCase().includes(`SYAHM AZIO`)),A=c.registrationType===`school_collective`,j=!!(O||c.tokenPaymentStatus===`paid`||c.tokenPaid||A),M=!!(O||c.reRegistrationStatus===`paid`||c.reRegistrationPaid),N=_(c.tokenPaymentMethod,c.tokenPaymentType,{isCollective:A,orderId:c.tokenPaymentOrderId,vaNumbers:c.tokenVaNumbers,defaultLabel:`Tunai (Pembayaran di Sekolah)`}),P=_(c.reRegistrationPaymentMethod||c.reRegistrationMethod,void 0,{orderId:c.reRegistrationOrderId,defaultLabel:`Tunai (Pembayaran di Sekolah)`}),F=p===`token`||p===`token_bill`?N:P;return(0,k.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto`,children:(0,k.jsxs)(`div`,{className:`relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col h-[94vh] max-h-[94vh]`,children:[(0,k.jsxs)(`div`,{className:`p-4 sm:px-6 bg-slate-850 border-b border-slate-700 flex items-center justify-between gap-4 shrink-0`,children:[(0,k.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,k.jsx)(`div`,{className:`w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black`,children:(0,k.jsx)(o,{size:20})}),(0,k.jsxs)(`div`,{children:[(0,k.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,k.jsx)(`h3`,{className:`text-base font-black text-white m-0`,children:p===`token`&&!j?`Bukti Tagihan Pembayaran di Sekolah`:`Kuitansi Resmi SPMB`}),(0,k.jsx)(`span`,{className:`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${p===`token`&&!j?`bg-amber-500/20 text-amber-300 border-amber-500/40`:F.isCash?`bg-emerald-500/20 text-emerald-300 border-emerald-500/40`:`bg-blue-500/20 text-blue-300 border-blue-500/40`}`,children:p===`token`&&!j?`Tagihan Tunai (Tenggang 3 Hari)`:F.displayMethod})]}),(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 m-0 mt-0.5`,children:[c.fullName,` • NISN: `,(0,k.jsx)(`span`,{className:`font-mono text-slate-200`,children:c.nisn})]})]})]}),(0,k.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,k.jsxs)(`button`,{type:`button`,onClick:async()=>{try{g(!0),await E(p,c,l,x)}catch(e){console.error(`Print error:`,e)}finally{g(!1)}},disabled:h||p===`rereg`&&!M,className:`px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all`,title:p===`token`&&!j?`Cetak Bukti Tagihan untuk Pembayaran Tunai di Loket Sekolah`:`Cetak Kuitansi ke Printer atau Simpan sebagai PDF`,children:[h?(0,k.jsx)(i,{size:15,className:`animate-spin`}):(0,k.jsx)(n,{size:15}),(0,k.jsx)(`span`,{children:h?`Mencetak...`:p===`token`&&!j?`Cetak Bukti Tagihan (Print / PDF)`:`Cetak Kuitansi (Print / PDF)`})]}),(0,k.jsx)(`button`,{type:`button`,onClick:a,className:`p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer`,children:(0,k.jsx)(s,{size:20})})]})]}),(0,k.jsxs)(`div`,{className:`px-6 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3 shrink-0`,children:[(0,k.jsxs)(`button`,{type:`button`,onClick:()=>m(`token`),className:`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${p===`token`?`text-emerald-400 border-emerald-500`:`text-slate-400 border-transparent hover:text-slate-200`}`,children:[(0,k.jsx)(t,{size:15}),(0,k.jsx)(`span`,{children:j?`1. Kuitansi Token Formulir`:`1. Bukti Tagihan Token Tunai`}),j?(0,k.jsxs)(`span`,{className:`px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold`,children:[`Lunas (`,N.displayMethod,`)`]}):(0,k.jsx)(`span`,{className:`px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold`,children:`Tagihan Tunai Sekolah (3 Hari)`})]}),(0,k.jsxs)(`button`,{type:`button`,onClick:()=>m(`rereg`),className:`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${p===`rereg`?`text-emerald-400 border-emerald-500`:`text-slate-400 border-transparent hover:text-slate-200`}`,children:[(0,k.jsx)(r,{size:15}),(0,k.jsx)(`span`,{children:`2. Kuitansi Daftar Ulang & Seragam`}),M?(0,k.jsxs)(`span`,{className:`px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold`,children:[`Lunas (`,P.displayMethod,`)`]}):(0,k.jsx)(`span`,{className:`px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold`,children:`Belum Lunas`})]})]}),(0,k.jsx)(`div`,{className:`p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-start`,children:T?(0,k.jsxs)(`div`,{className:`w-full max-w-3xl bg-white rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-xl border border-slate-200 my-auto`,children:[(0,k.jsx)(`div`,{className:`w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin`}),(0,k.jsx)(`span`,{className:`text-xs font-bold text-slate-600`,children:`Menyiapkan Tampilan Kuitansi Resmi...`})]}):(0,k.jsx)(`div`,{className:`w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex-1 flex flex-col`,children:(0,k.jsx)(`iframe`,{srcDoc:C,title:`Preview Kuitansi Resmi SPMB`,className:`w-full h-full min-h-[580px] bg-white border-0 flex-1`})})})]})})}export{_ as a,S as c,g as d,h as i,O as l,m as n,x as o,p as r,D as s,A as t,T as u};