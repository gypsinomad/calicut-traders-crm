import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { UserProfile } from '../lib/types';
import { LogIn, LogOut, Loader2, ShieldAlert, Clock } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const path = `users/${currentUser.uid}`;
        try {
          const profileRef = doc(db, 'users', currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const data = profileSnap.data() as UserProfile;
            let updatedData = { ...data };
            let needsUpdate = false;

            // Check if this is the default admin and needs a role upgrade or approval
            if (currentUser.email === 'akhilvenugopal@gmail.com') {
              if (data.role !== 'admin' || !data.isApproved) {
                updatedData.role = 'admin';
                updatedData.isApproved = true;
                needsUpdate = true;
              }
            }

            // Ensure organization exists
            if (!data.organization) {
              updatedData.organization = 'Calicut Spice Traders LLP';
              needsUpdate = true;
            }

            if (needsUpdate) {
              await setDoc(profileRef, updatedData, { merge: true });
              setProfile(updatedData);
            } else {
              setProfile(data);
            }
          } else {
            const isAdmin = currentUser.email === 'akhilvenugopal@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              role: isAdmin ? 'admin' : 'staff',
              isApproved: isAdmin, // Default admin is approved, others are not
              isActive: true,
              createdAt: Timestamp.now(),
              organization: 'Calicut Spice Traders LLP',
              avatarUrl: currentUser.photoURL || undefined
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function PendingApprovalScreen() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-zinc-200 shadow-2xl text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
          <Clock size={40} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight">Approval Pending</h1>
        <p className="text-zinc-500 mb-8 font-medium">
          Your account has been created successfully. An administrator needs to approve your access before you can enter the system.
        </p>
        
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mb-8 text-left">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-zinc-400 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-zinc-500 leading-relaxed">
              We take security seriously. Once an admin verifies your identity, you'll receive access to the Calicut Spice Traders platform.
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { signIn, loading } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-zinc-200 shadow-2xl text-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
          <LogIn size={40} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight">Export CRM</h1>
        <p className="text-zinc-500 mb-10 font-medium">
          Calicut Spice Traders LLP
        </p>
        
        <button
          onClick={signIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Sign in with Google
            </>
          )}
        </button>
        
        <p className="mt-8 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
          Secure Enterprise Access Only
        </p>
      </div>
    </div>
  );
}
