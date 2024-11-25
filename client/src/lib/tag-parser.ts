export class TagParser {
  static subcategory(tag: string): string {
    return tag.substring(0, tag.lastIndexOf('.'));
  }

  static label(tag: string): string {
    return tag.substring(tag.lastIndexOf('.') + 1);
  }

  static depth(tag: string): number {
    let dots = 0;
    for (let n = 0; n < tag.length; ++n) {
      if (tag[n] === '.') ++dots;
    }

    return dots;
  }
}
