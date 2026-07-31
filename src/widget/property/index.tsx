import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import {
	ShapePropertyEnum,
	type FillPropertyValue,
	type FillStyle,
	type ShapeData,
	type StrokePropertyValue,
	type StrokeStyle,
} from '@/shape/contract';
import { STROKE_COLOR_PRESETS, FILL_COLOR_PRESETS } from './const';
import type { PresetColor } from './const';
import './index.less';
import { useInject } from '@/common/context';
import { IActionManager, IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { StrokeProperty } from '@/shape/property/StrokeProperty';
import { FillProperty } from '@/shape/property/FillProperty';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { IocContainerService } from '@/common/contract';
import { UpdatePropsAction } from '@/domain/service/action/Actions/UpdatePropsAction';

function numberToHex(num: number): string {
	return '#' + num.toString(16).padStart(6, '0');
}

const STROKE_WIDTH_OPTIONS = [
	{ label: '无 (0)', value: '0' },
	{ label: '小 (1)', value: '1' },
	{ label: '中 (3)', value: '3' },
	{ label: '大 (5)', value: '5' },
];

const STROKE_RADIUS_MAP: Record<number, number> = { 0: 1, 1: 2, 3: 5, 5: 7 };

export function Property() {
	const shapeManager = useInject<IShapeManager>(IShapeManager);
	const selectService = useInject<ISelectService>(ISelectService);
	const actionManager = useInject<IActionManager>(IActionManager);
	const ioc = useInject<IocContainerService>(IocContainerService);
	const selectedShapeIds = selectService.store((s) => s.selectedShapeIds);

	const [strokeColor, setStrokeColor] = useState('#1e1e1e');
	const [strokeWidth, setStrokeWidth] = useState(1);
	const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('regular');
	const [fillColor, setFillColor] = useState('#ffffff');
	const [fillAlpha, setFillAlpha] = useState(100);
	const [fillStyle, setFillStyle] = useState<FillStyle>('solid');
	const [isTransparent, setIsTransparent] = useState(false);
	const [visible, setVisible] = useState(false);
	const visibleRef = useRef(false);

	const syncFromShape = useCallback(() => {
		const ids = selectService.store.getState().selectedShapeIds;
		const id = ids[0];
		if (!id) {
			return;
		}
		const shape = shapeManager.getShapeById(id);
		if (!shape) {
			return;
		}

		const stroke = shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke).value;
		if (stroke) {
			setStrokeColor(numberToHex(stroke.color));
			setStrokeWidth(stroke.width);
			setStrokeStyle(stroke.style ?? 'regular');
		}

		const fill = shape.getProperty<FillProperty>(ShapePropertyEnum.Fill).value;
		if (fill) {
			setFillStyle(fill.style ?? 'solid');
			if (fill.alpha === 0) {
				setIsTransparent(true);
				setFillColor('#ffffff');
				setFillAlpha(0);
			} else {
				setIsTransparent(false);
				setFillColor(numberToHex(fill.color));
				setFillAlpha(Math.round(fill.alpha * 100));
			}
		}
	}, []);

	useEffect(() => {
		if (selectedShapeIds.length > 0) {
			syncFromShape();
			setVisible(true);
			visibleRef.current = true;
		} else {
			setVisible(false);
			visibleRef.current = false;
		}
	}, [selectedShapeIds, syncFromShape]);

	useEffect(() => {
		const onPointerUp = () => {
			if (!visibleRef.current) {
				return;
			}
			syncFromShape();
		};
		document.addEventListener('pointerup', onPointerUp);
		return () => document.removeEventListener('pointerup', onPointerUp);
	}, [syncFromShape]);

	const updateSelectedStroke = (patch: Partial<StrokePropertyValue>) => {
		const data: ShapeData[] = selectedShapeIds.flatMap((id) => {
			const selectedShape = shapeManager.getShapeById(id);
			if (!selectedShape) {
				return [];
			}

			const base = selectedShape.getProperty<BaseProperty>(ShapePropertyEnum.Base).value;
			const stroke = selectedShape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke).value;

			return [
				{
					id: selectedShape.id,
					type: selectedShape.type,
					properties: {
						base: { ...base },
						stroke: { ...stroke, ...patch },
					},
				},
			];
		});

		if (data.length > 0) {
			actionManager.push(new UpdatePropsAction(data, ioc));
		}
	};

	const updateSelectedFill = (patch: Partial<FillPropertyValue>) => {
		const data: ShapeData[] = selectedShapeIds.flatMap((id) => {
			const selectedShape = shapeManager.getShapeById(id);
			if (!selectedShape) {
				return [];
			}

			const base = selectedShape.getProperty<BaseProperty>(ShapePropertyEnum.Base).value;
			const fill = selectedShape.getProperty<FillProperty>(ShapePropertyEnum.Fill).value;

			return [
				{
					id: selectedShape.id,
					type: selectedShape.type,
					properties: {
						base: { ...base },
						fill: { ...fill, ...patch },
					},
				},
			];
		});

		if (data.length > 0) {
			actionManager.push(new UpdatePropsAction(data, ioc));
		}
	};

	const handleStrokeColor = (preset: PresetColor) => {
		setStrokeColor(preset.hex);
		updateSelectedStroke({ color: preset.number });
	};

	const handleStrokeWidth = (w: number) => {
		setStrokeWidth(w);
		updateSelectedStroke({ width: w });
	};

	const handleStrokeStyle = (style: StrokeStyle) => {
		setStrokeStyle(style);
		updateSelectedStroke({ style });
	};

	const handleFillColor = (preset: PresetColor & { transparent?: boolean }) => {
		if (preset.transparent) {
			setIsTransparent(true);
			setFillAlpha(0);
			updateSelectedFill({ alpha: 0 });
		} else {
			setIsTransparent(false);
			setFillColor(preset.hex);
			updateSelectedFill({
				color: preset.number,
				alpha: fillAlpha / 100,
			});
		}
	};

	const handleFillAlpha = (alpha: number) => {
		setFillAlpha(alpha);
		setIsTransparent(alpha === 0);
		updateSelectedFill({ alpha: alpha / 100 });
	};

	const handleFillStyle = (style: FillStyle) => {
		setFillStyle(style);
		updateSelectedFill({ style });
	};

	const previewR = STROKE_RADIUS_MAP[strokeWidth] ?? 2;

	return (
		<div className={`ctx-panel ${visible ? 'ctx-panel--visible' : ''}`}>
			<div className='ctx-card'>
				<div className='ctx-inner'>
					<div className='ctx-heading'>
						<span>样式</span>
						<span className='ctx-heading-mark' aria-hidden='true' />
					</div>

					{selectedShapeIds.length > 1 && (
						<div className='ctx-selection-note'>已选择 {selectedShapeIds.length} 个图形</div>
					)}

					{/* 描边颜色 */}
					<div className='ctx-section'>
						<span className='ctx-label'>描边</span>
						<div className='ctx-colors'>
							{STROKE_COLOR_PRESETS.map((preset) => (
								<button
									key={preset.hex}
									className={`ctx-dot${
										strokeColor === preset.hex && !isTransparent ? ' ctx-dot--active' : ''
									}`}
									data-color={preset.hex}
									style={{ backgroundColor: preset.hex }}
									aria-label={`描边颜色：${preset.name}`}
									aria-pressed={strokeColor === preset.hex}
									title={preset.name}
									onClick={() => handleStrokeColor(preset)}
								/>
							))}
						</div>
					</div>

					<div className='ctx-sep' />

					{/* 描边宽度 */}
					<div className='ctx-section'>
						<span className='ctx-label'>描边宽度</span>
						<div className='ctx-stroke'>
							<svg width='22' height='22' viewBox='0 0 22 22'>
								<circle
									cx='11'
									cy='11'
									r={previewR}
									fill={strokeWidth === 0 ? '#999' : strokeColor}
								/>
							</svg>
							<select
								className='ctx-select'
								value={String(strokeWidth)}
								aria-label='描边宽度'
								onChange={(e) => handleStrokeWidth(parseInt(e.target.value, 10))}
							>
								{STROKE_WIDTH_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className='ctx-sep' />

					{/* 描边样式 */}
					<div className='ctx-section'>
						<span className='ctx-label'>描边样式</span>
						<div className='ctx-style-row'>
							<button
								className={`ctx-style-btn${
									strokeStyle === 'regular' ? ' ctx-style-btn--active' : ''
								}`}
								onClick={() => handleStrokeStyle('regular')}
							>
								规正
							</button>
							<button
								className={`ctx-style-btn${
									strokeStyle === 'sketchy' ? ' ctx-style-btn--active' : ''
								}`}
								onClick={() => handleStrokeStyle('sketchy')}
							>
								手绘
							</button>
						</div>
					</div>

					<div className='ctx-sep' />

					{/* 背景色 */}
					<div className='ctx-section'>
						<span className='ctx-label'>背景色</span>
						<div className='ctx-colors'>
							{FILL_COLOR_PRESETS.map((preset) => {
								const isActive = preset.transparent
									? isTransparent
									: fillColor === preset.hex && !isTransparent;
								return (
									<button
										key={preset.hex}
										className={`ctx-dot${isActive ? ' ctx-dot--active' : ''}${
											preset.transparent ? ' ctx-dot--transparent' : ''
										}`}
										data-color={preset.hex}
										style={preset.transparent ? undefined : { backgroundColor: preset.hex }}
										aria-label={`背景颜色：${preset.name}`}
										aria-pressed={isActive}
										title={preset.name}
										onClick={() => handleFillColor(preset)}
									/>
								);
							})}
						</div>
					</div>

					<div className='ctx-sep' />

					{/* 背景透明度 */}
					<div className='ctx-section'>
						<span className='ctx-label'>背景透明度</span>
						<div className='ctx-alpha-row'>
							<input
								className='ctx-range'
								type='range'
								min={0}
								max={100}
								step={1}
								value={fillAlpha}
								aria-label='背景透明度'
								style={{ '--ctx-range-value': `${fillAlpha}%` } as CSSProperties}
								onChange={(e) => handleFillAlpha(Number(e.target.value))}
							/>
							<span className='ctx-alpha-value'>{fillAlpha}%</span>
						</div>
					</div>

					<div className='ctx-sep' />

					{/* 填充样式 */}
					<div className='ctx-section'>
						<span className='ctx-label'>填充样式</span>
						<div className='ctx-style-row'>
							<button
								className={`ctx-style-btn${fillStyle === 'solid' ? ' ctx-style-btn--active' : ''}`}
								onClick={() => handleFillStyle('solid')}
							>
								纯色
							</button>
							<button
								className={`ctx-style-btn${fillStyle === 'hatch' ? ' ctx-style-btn--active' : ''}`}
								onClick={() => handleFillStyle('hatch')}
							>
								斜线
							</button>
							<button
								className={`ctx-style-btn${
									fillStyle === 'sketchy' ? ' ctx-style-btn--active' : ''
								}`}
								onClick={() => handleFillStyle('sketchy')}
							>
								手绘
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
