import { render } from 'preact';
import { App } from './App';
import './index.css';

// Configure Tailwind if needed
if (window.tailwind) {
  window.tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {},
    },
  };
}

render(<App />, document.getElementById('app')!);
