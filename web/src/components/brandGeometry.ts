/** HA: two readable initials, joined by one level bridge around open counters. */
export const brandViewBox = "0 0 80 64";
export const brandMarkColor = "#F2F3EC";
export const brandBridgeColor = "#EEA17A";

export const brandShapes = [
  { color: "mark", points: [[6, 8], [6, 56], [14, 56], [14, 8]] },
  { color: "mark", points: [[24, 8], [24, 56], [32, 56], [32, 8]] },
  { color: "mark", points: [[48, 8], [30, 56], [40, 56], [56, 8]] },
  { color: "mark", points: [[48, 8], [66, 56], [76, 56], [56, 8]] },
  { color: "bridge", points: [[14, 33], [62, 33], [62, 40], [14, 40]] },
] as const;
