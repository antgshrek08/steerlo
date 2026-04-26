import { NextResponse } from "next/server";
import { getValidatedColleges, type College } from "@/lib/colleges";

const collegesCacheTtlMs = 15 * 60 * 1000;

let collegesListCache: {
  data: College[];
  expiresAt: number;
} | null = null;

export async function GET() {
  const now = Date.now();

  if (collegesListCache && collegesListCache.expiresAt > now) {
    return NextResponse.json(collegesListCache.data);
  }

  let listingData: College[];

  try {
    listingData = getValidatedColleges();
  } catch {
    return NextResponse.json({ error: "Invalid college data schema." }, { status: 500 });
  }

  collegesListCache = {
    data: listingData,
    expiresAt: now + collegesCacheTtlMs
  };

  return NextResponse.json(listingData);
}