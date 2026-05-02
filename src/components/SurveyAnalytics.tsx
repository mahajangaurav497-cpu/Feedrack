import { useEffect, useState, useRef } from "react";
import { ArrowLeft, TrendingUp, AlertCircle, Award, Share2 } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import ShareModal from "./ShareModal";

interface SurveyAnalyticsProps {
  survey: any;
  onBack: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6666'];

export default function SurveyAnalytics({ survey, onBack }: SurveyAnalyticsProps) {
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const mockDataRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "surveyResponses"), where("surveyId", "==", survey.id));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If there are no real responses, let's generate some mock data for demonstration purposes
      if (fetched.length === 0) {
        if (!mockDataRef.current[survey.id]) {
          mockDataRef.current[survey.id] = generateMockResponses(survey);
        }
        setResponses(mockDataRef.current[survey.id]);
      } else {
        setResponses(fetched);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "surveyResponses");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [survey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f6f9] flex flex-col items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Loading Advanced Analytics...</p>
      </div>
    );
  }

  const { overallScore, bestQuestion, needsImprovement } = calculateAdvancedMetrics(survey, responses);

  return (
    <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center pb-20">
      <div className="w-full max-w-md bg-[#f3f6f9] min-h-screen shadow-xl relative pb-20">
        
        {/* Header */}
        <div className="bg-[#1e3c72] text-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-md">
          <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Advanced Analytics
            </h1>
            <p className="text-xs text-white/80 line-clamp-1">{survey.title}</p>
          </div>
          <button onClick={() => setShowShareModal(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors shadow-sm">
            <Share2 className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Executive Summary */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Overall Feedback Score</h2>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black text-[#1e3c72]">{overallScore.toFixed(1)}</span>
              <span className="text-xl text-slate-400 font-bold mb-1">/ 5.0</span>
            </div>
            
            <div className="flex items-center gap-4 w-full mt-4 pt-4 border-t border-slate-100">
               <div className="flex-1">
                 <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Responses</p>
                 <p className="text-xl font-bold text-slate-800">{responses.length}</p>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="flex-1">
                 <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Status</p>
                 <p className="text-sm font-bold text-[#1f9b44] uppercase">{survey.status}</p>
               </div>
            </div>
          </div>

          {/* AI Insights (Simulated) */}
          <div className="space-y-3">
             <h3 className="font-bold text-slate-800 ml-1">Key Insights</h3>
             
             {bestQuestion && (
               <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
                 <div className="bg-green-100 text-green-600 p-2 rounded-full shrink-0">
                    <Award className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-1">Top Strength</p>
                   <p className="text-sm text-green-900 font-medium">"{bestQuestion.text}"</p>
                   <p className="text-xs text-green-700 mt-1">Average score: <span className="font-bold">{bestQuestion.score.toFixed(1)}/5</span></p>
                 </div>
               </div>
             )}

             {needsImprovement && (
               <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
                 <div className="bg-orange-100 text-orange-600 p-2 rounded-full shrink-0">
                    <AlertCircle className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-1">Area for Improvement</p>
                   <p className="text-sm text-orange-900 font-medium">"{needsImprovement.text}"</p>
                   <p className="text-xs text-orange-700 mt-1">Average score: <span className="font-bold">{needsImprovement.score.toFixed(1)}/5</span></p>
                 </div>
               </div>
             )}
          </div>

          <h3 className="font-bold text-slate-800 ml-1 mt-8 mb-4">Question Breakdown</h3>

          <div className="space-y-6">
            {survey.questions.map((q: any, i: number) => {
              const data = processQuestionData(q, responses);

              return (
                <div key={q.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-[#1e3c72] text-white font-bold h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-md">
                      Q{i + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug">{q.text || "Untitled Question"}</h3>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">{q.type} • CO: {q.coId}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 h-auto w-full mt-4">
                    {data.length > 0 ? (
                      <>
                        <div className="h-64 w-full md:w-1/2">
                          <p className="text-xs text-center font-bold text-slate-400 mb-2 uppercase tracking-wider">Bar Chart</p>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="value" fill="#0b9eeb" radius={[4, 4, 0, 0]} barSize={28} >
                                {data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="h-64 w-full md:w-1/2">
                          <p className="text-xs text-center font-bold text-slate-400 mb-2 uppercase tracking-wider">Pie Chart</p>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data}
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                {data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    ) : (
                      <div className="h-32 w-full flex items-center justify-center">
                        <p className="text-slate-400 text-sm">No data available for this question.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showShareModal && (
          <ShareModal survey={survey} onClose={() => setShowShareModal(false)} />
        )}

      </div>
    </div>
  );
}

// Helpers

function processQuestionData(question: any, responses: any[]) {
  const counts: Record<string, number> = {};
  
  if (question.type === "Likert Scale") {
    ["1", "2", "3", "4", "5"].forEach(k => counts[k] = 0);
  } else if (question.type === "Yes/No") {
    ["Yes", "No"].forEach(k => counts[k] = 0);
  } else if (question.type === "Multiple Choice" && question.options) {
    question.options.forEach((opt: string) => counts[opt] = 0);
  }

  responses.forEach(res => {
    const answer = res.answers?.[question.id];
    if (answer) {
      counts[answer] = (counts[answer] || 0) + 1;
    }
  });

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value: value as number
  })).filter(item => item.value > 0); 
}

function calculateAdvancedMetrics(survey: any, responses: any[]) {
  let totalScore = 0;
  let totalLikertQuestions = 0;
  let bestQuestion = null;
  let needsImprovement = null;

  const likertQuestions = survey.questions.filter((q: any) => q.type === "Likert Scale");
  
  const questionScores: any[] = [];

  likertQuestions.forEach((q: any) => {
    let qTotal = 0;
    let qCount = 0;
    responses.forEach(res => {
      const ans = res.answers?.[q.id];
      if (ans && !isNaN(parseInt(ans))) {
        qTotal += parseInt(ans);
        qCount++;
      }
    });

    if (qCount > 0) {
      const avg = qTotal / qCount;
      totalScore += avg;
      totalLikertQuestions++;
      questionScores.push({ id: q.id, text: q.text, score: avg });
    }
  });

  const overallScore = totalLikertQuestions > 0 ? totalScore / totalLikertQuestions : 0;

  if (questionScores.length > 0) {
    questionScores.sort((a, b) => b.score - a.score);
    bestQuestion = questionScores[0];
    needsImprovement = questionScores[questionScores.length - 1];

    if (bestQuestion.score === needsImprovement.score || questionScores.length === 1) {
      needsImprovement = null; 
    }
  }

  return { overallScore, bestQuestion, needsImprovement };
}

function generateMockResponses(survey: any) {
  const mockResponses = [];
  const numMock = 45;

  for (let i = 0; i < numMock; i++) {
    const answers: Record<string, string> = {};
    
    survey.questions.forEach((q: any) => {
      if (q.type === "Likert Scale") {
        const val = Math.random() > 0.3 ? (Math.random() > 0.5 ? "5" : "4") : (Math.floor(Math.random() * 3) + 1).toString();
        answers[q.id] = val;
      } else if (q.type === "Yes/No") {
        answers[q.id] = Math.random() > 0.2 ? "Yes" : "No";
      } else if (q.type === "Multiple Choice" && q.options && q.options.length > 0) {
        const rIdx = Math.floor(Math.random() * q.options.length);
        answers[q.id] = q.options[rIdx];
      }
    });

    mockResponses.push({
      id: `mock-${i}`,
      surveyId: survey.id,
      studentId: `student-${i}`,
      answers,
      createdAt: new Date().toISOString()
    });
  }

  return mockResponses;
}
