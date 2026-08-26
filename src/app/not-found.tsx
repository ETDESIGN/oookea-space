import Link from "next/link";
import { StudioIllustration } from "@/components/studio/illustrations";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="studio-noise flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <StudioIllustration variant="404" />
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Lost in the studio
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This page doesn&apos;t exist — or it moved somewhere we can&apos;t find.
          Let&apos;s get you back to the work.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button className="bg-primary text-white hover:bg-primary/90">Back to dashboard</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">View projects</Button>
        </Link>
      </div>
    </div>
  );
}
