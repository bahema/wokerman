import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useOutsideClick } from "../utils/useOutsideClick";

type FollowUsPopoverProps = {
  open: boolean;
  onClose: () => void;
  buttonRef: RefObject<HTMLButtonElement>;
  socials: { facebookUrl: string; whatsappUrl: string; other?: Array<{ name: string; url: string }> };
};

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const FollowUsPopover = ({ open, onClose, buttonRef, socials }: FollowUsPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeLetter, setActiveLetter] = useState("A");

  const listedLetters = useMemo(() => letters, []);
  useOutsideClick(popoverRef, onClose, open);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      popoverRef.current?.focus();
      setActiveLetter("A");
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [buttonRef, onClose, open]);

  if (!open) return null;

  const linksByLetter: Record<string, { label: string; href: string }[]> = {
    F: [{ label: "Facebook", href: socials.facebookUrl }],
    W: [{ label: "WhatsApp", href: socials.whatsappUrl }]
  };
  (socials.other ?? []).forEach((social) => {
    const letter = social.name.trim().charAt(0).toUpperCase();
    if (!letter) return;
    linksByLetter[letter] = [...(linksByLetter[letter] ?? []), { label: social.name, href: social.url }];
  });

  const scrollToLetter = (letter: string) => {
    const section = sectionRefs.current[letter];
    if (!section) return;
    setActiveLetter(letter);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Follow us links"
      tabIndex={-1}
      className="absolute right-0 top-14 z-50 w-[22rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="grid grid-cols-[2.2rem,1fr] gap-3">
        <div className="max-h-80 space-y-1 overflow-auto pr-1">
          {listedLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => scrollToLetter(letter)}
              className={`block w-full rounded-md px-1 py-1 text-xs font-semibold transition ${
                activeLetter === letter
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
              aria-label={`Jump to ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
        <div
          ref={scrollRef}
          className="max-h-80 space-y-3 overflow-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700"
        >
          {listedLetters.map((letter) => (
            <div
              key={letter}
              ref={(el) => {
                sectionRefs.current[letter] = el;
              }}
              id={`follow-${letter}`}
            >
              <h4 className="mb-1 text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">{letter}</h4>
              <div className="space-y-1">
                {(linksByLetter[letter] ?? []).length > 0 ? (
                  linksByLetter[letter].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      {link.label}
                    </a>
                  ))
                ) : (
                  <p className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500">No link yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FollowUsPopover;
