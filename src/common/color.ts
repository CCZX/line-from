export const COLOR_PALETTE = {
	black: 0x1e1e1e,
	red: 0xe03131,
	orange: 0xf08c00,
	green: 0x2f9e44,
	blue: 0x1971c2,
	purple: 0x9c36b5,
	white: 0xffffff,
} as const;

export type PaletteColorName = keyof typeof COLOR_PALETTE;

export const BORDER_COLOR_NAMES: PaletteColorName[] = [
	'black',
	'red',
	'orange',
	'green',
	'blue',
	'purple',
	'white',
];

export const BACKGROUND_COLOR_NAMES: PaletteColorName[] = [
	'black',
	'red',
	'orange',
	'green',
	'blue',
	'purple',
	'white',
];

export function colorToHex(color: number): string {
	return `#${color.toString(16).padStart(6, '0')}`;
}

export const SHAPE_COLORS = {
	border: {
		default: COLOR_PALETTE.black,
		fallback: COLOR_PALETTE.black,
	},
	background: {
		default: COLOR_PALETTE.blue,
		fallback: COLOR_PALETTE.black,
		patternBase: COLOR_PALETTE.white,
		transparentFallback: COLOR_PALETTE.white,
	},
	text: {
		default: COLOR_PALETTE.black,
		background: COLOR_PALETTE.white,
	},
} as const;

export const CANVAS_COLORS = {
	background: COLOR_PALETTE.white,
} as const;

export const DECORATE_COLORS = {
	selection: 0x4a90d9,
	hoverBorder: 0xbacbfd,
	handleSurface: COLOR_PALETTE.white,
	controlSurface: 0xfffefa,
	activeAccent: 0x615ba4,
} as const;

export const WIDGET_COLORS = {
	mutedControl: 0x999999,
} as const;
