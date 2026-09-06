import { useState, useEffect } from 'react';
import { Search, Printer, Sparkles } from 'lucide-react';
import { getAssets, batchGenerateAssets, MODULE_LABELS, type Asset, type Module } from '../api';
import { useModule } from '../moduleContext';

const MODULE_PREFIXES: Record<Module, string> = {
  elite_nutricion: 'EN',
  estudio: 'ES',
  estadio: 'ED',
  futupro: 'FP',
};

const QRCodes = () => {
  const { module } = useModule();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  const [batchModule, setBatchModule] = useState<Module>(module);
  const [prefix, setPrefix] = useState(MODULE_PREFIXES[module]);
  const [quantity, setQuantity] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAssets(module)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [module]);

  const handleGenerateBatch = async () => {
    setGenerating(true);
    setBatchError(null);
    try {
      const newAssets = await batchGenerateAssets({ module: batchModule, prefix, quantity });
      if (batchModule === module) {
        setAssets((prev) => [...prev, ...newAssets]);
      }
      setOnlyPending(true);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const filtered = assets
    .filter(a => !onlyPending || a.status === 'pending_registration')
    .filter(a =>
      (a.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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

      <div className="no-print glass-panel" style={{ marginBottom: '24px', padding: '20px', maxWidth: '640px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>
          <Sparkles size={18} /> Generar lote de códigos
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 140px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Módulo</div>
            <select
              className="input-field"
              value={batchModule}
              onChange={(e) => {
                const m = e.target.value as Module;
                setBatchModule(m);
                setPrefix(MODULE_PREFIXES[m]);
              }}
            >
              {(Object.keys(MODULE_LABELS) as Module[]).map((m) => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
          </label>
          <label style={{ flex: '1 1 100px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Prefijo</div>
            <input className="input-field" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          </label>
          <label style={{ flex: '1 1 100px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cantidad</div>
            <input className="input-field" type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </label>
          <button className="btn btn-primary" onClick={handleGenerateBatch} disabled={generating || !prefix}>
            {generating ? 'Generando...' : 'Generar e imprimir'}
          </button>
        </div>
        {batchError && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginTop: '8px' }}>{batchError}</p>}
      </div>

      <div className="no-print" style={{ marginBottom: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '400px', flex: '1 1 260px' }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Mostrar solo pendientes
        </label>
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
              <div className="qr-sticker-desc">{asset.description ?? 'Pendiente de registro'}</div>
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
