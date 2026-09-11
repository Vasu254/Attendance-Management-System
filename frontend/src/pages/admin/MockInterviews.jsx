import { useEffect, useState, useMemo } from "react";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiSend,
  FiUser,
  FiMail,
  FiCalendar,
  FiClock,
  FiSearch,
  FiDownload,
  FiFilter,
  FiEye,
  FiRotateCw,
  FiTrash2,
  FiList,
  FiPlusCircle,
  FiPrinter,
  FiAward,
  FiShare2,
  FiCheck
} from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const JAVA_MODULES = [
  "Java Fundamentals (JDK, JRE, JVM, Program Structure, Compilation, Execution)",
  "Variables & Data Types (Variables, Identifiers, Primitive Types, Non-Primitive Types, Type Casting)",
  "Operators & Decision Making (Arithmetic, Relational, Logical, Assignment, Unary, Ternary, if-else, switch)",
  "Loops & Logic Building (for, while, do-while, Nested Loops, Number Logic)",
  "Methods (Method Declaration, Parameters, Return Types, Method Calling, Method Overloading, Recursion)",
  "Object-Oriented Programming (Class, Object, Constructor, this, static, Encapsulation, Inheritance, Polymorphism, Abstraction, Interfaces)",
  "Arrays (1D Arrays, 2D Arrays, Traversing, Searching, Basic Operations)",
  "Strings (String Class, String Pool, String Methods, String Immutability, StringBuffer, StringBuilder)",
  "Exception Handling (try, catch, finally, Multiple catch, throw, throws, Custom Exceptions)",
  "Collections Framework (List, Set, Queue, Map, ArrayList, LinkedList, HashSet, LinkedHashSet, TreeSet, HashMap)",
  "Generics & Sorting (Generics, Comparable, Comparator, Object Sorting)",
  "Java 8 Features (Functional Interface, Lambda Expressions, Method References, Stream API, Optional, Date & Time API)"
];

const TECH_ACTION_ITEMS = [
  "Revise Core Java Fundamentals – Strengthen understanding of JVM, JRE, JDK, program structure, data types, operators, and control statements",
  "Build Strong Logic Skills – Practice loops, number programs, pattern programs, arrays, and step-by-step problem solving",
  "Master Object-Oriented Programming – Clearly understand classes, objects, constructors, encapsulation, inheritance, polymorphism, abstraction, interfaces, this, and static",
  "Improve Arrays & Strings – Practice array operations, string methods, StringBuilder, StringBuffer, and interview-based logic programs",
  "Strengthen Exception Handling & Collections – Practice exception handling, List, Set, Queue, Map, Generics, Comparable, and Comparator",
  "Practice Java 8 & Real-world Applications – Use Lambda Expressions, Stream API, Optional, Date & Time API, solve interview questions, and build a mini project"
];

const SOFT_SKILLS_ITEMS = [
  "Highlight technical skills and project impact in resume",
  "Optimise resume for targeted DA roles",
  "Update LinkedIn profile and GitHub portfolio",
  "Build confidence in English speaking and articulation",
  "Improve explanation of thought process during problem-solving",
  "Reduce filler words and improve clarity"
];

const COURSES = ["JavaFullstack", "PythonFullStack", "MernStack"];
const BRANCHES = [
  "Dilshuknagar, Hyderabad",
  "HSR, Bangalore",
  "JNTU, Hyderabad",
  "Kothrud, Pune",
  "Online"
];

const todayStr = new Date().toISOString().slice(0, 10);

const initialForm = {
  interviewer_email: "vasukumar.telugu@innomatics.in",
  interviewer_name: "Raghu Ram Aduri",
  student_id: null,
  learner_name: "",
  learner_email: "",
  enrollment_id: "",
  batch_number: "",
  course_name: "JavaFullstack",
  branch: "Dilshuknagar, Hyderabad",
  punctuality: "On Time",
  interview_date: todayStr,
  technical_ratings: JAVA_MODULES.reduce((acc, m) => ({ ...acc, [m]: "Average" }), {}),
  technical_action_plan: TECH_ACTION_ITEMS.reduce((acc, a) => ({ ...acc, [a]: "Needed" }), {}),
  soft_skills_action_plan: SOFT_SKILLS_ITEMS.reduce((acc, s) => ({ ...acc, [s]: "Needed" }), {}),
  final_verdict: "Needs Improvement",
  internal_remarks: "",
  candidate_feedback: "",
};

