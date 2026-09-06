import type { PropsWithChildren } from 'react';
import { Toast } from '@base-ui/react/toast';
import { Tooltip } from '@base-ui/react/tooltip';
import './index.less';

function ToastList() {
	const { toasts } = Toast.useToastManager();

	return toasts.map((toast) => (
		<Toast.Root key={toast.id} toast={toast} className='ui-toast'>
			<Toast.Content className='ui-toast__content'>
				<Toast.Description className='ui-toast__description' />
			</Toast.Content>
		</Toast.Root>
	));
}

export function AppUiProvider({ children }: PropsWithChildren) {
	return (
		<Tooltip.Provider delay={450} closeDelay={80}>
			<Toast.Provider limit={2} timeout={5000}>
				{children}
				<Toast.Portal>
					<Toast.Viewport className='ui-toast-viewport'>
						<ToastList />
					</Toast.Viewport>
				</Toast.Portal>
			</Toast.Provider>
		</Tooltip.Provider>
	);
}
