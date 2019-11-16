import { ElementNode, Node } from './node';
import { Parser } from './parser';
import { StyleTreeBuilder } from './style-tree-builder';

const html = `<html>
<body>
    <h1>Title</h1>
    <div id="main" class="test">
        <p>Hello <em>world</em>!</p>
    </div>
</body>
</html>
`;

export interface ParsedCss {
  selectorType: string;
  selector: string;
  name: string;
  value: string;
}

const parsedCSS = [{
  selectorType: 'tag',
  selector: 'html',
  name: 'font-size',
  value: '14px'
}];

function hello(n: Node): void {
  n.printTree();
}

// Parse an HTML document and return the root element.
function parse(source: string): Node {
  let nodes = new Parser(source).parseNodes();

  // If the document contains a root element, just return it. Otherwise, create one.
  if (nodes.length === 1) {
    return nodes[0];
  } else {
    return new ElementNode('html', nodes, 'html', new Map());
  }
}

function buildStyleTree(node: Node) {
  return new StyleTreeBuilder().build(node, parsedCSS);
}

const root = parse(html);
hello(root);
console.log(buildStyleTree(root));
