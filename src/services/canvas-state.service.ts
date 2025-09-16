import { Injectable, signal, computed, effect, WritableSignal } from '@angular/core';
import { BRUSH_TEXTURES } from '../assets/brush-textures';

// #region TYPE DEFINITIONS

export type Tool = 'brush' | 'eraser' | 'pan' | 'zoom' | 'eyedropper' | 'selection' | 'text' | 'smudge';
export type BrushType = 'round' | 'calligraphy' | 'charcoal' | 'spray';
export type EraserType = 'hard' | 'soft';
export type SymmetryMode = 'none' | 'vertical' | 'horizontal' | 'radial';
export type Anchor = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface SubTool<T> {
  id: T;
  name: string;
}

export interface Layer {
  id: number;
  name: string;
  isVisible: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  styles: LayerStyles;
}

// --- Layer Style Types ---
export interface DropShadowStyle { enabled: boolean; color: string; opacity: number; blur: number; offsetX: number; offsetY: number; }
export interface InnerGlowStyle { enabled: boolean; color: string; opacity: number; blur: number; }
export interface OuterGlowStyle { enabled: boolean; color: string; opacity: number; blur: number; }
export interface StrokeStyle { enabled: boolean; color: string; size: number; opacity: number; position: 'outside' | 'inside' | 'center'; }
export interface ColorOverlayStyle { enabled: boolean; color: string; opacity: number; blendMode: GlobalCompositeOperation; }
export interface GradientOverlayStyle { enabled: boolean; startColor: string; endColor: string; angle: number; opacity: number; style: 'linear' | 'radial'; }
export interface BevelAndEmbossStyle { enabled: boolean; depth: number; blur: number; angle: number; }
export interface SatinStyle { enabled: boolean; color: string; opacity: number; angle: number; distance: number; size: number; }

export interface LayerStyles {
  dropShadow: DropShadowStyle;
  innerGlow: InnerGlowStyle;
  outerGlow: OuterGlowStyle;
  stroke: StrokeStyle;
  colorOverlay: ColorOverlayStyle;
  gradientOverlay: GradientOverlayStyle;
  bevelAndEmboss: BevelAndEmbossStyle;
  satin: SatinStyle;
}

// --- Brush Types ---
export interface BaseBrush {
  id: string;
  name: string;
  shape: { texture: string; spacing: number; angle: number; angleJitter: number; roundness: number; };
  scatter: { scatter: number; count: number; countJitter: number; };
  dynamics: { sizeJitter: number; opacityJitter: number; pressureSize: boolean; pressureOpacity: boolean; };
}

export interface CustomBrush extends BaseBrush {
  isCustom: true;
  taper: { taperStart: number; taperEnd: number; taperAmount: number; };
  stabilization: { stabilizationAmount: number; };
}

// #endregion

// #region DEFAULTS

export const DEFAULT_LAYER_STYLES: LayerStyles = {
    dropShadow: { enabled: false, color: '#000000', opacity: 0.75, blur: 5, offsetX: 5, offsetY: 5 },
    innerGlow: { enabled: false, color: '#ffffff', opacity: 0.75, blur: 5 },
    outerGlow: { enabled: false, color: '#ffffff', opacity: 0.75, blur: 5 },
    stroke: { enabled: false, color: '#000000', size: 3, opacity: 1, position: 'outside' },
    colorOverlay: { enabled: false, color: '#ff0000', opacity: 0.5, blendMode: 'normal' as any },
    gradientOverlay: { enabled: false, startColor: '#000000', endColor: '#ffffff', angle: 90, opacity: 1, style: 'linear' },
    bevelAndEmboss: { enabled: false, depth: 50, blur: 5, angle: 120 },
    satin: { enabled: false, color: '#000000', opacity: 0.5, angle: 19, distance: 11, size: 14 },
};

export const DEFAULT_CUSTOM_BRUSH_SETTINGS: Omit<CustomBrush, 'id' | 'name' | 'isCustom'> = {
  shape: { texture: BRUSH_TEXTURES.hardRound, spacing: 25, angle: 0, angleJitter: 0, roundness: 100 },
  scatter: { scatter: 0, count: 1, countJitter: 0 },
  dynamics: { sizeJitter: 0, opacityJitter: 0, pressureSize: true, pressureOpacity: false },
  taper: { taperStart: 0, taperEnd: 0, taperAmount: 0 },
  stabilization: { stabilizationAmount: 10 },
};

