import React from 'react';
import { Invoice, Settings } from '../../types';
import { formatDate } from '../../utils/date';

interface QuotationPrintProps {
  invoice: Invoice;
  settings: Settings;
  quoteValidityDays: number;
  quoteSubject: string;
  formatRupiah: (val: number | string | undefined | null) => string;
  formatNumber: (val: number | string | undefined | null) => string;
  getValidUntilDate: (dateStr?: string, days?: number) => string;
}

export const QuotationPrint: React.FC<QuotationPrintProps> = ({
  invoice,
  settings,
  quoteValidityDays,
  quoteSubject,
  formatRupiah,
  formatNumber,
  getValidUntilDate,
}) => {
  return (
    <div id="printable-area" className="active-print" style={{ padding: '18px 22px', background: '#FFF', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0F172A' }}>
        {/* Header Penawaran */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="print-logo-img"
                style={{
                  height: '46px',
                  width: 'auto',
                  maxHeight: '46px',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                  flexShrink: 0
                }}
              />
            )}
            <div>
              <h2 style={{ margin: 0, color: '#0F172A', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {settings.company || 'CTRL PRINT'}
              </h2>
              <div style={{ fontSize: '10px', color: '#334155', marginTop: '3px', lineHeight: '1.4' }}>
                {settings.address || ''} <br />
                Telp/WA: <strong style={{ color: '#0F172A' }}>{settings.phone || '-'}</strong>
                {settings.email ? ` • Email: ${settings.email}` : ''}
                {settings.instagram ? ` • IG: @${settings.instagram.replace('@', '')}` : ''}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              SURAT PENAWARAN HARGA
            </div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>
              #{invoice.noInv}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              Tgl Terbit: <strong style={{ color: '#0F172A' }}>{formatDate(invoice.tglInv)}</strong>
            </div>
            <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
              Berlaku s/d: {getValidUntilDate(invoice.tglInv, quoteValidityDays)} ({quoteValidityDays} Hari)
            </div>
          </div>
        </div>

        {/* Info Kepada Yth & Perihal */}
        <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>KEPADA YTH:</div>
              <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#0F172A' }}>{invoice.namaCust}</div>
              {invoice.alamatCust && <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '2px' }}>{invoice.alamatCust}</div>}
              {invoice.waCust && <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '2px' }}>Telp/WA: <strong>{invoice.waCust}</strong></div>}
            </div>
            <div style={{ textAlign: 'right', maxWidth: '320px' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>PERIHAL:</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>{quoteSubject}</div>
              {invoice.estimasiPengerjaan && (
                <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>
                  Waktu Produksi: <strong>{invoice.estimasiPengerjaan}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Surat Pengantar Singkat */}
        <div style={{ fontSize: '9.5px', color: '#475569', lineHeight: '1.4', marginBottom: '8px' }}>
          Dengan hormat, bersama ini kami dari <strong>{settings.company || 'CTRL PRINT'}</strong> mengajukan penawaran harga resmi untuk produk dan jasa percetakan dengan rincian spesifikasi teknis dan estimasi biaya sebagai berikut:
        </div>

        {/* Tabel Item Penawaran */}
        <table className="inv-items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0 8px 0', fontSize: '10.5px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderTop: '1px solid #CBD5E1', borderBottom: '1.5px solid #0F172A' }}>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: '30px', color: '#334155', fontWeight: 800 }}>NO</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', color: '#334155', fontWeight: 800 }}>PRODUK &amp; SPESIFIKASI TEKNIS</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: '50px', color: '#334155', fontWeight: 800 }}>QTY</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: '52px', color: '#334155', fontWeight: 800 }}>SATUAN</th>
              <th style={{ padding: '5px 8px', textAlign: 'right', width: '90px', color: '#334155', fontWeight: 800 }}>HARGA SATUAN</th>
              <th style={{ padding: '5px 8px', textAlign: 'right', width: '100px', color: '#334155', fontWeight: 800 }}>SUBTOTAL (RP)</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#FBFCFD' }}>
                <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748B', fontWeight: 700 }}>{idx + 1}</td>
                <td style={{ padding: '5px 8px', textAlign: 'left' }}>
                  <strong style={{ color: '#0F172A', fontSize: '11px' }}>{it.nama}</strong>
                  {it.kategori && <span style={{ fontSize: '9px', color: '#2563EB', marginLeft: '6px', fontWeight: 600 }}>({it.kategori})</span>}
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
                <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '11.5px', color: '#0F172A' }}>{formatNumber(it.qty)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center', color: '#475569' }}>{it.satuan || 'Pcs'}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.harga)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ringkasan Total & T&C - Baris 1 */}
        <div className="print-avoid-break" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginTop: '6px' }}>
          {/* Syarat & Ketentuan Penawaran */}
          <div style={{ fontSize: '8.5px', color: '#475569', lineHeight: 1.4, paddingRight: '4px' }}>
            <strong style={{ color: '#0F172A', display: 'block', marginBottom: '3px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SYARAT &amp; KETENTUAN PENAWARAN:</strong>
            <ol style={{ margin: 0, paddingLeft: '14px' }}>
              <li>Harga penawaran ini berlaku selama <strong>{quoteValidityDays} hari kalender</strong> sejak diterbitkan.</li>
              <li>Waktu produksi: <strong>{invoice.estimasiPengerjaan || '1-3 Hari Kerja'}</strong> setelah ACC desain dan DP.</li>
              <li>Ketentuan pembayaran: Uang Muka (DP) min. 50% saat order, pelunasan sebelum pengiriman.</li>
              <li>Rekening transfer resmi: <strong style={{ color: '#0F172A' }}>{settings.bank || 'BCA / Mandiri / Rekening Toko'}</strong>.</li>
              <li>Perubahan spesifikasi material atau dimensi setelah proses cetak dapat memicu penyesuaian biaya.</li>
            </ol>
          </div>

          {/* Tabel Ringkasan Biaya */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 0', color: '#64748B' }}>Subtotal:</td>
                  <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(invoice.subtotalSum || invoice.grandTotal)}</td>
                </tr>
                {Number(invoice.diskonTambahan) > 0 && (
                  <tr>
                    <td style={{ padding: '2px 0', color: '#DC2626' }}>Diskon Khusus:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', color: '#DC2626', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>- {formatRupiah(invoice.diskonTambahan)}</td>
                  </tr>
                )}
                {Number(invoice.ongkir) > 0 && (
                  <tr>
                    <td style={{ padding: '2px 0', color: '#64748B' }}>Biaya Pengiriman:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(invoice.ongkir)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '1.5px solid #0F172A', borderBottom: '1.5px solid #0F172A', fontWeight: 800 }}>
                  <td style={{ padding: '4px 0', fontSize: '11px', color: '#0F172A' }}>TOTAL PENAWARAN:</td>
                  <td style={{ padding: '4px 0', fontSize: '13.5px', color: '#2563EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 900 }}>{formatRupiah(invoice.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Tanda Tangan Simetris Penuh - Baris 2 */}
        <div className="print-avoid-break" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px', textAlign: 'center', fontSize: '9px' }}>
          <div>
            <div style={{ color: '#64748B', fontWeight: 700 }}>Disetujui Oleh (Klien),</div>
            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '10.5px' }}>{invoice.namaCust}</div>
            <div style={{ borderBottom: '1px solid #94A3B8', width: '60%', margin: '26px auto 3px auto' }} />
            <div style={{ fontSize: '8px', color: '#94A3B8' }}>Tgl: .......................................</div>
          </div>
          <div>
            <div style={{ color: '#64748B', fontWeight: 700 }}>Hormat Kami,</div>
            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '10.5px' }}>{settings.company || 'CTRL PRINT'}</div>
            <div style={{ borderBottom: '1px solid #94A3B8', width: '60%', margin: '26px auto 3px auto' }} />
            <div style={{ fontSize: '8px', color: '#94A3B8' }}>Tanda Tangan &amp; Stempel Toko</div>
          </div>
        </div>
      </div>
    </div>
  );
};
