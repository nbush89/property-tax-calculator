import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const titleMap: Record<string, string> = {
    "why-nj-property-taxes-are-so-high":
      "Why New Jersey Property Taxes Are So High",
    "nj-property-tax-exemptions":
      "New Jersey Property Tax Exemptions Explained",
  };

  const title =
    titleMap[slug] || "Property Tax Guide | Property Tax Calculator";

  return buildMetadata({
    title,
    description:
      "Learn how property taxes are calculated, why rates vary, and how exemptions and appeals work.",
    path: `/blog/${slug}`,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  // Blog post content would go here
  return (
    <div>
      <h1>Blog Post: {slug}</h1>
      <p>Content coming soon...</p>
    </div>
  );
}