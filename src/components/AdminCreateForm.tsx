import { useState } from "react";
import { ArrowLeft, Check, Plus, UploadCloud, Type, BookOpen, Hash, User, Calendar, Trash2, Library, Star, Sparkles, Loader2 } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { cn } from "../lib/utils";
import { GoogleGenAI, Type as GenAIType } from "@google/genai";

interface AdminCreateFormProps {
  user: any;
  onBack: () => void;
}

type QuestionType = "Likert Scale" | "Yes/No" | "Multiple Choice" | "5 Star Rating";

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  coId: string;
  coDescription: string;
  options?: string[];
}

const QUESTION_BANK = {
  "Teaching Effectiveness": [
    { text: "The teacher is well prepared for the class.", type: "5 Star Rating" as QuestionType, coId: "TE-1", coDescription: "Preparation" },
    { text: "The teacher communicates clearly and effectively.", type: "5 Star Rating" as QuestionType, coId: "TE-2", coDescription: "Communication" },
    { text: "The teacher encourages participation and discussions.", type: "5 Star Rating" as QuestionType, coId: "TE-3", coDescription: "Engagement" },
    { text: "The teacher is accessible outside the class for doubts.", type: "5 Star Rating" as QuestionType, coId: "TE-4", coDescription: "Availability" },
    { text: "The teacher uses teaching aids effectively.", type: "Likert Scale" as QuestionType, coId: "TE-5", coDescription: "Methodology" }
  ],
  "Course Outcomes (CO)": [
    { text: "Has the course improved your understanding of the core concepts?", type: "5 Star Rating" as QuestionType, coId: "CO-1", coDescription: "Core Concepts" },
    { text: "Are you able to apply the knowledge gained in practical scenarios?", type: "Likert Scale" as QuestionType, coId: "CO-2", coDescription: "Practical Application" },
    { text: "Did the course assignments align with the learning objectives?", type: "Yes/No" as QuestionType, coId: "CO-3", coDescription: "Alignment" }
  ]
};

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Information Technology", "Electrical"];
const SEMESTERS = ["Sem I", "Sem II", "Sem III", "Sem IV", "Sem V", "Sem VI", "Sem VII", "Sem VIII"];

