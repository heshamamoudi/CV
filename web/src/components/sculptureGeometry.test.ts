import { sculptureForm, sculptureGeometry } from "./sculptureGeometry";

it("keeps all five forms on one connected, identical mesh topology", () => {
  let topology: number[] | undefined;
  for (let chapter = 0; chapter < 5; chapter++) {
    const form = sculptureForm(chapter, false);
    expect(Array.from(form.positions).every(Number.isFinite)).toBe(true);
    const geometry = sculptureGeometry(form.positions), index = Array.from(geometry.index!.array);
    if (topology) expect(index).toEqual(topology);
    else topology = index;
    const neighbors = new Map<number, Set<number>>();
    for (let i = 0; i < index.length; i += 3) {
      const triangle = index.slice(i, i + 3);
      for (const vertex of triangle) {
        if (!neighbors.has(vertex)) neighbors.set(vertex, new Set());
        triangle.forEach(other => neighbors.get(vertex)!.add(other));
      }
    }
    const reached = new Set<number>(), pending = [0];
    while (pending.length) {
      const vertex = pending.pop()!;
      if (reached.has(vertex)) continue;
      reached.add(vertex);
      neighbors.get(vertex)?.forEach(other => { if (!reached.has(other)) pending.push(other); });
    }
    expect(reached.size).toBe(form.positions.length / 3);
    geometry.dispose();
  }
});
it("closes both ends exactly in the aperture forms", () => {
  for (const chapter of [0, 1]) {
    const { positions } = sculptureForm(chapter, false);
    for (let coordinate = 0; coordinate < 24; coordinate++) {
      expect(positions[coordinate]).toBeCloseTo(positions[positions.length - 24 + coordinate], 5);
    }
  }
});


it("keeps the open book's binding below both page edges", () => {
  const book=sculptureForm(3,false);
  expect(book.closed).toBe(false);
  const middle=(book.positions.length/3/8-1)/2*8*3;
  expect(book.positions[2]-book.positions[middle+2]).toBeGreaterThan(.45);
  expect(book.positions[book.positions.length-24+2]-book.positions[middle+2]).toBeGreaterThan(.45);
});

