import {
  pgTable, uuid, text, boolean, integer, jsonb,
  timestamp, unique, index,
} from 'drizzle-orm/pg-core'

export const userProfiles = pgTable('user_profiles', {
  id:             uuid('id').primaryKey().defaultRandom(),
  authUserId:     uuid('auth_user_id').unique().notNull(),
  displayName:    text('display_name'),
  avatarUrl:      text('avatar_url'),
  encryptionSalt: text('encryption_salt'), // random per-user, for Plus client-side encryption
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const households = pgTable('households', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name'),
  ownerId:   uuid('owner_id').notNull().references(() => userProfiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const householdMembers = pgTable('household_members', {
  id:            uuid('id').primaryKey().defaultRandom(),
  householdId:   uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userProfileId: uuid('user_profile_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  role:          text('role').notNull(), // 'owner' | 'caregiver' | 'viewer'
  nickname:      text('nickname'),
  joinedAt:      timestamp('joined_at', { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.householdId, t.userProfileId)])

export const childProfiles = pgTable('child_profiles', {
  id:             uuid('id').primaryKey().defaultRandom(),
  householdId:    uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  nickname:       text('nickname').notNull(), // encourage fake name
  birthYearMonth: text('birth_year_month'), // YYYY-MM, not full date
  stageKey:       text('stage_key'), // cached computed value
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [index('idx_child_profiles_household').on(t.householdId)])

export const childCapabilityProfiles = pgTable('child_capability_profiles', {
  id:           uuid('id').primaryKey().defaultRandom(),
  childId:      uuid('child_id').unique().notNull().references(() => childProfiles.id, { onDelete: 'cascade' }),
  capabilities: jsonb('capabilities').default({}), // {capabilityKey: true/false}
  zpdTargets:   text('zpd_targets').array().default([]),
  lastUpdated:  timestamp('last_updated', { withTimezone: true }).defaultNow(),
})

export const companionActivities = pgTable('companion_activities', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  title:               text('title').notNull(),
  description:         text('description'),
  openingLine:         text('opening_line').notNull(),
  steps:               jsonb('steps').notNull().default([]),
  followUpQuestions:   jsonb('follow_up_questions').default([]),
  safetyNotes:         text('safety_notes'),
  endingLine:          text('ending_line'),

  minAgeMonths:        integer('min_age_months'),
  maxAgeMonths:        integer('max_age_months'),
  requiredCapabilities: text('required_capabilities').array().default([]),
  optionalCapabilities: text('optional_capabilities').array().default([]),
  zpdTargets:          text('zpd_targets').array().default([]),
  developmentalFocus:  text('developmental_focus').array().default([]),
  stimulationLevel:    text('stimulation_level'), // 'low' | 'medium' | 'high'
  playType:            text('play_type'), // 'solitary' | 'parallel' | 'associative' | 'cooperative'

  requiredResources:   text('required_resources').array().default([]),
  spaceRequirement:    text('space_requirement').default('anywhere'),
  minDurationMinutes:  integer('min_duration_minutes').default(5),
  maxDurationMinutes:  integer('max_duration_minutes').default(30),

  isBedsideSafe:       boolean('is_bedtime_safe').default(false),
  isSickDaySafe:       boolean('is_sick_day_safe').default(false),
  elderlyFriendly:     boolean('elderly_friendly').default(false),
  seasonTags:          text('season_tags').array().default([]),
  holidayTags:         text('holiday_tags').array().default([]),
  companionType:       text('companion_type'),

  isFallback:          boolean('is_fallback').default(false),
  isActive:            boolean('is_active').default(true),
  createdAt:           timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const companionLogs = pgTable('companion_logs', {
  id:            uuid('id').primaryKey().defaultRandom(),
  childId:       uuid('child_id').notNull().references(() => childProfiles.id, { onDelete: 'cascade' }),
  householdId:   uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  caregiverId:   uuid('caregiver_id').notNull().references(() => userProfiles.id),
  activityId:    uuid('activity_id').references(() => companionActivities.id),

  startedAt:     timestamp('started_at', { withTimezone: true }).defaultNow(),
  durationSecs:  integer('duration_seconds'),
  outcome:       text('outcome'), // 'completed' | 'tried' | 'abandoned'
  childReaction: text('child_reaction'), // 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'
  notes:         text('notes'), // encrypted for Plus

  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_companion_logs_child').on(t.childId),
  index('idx_companion_logs_started').on(t.startedAt),
])

export const householdInvites = pgTable('household_invites', {
  id:          uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  token:       text('token').unique().notNull(),
  role:        text('role').notNull(),
  createdBy:   uuid('created_by').notNull().references(() => userProfiles.id),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt:      timestamp('used_at', { withTimezone: true }),
  usedBy:      uuid('used_by').references(() => userProfiles.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const entitlements = pgTable('entitlements', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  userProfileId:           uuid('user_profile_id').unique().notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  plan:                    text('plan').notNull().default('free'), // 'free' | 'supporter' | 'plus'
  plusAiCallsRemaining:    integer('plus_ai_calls_remaining').default(0),
  plusAiCallsResetAt:      timestamp('plus_ai_calls_reset_at', { withTimezone: true }),
  lemonSqueezySubscriptionId: text('lemonsqueezy_subscription_id'), // web
  revenuecatCustomerId:    text('revenuecat_customer_id'), // mobile
  supporterPurchasedAt:    timestamp('supporter_purchased_at', { withTimezone: true }),
  plusStartedAt:           timestamp('plus_started_at', { withTimezone: true }),
  plusEndsAt:              timestamp('plus_ends_at', { withTimezone: true }),
  createdAt:               timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:               timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const handoffSummaries = pgTable('handoff_summaries', {
  id:               uuid('id').primaryKey().defaultRandom(),
  householdId:      uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  childId:          uuid('child_id').notNull().references(() => childProfiles.id),
  createdBy:        uuid('created_by').notNull().references(() => userProfiles.id),
  summaryText:      text('summary_text'),
  logsReferenced:   uuid('logs_referenced').array().default([]),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const appConfigs = pgTable('app_configs', {
  key:         text('key').primaryKey(),
  value:       jsonb('value').notNull(),
  description: text('description'),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const sponsorCards = pgTable('sponsor_cards', {
  id:                uuid('id').primaryKey().defaultRandom(),
  title:             text('title').notNull(),
  body:              text('body').notNull(),
  ctaText:           text('cta_text'),
  ctaUrl:            text('cta_url'),
  allowedPlacements: text('allowed_placements').array().notNull().default([]),
  isActive:          boolean('is_active').default(true),
  startsAt:          timestamp('starts_at', { withTimezone: true }),
  endsAt:            timestamp('ends_at', { withTimezone: true }),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
})
