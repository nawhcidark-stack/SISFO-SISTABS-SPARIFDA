import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, AlertTriangle, Info, CreditCard, X } from 'lucide-react';
import { RealtimeNotification } from '../types';

interface NotificationToastProps {
  notifications: RealtimeNotification[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  // Only display the most recent 3 active toasts
  const activeToasts = notifications.slice(0, 3);

  return (
    <div id="toast-container" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm sm:max-w-md pointer-events-none">
      <AnimatePresence>
        {activeToasts.map((notif) => {
          let bgColor = 'bg-slate-900/95 text-white border-slate-800';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (notif.type === 'success') {
            bgColor = 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100 shadow-lg shadow-emerald-950/20';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (notif.type === 'warning') {
            bgColor = 'bg-amber-950/95 border-amber-500/30 text-amber-100 shadow-lg shadow-amber-950/20';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          } else if (notif.type === 'payment') {
            bgColor = 'bg-green-950/95 border-green-500/30 text-green-100 shadow-lg shadow-green-950/20';
            Icon = CreditCard;
            iconColor = 'text-yellow-400';
          }

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl ${bgColor}`}
              layout
            >
              <div className={`p-1.5 rounded-lg bg-white/10 ${iconColor} h-fit self-start`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-semibold text-sm leading-tight tracking-tight">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] opacity-70 font-mono whitespace-nowrap">
                    {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs mt-1 text-white/80 leading-relaxed break-words">
                  {notif.message}
                </p>
              </div>
              <button
                id={`dismiss-toast-${notif.id}`}
                onClick={() => onDismiss(notif.id)}
                className="text-white/40 hover:text-white/80 transition-colors self-start p-0.5 rounded-lg hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
