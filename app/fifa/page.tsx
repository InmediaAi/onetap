import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { getCampaign } from "@/lib/campaign/getCampaign";
import ViralFan from "@/components/campaign/ViralFan";
import "./fifa.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Viral Fan — your jersey, your stadium moment",
  description:
    "Create a viral fan video of yourself — your jersey, your face, on the stadium big screen. Preview free.",
};

/** Standalone FIFA "Viral Fan" microsite — no global app header/footer. */
export default async function FifaCampaignPage() {
  const campaign = await getCampaign("fifa-worldcup");
  return (
    <div className={`viralfan ${newsreader.variable}`}>
      <ViralFan campaign={campaign} />
    </div>
  );
}
