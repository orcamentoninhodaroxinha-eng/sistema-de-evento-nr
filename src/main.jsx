import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister stale service workers that may cache outdated JS modules
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      // Keep only OneSignal SW; unregister anything else that could cache Vite chunks
      if (!reg.scope.includes('OneSignal') && !reg.active?.scriptURL?.includes('OneSignal')) {
        reg.unregister();
      }
    }
  });

  // If the page is being served from SW cache and React is null, force a hard reload once
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)