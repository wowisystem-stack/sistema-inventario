const STORAGE_KEY = 'current_user_id';

export const getCurrentUserId = (): number | null => {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : null;
};

export const setCurrentUserId = (id: number): void => {
  sessionStorage.setItem(STORAGE_KEY, String(id));
};

export const clearCurrentUserId = (): void => {
  sessionStorage.removeItem(STORAGE_KEY);
};
