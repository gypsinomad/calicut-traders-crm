import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  getDocFromServer,
  getDocs,
  getDoc,
  WhereFilterOp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
export { db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

export const getDocuments = async <T>(
  path: string, 
  filters?: { field: string; operator: WhereFilterOp; value: any }[],
  sortField?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  try {
    let q = query(collection(db, path));

    if (filters) {
      filters.forEach(f => {
        q = query(q, where(f.field, f.operator, f.value));
      });
    }

    if (sortField) {
      q = query(q, orderBy(sortField, sortOrder));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getDocument = async <T>(path: string, id: string) => {
  try {
    const docRef = doc(db, path, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    return null;
  }
};

export const subscribeToCollection = <T>(
  path: string, 
  callback: (data: T[]) => void,
  filters?: { field: string; operator: WhereFilterOp; value: any }[],
  sortField?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  let q = query(collection(db, path));

  if (filters) {
    filters.forEach(f => {
      q = query(q, where(f.field, f.operator, f.value));
    });
  }

  if (sortField) {
    q = query(q, orderBy(sortField, sortOrder));
  }

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const createDocument = async <T extends object>(path: string, data: T) => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.currentUser?.uid || 'system',
      updatedBy: auth.currentUser?.uid || 'system',
    });

    // Log the creation
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'CREATE',
      collection: path,
      documentId: docRef.id,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now,
      data: data
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateDocument = async <T extends object>(path: string, id: string, data: Partial<T>) => {
  try {
    const docRef = doc(db, path, id);
    const now = Timestamp.now();
    
    // 1. Fetch current version for history
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      await addDoc(collection(db, 'documentVersions'), {
        originalId: id,
        collection: path,
        data: currentDoc.data(),
        versionedAt: now,
        versionedBy: auth.currentUser?.uid || 'system'
      });
    }

    // 2. Perform update
    await updateDoc(docRef, {
      ...data,
      updatedAt: now,
      updatedBy: auth.currentUser?.uid || 'system',
    });

    // 3. Log the update
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'UPDATE',
      collection: path,
      documentId: id,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now,
      changes: data
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const deleteDocument = async (path: string, id: string) => {
  try {
    const docRef = doc(db, path, id);
    const now = Timestamp.now();

    // 1. Fetch document before deletion
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      // 2. Save to trash for admin restoration
      await addDoc(collection(db, 'trash'), {
        originalId: id,
        originalCollection: path,
        data: currentDoc.data(),
        deletedAt: now,
        deletedBy: auth.currentUser?.uid || 'system',
        deletedByUserEmail: auth.currentUser?.email || 'system'
      });
    }

    // 3. Perform actual deletion (or we could do soft delete, but user asked for a copy to restore)
    await deleteDoc(docRef);

    // 4. Log the deletion
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'DELETE',
      collection: path,
      documentId: id,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};

export const restoreDocument = async (trashId: string) => {
  try {
    const trashRef = doc(db, 'trash', trashId);
    const trashDoc = await getDoc(trashRef);
    
    if (!trashDoc.exists()) throw new Error('Trash item not found');
    
    const { originalId, originalCollection, data } = trashDoc.data();
    const now = Timestamp.now();

    // 1. Restore the document
    await addDoc(collection(db, originalCollection), {
      ...data,
      updatedAt: now,
      restoredAt: now,
      restoredBy: auth.currentUser?.uid || 'system'
    });

    // 2. Remove from trash
    await deleteDoc(trashRef);

    // 3. Log the restoration
    await addDoc(collection(db, 'systemLogs'), {
      operation: 'RESTORE',
      collection: originalCollection,
      documentId: originalId,
      userId: auth.currentUser?.uid || 'system',
      userEmail: auth.currentUser?.email || 'system',
      timestamp: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trash/${trashId}`);
  }
};

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
