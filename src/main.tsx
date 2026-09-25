import 'reflect-metadata';
import '@lineform/i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ContextProvider } from '@lineform/common/context';
import './normalized.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<ContextProvider>
			<App />
		</ContextProvider>
	</React.StrictMode>,
);
