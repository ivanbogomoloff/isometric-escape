import { queries } from "../ecs/world"
import { DEFAULT_CLICK_MOVE_RANGE } from "../game/state"
import { findPath, isWalkable } from "../level/generateMaze"
import type { GridPoint, Maze } from "../level/types"

export type MoveResult = "moved" | "wallPass"

export function movePlayerByDelta(maze: Maze, delta: GridPoint, canPassWall = false): MoveResult | undefined {
  const player = getPlayer()
  if (!player) {
    return undefined
  }

  const origin = player.player.movingTo ?? player.gridPosition
  const target = {
    x: origin.x + delta.x,
    y: origin.y + delta.y,
  }

  if (!isWalkable(maze, target)) {
    const wallPassTarget = canPassWall ? getWallPassTarget(maze, origin, delta) : undefined
    if (!wallPassTarget) {
      return undefined
    }

    player.player.path = [wallPassTarget]
    return "wallPass"
  }

  player.player.path = [target]
  return "moved"
}

export function setPlayerPathTo(
  maze: Maze,
  target: GridPoint,
  maxDistance = DEFAULT_CLICK_MOVE_RANGE,
  canPassWall = false,
): MoveResult | undefined {
  const player = getPlayer()
  if (!player) {
    return undefined
  }

  const origin = player.player.movingTo ?? player.gridPosition

  if (!isWalkable(maze, target)) {
    return undefined
  }

  const path = findPath(maze, origin, target)

  if (path.length > 0 && path.length <= maxDistance) {
    player.player.path = path
    return "moved"
  }

  if (canPassWall && isWallPassLanding(maze, origin, target)) {
    player.player.path = [target]
    return "wallPass"
  }

  return undefined
}

export function getWallPassTargets(maze: Maze, origin: GridPoint) {
  const targets: GridPoint[] = []

  for (const direction of DIRECTIONS) {
    const target = getWallPassTarget(maze, origin, direction)
    if (target) {
      targets.push(target)
    }
  }

  return targets
}

function getPlayer() {
  for (const player of queries.player) {
    return player
  }

  return undefined
}

function isWallPassLanding(maze: Maze, origin: GridPoint, target: GridPoint) {
  return DIRECTIONS.some((direction) => {
    const wallPassTarget = getWallPassTarget(maze, origin, direction)
    return wallPassTarget?.x === target.x && wallPassTarget.y === target.y
  })
}

function getWallPassTarget(maze: Maze, origin: GridPoint, delta: GridPoint) {
  const wall = {
    x: origin.x + delta.x,
    y: origin.y + delta.y,
  }
  const target = {
    x: origin.x + delta.x * 2,
    y: origin.y + delta.y * 2,
  }

  if (!isWall(maze, wall) || !isWalkable(maze, target)) {
    return undefined
  }

  return target
}

function isWall(maze: Maze, point: GridPoint) {
  return (
    point.y >= 0 &&
    point.y < maze.height &&
    point.x >= 0 &&
    point.x < maze.width &&
    maze.cells[point.y][point.x] === "wall"
  )
}

const DIRECTIONS: GridPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]
