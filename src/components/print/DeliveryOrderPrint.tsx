import React from 'react';
import { Invoice, Settings } from '../../types';
import { formatDate } from '../../utils/date';

interface DeliveryOrderPrintProps {
  invoice: Invoice;
  settings: Settings;
  doPenerima: string;
  doEkspedisi: string;
  doDriverName: string;
  doDriverPhone: string;
  doNoResi: string;
  doNotes: string;
  doDate: string;
  suratJalanNoFormatted: string;
  hidePricesInDO: boolean;
  formatRupiah: (val: number | string | undefined | null) => string;
  formatNumber: (val: number | string | undefined | null) => string;
}

export const DeliveryOrderPrint: React.FC<DeliveryOrderPrintProps> = ({
  invoice,
  settings,
  doPenerima,
  doEkspedisi,
  doDriverName,
  doDriverPhone,
  doNoResi,
  doNotes,
  doDate,
  suratJalanNoFormatted,
  hidePricesInDO,
  formatRupiah,
  formatNumber,
}) => {
  const totalPhysicalQty = (invoice.items || []).reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

  return (
    <div id="printable-area" className="active-print" style={{ padding: '18px 22px', background: '#FFF', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0F172A' }}>
        {/* Header Surat Jalan */}
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
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              SURAT JALAN / DELIVERY ORDER
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>
              {suratJalanNoFormatted}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              Ref Nota: <strong style={{ color: '#0F172A' }}>#{invoice.noInv}</strong> • Tgl Kirim: <strong style={{ color: '#0F172A' }}>{formatDate(doDate)}</strong>
            </div>
          </div>
        </div>

        {/* Info 2 Kolom: Penerima vs Pengirim/Ekspedisi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
          {/* Kolom Tujuan */}
          <div>
            <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: '2px' }}>
              TUJUAN PENGIRIMAN / PENERIMA:
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
              {invoice.namaCust}
            </div>
            {doPenerima && doPenerima !== invoice.namaCust && (
              <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '2px' }}>
                PIC Penerima: <strong>{doPenerima}</strong>
              </div>
            )}
            <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '2px', lineHeight: 1.35 }}>
              Alamat: {invoice.alamatCust || 'Ambil Langsung di Workshop / Toko'}
            </div>
            {invoice.waCust && (
              <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '2px' }}>
                Telp/WA: <strong style={{ color: '#0F172A' }}>{invoice.waCust}</strong>
              </div>
            )}
          </div>

          {/* Kolom Ekspedisi */}
          <div>
            <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: '2px' }}>
              INFORMASI EKSPEDISI &amp; PENGIRIM:
            </div>
            <div style={{ fontSize: '10.5px', color: '#0F172A', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>Ekspedisi / Armada: <strong>{doEkspedisi || 'Kurir Internal'}</strong></div>
              <div>Kurir / Driver: <strong>{doDriverName || '-'}</strong> {doDriverPhone ? `(${doDriverPhone})` : ''}</div>
              {doNoResi && <div>No Plat / Resi: <strong style={{ color: '#2563EB' }}>{doNoResi}</strong></div>}
              {doNotes && <div style={{ fontSize: '9px', color: '#64748B', marginTop: '1px' }}>Ket: {doNotes}</div>}
            </div>
          </div>
        </div>

        {/* Tabel Item Surat Jalan */}
        <table className="inv-items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0 10px 0', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderTop: '1px solid #CBD5E1', borderBottom: '1.5px solid #0F172A' }}>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '32px', color: '#334155', fontWeight: 800 }}>NO</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#334155', fontWeight: 800 }}>NAMA BARANG &amp; SPESIFIKASI HASIL CETAK</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '55px', color: '#334155', fontWeight: 800 }}>QTY</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '60px', color: '#334155', fontWeight: 800 }}>SATUAN</th>
              {!hidePricesInDO && (
                <>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '90px', color: '#334155', fontWeight: 800 }}>HARGA</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '100px', color: '#334155', fontWeight: 800 }}>SUBTOTAL</th>
                </>
              )}
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '110px', color: '#334155', fontWeight: 800 }}>KONDISI FISIK</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: '100px', color: '#334155', fontWeight: 800 }}>CATATAN</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748B', fontWeight: 700 }}>{idx + 1}</td>
                <td style={{ padding: '6px 8px', textAlign: 'left' }}>
                  <strong style={{ color: '#0F172A', fontSize: '11.5px' }}>{it.nama}</strong>
                  {it.kategori && <span style={{ fontSize: '9.5px', color: '#2563EB', marginLeft: '6px', fontWeight: 600 }}>({it.kategori})</span>}
                  {(it.desc || it.keterangan) && (
                    <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '2px', lineHeight: 1.3 }}>
                      {it.desc || it.keterangan}
                    </div>
                  )}
                  {(it.finishingDetailsText || it.finishingType || it.finishing) && (
                    <div style={{ fontSize: '9px', color: '#2563EB', fontWeight: 700, marginTop: '2px' }}>
                      Finishing: {it.finishingDetailsText || it.finishingType || it.finishing}
                    </div>
                  )}
                  {(it.panjang || it.lebar || it.bahan) && (
                    <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px' }}>
                      {it.panjang && it.lebar ? `Ukuran: ${it.panjang}x${it.lebar} cm • ` : ''}
                      {it.bahan ? `Bahan: ${it.bahan}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, fontSize: '12px', color: '#0F172A' }}>{formatNumber(it.qty)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569' }}>{it.satuan || 'Pcs'}</td>
                {!hidePricesInDO && (
                  <>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.harga)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.subtotal)}</td>
                  </>
                )}
                <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                    ✓ Baik &amp; Sesuai
                  </span>
                </td>
                <td style={{ padding: '6px 8px', fontSize: '9px', color: '#64748B' }}>-</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ringkasan Kuantitas Fisik */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', padding: '6px 0', margin: '6px 0 14px 0', fontSize: '10.5px' }}>
          <div>
            Total Rincian: <strong style={{ color: '#0F172A' }}>{(invoice.items || []).length} Jenis Barang</strong> &nbsp;|&nbsp;
            Total Fisik: <strong style={{ color: '#2563EB', fontSize: '12px' }}>{totalPhysicalQty} {invoice.items?.[0]?.satuan || 'Pcs'}</strong>
          </div>
          {!hidePricesInDO && (
            <div>
              Total Nilai Barang: <strong style={{ color: '#2563EB', fontSize: '12px' }}>{formatRupiah(invoice.grandTotal)}</strong>
            </div>
          )}
        </div>

        {/* Tanda Tangan 3 Pihak (Penerima, Kurir, Pengirim) Tanpa Kotak-Kotak Berlebihan */}
        <div className="print-avoid-break" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '14px', fontSize: '9px', textAlign: 'center' }}>
          <div>
            <div style={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>PENERIMA BARANG</div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{doPenerima || invoice.namaCust}</div>
            <div style={{ borderBottom: '1px solid #94A3B8', width: '75%', margin: '28px auto 4px auto' }} />
            <div style={{ fontSize: '8px', color: '#64748B' }}>Tgl &amp; Jam Terima: ............................</div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>KURIR / PENGANTAR</div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{doDriverName || 'Kurir Pengirim'}</div>
            <div style={{ borderBottom: '1px solid #94A3B8', width: '75%', margin: '28px auto 4px auto' }} />
            <div style={{ fontSize: '8px', color: '#64748B' }}>Tgl &amp; Jam Kirim: ............................</div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>GUDANG / PETUGAS TOKO</div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{settings.company || 'CTRL PRINT'}</div>
            <div style={{ borderBottom: '1px solid #94A3B8', width: '75%', margin: '28px auto 4px auto' }} />
            <div style={{ fontSize: '8px', color: '#64748B' }}>Tanda Tangan &amp; Stempel Resmi</div>
          </div>
        </div>

        {/* Ketentuan Serah Terima Barang */}
        <div style={{ marginTop: '14px', paddingTop: '8px', borderTop: '1px solid #CBD5E1', fontSize: '8.5px', color: '#64748B', lineHeight: '1.4' }}>
          <strong>Ketentuan Serah Terima:</strong> 1. Seluruh barang di atas telah diperiksa dan diserahkan dalam kondisi lengkap dan baik. 2. Tanda tangan pada dokumen ini merupakan bukti sah serah terima fisik barang. 3. Klaim atas kekurangan/kerusakan fisik hanya dilayani maksimal 1x24 jam sejak barang diterima.
        </div>
      </div>
    </div>
  );
};
