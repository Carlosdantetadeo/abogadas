'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function LegacyPage({ html, page }) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.page = page;
    const script = document.createElement('script');
    script.src = '/app.js';
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [pathname, page]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
