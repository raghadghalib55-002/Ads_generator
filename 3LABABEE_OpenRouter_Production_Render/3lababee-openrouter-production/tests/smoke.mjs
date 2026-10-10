import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = 31000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: String(port), OPENROUTER_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stderr.on("data", (chunk) => { output += chunk.toString(); });
server.stdout.on("data", (chunk) => { output += chunk.toString(); });

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

  const empty = await fetch(`${base}/api/generate-post`, { method: "POST" });
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).code, "missing_product");

  const form = new FormData();
  form.append("product", new Blob(["not an image"], { type: "image/png" }), "fake.png");
  const invalid = await fetch(`${base}/api/generate-post`, { method: "POST", body: form });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, "invalid_image");

  const large = new FormData();
  large.append("product", new Blob([new Uint8Array(20 * 1024 * 1024 + 1)], { type: "image/png" }), "large.png");
  const oversized = await fetch(`${base}/api/generate-post`, { method: "POST", body: large });
  assert.equal(oversized.status, 400);
  assert.equal((await oversized.json()).code, "upload_error");

  console.log("Smoke tests passed: health, missing upload, invalid image, oversized upload.");
} finally {
  server.kill();
}
