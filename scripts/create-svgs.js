const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../frontend/public/hero');
const dashDir = path.resolve(__dirname, '../dashboard/public/hero');

['model-1', 'model-2', 'model-3'].forEach((name) => {
  const pngPath = path.join(outDir, `${name}.png`);
  if (!fs.existsSync(pngPath)) return;
  const b64 = fs.readFileSync(pngPath).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1080" width="100%" height="100%">
  <image width="100%" height="100%" href="data:image/png;base64,${b64}" />
</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  fs.writeFileSync(path.join(dashDir, `${name}.svg`), svg);
  console.log(`Created ${name}.svg`);
});
