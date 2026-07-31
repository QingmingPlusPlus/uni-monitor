import { describe, expect, it, vi } from 'vitest'
import type { CssMapDevice } from './css3dMapTypes'
import {
  createCssMapDeviceNavigation,
  getCssMapDeviceLayoutKey,
} from './css3dMapDeviceNavigation'

function createDevice(overrides: Partial<CssMapDevice> = {}): CssMapDevice {
  return {
    id: 'device-1',
    name: 'device-1',
    section: null,
    x: 10,
    y: 20,
    w: 100,
    h: 80,
    deviceCodes: [],
    children: [],
    runtime: {
      status: null,
      loadRate: null,
      staff: [],
      fiveMChanges: [],
    },
    ...overrides,
  } as CssMapDevice
}

interface PointerEventInit {
  pointerType?: 'mouse' | 'touch' | 'pen'
  button?: number
  pointerId?: number
  clientX?: number
  clientY?: number
  timeStamp?: number
}

function createPointerEvent(init: PointerEventInit = {}): PointerEvent {
  const event = {
    pointerType: 'mouse',
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
    preventDefault: vi.fn(),
  } as unknown as PointerEvent

  Object.assign(event, init)
  return event
}

describe('getCssMapDeviceLayoutKey', () => {
  it('组合设备 id、位置、尺寸与形状键', () => {
    const device = createDevice()
    expect(getCssMapDeviceLayoutKey(device)).toBe('device-1-10-20-100-80-rectangle')
  })

  it('不同位置或尺寸产生不同键', () => {
    expect(getCssMapDeviceLayoutKey(createDevice({ id: 'a', x: 1, y: 2, w: 3, h: 4 })))
      .not.toBe(getCssMapDeviceLayoutKey(createDevice({ id: 'a', x: 1, y: 2, w: 3, h: 5 })))
  })
})

