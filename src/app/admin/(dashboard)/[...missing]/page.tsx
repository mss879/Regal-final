import { notFound } from "next/navigation";

// Unknown /admin/* URLs get the admin's own 404 (inside the admin shell), not the public one.
export default function AdminMissing() {
  notFound();
}
