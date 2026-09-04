import net from "node:net";
import { spawn } from "node:child_process";

const host = process.env.HOST ?? "0.0.0.0";
const requestedPort = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  console.error(`Invalid PORT value: ${process.env.PORT}`);
  process.exit(1);
}

function canListen(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close((error) => (error ? reject(error) : resolve(true)));
    });

    server.listen(port, host);
  });
}

let port = requestedPort;
while (port <= 65535 && !(await canListen(port))) {
  port += 1;
}

if (port > 65535) {
  console.error(`No available port found at or above ${requestedPort}.`);
  process.exit(1);
}

if (port !== requestedPort) {
  console.log(`Port ${requestedPort} is busy; using port ${port}.`);
}

const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-H", host, "-p", String(port), ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env },
);

next.once("error", (error) => {
  console.error("Unable to start the Next.js development server:", error);
  process.exit(1);
});

next.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => next.kill(signal));
}
