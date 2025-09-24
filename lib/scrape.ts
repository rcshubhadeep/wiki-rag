import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

/**
 * 
 * @param url The wikipedia URL
 * @returns tuple => the title of the page and the text in it. Remves a lot of extra
 * 
 * Alternatively we could have used 'Wikimedia REST API' for the same purpose.
 */

export async function scrapeWikipedia(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const html = await page.content();
  await browser.close();

  const $ = cheerio.load(html);
  const title = $('#firstHeading').text().trim();

  // Main content lives under #mw-content-text .mw-parser-output
  const root = $('#mw-content-text .mw-parser-output');
  root.find('.infobox, .navbox, .toc, table, .reference').remove(); // strip noise

  // Keep headings + paragraphs + list items
  const blocks: string[] = [];
  root.children().each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase();
    if (['h2','h3','h4','p','ul','ol'].includes(tag || '')) {
      const txt = $(el).text().replace(/\[\d+\]/g,'').trim();
      if (txt) blocks.push(txt);
    }
  });

  const text = blocks.join('\n\n');
  return { title, text };
}