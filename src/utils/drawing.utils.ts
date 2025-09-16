import { BaseBrush, CustomBrush, EraserType } from "../services/canvas-state.service";

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

// Cache for the original, unmodified brush textures
const sourceTextureCache = new Map<string, HTMLImageElement>();
// Cache for pre-tinted versions of textures to improve performance.
// The key is a combination of the texture source and the color hex code.
const tintedTextureCache = new Map<string, HTMLCanvasElement>();

/**
 * Retrieves the source HTMLImageElement for a given texture data URL.
 * Handles caching to avoid reloading the same texture repeatedly.
 */
function getSourceTexture(src: string): HTMLImageElement | null {
  if (!src.startsWith('data:image')) {
    return null;
  }
  
  let img = sourceTextureCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    sourceTextureCache.set(src, img);
  }
  
  return img;
}

/**
 * Retrieves a pre-tinted canvas element for a given texture and color.
 * If a tinted version doesn't exist in the cache, it creates one.
 * This is a performance optimization to avoid tinting on every dab.
 */
function getTintedTexture(src: string, color: string): HTMLCanvasElement | null {
    const cacheKey = `${src}|${color}`;
    if (tintedTextureCache.has(cacheKey)) {
        return tintedTextureCache.get(cacheKey)!;
    }

    const sourceTexture = getSourceTexture(src);
    // Ensure the source texture is fully loaded and decoded before trying to use it.
    if (!sourceTexture || !sourceTexture.complete || sourceTexture.naturalWidth === 0) {
        return null; // Source is not ready.
    }

    // Create a new canvas to hold the tinted version.
    const tintedCanvas = document.createElement('canvas');
    tintedCanvas.width = sourceTexture.naturalWidth;
    tintedCanvas.height = sourceTexture.naturalHeight;
    const tintedCtx = tintedCanvas.getContext('2d')!;
    
    // Draw the original texture, then use 'source-in' to apply the color tint.
    tintedCtx.drawImage(sourceTexture, 0, 0);
    tintedCtx.globalCompositeOperation = 'source-in';
    tintedCtx.fillStyle = color;
    tintedCtx.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);

    // Store the newly created tinted canvas in the cache for future use.
    tintedTextureCache.set(cacheKey, tintedCanvas);
    return tintedCanvas;
}

/**
 * Draws a single "dab" of a brush onto the canvas, applying all dynamic properties.
 */
function drawDab(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, pressure: number, brush: BaseBrush | CustomBrush, baseSize: number) {
  const tintedTexture = getTintedTexture(brush.shape.texture, color);
  
  // If the texture isn't ready (e.g., still loading), we skip this dab.
  if (!tintedTexture) {
    return;
  }

  let currentSize = baseSize;
  if (brush.dynamics.pressureSize) {
    currentSize *= Math.max(0.05, pressure);
  }

  const dabCount = Math.round(brush.scatter.count + brush.scatter.count * brush.scatter.countJitter * (Math.random() - 0.5));
  
  for (let i = 0; i < dabCount; i++) {
    const jitter = (val: number) => 1 + val * (Math.random() - 0.5) * 2;
    
    const dabSize = currentSize * jitter(brush.dynamics.sizeJitter);
    const dabWidth = dabSize;
    const dabHeight = dabSize * (brush.shape.roundness / 100);
    
    let dabOpacity = jitter(brush.dynamics.opacityJitter);
    if (brush.dynamics.pressureOpacity) {
      dabOpacity *= Math.max(0.05, pressure);
    }

    const scatterDist = brush.scatter.scatter * currentSize * Math.random();
    const scatterAngle = Math.random() * 2 * Math.PI;
    const dabX = x + Math.cos(scatterAngle) * scatterDist;
    const dabY = y + Math.sin(scatterAngle) * scatterDist;
    
    const dabAngle = (brush.shape.angle * Math.PI / 180) + (brush.shape.angleJitter * Math.PI * (Math.random() - 0.5) * 2);

    ctx.save();
    ctx.translate(dabX, dabY);
    ctx.rotate(dabAngle);
    ctx.globalAlpha = dabOpacity;
    
    // Draw the pre-tinted texture directly, which is much faster than tinting on the fly.
    ctx.drawImage(tintedTexture, -dabWidth / 2, -dabHeight / 2, dabWidth, dabHeight);
    
    ctx.restore();
  }
}

/**
 * Interpolates points between two coordinates and draws dabs along the path.
 */
function drawStrokeSegment(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, size: number, brush: BaseBrush | CustomBrush) {
  const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const spacing = Math.max(1, (size * brush.shape.spacing) / 100);

  for (let i = 0; i < distance; i += spacing) {
    const t = i / distance;
    const x = p1.x + Math.cos(angle) * i;
    const y = p1.y + Math.sin(angle) * i;
    const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;
    drawDab(ctx, x, y, color, pressure, brush, size);
  }
   // Draw the last point to ensure the stroke is complete
  drawDab(ctx, p2.x, p2.y, color, p2.pressure, brush, size);
}

/**
 * Returns a function to draw with a specific brush configuration.
 */
export function getBrush(brush: BaseBrush | CustomBrush | null): ((ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, size: number) => void) | null {
  if (!brush) return null;
  
  return (ctx, p1, p2, color, size) => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    drawStrokeSegment(ctx, p1, p2, color, size, brush);
    ctx.restore();
  };
}


/**
 * Returns a function to erase with a specific eraser type.
 */
export function getEraser(eraserType: EraserType): ((ctx: CanvasRenderingContext2D, p1: Point, p2: Point, size: number) => void) | null {
  
  const erase = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, size: number) => {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      
      const step = Math.min(4, size / 4);

      for (let i = 0; i <= distance; i += step) {
          const t = distance === 0 ? 0 : i / distance;
          const x = p1.x + (p2.x - p1.x) * t;
          const y = p1.y + (p2.y - p1.y) * t;
          const radius = Math.max(0.5, size / 2);
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
  };

  return (ctx, p1, p2, size) => {
      // A more advanced implementation could handle a 'soft' eraser differently.
      erase(ctx, p1, p2, size);
  };
}
