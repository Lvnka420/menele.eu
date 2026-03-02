// Durable Object do przechowywania danych użytkowników
export class AuthDatabase {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST') {
      if (path.includes('/api/register')) {
        return this.register(request);
      } else if (path.includes('/api/login')) {
        return this.login(request);
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  async register(request) {
    try {
      const { name, email, password } = await request.json();

      if (!name || !email || !password) {
        return new Response(
          JSON.stringify({ message: 'Wszystkie pola są wymagane!' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Sprawdź czy email już istnieje
      const existingUser = await this.storage.get(`user:${email}`);
      if (existingUser) {
        return new Response(
          JSON.stringify({ message: 'Email już zarejestrowany!' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Proste hashowanie (w production użyj bcrypt)
      const hashedPassword = await this.hashPassword(password);
      const user = {
        name,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };

      await this.storage.put(`user:${email}`, JSON.stringify(user));

      // Wygeneruj token
      const token = this.generateToken();
      await this.storage.put(`token:${token}`, email, { expirationTtl: 86400 * 7 });

      return new Response(
        JSON.stringify({
          token,
          user: { name, email }
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ message: 'Błąd rejestracji!' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  async login(request) {
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return new Response(
          JSON.stringify({ message: 'Email i hasło są wymagane!' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Szukaj użytkownika
      const userStr = await this.storage.get(`user:${email}`);
      if (!userStr) {
        return new Response(
          JSON.stringify({ message: 'Nieprawidłowy email lub hasło!' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const user = JSON.parse(userStr);

      // Weryfikuj hasło
      const passwordMatch = await this.verifyPassword(password, user.password);
      if (!passwordMatch) {
        return new Response(
          JSON.stringify({ message: 'Nieprawidłowy email lub hasło!' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Wygeneruj token
      const token = this.generateToken();
      await this.storage.put(`token:${token}`, email, { expirationTtl: 86400 * 7 });

      return new Response(
        JSON.stringify({
          token,
          user: { name: user.name, email }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ message: 'Błąd logowania!' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  async hashPassword(password) {
    // Proste hashowanie - w production użyj libsodium lub scrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt123');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return 'sha256:' + Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async verifyPassword(password, hash) {
    const newHash = await this.hashPassword(password);
    return newHash === hash;
  }

  generateToken() {
    return 'token_' + Math.random().toString(36).substr(2, 9) +
           '_' + Date.now().toString(36);
  }
}
