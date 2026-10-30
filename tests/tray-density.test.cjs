const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const vm = require('node:vm');
const THREE = require('three');

test('new tray textures have the selected density before the preview frame', async () => {
  const result = await build({
    entryPoints: ['src/app/dice-roller/_components/tray-scene.tsx'],
    bundle: true, format: 'cjs', write: false,
    external: ['react', 'react/jsx-runtime', 'three', '@react-three/fiber'],
    plugins: [{ name: 'texture-fixture', setup(build) {
      build.onResolve({ filter: /hero-patterns$|use-surface-texture$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('hero-patterns')
        ? 'export const getHeroPattern = id => id === "small" ? {width:32,height:16} : {width:128,height:64}; export const usePatternSource = id => id;'
        : 'import {Texture} from "three"; export const useSurfaceTexture = () => new Texture();' }));
    } }],
  });
  assert.ok(result.outputFiles[0]);
  for (const style of ['small', 'large']) {
    /** @type {Array<() => unknown>} */
    const layoutEffects = [];
    const module = { exports: {} };
    vm.runInNewContext(result.outputFiles[0].text, { module, require: (/** @type {string} */ id) => {
      if (id === 'react') return {
        createContext: () => ({}), useRef: () => ({}),
        useMemo: (/** @type {() => unknown} */ fn) => fn(),
        useEffect: () => {},
        useLayoutEffect: (/** @type {() => unknown} */ fn) => layoutEffects.push(fn),
      };
      if (id === '@react-three/fiber') return { useThree: () => ({ viewport: {width:10,height:6}, invalidate: () => {} }) };
      return require(id);
    } });
    const { TraySurface } = /** @type {{TraySurface: Function}} */ (module.exports);
    const tree = TraySurface({ config: { wallStyle: style, backgroundStyle: style, wallRepeat: 3, backgroundRepeat: 5 } });
    layoutEffects.forEach(fn => fn());
    const maps = tree.props.children.map((/** @type {any} */ mesh) => mesh.props.children.find((/** @type {any} */ child) => child.type === 'meshStandardMaterial').props.map);
    const sx = style === 'small' ? 2 : 0.5;
    const sy = style === 'small' ? 4 : 1;
    assert.deepEqual(maps[0].repeat.toArray(), [10 * sx * 3, 0.5 * sy * 3], `${style} horizontal wall density at first frame`);
    assert.deepEqual(maps[1].repeat.toArray(), [6 * sx * 3, 0.5 * sy * 3]);
    assert.deepEqual(maps[4].repeat.toArray(), [10 * sx * 5, 6 * sy * 5]);
    assert.equal(maps[4].wrapS, THREE.RepeatWrapping);
  }
});

