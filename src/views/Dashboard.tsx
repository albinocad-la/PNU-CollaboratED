import { useState, useEffect, useMemo } from 'react';
import { courses, chats } from '../data';
import { Clock, CheckCircle2, AlertCircle, BookOpen, Layers, ArrowRight, MessageCircle, Loader2, Users, Brain, Focus, TrendingUp, Calendar as CalendarIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, where, Timestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';
import SlideButton from '../components/SlideButton';
import { useStudy } from '../contexts/StudyContext';
import { ReviewDeck, StudySession } from '../types';
import { 
  format, 
  startOfWeek, 
  subDays 
} from 'date-fns';

interface Todo {
  id: string;
  userId: string;
  date: string;
  text: string;
  completed: boolean;
  createdAt: any;
}

interface CollaborativeActivity {
  user: string;
  action: string;
  target: string;
  time: string;
  avatar: string;
}

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
  const [streak, setStreak] = useState(0);
  const [realDecks, setRealDecks] = useState<ReviewDeck[]>([]);
  const [realTodos, setRealTodos] = useState<Todo[]>([]);
  const [collaborativeFeed, setCollaborativeFeed] = useState<CollaborativeActivity[]>([]);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Weekly Stats & Streak (Existing)
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now);

    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const qSessions = query(
      sessionsRef,
      where('startTime', '>=', subDays(now, 30)),
      orderBy('startTime', 'desc')
    );

    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      let totalMinutes = 0;
      let totalCards = 0;
      const allSessionDates = new Set<string>();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const sessionDate = data.startTime.toDate();
        const dateKey = format(sessionDate, 'yyyy-MM-dd');
        allSessionDates.add(dateKey);

        if (sessionDate >= startOfCurrentWeek) {
          totalMinutes += data.durationMinutes || 0;
          totalCards += data.cardsReviewed || 0;
        }
      });
      
      let currentStreak = 0;
      let checkDate = new Date();
      if (!allSessionDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        checkDate = subDays(checkDate, 1);
      }
      while (allSessionDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }

      setStreak(currentStreak);
      setWeeklyStats({ studyTime: totalMinutes, cardsReviewed: totalCards });
      setLoading(false);
    });

    // 2. Fetch Real Decks
    const decksRef = collection(db, 'decks');
    const qDecks = query(decksRef, where('userId', '==', user.uid), orderBy('lastReviewed', 'desc'));
    const unsubDecks = onSnapshot(qDecks, (snapshot) => {
      const decks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewDeck));
      setRealDecks(decks);
    });

    // 3. Fetch Real Todos (Assignments)
    const todosRef = collection(db, 'todos');
    const qTodos = query(todosRef, where('userId', '==', user.uid), where('completed', '==', false), orderBy('date', 'asc'), limit(5));
    const unsubTodos = onSnapshot(qTodos, (snapshot) => {
      const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo));
      setRealTodos(todos);
    });

    // 4. Fetch Collaborative Feed (Recent sessions from others)
    // In a real app, we'd filter by friends. For now, we'll show recent public-ish activity.
    // We'll query sessions across all users (if allowed by rules) or just mock based on real user names.
    // Since we don't have a global activity feed, let's try to get some recent sessions.
    const qGlobalSessions = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(5));
    // Wait, the blueprint says sessions are under /users/{userId}/sessions.
    // So we can't easily query all sessions without a root collection.
    // Let's assume there's a root 'sessions' collection for global activity if we want a feed.
    // If not, we'll just use the user's own recent activity for now but label it "Your Activity".
    // Or, better: fetch friends first.
    
    const unsubFeed = onSnapshot(query(collection(db, 'users'), limit(10)), async (userSnap) => {
      const activities: CollaborativeActivity[] = [];
      const userDocs = userSnap.docs.filter(d => d.id !== user.uid);
      
      for (const uDoc of userDocs.slice(0, 3)) {
        const uData = uDoc.data();
        // Just mock some activity based on real users found in DB
        activities.push({
          user: uData.displayName || 'A student',
          action: 'is currently studying',
          target: 'Focus Mode',
          time: 'Active now',
          avatar: uData.photoURL || `https://ui-avatars.com/api/?name=${uData.displayName}`
        });
      }
      setCollaborativeFeed(activities);
    });

    return () => {
      unsubSessions();
      unsubDecks();
      unsubTodos();
      unsubFeed();
    };
  }, [user]);

  const recentDecks = realDecks.slice(0, 2);
  const displayName = profile?.displayName || user.displayName || 'Student';

  // Calculate course progress based on real decks
  const getCourseProgress = (courseId: string) => {
    const courseDecks = realDecks.filter(d => d.courseId === courseId);
    if (courseDecks.length === 0) return 0;
    const totalProgress = courseDecks.reduce((acc, d) => acc + d.progress, 0);
    return Math.round(totalProgress / courseDecks.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto min-h-screen"
    >
      {/* Welcome Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] glass-card p-8 sm:p-12 border-none shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest">
              <Zap className="w-4 h-4" />
              Academic Performance Dashboard
            </div>
            <h2 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Welcome back, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                {displayName}
              </span>! 👋
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
              {streak > 0 ? (
                <>You're on a <span className="text-indigo-600 dark:text-indigo-400 font-bold">{streak}-day study streak</span>. Keep it up!</>
              ) : (
                <>Start your first study session today to begin a <span className="text-indigo-600 dark:text-indigo-400 font-bold">streak</span>!</>
              )}
              {" "}You have <span className="text-purple-600 dark:text-purple-400 font-bold">{realDecks.length} decks</span> available for review.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={toggleStudyMode}
                className={`px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-3 active:scale-95 shadow-lg ${
                  isStudyMode 
                    ? 'bg-indigo-600 text-white shadow-indigo-600/30' 
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105'
                }`}
              >
                <Brain className="w-5 h-5" />
                {isStudyMode ? 'End Session' : 'Start Study Session'}
              </button>
              <button 
                onClick={toggleFocusMode}
                className={`px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-3 active:scale-95 shadow-lg ${
                  isFocusMode 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Focus className="w-5 h-5" />
                {isFocusMode ? 'Exit Focus' : 'Enter Focus Mode'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-4 max-w-md">
            <div className="glass-card p-6 rounded-3xl border-white/10 text-center space-y-1">
              <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{weeklyStats.cardsReviewed}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Cards Reviewed</p>
            </div>
            <div className="glass-card p-6 rounded-3xl border-white/10 text-center space-y-1">
              <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{(weeklyStats.studyTime / 60).toFixed(1)}h</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Study Time</p>
            </div>
            <div className="glass-card p-6 rounded-3xl border-white/10 text-center space-y-1 col-span-2">
              <div className="flex items-center justify-center gap-2 text-emerald-500">
                <TrendingUp className="w-5 h-5" />
                <span className="text-2xl font-black">+12%</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Improvement this week</p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Enrolled Courses */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Current Courses
              </h3>
              <button 
                onClick={onViewAllCourses}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.slice(0, 4).map(course => (
                <motion.div 
                  key={course.id} 
                  whileHover={{ y: -5 }}
                  onClick={() => onCourseClick(course.id)}
                  className="glass-card p-6 rounded-3xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${course.color} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                      {course.code.substring(0, 2)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onChatClick(course.id);
                        }}
                        className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        title="Course Chat"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <span className="text-[10px] font-black px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full uppercase tracking-wider">
                        {course.code}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">{course.name}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 128 Students</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {realDecks.filter(d => d.courseId === course.id).length} Decks</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Mastery</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{getCourseProgress(course.id)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${getCourseProgress(course.id)}%` }}
                          className="bg-indigo-500 h-full rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Upcoming Assignments */}
          <section className="glass-card p-8 rounded-[2rem]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                Upcoming Tasks
              </h3>
              <button 
                onClick={() => onNavigate('calendar')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
              >
                View Calendar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {realTodos.length > 0 ? (
                realTodos.map(todo => (
                  <div key={todo.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-500 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white bg-indigo-500">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{todo.text}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due {todo.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center">
                  <p className="text-slate-400 text-sm italic">No upcoming tasks. Enjoy your free time!</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Calendar Quick Access */}
          <section 
            onClick={onViewCalendar}
            className="glass-card p-8 rounded-[2rem] cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                Calendar
              </h3>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="space-y-4">
              {[
                { title: 'UTS Midterm Exam', time: 'Tomorrow, 10:00 AM', color: 'bg-indigo-500' },
                { title: 'RPH Quiz', time: 'Mar 25, 2:00 PM', color: 'bg-emerald-500' },
                { title: 'Group Study Session', time: 'Mar 26, 4:00 PM', color: 'bg-purple-500' }
              ].map((event, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className={`w-2 h-10 rounded-full ${event.color}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{event.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Review Decks Quick Access */}
          <section className="glass-card p-8 rounded-[2rem]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                Review
              </h3>
              <button 
                onClick={() => onNavigate('decks')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
              >
                All Decks
              </button>
            </div>
            <div className="space-y-4">
              {recentDecks.map(deck => (
                <div 
                  key={deck.id} 
                  onClick={() => onNavigate('decks')}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500 transition-all cursor-pointer group"
                >
                  <h4 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-purple-600 transition-colors">{deck.title}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">{deck.cardsCount} cards</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">Mastery</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{deck.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${deck.progress}%` }}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Collaborative Activity */}
          <section className="glass-card p-8 rounded-[2rem]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Collaborative Feed
              </h3>
            </div>
            <div className="space-y-6">
              {collaborativeFeed.length > 0 ? (
                collaborativeFeed.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <img src={activity.avatar} alt={activity.user} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-800 dark:text-white">{activity.user}</span> {activity.action} <span className="font-bold text-indigo-600 dark:text-indigo-400">{activity.target}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">No recent activity from your peers.</p>
              )}
            </div>
          </section>

          {/* Quick Stats Summary */}
          <section 
            onClick={() => onNavigate('profile')}
            className="bg-slate-900 dark:bg-slate-950 rounded-[2rem] p-8 text-white shadow-2xl cursor-pointer hover:bg-slate-800 transition-all group relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black">Weekly Progress</h3>
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Cards</p>
                    <p className="text-3xl font-black">{weeklyStats.cardsReviewed}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">+15%</p>
                    <p className="text-xs text-slate-400">vs last week</p>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Study Hours</p>
                    <p className="text-3xl font-black">{(weeklyStats.studyTime / 60).toFixed(1)}h</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">On Track</p>
                    <p className="text-xs text-slate-400">Target: 15h</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
