import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  CloudCheck,
  RotateCw
} from 'lucide-react';
import {
  subscribeSyncStatus,
  getSyncStatus,
  forceSyncRetry,
  SyncStatusInfo
} from '../firebaseService';

interface SyncStatusBadgeProps {
  showDetails?: boolean;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ showDetails = true, compact = false }) => {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>(getSyncStatus());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeSyncStatus((info) => {
      setSyncInfo(info);
    });
    return () => unsub();
  }, []);

  // Click Outside Handler
  useEffect(() => {
    if (!popoverOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [popoverOpen]);

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      await forceSyncRetry();
    } catch (err) {
      console.error('Manual retry error:', err);
    } finally {
      setTimeout(() => setIsRetrying(false), 600);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Belum pernah';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Minimalist Silent Indicator Configuration
  let dotColor = '#16A34A';
  let dotGlow = 'rgba(22, 163, 74, 0.4)';
  let badgeBg = '#F0FDF4';
  let badgeBorder = '#DCFCE7';
  let badgeText = '#15803D';
  let labelText = 'Online';
  let isPulsing = false;

  if (syncInfo.status === 'syncing' || isRetrying) {
    dotColor = '#2563EB';
    dotGlow = 'rgba(37, 99, 235, 0.4)';
    badgeBg = '#EFF6FF';
    badgeBorder = '#DBEAFE';
    badgeText = '#1D4ED8';
    labelText = syncInfo.pendingCount > 0 ? `Sync (${syncInfo.pendingCount})` : 'Syncing...';
    isPulsing = true;
  } else if (syncInfo.status === 'offline' || syncInfo.isOffline) {
    dotColor = '#D97706';
    dotGlow = 'rgba(217, 119, 6, 0.4)';
    badgeBg = '#FFFBEB';
    badgeBorder = '#FEF3C7';
    badgeText = '#B45309';
    labelText = 'Offline';
  } else if (syncInfo.status === 'error') {
    dotColor = '#DC2626';
    dotGlow = 'rgba(220, 38, 38, 0.4)';
    badgeBg = '#FEF2F2';
    badgeBorder = '#FEE2E2';
    badgeText = '#B91C1C';
    labelText = 'Sync Error';
  } else if (syncInfo.status === 'connecting') {
    dotColor = '#64748B';
    dotGlow = 'rgba(100, 116, 139, 0.4)';
    badgeBg = '#F8FAFC';
    badgeBorder = '#E2E8F0';
    badgeText = '#475569';
    labelText = 'Connecting...';
    isPulsing = true;
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (showDetails) setPopoverOpen((prev) => !prev);
        }}
        style={{
          fontSize: compact ? '10px' : '11px',
          fontWeight: 700,
          color: badgeText,
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          padding: compact ? '2px 8px' : '3px 9px',
          borderRadius: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          cursor: showDetails ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
          outline: 'none',
          userSelect: 'none',
          lineHeight: '1.2'
        }}
        title="Klik untuk melihat detail koneksi Cloud Database (Firestore)"
      >
        {/* Minimalist Status Dot */}
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: `0 0 5px ${dotGlow}`,
            display: 'inline-block',
            flexShrink: 0,
            animation: isPulsing ? 'pulse-dot 1.2s infinite ease-in-out' : 'none'
          }}
        />
        <span>{labelText}</span>
      </button>

      {/* Popover Details Modal (Strictly Click-Only) */}
      {showDetails && popoverOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '270px',
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '12px 14px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 99999,
            color: 'var(--text-main, #1E293B)',
            fontSize: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
            <strong style={{ fontSize: '12px', color: 'var(--primary, #2563EB)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CloudCheck size={15} /> Cloud Database (Firestore)
            </strong>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '12px',
                background: badgeBg,
                color: badgeText,
                border: `1px solid ${badgeBorder}`
              }}
            >
              {syncInfo.status.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted, #64748B)' }}>Koneksi Jaringan:</span>
              <span style={{ fontWeight: 700, color: syncInfo.isOffline ? '#D97706' : '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {syncInfo.isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
                {syncInfo.isOffline ? 'Offline' : 'Online'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted, #64748B)' }}>Sinkron Terakhir:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main, #0F172A)' }}>{formatTime(syncInfo.lastSyncedAt)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted, #64748B)' }}>Antrean Sync:</span>
              <span style={{ fontWeight: 700, color: syncInfo.pendingCount > 0 ? '#D97706' : '#16A34A' }}>
                {syncInfo.pendingCount} data pending
              </span>
            </div>

            {syncInfo.errorMessage && (
              <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', fontSize: '10.5px', lineHeight: '1.35' }}>
                <strong>Kendala:</strong> {syncInfo.errorMessage}
              </div>
            )}

            <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed var(--border-color, #E2E8F0)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                  width: '100%',
                  padding: '7px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary, #2563EB)',
                  color: '#FFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isRetrying ? 0.7 : 1
                }}
              >
                <RotateCw size={12} style={{ animation: isRetrying ? 'spin 1s linear infinite' : 'none' }} />
                {isRetrying ? 'Memproses...' : 'Sinkron Ulang Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframe animation styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};
