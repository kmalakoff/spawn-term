// Column width defaults
export const DEFAULT_COLUMN_WIDTH = 15;
export const MAX_COLUMN_WIDTH_PERCENT = 0.4; // 40% of terminal width
export const FALLBACK_COLUMN_WIDTH = 25;

// Batching defaults
export const BATCH_MAX_LINES = 20;
export const BATCH_MAX_WAIT_MS = 50;

// Rendering
export const DEFAULT_MAX_FPS = 20;

// Expansion
export const EXPANDED_MAX_VISIBLE_LINES = 10;

// From: https://github.com/sindresorhus/cli-spinners/blob/00de8fbeee16fa49502fa4f687449f70f2c8ca2c/spinners.json#L2
export const SPINNER = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};
