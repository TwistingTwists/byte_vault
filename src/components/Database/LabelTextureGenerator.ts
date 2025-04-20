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
  static generateTexture(options: LabelTextureOptions): HTMLCanvasElement {
    const {
      text,
      font = '600 18px Inter, Arial, sans-serif',
      fontSize = 18,
      textColor = '#fff',
      backgroundColor = 'rgba(17,24,39,0.92)',
      borderRadius = 12,
      paddingX = 24,
      paddingY = 12,
      maxWidth = 320
    } = options;

    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    // Measure text width
    const textMetrics = ctx.measureText(text);
    const textWidth = Math.min(textMetrics.width, maxWidth - 2 * paddingX);
    const width = textWidth + 2 * paddingX;
    const height = fontSize + 2 * paddingY;
    canvas.width = width;
    canvas.height = height;

    // Draw rounded rectangle background
    ctx.save();
    ctx.beginPath();
    LabelTextureGenerator.roundRect(ctx, 0, 0, width, height, borderRadius);
    ctx.fillStyle = backgroundColor;
    ctx.fill();
    ctx.restore();

    // Draw text
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 2;
    ctx.fillText(text, width / 2, height / 2, maxWidth - 2 * paddingX);
    ctx.restore();

    return canvas;
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
