export type Phase = 'ready' | 'running' | 'paused' | 'won' | 'lost';
export type Lane = 0 | 1 | 2;
export type Entity = { id: number; lane: Lane; y: number; kind: 'block' | 'star' };
export type GameState = {
  phase: Phase; lane: Lane; elapsed: number; lives: number; stars: number;
  entities: Entity[]; spawnIn: number; nextId: number; seed: number;
  invulnerableUntil: number; message: string;
};

export const ROUND_SECONDS = 60;
export const PLAYER_Y = 0.85;
export const getScore = (state: GameState) => Math.floor(state.elapsed * 10) + state.stars * 50;
export const getLevel = (state: GameState) => Math.min(4, Math.floor(state.elapsed / 15) + 1);
export const isFinished = (state: GameState) => state.phase === 'won' || state.phase === 'lost';

export function createGame(seed = 123456): GameState {
  return {
    phase: 'ready', lane: 1, elapsed: 0, lives: 3, stars: 0,
    entities: [], spawnIn: 0.2, nextId: 0, seed: seed >>> 0,
    invulnerableUntil: 0, message: 'พร้อมแล้ว? เริ่มเกมและทำคะแนนสูงสุดของคุณ',
  };
}

export function startGame(seed = Date.now()): GameState {
  return { ...createGame(seed), phase: 'running', message: 'เริ่มแล้ว! หลบสีชมพู เก็บดาวสีทอง' };
}

export function moveGame(state: GameState, delta: -1 | 1): GameState {
  if (state.phase !== 'running') return state;
  const lane = Math.max(0, Math.min(2, state.lane + delta)) as Lane;
  return lane === state.lane ? state : { ...state, lane };
}

export function pauseGame(state: GameState): GameState {
  return state.phase === 'running'
    ? { ...state, phase: 'paused', message: 'พักไว้แล้ว เวลาและสิ่งกีดขวางหยุดรอคุณอยู่' }
    : state;
}

export function resumeGame(state: GameState): GameState {
  return state.phase === 'paused'
    ? { ...state, phase: 'running', message: 'กลับมาหลบต่อ! อีกนิดก็ทำสถิติได้แล้ว' }
    : state;
}

function random(seed: number) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}

// The engine is pure: keyboard, touch and WebMCP all use these same transitions.
export function stepGame(state: GameState, seconds: number): GameState {
  if (state.phase !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return state;
  // Catch up normal slow frames without discarding time; pause very long stalls.
  if (seconds > 0.25) {
    return { ...pauseGame(state), message: 'พักอัตโนมัติเพราะภาพสะดุด กดเล่นต่อเมื่อพร้อม' };
  }
  let next = state;
  let remaining = seconds;
  while (remaining > 1e-9 && next.phase === 'running') {
    const dt = Math.min(remaining, 0.05, ROUND_SECONDS - next.elapsed);
    next = stepSlice(next, dt);
    remaining -= dt;
  }
  return next;
}

function stepSlice(state: GameState, dt: number): GameState {
  const elapsed = Math.min(ROUND_SECONDS, Math.round((state.elapsed + dt) * 1e9) / 1e9);
  const level = getLevel(state);
  const speed = 0.23 + level * 0.055;
  let lives = state.lives;
  let stars = state.stars;
  let invulnerableUntil = state.invulnerableUntil;
  let message = state.message;
  let seed = state.seed;
  let nextId = state.nextId;
  let spawnIn = state.spawnIn - dt;
  const entities: Entity[] = [];

  for (const entity of state.entities) {
    const y = entity.y + speed * dt;
    const touchesPlayer = entity.lane === state.lane
      && entity.y <= PLAYER_Y + 0.052 && y >= PLAYER_Y - 0.052;
    if (touchesPlayer) {
      if (entity.kind === 'star') {
        stars += 1;
        message = 'เก็บดาวได้แล้ว! +50 คะแนน';
      } else if (elapsed >= invulnerableUntil) {
        lives = Math.max(0, lives - 1);
        invulnerableUntil = elapsed + 1.2;
        message = lives > 0 ? 'โดนแล้ว! มีเกราะชั่วครู่ รีบหาช่องปลอดภัย' : 'ชีวิตหมดแล้ว ลองใหม่แล้วทำให้ดีกว่าเดิม';
      }
      // A fatal hit ends this frame immediately; later objects cannot award points.
      if (lives === 0) break;
      continue;
    }
    if (y < 1.1) entities.push({ ...entity, y });
  }

  if (spawnIn <= 0 && elapsed < ROUND_SECONDS && lives > 0) {
    const laneRoll = random(seed);
    const kindRoll = random(laneRoll.seed);
    seed = kindRoll.seed;
    entities.push({
      id: nextId++, lane: Math.floor(laneRoll.value * 3) as Lane,
      y: -0.08, kind: kindRoll.value < 0.34 ? 'star' : 'block',
    });
    spawnIn += 0.86 - (level - 1) * 0.06;
  }

  const phase = lives === 0 ? 'lost' : elapsed >= ROUND_SECONDS ? 'won' : 'running';
  if (phase === 'won') message = 'ครบ 60 วินาที! คุณผ่าน Neon Circuit แล้ว';
  if (phase === 'lost') message = 'ชีวิตหมดแล้ว ลองใหม่แล้วทำให้ดีกว่าเดิม';
  return { ...state, phase, elapsed, lives, stars, entities, spawnIn, nextId, seed, invulnerableUntil, message };
}
