import { JSDOM } from 'jsdom';

function htmlToOJMarkdown(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  return walk(document.body).replace(/\n{3,}/g, '\n\n').trim();
}

function walk(node) {
  if (node.nodeType === node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType === node.ELEMENT_NODE) {
    const el = node;
    const children = Array.from(el.childNodes).map(walk).join('');
    switch (el.tagName.toLowerCase()) {
      case 'p': return `${children}\n\n`;
      case 'span': return renderSpan(el);
      case 'br': return `\n`;
      default: return children;
    }
  }
  return '';
}

function renderSpan(el) {
  const cls = el.className || '';
  const children = Array.from(el.childNodes).map(walk).join('');
  if (cls.includes('math-inline')) return `$${extractMath(el)}$`;
  if (cls.includes('math-display')) return `\n$$\n${extractMath(el)}\n$$\n`;
  const dec = (el.style && typeof el.style.textDecoration === 'string') ? el.style.textDecoration.toLowerCase() : '';
  if (dec.includes('underline')) return `<u>${children}</u>`;
  if (dec.includes('line-through')) return `~~${children}~~`;
  const styleAttr = (el.getAttribute('style') || '').toLowerCase();
  if (styleAttr.includes('text-decoration') && styleAttr.includes('underline')) return `<u>${children}</u>`;
  if (styleAttr.includes('text-decoration') && styleAttr.includes('line-through')) return `~~${children}~~`;
  return children;
}

function extractMath(el) { return normalizeMath(el.textContent ?? ''); }
function normalizeMath(s) { return s.replace(/\s+/g, ' ').trim(); }

const html = `<p><span style="text-decoration: underline;">test underline<br /></span></p>
<p><span style="text-decoration: line-through;">strikethrough</span></p>`;
console.log(htmlToOJMarkdown(html));
