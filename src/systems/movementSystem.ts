import { queries } from "../ecs/world"
import { gridToWorld } from "../level/coordinates"
import type { Maze } from "../level/types"

export function movementSystem(delta: number, maze: Maze) {
  for (const entity of queries.player) {
    if (!entity.player.movingTo) {
      entity.player.movingTo = entity.player.path.shift()
    }

    if (!entity.player.movingTo) {
      continue
    }

    const target = gridToWorld(entity.player.movingTo, maze.width, maze.height)
    const distanceX = target.x - entity.position.x
    const distanceZ = target.z - entity.position.z
    const distance = Math.hypot(distanceX, distanceZ)
    const speedMultiplier =
      entity.player.boostRemaining && entity.player.boostRemaining > 0 ? (entity.player.boostMultiplier ?? 1) : 1
    const step = entity.player.speed * speedMultiplier * delta

    if (distance <= step) {
      entity.position.x = target.x
      entity.position.z = target.z
      entity.gridPosition = entity.player.movingTo
      entity.player.movingTo = undefined
      continue
    }

    entity.position.x += (distanceX / distance) * step
    entity.position.z += (distanceZ / distance) * step
  }
}
