import "server-only";
import { cookies } from "next/headers";
import type { DB, Person } from "./types";

// Prototyp ohne Authentifizierung: Die handelnde Person wird per Cookie gewählt
// und in jedem Beleg-Eintrag festgehalten.
export const USER_COOKIE = "ct_user";

export async function currentUser(db: DB): Promise<Person> {
  const id = (await cookies()).get(USER_COOKIE)?.value;
  return db.people.find((p) => p.id === id) ?? db.people[0];
}
