/**
 * @stable — WebhookDeclaration primitive (prim-action-04, v1.0)
 *
 * External ingress event descriptor (Palantir Webhook analog). Declares the
 * endpoint URL, optional auth header, the payload schema reference, and which
 * event types this webhook should receive. Execution infrastructure is downstream.
 *
 * Authority chain:
 *   research/palantir/action/ → schemas/ontology/primitives/webhook-declaration.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → codegen
 *
 * D/L/A domain: ACTION (webhooks drive external ingress mutations; the declaration
 * is a stored fact about external action surfaces)
  * @owner palantirkc-ontology
 * @purpose @stable — WebhookDeclaration primitive (prim-action-04, v1.0)
 */

export type WebhookRid = string & { readonly __brand: "WebhookRid" };

export const webhookRid = (s: string): WebhookRid => s as WebhookRid;

export interface WebhookDeclaration {
  readonly webhookId: WebhookRid;
  /** Fully-qualified URL of the webhook endpoint */
  readonly endpoint: string;
  /** Optional Authorization header value (e.g. "Bearer <token>") */
  readonly authHeader?: string;
  /** RID or JSON-schema reference describing the expected payload shape */
  readonly payloadSchema: string;
  /** Event type names this webhook should receive (empty = all events) */
  readonly eventTypeFilter: ReadonlyArray<string>;
  readonly description?: string;
}

export class WebhookDeclarationRegistry {
  private readonly items = new Map<WebhookRid, WebhookDeclaration>();

  register(decl: WebhookDeclaration): void {
    this.items.set(decl.webhookId, decl);
  }

  get(rid: WebhookRid): WebhookDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<WebhookRid> {
    return this.items.keys();
  }

  list(): WebhookDeclaration[] {
    return [...this.items.values()];
  }
}

export const WEBHOOK_DECLARATION_REGISTRY = new WebhookDeclarationRegistry();
