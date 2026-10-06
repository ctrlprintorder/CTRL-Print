import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, Settings } from '../../types';
import { formatDate } from '../../utils/date';

interface ThermalInvoiceProps {
  invoice: Invoice;
  settings: Settings;
  thermalWidth?: '58mm' | '80mm' | 'full';
  getPaymentMethodLabel?: () => string;
}

export const ThermalInvoice: React.FC<ThermalInvoiceProps> = ({
  invoice,
  settings,
  getPaymentMethodLabel
}) => {
  const paymentLabel = getPaymentMethodLabel
    ? getPaymentMethodLabel()
    : invoice.metodeBayar === 'Transfer'
    ? 'Transfer Bank'
    : invoice.metodeBayar === 'QRIS'
    ? 'QRIS'
    : invoice.metodeBayar === 'Tempo'
    ? 'Tempo / Kredit'
    : 'Tunai (Cash)';

  return (
    <div
      id="printable-thermal"
      className="active-print"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        padding: '0 0 16px 0',
        background: '#FFFFFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        color: '#000000',
        boxSizing: 'border-box',
        fontSize: '10pt',
        lineHeight: 1.3,
        fontWeight: 500,
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility'
      }}
    >
      {/* Garansi Mutlak Warna Teks & Garis Hitam Pekat Murni #000000 */}
      <style>{`
        #printable-thermal,
        #printable-thermal * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          border-color: #000000 !important;
          outline-color: #000000 !important;
          text-shadow: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
        }
        #printable-thermal table,
        #printable-thermal tr,
        #printable-thermal td,
        #printable-thermal th,
        #printable-thermal div,
        #printable-thermal span,
        #printable-thermal p,
        #printable-thermal strong,
        #printable-thermal b,
        #printable-thermal small {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          border-color: #000000 !important;
        }
        #printable-thermal .thermal-divider {
          display: block !important;
          width: 100% !important;
          height: 0 !important;
          border-top: 1px solid #000000 !important;
          border-bottom: none !important;
          border-left: none !important;
          border-right: none !important;
          margin: 6px 0 !important;
          background: transparent !important;
        }
        /* Pengecualian Mutlak untuk Barcode / QR Code */
        #printable-thermal .thermal-qr-container,
        #printable-thermal .thermal-qr-svg,
        #printable-thermal svg {
          background: #FFFFFF !important;
          background-color: #FFFFFF !important;
        }
        #printable-thermal svg path:first-child,
        #printable-thermal svg path[fill="#FFFFFF"],
        #printable-thermal svg path[fill="#ffffff"],
        #printable-thermal svg path[fill="white"] {
          fill: #FFFFFF !important;
          stroke: none !important;
        }
        #printable-thermal svg path:last-child,
        #printable-thermal svg path[fill="#000000"],
        #printable-thermal svg path[fill="#000"],
        #printable-thermal svg path[fill="black"] {
          fill: #000000 !important;
          stroke: none !important;
        }
      `}</style>
      {/* Header Toko - Blok Sederhana Tanpa Flexbox */}
      <div style={{ display: 'block', textAlign: 'center', marginBottom: '8px', width: '100%' }}>
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Logo"
            referrerPolicy="no-referrer"
            className="print-logo-img"
            style={{
              maxHeight: '44px',
              maxWidth: '110px',
              margin: '0 auto 4px auto',
              display: 'block',
              objectFit: 'contain',
              backgroundColor: 'transparent',
              filter: 'grayscale(100%) contrast(250%)',
              mixBlendMode: 'multiply',
              imageRendering: 'crisp-edges'
            }}
          />
        )}
        <div
          style={{
            display: 'block',
            fontSize: '12pt',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            color: '#000000',
            lineHeight: 1.2
          }}
        >
          {settings.company || 'CTRL PRINT'}
        </div>
        {settings.address && (
          <div style={{ display: 'block', fontSize: '8.5pt', marginTop: '2px', wordBreak: 'break-word', fontWeight: 400, color: '#000000' }}>
            {settings.address}
          </div>
        )}
        {settings.phone && (
          <div style={{ display: 'block', fontSize: '8.5pt', fontWeight: 400, color: '#000000' }}>
            Telp/WA: {settings.phone}
          </div>
        )}
        {settings.instagram && (
          <div style={{ display: 'block', fontSize: '8.5pt', fontWeight: 400, color: '#000000' }}>
            IG: @{settings.instagram.replace('@', '')}
          </div>
        )}
      </div>

      <div className="thermal-divider" style={{ display: 'block', borderTop: '1px solid #000000', borderColor: '#000000', margin: '6px 0', width: '100%' }} />

      {/* Info Transaksi - Menggunakan Layout Tabel Blok Sederhana */}
      <div style={{ display: 'block', fontSize: '9.5pt', color: '#000000', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 3px 0' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', fontWeight: 600, padding: '1px 0', whiteSpace: 'nowrap', verticalAlign: 'top', color: '#000000' }}>
                NO: #{invoice.noInv}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 600, padding: '1px 0', whiteSpace: 'nowrap', verticalAlign: 'top', color: '#000000' }}>
                {formatDate(invoice.tglInv)}
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'block', textAlign: 'left', wordBreak: 'break-word', marginTop: '2px', fontWeight: 500, color: '#000000' }}>
          PELANGGAN: <strong style={{ fontSize: '10.5pt', color: '#000000', fontWeight: 700 }}>{invoice.namaCust}</strong>
        </div>
        {invoice.waCust && (
          <div style={{ display: 'block', textAlign: 'left', fontSize: '9pt', marginTop: '1px', color: '#000000', fontWeight: 400 }}>
            WA: {invoice.waCust}
          </div>
        )}
        {invoice.estimasiPengerjaan && (
          <div style={{ display: 'block', textAlign: 'left', fontSize: '9pt', marginTop: '1px', color: '#000000', fontWeight: 600 }}>
            ESTIMASI: {invoice.estimasiPengerjaan}
          </div>
        )}
      </div>

      <div className="thermal-divider" style={{ display: 'block', borderTop: '1px solid #000000', borderColor: '#000000', margin: '6px 0', width: '100%' }} />

      {/* Daftar Item Barang - Layout Blok & Tabel Sederhana */}
      <div style={{ display: 'block', width: '100%', marginTop: '4px' }}>
        {invoice.items.map((it, idx) => (
          <div key={idx} style={{ display: 'block', marginBottom: '6px', wordBreak: 'break-word', color: '#000000' }}>
            <div style={{ display: 'block', textAlign: 'left', fontWeight: 700, fontSize: '10pt', color: '#000000' }}>
              {idx + 1}. {it.nama}
            </div>
            {it.desc && (
              <div style={{ display: 'block', textAlign: 'left', fontSize: '8.5pt', color: '#000000', fontWeight: 400, paddingLeft: '10px' }}>
                {it.desc}
              </div>
            )}
            {(it.finishingDetailsText || it.finishingType) && (
              <div style={{ display: 'block', textAlign: 'left', fontSize: '8.5pt', color: '#000000', fontWeight: 400, paddingLeft: '10px' }}>
                Finishing: {it.finishingDetailsText || it.finishingType}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2px' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left', fontSize: '9.5pt', color: '#000000', fontWeight: 400, padding: '1px 0 1px 10px', verticalAlign: 'top' }}>
                    {it.qty} {it.satuan} x Rp {(it.harga || 0).toLocaleString('id-ID')}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '9.5pt', fontWeight: 700, whiteSpace: 'nowrap', padding: '1px 0', verticalAlign: 'top', color: '#000000' }}>
                    Rp {(it.subtotal || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="thermal-divider" style={{ display: 'block', borderTop: '1px solid #000000', borderColor: '#000000', margin: '6px 0', width: '100%' }} />

      {/* Total & Pembayaran - Layout Tabel 100% Native Driver */}
      <div style={{ display: 'block', fontSize: '10pt', marginTop: '4px', color: '#000000', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', fontWeight: 400, padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>SUBTOTAL:</td>
              <td style={{ textAlign: 'right', fontWeight: 600, padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>
                Rp {(invoice.subtotalSum || invoice.grandTotal || 0).toLocaleString('id-ID')}
              </td>
            </tr>
            {(invoice.diskonTambahan || 0) > 0 && (
              <tr>
                <td style={{ textAlign: 'left', fontWeight: 400, padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>DISKON:</td>
                <td style={{ textAlign: 'right', fontWeight: 600, padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>
                  - Rp {(invoice.diskonTambahan || 0).toLocaleString('id-ID')}
                </td>
              </tr>
            )}
            <tr>
              <td
                style={{
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: '11.5pt',
                  borderTop: '1.5px solid #000000',
                  borderBottom: '1.5px solid #000000',
                  borderColor: '#000000',
                  padding: '4px 0',
                  verticalAlign: 'top',
                  color: '#000000'
                }}
              >
                TOTAL:
              </td>
              <td
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '11.5pt',
                  borderTop: '1.5px solid #000000',
                  borderBottom: '1.5px solid #000000',
                  borderColor: '#000000',
                  padding: '4px 0',
                  verticalAlign: 'top',
                  color: '#000000'
                }}
              >
                Rp {(invoice.grandTotal || 0).toLocaleString('id-ID')}
              </td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', fontWeight: 400, padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>
                DIBAYAR ({paymentLabel.toUpperCase()}):
              </td>
              <td style={{ textAlign: 'right', fontWeight: 600, padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>
                Rp {(invoice.dibayar || 0).toLocaleString('id-ID')}
              </td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', fontWeight: 700, fontSize: '10pt', padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>
                {(invoice.sisaTertagih || 0) > 0 ? 'SISA TERTAGIH:' : 'KETERANGAN:'}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '10pt', padding: '2px 0', verticalAlign: 'top', color: '#000000' }}>
                {(invoice.sisaTertagih || 0) > 0
                  ? `Rp ${invoice.sisaTertagih.toLocaleString('id-ID')}`
                  : 'LUNAS'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="thermal-divider" style={{ display: 'block', borderTop: '1px solid #000000', borderColor: '#000000', margin: '8px 0', width: '100%' }} />

      {/* QR Code Portal Pelanggan - Blok Center Sederhana Tanpa Flexbox & Tanpa Border */}
      <div
        style={{
          display: 'block',
          textAlign: 'center',
          margin: '8px auto',
          width: '100%'
        }}
      >
        <div className="thermal-qr-container" style={{ display: 'inline-block', margin: '0 auto', background: '#FFFFFF' }}>
          <QRCodeSVG
            className="thermal-qr-svg"
            value={`${window.location.origin}${window.location.pathname}?inv=${invoice.noInv}`}
            size={92}
            level="M"
            includeMargin={false}
            fgColor="#000000"
            bgColor="#FFFFFF"
            shapeRendering="crispEdges"
          />
        </div>
        <div
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: '8.5pt',
            fontWeight: 600,
            marginTop: '5px',
            textTransform: 'uppercase',
            color: '#000000',
            letterSpacing: '0.02em'
          }}
        >
          SCAN QR LACAK ORDER &amp; NOTA
        </div>
      </div>

      <div className="thermal-divider" style={{ display: 'block', borderTop: '1px solid #000000', borderColor: '#000000', margin: '6px 0', width: '100%' }} />

      {/* Footer Struk - Blok Sederhana */}
      <div style={{ display: 'block', textAlign: 'center', fontSize: '9pt', marginTop: '4px', color: '#000000', width: '100%' }}>
        <div style={{ display: 'block', fontWeight: 700, fontSize: '9.5pt' }}>*** TERIMA KASIH ***</div>
        <div style={{ display: 'block', fontWeight: 400, fontSize: '8.5pt', marginTop: '2px' }}>
          Simpan struk ini sebagai bukti transaksi resmi
        </div>
        <div style={{ display: 'block', marginTop: '4px', fontSize: '7.5pt', fontWeight: 500, color: '#000000' }}>
          Powered by {settings.company || 'CTRL PRINT'}
        </div>
      </div>
    </div>
  );
};
