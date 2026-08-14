export default {
  name: 'post',
  title: 'Blog post',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    { name: 'excerpt', title: 'Excerpt (shown in list & link previews)', type: 'text', rows: 3 },
    { name: 'coverImage', title: 'Cover image', type: 'image', options: { hotspot: true } },
    { name: 'publishedAt', title: 'Published at', type: 'datetime', validation: (Rule) => Rule.required() },
    {
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt', media: 'coverImage' },
  },
}
