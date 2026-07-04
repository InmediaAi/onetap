import Header from "@/components/Header";
import LandingClient from "@/components/LandingClient";
import OccasionEdits from "@/components/home/OccasionEdits";
import HouseEdits from "@/components/home/HouseEdits";
import SiteFooter from "@/components/SiteFooter";
import { getHomeModules } from "@/lib/data/getHomeModules";
import { getHomeOccasionTiles, getHomeHouseTiles } from "@/lib/data/getHomeEditorial";

export const revalidate = 3600; // ISR — refresh the editorial picks hourly.

export default async function HomePage() {
  const [modules, occasionTiles, houseTiles] = await Promise.all([
    getHomeModules(),
    getHomeOccasionTiles(),
    getHomeHouseTiles(),
  ]);

  return (
    <main>
      <Header />
      <LandingClient modules={modules}>
        <OccasionEdits tiles={occasionTiles} />
        <HouseEdits houses={houseTiles} />
      </LandingClient>
      <SiteFooter />
    </main>
  );
}
