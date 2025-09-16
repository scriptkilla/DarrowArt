import { Component, ChangeDetectionStrategy, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService, CustomBrush, DEFAULT_CUSTOM_BRUSH_SETTINGS } from '../../services/canvas-state.service';
import { BRUSH_TEXTURES } from '../../assets/brush-textures';

type BrushPreset = Omit<CustomBrush, 'id' | 'name' | 'isCustom'>;
type SectionName = 'shape' | 'scatter' | 'dynamics' | 'taper' | 'stabilization';

const PRESETS: Record<string, BrushPreset> = {
  'Airbrush': {
    shape: { texture: BRUSH_TEXTURES.softRound, spacing: 5, angle: 0, angleJitter: 0.2, roundness: 100 },
    scatter: { scatter: 2, count: 15, countJitter: 0.5 },
    dynamics: { sizeJitter: 0.2, opacityJitter: 0.8, pressureSize: false, pressureOpacity: true },
    taper: { taperStart: 0, taperEnd: 0, taperAmount: 0 },
    stabilization: { stabilizationAmount: 5 },
  },
  'Blade of Grass': {
    shape: { texture: BRUSH_TEXTURES.grassBlade, spacing: 20, angle: 90, angleJitter: 0.3, roundness: 10 },
    scatter: { scatter: 0.5, count: 2, countJitter: 0.5 },
    dynamics: { sizeJitter: 0.4, opacityJitter: 0.2, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 10, taperEnd: 80, taperAmount: 100 },
    stabilization: { stabilizationAmount: 5 },
  },
  'Calligraphy Pen': {
    shape: { texture: BRUSH_TEXTURES.calligraphy, spacing: 15, angle: 45, angleJitter: 0.02, roundness: 20 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.1, opacityJitter: 0, pressureSize: true, pressureOpacity: false },
    taper: { taperStart: 5, taperEnd: 20, taperAmount: 90 },
    stabilization: { stabilizationAmount: 30 },
  },
  'Charcoal': {
    shape: { texture: BRUSH_TEXTURES.charcoal, spacing: 8, angle: 0, angleJitter: 0.5, roundness: 80 },
    scatter: { scatter: 0.5, count: 1, countJitter: 0.2 },
    dynamics: { sizeJitter: 0.3, opacityJitter: 0.4, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 5, taperEnd: 5, taperAmount: 50 },
    stabilization: { stabilizationAmount: 0 },
  },
  'Cloud Painter': {
    shape: { texture: BRUSH_TEXTURES.softRound, spacing: 15, angle: 0, angleJitter: 1, roundness: 100 },
    scatter: { scatter: 1, count: 5, countJitter: 0.5 },
    dynamics: { sizeJitter: 0.5, opacityJitter: 0.7, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 0, taperEnd: 0, taperAmount: 0 },
    stabilization: { stabilizationAmount: 0 },
  },
  'Felt Tip Marker': {
    shape: { texture: BRUSH_TEXTURES.calligraphy, spacing: 10, angle: 90, angleJitter: 0.01, roundness: 50 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.02, opacityJitter: 0.1, pressureSize: false, pressureOpacity: true },
    taper: { taperStart: 5, taperEnd: 5, taperAmount: 100 },
    stabilization: { stabilizationAmount: 25 },
  },
  'Fine Liner': {
    shape: { texture: BRUSH_TEXTURES.hardRound, spacing: 10, angle: 0, angleJitter: 0, roundness: 100 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.05, opacityJitter: 0, pressureSize: true, pressureOpacity: false },
    taper: { taperStart: 25, taperEnd: 25, taperAmount: 100 },
    stabilization: { stabilizationAmount: 20 },
  },
  'Gouache': {
    shape: { texture: BRUSH_TEXTURES.charcoal, spacing: 12, angle: 0, angleJitter: 0.1, roundness: 90 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.1, opacityJitter: 0.1, pressureSize: true, pressureOpacity: false },
    taper: { taperStart: 0, taperEnd: 10, taperAmount: 40 },
    stabilization: { stabilizationAmount: 5 },
  },
  'Hatching': {
    shape: { texture: BRUSH_TEXTURES.calligraphy, spacing: 40, angle: 30, angleJitter: 0.05, roundness: 10 },
    scatter: { scatter: 0.1, count: 1, countJitter: 0.1 },
    dynamics: { sizeJitter: 0.1, opacityJitter: 0.1, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 10, taperEnd: 10, taperAmount: 100 },
    stabilization: { stabilizationAmount: 15 },
  },
  'Ink Splatter': {
    shape: { texture: BRUSH_TEXTURES.splatter, spacing: 75, angle: 0, angleJitter: 1, roundness: 60 },
    scatter: { scatter: 4, count: 5, countJitter: 1 },
    dynamics: { sizeJitter: 0.8, opacityJitter: 0.2, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 0, taperEnd: 0, taperAmount: 0 },
    stabilization: { stabilizationAmount: 0 },
  },
  'Oil Paint': {
    shape: { texture: BRUSH_TEXTURES.charcoal, spacing: 8, angle: 0, angleJitter: 0.2, roundness: 75 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.15, opacityJitter: 0.05, pressureSize: true, pressureOpacity: false },
    taper: { taperStart: 0, taperEnd: 5, taperAmount: 20 },
    stabilization: { stabilizationAmount: 0 },
  },
  'Pencil Sketch': {
    shape: { texture: BRUSH_TEXTURES.charcoal, spacing: 5, angle: 25, angleJitter: 0.1, roundness: 70 },
    scatter: { scatter: 0, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.1, opacityJitter: 0.2, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 30, taperEnd: 30, taperAmount: 100 },
    stabilization: { stabilizationAmount: 15 },
  },
  'Starfield': {
    shape: { texture: BRUSH_TEXTURES.softRound, spacing: 200, angle: 0, angleJitter: 1, roundness: 100 },
    scatter: { scatter: 5, count: 10, countJitter: 1 },
    dynamics: { sizeJitter: 0.9, opacityJitter: 0.5, pressureSize: false, pressureOpacity: false },
    taper: { taperStart: 0, taperEnd: 0, taperAmount: 0 },
    stabilization: { stabilizationAmount: 0 },
  },
  'Stipple Dots': {
    shape: { texture: BRUSH_TEXTURES.hardRound, spacing: 150, angle: 0, angleJitter: 0, roundness: 100 },
    scatter: { scatter: 3, count: 1, countJitter: 0 },
    dynamics: { sizeJitter: 0.5, opacityJitter: 0.1, pressureSize: true, pressureOpacity: false },
    taper: { taperStart: 0, taperEnd: 0, taperAmount: 0 },
    stabilization: { stabilizationAmount: 0 },
  },
  'Watercolor': {
    shape: { texture: BRUSH_TEXTURES.softRound, spacing: 10, angle: 0, angleJitter: 0.3, roundness: 100 },
    scatter: { scatter: 0.2, count: 2, countJitter: 0.5 },
    dynamics: { sizeJitter: 0.4, opacityJitter: 0.6, pressureSize: true, pressureOpacity: true },
    taper: { taperStart: 10, taperEnd: 30, taperAmount: 80 },
    stabilization: { stabilizationAmount: 10 },
  },
};

