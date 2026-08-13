import * as crypto from 'node:crypto';

const publicKeyHex = 'e15b369527ec5696d59f77f52f82c40212f7193d5ed59223ef295ef86faafdf7';
const privateKeyHex = '49df29e01fc8c973ea614aabdaed9041a9bc99c43e49e01c5188bfcc65bb33a1';

const keyBuffer = Buffer.from(privateKeyHex, 'hex');
const privateKey = crypto.createPrivateKey({
  key: Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'),
    keyBuffer
  ]),
  format: 'der',
  type: 'pkcs8'
});

const pubKeyBuffer = Buffer.from(publicKeyHex, 'hex');
const publicKey = crypto.createPublicKey({
  key: Buffer.concat([
    Buffer.from('302a300506032b6570032100', 'hex'),
    pubKeyBuffer
  ]),
  format: 'der',
  type: 'spki'
});

const rawBody = `{"tx_hash":"${'a'.repeat(64)}","route":"/café","method":"GET","amount":1.0}`;
const signature = crypto.sign(null, Buffer.from(rawBody, 'utf8'), privateKey);

console.log('Valid:', crypto.verify(null, Buffer.from(rawBody, 'utf8'), publicKey, signature));

// Derive pub key from private
const derivedPubKey = crypto.createPublicKey(privateKey);
console.log('Derived PK:', derivedPubKey.export({format: 'der', type: 'spki'}).toString('hex'));
