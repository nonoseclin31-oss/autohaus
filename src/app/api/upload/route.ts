import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { putObject, looksLikeImage, ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const formData = await request.formData();

  // Anyone signed in may replace their own avatar, whatever their role.
  // Vehicle photos need catalogue permissions.
  const kind = String(formData.get("kind") ?? "vehicle") === "avatar" ? "avatar" : "vehicle";
  if (kind !== "avatar" && !can(user.role, "vehicle.create") && !can(user.role, "vehicle.update.own")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "no-files" }, { status: 400 });
  }

  const uploaded: { url: string; name: string }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      rejected.push({ name: file.name, reason: "type" });
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push({ name: file.name, reason: "size" });
      continue;
    }
    if (!(await looksLikeImage(file))) {
      rejected.push({ name: file.name, reason: "type" });
      continue;
    }

    try {
      const { url } = await putObject(file, kind);
      uploaded.push({ url, name: file.name });
    } catch {
      rejected.push({ name: file.name, reason: "storage" });
    }

    // An avatar is a single image; ignore anything dragged in after the first.
    if (kind === "avatar" && uploaded.length) break;
  }

  return NextResponse.json({ uploaded, rejected });
}
