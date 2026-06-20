import { Color, Mesh, MeshStandardMaterial } from "three"
import { queries } from "../ecs/world"
import { findReachableCells } from "../level/generateMaze"
import { pointKey, type Maze } from "../level/types"

const highlightColor = new Color("#9ef01a")

export function reachableHighlightSystem(maze: Maze, maxDistance: number) {
  const player = getPlayer()
  if (!player) {
    return
  }

  const origin = player.player.movingTo ?? player.gridPosition
  const reachable = findReachableCells(maze, origin, maxDistance)

  for (const floor of queries.floors) {
    if (!(floor.mesh instanceof Mesh) || !(floor.mesh.material instanceof MeshStandardMaterial)) {
      continue
    }

    const distance = reachable.get(pointKey(floor.gridPosition))
    const baseColor = new Color(floor.floor.baseColor)

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
