import { useEffect, useState } from 'react';
import patterns from '../_constants/hero-patterns.json';

export const heroPatterns = patterns;

export function getHeroPattern(id: string) {
  return heroPatterns.find((pattern) => pattern.id === id);
}

const sources = new Map<string, Promise<string>>();

// Keep the downloaded SVGs untouched. Composite their black artwork over white
// so Three.js can tint the whole surface with the existing color control.
function loadPatternSource(pattern: typeof heroPatterns[number]): Promise<string> {
  const { src, width, height } = pattern;
  let pending = sources.get(src);
  if (!pending) {
    pending = fetch(src).then(async (response) => {
      if (!response.ok) throw new Error(`Unable to load pattern: ${src}`);
      const raw = await response.text();
      const svg = raw
        // Some downloads only have a viewBox. Give the browser an explicit
        // raster size before uploading the SVG image to a WebGL texture.
        .replace(/<svg\b([^>]*)>/, (_match, attributes: string) =>
          `<svg${attributes.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${width}" height="${height}">`)
        .replace(/(<svg\b[^>]*>)/, '$1<rect width="100%" height="100%" fill="white"/><g opacity="0.25">')
        .replace(/<\/svg>\s*$/, '</g></svg>');
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }).catch((error: unknown) => {
      sources.delete(src);
      throw error;
    });
    sources.set(src, pending);
  }
  return pending;
}

export function usePatternSource(id: string, fallback: string) {
  const pattern = getHeroPattern(id);
  const [loaded, setLoaded] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    if (!pattern) return;
    let active = true;
    void loadPatternSource(pattern).then((url) => {
      if (active) setLoaded({ src: pattern.src, url });
    }).catch((error: unknown) => {
      console.error(error);
    });
    return () => { active = false; };
  }, [pattern]);

  if (!pattern) return fallback;
  return loaded?.src === pattern.src ? loaded.url : null;
}
