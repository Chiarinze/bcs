import type { Metadata } from "next";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;
  return <UnsubscribeClient token={token} />;
}
