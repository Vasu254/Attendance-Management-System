import { useEffect, useState, useMemo } from "react";
import {
  FiDownload,
  FiSearch,
  FiCalendar,
  FiActivity,
  FiTable,
  FiBarChart2,
  FiCheck,
  FiFilter,
  FiChevronDown,
  FiClock,
  FiRefreshCw,
  FiCopy,
  FiClipboard
} from "react-icons/fi";
import api from "../../api/axios";
import StatCard from "../../components/StatCard";

const getLocalDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayObj = new Date();
const todayStr = getLocalDateString(todayObj);

// Default start date: 7 days ago
const past7DaysObj = new Date();
past7DaysObj.setDate(past7DaysObj.getDate() - 6);
const defaultStartStr = getLocalDateString(past7DaysObj);

export default function Reports() {
  const [filters, setFilters] = useState({
    start_date: defaultStartStr,
    end_date: todayStr,
    session_type: "CLASS",
    search: "",
    batch: "",
  });

  const [data, setData] = useState({
    dates: [],
    date_headers: [],
    daily_summary: [],
    rows: [],
    totals: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [updatingCell, setUpdatingCell] = useState(null); // `${studentId}_${date}`
  const [viewMode, setViewMode] = useState("SHEET"); // "SHEET" or "ANALYTICS"
  const [copiedDate, setCopiedDate] = useState(null);

  const load = (customFilters = filters) => {
    setLoading(true);
    setError("");
    api
      .get("/admin/reports", { params: customFilters })
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePreset = (preset) => {
    const end = new Date();
    const start = new Date();
    if (preset === "TODAY") {
      // start is today
    } else if (preset === "7DAYS") {
      start.setDate(end.getDate() - 6);
    } else if (preset === "14DAYS") {
      start.setDate(end.getDate() - 13);
    } else if (preset === "30DAYS") {
      start.setDate(end.getDate() - 29);
    } else if (preset === "MONTH") {
      start.setDate(1);
    }
    const nextFilters = {
      ...filters,
      start_date: getLocalDateString(start),
      end_date: getLocalDateString(end),
    };
    setFilters(nextFilters);
    load(nextFilters);
  };

  const handleCellChange = async (studentId, studentDbId, date, newStatus) => {
    const cellKey = `${studentId}_${date}`;
    setUpdatingCell(cellKey);
    setError("");

    // Optimistically update local data
    setData((prev) => {
      const updatedRows = prev.rows.map((row) => {
        if (row.student_id === studentId || row.id === studentDbId) {
          const updatedDaily = row.daily_records.map((rec) => {
            if (rec.date === date) {
              return { ...rec, status: newStatus };
            }
            return rec;
          });
          return { ...row, daily_records: updatedDaily };
        }
        return row;
      });
      return { ...prev, rows: updatedRows };
    });

    try {
      await api.post("/admin/attendance/manual-mark", {
        student_id: studentDbId,
        date: date,
        status: newStatus,
        session_type: filters.session_type === "ALL" ? "CLASS" : filters.session_type,
      });
      setSuccessMsg(`Updated attendance for ${date}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update attendance.");
      load(); // Revert on failure
    } finally {
      setUpdatingCell(null);
    }
  };

  const exportCsv = (overrideType = null) => {
    const targetFilters = { ...filters, session_type: overrideType || filters.session_type };
    api
      .get("/admin/reports/export", { params: targetFilters, responseType: "blob" })
      .then((res) => {
        const typeLabel = targetFilters.session_type.toLowerCase();
        const url = URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `${typeLabel}_attendance_report_${targetFilters.start_date}_to_${targetFilters.end_date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to export CSV"));
  };

  // Filter rows based on search / batch locally for instant responsiveness
  const filteredRows = useMemo(() => {
    if (!data.rows) return [];
    return data.rows.filter((row) => {
      const matchSearch =
        !filters.search ||
        (row.full_name && row.full_name.toLowerCase().includes(filters.search.toLowerCase())) ||
        (row.student_id && row.student_id.toLowerCase().includes(filters.search.toLowerCase())) ||
        (row.email && row.email.toLowerCase().includes(filters.search.toLowerCase()));
      const matchBatch = !filters.batch || (row.batch && row.batch.toLowerCase().includes(filters.batch.toLowerCase()));
      return matchSearch && matchBatch;
    });
  }, [data.rows, filters.search, filters.batch]);

  const dateHeaders = useMemo(() => {
    if (data.date_headers && data.date_headers.length > 0) {
      return data.date_headers;
    }
    return (data.dates || []).map((d) => ({ date: d, formatted: d, day_name: "" }));
  }, [data.date_headers, data.dates]);

  // Robust clipboard writer compatible with all browser contexts
  const copyToClipboard = async (text, msg) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setSuccessMsg(msg || "📋 Copied to clipboard! Ready to paste (Ctrl+V) into Excel or Google Sheets.");
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err) {
      setError("Unable to copy to clipboard. Please check browser permissions.");
    }
  };

  // Helper to format status for Excel/Sheets export
  const formatStatusForCopy = (rawStatus) => {
    const st = (rawStatus || "").toUpperCase().trim();
    if (st === "PRESENT" || st === "OFFLINE") return "Offline";
    if (st === "ONLINE") return "Online";
    if (st === "ABSENT") return "Absent";
    if (st === "PERMISSION") return "Permission";
    return "Not Marked";
  };

  // 1. Copy Entire Grid (All Dates & Students) for Excel / Google Sheets
  const copyEntireSheet = () => {
    if (!filteredRows.length || !dateHeaders.length) {
      setError("No attendance data to copy.");
      return;
    }

    const headerCols = ["Name of the Student", "Enrollment ID", "Batch", ...dateHeaders.map((dh) => dh.formatted || dh.date)];
    const dataLines = filteredRows.map((row) => {
      const studentStatuses = dateHeaders.map((dh) => {
        const rec = row.daily_records?.find((r) => r.date === dh.date);
        return formatStatusForCopy(rec?.status);
      });
      return [row.full_name || row.student_id, row.student_id, row.batch || "", ...studentStatuses].join("\t");
    });

    const tsvContent = [headerCols.join("\t"), ...dataLines].join("\n");
    copyToClipboard(
      tsvContent,
      `📋 Copied entire sheet (${filteredRows.length} students across ${dateHeaders.length} dates) to clipboard! Paste directly into Excel or Google Sheets (Ctrl+V).`
    );
  };

  // 2. Copy Single Date Column (Specific Date Attendance) for Excel / Google Sheets
  const copyDateColumn = (targetDateObj) => {
    if (!filteredRows.length) {
      setError("No student data available to copy.");
      return;
    }

    const targetDate = targetDateObj.date;
    const dateTitle = targetDateObj.formatted || targetDate;
    setCopiedDate(targetDate);
    setTimeout(() => setCopiedDate(null), 2500);

    const headerCols = ["Name of the Student", "Enrollment ID", "Batch", dateTitle];
    const dataLines = filteredRows.map((row) => {
      const rec = row.daily_records?.find((r) => r.date === targetDate);
      const statusText = formatStatusForCopy(rec?.status);
      return [row.full_name || row.student_id, row.student_id, row.batch || "", statusText].join("\t");
    });

    const tsvContent = [headerCols.join("\t"), ...dataLines].join("\n");
    copyToClipboard(
      tsvContent,
      `📋 Copied attendance for ${dateTitle} (${filteredRows.length} students) to clipboard! Ready to paste into Excel or Google Sheets (Ctrl+V).`
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Toolbar */}
      <div className="surface p-4 space-y-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700 font-black text-sm">
              📋
            </span>
            <div>
              <h2 className="text-lg font-black text-ink">Attendance Reports & Matrix</h2>
              <p className="text-xs text-slate-500">View, edit, and copy attendance by date into Excel / Google Sheets</p>
            </div>
          </div>

          {/* Action Buttons: Copy All, Export CSV, View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Entire Sheet Button */}
            <button
              onClick={copyEntireSheet}
              className="btn-secondary text-xs px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-bold shadow-sm flex items-center gap-1.5"
              title="Copy entire attendance grid to paste into Excel or Google Sheets (Ctrl+V)"
            >
              <FiCopy className="text-blue-600" /> Copy Sheet (Excel/Sheets)
            </button>

            {/* Export CSV Button */}
            <button
              onClick={() => exportCsv()}
              className="btn-primary text-xs px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-sm flex items-center gap-1.5"
              title="Export Current Sheet to CSV file"
            >
              <FiDownload /> Export CSV
            </button>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode("SHEET")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "SHEET" ? "bg-white text-orange-700 shadow-sm font-extrabold" : "text-slate-600 hover:text-ink"
                }`}
              >
                <FiTable /> Sheet Grid View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ANALYTICS")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "ANALYTICS" ? "bg-white text-teal-700 shadow-sm font-extrabold" : "text-slate-600 hover:text-ink"
                }`}
              >
                <FiBarChart2 /> Daily Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Date Presets and Quick Date Copy Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1">Quick Dates:</span>
            {[
              { label: "Today", val: "TODAY" },
              { label: "Last 7 Days", val: "7DAYS" },
              { label: "Last 14 Days", val: "14DAYS" },
              { label: "Last 30 Days", val: "30DAYS" },
              { label: "This Month", val: "MONTH" },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handlePreset(p.val)}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Copy Single Date Dropdown */}
            {dateHeaders.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <FiClipboard className="text-slate-500" />
                <span className="font-bold text-slate-600">Copy Day:</span>
                <select
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      const dh = dateHeaders.find((d) => d.date === e.target.value);
                      if (dh) copyDateColumn(dh);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select date to copy...</option>
                  {dateHeaders.map((dh) => (
                    <option key={dh.date} value={dh.date}>
                      {dh.formatted || dh.date}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => load()}
              disabled={loading}
              className="btn-secondary text-xs px-2.5 py-1 text-slate-600 hover:text-ink"
              title="Refresh Data"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters Form */}
        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-[150px_150px_160px_1fr_130px_auto]">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Start Date</label>
            <input
              className="field text-xs py-1.5"
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">End Date</label>
            <input
              className="field text-xs py-1.5"
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Session Type</label>
            <select
              className="field text-xs py-1.5"
              value={filters.session_type}
              onChange={(e) => setFilters({ ...filters, session_type: e.target.value })}
            >
              <option value="CLASS">Class Sessions</option>
              <option value="MENTORING">Mentoring Sessions</option>
              <option value="ALL">All Sessions</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Search Student</label>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400 text-xs" />
              <input
                className="field text-xs py-1.5 pl-8"
                placeholder="Name, Student ID, or Email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Batch</label>
            <input
              className="field text-xs py-1.5"
              placeholder="Batch..."
              value={filters.batch}
              onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary text-xs py-2 px-4 w-full" onClick={() => load()}>
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 px-4 py-2.5 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-1.5">
            <FiCheck className="text-emerald-600 text-sm" /> {successMsg}
          </span>
          <span className="text-[11px] font-normal text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
            Clipboard ready for Excel/Google Sheets
          </span>
        </div>
      )}

      {/* High-level Summary Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={data.totals?.students || filteredRows.length} />
        <StatCard label="Total Present Sessions" value={data.totals?.present_days || 0} tone="gold" />
        <StatCard label="Total Absent Sessions" value={data.totals?.absent_days || 0} tone="coral" />
        <StatCard label="Average Attendance %" value={`${data.totals?.percentage || 0}%`} tone="slate" />
      </div>

      {/* VIEW 1: SPREADSHEET MATRIX VIEW (Matches Google Sheets Image Exactly) */}
      {viewMode === "SHEET" && (
        <div className="surface rounded-xl border border-slate-300 shadow-md overflow-hidden bg-white">
          {/* Spreadsheet Header Bar */}
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-mono bg-white border border-slate-300 px-2 py-0.5 rounded font-bold text-slate-700">
                fx
              </span>
              <span className="font-semibold text-slate-700">
                Attendance Sheet: <span className="text-orange-700 font-bold">{filters.session_type}</span> ({filters.start_date} to {filters.end_date})
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#137333]"></span> Offline / Present
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#007791]"></span> Online
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#c5221f]"></span> Absent
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7e22ce]"></span> Permission
              </span>
              <span className="text-slate-400">| Click date header 📋 to copy single day</span>
            </div>
          </div>

          {/* Spreadsheet Matrix Table */}
          <div className="overflow-x-auto max-h-[700px] relative scrollbar-thin">
            <table className="w-full text-left border-collapse select-none">
              {/* Google Sheets Column Letters (A, B, C, D...) */}
              <thead className="sticky top-0 z-30 shadow-sm">
                <tr className="bg-slate-200/90 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-300">
                  <th className="w-10 px-2 py-1 text-center border-r border-slate-300 bg-slate-200">#</th>
                  <th className="min-w-[200px] px-3 py-1 border-r border-slate-300 bg-slate-200 sticky left-0 z-20">A</th>
                  <th className="min-w-[130px] px-3 py-1 border-r border-slate-300 bg-slate-200 sticky left-[200px] z-20">B</th>
                  {dateHeaders.map((dh, idx) => {
                    const colLetter = String.fromCharCode(67 + idx); // C, D, E...
                    return (
                      <th key={dh.date} className="min-w-[145px] px-2 py-1 text-center border-r border-slate-300 bg-slate-200">
                        {colLetter}
                      </th>
                    );
                  })}
                </tr>

                {/* Main Golden/Orange Headers (Same to Same as Image) */}
                <tr className="text-slate-900 text-xs font-black border-b-2 border-slate-400">
                  <th className="w-10 px-2 py-2 text-center border-r border-slate-300 bg-[#ea8b2c] text-slate-900">
                    1
                  </th>
                  <th className="px-3 py-2 border-r border-amber-600 bg-[#ea8b2c] text-slate-950 font-black sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Name of the Student
                  </th>
                  <th className="px-3 py-2 border-r border-amber-600 bg-[#ea8b2c] text-slate-950 font-black sticky left-[200px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Enrollment ID
                  </th>
                  {dateHeaders.map((dh) => {
                    const isCopied = copiedDate === dh.date;
                    return (
                      <th
                        key={dh.date}
                        className="px-2 py-2 text-center border-r border-amber-600 bg-[#ea8b2c] text-slate-950 font-black whitespace-nowrap text-[11px] group/header relative"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{dh.formatted || dh.date}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyDateColumn(dh);
                            }}
                            title={`Copy ${dh.formatted || dh.date} attendance to clipboard for Excel`}
                            className={`p-1 rounded transition-all flex items-center justify-center ${
                              isCopied
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-slate-800 hover:text-black hover:bg-amber-600/30 opacity-70 hover:opacity-100"
                            }`}
                          >
                            {isCopied ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white font-sans text-xs">
                {filteredRows.map((row, rowIdx) => (
                  <tr
                    key={row.student_id}
                    className="hover:bg-amber-50/40 transition-colors border-b border-slate-200 group"
                  >
                    {/* Row Number (Google Sheets Left Gutter) */}
                    <td className="w-10 px-2 py-1.5 text-center font-mono text-[11px] text-slate-400 bg-slate-100/70 border-r border-slate-300 select-none">
                      {rowIdx + 2}
                    </td>

                    {/* Column A: Name of the Student (Pinned Left) */}
                    <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-300 bg-white group-hover:bg-amber-50/40 sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[180px]" title={row.full_name}>
                          {row.full_name}
                        </span>
                        {row.batch && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({row.batch})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column B: Enrollment ID (Pinned Left) */}
                    <td className="px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-700 border-r border-slate-300 bg-white group-hover:bg-amber-50/40 sticky left-[200px] z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {row.student_id}
                    </td>

                    {/* Date Attendance Cells with Sheet Dropdown Badges */}
                    {row.daily_records?.map((record) => {
                      const isUpdating = updatingCell === `${row.student_id}-${record.date}`;
                      return (
                        <td
                          key={`${row.student_id}-${record.date}`}
                          className="px-1.5 py-1 text-center border-r border-slate-200 whitespace-nowrap"
                        >
                          <SheetDropdownCell
                            studentId={row.student_id}
                            studentDbId={row.id}
                            date={record.date}
                            status={record.status}
                            isUpdating={isUpdating}
                            onChange={(newStatus) => handleCellChange(row.student_id, row.id, record.date, newStatus)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {!filteredRows.length && (
                  <tr>
                    <td
                      colSpan={3 + dateHeaders.length}
                      className="py-16 text-center text-slate-400 bg-slate-50"
                    >
                      <p className="text-sm font-semibold">No student attendance records found for this filter.</p>
                      <p className="text-xs text-slate-400 mt-1">Try expanding the date range or clearing the search.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY ANALYTICS VIEW */}
      {viewMode === "ANALYTICS" && (
        <section className="space-y-4">
          <div className="surface p-4 rounded-xl border border-slate-200">
            <h3 className="font-black text-ink text-base mb-1">
              Daily Attendance Aggregate Summary ({filters.session_type})
            </h3>
            <p className="text-xs text-slate-500 mb-4">Breakdown of student turnouts per date</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Present (Offline/Online)</th>
                    <th>Absent</th>
                    <th>Permission</th>
                    <th>Holiday</th>
                    <th>Total Sessions</th>
                    <th>Turnout Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.daily_summary?.map((day) => (
                    <tr key={day.date}>
                      <td className="font-bold text-ink">{day.formatted_date || day.date}</td>
                      <td className="text-emerald-700 font-bold">{day.present}</td>
                      <td className="text-rose-700 font-bold">{day.absent}</td>
                      <td className="text-purple-700 font-bold">{day.permission || 0}</td>
                      <td>{day.holiday || 0}</td>
                      <td>{day.total_sessions}</td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            day.percentage < 75 && day.total_sessions
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {day.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!data.daily_summary?.length && (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-slate-500">
                        No dates found for this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Interactive Sheet Dropdown Cell Component
 * Formatted identical to the Google Sheets pills in user's image with Offline, Online, Absent, Permission options.
 */
function SheetDropdownCell({ status, isUpdating, onChange }) {
  const normStatus = (status || "").toUpperCase().trim();

  // Color theme mapping matching the image exactly
  const getStyle = () => {
    if (normStatus === "OFFLINE" || normStatus === "PRESENT") {
      return {
        bg: "bg-[#137333] hover:bg-[#0f5c29]",
        text: "text-white",
        label: "Offline",
      };
    }
    if (normStatus === "ONLINE") {
      return {
        bg: "bg-[#007791] hover:bg-[#005f73]",
        text: "text-white",
        label: "Online",
      };
    }
    if (normStatus === "ABSENT") {
      return {
        bg: "bg-[#c5221f] hover:bg-[#a51a17]",
        text: "text-white",
        label: "Absent",
      };
    }
    if (normStatus === "PERMISSION") {
      return {
        bg: "bg-[#7e22ce] hover:bg-[#6b21a8]",
        text: "text-white",
        label: "Permission",
      };
    }
    return {
      bg: "bg-slate-100 hover:bg-slate-200 border border-slate-200",
      text: "text-slate-400 font-medium",
      label: "—",
    };
  };

  const style = getStyle();

  return (
    <div className="relative inline-block w-full max-w-[115px]">
      <select
        value={
          normStatus === "PRESENT"
            ? "OFFLINE"
            : normStatus === "OFFLINE"
            ? "OFFLINE"
            : normStatus === "ONLINE"
            ? "ONLINE"
            : normStatus === "ABSENT"
            ? "ABSENT"
            : normStatus === "PERMISSION"
            ? "PERMISSION"
            : "NOT MARKED"
        }
        disabled={isUpdating}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-full px-2.5 py-1 text-[11px] font-bold text-center cursor-pointer transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
          style.bg
        } ${style.text} ${isUpdating ? "opacity-50 animate-pulse" : ""}`}
        title="Click to change attendance status"
      >
        <option value="OFFLINE" className="bg-white text-emerald-800 font-bold">
          🟢 Offline (Present)
        </option>
        <option value="ONLINE" className="bg-white text-cyan-800 font-bold">
          🔵 Online (Present)
        </option>
        <option value="ABSENT" className="bg-white text-rose-800 font-bold">
          🔴 Absent
        </option>
        <option value="PERMISSION" className="bg-white text-purple-800 font-bold">
          🟣 Permission
        </option>
        <option value="NOT MARKED" className="bg-white text-slate-500 font-bold">
          ⚪ Not Marked (—)
        </option>
      </select>

      {/* Down arrow icon styling like Google Sheets chip dropdown */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] opacity-75">
        ▼
      </span>
    </div>
  );
}
