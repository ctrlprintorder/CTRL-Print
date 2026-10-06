import React, { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, PoVendor, Settings } from '../types';
import { 
  Printer, X, Eye, FileText, Receipt, Truck, Tag, Layers, Check,
  MessageSquare, Save, Settings as SettingsIcon, ChevronDown,
  RefreshCw, CheckSquare, Square, Calendar, User, Phone, MapPin,
  Maximize2
} from 'lucide-react';
import { formatRupiah, formatNumber } from '../utils/currency';
import { formatDate } from '../utils/date';
import { openWhatsApp, getQuotationWaMessage, getDeliveryOrderWaMessage } from '../utils/whatsapp';
import { saveDocument } from '../firebaseService';
import { DeliveryOrderPrint } from './print/DeliveryOrderPrint';
import { QuotationPrint } from './print/QuotationPrint';
import { NotaA5Print } from './print/NotaA5Print';
import { ThermalInvoice } from './print/ThermalInvoice';

interface PrintDocumentProps {
  printType: 'A5' | 'TH' | 'DO' | 'PO' | 'LABEL' | null;
  invoice: Invoice | null;
  poVendor: PoVendor | null;
  settings: Settings;
  onClosePrint: () => void;
  onInvoiceUpdated?: (updatedInv: Invoice) => void;
}

