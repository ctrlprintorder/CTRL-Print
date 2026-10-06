import React, { useState } from 'react';
import { Megaphone, X } from 'lucide-react';

interface RunningAnnouncementBarProps {
  content?: string;
  badge?: string;
  speed?: 'slow' | 'normal' | 'fast';
  enabled?: boolean;
  className?: string;
  allowDismiss?: boolean;
}

export const RunningAnnouncementBar: React.FC<RunningAnnouncementBarProps> = ({
  content,
  badge = '📢 INFO & PROMO',
  speed = 'normal',
  enabled = true,
  className = '',
  allowDismiss = true
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!enabled || isDismissed) return null;

  const textToDisplay =
    content && content.trim()
      ? content.trim()
      : 'Selamat datang di CTRL PRINT! Melayani cetak spanduk kilat, stiker A3+ kiss cut, kartu nama, brosur, banner, hingga packaging berkualitas tinggi • Buka Senin - Sabtu 08.00 - 21.00 WIB • Konsultasi gratis via WhatsApp • Siap kirim se-Indonesia!';

  // Speed duration mapping in seconds
  const speedDurations: Record<string, number> = {
    slow: 45,
    normal: 28,
    fast: 18
  };
  const duration = speedDurations[speed] || 28;

  return (
    <div
      className={`running-announcement-bar ${className}`}
      id="portal-running-text-bar"
      style={{
        position: 'relative',
        width: '100%',
        marginBottom: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(37, 99, 235, 0.18)',
        background: 'linear-gradient(90deg, rgba(239, 246, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(239, 246, 255, 0.95) 100%)',
        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        minHeight: '40px',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Left Fixed Badge */}
      <div
        className="running-badge-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          flexShrink: 0,
          zIndex: 2,
          boxShadow: '3px 0 10px rgba(0, 0, 0, 0.08)',
          borderTopLeftRadius: '11px',
          borderBottomLeftRadius: '11px',
          height: '100%',
          userSelect: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        <Megaphone size={13} className="running-badge-icon" />
        <span className="running-badge-text">{badge}</span>
      </div>

      {/* 2. Seamless Marquee Ticker Track */}
      <div
        className="running-ticker-viewport"
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          height: '38px',
          maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,1) 3%, rgba(0,0,0,1) 97%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,1) 3%, rgba(0,0,0,1) 97%, transparent 100%)'
        }}
      >
        <div
          className="running-ticker-track"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            animation: `marqueeText ${duration}s linear infinite`,
            cursor: 'pointer'
          }}
          title="Arahkan kursor atau sentuh untuk menjeda teks"
        >
          {/* Segment 1 */}
          <div className="running-ticker-segment" style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', paddingRight: '48px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main, #1E293B)', letterSpacing: '0.01em' }}>
              {textToDisplay}
            </span>
            <span style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '14px' }}>
              •
            </span>
          </div>

          {/* Segment 2 (Duplicate for continuous seamless loop) */}
          <div className="running-ticker-segment" style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', paddingRight: '48px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main, #1E293B)', letterSpacing: '0.01em' }}>
              {textToDisplay}
            </span>
            <span style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '14px' }}>
              •
            </span>
          </div>

          {/* Segment 3 */}
          <div className="running-ticker-segment" style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', paddingRight: '48px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main, #1E293B)', letterSpacing: '0.01em' }}>
              {textToDisplay}
            </span>
            <span style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '14px' }}>
              •
            </span>
          </div>
        </div>
      </div>

      {/* 3. Optional Right Dismiss / Close Button */}
      {allowDismiss && (
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #64748B)',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            zIndex: 2,
            transition: 'color 0.15s ease, transform 0.15s ease',
            outline: 'none'
          }}
          title="Tutup pengumuman ini"
          aria-label="Tutup pengumuman"
        >
          <X size={14} />
        </button>
      )}

      {/* Embedded CSS for smooth marquee & hover-pause behavior */}
      <style>{`
        @keyframes marqueeText {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .running-ticker-track:hover {
          animation-play-state: paused !important;
        }

        .running-ticker-track:active {
          animation-play-state: paused !important;
        }

        body.dark-mode .running-announcement-bar {
          background: linear-gradient(90deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 50%, rgba(30, 41, 59, 0.95) 100%) !important;
          border-color: rgba(96, 165, 250, 0.25) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
        }

        body.dark-mode .running-ticker-segment span {
          color: #E2E8F0 !important;
        }

        @media (max-width: 640px) {
          .running-badge-text {
            font-size: 10px !important;
          }
          .running-badge-container {
            padding: 5px 8px !important;
          }
          .running-ticker-segment span {
            font-size: 11.5px !important;
          }
        }
      `}</style>
    </div>
  );
};
