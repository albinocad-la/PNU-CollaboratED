import { courses, assignments, studyGroups, reviewDecks } from '../data';
import { ChevronLeft, BookOpen, Clock, CheckCircle2, AlertCircle, Users, Layers, FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface CourseDetailProps {
  courseId: string | null;
  onBack: () => void;
  key?: string;
}

export default function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Course not found.</p>
        <button onClick={onBack} className="mt-4 text-indigo-600 font-medium hover:underline">Go back</button>
      </div>
    );
  }

  const courseAssignments = assignments.filter(a => a.courseId === course.id);
  const courseGroups = studyGroups.filter(g => g.courseId === course.id);
  const courseDecks = reviewDecks.filter(d => d.courseId === course.id);
  
  const completedAssignments = courseAssignments.filter(a => a.status === 'completed').length;
  const progressPercentage = courseAssignments.length > 0 
    ? Math.round((completedAssignments / courseAssignments.length) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium mb-4"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Courses
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Course Info */}
        <div className="lg:w-2/3 space-y-8">
          <div className={`rounded-3xl p-8 text-white shadow-lg relative overflow-hidden ${course.color}`}>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium mb-4">
                {course.code}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">{course.name}</h2>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white/90">Course Resources</span>
                </div>
                <p className="text-sm text-white/70">Access your study materials and collaborate with classmates.</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          </div>
        </div>

        {/* Right Column: Study Groups & Review Decks */}
        <div className="lg:w-1/3 space-y-8">
          {/* Study Groups */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Study Groups
            </h3>
            <div className="space-y-4">
              {courseGroups.length > 0 ? (
                courseGroups.map(group => (
                  <div key={group.id} className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                    <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">{group.name}</h4>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{group.membersCount} members</span>
                      <span>Active {group.lastActive}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No active study groups.</p>
              )}
              <button className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-all">
                + Create New Group
              </button>
            </div>
          </section>

          {/* Review Decks */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              Review Decks
            </h3>
            <div className="space-y-4">
              {courseDecks.length > 0 ? (
                courseDecks.map(deck => (
                  <div key={deck.id} className="p-4 rounded-2xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer">
                    <h4 className="font-semibold text-slate-800 mb-2">{deck.title}</h4>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{deck.cardsCount} cards</span>
                      <span className="text-purple-600 font-bold">{deck.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${deck.progress}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No review decks yet.</p>
              )}
              <button className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
                Start Review Session
              </button>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
