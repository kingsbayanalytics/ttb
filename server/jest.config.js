module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globalSetup: './src/tests/globalSetup.ts',
  setupFiles: ['./src/tests/setupEnv.ts'],
  testTimeout: 60000
};
