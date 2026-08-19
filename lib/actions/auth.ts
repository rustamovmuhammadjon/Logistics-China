"use server";

import { redirect } from "next/navigation";
import {
  checkAdminCredentials,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth";

export async function loginAction(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!checkAdminCredentials(username, password)) {
    return { error: "Invalid username or password" };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}
