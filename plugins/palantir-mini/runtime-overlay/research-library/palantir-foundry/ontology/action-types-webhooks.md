---
source: https://www.palantir.com/docs/foundry/action-types/webhooks/
fetched: 2026-04-20
section: ontology-deep
doc_title: Webhooks
---

# Webhooks

Webhooks connect action types to external systems (Salesforce, SAP, any HTTP server). When an action is applied, data is sent to the external system.

## Writeback vs. side effect

| Type | When applied | Failure shown to user? |
|------|-------------|------------------------|
| Writeback | Before object changes | Yes |
| Side effect | After object changes | No |

### Writeback webhooks

- Executed before any other rules.
- If the webhook fails, no Foundry changes are applied.
- Only one writeback webhook per action is allowed.
- Output parameters from writeback webhooks can be used in subsequent rules.
- Provides partial transactionality: if external call fails, Foundry changes are blocked. (External success + Foundry failure is still possible.)

### Side effect webhooks

- Executed after object rules.
- Multiple side effect webhooks per action are allowed.
- End user sees success message before side effects complete.
- A side effect webhook can be called multiple times in one action by returning a list of payloads from a Function.

## Input parameters

Two configuration options:
1. **Map to action parameters** — map each webhook input to an action parameter, static value, or object parameter property.
2. **Use a Function** — the function must return a custom type whose fields strongly match the webhook input parameter IDs and types. Enables logic-based payload construction from Ontology objects.

## Output parameters

Only available for writeback webhooks. Select **Writeback response** when configuring subsequent rule values to pull from webhook response fields.

## OAuth 2.0

When the webhook's REST API source uses an outbound application for auth, Foundry manages the OAuth 2.0 authorization flow automatically. No manual token handling required.
