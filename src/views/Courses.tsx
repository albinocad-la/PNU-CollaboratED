import { courses, assignments } from '../data';
import { BookOpen, Calendar, FileText, Users, ChevronRight, CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface CoursesProps {
  onCourseClick: (courseId: string) => void;
  onChatClick: (chatId: string) => void;
  key?: string;
}

export default function Courses({ onCourseClick, onChatClick }: CoursesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-2">My Courses</h2>
          <p className="text-slate-500 text-sm sm:text-base">Manage your enrolled courses and track your progress.</p>
        </div>
        <button className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          Browse Catalog
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.map(course => {
          const courseAssignments = assignments.filter(a => a.courseId === course.id);
          const pendingCount = courseAssignments.filter(a => a.status === 'pending').length;

          return (
            <div 
              key={course.id} 
              onClick={() => onCourseClick(course.id)}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={`h-24 ${course.color} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                  <h3 className="text-2xl font-bold text-white tracking-tight">{course.code}</h3>
                </div>
              </div>
              
              <div className="p-6">
                <h4 className="text-xl font-semibold text-slate-800 mb-4">{course.name}</h4>
                
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <img key={i} src={`https://i.pravatar.cc/150?u=${course.id}${i}`} alt="Classmate" className="w-8 h-8 rounded-full border-2 border-white" referrerPolicy="no-referrer" />
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                        +24
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onChatClick(course.id);
                      }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      title="Course Chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="text-indigo-600 font-medium text-sm flex items-center gap-1 hover:underline">
                    Go to Course <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
