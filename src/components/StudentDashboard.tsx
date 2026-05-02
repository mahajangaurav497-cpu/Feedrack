import { useState, useEffect } from "react";
import { LogOut, ClipboardList, BookOpen, User, Calendar, CheckCircle2, ChevronRight, Star } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { cn } from "../lib/utils";
import UserProfile from "./UserProfile";

interface StudentDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [completedSurveys, setCompletedSurveys] = useState<string[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, [user]);

  const fetchSurveys = async () => {
    try {
      // Get all published surveys
      const q = query(collection(db, "surveys"), where("status", "==", "published"));
      const snapshot = await getDocs(q);
      const allSurveys: any[] = [];
      snapshot.forEach(doc => allSurveys.push({ id: doc.id, ...doc.data() }));

      // Filter based on department / semester if specified
      const applicableSurveys = allSurveys.filter(survey => {
        if (survey.targetDepartments && survey.targetDepartments.length > 0 && !survey.targetDepartments.includes(user.department)) return false;
        if (survey.targetSemesters && survey.targetSemesters.length > 0 && !survey.targetSemesters.includes(user.semester)) return false;
        return true;
      });

      setSurveys(applicableSurveys);

      // Fetch completed surveys
      const responsesQ = query(collection(db, "surveyResponses"), where("studentId", "==", user.userId));
      const resSnapshot = await getDocs(responsesQ);
      const completed = new Set<string>();
      resSnapshot.forEach(doc => {
        completed.add(doc.data().surveyId);
      });
      setCompletedSurveys(Array.from(completed));

      const p = new URLSearchParams(window.location.search);
      const sid = p.get("surveyId");
      if (sid) {
        const target = allSurveys.find(s => s.id === sid);
        if (target) {
          if (completed.has(sid)) {
            alert("You have already completed this survey.");
          } else {
            setSelectedSurvey(target);
          }
        } else {
          alert("Survey not found or not published.");
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }

    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, "surveys");
    }
  };

  const handleSubmit = async () => {
    if (!selectedSurvey) return;
    
    // Validate all answered
    for (const q of selectedSurvey.questions) {
      if (!answers[q.id]) {
        alert("Please answer all questions before submitting.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "surveyResponses"), {
        surveyId: selectedSurvey.id,
        studentId: user.userId,
        studentName: user.fullName || "Student",
        answers,
        submittedAt: new Date().toISOString()
      });
      alert("Survey submitted successfully!");
      setCompletedSurveys([...completedSurveys, selectedSurvey.id]);
      setSelectedSurvey(null);
      setAnswers({});
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, "surveyResponses");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedSurvey) {
    return (
      <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center">
        <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-28">
          <div className="bg-[#1c3c6d] text-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-md">
            <button onClick={() => { setSelectedSurvey(null); setAnswers({}); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold leading-tight line-clamp-1">{selectedSurvey.title}</h1>
              <p className="text-xs text-blue-200">{selectedSurvey.subjectName} · {selectedSurvey.questions?.length} Questions</p>
            </div>
          </div>

          <div className="p-4 space-y-6">
            <div className="bg-[#eaf1ff] border border-[#d0e0fb] rounded-2xl p-4">
               <p className="text-xs font-bold text-[#1c3c6d] uppercase tracking-wider mb-2">Instructions</p>
               <p className="text-sm text-slate-700">Please provide honest feedback. Your responses are recorded to improve academic quality.</p>
            </div>

            <div className="space-y-6">
              {selectedSurvey.questions?.map((q: any, i: number) => (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-[#1c3c6d] text-white font-bold h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs">
                      Q{i+1}
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug pt-0.5">{q.text}</h3>
                  </div>

                  <div className="pl-10">
                    {q.type === 'Likert Scale' && (
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {[1,2,3,4,5].map(val => (
                          <div 
                            key={val}
                            onClick={() => setAnswers({...answers, [q.id]: val.toString()})}
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition-all",
                              answers[q.id] === val.toString() 
                                ? "bg-[#1c3c6d] text-white scale-110 shadow-md" 
                                : "bg-white text-slate-500 hover:bg-slate-200 border border-slate-200"
                            )}
                          >
                            {val}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {q.type === '5 Star Rating' && (
                      <div className="flex items-center gap-2">
                        {[1,2,3,4,5].map(val => (
                          <Star 
                            key={val}
                            onClick={() => setAnswers({...answers, [q.id]: val.toString()})}
                            className={cn(
                              "w-8 h-8 cursor-pointer transition-colors",
                              parseInt(answers[q.id]) >= val 
                                ? "fill-[#fac005] text-[#fac005]" 
                                : "text-slate-300 hover:text-slate-400"
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {q.type === 'Yes/No' && (
                      <div className="flex gap-3">
                        {['Yes', 'No'].map(val => (
                          <button
                            key={val}
                            onClick={() => setAnswers({...answers, [q.id]: val})}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-sm font-bold border transition-colors cursor-pointer",
                              answers[q.id] === val 
                                ? "bg-[#eaf1ff] border-[#1c3c6d] text-[#1c3c6d]" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'Multiple Choice' && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt: string, oIdx: number) => (
                          <div 
                            key={oIdx}
                            onClick={() => setAnswers({...answers, [q.id]: opt})}
                            className={cn(
                              "p-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer flex items-center gap-3",
                              answers[q.id] === opt 
                                ? "bg-[#eaf1ff] border-[#1c3c6d] text-[#1c3c6d]"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                              answers[q.id] === opt ? "border-[#1c3c6d]" : "border-slate-400"
                            )}>
                              {answers[q.id] === opt && <div className="w-2 h-2 bg-[#1c3c6d] rounded-full" />}
                            </div>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || Object.keys(answers).length !== selectedSurvey.questions?.length}
              className="w-full bg-[#1c3c6d] hover:bg-[#132c50] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] mt-8 disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" /> Submit Survey
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingSurveys = surveys.filter(s => !completedSurveys.includes(s.id));
  const doneSurveys = surveys.filter(s => completedSurveys.includes(s.id));

  return (
    <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center">
      <div className="w-full max-w-md bg-[#f3f6f9] min-h-screen shadow-xl relative pb-28">
        
        {/* Header */}
        <div className="bg-[#1c3c6d] text-white p-6 rounded-b-3xl shadow-md relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold leading-tight">Student Portal</h1>
              <p className="text-sm text-blue-200 opacity-90 mt-1">Welcome back, {user.fullName || user.rollNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowProfile(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" aria-label="Profile">
                <User className="h-5 w-5" />
              </button>
              <button onClick={onLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" aria-label="Sign Out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex gap-4 mt-2 border border-white/20">
             <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Pending</p>
                <p className="text-2xl font-black">{pendingSurveys.length}</p>
             </div>
             <div className="w-px bg-white/20"></div>
             <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Completed</p>
                <p className="text-2xl font-black">{doneSurveys.length}</p>
             </div>
          </div>
        </div>

        {showProfile && (
          <UserProfile user={user} onClose={() => setShowProfile(false)} />
        )}

        <div className="p-4 mt-2">
          
          <h2 className="text-lg font-bold text-slate-800 mb-4 ml-1 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1c3c6d]" /> Pending Surveys
          </h2>

          {pendingSurveys.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
               <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
               </div>
               <h3 className="font-bold text-slate-800">All Caught Up!</h3>
               <p className="text-xs text-slate-500 mt-1">You have no pending feedback forms.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSurveys.map(survey => (
                <div 
                  key={survey.id} 
                  onClick={() => setSelectedSurvey(survey)}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex items-center gap-4"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-[#1c3c6d] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-[#1c3c6d] transition-colors">{survey.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{survey.subjectName} · {survey.facultyName || "Admin"}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#1c3c6d] transition-colors" />
                </div>
              ))}
            </div>
          )}

          {doneSurveys.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-4 ml-1 mt-8">Completed</h2>
              <div className="space-y-3">
                {doneSurveys.map(survey => (
                  <div 
                    key={survey.id} 
                    className="bg-slate-50 opacity-70 rounded-3xl p-4 border border-slate-100 flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-600 text-sm line-clamp-1">{survey.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{survey.subjectName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
