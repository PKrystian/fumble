export function setDocumentTitle(title: string): void {
  document.title = title;
}

export function setMetaDescription(description: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = description;
}

export function clipMetaDescription(value: string): string {
  const text = value.trim();
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}

export function setMetaContent(
  selector: string,
  attribute: 'name' | 'property',
  value: string,
  content: string,
): void {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, value);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function removeMeta(selector: string): void {
  document.head.querySelector(selector)?.remove();
}

export function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function removeCanonical(): void {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

export function setHreflangAlternates(alternates: HreflangAlternate[]): void {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
    el.remove();
  });
  for (const alt of alternates) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = alt.hreflang;
    link.href = alt.href;
    document.head.appendChild(link);
  }
}

export function removeHreflangAlternates(): void {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
    el.remove();
  });
}
