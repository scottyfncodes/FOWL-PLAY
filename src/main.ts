import './styles/main.css';
import { Store } from './state/store';
import { App } from './ui/app';
import { registerSW } from 'virtual:pwa-register';

function safeStorage(): Storage | null {
  try {
    const t = '__fowl_test__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return null;
  }
}

const mount = document.getElementById('app');
if (!mount) throw new Error('missing #app');
const store = new Store(safeStorage());
const app = new App(store, mount);
window.addEventListener('pagehide', () => store.persistNow());
window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.persistNow(); });

// Expose for debugging / e2e tests only.
(window as unknown as { __fowl?: unknown }).__fowl = { store, app };

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
