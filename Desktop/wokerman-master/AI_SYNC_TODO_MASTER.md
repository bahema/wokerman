# AI Sync TODO (Local vs GitHub)

## Scope
- Local source: `Desktop/wokerman-master`
- Remote baseline: `origin/master` (repo root snapshot)
- Validation branch: `origin/feat/ai-control-hardening` (12-file snapshot)

## Difference Summary
- Local files scanned (source-only): **146**
- GitHub `origin/master` files: **156**
- Only local: **1**
- Only GitHub/master (missing locally): **11**
- Overlap with master: **145**
- Changed content in overlap: **35**
- Overlap with `feat/ai-control-hardening`: **12** (currently content-aligned)

## TODO: Only Local (1)
| File | Risk | Solution |
|---|---|---|
| `backend/scripts/testSmtpVerify.ts` | Test drift (exists only locally) | Keep and commit if still used in CI; otherwise archive to scripts/experimental and document. |

## TODO: Missing Locally But Present On GitHub (11)
| File | Risk | Solution |
|---|---|---|
| `.github/workflows/lighthouse-quality.yml` | Missing capability / route / CI coverage | Restore CI workflow to prevent performance regressions before deploy. |
| `backend/src/ai/governance.ts` | Missing capability / route / CI coverage | Restore this file from origin/master and wire it into AI route checks to enforce prompt/content safety policies. |
| `backend/src/traffic/engine.ts` | Missing capability / route / CI coverage | Restore from origin/master, then connect traffic pipeline into backend routes and admin controls. |
| `backend/src/traffic/store.ts` | Missing capability / route / CI coverage | Restore from origin/master, then connect traffic pipeline into backend routes and admin controls. |
| `backend/src/traffic/webSearch.ts` | Missing capability / route / CI coverage | Restore from origin/master, then connect traffic pipeline into backend routes and admin controls. |
| `src/components/admin/HealthUpcomingManager.tsx` | Missing capability / route / CI coverage | Restore manager component and re-link health/upcoming blocks in admin page. |
| `src/components/admin/Hero2Editor.tsx` | Missing capability / route / CI coverage | Restore hero v2 editor and connect to home page section map. |
| `src/components/admin/PricingEditor.tsx` | Missing capability / route / CI coverage | Restore pricing editor and ensure it writes to shared pricing model. |
| `src/components/admin/TrafficAiEditor.tsx` | Missing capability / route / CI coverage | Restore UI editor and add route/tab entry in Admin navigation. |
| `src/pages/Health.tsx` | Missing capability / route / CI coverage | Restore route component and include route in app router. |
| `src/utils/pricing.ts` | Missing capability / route / CI coverage | Restore pricing utility to keep pricing calculations consistent between UI/editor. |

## TODO: Changed In Both Local and GitHub Master (35)
| File | Risk | Solution |
|---|---|---|
| `.github/workflows/deploy-pages.yml` | Behavioral drift from deployed baseline | Compare workflow triggers/jobs to origin/master and keep stricter security/quality checks. |
| `.github/workflows/security-scan.yml` | Behavioral drift from deployed baseline | Compare workflow triggers/jobs to origin/master and keep stricter security/quality checks. |
| `backend/package-lock.json` | Behavioral drift from deployed baseline | Regenerate lockfile after dependency reconciliation to keep deterministic installs. |
| `backend/package.json` | Behavioral drift from deployed baseline | Reconcile scripts/dependencies with origin/master and confirm startup/test scripts still pass. |
| `backend/scripts/testSiteValidation.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `backend/scripts/verifyEndpoints.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `backend/src/ai/store.ts` | Behavioral drift from deployed baseline | Run targeted diff vs origin/master, preserve local AI improvements, then re-introduce missing guardrails (governance.ts) and add tests. |
| `backend/src/db/defaultPublishedContent.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `backend/src/email/campaignSender.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `backend/src/email/confirmationSender.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `backend/src/index.ts` | Behavioral drift from deployed baseline | Reconcile route registration and middleware order with origin/master; verify AI, traffic, and admin endpoints all mount correctly. |
| `backend/src/site/validateContent.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `index.html` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `shared/siteTypes.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/api/client.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/App.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/admin/AccountUploadsEditor.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/admin/AiControlCenterEditor.tsx` | Behavioral drift from deployed baseline | Keep local feature updates, but verify compatibility with backend AI governance and API contract. |
| `src/components/admin/EmailAnalyticsEditor.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/admin/EmailSenderEditor.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/admin/Sidebar.tsx` | Behavioral drift from deployed baseline | Sync sidebar entries with available editors/pages to remove dead links and expose missing tools. |
| `src/components/BackToTop.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/CookieConsent.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/Navbar.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/ProductCard.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/components/ProductModal.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/data/siteData.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/i18n/messages.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/i18n/provider.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/pages/Admin.tsx` | Behavioral drift from deployed baseline | Reconcile admin page sections so AI control, traffic, pricing, and health editors/routes are all reachable. |
| `src/pages/adminValidation.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/pages/Home.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/pages/Signup.tsx` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `src/utils/adminStorage.ts` | Behavioral drift from deployed baseline | Run file diff vs origin/master; keep intentional local behavior, then align data contracts/imports and update tests where behavior changed. |
| `tsconfig.app.tsbuildinfo` | Behavioral drift from deployed baseline | Treat as build artifact: regenerate locally or keep out of sync commits unless intentionally versioned. |

## Execution Order (Recommended)
1. Restore the 11 missing files from origin/master.
2. Reconcile critical backend files: backend/src/index.ts, backend/src/ai/store.ts, backend/package.json.
3. Reconcile critical frontend files: src/pages/Admin.tsx, src/components/admin/Sidebar.tsx, src/components/admin/AiControlCenterEditor.tsx.
4. Run backend + frontend test/build pipelines.
5. Open PR with focused commits (restore files, then behavior reconciliations, then lockfile/test updates).

## Commit In This Step
- Adds this actionable TODO matrix so reconciliation work can be done safely and traceably.
