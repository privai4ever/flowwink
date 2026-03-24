import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  ModuleDefinition,
  openclawSessionInputSchema,
  openclawSessionOutputSchema,
  type OpenClawSessionInput,
  type OpenClawSessionOutput,
} from '@/types/module-contracts';

export const openclawModule: ModuleDefinition<OpenClawSessionInput, OpenClawSessionOutput> = {
  id: 'openclaw',
  name: 'OpenClaw Beta Tester',
  version: '0.1.0',
  description: 'A2A beta testing — an external OpenClaw instance tests FlowWink and exchanges learnings with FlowPilot',
  capabilities: ['data:read', 'data:write', 'webhook:receive'],
  inputSchema: openclawSessionInputSchema,
  outputSchema: openclawSessionOutputSchema,

  async publish(input: OpenClawSessionInput): Promise<OpenClawSessionOutput> {
    try {
      const validated = openclawSessionInputSchema.parse(input);

      const { data, error } = await supabase
        .from('beta_test_sessions')
        .insert({
          scenario: validated.scenario,
          peer_name: validated.peer_name || 'openclaw',
          metadata: validated.metadata || {},
          status: 'running',
        })
        .select('id, scenario, status, started_at')
        .single();

      if (error) throw error;

      logger.log(`[OpenClawModule] Session started: ${data.id} — ${data.scenario}`);

      return {
        success: true,
        session_id: data.id,
        scenario: data.scenario,
        status: data.status,
      };
    } catch (err) {
      logger.error('[OpenClawModule] Error:', err);
      return {
        success: false,
        session_id: '',
        scenario: input.scenario,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};
