/**
 * Utility helper for WhatsApp links and message encoding
 * Guarantees proper UTF-8 percent-encoding for emojis (📝 📸 ✅ 🚚)
 */

import { Invoice, Settings } from '../types';
import { formatRupiah } from './currency';

export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
}

export function cleanWhatsAppMessage(msg: string): string {
  if (!msg) return '';
  // Clean up emojis that corrupt into black diamond question marks () in WhatsApp Web URL parameters
  return msg
    .replace(/👋/g, '')
    .replace(/🙏/g, '')
    .replace(/🎟️?/g, '')
    .replace(/🎉/g, '')
    .replace(/✅/g, '')
    .replace(/💬/g, '')
    .replace(/🧾/g, '')
    .replace(/📋/g, '')
    .replace(/📦/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // strip any surrogate-pair emojis
    .replace(/\uFFFD/g, '')
    .replace(/  +/g, ' '); // collapse extra spaces
}

export function encodeWhatsAppMessage(msg: string): string {
  if (!msg) return '';
  const cleaned = cleanWhatsAppMessage(msg);
  const normalizedStr = typeof cleaned.normalize === 'function' ? cleaned.normalize('NFC') : cleaned;
  return encodeURIComponent(normalizedStr);
}

export function formatWhatsAppUrl(phone?: string, msg: string = ''): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeWhatsAppMessage(msg);
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const reg = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(reg, value || '');
  }
  return result;
}

export function getInvoiceWaMessage(inv: Invoice, settings: Settings): string {
  const portalUrl = `${window.location.origin}${window.location.pathname}?inv=${encodeURIComponent(inv.noInv)}`;
  const template = settings.waTemplateInvoice || `Halo {namaCust}, terima kasih telah memesan di {toko}! Berikut rincian nota pesanan Anda:\n\n📄 No Nota: {noInv}\n💰 Total: {grandTotal}\n💳 Status: {statusBayar}\n\n🔍 Cek progres & nota online: {linkPortal}\n\nTerima kasih atas kepercayaannya!`;

  return interpolateTemplate(template, {
    namaCust: inv.namaCust || 'Pelanggan',
    toko: settings.company || 'CTRL PRINT',
    noInv: inv.noInv,
    grandTotal: formatRupiah(inv.grandTotal),
    dibayar: formatRupiah(inv.dibayar || 0),
    sisaBayar: formatRupiah(inv.sisaTertagih || 0),
    statusBayar: inv.statusBayar || (inv.sisaTertagih <= 0 ? 'LUNAS' : 'BELUM LUNAS'),
    linkPortal: portalUrl,
    alamat: settings.address || '',
    jamBuka: settings.operationalHours || '08.00 - 21.00 WITA',
    rekening: settings.bank || 'BCA / QRIS'
  });
}

export function getReadyOrderWaMessage(inv: Invoice, settings: Settings): string {
  const portalUrl = `${window.location.origin}${window.location.pathname}?inv=${encodeURIComponent(inv.noInv)}`;
  const template = settings.waTemplateReady || `Halo {namaCust}, pesanan cetak Anda dengan No Nota *{noInv}* telah *SELESAI & SIAP DIAMBIL* di workshop {toko}.\n\n📍 Lokasi: {alamat}\n⏰ Jam Buka: {jamBuka}\n\nTerima kasih!`;

  return interpolateTemplate(template, {
    namaCust: inv.namaCust || 'Pelanggan',
    toko: settings.company || 'CTRL PRINT',
    noInv: inv.noInv,
    grandTotal: formatRupiah(inv.grandTotal),
    sisaBayar: formatRupiah(inv.sisaTertagih || 0),
    linkPortal: portalUrl,
    alamat: settings.address || '',
    jamBuka: settings.operationalHours || '08.00 - 21.00 WITA',
    rekening: settings.bank || ''
  });
}

export function getAccDesainWaMessage(inv: Invoice, settings: Settings): string {
  const accUrl = `${window.location.origin}${window.location.pathname}?inv=${encodeURIComponent(inv.noInv)}&tab=acc-desain`;
  const template = settings.waTemplateAccDesain || `Halo {namaCust}, preview desain cetak untuk pesanan *{noInv}* sudah siap direview.\n\nSilakan klik link berikut untuk melihat dan menyetujui (ACC) desain:\n🔗 {linkAcc}\n\nMohon konfirmasi jika ada revisi atau sudah sesuai. Terima kasih!`;

  return interpolateTemplate(template, {
    namaCust: inv.namaCust || 'Pelanggan',
    toko: settings.company || 'CTRL PRINT',
    noInv: inv.noInv,
    linkAcc: accUrl,
    alamat: settings.address || ''
  });
}

