import { DreamRoadbook } from "@/components/dream-roadbook";

type DreamPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DreamPage({ searchParams }: DreamPageProps) {
  const params = searchParams ? await searchParams : {};
  const demoParam = params.demo;
  const initialDemo = Array.isArray(demoParam) ? demoParam[0] : demoParam;

  return <DreamRoadbook initialDemo={initialDemo} />;
}
