import { spawn } from "node:child_process";

const input = process.argv.slice(2);
const args = [];
for (let index = 0; index < input.length; index += 1) {
  if (input[index] === "--host") {
    args.push("--hostname", input[index + 1] ?? "0.0.0.0");
    index += 1;
  } else if (input[index] !== "--strictPort") {
    args.push(input[index]);
  }
}

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...args], { stdio: "inherit" });
child.on("exit", (code, signal) => signal ? process.kill(process.pid, signal) : process.exit(code ?? 1));
