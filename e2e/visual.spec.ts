import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
const patterns = ['cover', 'statement-evidence', 'comparison', 'process', 'diagram', 'closing-decision'];

async function visibleTextClipping(page: Page) {
  return page.evaluate(() => {
    const problems: Array<{ text: string; right: number; boundary: number }> = [];
    const limit = innerWidth;
    const active = document.querySelector('[data-testid="active-slide"]');
    if (!active) return [{ text: 'active slide missing', right: 1, boundary: 0 }];
    const walker = document.createTreeWalker(active, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim()) continue;
      const parent = node.parentElement;
      if (!parent) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width === 0 || rect.height === 0) continue;
        let boundary = limit;
        let ancestor: Element | null = parent;
        while (ancestor) {
          const ancestorStyle = getComputedStyle(ancestor);
          if (['hidden', 'clip'].includes(ancestorStyle.overflowX)) {
            boundary = Math.min(boundary, ancestor.getBoundingClientRect().right);
          }
          ancestor = ancestor.parentElement;
        }
        if (rect.right > boundary + 1 || rect.left < -1) {
          problems.push({ text: node.textContent.slice(0, 65), right: Math.round(rect.right), boundary: Math.round(boundary) });
          break;
        }
      }
    }
    return problems;
  });
}

test('all six real layouts render without clipping in four viewports', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/studio/');
    for (const [index, pattern] of patterns.entries()) {
      await page.getByRole('button', { name: `Ir a diapositiva ${index + 1}` }).click();
      const active = page.getByTestId('active-slide');
      await expect(active).toHaveAttribute('data-pattern', pattern);
      await expect(active.getByRole(index === 0 ? 'heading' : 'heading', { level: index === 0 ? 1 : 2 })).toBeVisible();
      const clipping = await visibleTextClipping(page);
      expect(clipping, `Layout ${pattern} a ${viewport.width}px`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath(`slide-${pattern}-${viewport.width}.png`) });
    }
  }
  expect(errors).toEqual([]);
});

test('keyboard navigation, URL fragment and controls retain native behavior', async ({ page }) => {
  await page.goto('/studio/');
  await expect(page.getByTestId('active-slide')).toHaveAttribute('data-pattern', 'cover');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#1$/);
  await expect(page.getByTestId('active-slide')).toHaveAttribute('data-pattern', 'statement-evidence');
  await page.keyboard.press('End');
  await expect(page.getByTestId('active-slide')).toHaveAttribute('data-pattern', 'closing-decision');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#5$/);
  await page.getByRole('button', { name: 'Anterior' }).click();
  await expect(page).toHaveURL(/#4$/);
  await page.reload();
  await expect(page.getByTestId('active-slide')).toHaveAttribute('data-pattern', 'diagram');
  await page.keyboard.press('Home');
  await expect(page).toHaveURL(/#0$/);
});

test('Spanish language, metadata and keyboard focus are exposed in the built viewer', async ({ page }) => {
  await page.goto('/studio/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page).toHaveTitle(/FALP Slide Studio/);
  await expect(page.getByRole('navigation', { name: 'Navegación de diapositivas' })).toBeVisible();
  await page.getByRole('button', { name: 'Ir a diapositiva 3' }).focus();
  await expect(page.getByRole('button', { name: 'Ir a diapositiva 3' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('active-slide')).toHaveAttribute('data-pattern', 'comparison');
  await expect(page.getByText('BORRADOR · EJEMPLO SINTÉTICO')).toBeVisible();
});

test('WCAG text semantics and contrast are checked for each layout', async ({ page }) => {
  const AxeBuilder = (await import('@axe-core/playwright')).default;
  for (const viewport of [{ width: 1366, height: 768 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/studio/');
    for (let i = 0; i < patterns.length; i++) {
      await page.getByRole('button', { name: `Ir a diapositiva ${i + 1}` }).click();
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), `Axe ${patterns[i]} ${viewport.width}px`).toEqual([]);
    }
  }
});

test('negative control catches clipped text even when the document reports no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/studio/');
  await page.addStyleTag({ content: '.slide-frame {overflow-x:hidden !important;} .slide-lead {min-width:650px; white-space:nowrap;}' });
  const rootOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(rootOverflow).toBeLessThanOrEqual(1);
  const problems = await visibleTextClipping(page);
  expect(problems.some(problem => problem.text.includes('Seis composiciones'))).toBe(true);
});

test('editable inputs own keyboard arrows and do not change slide', async ({ page }) => {
  await page.goto('/studio/');
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Entrada de prueba');
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('active-slide')).toHaveAttribute('data-pattern', 'cover');
});

test('desktop presenter frame and controls fit the visible viewport', async ({ page }) => {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1024, height: 600 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/studio/');
    const bounds = await page.locator('.slide-frame').boundingBox();
    const nav = await page.locator('.preview-navigation').boundingBox();
    expect(bounds).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(bounds!.y, `Top of frame at ${viewport.width}x${viewport.height}`).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height, `Bottom of frame at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(viewport.height);
    expect(nav!.y + nav!.height, `Navigation at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(viewport.height);
  }
});

test('mobile slide navigation remains a single row at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/studio/');
  const boxes = await page.locator('.preview-dots > button').evaluateAll(elements => elements.map(el => {
    const box = el.getBoundingClientRect();
    return { top: Math.round(box.top), right: box.right };
  }));
  expect(new Set(boxes.map(box => box.top)).size).toBe(1);
  expect(Math.max(...boxes.map(box => box.right))).toBeLessThanOrEqual(320);
});
