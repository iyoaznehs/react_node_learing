// src/components/MathMarkdown.jsx
import { useEffect, useRef } from 'react';
import Markdown from '@uiw/react-markdown-preview';
import katex from 'katex';
import 'katex/dist/katex.css';
import { getCodeString } from 'rehype-rewrite';
import MermaidBlock from './mermaid';

// 扫描容器里的所有文本节点，把 $$...$$ 换成 KaTeX
function renderInlineMath(root) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const toProcess = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue && node.nodeValue.includes('$$')) {
      toProcess.push(node);
    }
  }

  toProcess.forEach((textNode) => {
    const text = textNode.nodeValue;
    const parent = textNode.parentNode;
    const frag = document.createDocumentFragment();

    // 匹配 $$ ... $$（不贪婪）
    const regex = /\$\$([^$]+)\$\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 1. 前面的普通文本
      if (match.index > lastIndex) {
        frag.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }

      // 2. 中间的公式
      const expr = match[1].trim();
      const span = document.createElement('span');
      try {
        span.innerHTML = katex.renderToString(expr, { throwOnError: false });
      } catch (e) {
        console.error('KaTeX inline error:', e);
        span.textContent = match[0]; // 渲染失败就原样显示
      }
      frag.appendChild(span);

      lastIndex = regex.lastIndex;
    }

    // 3. 末尾剩余文本
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(frag, textNode);
  });
}

function MathMarkdown({ source }) {
  const ref = useRef(null);

  useEffect(() => {
    // Markdown 渲染完成后，对 $$...$$ 再做一次处理
    renderInlineMath(ref.current);
  }, [source]);

  return (
    <div ref={ref} data-color-mode="light">
      <Markdown
        source={source}
        components={{
          code: ({ children = [], className, ...props }) => {
            const code =
              props.node && props.node.children
                ? getCodeString(props.node.children)
                : children;

            // ```katex``` 代码块
            if (
              typeof code === 'string' &&
              typeof className === 'string' &&
              className.toLowerCase().includes('katex')
            ) {
              const html = katex.renderToString(code, { throwOnError: false });
              return (
                <code
                  style={{ fontSize: '150%' }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            }

            // ```mermaid``` 代码块
            if (
              typeof code === 'string' &&
              typeof className === 'string' &&
              className.toLowerCase().includes('mermaid')
            ) {
              return <MermaidBlock code={code} />;
            }

            // 其他代码块原样
            return <code className={String(className)}>{children}</code>;
          },
        }}
      />
    </div>
  );
}

export default MathMarkdown;