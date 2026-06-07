import Header from "@/components/Header";
import ProfilePanel from "@/components/ProfilePanel";

export default function ProfilePage() {
  return (
    <main>
      <Header />
      <div className="admin-wrap">
        <p className="eyebrow">OneTap Atelier</p>
        <h1 className="admin-title">Your profile</h1>
        <ProfilePanel />
      </div>
    </main>
  );
}
