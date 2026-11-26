export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <h1>nice find</h1>
      <p className="sub">Vintage collectables · Adelaide</p>
      <h2>Enter passcode</h2>
      <p className="meta">This inventory is private. Enter the passcode to open it.</p>
      <form action="/api/login" method="post">
        <label htmlFor="code">Passcode</label>
        <input
          id="code"
          name="code"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Your passcode"
        />
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" type="submit">
            Unlock
          </button>
        </div>
      </form>
      {sp.error && (
        <p style={{ color: "#e4020b", fontWeight: 600 }}>Wrong code — try again.</p>
      )}
    </main>
  );
}
