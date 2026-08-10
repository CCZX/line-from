interface QuadTreeEntry {
	id: string;
	bounds: Rectangle;
	order: number;
	node: QuadTreeNode;
}

interface QuadTreeNode {
	bounds: Rectangle;
	depth: number;
	items: Set<string>;
	children?: [QuadTreeNode, QuadTreeNode, QuadTreeNode, QuadTreeNode];
}

export interface QuadTreeItem {
	id: string;
	bounds: Rectangle;
	order: number;
}

export interface QuadTreeOptions {
	capacity?: number;
	maxDepth?: number;
	initialBounds?: Rectangle;
}

const DEFAULT_INITIAL_BOUNDS: Rectangle = {
	x: -1024,
	y: -1024,
	width: 2048,
	height: 2048,
};

/**
 * 动态四叉树空间索引。
 *
 * 每个 item 只存储在一个节点中：完全落入某个子象限时下沉，跨象限时保留在父节点。
 * 这样区域查询天然不会产生重复结果，删除也可以通过反向索引直接定位所属节点。
 */
export class QuadTreeManager {
	private readonly capacity: number;
	private readonly maxDepth: number;
	private readonly initialBounds: Rectangle;
	private root: QuadTreeNode;
	private entries = new Map<string, QuadTreeEntry>();

	constructor(options: QuadTreeOptions = {}) {
		this.capacity = Math.max(1, options.capacity ?? 8);
		this.maxDepth = Math.max(1, options.maxDepth ?? 10);
		this.initialBounds = this.normalizeBounds(options.initialBounds ?? DEFAULT_INITIAL_BOUNDS);
		this.root = this.createNode(this.initialBounds, 0);
	}

	public get size(): number {
		return this.entries.size;
	}

	public upsert(item: QuadTreeItem): void {
		const bounds = this.normalizeBounds(item.bounds);
		const previous = this.entries.get(item.id);
		if (previous) {
			previous.node.items.delete(item.id);
			this.entries.delete(item.id);
		}

		this.ensureRootContains(bounds);

		const entry: QuadTreeEntry = {
			id: item.id,
			bounds,
			order: item.order,
			node: this.root,
		};
		this.entries.set(item.id, entry);
		this.insertEntry(this.root, entry);
	}

	public remove(id: string): boolean {
		const entry = this.entries.get(id);
		if (!entry) {
			return false;
		}

		entry.node.items.delete(id);
		this.entries.delete(id);
		return true;
	}

	public query(area: Rectangle): QuadTreeItem[] {
		const normalizedArea = this.normalizeBounds(area);
		const result: QuadTreeEntry[] = [];
		this.queryNode(this.root, normalizedArea, result);
		result.sort((a, b) => a.order - b.order);
		return result.map(({ id, bounds, order }) => ({ id, bounds: { ...bounds }, order }));
	}

	public clear(): void {
		this.entries.clear();
		this.root = this.createNode(this.initialBounds, 0);
	}

	private insertEntry(node: QuadTreeNode, entry: QuadTreeEntry): void {
		if (node.children) {
			const child = this.getContainingChild(node.children, entry.bounds);
			if (child) {
				this.insertEntry(child, entry);
				return;
			}
		}

		node.items.add(entry.id);
		entry.node = node;

		if (!node.children && node.items.size > this.capacity && node.depth < this.maxDepth) {
			this.split(node);
		}
	}

	private split(node: QuadTreeNode): void {
		const halfWidth = node.bounds.width / 2;
		const halfHeight = node.bounds.height / 2;
		if (halfWidth === 0 || halfHeight === 0) {
			return;
		}

		const { x, y } = node.bounds;
		node.children = [
			this.createNode({ x, y, width: halfWidth, height: halfHeight }, node.depth + 1),
			this.createNode(
				{ x: x + halfWidth, y, width: halfWidth, height: halfHeight },
				node.depth + 1,
			),
			this.createNode(
				{ x, y: y + halfHeight, width: halfWidth, height: halfHeight },
				node.depth + 1,
			),
			this.createNode(
				{
					x: x + halfWidth,
					y: y + halfHeight,
					width: halfWidth,
					height: halfHeight,
				},
				node.depth + 1,
			),
		];

		for (const id of Array.from(node.items)) {
			const entry = this.entries.get(id);
			if (!entry) {
				continue;
			}
			const child = this.getContainingChild(node.children, entry.bounds);
			if (!child) {
				continue;
			}

			node.items.delete(id);
			this.insertEntry(child, entry);
		}
	}

	private queryNode(node: QuadTreeNode, area: Rectangle, result: QuadTreeEntry[]): void {
		if (!this.intersects(node.bounds, area)) {
			return;
		}

		for (const id of node.items) {
			const entry = this.entries.get(id);
			if (entry && this.intersects(entry.bounds, area)) {
				result.push(entry);
			}
		}

		if (node.children) {
			for (const child of node.children) {
				this.queryNode(child, area, result);
			}
		}
	}

	private ensureRootContains(bounds: Rectangle): void {
		if (this.contains(this.root.bounds, bounds)) {
			return;
		}

		const rootRight = this.root.bounds.x + this.root.bounds.width;
		const rootBottom = this.root.bounds.y + this.root.bounds.height;
		const itemRight = bounds.x + bounds.width;
		const itemBottom = bounds.y + bounds.height;
		const minX = Math.min(this.root.bounds.x, bounds.x);
		const minY = Math.min(this.root.bounds.y, bounds.y);
		const maxX = Math.max(rootRight, itemRight);
		const maxY = Math.max(rootBottom, itemBottom);
		let size = Math.max(this.root.bounds.width, this.root.bounds.height);

		while (size < maxX - minX || size < maxY - minY) {
			size *= 2;
		}

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		this.rebuild({
			x: centerX - size / 2,
			y: centerY - size / 2,
			width: size,
			height: size,
		});
	}

	private rebuild(bounds: Rectangle): void {
		this.root = this.createNode(bounds, 0);
		for (const entry of this.entries.values()) {
			this.insertEntry(this.root, entry);
		}
	}

	private getContainingChild(
		children: [QuadTreeNode, QuadTreeNode, QuadTreeNode, QuadTreeNode],
		bounds: Rectangle,
	): QuadTreeNode | undefined {
		return children.find((child) => this.contains(child.bounds, bounds));
	}

	private createNode(bounds: Rectangle, depth: number): QuadTreeNode {
		return {
			bounds: { ...bounds },
			depth,
			items: new Set(),
		};
	}

	private contains(outer: Rectangle, inner: Rectangle): boolean {
		return (
			inner.x >= outer.x &&
			inner.y >= outer.y &&
			inner.x + inner.width <= outer.x + outer.width &&
			inner.y + inner.height <= outer.y + outer.height
		);
	}

	private intersects(a: Rectangle, b: Rectangle): boolean {
		return !(
			a.x + a.width < b.x ||
			b.x + b.width < a.x ||
			a.y + a.height < b.y ||
			b.y + b.height < a.y
		);
	}

	private normalizeBounds(bounds: Rectangle): Rectangle {
		const values = [bounds.x, bounds.y, bounds.width, bounds.height];
		if (!values.every(Number.isFinite)) {
			throw new Error('QuadTree bounds must contain only finite numbers');
		}

		return {
			x: bounds.width >= 0 ? bounds.x : bounds.x + bounds.width,
			y: bounds.height >= 0 ? bounds.y : bounds.y + bounds.height,
			width: Math.abs(bounds.width),
			height: Math.abs(bounds.height),
		};
	}
}
