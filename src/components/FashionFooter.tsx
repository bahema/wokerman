import { useState } from "react";
import { withBasePath } from "../utils/basePath";
import { getFashionClientViewModel } from "../utils/fashionDraft";
import { openGeneralFashionWhatsApp } from "../utils/fashionWhatsApp";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";

const openPath = (path: string) => {
  window.history.pushState({}, "", withBasePath(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const FashionFooter = () => {
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());

  useFashionPublishedSync(setFashionViewModel, { pollIntervalMs: 0 });

  const homepageDraft = fashionViewModel.homepage;
  const footerLinks = [
    { label: homepageDraft.footerLinkHomeLabel, path: "/fashion" },
    { label: homepageDraft.footerLinkEditorialLabel, path: "/fashion/editorial" },
    { label: homepageDraft.footerLinkCollectionsLabel, path: "/fashion/collections" },
    { label: homepageDraft.footerLinkStyleNotesLabel, path: "/fashion/style-notes" }
  ];

  return (
    <footer className="relative mt-8 border-t-4 border-[#d5b18b] bg-[linear-gradient(180deg,#1a1511_0%,#120f0c_20%,#0d0a08_100%)] px-4 py-10 text-white shadow-[0_-24px_80px_-40px_rgba(0,0,0,0.7)] sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 max-w-7xl">
        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.footerEyebrow}</p>
          <p className="mt-2 text-sm font-semibold text-white/78">{homepageDraft.footerIntroNote}</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.footerSupportEyebrow}</p>
          <h2 className="max-w-md break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            {homepageDraft.footerSupportTitle}
          </h2>
          <p className="max-w-xl text-sm leading-7 text-white/72">
            {fashionViewModel.whatsapp.disclaimer}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.footerLinksEyebrow}</p>
          <div className="mt-4 grid gap-2">
            {footerLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => openPath(link.path)}
                className="w-fit text-left text-sm font-semibold text-white/82 transition hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.footerContactEyebrow}</p>
          <p className="mt-3 text-sm leading-7 text-white/72">
            {homepageDraft.footerContactNote}
          </p>
          <button
            type="button"
            onClick={openGeneralFashionWhatsApp}
            className="mt-5 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            {fashionViewModel.whatsapp.productCta}
          </button>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{homepageDraft.footerStatusNote}</p>
        </div>
      </div>
    </footer>
  );
};

export default FashionFooter;
