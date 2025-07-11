
// Polyfill for process.env in browser (for CRA/webpack if needed)
if (typeof process === 'undefined') {
  window.process = { env: { REACT_APP_WS_URL: '' } };
}

import React from 'react';
import ReactDOM from 'react-dom';
import AppWrapper from './App';
import './styles/index.css';
import './styles/Header.css';
import './styles/Target.css';

ReactDOM.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
  document.getElementById('root')
);