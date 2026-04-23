import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to trigger permission or connectivity check
    await getDocFromServer(doc(db, 'system_health', 'connection_test'));
    console.log("[Firebase] Firestore connection verified.");
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);
    
    console.error(`[Firebase] Connection test failed [${errorCode}]: ${errorMessage}`);
    
    if (errorCode === 'unavailable' || errorMessage.includes('offline')) {
      console.error("[Firebase] NETWORK ERROR: Check your internet connection.");
    } else if (errorCode === 'permission-denied') {
      console.error("[Firebase] SECURITY ERROR: Your account lacks necessary permissions or security rules are too restrictive.");
    } else if (errorCode === 'not-found') {
      // This is actually a success for connectivity if we get "not-found" from the server
      console.log("[Firebase] Firestore connection verified (target doc not found).");
    }
  }
}
testConnection();
