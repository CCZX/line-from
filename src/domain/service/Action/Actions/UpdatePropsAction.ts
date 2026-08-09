import { AbsAction } from '../AbsAction';
import { ActionTypeEnum } from '../../../contract/Action';
import { ShapeData, ShapePropertyEnum } from '@/shape/contract';
import { IocContainerService } from '@/common/contract';
import { IShapeManager } from '@/domain/contract';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { FillProperty } from '@/shape/property/FillProperty';
import { StrokeProperty } from '@/shape/property/StrokeProperty';
import { LineProperty } from '@/shape/property/LineProperty';
import { TextProperty } from '@/shape/property/TextProperty';

export class UpdatePropsAction extends AbsAction<ShapeData[]> {
	public type: ActionTypeEnum.UpdateShapeProps = ActionTypeEnum.UpdateShapeProps;
	public data: ShapeData[];

	constructor(data: ShapeData[], ioc: IocContainerService) {
		super(ioc);
		this.data = data;
	}

	public genBackAction(): UpdatePropsAction {
		const shapeManager = this.ioc.get<IShapeManager>(IShapeManager);

		const shapeDatas: ShapeData[] = this.data.map((item) => {
			const shape = shapeManager.getShapeById(item.id);
			const base =
				shape?.getProperty<BaseProperty>(ShapePropertyEnum.Base)?.value || item.properties.base;

			const properties: ShapeData['properties'] = {
				// BaseProperty 通过 merge 更新；旧数据没有 rotation 字段时，撤销旋转若仍省略
				// rotation，会保留当前角度而不是恢复到默认值 0。
				base: { ...base, rotation: base.rotation ?? 0 },
			};

			if (item.properties.fill) {
				const fill = shape?.getProperty<FillProperty>(ShapePropertyEnum.Fill)?.value;
				if (fill) {
					properties.fill = { ...fill };
				}
			}

			if (item.properties.stroke) {
				const stroke = shape?.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke)?.value;
				if (stroke) {
					properties.stroke = { ...stroke };
				}
			}

			if (item.properties.text) {
				const text = shape?.getProperty<TextProperty>(ShapePropertyEnum.Text)?.value;
				if (text) {
					properties.text = { ...text };
				}
			}

			if (item.properties.line) {
				const line = shape?.getProperty<LineProperty>(ShapePropertyEnum.Line)?.value;
				if (line) {
					properties.line = {
						...line,
						start: { ...line.start },
						end: { ...line.end },
						midPoints: line.midPoints?.map((point) => ({ ...point })),
					};
				}
			}

			return {
				id: item.id,
				type: item.type,
				properties,
			};
		});

		return new UpdatePropsAction(shapeDatas, this.ioc);
	}
}
