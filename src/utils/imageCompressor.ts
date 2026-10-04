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
  return new Promise((resolve) => {
    // If not standard image or if SVG/PDF, return raw DataURL directly
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    const reader = new FileReader();
    reader.onerror = () => resolve("");
    reader.onload = (e) => {
      const rawResult = (e.target?.result as string) || "";
      if (!isImage || isSvg || isPdf || !rawResult) {
        return resolve(rawResult);
      }

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (!width || !height || width <= 0 || height <= 0) {
              return resolve(rawResult);
            }

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
            canvas.width = Math.max(1, Math.min(width, maxWidth));
            canvas.height = Math.max(1, Math.min(height, maxHeight));
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              return resolve(rawResult);
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Keep PNG format for transparency if source is PNG, otherwise JPEG
            const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
            const outputMime = isPng ? "image/png" : "image/jpeg";
            const resultDataUrl = canvas.toDataURL(outputMime, quality);

            resolve(resultDataUrl || rawResult);
          } catch (canvasErr) {
            console.warn("[Canvas Resize Warning]: Fallback to raw image data:", canvasErr);
            resolve(rawResult);
          }
        };

        img.onerror = () => {
          resolve(rawResult);
        };

        img.src = rawResult;
      } catch (err) {
        resolve(rawResult);
      }
    };

    reader.readAsDataURL(file);
  });
}
