import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Package } from 'lucide-react';
import { createAsset, MODULE_LABELS, type Module, type Asset } from '../api';
import { useModule } from '../moduleContext';
import CameraCapture from '../components/CameraCapture';

const AddAsset = () => {
  const navigate = useNavigate();
  const { module: currentModule } = useModule();
  const [form, setForm] = useState({
    unique_code: '',
    description: '',
    brand_model: '',
    area: '',
    responsible_name: '',
    purchase_price: '',
    purchase_date: '',
    accessory_1: '',
    accessory_2: '',
    accessory_3: '',
    observations: '',
  });
  const [assetModule, setAssetModule] = useState<Module>(currentModule);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAsset, setCreatedAsset] = useState<Asset | null>(null);

  const update = (field: keyof typeof form, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const newAsset = await createAsset({
        unique_code: form.unique_code,
        description: form.description,
        brand_model: form.brand_model,
        module: assetModule,
        area: form.area || undefined,
        responsible_name: form.responsible_name || undefined,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        purchase_date: form.purchase_date ? new Date(form.purchase_date).toISOString() : undefined,
        accessory_1: form.accessory_1 || undefined,
        accessory_2: form.accessory_2 || undefined,
        accessory_3: form.accessory_3 || undefined,
        observations: form.observations || undefined,
        photo_url: photo || undefined,
      });
      setCreatedAsset(newAsset);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintQR = () => {
    if (!createdAsset) return;
    const printWindow = window.open('', '', 'width=400,height=400');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR - ${createdAsset.unique_code}</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 20px; }
              img { width: 200px; height: 200px; margin-bottom: 10px; }
              h2 { margin: 0; font-size: 1.2rem; }
              p { margin: 5px 0 0; color: #555; font-size: 0.9rem; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <img src="data:image/png;base64,${createdAsset.qr_data}" />
            <h2>${createdAsset.unique_code}</h2>
            <p>${createdAsset.description}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (createdAsset) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '32px 24px' }}>
          <div style={{ width: '64px', height: '64px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Package size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Activo Registrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>El activo {createdAsset.unique_code} ha sido registrado correctamente y está listo para préstamo.</p>
          
          {createdAsset.qr_data && (
            <div style={{ background: 'var(--surface-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--surface-border)', marginBottom: '24px' }}>
              <img src={`data:image/png;base64,${createdAsset.qr_data}`} alt="QR" style={{ width: '120px', height: '120px', margin: '0 auto 12px', display: 'block' }} />
              <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handlePrintQR}>
                Imprimir QR
              </button>
            </div>
          )}
          
          <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/dashboard')}>
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Nuevo Activo</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Registrá un activo nuevo — el código QR se genera automáticamente a partir del código único.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Código único *</div>
            <input className="input-field" required value={form.unique_code} onChange={(e) => update('unique_code', e.target.value)} placeholder="ej. 821500" />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Módulo</div>
            <select className="input-field" value={assetModule} onChange={(e) => setAssetModule(e.target.value as Module)}>
              {(Object.keys(MODULE_LABELS) as Module[]).map((m) => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Descripción *</div>
          <input className="input-field" required value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="ej. Portátil Lenovo" />
        </label>

        <label>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Marca / Modelo</div>
          <input className="input-field" value={form.brand_model} onChange={(e) => update('brand_model', e.target.value)} />
        </label>

        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Área</div>
            <input className="input-field" value={form.area} onChange={(e) => update('area', e.target.value)} />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Responsable</div>
            <input className="input-field" value={form.responsible_name} onChange={(e) => update('responsible_name', e.target.value)} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Precio de compra (COP)</div>
            <input className="input-field" type="number" min="0" value={form.purchase_price} onChange={(e) => update('purchase_price', e.target.value)} placeholder="ej. 2500000" />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fecha de compra</div>
            <input className="input-field" type="date" value={form.purchase_date} onChange={(e) => update('purchase_date', e.target.value)} />
          </label>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '-8px 0 0' }}>
          El precio y la fecha son opcionales, pero sin ellos el sistema no puede calcular la depreciación del activo. La categoría se detecta automáticamente a partir de la descripción.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Accesorio 1</div>
            <input className="input-field" value={form.accessory_1} onChange={(e) => update('accessory_1', e.target.value)} />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Accesorio 2</div>
            <input className="input-field" value={form.accessory_2} onChange={(e) => update('accessory_2', e.target.value)} />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Accesorio 3</div>
            <input className="input-field" value={form.accessory_3} onChange={(e) => update('accessory_3', e.target.value)} />
          </label>
        </div>

        <label>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Observaciones</div>
          <textarea className="input-field" rows={2} value={form.observations} onChange={(e) => update('observations', e.target.value)} />
        </label>

        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Camera size={14} /> Foto del activo
          </div>
          <div style={{ maxWidth: '280px' }}>
            <CameraCapture photo={photo} onCapture={setPhoto} onRetake={() => setPhoto(null)} aspect="4 / 3" facingMode="environment" />
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <Package size={16} /> {submitting ? 'Guardando...' : 'Crear Activo'}
        </button>
      </form>
    </div>
  );
};

export default AddAsset;
