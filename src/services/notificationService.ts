import { AppNotification } from '../types';
import { saveDocument, deleteDocument } from '../firebaseService';

const READ_NOTIFS_STORAGE_KEY = 'ctrl_print_read_notifs';
const NOTIF_SOUND_KEY = 'ctrl_print_notif_sound';

// Shared Web Audio API context for smooth, prompt playback across user interactions
let sharedAudioCtx: AudioContext | null = null;

export function initAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!sharedAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Auto-unlock Web Audio API on first user interaction on the page
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

export function isNotificationSoundEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(NOTIF_SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NOTIF_SOUND_KEY, String(enabled));
  } catch {}
}

/**
 * Web Audio API notification chime generator (zero external MP3 assets needed)
 */
export function playNotificationSound(type: 'order' | 'alert' | 'general' = 'general', force = false) {
  if (!force && !isNotificationSoundEnabled()) return;
  try {
    const ctx = initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    if (type === 'order') {
      // Pleasant multi-tone chime for new customer orders (C5 -> E5 -> G5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.25); // G5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'alert') {
      // Alert chime for revisions or low stock (A4 -> F5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(698.46, now + 0.12); // F5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Clean standard bell chime (D5 -> A5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  } catch {
    // Audio playback might be prevented by browser policy before first interaction
  }
}

/**
 * Synchronize read notification IDs to Firestore for real-time multi-device sync
 */
export async function syncReadNotifsToCloud(ids: string[]): Promise<void> {
  try {
    const capped = Array.from(new Set(ids)).slice(-1000);
    await saveDocument('notifications_meta', {
      id: 'read_state',
      readIds: capped,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not sync read notification state to Firestore:', err);
  }
}

/**
 * Dispatch a system-wide notification to Firestore and local subscribers
 */
export async function pushNotification(params: {
  id?: string;
  type: AppNotification['type'];
  title: string;
  desc: string;
  category: AppNotification['category'];
  linkTab?: string;
  linkParam?: string;
  referenceId?: string;
  referenceNo?: string;
  badge?: string;
  data?: any;
  playSound?: boolean;
}): Promise<AppNotification> {
  const notifId = params.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notif: AppNotification = {
    id: notifId,
    type: params.type,
    title: params.title,
    desc: params.desc,
    timestamp: new Date().toLocaleString('id-ID'),
    isRead: false,
    category: params.category,
    linkTab: params.linkTab,
    linkParam: params.linkParam,
    referenceId: params.referenceId,
    referenceNo: params.referenceNo,
    badge: params.badge,
    data: params.data
  };

  try {
    await saveDocument('notifications', notif);
  } catch (err) {
    console.warn('Could not persist notification to Firestore, fallback local:', err);
  }

  // Trigger custom window event for instant responsive UI in same window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ctrl_new_notification', { detail: notif }));
    if (params.playSound !== false) {
      playNotificationSound(params.type === 'order_online' ? 'order' : 'general');
    }
  }

  return notif;
}

/**
 * Mark a notification as read and sync to Cloud
 */
export async function markNotifRead(
  notifId: string,
  existingNotif?: AppNotification
): Promise<void> {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY) || '[]';
    const readIds: string[] = JSON.parse(raw);
    let updated = readIds;
    if (!readIds.includes(notifId)) {
      updated = [...readIds, notifId];
      localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(updated));
    }

    // Persist to Cloud for multi-device sync
    syncReadNotifsToCloud(updated).catch(() => {});

    if (existingNotif) {
      await saveDocument('notifications', {
        ...existingNotif,
        isRead: true
      });
    }
  } catch (e) {
    console.error('Error marking notification as read:', e);
  }
}

/**
 * Mark all notifications as read and sync to Cloud
 */
export async function markAllNotifsRead(notifs: AppNotification[]): Promise<void> {
  try {
    const ids = notifs.map((n) => n.id);
    const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY) || '[]';
    const current: string[] = JSON.parse(raw);
    const merged = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(merged));

    // Persist to Cloud for multi-device sync
    syncReadNotifsToCloud(merged).catch(() => {});

    // Update in Firestore
    for (const notif of notifs) {
      if (!notif.isRead) {
        await saveDocument('notifications', {
          ...notif,
          isRead: true
        });
      }
    }
  } catch (e) {
    console.error('Error marking all notifications as read:', e);
  }
}

/**
 * Delete a notification permanently
 */
export async function removeNotification(notifId: string): Promise<void> {
  try {
    await deleteDocument('notifications', notifId);
  } catch (e) {
    console.warn('Error deleting notification document:', e);
  }
}

