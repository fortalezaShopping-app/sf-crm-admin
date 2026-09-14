import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`shared controls preserve older pages and editors at ${width}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [path, title] of [
      ['', 'Visão geral'],
      ['analytics', 'Análise do desempenho'],
      ['lojas', 'Visão geral'],
      ['carrossel', 'Carrossel da Home'],
      ['eventos', 'Eventos'],
    ]) {
      await page.goto(`/dashboard/${path}`);
      await expect(
        page.getByRole('heading', { name: title, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/^A carregar/)).toHaveCount(0);
      await expect(
        page.getByRole('alert').filter({ hasText: /.+/ }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/shadcn-${path || 'dashboard'}-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto('/dashboard/lojas');
    const invite = page.getByRole('button', { name: 'Convidar loja' });
    await invite.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('data-slot', 'dialog-content');
    await dialog.getByLabel('Nome comercial').fill('Loja de teste');
    await dialog.getByRole('button', { name: 'Criar loja' }).click();
    await expect(dialog).toBeVisible();
    expect(
      await dialog
        .locator('form')
        .evaluate((form: HTMLFormElement) => form.checkValidity()),
    ).toBe(false);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/shadcn-loja-modal-${width}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(invite).toBeFocused();
    await page.goto('/dashboard/carrossel');
    await page.getByRole('button', { name: 'Novo slide' }).click();
    await dialog.getByLabel('Título interno').fill('Slide de teste');
    await dialog.locator('input[type=file]').setInputFiles({
      name: 'slide.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    const preview = dialog.getByRole('img');
    await expect(preview).toBeVisible();
    expect((await preview.boundingBox())!.height).toBeLessThanOrEqual(282);
    expect(
      await preview.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    await dialog
      .getByRole('button', { name: 'Publicar slide' })
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByRole('button', { name: 'Publicar slide' }),
    ).toBeInViewport();
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/shadcn-carrossel-modal-${width}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await context.clearCookies();
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Painel de gestão' }),
    ).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
      'data-slot',
      'input',
    );
    await page.getByRole('button', { name: 'Iniciar sessão' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/shadcn-login-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test('shadcn tabs, tooltips and dialog keyboard focus', async ({ page }) => {
  await page.goto('/dashboard/notificacoes');
  const campaigns = page.getByRole('tab', { name: 'Campanhas', exact: true });
  await campaigns.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Destaques', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText(
    'Novidades de setembro',
  );
  await page.goto('/dashboard/configuracoes');
  const edit = page.getByRole('button', { name: 'Editar fórmula global' });
  await edit.hover();
  await expect(page.getByRole('tooltip')).toContainText(
    'Editar fórmula global',
  );
  await edit.click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Fórmula global' }),
  ).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await dialog.getByLabel('AOA por ponto').focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(edit).toBeFocused();
});

test('a pending save cannot dismiss the shared modal', async ({ page }) => {
  await page.goto('/dashboard/perfil');
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/backend/api/auth/profile', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    await pending;
    await route.continue();
  });
  try {
    await page.getByRole('button', { name: 'Editar dados pessoais' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome', { exact: true }).fill('Admin atualizado');
    await dialog.getByRole('button', { name: 'Guardar perfil' }).click();
    await expect(
      dialog.getByRole('button', { name: 'Fechar', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    release();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText('Perfil atualizado.', { exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
});

test('merchant keeps the registered store and shared manual QR controls', async ({
  page,
  context,
  playwright,
}) => {
  const api = await playwright.request.newContext({ ignoreHTTPSErrors: true });
  await api.get('https://127.0.0.1:4443/__merchant');
  await api.dispose();
  await context.addCookies([
    {
      name: 'sf-backoffice-role',
      value: 'STORE_USER',
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lojista');
  await expect(
    page.getByRole('heading', { name: 'Registar compra' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inserir código' }).click();
  await expect(page.getByLabel('Código do QR')).toHaveAttribute(
    'data-slot',
    'textarea',
  );
  await expect(
    page.getByRole('button', { name: 'Validar cliente' }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/shadcn-lojista-390.png',
    fullPage: true,
  });
});

test.beforeEach(async ({ context, playwright }) => {
  const api = await playwright.request.newContext({ ignoreHTTPSErrors: true });
  await api.get('https://127.0.0.1:4443/__reset');
  await api.dispose();
  const token = `local.${Buffer.from(JSON.stringify({ sub: '999', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  await context.addCookies([
    { name: 'sf-admin-token', value: token, domain: 'localhost', path: '/' },
    {
      name: 'sf-backoffice-role',
      value: 'ADMIN',
      domain: 'localhost',
      path: '/',
    },
  ]);
});

for (const width of [1440, 390]) {
  test(`six admin screens fit viewport ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [path, title] of [
      ['utilizadores', 'Gestão de utilizadores'],
      ['notificacoes', 'Notificações e campanhas'],
      ['comprovativos', 'Talões'],
      ['recompensas', 'Recompensas'],
      ['configuracoes', 'Definições'],
      ['perfil', 'Perfil'],
    ]) {
      await page.goto(`/dashboard/${path}`);
      await expect(
        page.getByRole('heading', { name: title, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/^A carregar/)).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `test-results/${path}-${width}.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  });
}

test('users: search, pagination, editing and confirmed activation', async ({
  page,
}) => {
  await page.goto('/dashboard/utilizadores');
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Página seguinte' }).click();
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Pesquisar utilizadores' })
    .fill('adilson');
  await expect(page.getByText('Página 1 de 1')).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome', { exact: true }).fill('Adilson Atualizado');
  await dialog.getByRole('button', { name: 'Guardar utilizador' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Adilson Atualizado' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Desativar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(
    page.getByRole('button', { name: 'Desativar', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Desativar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ativar', exact: true }),
  ).toBeVisible();
});

test('campaign wizard preserves data and cannot submit to missing endpoints', async ({
  page,
}) => {
  await page.goto('/dashboard/notificacoes');
  await page.getByRole('button', { name: 'Criar campanha push' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título da mensagem').fill('Volte ao shopping');
  await dialog
    .getByLabel('Corpo da mensagem')
    .fill('Descubra as novidades desta semana.');
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByLabel('Por loja visitada', { exact: true }).check();
  await dialog
    .getByRole('combobox', { name: /Loja visitada/ })
    .selectOption('1');
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByLabel('Agendar envio').check();
  await dialog.getByLabel('Data', { exact: true }).fill('2020-01-01');
  await dialog.getByLabel('Hora de Angola (UTC+1)').fill('12:00');
  await expect(
    dialog.getByText('Escolha uma data e hora futuras.'),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Criar campanha', exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: 'test-results/campanha-modal.png' });
  await dialog.getByRole('button', { name: 'Voltar' }).click();
  await dialog.getByRole('button', { name: 'Voltar' }).click();
  await expect(dialog.getByLabel('Título da mensagem')).toHaveValue(
    'Volte ao shopping',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Criar campanha push' }),
  ).toBeFocused();
});

test('notifications and highlights use real supported mutations', async ({
  page,
}) => {
  await page.goto('/dashboard/notificacoes');
  await page
    .getByRole('button', {
      name: 'Marcar como lida: Notificação 1',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Marcar como lida: Notificação 1',
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Criar destaque', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('Destaque de teste');
  await dialog
    .getByLabel('Mensagem', { exact: true })
    .fill('Mensagem de teste local');
  await dialog.getByRole('combobox', { name: /Loja/ }).selectOption('1');
  await dialog.getByLabel('Estado', { exact: true }).fill('DRAFT');
  await dialog.getByRole('button', { name: 'Guardar destaque' }).click();
  await expect(
    page.getByText('Destaque de teste', { exact: true }),
  ).toBeVisible();
});

test('invoices: preview, rejection reason and explicit approval', async ({
  page,
}) => {
  await page.goto('/dashboard/comprovativos');
  await page.getByRole('button', { name: 'Ampliar fatura' }).click();
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole('dialog')
        .getByRole('img')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rejeitar', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar decisão' })
    .click();
  await expect(page.getByText('Indique o motivo da rejeição.')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancelar' })
    .click();
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar decisão' })
    .click();
  await expect(
    page.getByText('Fatura aprovada.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Aprovar', exact: true }),
  ).toHaveCount(0);
});

test('reward review and settings remain non-persistent until API support', async ({
  page,
}) => {
  await page.goto('/dashboard/recompensas');
  await page.getByRole('button', { name: 'Nova recompensa' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da recompensa').fill('Estacionamento extra');
  await dialog.getByLabel('Custo em pontos').fill('100');
  await dialog.getByLabel('Categoria').selectOption('Serviço');
  await dialog.getByLabel('Ativo', { exact: true }).check();
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Guardar recompensa' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.goto('/dashboard/configuracoes');
  await page.getByRole('button', { name: 'Editar fórmula global' }).click();
  await dialog.getByLabel('AOA por ponto').fill('1000');
  await expect(
    dialog.getByRole('button', { name: 'Guardar definição' }),
  ).toBeDisabled();
});

test('profile edits and password reset match the API payload', async ({
  page,
  playwright,
}) => {
  await page.goto('/dashboard/perfil');
  await page.getByRole('button', { name: 'Editar dados pessoais' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Nome', { exact: true })
    .fill('Administrador atualizado');
  await dialog.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(
    page.getByText('Perfil atualizado.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Alterar palavra-passe' }).click();
  await dialog.getByRole('button', { name: 'Enviar código' }).click();
  await dialog.getByLabel('Código de confirmação').fill('123456');
  await dialog.getByLabel('Nova palavra-passe').fill('local-test-only');
  await dialog.getByLabel('Confirmar palavra-passe').fill('local-test-only');
  await dialog.getByRole('button', { name: 'Atualizar palavra-passe' }).click();
  await expect(
    page.getByText('Palavra-passe atualizada.', { exact: true }),
  ).toBeVisible();
  const api = await playwright.request.newContext({ ignoreHTTPSErrors: true });
  const calls = await (
    await api.get('https://127.0.0.1:4443/__requests')
  ).json();
  expect(
    calls.find(
      (call: { path: string }) =>
        call.path === '/api/auth/password-reset/confirm',
    ).body,
  ).toEqual({
    identifier: 'admin@example.test',
    code: '123456',
    newPassword: 'local-test-only',
  });
  await api.dispose();
});

test('small-screen modals keep controls reachable and image previews bounded', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto('/dashboard/recompensas');
  await page.getByRole('button', { name: 'Nova recompensa' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Imagem', { exact: true }).setInputFiles({
    name: 'preview.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  const preview = dialog.getByRole('img', {
    name: 'Pré-visualização da recompensa',
  });
  await expect(preview).toBeVisible();
  expect((await preview.boundingBox())?.height).toBeLessThanOrEqual(160);
  await dialog
    .getByRole('button', { name: 'Continuar' })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByRole('button', { name: 'Continuar' }),
  ).toBeInViewport();
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
    .toBe(true);
  await page.screenshot({ path: 'test-results/recompensa-modal-390.png' });
  await page.keyboard.press('Escape');
  await page.goto('/dashboard/notificacoes');
  await page.getByRole('button', { name: 'Criar campanha push' }).click();
  await dialog.getByLabel('Título da mensagem').fill('Campanha');
  await dialog.getByLabel('Corpo da mensagem').fill('Mensagem de teste');
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Criar campanha', exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: 'test-results/campanha-modal-390.png' });
});

test('API failures remain visible without fake success, and empty search is clear', async ({
  page,
}) => {
  await page.goto('/dashboard/utilizadores');
  await page
    .getByRole('textbox', { name: 'Pesquisar utilizadores' })
    .fill('inexistente-123');
  await expect(page.getByText('Nenhum utilizador encontrado.')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Pesquisar utilizadores' })
    .fill('adilson');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.route('**/api/backend/api/admin/users/1', (route) =>
    route.fulfill({
      status: 403,
      json: { message: 'Operação não autorizada.' },
    }),
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Guardar utilizador' })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'Operação não autorizada.',
  );
  await expect(page.getByText('Utilizador guardado.')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.route('**/api/backend/api/admin/loyalty/rewards?*', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Serviço temporariamente indisponível.' },
    }),
  );
  await page.goto('/dashboard/recompensas');
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Serviço temporariamente indisponível.' }),
  ).toBeVisible();
});
