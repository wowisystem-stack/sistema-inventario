import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Module } from './api';

const STORAGE_KEY = 'current_module';

interface ModuleContextValue {
  module: Module;
  setModule: (module: Module) => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

const readStored = (): Module => {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === 'elite_nutricion' || stored === 'estudio' || stored === 'estadio' || stored === 'futupro') {
    return stored;
  }
  return 'elite_nutricion';
};

export const ModuleProvider = ({ children }: { children: ReactNode }) => {
  const [module, setModuleState] = useState<Module>(readStored);

  const setModule = (next: Module) => {
    setModuleState(next);
    sessionStorage.setItem(STORAGE_KEY, next);
  };

  return <ModuleContext.Provider value={{ module, setModule }}>{children}</ModuleContext.Provider>;
};

export const useModule = (): ModuleContextValue => {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error('useModule debe usarse dentro de ModuleProvider');
  return ctx;
};
