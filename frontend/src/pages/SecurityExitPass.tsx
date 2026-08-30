import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoan, checkoutLoanSecurity, type Loan } from '../api';
import { CheckCircle, Shield, Check } from 'lucide-react';

export default function SecurityExitPass() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (id) {
      getLoan(parseInt(id))
        .then((data) => {
          setLoan(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id]);

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

  const stopDrawing = () => setIsDrawing(false);

  const handleConfirmExit = async () => {
    if (!canvasRef.current) return;
    const signatureBase64 = canvasRef.current.toDataURL("image/png");
    
    try {
      await checkoutLoanSecurity(loan!.id, signatureBase64);
      alert("Salida confirmada y registrada en el sistema.");
      navigate("/scanner");
    } catch (err: any) {
      alert("Error confirmando salida: " + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Cargando Pase de Salida...</div>;
  if (error || !loan) return <div className="p-8 text-center text-red-500">Error: {error || "Préstamo no encontrado"}</div>;

  const isCheckedOut = loan.status === 'checked_out' || loan.status === 'returned';

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="liquid-glass p-6 md:p-10 rounded-2xl relative overflow-hidden">
        {isCheckedOut && (
          <div className="absolute top-0 right-0 bg-green-500 text-white px-8 py-2 rounded-bl-2xl font-bold uppercase tracking-wider flex items-center shadow-lg">
            <CheckCircle className="w-5 h-5 mr-2" /> Salida Completada
          </div>
        )}

        <div className="flex items-center justify-center mb-8">
          <Shield className="w-10 h-10 text-blue-400 mr-3" />
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Pase de Salida Oficial</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna Empleado */}
          <div className="bg-[rgba(0,0,0,0.3)] p-6 rounded-xl border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">Datos del Empleado</h2>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl mb-4 bg-gray-800">
                {(loan.borrower as any).photo_url ? (
                  <img src={(loan.borrower as any).photo_url} alt="Foto Empleado" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sin foto</div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white text-center">{loan.borrower.full_name}</h3>
              <p className="text-blue-300">C.C. {loan.borrower.document_id}</p>
            </div>

            <div className="bg-white p-2 rounded-lg mt-4 h-32 flex items-center justify-center relative">
              <span className="absolute top-2 left-2 text-xs text-gray-400 font-bold">Firma del Solicitante</span>
              {(loan.borrower as any).digital_signature_url ? (
                <img src={(loan.borrower as any).digital_signature_url} alt="Firma Empleado" className="max-h-full max-w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="text-gray-400 italic">No hay firma registrada</div>
              )}
            </div>
          </div>

          {/* Columna Activo */}
          <div className="bg-[rgba(0,0,0,0.3)] p-6 rounded-xl border border-[rgba(255,255,255,0.1)] flex flex-col">
            <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">Datos del Activo</h2>
            
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-gray-400">Código Único</p>
                <p className="text-xl font-mono text-white bg-black/40 px-3 py-1 rounded inline-block mt-1">
                  {loan.asset.unique_code}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Descripción</p>
                <p className="text-lg text-white">{loan.asset.description}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400">Marca / Modelo</p>
                <p className="text-white">{loan.asset.brand_model}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Fecha Solicitud</p>
                  <p className="text-white">{new Date(loan.request_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Estado Préstamo</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold mt-1 inline-block ${
                    loan.status === 'approved' ? 'bg-blue-900/50 text-blue-300 border border-blue-500' :
                    loan.status === 'checked_out' ? 'bg-green-900/50 text-green-300 border border-green-500' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {loan.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zona de Validación Pentágono */}
        {!isCheckedOut && loan.status === 'approved' && (
          <div className="mt-8 border-t border-gray-700 pt-8">
            <h2 className="text-2xl font-bold text-center text-white mb-6 flex items-center justify-center">
              <Shield className="w-6 h-6 mr-2 text-yellow-500" />
              Validación de Seguridad (Pentágono)
            </h2>
            
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-xl overflow-hidden mb-4 relative" style={{ height: '200px' }}>
                <span className="absolute top-2 left-2 text-xs text-gray-400 font-bold pointer-events-none">Firma Guardia en Turno</span>
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={200}
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
                <button 
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext("2d");
                      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }} 
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium"
                >
                  Limpiar
                </button>
                <button 
                  onClick={handleConfirmExit}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Confirmar Salida
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mostrar firma de Pentágono si ya salió */}
        {isCheckedOut && (loan as any).security_signature_url && (
          <div className="mt-8 border-t border-gray-700 pt-8 flex flex-col items-center">
             <h2 className="text-xl font-bold text-gray-400 mb-4">Validado por Seguridad</h2>
             <div className="bg-white p-2 rounded-lg h-32 flex items-center justify-center relative w-64">
                <img src={(loan as any).security_signature_url} alt="Firma Pentágono" className="max-h-full max-w-full object-contain mix-blend-multiply" />
             </div>
             <p className="text-gray-500 text-sm mt-2">Salida registrada el: {new Date(loan.checkout_date!).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
