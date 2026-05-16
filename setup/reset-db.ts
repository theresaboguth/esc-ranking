import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ VITE_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function resetDb() {
  console.log("⏳ Datenbank wird zurückgesetzt...\n");

  const { error: ratingsError } = await supabase
    .from("ratings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (ratingsError) {
    console.error("❌ Fehler beim Löschen der Bewertungen:", ratingsError.message);
    process.exit(1);
  }
  console.log("✅ Alle Bewertungen gelöscht.");

  const { error: usersError } = await supabase
    .from("users")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (usersError) {
    console.error("❌ Fehler beim Löschen der User:", usersError.message);
    process.exit(1);
  }
  console.log("✅ Alle User gelöscht.");

  console.log("\n🏆 Datenbank bereit für das Finale!");
}

resetDb();
