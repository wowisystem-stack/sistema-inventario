import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getUnusedAssets, formatCOP, type UnusedAsset } from '../api';
import { useModule } from '../moduleContext';

const UnusedAssets = () => {
  const { module } = useModule();
  const [assets, setAssets] = useState<UnusedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getUnusedAssets(module)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [module]);

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Activos sin Uso</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Disponibles hace más de 180 días sin ningún préstamo (o nunca prestados) — candidatos a evaluar para venta.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger-color)' }}>Error: {error}</div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          No hay activos inactivos en este módulo. 🎉
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {assets.map((asset) => (
            <div key={asset.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <AlertTriangle size={16} style={{ color: 'var(--warning-color)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{asset.unique_code}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{asset.description}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  {asset.brand_model} {asset.area && `· ${asset.area}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>
                  {asset.days_since_last_use != null ? `${asset.days_since_last_use} días sin uso` : 'Nunca prestado'}
                </div>
                {(asset.purchase_price ?? asset.estimated_value) != null && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatCOP((asset.purchase_price ?? asset.estimated_value) as number)}
                    {!asset.purchase_price && ' (estimado)'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnusedAssets;
