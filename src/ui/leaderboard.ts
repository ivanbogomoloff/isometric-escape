export type LeaderboardEntry = {
  name: string
  score: number
  level: number
  createdAt: string
}

const STORAGE_KEY = "isometric-escape:leaderboard"
const MAX_ENTRIES = 10

export function getLeaderboard(): LeaderboardEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as LeaderboardEntry[]
    return parsed
      .filter((entry) => entry.name && Number.isFinite(entry.score) && Number.isFinite(entry.level))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function saveLeaderboardEntry(entry: LeaderboardEntry) {
  const next = [...getLeaderboard(), entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
