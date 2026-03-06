import { useState, type ReactNode } from "react";
import type { FashionBossDraft, FashionHomepageBlockId } from "../../../utils/fashionDraft";

type EditorialScope = "editorial-story" | "editorial-chapter" | "editorial-related";

type ComplexStudioWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  homepageBlocks: Array<{ id: FashionHomepageBlockId; title: string }>;
  selectedHomepageBlock: FashionHomepageBlockId;
  setSelectedHomepageBlock: (id: FashionHomepageBlockId) => void;
  draft: FashionBossDraft;
  patchDraft: <K extends "styleNotes">(section: K, value: Partial<FashionBossDraft[K]>) => void;
  editorialCounts: { story: number; chapter: number; related: number };
  onOpenHomepageAssignment: (blockId: FashionHomepageBlockId) => void;
  onOpenStyleAssignment: () => void;
  onOpenEditorialAssignment: (scope: EditorialScope, index: number) => void;
  onOpenCollectionsSpotlight: () => void;
};

const ComplexStudioWorkspace = ({
  renderSectionActionBar,
  homepageBlocks,
  selectedHomepageBlock,
  setSelectedHomepageBlock,
  draft,
  patchDraft,
  editorialCounts,
  onOpenHomepageAssignment,
  onOpenStyleAssignment,
  onOpenEditorialAssignment,
  onOpenCollectionsSpotlight
}: ComplexStudioWorkspaceProps) => {
  const [editorialScope, setEditorialScope] = useState<EditorialScope>("editorial-story");
  const [editorialSlot, setEditorialSlot] = useState(0);

  const maxSlots =
    editorialScope === "editorial-story"
      ? editorialCounts.story
      : editorialScope === "editorial-chapter"
        ? editorialCounts.chapter
        : editorialCounts.related;
  const safeSlot = Math.max(0, Math.min(editorialSlot, Math.max(0, maxSlots - 1)));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]">
      <div className="space-y-5">
        {renderSectionActionBar("Complex Studio")}
        <div className="rounded-2xl border border-black/8 bg-white/70 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Purpose</p>
          <p className="mt-2 text-sm text-slate-700">
            Use one focused workspace to assign products by page context, then open the contextual assignment drawer with duplicate and visibility checks.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="fa-card p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Homepage assignments</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Homepage block</span>
              <select value={selectedHomepageBlock} onChange={(event) => setSelectedHomepageBlock(event.target.value as FashionHomepageBlockId)} className="fa-input fa-select w-full">
                {homepageBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => onOpenHomepageAssignment(selectedHomepageBlock)} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">
              Assign homepage products
            </button>
          </div>
        </div>

        <div className="fa-card p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Style notes assignments</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Style set</span>
              <select
                value={draft.styleNotes.defaultSet}
                onChange={(event) => patchDraft("styleNotes", { defaultSet: event.target.value as FashionBossDraft["styleNotes"]["defaultSet"] })}
                className="fa-input fa-select w-full"
              >
                <option value="office">Office</option>
                <option value="weekend">Weekend</option>
                <option value="evening">Evening</option>
                <option value="travel">Travel</option>
              </select>
            </label>
            <button type="button" onClick={onOpenStyleAssignment} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">
              Assign style set products
            </button>
          </div>
        </div>

        <div className="fa-card p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Editorial replacements</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Editorial list</span>
              <select value={editorialScope} onChange={(event) => setEditorialScope(event.target.value as EditorialScope)} className="fa-input fa-select w-full">
                <option value="editorial-story">Story picks ({editorialCounts.story})</option>
                <option value="editorial-chapter">Chapter products ({editorialCounts.chapter})</option>
                <option value="editorial-related">Related strip ({editorialCounts.related})</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Slot index</span>
              <input
                type="number"
                min={0}
                max={Math.max(0, maxSlots - 1)}
                value={safeSlot}
                onChange={(event) => setEditorialSlot(Number(event.target.value) || 0)}
                className="fa-input w-full"
              />
            </label>
            <button
              type="button"
              onClick={() => onOpenEditorialAssignment(editorialScope, safeSlot)}
              disabled={maxSlots === 0}
              className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace editorial slot
            </button>
          </div>
          {maxSlots === 0 ? <p className="mt-3 text-xs text-slate-500">No slots exist yet for this editorial list. Add items in Editorial Studio first.</p> : null}
        </div>

        <div className="fa-card p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Collections spotlight</p>
          <div className="mt-4">
            <button type="button" onClick={onOpenCollectionsSpotlight} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">
              Choose spotlight product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplexStudioWorkspace;
