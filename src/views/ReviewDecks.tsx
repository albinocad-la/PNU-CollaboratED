import { courses } from '../data';
import { Layers, Play, Plus, Search, MoreVertical, RotateCcw, ChevronLeft, ChevronRight, Check, X, Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ReviewDeck, Flashcard } from '../types';
import { subscribeToDecks, getFlashcards, createDeck, addFlashcard, deleteDeck, generateFlashcardsFromFile } from '../services/deckService';

interface ReviewDecksProps {
  user: User;
}

const ReviewDecks: React.FC<ReviewDecksProps> = ({ user }) => {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('All Courses');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDecks(user.uid, (data) => {
      setDecks(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleStartReview = async (deckId: string) => {
    const cards = await getFlashcards(deckId);
    if (cards.length === 0) {
      alert("This deck has no cards yet!");
      return;
    }
    setActiveDeckFlashcards(cards);
    setActiveDeckId(deckId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleNextCard = () => {
    if (currentCardIndex < activeDeckFlashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentCardIndex(prev => prev + 1), 150);
    } else {
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
      
      if (uploadFile) {
        // Convert file to flashcards using Gemini
        const generatedCards = await generateFlashcardsFromFile(uploadFile);
        for (const card of generatedCards) {
          await addFlashcard(deckId, card.front, card.back);
        }
      }
      
      setShowCreateModal(false);
      setNewDeckTitle('');
      setUploadFile(null);
    } catch (error) {
      console.error("Error creating deck:", error);
      alert("Failed to create deck. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        return;
      }
      setUploadFile(file);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (confirm("Are you sure you want to delete this deck?")) {
      await deleteDeck(deckId);
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
            className="self-start text-slate-500 hover:text-slate-800 font-medium flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">{deck?.title}</h2>
            <p className="text-xs sm:text-sm text-slate-500">Card {currentCardIndex + 1} of {activeDeckFlashcards.length}</p>
          </div>
          <div className="w-full sm:w-24">
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
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
              className="w-full max-w-2xl aspect-[4/3] sm:aspect-[3/2] bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 cursor-pointer flex items-center justify-center p-6 sm:p-12 text-center relative"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400">
                <RotateCcw className="w-4 h-4 sm:w-5 h-5" />
              </div>
              <h3 className="text-xl sm:text-3xl md:text-4xl font-medium text-slate-800 leading-relaxed">
                {isFlipped ? currentCard?.back : currentCard?.front}
              </h3>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 sm:mt-12 flex items-center gap-4 sm:gap-6">
            <button 
              onClick={handlePrevCard}
              disabled={currentCardIndex === 0}
              className="p-3 sm:p-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 h-6" />
            </button>
            
            {isFlipped ? (
              <div className="flex gap-2 sm:gap-4">
                <button 
                  onClick={handleNextCard}
                  className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <X className="w-4 h-4 sm:w-5 h-5" /> Again
                </button>
                <button 
                  onClick={handleNextCard}
                  className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-emerald-50 text-emerald-600 font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
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
              onClick={handleNextCard}
              disabled={currentCardIndex === activeDeckFlashcards.length - 1 && !isFlipped}
              className="p-3 sm:p-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-2">Review Decks</h2>
          <p className="text-slate-500 text-sm sm:text-base">Master your course material with spaced repetition flashcards.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Deck
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
        </div>
        <select 
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          <option>All Courses</option>
          {courses.map(c => <option key={c.id}>{c.code}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.map(deck => (
          <div key={deck.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <Layers className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => handleDeleteDeck(deck.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                {deck.title}
              </h3>
              <p className="text-sm text-slate-500 mb-6 flex items-center gap-2">
                <span className="font-medium text-slate-700">{deck.cardsCount} Cards</span>
                <span>â€¢</span>
                <span>Last reviewed {deck.lastReviewed}</span>
              </p>
              
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700 uppercase tracking-wider">Mastery</span>
                  <span className="text-indigo-600 font-bold">{deck.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${deck.progress}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => handleStartReview(deck.id)}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Review Now
              </button>
            </div>
          </div>
        ))}
        {filteredDecks.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No decks found</h3>
            <p className="text-slate-500">Create your first review deck to get started!</p>
          </div>
        )}
      </div>

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Create New Deck</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deck Title</label>
                  <input
                    type="text"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    placeholder="e.g. Midterm Review"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course</label>
                  <select 
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Material (Optional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-3 text-indigo-600">
                        <FileText className="w-8 h-8" />
                        <div className="text-left">
                          <p className="font-bold text-sm truncate max-w-[200px]">{uploadFile.name}</p>
                          <p className="text-xs opacity-70">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                          className="p-1 hover:bg-indigo-100 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Click to upload study material</p>
                        <p className="text-xs text-slate-400">PDF, DOC, TXT up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={handleCreateDeck}
                  disabled={!newDeckTitle.trim() || isCreating}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadFile ? 'Generating Flashcards...' : 'Creating Deck...'}
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
