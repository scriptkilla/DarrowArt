import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService } from '../../services/canvas-state.service';

@Component({
  selector: 'app-new-canvas-modal',
  templateUrl: './new-canvas-modal.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewCanvasModalComponent implements OnInit {
  stateService = inject(CanvasStateService);

  // Use signals to make them mutable and update the template
  width = signal(0);
  height = signal(0);
  bgColor = this.stateService.backgroundColor();

  ngOnInit(): void {
    this.setScreenSizeAsDefault();
  }

  setScreenSizeAsDefault(): void {
    const mainContent = document.querySelector('main > div.flex-grow');
    if (mainContent) {
      const padding = 0; 
      this.width.set(Math.floor(mainContent.clientWidth - padding));
      this.height.set(Math.floor(mainContent.clientHeight - padding));
    } else {
      // Fallback to a reasonable default size
      this.width.set(1024);
      this.height.set(768);
    }
  }

  handleColorChange(event: Event) {
    this.bgColor = (event.target as HTMLInputElement).value;
  }
  
  updateWidth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.width.set(parseInt(value, 10) || 0);
  }
  
  updateHeight(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.height.set(parseInt(value, 10) || 0);
  }

  create(): void {
    const w = this.width();
    const h = this.height();
    
    if (w > 0 && h > 0 && w <= 8000 && h <= 8000) {
      this.stateService.createNewCanvas(w, h, this.bgColor);
    } else {
      alert('Please enter valid dimensions (up to 8000x8000).');
    }
  }

  cancel(): void {
    this.stateService.hideNewCanvasModal();
  }
}