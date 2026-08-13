import { Portal, type View } from "../portal";

const routes: Record<string, View> = {
  login: "login", dashboard: "dashboard", "permission-reports/new": "new", "permission-reports": "reports",
  notifications: "notifications", management: "management", "management/review-queue": "queue",
  "management/no-evidence": "no-evidence", "management/permission-reports": "all", "management/staff": "staff",
  "management/reconciliation": "reconciliation",
  "management/analytics": "analytics", "management/audit-logs": "audit", "management/settings": "settings",
};

export default async function RoutedPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  const view: View = routes[path] ?? (path.startsWith("permission-reports/") ? "detail" : path.startsWith("management/staff/") ? "staff-profile" : path.startsWith("management/reconciliation/imports/") ? "reconciliation-import" : path.startsWith("management/reconciliation/usage/") ? "reconciliation-usage" : "dashboard");
  return <Portal view={view}/>;
}
