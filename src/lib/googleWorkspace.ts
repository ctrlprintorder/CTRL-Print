/**
 * Google Workspace Client Integration for CTRL PRINT
 * Supports Google Sheets, Google Drive, and Google Calendar via GIS Token Client
 */

import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

declare global {
  interface Window {
    google?: any;
  }
}

// Token storage key
const TOKEN_KEY = 'ctrl_google_access_token';
const TOKEN_EXPIRE_KEY = 'ctrl_google_token_expires_at';

// Scopes configured in applet OAuth setup
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/contacts'
];

/**
 * Get current cached access token if still valid
 */
export function getGoogleAccessToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRE_KEY) || 0);
    if (token && Date.now() < expiresAt) {
      return token;
    }
  } catch (e) {
    console.error('Error reading google token from localStorage:', e);
  }
  return null;
}

/**
 * Save access token with expiration
 */
export function saveGoogleAccessToken(token: string, expiresInSeconds: number = 3600): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRE_KEY, String(Date.now() + (expiresInSeconds - 60) * 1000));
  } catch (e) {
    console.error('Error saving google token to localStorage:', e);
  }
}

/**
 * Clear cached access token
 */
export function clearGoogleAccessToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRE_KEY);
  } catch (e) {
    console.error('Error clearing google token:', e);
  }
}

/**
 * Request Google Access Token using Firebase Auth popup (with fallback to GIS if client ID available)
 */
export async function requestGoogleAccessToken(userHint?: string): Promise<string> {
  const existing = getGoogleAccessToken();
  if (existing) return existing;

  // 1. First attempt: Firebase GoogleAuthProvider popup (always works without hardcoded client ID)
  try {
    const provider = new GoogleAuthProvider();
    SCOPES.forEach(scope => provider.addScope(scope));
    const customParams: Record<string, string> = { prompt: 'select_account' };
    if (userHint) {
      customParams.login_hint = userHint;
    }
    provider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      saveGoogleAccessToken(credential.accessToken, 3600);
      return credential.accessToken;
    }
  } catch (firebaseErr: any) {
    console.warn('Firebase Auth popup attempted, checking fallback:', firebaseErr);
  }

  // 2. Second attempt: Check if GIS client ID exists in env or window
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (window as any).GOOGLE_CLIENT_ID;
  if (clientId) {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initOAuthFlow(clientId, resolve, reject);
        };
        script.onerror = () => {
          reject(new Error('Gagal memuat Google Identity Services script.'));
        };
        document.body.appendChild(script);
      } else {
        initOAuthFlow(clientId, resolve, reject);
      }
    });
  }

  // Return empty string if no token could be obtained, callers can fallback to direct storage/API upload
  return '';
}

function initOAuthFlow(clientId: string, resolve: (token: string) => void, reject: (err: any) => void) {
  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES.join(' '),
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          saveGoogleAccessToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);
          resolve(tokenResponse.access_token);
        } else if (tokenResponse && tokenResponse.error) {
          reject(new Error(`Otorisasi Google dibatalkan: ${tokenResponse.error}`));
        } else {
          reject(new Error('Gagal mendapatkan access token Google.'));
        }
      },
      error_callback: (nonOAuthError: any) => {
        reject(new Error(`Google OAuth error: ${nonOAuthError?.message || 'Gagal membuka dialog izin Google'}`));
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (err) {
    reject(err);
  }
}

// -------------------------------------------------------------
// 1. GOOGLE SHEETS API INTEGRATION
// -------------------------------------------------------------

export interface SyncInvoiceRow {
  noInv: string;
  tglInv: string;
  namaCust: string;
  waCust?: string;
  grandTotal: number;
  dibayar: number;
  sisaTertagih: number;
  statusBayar: string;
  statusJob: string;
  itemSummary: string;
  kasir?: string;
}

/**
 * Create a new Google Spreadsheet for CTRL PRINT Bookkeeping
 */
