import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "cmd.exe" : "npm";

const processes = [
  spawn(command, isWindows ? ["/c", "npm", "run", "api"] : ["run", "api"], { stdio: "inherit" }),
  spawn(command, isWindows ? ["/c", "npm", "run", "dev:vite"] : ["run", "dev:vite"], { stdio: "inherit" }),
];

function shutdown() {
  for (const child of processes) child.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
