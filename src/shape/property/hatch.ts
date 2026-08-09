import { Texture, WRAP_MODES } from '@pixi/core';
import { colorToHex, SHAPE_COLORS } from '@/common/color';

let hatchTexture: Texture | null = null;

export function getHatchTexture(): Texture {
	if (hatchTexture) {
		return hatchTexture;
	}

	const canvas = document.createElement('canvas');
	canvas.width = 64;
	canvas.height = 64;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to create hatch texture canvas context');
	}

	ctx.clearRect(0, 0, 64, 64);
	ctx.strokeStyle = colorToHex(SHAPE_COLORS.background.patternBase);
	ctx.lineWidth = 2;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, 64);
	ctx.lineTo(64, 0);
	ctx.stroke();

	hatchTexture = Texture.from(canvas);
	hatchTexture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
	return hatchTexture;
}
