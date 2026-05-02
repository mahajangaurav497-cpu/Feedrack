import React, { useState } from "react";
import { 
  GraduationCap, UserRound, Shield, 
  Lock, Eye, LogIn, UserPlus, PenTool,
  Building, Briefcase, CalendarDays, BookOpen,
  IdCard, EyeOff
} from "lucide-react";
import { cn } from "./lib/utils";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import FacultyDashboard from "./components/FacultyDashboard";
import AdminDashboard from "./components/AdminDashboard";

import StudentDashboard from "./components/StudentDashboard";

type Role = "student" | "faculty" | "admin";
type Mode = "login" | "register";

export default function App() {
  const [role, setRole] = useState<Role>("student");
  const [mode, setMode] = useState<Mode>("login");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth State
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [semester, setSemester] = useState("");
  const [year, setYear] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === "admin") setMode("login");
    // Reset fields
    setFullName("");
    setRollNumber("");
    setDepartment("");
    setSemester("");
    setYear("");
    setPassword("");
    setError("");
  };

  const getThemeClass = (r: Role) => {
    switch(r) {
      case "student": return "bg-[#1c3c6d] text-white";
      case "faculty": return "bg-[#0b9eeb] text-white";
      case "admin": return "bg-[#1f9b44] text-white";
    }
  };

  const getThemeTextClass = (r: Role) => {
    switch(r) {
      case "student": return "text-[#1c3c6d]";
      case "faculty": return "text-[#0b9eeb]";
      case "admin": return "text-[#1f9b44]";
    }
  };

  const getThemeBtnClass = (r: Role) => {
    switch(r) {
      case "student": return "bg-[#1c3c6d] hover:bg-[#132c52] text-white";
      case "faculty": return "bg-[#0b9eeb] hover:bg-[#0882c2] text-white";
      case "admin": return "bg-[#1f9b44] hover:bg-[#197f37] text-white";
    }
  };

  const toggleMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const validateForm = () => {
    if (!password || password.length < 6) return "Password must be at least 6 characters.";
    if (role === 'student') {
      if (mode === 'register') {
        if (!fullName || !rollNumber || !department || !studentClass || !semester || !year) return "All fields are required.";
      } else {
        if (!rollNumber) return "Roll Number is required.";
      }
    }
    if (role === 'faculty') {
      if (!fullName) return "Full Name is required.";
      if (mode === 'register' && !department) return "Department is required.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      if (role === "admin") {
        if (password === "Admin@123") {
          setLoggedInUser({ role: "admin", fullName: "Administrator" });
          alert("Admin Login Successful!");
        } else {
          setError("Invalid admin credentials.");
        }
        setIsLoading(false);
        return;
      }

      const safeId = (role === 'student' ? rollNumber : fullName).toLowerCase().replace(/[^a-z0-9]/g, '');
      const docId = `${role}_${safeId}`;

      if (mode === "register") {
        // Check if exists
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, "users", docId));
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${docId}`);
          return;
        }
        if (userDoc.exists()) {
          setError("Account already exists for this ID.");
          setIsLoading(false);
          return;
        }

        const newUser = {
          userId: docId,
          role,
          password, // Note: In a real app, passwords should be hashed and authenticated securely.
          fullName: fullName || "",
          rollNumber: rollNumber || "",
          department: department || "",
          studentClass: studentClass || "",
          semester: semester || "",
          year: year || "",
        };

        try {
          await setDoc(doc(db, "users", docId), newUser);
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/${docId}`);
          return;
        }
        setLoggedInUser(newUser);
        alert("Registration Successful!");
      } else {
        // Login
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, "users", docId));
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${docId}`);
          return;
        }
        if (!userDoc.exists()) {
          setError("Account not found. Please register first.");
          setIsLoading(false);
          return;
        }
        const data = userDoc.data();
        if (data!.password !== password) {
          setError("Invalid credentials. Please try again.");
          setIsLoading(false);
          return;
        }
        setLoggedInUser(data);
        alert("Login Successful!");
      }
    } catch (err: any) {
      let code = err.message || "An error occurred";
      setError(code);
    } finally {
      setIsLoading(false);
    }
  };

  if (loggedInUser) {
    if (loggedInUser.role === "admin") {
      return <AdminDashboard user={loggedInUser} onLogout={() => { setLoggedInUser(null); setPassword(""); }} />;
    }
    if (loggedInUser.role === "faculty") {
      return <FacultyDashboard user={loggedInUser} onLogout={() => { setLoggedInUser(null); setPassword(""); }} />;
    }
    if (loggedInUser.role === "student") {
      return <StudentDashboard user={loggedInUser} onLogout={() => { setLoggedInUser(null); setPassword(""); }} />;
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-[#f3f6f9] pb-10 font-sans flex flex-col items-center">
      {/* Mobile container boundary for visual constraint on desktop */}
      <div className="w-full max-w-md bg-[#f3f6f9] min-h-screen shadow-xl relative pb-20">
        
        {/* Header Section */}
        <div className="relative h-56 bg-slate-800 overflow-hidden text-center flex flex-col items-center justify-center">
          {/* Faux background pattern */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-[#325287]/80 mix-blend-multiply"></div>
          
          <div className="relative z-10 flex flex-col items-center mt-2">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-wide">vmedulife</h1>
            <p className="text-white/80 text-sm mt-1">Academic Feedback System</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="-mt-8 relative z-20 px-4">
          {/* Role Tabs */}
          <div className="bg-white rounded-full shadow-md flex mb-6 p-1">
            <button
              onClick={() => handleRoleChange("student")}
              className={cn("flex-1 py-3 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all", role === "student" ? getThemeClass("student") : "text-gray-500 hover:bg-gray-50")}
            >
              <GraduationCap className="h-4 w-4" /> Student
            </button>
            <button
              onClick={() => handleRoleChange("faculty")}
              className={cn("flex-1 py-3 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all", role === "faculty" ? getThemeClass("faculty") : "text-gray-500 hover:bg-gray-50")}
            >
              <UserRound className="h-4 w-4" /> Faculty
            </button>
            <button
              onClick={() => handleRoleChange("admin")}
              className={cn("flex-1 py-3 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all", role === "admin" ? getThemeClass("admin") : "text-gray-500 hover:bg-gray-50")}
            >
              <Shield className="h-4 w-4" /> Admin
            </button>
          </div>

          {/* Admin Context */}
          {role === "admin" && (
            <div className="text-center mb-6">
              <Shield className={cn("h-10 w-10 mx-auto mb-2", getThemeTextClass("admin"))} />
              <h2 className="text-xl font-bold text-slate-800">Admin Login</h2>
              <p className="text-sm text-slate-500 mt-1">Use the system-provided admin credentials.</p>
            </div>
          )}

          {/* Login/Register Toggle (only for Student/Faculty) */}
          {role !== "admin" && (
            <div className="flex rounded-full border border-gray-200 overflow-hidden mb-6">
              <button
                onClick={() => toggleMode("login")}
                className={cn("flex-1 py-3 text-sm font-medium transition-all", mode === "login" ? getThemeClass(role) : "bg-transparent text-gray-600 hover:bg-gray-50")}
              >
                Login
              </button>
              <button
                onClick={() => toggleMode("register")}
                className={cn("flex-1 py-3 text-sm font-medium transition-all", mode === "register" ? getThemeClass(role) : "bg-transparent text-gray-600 hover:bg-gray-50")}
              >
                Register
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* REGISTER FIELDS */}
            {mode === "register" && role === "student" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Full Name *</label>
                  <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="e.g. Arun Kumar" value={fullName} onChange={e => setFullName(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Roll Number *</label>
                  <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                    <IdCard className="h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="e.g. CS2021001" value={rollNumber} onChange={e => setRollNumber(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Department *</label>
                  <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <select value={department} onChange={e => setDepartment(e.target.value)} className={cn("flex-1 bg-transparent border-none outline-none text-sm cursor-pointer", department ? "text-gray-800" : "text-gray-400")}>
                      <option value="" disabled hidden>Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Tech">Information Technology</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Mechanical">Mechanical engineering</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Class *</label>
                    <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-gray-400" />
                      <input type="text" placeholder="e.g. FY-A" value={studentClass} onChange={e => setStudentClass(e.target.value)} className="flex-1 w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Semester *</label>
                    <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-gray-400" />
                      <select value={semester} onChange={e => setSemester(e.target.value)} className={cn("flex-1 bg-transparent border-none outline-none text-sm w-full cursor-pointer", semester ? "text-gray-800" : "text-gray-400")}>
                        <option value="" disabled hidden>Sem</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Year *</label>
                    <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-gray-400" />
                      <select value={year} onChange={e => setYear(e.target.value)} className={cn("flex-1 bg-transparent border-none outline-none text-sm w-full cursor-pointer", year ? "text-gray-800" : "text-gray-400")}>
                        <option value="" disabled hidden>Year</option>
                        <option value="FE">FE</option>
                        <option value="SE">SE</option>
                        <option value="TE">TE</option>
                        <option value="BE">BE</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {mode === "register" && role === "faculty" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Full Name *</label>
                  <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="e.g. Dr. Meena Sharma" value={fullName} onChange={e => setFullName(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Department *</label>
                  <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <select value={department} onChange={e => setDepartment(e.target.value)} className={cn("flex-1 bg-transparent border-none outline-none text-sm cursor-pointer", department ? "text-gray-800" : "text-gray-400")}>
                      <option value="" disabled hidden>Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Tech">Information Technology</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Mechanical">Mechanical engineering</option>
                    </select>
                  </div>
                </div>
              </>
            )}


            {/* LOGIN FIELDS */}
            {mode === "login" && role === "student" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Roll Number *</label>
                <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                  <IdCard className="h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="e.g. CS2021001" value={rollNumber} onChange={e => setRollNumber(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                </div>
              </div>
            )}

            {mode === "login" && role === "faculty" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Full Name *</label>
                <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="e.g. Dr. Meena Sharma" value={fullName} onChange={e => setFullName(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" />
                </div>
              </div>
            )}


            {/* COMMON PASSWORD FIELD */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600 uppercase">{role === "admin" ? "Admin Password *" : "Password *"}</label>
              <div className="bg-white px-3 py-3 rounded-lg border border-gray-200 flex items-center gap-3">
                <Lock className="h-5 w-5 text-gray-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center font-medium mt-1">{error}</p>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className={cn("w-full py-4 rounded-lg flex items-center justify-center gap-2 mt-4 font-semibold text-lg transition-all shadow-md disabled:opacity-75", getThemeBtnClass(role))}
            >
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  {mode === "login" ? "Login" : "Create Account"}
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

