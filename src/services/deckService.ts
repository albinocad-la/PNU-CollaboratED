import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ReviewDeck, Flashcard } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from 'mammoth';

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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const subscribeToDecks = (userId: string, callback: (decks: ReviewDeck[]) => void) => {
  const q = query(
    collection(db, 'decks'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const decks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastReviewed: doc.data().lastReviewed?.toDate?.()?.toLocaleString() || 'Never'
    } as ReviewDeck));
    callback(decks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'decks');
  });
};

export const subscribeToCourseDecks = (userId: string, courseId: string, callback: (decks: ReviewDeck[]) => void) => {
  const q = query(
    collection(db, 'decks'),
    where('userId', '==', userId),
    where('courseId', '==', courseId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const decks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastReviewed: doc.data().lastReviewed?.toDate?.()?.toLocaleString() || 'Never'
    } as ReviewDeck));
    callback(decks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'decks');
  });
};

export const getFlashcards = async (deckId: string) => {
  const path = `decks/${deckId}/flashcards`;
  const q = query(
    collection(db, 'decks', deckId, 'flashcards'),
    orderBy('createdAt', 'asc')
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Flashcard));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createDeck = async (userId: string, title: string, courseId: string) => {
  const path = 'decks';
  const deckData = {
    userId,
    title,
    courseId,
    cardsCount: 0,
    progress: 0,
    lastReviewed: null,
    createdAt: serverTimestamp()
  };
  try {
    const docRef = await addDoc(collection(db, 'decks'), deckData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const addFlashcard = async (deckId: string, front: string, back: string) => {
  const path = `decks/${deckId}/flashcards`;
  const cardData = {
    deckId,
    front,
    back,
    createdAt: serverTimestamp()
  };
  try {
    await addDoc(collection(db, 'decks', deckId, 'flashcards'), cardData);
    
    // Update cardsCount in deck
    const deckRef = doc(db, 'decks', deckId);
    const deckSnap = await getDoc(deckRef);
    if (deckSnap.exists()) {
      await updateDoc(deckRef, {
        cardsCount: (deckSnap.data().cardsCount || 0) + 1
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const deleteDeck = async (deckId: string) => {
  const path = `decks/${deckId}`;
  try {
    await deleteDoc(doc(db, 'decks', deckId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

export const generateFlashcardsFromContent = async (content: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a list of flashcards (front and back) from the following study material. 
    Focus on key concepts, definitions, and important facts.
    Output only a JSON array of objects with "front" and "back" properties.
    
    Material:
    ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return [];
  }
};

export const generateFlashcardsFromFile = async (file: File) => {
  let contentPart: any;

  try {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Handle DOCX
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      contentPart = { text: result.value };
    } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      // Handle PDF and Images
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      contentPart = {
        inlineData: {
          mimeType: file.type,
          data: base64
        }
      };
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      // Handle text-based files
      const text = await file.text();
      contentPart = { text };
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        contentPart,
        {
          text: `Generate a list of flashcards (front and back) from this document. 
          Focus on key concepts, definitions, and important facts.
          Output only a JSON array of objects with "front" and "back" properties.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to generate flashcards from file:", e);
    throw e; // Re-throw to be handled by the UI
  }
};
