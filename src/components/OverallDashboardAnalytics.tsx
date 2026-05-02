import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface OverallDashboardAnalyticsProps {
  surveys: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6666'];

export default function OverallDashboardAnalytics({ surveys }: OverallDashboardAnalyticsProps) {
  const [aggregatedData, setAggregatedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (surveys.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAllResponsesAndCompile = async () => {
      setLoading(true);
      try {
        let allResponses: any[] = [];
        
        // Fetch responses for all provided surveys
        for (const survey of surveys) {
           const q = query(collection(db, "surveyResponses"), where("surveyId", "==", survey.id));
           const querySnapshot = await getDocs(q);
           const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           allResponses = [...allResponses, ...fetched];
        }

        // Generate some mock data for demo if no real responses exist
        if (allResponses.length === 0) {
          allResponses = generateMockOverallResponses(surveys);
        }

        const counts: Record<string, number> = {
          "Excellent (5)": 0,
          "Good (4)": 0,
          "Average (3)": 0,
          "Poor (2)": 0,
          "Very Poor (1)": 0
        };

        allResponses.forEach(res => {
          if (res.answers) {
            Object.values(res.answers).forEach((ans: any) => {
               if (ans === "5") counts["Excellent (5)"]++;
               else if (ans === "4") counts["Good (4)"]++;
               else if (ans === "3") counts["Average (3)"]++;
               else if (ans === "2") counts["Poor (2)"]++;
               else if (ans === "1") counts["Very Poor (1)"]++;
            });
          }
        });

        const formattedData = Object.entries(counts).map(([name, value]) => ({
          name,
          value
        })).filter(item => item.value > 0);

        setAggregatedData(formattedData);
      } catch (err) {
        console.error("Error fetching responses for overall analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllResponsesAndCompile();
  }, [surveys]);


  if (surveys.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
       <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">Overall Feedback Results (All Surveys)</h3>
       
       {loading ? (
         <div className="h-48 flex items-center justify-center">
            <p className="text-slate-400 text-sm animate-pulse">Analyzing all feedback data...</p>
         </div>
       ) : aggregatedData.length === 0 ? (
         <div className="h-24 flex items-center justify-center">
            <p className="text-slate-400 text-sm">No feedback data available yet.</p>
         </div>
       ) : (
         <div className="flex flex-col gap-6">
           <div className="h-64 w-full">
             <p className="text-xs text-center font-bold text-slate-400 mb-2 uppercase tracking-wider">Overall Ratings (Bar Chart)</p>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={aggregatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                 <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="value" fill="#0b9eeb" radius={[4, 4, 0, 0]} barSize={28} >
                    {aggregatedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
           
           <div className="h-64 w-full border-t border-slate-50 pt-4">
             <p className="text-xs text-center font-bold text-slate-400 mb-2 uppercase tracking-wider">Overall Sentiment (Pie Chart)</p>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={aggregatedData}
                   innerRadius={50}
                   outerRadius={70}
                   paddingAngle={5}
                   dataKey="value"
                   nameKey="name"
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   labelLine={false}
                 >
                   {aggregatedData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <RechartsTooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
         </div>
       )}
    </div>
  );
}

// Helpers

function generateMockOverallResponses(surveys: any[]) {
  const mockResponses = [];
  const numMock = 120; // Generate a lot of data for overall admin/faculty dashboard

  for (let i = 0; i < numMock; i++) {
    const answers: Record<string, string> = {};
    const survey = surveys[i % surveys.length];
    
    if (survey && survey.questions) {
      survey.questions.forEach((q: any) => {
        if (q.type === "Likert Scale") {
          const val = Math.random() > 0.3 ? (Math.random() > 0.5 ? "5" : "4") : (Math.floor(Math.random() * 3) + 1).toString();
          answers[q.id] = val;
        }
      });

      mockResponses.push({
        id: `mock-overall-${i}`,
        surveyId: survey.id,
        answers,
      });
    }
  }

  return mockResponses;
}
