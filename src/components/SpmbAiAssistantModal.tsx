import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  UserPlus, 
  Search, 
  HelpCircle,
  Minimize2,
  Maximize2
} from "lucide-react";
import { SpmbConfig } from "../types";

export interface SpmbAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: SpmbConfig;
  schoolIdentity?: any;
  onNavigateTab?: (tab: "info" | "register" | "portal") => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
  source?: "gemini" | "knowledge_base";
}

const DEFAULT_SUGGESTIONS = [
  "Apa saja jalur dan jadwal pendaftaran?",
  "Berapa rincian biaya masuk dan seragam?",
  "Apa keuntungan khusus alumni SD Maarif Jogosari?",
  "Bagaimana alur pendaftaran 5 langkah?",
  "Apa saja syarat dan berkas yang harus diunggah?",
  "Bagaimana cara pembayaran online via Midtrans?",
  "Apa saja program unggulan dan ekstrakurikuler?",
  "Bagaimana cara mengecek status pendaftaran saya?"
];

export const SpmbAiAssistantModal: React.FC<SpmbAiAssistantModalProps> = ({
  isOpen,
  onClose,
  config,
  schoolIdentity,
  onNavigateTab
}) => {
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const contactPhone = config?.contactPhone || schoolIdentity?.phone || "+6285171151655";

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome-1",
        role: "model",
        text: `**Assalamu'alaikum Warahmatullahi Wabarakatuh!** 🌿\n\nSelamat datang di Layanan Asisten AI Resmi **${schoolName}** untuk SPMB Tahun Ajaran 2027/2028.\n\nSaya siap menjawab pertanyaan seputar:\n- 📅 **Jalur & Jadwal Pendaftaran** (Inden diskon 50%, Gelombang 1 diskon 25%)\n- 💰 **Rincian Biaya, Uang Gedung, SPP, & Seragam**\n- 🌟 **Diskon Spesial Siswa Asal SD Ma'arif Jogosari**\n- 📝 **Panduan 5 Langkah Pendaftaran Online**\n- 📄 **Syarat & Dokumen Persyaratan**\n- 🏫 **Profil Sekolah, Fasilitas, & Program Tahfidz**\n\nSilakan klik salah satu topik di bawah atau ketik langsung pertanyaan Anda!`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: "knowledge_base"
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);

    try {
      // Format recent history for backend
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/spmb/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload
        })
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const aiMsg: ChatMessage = {
          id: "ai-" + Date.now(),
          role: "model",
          text: data.reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: data.source
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Gagal mendapatkan respon");
      }
    } catch (err: any) {
      console.error("AI Assistant chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "model",
        text: `Mohon maaf, terjadi kendala saat memproses jawaban. Silakan coba kembali atau hubungi Panitia SPMB ${schoolName} via WhatsApp di **${contactPhone}**.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: "knowledge_base"
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    if (confirm("Reset seluruh riwayat percakapan?")) {
      setMessages([
        {
          id: "welcome-reset",
          role: "model",
          text: `Percakapan telah direset. Silakan tanyakan hal apa pun seputar SPMB dan informasi ${schoolName}!`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: "knowledge_base"
        }
      ]);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to format basic markdown-like text (bold, list, paragraphs)
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return (
      <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Format bold **text**
          const parseBold = (content: string) => {
            const parts = content.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
              }
              return part;
            });
          };

          // Bullet points or numbers
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1.5">
                <span className="text-emerald-700 font-bold leading-none mt-1">•</span>
                <span className="text-slate-700 flex-1">{parseBold(trimmed.substring(2))}</span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+\.)\s(.*)/);
            if (match) {
              return (
                <div key={idx} className="flex items-start gap-2 pl-1.5">
                  <span className="text-emerald-800 font-bold text-[11px] shrink-0 mt-0.5">{match[1]}</span>
                  <span className="text-slate-700 flex-1">{parseBold(match[2])}</span>
                </div>
              );
            }
          }

          return (
            <p key={idx} className="m-0 text-slate-700">
              {parseBold(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`w-full bg-white flex flex-col shadow-2xl border border-slate-200 transition-all duration-300 overflow-hidden ${
          isExpanded 
            ? "sm:w-[680px] sm:h-[88vh] h-[92vh] sm:rounded-3xl rounded-t-3xl" 
            : "sm:w-[460px] sm:h-[720px] h-[85vh] sm:rounded-3xl rounded-t-3xl"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xs text-emerald-300">
                <Bot size={22} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold m-0 leading-tight">Asisten AI SPMB</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-medium border border-emerald-400/30">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80 m-0 mt-0.5">
                {schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              title="Reset Chat"
              className="p-2 text-emerald-100/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Perkecil" : "Perbesar"}
              className="hidden sm:inline-flex p-2 text-emerald-100/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Tutup"
              className="p-2 text-emerald-100/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action quick links bar */}
        <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-900 shrink-0">
          <div className="flex items-center gap-1 font-medium">
            <Sparkles size={13} className="text-emerald-700" />
            <span>Respon Cepat SPMB 2027/2028</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("register");
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus size={11} />
                  <span>Daftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("portal");
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Search size={11} />
                  <span>Cek NISN</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] ${isUser ? "order-1" : "order-2"}`}>
                  <div
                    className={`p-4 rounded-2xl shadow-xs ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs sm:text-[13px] leading-relaxed m-0 font-medium whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    ) : (
                      renderFormattedText(msg.text)
                    )}
                  </div>

                  {/* Metadata and Copy Button */}
                  <div className={`flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500 ${isUser ? "justify-end" : "justify-start"}`}>
                    <span>{msg.time}</span>
                    {!isUser && (
                      <>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Salin jawaban"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-700" />
                              <span className="text-emerald-700 font-bold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={16} />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs rounded-bl-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                <span className="text-[11px] text-slate-500 ml-1.5 font-medium">Asisten sedang menyusun jawaban...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-2">
            <HelpCircle size={13} className="text-emerald-700" />
            <span>Pertanyaan Populer:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(suggestion)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Tanyakan apa saja seputar SPMB atau sekolah..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              <Send size={15} />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>Didukung AI & Basis Pengetahuan Resmi SPMB</span>
            <a
              href={`https://wa.me/${contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent("Halo Panitia SPMB SMP Maarif NU Pandaan, saya ingin bertanya...")}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
            >
              <Phone size={10} />
              <span>Hubungi Panitia WA</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
