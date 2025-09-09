import React, { useEffect } from 'react';
import styles from './CutIn.module.css';

export type CutInItem = {
  id: number;
  title: string;
  imageSrc?: string;
  variant?: 'card' | 'danger' | 'success';
};

type Props = {
  queue: CutInItem[];
  onDone: (id: number) => void;
};

const CutIn: React.FC<Props> = ({ queue, onDone }) => {
  const item = queue[0];

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => {
      onDone(item.id);
    }, 2400);
    return () => clearTimeout(timer);
  }, [item, onDone]);

  if (!item) return null;

  const panelClass = `${styles.panel} ${item.variant === 'danger' ? styles.danger : ''} ${item.variant === 'success' ? styles.success : ''}`.trim();

  return (
    <div className={styles.overlay} aria-hidden>
      <div className={panelClass}>
        {item.imageSrc && (
          <img src={item.imageSrc} alt="" className={styles.card} />
        )}
        <div className={styles.text}>{item.title}</div>
      </div>
    </div>
  );
};

export default CutIn;
