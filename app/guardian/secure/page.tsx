import { redirect } from "next/navigation";

export default function SecureGuardianRedirect() {
  redirect("/guardian");
}
