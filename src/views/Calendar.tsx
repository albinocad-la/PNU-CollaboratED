import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2,
  Loader2
} from 'lucide-react';
import { assignments, courses } from '../data';
import { db, auth } from '../firebase';
import SlideButton from '../components/SlideButton';
import { useStudy } from '../contexts/StudyContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

interface Todo {
  id: string;
  userId: string;
  date: string;
  text: string;
  completed: boolean;
  createdAt: any;
}

export default function Calendar() {
  const { isStudyMode, toggleStudyMode } = useStudy();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  // Fetch todos for the current month
  useEffect(() => {
    if (!auth.currentUser) return;

    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth(year, month)}`;

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth),
      orderBy('date', 'asc'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      setTodos(todosData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching todos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const getAssignmentsForDay = (day: number) => {
    return assignments.filter(a => {
      const dueDate = new Date(a.dueDate);
      return dueDate.getFullYear() === year && dueDate.getMonth() === month && dueDate.getDate() === day;
    });
  };

  const getTodosForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return todos.filter(t => t.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !selectedDay || !auth.currentUser) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    try {
      await addDoc(collection(db, 'todos'), {
        userId: auth.currentUser.uid,
        date: dateStr,
        text: newTodo.trim(),
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTodo('');
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        completed: !todo.completed
      });
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const selectedDateStr = selectedDay 
    ? `${monthName} ${selectedDay}, ${year}`
    : 'Select a date';

  const selectedDayTodos = selectedDay ? getTodosForDay(selectedDay) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{monthName} {year}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Academic Schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SlideButton label="Study Mode" isActive={isStudyMode} onToggle={toggleStudyMode} />
              <button 
                onClick={prevMonth}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDay(new Date().getDate());
                }}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
              >
                Today
              </button>
              <button 
                onClick={nextMonth}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-slate-600 dark:text-slate-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50/30 dark:bg-slate-800/30">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[100px] sm:auto-rows-[120px]">
            {days.map((day, index) => {
              const dayAssignments = day ? getAssignmentsForDay(day) : [];
              const dayTodos = day ? getTodosForDay(day) : [];
              const today = day ? isToday(day) : false;
              const isSelected = day === selectedDay;

              return (
                <div 
                  key={index} 
                  onClick={() => day && setSelectedDay(day)}
                  className={`border-r border-b border-slate-100 dark:border-slate-800 p-1 sm:p-2 transition-all cursor-pointer relative group ${
                    !day ? 'bg-slate-50/20 dark:bg-slate-800/20' : isSelected ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm font-bold rounded-lg ${
                          today ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40' : isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {day}
                        </span>
                        {dayTodos.length > 0 && (
                          <div className="flex gap-0.5">
                            {dayTodos.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-1 h-1 rounded-full bg-indigo-400"></div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {dayAssignments.slice(0, 2).map(assignment => {
                          const course = courses.find(c => c.id === assignment.courseId);
                          return (
                            <div 
                              key={assignment.id}
                              className={`text-[8px] sm:text-[10px] p-0.5 sm:p-1 rounded-md border truncate font-medium ${
                                assignment.status === 'completed' 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                                  : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                              }`}
                            >
                              {assignment.title}
                            </div>
                          );
                        })}
                        {dayTodos.length > 0 && dayAssignments.length < 2 && (
                          <div className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 italic px-1">
                            {dayTodos.length} task{dayTodos.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: To-do List */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[500px] lg:h-[600px]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tasks for</h3>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{selectedDateStr}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {selectedDay ? (
                <>
                  <form onSubmit={handleAddTodo} className="relative">
                    <input
                      type="text"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      placeholder="Add a new task..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={!newTodo.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {selectedDayTodos.length > 0 ? (
                        selectedDayTodos.map((todo) => (
                          <motion.div
                            key={todo.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                              todo.completed 
                                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-sm'
                            }`}
                          >
                            <button
                              onClick={() => toggleTodo(todo)}
                              className={`flex-shrink-0 transition-colors ${
                                todo.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'
                              }`}
                            >
                              {todo.completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                              {todo.text}
                            </span>
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="text-sm text-slate-400 dark:text-slate-500">No tasks for this day</p>
                          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Add one to get started!</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">Select a date to manage tasks</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <AlertCircle className="w-4 h-4 text-indigo-500" />
                <p>Tasks are saved automatically to your profile.</p>
              </div>
            </div>
          </div>

          <section className="bg-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Study Tip</h3>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Break down large assignments into smaller, manageable tasks in your to-do list to stay productive.
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-5 rounded-full blur-2xl"></div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
