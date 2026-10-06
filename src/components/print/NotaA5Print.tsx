import React from 'react';
import { Invoice, Settings } from '../../types';
import { convertToDirectImageUrl } from '../../firebaseService';
import { formatDate } from '../../utils/date';

interface NotaA5PrintProps {
  invoice: Invoice;
  settings: Settings;
  formatRupiah: (val: number | string | undefined | null) => string;
  formatNumber: (val: number | string | undefined | null) => string;
}

export const NotaA5Print: React.FC<NotaA5PrintProps> = ({
  invoice,
  settings,
  formatRupiah,
  formatNumber,
}) => {
  // Format bank account lines cleanly, separating accounts and instructions
  const renderBankDetails = () => {
    const rawBank = (settings.bank || '').trim();
    if (!rawBank) {
      return <div style={{ fontWeight: 800, color: '#0F172A' }}>BCA / Mandiri / Rekening Resmi Toko</div>;
    }

    let normalized = rawBank;
    if (!normalized.includes('\n')) {
      normalized = normalized
        .replace(/\s+(BCA\s*:?)/gi, '\n$1')
        .replace(/\s+(MANDIRI\s*:?)/gi, '\n$1')
        .replace(/\s+(BNI\s*:?)/gi, '\n$1')
        .replace(/\s+(BRI\s*:?)/gi, '\n$1')
        .replace(/\s+(BSI\s*:?)/gi, '\n$1')
        .replace(/\s+(a\.?n\.?\s+)/gi, '\n$1')
        .replace(/\s+(Mohon\s+lampirkan)/gi, '\n$1');
    }

    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {lines.map((line, idx) => {
          const isNote = /^(mohon|harap|catatan|bukti|konfirmasi)/i.test(line);
          if (isNote) {
            return (
              <div key={idx} style={{ marginTop: '2px', fontSize: '8.5px', fontStyle: 'italic', color: '#475569', lineHeight: 1.3 }}>
                {line}
              </div>
            );
          }
          return (
            <div key={idx} style={{ fontWeight: 800, color: '#0F172A', fontSize: '10px', lineHeight: 1.35 }}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  // Resolusi nama metode pembayaran sesuai pilihan pembayaran invoice atau konfigurasi sistem
  const getPaymentMethodLabel = () => {
    if (invoice.bayarNote && invoice.bayarNote.trim()) {
      return invoice.bayarNote.trim();
    }
    if (invoice.historyBayar && invoice.historyBayar.length > 0) {
      const methods = invoice.historyBayar
        .map((h) => (h.metode || h.note || '').trim())
        .filter((m) => m && !m.toLowerCase().startsWith('dp /') && !m.toLowerCase().startsWith('pelunasan masal'));
      if (methods.length > 0) {
        return Array.from(new Set(methods)).join(' / ');
      }
    }
    const configuredMethods = (settings.paymentMethods || 'Cash, Transfer BCA, Mandiri, QRIS')
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return configuredMethods[0] || 'Cash';
  };

  return (
    <div id="printable-area" className="active-print" style={{ padding: '18px 22px', background: '#FFF', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0F172A' }}>
        {/* Header Toko & Judul Dokumen */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            borderBottom: '2px solid #0F172A',
            paddingBottom: '10px',
            marginBottom: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="print-logo-img"
                style={{
                  height: '44px',
                  width: 'auto',
                  maxHeight: '44px',
                  objectFit: 'contain',
                  backgroundColor: 'transparent',
                  mixBlendMode: 'multiply',
                  flexShrink: 0,
                  display: 'block'
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, color: '#0F172A', fontSize: '17px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {settings.company || 'CTRL PRINT'}
              </h2>
              <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '2px', lineHeight: '1.35', wordBreak: 'break-word' }}>
                {settings.address || ''} <br />
                Telp/WA: <strong style={{ color: '#0F172A' }}>{settings.phone || '-'}</strong>
                {settings.email ? ` • Email: ${settings.email}` : ''}
                {settings.instagram ? ` • IG: @${settings.instagram.replace('@', '')}` : ''}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              NOTA PENJUALAN
            </div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#2563EB', marginTop: '2px', letterSpacing: '0.5px' }}>
              #{invoice.noInv}
            </div>
            <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '2px' }}>
              Tanggal: <strong style={{ color: '#0F172A' }}>{formatDate(invoice.tglInv)}</strong> {invoice.tempoInv ? ` • Tempo: ${formatDate(invoice.tempoInv)}` : ''}
            </div>
          </div>
        </div>

        {/* Info Pelanggan & Status Pembayaran */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '8px',
            marginBottom: '8px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#64748B', fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
              DITUJUKAN KEPADA:
            </div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
              {invoice.namaCust}
            </div>
            {invoice.alamatCust && <div style={{ fontSize: '9px', color: '#334155', marginTop: '2px', lineHeight: 1.3 }}>{invoice.alamatCust}</div>}
            {invoice.waCust && <div style={{ fontSize: '9px', color: '#334155', marginTop: '1px' }}>Telp/WA: <strong style={{ color: '#0F172A' }}>{invoice.waCust}</strong></div>}
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: '10px',
                background: invoice.statusBayar === 'Paid' || invoice.statusBayar === 'Lunas' || (invoice.sisaTertagih || 0) <= 0 ? '#ECFDF5' : '#FEF2F2',
                color: invoice.statusBayar === 'Paid' || invoice.statusBayar === 'Lunas' || (invoice.sisaTertagih || 0) <= 0 ? '#059669' : '#DC2626',
                border: `1px solid ${invoice.statusBayar === 'Paid' || invoice.statusBayar === 'Lunas' || (invoice.sisaTertagih || 0) <= 0 ? '#A7F3D0' : '#FECACA'}`
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
              STATUS: {invoice.statusBayar || ((invoice.sisaTertagih || 0) <= 0 ? 'Lunas' : 'Belum Lunas')}
            </div>

            {invoice.estimasiPengerjaan && (
              <div
                style={{
                  fontSize: '9px',
                  color: '#2563EB',
                  marginTop: '1px'
                }}
              >
                Estimasi Selesai: <strong>{invoice.estimasiPengerjaan}</strong>
              </div>
            )}

            {(invoice.bayarNote || (Number(invoice.dibayar) > 0)) && (
              <div style={{ fontSize: '8.5px', color: '#64748B' }}>
                Metode: <strong style={{ color: '#0F172A' }}>{getPaymentMethodLabel()}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Tabel Rincian Pesanan yang Rapi & Terstruktur */}
        <table className="inv-items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0 8px 0', fontSize: '10.5px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderTop: '1px solid #CBD5E1', borderBottom: '1.5px solid #0F172A' }}>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: '30px', color: '#334155', fontWeight: 800 }}>NO</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', color: '#334155', fontWeight: 800 }}>DESKRIPSI PRODUK &amp; SPESIFIKASI</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: '48px', color: '#334155', fontWeight: 800 }}>QTY</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: '52px', color: '#334155', fontWeight: 800 }}>SATUAN</th>
              <th style={{ padding: '5px 8px', textAlign: 'right', width: '85px', color: '#334155', fontWeight: 800 }}>HARGA</th>
              <th style={{ padding: '5px 8px', textAlign: 'right', width: '95px', color: '#334155', fontWeight: 800 }}>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#FBFCFD' }}>
                <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748B', fontWeight: 700 }}>{idx + 1}</td>
                <td style={{ padding: '5px 8px', textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '11px' }}>
                    {it.nama}
                    {it.kategori && <span style={{ fontSize: '9px', color: '#2563EB', marginLeft: '6px', fontWeight: 600 }}>({it.kategori})</span>}
                  </div>
                  {(it.desc || it.keterangan) && (
                    <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px', lineHeight: 1.3 }}>
                      {it.desc || it.keterangan}
                    </div>
                  )}
                  {(it.finishingDetailsText || it.finishingType || it.finishing) && (
                    <div style={{ fontSize: '9px', color: '#2563EB', fontWeight: 700, marginTop: '2px' }}>
                      Finishing: {it.finishingDetailsText || it.finishingType || it.finishing}
                    </div>
                  )}
                  {(it.panjang || it.lebar || it.bahan) && (
                    <div style={{ fontSize: '8.5px', color: '#64748B', marginTop: '2px' }}>
                      {it.panjang && it.lebar ? `Ukuran: ${it.panjang}x${it.lebar} cm • ` : ''}
                      {it.bahan ? `Bahan: ${it.bahan}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '11.5px', color: '#0F172A' }}>
                  {formatNumber(it.qty)}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', color: '#475569' }}>
                  {it.satuan || 'Pcs'}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(it.harga)}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(it.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Area Bawah: Dua Kolom Utama (Sisi Kiri: Pembayaran & TNC, Sisi Kanan: Subtotal & TTD) */}
        <div className="print-avoid-break" style={{ display: 'grid', gridTemplateColumns: settings.qrisUrl ? '1.25fr 1fr' : '1.15fr 1fr', gap: '16px', marginTop: '8px' }}>
          {/* Sisi Kiri: Kotak Terpadu Pembayaran Resmi & QRIS + Syarat & Ketentuan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Kotak Terpadu Pembayaran Resmi & Barcode QRIS Statis */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '8px 10px'
              }}
            >
              <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', marginBottom: '5px', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px' }}>
                PEMBAYARAN RESMI:
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Info Rekening */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renderBankDetails()}
                  {settings.catatanNota && (
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#64748B', fontSize: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '3px', lineHeight: 1.25 }}>
                      "{settings.catatanNota}"
                    </div>
                  )}
                </div>

                {/* Barcode QRIS Statis Toko */}
                {settings.qrisUrl && (
                  <div
                    style={{
                      width: '78px',
                      flexShrink: 0,
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '5px',
                      padding: '4px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '7.5px',
                        fontWeight: 900,
                        color: '#059669',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        marginBottom: '2px',
                        lineHeight: 1
                      }}
                    >
                      SCAN QRIS
                    </div>
                    <img
                      src={convertToDirectImageUrl(settings.qrisUrl)}
                      alt="QRIS"
                      style={{
                        width: '62px',
                        height: '62px',
                        objectFit: 'contain',
                        display: 'block',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <div
                      style={{
                        fontSize: '7px',
                        fontWeight: 800,
                        color: '#0F172A',
                        marginTop: '2px',
                        lineHeight: 1.15,
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={settings.qrisNms || settings.company || 'QRIS RESMI'}
                    >
                      {settings.qrisNms || settings.company || 'QRIS RESMI'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Syarat & Ketentuan di Bawah Kotak Pembayaran (Sisi Kiri) */}
            {settings.tnc && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 10px' }}>
                <div style={{ fontSize: '8px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Syarat &amp; Ketentuan:
                </div>
                <div style={{ fontSize: '7.5px', color: '#64748B', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                  {settings.tnc}
                </div>
              </div>
            )}
          </div>

          {/* Sisi Kanan: Ringkasan Biaya (Subtotal) & Tanda Tangan Berdampingan Sejajar */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 0', color: '#64748B' }}>Subtotal Item:</td>
                  <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(invoice.subtotalSum || invoice.grandTotal)}</td>
                </tr>
                {Number(invoice.diskonTambahan) > 0 && (
                  <tr>
                    <td style={{ padding: '2px 0', color: '#DC2626' }}>Diskon:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', color: '#DC2626', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>- {formatRupiah(invoice.diskonTambahan)}</td>
                  </tr>
                )}
                {Number(invoice.ongkir) > 0 && (
                  <tr>
                    <td style={{ padding: '2px 0', color: '#64748B' }}>Ongkos Kirim:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(invoice.ongkir)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '1.5px solid #0F172A', borderBottom: '1.5px solid #0F172A', fontWeight: 800 }}>
                  <td style={{ padding: '4px 0', textAlign: 'left', fontSize: '11px', color: '#0F172A' }}>GRAND TOTAL:</td>
                  <td style={{ padding: '4px 0', fontSize: '13.5px', color: '#2563EB', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 900 }}>{formatRupiah(invoice.grandTotal)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0 1px 0', textAlign: 'left', color: '#64748B' }}>Dibayar ({getPaymentMethodLabel()}):</td>
                  <td style={{ padding: '3px 0 1px 0', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatRupiah(invoice.dibayar)}</td>
                </tr>
                <tr style={{ fontWeight: 800 }}>
                  <td style={{ padding: '3px 0 1px 0', textAlign: 'left', fontSize: '10px', color: '#0F172A' }}>
                    {(invoice.sisaTertagih || 0) > 0 ? 'SISA TAGIHAN:' : 'KETERANGAN:'}
                  </td>
                  <td style={{ padding: '3px 0 1px 0', fontSize: '11px', color: (invoice.sisaTertagih || 0) > 0 ? '#DC2626' : '#059669', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 900 }}>
                    {(invoice.sisaTertagih || 0) > 0 ? formatRupiah(invoice.sisaTertagih) : 'LUNAS'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tanda Terima (Pelanggan) & Hormat Kami - Persis Sejajar Selebar Tabel Subtotal */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginTop: '20px',
                textAlign: 'center',
                fontSize: '9px'
              }}
            >
              {/* Kolom Tanda Terima (Pelanggan) */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#64748B', fontWeight: 700, fontSize: '8.5px' }}>Tanda Terima,</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {invoice.namaCust}
                  </div>
                </div>
                {/* Area Lapang untuk TTD & Stempel Pelanggan */}
                <div style={{ height: '48px' }} />
                <div>
                  <div style={{ borderBottom: '1px solid #94A3B8', width: '80%', margin: '0 auto 4px auto' }} />
                  <div style={{ fontSize: '7.5px', color: '#94A3B8' }}>( Pelanggan )</div>
                </div>
              </div>

              {/* Kolom Hormat Kami */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#64748B', fontWeight: 700, fontSize: '8.5px' }}>Hormat Kami,</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {settings.company || 'CTRL PRINT'}
                  </div>
                </div>
                {/* Area Lapang untuk TTD & Stempel Toko */}
                <div style={{ height: '48px' }} />
                <div>
                  <div style={{ borderBottom: '1px solid #94A3B8', width: '80%', margin: '0 auto 4px auto' }} />
                  <div style={{ fontSize: '7.5px', color: '#94A3B8' }}>( Kasir / Petugas )</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
