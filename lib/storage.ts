const API_KEY = 'fd:openaiKey';
const MODEL_KEY = 'fd:openaiModel';
const DEFAULT_MODEL = 'gpt-4o-mini';

export function getModel(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  return window.localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODEL;
}

export function setModel(model: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODEL_KEY, model);
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(API_KEY) ?? '';
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key) {
    window.localStorage.removeItem(API_KEY);
  } else {
    window.localStorage.setItem(API_KEY, key);
  }
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(API_KEY);
}
