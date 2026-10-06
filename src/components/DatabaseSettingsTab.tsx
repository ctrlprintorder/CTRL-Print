import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  ShieldCheck,
  Zap,
  HardDrive
} from 'lucide-react';
import {
  testConnection,
  syncAllLocalDataToFirestore,
  restoreDefaultMasterData,
  getSyncStatus,
  subscribeSyncStatus,
  SyncStatusInfo
} from '../firebaseService';
import firebaseConfig from '../../firebase-applet-config.json';

interface DatabaseSettingsTabProps {
  showToast: (msg: string, isErr?: boolean) => void;
}

export const DatabaseSettingsTab: React.FC<DatabaseSettingsTabProps> = ({ showToast }) => {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>(getSyncStatus());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const unsub = subscribeSyncStatus((info) => {
      setSyncInfo(info);
    });
    return () => unsub();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await testConnection();
      if (ok) {
        setTestResult({
          success: true,
          message: 'Koneksi ke Firebase Firestore berhasil & aktif secara real-time.'
        });
        showToast('🎉 Berhasil terhubung ke Firebase Firestore!');
      } else {
        setTestResult({
          success: false,
          message: 'Gagal menghubungi Firestore. Periksa koneksi internet Anda.'
        });
        showToast('Koneksi Firestore gagal.', true);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Terjadi kesalahan saat memeriksa Firestore.'
      });
      showToast('Koneksi Firestore gagal.', true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    setSyncSummary(null);
    try {
      const res = await syncAllLocalDataToFirestore();
      if (res.success) {
        setSyncSummary(res.counts);
        showToast('🎉 Semua data toko berhasil diunggah ke Firebase Firestore!');
      } else {
        showToast(res.message, true);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal sinkronisasi data', true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Muat ulang seluruh data master bawaan percetakan (produk, bahan, vendor, pelanggan, nota contoh) ke Cloud Firestore?')) {
      return;
    }
    setIsSyncing(true);
    try {
      const res = await restoreDefaultMasterData();
      if (res.success) {
        showToast(res.message);
      } else {
        showToast(res.message, true);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan data master', true);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. FIREBASE FIRESTORE PRIMARY CLOUD DATABASE PANEL */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
          color: '#F8FAFC',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid #4338CA',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                padding: '12px',
                borderRadius: '12px',
                color: '#FFF',
                display: 'flex',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Zap size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#F8FAFC' }}>
                  Firebase Firestore (Database Tunggal Online)
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: syncInfo.status === 'error' ? '#EF4444' : '#10B981',
                    color: '#FFF',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {syncInfo.status === 'error' ? 'Kendala Koneksi' : 'Otomatis Online & Real-time'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>
                Database cloud tunggal yang otomatis online dan tersinkronisasi langsung (live) di semua browser, laptop, dan smartphone tanpa perlu input URL atau API Key manual.
              </p>
            </div>
          </div>
        </div>

        {/* Cloud Config Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '4px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Project ID</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', marginTop: '2px', fontFamily: 'monospace' }}>
              {firebaseConfig.projectId || '-'}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Database ID</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(firebaseConfig as any).firestoreDatabaseId || '(default)'}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Status Sync Multi-Perangkat</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#34D399', marginTop: '2px' }}>
              ● Aktif Otomatis (Live onSnapshot)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                border: 'none',
                color: '#FFF',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Firestore'}
            </button>

            <button
              type="button"
              onClick={handleFullSync}
              disabled={isSyncing}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFF',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {isSyncing ? 'Mengunggah Data...' : 'Upload & Sinkronkan Semua Data Lokal ke Cloud'}
            </button>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isSyncing}
              style={{
                background: 'rgba(99, 102, 241, 0.25)',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                color: '#EEF2FF',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              Pulihkan Data Master Bawaan Percetakan
            </button>
          </div>

          {testResult && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                background: testResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: testResult.success ? '#34D399' : '#F87171',
                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}
            >
              {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Sync Summary Result */}
        {syncSummary && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontWeight: 700, fontSize: '13px' }}>
              <CheckCircle2 size={16} />
              <span>Semua data toko telah berhasil diunggah ke cloud database Firestore.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#E2E8F0' }}>
              {Object.entries(syncSummary).map(([k, v]) => (
                <span key={k} style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                  <b>{k}:</b> {String(v)} data
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Card: Cara Kerja Database Tunggal */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
          <HardDrive size={18} style={{ color: 'var(--primary)' }} />
          <span>Informasi Sinkronisasi Real-Time</span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
          Dengan <strong>Firebase Firestore</strong> sebagai database tunggal:
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
          <li><strong>Otomatis Online:</strong> Setiap kali Anda membuka link web di komputer, laptop kasir, tablet, atau HP baru, data otomatis ditarik dari Firestore tanpa perlu setting apapun.</li>
          <li><strong>Hapus & Edit Real-Time:</strong> Saat Anda membuat pesanan baru, mengedit invoice, atau menghapus data di satu perangkat, perubahan tersebut akan langsung terupdate detik itu juga di seluruh perangkat lainnya.</li>
          <li><strong>Offline Resilient:</strong> Jika koneksi internet Anda sempat terputus, aplikasi tetap dapat dibuka dan akan otomatis menyinkronkan data kembali begitu koneksi internet aktif.</li>
        </ul>
      </div>
    </div>
  );
};
