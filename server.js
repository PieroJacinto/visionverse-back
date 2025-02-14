import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createApp } from './src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = createApp();

export default app;