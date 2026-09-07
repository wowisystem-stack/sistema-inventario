import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Filter, 
  AlertCircle,
  Package,
  Activity
} from 'lucide-react';
import { 
  getAssets, 
  formatCOP, 
  CATEGORY_LABELS, 
  type Asset, 
  type Category,
  MODULE_LABELS
} from '../api';
import { useModule } from '../moduleContext';
import { getCachedUser } from '../components/LoginGate';
import { Navigate } from 'react-router-dom';

const Accounting = () => {
  const { module } = useModule();
  const currentUser = getCachedUser();
  const isAdmin = currentUser?.role === 'admin';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');

  useEffect(() => {
    setLoading(true);
    getAssets(module)
      .then(setAssets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [module]);

  // Derivar datos filtrados
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = 
        (asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (asset.brand_model?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (asset.unique_code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'ALL' || asset.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchQuery, selectedCategory]);

  // Calcular totales sobre activos filtrados (o sobre totales? Sobre filtrados es más interactivo)
  const stats = useMemo(() => {
    let totalPurchasePrice = 0;
    let totalEstimatedValue = 0;
    let totalLegacyValue = 0; // valor del campo 'value'
    let missingValuesCount = 0;

    filteredAssets.forEach(asset => {
      totalPurchasePrice += asset.purchase_price || 0;
      totalEstimatedValue += asset.estimated_value || 0;
      totalLegacyValue += asset.value || 0;
      
      if (!asset.purchase_price && !asset.estimated_value && !asset.value) {
        missingValuesCount++;
      }
    });

    return {
      count: filteredAssets.length,
      totalPurchasePrice,
      totalEstimatedValue,
      totalLegacyValue,
      missingValuesCount
    };
  }, [filteredAssets]);

  // Si no es admin, no puede ver esto
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="text-blue-500" />
            Contabilidad y Auditoría
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen financiero de activos en {MODULE_LABELS[module]}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="liquid-glass p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Activos (Filtro)</p>
            <p className="text-2xl font-bold">{stats.count}</p>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Precio Compra Total</p>
            <p className="text-xl font-bold">{formatCOP(stats.totalPurchasePrice)}</p>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Valor Estimado Total</p>
            <p className="text-xl font-bold">{formatCOP(stats.totalEstimatedValue)}</p>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sin Valor Registrado</p>
            <p className="text-2xl font-bold text-amber-600">{stats.missingValuesCount}</p>
          </div>
        </div>
      </div>

      {/* Controles de Filtrado */}
      <div className="liquid-glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por código, descripción o marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-gray-400" size={20} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category | 'ALL')}
            className="w-full md:w-48 p-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">Todas las Categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Activos */}
      <div className="liquid-glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <Activity className="animate-spin text-blue-500 mb-2" size={32} />
            <p>Cargando datos contables...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron activos con estos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600 text-sm">Código</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Descripción / Marca</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Categoría</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm text-right">Precio de Compra</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm text-right">Valor Estimado</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(asset => {
                  const noValue = !asset.purchase_price && !asset.estimated_value && !asset.value;
                  return (
                    <tr 
                      key={asset.id} 
                      className={`border-b border-gray-50 hover:bg-white/40 transition-colors ${noValue ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="p-4 text-sm font-medium text-gray-700">
                        {asset.unique_code}
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-800 line-clamp-1">{asset.description || 'Sin descripción'}</p>
                        <p className="text-xs text-gray-500">{asset.brand_model || 'Sin marca'}</p>
                      </td>
                      <td className="p-4 text-sm">
                        {asset.category ? (
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-600 text-xs font-medium">
                            {CATEGORY_LABELS[asset.category]}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin categorizar</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-right font-medium">
                        {asset.purchase_price ? formatCOP(asset.purchase_price) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="p-4 text-sm text-right font-medium">
                        {asset.estimated_value ? formatCOP(asset.estimated_value) : (
                           asset.value ? formatCOP(asset.value) : <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Accounting;
