export const runMeta = {
  id: "RP-2026-091",
  corridor: "NDLS — CNB (New Delhi–Kanpur)",
  division: "Northern Railway · Allahabad Division",
  horizon: "01–07 Sep 2026",
  clock: "12 Sep 2026 · 10:24 IST",
};

export const kpis = [
  { label: "Maintenance tasks", value: "500", delta: "+12%", hint: "vs last week", tone: "navy" as const, spark: [38, 42, 40, 51, 48, 55, 62] },
  { label: "Critical / overdue", value: "47", delta: "+8%", hint: "need same-day window", tone: "danger" as const, spark: [22, 28, 31, 29, 36, 41, 47] },
  { label: "Open block windows", value: "86", delta: "+15%", hint: "COA forecast locked", tone: "ok" as const, spark: [54, 58, 61, 66, 70, 79, 86] },
  { label: "Already scheduled", value: "382", delta: "+20%", hint: "76% of backlog packed", tone: "info" as const, spark: [210, 248, 271, 299, 330, 361, 382] },
];

export const priorityMix = [
  { label: "Critical", value: 40, pct: 8, color: "#e23b4b" },
  { label: "High", value: 110, pct: 22, color: "#ef8a22" },
  { label: "Medium", value: 225, pct: 45, color: "#e0b31a" },
  { label: "Low", value: 125, pct: 25, color: "#1b86d6" },
];

export const deptBars = [
  { name: "Engineering", short: "ENGG", value: 214, pct: 72, color: "#0b6fd4" },
  { name: "TRD", short: "TRD", value: 168, pct: 56, color: "#128f7a" },
  { name: "S&T", short: "S&T", value: 118, pct: 40, color: "#c57a12" },
];

export const utilization = [
  { label: "Used", value: 63, color: "#0ea37a" },
  { label: "Available", value: 23, color: "#1b7fd4" },
  { label: "Restricted", value: 14, color: "#e23b4b" },
];

export const alerts = [
  { tone: "crit" as const, text: "7 critical tasks breach SLA inside 36 hours — S03 / S07 / S11" },
  { tone: "warn" as const, text: "3 resource clashes: R12 (tamping) and S&T gang overlap on B04" },
  { tone: "info" as const, text: "5 Engineering + S&T pairs can share a combined block on S03" },
  { tone: "ok" as const, text: "Released plan RP-2026-090 passed all six validation gates" },
];

export const liveFeed = [
  { t: "10:21", src: "COA", msg: "Goods path 09:40–11:10 confirmed vacant on S06–S07" },
  { t: "10:18", src: "SMMS", msg: "Axle counter defect A37 raised to Critical" },
  { t: "10:11", src: "TMS", msg: "Geometry watch SEC02 — 4mm twist, still within blockable band" },
  { t: "09:58", src: "TDMS", msg: "OHE isolation window requested for B02 14:00–16:00" },
  { t: "09:44", src: "OPT", msg: "Solver warm-start from RP-2026-090 loaded (2.1s)" },
];

export const stations = [
  { id: "NDLS", name: "New Delhi", km: 0, state: "clear" as const },
  { id: "GZB", name: "Ghaziabad", km: 26, state: "busy" as const },
  { id: "ALJN", name: "Aligarh", km: 131, state: "clear" as const },
  { id: "TDL", name: "Tundla", km: 204, state: "block" as const },
  { id: "CNB", name: "Kanpur", km: 441, state: "clear" as const },
  { id: "PRYJ", name: "Prayagraj", km: 635, state: "watch" as const },
];

export const sources = [
  { id: "TMS", name: "Track Management", records: 18420, lag: "2 min", ok: true },
  { id: "TDMS", name: "Traction Distribution", records: 9311, lag: "4 min", ok: true },
  { id: "SMMS", name: "Signalling Maintenance", records: 7420, lag: "1 min", ok: true },
  { id: "COA", name: "Control Office Application", records: 1288, lag: "live", ok: true },
  { id: "BDMS", name: "Block / Disconnection", records: 214, lag: "6 min", ok: true },
  { id: "TT", name: "Train Time Table", records: 640, lag: "synced", ok: true },
];

