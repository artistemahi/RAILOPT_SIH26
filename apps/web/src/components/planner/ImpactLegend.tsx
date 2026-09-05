const legendItems = [
  { label: "Low Impact", color: "bg-emerald-500" },
  { label: "Medium Impact", color: "bg-amber-400" },
  { label: "High Impact", color: "bg-red-500" },
  { label: "Approved", color: "bg-blue-500" },
  { label: "Unscheduled", color: "bg-slate-300" },
];

export function ImpactLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
