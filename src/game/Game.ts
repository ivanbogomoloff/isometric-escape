import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import { clearWorld, queries, world, type Entity } from "../ecs/world"
import { gridToWorld, worldToGrid } from "../level/coordinates"
import { generateMaze } from "../level/generateMaze"
import { samePoint, type GridPoint, type Maze } from "../level/types"
import { cameraSystem, resizeCamera } from "../systems/cameraSystem"
import { collisionSystem } from "../systems/collisionSystem"
import { CLICK_MOVE_RANGE, movePlayerByDelta, setPlayerPathTo } from "../systems/inputSystem"
import { movementSystem } from "../systems/movementSystem"
import { pickupSystem } from "../systems/pickupSystem"
import { reachableHighlightSystem } from "../systems/reachableHighlightSystem"
import { renderSystem } from "../systems/renderSystem"
import { timerSystem } from "../systems/timerSystem"
import { GameUI } from "../ui/ui"
import { getLeaderboard, saveLeaderboardEntry } from "../ui/leaderboard"
import {
  calculateLevelScore,
  createInitialState,
  getLevelSize,
  getLevelTime,
  type GameState,
} from "./state"

const FLOOR_GEOMETRY = new BoxGeometry(0.98, 0.08, 0.98)
const WALL_THICKNESS = 0.28
const WALL_CORE_GEOMETRY = new BoxGeometry(WALL_THICKNESS, 1, WALL_THICKNESS)
const WALL_CONNECTOR_X_GEOMETRY = new BoxGeometry(1, 1, WALL_THICKNESS)
const WALL_CONNECTOR_Z_GEOMETRY = new BoxGeometry(WALL_THICKNESS, 1, 1)
const EXIT_GEOMETRY = new BoxGeometry(0.72, 0.12, 0.72)
const PLAYER_GEOMETRY = new BoxGeometry(0.46, 0.7, 0.46)
const BOOST_ARROW_SHAFT_GEOMETRY = new CylinderGeometry(0.045, 0.045, 0.42, 10)
const BOOST_ARROW_HEAD_GEOMETRY = new ConeGeometry(0.14, 0.28, 3)

const FLOOR_COLOR = "#355070"
const EXIT_COLOR = "#8ce99a"
const FLOOR_MATERIAL = new MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.95 })
const WALL_MATERIAL = new MeshStandardMaterial({ color: "#6d597a", roughness: 0.85 })
const EXIT_MATERIAL = new MeshStandardMaterial({ color: EXIT_COLOR, emissive: "#31572c", roughness: 0.35 })
const PLAYER_MATERIAL = new MeshStandardMaterial({ color: "#ffb703", roughness: 0.45 })
const BOOST_MATERIAL = new MeshStandardMaterial({ color: "#48cae4", emissive: "#0077b6", roughness: 0.25 })

