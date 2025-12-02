const fs = require('fs');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const otplib = require('otplib');
const base32 = require('base32.js');

const app = express();
app.use(express.json());

const DATA_PATH = path.join(__dirname, 'data', 'seed.txt');
const PRIVATE_KEY_PATH = path.join(__dirname, 'student_private.pem');

// Home route (IMPORTANT: put before app.listen)
app.get("/", (req, res) => {
    res.send("Server is working!");
});

/**
 * Decrypt base64-encoded encrypted seed
 */
function decryptSeed(encryptedSeedB64, privateKey) {
  const decryptedBuffer = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedSeedB64, 'base64')
  );

  const hexSeed = decryptedBuffer.toString('utf8').trim();

  if (!/^[0-9a-f]{64}$/.test(hexSeed)) {
    throw new Error('Invalid decrypted seed format');
  }

  return hexSeed;
}

// Convert hex seed to base32
function hexToBase32(hexSeed) {
  const bytes = Buffer.from(hexSeed, 'hex');
  const encoder = new base32.Encoder({ type: 'rfc4648', lc: false });
  return encoder.write(bytes).finalize();
}

// Generate TOTP
function generateTotpCode(hexSeed) {
  const base32Seed = hexToBase32(hexSeed);
  otplib.authenticator.options = { step: 30, digits: 6, algorithm: 'sha1' };
  return otplib.authenticator.generate(base32Seed);
}

// Verify TOTP
function verifyTotpCode(hexSeed, code, validWindow = 1) {
  const base32Seed = hexToBase32(hexSeed);
  otplib.authenticator.options = { step: 30, digits: 6, algorithm: 'sha1', window: validWindow };
  return otplib.authenticator.check(code, base32Seed);
}

/**
 * POST /decrypt-seed
 */
app.post('/decrypt-seed', (req, res) => {
  try {
    const { encrypted_seed } = req.body;
    if (!encrypted_seed) return res.status(400).json({ error: 'Missing encrypted_seed' });

    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const seed = decryptSeed(encrypted_seed, privateKey);

    fs.writeFileSync(DATA_PATH, seed, { encoding: 'utf8', flag: 'w' });

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Decryption failed' });
  }
});

/**
 * GET /generate-2fa
 */
app.get('/generate-2fa', (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) return res.status(500).json({ error: "Seed not decrypted yet" });

    const hexSeed = fs.readFileSync(DATA_PATH, 'utf8').trim();
    const code = generateTotpCode(hexSeed);
    const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);

    res.json({ code, valid_for: remaining });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Seed not decrypted yet" });
  }
});

/**
 * POST /verify-2fa
 */
app.post('/verify-2fa', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });
    if (!fs.existsSync(DATA_PATH)) return res.status(500).json({ error: "Seed not decrypted yet" });

    const hexSeed = fs.readFileSync(DATA_PATH, 'utf8').trim();
    const valid = verifyTotpCode(hexSeed, code);

    res.json({ valid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Seed not decrypted yet" });
  }
});

// Start server
app.listen(8080, () => console.log('Server running on port 8080'));
