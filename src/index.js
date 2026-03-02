
// Prosty storage w pamięci (na Cloudflare Workers)
let users = {};

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt123');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

function generateToken() {
  return 'token_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
}

async function register(request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return new Response(
      JSON.stringify({ message: 'Wszystkie pola są wymagane!' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (users[email]) {
    return new Response(
      JSON.stringify({ message: 'Email już zarejestrowany!' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const hashedPassword = await hashPassword(password);
  users[email] = {
    name,
    email,
    password: hashedPassword
  };

  const token = generateToken();

  return new Response(
    JSON.stringify({ token, user: { name, email } }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
}

async function login(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ message: 'Email i hasło są wymagane!' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const user = users[email];
  if (!user) {
    return new Response(
      JSON.stringify({ message: 'Nieprawidłowy email lub hasło!' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) {
    return new Response(
      JSON.stringify({ message: 'Nieprawidłowy email lub hasło!' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = generateToken();

  return new Response(
    JSON.stringify({ token, user: { name: user.name, email } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Ustaw CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/api/register' && request.method === 'POST') {
      const response = await register(request);
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    if (path === '/api/login' && request.method === 'POST') {
      const response = await login(request);
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    return new Response('Not Found', { status: 404 });
  }
};
