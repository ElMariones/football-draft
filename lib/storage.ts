const API_KEY = 'fd:openaiKey';

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
