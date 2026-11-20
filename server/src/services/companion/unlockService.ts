/**
 * Unlock derivation facade for Companion & Progress controllers (Story 9.4 / AD-11).
 * Re-exports the derived-from-Progress unlock primitives from services/trail/.
 */
export {
  ChapterBloomState,
  ChapterStatusRecord,
  ChapterJustUnlockedPayload,
  computeChapterState,
  getChapterStatus,
  getBookChaptersStatus,
  getUserBloomedChapters,
  detectChapterJustUnlocked,
} from '../trail/trailService';
export { resetChapterManifestCache } from '../trail/chapterManifest';
