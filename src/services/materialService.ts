import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { LearningMaterial } from '../types';

const COLLECTION_NAME = 'materials';

export const addLearningMaterial = async (material: Omit<LearningMaterial, 'id' | 'createdAt' | 'addedBy'>) => {
  if (!auth.currentUser) throw new Error('User must be authenticated to add materials');

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...material,
    addedBy: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  return docRef.id;
};

export const subscribeToMaterials = (courseId: string, callback: (materials: LearningMaterial[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('courseId', '==', courseId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const materials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LearningMaterial[];
    callback(materials);
  }, (error) => {
    console.error('Error fetching materials:', error);
  });
};
