import { useState, useEffect } from 'react';
import { courses, assignments, reviewDecks, chats } from '../data';
import { Clock, CheckCircle2, AlertCircle, BookOpen, Layers, ArrowRight, MessageCircle, Loader2, Users, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import SlideButton from '../components/SlideButton';
import { useStudy } from '../contexts/StudyContext';

interface DashboardProps {
  onCourseClick: (courseId: string) => void;
  onChatClick: (chatId: string) => void;
  onViewAllCourses: () => void;
  onViewCalendar: () => void;
  onNavigate: (view: any) => void;
  user: User;
  profile: any;
  key?: string;
}

export default function Dashboard({ onCourseClick, onChatClick, onViewAllCourses, onViewCalendar, onNavigate, user, profile }: DashboardProps) {
  const { isFocusMode, isStudyMode, toggleFocusMode, toggleStudyMode } = useStudy();
  const [loading, setLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState({
    studyTime: 0,
    cardsReviewed: 0,
  });

  useEffect(() => {
    if (!user) return;

    // Get start of current week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const q = query(
      sessionsRef,
      where('startTime', '>=', startOfWeek)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalMinutes = 0;
      let totalCards = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        totalMinutes += data.durationMinutes || 0;
        totalCards += data.cardsReviewed || 0;
      });
      
      setWeeklyStats({
        studyTime: totalMinutes,
        cardsReviewed: totalCards
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching weekly stats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const recentDecks = reviewDecks.slice(0, 2);
  
  const displayName = profile?.displayName || user.displayName || 'Student';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto bg-slate-50/50 dark:bg-slate-900/50 min-h-screen transition-colors duration-300"
    >
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {displayName}! 👋</h2>
          <div className="text-indigo-100 text-base sm:text-lg max-w-xl space-y-4">
            <p>Ready to start your study session? Check your courses and review decks below.</p>
            <button 
              onClick={toggleStudyMode}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                isStudyMode 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'
              }`}
            >
              <Brain className="w-4 h-4" />
              {isStudyMode ? 'End Study Session' : 'Start Study Session'}
            </button>
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
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Current Courses
              </h3>
              <button 
                onClick={onViewAllCourses}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.slice(0, 4).map(course => (
                <div 
                  key={course.id} 
                  onClick={() => onCourseClick(course.id)}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
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
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        title="Course Chat"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                        {course.code}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-indigo-600 transition-colors">{course.name}</h4>
                </div>
              ))}
            </div>
          </section>

          {/* Review Decks Quick Access */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                Recent Review Decks
              </h3>
              <button 
                onClick={() => onNavigate('decks')}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentDecks.map(deck => (
                <div 
                  key={deck.id} 
                  onClick={() => onNavigate('decks')}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:border-purple-300 dark:hover:border-purple-500 transition-all group"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-purple-600 transition-colors">{deck.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{deck.cardsCount} cards â€¢ Last reviewed {deck.lastReviewed}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Mastery</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{deck.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
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
          {/* Quick Settings */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick Settings</h3>
            <div className="space-y-4">
              <SlideButton label="Study Mode" activeColor="bg-indigo-600" inactiveColor="bg-slate-200 dark:bg-slate-700" isActive={isStudyMode} onToggle={toggleStudyMode} />
              <SlideButton label="Focus Mode" activeColor="bg-emerald-500" inactiveColor="bg-slate-200 dark:bg-slate-700" isActive={isFocusMode} onToggle={toggleFocusMode} />
            </div>
          </section>

          {/* Calendar Quick Access */}
          <section 
            onClick={onViewCalendar}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Calendar
              </h3>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">UTS Midterm Exam</p>
                  <p className="text-[10px] text-slate-500">Tomorrow, 10:00 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">RPH Quiz</p>
                  <p className="text-[10px] text-slate-500">Mar 25, 2:00 PM</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <section 
            onClick={() => onNavigate('profile')}
            className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 text-white shadow-lg cursor-pointer hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Weekly Progress</h3>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 dark:text-slate-500 text-sm">Cards Reviewed</span>
                <span className="font-bold text-xl">{weeklyStats.cardsReviewed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 dark:text-slate-500 text-sm">Study Hours</span>
                <span className="font-bold text-xl">{(weeklyStats.studyTime / 60).toFixed(1)}</span>
              </div>
            </div>
          </section>

          {/* Community Quick Access */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Community
              </h3>
              <button 
                onClick={() => onNavigate('community')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Find Friends
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Connect with other students to share notes and study together.</p>
            <button 
              onClick={() => onNavigate('community')}
              className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
            >
              Go to Community
            </button>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
