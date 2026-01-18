import { JSDOM } from 'jsdom';

// Simulated htmlToOJMarkdown function (ported from TypeScript)
function htmlToOJMarkdown(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  return walk(document.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function walk(node) {
  // Handle text nodes
  if (node.nodeType === node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  // Handle element nodes
  if (node.nodeType === node.ELEMENT_NODE) {
    const el = node;
    const children = Array.from(el.childNodes).map(walk).join('');

    switch (el.tagName.toLowerCase()) {
      case 'h1': return `# ${children}\n\n`;
      case 'p': return `${children}\n\n`;
      case 'strong': return `**${children}**`;
      case 'em': return `*${children}*`;
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre'
          ? children
          : `\`${children}\``;
      case 'pre':
        return `\n\`\`\`\n${children}\n\`\`\`\n`;
      case 'ul':
        return `\n${children}`;
      case 'li':
        return `- ${children}\n`;
      case 'img':
        return renderImage(el);
      case 'span':
        return renderSpan(el);
      default:
        return children;
    }
  }

  // Handle other node types
  return '';
}

function renderSpan(el) {
  const cls = el.className;

  if (cls.includes('math-inline')) {
    return `$${extractMath(el)}$`;
  }

  if (cls.includes('math-display')) {
    return `\n$$\n${extractMath(el)}\n$$\n`;
  }

  return Array.from(el.childNodes).map(walk).join('');
}

function extractMath(el) {
  return normalizeMath(el.textContent ?? '');
}

function normalizeMath(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\to/g, '→')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\\/g, '')
    .trim();
}

function renderImage(el) {
  const src = el.getAttribute('src') ?? '';
  const alt = el.getAttribute('alt') ?? '';
  return `![${alt}](${src})`;
}

// Test with simple HTML
const testHTML = `<p>&nbsp;</p>\r\n<h1>H1字型</h1>\r\n<h2>H2</h2>\r\n<h3>h3</h3>\r\n<h4>h4</h4>\r\n<h5>h5</h5>\r\n<p>&nbsp;</p>\r\n<p><strong>test bold</strong></p>\r\n<p><em>test italic<strong><br /><br /></strong></em><span style=\"text-decoration: underline;\">test underline<br /></span><br /><span style=\"text-decoration: line-through;\">strikethrough</span></p>\r\n<p><sup>super<br /></sup></p>\r\n<p><sub>sub</sub></p>\r\n<p><code>code</code><code><br /></code></p>\r\n<ol>\r\n<li>list1</li>\r\n<li>list2</li>\r\n<li>test</li>\r\n</ol>\r\n<ul>\r\n<li>round1</li>\r\n<li>round2</li>\r\n<li>round3</li>\r\n</ul>\r\n<table style=\"height: 90px;\" width=\"233\">\r\n<tbody>\r\n<tr>\r\n<td>1234</td>\r\n<td>2234</td>\r\n<td>3234</td>\r\n<td>4234</td>\r\n<td>5234</td>\r\n<td>6234</td>\r\n<td>7234</td>\r\n</tr>\r\n<tr>\r\n<td>5678</td>\r\n<td>5678</td>\r\n<td>5677</td>\r\n<td>77777</td>\r\n<td>755</td>\r\n<td>5667</td>\r\n<td>56</td>\r\n</tr>\r\n<tr>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>56</td>\r\n<td>856</td>\r\n<td>65</td>\r\n</tr>\r\n<tr>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>568</td>\r\n<td>586</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n</tr>\r\n<tr>\r\n<td>568</td>\r\n<td>58</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n<td>&nbsp;</td>\r\n</tr>\r\n</tbody>\r\n</table>\r\n<hr />\r\n<p>&nbsp;</p>\r\n<p><img src=\"https://meee.com.tw/JbjnM1x\" alt=\"\" /></p>`;

const result = htmlToOJMarkdown(testHTML);
console.log('=== MARKDOWN OUTPUT ===');
console.log(result);
console.log('=== END ===');
