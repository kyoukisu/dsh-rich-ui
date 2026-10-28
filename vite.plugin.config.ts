import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'node:path'

const id = '@kyoukisu/dsh-rich-ui'

/** DSH fetches one JS artifact, not a Vite HTML entry or CSS manifest. */
function inlineClientCss(): Plugin {
  return {
    name: 'rich-ui-inline-plugin-css',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const css: string[] = []
      for (const [file, output] of Object.entries(bundle)) {
        if (output.type === 'asset' && file.endsWith('.css')) {
          css.push(String(output.source))
          delete bundle[file]
        }
      }
      const entry = Object.values(bundle).find(output => output.type === 'chunk' && output.isEntry)
      if (entry?.type === 'chunk' && css.length) {
        // IIFE keeps the style bootstrap out of the global module namespace.
        const injection = `if(!document.querySelector('style[data-rich-ui-style]')){const s=document.createElement('style');s.dataset.richUiStyle='';s.textContent=${JSON.stringify(css.join('\n'))};document.head.append(s);}`
        entry.code = `(()=>{${injection}})();\n` + entry.code
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const node = mode === 'host-node'
  return {
    plugins: node ? [] : [inlineClientCss()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: 'lib/host',
      emptyOutDir: false,
      minify: !node,
      lib: {
        entry: resolve(node ? 'src/host/index.ts' : 'src/host/client.tsx'),
        formats: [node ? 'es' : 'cjs'],
        fileName: () => node ? 'index.js' : 'client.js',
      },
      rollupOptions: {
        external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
        output: node ? {} : {
          inlineDynamicImports: true,
          banner: `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:(require)=>{\nvar module = { exports: {} }; var exports = module.exports;`,
          footer: '\nreturn module.exports;}});',
        },
      },
    },
  }
})
