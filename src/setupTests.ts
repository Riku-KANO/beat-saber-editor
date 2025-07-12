import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock WebGL context for tests
Object.defineProperty(window, 'WebGLRenderingContext', {
  value: function() {}
})

Object.defineProperty(window, 'WebGL2RenderingContext', {
  value: function() {}
})

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  clip: vi.fn(),
  translate: vi.fn(),
  rect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0))
global.cancelAnimationFrame = vi.fn()

// Mock AudioContext for audio-related tests
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  decodeAudioData: vi.fn(),
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  destination: {},
}))

// Mock MediaElement
global.HTMLMediaElement.prototype.load = vi.fn()
global.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
global.HTMLMediaElement.prototype.pause = vi.fn()