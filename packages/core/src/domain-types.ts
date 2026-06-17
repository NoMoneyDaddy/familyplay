export type ParentEnergy = 'low' | 'medium' | 'high'

export const ALLOWED_PARENT_ENERGY_LEVELS: ParentEnergy[] = ['low', 'medium', 'high']

export type SpaceContext =
  | 'anywhere'
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'outdoor_yard'
  | 'park'
  | 'car'
  | 'waiting_area'

export const ALLOWED_SPACE_CONTEXTS: SpaceContext[] = [
  'anywhere',
  'living_room',
  'bedroom',
  'kitchen',
  'outdoor_yard',
  'park',
  'car',
  'waiting_area',
]

export type CompanionType =
  | 'play'
  | 'talk'
  | 'read'
  | 'outdoor'
  | 'creative'
  | 'sensory'
  | 'music'
  | 'calm_down'

export const ALLOWED_COMPANION_TYPES: CompanionType[] = [
  'play',
  'talk',
  'read',
  'outdoor',
  'creative',
  'sensory',
  'music',
  'calm_down',
]

export type ResourceKey =
  | 'none'
  | 'books'
  | 'blocks'
  | 'balls'
  | 'paper_crayons'
  | 'cushions'
  | 'music'
  | 'water'
  | 'kitchen_items'

export const ALLOWED_RESOURCE_KEYS: ResourceKey[] = [
  'none',
  'books',
  'blocks',
  'balls',
  'paper_crayons',
  'cushions',
  'music',
  'water',
  'kitchen_items',
]
