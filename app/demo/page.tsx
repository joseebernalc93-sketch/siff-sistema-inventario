import { redirect } from "next/navigation";

export default function DemoPage() {
  redirect("/?section=information");
}
