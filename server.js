// Universal Node.js Web Hosting Entrypoint (e.g., cPanel, Hostinger, Heroku, Render, VPS)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prodServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(prodServerPath)) {
  console.log("Starting production full-stack server from compiled bundle...");
  const require = createRequire(import.meta.url);
  require(prodServerPath);
} else {
  console.error("--- ERROR: BUNDLE NOT FOUND ---");
  console.error("Compiled production server ('dist/server.cjs') was not found.");
  console.error("Please run the build command first: 'npm run build'");
  console.error("--------------------------------");
  process.exit(1);
}
