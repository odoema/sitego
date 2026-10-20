'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function createStore(file) {
  async function read() {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      return { sites: Array.isArray(data.sites) ? data.sites : [] };
    } catch {
      return { sites: [] };
    }
  }

  async function write(data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temporary, file);
  }

  return { read, write };
}

module.exports = { createStore };
