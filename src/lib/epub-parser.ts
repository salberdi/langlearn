import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import type { ParsedBook } from '@/types';

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'em', 'strong', 'blockquote', 'br', 'hr', 'span', 'div',
];

const xmlParser = new XMLParser({ ignoreAttributes: false });

export function parseEpub(buffer: Buffer): ParsedBook {
  const zip = new AdmZip(buffer);

  if (zip.getEntry('META-INF/encryption.xml')) {
    return { title: '', author: '', chapters: [], drmDetected: true };
  }

  const containerXml = zip.readAsText('META-INF/container.xml');
  const container = xmlParser.parse(containerXml);
  const opfPath: string =
    container.container.rootfiles.rootfile['@_full-path'];
  const opfDir = opfPath.split('/').slice(0, -1).join('/');

  const opfXml = zip.readAsText(opfPath);
  const opf = xmlParser.parse(opfXml);
  const metadata = opf.package.metadata;
  const manifest: Record<string, string> = {};
  const manifestItems = [opf.package.manifest.item].flat();
  for (const item of manifestItems) {
    manifest[item['@_id']] = item['@_href'];
  }

  const spineRefs = [opf.package.spine.itemref].flat();
  const spineItems: string[] = spineRefs
    .map((ref: any) => manifest[ref['@_idref']])
    .filter(Boolean);

  const chapters = spineItems
    .map((href) => {
      const fullPath = opfDir ? `${opfDir}/${href}` : href;
      const entry = zip.getEntry(fullPath) ?? zip.getEntry(href);
      if (!entry) return null;
      const raw = entry.getData().toString('utf8');
      const $ = cheerio.load(raw, { xmlMode: false });
      $('nav, script, style').remove();
      const body = $('body').html() ?? '';
      return {
        title: $('title').text() || href,
        html: sanitizeHtml(body, {
          allowedTags: ALLOWED_TAGS,
          allowedAttributes: {},
        }),
      };
    })
    .filter(Boolean) as Array<{ title: string; html: string }>;

  const title =
    typeof metadata['dc:title'] === 'string'
      ? metadata['dc:title']
      : metadata['dc:title']?.['#text'] ?? '';
  const author =
    typeof metadata['dc:creator'] === 'string'
      ? metadata['dc:creator']
      : metadata['dc:creator']?.['#text'] ?? '';

  return { title, author, chapters, drmDetected: false };
}

export function parseTxt(text: string, filename: string): ParsedBook {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const html = paragraphs.map((p) => `<p>${sanitizeHtml(p, { allowedTags: [], allowedAttributes: {} })}</p>`).join('\n');

  return {
    title: filename.replace(/\.txt$/i, ''),
    author: '',
    chapters: [{ title: filename, html }],
    drmDetected: false,
  };
}
