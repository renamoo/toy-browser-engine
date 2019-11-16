import { ElementNode, Node, TextNode } from './node';

export class Parser {
  pos: number;
  input: string;

  constructor(input: string) {
    this.pos = 0;
    this.input = input;
  }

  // Read the current character without consuming it.
  nextChar(): string {
    return this.input[this.pos];
  }

  // Do the next characters start with the given string?
  startsWith(expect: string): boolean {
    return `${this.input[this.pos]}${this.input[this.pos + 1]}` === expect;
  }

  // Return true if all input is consumed.
  eof(): boolean {
    return this.pos === (this.input.length - 1);
  }

  consumeChar(): string {
    const current = this.pos;
    this.pos += 1;
    return this.input[current];
  }

  // Consume characters until `test` returns false.
  consumeWhile(test: (str: string) => boolean): string {
    let result = '';
    while (test(this.input[this.pos])) {
      result += this.consumeChar();
    }
    return result;
  }

  // Consume and discard zero or more whitespace characters.
  consumeWhitespace() {
    this.consumeWhile((s: string) => {
      return s.trim().length === 0;
    });
  }

  // Parse a tag or attribute name.
  parseTagName(): string {
    return this.consumeWhile((s: string) => {
      return !!s.match(/[a-z|A-Z|0-9]/g);
    })
  }

  // Parse a single node.
  parseNode(): Node {
    return this.nextChar() === '<' ? this.parseElement() : this.parseText();
  }

  // Parse a text node.
  parseText(): Node {
    return new TextNode(this.consumeWhile(s => s !== '<'), []);
  }

  // Parse a single element, including its open tag, contents, and closing tag.
  parseElement(): Node {
    // Opening tag.
    if (this.consumeChar() !== '<') {
      throw new Error('it is not opening tag!');
    }
    let tag_name = this.parseTagName();
    let attrs = this.parseAttributes();
    if (this.consumeChar() !== '>') {
      throw new Error('it is not closing tag!');
    }

    // Contents.
    let children = this.parseNodes();

    // Closing tag.
    if (this.consumeChar() !== '<') {
      throw new Error('it is not opening tag!');
    }
    if (this.consumeChar() !== '/') {
      throw new Error('it is not /!');
    }
    if (this.parseTagName() !== tag_name) {
      throw new Error('it is not same tag name!');
    }
    if (this.consumeChar() !== '>') {
      throw new Error('it is not closing tag!');
    }

    return new ElementNode(tag_name, children, tag_name, attrs);
  }

  // Parse a single name="value" pair.
  parseAttr(): { name: string, value: string } {
    let name = this.parseTagName();
    const char = this.nextChar();
    if (this.consumeChar() !== '=') {
      throw new Error(`${char} is not =!`);
    }
    let value = this.parseAttrValue();
    return { name: name, value: value };
  }

  // Parse a quoted value.
  parseAttrValue(): string {
    let open_quote = this.consumeChar();
    if (open_quote !== '"' && open_quote !== '\'') {
      throw new Error('it is not open quote');
    }
    let value = this.consumeWhile(s => s != open_quote);
    if (this.consumeChar() !== open_quote) {
      throw new Error('it is not open quote');
    }
    return value;
  }

  // Parse a list of name="value" pairs, separated by whitespace.
  parseAttributes(): Map<string, string> {
    let attributes = new Map();
    for (let i = 0; i < 100; i++) {
      this.consumeWhitespace();
      if (this.nextChar() == '>') {
        break;
      }
      let { name, value } = this.parseAttr();
      attributes.set(name, value);
    }
    return attributes;
  }

  // Parse a sequence of sibling nodes.
  parseNodes(): Node[] {
    let nodes = [];
    while (true) {
      if (this.eof() || this.startsWith("</")) {
        break;
      }
      this.consumeWhitespace();
      if (this.eof() || this.startsWith("</")) {
        break;
      }
      nodes.push(this.parseNode());
    }
    return nodes;
  }

}

