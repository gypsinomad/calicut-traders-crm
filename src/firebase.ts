import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Status tracking for Read-Only mode and Configuration Errors
export let isFirebaseReadOnly = false;
export let firebaseInitError: string | null = null;
let statusListeners: ((error: string | null, readOnly: boolean) => void)[] = [];

export function subscribeToFirebaseStatus(callback: (error: string | null, readOnly: boolean) => void) {
  statusListeners.push(callback);
  callback(firebaseInitError, isFirebaseReadOnly);
  return () => {
    statusListeners = statusListeners.filter(l => l !== callback);
  };
}

export function setFirebaseReadOnly(value: boolean) {
  isFirebaseReadOnly = value;
  updateFirebaseStatus(firebaseInitError, value);
}

function updateFirebaseStatus(error: string | null, readOnly: boolean) {
  firebaseInitError = error;
  isFirebaseReadOnly = readOnly;
  statusListeners.forEach(listener => {
    try {
      listener(error, readOnly);
    } catch (e) {
      console.error("Error invoking Firebase status listener:", e);
    }
  });
}

// Initialize Firebase SDK safely
let app;
let authInstance: any;
let dbInstance: any;

try {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error: any) {
  const errMsg = error?.message || String(error);
  console.error("Failed to initialize Firebase SDK:", error);
  isFirebaseReadOnly = true;
  firebaseInitError = `Firebase Initialization failed: ${errMsg}. Running in mock/read-only fallback mode.`;
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

// Validate Connection to Firestore
async function testConnection() {
  if (isFirebaseReadOnly) return;
  try {
    // Attempt to fetch a non-existent document to trigger permission or connectivity check
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[Firebase] Firestore connection verified.");
  } catch (error: any) {
    const errorCode = (error?.code || 'unknown').toLowerCase();
    const errorMessage = (error?.message || String(error)).toLowerCase();
    
    console.error(`[Firebase] Connection test failed [${errorCode}]: ${errorMessage}`);
    
    // Check for expired/invalid API key or other critical config errors
    if (
      errorCode === 'auth/api-key-expired' || 
      errorCode === 'invalid-api-key' || 
      errorCode === 'auth/invalid-api-key' ||
      errorMessage.includes('expired') || 
      errorMessage.includes('api key') || 
      errorMessage.includes('api_key') || 
      errorMessage.includes('invalid') ||
      errorCode.includes('api-keys-are-not-supported') ||
      errorMessage.includes('api-keys-are-not-supported') ||
      errorMessage.includes('api-keys') ||
      errorMessage.includes('expected-oauth2-access-token') ||
      errorMessage.includes('oauth2-access-token') ||
      errorMessage.includes('oauth2') ||
      errorMessage.includes('assert-a-principal') ||
      errorMessage.includes('assert a principal') ||
      errorMessage.includes('principal')
    ) {
      updateFirebaseStatus(
        "The Firebase configuration or API key is not fully supported or active in this project. The system has fallen back to a secure local/read-only mode so you can fully explore the app.",
        true
      );
    } else if (errorCode === 'unavailable' || errorMessage.includes('offline') || errorMessage.includes('Failed to get document')) {
      // Don't mark as totally disabled if it's a temporary connectivity error, but let UI know we are offline/read-only
      updateFirebaseStatus(
        "Network offline or Firebase service is unreachable. The application is running in read-only fallback mode.",
        true
      );
      console.error("[Firebase] NETWORK ERROR: Check your internet connection.");
    } else if (errorCode === 'permission-denied') {
      console.error("[Firebase] SECURITY ERROR: Check your Firestore security rules permissions on test/connection.");
    } else if (errorCode === 'not-found') {
      // This is actually a success for connectivity if we get "not-found" from the server
      console.log("[Firebase] Firestore connection verified (target doc not found).");
    }
  }
}
testConnection();

