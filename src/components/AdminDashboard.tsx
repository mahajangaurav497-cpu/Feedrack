import { useState, useEffect } from "react";
import { LogOut, ClipboardList, Users as UsersIcon, AlertTriangle, FileDown, ChevronRight, BarChart3, Activity } from "lucide-react";
import UserManagement from "./UserManagement";
import AdminCreateForm from "./AdminCreateForm";
import SurveyAnalytics from "./SurveyAnalytics";
import OverallDashboardAnalytics from "./OverallDashboardAnalytics";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { cn } from "../lib/utils";

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

type AdminView = "home" | "user_management" | "create_form" | "atr";

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [view, setView] = useState<AdminView>("home");
  const [stats, setStats] = useState({ surveys: 0, responses: 0, avgScore: null });
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);

  useEffect(() => {
    // Fetch some high-level stats for the dashboard
    const fetchStats = async () => {
      try {
        const surveysSnap = await getDocs(collection(db, "surveys"));
        const responsesSnap = await getDocs(collection(db, "surveyResponses"));
        
        const surveysList: any[] = [];
        surveysSnap.forEach(doc => surveysList.push({ id: doc.id, ...doc.data() }));
        setSurveys(surveysList);

        setStats({
          surveys: surveysSnap.size,
          responses: responsesSnap.size,
          avgScore: null // To be calculated properly later
        });
      } catch (err) {
        // Silently fail for stats, as they are non-critical and might hit offline mode
        console.error("Could not load stats", err);
      }
    };
    fetchStats();
  }, []);

  if (selectedSurvey) {
    return <SurveyAnalytics survey={selectedSurvey} onBack={() => setSelectedSurvey(null)} />;
  }

  if (view === "user_management") return <UserManagement onBack={() => setView("home")} />;
  if (view === "create_form") return <AdminCreateForm user={user} onBack={() => setView("home")} />;

  return (
    <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center pb-20">
      <div className="w-full max-w-md bg-[#f3f6f9] min-h-screen shadow-xl relative">
        
        {/* Header Section */}
        <div className="bg-[#1e3c72] text-white p-6 pt-10 relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-widest mb-1 uppercase">Admin · Academic Affairs</p>
              <h1 className="text-3xl font-bold tracking-tight">Administrator</h1>
            </div>
            <button 
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-sm transition-colors"
            >
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="bg-[#2a4c8a] rounded-xl p-4 flex justify-around shadow-inner border border-white/5 mb-[-3rem] relative z-10">
            <div className="text-center flex flex-col items-center">
              <ClipboardList className="h-5 w-5 text-blue-200 mb-1" />
              <p className="text-xl font-bold">{stats.surveys}</p>
              <p className="text-[#a0b8e0] text-[10px] uppercase tracking-wide">Surveys</p>
            </div>
            <div className="w-px bg-white/10 my-1"></div>
            <div className="text-center flex flex-col items-center">
              <UsersIcon className="h-5 w-5 text-blue-200 mb-1" />
              <p className="text-xl font-bold">{stats.responses}</p>
              <p className="text-[#a0b8e0] text-[10px] uppercase tracking-wide">Responses</p>
            </div>
            <div className="w-px bg-white/10 my-1"></div>
            <div className="text-center flex flex-col items-center">
              <BarChart3 className="h-5 w-5 text-blue-200 mb-1" />
              <p className="text-xl font-bold">{stats.avgScore || '-'}</p>
              <p className="text-[#a0b8e0] text-[10px] uppercase tracking-wide">Avg Score</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-16 space-y-3">
          <button 
            onClick={() => setView("create_form")}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white py-4 px-6 rounded-xl flex items-center justify-between font-bold shadow-md shadow-green-500/20 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 text-lg">
              <div className="bg-white/20 p-1.5 rounded-full"><ClipboardList className="h-5 w-5" /></div>
              Create Feedback Form
            </div>
            <ChevronRight className="h-5 w-5 opacity-80" />
          </button>

          <button 
            onClick={() => setView("user_management")}
            className="w-full bg-[#1e3c72] hover:bg-[#152a51] text-white py-4 px-6 rounded-xl flex items-center justify-between font-bold shadow-md shadow-blue-900/20 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 text-lg">
              <div className="bg-white/10 p-1.5 rounded-full"><UsersIcon className="h-5 w-5" /></div>
              User Management
            </div>
            <ChevronRight className="h-5 w-5 opacity-80" />
          </button>

          <button 
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-4 px-6 rounded-xl flex items-center justify-between font-bold shadow-md shadow-orange-500/20 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 text-lg">
              <div className="bg-white/20 p-1.5 rounded-full"><AlertTriangle className="h-5 w-5" /></div>
              Action Taken Reports (ATR)
            </div>
            <ChevronRight className="h-5 w-5 opacity-80" />
          </button>

          <button 
            className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white py-4 px-6 rounded-xl flex items-center justify-between font-bold shadow-md shadow-red-500/20 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 text-lg">
              <div className="bg-white/20 p-1.5 rounded-full"><FileDown className="h-5 w-5" /></div>
              Export Full Report as PDF
            </div>
          </button>
        </div>

        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Advanced Analytics Results</h2>
            <div className="bg-blue-100 text-[#1e3c72] p-1.5 rounded-full">
               <Activity className="h-4 w-4" />
            </div>
          </div>
          
          <OverallDashboardAnalytics surveys={surveys} />
          
          {surveys.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 text-sm mt-2 text-center h-40">
              <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
              <span>No Surveys Available for Analytics</span>
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map(survey => (
                <div 
                  key={survey.id} 
                  onClick={() => setSelectedSurvey(survey)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#1e3c72] transition-colors line-clamp-1">{survey.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{survey.subjectName} · {survey.facultyName || "N/A"}</p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${survey.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {survey.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                    <span className="text-xs font-semibold text-[#1e3c72] flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" /> View Results
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#1e3c72] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