const DEFAULT_BRUSHES: Record<BrushType, BaseBrush> = {
  round: {
    id: 'round',
    name: 'Round',
    shape: { texture: BRUSH_TEXTURES.hardRound, spacing: 10, angle: 0, angleJitter: 0, roundness: 100 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0, opacityJitter: 0, pressureSize: true, pressureOpacity: true },
  },
  calligraphy: {
    id: 'calligraphy',
    name: 'Calligraphy',
    shape: { texture: BRUSH_TEXTURES.calligraphy, spacing: 15, angle: 45, angleJitter: 0.02, roundness: 20 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.1, opacityJitter: 0, pressureSize: true, pressureOpacity: false },
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    shape: { texture: BRUSH_TEXTURES.charcoal, spacing: 8, angle: 0, angleJitter: 0.5, roundness: 80 },
    scatter: { scatter: 0.5, count: 1, countJitter: 0.2 },
    dynamics: { sizeJitter: 0.3, opacityJitter: 0.4, pressureSize: true, pressureOpacity: true },
  },
  spray: {
    id: 'spray',
    name: 'Spray Paint',
    shape: { texture: BRUSH_TEXTURES.softRound, spacing: 10, angle: 0, angleJitter: 1, roundness: 100 },
    scatter: { scatter: 2, count: 15, countJitter: 0.5 },
    dynamics: { sizeJitter: 0.5, opacityJitter: 0.8, pressureSize: false, pressureOpacity: true },
  }
};

const DEFAULT_ERASERS: SubTool<EraserType>[] = [
  { id: 'hard', name: 'Hard Eraser' },
  { id: 'soft', name: 'Soft Eraser' },
];

// #endregion

@Injectable({
  providedIn: 'root',
})
export class CanvasStateService {
  // --- Canvas Properties ---
  canvasWidth = signal(0);
  canvasHeight = signal(0);
  backgroundColor = signal('#ffffff');
  zoomLevel = signal(1);
  panOffset = signal({ x: 0, y: 0 });
  rotation = signal(0);
  canvasContainerWidth = signal(0);
  canvasContainerHeight = signal(0);
  private mainCanvas: HTMLCanvasElement | null = null;
  private mainCtx: CanvasRenderingContext2D | null = null;
  
  // --- Tool State ---
  activeTool = signal<Tool>('brush');
  brushColor = signal('#000000');
  brushSize = signal(20);
  smudgeStrength = signal(50);
  fontFamily = signal('Arial');
  fontSize = signal(16);
  spacebarPressed = signal(false);

  // --- SubTool State ---
  activeBrushId = signal<BrushType | string>('round');
  activeEraserId = signal<EraserType>('hard');
  
  // --- Guides & Symmetry ---
  isGridVisible = signal(false);
  gridSize = signal(50);
  gridColor = signal('#cccccc');
  symmetryMode = signal<SymmetryMode>('none');
  radialSegments = signal(6);
  isQuickShapeEnabled = signal(false);

  // --- Layer State ---
  layers: WritableSignal<Layer[]> = signal<Layer[]>([]);
  activeLayerId = signal<number | null>(null);
  private nextLayerId = 1;
  private layerCanvases = new Map<number, HTMLCanvasElement>();
  private layerHistory = new Map<number, ImageData[]>();
  private layerHistoryIndex = new Map<number, number>();

  activeLayer = computed(() => this.layers().find(l => l.id === this.activeLayerId()) ?? null);
  
  // --- Modal State ---
  isNewCanvasModalVisible = signal(false);
  isResizeCanvasModalVisible = signal(false);
  isLayerStylesModalVisible = signal(false);
  isBrushStudioVisible = signal(false);
  isGenerateImageModalVisible = signal(false);
  editingStylesForLayerId = signal<number | null>(null);
  isLayersPanelVisible = signal(true);
  
  // --- Brush Studio ---
  editingBrush = signal<CustomBrush | null>(null);
  customBrushes = signal<CustomBrush[]>([]);
  
  // --- Computed Full Brush State ---
  brushes = computed(() => [...Object.values(DEFAULT_BRUSHES), ...this.customBrushes()]);
  erasers = signal(DEFAULT_ERASERS);
  
  activeBrush = computed<BaseBrush | CustomBrush | null>(() => {
    const id = this.activeBrushId();
    const custom = this.customBrushes().find(b => b.id === id);
    if (custom) return custom;
    return (DEFAULT_BRUSHES as Record<string, BaseBrush>)[id] ?? DEFAULT_BRUSHES.round;
  });

  activeEraser = computed(() => {
      return this.erasers().find(e => e.id === this.activeEraserId()) ?? DEFAULT_ERASERS[0];
  });
  
  constructor() {
    effect(() => {
        this.canvasWidth();
        this.canvasHeight();
        // This effect will run when canvas dimensions change.
        // We can trigger redraws or updates here if needed.
    });
  }

