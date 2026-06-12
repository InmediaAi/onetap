import Header from "@/components/Header";
import ClosetGallery from "@/components/ClosetGallery";

export default function ClosetPage() {
  return (
    <main>
      <Header />
      <div className="admin-wrap">
        <p className="eyebrow">OneTap Atelier</p>
        <h1 className="admin-title">Your closet</h1>
        <p className="admin-hint" style={{ marginBottom: 24 }}>
          Every look and video you’ve created — newest first.
        </p>
        <ClosetGallery />
      </div>
    </main>
  );
}
