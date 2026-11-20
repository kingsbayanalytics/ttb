export { LivingTrailPage } from './LivingTrailPage';
export {
  WaypointOverlay,
  buildWaypointAriaLabel,
  countActiveLenses,
  formatTrailChapterTitle,
} from './WaypointOverlay';
export type {
  WaypointFocusRequest,
  WaypointOverlayProps,
} from './WaypointOverlay';
export { TrailChapterList } from './TrailChapterList';
export type {
  ChapterStatusFilter,
  TrailChapterListProps,
} from './TrailChapterList';
export {
  ANIMATION_FRAME_INTERVAL_MS,
  BiomeCanvas,
  buildBiomeCanvasAriaLabel,
} from './BiomeCanvas';
export type {
  BiomeCanvasChapter,
  BiomeCanvasProps,
} from './BiomeCanvas';
export {
  TRAIL_LOGICAL_HEIGHT,
  TRAIL_LOGICAL_WIDTH,
  TRAIL_TILE_SIZE,
  buildClearingSegment,
  buildClearingSegmentForChapter,
  computeIntegerScale,
  getAllClearingSegmentsForBook,
} from './trailLayouts';
export type {
  ClearingPropPlacement,
  ClearingSceneBlueprint,
  ClearingSegment,
  FireflyAnchor,
  HeroLandmarkPlacement,
  KeeperPlacement,
  LogicalPoint,
  TrailSceneVariant,
  WaypointPoint,
  WaypointState,
} from './trailLayouts';
export {
  MELANIN_SKIN_RAMPS,
  PALETTE_INDEX,
  PALETTE_SIZE,
  TRAIL_PALETTE_DARK,
  TRAIL_PALETTE_LIGHT,
  TRAIL_THEME_TOKENS,
  getTrailPalette,
  getTrailThemeTokens,
  resolvePaletteColor,
} from './trailPalette';
export type {
  MelaninRamp,
  MelaninRampName,
  PaletteIndex,
  TrailTheme,
  TrailThemeTokens,
} from './trailPalette';
