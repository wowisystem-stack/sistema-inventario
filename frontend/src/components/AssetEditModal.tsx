import { useState, useEffect, type FormEvent } from 'react';
import { X, Upload } from 'lucide-react';
import { updateAsset, uploadAssetPhoto, getAssetDepreciation, formatCOP, MODULE_LABELS, CATEGORY_LABELS, STATUS_LABELS, type Asset, type Module, type AssetStatus, type Depreciation } from '../api';

interface AssetEditModalProps {
  asset: Asset;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
}

const AssetEditModal = ({ asset, onClose, onSaved }: AssetEditModalProps) => {
  const [form, setForm] = useState({
    description: asset.description,
    brand_model: asset.brand_model,
    status: asset.status,
    module: asset.module,
    area: asset.area ?? '',
    responsible_name: asset.responsible_name ?? '',
    purchase_price: asset.purchase_price?.toString() ?? '',
    purchase_date: asset.purchase_date ? asset.purchase_date.slice(0, 10) : '',
    accessory_1: asset.accessory_1 ?? '',
    accessory_2: asset.accessory_2 ?? '',
    accessory_3: asset.accessory_3 ?? '',
    observations: asset.observations ?? '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depreciation, setDepreciation] = useState<Depreciation | null>(null);

  useEffect(() => {
    getAssetDepreciation(asset.id).then(setDepreciation).catch(() => setDepreciation(null));
  }, [asset.id, asset.purchase_price, asset.purchase_date]);

  const update = (field: keyof typeof form, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let saved = await updateAsset(asset.id, {
        description: form.description,
        brand_model: form.brand_model,
        status: form.status,
        module: form.module,
        area: form.area || undefined,
        responsible_name: form.responsible_name || undefined,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        purchase_date: form.purchase_date ? new Date(form.purchase_date).toISOString() : undefined,
        accessory_1: form.accessory_1 || undefined,
        accessory_2: form.accessory_2 || undefined,
        accessory_3: form.accessory_3 || undefined,
        observations: form.observations || undefined,
      });
      if (photoFile) {
        saved = await uploadAssetPhoto(asset.id, photoFile);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)'
    }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Editar Activo — {asset.unique_code}</h2>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Descripción</div>
            <input className="input-field" value={form.description} onChange={(e) => update('description', e.target.value)} required />
          </label>

          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Marca / Modelo</div>
            <input className="input-field" value={form.brand_model} onChange={(e) => update('brand_model', e.target.value)} />
          </label>

          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estado</div>
              <select className="input-field" value={form.status} onChange={(e) => update('status', e.target.value)}>
                {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Módulo</div>
              <select className="input-field" value={form.module} onChange={(e) => update('module', e.target.value as Module)}>
                {(Object.keys(MODULE_LABELS) as Module[]).map((m) => (
                  <option key={m} value={m}>{MODULE_LABELS[m]}</option>
                ))}
              </select>
            </label>
          </div>

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
              <input className="input-field" type="number" min="0" value={form.purchase_price} onChange={(e) => update('purchase_price', e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fecha de compra</div>
              <input className="input-field" type="date" value={form.purchase_date} onChange={(e) => update('purchase_date', e.target.value)} />
            </label>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
            <div>Categoría detectada: <strong style={{ color: 'var(--text-primary)' }}>{asset.category ? CATEGORY_LABELS[asset.category] : '—'}</strong></div>
            {!form.purchase_price && asset.estimated_value != null && (
              <div style={{ marginTop: '4px' }}>
                Valor estimado de referencia: <strong style={{ color: 'var(--text-primary)' }}>{formatCOP(asset.estimated_value)}</strong>
                <span style={{ opacity: 0.8 }}> — no oficial, se reemplaza al cargar el precio real de compra.</span>
              </div>
            )}
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--surface-border)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Depreciación:</strong>{' '}
              {depreciation?.computable ? (
                <>
                  Valor en libros <strong style={{ color: 'var(--text-primary)' }}>{formatCOP(depreciation.book_value as number)}</strong>
                  {' '}({depreciation.percent_depreciated}% depreciado, vida útil {depreciation.useful_life_years} años)
                </>
              ) : (
                <span>{depreciation?.reason ?? 'Falta precio y/o fecha de compra.'}</span>
              )}
            </div>
          </div>

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
            <textarea className="input-field" rows={3} value={form.observations} onChange={(e) => update('observations', e.target.value)} />
          </label>

          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Foto</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {asset.photo_url && <img src={asset.photo_url} alt={asset.description} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />}
              <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                {photoFile ? photoFile.name : 'Subir foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </label>

          {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AssetEditModal;
