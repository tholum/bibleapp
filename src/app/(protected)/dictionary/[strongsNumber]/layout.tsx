export async function generateStaticParams() {
  return [];
}

export default function StrongsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
