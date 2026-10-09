/**
 * @omadia/plugin-llm-seibertgpt — entry point.
 *
 * SeibertGPT is an OpenAI-compatible provider, so it needs NO runtime provider
 * code: the kernel reads the `llm_provider` block from this plugin's
 * `manifest.yaml` at manifest-load time and registers SeibertGPT (id, baseURL,
 * models) into the kernel-owned `LlmProviderCatalog` BEFORE any plugin
 * activates. That ordering is what lets the orchestrator resolve a SeibertGPT
 * provider at its own activation regardless of plugin load order.
 *
 * `activate()` therefore only performs an optional sanity log — the provider is
 * already live by the time we get here. The operator supplies the API key via
 * the admin Providers page (vault key `provider:seibertgpt/api_key`).
 */
import type { PluginContext } from '@omadia/plugin-api';

export interface SeibertGptPluginHandle {
  close(): Promise<void>;
}

export async function activate(
  ctx: PluginContext,
): Promise<SeibertGptPluginHandle> {
  ctx.log(
    '[plugin-llm-seibertgpt] active — SeibertGPT provider declared in manifest; ' +
      'set the API key on the admin Providers page (provider:seibertgpt/api_key).',
  );
  return {
    async close(): Promise<void> {
      ctx.log('[plugin-llm-seibertgpt] deactivating');
    },
  };
}
