const STORAGE_KEY = 'app_password';

export const getPassword = (): string => sessionStorage.getItem(STORAGE_KEY) || '';

export const setPassword = (value: string): void => {
  sessionStorage.setItem(STORAGE_KEY, value);
};

export const clearPassword = (): void => {
  sessionStorage.removeItem(STORAGE_KEY);
};
