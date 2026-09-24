// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";

const READY_TIMEOUT = 120_000;

// The child stays in this process's group and is bound to the run's signal,
// so a build or a preview never outlives the run that started it.
function vite(appDirectory, args, signal, stdout = "inherit") {
  return spawn(path.join(appDirectory, "node_modules", ".bin", "vite"), args, {
    cwd: appDirectory,
    stdio: ["ignore", stdout, "inherit"],
    signal,
  });
}

export async function build(appDirectory, signal) {
  const [code] = await once(vite(appDirectory, ["build"], signal), "close");
  if (code !== 0) throw new Error(`vite build failed in ${appDirectory}`);
}

// A server already on the port would answer for someone else's build, and the
// pictures would be of that. The port has to be ours before anything starts.
export async function ensurePortFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", error => reject(error.code === "EADDRINUSE"
      ? new Error(`Port ${port} is already in use; stop it or pass another --preview-port`)
      : error));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve()));
  });
}

// Serves the build on the host. The device reaches it through an adb reverse
// on the same port, so the address is the same on both sides.
export async function startPreview(appDirectory, port, signal) {
  await ensurePortFree(port);
  const child = vite(appDirectory, ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], signal, "pipe");
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill("SIGTERM");
    await once(child, "close");
  };
  const url = `http://127.0.0.1:${port}/`;
  // This server's own word that it is serving, not whatever answers the port.
  child.stdout.setEncoding("utf8");
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`vite preview did not announce ${url}`)), READY_TIMEOUT);
      const done = error => { clearTimeout(timer); child.stdout.off("data", onData); error ? reject(error) : resolve(); };
      const onData = chunk => {
        process.stdout.write(chunk);
        if (chunk.includes(`:${port}/`)) done();
      };
      child.stdout.on("data", onData);
      child.once("close", code => done(new Error(`vite preview exited (${code}) before serving ${url}`)));
      child.once("error", done);
    });
  } catch (error) {
    await stop();
    throw error;
  }
  child.stdout.on("data", chunk => process.stdout.write(chunk));
  return { url, stop };
}
