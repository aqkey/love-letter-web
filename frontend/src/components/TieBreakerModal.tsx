import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TieBreaker.module.css';

type Props = {
  candidates: string[];
  onDecide: (name: string) => void;
  onClose?: () => void;
};

const PALETTE = ['#ff8a80','#ffd180','#ffff8d','#ccff90','#a7ffeb','#80d8ff','#82b1ff','#b388ff','#f8bbd0'];

const TieBreakerModal: React.FC<Props> = ({ candidates, onDecide, onClose }) => {
  const [winner, setWinner] = useState<string | null>(null);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  const nCandidates = Math.max(1, candidates.length);
  const segCount = 6;
  const segWidth = 360 / segCount; // 60deg
  const owners = useMemo(() => Array.from({ length: segCount }, (_, i) => i % nCandidates), [segCount, nCandidates]);
  const playerColors = useMemo(() => candidates.map((_, i) => PALETTE[i % PALETTE.length]), [candidates]);
  const segments = useMemo(() => {
    // Build conic-gradient with 6 segments, colored by owning candidate
    let acc = 0;
    const parts: string[] = [];
    for (let i = 0; i < segCount; i++) {
      const ownerIdx = owners[i];
      const color = playerColors[ownerIdx] || PALETTE[i % PALETTE.length];
      parts.push(`${color} ${acc}deg ${acc + segWidth}deg`);
      acc += segWidth;
    }
    return parts.join(', ');
  }, [owners, playerColors, segCount, segWidth]);

  useEffect(() => {
    // momentum spin with easing-out over 6 fixed segments
    let start: number | null = null;
    const chosenSeg = Math.floor(Math.random() * segCount);
    const winnerIdx = owners[chosenSeg] ?? 0;
    setWinner(candidates[winnerIdx]);
    const center = segWidth * chosenSeg + segWidth / 2;
    // total rotations + align chosen segment center to top pointer
    const jitter = Math.floor(Math.random() * 20 - 10); // +/-10deg within the segment
    const total = 6 * 360 + (360 - center) + jitter;
    const duration = 3400; // ms
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (ts: number) => {
      if (start == null) start = ts;
      const elapsed = ts - start;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      const eased = easeOutCubic(t);
      setRotationDeg(total * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // settle slight jitter then decide
        window.setTimeout(() => onDecide(candidates[winnerIdx]), 200);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [candidates, owners, segWidth, segCount, onDecide]);

  const wheelStyle: React.CSSProperties = {
    background: `conic-gradient(${segments})`,
    transform: `rotate(${rotationDeg}deg)`,
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.title}>引き分け判定ミニゲーム</div>
        <div className={styles.wheelWrap}>
          <div className={styles.pointer} />
          <div className={styles.wheel} style={wheelStyle} />
        </div>
        {/* 大きく候補のプレイヤー名を表示（パレット色と対応） */}
        <div className={styles.bigNames}>
          {candidates.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className={styles.bigNameItem}
              style={{ backgroundColor: playerColors[i % playerColors.length] }}
            >
              {name}
            </div>
          ))}
        </div>
        <div className={styles.nameList}>
          {candidates.join(' / ')}
        </div>
        {onClose && (
          <button onClick={onClose} className="mt-3 px-3 py-1 text-sm text-gray-700 border rounded">閉じる</button>
        )}
      </div>
    </div>
  );
};

export default TieBreakerModal;
