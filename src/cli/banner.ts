import figlet from 'figlet';

/**
 * Utility to wait for a specific time.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Muestra el banner del CLI con un efecto de aparición progresiva.
 */
export async function printBanner(): Promise<void> {
  const text = await new Promise<string>((resolve) => {
    figlet.text(
      'DRILLHOLE',
      {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      },
      (err, data) => resolve(data || '--- DRILL-CLI ---')
    );
  });

  const lines = text.split('\n');
  
  // Añade espacio superior para que no aparezca pegado al comando de ejecución
  console.log('\n');

  // Imprime línea por línea con un pequeño retraso para efecto de revelado
  for (const line of lines) {
    console.log(line);
    await sleep(40);
  }

  console.log('\x1b[2m%s\x1b[0m', ' Vulcan Data Assistant | v1.0.0-ts');
  
  await sleep(400); // Pausa final para suavizar la transición al menú
}
