import { Graphics } from '@pixi/graphics';
import type { IViewportService } from '@lineform/domain/contract/ViewportService';
import type { SnapGuide } from '@lineform/domain/contract/AlignmentSnapService';
import { DECORATE_COLORS } from '@lineform/common/color';

export class SnapGuideRenderer {
	private graphics: Graphics | null = null;

	constructor(private readonly viewportService: IViewportService) {}

	public render(guides: SnapGuide[], scale: number): void {
		if (guides.length === 0) {
			this.clear();
			return;
		}

		const viewport = this.viewportService.getStage().getViewport();
		if (!this.graphics) {
			this.graphics = new Graphics();
		}
		if (this.graphics.parent !== viewport) {
			viewport.addChild(this.graphics);
		}

		const graphics = this.graphics;
		graphics.clear();
		graphics.lineStyle(1 / Math.max(scale, Number.EPSILON), DECORATE_COLORS.snapGuide, 0.9);

		for (const guide of guides) {
			if (guide.axis === 'x') {
				graphics.moveTo(guide.position, guide.start);
				graphics.lineTo(guide.position, guide.end);
			} else {
				graphics.moveTo(guide.start, guide.position);
				graphics.lineTo(guide.end, guide.position);
			}
		}
	}

	public clear(): void {
		this.graphics?.clear();
	}
}
