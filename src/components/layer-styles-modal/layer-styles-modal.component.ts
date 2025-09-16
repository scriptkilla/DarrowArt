import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService, Layer, LayerStyles, DropShadowStyle, InnerGlowStyle, OuterGlowStyle, StrokeStyle, ColorOverlayStyle, GradientOverlayStyle, BevelAndEmbossStyle, SatinStyle } from '../../services/canvas-state.service';

@Component({
  selector: 'app-layer-styles-modal',
  templateUrl: './layer-styles-modal.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerStylesModalComponent {
  stateService = inject(CanvasStateService);

  activeLayer = computed<Layer | null>(() => {
    const layerId = this.stateService.editingStylesForLayerId();
    if (layerId === null) return null;
    return this.stateService.layers().find(l => l.id === layerId) ?? null;
  });

  // FIX: Refactored to be more type-safe and avoid issues with iterating over a union of types.
  private updateStyles(styleChanges: Partial<LayerStyles>) {
    const layer = this.activeLayer();
    if (!layer) return;

    const newStyles: LayerStyles = {
        dropShadow: { ...layer.styles.dropShadow, ...styleChanges.dropShadow },
        innerGlow: { ...layer.styles.innerGlow, ...styleChanges.innerGlow },
        outerGlow: { ...layer.styles.outerGlow, ...styleChanges.outerGlow },
        stroke: { ...layer.styles.stroke, ...styleChanges.stroke },
        colorOverlay: { ...layer.styles.colorOverlay, ...styleChanges.colorOverlay },
        gradientOverlay: { ...layer.styles.gradientOverlay, ...styleChanges.gradientOverlay },
        bevelAndEmboss: { ...layer.styles.bevelAndEmboss, ...styleChanges.bevelAndEmboss },
        satin: { ...layer.styles.satin, ...styleChanges.satin },
    };
    
    this.stateService.updateLayerStyles(layer.id, newStyles);
  }

  // --- Generic Handlers ---
  private toggleStyle(event: Event, styleName: keyof LayerStyles) {
    const enabled = (event.target as HTMLInputElement).checked;
    this.updateStyles({ [styleName]: { enabled } });
  }

  private updateStyleProperty(event: Event, styleName: keyof LayerStyles, property: string) {
    const target = event.target as HTMLInputElement;
    const value = target.type === 'color' ? target.value : (target.type === 'checkbox' ? target.checked : parseFloat(target.value));
    this.updateStyles({ [styleName]: { [property]: value } });
  }

  // --- Drop Shadow ---
  toggleDropShadow = (e: Event) => this.toggleStyle(e, 'dropShadow');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateDropShadow = (e: Event, p: keyof Omit<DropShadowStyle, 'enabled'>) => this.updateStyleProperty(e, 'dropShadow', p as string);
  
  // --- Inner Glow ---
  toggleInnerGlow = (e: Event) => this.toggleStyle(e, 'innerGlow');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateInnerGlow = (e: Event, p: keyof Omit<InnerGlowStyle, 'enabled'>) => this.updateStyleProperty(e, 'innerGlow', p as string);

  // --- Outer Glow ---
  toggleOuterGlow = (e: Event) => this.toggleStyle(e, 'outerGlow');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateOuterGlow = (e: Event, p: keyof Omit<OuterGlowStyle, 'enabled'>) => this.updateStyleProperty(e, 'outerGlow', p as string);
  
  // --- Stroke ---
  toggleStroke = (e: Event) => this.toggleStyle(e, 'stroke');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateStroke = (e: Event, p: keyof Omit<StrokeStyle, 'enabled' | 'position'>) => this.updateStyleProperty(e, 'stroke', p as string);
  
  // --- Color Overlay ---
  toggleColorOverlay = (e: Event) => this.toggleStyle(e, 'colorOverlay');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateColorOverlay = (e: Event, p: keyof Omit<ColorOverlayStyle, 'enabled'>) => this.updateStyleProperty(e, 'colorOverlay', p as string);

  // --- Gradient Overlay ---
  toggleGradientOverlay = (e: Event) => this.toggleStyle(e, 'gradientOverlay');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateGradientOverlay = (e: Event, p: keyof Omit<GradientOverlayStyle, 'enabled' | 'style'>) => this.updateStyleProperty(e, 'gradientOverlay', p as string);

  // --- Bevel & Emboss ---
  toggleBevelAndEmboss = (e: Event) => this.toggleStyle(e, 'bevelAndEmboss');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateBevelAndEmboss = (e: Event, p: keyof Omit<BevelAndEmbossStyle, 'enabled'>) => this.updateStyleProperty(e, 'bevelAndEmboss', p as string);

  // --- Satin ---
  toggleSatin = (e: Event) => this.toggleStyle(e, 'satin');
  // FIX: Cast property key to string to satisfy TypeScript compiler.
  updateSatin = (e: Event, p: keyof Omit<SatinStyle, 'enabled'>) => this.updateStyleProperty(e, 'satin', p as string);
}
