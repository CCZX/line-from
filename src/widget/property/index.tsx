import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import {
	ShapePropertyEnum,
	type FillPropertyValue,
	type FillStyle,
	type ShapeData,
	type StrokePropertyValue,
	type StrokeStyle,
} from '@/shape/contract';
import { BACKGROUND_COLOR_PRESETS, BORDER_COLOR_PRESETS } from './const';
import type { PresetColor } from './const';
import './index.less';
import { useInject } from '@/common/context';
import { IActionManager, IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { StrokeProperty } from '@/shape/property/StrokeProperty';
import { FillProperty } from '@/shape/property/FillProperty';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { IocContainerService } from '@/common/contract';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { useTranslation } from 'react-i18next';
import { colorToHex, SHAPE_COLORS } from '@/common/color';

const STROKE_WIDTH_OPTIONS = [
	{ labelKey: 'property.width.none', value: 0 },
	{ labelKey: 'property.width.small', value: 1 },
	{ labelKey: 'property.width.medium', value: 3 },
	{ labelKey: 'property.width.large', value: 5 },
];

export function Property() {
	const { t } = useTranslation();
	const shapeManager = useInject<IShapeManager>(IShapeManager);
	const selectService = useInject<ISelectService>(ISelectService);
	const actionManager = useInject<IActionManager>(IActionManager);
	const ioc = useInject<IocContainerService>(IocContainerService);
	const selectedShapeIds = selectService.store((s) => s.selectedShapeIds);

	const [strokeColor, setStrokeColor] = useState(colorToHex(SHAPE_COLORS.border.default));
	const [strokeWidth, setStrokeWidth] = useState(1);
	const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('regular');
	const [fillColor, setFillColor] = useState(colorToHex(SHAPE_COLORS.background.default));
	const [fillAlpha, setFillAlpha] = useState(100);
	const [fillStyle, setFillStyle] = useState<FillStyle>('solid');
	const [isTransparent, setIsTransparent] = useState(false);
	const [visible, setVisible] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
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
			setStrokeColor(colorToHex(stroke.color));
			setStrokeWidth(stroke.width);
			setStrokeStyle(stroke.style ?? 'regular');
		}

		const fill = shape.getProperty<FillProperty>(ShapePropertyEnum.Fill).value;
		if (fill) {
			setFillStyle(fill.style ?? 'solid');
			if (fill.alpha === 0) {
				setIsTransparent(true);
				setFillColor(colorToHex(SHAPE_COLORS.background.transparentFallback));
				setFillAlpha(0);
			} else {
				setIsTransparent(false);
				setFillColor(colorToHex(fill.color));
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
			const nextAlpha = fillAlpha === 0 ? 100 : fillAlpha;
			setIsTransparent(false);
			setFillColor(preset.hex);
			setFillAlpha(nextAlpha);
			updateSelectedFill({
				color: preset.number,
				alpha: nextAlpha / 100,
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

	return (
		<div className={`ctx-panel ${visible ? 'ctx-panel--visible' : ''}`}>
			<div className={`ctx-card${collapsed ? ' ctx-card--collapsed' : ''}`}>
				<div className='ctx-heading'>
					<span>{t('property.title')}</span>
					<button
						type='button'
						className={`ctx-collapse-btn${collapsed ? ' ctx-collapse-btn--collapsed' : ''}`}
						aria-expanded={!collapsed}
						aria-label={t(collapsed ? 'property.expandPanel' : 'property.collapsePanel')}
						onClick={() => setCollapsed((value) => !value)}
					>
						<svg viewBox='0 0 16 16' aria-hidden='true'>
							<path d='M4 6.25 8 10l4-3.75' />
						</svg>
					</button>
				</div>

				{!collapsed && (
					<div className='ctx-body'>
						{selectedShapeIds.length > 1 && (
							<div className='ctx-selection-note'>
								{t('property.selected', { count: selectedShapeIds.length })}
							</div>
						)}

						<section className='ctx-section'>
							<h3 className='ctx-section-title'>{t('property.stroke')}</h3>
							<div className='ctx-colors'>
								{BORDER_COLOR_PRESETS.map((preset) => (
									<button
										type='button'
										key={preset.hex}
										className={`ctx-dot${strokeColor === preset.hex ? ' ctx-dot--active' : ''}`}
										data-color={preset.hex}
										style={{ backgroundColor: preset.hex }}
										aria-label={t('property.strokeColor', { color: t(preset.nameKey) })}
										aria-pressed={strokeColor === preset.hex}
										title={t(preset.nameKey)}
										onClick={() => handleStrokeColor(preset)}
									/>
								))}
							</div>

							<div className='ctx-field'>
								<span className='ctx-label'>{t('property.widthLabel')}</span>
								<div className='ctx-segmented ctx-segmented--width'>
									{STROKE_WIDTH_OPTIONS.map((option) => (
										<button
											type='button'
											key={option.value}
											className={`ctx-segment-btn${
												strokeWidth === option.value ? ' ctx-segment-btn--active' : ''
											}`}
											aria-label={t(option.labelKey)}
											aria-pressed={strokeWidth === option.value}
											onClick={() => handleStrokeWidth(option.value)}
										>
											{option.value}
										</button>
									))}
								</div>
							</div>

							<div className='ctx-field'>
								<span className='ctx-label'>{t('property.styleLabel')}</span>
								<div className='ctx-segmented'>
									<button
										type='button'
										className={`ctx-segment-btn${
											strokeStyle === 'regular' ? ' ctx-segment-btn--active' : ''
										}`}
										aria-pressed={strokeStyle === 'regular'}
										onClick={() => handleStrokeStyle('regular')}
									>
										{t('property.regular')}
									</button>
									<button
										type='button'
										className={`ctx-segment-btn${
											strokeStyle === 'sketchy' ? ' ctx-segment-btn--active' : ''
										}`}
										aria-pressed={strokeStyle === 'sketchy'}
										onClick={() => handleStrokeStyle('sketchy')}
									>
										{t('property.sketchy')}
									</button>
								</div>
							</div>
						</section>

						<div className='ctx-sep' />

						<section className='ctx-section'>
							<h3 className='ctx-section-title'>{t('property.fill')}</h3>
							<div className='ctx-colors'>
								{BACKGROUND_COLOR_PRESETS.map((preset) => {
									const isActive = preset.transparent
										? isTransparent
										: fillColor === preset.hex && !isTransparent;
									return (
										<button
											type='button'
											key={preset.hex}
											className={`ctx-dot${isActive ? ' ctx-dot--active' : ''}${
												preset.transparent ? ' ctx-dot--transparent' : ''
											}`}
											data-color={preset.hex}
											style={preset.transparent ? undefined : { backgroundColor: preset.hex }}
											aria-label={t('property.backgroundColor', {
												color: t(preset.nameKey),
											})}
											aria-pressed={isActive}
											title={t(preset.nameKey)}
											onClick={() => handleFillColor(preset)}
										/>
									);
								})}
							</div>

							<div className='ctx-field'>
								<span className='ctx-label'>{t('property.opacity')}</span>
								<div className='ctx-alpha-row'>
									<input
										className='ctx-range'
										type='range'
										min={0}
										max={100}
										step={1}
										value={fillAlpha}
										aria-label={t('property.backgroundAlpha')}
										style={{ '--ctx-range-value': `${fillAlpha}%` } as CSSProperties}
										onChange={(e) => handleFillAlpha(Number(e.target.value))}
									/>
									<span className='ctx-alpha-value'>{fillAlpha}%</span>
								</div>
							</div>

							<div className='ctx-field'>
								<span className='ctx-label'>{t('property.pattern')}</span>
								<div className='ctx-segmented'>
									{(['solid', 'hatch', 'sketchy'] as const).map((style) => (
										<button
											type='button'
											key={style}
											className={`ctx-segment-btn${
												fillStyle === style ? ' ctx-segment-btn--active' : ''
											}`}
											aria-pressed={fillStyle === style}
											onClick={() => handleFillStyle(style)}
										>
											{t(`property.${style}`)}
										</button>
									))}
								</div>
							</div>
						</section>
					</div>
				)}
			</div>
		</div>
	);
}
