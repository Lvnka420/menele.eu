# Wdrożenie na Cloudflare

## Wymagania
- Konto na Cloudflare Pages
- Zainstalowany Node.js oraz Wrangler CLI

## Instalacja Wranlger CLI

```bash
npm install -g wrangler
```

## Konfiguracja

1. Zaloguj się do Cloudflare:
```bash
wrangler login
```

2. Aktualizuj `wrangler.toml` - dodaj swoje dane:
```toml
name = "menele-api"
type = "javascript"
compatibility_date = "2024-01-01"
account_id = "YOUR_ACCOUNT_ID"
```

Swoją `account_id` znajdziesz w [panelu Cloudflare](https://dash.cloudflare.com/).

## Struktura projektu

```
menele.eu/
├── src/
│   └── index.js          # Worker API (logowanie/rejestracja)
├── wrangler.toml         # Konfiguracja
├── logowanie.html        # Strona logowania
├── rejestracja.html      # Strona rejestracji
└── ... (pozostałe pliki)
```

## Wdrażanie

### Opcja 1: Cloudflare Workers + Pages (zalecane)

1. Wdróż Worker API:
```bash
wrangler deploy
```

2. Wdróż strony statyczne na Cloudflare Pages:
   - Podłącz repozytorium do Cloudflare Pages
   - Build command: (puste - to są pliki statyczne)
   - Publish directory: `/`

### Opcja 2: Lokalny test

```bash
wrangler dev
```

Worker będzie dostępny na `http://localhost:8787`

## Funkcjonowanie

System zapisuje dane użytkowników w pamięci Workera. **Wersja dla testowania!**

- **POST `/api/register`** - Rejestracja użytkownika
  ```json
  {
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "password": "SecurePassword123"
  }
  ```

- **POST `/api/login`** - Logowanie
  ```json
  {
    "email": "jan@example.com",
    "password": "SecurePassword123"
  }
  ```

Odpowiedź:
```json
{
  "token": "token_abc123_xyz789",
  "user": {
    "name": "Jan Kowalski",
    "email": "jan@example.com"
  }
}
```

## Produkcja

Dla produkcji zalecam:
1. Użyć **Cloudflare D1** (SQLite) zamiast in-memory storage
2. Implementować lepsze hashowanie haseł (bcrypt)
3. Dodać rate limiting
4. Implementować refresh tokens

## Zmienne środowiskowe

Możesz dodać zmienne środowiskowe w `wrangler.toml`:

```toml
[env.production]
vars = { ENVIRONMENT = "production" }
```

A następnie uzyskać dostęp w kodzie:
```javascript
export default {
  async fetch(request, env) {
    console.log(env.ENVIRONMENT);
  }
}
```

## Rozwiązywanie problemów

### Błąd: "Account ID not found"
- Dodaj `account_id` do `wrangler.toml`

### Błąd CORS
- Worker już zwraca odpowiednie nagłówki CORS
- Sprawdź konsolę przeglądarki

### Dane się reset'ują
- In-memory storage nie persystuje danych między restartami Workera
- Dla produkcji użyj D1 lub Durable Objects
