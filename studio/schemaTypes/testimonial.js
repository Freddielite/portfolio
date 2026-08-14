export default {
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    { name: 'order', title: 'Order (lower = shown first)', type: 'number' },
    { name: 'quote', title: 'Quote', type: 'text', rows: 4, validation: (Rule) => Rule.required() },
    { name: 'author', title: 'Author name', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'role', title: 'Role / company', type: 'string' },
  ],
  preview: {
    select: { title: 'author', subtitle: 'role' },
  },
}
