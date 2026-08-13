export async function verifyManagementPassword(password: string, stored: string) {
  const [iterationsText, saltHex, expectedHex] = stored.split(":");
  const iterations = Number(iterationsText);
  if (!iterations || !saltHex || !expectedHex || password.length > 256) return false;
  const salt = Uint8Array.from(saltHex.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations, hash:"SHA-256" }, key, 256);
  const actual = [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2,"0")).join("");
  if (actual.length !== expectedHex.length) return false;
  let mismatch = 0; for (let i=0;i<actual.length;i++) mismatch |= actual.charCodeAt(i)^expectedHex.charCodeAt(i);
  return mismatch === 0;
}
