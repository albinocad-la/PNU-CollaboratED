import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, Clock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { User } from 'firebase/auth';
import { assignments, courses } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import SlideButton from './SlideButton';
import { useStudy } from '../contexts/StudyContext';
import { useSearch } from '../contexts/SearchContext';
import { View } from '../types';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  onProfileClick: () => void;
  onNavigate: (view: View) => void;
  onBack?: () => void;
  showBack?: boolean;
  user: User;
  profile: any;
}

export default function Header({ title, onMenuToggle, onProfileClick, onNavigate, onBack, showBack, user, profile }: HeaderProps) {
  const { isStudyMode, toggleStudyMode } = useStudy();
  const { searchQuery, setSearchQuery, setIsSearchActive } = useSearch();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (title !== 'Search Results' && searchQuery) {
      setSearchQuery('');
      setIsSearchActive(false);
    }
  }, [title]);
  
  const displayName = profile?.displayName || user.displayName || 'User';
  const photoURL = profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${displayName}`;

  const pendingAssignments = assignments
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const unreadCount = pendingAssignments.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-2 sm:gap-4">
        {showBack ? (
          <button 
            onClick={onBack}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>
        ) : (
          <button 
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-[150px] sm:max-w-none">{title}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden lg:block">
          <SlideButton label="Study Mode" isActive={isStudyMode} onToggle={toggleStudyMode} />
        </div>
        <div className="relative hidden md:block">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) {
                onNavigate('search');
                setIsSearchActive(true);
              } else {
                setIsSearchActive(false);
              }
            }}
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent rounded-full focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 transition-all w-48 lg:w-64 text-sm outline-none dark:text-slate-100"
          />
        </div>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 rounded-full transition-all ${isNotificationsOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center bg-red-500 rounded-full border-2 border-white dark:border-slate-900 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50"
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Notifications</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full uppercase tracking-wider">
                    {unreadCount} Pending
                  </span>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto dark:bg-slate-900">
                  {pendingAssignments.length > 0 ? (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {pendingAssignments.map((assignment) => {
                        const course = courses.find(c => c.id === assignment.courseId);
                        const dueDate = new Date(assignment.dueDate);
                        const isOverdue = dueDate < new Date();
                        const isSoon = !isOverdue && (dueDate.getTime() - new Date().getTime() < 86400000 * 2);

                        return (
                          <div key={assignment.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                            <div className="flex gap-3">
                              <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                                isOverdue ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 
                                isSoon ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 
                                'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'
                              }`}>
                                {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                                    {assignment.title}
                                  </p>
                                  {isOverdue && (
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter shrink-0">Overdue</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${course?.color.replace('bg-', 'bg-opacity-10 text-')} bg-opacity-10`}>
                                    {course?.code}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white dark:bg-slate-900">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">All caught up!</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No pending assignments found.</p>
                    </div>
                  )}
                </div>
                
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    View All Activities
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={onProfileClick}
          className="flex items-center gap-3 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-80 transition-opacity text-left"
        >
          <img
            src={photoURL}
            alt="User avatar"
            className="w-8 h-8 sm:w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            referrerPolicy="no-referrer"
          />
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{displayName}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
          </div>
        </button>
      </div>
    </header>
  );
}
