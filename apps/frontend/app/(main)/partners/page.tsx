import { redirect } from "next/navigation";

// Partner company moved into Profile; old links land there.
export default function PartnersPage() {
  redirect("/profile?tab=partners");
}
