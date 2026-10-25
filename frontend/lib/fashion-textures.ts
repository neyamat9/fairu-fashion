import * as THREE from 'three';

// Cache generated textures so we don't recreate them every frame
const textureCache: Record<string, THREE.CanvasTexture> = {};

/**
 * Creates high-res PBR fabric texture maps representing the intricate Pakistani three-piece prints
 * matching the user's uploaded reference suits (Mustard, Royal Blue, Terracotta, Indigo, Emerald).
 */
export function getGarmentTexture(
  patternKey: string,
  baseHex: string,
  accentHex: string,
  isBack = false
): THREE.CanvasTexture {
  const cacheKey = `${patternKey}_${baseHex}_${accentHex}_${isBack ? 'back' : 'front'}`;
  if (textureCache[cacheKey]) {
    return textureCache[cacheKey];
  }

  if (typeof document === 'undefined') {
    // SSR guard
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Base fabric color
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Micro weave / organic lawn texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let y = 0; y < 1024; y += 4) {
    ctx.fillRect(0, y, 1024, 1);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let x = 0; x < 1024; x += 4) {
    ctx.fillRect(x, 0, 1, 1024);
  }

  // 3. Pattern-specific layouts
  if (patternKey.includes('mustard') || patternKey.includes('ochre')) {
    drawMustardTealPattern(ctx, baseHex, accentHex, isBack);
  } else if (patternKey.includes('royal') || patternKey.includes('blue')) {
    drawRoyalBluePattern(ctx, baseHex, accentHex, isBack);
  } else if (patternKey.includes('terracotta') || patternKey.includes('amber')) {
    drawTerracottaPattern(ctx, baseHex, accentHex, isBack);
  } else if (patternKey.includes('indigo') || patternKey.includes('citrus')) {
    drawIndigoOrangePattern(ctx, baseHex, accentHex, isBack);
  } else {
    drawEmeraldGoldPattern(ctx, baseHex, accentHex, isBack);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache[cacheKey] = texture;
  return texture;
}

/**
 * Mustard & Teal Floral Pattern (Photo 1)
 */
function drawMustardTealPattern(
  ctx: CanvasRenderingContext2D,
  _base: string,
  accent: string,
  isBack: boolean
) {
  // All-over small floral sprigs
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  for (let x = 40; x < 1000; x += 70) {
    for (let y = 80; y < 900; y += 70) {
      // Small 4-petal flower
      ctx.beginPath();
      ctx.arc(x, y - 5, 4, 0, Math.PI * 2);
      ctx.arc(x, y + 5, 4, 0, Math.PI * 2);
      ctx.arc(x - 5, y, 4, 0, Math.PI * 2);
      ctx.arc(x + 5, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;

  // Front Neckline Panel (Only on front)
  if (!isBack) {
    ctx.fillStyle = accent;
    ctx.fillRect(400, 60, 224, 380);

    // Inner medallion
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(420, 80, 184, 340);

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(512, 190, 45, 0, Math.PI * 2);
    ctx.arc(512, 310, 35, 0, Math.PI * 2);
    ctx.fill();

    // Geometric border around neck
    ctx.strokeStyle = '#D98200';
    ctx.lineWidth = 6;
    ctx.strokeRect(405, 65, 214, 370);
    ctx.globalAlpha = 1.0;
  }

  // Daman / Hemline border at the bottom
  ctx.fillStyle = accent;
  ctx.fillRect(0, 880, 1024, 144);

  // Intricate border motif
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.75;
  for (let x = 20; x < 1020; x += 60) {
    ctx.beginPath();
    ctx.arc(x + 30, 952, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Royal Blue & Lotus Cyan Pattern (Photo 2)
 */
function drawRoyalBluePattern(
  ctx: CanvasRenderingContext2D,
  _base: string,
  accent: string,
  isBack: boolean
) {
  // Lotus motifs on the center vertical column
  if (!isBack) {
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(360, 40, 304, 820);
    ctx.globalAlpha = 1.0;

    // Stylized lotus flowers down the front
    ctx.fillStyle = '#FFFFFF';
    const lotusYs = [180, 340, 500, 660];
    for (const ly of lotusYs) {
      drawLotusFlower(ctx, 512, ly, accent);
    }
  } else {
    // Subtle back sprigs
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.3;
    for (let x = 60; x < 980; x += 100) {
      for (let y = 100; y < 860; y += 120) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Cyan geometric daman
  ctx.fillStyle = accent;
  ctx.fillRect(0, 860, 1024, 164);

  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.9;
  for (let x = 0; x < 1024; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 1024);
    ctx.lineTo(x + 25, 940);
    ctx.lineTo(x + 50, 1024);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawLotusFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  // Central petal
  ctx.ellipse(x, y, 16, 42, 0, 0, Math.PI * 2);
  // Left petal
  ctx.ellipse(x - 22, y + 10, 14, 32, -Math.PI / 6, 0, Math.PI * 2);
  // Right petal
  ctx.ellipse(x + 22, y + 10, 14, 32, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y + 36, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Terracotta Rust Geometric Pattern (Photo 3 & 4)
 */
function drawTerracottaPattern(
  ctx: CanvasRenderingContext2D,
  _base: string,
  accent: string,
  isBack: boolean
) {
  // Geometric grid squares
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  for (let x = 40; x < 1000; x += 60) {
    for (let y = 60; y < 860; y += 60) {
      ctx.strokeRect(x, y, 48, 48);
      ctx.fillRect(x + 18, y + 18, 12, 12);
    }
  }
  ctx.globalAlpha = 1.0;

  if (!isBack) {
    // Symmetrical Slate Neck Column
    ctx.fillStyle = accent;
    ctx.fillRect(430, 50, 164, 420);

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.8;
    for (let y = 90; y < 450; y += 45) {
      ctx.fillRect(445, y, 134, 18);
    }
    ctx.globalAlpha = 1.0;
  }

  // Daman geometric border
  ctx.fillStyle = accent;
  ctx.fillRect(0, 870, 1024, 154);

  ctx.fillStyle = '#F59E0B';
  for (let x = 10; x < 1010; x += 40) {
    ctx.fillRect(x, 920, 24, 50);
  }
}

/**
 * Indigo & Orange Striped Pattern (Photo 5)
 */
function drawIndigoOrangePattern(
  ctx: CanvasRenderingContext2D,
  _base: string,
  accent: string,
  isBack: boolean
) {
  // Vertical micro-stripes across entire tunic
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  for (let x = 30; x < 1000; x += 36) {
    ctx.fillRect(x, 0, 4, 880);
  }
  ctx.globalAlpha = 1.0;

  if (!isBack) {
    // Contrast Orange Neckline Medallion
    ctx.fillStyle = accent;
    ctx.fillRect(390, 40, 244, 380);

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(415, 65, 194, 330);

    ctx.fillStyle = accent;
    for (let y = 100; y < 370; y += 40) {
      ctx.beginPath();
      ctx.arc(512, y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // Broad contrast Tangerine daman
  ctx.fillStyle = accent;
  ctx.fillRect(0, 860, 1024, 164);

  ctx.fillStyle = '#1E1B4B';
  for (let x = 0; x < 1024; x += 60) {
    ctx.fillRect(x + 10, 910, 40, 60);
  }
}

/**
 * Emerald & Gold Festive Pattern
 */
function drawEmeraldGoldPattern(
  ctx: CanvasRenderingContext2D,
  _base: string,
  accent: string,
  isBack: boolean
) {
  // Floral filigree
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.3;
  for (let x = 50; x < 980; x += 80) {
    for (let y = 80; y < 860; y += 80) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;

  if (!isBack) {
    ctx.fillStyle = accent;
    ctx.fillRect(410, 50, 204, 390);

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(430, 75, 164, 340);
    ctx.globalAlpha = 1.0;
  }

  // Golden Daman
  ctx.fillStyle = accent;
  ctx.fillRect(0, 870, 1024, 154);
}
