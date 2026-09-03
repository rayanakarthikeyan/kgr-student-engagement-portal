import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "cmd.exe" : "npm";

function run(script) {
  return spawn(command, isWindows ? ["/c", "npm", "run", script] : ["run", script], {
    stdio: "inherit",
  });
}

const processes = [run("api:local"), run("dev:vite")];

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
