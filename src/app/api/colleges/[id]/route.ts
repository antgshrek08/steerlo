import { NextResponse } from "next/server";
import { collegesById, getValidatedColleges } from "@/lib/colleges";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    getValidatedColleges();
  } catch {
    return NextResponse.json({ error: "Invalid college data schema." }, { status: 500 });
  }

  const { id } = await params;
  const college = collegesById[id];

  if (!college) {
    return NextResponse.json({ error: "College not found." }, { status: 404 });
  }

  return NextResponse.json(college);
}