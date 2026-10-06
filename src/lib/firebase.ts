import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

const firebaseConfig = (rawConfig as any).default || rawConfig;

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId || firebaseConfig.databaseId || undefined;

// Configure Firestore with autoDetectLongPolling to prevent WebChannel RPC stream transport disconnect warnings
export const db: Firestore = (() => {
  try {
    return databaseId
      ? initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true
        }, databaseId)
      : initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true
        });
  } catch {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
})();

export const auth = getAuth(app);
export default app;
