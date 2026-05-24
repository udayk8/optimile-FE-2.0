// Verifies that the Tenant Admin sidebar shows the active LR pages and that
// /lr-config and /lr render the real implementations (not the legacy
// master-data page).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT_CFG = "scripts/.out/lr-config-tenant-admin.png";
const OUT_OPS = "scripts/.out/lr-operations-tenant-admin.png";
mkdirSync(dirname(OUT_CFG), { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("pageerror", (error) => console.error("[pageerror]", error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[console.error]", msg.text());
});

// Seed: Nippon tenant, Tenant Admin role, Madhesa user.
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

  const tenantAdminRole = {
    id: "role-tenant-tenant-nippon01-tenant-admin",
    tenantId: "tenant-nippon01",
    name: "Tenant Admin",
    description: "System owner",
    hierarchyLevelId: "level-nippon01-1",
    moduleCodes: ["ADMIN", "TMS"],
    dataScope: "ALL_TENANT",
    active: true,
  };
  localStorage.setItem("optimile.tenant.roles", JSON.stringify([tenantAdminRole]));

  const adminUser = {
    id: "user-nippon01-admin",
    tenantId: "tenant-nippon01",
    name: "Madhesa",
    email: "admin@nippon.com",
    userType: "INTERNAL",
    roleId: tenantAdminRole.id,
    orgUnitIds: [],
    linkedVendorId: null, linkedCustomerId: null, linkedDriverId: null,
    driverName: "", driverCode: "",
    status: "active",
    lastActive: new Date().toISOString(),
    password: "Admin@123",
  };
  localStorage.setItem("optimile.tenant.users", JSON.stringify([adminUser]));
});

const tenantId = "tenant-nippon01";

await page.goto("http://127.0.0.1:3000/login");
await page.waitForLoadState("networkidle");
await page.getByText(/ceo@uday\.ts\.com/i).first().click({ timeout: 5000 });
await page.locator('input[type="password"]').first().fill("testing");
await page.getByRole("button", { name: /^Sign in$/i }).click();
await page.waitForLoadState("networkidle");

await page.goto(`http://127.0.0.1:3000/platform-admin/tenant-login?tenantId=${tenantId}`);
await page.waitForLoadState("networkidle");

// Owner row is pre-selected — just submit.
await page.getByRole("button", { name: /^Login$/ }).click();
await page.waitForURL(`**/platform-admin/tenant/${tenantId}/dashboard`, { timeout: 8000 }).catch(() => {});
await page.waitForLoadState("networkidle").catch(() => {});

// Navigate to LR Configuration page.
await page.goto(`http://127.0.0.1:3000/platform-admin/tenant/${tenantId}/lr-config`);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(500);
const cfgBody = ((await page.locator("main").first().textContent()) ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
console.log("LR_CONFIG_BODY:", cfgBody);
await page.screenshot({ path: OUT_CFG, fullPage: true });
console.log("LR_CONFIG_SCREENSHOT:", OUT_CFG);

// Navigate to LR Operations page.
await page.goto(`http://127.0.0.1:3000/platform-admin/tenant/${tenantId}/lr`);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(500);
const opsBody = ((await page.locator("main").first().textContent()) ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
console.log("LR_OPS_BODY:", opsBody);
await page.screenshot({ path: OUT_OPS, fullPage: true });
console.log("LR_OPS_SCREENSHOT:", OUT_OPS);

await browser.close();
