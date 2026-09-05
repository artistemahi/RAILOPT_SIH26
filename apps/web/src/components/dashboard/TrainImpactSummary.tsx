import type { TrainImpact } from "../../types/dashboard";

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export function TrainImpactSummary({ data }: { data: TrainImpact[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 38;
  const cx = 52;
  const cy = 52;

  let currentAngle = 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h2 className="mb-2 text-[14px] font-semibold text-slate-800">
        Train Impact Summary
      </h2>

      <div className="flex items-center gap-3">
        <svg
          viewBox="0 0 104 104"
          className="h-24 w-24"
          role="img"
          aria-label="Train impact summary chart"
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="15"
          />
          {data.map((item) => {
            const sweep = (item.value / total) * 360;
            const segment = (
              <path
                key={item.name}
                d={describeArc(
                  cx,
                  cy,
                  radius,
                  currentAngle,
                  currentAngle + sweep,
                )}
                fill="none"
                stroke={item.color}
                strokeWidth="15"
                strokeLinecap="butt"
              />
            );
            currentAngle += sweep;
            return segment;
          })}
        </svg>

        <div className="flex-1 space-y-1.5 text-[11px] text-slate-600">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-semibold text-slate-700">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
