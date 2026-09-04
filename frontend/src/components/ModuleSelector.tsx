import { useModule } from '../moduleContext';
import { MODULE_LABELS, type Module } from '../api';
import { Layers } from 'lucide-react';

interface ModuleSelectorProps {
  disabled?: boolean;
}

export default function ModuleSelector({ disabled }: ModuleSelectorProps) {
  const { module, setModule } = useModule();
  const modules = Object.keys(MODULE_LABELS) as Module[];

  return (
    <div className="w-full flex justify-center my-6 px-4">
      <div 
        className={`liquid-glass p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-sm max-w-full ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ 
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        {modules.map((m) => {
          const isActive = module === m;
          return (
            <button
              key={m}
              onClick={() => setModule(m)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out whitespace-nowrap
                ${isActive 
                  ? 'bg-white text-[var(--gold-deep)] shadow-[0_2px_10px_rgba(0,0,0,0.08)] scale-100'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/50 scale-95'}
              `}
            >
              {isActive && <Layers size={16} />}
              {MODULE_LABELS[m]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
