// Edit this file to update project copy, links, tags and case studies.
// live: link to the deployed/live site (omit or set to null if none)
// github: link to the public repo (omit or set to null if none)
// image: path under /public/images/projects/ for the case study screenshot
//        (leave null to show the placeholder panel until you have one)
// caseStudy: problem / approach / outcome shown in the popup when someone
//            clicks "Case study".

const projects = [
  {
    id: '01',
    name: 'Wyntek',
    description:
      'The Wyntek Technologies site and its internal operations dashboard: leads, quotes, invoices, testimonials, and a templates shop selling white-label site templates through Paystack checkout, with dispute handling and a daily Telegram digest.',
    tags: ['Next.js', 'Full-stack', 'Admin Dashboard', 'Payments'],
    live: null,
    github: 'https://github.com/Freddielite/wyntek',
    image: '/images/projects/wyntek.jpg',
    caseStudy: {
      problem:
        'Wyntek needed more than a marketing site: a way to actually run the business behind it, leads, quotes, invoicing, and selling site templates, without stitching together separate SaaS tools for each.',
      approach:
        'Built on Next.js with a password-protected admin dashboard covering leads, quotes, invoices, testimonials, and a scripts and templates shop with Paystack checkout. Disputes are a two-way reply thread with the buyer, not a one-shot form, and a daily Telegram digest flags overdue invoices, open disputes, and stale leads automatically.',
      outcome:
        'A single site that both sells Wyntek\u2019s services and runs the day-to-day operations behind them, used as the agency\u2019s actual internal tool, not just a portfolio piece.',
    },
  },
  {
    id: '02',
    name: 'Expenses Tracker',
    description:
      'A full-stack personal finance app for tracking income and expenses, with budgets, recurring transactions, savings goals, and CSV, Excel and PDF import/export. Backend hand-built in Go using only the standard library, paired with a React and Recharts frontend.',
    tags: ['Full-stack', 'Go', 'Personal Finance'],
    live: 'https://expenses-tracker-ebon-seven.vercel.app/',
    github: 'https://github.com/Freddielite/expenses-tracker',
    image: '/images/projects/expenses-tracker.jpg',
    caseStudy: {
      problem:
        'Wanted a lightweight way to log and categorize everyday spending without the bloat of a full budgeting app, and a real project for learning Go beyond tutorials.',
      approach:
        'Built the backend in Go 1.22 using only the standard library for routing and storage (no ORM, no framework), with an optional Postgres swap behind a storage interface. Added budgets, recurring transactions, savings goals, and three export formats: CSV, Excel, and a self-contained offline HTML dashboard, plus CSV, Excel and PDF import.',
      outcome:
        'A working personal finance tool in daily use, and a genuine reference for what an ORM and web framework are actually doing under the hood, since this app deliberately does without both.',
    },
  },
  {
    id: '03',
    name: 'Eaksline Courier',
    description:
      'Website for a logistics and courier company, built to turn visitors into inquiries with service listings clear enough that people do not need to call to understand what is on offer.',
    tags: ['Logistics', 'Web Design', 'Client Acquisition'],
    live: 'https://eakslinecourier.com',
    github: null,
    image: '/images/projects/eaksline.jpg',
    caseStudy: {
      problem:
        'Eaksline needed a site that could list courier and logistics services clearly enough to convert cold visitors into inquiries, without a sales call being the first point of clarity.',
      approach:
        'Designed and built a service-focused site with service listings front and center, structured so a first-time visitor understands pricing tiers and coverage areas without digging.',
      outcome:
        'Now the company\u2019s main channel for new client inquiries, doing the job a front desk used to do.',
    },
  },
  {
    id: '04',
    name: 'FocusDial',
    description:
      'A focus-session tracker with a live timer and manual logging that turns real session history into insights: peak focus hours, a daily streak, and which kind of work you sustain focus on longest. Includes weekly time budgets, a deadline planner with feasibility tracking, and real push notifications.',
    tags: ['Full-stack', 'React', 'Productivity', 'PWA'],
    live: 'https://focusdial.vercel.app/',
    github: null,
    image: null,
    caseStudy: {
      problem:
        'Most focus trackers are demo projects running on generated data. I wanted a tool for daily personal use that computes real insights, peak hours, sustained focus, streaks, from actual logged sessions, not sample data.',
      approach:
        'Built a Node and Express API on Postgres, paired with a React frontend that computes all analytics client-side, since "today" and "this week" are timezone-sensitive questions the server cannot answer reliably on its own. Added a deadline planner that compares required daily hours against real historical averages, and wired up real Web Push notifications through an external cron trigger so reminders reach you even with the app fully closed.',
      outcome:
        'A personal daily-use tool, installable as a desktop or Chrome app, that tracks real focus sessions and reports something true about your own habits instead of a generic dashboard.',
    },
  },
  {
    id: '05',
    name: 'Pulse',
    description:
      'A personal uptime and keep-alive monitor built for the Render/Vercel free-tier reality: it pings your own apps often enough that they never spin down, while tracking SSL and domain expiry, running passive security scans, and alerting you the moment something goes down.',
    tags: ['Full-stack', 'Monitoring', 'Node.js', 'Security'],
    live: null,
    github: 'https://github.com/Freddielite/pulse',
    image: null,
    caseStudy: {
      problem:
        'Free-tier hosting is great until Render spins an app down after 15 minutes idle, or a certificate quietly expires with nobody watching.',
      approach:
        'Built a Node and Express backend on Postgres with a single cron-driven check cycle rather than a background job runner, covering uptime, SSL and domain expiry, content-diff monitoring for defacement, and a passive security scan (headers, exposed paths, HTTPS enforcement) for every monitored site.',
      outcome:
        'A monitoring tool that keeps my own and client sites awake and alerts me before a certificate or config problem becomes a client-facing outage, with shareable read-only status links for handing a client visibility without giving them a login.',
    },
  },
]

export default projects
