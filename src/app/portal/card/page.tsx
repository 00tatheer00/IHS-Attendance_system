import type { Metadata } from "next";
import { getPortalStudent } from "@/lib/portal";
import { toCardStudents } from "@/lib/students";
import { IdCardViewer } from "@/components/id-card/id-card-viewer";

export const metadata: Metadata = { title: "My ID card" };

export default async function PortalCard() {
  const { supabase, student } = await getPortalStudent();
  const [card] = await toCardStudents(supabase, [student]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My ID card</h1>
        <p className="text-sm text-muted-foreground">Show the QR code on the back to your teacher’s camera to mark attendance.</p>
      </div>
      <IdCardViewer student={card!} scale={0.9} className="py-2" />
      <p className="text-center text-xs text-muted-foreground">
        Lost your card? Tell your teacher — they can issue a new QR code and the old one will stop working.
      </p>
    </div>
  );
}
