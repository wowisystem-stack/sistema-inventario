import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Asset } from '../api';

interface ReturnAssetModalProps {
  asset: Asset;
  onClose: () => void;
  onSubmit: (details: { observations: string; condition_status: string }) => void;
}

const conditionOptions = [
  'En buen estado',
  'Con detalles menores',
  'Dañado / Incompleto',
  'Para mantenimiento'
];

export default function ReturnAssetModal({ asset, onClose, onSubmit }: ReturnAssetModalProps) {
  const [condition, setCondition] = useState(conditionOptions[0]);
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onSubmit({
      observations,
      condition_status: condition,
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Registrar Devolución</h2>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Activo a devolver: <strong style={{ color: 'var(--text-primary)' }}>{asset.unique_code}</strong> - {asset.description}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estado de Entrega</div>
            <select
              className="input-field"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
            >
              {conditionOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Observaciones</div>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Detalla cómo se entrega el activo, accesorios faltantes, etc."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Confirmar Devolución'}
          </button>
        </div>
      </form>
    </div>
  );
}
