export interface TimelineGeometryInput {
  viewportWidth: number;
  contentWidth: number;
  cityColumnWidth: number;
  scrollLeft: number;
}

export interface TimelineGeometry {
  cityColumnWidth: number;
  timelineWidth: number;
  scrollLeft: number;
}

export interface TimelinePointerInput {
  clientX: number;
  containerLeft: number;
  geometry: TimelineGeometry;
  stepMinutes: number;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function resolveTimelineGeometry(input: TimelineGeometryInput): TimelineGeometry {
  const viewportWidth = finiteNonNegative(input.viewportWidth);
  const contentWidth = Math.max(viewportWidth, finiteNonNegative(input.contentWidth));
  const cityColumnWidth = Math.min(contentWidth, finiteNonNegative(input.cityColumnWidth));
  const maxScrollLeft = Math.max(0, contentWidth - viewportWidth);

  return {
    cityColumnWidth,
    timelineWidth: Math.max(0, contentWidth - cityColumnWidth),
    scrollLeft: Math.min(maxScrollLeft, finiteNonNegative(input.scrollLeft)),
  };
}

export function focusHourToTimelinePosition(
  focusHour: number,
  geometry: TimelineGeometry
): { contentLeft: number; viewportLeft: number } {
  const normalizedHour = Number.isFinite(focusHour)
    ? Math.min(24, Math.max(0, focusHour))
    : 0;
  const contentLeft = geometry.cityColumnWidth + (normalizedHour / 24) * geometry.timelineWidth;

  return {
    contentLeft,
    viewportLeft: contentLeft - geometry.scrollLeft,
  };
}

export function focusHourToCenteredScrollLeft(
  focusHour: number,
  geometry: TimelineGeometry,
  viewportWidth: number
): number {
  const { contentLeft } = focusHourToTimelinePosition(focusHour, geometry);
  const safeViewportWidth = finiteNonNegative(viewportWidth);
  const visibleTimelineWidth = Math.max(0, safeViewportWidth - geometry.cityColumnWidth);
  const desiredViewportLeft = geometry.cityColumnWidth + visibleTimelineWidth / 2;
  const contentWidth = geometry.cityColumnWidth + geometry.timelineWidth;
  const maxScrollLeft = Math.max(0, contentWidth - safeViewportWidth);

  return Math.min(maxScrollLeft, Math.max(0, contentLeft - desiredViewportLeft));
}

export function clientXToFocusHour(input: TimelinePointerInput): number | null {
  if (input.geometry.timelineWidth <= 0) return null;

  const rawTimelineX =
    input.clientX - input.containerLeft + input.geometry.scrollLeft - input.geometry.cityColumnWidth;
  const clampedTimelineX = Math.max(0, Math.min(input.geometry.timelineWidth, rawTimelineX));
  const stepMinutes = Math.max(1, Math.round(input.stepMinutes));
  const snappedMinutes =
    Math.round(((clampedTimelineX / input.geometry.timelineWidth) * 24 * 60) / stepMinutes) *
    stepMinutes;

  return Math.min(23.75, Math.max(0, snappedMinutes / 60));
}

export function shouldStartTimelineScrub(
  pointerType: string,
  startedInScrubberHeader: boolean
): boolean {
  return pointerType !== 'touch' || startedInScrubberHeader;
}
