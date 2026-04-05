import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ConfirmDialogProps } from '../../lib/types';
import styles from './ConfirmDialog.module.css';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
}) => {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className={styles.description}>{description}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
