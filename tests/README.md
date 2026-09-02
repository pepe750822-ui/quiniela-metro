# Playwright Smoke Tests — Quiniela Metro

## Qué cubren
| Test | Qué verifica |
|------|--------------|
| Admin → `/admin` | Panel accesible |
| Admin → Tabla J6 | Columna 🏆 +5 visible |
| Admin → Tabla J7 | Separadores correctos |
| Admin → Dashboard | Métricas cargan |
| User → Predicciones J6 | Formulario accesible |
| User → Publicar + ✅ | Flujo completo |
| User → Perfil | Historial visible |
| Selector jornada | Navegación J1↔J7 |
| Teclado | Tabla navegable |

## Ejecutar

```bash
# Dev server + tests (reutiliza servidor si ya corre)
npm run test

# Con UI interactiva
npm run test:ui

# Modo headed (ve el navegador)
npm run test:headed
```

## Configuración (local / CI)

Variables de entorno requeridas:

| Variable | Dónde | Ejemplo |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / GitHub Secrets | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` / GitHub Secrets | `eyJ...` |
| `TEST_ADMIN_EMAIL` | Opcional (se crea en global-setup) | `test-admin@quiniela.local` |
| `TEST_ADMIN_PASSWORD` | Opcional | `TestAdmin123!` |
| `TEST_USER_EMAIL` | Opcional | `test-user@quiniela.local` |
| `TEST_USER_PASSWORD` | Opcional | `TestUser123!` |

### Local
```bash
cp .env.example .env.local   # añade SUPABASE_URL y SERVICE_ROLE_KEY
npm run test
```

El **global-setup** crea usuarios de prueba automáticamente en Supabase (si las credenciales de service role están).

### CI (GitHub Actions)
```yaml
# .github/workflows/playwright.yml
name: Playwright
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test
```

## Estructura
```
tests/
├── fixtures.ts         # Fixtures adminPage / userPage (login automático)
├── global-setup.ts     # Crea usuarios de prueba en Supabase
├── smoke.spec.ts       # Smoke tests principales
└── test-results/       # Screenshots / traces en fallos
```

## Añadir nuevo test
1. Usa `adminPage` o `userPage` del fixture → login automático
2. `await page.goto('/ruta')`
3. `await expect(page.locator('...')).toBeVisible()`
4. Corre `npm run test` — si pasa, commit

## Debug fallos
- `npx playwright show-report` → reporte HTML con screenshots/traces
- `npm run test:headed` → ve el navegador en vivo
- `test.setTimeout(30000)` en tests lentos