/**
 * Google Drive API Service
 * Handles Google Drive authentication, folder retrieval/creation,
 * file uploads to specific folders, and search in the user's Google Drive.
 */

import {
  getGoogleAccessToken,
  requestGoogleAccessToken,
  clearGoogleAccessToken,
  uploadFileToDrive,
  TargetDriveCategory,
  getCategoryFolderInfo
} from '../lib/googleWorkspace';
import { extractDriveFileId } from '../utils/googleDrive';

export type { TargetDriveCategory };

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveFolderItem {
  id: string;
  name: string;
}

/**
 * Ensure active access token, requesting authentication if needed
 */
export async function ensureDriveAuth(): Promise<string> {
  let token = getGoogleAccessToken();
  if (!token) {
    token = await requestGoogleAccessToken();
  }
  if (!token) {
    throw new Error('Gagal mendapatkan izin akses Google Drive. Silakan hubungkan akun Google Anda.');
  }
  return token;
}

/**
 * Get or create a folder in user's Google Drive by name
 */
export async function getOrCreateFolder(
  folderName: string,
  parentFolderId?: string
): Promise<DriveFolderItem> {
  const token = await ensureDriveAuth();

  // Search if folder already exists
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        name: data.files[0].name
      };
    }
  }

  // Create folder if not found
  const createMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    createMetadata.parents = [parentFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createMetadata)
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Gagal membuat folder di Google Drive.');
  }

  const newFolder = await createRes.json();
  return {
    id: newFolder.id,
    name: newFolder.name
  };
}

/**
 * List folders available in the user's Google Drive
 */
export async function listDriveFolders(): Promise<DriveFolderItem[]> {
  const token = await ensureDriveAuth();

  const query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=30&fields=files(id,name)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mengambil daftar folder Google Drive.');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name
  }));
}

/**
 * List files within a specified folder or search drive
 */
export async function listFilesInFolder(
  folderId?: string,
  filterType: 'all' | 'images' | 'documents' = 'all'
): Promise<DriveFileItem[]> {
  const token = await ensureDriveAuth();

  let query = 'trashed = false';
  if (folderId && folderId !== 'root' && folderId !== 'all') {
    query += ` and '${folderId}' in parents`;
  }

  if (filterType === 'images') {
    query += ` and mimeType contains 'image/'`;
  } else if (filterType === 'documents') {
    query += ` and (mimeType contains 'pdf' or mimeType contains 'sheet' or mimeType contains 'document' or mimeType contains 'zip')`;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=50&fields=files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,size,createdTime,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal memuat file dari Google Drive.');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    thumbnailLink: f.thumbnailLink,
    iconLink: f.iconLink,
    size: f.size,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime
  }));
}

/**
 * Search Drive files by keyword and type
 */
export async function searchDriveFiles(
  keyword: string,
  filterType: 'all' | 'images' | 'documents' = 'all'
): Promise<DriveFileItem[]> {
  const token = await ensureDriveAuth();

  let query = 'trashed = false';
  if (keyword.trim()) {
    query += ` and name contains '${keyword.trim().replace(/'/g, "\\'")}'`;
  }

  if (filterType === 'images') {
    query += ` and mimeType contains 'image/'`;
  } else if (filterType === 'documents') {
    query += ` and (mimeType contains 'pdf' or mimeType contains 'sheet' or mimeType contains 'document' or mimeType contains 'zip')`;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=40&fields=files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,size,createdTime,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mencari berkas di Google Drive.');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    thumbnailLink: f.thumbnailLink,
    iconLink: f.iconLink,
    size: f.size,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime
  }));
}

/**
 * Fetch a Google Drive file by ID and convert it to a local base64 Data URL
 * This ensures the image displays 100% reliably without third-party cookie or CORS blocking!
 */
