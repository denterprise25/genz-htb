import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile, cp, access, readdir } from 'node:fs/promises';
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
assert.equal(local.href('./machines/example-machine/?os=Windows#reading-note'), base + 'machines/example-machine/index.html?os=Windows#reading-note');
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
assert.equal(hosted.href('./machines/example-machine/#topics'), './machines/example-machine/#topics', 'Hosted route URLs must remain clean.');

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
if (!machines.length) {
  assert.deepEqual(await readdir(join(ui, 'machines')), ['index.html'], 'An empty collection must not retain old machine pages.');
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
  // Keep fixture data independent of published content, including an empty site.
  const fixtureMachines = [{
    id: 'synthetic-build-fixture', slug: 'example-machine', title: 'Synthetic build fixture',
    platform: 'Hack The Box', os: 'Linux', difficulty: 'Not rated', tags: 'Nmap',
    summary: '</script><script>window.executed = true</script> & <literal>\u2028\u2029',
    content: 'A synthetic record used only to exercise the static builder.',
  }];
  const fixtureNotes = { 'example-machine': { notice: 'A synthetic observation.', reason: 'A synthetic explanation.' } };
  const fixtureContexts = { 'example-machine': [{
    concept: 'nmap', topic: 'Nmap', title: 'A synthetic animation context',
    context: 'A synthetic context.', why: 'A synthetic reason.', relation: 'background',
  }] };
  const runFixtureBuild = () => execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: fixture, stdio: 'pipe' });
  Object.defineProperty(fixtureMachines[0], '__proto__', { value: { untouched: true }, enumerable: true });
  await writeFile(join(fixture, 'ui/data/machines.json'), JSON.stringify(fixtureMachines));
  await writeFile(join(fixture, 'ui/data/learning-notes.json'), JSON.stringify(fixtureNotes));
  await writeFile(join(fixture, 'ui/data/visual-contexts.json'), JSON.stringify(fixtureContexts));
  runFixtureBuild();
  const fixtureSandbox = { window: {} };
  vm.runInNewContext(await readFile(join(fixture, 'ui/data/site-data.js'), 'utf8'), fixtureSandbox);
  assert.equal(fixtureSandbox.window.executed, undefined);
  assert.equal(fixtureSandbox.window.GenzSiteData.machines[0].summary, fixtureMachines[0].summary);
  assert(Object.hasOwn(fixtureSandbox.window.GenzSiteData.machines[0], '__proto__'));
  const marker = join(fixture, 'ui/machines/preserve-on-error.txt');
  await writeFile(marker, 'keep existing routes');
  const validBundle = await readFile(join(fixture, 'ui/data/site-data.js'), 'utf8');
  await writeFile(join(fixture, 'ui/data/machines.json'), '{}');
  assert.throws(runFixtureBuild, /machines\.json must contain an array/);
  assert.equal(await readFile(marker, 'utf8'), 'keep existing routes');
  assert.equal(await readFile(join(fixture, 'ui/data/site-data.js'), 'utf8'), validBundle);
  await access(join(fixture, 'ui/machines/example-machine/index.html'));
  await writeFile(join(fixture, 'ui/data/machines.json'), JSON.stringify(fixtureMachines));
  await writeFile(join(fixture, 'ui/data/learning-notes.json'), JSON.stringify({ 'missing-machine': { notice: 'Notice', reason: 'Reason' } }));
  assert.throws(runFixtureBuild, /Learning note references an unknown machine/);
  assert.equal(await readFile(marker, 'utf8'), 'keep existing routes');
  await writeFile(join(fixture, 'ui/data/machines.json'), '[]');
  await writeFile(join(fixture, 'ui/data/learning-notes.json'), '{}');
  // Removing machines must not silently leave their contextual notes behind.
  assert.throws(runFixtureBuild, /Visual context references an unknown machine/);
  assert.equal(await readFile(marker, 'utf8'), 'keep existing routes');
  await writeFile(join(fixture, 'ui/data/visual-contexts.json'), '{}');
  runFixtureBuild();
  const emptySandbox = { window: {} };
  vm.runInNewContext(await readFile(join(fixture, 'ui/data/site-data.js'), 'utf8'), emptySandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(emptySandbox.window.GenzSiteData)), {
    machines: [], learningNotes: {}, visualContexts: {},
  });
  assert.deepEqual(await readdir(join(fixture, 'ui/machines')), ['index.html'], 'Empty builds must remove stale detail pages.');
  await Promise.all(['machines', 'hack-the-box', 'tryhackme'].map(route => access(join(fixture, 'ui', route, 'index.html'))));
} finally {
  await rm(fixture, { recursive: true, force: true });
}
console.log(`Passed local data, file navigation, build safety, and metadata checks for ${pages.length} routes.`);
