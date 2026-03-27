import { courses } from '../data';
import { Layers, Play, Plus, Search, MoreVertical, RotateCcw, ChevronLeft, ChevronRight, Check, X, Upload, FileText, Loader2, Trash2, AlertCircle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ReviewDeck, Flashcard } from '../types';
import { subscribeToDecks, getFlashcards, createDeck, addFlashcard, addFlashcardsBatch, deleteDeck, generateFlashcardsFromFile, updateFlashcardMastery } from '../services/deckService';
import SlideButton from '../components/SlideButton';
import { useStudy } from '../contexts/StudyContext';

interface ReviewDecksProps {
  user: User;
  initialDeckId?: string;
}

const ReviewDecks: React.FC<ReviewDecksProps> = ({ user, initialDeckId }) => {
  const { isStudyMode, toggleStudyMode, incrementCardsReviewed } = useStudy();
  const [decks, setDecks] = useState<ReviewDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeDeckFlashcards, setActiveDeckFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0].id);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [creationMode, setCreationMode] = useState<'upload' | 'manual'>('upload');
  const [manualCards, setManualCards] = useState<{ front: string; back: string }[]>([]);
  const [currentManualFront, setCurrentManualFront] = useState('');
  const [currentManualBack, setCurrentManualBack] = useState('');
  const [editingManualCardIndex, setEditingManualCardIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('All Courses');
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);
  const [addCardsToDeckId, setAddCardsToDeckId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetCreationState = () => {
    setNewDeckTitle('');
    setUploadFile(null);
    setManualCards([]);
    setCurrentManualFront('');
    setCurrentManualBack('');
    setEditingManualCardIndex(null);
    setCreationMode('upload');
    setShowCreateModal(false);
    setAddCardsToDeckId(null);
  };

  useEffect(() => {
    const unsubscribe = subscribeToDecks(user.uid, (data) => {
      setDecks(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (initialDeckId && decks.length > 0) {
      handleStartReview(initialDeckId);
    }
  }, [initialDeckId, decks]);

  const handleStartReview = async (deckId: string) => {
    setErrorMessage(null);
    const cards = await getFlashcards(deckId);
    if (cards.length === 0) {
      setErrorMessage("This deck has no cards yet! Add some cards or upload material to generate them.");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }
    setActiveDeckFlashcards(cards);
    setActiveDeckId(deckId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleNextCard = async (isCorrect?: boolean) => {
    if (activeDeckId && activeDeckFlashcards[currentCardIndex]) {
      const card = activeDeckFlashcards[currentCardIndex];
      if (isCorrect !== undefined) {
        try {
          await updateFlashcardMastery(activeDeckId, card.id, isCorrect);
        } catch (error) {
          console.error("Failed to update mastery:", error);
        }
      }
    }

    if (currentCardIndex < activeDeckFlashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex(prev => prev + 1);
        incrementCardsReviewed();
      }, 150);
    } else {
      incrementCardsReviewed();
      setActiveDeckId(null); // Finish review
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentCardIndex(prev => prev - 1), 150);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return;
    setIsCreating(true);
    try {
      const deckId = await createDeck(user.uid, newDeckTitle, selectedCourseId);
      
      if (creationMode === 'upload' && uploadFile) {
        // Convert file to flashcards using Gemini
        const generatedCards = await generateFlashcardsFromFile(uploadFile);
        if (generatedCards && generatedCards.length > 0) {
          await addFlashcardsBatch(deckId, generatedCards);
        }
      } else if (creationMode === 'manual' && manualCards.length > 0) {
        await addFlashcardsBatch(deckId, manualCards);
      }
      
      setShowCreateModal(false);
      resetCreationState();
    } catch (error) {
      console.error("Error creating deck:", error);
      alert("Failed to create deck. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const addManualCard = () => {
    if (!currentManualFront.trim() || !currentManualBack.trim()) return;
    
    if (editingManualCardIndex !== null) {
      const updatedCards = [...manualCards];
      updatedCards[editingManualCardIndex] = { front: currentManualFront, back: currentManualBack };
      setManualCards(updatedCards);
      setEditingManualCardIndex(null);
    } else {
      setManualCards([...manualCards, { front: currentManualFront, back: currentManualBack }]);
    }
    
    setCurrentManualFront('');
    setCurrentManualBack('');
  };

  const editManualCard = (index: number) => {
    const card = manualCards[index];
    setCurrentManualFront(card.front);
    setCurrentManualBack(card.back);
    setEditingManualCardIndex(index);
  };

  const removeManualCard = (index: number) => {
    setManualCards(manualCards.filter((_, i) => i !== index));
    if (editingManualCardIndex === index) {
      setEditingManualCardIndex(null);
      setCurrentManualFront('');
      setCurrentManualBack('');
    } else if (editingManualCardIndex !== null && editingManualCardIndex > index) {
      setEditingManualCardIndex(editingManualCardIndex - 1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit PDF files to 750KB as requested
      if (file.type === 'application/pdf' && file.size > 750 * 1024) {
        alert("PDF file size exceeds 750KB limit.");
        return;
      }
      setUploadFile(file);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    setDeckToDelete(deckId);
  };

  const confirmDelete = async () => {
    if (deckToDelete && !isDeleting) {
      setIsDeleting(true);
      try {
        await deleteDeck(deckToDelete);
        setDeckToDelete(null);
      } catch (error) {
        console.error("Error deleting deck:", error);
        setErrorMessage("Failed to delete deck. Please try again.");
        setTimeout(() => setErrorMessage(null), 5000);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleAddCardsToExisting = async () => {
    if (!addCardsToDeckId || manualCards.length === 0) return;
    setIsCreating(true);
    try {
      await addFlashcardsBatch(addCardsToDeckId, manualCards);
      resetCreationState();
    } catch (error) {
      console.error("Error adding cards:", error);
      alert("Failed to add cards. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === 'All Courses' || courses.find(c => c.id === deck.courseId)?.code === filterCourse;
    return matchesSearch && matchesCourse;
  });

  if (activeDeckId) {
    const currentCard = activeDeckFlashcards[currentCardIndex];
    const deck = decks.find(d => d.id === activeDeckId);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="p-4 sm:p-8 max-w-4xl mx-auto h-[calc(100vh-5rem)] flex flex-col"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <button 
            onClick={() => setActiveDeckId(null)}
            className="self-start text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">{deck?.title}</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Card {currentCardIndex + 1} of {activeDeckFlashcards.length}</p>
          </div>
          <div className="w-full sm:w-24">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div 
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentCardIndex + 1) / activeDeckFlashcards.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCardIndex + (isFlipped ? '-back' : '-front')}
              initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl aspect-[4/3] sm:aspect-[3/2] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 cursor-pointer flex items-center justify-center p-6 sm:p-12 text-center relative"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 dark:text-slate-500">
                <RotateCcw className="w-4 h-4 sm:w-5 h-5" />
              </div>
              <h3 className="text-xl sm:text-3xl md:text-4xl font-medium text-slate-800 dark:text-white leading-relaxed">
                {isFlipped ? currentCard?.back : currentCard?.front}
              </h3>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 sm:mt-12 flex items-center gap-4 sm:gap-6">
            <button 
              onClick={handlePrevCard}
              disabled={currentCardIndex === 0}
              className="p-3 sm:p-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 h-6" />
            </button>
            
            {isFlipped ? (
              <div className="flex gap-2 sm:gap-4">
                <button 
                  onClick={() => handleNextCard(false)}
                  className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <X className="w-4 h-4 sm:w-5 h-5" /> Again
                </button>
                <button 
                  onClick={() => handleNextCard(true)}
                  className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <Check className="w-4 h-4 sm:w-5 h-5" /> Got it
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsFlipped(true)}
                className="px-8 sm:px-12 py-2.5 sm:py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-sm sm:text-base"
              >
                Show Answer
              </button>
            )}

            <button 
              onClick={() => handleNextCard()}
              disabled={currentCardIndex === activeDeckFlashcards.length - 1 && !isFlipped}
              className="p-3 sm:p-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">Review Decks</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Master your course material with spaced repetition flashcards.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <SlideButton label="Study Mode" isActive={isStudyMode} onToggle={toggleStudyMode} />
          <button 
            onClick={() => {
              resetCreationState();
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Deck
          </button>
        </div>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 transition-all outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
        <select 
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 outline-none"
        >
          <option>All Courses</option>
          {courses.map(c => <option key={c.id}>{c.code}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.map(deck => (
          <div key={deck.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Layers className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => handleDeleteDeck(deck.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                {deck.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">{deck.cardsCount} Cards</span>
                <span>•</span>
                <span>Last reviewed {deck.lastReviewed}</span>
              </p>
              
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mastery</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{deck.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${deck.progress}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-2">
              <button 
                onClick={() => handleStartReview(deck.id)}
                className="flex-[2] py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Review
              </button>
              <button 
                onClick={() => {
                  resetCreationState();
                  setAddCardsToDeckId(deck.id);
                  setCreationMode('manual');
                }}
                className="flex-1 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        ))}
        {filteredDecks.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-600">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No decks found</h3>
            <p className="text-slate-500 dark:text-slate-400">Create your first review deck to get started!</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deckToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeckToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 text-center border border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Deck?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">This will permanently remove the deck and all its flashcards. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeckToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Cards to Existing Deck Modal */}
      <AnimatePresence>
        {addCardsToDeckId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetCreationState}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add Cards to Deck</h3>
                <button onClick={resetCreationState} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Front Side</label>
                      <textarea
                        value={currentManualFront}
                        onChange={(e) => setCurrentManualFront(e.target.value)}
                        placeholder="Question or term..."
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 transition-all outline-none text-sm text-slate-800 dark:text-slate-200 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Back Side</label>
                      <textarea
                        value={currentManualBack}
                        onChange={(e) => setCurrentManualBack(e.target.value)}
                        placeholder="Answer or definition..."
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 transition-all outline-none text-sm text-slate-800 dark:text-slate-200 resize-none"
                      />
                    </div>
                    <button
                      onClick={addManualCard}
                      disabled={!currentManualFront.trim() || !currentManualBack.trim()}
                      className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-50"
                    >
                      {editingManualCardIndex !== null ? 'Update Card' : 'Add Card to List'}
                    </button>
                    {editingManualCardIndex !== null && (
                      <button
                        onClick={() => {
                          setEditingManualCardIndex(null);
                          setCurrentManualFront('');
                          setCurrentManualBack('');
                        }}
                        className="w-full py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {manualCards.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added Cards ({manualCards.length})</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {manualCards.map((card, idx) => (
                          <div key={idx} className={`p-3 border rounded-xl flex items-center justify-between gap-3 group transition-all ${editingManualCardIndex === idx ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{card.front}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{card.back}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => editManualCard(idx)}
                                className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => removeManualCard(idx)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleAddCardsToExisting}
                  disabled={manualCards.length === 0 || isCreating}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adding Cards...
                    </>
                  ) : (
                    `Add ${manualCards.length} Cards to Deck`
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetCreationState}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Create New Deck</h3>
                <button onClick={resetCreationState} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deck Title</label>
                  <input
                    type="text"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    placeholder="e.g. Midterm Review"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 transition-all outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course</label>
                  <select 
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 transition-all outline-none text-slate-800 dark:text-slate-200"
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      onClick={() => setCreationMode('upload')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${creationMode === 'upload' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                      Upload File
                    </button>
                    <button
                      onClick={() => setCreationMode('manual')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${creationMode === 'manual' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                      Manual Entry
                    </button>
                  </div>

                  {creationMode === 'upload' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upload Material (Optional)</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                          accept=".pdf,.doc,.docx,.txt"
                        />
                        {uploadFile ? (
                          <div className="flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-8 h-8" />
                            <div className="text-left">
                              <p className="font-bold text-sm truncate max-w-[200px]">{uploadFile.name}</p>
                              <p className="text-xs opacity-70">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Click to upload study material</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">PDF (max 750KB), DOC, TXT</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Front Side</label>
                          <textarea
                            value={currentManualFront}
                            onChange={(e) => setCurrentManualFront(e.target.value)}
                            placeholder="Question or term..."
                            rows={2}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 transition-all outline-none text-sm text-slate-800 dark:text-slate-200 resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Back Side</label>
                          <textarea
                            value={currentManualBack}
                            onChange={(e) => setCurrentManualBack(e.target.value)}
                            placeholder="Answer or definition..."
                            rows={2}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 transition-all outline-none text-sm text-slate-800 dark:text-slate-200 resize-none"
                          />
                        </div>
                        <button
                          onClick={addManualCard}
                          disabled={!currentManualFront.trim() || !currentManualBack.trim()}
                          className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-50"
                        >
                          {editingManualCardIndex !== null ? 'Update Card' : 'Add Card to List'}
                        </button>
                        {editingManualCardIndex !== null && (
                          <button
                            onClick={() => {
                              setEditingManualCardIndex(null);
                              setCurrentManualFront('');
                              setCurrentManualBack('');
                            }}
                            className="w-full py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      {manualCards.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added Cards ({manualCards.length})</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {manualCards.map((card, idx) => (
                              <div key={idx} className={`p-3 border rounded-xl flex items-center justify-between gap-3 group transition-all ${editingManualCardIndex === idx ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{card.front}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{card.back}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => editManualCard(idx)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => removeManualCard(idx)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleCreateDeck}
                  disabled={!newDeckTitle.trim() || isCreating || (creationMode === 'manual' && manualCards.length === 0)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {creationMode === 'upload' && uploadFile ? 'Generating Flashcards...' : 'Creating Deck...'}
                    </>
                  ) : (
                    'Create Deck'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReviewDecks;