  // #region Canvas Initialization & Sizing
  
  canvasInitialized(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.mainCanvas = canvas;
    this.mainCtx = ctx;
  }

  setCanvasContainerSize(width: number, height: number) {
    this.canvasContainerWidth.set(width);
    this.canvasContainerHeight.set(height);
    if (this.mainCanvas) {
        this.mainCanvas.width = width;
        this.mainCanvas.height = height;
    }
  }

  initializeCanvasToScreenSize() {
    const mainContent = document.querySelector('main > div.flex-grow');
    if (mainContent) {
      const w = mainContent.clientWidth;
      const h = mainContent.clientHeight;
      this.createNewCanvas(w, h, '#ffffff');
    } else {
      this.createNewCanvas(1024, 768, '#ffffff');
    }
  }

  createNewCanvas(width: number, height: number, bgColor: string) {
    this.canvasWidth.set(width);
    this.canvasHeight.set(height);
    this.backgroundColor.set(bgColor);
    this.resetLayers();
    this.addNewLayer('Background');
    this.zoomToFit();
    this.isNewCanvasModalVisible.set(false);
  }

  resizeCanvas(width: number, height: number, anchor: Anchor) {
    // This would be a complex operation involving resampling all layer canvases.
    // For now, we'll just update the dimensions and clear.
    console.log('Resizing canvas to', width, height, 'with anchor', anchor);
    this.canvasWidth.set(width);
    this.canvasHeight.set(height);
    this.layerCanvases.forEach((canvas, id) => {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = width;
        newCanvas.height = height;
        const newCtx = newCanvas.getContext('2d')!;
        // Implement anchor logic to draw old canvas onto new one
        newCtx.drawImage(canvas, 0, 0); // Simplified version
        this.layerCanvases.set(id, newCanvas);
    });
    this.isResizeCanvasModalVisible.set(false);
  }

  // #endregion

  // #region Viewport (Pan & Zoom & Rotate)

  adjustZoom(amount: number, pivot: { x: number; y: number }) {
    const oldZoom = this.zoomLevel();
    const newZoom = Math.max(0.1, Math.min(16, oldZoom + amount));
    this.zoomLevel.set(newZoom);

    const pan = this.panOffset();
    const newPanX = pivot.x - ((pivot.x - pan.x) / oldZoom) * newZoom;
    const newPanY = pivot.y - ((pivot.y - pan.y) / oldZoom) * newZoom;
    this.panOffset.set({ x: newPanX, y: newPanY });
  }

  pan(dx: number, dy: number) {
    this.panOffset.update(p => ({ x: p.x + dx, y: p.y + dy }));
  }

  setRotation(angle: number) {
    this.rotation.set(angle);
  }

  resetView() {
    this.zoomToFit();
    this.setRotation(0);
  }

  zoomToFit() {
    const containerW = this.canvasContainerWidth();
    const containerH = this.canvasContainerHeight();
    const canvasW = this.canvasWidth();
    const canvasH = this.canvasHeight();

    if (containerW === 0 || containerH === 0 || canvasW === 0 || canvasH === 0) return;

    const scaleX = containerW / canvasW;
    const scaleY = containerH / canvasH;
    const newZoom = Math.min(scaleX, scaleY) * 0.95; // 95% to have some padding
    this.zoomLevel.set(newZoom);

    const newX = (containerW - canvasW * newZoom) / 2;
    const newY = (containerH - canvasH * newZoom) / 2;
    this.panOffset.set({ x: newX, y: newY });
  }

  // #endregion

  // #region Tool Setters

  setTool = (tool: Tool) => this.activeTool.set(tool);
  setBrush = (brushId: BrushType | string) => this.activeBrushId.set(brushId);
  setEraser = (eraserId: EraserType) => this.activeEraserId.set(eraserId);
  setColor = (color: string) => this.brushColor.set(color);
  setBackgroundColor = (color: string) => this.backgroundColor.set(color);
  setBrushSize = (size: string) => this.brushSize.set(Number(size));
  setSmudgeStrength = (strength: string) => this.smudgeStrength.set(Number(strength));
  setFontSize = (size: string) => this.fontSize.set(Number(size));
  setFontFamily = (family: string) => this.fontFamily.set(family);
  setSymmetryMode = (mode: SymmetryMode) => this.symmetryMode.set(mode);
  setRadialSegments = (segments: string) => this.radialSegments.set(Number(segments));
  setGridSize = (size: string) => this.gridSize.set(Number(size));
  setGridColor = (color: string) => this.gridColor.set(color);
  toggleGridVisibility = () => this.isGridVisible.update(v => !v);

