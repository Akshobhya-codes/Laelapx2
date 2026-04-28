"use server";

import { stackServerApp } from "@/stack";
import { searchAll, type SearchResults } from "@/lib/insforge/search";

/**
 * Live search for the SearchBar dropdown. Auth-required so we don't expose
 * the index to anonymous scrapers.
 */
export async function searchAction(query: string): Promise<SearchResults> {
  const user = await stackServerApp.getUser({ or: "return-null" });
  if (!user) {
    return { startups: [], funds: [], people: [], total: 0 };
  }
  return searchAll(query, 6);
}
