import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const repo = process.cwd();
const rootPagePath = resolve(repo, 'src/pages/index.astro');
const downloadPagePath = resolve(repo, 'src/pages/download.astro');
const homepagePath = resolve(repo, 'src/components/marketing/MarketingHomepage.astro');
const downloadComponentPath = resolve(repo, 'src/components/marketing/DesktopDownloadPage.astro');
const headerPath = resolve(repo, 'src/components/marketing/MarketingHeader.astro');
const footerPath = resolve(repo, 'src/components/marketing/MarketingFooter.astro');
const layoutPath = resolve(repo, 'src/layouts/MarketingLayout.astro');
const marketingScriptPath = resolve(repo, 'src/scripts/marketing.ts');

function source(path: string): string {
  assert.strictEqual(existsSync(path), true, `Expected ${path} to exist`);
  return readFileSync(path, 'utf8');
}

function effectiveAstroSource(entryPath: string): string {
  let combined = '';
  const visited = new Set<string>();

  const walk = (filePath: string) => {
    if (visited.has(filePath) || !existsSync(filePath)) return;
    visited.add(filePath);
    const content = readFileSync(filePath, 'utf8');
    combined += `\n${content}`;

    for (const match of content.matchAll(/import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g)) {
      const imported = match[1];
      if (!imported.startsWith('.')) continue;
      const candidates = extname(imported)
        ? [resolve(filePath, '..', imported)]
        : [
            resolve(filePath, '..', `${imported}.astro`),
            resolve(filePath, '..', `${imported}.ts`),
            resolve(filePath, '..', imported, 'index.astro')
          ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          walk(candidate);
          break;
        }
      }
    }
  };

  walk(entryPath);
  return combined;
}