export async function createCtrlSpreadsheet(accessToken: string, title?: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const name = title || `CTRL PRINT - Rekap Penjualan & Order (${new Date().getFullYear()})`;
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: name
      },
      sheets: [
        {
          properties: {
            title: 'Rekap Penjualan',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        },
        {
          properties: {
            title: 'Rekap Pengeluaran',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membuat Spreadsheet: ${errText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl;

  // Add Headers to 'Rekap Penjualan'
  await appendSheetValues(accessToken, spreadsheetId, 'Rekap Penjualan!A1:J1', [
    ['No Invoice', 'Tanggal', 'Nama Pelanggan', 'WhatsApp', 'Grand Total (Rp)', 'Dibayar (Rp)', 'Sisa (Rp)', 'Status Bayar', 'Status Produksi', 'Rincian Item']
  ]);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Append rows to a specific Sheet range
 */
export async function appendSheetValues(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      values
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal menyinkronkan data ke Google Sheets: ${errText}`);
  }
  return await res.json();
}

// -------------------------------------------------------------
// 2. GOOGLE CALENDAR API INTEGRATION
// -------------------------------------------------------------

export interface CalendarEventPayload {
  summary: string;
  description: string;
  location?: string;
  startDateTime: string; // ISO string e.g. 2026-08-16T17:00:00+07:00
  endDateTime: string;   // ISO string e.g. 2026-08-16T18:00:00+07:00
}

/**
 * Add an order deadline event to Google Calendar
 */
export async function createCalendarEvent(accessToken: string, payload: CalendarEventPayload): Promise<any> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: payload.summary,
      description: payload.description,
      location: payload.location || 'Workshop CTRL PRINT',
      start: {
        dateTime: payload.startDateTime,
        timeZone: 'Asia/Jakarta'
      },
      end: {
        dateTime: payload.endDateTime,
        timeZone: 'Asia/Jakarta'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 }, // 1 hour before
          { method: 'popup', minutes: 1440 } // 24 hours before
        ]
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menambahkan event ke Google Calendar: ${err}`);
  }

  return await res.json();
}

// -------------------------------------------------------------
// 3. GOOGLE DRIVE API INTEGRATION
// -------------------------------------------------------------

/**
 * Get or create a specific folder in Google Drive
 */
export async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  try {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create the folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      })
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch (err) {
    console.warn('Folder resolution error in Google Drive:', err);
  }
  return parentFolderId || '';
}

/**
 * Upload a file directly to Google Drive via Access Token (with optional parent folder and % progress tracking)
 */
export function uploadFileToDrive(
  accessToken: string,
  file: File | Blob,
  fileName: string,
  parentFolderId?: string,
  onProgress?: (percent: number) => void
): Promise<{ id: string; viewUrl: string; name: string }> {
  return new Promise((resolve, reject) => {
    if (!accessToken) {
      return reject(new Error('Access token Google diperlukan.'));
    }

    // Metadata Part
    const metadata: any = {
      name: fileName,
      mimeType: file.type || 'application/octet-stream'
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink');
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(Math.round((event.loaded / event.total) * 100), 99);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve({
            id: data.id,
            name: data.name,
            viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
          });
        } catch (e) {
          reject(new Error('Gagal memproses respon Google Drive.'));
        }
      } else {
        let errMsg = `Gagal upload ke Google Drive (Status ${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error?.message) errMsg = errData.error.message;
        } catch (_) {}
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Terjadi kesalahan jaringan saat mengunggah ke Google Drive.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Waktu unggah ke Google Drive habis (timeout).'));
    };

    xhr.send(form);
  });
}

export type TargetDriveCategory =
  | 'desain_acc'
  | 'bukti_transfer_customer'
  | 'pembayaran_vendor'
  | 'file_po_vendor'
  | 'katalog_produk'
  | 'scan_nota'
  | 'logos'
  | 'banners'
  | 'invoices'
  | 'general';

export interface UploadSmartMeta {
  invoiceNo?: string;
  customerName?: string;
  category?: TargetDriveCategory;
  folderStructure?: boolean;
  onProgress?: (percent: number) => void;
}

export function getCategoryFolderInfo(cat?: TargetDriveCategory): { folderName: string; prefix: string; label: string } {
  switch (cat) {
    case 'desain_acc':
      return { folderName: 'Desain & ACC', prefix: 'DESAIN', label: 'File Desain & ACC' };
    case 'bukti_transfer_customer':
    case 'invoices':
      return { folderName: 'Bukti Transfer Customer', prefix: 'TRANSFER-CUST', label: 'Bukti Transfer Customer' };
    case 'file_po_vendor':
      return { folderName: 'File Cetak & PO Vendor', prefix: 'PO-CETAK', label: 'File Cetak & PO Vendor' };
    case 'pembayaran_vendor':
      return { folderName: 'Pembayaran Vendor', prefix: 'VENDOR-PAY', label: 'Bukti Transfer Pembayaran Vendor' };
    case 'katalog_produk':
      return { folderName: 'Katalog Produk', prefix: 'PRODUK', label: 'Katalog & Gambar Produk' };
    case 'scan_nota':
      return { folderName: 'Scan Nota & Pengeluaran', prefix: 'SCAN-NOTA', label: 'Scan Nota & Pengeluaran' };
    case 'logos':
    case 'banners':
      return { folderName: 'Branding & Logo', prefix: 'BRANDING', label: 'Logo & Banner Toko' };
    case 'general':
    default:
      return { folderName: 'Dokumen & Lampiran', prefix: 'DOC', label: 'Dokumen & Lampiran' };
  }
}

/**
 * Universal file uploader that strictly uploads to Google Drive with categorized folder organization (No. 1 Structure) & % progress tracking.
 * Strictly avoids Base64 storage — 100% cloud sync with Google Drive.
 */
export async function uploadFileSmart(
  file: File,
  fileName: string,
  extraMeta?: UploadSmartMeta
): Promise<{ id: string; viewUrl: string; name: string; isGoogleDrive: boolean; folderName?: string }> {
  const onProgress = extraMeta?.onProgress;
  if (onProgress) onProgress(5);

  // 1. Ensure Google Access Token
  let token = getGoogleAccessToken();
  if (!token) {
    token = await requestGoogleAccessToken();
  }

  if (!token) {
    throw new Error(
      'Akses Google Drive diperlukan untuk mengunggah berkas. Seluruh data disinkronkan langsung ke Google Drive (Tanpa Base64).'
    );
  }

  // 2. Prepare structured folder hierarchy: CTRL PRINT / [Category Folder]
  let targetFolderId: string | undefined = undefined;
  const catInfo = getCategoryFolderInfo(extraMeta?.category);

  if (extraMeta?.folderStructure !== false) {
    try {
      // Master root folder in Google Drive: "CTRL PRINT"
      const rootFolderId = await getOrCreateDriveFolder(token, 'CTRL PRINT');
      if (rootFolderId) {
        // Categorized Subfolder based on context:
        // - Desain & ACC
        // - Bukti Transfer Customer
        // - Pembayaran Vendor
        // - Katalog Produk
        // - Scan Nota & Pengeluaran
        // - Branding & Logo
        const catFolderId = await getOrCreateDriveFolder(token, catInfo.folderName, rootFolderId);
        targetFolderId = catFolderId || rootFolderId;
      }
    } catch (folderErr) {
      console.warn('Categorized folder hierarchy creation notice:', folderErr);
    }
  }

  // 3. Format Smart Context File Name if not already prefixed
  let finalFileName = fileName;
  const prefixTag = `[${catInfo.prefix}]`;
  if (!finalFileName.startsWith('[')) {
    const safeRef = (extraMeta?.invoiceNo || extraMeta?.customerName || '').replace(/[^a-zA-Z0-9-_]/g, '_');
    const timeRef = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (safeRef) {
      finalFileName = `${prefixTag}_${safeRef}_${timeRef}_${fileName}`;
    } else {
      finalFileName = `${prefixTag}_${timeRef}_${fileName}`;
    }
  }

  // 4. Perform Direct Google Drive Upload (with progress tracking)
  const result = await uploadFileToDrive(token, file, finalFileName, targetFolderId, onProgress);

  // 5. Make file readable for web preview
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Set file permissions warning (non-blocking):', permErr);
  }

  return {
    ...result,
    isGoogleDrive: true,
    folderName: catInfo.folderName
  };
}
