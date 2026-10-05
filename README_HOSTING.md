# Panduan Deployment di Hosting Node.js / cPanel / VPS

Aplikasi **SMP Maarif NU Pandaan - Portal Administrasi** ini dirancang dengan arsitektur modern full-stack menggunakan **React + Vite** di sisi klien (frontend) dan **Express + TypeScript** di sisi peladen (backend).

Untuk memastikan instalasi dan kompilasi berhasil tanpa kendala kecocokan framework di server hosting Anda, kami telah memperbarui struktur project ini agar sepenuhnya standar dan kompatibel dengan lingkungan Node.js apa pun.

---

## 📋 Prasyarat Sistem
* **Node.js**: Versi `18.x`, `20.x`, atau yang lebih baru.
* **NPM**: Bawaan dari instalasi Node.js.

---

## 🛠️ Langkah-Langkah Deployment

### 1. Unggah Source Code
Unggah seluruh folder proyek Anda ke dalam direktori server hosting Anda (misal `public_html/spp-app` atau direktori aplikasi Node.js yang ditunjuk oleh hosting/cPanel).

> **Catatan:** Direktori `node_modules` **tidak perlu diunggah**. Direktori tersebut akan dibuat secara otomatis saat instalasi package di server.

---

### 2. Instalasi Dependensi
Jalankan perintah berikut di terminal server (atau melalui menu terminal SSH/cPanel Node.js selector):

```bash
npm install
```

> **Informasi Keamanan Struktur:** Kami telah memindahkan tools pembangun (`esbuild`, `tsx`, `typescript`, `@types/*`) ke bagian `"dependencies"` utama di `package.json`. Ini mencegah kegagalan build pada beberapa hosting serverless atau platform awan yang secara otomatis melewatkan `"devDependencies"` saat memicu deployment online (dengan `NODE_ENV=production`).

---

### 3. Build & Kompilasi File
Lakukan kompilasi modul frontend (bundling Vite) serta backend (mengkompilasi server Express ke format CommonJS mandiri) dengan perintah tunggal:

```bash
npm run build
```

Perintah di atas akan menghasilkan folder `/dist` yang berisi:
* Kode frontend React statis yang teroptimasi secara penuh (`dist/index.html`, `/assets`, dll).
* Bundel backend Express mandiri (`dist/server.cjs`) beserta sourcemap-nya.

---

### 4. Mulai Menjalankan Server (Start)
Untuk menjalankan aplikasi di server produksi, Anda dapat mematangkan eksekusi dengan:

```bash
npm run start
```
Atau menjalankan entri poin utamanya secara manual:
```bash
node server.js
```

---

## ⚙️ Panduan Khusus Pengaturan Server & cPanel Hosting

Bila Anda menggunakan panel hosting seperti **cPanel Node.js Selector**:

1. **Application Startup File**: Isikan `server.js` (ini adalah file pemotong beban/wrapper handal yang telah kami sediakan di root direktori untuk mengarahkan rute secara otomatis ke file kompilasi `dist/server.cjs`).
2. **Application Entry Point**: Tunjuk direktori utama tempat Anda menaruh folder program.
3. **Environment Variables**:
   * `NODE_ENV`: Set ke `production`.
   * `PORT`: Server port akan membaca variabel port lingkungan cPanel Anda secara dinamis. Jika tidak dispesifikasikan, server akan berjalan default di port `3000`.
4. **Run JS Command**: Klik tombol **Run build** atau jalankan perintah melalui terminal virtual cPanel.
