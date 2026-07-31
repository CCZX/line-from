import { IAction } from './Action';

export interface IPreActionInterceptor {
	order: number;

	intercept(action: IAction<unknown>): void;
}

export const IPreActionInterceptor = Symbol('IPreActionInterceptor');

export interface IPostActionInterceptor {
	order: number;

	intercept(action: IAction<unknown>): void;
}

export const IPostActionInterceptor = Symbol('IPostActionInterceptor');
