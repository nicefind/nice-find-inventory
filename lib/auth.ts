// Simple passcode gate for the Nice Find inventory.
//
// The passcode lives in the APP_PASSCODE env var (set in Vercel, never in
// the repo). If it is not set, the gate is off and the app works as before
// — so a deploy can never lock the owner out by accident.
//
// The browser cookie never holds the passcode itself, only its SHA-256
// hash, and it is httpOnly so page JavaScript cannot read it.
//
// Honest limit: this is a front-door lock for the app UI only. The
// Supabase anon key is still in the client bundle, so anyone who knows
// the Supabase project URL + anon key could still reach the database
// directly. For true per-user security, use Supabase Auth + RLS instead.
export const COOKIE_NAME = "nf-auth";

export function isGateEnabled(): boolean {
  return Boolean(process.env.APP_PASSCODE);
}

export async function hashPasscode(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
