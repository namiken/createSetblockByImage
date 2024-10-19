import React, { useState, useRef, useEffect } from 'react';

// 画像をドットに変換するコンポーネント
const ImageToDotConverter = () => {
  // ステートの初期化：画像のドットバージョン、しきい値、ピクセル数、オリジナル画像、座標リスト、キャンバス、トースト表示フラグ
  const [dotImage, setDotImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(128);
  const [pixelCount, setPixelCount] = useState<number>(100);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [coordinates, setCoordinates] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [prefix, setPrefix] = useState<string>("sequence_setblock 0 1");
  const [middle, setMiddle] = useState<string>("~-1");
  const [showCustomization, setShowCustomization] = useState<boolean>(false);
  const [invertColors, setInvertColors] = useState<boolean>(false);


  // 画像アップロード時に呼び出されるハンドラー
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // アップロードした画像をステートに保存し、ドット変換を行う
          setOriginalImage(img);
          convertToDots(img, threshold, pixelCount);
          setCoordinates([]);
          setShowCustomization(false);
          setInvertColors(false);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // しきい値が変更されたときに呼び出されるハンドラー
  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseInt(event.target.value);
    setThreshold(newThreshold);
  };

  // ピクセル数が変更されたときに呼び出されるハンドラー
  const handlePixelCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPixelCount = parseInt(event.target.value);
    setPixelCount(newPixelCount);
  };

  // 画像をドットに変換する関数
  const convertToDots = (img: HTMLImageElement, threshold: number, pixelCount: number) => {

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = 250;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // 画像のアスペクト比を維持しつつスケーリング
    const aspectRatio = img.width / img.height;
    let scaledWidth, scaledHeight;
    if (aspectRatio > 1) {
      scaledWidth = canvasSize;
      scaledHeight = Math.floor(canvasSize / aspectRatio);
    } else {
      scaledHeight = canvasSize;
      scaledWidth = Math.floor(canvasSize * aspectRatio);
    }

    // 画像をキャンバスに描画
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
    const data = imageData.data;

    // ドットに変換するための別のキャンバスを作成
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = pixelCount;
    dotCanvas.height = pixelCount;
    const dotCtx = dotCanvas.getContext('2d');
    if (!dotCtx) return;

    const dotImageData = dotCtx.createImageData(pixelCount, pixelCount);
    const dotData = dotImageData.data;

    // ピクセル単位でグレースケールに変換し、しきい値に基づいて白黒にする
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

        // ピクセルの平均色を計算し、グレースケール化
        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;

        const gray = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
        const color = invertColors ? (gray <= threshold ? 255 : 0) : (gray > threshold ? 255 : 0);

        const dotIndex = (y * pixelCount + x) * 4;
        dotData[dotIndex] = dotData[dotIndex + 1] = dotData[dotIndex + 2] = color;
        dotData[dotIndex + 3] = 255; // 透明度をセット
      }
    }

    // ドットイメージデータをキャンバスに描画
    dotCtx.putImageData(dotImageData, 0, 0);

    // キャンバスを更新
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(dotCanvas, 0, 0, pixelCount, pixelCount, 0, 0, canvasSize, canvasSize);

    // ドット画像を状態にセット
    setDotImage(canvas.toDataURL());

  };

  const canvasToDots = () => {

    const img = originalImage;
    if (!img) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = 250;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // 画像のアスペクト比を維持しつつスケーリング
    const aspectRatio = img.width / img.height;
    let scaledWidth, scaledHeight;
    if (aspectRatio > 1) {
      scaledWidth = canvasSize;
      scaledHeight = Math.floor(canvasSize / aspectRatio);
    } else {
      scaledHeight = canvasSize;
      scaledWidth = Math.floor(canvasSize * aspectRatio);
    }

    // 画像をキャンバスに描画
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
    const data = imageData.data;

    // ドットに変換するための別のキャンバスを作成
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = pixelCount;
    dotCanvas.height = pixelCount;
    const dotCtx = dotCanvas.getContext('2d');
    if (!dotCtx) return;

    // ピクセル単位でグレースケールに変換し、しきい値に基づいて白黒にする
    const scaleX = scaledWidth / pixelCount;
    const scaleY = scaledHeight / pixelCount;

    const dots: { x: number, y: number }[] = [];

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

        // ピクセルの平均色を計算し、グレースケール化
        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;

        const gray = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
        const color = invertColors ? (gray <= threshold ? 255 : 0) : (gray > threshold ? 255 : 0);

        if (color === 0) {
          dots.push({ x, y });
        }
      }
    }
    return dots;

  };

  // ドット画像の白いピクセルの座標を生成する関数
  const generateCoordinates = () => {
    const points = canvasToDots();

    if (!points?.length) {
      return;
    }

    // 座標リストを大きな文字列として整形し、分割
    const formattedCoordinates = points?.map(({ x, y }) => `~${x - Math.floor(pixelCount / 2)} ${middle} ~${y - Math.floor(pixelCount / 2)}`).join(' & ');
    const chunks = [];
    let currentChunk = '';

    formattedCoordinates.split(' & ').forEach(coord => {
      if ((currentChunk.length + coord.length + 3) > 15000) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += coord + ' & ';
    });

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }


    // 座標リストを状態にセット
    setCoordinates(chunks.map(chunk => prefix + " " + chunk));
    setShowCustomization(true);
  };

  // クリップボードにテキストをコピーする関数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // しきい値やピクセル数、画像が変更されたら再度ドットに変換
  useEffect(() => {
    if (originalImage) {
      convertToDots(originalImage, threshold, pixelCount);

      if (showCustomization) {
        //座標を生成済みの場合は、再生成する
        generateCoordinates();
      }
    }
  }, [threshold, pixelCount, originalImage, invertColors]);

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
          <div className="flex items-center mb-4">
            <button
              onClick={generateCoordinates}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
            >
              座標を出力
            </button>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={invertColors}
                onChange={(e) => setInvertColors(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-gray-700">色を反転</span>
            </label>
          </div>
          {showCustomization && (
            <div className="w-full max-w-2xl mb-4">
              <div className="flex flex-col mb-2">
                <label htmlFor="prefix" className="text-sm font-medium text-gray-700">コマンドの先頭:</label>
                <input
                  type="text"
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  onBlur={generateCoordinates}
                  className="mt-1 p-2 border rounded"
                />
              </div>
              <div className="flex flex-col mb-2">
                <label htmlFor="middle" className="text-sm font-medium text-gray-700">Y座標:</label>
                <input
                  type="text"
                  id="middle"
                  value={middle}
                  onChange={(e) => setMiddle(e.target.value)}
                  onBlur={generateCoordinates}
                  className="mt-1 p-2 border rounded"
                />
              </div>
            </div>
          )}
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
