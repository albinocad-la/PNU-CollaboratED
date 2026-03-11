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

/**
 * Updates the current user's global lastSeen timestamp.
 */
export const updateGlobalPresence = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  try {
    await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error('Error updating global presence:', error);
  }
};

/**
 * Updates the current user's presence in a specific group.
 */
export const updateGroupPresence = async (groupId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const presenceRef = doc(db, 'studyGroups', groupId, 'presence', user.uid);
  try {
    await setDoc(presenceRef, { lastSeen: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error(`Error updating group presence for ${groupId}:`, error);
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
    // Check for presence in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const q = query(
      collection(db, 'studyGroups', groupId, 'presence'),
      where('lastSeen', '>', Timestamp.fromDate(twoMinutesAgo))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsOnline(!snapshot.empty);
      setActiveCount(snapshot.size);
    }, (error) => {
      console.error(`Error listening to presence for group ${groupId}:`, error);
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
      console.error(`Error listening to user presence for ${userId}:`, error);
    });

    return () => unsubscribe();
  }, [userId]);

  return isOnline;
};
