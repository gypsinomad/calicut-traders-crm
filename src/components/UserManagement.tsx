import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where,
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  orderBy,
  Timestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole, UserStatus } from '../lib/types';
import { ADMIN_EMAIL, DEFAULT_ORGANIZATION } from '../lib/constants';
import { 
  Users, 
  Shield, 
  Clock, 
  Search,
  Filter,
  UserCheck,
  UserX,
  ShieldCheck,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Ban,
  Mail,
  UserCog
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from './Auth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [organizations, setOrganizations] = useState<{id: string, companyName: string}[]>([]);
  const { profile: currentUserProfile } = useAuth();

  useEffect(() => {
    if (!currentUserProfile) return;

    // Fetch organizations
    const fetchOrgs = async () => {
      try {
        const orgsSnap = await getDocs(collection(db, 'organizations'));
        const orgsData = orgsSnap.docs.map(doc => ({
          id: doc.id,
          companyName: doc.data().companyName || doc.id
        }));
        setOrganizations(orgsData);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
    fetchOrgs();

    // Fetch all users for admins to ensure pending users with no organization are visible
    const q = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      
      // Filter in memory if not super admin
      if (currentUserProfile.email !== ADMIN_EMAIL) {
        usersData = usersData.filter(u => 
          u.organization === currentUserProfile.organization || !u.organization
        );
      }
      
      // Sort in memory
      usersData.sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      console.log("Fetched users for org:", currentUserProfile.organization, usersData.length);
      setUsers(usersData);
      setLoading(false);
    }, async (error) => {
      console.error("Error fetching users:", error);
      
      // Fallback: if organization query fails, try to at least get pending users if super admin
      if (currentUserProfile.email === ADMIN_EMAIL) {
        try {
          const pendingQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
          const pendingSnap = await getDocs(pendingQuery);
          const pendingData = pendingSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id })) as UserProfile[];
          setUsers(prev => {
            const combined = [...prev];
            pendingData.forEach(pu => {
              if (!combined.find(u => u.uid === pu.uid)) combined.push(pu);
            });
            return combined;
          });
        } catch (e) {
          console.error("Fallback query failed:", e);
        }
      }
      setLoading(false);
    });

    // Refresh timestamps every minute
    const timer = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [currentUserProfile?.organization]);

  const handleStatusChange = async (userId: string, newStatus: UserStatus, userName: string, orgId?: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const updates: Partial<UserProfile> = { status: newStatus };
      
      // Get the user's current data to check for organization
      const userToUpdate = users.find(u => u.uid === userId);
      const targetOrg = orgId || userToUpdate?.organization || currentUserProfile?.organization || DEFAULT_ORGANIZATION;
      
      if (newStatus === 'active') {
        updates.organization = targetOrg;
      }
      
      await updateDoc(userRef, updates);
      
      toast.success(`User ${userName} status updated to ${newStatus}`);

      if (newStatus === 'active') {
        // Clear approval request notifications for all admins
        try {
          const notifQuery = query(
            collection(db, 'notifications'), 
            where('relatedEntityId', '==', userId),
            where('type', '==', 'user_approval_request')
          );
          const notifSnap = await getDocs(notifQuery);
          const batch = writeBatch(db);
          notifSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        } catch (notifErr) {
          console.error("Error clearing approval notifications:", notifErr);
        }

        // Notify user
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          title: 'Account Approved',
          message: `Your account has been approved. Welcome to ${targetOrg}!`,
          type: 'success',
          timestamp: serverTimestamp(),
          read: false,
          organization: targetOrg
        });
      }
      setConfirmSuspend(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole, userName: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      toast.success(`Role for ${userName} updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingUsersCount = users.filter(u => u.status === 'pending').length;

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active': 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 size={10} />
            Active
          </span>
        );
      case 'pending': 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertCircle size={10} />
            Pending Approval
          </span>
        );
      case 'suspended': 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100">
            <Ban size={10} />
            Suspended
          </span>
        );
      default: return null;
    }
  };

  const getPresenceColor = (profile: UserProfile) => {
    if (!profile.isOnline) return 'bg-zinc-300';
    switch (profile.presenceStatus) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'away': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'dnd': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
      default: return 'bg-zinc-300';
    }
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'long ago';
    try {
      const date = lastSeen instanceof Timestamp ? lastSeen.toDate() : new Date(lastSeen);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'long ago';
    }
  };

  if (currentUserProfile?.role !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="text-rose-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-zinc-900">Access Denied</h2>
        <p className="text-zinc-500 mt-2">Only administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 flex items-center gap-3">
            <Users className="text-emerald-600" size={32} />
            User Management
          </h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage user access, roles, and monitor real-time presence.</p>
        </div>
      </div>

      {pendingUsersCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-bold text-amber-900">{pendingUsersCount} Users Pending Approval</p>
              <p className="text-sm text-amber-700">New team members are waiting for your verification.</p>
            </div>
          </div>
          <button 
            onClick={() => setStatusFilter('pending')}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Review Now
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval ({pendingUsersCount})</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Presence</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.map((u) => (
                <tr 
                  key={u.uid} 
                  className={`group transition-colors hover:bg-zinc-50/50 ${
                    u.status === 'pending' ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`} 
                          alt={u.displayName}
                          className="w-10 h-10 rounded-xl object-cover border border-zinc-200 shadow-sm"
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getPresenceColor(u)}`} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-zinc-900 truncate">{u.displayName}</div>
                        <div className="text-xs text-zinc-500 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-zinc-400" />
                      <select
                        value={u.organization || ''}
                        onChange={(e) => {
                          const orgId = e.target.value;
                          const userRef = doc(db, 'users', u.uid);
                          updateDoc(userRef, { organization: orgId }).then(() => {
                            toast.success(`Organization updated for ${u.displayName}`);
                          }).catch(err => {
                            console.error("Error updating org:", err);
                            toast.error("Failed to update organization");
                          });
                        }}
                        className="text-sm bg-transparent border-none p-0 focus:ring-0 cursor-pointer font-bold text-zinc-700 hover:text-emerald-600 transition-colors"
                      >
                        <option value="">Not Assigned</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.companyName}</option>
                        ))}
                        {!organizations.find(o => o.id === DEFAULT_ORGANIZATION) && (
                          <option value={DEFAULT_ORGANIZATION}>{DEFAULT_ORGANIZATION}</option>
                        )}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(u.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserCog size={14} className="text-zinc-400" />
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole, u.displayName)}
                        disabled={u.uid === currentUserProfile?.uid}
                        className="text-sm bg-transparent border-none p-0 focus:ring-0 cursor-pointer font-bold text-zinc-700 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="user">User</option>
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-bold text-zinc-700 capitalize">
                        {u.isOnline ? u.presenceStatus : 'Offline'}
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Clock size={10} />
                        <span key={refreshKey}>
                          {u.isOnline ? 'Active now' : formatLastSeen(u.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleStatusChange(u.uid, 'active', u.displayName)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Approve"
                          >
                            <UserCheck size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(u.uid, 'suspended', u.displayName)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                            title="Reject"
                          >
                            <UserX size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          {u.status === 'suspended' ? (
                            <button
                              onClick={() => handleStatusChange(u.uid, 'active', u.displayName)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-xs hover:bg-emerald-100 transition-colors"
                            >
                              Reactivate
                            </button>
                          ) : u.uid !== currentUserProfile?.uid && (
                            <>
                              {confirmSuspend === u.uid ? (
                                <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                  <button
                                    onClick={() => handleStatusChange(u.uid, 'suspended', u.displayName)}
                                    className="px-2 py-1 bg-rose-600 text-white rounded-md font-bold text-[10px] hover:bg-rose-700"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmSuspend(null)}
                                    className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md font-bold text-[10px] hover:bg-zinc-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmSuspend(u.uid)}
                                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Suspend"
                                >
                                  <Ban size={18} />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-50 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No users found</h3>
            <p className="text-zinc-500 mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
