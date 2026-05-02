import { X, UserRound, GraduationCap, Building, BookOpen, CalendarDays, KeyRound, Fingerprint } from "lucide-react";

interface UserProfileProps {
  user: any;
  onClose: () => void;
}

export default function UserProfile({ user, onClose }: UserProfileProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-[#1e3c72] p-4 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <UserRound className="h-5 w-5" /> My Profile
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-6 mb-2">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <UserRound className="h-10 w-10 text-[#1e3c72]" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center">{user.fullName || (user.role === 'student' ? 'Student' : 'User')}</h3>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mt-2 uppercase tracking-wide">
              {user.role}
            </span>
          </div>

          <div className="space-y-3">
            {user.userId && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User ID</p>
                  <p className="text-sm font-semibold text-slate-700">{user.userId}</p>
                </div>
              </div>
            )}

            {user.rollNumber && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll Number</p>
                  <p className="text-sm font-semibold text-slate-700">{user.rollNumber}</p>
                </div>
              </div>
            )}
            
            {user.department && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-semibold text-slate-700">{user.department}</p>
                </div>
              </div>
            )}

            {user.studentClass && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</p>
                  <p className="text-sm font-semibold text-slate-700">{user.studentClass}</p>
                </div>
              </div>
            )}

            {user.semester && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semester</p>
                  <p className="text-sm font-semibold text-slate-700">{user.semester}</p>
                </div>
              </div>
            )}

            {user.year && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</p>
                  <p className="text-sm font-semibold text-slate-700">{user.year}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
