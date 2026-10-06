import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Copy, Check, Send, Loader2, X, PhoneCall } from 'lucide-react';
import { generateWaMessageWithAI } from '../services/aiService';
import { openWhatsApp } from '../utils/whatsapp';
import { formatRupiah } from '../utils/currency';

import { Settings } from '../types';

interface AIWaModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  settings?: Settings;
  showToast: (msg: string, isErr?: boolean) => void;
}

export const AIWaModal: React.FC<AIWaModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  showToast,
}) => {
  const [msgType, setMsgType] = useState<
    'order_created' | 'payment_reminder' | 'design_acc' | 'shipping' | 'thank_you'
  >('order_created');
  const [customNote, setCustomNote] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getInstantMessage = (typeStr: string, note = '') => {
    const custName = invoice.namaCust || invoice.customerName || 'Pelanggan';
    const noInv = invoice.noInv || '-';
    const grandTotal = formatRupiah(invoice.grandTotal);
    const dibayar = formatRupiah(invoice.dibayar);
    const sisa = formatRupiah(invoice.sisaTertagih);
    const company = settings?.company || 'CTRL PRINT';
    const itemsText = (invoice.items || [])
      .map((it: any) => `• ${it.nama || it.title} (${it.qty} ${it.satuan || 'Pcs'})`)
      .join('\n');

    if (typeStr === 'design_acc') {
      let msg = `Halo Kak *${custName}* 👋,\n\n`;
      msg += `Berikut pratinjau / proofing *ACC Desain* untuk pesanan Nota *#${noInv}*:\n\n`;
      msg += `${itemsText}\n\n`;
      if (note) msg += `*Catatan Desainer:* ${note}\n\n`;
      msg += `Mohon dicek ejaan teks, ukuran, & warna. Jika sudah pas, mohon balas dengan *'ACC DESAIN'* agar kami teruskan ke proses cetak vendor.\n\nTerima kasih! 🙏\n*${company}*`;
      return msg;
    }

    if (typeStr === 'shipping') {
      let msg = `Halo Kak *${custName}* 👋,\n\n`;
      msg += `Kabar baik! Cetakan Nota *#${noInv}* telah selesai diproduksi dan siap/dalam proses pengiriman 🚚💨.\n\n`;
      msg += `*Rincian Barang:*\n${itemsText}\n\n`;
      if (note) msg += `*Info Pengiriman/Resi:* ${note}\n\n`;
      msg += `Terima kasih telah memesan cetakan secara online di *${company}*! 😊`;
      return msg;
    }

    if (typeStr === 'payment_reminder') {
      let msg = `Halo Kak *${custName}* 👋,\n\n`;
      msg += `Mengingatkan kembali informasi tagihan Nota *#${noInv}* di *${company}*.\n\n`;
      msg += `• Total Tagihan: Rp ${grandTotal}\n`;
      msg += `• Sudah Dibayar: Rp ${dibayar}\n`;
      msg += `• *Sisa Tertagih: Rp ${sisa}*\n\n`;
      if (settings?.bank) msg += `*Rekening Pembayaran:*\n${settings.bank}\n\n`;
      if (note) msg += `*Catatan:* ${note}\n\n`;
      msg += `Mohon konfirmasi setelah melakukan pembayaran. Terima kasih! 🙏`;
      return msg;
    }

    if (typeStr === 'thank_you') {
      let msg = `Halo Kak *${custName}* 👋,\n\n`;
      msg += `Terima kasih banyak telah mempercayakan cetakan Kakak di *${company}*!\n\n`;
      msg += `Pesanan Nota *#${noInv}* telah selesai. Semoga puas dengan hasilnya dan sukses selalu untuk usahanya!`;
      return msg;
    }

    let msg = `Halo Kak *${custName}* 👋,\n\n`;
    msg += `Terima kasih telah memesan cetakan di *${company}*.\n\n`;
    msg += `*Detail Nota #${noInv}:*\n`;
    msg += `${itemsText}\n\n`;
    msg += `• Total: Rp ${grandTotal}\n`;
    msg += `• Dibayar (DP): Rp ${dibayar}\n`;
    msg += `• Sisa: Rp ${sisa}\n`;
    if (invoice.estimasiPengerjaan) {
      msg += `• *Estimasi Pengerjaan:* ${invoice.estimasiPengerjaan}\n`;
    }
    msg += `\n`;
    if (sisa !== '0' && settings?.bank) {
      msg += `*Rekening Pembayaran:*\n${settings.bank}\n\n`;
    }
    if (note) msg += `*Catatan:* ${note}\n\n`;
    msg += `Pesanan Kakak akan segera kami proses. Terima kasih! 🙏`;
    return msg;
  };

  useEffect(() => {
    if (isOpen && invoice) {
      const initialType = (invoice.sisaTertagih || 0) > 0 ? 'payment_reminder' : 'order_created';
      setMsgType(initialType);
      handleGenerate(initialType);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handleGenerate = async (selectedType = msgType) => {
    setIsLoading(true);
    setCopied(false);
    try {
      const msg = await generateWaMessageWithAI(
        invoice,
        selectedType as any,
        customNote,
        settings?.bank || '',
        settings?.qrisNms || 'CTRL PRINT OFFICIAL'
      );
      setGeneratedMsg(msg);
    } catch (err: any) {
      console.warn('AI WA failed, using instant formatted template fallback');
      const fallback = getInstantMessage(selectedType, customNote);
      setGeneratedMsg(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMsg);
    setCopied(true);
    showToast('Pesan berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWA = () => {
    const phone = invoice.waCust || invoice.customerPhone || '';
    openWhatsApp(phone, generatedMsg);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>AI Generator Pesan WhatsApp</h3>
              <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.9 }}>
                Nota #{invoice.noInv} - {invoice.namaCust || invoice.customerName || 'Pelanggan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              opacity: 0.8,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Preset Buttons */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '6px', display: 'block' }}>
              PILIH TEMPLATE PESAN AI:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { id: 'order_created', label: '📩 Konfirmasi Nota' },
                { id: 'payment_reminder', label: '⏰ Tagihan & DP' },
                { id: 'design_acc', label: '🎨 Proofing ACC Desain' },
                { id: 'shipping', label: '🚚 Pengiriman & Resi' },
                { id: 'thank_you', label: '🙏 Ucapan Terima Kasih' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMsgType(t.id as any);
                    handleGenerate(t.id as any);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: msgType === t.id ? '1px solid #10B981' : '1px solid var(--border-color, #E2E8F0)',
                    background: msgType === t.id ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-main, #F8FAFC)',
                    color: msgType === t.id ? '#059669' : 'var(--text-main, #1E293B)',
                    fontWeight: msgType === t.id ? 700 : 500,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Note input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tambahkan catatan khusus jika ada (opsional)..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #E2E8F0)',
                fontSize: '12px',
              }}
            />
            <button
              type="button"
              onClick={() => handleGenerate(msgType)}
              disabled={isLoading}
              style={{
                background: '#10B981',
                color: '#FFF',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Buat Ulang
            </button>
          </div>

          {/* Generated Text Preview */}
          <div style={{ position: 'relative' }}>
            <textarea
              rows={8}
              value={generatedMsg}
              onChange={(e) => setGeneratedMsg(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #E2E8F0)',
                fontSize: '12.5px',
                lineHeight: '1.5',
                background: 'var(--bg-main, #F8FAFC)',
                color: 'var(--text-main, #1E293B)',
                outline: 'none',
              }}
            />
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                <Loader2 size={20} className="animate-spin" /> Menulis Pesan AI...
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!generatedMsg || isLoading}
              className="btn btn-outline"
              style={{ padding: '9px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              {copied ? 'Tersalin!' : 'Salin Teks'}
            </button>

            <button
              type="button"
              onClick={handleSendWA}
              disabled={!generatedMsg || isLoading}
              style={{
                background: '#10B981',
                color: '#FFF',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Send size={16} /> Buka & Kirim di WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
