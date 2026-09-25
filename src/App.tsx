import { FC } from 'react';
import { Editor, Property, Toolbar } from '@lineform/widget';
import { AppUiProvider } from '@lineform/ui';

interface DemoProps {}

const App: FC<DemoProps> = (_props) => {
	return (
		<AppUiProvider>
			<div className='app-layout'>
				<Toolbar />
				<Editor />
				<Property />
			</div>
		</AppUiProvider>
	);
};

export default App;
