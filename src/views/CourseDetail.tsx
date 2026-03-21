import React, { useState, useEffect } from 'react';
import { courses, assignments, reviewDecks } from '../data';
import { 
  ChevronLeft, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  FileText, 
  ArrowLeft, 
  Plus, 
  X, 
  Loader2, 
  ExternalLink,
  Video,
  File,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  addLearningMaterial, 
  subscribeToMaterials,
  deleteLearningMaterial
} from '../services/materialService';
import { subscribeToCourseDecks } from '../services/deckService';
import { auth } from '../firebase';
import { LearningMaterial, ReviewDeck } from '../types';

interface CourseDetailProps {
  courseId: string | null;
  onBack: () => void;
  onChatClick: (chatId: string) => void;
  onReviewClick: (deckId?: string) => void;
  key?: string;
}

export default function CourseDetail({ courseId, onBack, onChatClick, onReviewClick }: CourseDetailProps) {
  const course = courses.find(c => c.id === courseId);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialType, setNewMaterialType] = useState<'pdf' | 'study-guide' | 'video' | 'link'>('pdf');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  
  const [localMaterials, setLocalMaterials] = useState<LearningMaterial[]>([]);
  const [courseDecks, setCourseDecks] = useState<ReviewDeck[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseId || !auth.currentUser) return;
    
    const unsubscribeMaterials = subscribeToMaterials(courseId, (firestoreMaterials) => {
      setLocalMaterials(firestoreMaterials);
    });

    const unsubscribeDecks = subscribeToCourseDecks(auth.currentUser.uid, courseId, (decks) => {
      setCourseDecks(decks);
    });

    return () => {
      unsubscribeMaterials();
      unsubscribeDecks();
    };
  }, [courseId]);
  
  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Course not found.</p>
        <button onClick={onBack} className="mt-4 text-indigo-600 font-medium hover:underline">Go back</button>
      </div>
    );
  }

  const courseAssignments = assignments.filter(a => a.courseId === course.id);
  
  const completedAssignments = courseAssignments.filter(a => a.status === 'completed').length;
  const progressPercentage = courseAssignments.length > 0 
    ? Math.round((completedAssignments / courseAssignments.length) * 100) 
    : 0;

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialTitle || !newMaterialUrl || !courseId) {
      setError('Please provide both a title and a URL/File.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addLearningMaterial({
        courseId,
        title: newMaterialTitle,
        type: newMaterialType,
        url: newMaterialUrl
      });

      setIsAddMaterialModalOpen(false);
      setNewMaterialTitle('');
      setNewMaterialUrl('');
      setNewMaterialType('pdf');
    } catch (err) {
      console.error('Error adding material:', err);
      setError('Failed to add material. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 500KB for base64 storage in Firestore)
    if (file.size > 500 * 1024) {
      setError('File is too large. Please upload files smaller than 500KB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setNewMaterialUrl(base64);
      if (!newMaterialTitle) {
        setNewMaterialTitle(file.name);
      }
      // Auto-detect type
      if (file.type === 'application/pdf') setNewMaterialType('pdf');
      else if (file.type.startsWith('video/')) setNewMaterialType('video');
      
      setIsUploading(false);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-rose-500" />;
      case 'video': return <Video className="w-4 h-4 text-indigo-500" />;
      case 'study-guide': return <BookOpen className="w-4 h-4 text-emerald-500" />;
      default: return <File className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleMaterialClick = (material: LearningMaterial) => {
    // For external links that are not data URLs and not videos/PDFs, just open in new tab
    const isExternalLink = material.url.startsWith('http');
    const isDataUrl = material.url.startsWith('data:');
    const isVideo = material.type === 'video' || material.url.includes('youtube.com') || material.url.includes('vimeo.com');
    const isPdf = material.type === 'pdf' || material.url.toLowerCase().endsWith('.pdf') || material.url.includes('pdf');
    
    // If it's an external link and not a video or PDF, open in new tab to avoid iframe blocking
    if (isExternalLink && !isDataUrl && !isVideo && !isPdf) {
      window.open(material.url, '_blank');
      return;
    }
    setSelectedMaterial(material);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteLearningMaterial(materialId);
      setMaterialToDelete(null);
    } catch (err) {
      console.error('Error deleting material:', err);
      setError('Failed to delete material. Please try again.');
      setMaterialToDelete(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium mb-4"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Courses
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Course Info & Materials */}
        <div className="lg:w-2/3 space-y-8">
          <div className={`rounded-3xl p-8 text-white shadow-lg relative overflow-hidden ${course.color}`}>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium mb-4">
                {course.code}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">{course.name}</h2>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white/90">Course Overview</span>
                </div>
                <p className="text-sm text-white/70">Access your study materials and collaborate with classmates to master this course.</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          </div>

          {/* Learning Materials Section */}
          <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                Learning Materials
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md uppercase tracking-wider">
                  {localMaterials.length} Resources
                </span>
                <button 
                  onClick={() => setIsAddMaterialModalOpen(true)}
                  className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  title="Add Material"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {localMaterials.length > 0 ? (
                localMaterials.map(material => (
                  <div 
                    key={material.id}
                    onClick={() => handleMaterialClick(material)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      {getMaterialIcon(material.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {material.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                        {material.type.replace('-', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      {auth.currentUser?.uid === material.addedBy && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMaterialToDelete(material.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
                          title="Delete Material"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No learning materials uploaded yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Review Decks */}
        <div className="lg:w-1/3 space-y-8">
          {/* Review Decks */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              Review Decks
            </h3>
            <div className="space-y-4">
              {courseDecks.length > 0 ? (
                courseDecks.map(deck => (
                  <div 
                    key={deck.id} 
                    onClick={() => onReviewClick(deck.id)}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all cursor-pointer"
                  >
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{deck.title}</h4>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">{deck.cardsCount} cards</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">{deck.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${deck.progress}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No review decks yet.</p>
              )}
              <button 
                onClick={() => onReviewClick()}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                Start Review Session
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Material Viewer Modal */}
      <AnimatePresence>
        {selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMaterial(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    {getMaterialIcon(selectedMaterial.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{selectedMaterial.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{selectedMaterial.type.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={selectedMaterial.url} 
                    download={selectedMaterial.title}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400 flex items-center gap-2 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open Original</span>
                  </a>
                  <button onClick={() => setSelectedMaterial(null)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
                {selectedMaterial.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <video 
                      src={selectedMaterial.url} 
                      controls 
                      className="max-w-full max-h-full"
                      autoPlay
                    />
                  </div>
                ) : selectedMaterial.type === 'pdf' || selectedMaterial.url.startsWith('data:application/pdf') ? (
                  <iframe 
                    src={selectedMaterial.url} 
                    className="w-full h-full border-none"
                    title={selectedMaterial.title}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6">
                      {getMaterialIcon(selectedMaterial.type)}
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 dark:text-white">Preview not available</h4>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">This resource type cannot be previewed directly. Please open it in a new tab to view the full content.</p>
                    <a 
                      href={selectedMaterial.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Open Resource
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {materialToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMaterialToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-sm relative z-10 overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Material?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">This action cannot be undone. Are you sure you want to remove this resource?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMaterialToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteMaterial(materialToDelete)}
                  className="flex-1 py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 dark:shadow-rose-900/40"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Material Modal */}
      <AnimatePresence>
        {isAddMaterialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMaterialModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add Learning Material</h3>
                <button onClick={() => { setIsAddMaterialModalOpen(false); setError(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Material Title</label>
                  <input 
                    type="text" 
                    required
                    value={newMaterialTitle}
                    onChange={(e) => setNewMaterialTitle(e.target.value)}
                    placeholder="e.g. Chapter 1 Summary"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Resource Type</label>
                  <select 
                    value={newMaterialType}
                    onChange={(e) => setNewMaterialType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="study-guide">Study Guide</option>
                    <option value="video">Video Lecture</option>
                    <option value="link">External Link</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => { setNewMaterialUrl(''); setNewMaterialType('pdf'); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!newMaterialUrl.startsWith('data:') ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      Add Link
                    </button>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newMaterialUrl.startsWith('data:') ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      Upload File
                    </button>
                  </div>

                  {newMaterialUrl.startsWith('data:') ? (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center">
                          {getMaterialIcon(newMaterialType)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{newMaterialTitle || 'File selected'}</p>
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">{newMaterialType}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { setNewMaterialUrl(''); setNewMaterialTitle(''); }}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Resource URL</label>
                      <input 
                        type="url" 
                        required
                        value={newMaterialUrl}
                        onChange={(e) => setNewMaterialUrl(e.target.value)}
                        placeholder="https://example.com/resource.pdf"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,video/*"
                />
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Resource'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
