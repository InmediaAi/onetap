import Header from "@/components/Header";
import ClosetGallery from "@/components/ClosetGallery";
import SiteFooter from "@/components/SiteFooter";

export default function ClosetPage() {
  return (
    <main className="closet-page">
      <Header />
      <div className="closet-shell">
        <header className="closet-head">
          <p className="eyebrow">OneTap Atelier</p>
          <h1 className="admin-title">Your closet</h1>
          <p className="admin-hint">Every look and video you’ve created — newest first.</p>
        </header>
        <ClosetGallery />
      </div>
      <SiteFooter />
    </main>
  );
}
