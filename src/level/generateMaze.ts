import { DIRECTIONS, type GridPoint, type Maze, type MazeCell, pointKey } from "./types"

type DistanceEntry = {
  point: GridPoint
  distance: number
}

export function generateMaze(requestedSize: number): Maze {
  const width = normalizeSize(requestedSize)
  const height = normalizeSize(requestedSize)
  const cells = createFilledGrid(width, height, "wall")
  const startCarve = { x: 1, y: 1 }
  const stack: GridPoint[] = [startCarve]

  cells[startCarve.y][startCarve.x] = "floor"

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const options = shuffle(DIRECTIONS)
      .map((direction) => ({
        next: {
          x: current.x + direction.x * 2,
          y: current.y + direction.y * 2,
        },
        between: {
          x: current.x + direction.x,
          y: current.y + direction.y,
        },
      }))
      .filter(({ next }) => isInsideCarvable(next, width, height) && cells[next.y][next.x] === "wall")

    if (options.length === 0) {
      stack.pop()
      continue
    }

    const { next, between } = options[0]
    cells[between.y][between.x] = "floor"
    cells[next.y][next.x] = "floor"
    stack.push(next)
  }

  const exit = chooseExit(cells)
  cells[exit.y][exit.x] = "exit"

  const start = chooseDistantStart(cells, exit)

  return {
    width,
    height,
    cells,
    start,
    exit,
  }
}

export function findPath(maze: Maze, from: GridPoint, to: GridPoint): GridPoint[] {
  if (!isWalkable(maze, from) || !isWalkable(maze, to)) {
    return []
  }

  const queue: GridPoint[] = [from]
  const visited = new Set<string>([pointKey(from)])
  const cameFrom = new Map<string, GridPoint>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      break
    }

    if (current.x === to.x && current.y === to.y) {
      return reconstructPath(cameFrom, from, to)
    }

    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      const key = pointKey(next)

      if (visited.has(key) || !isWalkable(maze, next)) {
        continue
      }

      visited.add(key)
      cameFrom.set(key, current)
      queue.push(next)
    }
  }

  return []
}

export function findReachableCells(maze: Maze, from: GridPoint, maxDistance: number) {
  const distances = new Map<string, number>()

  if (!isWalkable(maze, from)) {
    return distances
  }

  const queue: DistanceEntry[] = [{ point: from, distance: 0 }]
  distances.set(pointKey(from), 0)

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.distance >= maxDistance) {
      continue
    }

    for (const direction of DIRECTIONS) {
      const next = {
        x: current.point.x + direction.x,
        y: current.point.y + direction.y,
      }
      const key = pointKey(next)

      if (distances.has(key) || !isWalkable(maze, next)) {
        continue
      }

      const distance = current.distance + 1
      distances.set(key, distance)
      queue.push({ point: next, distance })
    }
  }

  return distances
}

export function isWalkable(maze: Maze, point: GridPoint) {
  return (
    point.y >= 0 &&
    point.y < maze.height &&
    point.x >= 0 &&
    point.x < maze.width &&
    maze.cells[point.y][point.x] !== "wall"
  )
}

function chooseExit(cells: MazeCell[][]): GridPoint {
  const height = cells.length
  const width = cells[0].length
  const edgeFloors: GridPoint[] = []

  for (let y = 1; y < height - 1; y += 1) {
    for (const x of [1, width - 2]) {
      if (cells[y][x] === "floor") {
        edgeFloors.push({ x, y })
      }
    }
  }

  for (let x = 1; x < width - 1; x += 1) {
    for (const y of [1, height - 2]) {
      if (cells[y][x] === "floor") {
        edgeFloors.push({ x, y })
      }
    }
  }

  const innerExit = edgeFloors[Math.floor(Math.random() * edgeFloors.length)] ?? { x: width - 2, y: height - 2 }
  const exit = { ...innerExit }

  if (innerExit.x === 1) {
    exit.x = 0
  } else if (innerExit.x === width - 2) {
    exit.x = width - 1
  } else if (innerExit.y === 1) {
    exit.y = 0
  } else {
    exit.y = height - 1
  }

  return exit
}

function chooseDistantStart(cells: MazeCell[][], exit: GridPoint): GridPoint {
  const distances = collectDistances(cells, exit)
  const farthest = distances.sort((a, b) => b.distance - a.distance)
  const distantPool = farthest.slice(0, Math.max(1, Math.ceil(farthest.length * 0.2)))

  return distantPool[Math.floor(Math.random() * distantPool.length)]?.point ?? { x: 1, y: 1 }
}

function collectDistances(cells: MazeCell[][], origin: GridPoint): DistanceEntry[] {
  const height = cells.length
  const width = cells[0].length
  const queue: DistanceEntry[] = [{ point: origin, distance: 0 }]
  const visited = new Set<string>([pointKey(origin)])
  const distances: DistanceEntry[] = []

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      break
    }

    distances.push(current)

    for (const direction of DIRECTIONS) {
      const next = {
        x: current.point.x + direction.x,
        y: current.point.y + direction.y,
      }
      const key = pointKey(next)

      if (
        visited.has(key) ||
        next.x < 0 ||
        next.x >= width ||
        next.y < 0 ||
        next.y >= height ||
        cells[next.y][next.x] === "wall"
      ) {
        continue
      }

      visited.add(key)
      queue.push({ point: next, distance: current.distance + 1 })
    }
  }

  return distances
}

function reconstructPath(cameFrom: Map<string, GridPoint>, from: GridPoint, to: GridPoint): GridPoint[] {
  const path: GridPoint[] = []
  let current = to

  while (current.x !== from.x || current.y !== from.y) {
    path.unshift(current)
    const previous = cameFrom.get(pointKey(current))

    if (!previous) {
      return []
    }

    current = previous
  }

  return path
}

function createFilledGrid(width: number, height: number, cell: MazeCell) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => cell))
}

function isInsideCarvable(point: GridPoint, width: number, height: number) {
  return point.x > 0 && point.x < width - 1 && point.y > 0 && point.y < height - 1
}

function normalizeSize(size: number) {
  const rounded = Math.max(7, Math.floor(size))
  return rounded % 2 === 0 ? rounded + 1 : rounded
}

function shuffle<T>(items: T[]) {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const item = result[i]
    result[i] = result[j]
    result[j] = item
  }

  return result
}
