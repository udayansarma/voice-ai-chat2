#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'public', 'config.js');

// Read the config file
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace environment variable placeholders
const apiUrl = process.env.VITE_API_URL || 'http://localhost:5000';
configContent = configContent.replace('${VITE_API_URL}', apiUrl);

// Write the updated config file
fs.writeFileSync(configPath, configContent);

console.log(`✅ Updated config.js with VITE_API_URL: ${apiUrl}`);
