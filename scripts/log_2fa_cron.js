const fs = require('fs');
const path = require('path');
const otplib = require('otplib');
const base32 = require('base32.js');

const DATA_PATH = path.join('/data', 'seed.txt');
const OUTPUT_PATH = path.join('/cron', 'last_code.txt');

try {
    if (!fs.existsSync(DATA_PATH)) throw new Error('Seed file not found');

    const hexSeed = fs.readFileSync(DATA_PATH, 'utf8').trim();

    // Convert hex seed to base32
    const bytes = Buffer.from(hexSeed, 'hex');
    const encoder = new base32.Encoder({ type: 'rfc4648', lc: false });
    const base32Seed = encoder.write(bytes).finalize();

    // Generate TOTP
    otplib.authenticator.options = { step: 30, digits: 6, algorithm: 'sha1' };
    const code = otplib.authenticator.generate(base32Seed);

    // UTC timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Write to output
    fs.appendFileSync(OUTPUT_PATH, `${timestamp} - 2FA Code: ${code}\n`);
} catch (err) {
    fs.appendFileSync(OUTPUT_PATH, `Error: ${err.message}\n`);
}