export const tasks = [
  { id: "T101", dept: "Engineering", asset: "A45 Track", section: "S03", km: "126–131", pri: "Critical", dur: "90m", due: "12 Sep", status: "Planned", win: "W17", res: ["R12 tamping", "R17 gang"], dep: "T087", fit: ["W17", "W21"], no: ["W28"], note: "Twist +4mm; pack before monsoon freight peak" },
  { id: "T102", dept: "S&T", asset: "A19 Signal", section: "S03", km: "128", pri: "High", dur: "60m", due: "13 Sep", status: "Pending", win: "—", res: ["R04 tester"], dep: "—", fit: ["W17", "W22"], no: ["W19"], note: "Home signal lamp + axle counter reset" },
  { id: "T103", dept: "TRD", asset: "B12 OHE", section: "S05", km: "198–204", pri: "Medium", dur: "45m", due: "14 Sep", status: "Planned", win: "W09", res: ["R08 tower wagon"], dep: "—", fit: ["W09"], no: ["W11"], note: "Dropper replacement under 25kV" },
  { id: "T104", dept: "Engineering", asset: "A27 Points", section: "S06", km: "318", pri: "High", dur: "120m", due: "15 Sep", status: "Pending", win: "—", res: ["R12", "R19"], dep: "T101", fit: ["W21"], no: ["W17"], note: "1 in 12 turnout grind" },
  { id: "T105", dept: "S&T", asset: "C03 Cable", section: "S07", km: "440", pri: "Low", dur: "30m", due: "16 Sep", status: "Planned", win: "W33", res: ["R02"], dep: "—", fit: ["W33", "W34"], no: [], note: "Quad cable megger" },
  { id: "T205", dept: "S&T", asset: "A19 Relay", section: "S03", km: "129", pri: "High", dur: "60m", due: "13 Sep", status: "Planned", win: "W17", res: ["R04"], dep: "—", fit: ["W17"], no: ["W28"], note: "Can share T101 combined block" },
  { id: "T314", dept: "TRD", asset: "B08 AT", section: "S05", km: "201", pri: "Medium", dur: "75m", due: "14 Sep", status: "Hold", win: "—", res: ["R08"], dep: "T103", fit: ["W09"], no: ["W17"], note: "Isolation clashes with T101 gang" },
  { id: "T421", dept: "Engineering", asset: "A61 Bridge", section: "S07", km: "438–441", pri: "Critical", dur: "180m", due: "12 Sep", status: "Pending", win: "—", res: ["R21 diving", "R17"], dep: "—", fit: ["W40"], no: ["W17"], note: "Pier inspection — daylight only" },
  { id: "T118", dept: "Engineering", asset: "A12 Rail", section: "S02", km: "24–28", pri: "High", dur: "110m", due: "13 Sep", status: "Planned", win: "W05", res: ["R12"], dep: "—", fit: ["W05", "W06"], no: [], note: "USFD follow-up weld" },
  { id: "T330", dept: "TRD", asset: "B03 Isolator", section: "S04", km: "175", pri: "Low", dur: "40m", due: "17 Sep", status: "Pending", win: "—", res: ["R08"], dep: "—", fit: ["W14"], no: ["W09"], note: "Routine isolator grease" },
];

export const blocks = [
  { id: "B01", section: "S01–S02", type: "Traffic", status: "Available", dur: "2h 00m", from: "01:15", to: "03:15", trains: 1, fit: ["T118"] },
  { id: "B02", section: "S03–S04", type: "Power", status: "Restricted", dur: "2h 40m", from: "14:00", to: "16:40", trains: 4, fit: ["T103"] },
  { id: "B03", section: "S05", type: "Signal", status: "Available", dur: "1h 30m", from: "10:30", to: "12:00", trains: 0, fit: ["T102", "T205"] },
  { id: "B04", section: "S06–S07", type: "Combined", status: "Available", dur: "4h 00m", from: "08:00", to: "12:00", trains: 2, fit: ["T101", "T205", "T421"] },
  { id: "B05", section: "S02–S03", type: "Traffic", status: "Used", dur: "1h 45m", from: "22:10", to: "23:55", trains: 0, fit: ["T118"] },
  { id: "B06", section: "S04", type: "Power", status: "Available", dur: "1h 20m", from: "03:40", to: "05:00", trains: 1, fit: ["T330"] },
  { id: "B07", section: "S07–S08", type: "Combined", status: "Watch", dur: "3h 10m", from: "09:20", to: "12:30", trains: 3, fit: ["T421"] },
  { id: "B08", section: "S11", type: "Signal", status: "Restricted", dur: "0h 50m", from: "16:10", to: "17:00", trains: 6, fit: [] },
];

export const windows = [
  { id: "W17", span: "08:00 – 10:00", load: 58, tone: "ok" as const, note: "Goods path clear · 2h" },
  { id: "W21", span: "10:30 – 11:30", load: 72, tone: "info" as const, note: "Mail 12301 fringe" },
  { id: "W28", span: "14:00 – 17:00", load: 85, tone: "warn" as const, note: "OHE isolation clash" },
];

