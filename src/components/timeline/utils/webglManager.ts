import { Application, Container, Graphics, ResizePlugin } from 'pixi.js'

export interface WebGLManagerOptions {
  width: number
  height: number
  hexToPixi: (hex: string) => number
  themeBackground: string
  onContextLost?: () => void
  onContextRestored?: () => void
}

export class WebGLManager {
  private app: Application | null = null
  private contextLostCount = 0
  private maxContextLostRetries = 2
  private resizeObserver: ResizeObserver | null = null

  async initializePixiApp(options: WebGLManagerOptions): Promise<Application | null> {
    // Prevent multiple initializations
    if (this.app) {
      console.warn('PixiJS app already exists, destroying previous instance')
      this.destroy()
    }
    
    try {
      const app = new Application()

      // Detect environment for optimal settings
      const isStorybook = window.location.pathname.includes('storybook') || window.parent !== window
      
      // PixiJS best practices: balanced settings for quality and performance
      const pixiSettings = {
        width: options.width,
        height: options.height,
        backgroundColor: options.hexToPixi(options.themeBackground),
        antialias: isStorybook, // Enable antialias only in Storybook for better visuals
        resolution: window.devicePixelRatio || 1, // Use device pixel ratio for crisp rendering
        hello: false,
        preference: 'webgl' as const, // Use WebGL for compatibility
        powerPreference: 'high-performance' as const, // Use high performance for better visuals
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        premultipliedAlpha: true, // Standard WebGL setting
        depth: false,
        stencil: false
      }

      await app.init(pixiSettings)
      
      // Configure renderer for stability and text clarity
      if (app.renderer) {
        // PixiJS best practice: set texture garbage collection parameters
        app.renderer.texture.managedTextures.forEach(texture => {
          if (texture.source) {
            texture.source.autoGenerateMipmaps = false
          }
        })
        
        // Configure renderer for crisp text rendering
        const canvas = app.canvas as HTMLCanvasElement
        canvas.style.imageRendering = 'auto'
        // Font smoothing for better text rendering
        ;(canvas.style as any).webkitFontSmoothing = 'antialiased'
        ;(canvas.style as any).mozOsxFontSmoothing = 'grayscale'
      }

      this.app = app
      this.setupWebGLContextRecovery(app, options)
      this.setupResizeHandling()
      
      return app
    } catch (error) {
      console.warn('WebGL2 failed, trying WebGL1:', error)
      
      // Fallback to WebGL1 with conservative settings
      try {
        const app = new Application()
        await app.init({
          width: options.width,
          height: options.height,
          backgroundColor: options.hexToPixi(options.themeBackground),
          antialias: false,
          resolution: 1,
          hello: false,
          preference: 'webgl',
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false
        })
        
        this.app = app
        this.setupWebGLContextRecovery(app, options)
        this.setupResizeHandling()
        return app
      } catch (fallbackError) {
        console.error('WebGL initialization failed completely:', fallbackError)
        return null
      }
    }
  }

  private setupWebGLContextRecovery(app: Application, options: WebGLManagerOptions) {
    const canvas = app.canvas as HTMLCanvasElement
    
    // PixiJS best practice: use proper context recovery handling
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      this.contextLostCount++
      
      if (this.contextLostCount <= this.maxContextLostRetries) {
        console.log(`WebGL context lost, will attempt recovery (${this.contextLostCount}/${this.maxContextLostRetries})`)
        options.onContextLost?.()
      } else {
        console.error('WebGL context lost too many times')
      }
    })

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored successfully')
      
      // PixiJS best practice: reinitialize renderer state after context restoration
      setTimeout(() => {
        try {
          if (this.app?.renderer) {
            // Restore background color
            this.app.renderer.background.color = options.hexToPixi(options.themeBackground)
            
            // Force a render to ensure everything is working
            this.app.renderer.render(this.app.stage)
            
            options.onContextRestored?.()
          }
        } catch (error) {
          console.error('Error during context restoration:', error)
        }
      }, 100)
    })
  }


  configureCanvas(canvas: HTMLCanvasElement) {
    // PixiJS best practice: configure canvas for crisp text and proper layout
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.position = 'relative' // Use relative positioning for proper layout
    
    // Optimize for text rendering rather than pixel art
    canvas.style.imageRendering = 'auto' // Better for text than 'pixelated'
    // Font smoothing for better text rendering
    ;(canvas.style as any).webkitFontSmoothing = 'antialiased'
    ;(canvas.style as any).mozOsxFontSmoothing = 'grayscale'
    
    // Prevent context menu and selection
    canvas.style.userSelect = 'none'
    canvas.style.touchAction = 'none'
  }

  private setupResizeHandling() {
    if (!this.app) return

    const canvas = this.app.canvas as HTMLCanvasElement
    const container = canvas.parentElement
    
    if (container) {
      // Use ResizeObserver for efficient resize handling
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          this.resizeApp(width, height)
        }
      })
      
      this.resizeObserver.observe(container)
    }
    
    // Also handle window resize as fallback
    window.addEventListener('resize', this.handleWindowResize)
  }

  private handleWindowResize = () => {
    if (this.app) {
      const canvas = this.app.canvas as HTMLCanvasElement
      const container = canvas.parentElement
      
      if (container) {
        const rect = container.getBoundingClientRect()
        this.resizeApp(rect.width, rect.height)
      }
    }
  }

  resizeApp(width: number, height: number) {
    if (this.app && width > 0 && height > 0) {
      try {
        // PixiJS best practice: resize without artificial limits for proper display
        this.app.renderer.resize(width, height)
        
        // Update canvas styling for crisp rendering
        const canvas = this.app.canvas as HTMLCanvasElement
        this.configureCanvas(canvas)
        
        return true
      } catch (error) {
        console.error('Error resizing PixiJS app:', error)
        return false
      }
    }
    return false
  }

  cleanupContainers(containers: (Container | Graphics | null)[]) {
    containers.forEach(container => {
      if (container) {
        try {
          if (container.parent) {
            container.parent.removeChild(container)
          }
          if ('removeChildren' in container) {
            container.removeChildren()
          }
          if ('destroy' in container) {
            container.destroy({ children: true })
          }
        } catch (error) {
          console.warn('Error cleaning up container:', error)
        }
      }
    })
  }

  destroy() {
    // Clean up resize handling
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    
    window.removeEventListener('resize', this.handleWindowResize)
    
    if (this.app) {
      try {
        const canvas = this.app.canvas as HTMLCanvasElement
        
        // Remove canvas from DOM if it's still attached
        if (canvas && canvas.parentElement) {
          canvas.parentElement.removeChild(canvas)
        }
        
        // Force WebGL cleanup before destroying
        const gl = canvas?.getContext('webgl') as WebGLRenderingContext || 
                   canvas?.getContext('experimental-webgl') as WebGLRenderingContext
        
        if (gl) {
          gl.flush()
          gl.finish()
          
          // Try to lose context manually to free memory
          const loseContext = gl.getExtension('WEBGL_lose_context')
          if (loseContext) {
            loseContext.loseContext()
          }
        }
        
        // Destroy PixiJS app with comprehensive cleanup
        this.app.destroy(true, {
          children: true,
          texture: true,
          textureSource: true
        })
        
        // Force nullify canvas reference
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
        
      } catch (error) {
        console.warn('Error during WebGL cleanup:', error)
      } finally {
        this.app = null
      }
    }
  }

  getApp(): Application | null {
    return this.app
  }

  isValid(): boolean {
    return this.app !== null && this.contextLostCount < this.maxContextLostRetries
  }
}