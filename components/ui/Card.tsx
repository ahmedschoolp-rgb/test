import React from 'react';
import styles from './Card.module.css';
import { clsx } from 'clsx';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx(styles.card, className)}>{children}</div>
);

export const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx(styles.header, className)}>{children}</div>
);

export const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={clsx(styles.title, className)}>{children}</h3>
);

export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx(styles.content, className)}>{children}</div>
);
