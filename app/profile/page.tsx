import Header from "@/components/Header";
import ProfilePanel from "@/components/ProfilePanel";
import SiteFooter from "@/components/SiteFooter";

export default function ProfilePage() {
  return (
    <main className="page-shell">
      <Header />
      <div className="admin-wrap">
        <p className="eyebrow">OneTap Atelier</p>
        <h1 className="admin-title">Your profile</h1>
        <ProfilePanel />
      </div>
      <SiteFooter />
    </main>
  );
}
