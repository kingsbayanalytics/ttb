process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'local';
process.env.JWT_SECRET = 'test-jwt-secret';
delete process.env.MONGODB_URI;
delete process.env.OWNER_OID;
delete process.env.WEBSITE_AUTH_ENABLED;
