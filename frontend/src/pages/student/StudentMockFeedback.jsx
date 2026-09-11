import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiAward,
  FiCalendar,
  FiUser,
  FiBookOpen,
  FiActivity,
  FiCheck,
  FiAlertTriangle
} from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

export default function StudentMockFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/student/mock-interviews")
      .then((res) => setFeedbacks(res.data || []))
      .catch((err) => setError(err.response?.data?.message || "Failed to load mock interview feedback."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const total = feedbacks.length;
  const latest = feedbacks[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="surface p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-white via-orange-50/30 to-amber-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Performance & Evaluation
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink">
              My Mock Interview Feedback
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Review your module-wise technical ratings, improvement action plans, and interviewer advice from your Java Mock Interviews.
            </p>
          </div>
          {latest && (
            <div className={`p-4 rounded-xl border text-center shrink-0 ${
              latest.final_verdict === "Pass"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : latest.final_verdict === "Critical Gap"
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-amber-50 border-amber-300 text-amber-900"
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Latest Result</span>
              <p className="text-xl font-black">{latest.final_verdict}</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 font-bold text-sm">
          {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Interviews Conducted" value={total} icon={FiAward} />
        <StatCard label="Latest Interview Date" value={latest ? latest.interview_date : "None yet"} tone="gold" icon={FiCalendar} />
        <StatCard label="Primary Track" value={latest ? latest.course_name : "Java Fullstack"} tone="slate" icon={FiBookOpen} />
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <p className="text-sm text-slate-500 py-10 text-center">Loading your mock interview evaluations...</p>
      ) : !feedbacks.length ? (
        <div className="surface p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="h-14 w-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
            📋
          </div>
          <h3 className="text-lg font-black text-slate-800">No Mock Interview Feedback Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once you participate in a Java Mock Interview with our mentors, your comprehensive assessment report, module ratings, and personalized action plans will be available here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {feedbacks.map((fb, idx) => (
            <div
              key={fb.id}
              className="surface rounded-2xl border border-slate-200 shadow-md overflow-hidden bg-white"
            >
              {/* Header Bar */}
              <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-orange-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                    #{feedbacks.length - idx}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Mock Interview on {fb.interview_date}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Interviewer: <span className="font-bold text-slate-700">{fb.interviewer_name}</span> · {fb.course_name} · {fb.branch}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${
                    fb.final_verdict === "Pass"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : fb.final_verdict === "Critical Gap"
                      ? "bg-rose-100 text-rose-900 border border-rose-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}>
                    {fb.final_verdict === "Pass" ? <FiCheckCircle /> : fb.final_verdict === "Critical Gap" ? <FiXCircle /> : <FiAlertCircle />}
                    {fb.final_verdict}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Module-wise Technical Ratings */}
                <div>
                  <h4 className="font-black text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <FiActivity className="text-orange-600" /> Technical Rating (Module-wise)
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                    {Object.entries(fb.technical_ratings || {}).map(([mod, rating]) => (
                      <div
                        key={mod}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-800 font-medium">{mod}</span>
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] shrink-0 ${
                          rating === "Excellent" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          rating === "Good" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          rating === "Average" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Plans */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Technical Improvement */}
                  <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 space-y-2.5">
                    <h4 className="font-black text-xs text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                      <FiAlertTriangle className="text-orange-600" /> Java Technical Improvement Plan
                    </h4>
                    <ul className="space-y-2 text-xs">
                      {Object.entries(fb.technical_action_plan || {}).map(([item, status]) => (
                        <li key={item} className="flex items-start justify-between gap-2 text-slate-800">
                          <span>• {item}</span>
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded shrink-0 ${
                            status === "Needed" ? "bg-rose-100 text-rose-700 font-black" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {status === "Needed" ? "Practice Needed" : status === "NotNeeded" ? "Proficient" : "N/A"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Soft Skills Improvement */}
                  <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2.5">
                    <h4 className="font-black text-xs text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                      <FiCheck className="text-teal-600" /> Soft Skills & Presentation Plan
                    </h4>
                    <ul className="space-y-2 text-xs">
                      {Object.entries(fb.soft_skills_action_plan || {}).map(([item, status]) => (
                        <li key={item} className="flex items-start justify-between gap-2 text-slate-800">
                          <span>• {item}</span>
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded shrink-0 ${
                            status === "Needed" ? "bg-rose-100 text-rose-700 font-black" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {status === "Needed" ? "Practice Needed" : status === "NotNeeded" ? "Good" : "N/A"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Candidate Feedback */}
                {fb.candidate_feedback && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider mb-1">
                      Mentor Feedback & Recommendations
                    </h4>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                      {fb.candidate_feedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
