import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const webSourceRoot = new URL('../../web/src/', import.meta.url);
const sharedStylesUrl = new URL('../../web/src/styles.css', import.meta.url);
const studioMeterUrl = new URL(
  '../../web/src/features/broadcasting/StudioAudioMeter.tsx',
  import.meta.url,
);

async function collectWebSource(directory: URL): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const chunks = await Promise.all(
    entries.map(async (entry) => {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) return collectWebSource(child);
      if (entry.name === 'styles.css') return '';
      if (!/\.(?:[cm]?[jt]sx?|html)$/.test(entry.name)) return '';
      return readFile(child, 'utf8');
    }),
  );
  return chunks.join('\n');
}

test('shared styles do not retain retired dark and green compatibility selectors', async () => {
  const styles = await readFile(sharedStylesUrl, 'utf8');

  assert.doesNotMatch(styles, /\.workspace-welcome(?:\s|>|\{)/);
  assert.doesNotMatch(styles, /\.signal-visual(?:\s|\{)/);
  assert.doesNotMatch(styles, /\.level-meter(?:\s|\{)/);
  assert.doesNotMatch(styles, /rgba\(45,\s*221,\s*89/);
});

test('retired selectors have no web source owners and the live Studio meter keeps its dedicated owner', async () => {
  const source = await collectWebSource(webSourceRoot);
  const retiredTokens = ['workspace-welcome', 'signal-visual', 'level-meter'];

  for (const token of retiredTokens) {
    const exactToken = new RegExp(`(?<![-\\w])${token}(?![-\\w])`);
    assert.doesNotMatch(source, exactToken);
  }

  const meter = await readFile(studioMeterUrl, 'utf8');
  assert.match(meter, /import '\.\/studio-audio-meter\.css';/);
  assert.match(meter, /className="studio-signal-meter-bars"/);
});
