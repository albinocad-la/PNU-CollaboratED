import { useState, useEffect } from 'react';
import { courses, assignments, reviewDecks, chats } from '../data';
import { Clock, CheckCircle2, AlertCircle, BookOpen, Layers, ArrowRight, MessageCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';
import { subscribeToStudyGroups, StudyGroup } from '../services/studyGroupService';
import { db } from '../firebase';
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore';

interface DashboardProps {
  onCourseClick: (courseId: string) => void;
  onChatClick: (chatId: string) => void;
  onViewAllCourses: () => void;
  onViewCalendar: () => void;
  user: User;
  profile: any;
  key?: string;
}

export default function Dashboard({ onCourseClick, onChatClick, onViewAllCourses, onViewCalendar, user, profile }: DashboardProps) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroupsCount, setActiveGroupsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToStudyGroups((fetchedGroups) => {
      setGroups(fetchedGroups);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // This is a bit complex to do for all groups at once in Firestore without a cloud function
    // But we can estimate "active" groups by checking their lastActive field
    // A group is "active" if someone interacted with it in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const active = groups.filter(g => {
      const lastActive = g.lastActive?.toDate ? g.lastActive.toDate() : new Date(g.lastActive);
      return lastActive > fiveMinutesAgo;
    });
    setActiveGroupsCount(active.length);
  }, [groups]);

  const recentDecks = reviewDecks.slice(0, 2);
  
  const mostActiveChat = groups[0] || chats[0];
  const displayName = profile?.displayName || user.displayName || 'Student';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto"
    >
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {displayName}! 👋</h2>
          <div className="text-indigo-100 text-base sm:text-lg max-w-xl space-y-1">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Checking active groups...</p>
              </div>
            ) : (
              <>
                <p>
                  You have <span className="font-bold text-white">{activeGroupsCount}</span> study groups active right now.
                </p>
                {mostActiveChat && (
                  <p className="text-sm opacity-90 italic">
                    Trending: <span className="font-semibold text-white">#{mostActiveChat.name}</span> is very active today!
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Enrolled Courses */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Current Courses
              </h3>
              <button 
                onClick={onViewAllCourses}
                className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(course => (
                <div 
                  key={course.id} 
                  onClick={() => onCourseClick(course.id)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${course.color} flex items-center justify-center text-white font-bold text-lg`}>
                      {course.code.substring(0, 2)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onChatClick(course.id);
                        }}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Course Chat"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                        {course.code}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{course.name}</h4>
                </div>
              ))}
            </div>
          </section>

          {/* Review Decks Quick Access */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                Recent Review Decks
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentDecks.map(deck => (
                <div key={deck.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">{deck.title}</h4>
                    <p className="text-xs text-slate-500 mb-4">{deck.cardsCount} cards â€¢ Last reviewed {deck.lastReviewed}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-700">Mastery</span>
                      <span className="text-indigo-600 font-bold">{deck.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${deck.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Quick Stats */}
          <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Weekly Progress</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Cards Reviewed</span>
                <span className="font-bold text-xl">142</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Study Hours</span>
                <span className="font-bold text-xl">12.5</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
