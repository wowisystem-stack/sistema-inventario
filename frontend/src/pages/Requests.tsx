import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import {
  getAssetRequests, assignAssetRequest, rejectAssetRequest, getAssets,
  CATEGORY_LABELS, type AssetRequest, type Asset,
} from '../api';
import { useModule } from '../moduleContext';
import UserProfileCard from '../components/UserProfileCard';
import RequestCommentThread from '../components/RequestCommentThread';

const Requests = () => {
  const { module } = useModule();
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getAssetRequests('pending'), getAssets(module)])
      .then(([reqs, assets]) => {
        setRequests(reqs.filter(r => r.module === module || r.module === null));
        setAvailableAssets(assets.filter(a => a.status === 'available'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [module]);

  const assetsFor = (req: AssetRequest) =>
    req.category_requested
      ? availableAssets.filter(a => a.category === req.category_requested)
      : availableAssets;

  const handleAssign = async (req: AssetRequest) => {
    const assetId = selectedAsset[req.id];
    if (!assetId) return;
    setProcessingId(req.id);
    try {
      await assignAssetRequest(req.id, Number(assetId));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: AssetRequest) => {
    setProcessingId(req.id);
    try {
      await rejectAssetRequest(req.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Solicitudes de Empleados</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Cada solicitud describe qué necesita la persona — elegí un activo disponible para asignárselo.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger-color)' }}>Error: {error}</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          No hay solicitudes pendientes en este módulo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map((req) => {
            const options = assetsFor(req);
            return (
              <div key={req.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <UserProfileCard
                    user={req.requester}
                    subtitle={req.category_requested ? CATEGORY_LABELS[req.category_requested] : undefined}
                  />
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '8px' }}>{req.description}</div>
                </div>

                <RequestCommentThread requestId={req.id} />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="input-field"
                    style={{ flex: 1, minWidth: '220px' }}
                    value={selectedAsset[req.id] ?? ''}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, [req.id]: e.target.value })}
                  >
                    <option value="">
                      {options.length === 0 ? 'No hay activos disponibles de esa categoría' : 'Elegir activo disponible...'}
                    </option>
                    {options.map(a => (
                      <option key={a.id} value={a.id}>{a.unique_code} — {a.description}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    disabled={!selectedAsset[req.id] || processingId === req.id}
                    onClick={() => handleAssign(req)}
                  >
                    <Check size={16} /> Asignar
                  </button>
                  <button
                    className="btn"
                    style={{ background: 'var(--danger-color)', color: 'white' }}
                    disabled={processingId === req.id}
                    onClick={() => handleReject(req)}
                  >
                    <X size={16} /> Rechazar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Requests;
