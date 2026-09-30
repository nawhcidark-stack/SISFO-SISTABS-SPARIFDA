/**
 * Client-side high-quality image compressor and aspect-ratio scaler.
 * Compresses images before base64 conversion to avoid huge network payloads,
 * localStorage quota limits, and 413 Payload Too Large proxy errors.
 */
export async function compressAndResizeImage(
  file: File,
  maxWidth: number = 512,
  maxHeight: number = 512,
  quality: number = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG, no canvas resize needed, return raw text or data URL
    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Gagal membaca file SVG"));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memproses gambar"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while bounding within maxWidth x maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG format for transparency if source is PNG, otherwise WEBP or JPEG
        const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        const outputMime = isPng ? "image/png" : "image/jpeg";
        const resultDataUrl = canvas.toDataURL(outputMime, quality);

        resolve(resultDataUrl);
      };

      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
