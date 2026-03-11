import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { assignments, courses } from '../data';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Add empty slots for days before the first day of the month
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const getAssignmentsForDay = (day: number) => {
    return assignments.filter(a => {
      const dueDate = new Date(a.dueDate);
      return dueDate.getFullYear() === year && dueDate.getMonth() === month && dueDate.getDate() === day;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row gap-8">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{monthName} {year}</h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Academic Schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth}
                className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
              >
                Today
              </button>
              <button 
                onClick={nextMonth}
                className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[120px]">
            {days.map((day, index) => {
              const dayAssignments = day ? getAssignmentsForDay(day) : [];
              const today = day ? isToday(day) : false;

              return (
                <div 
                  key={index} 
                  className={`border-r border-b border-slate-100 p-2 transition-colors hover:bg-slate-50/50 relative ${!day ? 'bg-slate-50/20' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-lg mb-1 ${
                        today ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600'
                      }`}>
                        {day}
                      </span>
                      <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                        {dayAssignments.map(assignment => {
                          const course = courses.find(c => c.id === assignment.courseId);
                          return (
                            <div 
                              key={assignment.id}
                              className={`text-[10px] p-1 rounded-md border truncate font-medium ${
                                assignment.status === 'completed' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                  : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                              }`}
                            >
                              <span className="opacity-70 mr-1">[{course?.code}]</span>
                              {assignment.title}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Study Tip */}
        <div className="w-full md:w-80 space-y-6">
          <section className="bg-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Study Tip</h3>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Use the calendar to plan your study sessions and stay organized with your course schedule.
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-5 rounded-full blur-2xl"></div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
