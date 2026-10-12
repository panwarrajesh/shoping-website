import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { endSession, startSession } from './store/authSlice';
import { setAuthHandlers } from './services/api';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import './index.css';

// Lets the API layer update Redux when a token is refreshed or the session dies
setAuthHandlers({
  onRefresh: (d) => store.dispatch(startSession(d)),
  onFail: () => store.dispatch(endSession()),
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider><App /></ToastProvider>
    </Provider>
  </React.StrictMode>
);
