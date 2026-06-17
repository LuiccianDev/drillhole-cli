import figlet from 'figlet';

const subtitle = 'Drillhole Stats · Vulcan Project';

function rgb(grayValue, text) {
  return `\x1b[38;2;${grayValue};${grayValue};${grayValue}m${text}\x1b[39m`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function printBanner() {
  const out = process.stdout;
  
  const bannerText = figlet.textSync('drillhole', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });

  const lines = bannerText.split('\n');

  // Non-TTY fallback
  if (!out.isTTY || 'NO_COLOR' in process.env) {
    out.write('\n' + bannerText + '\n');
    out.write(`   \x1b[2m${subtitle}\x1b[0m\n\n`);
    return;
  }

  const rows = lines.length;
  const speed = 2.0;
  const delay = 30;
  
  // Simple fade-in animation
  out.write('\x1b[?25l\n'); // hide cursor

  const totalFrames = 10;
  for (let frame = 0; frame <= totalFrames; frame++) {
    const progress = frame / totalFrames;
    const grayValue = Math.round(63 + progress * (244 - 63));
    
    const coloredLines = lines.map(line => rgb(grayValue, line));
    out.write(coloredLines.join('\n') + '\n');

    if (frame < totalFrames) {
      out.write(`\x1b[${rows}A\r`); // move cursor back up
      await sleep(delay);
    }
  }

  out.write(`   \x1b[2m${subtitle}\x1b[0m\n`);
  out.write('\x1b[?25h\n'); // show cursor
}
