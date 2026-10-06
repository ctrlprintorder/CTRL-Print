import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  Share2,
  Megaphone,
  Video,
  Hash,
  MessageCircle,
  Tag
} from 'lucide-react';
import { generateMarketingCaptionWithAI, MarketingCaptionData } from '../services/aiService';
import { openWhatsApp } from '../utils/whatsapp';

interface AIMarketingSectionProps {
  showToast: (msg: string, isErr?: boolean) => void;
}

const POPULAR_PRODUCTS = [
  'Banner Spanduk Flexi 280g',
  'Stiker Label Kemasan Vinil Die-Cut',
  'Brosur A4 Flayer HVS / Art Paper',
  'Kartu Nama Premium Soft Touch',
  'Id Card & Tali Lanyard Panitia',
  'Undangan Pernikahan Custom',
  'Mug & Merchandise Cetak Foto',
  'Nota NCR Rangkap 2/3 Custom Logo',
  'Spanduk Kain / Flags Banner',
  'Print Canvas & Frame Kayu',
];

export const AIMarketingSection: React.FC<AIMarketingSectionProps> = ({ showToast }) => {
  const [productName, setProductName] = useState('Banner Spanduk Flexi 280g');
  const [platform, setPlatform] = useState('Instagram Post/Reels');
  const [tone, setTone] = useState('Promosional / Diskon');
  const [targetAudience, setTargetAudience] = useState('UMKM & Pemilik Olshop');
  const [promoDetails, setPromoDetails] = useState('Pengerjaan cepat 1 hari jadi, cetak tajam anti luntur, gratis desain simpel!');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketingCaptionData | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productName.trim()) {
      showToast('Masukkan nama produk cetak terlebih dahulu', true);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await generateMarketingCaptionWithAI(
        productName,
        platform,
        tone,
        targetAudience,
        promoDetails
      );
      setResult(data);
      showToast('Caption & Strategi Marketing Berhasil Dibuat!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal menghasilkan caption AI', true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, type: 'hook' | 'caption' | 'hashtags') => {
    navigator.clipboard.writeText(text);
    if (type === 'hook') {
      setCopiedHook(true);
      setTimeout(() => setCopiedHook(false), 2000);
    } else if (type === 'caption') {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } else if (type === 'hashtags') {
      setCopiedHashtags(true);
      setTimeout(() => setCopiedHashtags(false), 2000);
    }
    showToast('Teks berhasil disalin ke clipboard!');
  };

  const handleShareToWA = () => {
    if (!result) return;
    const textToShare = `${result.hook}\n\n${result.caption}\n\n${result.hashtags.join(' ')}`;
    openWhatsApp(undefined, textToShare);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(236, 72, 153, 0.4)',
            }}
          >
            <Megaphone size={24} color="#FFF" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              AI Generator Caption & Marketing Medsos
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', opacity: 0.85 }}>
              Buat caption promosi viral, hashtag percetakan, dan ide konten visual untuk Instagram, WA Story, & TikTok dalam 3 detik.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Inputs vs Generated Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)',
          gap: '20px',
        }}
      >
        {/* Left Form Column */}
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} color="#2563EB" />
            <span>Pengaturan Konten Promosi</span>
          </div>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Produk Cetak */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Produk / Layanan Cetak
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Misal: Banner Flexi 280g, Stiker Vinil, Brosur A4..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                }}
              />
              {/* Quick Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {POPULAR_PRODUCTS.slice(0, 5).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProductName(p)}
                    style={{
                      background: productName === p ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-main)',
                      border: productName === p ? '1px solid #2563EB' : '1px solid var(--border-color)',
                      color: productName === p ? '#2563EB' : 'var(--text-muted)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Platform & Tone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Target Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                  }}
                >
                  <option value="Instagram Post/Reels">Instagram (Post/Reels)</option>
                  <option value="WhatsApp Story">WhatsApp Story</option>
                  <option value="TikTok Video">TikTok Video Caption</option>
                  <option value="Facebook Ads">Facebook / Marketplace</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Gaya / Tone Bicara
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                  }}
                >
                  <option value="Promosional / Diskon">Promosional & Diskon</option>
                  <option value="Edukatif & Tips Cetak">Edukatif & Tips Cetak</option>
                  <option value="Elegan & Exclusive">Elegan & Exclusive</option>
                  <option value="Santai & Lucu">Santai & Kekinian</option>
                </select>
              </div>
            </div>

            {/* Target Audiens */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Target Pembeli (Audiens)
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                }}
              >
                <option value="UMKM & Pemilik Olshop">UMKM & Pemilik Olshop (Stiker/Banner)</option>
                <option value="Panitia Acara & Event Organizer">Panitia Acara & Event (Banner/Id Card)</option>
                <option value="Perusahaan & Kantoran">Perusahaan & Kantoran (Brosur/Nota)</option>
                <option value="Umum & Perorangan">Umum & Perorangan (Undangan/Mug)</option>
              </select>
            </div>

            {/* Detail Promo / Keunggulan */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Detail Promo / Keunggulan Produk
              </label>
              <textarea
                rows={2}
                value={promoDetails}
                onChange={(e) => setPromoDetails(e.target.value)}
                placeholder="Misal: Gratis desain simpel, diskon 15%, express 2 jam..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  resize: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFF',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Sedang Menggenerasi...
                </>
              ) : (
                <>
                  <Sparkles size={18} color="#FFD700" /> Hasilkan Caption & Konten AI
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Output Column */}
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {!result && !loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(37, 99, 235, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Sparkles size={28} color="#2563EB" />
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Belum Ada Content Generated
              </h4>
              <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', maxWidth: '300px' }}>
                Pilih produk cetak dan klik tombol <b>"Hasilkan Caption & Konten AI"</b> untuk mendapatkan materi iklan siap pakai.
              </p>
            </div>
          )}

          {loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '50px 20px',
                color: 'var(--primary)',
              }}
            >
              <Loader2 size={36} className="animate-spin" />
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Membuat copywriting terbaik untuk {productName}...</div>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Hook Card */}
              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', marginBottom: '4px' }}>
                    🔥 JUDUL PENGAIT (HOOK PENGATUR ATENSI):
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.4' }}>
                    "{result.hook}"
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(result.hook, 'hook')}
                  title="Salin Hook"
                  style={{
                    background: '#FFF',
                    border: '1px solid var(--border-color)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  {copiedHook ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedHook ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              {/* Main Caption Card */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={16} color="#10B981" />
                    <span>TEKS CAPTION LENGKAP ({platform}):</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyText(result.caption, 'caption')}
                      style={{
                        background: '#FFF',
                        border: '1px solid var(--border-color)',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {copiedCaption ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      <span>{copiedCaption ? 'Tersalin' : 'Salin Caption'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareToWA}
                      style={{
                        background: '#10B981',
                        color: '#FFF',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Send size={13} />
                      <span>Kirim ke WA</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12.5px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-main)',
                    background: '#FFF',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {result.caption}
                </div>
              </div>

              {/* Hashtags Section */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Hash size={14} color="#EC4899" /> REKOMENDASI HASHTAG VIRAL:
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(result.hashtags.join(' '), 'hashtags')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedHashtags ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    <span>{copiedHashtags ? 'Hashtag Tersalin' : 'Salin Semua Hashtag'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.hashtags?.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#FFF',
                        border: '1px solid var(--border-color)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#EC4899',
                      }}
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual Idea Card */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Video size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#D97706', marginBottom: '2px' }}>
                    💡 SARAN IDE VIDEO REELS / FOTO WORKSHOP:
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    {result.visualIdea}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
