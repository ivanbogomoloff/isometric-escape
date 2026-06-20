import { Vector3, type OrthographicCamera } from "three"
import { queries } from "../ecs/world"

const desiredPosition = new Vector3()

export function cameraSystem(camera: OrthographicCamera) {
  for (const player of queries.player) {
    const targetX = player.position.x
    const targetZ = player.position.z
    const desiredX = targetX + 8
    const desiredY = 10
    const desiredZ = targetZ + 8

    camera.position.lerp(desiredPosition.set(desiredX, desiredY, desiredZ), 0.08)
    camera.lookAt(targetX, 0, targetZ)
    return
  }
}

export function resizeCamera(camera: OrthographicCamera, width: number, height: number) {
  const aspect = width / height
  const visibleSize = width < 700 ? 8 : 12

  camera.left = (-visibleSize * aspect) / 2
  camera.right = (visibleSize * aspect) / 2
  camera.top = visibleSize / 2
  camera.bottom = -visibleSize / 2
  camera.updateProjectionMatrix()
}
