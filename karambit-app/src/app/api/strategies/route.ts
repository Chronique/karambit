export async function GET() {
  try {
    const [zest, bitflow, stackingdao] = await Promise.all([
      fetch("https://app.zestprotocol.com/api/markets", { next: { revalidate: 300 } }),
      fetch("https://api.bitflow.finance/v1/pools", { next: { revalidate: 300 } }),
      fetch("https://api.stackingdao.com/v1/stacking-stats", { next: { revalidate: 300 } }),
    ]);

    return Response.json({
      zest: zest.ok ? await zest.json() : null,
      bitflow: bitflow.ok ? await bitflow.json() : null,
      stackingdao: stackingdao.ok ? await stackingdao.json() : null,
    });
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }
}