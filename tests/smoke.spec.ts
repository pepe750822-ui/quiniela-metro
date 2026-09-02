import { test, expect } from './fixtures';

test.describe('Smoke Tests - Rutas Críticas (Admin)', () => {
  test('Accede a /admin', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.locator('h1, h2').first()).toContainText(/admin|gestión|panel/i);
  });

  test('Ve tabla J6 con columna 🏆 +5', async ({ adminPage }) => {
    await adminPage.goto('/tabla?jornada=6');
    await expect(adminPage.locator('th:has-text("🏆 +5")')).toBeVisible();
    await expect(adminPage.locator('tbody tr').first()).toBeVisible();
  });

  test('Ve tabla J7 con separador correcto', async ({ adminPage }) => {
    await adminPage.goto('/tabla?jornada=7');
    await expect(adminPage.locator('thead tr').first()).toBeVisible();
  });

  test('Dashboard carga y muestra métricas', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage.locator('text=/participantes|pozo|puntos/i').first()).toBeVisible();
  });

  test('Selector de jornada funciona en tabla', async ({ adminPage }) => {
    await adminPage.goto('/tabla');
    const btnJ1 = adminPage.locator('button:has-text("J1"), button:has-text("1")').first();
    await btnJ1.click();
    await expect(adminPage).toHaveURL(/jornada=1/);
  });
});

test.describe('Smoke Tests - Rutas Críticas (Usuario)', () => {
  test('Ve predicciones J6', async ({ userPage }) => {
    await userPage.goto('/predicciones?jornada=6');
    await expect(userPage.locator('button, [role="button"]').first()).toBeVisible();
  });

  test('Publica predicciones y ve ✅ en tabla', async ({ userPage }) => {
    await userPage.goto('/predicciones?jornada=6');
    const partidoBtn = userPage.locator('button:has-text("vs"), [data-partido-id]').first();
    if (await partidoBtn.isVisible({ timeout: 3000 })) {
      await partidoBtn.click();
      await userPage.fill('input[name="goles_local"]', '2');
      await userPage.fill('input[name="goles_visitante"]', '1');
      await userPage.click('button:has-text("Guardar"), button:has-text("Actualizar")');
    }
    await userPage.click('button:has-text("Publicar")');
    await expect(userPage.locator('text=publicada')).toBeVisible({ timeout: 5000 });
    await userPage.goto('/tabla?jornada=6');
    await expect(userPage.locator('td:has-text("✅")').first()).toBeVisible();
  });

  test('Perfil muestra historial', async ({ userPage }) => {
    await userPage.goto('/perfil');
    await expect(userPage.locator('text=/historial|pagos|quinielas/i').first()).toBeVisible();
  });
});

test.describe('Accesibilidad básica', () => {
  test('Tabla navegable por teclado', async ({ adminPage }) => {
    await adminPage.goto('/tabla?jornada=6');
    await adminPage.keyboard.press('Tab');
    await expect(adminPage.locator(':focus')).toBeVisible();
  });
});