export default function MockInterviews() {
  const [activeTab, setActiveTab] = useState("FORM"); // "FORM" or "INBOX"
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Autocomplete student search
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Submissions list & filters
  const [feedbacks, setFeedbacks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", batch: "", verdict: "", start_date: "", end_date: "" });
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const loadFeedbacks = () => {
    setListLoading(true);
    api.get("/mock-interviews", { params: filters })
      .then((res) => {
        setFeedbacks(res.data.feedbacks || []);
        setSummary(res.data.summary || null);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load mock interviews"))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    if (activeTab === "INBOX") {
      loadFeedbacks();
    }
  }, [activeTab]);

  // Student autocomplete search debounce
  useEffect(() => {
    if (!studentQuery.trim() || studentQuery.length < 2) {
      setStudentSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchingStudents(true);
      api.get("/mock-interviews/students-lookup", { params: { q: studentQuery } })
        .then((res) => setStudentSuggestions(res.data || []))
        .catch(() => setStudentSuggestions([]))
        .finally(() => setSearchingStudents(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const selectStudent = (student) => {
    setForm((prev) => ({
      ...prev,
      student_id: student.id,
      learner_name: student.full_name,
      learner_email: student.email,
      enrollment_id: student.student_id,
      batch_number: student.batch || prev.batch_number,
      course_name: student.course && COURSES.includes(student.course) ? student.course : prev.course_name,
    }));
    setStudentQuery("");
    setStudentSuggestions([]);
  };

  const handleTechRating = (module, rating) => {
    setForm((prev) => ({
      ...prev,
      technical_ratings: { ...prev.technical_ratings, [module]: rating },
    }));
  };

  const handleTechAction = (item, status) => {
    setForm((prev) => ({
      ...prev,
      technical_action_plan: { ...prev.technical_action_plan, [item]: status },
    }));
  };

  const handleSoftAction = (item, status) => {
    setForm((prev) => ({
      ...prev,
      soft_skills_action_plan: { ...prev.soft_skills_action_plan, [item]: status },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("/mock-interviews", form);
      setMessage(res.data.message || "Feedback recorded and emailed successfully!");
      setForm(initialForm);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit mock interview feedback.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (feedbackId) => {
    try {
      const res = await api.post(`/mock-interviews/${feedbackId}/resend-email`);
      alert(res.data.message || "Email re-sent successfully!");
      loadFeedbacks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to re-send email.");
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!window.confirm("Are you sure you want to delete this mock interview record?")) return;
    try {
      await api.delete(`/mock-interviews/${feedbackId}`);
      loadFeedbacks();
    } catch (err) {
      alert("Failed to delete record.");
    }
  };

  const exportCsv = () => {
    api.get("/mock-interviews/export", { responseType: "blob" })
      .then((res) => {
        const url = URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `Java_Mock_Interview_Feedbacks_${todayStr}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert("Failed to export CSV."));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-orange-200 bg-white">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 sm:p-8 text-white relative">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Innomatics Research Labs
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              FSD - Mock Interview | JAVA
            </h1>
            <p className="mt-2 text-sm text-orange-100 font-medium leading-relaxed">
              Please fill out this form to record the Java Mock Interview feedback. Ensure all details are accurate, as the data will be used for performance analysis, candidate guidance, and reporting.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs text-orange-100">
            <div className="flex items-center gap-1.5 font-bold">
              <FiMail className="text-white" /> Dispatch to student & <span className="underline text-white font-mono">{form.interviewer_email}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("FORM")}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                  activeTab === "FORM" ? "bg-white text-orange-700 shadow" : "bg-orange-800/40 hover:bg-orange-800/70 text-white"
                }`}
              >
                <FiPlusCircle /> New Feedback Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("INBOX")}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                  activeTab === "INBOX" ? "bg-white text-orange-700 shadow" : "bg-orange-800/40 hover:bg-orange-800/70 text-white"
                }`}
              >
                <FiList /> Submissions Inbox {summary?.total ? `(${summary.total})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-sm flex items-center gap-2 shadow-sm animate-fade-in">
          <FiCheckCircle className="text-emerald-600 text-lg shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 font-bold text-sm flex items-center gap-2 shadow-sm">
          <FiAlertCircle className="text-rose-600 text-lg shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: NEW EVALUATION FORM */}
      {activeTab === "FORM" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Candidate & Interview Details */}
          <div className="surface p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-lg font-black text-ink flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black inline-flex items-center justify-center">1</span>
              Learner & Interview Information
            </h2>

            {/* Live Autocomplete Search */}
            <div className="relative">
              <label className="label text-slate-700 font-bold">
                Search Enrolled Student <span className="text-slate-400 font-normal text-xs">(Auto-fills name, email, batch, and ID)</span>
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type student name, student ID, or email..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  className="field pl-9 bg-slate-50"
                />
              </div>

              {searchingStudents && (
                <p className="text-xs text-slate-400 mt-1 italic">Searching enrolled students...</p>
              )}

              {studentSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {studentSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStudent(s)}
                      className="w-full text-left p-3 hover:bg-orange-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-900">{s.full_name}</p>
                        <p className="text-xs text-slate-500">{s.student_id} · {s.email}</p>
                      </div>
                      <span className="text-xs font-black px-2 py-1 bg-slate-100 rounded text-slate-700">{s.batch || "No batch"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Learner Name *</label>
                <input
                  required
                  type="text"
                  className="field"
                  placeholder="e.g. Shruthi Mendi"
                  value={form.learner_name}
                  onChange={(e) => setForm({ ...form, learner_name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Learner Email Id *</label>
                <input
                  required
                  type="email"
                  className="field"
                  placeholder="e.g. student@gmail.com"
                  value={form.learner_email}
                  onChange={(e) => setForm({ ...form, learner_email: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Learner Course Enrollment ID *</label>
                <input
                  required
                  type="text"
                  className="field font-mono"
                  placeholder="e.g. 81030605226"
                  value={form.enrollment_id}
                  onChange={(e) => setForm({ ...form, enrollment_id: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Learner Batch Number *</label>
                <input
                  required
                  type="text"
                  className="field"
                  placeholder="e.g. 58_59_60_61"
                  value={form.batch_number}
                  onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Course Name *</label>
                <select
                  className="field font-bold text-slate-800"
                  value={form.course_name}
                  onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                >
                  {COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Branch *</label>
                <select
                  className="field font-bold text-slate-800"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Interviewer Name * <span className="text-slate-400 font-normal text-xs">(Format - Raghu Ram Aduri)</span></label>
                <input
                  required
                  type="text"
                  className="field"
                  placeholder="e.g. Raghu Ram Aduri"
                  value={form.interviewer_name}
                  onChange={(e) => setForm({ ...form, interviewer_name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Interview Date *</label>
                <input
                  required
                  type="date"
                  className="field"
                  value={form.interview_date}
                  onChange={(e) => setForm({ ...form, interview_date: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Punctuality: Did the candidate join on time? *</label>
                <div className="flex gap-4 mt-1">
                  {["On Time", "No"].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer font-bold text-sm transition-all ${
                        form.punctuality === opt
                          ? "bg-orange-50 border-orange-400 text-orange-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="punctuality"
                        value={opt}
                        checked={form.punctuality === opt}
                        onChange={(e) => setForm({ ...form, punctuality: e.target.value })}
                        className="text-orange-600"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Rating Matrix */}
          <div className="surface p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black inline-flex items-center justify-center">2</span>
                Technical Rating (Module-wise) *
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Rating scale: <span className="font-bold text-rose-700">1. Poor</span> · <span className="font-bold text-amber-700">2. Average</span> · <span className="font-bold text-blue-700">3. Good</span> · <span className="font-bold text-emerald-700">4. Excellent</span>
              </p>
            </div>

            <div className="space-y-3 divide-y divide-slate-100">
              {JAVA_MODULES.map((mod, idx) => {
                const currentRating = form.technical_ratings[mod] || "Average";
                return (
                  <div key={mod} className={`pt-3 ${idx === 0 ? "pt-0" : ""}`}>
                    <p className="text-xs font-bold text-slate-900 mb-2 leading-snug">
                      <span className="text-orange-600 font-black mr-1">{idx + 1}.</span> {mod}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "Poor", color: "hover:bg-rose-50 text-rose-700 border-rose-200", active: "bg-rose-600 text-white border-rose-600" },
                        { label: "Average", color: "hover:bg-amber-50 text-amber-700 border-amber-200", active: "bg-amber-600 text-white border-amber-600" },
                        { label: "Good", color: "hover:bg-blue-50 text-blue-700 border-blue-200", active: "bg-blue-600 text-white border-blue-600" },
                        { label: "Excellent", color: "hover:bg-emerald-50 text-emerald-700 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600" },
                      ].map((r) => {
                        const isSelected = currentRating === r.label;
                        return (
                          <button
                            type="button"
                            key={r.label}
                            onClick={() => handleTechRating(mod, r.label)}
                            className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                              isSelected ? `${r.active} shadow-sm scale-[1.02]` : `bg-white ${r.color}`
                            }`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Technical Action Plan */}
          <div className="surface p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black inline-flex items-center justify-center">3</span>
                Action Plan (Java Technical Improvement) *
              </h2>
              <p className="text-xs text-slate-500 mt-1">Specify whether improvement is Needed, Not Needed, or N/A for each area</p>
            </div>

            <div className="space-y-3 divide-y divide-slate-100">
              {TECH_ACTION_ITEMS.map((item, idx) => {
                const currentStatus = form.technical_action_plan[item] || "Needed";
                return (
                  <div key={item} className={`pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx === 0 ? "pt-0" : ""}`}>
                    <p className="text-xs font-bold text-slate-800 max-w-xl">
                      <span className="text-orange-600 mr-1">•</span> {item}
                    </p>
                    <div className="flex gap-1.5 shrink-0">
                      {[
                        { label: "Needed", active: "bg-rose-600 text-white border-rose-600" },
                        { label: "NotNeeded", active: "bg-emerald-600 text-white border-emerald-600" },
                        { label: "NA", active: "bg-slate-600 text-white border-slate-600" },
                      ].map((opt) => {
                        const isSelected = currentStatus === opt.label;
                        return (
                          <button
                            type="button"
                            key={opt.label}
                            onClick={() => handleTechAction(item, opt.label)}
                            className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${
                              isSelected ? `${opt.active} shadow-sm` : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {opt.label === "NotNeeded" ? "Not Needed" : opt.label === "NA" ? "N/A" : opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Soft Skills Action Plan */}
          <div className="surface p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black inline-flex items-center justify-center">4</span>
                Action Plan (Soft Skills) *
              </h2>
              <p className="text-xs text-slate-500 mt-1">Specify whether soft skill mentoring is Needed, Not Needed, or N/A</p>
            </div>

            <div className="space-y-3 divide-y divide-slate-100">
              {SOFT_SKILLS_ITEMS.map((item, idx) => {
                const currentStatus = form.soft_skills_action_plan[item] || "Needed";
                return (
                  <div key={item} className={`pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx === 0 ? "pt-0" : ""}`}>
                    <p className="text-xs font-bold text-slate-800 max-w-xl">
                      <span className="text-orange-600 mr-1">•</span> {item}
                    </p>
                    <div className="flex gap-1.5 shrink-0">
                      {[
                        { label: "Needed", active: "bg-rose-600 text-white border-rose-600" },
                        { label: "NotNeeded", active: "bg-emerald-600 text-white border-emerald-600" },
                        { label: "NA", active: "bg-slate-600 text-white border-slate-600" },
                      ].map((opt) => {
                        const isSelected = currentStatus === opt.label;
                        return (
                          <button
                            type="button"
                            key={opt.label}
                            onClick={() => handleSoftAction(item, opt.label)}
                            className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${
                              isSelected ? `${opt.active} shadow-sm` : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {opt.label === "NotNeeded" ? "Not Needed" : opt.label === "NA" ? "N/A" : opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Final Verdict & Constructive Remarks */}
          <div className="surface p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black inline-flex items-center justify-center">5</span>
                Final Verdict & Comments *
              </h2>
              <p className="text-xs text-slate-500 mt-1">Overall how would you grade the candidate?</p>
            </div>

            {/* Verdict Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  verdict: "Pass",
                  desc: "Meets role expectations, ready for next steps.",
                  badge: "bg-emerald-50 border-emerald-400 text-emerald-900",
                  active: "ring-2 ring-emerald-600 bg-emerald-100 border-emerald-500",
                  icon: FiCheckCircle,
                },
                {
                  verdict: "Needs Improvement",
                  desc: "Gaps in some skills, targeted practice needed.",
                  badge: "bg-amber-50 border-amber-400 text-amber-900",
                  active: "ring-2 ring-amber-600 bg-amber-100 border-amber-500",
                  icon: FiAlertCircle,
                },
                {
                  verdict: "Critical Gap",
                  desc: "Major skill gaps, not role-ready yet.",
                  badge: "bg-rose-50 border-rose-400 text-rose-900",
                  active: "ring-2 ring-rose-600 bg-rose-100 border-rose-500",
                  icon: FiXCircle,
                },
              ].map((v) => {
                const Icon = v.icon;
                const isSelected = form.final_verdict === v.verdict;
                return (
                  <button
                    type="button"
                    key={v.verdict}
                    onClick={() => setForm({ ...form, final_verdict: v.verdict })}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected ? v.active : `${v.badge} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-base">
                      <Icon /> {v.verdict}
                    </div>
                    <p className="text-xs mt-1.5 text-slate-600">{v.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Internal Remarks (Private) */}
            <div>
              <label className="label text-slate-700 font-bold">
                Internal Remarks <span className="text-slate-400 font-normal text-xs">(For internal team purpose — won't be shared with candidate)</span>
              </label>
              <textarea
                rows={2}
                className="field text-xs"
                placeholder="Internal notes, mentor observations..."
                value={form.internal_remarks}
                onChange={(e) => setForm({ ...form, internal_remarks: e.target.value })}
              />
            </div>

            {/* Candidate Feedback (Emailed) */}
            <div>
              <label className="label text-slate-700 font-bold">
                Candidate Feedback & Strengths / Weaknesses <span className="text-slate-400 font-normal text-xs">(Included in the student email report)</span>
              </label>
              <textarea
                rows={3}
                className="field text-xs"
                placeholder="Specific feedback, topics to focus on, encouraging remarks..."
                value={form.candidate_feedback}
                onChange={(e) => setForm({ ...form, candidate_feedback: e.target.value })}
              />
            </div>

            {/* Email Dispatch Notice */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Automated Email Dispatch</p>
                <p className="mt-0.5">
                  Submitting will automatically format and send the complete evaluation to <strong className="text-slate-900">{form.learner_email || "the student"}</strong> and CC <strong className="text-slate-900">{form.interviewer_email}</strong>.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <FiSend /> Ready
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              className="btn-secondary px-6"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-black text-sm shadow-md flex items-center gap-2"
            >
              {loading ? <FiRotateCw className="animate-spin" /> : <FiSend />}
              {loading ? "Recording & Dispatching..." : "Submit & Email Feedback"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SUBMISSIONS INBOX / DASHBOARD */}
      {activeTab === "INBOX" && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {summary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Interviews" value={summary.total || 0} icon={FiAward} />
              <StatCard label="Passed (Ready)" value={`${summary.pass_count || 0} (${summary.pass_rate || 0}%)`} tone="gold" icon={FiCheckCircle} />
              <StatCard label="Needs Improvement" value={summary.needs_improvement_count || 0} tone="coral" icon={FiAlertCircle} />
              <StatCard label="Critical Gap" value={summary.critical_gap_count || 0} tone="red" icon={FiXCircle} />
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="surface p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search student, ID, email, interviewer..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="field text-xs pl-8 py-1.5"
                />
              </div>
              <input
                type="text"
                placeholder="Batch..."
                value={filters.batch}
                onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
                className="field text-xs py-1.5 w-28"
              />
              <select
                value={filters.verdict}
                onChange={(e) => setFilters({ ...filters, verdict: e.target.value })}
                className="field text-xs py-1.5 w-40 font-bold"
              >
                <option value="">All Verdicts</option>
                <option value="Pass">Pass</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="Critical Gap">Critical Gap</option>
              </select>
              <button
                onClick={loadFeedbacks}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Filter
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="btn-secondary text-xs py-1.5 px-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-bold flex items-center gap-1"
              >
                <FiDownload /> Export CSV
              </button>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="surface rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="table-wrap border-0 shadow-none">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Candidate</th>
                    <th>Enrollment ID</th>
                    <th>Batch</th>
                    <th>Interviewer</th>
                    <th>Punctuality</th>
                    <th>Final Verdict</th>
                    <th>Email Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {feedbacks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-bold text-slate-700 whitespace-nowrap">{item.interview_date}</td>
                      <td>
                        <p className="font-bold text-ink text-sm">{item.learner_name}</p>
                        <p className="text-slate-400 text-[11px]">{item.learner_email}</p>
                      </td>
                      <td className="font-mono text-slate-600 font-bold">{item.enrollment_id}</td>
                      <td><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">{item.batch_number}</span></td>
                      <td className="font-semibold text-slate-700">{item.interviewer_name}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.punctuality === "On Time" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {item.punctuality}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.final_verdict === "Pass"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : item.final_verdict === "Critical Gap"
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}>
                          {item.final_verdict === "Pass" ? <FiCheckCircle /> : item.final_verdict === "Critical Gap" ? <FiXCircle /> : <FiAlertCircle />}
                          {item.final_verdict}
                        </span>
                      </td>
                      <td>
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <FiCheck /> Sent
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedFeedback(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                            title="View Detailed Assessment Report"
                          >
                            <FiEye />
                          </button>
                          <button
                            onClick={() => handleResendEmail(item.id)}
                            className="p-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700"
                            title="Resend Email to Student & Admin"
                          >
                            <FiSend />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!feedbacks.length && !listLoading && (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        <p className="text-sm font-semibold">No mock interview feedback records found.</p>
                        <p className="text-xs mt-1">Submit your first interview evaluation from the form tab above.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL ASSESSMENT MODAL */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider">Assessment Report</span>
                <h3 className="text-xl font-black text-slate-900">{selectedFeedback.learner_name}</h3>
                <p className="text-xs text-slate-500">{selectedFeedback.enrollment_id} · {selectedFeedback.batch_number} · {selectedFeedback.course_name}</p>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Verdict Banner */}
            <div className={`p-4 rounded-xl border text-center ${
              selectedFeedback.final_verdict === "Pass"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : selectedFeedback.final_verdict === "Critical Gap"
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-amber-50 border-amber-300 text-amber-900"
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Final Verdict</span>
              <p className="text-2xl font-black mt-0.5">{selectedFeedback.final_verdict}</p>
            </div>

            {/* Candidate Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
              <div><span className="text-slate-400">Date:</span><p className="font-bold text-slate-800">{selectedFeedback.interview_date}</p></div>
              <div><span className="text-slate-400">Interviewer:</span><p className="font-bold text-slate-800">{selectedFeedback.interviewer_name}</p></div>
              <div><span className="text-slate-400">Branch:</span><p className="font-bold text-slate-800">{selectedFeedback.branch}</p></div>
              <div><span className="text-slate-400">Punctuality:</span><p className="font-bold text-slate-800">{selectedFeedback.punctuality}</p></div>
            </div>

            {/* Technical Ratings */}
            <div>
              <h4 className="font-black text-sm text-slate-900 mb-2">Technical Rating (Module-wise)</h4>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(selectedFeedback.technical_ratings || {}).map(([mod, rating]) => (
                  <div key={mod} className="p-2.5 rounded-lg border border-slate-100 bg-white flex items-center justify-between">
                    <span className="text-slate-700 font-medium truncate max-w-[240px]" title={mod}>{mod}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                      rating === "Excellent" ? "bg-emerald-100 text-emerald-800" :
                      rating === "Good" ? "bg-blue-100 text-blue-800" :
                      rating === "Average" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Action Plan */}
            <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200">
              <h4 className="font-black text-xs text-orange-950 uppercase tracking-wider mb-2">Technical Improvement Areas</h4>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {Object.entries(selectedFeedback.technical_action_plan || {}).map(([item, status]) => (
                  <li key={item} className="flex items-start justify-between gap-2">
                    <span>• {item}</span>
                    <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0 ${status === "Needed" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}`}>
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Candidate Feedback */}
            {selectedFeedback.candidate_feedback && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider mb-1">Interviewer Feedback</h4>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed">{selectedFeedback.candidate_feedback}</p>
              </div>
            )}

            {/* Internal Remarks */}
            {selectedFeedback.internal_remarks && (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                <h4 className="font-black text-xs text-amber-900 uppercase tracking-wider mb-1">Internal Team Remarks (Confidential)</h4>
                <p className="text-amber-950 whitespace-pre-line leading-relaxed">{selectedFeedback.internal_remarks}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleResendEmail(selectedFeedback.id)}
                className="btn-secondary text-xs px-4 py-2 text-orange-700 hover:bg-orange-50 border-orange-200 flex items-center gap-1.5"
              >
                <FiSend /> Resend Email
              </button>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="btn-primary text-xs px-5 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
