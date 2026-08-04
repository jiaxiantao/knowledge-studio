import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteShell } from "@/components/site-shell";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SiteShell>
        <div className="flex min-h-screen flex-col text-foreground">
          <SiteHeader />
          <div className="flex-1">{children}</div>
        </div>
      </SiteShell>
    </AuthProvider>
  );
}
