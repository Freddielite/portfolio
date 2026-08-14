export default {
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  // Singleton: only one of these should ever exist. Enforced in
  // sanity.config.js by hiding "create new" for this type once one exists.
  fields: [
    { name: 'name', title: 'Full name', type: 'string' },
    { name: 'shortName', title: 'Short name', type: 'string' },
    { name: 'initials', title: 'Initials (header logo)', type: 'string' },
    { name: 'tagline', title: 'Tagline', type: 'string' },
    { name: 'company', title: 'Company', type: 'string' },
    { name: 'location', title: 'Location', type: 'string' },
    { name: 'timezone', title: 'Timezone label', type: 'string' },
    { name: 'availability', title: 'Availability badge text', type: 'string' },
    { name: 'isAvailable', title: 'Currently available for work?', type: 'boolean' },
    { name: 'responseTime', title: 'Response time', type: 'string' },
    { name: 'bestWayToReach', title: 'Best way to reach you', type: 'string' },

    { name: 'heroGreetingName', title: 'Hero: greeting name', type: 'string' },
    { name: 'heroHeadlineLine1', title: 'Hero: headline line 1', type: 'string' },
    { name: 'heroHeadlineHighlight', title: 'Hero: headline highlight', type: 'string' },
    { name: 'heroSub', title: 'Hero: subtext', type: 'text', rows: 3 },

    { name: 'aboutParagraphs', title: 'About: paragraphs', type: 'array', of: [{ type: 'text', rows: 3 }] },
    { name: 'focusAreas', title: 'About: focus areas', type: 'string' },
    { name: 'worksWith', title: 'About: works with', type: 'string' },
    { name: 'engagement', title: 'About: engagement', type: 'string' },

    { name: 'contactHeadline', title: 'Contact: headline', type: 'string' },
    { name: 'contactSub', title: 'Contact: subtext', type: 'text', rows: 2 },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'githubUrl', title: 'GitHub URL', type: 'url' },
    { name: 'whatsappUrl', title: 'WhatsApp link', type: 'url' },
    { name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url' },
    { name: 'twitterUrl', title: 'Twitter / X URL', type: 'url' },
    { name: 'resumeUrl', title: 'Resume/CV URL', type: 'string' },
    { name: 'photo', title: 'Profile photo URL', type: 'string' },

    { name: 'formspreeId', title: 'Formspree form ID', type: 'string', description: 'The part after "f/" in your Formspree endpoint.' },
    { name: 'siteUrl', title: 'Live site URL (for SEO tags)', type: 'url' },
    { name: 'metaDescription', title: 'Default meta description', type: 'text', rows: 2 },
  ],
}
