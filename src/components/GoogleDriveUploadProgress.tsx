import React from 'react';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink, HardDrive } from 'lucide-react';

export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadProgressInfo {
  status: UploadState;
  percent: number;
  fileName: string;
  fileSize?: string;
  errorMessage?: string;
  viewUrl?: string;
}

interface GoogleDriveUploadProgressProps {
  info: UploadProgressInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const GoogleDriveUploadProgress: React.FC<GoogleDriveUploadProgressProps> = ({
  info,
  onRetry,
  onDismiss
}) => {
  if (info.status === 'idle') return null;

  const isUploading = info.status === 'uploading';
  const isSuccess = info.status === 'success';
  const isError = info.status === 'error';

  return (
    <div
      style={{
        marginTop: '10px',
        marginBottom: '10px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: isSuccess
          ? '1.5px solid #86EFAC'
          : isError
          ? '1.5px solid #FCA5A5'
          : '1.5px solid #93C5FD',
        background: isSuccess
          ? '#F0FDF4'
          : isError
          ? '#FEF2F2'
          : '#EFF6FF',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isUploading && (
            <div style={{ color: '#2563EB', animation: 'spin 1.5s linear infinite', display: 'flex' }}>
              <RefreshCw size={16} />
            </div>
          )}
          {isSuccess && (
            <div style={{ color: '#16A34A', display: 'flex' }}>
              <CheckCircle2 size={18} />
            </div>
          )}
          {isError && (
            <div style={{ color: '#DC2626', display: 'flex' }}>
              <AlertCircle size={18} />
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: isSuccess ? '#15803D' : isError ? '#991B1B' : '#1D4ED8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {isUploading && `Mengunggah: ${info.fileName}`}
              {isSuccess && `Berhasil Diunggah ke Google Drive: ${info.fileName}`}
              {isError && `Gagal Mengunggah: ${info.fileName}`}
            </div>
            {info.fileSize && (
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748B)', marginTop: '1px' }}>
                Ukuran berkas: {info.fileSize}
              </div>
            )}
          </div>
        </div>

        {/* Right Info / Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {isUploading && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#2563EB',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {info.percent}%
            </span>
          )}

          {isSuccess && info.viewUrl && (
            <a
              href={info.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-xs"
              style={{
                fontSize: '10.5px',
                padding: '3px 8px',
                color: '#15803D',
                borderColor: '#86EFAC',
                background: '#FFF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                textDecoration: 'none',
                fontWeight: 700
              }}
            >
              <ExternalLink size={11} /> Buka Drive
            </a>
          )}

          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-outline btn-xs"
              style={{
                fontSize: '10.5px',
                padding: '3px 8px',
                color: '#DC2626',
                borderColor: '#FCA5A5',
                background: '#FFF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 700
              }}
            >
              <RefreshCw size={11} /> Coba Lagi
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Line */}
      <div
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '999px',
          background: isSuccess ? '#BBF7D0' : isError ? '#FECACA' : '#DBEAFE',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${isError ? 100 : Math.max(info.percent, 5)}%`,
            borderRadius: '999px',
            background: isSuccess
              ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
              : isError
              ? '#EF4444'
              : 'linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)',
            transition: 'width 0.25s ease-out'
          }}
        />
      </div>

      {/* Status Details / Error Text */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <div style={{ fontSize: '11px', color: isSuccess ? '#166534' : isError ? '#991B1B' : '#1E40AF' }}>
          {isUploading && (
            <span>
              {info.percent < 30 && 'Menyiapkan berkas & menghubungkan ke Google Drive...'}
              {info.percent >= 30 && info.percent < 90 && `Mentransfer data ke Google Drive (${info.percent}%)...`}
              {info.percent >= 90 && 'Menyimpan & memproses izin akses file Google Drive...'}
            </span>
          )}
          {isSuccess && '✅ Berkas tersimpan dengan aman & terhubung ke Google Drive'}
          {isError && (info.errorMessage || 'Gagal mengunggah berkas. Periksa koneksi internet Anda.')}
        </div>

        <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <HardDrive size={11} /> Google Drive Cloud Sync
        </div>
      </div>
    </div>
  );
};
