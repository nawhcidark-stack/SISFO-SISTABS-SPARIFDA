// Universal Node.js Web Hosting Entrypoint (e.g., cPanel, Heroku, Render, VPS)
import fs from 'fs';
import path from 'path';

const prodServerPath = path.join(process.cwd(), 'dist', 'server.cjs');

if (fs.existsSync(prodServerPath)) {
  console.log("Starting production full-stack server from compiled bundle...");
  await import('./dist/server.cjs');
} else {
  console.error("--- ERROR: BUNDLE NOT FOUND ---");
  console.error("Compiled production server ('dist/server.cjs') was not found.");
  console.error("Please run the build command first: 'npm run build'");
  console.error("--------------------------------");
  process.exit(1);
}
