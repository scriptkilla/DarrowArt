import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService } from '../../services/canvas-state.service';
import { Point, getBrush, getEraser } from '../../utils/drawing.utils';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  stateService = inject(CanvasStateService);
  @ViewChild('mainCanvas') mainCanvasRef!: ElementRef<HTMLCanvasElement>;

  private mainCanvas!: HTMLCanvasElement;
  private mainCtx!: CanvasRenderingContext2D;

  private isDrawing = signal(false);
  private isPanning = signal(false);
  private lastDrawPoint: Point | null = null;
  private lastPanPoint: {x: number, y: number} | null = null;
  private lastUiPoint = signal<{x: number, y: number} | null>(null);
  private activeLayerCtx: CanvasRenderingContext2D | null = null;
  
  private readonly stopEffect;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.stopEffect = effect(() => {
      // This effect automatically redraws the canvas when any dependent signal changes.
      this.redraw();
    });
  }

  ngAfterViewInit(): void {
    this.mainCanvas = this.mainCanvasRef.nativeElement;
    this.mainCtx = this.mainCanvas.getContext('2d')!;
    
    this.stateService.canvasInitialized(this.mainCanvas, this.mainCtx);

    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        this.stateService.setCanvasContainerSize(width, height);
        
        // Update canvas rendering resolution
        this.mainCanvas.width = width;
        this.mainCanvas.height = height;

        // Force a redraw after resize
        this.redraw();
      }
    });

    if (this.mainCanvas.parentElement) {
      this.resizeObserver.observe(this.mainCanvas.parentElement);
    }
  }

  ngOnDestroy(): void {
    this.stopEffect();
    this.resizeObserver?.disconnect();
  }

  onPointerDown(event: PointerEvent): void {
    const activeLayer = this.stateService.activeLayer();
    if (!activeLayer || !activeLayer.isVisible) return;
    
    this.mainCanvas.setPointerCapture(event.pointerId);

    if (event.button === 1 || this.stateService.spacebarPressed() || this.stateService.activeTool() === 'pan') {
      this.isPanning.set(true);
      this.lastPanPoint = { x: event.clientX, y: event.clientY };
      return;
    }

    this.isDrawing.set(true);
    const point = this.getCanvasPoint(event);
    this.lastDrawPoint = point;

    const layerCanvas = this.stateService.getLayerCanvas(activeLayer.id);
    if (layerCanvas) {
      this.activeLayerCtx = layerCanvas.getContext('2d');
    }
  }

  onPointerMove(event: PointerEvent): void {
    const currentUiPoint = { x: event.clientX, y: event.clientY };
    this.lastUiPoint.set(currentUiPoint);

    if (this.isPanning() && this.lastPanPoint) {
      const dx = currentUiPoint.x - this.lastPanPoint.x;
      const dy = currentUiPoint.y - this.lastPanPoint.y;
      this.stateService.pan(dx, dy);
      this.lastPanPoint = currentUiPoint;
      return;
    }

    if (!this.isDrawing() || !this.lastDrawPoint || !this.activeLayerCtx) return;

    const currentPoint = this.getCanvasPoint(event);
    
    const tool = this.stateService.activeTool();
    if (tool === 'brush') {
      const brushFn = getBrush(this.stateService.activeBrush());
      brushFn?.(this.activeLayerCtx, this.lastDrawPoint, currentPoint, this.stateService.brushColor(), this.stateService.brushSize());
    } else if (tool === 'eraser') {
      const eraserFn = getEraser(this.stateService.activeEraser().id);
      eraserFn?.(this.activeLayerCtx, this.lastDrawPoint, currentPoint, this.stateService.brushSize());
    }
    
    this.lastDrawPoint = currentPoint;
    // We only need to redraw the main composite canvas when we actually add pixels
    this.redraw();
  }

  onPointerUp(event: PointerEvent): void {
    this.mainCanvas.releasePointerCapture(event.pointerId);
    
    if (this.isPanning()) {
      this.isPanning.set(false);
    }
    
    if (this.isDrawing()) {
        const activeLayer = this.stateService.activeLayer();
        if (activeLayer) {
            this.stateService.updateLayerSnapshot(activeLayer.id);
        }
    }
    
    this.isDrawing.set(false);
    this.activeLayerCtx = null;
    this.lastDrawPoint = null;
    this.lastPanPoint = null;
  }

  onPointerLeave(event: PointerEvent): void {
    this.lastUiPoint.set(null); // Hide cursor
    if (this.isDrawing()) {
      this.onPointerUp(event);
    }
     if (this.isPanning()) {
      this.isPanning.set(false);
      this.lastPanPoint = null;
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = -0.001;
    const amount = event.deltaY * zoomFactor;
    const point = { x: event.clientX, y: event.clientY };
    this.stateService.adjustZoom(amount, point);
  }

  private getCanvasPoint(event: PointerEvent): Point {
    const rect = this.mainCanvas.getBoundingClientRect();
    const zoom = this.stateService.zoomLevel();
    const pan = this.stateService.panOffset();
    const rotation = this.stateService.rotation() * Math.PI / 180;
    const cw = this.stateService.canvasWidth();
    const ch = this.stateService.canvasHeight();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const unpannedX = mouseX - pan.x;
    const unpannedY = mouseY - pan.y;

    const centerX = (cw * zoom) / 2;
    const centerY = (ch * zoom) / 2;
    
    const relativeX = unpannedX - centerX;
    const relativeY = unpannedY - centerY;

    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const unrotatedX = relativeX * cos - relativeY * sin;
    const unrotatedY = relativeX * sin + relativeY * cos;

    const finalX = unrotatedX + centerX;
    const finalY = unrotatedY + centerY;

    return {
      x: finalX / zoom,
      y: finalY / zoom,
      pressure: event.pointerType === 'pen' ? event.pressure : 0.5,
    };
  }

  private redraw(): void {
    if (!this.mainCtx || this.mainCanvas.width === 0) return;

    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.drawLayers(this.mainCtx);
    this.drawUi(this.mainCtx);
  }

  private drawLayers(ctx: CanvasRenderingContext2D): void {
    const cw = this.stateService.canvasWidth();
    const ch = this.stateService.canvasHeight();
    const zoom = this.stateService.zoomLevel();
    const pan = this.stateService.panOffset();
    const rotation = this.stateService.rotation() * Math.PI / 180;

    ctx.save();
    
    ctx.translate(pan.x, pan.y);
    ctx.translate(cw * zoom / 2, ch * zoom / 2);
    ctx.rotate(rotation);
    ctx.translate(-cw * zoom / 2, -ch * zoom / 2);
    ctx.scale(zoom, zoom);
    
    this.drawCheckerboard(ctx);

    if (this.stateService.backgroundColor() !== 'transparent') {
        ctx.fillStyle = this.stateService.backgroundColor();
        ctx.fillRect(0, 0, cw, ch);
    }
    
    [...this.stateService.layers()].reverse().forEach(layer => {
      const layerCanvas = this.stateService.getLayerCanvas(layer.id);
      if (layer.isVisible && layerCanvas) {
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layerCanvas, 0, 0);
      }
    });

    ctx.restore();
  }

  private drawCheckerboard(ctx: CanvasRenderingContext2D): void {
      const cs = 16;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.stateService.canvasWidth(), this.stateService.canvasHeight());
      ctx.fillStyle = '#ccc';
      for (let i = 0; i < this.stateService.canvasWidth() / cs; i++) {
          for (let j = 0; j < this.stateService.canvasHeight() / cs; j++) {
              if ((i + j) % 2 === 0) {
                  ctx.fillRect(i * cs, j * cs, cs, cs);
              }
          }
      }
  }

  private drawUi(ctx: CanvasRenderingContext2D): void {
    this.drawGrid(ctx);
    
    const point = this.lastUiPoint();
    const tool = this.stateService.activeTool();
    const isPanning = this.isPanning() || this.stateService.spacebarPressed();

    // Set hardware cursor style based on the current tool
    if (isPanning || tool === 'pan') {
      this.mainCanvas.style.cursor = 'grab';
    } else if (tool === 'eyedropper') {
      this.mainCanvas.style.cursor = 'crosshair';
    } else if (tool === 'text') {
      this.mainCanvas.style.cursor = 'text';
    } else {
      this.mainCanvas.style.cursor = 'none'; // Hide for drawing tools
    }

    if (point) {
      this.drawCursor(ctx, point);
    }
  }

  private drawCursor(ctx: CanvasRenderingContext2D, point: {x: number, y: number}): void {
    const tool = this.stateService.activeTool();
    const isPanning = this.isPanning() || this.stateService.spacebarPressed();

    // Do not draw a custom cursor for tools that should use the hardware cursor
    if (tool === 'pan' || isPanning || ['eyedropper', 'text'].includes(tool)) {
      return;
    }
    
    const brushSize = this.stateService.brushSize();
    const zoom = this.stateService.zoomLevel();
    const rect = this.mainCanvas.getBoundingClientRect();
    const x = point.x - rect.left;
    const y = point.y - rect.top;

    const radius = Math.max(1, (brushSize / 2) * zoom);

    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    if (!this.stateService.isGridVisible()) return;

    const cw = this.stateService.canvasWidth();
    const ch = this.stateService.canvasHeight();
    const zoom = this.stateService.zoomLevel();
    const pan = this.stateService.panOffset();
    const rotation = this.stateService.rotation() * Math.PI / 180;
    const gridSize = this.stateService.gridSize();
    const gridColor = this.stateService.gridColor();

    ctx.save();
    
    ctx.translate(pan.x, pan.y);
    ctx.translate(cw * zoom / 2, ch * zoom / 2);
    ctx.rotate(rotation);
    ctx.translate(-cw * zoom / 2, -ch * zoom / 2);
    ctx.scale(zoom, zoom);
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / zoom; // Keep grid lines thin
    
    ctx.beginPath();
    for (let x = 0; x <= cw; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
    }
    for (let y = 0; y <= ch; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
    }
    ctx.stroke();
    
    ctx.restore();
  }
}