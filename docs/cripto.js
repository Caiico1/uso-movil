// Cifrado AES-256-GCM con clave derivada de la contraseña (PBKDF2-SHA256).
// Funciona igual en el navegador y en Node (globalThis.crypto.subtle).

const enc = new TextEncoder();
const dec = new TextDecoder();
// Por trozos: con muchos datos, String.fromCharCode(...todo) desborda la pila
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function derivar(clave, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(texto, clave, iter = 310000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await derivar(clave, salt, iter);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(texto));
  return JSON.stringify({ v: 1, alg: 'AES-256-GCM/PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
}

// Lanza un error si la contraseña no es correcta
export async function descifrar(paquete, clave) {
  const p = typeof paquete === 'string' ? JSON.parse(paquete) : paquete;
  const k = await derivar(clave, unb64(p.salt), p.iter);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, k, unb64(p.ct));
  return dec.decode(pt);
}
