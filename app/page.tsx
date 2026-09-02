'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, Heart, Pause, Play, RotateCcw, Star, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createGame, getLevel, getScore, isFinished, moveGame, pauseGame, resumeGame, startGame, stepGame, type Entity, type GameState } from '@/lib/game';
import { registerGameTools } from '@/lib/webmcp';
import { createSwipeTracker, keyboardAction } from '@/lib/input';
import { loadRecord, recordCaption, saveRecord } from '@/lib/record';

const recordStorage = () => window.localStorage;
const demoEntities: Entity[] = [
  { id: -1, lane: 0, y: .2, kind: 'block' },
  { id: -2, lane: 1, y: .42, kind: 'star' },
  { id: -3, lane: 2, y: .6, kind: 'block' },
];
const formatScore = (value: number) => String(value).padStart(4, '0');
const lanePosition = (lane: number) => `${(lane + .5) / 3 * 100}%`;

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [record, setRecord] = useState(0);
  const [recordPersistent, setRecordPersistent] = useState(true);
  const gameRef = useRef(game);
  const recordRef = useRef(0);
  const [swipe] = useState(createSwipeTracker);

  const publish = useCallback((next: GameState) => {
    const previous = gameRef.current;
    if (next.phase !== previous.phase) swipe.clear();
    gameRef.current = next;
    setGame(next);
    if (isFinished(next) && !isFinished(previous) && getScore(next) > recordRef.current) {
      recordRef.current = getScore(next);
      setRecord(recordRef.current);
      setRecordPersistent(saveRecord(recordStorage, recordRef.current));
    }
  }, [swipe]);

  const start = useCallback(() => { swipe.clear(); publish(startGame()); }, [publish, swipe]);
  const control = useCallback((action: 'left' | 'right' | 'pause' | 'resume') => {
    const current = gameRef.current;
    const next = action === 'left' ? moveGame(current, -1)
      : action === 'right' ? moveGame(current, 1)
        : action === 'pause' ? pauseGame(current) : resumeGame(current);
    if (next !== current) publish(next);
  }, [publish]);
  const togglePause = useCallback(() => {
    control(gameRef.current.phase === 'paused' ? 'resume' : 'pause');
  }, [control]);

  useEffect(() => {
    const saved = loadRecord(recordStorage);
    recordRef.current = saved.value;
    setRecord(saved.value);
    setRecordPersistent(saved.persistent);
  }, []);

  useEffect(() => {
    let frameId = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      if (gameRef.current.phase === 'running') {
        if (last !== null) publish(stepGame(gameRef.current, (now - last) / 1000));
        last = now;
      } else {
        last = null;
      }
      frameId = window.requestAnimationFrame(frame);
    };
    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, [publish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const action = keyboardAction({
        key: event.key, code: event.code, repeat: event.repeat,
        ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey, shiftKey: event.shiftKey,
        isComposing: event.isComposing, defaultPrevented: event.defaultPrevented,
        editable: Boolean(target?.isContentEditable || target?.closest('input, textarea, select, [role="textbox"]')),
        buttonFocused: Boolean(target?.closest('button')),
      }, gameRef.current.phase);
      if (!action) return;
      event.preventDefault();
      if (action === 'start') start();
      else if (action === 'togglePause') togglePause();
      else control(action);
    };
    const autoPause = () => control('pause');
    const onVisibility = () => { if (document.hidden) autoPause(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', autoPause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [control, start, togglePause]);

  useEffect(() => registerGameTools({
    read: () => {
      const state = gameRef.current;
      return {
        phase: state.phase, lane: state.lane + 1, score: getScore(state),
        secondsRemaining: Math.ceil(60 - state.elapsed), lives: state.lives,
        stars: state.stars, record: recordRef.current,
        objects: state.entities.map((entity) => ({
          kind: entity.kind, lane: entity.lane + 1, progress: Math.round(entity.y * 100),
        })),
      };
    },
    start: () => flushSync(start),
    control: (action) => {
      if ((action === 'left' || action === 'right') && gameRef.current.phase !== 'running') {
        throw new Error('Start or resume the round before moving.');
      }
      flushSync(() => control(action));
    },
  }), [control, start]);

  const playing = game.phase === 'running';
  const finished = isFinished(game);
  const score = getScore(game);
  const protectedNow = game.invulnerableUntil > game.elapsed;
  const entities = game.phase === 'ready' ? demoEntities : game.entities;

  return (
    <main className="app-shell">
      <h1 className="sr-only">Neon Dodge เกมหลบสิ่งกีดขวาง</h1>
      <header className="masthead">
        <a className="wordmark" href="#arena"><Zap aria-hidden="true" /> NEON<span>DODGE</span></a>
        <span className="edition">THE 60-SECOND CHALLENGE <span className="live-dot" /></span>
      </header>
      <div className="game-layout">
        <section className="game-surface" id="arena">
          <div className="scoreboard" aria-label="สถานะเกม">
            <div className="score-main"><small>SCORE / คะแนน</small><strong>{formatScore(score)}</strong></div>
            <div><small><Clock3 /> เวลา</small><strong>{Math.ceil(60 - game.elapsed)}<em>วินาที</em></strong></div>
            <div><small>พลังชีวิต</small><span className="hearts" aria-label={`เหลือ ${game.lives} ชีวิต`}>{[1, 2, 3].map((life) => <Heart aria-hidden="true" key={life} className={life > game.lives ? 'lost' : ''} />)}</span></div>
          </div>
          <div
            className={`arena ${protectedNow ? 'arena--hit' : ''}`}
            aria-label="สนามเกม เลื่อนซ้ายขวาด้วยปุ่มด้านล่าง คีย์บอร์ด หรือปัดนิ้ว"
            onPointerDown={(event) => {
              if (gameRef.current.phase !== 'running' || !event.isPrimary || event.button !== 0
                || (event.target as HTMLElement).closest('button')) return;
              if (swipe.begin({ x: event.clientX, y: event.clientY, id: event.pointerId })) {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerUp={(event) => {
              const direction = swipe.end({ x: event.clientX, y: event.clientY, id: event.pointerId });
              if (direction) control(direction);
            }}
            onPointerCancel={(event) => swipe.cancel(event.pointerId)}
            onLostPointerCapture={(event) => swipe.cancel(event.pointerId)}
          >
            <div className="lane-lines" aria-hidden="true"><i /><i /><i /></div>
            {entities.map((entity) => <span
              key={entity.id} aria-hidden="true"
              className={`entity ${entity.kind === 'block' ? 'obstacle' : 'collectible'}`}
              style={{ left: lanePosition(entity.lane), top: `${entity.y * 100}%` }}
            >{entity.kind === 'block' ? '×' : <Star />}</span>)}
            <div className={`player ${protectedNow ? 'invulnerable' : ''}`} style={{ left: lanePosition(game.lane) }} aria-label={`ตัวละคร ช่อง ${game.lane + 1}`}><span /></div>
            {!playing && (
              <div className="arena-overlay">
                <p className="eyebrow">{game.phase === 'ready' ? 'READY, SET, DODGE.' : game.phase === 'paused' ? 'TAKE A BREATHER.' : game.phase === 'won' ? 'CIRCUIT COMPLETE.' : 'ONE MORE TRY?'}</p>
                <h2>{game.phase === 'ready' ? <>หลบให้ทัน<br /><span>เก็บให้ไว.</span></> : game.phase === 'paused' ? <>พักก่อน<br /><span>แล้วไปต่อ.</span></> : game.phase === 'won' ? <>รอดครบแล้ว<br /><span>เก่งมาก!</span></> : <>พลาดนิดเดียว<br /><span>ลองอีกที.</span></>}</h2>
                <p>{finished ? <>{formatScore(score)} คะแนน · เก็บดาว {game.stars} ดวง<br />{score >= record && score > 0 ? 'นี่คือคะแนนดีที่สุดของคุณ!' : `สถิติสูงสุด ${formatScore(record)} คะแนน`}</> : game.phase === 'paused' ? 'เวลาและสิ่งกีดขวางหยุดรอคุณอยู่' : '3 ช่อง · 3 ชีวิต · 60 วินาที'}</p>
                <Button className="start-button" onClick={game.phase === 'paused' ? () => control('resume') : start}><Play /> {game.phase === 'paused' ? 'เล่นต่อ' : finished ? 'เล่นอีกครั้ง' : 'เริ่มเกม'} <ArrowUpRight /></Button>
                <small>ใช้ปุ่ม ← → หรือแตะปุ่มด้านล่าง</small>
              </div>
            )}
            <div className="arena-caption"><span>ความเร็ว {getLevel(game)} / 4</span><span>NEON CIRCUIT</span></div>
          </div>
          <div className="touch-controls">
            <Button className="move-button" disabled={!playing} onClick={() => control('left')} aria-label="เลื่อนซ้าย"><ArrowLeft /> ซ้าย</Button>
            <Button className="utility-button" variant="outline" disabled={game.phase === 'ready' || finished} onClick={togglePause} aria-label={game.phase === 'paused' ? 'เล่นต่อ' : 'พักเกม'} title="พัก / เล่นต่อ">{game.phase === 'paused' ? <Play /> : <Pause />}</Button>
            <Button className="utility-button" variant="outline" onClick={start} aria-label="เริ่มรอบใหม่" title="เริ่มรอบใหม่"><RotateCcw /></Button>
            <Button className="move-button" disabled={!playing} onClick={() => control('right')} aria-label="เลื่อนขวา">ขวา <ArrowRight /></Button>
          </div>
          <p className="status-message" role="status" aria-live="polite">{game.message}</p>
        </section>
        <aside className="mission-panel">
          <div className="intro"><p className="eyebrow">ARCADE / 001</p><h2>หนึ่งนาที<br />ที่ต้องไวกว่าเดิม.</h2><p>เลื่อนตัวละครไปมาใน 3 ช่อง หลบสีชมพู เก็บดาว แล้วอยู่ให้ครบ 60 วินาที</p></div>
          <div className="record-card"><Trophy /><div><small>{recordCaption(recordPersistent)}</small><strong>{formatScore(record)}</strong></div><span>BEST</span></div>
          <section className="instructions" aria-labelledby="instructions-title">
            <h3 id="instructions-title">คู่มือนักหลบ <span>HOW TO PLAY</span></h3>
            <div className="instruction"><span className="mini-player">◆</span><p><strong>เลื่อนซ้าย / ขวา</strong>ใช้ ← → หรือ A / D บนคีย์บอร์ด<br />มือถือแตะปุ่ม หรือปัดบนสนาม</p></div>
            <div className="instruction"><span className="mini-star"><Star /></span><p><strong>เก็บดาว +50 คะแนน</strong>อยู่รอดรับอีก 10 คะแนนต่อวินาที</p></div>
            <div className="instruction"><span className="mini-block">×</span><p><strong>ระวังสิ่งกีดขวาง</strong>ชนแล้วเสีย 1 ชีวิต ความเร็วจะเพิ่มขึ้นทุก 15 วินาที</p></div>
          </section>
          <div className="tip"><Zap /><p>ไม่ต้องรีบเก็บทุกดวง<br /><strong>บางครั้งการหลบก็คือทางชนะ</strong></p></div>
          <p className="shortcut"><kbd>Space</kbd> พัก / เล่นต่อ <span>·</span> <kbd>R</kbd> เริ่มใหม่<br /><span className="auto-pause-note">เกมพักอัตโนมัติเมื่อสลับหน้า หรือภาพสะดุดนาน</span></p>
        </aside>
      </div>
      <footer><span>NEON DODGE <b>© 2026</b></span><span>ไม่มีบัญชี · ไม่มีโฆษณา · มีแต่รีเฟล็กซ์</span></footer>
    </main>
  );
}
