import { setRequestLocale } from "next-intl/server";
import ColoringPageGenerator from "@/components/blocks/coloring-page";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale });

  return {
    title: t("coloring_page.title"),
    description: t("coloring_page.description"),
  };
}

export default async function ColoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ColoringPageGenerator />;
}

