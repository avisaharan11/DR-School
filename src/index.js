import React from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import App from './App';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  //<React.StrictMode>
  <HashRouter basename={process.env.PUBLIC_URL}>
    <App />
  </HashRouter>
  //</React.StrictMode>
);
