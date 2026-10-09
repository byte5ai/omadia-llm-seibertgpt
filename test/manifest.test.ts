/**
 * Validates manifest.yaml's `llm_provider` block against the same invariants
 * the omadia core model registry enforces, so the plugin can't ship a manifest
 * that core would reject at load.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';

const manifestPath = fileURLToPath(new URL('../manifest.yaml', import.meta.url));
const manifest = parse(readFileSync(manifestPath, 'utf8')) as Record<
  string,
  unknown
>;

interface ModelEntry {
  id: string;
  model_id: string;
  label: string;
  class: 'fast' | 'balanced' | 'frontier';
  max_tokens: number;
  context_window: number;
  vision: boolean;
  class_default?: boolean;
  effort_levels?: string[];
  effort_default?: string;
}

interface LlmProviderBlock {
  id: string;
  label: string;
  wire_format: string;
  default_base_url: string;
  base_url_config_key?: string;
  quirks?: Record<string, unknown>;
  models: ModelEntry[];
  discovery: DiscoveryBlock;
}

interface DiscoveryRule {
  match: string;
  class: string;
  rest_class?: string;
  aliases?: string[];
  max_tokens?: number;
  context_window?: number;
  vision?: boolean;
  effort_levels?: string[];
  effort_default?: string;
  label?: string;
}

interface DiscoveryBlock {
  include?: string[];
  exclude?: string[];
  classify: DiscoveryRule[];
}

function block(): LlmProviderBlock {
  return manifest['llm_provider'] as LlmProviderBlock;
}

test('manifest declares the seibertgpt llm_provider block', () => {
  const p = block();
  assert.equal(p.id, 'seibertgpt');
  assert.equal(p.wire_format, 'openai-compatible');
  assert.match(p.default_base_url, /^https:\/\//);
  assert.ok(Array.isArray(p.models) && p.models.length > 0);
});

test('every model id equals "<provider>:<model_id>"', () => {
  const p = block();
  for (const m of p.models) {
    assert.equal(
      m.id,
      `${p.id}:${m.model_id}`,
      `model id '${m.id}' must equal '${p.id}:${m.model_id}'`,
    );
  }
});

test('model classes are valid and ids/model_ids are not class refs', () => {
  const p = block();
  const valid = new Set(['fast', 'balanced', 'frontier']);
  for (const m of p.models) {
    assert.ok(valid.has(m.class), `invalid class '${m.class}' for ${m.id}`);
    assert.ok(!m.id.startsWith('class:'), `id may not start with class: (${m.id})`);
    assert.ok(typeof m.max_tokens === 'number' && m.max_tokens > 0);
    assert.ok(typeof m.context_window === 'number' && m.context_window > 0);
    assert.ok(m.max_tokens <= m.context_window, `${m.id}: max_tokens > context_window`);
  }
});

test('each class has exactly one default when it has >1 model', () => {
  const p = block();
  const counts = new Map<string, { total: number; defaults: number }>();
  for (const m of p.models) {
    const c = counts.get(m.class) ?? { total: 0, defaults: 0 };
    c.total += 1;
    if (m.class_default === true) c.defaults += 1;
    counts.set(m.class, c);
  }
  for (const [cls, c] of counts) {
    if (c.total > 1) {
      assert.equal(c.defaults, 1, `class '${cls}' needs exactly one class_default`);
    }
  }
});

test('model ids are unique', () => {
  const p = block();
  const ids = p.models.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate model id');
});

const VALID_CLASSES = new Set(['fast', 'balanced', 'frontier']);

function discovery(): DiscoveryBlock {
  const d = block().discovery;
  assert.ok(d && typeof d === 'object', 'llm_provider.discovery must be present');
  assert.ok(
    Array.isArray(d.classify) && d.classify.length > 0,
    'discovery.classify must be a non-empty array',
  );
  return d;
}

test('discovery.classify is a non-empty list of compilable rules', () => {
  for (const r of discovery().classify) {
    assert.equal(typeof r.match, 'string', 'classify.match must be a regex source string');
    assert.doesNotThrow(
      () => new RegExp(r.match, 'i'),
      `classify.match does not compile: ${r.match}`,
    );
  }
});

test('discovery include/exclude patterns compile', () => {
  const d = discovery();
  for (const key of ['include', 'exclude'] as const) {
    const patterns = d[key];
    if (patterns === undefined) continue;
    assert.ok(
      Array.isArray(patterns) && patterns.length > 0,
      `discovery.${key} must be a non-empty array when present`,
    );
    for (const p of patterns) {
      assert.equal(typeof p, 'string', `discovery.${key} must contain regex source strings`);
      assert.doesNotThrow(
        () => new RegExp(p, 'i'),
        `discovery.${key} does not compile: ${p}`,
      );
    }
  }
});

test('discovery classes and rest_classes are valid model classes', () => {
  for (const r of discovery().classify) {
    assert.ok(VALID_CLASSES.has(r.class), `invalid class '${r.class}' for match '${r.match}'`);
    if (r.rest_class !== undefined) {
      assert.ok(
        VALID_CLASSES.has(r.rest_class),
        `invalid rest_class '${r.rest_class}' for match '${r.match}'`,
      );
    }
  }
});

// New generations must be discovered without manifest edits. Strip the generic
// \d escape before checking for digits that would pin a rule to a version.
test('no classify rule hardcodes a model version', () => {
  for (const r of discovery().classify) {
    const withoutDigitEscape = r.match.replaceAll('\\d', '');
    assert.ok(
      !/\d/.test(withoutDigitEscape),
      `classify.match '${r.match}' hardcodes a version number`,
    );
  }
});

test('effort_default is always one of effort_levels', () => {
  const targets: Array<{ where: string; levels?: string[]; fallback?: string }> = [
    ...block().models.map((m) => ({
      where: m.id,
      levels: m.effort_levels,
      fallback: m.effort_default,
    })),
    ...discovery().classify.map((r) => ({
      where: `classify ${r.match}`,
      levels: r.effort_levels,
      fallback: r.effort_default,
    })),
  ];
  for (const t of targets) {
    if (t.levels !== undefined) {
      assert.ok(!t.levels.includes('max'), `${t.where}: 'max' is not a valid effort level`);
    }
    if (t.fallback === undefined) continue;
    assert.ok(
      Array.isArray(t.levels) && t.levels.length > 0,
      `${t.where}: effort_default declared without effort_levels`,
    );
    assert.ok(
      t.levels.includes(t.fallback),
      `${t.where}: effort_default '${t.fallback}' is not in effort_levels`,
    );
  }
});

// --- SeibertGPT-specific invariants ------------------------------------------

/** Variants SeibertGPT's `/v1/models` lists today (https://gpt.seibert.ai/api-doku). */
const DOCUMENTED_LIVE_IDS = [
  'deepseek-v41-flash',
  'deepseek-v41-flash-fast',
  'deepseek-v41-flash-low',
  'deepseek-v41-flash-high',
  'deepseek-v41-flash-max',
];

