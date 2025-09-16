import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is injected via environment variables.
    // In a real app, this would be handled securely, but for this
    // environment, we assume `process.env.API_KEY` is available.
    if (!process.env.API_KEY) {
      console.error('API_KEY environment variable not set.');
      // Fallback for environments where process.env is not defined
      // This will likely result in an error from the GenAI SDK,
      // which is expected if the key is missing.
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  async generateImages(
    prompt: string,
    numberOfImages: number,
    aspectRatio: string
  ): Promise<string[]> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
          numberOfImages,
          aspectRatio,
          outputMimeType: 'image/jpeg',
        },
      });

      return response.generatedImages.map(
        (img) => `data:image/jpeg;base64,${img.image.imageBytes}`
      );
    } catch (error) {
      console.error('Error generating images:', error);
      throw new Error('Failed to generate images. Please check the console for details.');
    }
  }
}
