// Runs once at Next.js server startup (Node.js runtime only).
// Initialises WandB Weave so all subsequent OpenAI-compatible client calls
// are automatically traced and visible in the WandB project dashboard.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('weave')
    await init('abhijitbetigeri29-hackathon26/inference')
  }
}
