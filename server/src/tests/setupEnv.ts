process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
delete process.env.MONGODB_URI;
