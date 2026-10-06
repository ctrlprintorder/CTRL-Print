import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Folder,
  FolderPlus,
  Search,
  RefreshCw,
  Check,
  Image as ImageIcon,
  FileText,
  Upload,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  listDriveFolders,
  listFilesInFolder,
  searchDriveFiles,
  fetchDriveFileAsDataUrl,
  uploadDocumentToDriveFolder,
  getOrCreateFolder,
  DriveFolderItem,
  DriveFileItem,
  ensureDriveAuth,
  getGoogleAccessToken,
  requestGoogleAccessToken
} from '../services/googleDriveService';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, fileInfo: DriveFileItem) => void;
  title?: string;
  targetPurpose?: 'logo' | 'qris' | 'banner' | 'product' | 'general';
  showToast: (msg: string, isErr?: boolean) => void;
}

function formatBytes(bytes?: string | number): string {
  if (!bytes) return '';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  title = 'Pilih Berkas dari Google Drive',
  targetPurpose = 'logo',
  showToast
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'images' | 'all'>('images');
  const [isProcessingSelection, setIsProcessingSelection] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkAuthAndLoad();
    }
  }, [isOpen]);

  const checkAuthAndLoad = async () => {
    const token = getGoogleAccessToken();
    if (token) {
      setIsConnected(true);
      loadFoldersAndFiles('all', searchQuery);
    } else {
      setIsConnected(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsLoading(true);
      showToast('Menghubungkan akun Google Drive...', false);
      const token = await requestGoogleAccessToken();
      if (token) {
        setIsConnected(true);
        showToast('🎉 Berhasil terhubung ke Google Drive!');
        loadFoldersAndFiles('all', searchQuery);
      }
    } catch (err: any) {
      console.error('Google connect error:', err);
      showToast(err.message || 'Gagal menghubungkan Google Drive.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFoldersAndFiles = async (folderId: string = selectedFolderId, search: string = searchQuery) => {
    setIsLoading(true);
    try {
      // Load folders
      const folderList = await listDriveFolders().catch(() => []);
      setFolders(folderList);

      // Load files
      let fileList: DriveFileItem[] = [];
      if (search.trim()) {
        fileList = await searchDriveFiles(search.trim(), filterType);
      } else {
        fileList = await listFilesInFolder(folderId === 'all' ? undefined : folderId, filterType);
      }
      setFiles(fileList);
    } catch (err: any) {
      console.error('Error loading drive files:', err);
      showToast(err.message || 'Gagal memuat berkas dari Google Drive.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFoldersAndFiles(selectedFolderId, searchQuery);
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    loadFoldersAndFiles(folderId, searchQuery);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      setIsCreatingFolder(true);
      const folder = await getOrCreateFolder(newFolderName.trim());
      setFolders((prev) => [folder, ...prev.filter((f) => f.id !== folder.id)]);
      setSelectedFolderId(folder.id);
      setNewFolderName('');
      showToast(`Folder "${folder.name}" berhasil dibuat!`);
      loadFoldersAndFiles(folder.id);
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat folder di Drive.', true);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSelectFile = async (file: DriveFileItem) => {
    try {
      setIsProcessingSelection(file.id);
      showToast(`Mengambil "${file.name}" dari Google Drive...`, false);

      // Fetch file content as base64 Data URL so it is completely self-contained and failsafe
      let resultUrl = '';
      try {
        resultUrl = await fetchDriveFileAsDataUrl(file.id);
      } catch (fetchErr) {
        console.warn('Direct fetch failed, falling back to direct CDN link:', fetchErr);
        // Fallback to high-speed CDN direct image link
        resultUrl = `https://lh3.googleusercontent.com/d/${file.id}`;
      }

      onSelectImage(resultUrl, file);
      showToast(`🎉 "${file.name}" berhasil diterapkan!`);
      onClose();
    } catch (err: any) {
      console.error('Error selecting file:', err);
      showToast(err.message || 'Gagal menerapkan berkas dari Google Drive.', true);
    } finally {
      setIsProcessingSelection(null);
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      showToast(`Mengunggah "${file.name}" ke Google Drive...`, false);
      const res = await uploadDocumentToDriveFolder(
        file,
        file.name,
        selectedFolderId === 'all' ? undefined : selectedFolderId,
        'logos'
      );
      showToast(`🎉 "${file.name}" berhasil diunggah ke Google Drive!`);
      loadFoldersAndFiles(selectedFolderId, searchQuery);
    } catch (err: any) {
      console.error('Quick upload error:', err);
      showToast(err.message || 'Gagal mengunggah file ke Google Drive.', true);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-main)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(15, 157, 88, 0.12)',
                color: '#0F9D58',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HardDrive size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Jelajahi dan pilih gambar/berkas langsung dari Google Drive Anda
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Not Connected State */}
        {!isConnected ? (
          <div
            style={{
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '14px'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(15, 157, 88, 0.1)',
                color: '#0F9D58',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HardDrive size={32} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Hubungkan Google Drive Anda
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
                Akses file logo, QRIS, banner, dan dokumen langsung dari Google Drive toko Anda untuk diterapkan dengan satu klik.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConnectGoogle}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)',
                color: '#FFF',
                border: 'none',
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <HardDrive size={16} />}
              <span>{isLoading ? 'Menghubungkan...' : 'Hubungkan Akun Google Drive'}</span>
            </button>
          </div>
        ) : (
          /* Connected State: Controls & File Grid */
          <>
            {/* Toolbar Controls */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Search input */}
                <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '200px', display: 'flex', position: 'relative' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama file (cth: logo, qris, banner)..."
                    style={{
                      width: '100%',
                      padding: '7px 32px 7px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    <Search size={14} />
                  </button>
                </form>

                {/* Folder Selector */}
                <select
                  value={selectedFolderId}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    maxWidth: '180px'
                  }}
                >
                  <option value="all">📁 Semua Folder di Drive</option>
                  <option value="root">📁 My Drive (Root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📂 {f.name}
                    </option>
                  ))}
                </select>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => loadFoldersAndFiles(selectedFolderId, searchQuery)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '11px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Muat ulang daftar file"
                >
                  <RefreshCw size={12} className={isLoading ? 'spin' : ''} /> Refresh
                </button>

                {/* Quick Upload directly to Drive */}
                <label
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)',
                    border: 'none',
                    color: '#FFF',
                    cursor: isUploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isUploading ? <Loader2 size={12} className="spin" /> : <Upload size={12} />}
                  <span>{isUploading ? 'Mengunggah...' : 'Upload ke Drive'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleQuickUpload}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('images');
                    loadFoldersAndFiles(selectedFolderId, searchQuery);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: filterType === 'images' ? '#0F9D58' : 'var(--border-color)',
                    background: filterType === 'images' ? 'rgba(15, 157, 88, 0.12)' : 'transparent',
                    color: filterType === 'images' ? '#0F9D58' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  🖼️ Hanya Gambar & Logo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('all');
                    loadFoldersAndFiles(selectedFolderId, searchQuery);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: filterType === 'all' ? 'var(--primary)' : 'var(--border-color)',
                    background: filterType === 'all' ? 'rgba(0, 82, 255, 0.1)' : 'transparent',
                    color: filterType === 'all' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  📁 Semua Jenis File
                </button>
              </div>
            </div>

            {/* File List Grid Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                background: 'var(--bg-main)',
                minHeight: '320px',
                maxHeight: '520px'
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '10px' }}>
                  <Loader2 size={32} className="spin" style={{ color: '#0F9D58' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Memuat berkas dari Google Drive...
                  </span>
                </div>
              ) : files.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '8px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Folder size={24} />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Tidak ada file ditemukan
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', maxWidth: '320px' }}>
                    {searchQuery ? `Tidak ada file cocok dengan "${searchQuery}". Coba kata kunci lain.` : 'Folder ini belum memiliki file gambar. Anda dapat mengunggah file langsung menggunakan tombol di atas.'}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {files.map((file) => {
                    const isImg = file.mimeType?.includes('image');
                    const isSelectingThis = isProcessingSelection === file.id;

                    return (
                      <div
                        key={file.id}
                        style={{
                          background: 'var(--bg-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.15s ease',
                          boxShadow: 'var(--shadow-xs)'
                        }}
                      >
                        {/* Thumbnail / Icon Container */}
                        <div
                          style={{
                            height: '110px',
                            background: '#F8FAFC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            borderBottom: '1px solid var(--border-color)'
                          }}
                        >
                          {isImg ? (
                            <img
                              src={`https://lh3.googleusercontent.com/d/${file.id}`}
                              alt={file.name}
                              referrerPolicy="no-referrer"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                padding: '4px'
                              }}
                              onError={(e) => {
                                // Fallback icon on image error
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FileText size={32} color="#0F9D58" />
                          )}

                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(255, 255, 255, 0.85)',
                              backdropFilter: 'blur(2px)',
                              borderRadius: '6px',
                              padding: '3px',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Buka di Google Drive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        {/* File Meta & Action */}
                        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <div
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </div>

                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{formatBytes(file.size)}</span>
                            <span>{file.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                          </div>

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={!!isProcessingSelection}
                            onClick={() => handleSelectFile(file)}
                            style={{
                              marginTop: 'auto',
                              fontSize: '11px',
                              padding: '5px 8px',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              background: isSelectingThis ? '#94A3B8' : 'var(--primary)',
                              border: 'none',
                              color: '#FFF',
                              fontWeight: 700,
                              borderRadius: '6px'
                            }}
                          >
                            {isSelectingThis ? (
                              <>
                                <Loader2 size={12} className="spin" /> Memproses...
                              </>
                            ) : (
                              <>
                                <Check size={12} /> Pilih File Ini
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}
            >
              <span>
                💡 File yang dipilih akan disalin & dioptimasi otomatis ke aplikasi agar tahan gangguan koneksi.
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onClose}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
