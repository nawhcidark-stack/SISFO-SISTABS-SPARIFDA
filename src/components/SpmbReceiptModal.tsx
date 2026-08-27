import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2, FileText, Sparkles, Building, CreditCard, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { SchoolIdentity, SpmbCandidate, SpmbConfig } from '../types';
import {
  angkaKeTerbilang,
  calculateReRegDetails,
  formatIndoDate,
  printSpmbReceiptDirect
} from '../utils/spmbReceiptPrint';

interface SpmbReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: SpmbCandidate | null;
  config: SpmbConfig | null;
  schoolIdentity?: SchoolIdentity;
  defaultType?: 'token' | 'rereg';
}

export default function SpmbReceiptModal({
  isOpen,
  onClose,
  candidate,
  config,
  schoolIdentity,
  defaultType = 'token'
}: SpmbReceiptModalProps) {
  const [receiptType, setReceiptType] = useState<'token' | 'rereg'>(defaultType);
  const [uniformSize, setUniformSize] = useState<string>('M');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    if (defaultType) {
      setReceiptType(defaultType);
    }
  }, [defaultType]);

  useEffect(() => {
    if (candidate) {
      if (candidate.uniformSize) {
        setUniformSize(candidate.uniformSize);
      }
      
      const payload = receiptType === 'token'
        ? `VALID-SPMB-TOKEN-${candidate.nisn}-${candidate.fullName}`
        : `VALID-SPMB-REREG-${candidate.nisn}-${candidate.fullName}`;
      
      QRCode.toDataURL(payload, { width: 120, margin: 1 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Error generating QR:', err));
    }
  }, [candidate, receiptType]);

  if (!isOpen || !candidate) return null;

  const academicYear = config?.academicYear || '2027/2028';
  const isCollective = candidate.registrationType === 'school_collective';
  const isTokenPaid = Boolean(candidate.tokenPaymentStatus === 'paid' || candidate.tokenPaid || isCollective);
  const isReRegPaid = Boolean(candidate.reRegistrationStatus === 'paid' || candidate.reRegistrationPaid);

  const tokenAmount = isCollective ? 0 : (candidate.tokenAmount || 50000);
  const tokenTerbilang = isCollective ? 'Nol Rupiah (Gratis Jalur Kolektif Sekolah)' : angkaKeTerbilang(tokenAmount);
  const tokenReceiptNo = `KUI-TKN/${new Date().getFullYear()}/${candidate.nisn || candidate.id.slice(0, 6).toUpperCase()}`;

  const reregDetails = calculateReRegDetails(candidate, config);
  const reregAmount = reregDetails.grandTotal;
  const reregTerbilang = angkaKeTerbilang(reregAmount);
  const reregReceiptNo = `KUI-DU/${new Date().getFullYear()}/${candidate.nisn || candidate.id.slice(0, 6).toUpperCase()}`;

  const session = config?.sessions?.find(s => s.id === candidate.sessionId);
  const sessionName = session?.name || (candidate.sessionId === 'inden' ? 'Jalur Inden' : candidate.sessionId === 'gelombang-1' ? 'Gelombang 1' : candidate.sessionId === 'gelombang-2' ? 'Gelombang 2' : candidate.sessionId);
  const genderLabel = candidate.gender === 'L' ? 'Putra' : 'Putri';

  const handleTriggerPrint = async () => {
    try {
      setIsPrinting(true);
      await printSpmbReceiptDirect(receiptType, candidate, config, schoolIdentity, uniformSize);
    } catch (e) {
      console.error('Print error:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 bg-slate-850 border-b border-slate-700 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white m-0">Cetak Kuitansi Resmi SPMB</h3>
              <p className="text-xs text-slate-400 m-0">
                {candidate.fullName} - NISN: <span className="font-mono text-slate-200">{candidate.nisn}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isPrinting || (receiptType === 'token' && !isTokenPaid) || (receiptType === 'rereg' && !isReRegPaid)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <Printer size={15} />
              <span>{isPrinting ? 'Mencetak...' : 'Cetak Kuitansi (Print / PDF)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setReceiptType('token')}
            className={`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              receiptType === 'token'
                ? 'text-emerald-400 border-emerald-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <CreditCard size={15} />
            <span>1. Kuitansi Token Formulir</span>
            {isTokenPaid ? (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Lunas</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Belum Lunas</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setReceiptType('rereg')}
            className={`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              receiptType === 'rereg'
                ? 'text-emerald-400 border-emerald-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Building size={15} />
            <span>2. Kuitansi Daftar Ulang & Seragam</span>
            {isReRegPaid ? (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Lunas</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Belum Lunas</span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
          {/* Printable Sheet Preview */}
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 text-xs">
            {/* KOP RESMI DARI PENGATURAN WEB UTAMA */}
            {schoolIdentity?.letterhead ? (
              <div className="w-full text-center mb-4">
                <img
                  src={schoolIdentity.letterhead}
                  alt="KOP Resmi"
                  className="w-full max-h-32 object-contain mx-auto block"
                  referrerPolicy="no-referrer"
                />
                <div className="w-full border-b-2 border-double border-slate-900 mt-2"></div>
              </div>
            ) : (
              <div className="border-b-2 border-double border-slate-900 pb-3 mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {schoolIdentity?.logo ? (
                    <img src={schoolIdentity.logo} alt="Logo" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-lg">NU</div>
                  )}
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 m-0">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</h3>
                    <p className="text-[10px] text-slate-600 font-bold uppercase m-0">{schoolIdentity?.subheading || 'Lembaga Pendidikan Maarif Nahdlatul Ulama'}</p>
                    <p className="text-[10px] font-black text-emerald-800 uppercase m-0">PANITIA PENERIMAAN MURID BARU (SPMB) T.A. {academicYear}</p>
                    <p className="text-[9px] text-slate-500 m-0">{schoolIdentity?.address || 'Pasuruan, Jawa Timur'} - Telp: {schoolIdentity?.phone || '(0343) 631234'}</p>
                  </div>
                </div>
                {schoolIdentity?.logo2 && (
                  <img src={schoolIdentity.logo2} alt="Logo 2" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                )}
              </div>
            )}

            {/* RECEIPT CONTENT: TOKEN */}
            {receiptType === 'token' && (
              <div className="space-y-4">
                <div className="text-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 m-0">
                    KUITANSI PEMBAYARAN TOKEN FORMULIR SPMB
                  </h4>
                  <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                    <span>NO: <strong>{tokenReceiptNo}</strong></span>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">LUNAS</span>
                  </div>
                </div>

                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-500 w-44 font-semibold">Telah Diterima Dari</td>
                      <td className="py-1.5 w-3 text-center">:</td>
                      <td className="py-1.5 font-bold text-slate-900">
                        {candidate.fullName} <span className="font-normal text-slate-500">(NISN: {candidate.nisn})</span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-500 font-semibold">Uang Sejumlah</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 font-mono font-black text-emerald-700 text-sm">
                        Rp {tokenAmount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-500 font-semibold">Terbilang</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 italic font-semibold text-slate-800">
                        # {tokenTerbilang} #
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-500 font-semibold">Untuk Pembayaran</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-800">
                        Biaya Pembelian Token Akses Formulir Pendaftaran Online SPMB Tahun Ajaran <strong>{academicYear}</strong>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-500 font-semibold">Jalur / Sesi Pendaftaran</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 font-bold text-slate-800">
                        {sessionName} {isCollective && <span className="text-indigo-700 font-bold">(Jalur Kolektif SD/MI)</span>}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-500 font-semibold">Asal Sekolah</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 text-slate-800">{candidate.schoolOrigin || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-500 font-semibold">No. Transaksi / Order ID</td>
                      <td className="py-1.5 text-center">:</td>
                      <td className="py-1.5 font-mono text-slate-700">{candidate.tokenPaymentOrderId || 'KASIR-OFFLINE-PANITIA'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-[10px]">
                  <div>
                    <p className="m-0 text-slate-500">Orang Tua / Wali,</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline text-slate-800 m-0">( {candidate.parentName || candidate.fullName} )</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" className="w-14 h-14 object-contain" />}
                    <span className="text-[8px] text-slate-400 mt-1">Verifikasi Sah</span>
                  </div>
                  <div>
                    <p className="m-0 text-slate-500">Pandaan, {formatIndoDate(candidate.tokenPaidAt)}</p>
                    <p className="m-0 text-slate-700 font-bold">Bendahara Panitia SPMB,</p>
                    <div className="h-12 flex items-center justify-center relative">
                      {schoolIdentity?.treasurerSignature && (
                        <img src={schoolIdentity.treasurerSignature} alt="Ttd" className="h-12 object-contain z-10" referrerPolicy="no-referrer" />
                      )}
                      {schoolIdentity?.schoolStamp && (
                        <img src={schoolIdentity.schoolStamp} alt="Stempel" className="h-12 object-contain opacity-80" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <p className="font-bold underline text-slate-800 m-0">{schoolIdentity?.treasurer || 'Panitia SPMB'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* RECEIPT CONTENT: DAFTAR ULANG */}
            {receiptType === 'rereg' && (
              <div className="space-y-4">
                <div className="text-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 m-0">
                    KUITANSI PEMBAYARAN DAFTAR ULANG & SERAGAM SPMB
                  </h4>
                  <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                    <span>NO: <strong>{reregReceiptNo}</strong></span>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">LUNAS</span>
                  </div>
                </div>

                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 w-44 font-semibold">Telah Diterima Dari</td>
                      <td className="py-1 w-3 text-center">:</td>
                      <td className="py-1 font-bold text-slate-900">
                        {candidate.fullName} <span className="font-normal text-slate-500">(NISN: {candidate.nisn} - {genderLabel})</span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Uang Sejumlah</td>
                      <td className="py-1 text-center">:</td>
                      <td className="py-1 font-mono font-black text-emerald-700 text-sm">
                        Rp {reregAmount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Terbilang</td>
                      <td className="py-1 text-center">:</td>
                      <td className="py-1 italic font-semibold text-slate-800">
                        # {reregTerbilang} #
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Untuk Pembayaran</td>
                      <td className="py-1 text-center">:</td>
                      <td className="py-1 text-slate-800">
                        Pelunasan Biaya Daftar Ulang, Uang Gedung, SPP Juli, dan Paket Seragam ({genderLabel} - Ukuran: <strong>{uniformSize}</strong>) T.A. <strong>{academicYear}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 font-semibold">Sesi / Jalur</td>
                      <td className="py-1 text-center">:</td>
                      <td className="py-1 font-bold text-slate-800">
                        {reregDetails.sessionName} {candidate.schoolOriginType === 'maarif_jogosari' && '(Diskon SD Maarif)'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Breakdown Details */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-[10px]">
                  <div className="bg-slate-100 p-1.5 font-bold uppercase text-slate-700">Rincian Pos Pembayaran:</div>
                  <table className="w-full">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-1.5 text-left">Komponen</th>
                        <th className="p-1.5 text-right">Tarif Asli</th>
                        <th className="p-1.5 text-right">Potongan</th>
                        <th className="p-1.5 text-right">Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-1.5">
                          <strong>Uang Gedung / Infaq</strong>
                          {reregDetails.discountPercent > 0 && <span className="block text-slate-500">- Diskon Gelombang ({reregDetails.discountPercent}%)</span>}
                          {reregDetails.maarifBuildingDiscount > 0 && <span className="block text-emerald-700">- Diskon SD Maarif</span>}
                        </td>
                        <td className="p-1.5 text-right">Rp {reregDetails.buildingFee.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right text-emerald-700">- Rp {reregDetails.totalBuildingDiscount.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right font-bold">Rp {reregDetails.netBuildingFee.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5"><strong>SPP Bulan Juli {academicYear.split('/')[0]}</strong></td>
                        <td className="p-1.5 text-right">Rp {reregDetails.julySppFee.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right">Rp 0</td>
                        <td className="p-1.5 text-right font-bold">Rp {reregDetails.julySppFee.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">
                          <strong>Paket Seragam & Atribut ({genderLabel} - {uniformSize})</strong>
                          {reregDetails.maarifUniformDiscount > 0 && <span className="block text-emerald-700">- Diskon Seragam SD Maarif</span>}
                        </td>
                        <td className="p-1.5 text-right">Rp {reregDetails.rawUniformTotal.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right text-emerald-700">- Rp {reregDetails.maarifUniformDiscount.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right font-bold">Rp {reregDetails.netUniformTotal.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan={3} className="p-1.5 text-right uppercase">Total Lunas Daftar Ulang:</td>
                        <td className="p-1.5 text-right text-emerald-700 font-mono text-xs font-black">
                          Rp {reregAmount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center text-[10px]">
                  <div>
                    <p className="m-0 text-slate-500">Orang Tua / Wali,</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline text-slate-800 m-0">( {candidate.parentName || candidate.fullName} )</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" className="w-14 h-14 object-contain" />}
                    <span className="text-[8px] text-slate-400 mt-1">Verifikasi Sah</span>
                  </div>
                  <div>
                    <p className="m-0 text-slate-500">Pandaan, {formatIndoDate(candidate.reRegistrationPaidAt)}</p>
                    <p className="m-0 text-slate-700 font-bold">Kepala Sekolah,</p>
                    <div className="h-12 flex items-center justify-center relative">
                      {schoolIdentity?.principalSignature && (
                        <img src={schoolIdentity.principalSignature} alt="Ttd" className="h-12 object-contain z-10" referrerPolicy="no-referrer" />
                      )}
                      {schoolIdentity?.schoolStamp && (
                        <img src={schoolIdentity.schoolStamp} alt="Stempel" className="h-12 object-contain opacity-80" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <p className="font-bold underline text-slate-800 m-0">{schoolIdentity?.principal || 'Kepala Sekolah'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
