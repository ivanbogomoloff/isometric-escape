import { queries } from "../ecs/world"
import { samePoint, type Maze } from "../level/types"

export function collisionSystem(maze: Maze, onExitReached: () => void) {
  for (const player of queries.player) {
    if (samePoint(player.gridPosition, maze.exit)) {
      onExitReached()
      return
    }
  }
}