export class Game {
  private readonly root = document.createElement("div")
  private readonly scene = new Scene()
  private readonly renderer = new WebGLRenderer({ antialias: true })
  private readonly camera = new OrthographicCamera()
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0)
  private readonly intersection = new Vector3()
  private readonly ui: GameUI
  private state: GameState = createInitialState()
  private maze: Maze | undefined
  private lastFrameTime = performance.now()
  private scoreSaved = false

  constructor(container: HTMLElement) {
    this.root.className = "game-root"
    this.renderer.domElement.className = "game-canvas"
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(new Color("#0e1726"))
    this.root.append(this.renderer.domElement)
    container.append(this.root)

    this.scene.background = new Color("#0e1726")
    this.scene.add(new AmbientLight("#ffffff", 1.15))

    const sun = new DirectionalLight("#ffffff", 2.2)
    sun.position.set(7, 12, 8)
    this.scene.add(sun)

    this.camera.position.set(8, 10, 8)
    this.camera.lookAt(0, 0, 0)

    this.ui = new GameUI(this.root, {
      startGame: (name) => this.startGame(name),
      nextLevel: () => this.nextLevel(),
      restart: () => this.startGame(this.state.playerName || "Player"),
      showMenu: () => this.showMenu(),
    })

    window.addEventListener("resize", this.resize)
    window.addEventListener("keydown", this.handleKeyDown)
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown)

    this.resize()
    this.ui.update(this.state, getLeaderboard())
    requestAnimationFrame(this.tick)
  }

  private readonly tick = (time: number) => {
    const delta = Math.min(0.05, (time - this.lastFrameTime) / 1000)
    this.lastFrameTime = time

    if (this.maze && this.state.mode === "playing") {
      timerSystem(this.state, delta, () => this.finishGame())
      pickupSystem(delta)
      movementSystem(delta, this.maze)
      collisionSystem(this.maze, () => this.finishLevel())
      reachableHighlightSystem(this.maze, CLICK_MOVE_RANGE)
      this.syncPlayerEffects()
    }

    cameraSystem(this.camera)
    renderSystem()
    this.renderer.render(this.scene, this.camera)
    this.ui.update(this.state, getLeaderboard())

    requestAnimationFrame(this.tick)
  }

  private startGame(name: string) {
    this.state = createInitialState()
    this.state.playerName = name
    this.state.mode = "playing"
    this.scoreSaved = false
    this.loadLevel(1)
  }

  private nextLevel() {
    this.state.level += 1
    this.state.mode = "playing"
    this.loadLevel(this.state.level)
  }

  private showMenu() {
    clearWorld()
    this.maze = undefined
    this.state = createInitialState()
    this.scoreSaved = false
    this.ui.update(this.state, getLeaderboard())
  }

  private loadLevel(level: number) {
    clearWorld()
    this.maze = generateMaze(getLevelSize(level))
    this.state.level = level
    this.state.levelTime = getLevelTime(level)
    this.state.timeLeft = this.state.levelTime
    this.state.boostRemaining = 0
    this.state.boostDuration = 0
    this.spawnMaze(this.maze)
  }

  private spawnMaze(maze: Maze) {
    for (let y = 0; y < maze.height; y += 1) {
      for (let x = 0; x < maze.width; x += 1) {
        const cell = maze.cells[y][x]
        const gridPosition = { x, y }
        const floorPosition = gridToWorld(gridPosition, maze.width, maze.height)
        const isExit = cell === "exit"
        const floor = new Mesh(
          isExit ? EXIT_GEOMETRY : FLOOR_GEOMETRY,
          isExit ? EXIT_MATERIAL.clone() : FLOOR_MATERIAL.clone(),
        )

        floor.receiveShadow = true
        this.scene.add(floor)

        const floorEntity: Entity = {
          position: { ...floorPosition, y: isExit ? 0.03 : -0.04 },
          gridPosition,
          mesh: floor,
          floor: {
            baseColor: isExit ? EXIT_COLOR : FLOOR_COLOR,
          },
        }

        if (isExit) {
          floorEntity.exit = true
          floorEntity.spin = 0.018
        }

        world.add(floorEntity)

        if (cell !== "wall") {
          continue
        }

        const wall = createWallMesh(maze, x, y)
        this.scene.add(wall)
        world.add({
          position: { ...floorPosition, y: 0.5 },
          gridPosition,
          mesh: wall,
          wall: true,
        })
      }
    }

    this.spawnBoostPickups(maze)

    const playerPosition = gridToWorld(maze.start, maze.width, maze.height)
    const player = new Mesh(PLAYER_GEOMETRY, PLAYER_MATERIAL)
    player.castShadow = true
    this.scene.add(player)
    world.add({
      id: "player",
      position: { ...playerPosition, y: 0.38 },
      gridPosition: { ...maze.start },
      mesh: player,
      player: {
        speed: 4.5,
        path: [],
      },
    })
  }

  private spawnBoostPickups(maze: Maze) {
    const count = getBoostPickupCount(maze, this.state.level)
    if (count === 0) {
      return
    }

    const candidates = shuffle(getBoostPickupCandidates(maze)).slice(0, count)

    for (const gridPosition of candidates) {
      const position = gridToWorld(gridPosition, maze.width, maze.height)
      const pickup = createBoostPickupMesh()
      this.scene.add(pickup)
      world.add({
        position: { ...position, y: 0.26 },
        gridPosition,
        mesh: pickup,
        boostPickup: {
          duration: 5,
          multiplier: 1.65,
        },
        spin: 0.035,
      })
    }
  }

  private syncPlayerEffects() {
    for (const player of queries.player) {
      this.state.boostRemaining = player.player.boostRemaining ?? 0
      this.state.boostDuration = player.player.boostDuration ?? 0
      return
    }

    this.state.boostRemaining = 0
    this.state.boostDuration = 0
  }

  private finishLevel() {
    if (this.state.mode !== "playing") {
      return
    }

    const levelScore = calculateLevelScore(this.state.level, this.state.timeLeft)
    this.state.lastLevelScore = levelScore
    this.state.score += levelScore
    this.state.boostRemaining = 0
    this.state.boostDuration = 0
    this.state.mode = "levelComplete"
  }

  private finishGame() {
    if (this.state.mode === "gameOver") {
      return
    }

    this.state.mode = "gameOver"
    this.state.boostRemaining = 0
    this.state.boostDuration = 0

    if (!this.scoreSaved) {
      saveLeaderboardEntry({
        name: this.state.playerName || "Player",
        score: this.state.score,
        level: this.state.level,
        createdAt: new Date().toISOString(),
      })
      this.scoreSaved = true
    }
  }

  private readonly resize = () => {
    const width = this.root.clientWidth || window.innerWidth
    const height = this.root.clientHeight || window.innerHeight

    this.renderer.setSize(width, height, false)
    resizeCamera(this.camera, width, height)
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.maze || this.state.mode !== "playing") {
      return
    }

    const delta = getKeyDelta(event.key)
    if (!delta) {
      return
    }

    event.preventDefault()
    movePlayerByDelta(this.maze, delta)
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!this.maze || this.state.mode !== "playing") {
      return
    }

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.intersection)
    if (!hit) {
      return
    }

    setPlayerPathTo(this.maze, worldToGrid(hit.x, hit.z, this.maze.width, this.maze.height), CLICK_MOVE_RANGE)
  }
}

