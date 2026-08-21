import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Truck media is admin-only (checked again in createMediaAction);
        // profile photos are for any signed-in account. Either is enough to
        // get an upload token — the follow-up DB write is what's scoped.
        const authed = (await isAdminAuthenticated()) || (await getCurrentUser());
        if (!authed) {
          throw new Error("Not authorized");
        }

        return {
          allowedContentTypes: ["image/*", "video/*"],
          addRandomSuffix: true,
          maximumSizeInBytes: 300 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // Intentionally a no-op: this webhook only fires when Blob can reach
        // back over a public URL (not on localhost). The Media row is created
        // by a server action called from the client right after upload()
        // resolves, so it works in both local dev and production.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
