export interface PresetColor {
	nameKey: string;
	hex: string;
	number: number;
}

export const STROKE_COLOR_PRESETS: PresetColor[] = [
	{ nameKey: 'color.black', hex: '#1e1e1e', number: 0x1e1e1e },
	{ nameKey: 'color.red', hex: '#e03131', number: 0xe03131 },
	{ nameKey: 'color.orange', hex: '#f08c00', number: 0xf08c00 },
	{ nameKey: 'color.green', hex: '#2f9e44', number: 0x2f9e44 },
	{ nameKey: 'color.blue', hex: '#1971c2', number: 0x1971c2 },
	{ nameKey: 'color.purple', hex: '#9c36b5', number: 0x9c36b5 },
	{ nameKey: 'color.white', hex: '#ffffff', number: 0xffffff },
];

export const FILL_COLOR_PRESETS: (PresetColor & { transparent?: boolean })[] = [
	{ nameKey: 'color.transparent', hex: 'transparent', number: 0xffffff, transparent: true },
	...STROKE_COLOR_PRESETS,
];
