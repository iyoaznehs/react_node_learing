// src/components/MermaidBlock.jsx
import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
});

function MermaidBlock({ code }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const id = "mermaid-" + Math.random().toString(36).slice(2);

    // 把 mermaid 源码塞进一个 .mermaid 容器
    ref.current.innerHTML = `<div class="mermaid" id="${id}">${code}</div>`;

    try {
      mermaid.init(undefined, `#${id}`);
    } catch (e) {
      console.error("Mermaid init error:", e);
      ref.current.innerText = "Mermaid 渲染失败";
    }
  }, [code]);

  return <div ref={ref} />;
}

export default MermaidBlock;