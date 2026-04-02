import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { UserProfile, Notification } from '../lib/types';
import { LogIn, LogOut, Loader2, ShieldAlert, Clock, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';

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
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
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
              if (data.role !== 'admin' || data.status !== 'active') {
                updatedData.role = 'admin';
                updatedData.status = 'active';
                needsUpdate = true;
              }
            }

            // Ensure organization exists - only for default admin if needed, otherwise let it be optional
            if (currentUser.email === 'akhilvenugopal@gmail.com' && !data.organization) {
              updatedData.organization = 'Calicut Traders';
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
            const displayName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
            
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: displayName,
              photoURL: currentUser.photoURL || undefined,
              role: isAdmin ? 'admin' : 'user',
              status: isAdmin ? 'active' : 'pending',
              createdAt: Timestamp.now(),
              approvalRequestedAt: Timestamp.now(),
              lastSeen: Timestamp.now(),
              organization: isAdmin ? 'Calicut Traders' : undefined, // Only default admin gets an org by default
              avatarUrl: currentUser.photoURL || undefined,
              isOnline: false,
              presenceStatus: 'offline'
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);

            // Notify admins about new user
            if (!isAdmin) {
              try {
                // Query all admins to notify them of the new registration
                const adminsQuery = query(
                  collection(db, 'users'), 
                  where('role', '==', 'admin')
                );
                const adminSnaps = await getDocs(adminsQuery);
                
                const notificationPromises = adminSnaps.docs.map(adminDoc => {
                  const adminData = adminDoc.data();
                  return addDoc(collection(db, 'notifications'), {
                    title: 'New User Registration',
                    message: `${newProfile.displayName} (${newProfile.email}) is awaiting approval.`,
                    type: 'user_approval_request',
                    timestamp: serverTimestamp(),
                    read: false,
                    userId: adminDoc.id,
                    organization: adminData.organization || 'Calicut Traders',
                    relatedEntityId: newProfile.uid,
                    relatedEntityType: 'user'
                  });
                });
                
                // Also ensure the default admin is notified if not already in the list
                const defaultAdminEmail = 'akhilvenugopal@gmail.com';
                if (!adminSnaps.docs.some(doc => doc.data().email === defaultAdminEmail)) {
                  const defaultAdminQuery = query(collection(db, 'users'), where('email', '==', defaultAdminEmail));
                  const defaultAdminSnap = await getDocs(defaultAdminQuery);
                  
                  if (!defaultAdminSnap.empty) {
                    const defaultAdminDoc = defaultAdminSnap.docs[0];
                    await addDoc(collection(db, 'notifications'), {
                      title: 'New User Registration',
                      message: `${newProfile.displayName} (${newProfile.email}) is awaiting approval.`,
                      type: 'user_approval_request',
                      timestamp: serverTimestamp(),
                      read: false,
                      userId: defaultAdminDoc.id,
                      organization: defaultAdminDoc.data().organization || 'Calicut Traders',
                      relatedEntityId: newProfile.uid,
                      relatedEntityType: 'user'
                    });
                  }
                }

                await Promise.all(notificationPromises);
              } catch (notifyError) {
                console.error("Error notifying admins of new user:", notifyError);
              }
            }
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
      toast.error('Failed to sign in with Google');
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error('Email sign in error:', error);
      toast.error(error.message || 'Failed to sign in with email');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      // The onAuthStateChanged will handle profile creation in Firestore
    } catch (error: any) {
      console.error('Email sign up error:', error);
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInWithEmail, signUpWithEmail, logout }}>
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
  const { logout, user, profile } = useAuth();
  const [checking, setChecking] = useState(false);
  const [lastNotified, setLastNotified] = useState(() => {
    const saved = localStorage.getItem(`last_notified_${user?.uid}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const checkStatus = async (showToast = true) => {
    if (!user) return;
    setChecking(true);
    try {
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        if (data.status === 'active') {
          window.location.reload();
          return;
        }
      }
      if (showToast) {
        toast.info('Status checked. Your account is still pending approval.');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  const notifyAdmins = async () => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastNotified < 300000) { // 5 minutes
      const minutesLeft = Math.ceil((300000 - (now - lastNotified)) / 60000);
      toast.info(`Admin can be re-notified in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`);
      return;
    }

    setChecking(true);
    try {
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnaps = await getDocs(adminsQuery);
      
      const notificationPromises = adminSnaps.docs.map(adminDoc => {
        const adminData = adminDoc.data();
        const notification = {
          title: 'Approval Requested',
          message: `${profile?.displayName || user.email} is waiting for approval and requested a status update.`,
          type: 'warning',
          timestamp: serverTimestamp(),
          read: false,
          userId: adminDoc.id,
          organization: adminData.organization || 'Calicut Traders',
          relatedEntityId: user.uid,
          relatedEntityType: 'user'
        };
        return addDoc(collection(db, 'notifications'), notification);
      });
      await Promise.all(notificationPromises);
      setLastNotified(now);
      localStorage.setItem(`last_notified_${user.uid}`, now.toString());
      toast.success('Admins have been notified of your request.');
    } catch (error) {
      console.error('Error notifying admins:', error);
      toast.error('Failed to notify admins.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Initial check on mount
    checkStatus(false);
  }, [user]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-zinc-200 shadow-2xl text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
          <Clock size={40} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight">Approval Pending</h1>
        <p className="text-zinc-500 mb-8 font-medium">
          Your account is pending admin approval. You'll be notified once approved.
        </p>
        
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mb-8 text-left">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-zinc-400 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-zinc-500 leading-relaxed">
              We take security seriously. Once an admin verifies your identity and assigns you to an organization, you'll receive access to the platform.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => checkStatus(true)}
            disabled={checking}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg disabled:opacity-50"
          >
            {checking ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
            Check Status
          </button>

          <button
            onClick={notifyAdmins}
            disabled={checking}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Bell size={20} />
            Notify Admin
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { signIn, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await signUpWithEmail(email, password, name);
    } else {
      await signInWithEmail(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-zinc-200 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-inner">
            <LogIn size={40} />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight">Export CRM</h1>
          <p className="text-zinc-500 font-medium">
            Calicut Traders - Export Management CRM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>
        
        <button
          onClick={signIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-50 transition-all shadow-sm group mb-6"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Google Account
        </button>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
        
        <p className="mt-8 text-[10px] text-zinc-400 uppercase tracking-widest font-bold text-center">
          Secure Enterprise Access Only
        </p>
      </div>
    </div>
  );
}
