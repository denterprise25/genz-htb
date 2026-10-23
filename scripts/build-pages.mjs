import { readFile, writeFile, mkdir, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every route is an HTML document so refreshes and shared links work on Pages.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiRoot = join(projectRoot, 'ui');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

async function build() {
  const template = await readFile(join(uiRoot, 'index.html'), 'utf8');
  const records = JSON.parse(await readFile(join(uiRoot, 'data', 'machines.json'), 'utf8'));
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('machines.json must contain a nonempty array of machine records.');
  }
  for (const [name, pattern] of [
    ['base href="./"', /<base\s+href=["']\.\/["']\s*\/?\s*>/gi],
    ['body data-page="home"', /<body\b[^>]*\bdata-page=["']home["'][^>]*>/gi],
    ['title', /<title\b[^>]*>[\s\S]*?<\/title>/gi],
    ['description', /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/gi],
  ]) {
    if ([...template.matchAll(pattern)].length !== 1) {
      throw new Error(`ui/index.html must have exactly one ${name} element.`);
    }
  }

  const ids = new Set();
  const slugs = new Set();
  const pages = [
    { path: ['machines'], page: 'catalog', title: 'All machine walkthroughs — Gen Z HTB',
      description: 'Browse Hack The Box machines and TryHackMe rooms by platform, operating system, difficulty, and technique.' },
    { path: ['hack-the-box'], page: 'htb', title: 'Hack The Box walkthroughs — Gen Z HTB',
      description: 'Explore Hack The Box machine walkthroughs, from enumeration and initial access to privilege escalation and the reasoning behind each step.' },
    { path: ['tryhackme'], page: 'thm', title: 'TryHackMe room walkthroughs — Gen Z HTB',
      description: 'Explore TryHackMe room walkthroughs with clear learning goals, difficulty details, and credited guides.' },
  ];

  records.forEach((record, index) => {
    const label = `Machine record ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`${label} must be an object.`);
    }
    for (const field of ['id', 'slug', 'title', 'platform', 'os', 'difficulty', 'summary', 'content']) {
      if (typeof record[field] !== 'string' || !record[field].trim()) {
        throw new Error(`${label} requires a nonempty ${field} string.`);
      }
    }
    if (!['Hack The Box', 'TryHackMe'].includes(record.platform)) {
      throw new Error(`${label} has an unsupported platform: ${record.platform}`);
    }
    if (ids.has(record.id)) throw new Error(`Duplicate machine id: ${record.id}`);
    ids.add(record.id);
    const slug = record.slug;
    if (typeof slug !== 'string' || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`${label} has an unsafe slug: ${String(slug)}`);
    }
    if (slugs.has(slug)) throw new Error(`Duplicate machine slug: ${slug}`);
    slugs.add(slug);
    if (record.sourceUrl) {
      let source;
      try { source = new URL(record.sourceUrl); } catch { /* Rejected below. */ }
      if (!source || source.protocol !== 'https:' || source.username || source.password) {
        throw new Error(`${label} sourceUrl must be an absolute HTTPS URL without credentials.`);
      }
    }
    pages.push({ path: ['machines', slug], page: 'detail', machine: slug,
      title: `${record.title} · ${record.platform} walkthrough — Gen Z HTB`,
      description: record.summary });
  });

  // Validate all input before replacing generated directories. Reject symlinks
  // rather than following an unexpected route directory outside the project.
  const routes = ['machines', 'hack-the-box', 'tryhackme'];
  for (const route of routes) {
    const target = join(uiRoot, route);
    const stat = await lstat(target).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
      throw new Error(`Generated route must be a directory, not a file or symlink: ${target}`);
    }
  }
  for (const route of routes) await rm(join(uiRoot, route), { recursive: true, force: true });

  for (const page of pages) {
    const bodyAttributes = ` data-page="${page.page}"${page.machine ? ` data-machine="${page.machine}"` : ''}`;
    const html = template
      .replace(/<base\s+href=["']\.\/["']\s*\/?\s*>/i, `<base href="${'../'.repeat(page.path.length)}">`)
      .replace(/<body\b[^>]*>/i, tag => tag.replace(/\s+data-(?:page|machine)=["'][^"']*["']/gi, '')
        .replace(/>$/, `${bodyAttributes}>`))
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(page.title)}</title>`)
      .replace(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i,
        () => `<meta name="description" content="${escapeHtml(page.description)}">`);
    const output = join(uiRoot, ...page.path);
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'index.html'), html);
  }
  console.log(`Built ${pages.length} static routes for ${records.length} machines.`);
}

build().catch(error => {
  console.error(`Pages build failed: ${error.message}`);
  process.exitCode = 1;
});
