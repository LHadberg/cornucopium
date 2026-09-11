import { useEffect, useState } from 'react';
import { Texture, TextureLoader } from 'three';

// Unlike R3F's useLoader, this never suspends the Canvas or its parent tree.
// Keep the previous surface while loading so changing a style cannot remount
// the sibling dice engine and leave a second physics world behind.
export function useSurfaceTexture(source: string | null): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!source) return;
    let active = true;
    void new TextureLoader().loadAsync(source).then((next) => {
      if (active) setTexture(next);
      else next.dispose();
    }).catch((error: unknown) => {
      if (active) console.error('Unable to load dice tray texture', error);
    });
    return () => { active = false; };
  }, [source]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}