describe('Production marketing website', () => {
  it('serves dedicated marketing entry points at / and /download', () => {
    const root = source(rootPagePath);
    const download = source(downloadPagePath);

    assert.match(root, /MarketingHomepage/);
    assert.match(download, /DesktopDownloadPage/);
    assert.doesNotMatch(root, /PlannerPage/);
    assert.doesNotMatch(download, /ChronosWorkspace/);
  });

  it('uses the shared marketing header with centered desktop navigation and accessible mobile menu', () => {
    const header = source(headerPath);

    for (const route of ['/planner', '/download', '/about']) {
      assert.match(header, new RegExp(`href=["']${route}["']`));
    }
    assert.match(header, /aria-controls=["']marketing-mobile-menu["']/);
    assert.match(header, /aria-expanded=["']false["']/);
    assert.match(header, /min-(?:width|w).*44|w-\[44px\]/);
    assert.match(header, /src=["']\/favicon\.ico["']/);
    assert.doesNotMatch(header, /Open Planner/);
  });

  it('uses one shared six-group footer with safe external links', () => {
    const footer = source(footerPath);

    for (const heading of ['Product', 'Company & Legal', 'Resources', 'Sponsor', 'More Tools']) {
      assert.match(footer, new RegExp(heading.replace('&', '&(?:amp;)?')));
    }
    for (const route of ['/planner', '/download', '/about', '/contact', '/privacy', '/terms']) {
      assert.match(footer, new RegExp(`href=["']${route}["']`));
    }
    assert.match(footer, /href=["']https:\/\/ko-fi\.com\/bitsharc["'][^>]*target=["']_blank["'][^>]*rel=["']noopener noreferrer["']/s);
    assert.match(footer, /href=["']https:\/\/courierprice\.com["'][^>]*target=["']_blank["'][^>]*rel=["']noopener noreferrer["']/s);
  });

  it('implements the approved planner-led homepage chapter order and authentic evidence', () => {
    const homepage = source(homepagePath);
    const sectionIds = ['planner', 'duration', 'capabilities', 'privacy', 'desktop', 'final-cta'];
    let previous = -1;
    for (const id of sectionIds) {
      const index = homepage.indexOf(`id="${id}"`);
      assert.ok(index > previous, `Expected #${id} after the previous approved chapter`);
      previous = index;
    }

    assert.match(homepage, /Plan the/);
    assert.match(homepage, /whole meeting/);
    assert.match(homepage, /Not just the start/);
    assert.match(homepage, /Shareable planner state/);
    assert.match(homepage, /Calendar export/);
    assert.doesNotMatch(homepage, /id=["']share["']/);
    assert.match(homepage, /\/marketing\/planner-desktop-hero-60-1500\.png/);
    assert.match(homepage, /\/marketing\/planner-mobile-hero-60-1500\.png/);
  });

  it('implements the approved desktop download story without exposing the internal canvas', () => {
    const download = source(downloadComponentPath);
    const sectionIds = ['hero', 'advantage', 'workspaces', 'capabilities', 'privacy', 'releases', 'bridge'];
    let previous = -1;
    for (const id of sectionIds) {
      const index = download.indexOf(`id="${id}"`);
      assert.ok(index > previous, `Expected #${id} after the previous approved chapter`);
      previous = index;
    }

    assert.match(download, /RealTimeZones Desktop/);
    assert.match(download, /Keep global time/);
    assert.match(download, /System tray and menu-bar access/);
    assert.match(download, /https:\/\/github\.com\/BitSharC\/realtimezones\/releases/);
    assert.match(download, /\/marketing\/desktop-app-main-window\.png/);
    assert.match(download, /\/marketing\/desktop-app-menu-bar\.png/);
    assert.doesNotMatch(download, /href=["']\/desktop(?:\/|["'])/);
  });

  it('preserves legacy root planner query links through the production browser boundary', () => {
    const root = source(rootPagePath);
    const browserScript = source(marketingScriptPath);

    assert.match(root, /marketing\.ts/);
    assert.match(browserScript, /getPlannerCompatibilityRedirect/);
    assert.match(browserScript, /window\.location\.pathname/);
    assert.match(browserScript, /window\.location\.search/);
    assert.match(browserScript, /window\.location\.replace\(destination\)/);
  });

  it('keeps marketing branding, routes, and browser icon within the approved boundary', () => {
    const combined = [
      effectiveAstroSource(rootPagePath),
      effectiveAstroSource(downloadPagePath),
      source(marketingScriptPath)
    ].join('\n');
    const layout = source(layoutPath);

    assert.match(layout, /<link rel=["']icon["'] type=["']image\/x-icon["'] href=["']\/favicon\.ico["']\s*\/>/);
    assert.strictEqual((layout.match(/rel=["']icon["']/g) || []).length, 1);
    assert.doesNotMatch(combined, /Chronos/i);
    assert.doesNotMatch(combined, /href=["']\/(?:desktop|chronos|pricing)(?:\/|["'])/i);
    assert.doesNotMatch(combined, /autoplay/i);
  });

  it('keeps the approved desktop content rail and mobile product framing geometry', () => {
    const homepage = source(homepagePath);
    const download = source(downloadComponentPath);
    const styles = source(resolve(repo, 'src/styles/marketing.css'));

    assert.match(styles, /calc\(\(100vw - 1344px\) \/ 2\)/);
    assert.match(homepage, /class=["']desktop-only["']>60-minute meeting/);
    assert.match(homepage, /class=["']mobile-only["']>60 min/);
    assert.match(styles, /\.mobile-only\s*\{[^}]*display:\s*none/s);
    assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.desktop-only\s*\{[^}]*display:\s*none/s);
    assert.match(styles, /\.menu-bar-inset img\s*\{[^}]*height:\s*auto/s);
    assert.match(download, /Keep global time<br\s*\/?>\s*<em>close at hand<\/em>\./);
  });

  it('publishes the new canonical marketing and planner routes in the sitemap', () => {
    const sitemap = source(resolve(repo, 'public/sitemap.xml'));
    assert.match(sitemap, /<loc>https:\/\/realtimezones\.com\/planner<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/realtimezones\.com\/download<\/loc>/);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/realtimezones\.com\/desktop(?:\/)?<\/loc>/);
  });

  it('sends internal city and converter entry points directly to /planner', () => {
    const timezonePage = source(resolve(repo, 'src/pages/timezone/[city].astro'));
    const converterPage = source(resolve(repo, 'src/pages/convert/[from]-to-[to].astro'));
    const staticPagesScript = source(resolve(repo, 'src/scripts/static-pages.ts'));

    assert.match(timezonePage, /href={`\/planner\?cities=/);
    assert.match(converterPage, /href={`\/planner\?cities=/);
    assert.match(staticPagesScript, /window\.location\.href = `\/planner\?cities=/);
    assert.doesNotMatch(`${timezonePage}\n${converterPage}\n${staticPagesScript}`, /[`'" ]\/\?cities=/);
  });

  it('ships every approved product asset from the same-origin public directory', () => {
    const assets = [
      'planner-desktop-hero-60-1500.png',
      'planner-desktop-duration-60-1500.png',
      'planner-desktop-duration-90-1500.png',
      'planner-mobile-hero-60-1500.png',
      'planner-mobile-duration-60-1500.png',
      'planner-mobile-duration-90-1500.png',
      'desktop-app-main-window.png',
      'desktop-app-menu-bar.png'
    ];

    for (const filename of assets) {
      assert.strictEqual(
        existsSync(resolve(repo, 'public/marketing', filename)),
        true,
        `Missing production marketing asset ${filename}`
      );
    }
  });
});
