import { AgreementChamberClient } from "./AgreementChamberClient";

export default async function AgreementChamberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgreementChamberClient agreementId={id} />;
}
