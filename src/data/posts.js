// Fallback blog posts. Write in Portable-Text-ish blocks so the exact same
// <PortableText> renderer used for real Sanity posts works here too.
// TODO (Wilfred): replace with your own posts, or delete once you're posting
// from the Studio.

function block(text) {
  return {
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text }],
  }
}

const posts = [
  {
    _id: 'p1',
    slug: 'building-a-checkout-nigerian-shoppers-actually-use',
    title: 'Building a checkout Nigerian shoppers actually use',
    excerpt:
      "Card-only checkouts quietly lose a lot of shoppers. Notes from wiring up Paystack, bank transfer and USSD side by side on a live storefront.",
    publishedAt: '2026-06-01',
    coverImage: null,
    body: [
      block(
        "Most checkout tutorials assume everyone has a card ready to go. On a Nigerian storefront that assumption loses you customers before they ever see a confirmation page."
      ),
      block(
        "For a recent e-commerce storefront I built a single-page checkout that treats card, bank transfer, Paystack and USSD as equally first-class options, instead of bolting the last three on as an afterthought."
      ),
      block(
        "The main lesson: put the payment method choice up front, not buried after address and shipping. Shoppers who already know they're paying by transfer want to see that option immediately, not discover it three steps in."
      ),
    ],
  },
  {
    _id: 'p2',
    slug: 'three-layers-every-client-site-needs',
    title: 'The three layers every client site needs',
    excerpt:
      'Frontend, backend and the network/security layer underneath, why treating all three as one job changes how you scope a project.',
    publishedAt: '2026-05-10',
    coverImage: '/images/projects/wyntek.jpg',
    body: [
      block(
        "A lot of client sites fail quietly: not because the design is bad, but because nobody owned the server it runs on, or the API underneath it was never load tested."
      ),
      block(
        "I scope every project across three layers: the interface people click through, the API and data behind it, and the infrastructure and security keeping the whole thing online."
      ),
      block(
        "Thinking in three layers from the first conversation makes it much easier to say, honestly, what a timeline and budget actually need to cover."
      ),
    ],
  },
  {
    _id: 'p3',
    slug: 'why-i-still-hand-roll-auth',
    title: 'Why I still hand-roll auth instead of reaching for a SaaS',
    excerpt:
      'Auth-as-a-service is fine until a client\u2019s use case does not fit the pricing tier or the docs. Notes on when JWT plus OTP by hand is still the right call.',
    publishedAt: '2026-07-08',
    coverImage: null,
    body: [
      block(
        'There is a version of this post that just says "use Auth0" and stops there. For a lot of projects, that is genuinely the right answer, do not reinvent session management for a weekend project.'
      ),
      block(
        'But a lot of the client work I take on does not fit that mold. A Nigerian SME building a customer portal does not want a per-user pricing model that scales against them as they grow, and they definitely do not want their login flow to break the day a third-party auth provider changes a free-tier limit.'
      ),
      block(
        'So for most client builds I hand-roll it: JWT for stateless sessions, OTP over SMS or WhatsApp for verification, and SSO only when a client specifically needs it for an internal tool. It is more code up front, but it is code the client owns outright, with no external dependency that can change terms on them later.'
      ),
      block(
        'The trade-off is real. You are now responsible for token rotation, rate-limiting the OTP endpoint, and all the edge cases a mature auth provider has already solved. I do not take this route by default. I take it when the client\u2019s constraints, cost predictability, data residency, not wanting a vendor in the critical path, make it the better fit.'
      ),
    ],
  },
  {
    _id: 'p4',
    slug: 'what-actually-breaks-when-a-site-goes-down',
    title: 'What actually breaks when a Nigerian client site goes down',
    excerpt:
      'It is rarely the code. Notes from the networking and security side of client work, and from building a monitoring tool to catch it before a client does.',
    publishedAt: '2026-07-22',
    coverImage: null,
    body: [
      block(
        'When a client site goes down, the instinct is to check the code first. In my experience, the code is rarely the problem, it is the layer underneath it that portfolio screenshots never show.'
      ),
      block(
        'Expired or misconfigured SSL is one of the most common causes: a site that was fine at launch, then quietly breaks months later because a certificate renewal step was not actually automatic. DNS is another, a client changes email providers, someone edits a record to "fix" something unrelated, and the site goes down three days later when a cache expires.'
      ),
      block(
        'This kept happening enough on client sites that I built Pulse, a personal uptime and monitoring tool: it checks SSL and domain expiry, runs a passive security scan, and flags content changes that could mean a defacement, alongside the basic up/down checks. The goal is finding out about a problem before a client has to tell me about it.'
      ),
      block(
        'None of this is glamorous work, but it is most of what "keeping a site online" actually means once the initial build is done.'
      ),
    ],
  },
  {
    _id: 'p5',
    slug: 'retainer-vs-one-off-scoping-client-work',
    title: 'Retainer vs one-off: how I actually scope client work',
    excerpt:
      'The pricing model is not just a billing choice, it changes what kind of work is even possible to do well.',
    publishedAt: '2026-08-05',
    coverImage: null,
    body: [
      block(
        'Clients usually come in asking for a quote, not a pricing model. But the choice between a one-off project and a retainer changes more than how the invoice looks, it changes what kind of work is realistic to promise.'
      ),
      block(
        'A one-off makes sense when the scope is genuinely fixed: a storefront, an agency site, a courier company\u2019s service pages. Define the deliverable, build it, ship it, hand over the keys.'
      ),
      block(
        'A retainer makes sense the moment "done" is not really a real state, an API that needs new endpoints as the business grows, infrastructure that needs monitoring, a site that needs updating every time the client runs a promotion. Trying to price that as a series of one-offs usually means either the client overpays for small changes, or I underprice the ongoing responsibility of keeping something running.'
      ),
      block(
        'The honest version of scoping a new client conversation is asking, early: is this a thing we finish, or a thing we maintain. Most of the friction I have seen in freelance work comes from treating a maintain-shaped project like a finish-shaped one.'
      ),
    ],
  },
]

export default posts
