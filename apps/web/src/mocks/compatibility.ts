export const compatibilityMatrix = {
  tasks: ["T101", "T205", "T314", "T421"],

  matrix: [
    ["-", "yes", "no", "conditional"],
    ["yes", "-", "yes", "no"],
    ["no", "yes", "-", "yes"],
    ["conditional", "no", "yes", "-"]
  ],

  recommendation: {
    pair: "T101 + T205",
    score: 92,
    canCombine: true,
    reasons: [
      "Same corridor",
      "Resources available",
      "No dependency conflict",
      "Low train impact"
    ]
  }
}