export default function AdminCreateForm({ user, onBack }: AdminCreateFormProps) {
  const [formType, setFormType] = useState<"Teaching Effectiveness" | "Course Outcomes (CO)">("Teaching Effectiveness");
  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-25");
  
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [targetSemesters, setTargetSemesters] = useState<string[]>([]);
  
  const [publishImmediately, setPublishImmediately] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Question[]>([]);

  const handleGenerateAI = async () => {
    if (!title) {
      alert("Please enter a Survey Title first before using AI suggestions.");
      return;
    }
    setIsGeneratingAI(true);
    setAiSuggestions([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 3 survey/feedback questions related to the feedback form titled: "${title}". Respond as JSON array.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.ARRAY,
            items: {
              type: GenAIType.OBJECT,
              properties: {
                text: { type: GenAIType.STRING, description: "Question text" },
                type: { type: GenAIType.STRING, description: "Must be exactly '5 Star Rating', 'Likert Scale', 'Yes/No', or 'Multiple Choice'" },
                coId: { type: GenAIType.STRING, description: "Short alphanumeric format e.g. AI-1" },
                coDescription: { type: GenAIType.STRING, description: "Short description." },
                options: {
                  type: GenAIType.ARRAY,
                  items: { type: GenAIType.STRING }
                }
              },
              required: ["text", "type", "coId"]
            }
          }
        }
      });
      const parsed = JSON.parse(response.text || "[]");
      setAiSuggestions(parsed);
    } catch (e) {
      console.error(e);
      alert("Failed to generate AI questions. Please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const toggleDept = (d: string) => {
    setTargetDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  
  const toggleSem = (s: string) => {
    setTargetSemesters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { id: `q_${Date.now()}`, text: "", type: "5 Star Rating", coId: "GEN", coDescription: "" }]);
  };

  const handleAddFromBank = (q: any) => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}_${Math.random()}`,
        text: q.text,
        type: q.type,
        coId: q.coId,
        coDescription: q.coDescription,
        options: q.options || []
      }
    ]);
    setShowQuestionBank(false);
  };

  const handleSave = async () => {
    if (!title || !subjectName || !facultyName) {
      alert("Survey Title, Subject Name, and Faculty Name are required.");
      return;
    }
    
    setIsSaving(true);
    try {
      const status = publishImmediately ? "published" : "draft";
      await addDoc(collection(db, "surveys"), {
        facultyId: "admin",
        facultyName,
        formType,
        title,
        subjectName,
        subjectCode,
        semester,
        academicYear,
        targetDepartments,
        targetSemesters,
        questions: questions,
        status,
        createdAt: new Date().toISOString()
      });
      alert(`Survey ${status === 'published' ? 'Published' : 'Saved'} successfully!`);
      onBack();
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, "surveys");
    } finally {
      setIsSaving(false);
    }
  };

  const inputGroupClass = "bg-white px-3 py-3 rounded-xl border border-gray-200 flex items-center gap-3 focus-within:border-[#1e3c72] focus-within:ring-1 focus-within:ring-[#1e3c72]";

  if (showQuestionBank) {
    return (
      <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center">
        <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative">
          <div className="bg-[#1e3c72] text-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-md">
            <button onClick={() => setShowQuestionBank(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold flex-1">Question Bank</h1>
          </div>
          <div className="p-4 space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-2 relative overflow-hidden shadow-sm">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h2 className="text-sm font-bold text-[#1e3c72] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Question Generator
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Generate custom questions based on your survey title "{title || "..."}"</p>
                </div>
                <button 
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI || !title}
                  className="bg-[#1e3c72] hover:bg-[#152a51] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center min-w-[90px]"
                >
                  {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                </button>
              </div>
              
              {aiSuggestions.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Generated Suggestions</h3>
                  {aiSuggestions.map((q, i) => (
                    <div key={`ai-${i}`} className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm hover:border-[#1e3c72] transition-colors cursor-pointer group" onClick={() => handleAddFromBank(q)}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold text-slate-800 mb-2 pr-4">{q.text}</p>
                        <Plus className="h-4 w-4 text-[#0b9eeb] group-hover:scale-110 transition-transform flex-shrink-0" />
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-md">{q.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
               <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Teaching Effectiveness</h2>
               <div className="space-y-3">
                 {QUESTION_BANK["Teaching Effectiveness"].map((q, i) => (
                   <div key={i} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-[#1e3c72] transition-colors cursor-pointer group" onClick={() => handleAddFromBank(q)}>
                     <div className="flex justify-between items-start">
                       <p className="text-sm font-semibold text-slate-800 mb-2 pr-4">{q.text}</p>
                       <Plus className="h-4 w-4 text-[#0b9eeb] group-hover:scale-110 transition-transform" />
                     </div>
                     <span className="text-[10px] bg-blue-50 text-[#1e3c72] font-bold px-2 py-1 rounded-md">{q.type}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div>
               <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Course Outcomes (CO)</h2>
               <div className="space-y-3">
                 {QUESTION_BANK["Course Outcomes (CO)"].map((q, i) => (
                   <div key={i} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-[#1e3c72] transition-colors cursor-pointer group" onClick={() => handleAddFromBank(q)}>
                     <div className="flex justify-between items-start">
                       <p className="text-sm font-semibold text-slate-800 mb-2 pr-4">{q.text}</p>
                       <Plus className="h-4 w-4 text-[#0b9eeb] group-hover:scale-110 transition-transform" />
                     </div>
                     <span className="text-[10px] bg-blue-50 text-[#1e3c72] font-bold px-2 py-1 rounded-md">{q.type}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center">
      <div className="w-full max-w-md bg-[#f3f6f9] min-h-screen shadow-xl relative pb-28">
        
        {/* Header */}
        <div className="bg-[#1e3c72] text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold leading-tight">Create Feedback Form</h1>
              <p className="text-xs text-blue-200">Admin · {questions.length} questions</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 w-10 bg-[#22c55e] hover:bg-[#16a34a] rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Survey Details */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3 ml-1">Survey Details</h2>
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-5">
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">Feedback Form Type *</label>
                <div className={inputGroupClass}>
                  <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800">
                    <option value="Teaching Effectiveness">Teaching Effectiveness</option>
                    <option value="Course Outcomes (CO)">Course Outcomes (CO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Type className="w-3.5 h-3.5"/> Survey Title *</label>
                <div className={inputGroupClass}>
                  <input type="text" placeholder="e.g. End of Semester Feedback" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5"/> Subject Name *</label>
                  <button type="button" onClick={() => setSubjectName("N/A")} className="text-[10px] font-bold text-[#1e3c72] bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">Set N/A</button>
                </div>
                <div className={inputGroupClass}>
                  <input type="text" placeholder="e.g. Data Structures" value={subjectName} onChange={e => setSubjectName(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5"><Hash className="w-3.5 h-3.5"/> Subject Code *</label>
                  <button type="button" onClick={() => setSubjectCode("N/A")} className="text-[10px] font-bold text-[#1e3c72] bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">Set N/A</button>
                </div>
                <div className={inputGroupClass}>
                  <input type="text" placeholder="e.g. CS301" value={subjectCode} onChange={e => setSubjectCode(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Faculty Name *</label>
                <div className={inputGroupClass}>
                  <input type="text" placeholder="e.g. Dr. Sharma" value={facultyName} onChange={e => setFacultyName(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                </div>
              </div>

            </div>
          </div>

          {/* Academic Info */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3 ml-1">Academic Info</h2>
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5"/> Semester *</label>
                <div className={inputGroupClass}>
                  <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800">
                    <option value="" disabled hidden>Select Semester</option>
                    <option value="N/A">N/A</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Academic Year</label>
                <div className={inputGroupClass}>
                  <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-gray-800">
                    <option value="2023-24">2023-24</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 ml-1">Target Audience</h2>
            <p className="text-[11px] text-slate-400 italic mb-3 ml-1">Leave empty to show to all students and faculty.</p>
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-6">
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">Target Departments</label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map(dept => {
                    const isSelected = targetDepartments.includes(dept);
                    return (
                      <button
                        key={dept}
                        onClick={() => toggleDept(dept)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                          isSelected ? "bg-blue-50 border-blue-200 text-[#1e3c72] font-semibold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {dept}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">Target Semesters</label>
                <div className="flex flex-wrap gap-2">
                  {SEMESTERS.map(sem => {
                    const isSelected = targetSemesters.includes(sem);
                    return (
                      <button
                        key={sem}
                        onClick={() => toggleSem(sem)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                          isSelected ? "bg-blue-50 border-blue-200 text-[#1e3c72] font-semibold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {sem}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Publish */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5"><UploadCloud className="w-4 h-4 text-green-500" /> Publish Immediately</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Form will go live after saving.</span>
            </div>
            {/* Custom Toggle Switch */}
            <div 
              className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors relative", publishImmediately ? "bg-green-500" : "bg-slate-300")}
              onClick={() => setPublishImmediately(!publishImmediately)}
            >
              <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform absolute top-1", publishImmediately ? "translate-x-6" : "translate-x-0")} />
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex justify-between items-center mb-3 ml-1 mt-6">
              <h2 className="text-lg font-bold text-slate-800">Questions ({questions.length})</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowQuestionBank(true)}
                  className="bg-white border border-[#1e3c72] text-[#1e3c72] hover:bg-slate-50 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Library className="h-3.5 w-3.5" /> Bank
                </button>
                <button 
                  onClick={handleAddQuestion}
                  className="bg-[#1e3c72] text-white hover:bg-[#152a51] px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 border-dashed p-8 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-700">No Questions Yet</h3>
                  <p className="text-xs text-slate-400 mt-1">Tap "Add" above to create your first question.</p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <div key={q.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <div className="bg-blue-50 text-[#1e3c72] font-black h-8 w-8 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <button 
                        onClick={() => setQuestions(questions.filter(item => item.id !== q.id))}
                        className="text-red-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className={inputGroupClass}>
                        <textarea 
                          placeholder="Type question here..." 
                          rows={2}
                          value={q.text}
                          onChange={(e) => setQuestions(questions.map(item => item.id === q.id ? { ...item, text: e.target.value } : item))}
                          className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 resize-none"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {["5 Star Rating", "Likert Scale", "Yes/No", "Multiple Choice"].map((type) => {
                          const val = type as QuestionType;
                          return (
                            <button
                              key={type}
                              onClick={() => {
                                setQuestions(questions.map(item => {
                                  if (item.id === q.id) {
                                    return { ...item, type: val, options: val === 'Multiple Choice' ? ['Yes', 'No'] : [] };
                                  }
                                  return item;
                                }));
                              }}
                              className={cn(
                                "py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1",
                                q.type === val 
                                  ? "bg-white text-[#1e3c72]" 
                                  : "text-slate-500 hover:bg-slate-200"
                              )}
                            >
                              {type === "5 Star Rating" && <Star className={cn("w-3 h-3", q.type === val ? "fill-[#1e3c72]" : "")} />}
                              {type}
                            </button>
                          )
                        })}
                      </div>

                      {q.type === 'Multiple Choice' && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt, oIndex) => (
                            <div key={oIndex} className="flex gap-2">
                              <input 
                                type="text"
                                value={opt}
                                onChange={e => {
                                  setQuestions(questions.map(item => {
                                    if (item.id === q.id) {
                                      const newOps = [...(item.options || [])];
                                      newOps[oIndex] = e.target.value;
                                      return { ...item, options: newOps };
                                    }
                                    return item;
                                  }));
                                }}
                                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1e3c72]" 
                                placeholder="Option text..."
                              />
                            </div>
                          ))}
                          <button 
                            className="text-[10px] text-blue-500 font-bold ml-1 flex items-center gap-1"
                            onClick={() => {
                                setQuestions(questions.map(item => {
                                  if (item.id === q.id) {
                                    return { ...item, options: [...(item.options || []), ""] };
                                  }
                                  return item;
                                }));
                            }}
                          >
                            <Plus className="w-3 h-3" /> Add Option
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CO/Tag *</label>
                          <input 
                            type="text" 
                            placeholder="GEN" 
                            value={q.coId}
                            onChange={(e) => setQuestions(questions.map(item => item.id === q.id ? { ...item, coId: e.target.value } : item))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1e3c72]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
                          <input 
                            type="text" 
                            placeholder="Description..." 
                            value={q.coDescription}
                            onChange={(e) => setQuestions(questions.map(item => item.id === q.id ? { ...item, coDescription: e.target.value } : item))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1e3c72]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {questions.length > 0 && (
               <button 
                 onClick={handleSave}
                 disabled={isSaving}
                 className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] mt-6 disabled:opacity-50"
               >
                 <UploadCloud className="h-5 w-5" /> Publish Feedback Form
               </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