export const matrixIds = ["T101", "T205", "T314", "T421"];
export const matrix: ("ok" | "no" | "maybe" | "self")[][] = [
  ["self", "ok", "no", "maybe"],
  ["ok", "self", "ok", "no"],
  ["no", "ok", "self", "ok"],
  ["maybe", "no", "ok", "self"],
];

export const combineReasons = [
  { ok: true, text: "Same covered section S03 (km 126–129)" },
  { ok: true, text: "Combined block type B04 accepts ENGG + S&T" },
  { ok: true, text: "Resources R12 / R04 free in W17" },
  { ok: true, text: "No hard dependency between T101 and T205" },
  { ok: true, text: "No conflicting train path inside 08:00–10:00" },
  { ok: false, text: "T314 isolation would drop OHE on the same km" },
];

export const solverLog = [
  { t: "00:00.0", text: "Corridor model built · 7 sections · 86 windows" },
  { t: "00:00.2", text: "1,284 hard constraints ingested (resource, train, type)" },
  { t: "00:00.6", text: "CP-SAT search started · 8 workers" },
  { t: "00:01.4", text: "First feasible pack: 361 tasks · 0 conflicts" },
  { t: "00:02.1", text: "Bound tightened · downtime −18 min vs baseline" },
  { t: "00:02.8", text: "Incumbent locked · 382 scheduled · gap 0.4%" },
];

export const objectives = [
  { label: "Priority-weighted completion", value: 91, unit: "%" },
  { label: "Block usage (occupied / offered)", value: 63, unit: "%" },
  { label: "Modelled extra downtime", value: 42, unit: " min" },
  { label: "Hard conflicts remaining", value: 0, unit: "" },
  { label: "Late tasks after pack", value: 4, unit: "" },
];

export const gantt = [
  { section: "S01  GZB", block: "B01", items: [{ id: "T118", start: 8, span: 18, kind: "eng" as const }] },
  { section: "S02  ALJN", block: "B05", items: [{ id: "T330", start: 62, span: 12, kind: "trd" as const }] },
  { section: "S03  TDL", block: "B04", items: [{ id: "T101", start: 14, span: 16, kind: "eng" as const }, { id: "T205", start: 18, span: 12, kind: "snt" as const }] },
  { section: "S04  ETW", block: "B02", items: [{ id: "T314", start: 48, span: 14, kind: "trd" as const }] },
  { section: "S05  CNB", block: "B03", items: [{ id: "T103", start: 36, span: 10, kind: "trd" as const }] },
  { section: "S06  FTP", block: "B04", items: [{ id: "T104", start: 22, span: 20, kind: "eng" as const }] },
  { section: "S07  PRYJ", block: "B07", items: [{ id: "T421", start: 70, span: 22, kind: "eng" as const }] },
];

export const trains = [
  { id: "12301", name: "Rajdhani", at: 12 },
  { id: "12417", name: "Prayagraj Exp", at: 34 },
  { id: "G-441", name: "Goods rake", at: 51 },
  { id: "12505", name: "North East", at: 67 },
  { id: "G-208", name: "Coal", at: 81 },
];

export const whyT101 = {
  task: "T101",
  window: "W17 · 08:00–10:00 · B04",
  score: 94,
  alt: "W21",
  altDrop: "−11 pts (Rajdhani fringe + no S&T share)",
  bullets: [
    "Earliest feasible combined window after T087",
    "Pairs with T205 — one possession, two departments",
    "Zero passenger path inside the slot",
    "R12 tamping unit already staged at Tundla",
  ],
};

export const kpiCompare = [
  { metric: "Assets covered", base: "310", opt: "382", gain: "+23%" },
  { metric: "Priority completion", base: "72%", opt: "91%", gain: "+19 pts" },
  { metric: "Modelled downtime", base: "61 min", opt: "42 min", gain: "−31%" },
  { metric: "Conflicts", base: "6", opt: "0", gain: "cleared" },
  { metric: "Coordinated pairs", base: "4", opt: "18", gain: "+14" },
  { metric: "Corridor availability", base: "93.1%", opt: "96.4%", gain: "+3.3 pts" },
];

export const validation = [
  { name: "Window vs time-table", detail: "86 slots · 0 overrun vs COA goods forecast", pass: true },
  { name: "Resource calendars", detail: "R12 double-book avoided by shifting T104", pass: true },
  { name: "Task dependencies", detail: "T087 → T101 precedence held", pass: true },
  { name: "Compatibility matrix", detail: "No ENGG+TRD live-line pair packed", pass: true },
  { name: "Operational (train paths)", detail: "Rajdhani 12301 buffered +18 min", pass: true },
  { name: "Block-type rules", detail: "Power blocks only on TRD isolatable km", pass: true },
];

