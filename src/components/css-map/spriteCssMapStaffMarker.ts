import {
  getCssMapStaffColor,
  getCssMapStaffShiftAngle,
} from './css3dMapPalette'
import type { CssMapStaffAssignment } from './css3dMapTypes'

export interface SpriteCssMapStaffMarkerPlan {
  readonly angle: number
  readonly color: string
}

export function getSpriteCssMapStaffMarkerPlan(
  staff: CssMapStaffAssignment,
): SpriteCssMapStaffMarkerPlan {
  return {
    angle: getCssMapStaffShiftAngle(staff.shift),
    color: getCssMapStaffColor(staff.category),
  }
}

export function drawSpriteCssMapStaffMarker(
  context: CanvasRenderingContext2D,
  staff: CssMapStaffAssignment,
  x: number,
  y: number,
  size: number,
): void {
  const plan = getSpriteCssMapStaffMarkerPlan(staff)
  const radius = size / 2
  const centerX = x + radius
  const centerY = y + radius
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + (Math.PI * 2 * plan.angle) / 360

  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.fillStyle = 'rgba(255, 255, 255, 0.38)'
  context.fill()

  context.beginPath()
  context.moveTo(centerX, centerY)
  context.arc(centerX, centerY, radius, startAngle, endAngle)
  context.closePath()
  context.fillStyle = plan.color
  context.fill()

  context.beginPath()
  context.arc(centerX, centerY, Math.max(radius - 2, 1), 0, Math.PI * 2)
  context.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  context.lineWidth = Math.max(1, size * 0.12)
  context.stroke()

  context.beginPath()
  context.arc(centerX, centerY, radius - 0.5, 0, Math.PI * 2)
  context.strokeStyle = 'rgba(21, 43, 70, 0.28)'
  context.lineWidth = 1
  context.stroke()
  context.restore()
}
