const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const configPath = path.join(__dirname, '..', 'public', 'config.js');
const configTemplate = fs.readFileSync(configPath, 'utf8');

// Replace environment variable placeholders
const configContent = configTemplate.replace(
  /\$\{(\w+)\}/g,
  (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`Warning: Environment variable ${varName} is not defined`);
      return match; // Keep the placeholder if no value found
    }
    return value;
  }
);

// Write the updated config file
fs.writeFileSync(configPath, configContent);
console.log('✅ Environment variables replaced in config.js');
console.log('VITE_API_URL:', process.env.VITE_API_URL);
