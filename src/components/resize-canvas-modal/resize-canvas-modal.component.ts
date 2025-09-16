import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService, Anchor } from '../../services/canvas-state.service';

@Component({
  selector: 'app-resize-canvas-modal',
  templateUrl: './resize-canvas-modal.component.html',
  imports: [CommonModule],
})
export class ResizeCanvasModalComponent {
  stateService = inject(CanvasStateService);

  // Initialize with current canvas dimensions
  width = signal(this.stateService.canvasWidth());
  height = signal(this.stateService.canvasHeight());
  anchor = signal<Anchor>('center');

  anchors: Anchor[] = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];

  resize(): void {
    const w = this.width();
    const h = this.height();
    
    if (w > 0 && h > 0 && w <= 8000 && h <= 8000) {
      this.stateService.resizeCanvas(w, h, this.anchor());
    } else {
      alert('Please enter valid dimensions (up to 8000x8000).');
    }
  }

  cancel(): void {
    this.stateService.hideResizeCanvasModal();
  }

  updateWidth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.width.set(parseInt(value, 10) || 0);
  }
  
  updateHeight(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.height.set(parseInt(value, 10) || 0);
  }

  setAnchor(anchor: Anchor) {
    this.anchor.set(anchor);
  }
}
