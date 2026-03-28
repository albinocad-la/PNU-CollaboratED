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
import { db, auth, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';
import { useState, useEffect } from 'react';

export const updateGlobalPresence = async () => {
  const user = auth.currentUser;
  if (!user) return;

  // Throttle to once every 10 minutes across tabs using localStorage
  const lastUpdateKey = `last_presence_update_${user.uid}`;
  const lastUpdate = localStorage.getItem(lastUpdateKey);
  const now = Date.now();
  if (lastUpdate && now - parseInt(lastUpdate) < 595000) {
    return;
  }

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) return;

  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
    localStorage.setItem(lastUpdateKey, now.toString());
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Updates the current user's presence in a specific group.
 * Throttled to once every 60 seconds per group.
 */
export const updateGroupPresence = async (groupId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  // Throttle to once every 10 minutes per group
  const lastUpdateKey = `last_group_presence_${groupId}_${user.uid}`;
  const lastUpdate = localStorage.getItem(lastUpdateKey);
  const now = Date.now();
  if (lastUpdate && now - parseInt(lastUpdate) < 595000) {
    return;
  }

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) return;

  const path = `chats/${groupId}/presence/${user.uid}`;
  const presenceRef = doc(db, 'chats', groupId, 'presence', user.uid);
  try {
    await setDoc(presenceRef, { lastSeen: serverTimestamp() }, { merge: true });
    localStorage.setItem(lastUpdateKey, now.toString());
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
    // Check for presence in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const q = query(
      collection(db, 'chats', groupId, 'presence'),
      where('lastSeen', '>', Timestamp.fromDate(fifteenMinutesAgo))
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
          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
          setIsOnline(lastSeen > fifteenMinutesAgo);
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
