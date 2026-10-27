import { buildApp } from './app.js';
import { listen } from './runtime.js';

await listen(buildApp());
