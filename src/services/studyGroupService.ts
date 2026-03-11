import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  setDoc,
  getDocs,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface StudyGroup {
  id: string;
  name: string;
  courseId: string;
  description?: string;
  createdBy: string;
  createdAt: any;
  lastActive: any;
  memberCount: number;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  joinedAt: any;
}

export const createStudyGroup = async (name: string, courseId: string, description: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const groupData = {
    name,
    courseId,
    description,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
    memberCount: 1
  };

  const docRef = await addDoc(collection(db, 'studyGroups'), groupData);
  
  // Add creator as the first member
  await setDoc(doc(db, 'studyGroups', docRef.id, 'members', user.uid), {
    uid: user.uid,
    displayName: user.displayName || 'Anonymous',
    photoURL: user.photoURL || '',
    joinedAt: serverTimestamp()
  });

  return docRef.id;
};

export const joinStudyGroup = async (groupId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const batch = writeBatch(db);
  
  const memberRef = doc(db, 'studyGroups', groupId, 'members', user.uid);
  batch.set(memberRef, {
    uid: user.uid,
    displayName: user.displayName || 'Anonymous',
    photoURL: user.photoURL || '',
    joinedAt: serverTimestamp()
  });

  const groupRef = doc(db, 'studyGroups', groupId);
  batch.update(groupRef, {
    memberCount: increment(1),
    lastActive: serverTimestamp()
  });

  await batch.commit();
};

export const leaveStudyGroup = async (groupId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const batch = writeBatch(db);
  
  const memberRef = doc(db, 'studyGroups', groupId, 'members', user.uid);
  batch.delete(memberRef);

  const groupRef = doc(db, 'studyGroups', groupId);
  batch.update(groupRef, {
    memberCount: increment(-1),
    lastActive: serverTimestamp()
  });

  await batch.commit();
};

export const subscribeToStudyGroups = (callback: (groups: StudyGroup[]) => void) => {
  const q = query(collection(db, 'studyGroups'));
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StudyGroup[];
    callback(groups);
  });
};

export const subscribeToMyGroups = (callback: (groups: StudyGroup[]) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  // This is a bit tricky in Firestore without a top-level collection of memberships
  // For now, we'll just fetch all groups and filter client-side, or we could use a different structure.
  // A better way is to have a /users/{uid}/memberships/{groupId} collection.
  
  // Let's stick to a simple approach for this demo:
  const q = query(collection(db, 'studyGroups'));
  return onSnapshot(q, async (snapshot) => {
    const allGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudyGroup[];
    
    // Check membership for each group (this is not efficient but works for small scale)
    const myGroups: StudyGroup[] = [];
    for (const group of allGroups) {
      const memberDoc = await getDocs(query(collection(db, 'studyGroups', group.id, 'members'), where('uid', '==', user.uid)));
      if (!memberDoc.empty) {
        myGroups.push(group);
      }
    }
    callback(myGroups);
  });
};
