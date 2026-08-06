import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-32 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Kessel Run</h1>
        <p className="max-w-md text-muted-foreground">
          A staged content pipeline, from raw idea to published piece.
        </p>
      </div>
      <Button render={<Link href="/kessel-run">Open Kessel Run</Link>} />
    </main>
  );
}
