/*
|--------------------------------------------------------------------------
| Bootstrap
|--------------------------------------------------------------------------
|
| The bootstrap file configures everything needed to render markdown with
| extreme control over the rendering pipeline
|
*/

import dayjs from 'dayjs'
import edge from 'edge.js'
import uiKit from 'edge-uikit'
import collect from 'collect.js'
import { dimer } from '@dimerapp/edge'
import { readFile } from 'node:fs/promises'
import { RenderingPipeline } from '@dimerapp/edge'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import { Collection, Renderer } from '@dimerapp/content'
import { docsHook, docsTheme } from '@dimerapp/docs-theme'

import grammars from '../vscode_grammars/main.js'

type CollectionEntry = Exclude<ReturnType<Collection['findByPermalink']>, undefined>

edge.use(dimer)
edge.use(docsTheme)
edge.use(uiKit)

/**
 * Globally loads the config file
 */
edge.global('getConfig', async () =>
  JSON.parse(await readFile(new URL('../content/config.json', import.meta.url), 'utf-8'))
)

dayjs.extend(relativeTime)
edge.global('dayjs', dayjs)

/**
 * Globally loads the sponsors file
 */
edge.global('getSponsors', async () =>
  JSON.parse(await readFile(new URL('../content/sponsors.json', import.meta.url), 'utf-8'))
)

/**
 * Globally loads the releases file
 */
edge.global('getReleases', async () =>
  JSON.parse(await readFile(new URL('../content/releases.json', import.meta.url), 'utf-8'))
)

/**
 * Returns sections for a collection
 */
edge.global('getSections', function (collection: Collection, entry: CollectionEntry) {
  const entries = collection.all()

  return collect(entries)
    .groupBy<any, string>('meta.category')
    .map((items, key) => {
      return {
        title: key,
        isActive: entry.meta.category === key,
        items: items
          .filter((item: CollectionEntry & { draft?: boolean }) => {
            return !item.meta.draft
          })
          .map((item: CollectionEntry) => {
            return {
              href: item.permalink,
              title: item.title,
              isActive: item.permalink === entry.permalink,
            }
          })
          .all(),
      }
    })
    .all()
})

edge.global('getPagination', function (collection: Collection, entry: CollectionEntry) {
  const entries = collection.all()
  const currentIndex = entries.findIndex((item) => item.permalink === entry.permalink)

  return {
    previous: {
      category: entries[currentIndex - 1]?.meta.category,
      title: entries[currentIndex - 1]?.title,
      url: entries[currentIndex - 1]?.permalink,
    },
    next: {
      category: entries[currentIndex + 1]?.meta.category,
      title: entries[currentIndex + 1]?.title,
      url: entries[currentIndex + 1]?.permalink,
    },
  }
})

/**
 * Configuring rendering pipeline
 */
const pipeline = new RenderingPipeline()
pipeline.use(docsHook).use((node) => {
  if (node.tagName === 'img') {
    return pipeline.component('elements/img', { node })
  }
})

// 'css-variables' | 'dark-plus' | 'dracula-soft' | 'dracula' | 'github-dark-dimmed' | 'github-dark' | 'github-light' | 'hc_light' | 'light-plus' | 'material-theme-darker' | 'material-theme-lighter' | 'material-theme-ocean' | 'material-theme-palenight' | 'material-theme' | 'min-dark' | 'min-light' | 'monokai' | 'nord' | 'one-dark-pro' | 'poimandres' | 'rose-pine-dawn' | 'rose-pine-moon' | 'rose-pine' | 'slack-dark' | 'slack-ochin' | 'solarized-dark' | 'solarized-light' | 'vitesse-dark' | 'vitesse-light';

/**
 * Configuring renderer
 */
export const renderer = new Renderer(edge, pipeline)
  .codeBlocksTheme('material-theme-darker')
  .useTemplate('docs')

/**
 * Adding grammars
 */
grammars.forEach((grammar) => renderer.registerLanguage(grammar))
