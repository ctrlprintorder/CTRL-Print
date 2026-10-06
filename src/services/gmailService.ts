/**
 * Gmail Integration Service
 * Handles email generation and sending via Google Workspace Gmail REST API (users.messages.send)
 */

import { getGoogleAccessToken, requestGoogleAccessToken } from '../lib/googleWorkspace';
import { PoVendor, Settings, Invoice, EmailLog } from '../types';
import { formatRupiah } from '../utils/currency';
import { saveDocument } from '../firebaseService';
import { pushNotification } from './notificationService';

export interface SendCustomerInvoiceParams {
  toEmail: string;
  invoice: Invoice;
  settings: Settings;
  customMessage?: string;
  customSubject?: string;
  logId?: string;
}

export interface SendPoEmailParams {
  toEmail: string;
  po: PoVendor;
  settings: Settings;
  customMessage?: string;
  customSubject?: string;
  logId?: string;
}

export interface SendCustomEmailParams {
  toEmail: string;
  recipientName?: string;
  subject: string;
  messageHtml?: string;
  messageText: string;
  type?: EmailLog['type'];
  referenceId?: string;
  referenceNo?: string;
  attachmentUrl?: string;
  settings: Settings;
}

/**
 * Format RFC 2822 standard email string and convert to Web-safe Base64
 */
