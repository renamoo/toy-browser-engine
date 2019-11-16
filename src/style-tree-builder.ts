import { ParsedCss } from './index';
import { ElementNode, Node, StyledNode } from './node';

export class StyleTreeBuilder {
  matchSimpleSelector(n: ElementNode, style: ParsedCss) {
    let matched;
    switch (style.selectorType) {
      case 'tag':
        return n.tagName === style.selector;
      case 'id':
        return n.getAttr('id') === style.selector;
      case 'class':
        return n.getAttr('class') === style.selector;
    }
    return false;
  }

  getSpecifiedValues(node: Node, css: ParsedCss[]): Map<string, unknown> {
    if (node.nodeType === 'Text') { return new Map() }
    // assume it is sorted from lower to higher priority tosimplify
    return css.reduce((map, css) => {
      if (this.matchSimpleSelector(node as ElementNode, css)) {
        map.set(css.name, css.value);
      }
      return map;
    }, new Map());
  }

  build(node: Node, css: ParsedCss[]): StyledNode {
    return new StyledNode(node,
      this.getSpecifiedValues(node, css),
      node.children.map(c => this.build(c, css)))
  }
}
