import React from 'react';
import { ExternalLink, FolderKanban, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { getDriveInfo } from '../utils/googleDrive';

interface GoogleDrivePreviewEmbedProps {
  url?: string;
  fileId?: string;
  title?: string;
  height?: string | number;
  showFallbackButton?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function GoogleDrivePreviewEmbed({
  url,
  fileId,
  title = 'Pratinjau File Google Drive',
  height = '360px',
  showFallbackButton = true,
  emptyMessage = 'Belum ada link Google Drive yang dilampirkan.',
  className = ''
}: GoogleDrivePreviewEmbedProps) {
  const driveInfo = getDriveInfo(fileId ? `https://drive.google.com/file/d/${fileId}/view` : url);
  const activeFileId = fileId || driveInfo.drive_file_id;
  const embedSrc = activeFileId 
    ? `https://drive.google.com/file/d/${activeFileId}/preview` 
    : driveInfo.drive_embed_url;
  const viewLink = activeFileId 
    ? `https://drive.google.com/file/d/${activeFileId}/view` 
    : driveInfo.drive_view_url;

  if (!driveInfo.isValid && !activeFileId) {
    return (
      <div
        className={className}
        style={{
          background: 'var(--bg-main, #0F172A)',
          borderRadius: '12px',
          padding: '30px 16px',
          textAlign: 'center',
          color: '#94A3B8',
          border: '1px dashed rgba(255,255,255,0.15)',
          minHeight: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <FolderKanban size={38} style={{ opacity: 0.4, color: '#0052FF' }} />
        <h4 style={{ color: '#F8FAFC', fontSize: '13.5px', fontWeight: 700, margin: 0 }}>
          {emptyMessage}
        </h4>
        <p style={{ fontSize: '11.5px', color: '#64748B', maxWidth: '380px', margin: 0, lineHeight: 1.4 }}>
          Admin atau Desainer dapat menempelkan URL share Google Drive untuk menampilkan pratinjau langsung di sini.
        </p>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#0F172A',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Embedded Iframe Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: '220px',
          maxHeight: '75vh',
          background: '#000',
          boxSizing: 'border-box'
        }}
      >
        <iframe
          src={embedSrc}
          title={title}
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block', width: '100%', height: '100%' }}
          allow="autoplay"
        />
      </div>

      {/* Fallback & External Link Bar */}
      {showFallbackButton && viewLink && (
        <div
          style={{
            padding: '8px 14px',
            background: '#1E293B',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '11px', minWidth: 0, flexShrink: 1 }}>
            <span style={{ display: 'inline-flex', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ID: <code style={{ color: '#60A5FA', background: 'rgba(59,130,246,0.15)', padding: '1px 5px', borderRadius: '4px' }}>{activeFileId || 'Drive Link'}</code>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <a
              href={viewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '6px',
                background: '#0052FF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={12} /> Buka di Google Drive
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
