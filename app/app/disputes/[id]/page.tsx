import { DisputeCourtroomClient } from "./DisputeCourtroomClient";

export default async function DisputeCourtroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DisputeCourtroomClient disputeId={id} />;
}
