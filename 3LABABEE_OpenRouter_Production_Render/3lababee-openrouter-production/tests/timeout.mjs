import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = 32000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["--import", path.join(root, "mock-timeout.mjs"), "server.js"], {
  env: { ...process.env, PORT: String(port), OPENROUTER_API_KEY: "fake-test-key" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => { output += chunk.toString(); });

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await sleep(150);
  }
  assert.ok(ready, `Server did not start: ${output}`);

  // A valid PNG signature is sufficient for the current server's magic-byte check.
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const form = new FormData();
  form.append("product", new Blob([png], { type: "image/png" }), "test.png");
  const started = Date.now();
  const response = await fetch(`${base}/api/generate-post`, { method: "POST", body: form });
  const body = await response.json();
  assert.equal(response.status, 504, JSON.stringify(body));
  assert.equal(body.code, "generation_timeout");
  assert.ok(!JSON.stringify(body).includes("fake-test-key"));
  assert.ok(Date.now() - started < 5000, "Mock timeout did not finish promptly");
  console.log("Timeout test passed: mocked provider abort returns HTTP 504 without exposing secrets.");
} finally {
  server.kill();
}
