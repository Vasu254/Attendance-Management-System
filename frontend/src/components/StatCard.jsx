export default function StatCard({ label, value, icon: Icon, tone = "teal" }) {
  const tones = {
    teal: {
      icon: "bg-teal-50 text-teal-700 ring-teal-100",
      bar: "bg-brand",
    },
    coral: {
      icon: "bg-orange-50 text-coral ring-orange-100",
      bar: "bg-coral",
    },
    gold: {
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
      bar: "bg-gold",
    },
    slate: {
      icon: "bg-slate-100 text-slate-700 ring-slate-200",
      bar: "bg-slate-500",
    },
    red: {
      icon: "bg-red-50 text-red-700 ring-red-100",
      bar: "bg-red-500",
    },
  };
  const style = tones[tone] || tones.teal;

  return (
    <div className="surface relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 truncate text-3xl font-black text-ink">{value}</p>
        </div>
        {Icon && (
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ring-1 ${style.icon}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
