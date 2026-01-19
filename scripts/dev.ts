function start(name: string, cmd: string[]) {
  const proc = Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: Bun.env,
  });
  proc.exited.then((code) => {
    if (code !== 0) console.error(`${name} exited with code ${code}`);
    process.exit(code);
  });
  return proc;
}

const api = start("api", ["bun", "--watch", "server/index.ts"]);
const ui = start("ui", ["bunx", "vite"]);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    api.kill();
    ui.kill();
    process.exit(0);
  });
}

