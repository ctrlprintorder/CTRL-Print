import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Check,
  ExternalLink,
  X,
  Search,
  Link as LinkIcon,
  Copy,
  AlertCircle,
  Folder,
  FileCheck2,
  Upload
} from 'lucide-react';
import { getDriveInfo, GoogleDriveInfo } from '../utils/googleDrive';
import { GoogleDrivePreviewEmbed } from './GoogleDrivePreviewEmbed';
import { uploadFileSmart, TargetDriveCategory, getCategoryFolderInfo } from '../lib/googleWorkspace';
import { GoogleDriveUploadProgress, UploadProgressInfo } from './GoogleDriveUploadProgress';

interface GoogleDriveUploaderProps {
  currentUrl?: string;
  driveFileId?: string;
  driveViewUrl?: string;
  driveEmbedUrl?: string;
  onUrlGenerated: (
    url: string,
    meta?: {
      drive_file_id?: string;
      drive_view_url?: string;
      drive_embed_url?: string;
    }
  ) => void;
  label?: string;
  invoiceNo?: string;
  customerName?: string;
  contextCategory?: TargetDriveCategory;
  showToast?: (msg: string, isErr?: boolean) => void;
  showPreview?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function GoogleDriveUploader({
  currentUrl = '',
  driveFileId = '',
  driveViewUrl = '',
  driveEmbedUrl = '',
  onUrlGenerated,
  label = 'Lampiran & Link Google Drive',
  invoiceNo,
  customerName,
  contextCategory,
  showToast,
  showPreview = true
}: GoogleDriveUploaderProps) {
  // Use either currentUrl or driveViewUrl or driveEmbedUrl or driveFileId as initial input
  const initialLink = currentUrl || driveViewUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : '');
  const [inputUrl, setInputUrl] = useState(initialLink);
  const [driveInfo, setDriveInfo] = useState<GoogleDriveInfo>(() => getDriveInfo(initialLink));
  const [copied, setCopied] = useState(false);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const catInfo = getCategoryFolderInfo(contextCategory);

  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo>({
    status: 'idle',
    percent: 0,
    fileName: ''
  });

