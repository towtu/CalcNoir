import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * React Native loads bundled artwork with `require('./thing.png')`, which Metro
 * turns into an asset id. Vite is ESM-only and has no `require`, so this
 * rewrites those calls into real imports that resolve to served URLs — the form
 * react-native-web's `Image` already accepts.
 *
 * The generated imports are appended rather than prepended: `import` is hoisted,
 * so every original line keeps its number and stack traces stay accurate.
 */
function reactNativeAssetRequire(): Plugin {
  const assetRequire =
    /require\(\s*(['"])([^'"]+\.(?:png|jpe?g|gif|webp|svg|bmp|avif))\1\s*\)/g;

  return {
    name: 'calcnoir:react-native-asset-require',
    enforce: 'pre',

    transform(code, id) {
      if (id.includes('node_modules') || !/\.[jt]sx?$/.test(id)) return null;
      if (!code.includes('require(')) return null;

      const imports: string[] = [];
      const transformed = code.replace(assetRequire, (_match, _quote, request) => {
        const binding = `__rnAsset${imports.length}__`;
        imports.push(`import ${binding} from ${JSON.stringify(request)};`);
        return binding;
      });

      if (imports.length === 0) return null;
      return { code: `${transformed}\n${imports.join('\n')}`, map: null };
    },
  };
}

/**
 * Browser preview for CalcNoir.
 *
 * This config is additive: Metro, Gradle and the Android/iOS projects do not
 * read it, and no file under `android/`, `ios/` or `scripts/` is involved.
 * `App.tsx` and everything under `src/` are bundled unmodified — the only
 * substitutions are the `react-native` -> `react-native-web` alias and the
 * `.web.ts` resolution that swaps in the notebook TurboModule stand-in.
 */

// `.web.*` wins over the shared implementation, matching Metro's platform
// resolution. Vite's defaults are kept after it so normal imports still work.
const extensions = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.js',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.json',
];

const projectRoot = path.resolve('.');

export default defineConfig({
  root: path.join(projectRoot, 'web'),
  plugins: [reactNativeAssetRequire(), react()],

  define: {
    // React Native's dev-only global, referenced inside react-native-web.
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
  },

  resolve: {
    alias: [
      // `web/react-native.ts` re-exports react-native-web and adds the pieces
      // it lacks (TurboModuleRegistry, a couple of API-shape patches).
      {
        find: /^react-native$/,
        replacement: path.join(projectRoot, 'web', 'react-native.ts'),
      },
      // react-native-svg's web asset resolver still imports the standalone
      // package that React Native 0.88 folded into `react-native/src/private`.
      // react-native-web ships the same `getAssetByID`/`registerAsset` pair.
      {
        find: /^@react-native\/assets-registry\/registry$/,
        replacement: 'react-native-web/dist/modules/AssetRegistry',
      },
    ],
    extensions,
  },

  optimizeDeps: {
    // Several React Native packages publish ESM containing untransformed JSX.
    esbuildOptions: {
      resolveExtensions: extensions,
      loader: { '.js': 'jsx' },
      jsx: 'automatic',
    },
  },

  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
    // `web/` is the Vite root, but the app source lives above it.
    fs: { allow: [projectRoot] },
  },

  build: {
    outDir: path.join(projectRoot, 'artifacts', 'web-preview'),
    emptyOutDir: true,
  },
});
