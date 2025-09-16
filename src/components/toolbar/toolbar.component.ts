import { Component, ChangeDetectionStrategy, inject, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService, Tool, BrushType, EraserType, CustomBrush, SubTool, SymmetryMode } from '../../services/canvas-state.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // FIX: Use host property instead of @HostListener for document click events.
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ToolbarComponent {
  stateService = inject(CanvasStateService);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'sans-serif', 'serif'];
  openFlyout = signal<Tool | 'guides' | null>(null);
  private elementRef = inject(ElementRef);
  private closeFlyoutTimer: ReturnType<typeof setTimeout> | null = null;

  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.openFlyout.set(null);
    }
  }
  
  handleMenuEnter(tool: Tool | 'guides'): void {
    if (this.closeFlyoutTimer) {
      clearTimeout(this.closeFlyoutTimer);
      this.closeFlyoutTimer = null;
    }
    this.openFlyout.set(tool);
  }

  handleMenuLeave(): void {
    this.closeFlyoutTimer = setTimeout(() => {
      this.openFlyout.set(null);
    }, 200);
  }

  selectBrush(brushId: BrushType | string): void {
    this.stateService.setBrush(brushId);
    this.openFlyout.set(null);
  }

  editBrush(event: MouseEvent, brushId: string): void {
    event.stopPropagation();
    this.stateService.openBrushStudio(brushId);
    this.openFlyout.set(null);
  }

  duplicateBrush(event: MouseEvent, brush: CustomBrush): void {
    event.stopPropagation();
    this.stateService.duplicateCustomBrush(brush);
    // Keep the flyout open to see the result
  }

  deleteBrush(event: MouseEvent, brushId: string): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this brush? This action cannot be undone.')) {
      this.stateService.deleteCustomBrush(brushId);
    }
  }

  selectEraser(eraser: EraserType): void {
    this.stateService.setEraser(eraser);
    this.openFlyout.set(null);
  }

  selectSymmetryMode(mode: SymmetryMode): void {
    this.stateService.setSymmetryMode(mode);
    if (mode === 'none') {
      this.openFlyout.set(null);
    }
  }
  
  openBrushStudio(): void {
    this.stateService.openBrushStudio();
    this.openFlyout.set(null);
  }

  handleColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setColor(input.value);
  }

  handleBgColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setBackgroundColor(input.value);
  }

  handleSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setBrushSize(input.value);
  }

  handleSmudgeStrengthChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setSmudgeStrength(input.value);
  }

  handleFontSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setFontSize(input.value);
  }

  handleFontFamilyChange(event: Event): void {
    const input = event.target as HTMLSelectElement;
    this.stateService.setFontFamily(input.value);
  }

  handleGridSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setGridSize(input.value);
  }

  handleGridColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setGridColor(input.value);
  }

  handleRadialSegmentsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setRadialSegments(input.value);
  }

  onImportClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (typeof e.target?.result === 'string') {
          this.stateService.importImageAsLayer(e.target.result, file.name);
        }
      };

      reader.readAsDataURL(file);
      
      // Reset the input value to allow importing the same file again
      input.value = '';
    }
  }

  // Type guard for the template
  isCustomBrush(brush: SubTool<BrushType> | CustomBrush): brush is CustomBrush {
    return 'isCustom' in brush;
  }
}