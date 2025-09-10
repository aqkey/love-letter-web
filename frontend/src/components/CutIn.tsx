import React, { useEffect } from 'react';
import styles from './CutIn.module.css';

export type CutInItem = {
  id: number;
  title: string;
  imageSrc?: string;
  variant?: 'card' | 'danger' | 'success';
};

type Props = { queue: CutInItem[]; onDone: (id: number) => void };

const ItemPanel: React.FC<{ item: CutInItem; onDone: (id: number) => void }> = ({ item, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDone(item.id), 2400);
    return () => clearTimeout(timer);
  }, [item, onDone]);

  const panelClass = `${styles.panel} ${item.variant === 'danger' ? styles.danger : ''} ${item.variant === 'success' ? styles.success : ''}`.trim();
  return (
    <div className={panelClass}>
      {item.imageSrc && <img src={item.imageSrc} alt="" className={styles.card} />}
      <div className={styles.text}>{item.title}</div>
    </div>
  );
};

const CutIn: React.FC<Props> = ({ queue, onDone }) => {
  if (!queue.length) return null;
  return (
    <div className={styles.overlay} aria-hidden>
      <div className={styles.stack}>
        {queue.map((q) => (
          <ItemPanel key={q.id} item={q} onDone={onDone} />
        ))}
      </div>
    </div>
  );
};

export default CutIn;
