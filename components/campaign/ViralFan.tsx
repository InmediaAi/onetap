"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import {
  composeReel,
  VideoLimitError,
  SignInRequiredError,
} from "@/lib/generate";
import { startSubscription } from "@/lib/billing/checkout";
import { hasVideoQuota } from "@/lib/billing/gate";
import { signInWithProvider, signOut, uploadIdentity } from "@/lib/auth/client";
import { validateImageFile, IMAGE_GUIDELINE } from "@/lib/image/validate";
import ResultModal from "@/components/ResultModal";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { getAttribution, setFirstTouch } from "@/lib/analytics/utm";
import { putStash, getStash, clearStash, type CampaignStash } from "@/lib/campaign/stash";
import { FIFA_SHOWCASE } from "@/lib/campaign/showcase";
import type { CampaignSnapshot, CampaignTeam } from "@/lib/campaign/getCampaign";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

type Stage = "form" | "gen" | "result";
interface Result { videoUrl: string; posterUrl?: string; lookId: string }

const WELCOME_FLAG = "vf_welcome"; // sessionStorage: set on OAuth start, read on return

export default function ViralFan({ campaign }: { campaign: CampaignSnapshot | null }) {
  const hydrated = useHydrated();
  const email = useAtelier((s) => s.email);
  const usage = useAtelier((s) => s.usage);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const refreshProfile = useAtelier((s) => s.refreshProfile);

  const teams = campaign?.teams ?? [];
  const moments = campaign?.moments ?? [];
  const showcase = FIFA_SHOWCASE;

  const [country, setCountry] = useState(teams[0]?.country ?? "");
  const [kitIdx, setKitIdx] = useState(0);
  const [bodyImg, setBodyImg] = useState<string | null>(null);
  const [faceImg, setFaceImg] = useState<string | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [momentId, setMomentId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState<CampaignStash | null>(null);
  const [authOpen, setAuthOpen] = useState(false); // sign-up/sign-in popup
  const [welcome, setWelcome] = useState(false); // post-sign-in success popup

  const team: CampaignTeam | undefined = teams.find((t) => t.country === country);
  const jerseys = team?.jerseys ?? [];
  const jersey = jerseys[kitIdx];
  const accent = team?.accent || campaign?.accent || "#1F3A93";
  const moment = moments.find((m) => m.id === momentId) ?? null;
  const photo = bodyImg || faceImg;
  const ready = Boolean(country && photo && moment && jersey);
  // Wait for the profile to load before deciding — otherwise a real member is
  // briefly treated as locked while /api/me resolves.
  const isMember = profileLoaded && usage.status === "active" && Boolean(usage.planId);

  /* ---- persist the uploaded photos to the user's Supabase profile ----
     Runs once the user is authenticated. Best-effort: a storage failure must
     not block the (already cost-incurring) preview generation. */
  // Persist one uploaded photo to the user's profile (full-length → body,
  // face → selfie). Idempotent per kind: skips if the same image was already
  // saved, but re-saves when the photo CHANGES. No-op until signed in.
  const lastPersisted = useRef<{ body: string | null; face: string | null }>({ body: null, face: null });
  const persistImage = useCallback(
    async (kind: "body" | "face", dataUrl: string | null) => {
      if (!dataUrl) return;
      if (!useAtelier.getState().email) return; // needs an authed user (RLS)
      if (lastPersisted.current[kind] === dataUrl) return; // already saved this exact image
      lastPersisted.current[kind] = dataUrl;
      try {
        const path = await uploadIdentity(kind === "face" ? "selfie" : "body", dataUrl);
        if (!path) return;
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kind === "face" ? { selfiePath: path } : { bodyPath: path }),
        });
        await refreshProfile();
      } catch (e) {
        lastPersisted.current[kind] = null; // allow a retry
        track(EVENTS.GENERATION_FAILED, { stage: "persist", message: e instanceof Error ? e.message : "persist failed" });
      }
    },
    [refreshProfile],
  );

  /* ---- core generation ---- */
  const run = useCallback(
    async (opts: { jerseyImage: string; jerseyId: string; prompt: string; imagePrompt?: string; likeness: string }) => {
      setStage("gen");
      setError(null);
      try {
        const res = await composeReel({
          kind: "video",
          likeness: opts.likeness,
          pieceImage: opts.jerseyImage,
          prompt: opts.prompt, // video prompt → Grok
          imagePrompt: opts.imagePrompt, // image prompt → GPT-Image (image step)
          productId: opts.jerseyId,
        });
        setResult({ videoUrl: res.videoUrl, posterUrl: res.posterUrl, lookId: res.lookId });
        setStage("result");
      } catch (e) {
        if (e instanceof SignInRequiredError) {
          setStage("form");
          setAuthOpen(true); // shouldn't usually hit — we gate before run
        } else if (e instanceof VideoLimitError) {
          // Out of free previews → offer membership (the other place the sheet
          // opens is a non-member tapping Download/Share).
          setStage("form");
          setSheet(true);
        } else {
          // Keep the modal open and SHOW the failure (e.g. a provider is named
          // in env but its key is missing → 500) instead of silently closing it.
          setError(e instanceof Error ? e.message : "Generation failed");
          setStage("result");
        }
      }
    },
    [],
  );

  /**
   * Pre-flight: confirm the user still has video quota BEFORE we start
   * generating. Without this, generation begins (composing the free Kling
   * try-on still, showing the progress modal) and only discovers the limit when
   * the metered video step returns 402 — a jarring "it started then vanished".
   * Returns false (and opens the membership sheet) when out of credits.
   */
  async function ensureQuotaOrSubscribe(): Promise<boolean> {
    // Always pull the freshest quota — a credit may have been spent on the last
    // generation (server-side) or on another device, so cached usage can lie.
    await refreshProfile();
    if (!hasVideoQuota(useAtelier.getState().usage)) {
      setSheet(true);
      return false;
    }
    return true;
  }

  /** Begin OAuth from the FIFA popup; flag so we celebrate on return. */
  function startAuth(provider: "google" | "apple") {
    try {
      sessionStorage.setItem(WELCOME_FLAG, "1");
    } catch {
      /* ignore */
    }
    void signInWithProvider(provider, "/fifa");
  }

  async function generate() {
    if (!ready || !jersey || !photo || !moment) return;
    if (!email) {
      // stash selections + photos in IndexedDB to survive the OAuth redirect,
      // then urge sign-up via the popup.
      await putStash({ country, kitIdx, momentId, bodyImg, faceImg });
      setAuthOpen(true);
      return;
    }
    // Out of credits → ask to subscribe FIRST; never start generation.
    if (!(await ensureQuotaOrSubscribe())) return;
    track(EVENTS.GENERATION_STARTED, { kind: "video", productId: jersey.product.id, campaign: campaign?.id });
    void persistImage("body", bodyImg); // save photos to the profile (non-blocking)
    void persistImage("face", faceImg);
    void run({
      jerseyImage: jersey.product.imageUrl,
      jerseyId: jersey.product.id,
      prompt: moment.prompt,
      imagePrompt: moment.imagePrompt ?? undefined,
      likeness: photo,
    });
  }

  /* ---- attribute every /fifa visit to the campaign (first-touch sticky) ---- */
  useEffect(() => {
    if (!getAttribution()?.utm_campaign) {
      setFirstTouch({ utm_campaign: "fifa-worldcup", utm_source: "fifa", utm_medium: "site" });
    }
  }, []);

  /* ---- resume after OAuth — load the IndexedDB stash once, restore selections.
     `resumeChecked` flips once we know the resume state (with or without a stash),
     so the welcome popup can decide whether a generation is pending. ---- */
  const resumeLoaded = useRef(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (resumeLoaded.current) return;
    resumeLoaded.current = true;
    void (async () => {
      const saved = await getStash();
      if (saved) {
        setResume(saved);
        if (saved.country) setCountry(saved.country);
        setKitIdx(saved.kitIdx ?? 0);
        setMomentId(saved.momentId ?? null);
        if (saved.bodyImg) setBodyImg(saved.bodyImg);
        if (saved.faceImg) setFaceImg(saved.faceImg);
      }
      setResumeChecked(true);
    })();
  }, []);

  /* ---- "registration successful" delight: show once after a sign-in WE started
     (the vf_welcome flag), as soon as the session + resume state are known. ---- */
  const cameFromAuth = useRef(false);
  const welcomed = useRef(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_FLAG)) {
        cameFromAuth.current = true;
        sessionStorage.removeItem(WELCOME_FLAG);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (welcomed.current || !email || !cameFromAuth.current || !resumeChecked) return;
    welcomed.current = true;
    setAuthOpen(false);
    setWelcome(true);
  }, [email, resumeChecked]);

  /* ---- the deferred generation kickoff, owned by the welcome popup ---- */
  const resumeFired = useRef(false);
  const runResume = useCallback(async () => {
    if (resumeFired.current || !resume || !email) return;
    const likeness = resume.bodyImg || resume.faceImg;
    if (!likeness || !resume.momentId) return;
    const t = teams.find((x) => x.country === resume.country);
    const j = t?.jerseys[resume.kitIdx ?? 0];
    const m = moments.find((x) => x.id === resume.momentId);
    if (!j || !m) return;
    resumeFired.current = true;
    void clearStash();
    void persistImage("body", resume.bodyImg);
    void persistImage("face", resume.faceImg);
    if (!(await ensureQuotaOrSubscribe())) return;
    void run({ jerseyImage: j.product.imageUrl, jerseyId: j.product.id, prompt: m.prompt, imagePrompt: m.imagePrompt ?? undefined, likeness });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, email, teams, moments, run, persistImage]);

  /** Whether the welcome popup has a generation to auto-continue into. */
  const pendingGen = Boolean(
    resume &&
      (resume.bodyImg || resume.faceImg) &&
      resume.momentId &&
      teams.find((x) => x.country === resume.country)?.jerseys[resume.kitIdx ?? 0] &&
      moments.find((x) => x.id === resume.momentId),
  );

  function proceedWelcome() {
    setWelcome(false);
    if (pendingGen) void runResume();
    else document.getElementById("creator")?.scrollIntoView({ behavior: "smooth" });
  }

  // Auto-continue to generation a beat after the delight shows.
  useEffect(() => {
    if (!welcome || !pendingGen) return;
    const t = setTimeout(() => {
      setWelcome(false);
      void runResume();
    }, 2200);
    return () => clearTimeout(t);
  }, [welcome, pendingGen, runResume]);

  async function pick(kind: "body" | "face", file?: File) {
    if (!file) return;
    const check = await validateImageFile(file);
    if (!check.ok) {
      setUpErr(check.error ?? "That image can’t be used.");
      return;
    }
    setUpErr(null);
    const url = await readAsDataURL(file);
    if (kind === "body") setBodyImg(url);
    else setFaceImg(url);
    void persistImage(kind, url); // save/update on the profile right away (if signed in)
  }

  async function beginMembership() {
    setBusy(true);
    try {
      await startSubscription("fan");
      await refreshProfile(); // pick up the active subscription so Download/Share unlock
      setSheet(false);
    } catch {
      /* checkout closed */
    } finally {
      setBusy(false);
    }
  }

  const filtered = teams.filter(
    (t) => !query.trim() || t.country.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <div className="logo">
            <span className="mark serif">Viral Fan</span>
            <span className="tag">by OneTap</span>
          </div>
          <nav className="nav-links">
            <a className="link" href="#how">How it works</a>
            <a className="link" href="#faq">Good to know</a>
            {hydrated && !email && (
              <button className="vf-signin" onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
            )}
            {hydrated && email && (
              <>
                <a className="vf-navlink" href="/profile">Profile</a>
                <a className="vf-navlink" href="/closet">My Closet</a>
                <button
                  className="vf-signin"
                  title={email}
                  onClick={async () => { await signOut(); await refreshProfile(); }}
                >
                  Sign out
                </button>
              </>
            )}
            <a className="btn" href="#creator">Make my fan video</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="label"><span className="dot" />Tournament summer · 11 June – 19 July</span>
            <h1 className="serif">Be the fan the whole stadium <em>watches</em></h1>
            <p className="lede">
              Create a viral fan video of yourself — <strong>your jersey, your face, on the stadium big
              screen</strong> — from one photo, in under a minute.
            </p>
            <p className="lede" style={{ marginTop: 12, fontSize: 15 }}>Preview free. Keep it with membership.</p>
            <div className="proofline">
              <span><b />One photo is enough</span>
              <span><b />Ready in under a minute</span>
              <span><b />Vertical, feed-ready</span>
            </div>

            {showcase.length > 0 && (
              <div className="tia">
                <span className="tia-eyebrow serif">Try-on in Action</span>
                <div className="tia-rail" aria-label="Viral fan videos made on OneTap">
                  {/* duplicated track for a seamless slow auto-scroll */}
                  <div className="tia-track">
                    {[...showcase, ...showcase].map((s, i) => {
                      const dup = i >= showcase.length;
                      const card = (
                        <span className="tia-poster">
                          <video src={s.videoUrl} poster={s.poster} autoPlay loop muted playsInline preload="metadata" />
                          {(s.caption || s.views) && (
                            <span className="tia-meta">
                              {s.caption && <span className="tia-caption">{s.caption}</span>}
                              {s.views && <span className="tia-views">{s.views}</span>}
                            </span>
                          )}
                        </span>
                      );
                      return s.href ? (
                        <a key={i} className="tia-card" href={s.href} aria-hidden={dup} tabIndex={dup ? -1 : 0}>
                          {card}
                        </a>
                      ) : (
                        <span key={i} className="tia-card" aria-hidden={dup}>
                          {card}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="creator" id="creator">
            {/* The funnel form — also the backdrop while the modal generates/shows result. */}
            {(
              <>
                <div className="c-head">
                  <span className="t serif">Make yours</span>
                  <span className="steps-ind">
                    <i className={country ? "on" : ""} />
                    <i className={photo ? "on" : ""} />
                    <i className={moment ? "on" : ""} />
                  </span>
                </div>
                <div className="c-body">
                  {/* nation */}
                  <div className="field">
                    <div className="f-label">
                      <span><span className="stepno serif">i.</span>Your jersey</span>
                      <span className="ok">{country}</span>
                    </div>
                    <div className="csearch">
                      <div className="cs-box" onClick={() => setSearchOpen(true)}>
                        <span className="sw" style={{ background: accent }} />
                        <input
                          value={searchOpen ? query : country}
                          placeholder="Search your nation"
                          onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                          onFocus={() => { setSearchOpen(true); setQuery(""); }}
                          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                        />
                        <span className="cs-caret">▾</span>
                      </div>
                      {searchOpen && (
                        <div className="cs-list">
                          {filtered.map((t) => (
                            <div
                              key={t.country}
                              className="cs-item"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCountry(t.country);
                                setKitIdx(0);
                                setSearchOpen(false);
                                setResult(null);
                              }}
                            >
                              <span className="sw" style={{ background: t.accent || "#999" }} />
                              <span>{t.flag} {t.country}</span>
                            </div>
                          ))}
                          {filtered.length === 0 && (
                            <div className="cs-item">No nation by that name.</div>
                          )}
                        </div>
                      )}
                    </div>
                    {jerseys.length > 0 && (
                      <div className="jersey-opts">
                        {jerseys.map((j, i) => (
                          <button
                            key={j.kit + i}
                            type="button"
                            className={"jersey-opt" + (i === kitIdx ? " sel" : "")}
                            onClick={() => { setKitIdx(i); setResult(null); }}
                          >
                            <span className="jo-img">
                              {j.product.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={j.product.imageUrl} alt={j.kit} />
                              )}
                            </span>
                            <span className="k">{j.kit}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {team && jerseys.length === 0 && (
                      <p className="up-err">Jersey for {country} is coming soon — try another nation.</p>
                    )}
                  </div>

                  {/* photos */}
                  <div className="field">
                    <div className="f-label">
                      <span><span className="stepno serif">ii.</span>Your photos</span>
                      <span className="ok">{(bodyImg ? 1 : 0) + (faceImg ? 1 : 0) ? `${(bodyImg ? 1 : 0) + (faceImg ? 1 : 0)} of 2` : ""}</span>
                    </div>
                    <div className="uploads">
                      <label className={"up" + (bodyImg ? " filled" : "")}>
                        <input type="file" accept="image/*" onChange={(e) => { void pick("body", e.target.files?.[0]); e.target.value = ""; }} />
                        {bodyImg && <img className="preview" src={bodyImg} alt="" />}
                        <span className="u-icon">⤒</span>
                        <span className="u-t">Full-length photo</span>
                        <span className="u-s">Standing, even light</span>
                      </label>
                      <label className={"up" + (faceImg ? " filled" : "")}>
                        <input type="file" accept="image/*" onChange={(e) => { void pick("face", e.target.files?.[0]); e.target.value = ""; }} />
                        {faceImg && <img className="preview" src={faceImg} alt="" />}
                        <span className="u-icon">⤒</span>
                        <span className="u-t">Face close-up</span>
                        <span className="u-s">Eyes visible, no sunglasses</span>
                      </label>
                    </div>
                    <p className="up-err">{upErr ?? IMAGE_GUIDELINE}</p>
                  </div>

                  {/* moment */}
                  <div className="field">
                    <div className="f-label">
                      <span><span className="stepno serif">iii.</span>Your moment</span>
                      <span className="ok">{moment?.label ?? ""}</span>
                    </div>
                    <div className="moments-row">
                      {moments.map((m, i) => (
                        <button
                          key={m.id}
                          type="button"
                          className={"mp" + (momentId === m.id ? " sel" : "")}
                          onClick={() => setMomentId(m.id)}
                        >
                          {m.label}{i === 0 && <span className="star">★</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="c-foot">
                  <button className="btn" disabled={!ready} onClick={generate}>
                    OneTap Viral Fan <span aria-hidden="true">→</span>
                  </button>
                  <div className="hint">
                    {error
                      ? error
                      : ready
                        ? "One tap. Under a minute. Free to preview."
                        : "Add one photo and pick a moment — the jersey is set."}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </section>

      {/* Generation + result use the SAME dark try-on modal as Curator/360°/Creator
          (portaled to <body>, so it escapes the light .viralfan theme). FIFA-specific
          chrome — nation band, Preview/watermark, membership-gated Download/Share — is
          passed in via props. */}
      <ResultModal
        open={stage === "gen" || stage === "result"}
        onClose={() => { setResult(null); setStage("form"); }}
        brand="Viral Fan"
        name={`${country}${moment ? ` · ${moment.label}` : ""}`}
        turnLabel="Film"
        turnSub="The Reel"
        phase={stage === "gen" ? "video" : null}
        video={result?.videoUrl}
        poster={result?.posterUrl}
        videoLookId={result?.lookId}
        productId={jersey?.product.id}
        error={stage === "result" && !result ? error : null}
        canKeep={isMember}
        onLocked={() => setSheet(true)}
        videoOverlay={
          <>
            <span className="vf-band" style={{ background: accent }} />
            <span className="vf-pv">Preview</span>
            <span className="vf-wm">Viral Fan</span>
          </>
        }
      />

      {sheet && (
        <div className="viralfan-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) setSheet(false); }}>
          <div className="sheet">
            <button className="s-close" onClick={() => setSheet(false)} aria-label="Close">×</button>
            <span className="label">Membership</span>
            <h3 className="serif">Keep what you create</h3>
            <div className="s-price serif">$25 <span>a month · ends in one tap</span></div>
            <p className="s-body">The preview is yours to watch. Membership keeps the video — high definition, without the mark — and lets you make more.</p>
            <div className="s-list">
              <div>Ten fan videos every month</div>
              <div>Every nation, every moment</div>
              <div>High definition, without the mark</div>
              <div>Served first at peak hours</div>
            </div>
            <button className="s-btn" disabled={busy} onClick={beginMembership}>
              {busy ? "Opening…" : "Begin membership"}
            </button>
            <p className="s-note">Everything you keep remains yours, always.</p>
          </div>
        </div>
      )}

      {/* Sign-up / sign-in popup — shown whenever auth is required on /fifa. */}
      {authOpen && (
        <div className="viralfan-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
          <div className="sheet vf-auth">
            <button className="s-close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button>
            <span className="label">Free · No credit card</span>
            <h3 className="serif">Claim your stadium moment</h3>
            <p className="s-body">
              Create your account to make your free Viral Fan video — your jersey, your face,
              on the stadium big screen, in under a minute.
            </p>
            <div className="vf-oauth">
              <button className="oauth" onClick={() => startAuth("google")}>Continue with Google</button>
              <button className="oauth" onClick={() => startAuth("apple")}>Continue with Apple</button>
            </div>
            <p className="s-note">Preview free. Keep it with membership.</p>
          </div>
        </div>
      )}

      {/* Post-sign-in delight → auto-continues to the generation. */}
      {welcome && (
        <div className="viralfan-veil">
          <div className="sheet vf-welcome">
            <div className="vf-check" aria-hidden="true">✓</div>
            <span className="label">Registration successful</span>
            <h3 className="serif">You’re in! 🎉</h3>
            <p className="s-body">
              {pendingGen
                ? "Putting you on the stadium big screen — your fan video is starting…"
                : "You’re all set. Pick your jersey and make your Viral Fan video."}
            </p>
            <button className="s-btn" onClick={proceedWelcome}>
              {pendingGen ? "Make my fan video →" : "Start creating →"}
            </button>
          </div>
        </div>
      )}

      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">How it works</span>
            <h2 className="serif">Four steps. Under a minute.</h2>
            <p>Choose, upload, tap — your video does the rest.</p>
          </div>
          <div className="how-steps">
            <div className="how-step"><div className="hs-no">i.</div><h3>Pick your jersey</h3><p>Search your nation — your colours carry through the whole video.</p></div>
            <div className="how-step"><div className="hs-no">ii.</div><h3>Add your photos</h3><p>One full-length photo is enough; a face close-up makes it sharper.</p></div>
            <div className="how-step"><div className="hs-no">iii.</div><h3>Choose your moment</h3><p>Fan cam, goal celebration, VIP box, crowd reaction, big screen.</p></div>
            <div className="how-step"><div className="hs-no">iv.</div><h3>Tap, preview, keep</h3><p>One tap composes your video. Watch free — membership keeps it in HD.</p></div>
          </div>
        </div>
      </section>

      <section id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="sec-head"><span className="label">Good to know</span><h2 className="serif">Questions, answered</h2></div>
          <div className="faq-list">
            <details><summary>Is the preview really free</summary><p>Yes. Choose, upload, and preview your first fan video without payment. Membership applies only when you keep videos in full quality.</p></details>
            <details><summary>What happens to my photos</summary><p>Your photos are used only to create your videos, never anything else without your consent, and you can delete them — and every video — at any time.</p></details>
            <details><summary>How long does a video take</summary><p>Most videos are returned in about a minute. During peak hours, members are served first.</p></details>
            <details><summary>Can I leave any time</summary><p>Yes — membership ends in one tap, and every video you have kept remains yours.</p></details>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot-inner">
          <div>
            <div className="logo"><span className="mark serif">Viral Fan</span><span className="tag">by OneTap</span></div>
            <p className="roman">© MMXXVI OneTap</p>
            <p className="vf-foot-links">
              <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
            </p>
          </div>
          <p className="legal">
            <strong>Not affiliated with, endorsed by, or sponsored by FIFA or any national football federation.</strong>{" "}
            Fan-made entertainment created from your uploaded photos. Your likeness is yours; consent is explicit and deletion is honoured.
          </p>
        </div>
      </footer>

      {hydrated && stage === "form" && (
        <div className="sticky-cta"><a className="btn" href="#creator">Make my fan video</a></div>
      )}
    </>
  );
}
