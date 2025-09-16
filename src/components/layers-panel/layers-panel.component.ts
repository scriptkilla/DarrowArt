import { Component, ChangeDetectionStrategy, inject, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService, Layer } from '../../services/canvas-state.service';

@Component({
  selector: 'app-layers-panel',
  templateUrl: './layers-panel.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayersPanelComponent {
  stateService = inject(CanvasStateService);
  private elementRef = inject(ElementRef);
  editingLayerId = signal<number | null>(null);

  blendModes: { value: GlobalCompositeOperation; name: string }[] = [
      { value: 'source-over', name: 'Normal' },
      { value: 'multiply', name: 'Multiply' },
      { value: 'screen', name: 'Screen' },
      { value: 'overlay', name: 'Overlay' },
      { value: 'darken', name: 'Darken' },
      { value: 'lighten', name: 'Lighten' },
      { value: 'color-dodge', name: 'Color Dodge' },
      { value: 'color-burn', name: 'Color Burn' },
      { value: 'hard-light', name: 'Hard Light' },
      { value: 'soft-light', name: 'Soft Light' },
      { value: 'difference', name: 'Difference' },
      { value: 'exclusion', name: 'Exclusion' },
      { value: 'hue', name: 'Hue' },
      { value: 'saturation', name: 'Saturation' },
      { value: 'color', name: 'Color' },
      { value: 'luminosity', name: 'Luminosity' },
  ];

  startEditing(layerId: number): void {
    this.editingLayerId.set(layerId);
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector('.layer-rename-input');
      if (input) {
        (input as HTMLInputElement).focus();
        (input as HTMLInputElement).select();
      }
    });
  }

  finishEditing(layerId: number, newName: string): void {
    if (this.editingLayerId() === null) return; // Prevent double trigger from blur/enter

    const trimmedName = newName.trim();
    if (trimmedName) {
      this.stateService.renameLayer(layerId, trimmedName);
    }
    this.editingLayerId.set(null);
  }

  handleOpacityChange(event: Event, layerId: number): void {
    const newOpacity = parseFloat((event.target as HTMLInputElement).value);
    this.stateService.setLayerOpacity(layerId, newOpacity);
  }

  handleVisibilityToggle(layerId: number, isVisible: boolean): void {
    this.stateService.setLayerVisibility(layerId, !isVisible);
  }

  handleBlendModeChange(event: Event, layerId: number): void {
    const mode = (event.target as HTMLSelectElement).value as GlobalCompositeOperation;
    this.stateService.setLayerBlendMode(layerId, mode);
  }

  hasActiveStyles(layer: Layer): boolean {
    if (!layer.styles) return false;
    const s = layer.styles;
    return s.dropShadow.enabled || 
           s.innerGlow.enabled ||
           s.outerGlow.enabled ||
           s.stroke.enabled ||
           s.colorOverlay.enabled ||
           s.gradientOverlay.enabled ||
           s.bevelAndEmboss.enabled ||
           s.satin.enabled;
  }
}