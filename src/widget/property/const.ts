import {
	BACKGROUND_COLOR_NAMES,
	BORDER_COLOR_NAMES,
	COLOR_PALETTE,
	colorToHex,
} from '@lineform/common/color';
import type { PaletteColorName } from '@lineform/common/color';

export interface PresetColor {
	nameKey: string;
	hex: string;
	number: number;
}

function createColorPresets(names: PaletteColorName[]): PresetColor[] {
	return names.map((name) => ({
		nameKey: `color.${name}`,
		hex: colorToHex(COLOR_PALETTE[name]),
		number: COLOR_PALETTE[name],
	}));
}

export const BORDER_COLOR_PRESETS = createColorPresets(BORDER_COLOR_NAMES);

export const BACKGROUND_COLOR_PRESETS: (PresetColor & { transparent?: boolean })[] = [
	{
		nameKey: 'color.transparent',
		hex: 'transparent',
		number: COLOR_PALETTE.white,
		transparent: true,
	},
	...createColorPresets(BACKGROUND_COLOR_NAMES),
];
