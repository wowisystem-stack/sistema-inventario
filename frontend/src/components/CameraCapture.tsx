import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";

interface CameraCaptureProps {
  photo: string | null;
  onCapture: (dataUrl: string) => void;
  onRetake: () => void;
  aspect?: string;
}

export default function CameraCapture({ photo, onCapture, onRetake, aspect = "1 / 1" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      onCapture(canvas.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  };

  const retake = () => {
    onRetake();
    startCamera();
  };

  useEffect(() => () => stopCamera(), [stream]);

  return (
    <div>
      <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center relative mb-4" style={{ aspectRatio: aspect }}>
        {!photo && !cameraActive && (
          <button type="button" onClick={startCamera} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full">
            Encender Cámara
          </button>
        )}
        {!photo && cameraActive && (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}
        {photo && <img src={photo} alt="Foto capturada" className="w-full h-full object-cover" />}
      </div>
      {cameraActive && !photo && (
        <button type="button" onClick={takePhoto} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
          <Camera className="w-4 h-4" /> Capturar Foto
        </button>
      )}
      {photo && (
        <button type="button" onClick={retake} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium">
          Tomar otra foto
        </button>
      )}
    </div>
  );
}
