import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';
import { LearningMaterial } from '../types';

const COLLECTION_NAME = 'materials';

export const addLearningMaterial = async (material: Omit<LearningMaterial, 'id' | 'createdAt' | 'addedBy'>) => {
  if (!auth.currentUser) throw new Error('User must be authenticated to add materials');

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...material,
      addedBy: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    throw error;
  }
};

export const deleteLearningMaterial = async (materialId: string) => {
  if (!auth.currentUser) throw new Error('User must be authenticated to delete materials');
  
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, materialId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${materialId}`);
    throw error;
  }
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
