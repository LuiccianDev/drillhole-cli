// src/banner.js
// Animated ASCII banner inspired by AutoSkills CLI (autoskills.dev)

const LOGO_LINES = [
  '┌─┐┬─┐┬┬  ┬  ┬ ┬┌─┐┬  ┌─┐',
  '│ │├┬┘││  │  ├─┤│ ││  ├┤ ',
  '└─┘┴└─┴┴─┘┴─┘┴ ┴└─┘┴─┘└─┘',
];

function rgb(grayValue, text) {
  return `\x1b[38;2;${grayValue};${grayValue};${grayValue}m${text}\x1b[39m`;
}

function renderAnimatedLogo(frame, speed) {
  const waveFront = frame * speed;
  return LOGO_LINES.map((line, row) =>
    [...line]
      .map((ch, col) => {
        if (ch === ' ') return ch;
        const distance = col + row * 2;
        const progress = Math.max(0, Math.min(1, (waveFront - distance) / 10));
        const grayValue = Math.round(63 + progress * (244 - 63));
        return rgb(grayValue, ch);
      })
      .join('')
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function printBanner() {
  const subtitle = 'Drillhole Stats · Vulcan Project';
  const out = process.stdout;

  // Non-TTY fallback: plain colored output, no animation
  if (!out.isTTY || 'NO_COLOR' in process.env) {
    out.write('\n');
    for (const line of LOGO_LINES) {
      out.write(`   \x1b[1m\x1b[36m${line}\x1b[0m\n`);
    }
    out.write(`   \x1b[2m${subtitle}\x1b[0m\n\n`);
    return;
  }

  const cols  = Math.max(...LOGO_LINES.map((l) => l.length));
  const rows  = LOGO_LINES.length;
  const speed = 2.5;
  const delay = 28;
  const total = Math.ceil((cols + rows * 2 + 10) / speed);

  out.write('\x1b[?25l\n'); // hide cursor, add blank line

  for (let frame = 0; frame <= total; frame++) {
    const lines = renderAnimatedLogo(frame, speed);
    out.write(lines.map((line) => `   ${line}`).join('\n') + '\n');

    if (frame < total) {
      out.write(`\x1b[${rows}A\r`); // move cursor back up
      await sleep(delay);
    }
  }

  out.write(`   \x1b[2m${subtitle}\x1b[0m\n`);
  out.write('\x1b[?25h\n'); // show cursor, blank line
}
