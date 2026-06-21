import { Color, Mesh, MeshStandardMaterial } from "three"
import { queries } from "../ecs/world"
import { findReachableCells } from "../level/generateMaze"
import { pointKey, type Maze } from "../level/types"
import { getWallPassTargets } from "./inputSystem"

const highlightColor = new Color("#9ef01a")
const wallPassHighlightColor = new Color("#ffd166")

export function reachableHighlightSystem(maze: Maze, maxDistance: number, canPassWall = false) {
  const player = getPlayer()
  if (!player) {
    return
  }

  const origin = player.player.movingTo ?? player.gridPosition
  const reachable = findReachableCells(maze, origin, maxDistance)
  const wallPassTargets = new Set(canPassWall ? getWallPassTargets(maze, origin).map(pointKey) : [])

  for (const floor of queries.floors) {
    if (!(floor.mesh instanceof Mesh) || !(floor.mesh.material instanceof MeshStandardMaterial)) {
      continue
    }

    const distance = reachable.get(pointKey(floor.gridPosition))
    const baseColor = new Color(floor.floor.baseColor)

    if (wallPassTargets.has(pointKey(floor.gridPosition))) {
      floor.mesh.material.color.copy(baseColor).lerp(wallPassHighlightColor, 0.72)
      continue
    }

    if (distance === undefined || distance === 0) {
      floor.mesh.material.color.copy(baseColor)
      continue
    }

    const intensity = Math.max(0, 1 - (distance - 1) / maxDistance) * 0.55
    floor.mesh.material.color.copy(baseColor).lerp(highlightColor, intensity)
  }
}

function getPlayer() {
  for (const player of queries.player) {
    return player
  }

  return undefined
}
