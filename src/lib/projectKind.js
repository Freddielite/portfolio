export const kindOf = (p) => p.kind || 'Own product'

// Private own-products offer the source on request. Client work never does,
// because the code belongs to the client.
export const sourceOnRequest = (p) => !p.github && kindOf(p) !== 'Client work'
