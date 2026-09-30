import { redirect } from "next/navigation";

export default async function MyPegasusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (q) {
    redirect(`/my-result?q=${encodeURIComponent(q)}`);
  }
  redirect("/my-result?q=PGS-0001");
}
