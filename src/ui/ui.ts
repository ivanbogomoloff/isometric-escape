import type { GameState } from "../game/state"
import type { LeaderboardEntry } from "./leaderboard"

type UIActions = {
  startGame: (name: string) => void
  nextLevel: () => void
  restart: () => void
  showMenu: () => void
}

export class GameUI {
  private readonly layer = document.createElement("div")
  private readonly hud = document.createElement("div")
  private readonly panelWrap = document.createElement("div")
  private lastMode = ""
  private lastLeaderboardKey = ""

  constructor(
    root: HTMLElement,
    private readonly actions: UIActions,
  ) {
    this.layer.className = "ui-layer"
    this.hud.className = "hud"
    this.panelWrap.className = "panel-wrap"
    this.layer.append(this.hud, this.panelWrap)
    root.append(this.layer)
  }

  update(state: GameState, leaderboard: LeaderboardEntry[]) {
    this.renderHud(state)

    const leaderboardKey = leaderboard.map((entry) => `${entry.name}:${entry.score}:${entry.level}`).join("|")
    if (this.lastMode === state.mode && this.lastLeaderboardKey === leaderboardKey) {
      return
    }

    this.lastMode = state.mode
    this.lastLeaderboardKey = leaderboardKey
    this.renderPanel(state, leaderboard)
  }

  private renderHud(state: GameState) {
    if (state.mode === "menu") {
      this.hud.classList.add("hidden")
      return
    }

    this.hud.classList.remove("hidden")
    this.hud.innerHTML = `
      <div class="hud-card"><span>Игрок</span><strong>${escapeHtml(state.playerName)}</strong></div>
      <div class="hud-card"><span>Уровень</span><strong>${state.level}</strong></div>
      <div class="hud-card"><span>Время</span><strong>${formatTime(state.timeLeft)}</strong></div>
      <div class="hud-card"><span>Очки</span><strong>${state.score}</strong></div>
    `
  }

  private renderPanel(state: GameState, leaderboard: LeaderboardEntry[]) {
    if (state.mode === "playing") {
      this.panelWrap.classList.add("hidden")
      this.panelWrap.innerHTML = ""
      return
    }

    this.panelWrap.classList.remove("hidden")

    if (state.mode === "menu") {
      this.renderMenu(leaderboard)
      return
    }

    if (state.mode === "levelComplete") {
      this.renderLevelComplete(state)
      return
    }

    this.renderGameOver(state, leaderboard)
  }

  private renderMenu(leaderboard: LeaderboardEntry[]) {
    this.panelWrap.innerHTML = `
      <section class="panel">
        <h1>Isometric Escape</h1>
        <p>Найдите единственный выход из процедурного лабиринта до конца таймера. Чем быстрее пройден уровень, тем выше счет.</p>
        <form data-start-form>
          <input name="name" maxlength="20" placeholder="Имя игрока" autocomplete="off" required />
          <button type="submit">Начать</button>
        </form>
        ${renderLeaderboard(leaderboard)}
        <div class="hint">Управление: стрелки, WASD или клик/тап по клетке.</div>
      </section>
    `

    const form = this.panelWrap.querySelector<HTMLFormElement>("[data-start-form]")
    form?.addEventListener("submit", (event) => {
      event.preventDefault()
      const data = new FormData(form)
      const name = String(data.get("name") ?? "").trim()
      this.actions.startGame(name || "Player")
    })
  }

  private renderLevelComplete(state: GameState) {
    this.panelWrap.innerHTML = `
      <section class="panel">
        <h2>Выход найден</h2>
        <p>Начислено очков за уровень: <strong>${state.lastLevelScore}</strong>.</p>
        <p>Общий счет: <strong>${state.score}</strong>.</p>
        <div class="actions">
          <button data-next>Далее</button>
          <button class="secondary" data-menu>В меню</button>
        </div>
      </section>
    `

    this.panelWrap.querySelector("[data-next]")?.addEventListener("click", this.actions.nextLevel)
    this.panelWrap.querySelector("[data-menu]")?.addEventListener("click", this.actions.showMenu)
  }

  private renderGameOver(state: GameState, leaderboard: LeaderboardEntry[]) {
    this.panelWrap.innerHTML = `
      <section class="panel">
        <h2>Время вышло</h2>
        <p>Финальный счет: <strong>${state.score}</strong>. Достигнут уровень: <strong>${state.level}</strong>.</p>
        ${renderLeaderboard(leaderboard)}
        <div class="actions">
          <button data-restart>Играть снова</button>
          <button class="secondary" data-menu>В меню</button>
        </div>
      </section>
    `

    this.panelWrap.querySelector("[data-restart]")?.addEventListener("click", this.actions.restart)
    this.panelWrap.querySelector("[data-menu]")?.addEventListener("click", this.actions.showMenu)
  }
}

function renderLeaderboard(entries: LeaderboardEntry[]) {
  if (entries.length === 0) {
    return "<p class=\"hint\">Таблица очков пока пуста.</p>"
  }

  return `
    <h2>Доска очков</h2>
    <ol class="leaderboard">
      ${entries
        .map(
          (entry, index) => `
            <li>
              <span>${index + 1}</span>
              <strong>${escapeHtml(entry.name)}</strong>
              <span>${entry.score}</span>
            </li>
          `,
        )
        .join("")}
    </ol>
  `
}

function formatTime(value: number) {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;")
}
