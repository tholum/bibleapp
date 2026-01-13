import StrongsDetailClient from "./StrongsDetailClient";

export async function generateStaticParams() {
  return [];
}

export default function StrongsDetailPage() {
  return <StrongsDetailClient />;
}
