// Loaded before every test file (vitest setupFiles). Points the app at the test database
// and a fake S3 endpoint, and turns on the in-memory mail sink.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-0123";
process.env.AUTH_URL = "http://localhost:3001";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.IRANTI_DEV_MAIL = "1";
delete process.env.VERCEL;
process.env.R2_ACCESS_KEY_ID = "test";
process.env.R2_SECRET_ACCESS_KEY = "test";
process.env.R2_BUCKET = "iranti-test";
