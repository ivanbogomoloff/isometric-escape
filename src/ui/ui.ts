import goldIconUrl from "../assets/icons/gold.svg"
import longStepIconUrl from "../assets/icons/long-step.svg"
import speedIconUrl from "../assets/icons/speed.svg"
import wallPassIconUrl from "../assets/icons/wall-pass.svg"
import { SHOP_ITEMS, type GameState, type ShopItemId } from "../game/state"
import type { LeaderboardEntry } from "../repositories/leaderboardRepository"

type UIActions = {
  startGame: (name: string) => void
  nextLevel: () => void
  restart: () => void
  showMenu: () => void
  buyItem: (itemId: ShopItemId) => void
}

export class GameUI {
  private readonly layer = document.createElement("div")
  private readonly hud = document.createElement("div")
  private readonly panelWrap = document.createElement("div")
  private lastHudKey = ""
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

    const leaderboardKey = leaderboard.map((entry) => `${entry.name}:${entry.level}:${entry.gold}`).join("|")
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
      this.lastHudKey = "menu"
      return
    }

    this.hud.classList.remove("hidden")
    const hudKey = getHudKey(state)
    if (this.lastHudKey === hudKey) {
      return
    }

    this.lastHudKey = hudKey
    this.hud.innerHTML = `
      <div class="hud-card"><span>Игрок</span><strong>${escapeHtml(state.playerName)}</strong></div>
      <div class="hud-card"><span>Уровень</span><strong>${state.level}</strong></div>
      <div class="hud-card"><span>Время</span><strong>${formatTime(state.timeLeft)}</strong></div>
      <div class="hud-card gold-card" aria-label="Золото">
        <img class="ui-icon gold-icon" src="${goldIconUrl}" alt="" />
        <strong>${state.gold}</strong>
      </div>
      ${renderBoostProgress(state)}
      ${renderLongStepProgress(state)}
      ${renderWallPassCharges(state)}
      ${renderShop(state)}
    `

    this.hud.querySelectorAll<HTMLButtonElement>("[data-buy-item]").forEach((button) => {
      button.addEventListener("click", () => {
        this.actions.buyItem(button.dataset.buyItem as ShopItemId)
      })
    })
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
        <h1>Выйти из лабиринта</h1>
        <p>Найдите единственный выход из процедурного лабиринта до конца таймера. Золото за уровни можно тратить на преимущества.</p>
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
        <p>Получено золота за уровень: <strong>${state.lastLevelGold}</strong>.</p>
        <p>Всего золота: <strong>${state.gold}</strong>.</p>
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
        <p>Достигнут уровень: <strong>${state.level}</strong>. Осталось золота: <strong>${state.gold}</strong>.</p>
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
    return "<p class=\"hint\">Таблица результатов пока пуста.</p>"
  }

  return `
    <h2>Таблица результатов</h2>
    <ol class="leaderboard">
      ${entries
        .map(
          (entry, index) => `
            <li>
              <span>${index + 1}</span>
              <strong>${escapeHtml(entry.name)}</strong>
              <span>Ур. ${entry.level}</span>
              <span class="leaderboard-gold">
                <img class="ui-icon gold-icon" src="${goldIconUrl}" alt="" />
                ${entry.gold}
              </span>
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

function getHudKey(state: GameState) {
  return [
    state.mode,
    state.playerName,
    state.level,
    Math.floor(state.timeLeft),
    state.gold,
    state.boostRemaining.toFixed(1),
    state.boostDuration,
    state.longStepRemaining.toFixed(1),
    state.longStepDuration,
    state.wallPassCharges,
  ].join("|")
}

function renderShop(state: GameState) {
  return `
    <div class="hud-card shop-card" aria-label="Магазин предметов">
      <div class="shop-items">
        ${SHOP_ITEMS.map((item) => {
          const disabled = state.mode !== "playing" || state.gold < item.cost

          return `
            <button
              class="shop-item"
              type="button"
              data-buy-item="${item.id}"
              ${disabled ? "disabled" : ""}
              title="${escapeHtml(item.description)}"
            >
              <img class="ui-icon" src="${getItemIcon(item.id)}" alt="" />
              <span>${escapeHtml(item.name)}</span>
              <strong>
                <img class="ui-icon gold-icon" src="${goldIconUrl}" alt="" />
                ${item.cost}
              </strong>
            </button>
          `
        }).join("")}
      </div>
    </div>
  `
}

function renderBoostProgress(state: GameState) {
  if (state.boostRemaining <= 0 || state.boostDuration <= 0) {
    return ""
  }

  const progress = Math.max(0, Math.min(1, state.boostRemaining / state.boostDuration))

  return `
    <div class="hud-card boost-card">
      <span>Ускорение</span>
      <strong>${state.boostRemaining.toFixed(1)}с</strong>
      <div class="boost-progress" aria-label="Оставшееся ускорение">
        <div class="boost-progress-fill" style="width: ${(progress * 100).toFixed(1)}%"></div>
      </div>
    </div>
  `
}

function renderLongStepProgress(state: GameState) {
  if (state.longStepRemaining <= 0 || state.longStepDuration <= 0) {
    return ""
  }

  const progress = Math.max(0, Math.min(1, state.longStepRemaining / state.longStepDuration))

  return `
    <div class="hud-card boost-card">
      <span>Длинный шаг</span>
      <strong>${state.longStepRemaining.toFixed(1)}с</strong>
      <div class="boost-progress" aria-label="Оставшийся длинный шаг">
        <div class="boost-progress-fill long-step-progress-fill" style="width: ${(progress * 100).toFixed(1)}%"></div>
      </div>
    </div>
  `
}

function renderWallPassCharges(state: GameState) {
  if (state.wallPassCharges <= 0) {
    return ""
  }

  return `
    <div class="hud-card wall-pass-card">
      <img class="ui-icon" src="${wallPassIconUrl}" alt="" />
      <span>Сквозь стену</span>
      <strong>${state.wallPassCharges}</strong>
    </div>
  `
}

function getItemIcon(itemId: ShopItemId) {
  switch (itemId) {
    case "speedBoost":
      return speedIconUrl
    case "longStep":
      return longStepIconUrl
    case "wallPass":
      return wallPassIconUrl
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;")
}
