import type { GameState } from "../game/state"

export function timerSystem(state: GameState, delta: number, onExpired: () => void) {
  if (state.mode !== "playing") {
    return
  }

  state.timeLeft = Math.max(0, state.timeLeft - delta)

  if (state.timeLeft === 0) {
    onExpired()
  }
}