function getKeyDelta(key: string) {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return { x: 0, y: -1 }
    case "ArrowRight":
    case "d":
    case "D":
      return { x: 1, y: 0 }
    case "ArrowDown":
    case "s":
    case "S":
      return { x: 0, y: 1 }
    case "ArrowLeft":
    case "a":
    case "A":
      return { x: -1, y: 0 }
    default:
      return undefined
  }
}

function createWallMesh(maze: Maze, x: number, y: number) {
  const wall = new Group()
  const core = new Mesh(WALL_CORE_GEOMETRY, WALL_MATERIAL)

  core.castShadow = true
  core.receiveShadow = true
  wall.add(core)

  if (isWallCell(maze, x + 1, y)) {
    const connector = new Mesh(WALL_CONNECTOR_X_GEOMETRY, WALL_MATERIAL)
    connector.position.x = 0.5
    connector.castShadow = true
    connector.receiveShadow = true
    wall.add(connector)
  }

  if (isWallCell(maze, x, y + 1)) {
    const connector = new Mesh(WALL_CONNECTOR_Z_GEOMETRY, WALL_MATERIAL)
    connector.position.z = 0.5
    connector.castShadow = true
    connector.receiveShadow = true
    wall.add(connector)
  }

  return wall
}

function isWallCell(maze: Maze, x: number, y: number) {
  return y >= 0 && y < maze.height && x >= 0 && x < maze.width && maze.cells[y][x] === "wall"
}

function createBoostPickupMesh() {
  const arrow = new Group()
  const shaft = new Mesh(BOOST_ARROW_SHAFT_GEOMETRY, BOOST_MATERIAL)
  const head = new Mesh(BOOST_ARROW_HEAD_GEOMETRY, BOOST_MATERIAL)

  shaft.rotation.z = Math.PI / 2
  head.rotation.z = -Math.PI / 2
  head.position.x = 0.3

  arrow.rotation.x = -Math.PI / 2
  arrow.add(shaft, head)

  return arrow
}

function getBoostPickupCount(maze: Maze, level: number) {
  if (level < 4) {
    return 0
  }

  const candidateCount = getBoostPickupCandidates(maze).length
  if (candidateCount < 45) {
    return 0
  }

  return Math.min(6, Math.max(1, Math.floor(candidateCount / 55)))
}

function getBoostPickupCandidates(maze: Maze): GridPoint[] {
  const candidates: GridPoint[] = []

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      const point = { x, y }

      if (maze.cells[y][x] === "floor" && !samePoint(point, maze.start) && !samePoint(point, maze.exit)) {
        candidates.push(point)
      }
    }
  }

  return candidates
}

function shuffle<T>(items: T[]) {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const item = result[i]
    result[i] = result[j]
    result[j] = item
  }

  return result
}
