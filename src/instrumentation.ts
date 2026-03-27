export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initKuromoji } = await import('./lib/tokenizer-server');
    await initKuromoji();
    console.log('Kuromoji initialized');
  }
}
