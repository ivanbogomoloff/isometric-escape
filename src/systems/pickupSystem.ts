import { world, queries } from "../ecs/world"
import { samePoint } from "../level/types"

export function pickupSystem(delta: number) {
  for (const player of queries.player) {
    if (player.player.boostRemaining && player.player.boostRemaining > 0) {
      player.player.boostRemaining = Math.max(0, player.player.boostRemaining - delta)

      if (player.player.boostRemaining === 0) {
        player.player.boostMultiplier = undefined
      }
    }

    for (const pickup of [...queries.boostPickups]) {
      if (!samePoint(player.gridPosition, pickup.gridPosition)) {
        continue
      }

      player.player.boostRemaining = pickup.boostPickup.duration
      player.player.boostDuration = pickup.boostPickup.duration
      player.player.boostMultiplier = pickup.boostPickup.multiplier

      if (pickup.mesh.parent) {
        pickup.mesh.parent.remove(pickup.mesh)
      }

      world.remove(pickup)
    }
  }
}
