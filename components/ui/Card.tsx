import React from 'react';
import styles from './Card.module.css';
import { clsx } from 'clsx';

export const Card = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={clsx(styles.card, className)} style={style}>{children}</div>
);

export const CardHeader = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={clsx(styles.header, className)} style={style}>{children}</div>
);

export const CardTitle = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <h3 className={clsx(styles.title, className)} style={style}>{children}</h3>
);

export const CardContent = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={clsx(styles.content, className)} style={style}>{children}</div>
);