export function getFollowUpPiutangWaMessage(inv: Invoice, settings: Settings): string {
  const portalUrl = `${window.location.origin}${window.location.pathname}?inv=${encodeURIComponent(inv.noInv)}`;
  const template = settings.waTemplatePiutang || `Halo {namaCust}, kami dari {toko} mengingatkan bahwa nota *{noInv}* memiliki sisa tagihan sebesar *{sisaBayar}*.\n\n💳 Rekening Pembayaran:\n{rekening}\n\nMohon konfirmasi jika sudah melakukan transfer. Terima kasih banyak!`;

  return interpolateTemplate(template, {
    namaCust: inv.namaCust || 'Pelanggan',
    toko: settings.company || 'CTRL PRINT',
    noInv: inv.noInv,
    grandTotal: formatRupiah(inv.grandTotal),
    dibayar: formatRupiah(inv.dibayar || 0),
    sisaBayar: formatRupiah(inv.sisaTertagih || 0),
    linkPortal: portalUrl,
    rekening: settings.bank || 'BCA / QRIS'
  });
}

export function getQuotationWaMessage(inv: Invoice, settings: Settings): string {
  const portalUrl = `${window.location.origin}${window.location.pathname}?inv=${encodeURIComponent(inv.noInv)}`;
  const template = `Halo {namaCust}, terima kasih telah menghubungi {toko}!\n\nBerikut kami lampirkan *Surat Penawaran Harga (Quotation)* resmi untuk kebutuhan cetak Anda:\n\n📄 No Penawaran: *{noInv}*\n💼 Perihal: {perihal}\n💰 Total Estimasi: *{grandTotal}*\n⏱️ Estimasi Pengerjaan: {estimasi}\n📅 Berlaku: {berlaku}\n\n🔍 Lihat & Unduh Rincian Penawaran Resmi:\n{linkPortal}\n\nSilakan konfirmasi jika rincian sudah sesuai atau ada spesifikasi yang ingin disesuaikan. Terima kasih! 🙏`;

  const validDays = inv.quoteValidityDays || 14;
  return interpolateTemplate(template, {
    namaCust: inv.namaCust || 'Bapak/Ibu',
    toko: settings.company || 'CTRL PRINT',
    noInv: inv.noInv,
    perihal: inv.quoteSubject || 'Penawaran Harga Cetak & Pengadaan',
    grandTotal: formatRupiah(inv.grandTotal),
    estimasi: inv.estimasiPengerjaan || '1-3 Hari Kerja',
    berlaku: `${validDays} Hari Kalender`,
    linkPortal: portalUrl
  });
}

export function getDeliveryOrderWaMessage(inv: Invoice, settings: Settings): string {
  const portalUrl = `${window.location.origin}${window.location.pathname}?inv=${encodeURIComponent(inv.noInv)}`;
  const sjNo = inv.suratJalanNo || `SJ-${inv.noInv.replace(/^INV-|^QUO-/, '')}`;
  const driver = inv.driverName || 'Kurir Toko / Ekspedisi';
  const template = `Halo {namaCust}, pesanan cetak Anda *#{noInv}* saat ini dalam proses *PENGIRIMAN* 🚚\n\n📄 No Surat Jalan: *{noSJ}*\n🛵 Pengirim: {driver}\n📍 Tujuan: {alamat}\n\n📦 Cek Surat Jalan & Bukti Pengiriman Digital:\n{linkPortal}\n\nMohon siapkan perwakilan di lokasi untuk memeriksa dan menerima fisik barang. Terima kasih! 🙏`;

  return interpolateTemplate(template, {
    namaCust: inv.namaCust || 'Pelanggan',
    toko: settings.company || 'CTRL PRINT',
    noInv: inv.noInv,
    noSJ: sjNo,
    driver: driver,
    alamat: inv.alamatCust || 'Alamat Customer',
    linkPortal: portalUrl
  });
}

export function openWhatsApp(phone?: string, msg: string = '') {
  const url = formatWhatsAppUrl(phone, msg);
  window.open(url, '_blank', 'noopener,noreferrer');
}
