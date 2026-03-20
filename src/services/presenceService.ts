import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useState, useEffect } from 'react';

export enum OperationType {
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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Updates the current user's global lastSeen timestamp.
 */
export const updateGlobalPresence = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Updates the current user's presence in a specific group.
 */
export const updateGroupPresence = async (groupId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const path = `chats/${groupId}/presence/${user.uid}`;
  const presenceRef = doc(db, 'chats', groupId, 'presence', user.uid);
  try {
    await setDoc(presenceRef, { lastSeen: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Hook to check if a group has any active members.
 * A group is considered "Online" if at least one member has been seen in the last 2 minutes.
 */
export const useGroupOnlineStatus = (groupId: string) => {
  const [isOnline, setIsOnline] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const path = `chats/${groupId}/presence`;
    // Check for presence in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const q = query(
      collection(db, 'chats', groupId, 'presence'),
      where('lastSeen', '>', Timestamp.fromDate(twoMinutesAgo))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsOnline(!snapshot.empty);
      setActiveCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [groupId]);

  return { isOnline, activeCount };
};

/**
 * Hook to check if a specific user is online.
 */
export const useUserOnlineStatus = (userId: string) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const path = `users/${userId}`;
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.lastSeen) {
          const lastSeen = data.lastSeen.toDate();
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          setIsOnline(lastSeen > twoMinutesAgo);
        } else {
          setIsOnline(false);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [userId]);

  return isOnline;
};
