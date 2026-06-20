import { World } from "miniplex"
import type { Object3D } from "three"
import type { GridPoint } from "../level/types"

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type PlayerComponent = {
  speed: number
  path: GridPoint[]
  movingTo?: GridPoint
}

export type Entity = {
  id?: string
  position?: Vec3
  gridPosition?: GridPoint
  mesh?: Object3D
  player?: PlayerComponent
  wall?: true
  floor?: {
    baseColor: string
  }
  exit?: true
  velocity?: Vec3
  spin?: number
}

export const world = new World<Entity>()

export const queries = {
  renderable: world.with("position", "mesh"),
  player: world.with("player", "position", "gridPosition", "mesh"),
  floors: world.with("floor", "mesh", "gridPosition"),
  spinners: world.with("mesh", "spin"),
}

export function clearWorld() {
  for (const entity of [...world.entities]) {
    if (entity.mesh?.parent) {
      entity.mesh.parent.remove(entity.mesh)
    }

    world.remove(entity)
  }
}
