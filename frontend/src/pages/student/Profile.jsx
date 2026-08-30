import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const student = user?.student;

  return (
    <section className="surface max-w-3xl p-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-md bg-brand text-xl font-black text-white shadow-lift">
          {student?.full_name?.charAt(0) || "S"}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black text-ink">{student?.full_name}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{student?.student_id}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Info label="Email" value={student?.email} />
        <Info label="Mobile Number" value={student?.mobile_number} />
        <Info label="Course" value={student?.course} />
        <Info label="Batch" value={student?.batch} />
        <Info label="Section" value={student?.section} />
        <Info label="Account Status" value={student?.is_active ? "ACTIVE" : "INACTIVE"} />
      </div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value || "--"}</p>
    </div>
  );
}
