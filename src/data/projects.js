// Edit this file to update project copy, links, tags and case studies.
// live: link to the deployed/live site (omit or set to null if none)
// github: link to the public repo (omit or set to null if none)
// image: path under /public/images/projects/ for the case study screenshot
//        (leave null to show the placeholder panel until you have one)
// caseStudy: problem / approach / outcome shown in the popup when someone
//            clicks "Case study". TODO (Wilfred): rewrite these in your own
//            words, they're drafted from the short descriptions below.

const projects = [
  {
    id: '01',
    name: 'Shefitts.co',
    description:
      'Nigerian fashion e-commerce platform for African-inspired clothing. Built the responsive collections grid with mobile nav and swipe carousels, plus a single-page checkout flow supporting card, bank transfer, Paystack and USSD.',
    tags: ['Frontend', 'E-commerce', 'CSS Grid'],
    live: 'https://shefitts.co',
    github: null,
    image: '/images/projects/shefitts.jpg',
    caseStudy: {
      problem:
        'The client needed a mobile-first storefront for African-inspired fashion, with a checkout that could handle the payment methods Nigerian shoppers actually use, not just card.',
      approach:
        'Built a responsive collections grid with swipe carousels for mobile browsing, then a single-page checkout flow wired up to card, bank transfer, Paystack and USSD.',
      outcome:
        'A storefront that works as well on a low-end Android phone as on desktop, with a checkout that does not lose shoppers who do not have a card.',
    },
  },
  {
    id: '02',
    name: 'Wyntek',
    // TODO (Wilfred): swap in a sharper one-liner for your own agency site build.
    description:
      'Source for the Wyntek Technologies site: web design, networking and security services.',
    tags: ['Web Design', 'Agency Site'],
    live: null,
    github: 'https://github.com/Freddielite/wyntek',
    image: '/images/projects/wyntek.jpg',
    caseStudy: {
      problem:
        'Wyntek needed a site of its own that could sell web design, networking and security services to both small businesses and larger corporate clients.',
      approach:
        'Designed and built the agency site itself, service pages, and the visual identity used across Wyntek client work since.',
      outcome:
        'A live storefront for the agency that doubles as a template for how Wyntek builds client sites.',
    },
  },
  {
    id: '03',
    name: 'Expenses Tracker',
    // TODO (Wilfred): swap in a sharper one-liner describing the stack/features.
    description:
      'A personal finance app for logging and categorizing everyday spending.',
    tags: ['Full-stack', 'Personal Finance'],
    live: null,
    github: 'https://github.com/Freddielite/expenses-tracker',
    image: '/images/projects/expenses-tracker.jpg',
    caseStudy: {
      problem:
        'Wanted a lightweight way to log and categorize everyday spending without the bloat of a full budgeting app.',
      approach:
        'Built a full-stack app for logging expenses by category, with a simple, fast entry flow.',
      outcome:
        'A working personal finance tool used to track day-to-day spending habits.',
    },
  },
  {
    id: '04',
    name: 'Eaksline Courier',
    // TODO (Wilfred): swap in a sharper one-liner describing the build/features.
    description:
      'Website for a logistics and courier company, built for client acquisition and service listings.',
    tags: ['Logistics', 'Web Design'],
    live: 'https://eakslinecourier.com',
    github: null,
    image: '/images/projects/eaksline.jpg',
    caseStudy: {
      problem:
        'Eaksline needed a site that could list its courier and logistics services clearly enough to convert visitors into inquiries.',
      approach:
        'Designed and built a service-focused site geared toward client acquisition, with service listings front and center.',
      outcome:
        "A live site now used as the company's main channel for new client inquiries.",
    },
  },
]

export default projects
