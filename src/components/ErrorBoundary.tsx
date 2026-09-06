import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
    this.handleReload = this.handleReload.bind(this);
    this.handleResetSession = this.handleResetSession.bind(this);
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload() {
    window.location.reload();
  }

  private handleResetSession() {
    try {
      const keysToRemove = [
        'smp_maarif_logged_in',
        'smp_maarif_role',
        'smp_maarif_student_id',
        'smp_maarif_logged_homeroom',
        'smp_maarif_logged_subject_teacher',
        'smp_maarif_logged_user',
        'student_read_notif_ids'
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.error('Gagal membersihkan cache:', e);
    }
    window.location.href = '/';
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Kesalahan sistem tidak terduga';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">
              Sistem Memerlukan Muat Ulang
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Aplikasi mendeteksi adanya data sesi atau cache peramban yang perlu disinkronkan kembali dengan Server SMP Ma'arif NU Pandaan.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw size={15} />
                Muat Ulang Halaman
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw size={15} />
                Bersihkan Cache Sesi &amp; Masuk Ulang
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {this.state.showDetails ? 'Sembunyikan Informasi Teknis' : 'Lihat Detail Diagnostik'}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-900 text-left rounded-lg text-[10px] font-mono text-emerald-400 max-h-48 overflow-y-auto leading-relaxed break-all">
                  <div className="text-rose-400 font-bold mb-1">Pesan Kesalahan:</div>
                  <div className="mb-2 text-slate-200">{errorMessage}</div>
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <div className="text-amber-400 font-bold mb-1">Jalur Komponen:</div>
                      <div className="text-slate-400 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack.trim()}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
