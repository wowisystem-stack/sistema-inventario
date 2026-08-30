import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Pencil, Copy } from "lucide-react";
import { registerUser } from "../api";
import { setToken } from "../session";
import CameraCapture from "../components/CameraCapture";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    document_id: "",
    email: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [photo, setPhoto] = useState<string | null>(null);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return alert("Debes tomarte una foto.");

    // Si no han dado click a "Guardar firma", la guardamos autómaticamente
    let finalSignature = signature;
    if (!finalSignature && canvasRef.current) {
        finalSignature = canvasRef.current.toDataURL("image/png");
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await registerUser({
        full_name: formData.full_name,
        document_id: formData.document_id,
        email: formData.email,
        photo_url: photo,
        digital_signature_url: finalSignature ?? undefined,
      });
      setToken(res.token);
      setGeneratedPassword(res.generated_password);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (generatedPassword) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="liquid-glass p-8 rounded-2xl text-center">
          <Check className="w-12 h-12 mx-auto mb-4 text-green-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Perfil creado</h1>
          <p className="text-gray-300 mb-6">Guardá esta contraseña — no se va a volver a mostrar.</p>
          <div className="bg-black/40 border border-white/10 rounded-lg p-4 mb-6 flex items-center justify-between gap-3">
            <code className="text-lg text-green-300 break-all">{generatedPassword}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(generatedPassword)}
              className="shrink-0 bg-white/10 hover:bg-white/20 p-2 rounded-lg"
              title="Copiar"
            >
              <Copy className="w-4 h-4 text-white" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
          >
            Ya la guardé, continuar
          </button>
        </div>
      </div>
    );
  }

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Foto */}
            <div className="bg-[rgba(255,255,255,0.05)] p-6 rounded-xl border border-[rgba(255,255,255,0.1)]">
              <h3 className="text-xl text-white mb-4 flex items-center"><Camera className="w-5 h-5 mr-2" /> Fotografía</h3>
              <CameraCapture photo={photo} onCapture={setPhoto} onRetake={() => setPhoto(null)} aspect="1 / 1" />
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

          {submitError && <p className="text-red-400 text-sm text-center">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg mt-8 shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-60"
          >
            {submitting ? "Creando perfil..." : "Completar Registro"}
          </button>
        </form>
      </div>
    </div>
  );
}
