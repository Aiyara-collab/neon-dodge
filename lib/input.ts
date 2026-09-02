import type { Phase } from './game';

export type KeyboardInput = {
  key: string; code: string; repeat?: boolean; ctrlKey?: boolean; altKey?: boolean;
  metaKey?: boolean; shiftKey?: boolean; isComposing?: boolean; defaultPrevented?: boolean;
  editable?: boolean; buttonFocused?: boolean;
};
export type KeyboardAction = 'left' | 'right' | 'start' | 'togglePause';

export function keyboardAction(event: KeyboardInput, phase: Phase): KeyboardAction | null {
  if (event.editable || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
    || event.isComposing || event.defaultPrevented) return null;
  const key = event.key.toLowerCase();
  if (phase === 'running' && ['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
    return key === 'arrowleft' || key === 'a' ? 'left' : 'right';
  }
  if (event.code === 'Space' && !event.repeat) {
    if (event.buttonFocused) return null;
    return phase === 'ready' || phase === 'won' || phase === 'lost' ? 'start' : 'togglePause';
  }
  if (key === 'r' && !event.repeat) return 'start';
  return null;
}

type SwipePoint = { x: number; y: number; id: number };

export function createSwipeTracker() {
  let active: SwipePoint | null = null;
  return {
    begin(point: SwipePoint) {
      if (active) return false;
      active = point;
      return true;
    },
    end(point: SwipePoint): 'left' | 'right' | null {
      const swipe = active;
      if (!swipe || swipe.id !== point.id) return null;
      active = null;
      const dx = point.x - swipe.x;
      const dy = point.y - swipe.y;
      return Math.abs(dx) >= 24 && Math.abs(dx) > Math.abs(dy) * 1.3
        ? dx < 0 ? 'left' : 'right' : null;
    },
    cancel(id: number) { if (active?.id === id) active = null; },
    clear() { active = null; },
  };
}