  // #endregion

  // #region Layer Management

  private resetLayers() {
    this.layerCanvases.clear();
    this.layerHistory.clear();
    this.layerHistoryIndex.clear();
    this.layers.set([]);
    this.nextLayerId = 1;
  }
  
  addNewLayer(name?: string) {
    const newLayer: Layer = {
      id: this.nextLayerId++,
      name: name || `Layer ${this.layers().length + 1}`,
      isVisible: true,
      opacity: 1,
      blendMode: 'source-over',
      styles: JSON.parse(JSON.stringify(DEFAULT_LAYER_STYLES)),
    };
    const newCanvas = document.createElement('canvas');
    newCanvas.width = this.canvasWidth();
    newCanvas.height = this.canvasHeight();
    this.layerCanvases.set(newLayer.id, newCanvas);
    this.layers.update(layers => [newLayer, ...layers]);
    this.activeLayerId.set(newLayer.id);
    this.saveStateForLayer(newLayer.id);
  }

  renameLayer = (id: number, newName: string) => this.layers.update(layers => layers.map(l => l.id === id ? { ...l, name: newName } : l));
  setLayerOpacity = (id: number, opacity: number) => this.layers.update(layers => layers.map(l => l.id === id ? { ...l, opacity } : l));
  setLayerVisibility = (id: number, isVisible: boolean) => this.layers.update(layers => layers.map(l => l.id === id ? { ...l, isVisible } : l));
  setLayerBlendMode = (id: number, mode: GlobalCompositeOperation) => this.layers.update(layers => layers.map(l => l.id === id ? { ...l, blendMode: mode } : l));
  updateLayerStyles = (id: number, styles: LayerStyles) => this.layers.update(layers => layers.map(l => l.id === id ? { ...l, styles } : l));
  
  selectLayer = (id: number) => this.activeLayerId.set(id);

  deleteLayer(id: number) {
    if (this.layers().length <= 1) return; // Cannot delete the last layer
    
    this.layers.update(layers => {
      const index = layers.findIndex(l => l.id === id);
      if (index === -1) return layers;

      const newLayers = layers.filter(l => l.id !== id);
      
      // Select another layer if the active one was deleted
      if (this.activeLayerId() === id) {
        if (newLayers[index]) {
          this.activeLayerId.set(newLayers[index].id);
        } else if (newLayers[index - 1]) {
          this.activeLayerId.set(newLayers[index-1].id);
        } else if (newLayers.length > 0) {
          this.activeLayerId.set(newLayers[0].id);
        } else {
          this.activeLayerId.set(null);
        }
      }
      return newLayers;
    });

    this.layerCanvases.delete(id);
    this.layerHistory.delete(id);
    this.layerHistoryIndex.delete(id);
  }

  moveLayerUp(id: number) {
    this.layers.update(layers => {
      const index = layers.findIndex(l => l.id === id);
      if (index > 0) {
        const newLayers = [...layers];
        [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
        return newLayers;
      }
      return layers;
    });
  }

  moveLayerDown(id: number) {
    this.layers.update(layers => {
      const index = layers.findIndex(l => l.id === id);
      if (index < layers.length - 1 && index !== -1) {
        const newLayers = [...layers];
        [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
        return newLayers;
      }
      return layers;
    });
  }

  getLayerCanvas = (id: number): HTMLCanvasElement | undefined => this.layerCanvases.get(id);

  importImageAsLayer(dataUrl: string, name: string) {
    const img = new Image();
    img.onload = () => {
      this.addNewLayer(name);
      const activeLayer = this.activeLayer();
      if (activeLayer) {
        const canvas = this.getLayerCanvas(activeLayer.id);
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          this.saveStateForLayer(activeLayer.id);
        }
      }
    };
    img.src = dataUrl;
  }

  triggerClear() {
    if (!confirm('Are you sure you want to clear the active layer? This cannot be undone.')) return;
    const activeId = this.activeLayerId();
    if (activeId) {
      const canvas = this.getLayerCanvas(activeId);
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.saveStateForLayer(activeId);
      }
    }
  }

  // #endregion

  // #region History (Undo/Redo)

  updateLayerSnapshot(id: number) {
    this.saveStateForLayer(id);
  }

  private saveStateForLayer(layerId: number) {
    const canvas = this.getLayerCanvas(layerId);
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const history = this.layerHistory.get(layerId) || [];
    let index = this.layerHistoryIndex.get(layerId) ?? -1;

    // If we have undone, new action clears the "redo" stack
    if (index < history.length - 1) {
      history.splice(index + 1);
    }
    
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    
    // Limit history size
    if (history.length > 30) {
      history.shift();
    }
    
    index = history.length - 1;
    this.layerHistory.set(layerId, history);
    this.layerHistoryIndex.set(layerId, index);
  }

