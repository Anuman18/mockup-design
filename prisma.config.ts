import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'eventelligence.db');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`,
  },
});
