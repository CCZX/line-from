import 'reflect-metadata';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ContextProvider } from './common/context';
import { SketchProvider } from 'sketchbook-ui';
import 'sketchbook-ui/style.css';
import './normalized.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<ContextProvider>
			<SketchProvider>
				<App />
			</SketchProvider>
		</ContextProvider>
	</React.StrictMode>,
);
