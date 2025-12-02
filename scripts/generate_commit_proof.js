const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');

// ---------------------------
// Step 1: Get latest commit hash
// ---------------------------
let commitHash;
try {
    commitHash = execSync('git log -1 --format=%H').toString().trim();
    console.log('Commit Hash:', commitHash);
} catch (err) {
    console.error('Error getting commit hash:', err);
    process.exit(1);
}

// ---------------------------
// Step 2: Load student private key
// ---------------------------
const studentPrivateKeyPath = path.join(__dirname, '../student_private.pem');
let studentPrivateKey;
try {
    studentPrivateKey = fs.readFileSync(studentPrivateKeyPath, 'utf8');
} catch (err) {
    console.error('Error reading student private key:', err);
    process.exit(1);
}

// ---------------------------
// Step 3: Sign commit hash using RSA-PSS SHA-256
// ---------------------------
let signature;
try {
    const signer = crypto.createSign('sha256');
    signer.update(commitHash);
    signer.end();

    signature = signer.sign({
        key: studentPrivateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN
    });
} catch (err) {
    console.error('Error signing commit hash:', err);
    process.exit(1);
}

// ---------------------------
// Step 4: Load instructor public key
// ---------------------------
const instructorPublicKeyPath = path.join(__dirname, '../instructor_public.pem');
let instructorPublicKey;
try {
    instructorPublicKey = fs.readFileSync(instructorPublicKeyPath, 'utf8');
} catch (err) {
    console.error('Error reading instructor public key:', err);
    process.exit(1);
}

// ---------------------------
// Step 5: Encrypt signature with instructor public key (RSA-OAEP SHA-256)
// ---------------------------
let encryptedSignature;
try {
    encryptedSignature = crypto.publicEncrypt(
        {
            key: instructorPublicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        signature
    );
} catch (err) {
    console.error('Error encrypting signature:', err);
    process.exit(1);
}

// ---------------------------
// Step 6: Base64 encode
// ---------------------------
const base64Signature = encryptedSignature.toString('base64');

// ---------------------------
// Output
// ---------------------------
console.log('\nEncrypted Commit Signature (Base64):');
console.log(base64Signature);
