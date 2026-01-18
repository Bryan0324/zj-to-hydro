import { JSDOM } from 'jsdom';

function htmlToOJMarkdown(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  return walk(document.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function walk(node) {
  if (node.nodeType === node.TEXT_NODE) {
    return node.textContent ?? '';
  }

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

const html = `<p>Consider an algorithm that takes as input a positive integer <span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">nn</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord mathnormal\">n</span></span></span></span></span>. If <span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">nn</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord mathnormal\">n</span></span></span></span></span> is even, the algorithm divides it by two, and if <span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">nn</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord mathnormal\">n</span></span></span></span></span> is odd, the algorithm multiplies it by three and adds one. The algorithm repeats this, until <span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">nn</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord mathnormal\">n</span></span></span></span></span> is one. For example, the sequence for <span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">n=3n=3</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord mathnormal\">n</span><span class=\"mrel\">=</span></span><span class=\"base\"><span class=\"mord\">3</span></span></span></span></span> is as follows: <span class=\"math math-display\"><span class=\"katex-display\"><span class=\"katex\"><span class=\"katex-mathml\">3&rarr;10&rarr;5&rarr;16&rarr;8&rarr;4&rarr;2&rarr;1 3 \\rightarrow 10 \\rightarrow 5 \\rightarrow 16 \\rightarrow 8 \\rightarrow 4 \\rightarrow 2 \\rightarrow 1</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord\">3</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">10</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">5</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">16</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">8</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">4</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">2</span><span class=\"mrel\">&rarr;</span></span><span class=\"base\"><span class=\"mord\">1</span></span></span></span></span></span> Your task is to simulate the execution of the algorithm for a given value of <span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">nn</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord mathnormal\">n</span></span></span></span></span>.</p>\r\n<h1 id=\"constraints\">Constraints</h1>\r\n<ul>\r\n<li><span class=\"math math-inline\"><span class=\"katex\"><span class=\"katex-mathml\">1&le;n&le;1061 \\le n \\le 10^6</span><span class=\"katex-html\"><span class=\"base\"><span class=\"mord\">1</span><span class=\"mrel\">&le;</span></span><span class=\"base\"><span class=\"mord mathnormal\">n</span><span class=\"mrel\">&le;</span></span><span class=\"base\"><span class=\"mord\">1</span><span class=\"mord\"><span class=\"mord\">0</span><span class=\"msupsub\"><span class=\"vlist-t\"><span class=\"vlist-r\"><span class=\"vlist\"><span class=\"\"><span class=\"sizing reset-size6 size3 mtight\"><span class=\"mord mtight\">6</span></span></span></span></span></span></span></span></span></span></span></span></li>\r\n</ul>\r\n<h1 id=\"example\">&nbsp;</h1>\r\n<pre><br /># Below are test area.</pre>\r\n<p><strong>test bold</strong></p>\r\n<p><em>test italic<strong><br /><br /></strong></em><span style=\"text-decoration: underline;\">test underline<br /></span><br /><span style=\"text-decoration: line-through;\">strikethrough</span></p>\r\n<p><sup>super<br /></sup></p>\r\n<p><sub>sub</sub></p>\r\n<p><code>code<br /><br /></code>% \\f is defined as #1f(#2) using the macro<br />\\f\\relax{x} = \\int_{-\\infty}^\\infty<br /> \\f\\hat\\xi\\,e^{2 \\pi i \\xi x}<br /> \\,d\\xi<code><br /></code></p>\r\n<ul>\r\n<li>list1</li>\r\n<li>list2</li>\r\n</ul>\r\n<p><code><img src=\"https://meee.com.tw/JbjnM1x\" alt=\"\" /></code></p>`;

const result = htmlToOJMarkdown(html);
console.log(result);
