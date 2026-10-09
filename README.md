<div align="center">

# @omadia/plugin-llm-seibertgpt

### Run your omadia agents on SeibertGPT, hosted in the EU.

A signed omadia plugin that adds SeibertGPT as a provider you pick on the admin Providers page. SeibertGPT is run by Seibert Group (Wiesbaden) and serves DeepSeek V4.1 Flash from a data center in Helsinki, so prompt data stays in the EU. A GDPR data processing agreement (AVV) is available. Declarative: no runtime code, the model catalog ships in the manifest.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Built for omadia](https://img.shields.io/badge/built%20for-omadia-2496ED.svg)](https://github.com/byte5ai/omadia)
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[**Main repo**](https://github.com/byte5ai/omadia) · [**Website**](https://omadia.ai) · [**Plugin hub**](https://hub.omadia.ai) · [**Models**](#models) · [**Install**](#install)

🇩🇪 Diese Anleitung gibt es auch [auf Deutsch](./README.de.md).

</div>

---

omadia is a self-hostable agentic OS: compose multi-agent teams from signed plugins, run them on your own machine, and get an auditable trail for every action. This plugin makes SeibertGPT one of the LLM providers those agents can run on. Main repo: [byte5ai/omadia](https://github.com/byte5ai/omadia). SeibertGPT API docs: [gpt.seibert.ai/api-doku](https://gpt.seibert.ai/api-doku).

## Models

SeibertGPT serves one model, DeepSeek V4.1 Flash, in several thinking variants. The variant is part of the model id, so each omadia class gets its own variant:

| Model id | Thinking | Class |
| --- | --- | --- |
| `deepseek-v41-flash-high` | high effort | frontier |
| `deepseek-v41-flash` | standard | balanced |
| `deepseek-v41-flash-fast` | off | fast |

Agents ask for a class (`fast`, `balanced`, `frontier`). omadia maps the class to the model, so an agent never hard-codes one. Once the API key is set, omadia reads the live list from `GET /v1/models` and classifies new generations by the same suffix rules. `-low` and `-max` are skipped on purpose. `-max` keeps a request slot busy for a long time, and on a one-slot plan every other agent waits for it.

## How it works in omadia

A declarative provider plugin, so it ships no runtime provider code. The omadia kernel reads the `llm_provider` block from `manifest.yaml` (id, base URL, models) when the plugin loads, before any agent activates, and registers it in the provider catalog. SeibertGPT speaks the OpenAI-compatible wire format, so omadia drives it through its built-in OpenAI-compatible adapter. The manifest flags the provider as EU-hosted, so the admin Providers page shows the matching data-protection note.

## Install

1. Install from the [plugin hub](https://hub.omadia.ai) in the omadia admin UI (Store, Upload), or drop the built ZIP in directly.
2. On the admin Providers page, paste your SeibertGPT API key (`gpt_…`). omadia stores it encrypted in the vault under `provider:seibertgpt/api_key`.
3. Assign SeibertGPT and a model to an agent: the orchestrator, a sub-agent, or the verifier.

## Before you go live

**Plan size.** The Standard plan allows one request at a time. An orchestrator that fans out to sub-agents sends several, and the extra ones come back as `429 concurrency_limit`. omadia retries those, but turns get slow. For multi-agent setups pick Premium (2 parallel requests) or Professional (4).

**IP binding.** A key is bound to one client IP for a while. If your omadia instance leaves through more than one egress IP (several machines, a NAT pool), requests from the second IP fail with `403 ip_locked`. Give each instance its own key, or route it through one fixed IP.

**Context size.** Plans offer 350k to 1M tokens of context, but on every plan a new or long-idle session is rejected above 350k tokens (`cold_request_too_large`). That is why the manifest declares a 350k context window, whatever plan you book.

## Configuration

| Setup field | Required | Default | Notes |
| --- | :---: | --- | --- |
| `seibertgpt_base_url` | no | `https://api.gpt.seibert.ai/v1` | Point at a SeibertGPT-compatible gateway if you route through one. |

The key is set centrally on the Providers page, not per plugin, so the orchestrator reads it from the shared vault scope.

## Build from source

```bash
npm install
npm run build     # tsc, emits dist/
npm test          # validates manifest.yaml against core's invariants
npm run package   # → out/omadia-plugin-llm-seibertgpt-<version>.zip
```

`@omadia/plugin-api` and `@omadia/llm-provider` are provided by the omadia host at runtime (optional peer deps). Link them from a local omadia checkout to build. See [byte5ai/omadia](https://github.com/byte5ai/omadia) for the layout.

## License

[MIT](LICENSE), byte5 GmbH