  triggerUndo() {
    const layerId = this.activeLayerId();
    if (layerId === null) return;

    let index = this.layerHistoryIndex.get(layerId) ?? -1;
    const history = this.layerHistory.get(layerId) || [];

    if (index > 0) {
      index--;
      const canvas = this.getLayerCanvas(layerId);
      const ctx = canvas?.getContext('2d');
      const imageData = history[index];
      if (ctx && imageData) {
        ctx.putImageData(imageData, 0, 0);
        this.layerHistoryIndex.set(layerId, index);
      }
    }
  }

  triggerRedo() {
    const layerId = this.activeLayerId();
    if (layerId === null) return;
    
    let index = this.layerHistoryIndex.get(layerId) ?? -1;
    const history = this.layerHistory.get(layerId) || [];

    if (index < history.length - 1) {
      index++;
      const canvas = this.getLayerCanvas(layerId);
      const ctx = canvas?.getContext('2d');
      const imageData = history[index];
      if (ctx && imageData) {
        ctx.putImageData(imageData, 0, 0);
        this.layerHistoryIndex.set(layerId, index);
      }
    }
  }

  // #endregion

  // #region Modal Management

  showNewCanvas = () => this.isNewCanvasModalVisible.set(true);
  hideNewCanvasModal = () => this.isNewCanvasModalVisible.set(false);
  
  showResizeCanvas = () => this.isResizeCanvasModalVisible.set(true);
  hideResizeCanvasModal = () => this.isResizeCanvasModalVisible.set(false);

  showGenerateImage = () => this.isGenerateImageModalVisible.set(true);
  hideGenerateImageModal = () => this.isGenerateImageModalVisible.set(false);

  toggleLayersPanel = () => this.isLayersPanelVisible.update(v => !v);

  editLayerStyles = (layerId: number) => {
    this.editingStylesForLayerId.set(layerId);
    this.isLayerStylesModalVisible.set(true);
  };
  closeLayerStylesModal = () => this.isLayerStylesModalVisible.set(false);

  openBrushStudio(brushId?: string) {
    if (brushId) {
      const brush = this.customBrushes().find(b => b.id === brushId);
      if (brush) this.editingBrush.set(brush);
    } else {
      this.editingBrush.set({
        id: `custom-${Date.now()}`,
        name: 'New Brush',
        isCustom: true,
        ...JSON.parse(JSON.stringify(DEFAULT_CUSTOM_BRUSH_SETTINGS))
      });
    }
    this.isBrushStudioVisible.set(true);
  }
  closeBrushStudio = () => {
    this.editingBrush.set(null);
    this.isBrushStudioVisible.set(false);
  };

  // #endregion

  // #region Custom Brushes

  saveCustomBrush(brush: CustomBrush) {
    this.customBrushes.update(brushes => {
      const index = brushes.findIndex(b => b.id === brush.id);
      if (index > -1) {
        const newBrushes = [...brushes];
        newBrushes[index] = brush;
        return newBrushes;
      }
      return [...brushes, brush];
    });
    this.closeBrushStudio();
  }

  duplicateCustomBrush(brush: CustomBrush) {
    const newBrush = {
      ...JSON.parse(JSON.stringify(brush)),
      id: `custom-${Date.now()}`,
      name: `${brush.name} Copy`,
    };
    this.customBrushes.update(b => [...b, newBrush]);
  }

  deleteCustomBrush(brushId: string) {
    this.customBrushes.update(b => b.filter(brush => brush.id !== brushId));
    if (this.activeBrushId() === brushId) {
      this.activeBrushId.set('round'); // Fallback to default
    }
  }

  // #endregion

  // #region Actions
  
  triggerDownload() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvasWidth();
    tempCanvas.height = this.canvasHeight();
    const tempCtx = tempCanvas.getContext('2d')!;

    // Draw background
    tempCtx.fillStyle = this.backgroundColor();
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Composite layers in reverse order (bottom to top)
    [...this.layers()].reverse().forEach(layer => {
      const layerCanvas = this.getLayerCanvas(layer.id);
      if (layer.isVisible && layerCanvas) {
        tempCtx.globalAlpha = layer.opacity;
        tempCtx.globalCompositeOperation = layer.blendMode;
        // TODO: Apply layer styles here before drawing
        tempCtx.drawImage(layerCanvas, 0, 0);
      }
    });

    const link = document.createElement('a');
    link.download = 'DarrowArt_creation.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }
  
  // #endregion
}