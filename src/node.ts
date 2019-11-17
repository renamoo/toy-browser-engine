import { Display } from "./layout-tree-builder";

export class Node {
  children: Node[];
  nodeType: string = 'Element';
  name: string;

  constructor(name: string, children: Node[]) {
    this.name = name;
    this.children = children;
  }

  printTree(depth = 0) {
    let blank = '';
    for (let i = 0; i < depth; i++) {
      blank += ' ';
    }
    console.log(`${blank}${depth > 0 ? '-' : ''}${this.name}`);
    this.children.forEach(n => n.printTree(depth + 1));
  }
}

export class ElementNode extends Node {
  nodeType = 'Element';
  tagName: string;
  attributes: Map<string, string>;

  constructor(name: string, children: Node[], tagName: string, attributes: Map<string, string>) {
    super(name, children);
    this.tagName = tagName;
    this.attributes = attributes;
  }

  getAttr(name: string) {
    return this.attributes.get(name);
  }

}

export class TextNode extends Node {
  nodeType = 'Text';
}

export class StyledNode {
  node: Node;
  specifiedValues: Map<string, unknown>;
  children: StyledNode[];

  constructor(node: Node,
    specifiedValues: Map<string, unknown>,
    children: StyledNode[]) {
    this.node = node;
    this.specifiedValues = specifiedValues;
    this.children = children;
  }

  getAttr(name: string) {
    return this.specifiedValues.get(name);
  }

  getDisplay(): string {
    return this.getAttr('display') as string || Display.NONE;
  }
}
