import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes/index.js'

const singletonTypes = new Set(['siteSettings'])

export default defineConfig({
  name: 'default',
  title: 'Wilfred Portfolio',

  // Filled in for you the first time you run `npx sanity init` in this
  // folder — see README.md.
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site settings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            ...S.documentTypeListItems().filter((item) => !singletonTypes.has(item.getId())),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },

  document: {
    // Hide "duplicate"/"delete" for the singleton so there's only ever one.
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(({ action }) => action && !['delete', 'duplicate'].includes(action))
        : input,
  },
})
