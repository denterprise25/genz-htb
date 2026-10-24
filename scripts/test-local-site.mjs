import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile, cp, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ui = join(root, 'ui');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const machines = await readJson(join(ui, 'data/machines.json'));
const learningNotes = await readJson(join(ui, 'data/learning-notes.json'));
const visualContexts = await readJson(join(ui, 'data/visual-contexts.json')).catch(error => {
  if (error.code === 'ENOENT') return {};
  throw error;
});
const bundle = await readFile(join(ui, 'data/site-data.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(bundle, sandbox);
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.GenzSiteData)), { machines, learningNotes, visualContexts },
  'The local data bundle must match its JSON sources; run npm run build after content edits.');
assert(!/[<>&\u2028\u2029]/.test(bundle), 'The data bundle must escape HTML delimiters and line separators.');

const runtime = await readFile(join(ui, 'site-runtime.js'), 'utf8');
const anchor = initialHref => ({
  value: initialHref,
  getAttribute() { return this.value; },
  setAttribute(name, value) { assert.equal(name, 'href'); this.value = value; },
  matches(selector) { return selector === 'a[href]'; },
  querySelectorAll() { return []; },
});
function harness(baseURI, anchors = []) {
  const listeners = new Map();
  const document = {
    baseURI, readyState: 'complete',
    querySelectorAll: () => anchors,
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  const context = { window: {}, document, URL, location: { protocol: new URL(baseURI).protocol } };
  vm.runInNewContext(runtime, context);
  return { ...context.window.GenzSite, listeners };
}
const base = 'file:///Users/test/HTB%20project/ui/';
const initialAnchor = anchor('./machines/');
const local = harness(base, [initialAnchor]);
assert.equal(initialAnchor.value, base + 'machines/index.html', 'Initial links must support opening index.html directly.');
assert.equal(local.href('./'), base + 'index.html');
assert.equal(local.href('./machines/htb-blue/?os=Windows#reading-note'), base + 'machines/htb-blue/index.html?os=Windows#reading-note');
assert.equal(local.href('./#visual-lab'), base + 'index.html#visual-lab');
for (const value of ['#overview', 'https://example.com/guide/', '//example.com/guide/', 'file://server/shared/', 'mailto:test@example.com', './data/machines.json', './machines/index.html']) {
  assert.equal(local.href(value), value, `Unrelated links must be preserved: ${value}`);
}
const dynamicAnchor = anchor('./tryhackme/?os=Linux');
local.fixLinks(dynamicAnchor);
assert.equal(dynamicAnchor.value, base + 'tryhackme/index.html?os=Linux', 'Links rendered later must also work locally.');
const clickedAnchor = anchor('./hack-the-box/');
local.listeners.get('click')({ target: { closest: () => clickedAnchor } });
assert.equal(clickedAnchor.value, base + 'hack-the-box/index.html', 'Delegated clicks cover later components.');
const hosted = harness('https://denterprise25.github.io/genz-htb/');
assert.equal(hosted.href('./machines/htb-blue/#topics'), './machines/htb-blue/#topics', 'Hosted route URLs must remain clean.');

const pages = [
  ['machines/index.html', 'catalog', '../'],
  ['hack-the-box/index.html', 'htb', '../'],
  ['tryhackme/index.html', 'thm', '../'],
  ...machines.map(machine => [`machines/${machine.slug}/index.html`, 'detail', '../../', machine]),
];
const template = await readFile(join(ui, 'index.html'), 'utf8');
const svgTitleCount = (template.match(/<title\b/gi) || []).length - 1;
for (const [path, page, baseHref, machine] of pages) {
  const html = await readFile(join(ui, path), 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert(head, `${path} requires document metadata.`);
  assert.equal((head.match(/<title\b/gi) || []).length, 1, `${path} requires exactly one document title.`);
  assert.equal((html.match(/<title\b/gi) || []).length - 1, svgTitleCount, `${path} must preserve accessible SVG titles.`);
  assert(head.includes(`<base href="${baseHref}">`), `${path} must resolve shared assets from its nested route.`);
  assert(html.includes(`data-page="${page}"`), `${path} must select the correct page renderer.`);
  if (machine) {
    assert(html.includes(`data-machine="${machine.slug}"`));
    assert(head.includes(machine.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')));
  }
  const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
  const bundleIndex = scriptSources.indexOf('./data/site-data.js');
  const runtimeIndex = scriptSources.indexOf('./site-runtime.js');
  const appIndex = scriptSources.indexOf('./app.js');
  assert(bundleIndex >= 0 && runtimeIndex >= 0 && bundleIndex < appIndex && runtimeIndex < appIndex,
    `${path} must load the local bundle and runtime before app.js.`);
  const resolvedBase = new URL(baseHref, pathToFileURL(join(ui, path)));
  for (const source of scriptSources) {
    const url = new URL(source, resolvedBase);
    if (url.protocol === 'file:') await access(fileURLToPath(url));
  }
}

// Exercise the actual build with content that must stay inert as JavaScript and
// HTML. The fixture also checks invalid inputs cannot remove existing routes.
const fixture = await mkdtemp(join(tmpdir(), 'genz-local-test-'));
try {
  await mkdir(join(fixture, 'scripts'), { recursive: true });
  await mkdir(join(fixture, 'ui/data'), { recursive: true });
  await copyFile(join(root, 'scripts/build-pages.mjs'), join(fixture, 'scripts/build-pages.mjs'));
  await copyFile(join(root, 'scripts/build-concept-assets.mjs'), join(fixture, 'scripts/build-concept-assets.mjs'));
  await cp(join(root, 'scripts/concept-sources'), join(fixture, 'scripts/concept-sources'), { recursive: true });
  await writeFile(join(fixture, 'ui/index.html'), template);
  const fixtureMachines = structuredClone(machines);
  fixtureMachines[0].summary = '</script><script>window.executed = true</script> & <literal>\u2028\u2029';
  Object.defineProperty(fixtureMachines[0], '__proto__', { value: { untouched: true }, enumerable: true });
  await writeFile(join(fixture, 'ui/data/machines.json'), JSON.stringify(fixtureMachines));
  await writeFile(join(fixture, 'ui/data/learning-notes.json'), JSON.stringify(learningNotes));
  execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: fixture, stdio: 'pipe' });
  const fixtureSandbox = { window: {} };
  vm.runInNewContext(await readFile(join(fixture, 'ui/data/site-data.js'), 'utf8'), fixtureSandbox);
  assert.equal(fixtureSandbox.window.executed, undefined);
  assert.equal(fixtureSandbox.window.GenzSiteData.machines[0].summary, fixtureMachines[0].summary);
  assert(Object.hasOwn(fixtureSandbox.window.GenzSiteData.machines[0], '__proto__'));
  const marker = join(fixture, 'ui/machines/preserve-on-error.txt');
  await writeFile(marker, 'keep existing routes');
  await writeFile(join(fixture, 'ui/data/learning-notes.json'), JSON.stringify({ 'missing-machine': { notice: 'Notice', reason: 'Reason' } }));
  assert.throws(() => execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: fixture, stdio: 'pipe' }));
  assert.equal(await readFile(marker, 'utf8'), 'keep existing routes');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
console.log(`Passed local data, file navigation, build safety, and metadata checks for ${pages.length} routes.`);
