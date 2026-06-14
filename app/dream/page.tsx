import { DreamRoadbook } from "@/components/dream-roadbook";

type DreamPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DreamPage({ searchParams }: DreamPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialDemo = readParam(params.demo);
  const initialLens = readParam(params.lens);
  const candidate = readParam(params.candidate);
  const initialCandidate = candidate
    ? {
        rank: readParam(params.candidateRank),
        day: readParam(params.candidateDay),
        label: readParam(params.candidateLabel),
        detail: readParam(params.candidateDetail),
        returnHref: "/api/recording-assets/lens-comparison",
      }
    : undefined;

  return <DreamRoadbook initialDemo={initialDemo} initialLens={initialLens} initialCandidate={initialCandidate} />;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
