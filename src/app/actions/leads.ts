"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

const leadSchema = z.object({
  type: z.enum(["SALE", "RENTAL", "CONTACT", "TRADE_IN"]).default("CONTACT"),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  locale: z.string().trim().max(5).default("fr"),
  vehicleId: z.string().trim().max(40).optional().nullable(),
  rentalDuration: z.number().int().positive().max(120).optional().nullable(),
  rentalMileage: z.number().int().positive().max(200000).optional().nullable(),
  // The quote the visitor configured. Bounded like everything else: these
  // arrive from the page, so they are input, not facts.
  financeFormula: z.enum(["LLD", "LOA"]).optional().nullable(),
  downPayment: z.number().int().min(0).max(100000000).optional().nullable(),
  quotedMonthly: z.number().int().min(0).max(1000000).optional().nullable(),
  purchaseOption: z.number().int().min(0).max(100000000).optional().nullable(),
  forBusiness: z.boolean().default(false),
});

export type LeadFormState = { status: "idle" | "success" | "error"; message?: string };

function optional(value: FormDataEntryValue | null): string | null {
  const s = value === null ? "" : String(value).trim();
  return s === "" ? null : s;
}

function optionalInt(value: FormDataEntryValue | null): number | null {
  const s = optional(value);
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Public enquiry submission (vehicle page, rental page, contact page). */
export async function submitLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    type: optional(formData.get("type")) ?? "CONTACT",
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: optional(formData.get("phone")),
    company: optional(formData.get("company")),
    message: optional(formData.get("message")),
    locale: optional(formData.get("locale")) ?? "fr",
    vehicleId: optional(formData.get("vehicleId")),
    rentalDuration: optionalInt(formData.get("rentalDuration")),
    rentalMileage: optionalInt(formData.get("rentalMileage")),
    financeFormula: optional(formData.get("financeFormula")),
    downPayment: optionalInt(formData.get("downPayment")),
    quotedMonthly: optionalInt(formData.get("quotedMonthly")),
    purchaseOption: optionalInt(formData.get("purchaseOption")),
    forBusiness: formData.get("forBusiness") === "1",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const data = parsed.data;

  try {
    // Round-robin the lead onto an active sales advisor so nothing is orphaned.
    const advisor = await prisma.user.findFirst({
      where: { active: true, role: { in: ["SALES", "MANAGER"] } },
      orderBy: { leads: { _count: "asc" } },
      select: { id: true },
    });

    const lead = await prisma.lead.create({
      data: {
        type: data.type,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        company: data.company,
        message: data.message,
        locale: data.locale,
        vehicleId: data.vehicleId,
        rentalDuration: data.rentalDuration,
        rentalMileage: data.rentalMileage,
        // Only LLD and LOA exist; anything else is a stale or forged field.
        financeFormula: data.financeFormula === "LLD" || data.financeFormula === "LOA" ? data.financeFormula : null,
        downPayment: data.downPayment,
        quotedMonthly: data.quotedMonthly,
        purchaseOption: data.purchaseOption,
        forBusiness: data.forBusiness,
        assignedToId: advisor?.id ?? null,
      },
    });

    await logActivity(null, "lead.created", "Lead", lead.id, `${data.firstName} ${data.lastName} — ${data.type}`);
    return { status: "success" };
  } catch {
    return { status: "error", message: "server" };
  }
}

/* ───────────────── Back-office lead mutations ───────────────── */

export async function updateLead(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user?.role, "lead.update")) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const status = optional(formData.get("status"));
  const assignedToId = optional(formData.get("assignedToId"));
  const notes = optional(formData.get("notes"));

  await prisma.lead.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      assignedToId,
      notes,
    },
  });

  await logActivity(user!.id, "lead.updated", "Lead", id, status ?? undefined);
  revalidatePath("/[locale]/admin/leads", "page");
}

export async function deleteLead(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user?.role, "lead.delete")) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.lead.delete({ where: { id } });
  await logActivity(user!.id, "lead.deleted", "Lead", id);
  revalidatePath("/[locale]/admin/leads", "page");
}
