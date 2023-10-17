import type { Offering } from './offering.js'

export * from './offering.js'

/**
 * Type alias for all resource kinds classes
 * @beta
 */
export type ResourceKindClass = Offering


/**
 * Type alias for all resource kinds classes mapped by string keys
 * @beta
 */
export type ResourceKindClasses = {
  'offering': Offering
}