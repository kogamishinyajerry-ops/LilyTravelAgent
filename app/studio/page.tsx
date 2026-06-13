import { StudioMode } from "@/components/studio-mode";

type StudioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = searchParams ? await searchParams : {};
  const demoParam = params.demo;
  const initialDemo = Array.isArray(demoParam) ? demoParam[0] : demoParam;

  return <StudioMode initialDemo={initialDemo} />;
}
