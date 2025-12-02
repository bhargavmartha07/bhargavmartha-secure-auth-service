const fs = require('fs');
const crypto = require('crypto');

const HEX_SEED = 'a101d184514671b41135eb5b9b66599588cfc99f4a2af4fe451841ba939bb713';
const PUBLIC_KEY_PATH = './student_public.pem';

const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

const buffer = Buffer.from(HEX_SEED, 'utf8');

const encrypted = crypto.publicEncrypt(
    {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
    },
    buffer
);

console.log(encrypted.toString('base64'));
