const CODE_VERIFIER_LENGTH = 128;
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function generateCodeVerifier() {
  let verifier = '';
  const randomValues = new Uint8Array(CODE_VERIFIER_LENGTH);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < CODE_VERIFIER_LENGTH; i++) {
    verifier += CHARSET.charAt(randomValues[i] % CHARSET.length);
  }
  console.log('PKCE verifier length:', verifier.length);
  return verifier;
}

export async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  console.log('PKCE challenge:', base64);
  return base64;
}