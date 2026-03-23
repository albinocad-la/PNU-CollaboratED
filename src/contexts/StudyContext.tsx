import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface StudyContextType {
  isFocusMode: boolean;
  isStudyMode: boolean;
  toggleFocusMode: () => void;
  toggleStudyMode: () => void;
  setFocusMode: (active: boolean) => void;
  setStudyMode: (active: boolean) => void;
  incrementCardsReviewed: () => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const sessionStartTime = useRef<number | null>(null);
  const cardsReviewedRef = useRef(0);

  const toggleFocusMode = () => setIsFocusMode(prev => !prev);
  const toggleStudyMode = () => setIsStudyMode(prev => !prev);

  useEffect(() => {
    if (isStudyMode) {
      sessionStartTime.current = Date.now();
      cardsReviewedRef.current = 0;
    } else if (sessionStartTime.current) {
      const saveSession = async () => {
        const user = auth.currentUser;
        if (!user || !sessionStartTime.current) return;

        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - sessionStartTime.current) / 60000);
        const cardsReviewed = cardsReviewedRef.current;
        
        // Only save if session was at least 1 minute or cards were reviewed
        if (durationMinutes > 0 || cardsReviewed > 0) {
          // Check if quota was previously exceeded
          if (isQuotaExceeded()) {
            sessionStartTime.current = null;
            cardsReviewedRef.current = 0;
            return;
          }

          try {
            await addDoc(collection(db, 'users', user.uid, 'sessions'), {
              userId: user.uid,
              startTime: new Date(sessionStartTime.current),
              endTime: new Date(endTime),
              durationMinutes,
              cardsReviewed,
              createdAt: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/sessions`);
          }
        }
        
        sessionStartTime.current = null;
        cardsReviewedRef.current = 0;
      };

      saveSession();
    }
  }, [isStudyMode]);

  const incrementCardsReviewed = () => {
    if (isStudyMode) {
      cardsReviewedRef.current += 1;
    }
  };

  return (
    <StudyContext.Provider value={{ 
      isFocusMode, 
      isStudyMode, 
      toggleFocusMode, 
      toggleStudyMode,
      setFocusMode: setIsFocusMode,
      setStudyMode: setIsStudyMode,
      incrementCardsReviewed
    }}>
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (context === undefined) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
};
