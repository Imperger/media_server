export function isValidTag(tag: string): boolean {
  const blacklist = [
    ' ',
    '$',
    '&',
    '+',
    '-',
    ',',
    '/',
    ':',
    ';',
    '=',
    '?',
    '@',
    "'",
    '"',
    '<',
    '>',
    '#',
    '%',
    '{',
    '}',
    '|',
    '\\',
    '^',
    '~',
    '[',
    ']',
    '`'
  ];

  return !(
    tag.length < 1 ||
    tag.length > 128 ||
    blacklist.some((x) => tag.includes(x)) ||
    tag.startsWith('.') ||
    tag.endsWith('.') ||
    tag.includes('..')
  );
}
