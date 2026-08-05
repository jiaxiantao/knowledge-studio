import { SiteShell } from "@/components/site-shell";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteShell>
      <div className="min-h-screen text-foreground">{children}</div>
    </SiteShell>
  );
}
