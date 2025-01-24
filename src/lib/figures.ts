// From: https://github.com/sindresorhus/is-unicode-supported
function isUnicodeSupported() {
  const { env } = process;
  const { TERM, TERM_PROGRAM } = env;

  if (process.platform !== 'win32') {
    return TERM !== 'linux'; // Linux console (kernel)
  }

  return (
    Boolean(env.WT_SESSION) || // Windows Terminal
    Boolean(env.TERMINUS_SUBLIME) || // Terminus (<0.2.27)
    env.ConEmuTask === '{cmd::Cmder}' || // ConEmu and cmder
    TERM_PROGRAM === 'Terminus-Sublime' ||
    TERM_PROGRAM === 'vscode' ||
    TERM === 'xterm-256color' ||
    TERM === 'alacritty' ||
    TERM === 'rxvt-unicode' ||
    TERM === 'rxvt-unicode-256color' ||
    env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  );
}

// From https://github.com/sindresorhus/figures
const symbols = {
  arrowRight: '→',
  tick: '✔',
  info: 'ℹ',
  warning: '⚠',
  cross: '✖',
  squareSmallFilled: '◼',
  pointer: '❯',
};

const fallbackSymbols = {
  arrowRight: '→',
  tick: '√',
  info: 'i',
  warning: '‼',
  cross: '×',
  squareSmallFilled: '■',
  pointer: '>',
};

export default isUnicodeSupported() ? symbols : fallbackSymbols;
