/**
 * Pilot — Core Re-exports
 * 
 * Central barrel file for the generic OpenClaw engine.
 * Import from here: `import { ... } from '../_shared/pilot/index.ts'`
 */

// Submodules (already extracted)
export * from '../types.ts';
export * from '../ai-config.ts';
export * from '../concurrency.ts';
export * from '../token-tracking.ts';
export * from '../trace.ts';

// Pilot-specific modules
export * from './prompt-compiler.ts';
export * from './built-in-tools.ts';

// Re-export reason() and all handlers from the main agent-reason.ts
// These will be moved into pilot/reason.ts in the next phase
export {
  reason,
  executeBuiltInTool,
  loadSkillTools,
  loadMemories,
  loadObjectives,
  loadHeartbeatState,
  saveHeartbeatState,
  checkoutObjective,
  releaseObjective,
  runSelfHealing,
  pruneConversationHistory,
  fetchSkillInstructions,
  loadSkillInstructions,
  parseReplyDirectives,
  resolveSkillBudgetTier,
} from '../agent-reason.ts';
export type { ReplyDirective, SkillBudgetTier } from '../agent-reason.ts';