export const PrintDocument: React.FC<PrintDocumentProps> = ({
  printType,
  invoice,
  poVendor,
  settings,
  onClosePrint,
  onInvoiceUpdated
}) => {
  const [currentType, setCurrentType] = useState<'A5' | 'TH' | 'DO' | 'PO' | 'LABEL' | null>(printType);

  // Surat Jalan (DO) Configuration State
  const [hidePricesInDO, setHidePricesInDO] = useState<boolean>(true);
  const [showDoSettings, setShowDoSettings] = useState<boolean>(false);
  const [doDriverName, setDoDriverName] = useState<string>(invoice?.driverName || 'Kurir Toko / Internal');
  const [doDriverPhone, setDoDriverPhone] = useState<string>(invoice?.driverPhone || '');
  const [doEkspedisi, setDoEkspedisi] = useState<string>(invoice?.ekspedisi || 'Internal Toko');
  const [doNoResi, setDoNoResi] = useState<string>(invoice?.noResi || '');
  const [doNotes, setDoNotes] = useState<string>(invoice?.suratJalanNotes || 'Barang telah diperiksa dan diserahkan dalam kondisi lengkap dan baik.');
  const [doPenerima, setDoPenerima] = useState<string>(invoice?.penerimaNama || invoice?.namaCust || '');
  const [doDate, setDoDate] = useState<string>(invoice?.suratJalanDate || new Date().toISOString().split('T')[0]);
  const [isSavingDO, setIsSavingDO] = useState<boolean>(false);

  // Quotation Configuration State
  const [quoteValidityDays, setQuoteValidityDays] = useState<number>(invoice?.quoteValidityDays || 14);
  const [quoteSubject, setQuoteSubject] = useState<string>(invoice?.quoteSubject || 'Penawaran Harga Cetak & Pengadaan');
  const [isConvertingQuote, setIsConvertingQuote] = useState<boolean>(false);

  // Auto-fit & Preview Scale Management (Fit to Screen)
  const [activeScale, setActiveScale] = useState<number>(1);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const docContentRef = useRef<HTMLDivElement>(null);

  const isThermal = currentType === 'TH';
  const isLabel = currentType === 'LABEL';
  const baseDocWidth = isThermal || isLabel ? 540 : 840;

  const calculateAutoFitScale = useCallback(() => {
    if (!docContentRef.current) return;

    const docEl = docContentRef.current;
    const actualHeight = docEl.scrollHeight || docEl.offsetHeight || 820;
    setMeasuredHeight(actualHeight);

    if (!isAutoFit) {
      setActiveScale(1);
      return;
    }

    if (currentType === 'TH') {
      const availW = Math.max(280, (window.innerWidth || 1000) - 32);
      const scaleW = Math.min(1.0, availW / 540);
      setActiveScale(Math.round(scaleW * 100) / 100);
      return;
    }

    // Measure available height so the whole document from kop header to bottom signatures
    // is 100% visible on screen without requiring vertical scrolling
    const toolbar = document.querySelector('.print-modal-toolbar');
    const toolbarH = toolbar ? toolbar.clientHeight : 56;

    const availH = Math.max(240, (window.innerHeight || 800) - toolbarH - 44);
    const availW = Math.max(300, (window.innerWidth || 1000) - 32);

    const scaleH = availH / actualHeight;
    const scaleW = availW / baseDocWidth;

    let target = Math.min(scaleH, scaleW);
    target = Math.min(1.0, Math.max(0.40, target));

    setActiveScale(Math.round(target * 100) / 100);
  }, [currentType, isAutoFit, baseDocWidth]);

  useEffect(() => {
    setCurrentType(printType);
  }, [printType]);

  useEffect(() => {
    calculateAutoFitScale();

    const t1 = setTimeout(calculateAutoFitScale, 60);
    const t2 = setTimeout(calculateAutoFitScale, 200);
    const t3 = setTimeout(calculateAutoFitScale, 500);

    const handleResize = () => {
      calculateAutoFitScale();
    };

    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && docContentRef.current) {
      ro = new ResizeObserver(() => {
        calculateAutoFitScale();
      });
      ro.observe(docContentRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [calculateAutoFitScale, currentType, invoice, poVendor, showDoSettings]);

  const getPaymentMethodLabel = () => {
    if (!invoice) return 'Cash';
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
    const configuredMethods = (settings?.paymentMethods || 'Cash, Transfer BCA, Mandiri, QRIS')
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return configuredMethods[0] || 'Cash';
  };

  // Update initial fields when invoice changes
  useEffect(() => {
    if (invoice) {
      setDoDriverName(invoice.driverName || 'Kurir Toko / Internal');
      setDoDriverPhone(invoice.driverPhone || '');
      setDoEkspedisi(invoice.ekspedisi || 'Internal Toko');
      setDoNoResi(invoice.noResi || '');
      setDoNotes(invoice.suratJalanNotes || 'Barang telah diperiksa dan diserahkan dalam kondisi lengkap dan baik.');
      setDoPenerima(invoice.penerimaNama || invoice.namaCust || '');
      setDoDate(invoice.suratJalanDate || new Date().toISOString().split('T')[0]);
      setQuoteValidityDays(invoice.quoteValidityDays || 14);
      setQuoteSubject(invoice.quoteSubject || 'Penawaran Harga Cetak & Pengadaan');
    }
  }, [invoice]);

  const handleSaveDoInfo = async () => {
    if (!invoice) return;
    setIsSavingDO(true);
    try {
      const sjNo = invoice.suratJalanNo || `SJ-${invoice.noInv.replace(/^INV-|^QUO-/, '')}`;
      const updated: Invoice = {
        ...invoice,
        suratJalanNo: sjNo,
        suratJalanDate: doDate,
        driverName: doDriverName,
        driverPhone: doDriverPhone,
        ekspedisi: doEkspedisi,
        noResi: doNoResi,
        suratJalanNotes: doNotes,
        penerimaNama: doPenerima
      };
      await saveDocument('invoice', updated);
      if (onInvoiceUpdated) onInvoiceUpdated(updated);
      setShowDoSettings(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingDO(false);
    }
  };

  const handleConvertQuoteInPrint = async () => {
    if (!invoice) return;
    if (!window.confirm(`Konversi Penawaran ${invoice.noInv} ke Sales Invoice resmi sekarang?`)) return;
    setIsConvertingQuote(true);
    try {
      const updated: Invoice = {
        ...invoice,
        tipeDoc: 'Invoice'
      };
      await saveDocument('invoice', updated);
      if (onInvoiceUpdated) onInvoiceUpdated(updated);
      setCurrentType('A5');
    } catch (err) {
      console.error(err);
    } finally {
      setIsConvertingQuote(false);
    }
  };

  const handleSendDeliveryOrderWa = () => {
    if (!invoice || !invoice.waCust) return;
    const msg = getDeliveryOrderWaMessage(
      {
        ...invoice,
        driverName: doDriverName,
        suratJalanNo: invoice.suratJalanNo || `SJ-${invoice.noInv.replace(/^INV-|^QUO-/, '')}`,
        alamatCust: invoice.alamatCust
      },
      settings
    );
    openWhatsApp(invoice.waCust, msg);
  };

  const handleSendQuotationWa = () => {
    if (!invoice || !invoice.waCust) return;
    const msg = getQuotationWaMessage(
      { ...invoice, quoteValidityDays, quoteSubject },
      settings
    );
    openWhatsApp(invoice.waCust, msg);
  };

  const getValidUntilDate = (tglStr: string, days: number) => {
    try {
      const d = new Date(tglStr);
      if (isNaN(d.getTime())) return '-';
      d.setDate(d.getDate() + days);
      return formatDate(d);
    } catch {
      return '-';
    }
  };

  const totalPhysicalQty = (invoice?.items || []).reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
  const suratJalanNoFormatted = invoice?.suratJalanNo || `SJ-${invoice ? invoice.noInv.replace(/^INV-|^QUO-/, '') : ''}`;

  // Synchronize body classes for @media print targeting
  useEffect(() => {
    if (!currentType) return;

    // Remove previous print classes
    document.body.classList.remove('printing-thermal', 'printing-label', 'printing-standard', 'printing-po');

    if (currentType === 'TH') {
      document.body.classList.add('printing-thermal');
    } else if (currentType === 'LABEL') {
      document.body.classList.add('printing-label');
    } else if (currentType === 'PO') {
      document.body.classList.add('printing-po');
    } else {
      document.body.classList.add('printing-standard');
    }

    return () => {
      document.body.classList.remove('printing-thermal', 'printing-label', 'printing-standard', 'printing-po');
    };
  }, [currentType]);

  const handleTriggerPrint = () => {
    // Add specific body class for specialized print profiles
    if (currentType === 'TH') {
      document.body.classList.add('printing-thermal');
    } else if (currentType === 'LABEL') {
      document.body.classList.add('printing-label');
    }

    window.print();

    // Clean up class after print dialog finishes
    setTimeout(() => {
      document.body.classList.remove('printing-thermal');
      document.body.classList.remove('printing-label');
    }, 1000);
  };

  if (!currentType) return null;

  const isDO = currentType === 'DO';

  return (
    <div
      className="modal-overlay print-modal-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: isAutoFit && activeScale < 1 ? '10px 8px 16px 8px' : (currentType === 'TH' || currentType === 'LABEL') ? '16px 0' : '20px 10px',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Inject specific zero margin rule for thermal and label */}
      {(currentType === 'TH' || currentType === 'LABEL') && (
        <style>{`
          @page {
            margin: 0 !important;
            size: auto;
          }
          @media print {
            @page {
              margin: 0 !important;
              size: auto;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              background: #FFFFFF !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .modal-overlay.print-modal-container {
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
            }
            .preview-scale-stage {
              display: block !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .preview-scale-wrapper {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
              transform: none !important;
            }
            .print-document-box {
              position: static !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              border: none !important;
              box-shadow: none !important;
              background: #FFFFFF !important;
              transform: none !important;
            }
            #printable-thermal {
              display: block !important;
              padding-top: 0 !important;
              padding-left: 2px !important;
              padding-right: 2px !important;
              padding-bottom: 8px !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-width: 100% !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
              font-size: 10pt !important;
              line-height: 1.3 !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
              font-weight: 500 !important;
            }
            #printable-thermal table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: auto !important;
              margin: 0 !important;
            }
            #printable-thermal td {
              vertical-align: top !important;
              border: none !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
            }
            #printable-thermal * {
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              border-color: #000000 !important;
              outline-color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
              text-shadow: none !important;
              box-shadow: none !important;
              opacity: 1 !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
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
            #printable-thermal img {
              max-width: 100% !important;
              image-rendering: -webkit-optimize-contrast !important;
              image-rendering: crisp-edges !important;
              filter: grayscale(100%) contrast(300%) !important;
            }
            /* Pengecualian Mutlak untuk Barcode / QR Code */
            #printable-thermal .thermal-qr-container,
            #printable-thermal .thermal-qr-svg,
            #printable-thermal svg {
              background: #FFFFFF !important;
              background-color: #FFFFFF !important;
              max-width: 100% !important;
              shape-rendering: crispEdges !important;
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
            #printable-label {
              padding-top: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              color: #000000 !important;
              font-weight: 700 !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: geometricPrecision !important;
            }
            #printable-label * {
              color: #000000 !important;
              border-color: #000000 !important;
              text-shadow: none !important;
              box-shadow: none !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: geometricPrecision !important;
            }
          }
        `}</style>
      )}
      {/* Modal Floating Toolbar for Screen (Hidden during print via .no-print) */}
      <div
        className="no-print print-modal-toolbar"
        style={{
          width: '100%',
          maxWidth: isAutoFit && activeScale < 1
            ? `${Math.max(480, baseDocWidth * activeScale)}px`
            : `${baseDocWidth}px`,
          background: '#0F172A',
          color: '#FFF',
          padding: '10px 16px',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'max-width 0.2s ease',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800, color: '#38BDF8' }}>
            <Eye size={17} />
            <span>
              {currentType === 'TH' && 'Struk Thermal POS'}
              {currentType === 'A5' && (invoice?.tipeDoc === 'Quotation' ? 'Penawaran Harga A5' : 'Nota Penjualan A5')}
              {currentType === 'DO' && 'Surat Jalan (DO)'}
              {currentType === 'LABEL' && 'Label Stiker Pengiriman'}
              {currentType === 'PO' && 'Surat Perintah Kerja (SPK)'}
            </span>
          </div>

          {/* Quick Format Switcher for Invoices */}
          {invoice && (
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '2px', borderRadius: '8px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setCurrentType('A5')}
                style={{
                  background: currentType === 'A5' ? '#2563EB' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: currentType === 'A5' ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                Nota A5
              </button>
              <button
                type="button"
                onClick={() => setCurrentType('TH')}
                style={{
                  background: currentType === 'TH' ? '#2563EB' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: currentType === 'TH' ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                Thermal
              </button>
              <button
                type="button"
                onClick={() => setCurrentType('DO')}
                style={{
                  background: currentType === 'DO' ? '#2563EB' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: currentType === 'DO' ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                Surat Jalan
              </button>
              <button
                type="button"
                onClick={() => setCurrentType('LABEL')}
                style={{
                  background: currentType === 'LABEL' ? '#2563EB' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: currentType === 'LABEL' ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                Label Dus
              </button>
            </div>
          )}

          {/* DO Specific Controls */}
          {currentType === 'DO' && invoice && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setHidePricesInDO(!hidePricesInDO)}
                style={{
                  background: hidePricesInDO ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                  color: hidePricesInDO ? '#34D399' : '#CBD5E1',
                  border: `1px solid ${hidePricesInDO ? '#059669' : '#475569'}`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Sembunyikan atau tampilkan nominal harga di lembar Surat Jalan"
              >
                {hidePricesInDO ? <CheckSquare size={13} /> : <Square size={13} />}
                {hidePricesInDO ? 'Harga Disembunyikan' : 'Harga Ditampilkan'}
              </button>

              <button
                type="button"
                onClick={() => setShowDoSettings(!showDoSettings)}
                style={{
                  background: showDoSettings ? '#2563EB' : 'rgba(255,255,255,0.1)',
                  color: '#FFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Truck size={13} /> Info Pengiriman &amp; Driver
              </button>

              {invoice.waCust && (
                <button
                  type="button"
                  onClick={handleSendDeliveryOrderWa}
                  style={{
                    background: '#059669',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Kirim notifikasi nomor resi & surat jalan via WhatsApp"
                >
                  <MessageSquare size={13} /> Kirim WA Surat Jalan
                </button>
              )}
            </div>
          )}

          {/* Quotation Specific Controls */}
          {currentType === 'A5' && invoice && invoice.tipeDoc === 'Quotation' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94A3B8' }}>
                <span>Masa Berlaku:</span>
                <select
                  value={quoteValidityDays}
                  onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
                  style={{
                    background: '#1E293B',
                    color: '#FFF',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '11px'
                  }}
                >
                  <option value={7}>7 Hari</option>
                  <option value={14}>14 Hari</option>
                  <option value={30}>30 Hari</option>
                  <option value={60}>60 Hari</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleConvertQuoteInPrint}
                disabled={isConvertingQuote}
                style={{
                  background: '#059669',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Konversikan Surat Penawaran ini menjadi Sales Invoice resmi"
              >
                <RefreshCw size={13} className={isConvertingQuote ? 'animate-spin' : ''} />
                {isConvertingQuote ? 'Mengonversi...' : 'Convert ke Invoice'}
              </button>

              {invoice.waCust && (
                <button
                  type="button"
                  onClick={handleSendQuotationWa}
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Kirim surat penawaran harga via WhatsApp"
                >
                  <MessageSquare size={13} /> Kirim WA Penawaran
                </button>
              )}
            </div>
          )}

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {currentType !== 'TH' && (
            <button
              type="button"
              onClick={() => {
                if (isAutoFit) {
                  setIsAutoFit(false);
                  setActiveScale(1);
                } else {
                  setIsAutoFit(true);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '11.5px',
                background: isAutoFit ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255,255,255,0.1)',
                color: isAutoFit ? '#38BDF8' : '#CBD5E1',
                border: `1px solid ${isAutoFit ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255,255,255,0.2)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isAutoFit ? 'Tampilan otomatis pas layar aktif (klik untuk ukuran asli 100%)' : 'Klik untuk mengaktifkan pas layar otomatis'}
            >
              <Maximize2 size={13} />
              <span>{isAutoFit ? `Fit Layar (${Math.round(activeScale * 100)}%)` : '100% (Fit)'}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleTriggerPrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12.5px',
              background: '#2563EB',
              color: '#FFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.4)'
            }}
          >
            <Printer size={15} /> Cetak Sekarang
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onClosePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              background: '#EF4444',
              color: '#FFF',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={15} /> Tutup
          </button>
        </div>
      </div>

      {/* Expandable Surat Jalan Delivery Settings Panel */}
      {showDoSettings && currentType === 'DO' && (
        <div
          className="no-print"
          style={{
            width: '100%',
            maxWidth: isAutoFit && activeScale < 1 ? `${Math.max(480, baseDocWidth * activeScale)}px` : `${baseDocWidth}px`,
            background: '#1E293B',
            color: '#FFF',
            padding: '12px 16px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transition: 'max-width 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={15} /> Atur Rincian Pengiriman Surat Jalan
            </div>
            <button
              type="button"
              onClick={() => setShowDoSettings(false)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '11px' }}
            >
              ✕ Tutup
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>Kurir / Driver Pengantar</label>
              <input
                type="text"
                value={doDriverName}
                onChange={(e) => setDoDriverName(e.target.value)}
                placeholder="Nama driver / kurir"
                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>No Telp/WA Driver</label>
              <input
                type="text"
                value={doDriverPhone}
                onChange={(e) => setDoDriverPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>Armada / Ekspedisi</label>
              <input
                type="text"
                value={doEkspedisi}
                onChange={(e) => setDoEkspedisi(e.target.value)}
                placeholder="Kurir Toko / GoSend / Grab"
                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>No Plat / Resi Pengiriman</label>
              <input
                type="text"
                value={doNoResi}
                onChange={(e) => setDoNoResi(e.target.value)}
                placeholder="Plat nomor / resi"
                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>Penerima / PIC Lokasi</label>
              <input
                type="text"
                value={doPenerima}
                onChange={(e) => setDoPenerima(e.target.value)}
                placeholder="Nama penerima di lokasi"
                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>Tanggal Pengiriman</label>
              <input
                type="date"
                value={doDate}
                onChange={(e) => setDoDate(e.target.value)}
                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={doNotes}
              onChange={(e) => setDoNotes(e.target.value)}
              placeholder="Catatan pengiriman (cth: Pengiriman barang tahap 1, harap diperiksa langsung)"
              style={{ flex: 1, padding: '5px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#FFF', fontSize: '11px' }}
            />
            <button
              type="button"
              onClick={handleSaveDoInfo}
              disabled={isSavingDO}
              style={{
                background: '#059669',
                color: '#FFF',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <Save size={12} /> {isSavingDO ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </div>
      )}

      {/* Main Document Content Box with Auto-Fit Scaling */}
      <div
        className="preview-scale-stage"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          flex: 1,
          overflow: 'visible',
          marginBottom: isAutoFit && activeScale < 1 ? '12px' : '30px'
        }}
      >
        <div
          className="preview-scale-wrapper"
          style={{
            width: isAutoFit && activeScale < 1 ? `${baseDocWidth * activeScale}px` : `${baseDocWidth}px`,
            maxWidth: '100%',
            height: isAutoFit && activeScale < 1 && measuredHeight ? `${measuredHeight * activeScale}px` : 'auto',
            position: 'relative',
            transition: 'width 0.2s ease, height 0.2s ease',
            margin: '0 auto',
            overflow: 'visible',
            flexShrink: 0
          }}
        >
          <div
            ref={docContentRef}
            className="print-document-box"
            style={{
              width: `${baseDocWidth}px`,
              maxWidth: `${baseDocWidth}px`,
              background: '#FFF',
              color: '#000',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              transform: isAutoFit && activeScale < 1 ? `scale(${activeScale})` : 'none',
              transformOrigin: 'top left',
              position: isAutoFit && activeScale < 1 ? 'absolute' : 'relative',
              top: 0,
              left: 0,
              transition: 'transform 0.2s ease'
            }}
          >
        {/* Thermal Print Receipt View */}
        {currentType === 'TH' && invoice && (
          <ThermalInvoice
            invoice={invoice}
            settings={settings}
            getPaymentMethodLabel={getPaymentMethodLabel}
          />
        )}

        {/* SURAT JALAN / DELIVERY ORDER DEDICATED PRINTABLE VIEW */}
        {currentType === 'DO' && invoice && (
          <DeliveryOrderPrint
            invoice={invoice}
            settings={settings}
            doPenerima={doPenerima}
            doEkspedisi={doEkspedisi}
            doDriverName={doDriverName}
            doDriverPhone={doDriverPhone}
            doNoResi={doNoResi}
            doNotes={doNotes}
            doDate={doDate}
            suratJalanNoFormatted={suratJalanNoFormatted}
            hidePricesInDO={hidePricesInDO}
            formatRupiah={formatRupiah}
            formatNumber={formatNumber}
          />
        )}

        {/* SURAT PENAWARAN HARGA (QUOTATION) DEDICATED PRINTABLE VIEW */}
        {currentType === 'A5' && invoice && invoice.tipeDoc === 'Quotation' && (
          <QuotationPrint
            invoice={invoice}
            settings={settings}
            quoteValidityDays={quoteValidityDays}
            quoteSubject={quoteSubject}
            formatRupiah={formatRupiah}
            formatNumber={formatNumber}
            getValidUntilDate={getValidUntilDate}
          />
        )}

        {/* NOTA PENJUALAN A5 DEDICATED PRINTABLE VIEW */}
        {currentType === 'A5' && invoice && invoice.tipeDoc !== 'Quotation' && (
          <NotaA5Print
            invoice={invoice}
            settings={settings}
            formatRupiah={formatRupiah}
            formatNumber={formatNumber}
          />
        )}

        {/* LEGACY VIEW DISABLED */}
        {false && (currentType === 'A5' || currentType === 'DO') && invoice && (
          <div id="printable-area" className="active-print" style={{ padding: '24px 28px', background: '#FFF', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0F172A' }}>
              {/* Header Toko & Judul Dokumen */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  borderBottom: '2px solid #0F172A',
                  paddingBottom: '12px',
                  marginBottom: '12px'
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
                        backgroundColor: 'transparent',
                        mixBlendMode: 'multiply',
                        flexShrink: 0,
                        display: 'block'
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: 0, color: '#0F172A', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {settings.company || 'CTRL PRINT'}
                    </h2>
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '3px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                      {settings.address || ''} <br />
                      Telp/WA: <strong style={{ color: '#0F172A' }}>{settings.phone || '-'}</strong>
                      {settings.email ? ` • Email: ${settings.email}` : ''}
                      {settings.instagram ? ` • IG: @${settings.instagram.replace('@', '')}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {isDO ? 'SURAT JALAN' : invoice.tipeDoc === 'Quotation' ? 'PENAWARAN HARGA' : 'NOTA PENJUALAN'}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#2563EB', marginTop: '2px', letterSpacing: '0.5px' }}>
                    #{invoice.noInv}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                    Tanggal: <strong style={{ color: '#0F172A' }}>{formatDate(invoice.tglInv)}</strong> {invoice.tempoInv ? ` • Tempo: ${formatDate(invoice.tempoInv)}` : ''}
                  </div>
                </div>
              </div>

              {/* Info Pelanggan & Status Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#64748B', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                    {isDO ? 'TUJUAN PENGIRIMAN / PENERIMA:' : 'DITUJUKAN KEPADA:'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                    {invoice.namaCust}
                  </div>
                  {invoice.alamatCust && <div style={{ fontSize: '10px', color: '#334155', marginTop: '2px' }}>{invoice.alamatCust}</div>}
                  {invoice.waCust && <div style={{ fontSize: '10px', color: '#334155', marginTop: '1px' }}>Telp/WA: <strong style={{ color: '#0F172A' }}>{invoice.waCust}</strong></div>}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {invoice.tipeDoc !== 'Quotation' && !isDO && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '11px',
                        background: invoice.statusBayar === 'Paid' || invoice.statusBayar === 'Lunas' || (invoice.sisaTertagih || 0) <= 0 ? '#ECFDF5' : '#FEF2F2',
                        color: invoice.statusBayar === 'Paid' || invoice.statusBayar === 'Lunas' || (invoice.sisaTertagih || 0) <= 0 ? '#059669' : '#DC2626',
                        border: `1px solid ${invoice.statusBayar === 'Paid' || invoice.statusBayar === 'Lunas' || (invoice.sisaTertagih || 0) <= 0 ? '#A7F3D0' : '#FECACA'}`
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                      STATUS: {invoice.statusBayar || ((invoice.sisaTertagih || 0) <= 0 ? 'Lunas' : 'Belum Lunas')}
                    </div>
                  )}

                  {invoice.estimasiPengerjaan && (
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#2563EB',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        padding: '2px 8px'
                      }}
                    >
                      Estimasi: {invoice.estimasiPengerjaan}
                    </div>
                  )}

                  {(invoice.bayarNote || (Number(invoice.dibayar) > 0)) && invoice.tipeDoc !== 'Quotation' && !isDO && (
                    <div style={{ fontSize: '9.5px', color: '#64748B' }}>
                      Metode: <strong>{getPaymentMethodLabel()}</strong>
                    </div>
                  )}
                </div>
              </div>

              {invoice.tipeDoc === 'Quotation' && (
                <div style={{ margin: '0 0 10px 0', fontSize: '10px', color: '#334155', lineHeight: '1.4', background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <strong>Hal: Penawaran Harga Produk &amp; Jasa Cetak</strong> — Bersama ini kami dari <strong>{settings.company || 'CTRL PRINT'}</strong> mengajukan penawaran harga resmi dengan rincian berikut:
                </div>
              )}

              {/* Tabel Rincian Pesanan yang Rapi & Terstruktur */}
              <table className="inv-items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px 0', border: '1px solid #CBD5E1', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9' }}>
                    <th style={{ width: '36px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>NO</th>
                    <th style={{ textAlign: 'left', border: '1px solid #CBD5E1', padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>NAMA PRODUK &amp; SPESIFIKASI</th>
                    <th style={{ width: '50px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>QTY</th>
                    <th style={{ width: '55px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>SATUAN</th>
                    {isDO ? (
                      <>
                        <th style={{ width: '110px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>KONDISI FISIK</th>
                        <th style={{ width: '120px', textAlign: 'left', border: '1px solid #CBD5E1', padding: '8px 8px', fontWeight: 800, color: '#0F172A' }}>CATATAN</th>
                      </>
                    ) : (
                      <>
                        <th style={{ width: '110px', textAlign: 'right', border: '1px solid #CBD5E1', padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>HARGA (RP)</th>
                        <th style={{ width: '125px', textAlign: 'right', border: '1px solid #CBD5E1', padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>SUBTOTAL (RP)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', color: '#475569', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '8px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '11.5px', lineHeight: 1.3 }}>
                          {it.nama}
                        </div>
                        {it.desc && (
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', lineHeight: 1.35 }}>
                            {it.desc}
                          </div>
                        )}
                        {it.finishingType && (
                          <span style={{ display: 'inline-block', marginTop: '3px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                            Finishing: {it.finishingType}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>
                        {it.qty}
                      </td>
                      <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', color: '#475569', fontSize: '11px' }}>
                        {it.satuan || 'Pcs'}
                      </td>
                      {isDO ? (
                        <>
                          <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 700, color: '#059669', fontSize: '10.5px' }}>
                            [ &nbsp; ] Sesuai / Baik
                          </td>
                          <td style={{ border: '1px solid #CBD5E1', padding: '8px 8px', fontSize: '10px', color: '#64748B' }}>
                            -
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign: 'right', border: '1px solid #CBD5E1', padding: '8px 10px', fontVariantNumeric: 'tabular-nums', color: '#1E293B', fontWeight: 500 }}>
                            {formatNumber(it.harga)}
                          </td>
                          <td style={{ textAlign: 'right', border: '1px solid #CBD5E1', padding: '8px 10px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#0F172A', fontSize: '11.5px' }}>
                            {formatNumber(it.subtotal)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bagian Bawah: Total & Tanda Tangan */}
              {!isDO ? (
                invoice.tipeDoc === 'Quotation' ? (
                  <div className="print-avoid-break" style={{ marginTop: '12px', fontSize: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 12px' }}>
                          <strong style={{ color: '#0F172A', fontSize: '10.5px' }}>Syarat &amp; Ketentuan Penawaran:</strong>
                          <ol style={{ margin: '4px 0 0 16px', padding: 0, color: '#334155', lineHeight: '1.45', fontSize: '9.5px' }}>
                            <li>Harga berlaku selama 14 hari sejak tanggal penerbitan penawaran.</li>
                            <li>Estimasi pengerjaan: <strong>{invoice.estimasiPengerjaan || '1-3 Hari Kerja'}</strong> setelah file siap cetak &amp; DP disetujui.</li>
                            <li>Uang muka (DP) minimal 50%, pelunasan sebelum pesanan diambil/dikirim.</li>
                          </ol>
                        </div>

                        {settings.bank && (
                          <div style={{ marginTop: '8px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px' }}>
                            <strong style={{ color: '#0F172A', fontSize: '10px' }}>Pembayaran Transfer Bank:</strong>
                            <div style={{ marginTop: '2px', whiteSpace: 'pre-wrap', color: '#1E293B', fontSize: '9.5px', lineHeight: 1.4 }}>
                              {settings.bank}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ width: '44%', textAlign: 'right' }}>
                        <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
                          <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                            <tbody>
                              {invoice.diskonTambahan > 0 && (
                                <tr>
                                  <td style={{ padding: '3px 0', textAlign: 'left', color: '#64748B' }}>Diskon Khusus:</td>
                                  <td style={{ padding: '3px 0', color: '#DC2626', fontWeight: 700, textAlign: 'right' }}>- {formatRupiah(invoice.diskonTambahan)}</td>
                                </tr>
                              )}
                              <tr style={{ borderTop: invoice.diskonTambahan > 0 ? '1px solid #CBD5E1' : 'none', fontWeight: 800 }}>
                                <td style={{ padding: '6px 0 2px 0', fontSize: '11.5px', textAlign: 'left', color: '#0F172A' }}>TOTAL PENAWARAN:</td>
                                <td style={{ color: '#2563EB', padding: '6px 0 2px 0', fontSize: '14px', textAlign: 'right', fontWeight: 900 }}>{formatRupiah(invoice.grandTotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '9.5px', gap: '12px' }}>
                          <div style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px 6px', background: '#FFF' }}>
                            <p style={{ margin: '0 0 34px 0', color: '#64748B' }}>Disetujui oleh,<br /><strong style={{ color: '#0F172A' }}>{invoice.namaCust}</strong></p>
                            <div style={{ borderBottom: '1px dashed #94A3B8', width: '80%', margin: '0 auto 2px auto' }} />
                          </div>
                          <div style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px 6px', background: '#FFF' }}>
                            <p style={{ margin: '0 0 34px 0', color: '#64748B' }}>Hormat Kami,<br /><strong style={{ color: '#0F172A' }}>{settings.company || 'CTRL PRINT'}</strong></p>
                            <div style={{ borderBottom: '1px dashed #94A3B8', width: '80%', margin: '0 auto 2px auto' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="print-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px', gap: '18px' }}>
                    {/* Left Column: Bank / QRIS & T&C */}
                    <div style={{ width: '53%' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'stretch' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', height: '100%', boxSizing: 'border-box' }}>
                            <strong style={{ color: '#0F172A', fontSize: '10px' }}>Pembayaran Transfer Bank:</strong>
                            <pre style={{ margin: '3px 0 0 0', fontFamily: 'inherit', fontSize: '9.5px', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.4 }}>
                              {settings.bank || '-'}
                            </pre>
                          </div>
                        </div>

                        {settings.qrisUrl && (
                          <div style={{ width: '92px', flexShrink: 0, background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '6px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '8px', fontWeight: 800, color: '#059669', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              SCAN QRIS
                            </div>
                            <img
                              src={settings.qrisUrl}
                              alt="QRIS"
                              style={{
                                width: '58px',
                                height: '58px',
                                objectFit: 'contain',
                                margin: '0 auto',
                                display: 'block',
                                backgroundColor: 'transparent'
                              }}
                            />
                            <div style={{ fontSize: '7.5px', marginTop: '2px', lineHeight: '1.1', color: '#0F172A', fontWeight: 700 }}>
                              {settings.qrisNms || settings.company}
                            </div>
                          </div>
                        )}
                      </div>

                      {settings.tnc && (
                        <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 10px' }}>
                          <strong style={{ color: '#0F172A', fontSize: '9.5px' }}>Syarat &amp; Ketentuan:</strong>
                          <div style={{ fontSize: '9px', color: '#475569', lineHeight: 1.35, whiteSpace: 'pre-wrap', marginTop: '2px' }}>
                            {settings.tnc}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Calculation Summary & Signatures */}
                    <div style={{ width: '45%', textAlign: 'right' }}>
                      <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 14px' }}>
                        <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '2px 0', textAlign: 'left', color: '#64748B' }}>Subtotal:</td>
                              <td style={{ padding: '2px 0', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatRupiah(invoice.subtotalSum || invoice.grandTotal)}</td>
                            </tr>
                            {(invoice.diskonTambahan || 0) > 0 && (
                              <tr>
                                <td style={{ padding: '2px 0', textAlign: 'left', color: '#64748B' }}>Diskon:</td>
                                <td style={{ padding: '2px 0', color: '#DC2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>- {formatRupiah(invoice.diskonTambahan)}</td>
                              </tr>
                            )}
                            <tr style={{ borderTop: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', fontWeight: 800 }}>
                              <td style={{ padding: '6px 0', textAlign: 'left', fontSize: '11.5px', color: '#0F172A' }}>GRAND TOTAL:</td>
                              <td style={{ padding: '6px 0', fontSize: '13.5px', color: '#2563EB', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 900 }}>{formatRupiah(invoice.grandTotal)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px 0 2px 0', textAlign: 'left', color: '#64748B' }}>Dibayar ({getPaymentMethodLabel()}):</td>
                              <td style={{ padding: '4px 0 2px 0', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatRupiah(invoice.dibayar)}</td>
                            </tr>
                            <tr style={{ fontWeight: 800 }}>
                              <td style={{ padding: '4px 0 2px 0', textAlign: 'left', fontSize: '10.5px', color: '#0F172A' }}>
                                {(invoice.sisaTertagih || 0) > 0 ? 'SISA TAGIHAN:' : 'KETERANGAN:'}
                              </td>
                              <td style={{ padding: '4px 0 2px 0', fontSize: '12px', color: (invoice.sisaTertagih || 0) > 0 ? '#DC2626' : '#059669', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 900 }}>
                                {(invoice.sisaTertagih || 0) > 0 ? formatRupiah(invoice.sisaTertagih) : 'LUNAS'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '9.5px', gap: '10px' }}>
                        <div style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px 6px', background: '#FFF' }}>
                          <p style={{ margin: '0 0 34px 0', color: '#64748B' }}>Tanda Terima,<br /><strong style={{ color: '#0F172A' }}>{invoice.namaCust}</strong></p>
                          <div style={{ borderBottom: '1px dashed #94A3B8', width: '85%', margin: '0 auto' }} />
                        </div>
                        <div style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px 6px', background: '#FFF' }}>
                          <p style={{ margin: '0 0 34px 0', color: '#64748B' }}>Hormat Kami,<br /><strong style={{ color: '#0F172A' }}>{settings.company || 'CTRL PRINT'}</strong></p>
                          <div style={{ borderBottom: '1px dashed #94A3B8', width: '85%', margin: '0 auto' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="print-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '10px', textAlign: 'center', gap: '16px' }}>
                  <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ color: '#64748B', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENERIMA BARANG</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{invoice.namaCust}</div>
                    <div style={{ marginTop: '36px', borderBottom: '1px dashed #94A3B8', width: '70%', margin: '36px auto 4px auto' }} />
                  </div>
                  <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ color: '#64748B', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KURIR / PENGIRIM</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>-</div>
                    <div style={{ marginTop: '36px', borderBottom: '1px dashed #94A3B8', width: '70%', margin: '36px auto 4px auto' }} />
                  </div>
                  <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ color: '#64748B', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>HORMAT KAMI</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{settings.company || 'CTRL PRINT'}</div>
                    <div style={{ marginTop: '36px', borderBottom: '1px dashed #94A3B8', width: '70%', margin: '36px auto 4px auto' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PO Vendor / SPK View */}
        {currentType === 'PO' && poVendor && (
          <div id="printable-area" className="active-print" style={{ padding: '18px 22px', background: '#FFF', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0F172A' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  borderBottom: '2px solid #0F172A',
                  paddingBottom: '12px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
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
                        backgroundColor: 'transparent',
                        mixBlendMode: 'multiply',
                        display: 'block'
                      }}
                    />
                  )}
                  <div>
                    <h2 style={{ margin: 0, color: '#0F172A', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {settings.company || 'CTRL PRINT'}
                    </h2>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                      {settings.address || ''} <br />
                      Telp/WA: <strong style={{ color: '#0F172A' }}>{settings.phone || '-'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    SURAT PERINTAH KERJA (SPK)
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#2563EB', marginTop: '2px', letterSpacing: '0.5px' }}>
                    #{poVendor.noPo}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                    Tanggal PO: <strong style={{ color: '#0F172A' }}>{formatDate(poVendor.tglPo)}</strong>
                  </div>
                </div>
              </div>

              {/* Vendor & Deadline Info Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <div style={{ color: '#64748B', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                    KEPADA VENDOR / SUPLIER:
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
                    {poVendor.vendor}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#991B1B', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                    TENGGAT SELESAI (DEADLINE):
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 900
                    }}
                  >
                    ⏰ {formatDate(poVendor.tglSelesai)} {poVendor.jamSelesai ? `(Pukul ${poVendor.jamSelesai} WITA)` : ''}
                  </div>
                </div>
              </div>

              {poVendor.driveUrl && (
                <div style={{ marginBottom: '10px', fontSize: '10px', background: '#EFF6FF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                  <strong>📁 Tautan Berkas Cetak (Google Drive):</strong>{' '}
                  <span style={{ color: '#2563EB', wordBreak: 'break-all', fontWeight: 700 }}>{poVendor.driveUrl}</span>
                </div>
              )}

              {/* SPK Items Table */}
              <table className="inv-items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px 0', border: '1px solid #CBD5E1', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9' }}>
                    <th style={{ width: '36px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>NO</th>
                    <th style={{ width: '150px', textAlign: 'left', border: '1px solid #CBD5E1', padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>NAMA FILE CETAK</th>
                    <th style={{ textAlign: 'left', border: '1px solid #CBD5E1', padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>PRODUK &amp; SPESIFIKASI BAHAN</th>
                    <th style={{ width: '50px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>QTY</th>
                    <th style={{ width: '55px', textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A' }}>SATUAN</th>
                  </tr>
                </thead>
                <tbody>
                  {poVendor.items.map((it, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', color: '#475569', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '8px 10px' }}>
                        <strong style={{ color: '#0F172A', fontSize: '11.5px' }}>{it.fileName || '-'}</strong>
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '8px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '11.5px' }}>{it.prodName}</div>
                        {it.ket && (
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', lineHeight: 1.35 }}>
                            {it.ket}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>{it.qty}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #CBD5E1', padding: '8px 6px', color: '#475569' }}>{it.satuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {poVendor.catatan && (
                <div style={{ marginTop: '10px', fontSize: '10px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px', color: '#475569' }}>
                  <strong style={{ color: '#0F172A' }}>Catatan Khusus Produksi:</strong> {poVendor.catatan}
                </div>
              )}

              <div className="print-avoid-break" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '14px', fontSize: '9px', textAlign: 'center', gap: '16px' }}>
                <div>
                  <div style={{ color: '#64748B', fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENERIMA / VENDOR</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '10.5px' }}>{poVendor.vendor}</div>
                  <div style={{ borderBottom: '1px dashed #94A3B8', width: '60%', margin: '26px auto 3px auto' }} />
                  <div style={{ fontSize: '8px', color: '#94A3B8' }}>( Tanda Tangan &amp; Stempel )</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PEMESAN / ADMIN</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px', fontSize: '10.5px' }}>{settings.company || 'CTRL PRINT'}</div>
                  <div style={{ borderBottom: '1px dashed #94A3B8', width: '60%', margin: '26px auto 3px auto' }} />
                  <div style={{ fontSize: '8px', color: '#94A3B8' }}>( Petugas / Produksi )</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thermal Shipping / Packaging Sticker Label */}
        {currentType === 'LABEL' && invoice && (
          <div
            id="printable-label"
            className="active-print"
            style={{
              width: '100%',
              maxWidth: '100%',
              padding: '0 0 8px 0',
              background: '#FFF',
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              color: '#000',
              boxSizing: 'border-box',
              margin: '0'
            }}
          >
            <div style={{ border: '2px solid #000', borderRadius: '4px', padding: '10px', background: '#FFF' }}>
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.3px' }}>
                    {settings.company || 'CTRL PRINT'}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600 }}>
                    Telp/WA: {settings.phone || '-'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 900 }}>#{invoice.noInv}</div>
                    <div style={{ fontSize: '9px', fontWeight: 700 }}>{formatDate(invoice.tglInv)}</div>
                    <div style={{ fontSize: '9px', fontWeight: 800 }}>
                      {(invoice.sisaTertagih || 0) <= 0 ? '[ LUNAS ]' : '[ BELUM LUNAS ]'}
                    </div>
                  </div>
                  <div style={{ padding: '2px', background: '#FFF', border: '1px solid #000' }}>
                    <QRCodeSVG value={invoice.noInv} size={42} />
                  </div>
                </div>
              </div>

              {/* Penerima */}
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PENERIMA:
                </div>
                <div style={{ fontSize: '15px', fontWeight: 900, marginTop: '2px' }}>
                  {invoice.namaCust}
                </div>
                {invoice.waCust && (
                  <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '1px' }}>
                    WA/Telp: {invoice.waCust}
                  </div>
                )}
                {invoice.alamatCust && (
                  <div style={{ fontSize: '10.5px', lineHeight: '1.35', marginTop: '3px' }}>
                    {invoice.alamatCust}
                  </div>
                )}
              </div>

              {/* Isi Paket */}
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '8px', marginBottom: '6px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '3px' }}>
                  ISI BARANG / PAKET:
                </div>
                <div style={{ fontSize: '10.5px', lineHeight: '1.4' }}>
                  {invoice.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• {it.nama} {it.desc ? `(${it.desc})` : ''}</span>
                      <strong style={{ whiteSpace: 'nowrap', marginLeft: '6px' }}>{it.qty} {it.satuan || 'pcs'}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontWeight: 800 }}>
                <span>⚠️ FRAGILE / JANGAN DILIPAT</span>
                <span>{invoice.statusJob || 'PRODUKSI'}</span>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

