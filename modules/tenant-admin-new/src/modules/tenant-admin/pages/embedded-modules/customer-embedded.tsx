import { CustomerDashboardShell } from "@customer/app/CustomerBrdDashboard";
import { CustomerDataBridgeProvider } from "@customer/integration/customer-data-bridge";
import { useCustomerTenantDataBridge } from "@/modules/tenant-admin/integration/customer-bridge-adapter";

export function CustomerEmbeddedApp() {
  const bridge = useCustomerTenantDataBridge();
  const content = <CustomerDashboardShell embedded />;
  return bridge ? <CustomerDataBridgeProvider value={bridge}>{content}</CustomerDataBridgeProvider> : content;
}
