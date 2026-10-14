'use client';
import { Streamdown } from 'streamdown';
export function MarkdownPreview({ prose }: { prose: string }) {
  return <div className="kr-markdown"><Streamdown mode="static" skipHtml controls={false} components={{
    a: ({ href, children }) => {
      if (!href || !/^(https?:\/\/|#)/i.test(href)) return <span>{children}</span>;
      return <a href={href} rel="noopener noreferrer" target="_blank">{children}</a>;
    },
    img: ({ alt }) => <span>Image reference: {alt ?? 'supplied image'}</span>,
  }}>{prose}</Streamdown></div>;
}
