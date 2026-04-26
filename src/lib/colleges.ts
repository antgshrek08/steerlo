export type College = {
  id: string;
  name: string;
  logo: string;
  avgGPA: number;
  avgSAT: number;
  acceptanceRate: number;
};

export const colleges: College[] = [
  {
    id: "florida-state-university",
    name: "Florida State University",
    logo: "/fsu-logo.png",
    avgGPA: 4.2,
    avgSAT: 1330,
    acceptanceRate: 0.25
  },
  {
    id: "university-of-florida",
    name: "University of Florida",
    logo: "/uf-logo.png",
    avgGPA: 4.4,
    avgSAT: 1410,
    acceptanceRate: 0.23
  },
  {
    id: "university-of-central-florida",
    name: "University of Central Florida",
    logo: "/ucf-logo.png",
    avgGPA: 4.1,
    avgSAT: 1285,
    acceptanceRate: 0.43
  },
  {
    id: "university-of-south-florida",
    name: "University of South Florida",
    logo: "/usf-logo.png",
    avgGPA: 4.1,
    avgSAT: 1290,
    acceptanceRate: 0.44
  },
  {
    id: "university-of-miami",
    name: "University of Miami",
    logo: "/um-logo.png",
    avgGPA: 4.3,
    avgSAT: 1390,
    acceptanceRate: 0.19
  },
  {
    id: "university-of-west-florida",
    name: "University of West Florida",
    logo: "/uwf-logo.png",
    avgGPA: 3.8,
    avgSAT: 1170,
    acceptanceRate: 0.58
  },
  {
    id: "florida-international-university",
    name: "Florida International University",
    logo: "/fiu-logo.png",
    avgGPA: 4,
    avgSAT: 1220,
    acceptanceRate: 0.59
  },
  {
    id: "florida-atlantic-university",
    name: "Florida Atlantic University",
    logo: "/fau-logo.png",
    avgGPA: 3.9,
    avgSAT: 1175,
    acceptanceRate: 0.73
  },
  {
    id: "the-university-of-tampa",
    name: "The University of Tampa",
    logo: "/ut-logo.png",
    avgGPA: 4,
    avgSAT: 1240,
    acceptanceRate: 0.26
  },
  {
    id: "university-of-north-florida",
    name: "University of North Florida",
    logo: "/unf-logo.png",
    avgGPA: 4,
    avgSAT: 1225,
    acceptanceRate: 0.74
  },
  {
    id: "florida-gulf-coast-university",
    name: "Florida Gulf Coast University",
    logo: "/fgcu-logo.png",
    avgGPA: 3.9,
    avgSAT: 1195,
    acceptanceRate: 0.77
  },
  {
    id: "florida-am-university",
    name: "Florida A&M University",
    logo: "/famu-logo.png",
    avgGPA: 3.7,
    avgSAT: 1110,
    acceptanceRate: 0.34
  },
  {
    id: "bethune-cookman-university",
    name: "Bethune-Cookman University",
    logo: "/bcu-logo.png",
    avgGPA: 3.2,
    avgSAT: 980,
    acceptanceRate: 0.68
  },
  {
    id: "florida-institute-of-technology",
    name: "Florida Institute of Technology",
    logo: "/fit-logo.png",
    avgGPA: 3.9,
    avgSAT: 1245,
    acceptanceRate: 0.63
  },
  {
    id: "embry-riddle-aeronautical-university",
    name: "Embry-Riddle Aeronautical University",
    logo: "/erau-logo.png",
    avgGPA: 3.9,
    avgSAT: 1280,
    acceptanceRate: 0.66
  },
  {
    id: "flagler-college",
    name: "Flagler College",
    logo: "/fc-logo.png",
    avgGPA: 3.7,
    avgSAT: 1180,
    acceptanceRate: 0.59
  }
];

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidCollegeShape(value: unknown): value is College {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.logo === "string" &&
    candidate.logo.trim().length > 0 &&
    isFiniteNumber(candidate.avgGPA) &&
    isFiniteNumber(candidate.avgSAT) &&
    isFiniteNumber(candidate.acceptanceRate)
  );
}

export function validateCollegesData(data: unknown): data is College[] {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((college) => isValidCollegeShape(college));
}

export function getValidatedColleges() {
  if (!validateCollegesData(colleges)) {
    throw new Error("College data schema validation failed.");
  }

  return colleges;
}

export const collegesById = Object.fromEntries(colleges.map((college) => [college.id, college]));

// Backwards-compatible alias for legacy callers.
export const collegesBySlug = collegesById;