import { Component, ChangeDetectionStrategy, inject, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { LayersPanelComponent } from './components/layers-panel/layers-panel.component';
import { CanvasStateService } from './services/canvas-state.service';
import { NewCanvasModalComponent } from './components/new-canvas-modal/new-canvas-modal.component';
import { LayerStylesModalComponent } from './components/layer-styles-modal/layer-styles-modal.component';
import { BrushStudioModalComponent } from './components/brush-studio-modal/brush-studio-modal.component';
import { ResizeCanvasModalComponent } from './components/resize-canvas-modal/resize-canvas-modal.component';
import { GenerateImageModalComponent } from './components/generate-image-modal/generate-image-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ToolbarComponent,
    CanvasComponent,
    LayersPanelComponent,
    NewCanvasModalComponent,
    LayerStylesModalComponent,
    BrushStudioModalComponent,
    ResizeCanvasModalComponent,
    GenerateImageModalComponent,
  ],
})
export class AppComponent implements AfterViewInit {
  stateService = inject(CanvasStateService);

  zoomPercentage = computed(() => {
    return (this.stateService.zoomLevel() * 100).toFixed(0) + '%';
  });

  ngAfterViewInit(): void {
    // A small timeout ensures the layout is fully stable before we get its dimensions
    setTimeout(() => this.stateService.initializeCanvasToScreenSize(), 0);
  }

  private getCanvasCenter(): { x: number, y: number } {
    const canvasEl = document.querySelector('app-canvas canvas');
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }; // Fallback
  }

  zoomIn(): void {
    const center = this.getCanvasCenter();
    this.stateService.adjustZoom(0.2, center); // 0.2 means zoom in by 20%
  }

  zoomOut(): void {
    const center = this.getCanvasCenter();
    this.stateService.adjustZoom(-0.2, center); // -0.2 means zoom out by 20%
  }
}