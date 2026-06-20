export type GridPoint = {
  x: number
  y: number
}

export type MazeCell = "wall" | "floor" | "exit"

export type Maze = {
  width: number
  height: number
  cells: MazeCell[][]
  start: GridPoint
  exit: GridPoint
}

export const DIRECTIONS: GridPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export function pointKey(point: GridPoint) {
  return `${point.x},${point.y}`
}

export function samePoint(a: GridPoint, b: GridPoint) {
  return a.x === b.x && a.y === b.y
}
