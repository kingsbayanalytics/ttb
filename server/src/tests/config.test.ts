import { parseConfig, loadConfig } from '../config';

describe('config.ts', () => {
  it('applies safe development defaults when optional env vars are omitted', () => {
    const cfg = parseConfig({});
    expect(cfg).toEqual({
      nodeEnv: 'development',
      isProduction: false,
      isTest: false,
      port: 3001,
      mongodbUri: 'mongodb://localhost:27017/type-the-bible',
      authMode: 'local',
      jwtSecret: undefined,
      ownerOid: undefined,
      websiteAuthEnabled: false,
      corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    });
  });

  it('parses valid PORT values and rejects invalid PORT values', () => {
    expect(parseConfig({ PORT: '8080' }).port).toBe(8080);
    expect(parseConfig({ PORT: '1' }).port).toBe(1);
    expect(parseConfig({ PORT: '65535' }).port).toBe(65535);

    expect(() => parseConfig({ PORT: '0' })).toThrow(/Invalid PORT/);
    expect(() => parseConfig({ PORT: '65536' })).toThrow(/Invalid PORT/);
    expect(() => parseConfig({ PORT: '-1' })).toThrow(/Invalid PORT/);
    expect(() => parseConfig({ PORT: 'abc' })).toThrow(/Invalid PORT/);
    expect(() => parseConfig({ PORT: '3001.5' })).toThrow(/Invalid PORT/);
  });

  it('rejects invalid NODE_ENV and AUTH_MODE values', () => {
    expect(() => parseConfig({ NODE_ENV: 'staging' })).toThrow(/Invalid NODE_ENV/);
    expect(() => parseConfig({ AUTH_MODE: 'oauth' })).toThrow(/Invalid AUTH_MODE/);
  });

  it('requires JWT_SECRET when NODE_ENV=production and AUTH_MODE=local', () => {
    expect(() =>
      parseConfig({ NODE_ENV: 'production', AUTH_MODE: 'local' })
    ).toThrow(/JWT_SECRET is required/);

    expect(() =>
      parseConfig({ NODE_ENV: 'production', AUTH_MODE: 'local', JWT_SECRET: '   ' })
    ).toThrow(/JWT_SECRET is required/);

    const prodLocal = parseConfig({
      NODE_ENV: 'production',
      AUTH_MODE: 'local',
      JWT_SECRET: 'strong-prod-secret',
      MONGODB_URI: 'mongodb+srv://example/ttb',
    });
    expect(prodLocal.isProduction).toBe(true);
    expect(prodLocal.jwtSecret).toBe('strong-prod-secret');
    expect(prodLocal.corsOrigins).toEqual([]);
  });

  it('requires WEBSITE_AUTH_ENABLED=True and OWNER_OID when AUTH_MODE=entra', () => {
    expect(() =>
      parseConfig({
        NODE_ENV: 'production',
        AUTH_MODE: 'entra',
        OWNER_OID: 'owner-oid-123',
      })
    ).toThrow(/WEBSITE_AUTH_ENABLED=True is required/);

    expect(() =>
      parseConfig({
        NODE_ENV: 'production',
        AUTH_MODE: 'entra',
        WEBSITE_AUTH_ENABLED: 'true',
        OWNER_OID: 'owner-oid-123',
      })
    ).toThrow(/WEBSITE_AUTH_ENABLED=True is required/);

    expect(() =>
      parseConfig({
        NODE_ENV: 'production',
        AUTH_MODE: 'entra',
        WEBSITE_AUTH_ENABLED: 'True',
      })
    ).toThrow(/OWNER_OID is required/);

    const entraCfg = parseConfig({
      NODE_ENV: 'production',
      AUTH_MODE: 'entra',
      WEBSITE_AUTH_ENABLED: 'True',
      OWNER_OID: 'owner-oid-123',
      MONGODB_URI: 'mongodb+srv://example/ttb',
    });
    expect(entraCfg.authMode).toBe('entra');
    expect(entraCfg.websiteAuthEnabled).toBe(true);
    expect(entraCfg.ownerOid).toBe('owner-oid-123');
    expect(entraCfg.corsOrigins).toEqual([]);
  });

  it('parses custom CORS_ORIGINS in non-production and forces empty list in production', () => {
    const devCfg = parseConfig({
      NODE_ENV: 'development',
      CORS_ORIGINS: 'http://localhost:3000, http://localhost:4000 ',
    });
    expect(devCfg.corsOrigins).toEqual(['http://localhost:3000', 'http://localhost:4000']);

    const prodCfg = parseConfig({
      NODE_ENV: 'production',
      AUTH_MODE: 'local',
      JWT_SECRET: 'secret',
      CORS_ORIGINS: 'https://evil.example',
    });
    expect(prodCfg.corsOrigins).toEqual([]);
  });

  it('exits with code 1 and logs a clear message on invalid boot config', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {
        throw new Error('process.exit');
      }) as never);

    expect(() =>
      loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'local' } as NodeJS.ProcessEnv)
    ).toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET is required')
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