export const qualityChecks = [
  { name: "Foreign-key orphans", count: 0 },
  { name: "Duplicate task IDs", count: 0 },
  { name: "Dependency cycles", count: 0 },
  { name: "Windows past horizon", count: 0 },
  { name: "Missing resource codes", count: 0 },
  { name: "Precedence vs dates", count: 0 },
  { name: "ML score / TMS mismatch", count: 0 },
  { name: "COA lag > 15 min", count: 0 },
];

export const weekDays = ["01 Mon", "02 Tue", "03 Wed", "04 Thu", "05 Fri", "06 Sat", "07 Sun"];

export const heat = [
  [2, 4, 3, 5, 6, 3, 1],
  [1, 3, 5, 4, 4, 2, 1],
  [3, 2, 4, 6, 5, 4, 2],
];

export const resources = [
  { id: "R12", name: "Tamping unit", use: 88 },
  { id: "R17", name: "ENGG gang A", use: 76 },
  { id: "R04", name: "S&T tester", use: 64 },
  { id: "R08", name: "Tower wagon", use: 51 },
  { id: "R21", name: "Bridge crew", use: 43 },
];

export const recentRuns = [
  { id: "RP-2026-091", scope: "Weekly trunk pack", tasks: 500, state: "FEASIBLE", validation: "PASS", user: "Sr. DOM / PRYJ", date: "12 Sep 10:24" },
  { id: "RP-2026-090", scope: "Weekly regular", tasks: 488, state: "OPTIMAL", validation: "PASS", user: "Section Controller", date: "05 Sep 09:15" },
  { id: "RP-2026-089", scope: "Defect A37 insert", tasks: 42, state: "FEASIBLE", validation: "PASS", user: "Sr. DOM / PRYJ", date: "28 Aug 14:30" },
  { id: "RP-2026-088", scope: "Monthly sketch", tasks: 620, state: "DRAFT", validation: "DRAFT", user: "Dy. CVO / Traffic", date: "21 Aug 11:00" },
];

export const trainImpactSummary = [
  { category: "Rajdhani / Shatabdi", count: 8, impact: "0 delays · 100% Protected", status: "PASS", pct: 100, color: "#16834B" },
  { category: "Mail / Express", count: 24, impact: "1 path retimed +12 min", status: "WATCH", pct: 95, color: "#2B6CB0" },
  { category: "Freight / Goods", count: 18, impact: "2 rakes looped at TDL siding", status: "MANAGED", pct: 88, color: "#A86A00" },
  { category: "Corridor Safety Headway", count: 50, impact: "Min 18 min buffer held", status: "PASS", pct: 100, color: "#16834B" },
];

export const highPriorityQueue = [
  { id: "T101", asset: "A45 Track", dept: "Engineering", activity: "Geometry correction (twist +4mm)", pri: "Critical", risk: "CRITICAL", overdue: "24h overdue", window: "W17 (08:00–10:00)", section: "S03 (Km 126–131)" },
  { id: "T421", asset: "A61 Bridge", dept: "Engineering", activity: "Pier inspection & scouring check", pri: "Critical", risk: "CRITICAL", overdue: "12h overdue", window: "W40 (Daylight slot)", section: "S07 (Km 438–441)" },
  { id: "T102", asset: "A19 Signal", dept: "S&T", activity: "Home signal lamp & axle counter reset", pri: "High", risk: "WARNING", overdue: "36h remaining", window: "W17 (Can pair)", section: "S03 (Km 128)" },
  { id: "T205", asset: "A19 Relay", dept: "S&T", activity: "Relay interlocking contact test", pri: "High", risk: "WARNING", overdue: "48h remaining", window: "W17 (Coordinated)", section: "S03 (Km 129)" },
  { id: "T118", asset: "A12 Rail", dept: "Engineering", activity: "USFD ultrasonic flaw follow-up weld", pri: "High", risk: "CRITICAL", overdue: "18h remaining", window: "W05 (01:15–03:15)", section: "S02 (Km 24–28)" },
  { id: "T104", asset: "A27 Points", dept: "Engineering", activity: "1 in 12 turnout switch grind", pri: "High", risk: "WARNING", overdue: "52h remaining", window: "W21 (10:30–11:30)", section: "S06 (Km 318)" },
];

