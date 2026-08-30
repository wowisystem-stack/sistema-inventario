import { useState, useEffect } from 'react';
import { Search, Pencil } from 'lucide-react';
import { getAssets, getUsers, getRolePermissions, formatCOP, STATUS_LABELS, type Asset, type Category } from '../api';
import { useModule } from '../moduleContext';
import { getCurrentUserId } from '../identity';
import AssetEditModal from '../components/AssetEditModal';
import RequestLoanModal from '../components/RequestLoanModal';

const Dashboard = () => {
  const { module } = useModule();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [requestingAsset, setRequestingAsset] = useState<Asset | null>(null);
  const [requestedMsg, setRequestedMsg] = useState<string | null>(null);
  const [allowedCategories, setAllowedCategories] = useState<Set<Category> | null>(null);

  useEffect(() => {
    setLoading(true);
    getAssets(module)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [module]);

  // Un empleado con cargo asignado solo ve las categorías permitidas para ese
  // cargo (Fase 8). Admin/encargado/salida, o empleados sin cargo aún, ven todo.
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId === null) return;
    getUsers().then((users) => {
      const current = users.find(u => u.id === userId);
      if (!current || current.role !== 'empleado' || !current.cargo) {
        setAllowedCategories(null);
        return;
      }
      getRolePermissions().then((perms) => {
        const match = perms.find(p => p.cargo === current.cargo);
        setAllowedCategories(match ? new Set(match.allowed_categories.split(',') as Category[]) : null);
      });
    });
  }, []);

  const filteredAssets = assets.filter(a =>
    (a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.area?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (a.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)) &&
    (allowedCategories === null || a.category === null || allowedCategories.has(a.category))
  );

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Catálogo de Activos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {loading ? 'Cargando...' : `${filteredAssets.length} activos ${allowedCategories ? 'visibles para tu cargo' : 'registrados'}`}
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
                {(asset.purchase_price || asset.estimated_value) != null && (
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

export default Dashboard;
