import { FC } from 'react';
import Editor from './widget/editor';
import { Toolbar } from './widget/toolbar';
import { Property } from './widget/property';
import { AppUiProvider } from './ui/AppUiProvider';

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
