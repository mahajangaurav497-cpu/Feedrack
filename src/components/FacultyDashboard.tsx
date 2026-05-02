import { useState, useEffect } from "react";
import { LogOut, ClipboardList, Plus, Info, LayoutDashboard, User } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import CreateSurvey from "./CreateSurvey";
import SurveyAnalytics from "./SurveyAnalytics";
import UserProfile from "./UserProfile";
import OverallDashboardAnalytics from "./OverallDashboardAnalytics";

interface FacultyDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function FacultyDashboard({ user, onLogout }: FacultyDashboardProps) {
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "faculty") return;
    
    const q = query(collection(db, "surveys"), where("facultyId", "==", user.userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const surveyData: any[] = [];
      snapshot.forEach((doc) => surveyData.push({ id: doc.id, ...doc.data() }));
      setSurveys(surveyData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "surveys");
    });

    return () => unsubscribe();
  }, [user]);

  if (isCreatingSurvey) {
    return <CreateSurvey user={user} onBack={() => setIsCreatingSurvey(false)} />;
  }

  if (selectedSurvey) {
    return <SurveyAnalytics survey={selectedSurvey} onBack={() => setSelectedSurvey(null)} />;
  }

  const publishedCount = surveys.filter(s => s.status === 'published').length;
  // Let's assume response count is 0 for now as we don't have responses yet
  const responseCount = 0;

  return (
    <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center pb-20">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-20">
        
        {/* Header Section */}
        <div className="bg-[#1e3c72] text-white p-6 pb-8 relative rounded-b-[2rem] shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-wider mb-1 uppercase">Faculty Dashboard</p>
              <h1 className="text-3xl font-bold">{user.fullName || "Faculty"}</h1>
              <p className="text-white/80 text-sm mt-1">{user.department || "General Department"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowProfile(true)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-colors"
                aria-label="Profile"
              >
                <User className="h-5 w-5 text-white" />
              </button>
              <button 
                onClick={onLogout}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-colors"
              >
                <LogOut className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white/10 mt-6 rounded-xl p-4 flex justify-around backdrop-blur-md border border-white/10 shadow-inner">
            <div className="text-center">
              <p className="text-2xl font-bold">{surveys.length}</p>
              <p className="text-white/70 text-xs uppercase tracking-wide">Surveys</p>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <p className="text-2xl font-bold">{publishedCount}</p>
              <p className="text-white/70 text-xs uppercase tracking-wide">Published</p>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <p className="text-2xl font-bold">{responseCount}</p>
              <p className="text-white/70 text-xs uppercase tracking-wide">Responses</p>
            </div>
          </div>
        </div>

        {showProfile && (
          <UserProfile user={user} onClose={() => setShowProfile(false)} />
        )}

        <div className="px-4 mt-6">
          <button 
            onClick={() => setIsCreatingSurvey(true)}
            className="w-full bg-[#1da053] hover:bg-[#168543] text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" /> Create New Survey
          </button>
          
          <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-xl font-bold text-slate-800">Advanced Analytics & Surveys</h2>
            <LayoutDashboard className="h-5 w-5 text-slate-400" />
          </div>

          <OverallDashboardAnalytics surveys={surveys} />

          {surveys.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-12 mb-12">
              <div className="bg-slate-100 p-4 rounded-2xl mb-4">
                <ClipboardList className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Surveys Yet</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-[240px]">
                Tap "Create New Survey" to build your first feedback survey.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {surveys.map(survey => (
                <div 
                  key={survey.id} 
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-[#0b9eeb] hover:shadow-md transition-all group"
                  onClick={() => setSelectedSurvey(survey)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 group-hover:text-[#0b9eeb] transition-colors">{survey.title}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${survey.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {survey.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{survey.subjectName} ({survey.subjectCode})</p>
                  
                  <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                    <p className="text-xs text-slate-400">Due: {survey.dueDate || "N/A"}</p>
                    <button className="text-xs font-semibold text-[#0b9eeb] flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full group-hover:bg-[#0b9eeb] group-hover:text-white transition-colors">
                      <LayoutDashboard className="h-3 w-3" /> View Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#e4f3fb] border border-[#bde0f6] rounded-xl p-4 mt-8 flex items-start gap-3">
            <Info className="h-5 w-5 text-[#008de4] shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              Use "Share Link" to send a deep link or share code to students. They can open it directly or enter the code in the app.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
