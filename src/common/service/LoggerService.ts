import { provide } from 'inversify-binding-decorators';
import { ILoggerService } from '../contract';

@provide(ILoggerService)
export class LoggerService implements ILoggerService {
	public log(message: string): void {
		console.log(`[log]: ${message}`);
	}

	public warn(message: string): void {
		console.warn(`[warn]: ${message}`);
	}

	public error(message: string): void {
		console.error(`[error]: ${message}`);
	}
}
