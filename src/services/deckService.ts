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
  getDoc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';
import { ReviewDeck, Flashcard } from '../types';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import mammoth from 'mammoth';

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

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

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
    mastery: 0,
    isMastered: false,
    createdAt: serverTimestamp()
  };

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    await addDoc(collection(db, 'decks', deckId, 'flashcards'), cardData);
    
    // Update cardsCount in deck using increment for efficiency
    const deckRef = doc(db, 'decks', deckId);
    await updateDoc(deckRef, {
      cardsCount: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const addFlashcardsBatch = async (deckId: string, cards: { front: string, back: string }[]) => {
  if (cards.length === 0) return;
  
  const batch = writeBatch(db);
  const deckRef = doc(db, 'decks', deckId);
  const flashcardsRef = collection(db, 'decks', deckId, 'flashcards');

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  cards.forEach(card => {
    const cardRef = doc(flashcardsRef);
    batch.set(cardRef, {
      deckId,
      front: card.front,
      back: card.back,
      mastery: 0,
      isMastered: false,
      createdAt: serverTimestamp()
    });
  });

  batch.update(deckRef, {
    cardsCount: increment(cards.length)
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `decks/${deckId}/flashcards (batch)`);
    throw error;
  }
};

export const deleteDeck = async (deckId: string) => {
  const path = `decks/${deckId}`;

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    await deleteDoc(doc(db, 'decks', deckId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

export const updateFlashcardMastery = async (deckId: string, cardId: string, isCorrect: boolean) => {
  const cardRef = doc(db, 'decks', deckId, 'flashcards', cardId);
  const deckRef = doc(db, 'decks', deckId);

  try {
    const cardDoc = await getDoc(cardRef);
    if (!cardDoc.exists()) return;

    const currentMastery = cardDoc.data().mastery || 0;
    let newMastery = isCorrect ? currentMastery + 25 : currentMastery - 10;
    newMastery = Math.max(0, Math.min(100, newMastery));
    const isMastered = newMastery >= 100;

    await updateDoc(cardRef, {
      mastery: newMastery,
      isMastered
    });

    // Update deck progress
    const flashcardsRef = collection(db, 'decks', deckId, 'flashcards');
    const masteredQuery = query(flashcardsRef, where('isMastered', '==', true));
    const masteredSnapshot = await getDocs(masteredQuery);
    const masteredCount = masteredSnapshot.size;

    const deckDoc = await getDoc(deckRef);
    const totalCards = deckDoc.data()?.cardsCount || 1;
    const progress = Math.round((masteredCount / totalCards) * 100);

    await updateDoc(deckRef, {
      progress,
      lastReviewed: serverTimestamp()
    });

    return { newMastery, isMastered, progress };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `decks/${deckId}/flashcards/${cardId}`);
    throw error;
  }
};

export const generateFlashcardsFromContent = async (content: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          text: `Generate a list of flashcards (front and back) from the following study material. 
          Focus on key concepts, definitions, and important facts.
          Output only a JSON array of objects with "front" and "back" properties.
          
          Material:
          ${content}`
        }
      ]
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          contentPart,
          {
            text: `Generate a list of flashcards (front and back) from this document. 
            Focus on key concepts, definitions, and important facts.
            Output only a JSON array of objects with "front" and "back" properties.`
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
