const TOKEN_KEY = 'auth_token';

// localStorage (no sessionStorage): la sesión debe sobrevivir a cerrar/reabrir
// el navegador o abrir el sitio en una pestaña nueva (ej. al usar la cámara
// para escanear un QR en el celular), que es cuando sessionStorage se pierde
// y causa un "No autenticado" en medio de una acción normal.
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};
