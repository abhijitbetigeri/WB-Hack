export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const weave = await import('weave')
    await weave.init('abhijitbetigeri29-hackathon26/inference')
  }
}
