import { resolveRpcUrl, getFrontendPrivateKey } from '../src/utils/connection.js';

console.log('RPC localhost:', resolveRpcUrl('LOCALHOST'));
console.log('RPC fuji:', resolveRpcUrl('FUJI'));
console.log('Frontend key:', getFrontendPrivateKey());