describe('createCssMapDeviceNavigation', () => {
  it('选择模式下单击即打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => true,
      openDevice,
    })
    const device = createDevice()
    const down = createPointerEvent({ clientX: 50, clientY: 60, timeStamp: 100 })
    const up = createPointerEvent({ clientX: 50, clientY: 60, timeStamp: 120 })

    nav.handlePointerDown(down, device)
    nav.handlePointerUp(up, device)

    expect(openDevice).toHaveBeenCalledWith('device-1')
    expect(down.preventDefault).toHaveBeenCalled()
    expect(up.preventDefault).toHaveBeenCalled()
  })

  it('非选择模式下双击同一设备在阈值内打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => false,
      openDevice,
    })
    const device = createDevice()

    const firstDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 100 })
    const firstUp = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 110 })
    const secondDown = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 400 })
    const secondUp = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 410 })

    nav.handlePointerDown(firstDown, device)
    nav.handlePointerUp(firstUp, device)
    nav.handlePointerDown(secondDown, device)
    nav.handlePointerUp(secondUp, device)

    expect(openDevice).toHaveBeenCalledTimes(1)
    expect(openDevice).toHaveBeenCalledWith('device-1')
  })

  it('非选择模式下双击间隔超过阈值不打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => false,
      openDevice,
    })
    const device = createDevice()

    const firstDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 100 })
    const firstUp = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 110 })
    const secondDown = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 1000 })
    const secondUp = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 1010 })

    nav.handlePointerDown(firstDown, device)
    nav.handlePointerUp(firstUp, device)
    nav.handlePointerDown(secondDown, device)
    nav.handlePointerUp(secondUp, device)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('非选择模式下双击位置距离过远不打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => false,
      openDevice,
    })
    const device = createDevice()

    const firstDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 100 })
    const firstUp = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 110 })
    const secondDown = createPointerEvent({ clientX: 100, clientY: 100, timeStamp: 400 })
    const secondUp = createPointerEvent({ clientX: 100, clientY: 100, timeStamp: 410 })

    nav.handlePointerDown(firstDown, device)
    nav.handlePointerUp(firstUp, device)
    nav.handlePointerDown(secondDown, device)
    nav.handlePointerUp(secondUp, device)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('pointerup 移动距离超过容差时清除上次点击且不打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => false,
      openDevice,
    })
    const device = createDevice()

    const firstDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 100 })
    const firstUp = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 110 })
    const dragDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 200 })
    const dragUp = createPointerEvent({ clientX: 500, clientY: 500, timeStamp: 210 })

    nav.handlePointerDown(firstDown, device)
    nav.handlePointerUp(firstUp, device)
    nav.handlePointerDown(dragDown, device)
    nav.handlePointerUp(dragUp, device)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('pointerup 时无对应 pointerDown 不打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => true,
      openDevice,
    })
    const device = createDevice()
    const up = createPointerEvent({ clientX: 50, clientY: 60, timeStamp: 120 })

    nav.handlePointerUp(up, device)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('pointerId 不匹配时不打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => true,
      openDevice,
    })
    const device = createDevice()
    const down = createPointerEvent({ pointerId: 1, clientX: 50, clientY: 60, timeStamp: 100 })
    const up = createPointerEvent({ pointerId: 2, clientX: 50, clientY: 60, timeStamp: 120 })

    nav.handlePointerDown(down, device)
    nav.handlePointerUp(up, device)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('设备布局变化导致 key 不匹配时不打开设备', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => true,
      openDevice,
    })
    const deviceA = createDevice({ id: 'a', x: 0, y: 0, w: 10, h: 10 })
    const deviceB = createDevice({ id: 'b', x: 0, y: 0, w: 10, h: 10 })
    const down = createPointerEvent({ clientX: 5, clientY: 5, timeStamp: 100 })
    const up = createPointerEvent({ clientX: 5, clientY: 5, timeStamp: 120 })

    nav.handlePointerDown(down, deviceA)
    nav.handlePointerUp(up, deviceB)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('非主键鼠标按键被忽略', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => true,
      openDevice,
    })
    const device = createDevice()
    const down = createPointerEvent({ button: 2, clientX: 5, clientY: 5, timeStamp: 100 })
    const up = createPointerEvent({ button: 2, clientX: 5, clientY: 5, timeStamp: 120 })

    nav.handlePointerDown(down, device)
    nav.handlePointerUp(up, device)

    expect(openDevice).not.toHaveBeenCalled()
    expect(down.preventDefault).not.toHaveBeenCalled()
  })

  it('触摸指针视为主指针', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => true,
      openDevice,
    })
    const device = createDevice()
    const down = createPointerEvent({ pointerType: 'touch', clientX: 5, clientY: 5, timeStamp: 100 })
    const up = createPointerEvent({ pointerType: 'touch', clientX: 5, clientY: 5, timeStamp: 120 })

    nav.handlePointerDown(down, device)
    nav.handlePointerUp(up, device)

    expect(openDevice).toHaveBeenCalledWith('device-1')
  })

  it('reset 清除状态，后续单击不再触发上次的双击判定', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => false,
      openDevice,
    })
    const device = createDevice()

    const firstDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 100 })
    const firstUp = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 110 })
    nav.handlePointerDown(firstDown, device)
    nav.handlePointerUp(firstUp, device)

    nav.reset()

    const secondDown = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 400 })
    const secondUp = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 410 })
    nav.handlePointerDown(secondDown, device)
    nav.handlePointerUp(secondUp, device)

    expect(openDevice).not.toHaveBeenCalled()
  })

  it('handlePointerCancel 等价于 reset', () => {
    const openDevice = vi.fn()
    const nav = createCssMapDeviceNavigation({
      isSelectMode: () => false,
      openDevice,
    })
    const device = createDevice()

    const firstDown = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 100 })
    const firstUp = createPointerEvent({ clientX: 10, clientY: 10, timeStamp: 110 })
    nav.handlePointerDown(firstDown, device)
    nav.handlePointerUp(firstUp, device)

    nav.handlePointerCancel()

    const secondDown = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 400 })
    const secondUp = createPointerEvent({ clientX: 12, clientY: 9, timeStamp: 410 })
    nav.handlePointerDown(secondDown, device)
    nav.handlePointerUp(secondUp, device)

    expect(openDevice).not.toHaveBeenCalled()
  })
})