export async function fetchDriveFileAsDataUrl(fileId: string): Promise<string> {
  const token = await ensureDriveAuth();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Gagal mengunduh file gambar dari Google Drive (Status ${res.status})`);
  }

  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload a document (logo, invoice, banner, design) to a specific Google Drive folder with % progress tracking
 */
export async function uploadDocumentToDriveFolder(
  file: File | Blob,
  fileName: string,
  folderId?: string,
  targetFolderCategory: TargetDriveCategory = 'general',
  onProgress?: (percent: number) => void
): Promise<{ id: string; viewUrl: string; name: string; folderId?: string }> {
  if (onProgress) onProgress(5);
  const token = await ensureDriveAuth();

  const recognizedCategories: string[] = [
    'desain_acc',
    'bukti_transfer_customer',
    'pembayaran_vendor',
    'file_po_vendor',
    'katalog_produk',
    'scan_nota',
    'logos',
    'banners',
    'invoices',
    'general'
  ];

  let effectiveCategory = targetFolderCategory;
  let targetParentId = folderId;

  // If caller accidentally passed a category name in folderId position
  if (folderId && recognizedCategories.includes(folderId)) {
    effectiveCategory = folderId as TargetDriveCategory;
    targetParentId = undefined;
  }

  // If specific folder ID wasn't provided, ensure category folder exists
  if (!targetParentId || targetParentId === 'default') {
    try {
      const parentRoot = await getOrCreateFolder('CTRL PRINT');
      const catInfo = getCategoryFolderInfo(effectiveCategory);
      const catFolder = await getOrCreateFolder(catInfo.folderName, parentRoot.id);
      targetParentId = catFolder.id;
    } catch (e) {
      console.warn('Could not create subfolder hierarchy, uploading to drive root:', e);
    }
  }

  // Metadata with folder parent
  const metadata: any = {
    name: fileName,
    mimeType: file.type || 'application/octet-stream'
  };

  if (targetParentId && targetParentId !== 'root') {
    metadata.parents = [targetParentId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  // Read binary as array buffer
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaHeaderPart = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\nContent-Transfer-Encoding: binary\r\n\r\n`;

  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(metadataPart);
  const mediaHeaderBytes = encoder.encode(mediaHeaderPart);
  const closeBytes = encoder.encode(closeDelim);

  const totalLength = metaBytes.length + mediaHeaderBytes.length + bytes.length + closeBytes.length;
  const body = new Uint8Array(totalLength);

  let offset = 0;
  body.set(metaBytes, offset);
  offset += metaBytes.length;
  body.set(mediaHeaderBytes, offset);
  offset += mediaHeaderBytes.length;
  body.set(bytes, offset);
  offset += bytes.length;
  body.set(closeBytes, offset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,parents');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

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
            viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
            folderId: targetParentId
          });
        } catch (e) {
          reject(new Error('Gagal memproses respon Google Drive.'));
        }
      } else {
        let errMsg = `Gagal mengupload file ke folder Google Drive (Status ${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error?.message) errMsg = errData.error.message;
        } catch (_) {}
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Terjadi kesalahan koneksi saat mengunggah ke Google Drive.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Waktu unggah ke Google Drive habis.'));
    };

    xhr.send(body);
  });
}

export { getGoogleAccessToken, requestGoogleAccessToken, clearGoogleAccessToken, uploadFileToDrive };

/**
 * Item result from scanning "Pembayaran Vendor" folder
 */
export interface DriveScannedVendorFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  detectedType: 'file_cetak' | 'bukti_bayar';
  detectedReason: string;
  matchedPoNo?: string;
  matchedVendor?: string;
}

export interface MoveFileResult {
  id: string;
  oldName: string;
  newName: string;
  success: boolean;
  error?: string;
}

/**
 * Scan files currently in "Pembayaran Vendor" and classify them
 */
export async function scanVendorPembayaranFiles(pos: any[]): Promise<{
  files: DriveScannedVendorFile[];
  pembayaranFolder: DriveFolderItem;
  fileCetakFolder: DriveFolderItem;
}> {
  const token = await ensureDriveAuth();
  const parentRoot = await getOrCreateFolder('CTRL PRINT');
  const pembayaranFolder = await getOrCreateFolder('Pembayaran Vendor', parentRoot.id);
  const fileCetakFolder = await getOrCreateFolder('File Cetak & PO Vendor', parentRoot.id);

  const query = `'${pembayaranFolder.id}' in parents and trashed = false`;
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=100&fields=files(id,name,mimeType,parents,size,createdTime,thumbnailLink,webViewLink)&orderBy=createdTime desc`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!listRes.ok) {
    const errData = await listRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Gagal membaca isi folder Pembayaran Vendor.');
  }

  const listData = await listRes.json();
  const rawFiles: any[] = listData.files || [];

  // Map known PO relations
  const poByDriveUrlId = new Map<string, any>();
  const poByBuktiBayarId = new Map<string, any>();

  for (const po of pos) {
    if (po.driveUrl) {
      const parsed = extractDriveFileId(po.driveUrl);
      if (parsed.id) poByDriveUrlId.set(parsed.id, po);
    }
    if (po.buktiBayarVendorUrl) {
      const parsed = extractDriveFileId(po.buktiBayarVendorUrl);
      if (parsed.id) poByBuktiBayarId.set(parsed.id, po);
    }
  }

  const classifiedFiles: DriveScannedVendorFile[] = rawFiles.map((file) => {
    const isDriveUrlMatch = poByDriveUrlId.get(file.id);
    const isBuktiMatch = poByBuktiBayarId.get(file.id);

    let detectedType: 'file_cetak' | 'bukti_bayar' = 'bukti_bayar';
    let detectedReason = 'Bukti pembayaran vendor';
    let matchedPoNo: string | undefined = undefined;
    let matchedVendor: string | undefined = undefined;

    if (isDriveUrlMatch) {
      detectedType = 'file_cetak';
      detectedReason = `Sesuai link File Cetak PO: ${isDriveUrlMatch.noPo} (${isDriveUrlMatch.vendor || '-'})`;
      matchedPoNo = isDriveUrlMatch.noPo;
      matchedVendor = isDriveUrlMatch.vendor;
    } else if (isBuktiMatch) {
      detectedType = 'bukti_bayar';
      detectedReason = `Sesuai link Bukti Bayar PO: ${isBuktiMatch.noPo} (${isBuktiMatch.vendor || '-'})`;
      matchedPoNo = isBuktiMatch.noPo;
      matchedVendor = isBuktiMatch.vendor;
    } else {
      // Fallback heuristics:
      // In print shops: PDF files, SVG, AI, PSD, CDR, TIFF are print design files!
      // Or names created from SPK like [VENDOR-PAY]_PO-2026_202609...
      const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isDesignFormat = /\.(pdf|cdr|ai|psd|tif|tiff|eps)$/i.test(file.name);
      const isUnmatchedArtPhoto = (file.size && file.size > 1500000) || (!file.name.includes('_000') && file.name.includes('PO-2026'));

      if (isPdf || isDesignFormat || isUnmatchedArtPhoto) {
        detectedType = 'file_cetak';
        detectedReason = isPdf ? 'Format berkas PDF cetak / SPK' : 'Format desain / artwork cetakan';
      } else {
        detectedType = 'bukti_bayar';
        detectedReason = 'Slip / bukti transfer pembayaran';
      }
    }

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? Number(file.size) : undefined,
      createdTime: file.createdTime,
      thumbnailLink: file.thumbnailLink,
      webViewLink: file.webViewLink,
      detectedType,
      detectedReason,
      matchedPoNo,
      matchedVendor
    };
  });

  return {
    files: classifiedFiles,
    pembayaranFolder,
    fileCetakFolder
  };
}

