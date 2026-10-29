import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

let bundle: string;
let styles: string;

test.beforeAll(async () => {
  styles = await readFile("node_modules/@mantine/core/styles.css", "utf8");
  const result = await build({
    stdin: {
      resolveDir: process.cwd(),
      loader: "tsx",
      contents: `
        import { createRoot } from 'react-dom/client';
        import { useState } from 'react';
        import { MantineProvider, Card, Collapse, Stack, Text } from '@mantine/core';
        import { ArchetypeSelect } from './src/app/_components/archetype-select';
        function Fixture() {
          const [value, setValue] = useState(window.initialArchetype);
          return <MantineProvider><div style={{paddingTop: 1000, paddingBottom: 16}}>
            <Card withBorder><Collapse in><Stack>
              <button>Before picker</button>
              <ArchetypeSelect size="xs" placeholder="Archetype" clearable
                clearButtonProps={{'aria-label': 'Clear archetype'}}
                data={['Aggro', 'Combo', 'Control', 'Midrange', 'Stax', 'Tempo', 'Vorthos']}
                value={value} onChange={setValue}
                renderOption={window.descriptions ? ({option}) => <Stack gap={1}>
                  <Text>{option.label}</Text><Text>A longer archetype description</Text>
                </Stack> : undefined} />
              <output>{value ?? 'None'}</output>
              <button>Outside picker</button>
            </Stack></Collapse></Card>
          </div></MantineProvider>;
        }
        createRoot(document.getElementById('root')).render(<Fixture />);
      `,
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
  });
  bundle = result.outputFiles[0]!.text;
});

for (const descriptions of [false, true]) {
  for (const initialValue of [null, "Vorthos"]) {
    test(`touch selection survives focus scrolling (${descriptions ? "descriptions" : "labels"}, ${initialValue ?? "empty"})`, async ({ page }) => {
      await page.route("http://picker.test/", route => route.fulfill({ contentType: "text/html", body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>' }));
      await page.goto("http://picker.test/");
      await page.addStyleTag({ content: styles });
      await page.addScriptTag({ content: `window.initialArchetype = ${JSON.stringify(initialValue)}; window.descriptions = ${descriptions};` });
      await page.addScriptTag({ content: bundle });
      const input = page.getByPlaceholder("Archetype", { exact: true });
      await expect(input).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      // Emulation does not reproduce a phone's native focus scrolling/zoom.
      // Inject the observed viewport movement at the real input's focus event.
      await input.evaluate((element) => {
        element.addEventListener("focus", () => window.scrollBy(0, -40), { once: true });
      });
      await input.tap();
      const option = page.getByRole("option", { name: /^Aggro/ });
      await expect(option).toBeVisible();
      await option.tap();
      await expect(page.locator("output")).toHaveText("Aggro");
      await page.getByLabel("Clear archetype").tap();
      await expect(page.locator("output")).toHaveText("None");
      await input.tap();
      await page.getByRole("button", { name: "Outside picker" }).tap();
      await expect(option).toBeHidden();

      // Keyboard focus and arrow-key selection must still work after touch use.
      await page.getByRole("button", { name: "Before picker" }).focus();
      await page.keyboard.press("Tab");
      await expect(input).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(option).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page.locator("output")).toHaveText("Aggro");
      await input.click();
      await expect(option).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(option).toBeHidden();
    });
  }
}
