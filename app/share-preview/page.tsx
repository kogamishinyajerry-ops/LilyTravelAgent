import { SharePreviewCard } from "@/components/share-preview-card";

type SharePreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SharePreviewPage({ searchParams }: SharePreviewPageProps) {
  return <SharePreviewCard searchParams={await searchParams} />;
}
