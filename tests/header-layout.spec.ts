import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

let bundle: string;
let styles: string;

test.beforeAll(async () => {
  styles = await readFile('node_modules/@mantine/core/styles.css', 'utf8');
  const result = await build({
    stdin: {
      resolveDir: process.cwd(), loader: 'tsx',
      contents: `import { createRoot } from 'react-dom/client';
        import { MantineProvider } from '@mantine/core';
        import { Shell } from './src/app/_components/app-shell';
        createRoot(document.getElementById('root')).render(
          <MantineProvider><Shell><div>Page content</div></Shell></MantineProvider>);`,
    },
    bundle: true, write: false, jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixture-context', setup(builder) {
      builder.onResolve({ filter: /^(next-auth\/react|next\/navigation|next\/link|react-i18next)$|\/i18n$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
        resolveDir: process.cwd(), loader: 'jsx', contents: path === 'next-auth/react'
          ? `export const useSession = () => window.account; export const signOut = () => {};`
          : path === 'next/navigation' ? `export const usePathname = () => '/';`
          : path === 'next/link' ? `import React from 'react'; export default React.forwardRef((props, ref) => <a ref={ref} {...props}/>);`
          : path === 'react-i18next' ? `export const useTranslation = () => ({ t: key => key, i18n: { language: 'en', changeLanguage() {} } });`
          : '',
      }));
    } }],
  });
  bundle = result.outputFiles[0]!.text;
});

for (const width of [320, 360, 390, 768, 1024]) {
  for (const account of ['guest', 'loading', 'Yoshicide', 'A very long account display name']) {
    test(`${width}px, ${account}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.route('http://header.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
      await page.goto('http://header.test');
      await page.evaluate(account => {
        (window as any).account = { status: account === 'loading' ? 'loading' : 'authenticated', data: account === 'guest' || account === 'loading' ? null : { user: { name: account } } };
      }, account);
      await page.addStyleTag({ content: styles });
      await page.addScriptTag({ content: bundle });
      const toggle = page.getByRole('button', { name: 'Toggle color scheme' });
      await expect(toggle).toBeVisible();
      const header = page.locator('header');
      const bounds = await header.boundingBox();
      for (const control of await header.locator('button, a').all()) {
        if (!await control.isVisible()) continue;
        const box = (await control.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(bounds!.y);
        expect(box.y + box.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    });
  }
}

