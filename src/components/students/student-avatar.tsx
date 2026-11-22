import { cn } from "@/lib/utils";
import type { Gender } from "@/lib/types";

export function avatarFor(gender: Gender | null | undefined) {
  return gender === "male" ? "/avatars/male.svg" : gender === "female" ? "/avatars/female.svg" : "/avatars/neutral.svg";
}

/** Student photo if available, otherwise a gender avatar. */
export function StudentAvatar({
  photoUrl,
  gender,
  name,
  className,
}: {
  photoUrl?: string | null;
  gender: Gender | null | undefined;
  name: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs + SVGs; next/image adds nothing here
    <img
      src={photoUrl || avatarFor(gender)}
      alt={name}
      className={cn("size-9 shrink-0 rounded-full bg-brand-soft object-cover", className)}
      loading="lazy"
    />
  );
}
