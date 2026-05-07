export function depthInfoToDataURL({ data, width, height, channels }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const raw = new Uint8ClampedArray(data);

  for (let i = 0; i < width * height; i++) {
    const val = raw[i * channels];
    imageData.data[i * 4] = val;
    imageData.data[i * 4 + 1] = val;
    imageData.data[i * 4 + 2] = val;
    imageData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function dataURLtoBlob(dataURL) {
  const [header, b64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export function getImageDimensions(dataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = dataURL;
  });
}
