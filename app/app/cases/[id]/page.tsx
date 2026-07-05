import { CaseMemoryClient } from "./CaseMemoryClient";

export default async function CaseMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CaseMemoryClient caseId={id} />;
}
