import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Search, GraduationCap, UserRound } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { cn } from "../lib/utils";

interface UserManagementProps {
  onBack: () => void;
}

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | "Student" | "Faculty">("All");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const departments = [
    "All Departments",
    "Computer Science",
    "Electronics",
    "Mechanical",
    "Civil",
    "Information Technology",
    "Electrical"
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      // Use simple query without compound indexes to avoid missing index errors
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      
      const loadedUsers: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.role !== "admin") {
          loadedUsers.push({ id: doc.id, ...data });
        }
      });
      
      setUsers(loadedUsers);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.fullName || "").toLowerCase().includes(search.toLowerCase()) || 
      (u.rollNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.department || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === "All" || u.role?.toLowerCase() === roleFilter.toLowerCase();
    const matchesDept = deptFilter === "All Departments" || u.department === deptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  const studentCount = users.filter(u => u.role === 'student').length;
  const facultyCount = users.filter(u => u.role === 'faculty').length;

  return (
    <div className="min-h-screen bg-[#f3f6f9] font-sans flex flex-col items-center pb-10">
      <div className="w-full max-w-md bg-[#f3f6f9] min-h-screen relative shadow-xl">
        
        {/* Header */}
        <div className="bg-[#1e3c72] text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold leading-tight">User Management</h1>
              <p className="text-xs text-blue-200">{studentCount} students · {facultyCount} faculty</p>
            </div>
          </div>
          <button onClick={fetchUsers} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex text-sm shadow-sm">
          <div className="flex-1 flex justify-center items-center gap-1.5 border-r border-gray-200 font-semibold text-slate-700">
            <GraduationCap className="w-4 h-4 text-[#1e3c72]" /> <span>{studentCount}</span> <span className="text-slate-400 font-normal">Students</span>
          </div>
          <div className="flex-1 flex justify-center items-center gap-1.5 border-r border-gray-200 font-semibold text-slate-700">
            <UserRound className="w-4 h-4 text-[#0b9eeb]" /> <span>{facultyCount}</span> <span className="text-slate-400 font-normal">Faculty</span>
          </div>
          <div className="flex-[0.8] flex justify-center items-center gap-1.5 font-semibold text-slate-700">
            <UsersIcon className="w-4 h-4 text-[#1f9b44]" /> <span>{users.length}</span> <span className="text-slate-400 font-normal">Total</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name, roll no, department..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-11 pr-4 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3c72] placeholder:text-gray-400"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 relative z-10">
            {/* Segmented Control */}
            <div className="flex-1 flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm h-[42px]">
              {["All", "Student", "Faculty"].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role as any)}
                  className={cn(
                    "flex-1 text-xs font-semibold rounded-lg transition-colors",
                    roleFilter === role ? "bg-[#1e3c72] text-white shadow" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Dept Dropdown Button */}
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                className="h-[42px] px-3 bg-[#e4f3fb] text-[#0b9eeb] border border-[#bde0f6] rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm"
              >
                <FilterIcon className="w-3.5 h-3.5" /> Dept <ChevronDown className="w-4 h-4" />
              </button>

              {showDeptDropdown && (
                <div className="absolute right-0 top-[48px] w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-20">
                  {departments.map((dept, i) => (
                    <button
                      key={dept}
                      onClick={() => { setDeptFilter(dept); setShowDeptDropdown(false); }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm flex items-center gap-2",
                        i !== departments.length - 1 && "border-b border-gray-100",
                        deptFilter === dept ? "bg-blue-50 text-[#1e3c72] font-semibold" : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {deptFilter === dept && <Check className="w-4 h-4" />}
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* List Info */}
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-medium text-slate-400">{filteredUsers.length} users</span>
            {(roleFilter !== "All" || deptFilter !== "All Departments" || search !== "") && (
              <button 
                onClick={() => { setSearch(""); setRoleFilter("All"); setDeptFilter("All Departments"); }}
                className="text-xs font-bold text-[#1e3c72] flex items-center gap-1"
              >
                <FilterIcon className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>

          {/* User Cards */}
          <div className="space-y-3 pb-8">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
                {loading ? "Loading..." : "No users found matching criteria."}
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="bg-white p-4 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex gap-4 items-center transition-all hover:shadow-md">
                  <div className="h-12 w-12 rounded-full bg-[#e4f3fb] text-[#0b9eeb] font-bold flex items-center justify-center text-xl shrink-0 uppercase">
                    {(u.fullName || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="font-bold text-slate-800 truncate pr-2">{u.fullName}</h3>
                      <span className={cn(
                        "shrink-0 px-2 py-[2px] rounded-full text-[10px] font-bold flex items-center gap-1",
                        u.role === 'faculty' ? "bg-cyan-50 text-cyan-600" : "bg-blue-50 text-[#1e3c72]"
                      )}>
                        {u.role === 'faculty' ? <UserRound className="w-3 h-3"/> : <GraduationCap className="w-3 h-3"/>}
                        <span className="capitalize">{u.role}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium font-mono">
                      {u.role === 'student' ? (u.rollNumber ? `Roll No: ${u.rollNumber}` : 'No Roll No') : `ID: ${u.userId.split('_')[1] || u.userId}`}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1.5 items-center">
                      <span className="flex items-center gap-1"><span className="text-slate-300">🏢</span> {u.department || 'N/A'}</span>
                      {u.role === 'student' && <span className="flex items-center gap-1 text-slate-300">|</span>}
                      {u.role === 'student' && <span className="flex items-center gap-1"><span className="text-slate-300">📘</span> Sem {u.semester}</span>}
                      {u.role === 'student' && <span className="flex items-center gap-1 text-slate-300">|</span>}
                      {u.role === 'student' && <span className="flex items-center gap-1"><span className="text-slate-300">📅</span> Year {u.year}</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FilterIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ChevronDown(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Check(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
