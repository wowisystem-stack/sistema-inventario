import { useState, useEffect } from 'react';
import { Search, Printer } from 'lucide-react';
import { getAssets, type Asset } from '../api';
import { useModule } from '../moduleContext';

const QRCodes = () => {
  const { module } = useModule();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    getAssets(module)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [module]);

  const filtered = assets.filter(a =>
    a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.unique_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="header no-print">
        <div>
          <h1 className="title">Códigos QR</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {loading ? 'Cargando...' : `${filtered.length} stickers listos para imprimir`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={18} /> Imprimir
        </button>
      </div>

      <div className="no-print" style={{ marginBottom: '32px', position: 'relative', maxWidth: '400px' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input-field"
          placeholder="Buscar por código o descripción..."
          style={{ paddingLeft: '44px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="no-print" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : error ? (
        <div className="no-print" style={{ textAlign: 'center', padding: '60px', color: 'var(--danger-color)' }}>Error: {error}</div>
      ) : (
        <div className="qr-sticker-grid">
          {filtered.map((asset) => (
            <div key={asset.id} className="qr-sticker">
              <img src={`data:image/png;base64,${asset.qr_data}`} alt={asset.unique_code} />
              <div className="qr-sticker-code">{asset.unique_code}</div>
              <div className="qr-sticker-desc">{asset.description}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .qr-sticker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        .qr-sticker {
          background: white;
          color: #0f172a;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .qr-sticker img { width: 100%; height: auto; display: block; }
        .qr-sticker-code { font-weight: 700; font-size: 0.9rem; margin-top: 6px; }
        .qr-sticker-desc { font-size: 0.75rem; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        @media print {
          .no-print { display: none !important; }
          .app-layout > nav, .liquid-glass { display: none !important; }
          .page-container { max-width: none; padding: 0; margin: 0; }
          .qr-sticker-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
          .qr-sticker {
            break-inside: avoid;
            border: 1px solid #ccc;
          }
        }
      `}</style>
    </div>
  );
};

export default QRCodes;
