export default (args: string[]): string[] => args.map((text) => (/\s/.test(text) ? `"${text}"` : text));
