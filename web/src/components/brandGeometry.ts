/** A single structural ligature: H's second upright becomes A's rising spine.
 * The two open counters and copper datum make it a built symbol, not set type. */
export const brandViewBox = "0 0 88 80";
export const brandMarkColor = "#F2F3EC";
export const brandBridgeColor = "#EEA17A";

export const brandShapes = [
  { color: "mark", points: [[7, 17], [19, 11], [19, 69], [7, 69]] },
  { color: "mark", points: [[46, 11], [58, 11], [38, 69], [25, 69]] },
  { color: "mark", points: [[58, 11], [81, 69], [67, 69], [51, 28]] },
  { color: "mark", points: [[19, 35], [38, 35], [34, 46], [19, 46]] },
  { color: "bridge", points: [[43, 45], [68, 45], [72, 56], [39, 56]] },
] as const;