/** Mirror of the kernel's include → exclude → first-match-wins classify pass. */
function classifyLive(ids: string[]): Map<string, string> {
  const d = discovery();
  const out = new Map<string, string>();
  for (const id of ids) {
    if (d.include && !d.include.some((p) => new RegExp(p, 'i').test(id))) continue;
    if (d.exclude?.some((p) => new RegExp(p, 'i').test(id))) continue;
    const rule = d.classify.find((r) => new RegExp(r.match, 'i').test(id));
    if (rule) out.set(id, rule.class);
  }
  return out;
}

test('discovery over the documented live list reproduces the seed classes', () => {
  const live = classifyLive(DOCUMENTED_LIVE_IDS);
  const seed = new Map(block().models.map((m) => [m.model_id, m.class as string]));
  assert.deepEqual([...live].sort(), [...seed].sort());
});

test('discovery keeps exactly one model per class (deterministic class default)', () => {
  const classes = [...classifyLive(DOCUMENTED_LIVE_IDS).values()];
  assert.deepEqual([...classes].sort(), ['balanced', 'fast', 'frontier']);
});

test('discovery drops the -low and -max variants', () => {
  const live = classifyLive(DOCUMENTED_LIVE_IDS);
  assert.ok(!live.has('deepseek-v41-flash-low'));
  assert.ok(!live.has('deepseek-v41-flash-max'));
});

test('a future model generation is classified without manifest edits', () => {
  const live = classifyLive([
    'deepseek-v5-flash',
    'deepseek-v5-flash-fast',
    'deepseek-v5-flash-high',
  ]);
  assert.equal(live.get('deepseek-v5-flash-fast'), 'fast');
  assert.equal(live.get('deepseek-v5-flash'), 'balanced');
  assert.equal(live.get('deepseek-v5-flash-high'), 'frontier');
});

// The openai-compatible adapter sends `reasoning_effort` only to native OpenAI;
// declared levels would show up in the operator UI and then be dropped.
test('no model or rule declares effort levels', () => {
  for (const m of block().models) assert.equal(m.effort_levels, undefined, m.id);
  for (const r of discovery().classify) assert.equal(r.effort_levels, undefined, r.match);
});

// `cold_request_too_large` rejects new/cold sessions above 350k tokens on every plan.
test('context windows stay within the 350k cold-request limit', () => {
  for (const m of block().models) assert.ok(m.context_window <= 350_000, m.id);
  for (const r of discovery().classify) {
    if (r.context_window !== undefined) assert.ok(r.context_window <= 350_000, r.match);
  }
});

test('provider is flagged EU-hosted', () => {
  const policy = (manifest['llm_provider'] as Record<string, unknown>)['policy'] as
    | Record<string, unknown>
    | undefined;
  assert.equal(policy?.['eu_hosted'], true);
});

test('network allow-list covers the default base URL host', () => {
  const host = new URL(block().default_base_url).host;
  const perms = manifest['permissions'] as { network: { outbound: string[] } };
  assert.ok(perms.network.outbound.includes(host), `${host} missing from network.outbound`);
});

test('base-URL setup field matches base_url_config_key and default', () => {
  const p = block();
  const fields = (manifest['setup'] as { fields: Array<Record<string, unknown>> }).fields;
  const field = fields.find((f) => f['key'] === p.base_url_config_key);
  assert.ok(field, `setup field '${String(p.base_url_config_key)}' missing`);
  assert.equal(field['default'], p.default_base_url);
});