function createRawEmail(options: {
  from?: string;
  to: string;
  subject: string;
  htmlBody: string;
}): string {
  const boundary = `====boundary_${Date.now()}====`;
  
  // RFC 2822 compliant MIME message
  const emailLines = [
    `To: ${options.to}`,
    ...(options.from ? [`From: ${options.from}`] : []),
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(options.htmlBody))),
    '',
    `--${boundary}--`
  ];

  const fullEmail = emailLines.join('\r\n');

  // Convert to Web-safe base64 (replace + with -, / with _, and strip =)
  return btoa(unescape(encodeURIComponent(fullEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate standard HTML email body for PO Vendor
 */
export function generatePoEmailHtml(po: PoVendor, settings: Settings, customMessage?: string): string {
  const companyName = settings.company || 'CTRL PRINT';
  const companyPhone = settings.phone || '-';
  const companyEmail = settings.email || 'ctrlprint.order@gmail.com';
  const companyAddress = settings.address || '';

  const itemsRows = (po.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 10px 12px; text-align: center; color: #64748B;">${idx + 1}</td>
      <td style="padding: 10px 12px;">
        <strong style="color: #0F172A;">${item.prodName || '-'}</strong>
        ${item.fileName ? `<br/><span style="font-size: 12px; color: #2563EB;">📁 File: ${item.fileName}</span>` : ''}
        ${item.ket ? `<br/><span style="font-size: 11px; color: #64748B;">Ket: ${item.ket}</span>` : ''}
      </td>
      <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #0F172A;">
        ${item.qty} ${item.satuan || 'Pcs'}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1E293B; background-color: #F8FAFC; margin: 0; padding: 20px; }
        .container { max-width: 650px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; padding: 24px; text-align: left; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
        .btn-drive { display: inline-block; background: #0F9D58; color: #FFFFFF; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 14px; }
        .footer { background: #F1F5F9; padding: 16px 24px; font-size: 12px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">${companyName}</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #94A3B8;">PURCHASE ORDER / SURAT ORDER PRODUKSI</p>
              </td>
              <td style="text-align: right;">
                <span style="background: rgba(255,255,255,0.15); color: #FFFFFF; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 800;">
                  ${po.noPo}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div class="content">
          <p style="font-size: 14px; margin-top: 0;">
            Yth. <strong>${po.vendor}</strong>,
          </p>
          <p style="font-size: 13.5px; color: #475569;">
            Berikut kami sampaikan Surat Pesanan / Purchase Order (PO) untuk diproses sesuai dengan rincian dan spesifikasi di bawah ini:
          </p>

          ${customMessage ? `
            <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #1E40AF;">
              <strong>Pesan Khusus:</strong><br/>
              ${customMessage.replace(/\n/g, '<br/>')}
            </div>
          ` : ''}

          <!-- Info Ringkas PO -->
          <table style="width: 100%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 14px; color: #64748B; width: 35%;">Tanggal PO:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #0F172A;">${po.tglPo}</td>
            </tr>
            <tr style="border-top: 1px solid #E2E8F0;">
              <td style="padding: 10px 14px; color: #64748B;">Target Selesai:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #DC2626;">
                ${po.tglSelesai || '-'} (Pukul ${po.jamSelesai || '15:00'} WITA)
              </td>
            </tr>
            ${po.modalTotal > 0 ? `
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 10px 14px; color: #64748B;">Total Estimasi Biaya:</td>
                <td style="padding: 10px 14px; font-weight: 800; color: #0F172A;">${formatRupiah(po.modalTotal)}</td>
              </tr>
            ` : ''}
          </table>

          <!-- Tabel Rincian Item Cetak -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <thead>
              <tr style="background: #F1F5F9; text-align: left; color: #475569; font-weight: 700;">
                <th style="padding: 10px 12px; text-align: center; width: 40px;">No</th>
                <th style="padding: 10px 12px;">Deskripsi Item Cetak / Spesifikasi</th>
                <th style="padding: 10px 12px; text-align: center; width: 100px;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Catatan Tambahan -->
          ${po.catatan ? `
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px 14px; border-radius: 8px; font-size: 12.5px; color: #92400E; margin-bottom: 20px;">
              <strong>Catatan Produksi / Finishing:</strong><br/>
              ${po.catatan}
            </div>
          ` : ''}

          <!-- Google Drive Link Box -->
          ${po.driveUrl ? `
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #166534; margin-bottom: 6px;">
                📂 File Cetak Resolusi Tinggi Tersedia di Google Drive:
              </div>
              <p style="font-size: 12px; color: #15803D; margin: 0 0 10px;">
                Klik tombol di bawah ini untuk mengunduh master file desain cetak:
              </p>
              <a href="${po.driveUrl}" target="_blank" class="btn-drive" style="color: #FFFFFF;">
                Buka & Download File di Google Drive &rarr;
              </a>
            </div>
          ` : ''}

          <p style="font-size: 13px; color: #64748B; margin-bottom: 0;">
            Mohon konfirmasi jika pesanan ini telah diterima dan dapat diproses tepat waktu. Terima kasih atas kerja samanya!
          </p>
        </div>

        <div class="footer">
          <strong>${companyName}</strong><br/>
          ${companyAddress ? `${companyAddress} | ` : ''}Telp/WA: ${companyPhone} | Email: ${companyEmail}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send PO Vendor via Gmail REST API
 */
export async function sendPoVendorEmail(params: SendPoEmailParams): Promise<{ messageId: string; logId: string }> {
  if (!params.toEmail || !params.toEmail.includes('@')) {
    throw new Error('Alamat email vendor tujuan tidak valid.');
  }

  let token = getGoogleAccessToken();
  if (!token) {
    token = await requestGoogleAccessToken();
  }

  if (!token) {
    throw new Error('Gagal mendapatkan otorisasi akun Google/Gmail. Silakan login ke akun Google.');
  }

  const logId = params.logId || `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const subject = params.customSubject || `[PURCHASE ORDER] ${params.po.noPo} - ${params.settings.company || 'CTRL PRINT'} (${params.po.vendor})`;
  const baseHtml = generatePoEmailHtml(params.po, params.settings, params.customMessage);
  
  // Inject tracking pixel
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const trackingPixel = `<img src="${origin}/api/email/track-open/${logId}" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`;
  const htmlBody = baseHtml.replace('</body>', `${trackingPixel}</body>`);

  const rawMessage = createRawEmail({
    to: params.toEmail,
    subject,
    htmlBody
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: rawMessage
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData.error?.message || 'Gagal mengirim email via Gmail API.';
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Izin Gmail belum aktif: ${errorMsg}. Pastikan izin Google Workspace telah disetujui.`);
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();

  // Save email log to Firestore
  const emailLog: EmailLog = {
    id: logId,
    recipientEmail: params.toEmail,
    recipientName: params.po.vendor,
    subject,
    bodyHtml: htmlBody,
    bodyText: params.customMessage || `PO SPK Vendor ${params.po.noPo}`,
    type: 'po_vendor',
    referenceId: params.po.id,
    referenceNo: params.po.noPo,
    sentAt: new Date().toLocaleString('id-ID'),
    status: 'sent',
    senderEmail: params.settings.email || 'ctrlprint.order@gmail.com',
    attachmentUrl: params.po.driveUrl || undefined
  };

  try {
    await saveDocument('email_logs', emailLog);
    await pushNotification({
      type: 'email_sent',
      title: '📧 Email SPK Vendor Terkirim',
      desc: `PO #${params.po.noPo} berhasil dikirim ke ${params.toEmail} (${params.po.vendor})`,
      category: 'email',
      linkTab: 'email-manager',
      referenceId: logId,
      referenceNo: params.po.noPo
    });
  } catch (logErr) {
    console.warn('Could not save email log:', logErr);
  }

  return {
    messageId: result.id,
    logId
  };
}

/**
 * Generate standard HTML email body for Customer Invoice & Nota Resmi
 */
export function generateCustomerInvoiceHtml(inv: Invoice, settings: Settings, customMessage?: string, logId?: string): string {
  const companyName = settings.company || 'CTRL PRINT';
  const companyPhone = settings.phone || '-';
  const companyEmail = settings.email || 'ctrlprint.order@gmail.com';
  const companyAddress = settings.address || '';
  const isLunas = inv.sisaTertagih <= 0 || inv.statusBayar === 'LUNAS' || inv.statusBayar === 'Paid';
  const statusColor = isLunas ? '#10B981' : inv.dibayar > 0 ? '#F59E0B' : '#EF4444';
  const statusLabel = isLunas ? 'LUNAS' : inv.dibayar > 0 ? 'SEBAGIAN (DP)' : 'BELUM BAYAR';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${origin}/?inv=${encodeURIComponent(inv.noInv)}${logId ? `&ref_email=${logId}` : ''}`;
  const totalSubtotal = (inv.items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalDiskon = (inv.diskonTambahan || 0) + (inv.voucherDiscount || 0);

  const itemsRows = (inv.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 10px 12px; text-align: center; color: #64748B;">${idx + 1}</td>
      <td style="padding: 10px 12px;">
        <strong style="color: #0F172A;">${item.nama || '-'}</strong>
        ${item.panjangCm && item.lebarCm ? `<br/><span style="font-size: 11.5px; color: #64748B;">Ukuran: ${item.panjangCm} x ${item.lebarCm} cm</span>` : ''}
        ${item.desc ? `<br/><span style="font-size: 11.5px; color: #64748B;">Ket: ${item.desc}</span>` : ''}
      </td>
      <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #0F172A;">
        ${item.qty} ${item.satuan || 'Pcs'}
      </td>
      <td style="padding: 10px 12px; text-align: right; color: #64748B;">
        ${formatRupiah(item.harga)}
      </td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0F172A;">
        ${formatRupiah(item.subtotal)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1E293B; background-color: #F8FAFC; margin: 0; padding: 20px; }
        .container { max-width: 650px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; padding: 24px; text-align: left; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; }
        .btn-portal { display: inline-block; background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 700; font-size: 14px; }
        .footer { background: #F1F5F9; padding: 16px 24px; font-size: 12px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">${companyName}</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #94A3B8;">FAKTUR & NOTA PEMESANAN DIGITAL</p>
              </td>
              <td style="text-align: right;">
                <span style="background: rgba(255,255,255,0.15); color: #FFFFFF; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 800;">
                  ${inv.noInv}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div class="content">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td>
                <p style="font-size: 14px; margin: 0;">
                  Kepada Yth: <strong style="font-size: 15px; color: #0F172A;">${inv.namaCust}</strong>
                  ${inv.waCust ? `<br/><span style="font-size: 12.5px; color: #64748B;">No HP/WA: ${inv.waCust}</span>` : ''}
                </p>
              </td>
              <td style="text-align: right;">
                <span class="badge" style="background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                  STATUS: ${statusLabel}
                </span>
              </td>
            </tr>
          </table>

          <p style="font-size: 13.5px; color: #475569; margin-top: 0;">
            Terima kasih telah mempercayakan kebutuhan cetak Anda kepada <strong>${companyName}</strong>. Berikut rincian resmi nota transaksi Anda:
          </p>

          ${customMessage ? `
            <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #1E40AF;">
              <strong>Catatan / Pesan Toko:</strong><br/>
              ${customMessage.replace(/\n/g, '<br/>')}
            </div>
          ` : ''}

          <!-- Info Ringkas Transaksi -->
          <table style="width: 100%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 14px; color: #64748B; width: 35%;">Tanggal Nota:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #0F172A;">${inv.tglInv}</td>
            </tr>
            <tr style="border-top: 1px solid #E2E8F0;">
              <td style="padding: 10px 14px; color: #64748B;">Jatuh Tempo:</td>
              <td style="padding: 10px 14px; font-weight: 600; color: #0F172A;">${inv.tempoInv || inv.tglInv}</td>
            </tr>
            <tr style="border-top: 1px solid #E2E8F0;">
              <td style="padding: 10px 14px; color: #64748B;">Status Produksi:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #2563EB;">${inv.statusJob || 'Proses'}</td>
            </tr>
          </table>

          <!-- Tabel Rincian Item Cetak -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
            <thead>
              <tr style="background: #F1F5F9; text-align: left; color: #475569; font-weight: 700;">
                <th style="padding: 10px 12px; text-align: center; width: 30px;">No</th>
                <th style="padding: 10px 12px;">Item & Spesifikasi</th>
                <th style="padding: 10px 12px; text-align: center; width: 70px;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; width: 90px;">Harga</th>
                <th style="padding: 10px 12px; text-align: right; width: 100px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Ringkasan Finansial -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #64748B;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatRupiah(totalSubtotal)}</td>
              </tr>
              ${totalDiskon > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color: #EF4444;">Diskon / Potongan:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #EF4444;">-${formatRupiah(totalDiskon)}</td>
                </tr>
              ` : ''}
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 8px 0 4px; font-size: 15px; font-weight: 800; color: #0F172A;">Total Tagihan:</td>
                <td style="padding: 8px 0 4px; text-align: right; font-size: 16px; font-weight: 800; color: #0F172A;">${formatRupiah(inv.grandTotal)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #10B981; font-weight: 600;">Jumlah Dibayar:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #10B981;">${formatRupiah(inv.dibayar)}</td>
              </tr>
              <tr style="border-top: 1px dashed #CBD5E1;">
                <td style="padding: 6px 0 0; font-weight: 700; color: ${inv.sisaTertagih > 0 ? '#EF4444' : '#10B981'};">Sisa Tagihan:</td>
                <td style="padding: 6px 0 0; text-align: right; font-weight: 800; color: ${inv.sisaTertagih > 0 ? '#EF4444' : '#10B981'};">${formatRupiah(inv.sisaTertagih)}</td>
              </tr>
            </table>
          </div>

          <!-- Pembayaran & Portal Link Box -->
          ${settings.bank ? `
            <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12.5px;">
              <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Informasi Pembayaran / Rekening Resmi:</strong>
              <div style="color: #334155; white-space: pre-line;">${settings.bank}</div>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="${portalUrl}" target="_blank" class="btn-portal" style="color: #FFFFFF;">
              Lihat Progres & Nota Digital di Portal Online &rarr;
            </a>
          </div>
        </div>

        <div class="footer">
          <strong>${companyName}</strong><br/>
          ${companyAddress ? `${companyAddress} | ` : ''}Telp/WA: ${companyPhone} | Email: ${companyEmail}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send Customer Invoice via Gmail REST API
 */
export async function sendCustomerInvoiceEmail(params: SendCustomerInvoiceParams): Promise<{ messageId: string; logId: string }> {
  if (!params.toEmail || !params.toEmail.includes('@')) {
    throw new Error('Alamat email pelanggan tidak valid.');
  }

  let token = getGoogleAccessToken();
  if (!token) {
    token = await requestGoogleAccessToken();
  }

  if (!token) {
    throw new Error('Gagal mendapatkan otorisasi akun Google/Gmail. Silakan login ke akun Google.');
  }

  const logId = params.logId || `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const subject = params.customSubject || `[INVOICE ${params.invoice.noInv}] ${params.settings.company || 'CTRL PRINT'} - ${params.invoice.namaCust}`;
  const baseHtml = generateCustomerInvoiceHtml(params.invoice, params.settings, params.customMessage, logId);

  // Inject tracking pixel
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const trackingPixel = `<img src="${origin}/api/email/track-open/${logId}" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`;
  const htmlBody = baseHtml.replace('</body>', `${trackingPixel}</body>`);

  const rawMessage = createRawEmail({
    to: params.toEmail,
    subject,
    htmlBody
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: rawMessage
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData.error?.message || 'Gagal mengirim email via Gmail API.';
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Izin Gmail belum aktif: ${errorMsg}. Pastikan izin Google Workspace telah disetujui.`);
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();

  // Save email log to Firestore
  const emailLog: EmailLog = {
    id: logId,
    recipientEmail: params.toEmail,
    recipientName: params.invoice.namaCust,
    subject,
    bodyHtml: htmlBody,
    bodyText: params.customMessage || `Faktur Digital #${params.invoice.noInv}`,
    type: 'invoice',
    referenceId: params.invoice.id,
    referenceNo: params.invoice.noInv,
    sentAt: new Date().toLocaleString('id-ID'),
    status: 'sent',
    senderEmail: params.settings.email || 'ctrlprint.order@gmail.com'
  };

  try {
    await saveDocument('email_logs', emailLog);
    await pushNotification({
      type: 'email_sent',
      title: '📧 Faktur Email Berhasil Dikirim',
      desc: `Nota #${params.invoice.noInv} dikirim ke ${params.toEmail} (${params.invoice.namaCust})`,
      category: 'email',
      linkTab: 'email-manager',
      referenceId: logId,
      referenceNo: params.invoice.noInv
    });
  } catch (logErr) {
    console.warn('Could not save email log:', logErr);
  }

  return {
    messageId: result.id,
    logId
  };
}

/**
 * Generate standard HTML for custom or general email templates
 */
export function generateCustomEmailHtml(params: {
  title: string;
  recipientName?: string;
  message: string;
  actionButton?: { text: string; url: string };
  settings: Settings;
  logId?: string;
  attachmentUrl?: string;
}): string {
  const companyName = params.settings.company || 'CTRL PRINT';
  const companyPhone = params.settings.phone || '-';
  const companyEmail = params.settings.email || 'ctrlprint.order@gmail.com';
  const companyAddress = params.settings.address || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const trackingPixel = params.logId ? `<img src="${origin}/api/email/track-open/${params.logId}" width="1" height="1" style="display:none;" alt="" />` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1E293B; background-color: #F8FAFC; margin: 0; padding: 20px; }
        .container { max-width: 650px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; padding: 24px; }
        .content { padding: 28px; }
        .btn-action { display: inline-block; background: #2563EB; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 16px; }
        .footer { background: #F1F5F9; padding: 16px 24px; font-size: 12px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF;">${companyName}</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94A3B8;">${params.title}</p>
        </div>
        <div class="content">
          ${params.recipientName ? `<p style="font-size: 15px; margin-top: 0; color: #0F172A;">Halo <strong>${params.recipientName}</strong>,</p>` : ''}
          <div style="font-size: 14px; color: #334155; white-space: pre-line; line-height: 1.7;">
            ${params.message}
          </div>
          ${params.attachmentUrl ? `
            <div style="margin-top: 20px; padding: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; font-size: 13px;">
              <strong style="color: #166534;">📁 Lampiran File Google Drive:</strong><br/>
              <a href="${params.attachmentUrl}" target="_blank" style="color: #15803D; word-break: break-all; text-decoration: underline;">
                ${params.attachmentUrl}
              </a>
            </div>
          ` : ''}
          ${params.actionButton ? `
            <div style="text-align: center; margin-top: 24px;">
              <a href="${params.actionButton.url}" target="_blank" class="btn-action">
                ${params.actionButton.text} &rarr;
              </a>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <strong>${companyName}</strong><br/>
          ${companyAddress ? `${companyAddress} | ` : ''}Telp/WA: ${companyPhone} | Email: ${companyEmail}
        </div>
      </div>
      ${trackingPixel}
    </body>
    </html>
  `;
}

/**
 * Send custom or promotional email via Gmail REST API
 */
export async function sendCustomEmail(params: SendCustomEmailParams): Promise<{ messageId: string; logId: string }> {
  if (!params.toEmail || !params.toEmail.includes('@')) {
    throw new Error('Alamat email tujuan tidak valid.');
  }

  let token = getGoogleAccessToken();
  if (!token) {
    token = await requestGoogleAccessToken();
  }

  if (!token) {
    throw new Error('Gagal mendapatkan otorisasi akun Google/Gmail. Silakan login ke akun Google.');
  }

  const logId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const htmlBody = params.messageHtml || generateCustomEmailHtml({
    title: params.subject,
    recipientName: params.recipientName,
    message: params.messageText,
    settings: params.settings,
    logId,
    attachmentUrl: params.attachmentUrl
  });

  const rawMessage = createRawEmail({
    to: params.toEmail,
    subject: params.subject,
    htmlBody
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: rawMessage
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData.error?.message || 'Gagal mengirim email via Gmail API.';
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Izin Gmail belum aktif: ${errorMsg}. Pastikan izin Google Workspace telah disetujui.`);
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();

  // Save email log
  const emailLog: EmailLog = {
    id: logId,
    recipientEmail: params.toEmail,
    recipientName: params.recipientName,
    subject: params.subject,
    bodyHtml: htmlBody,
    bodyText: params.messageText,
    type: params.type || 'custom',
    referenceId: params.referenceId,
    referenceNo: params.referenceNo,
    sentAt: new Date().toLocaleString('id-ID'),
    status: 'sent',
    senderEmail: params.settings.email || 'ctrlprint.order@gmail.com',
    attachmentUrl: params.attachmentUrl
  };

  try {
    await saveDocument('email_logs', emailLog);
    await pushNotification({
      type: 'email_sent',
      title: '📧 Email Berhasil Dikirim',
      desc: `Email "${params.subject}" berhasil dikirim ke ${params.toEmail}`,
      category: 'email',
      linkTab: 'email-manager',
      referenceId: logId,
      referenceNo: params.referenceNo
    });
  } catch (logErr) {
    console.warn('Could not save email log:', logErr);
  }

  return {
    messageId: result.id,
    logId
  };
}

/**
 * Mark an email as read & dispatch instant read notification to notification bar
 */
export async function markEmailAsRead(
  emailLog: EmailLog,
  readInfo?: { userAgent?: string; ipAddress?: string; note?: string }
): Promise<EmailLog> {
  const updatedLog: EmailLog = {
    ...emailLog,
    status: 'read',
    readAt: new Date().toLocaleString('id-ID'),
    readCount: (emailLog.readCount || 0) + 1,
    ipAddress: readInfo?.ipAddress || emailLog.ipAddress
  };

  try {
    await saveDocument('email_logs', updatedLog);
  } catch (e) {
    console.warn('Error saving read email log to Firestore:', e);
  }

  // Push notification directly to notification bar
  await pushNotification({
    type: 'email_read',
    title: '📬 Email Telah Dibuka & Dibaca!',
    desc: `Penerima (${emailLog.recipientName ? `${emailLog.recipientName} - ` : ''}${emailLog.recipientEmail}) telah membaca email: "${emailLog.subject}"`,
    category: 'email',
    linkTab: 'email-manager',
    referenceId: emailLog.id,
    referenceNo: emailLog.referenceNo,
    badge: 'Dibaca'
  });

  return updatedLog;
}

