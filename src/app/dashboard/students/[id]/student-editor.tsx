"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, KeyRoundIcon, Loader2Icon, QrCodeIcon, Trash2Icon, UserXIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NativeSelect } from "@/components/common/native-select";
import { createClient } from "@/lib/supabase/client";
import {
  createPortalAccounts,
  deleteStudent,
  regenerateQr,
  resetPortalPassword,
  setStudentPhoto,
  updateStudent,
} from "@/features/students/actions";
import type { Gender } from "@/lib/types";

interface Props {
  student: {
    id: string;
    roll_no: string;
    full_name: string;
    father_name: string | null;
    gender: Gender | null;
    cnic: string | null;
    phone: string | null;
    status: string;
    remarks: string | null;
    has_account: boolean;
  };
}

/** Crop to the card's photo ratio (5:6) and shrink to ≤ 600 px wide JPEG. */
async function preparePhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const ratio = 5 / 6;
  let sw = bmp.width, sh = bmp.height;
  if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
  const sx = (bmp.width - sw) / 2, sy = (bmp.height - sh) / 2;
  const w = Math.min(600, Math.round(sw)), h = Math.round(w / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85));
}

export function StudentEditor({ student }: Props) {
  const router = useRouter();
  const [state, action, saving] = useActionState(updateStudent.bind(null, student.id), undefined);
  const [busy, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) { toast.success(state.ok); router.refresh(); }
    else if (state?.error) toast.error(state.error);
  }, [state, router]);

  async function onPhoto(file: File) {
    setUploading(true);
    try {
      const blob = await preparePhoto(file);
      const path = `${student.id}/${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("student-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const res = await setStudentPhoto(student.id, path);
      if (res.error) throw new Error(res.error);
      toast.success("Photo updated.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const act = (fn: () => Promise<{ error?: string; ok?: string }>, okMsg?: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else { toast.success(r.ok ?? okMsg ?? "Done."); router.refresh(); }
    });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">Profile</h2>
        </div>
        <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" defaultValue={student.full_name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="father_name">Father name</Label>
            <Input id="father_name" name="father_name" defaultValue={student.father_name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <NativeSelect id="gender" name="gender" defaultValue={student.gender ?? ""}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnic">CNIC / B-Form</Label>
            <Input id="cnic" name="cnic" defaultValue={student.cnic ?? ""} placeholder="17301-1234567-1" inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={student.phone ?? ""} inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <NativeSelect id="status" name="status" defaultValue={student.status}>
              <option value="active">Active</option>
              <option value="inactive">Inactive (left / struck off)</option>
              <option value="graduated">Graduated</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" defaultValue={student.remarks ?? ""} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">Photo, card &amp; portal</h2>
        </div>
        <div className="divide-y">
          <Row title="Photo" text="Used on the ID card. Without one, a male/female avatar is shown.">
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2Icon className="animate-spin" /> : <CameraIcon />} Upload
            </Button>
            <Button variant="ghost" size="icon" aria-label="Remove photo" onClick={() => act(() => setStudentPhoto(student.id, null), "Photo removed.")} disabled={busy}>
              <Trash2Icon />
            </Button>
          </Row>

          <Row
            title="Student portal"
            text={
              student.has_account
                ? `Signs in with ${student.roll_no}.`
                : student.cnic
                  ? "No account yet. The first password will be the last 6 digits of the CNIC."
                  : "Add the CNIC above to create a portal account."
            }
          >
            {student.has_account ? (
              <Button variant="outline" onClick={() => act(() => resetPortalPassword(student.id))} disabled={busy}>
                <KeyRoundIcon /> Reset password
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={busy || !student.cnic}
                onClick={() =>
                  act(async () => {
                    const r = await createPortalAccounts([student.id]);
                    return r.error ? r : r.created ? { ok: "Portal account created." } : { error: r.failed[0]?.reason ?? "Not created." };
                  })
                }
              >
                <KeyRoundIcon /> Create account
              </Button>
            )}
          </Row>

          <Row title="Lost card?" text="Issue a new QR code. The old card will stop working for attendance immediately.">
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" disabled={busy} />}>
                <QrCodeIcon /> New QR code
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Issue a new QR code?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {student.full_name}’s current card will stop working. Print and hand out the new card afterwards.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => act(() => regenerateQr(student.id), "New QR code issued.")}>Issue new code</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Row>
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-card">
        <Row
          title="Delete student"
          text="Permanently removes this student, all their attendance records, photo and portal login. This cannot be undone."
        >
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" disabled={busy} />}>
              <UserXIcon /> Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {student.full_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {student.roll_no} and all of their attendance records will be permanently deleted. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    start(async () => {
                      const r = await deleteStudent(student.id);
                      if (r.error) return void toast.error(r.error);
                      toast.success(`${student.full_name} deleted.`);
                      router.replace("/dashboard/students");
                    })
                  }
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </section>
    </div>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
}
