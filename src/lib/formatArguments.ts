export default (args) => args.map((text) => (text.indexOf(' ') >= 0 ? `"${text}"` : text));
