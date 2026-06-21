export type GameMode = "menu" | "playing" | "levelComplete" | "gameOver"

export type ShopItemId = "speedBoost" | "longStep" | "wallPass"

export type ShopItem = {
  id: ShopItemId
  name: string
  cost: number
  description: string
}

export type GameState = {
  mode: GameMode
  playerName: string
  level: number
  gold: number
  timeLeft: number
  levelTime: number
  lastLevelGold: number
  boostRemaining: number
  boostDuration: number
  longStepRemaining: number
  longStepDuration: number
  wallPassCharges: number
}

export const INITIAL_LEVEL_TIME = 10 * 60
export const SPEED_BOOST_DURATION = 5
export const SPEED_BOOST_MULTIPLIER = 1.65
export const LONG_STEP_DURATION = 5
export const DEFAULT_CLICK_MOVE_RANGE = 5
export const LONG_STEP_MOVE_RANGE = 9

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "speedBoost",
    name: "Ускоритель",
    cost: 70,
    description: "Скорость на 5 секунд",
  },
  {
    id: "longStep",
    name: "Длинный шаг",
    cost: 110,
    description: "Дальность шага на 5 секунд",
  },
  {
    id: "wallPass",
    name: "Сквозь стену",
    cost: 180,
    description: "Один проход через стену",
  },
]

export function createInitialState(): GameState {
  return {
    mode: "menu",
    playerName: "",
    level: 1,
    gold: 0,
    timeLeft: INITIAL_LEVEL_TIME,
    levelTime: INITIAL_LEVEL_TIME,
    lastLevelGold: 0,
    boostRemaining: 0,
    boostDuration: 0,
    longStepRemaining: 0,
    longStepDuration: 0,
    wallPassCharges: 0,
  }
}

export function getLevelTime(level: number) {
  return Math.max(180, INITIAL_LEVEL_TIME - (level - 1) * 20)
}

export function getLevelSize(level: number) {
  const size = 9 + Math.min(12, Math.floor((level - 1) * 1.5))
  return size % 2 === 0 ? size + 1 : size
}

export function calculateLevelGold(level: number, timeLeft: number) {
  return level * 10 + Math.ceil(timeLeft / 10)
}
