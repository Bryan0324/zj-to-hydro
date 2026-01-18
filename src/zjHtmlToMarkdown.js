const { JSDOM } = require('jsdom');

export function htmlToOJMarkdown(html) {
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
      case 'h2': return `## ${children}\n\n`;
      case 'h3': return `### ${children}\n\n`;
      case 'h4': return `#### ${children}\n\n`;
      case 'h5': return `##### ${children}\n\n`;
      case 'h6': return `###### ${children}\n\n`;
      case 'p': return `${children}\n\n`;
      case 'strong': return `**${children}**`;
      case 'em': return `*${children}*`;
      case 'sup': return `<sup>${children}</sup>`;
      case 'sub': return `<sub>${children}</sub>`;
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre'
          ? children
          : `\`${children}\``;
      case 'pre':
        return `\n\`\`\`\n${children}\n\`\`\`\n`;
      case 'ul':
        return `\n${children}`;
      case 'ol':
        return `\n${renderOrderedList(el)}`;
      case 'li':
        return `- ${children}\n`;
      case 'img':
        return renderImage(el);
      case 'span':
        return renderSpan(el);
      case 'table':
        return renderTable(el);
      case 'hr':
        return `\n---\n\n`;
      case 'br':
        return `\n`;
      default:
        return children;
    }
  }

  return '';
}

function renderSpan(el) {
  const cls = el.className;
  const children = Array.from(el.childNodes).map(walk).join('');

  // Math spans
  if (cls.includes('math-inline')) {
    return `$${extractMath(el)}$`;
  }
  if (cls.includes('math-display')) {
    return `\n$$\n${extractMath(el)}\n$$\n`;
  }

  // Style-based decorations
  const dec = (el.style && typeof el.style.textDecoration === 'string')
    ? el.style.textDecoration.toLowerCase()
    : '';
  if (dec.includes('underline')) {
    return `<u>${children}</u>`;
  }
  if (dec.includes('line-through')) {
    return `~~${children}~~`;
  }

  // Fallback to raw style attribute parsing
  const styleAttr = (el.getAttribute('style') || '').toLowerCase();
  if (styleAttr.includes('text-decoration') && styleAttr.includes('underline')) {
    return `<u>${children}</u>`;
  }
  if (styleAttr.includes('text-decoration') && styleAttr.includes('line-through')) {
    return `~~${children}~~`;
  }

  return children;
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

function renderOrderedList(el) {
  let counter = 1;
  return Array.from(el.childNodes)
    .filter(node => node.nodeType === node.ELEMENT_NODE && node.tagName.toLowerCase() === 'li')
    .map(li => {
      const content = Array.from(li.childNodes).map(walk).join('');
      return `${counter++}. ${content}\n`;
    })
    .join('');
}

function renderTable(el) {
  const rows = Array.from(el.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  let table = '\n| ';
  
  // Process header row
  const headerCells = rows[0].querySelectorAll('td, th');
  table += Array.from(headerCells)
    .map(cell => Array.from(cell.childNodes).map(walk).join('').trim())
    .join(' | ');
  table += ' |\n|';
  
  // Add separator
  for (let i = 0; i < headerCells.length; i++) {
    table += ' --- |';
  }
  table += '\n';
  
  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    table += '| ';
    const cells = rows[i].querySelectorAll('td, th');
    table += Array.from(cells)
      .map(cell => Array.from(cell.childNodes).map(walk).join('').trim() || '&nbsp;')
      .join(' | ');
    table += ' |\n';
  }
  
  return table + '\n';
}