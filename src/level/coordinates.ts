import type { GridPoint } from "./types"

export const TILE_SIZE = 1

export function gridToWorld(point: GridPoint, width: number, height: number) {
  return {
    x: (point.x - width / 2) * TILE_SIZE,
    y: 0,
    z: (point.y - height / 2) * TILE_SIZE,
  }
}

export function worldToGrid(x: number, z: number, width: number, height: number): GridPoint {
  return {
    x: Math.floor(x / TILE_SIZE + width / 2 + 0.5),
    y: Math.floor(z / TILE_SIZE + height / 2 + 0.5),
  }
}
