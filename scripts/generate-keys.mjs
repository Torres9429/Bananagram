/**
 * Genera un par RSA 2048 en Node puro (crypto.generateKeyPairSync).
 *
 * Por qué Node y no openssl CLI: funciona igual en macOS, Linux y Windows sin
 * instalar binarios extra.
 *
 * Por qué RS256 (par asimétrico): solo auth-service tiene la privada y puede
 * FIRMAR tokens. core-service, alexa-service y el gateway solo necesitan la
 * pública (vía JWKS) para VERIFICAR. Con HS256 el secreto compartido permitía
 * a cualquier servicio firmar tokens también.
 */
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysDir = join(__dirname, '..', 'keys');
const privatePath = join(keysDir, 'jwt_private.pem');
const publicPath = join(keysDir, 'jwt_public.pem');

if (existsSync(privatePath) && existsSync(publicPath)) {
  console.log('Las llaves ya existen en keys/. No se regeneran (evita invalidar tokens en curso).');
  console.log('Si quieres forzar regeneración, borra keys/ y vuelve a ejecutar este script.');
  process.exit(0);
}

mkdirSync(keysDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

writeFileSync(privatePath, privateKey, { mode: 0o600 });
writeFileSync(publicPath, publicKey, { mode: 0o644 });

console.log('Llaves RSA generadas:');
console.log('  -', privatePath);
console.log('  -', publicPath);
console.log('Recuerda: keys/ está en .gitignore. Nunca las subas al repositorio.');
