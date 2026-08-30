import { useState, useEffect, type FormEvent } from 'react';
import { Search, Pencil, Send } from 'lucide-react';
import {
  getAssets, formatCOP, STATUS_LABELS, CATEGORY_LABELS,
  createAssetRequest, getMyAssetRequests,
  type Asset, type Category, type AssetRequest,
} from '../api';
import { useModule } from '../moduleContext';
import { getCachedUser } from '../components/LoginGate';
import AssetEditModal from '../components/AssetEditModal';
import RequestLoanModal from '../components/RequestLoanModal';

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignada', rejected: 'Rechazada',
};

const EmployeeRequestView = () => {
  const [category, setCategory] = useState<Category | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMyAssetRequests().then(setMyRequests).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createAssetRequest(category || undefined, description);
      setDescription('');
      setCategory('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Solicitar un Activo</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Contanos qué necesitás y para qué — el encargado revisa tu pedido y te asigna el activo disponible que corresponda.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '520px' }}>
        <label>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tipo de activo (opcional)</div>
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            <option value="">No estoy seguro / otro</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <label>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>¿Qué necesitás y para qué?</div>
          <textarea className="input-field" rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <Send size={16} /> {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Mis solicitudes</h2>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : myRequests.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Todavía no enviaste ninguna solicitud.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {myRequests.map((r) => (
            <div key={r.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.category_requested ? CATEGORY_LABELS[r.category_requested] : 'Sin categoría'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{r.description}</div>
              </div>
              <span className={`badge ${r.status === 'assigned' ? 'badge-available' : r.status === 'rejected' ? 'badge-maintenance' : 'badge-loaned'}`}>
                {REQUEST_STATUS_LABELS[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CatalogView = () => {
  const { module } = useModule();
  const currentUser = getCachedUser();
  const canSeeValues = currentUser?.role === 'admin' || currentUser?.role === 'encargado';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [requestingAsset, setRequestingAsset] = useState<Asset | null>(null);
  const [requestedMsg, setRequestedMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAssets(module)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [module]);

  const filteredAssets = assets.filter(a =>
    a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.area?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (a.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Catálogo de Activos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {loading ? 'Cargando...' : `${filteredAssets.length} activos registrados`}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '32px', position: 'relative', maxWidth: '400px' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input-field"
          placeholder="Buscar por código, descripción, área o responsable..."
          style={{ paddingLeft: '44px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Cargando activos...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger-color)' }}>
          Error al cargar activos: {error}
        </div>
      ) : (
        <div className="grid-cards">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{asset.unique_code}</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>{asset.description}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge badge-${asset.status}`}>
                    {STATUS_LABELS[asset.status]}
                  </span>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px' }}
                    onClick={() => setEditingAsset(asset)}
                    title="Editar activo"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Marca/Modelo:</span> {asset.brand_model || '—'}</div>
                {asset.area && <div><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Área:</span> {asset.area}</div>}
                {asset.responsible_name && <div><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Responsable:</span> {asset.responsible_name}</div>}
                {canSeeValues && (asset.purchase_price || asset.estimated_value) != null && (
                  <div>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Valor:</span>{' '}
                    {formatCOP((asset.purchase_price ?? asset.estimated_value) as number)}
                    {asset.value_source === 'estimado' && (
                      <span style={{ opacity: 0.7 }}> (estimado, no oficial)</span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--surface-border)' }}>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  disabled={asset.status !== 'available'}
                  onClick={() => setRequestingAsset(asset)}
                >
                  Solicitar Préstamo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingAsset && (
        <AssetEditModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSaved={(updated) => setAssets(
            updated.module === module
              ? assets.map(a => (a.id === updated.id ? updated : a))
              : assets.filter(a => a.id !== updated.id)
          )}
        />
      )}

      {requestingAsset && (
        <RequestLoanModal
          asset={requestingAsset}
          onClose={() => setRequestingAsset(null)}
          onRequested={() => {
            setRequestedMsg(`Solicitud enviada para ${requestingAsset.unique_code}. Queda pendiente de aprobación.`);
            setTimeout(() => setRequestedMsg(null), 5000);
          }}
        />
      )}

      {requestedMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 300,
          background: 'var(--success-color)', color: 'white', padding: '14px 20px', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {requestedMsg}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const currentUser = getCachedUser();
  return currentUser?.role === 'empleado' ? <EmployeeRequestView /> : <CatalogView />;
};

export default Dashboard;
