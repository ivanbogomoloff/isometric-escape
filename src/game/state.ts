export type GameMode = "menu" | "playing" | "levelComplete" | "gameOver"

export type GameState = {
  mode: GameMode
  playerName: string
  level: number
  score: number
  timeLeft: number
  levelTime: number
  lastLevelScore: number
  boostRemaining: number
  boostDuration: number
}

export const INITIAL_LEVEL_TIME = 10 * 60

export function createInitialState(): GameState {
  return {
    mode: "menu",
    playerName: "",
    level: 1,
    score: 0,
    timeLeft: INITIAL_LEVEL_TIME,
    levelTime: INITIAL_LEVEL_TIME,
    lastLevelScore: 0,
    boostRemaining: 0,
    boostDuration: 0,
  }
}

export function getLevelTime(level: number) {
  return Math.max(180, INITIAL_LEVEL_TIME - (level - 1) * 20)
}

export function getLevelSize(level: number) {
  const size = 9 + Math.min(12, Math.floor((level - 1) * 1.5))
  return size % 2 === 0 ? size + 1 : size
}

export function calculateLevelScore(level: number, timeLeft: number) {
  return level * 1000 + Math.ceil(timeLeft) * 10
}
