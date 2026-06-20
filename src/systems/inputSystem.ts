import { queries } from "../ecs/world"
import { findPath, isWalkable } from "../level/generateMaze"
import type { GridPoint, Maze } from "../level/types"

export const CLICK_MOVE_RANGE = 5

export function movePlayerByDelta(maze: Maze, delta: GridPoint) {
  const player = getPlayer()
  if (!player) {
    return
  }

  const origin = player.player.movingTo ?? player.gridPosition
  const target = {
    x: origin.x + delta.x,
    y: origin.y + delta.y,
  }

  if (!isWalkable(maze, target)) {
    return
  }

  player.player.path = [target]
}

export function setPlayerPathTo(maze: Maze, target: GridPoint, maxDistance = CLICK_MOVE_RANGE) {
  const player = getPlayer()
  if (!player || !isWalkable(maze, target)) {
    return
  }

  const origin = player.player.movingTo ?? player.gridPosition
  const path = findPath(maze, origin, target)

  if (path.length === 0 || path.length > maxDistance) {
    return
  }

  player.player.path = path
}

function getPlayer() {
  for (const player of queries.player) {
    return player
  }

  return undefined
}
