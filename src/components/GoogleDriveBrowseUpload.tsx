import React, { useState, useEffect } from 'react';
import {
  Upload,
  Folder,
  FolderPlus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Link,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import {
  listDriveFolders,
  uploadDocumentToDriveFolder,
  getOrCreateFolder,
  listFilesInFolder,
  DriveFolderItem,
  DriveFileItem,
  TargetDriveCategory,
  ensureDriveAuth,
  getGoogleAccessToken
} from '../services/googleDriveService';
import { getCategoryFolderInfo } from '../lib/googleWorkspace';
import { GoogleDriveUploadProgress, UploadProgressInfo } from './GoogleDriveUploadProgress';

export interface DriveBrowseUploadProps {
  onUploaded?: (fileUrl: string, fileInfo: { id: string; name: string; folderId?: string }) => void;
  showToast: (msg: string, isErr?: boolean) => void;
  targetCategory?: TargetDriveCategory;
  defaultFolderName?: string;
  allowSetAsLogo?: (url: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const GoogleDriveBrowseUpload: React.FC<DriveBrowseUploadProps> = ({
  onUploaded,
  showToast,
  targetCategory,
  defaultFolderName,
  allowSetAsLogo
}) => {
  const effectiveCategory: TargetDriveCategory = targetCategory ?? 'general';
  const catInfo = getCategoryFolderInfo(effectiveCategory);
  const resolvedDefaultName = defaultFolderName || `CTRL PRINT / ${catInfo.folderName}`;
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('default');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [recentFiles, setRecentFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [lastUploaded, setLastUploaded] = useState<{ name: string; url: string; folderId?: string } | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo>({
    status: 'idle',
    percent: 0,
    fileName: ''
  });

  useEffect(() => {
    const token = getGoogleAccessToken();
    setIsConnected(!!token);
    if (token) {
      loadFolders();
    }
  }, []);

  const loadFolders = async () => {
    try {
      setIsLoadingFolders(true);
      const list = await listDriveFolders();
      setFolders(list);
    } catch (err: any) {
      console.warn('Could not load folders:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const loadRecentFiles = async (folderId?: string) => {
    try {
      setIsLoadingFiles(true);
      const files = await listFilesInFolder(folderId === 'default' ? undefined : folderId);
      setRecentFiles(files);
    } catch (err: any) {
      console.warn('Could not load recent files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      setIsCreatingFolder(true);
      showToast(`Membuat folder "${newFolderName.trim()}" di Google Drive...`, false);
      const created = await getOrCreateFolder(newFolderName.trim());
      setFolders(prev => [created, ...prev.filter(f => f.id !== created.id)]);
      setSelectedFolderId(created.id);
      setNewFolderName('');
      showToast(`Folder "${created.name}" berhasil dibuat & dipilih!`);
    } catch (err: any) {
      console.error('Error creating folder:', err);
      showToast(err.message || 'Gagal membuat folder Google Drive', true);
    } finally {
      setIsCreatingFolder(false);
    }
  };

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
      showToast(`Mengupload "${file.name}" ke Google Drive...`, false);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = file.name.replace(/\s+/g, '_');
      const uploadFileName = `${effectiveCategory.toUpperCase()}_${timestamp}_${safeName}`;

      const res = await uploadDocumentToDriveFolder(
        file,
        uploadFileName,
        selectedFolderId === 'default' ? undefined : selectedFolderId,
        effectiveCategory,
        (pct) => {
          setUploadProgress(prev => ({
            ...prev,
            status: 'uploading',
            percent: pct
          }));
        }
      );

      setUploadProgress({
        status: 'success',
        percent: 100,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        viewUrl: res.viewUrl
      });

      setLastUploaded({
        name: file.name,
        url: res.viewUrl,
        folderId: res.folderId
      });
      setIsConnected(true);

      if (onUploaded) {
        onUploaded(res.viewUrl, res);
      }

      showToast(`🎉 "${file.name}" berhasil diunggah langsung ke Google Drive!`);
      loadRecentFiles(selectedFolderId);
    } catch (err: any) {
      console.error('Upload to Drive error:', err);
      setUploadProgress({
        status: 'error',
        percent: 0,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        errorMessage: err.message || 'Gagal mengupload berkas ke Google Drive.'
      });
      showToast(err.message || 'Gagal mengupload dokumen ke Google Drive.', true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div
      style={{
        background: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(15, 157, 88, 0.12)',
              color: '#0F9D58',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HardDrive size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>
              Browse & Upload Dokumen ke Google Drive
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Unggah logo, nota invoice, atau berkas cetak langsung ke folder tujuan di Google Drive Anda
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a
            href={
              selectedFolderId === 'default' || !selectedFolderId
                ? 'https://drive.google.com/drive/search?q=' + encodeURIComponent('name="CTRL PRINT"')
                : selectedFolderId === 'root'
                ? 'https://drive.google.com/drive/my-drive'
                : `https://drive.google.com/drive/folders/${selectedFolderId}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-xs"
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <ExternalLink size={11} /> Buka Google Drive
          </a>
          <button
            type="button"
            onClick={() => {
              loadFolders();
              loadRecentFiles(selectedFolderId);
            }}
            className="btn btn-outline btn-xs"
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={11} className={isLoadingFolders ? 'spin' : ''} /> Refresh Folder
          </button>
        </div>
      </div>

      {/* Target Folder Selector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 1fr) auto',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '14px',
          background: 'var(--bg-card)',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}
      >
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Folder size={13} color="#0F9D58" /> Folder Tujuan di Google Drive:
          </label>
          <select
            value={selectedFolderId}
            onChange={(e) => {
              setSelectedFolderId(e.target.value);
              loadRecentFiles(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <option value="default">📁 Folder Bawaan: {resolvedDefaultName}</option>
            <option value="root">📁 My Drive (Root Utama)</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>
                📂 {f.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="+ Nama folder baru..."
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '11px',
              width: '140px',
              background: 'var(--bg-main)'
            }}
          />
          <button
            type="button"
            onClick={handleCreateNewFolder}
            disabled={isCreatingFolder || !newFolderName.trim()}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '11px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <FolderPlus size={13} /> {isCreatingFolder ? 'Membuat...' : 'Buat'}
          </button>
        </div>
      </div>

      {/* Upload Button Area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px dashed #0F9D58'
        }}
      >
        <label
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)',
            border: 'none',
            color: '#FFF',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px'
          }}
        >
          <Upload size={14} />
          <span>{isUploading ? 'Sedang Mengunggah...' : '📁 Browse & Upload Dokumen'}</span>
          <input
            type="file"
            accept="image/*,application/pdf,.cdr,.ai,.psd,.zip,.rar,.xlsx,.docx"
            onChange={handleFileUpload}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
        </label>

        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          Mendukung format gambar (PNG/JPG logo), PDF faktur/invoice, CDR, AI, ZIP.
        </span>
      </div>

      {/* Upload Progress & Status Bar */}
      <GoogleDriveUploadProgress
        info={uploadProgress}
        onRetry={handleRetryUpload}
        onDismiss={() => setUploadProgress({ status: 'idle', percent: 0, fileName: '' })}
      />

      {/* Success Notification Card */}
      {lastUploaded && (
        <div
          style={{
            marginTop: '12px',
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#16A34A" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                {lastUploaded.name} berhasil tersimpan di Google Drive!
              </div>
              <div style={{ fontSize: '11px', color: '#15803D' }}>
                Link Drive: <a href={lastUploaded.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0052FF', textDecoration: 'underline' }}>Buka Dokumen</a>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {allowSetAsLogo && (
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => allowSetAsLogo(lastUploaded.url)}
                style={{ fontSize: '11px', padding: '4px 10px', background: '#FFF', color: '#0052FF', borderColor: '#0052FF' }}
              >
                Gunakan Sebagai Logo Toko
              </button>
            )}
            <a
              href={lastUploaded.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-xs"
              style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <ExternalLink size={12} /> Buka di Google Drive
            </a>
          </div>
        </div>
      )}

      {/* Recent Drive Files List */}
      {recentFiles.length > 0 && (
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={13} /> Dokumen Terbaru di Folder Ini ({recentFiles.length} file):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
            {recentFiles.map(file => (
              <a
                key={file.id}
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  textDecoration: 'none',
                  color: 'inherit',
                  fontSize: '11.5px'
                }}
              >
                {file.mimeType?.includes('image') ? (
                  <ImageIcon size={14} color="#0052FF" />
                ) : (
                  <FileText size={14} color="#0F9D58" />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 600 }}>
                  {file.name}
                </span>
                <ExternalLink size={11} color="var(--text-muted)" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
