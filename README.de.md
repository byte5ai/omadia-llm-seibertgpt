<div align="center">

# @omadia/plugin-llm-seibertgpt

### Betreibe deine omadia-Agenten auf SeibertGPT, gehostet in der EU.

Ein signiertes omadia-Plugin, das SeibertGPT als Provider auf der Admin-Providers-Seite verfügbar macht. SeibertGPT wird von der Seibert Group (Wiesbaden) betrieben und liefert DeepSeek V4.1 Flash aus einem Rechenzentrum in Helsinki. Die Prompt-Daten bleiben also in der EU, ein AVV nach DSGVO ist verfügbar. Deklarativ: kein Laufzeit-Code, der Modellkatalog steckt im Manifest.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Built for omadia](https://img.shields.io/badge/built%20for-omadia-2496ED.svg)](https://github.com/byte5ai/omadia)
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[**Haupt-Repo**](https://github.com/byte5ai/omadia) · [**Website**](https://omadia.ai) · [**Plugin-Hub**](https://hub.omadia.ai) · [**Modelle**](#modelle) · [**Installation**](#installation)

🇬🇧 This guide is also available [in English](./README.md).

</div>

---

omadia ist ein selbst hostbares Agentic OS: Du stellst Multi-Agent-Teams aus signierten Plugins zusammen, betreibst sie auf deiner eigenen Maschine und bekommst für jede Aktion eine prüfbare Spur. Dieses Plugin macht SeibertGPT zu einem der LLM-Provider, auf denen diese Agenten laufen können. Haupt-Repo: [byte5ai/omadia](https://github.com/byte5ai/omadia). SeibertGPT-API-Doku: [gpt.seibert.ai/api-doku](https://gpt.seibert.ai/api-doku).

## Modelle

SeibertGPT liefert ein Modell, DeepSeek V4.1 Flash, in mehreren Denk-Varianten. Die Variante steckt in der Modell-ID, deshalb bekommt jede omadia-Klasse ihre eigene:

| Modell-ID | Denkmodus | Klasse |
| --- | --- | --- |
| `deepseek-v41-flash-high` | hoher Aufwand | frontier |
| `deepseek-v41-flash` | Standard | balanced |
| `deepseek-v41-flash-fast` | aus | fast |

Agenten fragen eine Klasse an (`fast`, `balanced`, `frontier`). omadia ordnet der Klasse das Modell zu, ein Agent legt sich also nie auf ein bestimmtes Modell fest. Sobald der API-Key hinterlegt ist, liest omadia die Live-Liste über `GET /v1/models` und ordnet neue Generationen nach denselben Suffix-Regeln ein. `-low` und `-max` fallen bewusst raus. `-max` belegt einen Request-Slot lange, und bei einem Plan mit nur einem Slot wartet dann jeder andere Agent.

## So funktioniert es in omadia

Ein Modell-Plugin (Kind `model`); nur das Modell-Gateway des Kernels ruft es auf. Es ist ein deklaratives Provider-Plugin, es bringt also keinen Laufzeit-Provider-Code mit. Der omadia-Kernel liest beim Laden des Plugins den `llm_provider`-Block aus `manifest.yaml` (ID, Base-URL, Modelle), noch bevor ein Agent aktiviert wird, und registriert ihn im Provider-Katalog. SeibertGPT spricht das OpenAI-kompatible Wire-Format, omadia steuert es deshalb über seinen eingebauten OpenAI-kompatiblen Adapter an. Das Manifest kennzeichnet den Provider als EU-gehostet, die Admin-Providers-Seite zeigt deshalb den passenden Datenschutz-Hinweis.

## Installation

1. Über den [Plugin-Hub](https://hub.omadia.ai) in der omadia-Admin-UI installieren (Store, Upload) oder das gebaute ZIP direkt hochladen.
2. Auf der Admin-Providers-Seite den SeibertGPT-API-Key (`gpt_…`) einfügen. omadia legt ihn verschlüsselt im Vault unter `provider:seibertgpt/api_key` ab.
3. SeibertGPT und ein Modell einem Agenten zuweisen: dem Orchestrator, einem Sub-Agenten oder dem Verifier.

## Vor dem Livegang

**Plangröße.** Der Standard-Plan erlaubt einen Request gleichzeitig. Ein Orchestrator, der an Sub-Agenten verteilt, schickt mehrere, und die zusätzlichen kommen als `429 concurrency_limit` zurück. omadia wiederholt sie, aber die Antworten werden zäh. Für Multi-Agent-Setups lieber Premium (2 parallele Requests) oder Professional (4).

**IP-Bindung.** Ein Key ist eine Zeit lang an eine Client-IP gebunden. Geht deine omadia-Instanz über mehr als eine Egress-IP raus (mehrere Maschinen, NAT-Pool), scheitern Requests von der zweiten IP mit `403 ip_locked`. Gib jeder Instanz einen eigenen Key oder leite sie über eine feste IP.

**Kontextgröße.** Die Pläne bieten 350k bis 1M Tokens Kontext. Auf jedem Plan wird aber eine neue oder lange inaktive Session über 350k Tokens abgelehnt (`cold_request_too_large`). Deshalb deklariert das Manifest 350k als Kontextfenster, egal welcher Plan gebucht ist.

## Konfiguration

| Setup-Feld | Pflicht | Standard | Hinweise |
| --- | :---: | --- | --- |
| `seibertgpt_base_url` | nein | `https://api.gpt.seibert.ai/v1` | Auf ein SeibertGPT-kompatibles Gateway zeigen, falls du über eines routest. |

Der Key wird zentral auf der Providers-Seite gesetzt, nicht pro Plugin. So liest der Orchestrator ihn aus dem gemeinsamen Vault-Scope.

## Aus dem Quellcode bauen

```bash
npm install
npm run build     # tsc, erzeugt dist/
npm test          # prüft manifest.yaml gegen die Invarianten des Cores
npm run package   # → out/omadia-plugin-llm-seibertgpt-<version>.zip
```

`@omadia/plugin-api` und `@omadia/llm-provider` stellt der omadia-Host zur Laufzeit bereit (optionale Peer-Dependencies). Zum Bauen aus einem lokalen omadia-Checkout verlinken. Das Layout steht in [byte5ai/omadia](https://github.com/byte5ai/omadia).

## Lizenz

[MIT](LICENSE), byte5 GmbH
