export type LeaderboardEntry = {
  name: string
  level: number
  gold: number
  createdAt: string
}

export type LeaderboardRepository = {
  getEntries: () => LeaderboardEntry[]
  saveEntry: (entry: LeaderboardEntry) => void
}

type StoredLeaderboardEntry = {
  name?: unknown
  score?: unknown
  level?: unknown
  gold?: unknown
  createdAt?: unknown
}

const STORAGE_KEY = "isometric-escape:leaderboard"
const MAX_ENTRIES = 10

export class LocalStorageLeaderboardRepository implements LeaderboardRepository {
  getEntries() {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    try {
      const parsed = JSON.parse(raw) as StoredLeaderboardEntry[]
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.map(normalizeEntry).filter(isLeaderboardEntry).sort(compareEntries).slice(0, MAX_ENTRIES)
    } catch {
      return []
    }
  }

  saveEntry(entry: LeaderboardEntry) {
    const next = [...this.getEntries(), entry].sort(compareEntries).slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
}

function normalizeEntry(entry: StoredLeaderboardEntry): LeaderboardEntry | undefined {
  const gold = typeof entry.gold === "number" ? entry.gold : entry.score

  if (typeof entry.name !== "string" || typeof entry.level !== "number" || typeof gold !== "number") {
    return undefined
  }

  return {
    name: entry.name,
    level: entry.level,
    gold,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
  }
}

function isLeaderboardEntry(entry: LeaderboardEntry | undefined): entry is LeaderboardEntry {
  if (!entry) {
    return false
  }

  return Boolean(entry.name) && Number.isFinite(entry.level) && Number.isFinite(entry.gold)
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry) {
  return b.level - a.level || b.gold - a.gold
}
