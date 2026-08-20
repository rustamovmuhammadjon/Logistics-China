import { prisma } from "@/lib/prisma";
import { getViewerSession } from "@/lib/auth";

/**
 * Loads the full User row for the current viewer session. Not used by
 * middleware (which only needs to verify the session JWT) — this hits the
 * database, so it's for Server Components / Server Actions only.
 */
export async function getCurrentUser() {
  const session = await getViewerSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireConsignee() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CONSIGNEE") {
    throw new Error("Not authorized");
  }
  return user;
}

export async function requireOperator() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OPERATOR") {
    throw new Error("Not authorized");
  }
  return user;
}

/** Throws unless this operator is linked to the consignee who owns the given order. */
export async function requireOperatorLinkedTo(operatorId: string, ownerId: string | null) {
  if (!ownerId) {
    throw new Error("Not authorized");
  }
  const link = await prisma.operatorLink.findUnique({
    where: { consigneeId_operatorId: { consigneeId: ownerId, operatorId } },
  });
  if (!link) {
    throw new Error("Not authorized");
  }
}

function generateCandidateCode() {
  // 8 digits, first digit non-zero so it always reads as 8 characters.
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export async function generateUniqueLinkCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCandidateCode();
    const existing = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique link code, please try again");
}
