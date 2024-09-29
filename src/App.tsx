import React, { useState, useRef, useEffect } from 'react';

const ImageToDotConverter = () => {
  const [dotImage, setDotImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(128);
  const [pixelCount, setPixelCount] = useState<number>(100);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [coordinates, setCoordinates] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showToast, setShowToast] = useState<boolean>(false);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          convertToDots(img, threshold, pixelCount);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseInt(event.target.value);
    setThreshold(newThreshold);
  };

  const handlePixelCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPixelCount = parseInt(event.target.value);
    setPixelCount(newPixelCount);
  };

  const convertToDots = (img: HTMLImageElement, threshold: number, pixelCount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = 250;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const aspectRatio = img.width / img.height;
    let scaledWidth, scaledHeight;
    if (aspectRatio > 1) {
      scaledWidth = canvasSize;
      scaledHeight = canvasSize / aspectRatio;
    } else {
      scaledHeight = canvasSize;
      scaledWidth = canvasSize * aspectRatio;
    }

    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
    const data = imageData.data;

    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = pixelCount;
    dotCanvas.height = pixelCount;
    const dotCtx = dotCanvas.getContext('2d');
    if (!dotCtx) return;

    const dotImageData = dotCtx.createImageData(pixelCount, pixelCount);
    const dotData = dotImageData.data;

    const scaleX = scaledWidth / pixelCount;
    const scaleY = scaledHeight / pixelCount;

    for (let y = 0; y < pixelCount; y++) {
      for (let x = 0; x < pixelCount; x++) {
        let totalR = 0, totalG = 0, totalB = 0;
        let count = 0;

        for (let dy = 0; dy < scaleY; dy++) {
          for (let dx = 0; dx < scaleX; dx++) {
            const sx = Math.floor(x * scaleX + dx);
            const sy = Math.floor(y * scaleY + dy);
            if (sx < scaledWidth && sy < scaledHeight) {
              const i = (sy * scaledWidth + sx) * 4;
              totalR += data[i];
              totalG += data[i + 1];
              totalB += data[i + 2];
              count++;
            }
          }
        }

        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;

        const gray = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
        const color = gray > threshold ? 255 : 0;

        const dotIndex = (y * pixelCount + x) * 4;
        dotData[dotIndex] = dotData[dotIndex + 1] = dotData[dotIndex + 2] = color;
        dotData[dotIndex + 3] = 255;
      }
    }

    dotCtx.putImageData(dotImageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(dotCanvas, 0, 0, pixelCount, pixelCount, 0, 0, canvasSize, canvasSize);

    setDotImage(canvas.toDataURL());
  };

  const generateCoordinates = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const center = Math.floor(pixelCount / 2);
    const whiteCoordinates: string[] = [];

    for (let y = 0; y < pixelCount; y++) {
      for (let x = 0; x < pixelCount; x++) {
        const i = (y * pixelCount + x) * 4;
        if (data[i] === 255) {  // White pixel
          const relX = x - center;
          const relZ = y - center;
          whiteCoordinates.push(`~${relX} ~ ~${relZ}`);
        }
      }
    }

    const formattedCoordinates = whiteCoordinates.join(' & ');
    const chunks = [];
    let currentChunk = '';

    formattedCoordinates.split(' & ').forEach(coord => {
      if ((currentChunk.length + coord.length + 3) > 10000) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += coord + ' & ';
    });

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    setCoordinates(chunks);
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  useEffect(() => {
    if (originalImage) {
      convertToDots(originalImage, threshold, pixelCount);
    }
  }, [threshold, pixelCount, originalImage]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">sequence setblock ジェネレーター</h1>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="mb-4"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {dotImage && (
        <>
          <img
            src={dotImage}
            alt="Dot version"
            style={{ width: '250px', height: '250px', imageRendering: 'pixelated' }}
            className="border-2 border-gray-300 mb-4"
          />
          <div className="w-64 mb-4">
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
              Threshold: {threshold}
            </label>
            <input
              type="range"
              id="threshold"
              name="threshold"
              min="0"
              max="255"
              value={threshold}
              onChange={handleThresholdChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="w-64 mb-4">
            <label htmlFor="pixelCount" className="block text-sm font-medium text-gray-700">
              一辺のブロック数: {pixelCount}
            </label>
            <input
              type="range"
              id="pixelCount"
              name="pixelCount"
              min="20"
              max="1000"
              value={pixelCount}
              onChange={handlePixelCountChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <button
            onClick={generateCoordinates}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Generate Coordinates
          </button>
          {coordinates.map((chunk, index) => (
            <div key={index} className="w-full max-w-2xl mb-4">
              <textarea
                readOnly
                value={chunk}
                className="w-full h-32 p-2 border rounded"
              />
              <button
                onClick={() => copyToClipboard(chunk)}
                className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Copy to Clipboard
              </button>
            </div>
          ))}
        </>
      )}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-300">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default ImageToDotConverter;