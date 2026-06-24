import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Status tracking for Read-Only mode and error states
export let isFirebaseReadOnly = false;
export let firebaseInitError: string | null = null;
let statusListeners: ((error: string | null, isReadOnly: boolean) => void)[] = [];

export function subscribeToFirebaseStatus(callback: (error: string | null, isReadOnly: boolean) => void) {
  statusListeners.push(callback);
  callback(firebaseInitError, isFirebaseReadOnly);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== callback);
  };
}

export function setFirebaseReadOnly(value: boolean) {
  isFirebaseReadOnly = value;
  updateFirebaseStatus(firebaseInitError, value);
}

function updateFirebaseStatus(error: string | null, readOnly: boolean) {
  firebaseInitError = error;
  isFirebaseReadOnly = readOnly;
  statusListeners.forEach((listener) => listener(error, readOnly));
}

let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

try {
  if (!firebaseConfig.projectId) {
    throw new Error('Firebase project ID is missing. Please set VITE_FIREBASE_PROJECT_ID.');
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown Firebase initialization error';
  console.error('Firebase initialization failed:', message);
  updateFirebaseStatus(message, true);
  // Create fallback instances
  app = initializeApp({ projectId: 'fallback-project', apiKey: 'fallback' }, 'fallback');
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();
export { auth, db, storage };
export default app;
