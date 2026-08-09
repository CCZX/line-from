import 'reflect-metadata';
import './i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ContextProvider } from './common/context';
import './normalized.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<ContextProvider>
			<App />
		</ContextProvider>
	</React.StrictMode>,
);
