import { queries } from "../ecs/world"

export function renderSystem() {
  for (const entity of queries.renderable) {
    entity.mesh.position.set(entity.position.x, entity.position.y, entity.position.z)
  }

  for (const entity of queries.spinners) {
    entity.mesh.rotation.y += entity.spin
  }
}
