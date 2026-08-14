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
    coverImage: '/images/projects/shefitts.jpg',
    body: [
      block(
        "Most checkout tutorials assume everyone has a card ready to go. On a Nigerian storefront that assumption loses you customers before they ever see a confirmation page."
      ),
      block(
        "For Shefitts.co I built a single-page checkout that treats card, bank transfer, Paystack and USSD as equally first-class options, instead of bolting the last three on as an afterthought."
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
      'Frontend, backend and the network/security layer underneath — why treating all three as one job changes how you scope a project.',
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
]

export default posts
