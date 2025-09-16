import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService } from '../../services/canvas-state.service';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-generate-image-modal',
  templateUrl: './generate-image-modal.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateImageModalComponent {
  stateService = inject(CanvasStateService);
  geminiService = inject(GeminiService);

  prompt = signal<string>('');
  numberOfImages = signal<number>(2);
  aspectRatio = signal<string>('1:1');
  isLoading = signal<boolean>(false);
  generatedImages = signal<string[]>([]);
  error = signal<string | null>(null);

  aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

  async generate() {
    if (!this.prompt().trim()) {
      this.error.set('Please enter a prompt.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.generatedImages.set([]);

    try {
      const images = await this.geminiService.generateImages(
        this.prompt(),
        this.numberOfImages(),
        this.aspectRatio()
      );
      this.generatedImages.set(images);
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }

  addToCanvas(imageDataUrl: string) {
    this.stateService.importImageAsLayer(imageDataUrl, `AI: ${this.prompt().substring(0, 20)}...`);
    this.close();
  }

  close() {
    this.stateService.hideGenerateImageModal();
    // Reset state for next time
    this.prompt.set('');
    this.generatedImages.set([]);
    this.error.set(null);
    this.isLoading.set(false);
  }
}
