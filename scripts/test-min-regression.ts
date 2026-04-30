import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string): string {
  const absolutePath = path.join(projectRoot, relativePath);
  return fs.readFileSync(absolutePath, "utf8");
}

function expectIncludes(content: string, needle: string, context: string): void {
  assert.ok(content.includes(needle), `Expected "${needle}" in ${context}`);
}

function run(): void {
  const supportTicketRoute = read("src/app/api/support-tickets/[id]/route.ts");
  expectIncludes(
    supportTicketRoute,
    'requireSessionWithRoles(["ADMIN", "TENANT_ADMIN"])',
    "support ticket route auth guard"
  );
  expectIncludes(
    supportTicketRoute,
    "buildTenantScopedWhere(session, params.id)",
    "support ticket tenant scoping"
  );

  const supportCommentsRoute = read("src/app/api/support-tickets/[id]/comments/route.ts");
  expectIncludes(
    supportCommentsRoute,
    'requireSessionWithRoles(["ADMIN", "TENANT_ADMIN"])',
    "support ticket comments auth guard"
  );
  expectIncludes(
    supportCommentsRoute,
    "buildTenantScopedWhere(session, params.id)",
    "support ticket comments tenant scoping"
  );

  const webhooksRoute = read("src/app/api/webhooks/route.ts");
  expectIncludes(
    webhooksRoute,
    "requireSessionWithRoles",
    "webhooks route auth helper usage"
  );

  const stripeWebhookRoute = read("src/app/api/webhooks/stripe/route.ts");
  expectIncludes(
    stripeWebhookRoute,
    "constructWebhookEvent(body, signature)",
    "stripe webhook signature verification"
  );
  expectIncludes(
    stripeWebhookRoute,
    "case 'checkout.session.completed'",
    "stripe webhook critical event handler"
  );

  console.log("✅ Minimum regression checks passed");
}

run();