  useEffect(() => {
    const active = currentUrl || driveViewUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : '');
    setInputUrl(active);
    setDriveInfo(getDriveInfo(active));
  }, [currentUrl, driveViewUrl, driveFileId]);

  const handleInputChange = (val: string) => {
    setInputUrl(val);
    const parsed = getDriveInfo(val);
    setDriveInfo(parsed);

    if (parsed.isValid) {
      onUrlGenerated(parsed.drive_view_url || val, {
        drive_file_id: parsed.drive_file_id || undefined,
        drive_view_url: parsed.drive_view_url || undefined,
        drive_embed_url: parsed.drive_embed_url || undefined
      });
    } else if (!val.trim()) {
      onUrlGenerated('', {
        drive_file_id: undefined,
        drive_view_url: undefined,
        drive_embed_url: undefined
      });
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setDriveInfo(getDriveInfo(''));
    setUploadProgress({ status: 'idle', percent: 0, fileName: '' });
    onUrlGenerated('', {
      drive_file_id: undefined,
      drive_view_url: undefined,
      drive_embed_url: undefined
    });
    if (showToast) showToast('Link Google Drive dihapus.');
  };

  const [isUploading, setIsUploading] = useState(false);

  const executeUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setLastSelectedFile(file);
      setUploadProgress({
        status: 'uploading',
        percent: 5,
        fileName: file.name,
        fileSize: formatBytes(file.size)
      });

      if (showToast) showToast(`Mengunggah "${file.name}" ke Google Drive...`, false);

      const safePrefix = (invoiceNo || customerName || 'Doc').replace(/[^a-zA-Z0-9-_]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uploadFileName = `${safePrefix}_${timestamp}_${file.name}`;

      const uploaded = await uploadFileSmart(file, uploadFileName, {
        invoiceNo,
        customerName,
        category: contextCategory,
        onProgress: (pct) => {
          setUploadProgress(prev => ({
            ...prev,
            status: 'uploading',
            percent: pct
          }));
        }
      });

      setUploadProgress({
        status: 'success',
        percent: 100,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        viewUrl: uploaded.viewUrl
      });

      handleInputChange(uploaded.viewUrl);
      if (showToast) showToast(`🎉 Berhasil upload file ke folder: CTRL PRINT / ${catInfo.folderName}!`);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setUploadProgress({
        status: 'error',
        percent: 0,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        errorMessage: err.message || 'Gagal upload file ke Google Drive.'
      });
      if (showToast) showToast(err.message || 'Gagal upload file.', true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBrowseUploadDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executeUpload(file);
    e.target.value = '';
  };

  const handleRetryUpload = () => {
    if (lastSelectedFile) {
      executeUpload(lastSelectedFile);
    }
  };

  const handleCopyLink = () => {
    if (driveInfo.drive_view_url || inputUrl) {
      navigator.clipboard.writeText(driveInfo.drive_view_url || inputUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (showToast) showToast('✅ Link Google Drive disalin ke clipboard!');
    }
  };

  // Google Drive Search & Home shortcuts
  const searchKeywords = invoiceNo || customerName || 'CTRLPRINT';
  const directDriveWebUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(searchKeywords)}`;
  const driveHomeUrl = 'https://drive.google.com/drive/u/0/my-drive';

  return (
    <div
      style={{
        background: 'var(--bg-main, #F8FAFC)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '14px'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)' }}>{label}</strong>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📁 CTRL PRINT / {catInfo.folderName}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
              Upload langsung / tempelkan link Google Drive
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <label
            className="btn btn-primary btn-sm"
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              opacity: isUploading ? 0.7 : 1,
              background: 'linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)',
              border: 'none',
              color: '#FFF'
            }}
          >
            <Upload size={13} />
            <span>{isUploading ? 'Mengunggah...' : '📁 Browse File ke Drive'}</span>
            <input
              type="file"
              accept="image/*,.pdf,.zip,.rar,.cdr,.ai,.psd,.tiff"
              onChange={handleBrowseUploadDirect}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
          <a
            href={directDriveWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', color: '#2563EB', borderColor: '#BFDBFE', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Cari berkas di Google Drive"
          >
            <Search size={12} /> Buka Drive
          </a>
          <a
            href={driveHomeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', color: '#475569', borderColor: '#CBD5E1', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Buka My Drive"
          >
            <Folder size={12} /> My Drive
          </a>
        </div>
      </div>

      {/* Upload Progress & Status Bar */}
      <GoogleDriveUploadProgress
        info={uploadProgress}
        onRetry={handleRetryUpload}
        onDismiss={() => setUploadProgress({ status: 'idle', percent: 0, fileName: '' })}
      />

      {/* Main Input Text Field */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '12px', color: '#94A3B8', pointerEvents: 'none' }}>
            <LinkIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Contoh: https://drive.google.com/file/d/1ABC123xyz.../view?usp=sharing"
            value={inputUrl}
            onChange={(e) => handleInputChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 38px 10px 36px',
              fontSize: '13px',
              borderRadius: '8px',
              border: driveInfo.isValid ? '1.5px solid #10B981' : '1px solid var(--border-color, #CBD5E1)',
              background: 'var(--bg-card, #FFFFFF)',
              color: 'var(--text-main, #0F172A)'
            }}
          />
          {inputUrl && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Hapus URL"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Drive Status Badge & ID Extraction Details */}
      {inputUrl && (
        <div
          style={{
            marginBottom: '14px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: driveInfo.isValid ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${driveInfo.isValid ? '#BBF7D0' : '#FECACA'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {driveInfo.isValid ? (
              <Check size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: driveInfo.isValid ? '#15803D' : '#991B1B' }}>
                {driveInfo.isValid
                  ? (driveInfo.isFolder ? '📁 Folder Google Drive Terdeteksi' : '📄 File Google Drive Valid & Siap ACC')
                  : 'Link tidak dikenali sebagai URL Google Drive'}
              </div>
              {driveInfo.drive_file_id && (
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  ID Berkas: <code style={{ fontWeight: 700, background: '#DCFCE7', padding: '1px 5px', borderRadius: '4px' }}>{driveInfo.drive_file_id}</code>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {driveInfo.isValid && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', color: '#15803D', borderColor: '#86EFAC', background: '#FFF' }}
                >
                  <Copy size={11} /> {copied ? 'Tersalin!' : 'Salin'}
                </button>
                <a
                  href={driveInfo.drive_view_url || inputUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={11} /> Buka Tab Baru
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Embedded Live Iframe Preview (Responsive Height) */}
      {showPreview && driveInfo.isValid && (
        <div style={{ marginTop: '10px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck2 size={13} style={{ color: '#10B981' }} /> Pratinjau Berkas Drive:
          </div>
          <GoogleDrivePreviewEmbed
            url={driveInfo.drive_view_url || inputUrl}
            fileId={driveInfo.drive_file_id || undefined}
            height="320px"
            showFallbackButton={true}
          />
        </div>
      )}
    </div>
  );
}
