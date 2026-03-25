import type { RawGrant } from "../sources";
import knownGrants from "@/data/known-grants.json";

export async function fetchStaticGrants(): Promise<RawGrant[]> {
  const now = new Date();

  return (knownGrants as RawGrant[]).filter((grant) => {
    // Include grants with no deadline or whose deadline hasn't passed
    if (!grant.deadline) return true;
    return new Date(grant.deadline) >= now;
  });
}
