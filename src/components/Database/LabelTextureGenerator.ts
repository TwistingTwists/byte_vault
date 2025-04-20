// LabelTextureGenerator.ts
// Utility for generating canvas-based textures for event labels (for use in WebGL)

export interface LabelTextureOptions {
  text: string;
  font?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  maxWidth?: number;
}

export class LabelTextureGenerator {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
  }

  static generateTexture(options: LabelTextureOptions): HTMLCanvasElement {
    const generator = new LabelTextureGenerator();
    const {
      text,
      font = '600 16px Inter, Arial, sans-serif',
      textColor = '#ffffff',
      backgroundColor = 'rgba(0, 0, 0, 0.7)',
      borderRadius = 8,
      paddingX = 12,
      paddingY = 8,
      maxWidth = 300
    } = options;

    // Measure text
    generator.context!.font = font;
    const textWidth = Math.min(generator.context!.measureText(text).width + 20, maxWidth);
    const fontSize = parseInt(font.match(/\d+px/)![0]);
    const textHeight = fontSize * 1.4;

    // Set canvas size
    const width = textWidth + (paddingX * 2);
    const height = textHeight + (paddingY * 2);
    generator.canvas.width = width;
    generator.canvas.height = height;

    // Clear canvas
    generator.context!.clearRect(0, 0, width, height);

    // Draw background with rounded corners
    generator.context!.beginPath();
    generator.context!.moveTo(borderRadius, 0);
    generator.context!.lineTo(width - borderRadius, 0);
    generator.context!.quadraticCurveTo(width, 0, width, borderRadius);
    generator.context!.lineTo(width, height - borderRadius);
    generator.context!.quadraticCurveTo(width, height, width - borderRadius, height);
    generator.context!.lineTo(borderRadius, height);
    generator.context!.quadraticCurveTo(0, height, 0, height - borderRadius);
    generator.context!.lineTo(0, borderRadius);
    generator.context!.quadraticCurveTo(0, 0, borderRadius, 0);
    generator.context!.closePath();
    generator.context!.fillStyle = backgroundColor;
    generator.context!.fill();

    // Add subtle border
    generator.context!.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    generator.context!.lineWidth = 1.5;
    generator.context!.stroke();

    // Draw text
    generator.context!.font = font;
    generator.context!.fillStyle = textColor;
    generator.context!.textAlign = 'center';
    generator.context!.textBaseline = 'middle';
    generator.context!.shadowColor = 'rgba(0, 0, 0, 0.8)';
    generator.context!.shadowBlur = 3;
    generator.context!.shadowOffsetX = 1;
    generator.context!.shadowOffsetY = 1;
    generator.context!.fillText(text, width / 2, height / 2, maxWidth);

    return generator.canvas;
  }

  // Helper for rounded rectangles
  static roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
