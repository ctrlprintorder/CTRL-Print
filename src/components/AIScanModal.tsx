import React, { useState } from 'react';
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { parseInvoiceWithAI, ParsedInvoiceData } from '../services/aiService';

interface AIScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ParsedInvoiceData) => void;
  showToast: (msg: string, isErr?: boolean) => void;
}

export const AIScanModal: React.FC<AIScanModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Mohon unggah berkas gambar (JPG, PNG, WEBP, dll)', true);
        return;
      }
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setFilePreview(objUrl);
    }
  };

  const handleScan = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      let result: ParsedInvoiceData;
      if (activeTab === 'upload') {
        if (!selectedFile && !filePreview) {
          showToast('Pilih gambar nota/faktur terlebih dahulu!', true);
          setIsLoading(false);
          return;
        }
        let base64 = '';
        if (selectedFile) {
          const buffer = await selectedFile.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64 = `data:${selectedFile.type || 'image/jpeg'};base64,${btoa(binary)}`;
        }
        result = await parseInvoiceWithAI(base64);
      } else {
        if (!pastedText.trim()) {
          showToast('Masukkan teks atau chat nota/pesanan pelanggan!', true);
          setIsLoading(false);
          return;
        }
        result = await parseInvoiceWithAI(undefined, pastedText);
      }

      onApplyData(result);
      showToast('Berhasil mengekstrak data nota');
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengekstrak data nota.');
      showToast('Gagal mengekstrak nota AI', true);
    } finally {
      setIsLoading(false);
    }
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
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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
              <Sparkles size={20} color="#FFD700" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Scan Nota Gambar / Teks AI</h3>
              <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.9 }}>
                Otomatis isi form transaksi dari foto nota lama atau chat WA pelanggan
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
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color, #E2E8F0)',
            background: 'var(--bg-main, #F8FAFC)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'upload' ? 'var(--card-bg, #FFF)' : 'transparent',
              borderBottom: activeTab === 'upload' ? '2px solid #2563EB' : 'none',
              fontWeight: activeTab === 'upload' ? 700 : 500,
              fontSize: '13px',
              color: activeTab === 'upload' ? '#2563EB' : 'var(--text-muted, #64748B)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Upload size={16} /> Unggah Foto Nota
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'text' ? 'var(--card-bg, #FFF)' : 'transparent',
              borderBottom: activeTab === 'text' ? '2px solid #2563EB' : 'none',
              fontWeight: activeTab === 'text' ? 700 : 500,
              fontSize: '13px',
              color: activeTab === 'text' ? '#2563EB' : 'var(--text-muted, #64748B)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} /> Tempel Teks / Chat WA
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label
                style={{
                  border: '2px dashed var(--border-color, #CBD5E1)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-main, #F8FAFC)',
                  transition: 'border-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {filePreview ? (
                  <div style={{ position: 'relative', width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '8px' }}>
                    <img
                      src={filePreview}
                      alt="Preview"
                      style={{ width: '100%', height: '180px', objectFit: 'contain' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#FFF',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      Klik untuk ganti gambar
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #1E293B)' }}>
                      Pilih Foto Nota / Struk / Screenshot
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>
                      Mendukung format JPG, PNG, WEBP dari kamera HP atau komputer
                    </span>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #1E293B)' }}>
                Tempel Pesan Order / Rincian Chat Pelanggan:
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Contoh: Bikin Banner Flexi 280 3x1m 2 lembar (Rp 150.000) sama Cetak Stiker Vinyl 100 lembar (Rp 200.000) atas nama Pak Hendra WA 08123456789 DP 100rb..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleScan}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFF',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Menganalisis dengan AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} color="#FFD700" /> Ekstrak & Isi Form Transaksi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
