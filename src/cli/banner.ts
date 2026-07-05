import figlet from 'figlet';

/**
 * Utility to wait for a specific time.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Muestra el banner del CLI con un efecto de construcción letra por letra de izquierda a derecha.
 * Se inicia estrictamente desde el margen izquierdo del terminal.
 */
export async function printBanner(): Promise<void> {
  const word = 'DRILLHOLE';

  // Añade espacio inicial para el terminal
  console.log('\n');

  // Animación letra por letra de izquierda a derecha
  for (let i = 1; i <= word.length; i++) {
    // Tomamos las primeras i letras (ej: D, DR, DRI...)
    const displayWord = word.slice(0, i);

    const text = await new Promise<string>((resolve) => {
      figlet.text(
        displayWord,
        {
          font: 'ANSI Shadow',
          horizontalLayout: 'full', // 'full' ayuda a mantener la posición inicial fija a la izquierda
        },
        (err, data) => resolve(data || ''),
      );
    });

    const lines = text.split('\n');

    // Si no es la primera iteración, subimos el cursor para sobreescribir el frame anterior
    if (i > 1) {
      process.stdout.write(`\x1b[${lines.length}A`);
    }

    // Dibujamos las líneas del banner actual
    for (const line of lines) {
      // \r vuelve al inicio de línea, \x1b[K borra hasta el final
      process.stdout.write(`\r\x1b[K${line}\n`);
    }

    await sleep(120); // Velocidad de la animación por letra
  }

  // Al terminar la palabra, mostramos el resto de la info
  console.log('\x1b[2m%s\x1b[0m', ' Vulcan Data Assistant | v1.0.2-ts');

  await sleep(400); // Pausa final para suavidad
}
