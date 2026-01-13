export async function generateStaticParams() {
  return [];
}

export default function AssignmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
