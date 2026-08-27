import React, { useState, useEffect } from 'react';
import { Student, SchoolIdentity } from '../types';
import QRCode from 'qrcode';
// @ts-ignore
import defaultCardBg from '../assets/images/card_bg_1780838271329.png';

interface StudentPaymentCardProps {
  student: Student;
  schoolIdentity?: SchoolIdentity | null;
  isPreview?: boolean;
}

export default function StudentPaymentCard({ student, schoolIdentity, isPreview = false }: StudentPaymentCardProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(student.nis, {
      margin: 1,
      width: 140, // standard clean QR size
      color: {
        dark: '#030712', // highly contrasting near black
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => console.error('Error generating QR for card:', err));

    return () => {
      isMounted = false;
    };
  }, [student.nis]);

  // Standard dimensions of ID card ID-1 (85.6mm x 53.98mm)
  const cardStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    fontFamily: '"Inter", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: isPreview ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
    width: '8.56cm',
    height: '5.398cm',
    pageBreakInside: 'avoid',
  };

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${schoolIdentity?.paymentCardTemplate || defaultCardBg})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div 
      id={`payment-card-${student.id}`}
      className="payment-card-print relative border border-slate-300 print:border-none rounded-[18px] text-slate-900 overflow-hidden break-inside-avoid print:break-inside-avoid shadow-none"
      style={{
        ...cardStyle,
        ...bgStyle,
      }}
    >
      {/* 1. Header (KOP) - Stays consistently in place at the top of the card structure */}
      {schoolIdentity?.letterhead ? (
        <div className="w-full h-[1.1cm] flex items-center justify-center overflow-hidden shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-xs select-none relative z-10">
          <img
            src={schoolIdentity.letterhead}
            alt="Kop Surat"
            className="w-full h-full object-fill"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b-[1.5px] border-double border-slate-800 tracking-tight text-left select-none bg-white/95 backdrop-blur-xs relative shrink-0 z-10 h-[1.1cm]">
          <div className="flex items-center gap-2 min-w-0">
            {schoolIdentity?.logo ? (
              <img
                src={schoolIdentity.logo}
                alt="Logo"
                className="w-7 h-7 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 bg-emerald-700 rounded-full flex items-center justify-center text-white font-black text-[8px] shrink-0">
                NU
              </div>
            )}
            
            <div className="min-w-0 flex flex-col leading-none">
              <span className="text-[5px] font-serif italic font-extrabold text-[#00609C] leading-none mb-0.5">
                Sekolah Inspiratif
              </span>
              <h4 className="text-[8px] font-black text-slate-900 tracking-tight uppercase leading-none">
                {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
              </h4>
              <p className="text-[5.5px] font-semibold text-slate-500 uppercase tracking-tight leading-normal mt-0.5 truncate max-w-[5cm]">
                {schoolIdentity?.address || "Jl. Raya A. Yani No. 92 Pandaan Telp. 0343 631655"}
              </p>
            </div>
          </div>

          {schoolIdentity?.logo2 ? (
            <img
              src={schoolIdentity.logo2}
              alt="Logo 2"
              className="w-7 h-7 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-[7px] shrink-0 shadow-xs">
              ⭐
            </div>
          )}
        </div>
      )}

      {/* 2. Main Title Line */}
      <div className="text-center pt-1.5 pb-0.5 shrink-0 z-10">
        <span className="text-[8px] font-black uppercase text-indigo-900 bg-white/90 px-2 py-0.5 rounded-full tracking-wider inline-block border border-indigo-100 select-none m-auto shadow-2xs">
          KARTU PEMBAYARAN SISWA
        </span>
      </div>

      {/* 3. Middle content (QR left, info right) with identical alignment in both modes */}
      <div className="flex-1 px-3.5 py-1 flex items-center justify-between gap-3 text-slate-800 relative z-10 leading-none">
        
        {/* Left column QR with high contrast white container */}
        <div className="bg-white rounded-lg p-1 border border-slate-200 shadow-sm flex flex-col items-center justify-center w-[1.8cm] h-[1.8cm] shrink-0 select-none">
          <div className="w-[1.25cm] h-[1.25cm] flex items-center justify-center overflow-hidden shrink-0">
            {qrUrl ? (
              <img src={qrUrl} className="w-full h-full object-contain" alt="QR" />
            ) : (
              <div className="text-[5px] font-extrabold text-slate-400 animate-pulse">QR...</div>
            )}
          </div>
          <span className="font-mono text-[5.5px] font-black tracking-wide text-indigo-950 leading-none mt-0.5">
            {student.nis}
          </span>
        </div>

        {/* Right Details aligned with a transparent white card backdrop to guarantee clear readability on custom template backgrounds */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0 text-left select-text bg-white/92 backdrop-blur-xs p-1.5 rounded-lg border border-white/60 shadow-2xs">
          <div className="grid grid-cols-[1.1cm_0.1cm_1fr] items-center gap-x-1 leading-tight">
            <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest font-sans">Nama</span>
            <span className="text-[7.5px] font-black text-slate-400">:</span>
            <span className="text-[9.5px] font-black tracking-tight text-slate-900 uppercase truncate" title={student.name}>
              {student.name}
            </span>
          </div>

          <div className="grid grid-cols-[1.1cm_0.1cm_1fr] items-center gap-x-1 leading-tight mt-0.5">
            <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest font-sans">NIS</span>
            <span className="text-[7.5px] font-black text-slate-400">:</span>
            <span className="font-mono text-[9px] font-extrabold text-slate-800 tracking-wider">
              {student.nis}
            </span>
          </div>

          <div className="grid grid-cols-[1.1cm_0.1cm_1fr] items-center gap-x-1 leading-tight mt-0.5">
            <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest font-sans">Kelas</span>
            <span className="text-[7.5px] font-black text-slate-400">:</span>
            <span className="text-[9px] font-black text-slate-800 uppercase">
              {student.class}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Clean empty footer area with no text or icons */}
      <div className="h-[1.1cm] w-full shrink-0 mt-auto select-none overflow-hidden z-10" />
    </div>
  );
}
