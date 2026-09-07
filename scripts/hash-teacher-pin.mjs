import { randomBytes, scryptSync } from "node:crypto";

const pin = process.argv[2]?.trim();
if (!/^\d{6}$/.test(pin ?? "")) {
  console.error("Usage: npm run hash:teacher-pin -- 123456");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(pin, salt, 32).toString("hex");
console.log(`${salt}:${hash}`);
