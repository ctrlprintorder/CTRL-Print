/**
 * Google Drive URL Parser and Embed Generator Utility
 * 
 * Extracts Google Drive File ID and constructs standardized:
 * - drive_file_id
 * - drive_view_url: 'https://drive.google.com/file/d/{fileId}/view'
 * - drive_embed_url: 'https://drive.google.com/file/d/{fileId}/preview'
 */

export interface GoogleDriveInfo {
  drive_file_id: string | null;
  drive_view_url: string;
  drive_embed_url: string;
  isValid: boolean;
  isFolder: boolean;
  rawInput: string;
}

/**
 * Extracts Google Drive File / Folder ID from any Google Drive URL format or raw ID.
 */
export function extractDriveFileId(input: string | undefined | null): { id: string | null; isFolder: boolean } {
  if (!input || typeof input !== 'string') {
    return { id: null, isFolder: false };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { id: null, isFolder: false };
  }

  // 1. Folder patterns
  const folderMatches = [
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]{10,})/i,
    /drive\.google\.com\/folderview\?id=([a-zA-Z0-9_-]{10,})/i,
    /drive\.google\.com\/embeddedfolderview\?id=([a-zA-Z0-9_-]{10,})/i
  ];

  for (const regex of folderMatches) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return { id: match[1], isFolder: true };
    }
  }

  // 2. File patterns
  const fileMatches = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{10,})/i,
    /drive\.google\.com\/uc\?(?:export=[^&]+&)?id=([a-zA-Z0-9_-]{10,})/i,
    /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]{10,})/i
  ];

  for (const regex of fileMatches) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return { id: match[1], isFolder: false };
    }
  }

  // 3. Direct ID input (standard Google Drive IDs are usually 25 to 50 alphanumeric characters with _ -)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return { id: trimmed, isFolder: false };
  }

  return { id: null, isFolder: false };
}

/**
 * Parses any Google Drive URL or ID and returns structured object with:
 * drive_file_id, drive_view_url, drive_embed_url
 */
export function getDriveInfo(input: string | undefined | null): GoogleDriveInfo {
  if (!input || typeof input !== 'string') {
    return {
      drive_file_id: null,
      drive_view_url: '',
      drive_embed_url: '',
      isValid: false,
      isFolder: false,
      rawInput: ''
    };
  }

  const rawInput = input.trim();
  const { id, isFolder } = extractDriveFileId(rawInput);

  if (id) {
    if (isFolder) {
      return {
        drive_file_id: id,
        drive_view_url: `https://drive.google.com/drive/folders/${id}`,
        drive_embed_url: `https://drive.google.com/embeddedfolderview?id=${id}#grid`,
        isValid: true,
        isFolder: true,
        rawInput
      };
    }

    return {
      drive_file_id: id,
      drive_view_url: `https://drive.google.com/file/d/${id}/view`,
      drive_embed_url: `https://drive.google.com/file/d/${id}/preview`,
      isValid: true,
      isFolder: false,
      rawInput
    };
  }

  // If not a standard Google Drive link, but valid web link
  const isWebUrl = rawInput.startsWith('http://') || rawInput.startsWith('https://');
  return {
    drive_file_id: null,
    drive_view_url: rawInput,
    drive_embed_url: rawInput,
    isValid: isWebUrl,
    isFolder: false,
    rawInput
  };
}

/**
 * Compatibility helper for existing components
 */
export function parseGoogleDriveUrl(url: string | undefined | null) {
  const info = getDriveInfo(url);
  return {
    isValid: info.isValid,
    isRealDriveId: !!info.drive_file_id,
    fileId: info.drive_file_id,
    directImageUrl: '',
    previewIframeUrl: info.drive_embed_url,
    viewUrl: info.drive_view_url,
    isFolder: info.isFolder
  };
}
