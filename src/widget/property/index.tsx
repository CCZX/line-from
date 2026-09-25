import { useState, useEffect, useCallback, useRef } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { Slider } from '@base-ui/react/slider';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import {
	ShapePropertyEnum,
	type FillPropertyValue,
	type FillStyle,
	type ShapeData,
	type StrokePropertyValue,
	type StrokeStyle,
} from '@lineform/shape/contract';
import { BACKGROUND_COLOR_PRESETS, BORDER_COLOR_PRESETS } from './const';
import type { PresetColor } from './const';
import './index.less';
import { useInject } from '@lineform/common/context';
import { IActionManager, IShapeManager } from '@lineform/domain/contract';
import { ISelectService } from '@lineform/domain/contract/SelectService';
import { StrokeProperty } from '@lineform/shape/property/StrokeProperty';
import { FillProperty } from '@lineform/shape/property/FillProperty';
import { BaseProperty } from '@lineform/shape/property/BaseProperty';
import { IocContainerService } from '@lineform/common/contract';
import { UpdatePropsAction } from '@lineform/domain/service/Action/Actions/UpdatePropsAction';
import { useTranslation } from 'react-i18next';
import { colorToHex, SHAPE_COLORS } from '@lineform/common/color';

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
	const panelRef = useRef<HTMLDivElement>(null);

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

	useEffect(() => {
		if (panelRef.current) {
			panelRef.current.inert = !visible;
		}
	}, [visible]);

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
		<div
			ref={panelRef}
			className={`ctx-panel ${visible ? 'ctx-panel--visible' : ''}`}
			aria-hidden={!visible}
		>
			<Collapsible.Root
				className={`ctx-card${collapsed ? ' ctx-card--collapsed' : ''}`}
				open={!collapsed}
				onOpenChange={(open) => setCollapsed(!open)}
			>
				<div className='ctx-heading'>
					<span>{t('property.title')}</span>
					<Collapsible.Trigger
						className={`ctx-collapse-btn${collapsed ? ' ctx-collapse-btn--collapsed' : ''}`}
						aria-label={t(collapsed ? 'property.expandPanel' : 'property.collapsePanel')}
					>
						<svg viewBox='0 0 16 16' aria-hidden='true'>
							<path d='M4 6.25 8 10l4-3.75' />
						</svg>
					</Collapsible.Trigger>
				</div>

				<Collapsible.Panel className='ctx-body'>
					{selectedShapeIds.length > 1 && (
						<div className='ctx-selection-note'>
							{t('property.selected', { count: selectedShapeIds.length })}
						</div>
					)}

					<section className='ctx-section'>
						<h3 className='ctx-section-title'>{t('property.stroke')}</h3>
						<ToggleGroup
							className='ctx-colors'
							aria-label={t('property.stroke')}
							value={[strokeColor]}
							onValueChange={(colors) => {
								const preset = BORDER_COLOR_PRESETS.find(({ hex }) => hex === colors[0]);
								if (preset) {
									handleStrokeColor(preset);
								}
							}}
						>
							{BORDER_COLOR_PRESETS.map((preset) => (
								<Toggle
									key={preset.hex}
									className='ctx-dot'
									value={preset.hex}
									data-color={preset.hex}
									style={{ backgroundColor: preset.hex }}
									aria-label={t('property.strokeColor', { color: t(preset.nameKey) })}
									title={t(preset.nameKey)}
								/>
							))}
						</ToggleGroup>

						<div className='ctx-field'>
							<span className='ctx-label'>{t('property.widthLabel')}</span>
							<ToggleGroup
								className='ctx-segmented ctx-segmented--width'
								aria-label={t('property.strokeWidth')}
								value={[String(strokeWidth)]}
								onValueChange={(widths) => {
									if (widths[0] !== undefined) {
										handleStrokeWidth(Number(widths[0]));
									}
								}}
							>
								{STROKE_WIDTH_OPTIONS.map((option) => (
									<Toggle
										key={option.value}
										className='ctx-segment-btn'
										value={String(option.value)}
										aria-label={t(option.labelKey)}
									>
										{option.value}
									</Toggle>
								))}
							</ToggleGroup>
						</div>

						<div className='ctx-field'>
							<span className='ctx-label'>{t('property.styleLabel')}</span>
							<ToggleGroup
								className='ctx-segmented'
								aria-label={t('property.strokeStyle')}
								value={[strokeStyle]}
								onValueChange={(styles) => {
									if (styles[0]) {
										handleStrokeStyle(styles[0] as StrokeStyle);
									}
								}}
							>
								<Toggle className='ctx-segment-btn' value='regular'>
									{t('property.regular')}
								</Toggle>
								<Toggle className='ctx-segment-btn' value='sketchy'>
									{t('property.sketchy')}
								</Toggle>
							</ToggleGroup>
						</div>
					</section>

					<div className='ctx-sep' />

					<section className='ctx-section'>
						<h3 className='ctx-section-title'>{t('property.fill')}</h3>
						<ToggleGroup
							className='ctx-colors'
							aria-label={t('property.background')}
							value={[isTransparent ? 'transparent' : fillColor]}
							onValueChange={(colors) => {
								const preset = BACKGROUND_COLOR_PRESETS.find(({ hex }) => hex === colors[0]);
								if (preset) {
									handleFillColor(preset);
								}
							}}
						>
							{BACKGROUND_COLOR_PRESETS.map((preset) => {
								return (
									<Toggle
										key={preset.hex}
										className={`ctx-dot${preset.transparent ? ' ctx-dot--transparent' : ''}`}
										value={preset.hex}
										data-color={preset.hex}
										style={preset.transparent ? undefined : { backgroundColor: preset.hex }}
										aria-label={t('property.backgroundColor', {
											color: t(preset.nameKey),
										})}
										title={t(preset.nameKey)}
									/>
								);
							})}
						</ToggleGroup>

						<div className='ctx-field'>
							<Slider.Root
								className='ctx-slider'
								min={0}
								max={100}
								step={1}
								value={fillAlpha}
								onValueChange={handleFillAlpha}
							>
								<Slider.Label className='ctx-label'>{t('property.opacity')}</Slider.Label>
								<div className='ctx-alpha-row'>
									<Slider.Control className='ctx-slider__control'>
										<Slider.Track className='ctx-slider__track'>
											<Slider.Indicator className='ctx-slider__indicator' />
										</Slider.Track>
										<Slider.Thumb
											className='ctx-slider__thumb'
											getAriaLabel={() => t('property.backgroundAlpha')}
										/>
									</Slider.Control>
									<Slider.Value className='ctx-alpha-value'>
										{(_formattedValues, values) => `${values[0]}%`}
									</Slider.Value>
								</div>
							</Slider.Root>
						</div>

						<div className='ctx-field'>
							<span className='ctx-label'>{t('property.pattern')}</span>
							<ToggleGroup
								className='ctx-segmented'
								aria-label={t('property.fillStyle')}
								value={[fillStyle]}
								onValueChange={(styles) => {
									if (styles[0]) {
										handleFillStyle(styles[0] as FillStyle);
									}
								}}
							>
								{(['solid', 'sketchy'] as const).map((style) => (
									<Toggle key={style} className='ctx-segment-btn' value={style}>
										{t(`property.${style}`)}
									</Toggle>
								))}
							</ToggleGroup>
						</div>
					</section>
				</Collapsible.Panel>
			</Collapsible.Root>
		</div>
	);
}
