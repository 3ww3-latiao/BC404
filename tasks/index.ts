import fs from 'fs';
import './deploy';
import './call';

// Create the data directory if it doesn't exist
fs.mkdirSync('./data', { recursive: true });