@Component({
  selector: 'app-brush-studio-modal',
  templateUrl: './brush-studio-modal.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrushStudioModalComponent implements AfterViewInit, OnDestroy {
  stateService = inject(CanvasStateService);
  
  // Use a signal for the local, editable copy of the brush state
  brush = signal<CustomBrush | null>(null);
  presets = Object.keys(PRESETS);

  expandedSections = signal<Record<SectionName, boolean>>({
    shape: true,
    scatter: true,
    dynamics: true,
    taper: true,
    stabilization: true,
  });

  @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('texturePreviewCanvas') texturePreviewCanvasRef!: ElementRef<HTMLCanvasElement>;
  private previewCtx!: CanvasRenderingContext2D;
  private texturePreviewCtx!: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private previewTexture: HTMLImageElement | null = null;
  private whitePreviewTexture: HTMLCanvasElement | null = null;

  constructor() {
    effect(() => {
      const editingBrush = this.stateService.editingBrush();
      if (editingBrush) {
        // Deep copy the service state into our local signal
        this.brush.set(JSON.parse(JSON.stringify(editingBrush)));
        
        const currentBrush = this.brush();
        if (currentBrush?.shape.texture) {
          this.previewTexture = new Image();
          this.previewTexture.src = currentBrush.shape.texture;
          this.previewTexture.onload = () => {
            this.createWhitePreviewTexture();
            this.redrawAllPreviews();
          };
        } else {
          this.previewTexture = null;
          this.whitePreviewTexture = null;
          this.redrawAllPreviews();
        }
      } else {
        this.brush.set(null);
        this.previewTexture = null;
        this.whitePreviewTexture = null;
        this.redrawAllPreviews();
      }
    });
  }

  ngAfterViewInit(): void {
    this.previewCtx = this.previewCanvasRef.nativeElement.getContext('2d')!;
    this.texturePreviewCtx = this.texturePreviewCanvasRef.nativeElement.getContext('2d')!;
    this.redrawAllPreviews();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
  
  toggleSection(section: SectionName) {
    this.expandedSections.update(sections => ({
      ...sections,
      [section]: !sections[section],
    }));
  }

  updateBrushProperty(category: 'shape' | 'scatter' | 'dynamics' | 'taper' | 'stabilization', key: string, value: string | number | boolean) {
    this.brush.update(b => {
      if (!b) return null;
      
      let processedValue = value;
      if (typeof value !== 'boolean') {
        processedValue = Number(value);
      }

      return {
        ...b,
        [category]: {
          ...(b[category] as any),
          [key]: processedValue,
        },
      };
    });
    this.redrawAllPreviews();
  }

  updateBrushName(name: string) {
    this.brush.update(b => (b ? { ...b, name } : null));
  }

  handleTextureImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const newTexture = e.target.result;
          this.brush.update(b => {
            if (!b) return null;
            return {
              ...b,
              shape: {
                ...b.shape,
                texture: newTexture,
              },
            };
          });

          this.previewTexture = new Image();
          this.previewTexture.src = newTexture;
          this.previewTexture.onload = () => {
            this.createWhitePreviewTexture();
            this.redrawAllPreviews();
          };
        }
      };
      reader.readAsDataURL(file);
    }
  }

  saveBrush() {
    const currentBrush = this.brush();
    if (currentBrush) {
      if (!currentBrush.shape.texture) {
        alert('Please import a brush texture before saving.');
        return;
      }
      this.stateService.saveCustomBrush(currentBrush);
    }
  }

  deleteBrush() {
    const currentBrush = this.brush();
    if (currentBrush) {
      if (confirm(`Are you sure you want to delete "${currentBrush.name}"?`)) {
        this.stateService.deleteCustomBrush(currentBrush.id);
        this.stateService.closeBrushStudio();
      }
    }
  }

  applyPreset(presetName: string) {
    const preset = PRESETS[presetName];
    if (!preset) return;

    this.brush.update(b => {
      if (!b) return null;
      return {
        ...b,
        name: presetName,
        shape: { ...preset.shape },
        scatter: { ...preset.scatter },
        dynamics: { ...preset.dynamics },
        taper: { ...preset.taper },
        stabilization: { ...preset.stabilization },
      };
    });

    const currentBrush = this.brush();
    if (currentBrush?.shape.texture) {
        this.previewTexture = new Image();
        this.previewTexture.src = currentBrush.shape.texture;
        this.previewTexture.onload = () => {
            this.createWhitePreviewTexture();
            this.redrawAllPreviews();
        };
    } else {
        this.previewTexture = null;
        this.whitePreviewTexture = null;
        this.redrawAllPreviews();
    }
  }

  resetToDefault() {
    this.brush.update(b => {
      if (!b) return null;
      const { texture, ...restShape } = DEFAULT_CUSTOM_BRUSH_SETTINGS.shape;
      return {
        ...b,
        shape: { ...b.shape, ...restShape },
        scatter: { ...DEFAULT_CUSTOM_BRUSH_SETTINGS.scatter },
        dynamics: { ...DEFAULT_CUSTOM_BRUSH_SETTINGS.dynamics },
        taper: { ...DEFAULT_CUSTOM_BRUSH_SETTINGS.taper },
        stabilization: { ...DEFAULT_CUSTOM_BRUSH_SETTINGS.stabilization },
      };
    });
    
    this.redrawAllPreviews();
  }

  private redrawAllPreviews() {
    if (this.previewCtx) {
      this.drawPreview();
    }
    if (this.texturePreviewCtx) {
      this.drawTextureThumbnail();
    }
  }
  
  private drawTextureThumbnail() {
    if (!this.texturePreviewCtx) return;

    const canvas = this.texturePreviewCtx.canvas;
    const currentBrush = this.brush();
    this.texturePreviewCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentBrush || !this.previewTexture || !this.previewTexture.complete || this.previewTexture.width === 0) {
      this.texturePreviewCtx.fillStyle = '#9ca3af';
      this.texturePreviewCtx.font = 'bold 10px sans-serif';
      this.texturePreviewCtx.textAlign = 'center';
      this.texturePreviewCtx.textBaseline = 'middle';
      this.texturePreviewCtx.fillText('None', canvas.width / 2, canvas.height / 2);
      return;
    }

    const padding = canvas.width * 0.1;
    const baseSize = canvas.width - padding * 2;
    
    const coloredTexture = document.createElement('canvas');
    const coloredCtx = coloredTexture.getContext('2d')!;
    coloredTexture.width = this.previewTexture.width;
    coloredTexture.height = this.previewTexture.height;
    coloredCtx.fillStyle = '#FFFFFF'; 
    coloredCtx.fillRect(0, 0, coloredTexture.width, coloredTexture.height);
    coloredCtx.globalCompositeOperation = 'destination-in';
    coloredCtx.drawImage(this.previewTexture, 0, 0);

    const dabWidth = baseSize;
    const dabHeight = baseSize * (currentBrush.shape.roundness / 100);
    const dabAngle = currentBrush.shape.angle * Math.PI / 180;

    this.texturePreviewCtx.save();
    this.texturePreviewCtx.translate(canvas.width / 2, canvas.height / 2);
    this.texturePreviewCtx.rotate(dabAngle);
    
    this.texturePreviewCtx.drawImage(coloredTexture, -dabWidth / 2, -dabHeight / 2, dabWidth, dabHeight);

    this.texturePreviewCtx.restore();
  }

  private createWhitePreviewTexture() {
    if (!this.previewTexture || !this.previewTexture.complete || this.previewTexture.width === 0) {
      this.whitePreviewTexture = null;
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = this.previewTexture.width;
    canvas.height = this.previewTexture.height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.previewTexture, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.whitePreviewTexture = canvas;
  }

  drawPreview() {
    const currentBrush = this.brush();
    if (!this.previewCtx || !currentBrush) return;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const canvas = this.previewCtx.canvas;
    this.previewCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.whitePreviewTexture) return;

    let frame = 0;
    const duration = 250;
    const y = (t: number) => canvas.height / 2 + Math.sin(t * 0.1) * 30;
    const distanceBetween = (p1: {x:number, y:number}, p2: {x:number, y:number}) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const angleBetween = (p1: {x:number, y:number}, p2: {x:number, y:number}) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

    let lastPoint = { x: 30, y: y(0) };
    const previewBrushSize = 30;
    const spacing = Math.max(1, (previewBrushSize * currentBrush.shape.spacing) / 100);
    
    let distanceToNextDab = spacing;

    const animate = () => {
      if (frame >= duration) {
        this.animationFrameId = null;
        return;
      }
      const brushNow = this.brush();
      if (!brushNow) { 
          this.animationFrameId = null;
          return;
      }

      const currentPoint = { x: 30 + frame, y: y(frame) };
      const segmentDist = distanceBetween(lastPoint, currentPoint);

      if (segmentDist > 0) {
        const angle = angleBetween(lastPoint, currentPoint);
        let distanceTraveledInSegment = 0;
        
        while (distanceTraveledInSegment < segmentDist) {
          const remainingSegmentDist = segmentDist - distanceTraveledInSegment;
          
          if (distanceToNextDab <= remainingSegmentDist) {
            distanceTraveledInSegment += distanceToNextDab;
            
            const dabX = lastPoint.x + Math.cos(angle) * distanceTraveledInSegment;
            const dabY = lastPoint.y + Math.sin(angle) * distanceTraveledInSegment;
            
            const pressure = 0.5 + Math.sin(frame * 0.05) * 0.5;
            this.drawDabPreview(dabX, dabY, brushNow, pressure);
            
            distanceToNextDab = spacing;
          } else {
            distanceToNextDab -= remainingSegmentDist;
            distanceTraveledInSegment = segmentDist;
          }
        }
      }
      
      lastPoint = currentPoint;
      frame++;
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.drawDabPreview(lastPoint.x, lastPoint.y, currentBrush, 0.5);
    animate();
  }


  private drawDabPreview(x: number, y: number, brush: CustomBrush, pressure: number) {
    if (!this.whitePreviewTexture) return;

    let baseSize = 30;

    if (brush.dynamics.pressureSize) {
        baseSize *= Math.max(0.05, pressure);
    }

    const dabCount = Math.round(brush.scatter.count + brush.scatter.count * brush.scatter.countJitter * (Math.random() - 0.5));
    
    for (let i = 0; i < dabCount; i++) {
      const jitter = (val: number) => 1 + val * (Math.random() - 0.5) * 2;
      
      const dabSize = baseSize * jitter(brush.dynamics.sizeJitter);
      const dabWidth = dabSize;
      const dabHeight = dabSize * (brush.shape.roundness / 100);
      let dabOpacity = jitter(brush.dynamics.opacityJitter);
      
      if (brush.dynamics.pressureOpacity) {
        dabOpacity *= Math.max(0.05, pressure);
      }

      const scatterDist = brush.scatter.scatter * baseSize * Math.random();
      const scatterAngle = Math.random() * 2 * Math.PI;
      const dabX = x + Math.cos(scatterAngle) * scatterDist;
      const dabY = y + Math.sin(scatterAngle) * scatterDist;
      
      const dabAngle = (brush.shape.angle * Math.PI / 180) + (brush.shape.angleJitter * Math.PI * (Math.random() - 0.5) * 2);

      this.previewCtx.save();
      this.previewCtx.translate(dabX, dabY);
      this.previewCtx.rotate(dabAngle);
      this.previewCtx.globalAlpha = dabOpacity;
      this.previewCtx.drawImage(this.whitePreviewTexture, -dabWidth / 2, -dabHeight / 2, dabWidth, dabHeight);
      this.previewCtx.restore();
    }
  }
}
