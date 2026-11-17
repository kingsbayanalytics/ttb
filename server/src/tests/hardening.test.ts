import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { setupTestApp } from './test-setup';

describe('Server Hardening (Story 3.4)', () => {
  let tmpBuildDir: string;

  beforeAll(() => {
    tmpBuildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttb-client-build-'));
    fs.writeFileSync(
      path.join(tmpBuildDir, 'index.html'),
      '<!doctype html><html><body><div id="root">SPA</div></body></html>'
    );
    fs.mkdirSync(path.join(tmpBuildDir, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmpBuildDir, 'static', 'app.js'), 'console.log("built");');
  });

  afterAll(() => {
    fs.rmSync(tmpBuildDir, { recursive: true, force: true });
  });

  it('does not serve repo-root files or check-localstorage.html and applies helmet headers', async () => {
    const devApp = setupTestApp();

    const pkgRes = await request(devApp).get('/package.json').expect(404);
    expect(pkgRes.headers['x-content-type-options']).toBe('nosniff');
    expect(pkgRes.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(pkgRes.headers['content-security-policy']).toBeDefined();

    await request(devApp).get('/check-localstorage.html').expect(404);
    await request(devApp).get('/server/package.json').expect(404);
  });

  it('uses configured CORS origins in dev and denies cross-origin CORS headers in production', async () => {
    const devApp = setupTestApp({
      isProduction: false,
      corsOrigins: ['http://localhost:3000'],
    });

    const allowedRes = await request(devApp)
      .get('/api/auth/mode')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    expect(allowedRes.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const disallowedRes = await request(devApp)
      .get('/api/auth/mode')
      .set('Origin', 'https://evil.example')
      .expect(200);
    expect(disallowedRes.headers['access-control-allow-origin']).toBeUndefined();

    const prodApp = setupTestApp(
      {
        nodeEnv: 'production',
        isProduction: true,
        isTest: false,
        corsOrigins: [],
      },
      { clientBuildDir: tmpBuildDir }
    );

    const prodCorsRes = await request(prodApp)
      .get('/api/auth/mode')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    expect(prodCorsRes.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves client/build SPA fallback in production while unknown /api/* returns JSON 404', async () => {
    const prodApp = setupTestApp(
      {
        nodeEnv: 'production',
        isProduction: true,
        isTest: false,
        corsOrigins: [],
      },
      { clientBuildDir: tmpBuildDir }
    );

    const rootRes = await request(prodApp).get('/').expect(200);
    expect(rootRes.headers['content-type']).toMatch(/html/);
    expect(rootRes.text).toContain('SPA');

    const typingRes = await request(prodApp).get('/typing').expect(200);
    expect(typingRes.headers['content-type']).toMatch(/html/);
    expect(typingRes.text).toContain('SPA');

    const staticRes = await request(prodApp).get('/static/app.js').expect(200);
    expect(staticRes.text).toContain('built');

    // Repo root files still 404 in production
    await request(prodApp).get('/package.json').expect(404);
    await request(prodApp).get('/check-localstorage.html').expect(404);

    // Unknown /api/* returns JSON 404, not index.html
    const api404 = await request(prodApp).get('/api/does-not-exist').expect(404);
    expect(api404.headers['content-type']).toMatch(/json/);
    expect(api404.body.success).toBe(false);
    expect(api404.body.message).toContain('/api/does-not-exist');

    const apiPost404 = await request(prodApp).post('/api/does-not-exist').expect(404);
    expect(apiPost404.headers['content-type']).toMatch(/json/);
    expect(apiPost404.body.success).toBe(false);
  });
});
