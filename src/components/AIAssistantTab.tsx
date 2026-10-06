import React, { useState } from 'react';
import { Sparkles, Bot, Send, Loader2, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, User, CheckCircle2, Megaphone, BarChart3 } from 'lucide-react';
import { getBusinessInsightsWithAI, chatWithAIAssistant, BusinessInsightsData } from '../services/aiService';
import { AIMarketingSection } from './AIMarketingSection';

interface AIAssistantTabProps {
  summary: {
    totalOmset: number;
    totalPiutang: number;
    totalPengeluaran: number;
    profitBersih: number;
  };
  invoiceCount: number;
  showToast: (msg: string, isErr?: boolean) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  summary,
  invoiceCount,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'advisor' | 'marketing'>('advisor');

  const [insights, setInsights] = useState<BusinessInsightsData | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Halo Bos CTRL PRINT! 👋 Saya **CTRL AI Assistant**, asisten bisnis pintar toko percetakan Anda. Ada yang bisa saya bantu analisis hari ini? Anda bisa menanyakan performa omzet, strategi penagihan piutang, rekomendasi harga cetak, atau ide promo baru!',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const handleFetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await getBusinessInsightsWithAI(summary, invoiceCount);
      setInsights(data);
      showToast('Analisis bisnis berhasil diperbarui!');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memuat analisis bisnis AI', true);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || loadingChat) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoadingChat(true);

    try {
      const aiReply = await chatWithAIAssistant(newMessages, summary);
      setMessages([...newMessages, { role: 'assistant', content: aiReply }]);
    } catch (err: any) {
      console.error(err);
      showToast('Gagal mendapat balasan AI', true);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Maaf, terjadi gangguan koneksi AI. Silakan coba kirim lagi pertanyaan Anda.',
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: 'var(--card-bg)',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('advisor')}
          style={{
            background: activeSubTab === 'advisor' ? '#2563EB' : 'transparent',
            color: activeSubTab === 'advisor' ? '#FFFFFF' : 'var(--text-main)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <BarChart3 size={16} />
          <span>Audit Finansial & AI Advisor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('marketing')}
          style={{
            background: activeSubTab === 'marketing' ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' : 'transparent',
            color: activeSubTab === 'marketing' ? '#FFFFFF' : 'var(--text-main)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <Megaphone size={16} />
          <span>AI Generator Marketing & Medsos</span>
        </button>
      </div>

      {/* SUB-TAB 1: ADVISOR & AUDIT */}
      {activeSubTab === 'advisor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
              color: '#FFFFFF',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={28} color="#FFD700" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>CTRL AI Business Advisor</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                  Kecerdasan Buatan untuk Analisis Finansial, Strategi Penjualan, & Konsultasi Toko Percetakan
                </p>
              </div>
            </div>

            <button
              onClick={handleFetchInsights}
              disabled={loadingInsights}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loadingInsights ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              }}
            >
              {loadingInsights ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Menganalisis...
                </>
              ) : (
                <>
                  <RefreshCw size={16} /> {insights ? 'Perbarui Analisis' : 'Jalankan Audit AI Usaha'}
                </>
              )}
            </button>
          </div>

          {/* Insights Section */}
          {insights && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Health Score Card */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    SKOR KESEHATAN FINANSIAL
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: insights.healthScore >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: insights.healthScore >= 75 ? '#10B981' : '#D97706',
                    }}
                  >
                    {insights.healthScore >= 75 ? 'Sangat Baik' : 'Perlu Perhatian'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--primary)' }}>
                    {insights.healthScore}
                  </span>
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                </div>

                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4' }}>
                  "{insights.headline}"
                </p>
              </div>

              {/* Insights List */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} /> TEMUAN PENTING BISNIS
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {insights.insights?.map((item, idx) => (
                    <li key={idx} style={{ lineHeight: '1.5' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations List */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={16} /> REKOMENDASI AKSI LANGSUNG
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {insights.recommendations?.map((rec, idx) => (
                    <li key={idx} style={{ lineHeight: '1.5' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Interactive AI Chat Box */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '480px',
            }}
          >
            {/* Chat Header */}
            <div
              style={{
                padding: '14px 20px',
                background: 'var(--bg-main)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Tanya Jawab & Konsultasi AI Percetakan
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Terhubung langsung dengan data keuangan real-time usaha Anda
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div
              style={{
                flex: 1,
                padding: '16px 20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'var(--card-bg)',
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  {m.role === 'assistant' && (
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#2563EB',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={16} />
                    </div>
                  )}

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: m.role === 'user' ? '#2563EB' : 'var(--bg-main)',
                      color: m.role === 'user' ? '#FFFFFF' : 'var(--text-main)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {m.content}
                  </div>

                  {m.role === 'user' && (
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#64748B',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))}

              {loadingChat && (
                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#2563EB',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={16} />
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px 14px 14px 2px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      fontSize: '12.5px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" /> Sedang berpikir...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ketik pertanyaan bisnis (misal: 'Berapa piutang belum lunas?', 'Kasih ide promo cetak')..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#FFF',
                }}
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loadingChat}
                style={{
                  background: '#2563EB',
                  color: '#FFF',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: !inputQuery.trim() || loadingChat ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !inputQuery.trim() || loadingChat ? 0.6 : 1,
                }}
              >
                <Send size={15} /> Kirim
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MARKETING GENERATOR */}
      {activeSubTab === 'marketing' && (
        <AIMarketingSection showToast={showToast} />
      )}
    </div>
  );
};

