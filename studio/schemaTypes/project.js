export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    { name: 'order', title: 'Order (lower = shown first)', type: 'number' },
    { name: 'id', title: 'Node ID (e.g. 01, 02)', type: 'string' },
    { name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'description', title: 'Short description', type: 'text', rows: 3 },
    { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } },
    { name: 'live', title: 'Live site URL', type: 'url' },
    { name: 'github', title: 'GitHub URL', type: 'url' },
    { name: 'image', title: 'Screenshot', type: 'image', options: { hotspot: true } },
    {
      name: 'caseStudy',
      title: 'Case study',
      type: 'object',
      fields: [
        { name: 'problem', title: 'Problem', type: 'text', rows: 3 },
        { name: 'approach', title: 'Approach', type: 'text', rows: 3 },
        { name: 'outcome', title: 'Outcome', type: 'text', rows: 3 },
      ],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'id', media: 'image' },
  },
}
