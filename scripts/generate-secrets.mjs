import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const terminal = createInterface({ input: stdin, output: stdout });
const password = await terminal.question("Choose the private Higher Staff code: ");
terminal.close();

if (password.length < 10) {
  console.error("The Higher Staff code must contain at least 10 characters.");
  process.exit(1);
}

const iterations = 210_000;
const salt = randomBytes(16);
const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256");

console.log("\nAdd these values to Vercel Environment Variables:\n");
console.log(`AUTH_SECRET=${randomBytes(48).toString("hex")}`);
console.log(`MANAGEMENT_PASSWORD_HASH=${iterations}:${salt.toString("hex")}:${derived.toString("hex")}`);
console.log("\nThe original Higher Staff code is not stored in the project.");
