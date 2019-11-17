import { StyledNode } from "./node";

export class LayoutTreeBuilder {

  // Build the tree of LayoutBoxes, but don't perform any layout calculations yet.
  build(node: StyledNode): LayoutBox {
    // create the root box
    let root: LayoutBox;
    switch (node.getDisplay()) {
      case 'block': root = new LayoutBox(BoxType.BLOCK, node); break;
      case 'inline': root = new LayoutBox(BoxType.INLINE, node); break;
      case 'none': throw new Error('Root has display:none');
      default: root = new LayoutBox(BoxType.BLOCK, node); break;
    }

    node.children.forEach(c => {
      switch (c.getDisplay()) {
        case 'block': root.children.push(new LayoutBox(BoxType.BLOCK, node)); break;
        case 'inline': root.getInlineContainer().children.push(new LayoutBox(BoxType.INLINE, node)); break;
      }
    });

    return root;
  }
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeSizes {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class Dimension {
  content: Rect;
  padding: EdgeSizes;
  border: EdgeSizes;
  margin: EdgeSizes;

  constructor() {
    this.content = { x: 0, y: 0, width: 0, height: 0 };
    this.padding = { left: 0, top: 0, right: 0, bottom: 0 };
    this.margin = { left: 0, top: 0, right: 0, bottom: 0 };
    this.border = { left: 0, top: 0, right: 0, bottom: 0 };
  }

  paddingBox(): Rect {
    return this.expandedBy(this.padding);
  }

  borderBox(): Rect {
    return this.expandedBy(this.border);
  }

  marginBox(): Rect {
    return this.expandedBy(this.margin);
  }

  expandedBy(edge: EdgeSizes): Rect {
    return {
      x: this.content.x - edge.left,
      y: this.content.y - edge.top,
      width: this.content.width + edge.left + edge.right,
      height: this.content.height + edge.top + edge.bottom
    }
  }
}

export enum BoxType {
  BLOCK = 'block',
  INLINE = 'inline',
  ANONYMOUS = 'anonymous'
}

export class LayoutBox {
  dimentions: Dimension;
  boxType: BoxType;
  children: LayoutBox[];
  node: StyledNode;

  constructor(type: BoxType, node: StyledNode) {
    this.boxType = type;
    this.dimentions = new Dimension();
    this.children = [];
    this.node = node;
  }

  // Where a new inline child should go.
  getInlineContainer(): LayoutBox {
    if (this.boxType === BoxType.INLINE || this.boxType === BoxType.ANONYMOUS) {
      return this;
    } else {
      const anonymous = this.children.find(c => c.boxType === BoxType.ANONYMOUS);
      if (!anonymous) { this.children.push(new LayoutBox(BoxType.ANONYMOUS, this.node)); }
      return anonymous || this.children[this.children.length - 1];
    }
  }

  layout(parent: Dimension) {
    switch (this.boxType) {
      case BoxType.BLOCK: this.layoutBlock(parent); break;
      case BoxType.INLINE: // TODO this.layoutInline(parent); break;
      case BoxType.ANONYMOUS: // TODO this.layoutAnonymous(parent); break;
    }
  }

  layoutBlock(parent: Dimension) {
    // Child width can depend on parent width, so we need to calculate
    // this box's width before laying out its children.
    this.calculateBlockWidth(parent);

    // Determine where the box is located within its container.
    this.calculateBlockPosition(parent);

    // Recursively lay out the children of this box.
    this.layoutBlockChildren();

    // Parent height can depend on child height, so `calculate_height`
    // must be called *after* the children are laid out.
    this.calculateBlockHeight();
  }

  calculateBlockWidth(parent: Dimension) {

    // `width` has initial value `auto`.
    let width = this.node.getAttr('width') || 'auto';

    // margin, border, and padding have initial value 0.
    let marginLeft = this.node.getAttr('margin-left') || this.node.getAttr('margin') || 0;
    let marginRight = this.node.getAttr('margin-right') || this.node.getAttr('margin') || 0;

    const borderLeft = this.node.getAttr('border-left') || this.node.getAttr('border') || 0;
    const borderRight = this.node.getAttr('border-right') || this.node.getAttr('border') || 0;

    const paddingLeft = this.node.getAttr('padding-left') || this.node.getAttr('padding') || 0;
    const paddingRight = this.node.getAttr('padding-right') || this.node.getAttr('padding') || 0;

    const totalArr = [marginLeft, borderLeft, paddingLeft, width, marginRight, borderRight, paddingRight] as (number | 'auto')[];
    const minHorizontalSpace = totalArr.map(s => {
      return s === 'auto' ? 0 : s
    }).reduce((total, s) => {
      total += s;
      return total;
    }, 0);

    // If width is not auto and the total is wider than the container, treat auto margins as 0.
    if (width !== 'auto' && minHorizontalSpace > parent.content.width) {
      if (marginLeft === 'auto') {
        marginLeft = 0;
      }
      if (marginRight == 'auto') {
        marginRight = 0;
      }
    }

    const underflow = parent.content.width - minHorizontalSpace;

    if (width !== 'auto' && marginLeft !== 'auto' && marginRight !== 'auto') {
      // If the values are overconstrained, calculate margin_right.
      marginRight = Number(marginRight) + underflow;
    }

    // If exactly one size is auto, its used value follows from the equality.
    if (width !== 'auto' && marginLeft !== 'auto' && marginRight === 'auto') {
      marginRight = underflow;
    }

    if (width !== 'auto' && marginLeft === 'auto' && marginRight !== 'auto') {
      marginLeft = underflow;
    }

    // If width is set to auto, any other auto values become 0.
    if (width !== 'auto') {
      marginLeft = underflow;
      if (marginLeft === 'auto') { marginLeft = 0; }
      if (marginRight == 'auto') { marginRight = 0; }

      if (underflow >= 0) {
        // Expand width to fill the underflow.
        width = underflow;
      } else {
        // Width can't be negative. Adjust the right margin instead.
        width = 0;
        marginRight = Number(marginRight) + underflow;
      }
    }

    // If margin-left and margin-right are both auto, their used values are equal.
    if (width !== 'auto' && marginLeft === 'auto' && marginRight === 'auto') {
      marginLeft = underflow / 2;
      marginRight = underflow / 2;
    }
  }

  calculateBlockPosition(parent: Dimension) {
    // margin, border, and padding have initial value 0.
    // If margin-top or margin-bottom is `auto`, the used value is zero.
    this.dimentions.margin.top = (this.node.getAttr('margin-top') || this.node.getAttr('margin') || 0) as number;
    this.dimentions.margin.bottom = (this.node.getAttr('margin-bottom') || this.node.getAttr('margin') || 0) as number;

    this.dimentions.border.top = (this.node.getAttr('border-top-width') || this.node.getAttr('border') || 0) as number;
    this.dimentions.border.bottom = (this.node.getAttr('border-bottom-width') || this.node.getAttr('border') || 0) as number;

    this.dimentions.padding.top = (this.node.getAttr('padding-top') || this.node.getAttr('padding') || 0) as number;
    this.dimentions.padding.bottom = (this.node.getAttr('padding-bottom') || this.node.getAttr('padding') || 0) as number;

    this.dimentions.content.x = parent.content.x +
      this.dimentions.margin.left + this.dimentions.border.left + this.dimentions.padding.left;

    // Position the box below all the previous boxes in the container.
    this.dimentions.content.y = parent.content.height + parent.content.y +
      this.dimentions.margin.top + this.dimentions.border.top + this.dimentions.padding.top;
  }

  layoutBlockChildren() {
    this.children.forEach(c => {
      c.layout(this.dimentions);
      // Track the height so each child is laid out below the previous content.
      this.dimentions.content.height = this.dimentions.content.height + c.dimentions.margin_box().height;
    });
  }

  calculateBlockHeight() {
    // If the height is set to an explicit length, use that exact length.
    // Otherwise, just keep the value set by `layout_block_children`.
    const heightFromStyle = this.node.getAttr('height');
    if (heightFromStyle) {
      this.dimentions.content.height = heightFromStyle as number;
    }
  }

}

export enum Display {
  INLINE = 'inline',
  BLOCK = 'block',
  NONE = 'none'
}
