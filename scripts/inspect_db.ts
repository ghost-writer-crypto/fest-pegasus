import { createClient } from "@supabase/supabase-js";

async function inspect() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  const { data: divisions, error: divErr } = await supabase.from("divisions").select("*");
  console.log("Divisions in DB:", divisions?.length, divisions?.map((d: any) => d.code));
  const { data: teams, error: teamErr } = await supabase.from("teams").select("*");
  console.log("Teams in DB:", teams?.length, teams?.map((t: any) => t.code));
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  console.log("Profiles in DB:", profiles?.length, profiles?.map((p: any) => ({ name: p.full_name, role: p.role })));
  const { data: participants, error: partErr } = await supabase.from("participants").select("id, name, public_id, chest_number").limit(5);
  console.log("Sample Participants:", participants);
  console.log("Inspection completed successfully.");
  process.exit(0);
}


inspect().catch((err) => {
  console.error("Inspection error:", err);
  process.exit(1);
});

