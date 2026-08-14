export default {
  name: 'skill',
  title: 'Skill',
  type: 'document',
  fields: [
    { name: 'order', title: 'Order (lower = shown first)', type: 'number' },
    { name: 'name', title: 'Skill name', type: 'string', validation: (Rule) => Rule.required() },
    {
      name: 'level',
      title: 'Level (0-100)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).max(100),
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'level' },
  },
}
