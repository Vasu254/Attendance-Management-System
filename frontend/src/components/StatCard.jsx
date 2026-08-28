export default function StatCard({ label, value, icon: Icon, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-50 text-teal-700",
    coral: "bg-orange-50 text-coral",
    gold: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
        </div>
        {Icon && (
          <div className={`grid h-11 w-11 place-items-center rounded-md ${tones[tone] || tones.teal}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
