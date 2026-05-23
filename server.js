// Universal Node.js Web Hosting Entrypoint (e.g., cPanel, Heroku, Render, VPS)
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prodServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(prodServerPath)) {
  console.log("Starting production full-stack server from compiled bundle...");
  // Import the bundle using the absolute file URL to prevent any resolution issues
  const serverUrl = pathToFileURL(prodServerPath).href;
  await import(serverUrl);
} else {
  console.error("--- ERROR: BUNDLE NOT FOUND ---");
  console.error("Compiled production server ('dist/server.cjs') was not found.");
  console.error("Please run the build command first: 'npm run build'");
  console.error("--------------------------------");
  process.exit(1);
}
