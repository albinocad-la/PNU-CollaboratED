import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocs, 
  where, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, SocialRelation } from '../types';

export const addFriend = async (currentUser: UserProfile, targetUser: UserProfile) => {
  if (!currentUser.uid || !targetUser.uid) return;

  const friendData = {
    uid: targetUser.uid,
    displayName: targetUser.displayName,
    photoURL: targetUser.photoURL || '',
    createdAt: serverTimestamp()
  };

  const myData = {
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL || '',
    createdAt: serverTimestamp()
  };

  // Mutual friendship
  await setDoc(doc(db, 'users', currentUser.uid, 'friends', targetUser.uid), friendData);
  await setDoc(doc(db, 'users', targetUser.uid, 'friends', currentUser.uid), myData);
};

export const unfriend = async (currentUserId: string, targetUserId: string) => {
  await deleteDoc(doc(db, 'users', currentUserId, 'friends', targetUserId));
  await deleteDoc(doc(db, 'users', targetUserId, 'friends', currentUserId));
};

export const follow = async (currentUser: UserProfile, targetUser: UserProfile) => {
  if (!currentUser.uid || !targetUser.uid) return;

  const followingData = {
    uid: targetUser.uid,
    displayName: targetUser.displayName,
    photoURL: targetUser.photoURL || '',
    createdAt: serverTimestamp()
  };

  const followerData = {
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL || '',
    createdAt: serverTimestamp()
  };

  // One-way follow
  await setDoc(doc(db, 'users', currentUser.uid, 'following', targetUser.uid), followingData);
  await setDoc(doc(db, 'users', targetUser.uid, 'followers', currentUser.uid), followerData);
};

export const unfollow = async (currentUserId: string, targetUserId: string) => {
  await deleteDoc(doc(db, 'users', currentUserId, 'following', targetUserId));
  await deleteDoc(doc(db, 'users', targetUserId, 'followers', currentUserId));
};

export const subscribeToFriends = (userId: string, callback: (friends: SocialRelation[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'friends'), (snapshot) => {
    const friends = snapshot.docs.map(doc => doc.data() as SocialRelation);
    callback(friends);
  });
};

export const subscribeToFollowing = (userId: string, callback: (following: SocialRelation[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'following'), (snapshot) => {
    const following = snapshot.docs.map(doc => doc.data() as SocialRelation);
    callback(following);
  });
};

export const subscribeToFollowers = (userId: string, callback: (followers: SocialRelation[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'followers'), (snapshot) => {
    const followers = snapshot.docs.map(doc => doc.data() as SocialRelation);
    callback(followers);
  });
};

export const blockUser = async (currentUserId: string, targetUser: UserProfile) => {
  if (!currentUserId || !targetUser.uid) return;

  const blockedData = {
    uid: targetUser.uid,
    displayName: targetUser.displayName,
    photoURL: targetUser.photoURL || '',
    createdAt: serverTimestamp()
  };

  // Add to blocked list
  await setDoc(doc(db, 'users', currentUserId, 'blocked', targetUser.uid), blockedData);
  
  // Automatically unfriend and unfollow when blocking
  await unfriend(currentUserId, targetUser.uid);
  await unfollow(currentUserId, targetUser.uid);
  // Also remove them from followers
  await deleteDoc(doc(db, 'users', currentUserId, 'followers', targetUser.uid));
  await deleteDoc(doc(db, 'users', targetUser.uid, 'following', currentUserId));
};

export const unblockUser = async (currentUserId: string, targetUserId: string) => {
  await deleteDoc(doc(db, 'users', currentUserId, 'blocked', targetUserId));
};

export const subscribeToBlockedUsers = (userId: string, callback: (blocked: SocialRelation[]) => void) => {
  return onSnapshot(collection(db, 'users', userId, 'blocked'), (snapshot) => {
    const blocked = snapshot.docs.map(doc => doc.data() as SocialRelation);
    callback(blocked);
  });
};

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  // Firestore doesn't support full-text search easily, so we do a simple prefix search
  const q = query(
    collection(db, 'users'),
    where('displayName', '>=', searchTerm),
    where('displayName', '<=', searchTerm + '\uf8ff'),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as UserProfile);
};
