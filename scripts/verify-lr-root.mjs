// Verifies that LR Config uses the tenant's first hierarchy level (e.g. "Central")
// as the root authority, not the legacy "Tenant / Company Level" label.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "scripts/.out/lr-config-root-fixed.png";
mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

page.on("pageerror", (error) => console.error("[pageerror]", error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[console.error]", msg.text());
});

await page.addInitScript(() => {
  const tenant = {
    id: "tenant-nippon01",
    name: "Nippon",
    code: "NIPPON01",
    region: "India",
    industry: "Logistics",
    planId: "plan-growth",
    status: "active",
    tenantType: "DIRECT_CUSTOMER",
    customerPortalEnabled: false,
    assignmentMode: "AUTO_VENDOR_FLOW",
    commercialMode: "SIMPLE",
    enabledModuleCodes: ["TMS"],
    initialHierarchyTemplate: "region-zone",
    primaryAdminUserId: "user-nippon01-admin",
    createdAt: new Date().toISOString(),
    health: { activeUsers: 1, monthlyBookings: 0, policyCount: 0, auditEvents24h: 0 },
  };
  localStorage.setItem("optimile.platform.tenants", JSON.stringify([tenant]));

  // Tenant Admin's hierarchy: Central → Branch
  localStorage.setItem(
    "optimile.tenant.workspaces",
    JSON.stringify({
      "tenant-nippon01": {
        tenantId: "tenant-nippon01",
        startingBlueprint: "region-zone",
        hierarchy: {
          tenantId: "tenant-nippon01",
          startingBlueprint: "region-zone",
          levels: [
            { id: "level-nippon01-central", tenantId: "tenant-nippon01", order: 1, name: "Central", active: true },
            { id: "level-nippon01-branch", tenantId: "tenant-nippon01", order: 2, name: "Branch", active: true },
          ],
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
  );

  const tenantAdmin = {
    id: "role-tenant-tenant-nippon01-tenant-admin",
    tenantId: "tenant-nippon01",
    name: "Tenant Admin",
    description: "System owner",
    hierarchyLevelId: "level-nippon01-central",
    moduleCodes: ["ADMIN", "TMS"],
    dataScope: "ALL_TENANT",
    active: true,
  };
  localStorage.setItem("optimile.tenant.roles", JSON.stringify([tenantAdmin]));

  const adminUser = {
    id: "user-nippon01-admin",
    tenantId: "tenant-nippon01",
    name: "Madhesa",
    email: "admin@nippon.com",
    userType: "INTERNAL",
    roleId: tenantAdmin.id,
    orgUnitIds: [],
    linkedVendorId: null, linkedCustomerId: null, linkedDriverId: null,
    driverName: "", driverCode: "",
    status: "active",
    lastActive: new Date().toISOString(),
    password: "Admin@123",
  };
  localStorage.setItem("optimile.tenant.users", JSON.stringify([adminUser]));
});

await page.goto("http://127.0.0.1:3000/login");
await page.waitForLoadState("networkidle");
await page.getByText(/ceo@uday\.ts\.com/i).first().click({ timeout: 5000 });
await page.locator('input[type="password"]').first().fill("testing");
await page.getByRole("button", { name: /^Sign in$/i }).click();
await page.waitForLoadState("networkidle");

const tenantId = "tenant-nippon01";
await page.goto(`http://127.0.0.1:3000/platform-admin/tenant-login?tenantId=${tenantId}`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: /^Login$/ }).click();
await page.waitForURL(`**/platform-admin/tenant/${tenantId}/dashboard`, { timeout: 8000 }).catch(() => {});

await page.goto(`http://127.0.0.1:3000/platform-admin/tenant/${tenantId}/lr-config`);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(700);

const body = ((await page.locator("main").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
console.log("BODY:", body.slice(0, 600));
console.log("Has 'Tenant / Company Level':", body.includes("Tenant / Company Level"));
console.log("Has 'Tenant only':", body.includes("Tenant only"));
console.log("Has 'Central':", body.includes("Central"));

await page.screenshot({ path: OUT, fullPage: true });
console.log("SCREENSHOT:", OUT);

await browser.close();
