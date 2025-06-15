export default (args: string[]): string[] => args.map((text) => (text.indexOf(' ') >= 0 ? `"${text}"` : text));
