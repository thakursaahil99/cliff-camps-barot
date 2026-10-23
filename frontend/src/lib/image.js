/** Shrinks a photo to WebP (longest side `maxSide` px) in the browser, so uploads stay small and pages stay fast. */
export async function compressImage(file, maxSide = 1400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const q of [0.82, 0.65, 0.5]) {
    const url = canvas.toDataURL('image/webp', q);
    if (url.startsWith('data:image/webp') && url.length < 2_000_000) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.6);
}