/**
 * Move selected files to "File Cetak & PO Vendor" folder and update prefix to [PO-CETAK]
 */
export async function movePrintFilesToVendorFolder(
  fileIds: string[],
  oldFolderId: string,
  targetFolderId: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ movedCount: number; results: MoveFileResult[] }> {
  const token = await ensureDriveAuth();
  const results: MoveFileResult[] = [];
  let movedCount = 0;

  for (let i = 0; i < fileIds.length; i++) {
    const fId = fileIds[i];
    try {
      // Get current file metadata (name & parents)
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fId}?fields=id,name,parents`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!metaRes.ok) {
        throw new Error('Gagal mengambil metadata file');
      }

      const meta = await metaRes.json();
      const currentParents: string[] = meta.parents || [oldFolderId];
      const oldName: string = meta.name || '';
      const newName: string = oldName.startsWith('[VENDOR-PAY]')
        ? oldName.replace(/^\[VENDOR-PAY\]/, '[PO-CETAK]')
        : oldName.startsWith('[PO-CETAK]')
        ? oldName
        : `[PO-CETAK]_${oldName}`;

      if (onProgress) {
        onProgress(i + 1, fileIds.length, oldName);
      }

      // Move parents and rename
      const patchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fId}?addParents=${targetFolderId}&removeParents=${currentParents.join(',')}&fields=id,name,parents`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newName
          })
        }
      );

      if (!patchRes.ok) {
        const errData = await patchRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Gagal memindahkan file');
      }

      // Ensure public read permissions
      await fetch(`https://www.googleapis.com/drive/v3/files/${fId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      }).catch(() => {});

      movedCount++;
      results.push({
        id: fId,
        oldName,
        newName,
        success: true
      });
    } catch (err: any) {
      results.push({
        id: fId,
        oldName: fId,
        newName: fId,
        success: false,
        error: err.message || 'Gagal dipindahkan'
      });
    }
  }

  return { movedCount, results };
}

