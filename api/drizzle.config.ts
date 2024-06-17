import { Config, defineConfig } from 'drizzle-kit';

export const DbConfig = {
  dialect: 'sqlite',
  schema: './src/*/schemas/*.schema.ts',
  dbCredentials: { url: './media/.config/data.db' }
};

export default defineConfig(DbConfig as Config);
