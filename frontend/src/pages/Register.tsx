import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Pencil } from "lucide-react";
import { getPassword } from "../auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    document_id: "",
    email: "",
    username: "",
  });
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
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
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  // Signature logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignature(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL("image/png"));
    }
  };

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
  }, [stream]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return alert("Debes tomarte una foto.");
    
    // Si no han dado click a "Guardar firma", la guardamos autómaticamente
    let finalSignature = signature;
    if (!finalSignature && canvasRef.current) {
        finalSignature = canvasRef.current.toDataURL("image/png");
    }

    const payload = {
      ...formData,
      role: "empleado", // Por defecto
      photo_url: photo,
      digital_signature_url: finalSignature,
    };

    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-App-Password": getPassword() },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert("Registro exitoso.");
        navigate("/");
      } else {
        const err = await response.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="liquid-glass p-8 rounded-2xl">
        <h1 className="text-3xl font-bold mb-6 text-white text-center">Registro Biométrico de Usuario</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Datos Personales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo</label>
              <input 
                type="text" 
                required
                className="w-full bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cédula / Documento</label>
              <input 
                type="text" 
                required
                className="w-full bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                value={formData.document_id}
                onChange={e => setFormData({...formData, document_id: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                required
                className="w-full bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de Usuario (Login)</label>
              <input 
                type="text" 
                required
                className="w-full bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Foto */}
            <div className="bg-[rgba(255,255,255,0.05)] p-6 rounded-xl border border-[rgba(255,255,255,0.1)]">
              <h3 className="text-xl text-white mb-4 flex items-center"><Camera className="w-5 h-5 mr-2" /> Fotografía</h3>
              <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center relative mb-4">
                {!photo && !cameraActive && (
                  <button type="button" onClick={startCamera} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full">
                    Encender Cámara
                  </button>
                )}
                {!photo && cameraActive && (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                )}
                {photo && (
                  <img src={photo} alt="Foto capturada" className="w-full h-full object-cover" />
                )}
              </div>
              {cameraActive && !photo && (
                <button type="button" onClick={takePhoto} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium">
                  Capturar Foto
                </button>
              )}
              {photo && (
                <button type="button" onClick={retakePhoto} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium">
                  Tomar otra foto
                </button>
              )}
            </div>

            {/* Firma */}
            <div className="bg-[rgba(255,255,255,0.05)] p-6 rounded-xl border border-[rgba(255,255,255,0.1)]">
              <h3 className="text-xl text-white mb-4 flex items-center"><Pencil className="w-5 h-5 mr-2" /> Firma Digital</h3>
              <div className="bg-white rounded-lg overflow-hidden mb-4 relative" style={{ height: '300px' }}>
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="w-full h-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex space-x-4">
                <button type="button" onClick={clearSignature} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium">
                  Limpiar
                </button>
                <button type="button" onClick={saveSignature} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center">
                  <Check className="w-5 h-5 mr-2" /> Confirmar
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg mt-8 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            Completar Registro
          </button>
        </form>
      </div>
    </div>
  );
}
