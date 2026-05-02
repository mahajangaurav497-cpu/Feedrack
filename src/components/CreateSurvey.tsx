import { useState } from "react";
import { ArrowLeft, Plus, Save, UploadCloud, Trash2, Library, Star, Sparkles, Loader2 } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { cn } from "../lib/utils";
import { GoogleGenAI, Type as GenAIType } from "@google/genai";

interface CreateSurveyProps {
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

export default function CreateSurvey({ user, onBack }: CreateSurveyProps) {
  const [formType, setFormType] = useState<"Teaching Effectiveness" | "Course Outcomes (CO)">("Teaching Effectiveness");
  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [departments, setDepartments] = useState("");
  const [targetSemesters, setTargetSemesters] = useState("");
  
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

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        text: "",
        type: "5 Star Rating",
        coId: "",
        coDescription: "",
        options: []
      }
    ]);
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

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...(q.options || [])];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...(q.options || []), ""] };
      }
      return q;
    }));
  };

  const removeOption = (qId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...(q.options || [])];
        newOptions.splice(optionIndex, 1);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title || !subjectName) {
      alert("Survey Title and Subject Name are required.");
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, "surveys"), {
        facultyId: user.userId,
        facultyName: user.fullName || "Faculty",
        formType,
        title,
        subjectName,
        subjectCode,
        semester,
        academicYear,
        dueDate,
        targetDepartments: departments ? [departments] : [],
        targetSemesters: targetSemesters ? [targetSemesters] : [],
        questions,
        status,
        createdAt: new Date().toISOString()
      });
      alert(`Survey ${status === 'published' ? 'Published' : 'Saved as Draft'} successfully!`);
      onBack();
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, "surveys");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full bg-[#f4f7f9] border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3c72]";

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
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-28">
        
        {/* Header */}
        <div className="bg-[#1e3c72] text-white p-4 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Create Survey</h1>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Survey Details */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3 ml-1">Survey Details</h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4">
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Feedback Form Type *</label>
                <select 
                  value={formType} onChange={e => setFormType(e.target.value as any)}
                  className={inputClass}
                >
                  <option value="Teaching Effectiveness">Teaching Effectiveness</option>
                  <option value="Course Outcomes (CO)">Course Outcomes (CO)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Survey Title *</label>
                <input 
                  type="text" 
                  placeholder="e.g. End-Semester Feedback" 
                  value={title} onChange={e => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subject Name *</label>
                  <button type="button" onClick={() => setSubjectName("N/A")} className="text-[10px] font-bold text-[#1e3c72] bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">Set N/A</button>
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. Data Structures" 
                  value={subjectName} onChange={e => setSubjectName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subject Code *</label>
                    <button type="button" onClick={() => setSubjectCode("N/A")} className="text-[10px] font-bold text-[#1e3c72] bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">N/A</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="CS301" 
                    value={subjectCode} onChange={e => setSubjectCode(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Semester *</label>
                    <button type="button" onClick={() => setSemester("N/A")} className="text-[10px] font-bold text-[#1e3c72] bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">N/A</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="V" 
                    value={semester} onChange={e => setSemester(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Academic Year</label>
                  <input 
                    type="text" 
                    placeholder="2025-26" 
                    value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Due Date</label>
                  <input 
                    type="text" 
                    placeholder="YYYY-MM-DD" 
                    value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3 ml-1">Target Audience</h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4">
              <p className="text-xs text-slate-400 italic mb-2">Leave empty to show to all students</p>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Departments</label>
                <select 
                  value={departments} onChange={e => setDepartments(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Tech">Information Technology</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical engineering</option>
                  <option value="Civil">Civil engineering</option>
                  <option value="Chemical">Chemical engineering</option>
                  <option value="AI & DS">Artificial Intelligence & Data Science</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Semesters</label>
                <select 
                  value={targetSemesters} onChange={e => setTargetSemesters(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Semesters</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex justify-between items-center mb-3 ml-1">
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
                  className="bg-[#e4f3fb] text-[#0b9eeb] hover:bg-[#d0eefb] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 border-dashed p-8 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <Plus className="w-5 h-5 text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-700">No Questions Yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Tap "Add" to create a new question or "Bank" to pick from templates.</p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm relative">
                  <div className="flex justify-between items-center mb-4">
                    <div className="bg-[#1e3c72] text-white font-bold h-8 w-8 rounded-full flex items-center justify-center text-sm">
                      Q{index + 1}
                    </div>
                    {questions.length > 1 && (
                      <button 
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="h-8 w-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Question Text *</label>
                      <textarea 
                        placeholder="Enter your question..." 
                        rows={3}
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                        className={cn(inputClass, "resize-none")}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Question Type</label>
                      <div className="flex flex-wrap gap-2">
                        {["5 Star Rating", "Likert Scale", "Yes/No", "Multiple Choice"].map((type) => {
                          const val = type as QuestionType;
                          return (
                            <button
                              key={type}
                              onClick={() => {
                                updateQuestion(q.id, 'type', val);
                                if (val === 'Multiple Choice' && (!q.options || q.options.length === 0)) {
                                  updateQuestion(q.id, 'options', ['']);
                                }
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1",
                                q.type === val 
                                  ? "bg-[#e4f3fb] border-[#0b9eeb] text-[#0b9eeb]" 
                                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                              )}
                            >
                              {type === "5 Star Rating" && <Star className={cn("w-3 h-3", q.type === val ? "fill-[#0b9eeb]" : "")} />}
                              {type}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {q.type === 'Multiple Choice' && (
                      <div className="space-y-2 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Options</label>
                        {(q.options || []).map((opt, oIndex) => (
                          <div key={oIndex} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={opt}
                              onChange={e => updateOption(q.id, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className={cn(inputClass, "py-2")}
                            />
                            <button 
                              onClick={() => removeOption(q.id, oIndex)}
                              className="text-red-400 hover:text-red-600 p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(q.id)}
                          className="text-xs font-bold text-[#0b9eeb] hover:text-[#0882c2] mt-2 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Option
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CO ID *</label>
                        <input 
                          type="text" 
                          placeholder="CO1" 
                          value={q.coId}
                          onChange={(e) => updateQuestion(q.id, 'coId', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CO Description</label>
                        <input 
                          type="text" 
                          placeholder="Course outcome..." 
                          value={q.coDescription}
                          onChange={(e) => updateQuestion(q.id, 'coDescription', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 p-4 pb-6 flex gap-3 z-20">
          <button 
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="flex-1 bg-white border border-[#1e3c72] text-[#1e3c72] hover:bg-slate-50 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="h-5 w-5" /> Save Draft
          </button>
          <button 
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="flex-[1.5] bg-[#1e3c72] hover:bg-[#152a51] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
          >
            <UploadCloud className="h-5 w-5 text-white/90" /> Publish Survey
          </button>
        </div>

      </div>
    </div>
  );
}
