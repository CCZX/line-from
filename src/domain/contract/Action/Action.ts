export interface IAction<T> {
	type: ActionTypeEnum;

	data: T;

	/**
	 * 生成对应的 back action（用于 undo）
	 */
	genBackAction(): IAction<T>;

	/**
	 * 是否需要添加到日志中
	 */
	setNeedAddLog(needAdd: boolean): void;
	getNeedAddLog(): boolean;
}

export interface IActionExecute {
	type: ActionTypeEnum;

	execute(action: IAction<unknown>): void;
}

export const IActionExecute = Symbol('IActionExecute');

export enum ActionTypeEnum {
	/**
	 * 更新图形属性
	 */
	UpdateShapeProps = 'updateShapeProps',
	/**
	 * 创建图形
	 */
	CreateShape = 'createShape',
	/**
	 * 删除图形
	 */
	RemoveShape = 'removeShape',
}
