#!/usr/bin/env tsx

/**
 * Seed script for companion activities
 * Idempotent: checks if activities already exist before inserting
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Activity {
  title: string;
  description?: string;
  openingLine: string;
  steps: string[];
  followUpQuestions?: string[];
  safetyNotes?: string;
  endingLine: string;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  requiredCapabilities?: string[];
  optionalCapabilities?: string[];
  zpdTargets?: string[];
  developmentalFocus?: string[];
  stimulationLevel: "low" | "medium" | "high";
  playType?: "solitary" | "parallel" | "associative" | "cooperative";
  requiredResources?: string[];
  spaceRequirement?: string;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  isBedsideSafe?: boolean;
  isSickDaySafe?: boolean;
  elderlyFriendly?: boolean;
  companionType?: string;
  isFallback?: boolean;
  isActive?: boolean;
}

const activities: Activity[] = [
  // Fallback
  {
    title: "問你一件今天的事",
    openingLine: "你今天有什麼讓你開心的事嗎？",
    steps: ["坐在孩子旁邊", "說出開口第一句", "認真聽，點頭，不評判"],
    followUpQuestions: ["然後呢？", "那讓你感覺怎麼樣？"],
    endingLine: "謝謝你告訴我這件事。",
    stimulationLevel: "low",
    companionType: "talk",
    isBedsideSafe: true,
    isSickDaySafe: true,
    elderlyFriendly: true,
    isFallback: true,
    isActive: true,
  },
];

async function seed() {
  console.log("🌱 Starting activity seed...");

  try {
    const { count: existingCount } = await supabase
      .from("companion_activities")
      .select("*", { count: "exact", head: true });

    console.log(`📊 Found ${existingCount} existing activities`);

    if (existingCount && existingCount > 0) {
      console.log("✅ Activities already seeded. Skipping.");
      return;
    }

    console.log(`📝 Inserting ${activities.length} activities...`);

    const { error } = await supabase
      .from("companion_activities")
      .insert(activities);

    if (error) {
      console.error(`❌ Error inserting activities:`, error);
      throw error;
    }

    console.log("✨ Seed complete!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
