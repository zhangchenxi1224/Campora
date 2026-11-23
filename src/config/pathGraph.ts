import { Vector3 } from 'three';

const coordinates: [number, number][] = [
  [-46, 12], [-30, 12], [-19, 12], [0, 12], [19, 12], [33, 12], [46, 12],
  [-19, -17], [0, -17], [19, -17], [19, -4], [19, 8], [0, 8], [-19, 8],
  [-19, -38], [0, -38], [19, -38], [0, 23], [0, 36],
  [-43, 12], [-43, 22], [-43, 32], [-30, 32], [-18, 32], [-18, 12],
];
for (let i = 0; i < 10; i++) {
  const theta = i / 10 * Math.PI * 2;
  coordinates.push([-29 + 12 * Math.cos(theta), -8 + 11 * Math.sin(theta)]);
}
coordinates.push([25, 7], [25, 0], [40, 0], [19, 33], [31, 33], [43, 33], [40, 10]);
export const pathNodes = coordinates.map(([x, z]) => new Vector3(x, 0.14, z));
export const pathEdges: [number, number][] = [
  [0, 19], [19, 1], [1, 2], [2, 24], [24, 3], [3, 4], [4, 5], [5, 6],
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 2], [11, 4], [12, 3],
  [7, 14], [14, 15], [15, 16], [16, 9], [3, 17], [17, 18],
  [19, 20], [20, 21], [21, 22], [22, 23], [23, 24],
  [25, 26], [26, 27], [27, 28], [28, 29], [29, 30], [30, 31], [31, 32], [32, 33], [33, 34], [34, 25],
  [28, 1], [33, 7], [25, 13],
  [5, 35], [35, 36], [36, 37], [37, 41], [41, 5], [4, 38], [38, 39], [39, 40],
];
export const adjacency: number[][] = pathNodes.map(() => []);
for (const [a, b] of pathEdges) { adjacency[a].push(b); adjacency[b].push(a); }

export function shortestPath(start: number, end: number): number[] {
  const distances = pathNodes.map(() => Infinity), previous = pathNodes.map(() => -1), open = new Set(pathNodes.map((_, i) => i));
  distances[start] = 0;
  while (open.size) {
    let current = -1;
    for (const node of open) if (current === -1 || distances[node] < distances[current]) current = node;
    if (current === end || distances[current] === Infinity) break;
    open.delete(current);
    for (const next of adjacency[current]) {
      const distance = distances[current] + pathNodes[current].distanceTo(pathNodes[next]);
      if (distance < distances[next]) { distances[next] = distance; previous[next] = current; }
    }
  }
  const route = [end];
  while (route[0] !== start && previous[route[0]] !== -1) route.unshift(previous[route[0]]);
  return route[0] === start ? route : [start];
}
