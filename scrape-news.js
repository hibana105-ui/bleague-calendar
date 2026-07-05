// Google News RSSからBリーグ・日本代表のニュース見出しを取得する
// 使い方: node scrape-news.js  →  news.json を生成
const fs = require('fs');
const path = require('path');

const FEEDS = {
  bleague: 'https://news.google.com/rss/search?q=B%E3%83%AA%E3%83%BC%E3%82%B0%20%E3%83%90%E3%82%B9%E3%82%B1&hl=ja&gl=JP&ceid=JP:ja',
  japan: 'https://news.google.com/rss/search?q=%E3%83%90%E3%82%B9%E3%82%B1%20%E6%97%A5%E6%9C%AC%E4%BB%A3%E8%A1%A8&hl=ja&gl=JP&ceid=JP:ja',
};
const MAX_ITEMS = 20;

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
}

function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const chunk = m[1];
    let title = decodeEntities(chunk.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = decodeEntities(chunk.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    const pub = chunk.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    const source = decodeEntities(chunk.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '');
    // タイトル末尾の「 - メディア名」を除去（source欄に持っているため）
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3));
    }
    if (title && link) {
      items.push({ title, link, source, date: pub ? new Date(pub).toISOString() : null });
    }
  }
  // 新しい順に並べて上位だけ
  items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return items.slice(0, MAX_ITEMS);
}

(async () => {
  const out = { updated: new Date().toISOString() };
  for (const [key, url] of Object.entries(FEEDS)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      out[key] = parseRss(await res.text());
      console.log(`${key}: ${out[key].length} items`);
    } catch (e) {
      console.error(`${key}: ERROR ${e.message}`);
      out[key] = [];
    }
  }
  fs.writeFileSync(path.join(__dirname, 'news.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log('-> news.json');
})();
