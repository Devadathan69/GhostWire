import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile, access, open } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = resolve(root, '.local/phone-test');
const stateFile = resolve(local, 'state.json');
const stopFile = resolve(local, 'stop.json');
const binary = resolve(root, '.local/tools/cloudflared.exe');
const release = {
  version: '2026.10.3',
  url: 'https://github.com/cloudflare/cloudflared/releases/download/2026.10.3/cloudflared-windows-amd64.exe',
  sha256: '76b2805253d0d6ffacb092a7acfbee99e7af6917835c0c5410e23f3ef5052da2',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
};
async function healthy(url) {
  try {
    const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
    return r.ok && (await r.json()).ok === true;
  } catch {
    return false;
  }
}
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function installTunnel() {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error(
      'This phone-test launcher targets 64-bit Windows. See docs/PHONE_TEST.md for other platforms.',
    );
  await mkdir(dirname(binary), { recursive: true });
  let data;
  try {
    data = await readFile(binary);
  } catch {
    /* download below */
  }
  if (!data || createHash('sha256').update(data).digest('hex') !== release.sha256) {
    const response = await fetch(release.url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Tunnel download failed (${response.status}).`);
    data = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(data).digest('hex') !== release.sha256)
      throw new Error('Tunnel checksum does not match the official release.');
    await writeFile(binary, data);
  }
}

async function start() {
  const existing = await readJson(stateFile);
  if (existing?.status === 'ready' && alive(existing.pid) && (await healthy(existing.url))) {
    console.log(
      `Phone test is already running.\nLaptop and phone: ${existing.url}\nTo stop: npm run phone:stop`,
    );
    return;
  }
  await access(resolve(root, 'dist/server/index.js')).catch(() => {
    throw new Error('Build the game first with npm run build.');
  });
  await installTunnel();
  const sessionId = randomUUID();
  const log = await open(resolve(local, 'launcher.log'), 'a');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', sessionId], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', log.fd, log.fd],
  });
  child.unref();
  await log.close();
  for (let i = 0; i < 90; i++) {
    const state = await readJson(stateFile);
    if (state?.sessionId === sessionId) {
      if (state.status === 'ready') {
        console.log(
          `PHONE TEST READY\nLaptop and phone: ${state.url}\nCreate a raid on the laptop, then scan its QR code on the phone.\nThe temporary link works while this laptop is awake.\nTo stop: npm run phone:stop`,
        );
        return;
      }
      if (state.status === 'failed') throw new Error(state.error);
    }
    await sleep(1000);
  }
  throw new Error(
    'Phone test is still starting. Run npm run phone:status or inspect .local/phone-test/launcher.log.',
  );
}

async function serve(sessionId) {
  const previous = await readJson(stateFile);
  if (previous?.status === 'ready' && alive(previous.pid))
    throw new Error('Another phone-test session is already running.');
  let state = {
    sessionId,
    pid: process.pid,
    status: 'starting',
    startedAt: new Date().toISOString(),
    url: null,
  };
  const save = async () => writeFile(stateFile, JSON.stringify(state, null, 2));
  await save();
  let tunnel,
    server,
    stopped = false,
    poll;
  const shutdown = async (error) => {
    if (stopped) return;
    stopped = true;
    clearInterval(poll);
    // These handles belong to this supervisor; no unrelated processes are terminated.
    if (tunnel && tunnel.exitCode === null) tunnel.kill();
    if (server && server.exitCode === null) server.kill();
    state = {
      ...state,
      status: error ? 'failed' : 'stopped',
      ...(error ? { error } : {}),
      stoppedAt: new Date().toISOString(),
    };
    await save();
    process.exit(error ? 1 : 0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  poll = setInterval(async () => {
    if ((await readJson(stopFile))?.sessionId === sessionId) void shutdown();
  }, 1000);
  try {
    const probe = createServer();
    const port = Number(process.env.PHONE_TEST_PORT || 3002);
    await new Promise((r, j) => {
      probe.once('error', j);
      probe.listen(port, '127.0.0.1', r);
    });
    await new Promise((r) => probe.close(r));
    const tunnelLog = createWriteStream(resolve(local, 'tunnel.log'), { flags: 'w' });
    tunnel = spawn(
      binary,
      ['--no-autoupdate', 'tunnel', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2'],
      { cwd: local, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    tunnel.on('error', (e) => void shutdown(e.message));
    tunnel.on('exit', (code) => {
      if (!stopped) void shutdown(`Tunnel exited (${code}). Start the phone test again.`);
    });
    const publicUrl = await new Promise((r, j) => {
      let text = '';
      const timeout = setTimeout(
        () =>
          j(new Error('No HTTPS address returned by the tunnel. Check your internet connection.')),
        45000,
      );
      const inspect = (chunk) => {
        tunnelLog.write(chunk);
        text = (text + chunk.toString()).slice(-12000);
        const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match) {
          clearTimeout(timeout);
          r(match[0]);
        }
      };
      tunnel.stdout.on('data', inspect);
      tunnel.stderr.on('data', inspect);
    });
    const serverLog = createWriteStream(resolve(local, 'server.log'), { flags: 'w' });
    server = spawn(process.execPath, [resolve(root, 'dist/server/index.js')], {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(port), PUBLIC_URL: publicUrl },
    });
    server.stdout.pipe(serverLog);
    server.stderr.pipe(serverLog);
    server.on('error', (e) => void shutdown(e.message));
    server.on('exit', (code) => {
      if (!stopped)
        void shutdown(`Game server exited (${code}). See .local/phone-test/server.log.`);
    });
    state = { ...state, port, url: publicUrl };
    await save();
    for (let i = 0; i < 30; i++) {
      if (await healthy(publicUrl)) {
        state.status = 'ready';
        await save();
        return;
      }
      await sleep(1000);
    }
    throw new Error(
      'The public game link did not become reachable. Check .local/phone-test/tunnel.log.',
    );
  } catch (e) {
    await shutdown(e.message);
  }
}

await mkdir(local, { recursive: true });
try {
  const command = process.argv[2] || 'start';
  if (command === 'serve') await serve(process.argv[3]);
  else if (command === 'start') await start();
  else if (command === 'stop') {
    const state = await readJson(stateFile);
    if (!state || !alive(state.pid) || ['stopped', 'failed'].includes(state.status))
      console.log('No active phone test.');
    else {
      await writeFile(stopFile, JSON.stringify({ sessionId: state.sessionId }));
      console.log('Stopping the phone test. Your regular localhost:3001 game stays available.');
    }
  } else if (command === 'status') {
    const state = await readJson(stateFile);
    if (!state) console.log('No phone test has been started.');
    else
      console.log(
        JSON.stringify(
          {
            status: alive(state.pid) ? state.status : 'stopped',
            url: state.url,
            startedAt: state.startedAt,
            error: state.error,
          },
          null,
          2,
        ),
      );
  } else throw new Error('Use start, status, or stop.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
